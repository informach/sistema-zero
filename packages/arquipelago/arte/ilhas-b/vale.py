"""Vale dos Dinos, a ilha completa: o vulcão com a lava que acende, a escavação dos fósseis, os
ninhos com ovos pintados, as samambaias gigantes e o observatório da Jade.

Gera dois arquivos em `src/assets/ilhas/`:

- `vale-dos-dinos.glb`: nós `chao` (o chão da ilha leve), `vulcao` (rocha), `lava` (tudo o que é
  lava: cratera e rios, material `lava`, que o jogo faz pulsar), `cenario`, as âncoras e os
  colisores `col-*` (aj-ligar-01: o vulcão entra no `col-terreno`, com as encostas que não se
  sobem; o resto são formas simples, na convenção do README de `arte/ilhas`);
- `vale-dos-dinos-props.glb`: `samambaia-gigante`, `cavalinha`, `ninho`, `ovo-dino`, `osso`,
  `cranio-fossil` e os seis fósseis do museu (`fossil-cranio-rex`, `fossil-dente`, `fossil-garra`,
  `fossil-vertebra`, `fossil-chifre-triceratopo`, `fossil-ovo`, o mesmo desenho dos itens:
  `arte/itens/fosseis.py`), cada um com a base em y = 0.

O vulcão é o marco de altura do Vale (pedido de 31/10/2026): a agulha de cima (`vulcao_alto`, no
nó `vulcao`) leva a boca a 16,3 m e a fumaça a uns 19,8 m acima do mar. Ela fica toda acima do
que se pisa e não entra no `col-terreno` (o chão de colisão continua o de antes; a âncora
`cratera` também, agora dentro da agulha).

O segredo da montaria (31/10/2026, `segredo_da_montaria`): um terraço de basalto na encosta sul do
vulcão (âncora `segredo-montaria` no tampo, colisor `col-terraco-segredo`), alto demais para o
pulo e para o planador, com uma rampa como único acesso. O tampo da rampa é a faixa de cinza
quente: o nó `cinza-quente` (material `cinzaQuente`, brilho fraco de brasa) e o nó vazio
`cinza-quente-area`, a caixa da área: o cubo de 1 m centrado no nó, levado pela posição, pelo
giro e pela escala dele (quem estiver dentro, sem estar montado, volta; o dino passa). O colisor da
rampa é `col-rampa-cinza`. Por baixo da parte alta da rampa passa a trilha das pedras do vulcão.
"""
from lib_ilhas_b import *
import lib_cais

# Os fósseis do museu: o desenho mora em `arte/itens/fosseis.py` (no fim do caminho, para os
# módulos daqui e do `arte/mundo` virem antes).
sys.path.append(os.path.join(AQUI, '..', 'itens'))
import fosseis  # noqa: E402

lib_q.PALETTE.update({
    'cinzaQuente': ('#8a7d78', 0.95, '#ff7a3c', 0.12),
    'brasaDaCinza': ('#ff8a3c', 0.5, '#ff7a2c', 0.8),
    'basalto': ('#4b4752', 0.9, None, 0),
    'basaltoClaro': ('#635e6a', 0.9, None, 0),
})

# O ponto de embarque do barco (pedido de arte de 30/10/2026): o deque sai do −x, atrás do vulcão,
# entre as pedras do pé dele e as samambaias. A beira do tampo (x −12,4) e o degrau (0,4 depois)
# foram medidos no `col-terreno`; a ponta fica 3,3 além do barranco (x −15,0).
PORTO = dict(terra=(-12.4, 0.0), rumo=180, degrau=0.4, comprimento=5.9, lado=-1)

