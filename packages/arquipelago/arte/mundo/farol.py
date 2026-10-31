"""O Farol da sua ilha: torre listrada sobre as pedras, com a lanterna que acende na Lenda.

Referencial: o grupo `Farol` do jogo (y = 0 no chão). Cabe no colisor de antes (cilindro de raio
1,6 até y 9) com a base de pedra de raio ~2,2. A porta olha para o meio da ilha (a casa).

Nós (contrato com `src/mundo/farol.tsx`):
- `farol`: pedras, torre, galeria, caixilhos e telhado. Apagado, o jogo puxa as cores para o
  cinza; aceso, mostra as cores de verdade (vermelho e branco do Arquipélago);
- `lampada`: a lâmpada (material `lampadaFarol`, o jogo acende a emissão);
- `vidro`: o vidro da lanterna (material `vidroFarol`, brilha quando acende);
- `facho`: dois fachos opostos com o pivô no centro da lâmpada; o jogo gira em y;
- `porta`: a folha da porta e a maçaneta, com o pivô na dobradiça (o lado oposto à maçaneta, no pé
  da folha). Girar em y negativo abre para fora.

Colisão: a torre é o cilindro do código (raio 1,6). As pedras do pé e os degraus da porta trazem os
nós `col-cil-pedra-farol-*` e `col-degrau-farol-*` (sem material), que o jogo lê do arquivo.

A subida final por fora (pedido "A subida final pelo Farol", 31/10/2026): um andaime de madeira atrás
da torre (o lado longe da porta, da casa e do quadro), no nó `subida` (filho do `farol`: quem copia o
`farol` leva o andaime; o jogo acha o nó pelo nome). O caminho, com os números de `sistemas/corpo.ts`
e dos modos:
- escada reta do chão ao deque 1 (2,4 m, mais que o pulo de 1,5): `escada-1-base`, `-topo`, `-saida`
  e o colisor `col-escada-reta-1`;
- duas quinas de agarrar, cada deque 2,2 m acima do anterior (mais que o pulo, menos que os 3,65 de
  quem agarra): `borda-1-*` (deque 1 para o 2) e `borda-2-*` (deque 2 para o 3), com o corpo pendurado
  0,4 m acima do deque de baixo e o deque de cima livre para ficar de pé;
- a viga do equilíbrio, do deque 3 ao 4 (4,4 m de vão, mais que os 3,96 do pulo correndo e os 4,24
  dos patins): `equilibrio-1-a` e `-b`;
- a corrente de ar em cima do deque 4 (`corrente-de-ar` no tampo, `corrente-de-ar-topo` onde a subida
  para): com o planador, sobe e plana até o mirante, o deque 5 na altura da varanda (9 m, o alto do
  cilindro da torre), com o gradil aberto para a varanda;
- âncoras `subida-farol-largada` (no chão, perto da escada), `subida-farol-1` a `-6` (deques 1 a 5 e a
  varanda) e `vagalume-farol-1` a `-5` (no caminho, 0,2 m acima do meio do corpo).
Os colisores de tudo o que se pisa: `col-deque-subida-*`, `col-viga-subida-1`, os postes
`col-cil-poste-subida-*` e a lanterna `col-cil-lanterna-farol-1` (ninguém pousa dentro do vidro).
"""
from lib_mundo import *

Y0, Y1 = 1.35, 8.55       # torre: base e topo
R0, R1 = 1.12, 0.74       # raio embaixo e em cima
YL = 9.4                  # centro da lâmpada
# Direção da porta: do farol para o meio da ilha (no jogo).
_dx, _dz = 0 - FAROL[0], -4 - FAROL[1]
ANG_PORTA = math.atan2(-_dz, _dx)  # no chão do Blender (x, -z)


def raio(y):
    return R0 + (R1 - R0) * (y - Y0) / (Y1 - Y0)


def faixa(y0, y1, m, folga=0.0, verts=28):
    return cyl(raio(y0) + folga, y1 - y0, (0, 0, (y0 + y1) / 2), m, verts=verts, r2=raio(y1) + folga)


def no_lado(ang, r, z):
    return (math.cos(ang) * r, math.sin(ang) * r, z)


