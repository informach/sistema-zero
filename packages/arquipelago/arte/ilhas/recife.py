"""Recife Coral, versão completa (a casa da Maré, a tartaruga cartógrafa).

Mesmo chão da versão leve (areia, praia molhada), com:
- a lagoa no meio, com corais de quatro tipos (galho, cérebro, leque e tubo) e algas que balançam;
- a casa da Maré: redonda, com o casco de tartaruga de telhado, janelas de escotilha, cata-vento de
  rosa dos ventos e luneta; do lado, a mesa de mapas, o cavalete com o mapa do arquipélago e o cesto
  de mapas enrolados;
- o cais do barco entre ilhas (o barco é um arquivo à parte, `barco.glb`, com o clipe `balancar`);
- a caverna submarina no lado de fora da ilha (−x): rochas em ferradura, teto de pedra, chão de areia
  embaixo d'água, pérolas e cristais que brilham. Entra-se nadando pela boca, virada para o mar.

Saídas: `recife.glb` (nós `terreno`, `agua`, `construcoes`, `corais`, `enfeites`, `caverna`,
`alga-1`…`alga-10` com o clipe `balancar`, as âncoras e os nós de colisão `col-*`, 29/10/2026),
`recife-props.glb` e `barco.glb`.

Colisão (README de `arte/ilhas`): o chão (`col-terreno`), a casa da Maré (um cilindro até o casco),
a mesa e o cavalete de mapas, o cesto, o deque do cais (aberto nas bordas: dali se mergulha) com as
estacas, o lampião e o caixote, a caverna (as pedras da parede, o arco da boca, o teto e o chão de
areia), os corais grandes em volta da lagoa, os coqueiros, as pedras, o guarda-sol e o castelinho.
A lagoa (nó `agua`, um material só, que o jogo lê como o lago do Bosque) tem fundo na colisão:
a bacia de `FUNDO_DA_LAGOA` cavada no `col-terreno` (`cavar_bacia`), para a criança nadar; o
miolo mais escuro (`lagoaFunda`) é enfeite. O miúdo (conchas, estrelas, algas, os corais pequenos
dentro da lagoa e os da caverna) não colide.
"""
from lib_ilhas import *

SEMENTE = 4 * 1.7  # a mesma da versão leve
LAGOA = (-0.6, -0.6)
CASA = (-5.6, 6.0)
MESA = (-8.4, 3.0)
CAIS_INI = (2.8, -9.4)
CAIS_FIM = (4.4, -15.6)
CAVERNA = (-17.6, -2.0)   # centro do salão (fora do contorno da ilha, encostada na praia)
FUNDO_CAVERNA = -1.3
ALGAS = [(-2.6, -1.6, TOPO), (1.4, 1.0, TOPO), (-1.8, 1.8, TOPO), (2.0, -2.4, TOPO), (-3.6, 0.6, TOPO),
         (0.6, -3.4, TOPO), (-18.4, -1.0, FUNDO_CAVERNA), (-17.0, -3.4, FUNDO_CAVERNA),
         (-19.6, -2.6, FUNDO_CAVERNA - 0.4), (5.4, -12.8, -1.2)]


# ------------------------------------------------------------------ corais e algas
def coral_galho(x, z, cor, s=1.0, seed=0, y=TOPO):
    return anel.coral(x, z, cor, s, seed=seed, y=y)


def coral_cerebro(x, z, cor, s=1.0, y=TOPO, acento=None):
    bx, by = x, -z
    acento = acento or ('coralLilas' if cor != 'coralLilas' else 'coralRosa')
    p = [superellipsoid((1.2 * s, 1.1 * s, 0.75 * s), (bx, by, y + 0.2 * s), cor, e1=0.8, e2=0.9, seg=12, ring=7,
                        flat_bottom=0.25)]
    for k in range(3):
        p.append(torus((0.18 + 0.15 * k) * s, 0.035 * s, (bx, by, y + (0.56 - 0.07 * k) * s), acento, seg=12, rseg=3))
    return p


def coral_leque(x, z, cor, s=1.0, rot=0.0, y=TOPO, acento=None):
    """Leque-do-mar: uma placa fina recortada em ondas, num cabinho."""
    bx, by = x, -z
    acento = acento or ('coralLilas' if cor != 'coralLilas' else 'coralAzul')
    pts = [(0, 0)]
    for k in range(13):
        a = math.pi * k / 12
        r = (0.75 + 0.1 * math.sin(k * 2.1)) * s
        pts.append((math.cos(a) * r, math.sin(a) * r * 1.25))
    p = [prism(pts, 0.05 * s, (bx, by, y + 0.2 * s), cor, rot=(0, 0, rot))]
    p.append(cyl(0.06 * s, 0.25 * s, (bx, by, y + 0.1 * s), cor, verts=6))
    for k in range(4):
        a = math.pi * (0.2 + 0.2 * k)
        ca, sa = math.cos(rot), math.sin(rot)
        lx = math.cos(a) * 0.5 * s
        p.append(tube([(bx, by, y + 0.2 * s), (bx + ca * lx, by + sa * lx, y + 0.2 * s + math.sin(a) * 0.62 * s)],
                      [0.025 * s, 0.015 * s], acento, seg=4))
    return p


def coral_tubo(x, z, cor, s=1.0, seed=0, y=TOPO, boca='rochaRecifeEscura', altura=1.0):
    rnd = random.Random(seed)
    bx, by = x, -z
    p = []
    for k in range(5):
        a = 2 * math.pi * k / 5 + rnd.uniform(-0.3, 0.3)
        d = 0.0 if k == 0 else 0.28 * s
        h = rnd.uniform(0.5, 1.1) * s * altura
        cx, cy = bx + math.cos(a) * d, by + math.sin(a) * d
        p.append(cyl(0.13 * s, h, (cx, cy, y + h / 2 - 0.05), cor, verts=8, r2=0.15 * s))
        p.append(cyl(0.1 * s, 0.02, (cx, cy, y + h - 0.05 + 0.005), boca, verts=8))
    return p


# ------------------------------------------------------------------ corais desbotados (fase3-03)
# O coral que a criança replanta na lagoa começa desbotado: o mesmo desenho do vivo, sem cor (o
# branco de osso de um coral que perdeu as algas), um pouco mais baixo e com pedacinhos quebrados
# caídos na areia em volta. O jogo troca o desbotado pelo vivo quando ela replanta.
DESBOTADO, DESBOTADO_SOMBRA = 'coralDesbotado', 'coralDesbotadoSombra'