VULCAO = dict(x=-4.2, z=-2.6, r=5.6, h=7.2)
# A agulha de cima do vulcão (z do Blender, a partir do mar; raio): começa dentro do cone de antes e
# leva a boca a 16,3 m. O perfil de baixo fica por dentro da superfície antiga (que tem até 7% de
# variação no raio).
VULCAO_ALTO = dict(perfil=[(6.0, 2.2), (7.85, 1.98), (9.2, 1.9), (11.0, 1.7), (13.0, 1.5), (14.8, 1.33), (16.3, 1.15)],
                   boca=0.9, fundo=16.05)
# O segredo da montaria (no referencial do jogo): o pé da rampa no chão, o topo dela na beira do
# terraço, a altura do tampo do terraço (y), a largura da rampa, o lado do terraço, a quebra da
# rampa (a distância do pé e a altura) e a espessura da laje: o lance de baixo a 46° e o de cima a
# uns 34° (o dino sobe até 52°). O pé fica entre a pedra 6 do vulcão, a samambaia da trilha da
# escavação e o ninho 3: por baixo da ponte passam a trilha das pedras e o dino a caminho do oeste.
# O terraço fica alto demais para quem chega pulando ou planando (o teste mede).
SEGREDO = dict(pe=(-2.3, 7.35), topo=(-1.41, 1.66), altura=5.6, largura=1.9, terraco=2.4, quebra=(1.9, 3.0),
               espessura=0.22)


# ------------------------------------------------------------------ vulcão
RIOS = (math.radians(-60), math.radians(15), math.radians(120))


def rio_de_lava(k):
    """Os pontos do rio de lava `k` pela encosta do cone de antes (da borda da cratera ao pé)."""
    cx, cy, h, r, a = VULCAO['x'], -VULCAO['z'], VULCAO['h'], VULCAO['r'], RIOS[k]
    pts = []
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        tt = 0.98 - 0.98 * t
        rr = r * 0.36 + (r - r * 0.36) * t
        aa = a + 0.25 * math.sin(t * 3 + k)
        pts.append((cx + math.cos(aa) * (rr + 0.08), cy + math.sin(aa) * (rr + 0.08), TOPO - 0.3 + h * tt + 0.1))
    return pts


def vulcao(col):
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
        px, py = cx + math.cos(a) * (r + 0.4), cy + math.sin(a) * (r + 0.4)
        pedras.append(rock((px, py, TOPO), (1.1, 0.9, 0.7), 'rochaVulcaoEscura', seed=30 + i, subdiv=1, rough=0.2))
        # Baixa (uns 0,35 acima do chão): sobe-se andando, como nas pedras do lago do Bosque.
        col.append(col_cilindro('pedra-vulcao', 0.42, 0.6, (px, py, TOPO + 0.05)))
    # Lava: o lago da cratera, os rios pelas encostas e as poças no pé.
    # (O lago da cratera de antes ficou dentro da agulha: agora ele está na boca dela.)
    lava = []
    for k, a in enumerate(RIOS):
        pts = rio_de_lava(k)
        lava.append(tube(pts, [0.26, 0.3, 0.34, 0.38, 0.32], 'lava', seg=6))
        fim = pts[-1]
        lava.append(slab(blob(fim[0] + math.cos(a) * 0.6, fim[1] + math.sin(a) * 0.6, 0.9, 0.7, seed=k, n=16, wob=0.15),
                         TOPO - 0.02, TOPO + 0.05, 'lava', bevel=0.0, name='poca', fundo=False))
    alto, lava_alta, boca = vulcao_alto(cx, cy, rnd)
    pedras += alto
    lava += lava_alta
    fumaca = []
    for k, (dx, dy, dz, rr) in enumerate(((0, 0, 0.9, 0.95), (0.6, 0.3, 1.7, 0.75), (-0.3, 0.7, 2.4, 0.6),
                                          (0.4, -0.2, 3.0, 0.45))):
        fumaca.append(uvball(rr, (cx + dx, cy + dy, boca + dz), 'nuvemSombra', seg=10, ring=6))
    return pedras, lava, fumaca, o