def corpo(col, porta):
    p = []
    # Pedras do pé: um monte de pedras chapadas, mais alto atrás.
    for i, (a, d, s, h) in enumerate([(0.75, 1.45, 2.0, 1.25), (1.6, 1.55, 1.8, 1.05), (2.6, 1.45, 2.2, 1.45),
                                      (3.6, 1.5, 2.1, 1.6), (4.6, 1.5, 1.9, 1.25), (5.5, 1.45, 1.8, 1.0),
                                      (0.0, 1.95, 1.0, 0.55), (3.1, 2.2, 1.2, 0.7)]):
        aa = ANG_PORTA + a
        p.append(rock((math.cos(aa) * d, math.sin(aa) * d, -0.15), (s, s * 0.9, h), 'farolPedra', seed=20 + i,
                      subdiv=1, rough=0.16, flat_top=0.25, top_m='musgo' if i % 2 else 'farolPedraClara'))
        # Cilindro do tamanho do raio menor da pedra (0,45 da escala), até perto do topo achatado.
        alto = -0.15 + 0.85 * h
        col.append(col_cilindro('pedra-farol', 0.47 * s, alto + 0.3,
                                (math.cos(aa) * d, math.sin(aa) * d, (alto - 0.3) / 2)))
    # Degraus de pedra até a porta.
    for k in range(3):
        c = no_lado(ANG_PORTA, R0 + 0.95 - k * 0.32, 0.12 + k * 0.28)
        o = box((0.62, 1.2, 0.26), c, 'farolPedraClara', bevel=0.05, segs=1, rot=(0, 0, ANG_PORTA))
        p.append(o)
        col.append(col_caixa('degrau-farol', (0.62, 1.2, 0.26), c, (0, 0, ANG_PORTA)))
    # Alicerce redondo de pedra com friso.
    p.append(cyl(R0 + 0.22, 0.6, (0, 0, Y0 - 0.25), 'farolPedraClara', verts=28, bevel=0.05))
    p.append(cyl(R0 + 0.26, 0.1, (0, 0, Y0 + 0.02), 'farolBranco', verts=28, bevel=0.03))
    # Torre: faixas vermelhas e brancas alternadas (como o farol de antes, com mais acabamento).
    cortes = [Y0, 2.85, 4.3, 5.75, 7.2, Y1]
    for i in range(5):
        p.append(faixa(cortes[i], cortes[i + 1], 'farolVermelho' if i % 2 == 0 else 'farolBranco'))
    for y in cortes[1:-1]:
        p.append(faixa(y - 0.04, y + 0.04, 'farolMarinho', folga=0.015))
    # Porta em arco com batente, e janelinhas subindo em espiral.
    pa = ANG_PORTA
    c = no_lado(pa, raio(Y0 + 0.9) - 0.02, Y0 + 0.95)
    p.append(box((0.22, 0.85, 1.5), c, 'farolMarinho', bevel=0.04, segs=1, rot=(0, 0, pa)))
    p.append(cyl(0.425, 0.22, no_lado(pa, raio(Y0 + 1.7) - 0.02, Y0 + 1.7), 'farolMarinho', verts=14,
                 rot=(0, R(90), pa)))
    c2 = no_lado(pa, raio(Y0 + 0.95) + 0.03, Y0 + 0.95)
    p.append(box((0.08, 1.05, 1.62), c2, 'farolBranco', bevel=0.03, segs=1, rot=(0, 0, pa)))
    # A folha da porta e a maçaneta vão para o nó `porta` (gira na dobradiça, do lado oposto à maçaneta).
    porta.append(box((0.1, 0.72, 1.42), no_lado(pa, raio(Y0 + 0.9) + 0.06, Y0 + 0.88), 'batente', bevel=0.03, segs=1,
                     rot=(0, 0, pa)))
    porta.append(sphere(0.06, no_lado(pa + 0.18, raio(Y0 + 0.9) + 0.14, Y0 + 0.85), 'macaneta', subdiv=1))
    for k, y in enumerate((3.55, 5.0, 6.45)):
        a = pa + 1.9 + k * 2.1
        r = raio(y)
        p.append(box((0.12, 0.52, 0.72), no_lado(a, r, y), 'farolBranco', bevel=0.03, segs=1, rot=(0, 0, a)))
        p.append(box((0.1, 0.36, 0.56), no_lado(a, r + 0.03, y), 'vidroJanela', bevel=0.0, rot=(0, 0, a)))
    # Galeria: mãos-francesas, piso largo e gradil.
    p.append(cyl(R1 + 0.02, 0.28, (0, 0, Y1 - 0.08), 'farolMarinho', verts=28, r2=1.32))
    p.append(cyl(1.42, 0.14, (0, 0, Y1 + 0.13), 'farolMarinho', verts=32, bevel=0.03))
    # O gradil abre um vão para o mirante da subida (o rumo dele, no Blender o ângulo troca de sinal).
    vao = -math.atan2(-1.0, -1.0)
    for i in range(16):
        a = 2 * math.pi * i / 16
        if abs(math.atan2(math.sin(a - vao), math.cos(a - vao))) < R(34):
            continue
        p.append(cyl(0.025, 0.55, no_lado(a, 1.33, Y1 + 0.47), 'farolBranco', verts=5, smooth_sides=False))
    inicio = vao + R(34)
    p.append(torus(1.33, 0.04, (0, 0, Y1 + 0.75), 'farolBranco', seg=27, rseg=5, arc=292, rot=(0, 0, inicio)))
    p.append(torus(1.33, 0.025, (0, 0, Y1 + 0.47), 'farolBranco', seg=27, rseg=4, arc=292, rot=(0, 0, inicio)))
    # Lanterna: aro de baixo, caixilhos e aro de cima (o vidro é outro nó).
    yl0, yl1 = Y1 + 0.2, YL + 0.75
    p.append(cyl(0.86, 0.3, (0, 0, yl0 + 0.15), 'farolVermelho', verts=28, bevel=0.03))
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        p.append(box((0.08, 0.08, yl1 - yl0 - 0.3), no_lado(a, 0.79, (yl0 + 0.3 + yl1) / 2), 'farolBranco',
                     bevel=0.0, rot=(0, 0, a)))
    p.append(torus(0.8, 0.05, (0, 0, yl1), 'farolBranco', seg=32, rseg=6))
    # Telhado: aba, cúpula vermelha em gomos, bolinha e cata-vento.
    p.append(cyl(1.0, 0.12, (0, 0, yl1 + 0.08), 'farolMarinho', verts=32, bevel=0.03))
    p.append(cyl(0.95, 0.9, (0, 0, yl1 + 0.6), 'farolVermelho', verts=24, r2=0.12))
    for i in range(8):
        a = 2 * math.pi * i / 8
        p.append(tube([no_lado(a, 0.14, yl1 + 1.03), no_lado(a, 0.96, yl1 + 0.16)], [0.03, 0.04], 'farolMarinho', seg=5))
    p.append(sphere(0.17, (0, 0, yl1 + 1.12), 'macaneta', subdiv=2))
    p.append(cyl(0.025, 0.55, (0, 0, yl1 + 1.45), 'farolMarinho', verts=6))
    p.append(prism([(0, 0.07), (0.42, 0), (0, -0.07)], 0.03, (0.02, 0, yl1 + 1.6), 'farolVermelho'))
    p.append(prism([(0, 0.11), (-0.22, 0.0), (0, -0.11)], 0.03, (0.0, 0, yl1 + 1.6), 'farolMarinho'))
    return p


