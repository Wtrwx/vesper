from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from tests.test_capture import BUNDLE, CaptureSDK
from vesper.app import Application


class RuntimeSDK(CaptureSDK):
    def __init__(self):
        super().__init__()
        self.swift_loads = self.swift_unloads = self.swift_disposes = 0

    def attach(self, pid):
        handle = super().attach(pid)
        original = handle.create_script

        def create(source, *, name):
            if name != 'vesper-swift':
                return original(source, name=name)
            self.swift_loads += 1

            def dispatch(method, args):
                if method == 'initialize':
                    return {'initialized': True}
                if method == 'dispose':
                    self.swift_disposes += 1
                    return {'disposed': True}
                if args['action'] == 'trace':
                    return {'hook_id': 'process.swift_hook.1', 'active': True}
                return {'items': []}

            def unload():
                self.swift_unloads += 1
            return SimpleNamespace(on=lambda *args: None, load=lambda: None, unload=unload,
                exports_sync=SimpleNamespace(dispatch=dispatch))
        handle.create_script = create
        return handle

    def dispatch(self, pid, method, args):
        if method == 'swift_capabilities':
            return {'available': True}
        if method == 'list_hooks':
            return {'hooks': []}
        return super().dispatch(pid, method, args)


async def test_swift_capabilities_are_lazy_concurrent_loads_reuse_and_reset_keeps_parent(app: Application):
    sdk = RuntimeSDK()
    app.frida._api = sdk.api
    app.ssh._probe = AsyncMock(return_value={'frida_version': '17.24.3'})
    base = {'device_id': 'test', 'bundle_id': BUNDLE}
    cap = await app.tools.invoke('swift_runtime', {**base, 'action': 'capabilities'})
    assert cap.ok and cap.data['bridge_loaded'] is False and sdk.swift_loads == 0
    results = await asyncio.gather(*(app.tools.invoke('swift_runtime', {**base, 'action': 'types'}) for _ in range(2)))
    assert all(r.ok for r in results) and sdk.swift_loads == sdk.attaches == 1
    traced = await app.tools.invoke('swift_runtime', {**base, 'action': 'trace', 'address': '0x1234'})
    session = app.frida.sessions[traced.data['session_id']]
    await app.frida.rpc('test', session.id, 'list_hooks')
    assert 'process.swift_hook.1' in session.hooks
    session.last_used = 0
    app.settings.session_idle_timeout = 1
    await app.frida.maintain()
    assert session.active and sdk.swift_unloads == 0
    reset = await app.tools.invoke('swift_runtime', {**base, 'action': 'reset'})
    assert reset.ok and sdk.swift_unloads == sdk.swift_disposes == 1
    assert session.active and not session.hooks and sdk.attaches == 1


class Wire:
    def __init__(self, orientation=1):
        self.reader = asyncio.StreamReader()
        self.messages = []
        self.closed = False
        self.orientation = orientation
        self.down = asyncio.Event()

    def write(self, data):
        self.messages.append(data)
        replies = {b'251\r\n': b'0;;828;;1792\r\n', b'253\r\n': b'0;;2\r\n', b'252\r\n': f'0;;{self.orientation}\r\n'.encode()}
        if data in replies:
            # Exercise fragmented/coalesced TCP framing rather than assuming recv==line.
            reply = replies[data]
            self.reader.feed_data(reply[:2])
            self.reader.feed_data(reply[2:])
        elif data.startswith(b'10') and data[3:4] == b'1':
            self.down.set()

    async def drain(self):
        await asyncio.sleep(0)

    def close(self):
        self.closed = True


def wire_device(app, monkeypatch, wire):
    connection = SimpleNamespace(open_connection=AsyncMock(return_value=(wire.reader, wire)))
    monkeypatch.setattr(app.ssh, 'connect', AsyncMock(return_value=connection))
    monkeypatch.setattr(app.frida, 'attach', AsyncMock(side_effect=AssertionError('Raw touch must not attach Frida')))


async def test_raw_touch_bypasses_frida_and_cancel_sends_finger_up(app, monkeypatch):
    wire = Wire()
    wire_device(app, monkeypatch, wire)
    r = await app.tools.invoke('ui_automate', {'device_id': 'test', 'bundle_id': BUNDLE,
        'steps': [{'action': 'swipe', 'start': {'x': 200, 'y': 600}, 'end': {'x': 200, 'y': 200}, 'duration_ms': 50}]})
    assert r.ok and r.data['completed'] and 'session_id' not in r.data and wire.closed
    assert sum(m == b'251\r\n' for m in wire.messages) == 1
    assert app.frida.attach.await_count == 0
    wire = Wire(orientation=3)
    wire_device(app, monkeypatch, wire)

    async def gesture():
        async with app.touch.open('test') as channel:
            assert channel.logical_size == (896, 414)
            assert channel.physical({'x': 100, 'y': 50}) == (728, 200)
            await channel.gesture([[{'x': 100, 'y': 50}, {'x': 200, 'y': 50}]], 1000)
    running = asyncio.create_task(gesture())
    await asyncio.wait_for(wire.down.wait(), 1)
    running.cancel()
    with pytest.raises(asyncio.CancelledError):
        await running
    assert [m for m in wire.messages if m.startswith(b'10')][-1].startswith(b'101001') and wire.closed


async def test_new_backend_invalid_abi_and_unencodable_text_fail_before_device_access(app, monkeypatch):
    monkeypatch.setattr(app.frida, 'attach', AsyncMock(side_effect=AssertionError('Must validate before attach')))
    for tool, args in [
        ('runtime_native', {'action': 'call', 'address': '0x1234', 'argument_types': ['pointer'], 'arguments': []}),
        ('swift_runtime', {'action': 'inspect', 'kind': 'struct', 'address': '0x1234'}),
        ('ui_automate', {'input_backend': 'touch', 'steps': [{'action': 'input_text', 'target': {'x': 1, 'y': 1}, 'text': 'a\nb'}]}),
    ]:
        r = await app.tools.invoke(tool, {'device_id': 'test', 'bundle_id': BUNDLE, **args})
        assert not r.ok and r.error.code == 'INVALID_INPUT'
    assert app.frida.attach.await_count == 0
