"""Os pontos de embarque do barco entre as ilhas (pedido de arte de 30/10/2026, a rede do barco).

O mesmo arranjo do cais do Recife (`arte/ilhas/recife.py`, `cais`), para o embarque do jogo valer
igual em todo porto: o barco atraca ao lado da ponta do deque, a 2,2 m do eixo, com a proa para o
mar (o +x da âncora `barco`), e os pés ficam na âncora `cais`, no meio do tampo, 1,2 m antes da
ponta. O jogo reaproveita o `ilhas/barco.glb` (com a âncora `passageiro`); aqui não há barco.

- `deque_de_praia`: o deque que sai da beira do tampo da ilha para o mar (Bosque, Vila Doce, Pico,
  Vale). As primeiras tábuas ficam em cima do tampo (topo a 1,12) e o resto na altura do cais do
  Recife (topo a 0,89): um degrau de 0,23 para baixo.
- `torre_de_escada`: a escada da Ilha das Nuvens, que flutua: o deque fica no mar e uma torre de
  madeira com três lances em volta de um miolo fechado sobe até o tampo da ilha (y = 1 no arquivo,
  8 no mundo), com o farolete no alto do miolo e a escadinha de sair do mar na ponta do deque.

Colisão: o que se pisa é `col-cais-*` (deque, tábuas da beira, degraus, patamares, ponte); o
guarda-corpo é `col-guarda-cais-*` e as estacas `col-cil-estaca-cais-*` (a câmera passa pelos dois,
`SO_PARA_O_CORPO`); o miolo da torre é `col-cais-torre`. As funções recebem o `col_caixa` e o
`col_cilindro` de quem chama (cada biblioteca de ilha numera os nós com o seu contador).

Cada função devolve (peças, dados): os dados vão para o relatório da ilha (`porto`).
"""
import math

import lib_q
from lib_mundo import box, cone, cyl, torus

R = math.radians
# A boia salva-vidas é a mesma do Recife (a paleta das ilhas de `lib_ilhas` já a tem).
lib_q.PALETTE.setdefault('boia', ('#ff6b5a', 0.6, None, 0))

TAMPO_DO_CAIS = 0.89  # topo do deque acima do mar (o do Recife)
TOPO_DA_BEIRA = 1.12  # topo das tábuas que ficam em cima do tampo da ilha (y = 1)
LARGURA = 1.7
AO_LADO = 2.2  # do eixo do deque ao meio do barco
ANTES_DA_PONTA = 1.2  # da ponta do deque à âncora `cais`
CASCO = (5.0, 2.0)  # comprimento e boca do `barco.glb`
FUNDO_DAS_ESTACAS = -2.5


class Eixo:
    """Um referencial no chão do jogo: origem (x, z), `s` para o rumo (graus no chão do jogo, do x
    para o z) e `t` para a direita de quem olha no rumo (com o y para cima). Converte para o Blender
    (x, −z, y)."""

    def __init__(self, x, z, rumo):
        self.x, self.z = x, z
        self.rumo = rumo
        a = R(rumo)
        self.d = (math.cos(a), math.sin(a))
        self.n = (-math.sin(a), math.cos(a))
        # Giro em volta do z do Blender que leva o x local para o rumo.
        self.giro = math.atan2(-self.d[1], self.d[0])

    def jogo(self, s, t):
        return (self.x + self.d[0] * s + self.n[0] * t, self.z + self.d[1] * s + self.n[1] * t)

    def b(self, s, t, y):
        x, z = self.jogo(s, t)
        return (x, -z, y)


def _caixa(e, s0, s1, t0, t1, y0, y1, m, bevel=0.015):
    """Caixa alinhada ao eixo, de s0 a s1, t0 a t1 e y0 a y1."""
    return box((abs(s1 - s0), abs(t1 - t0), y1 - y0), e.b((s0 + s1) / 2, (t0 + t1) / 2, (y0 + y1) / 2), m,
               bevel=bevel, segs=1, rot=(0, 0, e.giro))


def _col_caixa(col_caixa, nome, e, s0, s1, t0, t1, y0, y1):
    return col_caixa(nome, (abs(s1 - s0), abs(t1 - t0), y1 - y0), e.b((s0 + s1) / 2, (t0 + t1) / 2, (y0 + y1) / 2),
                     (0, 0, e.giro))