def vidro():
    """O vidro desce 2 cm para dentro do aro de baixo e para 1 cm antes do aro de cima: as tampas
    dele não ficam no plano das pontas dos caixilhos."""
    yl0, yl1 = Y1 + 0.2, YL + 0.75
    v0, v1 = yl0 + 0.28, yl1 - 0.01
    return [cyl(0.76, v1 - v0, (0, 0, (v0 + v1) / 2), 'vidroFarol', verts=28)]


def lampada():
    p = [sphere(0.42, (0, 0, YL), 'lampadaFarol', subdiv=2)]
    # Lente em anéis (a "lente de Fresnel" do farol de verdade, simplificada).
    for k, dz in enumerate((-0.28, 0.28)):
        p.append(torus(0.36, 0.05, (0, 0, YL + dz), 'lampadaFarol', seg=20, rseg=5))
    p.append(cyl(0.18, 0.4, (0, 0, YL - 0.62), 'farolMarinho', verts=10))
    return p


def cone_aberto(comp, r0, r1, m, seg=20, sentido=1):
    """Facho: cone sem tampa, deitado em x, do centro da lâmpada para fora."""
    verts, faces = [], []
    for k, (x, r) in enumerate(((0.3 * sentido, r0), (comp * sentido, r1))):
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append((x, math.cos(a) * r, YL + math.sin(a) * r))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((i, j, seg + j, seg + i))
    o = malha('facho', verts, faces, m, liso=True, cima=False)
    return o


