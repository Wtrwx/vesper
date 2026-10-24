from __future__ import annotations

import asyncio
import contextlib
import math
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import asyncssh

from vesper.adapters.ssh import SSHAdapter
from vesper.core.errors import Code, MCPError

SOURCE = 'https://github.com/Epic0001/zxtouchrootless'


def missing_input() -> MCPError:
    return MCPError(Code.UNAVAILABLE, 'ZXTouch input service is unavailable over SSH',
        component='zxtouch', source=SOURCE,
        install_hint='Use input_setup(action=install, package_path=...) with a matching RootHide/rootless ZXTouch deb; activate=True restarts SpringBoard. UIKit/accessibility actions need no input service.',
        agent_instruction='Install/activate the selected input component when a physical gesture is required; do not ask the user to perform a supported app action manually.')


class TouchChannel:
    """Independent protocol client; the external GPL service is not bundled."""

    def __init__(self, reader: Any, writer: Any, timeout: float):
        self.reader, self.writer, self.timeout = reader, writer, timeout
        self.buffer = bytearray()
        self.active: dict[int, tuple[float, float]] = {}
        self.width = self.height = self.scale = 0.0
        self.orientation = 1

    async def request(self, task: int, *parts: Any) -> list[str]:
        body = ';;'.join(str(p) for p in parts)
        if any(c in body for c in '\r\n\x00'):
            raise MCPError(Code.INVALID_INPUT, 'Input protocol cannot encode newline/NUL; use semantic input_text')
        async with asyncio.timeout(self.timeout):
            self.writer.write(f'{task}{body}\r\n'.encode())
            await self.writer.drain()
            while b'\r\n' not in self.buffer:
                chunk = await self.reader.read(512)
                if not chunk:
                    raise MCPError(Code.UNAVAILABLE, 'Input service disconnected; observe before retrying the action')
                self.buffer.extend(chunk)
                if len(self.buffer) > 4096:
                    raise MCPError(Code.LIMIT_EXCEEDED, 'Input service response exceeds 4 KiB')
            line, _, tail = self.buffer.partition(b'\r\n')
            self.buffer = bytearray(tail)
            data = line.decode('utf-8', errors='replace').split(';;')
            if data[0] != '0':
                raise MCPError(Code.UNAVAILABLE, 'Input service rejected the operation', diagnostic=';;'.join(data[1:])[:256])
            return data[1:]

    async def geometry(self, stable: tuple[float, float, float] | None = None) -> dict[str, Any]:
        if stable:
            self.width, self.height, self.scale = stable
        else:
            size = await self.request(25, 1)
            self.scale = float((await self.request(25, 3))[0])
            self.width, self.height = sorted(float(n) for n in size[:2])
        self.orientation = int((await self.request(25, 2))[0])
        if not (0 < self.width <= self.height < 10000 and 0 < self.scale <= 4 and self.orientation in {1, 2, 3, 4}):
            raise MCPError(Code.UNAVAILABLE, 'Input service returned unsupported screen geometry')
        width, height = self.logical_size
        return {'width_points': width, 'height_points': height, 'scale': self.scale, 'orientation': self.orientation}

    @property
    def logical_size(self) -> tuple[float, float]:
        w, h = self.width / self.scale, self.height / self.scale
        return (h, w) if self.orientation in {3, 4} else (w, h)

    def physical(self, point: dict[str, float]) -> tuple[float, float]:
        x, y = point['x'], point['y']
        w, h = self.logical_size
        if not (math.isfinite(x) and math.isfinite(y) and 0 <= x < w and 0 <= y < h):
            raise MCPError(Code.INVALID_INPUT, 'Touch point is outside the oriented screen in UIKit points')
        x, y = x * self.scale, y * self.scale
        if self.orientation == 2:
            x, y = self.width - x, self.height - y
        elif self.orientation == 3:
            x, y = self.width - y, x
        elif self.orientation == 4:
            x, y = y, self.height - x
        return min(x, self.width - .1), min(y, self.height - .1)

    async def touches(self, event: int, points: list[tuple[float, float]]) -> None:
        # Task 10 is deliberately unacknowledged by ZXTouch. The following
        # query acts as a service-processing barrier, without per-frame RTTs.
        records = []
        for finger, (x, y) in enumerate(points, 1):
            if event == 0:
                self.active.pop(finger, None)
            else:
                self.active[finger] = (x, y)
            records.append(f'{event}{finger:02d}{round(x * 10):05d}{round(y * 10):05d}')
        self.writer.write(('10' + str(len(records)) + ''.join(records) + '\r\n').encode())
        await self.writer.drain()

    async def gesture(self, paths: list[list[dict[str, float]]], duration_ms: int) -> dict[str, Any]:
        coordinates = [[self.physical(p) for p in path] for path in paths]
        frames = max(2, min(180, math.ceil(duration_ms / 16.67)))
        def interpolate(path: list[tuple[float, float]], fraction: float) -> tuple[float, float]:
            position = fraction * (len(path) - 1)
            i = min(int(position), len(path) - 2)
            t = position - i
            return (path[i][0] + (path[i + 1][0] - path[i][0]) * t,
                    path[i][1] + (path[i + 1][1] - path[i][1]) * t)
        started = time.monotonic()
        await self.touches(1, [p[0] for p in coordinates])
        for index in range(1, frames + 1):
            await asyncio.sleep(max(0, started + duration_ms / 1000 * index / frames - time.monotonic()))
            await self.touches(2, [interpolate(p, index / frames) for p in coordinates])
        await self.touches(0, [p[-1] for p in coordinates])
        orientation = await self.request(25, 2)
        self.orientation = int(orientation[0])
        return {'backend': 'touch', 'delivery': 'input_service_processed', 'fingers': len(paths), 'frames': frames,
                'elapsed_ms': round((time.monotonic() - started) * 1000, 2)}

    async def release(self) -> None:
        if not self.active:
            return
        records = ''.join(f'0{finger:02d}{round(x * 10):05d}{round(y * 10):05d}' for finger, (x, y) in self.active.items())
        self.writer.write(('10' + str(len(self.active)) + records + '\r\n').encode())
        await self.writer.drain()
        self.active.clear()
        await self.request(25, 2)

    async def perform(self, step: dict[str, Any], point: dict[str, float] | None = None) -> dict[str, Any]:
        action = step['action']
        if action == 'gesture':
            return await self.gesture(step['paths'], step['duration_ms'])
        if action == 'swipe':
            return await self.gesture([[step['start'], step['end']]], step['duration_ms'])
        if point is None:
            raise MCPError(Code.INVALID_INPUT, 'Physical action requires a resolved target')
        if action in {'tap', 'long_press'}:
            return await self.gesture([[point, point]], step.get('duration_ms', 40))
        if action == 'input_text':
            text = step['text']
            if ';;' in text or any(c in text for c in '\r\n\x00'):
                raise MCPError(Code.INVALID_INPUT, 'Input protocol cannot encode newline/NUL/;; delimiters; use semantic input_text')
            await self.perform({'action': 'tap'}, point)
            await self.request(24, 1, text)
            return {'backend': 'touch', 'characters': len(text), 'delivery': 'input_service_processed'}
        if action == 'scroll':
            w, h = self.logical_size
            pages = step.get('pages')
            dx = step.get('dx', 0)
            dy = (.6 * h * (1 if pages > 0 else -1)) if pages is not None else step.get('dy', 0)
            end = {'x': max(1, min(w - 1, point['x'] - dx)), 'y': max(1, min(h - 1, point['y'] - dy))}
            result = {}
            for _ in range(abs(pages) if pages is not None else 1):
                result = await self.gesture([[point, end]], 250)
            return {**result, 'pages_requested': pages}
        raise MCPError(Code.INVALID_INPUT, 'This action requires the UIKit/accessibility backend')


