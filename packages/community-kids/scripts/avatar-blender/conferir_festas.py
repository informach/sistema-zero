"""Confere as roupas de festa (festas.py) e grava `festas-relatorio.json`.

Mede cada peça (triângulos, KB, materiais, ossos com peso), na pose de descanso.

Chapéus (o app esconde o cabelo debaixo deles, AVATAR_HIDE_GROUPS do catálogo): conferidos contra
as cabeças `head-01` a `head-06`, na régua dos chapéus antigos que ficam na cabeça (hat-01 a
hat-04, hat-06 e hat-07; a auréola hat-05 flutua e fica de fora). Para cada cabeça:
  atravessa = vértices da cabeça dentro do chapéu, por cima dele ou o chapéu dentro da cabeça
              (`conferir`, abaixo);
  folga_min = menor distância entre o chapéu e a cabeça (o chapéu encosta ou flutua);
  topo      = do topo do crânio até o chapéu, subindo;
  frente, lado, nuca = quanto o chapéu desce: o ponto mais baixo do couro (cabeça acima de z 1,55)
              cujo raio, saindo do centro da cabeça, acha o chapéu a até 15 cm, medido do topo do
              crânio para baixo, na frente (até 25° do meio), dos lados (65° a 115°) e na nuca
              (além de 155°);
  folga_oco = mediana dessas distâncias nos pontos cobertos (a folga até o couro);
  rosto     = menor distância até as sobrancelhas e os olhos (todas as variantes `eyebrow-*` e
              `eyes-*`): a aba não encosta neles.
A cartola antiga hat-04 foi afundada por `ajustes.py` (pedido da dona) e é conferida do mesmo jeito
(`AJUSTADAS`); ela continua medida na régua, mas não entra nos limites da descida (nunca foi o
maior valor deles).

Tiara (enfeite não esconde o cabelo): conferida contra os cabelos `hair-01` a `hair-18` e as
cabeças. Para cada par (peça, alvo) conta:
  dentro  = vértices do alvo dentro do material da peça (paridade de cruzamentos em 3 raios);
  acima   = vértices do alvo por cima da peça (o raio para cima não acha a peça e o para baixo
            acha): o cabelo nasce na cabeça, então só chega lá furando a peça;
  enterra = vértices da peça dentro do volume do alvo (a peça some dentro do cabelo).
Ponto a menos de 6 mm da superfície conta como encostado, não dentro.

Critério: chapéu, nas seis cabeças, atravessa zero; folga_min de no máximo 3 cm (não flutua: o boné
hat-02, o mais folgado dos antigos que encostam no crânio, tem 2,7 cm; o pirata hat-07 flutua a
7,3 cm e fica só registrado); frente, lado, nuca e folga_oco no máximo o maior valor dos antigos
que cobrem o crânio (hat-02, hat-03 e hat-07), então o chapéu não desce mais que eles na testa
(fica acima das sobrancelhas), nas orelhas e na nuca, nem fica mais folgado que eles; rosto de pelo
menos 6 mm (não encosta nas sobrancelhas nem nos olhos). Vale para os chapéus novos e para a hat-04
ajustada. Tiara,
com as cabeças, zero; com cada cabelo, zero, a não ser que TODOS os enfeites que já existem
(enfeite-01 a enfeite-05) também o atravessem: esses cabelos ficam registrados com os números dos
antigos ao lado.

Uso: python conferir_festas.py   (sai com 1 se alguma peça reprovar)
"""
import bpy, os, sys, json, math, subprocess
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'avatar3d', 'parts'))
OUT = os.environ.get('AVATAR_OUT', os.path.join(HERE, 'out'))
BIOME = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'node_modules', '.bin', 'biome'))
NOVAS = {'hat-08': 'hat', 'hat-09': 'hat', 'hat-10': 'hat', 'enfeite-06': 'enfeite',
         'top-07': 'top', 'outfit-07': 'outfit', 'top-08': 'top', 'top-09': 'top'}
