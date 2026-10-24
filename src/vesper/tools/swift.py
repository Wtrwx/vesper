from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field, model_validator

from vesper.app import Application
from vesper.config import StrictModel
from vesper.tools.models import AppRequest

Address = Annotated[str, Field(pattern=r'^0x[0-9a-fA-F]{1,16}$')]
TypeName = Annotated[str, Field(min_length=1, max_length=255)]


class Value(StrictModel):
    object_id: str | None = Field(default=None, max_length=255)
    address: Address | None = None
    raw: list[int] | None = Field(default=None, min_length=1, max_length=8)

    @model_validator(mode='after')
    def source(self) -> Value:
        if sum(v is not None for v in (self.object_id, self.address, self.raw)) != 1:
            raise ValueError('Choose object_id, address or raw struct words')
        return self


class SwiftRequest(AppRequest):
    action: Literal['capabilities', 'types', 'inspect', 'call', 'trace', 'untrace', 'release', 'reset']
    images: list[TypeName] = Field(default=[], max_length=8, description='Mach-O image names; fixed at first load. Defaults to main executable + libswiftCore.dylib. Reset before changing.')
    max_types: int = Field(default=1000, ge=1, le=5000)
    kind: Literal['all', 'classes', 'structs', 'enums', 'protocols', 'class', 'struct', 'enum'] = 'all'
    query: str | None = Field(default=None, max_length=255)
    module: str | None = Field(default=None, max_length=255)
    offset: int = Field(default=0, ge=0, le=1000000)
    limit: int = Field(default=20, ge=1, le=100)
    detail: bool = False
    member_limit: int = Field(default=20, ge=1, le=100)
    address: Address | None = None
    object_id: str | None = Field(default=None, max_length=255)
    type_name: TypeName | None = None
    field_names: list[TypeName] = Field(default=[], max_length=20)
    keep_reference: bool = False
    max_bytes: int = Field(default=0, ge=0, le=512)
    main_thread: bool = True
    argument_types: list[TypeName] = Field(default=[], max_length=16)
    arguments: list[int | float | bool | Annotated[str, Field(max_length=512)] | Value] = Field(default=[], max_length=16)
    return_type: TypeName = 'void'
    context_id: str | None = Field(default=None, max_length=255)
    context_address: Address | None = None
    throws: bool = False
    hook_id: str | None = Field(default=None, max_length=255)
    rate_limit: int = Field(default=10, ge=1, le=100)
    max_events: int = Field(default=100, ge=1, le=1000)
    max_arguments: int = Field(default=8, ge=0, le=16)
    capture_references: bool = False
    object_ids: list[TypeName] = Field(default=[], max_length=128)

    @model_validator(mode='after')
    def operation(self) -> SwiftRequest:
        if self.action == 'types' and self.kind not in {'all', 'classes', 'structs', 'enums', 'protocols'}:
            raise ValueError('types kind must be all/classes/structs/enums/protocols')
        if self.action == 'inspect':
            if bool(self.address) == bool(self.object_id):
                raise ValueError('inspect requires one address or object_id')
            if self.kind not in {'class', 'struct', 'enum'}:
                raise ValueError('inspect requires kind=class/struct/enum')
            if self.kind in {'struct', 'enum'} and not self.type_name:
                raise ValueError('Value storage requires type_name')
        if self.action in {'call', 'trace'} and not self.address:
            raise ValueError('call/trace requires an observed function address')
        if self.action == 'call' and len(self.arguments) != len(self.argument_types):
            raise ValueError('Every argument needs an explicit ABI type')
        if self.action == 'call' and 'void' in self.argument_types:
            raise ValueError('void is only a return type')
        if self.context_id and self.context_address:
            raise ValueError('Choose context_id or context_address')
        if self.action == 'untrace' and not self.hook_id:
            raise ValueError('untrace requires hook_id')
        if self.action == 'release' and not self.object_ids:
            raise ValueError('release requires object_ids')
        return self


def register(app: Application) -> None:
    async def swift(request: SwiftRequest) -> dict[str, Any]:
        app.permissions.device(request.device_id, request.bundle_id)
        attached = await app.frida.attach(request.device_id, request.bundle_id)
        result = await app.frida.rpc(request.device_id, attached['session_id'], 'swift_runtime',
            request.model_dump(exclude={'device_id', 'bundle_id'}))
        return {'session_id': attached['session_id'], 'reused': attached.get('reused', False), **result}

    app.tools.add('swift_runtime', SwiftRequest, swift,
        'Lazy experimental Swift bridge on the existing Frida session, scoped to selected images with a type budget. '
        'capabilities does not load the bridge. reset unloads Swift hooks/ARC references and permits a new image scope. Query bounded type metadata; '
        'inspect an observed class/struct/enum address and explicitly selected getter values; call a function '
        'with an explicit Swift ABI signature/context; trace typed arguments into frida_get_events. '
        'No pure-Swift heap scan or assumed generic/async ABI. ARC handles expire and can be released. '
        'Metadata only by default; no implicit getters or raw memory dump.', read_only=False)
