"""Ajudantes do kit de construir a casa e dos móveis dos cômodos (Blender sem tela, `bpy` do PyPI).

Importa a `lib_itens` (formas, paleta e `exportar`) e troca, ANTES de exportar, a pasta de saída
para `src/assets/casa` e o relatório para `arte/casa/relatorio.json` (a `lib_itens` lê as duas na
hora da chamada). Nada daqui grava em `arte/itens` nem em `src/assets/itens`.

Acrescenta:
- a paleta da casa (as cores da `casa.py` de `arte/mundo`, com os mesmos nomes) e a dos cômodos;
- `extrudar`: um perfil (y, z) puxado ao longo de x, sem tampa nas pontas que encostam na vizinha;
- `parede_grade`: parede com vãos numa malha só, em grade (a técnica da `casa.py`);
- `varrer`: um perfil puxado ao longo de um caminho no plano da parede (molduras, batentes, arcos);
- `loft_ret`: anéis de retângulos arredondados empilhados (cuba, banheira, vaso, tapete);
- `bloco`: prisma com chanfro só nas arestas de cima que você escolher (tábuas, ladrilhos);
- `exportar_casa`: grava o GLB com uma peça por nó, sem recentrar, e anota o tamanho de cada nó.

Eixos: no Blender o z aponta para cima e a frente olha para -Y (o glTF converte para o y para cima
do three.js, com a frente para +Z).
"""
import json
import math
import os
import sys

sys.dont_write_bytecode = True

# Nome próprio (o `from lib_itens import *` abaixo traz o AQUI da pasta dos itens).
PASTA_CASA = os.path.dirname(os.path.abspath(__file__))
RELATORIO_CASA = os.path.join(PASTA_CASA, 'relatorio.json')
SAIDA_CASA = os.path.abspath(os.environ.get('CASA_OUT', os.path.join(PASTA_CASA, '..', '..', 'src', 'assets', 'casa')))
os.makedirs(SAIDA_CASA, exist_ok=True)
# A lib_itens cria a pasta de saída na importação: aponta para a da casa antes de importar.
os.environ['ITENS_OUT'] = SAIDA_CASA
sys.path.insert(0, os.path.join(PASTA_CASA, '..', 'itens'))
import lib_itens  # noqa: E402
from lib_itens import *  # noqa: E402,F401,F403  (box, cyl, uvball, cone, torus, tube, prism, torneado, esfera…)



def _apontar_para_a_casa():
    """A saída e o relatório da lib_itens são lidos na hora do exportar: aponta os dois para a casa
    no próprio módulo antes de cada chamada."""
    lib_itens.SAIDA = SAIDA_CASA
    lib_itens.RELATORIO = RELATORIO_CASA


_apontar_para_a_casa()

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

R = math.radians

# ---------------------------------------------------------------- medidas do kit
CEL = 1.0          # uma célula da grade
H = 4.0            # altura da parede (a do quarto e da casa)
HB = 1.0           # altura da parede cortada (o "corte automático" para ver dentro)
T = 0.2            # espessura da parede (de -0,10 a +0,10 em volta da linha da grade)
Z0 = -0.1          # pé da parede: entra 10 cm abaixo do piso (o piso tem 10 cm)
INCL = 0.5         # telhado: sobe 0,5 a cada célula (26,6°, quase o da casa)
# Linhas horizontais comuns a TODAS as paredes: duas peças vizinhas dividem os mesmos vértices na
# emenda (sem junção em T). Os vãos só usam estas alturas, e a de 1,0 é a da parede cortada (uma
# parede em pé ao lado de uma cortada também casa).
PORTA_L, PORTA_A = 2.2, 3.0
JAN_B, JAN_T = 1.6, 2.8          # janela grande e janela em arco: peitoril e verga
RED_B = 2.3                      # janela redonda: vão quadrado de 0,5 (2,3 a 2,8)
CORTES_Y = (Z0, HB, JAN_B, RED_B, JAN_T, PORTA_A, H)
CORTES_Y_BAIXA = (Z0, HB)

