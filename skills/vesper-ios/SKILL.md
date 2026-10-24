---
name: vesper-ios
description: Use Vesper for iOS reverse engineering, UIKit/SwiftUI automation, Swift and native runtime values, decryption plus classdumpc/IDA, SSH tweak builds and installation, and LLDB/Frida/log debugging.
---

# Vesper iOS

Use the connected `vesper` MCP server and reuse the configured app session.
Load advanced schemas only when needed with `platform_tool(name="…", action="schema")`,
then call `platform_tool(name="…", arguments={…})`.

## Default workflow

只做最小必要检查。不要创建备份，不要增加或运行额外的本地测试、冒烟测试、长回归或测试报告。
编译成功后直接安装，通过 SSH 重启目标 App，再用 Frida 操作 App，实测当前修改即可。
安装命令成功即视为安装完成；不要再核对进程中加载的模块、构建标记、包版本或逐字节哈希。
能由 AI 完成的编译、安装、重启、点击、返回、输入、滑动和读日志，都由 AI 完成，不要转交用户手动操作。
复用已读信息，只取相关差异和必要行。默认只查目标控件，截图限于复现、修复后和异常节点。
首次关键失败立即停止并修正。只有安装异常、明确怀疑旧版本或出现崩溃症状时，才做对应排障。
用户验收后直接完成已授权的提交、推送，不追加检查，不持续跟踪普通推送的 CI；查询时使用完整 SHA。
没有新改动、新失败或用户明确要求，不扩展测试和收尾流程。

For tweak work: build → install directly → `app_restart` → minimal Frida/UI
exercise of the requested change. Do not create backups or add local test suites,
smoke tests, broad regressions, loaded-module comparisons, build-marker checks
or post-install hash comparisons. A successful install command completes installation.
Do not ask the user to operate the app when the available tools can do it.

`app_restart(device_id, bundle_id)` restarts through SSH `uiopen` and returns a
fresh Frida session; it falls back to the existing Frida launcher if `uiopen` is
missing. Deployment with `restart=true` includes this step. For local or SSH
build commands, read [references/ssh-tweaks.md](references/ssh-tweaks.md).

## Observe and operate with few calls

- `ui_capture(device_id, bundle_id, mode="summary")` finds/reuses the session.
  Text requires `include_text=true`; images require `mode="screenshot"` or `"both"`.
- Read subsequent `ui_snapshot` pages with the returned cursor. Omit
  `snapshot_id` for a fresh observation after changing the UI.
- Batch related `tap`, `back`, `input_text` and `scroll` steps in `ui_automate`.
  Prefer observed view IDs or unique selectors and one final `after_capture`.
  An uncertain timeout may follow a completed action: observe before retrying.
- For a paged feed, `scroll` with `pages=1` advances and `pages=-1` goes back.
  Reuse the scroll view ID; add `animated`/`settle_ms` only when necessary.
- `objc_query_instances(object_ids=[…], field_names=[…])` reads selected values
  without scanning the heap. Use class-name discovery only when no handle exists.
  Request controllers, constraints, targets or nested values only as needed.

UIKit operations and object cleanup run on the main thread. `backend="auto"`
supplements SwiftUI hosting views with accessibility nodes; `"accessibility"`
selects the semantic tree and its activate/adjust/escape/scroll actions.
For pure Swift values/calls/hooks use advanced `swift_runtime`; for C/C++ use
`runtime_native` with explicit types/offsets. Both reuse the app session and return
bounded selected data. Swift is lazy and scoped to chosen Mach-O images.
`swipe`, `long_press` and multifinger `gesture` use optional SSH ZXTouch input;
raw coordinates need no Frida attach. Missing input support returns installation
instructions through `input_setup`. Read
[references/swift-native-input.md](references/swift-native-input.md) only when
these backends are needed. Keep the existing Frida deployment; do not add VNC.

## Metadata and analysis

`objc_dump(binary_path=…)` uses host **classdumpc** for offline headers;
`objc_dump(device_id=…, bundle_id=…, class_name=…)` uses runtime metadata.
Use runtime queries for current instance values. Keep headers local and request
only relevant classes or fields.

For encrypted images, chain `app_decrypt` → classdumpc for headers or
`app_decrypt` → IDA/Hex-Rays for implementation logic. Read
[references/analysis-pipelines.md](references/analysis-pipelines.md) when needed.

## Debug and logs

Use `debug_inspect` with the default Frida backend for stacks/registers, or
`backend="lldb"` for stopped frames/locals. If a required component is missing,
use `debug_setup(action="check")` and its installation hints; matching local
Apple support can supply debugserver through `action="install"`.

Start `app_logs` once, filter by cursor/level/text, and stop it when finished.
If LLDB cannot attach, continue with Frida and logs instead of repeated setup.
Read [references/debugging.md](references/debugging.md) only for a backend failure.
Return concise findings and native MCP images; keep full dumps/logs local.