def dobradica():
    """O eixo da porta: na borda da folha do lado oposto à maçaneta, no pé da folha."""
    pa = ANG_PORTA
    cx, cy, _ = no_lado(pa, raio(Y0 + 0.9) + 0.06, 0)
    return (cx + math.sin(pa) * 0.36, cy - math.cos(pa) * 0.36, Y0 + 0.17)


def facho():
    return [cone_aberto(26, 0.35, 3.2, 'fachoFarol', sentido=1), cone_aberto(26, 0.35, 3.2, 'fachoFarol', sentido=-1)]


# ------------------------------------------------------------------ a subida final por fora
# Medidas no chão do grupo `Farol` do jogo (x, z; y para cima a partir do pé da torre). G(x, y, z)
# leva para o Blender. O andaime fica no -z (atrás da torre, do lado oposto à porta e à casa) e não
# passa de x 3 enquanto está dentro do lote grande (só o pé do farol está ocupado lá).
ESPESSURA_DO_DEQUE = 0.25
# Cada deque: (x0, x1, z0, z1, altura do tampo).
DEQUES = [
    (-4.2, -1.8, -3.2, -0.9, 2.4),   # 1: o alto da escada
    (-1.8, 0.6, -3.2, -0.9, 4.6),    # 2: agarrando a quina do 1 para o 2
    (0.6, 2.2, -5.0, -0.9, 6.8),     # 3: agarrando a quina do 2 para o 3; daqui sai a viga
    (-5.4, -3.8, -5.4, -3.8, 6.8),   # 4: o fim da viga, com a corrente de ar
]
# O mirante (deque 5), na altura do alto da torre (o cilindro do código vai até y 9), virado para o
# deque 4: do raio 1,45 (fora do piso da galeria) a 3,6, com 2,4 de largura.
ALTO_DA_TORRE = 9.0
RUMO_DO_MIRANTE = math.atan2(-1.0, -1.0)     # no chão do jogo (x, z)
MIRANTE = dict(r0=1.45, r1=3.6, largura=2.4)
ESCADA = dict(x=-4.25, z=-2.0, largura=0.6)
# As quinas: (x da face do deque de cima, altura, lado de fora em x, z de a, z de b). Os z deixam o
# corpo pendurado longe dos postes e do cilindro da torre (raio 1,6).
BORDAS = [(-1.8, 4.6, -1.0, -2.8, -1.5), (0.6, 6.8, -1.0, -3.1, -2.0)]
VIGA = dict(z=-4.6, x0=0.6, x1=-3.8, raio=0.15)
CORRENTE = dict(x=-4.6, z=-4.6, topo=10.5)
# Postes do andaime (x, z, até onde sobem): fora das pedras do pé e da moita atrás do farol.
POSTES = [(-4.0, -3.0, 2.4), (-1.9, -3.15, 4.6), (0.6, -3.6, 6.8), (0.8, -4.8, 6.8), (2.0, -3.4, 6.8),
          (-4.6, -4.6, 6.8)]
LARGADA = (-5.4, -1.0)


def G(x, y, z):
    return (x, -z, y)


def chao_local(x, z):
    """A altura do chão da ilha no ponto (x, z) do grupo Farol, no referencial do grupo."""
    return altura(FAROL[0] + x, FAROL[1] + z) - ALTURA_DA_TERRA


def mirante_cantos():
    """Os quatro cantos do mirante no chão do jogo (x, z)."""
    ux, uz = math.cos(RUMO_DO_MIRANTE), math.sin(RUMO_DO_MIRANTE)
    vx, vz = -uz, ux
    w = MIRANTE['largura'] / 2
    return [(ux * r + vx * t, uz * r + vz * t) for r, t in
            ((MIRANTE['r0'], -w), (MIRANTE['r1'], -w), (MIRANTE['r1'], w), (MIRANTE['r0'], w))]