def cacos(x, z, s, seed, y):
    """Dois ou três pedacinhos de coral quebrado deitados na areia, perto da base."""
    rnd = random.Random(seed)
    p = []
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.5, 0.5)
        d = rnd.uniform(0.55, 0.75) * s
        c = (x + math.cos(a) * d, -z + math.sin(a) * d, y + 0.035 * s)
        giro = a + rnd.uniform(-0.6, 0.6)
        comp = rnd.uniform(0.16, 0.26) * s
        p.append(tube([(c[0] - math.cos(giro) * comp / 2, c[1] - math.sin(giro) * comp / 2, c[2]),
                       (c[0] + math.cos(giro) * comp / 2, c[1] + math.sin(giro) * comp / 2, c[2])],
                      [0.035 * s, 0.028 * s], DESBOTADO_SOMBRA if k else DESBOTADO, seg=5))
    return p


def coral_galho_desbotado(s=1.0):
    return anel.coral(0, 0, DESBOTADO, s * 0.9, seed=1, y=0) + cacos(0, 0, s, 11, 0)


def coral_cerebro_desbotado(s=1.0):
    return coral_cerebro(0, 0, DESBOTADO, s * 0.95, y=0, acento=DESBOTADO_SOMBRA) + cacos(0, 0, s * 1.3, 12, 0)


def coral_leque_desbotado(s=1.0):
    return coral_leque(0, 0, DESBOTADO, s * 0.9, y=0, acento=DESBOTADO_SOMBRA) + cacos(0, 0, s, 13, 0)


def coral_tubo_desbotado(s=1.0):
    return coral_tubo(0, 0, DESBOTADO, s, seed=2, y=0, boca=DESBOTADO_SOMBRA, altura=0.75) + cacos(0, 0, s, 14, 0)


def alga(x, z, y, seed=0, s=1.0):
    """Tufo de alga com três fitas (pivô na base): o clipe `balancar` gira o tufo."""
    rnd = random.Random(seed)
    p = []
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.4, 0.4)
        d = Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, 1.0))
        cor = ('alga', 'algaClara', 'algaFunda')[k]
        # Cada fita nasce um pouco afastada do meio, para o seu lado (as três saindo do mesmo ponto
        # tinham faces no mesmo plano perto da base).
        p.append(lib_ilha.lock((x + math.cos(a) * 0.06 * s, -z + math.sin(a) * 0.06 * s, y - 0.05), d,
                               (1.1 + 0.35 * k) * s, 0.09 * s, cor,
                               bend=(math.cos(a + 1.3) * 0.3, math.sin(a + 1.3) * 0.3, 0), n=6, seg=6))
    return p, (x, -z, y)


# ------------------------------------------------------------------ casa da Maré (na origem)
def casa_mare(col=None):
    p = []
    rp = 2.0
    hp = 2.4
    lx, ly = 1.7, -rp - 0.9
    if col is not None:
        # Um cilindro do chão até a base do casco (o casco não se pisa) e o tripé da luneta.
        col.append(col_cilindro('casa-mare', rp + 0.2, 3.6, (0, 0, TOPO + 1.8)))
        col.append(col_cilindro('poste-luneta', 0.3, 1.4, (lx, ly, TOPO + 0.7)))
    p.append(cyl(rp + 0.25, 0.25, (0, 0, TOPO + 0.12), 'rochaRecife', verts=20, bevel=0.05))
    p.append(cyl(rp, hp, (0, 0, TOPO + 0.25 + hp / 2), 'paredeConcha', verts=22))
    for k in range(2):
        p.append(torus(rp + 0.02, 0.05, (0, 0, TOPO + 0.9 + k * 1.0), 'concha', seg=22, rseg=4))
    # Telhado: o casco de tartaruga (meia cúpula verde com placas hexagonais) e a borda recortada.
    zc = TOPO + 0.25 + hp
    cup = superellipsoid((rp * 2 + 0.7, rp * 2 + 0.7, 3.2), (0, 0, zc), 'cascaTartaruga', e1=0.9, e2=1.0, seg=20,
                         ring=12, flat_bottom=0.5)
    p.append(cup)
    A = rp + 0.35
    for anel_, (n, el) in enumerate(((8, 0.35), (6, 0.85))):
        for k in range(n):
            az = 2 * math.pi * k / n + anel_ * 0.3
            ce, se = math.cos(el), math.sin(el)
            nrm = Vector((ce * math.cos(az), ce * math.sin(az), se * A / 1.6)).normalized()
            pos = Vector((A * ce * math.cos(az), A * ce * math.sin(az), zc + 1.6 * se))
            o = cyl(0.45 if anel_ == 0 else 0.4, 0.08, tuple(pos + nrm * 0.02), 'cascaPlaca', verts=6)
            o.rotation_euler = nrm.to_track_quat('Z', 'Y').to_euler()
            p.append(o)
    o = cyl(0.42, 0.08, (0, 0, zc + 1.62), 'cascaPlaca', verts=6)
    p.append(o)
    for k in range(16):
        a = 2 * math.pi * k / 16
        p.append(uvball(0.24, (math.cos(a) * (A - 0.05), math.sin(a) * (A - 0.05), zc + 0.02), 'cascaTartarugaEscura',
                        seg=8, ring=4, scale=(1, 1, 0.55)))
    # Cata-vento: rosa dos ventos e seta, de bronze.
    p.append(cyl(0.04, 0.8, (0, 0, zc + 2.0), 'bronze', verts=6))
    p.append(prism(star_pts(0.36, 0.1, 4, 90), 0.04, (0, 0, zc + 2.1), 'bronze', rot=(R(90), 0, 0)))
    p.append(prism([(-0.4, -0.04), (0.25, -0.04), (0.25, -0.12), (0.45, 0), (0.25, 0.12), (0.25, 0.04), (-0.4, 0.04)],
                   0.03, (0, 0, zc + 2.38), 'fitaMapa', rot=(R(90), 0, R(30))))
    # Porta em arco (para −Y), escotilhas e o degrau de meia-lua.
    p += porta(0, -rp - 0.02, TOPO + 0.25, 1.05, 1.85, -math.pi / 2, m='cascaTartarugaEscura', m_batente='concha')
    p.append(torus(0.6, 0.07, (0, -rp - 0.06, TOPO + 2.1), 'concha', seg=12, rseg=4, rot=(R(90), 0, 0), arc=180))
    for a in (R(-50), R(-130), R(30), R(150)):
        cx, cy = math.cos(a) * (rp + 0.03), math.sin(a) * (rp + 0.03)
        p.append(torus(0.3, 0.07, (cx, cy, TOPO + 1.55), 'bronze', seg=12, rseg=4, rot=(R(90), 0, a + R(90))))
        p.append(cyl(0.27, 0.05, (cx, cy, TOPO + 1.55), 'vidroJanela', verts=12, rot=(R(90), 0, a + R(90))))
    p.append(slab([(math.cos(math.pi + math.pi * k / 10) * 1.1, -rp - 0.05 + math.sin(math.pi + math.pi * k / 10) * 0.8)
                   for k in range(11)], TOPO, TOPO + 0.15, 'rochaRecife', bevel=0.04, segs=1, fundo=False))
    # Luneta num tripé, do lado da porta.
    for k in range(3):
        a = 2 * math.pi * k / 3
        p.append(tube([(lx, ly, TOPO + 1.1), (lx + math.cos(a) * 0.4, ly + math.sin(a) * 0.4, TOPO)], [0.03, 0.03],
                      'tronco', seg=4))
    p.append(cyl(0.08, 0.95, (lx, ly, TOPO + 1.3), 'bronze', verts=10, r2=0.12, rot=(R(60), 0, R(-20))))
    return p


