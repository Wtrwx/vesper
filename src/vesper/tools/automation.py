from __future__ import annotations

import asyncio
import time
from contextlib import AsyncExitStack
from typing import Annotated, Any, Literal

from pydantic import Field, model_validator

from vesper.app import Application
from vesper.config import StrictModel
from vesper.core.errors import MCPError
from vesper.core.registry import new_id
from vesper.tools.models import AppRequest, ClassName
from vesper.tools.ui import CaptureOptions, save_screenshot


class Target(StrictModel):
    view_id: str | None = Field(default=None, max_length=255)
    accessibility_identifier: str | None = Field(default=None, max_length=255)
    class_name: ClassName | None = None
    text: str | None = Field(default=None, max_length=512)
    x: float | None = Field(default=None, allow_inf_nan=False)
    y: float | None = Field(default=None, allow_inf_nan=False)
    window_id: str | None = Field(default=None, max_length=255)
    match_index: int | None = Field(default=None, ge=0, le=99)

    @model_validator(mode='after')
    def select_target(self) -> Target:
        if (self.x is None) != (self.y is None):
            raise ValueError('x and y must be supplied together in window UIKit points')
        selector = self.accessibility_identifier is not None or self.class_name is not None or self.text is not None
        if int(self.view_id is not None) + int(self.x is not None) + int(selector) != 1:
            raise ValueError('Choose view_id, x+y, or a selector; do not mix target forms')
        return self


class TargetStep(StrictModel):
    target: Target


class Tap(TargetStep):
    action: Literal['tap']
    event: Literal['auto', 'touch_up_inside', 'primary_action'] = 'auto'


class Back(StrictModel):
    action: Literal['back']
    mode: Literal['auto', 'navigation', 'dismiss'] = 'auto'
    window_id: str | None = Field(default=None, max_length=255)
    animated: bool = False


class InputText(TargetStep):
    action: Literal['input_text']
    text: str = Field(max_length=4096)
    focus: bool = False


class Scroll(TargetStep):
    action: Literal['scroll']
    dx: float = Field(default=0, ge=-10000, le=10000, allow_inf_nan=False)
    dy: float = Field(default=0, ge=-10000, le=10000, allow_inf_nan=False)
    pages: int | None = Field(default=None, ge=-10, le=10,
                              description='Vertical viewport pages: 1 advances, -1 goes back. Exclusive with dx/dy.')
    animated: bool = False

    @model_validator(mode='after')
    def select_distance(self) -> Scroll:
        if self.pages is not None and (self.pages == 0 or self.dx != 0 or self.dy != 0):
            raise ValueError('pages must be nonzero and cannot be combined with dx/dy')
        return self


class Assert(TargetStep):
    action: Literal['assert']


class WaitFor(TargetStep):
    action: Literal['wait_for']
    timeout_ms: int = Field(default=1000, ge=0, le=5000)
    poll_ms: int = Field(default=100, ge=50, le=1000)


class Accessibility(TargetStep):
    action: Literal['accessibility']
    operation: Literal['activate', 'increment', 'decrement', 'escape', 'scroll']
    direction: Literal['right', 'left', 'up', 'down', 'next', 'previous'] = 'down'


class Point(StrictModel):
    x: float = Field(ge=0, lt=10000, allow_inf_nan=False)
    y: float = Field(ge=0, lt=10000, allow_inf_nan=False)


class Swipe(StrictModel):
    action: Literal['swipe']
    start: Point
    end: Point
    duration_ms: int = Field(default=250, ge=50, le=3000)


class LongPress(TargetStep):
    action: Literal['long_press']
    duration_ms: int = Field(default=600, ge=100, le=3000)


class Gesture(StrictModel):
    action: Literal['gesture']
    paths: list[Annotated[list[Point], Field(min_length=2, max_length=60)]] = Field(min_length=1, max_length=5)
    duration_ms: int = Field(default=300, ge=50, le=3000)


Step = Annotated[Tap | Back | InputText | Scroll | Assert | WaitFor | Accessibility | Swipe | LongPress | Gesture, Field(discriminator='action')]


def physical(step: Step, backend: str) -> bool:
    return isinstance(step, Swipe | LongPress | Gesture) or backend == 'touch' and isinstance(step, Tap | InputText | Scroll)


class Automate(AppRequest, CaptureOptions):
    input_backend: Literal['auto', 'semantic', 'touch'] = 'auto'
    steps: list[Step] = Field(min_length=1, max_length=20)
    after_capture: Literal['none', 'summary', 'screenshot', 'both'] = 'none'
    settle_ms: int = Field(default=0, ge=0, le=500)
    limit: int = Field(default=20, ge=1, le=100)

    @model_validator(mode='after')
    def bounded_wait(self) -> Automate:
        duration = sum(getattr(s, 'duration_ms', 0) for s in self.steps)
        duration += sum(250 * abs(s.pages or 1) for s in self.steps if isinstance(s, Scroll) and physical(s, self.input_backend))
        if sum(s.timeout_ms for s in self.steps if isinstance(s, WaitFor)) + duration + self.settle_ms * len(self.steps) > 10000:
            raise ValueError('Total configured waiting must not exceed 10000ms')
        for s in self.steps:
            if physical(s, self.input_backend) and isinstance(s, TargetStep) and s.target.window_id and s.target.x is not None:
                raise ValueError('Physical coordinates are screen UIKit points; omit window_id')
            if physical(s, self.input_backend) and isinstance(s, InputText) and (';;' in s.text or any(c in s.text for c in '\r\n\x00')):
                raise ValueError('Touch input cannot encode newline/NUL/;; delimiters; use semantic input_text')
            if physical(s, self.input_backend) and isinstance(s, Tap) and s.event != 'auto':
                raise ValueError('Control events require input_backend=semantic')
        return self


