📦
182847 /agents/frida/swift_agent.js
✄
// node_modules/frida-swift-bridge/dist/lib/api.js
var CSTypeRef = ["pointer", "pointer"];
var cachedApi = null;
var cachedPrivateAPI = null;
function getApi() {
  if (Process.arch !== "arm64" || Process.platform !== "darwin") {
    throw new Error("Only arm64(e) Darwin is currently supported");
  }
  if (cachedApi !== null) {
    return cachedApi;
  }
  cachedApi = makeAPI([
    {
      module: "libswiftCore.dylib",
      functions: {
        swift_demangle: [
          "pointer",
          ["pointer", "size_t", "pointer", "pointer", "int32"]
        ]
      }
    }
  ]);
  const swiftAPI = makeAPI([
    {
      module: "libswiftCore.dylib",
      functions: {
        swift_allocBox: [["pointer", "pointer"], ["pointer"]]
      }
    }
  ]);
  cachedApi = Object.assign(cachedApi, swiftAPI);
  return cachedApi;
}
function getPrivateAPI() {
  if (cachedPrivateAPI !== null) {
    return cachedPrivateAPI;
  }
  Process.getModuleByName("CoreFoundation").ensureInitialized();
  if (Process.findModuleByName("CoreSymbolication") === null) {
    try {
      Module.load("/System/Library/PrivateFrameworks/CoreSymbolication.framework/CoreSymbolication");
    } catch (e) {
      Module.load("/System/Library/PrivateFrameworks/CoreSymbolication.framework/Versions/A/CoreSymbolication");
    }
  }
  cachedPrivateAPI = makeAPI([
    {
      module: "libmacho.dylib",
      functions: {
        getsectiondata: [
          "pointer",
          ["pointer", "pointer", "pointer", "pointer"]
        ]
      }
    },
    {
      module: "CoreSymbolication",
      functions: {
        CSSymbolicatorCreateWithPid: [
          CSTypeRef,
          ["int"]
        ],
        CSSymbolicatorCreateWithTask: [
          CSTypeRef,
          ["uint"]
        ],
        CSSymbolicatorGetSymbolWithAddressAtTime: [
          CSTypeRef,
          [CSTypeRef, "pointer", "uint64"]
        ],
        CSIsNull: [
          "bool",
          [CSTypeRef]
        ],
        CSSymbolGetMangledName: [
          "pointer",
          [CSTypeRef]
        ],
        CSRelease: [
          "void",
          [CSTypeRef]
        ]
      }
    },
    {
      module: "libsystem_kernel.dylib",
      functions: {
        mach_task_self: [
          "uint",
          []
        ]
      }
    }
  ]);
  return cachedPrivateAPI;
}
function makeAPI(spec) {
  const result = {};
  for (const entry of spec) {
    const module = Process.getModuleByName(entry.module);
    module.ensureInitialized();
    for (const [name, [returnType, argumentTypes]] of Object.entries(entry.functions)) {
      const impl = module.getExportByName(name);
      result[name] = new NativeFunction(impl, returnType, argumentTypes);
    }
  }
  return result;
}

// node_modules/frida-swift-bridge/dist/abi/metadatavalues.js
var TargetValueWitnessFlags_Values;
(function(TargetValueWitnessFlags_Values2) {
  TargetValueWitnessFlags_Values2[TargetValueWitnessFlags_Values2["AlignmentMask"] = 255] = "AlignmentMask";
  TargetValueWitnessFlags_Values2[TargetValueWitnessFlags_Values2["IsNonPOD"] = 65536] = "IsNonPOD";
  TargetValueWitnessFlags_Values2[TargetValueWitnessFlags_Values2["IsNonInline"] = 131072] = "IsNonInline";
  TargetValueWitnessFlags_Values2[TargetValueWitnessFlags_Values2["HasSpareBits"] = 524288] = "HasSpareBits";
  TargetValueWitnessFlags_Values2[TargetValueWitnessFlags_Values2["IsNonBitwiseTakable"] = 1048576] = "IsNonBitwiseTakable";
  TargetValueWitnessFlags_Values2[TargetValueWitnessFlags_Values2["HasEnumWitnesses"] = 2097152] = "HasEnumWitnesses";
  TargetValueWitnessFlags_Values2[TargetValueWitnessFlags_Values2["Incomplete"] = 4194304] = "Incomplete";
})(TargetValueWitnessFlags_Values || (TargetValueWitnessFlags_Values = {}));
var TargetValueWitnessFlags = class {
  data;
  constructor(data) {
    this.data = data;
  }
  get isInlineStorage() {
    return !(this.data & TargetValueWitnessFlags_Values.IsNonInline);
  }
  get isPOD() {
    return !(this.data & TargetValueWitnessFlags_Values.IsNonPOD);
  }
  get isBitwiseTakable() {
    return !(this.data & TargetValueWitnessFlags_Values.IsNonBitwiseTakable);
  }
  getAlignmentMask() {
    return this.data & TargetValueWitnessFlags_Values.AlignmentMask;
  }
};
var MetadataKind;
(function(MetadataKind2) {
  MetadataKind2[MetadataKind2["Class"] = 0] = "Class";
  MetadataKind2[MetadataKind2["Struct"] = 512] = "Struct";
  MetadataKind2[MetadataKind2["Enum"] = 513] = "Enum";
  MetadataKind2[MetadataKind2["LastEnumerated"] = 2047] = "LastEnumerated";
})(MetadataKind || (MetadataKind = {}));
function getEnumeratedMetadataKind(kind) {
  if (kind > MetadataKind.LastEnumerated) {
    return MetadataKind.Class;
  }
  return kind;
}
var ContextDescriptorKind;
(function(ContextDescriptorKind2) {
  ContextDescriptorKind2[ContextDescriptorKind2["Module"] = 0] = "Module";
  ContextDescriptorKind2[ContextDescriptorKind2["Extension"] = 1] = "Extension";
  ContextDescriptorKind2[ContextDescriptorKind2["Anonymous"] = 2] = "Anonymous";
  ContextDescriptorKind2[ContextDescriptorKind2["Protocol"] = 3] = "Protocol";
  ContextDescriptorKind2[ContextDescriptorKind2["OpaqueType"] = 4] = "OpaqueType";
  ContextDescriptorKind2[ContextDescriptorKind2["TypeFirst"] = 16] = "TypeFirst";
  ContextDescriptorKind2[ContextDescriptorKind2["Class"] = 16] = "Class";
  ContextDescriptorKind2[ContextDescriptorKind2["Struct"] = 17] = "Struct";
  ContextDescriptorKind2[ContextDescriptorKind2["Enum"] = 18] = "Enum";
})(ContextDescriptorKind || (ContextDescriptorKind = {}));
var TypeContextDescriptorFlags_Values;
(function(TypeContextDescriptorFlags_Values2) {
  TypeContextDescriptorFlags_Values2[TypeContextDescriptorFlags_Values2["MetadataInitialization"] = 0] = "MetadataInitialization";
  TypeContextDescriptorFlags_Values2[TypeContextDescriptorFlags_Values2["MetadataInitialization_width"] = 2] = "MetadataInitialization_width";
  TypeContextDescriptorFlags_Values2[TypeContextDescriptorFlags_Values2["Class_ResilientSuperclassReferenceKind"] = 9] = "Class_ResilientSuperclassReferenceKind";
  TypeContextDescriptorFlags_Values2[TypeContextDescriptorFlags_Values2["Class_HasResilientSuperclass"] = 13] = "Class_HasResilientSuperclass";
  TypeContextDescriptorFlags_Values2[TypeContextDescriptorFlags_Values2["Class_HasOverrideTable"] = 14] = "Class_HasOverrideTable";
  TypeContextDescriptorFlags_Values2[TypeContextDescriptorFlags_Values2["Class_HasVTable"] = 15] = "Class_HasVTable";
})(TypeContextDescriptorFlags_Values || (TypeContextDescriptorFlags_Values = {}));
var MetadataInitializationKind;
(function(MetadataInitializationKind2) {
  MetadataInitializationKind2[MetadataInitializationKind2["NoMetadataInitialization"] = 0] = "NoMetadataInitialization";
  MetadataInitializationKind2[MetadataInitializationKind2["SingletonMetadataInitialization"] = 1] = "SingletonMetadataInitialization";
  MetadataInitializationKind2[MetadataInitializationKind2["ForeignMetadataInitialization"] = 2] = "ForeignMetadataInitialization";
})(MetadataInitializationKind || (MetadataInitializationKind = {}));
var TypeContextDescriptorFlags = class {
  value;
  constructor(value2) {
    this.value = value2;
  }
  class_hasVTable() {
    return !!(this.value & 1 << TypeContextDescriptorFlags_Values.Class_HasVTable);
  }
  class_hasResilientSuperClass() {
    return !!(this.value & 1 << TypeContextDescriptorFlags_Values.Class_HasResilientSuperclass);
  }
  class_hasOverrideTable() {
    return !!(this.value & 1 << TypeContextDescriptorFlags_Values.Class_HasOverrideTable);
  }
  getMetadataInitialization() {
    return getField(this.value, TypeContextDescriptorFlags_Values.MetadataInitialization, TypeContextDescriptorFlags_Values.MetadataInitialization_width);
  }
  hasSingletonMetadataInitialization() {
    return this.getMetadataInitialization() === MetadataInitializationKind.SingletonMetadataInitialization;
  }
  hasForeignMetadataInitialization() {
    return this.getMetadataInitialization() === MetadataInitializationKind.ForeignMetadataInitialization;
  }
};
function getField(bits, firstBit, width) {
  return bits >>> firstBit & ~(~0 << width);
}
var MethodDescriptorKind;
(function(MethodDescriptorKind2) {
  MethodDescriptorKind2[MethodDescriptorKind2["Method"] = 0] = "Method";
  MethodDescriptorKind2[MethodDescriptorKind2["Init"] = 1] = "Init";
  MethodDescriptorKind2[MethodDescriptorKind2["Getter"] = 2] = "Getter";
  MethodDescriptorKind2[MethodDescriptorKind2["Setter"] = 3] = "Setter";
  MethodDescriptorKind2[MethodDescriptorKind2["ModifyCoroutine"] = 4] = "ModifyCoroutine";
  MethodDescriptorKind2[MethodDescriptorKind2["ReadCoroutine"] = 5] = "ReadCoroutine";
})(MethodDescriptorKind || (MethodDescriptorKind = {}));
var MethodDescriptorFlags = class _MethodDescriptorFlags {
  value;
  static KindMask = 15;
  constructor(value2) {
    this.value = value2;
  }
  getKind() {
    return this.value & _MethodDescriptorFlags.KindMask;
  }
};
var TypeReferenceKind;
(function(TypeReferenceKind2) {
  TypeReferenceKind2[TypeReferenceKind2["DirectTypeDescriptor"] = 0] = "DirectTypeDescriptor";
  TypeReferenceKind2[TypeReferenceKind2["IndirectTypeDescriptor"] = 1] = "IndirectTypeDescriptor";
  TypeReferenceKind2[TypeReferenceKind2["DirectObjCClassName"] = 2] = "DirectObjCClassName";
  TypeReferenceKind2[TypeReferenceKind2["IndirectObjCClass"] = 3] = "IndirectObjCClass";
})(TypeReferenceKind || (TypeReferenceKind = {}));
var ConformanceFlags_Value;
(function(ConformanceFlags_Value2) {
  ConformanceFlags_Value2[ConformanceFlags_Value2["TypeMetadataKindMask"] = 56] = "TypeMetadataKindMask";
  ConformanceFlags_Value2[ConformanceFlags_Value2["TypeMetadataKindShift"] = 3] = "TypeMetadataKindShift";
})(ConformanceFlags_Value || (ConformanceFlags_Value = {}));
var ProtocolClassConstraint = class {
  static Class = false;
  static Any = true;
};
var ProtocolContextDescriptorFlags_Values;
(function(ProtocolContextDescriptorFlags_Values2) {
  ProtocolContextDescriptorFlags_Values2[ProtocolContextDescriptorFlags_Values2["HasClassConstratint"] = 0] = "HasClassConstratint";
  ProtocolContextDescriptorFlags_Values2[ProtocolContextDescriptorFlags_Values2["HasClassConstratint_width"] = 1] = "HasClassConstratint_width";
})(ProtocolContextDescriptorFlags_Values || (ProtocolContextDescriptorFlags_Values = {}));
var ProtocolContextDescriptorFlags = class {
  bits;
  constructor(bits) {
    this.bits = bits;
  }
  getClassConstraint() {
    return !!(this.bits & 1 << ProtocolContextDescriptorFlags_Values.HasClassConstratint);
  }
};

// node_modules/frida-swift-bridge/dist/basic/relativepointer.js
var RelativeDirectPointer = class _RelativeDirectPointer {
  handle;
  offset;
  static sizeOf = 4;
  static From(handle2) {
    const offset = handle2.readS32();
    return offset === 0 ? null : new _RelativeDirectPointer(handle2, offset);
  }
  constructor(handle2, offset) {
    this.handle = handle2;
    this.offset = offset;
  }
  get() {
    return this.handle.add(this.offset);
  }
};
var RelativeIndirectablePointer = class _RelativeIndirectablePointer {
  handle;
  offset;
  static From(handle2) {
    const offset = handle2.readS32();
    return offset === 0 ? null : new _RelativeIndirectablePointer(handle2, offset);
  }
  constructor(handle2, offset) {
    this.handle = handle2;
    this.offset = offset;
  }
  get() {
    const address = this.handle.add(this.offset & ~1);
    if (this.offset & 1) {
      return address.readPointer();
    } else {
      return address;
    }
  }
};

// node_modules/frida-swift-bridge/dist/runtime/heapobject.js
var HeapObject = class {
  handle;
  static SIZEOF = Process.pointerSize * 2;
  metadata;
  refCounts;
  constructor(handle2) {
    this.handle = handle2;
  }
  getMetadata(c) {
    return new c(this.handle.readPointer());
  }
};
var BoxPair = class {
  object;
  buffer;
  constructor(objAndBuffer) {
    this.object = new HeapObject(objAndBuffer[0]);
    this.buffer = objAndBuffer[1];
  }
};