def raio_da_agulha(z):
    """O raio da agulha na altura z (sem a variação), pelo perfil."""
    perfil = VULCAO_ALTO['perfil']
    for (z0, r0), (z1, r1) in zip(perfil, perfil[1:]):
        if z <= z1:
            return r0 + (r1 - r0) * max(0.0, (z - z0) / (z1 - z0))
    return perfil[-1][1]


def vulcao_alto(cx, cy, rnd):
    """A agulha de cima do vulcão (o marco de altura do Vale): anéis de rocha em camadas até a boca,
    com o lago de lava lá em cima e os rios descendo até onde os de antes começam. Só desenho: o
    `col-terreno` continua o cone de antes (nada daqui se pisa)."""
    n = 18
    perfil = VULCAO_ALTO['perfil']
    verts, faces = [], []
    for k, (z, rr) in enumerate(perfil):
        for i in range(n):
            a = 2 * math.pi * i / n + k * 0.23
            j = 1 + rnd.uniform(-0.05, 0.05) if 0 < k < len(perfil) - 1 else 1
            verts.append((cx + math.cos(a) * rr * j, cy + math.sin(a) * rr * j, z))
    k_boca = len(perfil) - 1
    for i in range(n):
        a = 2 * math.pi * i / n + k_boca * 0.23
        verts.append((cx + math.cos(a) * VULCAO_ALTO['boca'], cy + math.sin(a) * VULCAO_ALTO['boca'], VULCAO_ALTO['fundo']))
    for k in range(len(perfil)):
        for i in range(n):
            a0, a1 = k * n + i, k * n + (i + 1) % n
            b0, b1 = (k + 1) * n + i, (k + 1) * n + (i + 1) % n
            faces += [(a0, a1, b1), (a0, b1, b0)]
    o = malha('vulcao-alto', verts, faces, 'rochaVulcao', cima=False)
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    # Camadas de rocha (uma faixa escura a cada dois anéis) e a boca escura.
    pintar_por(o, lambda c, nn: 'rochaVulcaoEscura' if (c.z > 15.4 or c.z < 7.85 or 9.2 < c.z < 11.0 or 13.0 < c.z < 14.8)
               else None)
    lib_q.flat(o)
    boca = perfil[-1][0]
    lava = [cyl(VULCAO_ALTO['boca'] + 0.05, 0.1, (cx, cy, VULCAO_ALTO['fundo'] - 0.1), 'lava', verts=n)]
    # Os rios: da boca até o começo dos rios de antes (mesmo ângulo e o mesmo ponto de partida).
    h, r = VULCAO['h'], VULCAO['r']
    for k, a in enumerate(RIOS):
        aa0 = a + 0.25 * math.sin(k)
        fim = rio_de_lava(k)[0]
        pts = []
        for z in (boca - 0.1, 14.6, 12.8, 11.0, 9.3, 8.4):
            aa = aa0 + 0.12 * math.sin(z * 0.9 + k)
            rr = raio_da_agulha(z) + 0.12
            pts.append((cx + math.cos(aa) * rr, cy + math.sin(aa) * rr, z))
        pts.append(fim)
        lava.append(tube(pts, [0.16, 0.18, 0.2, 0.22, 0.24, 0.25, 0.26], 'lava', seg=6))
    return [o], lava, boca


# ------------------------------------------------------------------ peças
def samambaia_gigante(s=1.0, seed=0, col=None):
    rnd = random.Random(seed)
    if col is not None:
        # Macia: só o miolo e os brotos seguram o corpo (as folhas passam por cima).
        col.append(col_cilindro('moita-samambaia', 0.4 * s, 1.2 * s, (0, 0, 0.6 * s)))
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


def cavalinha(s=1.0, seed=0, col=None):
    """Tufo de cavalinhas (planta pré-histórica): hastes com anéis escuros."""
    rnd = random.Random(seed)
    if col is not None:
        col.append(col_cilindro('moita-cavalinha', 0.32 * s, 1.6 * s, (0, 0, 0.8 * s)))
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