def mesa_de_mapas(col=None):
    """Mesa com o mapa aberto, o cavalete do arquipélago e o cesto de mapas (na origem, frente −Y)."""
    if col is not None:
        col.append(col_caixa('mesa', (1.6, 1.0, 0.89), (0, 0, TOPO + 0.445)))
        col.append(col_caixa('cavalete', (1.3, 0.8, 2.0), (-1.6, 0.4, TOPO + 1.0)))
        # O cesto é baixo (0,5): o colisor vai até a altura que segura, para ninguém subir nele.
        col.append(col_cilindro('cesto', 0.36, 0.72, (1.3, 0.6, TOPO + 0.36)))
    p = [box((1.6, 1.0, 0.08), (0, 0, TOPO + 0.85), 'deque', bevel=0.02, segs=1)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl(0.05, 0.85, (sx * 0.7, sy * 0.4, TOPO + 0.42), 'deque', verts=6))
    p += mapa_aberto(0, 0, TOPO + 0.9)
    p.append(cyl(0.12, 0.03, (0.55, 0.25, TOPO + 0.91), 'bronze', verts=12))
    p.append(prism(star_pts(0.1, 0.03, 4, 90), 0.01, (0.55, 0.25, TOPO + 0.935), 'fitaMapa', rot=(0, 0, 0)))
    # Cavalete com o mapa do arquipélago (a ilha do meio e as seis em volta).
    cx, cy = -1.6, 0.4
    for sx in (-1, 1):
        p.append(tube([(cx + sx * 0.5, cy - 0.2, TOPO), (cx + sx * 0.35, cy, TOPO + 2.0)], [0.04, 0.04], 'deque', seg=4))
    p.append(tube([(cx, cy + 0.6, TOPO), (cx, cy + 0.05, TOPO + 1.8)], [0.04, 0.04], 'deque', seg=4))
    p.append(box((1.3, 0.05, 1.0), (cx, cy - 0.05, TOPO + 1.45), 'pergaminho', bevel=0.02, segs=1, rot=(R(-12), 0, 0)))
    cores = ('copa', 'casinhaRosa', 'coral', 'neve', 'rochaVulcao', 'nuvem')
    for k, c in enumerate(cores):
        a = 2 * math.pi * k / 6
        p.append(cyl(0.08, 0.02, (cx + math.cos(a) * 0.38, cy - 0.1 - math.sin(a) * 0.04, TOPO + 1.45 + math.sin(a) * 0.32),
                     c, verts=8, rot=(R(78), 0, 0)))
    p.append(cyl(0.11, 0.02, (cx, cy - 0.1, TOPO + 1.45), 'grama', verts=8, rot=(R(78), 0, 0)))
    # Cesto com mapas enrolados.
    p.append(cyl(0.32, 0.5, (1.3, 0.6, TOPO + 0.25), 'palha', verts=12, r2=0.38))
    for k in range(4):
        a = 2 * math.pi * k / 4
        p += mapa_rolo(1.3 + math.cos(a) * 0.12, 0.6 + math.sin(a) * 0.12, TOPO + 0.55, R(70) + k * 0.2, k)
    return p


def mapa_aberto(x, y, z):
    p = [box((0.95, 0.65, 0.01), (x, y, z + 0.005), 'pergaminho', bevel=0.0)]
    for sx in (-1, 1):
        p.append(cyl(0.035, 0.67, (x + sx * 0.48, y, z + 0.03), 'pergaminhoEscuro', verts=8, rot=(R(90), 0, 0)))
    rnd = random.Random(3)
    for k in range(5):
        # Cada mancha um pouco acima da anterior: duas que se cruzam não ficam no mesmo plano.
        p.append(cyl(rnd.uniform(0.05, 0.1), 0.006, (x + rnd.uniform(-0.3, 0.3), y + rnd.uniform(-0.2, 0.2),
                                                       z + 0.012 + 0.004 * k), 'tintaMapa' if k else 'coral', verts=8))
    p.append(tube([(x - 0.35, y - 0.2, z + 0.013), (x - 0.1, y + 0.05, z + 0.013), (x + 0.2, y - 0.1, z + 0.013)],
                  [0.008] * 3, 'fitaMapa', seg=3, cap=False))
    return p


def mapa_rolo(x, y, z, incl=R(70), k=0):
    o = cyl(0.05, 0.55, (x, y, z), 'pergaminho', verts=8, rot=(incl, 0, k * 1.3))
    f = torus(0.055, 0.015, (x, y, z), 'fitaMapa', seg=8, rseg=3, rot=(incl, 0, k * 1.3))
    return [o, f]