# ---------------------------------------------------------------- paleta
# (cor, rugosidade, emissão, força). As da casa têm o mesmo nome e a mesma cor de arte/mundo.
lib_q.PALETTE.update({
    # casca (iguais à casa.py)
    'parede': ('#fbe7d2', 0.9, None, 0),
    'paredeSombra': ('#f0d6bb', 0.9, None, 0),
    'acabamento': ('#fffaf3', 0.8, None, 0),
    'batente': ('#8a5a33', 0.8, None, 0),
    'macaneta': ('#e8b23a', 0.35, None, 0),
    'telhado': ('#e0584f', 0.8, None, 0),
    'telhadoSombra': ('#c94a43', 0.8, None, 0),
    'alicerce': ('#b9b3aa', 0.9, None, 0),
    'vidroJanela': ('#bfe3f0', 0.15, '#ffd27a', 1.0),
    'floreira': ('#5b8fd6', 0.8, None, 0),
    'terra': ('#7a5435', 0.98, None, 0),
    'copa': ('#58b05a', 0.85, None, 0),
    'copaClara': ('#6cc46a', 0.85, None, 0),
    'petalaBranca': ('#fff8ee', 0.8, None, 0),
    'petalaRosa': ('#ff9cc2', 0.8, None, 0),
    'petalaAmarela': ('#ffd84f', 0.8, None, 0),
    'petalaLilas': ('#b99cff', 0.8, None, 0),
    'miolo': ('#f2a33a', 0.8, None, 0),
    'grama': ('#7dbb5a', 0.95, None, 0),
    'gramaClara': ('#93c96a', 0.95, None, 0),
    'tufo': ('#5fa346', 0.9, None, 0),
    'tufoClaro': ('#8ccc5e', 0.9, None, 0),
    'pedraCaminho': ('#d2cabb', 0.9, None, 0),
    'pedraCaminhoEscura': ('#bfb6a5', 0.9, None, 0),
    # kit novo
    'paredeDentro': ('#f7efe3', 0.92, None, 0),   # lado de dentro (+Y): o jogo pinta por cômodo
    'paredeVerso': ('#f7efe3', 0.92, None, 0),    # lado -Y da parede lisa (o cômodo vizinho)
    'paredeTopo': ('#e3d3bf', 0.9, None, 0),      # o topo (aparece na parede cortada)
    'rodape': ('#fffaf3', 0.8, None, 0),
    'portaMadeira': ('#c58b52', 0.7, None, 0),
    'portaMadeiraClara': ('#d8a066', 0.7, None, 0),
    'portaPintada': ('#9fd3c1', 0.75, None, 0),
    'portaPintadaClara': ('#b9e2d3', 0.75, None, 0),
    'ripa': ('#34507e', 0.8, None, 0),
    'telhadoForro': ('#f6e6d0', 0.9, None, 0),
    'telhadoBorda': ('#b3403a', 0.8, None, 0),
    'calha': ('#7fa7d9', 0.55, None, 0),
    'tabua': ('#c99263', 0.85, None, 0),
    'tabuaClara': ('#d8a874', 0.85, None, 0),
    'tabuaEscura': ('#b47e52', 0.85, None, 0),
    'ladrilhoClaro': ('#fff1dc', 0.6, None, 0),
    'ladrilhoCor': ('#de8a66', 0.6, None, 0),
    'azulejo': ('#fdfbf6', 0.45, None, 0),
    'azulejoCor': ('#6fcfc8', 0.5, None, 0),
})


# ---------------------------------------------------------------- malhas básicas
def _objeto(nome, bm, mats):
    """Objeto a partir de um bmesh já com `material_index` nas faces (índices de `mats`)."""
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(o)
    for m in mats:
        o.data.materials.append(lib_q.mat(m))
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def _orientar(f, esperado):
    f.normal_update()
    if f.normal.dot(Vector(esperado)) < 0:
        f.normal_flip()


