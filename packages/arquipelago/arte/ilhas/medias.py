"""As versões médias das ilhas do anel (lacunas, 01/11/2026, as ilhas em três versões).

  C:/Users/tocha/blender-venv/Scripts/python.exe -B arte/ilhas/medias.py [ilha …]

A média é a que a pessoa vê da ponte: o jogo a baixa ao pisar na ponte, ela toma o lugar da silhueta
esmaecendo, e a completa entra no fim da ponte (`src/mundo/ilha-media.tsx`). Sai da própria ilha
completa (`src/assets/ilhas/<ilha>.glb`), para a troca não mudar nada de lugar:

- sem os nós de colisão `col-*`, as formas de escalar `escalada-*`, as âncoras e os clipes (a média
  não colide nem mexe; a leve segue colidindo);
- sem os pedacinhos soltos que da ponte não se veem (`MIUDO`: flores, granulado, pedrinhas, tufos);
- as malhas grandes simplificadas (`decimate` por colapso, `PROPORCAO`), menos o chão e a água, que
  ficam como estão (o tampo e o contorno são os mesmos da completa);
- tudo junto num nó só, `ilha-media`, com os materiais da completa (a tinta da ilha e as luzes da
  noite são as mesmas).

Grava `src/assets/ilhas/<ilha>-media.glb` e `arte/ilhas/medias.json` (triângulos e tamanho). O
build do jogo vê o arquivo e liga a versão média daquela ilha (`scripts/gerar-ilhas-medias.ts`).
Teto: `TETO_TRIANGULOS` e `TETO_KB` por ilha (`tests/ilhas-medias.test.ts` confere, junto com a
altura e a largura iguais às da completa).
"""
import json
import math
import os
import sys

import bpy  # noqa: I001 (o bpy primeiro: é ele que traz o bmesh)
import bmesh

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', '..', 'src', 'assets', 'ilhas')
RELATORIO = os.path.join(HERE, 'medias.json')

ILHAS = ['bosque', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens']
# Peça solta com a caixa menor que isto (diagonal, em metros) sai: da ponte (20 a 45 m) ela some.
MIUDO = 0.32
# Quanto cada malha grande guarda dos triângulos (o chão, a água e o que é pequeno ficam inteiros).
PROPORCAO = 0.42
# Malha com menos triângulos que isto (depois de tirar o miúdo) fica como está: as peças pequenas e
# finas (o vulcão alto do Vale, os rios de lava, os troncos) perdem a forma no colapso.
PEQUENA = 1000
INTEIROS = ('terreno', 'agua', 'chao')
TETO_TRIANGULOS = 16000
TETO_KB = 640


def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importar(ilha):
    bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS, f'{ilha}.glb'))
    for o in bpy.data.objects:
        if o.animation_data:
            o.animation_data_clear()
    # Tira os pais guardando onde cada malha está (as âncoras e os nós vazios saem depois).
    malhas = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in malhas:
        mundo = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mundo
    for o in list(bpy.data.objects):
        fora = o.type != 'MESH' or o.name.startswith('col-') or o.name.startswith('escalada-')
        if fora:
            bpy.data.objects.remove(o, do_unlink=True)
    # Cada malha com o próprio dado (as cópias dividiam a malha) e a transformação aplicada.
    for o in bpy.data.objects:
        o.data = o.data.copy()
        o.data.transform(o.matrix_world)
        o.matrix_world.identity()
    return list(bpy.data.objects)


def inteiro(o):
    return any(o.name == n or o.name.startswith(f'{n}.') for n in INTEIROS)


def tirar_miudo(o):
    """Apaga as partes soltas (ligadas por aresta) com a caixa menor que `MIUDO`."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    visto = set()
    apagar = []
    for v in bm.verts:
        if v.index in visto:
            continue
        parte, pilha = [], [v]
        visto.add(v.index)
        while pilha:
            a = pilha.pop()
            parte.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in visto:
                    visto.add(b.index)
                    pilha.append(b)
        xs = [p.co.x for p in parte]
        ys = [p.co.y for p in parte]
        zs = [p.co.z for p in parte]
        diag = math.dist((min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs)))
        if diag < MIUDO:
            apagar += parte
    if apagar:
        bmesh.ops.delete(bm, geom=apagar, context='VERTS')
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()


def triangulos(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def simplificar(o):
    if triangulos(o) < PEQUENA:
        return
    m = o.modifiers.new('media', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = PROPORCAO
    m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.object.modifier_apply(modifier=m.name)


def juntar(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = 'ilha-media'
    o.data.name = 'ilha-media'
    return o


def media(ilha):
    limpar()
    objs = importar(ilha)
    antes = sum(triangulos(o) for o in objs)
    for o in objs:
        if inteiro(o):
            continue
        tirar_miudo(o)
    for o in list(bpy.data.objects):
        if not o.data.polygons:
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        if not inteiro(o):
            simplificar(o)
    junta = juntar(list(bpy.data.objects))
    saida = os.path.join(ASSETS, f'{ilha}-media.glb')
    bpy.ops.object.select_all(action='DESELECT')
    junta.select_set(True)
    bpy.ops.export_scene.gltf(filepath=saida, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=False, export_extras=False,
                              export_animations=False)
    tris = triangulos(junta)
    kb = round(os.path.getsize(saida) / 1024, 1)
    print(f'MEDIA {ilha}: {antes} -> {tris} triângulos, {kb} KB')
    if tris > TETO_TRIANGULOS or kb > TETO_KB:
        raise SystemExit(f'{ilha}-media passou do teto ({tris} triângulos, {kb} KB)')
    return {'triangulos_da_completa': antes, 'triangulos': tris, 'kb': kb}


def main():
    pedidas = [a for a in sys.argv[1:] if not a.startswith('-')] or ILHAS
    relatorio = {}
    if os.path.exists(RELATORIO):
        with open(RELATORIO, encoding='utf-8') as f:
            relatorio = json.load(f)
    for ilha in pedidas:
        relatorio[ilha] = media(ilha)
    with open(RELATORIO, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dict(sorted(relatorio.items())), f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write('\n')


main()