def _viga(a, b, larg, alt, m, bevel=0.01):
    """Caixa de um ponto a outro do jogo ((x, z, y) cada), deitada no caminho entre eles (`bevel` 0
    nos corrimãos finos: o chanfro quadruplica os triângulos e não aparece)."""
    (xa, za, ya), (xb, zb, yb) = a, b
    dx, dz, dy = xb - xa, zb - za, yb - ya
    plano = math.hypot(dx, dz)
    giro = math.atan2(-dz, dx)
    incl = math.atan2(dy, plano)
    return box((math.hypot(plano, dy), larg, alt), ((xa + xb) / 2, -(za + zb) / 2, (ya + yb) / 2), m, bevel=bevel,
               segs=1, rot=(0, -incl, giro))


def _col_viga(col_caixa, nome, a, b, larg, alt):
    (xa, za, ya), (xb, zb, yb) = a, b
    dx, dz, dy = xb - xa, zb - za, yb - ya
    plano = math.hypot(dx, dz)
    return col_caixa(nome, (math.hypot(plano, dy), larg, alt), ((xa + xb) / 2, -(za + zb) / 2, (ya + yb) / 2),
                     (0, -math.atan2(dy, plano), math.atan2(-dz, dx)))


def _estaca(e, s, t, y_topo, col, col_cilindro, r=0.12, fundo=FUNDO_DAS_ESTACAS):
    h = y_topo - fundo
    x, z = e.jogo(s, t)
    p = [cyl(r, h, (x, -z, fundo + h / 2), 'poste', verts=8),
         cyl(r + 0.01, 0.08, (x, -z, y_topo + 0.04), 'tabuaEscura', verts=8)]
    col.append(col_cilindro('estaca-cais', r + 0.01, h, (x, -z, fundo + h / 2)))
    return p


def _tabuado(e, s0, s1, t0, t1, y_topo, inicio=0):
    """Tábuas de 0,36 a cada 0,45 de s0 a s1 (a última encosta em s1), alternando as duas cores."""
    p = []
    n = max(1, round((s1 - s0) / 0.45))
    passo = (s1 - s0) / n
    for i in range(n):
        a = s0 + i * passo + (passo - 0.36) / 2
        p.append(_caixa(e, a, a + 0.36, t0, t1, y_topo - 0.08, y_topo, 'tabua' if (i + inicio) % 2 else 'tabuaEscura'))
    return p


def _lampiao(x, z, y):
    """O lampião no alto de uma estaca (o vidro `lanterna` acende à noite)."""
    return [box((0.3, 0.3, 0.36), (x, -z, y + 0.18), 'lanterna', bevel=0.03, segs=1),
            cone(0.26, 0.18, (x, -z, y + 0.45), 'metalEscuro', verts=4, rot=(0, 0, R(45)))]


def _cabeco(x, z, y):
    return [cyl(0.11, 0.32, (x, -z, y + 0.16), 'metalEscuro', verts=10),
            cyl(0.17, 0.06, (x, -z, y + 0.35), 'metalEscuro', verts=10)]


def caixa_no_jogo(objs):
    """A caixa (x, y, z do jogo) de uma lista de objetos do Blender."""
    from mathutils import Vector
    import bpy
    bpy.context.view_layer.update()
    xs, ys, zs = [], [], []
    for o in objs:
        for c in o.bound_box:
            v = o.matrix_world @ Vector(c)
            xs.append(v.x)
            ys.append(v.z)
            zs.append(-v.y)
    return {'min': [round(min(xs), 2), round(min(ys), 2), round(min(zs), 2)],
            'max': [round(max(xs), 2), round(max(ys), 2), round(max(zs), 2)]}


def _ancoras(e, s_ponta, lado, y_mar, y_tampo, t_eixo=0.0):
    """Onde ficam o barco e os pés: (barco x, z, y, giro em graus no chão do jogo) e (cais x, z, y).
    `t_eixo` é onde fica o eixo do deque (o meio do tampo) no `t` do referencial."""
    bx, bz = e.jogo(s_ponta, t_eixo + AO_LADO * lado)
    cx, cz = e.jogo(s_ponta - ANTES_DA_PONTA, t_eixo)
    return {'barco': {'x': round(bx, 3), 'z': round(bz, 3), 'y': y_mar, 'giro_graus': round(-e.rumo % 360, 2),
                      'giro_blender': e.giro},
            'cais': {'x': round(cx, 3), 'z': round(cz, 3), 'y': round(y_tampo, 3)}}