REFERENCIAS = {'hat': ['hat-01', 'hat-02', 'hat-03', 'hat-04', 'hat-06', 'hat-07'],
               'enfeite': ['enfeite-01', 'enfeite-02', 'enfeite-03', 'enfeite-04', 'enfeite-05']}
COBREM = ['hat-02', 'hat-03', 'hat-07']  # antigos que cobrem o crânio: a régua da descida
AJUSTADAS = ['hat-04']  # peças do pacote ajustadas por ajustes.py, conferidas como os chapéus novos
FOLGA_MAX = 0.03
DESCIDA = ['frente', 'lado', 'nuca', 'folga_oco']
CABELOS = [f'hair-{i:02d}' for i in range(1, 19)]
CABECAS = [f'head-{i:02d}' for i in range(1, 7)]
C = Vector((0, -0.04, 1.70))  # centro da cabeça (o mesmo de festas.py)
EPS = 0.006
DIRS = [Vector((1, 0.013, 0.007)).normalized(), Vector((-0.011, 1, 0.017)).normalized(),
        Vector((0.009, -0.014, 1)).normalized()]
UP, DOWN = Vector((0, 0, 1)), Vector((0, 0, -1))


def caminho(pid):
    novo = os.path.join(OUT, f'{pid}.glb')
    return novo if (pid in NOVAS or pid in AJUSTADAS) and os.path.exists(novo) else os.path.join(PARTS, f'{pid}.glb')


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


