const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('Swift ARC references survive an active call and release on expiry/reset', async () => {
  let now = 1000, retains = 0, releases = 0, configured = 0;
  const timers = new Map(), rpc = {};
  const metadata = { isClassObject: () => true, getFullTypeName: () => 'Fixture.Model' };
  const pointer = value => ({ toString: () => String(value), isNull: () => false, strip() { return this; },
    equals: other => other.toString() === String(value), readPointer: () => pointer('0x2000') });
  class ObjectInstance {}
  class StructValue {}
  class EnumValue {}
  const swift = { Object: ObjectInstance, Struct: StructValue, Enum: EnumValue,
    NativeFunction: () => () => { now += 5000; timers.get(1)(); return 7; } };
  const module = { getExportByName: name => name };
  const process = { mainModule: { name: 'Fixture' }, arch: 'arm64', platform: 'darwin',
    findModuleByName: () => module, getModuleByName: () => module, findRangeByAddress: () => ({ protection: 'r-x' }) };
  function NativeFunction(name) {
    return name === 'swift_retain' ? () => { retains++; } : () => { releases++; };
  }
  const source = fs.readFileSync(path.join(__dirname, '../agents/frida/swift_agent.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', 'rpc', 'Process', 'ptr', 'NativeFunction', 'setInterval', 'clearInterval', 'Date', js)(name => {
    if (name === 'frida-swift-bridge') return { default: swift };
    if (name === 'frida-objc-bridge') return { default: { available: true, mainQueue: 'main', schedule: (queue, work) => work() } };
    if (name.endsWith('/metadata.js')) return { TargetMetadata: { from: () => metadata } };
    if (name.endsWith('/macho.js')) return { configureVesperImages: () => configured++ };
    if (name.endsWith('/types.js')) return {};
    throw Error(name);
  }, {}, rpc, process, pointer, NativeFunction, fn => { timers.set(1, fn); return 1; }, id => timers.delete(id), { now: () => now });
  const dispatch = rpc.exports.dispatch;
  await dispatch('initialize', { session_id: 'process_fixture', ttl: 1, images: [], max_types: 100 });
  assert.equal(configured, 1); assert.equal(retains, 0);
  const observed = await dispatch('swift_runtime', { action: 'inspect', kind: 'class', address: '0x1000', field_names: [], keep_reference: true, main_thread: true });
  assert.equal(retains, 1); assert.equal(releases, 0);
  const call = await dispatch('swift_runtime', { action: 'call', address: '0x3000', return_type: 'int', argument_types: [], arguments: [], context_id: observed.object_id, main_thread: true });
  assert.equal(call.value, 7); assert.equal(releases, 0);
  now += 2000; timers.get(1)();
  await Promise.resolve();
  assert.equal(releases, 1);
  const expired = await dispatch('swift_runtime', { action: 'inspect', kind: 'class', object_id: observed.object_id, field_names: [], main_thread: true });
  assert.match(expired.agent_error, /expired/);
  await dispatch('swift_runtime', { action: 'inspect', kind: 'class', address: '0x1000', field_names: [], keep_reference: true });
  await dispatch('dispose', {});
  assert.equal(releases, 2); assert.equal(timers.size, 0);
});
