"""Physical-device demonstration through the real MCP stdio transport.

An operator grants each exact device mutation using the separate approval CLI.
Build, install, restart, and read the selected control once; no backups or long checks.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from vesper.config import Settings


async def demo(args: argparse.Namespace) -> None:
    settings = Settings.load(args.config)
    root = Path(__file__).resolve().parents[1]
    parameters = StdioServerParameters(command=sys.executable, args=["-m", "vesper.server", "--config", str(args.config.resolve())], env={**os.environ, "PYTHONPATH": str(root / "src")})
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write) as client:
            await client.initialize()

            async def call(name: str, arguments: dict[str, Any], *, allow_error: bool = False) -> dict[str, Any]:
                result = await client.call_tool(name, arguments)
                data = result.structuredContent
                if data is None:
                    raise RuntimeError("Server omitted structured result")
                if not data["ok"] and not allow_error:
                    raise RuntimeError(json.dumps(data["error"], indent=2))
                return data

            def approve(approval_id: str) -> None:
                subprocess.run([sys.executable, "-m", "vesper.core.permissions", "--state-dir", str(settings.state_dir), approval_id], check=True, env={**os.environ, "PYTHONPATH": str(root / "src")})

            print(json.dumps((await call("device_connect", {"device_id": args.device}))["data"], indent=2))
            report = (await call("develop_tweak", {"device_id": args.device, "bundle_id": "dev.iosdecompiler.fixture", "accessibility_identifier": "fixture.button", "replacement_title": "Tweaked", "background": False}))["data"]
            if report["phase"] != "awaiting_approval":
                raise RuntimeError(json.dumps(report, indent=2))
            print("Inspected button action:", report["inspected_classes_and_methods"][0]["button_actions"])
            print("Generated source:", report["generated_source_files"])
            approve(report["approval"]["approval_id"])
            report = (await call("develop_tweak", {"workflow_id": report["workflow_id"], "approval_id": report["approval"]["approval_id"], "background": False}))["data"]
            if not report["success"]:
                raise RuntimeError(json.dumps(report, indent=2))
            print("Installed and restarted:", report["deployment_results"]["deployment_id"])
            views = await call("ui_find_views", {"device_id": args.device,
                "session_id": report["session_id"], "accessibility_identifier": "fixture.button",
                "include_text": True, "limit": 1})
            print("Current button:", views["data"].get("views", []))



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--device", required=True)
    asyncio.run(demo(parser.parse_args()))