def encaixe(peca, cabeca):
    """Como o chapéu assenta na cabeça (ver o topo do arquivo). Distâncias em metros."""
    V, F, _ = peca
    HV, HF, _ = cabeca
    pb, hb = BVHTree.FromPolygons(V, F), BVHTree.FromPolygons(HV, HF)
    topo = max(HV, key=lambda v: v.z)
    setores = {'frente': [], 'lado': [], 'nuca': []}
    folgas = []
    for p in HV:
        if p.z < 1.55:
            continue
        d = (p - C).normalized()
        hit = pb.ray_cast(p + d * 1e-4, d, 0.15)
        if hit[0] is None:
            continue
        folgas.append(hit[3])
        az = abs(math.degrees(math.atan2(p.x, -(p.y - C.y))))
        if az < 25:
            setores['frente'].append(p.z)
        elif 65 < az < 115:
            setores['lado'].append(p.z)
        elif az > 155:
            setores['nuca'].append(p.z)
    sobe = pb.ray_cast(topo + UP * 1e-4, UP)
    folgas.sort()
    r = dict(folga_min=min(hb.find_nearest(v)[3] for v in V), topo=sobe[3] if sobe[0] else None)
    for k, zs in setores.items():
        r[k] = topo.z - min(zs) if zs else None
    r['folga_oco'] = folgas[len(folgas) // 2] if folgas else None
    return {k: (round(v, 3) if v is not None else None) for k, v in r.items()}


def pior(linhas):
    """O pior valor de cada medida entre as cabeças (o maior; None se nenhuma cabeça tem)."""
    out = {}
    for k in next(iter(linhas.values())):
        vals = [l[k] for l in linhas.values() if l[k] is not None]
        out[k] = max(vals) if vals else None
    return out


def rosto(peca, faces):
    """Menor distância da peça até as sobrancelhas e os olhos, e qual deles chega mais perto."""
    V, F, _ = peca
    pb = BVHTree.FromPolygons(V, F)
    return min((round(min(pb.find_nearest(p)[3] for p in fv), 3), fid) for fid, fv in faces.items())


def conferir_chapeu(pid, malha, cabecas, faces, limites):
    cruz = {h: conferir(malha, cabecas[h]) for h in CABECAS}
    enc = {h: encaixe(malha, cabecas[h]) for h in CABECAS}
    p = pior(enc)
    dist, perto = rosto(malha, faces)
    ruins = [f'atravessa {h}' for h, r in cruz.items() if total(r) > 0]
    ruins += [f'{k} {p[k]} > {lim}' for k, lim in limites.items() if p[k] is not None and p[k] > lim]
    if p['folga_min'] is None or p['frente'] is None:
        ruins.append('não cobre o crânio')
    if dist < EPS:
        ruins.append(f'encosta em {perto}')
    print(f'{pid}: atravessa {sum(total(r) for r in cruz.values())} vértices das cabeças;', p,
          f'rosto {dist} ({perto})', '| REPROVADO: ' + '; '.join(ruins) if ruins else '| ok')
    return dict(cabecas=cruz, encaixe=enc, pior=p, rosto=dict(distancia=dist, mais_perto=perto),
                reprovados=ruins)


def main():
    cabecas = {h: importar(h)[0] for h in CABECAS}
    faces = {f[:-4]: importar(f[:-4])[0][0] for f in sorted(os.listdir(PARTS))
             if f.startswith(('eyebrow-', 'eyes-')) and f.endswith('.glb')}
    cabelos = {h: importar(h)[0] for h in CABELOS}
    relatorio = {'criterio': __doc__.split('Critério: ')[1].split('\n\nUso')[0].replace('\n', ' '), 'pecas': {}}
    # Régua dos chapéus antigos (contra as cabeças) e dos enfeites antigos (contra os cabelos).
    regua = {}
    for rid in REFERENCIAS['hat']:
        malha, _ = importar(rid)
        regua[rid] = pior({h: encaixe(malha, cabecas[h]) for h in CABECAS})
    limites = {k: max(regua[r][k] for r in COBREM if regua[r][k] is not None) for k in DESCIDA}
    limites['folga_min'] = FOLGA_MAX
    refs = {}
    for rid in REFERENCIAS['enfeite']:
        malha, _ = importar(rid)
        refs[rid] = {h: conferir(malha, cabelos[h]) for h in CABELOS}
    print('régua dos chapéus antigos (pior cabeça):')
    for rid, r in regua.items():
        print(f'  {rid}: {r}')
    print('  limites:', limites)
    falhou = False
    for pid, cat in NOVAS.items():
        malha, medida = importar(pid)
        item = dict(medida)
        if cat == 'hat':
            item.update(conferir_chapeu(pid, malha, cabecas, faces, limites))
            falhou |= bool(item['reprovados'])
        elif cat == 'enfeite':
            linhas, excecoes, ruins = {}, {}, []
            for h in CABELOS + CABECAS:
                r = conferir(malha, cabelos[h] if h in cabelos else cabecas[h])
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
                  'exceções (todos os antigos também atravessam):', ', '.join(excecoes) or 'nenhuma',
                  '| REPROVADO em ' + ', '.join(ruins) if ruins else '| ok')
            falhou |= bool(ruins)
        print(f'{pid}: {medida["triangulos"]} triângulos, {medida["kb"]} KB, materiais {medida["materiais"]}')
        relatorio['pecas'][pid] = item
    relatorio['ajustadas'] = {}
    for pid in AJUSTADAS:
        malha, medida = importar(pid)
        item = dict(medida, **conferir_chapeu(pid, malha, cabecas, faces, limites))
        falhou |= bool(item['reprovados'])
        print(f'{pid}: {medida["triangulos"]} triângulos, {medida["kb"]} KB, materiais {medida["materiais"]}')
        relatorio['ajustadas'][pid] = item
    relatorio['regua_chapeus'] = dict(antigos=regua, cobrem_o_cranio=COBREM, limites=limites)
    relatorio['referencias'] = {rid: {h: total(r) for h, r in linhas.items()} for rid, linhas in refs.items()}
    caminho_rel = os.path.join(HERE, 'festas-relatorio.json')
    with open(caminho_rel, 'w') as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)
        f.write('\n')
    if os.path.exists(BIOME):  # no formato do biome do monorepo (o lint passa sem mexer à mão)
        subprocess.run([BIOME, 'format', '--write', caminho_rel], check=False, capture_output=True)
    if falhou:
        sys.exit(1)


main()