def subida(col):
    """O andaime: deques, escada, viga, postes, mãos-francesas e o mirante; os colisores vão em `col`."""
    p = []
    e = ESPESSURA_DO_DEQUE
    for i, (x0, x1, z0, z1, h) in enumerate(DEQUES):
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        tam = (x1 - x0, z1 - z0, e)
        p.append(box(tam, G(cx, h - e / 2, cz), 'deque', bevel=0.03, segs=1))
        # Vigas embaixo do tampo (um pouco para dentro da borda): não ficam no plano dele.
        for zz in (z0 + 0.15, z1 - 0.15):
            p.append(box((x1 - x0 - 0.1, 0.12, 0.14), G(cx, h - e - 0.06, zz), 'dequeEscuro', bevel=0.02, segs=1))
        col.append(col_caixa('deque-subida', tam, G(cx, h - e / 2, cz)))
    # O mirante: um deque girado para o deque 4, na altura do alto da torre.
    rm = (MIRANTE['r0'] + MIRANTE['r1']) / 2
    cx, cz = math.cos(RUMO_DO_MIRANTE) * rm, math.sin(RUMO_DO_MIRANTE) * rm
    tam = (MIRANTE['r1'] - MIRANTE['r0'], MIRANTE['largura'], e)
    giro = -RUMO_DO_MIRANTE   # no Blender o ângulo do chão troca de sinal (y = -z)
    p.append(box(tam, G(cx, ALTO_DA_TORRE - e / 2, cz), 'deque', bevel=0.03, segs=1, rot=(0, 0, giro)))
    col.append(col_caixa('deque-subida', tam, G(cx, ALTO_DA_TORRE - e / 2, cz), (0, 0, giro)))
    # Mãos-francesas do mirante até a torre (embaixo do piso).
    for t in (-0.8, 0.8):
        vx, vz = -math.sin(RUMO_DO_MIRANTE), math.cos(RUMO_DO_MIRANTE)
        ux, uz = math.cos(RUMO_DO_MIRANTE), math.sin(RUMO_DO_MIRANTE)
        fora = (ux * 3.3 + vx * t, uz * 3.3 + vz * t)
        dentro = (ux * (raio(7.4) - 0.05) + vx * t * 0.6, uz * (raio(7.4) - 0.05) + vz * t * 0.6)
        p.append(tube([G(fora[0], ALTO_DA_TORRE - e - 0.02, fora[1]), G(dentro[0], 7.4, dentro[1])], [0.06, 0.06],
                      'dequeEscuro', seg=6))
    # Escada reta: dois montantes e os degraus, do chão até o deque 1 (e um palmo acima, de corrimão).
    ex, ez, lw = ESCADA['x'], ESCADA['z'], ESCADA['largura']
    h1 = DEQUES[0][4]
    base = chao_local(ex, ez)
    for dz in (-lw / 2, lw / 2):
        p.append(box((0.08, 0.08, h1 + 0.55 - base + 0.15), G(ex, (base - 0.15 + h1 + 0.55) / 2, ez + dz), 'tronco',
                     bevel=0.015, segs=1))
    n = int((h1 - base) / 0.3)
    for k in range(1, n + 1):
        y = base + (h1 - base) * k / (n + 1)
        p.append(cyl(0.03, lw - 0.04, G(ex, y, ez), 'troncoClaro', verts=6, rot=(R(90), 0, 0)))
    col.append(col_caixa('escada-reta', (0.14, lw, h1 - base), G(ex - 0.01, (h1 + base) / 2, ez)))
    # A viga do equilíbrio: um tronco redondo do deque 3 ao 4, com o alto 2 cm abaixo dos tampos
    # (as pontas entram nos deques sem ficar no plano deles). O colisor é o caminho, de 30 cm.
    vz_, vr = VIGA['z'], VIGA['raio']
    h3 = DEQUES[2][4]
    L = VIGA['x0'] - VIGA['x1']
    p.append(cyl(vr, L + 0.3, G((VIGA['x0'] + VIGA['x1']) / 2, h3 - 0.02 - vr, vz_), 'tronco', verts=10,
                 rot=(0, R(90), 0)))
    col.append(col_caixa('viga-subida', (L, 0.3, 0.2), G((VIGA['x0'] + VIGA['x1']) / 2, h3 - 0.1, vz_)))
    # Postes do andaime, enterrados 20 cm no chão e entrando no deque de cima.
    for x, z, ate in POSTES:
        b = chao_local(x, z) - 0.2
        topo = ate - 0.05
        p.append(cyl(0.11, topo - b, G(x, (topo + b) / 2, z), 'dequeEscuro', verts=8))
        alto = ate - ESPESSURA_DO_DEQUE - (b + 0.2)
        col.append(col_cilindro('poste-subida', 0.12, alto + 0.2, G(x, (b + ate - ESPESSURA_DO_DEQUE) / 2, z)))
    # Mãos-francesas dos deques 1 a 3 até a torre.
    for x0, x1, z0, z1, h in DEQUES[:3]:
        cx = (x0 + x1) / 2
        a = math.atan2(z1 - 0.3, cx)
        rr = raio(h - 1.4) - 0.05
        p.append(tube([G(cx, h - e - 0.02, z1 - 0.3), G(math.cos(a) * rr, h - 1.4, math.sin(a) * rr)], [0.05, 0.05],
                      'dequeEscuro', seg=6))
    return p