def ninho(s=1.0, ovos=3, seed=0, col=None):
    rnd = random.Random(seed)
    if col is not None:
        # A borda de palha com os gravetos e os ovos (uns 0,8 de alto).
        col.append(col_cilindro('ninho', 1.2 * s, 0.8 * s, (0, 0, 0.4 * s)))
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


def esqueleto(col=None):
    """O esqueleto deitado na escavação: crânio, coluna em curva, costelas e a cauda."""
    p = []
    if col is not None:
        # O crânio e a gaiola das costelas seguram o corpo; a coluna, a cauda e os ossos soltos são
        # baixos e se pisam.
        c = [col_caixa('cranio', (1.35, 0.75, 0.6), (0, 0, 0.3))]
        lib_ilha.place(c, loc=(2.2, 0.25, 0.0), rot_z=R(10))
        col += c
        col.append(col_caixa('costelas', (2.5, 1.5, 0.95), (-0.45, 0.0, 0.475)))
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


def escavacao(x, z, col):
    """Buraco de areia com o esqueleto, cerca de corda (aberta entre o 5º e o 6º postes, a
    entrada), baldinho, pá e pincel."""
    p = [mancha(x, z, 3.8, 3.0, 'areiaEscavacao', seed=4, z1=TOPO + 0.04),
         mancha(x, z, 3.0, 2.2, 'areiaEscavacaoFunda', seed=5, z1=TOPO + 0.06)]
    c = []
    esq = esqueleto(c)
    colocar(esq, x, z, R(-20), y=TOPO + 0.02, escala=1.0)
    col.extend(colocar(c, x, z, R(-20), y=TOPO + 0.02, escala=1.0))
    p += esq
    postes = []
    for i in range(10):
        a = 2 * math.pi * i / 10
        px, pz = x + math.cos(a) * 3.6, z + math.sin(a) * 2.8
        postes.append((px, -pz, TOPO + 0.7))
        p.append(cyl(0.06, 0.75, (px, -pz, TOPO + 0.37), 'poste', verts=6))
        col.append(col_cilindro('poste-cerca', 0.08, 0.85, (px, -pz, TOPO + 0.42)))
        p.append(uvball(0.08, (px, -pz, TOPO + 0.78), 'cordaEscavacao', seg=6, ring=4))
    for i in range(10):
        a, b = postes[i], postes[(i + 1) % 10]
        if i == 4:
            continue
        meio = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2] - 0.12)
        p.append(tube([a, meio, b], [0.025] * 3, 'cordaEscavacao', seg=4, cap=False))
        # A corda segura quem anda (a cerca é baixa, mas não se passa por cima dela).
        col.append(col_entre('guarda-cerca', (a[0], a[1], TOPO), (b[0], b[1], TOPO), 0.1, 0.85))
    bx, by = x - 2.4, -z - 1.0
    p.append(cyl(0.25, 0.4, (bx, by, TOPO + 0.2), 'agarraAzul', verts=12, r2=0.2))
    p.append(torus(0.22, 0.02, (bx, by, TOPO + 0.5), 'metalEscuro', seg=10, rseg=3, rot=(R(90), 0, 0), arc=180))
    p.append(tube([(bx + 0.5, by + 0.2, TOPO + 0.02), (bx + 1.3, by + 0.5, TOPO + 0.08)], [0.03, 0.03], 'tronco', seg=5))
    p.append(box((0.25, 0.2, 0.03), (bx + 1.45, by + 0.56, TOPO + 0.06), 'metalEscuro', bevel=0.01, segs=1))
    p.append(tube([(bx + 0.4, by - 0.4, TOPO + 0.03), (bx + 0.9, by - 0.5, TOPO + 0.03)], [0.025, 0.025], 'pincel', seg=5))
    p.append(cyl(0.05, 0.12, (bx + 0.95, by - 0.51, TOPO + 0.04), 'cabelo', verts=6, rot=(0, R(90), 0)))
    return p


