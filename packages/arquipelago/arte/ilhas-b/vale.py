"""Vale dos Dinos, a ilha completa: o vulcão com a lava que acende, a escavação dos fósseis, os
ninhos com ovos pintados, as samambaias gigantes e o observatório da Jade.

Gera dois arquivos em `src/assets/ilhas/`:

- `vale-dos-dinos.glb`: nós `chao` (o chão da ilha leve), `vulcao` (rocha), `lava` (tudo o que é
  lava: cratera e rios, material `lava`, que o jogo faz pulsar), `cenario` e as âncoras;
- `vale-dos-dinos-props.glb`: `samambaia-gigante`, `cavalinha`, `ninho`, `ovo-dino`, `osso`,
  `cranio-fossil`, cada um com a base em y = 0.
"""
from lib_ilhas_b import *

VULCAO = dict(x=-4.2, z=-2.6, r=5.6, h=7.2)


# ------------------------------------------------------------------ vulcão
def vulcao():
    cx, cy = VULCAO['x'], -VULCAO['z']
    h, r = VULCAO['h'], VULCAO['r']
    rnd = random.Random(7)
    ts = [0.0, 0.2, 0.42, 0.64, 0.84, 1.0]
    raio = [r, r * 0.84, r * 0.66, r * 0.5, r * 0.4, r * 0.36]
    n = 18
    verts, faces = [], []
    for k, (t, rr) in enumerate(zip(ts, raio)):
        for i in range(n):
            a = 2 * math.pi * i / n + k * 0.17
            j = 1 + rnd.uniform(-0.07, 0.07) if k < len(ts) - 1 else 1
            verts.append((cx + math.cos(a) * rr * j, cy + math.sin(a) * rr * j, TOPO - 0.3 + h * t + (rnd.uniform(-0.15, 0.15) if 0 < k < 5 else 0)))
    # Borda da cratera: desce para dentro até o lago de lava.
    k_borda = len(ts) - 1
    for i in range(n):
        a = 2 * math.pi * i / n + k_borda * 0.17
        verts.append((cx + math.cos(a) * r * 0.27, cy + math.sin(a) * r * 0.27, TOPO - 0.3 + h - 0.55))
    for k in range(len(ts)):
        for i in range(n):
            a0, a1 = k * n + i, k * n + (i + 1) % n
            b0, b1 = (k + 1) * n + i, (k + 1) * n + (i + 1) % n
            faces += [(a0, a1, b1), (a0, b1, b0)]
    o = malha('vulcao', verts, faces, 'rochaVulcao', cima=False)
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    pintar_por(o, lambda c, nn: 'rochaVulcaoEscura' if (c.z > TOPO + h * 0.8 or nn.z < 0.35) else None)
    lib_q.flat(o)
    pedras = [o]
    for i in range(7):
        a = 2 * math.pi * i / 7 + 0.4
        pedras.append(rock((cx + math.cos(a) * (r + 0.4), cy + math.sin(a) * (r + 0.4), TOPO), (1.1, 0.9, 0.7),
                           'rochaVulcaoEscura', seed=30 + i, subdiv=1, rough=0.2))
    # Lava: o lago da cratera, os rios pelas encostas e as poças no pé.
    lava = [cyl(r * 0.28, 0.1, (cx, cy, TOPO - 0.3 + h - 0.5), 'lava', verts=n)]
    for k, a in enumerate((math.radians(-60), math.radians(15), math.radians(120))):
        pts = []
        for t in (0.0, 0.25, 0.5, 0.75, 1.0):
            tt = 0.98 - 0.98 * t
            rr = r * 0.36 + (r - r * 0.36) * t
            aa = a + 0.25 * math.sin(t * 3 + k)
            pts.append((cx + math.cos(aa) * (rr + 0.08), cy + math.sin(aa) * (rr + 0.08), TOPO - 0.3 + h * tt + 0.1))
        lava.append(tube(pts, [0.26, 0.3, 0.34, 0.38, 0.32], 'lava', seg=6))
        fim = pts[-1]
        lava.append(slab(blob(fim[0] + math.cos(a) * 0.6, fim[1] + math.sin(a) * 0.6, 0.9, 0.7, seed=k, n=16, wob=0.15),
                         TOPO - 0.02, TOPO + 0.05, 'lava', bevel=0.0, name='poca', fundo=False))
    fumaca = []
    for k, (dx, dy, dz, rr) in enumerate(((0, 0, 0.9, 0.95), (0.6, 0.3, 1.7, 0.75), (-0.3, 0.7, 2.4, 0.6),
                                          (0.4, -0.2, 3.0, 0.45))):
        fumaca.append(uvball(rr, (cx + dx, cy + dy, TOPO + h + dz), 'nuvemSombra', seg=10, ring=6))
    return pedras, lava, fumaca