def ancoras_da_subida():
    def vazio(nome, x, y, z):
        o = bpy.data.objects.new(nome, None)
        o.location = G(x, y, z)
        o.empty_display_type = 'PLAIN_AXES'
        bpy.context.collection.objects.link(o)
        return o

    an = []
    lx, lz = LARGADA
    an.append(vazio('subida-farol-largada', lx, chao_local(lx, lz), lz))
    ex, ez = ESCADA['x'], ESCADA['z']
    h1 = DEQUES[0][4]
    an.append(vazio('escada-1-base', ex, chao_local(ex, ez), ez))
    an.append(vazio('escada-1-topo', ex, h1, ez))
    an.append(vazio('escada-1-saida', ex + 0.6, h1, ez))
    for i, (x, h, fora, za, zb) in enumerate(BORDAS):
        an.append(vazio(f'borda-{i + 1}-a', x, h, za))
        an.append(vazio(f'borda-{i + 1}-b', x, h, zb))
        an.append(vazio(f'borda-{i + 1}-fora', x + fora * 0.6, h, (za + zb) / 2))
    h3 = DEQUES[2][4]
    an.append(vazio('equilibrio-1-a', VIGA['x0'], h3, VIGA['z']))
    an.append(vazio('equilibrio-1-b', VIGA['x1'], h3, VIGA['z']))
    an.append(vazio('corrente-de-ar', CORRENTE['x'], DEQUES[3][4], CORRENTE['z']))
    an.append(vazio('corrente-de-ar-topo', CORRENTE['x'], CORRENTE['topo'], CORRENTE['z']))
    # Os pontos de volta: deques 1 a 4, o mirante e a varanda (no alto da torre, no vão do gradil).
    ux, uz = math.cos(RUMO_DO_MIRANTE), math.sin(RUMO_DO_MIRANTE)
    paradas = [(-3.0, h1, -2.0), (-0.6, DEQUES[1][4], -2.4), (1.4, h3, -2.0), (-4.6, DEQUES[3][4], -4.6),
               (ux * 2.6, ALTO_DA_TORRE, uz * 2.6), (ux * 1.35, ALTO_DA_TORRE, uz * 1.35)]
    for i, (x, y, z) in enumerate(paradas):
        an.append(vazio(f'subida-farol-{i + 1}', x, y, z))
    # Vagalumes: 0,2 acima do meio do corpo de quem passa (na escada, no deque 2, no 3, no meio da
    # viga e dentro da corrente de ar, a meio caminho do topo).
    meio = 0.9 + 0.2
    afasta = ESCADA['x'] - 0.47
    vag = [(afasta, chao_local(ex, ez) + 1.2 + meio, ez), (0.0, DEQUES[1][4] + meio, -2.6),
           (1.4, h3 + meio, -3.6), (-1.6, h3 + meio, VIGA['z']),
           (CORRENTE['x'], (DEQUES[3][4] + CORRENTE['topo']) / 2 + meio, CORRENTE['z'])]
    for i, (x, y, z) in enumerate(vag):
        an.append(vazio(f'vagalume-farol-{i + 1}', x, y, z))
    return an


def main():
    lib_q.reset()
    col = []
    porta = []
    escada_col = []
    andaime = subida(escada_col)
    # A lanterna colide: quem plana até a varanda pousa no anel em volta dela, nunca dentro do vidro.
    col.append(col_cilindro('lanterna-farol', 0.88, YL + 1.6 - Y1, (0, 0, (Y1 + YL + 1.6) / 2)))
    exportar('farol', {
        'farol': corpo(col, porta),
        'subida': andaime,
        'porta': (porta, dobradica()),
        'vidro': vidro(),
        'lampada': lampada(),
        'facho': (facho(), (0, 0, YL)),
    }, colisores=col + escada_col, ancoras=ancoras_da_subida(), filhos={'subida': 'farol'})


if __name__ == '__main__':
    main()
