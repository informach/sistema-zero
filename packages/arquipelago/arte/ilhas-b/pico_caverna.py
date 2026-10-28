"""A caverna de cristal do Pico Gelado (lugar de exploração, um GLB à parte).

Um morro de rocha nevada com a boca virada para a ilha:
- a entrada: arco de pedra com neve em cima, pingentes de gelo, cristais que acendem dos dois lados
  (chamam de longe) e a placa com o desenho do cristal;
- o túnel desce de leve (rampa de 12°) até a galeria redonda, com o chão de pedra e neve;
- na galeria: cachos de cristais grandes e pequenos nas paredes e no chão (material `cristal`, com
  um brilho suave; os que iluminam são `cristalLuz`), estalactites de gelo no teto e o laguinho
  congelado;
- o percurso: quatro saliências de rocha com neve e geada por cima e cachos de cristal nas bordas,
  subindo em volta da parede (0,65 m por degrau, vãos de 0,6 a 0,7 m), até a laje do fundo, onde
  fica o cristal raro (`cristalRaro`).

Referencial: a boca da caverna, com y = 0 no mar e o chão da boca em y = 1 (o tampo da ilha). A
caverna fica para −x; a boca olha para +x. A proposta de onde ela fica no Pico está no README.

Saída: `pico-caverna.glb` (nós `rocha`, `chao`, `cristais`, `cristais-luz`, `gelo`, `percurso`,
`joia` (o cristal raro com o pedestal), os `col-*` e as âncoras).
"""
from lib_ilhas_b import *

lib_q.PALETTE.update({
    'cristal': ('#a9d8ff', 0.15, '#9fd4ff', 0.25),
    'cristalLuz': ('#9fe8ff', 0.2, '#7fd8ff', 1.0),
    'cristalRaro': ('#ff9ce6', 0.15, '#ff7ad9', 1.0),
    'rochaCaverna': ('#7d8ea3', 0.9, None, 0),
    'rochaCavernaEscura': ('#62728a', 0.9, None, 0),
    'pedraLaje': ('#9aa9bb', 0.9, None, 0),
    'madeiraPlaca': ('#a8754a', 0.85, None, 0),
})

CHAO = 0.4                 # chão da galeria
CENTRO = (-7.0, 0.0)       # centro da galeria (Blender)
RAIO_GALERIA = 4.6
TETO = 6.6                 # embaixo da pedra do teto
BOCA = dict(larg=2.6, alto=3.0, comp=2.4)
DEGRAU = 0.65
DEGRAUS = [(60, 3.3), (100, 3.3), (140, 3.3), (180, 3.3)]   # ângulo (graus) e raio de cada coluna
LAJE = (225, 3.95)
RAIO_COLUNA = 0.78


def polar(ang, r):
    a = R(ang)
    return CENTRO[0] + math.cos(a) * r, CENTRO[1] + math.sin(a) * r


# ------------------------------------------------------------------ cristais
def cristal(base, direcao, comp, r, m, lados=6):
    """Prisma de cristal com ponta (de `base` na `direcao`)."""
    d = Vector(direcao).normalized()
    rot = d.to_track_quat('Z', 'Y').to_euler()
    corpo = comp * 0.72
    c = Vector(base) + d * (corpo / 2)
    p = [cyl(r, corpo, tuple(c), m, verts=lados, rot=rot, smooth_sides=False)]
    p.append(cone(r, comp - corpo, tuple(Vector(base) + d * (corpo + (comp - corpo) / 2)), m, verts=lados, rot=rot))
    # O cone gira junto com o prisma (as quinas batem).
    return p


def cacho(x, y, z, s, m, seed, normal=(0, 0, 1), n=5):
    """Cacho de cristais saindo de um ponto (do chão ou da parede)."""
    rnd = random.Random(seed)
    nrm = Vector(normal).normalized()
    lado = nrm.cross(Vector((0, 0, 1)))
    if lado.length < 1e-3:
        lado = Vector((1, 0, 0))
    lado.normalize()
    cima = lado.cross(nrm)
    p = []
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.uniform(-0.3, 0.3)
        incl = 0.0 if k == 0 else rnd.uniform(0.35, 0.7)
        d = nrm * math.cos(incl) + (lado * math.cos(a) + cima * math.sin(a)) * math.sin(incl)
        comp = (1.0 if k == 0 else rnd.uniform(0.45, 0.8)) * s
        base = Vector((x, y, z)) + (lado * math.cos(a) + cima * math.sin(a)) * (0.0 if k == 0 else 0.12 * s) - nrm * 0.1 * s
        p += cristal(base, d, comp, (0.16 if k == 0 else 0.1) * s, m)
    return p