# ------------------------------------------------------------------ peças
def samambaia_gigante(s=1.0, seed=0):
    rnd = random.Random(seed)
    p = [superellipsoid((0.6 * s, 0.6 * s, 0.4 * s), (0, 0, 0.1 * s), 'samambaiaFunda', e1=0.8, e2=0.9, seg=8, ring=5)]
    n = 9
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.uniform(-0.15, 0.15)
        m = ('samambaia', 'samambaiaClara', 'samambaiaFunda')[k % 3]
        p.append(leaf((0, 0, 0.15 * s), a, (2.6 + rnd.uniform(-0.3, 0.4)) * s, 0.55 * s, m, lift=1.5 * s, droop=1.4 * s,
                      fold=0.3, teeth=10, n=10))
    # Brotos enrolados no meio (o báculo da samambaia).
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        pts = [(math.cos(a) * 0.1 * s, math.sin(a) * 0.1 * s, 0.1 * s), (math.cos(a) * 0.2 * s, math.sin(a) * 0.2 * s, 0.9 * s),
               (math.cos(a) * 0.4 * s, math.sin(a) * 0.4 * s, 1.25 * s), (math.cos(a) * 0.55 * s, math.sin(a) * 0.55 * s, 1.05 * s)]
        p.append(tube(pts, [0.06 * s, 0.05 * s, 0.05 * s, 0.07 * s], 'samambaiaClara', seg=5))
    return p


def cavalinha(s=1.0, seed=0):
    """Tufo de cavalinhas (planta pré-histórica): hastes com anéis escuros."""
    rnd = random.Random(seed)
    p = []
    for k in range(5):
        a = 2 * math.pi * k / 5 + rnd.uniform(-0.3, 0.3)
        d = rnd.uniform(0.1, 0.35) * s
        h = rnd.uniform(1.4, 2.3) * s
        bx, by = math.cos(a) * d, math.sin(a) * d
        topo = (bx + math.cos(a) * 0.25 * s, by + math.sin(a) * 0.25 * s, h)
        p.append(tube([(bx, by, 0), (bx + math.cos(a) * 0.08 * s, by + math.sin(a) * 0.08 * s, h * 0.5), topo],
                      [0.07 * s, 0.06 * s, 0.04 * s], 'cavalinha', seg=6))
        for j in range(1, 5):
            t = j / 5
            p.append(torus(0.07 * s * (1 - 0.3 * t), 0.018 * s, (bx + (topo[0] - bx) * t * t, by + (topo[1] - by) * t * t, h * t),
                           'samambaiaFunda', seg=8, rseg=3))
        p.append(cone(0.06 * s, 0.22 * s, (topo[0], topo[1], topo[2] + 0.1 * s), 'terraIlhaEscura', verts=6))
    return p


def ovo(s=1.0, pinta='pintaDino', seed=0):
    rnd = random.Random(seed)
    p = [uvball(0.36 * s, (0, 0, 0.38 * s), 'ovoDino', seg=12, ring=8, scale=(0.82, 0.82, 1.1))]
    for k in range(5):
        a = rnd.uniform(0, 2 * math.pi)
        z = rnd.uniform(0.2, 0.6) * s
        rr = 0.3 * s * math.sqrt(max(0.05, 1 - ((z - 0.38 * s) / (0.4 * s)) ** 2))
        p.append(uvball(rnd.uniform(0.05, 0.09) * s, (math.cos(a) * rr, math.sin(a) * rr, z), pinta, seg=6, ring=4,
                        scale=(1, 1, 0.6)))
    return p


