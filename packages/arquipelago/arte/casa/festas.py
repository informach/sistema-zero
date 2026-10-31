"""Decoração de festa para a casa (`src/assets/casa/casa-festas.glb`, uma peça por nó).

O contrato dos móveis dos cômodos (`comodos.py`, README desta pasta): peça de chão com a base em
z = 0, centrada na célula e com a frente para -Y; peça de parede centrada na origem com o fundo em
y = +0,10 (a face da parede do kit). As de parede que se emendam (bandeirinhas, serpentina e varal
de luz) têm 1,0 de largura com as pontas do fio em x = ±0,5: postas lado a lado, o fio continua.

Reaproveita, importando (sem copiar), os ajudantes e a paleta de `arte/festas/lib_festas.py`
(`torneado`, `deformar`, `pintar_por` e os materiais das festas da Vila: bandeiras, confetes,
lanternas, `luz`, `fogo`, `brasa`, `estrela`) e os modelos parecidos das festas da Vila: a fogueira
de `junina.py`, a lanterna de papel de `lanternas.py` e a máscara de `carnaval.py`.

O que acende tem emissão: `luz` (lâmpadas, chama das lanternas), os papéis `lanternaAmarela` e
`lanternaRosa`, `fogo` e `brasa` (fogueira) e `estrela`. O jogo acende à noite, como a luminária.

- Junina: `festa-junina-bandeirinhas` (parede), `festa-junina-lanterna-papel` (parede, num braço de
  ferro), `festa-junina-fogueira` (1 × 1, de enfeite);
- Carnaval: `festa-carnaval-serpentina` (parede), `festa-carnaval-mascara` (parede),
  `festa-carnaval-confete` (1 × 1, no chão);
- Fim de ano: `festa-fim-de-ano-arvore` (1 × 1, com luzes e a estrela), `festa-fim-de-ano-guirlanda`
  (parede), `festa-fim-de-ano-estrela-janela` (parede, pendurada numa ventosa);
- Lanternas: `festa-lanternas-lanterna-chao` (1 × 1), `festa-lanternas-varal-de-luz` (parede).
"""
import os
import random
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'festas'))
# A paleta das festas entra ANTES da da casa: nos nomes que as duas têm (`parede`, `tabua`), vale a
# cor da casa, a mesma dos outros GLBs desta pasta.
import lib_festas  # noqa: E402
import carnaval  # noqa: E402
import junina  # noqa: E402
import lanternas  # noqa: E402
from lib_casa import *  # noqa: E402,F401,F403
from lib_casa import _objeto  # noqa: E402
from comodos import recentrar_parede  # noqa: E402

CORES_JUNINA = junina.CORES
CONFETES = carnaval.CONF


def na_altura(p):
    """Peça de parede que se emenda: centra só na altura (as pontas do fio ficam em x = ±0,5)."""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in p if o.type == 'MESH' for c in o.bound_box]
    cz = (min(q.z for q in pts) + max(q.z for q in pts)) / 2
    lib_ilha.place(p, loc=(0, 0, -cz))
    return p


def no_fundo(p):
    """Leva a peça de parede para o fundo encostar na face da parede (y = +0,10)."""
    _, mx = lib_itens._caixa(p)
    lib_ilha.place(p, loc=(0, 0.1 - mx.y, 0))
    return p


