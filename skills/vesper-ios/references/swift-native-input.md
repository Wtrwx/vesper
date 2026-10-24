# Swift, native code and input routing

Load only the required advanced schema with `platform_tool(name=…, action="schema")`.
Keep the configured Frida deployment and reuse its app session. Do not add VNC.

## Select the smallest useful backend

- UIKit or `@objc` Swift: existing `ui_capture`, `ui_automate`, `objc_query_instances`.
- SwiftUI: default capture `backend="auto"` supplements hosting views with public
  accessibility containers. Use `backend="accessibility"` for a semantic tree.
  These nodes use the same leased `view_id` and immutable snapshot pagination.
  Text remains explicit. `accessibility` steps support `activate`, `increment`,
  `decrement`, `escape`, and `scroll`. Availability depends on what the app exposes;
  a semantic tree does not reconstruct SwiftUI's internal view/state graph.
- Pure Swift: `swift_runtime`, described below. Do not scan the Objective-C heap
  and assume that it includes all Swift classes or value types.
- C/C++: `runtime_native`, with observed symbols or IDA-derived offsets/signatures.
- Gesture recognizers or physical input: `swipe`, `long_press` or `gesture` in
  `ui_automate`; these use the optional SSH input backend. Set `input_backend="touch"`
  to route `tap`/`scroll`/`input_text` physically. Other steps keep their semantic backend.

Never retry a mutation after an uncertain timeout. Observe the relevant target
before deciding what to do. Stop at the first failed step; no automatic post-capture
runs for a failed batch.

## Swift

`swift_runtime(action="capabilities")` checks runtime presence without loading the
bridge. `types` lazily loads the patched official frida-swift-bridge 3.0.2 on the
same Frida session, with a bounded image scope. Start with one relevant Mach-O
image name in `images`, a narrow `query`, `limit=5` and `detail=false`. Swift's
logical `module` filter and Mach-O `images` are different names. No whole-process
import-time or protocol-conformance scan runs.

```json
{"name":"swift_runtime","arguments":{"device_id":"test","bundle_id":"dev.fixture","action":"types","images":["MyFramework"],"kind":"classes","query":"Player","limit":5}}
```

Use an observed address from a hook/debugger for `inspect(kind="class", address=…)`.
Pass `field_names` only for the getters needed now; getters execute app code.
`keep_reference=true` gives an ARC-managed handle (maximum 128, configured object
TTL), and `release(object_ids=[…])` releases it. Expiry, reset and session closure
release references on the main queue. Active calls protect their inputs.

For `struct`/`enum` storage, supply `type_name`; scalar values are decoded, enums
return their tag, and other values remain a bounded type summary. Value storage is
borrowed: there is no persistent handle or automatic deep copy of ARC fields.
`max_bytes` is an explicit, optional raw read, capped at 512 bytes.

`call` requires a function address, `argument_types`, equally sized `arguments`,
`return_type` and, for instance methods, the known `context_id`/`context_address`.
Swift arguments can use `object_id`, typed `address`, or `raw` struct words.
`trace` sends bounded typed arguments to `frida_get_events`; use `untrace` when done.
Image scope/type budget are fixed at first load; `reset` releases Swift hooks and
handles, then allows a new scope without detaching the parent Frida session.

This bridge is experimental, arm64 Darwin Swift 5+. Do not guess generic, async,
stripped, protocol-witness or floating-point calling conventions. Unsupported
signatures require LLDB, native registers, or IDA analysis before a typed call.

## Native C/C++

`runtime_native(action="symbols", module=…, query=…, limit=5)` queries one image;
private symbols require `include_private=true`. `inspect` takes an observed base
address and selected `fields=[{name, offset, type}]`. `read`/`write` are explicit
bounded byte operations; they do not change page protections. No automatic getter,
object description or pointer-graph traversal runs.

`call` uses an explicit C ABI signature and address or `module` + `symbol`. Supply
C++ `this` as the first pointer argument after confirming the member ABI. Pointer
arguments accept an address or `{utf8:"…"}`; temporary C strings live only through
the synchronous call and cannot be retained by the callee. Return pointers are
borrowed. Native traces support integer/pointer arguments/returns; floating-point
register traces require LLDB. Keep `main_thread=true` for UIKit-related functions.

## Physical input

ZXTouch is an optional external component. `input_setup(action="check")` returns
installation hints when its loopback port is unavailable. Only when physical
input is needed, obtain the matching RootHide/rootless deb from
[upstream releases](https://github.com/Epic0001/zxtouchrootless/releases), then use
`input_setup(action="install", package_path=…, activate=true)` to install and
restart SpringBoard. This affects the device UI; restart the target app through
SSH afterward. Installation success is enough: proceed to the requested device
action, with no package/hash/loaded-module comparison or extra test campaign.

A coordinate-only gesture with no post-capture opens one SSH channel and needs
no Frida attach. Coordinates are **oriented screen UIKit points**, not pixels;
size/scale are cached on the SSH connection and orientation is refreshed. `gesture`
accepts 1–5 finger paths for pinch/rotation/custom motion. Finger-up cleanup runs
on cancellation; a lost transport can still leave the action outcome uncertain.
Service acknowledgement confirms input processing, not the expected app result.
Use one relevant assertion or requested `after_capture` for that result. Newline,
NUL and `;;` text cannot use this line-based input protocol; use semantic text input.