def ninho(s=1.0, ovos=3, seed=0):
    rnd = random.Random(seed)
    p = [torus(0.95 * s, 0.32 * s, (0, 0, 0.22 * s), 'palha', seg=16, rseg=6),
         cyl(0.85 * s, 0.12 * s, (0, 0, 0.08 * s), 'ninhoEscuro', verts=14)]
    for k in range(12):
        a = 2 * math.pi * k / 12 + rnd.uniform(-0.2, 0.2)
        p.append(cyl(0.035 * s, 1.0 * s, (math.cos(a) * 0.95 * s, math.sin(a) * 0.95 * s, 0.3 * s), 'ninhoEscuro', verts=4,
                     rot=(R(80), 0, a + rnd.uniform(-0.5, 0.5))))
    pintas = ['pintaDino', 'pintaDinoLaranja', 'pintaDinoAzul']
    lugares = [(0, 0), (0.42, 0.2), (-0.38, 0.25), (0.05, -0.42)]
    for k in range(ovos):
        dx, dy = lugares[k]
        o = ovo(0.9 * s, pintas[(k + seed) % 3], seed=seed * 7 + k)
        lib_ilha.place(o, loc=(dx * s, dy * s, 0.08 * s), rot_z=k)
        p += o
    return p


def osso(s=1.0):
    return [cyl(0.09 * s, 1.2 * s, (0, 0, 0.12 * s), 'osso', verts=8, rot=(0, R(90), 0))] + \
           [uvball(0.16 * s, (x * s, y * s, 0.12 * s), 'osso', seg=8, ring=5) for x in (-0.62, 0.62) for y in (-0.08, 0.08)]


def cranio_fossil(s=1.0):
    """Crânio de dino deitado: focinho comprido, olho vazado, dentes e a mandíbula."""
    p = [superellipsoid((1.4 * s, 0.75 * s, 0.6 * s), (0, 0, 0.35 * s), 'osso', e1=0.7, e2=0.8, seg=12, ring=7),
         superellipsoid((1.2 * s, 0.5 * s, 0.32 * s), (0.85 * s, 0, 0.3 * s), 'osso', e1=0.7, e2=0.8, seg=10, ring=6),
         superellipsoid((1.6 * s, 0.42 * s, 0.18 * s), (0.6 * s, 0, 0.06 * s), 'osso', e1=0.7, e2=0.8, seg=10, ring=5)]
    for y in (-0.36, 0.36):
        p.append(uvball(0.15 * s, (-0.1 * s, y * s, 0.48 * s), 'terraIlhaEscura', seg=8, ring=5, scale=(1, 0.5, 1)))
    for k in range(6):
        for y in (-0.2, 0.2):
            p.append(cone(0.04 * s, 0.16 * s, ((0.45 + k * 0.17) * s, y * s, 0.1 * s), 'doceBranco', verts=5))
    return p