def extrudar(perfil, x0, x1, mats, tampas=(True, True), nome='perfil', mtampas=None):
    """Perfil fechado [(y, z), …] puxado de x0 a x1. `mats` dá o material de cada aresta do perfil
    (da ponta i para a i+1); None não cria a face (fundo escondido). `tampas` fecha as pontas: uma
    peça que se repete lado a lado fica SEM tampa onde encosta na vizinha (as duas casam vértice a
    vértice e não sobra face escondida)."""
    n = len(perfil)
    if isinstance(mats, str):
        mats = [mats] * n
    area = sum(perfil[i][0] * perfil[(i + 1) % n][1] - perfil[(i + 1) % n][0] * perfil[i][1] for i in range(n))
    if area < 0:
        perfil = list(reversed(perfil))
        # a aresta i passa a ser a antiga n-2-i
        mats = [mats[(n - 2 - i) % n] for i in range(n)]
    nomes = sorted({m for m in mats if m}, key=lambda m: [x for x in mats if x].index(m))
    tampa = next((m for m in mats if m), 'parede')
    mt = mtampas or (tampa, tampa)
    for m, usa in zip(mt, tampas):
        if usa and m not in nomes:
            nomes.append(m)
    bm = bmesh.new()
    A = [bm.verts.new((x0, y, z)) for y, z in perfil]
    B = [bm.verts.new((x1, y, z)) for y, z in perfil]
    for i in range(n):
        if not mats[i]:
            continue
        j = (i + 1) % n
        f = bm.faces.new((A[i], A[j], B[j], B[i]))
        dy, dz = perfil[j][0] - perfil[i][0], perfil[j][1] - perfil[i][1]
        _orientar(f, (0, dz, -dy))
        f.material_index = nomes.index(mats[i])
    if tampas[0]:
        f = bm.faces.new(A)
        _orientar(f, (-1, 0, 0))
        f.material_index = nomes.index(mt[0])
    if tampas[1]:
        f = bm.faces.new(B)
        _orientar(f, (1, 0, 0))
        f.material_index = nomes.index(mt[1])
    return _objeto(nome, bm, nomes)


