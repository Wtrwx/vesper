import { Args, state } from "./common.js";

const hooks = new Map<string, InvocationListener>();
const exportsCache = new Map<string, ModuleExportDetails[]>();
let serial = 0;
function address(value: string, permission = "r"): NativePointer {
  const p = ptr(value), range = Process.findRangeByAddress(p.strip());
  // Frida cloaks some allocations made from script/native-call contexts, so
  // absence from Process's range list is not proof of unmapped data. Volatile
  // reading validates such data addresses; writeByteArray enforces actual write
  // access. Executable calls still require an observed executable mapping.
  const cloakedData = !range && permission !== "x" && !p.isNull() && p.readVolatile(1) !== null;
  if (p.isNull() || !(range?.protection.includes(permission) || cloakedData)) throw new Error(`Native address ${p} requires ${permission}; observed ${range?.protection || "unmapped"}`);
  return p;
}
function target(args: Args): NativePointer {
  if (args.address) return address(args.address, "x");
  const module = Process.getModuleByName(args.module);
  const p = module.getExportByName(args.symbol);
  return address(p.toString(), "x");
}
function text(p: NativePointer, length: number): string | null { return p.isNull() ? null : p.readUtf8String(length); }
function scalar(p: NativePointer, type: string, length = 128): any {
  if (type === "utf8") return text(p, length);
  if (type === "pointer") return p.readPointer().toString();
  const readers: Record<string, () => any> = {
    bool: () => !!p.readU8(), int8: () => p.readS8(), uint8: () => p.readU8(), int16: () => p.readS16(), uint16: () => p.readU16(),
    int: () => p.readS32(), uint: () => p.readU32(), int32: () => p.readS32(), uint32: () => p.readU32(),
    int64: () => p.readS64().toString(), uint64: () => p.readU64().toString(),
    long: () => p.readS64().toString(), ulong: () => p.readU64().toString(),
    size_t: () => p.readU64().toString(), ssize_t: () => p.readS64().toString(), float: () => p.readFloat(), double: () => p.readDouble(),
  };
  if (!readers[type]) throw new Error("Unsupported native field type");
  return readers[type]();
}
function argument(value: any, type: string, allocated: NativePointer[]): any {
  if (value && typeof value === "object") {
    if (type !== "pointer") throw new Error("Address/UTF-8 arguments require ABI type pointer");
    if (value.utf8 != null) { const p = Memory.allocUtf8String(value.utf8); allocated.push(p); return p; }
    return ptr(value.address);
  }
  if (type === "pointer") return ptr(value);
  return value;
}
function returned(value: any): any {
  if (value == null) return null;
  return typeof value === "object" ? value.toString() : value;
}
function registerValue(p: NativePointer, type: string): any {
  if (type === "void") return null;
  if (["int", "int32"].includes(type)) return p.toInt32();
  if (["uint", "uint32"].includes(type)) return p.toUInt32();
  if (type === "bool") return !!p.toUInt32();
  if (type === "int8") return p.toInt32() << 24 >> 24;
  if (type === "int16") return p.toInt32() << 16 >> 16;
  if (type === "uint8") return p.toUInt32() & 255;
  if (type === "uint16") return p.toUInt32() & 65535;
  if (["int64", "long", "ssize_t"].includes(type)) return new Int64(p.toString()).toString();
  if (["uint64", "ulong", "size_t"].includes(type)) return new UInt64(p.toString()).toString();
  return p.toString();
}
export function run(args: Args): Args {
  if (args.action === "symbols") {
    const module = Process.getModuleByName(args.module), key = module.base.toString();
    let entries: (ModuleExportDetails | ModuleSymbolDetails)[];
    if (args.include_private) entries = module.enumerateSymbols();
    else {
      entries = exportsCache.get(key) || module.enumerateExports();
      if (entries.length <= 50000 && !exportsCache.has(key)) {
        if (exportsCache.size >= 4) exportsCache.delete(exportsCache.keys().next().value!);
        exportsCache.set(key, entries as ModuleExportDetails[]);
      }
    }
    const matches = entries.filter(s => s.type === "function" && (!args.query || s.name.toLowerCase().includes(args.query.toLowerCase())));
    return { items: matches.slice(args.offset, args.offset + args.limit).map(s => ({ name: s.name, address: s.address.toString(), module: module.name })),
      total: matches.length, next_offset: args.offset + args.limit < matches.length ? args.offset + args.limit : null };
  }
  if (args.action === "inspect") {
    const base = address(args.address), values: Args = {};
    for (const field of args.fields) {
      try { values[field.name] = scalar(base.add(field.offset), field.type, field.max_length); }
      catch (error) { values[field.name] = { unavailable: String(error).slice(0, 256) }; }
    }
    return { address: base.toString(), values, observed: true };
  }
  if (args.action === "read") {
    const p = address(args.address), data = p.readByteArray(args.max_bytes);
    return { address: p.toString(), bytes_hex: data ? Array.from(new Uint8Array(data), n => n.toString(16).padStart(2, "0")).join("") : "", observed: true };
  }
  if (args.action === "write") {
    const p = address(args.address, "w"), pairs = args.bytes_hex.match(/../g) || [];
    p.writeByteArray(pairs.map((s: string) => parseInt(s, 16)));
    return { address: p.toString(), bytes_written: pairs.length, performed: true };
  }
  if (args.action === "call") {
    const allocated: NativePointer[] = [], fn = new NativeFunction(target(args), args.return_type, args.argument_types);
    const result = (fn as (...values: any[]) => any)(...args.arguments.map((v: any, i: number) => argument(v, args.argument_types[i], allocated)));
    // Keep temporary C strings alive through completion of the synchronous call.
    const temporaryCount = allocated.length;
    return { value: returned(result), performed: true, temporary_arguments: temporaryCount };
  }
  if (args.action === "trace") {
    if (hooks.size >= 16) throw new Error("Native trace limit reached");
    if ([...args.argument_types, args.return_type].some(t => t === "float" || t === "double")) throw new Error("Floating point trace arguments require LLDB/SIMD context; no integer-register decoding is attempted");
    const id = state.session + ".native_hook." + (++serial);
    let count = 0, last = 0;
    const listener = Interceptor.attach(target(args), {
      onEnter(values) {
        const now = Date.now();
        (this as any).report = !state.disposing && count < args.max_events && now - last >= 1000 / args.rate_limit;
        if (!(this as any).report) return;
        count++; last = now;
        send({ type: "native_call", hook_id: id, thread_id: this.threadId,
          arguments: args.argument_types.map((t: string, i: number) => registerValue(values[i], t)) });
      },
      onLeave(value) {
        if ((this as any).report) send({ type: "native_return", hook_id: id, thread_id: this.threadId, value: registerValue(value, args.return_type) });
      },
    });
    hooks.set(id, listener); return { hook_id: id, active: true };
  }
  if (args.action === "untrace") {
    const hook = hooks.get(args.hook_id); if (!hook) throw new Error("Unknown native hook");
    hook.detach(); hooks.delete(args.hook_id); return { hook_id: args.hook_id, active: false };
  }
  throw new Error("Unsupported native action");
}
export function dispose(): void {
  for (const hook of hooks.values()) hook.detach(); hooks.clear(); exportsCache.clear();
}
