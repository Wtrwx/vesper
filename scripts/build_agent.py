"""Build the injected bundle using the official compiler in frida-python."""

from pathlib import Path

import frida
from prepare_swift_bridge import prepare

root = Path(__file__).resolve().parents[1]
prepare(root)
compiler = frida.Compiler()
compiler.on("diagnostics", lambda diagnostics: print(diagnostics))
for entry, asset in [("index.ts", "agent.js"), ("swift_agent.ts", "swift-agent.js")]:
    source = compiler.build(str(root / "agents/frida" / entry), project_root=str(root), source_maps="omitted")
    output = root / "src/vesper/assets" / asset
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(source)
    print(f"Built {output.relative_to(root)} ({len(source)} characters)")
