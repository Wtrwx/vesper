from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from tests.fakes import FakeFrida, FakeSSH
from tests.test_theos import make_deb
from vesper.app import Application
from vesper.core.errors import Code, MCPError
from vesper.core.permissions import sha256
from vesper.core.registry import new_id
from vesper.tools.tweak import Verify
from vesper.workflows.deployment import DeploymentService
from vesper.workflows.develop_tweak import DevelopRequest, DevelopWorkflow


def grant(app: Application, approval_id: str):
    app.registry.db.execute("UPDATE approvals SET status='granted' WHERE id=? AND status='pending'", (approval_id,))
    app.registry.db.commit()


@pytest.fixture
def infrastructure(app: Application, project, monkeypatch):
    ssh = FakeSSH(app)
    frida = FakeFrida(app, ssh)
    monkeypatch.setattr(app, "ssh", ssh)
    monkeypatch.setattr(app, "frida", frida)

    async def build(project_id):
        record = app.theos.project(project_id)
        build_id = new_id("build")
        directory = Path(record["path"]) / "builds" / build_id
        directory.mkdir(parents=True)
        path = make_deb(directory, record["spec"])
        result = {"build_id": build_id, "project_id": project_id, "source_hash": app.theos.fingerprint(project_id), "success": True,
            "exit_status": 0, "package_path": str(path), "package_sha256": sha256(path), "build_marker": build_id, "spec": record["spec"], "diagnostics": [], "log": "TEST FAKE COMPILER"}
        app.registry.save(build_id, "build", result, "succeeded")
        return result
    monkeypatch.setattr(app.theos, "build", build)
    return ssh, frida


async def prepare(app):
    return await DevelopWorkflow(app).run(DevelopRequest(device_id="test", bundle_id="dev.iosdecompiler.fixture", accessibility_identifier="fixture.button", replacement_title="Tweaked", background=False))


async def resume(app, report):
    approval = report["approval"]["approval_id"]
    grant(app, approval)
    return await DevelopWorkflow(app).run(DevelopRequest(workflow_id=report["workflow_id"], approval_id=approval, background=False))


async def test_build_installs_directly_then_leaves_device_testing_to_caller(app: Application, infrastructure, monkeypatch):
    ssh, frida = infrastructure
    report = await prepare(app)
    assert report["phase"] == "awaiting_approval" and not ssh.mutations
    # An existing package no longer requires a managed backup or version/hash checks.
    ssh.installed = {"metadata": {"version": "unmanaged-old-package"}}
    monkeypatch.setattr(ssh, "package_status", AsyncMock(side_effect=AssertionError("No post-install package checks")))
    monkeypatch.setattr(ssh, "list_crashes", AsyncMock(side_effect=AssertionError("No automatic crash sweep")))
    monkeypatch.setattr(frida, "rpc", AsyncMock(wraps=frida.rpc))
    frida.wrong_title = True
    report = await resume(app, report)
    assert report["phase"] == "installed" and report["success"]
    assert ssh.mutations == ["upload", "install", "ssh_restart"]
    assert report["deployment_results"]["previous"] is None
    assert report["verification"] is None and report["rollback"] is None
    assert not any(call.args[2] == "tweak_state" for call in frida.rpc.call_args_list)
    # An explicit device check reads just the requested UI once, without undoing installation.
    evidence = await DeploymentService(app).verify(Verify(
        deployment_id=report["deployment_results"]["deployment_id"], session_id=report["session_id"],
        accessibility_identifier="fixture.button", expected_title="Tweaked"))
    assert not evidence["verified"] and ssh.installed is not None
    assert ssh.mutations == ["upload", "install", "ssh_restart"]


async def test_failed_install_does_not_roll_back_or_uninstall(app: Application, infrastructure):
    ssh, _ = infrastructure
    report = await prepare(app)
    ssh.fail_install = True
    report = await resume(app, report)
    assert not report["success"] and report["phase"] == "deployment_failed"
    assert ssh.mutations == ["upload", "install"] and report["rollback"] is None


async def test_cancelled_install_finishes_without_uninstalling(app: Application, infrastructure, monkeypatch):
    ssh, _ = infrastructure
    report = await prepare(app)
    started, release = asyncio.Event(), asyncio.Event()
    actual_install = ssh.install
    async def blocked_install(*args):
        started.set()
        await release.wait()
        return await actual_install(*args)
    monkeypatch.setattr(ssh, "install", blocked_install)
    task = asyncio.create_task(resume(app, report))
    await asyncio.wait_for(started.wait(), 2)
    task.cancel()
    release.set()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert ssh.installed is not None and "uninstall" not in ssh.mutations


@pytest.mark.parametrize("ssh_available", [True, False])
async def test_app_restart_reattaches_for_automation(app: Application, infrastructure, monkeypatch, ssh_available):
    ssh, frida = infrastructure
    old = await frida.attach("test", "dev.iosdecompiler.fixture")
    if not ssh_available:
        monkeypatch.setattr(ssh, "restart_app", AsyncMock(side_effect=MCPError(Code.UNAVAILABLE, "uiopen missing")))
    arguments = {"device_id": "test", "bundle_id": "dev.iosdecompiler.fixture"}
    pending = await app.tools.invoke("app_restart", arguments)
    assert pending.error.code == "APPROVAL_REQUIRED" and not ssh.mutations
    approval = pending.error.details["approval_id"]
    grant(app, approval)
    result = await app.tools.invoke("app_restart", {**arguments, "approval_id": approval})
    assert result.ok and result.data["pid"] != old["pid"]
    assert result.data["backend"] == ("ssh" if ssh_available else "frida")
    assert not frida.sessions[old["session_id"]].active
    assert frida.sessions[result.data["session_id"]].active
    assert ssh.mutations == (["ssh_restart"] if ssh_available else ["terminate", "launch"])