# ------------------------------------------------------------------ cais e caverna
def cais(col=None):
    a = Vector((CAIS_INI[0], -CAIS_INI[1], 0))
    b = Vector((CAIS_FIM[0], -CAIS_FIM[1], 0))
    d = b - a
    comp = d.length
    giro = math.atan2(d.y, d.x)
    nx, ny = -math.sin(giro), math.cos(giro)
    p = []
    zdeck = 0.85
    n = int(comp / 0.45)
    if col is not None:
        # O deque da tábua 3 até a ponta (antes dela as tábuas ficam na areia): uma caixa de 0,4 com o
        # topo no das tábuas. As bordas ficam abertas: dali se pula no mar para mergulhar.
        ini, fim_ = a + d * (2.5 / n), b + d / comp * 0.18
        meio, compr = (ini + fim_) / 2, (fim_ - ini).length
        col.append(col_caixa('cais', (compr, 1.7, 0.4), (meio.x, meio.y, zdeck + 0.04 - 0.2), (0, 0, giro)))
    for i in range(n + 1):
        c = a + d * (i / n)
        # Começa em cima da areia (y = 1) e desce até a altura do cais.
        zz = TOPO + 0.08 if i < 3 else zdeck
        p.append(box((0.36, 1.7, 0.08), (c.x, c.y, zz), 'tabua' if i % 2 else 'tabuaEscura', bevel=0.015, segs=1,
                     rot=(0, 0, giro)))
    for i in range(3, n + 1, 4):
        c = a + d * (i / n)
        for lado in (-1, 1):
            px, py = c.x + nx * 0.9 * lado, c.y + ny * 0.9 * lado
            p.append(cyl(0.12, 3.0, (px, py, zdeck - 1.0), 'poste', verts=8))
            if col is not None:
                col.append(col_cilindro('estaca', 0.13, 3.0, (px, py, zdeck - 1.0)))
            p.append(cyl(0.13, 0.08, (px, py, zdeck + 0.52), 'tabuaEscura', verts=8))
    # Cabeços de amarrar, a boia na estaca, o lampião e caixotes com mapas.
    fim = b
    for lado in (-1, 1):
        cx, cy = fim.x - d.x / comp * 0.6 + nx * 0.7 * lado, fim.y - d.y / comp * 0.6 + ny * 0.7 * lado
        p.append(cyl(0.12, 0.35, (cx, cy, zdeck + 0.2), 'metalEscuro', verts=10))
        p.append(cyl(0.18, 0.06, (cx, cy, zdeck + 0.4), 'metalEscuro', verts=10))
    p.append(torus(0.32, 0.1, (fim.x + nx * 0.98, fim.y + ny * 0.98, zdeck + 0.75), 'boia', seg=14, rseg=6,
                   rot=(R(90), 0, giro)))
    # O lampião fica um pouco para dentro do deque: na borda ele encostava na última estaca.
    p += lampiao_poste(fim.x - nx * 0.6, -(fim.y - ny * 0.6), y=zdeck + 0.04, h=2.0, m='poste')
    mid = a + d * 0.55
    p += caixote(mid.x - nx * 0.5, -(mid.y - ny * 0.5), s=0.55, y=zdeck, rot=giro, m='deque')
    if col is not None:
        col.append(col_cilindro('poste', 0.08, 2.3, (fim.x - nx * 0.6, fim.y - ny * 0.6, zdeck + 1.15)))
        # O caixote é baixo (0,55): o colisor vai até a altura que segura.
        col.append(col_caixa('caixote', (0.55, 0.55, 0.72), (mid.x - nx * 0.5, mid.y - ny * 0.5, zdeck + 0.36),
                             (0, 0, giro)))
    p.append(torus(0.25, 0.06, (mid.x + nx * 0.45, mid.y + ny * 0.45, zdeck + 0.08), 'corda', seg=12, rseg=4))
    p.append(torus(0.15, 0.06, (mid.x + nx * 0.45, mid.y + ny * 0.45, zdeck + 0.16), 'corda', seg=10, rseg=4))
    return p, (fim.x - d.x / comp * 1.2, -(fim.y - d.y / comp * 1.2), zdeck), (fim.x + nx * 2.2, fim.y + ny * 2.2, giro)