def observatorio(col=None):
    """Observatório da Jade: torre de pedra, varanda de madeira, cúpula com a fresta e a luneta."""
    if col is not None:
        # A torre (porta fechada por enquanto), a varanda que se pisa (a escada de mão é enfeite) e a
        # cúpula; os degraus da frente.
        col.append(col_cilindro('observatorio', 1.72, 2.7, (0, 0, 1.35)))
        col.append(col_cilindro('varanda', 2.3, 0.18, (0, 0, 2.7)))
        col.append(col_cilindro('cupula', 1.6, 2.4, (0, 0, 4.0)))
        for k in range(3):
            topo_ = 0.42 - k * 0.12
            col.append(col_caixa('degrau-observatorio', (1.2, 0.35, topo_), (0, -1.95 - k * 0.32, topo_ / 2)))
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


# ------------------------------------------------------------------ o segredo da montaria
def altura_do_cone(rv):
    """A altura (z do Blender) da superfície do cone de antes a `rv` do eixo, sem a variação."""
    h, r = VULCAO['h'], VULCAO['r']
    perfil = [(r * f, TOPO - 0.3 + h * t) for f, t in ((1, 0), (0.84, 0.2), (0.66, 0.42), (0.5, 0.64), (0.4, 0.84),
                                                        (0.36, 1.0))]
    if rv >= perfil[0][0]:
        return TOPO - 0.3
    for (r0, z0), (r1, z1) in zip(perfil, perfil[1:]):
        if rv >= r1:
            return z0 + (z1 - z0) * (r0 - rv) / (r0 - r1)
    return perfil[-1][1]


def _perto_do_rio(p, rio, folga):
    for a, b in zip(rio, rio[1:]):
        ax, ay, bx, by = a[0], a[1], b[0], b[1]
        vx, vy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy)))
        if math.hypot(p.x - ax - t * vx, p.y - ay - t * vy) < folga:
            return True
    return False