def _corredor(e, s_ponta, lado, t_eixo=0.0):
    """O trecho de mar que precisa ficar livre para o casco chegar: da proa do barco atracado até
    25 m para fora, com 5 m de meia largura em volta da linha dele (ao lado do deque o casco já
    está atracado; ali a folga é a do próprio deque)."""
    s0 = s_ponta + CASCO[0] / 2
    s1 = s0 + 25.0
    t = t_eixo + AO_LADO * lado
    cantos = [e.jogo(s0, t - 5), e.jogo(s0, t + 5), e.jogo(s1, t + 5), e.jogo(s1, t - 5)]
    return {'de_s': round(s0, 2), 'ate_s': round(s1, 2), 'meia_largura': 5.0,
            'cantos': [[round(x, 2), round(z, 2)] for x, z in cantos]}


# ------------------------------------------------------------------ deque de praia
def deque_de_praia(terra, rumo, degrau, comprimento, lado, col, col_caixa, col_cilindro):
    """O deque que sai do tampo para o mar. `terra` (x, z do jogo) é a beira do tampo, onde ele
    ainda é plano dos dois lados do deque; `degrau` é quanto depois dela o chão já desceu abaixo das
    tábuas do cais (ali começa o deque baixo); `comprimento` vai da beira até a ponta; `lado` (+1 ou
    −1) diz de que lado do eixo o barco atraca (+1 é a direita de quem olha no rumo)."""
    e = Eixo(terra[0], terra[1], rumo)
    meia = LARGURA / 2
    L = comprimento
    p = []
    cols = []
    # As tábuas da beira, em cima do tampo, até onde o chão desce; depois o deque do cais.
    p += _tabuado(e, -1.2, degrau, -meia, meia, TOPO_DA_BEIRA)
    p += _tabuado(e, degrau, L, -meia, meia, TAMPO_DO_CAIS, inicio=1)
    # Duas vigas debaixo das tábuas do cais (um centímetro abaixo: sem face rente).
    for t in (-0.55, 0.55):
        p.append(_caixa(e, degrau, L, t - 0.07, t + 0.07, TAMPO_DO_CAIS - 0.27, TAMPO_DO_CAIS - 0.09, 'poste'))
    # O espelho do degrau entre as tábuas da beira e o deque, e as vigas debaixo das tábuas da beira
    # (onde o tampo desce para a praia elas ficam à vista).
    p.append(_caixa(e, degrau - 0.04, degrau + 0.02, -meia, meia, TAMPO_DO_CAIS - 0.06, TOPO_DA_BEIRA - 0.09,
                    'tabuaEscura', bevel=0.01))
    for t in (-0.55, 0.55):
        p.append(_caixa(e, -1.0, degrau - 0.05, t - 0.07, t + 0.07, TOPO_DA_BEIRA - 0.27, TOPO_DA_BEIRA - 0.09,
                        'poste'))
    cols.append(_col_caixa(col_caixa, 'cais-beira', e, -1.2, degrau, -meia, meia, TOPO_DA_BEIRA - 0.32, TOPO_DA_BEIRA))
    cols.append(_col_caixa(col_caixa, 'cais-deque', e, degrau, L + 0.05, -meia, meia, TAMPO_DO_CAIS - 0.4,
                           TAMPO_DO_CAIS))
    # As estacas dos dois lados, a cada 1,8 m. Do lado do barco, nenhuma nos 2,8 m da ponta: ali a
    # criança passa do tampo para o convés.
    tb = 0.92 * lado
    s = degrau + 0.7
    estacas = []
    while s < L - 0.3:
        estacas.append(s)
        s += 1.8
    for s in estacas:
        p += _estaca(e, s, -tb, TAMPO_DO_CAIS + 0.42, cols, col_cilindro)
        if s < L - 2.8:
            p += _estaca(e, s, tb, TAMPO_DO_CAIS + 0.42, cols, col_cilindro)
    # A estaca da ponta, do lado de lá do barco, mais alta, com o lampião.
    p += _estaca(e, L - 0.12, -tb, 2.4, cols, col_cilindro, r=0.1)
    p += _lampiao(*e.jogo(L - 0.12, -tb), 2.48)
    # A boia salva-vidas presa nela e um rolo de corda no tampo, junto da borda de lá.
    bx, bz = e.jogo(L - 0.12, -(tb + 0.16 * lado))
    p.append(torus(0.3, 0.09, (bx, -bz, TAMPO_DO_CAIS + 0.75), 'boia', seg=14, rseg=6, rot=(R(90), 0, e.giro)))
    rx, rz = e.jogo(L - 1.9, -0.55 * lado)
    p.append(torus(0.2, 0.05, (rx, -rz, TAMPO_DO_CAIS + 0.05), 'corda', seg=12, rseg=4))
    p.append(torus(0.12, 0.05, (rx, -rz, TAMPO_DO_CAIS + 0.13), 'corda', seg=10, rseg=4))
    # Os cabeços de amarrar: a popa do barco (lado do barco, longe da passagem) e o lado de lá.
    for s_, t_ in ((L - 2.9, 0.62 * lado), (L - 0.6, -0.62 * lado)):
        p += _cabeco(*e.jogo(s_, t_), TAMPO_DO_CAIS)
    col.extend(cols)
    dados = _ancoras(e, L, lado, 0.0, TAMPO_DO_CAIS)
    dados.update({
        'tipo': 'deque de praia',
        'rumo_graus': rumo,
        'terra': {'x': round(terra[0], 3), 'z': round(terra[1], 3), 'y': TOPO_DA_BEIRA,
                  'nota': 'beira do tampo; as tábuas da beira entram 1,2 m no tampo (y = 1)'},
        'acesso': {'largura_livre': round(2 * (0.92 - 0.13), 2), 'degrau_tabuas_para_deque': round(
            TOPO_DA_BEIRA - TAMPO_DO_CAIS, 2), 'degrau_tampo_para_tabuas': round(TOPO_DA_BEIRA - 1.0, 2),
            'rampa_graus': 0, 'altura_livre': 'céu aberto'},
        'corredor_do_casco': _corredor(e, L, lado),
    })
    return p, cols, dados


