"""Confere as roupas de festa (festas.py) e grava `festas-relatorio.json`.

Mede cada peça (triângulos, KB, materiais, ossos com peso) e confere se os chapéus e a tiara
atravessam os cabelos `hair-01` a `hair-18` e as cabeças `head-01` a `head-06`, na pose de
descanso. Para cada par (peça, cabelo) conta:
  dentro  = vértices do cabelo dentro do material da peça (paridade de cruzamentos em 3 raios);
  acima   = vértices do cabelo por cima da peça (o raio para cima não acha a peça e o para baixo
            acha): o cabelo nasce na cabeça, então só chega lá furando a peça;
  enterra = vértices da peça dentro do volume do cabelo (a peça some dentro do cabelo).
Ponto a menos de 6 mm da superfície conta como encostado, não dentro.

Critério: com as cabeças, zero. Com cada cabelo, zero, a não ser que TODAS as peças da mesma
categoria que já existem e ficam na cabeça também o atravessem (hat-01 a hat-07, menos a auréola
hat-05, que flutua acima da cabeça; enfeite-01 a enfeite-05). Esses cabelos (o crespo, o rabo
alto...) ficam registrados com os números das peças antigas ao lado. O app esconde o cabelo e o
enfeite debaixo de um chapéu (AVATAR_HIDE_GROUPS do catálogo).

Uso: python conferir_festas.py   (sai com 1 se alguma peça reprovar)
"""
import bpy, os, sys, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'avatar3d', 'parts'))
OUT = os.environ.get('AVATAR_OUT', os.path.join(HERE, 'out'))
NOVAS = {'hat-08': 'hat', 'hat-09': 'hat', 'hat-10': 'hat', 'enfeite-06': 'enfeite',
         'top-07': 'top', 'outfit-07': 'outfit', 'top-08': 'top', 'top-09': 'top'}
REFERENCIAS = {'hat': ['hat-01', 'hat-02', 'hat-03', 'hat-04', 'hat-06', 'hat-07'],
               'enfeite': ['enfeite-01', 'enfeite-02', 'enfeite-03', 'enfeite-04', 'enfeite-05']}
CABELOS = [f'hair-{i:02d}' for i in range(1, 19)]
CABECAS = [f'head-{i:02d}' for i in range(1, 7)]
EPS = 0.006
DIRS = [Vector((1, 0.013, 0.007)).normalized(), Vector((-0.011, 1, 0.017)).normalized(),
        Vector((0.009, -0.014, 1)).normalized()]
UP, DOWN = Vector((0, 0, 1)), Vector((0, 0, -1))


def caminho(pid):
    novo = os.path.join(OUT, f'{pid}.glb')
    return novo if pid in NOVAS and os.path.exists(novo) else os.path.join(PARTS, f'{pid}.glb')


def importar(pid):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=caminho(pid))
    V, F, partes, tris, mats, ossos = [], [], [], 0, set(), set()
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)  # a peça inteira, como o teste do Kids conta
        if not o.vertex_groups:
            continue
        nomes = {g.index: g.name.replace('mixamorig:', '') for g in o.vertex_groups}
        mats.update(m.name for m in o.data.materials if m)
        base = len(V)
        for v in o.data.vertices:
            V.append(o.matrix_world @ v.co)
            ossos.update(nomes[g.group] for g in v.groups if g.weight > 1e-4)
        tri = [tuple(base + i for i in t.vertices) for t in o.data.loop_triangles]
        F += tri
        partes.append(tri)
    return (V, F, partes), dict(triangulos=tris, kb=round(os.path.getsize(caminho(pid)) / 1024, 1),
                      materiais=sorted(mats), ossos=sorted(ossos))


def cruzamentos(bvh, p, d):
    n, o = 0, p.copy()
    for _ in range(64):
        loc = bvh.ray_cast(o, d)[0]
        if loc is None:
            break
        n += 1
        o = loc + d * 1e-4
    return n


def arvores(malha):
    """Uma árvore por objeto (a paridade vale para cada casca fechada; cascas que se cruzam, como a
    haste entrando no arco, confundiriam a contagem somada) e uma da peça inteira."""
    V, F, partes = malha
    return [BVHTree.FromPolygons(V, tri) for tri in partes], BVHTree.FromPolygons(V, F)


def dentro(arvs, p):
    for bvh in arvs:
        loc, _, _, dist = bvh.find_nearest(p)
        if loc is None or dist <= EPS:
            continue
        if sum(cruzamentos(bvh, p, d) % 2 for d in DIRS) >= 2:
            return True
    return False


def conferir(peca, alvo):
    p_arvs, pb = arvores(peca)
    h_arvs, _ = arvores(alvo)
    V, HV = peca[0], alvo[0]
    zmin = min(v.z for v in V)
    d = a = 0
    for p in HV:
        if p.z < zmin - 0.01:
            continue
        if dentro(p_arvs, p):
            d += 1
        elif pb.ray_cast(p + UP * 1e-4, UP)[0] is None and pb.ray_cast(p, DOWN)[0] is not None:
            a += 1
    e = sum(1 for p in V if dentro(h_arvs, p))
    return dict(dentro=d, acima=a, enterra=e)


def total(r):
    return r['dentro'] + r['acima'] + r['enterra']


def main():
    alvos = {}
    for pid in CABELOS + CABECAS:
        alvos[pid], _ = importar(pid)
    relatorio = {'criterio': __doc__.split('Critério: ')[1].split('\n\nUso')[0].replace('\n', ' '), 'pecas': {}}
    refs = {}
    for cat, ids in REFERENCIAS.items():
        for rid in ids:
            malha, _ = importar(rid)
            refs[rid] = {h: conferir(malha, alvos[h]) for h in CABELOS}
    falhou = False
    for pid, cat in NOVAS.items():
        malha, medida = importar(pid)
        item = dict(medida)
        if cat in REFERENCIAS:
            linhas, excecoes, ruins = {}, {}, []
            for h in CABELOS + CABECAS:
                r = conferir(malha, alvos[h])
                linhas[h] = r
                if total(r) == 0:
                    continue
                antigas = {rid: total(refs[rid][h]) for rid in REFERENCIAS[cat]} if h in CABELOS else {}
                if antigas and all(v > 0 for v in antigas.values()):
                    excecoes[h] = dict(nova=r, antigas=antigas)
                else:
                    ruins.append(h)
            item.update(cabelos=linhas, excecoes=excecoes, reprovados=ruins)
            livres = [h for h in CABELOS if total(linhas[h]) == 0]
            print(f'{pid}: não atravessa {len(livres)} de 18 cabelos nem as cabeças;',
                  'exceções (todas as antigas também atravessam):', ', '.join(excecoes) or 'nenhuma',
                  '| REPROVADO em ' + ', '.join(ruins) if ruins else '| ok')
            falhou |= bool(ruins)
        print(f'{pid}: {medida["triangulos"]} triângulos, {medida["kb"]} KB, materiais {medida["materiais"]}')
        relatorio['pecas'][pid] = item
    relatorio['referencias'] = {rid: {h: total(r) for h, r in linhas.items()} for rid, linhas in refs.items()}
    with open(os.path.join(HERE, 'festas-relatorio.json'), 'w') as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=1)
        f.write('\n')
    if falhou:
        sys.exit(1)


main()