def caverna(col=None):
    """Caverna submarina: ferradura de rochas com a boca para o mar (−x), teto de pedra, chão de areia
    embaixo d'água e o tesouro de pérolas e cristais (que brilham, para dar para ver lá dentro)."""
    cx, cz = CAVERNA
    bx, by = cx, -cz
    p = []
    rnd = random.Random(21)
    # Paredes: pedras grandes e encostadas do fundo do mar até o teto; a boca abre ±32° em 180°.
    for k in range(26):
        a = 2 * math.pi * k / 26
        dif = abs(math.atan2(math.sin(a - math.pi), math.cos(a - math.pi)))
        if dif < R(34):
            continue
        r = 3.1 + rnd.uniform(-0.15, 0.25)
        h = rnd.uniform(4.2, 4.9)
        p.append(rock((bx + math.cos(a) * r, by + math.sin(a) * r, -2.6), (2.5, 2.3, h), 'rochaRecife' if k % 3 else
                      'rochaRecifeEscura', seed=100 + k, subdiv=1, rough=0.2))
        if col is not None:
            # Um pouco menor que a pedra (a pedra é redonda): do fundo até perto do topo.
            col.append(col_cilindro('rocha-caverna', 1.0, h * 0.9, (bx + math.cos(a) * r, by + math.sin(a) * r,
                                                                     -2.6 + h * 0.45)))
    # Pilares da boca e o arco por cima (o arco começa 1,6 acima da água: quem nada passa com a cabeça).
    for lado in (-1, 1):
        a = math.pi + lado * R(36)
        p.append(rock((bx + math.cos(a) * 3.0, by + math.sin(a) * 3.0, -2.6), (2.0, 1.9, 4.6), 'rochaRecifeEscura',
                      seed=200 + lado, subdiv=1, rough=0.18))
        if col is not None:
            col.append(col_cilindro('rocha-caverna', 0.8, 4.2, (bx + math.cos(a) * 3.0, by + math.sin(a) * 3.0, -0.5)))
    p.append(rock((bx - 3.0, by, 1.6), (1.5, 3.8, 1.3), 'rochaRecife', seed=210, subdiv=1, rough=0.15))
    if col is not None:
        # O arco da boca, o teto (de cima, um morrinho que se pisa) e o chão de areia lá embaixo.
        col.append(col_caixa('arco-caverna', (1.3, 3.6, 1.1), (bx - 3.0, by, 1.6 + 0.6)))
        col.append(col_cilindro('teto-caverna', 3.5, 0.95, (bx, by, 1.7 + 0.475)))
        col.append(col_cilindro('chao-caverna', 2.6, 0.3, (bx, by, FUNDO_CAVERNA - 0.15)))
        col.append(col_entre('tronco', (bx + 0.8, by - 0.6, 2.6), (bx + 0.8 + 0.6 * 0.8, by - 0.6, 2.6 + 3.4 * 0.8), 0.12))
    # Teto: placa de pedra irregular, com a areia e a grama por cima (de cima parece um morrinho).
    teto = slab(blob(bx, by, 3.9, 3.6, seed=4, n=20, wob=0.1), 1.7, 2.5, 'rochaRecife', bevel=0.25, segs=1,
                name='teto', fundo=True)
    p.append(teto)
    p.append(slab(blob(bx + 0.3, by, 3.0, 2.7, seed=5, n=18, wob=0.1), 2.45, 2.65, 'areia', bevel=0.12, segs=1,
                  name='tetoAreia', fundo=False))
    p += anel.coqueiro_leve(cx + 0.8, cz + 0.6, 0.8, y=2.6)
    # Chão de areia lá embaixo, corais, o mexilhão gigante com as pérolas e os cristais.
    p.append(slab(blob(bx, by, 2.8, 2.5, seed=6, n=20, wob=0.08), FUNDO_CAVERNA - 0.3, FUNDO_CAVERNA, 'areiaMolhada',
                  bevel=0.1, segs=1, name='chaoCaverna', fundo=False))
    for k, (dx, dz, c) in enumerate(((1.2, 1.4, 'coralRosa'), (1.6, -1.0, 'coralLaranja'), (-0.6, 1.8, 'coralAzul'))):
        p += coral_galho(cx + dx, cz + dz, c, 0.8, seed=300 + k, y=FUNDO_CAVERNA)
    p += coral_cerebro(cx + 0.2, cz - 1.9, 'coralAmarelo', 0.8, y=FUNDO_CAVERNA)
    mx, my = bx + 1.4, by - 0.1
    p.append(uvball(0.75, (mx, my, FUNDO_CAVERNA + 0.15), 'coralLilas', seg=12, ring=6, scale=(1, 1, 0.35)))
    # A concha de cima fica aberta para a boca da caverna (as pérolas aparecem de longe).
    tampa = uvball(0.72, (mx + 0.35, my, FUNDO_CAVERNA + 0.85), 'coralLilas', seg=12, ring=6, scale=(1, 1, 0.3))
    tampa.rotation_euler = (0, R(38), 0)
    p.append(tampa)
    for k in range(3):
        p.append(uvball(0.14, (mx - 0.1 + k * 0.15, my + (k - 1) * 0.12, FUNDO_CAVERNA + 0.36), 'perolaLuz', seg=10, ring=6))
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.4
        r = 2.4
        ax, ay = bx + math.cos(a) * r, by + math.sin(a) * r
        if abs(math.atan2(math.sin(a - math.pi), math.cos(a - math.pi))) < R(40):
            continue
        p.append(cone(0.18, 0.75, (ax, ay, FUNDO_CAVERNA + 0.35), 'cristalLuz', verts=6, rot=(R(rnd.uniform(-20, 20)), 0, 0)))
        p.append(cone(0.12, 0.5, (ax + 0.2, ay + 0.1, FUNDO_CAVERNA + 0.25), 'cristalLuz', verts=6, rot=(0, R(25), 0)))
    return p


# ------------------------------------------------------------------ chão, corais e enfeites
def terreno(col=None):
    p = anel.base(SEMENTE, topo='areia', praia='areiaMolhada')
    if col is not None:
        # O chão que se pisa: tampo, praia e barranco (as manchas e trilhas, milímetros acima, só desenham).
        col.append(col_terreno(p))
    x, z = LAGOA
    p.append(mancha(x, z, 4.8, 4.2, 'areiaMolhada', seed=2, z0=TOPO - 0.05, z1=TOPO + 0.02, n=32, wob=0.06))
    p.append(mancha(-2.2, 6.4, 3.6, 2.8, 'gramaClara', seed=9, z0=TOPO - 0.03, z1=TOPO + 0.015))
    p.append(trilha([(12.4, 0.0), (8.0, 0.2), (5.6, 1.2), (3.6, 3.6), (0.0, 5.2), (-3.0, 4.6)], 0.9, m='areiaMolhada',
                    z1=TOPO + 0.03))
    p.append(trilha([(6.0, 0.4), (4.6, -3.0), (3.4, -6.4), (2.8, -8.6)], 0.8, m='areiaMolhada', z1=TOPO + 0.03))
    p.append(trilha([(-4.2, 2.8), (-7.0, 0.6), (-9.6, -0.8), (-11.6, -1.4)], 0.7, m='areiaMolhada', z1=TOPO + 0.03))
    return p


# A bacia de nadar (só na colisão, a água do desenho cobre o fundo): funda como o lago do Bosque
# (a cintura da criança passa da linha da água), plana até `BACIA_PLANA` dos raios e com rampa até
# `BACIA_FIM`, ainda dentro da areia molhada da beira e antes dos colisores dos corais grandes (a
# 5,3 × 4,7 do meio, o de dentro a uns 3,9 no eixo curto).
RAIOS_DA_LAGOA = (4.2, 3.6)
FUNDO_DA_LAGOA = 0.85
BACIA_PLANA, BACIA_FIM = 0.4, 1.08


# Onde a criança replanta cada coral (fase3-03): a `FRACAO_DA_MUDA` dos raios da água, entre as algas,
# na água rasa da beira (o pé no fundo da bacia, uns 0,23 abaixo do tampo). Uma por tipo, na ordem
# galho, cérebro, leque e tubo (`recife-props.glb`).
ANGULOS_DAS_MUDAS = (0, 78, 182, 250)
FRACAO_DA_MUDA = 0.85


def ancoras_das_mudas():
    x0, z0 = LAGOA
    rx, rz = RAIOS_DA_LAGOA
    y = TOPO - profundidade_da_bacia(FRACAO_DA_MUDA, FUNDO_DA_LAGOA, BACIA_PLANA, BACIA_FIM)
    return [ancora(f'coral-muda-{i + 1}', x0 + math.cos(math.radians(g)) * rx * FRACAO_DA_MUDA,
                   z0 + math.sin(math.radians(g)) * rz * FRACAO_DA_MUDA, y)
            for i, g in enumerate(ANGULOS_DAS_MUDAS)]


