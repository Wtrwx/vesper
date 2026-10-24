# Debugging backends

Use Frida first for running-thread stacks/registers and `app_logs` for bounded
logs. Use LLDB only when stopped frames or locals are needed. UIKit operations
remain on the main thread.

If a needed component is missing, use `debug_setup(action="check")` and follow
that backend's installation hint. Device debugserver can come from matching
local Apple device support. Preserve the current Frida client/server pairing.

If LLDB/debugserver cannot attach, inspect the error once and continue with
Frida, a selected method trace, or live instance fields. Avoid repeated
reinstallation and attach loops. `app_logs` captures the target process rather
than system-wide log history; os_log placeholders may not contain expanded values.

Start a log stream once and read it with `after=next_cursor` plus narrow filters.
Stop streams and temporary hooks after use. Read crash files only when diagnosing
an actual exit; RootHide may expose them below `/rootfs/var/mobile/Library/Logs/CrashReporter`.
A Frida transport exit and an app crash are separate events. If relevant,
`launchctl print` shows the daemon's exit reason, but its configured memory
limit need not equal the running process's limit.

For layout problems, inspect the relevant views in one window coordinate space
or take one screenshot. Keep the diagnosis scoped to the current problem.
Do not turn it into a multi-type regression matrix, backup workflow,
loaded-image check or broad test campaign.
