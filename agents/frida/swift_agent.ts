// Loaded only by swift_runtime; normal UI sessions never initialize Swift's registry.
import Swift from "frida-swift-bridge";
import ObjC from "frida-objc-bridge";
import { TargetMetadata } from "frida-swift-bridge/dist/abi/metadata.js";
import * as MachO from "frida-swift-bridge/dist/lib/macho.js";
import { Class, Struct, Enum, Protocol } from "frida-swift-bridge/dist/lib/types.js";

type Args = Record<string, any>;
type Ref = { value: any; expires: number; uses: number };
const refs = new Map<string, Ref>(), hooks = new Map<string, InvocationListener>();
let session = "", serial = 0, ttl = 60000, disposing = false;
let timer: ReturnType<typeof setInterval> | null = null;
let sweepPending = false;
let scope: string[] = [];
const typeCache = new Map<string, any>();
let arc: { retain: (p: NativePointer) => NativePointer; release: (p: NativePointer) => void } | null = null;
function ownership() {
  if (!arc) {
    const module = Process.getModuleByName("libswiftCore.dylib");
    arc = { retain: new NativeFunction(module.getExportByName("swift_retain"), "pointer", ["pointer"]),
      release: new NativeFunction(module.getExportByName("swift_release"), "void", ["pointer"]) };
  }
  return arc!;
}
const main = <T>(work: () => T): Promise<T> => new Promise((resolve, reject) => {
  const run = () => { try { resolve(work()); } catch (error) { reject(error); } };
  if (ObjC.available) ObjC.schedule(ObjC.mainQueue, run); else run();
});
function pointer(address: string, executable = false): NativePointer {
  const p = ptr(address), range = Process.findRangeByAddress(p.strip());
  const readableData = !executable && !range && !p.isNull() && p.readVolatile(1) !== null;
  if (p.isNull() || !(range?.protection.includes(executable ? "x" : "r") || readableData)) throw new Error("Address is not mapped with the required protection");
  return p;
}
function object(id: string): any {
  const ref = refs.get(id);
  if (!ref || ref.expires <= Date.now() && !ref.uses) throw new Error("Swift object handle expired; observe a fresh address");
  ref.expires = Date.now() + ttl; return ref.value;
}
function sweep(all = false): void {
  for (const [id, ref] of refs) if (all || !ref.uses && ref.expires <= Date.now()) {
    ownership().release(ref.value.handle); refs.delete(id);
  }
}
function retain(value: any): string {
  for (const [id, ref] of refs) if (ref.value.handle.equals(value.handle)) { ref.expires = Date.now() + ttl; return id; }
  if (refs.size >= 128) throw new Error("Swift handle limit reached; release handles or wait for expiry");
  const id = session + ".swift." + (++serial);
  ownership().retain(value.handle); refs.set(id, { value, expires: Date.now() + ttl, uses: 0 }); return id;
}
function summary(value: any, keep = true): any {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value ?? null;
  if (typeof value === "string") return value.slice(0, 512);
  if (value.$metadata && value.handle) {
    const type = value.$metadata.getFullTypeName(), p = value.handle;
    const scalar: Record<string, () => any> = {
      "Swift.Bool": () => !!p.readU8(), "Swift.Int": () => p.readS64().toString(), "Swift.UInt": () => p.readU64().toString(),
      "Swift.Int8": () => p.readS8(), "Swift.UInt8": () => p.readU8(), "Swift.Int16": () => p.readS16(), "Swift.UInt16": () => p.readU16(),
      "Swift.Int32": () => p.readS32(), "Swift.UInt32": () => p.readU32(), "Swift.Int64": () => p.readS64().toString(), "Swift.UInt64": () => p.readU64().toString(),
      "Swift.Float": () => p.readFloat(), "Swift.Double": () => p.readDouble(),
    };
    if (scalar[type]) return { type_name: type, value: scalar[type]() };
    if (value instanceof Swift.Object) return { type_name: type, address: p.toString(),
      ...(keep ? { object_id: retain(value), expires_in_ms: ttl } : { borrowed: true }) };
    // Struct/enum storage returned by the bridge is borrowed. Never expose a
    // reusable handle to that storage, or retain a raw copy containing ARC values.
    return { type_name: type, kind: value instanceof Swift.Enum ? "enum" : "struct", borrowed: true,
      ...(value instanceof Swift.Enum ? { tag: value.$tag } : {}) };
  }
  return String(value).slice(0, 512);
}
function type(name: string): any {
  if (["void", "pointer", "bool", "int", "uint", "int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "long", "ulong"].includes(name)) return name;
  // Floating point Swift calls and generic specializations are not implemented
  // by this bridge. Reject rather than silently selecting the wrong registers.
  if (["float", "double", "Swift.Float", "Swift.Double"].includes(name) || /[<>]/.test(name)) throw new Error("This Swift ABI signature is unsupported; use LLDB/IDA to resolve a supported specialization");
  if (typeCache.has(name)) return typeCache.get(name);
  const matches = MachO.getAllFullTypeData().filter(d => d.descriptor.getFullTypeName() === name || d.descriptor.name === name);
  if (matches.length > 1) throw new Error("Ambiguous Swift type; use the module-qualified name");
  let found: any;
  if (matches.length) {
    const item = matches[0], kind = item.descriptor.getKind();
    found = kind === 16 ? new Class(item.descriptor as any, {}) : kind === 17 ? new Struct(item.descriptor as any, {}) : new Enum(item.descriptor as any, {});
  } else {
    const protocol = MachO.getAllProtocolDescriptors().find(d => d.getFullProtocolName() === name || d.name === name);
    if (protocol) found = new Protocol(protocol);
  }
  if (!found) throw new Error("Unknown Swift type in selected images: " + name);
  typeCache.set(name, found); return found;
}
function value(raw: any, declared: any): any {
  if (raw && typeof raw === "object") {
    if (raw.object_id) {
      const held = object(raw.object_id);
      return declared.kind === "Class" && !(held instanceof Swift.Object) ? new Swift.Object(held.handle) : held;
    }
    if (raw.address) {
      const p = pointer(raw.address);
      if (declared.kind === "Class") return new Swift.Object(p);
      if (declared.kind === "Struct") return new Swift.Struct(declared, { handle: p });
      if (declared.kind === "Enum") return new Swift.Enum(declared, { handle: p });
      return p;
    }
    if (raw.raw && declared.kind === "Struct") return new Swift.Struct(declared, { raw: raw.raw });
    throw new Error("Argument requires object_id, address or raw struct words");
  }
  if (typeof declared !== "string") throw new Error("Swift values require a typed object/address/raw argument");
  if (declared === "pointer") return ptr(raw);
  return raw;
}
function types(args: Args): Args {
  const kinds = args.kind === "all" ? ["classes", "structs", "enums", "protocols"] : [args.kind];
  const items: Args[] = [];
  let total = 0;
  const entries: Args[] = MachO.getAllFullTypeData().map(d => ({ descriptor: d.descriptor,
    kind: ({16: "classes", 17: "structs", 18: "enums"} as Args)[d.descriptor.getKind()] }));
  if (kinds.includes("protocols")) entries.push(...MachO.getAllProtocolDescriptors().map(d => ({ descriptor: d, kind: "protocols" })));
  for (const { descriptor, kind } of entries) {
    if (!kinds.includes(kind)) continue;
    const module = descriptor.getModuleContext().name;
    const name = kind === "protocols" ? descriptor.getFullProtocolName() : descriptor.getFullTypeName();
    if (args.module && module !== args.module || args.query && !name.toLowerCase().includes(args.query.toLowerCase())) continue;
    if (total++ < args.offset || items.length >= args.limit) continue;
    const row: Args = { name, module, kind };
    if (args.detail) {
      const entry = type(name);
      row.fields = (entry.$fields || []).slice(0, args.member_limit);
      row.methods = (entry.$methods || []).slice(0, args.member_limit).map((m: Args) => ({ name: m.name, kind: m.type, address: m.address.toString() }));
      row.members_truncated = (entry.$fields?.length || 0) > args.member_limit || (entry.$methods?.length || 0) > args.member_limit;
    }
    items.push(row);
  }
  return { items, total, next_offset: args.offset + items.length < total ? args.offset + items.length : null,
    scope: (MachO as any).vesperScope() };
}
function inspect(args: Args): Args {
  const held = args.object_id ? object(args.object_id) : null;
  const p = held?.handle || pointer(args.address);
  let instance: any = held, metadata: any;
  if (args.kind === "struct" || args.kind === "enum") {
    const declared = type(args.type_name);
    if (declared.kind !== (args.kind === "struct" ? "Struct" : "Enum")) throw new Error("Declared type kind does not match storage");
    instance = args.kind === "struct" ? new Swift.Struct(declared, { handle: p }) : new Swift.Enum(declared, { handle: p });
    metadata = instance.$metadata;
  } else {
    metadata = held?.$metadata || TargetMetadata.from(pointer(p.readPointer().strip().toString()));
    if (!metadata.isClassObject()) throw new Error("Address is not a Swift class instance");
  }
  const result: Args = { type_name: metadata.getFullTypeName(), address: p.toString(), observed: true };
  if (args.field_names.length) {
    if (args.kind !== "class") throw new Error("Struct/enum accessor calls require an explicit typed function signature");
    // Accessors can execute app code. Construct the bridge wrapper only when
    // explicitly requested; metadata-only inspection does not run getters.
    if (!(instance instanceof Swift.Object)) instance = new Swift.Object(p);
    result.values = {};
    for (const name of args.field_names) {
      const getter = Object.getOwnPropertyDescriptor(instance, name)?.get;
      try { result.values[name] = getter ? summary(getter.call(instance)) : { unavailable: "No supported Swift getter; use a typed call or LLDB locals" }; }
      catch (error) { result.values[name] = { unavailable: String(error).slice(0, 256) }; }
    }
  }
  if (args.keep_reference && args.kind === "class") {
    // A minimal wrapper is enough for ARC ownership and avoids parsing methods.
    result.object_id = retain(instance || { handle: p, $metadata: metadata });
    result.expires_in_ms = ttl;
  }
  if (args.max_bytes) {
    const size = args.kind === "class" ? args.max_bytes : Math.min(args.max_bytes, metadata.getTypeLayout().size);
    const data = p.readByteArray(size);
    result.bytes_hex = data ? Array.from(new Uint8Array(data), x => x.toString(16).padStart(2, "0")).join("") : "";
  }
  if (args.kind === "enum") result.tag = instance.$tag;
  if (args.kind !== "class") result.value = summary(instance, false);
  return result;
}
function call(args: Args): Args {
  const declared = args.argument_types.map(type);
  const context = args.context_id ? object(args.context_id).handle : args.context_address ? pointer(args.context_address) : undefined;
  const fn = Swift.NativeFunction(pointer(args.address, true), type(args.return_type), declared, context, args.throws);
  return { value: summary(fn(...args.arguments.map((v: any, i: number) => value(v, declared[i])))), performed: true };
}
function trace(args: Args): Args {
  if (hooks.size >= 16) throw new Error("Swift trace limit reached; untrace an existing hook");
  const hookId = session + ".swift_hook." + (++serial);
  let count = 0, last = 0;
  const listener = Swift.Interceptor.attach(pointer(args.address, true), {
    onEnter(values) {
      const now = Date.now();
      if (disposing || count >= args.max_events || now - last < 1000 / args.rate_limit) return;
      last = now; count++;
      try { send({ type: "swift_call", hook_id: hookId, thread_id: this.threadId,
        arguments: values.slice(0, args.max_arguments).map(v => summary(v, args.capture_references)) }); }
      catch (error) { send({ type: "swift_trace_error", hook_id: hookId, error: String(error).slice(0, 256) }); }
    },
  });
  hooks.set(hookId, listener); return { hook_id: hookId, active: true };
}
rpc.exports = {
  async dispatch(name: string, args: Args) {
    const protectedRefs: Ref[] = [];
    try {
      if (name === "initialize") {
        session = args.session_id; ttl = args.ttl * 1000;
        scope = args.images?.length ? args.images : [Process.mainModule.name, "libswiftCore.dylib"];
        (MachO as any).configureVesperImages(scope, args.max_types);
        timer = setInterval(() => {
          if (!refs.size || sweepPending || disposing) return;
          sweepPending = true; main(() => sweep()).catch(() => {}).finally(() => { sweepPending = false; });
        }, 1000);
        return { initialized: true };
      }
      if (name === "dispose") {
        disposing = true; if (timer) clearInterval(timer);
        for (const hook of hooks.values()) hook.detach(); hooks.clear();
        await main(() => sweep(true)); return { disposed: true };
      }
      if (!session || disposing) throw new Error("Swift session is unavailable");
      if (args.images?.length && JSON.stringify(args.images) !== JSON.stringify(scope)) throw new Error("Swift images are fixed for this backend; action=reset before changing scope");
      if (!Process.findModuleByName("libswiftCore.dylib") || Process.arch !== "arm64" || Process.platform !== "darwin") throw new Error("Swift runtime unavailable; use Objective-C/runtime_native or static IDA analysis");
      for (const id of [args.object_id, args.context_id, ...(args.arguments || []).map((a: Args) => a?.object_id)].filter(Boolean)) {
        const ref = refs.get(id); if (ref && ref.expires > Date.now()) { ref.uses++; protectedRefs.push(ref); }
        else throw new Error("Swift object handle expired; observe a fresh address");
      }
      if (args.action === "types") return types(args);
      if (args.action === "untrace") {
        const hook = hooks.get(args.hook_id); if (!hook) throw new Error("Unknown Swift hook");
        hook.detach(); hooks.delete(args.hook_id); return { hook_id: args.hook_id, active: false };
      }
      if (args.action === "release") {
        for (const id of args.object_ids) { const ref = refs.get(id); if (ref) ref.expires = 0; }
        await main(() => sweep()); return { retained_objects: refs.size };
      }
      const work = () => {
        if (args.action === "inspect") return inspect(args);
        if (args.action === "call") return call(args);
        if (args.action === "trace") return trace(args);
        throw new Error("Unknown Swift action");
      };
      return args.main_thread ? await main(work) : work();
    } catch (error) { return { agent_error: error instanceof Error ? error.message : String(error), code: "SWIFT_ERROR" }; }
    finally { for (const ref of protectedRefs) { ref.uses--; ref.expires = Date.now() + ttl; } }
  },
};