class TouchAdapter:
    def __init__(self, ssh: SSHAdapter):
        self.ssh = ssh
        self.locks: dict[str, asyncio.Lock] = {}
        self.geometry_cache: dict[str, tuple[Any, float, tuple[float, float, float]]] = {}

    @asynccontextmanager
    async def open(self, device_id: str) -> AsyncIterator[TouchChannel]:
        async with self.locks.setdefault(device_id, asyncio.Lock()):
            connection = await self.ssh.connect(device_id)
            try:
                reader, writer = await asyncio.wait_for(connection.open_connection('127.0.0.1',
                    self.ssh.settings.devices[device_id].touch_port, encoding=None), min(5, self.ssh.settings.operation_timeout))
            except (asyncssh.Error, OSError, TimeoutError) as exc:
                self.geometry_cache.pop(device_id, None)
                raise missing_input() from exc
            channel = TouchChannel(reader, writer, min(5, self.ssh.settings.operation_timeout))
            try:
                cached = self.geometry_cache.get(device_id)
                stable = cached[2] if cached and cached[0] is connection and cached[1] > time.monotonic() else None
                await channel.geometry(stable)
                if stable is None:
                    self.geometry_cache[device_id] = (connection, time.monotonic() + self.ssh.settings.ssh_probe_ttl,
                                                    (channel.width, channel.height, channel.scale))
                yield channel
            except TimeoutError as exc:
                self.geometry_cache.pop(device_id, None)
                raise MCPError(Code.TIMEOUT, 'Input operation timed out; observe before retrying') from exc
            except (asyncssh.Error, OSError) as exc:
                self.geometry_cache.pop(device_id, None)
                raise MCPError(Code.UNAVAILABLE, 'Input channel disconnected; action outcome may be uncertain') from exc
            except (ValueError, IndexError) as exc:
                self.geometry_cache.pop(device_id, None)
                raise MCPError(Code.UNAVAILABLE, 'Input service returned invalid geometry or protocol data') from exc
            except BaseException:
                self.geometry_cache.pop(device_id, None)
                raise
            finally:
                if channel.active:
                    self.geometry_cache.pop(device_id, None)
                try:
                    with contextlib.suppress(Exception, asyncio.CancelledError):
                        await asyncio.wait_for(channel.release(), 1)
                finally:
                    writer.close()

    async def check(self, device_id: str) -> dict[str, Any]:
        try:
            async with self.open(device_id) as channel:
                return {'backend': 'zxtouch', 'available': True, 'transport': 'ssh_loopback',
                        'coordinate_space': 'oriented screen UIKit points', 'screen': dict(zip(('width_points', 'height_points'), channel.logical_size, strict=True))}
        except MCPError as exc:
            if exc.code not in {Code.UNAVAILABLE, Code.TIMEOUT}:
                raise
            return {'backend': 'zxtouch', 'available': False, 'reason': exc.message, **exc.details}