// node_modules/frida-swift-bridge/dist/abi/metadata.js
var TargetValueBuffer = class {
  privateData;
  constructor(privateData) {
    this.privateData = privateData;
  }
};
var TargetMetadata = class _TargetMetadata {
  handle;
  static OFFSETOF_KIND = 0;
  #kind;
  constructor(handle2) {
    this.handle = handle2;
    this.#kind = this.handle.add(_TargetMetadata.OFFSETOF_KIND).readU32();
  }
  getKind() {
    return getEnumeratedMetadataKind(this.#kind);
  }
  isClassObject() {
    return this.getKind() == MetadataKind.Class;
  }
  getValueWitnesses() {
    const kind = this.getKind();
    if (kind !== MetadataKind.Enum && kind !== MetadataKind.Struct) {
      throw new Error(`Kind does not have a VWT: ${kind}`);
    }
    const handle2 = this.handle.sub(Process.pointerSize).readPointer();
    return new TargetValueWitnessTable(handle2);
  }
  getTypeLayout() {
    const valueWitnesses = this.getValueWitnesses();
    return {
      size: valueWitnesses.size,
      stride: valueWitnesses.stride,
      flags: valueWitnesses.flags.data,
      extraInhabitantCount: valueWitnesses.extraInhabitantCount
    };
  }
  vw_initializeWithCopy(dest, src) {
    return this.getValueWitnesses().initializeWithCopy(dest, src, this.handle);
  }
  vw_getEnumTag(object2) {
    return this.getValueWitnesses().asEVWT().getEnumTag(object2);
  }
  vw_destructiveInjectEnumTag(object2, tag) {
    return this.getValueWitnesses().asEVWT().destructiveInjectEnumTag(object2, tag);
  }
  allocateBoxForExistentialIn(buffer) {
    const vwt = this.getValueWitnesses();
    if (vwt.isValueInline()) {
      return buffer.privateData;
    }
    const api2 = getApi();
    const refAndValue = new BoxPair(api2.swift_allocBox(this.handle));
    buffer.privateData.writePointer(refAndValue.object.handle);
    return refAndValue.buffer;
  }
  getFullTypeName() {
    return this.getDescription().getFullTypeName();
  }
  static from(handle2) {
    const tmp = new TargetValueMetadata(handle2);
    switch (tmp.getKind()) {
      case MetadataKind.Class:
        return new TargetClassMetadata(handle2);
      case MetadataKind.Struct:
        return new TargetStructMetadata(handle2);
      case MetadataKind.Enum:
        return new TargetEnumMetadata(handle2);
      default:
        throw new Error("Unknown metadata kind");
    }
  }
  toJSON() {
    return {
      handle: this.handle,
      name: this.getFullTypeName()
    };
  }
};
var TargetValueMetadata = class _TargetValueMetadata extends TargetMetadata {
  static OFFSETOF_DESCRIPTION = Process.pointerSize;
  #description;
  get description() {
    if (this.#description === void 0) {
      this.#description = this.handle.add(_TargetValueMetadata.OFFSETOF_DESCRIPTION).readPointer();
    }
    return this.#description;
  }
  getDescription() {
    return new TargetValueTypeDescriptor(this.description);
  }
};
var TargetClassMetadata = class _TargetClassMetadata extends TargetMetadata {
  static OFFSTETOF_DESCRIPTION = Process.pointerSize * 8;
  #description;
  get description() {
    if (this.#description === void 0) {
      this.#description = this.handle.add(_TargetClassMetadata.OFFSTETOF_DESCRIPTION).readPointer();
    }
    return this.#description;
  }
  getDescription() {
    return new TargetClassDescriptor(this.description);
  }
};
var TargetStructMetadata = class extends TargetValueMetadata {
  getDescription() {
    return new TargetStructDescriptor(this.description);
  }
};
var TargetEnumMetadata = class extends TargetValueMetadata {
  getDescription() {
    return new TargetEnumDescriptor(this.description);
  }
};
var TargetValueWitnessTable = class _TargetValueWitnessTable {
  handle;
  static OFFSETOF_INTIALIZE_WITH_COPY = 16;
  static OFFSETOF_SIZE = 64;
  static OFFSETOF_STRIDE = 72;
  static OFFSETOF_FLAGS = 80;
  static OFFSETOF_EXTRA_INHABITANT_COUNT = 84;
  initializeWithCopy;
  size;
  stride;
  flags;
  extraInhabitantCount;
  constructor(handle2) {
    this.handle = handle2;
    const ptrInitializeWithCopy = this.handle.add(_TargetValueWitnessTable.OFFSETOF_INTIALIZE_WITH_COPY).readPointer();
    const initializeWithCopy = new NativeFunction(ptrInitializeWithCopy, "pointer", ["pointer", "pointer", "pointer"]);
    this.initializeWithCopy = (dest, src, self) => {
      return initializeWithCopy(dest, src, self);
    };
    this.size = this.getSize();
    this.stride = this.getStride();
    this.flags = this.getFlags();
    this.extraInhabitantCount = this.getExtraInhabitantCount();
  }
  isValueInline() {
    return this.flags.isInlineStorage;
  }
  getSize() {
    return this.handle.add(_TargetValueWitnessTable.OFFSETOF_SIZE).readU64().toNumber();
  }
  getStride() {
    return this.handle.add(_TargetValueWitnessTable.OFFSETOF_STRIDE).readU64().toNumber();
  }
  getAlignmentMask() {
    return this.flags.getAlignmentMask();
  }
  getFlags() {
    const value2 = this.handle.add(_TargetValueWitnessTable.OFFSETOF_FLAGS).readU32();
    return new TargetValueWitnessFlags(value2);
  }
  getExtraInhabitantCount() {
    return this.handle.add(_TargetValueWitnessTable.OFFSETOF_EXTRA_INHABITANT_COUNT).readU32();
  }
  asEVWT() {
    return new EnumValueWitnessTable(this.handle);
  }
};
var EnumValueWitnessTable = class _EnumValueWitnessTable extends TargetValueWitnessTable {
  static OFFSETOF_GET_ENUM_TAG = 88;
  static OFFSETOF_DESTRUCTIVE_INJECT_ENUM_TAG = 104;
  getEnumTag;
  destructiveInjectEnumTag;
  constructor(handle2) {
    super(handle2);
    let pointer2 = this.handle.add(_EnumValueWitnessTable.OFFSETOF_GET_ENUM_TAG).readPointer();
    const getEnumTag = new NativeFunction(pointer2, "uint32", [
      "pointer",
      "pointer"
    ]);
    this.getEnumTag = (object2) => {
      return getEnumTag(object2, this.handle);
    };
    pointer2 = this.handle.add(_EnumValueWitnessTable.OFFSETOF_DESTRUCTIVE_INJECT_ENUM_TAG).readPointer();
    const destructiveInjectEnumTag = new NativeFunction(pointer2, "void", [
      "pointer",
      "uint32",
      "pointer"
    ]);
    this.destructiveInjectEnumTag = (object2, tag) => {
      return destructiveInjectEnumTag(object2, tag, this.handle);
    };
  }
};
var TargetContextDescriptor = class _TargetContextDescriptor {
  handle;
  static OFFSETOF_FLAGS = 0;
  static OFFSETOF_PARENT = 4;
  #flags;
  #parent;
  constructor(handle2) {
    this.handle = handle2;
  }
  get flags() {
    if (this.#flags != void 0) {
      return this.#flags;
    }
    const value2 = this.handle.add(_TargetContextDescriptor.OFFSETOF_FLAGS).readU32();
    return new ContextDescriptorFlags(value2);
  }
  get parent() {
    if (this.#parent !== void 0) {
      return this.#parent;
    }
    this.#parent = RelativeIndirectablePointer.From(this.handle.add(_TargetContextDescriptor.OFFSETOF_PARENT));
    return this.#parent;
  }
  isGeneric() {
    return this.flags.isGeneric();
  }
  getKind() {
    return this.flags.getKind();
  }
  getModuleContext() {
    let m2 = new TargetModuleContextDescriptor(this.parent.get());
    while (m2.flags.getKind() !== ContextDescriptorKind.Module) {
      m2 = new TargetModuleContextDescriptor(m2.parent.get());
    }
    return m2;
  }
};
var TargetModuleContextDescriptor = class _TargetModuleContextDescriptor extends TargetContextDescriptor {
  static OFFSETOF_NAME = 8;
  #name;
  get name() {
    if (this.#name !== void 0) {
      return this.#name;
    }
    const relPtr = this.handle.add(_TargetModuleContextDescriptor.OFFSETOF_NAME);
    const absPtr = RelativeDirectPointer.From(relPtr).get();
    this.#name = absPtr.readCString();
    return this.#name;
  }
};
var TargetTypeContextDescriptor = class _TargetTypeContextDescriptor extends TargetContextDescriptor {
  static OFFSETOF_NAME = 8;
  static OFFSETOF_ACCESS_FUNCTION_PTR = 12;
  static OFFSETOF_FIELDS = 16;
  #name;
  #accessFunctionPtr;
  #fields;
  getTypeContextDescriptorFlags() {
    return new TypeContextDescriptorFlags(this.flags.getKindSpecificFlags());
  }
  get name() {
    if (this.#name !== void 0) {
      return this.#name;
    }
    const namePtr = RelativeDirectPointer.From(this.handle.add(_TargetTypeContextDescriptor.OFFSETOF_NAME)).get();
    this.#name = namePtr.readUtf8String();
    return this.#name;
  }
  get accessFunctionPointer() {
    if (this.#accessFunctionPtr !== void 0) {
      return this.#accessFunctionPtr;
    }
    return RelativeDirectPointer.From(this.handle.add(_TargetTypeContextDescriptor.OFFSETOF_ACCESS_FUNCTION_PTR)).get();
  }
  get fields() {
    if (this.#fields !== void 0) {
      return this.#fields;
    }
    return RelativeDirectPointer.From(this.handle.add(_TargetTypeContextDescriptor.OFFSETOF_FIELDS));
  }
  isReflectable() {
    return this.fields !== null;
  }
  getAccessFunction() {
    return new NativeFunction(this.accessFunctionPointer, "pointer", []);
  }
  /* XXX: not in the original source */
  getFullTypeName() {
    return `${this.getModuleContext().name}.${this.name}`;
  }
};
var TargetValueTypeDescriptor = class extends TargetTypeContextDescriptor {
};
var TargetClassDescriptor = class _TargetClassDescriptor extends TargetTypeContextDescriptor {
  static OFFSETOF_TARGET_VTABLE_DESCRIPTOR_HEADER = 44;
  static OFFSETOF_METHOD_DESCRIPTORS = 52;
  hasVTable() {
    return this.getTypeContextDescriptorFlags().class_hasVTable();
  }
  hasResilientSuperClass() {
    return this.getTypeContextDescriptorFlags().class_hasResilientSuperClass();
  }
  hasOverrideTable() {
    return this.getTypeContextDescriptorFlags().class_hasOverrideTable();
  }
  hasSingletonMetadataInitialization() {
    return this.getTypeContextDescriptorFlags().hasSingletonMetadataInitialization();
  }
  hasForeignMetadataInitialization() {
    return this.getTypeContextDescriptorFlags().hasForeignMetadataInitialization();
  }
  getVTableDescriptor() {
    if (!this.hasVTable()) {
      return null;
    }
    const pointer2 = this.handle.add(_TargetClassDescriptor.OFFSETOF_TARGET_VTABLE_DESCRIPTOR_HEADER);
    const vtableHeader = new VTableDescriptorHeader(pointer2);
    return vtableHeader;
  }
  getMethodDescriptors() {
    const result = [];
    if (!this.hasVTable() || this.isGeneric() || this.hasResilientSuperClass() || this.hasOverrideTable() || this.hasSingletonMetadataInitialization() || this.hasForeignMetadataInitialization()) {
      return result;
    }
    const vtableSize = this.getVTableDescriptor().vtableSize;
    let i = this.handle.add(_TargetClassDescriptor.OFFSETOF_METHOD_DESCRIPTORS);
    const end = i.add(vtableSize * TargetMethodDescriptor.sizeof);
    for (; !i.equals(end); i = i.add(TargetMethodDescriptor.sizeof)) {
      const methodDescriptor = new TargetMethodDescriptor(i);
      if (methodDescriptor.impl === null) {
        continue;
      }
      result.push(methodDescriptor);
    }
    return result;
  }
};
var VTableDescriptorHeader = class _VTableDescriptorHeader {
  handle;
  static OFFSETOF_VTABLE_OFFSET = 0;
  static OFFSETOF_VTABLE_SIZE = 4;
  #vtableSize;
  constructor(handle2) {
    this.handle = handle2;
  }
  get vtableSize() {
    if (this.#vtableSize !== void 0) {
      return this.#vtableSize;
    }
    return this.handle.add(_VTableDescriptorHeader.OFFSETOF_VTABLE_SIZE).readU32();
  }
};
var TargetMethodDescriptor = class _TargetMethodDescriptor {
  handle;
  static OFFSETOF_FLAGS = 0;
  static OFFSETOF_IMPL = 4;
  static sizeof = 8;
  #flags;
  #impl;
  constructor(handle2) {
    this.handle = handle2;
  }
  get flags() {
    if (this.#flags !== void 0) {
      return this.#flags;
    }
    const value2 = this.handle.add(_TargetMethodDescriptor.OFFSETOF_FLAGS).readU32();
    return new MethodDescriptorFlags(value2);
  }
  get impl() {
    if (this.#impl !== void 0) {
      return this.#impl;
    }
    const pointer2 = this.handle.add(_TargetMethodDescriptor.OFFSETOF_IMPL);
    return RelativeDirectPointer.From(pointer2);
  }
};
var TargetStructDescriptor = class _TargetStructDescriptor extends TargetTypeContextDescriptor {
  static OFFSETOF_NUM_FIELDS = 24;
  static OFFSETOF_FIELD_OFFSET_VECTOR_OFFSET = 28;
  #numFields;
  #fieldOffsetVectorOffset;
  hasFieldOffsetVector() {
    return this.fieldOffsetVectorOffset !== 0;
  }
  get numFields() {
    if (this.#numFields !== void 0) {
      return this.#numFields;
    }
    return this.handle.add(_TargetStructDescriptor.OFFSETOF_NUM_FIELDS).readU32();
  }
  get fieldOffsetVectorOffset() {
    if (this.#fieldOffsetVectorOffset !== void 0) {
      return this.#fieldOffsetVectorOffset;
    }
    return this.handle.add(_TargetStructDescriptor.OFFSETOF_FIELD_OFFSET_VECTOR_OFFSET).readU32();
  }
};
var TargetEnumDescriptor = class _TargetEnumDescriptor extends TargetTypeContextDescriptor {
  static OFFSETOF_NUM_PAYLOAD_CASES_AND_PAYLOAD_SIZE_OFFSET = 20;
  static OFFSETOF_NUM_EMPTY_CASES = 24;
  #numPayloadCasesAndPayloadSizeOffset;
  #numEmptyCases;
  get numPayloadCasesAndPayloaadSizeOffset() {
    if (this.#numPayloadCasesAndPayloadSizeOffset === void 0) {
      const num = this.handle.add(_TargetEnumDescriptor.OFFSETOF_NUM_PAYLOAD_CASES_AND_PAYLOAD_SIZE_OFFSET).readU32();
      this.#numPayloadCasesAndPayloadSizeOffset = num;
    }
    return this.#numPayloadCasesAndPayloadSizeOffset;
  }
  get numEmptyCases() {
    if (this.#numEmptyCases === void 0) {
      this.#numEmptyCases = this.handle.add(_TargetEnumDescriptor.OFFSETOF_NUM_EMPTY_CASES).readU32();
    }
    return this.#numEmptyCases;
  }
  getNumPayloadCases() {
    return this.numPayloadCasesAndPayloaadSizeOffset & 16777215;
  }
  getNumEmptyCases() {
    return this.numEmptyCases;
  }
  getNumCases() {
    return this.getNumPayloadCases() + this.numEmptyCases;
  }
  /* XXX: not in the original source */
  isPayloadTag(tag) {
    return this.getNumCases() > 0 && tag < this.getNumPayloadCases();
  }
};
var TargetProtocolDescriptor = class _TargetProtocolDescriptor extends TargetContextDescriptor {
  static OFFSETOF_NAME = 8;
  static OFFSETOF_NUM_REQUIREMENTS = 16;
  #name;
  #numRequirements;
  constructor(handle2) {
    super(handle2);
  }
  get name() {
    if (this.#name === void 0) {
      const pointer2 = RelativeDirectPointer.From(this.handle.add(_TargetProtocolDescriptor.OFFSETOF_NAME)).get();
      this.#name = pointer2.readCString();
    }
    return this.#name;
  }
  get numRequirements() {
    if (this.#numRequirements === void 0) {
      const pointer2 = this.handle.add(_TargetProtocolDescriptor.OFFSETOF_NUM_REQUIREMENTS);
      this.#numRequirements = pointer2.readU32();
    }
    return this.#numRequirements;
  }
  getProtocolContextDescriptorFlags() {
    return new ProtocolContextDescriptorFlags(this.flags.getKindSpecificFlags());
  }
  getFullProtocolName() {
    return this.getModuleContext().name + "." + this.name;
  }
};
var ContextDescriptorFlags = class {
  value;
  constructor(value2) {
    this.value = value2;
  }
  getKind() {
    return this.value & 31;
  }
  isGeneric() {
    return (this.value & 128) !== 0;
  }
  getIntValue() {
    return this.value;
  }
  getKindSpecificFlags() {
    return this.value >>> 16 & 65535;
  }
};

// node_modules/frida-swift-bridge/dist/lib/symbols.js
var kCSNow = 9223372036854776e3;
var demangleCache = /* @__PURE__ */ new Map();
var cachedSymbolicator = null;
function demangledSymbolFromAddress(address) {
  const api2 = getPrivateAPI();
  const symbol = api2.CSSymbolicatorGetSymbolWithAddressAtTime(getSymbolicator(), address, kCSNow);
  if (api2.CSIsNull(symbol)) {
    return void 0;
  }
  const namePtr = api2.CSSymbolGetMangledName(symbol);
  const mangled = namePtr.readCString();
  if (mangled === null) {
    return void 0;
  }
  return tryDemangleSymbol(mangled);
}
function tryDemangleSymbol(name) {
  if (!isSwiftSymbol(name)) {
    return void 0;
  }
  const cached = demangleCache.get(name);
  if (cached !== void 0) {
    return cached;
  }
  const api2 = getApi();
  try {
    const namePtr = Memory.allocUtf8String(name);
    const demangledNamePtr = api2.swift_demangle(namePtr, name.length, ptr(0), ptr(0), 0);
    const demangled = demangledNamePtr.readUtf8String();
    demangleCache.set(name, demangled);
    return demangled;
  } catch (e) {
    return void 0;
  }
}
function isSwiftSymbol(name) {
  if (name.length == 0) {
    return false;
  }
  const prefixes = [
    "_T0",
    // Swif4 4
    "$S",
    "_$S",
    // Swift 4.xx
    "$s",
    "_$s"
    // Swift 5+
  ];
  for (const p of prefixes) {
    if (name.startsWith(p)) {
      return true;
    }
  }
  return false;
}
function parseSwiftMethodSignature(signature2) {
  const methNameAndRetTypeExp = /([a-zA-Z_]\w+)(<.+>)*\(.*\) -> ([\w.]+(?: & [\w.]+)*|\([\w.]*\))$/g;
  const argsExp = /(\w+): ([\w.]+)(?:, )*|\(([\w.]+)\)/g;
  const methNameAndTypeMatch = methNameAndRetTypeExp.exec(signature2);
  if (methNameAndTypeMatch === null) {
    throw new Error("Couldn't parse function with signature: " + signature2);
  }
  const methodName = methNameAndTypeMatch[1];
  const retTypeName = methNameAndTypeMatch[3] || "void";
  if (methodName === void 0) {
    throw new Error("Couldn't parse function with signature: " + signature2);
  }
  const argNames = [];
  const argTypeNames = [];
  let match;
  while ((match = argsExp.exec(signature2)) !== null) {
    const singleUnlabledArg = match[3];
    if (singleUnlabledArg !== void 0) {
      argNames.push("");
      argTypeNames.push(singleUnlabledArg);
    } else {
      argNames.push(match[1]);
      argTypeNames.push(match[2]);
    }
  }
  if (argNames.length !== argTypeNames.length) {
    throw new Error("Couldn't parse function with signature: " + signature2);
  }
  let jsSignature = methodName;
  if (argNames.length > 0) {
    jsSignature += "$" + argNames.join("_") + "_";
  }
  return {
    methodName,
    argNames,
    argTypeNames,
    retTypeName,
    jsSignature
  };
}
function tryParseSwiftMethodSignature(signature2) {
  try {
    return parseSwiftMethodSignature(signature2);
  } catch (e) {
    return void 0;
  }
}
function parseSwiftAccessorSignature(signature2) {
  const exp = /(\w+).(getter|setter) : ([\w.]+)$/g;
  const match = exp.exec(signature2);
  if (match === null) {
    throw new Error("Couldn't parse accessor signature " + signature2);
  }
  const accessorType = match[2];
  if (accessorType !== "getter" && accessorType !== "setter") {
    throw new Error("Couldn't parse accessor signature " + signature2);
  }
  const memberName = match[1];
  const memberTypeName = match[3];
  return {
    accessorType,
    memberName,
    memberTypeName
  };
}
function getSymbolicator() {
  if (cachedSymbolicator !== null) {
    return cachedSymbolicator;
  }
  const api2 = getPrivateAPI();
  let symbolicator = api2.CSSymbolicatorCreateWithPid(Process.id);
  if (api2.CSIsNull(symbolicator)) {
    symbolicator = api2.CSSymbolicatorCreateWithTask(api2.mach_task_self());
    if (api2.CSIsNull(symbolicator)) {
      throw new Error("Failed to create symbolicator");
    }
  }
  cachedSymbolicator = symbolicator;
  Script.bindWeak(cachedSymbolicator, releaseSymbolicator);
  return symbolicator;
}
function releaseSymbolicator() {
  getPrivateAPI().CSRelease(cachedSymbolicator);
}

// node_modules/frida-swift-bridge/dist/runtime/existentialcontainer.js
var TargetOpaqueExistentialContainer = class _TargetOpaqueExistentialContainer {
  handle;
  numWitnessTables;
  static INITIAL_SIZE = 4 * Process.pointerSize;
  static OFFSETOF = {
    buffer: 0,
    type: Process.pointerSize * 3,
    wintessTable: Process.pointerSize * 4
  };
  #buffer;
  #type;
  constructor(handle2, numWitnessTables) {
    this.handle = handle2;
    this.numWitnessTables = numWitnessTables;
  }
  static alloc(numWitnessTables) {
    const size = _TargetOpaqueExistentialContainer.INITIAL_SIZE + numWitnessTables * Process.pointerSize;
    const buf = Memory.alloc(size);
    return new _TargetOpaqueExistentialContainer(buf, numWitnessTables);
  }
  static makeFromRaw(handle2, numWitnessTables) {
    const container = new _TargetOpaqueExistentialContainer(handle2, numWitnessTables);
    const metadataPtr = handle2.add(_TargetOpaqueExistentialContainer.OFFSETOF.type).readPointer();
    const tmpMetadata = new TargetValueMetadata(metadataPtr);
    container.#type = tmpMetadata.isClassObject() ? new TargetClassMetadata(metadataPtr) : tmpMetadata;
    return container;
  }
  set type(metadata) {
    this.handle.add(_TargetOpaqueExistentialContainer.OFFSETOF.type).writePointer(metadata.handle);
    this.#type = metadata;
  }
  get buffer() {
    if (this.#buffer === void 0) {
      this.#buffer = new TargetValueBuffer(this.handle);
    }
    return this.#buffer;
  }
  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  get type() {
    return this.#type;
  }
  getWitnessTables() {
    return this.handle.add(_TargetOpaqueExistentialContainer.OFFSETOF.wintessTable);
  }
  isValueInline() {
    return this.type.getValueWitnesses().isValueInline();
  }
  projectValue() {
    const vwt = this.type.getValueWitnesses();
    if (vwt.isValueInline()) {
      return this.buffer.privateData;
    }
    const heapObject = this.buffer.privateData.readPointer();
    const alignMask = vwt.getAlignmentMask();
    const byteOffset = HeapObject.SIZEOF + alignMask & ~alignMask;
    return heapObject.add(byteOffset);
  }
  get sizeof() {
    return _TargetOpaqueExistentialContainer.INITIAL_SIZE + this.numWitnessTables * Process.pointerSize;
  }
};
var ClassExistentialContainer = class _ClassExistentialContainer {
  handle;
  numWitnessTables;
  static INITIAL_SIZE = Process.pointerSize;
  static OFFSETOF = {
    value: 0,
    witnessTables: Process.pointerSize
  };
  #value;
  constructor(handle2, numWitnessTables) {
    this.handle = handle2;
    this.numWitnessTables = numWitnessTables;
  }
  static alloc(numWitnessTables) {
    const size = _ClassExistentialContainer.INITIAL_SIZE + numWitnessTables * Process.pointerSize;
    const buf = Memory.alloc(size);
    return new _ClassExistentialContainer(buf, numWitnessTables);
  }
  static makeFromRaw(handle2, numWitnessTables) {
    const container = new _ClassExistentialContainer(handle2, numWitnessTables);
    container.#value = handle2.add(_ClassExistentialContainer.OFFSETOF.value).readPointer();
    return container;
  }
  get value() {
    return this.#value;
  }
  set value(newValue) {
    this.handle.add(_ClassExistentialContainer.OFFSETOF.value).writePointer(newValue);
    this.#value = newValue;
  }
  getWitnessTables() {
    return this.handle.add(_ClassExistentialContainer.OFFSETOF.witnessTables);
  }
  get sizeof() {
    return _ClassExistentialContainer.INITIAL_SIZE + this.numWitnessTables * Process.pointerSize;
  }
};

// node_modules/frida-swift-bridge/dist/lib/macho.js
var allModules = new ModuleMap();
var protocolDescriptorMap = {};
var fullTypeDataMap = {};
var demangledSymbols = /* @__PURE__ */ new Map();
var vesperImages = null;
var vesperBudget = 0;
var vesperParsed = false;
var vesperTruncated = false;
function configureVesperImages(names, maximum) {
  if (vesperImages !== null) throw new Error("Swift image scope is already configured; reset the backend to change it");
  vesperImages = names;
  vesperBudget = maximum;
}
function vesperScope() {
  return { images: vesperImages, truncated: vesperTruncated, remaining_budget: vesperBudget };
}
function ensureVesperRegistry() {
  if (vesperParsed) return;
  if (vesperImages === null) throw new Error("Configure Swift images before metadata discovery");
  vesperParsed = true;
  if (Process.arch !== "arm64" || Process.platform !== "darwin") return;
  for (const name of vesperImages) {
    const module = Process.getModuleByName(name);
    for (const descriptor of enumerateTypeDescriptors(module)) {
      fullTypeDataMap[descriptor.getFullTypeName()] = { descriptor, conformances: {} };
    }
    for (const descriptor of enumerateProtocolDescriptors(module)) {
      protocolDescriptorMap[descriptor.getFullProtocolName()] = descriptor;
    }
    if (vesperBudget <= 0) {
      vesperTruncated = true;
      break;
    }
  }
}
function getAllFullTypeData() {
  ensureVesperRegistry();
  return Object.values(fullTypeDataMap);
}
function untypedMetadataFor(typeName) {
  ensureVesperRegistry();
  const fullTypeData = fullTypeDataMap[typeName];
  if (fullTypeData === void 0) {
    throw new Error("Type not found: " + typeName);
  }
  if (fullTypeData.metadata !== void 0) {
    return fullTypeDataMap[typeName].metadata;
  }
  const metadataPtr = fullTypeData.descriptor.getAccessFunction().call();
  const metadata = TargetMetadata.from(metadataPtr);
  fullTypeDataMap[typeName].metadata = metadata;
  return metadata;
}
function metadataFor(typeName, c) {
  ensureVesperRegistry();
  const fullTypeData = fullTypeDataMap[typeName];
  if (fullTypeData === void 0) {
    throw new Error("Type not found: " + typeName);
  }
  if (fullTypeData.metadata !== void 0) {
    return fullTypeDataMap[typeName].metadata;
  }
  const metadataPtr = fullTypeData.descriptor.getAccessFunction().call();
  const metadata = new c(metadataPtr);
  fullTypeDataMap[typeName].metadata = metadata;
  return metadata;
}
function getProtocolConformancesFor(typeName) {
  ensureVesperRegistry();
  const fullTypeData = fullTypeDataMap[typeName];
  if (fullTypeData === void 0) {
    throw new Error("Type not found: " + typeName);
  }
  return fullTypeData.conformances;
}
function getAllProtocolDescriptors() {
  ensureVesperRegistry();
  return Object.values(protocolDescriptorMap);
}
function findProtocolDescriptor(protoName) {
  ensureVesperRegistry();
  return protocolDescriptorMap[protoName];
}
function getProtocolDescriptor(protoName) {
  ensureVesperRegistry();
  const desc = protocolDescriptorMap[protoName];
  if (desc === void 0) {
    throw new Error(`Can't find protocol descriptor for: "${protoName}"`);
  }
  return desc;
}
function enumerateTypeDescriptors(module) {
  const result = [];
  const section = getSwift5TypesSection(module);
  const nTypes = section.size / RelativeDirectPointer.sizeOf;
  for (let i = 0; i < nTypes && vesperBudget > 0; i++, vesperBudget--) {
    const record = section.vmAddress.add(i * RelativeDirectPointer.sizeOf);
    const ctxDescPtr = RelativeDirectPointer.From(record).get();
    const ctxDesc = new TargetTypeContextDescriptor(ctxDescPtr);
    if (ctxDesc.isGeneric()) {
      continue;
    }
    const kind = ctxDesc.getKind();
    let descriptor;
    switch (kind) {
      case ContextDescriptorKind.Class:
        descriptor = new TargetClassDescriptor(ctxDescPtr);
        break;
      case ContextDescriptorKind.Struct:
        descriptor = new TargetStructDescriptor(ctxDescPtr);
        break;
      case ContextDescriptorKind.Enum:
        descriptor = new TargetEnumDescriptor(ctxDescPtr);
        break;
      default:
        continue;
    }
    result.push(descriptor);
  }
  return result;
}
function enumerateProtocolDescriptors(module) {
  const result = [];
  const section = getSwift5ProtocolsSection(module);
  const numProtos = section.size / RelativeDirectPointer.sizeOf;
  for (let i = 0; i < numProtos && vesperBudget > 0; i++, vesperBudget--) {
    const record = section.vmAddress.add(i * RelativeDirectPointer.sizeOf);
    const ctxDescPtr = RelativeDirectPointer.From(record).get();
    const ctxDesc = new TargetProtocolDescriptor(ctxDescPtr);
    result.push(ctxDesc);
  }
  return result;
}
function getSwift5TypesSection(module) {
  return getMachoSection(module, "__swift5_types");
}
function getSwift5ProtocolsSection(module) {
  return getMachoSection(module, "__swift5_protos");
}
function getMachoSection(module, sectionName, segmentName = "__TEXT") {
  const machHeader = module.base;
  const segName = Memory.allocUtf8String(segmentName);
  const sectName = Memory.allocUtf8String(sectionName);
  const sizeOut = Memory.alloc(Process.pointerSize);
  const vmAddress = getPrivateAPI().getsectiondata(machHeader, segName, sectName, sizeOut);
  const size = sizeOut.readU32();
  return { vmAddress, size };
}
function findDemangledSymbol(address) {
  const module = allModules.find(address);
  if (module === null) {
    return void 0;
  }
  const rawAddr = address.toString();
  const cached = demangledSymbols.get(rawAddr);
  if (cached !== void 0) {
    return cached;
  }
  const demangled = demangledSymbolFromAddress(address);
  if (demangled === void 0) {
    return void 0;
  }
  demangledSymbols.set(rawAddr, demangled);
  return demangled;
}
function getDemangledSymbol(address) {
  const symbol = findDemangledSymbol(address);
  if (symbol === void 0) {
    throw new Error("Can't find symbol at " + address.toString());
  }
  return symbol;
}

// node_modules/frida-swift-bridge/dist/lib/buffer.js
function makeBufferFromValue(fields) {
  if (!Array.isArray(fields)) {
    fields = [fields];
  }
  const size = Process.pointerSize * fields.length;
  const buffer = Memory.alloc(size);
  for (let i = 0, offset = 0; offset < size; i++, offset += Process.pointerSize) {
    const field = fields[i];
    const target = buffer.add(offset);
    if (field instanceof NativePointer) {
      target.writePointer(field);
    } else {
      target.writeU64(field);
    }
  }
  return buffer;
}
function makeValueFromBuffer(buffer, lengthInBytes) {
  const result = [];
  for (let i = 0; i < lengthInBytes; i += 8) {
    result.push(buffer.add(i).readU64());
  }
  return result;
}
function moveValueToBuffer(fields, buffer) {
  const size = Process.pointerSize * fields.length;
  for (let i = 0, offset = 0; offset < size; i++, offset += Process.pointerSize) {
    buffer.add(offset).writeU64(fields[i]);
  }
}
function sizeInQWordsRounded(stride) {
  stride = stride < 8 ? 8 : stride;
  return stride / 8;
}

// node_modules/frida-swift-bridge/dist/lib/callingconvention.js
var MAX_LOADABLE_SIZE = Process.pointerSize * 4;
var INDRIECT_RETURN_REGISTER = "x8";
var TrampolinePool = class _TrampolinePool {
  static pages;
  static currentSlot;
  static get currentPage() {
    return _TrampolinePool.pages[_TrampolinePool.pages.length - 1];
  }
  static _initialize() {
    _TrampolinePool.pages = [Memory.alloc(Process.pageSize)];
    _TrampolinePool.currentSlot = _TrampolinePool.currentPage;
  }
  static allocateTrampoline(size) {
    if (_TrampolinePool.pages === void 0) {
      _TrampolinePool._initialize();
    }
    let currentPage = _TrampolinePool.currentPage;
    const currentPageEnd = currentPage.add(Process.pageSize);
    if (_TrampolinePool.currentSlot.add(size).compare(currentPageEnd) > 0) {
      currentPage = Memory.alloc(Process.pageSize);
      _TrampolinePool.pages.push(currentPage);
    }
    const currentSlot = _TrampolinePool.currentSlot;
    _TrampolinePool.currentSlot = _TrampolinePool.currentSlot.add(size);
    return currentSlot;
  }
};
function makeSwiftNativeFunction(address, retType2, argTypes2, context, throws) {
  const loweredArgType = argTypes2.map((ty) => lowerSemantically(ty));
  const loweredRetType = lowerSemantically(retType2);
  const swiftcallWrapper = new SwiftcallNativeFunction(address, loweredRetType, loweredArgType, context).wrapper;
  const wrapper = function(...args) {
    const actualArgs = [];
    for (const [i, arg] of args.entries()) {
      const argType = argTypes2[i];
      if (typeof argType === "string" || Array.isArray(argType)) {
        actualArgs.push(arg);
        continue;
      }
      if (argType instanceof TargetMetadata) {
        actualArgs.push(lowerPhysically(arg));
        continue;
      }
      const composition = argType;
      const typeMetadata = arg.$metadata;
      let container;
      if (!composition.isClassOnly) {
        container = TargetOpaqueExistentialContainer.alloc(composition.numProtocols);
        container.type = typeMetadata;
        if (typeMetadata.isClassObject()) {
          container.buffer.privateData.writePointer(arg.handle);
        } else {
          const box = typeMetadata.allocateBoxForExistentialIn(container.buffer);
          typeMetadata.vw_initializeWithCopy(box, arg.handle);
        }
      } else {
        container = ClassExistentialContainer.alloc(composition.numProtocols);
        container.value = arg.handle;
      }
      const base = container.getWitnessTables();
      for (const [i2, proto] of composition.protocols.entries()) {
        const typeName = typeMetadata.getFullTypeName();
        const conformance = getProtocolConformancesFor(typeName)[proto.name];
        if (conformance === void 0) {
          throw new Error(`Type ${typeName} does not conform to protocol ${proto.name}`);
        }
        const vwt = conformance.witnessTable;
        base.add(i2 * Process.pointerSize).writePointer(vwt);
      }
      actualArgs.push(lowerPhysically(container));
    }
    const retval = swiftcallWrapper(...actualArgs);
    if (typeof retType2 === "string" || Array.isArray(retType2)) {
      return retval;
    }
    if (retType2 instanceof TargetMetadata) {
      switch (retType2.getKind()) {
        case MetadataKind.Struct:
          return new StructValue(retType2, {
            raw: retval
          });
        case MetadataKind.Enum:
          return new EnumValue(retType2, {
            raw: retval
          });
        case MetadataKind.Class:
          return new ObjectInstance(retval);
        default:
          throw new Error("Unimplemented kind: " + retType2.getKind());
      }
    }
    const buf = makeBufferFromValue(retval);
    return ValueInstance.fromExistentialContainer(buf, retType2);
  };
  return Object.assign(wrapper, { address });
}
function lowerSemantically(type2) {
  if (typeof type2 === "string" || Array.isArray(type2)) {
    return type2;
  }
  if (type2 instanceof ProtocolComposition) {
    const augmented = Array(type2.numProtocols).fill("pointer");
    if (type2.isClassOnly) {
      return ["pointer", ...augmented];
    } else {
      return ["pointer", "pointer", "pointer", "pointer", ...augmented];
    }
  }
  if (type2.getKind() === MetadataKind.Class || shouldPassIndirectly(type2)) {
    return "pointer";
  }
  const layout = type2.getTypeLayout();
  let sizeInQWords = layout.stride / 8;
  sizeInQWords = sizeInQWords > 1 ? sizeInQWords : 1;
  return Array(sizeInQWords).fill("uint64");
}
function lowerPhysically(value2) {
  if (value2 instanceof ObjectInstance) {
    return value2.handle;
  } else if (value2 instanceof TargetOpaqueExistentialContainer) {
    return makeValueFromBuffer(value2.handle, value2.sizeof);
  } else if (value2 instanceof ClassExistentialContainer) {
    const container = value2;
    const lowered = [];
    for (let i = 0; i != container.sizeof; i += 8) {
      lowered.push(container.handle.add(i).readPointer());
    }
    return lowered;
  }
  if (shouldPassIndirectly(value2.$metadata)) {
    return value2.handle;
  }
  return makeValueFromBuffer(value2.handle, value2.$metadata.getTypeLayout().stride);
}
function shouldPassIndirectly(typeMetadata) {
  const vwt = typeMetadata.getValueWitnesses();
  return !vwt.flags.isBitwiseTakable;
}
var StrongQueue = class {
  #queue = {};
  #next = 0;
  get length() {
    return Object.keys(this.#queue).length - this.#next;
  }
  enqueue(item) {
    const tail = Object.keys(this.#queue).length;
    this.#queue[tail] = item;
  }
  dequeue() {
    if (Object.keys(this.#queue).length === 0) {
      return void 0;
    }
    const item = this.#queue[this.#next++];
    return item;
  }
  resetCursor() {
    this.#next = 0;
  }
  toJSON() {
    return this.#queue;
  }
};
var SwiftcallNativeFunction = class {
  #argumentBuffers;
  #resultType;
  #returnBufferSize;
  #returnBuffer;
  #extraBuffer;
  #nativeFunction;
  constructor(target, resultType, argTypes2, context, errorResult) {
    this.#argumentBuffers = new StrongQueue();
    argTypes2 = argTypes2.map((argType) => {
      if (Array.isArray(argType) && argType.length > 4) {
        const buf = Memory.alloc(Process.pointerSize * argType.length);
        this.#argumentBuffers.enqueue(buf);
        return "pointer";
      }
      return argType;
    }).flat();
    this.#resultType = resultType;
    let indirectResult;
    if (Array.isArray(resultType)) {
      this.#returnBufferSize = Process.pointerSize * resultType.length;
      this.#returnBuffer = Memory.alloc(this.#returnBufferSize);
      if (resultType.length > 4) {
        indirectResult = this.#returnBuffer;
      }
    } else if (resultType === "void") {
      this.#returnBufferSize = 0;
    } else {
      this.#returnBufferSize = Process.pointerSize;
      this.#returnBuffer = Memory.alloc(this.#returnBufferSize);
    }
    this.#extraBuffer = Memory.alloc(Process.pointerSize * 2);
    const maxPatchSize = 76;
    const trampoline = TrampolinePool.allocateTrampoline(maxPatchSize);
    Memory.patchCode(trampoline, maxPatchSize, (code2) => {
      const writer = new Arm64Writer(code2, { pc: trampoline });
      writer.putLdrRegAddress("x15", this.#extraBuffer);
      writer.putStpRegRegRegOffset("x29", "x30", "x15", 0, "post-adjust");
      if (context !== void 0) {
        writer.putLdrRegAddress("x20", context);
      }
      if (errorResult !== void 0) {
        writer.putLdrRegAddress("x21", errorResult);
      }
      if (indirectResult !== void 0) {
        writer.putLdrRegAddress("x8", indirectResult);
      }
      writer.putLdrRegAddress("x14", target);
      writer.putBlrRegNoAuth("x14");
      if (indirectResult === void 0 && this.#returnBufferSize > 0) {
        writer.putLdrRegAddress("x15", this.#returnBuffer);
        let i = 0, offset = 0;
        for (; offset < this.#returnBufferSize; i++, offset += 8) {
          const reg = `x${i}`;
          writer.putStrRegRegOffset(reg, "x15", offset);
        }
      }
      writer.putLdrRegAddress("x15", this.#extraBuffer);
      writer.putLdpRegRegRegOffset("x29", "x30", "x15", 0, "post-adjust");
      writer.putRet();
      writer.flush();
    });
    this.#nativeFunction = new NativeFunction(trampoline, "pointer", argTypes2);
  }
  wrapper = (...args) => {
    this.#argumentBuffers.resetCursor();
    args = args.map((arg) => {
      if (Array.isArray(arg) && arg.length > 4) {
        const argBuf = this.#argumentBuffers.dequeue();
        moveValueToBuffer(arg, argBuf);
        return argBuf;
      }
      return arg;
    }).flat();
    const func = this.#nativeFunction;
    func(...args);
    if (this.#returnBufferSize === 0) {
      return void 0;
    }
    const result = [];
    if (!Array.isArray(this.#resultType)) {
      return this.#returnBuffer.readValue(this.#resultType);
    }
    for (let i = 0, j = 0; i < this.#returnBufferSize; i += 8, j++) {
      const type2 = this.#resultType[j];
      result.push(this.#returnBuffer.add(i).readValue(type2));
    }
    return result;
  };
  call(...args) {
    return this.wrapper(args);
  }
};
function readValue(type2) {
  switch (type2) {
    case "pointer":
      return this.readPointer();
    case "string":
      return this.readCString();
    case "int":
      return this.readInt();
    case "uint":
      return this.readUInt();
    case "long":
      return this.readLong();
    case "ulong":
      return this.readULong();
    case "int8":
      return this.readS8();
    case "uint8":
      return this.readU8();
    case "int16":
      return this.readS16();
    case "uint16":
      return this.readU16();
    case "int32":
      return this.readS32();
    case "uint32":
      return this.readU32();
    case "int64":
      return this.readS64();
    case "uint64":
      return this.readU64();
    default:
      throw new Error(`Unimplemented type: ${type2}`);
  }
}
NativePointer.prototype.readValue = readValue;

// node_modules/frida-swift-bridge/dist/reflection/records.js
var FieldDescriptor = class _FieldDescriptor {
  handle;
  static SIZE = 16;
  static OFFSETOF_NUMFIELDS = 12;
  #numFields;
  constructor(handle2) {
    this.handle = handle2;
  }
  getFieldRecordBuffer() {
    return this.handle.add(_FieldDescriptor.SIZE);
  }
  get numFields() {
    if (this.#numFields !== void 0) {
      return this.#numFields;
    }
    this.#numFields = this.handle.add(_FieldDescriptor.OFFSETOF_NUMFIELDS).readU32();
    return this.#numFields;
  }
  getFields() {
    const result = [];
    let cursor = this.getFieldRecordBuffer();
    let record;
    for (let i = 0; i < this.numFields; i++) {
      record = new FieldRecord(cursor);
      result.push(record);
      cursor = cursor.add(FieldRecord.SIZE);
    }
    return result;
  }
};
var FieldRecord = class _FieldRecord {
  handle;
  static SIZE = 12;
  static OFFSETOF_FLAGS = 0;
  static OFFSETOF_MANGLED_TYPE_NAME = 4;
  static OFFSETOF_FIELD_NAME = 8;
  #flags;
  #mangledTypeName;
  #fieldName;
  constructor(handle2) {
    this.handle = handle2;
  }
  get flags() {
    if (this.#flags !== void 0) {
      return this.#flags;
    }
    this.#flags = this.handle.add(_FieldRecord.OFFSETOF_FLAGS).readU32();
    return this.#flags;
  }
  get mangledTypeName() {
    if (this.#mangledTypeName !== void 0) {
      return this.#mangledTypeName;
    }
    this.#mangledTypeName = RelativeDirectPointer.From(this.handle.add(_FieldRecord.OFFSETOF_MANGLED_TYPE_NAME));
    return this.#mangledTypeName;
  }
  get fieldName() {
    if (this.#fieldName !== void 0) {
      return this.#fieldName;
    }
    this.#fieldName = RelativeDirectPointer.From(this.handle.add(_FieldRecord.OFFSETOF_FIELD_NAME)).get().readUtf8String();
    return this.#fieldName;
  }
  get isIndirectCase() {
    return !!(this.flags & FieldRecordFlags.IsIndirectCase);
  }
  get isVar() {
    return !!(this.flags & FieldRecordFlags.IsVar);
  }
};
var FieldRecordFlags;
(function(FieldRecordFlags2) {
  FieldRecordFlags2[FieldRecordFlags2["IsIndirectCase"] = 1] = "IsIndirectCase";
  FieldRecordFlags2[FieldRecordFlags2["IsVar"] = 2] = "IsVar";
})(FieldRecordFlags || (FieldRecordFlags = {}));

// node_modules/frida-swift-bridge/dist/lib/types.js
var Type = class {
  kind;
  descriptor;
  $conformances;
  $name;
  $fields;
  $moduleName;
  constructor(kind, descriptor, $conformances) {
    this.kind = kind;
    this.descriptor = descriptor;
    this.$conformances = $conformances;
    this.$name = descriptor.name;
    this.$fields = getFieldsDetails(descriptor);
    this.$moduleName = descriptor.getModuleContext().name;
  }
  get $metadataPointer() {
    return this.$metadata.handle;
  }
  toJSON() {
    return {
      $fields: this.$fields,
      $conformances: Object.keys(this.$conformances)
    };
  }
};
var Class = class extends Type {
  $methods;
  constructor(descriptor, conformances) {
    super("Class", descriptor, conformances);
    this.$methods = getMethodsDetails(descriptor);
    for (const method2 of this.$methods) {
      if (method2.type === "Init") {
        const parsed = tryParseSwiftMethodSignature(method2.name);
        if (parsed === void 0) {
          continue;
        }
        Object.defineProperty(this, parsed.jsSignature, {
          configurable: true,
          get() {
            const argTypes2 = parsed.argTypeNames.map((ty) => untypedMetadataFor(ty));
            const fn = makeSwiftNativeFunction(method2.address, this.$metadata, argTypes2, this.$metadataPointer);
            Object.defineProperty(this, parsed.jsSignature, {
              configurable: true,
              value: fn
            });
            return fn;
          }
        });
      }
    }
  }
  get $metadata() {
    return metadataFor(this.descriptor.getFullTypeName(), TargetClassMetadata);
  }
  toJSON() {
    const base = super.toJSON();
    return Object.assign(base, {
      $methods: this.$methods
    });
  }
};
var Struct = class extends Type {
  constructor(descriptor, conformances) {
    super("Struct", descriptor, conformances);
  }
  get $metadata() {
    return metadataFor(this.descriptor.getFullTypeName(), TargetStructMetadata);
  }
};
var Enum = class extends Type {
  constructor(descriptor, conformances) {
    super("Enum", descriptor, conformances);
    if (this.$fields === void 0) {
      return;
    }
    for (const [i, kase] of this.$fields.entries()) {
      const caseTag = i;
      if (descriptor.isPayloadTag(caseTag)) {
        const associatedValueWrapper = (payload) => {
          if (payload === void 0) {
            throw new Error("Case requires an associated value");
          }
          const enumValue = new EnumValue(this.$metadata, {
            tag: caseTag,
            payload
          });
          return enumValue;
        };
        Object.defineProperty(this, kase.name, {
          configurable: false,
          enumerable: true,
          value: associatedValueWrapper,
          writable: false
        });
      } else {
        Object.defineProperty(this, kase.name, {
          configurable: true,
          enumerable: true,
          get: () => {
            const enumVal = new EnumValue(this.$metadata, {
              tag: caseTag
            });
            Object.defineProperty(this, kase.name, {
              value: enumVal
            });
            return enumVal;
          }
        });
      }
    }
  }
  get $metadata() {
    return metadataFor(this.descriptor.getFullTypeName(), TargetEnumMetadata);
  }
};
var Protocol = class {
  descriptor;
  name;
  numRequirements;
  isClassOnly;
  moduleName;
  constructor(descriptor) {
    this.descriptor = descriptor;
    this.name = descriptor.name;
    this.numRequirements = descriptor.numRequirements;
    this.isClassOnly = descriptor.getProtocolContextDescriptorFlags().getClassConstraint() == ProtocolClassConstraint.Class;
    this.moduleName = descriptor.getModuleContext().name;
  }
  toJSON() {
    return {
      numRequirements: this.descriptor.numRequirements,
      isClassOnly: this.isClassOnly
    };
  }
};
var ProtocolComposition = class _ProtocolComposition {
  protocols;
  numProtocols;
  isClassOnly;
  constructor(...protocols) {
    this.protocols = [...protocols];
    this.numProtocols = protocols.length;
    this.isClassOnly = false;
    for (const proto of protocols) {
      if (proto.isClassOnly) {
        this.isClassOnly = true;
        break;
      }
    }
  }
  get sizeofExistentialContainer() {
    const baseSize = this.isClassOnly ? Process.pointerSize * 1 : Process.pointerSize * 4;
    return baseSize + Process.pointerSize * this.numProtocols;
  }
  static fromSignature(sig) {
    const protos = [];
    const protoNames = sig.split("&").map((p) => p.trim());
    for (const protoName of protoNames) {
      const desc = getProtocolDescriptor(protoName);
      const proto = new Protocol(desc);
      protos.push(proto);
    }
    return new _ProtocolComposition(...protos);
  }
};
var RuntimeInstance = class {
  equals(other) {
    return this.handle.equals(other.handle);
  }
  toJSON() {
    return {
      handle: this.handle
    };
  }
  static fromAdopted(handle2, metadata) {
    if (metadata.getKind() === MetadataKind.Class) {
      return new ObjectInstance(handle2);
    } else {
      return ValueInstance.fromAdopted(handle2, metadata);
    }
  }
  static fromExistentialContainer(handle2, composition) {
    if (!composition.isClassOnly) {
      const container = TargetOpaqueExistentialContainer.makeFromRaw(handle2, composition.numProtocols);
      const typeMetadata = container.type;
      if (typeMetadata.isClassObject()) {
        return new ObjectInstance(container.buffer.privateData.readPointer());
      } else {
        const handle3 = container.projectValue();
        return ValueInstance.fromCopy(handle3, typeMetadata);
      }
    } else {
      const container = ClassExistentialContainer.makeFromRaw(handle2, composition.numProtocols);
      return new ObjectInstance(container.value);
    }
  }
};
var ValueInstance = class extends RuntimeInstance {
  $metadata;
  static fromCopy(src, metadata) {
    const dest = Memory.alloc(metadata.getTypeLayout().stride);
    metadata.vw_initializeWithCopy(dest, src);
    if (metadata.getKind() === MetadataKind.Struct) {
      return new StructValue(metadata, {
        handle: dest
      });
    } else {
      return new EnumValue(metadata, {
        handle: dest
      });
    }
  }
  static fromAdopted(handle2, metadata) {
    const kind = metadata.getKind();
    if (kind === MetadataKind.Struct) {
      return new StructValue(metadata, {
        handle: handle2
      });
    } else if (kind === MetadataKind.Enum) {
      return new EnumValue(metadata, { handle: handle2 });
    }
    throw new Error("Non-value kind: " + kind);
  }
  static fromRaw(raw, metadata) {
    const kind = metadata.getKind();
    if (kind === MetadataKind.Struct) {
      return new StructValue(metadata, { raw });
    } else if (kind === MetadataKind.Enum) {
      return new EnumValue(metadata, { raw });
    }
    throw new Error("Non-value kind: " + kind);
  }
};
var StructValue = class {
  $metadata;
  handle;
  /* TODO accept TargetMetadata */
  constructor(type2, options) {
    if (options.handle === void 0 && options.raw === void 0) {
      throw new Error("Either a handle or raw fields must be provided");
    }
    this.$metadata = type2 instanceof Struct ? type2.$metadata : type2;
    this.handle = options.handle || makeBufferFromValue(options.raw);
  }
  equals(other) {
    return this.handle.equals(other.handle);
  }
  toJSON() {
    return {
      handle: this.handle
    };
  }
};
var EnumValue = class {
  $metadata;
  handle;
  descriptor;
  #tag;
  #payload;
  constructor(type2, options) {
    this.$metadata = type2 instanceof Enum ? type2.$metadata : type2;
    this.descriptor = this.$metadata.getDescription();
    const fields = getFieldsDetails(this.descriptor);
    if (options.tag === void 0 && options.handle === void 0 && options.raw === void 0) {
      throw new Error("Either a tag, handle or raw fields must be provided");
    }
    if (options.tag !== void 0) {
      const tag = options.tag;
      const payload = options.payload;
      const stride = this.$metadata.getTypeLayout().stride;
      const size = stride < Process.pointerSize ? Process.pointerSize : stride;
      this.handle = Memory.alloc(size);
      if (tag === void 0 || tag >= this.descriptor.getNumCases()) {
        throw new Error("Invalid tag for an enum of this type");
      }
      if (this.descriptor.isPayloadTag(tag)) {
        if (payload === void 0) {
          throw new Error("Payload must be provided for this tag");
        }
        const typeName = fields[tag].typeName;
        if (payload.$metadata.getFullTypeName() !== typeName) {
          throw new Error("Payload must be of type " + typeName);
        }
        if (payload instanceof ObjectInstance) {
          this.handle.writePointer(payload.handle);
          this.#payload = payload;
        } else {
          this.#payload = ValueInstance.fromAdopted(this.handle, payload.$metadata);
          this.$metadata.vw_initializeWithCopy(this.handle, payload.handle);
        }
      }
      this.$metadata.vw_destructiveInjectEnumTag(this.handle, tag);
      this.#tag = tag;
    } else {
      this.handle = options.handle || makeBufferFromValue(options.raw);
      const tag = this.$metadata.vw_getEnumTag(this.handle);
      let payload;
      if (tag >= this.descriptor.getNumCases()) {
        throw new Error("Invalid pointer for an enum of this type");
      }
      if (this.descriptor.isPayloadTag(tag)) {
        const typeName = fields[tag].typeName;
        const typeMetadata = metadataFor(typeName, TargetValueMetadata);
        payload = RuntimeInstance.fromAdopted(this.handle, typeMetadata);
      }
      this.#tag = tag;
      this.#payload = payload;
    }
  }
  get $tag() {
    return this.#tag;
  }
  get $payload() {
    return this.#payload;
  }
  equals(e) {
    let result = false;
    if (this.$tag !== void 0 && e.$tag !== void 0) {
      result = this.$tag === e.$tag;
    }
    if (this.$payload !== void 0 && e.$payload !== void 0) {
      result &&= this.$payload.handle.equals(e.$payload.handle);
    }
    return result;
  }
  toJSON() {
    return {
      handle: this.handle,
      $tag: this.#tag,
      $payload: this.#payload
    };
  }
};
var ObjectInstance = class extends RuntimeInstance {
  handle;
  $metadata;
  #heapObject;
  constructor(handle2) {
    super();
    this.handle = handle2;
    this.#heapObject = new HeapObject(handle2);
    this.$metadata = this.#heapObject.getMetadata(TargetClassMetadata);
    const descriptor = this.$metadata.getDescription();
    for (const method2 of getMethodsDetails(descriptor)) {
      switch (method2.type) {
        case "Getter": {
          const parsed = parseSwiftAccessorSignature(method2.name);
          const memberType = untypedMetadataFor(parsed.memberTypeName);
          const getter = makeSwiftNativeFunction(method2.address, memberType, [], this.handle);
          Object.defineProperty(this, parsed.memberName, {
            configurable: true,
            enumerable: true,
            get: getter
          });
          break;
        }
        case "Setter": {
          const parsed = parseSwiftAccessorSignature(method2.name);
          const memberType = untypedMetadataFor(parsed.memberTypeName);
          const setter = makeSwiftNativeFunction(method2.address, "void", [memberType], this.handle);
          Object.defineProperty(this, parsed.memberName, {
            configurable: true,
            enumerable: true,
            set: setter
          });
          break;
        }
        case "Method": {
          const parsed = parseSwiftMethodSignature(method2.name);
          const retType2 = parsed.retTypeName === "()" ? "void" : untypedMetadataFor(parsed.retTypeName);
          const argTypes2 = parsed.argTypeNames.map((ty) => untypedMetadataFor(ty));
          const fn = makeSwiftNativeFunction(method2.address, retType2, argTypes2, this.handle);
          Object.defineProperty(this, parsed.jsSignature, {
            configurable: true,
            enumerable: true,
            value: fn
          });
          break;
        }
      }
    }
  }
};
function getFieldsDetails(descriptor) {
  const result = [];
  if (!descriptor.isReflectable()) {
    return void 0;
  }
  const fieldsDescriptor = new FieldDescriptor(descriptor.fields.get());
  if (fieldsDescriptor.numFields === 0) {
    return void 0;
  }
  const fields = fieldsDescriptor.getFields();
  for (const f2 of fields) {
    result.push({
      name: f2.fieldName,
      typeName: f2.mangledTypeName === null ? void 0 : resolveSymbolicReferences(f2.mangledTypeName.get()),
      isVar: f2.isVar
    });
  }
  return result;
}
function getMethodsDetails(descriptor) {
  const result = [];
  for (const methDesc of descriptor.getMethodDescriptors()) {
    const address = methDesc.impl.get();
    const name = findDemangledSymbol(address);
    const kind = methDesc.flags.getKind();
    let type2;
    switch (kind) {
      case MethodDescriptorKind.Init:
        type2 = "Init";
        break;
      case MethodDescriptorKind.Getter:
        type2 = "Getter";
        break;
      case MethodDescriptorKind.Setter:
        type2 = "Setter";
        break;
      case MethodDescriptorKind.ReadCoroutine:
        type2 = "ReadCoroutine";
        break;
      case MethodDescriptorKind.ModifyCoroutine:
        type2 = "ModifyCoroutine";
        break;
      case MethodDescriptorKind.Method:
        type2 = "Method";
        break;
      default:
        throw new Error(`Invalid method descriptor kind: ${kind}`);
    }
    result.push({
      address,
      name,
      type: type2
    });
  }
  return result;
}
function resolveSymbolicReferences(symbol) {
  const base = symbol;
  let end = base;
  let endValue = end.readU8();
  let contextDescriptor = null;
  while (endValue !== 0) {
    if (endValue >= 1 && endValue <= 23) {
      end = end.add(1);
      if (endValue === 1) {
        contextDescriptor = new TargetTypeContextDescriptor(RelativeDirectPointer.From(end).get());
      } else if (endValue === 2) {
        let p = RelativeDirectPointer.From(end).get().readPointer();
        p = p.and(8796093022207);
        contextDescriptor = new TargetTypeContextDescriptor(p);
      }
      break;
    } else if (endValue >= 24 && endValue <= 31) {
      throw new Error("UNIMPLEMENTED 0x18 - 0x1F");
    }
    end = end.add(1);
    endValue = end.readU8();
  }
  if (contextDescriptor !== null) {
    return contextDescriptor.name;
  }
  return tryDemangleSymbol("_$s" + symbol.readCString());
}

// node_modules/frida-swift-bridge/dist/lib/registry.js
var Registry = class _Registry {
  static sharedInstance;
  modules = {};
  classes = {};
  structs = {};
  enums = {};
  protocols = {};
  cachedTypes = {};
  static shared() {
    if (_Registry.sharedInstance === void 0) {
      _Registry.sharedInstance = new _Registry();
    }
    return _Registry.sharedInstance;
  }
  constructor() {
    for (const fullTypeData of getAllFullTypeData()) {
      const descriptor = fullTypeData.descriptor;
      const conformances = fullTypeData.conformances;
      switch (fullTypeData.descriptor.getKind()) {
        case ContextDescriptorKind.Class: {
          const klass = new Class(descriptor, conformances);
          this.classes[klass.$name] = klass;
          this.getModule(klass.$moduleName).addClass(klass);
          break;
        }
        case ContextDescriptorKind.Struct: {
          const struct = new Struct(descriptor, conformances);
          this.structs[struct.$name] = struct;
          this.getModule(struct.$moduleName).addStruct(struct);
          break;
        }
        case ContextDescriptorKind.Enum: {
          const anEnum = new Enum(descriptor, conformances);
          this.enums[anEnum.$name] = anEnum;
          this.getModule(anEnum.$moduleName).addEnum(anEnum);
          break;
        }
      }
    }
    for (const protoDesc of getAllProtocolDescriptors()) {
      const proto = new Protocol(protoDesc);
      this.protocols[protoDesc.name] = proto;
      this.getModule(proto.moduleName).addProtocol(proto);
    }
  }
  getModule(name) {
    if (name in this.modules) {
      return this.modules[name];
    }
    const module = new SwiftModule(name);
    this.modules[name] = module;
    return module;
  }
};
var SwiftModule = class {
  name;
  classes = {};
  structs = {};
  enums = {};
  protocols = {};
  constructor(name) {
    this.name = name;
  }
  addClass(klass) {
    this.classes[klass.$name] = klass;
  }
  addStruct(struct) {
    this.structs[struct.$name] = struct;
  }
  addEnum(anEnum) {
    this.enums[anEnum.$name] = anEnum;
  }
  addProtocol(protocol) {
    this.protocols[protocol.name] = protocol;
  }
  toJSON() {
    return {
      classes: Object.keys(this.classes).length,
      structs: Object.keys(this.structs).length,
      enums: Object.keys(this.enums).length,
      protocols: Object.keys(this.protocols).length
    };
  }
};

// node_modules/frida-swift-bridge/dist/lib/interceptor.js
var SwiftInterceptor;
(function(SwiftInterceptor2) {
  function attach(target, callbacks) {
    const symbol = getDemangledSymbol(target);
    const parsed = parseSwiftMethodSignature(symbol);
    let indirectRetAddr;
    const onEnter = function(args) {
      indirectRetAddr = this.context[INDRIECT_RETURN_REGISTER];
      if (callbacks.onEnter !== void 0) {
        const swiftyArgs = [];
        let argsIndex = 0;
        let currentArg;
        for (const argTypeName of parsed.argTypeNames) {
          if (isProtocolTypeName(argTypeName)) {
            const composition = ProtocolComposition.fromSignature(argTypeName);
            const size = composition.sizeofExistentialContainer;
            let buf;
            if (size <= MAX_LOADABLE_SIZE) {
              const sizeQWords = sizeInQWordsRounded(size);
              const end = argsIndex + sizeQWords;
              const raw = sliceArgs(args, argsIndex, end);
              buf = makeBufferFromValue(raw);
              argsIndex += sizeQWords;
            } else {
              buf = args[argsIndex++];
            }
            currentArg = ValueInstance.fromExistentialContainer(buf, composition);
            swiftyArgs.push(currentArg);
            continue;
          }
          const argType = untypedMetadataFor(argTypeName);
          if (argType.isClassObject()) {
            currentArg = new ObjectInstance(args[argsIndex++]);
          } else {
            const sizeQWords = sizeInQWordsRounded(argType.getTypeLayout().stride);
            const kind = argType.getKind();
            const end = argsIndex + sizeQWords;
            const raw = sliceArgs(args, argsIndex, end);
            if (kind === MetadataKind.Struct) {
              const metadata = argType;
              currentArg = new StructValue(metadata, { raw });
            } else if (kind === MetadataKind.Enum) {
              const metadata = argType;
              currentArg = new EnumValue(metadata, { raw });
            } else {
              throw new Error("Unhandled metadata kind: " + kind);
            }
            argsIndex += sizeQWords;
          }
          swiftyArgs.push(currentArg);
        }
        const swiftyOnEnter = callbacks.onEnter.bind(this);
        swiftyOnEnter(swiftyArgs);
      }
    };
    let onLeave;
    if (callbacks.onLeave !== void 0) {
      onLeave = function(retval) {
        const retTypeName = parsed.retTypeName;
        let swiftyRetval;
        if (isProtocolTypeName(retTypeName)) {
          const composition = ProtocolComposition.fromSignature(retTypeName);
          const size = composition.sizeofExistentialContainer;
          let buf;
          if (size <= MAX_LOADABLE_SIZE) {
            const sizeQWords = sizeInQWordsRounded(size);
            const raw = [];
            for (let i = 0; i != sizeQWords; i++) {
              raw.push(this.context[`x${i}`]);
            }
            buf = makeBufferFromValue(raw);
          } else {
            buf = indirectRetAddr;
          }
          swiftyRetval = ValueInstance.fromExistentialContainer(buf, composition);
        } else {
          const retType2 = untypedMetadataFor(parsed.retTypeName);
          if (retType2.isClassObject()) {
            swiftyRetval = new ObjectInstance(retval);
          } else {
            const stride = retType2.getTypeLayout().stride;
            if (stride <= MAX_LOADABLE_SIZE && !shouldPassIndirectly(retType2)) {
              const sizeQWords = sizeInQWordsRounded(retType2.getTypeLayout().stride);
              const raw = [];
              for (let i = 0; i < sizeQWords; i++) {
                raw.push(this.context[`x${i}`]);
              }
              swiftyRetval = ValueInstance.fromRaw(raw, retType2);
            } else {
              swiftyRetval = ValueInstance.fromCopy(indirectRetAddr, retType2);
            }
          }
        }
        const swiftyOnLeave = callbacks.onLeave.bind(this);
        swiftyOnLeave(swiftyRetval);
      };
    }
    return Interceptor.attach(target, {
      onEnter,
      onLeave
    });
  }
  SwiftInterceptor2.attach = attach;
})(SwiftInterceptor || (SwiftInterceptor = {}));
function isProtocolTypeName(name) {
  return name.indexOf("&") > -1 || findProtocolDescriptor(name);
}
function sliceArgs(args, start, end) {
  const result = [];
  for (let i = start; i != end; i++) {
    result.push(args[i]);
  }
  return result;
}

// node_modules/frida-swift-bridge/dist/index.js
var Runtime = class {
  #api = null;
  #initializatioError = null;
  constructor() {
  }
  // Vesper: initialize only for explicit typed operations.
  get available() {
    try {
      return this.tryInitialize();
    } catch (e) {
      return false;
    }
  }
  get api() {
    return this.#api;
  }
  get modules() {
    return Registry.shared().modules;
  }
  get classes() {
    return Registry.shared().classes;
  }
  get structs() {
    return Registry.shared().structs;
  }
  get enums() {
    return Registry.shared().enums;
  }
  get protocols() {
    return Registry.shared().protocols;
  }
  Object = ObjectInstance;
  Struct = StructValue;
  Enum = EnumValue;
  ProtocolComposition = ProtocolComposition;
  Interceptor = SwiftInterceptor;
  NativeFunction(address, retType2, argTypes2, context, throws) {
    function getNativeType(type2) {
      if (type2 instanceof Type) {
        return type2.$metadata;
      } else if (type2 instanceof Protocol) {
        return new ProtocolComposition(type2);
      }
      return type2;
    }
    const nativeRetType = getNativeType(retType2);
    const nativeArgType = argTypes2.map((ty) => getNativeType(ty));
    return makeSwiftNativeFunction(address, nativeRetType, nativeArgType, context, throws);
  }
  tryInitialize() {
    if (this.#api !== null) {
      return true;
    }
    if (this.#initializatioError !== null) {
      throw this.#initializatioError;
    }
    try {
      this.#api = getApi();
      getPrivateAPI();
      getSymbolicator();
    } catch (e) {
      this.#initializatioError = e;
      throw e;
    }
    return this.#api !== null;
  }
};
var dist_default = new Runtime();

// node_modules/frida-objc-bridge/lib/api.js
var cachedApi2 = null;
var defaultInvocationOptions = {
  exceptions: "propagate"
};
function getApi2() {
  if (cachedApi2 !== null) {
    return cachedApi2;
  }
  const temporaryApi = {};
  const pending = [
    {
      module: "libsystem_malloc.dylib",
      functions: {
        "free": ["void", ["pointer"]]
      }
    },
    {
      module: "libobjc.A.dylib",
      functions: {
        "objc_msgSend": function(address) {
          this.objc_msgSend = address;
        },
        "objc_msgSend_stret": function(address) {
          this.objc_msgSend_stret = address;
        },
        "objc_msgSend_fpret": function(address) {
          this.objc_msgSend_fpret = address;
        },
        "objc_msgSendSuper": function(address) {
          this.objc_msgSendSuper = address;
        },
        "objc_msgSendSuper_stret": function(address) {
          this.objc_msgSendSuper_stret = address;
        },
        "objc_msgSendSuper_fpret": function(address) {
          this.objc_msgSendSuper_fpret = address;
        },
        "objc_getClassList": ["int", ["pointer", "int"]],
        "objc_lookUpClass": ["pointer", ["pointer"]],
        "objc_allocateClassPair": ["pointer", ["pointer", "pointer", "pointer"]],
        "objc_disposeClassPair": ["void", ["pointer"]],
        "objc_registerClassPair": ["void", ["pointer"]],
        "class_isMetaClass": ["bool", ["pointer"]],
        "class_getName": ["pointer", ["pointer"]],
        "class_getImageName": ["pointer", ["pointer"]],
        "class_copyProtocolList": ["pointer", ["pointer", "pointer"]],
        "class_copyMethodList": ["pointer", ["pointer", "pointer"]],
        "class_getClassMethod": ["pointer", ["pointer", "pointer"]],
        "class_getInstanceMethod": ["pointer", ["pointer", "pointer"]],
        "class_getSuperclass": ["pointer", ["pointer"]],
        "class_addProtocol": ["bool", ["pointer", "pointer"]],
        "class_addMethod": ["bool", ["pointer", "pointer", "pointer", "pointer"]],
        "class_copyIvarList": ["pointer", ["pointer", "pointer"]],
        "objc_getProtocol": ["pointer", ["pointer"]],
        "objc_copyProtocolList": ["pointer", ["pointer"]],
        "objc_allocateProtocol": ["pointer", ["pointer"]],
        "objc_registerProtocol": ["void", ["pointer"]],
        "protocol_getName": ["pointer", ["pointer"]],
        "protocol_copyMethodDescriptionList": ["pointer", ["pointer", "bool", "bool", "pointer"]],
        "protocol_copyPropertyList": ["pointer", ["pointer", "pointer"]],
        "protocol_copyProtocolList": ["pointer", ["pointer", "pointer"]],
        "protocol_addProtocol": ["void", ["pointer", "pointer"]],
        "protocol_addMethodDescription": ["void", ["pointer", "pointer", "pointer", "bool", "bool"]],
        "ivar_getName": ["pointer", ["pointer"]],
        "ivar_getTypeEncoding": ["pointer", ["pointer"]],
        "ivar_getOffset": ["pointer", ["pointer"]],
        "object_isClass": ["bool", ["pointer"]],
        "object_getClass": ["pointer", ["pointer"]],
        "object_getClassName": ["pointer", ["pointer"]],
        "method_getName": ["pointer", ["pointer"]],
        "method_getTypeEncoding": ["pointer", ["pointer"]],
        "method_getImplementation": ["pointer", ["pointer"]],
        "method_setImplementation": ["pointer", ["pointer", "pointer"]],
        "property_getName": ["pointer", ["pointer"]],
        "property_copyAttributeList": ["pointer", ["pointer", "pointer"]],
        "sel_getName": ["pointer", ["pointer"]],
        "sel_registerName": ["pointer", ["pointer"]],
        "class_getInstanceSize": ["pointer", ["pointer"]]
      },
      optionals: {
        "objc_msgSend_stret": "ABI",
        "objc_msgSend_fpret": "ABI",
        "objc_msgSendSuper_stret": "ABI",
        "objc_msgSendSuper_fpret": "ABI",
        "object_isClass": "iOS8"
      }
    },
    {
      module: "libdispatch.dylib",
      functions: {
        "dispatch_async_f": ["void", ["pointer", "pointer", "pointer"]]
      },
      variables: {
        "_dispatch_main_q": function(address) {
          this._dispatch_main_q = address;
        }
      }
    }
  ];
  let remaining = 0;
  pending.forEach(function(api2) {
    const functions = api2.functions || {};
    const variables = api2.variables || {};
    const optionals = api2.optionals || {};
    remaining += Object.keys(functions).length + Object.keys(variables).length;
    const exportByName = (Process.findModuleByName(api2.module)?.enumerateExports() ?? []).reduce(function(result, exp) {
      result[exp.name] = exp;
      return result;
    }, {});
    Object.keys(functions).forEach(function(name) {
      const exp = exportByName[name];
      if (exp !== void 0 && exp.type === "function") {
        const signature2 = functions[name];
        if (typeof signature2 === "function") {
          signature2.call(temporaryApi, exp.address);
        } else {
          temporaryApi[name] = new NativeFunction(exp.address, signature2[0], signature2[1], defaultInvocationOptions);
        }
        remaining--;
      } else {
        const optional = optionals[name];
        if (optional)
          remaining--;
      }
    });
    Object.keys(variables).forEach(function(name) {
      const exp = exportByName[name];
      if (exp !== void 0 && exp.type === "variable") {
        const handler = variables[name];
        handler.call(temporaryApi, exp.address);
        remaining--;
      }
    });
  });
  if (remaining === 0) {
    if (!temporaryApi.objc_msgSend_stret)
      temporaryApi.objc_msgSend_stret = temporaryApi.objc_msgSend;
    if (!temporaryApi.objc_msgSend_fpret)
      temporaryApi.objc_msgSend_fpret = temporaryApi.objc_msgSend;
    if (!temporaryApi.objc_msgSendSuper_stret)
      temporaryApi.objc_msgSendSuper_stret = temporaryApi.objc_msgSendSuper;
    if (!temporaryApi.objc_msgSendSuper_fpret)
      temporaryApi.objc_msgSendSuper_fpret = temporaryApi.objc_msgSendSuper;
    cachedApi2 = temporaryApi;
  }
  return cachedApi2;
}

// node_modules/frida-objc-bridge/lib/fastpaths.js
var code = `#include <glib.h>
#include <ptrauth.h>

#define KERN_SUCCESS 0
#define MALLOC_PTR_IN_USE_RANGE_TYPE 1
#if defined (HAVE_I386) && GLIB_SIZEOF_VOID_P == 8
# define OBJC_ISA_MASK 0x7ffffffffff8ULL
#elif defined (HAVE_ARM64)
# define OBJC_ISA_MASK 0xffffffff8ULL
#endif

typedef struct _ChooseContext ChooseContext;

typedef struct _malloc_zone_t malloc_zone_t;
typedef struct _malloc_introspection_t malloc_introspection_t;
typedef struct _vm_range_t vm_range_t;

typedef gpointer Class;
typedef int kern_return_t;
typedef guint mach_port_t;
typedef mach_port_t task_t;
typedef guintptr vm_offset_t;
typedef guintptr vm_size_t;
typedef vm_offset_t vm_address_t;

struct _ChooseContext
{
  GHashTable * classes;
  GArray * matches;
};

struct _malloc_zone_t
{
  void * reserved1;
  void * reserved2;
  size_t (* size) (struct _malloc_zone_t * zone, const void * ptr);
  void * (* malloc) (struct _malloc_zone_t * zone, size_t size);
  void * (* calloc) (struct _malloc_zone_t * zone, size_t num_items, size_t size);
  void * (* valloc) (struct _malloc_zone_t * zone, size_t size);
  void (* free) (struct _malloc_zone_t * zone, void * ptr);
  void * (* realloc) (struct _malloc_zone_t * zone, void * ptr, size_t size);
  void (* destroy) (struct _malloc_zone_t * zone);
  const char * zone_name;

  unsigned (* batch_malloc) (struct _malloc_zone_t * zone, size_t size, void ** results, unsigned num_requested);
  void (* batch_free) (struct _malloc_zone_t * zone, void ** to_be_freed, unsigned num_to_be_freed);

  malloc_introspection_t * introspect;
};

typedef kern_return_t (* memory_reader_t) (task_t remote_task, vm_address_t remote_address, vm_size_t size, void ** local_memory);
typedef void (* vm_range_recorder_t) (task_t task, void * user_data, unsigned type, vm_range_t * ranges, unsigned count);
typedef kern_return_t (* enumerator_func) (task_t task, void * user_data, unsigned type_mask, vm_address_t zone_address, memory_reader_t reader,
      vm_range_recorder_t recorder);

struct _malloc_introspection_t
{
  enumerator_func enumerator;
};

struct _vm_range_t
{
  vm_address_t address;
  vm_size_t size;
};

extern int objc_getClassList (Class * buffer, int buffer_count);
extern Class class_getSuperclass (Class cls);
extern size_t class_getInstanceSize (Class cls);
extern kern_return_t malloc_get_all_zones (task_t task, memory_reader_t reader, vm_address_t ** addresses, unsigned * count);

static void collect_subclasses (Class klass, GHashTable * result);
static void collect_matches_in_ranges (task_t task, void * user_data, unsigned type, vm_range_t * ranges, unsigned count);
static kern_return_t read_local_memory (task_t remote_task, vm_address_t remote_address, vm_size_t size, void ** local_memory);

extern mach_port_t selfTask;

gpointer *
choose (Class * klass,
        gboolean consider_subclasses,
        guint * count)
{
  ChooseContext ctx;
  GHashTable * classes;
  vm_address_t * malloc_zone_addresses;
  unsigned malloc_zone_count, i;

  classes = g_hash_table_new_full (NULL, NULL, NULL, NULL);
  ctx.classes = classes;
  ctx.matches = g_array_new (FALSE, FALSE, sizeof (gpointer));
  if (consider_subclasses)
    collect_subclasses (klass, classes);
  else
    g_hash_table_insert (classes, klass, GSIZE_TO_POINTER (class_getInstanceSize (klass)));

  malloc_zone_count = 0;
  malloc_get_all_zones (selfTask, read_local_memory, &malloc_zone_addresses, &malloc_zone_count);

  for (i = 0; i != malloc_zone_count; i++)
  {
    vm_address_t zone_address = malloc_zone_addresses[i];
    malloc_zone_t * zone = (malloc_zone_t *) zone_address;
    enumerator_func enumerator;

    if (zone != NULL && zone->introspect != NULL &&
        (enumerator = (ptrauth_strip (zone->introspect, ptrauth_key_asda))->enumerator) != NULL)
    {
      enumerator = ptrauth_sign_unauthenticated (
          ptrauth_strip (enumerator, ptrauth_key_asia),
          ptrauth_key_asia, 0);

      enumerator (selfTask, &ctx, MALLOC_PTR_IN_USE_RANGE_TYPE, zone_address, read_local_memory,
          collect_matches_in_ranges);
    }
  }

  g_hash_table_unref (classes);

  *count = ctx.matches->len;

  return (gpointer *) g_array_free (ctx.matches, FALSE);
}

void
destroy (gpointer mem)
{
  g_free (mem);
}

static void
collect_subclasses (Class klass,
                    GHashTable * result)
{
  Class * classes;
  int buffer_count, count, i;

  buffer_count = objc_getClassList (NULL, 0);
  classes = g_malloc (buffer_count * sizeof (gpointer));
  count = objc_getClassList (classes, buffer_count);
  if (count > buffer_count)
    count = buffer_count;

  for (i = 0; i != count; i++)
  {
    Class candidate = classes[i];
    Class c;

    c = candidate;
    do
    {
      if (c == klass)
      {
        g_hash_table_insert (result, candidate, GSIZE_TO_POINTER (class_getInstanceSize (candidate)));
        break;
      }

      c = class_getSuperclass (c);
    }
    while (c != NULL);
  }

  g_free (classes);
}

static void
collect_matches_in_ranges (task_t task,
                           void * user_data,
                           unsigned type,
                           vm_range_t * ranges,
                           unsigned count)
{
  ChooseContext * ctx = user_data;
  GHashTable * classes = ctx->classes;
  unsigned i;

  for (i = 0; i != count; i++)
  {
    const vm_range_t * range = &ranges[i];
    gconstpointer candidate = GSIZE_TO_POINTER (range->address);
    gconstpointer isa;
    guint instance_size;

    isa = *(gconstpointer *) candidate;
#ifdef OBJC_ISA_MASK
    isa = GSIZE_TO_POINTER (GPOINTER_TO_SIZE (isa) & OBJC_ISA_MASK);
#endif

    instance_size = GPOINTER_TO_UINT (g_hash_table_lookup (classes, isa));
    if (instance_size != 0 && range->size >= instance_size)
    {
      g_array_append_val (ctx->matches, candidate);
    }
  }
}

static kern_return_t
read_local_memory (task_t remote_task,
                   vm_address_t remote_address,
                   vm_size_t size,
                   void ** local_memory)
{
  *local_memory = (void *) remote_address;

  return KERN_SUCCESS;
}
`;
var { pointerSize: pointerSize2 } = Process;
var cachedModule = null;
function get() {
  if (cachedModule === null)
    cachedModule = compileModule();
  return cachedModule;
}
function compileModule() {
  const {
    objc_getClassList,
    class_getSuperclass,
    class_getInstanceSize
  } = getApi2();
  const selfTask = Memory.alloc(4);
  selfTask.writeU32(Module.getGlobalExportByName("mach_task_self_").readU32());
  const cm = new CModule(code, {
    objc_getClassList,
    class_getSuperclass,
    class_getInstanceSize,
    malloc_get_all_zones: Process.getModuleByName("/usr/lib/system/libsystem_malloc.dylib").getExportByName("malloc_get_all_zones"),
    selfTask
  });
  const _choose = new NativeFunction(cm.choose, "pointer", ["pointer", "bool", "pointer"]);
  const _destroy = new NativeFunction(cm.destroy, "void", ["pointer"]);
  return {
    handle: cm,
    choose(klass, considerSubclasses) {
      const result = [];
      const countPtr = Memory.alloc(4);
      const matches = _choose(klass, considerSubclasses ? 1 : 0, countPtr);
      try {
        const count = countPtr.readU32();
        for (let i = 0; i !== count; i++)
          result.push(matches.add(i * pointerSize2).readPointer());
      } finally {
        _destroy(matches);
      }
      return result;
    }
  };
}

// node_modules/frida-objc-bridge/index.js
function Runtime2() {
  const pointerSize = Process.pointerSize;
  let api = null;
  let apiError = null;
  const realizedClasses = /* @__PURE__ */ new Set();
  const classRegistry = new ClassRegistry();
  const protocolRegistry = new ProtocolRegistry();
  const replacedMethods = /* @__PURE__ */ new Map();
  const scheduledWork = /* @__PURE__ */ new Map();
  let nextId = 1;
  let workCallback = null;
  let NSAutoreleasePool = null;
  const bindings = /* @__PURE__ */ new Map();
  let readObjectIsa = null;
  const msgSendBySignatureId = /* @__PURE__ */ new Map();
  const msgSendSuperBySignatureId = /* @__PURE__ */ new Map();
  let cachedNSString = null;
  let cachedNSStringCtor = null;
  let cachedNSNumber = null;
  let cachedNSNumberCtor = null;
  let singularTypeById = null;
  let modifiers = null;
  try {
    tryInitialize();
  } catch (e) {
  }
  function tryInitialize() {
    if (api !== null)
      return true;
    if (apiError !== null)
      throw apiError;
    try {
      api = getApi2();
    } catch (e) {
      apiError = e;
      throw e;
    }
    return api !== null;
  }
  function dispose() {
    for (const [rawMethodHandle, impls] of replacedMethods.entries()) {
      const methodHandle = ptr(rawMethodHandle);
      const [oldImp, newImp] = impls;
      if (api.method_getImplementation(methodHandle).equals(newImp))
        api.method_setImplementation(methodHandle, oldImp);
    }
    replacedMethods.clear();
  }
  Script.bindWeak(this, dispose);
  Object.defineProperty(this, "available", {
    enumerable: true,
    get() {
      return tryInitialize();
    }
  });
  Object.defineProperty(this, "api", {
    enumerable: true,
    get() {
      return getApi2();
    }
  });
  Object.defineProperty(this, "classes", {
    enumerable: true,
    value: classRegistry
  });
  Object.defineProperty(this, "protocols", {
    enumerable: true,
    value: protocolRegistry
  });
  Object.defineProperty(this, "Object", {
    enumerable: true,
    value: ObjCObject
  });
  Object.defineProperty(this, "Protocol", {
    enumerable: true,
    value: ObjCProtocol
  });
  Object.defineProperty(this, "Block", {
    enumerable: true,
    value: Block
  });
  Object.defineProperty(this, "mainQueue", {
    enumerable: true,
    get() {
      return api?._dispatch_main_q ?? null;
    }
  });
  Object.defineProperty(this, "registerProxy", {
    enumerable: true,
    value: registerProxy
  });
  Object.defineProperty(this, "registerClass", {
    enumerable: true,
    value: registerClass
  });
  Object.defineProperty(this, "registerProtocol", {
    enumerable: true,
    value: registerProtocol
  });
  Object.defineProperty(this, "bind", {
    enumerable: true,
    value: bind
  });
  Object.defineProperty(this, "unbind", {
    enumerable: true,
    value: unbind
  });
  Object.defineProperty(this, "getBoundData", {
    enumerable: true,
    value: getBoundData
  });
  Object.defineProperty(this, "enumerateLoadedClasses", {
    enumerable: true,
    value: enumerateLoadedClasses
  });
  Object.defineProperty(this, "enumerateLoadedClassesSync", {
    enumerable: true,
    value: enumerateLoadedClassesSync
  });
  Object.defineProperty(this, "choose", {
    enumerable: true,
    value: choose
  });
  Object.defineProperty(this, "chooseSync", {
    enumerable: true,
    value(specifier) {
      const instances = [];
      choose(specifier, {
        onMatch(i) {
          instances.push(i);
        },
        onComplete() {
        }
      });
      return instances;
    }
  });
  this.schedule = function(queue, work) {
    const id = ptr(nextId++);
    scheduledWork.set(id.toString(), work);
    if (workCallback === null) {
      workCallback = new NativeCallback(performScheduledWorkItem, "void", ["pointer"]);
    }
    Script.pin();
    api.dispatch_async_f(queue, id, workCallback);
  };
  function performScheduledWorkItem(rawId) {
    const id = rawId.toString();
    const work = scheduledWork.get(id);
    scheduledWork.delete(id);
    if (NSAutoreleasePool === null)
      NSAutoreleasePool = classRegistry.NSAutoreleasePool;
    const pool = NSAutoreleasePool.alloc().init();
    let pendingException = null;
    try {
      work();
    } catch (e) {
      pendingException = e;
    }
    pool.release();
    setImmediate(performScheduledWorkCleanup, pendingException);
  }
  function performScheduledWorkCleanup(pendingException) {
    Script.unpin();
    if (pendingException !== null) {
      throw pendingException;
    }
  }
  this.implement = function(method2, fn) {
    return new NativeCallback(fn, method2.returnType, method2.argumentTypes);
  };
  this.selector = selector;
  this.selectorAsString = selectorAsString;
  function selector(name) {
    return api.sel_registerName(Memory.allocUtf8String(name));
  }
  function selectorAsString(sel2) {
    return api.sel_getName(sel2).readCString();
  }
  const registryBuiltins = /* @__PURE__ */ new Set([
    "prototype",
    "constructor",
    "hasOwnProperty",
    "toJSON",
    "toString",
    "valueOf"
  ]);
  function ClassRegistry() {
    const cachedClasses = /* @__PURE__ */ new Map();
    let numCachedClasses = 0;
    const registry = new Proxy(this, {
      has(target, property) {
        return hasProperty(property);
      },
      get(target, property, receiver) {
        switch (property) {
          case "prototype":
            return target.prototype;
          case "constructor":
            return target.constructor;
          case "hasOwnProperty":
            return hasProperty;
          case "toJSON":
            return toJSON;
          case "toString":
            return toString;
          case "valueOf":
            return valueOf;
          default:
            const klass = findClass(property);
            return klass !== null ? klass : void 0;
        }
      },
      set(target, property, value2, receiver) {
        return false;
      },
      ownKeys(target) {
        if (api === null)
          return [];
        let numClasses = api.objc_getClassList(NULL, 0);
        if (numClasses !== numCachedClasses) {
          const bufferSize = numClasses;
          const classHandles = Memory.alloc(bufferSize * pointerSize);
          numClasses = api.objc_getClassList(classHandles, bufferSize);
          if (numClasses > bufferSize)
            numClasses = bufferSize;
          for (let i = 0; i !== numClasses; i++) {
            const handle2 = classHandles.add(i * pointerSize).readPointer();
            const name = api.class_getName(handle2).readCString();
            cachedClasses.set(name, handle2);
          }
          numCachedClasses = numClasses;
        }
        return Array.from(cachedClasses.keys());
      },
      getOwnPropertyDescriptor(target, property) {
        return {
          writable: false,
          configurable: true,
          enumerable: true
        };
      }
    });
    function hasProperty(name) {
      if (registryBuiltins.has(name))
        return true;
      return findClass(name) !== null;
    }
    function getClass(name) {
      const cls = findClass(name);
      if (cls === null)
        throw new Error("Unable to find class '" + name + "'");
      return cls;
    }
    function findClass(name) {
      let handle2 = cachedClasses.get(name);
      if (handle2 === void 0) {
        handle2 = api.objc_lookUpClass(Memory.allocUtf8String(name));
        if (handle2.isNull())
          return null;
        cachedClasses.set(name, handle2);
        numCachedClasses++;
      }
      return new ObjCObject(handle2, void 0, true);
    }
    function toJSON() {
      return Object.keys(registry).reduce(function(r, name) {
        r[name] = getClass(name).toJSON();
        return r;
      }, {});
    }
    function toString() {
      return "ClassRegistry";
    }
    function valueOf() {
      return "ClassRegistry";
    }
    return registry;
  }
  function ProtocolRegistry() {
    const cachedProtocols = /* @__PURE__ */ new Map();
    let numCachedProtocols = 0;
    const registry = new Proxy(this, {
      has(target, property) {
        return hasProperty(property);
      },
      get(target, property, receiver) {
        switch (property) {
          case "prototype":
            return target.prototype;
          case "constructor":
            return target.constructor;
          case "hasOwnProperty":
            return hasProperty;
          case "toJSON":
            return toJSON;
          case "toString":
            return toString;
          case "valueOf":
            return valueOf;
          default:
            const proto = findProtocol(property);
            return proto !== null ? proto : void 0;
        }
      },
      set(target, property, value2, receiver) {
        return false;
      },
      ownKeys(target) {
        if (api === null)
          return [];
        const numProtocolsBuf = Memory.alloc(pointerSize);
        const protocolHandles = api.objc_copyProtocolList(numProtocolsBuf);
        try {
          const numProtocols = numProtocolsBuf.readUInt();
          if (numProtocols !== numCachedProtocols) {
            cachedProtocols.clear();
            for (let i = 0; i !== numProtocols; i++) {
              const handle2 = protocolHandles.add(i * pointerSize).readPointer();
              const name = api.protocol_getName(handle2).readCString();
              cachedProtocols.set(name, handle2);
            }
            numCachedProtocols = numProtocols;
          }
        } finally {
          api.free(protocolHandles);
        }
        return Array.from(cachedProtocols.keys());
      },
      getOwnPropertyDescriptor(target, property) {
        return {
          writable: false,
          configurable: true,
          enumerable: true
        };
      }
    });
    function hasProperty(name) {
      if (registryBuiltins.has(name))
        return true;
      return findProtocol(name) !== null;
    }
    function findProtocol(name) {
      let handle2 = cachedProtocols.get(name);
      if (handle2 === void 0) {
        handle2 = api.objc_getProtocol(Memory.allocUtf8String(name));
        if (handle2.isNull())
          return null;
        cachedProtocols.set(name, handle2);
        numCachedProtocols++;
      }
      return new ObjCProtocol(handle2);
    }
    function toJSON() {
      return Object.keys(registry).reduce(function(r, name) {
        r[name] = { handle: cachedProtocols.get(name) };
        return r;
      }, {});
    }
    function toString() {
      return "ProtocolRegistry";
    }
    function valueOf() {
      return "ProtocolRegistry";
    }
    return registry;
  }
  const objCObjectBuiltins = /* @__PURE__ */ new Set([
    "prototype",
    "constructor",
    "handle",
    "hasOwnProperty",
    "toJSON",
    "toString",
    "valueOf",
    "equals",
    "$kind",
    "$super",
    "$superClass",
    "$class",
    "$className",
    "$moduleName",
    "$protocols",
    "$methods",
    "$ownMethods",
    "$ivars"
  ]);
  function ObjCObject(handle2, protocol, cachedIsClass, superSpecifier2) {
    let cachedClassHandle = null;
    let cachedKind = null;
    let cachedSuper = null;
    let cachedSuperClass = null;
    let cachedClass = null;
    let cachedClassName = null;
    let cachedModuleName = null;
    let cachedProtocols = null;
    let cachedMethodNames = null;
    let cachedProtocolMethods = null;
    let respondsToSelector = null;
    const cachedMethods = /* @__PURE__ */ new Map();
    let cachedNativeMethodNames = null;
    let cachedOwnMethodNames = null;
    let cachedIvars = null;
    handle2 = getHandle(handle2);
    if (cachedIsClass === void 0) {
      const klass = api.object_getClass(handle2);
      const key = klass.toString();
      if (!realizedClasses.has(key)) {
        api.objc_lookUpClass(api.class_getName(klass));
        realizedClasses.add(key);
      }
    }
    const self = new Proxy(this, {
      has(target, property) {
        return hasProperty(property);
      },
      get(target, property, receiver) {
        switch (property) {
          case "handle":
            return handle2;
          case "prototype":
            return target.prototype;
          case "constructor":
            return target.constructor;
          case "hasOwnProperty":
            return hasProperty;
          case "toJSON":
            return toJSON;
          case "toString":
          case "valueOf":
            const descriptionImpl = receiver.description;
            if (descriptionImpl !== void 0) {
              const description = descriptionImpl.call(receiver);
              if (description !== null)
                return description.UTF8String.bind(description);
            }
            return function() {
              return receiver.$className;
            };
          case "equals":
            return equals;
          case "$kind":
            if (cachedKind === null) {
              if (isClass())
                cachedKind = api.class_isMetaClass(handle2) ? "meta-class" : "class";
              else
                cachedKind = "instance";
            }
            return cachedKind;
          case "$super":
            if (cachedSuper === null) {
              const superHandle = api.class_getSuperclass(classHandle());
              if (!superHandle.isNull()) {
                const specifier = Memory.alloc(2 * pointerSize);
                specifier.writePointer(handle2);
                specifier.add(pointerSize).writePointer(superHandle);
                cachedSuper = [new ObjCObject(handle2, void 0, cachedIsClass, specifier)];
              } else {
                cachedSuper = [null];
              }
            }
            return cachedSuper[0];
          case "$superClass":
            if (cachedSuperClass === null) {
              const superClassHandle = api.class_getSuperclass(classHandle());
              if (!superClassHandle.isNull()) {
                cachedSuperClass = [new ObjCObject(superClassHandle)];
              } else {
                cachedSuperClass = [null];
              }
            }
            return cachedSuperClass[0];
          case "$class":
            if (cachedClass === null)
              cachedClass = new ObjCObject(api.object_getClass(handle2), void 0, true);
            return cachedClass;
          case "$className":
            if (cachedClassName === null) {
              if (superSpecifier2)
                cachedClassName = api.class_getName(superSpecifier2.add(pointerSize).readPointer()).readCString();
              else if (isClass())
                cachedClassName = api.class_getName(handle2).readCString();
              else
                cachedClassName = api.object_getClassName(handle2).readCString();
            }
            return cachedClassName;
          case "$moduleName":
            if (cachedModuleName === null) {
              cachedModuleName = api.class_getImageName(classHandle()).readCString();
            }
            return cachedModuleName;
          case "$protocols":
            if (cachedProtocols === null) {
              cachedProtocols = {};
              const numProtocolsBuf = Memory.alloc(pointerSize);
              const protocolHandles = api.class_copyProtocolList(classHandle(), numProtocolsBuf);
              if (!protocolHandles.isNull()) {
                try {
                  const numProtocols = numProtocolsBuf.readUInt();
                  for (let i = 0; i !== numProtocols; i++) {
                    const protocolHandle = protocolHandles.add(i * pointerSize).readPointer();
                    const p = new ObjCProtocol(protocolHandle);
                    cachedProtocols[p.name] = p;
                  }
                } finally {
                  api.free(protocolHandles);
                }
              }
            }
            return cachedProtocols;
          case "$methods":
            if (cachedNativeMethodNames === null) {
              const klass = superSpecifier2 ? superSpecifier2.add(pointerSize).readPointer() : classHandle();
              const meta = api.object_getClass(klass);
              const names = /* @__PURE__ */ new Set();
              let cur = meta;
              do {
                for (let methodName of collectMethodNames(cur, "+ "))
                  names.add(methodName);
                cur = api.class_getSuperclass(cur);
              } while (!cur.isNull());
              cur = klass;
              do {
                for (let methodName of collectMethodNames(cur, "- "))
                  names.add(methodName);
                cur = api.class_getSuperclass(cur);
              } while (!cur.isNull());
              cachedNativeMethodNames = Array.from(names);
            }
            return cachedNativeMethodNames;
          case "$ownMethods":
            if (cachedOwnMethodNames === null) {
              const klass = superSpecifier2 ? superSpecifier2.add(pointerSize).readPointer() : classHandle();
              const meta = api.object_getClass(klass);
              const classMethods = collectMethodNames(meta, "+ ");
              const instanceMethods = collectMethodNames(klass, "- ");
              cachedOwnMethodNames = classMethods.concat(instanceMethods);
            }
            return cachedOwnMethodNames;
          case "$ivars":
            if (cachedIvars === null) {
              if (isClass())
                cachedIvars = {};
              else
                cachedIvars = new ObjCIvars(self, classHandle());
            }
            return cachedIvars;
          default:
            if (typeof property === "symbol") {
              return target[property];
            }
            if (protocol) {
              const details = findProtocolMethod(property);
              if (details === null || !details.implemented)
                return void 0;
            }
            const wrapper = findMethodWrapper(property);
            if (wrapper === null)
              return void 0;
            return wrapper;
        }
      },
      set(target, property, value2, receiver) {
        return false;
      },
      ownKeys(target) {
        if (cachedMethodNames === null) {
          if (!protocol) {
            const jsNames = {};
            const nativeNames = {};
            let cur = api.object_getClass(handle2);
            do {
              const numMethodsBuf = Memory.alloc(pointerSize);
              const methodHandles = api.class_copyMethodList(cur, numMethodsBuf);
              const fullNamePrefix = isClass() ? "+ " : "- ";
              try {
                const numMethods = numMethodsBuf.readUInt();
                for (let i = 0; i !== numMethods; i++) {
                  const methodHandle = methodHandles.add(i * pointerSize).readPointer();
                  const sel2 = api.method_getName(methodHandle);
                  const nativeName = api.sel_getName(sel2).readCString();
                  if (nativeNames[nativeName] !== void 0)
                    continue;
                  nativeNames[nativeName] = nativeName;
                  const jsName = jsMethodName(nativeName);
                  let serial2 = 2;
                  let name = jsName;
                  while (jsNames[name] !== void 0) {
                    serial2++;
                    name = jsName + serial2;
                  }
                  jsNames[name] = true;
                  const fullName = fullNamePrefix + nativeName;
                  if (!cachedMethods.has(fullName)) {
                    const details = {
                      sel: sel2,
                      handle: methodHandle,
                      wrapper: null
                    };
                    cachedMethods.set(fullName, details);
                    cachedMethods.set(name, details);
                  }
                }
              } finally {
                api.free(methodHandles);
              }
              cur = api.class_getSuperclass(cur);
            } while (!cur.isNull());
            cachedMethodNames = Object.keys(jsNames);
          } else {
            const methodNames = [];
            const protocolMethods = allProtocolMethods();
            Object.keys(protocolMethods).forEach(function(methodName) {
              if (methodName[0] !== "+" && methodName[0] !== "-") {
                const details = protocolMethods[methodName];
                if (details.implemented) {
                  methodNames.push(methodName);
                }
              }
            });
            cachedMethodNames = methodNames;
          }
        }
        return ["handle"].concat(cachedMethodNames);
      },
      getOwnPropertyDescriptor(target, property) {
        return {
          writable: false,
          configurable: true,
          enumerable: true
        };
      }
    });
    if (protocol) {
      respondsToSelector = !isClass() ? findMethodWrapper("- respondsToSelector:") : null;
    }
    return self;
    function hasProperty(name) {
      if (objCObjectBuiltins.has(name))
        return true;
      if (protocol) {
        const details = findProtocolMethod(name);
        return !!(details !== null && details.implemented);
      }
      return findMethod(name) !== null;
    }
    function classHandle() {
      if (cachedClassHandle === null)
        cachedClassHandle = isClass() ? handle2 : api.object_getClass(handle2);
      return cachedClassHandle;
    }
    function isClass() {
      if (cachedIsClass === void 0) {
        if (api.object_isClass)
          cachedIsClass = !!api.object_isClass(handle2);
        else
          cachedIsClass = !!api.class_isMetaClass(api.object_getClass(handle2));
      }
      return cachedIsClass;
    }
    function findMethod(rawName) {
      let method2 = cachedMethods.get(rawName);
      if (method2 !== void 0)
        return method2;
      const tokens = parseMethodName(rawName);
      const fullName = tokens[2];
      method2 = cachedMethods.get(fullName);
      if (method2 !== void 0) {
        cachedMethods.set(rawName, method2);
        return method2;
      }
      const kind = tokens[0];
      const name = tokens[1];
      const sel2 = selector(name);
      const defaultKind = isClass() ? "+" : "-";
      if (protocol) {
        const details = findProtocolMethod(fullName);
        if (details !== null) {
          method2 = {
            sel: sel2,
            types: details.types,
            wrapper: null,
            kind
          };
        }
      }
      if (method2 === void 0) {
        const methodHandle = kind === "+" ? api.class_getClassMethod(classHandle(), sel2) : api.class_getInstanceMethod(classHandle(), sel2);
        if (!methodHandle.isNull()) {
          method2 = {
            sel: sel2,
            handle: methodHandle,
            wrapper: null,
            kind
          };
        } else {
          if (isClass() || kind !== "-" || name === "forwardingTargetForSelector:" || name === "methodSignatureForSelector:") {
            return null;
          }
          let target = self;
          if ("- forwardingTargetForSelector:" in self) {
            const forwardingTarget = self.forwardingTargetForSelector_(sel2);
            if (forwardingTarget !== null && forwardingTarget.$kind === "instance") {
              target = forwardingTarget;
            } else {
              return null;
            }
          } else {
            return null;
          }
          const methodHandle2 = api.class_getInstanceMethod(api.object_getClass(target.handle), sel2);
          if (methodHandle2.isNull()) {
            return null;
          }
          let types3 = api.method_getTypeEncoding(methodHandle2).readCString();
          if (types3 === null || types3 === "") {
            types3 = stealTypesFromProtocols(target, fullName);
            if (types3 === null)
              types3 = stealTypesFromProtocols(self, fullName);
            if (types3 === null)
              return null;
          }
          method2 = {
            sel: sel2,
            types: types3,
            wrapper: null,
            kind
          };
        }
      }
      cachedMethods.set(fullName, method2);
      cachedMethods.set(rawName, method2);
      if (kind === defaultKind)
        cachedMethods.set(jsMethodName(name), method2);
      return method2;
    }
    function stealTypesFromProtocols(klass, fullName) {
      const candidates = Object.keys(klass.$protocols).map((protocolName) => flatProtocolMethods({}, klass.$protocols[protocolName])).reduce((allMethods, methods) => {
        Object.assign(allMethods, methods);
        return allMethods;
      }, {});
      const method2 = candidates[fullName];
      if (method2 === void 0) {
        return null;
      }
      return method2.types;
    }
    function flatProtocolMethods(result, protocol2) {
      if (protocol2.methods !== void 0) {
        Object.assign(result, protocol2.methods);
      }
      if (protocol2.protocol !== void 0) {
        flatProtocolMethods(result, protocol2.protocol);
      }
      return result;
    }
    function findProtocolMethod(rawName) {
      const protocolMethods = allProtocolMethods();
      const details = protocolMethods[rawName];
      return details !== void 0 ? details : null;
    }
    function allProtocolMethods() {
      if (cachedProtocolMethods === null) {
        const methods = {};
        const protocols = collectProtocols(protocol);
        const defaultKind = isClass() ? "+" : "-";
        Object.keys(protocols).forEach(function(name) {
          const p = protocols[name];
          const m2 = p.methods;
          Object.keys(m2).forEach(function(fullMethodName) {
            const method2 = m2[fullMethodName];
            const methodName = fullMethodName.substr(2);
            const kind = fullMethodName[0];
            let didCheckImplemented = false;
            let implemented = false;
            const details = {
              types: method2.types
            };
            Object.defineProperty(details, "implemented", {
              get() {
                if (!didCheckImplemented) {
                  if (method2.required) {
                    implemented = true;
                  } else {
                    implemented = respondsToSelector !== null && respondsToSelector.call(self, selector(methodName));
                  }
                  didCheckImplemented = true;
                }
                return implemented;
              }
            });
            methods[fullMethodName] = details;
            if (kind === defaultKind)
              methods[jsMethodName(methodName)] = details;
          });
        });
        cachedProtocolMethods = methods;
      }
      return cachedProtocolMethods;
    }
    function findMethodWrapper(name) {
      const method2 = findMethod(name);
      if (method2 === null)
        return null;
      let wrapper = method2.wrapper;
      if (wrapper === null) {
        wrapper = makeMethodInvocationWrapper(method2, self, superSpecifier2, defaultInvocationOptions);
        method2.wrapper = wrapper;
      }
      return wrapper;
    }
    function parseMethodName(rawName) {
      const match = /([+\-])\s(\S+)/.exec(rawName);
      let name, kind;
      if (match === null) {
        kind = isClass() ? "+" : "-";
        name = objcMethodName(rawName);
      } else {
        kind = match[1];
        name = match[2];
      }
      const fullName = [kind, name].join(" ");
      return [kind, name, fullName];
    }
    function toJSON() {
      return {
        handle: handle2.toString()
      };
    }
    function equals(ptr2) {
      return handle2.equals(getHandle(ptr2));
    }
  }
  function getReplacementMethodImplementation(methodHandle) {
    const existingEntry = replacedMethods.get(methodHandle.toString());
    if (existingEntry === void 0)
      return null;
    const [, newImp] = existingEntry;
    return newImp;
  }
  function replaceMethodImplementation(methodHandle, imp) {
    const key = methodHandle.toString();
    let oldImp;
    const existingEntry = replacedMethods.get(key);
    if (existingEntry !== void 0)
      [oldImp] = existingEntry;
    else
      oldImp = api.method_getImplementation(methodHandle);
    if (!imp.equals(oldImp))
      replacedMethods.set(key, [oldImp, imp]);
    else
      replacedMethods.delete(key);
    api.method_setImplementation(methodHandle, imp);
  }
  function collectMethodNames(klass, prefix) {
    const names = [];
    const numMethodsBuf = Memory.alloc(pointerSize);
    const methodHandles = api.class_copyMethodList(klass, numMethodsBuf);
    try {
      const numMethods = numMethodsBuf.readUInt();
      for (let i = 0; i !== numMethods; i++) {
        const methodHandle = methodHandles.add(i * pointerSize).readPointer();
        const sel2 = api.method_getName(methodHandle);
        const nativeName = api.sel_getName(sel2).readCString();
        names.push(prefix + nativeName);
      }
    } finally {
      api.free(methodHandles);
    }
    return names;
  }
  function ObjCProtocol(handle2) {
    let cachedName = null;
    let cachedProtocols = null;
    let cachedProperties = null;
    let cachedMethods = null;
    Object.defineProperty(this, "handle", {
      value: handle2,
      enumerable: true
    });
    Object.defineProperty(this, "name", {
      get() {
        if (cachedName === null)
          cachedName = api.protocol_getName(handle2).readCString();
        return cachedName;
      },
      enumerable: true
    });
    Object.defineProperty(this, "protocols", {
      get() {
        if (cachedProtocols === null) {
          cachedProtocols = {};
          const numProtocolsBuf = Memory.alloc(pointerSize);
          const protocolHandles = api.protocol_copyProtocolList(handle2, numProtocolsBuf);
          if (!protocolHandles.isNull()) {
            try {
              const numProtocols = numProtocolsBuf.readUInt();
              for (let i = 0; i !== numProtocols; i++) {
                const protocolHandle = protocolHandles.add(i * pointerSize).readPointer();
                const protocol = new ObjCProtocol(protocolHandle);
                cachedProtocols[protocol.name] = protocol;
              }
            } finally {
              api.free(protocolHandles);
            }
          }
        }
        return cachedProtocols;
      },
      enumerable: true
    });
    Object.defineProperty(this, "properties", {
      get() {
        if (cachedProperties === null) {
          cachedProperties = {};
          const numBuf = Memory.alloc(pointerSize);
          const propertyHandles = api.protocol_copyPropertyList(handle2, numBuf);
          if (!propertyHandles.isNull()) {
            try {
              const numProperties = numBuf.readUInt();
              for (let i = 0; i !== numProperties; i++) {
                const propertyHandle = propertyHandles.add(i * pointerSize).readPointer();
                const propName = api.property_getName(propertyHandle).readCString();
                const attributes = {};
                const attributeEntries = api.property_copyAttributeList(propertyHandle, numBuf);
                if (!attributeEntries.isNull()) {
                  try {
                    const numAttributeValues = numBuf.readUInt();
                    for (let j = 0; j !== numAttributeValues; j++) {
                      const attributeEntry = attributeEntries.add(j * (2 * pointerSize));
                      const name = attributeEntry.readPointer().readCString();
                      const value2 = attributeEntry.add(pointerSize).readPointer().readCString();
                      attributes[name] = value2;
                    }
                  } finally {
                    api.free(attributeEntries);
                  }
                }
                cachedProperties[propName] = attributes;
              }
            } finally {
              api.free(propertyHandles);
            }
          }
        }
        return cachedProperties;
      },
      enumerable: true
    });
    Object.defineProperty(this, "methods", {
      get() {
        if (cachedMethods === null) {
          cachedMethods = {};
          const numBuf = Memory.alloc(pointerSize);
          collectMethods(cachedMethods, numBuf, { required: true, instance: false });
          collectMethods(cachedMethods, numBuf, { required: false, instance: false });
          collectMethods(cachedMethods, numBuf, { required: true, instance: true });
          collectMethods(cachedMethods, numBuf, { required: false, instance: true });
        }
        return cachedMethods;
      },
      enumerable: true
    });
    function collectMethods(methods, numBuf, spec) {
      const methodDescValues = api.protocol_copyMethodDescriptionList(handle2, spec.required ? 1 : 0, spec.instance ? 1 : 0, numBuf);
      if (methodDescValues.isNull())
        return;
      try {
        const numMethodDescValues = numBuf.readUInt();
        for (let i = 0; i !== numMethodDescValues; i++) {
          const methodDesc = methodDescValues.add(i * (2 * pointerSize));
          const name = (spec.instance ? "- " : "+ ") + selectorAsString(methodDesc.readPointer());
          const types3 = methodDesc.add(pointerSize).readPointer().readCString();
          methods[name] = {
            required: spec.required,
            types: types3
          };
        }
      } finally {
        api.free(methodDescValues);
      }
    }
  }
  const objCIvarsBuiltins = /* @__PURE__ */ new Set([
    "prototype",
    "constructor",
    "hasOwnProperty",
    "toJSON",
    "toString",
    "valueOf"
  ]);
  function ObjCIvars(instance, classHandle) {
    const ivars = {};
    let cachedIvarNames = null;
    let classHandles = [];
    let currentClassHandle = classHandle;
    do {
      classHandles.unshift(currentClassHandle);
      currentClassHandle = api.class_getSuperclass(currentClassHandle);
    } while (!currentClassHandle.isNull());
    const numIvarsBuf = Memory.alloc(pointerSize);
    classHandles.forEach((c) => {
      const ivarHandles = api.class_copyIvarList(c, numIvarsBuf);
      try {
        const numIvars = numIvarsBuf.readUInt();
        for (let i = 0; i !== numIvars; i++) {
          const handle2 = ivarHandles.add(i * pointerSize).readPointer();
          const name = api.ivar_getName(handle2).readCString();
          ivars[name] = [handle2, null];
        }
      } finally {
        api.free(ivarHandles);
      }
    });
    const self = new Proxy(this, {
      has(target, property) {
        return hasProperty(property);
      },
      get(target, property, receiver) {
        switch (property) {
          case "prototype":
            return target.prototype;
          case "constructor":
            return target.constructor;
          case "hasOwnProperty":
            return hasProperty;
          case "toJSON":
            return toJSON;
          case "toString":
            return toString;
          case "valueOf":
            return valueOf;
          default:
            const ivar = findIvar(property);
            if (ivar === null)
              return void 0;
            return ivar.get();
        }
      },
      set(target, property, value2, receiver) {
        const ivar = findIvar(property);
        if (ivar === null)
          throw new Error("Unknown ivar");
        ivar.set(value2);
        return true;
      },
      ownKeys(target) {
        if (cachedIvarNames === null)
          cachedIvarNames = Object.keys(ivars);
        return cachedIvarNames;
      },
      getOwnPropertyDescriptor(target, property) {
        return {
          writable: true,
          configurable: true,
          enumerable: true
        };
      }
    });
    return self;
    function findIvar(name) {
      const entry = ivars[name];
      if (entry === void 0)
        return null;
      let impl = entry[1];
      if (impl === null) {
        const ivar = entry[0];
        const offset = api.ivar_getOffset(ivar).toInt32();
        const address = instance.handle.add(offset);
        const type2 = parseType(api.ivar_getTypeEncoding(ivar).readCString());
        const fromNative = type2.fromNative || identityTransform;
        const toNative = type2.toNative || identityTransform;
        let read, write;
        if (name === "isa") {
          read = readObjectIsa;
          write = function() {
            throw new Error("Unable to set the isa instance variable");
          };
        } else {
          read = type2.read;
          write = type2.write;
        }
        impl = {
          get() {
            return fromNative.call(instance, read(address));
          },
          set(value2) {
            write(address, toNative.call(instance, value2));
          }
        };
        entry[1] = impl;
      }
      return impl;
    }
    function hasProperty(name) {
      if (objCIvarsBuiltins.has(name))
        return true;
      return ivars.hasOwnProperty(name);
    }
    function toJSON() {
      return Object.keys(self).reduce(function(result, name) {
        result[name] = self[name];
        return result;
      }, {});
    }
    function toString() {
      return "ObjCIvars";
    }
    function valueOf() {
      return "ObjCIvars";
    }
  }
  let blockDescriptorAllocSize, blockDescriptorDeclaredSize, blockDescriptorOffsets;
  let blockSize, blockOffsets;
  if (pointerSize === 4) {
    blockDescriptorAllocSize = 16;
    blockDescriptorDeclaredSize = 20;
    blockDescriptorOffsets = {
      reserved: 0,
      size: 4,
      rest: 8
    };
    blockSize = 20;
    blockOffsets = {
      isa: 0,
      flags: 4,
      reserved: 8,
      invoke: 12,
      descriptor: 16
    };
  } else {
    blockDescriptorAllocSize = 32;
    blockDescriptorDeclaredSize = 32;
    blockDescriptorOffsets = {
      reserved: 0,
      size: 8,
      rest: 16
    };
    blockSize = 32;
    blockOffsets = {
      isa: 0,
      flags: 8,
      reserved: 12,
      invoke: 16,
      descriptor: 24
    };
  }
  const BLOCK_HAS_COPY_DISPOSE = 1 << 25;
  const BLOCK_HAS_CTOR = 1 << 26;
  const BLOCK_IS_GLOBAL = 1 << 28;
  const BLOCK_HAS_STRET = 1 << 29;
  const BLOCK_HAS_SIGNATURE = 1 << 30;
  function Block(target, options = defaultInvocationOptions) {
    this._options = options;
    if (target instanceof NativePointer) {
      const descriptor = target.add(blockOffsets.descriptor).readPointer();
      this.handle = target;
      const flags = target.add(blockOffsets.flags).readU32();
      if ((flags & BLOCK_HAS_SIGNATURE) !== 0) {
        const signatureOffset = (flags & BLOCK_HAS_COPY_DISPOSE) !== 0 ? 2 : 0;
        this.types = descriptor.add(blockDescriptorOffsets.rest + signatureOffset * pointerSize).readPointer().readCString();
        this._signature = parseSignature(this.types);
      } else {
        this._signature = null;
      }
    } else {
      this.declare(target);
      const descriptor = Memory.alloc(blockDescriptorAllocSize + blockSize);
      const block2 = descriptor.add(blockDescriptorAllocSize);
      const typesStr = Memory.allocUtf8String(this.types);
      descriptor.add(blockDescriptorOffsets.reserved).writeULong(0);
      descriptor.add(blockDescriptorOffsets.size).writeULong(blockDescriptorDeclaredSize);
      descriptor.add(blockDescriptorOffsets.rest).writePointer(typesStr);
      block2.add(blockOffsets.isa).writePointer(classRegistry.__NSGlobalBlock__);
      block2.add(blockOffsets.flags).writeU32(BLOCK_HAS_SIGNATURE | BLOCK_IS_GLOBAL);
      block2.add(blockOffsets.reserved).writeU32(0);
      block2.add(blockOffsets.descriptor).writePointer(descriptor);
      this.handle = block2;
      this._storage = [descriptor, typesStr];
      this.implementation = target.implementation;
    }
  }
  Object.defineProperties(Block.prototype, {
    implementation: {
      enumerable: true,
      get() {
        const address = this.handle.add(blockOffsets.invoke).readPointer().strip();
        const signature2 = this._getSignature();
        return makeBlockInvocationWrapper(this, signature2, new NativeFunction(
          address.sign(),
          signature2.retType.type,
          signature2.argTypes.map(function(arg) {
            return arg.type;
          }),
          this._options
        ));
      },
      set(func) {
        const signature2 = this._getSignature();
        const callback = new NativeCallback(
          makeBlockImplementationWrapper(this, signature2, func),
          signature2.retType.type,
          signature2.argTypes.map(function(arg) {
            return arg.type;
          })
        );
        this._callback = callback;
        const location = this.handle.add(blockOffsets.invoke);
        const prot = Memory.queryProtection(location);
        const writable = prot.includes("w");
        if (!writable)
          Memory.protect(location, Process.pointerSize, "rw-");
        location.writePointer(callback.strip().sign("ia", location));
        if (!writable)
          Memory.protect(location, Process.pointerSize, prot);
      }
    },
    declare: {
      value(signature2) {
        let types3 = signature2.types;
        if (types3 === void 0) {
          types3 = unparseSignature(signature2.retType, ["block"].concat(signature2.argTypes));
        }
        this.types = types3;
        this._signature = parseSignature(types3);
      }
    },
    _getSignature: {
      value() {
        const signature2 = this._signature;
        if (signature2 === null)
          throw new Error("block is missing signature; call declare()");
        return signature2;
      }
    }
  });
  function collectProtocols(p, acc) {
    acc = acc || {};
    acc[p.name] = p;
    const parentProtocols = p.protocols;
    Object.keys(parentProtocols).forEach(function(name) {
      collectProtocols(parentProtocols[name], acc);
    });
    return acc;
  }
  function registerProxy(properties) {
    const protocols = properties.protocols || [];
    const methods = properties.methods || {};
    const events = properties.events || {};
    const supportedSelectors = new Set(
      Object.keys(methods).filter((m2) => /([+\-])\s(\S+)/.exec(m2) !== null).map((m2) => m2.split(" ")[1])
    );
    const proxyMethods = {
      "- dealloc": function() {
        const target = this.data.target;
        if ("- release" in target)
          target.release();
        unbind(this.self);
        this.super.dealloc();
        const callback = this.data.events.dealloc;
        if (callback !== void 0)
          callback.call(this);
      },
      "- respondsToSelector:": function(sel2) {
        const selector2 = selectorAsString(sel2);
        if (supportedSelectors.has(selector2))
          return true;
        return this.data.target.respondsToSelector_(sel2);
      },
      "- forwardingTargetForSelector:": function(sel2) {
        const callback = this.data.events.forward;
        if (callback !== void 0)
          callback.call(this, selectorAsString(sel2));
        return this.data.target;
      },
      "- methodSignatureForSelector:": function(sel2) {
        return this.data.target.methodSignatureForSelector_(sel2);
      },
      "- forwardInvocation:": function(invocation) {
        invocation.invokeWithTarget_(this.data.target);
      }
    };
    for (var key in methods) {
      if (methods.hasOwnProperty(key)) {
        if (proxyMethods.hasOwnProperty(key))
          throw new Error("The '" + key + "' method is reserved");
        proxyMethods[key] = methods[key];
      }
    }
    const ProxyClass = registerClass({
      name: properties.name,
      super: classRegistry.NSProxy,
      protocols,
      methods: proxyMethods
    });
    return function(target, data) {
      target = target instanceof NativePointer ? new ObjCObject(target) : target;
      data = data || {};
      const instance = ProxyClass.alloc().autorelease();
      const boundData = getBoundData(instance);
      boundData.target = "- retain" in target ? target.retain() : target;
      boundData.events = events;
      for (var key2 in data) {
        if (data.hasOwnProperty(key2)) {
          if (boundData.hasOwnProperty(key2))
            throw new Error("The '" + key2 + "' property is reserved");
          boundData[key2] = data[key2];
        }
      }
      this.handle = instance.handle;
    };
  }
  function registerClass(properties) {
    let name = properties.name;
    if (name === void 0)
      name = makeClassName();
    const superClass = properties.super !== void 0 ? properties.super : classRegistry.NSObject;
    const protocols = properties.protocols || [];
    const methods = properties.methods || {};
    const methodCallbacks = [];
    const classHandle = api.objc_allocateClassPair(superClass !== null ? superClass.handle : NULL, Memory.allocUtf8String(name), ptr("0"));
    if (classHandle.isNull())
      throw new Error("Unable to register already registered class '" + name + "'");
    const metaClassHandle = api.object_getClass(classHandle);
    try {
      protocols.forEach(function(protocol) {
        api.class_addProtocol(classHandle, protocol.handle);
      });
      Object.keys(methods).forEach(function(rawMethodName) {
        const match = /([+\-])\s(\S+)/.exec(rawMethodName);
        if (match === null)
          throw new Error("Invalid method name");
        const kind = match[1];
        const name2 = match[2];
        let method2;
        const value2 = methods[rawMethodName];
        if (typeof value2 === "function") {
          let types4 = null;
          if (rawMethodName in superClass) {
            types4 = superClass[rawMethodName].types;
          } else {
            for (let protocol of protocols) {
              const method3 = protocol.methods[rawMethodName];
              if (method3 !== void 0) {
                types4 = method3.types;
                break;
              }
            }
          }
          if (types4 === null)
            throw new Error("Unable to find '" + rawMethodName + "' in super-class or any of its protocols");
          method2 = {
            types: types4,
            implementation: value2
          };
        } else {
          method2 = value2;
        }
        const target = kind === "+" ? metaClassHandle : classHandle;
        let types3 = method2.types;
        if (types3 === void 0) {
          types3 = unparseSignature(method2.retType, [kind === "+" ? "class" : "object", "selector"].concat(method2.argTypes));
        }
        const signature2 = parseSignature(types3);
        const implementation2 = new NativeCallback(
          makeMethodImplementationWrapper(signature2, method2.implementation),
          signature2.retType.type,
          signature2.argTypes.map(function(arg) {
            return arg.type;
          })
        );
        methodCallbacks.push(implementation2);
        api.class_addMethod(target, selector(name2), implementation2, Memory.allocUtf8String(types3));
      });
    } catch (e) {
      api.objc_disposeClassPair(classHandle);
      throw e;
    }
    api.objc_registerClassPair(classHandle);
    classHandle._methodCallbacks = methodCallbacks;
    Script.bindWeak(classHandle, makeClassDestructor(ptr(classHandle)));
    return new ObjCObject(classHandle);
  }
  function makeClassDestructor(classHandle) {
    return function() {
      api.objc_disposeClassPair(classHandle);
    };
  }
  function registerProtocol(properties) {
    let name = properties.name;
    if (name === void 0)
      name = makeProtocolName();
    const protocols = properties.protocols || [];
    const methods = properties.methods || {};
    protocols.forEach(function(protocol) {
      if (!(protocol instanceof ObjCProtocol))
        throw new Error("Expected protocol");
    });
    const methodSpecs = Object.keys(methods).map(function(rawMethodName) {
      const method2 = methods[rawMethodName];
      const match = /([+\-])\s(\S+)/.exec(rawMethodName);
      if (match === null)
        throw new Error("Invalid method name");
      const kind = match[1];
      const name2 = match[2];
      let types3 = method2.types;
      if (types3 === void 0) {
        types3 = unparseSignature(method2.retType, [kind === "+" ? "class" : "object", "selector"].concat(method2.argTypes));
      }
      return {
        kind,
        name: name2,
        types: types3,
        optional: method2.optional
      };
    });
    const handle2 = api.objc_allocateProtocol(Memory.allocUtf8String(name));
    if (handle2.isNull())
      throw new Error("Unable to register already registered protocol '" + name + "'");
    protocols.forEach(function(protocol) {
      api.protocol_addProtocol(handle2, protocol.handle);
    });
    methodSpecs.forEach(function(spec) {
      const isRequiredMethod = spec.optional ? 0 : 1;
      const isInstanceMethod = spec.kind === "-" ? 1 : 0;
      api.protocol_addMethodDescription(handle2, selector(spec.name), Memory.allocUtf8String(spec.types), isRequiredMethod, isInstanceMethod);
    });
    api.objc_registerProtocol(handle2);
    return new ObjCProtocol(handle2);
  }
  function getHandle(obj) {
    if (obj instanceof NativePointer)
      return obj;
    else if (typeof obj === "object" && obj.hasOwnProperty("handle"))
      return obj.handle;
    else
      throw new Error("Expected NativePointer or ObjC.Object instance");
  }
  function bind(obj, data) {
    const handle2 = getHandle(obj);
    const self = obj instanceof ObjCObject ? obj : new ObjCObject(handle2);
    bindings.set(handle2.toString(), {
      self,
      super: self.$super,
      data
    });
  }
  function unbind(obj) {
    const handle2 = getHandle(obj);
    bindings.delete(handle2.toString());
  }
  function getBoundData(obj) {
    return getBinding(obj).data;
  }
  function getBinding(obj) {
    const handle2 = getHandle(obj);
    const key = handle2.toString();
    let binding = bindings.get(key);
    if (binding === void 0) {
      const self = obj instanceof ObjCObject ? obj : new ObjCObject(handle2);
      binding = {
        self,
        super: self.$super,
        data: {}
      };
      bindings.set(key, binding);
    }
    return binding;
  }
  function enumerateLoadedClasses(...args) {
    const allModules2 = new ModuleMap();
    let unfiltered = false;
    let callbacks;
    let modules;
    if (args.length === 1) {
      callbacks = args[0];
    } else {
      callbacks = args[1];
      const options = args[0];
      modules = options.ownedBy;
    }
    if (modules === void 0) {
      modules = allModules2;
      unfiltered = true;
    }
    const classGetName = api.class_getName;
    const onMatch = callbacks.onMatch.bind(callbacks);
    const swiftNominalTypeDescriptorOffset = (pointerSize === 8 ? 8 : 11) * pointerSize;
    const numClasses = api.objc_getClassList(NULL, 0);
    const classHandles = Memory.alloc(numClasses * pointerSize);
    api.objc_getClassList(classHandles, numClasses);
    for (let i = 0; i !== numClasses; i++) {
      const classHandle = classHandles.add(i * pointerSize).readPointer();
      const rawName = classGetName(classHandle);
      let name = null;
      let modulePath = modules.findPath(rawName);
      const possiblySwift = modulePath === null && (unfiltered || allModules2.findPath(rawName) === null);
      if (possiblySwift) {
        name = rawName.readCString();
        const probablySwift = name.indexOf(".") !== -1;
        if (probablySwift) {
          const nominalTypeDescriptor = classHandle.add(swiftNominalTypeDescriptorOffset).readPointer();
          modulePath = modules.findPath(nominalTypeDescriptor);
        }
      }
      if (modulePath !== null) {
        if (name === null)
          name = rawName.readCString();
        onMatch(name, modulePath);
      }
    }
    callbacks.onComplete();
  }
  function enumerateLoadedClassesSync(options = {}) {
    const result = {};
    enumerateLoadedClasses(options, {
      onMatch(name, owner2) {
        let group = result[owner2];
        if (group === void 0) {
          group = [];
          result[owner2] = group;
        }
        group.push(name);
      },
      onComplete() {
      }
    });
    return result;
  }
  function choose(specifier, callbacks) {
    let cls = specifier;
    let subclasses = true;
    if (!(specifier instanceof ObjCObject) && typeof specifier === "object") {
      cls = specifier.class;
      if (specifier.hasOwnProperty("subclasses"))
        subclasses = specifier.subclasses;
    }
    if (!(cls instanceof ObjCObject && (cls.$kind === "class" || cls.$kind === "meta-class")))
      throw new Error("Expected an ObjC.Object for a class or meta-class");
    const matches = get().choose(cls, subclasses).map((handle2) => new ObjCObject(handle2));
    for (const match of matches) {
      const result = callbacks.onMatch(match);
      if (result === "stop")
        break;
    }
    callbacks.onComplete();
  }
  function makeMethodInvocationWrapper(method, owner, superSpecifier, invocationOptions) {
    const sel = method.sel;
    let handle = method.handle;
    let types;
    if (handle === void 0) {
      handle = null;
      types = method.types;
    } else {
      types = api.method_getTypeEncoding(handle).readCString();
    }
    const signature = parseSignature(types);
    const retType = signature.retType;
    const argTypes = signature.argTypes.slice(2);
    const objc_msgSend = superSpecifier ? getMsgSendSuperImpl(signature, invocationOptions) : getMsgSendImpl(signature, invocationOptions);
    const argVariableNames = argTypes.map(function(t, i) {
      return "a" + (i + 1);
    });
    const callArgs = [
      superSpecifier ? "superSpecifier" : "this",
      "sel"
    ].concat(argTypes.map(function(t, i) {
      if (t.toNative) {
        return "argTypes[" + i + "].toNative.call(this, " + argVariableNames[i] + ")";
      }
      return argVariableNames[i];
    }));
    let returnCaptureLeft;
    let returnCaptureRight;
    if (retType.type === "void") {
      returnCaptureLeft = "";
      returnCaptureRight = "";
    } else if (retType.fromNative) {
      returnCaptureLeft = "return retType.fromNative.call(this, ";
      returnCaptureRight = ")";
    } else {
      returnCaptureLeft = "return ";
      returnCaptureRight = "";
    }
    const m = eval("var m = function (" + argVariableNames.join(", ") + ") { " + returnCaptureLeft + "objc_msgSend(" + callArgs.join(", ") + ")" + returnCaptureRight + "; }; m;");
    Object.defineProperty(m, "handle", {
      enumerable: true,
      get: getMethodHandle
    });
    m.selector = sel;
    Object.defineProperty(m, "implementation", {
      enumerable: true,
      get() {
        const h = getMethodHandle();
        const impl = new NativeFunction(api.method_getImplementation(h), m.returnType, m.argumentTypes, invocationOptions);
        const newImp = getReplacementMethodImplementation(h);
        if (newImp !== null)
          impl._callback = newImp;
        return impl;
      },
      set(imp) {
        replaceMethodImplementation(getMethodHandle(), imp);
      }
    });
    m.returnType = retType.type;
    m.argumentTypes = signature.argTypes.map((t) => t.type);
    m.types = types;
    Object.defineProperty(m, "symbol", {
      enumerable: true,
      get() {
        return `${method.kind}[${owner.$className} ${selectorAsString(sel)}]`;
      }
    });
    m.clone = function(options) {
      return makeMethodInvocationWrapper(method, owner, superSpecifier, options);
    };
    function getMethodHandle() {
      if (handle === null) {
        if (owner.$kind === "instance") {
          let cur = owner;
          do {
            if ("- forwardingTargetForSelector:" in cur) {
              const target = cur.forwardingTargetForSelector_(sel);
              if (target === null)
                break;
              if (target.$kind !== "instance")
                break;
              const h = api.class_getInstanceMethod(target.$class.handle, sel);
              if (!h.isNull())
                handle = h;
              else
                cur = target;
            } else {
              break;
            }
          } while (handle === null);
        }
        if (handle === null)
          throw new Error("Unable to find method handle of proxied function");
      }
      return handle;
    }
    return m;
  }
  function makeMethodImplementationWrapper(signature, implementation) {
    const retType = signature.retType;
    const argTypes = signature.argTypes;
    const argVariableNames = argTypes.map(function(t, i) {
      if (i === 0)
        return "handle";
      else if (i === 1)
        return "sel";
      else
        return "a" + (i - 1);
    });
    const callArgs = argTypes.slice(2).map(function(t, i) {
      const argVariableName = argVariableNames[2 + i];
      if (t.fromNative) {
        return "argTypes[" + (2 + i) + "].fromNative.call(self, " + argVariableName + ")";
      }
      return argVariableName;
    });
    let returnCaptureLeft;
    let returnCaptureRight;
    if (retType.type === "void") {
      returnCaptureLeft = "";
      returnCaptureRight = "";
    } else if (retType.toNative) {
      returnCaptureLeft = "return retType.toNative.call(self, ";
      returnCaptureRight = ")";
    } else {
      returnCaptureLeft = "return ";
      returnCaptureRight = "";
    }
    const m = eval("var m = function (" + argVariableNames.join(", ") + ") { var binding = getBinding(handle);var self = binding.self;" + returnCaptureLeft + "implementation.call(binding" + (callArgs.length > 0 ? ", " : "") + callArgs.join(", ") + ")" + returnCaptureRight + "; }; m;");
    return m;
  }
  function makeBlockInvocationWrapper(block, signature, implementation) {
    const retType = signature.retType;
    const argTypes = signature.argTypes.slice(1);
    const argVariableNames = argTypes.map(function(t, i) {
      return "a" + (i + 1);
    });
    const callArgs = argTypes.map(function(t, i) {
      if (t.toNative) {
        return "argTypes[" + i + "].toNative.call(this, " + argVariableNames[i] + ")";
      }
      return argVariableNames[i];
    });
    let returnCaptureLeft;
    let returnCaptureRight;
    if (retType.type === "void") {
      returnCaptureLeft = "";
      returnCaptureRight = "";
    } else if (retType.fromNative) {
      returnCaptureLeft = "return retType.fromNative.call(this, ";
      returnCaptureRight = ")";
    } else {
      returnCaptureLeft = "return ";
      returnCaptureRight = "";
    }
    const f = eval("var f = function (" + argVariableNames.join(", ") + ") { " + returnCaptureLeft + "implementation(this" + (callArgs.length > 0 ? ", " : "") + callArgs.join(", ") + ")" + returnCaptureRight + "; }; f;");
    return f.bind(block);
  }
  function makeBlockImplementationWrapper(block, signature, implementation) {
    const retType = signature.retType;
    const argTypes = signature.argTypes;
    const argVariableNames = argTypes.map(function(t, i) {
      if (i === 0)
        return "handle";
      else
        return "a" + i;
    });
    const callArgs = argTypes.slice(1).map(function(t, i) {
      const argVariableName = argVariableNames[1 + i];
      if (t.fromNative) {
        return "argTypes[" + (1 + i) + "].fromNative.call(this, " + argVariableName + ")";
      }
      return argVariableName;
    });
    let returnCaptureLeft;
    let returnCaptureRight;
    if (retType.type === "void") {
      returnCaptureLeft = "";
      returnCaptureRight = "";
    } else if (retType.toNative) {
      returnCaptureLeft = "return retType.toNative.call(this, ";
      returnCaptureRight = ")";
    } else {
      returnCaptureLeft = "return ";
      returnCaptureRight = "";
    }
    const f = eval("var f = function (" + argVariableNames.join(", ") + ") { if (!this.handle.equals(handle))this.handle = handle;" + returnCaptureLeft + "implementation.call(block" + (callArgs.length > 0 ? ", " : "") + callArgs.join(", ") + ")" + returnCaptureRight + "; }; f;");
    return f.bind(block);
  }
  function rawFridaType(t) {
    return t === "object" ? "pointer" : t;
  }
  function makeClassName() {
    for (let i = 1; true; i++) {
      const name = "FridaAnonymousClass" + i;
      if (!(name in classRegistry)) {
        return name;
      }
    }
  }
  function makeProtocolName() {
    for (let i = 1; true; i++) {
      const name = "FridaAnonymousProtocol" + i;
      if (!(name in protocolRegistry)) {
        return name;
      }
    }
  }
  function objcMethodName(name) {
    return name.replace(/_/g, ":");
  }
  function jsMethodName(name) {
    let result = name.replace(/:/g, "_");
    if (objCObjectBuiltins.has(result))
      result += "2";
    return result;
  }
  const isaMasks = {
    x64: "0x7ffffffffff8",
    arm64: "0xffffffff8"
  };
  const rawMask = isaMasks[Process.arch];
  if (rawMask !== void 0) {
    const mask = ptr(rawMask);
    readObjectIsa = function(p) {
      return p.readPointer().and(mask);
    };
  } else {
    readObjectIsa = function(p) {
      return p.readPointer();
    };
  }
  function getMsgSendImpl(signature2, invocationOptions2) {
    return resolveMsgSendImpl(msgSendBySignatureId, signature2, invocationOptions2, false);
  }
  function getMsgSendSuperImpl(signature2, invocationOptions2) {
    return resolveMsgSendImpl(msgSendSuperBySignatureId, signature2, invocationOptions2, true);
  }
  function resolveMsgSendImpl(cache, signature2, invocationOptions2, isSuper) {
    if (invocationOptions2 !== defaultInvocationOptions)
      return makeMsgSendImpl(signature2, invocationOptions2, isSuper);
    const { id } = signature2;
    let impl = cache.get(id);
    if (impl === void 0) {
      impl = makeMsgSendImpl(signature2, invocationOptions2, isSuper);
      cache.set(id, impl);
    }
    return impl;
  }
  function makeMsgSendImpl(signature2, invocationOptions2, isSuper) {
    const retType2 = signature2.retType.type;
    const argTypes2 = signature2.argTypes.map(function(t) {
      return t.type;
    });
    const components = ["objc_msgSend"];
    if (isSuper)
      components.push("Super");
    const returnsStruct = retType2 instanceof Array;
    if (returnsStruct && !typeFitsInRegisters(retType2))
      components.push("_stret");
    else if (retType2 === "float" || retType2 === "double")
      components.push("_fpret");
    const name = components.join("");
    return new NativeFunction(api[name], retType2, argTypes2, invocationOptions2);
  }
  function typeFitsInRegisters(type2) {
    if (Process.arch !== "x64")
      return false;
    const size = sizeOfTypeOnX64(type2);
    return size <= 16;
  }
  function sizeOfTypeOnX64(type2) {
    if (type2 instanceof Array)
      return type2.reduce((total, field) => total + sizeOfTypeOnX64(field), 0);
    switch (type2) {
      case "bool":
      case "char":
      case "uchar":
        return 1;
      case "int16":
      case "uint16":
        return 2;
      case "int":
      case "int32":
      case "uint":
      case "uint32":
      case "float":
        return 4;
      default:
        return 8;
    }
  }
  function unparseSignature(retType2, argTypes2) {
    const retTypeId = typeIdFromAlias(retType2);
    const argTypeIds = argTypes2.map(typeIdFromAlias);
    const argSizes = argTypeIds.map((id) => singularTypeById[id].size);
    const frameSize = argSizes.reduce((total, size) => total + size, 0);
    let frameOffset = 0;
    return retTypeId + frameSize + argTypeIds.map((id, i) => {
      const result = id + frameOffset;
      frameOffset += argSizes[i];
      return result;
    }).join("");
  }
  function parseSignature(sig) {
    const cursor = [sig, 0];
    parseQualifiers(cursor);
    const retType2 = readType(cursor);
    readNumber(cursor);
    const argTypes2 = [];
    let id = JSON.stringify(retType2.type);
    while (dataAvailable(cursor)) {
      parseQualifiers(cursor);
      const argType = readType(cursor);
      readNumber(cursor);
      argTypes2.push(argType);
      id += JSON.stringify(argType.type);
    }
    return {
      id,
      retType: retType2,
      argTypes: argTypes2
    };
  }
  function parseType(type2) {
    const cursor = [type2, 0];
    return readType(cursor);
  }
  function readType(cursor) {
    let id = readChar(cursor);
    if (id === "@") {
      let next = peekChar(cursor);
      if (next === "?") {
        id += next;
        skipChar(cursor);
        if (peekChar(cursor) === "<")
          skipExtendedBlock(cursor);
      } else if (next === '"') {
        skipChar(cursor);
        readUntil('"', cursor);
      }
    } else if (id === "^") {
      let next = peekChar(cursor);
      if (next === "@") {
        id += next;
        skipChar(cursor);
      }
    }
    const type2 = singularTypeById[id];
    if (type2 !== void 0) {
      return type2;
    } else if (id === "[") {
      const length = readNumber(cursor);
      const elementType = readType(cursor);
      skipChar(cursor);
      return arrayType(length, elementType);
    } else if (id === "{") {
      if (!tokenExistsAhead("=", "}", cursor)) {
        readUntil("}", cursor);
        return structType([]);
      }
      readUntil("=", cursor);
      const structFields = [];
      let ch;
      while ((ch = peekChar(cursor)) !== "}") {
        if (ch === '"') {
          skipChar(cursor);
          readUntil('"', cursor);
        }
        structFields.push(readType(cursor));
      }
      skipChar(cursor);
      return structType(structFields);
    } else if (id === "(") {
      readUntil("=", cursor);
      const unionFields = [];
      while (peekChar(cursor) !== ")")
        unionFields.push(readType(cursor));
      skipChar(cursor);
      return unionType(unionFields);
    } else if (id === "b") {
      readNumber(cursor);
      return singularTypeById.i;
    } else if (id === "^") {
      readType(cursor);
      return singularTypeById["?"];
    } else if (modifiers.has(id)) {
      return readType(cursor);
    } else {
      throw new Error("Unable to handle type " + id);
    }
  }
  function skipExtendedBlock(cursor) {
    let ch;
    skipChar(cursor);
    while ((ch = peekChar(cursor)) !== ">") {
      if (peekChar(cursor) === "<") {
        skipExtendedBlock(cursor);
      } else {
        skipChar(cursor);
        if (ch === '"')
          readUntil('"', cursor);
      }
    }
    skipChar(cursor);
  }
  function readNumber(cursor) {
    let result = "";
    while (dataAvailable(cursor)) {
      const c = peekChar(cursor);
      const v = c.charCodeAt(0);
      const isDigit = v >= 48 && v <= 57;
      if (isDigit) {
        result += c;
        skipChar(cursor);
      } else {
        break;
      }
    }
    return parseInt(result);
  }
  function readUntil(token, cursor) {
    const buffer = cursor[0];
    const offset = cursor[1];
    const index = buffer.indexOf(token, offset);
    if (index === -1)
      throw new Error("Expected token '" + token + "' not found");
    const result = buffer.substring(offset, index);
    cursor[1] = index + 1;
    return result;
  }
  function readChar(cursor) {
    return cursor[0][cursor[1]++];
  }
  function peekChar(cursor) {
    return cursor[0][cursor[1]];
  }
  function tokenExistsAhead(token, terminator, cursor) {
    const [buffer, offset] = cursor;
    const tokenIndex = buffer.indexOf(token, offset);
    if (tokenIndex === -1)
      return false;
    const terminatorIndex = buffer.indexOf(terminator, offset);
    if (terminatorIndex === -1)
      throw new Error("Expected to find terminator: " + terminator);
    return tokenIndex < terminatorIndex;
  }
  function skipChar(cursor) {
    cursor[1]++;
  }
  function dataAvailable(cursor) {
    return cursor[1] !== cursor[0].length;
  }
  const qualifierById = {
    "r": "const",
    "n": "in",
    "N": "inout",
    "o": "out",
    "O": "bycopy",
    "R": "byref",
    "V": "oneway"
  };
  function parseQualifiers(cursor) {
    const qualifiers = [];
    while (true) {
      const q = qualifierById[peekChar(cursor)];
      if (q === void 0)
        break;
      qualifiers.push(q);
      skipChar(cursor);
    }
    return qualifiers;
  }
  const idByAlias = {
    "char": "c",
    "int": "i",
    "int16": "s",
    "int32": "i",
    "int64": "q",
    "uchar": "C",
    "uint": "I",
    "uint16": "S",
    "uint32": "I",
    "uint64": "Q",
    "float": "f",
    "double": "d",
    "bool": "B",
    "void": "v",
    "string": "*",
    "object": "@",
    "block": "@?",
    "class": "#",
    "selector": ":",
    "pointer": "^v"
  };
  function typeIdFromAlias(alias) {
    if (typeof alias === "object" && alias !== null)
      return `@"${alias.type}"`;
    const id = idByAlias[alias];
    if (id === void 0)
      throw new Error("No known encoding for type " + alias);
    return id;
  }
  const fromNativeId = function(h) {
    if (h.isNull()) {
      return null;
    } else if (h.toString(16) === this.handle.toString(16)) {
      return this;
    } else {
      return new ObjCObject(h);
    }
  };
  const toNativeId = function(v) {
    if (v === null)
      return NULL;
    const type2 = typeof v;
    if (type2 === "string") {
      if (cachedNSStringCtor === null) {
        cachedNSString = classRegistry.NSString;
        cachedNSStringCtor = cachedNSString.stringWithUTF8String_;
      }
      return cachedNSStringCtor.call(cachedNSString, Memory.allocUtf8String(v));
    } else if (type2 === "number") {
      if (cachedNSNumberCtor === null) {
        cachedNSNumber = classRegistry.NSNumber;
        cachedNSNumberCtor = cachedNSNumber.numberWithDouble_;
      }
      return cachedNSNumberCtor.call(cachedNSNumber, v);
    }
    return v;
  };
  const fromNativeBlock = function(h) {
    if (h.isNull()) {
      return null;
    } else if (h.toString(16) === this.handle.toString(16)) {
      return this;
    } else {
      return new Block(h);
    }
  };
  const toNativeBlock = function(v) {
    return v !== null ? v : NULL;
  };
  const toNativeObjectArray = function(v) {
    if (v instanceof Array) {
      const length = v.length;
      const array = Memory.alloc(length * pointerSize);
      for (let i = 0; i !== length; i++)
        array.add(i * pointerSize).writePointer(toNativeId(v[i]));
      return array;
    }
    return v;
  };
  function arrayType(length, elementType) {
    return {
      type: "pointer",
      read(address) {
        const result = [];
        const elementSize = elementType.size;
        for (let index = 0; index !== length; index++) {
          result.push(elementType.read(address.add(index * elementSize)));
        }
        return result;
      },
      write(address, values) {
        const elementSize = elementType.size;
        values.forEach((value2, index) => {
          elementType.write(address.add(index * elementSize), value2);
        });
      }
    };
  }
  function structType(fieldTypes) {
    let fromNative, toNative;
    if (fieldTypes.some(function(t) {
      return !!t.fromNative;
    })) {
      const fromTransforms = fieldTypes.map(function(t) {
        if (t.fromNative)
          return t.fromNative;
        else
          return identityTransform;
      });
      fromNative = function(v) {
        return v.map(function(e, i) {
          return fromTransforms[i].call(this, e);
        });
      };
    } else {
      fromNative = identityTransform;
    }
    if (fieldTypes.some(function(t) {
      return !!t.toNative;
    })) {
      const toTransforms = fieldTypes.map(function(t) {
        if (t.toNative)
          return t.toNative;
        else
          return identityTransform;
      });
      toNative = function(v) {
        return v.map(function(e, i) {
          return toTransforms[i].call(this, e);
        });
      };
    } else {
      toNative = identityTransform;
    }
    const [totalSize, fieldOffsets] = fieldTypes.reduce(function(result, t) {
      const [previousOffset, offsets] = result;
      const { size } = t;
      const offset = align(previousOffset, size);
      offsets.push(offset);
      return [offset + size, offsets];
    }, [0, []]);
    return {
      type: fieldTypes.map((t) => t.type),
      size: totalSize,
      read(address) {
        return fieldTypes.map((type2, index) => type2.read(address.add(fieldOffsets[index])));
      },
      write(address, values) {
        values.forEach((value2, index) => {
          fieldTypes[index].write(address.add(fieldOffsets[index]), value2);
        });
      },
      fromNative,
      toNative
    };
  }
  function unionType(fieldTypes) {
    const largestType = fieldTypes.reduce(function(largest, t) {
      if (t.size > largest.size)
        return t;
      else
        return largest;
    }, fieldTypes[0]);
    let fromNative, toNative;
    if (largestType.fromNative) {
      const fromTransform = largestType.fromNative;
      fromNative = function(v) {
        return fromTransform.call(this, v[0]);
      };
    } else {
      fromNative = function(v) {
        return v[0];
      };
    }
    if (largestType.toNative) {
      const toTransform = largestType.toNative;
      toNative = function(v) {
        return [toTransform.call(this, v)];
      };
    } else {
      toNative = function(v) {
        return [v];
      };
    }
    return {
      type: [largestType.type],
      size: largestType.size,
      read: largestType.read,
      write: largestType.write,
      fromNative,
      toNative
    };
  }
  const longBits = pointerSize == 8 && Process.platform !== "windows" ? 64 : 32;
  modifiers = /* @__PURE__ */ new Set([
    "j",
    // complex
    "A",
    // atomic
    "r",
    // const
    "n",
    // in
    "N",
    // inout
    "o",
    // out
    "O",
    // by copy
    "R",
    // by ref
    "V",
    // one way
    "+"
    // GNU register
  ]);
  singularTypeById = {
    "c": {
      type: "char",
      size: 1,
      read: (address) => address.readS8(),
      write: (address, value2) => {
        address.writeS8(value2);
      },
      toNative(v) {
        if (typeof v === "boolean") {
          return v ? 1 : 0;
        }
        return v;
      }
    },
    "i": {
      type: "int",
      size: 4,
      read: (address) => address.readInt(),
      write: (address, value2) => {
        address.writeInt(value2);
      }
    },
    "s": {
      type: "int16",
      size: 2,
      read: (address) => address.readS16(),
      write: (address, value2) => {
        address.writeS16(value2);
      }
    },
    "l": {
      type: "int32",
      size: 4,
      read: (address) => address.readS32(),
      write: (address, value2) => {
        address.writeS32(value2);
      }
    },
    "q": {
      type: "int64",
      size: 8,
      read: (address) => address.readS64(),
      write: (address, value2) => {
        address.writeS64(value2);
      }
    },
    "C": {
      type: "uchar",
      size: 1,
      read: (address) => address.readU8(),
      write: (address, value2) => {
        address.writeU8(value2);
      }
    },
    "I": {
      type: "uint",
      size: 4,
      read: (address) => address.readUInt(),
      write: (address, value2) => {
        address.writeUInt(value2);
      }
    },
    "S": {
      type: "uint16",
      size: 2,
      read: (address) => address.readU16(),
      write: (address, value2) => {
        address.writeU16(value2);
      }
    },
    "L": {
      type: "uint" + longBits,
      size: longBits / 8,
      read: (address) => address.readULong(),
      write: (address, value2) => {
        address.writeULong(value2);
      }
    },
    "Q": {
      type: "uint64",
      size: 8,
      read: (address) => address.readU64(),
      write: (address, value2) => {
        address.writeU64(value2);
      }
    },
    "f": {
      type: "float",
      size: 4,
      read: (address) => address.readFloat(),
      write: (address, value2) => {
        address.writeFloat(value2);
      }
    },
    "d": {
      type: "double",
      size: 8,
      read: (address) => address.readDouble(),
      write: (address, value2) => {
        address.writeDouble(value2);
      }
    },
    "B": {
      type: "bool",
      size: 1,
      read: (address) => address.readU8(),
      write: (address, value2) => {
        address.writeU8(value2);
      },
      fromNative(v) {
        return v ? true : false;
      },
      toNative(v) {
        return v ? 1 : 0;
      }
    },
    "v": {
      type: "void",
      size: 0
    },
    "*": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      },
      fromNative(h) {
        return h.readCString();
      }
    },
    "@": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      },
      fromNative: fromNativeId,
      toNative: toNativeId
    },
    "@?": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      },
      fromNative: fromNativeBlock,
      toNative: toNativeBlock
    },
    "^@": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      },
      toNative: toNativeObjectArray
    },
    "^v": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      }
    },
    "#": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      },
      fromNative: fromNativeId,
      toNative: toNativeId
    },
    ":": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      }
    },
    "?": {
      type: "pointer",
      size: pointerSize,
      read: (address) => address.readPointer(),
      write: (address, value2) => {
        address.writePointer(value2);
      }
    }
  };
  function identityTransform(v) {
    return v;
  }
  function align(value2, boundary) {
    const remainder = value2 % boundary;
    return remainder === 0 ? value2 : value2 + (boundary - remainder);
  }
}
var runtime = new Runtime2();
var frida_objc_bridge_default = runtime;

