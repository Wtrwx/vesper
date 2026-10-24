<h1 align="center">
  <a href="docs/assets/vesper-logo.png">
    <img src="docs/assets/vesper-banner.png" alt="Vesper — iOS 逆向工程平台 · MCP 工具 + Agent Skill" width="960">
  </a>
</h1>

<p align="center">
  <strong>在 Agent 中完成界面检查、自动化、分析与 Tweak 开发。</strong>
</p>

<p align="center">
  <a href="https://github.com/Wtrwx/vesper/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Wtrwx/vesper/ci.yml?branch=main&amp;style=flat-square&amp;label=CI" alt="CI 工作流状态"></a>
  <a href="pyproject.toml"><img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&amp;logo=python&amp;logoColor=white" alt="Python 3.11 及以上"></a>
  <a href="#环境要求"><img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-8B86F7?style=flat-square" alt="主机平台：macOS 与 Linux"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-56BFCF?style=flat-square" alt="MIT 许可证"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="docs/CLIENTS.md">客户端配置</a> ·
  <a href="docs/TOOLS.md">工具参考</a> ·
  <a href="#demo">Demo</a> ·
  <a href="https://github.com/Wtrwx/vesper/issues">问题反馈</a>
</p>

Vesper 是一个 iOS 逆向平台，通过结构化 MCP 工具与 Agent Skill 串联运行时检查、App 自动化、砸壳、静态分析、调试和 Tweak 开发。将 MCP 客户端与 SSH、Frida 及可选的正版 IDA 连接后，即可通过 Agent 操作目标应用。

[vesper-ios Agent Skill](skills/vesper-ios/SKILL.md) 将底层工具编排为界面检查、砸壳 + classdumpc/IDA、SSH Tweak 开发和调试等组合流程。仓库提供 [Codex、Claude Code 和 Cursor 的配置示例](docs/CLIENTS.md)。

| 界面检查与自动化 | 运行时分析与调试 | Tweak 构建与部署 |
| --- | --- | --- |
| 采集 UIKit 与 SwiftUI 暴露的无障碍语义，查询实时对象并批量操作界面。 | 追踪 Objective-C、读取 Swift/原生值、砸壳导出 Mach-O，按需接入 IDA 或 LLDB。 | 生成可编辑 Logos 项目，通过 Theos 构建，经 SSH 安装并重启应用。 |

<details>
<summary><strong>目录</strong></summary>

