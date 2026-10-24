from __future__ import annotations

import asyncio
import contextlib
import shlex
from pathlib import Path
from typing import Any, Literal

from pydantic import model_validator

from vesper.app import Application
from vesper.core.errors import Code, MCPError
from vesper.core.registry import new_id
from vesper.tools.models import AppRequest


class Setup(AppRequest):
    action: Literal['check', 'install'] = 'check'
    package_path: Path | None = None
    activate: bool = False

    @model_validator(mode='after')
    def install_source(self) -> Setup:
        if self.action == 'install' and not self.package_path:
            raise ValueError('install requires a local matching ZXTouch deb package_path')
        if self.action == 'check' and (self.package_path or self.activate):
            raise ValueError('check does not install or restart SpringBoard')
        return self


def register(app: Application) -> None:
    async def setup(request: Setup) -> dict[str, Any]:
        app.permissions.device(request.device_id, request.bundle_id)
        if request.action == 'check':
            return await app.touch.check(request.device_id)
        assert request.package_path is not None
        source = app.permissions.local_path(request.package_path, must_exist=True)
        if source.suffix != '.deb':
            raise MCPError(Code.INVALID_INPUT, 'Input component must be a local deb package')
        lock = app.deployment_locks.setdefault(request.device_id, asyncio.Lock())
        async with lock:
            stage = app.settings.devices[request.device_id].staging_directory + '/' + new_id('zxtouch') + '.deb'
            try:
                await app.ssh.upload(request.device_id, source, stage)
                quoted = shlex.quote(stage)
                info = await app.ssh._run(request.device_id, 'dpkg-deb -f ' + quoted + ' Package Architecture')
                if info['exit_status'] or not any(line in {'com.zjx.ioscontrol', 'Package: com.zjx.ioscontrol'} for line in info['stdout'].splitlines()):
                    raise MCPError(Code.INVALID_INPUT, 'Package is not the expected ZXTouch input component')
                installed = await app.ssh._run(request.device_id, 'dpkg -i ' + quoted)
                if installed['exit_status']:
                    raise MCPError(Code.UNAVAILABLE, 'ZXTouch installation failed', diagnostic=installed['stderr'][-512:])
                app.touch.geometry_cache.pop(request.device_id, None)
            finally:
                with contextlib.suppress(Exception):
                    await app.ssh._run(request.device_id, 'rm -f ' + shlex.quote(stage))
            if request.activate:
                restarted = await app.ssh._run(request.device_id, 'sbreload')
                if restarted['exit_status']:
                    return {'installed': True, 'activation_required': True, 'reason': 'sbreload failed',
                            'agent_instruction': 'Activate the installed input component before retrying physical gestures.'}
            return {'installed': True, 'activation_required': not request.activate,
                    'springboard_restart_requested': request.activate,
                    'next_action': 'Restart target app through SSH, then perform the requested physical gesture.'}

    app.tools.add('input_setup', Setup, setup,
        'Check optional SSH-loopback ZXTouch input support and return missing-component installation hints. '
        'action=install installs a local matching ZXTouch deb package_path; activate=true restarts SpringBoard '
        'to load the input component. Do not install for ordinary UIKit/accessibility operations. '
        'The external service is not bundled.', read_only=False)