// agents/frida/swift_agent.ts
var refs = /* @__PURE__ */ new Map();
var hooks = /* @__PURE__ */ new Map();
var session = "";
var serial = 0;
var ttl = 6e4;
var disposing = false;
var timer = null;
var sweepPending = false;
var scope = [];
var typeCache = /* @__PURE__ */ new Map();
var arc = null;
function ownership() {
  if (!arc) {
    const module = Process.getModuleByName("libswiftCore.dylib");
    arc = {
      retain: new NativeFunction(module.getExportByName("swift_retain"), "pointer", ["pointer"]),
      release: new NativeFunction(module.getExportByName("swift_release"), "void", ["pointer"])
    };
  }
  return arc;
}
var main = (work) => new Promise((resolve, reject) => {
  const run = () => {
    try {
      resolve(work());
    } catch (error) {
      reject(error);
    }
  };
  if (frida_objc_bridge_default.available)
    frida_objc_bridge_default.schedule(frida_objc_bridge_default.mainQueue, run);
  else
    run();
});
function pointer(address, executable = false) {
  const p = ptr(address), range = Process.findRangeByAddress(p.strip());
  const readableData = !executable && !range && !p.isNull() && p.readVolatile(1) !== null;
  if (p.isNull() || !(range?.protection.includes(executable ? "x" : "r") || readableData))
    throw new Error("Address is not mapped with the required protection");
  return p;
}
function object(id) {
  const ref = refs.get(id);
  if (!ref || ref.expires <= Date.now() && !ref.uses)
    throw new Error("Swift object handle expired; observe a fresh address");
  ref.expires = Date.now() + ttl;
  return ref.value;
}
function sweep(all = false) {
  for (const [id, ref] of refs)
    if (all || !ref.uses && ref.expires <= Date.now()) {
      ownership().release(ref.value.handle);
      refs.delete(id);
    }
}
function retain(value2) {
  for (const [id2, ref] of refs)
    if (ref.value.handle.equals(value2.handle)) {
      ref.expires = Date.now() + ttl;
      return id2;
    }
  if (refs.size >= 128)
    throw new Error("Swift handle limit reached; release handles or wait for expiry");
  const id = session + ".swift." + ++serial;
  ownership().retain(value2.handle);
  refs.set(id, { value: value2, expires: Date.now() + ttl, uses: 0 });
  return id;
}
function summary(value2, keep = true) {
  if (value2 == null || typeof value2 === "number" || typeof value2 === "boolean")
    return value2 ?? null;
  if (typeof value2 === "string")
    return value2.slice(0, 512);
  if (value2.$metadata && value2.handle) {
    const type2 = value2.$metadata.getFullTypeName(), p = value2.handle;
    const scalar = {
      "Swift.Bool": () => !!p.readU8(),
      "Swift.Int": () => p.readS64().toString(),
      "Swift.UInt": () => p.readU64().toString(),
      "Swift.Int8": () => p.readS8(),
      "Swift.UInt8": () => p.readU8(),
      "Swift.Int16": () => p.readS16(),
      "Swift.UInt16": () => p.readU16(),
      "Swift.Int32": () => p.readS32(),
      "Swift.UInt32": () => p.readU32(),
      "Swift.Int64": () => p.readS64().toString(),
      "Swift.UInt64": () => p.readU64().toString(),
      "Swift.Float": () => p.readFloat(),
      "Swift.Double": () => p.readDouble()
    };
    if (scalar[type2])
      return { type_name: type2, value: scalar[type2]() };
    if (value2 instanceof dist_default.Object)
      return {
        type_name: type2,
        address: p.toString(),
        ...keep ? { object_id: retain(value2), expires_in_ms: ttl } : { borrowed: true }
      };
    return {
      type_name: type2,
      kind: value2 instanceof dist_default.Enum ? "enum" : "struct",
      borrowed: true,
      ...value2 instanceof dist_default.Enum ? { tag: value2.$tag } : {}
    };
  }
  return String(value2).slice(0, 512);
}
function type(name) {
  if (["void", "pointer", "bool", "int", "uint", "int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "long", "ulong"].includes(name))
    return name;
  if (["float", "double", "Swift.Float", "Swift.Double"].includes(name) || /[<>]/.test(name))
    throw new Error("This Swift ABI signature is unsupported; use LLDB/IDA to resolve a supported specialization");
  if (typeCache.has(name))
    return typeCache.get(name);
  const matches = getAllFullTypeData().filter((d) => d.descriptor.getFullTypeName() === name || d.descriptor.name === name);
  if (matches.length > 1)
    throw new Error("Ambiguous Swift type; use the module-qualified name");
  let found;
  if (matches.length) {
    const item = matches[0], kind = item.descriptor.getKind();
    found = kind === 16 ? new Class(item.descriptor, {}) : kind === 17 ? new Struct(item.descriptor, {}) : new Enum(item.descriptor, {});
  } else {
    const protocol = getAllProtocolDescriptors().find((d) => d.getFullProtocolName() === name || d.name === name);
    if (protocol)
      found = new Protocol(protocol);
  }
  if (!found)
    throw new Error("Unknown Swift type in selected images: " + name);
  typeCache.set(name, found);
  return found;
}
function value(raw, declared) {
  if (raw && typeof raw === "object") {
    if (raw.object_id) {
      const held = object(raw.object_id);
      return declared.kind === "Class" && !(held instanceof dist_default.Object) ? new dist_default.Object(held.handle) : held;
    }
    if (raw.address) {
      const p = pointer(raw.address);
      if (declared.kind === "Class")
        return new dist_default.Object(p);
      if (declared.kind === "Struct")
        return new dist_default.Struct(declared, { handle: p });
      if (declared.kind === "Enum")
        return new dist_default.Enum(declared, { handle: p });
      return p;
    }
    if (raw.raw && declared.kind === "Struct")
      return new dist_default.Struct(declared, { raw: raw.raw });
    throw new Error("Argument requires object_id, address or raw struct words");
  }
  if (typeof declared !== "string")
    throw new Error("Swift values require a typed object/address/raw argument");
  if (declared === "pointer")
    return ptr(raw);
  return raw;
}
function types2(args) {
  const kinds = args.kind === "all" ? ["classes", "structs", "enums", "protocols"] : [args.kind];
  const items = [];
  let total = 0;
  const entries = getAllFullTypeData().map((d) => ({
    descriptor: d.descriptor,
    kind: { 16: "classes", 17: "structs", 18: "enums" }[d.descriptor.getKind()]
  }));
  if (kinds.includes("protocols"))
    entries.push(...getAllProtocolDescriptors().map((d) => ({ descriptor: d, kind: "protocols" })));
  for (const { descriptor, kind } of entries) {
    if (!kinds.includes(kind))
      continue;
    const module = descriptor.getModuleContext().name;
    const name = kind === "protocols" ? descriptor.getFullProtocolName() : descriptor.getFullTypeName();
    if (args.module && module !== args.module || args.query && !name.toLowerCase().includes(args.query.toLowerCase()))
      continue;
    if (total++ < args.offset || items.length >= args.limit)
      continue;
    const row = { name, module, kind };
    if (args.detail) {
      const entry = type(name);
      row.fields = (entry.$fields || []).slice(0, args.member_limit);
      row.methods = (entry.$methods || []).slice(0, args.member_limit).map((m2) => ({ name: m2.name, kind: m2.type, address: m2.address.toString() }));
      row.members_truncated = (entry.$fields?.length || 0) > args.member_limit || (entry.$methods?.length || 0) > args.member_limit;
    }
    items.push(row);
  }
  return {
    items,
    total,
    next_offset: args.offset + items.length < total ? args.offset + items.length : null,
    scope: vesperScope()
  };
}
function inspect(args) {
  const held = args.object_id ? object(args.object_id) : null;
  const p = held?.handle || pointer(args.address);
  let instance = held, metadata;
  if (args.kind === "struct" || args.kind === "enum") {
    const declared = type(args.type_name);
    if (declared.kind !== (args.kind === "struct" ? "Struct" : "Enum"))
      throw new Error("Declared type kind does not match storage");
    instance = args.kind === "struct" ? new dist_default.Struct(declared, { handle: p }) : new dist_default.Enum(declared, { handle: p });
    metadata = instance.$metadata;
  } else {
    metadata = held?.$metadata || TargetMetadata.from(pointer(p.readPointer().strip().toString()));
    if (!metadata.isClassObject())
      throw new Error("Address is not a Swift class instance");
  }
  const result = { type_name: metadata.getFullTypeName(), address: p.toString(), observed: true };
  if (args.field_names.length) {
    if (args.kind !== "class")
      throw new Error("Struct/enum accessor calls require an explicit typed function signature");
    if (!(instance instanceof dist_default.Object))
      instance = new dist_default.Object(p);
    result.values = {};
    for (const name of args.field_names) {
      const getter = Object.getOwnPropertyDescriptor(instance, name)?.get;
      try {
        result.values[name] = getter ? summary(getter.call(instance)) : { unavailable: "No supported Swift getter; use a typed call or LLDB locals" };
      } catch (error) {
        result.values[name] = { unavailable: String(error).slice(0, 256) };
      }
    }
  }
  if (args.keep_reference && args.kind === "class") {
    result.object_id = retain(instance || { handle: p, $metadata: metadata });
    result.expires_in_ms = ttl;
  }
  if (args.max_bytes) {
    const size = args.kind === "class" ? args.max_bytes : Math.min(args.max_bytes, metadata.getTypeLayout().size);
    const data = p.readByteArray(size);
    result.bytes_hex = data ? Array.from(new Uint8Array(data), (x) => x.toString(16).padStart(2, "0")).join("") : "";
  }
  if (args.kind === "enum")
    result.tag = instance.$tag;
  if (args.kind !== "class")
    result.value = summary(instance, false);
  return result;
}
function call(args) {
  const declared = args.argument_types.map(type);
  const context = args.context_id ? object(args.context_id).handle : args.context_address ? pointer(args.context_address) : void 0;
  const fn = dist_default.NativeFunction(pointer(args.address, true), type(args.return_type), declared, context, args.throws);
  return { value: summary(fn(...args.arguments.map((v, i) => value(v, declared[i])))), performed: true };
}
function trace(args) {
  if (hooks.size >= 16)
    throw new Error("Swift trace limit reached; untrace an existing hook");
  const hookId = session + ".swift_hook." + ++serial;
  let count = 0, last = 0;
  const listener = dist_default.Interceptor.attach(pointer(args.address, true), {
    onEnter(values) {
      const now = Date.now();
      if (disposing || count >= args.max_events || now - last < 1e3 / args.rate_limit)
        return;
      last = now;
      count++;
      try {
        send({
          type: "swift_call",
          hook_id: hookId,
          thread_id: this.threadId,
          arguments: values.slice(0, args.max_arguments).map((v) => summary(v, args.capture_references))
        });
      } catch (error) {
        send({ type: "swift_trace_error", hook_id: hookId, error: String(error).slice(0, 256) });
      }
    }
  });
  hooks.set(hookId, listener);
  return { hook_id: hookId, active: true };
}
rpc.exports = {
  async dispatch(name, args) {
    const protectedRefs = [];
    try {
      if (name === "initialize") {
        session = args.session_id;
        ttl = args.ttl * 1e3;
        scope = args.images?.length ? args.images : [Process.mainModule.name, "libswiftCore.dylib"];
        configureVesperImages(scope, args.max_types);
        timer = setInterval(() => {
          if (!refs.size || sweepPending || disposing)
            return;
          sweepPending = true;
          main(() => sweep()).catch(() => {
          }).finally(() => {
            sweepPending = false;
          });
        }, 1e3);
        return { initialized: true };
      }
      if (name === "dispose") {
        disposing = true;
        if (timer)
          clearInterval(timer);
        for (const hook of hooks.values())
          hook.detach();
        hooks.clear();
        await main(() => sweep(true));
        return { disposed: true };
      }
      if (!session || disposing)
        throw new Error("Swift session is unavailable");
      if (args.images?.length && JSON.stringify(args.images) !== JSON.stringify(scope))
        throw new Error("Swift images are fixed for this backend; action=reset before changing scope");
      if (!Process.findModuleByName("libswiftCore.dylib") || Process.arch !== "arm64" || Process.platform !== "darwin")
        throw new Error("Swift runtime unavailable; use Objective-C/runtime_native or static IDA analysis");
      for (const id of [args.object_id, args.context_id, ...(args.arguments || []).map((a) => a?.object_id)].filter(Boolean)) {
        const ref = refs.get(id);
        if (ref && ref.expires > Date.now()) {
          ref.uses++;
          protectedRefs.push(ref);
        } else
          throw new Error("Swift object handle expired; observe a fresh address");
      }
      if (args.action === "types")
        return types2(args);
      if (args.action === "untrace") {
        const hook = hooks.get(args.hook_id);
        if (!hook)
          throw new Error("Unknown Swift hook");
        hook.detach();
        hooks.delete(args.hook_id);
        return { hook_id: args.hook_id, active: false };
      }
      if (args.action === "release") {
        for (const id of args.object_ids) {
          const ref = refs.get(id);
          if (ref)
            ref.expires = 0;
        }
        await main(() => sweep());
        return { retained_objects: refs.size };
      }
      const work = () => {
        if (args.action === "inspect")
          return inspect(args);
        if (args.action === "call")
          return call(args);
        if (args.action === "trace")
          return trace(args);
        throw new Error("Unknown Swift action");
      };
      return args.main_thread ? await main(work) : work();
    } catch (error) {
      return { agent_error: error instanceof Error ? error.message : String(error), code: "SWIFT_ERROR" };
    } finally {
      for (const ref of protectedRefs) {
        ref.uses--;
        ref.expires = Date.now() + ttl;
      }
    }
  }
};
