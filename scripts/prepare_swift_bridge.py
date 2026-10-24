"""Apply Vesper's narrow lazy/scoped patch to the pinned Apache-2.0 bridge.

No full-process import-time metadata scan, automatic protocol-conformance scan,
or eager CoreSymbolication initialization. Reproducible after every npm ci.
"""
from pathlib import Path

PATCH = '''// VESPER_SCOPED_SWIFT: modified for explicit, bounded image discovery.
let vesperImages = null;
let vesperBudget = 0;
let vesperParsed = false;
let vesperTruncated = false;
export function configureVesperImages(names, maximum) {
    if (vesperImages !== null) throw new Error("Swift image scope is already configured; reset the backend to change it");
    vesperImages = names;
    vesperBudget = maximum;
}
export function vesperScope() {
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
        if (vesperBudget <= 0) { vesperTruncated = true; break; }
    }
    // Protocol conformances require broad symbolication and are not part of
    // Vesper's default parameter/automation workflow. Do not scan them here.
}
'''


def prepare(root: Path) -> None:
    import json
    package = root / 'node_modules/frida-swift-bridge'
    if json.loads((package / 'package.json').read_text())['version'] != '3.0.2':
        raise RuntimeError('Review the scoped bridge patch before changing frida-swift-bridge 3.0.2')
    macho = package / 'dist/lib/macho.js'
    source = macho.read_text()
    if 'VESPER_SCOPED_SWIFT' not in source:
        start = source.index('/* XXX: Ugly hack(TM) until we lazily-parse MachOs */')
        end = source.index('export function getAllFullTypeData()', start)
        source = source[:start] + PATCH + source[end:]
        for function in ['getAllFullTypeData()', 'untypedMetadataFor(typeName)', 'metadataFor(typeName, c)',
                         'getProtocolConformancesFor(typeName)', 'getAllProtocolDescriptors()',
                         'findProtocolDescriptor(protoName)', 'getProtocolDescriptor(protoName)']:
            anchor = 'export function ' + function + ' {'
            if anchor not in source:
                raise RuntimeError('Unexpected Swift bridge metadata entry point: ' + function)
            source = source.replace(anchor, anchor + '\n    ensureVesperRegistry();', 1)
        source = source.replace('i < nTypes; i++', 'i < nTypes && vesperBudget > 0; i++, vesperBudget--')
        source = source.replace('i < numProtos; i++', 'i < numProtos && vesperBudget > 0; i++, vesperBudget--')
        macho.write_text(source)
    entry = package / 'dist/index.js'
    source = entry.read_text()
    start = source.index('    constructor() {')
    end = source.index('    get available()', start)
    source = source[:start] + '    constructor() {} // Vesper: initialize only for explicit typed operations.\n' + source[end:]
    entry.write_text(source)
