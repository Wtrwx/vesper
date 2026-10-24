# Build, install and operate the app

Follow the existing project's README/AGENTS.md/Makefile for its Theos scheme,
SDK, architecture and build command. Use the current SSH configuration and
Frida version pairing.

1. Build with the project's command, such as `make package`, or `tweak_build`
   for a Vesper-created project. Read the compiler error when it fails.
2. Transfer the resulting `.deb` through the existing SFTP/SCP deployment path
   and install it with the project's package manager, such as `dpkg -i`.
   Once the command succeeds, proceed directly to the app.
3. Use `app_restart` to restart through SSH and attach Frida. `tweak_deploy`
   with `restart=true` already includes this step.
4. Use `ui_automate` to exercise only the requested change, then inspect the
   result with `ui_capture` or selected runtime fields. Complete these actions
   yourself instead of asking the user to click, restart or browse manually.

Do not create backups or rollback packages. Do not add local tests, smoke tests,
repeated regression loops or test reports. Do not compare loaded modules,
build markers, installed versions or installed-file hashes after a successful installation.
Use those diagnostics only for an installation error or a concrete stale-version symptom.
Do not uninstall or roll back automatically after a failed on-device action;
read the relevant error/log and continue fixing the requested problem.

For an SSH build host, use its existing Theos environment and a dedicated
project directory. A typical command is:

`ssh -o BatchMode=yes BUILD_HOST 'cd /absolute/project && make package'`

Use the observed host/path/flags, quote paths, preserve the command's exit
status, and return only the relevant tail of a lengthy build log.

When LLDB cannot attach, use `debug_inspect(backend="frida")`, `app_logs`,
a selected method trace or `objc_query_instances` for the needed values.
Stop temporary log/trace hooks after use. Add a screenshot only when it helps
judge the current change. VNC is not required for this workflow.