# ------------------------------------------------------------------ torre das Nuvens
def torre_de_escada(beira, rumo, lado, y_mar, y_tampo, col, col_caixa, col_cilindro, recuo=0.9, S=7.6, w=1.8,
                    deque=4.0):
    """A escada da ilha que flutua. `beira` (x, z) é a beira do tampo no rumo; a torre começa
    `recuo` para fora dela e ocupa um quadrado de lado `S` do lado `lado` do eixo; `w` é a largura de
    cada lance e patamar (com o guarda-corpo, ficam 1,7 m livres). O deque do mar sai do canto de
    fora por `deque` metros. `y_mar` é o mar no referencial do arquivo e `y_tampo` o tampo da ilha.

    Os três lances (10, 10 e 9 espelhos) dão a volta no miolo: do canto A (embaixo, no deque) ao
    canto D (em cima, junto da ilha), de onde a ponte entra no tampo."""
    r0 = math.hypot(*beira) + recuo
    d = (math.cos(R(rumo)), math.sin(R(rumo)))
    e = Eixo(d[0] * r0, d[1] * r0, rumo)
    # Coordenadas da torre: u para fora (o s do eixo) e v para o lado da torre (o t vezes `lado`).
    def cx(u0, u1, v0, v1, y0, y1, m, bevel=0.015):
        return _caixa(e, u0, u1, v0 * lado, v1 * lado, y0, y1, m, bevel)

    def ccx(nome, u0, u1, v0, v1, y0, y1):
        return _col_caixa(col_caixa, nome, e, u0, u1, v0 * lado, v1 * lado, y0, y1)

    def pt(u, v, y):
        x, z = e.jogo(u, v * lado)
        return (x, z, y)

    p, cols = [], []
    y_d = y_mar + TAMPO_DO_CAIS
    topo = y_tampo + (TOPO_DA_BEIRA - 1.0)
    espelhos = (10, 10, 9)
    h = (topo - y_d) / sum(espelhos)
    corrida = S - 2 * w
    yA = y_d
    yB = yA + espelhos[0] * h
    yC = yB + espelhos[1] * h
    yD = yC + espelhos[2] * h
    fundo = y_mar + FUNDO_DAS_ESTACAS

    # O miolo: fechado do fundo do mar até 1,1 m acima do patamar de cima (o guarda-corpo de dentro),
    # com cintas de tábua e o farolete em cima.
    topo_miolo = yD + 1.1
    p.append(cx(w, S - w, w, S - w, fundo, topo_miolo, 'tabuaEscura', bevel=0.04))
    k = 0
    y = y_mar + 1.2
    while y < topo_miolo - 0.6:
        p.append(cx(w - 0.03, S - w + 0.03, w - 0.03, S - w + 0.03, y, y + 0.16, 'tabua' if k % 2 else 'poste',
                    bevel=0.02))
        y += 1.6
        k += 1
    p.append(cx(w - 0.08, S - w + 0.08, w - 0.08, S - w + 0.08, topo_miolo, topo_miolo + 0.14, 'tabua', bevel=0.03))
    cols.append(ccx('cais-torre', w, S - w, w, S - w, fundo, topo_miolo))
    # Os pilares dos cantos do miolo (4 cm para fora das paredes: sem face rente) e as escotilhas, que
    # acendem à noite (o vidro é `lanterna`), duas alturas em cada parede, abaixo do tampo da ilha.
    lados_do_miolo = ((w - 0.04, w + 0.26), (S - w - 0.26, S - w + 0.04))
    for u0, u1 in lados_do_miolo:
        for v0, v1 in lados_do_miolo:
            # Começam um pouco acima do fundo do miolo e passam da tampa dele (sem face rente).
            p.append(cx(u0, u1, v0, v1, fundo + 0.05, topo_miolo + 0.22, 'poste', bevel=0.03))
    meio = S / 2
    for (u, v, normal_u) in ((S - w + 0.02, meio, True), (w - 0.02, meio, True), (meio, S - w + 0.02, False),
                             (meio, w - 0.02, False)):
        giro = e.giro + R(90) if normal_u else e.giro
        for yy in (y_mar + 3.0, y_mar + 5.6):
            x, z = e.jogo(u, v * lado)
            p.append(torus(0.28, 0.05, (x, -z, yy), 'metalEscuro', seg=12, rseg=4, rot=(R(90), 0, giro)))
            p.append(cyl(0.24, 0.04, (x, -z, yy), 'lanterna', verts=12, rot=(R(90), 0, giro)))
    for du in (-0.5, 0.5):
        for dv in (-0.5, 0.5):
            x, z = e.jogo(meio + du, (meio + dv) * lado)
            p.append(cyl(0.06, 1.2, (x, -z, topo_miolo + 0.14 + 0.6), 'poste', verts=6))
    x, z = e.jogo(meio, meio * lado)
    p.append(box((0.62, 0.62, 0.62), (x, -z, topo_miolo + 0.14 + 0.5), 'lanterna', bevel=0.05, segs=1,
                 rot=(0, 0, e.giro)))
    p.append(cone(0.95, 0.6, (x, -z, topo_miolo + 0.14 + 1.5), 'telhado', verts=4, rot=(0, 0, e.giro + R(45))))

    # Patamares (canto A no deque, B, C e D em cima) e os degraus dos três lances.
    patamares = {'A': (S - w, S, 0, w, yA), 'B': (S - w, S, S - w, S, yB), 'C': (0, w, S - w, S, yC),
                 'D': (0, w, 0, w, yD)}
    for nome, (u0, u1, v0, v1, yy) in patamares.items():
        if nome == 'A':
            continue  # o canto A é o começo do deque (logo abaixo)
        p.append(cx(u0, u1, v0, v1, yy - 0.1, yy, 'tabua'))
        p.append(cx(u0 + 0.1, u1 - 0.1, v0 + 0.1, v1 - 0.1, yy - 0.32, yy - 0.11, 'poste'))
        cols.append(ccx('cais-patamar', u0, u1, v0, v1, yy - 0.3, yy))
    degraus = []
    # Lance 1: de A para B, no lado de fora (u de S−w a S), subindo em v.
    t1 = corrida / (espelhos[0] - 1)
    for j in range(1, espelhos[0]):
        v0 = w + (j - 1) * t1
        degraus.append((S - w, S, v0, v0 + t1, yA + j * h))
    # Lance 2: de B para C, no lado do fundo (v de S−w a S), vindo para dentro em u.
    t2 = corrida / (espelhos[1] - 1)
    for j in range(1, espelhos[1]):
        u1 = S - w - (j - 1) * t2
        degraus.append((u1 - t2, u1, S - w, S, yB + j * h))
    # Lance 3: de C para D, junto da ilha (u de 0 a w), voltando em v.
    t3 = corrida / (espelhos[2] - 1)
    for j in range(1, espelhos[2]):
        v1 = S - w - (j - 1) * t3
        degraus.append((0, w, v1 - t3, v1, yC + j * h))
    for i, (u0, u1, v0, v1, yy) in enumerate(degraus):
        p.append(cx(u0, u1, v0, v1, yy - 0.08, yy, 'tabua' if i % 2 else 'tabuaEscura', bevel=0.012))
        cols.append(ccx('cais-degrau', u0, u1, v0, v1, yy - 0.3, yy))
    # As pernas dos lances (vigas inclinadas por baixo dos degraus, uma de cada lado).
    for (a, b) in (((S - 0.15, w, yA), (S - 0.15, S - w, yB)), ((S - w + 0.15, w, yA), (S - w + 0.15, S - w, yB))):
        p.append(_viga(pt(*a[:2], a[2] - 0.2), pt(*b[:2], b[2] - 0.2), 0.12, 0.24, 'poste'))
    for (a, b) in (((S - w, S - 0.15, yB), (w, S - 0.15, yC)), ((S - w, S - w + 0.15, yB), (w, S - w + 0.15, yC))):
        p.append(_viga(pt(*a[:2], a[2] - 0.2), pt(*b[:2], b[2] - 0.2), 0.12, 0.24, 'poste'))
    for (a, b) in (((0.15, S - w, yC), (0.15, w, yD)), ((w - 0.15, S - w, yC), (w - 0.15, w, yD))):
        p.append(_viga(pt(*a[:2], a[2] - 0.2), pt(*b[:2], b[2] - 0.2), 0.12, 0.24, 'poste'))

    # O guarda-corpo do lado de fora (o de dentro é o miolo): postes do fundo do mar até 1 m acima do
    # piso, corrimão e travessa. A colisão é uma caixa por trecho, do piso até 1,1 m acima.
    def piso(u, v):
        """A altura do piso no contorno da torre (u, v) que o guarda-corpo acompanha."""
        if u >= S - w and v <= w:
            return yA
        if u >= S - w and v < S - w:
            return yA + (v - w) / corrida * (yB - yA)
        if v >= S - w and u >= S - w:
            return yB
        if v >= S - w and u > w:
            return yB + (S - w - u) / corrida * (yC - yB)
        if v >= S - w:
            return yC
        if u <= w and v > w:
            return yC + (S - w - v) / corrida * (yD - yC)
        return yD

    trechos = [((S - 0.05, w), (S - 0.05, S - w)), ((S - 0.05, S - w), (S - 0.05, S - 0.05)),
               ((S - 0.05, S - 0.05), (S - w, S - 0.05)), ((S - w, S - 0.05), (w, S - 0.05)),
               ((w, S - 0.05), (0.05, S - 0.05)), ((0.05, S - 0.05), (0.05, S - w)), ((0.05, S - w), (0.05, w)),
               # O canto D: o lado de fora (v = 0) e o lado do vão entre D e A (u = w).
               ((w - 0.05, 0.05), (w - 0.05, w)), ((0.05, 0.05), (w - 0.05, 0.05))]
    postes = set()
    for a, b in trechos:
        ya, yb = piso(*a), piso(*b)
        for (u, v, yy) in ((a[0], a[1], ya), (b[0], b[1], yb)):
            postes.add((round(u, 3), round(v, 3), round(yy, 3)))
        p.append(_viga(pt(a[0], a[1], ya + 0.95), pt(b[0], b[1], yb + 0.95), 0.1, 0.08, 'tabua', bevel=0))
        p.append(_viga(pt(a[0], a[1], ya + 0.5), pt(b[0], b[1], yb + 0.5), 0.06, 0.06, 'tabua', bevel=0))
        cols.append(_col_viga(col_caixa, 'guarda-cais', pt(a[0], a[1], ya + 0.55), pt(b[0], b[1], yb + 0.55), 0.1, 1.3))
    for (u, v, yy) in sorted(postes):
        x, z = e.jogo(u, v * lado)
        # O poste do canto D (junto da ilha) não desce ao mar: fica em cima do patamar.
        base = yD - 0.3 if u < w and v < w + 0.01 else fundo
        p.append(cyl(0.09, yy + 1.0 - base, (x, -z, (yy + 1.0 + base) / 2), 'poste', verts=8))
        if base == fundo:
            cols.append(col_cilindro('estaca-cais', 0.1, yy - 0.3 - base, (x, -z, (yy - 0.3 + base) / 2)))

    # A ponte do canto D até o tampo da ilha (entra 0,8 m no tampo), com guarda-corpo sobre o vão.
    u_ilha = -recuo - 0.8
    p += [cx(a, a + 0.36, 0.05, w - 0.05, topo - 0.08, topo, 'tabua' if i % 2 else 'tabuaEscura')
          for i, a in enumerate([u_ilha + k * 0.45 for k in range(int((0 - u_ilha) / 0.45) + 1)])]
    cols.append(ccx('cais-ponte', u_ilha, 0.0, 0.05, w - 0.05, topo - 0.3, topo))
    for v in (0.05, w - 0.05):
        a, b = (-recuo + 0.05, v, topo), (0.0, v, topo)
        p.append(_viga(pt(*a[:2], topo + 0.95), pt(*b[:2], topo + 0.95), 0.1, 0.08, 'tabua', bevel=0))
        x, z = e.jogo(-recuo + 0.05, v * lado)
        p.append(cyl(0.08, 1.0, (x, -z, topo + 0.5), 'poste', verts=8))
        cols.append(_col_viga(col_caixa, 'guarda-cais', pt(*a[:2], topo + 0.55), pt(*b[:2], topo + 0.55), 0.1, 1.3))

    # O deque do mar: do canto A para fora, com as estacas (nenhuma do lado do barco perto da ponta).
    L = S + deque
    n = max(1, round((L - (S - w)) / 0.45))
    passo = (L - (S - w)) / n
    for i in range(n):
        a = S - w + i * passo + (passo - 0.36) / 2
        p.append(cx(a, a + 0.36, 0.0, w, y_d - 0.08, y_d, 'tabua' if i % 2 else 'tabuaEscura'))
    for v in (0.35, w - 0.35):
        p.append(cx(S - w, L, v - 0.07, v + 0.07, y_d - 0.27, y_d - 0.09, 'poste'))
    cols.append(ccx('cais-deque', S - w, L + 0.05, 0.0, w, y_d - 0.4, y_d))
    for u in (S + 1.2,):
        for v in (-0.05, w + 0.05):
            x, z = e.jogo(u, v * lado)
            p.append(cyl(0.12, y_d + 0.42 - fundo, (x, -z, (y_d + 0.42 + fundo) / 2), 'poste', verts=8))
            p.append(cyl(0.13, 0.08, (x, -z, y_d + 0.46), 'tabuaEscura', verts=8))
            cols.append(col_cilindro('estaca-cais', 0.13, y_d + 0.42 - fundo, (x, -z, (y_d + 0.42 + fundo) / 2)))
    # A estaca alta da ponta, do lado de lá do barco, com o lampião e a boia.
    x, z = e.jogo(L - 0.12, (w + 0.05) * lado)
    p.append(cyl(0.1, y_d + 1.5 - fundo, (x, -z, (y_d + 1.5 + fundo) / 2), 'poste', verts=8))
    cols.append(col_cilindro('estaca-cais', 0.11, y_d + 1.5 - fundo, (x, -z, (y_d + 1.5 + fundo) / 2)))
    p += _lampiao(x, z, y_d + 1.5)
    bx, bz = e.jogo(L - 0.12, (w + 0.21) * lado)
    p.append(torus(0.3, 0.09, (bx, -bz, y_d + 0.75), 'boia', seg=14, rseg=6, rot=(R(90), 0, e.giro)))
    p += _cabeco(*e.jogo(S + 0.6, 0.3 * lado), y_d)

    # A escadinha de sair do mar: do lado de lá do barco, perto da ponta, descendo do tampo do deque
    # até 0,85 m debaixo d'água (quem cai na água sobe por ela, como na praia).
    esc_u0, esc_u1 = L - 1.6, L - 0.4
    for k in range(1, 8):
        v0 = w + (k - 1) * 0.3
        yy = y_d - 0.25 * k
        p.append(cx(esc_u0, esc_u1, v0, v0 + 0.3, yy - 0.06, yy, 'tabua' if k % 2 else 'tabuaEscura', bevel=0.01))
        cols.append(ccx('cais-degrau', esc_u0, esc_u1, v0, v0 + 0.3, yy - 0.3, yy))
    for u in (esc_u0 - 0.06, esc_u1 + 0.06):
        p.append(_viga(pt(u, w, y_d - 0.1), pt(u, w + 2.1, y_d - 0.25 * 7 - 0.15), 0.08, 0.2, 'poste'))
        x0, z0 = e.jogo(u, (w + 0.15) * lado)
        x1, z1 = e.jogo(u, (w + 1.35) * lado)
        p.append(cyl(0.05, 0.9, (x0, -z0, y_d - 0.25 + 0.45), 'metalEscuro', verts=6))
        p.append(_viga((x0, z0, y_d + 0.65), (x1, z1, y_d - 1.25 + 0.65), 0.06, 0.06, 'metalEscuro', bevel=0))

    col.extend(cols)
    dados = _ancoras(e, L, -lado, y_mar, y_d, t_eixo=(w / 2) * lado)
    dados['barco']['nota'] = f'y {y_mar} no arquivo = mar (y 0) no mundo, com a ilha no grupo a y {-y_mar}'
    dados['cais']['nota'] = f'y {round(y_d, 3)} no arquivo = {round(y_d - y_mar, 2)} no mundo'
    inclinacoes = [round(math.degrees(math.atan2(espelhos[i] * h, corrida)), 1) for i in range(3)]
    dados.update({
        'tipo': 'torre de escada (ilha que flutua)',
        'rumo_graus': rumo,
        'terra': {'x': round(e.jogo(u_ilha, (w / 2) * lado)[0], 3), 'z': round(e.jogo(u_ilha, (w / 2) * lado)[1], 3),
                  'y': round(topo, 3), 'nota': 'fim da ponte, 0,8 m dentro do tampo (y = 1 no arquivo, 8 no mundo)'},
        'acesso': {
            'largura_livre': round(w - 0.1, 2),
            'espelho': round(h, 4), 'pisadas': [round(t1, 3), round(t2, 3), round(t3, 3)],
            'espelhos_por_lance': list(espelhos), 'inclinacao_media_dos_lances_graus': inclinacoes,
            'altura_livre': 'céu aberto (nenhum lance passa debaixo de outro)',
            'patamares_y': {k: round(v[4], 3) for k, v in patamares.items()},
            'subida_total': round(topo - y_d, 3),
            'escadinha_do_mar': {'degraus': 7, 'espelho': 0.25, 'pisada': 0.3, 'ate_y': round(y_d - 1.75, 3)},
        },
        'percurso': [
            'cais (no deque do mar, y −6,11 no arquivo)',
            'canto A (o começo do deque, junto da torre)',
            f'lance 1: {espelhos[0]} espelhos de {h:.3f} m pelo lado de fora da torre até o patamar B',
            f'lance 2: {espelhos[1]} espelhos até o patamar C',
            f'lance 3: {espelhos[2]} espelhos, junto da ilha, até o patamar D (y {topo:.2f})',
            'ponte de 1,7 m sobre o vão até o tampo da ilha',
        ],
        'corredor_do_casco': _corredor(e, L, -lado, t_eixo=(w / 2) * lado),
    })
    return p, cols, dados


