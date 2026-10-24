from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field, model_validator

from vesper.app import Application
from vesper.config import StrictModel
from vesper.tools.models import AppRequest
from vesper.tools.swift import Address

NativeType = Literal['void', 'pointer', 'bool', 'int', 'uint', 'int8', 'uint8', 'int16', 'uint16',
                     'int32', 'uint32', 'int64', 'uint64', 'long', 'ulong', 'size_t', 'ssize_t', 'float', 'double']


class Argument(StrictModel):
    address: Address | None = None
    utf8: str | None = Field(default=None, max_length=4096)

    @model_validator(mode='after')
    def source(self) -> Argument:
        if (self.address is None) == (self.utf8 is None):
            raise ValueError('Choose address or utf8')
        if self.utf8 is not None and '\x00' in self.utf8:
            raise ValueError('C strings cannot contain NUL')
        return self


class Member(StrictModel):
    name: str = Field(min_length=1, max_length=128)
    offset: int = Field(ge=0, le=1024 * 1024)
    type: NativeType | Literal['utf8']
    max_length: int = Field(default=128, ge=1, le=512)

    @model_validator(mode='after')
    def readable(self) -> Member:
        if self.type == 'void':
            raise ValueError('A field cannot have type void')
        return self


class NativeRequest(AppRequest):
    action: Literal['symbols', 'inspect', 'read', 'write', 'call', 'trace', 'untrace']
    module: str | None = Field(default=None, min_length=1, max_length=255)
    symbol: str | None = Field(default=None, min_length=1, max_length=1024)
    address: Address | None = None
    query: str | None = Field(default=None, max_length=255)
    include_private: bool = False
    offset: int = Field(default=0, ge=0, le=1000000)
    limit: int = Field(default=20, ge=1, le=100)
    fields: list[Member] = Field(default=[], max_length=32)
    max_bytes: int = Field(default=64, ge=1, le=512)
    bytes_hex: str | None = Field(default=None, min_length=2, max_length=1024, pattern=r'^(?:[0-9a-fA-F]{2})+$')
    argument_types: list[NativeType] = Field(default=[], max_length=16)
    arguments: list[int | float | bool | Annotated[str, Field(max_length=128)] | Argument] = Field(default=[], max_length=16)
    return_type: NativeType = 'void'
    main_thread: bool = True
    hook_id: str | None = Field(default=None, max_length=255)
    rate_limit: int = Field(default=10, ge=1, le=100)
    max_events: int = Field(default=100, ge=1, le=1000)

    @model_validator(mode='after')
    def operation(self) -> NativeRequest:
        if self.action == 'symbols' and not self.module:
            raise ValueError('symbols requires module to avoid a whole-process symbol dump')
        if self.action in {'inspect', 'read', 'write'} and not self.address:
            raise ValueError('Memory operations require an observed address')
        if self.action == 'inspect' and not self.fields:
            raise ValueError('inspect requires selected fields with known offsets/types')
        if self.action in {'call', 'trace'} and not (bool(self.address) != bool(self.module and self.symbol)):
            raise ValueError('Choose function address or module+symbol')
        if self.action == 'call' and len(self.arguments) != len(self.argument_types):
            raise ValueError('Every argument needs an explicit C ABI type')
        if 'void' in self.argument_types:
            raise ValueError('void is only a return type')
        if self.action == 'write' and not self.bytes_hex:
            raise ValueError('write requires bytes_hex')
        if self.action == 'untrace' and not self.hook_id:
            raise ValueError('untrace requires hook_id')
        if self.action == 'trace' and any(t in {'float', 'double'} for t in [*self.argument_types, self.return_type]):
            raise ValueError('Use LLDB for floating point register tracing')
        return self


def register(app: Application) -> None:
    async def native(request: NativeRequest) -> dict[str, Any]:
        app.permissions.device(request.device_id, request.bundle_id)
        attached = await app.frida.attach(request.device_id, request.bundle_id)
        result = await app.frida.rpc(request.device_id, attached['session_id'], 'native_runtime',
            request.model_dump(exclude={'device_id', 'bundle_id'}))
        return {'session_id': attached['session_id'], 'reused': attached.get('reused', False), **result}

    app.tools.add('runtime_native', NativeRequest, native,
        'Bounded native C/C++ symbols, selected fields at known offsets, memory read/write, explicit C ABI calls '
        'and argument/return traces. For C++ members supply this as the explicit first pointer argument. '
        'No guessed Swift/C++ ABI or variadic signature. Trace events use frida_get_events; stop with action=untrace. '
        'Return values/addresses are borrowed; C strings supplied as arguments live only through the call. '
        'main_thread=true by default for UIKit-related calls.', read_only=False)