# ------------------------------------------------------------------ rocha: paredes, teto, boca
DOMO = dict(a=6.7, b=6.5, c=8.2, z=-0.2, espessura=1.4)


def domo():
    """O morro: uma casca de rocha (por dentro a galeria), com caroços, neve em cima e a boca aberta
    para +x. Feito de uma superelipsoide engrossada para dentro (a espessura vira o túnel da boca)."""
    import bmesh as _bm
    cx, cy = CENTRO
    o = superellipsoid((2 * DOMO['a'], 2 * DOMO['b'], 2 * DOMO['c']), (0, 0, 0), 'rochaCaverna', e1=0.5, e2=0.8, seg=24,
                       ring=14)
    rnd = random.Random(8)
    carocos = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.2, 1))).normalized(), rnd.uniform(0.3, 0.6))
               for _ in range(16)]
    for v in o.data.vertices:
        dn = Vector((v.co.x / DOMO['a'], v.co.y / DOMO['b'], v.co.z / DOMO['c']))
        if dn.length < 1e-4:
            continue
        dn.normalize()
        k = sum(a * max(0.0, dn.dot(c)) ** 5 for c, a in carocos)
        v.co += Vector((dn.x, dn.y, dn.z * 0.5)).normalized() * k
        # Facetas tortas (o jeito de pedra lapidada), iguais para o mesmo ponto.
        semente = random.Random(round(v.co.x * 7) * 7919 + round(v.co.y * 7) * 104729 + round(v.co.z * 7))
        v.co += Vector((semente.uniform(-0.3, 0.3), semente.uniform(-0.3, 0.3), semente.uniform(-0.25, 0.25)))
    o.location = (cx, cy, DOMO['z'])
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = _bm.new()
    bm.from_mesh(o.data)
    w, h = BOCA['larg'], BOCA['alto']
    fora = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.z < -0.9:
            fora.append(f)
        elif c.x > cx + 3.5 and abs(c.y) < w / 2 + 0.35 and c.z < TOPO + h + 0.2:
            fora.append(f)
    _bm.ops.delete(bm, geom=fora, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    o.data.materials.append(lib_q.mat('neve'))
    o.data.materials.append(lib_q.mat('rochaCavernaEscura'))
    s = o.modifiers.new('esp', 'SOLIDIFY')
    s.thickness = DOMO['espessura']
    s.offset = -1
    s.use_rim = True
    lib_q._apply(o, s)
    meio = Vector((cx, cy, 1.5))
    for f in o.data.polygons:
        c = f.center
        dentro = f.normal.dot(c - meio) < 0
        if dentro:
            f.material_index = 0
        elif f.normal.z > 0.5 and c.z > 3.2 + 1.2 * math.sin(c.x * 0.7 + c.y * 0.5):
            f.material_index = 1
        else:
            f.material_index = 2 if math.sin(c.x * 0.9 + c.y * 1.3 + c.z * 0.7) > 0.2 else 0
    lib_q.flat(o)
    return o


def rocha(col):
    p = [domo()]
    cx, cy = CENTRO
    # Colisão da parede: caixas por dentro da casca (embaixo, onde ela é quase reta, e um anel mais
    # para dentro no alto, onde ela começa a fechar) e o teto.
    m = 18
    for k in range(m):
        ang = 360 * (k + 0.5) / m
        if abs((ang + 180) % 360 - 180) < 18:
            continue
        a = R(ang)
        for (r0, r1, z0, z1) in ((5.25, 6.4, CHAO - 0.4, 4.4), (4.85, 5.8, 4.4, 5.9)):
            rm = (r0 + r1) / 2
            L = 2 * r0 * math.tan(math.pi / m) + 0.1
            col.append(col_caixa('parede', (r1 - r0, L, z1 - z0), (cx + math.cos(a) * rm, cy + math.sin(a) * rm,
                                                                (z0 + z1) / 2), (0, 0, a)))
    col.append(col_cilindro('teto', 4.4, 1.6, (cx, cy, 6.7)))
    # Pedras soltas no pé do morro, com neve.
    rnd = random.Random(7)
    for k, ang in enumerate((40, 115, 160, 215, 290, 325)):
        a = R(ang)
        r = 8.1 + rnd.uniform(-0.1, 0.3)
        p.append(rock((cx + math.cos(a) * r, cy + math.sin(a) * r, -0.9), (2.6, 2.2, 2.4), 'rochaCavernaEscura', seed=360 + k,
                      subdiv=1, rough=0.16, top_m='neve'))
    # Pedras grandes encravadas no flanco (quebram a silhueta) e uma no alto.
    for k, (ang, r, z, sz) in enumerate(((70, 9.0, 0.6, 2.8), (150, 9.1, 0.9, 3.2), (250, 9.0, 0.4, 3.0))):
        a = R(ang)
        p.append(rock((cx + math.cos(a) * r, cy + math.sin(a) * r, z), (sz, sz * 0.9, sz * 0.8), 'rochaCaverna', seed=380 + k,
                      subdiv=1, rough=0.18, top_m='neve'))
    # Boca: dois pilares, a pedra de cima, o túnel e o morro que cobre o túnel.
    w, h, L = BOCA['larg'], BOCA['alto'], BOCA['comp']
    for lado in (-1, 1):
        p.append(rock((0.35, lado * (w / 2 + 1.25), -1.0), (2.4, 2.6, TOPO + h + 2.2), 'rochaCavernaEscura', seed=330 + lado,
                      subdiv=1, rough=0.14, top_m='neve'))
        col.append(col_caixa('boca', (L + 0.6, 1.1, TOPO + h + 1.0), (-L / 2, lado * (w / 2 + 0.55), (TOPO + h + 1.0) / 2)))
    p.append(rock((0.3, 0, TOPO + h), (2.4, w + 3.4, 1.9), 'rochaCaverna', seed=340, subdiv=1, rough=0.12, top_m='neve'))
    col.append(col_caixa('boca', (L + 0.6, w + 0.2, 1.2), (-L / 2, 0, TOPO + h + 0.6)))
    p.append(superellipsoid((2.6, w + 3.0, 0.8), (0.25, 0, TOPO + h + 1.65), 'neve', e1=0.8, e2=0.9, seg=10, ring=5,
                            flat_bottom=0.3))
    # Pingentes de gelo na beira da boca.
    for k in range(7):
        y = -w / 2 + 0.25 + k * (w - 0.5) / 6
        comp = 0.35 + 0.3 * ((k * 3) % 4) / 3
        p.append(cone(0.08 + 0.03 * (k % 2), comp, (0.35, y, TOPO + h + 0.12 - comp / 2), 'geloClaro', verts=5,
                      rot=(R(180), 0, 0)))
    return p


# ------------------------------------------------------------------ chão, túnel, laguinho
def chao(col):
    cx, cy = CENTRO
    p = [slab(blob(cx, cy, RAIO_GALERIA + 0.9, RAIO_GALERIA + 0.8, seed=4, n=28, wob=0.05), CHAO - 0.6, CHAO,
              'pedraLaje', bevel=0.08, segs=1, name='chaoGaleria', fundo=False)]
    col.append(col_cilindro('chao', RAIO_GALERIA + 0.6, 0.6, (cx, cy, CHAO - 0.3)))
    # Rampa do túnel (de y = 1 na boca até o chão da galeria) e a neve que entrou.
    L = 2.8   # de x = 0 (y = 1, a boca) até x = −2,8 (o chão da galeria)
    # A ponta da frente (2,6 m) avança por cima da beira da ilha, 3 cm acima do tampo dela.
    pts = [(2.6, 0.0, TOPO + 0.03), (0.0, 0.0, TOPO + 0.03)] + [(-L * t, 0.0, TOPO + 0.03 - (TOPO - CHAO) * t)
                                                                for t in (0.25, 0.5, 0.75, 1.0)]
    p.append(faixa(pts, BOCA['larg'] / 2 + 0.25, 'neveTrilha', -0.6, 0.0, nome='rampa'))
    incl = math.atan2(TOPO - CHAO, L)
    col.append(col_caixa('rampa', (L / math.cos(incl) + 0.2, BOCA['larg'] + 0.2, 0.3),
                         (-L / 2, 0, (TOPO + CHAO) / 2 - 0.15 / math.cos(incl)), (0, -incl, 0)))
    col.append(col_caixa('rampa', (2.7, BOCA['larg'] + 0.2, 0.3), (1.3, 0, TOPO + 0.03 - 0.15)))
    # Montes de neve na boca e encostados na parede da galeria.
    for k, (x, y, sx, sy, sz, z) in enumerate(((1.0, -2.2, 1.8, 1.4, 0.7, TOPO), (1.2, 2.3, 1.6, 1.3, 0.6, TOPO),
                                               (-3.4, -3.4, 2.0, 1.4, 0.8, CHAO), (-10.4, 3.4, 1.6, 1.6, 0.6, CHAO))):
        p.append(superellipsoid((sx, sy, sz), (x, y, z - 0.05), 'neve' if k % 2 else 'neveSombra', e1=0.8, e2=0.9, seg=10,
                                ring=5, flat_bottom=0.35))
    # Laguinho congelado: borda de neve, gelo por cima e o fundo escuro aparecendo.
    lx, ly = -6.2, -2.0
    p.append(slab(blob(lx, ly, 1.9, 1.35, seed=9, n=20, wob=0.06), CHAO - 0.05, CHAO + 0.06, 'neve', bevel=0.04, segs=1,
                  name='beiraLago', fundo=False))
    p.append(slab(blob(lx, ly, 1.6, 1.1, seed=9, n=20, wob=0.06), CHAO - 0.04, CHAO + 0.075, 'geloFundo', bevel=0.0,
                  name='fundoLago', fundo=False))
    p.append(slab(blob(lx + 0.15, ly - 0.05, 1.5, 1.02, seed=9, n=20, wob=0.06), CHAO - 0.03, CHAO + 0.09, 'gelo',
                  bevel=0.0, name='geloLago', fundo=False))
    return p, (lx, ly)


# ------------------------------------------------------------------ percurso
def saliencia(x, y, topo, raio, giro, seed, col, base='coluna'):
    """Saliência de rocha da parede: um bloco de pedra lapidada do chão até o topo, uma camada de
    neve por cima (onde se pisa), geada na beira e cachos de cristal saindo das bordas."""
    rnd = random.Random(seed)
    p = []
    # A pedra lapidada com o topo achatado chega a uns 83% da altura pedida: assim ela entra na neve.
    h = (topo - 0.06 - (CHAO - 0.3)) / 0.83
    p.append(rock((x, y, CHAO - 0.3), (2.15 * raio, 1.95 * raio, h), 'rochaCaverna' if seed % 2 else 'rochaCavernaEscura',
                  seed=500 + seed, subdiv=1, rough=0.1, flat_top=0.45))
    # Capa de neve por cima, caindo um pouco pela beira (o topo dela é a altura de pisar).
    p.append(superellipsoid((2.0 * raio, 1.85 * raio, 0.42), (x, y, topo - 0.16), 'neve', e1=0.55, e2=0.8, seg=12, ring=6,
                            flat_bottom=0.15, rot=(0, 0, giro)))
    # Cachos de cristal nas bordas, deitados para fora (não ficam onde se pisa).
    for k in range(2):
        a = giro + math.pi * (0.35 + 0.9 * k) + rnd.uniform(-0.3, 0.3)
        bx, by = x + math.cos(a) * raio * 0.95, y + math.sin(a) * raio * 0.95
        p += cacho(bx, by, topo - 0.35 - 0.25 * k, 0.55 + 0.15 * k, 'cristal' if k else 'cristalLuz', seed=seed * 5 + k,
                   normal=(math.cos(a), math.sin(a), 0.9), n=3)
    col.append(col_cilindro(base, raio * 0.88, topo - (CHAO - 0.3), (x, y, (topo + CHAO - 0.3) / 2)))
    return p


def percurso(col):
    """Saliências de rocha nevada em volta da parede, subindo, e a laje do fundo."""
    p = []
    tops = []
    for k, (ang, r) in enumerate(DEGRAUS):
        x, y = polar(ang, r)
        topo = CHAO + DEGRAU * (k + 1)
        p += saliencia(x, y, topo, RAIO_COLUNA, R(ang), k + 1, col)
        tops.append((x, y, topo))
    # Laje do fundo, uma saliência maior grudada na parede, com o pedestal do cristal raro.
    ang, r = LAJE
    x, y = polar(ang, r)
    topo = CHAO + DEGRAU * (len(DEGRAUS) + 1)
    p += saliencia(x, y, topo, 1.3, R(ang), 9, col, base='laje')
    tops.append((x, y, topo))
    return p, tops


def cristal_raro(x, y, z):
    """O cristal raro: um cristal grande rosa num pedestal de gelo, com uma coroa de cristaizinhos."""
    p = [cyl(0.42, 0.3, (x, y, z + 0.15), 'geloClaro', verts=8)]
    p += cristal((x, y, z + 0.25), (0, 0, 1), 1.25, 0.26, 'cristalRaro')
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.3
        d = (math.cos(a) * 0.5, math.sin(a) * 0.5, 1)
        p += cristal((x + math.cos(a) * 0.18, y + math.sin(a) * 0.18, z + 0.28), d, 0.55, 0.1, 'cristalRaro')
    return p


# ------------------------------------------------------------------ cristais e gelo da galeria
def cristais_da_galeria(col):
    cx, cy = CENTRO
    normais, luz = [], []
    rnd = random.Random(21)
    # Cachos nas paredes (deitados para dentro), nos ângulos livres do percurso.
    for k, ang in enumerate((-150, -125, -95, -65, -40, 30, 250, 270)):
        a = R(ang)
        r = RAIO_GALERIA - 0.1
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
        z = CHAO + rnd.uniform(0.2, 2.6)
        nrm = (-math.cos(a), -math.sin(a), rnd.uniform(0.3, 0.9))
        alvo = luz if k % 3 == 0 else normais
        alvo += cacho(x, y, z, rnd.uniform(0.8, 1.3), 'cristalLuz' if k % 3 == 0 else 'cristal', seed=40 + k, normal=nrm,
                      n=4 if k % 2 else 5)
    # Cachos grandes no chão (colidem: um cilindro menor que o desenho).
    for k, (x, y, s) in enumerate(((-4.2, -2.8, 1.8), (-8.6, -3.2, 2.1), (-9.6, -1.0, 1.4), (-4.0, 2.0, 1.2))):
        alvo = luz if k == 1 else normais
        alvo += cacho(x, y, CHAO, s, 'cristalLuz' if k == 1 else 'cristal', seed=60 + k, n=5)
        col.append(col_cilindro('cristal', 0.25 * s, 0.75 * s, (x, y, CHAO + 0.37 * s)))
    # Cristais pequenos espalhados no chão (miúdo: não colidem).
    for k in range(9):
        a = rnd.uniform(0, 2 * math.pi)
        d = rnd.uniform(1.2, 3.6)
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        if math.hypot(x + 6.2, y + 2.0) < 2.0:
            continue
        normais += cacho(x, y, CHAO, rnd.uniform(0.35, 0.55), 'cristal', seed=80 + k, n=3)
    # Na boca, dos dois lados (acendem: chamam de longe).
    for lado in (-1, 1):
        luz += cacho(0.6, lado * (BOCA['larg'] / 2 + 0.35), TOPO, 1.1, 'cristalLuz', seed=90 + lado,
                     normal=(0.3, lado * 0.5, 1), n=4)
    # No teto, pendurados (como as estalactites).
    for k, (x, y) in enumerate(((-5.4, -0.6), (-7.8, 0.8), (-8.4, -2.4))):
        luz += cacho(x, y, TETO + 0.1, 0.9, 'cristalLuz', seed=100 + k, normal=(0, 0, -1), n=4)
    return normais, luz


def estalactites():
    """Pingentes de gelo no teto (longe da laje e do alto das colunas: o corpo passa por baixo)."""
    cx, cy = CENTRO
    p = []
    rnd = random.Random(33)
    for k in range(22):
        a = rnd.uniform(0, 2 * math.pi)
        d = rnd.uniform(0.6, 4.2)
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        if math.hypot(*(Vector((x, y)) - Vector(polar(*LAJE)))) < 2.2:
            continue
        comp = rnd.uniform(0.6, 1.5)
        r = rnd.uniform(0.1, 0.2)
        base = TETO + 0.08 + 0.011 * k
        p.append(cone(r, comp, (x, y, base - comp / 2), 'geloClaro' if k % 2 else 'gelo', verts=5,
                      rot=(R(180), 0, rnd.uniform(0, 1))))
    # Estalagmites de gelo no chão, encostadas na parede.
    for k, ang in enumerate((-110, -20, 205, 290)):
        x, y = polar(ang, RAIO_GALERIA - 0.5)
        comp = rnd.uniform(0.8, 1.3)
        p.append(cone(0.28, comp, (x, y, CHAO + comp / 2 - 0.05), 'geloClaro', verts=6))
    return p


# ------------------------------------------------------------------ entrada
def enfeites_da_boca(col):
    p = []
    # Placa de madeira com o desenho do cristal, virada para quem chega (de noite a boca é iluminada
    # pelos cristais que acendem dos dois lados).
    x, y = 2.2, -2.0
    p.append(cyl(0.07, 1.4, (x, y, TOPO + 0.7), 'poste', verts=6))
    p.append(box((0.1, 1.0, 0.65), (x + 0.05, y, TOPO + 1.35), 'madeiraPlaca', bevel=0.04, segs=1))
    p.append(prism([(0, 0.24), (0.13, 0.05), (0.08, -0.22), (-0.08, -0.22), (-0.13, 0.05)], 0.03, (x + 0.11, y, TOPO + 1.35),
                   'cristalLuz', rot=(0, 0, R(90))))
    p.append(box((0.12, 1.08, 0.08), (x + 0.05, y, TOPO + 1.7), 'neve', bevel=0.03, segs=1))
    col.append(col_cilindro('poste', 0.12, 1.4, (x, y, TOPO + 0.7)))
    return p


# ------------------------------------------------------------------ exportação (com os col-*)
def exportar_com_colisores(pid, nos, ancoras, colisores):
    """O `exportar` do lib_ilhas_b, com os nós de colisão `col-*` (cada um com o seu TRS, sem juntar)
    e os grupos deles no relatório."""
    juntos = {nome: lib_mundo._juntar([o for o in objs if o is not None], nome) for nome, objs in nos.items()}
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(juntos.values()) + list(ancoras) + list(colisores):
        o.select_set(True)
    path = os.path.join(SAIDA_ILHAS, f'{pid}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_texcoords=False, export_extras=False, export_animations=False)
    por_no = {n: contar(o) for n, o in juntos.items()}
    tris = sum(por_no.values())
    kb = os.path.getsize(path) / 1024
    anc = {e.name: [round(e.location.x, 2), round(e.location.z, 2), round(-e.location.y, 2)] for e in ancoras}
    grupos = grupos_col(colisores)
    print(f'EXPORTADO {pid}: {tris} triângulos, {kb:.0f} KB, nós {por_no}, {len(anc)} âncoras, {len(colisores)} colisores')
    try:
        with open(RELATORIO_B) as f:
            rel = json.load(f)
    except (OSError, ValueError):
        rel = {}
    rel[pid] = {'triangulos': tris, 'kb': round(kb, 1), 'nos': por_no, 'ancoras': anc, 'clipes': [], 'colisores': grupos}
    with open(RELATORIO_B, 'w') as f:
        json.dump(rel, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write('\n')
    return path


# ------------------------------------------------------------------ montagem
def construir():
    lib_q.reset()
    col = []
    pedra = rocha(col)
    piso, lago = chao(col)
    trilho, tops = percurso(col)
    normais, luz = cristais_da_galeria(col)
    gelo = estalactites()
    pedra += enfeites_da_boca(col)
    rx, ry, rz = tops[-1]
    raro = cristal_raro(rx, ry, rz)
    gx, gy = CENTRO
    anc = [ancora('entrada', 0.6, 0.0, TOPO), ancora('galeria', gx + 1.5, -gy, CHAO), ancora('laguinho', lago[0], -lago[1], CHAO + 0.09),
           ancora('cristal-raro', rx, -ry, rz)]
    for k, (x, y, z) in enumerate(tops[:-1], 1):
        anc.append(ancora(f'degrau-{k}', x, -y, z))
    exportar_com_colisores('pico-caverna', {'rocha': pedra, 'chao': piso, 'cristais': normais, 'cristais-luz': luz,
                                            'gelo': gelo, 'percurso': trilho, 'joia': raro}, anc, col)


if __name__ == '__main__':
    construir()