# ------------------------------------------------------------------ âncoras e relatório
def ancoras_do_porto(ancora, dados):
    """As âncoras `barco` (com o giro: o +x dela é a proa) e `cais`, com o `ancora` da ilha."""
    b, c = dados['barco'], dados['cais']
    barco = ancora('barco', b['x'], b['z'], b['y'])
    barco.rotation_euler = (0, 0, b.pop('giro_blender'))
    return [ancora('cais', c['x'], c['z'], c['y']), barco]


def caixas_da_ilha(nos, porto):
    """A caixa da ilha (x, y, z do jogo) sem e com o porto, e o maior raio no chão de cada uma: para o
    jogo recalcular a espera pelo chão e o carregamento."""
    import math as _m
    objs = []
    for val in nos.values():
        lista = val[0] if isinstance(val, tuple) else val
        objs += [o for o in lista if o is not None]
    antes = caixa_no_jogo(objs)
    depois = caixa_no_jogo(objs + list(porto))

    def raio(caixa):
        return round(max(_m.hypot(x, z) for x in (caixa['min'][0], caixa['max'][0])
                         for z in (caixa['min'][2], caixa['max'][2])), 2)

    from mathutils import Vector
    longe = 0.0
    for o in porto:
        if o.type != 'MESH':
            continue
        for v in o.data.vertices:
            w = o.matrix_world @ Vector(v.co)
            longe = max(longe, _m.hypot(w.x, w.y))
    return {'sem_o_porto': antes, 'com_o_porto': depois,
            'canto_mais_longe_sem': raio(antes), 'canto_mais_longe_com': raio(depois),
            'raio_do_porto_no_chao': round(longe, 2)}
