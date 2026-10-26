"""Diferencial do GLTF: load_model e as animações do Estúdio contra o raylib do computador.

    <python do venv com raylib==6.0.1.0> scripts/raylib/tests/diff_gltf.py <modelos…> > real.json
    python -I scripts/raylib/tests/diff_gltf.py --ours <modelos…> > ours.json
    python -I scripts/raylib/tests/compare.py real.json ours.json

Por modelo: malhas (contagens, caixa, vértices, coordenadas, índices, cores, ossos e pesos),
materiais (cor e tamanho da textura), esqueleto (nomes, pais, pose de ligação) e, por animação,
o keyframeCount e as matrizes dos ossos depois de update_model_animation em vários quadros
(inclusive depois do último, onde o raylib tem um comportamento próprio).
Os modelos são lidos de onde estiverem; nada deles entra no repositório.
"""
import contextlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OURS = '--ours' in sys.argv
PATHS = [os.path.abspath(a) for a in sys.argv[1:] if a not in ('--ours', '--ucrt')]

if OURS:
    sys.path.insert(0, str(ROOT / 'src/runtime/python/raylib/py'))
    import _szraylib
    _szraylib.configure(lambda h, p: (json.dumps({'now': 16}), None), None, '/', '3d')

import pyray as P  # noqa: E402

if '--ucrt' in sys.argv:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from ucrt import use_ucrt_libm  # noqa: E402
    use_ucrt_libm()

P.set_trace_log_level(P.LOG_NONE)
P.set_config_flags(P.FLAG_WINDOW_HIDDEN)
P.init_window(64, 64, 'gltf')


def nullable(pointer):
    try:
        return pointer is None or pointer == P.ffi.NULL
    except AttributeError:
        return pointer is None


def values(pointer, count, kind=float, digits=4):
    if nullable(pointer):
        return None
    if kind is float:
        return [float(pointer[i]) for i in range(count)]
    return [int(pointer[i]) for i in range(count)]


def summary(numbers):
    """Lista grande vira um resumo que ainda acusa troca de ordem: soma, soma ponderada, pontas.

    Sem arredondar: arredondar antes de comparar faz 1,0885 virar 1,089 de um lado e 1,088 do
    outro. Quem decide o que é igual é a tolerância do compare.py.
    """
    if numbers is None or len(numbers) <= 64:
        return numbers
    return [len(numbers), sum(numbers), sum(v * ((i % 97) + 1) for i, v in enumerate(numbers)),
            numbers[:16], numbers[-16:]]


def matrix(m):
    return [getattr(m, f'm{i}') for i in range(16)]


def box(b):
    return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]


def text(chars):
    try:
        return P.ffi.string(chars).decode('utf-8', 'replace')
    except (AttributeError, TypeError):
        return chars if isinstance(chars, str) else bytes(chars).split(b'\0')[0].decode()


def dump_model(path):
    out = {}
    model = P.load_model(path)
    out['valido'] = int(P.is_model_valid(model))
    out['contagens'] = [model.meshCount, model.materialCount]
    out['meshMaterial'] = values(model.meshMaterial, model.meshCount, int)
    out['caixa'] = box(P.get_model_bounding_box(model))
    for i in range(model.meshCount):
        mesh = model.meshes[i]
        n, t = mesh.vertexCount, mesh.triangleCount
        k = f'malha {i}'
        out[f'{k} contagens'] = [n, t, mesh.boneCount]
        out[f'{k} vertices'] = summary(values(mesh.vertices, n * 3))
        out[f'{k} texcoords'] = summary(values(mesh.texcoords, n * 2))
        out[f'{k} normais'] = summary(values(mesh.normals, n * 3, digits=3))
        out[f'{k} cores'] = summary(values(mesh.colors, n * 4, int))
        out[f'{k} indices'] = summary(values(mesh.indices, t * 3, int))
        out[f'{k} ossos'] = summary(values(mesh.boneIndices, n * 4, int))
        out[f'{k} pesos'] = summary(values(mesh.boneWeights, n * 4))
    for i in range(model.materialCount):
        albedo = model.materials[i].maps[P.MATERIAL_MAP_ALBEDO]
        c = albedo.color
        out[f'material {i}'] = [c.r, c.g, c.b, c.a, albedo.texture.width, albedo.texture.height,
                                int(albedo.texture.id > 1)]
    skeleton = model.skeleton
    out['ossos'] = skeleton.boneCount
    for b in range(skeleton.boneCount):
        bone = skeleton.bones[b]
        pose = skeleton.bindPose[b]
        out[f'osso {b}'] = [text(bone.name), bone.parent,
                            [pose.translation.x, pose.translation.y, pose.translation.z,
                             pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w,
                             pose.scale.x, pose.scale.y, pose.scale.z]]
    count = P.ffi.new('int *', 0) if hasattr(P, 'ffi') else None
    animations = P.load_model_animations(path, count)
    total = count[0]
    out['animacoes'] = total
    for a in range(total):
        anim = animations[a]
        k = f'animacao {a}'
        out[f'{k}'] = [text(anim.name), anim.boneCount, anim.keyframeCount,
                       int(P.is_model_animation_valid(model, anim))]
        if skeleton.boneCount == 0 or anim.keyframeCount <= 0:
            continue
        frames = sorted({0, 1, anim.keyframeCount // 3, anim.keyframeCount - 1,
                         anim.keyframeCount, anim.keyframeCount + 5, 2.5})
        for frame in frames:
            P.update_model_animation(model, anim, frame)
            out[f'{k} quadro {frame}'] = summary(
                [v for b in range(skeleton.boneCount) for v in matrix(model.boneMatrices[b])])
        if total > 1:
            other = animations[(a + 1) % total]
            P.update_model_animation_ex(model, anim, 3, other, 7, 0.35)
            out[f'{k} mistura'] = summary(
                [v for b in range(skeleton.boneCount) for v in matrix(model.boneMatrices[b])])
    return out


def main():
    out = {}
    for path in PATHS:
        name = os.path.basename(path)
        try:
            # Os avisos dos dois raylibs vão para o stderr; o stdout é só o JSON.
            with contextlib.redirect_stdout(sys.stderr):
                dumped = dump_model(path)
            for key, value in dumped.items():
                out[f'{name} {key}'] = value
        except Exception as error:  # noqa: BLE001
            out[f'{name} erro'] = f'{type(error).__name__}: {error}'
    print(json.dumps(out, sort_keys=True))


main()