def lagoa():
    """A água (um material só: o jogo lê a elipse e a altura dela) e o miolo mais escuro."""
    x, z = LAGOA
    agua = [mancha(x, z, *RAIOS_DA_LAGOA, 'lagoa', seed=2, z0=TOPO - 0.04, z1=TOPO + 0.045, n=32, wob=0.06)]
    miolo = [mancha(x + 0.4, z + 0.2, 2.2, 1.8, 'lagoaFunda', seed=5, z0=TOPO - 0.03, z1=TOPO + 0.05, n=24,
                    wob=0.08)]
    return agua, miolo


# Colisor de cada coral grande em volta da lagoa (raio e altura por escala), um pouco menor que o desenho.
COL_CORAL = {'galho': (0.45, 1.0), 'cerebro': (0.55, 0.6), 'leque': (0.5, 0.8), 'tubo': (0.4, 0.9)}


def corais(col=None):
    p = []
    x0, z0 = LAGOA
    tipos = ('galho', 'cerebro', 'leque', 'tubo')
    cores = ('coral', 'coralRosa', 'coralLilas', 'coralLaranja', 'coralAmarelo', 'coralAzul')
    for i in range(14):
        a = i * 2 * math.pi / 14 + 0.2
        x, z = x0 + math.cos(a) * 5.3, z0 + math.sin(a) * 4.7
        if x > 4.6 and abs(z) < 3.2:
            continue
        # Nada na frente da porta da Maré nem no começo da trilha da caverna.
        if math.hypot(x + 4.0, z - 3.8) < 2.4:
            continue
        t = tipos[i % 4]
        c = cores[i % 6]
        s = 0.9 + 0.25 * (i % 3)
        if col is not None:
            r, h = COL_CORAL[t]
            col.append(col_cilindro('coral', r * s, h * s + 0.1, (x, -z, TOPO + (h * s - 0.1) / 2)))
        if t == 'galho':
            p += coral_galho(x, z, c, s, seed=i)
        elif t == 'cerebro':
            p += coral_cerebro(x, z, c, s)
        elif t == 'leque':
            p += coral_leque(x, z, c, s, rot=a + math.pi / 2)
        else:
            p += coral_tubo(x, z, c, s, seed=i)
    dentro = ((coral_galho, 1.2, -1.4), (coral_tubo, -2.0, 1.0), (coral_cerebro, 2.2, 1.6), (coral_tubo, -0.6, -2.4))
    for i, (f, dx, dz) in enumerate(dentro):
        c = cores[(i + 2) % 6]
        if f is coral_cerebro:
            p += f(x0 + dx, z0 + dz, c, 0.6, y=TOPO - 0.03)
        else:
            p += f(x0 + dx, z0 + dz, c, 0.6, seed=i, y=TOPO - 0.03)
    return p


def enfeites(col=None):
    p = []
    for x, z, s, incl in ((-9.6, 5.4, 1.0, (0.6, 0.2)), (8.8, 6.6, 0.95, (-0.5, -0.3)), (-0.6, -10.6, 1.1, (0.2, 0.6)),
                          (9.6, -5.6, 0.9, (-0.4, 0.5)), (-8.4, -7.0, 1.0, (0.5, -0.3))):
        p += anel.coqueiro_leve(x, z, s, incl=incl)
        if col is not None:
            # O tronco curvo em dois pedaços retos (como o desenho: a ponta anda incl·t²).
            pts = [(x + incl[0] * t * t * s, -z + incl[1] * t * t * s, TOPO + 3.4 * t * s) for t in (0.0, 0.6, 1.0)]
            pts[0] = (pts[0][0], pts[0][1], TOPO - 0.1)
            for k in range(2):
                col.append(col_entre('tronco', pts[k], pts[k + 1], 0.15 * s, sobra=0.05))
    rnd = random.Random(31)
    for i, (x, z) in enumerate(((9.8, 3.4), (-9.0, -4.0), (3.0, 10.2), (-5.2, -9.8), (10.4, -3.4), (6.4, 8.8),
                                (-10.8, 2.4))):
        bx, by = x, -z
        p.append(uvball(0.32, (bx, by, TOPO + 0.05), 'concha', seg=8, ring=4, scale=(1, 0.8, 0.45)))
        for k in range(5):
            a = math.pi * (0.15 + 0.17 * k)
            p.append(tube([(bx, by - 0.12, TOPO + 0.12), (bx + math.cos(a) * 0.3, by - 0.12 + math.sin(a) * 0.22, TOPO + 0.2)],
                          [0.02, 0.015], 'coralRosa', seg=3, cap=False))
        p.append(prism(star_pts(0.38, 0.16, 5, i * 20), 0.06, (bx + 0.8, by + 0.4, TOPO + 0.04),
                       ('coral', 'coralLaranja', 'coralAmarelo')[i % 3], rot=(R(90), 0, rnd.uniform(0, 1))))
    for i, (x, z, s) in enumerate(((10.4, 4.6, 1.0), (-10.8, -1.8, 0.9), (6.6, -9.6, 0.8), (-6.4, 9.8, 0.9),
                                   (0.8, 10.8, 0.8))):
        p += pedra(x, z, s, 'rochaRecife', seed=600 + i, top_m='musgo' if i % 2 else None)
        if col is not None:
            # Como as pedras do Bosque: um pouco menor que o desenho, do pé enterrado até o topo.
            alto = 0.85 * s - 0.2
            col.append(col_cilindro('pedra', 0.58 * s, alto + 0.1, (x, -z, TOPO + (alto - 0.1) / 2)))
    # Guarda-sol listrado e a canga, perto da chegada (fora do corredor).
    gx, gz = 8.2, -4.6
    p.append(cyl(0.05, 2.4, (gx, -gz, TOPO + 1.2), 'doceBranco', verts=6))
    if col is not None:
        col.append(col_cilindro('poste', 0.06, 2.4, (gx, -gz, TOPO + 1.2)))
    sombrinha = cone(1.4, 0.55, (gx, -gz, TOPO + 2.35), 'coral', verts=8)
    bpy.context.view_layer.update()
    pintar_por(sombrinha, lambda c, nn: 'doceBranco' if int((math.atan2(c.y + gz, c.x - gx) + math.pi) / (math.pi / 4)) % 2
               else None)
    p.append(sombrinha)
    p.append(uvball(0.08, (gx, -gz, TOPO + 2.65), 'doceBranco', seg=6, ring=4))
    p.append(box((1.6, 0.9, 0.02), (gx - 0.3, -gz + 0.9, TOPO + 0.01), 'toldoAzul', bevel=0.0, rot=(0, 0, 0.3)))
    # Castelinho de areia.
    sx, sz = 6.8, 6.0
    p.append(cyl(0.6, 0.45, (sx, -sz, TOPO + 0.22), 'areiaFunda', verts=10, r2=0.5))
    if col is not None:
        col.append(col_cilindro('castelo', 0.72, 0.85, (sx, -sz, TOPO + 0.375)))
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.4
        p.append(cyl(0.18, 0.6, (sx + math.cos(a) * 0.5, -sz + math.sin(a) * 0.5, TOPO + 0.3), 'areiaFunda', verts=8))
        p.append(cone(0.2, 0.25, (sx + math.cos(a) * 0.5, -sz + math.sin(a) * 0.5, TOPO + 0.72), 'areiaFunda', verts=8))
    p.append(cyl(0.04, 0.5, (sx, -sz, TOPO + 0.7), 'doceBranco', verts=4))
    p.append(prism([(0, 0), (0.28, -0.08), (0, -0.16)], 0.01, (sx + 0.02, -sz, TOPO + 0.92), 'coral'))
    return p