def esqueleto():
    """O esqueleto deitado na escavação: crânio, coluna em curva, costelas e a cauda."""
    p = []
    cr = cranio_fossil(0.9)
    lib_ilha.place(cr, loc=(1.9, 0.2, 0.0), rot_z=R(10))
    p += cr
    coluna = [(1.0, 0.1, 0.2), (0.2, 0.0, 0.25), (-0.7, -0.15, 0.22), (-1.6, -0.1, 0.18), (-2.5, 0.25, 0.14), (-3.2, 0.7, 0.1)]
    p.append(tube(coluna, [0.1, 0.12, 0.12, 0.1, 0.07, 0.05], 'osso', seg=7))
    for k, t in enumerate((0.15, 0.3, 0.45, 0.6, 0.75)):
        i = int(t * (len(coluna) - 1))
        x, y, z = coluna[i]
        x += (coluna[i + 1][0] - x) * ((t * (len(coluna) - 1)) % 1)
        tam = 0.75 - abs(t - 0.4) * 0.8
        for lado in (-1, 1):
            p.append(torus(tam, 0.05, (x, y + lado * tam * 0.95, z), 'osso', seg=10, rseg=4,
                           rot=(R(90), 0, 0), arc=150))
    for k in range(6):
        t = k / 5
        p.append(uvball(0.1 - 0.012 * k, (-2.2 - t * 1.4, 0.15 + t * 0.7, 0.12), 'osso', seg=7, ring=4))
    for x, y, a in ((0.5, 0.9, 0.5), (-0.5, -1.0, -0.4), (-1.6, 0.95, 0.9)):
        o = osso(0.6)
        lib_ilha.place(o, loc=(x, y, 0.0), rot_z=a)
        p += o
    return p


def escavacao(x, z):
    """Buraco de areia com o esqueleto, cerca de corda, baldinho, pá e pincel."""
    p = [mancha(x, z, 3.8, 3.0, 'areiaEscavacao', seed=4, z1=TOPO + 0.04),
         mancha(x, z, 3.0, 2.2, 'areiaEscavacaoFunda', seed=5, z1=TOPO + 0.06)]
    esq = esqueleto()
    colocar(esq, x, z, R(-20), y=TOPO + 0.02, escala=1.0)
    p += esq
    postes = []
    for i in range(10):
        a = 2 * math.pi * i / 10
        px, pz = x + math.cos(a) * 3.6, z + math.sin(a) * 2.8
        postes.append((px, -pz, TOPO + 0.7))
        p.append(cyl(0.06, 0.75, (px, -pz, TOPO + 0.37), 'poste', verts=6))
        p.append(uvball(0.08, (px, -pz, TOPO + 0.78), 'cordaEscavacao', seg=6, ring=4))
    for i in range(10):
        a, b = postes[i], postes[(i + 1) % 10]
        if i == 4:
            continue
        meio = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2] - 0.12)
        p.append(tube([a, meio, b], [0.025] * 3, 'cordaEscavacao', seg=4, cap=False))
    bx, by = x - 2.4, -z - 1.0
    p.append(cyl(0.25, 0.4, (bx, by, TOPO + 0.2), 'agarraAzul', verts=12, r2=0.2))
    p.append(torus(0.22, 0.02, (bx, by, TOPO + 0.5), 'metalEscuro', seg=10, rseg=3, rot=(R(90), 0, 0), arc=180))
    p.append(tube([(bx + 0.5, by + 0.2, TOPO + 0.02), (bx + 1.3, by + 0.5, TOPO + 0.08)], [0.03, 0.03], 'tronco', seg=5))
    p.append(box((0.25, 0.2, 0.03), (bx + 1.45, by + 0.56, TOPO + 0.06), 'metalEscuro', bevel=0.01, segs=1))
    p.append(tube([(bx + 0.4, by - 0.4, TOPO + 0.03), (bx + 0.9, by - 0.5, TOPO + 0.03)], [0.025, 0.025], 'pincel', seg=5))
    p.append(cyl(0.05, 0.12, (bx + 0.95, by - 0.51, TOPO + 0.04), 'cabelo', verts=6, rot=(0, R(90), 0)))
    return p