def segredo_da_montaria(col):
    """O terraço do segredo na encosta sul do vulcão e a rampa de cinza quente, o único acesso.

    Devolve (desenho, faixa de cinza, nó da área, âncora). A rampa sai do chão no `pe` e chega à
    beira do terraço no `topo`, em dois lances: o de baixo, curto e íngreme, cheio até o chão; o de
    cima, uma ponte por cima da trilha das pedras do vulcão e do caminho do dino para o oeste da
    ilha (vão de mais de 2,2 m embaixo dele). A faixa de cinza cobre o tampo inteiro, do chão até a
    beira do terraço; a área é uma caixa só, no plano do lance de cima."""
    from mathutils import Vector as V
    fx, fy = SEGREDO['pe'][0], -SEGREDO['pe'][1]
    tx, ty = SEGREDO['topo'][0], -SEGREDO['topo'][1]
    larg, alt, lado = SEGREDO['largura'], SEGREDO['altura'], SEGREDO['terraco']
    ku, kv = SEGREDO['quebra']
    d = V((tx - fx, ty - fy))
    lh = d.length
    d.normalize()
    phi = math.atan2(d.y, d.x)
    psi = math.atan2(-d.x, d.y)
    t1 = math.atan2(kv - TOPO, ku)
    t2 = math.atan2(alt - kv, lh - ku)
    esp = SEGREDO['espessura']
    e1, e2 = esp / math.cos(t1), esp / math.cos(t2)

    def topo(u):
        return TOPO + u * math.tan(t1) if u <= ku else kv + (u - ku) * math.tan(t2)

    def no_rumo(pts, prof, m):
        o = prism(pts, prof, (0, 0, 0), m)
        o.rotation_euler = (0, 0, phi)
        o.location = (fx, fy, 0)
        return o

    def faixa_(u0, u1, cima, baixo):
        """Perfil (u, z) de uma laje que segue o tampo, de u0 a u1, com a quebra no meio."""
        return [(u0, topo(u0) + cima), (ku, kv + cima), (u1, topo(u1) + cima), (u1, topo(u1) - baixo[1]),
                (ku, kv - (baixo[0] + baixo[1]) / 2), (u0, topo(u0) - baixo[0])]

    cen = [no_rumo(faixa_(-0.4, lh, 0.0, (e1, e2)), larg, 'basalto')]
    # Embaixo do lance de baixo, cheio até o chão (o de cima é ponte).
    u_g = (e1 - 0.35) / math.tan(t1)
    cen.append(no_rumo([(u_g, TOPO - 0.3), (ku, TOPO - 0.3), (ku, kv - (e1 + e2) / 2 + 0.05)], larg - 0.04, 'basaltoClaro'))
    # O terraço: uma laje de basalto alinhada com a rampa, apoiada em colunas que entram no vulcão.
    c = V((fx, fy)) + d * (lh - 0.05 + lado / 2)
    cen.append(box((lado, lado, 0.5), (c.x, c.y, alt - 0.25), 'basalto', bevel=0.06, segs=1, rot=(0, 0, phi)))
    col.append(col_caixa('terraco-segredo', (lado, lado, 1.0), (c.x, c.y, alt - 0.5), rot=(0, 0, phi)))
    rnd = random.Random(31)
    cx, cy = VULCAO['x'], -VULCAO['z']
    per = V((-d.y, d.x))
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            p = c + d * (j * lado * 0.33) + per * (i * lado * 0.33) + V((rnd.uniform(-0.1, 0.1), rnd.uniform(-0.1, 0.1)))
            chao = altura_do_cone(math.hypot(p.x - cx, p.y - cy))
            # Só em cima do vulcão e fora dos rios de lava.
            if chao < TOPO + 1.0 or any(_perto_do_rio(p, rio_de_lava(k), 0.85) for k in range(len(RIOS))):
                continue
            z0, z1 = chao - 0.5, alt - 0.48
            cen.append(cyl(rnd.uniform(0.28, 0.36), z1 - z0, (p.x, p.y, (z0 + z1) / 2), 'basaltoClaro' if (i + j) % 2 else
                           'basalto', verts=6, rot=(0, 0, rnd.uniform(0, 1))))
    # Os colisores dos dois lances (o tampo de cada um é o tampo da rampa).
    for (ua, za), (ub, zb), th, alem in (((-0.5, topo(-0.5)), (ku, kv), t1, 0.0), ((ku, kv), (lh, alt), t2, 0.0)):
        a3 = V((d.x * math.cos(th), d.y * math.cos(th), math.sin(th)))
        n3 = V((-d.x * math.sin(th), -d.y * math.sin(th), math.cos(th)))
        comp = math.hypot(ub - ua, zb - za) + alem
        meio = V((fx, fy, 0)) + V((d.x, d.y, 0)) * ((ua + ub) / 2) + V((0, 0, (za + zb) / 2))
        col.append(col_caixa('rampa-cinza', (larg, comp, esp), tuple(meio - n3 * esp / 2), rot=(th, 0, psi)))
    cinza = [no_rumo(faixa_(-0.3, lh - 0.02, 0.03, (0.03, 0.03)), larg - 0.06, 'cinzaQuente')]
    for k in range(16):
        u = rnd.uniform(0.3, lh - 0.3)
        w = rnd.uniform(-larg / 2 + 0.25, larg / 2 - 0.25)
        q = V((fx, fy)) + d * u + per * w
        b = uvball(rnd.uniform(0.04, 0.07), (q.x, q.y, topo(u) + 0.03), 'brasaDaCinza', seg=6, ring=4, scale=(1, 1, 0.4))
        b.rotation_euler = (0, -(t1 if u <= ku else t2), phi)
        cinza.append(b)
    # A área: uma caixa no plano do lance de cima, que pega também o tampo do lance de baixo (que
    # fica até 0,4 m abaixo desse plano). Coordenadas (s ao longo, n para cima do plano) a partir da quebra.
    a2 = (math.cos(t2), math.sin(t2))
    n2 = (-math.sin(t2), math.cos(t2))
    s_de = lambda u, z: (u - ku) * a2[0] + (z - kv) * a2[1]  # noqa: E731
    n_de = lambda u, z: (u - ku) * n2[0] + (z - kv) * n2[1]  # noqa: E731
    sa0, sa1 = s_de(0.0, TOPO) - 0.15, s_de(lh, alt) + 0.15
    na0, na1 = min(n_de(u / 10 * ku, topo(u / 10 * ku)) for u in range(11)) - 0.08, 2.2
    sm, nm = (sa0 + sa1) / 2, (na0 + na1) / 2
    um, zm = ku + sm * a2[0] + nm * n2[0], kv + sm * a2[1] + nm * n2[1]
    area = bpy.data.objects.new('cinza-quente-area', None)
    area.empty_display_type = 'CUBE'
    area.empty_display_size = 0.5
    area.location = (fx + d.x * um, fy + d.y * um, zm)
    area.rotation_euler = (t2, 0, psi)
    area.scale = (larg + 0.4, sa1 - sa0, na1 - na0)
    bpy.context.collection.objects.link(area)
    anc = ancora('segredo-montaria', c.x, -c.y, alt)
    return cen, cinza, area, anc