def no_chao(p):
    """Peça de chão: centrada na célula, com o ponto mais baixo no piso."""
    mn, mx = lib_itens._caixa(p)
    lib_ilha.place(p, loc=(-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
    return p


def fio_caido(flecha, y, z=0.0, n=16):
    """Pontos do fio de x = -0,5 a 0,5, caído `flecha` no meio, a `y` da parede."""
    return [(-0.5 + k / n, y, z - flecha * (1 - (2 * (-0.5 + k / n)) ** 2)) for k in range(n + 1)]


def ganchos(y_fio, z_do_fio, m='ferro'):
    """Dois preguinhos (x = ±0,46) da parede até o fio (`z_do_fio(x)`), com a cabeça na frente."""
    p = []
    for x in (-0.46, 0.46):
        z = z_do_fio(x)
        p.append(cyl(0.006, 0.1 - y_fio + 0.012, (x, (0.1 + y_fio - 0.012) / 2, z), m, verts=6, rot=(R(90), 0, 0)))
        p.append(uvball(0.011, (x, y_fio - 0.012, z), m, seg=8, ring=5))
    return p


# ---------------------------------------------------------------- Junina
def bandeirinhas():
    """Parede, 1,0: o barbante caído 6 cm entre dois preguinhos e seis bandeirinhas recortadas."""
    yf, flecha = 0.06, 0.06
    pts = fio_caido(flecha, yf)
    p = [tube(pts, [0.005] * len(pts), 'barbante', seg=5)]
    p += ganchos(yf, lambda x: -flecha * (1 - (2 * x) ** 2))
    n = 6
    for k in range(n):
        x = -0.5 + (k + 0.5) / n
        topo = -flecha * (1 - (2 * x) ** 2)
        w, h = 0.12, 0.17
        f = prism([(-w / 2, 0), (w / 2, 0), (w / 2, -h), (0, -h * 0.72), (-w / 2, -h)], 0.004,
                  (x, yf - 0.002, topo - 0.003), CORES_JUNINA[k % len(CORES_JUNINA)])
        f.rotation_euler = (0, 0, R((k % 3 - 1) * 5))
        lib_festas.deformar(f, lambda v: Vector((v.x, v.y + 0.012 * math.sin(v.x * 30), v.z)))
        p.append(f)
    return na_altura(p)


def lanterna_papel():
    """Parede: a lanterna de papel da Noite das Lanternas da Vila (`lanternas.lanterna_papel`, em
    amarelo e com 0,6 do tamanho) pendurada num braço de ferro preso na parede."""
    lant, gancho = lanternas.lanterna_papel('lanternaAmarela')
    k, ponta = 0.6, Vector((0, -0.2, 0.0))
    lib_ilha.place(lant, scale=k)
    lib_ilha.place(lant, loc=tuple(ponta - Vector(gancho) * k - Vector((0, 0, 0.03))))
    p = list(lant)
    p.append(caixa(-0.035, 0.035, 0.085, 0.1, -0.07, 0.11, 'ferro', bevel=0.006))
    p.append(tube([(0, 0.09, 0.06), (0, 0.0, 0.085), (0, -0.12, 0.075), (0, -0.2, 0.04)], [0.009] * 4, 'ferro', seg=6))
    p.append(tube([(0, 0.09, -0.04), (0, 0.02, 0.0), (0, -0.04, 0.07)], [0.007] * 3, 'ferro', seg=6))
    p.append(lib_q.torus(0.012, 0.004, (0, -0.2, 0.028), 'ferro', seg=10, rseg=4, rot=(0, R(90), 0)))
    return recentrar_parede(p)


def fogueira():
    """1 × 1: a fogueira da Junina da Vila (`junina.fogueira`) com 0,55 do tamanho, de enfeite: lenha
    cruzada, as pedras em volta e as chamas que acendem (`fogo`, `brasa`). A base fica no piso."""
    lenha, fogo = junina.fogueira()
    p = lenha + fogo
    lib_ilha.place(p, scale=0.55)
    return no_chao(p)


# ---------------------------------------------------------------- Carnaval
def serpentina():
    """Parede, 1,0: uma serpentina ondulada de ponta a ponta e quatro caindo em caracol."""
    p = []
    yf = 0.07
    def z_da_onda(x):
        return 0.02 * math.sin((x + 0.5) * 4 * math.pi) - 0.03 * (1 - (2 * x) ** 2)
    onda = [(-0.5 + k / 24, yf, z_da_onda(-0.5 + k / 24)) for k in range(25)]
    p.append(tube(onda, [0.007] * len(onda), 'confeteRosa', seg=4))
    p += ganchos(yf, z_da_onda)
    for i, (x, comp, m) in enumerate(((-0.3, 0.36, 'confeteAzul'), (-0.1, 0.5, 'confeteAmarelo'),
                                      (0.12, 0.3, 'confeteVerde'), (0.32, 0.44, 'confeteLilas'))):
        z0 = z_da_onda(x)
        n = 26
        hel = [(x + 0.035 * math.cos(2 * math.pi * 3.2 * k / n + i), yf - 0.035 - 0.03 * math.sin(2 * math.pi * 3.2 * k / n + i),
                z0 - comp * k / n) for k in range(n + 1)]
        hel[0] = (x, yf, z0)
        p.append(tube(hel, [0.006] * len(hel), m, seg=4))
    return na_altura(p)


def mascara():
    """Parede: a máscara de baile do painel do Carnaval da Vila (`carnaval.mascara`), sozinha e maior
    (1,7), com as penas e os brilhos, encostada na parede."""
    p = carnaval.mascara(0.0, 0.0, 'confeteRosa', 'pena', k=1.7)
    # A máscara da Vila fica com o fundo a 3,75 cm à frente do painel (y = 0): o fundo vai para a
    # face da parede.
    return recentrar_parede(no_fundo(p))


def confete():
    """1 × 1: confete espalhado no chão (redondinhos e quadradinhos), sem um encostar no outro e sem
    a face de baixo (o piso tapa)."""
    rnd = random.Random(11)
    p, lugares = [], []
    while len(lugares) < 64:
        r = 0.44 * math.sqrt(rnd.random())
        a = rnd.random() * 2 * math.pi
        x, y = math.cos(a) * r, math.sin(a) * r
        if any(math.hypot(x - u, y - v) < 0.055 for u, v in lugares):
            continue
        lugares.append((x, y))
    for k, (x, y) in enumerate(lugares):
        m = CONFETES[k % len(CONFETES)]
        if k % 3:
            o = cyl(0.018, 0.004, (x, y, 0.002), m, verts=6)
        else:
            o = box((0.032, 0.022, 0.004), (x, y, 0.002), m, bevel=0, rot=(0, 0, rnd.random() * 3))
        p.append(sem_fundo(o))
    return no_chao(p)


# ---------------------------------------------------------------- Fim de ano
def arvore():
    """1 × 1: árvore de Natal num vaso de barro: quatro andares de copa, bolas, um cordão de luzes em
    espiral (`luz`) e a estrela no alto (`estrela`)."""
    p = [torneado([(0, 0), (0.16, 0), (0.2, 0.26), (0.215, 0.27), (0.215, 0.3), (0.19, 0.3), (0.18, 0.28),
                   (0, 0.28)], 'barro', seg=16)]
    p[0] = sem_fundo(p[0])
    p.append(cyl(0.05, 0.25, (0, 0, 0.38), 'tronco', verts=8))
    andares = [(0.43, 0.42, 0.55), (0.35, 0.72, 0.48), (0.27, 0.98, 0.42), (0.18, 1.22, 0.36)]
    for i, (r, z, h) in enumerate(andares):
        p.append(cone(r, h, (0, 0, z + h / 2), 'copa' if i % 2 == 0 else 'copaClara', verts=14))
    # Bolas na beira de cada andar.
    for i, (r, z, h) in enumerate(andares):
        for k in range(5 if i < 2 else 4):
            a = 2 * math.pi * k / (5 if i < 2 else 4) + i * 0.6
            rr = r * 0.82
            m = ('enfeiteVermelho', 'enfeiteAzul', 'ouro')[(k + i) % 3]
            p.append(uvball(0.032, (math.cos(a) * rr, math.sin(a) * rr, z + h * 0.18 - 0.02), m, seg=8, ring=5))
    # Cordão de luzes: espiral pelo lado de fora das copas.
    esp = []
    for k in range(48):
        t = k / 47
        z = 0.5 + t * 1.0
        r = 0.4 * (1 - t) + 0.12 * t
        esp.append((math.cos(t * math.pi * 7) * r, math.sin(t * math.pi * 7) * r, z))
    p.append(tube(esp, [0.005] * len(esp), 'fio', seg=4))
    for k in range(1, 48, 2):
        p.append(uvball(0.017, esp[k], 'luz', seg=6, ring=4))
    topo = 1.22 + 0.36
    p.append(prism(lib_q.star_pts(0.11, 0.05), 0.035, (0, 0, topo + 0.07), 'estrela'))
    return p


def guirlanda():
    """Parede: guirlanda de folhas com frutinhas vermelhas, uma pinha e o laço embaixo."""
    p = []
    yc = 0.05
    p.append(lib_q.torus(0.19, 0.045, (0, yc, 0), 'copa', seg=20, rseg=6, rot=(R(90), 0, 0)))
    rnd = random.Random(5)
    for k in range(18):
        a = 2 * math.pi * k / 18
        rr = 0.19 + 0.03 * (1 if k % 2 else -1)
        p.append(uvball(0.04, (math.cos(a) * rr, yc - 0.02, math.sin(a) * rr), 'copaClara', scale=(1, 0.55, 0.8),
                        seg=6, ring=4))
    for k in range(9):
        a = 2 * math.pi * k / 9 + 0.3
        rr = 0.19 + rnd.uniform(-0.03, 0.03)
        p.append(uvball(0.017, (math.cos(a) * rr, yc - 0.05, math.sin(a) * rr), 'enfeiteVermelho', seg=6, ring=4))
    p.append(uvball(0.035, (0.13, yc - 0.045, 0.14), 'madeira', scale=(0.8, 0.8, 1.1), seg=8, ring=5))
    # Laço: duas alças, as pontas e o nó.
    for s in (-1, 1):
        p.append(prism([(0, 0), (s * 0.1, 0.05), (s * 0.11, -0.04)], 0.016, (0, yc - 0.06, -0.2), 'enfeiteVermelho'))
        p.append(prism([(s * 0.01, 0), (s * 0.05, -0.12), (s * 0.075, -0.1)], 0.012, (0, yc - 0.055, -0.21),
                       'enfeiteVermelho'))
    p.append(uvball(0.026, (0, yc - 0.068, -0.2), 'enfeiteVermelho', scale=(1, 0.7, 1), seg=8, ring=5))
    return recentrar_parede(no_fundo(p))


def estrela_janela():
    """Parede (janela): estrela facetada de cinco pontas (`estrela`) pendurada por um cordão numa
    ventosa, com uma lampadinha (`luz`) no meio da frente."""
    pts = lib_q.star_pts(0.17, 0.075)
    yc, zc = 0.05, 0.0
    bm = bmesh.new()
    contorno = [bm.verts.new((x, yc, zc + z)) for x, z in pts]
    frente = bm.verts.new((0, yc - 0.055, zc))
    tras = bm.verts.new((0, yc + 0.04, zc))
    n = len(contorno)
    for i in range(n):
        bm.faces.new((contorno[i], contorno[(i + 1) % n], frente))
        bm.faces.new((contorno[(i + 1) % n], contorno[i], tras))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    p = [_objeto('estrela', bm, ['estrela'])]
    p.append(uvball(0.018, (0, yc - 0.06, zc), 'luz', seg=8, ring=5))
    topo = zc + 0.17
    p.append(cyl(0.003, 0.16, (0, yc, topo + 0.08), 'barbante', verts=5))
    p.append(uvball(0.009, (0, yc, topo + 0.165), 'papel', seg=8, ring=5))
    p.append(cyl(0.022, 0.01, (0, 0.095, topo + 0.165), 'papel', verts=12, rot=(R(90), 0, 0)))
    p.append(cyl(0.005, 0.034, (0, 0.073, topo + 0.165), 'papel', verts=6, rot=(R(90), 0, 0)))
    return recentrar_parede(p)


# ---------------------------------------------------------------- Lanternas
def lanterna_chao():
    """1 × 1: a lanterna de papel das Lanternas da Vila (`lanternas.lanterna_papel`, em rosa) num
    tripé baixo de madeira, de pé no chão."""
    lant, _ = lanternas.lanterna_papel('lanternaRosa')
    zb = 0.32
    lib_ilha.place(lant, loc=(0, 0, zb))
    p = list(lant)
    p.append(torneado([(0, zb - 0.02), (0.13, zb - 0.02), (0.13, zb + 0.015), (0.115, zb + 0.015),
                       (0.115, zb), (0, zb)], 'madeira', seg=16))
    for k in range(3):
        a = 2 * math.pi * k / 3 + R(90)
        p.append(tube([(math.cos(a) * 0.1, math.sin(a) * 0.1, zb - 0.02), (math.cos(a) * 0.2, math.sin(a) * 0.2, 0.0)],
                      [0.014, 0.016], 'madeiraEscura', seg=6))
    p.append(lib_q.torus(0.13, 0.008, (0, 0, 0.13), 'madeiraEscura', seg=18, rseg=4))
    return no_chao(p)


def varal_de_luz():
    """Parede, 1,0: o fio caído entre dois preguinhos e cinco lâmpadas (`luz`) nos soquetes."""
    yf, flecha = 0.06, 0.05
    pts = fio_caido(flecha, yf)
    p = [tube(pts, [0.004] * len(pts), 'fio', seg=4)]
    p += ganchos(yf, lambda x: -flecha * (1 - (2 * x) ** 2))
    for k in range(5):
        x = -0.5 + (k + 0.5) / 5
        z = -flecha * (1 - (2 * x) ** 2)
        p.append(cyl(0.012, 0.03, (x, yf, z - 0.017), 'fio', verts=8))
        p.append(uvball(0.024, (x, yf, z - 0.055), 'luz', scale=(1, 1, 1.25), seg=10, ring=6))
    return na_altura(p)


PECAS = {
    'festa-junina-bandeirinhas': bandeirinhas,
    'festa-junina-lanterna-papel': lanterna_papel,
    'festa-junina-fogueira': fogueira,
    'festa-carnaval-serpentina': serpentina,
    'festa-carnaval-mascara': mascara,
    'festa-carnaval-confete': confete,
    'festa-fim-de-ano-arvore': arvore,
    'festa-fim-de-ano-guirlanda': guirlanda,
    'festa-fim-de-ano-estrela-janela': estrela_janela,
    'festa-lanternas-lanterna-chao': lanterna_chao,
    'festa-lanternas-varal-de-luz': varal_de_luz,
}
FOOTPRINT = {
    'festa-junina-bandeirinhas': 'parede, 1,0 de largura (emenda ponta com ponta)',
    'festa-junina-lanterna-papel': 'parede, 0,3 de largura',
    'festa-junina-fogueira': '1 × 1',
    'festa-carnaval-serpentina': 'parede, 1,0 de largura (emenda ponta com ponta)',
    'festa-carnaval-mascara': 'parede, 0,7 de largura',
    'festa-carnaval-confete': '1 × 1',
    'festa-fim-de-ano-arvore': '1 × 1',
    'festa-fim-de-ano-guirlanda': 'parede, 0,5 de largura',
    'festa-fim-de-ano-estrela-janela': 'parede, 0,32 de largura',
    'festa-lanternas-lanterna-chao': '1 × 1',
    'festa-lanternas-varal-de-luz': 'parede, 1,0 de largura (emenda ponta com ponta)',
}
# O que acende (o teste confere a emissão destas).
ACENDEM = {
    'festa-junina-lanterna-papel': ['lanternaAmarela', 'luz'],
    'festa-junina-fogueira': ['fogo', 'brasa'],
    'festa-fim-de-ano-arvore': ['luz', 'estrela'],
    'festa-fim-de-ano-estrela-janela': ['estrela', 'luz'],
    'festa-lanternas-lanterna-chao': ['lanternaRosa', 'luz'],
    'festa-lanternas-varal-de-luz': ['luz'],
}


def main():
    lib_festas.novo()
    nos = {nome: fn() for nome, fn in PECAS.items()}
    exportar_casa('casa-festas', nos, grupo='festas', notas=FOOTPRINT)


if __name__ == '__main__':
    main()