def observatorio():
    """Observatório da Jade: torre de pedra, varanda de madeira, cúpula com a fresta e a luneta."""
    p = [cyl(1.7, 2.6, (0, 0, 1.3), 'pedraObservatorio', verts=16, bevel=0.06)]
    for z in (0.6, 1.3, 2.0):
        p.append(cyl(1.73, 0.08, (0, 0, z), 'pedraObservatorioEscura', verts=16))
    # Varanda em volta (deque e guarda-corpo).
    p.append(cyl(2.3, 0.18, (0, 0, 2.7), 'madeiraObservatorio', verts=18, bevel=0.03))
    for i in range(14):
        a = 2 * math.pi * i / 14
        p.append(cyl(0.04, 0.6, (math.cos(a) * 2.2, math.sin(a) * 2.2, 3.1), 'madeiraObservatorio', verts=5))
    p.append(torus(2.2, 0.05, (0, 0, 3.4), 'madeiraObservatorio', seg=20, rseg=4))
    p.append(cyl(1.55, 0.9, (0, 0, 3.25), 'acabamento', verts=16))
    # Cúpula com a fresta e a luneta saindo dela.
    p.append(meia_esfera(1.6, (0, 0, 3.7), 'cupulaObservatorio', seg=18, ring=10, sz=0.95))
    p.append(box((0.5, 1.7, 0.08), (0, 0.6, 4.9), 'cupulaFresta', bevel=0.02, segs=1, rot=(R(-35), 0, 0)))
    luneta = [cyl(0.18, 1.8, (0, 0, 0), 'lunetaLatao', verts=12, r2=0.13), cyl(0.21, 0.12, (0, 0, -0.88), 'metalEscuro', verts=12),
              cyl(0.15, 0.1, (0, 0, 0.92), 'metalEscuro', verts=12)]
    from mathutils import Matrix
    M = Matrix.Translation(Vector((0, 0.95, 5.0))) @ Matrix.Rotation(R(-55), 4, 'X')
    bpy.context.view_layer.update()
    for o in luneta:
        o.matrix_world = M @ o.matrix_world
    p += luneta
    for i, (a, z) in enumerate(((0.6, 4.5), (2.0, 4.85), (3.6, 4.4), (4.9, 4.75))):
        p.append(prism(star_pts(0.18, 0.07, 5, i * 15), 0.04, (math.cos(a) * 1.35, math.sin(a) * 1.35, z), 'estrela',
                       rot=(R(70), 0, a + R(90))))
    # Porta, janelinha redonda e degraus na frente (−Y).
    p.append(box((0.8, 0.1, 1.4), (0, -1.68, 0.7), 'madeiraObservatorio', bevel=0.04, segs=1))
    p.append(uvball(0.05, (0.25, -1.75, 0.75), 'macaneta', seg=6, ring=4))
    p.append(cyl(0.28, 0.06, (0.9, -1.45, 1.75), 'vidroJanela', verts=12, rot=(R(90), 0, R(-30))))
    for k in range(3):
        p.append(box((1.2, 0.35, 0.12), (0, -1.95 - k * 0.32, 0.36 - k * 0.12), 'pedraObservatorioEscura', bevel=0.03, segs=1))
    # Escada de mão até a varanda, do lado.
    for x in (-0.25, 0.25):
        p.append(box((0.06, 0.06, 2.8), (1.75 + x * 0.1, 0.6 + x, 1.4), 'madeiraObservatorio', bevel=0.0, rot=(0, R(-8), R(70))))
    # Poleiro da coruja na varanda.
    p.append(cyl(0.04, 0.8, (-1.9, -0.9, 3.2), 'madeiraObservatorio', verts=5))
    p.append(cyl(0.035, 0.6, (-1.9, -0.9, 3.6), 'madeiraObservatorio', verts=5, rot=(0, R(90), R(30))))
    return p


def pegada(x, z, a, s=1.0):
    """Pegada de dino (três dedos) marcada no chão."""
    bx, by = x, -z
    p = [cyl(0.32 * s, 0.03, (bx, by, TOPO + 0.012), 'terraIlhaEscura', verts=8)]
    for k in (-1, 0, 1):
        aa = a + k * 0.5
        p.append(box((0.42 * s, 0.14 * s, 0.03), (bx + math.cos(aa) * 0.42 * s, by + math.sin(aa) * 0.42 * s, TOPO + 0.012),
                     'terraIlhaEscura', bevel=0.0, rot=(0, 0, aa)))
    return p