# ------------------------------------------------------------------ barco entre ilhas
def barco():
    """Barquinho entre ilhas: casco vermelho com faixa branca, conves de tábua, cabine azul com
    escotilhas, chaminé, mastro com bandeirinha, boia e pneus. Pivô na linha d'água, proa em +x."""
    L, W = 5.0, 2.0
    p = []
    casco = superellipsoid((L, W, 1.5), (0, 0, -0.1), 'cascoBarco', e1=0.45, e2=0.65, seg=20, ring=10)
    for v in casco.data.vertices:
        if v.co.z > 0.5:
            v.co.z = 0.5
        # Proa afinando (o lado +x).
        if v.co.x > 0:
            v.co.y *= 1 - 0.45 * (v.co.x / (L / 2)) ** 2
    p.append(casco)
    faixa = superellipsoid((L * 1.01, W * 1.01, 0.3), (0, 0, 0.32), 'cascoBarcoBranco', e1=0.3, e2=0.65, seg=20, ring=4)
    for v in faixa.data.vertices:
        if v.co.x > 0:
            v.co.y *= 1 - 0.45 * (v.co.x / (L / 2)) ** 2
    p.append(faixa)
    conves = [(math.cos(2 * math.pi * k / 24) * (L / 2 - 0.2), math.sin(2 * math.pi * k / 24) * (W / 2 - 0.15)) for k in range(24)]
    conves = [(x, y * (1 - 0.45 * (max(x, 0) / (L / 2)) ** 2)) for x, y in conves]
    p.append(slab(conves, 0.38, 0.5, 'deckBarco', bevel=0.02, segs=1, name='conves'))
    # Amurada: tubinho branco em volta do conves com balaústres.
    borda_ = [(x * 1.02, y * 1.04, 0.85) for x, y in conves] + [(conves[0][0] * 1.02, conves[0][1] * 1.04, 0.85)]
    p.append(tube(borda_, [0.05] * len(borda_), 'cascoBarcoBranco', seg=5, cap=False))
    for k in range(0, 24, 2):
        x, y = conves[k]
        p.append(cyl(0.03, 0.35, (x * 1.02, y * 1.04, 0.67), 'cascoBarcoBranco', verts=5))
    # Cabine.
    p.append(box((1.6, 1.3, 1.1), (-0.6, 0, 0.5 + 0.55), 'cabineBarco', bevel=0.08, segs=1))
    p.append(box((1.9, 1.55, 0.12), (-0.6, 0, 1.66), 'cascoBarcoBranco', bevel=0.04, segs=1))
    for k in (-1, 1):
        p.append(torus(0.17, 0.04, (-0.6 + k * 0.4, -0.66, 1.15), 'bronze', seg=10, rseg=3, rot=(R(90), 0, 0)))
        p.append(cyl(0.15, 0.03, (-0.6 + k * 0.4, -0.66, 1.15), 'vidroJanela', verts=10, rot=(R(90), 0, 0)))
        p.append(torus(0.17, 0.04, (-0.6 + k * 0.4, 0.66, 1.15), 'bronze', seg=10, rseg=3, rot=(R(90), 0, 0)))
        p.append(cyl(0.15, 0.03, (-0.6 + k * 0.4, 0.66, 1.15), 'vidroJanela', verts=10, rot=(R(90), 0, 0)))
    p.append(box((0.08, 0.9, 0.7), (0.21, 0, 1.15), 'vidroJanela', bevel=0.0))
    p.append(cyl(0.18, 0.6, (-1.0, 0, 2.0), 'cascoBarco', verts=10))
    p.append(cyl(0.19, 0.12, (-1.0, 0, 2.05), 'cascoBarcoBranco', verts=10))
    p.append(torus(0.28, 0.08, (-0.6, -0.72, 0.95), 'boia', seg=12, rseg=5, rot=(R(90), 0, 0)))
    # Mastro e bandeirinha na popa, bancos na proa, pneus nos lados e a corda enrolada.
    p.append(cyl(0.04, 1.6, (-2.0, 0, 1.3), 'deque', verts=6))
    p.append(prism([(0, 0), (0.6, -0.15), (0, -0.3)], 0.02, (-1.98, 0, 2.05), 'toldoAmarelo'))
    for k in (-1, 1):
        p.append(box((0.35, 1.1, 0.08), (1.0 + k * 0.45, 0, 0.75), 'deque', bevel=0.02, segs=1))
    for x in (-1.4, 0.0, 1.2):
        for lado in (-1, 1):
            p.append(torus(0.17, 0.07, (x, lado * (W / 2 + 0.02) * (1 - 0.45 * (max(x, 0) / (L / 2)) ** 2), 0.3), 'black',
                           seg=10, rseg=4, rot=(R(90), 0, 0)))
    p.append(torus(0.18, 0.05, (1.7, 0.2, 0.55), 'corda', seg=10, rseg=4))
    return p


