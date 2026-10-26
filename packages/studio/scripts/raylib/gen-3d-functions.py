"""Gera src/runtime/python/raylib/threeDFunctions.generated.ts: as funções que só a Raylib 3D faz.

São as funções públicas dos módulos 3D do motor (``_MODULES_3D`` em _api.py), com o nome do pyray
e o do C (o módulo ``raylib``). O Estúdio usa a lista para recusar a troca da Raylib 3D pela 2D
quando o código chama alguma delas: com a 2D, essa chamada daria erro.

    python -I scripts/raylib/gen-3d-functions.py          # grava
    python -I scripts/raylib/gen-3d-functions.py --check  # só confere
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / 'src/runtime/python/raylib/py'))

from biome_format import biome_format  # noqa: E402
from _szraylib import _api  # noqa: E402
from _szraylib._names import C_NAMES, FUNCTION_PARAMS  # noqa: E402

OUTPUT = ROOT / 'src/runtime/python/raylib/threeDFunctions.generated.ts'


def three_d_functions():
    names = set()
    for module_name in _api._MODULES_3D:
        module = __import__(f'_szraylib.{module_name}', fromlist=['_'])
        for name, value in vars(module).items():
            if callable(value) and not name.startswith('_') and name in FUNCTION_PARAMS:
                names.add(name)
    return sorted(names)


def render():
    names = three_d_functions()
    c_names = sorted(C_NAMES[name] for name in names if name in C_NAMES)
    quoted = lambda items: ', '.join(f"'{item}'" for item in items)  # noqa: E731
    return (
        '// Gerado por scripts/raylib/gen-3d-functions.py a partir dos módulos 3D do motor. Não edite.\n\n'
        '/** Functions only Raylib 3D implements, with their pyray names. */\n'
        f'export const RAYLIB_3D_FUNCTIONS: readonly string[] = [{quoted(names)}]\n\n'
        '/** The same functions with the C names of the raylib module (rl.DrawCube). */\n'
        f'export const RAYLIB_3D_C_FUNCTIONS: readonly string[] = [{quoted(c_names)}]\n'
    )


def main():
    text = biome_format(OUTPUT, render())
    if '--check' in sys.argv:
        current = OUTPUT.read_text(encoding='utf-8') if OUTPUT.exists() else ''
        if current != text:
            raise SystemExit(f'{OUTPUT.name} está desatualizado: rode scripts/raylib/gen-3d-functions.py.')
        print(f'{OUTPUT.name} confere.')
        return
    OUTPUT.write_bytes(text.encode('utf-8'))
    print(f'{OUTPUT.name}: {text.count(chr(39)) // 2} nomes.')


main()