# ------------------------------------------------------------------ a ilha
def ilha():
    lib_q.reset()
    chao = base_da_ilha('vale-dos-dinos', topo='gramaEscura')
    pedras, lava, fumaca = vulcao()
    cen = list(fumaca)
    cen.append(caminho([(12.3, 0), (6.5, 0.2), (2.0, 0.6)], 1.0, 'terraIlha'))
    for k, ramo in enumerate(([(2.4, 0.6), (3.0, 3.0), (3.6, 4.2)], [(2.2, 0.3), (2.8, -3.0), (3.0, -4.9)])):
        cen.append(caminho(ramo, 0.7, 'terraIlha', z1=0.024 - 0.006 * k))
    cen += escavacao(4.4, 6.8)
    cen += colocar(observatorio(), 3.2, -7.6, angulo_para(3.2, -7.6, 3.0, -2.0), y=TOPO)
    for k, (x, z, n_ovos) in enumerate(((-7.6, 6.6, 3), (8.6, -6.4, 2), (-1.4, 9.8, 4))):
        cen += colocar(ninho(1.0, n_ovos, seed=k), x, z, R(40 * k), y=TOPO)
    for i, (x, z, s) in enumerate(((-9.5, 3.0, 1.2), (-4.0, 6.0, 1.0), (0.2, 6.2, 0.8), (8.6, 5.8, 1.0),
                                   (-0.8, 3.8, 0.75), (-10.0, -5.2, 1.1), (-1.0, -9.6, 1.15), (6.0, -10.0, 0.9),
                                   (-6.8, 9.6, 1.0), (10.2, -5.8, 0.8))):
        cen += colocar(samambaia_gigante(s, seed=i), x, z, R(31 * i), y=TOPO)
    for i, (x, z) in enumerate(((-8.8, 8.4), (8.0, 7.8), (0.8, -6.0), (-5.5, -9.4))):
        cen += colocar(cavalinha(1.0, seed=i), x, z, R(50 * i), y=TOPO)
    for x, z, s in ((-10.4, 6.0, 1.1), (9.6, 7.0, 1.0), (11.0, -6.8, 0.9)):
        cen += anel.coqueiro_leve(x, z, s, incl=(-0.5, 0.3))
    for i, (x, z, s) in enumerate(((7.0, 9.6, 0.9), (-8.6, -1.0, 0.8), (-2.6, -10.5, 1.0), (10.0, -9.0, 0.8))):
        cen += anel.pedra_leve(x, z, s, 'rochaVulcaoEscura', seed=i + 5)
    for k in range(7):
        cen += pegada(5.0 + k * 0.85, -4.6 + (k % 2) * 0.55, R(10), 1.0)
    for x, z in ((5.2, -2.8), (5.2, 2.8), (0.2, 3.4)):
        cen += poste_lampiao(x, z)
    conferir_corredor(cen + pedras + lava, 'vale')
    ancoras = ancoras_padrao(
        lumis=[(6.0, 4.0), (-0.6, 4.4), (6.4, -3.8), (-0.4, -4.8)], morador=(3.0, -4.6),
        extras=[('observatorio', 3.2, -5.3), ('varanda', 3.2, -7.6, TOPO + 2.8), ('escavacao', 4.4, 6.8, TOPO + 0.06),
                ('ninho-1', -7.6, 6.6), ('ninho-2', 8.6, -6.4), ('ninho-3', -1.4, 9.8),
                ('cratera', VULCAO['x'], VULCAO['z'], TOPO - 0.3 + VULCAO['h'] - 0.4), ('pe-do-vulcao', 0.6, -1.4)])
    exportar('vale-dos-dinos', {'chao': chao, 'vulcao': pedras, 'lava': lava, 'cenario': cen}, ancoras)


def props():
    lib_q.reset()
    exportar('vale-dos-dinos-props', {'samambaia-gigante': samambaia_gigante(), 'cavalinha': cavalinha(),
                                       'ninho': ninho(), 'ovo-dino': ovo(), 'osso': osso(), 'cranio-fossil': cranio_fossil()})


if __name__ == '__main__':
    qual = sys.argv[-1] if len(sys.argv) > 1 else 'tudo'
    if qual in ('ilha', 'tudo'):
        ilha()
    if qual in ('props', 'tudo'):
        props()
