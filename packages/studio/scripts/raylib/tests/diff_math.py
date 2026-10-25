"""Diferencial: raymath, colisões 2D e câmera 2D do Estúdio contra o raylib do computador.

    <python do venv com raylib==6.0.1.0> scripts/raylib/tests/diff_math.py > real.json
    python -I scripts/raylib/tests/diff_math.py --ours > ours.json
    python -I scripts/raylib/tests/compare.py real.json ours.json

As entradas são sorteadas com semente fixa; a mesma lista roda nos dois motores. Os tipos dos
parâmetros vêm de api-reference.json (o dump do pyray real).
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REFERENCE = json.loads((ROOT / 'src/runtime/python/raylib/api-reference.json').read_text(encoding='utf-8'))

if '--ours' in sys.argv:
    sys.path.insert(0, str(ROOT / 'src/runtime/python/raylib/py'))
    import _szraylib
    _szraylib.configure(lambda h, p: (json.dumps({'now': 16}), None), None, '.', '2d')

import pyray as P  # noqa: E402

if '--ucrt' in sys.argv:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from ucrt import use_ucrt_libm  # noqa: E402
    use_ucrt_libm()

PREFIXES = ('vector2_', 'vector3_', 'vector4_', 'matrix_', 'quaternion_')
EXTRA = ('clamp', 'lerp', 'normalize', 'remap', 'wrap', 'float_equals', 'get_collision_rec',
         'get_world_to_screen_2d', 'get_screen_to_world_2d', 'get_camera_matrix_2d',
         'check_collision_recs', 'check_collision_circles', 'check_collision_circle_rec',
         'check_collision_circle_line', 'check_collision_point_rec', 'check_collision_point_circle',
         'check_collision_point_triangle', 'check_collision_point_line')
SUPPORTED = {'float', 'int', 'struct:Vector2', 'struct:Vector3', 'struct:Vector4', 'struct:Rectangle',
             'struct:Matrix', 'struct:Camera2D'}
rng = random.Random(0)


def value(kind):
    if kind == 'float':
        return round(rng.uniform(-10, 10), 3)
    if kind == 'int':
        return rng.randint(0, 20)
    if kind == 'struct:Vector2':
        return P.Vector2(value('float'), value('float'))
    if kind == 'struct:Vector3':
        return P.Vector3(value('float'), value('float'), value('float'))
    if kind == 'struct:Vector4':
        return P.Vector4(*(value('float') for _ in range(4)))
    if kind == 'struct:Rectangle':
        return P.Rectangle(value('float'), value('float'), abs(value('float')), abs(value('float')))
    if kind == 'struct:Matrix':
        m = P.Matrix()
        for i in range(16):
            setattr(m, f'm{i}', value('float'))
        return m
    return P.Camera2D(value('struct:Vector2'), value('struct:Vector2'), value('float'),
                      abs(value('float')) + 0.1)


def dump(result):
    if isinstance(result, bool):
        return int(result)
    if isinstance(result, (int, float)):
        return float(result)
    for fields in (tuple(f'm{i}' for i in range(16)), ('x', 'y', 'width', 'height'), ('x', 'y', 'z', 'w'),
                   ('x', 'y', 'z'), ('x', 'y')):
        try:
            return [float(getattr(result, f)) for f in fields]
        except (AttributeError, TypeError):
            continue
    try:
        # float3 e float16 (Vector3ToFloatV, MatrixToFloatV): os números do campo v.
        return [float(v) for v in result.v]
    except (AttributeError, TypeError):
        return repr(result)


def main():
    out = {}
    for name in sorted(REFERENCE['functions']):
        if not (name.startswith(PREFIXES) or name in EXTRA):
            continue
        kinds = [kind for _, kind in REFERENCE['functions'][name]['params']]
        if any(kind not in SUPPORTED for kind in kinds):
            continue
        rng.seed(name)
        rows = []
        for _ in range(6):
            args = [value(kind) for kind in kinds]
            try:
                rows.append(dump(getattr(P, name)(*args)))
            except NotImplementedError:
                rows = 'nao-implementada'
                break
            except Exception as error:  # noqa: BLE001
                rows.append(f'erro: {type(error).__name__}')
        out[name] = rows
    print(json.dumps(out, sort_keys=True))


main()