# ------------------------------------------------------------------ a ilha
def ilha():
    lib_q.reset()
    col = []
    chao = base_da_ilha('vale-dos-dinos', topo='gramaEscura')
    pedras, lava, fumaca, vulcao_ = vulcao(col)

    def montar(pecas, x, z, giro, y=TOPO):
        """Põe uma peça montada na origem (desenho e colisores dela) no lugar."""
        c = []
        objs = colocar(pecas(c), x, z, giro, y=y)
        col.extend(colocar(c, x, z, giro, y=y))
        return objs

    cen = list(fumaca)
    cen.append(caminho([(12.3, 0), (6.5, 0.2), (2.0, 0.6)], 1.0, 'terraIlha'))
    for k, ramo in enumerate(([(2.4, 0.6), (3.0, 3.0), (3.6, 4.2)], [(2.2, 0.3), (2.8, -3.0), (3.0, -4.9)])):
        cen.append(caminho(ramo, 0.7, 'terraIlha', z1=0.024 - 0.006 * k))
    cen += escavacao(4.4, 6.8, col)
    cen += montar(lambda c: observatorio(c), 3.2, -7.6, angulo_para(3.2, -7.6, 3.0, -2.0))
    for k, (x, z, n_ovos) in enumerate(((-7.6, 6.6, 3), (8.6, -6.4, 2), (-1.4, 9.8, 4))):
        cen += montar(lambda c, k=k, n_ovos=n_ovos: ninho(1.0, n_ovos, seed=k, col=c), x, z, R(40 * k))
    for i, (x, z, s) in enumerate(((-9.5, 3.0, 1.2), (-4.0, 6.0, 1.0), (0.2, 6.2, 0.8), (8.6, 5.8, 1.0),
                                   (-0.8, 3.8, 0.75), (-10.0, -5.2, 1.1), (-1.0, -9.6, 1.15), (6.0, -10.0, 0.9),
                                   (-6.8, 9.6, 1.0), (10.2, -5.8, 0.8))):
        cen += montar(lambda c, s=s, i=i: samambaia_gigante(s, seed=i, col=c), x, z, R(31 * i))
    for i, (x, z) in enumerate(((-8.8, 8.4), (8.0, 7.8), (0.8, -6.0), (-5.5, -9.4))):
        cen += montar(lambda c, i=i: cavalinha(1.0, seed=i, col=c), x, z, R(50 * i))
    for x, z, s in ((-10.4, 6.0, 1.1), (9.6, 7.0, 1.0), (11.0, -6.8, 0.9)):
        cen += anel.coqueiro_leve(x, z, s, incl=(-0.5, 0.3))
        col.append(col_cilindro('coqueiro', 0.22 * s, 2.0 * s, (x, -z, TOPO + 1.0 * s)))
    for i, (x, z, s) in enumerate(((7.0, 9.6, 0.9), (-8.6, -1.0, 0.8), (-2.6, -10.5, 1.0), (10.0, -9.0, 0.8))):
        cen += anel.pedra_leve(x, z, s, 'rochaVulcaoEscura', seed=i + 5)
        col.append(col_cilindro('pedra', 0.55 * s, 0.3 * s + 0.2, (x, -z, TOPO + 0.15 * s - 0.1)))
    for k in range(7):
        cen += pegada(5.0 + k * 0.85, -4.6 + (k % 2) * 0.55, R(10), 1.0)
    for x, z in ((5.2, -2.8), (5.2, 2.8), (0.2, 3.4)):
        cen += poste_lampiao(x, z)
        col.append(col_cilindro('poste-lampiao', 0.1, 2.9, (x, -z, TOPO + 1.45)))
    seg_cen, cinza, area, anc_segredo = segredo_da_montaria(col)
    cen += seg_cen
    conferir_corredor(cen + pedras + lava + cinza, 'vale')
    # O chão que se pisa: tampo, praia e barranco e o vulcão (a lava e as manchas só desenham).
    col.insert(0, col_terreno(chao + [vulcao_]))
    ancoras = ancoras_padrao(
        # O lumi-4 e o pé do vulcão estavam na encosta (2,6 e 0,8 m acima do chão): agora no plano.
        lumis=[(6.0, 4.0), (-0.6, 4.4), (6.4, -3.8), (0.4, -8.6)], morador=(3.0, -4.6),
        extras=[('observatorio', 3.2, -5.3), ('varanda', 3.2, -7.6, TOPO + 2.8), ('escavacao', 4.4, 6.8, TOPO + 0.06),
                ('ninho-1', -7.6, 6.6), ('ninho-2', 8.6, -6.4), ('ninho-3', -1.4, 9.8),
                ('cratera', VULCAO['x'], VULCAO['z'], TOPO - 0.3 + VULCAO['h'] - 0.4), ('pe-do-vulcao', 2.4, -1.9)])
    ancoras += [anc_segredo, area]
    nos = {'chao': chao, 'vulcao': pedras, 'lava': lava, 'cenario': cen, 'cinza-quente': cinza}
    porto, _, dados_porto = lib_cais.deque_de_praia(**PORTO, col=col, col_caixa=col_caixa, col_cilindro=col_cilindro)
    ancoras += lib_cais.ancoras_do_porto(ancora, dados_porto)
    dados_porto['caixa_do_deque'] = lib_cais.caixa_no_jogo(porto)
    dados_porto['caixa_da_ilha'] = lib_cais.caixas_da_ilha(nos, porto)
    nos['porto'] = porto
    exportar('vale-dos-dinos', nos, ancoras, colisores=col, porto=dados_porto)


def props():
    lib_q.reset()
    nos = {'samambaia-gigante': samambaia_gigante(), 'cavalinha': cavalinha(), 'ninho': ninho(), 'ovo-dino': ovo(),
           'osso': osso(), 'cranio-fossil': cranio_fossil()}
    for pid in fosseis.FORMAS:
        nos[pid] = fosseis.fossil(pid)
    exportar('vale-dos-dinos-props', nos)


if __name__ == '__main__':
    qual = sys.argv[-1] if len(sys.argv) > 1 else 'tudo'
    if qual in ('ilha', 'tudo'):
        ilha()
    if qual in ('props', 'tudo'):
        props()