def parede_grade(u0, u1, y0, y1, z0, z1, vaos, mfrente, mverso, mtopo, mvao=None, cortes_y=(), cortes_u=(),
                 tampas=False, fundo=False, nome='parede'):
    """Parede ao longo de x, de u0 a u1, espessura de y0 (frente, -Y) a y1 (verso, +Y), de z0 a z1,
    com vãos retangulares [(centro, largura, base, topo)].

    É UMA malha em grade (o `parede_com_vaos` da casa): toda face divide os vértices com as vizinhas,
    e as linhas `cortes_y` vão de ponta a ponta. Duas peças vizinhas feitas com as mesmas linhas
    casam vértice a vértice na emenda. Sem `tampas` as pontas ficam abertas (a vizinha ou a quina
    fecham); sem `fundo` não há a face de baixo (fica enterrada no piso)."""
    mvao = mvao or mfrente
    us = {u0, u1, *cortes_u}
    ys = {z0, z1, *[c for c in cortes_y if z0 <= c <= z1]}
    for c, w, b, t in vaos:
        us |= {c - w / 2, c + w / 2}
        ys |= {max(b, z0), min(t, z1)}
    us = sorted(us)
    ys = sorted(ys)
    nomes = []
    for m in (mfrente, mverso, mtopo, mvao):
        if m not in nomes:
            nomes.append(m)

    def cheia(i, j):
        if not (0 <= i < len(us) - 1 and 0 <= j < len(ys) - 1):
            return False
        um, ym = (us[i] + us[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
        return not any(c - w / 2 < um < c + w / 2 and b < ym < t for c, w, b, t in vaos)

    bm = bmesh.new()
    vs = {}

    def V(i, j, k):
        if (i, j, k) not in vs:
            vs[(i, j, k)] = bm.verts.new((us[i], (y0, y1)[k], ys[j]))
        return vs[(i, j, k)]

    def face(vv, esperado, m):
        f = bm.faces.new(vv)
        _orientar(f, esperado)
        f.material_index = nomes.index(m)

    ni, nj = len(us) - 1, len(ys) - 1
    for i in range(ni):
        for j in range(nj):
            if not cheia(i, j):
                continue
            face([V(i, j, 0), V(i + 1, j, 0), V(i + 1, j + 1, 0), V(i, j + 1, 0)], (0, -1, 0), mfrente)
            face([V(i, j, 1), V(i + 1, j, 1), V(i + 1, j + 1, 1), V(i, j + 1, 1)], (0, 1, 0), mverso)
            for di, esp in ((-1, (-1, 0, 0)), (1, (1, 0, 0))):
                if cheia(i + di, j):
                    continue
                borda = (i == 0 and di < 0) or (i == ni - 1 and di > 0)
                if borda and not tampas:
                    continue
                ii = i if di < 0 else i + 1
                face([V(ii, j, 0), V(ii, j + 1, 0), V(ii, j + 1, 1), V(ii, j, 1)], esp, mfrente if borda else mvao)
            if not cheia(i, j - 1) and (j > 0 or fundo):
                face([V(i, j, 0), V(i + 1, j, 0), V(i + 1, j, 1), V(i, j, 1)], (0, 0, -1), mvao)
            if not cheia(i, j + 1):
                face([V(i, j + 1, 0), V(i + 1, j + 1, 0), V(i + 1, j + 1, 1), V(i, j + 1, 1)], (0, 0, 1),
                     mtopo if j == nj - 1 else mvao)
    return _objeto(nome, bm, nomes)


def varrer(caminho, fechado, perfil, mats, tampas=True, y=0.0, nome='moldura'):
    """Perfil [(o, d), …] puxado ao longo de um caminho [(x, z), …] no plano da parede (y = `y`).

    `o` é o deslocamento para FORA do caminho, no plano (positivo à direita de quem anda: num caminho
    anti-horário visto de -Y, para fora), e `d` a profundidade em y. As quinas saem em meia-esquadria.
    `mats` dá o material de cada aresta do perfil (fechado)."""
    n = len(perfil)
    if isinstance(mats, str):
        mats = [mats] * n
    P = [Vector((x, z)) for x, z in caminho]
    m = len(P)

    def normal(a, b):
        d = (b - a).normalized()
        return Vector((d.y, -d.x))

    miter = []
    for k in range(m):
        if fechado:
            n1, n2 = normal(P[k - 1], P[k]), normal(P[k], P[(k + 1) % m])
        else:
            n1 = normal(P[k - 1], P[k]) if k > 0 else normal(P[0], P[1])
            n2 = normal(P[k], P[k + 1]) if k < m - 1 else normal(P[m - 2], P[m - 1])
        s = n1 + n2
        miter.append(s / (1 + n1.dot(n2)))
    nomes = []
    for mm in mats:
        if mm and mm not in nomes:
            nomes.append(mm)
    bm = bmesh.new()
    aneis = []
    for k in range(m):
        aneis.append([bm.verts.new((P[k].x + o * miter[k].x, y + d, P[k].y + o * miter[k].y)) for o, d in perfil])
    segs = m if fechado else m - 1
    for k in range(segs):
        a, b = aneis[k], aneis[(k + 1) % m]
        for i in range(n):
            if not mats[i]:
                continue
            j = (i + 1) % n
            f = bm.faces.new((a[i], a[j], b[j], b[i]))
            f.material_index = nomes.index(mats[i])
    if not fechado and tampas:
        for k in (0, m - 1):
            f = bm.faces.new(aneis[k])
            f.material_index = nomes.index(next(mm for mm in mats if mm))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _objeto(nome, bm, nomes)


def contorno_ret(w, d, r, seg=4, cx=0.0, cy=0.0):
    """Pontos de um retângulo de cantos arredondados (anti-horário, visto de cima)."""
    r = max(min(r, w / 2, d / 2), 0.0)
    pts = []
    for qx, qy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        ccx, ccy = cx + qx * (w / 2 - r), cy + qy * (d / 2 - r)
        for k in range(seg + 1):
            a = R(a0 + 90 * k / seg)
            p = (ccx + r * math.cos(a), ccy + r * math.sin(a))
            if not pts or (abs(p[0] - pts[-1][0]) > 1e-6 or abs(p[1] - pts[-1][1]) > 1e-6):
                pts.append(p)
    if abs(pts[0][0] - pts[-1][0]) < 1e-6 and abs(pts[0][1] - pts[-1][1]) < 1e-6:
        pts.pop()
    return pts


def loft_ret(perfil, w, d, r, mats, seg=4, pos=(0, 0, 0), topo=False, base=False, liso=True, nome='loft'):
    """Anéis de retângulos arredondados: `perfil` = [(recuo, z), …] de baixo para cima; cada anel é o
    retângulo w × d encolhido `recuo` de cada lado (cantos com raio r - recuo). `mats` dá o material
    de cada faixa entre anéis (uma lista ou um nome). `base` e `topo` fecham o primeiro e o último
    anel com uma face. Serve para cuba, banheira, vaso, tapete e almofada."""
    if isinstance(mats, str):
        mats = [mats] * (len(perfil) - 1)
    nomes = []
    for mm in mats:
        if mm not in nomes:
            nomes.append(mm)
    bm = bmesh.new()
    aneis = []
    for rec, z in perfil:
        pts = contorno_ret(max(w - 2 * rec, 0.002), max(d - 2 * rec, 0.002), max(r - rec, 0.001), seg)
        aneis.append([bm.verts.new((pos[0] + x, pos[1] + y, pos[2] + z)) for x, y in pts])
    for k in range(len(aneis) - 1):
        a, b = aneis[k], aneis[k + 1]
        if len(a) != len(b):
            raise ValueError('anéis com contagens diferentes no loft_ret')
        for i in range(len(a)):
            j = (i + 1) % len(a)
            f = bm.faces.new((a[i], a[j], b[j], b[i]))
            f.material_index = nomes.index(mats[k])
    if base:
        f = bm.faces.new(list(reversed(aneis[0])))
        f.material_index = nomes.index(mats[0])
    if topo:
        f = bm.faces.new(aneis[-1])
        f.material_index = nomes.index(mats[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _objeto(nome, bm, nomes)
    if liso:
        for p in o.data.polygons:
            p.use_smooth = True
        o.data.set_sharp_from_angle(angle=R(40))
    return o


def _inter(p1, d1, p2, d2):
    """Interseção das retas p1 + t d1 e p2 + s d2 (2D)."""
    den = d1.x * d2.y - d1.y * d2.x
    if abs(den) < 1e-9:
        return p1.copy()
    t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den
    return p1 + d1 * t


def bloco(poligono, z0, z1, ch, mat, chanfrar=None, mlado=None, tampa_lados=None, nome='bloco'):
    """Prisma de um polígono convexo anti-horário [(x, y), …], de z0 a z1, com chanfro `ch` só nas
    arestas de cima marcadas em `chanfrar` (lista de bool por aresta; padrão todas). Sem fundo.
    `tampa_lados` (bool por aresta) tira a face lateral da aresta (a tábua que continua na vizinha)."""
    P = [Vector(p) for p in poligono]
    n = len(P)
    chanfrar = chanfrar or [True] * n
    tampa_lados = tampa_lados or [True] * n
    mlado = mlado or mat
    nomes = [mat] if mlado == mat else [mat, mlado]
    # Topo: cada aresta chanfrada entra `ch` para dentro.
    dirs = [(P[(i + 1) % n] - P[i]).normalized() for i in range(n)]
    dentro = [Vector((-d.y, d.x)) for d in dirs]
    linhas = [(P[i] + dentro[i] * (ch if chanfrar[i] else 0), dirs[i]) for i in range(n)]
    Tt = [_inter(linhas[i - 1][0], linhas[i - 1][1], linhas[i][0], linhas[i][1]) for i in range(n)]
    zc = z1 - ch
    bm = bmesh.new()
    top = [bm.verts.new((t.x, t.y, z1)) for t in Tt]
    meio = [bm.verts.new((p.x, p.y, zc)) for p in P]
    baixo = [bm.verts.new((p.x, p.y, z0)) for p in P]
    f = bm.faces.new(top)
    _orientar(f, (0, 0, 1))
    f.material_index = 0
    for i in range(n):
        j = (i + 1) % n
        fora = (dirs[i].y, -dirs[i].x, 0)
        if chanfrar[i]:
            f = bm.faces.new((meio[i], meio[j], top[j], top[i]))
            _orientar(f, (fora[0], fora[1], 1))
            f.material_index = 0
            if tampa_lados[i]:
                f = bm.faces.new((baixo[i], baixo[j], meio[j], meio[i]))
                _orientar(f, fora)
                f.material_index = nomes.index(mlado)
        elif tampa_lados[i]:
            vv = [baixo[i], baixo[j]]
            vv += [meio[j]] if chanfrar[j] else []
            vv += [top[j], top[i]]
            vv += [meio[i]] if chanfrar[i - 1] else []
            f = bm.faces.new(vv)
            _orientar(f, fora)
            f.material_index = nomes.index(mlado)
    return _objeto(nome, bm, nomes)


def sem_fundo(o, z=None, tol=1e-4):
    """Apaga as faces viradas para baixo no plano mais baixo (ficam enterradas, nunca aparecem)."""
    bpy.context.view_layer.update()
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    mw = o.matrix_world
    zs = [(mw @ v.co).z for v in bm.verts]
    zmin = min(zs) if z is None else z
    apagar = [f for f in bm.faces if f.normal.z < -0.99 and all(abs((mw @ v.co).z - zmin) < tol for v in f.verts)]
    bmesh.ops.delete(bm, geom=apagar, context='FACES')
    bm.to_mesh(me)
    bm.free()
    return o


def florzinha(pos, cor, r=0.06, seed=0, seg=8, aneis=5):
    """Flor fofa: cinco pétalas em bolinha e o miolo, para floreiras e vasos."""
    x, y, z = pos
    p = []
    for k in range(5):
        a = R(72 * k + seed * 17)
        p.append(uvball(r * 0.55, (x + r * 0.6 * math.cos(a), y + r * 0.6 * math.sin(a), z), cor, seg=seg, ring=aneis,
                        scale=(1, 1, 0.55)))
    p.append(uvball(r * 0.42, (x, y, z + r * 0.12), 'miolo', seg=seg, ring=aneis, scale=(1, 1, 0.7)))
    return p


def caixa(x0, x1, y0, y1, z0, z1, m, bevel=0.0, segs=1):
    """Caixa pelos limites (mais fácil de casar medidas que centro e tamanho)."""
    return box((x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m, bevel=bevel, segs=segs)


# ---------------------------------------------------------------- exportação
def _caixa_obj(o):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def exportar_casa(pid, nos, clipes=None, grupo='casa', notas=None):
    """Grava `src/assets/casa/<pid>.glb` com uma peça por nó, cada uma no SEU referencial (nada é
    recentrado: as peças ficam umas sobre as outras na origem, e o jogo clona o nó que quiser).
    Anota no relatório, por nó: triângulos, tamanho (largura x, altura, fundo, em unidades do jogo) e
    a caixa no Blender (para conferir o contrato)."""
    _apontar_para_a_casa()
    assert os.path.dirname(os.path.abspath(lib_itens.RELATORIO)) == PASTA_CASA
    assert os.path.abspath(lib_itens.SAIDA) == SAIDA_CASA
    caminho = lib_itens.exportar(pid, nos, clipes=clipes, grupo=grupo, centrar=False)
    pecas = {}
    for nome in nos:
        o = bpy.data.objects.get(nome)
        if o is None or o.type != 'MESH':
            continue
        mn, mx = _caixa_obj(o)
        pecas[nome] = {
            'triangulos': sum(len(p.vertices) - 2 for p in o.data.polygons),
            'tamanho': [round(mx.x - mn.x, 3), round(mx.z - mn.z, 3), round(mx.y - mn.y, 3)],
            'caixa': [[round(c, 3) for c in mn], [round(c, 3) for c in mx]],
            'materiais': sorted({m.name for m in o.data.materials}),
        }
        if notas and nome in notas:
            pecas[nome]['nota'] = notas[nome]
    with open(RELATORIO_CASA) as f:
        rel = json.load(f)
    rel[pid]['pecas'] = pecas
    with open(RELATORIO_CASA, 'w') as f:
        f.write(lib_itens.json_como_biome(dict(sorted(rel.items()))) + '\n')
    return caminho