- [功能](#功能)
- [能力架构](#能力架构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [Demo](#demo)
- [项目结构](#项目结构)
- [开发](#开发)
- [安全与能力边界](#安全与能力边界)
- [文档](#文档)
- [参与贡献](#参与贡献)
- [友情链接](#友情链接)
- [许可证](#许可证)

</details>

## 功能

| 模块 | 能力 | 工具示例 |
| --- | --- | --- |
| 设备管理 | SSH/SFTP、设备信息、应用与进程枚举 | `device_connect`、`device_info`、`device_list_apps` |
| UIKit / SwiftUI 检查 | 窗口与场景、视图树、无障碍语义节点、坐标命中、约束、截图 | `ui_capture`、`ui_snapshot`、`ui_inspect_view`、`ui_screenshot` |
| Objective-C | 类、方法、属性、实例变量、IMP、对象元数据、头文件生成 | `objc_dump_class`、`objc_get_methods`、`objc_generate_header` |
| Swift / 原生运行时 | 有界 Swift 类型、实例参数、显式签名调用、C/C++ 字段与追踪 | `swift_runtime`、`runtime_native` |
| 动态分析 | 持久 Frida 会话、观察型 Hook、有界事件与调用栈 | `frida_attach`、`frida_trace_method`、`frida_get_events` |
| 静态分析 | 可选无界面 IDA、反汇编、Hex-Rays 伪代码、交叉引用、运行时地址关联 | `ida_open_binary`、`ida_decompile`、`ida_resolve_runtime_address` |
| Tweak 开发 | 可编辑 Logos 项目、ABI 校验、Theos 构建、直接安装、SSH 重启及真机操作 | `tweak_create_project`、`tweak_build`、`tweak_deploy` |
| 工作流 | 按钮标题修改、持久化报告、后台任务与取消 | `develop_tweak`、`job_status`、`job_cancel` |

完整工具与必填字段见[工具参考](docs/TOOLS.md)。

默认 `tool_profile="focused"` 只加载 20 个常用工具；完整 74 个底层能力可通过
`platform_tool(name=..., action="schema")` 按需查询和调用，也可设为 `"full"`
直接展示。将 `skills/vesper-ios` 复制到 Agent 的技能目录（Codex 为
`~/.codex/skills/vesper-ios`），即可按需加载操作流程，减少常驻 schema 和上下文。

新增 `ui_automate` 批量点击/返回/输入/滚动/断言，`objc_query_instances` 按字段读取
实时实例参数，`app_logs` 和 `debug_inspect` 读取日志、栈与寄存器，`debug_setup`
检查依赖并安装设备 debugserver。`app_decrypt` 复用会话砸壳，输出校验后的本地
Mach-O，可继续传给 `objc_dump`（classdumpc 或 runtime）及 IDA/Hex-Rays。
参见[分析组合流程](docs/DECRYPTION.md)。

## 能力架构

![Vesper 能力架构：Agent 客户端与 Skill、MCP 工具、界面自动化、运行时分析、日志调试、砸壳、静态分析、Tweak 开发与设备执行层](docs/assets/vesper-capability-architecture.png)

Agent Skill 基于 MCP 工具编排组合流程，通过 SSH 与 Frida 连接目标应用；
classdumpc、IDA/Hex-Rays、LLDB/debugserver、Theos 和 ZXTouch 按需提供分析、
开发和物理触摸能力。Swift 支持仍属实验阶段。后端要求与限制见
[自动化与实例参数](docs/AUTOMATION.md)和[分析组合流程](docs/DECRYPTION.md)。

## 环境要求

| 组件 | 要求 |
| --- | --- |
| 主机 | macOS 或 Linux，Python 3.11+，[uv](https://docs.astral.sh/uv/) |
| 设备 | 操作者控制的越狱 iPhone，支持 SSH 公钥认证 |
| Frida | Frida 17.x，最低 17.5；主机客户端与设备服务端版本必须完全一致 |
| Tweak 构建 | [Theos](https://theos.dev/)、Logos、`make`、兼容的 iOS SDK、编译链接器与签名工具 |
| Tweak 部署 | 兼容的注入框架，以及具备 `dpkg` 安装权限的 SSH 账户 |
| 静态分析 | 可选：正版 IDA Pro 9+、官方 `idapro` 支持和兼容的 Python 解释器；伪代码需要 Hex-Rays |
| Agent 开发 | Node.js 与 npm，仅在重新构建 TypeScript Agent 时需要 |

Python 包已包含编译后的 Frida Agent。基础 SSH、界面和运行时检查不依赖 Node.js、Theos 或 IDA。项目优先面向 Rootless 越狱；ARM64e Tweak 构建需要 macOS 上适用的 Apple 工具链。SDK、商业工具和设备端服务由操作者准备。

## 快速开始

### 1. 安装主机依赖

在仓库根目录执行：

```sh
uv sync --frozen --all-extras --no-editable
cp -n examples/vesper.toml vesper.local.toml
chmod 600 vesper.local.toml
```

锁文件固定 Python 依赖版本。非 editable 安装也适用于不加载 editable `.pth` 文件的受管环境。

### 2. 配置设备

编辑 `vesper.local.toml`，设置工作区绝对路径、SSH 地址、密钥、经过核验的 SSH 主机密钥、允许访问的应用 Bundle ID 和 Frida 连接方式。

```toml
workspace = "/absolute/path/to/vesper"
state_dir = ".vesper"

[devices.test]
host = "127.0.0.1"
port = 2222
username = "root"
client_keys = ["~/.ssh/id_ed25519"]
known_hosts = "~/.ssh/known_hosts"
allowed_apps = ["dev.iosdecompiler.fixture"]
frida_device_id = "replace-with-observed-device-id"
```

示例地址假定已建立本地 SSH 转发，请按设备实际连接方式修改。连接前应核验并固定 SSH 主机密钥。使用 `frida_list_devices` 返回的准确设备 ID。如果使用已有的安全 Frida SSH 隧道，将 `frida_device_id` 替换为 `frida_remote = "127.0.0.1:27043"`；每台设备只配置一种 Frida 连接方式。

使用 `--config` 参数或 `VESPER_CONFIG` 环境变量指定配置文件，`--config` 优先。状态目录默认为工作区下的 `.vesper`。

构建 Tweak 时，设置 `THEOS` 环境变量或配置中的 `theos` 路径。使用 IDA 时，先完成官方许可与 Python 环境配置，再设置 `ida_directory` 和 `ida_python`。更多选项见[示例配置](examples/vesper.toml)中的注释。

### 3. 连接 MCP 客户端

```sh
.venv/bin/vesper --config /absolute/path/to/vesper/vesper.local.toml
```

在 MCP 客户端中使用绝对路径启动此命令。标准输出用于 MCP 协议，诊断信息写入标准错误。Codex、Claude Code 和 Cursor 的示例见[客户端配置](docs/CLIENTS.md)。

结构化结果只在 `structuredContent` 中返回一次，文本块仅含简短状态。
仅解析文本的客户端可配置 `legacy_text_json = true` 恢复重复 JSON；图片始终使用原生图片块。

默认闲置 300 秒后回收会话，等待/执行中的操作、Hook 和运行中的工作流会保留会话。
`session_idle_timeout = 0` 可禁用回收。顶层 TOML 可配置 `ssh_probe_ttl`、`snapshot_ttl`、
`snapshot_max_count`、`snapshot_max_bytes`、`object_handle_ttl`、`maintenance_interval`。
`device_info(force_refresh=true)` 可强制刷新探测；连接失败和重连会使探测缓存失效。

同一状态目录只运行一个服务进程。未配置设备时，仍可使用 `server_status` 等主机工具。服务本身不需要模型 API Key。

## Demo

### 一次调用采集应用界面

解锁设备并打开白名单应用，直接调用 `ui_capture`：

```json
{"device_id":"test","bundle_id":"dev.iosdecompiler.fixture","mode":"summary","include_text":false}
```

必须指定 `mode`：`summary` 返回可见控件摘要（包含自定义触摸、手势 UIView），
`screenshot` 返回原生 MCP PNG 图片和 `local_path`，`both` 同时返回两者。
采集文字仍须显式设置 `include_text: true`。有效会话会自动复用；首次挂载才探测 SSH、
枚举应用并验证进程。连续采集均读取实时界面，同一有效进程不会重复枚举或挂载，
也不会隐式启动、重启应用。

摘要默认包含 ID、类名、位置、交互标记及必要父子层级。通过 `format: "detail"`、
`fields`、`visible_only: false`、`controls_only: false` 获取更多内容；控制器、
Target-Action、约束等信息按需获取。可见性考虑祖先隐藏、累积透明度和窗口范围，
尚不推断视图之间的遮挡。

统一入口根部返回 `session_id`，`summary` 中返回 `snapshot_id`、`captured_at`、
`truncated` 和 `next_cursor`。将会话 ID 及游标交给 `ui_snapshot` 读取后续不可变分页，
不会再次访问设备。`ui_find_views` 使用相同机制。不传 `snapshot_id` 会重新采集当前界面；
缓存分页不能更改采集、过滤参数。默认缓存 60 秒，最多 4 份、合计 8 MiB；
设备端仍保持 2048 个对象上限，容量压力可能使旧快照提前失效。

截图默认使用 `screenshot_transport = "binary"`，避免 Frida 链路中的 base64，保持 PNG
字节和默认缩放不变；可设为 `"base64"` 兼容传输。两种模式都返回原生 MCP 图片。

### 自动化操作与实例参数

`ui_automate` 在一次 MCP 调用中复用/挂载会话，语义批处理仍只用一次 Frida RPC，执行最多 20 个步骤：
`tap`、`back`、`input_text`、`scroll`、`assert`、`wait_for` 和 `accessibility`。目标可指定已获取的
`view_id`、唯一的 identifier/class/text 选择器，或窗口 UIKit 点坐标。

```json
{"device_id":"test","bundle_id":"dev.iosdecompiler.fixture","steps":[{"action":"tap","target":{"accessibility_identifier":"fixture.button"}},{"action":"assert","target":{"accessibility_identifier":"fixture.status","text":"Tapped"}}],"after_capture":"summary"}
```

失败立即停止，不自动重试可能已经执行的操作。默认无隐式等待、不截图、不采集文字；
显式等待的总预算最多 10 秒，`after_capture` 可按需返回摘要或原生图片。

点击通过 UIControl 事件或 accessibility activation 实现；返回通过导航栈 pop/模态 dismiss，
滚动修改 UIScrollView 偏移，输入设置文本并发送变更通知。无需部署额外设备服务。
物理手势走下述可选 SSH 输入后端。完整示例和限制见
[自动化与实例参数](docs/AUTOMATION.md)。
分页 Feed 可用 `scroll` 的 `pages: 1/-1` 前进或后退，设备端读取当前滚动区域的页高，
无需预先查询屏幕尺寸。复用已有 `view_id` 可避免再次遍历；按需设置 `animated: true`
和 `settle_ms`，随后检查页面及播放状态。

`objc_query_instances` 一次完成会话查找、实例枚举和具体 ivar 值读取：

```json
{"device_id":"test","bundle_id":"dev.iosdecompiler.fixture","class_name":"DecompilerFixtureViewController","field_names":["_tapCount","_button"],"max_instances":5,"limit":5}
```

已有对象时用 `object_ids` 替代 `class_name`，可批量读取不同类的对象而不扫描堆。
返回 `snapshot_id` 的后续分页不访问设备。默认最多读取前 8 个 ivar、20 个实例、每页 10 行；
Foundation 值有深度、长度和数量上限，敏感字段脱敏。不调用任意 getter/description；
此 Objective-C 查询不调用任意 getter；纯 Swift 和显式原生内存操作使用对应的高级工具。

### SwiftUI、纯 Swift 与原生操作

`ui_capture` 默认 `backend="auto"`，在 SwiftUI Hosting View 暴露公共无障碍容器时补充语义节点；
`backend="accessibility"` 读取语义树。这些节点复用快照分页及 `view_id` 租约，可执行点击和
`accessibility` 的 activate/increment/decrement/escape/scroll。文字仍需显式选择。
该方式不重建 SwiftUI 内部 View/State 图，也不全局开启 VoiceOver。

新增高级工具按需通过 `platform_tool` 加载，默认仍只展示 20 个常用工具：

| 工具 | 能力 |
| --- | --- |
| `swift_runtime` | 能力查询、指定 Mach-O `images` 的类型元数据、选定实例 getter 值、显式 Swift ABI 调用、参数追踪、ARC 释放及重置 |
| `runtime_native` | 单镜像符号过滤、已知偏移的字段读取、有界内存读写、C ABI 调用、整数/指针参数和返回值追踪 |
| `input_setup` | 检查可选 ZXTouch；从匹配的本地 deb 安装，显式 `activate=true` 会重启 SpringBoard |

```json
{"name":"swift_runtime","arguments":{"device_id":"iphone","bundle_id":"dev.fixture","action":"types","images":["MyFramework"],"kind":"classes","query":"Player","limit":5}}
```

官方 **frida-swift-bridge 3.0.2** 仍属实验阶段。本项目将其导入时的全进程扫描改为按需、
按镜像、有类型预算的加载（默认 1000）；默认镜像为主程序与 libswiftCore。能力查询不加载桥接，
后续查询复用元数据与原有 Frida 会话。`reset` 只重置 Swift 后端。
`inspect(kind="class", address=…, field_names=[…])` 只执行明确选择的 getter。
类句柄使用 Swift ARC，随对象 TTL 过期，最多 128 个；执行中的调用保护输入引用。
结构体/枚举存储为借用，只返回标量值、tag 或类型摘要，不持久保存含 ARC 字段的裸副本。
泛型、async、去符号和浮点调用约定仍可能不支持，也不自动扫描纯 Swift 堆。

C/C++ 操作要求已知 C ABI 签名，成员调用显式传入 `this` 指针；字段偏移从 IDA/调试器取得。
返回指针与临时 C 字符串均为借用，不能猜测 ABI 或把临时字符串交给异步持有的函数。

`ui_automate` 的 `swipe`、`long_press` 和 `gesture`（1–5 指轨迹，可表达捏合/旋转）
走可选 ZXTouch，通过现有 SSH 连接的回环通道通信。`input_backend="touch"` 也可将
点击/文字/滚动改为物理输入。原始坐标采用**当前朝向的屏幕 UIKit 点**；不要求采集时无需挂载 Frida。
尺寸与缩放按 SSH 连接缓存，朝向刷新；取消会尝试补齐抬指。服务确认不等于目标界面符合预期。
默认 UIKit/无障碍操作无需新增设备服务，缺失输入后端时 `input_setup` 返回组件安装提示。
不引入 VNC。按需阅读 [Swift/原生/输入 Skill 指南](skills/vesper-ios/references/swift-native-input.md)。

### 使用底层工具检查应用

解锁 iPhone，打开白名单内的应用。先以 `{"device_id":"test"}` 调用 `device_connect` 和 `device_list_apps`，再调用 `frida_attach`：

```json
{
  "device_id": "test",
  "bundle_id": "dev.iosdecompiler.fixture"
}
```

将返回的 `session_id` 用于 `ui_snapshot`：

```json
{
  "device_id": "test",
  "session_id": "process_SESSION_ID",
  "depth": 8,
  "max_nodes": 500,
  "limit": 100,
  "include_text": false
}
```

请将占位 ID 替换为实际返回值。使用 `ui_inspect_view` 可继续查看视图所属控制器和 Target-Action 映射。需要文字时显式设置 `include_text: true`。需要结束时调用 `frida_detach`。对象由快照和操作租约引用，过期或被淘汰后需重新采集；
会话还会在闲置回收、分离、进程退出或服务重启后失效。

### 读取当前应用窗口截图

附加应用后，调用 `ui_screenshot`：

```json
{
  "device_id": "test",
  "session_id": "process_SESSION_ID"
}
```

工具将已附加应用的 UIKit 窗口渲染为 PNG，默认选择 Key Window。也可以传入 `ui_get_windows` 返回的 `window_id` 指定窗口。响应同时包含原生 MCP 图片块，以及 `mime_type`、`local_path`、`bytes`、`window_id` 等结构化信息；支持图片的 MCP 客户端可直接展示。

图片保存在 `<state_dir>/screenshots/`。截图范围是所选应用可渲染的窗口；系统浮层、部分受保护内容或 GPU 渲染内容可能不会出现在图片中。

### 构建并安装按钮标题 Tweak

[UIKit 示例应用](examples/UIKitFixture/README.md)包含标识为 `fixture.button` 的按钮及 Objective-C Action。按照该指南构建、安装并打开示例应用后，调用 `develop_tweak`：

```json
{
  "device_id": "test",
  "bundle_id": "dev.iosdecompiler.fixture",
  "accessibility_identifier": "fixture.button",
  "replacement_title": "Hello vesper"
}
```

工作流检查按钮、校验实际观测到的控制器生命周期方法、生成可编辑的 Logos 项目并构建安装包。目标必须是唯一匹配的 `UIButton`，且方法签名受支持。任务默认在后台运行，通过返回的 `job_id` 调用 `job_status` 获取报告。

到达审批阶段后，由操作者在独立终端审阅具体操作。使用报告中的审批 ID 和服务实际使用的状态目录绝对路径：

```sh
.venv/bin/vesper-approve --state-dir /absolute/path/to/vesper/.vesper approval_ID
```

随后以 `workflow_id` 和已授权的 `approval_id` 再次调用 `develop_tweak` 继续执行。安装命令成功后即继续，通过 `app_restart` 用 SSH 重启 App 并重新附加 Frida；
`restart=true` 已包含此步骤。随后用 `ui_automate` 操作 App，只验证当前修改。
不要创建备份，不要追加本地测试、冒烟测试、长回归、加载模块/构建标记/UUID/安装文件哈希核对。
只有安装异常或明确怀疑旧版本时才查身份；只有实际退出等症状时才查崩溃记录。
首次关键失败就停止，修正后再测。

编译、安装、重启和支持的 App 操作都由 AI 完成，不转交用户手动操作，无需引入 VNC。
用户验收后直接完成已授权的提交和推送，不追加检查，不持续追踪普通推送的 CI。

## 项目结构

```text
vesper/
├── src/vesper/
│   ├── server.py        # MCP stdio 入口
│   ├── config.py        # 配置与校验
│   ├── core/            # 会话、状态、审批、任务和证据
│   ├── adapters/        # SSH、Frida、IDA、Mach-O 与 Theos 集成
│   ├── tools/           # 结构化 MCP 工具
│   ├── workflows/       # Tweak 开发与部署
│   └── assets/          # Frida Agent 产物及许可证声明
├── agents/frida/        # 设备端 TypeScript 源码
├── examples/            # 配置、UIKit 示例应用与 Demo
├── scripts/             # 构建和文档脚本
├── tests/
├── docs/
├── pyproject.toml
└── uv.lock
```

## 开发

App/Tweak 默认流程：

**定点定位 → 最小修改 → 必要构建 → 安装 → 针对性真机验证 → 按授权提交、推送。**

不要备份，不要增加或运行额外的本地测试、冒烟测试、长回归、批量采样和测试报告。
复用已读信息，只读取相关差异和必要行；默认只查目标控件，截图限于复现、修复后和异常节点。
没有新改动、新失败或用户明确要求，就不追加检查；用户验收后直接收尾。

Vesper 自身代码只运行与修改直接相关的最小现有测试。轻量 CI 只构建包并执行一轮部署/重启测试。

修改 Python 源码后直接更新本地 MCP：

```sh
uv sync --frozen --all-extras --no-editable --reinstall-package vesper
```

只有修改 Frida TypeScript 时才用 `npm ci --ignore-scripts && npm run build` 重新构建 Agent。
工具文档生成命令：`PYTHONPATH=src .venv/bin/python scripts/document_tools.py`。

## 安全与能力边界

- 设备和应用白名单限制访问目标。默认进行检查；安装、应用重启等影响设备的操作需要本地审批。
- 审批绑定具体操作参数和产物，具有有效期且只能使用一次。MCP 客户端不能自行授予审批。
- 工具具有操作限额、结构化错误、审计记录和清理机制。MCP 不开放任意 Shell 命令或注入 JavaScript 的入口。
- UIKit 访问、对象持有/释放和 PNG 编码均在主队列执行。对象租约会过期或被淘汰，仍保持 2048 个对象上限；共享引用及执行中的操作引用会受到保护。
- UIKit/Objective-C、SwiftUI 暴露的无障碍语义、实验性 Swift 和显式原生 ABI 分后端处理。不保证完整 Swift 元数据、SwiftUI 重建或所有泛型/async 签名。
- 运行时与静态地址关联要求镜像身份、架构及段范围证据匹配。推断类型与伪代码会明确标记。

请妥善保管本地配置、密钥、状态数据库、追踪记录和截图。审批与回滚行为见[安全与恢复](docs/SECURITY.md)。

## 文档

| 指南 | 内容 |
| --- | --- |
| [客户端配置](docs/CLIENTS.md) | 通过 stdio 连接 MCP 客户端 |
| [工具参考](docs/TOOLS.md) | 工具分类、必填参数与行为 |
| [自动化与实例参数](docs/AUTOMATION.md) | UIKit/SwiftUI 操作、实例值与输入后端 |
| [砸壳与分析流程](docs/DECRYPTION.md) | Mach-O 导出、头文件与可选静态分析 |
| [Agent Skill](skills/vesper-ios/SKILL.md) | 按需加载检查、分析、调试和 Tweak 工作流 |
| [UIKit 示例应用](examples/UIKitFixture/README.md) | 构建示例应用并运行完整 Demo |
| [安全与恢复](docs/SECURITY.md) | 权限、审批范围和故障恢复 |
| [故障排查](docs/TROUBLESHOOTING.md) | 设备、Frida、IDA 与构建诊断 |
| [上游项目调研](docs/EXISTING_PROJECTS.md) | 复用决策、兼容性与许可证 |
| [第三方声明](THIRD_PARTY_NOTICES.md) | 打包代码和外部依赖的许可证 |

## 参与贡献

欢迎提交 Issue 和 Pull Request。反馈问题时，请附上相关主机、iOS、越狱环境、Frida 和工具链版本，并移除敏感信息。保持修改聚焦，只做最小相关检查；用户可见行为变化时同步更新中英文 README，新增工具时更新生成的工具文档。

## 友情链接

- [LINUX DO](https://linux.do/)

## 许可证

vesper 原创代码使用 [MIT 许可证](LICENSE)。打包代码和各项依赖保留各自许可证，详见[第三方声明](THIRD_PARTY_NOTICES.md)。

项目基于 [Frida](https://frida.re/)、[Theos](https://theos.dev/) 和 [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)，界面与运行时检查思路参考 [FLEX](https://github.com/FLEXTool/FLEX)。
