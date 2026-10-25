"""Diferencial das malhas geradas: gen_mesh_* do Estúdio contra o raylib do computador.

    <python do venv com raylib==6.0.1.0> scripts/raylib/tests/diff_meshes.py > real.json
    python -I scripts/raylib/tests/diff_meshes.py --ours > ours.json
    python -I scripts/raylib/tests/compare.py real.json ours.json

Para cada malha: as contagens, a caixa (malha e modelo, com e sem transform) e TODOS os vértices,
coordenadas de textura e índices, que são o que aparece na tela com o shader padrão (sem luz).
As normais entram só nas malhas que não passam pela soldagem do par_shapes (ali o Estúdio
simplificou, ver _shapes.py).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

if '--ours' in sys.argv:
    sys.path.insert(0, str(ROOT / 'src/runtime/python/raylib/py'))
    import _szraylib
    _szraylib.configure(lambda h, p: (json.dumps({'now': 16}), None), None, '.', '3d')

import pyray as P  # noqa: E402

P.set_trace_log_level(P.LOG_NONE)
P.set_config_flags(P.FLAG_WINDOW_HIDDEN)
P.init_window(64, 64, 'malhas')

# Malhas cujas normais o raylib calcula sem soldagem (iguais nos dois lados).
EXACT_NORMALS = ('gen_mesh_poly', 'gen_mesh_plane', 'gen_mesh_cube')

CASES = [
    ('gen_mesh_poly', (5, 1.5)),
    ('gen_mesh_poly', (3, 0.5)),
    ('gen_mesh_plane', (2, 3, 4, 2)),
    ('gen_mesh_plane', (1, 1, 1, 1)),
    ('gen_mesh_cube', (2, 1, 0.5)),
    ('gen_mesh_sphere', (1.2, 6, 8)),
    ('gen_mesh_hemi_sphere', (0.8, 5, 7)),
    ('gen_mesh_cylinder', (0.5, 2, 9)),
    ('gen_mesh_cone', (0.7, 1.5, 6)),
    ('gen_mesh_torus', (0.3, 2, 6, 10)),
    ('gen_mesh_knot', (1, 2, 8, 24)),
]


def nullable(pointer):
    try:
        return pointer is None or pointer == P.ffi.NULL
    except AttributeError:
        return pointer is None


def values(pointer, count, kind=float):
    if nullable(pointer):
        return None
    return [round(kind(pointer[i]), 5) if kind is float else kind(pointer[i]) for i in range(count)]


def box(b):
    return [round(v, 4) for v in (b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z)]


def main():
    out = {}
    for name, args in CASES:
        mesh = getattr(P, name)(*args)
        key = f'{name}{args}'
        n, t = mesh.vertexCount, mesh.triangleCount
        out[f'{key} contagens'] = [n, t]
        out[f'{key} caixa'] = box(P.get_mesh_bounding_box(mesh))
        out[f'{key} vertices'] = values(mesh.vertices, n * 3)
        out[f'{key} texcoords'] = values(mesh.texcoords, n * 2)
        out[f'{key} indices'] = values(mesh.indices, t * 3, int)
        if name in EXACT_NORMALS:
            out[f'{key} normais'] = values(mesh.normals, n * 3)
        model = P.load_model_from_mesh(mesh)
        out[f'{key} modelo'] = [model.meshCount, model.materialCount, list(model.meshMaterial[0:1])]
        model.transform = P.matrix_multiply(P.matrix_rotate_y(0.6), P.matrix_translate(1, 2, 3))
        out[f'{key} caixa do modelo'] = box(P.get_model_bounding_box(model))
        hit = P.get_ray_collision_mesh(P.Ray(P.Vector3(0.1, 5, 0.05), P.Vector3(0, -1, 0)), mesh,
                                       P.matrix_identity())
        out[f'{key} raio'] = [int(hit.hit), round(hit.distance, 4), round(hit.point.y, 4),
                             [round(hit.normal.x, 3), round(hit.normal.y, 3),
                              round(hit.normal.z, 3)]]
    print(json.dumps(out, sort_keys=True))


main()
