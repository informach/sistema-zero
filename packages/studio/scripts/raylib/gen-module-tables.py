"""Gera as tabelas do módulo Raylib do Estúdio a partir de api-reference.json.

    python -I scripts/raylib/gen-module-tables.py          # escreve
    python -I scripts/raylib/gen-module-tables.py --check  # só confere (CI)

Saída em src/runtime/python/raylib/py/_szraylib/:
* _constants.py: constantes inteiras, defines, cores (tuplas, como no pyray) e enums (IntEnum);
* _names.py: todos os nomes públicos do pyray, com os parâmetros de cada função.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from biome_format import biome_format  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT / 'src/runtime/python/raylib/api-reference.json'
TARGET = ROOT / 'src/runtime/python/raylib/py/_szraylib'

# Enums do raygui ficam de fora: o raygui não existe no Estúdio.
SKIP_ENUM_PREFIXES = ('Gui',)
# Funções que não são do raylib de jogos (janela nativa, GLFW, raygui, física do physac).
SKIP_FUNCTION_PREFIXES = ('glfw_', 'gui_')

HEADER = '# Gerado por scripts/raylib/gen-module-tables.py a partir de api-reference.json. Não edite.\n'


def constants_source(data):
    lines = [HEADER, 'from enum import IntEnum', '']
    lines.append(f"RAYLIB_PACKAGE_VERSION = {data['version']!r}")
    lib = data['libConstants']
    for name in sorted(lib):
        lines.append(f'{name} = {lib[name]}')
    lines.append('')
    for name, value in sorted(data['defines'].items()):
        if name.startswith(('GLFW_', 'GL_', 'RAYGUI_', 'PHYSAC_')):
            continue
        if name in lib:
            continue
        lines.append(f'{name} = {value!r}')
    lines.append('')
    lines.append('# Cores: no pyray são tuplas (r, g, b, a).')
    for name, rgba in sorted(data['colors'].items()):
        lines.append(f'{name} = {tuple(rgba)!r}')
    lines.append('')
    enum_names = []
    for name, members in sorted(data['enums'].items()):
        if name == 'IntEnum' or name.startswith(SKIP_ENUM_PREFIXES) or not members:
            continue
        enum_names.append(name)
        lines.append(f'class {name}(IntEnum):')
        for member, value in members.items():
            lines.append(f'    {member} = {value}')
        lines.append('')
    lines.append(f'ENUM_NAMES = {tuple(enum_names)!r}')
    color_names = tuple(sorted(data['colors']))
    lines.append(f'COLOR_NAMES = {color_names!r}')
    return '\n'.join(lines) + '\n'


def names_source(data):
    functions = {
        name: [param for param, _ in spec['params']]
        for name, spec in sorted(data['functions'].items())
        if not name.startswith(SKIP_FUNCTION_PREFIXES)
    }
    kinds = {
        name: [kind for _, kind in spec['params']]
        for name, spec in sorted(data['functions'].items())
        if not name.startswith(SKIP_FUNCTION_PREFIXES)
    }
    c_names = {name: data['functions'][name]['c'] for name in functions}
    structs = sorted(data['structs']) + sorted(data['aliases'])
    lines = [HEADER]
    lines.append('# Função do pyray -> nomes dos parâmetros (na ordem do C).')
    lines.append('FUNCTION_PARAMS = {')
    for name, params in functions.items():
        lines.append(f'    {name!r}: {tuple(params)!r},')
    lines.append('}')
    lines.append('# Função do pyray -> tipos C dos parâmetros (int, float, str, struct:Vector2...).')
    lines.append('FUNCTION_KINDS = {')
    for name, params in kinds.items():
        lines.append(f'    {name!r}: {tuple(params)!r},')
    lines.append('}')
    lines.append('# Função do pyray -> nome em C (o do módulo raylib).')
    lines.append('C_NAMES = {')
    for name, c_name in c_names.items():
        lines.append(f'    {name!r}: {c_name!r},')
    lines.append('}')
    lines.append('# Struct -> campos (nome, tipo C), na ordem do C.')
    lines.append('STRUCT_FIELDS = {')
    for name, fields in sorted(data['structs'].items()):
        lines.append(f'    {name!r}: {tuple(tuple(f) for f in fields)!r},')
    lines.append('}')
    lines.append(f'STRUCT_NAMES = {tuple(structs)!r}')
    lines.append(f"STRUCT_ALIASES = {data['aliases']!r}")
    return '\n'.join(lines) + '\n'


def exports_source(data):
    """Os nomes que `from pyray import *` traz (o __all__ do pyray do Estúdio), para os blocos."""
    names = set()
    names.update(name for name in data['functions'] if not name.startswith(SKIP_FUNCTION_PREFIXES))
    names.update(name for name in data['structs']
                 if not name.startswith(('GLFW', 'rl', 'Gui', 'Physics')))
    names.update(data['aliases'])
    names.update(data['libConstants'])
    names.update(name for name in data['defines']
                 if not name.startswith(('GLFW_', 'GL_', 'RAYGUI_', 'PHYSAC_')))
    names.update(data['colors'])
    names.update(name for name, members in data['enums'].items()
                 if name != 'IntEnum' and not name.startswith(SKIP_ENUM_PREFIXES) and members)
    names.update(('ffi', 'rl', 'text_format'))
    body = ',\n'.join(f'  {json.dumps(name)}' for name in sorted(names))
    return ('// Gerado por scripts/raylib/gen-module-tables.py a partir de api-reference.json. Não edite.\n'
            '/** Os nomes que `from pyray import *` traz (o __all__ do pyray do Estúdio). */\n'
            f'export const PYRAY_EXPORTS: readonly string[] = [\n{body},\n]\n')


def main():
    data = json.loads(REFERENCE.read_text(encoding='utf-8'))
    outputs = {
        TARGET / '_constants.py': constants_source(data),
        TARGET / '_names.py': names_source(data),
        ROOT / 'src/python/extensions/raylib/pyrayExports.generated.ts': exports_source(data),
    }
    outputs = {path: biome_format(path, text) if path.suffix == '.ts' else text for path, text in outputs.items()}
    check = '--check' in sys.argv
    stale = []
    for path, text in outputs.items():
        current = path.read_text(encoding='utf-8') if path.exists() else None
        if current != text:
            stale.append(path)
            if not check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(text.encode('utf-8'))
    if check and stale:
        print('Tabelas desatualizadas: ' + ', '.join(str(p.relative_to(ROOT)) for p in stale))
        sys.exit(1)
    print('ok' if not stale else 'escrito: ' + ', '.join(p.name for p in stale))


if __name__ == '__main__':
    main()
