"""Extrai a API do pyray REAL (raylib-python-cffi) para o motor Raylib do Estúdio.

Rode no venv da referência (pip install raylib==6.0.1.0):

    python scripts/raylib/dump-api.py src/runtime/python/raylib/api-reference.json

O resultado é a fonte de verdade de nomes, parâmetros, tipos em C, structs, enums e cores.
Os nomes dos parâmetros vêm do stub do pacote (o cffi não guarda nomes); os tipos vêm do cffi.
"""
import ast
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from biome_format import biome_format  # noqa: E402

import pyray
import raylib
from raylib import ffi, rl
from raylib import colors as rcolors
from raylib import defines as rdefines
from raylib import enums as renums

STUB = Path(pyray.__file__).with_name('__init__.pyi')


def c_kind(ctype):
    """Um nome curto e estável para o tipo C de um parâmetro ou campo."""
    kind = ctype.kind
    if kind == 'primitive':
        name = ctype.cname
        if name in ('float', 'double'):
            return 'float'
        if name == '_Bool':
            return 'bool'
        if name in ('unsigned char',):
            return 'uchar'
        if name in ('char',):
            return 'char'
        if name.startswith('unsigned'):
            return 'uint'
        return 'int'
    if kind == 'struct':
        return 'struct:' + ctype.cname.replace('struct ', '')
    if kind == 'pointer':
        item = ctype.item
        if item.kind == 'primitive' and item.cname == 'char':
            return 'str'
        if item.kind == 'struct':
            return 'ptr:' + item.cname.replace('struct ', '')
        return 'ptr:' + item.cname
    if kind == 'array':
        return f'array:{c_kind(ctype.item)}:{ctype.length}'
    if kind == 'void':
        return 'void'
    if kind == 'enum':
        return 'int'
    if kind == 'function':
        return 'function'
    return kind


def stub_params():
    """Nome -> lista de nomes de parâmetros, tirada do stub tipado do pyray."""
    tree = ast.parse(STUB.read_text(encoding='utf-8'))
    out = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            out[node.name] = [arg.arg for arg in node.args.args]
    return out


def main(target):
    names = stub_params()
    functions = {}
    for c_name in sorted(dir(rl)):
        attr = getattr(rl, c_name)
        try:
            ftype = ffi.typeof(attr)
        except TypeError:
            continue
        if ftype.kind != 'function':
            continue
        snake = pyray._underscore(c_name)
        params = names.get(snake)
        kinds = [c_kind(arg) for arg in ftype.args]
        if params is None or len(params) != len(kinds):
            params = [f'arg{i}' for i in range(len(kinds))]
        functions[snake] = {
            'c': c_name,
            'params': [[p, k] for p, k in zip(params, kinds)],
            'returns': c_kind(ftype.result),
        }
    structs = {}
    for name in sorted(ffi.list_types()[0]):
        ctype = ffi.typeof(name)
        if ctype.kind != 'struct' or ctype.fields is None or ctype.cname.replace('struct ', '') != name:
            continue
        structs[name] = [[field, c_kind(info.type)] for field, info in ctype.fields]
    # Apelidos de typedef (Texture2D = Texture, Camera = Camera3D...).
    aliases = {}
    for name in sorted(ffi.list_types()[0]):
        ctype = ffi.typeof(name)
        base = ctype.cname.replace('struct ', '')
        if ctype.kind == 'struct' and base != name:
            aliases[name] = base
    enums = {}
    for name in sorted(dir(renums)):
        value = getattr(renums, name)
        if isinstance(value, type) and issubclass(value, int) and value is not int and hasattr(value, '__members__'):
            enums[name] = {member: int(getattr(value, member)) for member in value.__members__}
    defines = {}
    for name in sorted(dir(rdefines)):
        if name.startswith('_'):
            continue
        value = getattr(rdefines, name)
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float, str)):
            defines[name] = value
    colors = {name: list(getattr(rcolors, name)) for name in sorted(dir(rcolors))
              if isinstance(getattr(rcolors, name), tuple)}
    # Constantes inteiras que o pyray expõe direto (vindas do lib do cffi).
    lib_ints = {}
    for name in sorted(dir(rl)):
        value = getattr(rl, name)
        if isinstance(value, int) and not isinstance(value, bool):
            lib_ints[name] = value
    data = {
        'package': 'raylib',
        'version': raylib.__version__,
        'functions': functions,
        'structs': structs,
        'aliases': aliases,
        'enums': enums,
        'defines': defines,
        'colors': colors,
        'libConstants': lib_ints,
    }
    text = json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True) + '\n'
    Path(target).write_bytes(biome_format(Path(target).resolve(), text).encode('utf-8'))
    print(f'{len(functions)} funções, {len(structs)} structs, {len(enums)} enums, {len(colors)} cores, '
          f'{len(lib_ints)} constantes -> {target}')


if __name__ == '__main__':
    main(sys.argv[1])