def register(app: Application) -> None:
    async def mixed(request: Automate) -> dict[str, Any]:
        started, lease_id = time.monotonic(), new_id('snapshot')
        attached: dict[str, Any] = {}
        results: list[dict[str, Any]] = []

        async def session() -> str:
            nonlocal attached
            if not attached:
                attached = await app.frida.attach(request.device_id, request.bundle_id)
            return attached['session_id']

        options = request.model_dump(exclude={'device_id', 'bundle_id', 'limit', 'steps', 'input_backend'})
        lease = {'_lease_id': lease_id, '_lease_ttl': app.settings.object_handle_ttl}
        try:
            async with AsyncExitStack() as stack:
                channel = None
                for step in request.steps:
                    begin = time.monotonic()
                    try:
                        if physical(step, request.input_backend):
                            if channel is None:
                                channel = await stack.enter_async_context(app.touch.open(request.device_id))
                            target = getattr(step, 'target', None)
                            point = None
                            if target is not None:
                                if target.x is not None:
                                    point = {'x': target.x, 'y': target.y}
                                else:
                                    located = await app.frida.rpc(request.device_id, await session(), 'touch_target',
                                        {'target': target.model_dump(), 'backend': request.backend,
                                         '_input_handles': [target.view_id, target.window_id], **lease})
                                    point = located['point']
                            result = {'action': step.action, 'performed': True,
                                      **await channel.perform(step.model_dump(), point)}
                        else:
                            batch = await app.frida.rpc(request.device_id, await session(), 'automate',
                                {**options, 'steps': [step.model_dump()], 'after_capture': 'none', 'settle_ms': 0, **lease})
                            result = batch['steps'][0]
                        results.append({**result, 'elapsed_ms': round((time.monotonic() - begin) * 1000, 2)})
                        if result.get('error'):
                            break
                        if request.settle_ms:
                            await asyncio.sleep(request.settle_ms / 1000)
                    except MCPError as exc:
                        if not results:
                            raise
                        results.append({'action': step.action, 'performed': False, 'error': exc.message,
                                        'code': exc.code, 'details': exc.details})
                        break
            completed = len(results) == len(request.steps) and not any(s.get('error') for s in results)
            data = {'steps': results, 'completed': completed, 'elapsed_ms': round((time.monotonic() - started) * 1000, 2),
                    'input_backend': 'touch' if not attached else 'mixed',
                    **({key: attached[key] for key in ('session_id', 'reused') if key in attached})}
            if completed and request.after_capture != 'none':
                capture = await app.tools.invoke('ui_capture', {**request.model_dump(include=set(CaptureOptions.model_fields)),
                    'device_id': request.device_id, 'bundle_id': request.bundle_id, 'mode': request.after_capture, 'limit': request.limit})
                if not capture.ok:
                    assert capture.error is not None
                    data['capture_error'] = capture.error.model_dump()
                else:
                    data.update(capture.data or {})
            return data
        finally:
            if attached:
                app.frida.release_lease(attached['session_id'], lease_id)

    async def automate(request: Automate) -> dict[str, Any]:
        app.permissions.device(request.device_id, request.bundle_id)
        if any(physical(s, request.input_backend) for s in request.steps):
            return await mixed(request)
        attached = await app.frida.attach(request.device_id, request.bundle_id)
        session_id, lease_id = attached['session_id'], new_id('snapshot')
        arguments = request.model_dump(exclude={'device_id', 'bundle_id', 'limit', 'input_backend'})
        # Mutations are never automatically retried: a timeout can have an
        # uncertain outcome, even when the Frida session is subsequently lost.
        started = time.monotonic()
        try:
            result = await app.frida.rpc(request.device_id, session_id, 'automate', {**arguments,
                '_lease_id': lease_id, '_lease_ttl': app.settings.snapshot_ttl if request.after_capture in {'summary', 'both'} else app.settings.object_handle_ttl})
            data = {'session_id': session_id, 'reused': attached.get('reused', False),
                    **{key: result[key] for key in ('steps', 'completed', 'elapsed_ms')}}
            if 'summary' in result:
                app.snapshots.store(lease_id, request.device_id, session_id, result['summary'], started)
                data['summary'] = app.snapshots.page(lease_id, request.device_id, session_id, 0, request.limit)
            if 'screenshot' in result:
                data['screenshot'] = save_screenshot(app, result['screenshot'], (time.monotonic() - started) * 1000)
            return data
        except BaseException:
            app.snapshots.discard(lease_id)
            app.frida.release_lease(session_id, lease_id)
            raise

    app.tools.add('ui_automate', Automate, automate,
        'Batch tap, back, input_text, scroll, assert/wait_for or accessibility activate/increment/decrement/escape/scroll. '
        'backend selects auto/UIKit/accessibility observation. Swipe/long_press/multifinger gesture use optional SSH ZXTouch; '
        'input_backend=touch also routes tap/text/scroll physically. Raw gesture coordinates are oriented screen UIKit points '
        'and need no Frida attach. Semantic target coordinates are window points. No implicit wait/screenshots/text. '
        'Optional after_capture returns a fresh summary/native image. '
        'Stops at the first failure; never automatically retries mutations.', read_only=False)
