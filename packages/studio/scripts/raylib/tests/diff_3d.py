"""Diferencial 3D: colisões, raios e câmera 3D do Estúdio contra o raylib do computador.

    <python do venv com raylib==6.0.1.0> scripts/raylib/tests/diff_3d.py > real.json
    python -I scripts/raylib/tests/diff_3d.py --ours > ours.json
    python -I scripts/raylib/tests/compare.py real.json ours.json

As entradas são sorteadas com semente fixa e mostram os casos que mudam o resultado: o raio que
sai de dentro da caixa e da esfera, o raio que erra, a câmera ortográfica e o arrasto da câmera.
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

if '--ours' in sys.argv:
    sys.path.insert(0, str(ROOT / 'src/runtime/python/raylib/py'))
    import _szraylib
    _szraylib.configure(lambda h, p: (json.dumps({'now': 16}), None), None, '.', '3d')

import pyray as P  # noqa: E402

rng = random.Random(3)


def f(low=-10.0, high=10.0):
    return round(rng.uniform(low, high), 3)


def vec3(low=-10.0, high=10.0):
    return P.Vector3(f(low, high), f(low, high), f(low, high))


def box():
    a, b = vec3(), vec3()
    return P.BoundingBox(P.Vector3(min(a.x, b.x), min(a.y, b.y), min(a.z, b.z)),
                         P.Vector3(max(a.x, b.x), max(a.y, b.y), max(a.z, b.z)))


def ray(inside=None):
    position = vec3() if inside is None else inside
    return P.Ray(position, P.vector3_normalize(vec3()))


def camera(projection):
    return P.Camera3D(vec3(5, 15), vec3(-2, 2), P.Vector3(0, 1, 0), f(30, 80) if projection == 0
                      else f(4, 20), projection)


def dump(value):
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return float(value)
    for fields in (tuple(f'm{i}' for i in range(16)), ('x', 'y', 'z'), ('x', 'y')):
        try:
            return [float(getattr(value, name)) for name in fields]
        except (AttributeError, TypeError):
            continue
    if hasattr(value, 'hit'):
        return [int(value.hit), float(value.distance), dump(value.point), dump(value.normal)]
    if hasattr(value, 'direction'):
        return [dump(value.position), dump(value.direction)]
    if hasattr(value, 'fovy'):
        return [dump(value.position), dump(value.target), dump(value.up)]
    return repr(value)


def cases():
    yield 'check_collision_spheres', lambda: P.check_collision_spheres(vec3(), f(0, 6), vec3(), f(0, 6))
    yield 'check_collision_boxes', lambda: P.check_collision_boxes(box(), box())
    yield 'check_collision_box_sphere', lambda: P.check_collision_box_sphere(box(), vec3(), f(0, 6))
    yield 'get_ray_collision_sphere', lambda: P.get_ray_collision_sphere(ray(), vec3(-3, 3), f(1, 8))
    yield 'get_ray_collision_sphere (de dentro)', lambda: P.get_ray_collision_sphere(
        ray(P.Vector3(0.5, 0.2, -0.1)), P.Vector3(0, 0, 0), 3)
    yield 'get_ray_collision_box', lambda: P.get_ray_collision_box(ray(), box())
    yield 'get_ray_collision_box (de dentro)', lambda: P.get_ray_collision_box(
        ray(P.Vector3(0.1, 0.2, 0.3)), P.BoundingBox(P.Vector3(-2, -2, -2), P.Vector3(2, 2, 2)))
    yield 'get_ray_collision_triangle', lambda: P.get_ray_collision_triangle(
        P.Ray(vec3(), P.vector3_normalize(vec3())), vec3(-3, 3), vec3(-3, 3), vec3(-3, 3))
    yield 'get_ray_collision_triangle (acerta)', lambda: P.get_ray_collision_triangle(
        P.Ray(P.Vector3(f(-0.2, 0.2), 5, f(-0.2, 0.2)), P.Vector3(0, -1, 0)),
        P.Vector3(-1, 0, -1), P.Vector3(0, 0, 1), P.Vector3(1, 0, -1))
    yield 'get_ray_collision_quad', lambda: P.get_ray_collision_quad(
        P.Ray(P.Vector3(f(-0.9, 0.9), 5, f(-0.9, 0.9)), P.Vector3(0, -1, 0)),
        P.Vector3(-1, 0, -1), P.Vector3(-1, 0, 1), P.Vector3(1, 0, 1), P.Vector3(1, 0, -1))
    for projection in (0, 1):
        yield f'get_camera_matrix ({projection})', lambda p=projection: P.get_camera_matrix(camera(p))
        yield f'get_world_to_screen_ex ({projection})', lambda p=projection: P.get_world_to_screen_ex(
            vec3(-3, 3), camera(p), 800, 450)
        yield f'get_screen_to_world_ray_ex ({projection})', lambda p=projection: (
            P.get_screen_to_world_ray_ex(P.Vector2(f(0, 800), f(0, 450)), camera(p), 800, 450))

    def pro():
        cam = camera(0)
        P.update_camera_pro(cam, P.Vector3(f(-1, 1), f(-1, 1), f(-1, 1)),
                            P.Vector3(f(-20, 20), f(-20, 20), f(-5, 5)), f(-1, 1))
        return cam
    yield 'update_camera_pro', pro


def main():
    out = {}
    for name, call in cases():
        rng.seed(name)
        rows = []
        for _ in range(8):
            try:
                rows.append(dump(call()))
            except NotImplementedError:
                rows = 'nao-implementada'
                break
            except Exception as error:  # noqa: BLE001
                rows.append(f'erro: {type(error).__name__}: {error}')
        out[name] = rows
    print(json.dumps(out, sort_keys=True))


main()