# Onde a criança fica no barco (fase3-04): no convés (topo em 0,5), entre os dois bancos da proa,
# virada para a proa (+x). O jogo põe o desenho dela aqui; a âncora é filha do nó animado `barco`,
# então acompanha o balanço.
PASSAGEIRO = (1.0, 0.0, 0.5)


def passageiro(barco_):
    e = bpy.data.objects.new('passageiro', None)
    e.empty_display_type = 'PLAIN_AXES'
    bpy.context.collection.objects.link(e)
    e.parent = barco_
    e.matrix_parent_inverse.identity()
    e.location = PASSAGEIRO
    # Sem giro: o +x da âncora é para onde ela olha (a proa).
    return e


def clipe_barco(juntos):
    o = juntos['barco']
    rot, loc = [], []
    for k in range(5):
        q = k * 18
        t = 2 * math.pi * k / 4
        rot.append((q, (R(4) * math.sin(t), R(2) * math.sin(t + 1.2), 0.0)))
        loc.append((q, (0.0, 0.0, 0.06 * math.sin(t + 0.6))))
    return {'balancar': {o: {'rotation_euler': rot, 'location': loc}}}


def clipe_algas(juntos):
    chaves = {}
    for nome, o in juntos.items():
        if not nome.startswith('alga'):
            continue
        fase = int(nome.split('-')[-1]) * 0.9
        rot = []
        for k in range(5):
            t = 2 * math.pi * k / 4 + fase
            rot.append((k * 12, (R(9) * math.sin(t), R(7) * math.cos(t), 0.0)))
        chaves[o] = {'rotation_euler': rot}
    return {'balancar': chaves}


# ------------------------------------------------------------------ montagem
def frente(x, z, d, tx, tz):
    dx, dz = tx - x, tz - z
    n = math.hypot(dx, dz)
    return x + dx / n * d, z + dz / n * d


def construir():
    lib_q.reset()
    col = []
    chao = terreno(col)
    cavar_bacia(col[0], LAGOA, RAIOS_DA_LAGOA, FUNDO_DA_LAGOA, BACIA_PLANA, BACIA_FIM)
    agua, miolo = lagoa()
    alvo_casa = (-2.6, 3.4)

    def montar(fn, x, z, frente_):
        c = []
        objs = colocar(fn(col=c), x, z, frente_)
        col.extend(colocar(c, x, z, frente_))
        return objs

    obras = montar(casa_mare, CASA[0], CASA[1], olhar_para(CASA[0], CASA[1], *alvo_casa))
    mx, mz = MESA
    obras += montar(mesa_de_mapas, mx, mz, olhar_para(mx, mz, -6.0, 1.0))
    deque_cais, ponta_cais, lugar_barco = cais(col)
    obras += deque_cais
    cor = corais(col)
    enf = enfeites(col) + miolo
    cav = caverna(col)
    conferir_corredor(obras + cor + enf, 'recife')
    algas = {}
    for i, (x, z, y) in enumerate(ALGAS):
        objs, pivo = alga(x, z, y, seed=i, s=1.2 if y < 0 else 1.0)
        algas[f'alga-{i + 1}'] = (objs, pivo)
    cx, cz = CAVERNA
    anc = [ancora('chegada', 11.6, 0.0), ancora('morador', *frente(CASA[0], CASA[1], 3.4, *alvo_casa)),
           ancora('lumi-1', 3.0, 4.6), ancora('lumi-2', -6.4, -5.0), ancora('lumi-3', 6.0, -3.6),
           ancora('lumi-4', -7.6, 2.4), ancora('casa-mare', *frente(CASA[0], CASA[1], 2.6, *alvo_casa)),
           ancora('mapa', mx, mz), ancora('lagoa', *LAGOA),
           ancora('cais', ponta_cais[0], ponta_cais[1], ponta_cais[2]),
           ancora('barco', lugar_barco[0], -lugar_barco[1], 0.0),
           ancora('caverna-entrada', cx - 3.6, cz, 0.0), ancora('caverna', cx, cz, FUNDO_CAVERNA),
           ancora('caverna-tesouro', cx + 1.4, cz + 0.1, FUNDO_CAVERNA), ancora('mergulho', CAIS_FIM[0], CAIS_FIM[1] - 0.6, 0.0),
           *ancoras_das_mudas()]
    # A âncora do barco também diz para onde ele aponta (giro em y, no jogo).
    anc[10].rotation_euler = (0, 0, lugar_barco[2])
    exportar('recife', {'terreno': chao, 'agua': agua, 'construcoes': obras, 'corais': cor, 'enfeites': enf,
                        'caverna': cav, **algas}, anc, clipes_=clipe_algas, colisores=col)


def props():
    lib_q.reset()
    nos = {
        'coral-galho': coral_galho(0, 0, 'coral', 1.0, seed=1, y=0),
        'coral-cerebro': coral_cerebro(0, 0, 'coralAmarelo', 1.0, y=0),
        'coral-leque': coral_leque(0, 0, 'coralLilas', 1.0, y=0),
        'coral-tubo': coral_tubo(0, 0, 'coralLaranja', 1.0, seed=2, y=0),
        'coral-galho-desbotado': coral_galho_desbotado(),
        'coral-cerebro-desbotado': coral_cerebro_desbotado(),
        'coral-leque-desbotado': coral_leque_desbotado(),
        'coral-tubo-desbotado': coral_tubo_desbotado(),
        'mapa-aberto': mapa_aberto(0, 0, 0),
        'mapa-rolo': mapa_rolo(0, 0, 0.05, R(90)),
    }
    alga_objs, pivo = alga(0, 0, 0.0, seed=3)
    nos['alga'] = (alga_objs, pivo)
    exportar('recife-props', nos, clipes_=lambda j: clipe_algas({'alga-0': j['alga']}))
    lib_q.reset()
    # A âncora nasce com o nó `barco` já juntado (dentro do `clipes_`); `exportar` lê a lista depois.
    filhas = []

    def clipe_e_passageiro(juntos):
        filhas.append(passageiro(juntos['barco']))
        return clipe_barco(juntos)

    exportar('barco', {'barco': barco()}, filhas, clipes_=clipe_e_passageiro)


def main():
    construir()
    props()


if __name__ == '__main__':
    main()
