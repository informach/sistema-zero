"""Bosque dos Bichos, versão completa (a casa da Capi e dos bichos para adotar).

Mesmo chão da versão leve (contorno, praia e barranco de `ilhas_anel.base`), com:
- quatro árvores grandes com deques ligados por pontes de corda (o percurso nas copas): começa na
  casa na árvore, que tem escada em espiral, e termina num escorregador;
- a cabana da Capi (consultório dos bichos), o cercadinho dos bichos para adotar, o lago com as
  vitórias-régias e os três cipós pendurados num galho comprido por cima do lago;
- toras, tocos, cogumelos, flores, moitas, pedras com musgo e as tocas dos bichos.

Saídas: `bosque.glb` (nós `terreno`, `agua`, `construcoes`, `vegetacao`, `cipo-1`…`cipo-3` com o pivô
no galho, as âncoras e os nós de colisão `col-*`) e `bosque-props.glb` (peças soltas para o jogo
repetir).

A colisão é feita à mão, em formas simples ao lado de cada peça que se pisa ou que segura (deques,
guarda-corpos, pontes, degraus, casa na árvore, escorregador, cabana, cercadinho, troncos, toras e
tocos), e o chão é uma cópia do tampo, da praia e do barranco. Moitas, pedras, cogumelos, tocas,
as floreiras da cabana e as pernas do escorregador também seguram o corpo (um cilindro ou caixa um
pouco menor que o desenho). Copas, raízes, flores, capim, taboas e vitórias-régias não colidem: o
personagem passa por eles sem tropeçar.
"""
from lib_ilhas import *

SEMENTE = 1.0 * 1.7 * 2  # a mesma da versão leve

# Árvores do percurso: (x, z, escala, variante, altura do deque, raio do deque)
T1 = (-2.0, -3.0, 1.35, 'a', 4.0, 2.9)   # casa na árvore (começo)
# Os deques têm folga para contornar o tronco (o anel livre fica com mais de 1 de largura).
T2 = (-7.2, -6.2, 1.4, 'b', 4.4, 2.0)
T3 = (-8.6, 1.6, 1.4, 'a', 4.8, 2.1)
T4 = (-4.0, 6.6, 1.65, 'c', 4.2, 2.0)    # escorregador (fim)
PERCURSO = [T1, T2, T3, T4]
T6 = (8.6, 5.2)                          # a árvore do galho dos cipós
LAGO = (4.4, 5.6)
# O galho comprido (x, z do jogo, altura acima do chão) e os x onde cada cipó se pendura.
GALHO = [(8.2, 5.2, 5.0), (6.6, 5.35, 5.55), (3.8, 6.1, 5.75), (2.6, 6.4, 5.65)]
CIPOS_X = (7.1, 5.6, 4.1)


def no_galho(x):
    """(x, z, altura) do galho na posição x (interpola entre os pontos do galho)."""
    for (x0, z0, h0), (x1, z1, h1) in zip(GALHO, GALHO[1:]):
        if x1 <= x <= x0:
            t = (x0 - x) / (x0 - x1)
            return x, z0 + (z1 - z0) * t, h0 + (h1 - h0) * t
    raise ValueError(x)


CIPOS = [no_galho(x) for x in CIPOS_X]
CABANA = (6.6, -6.4)
# O tronco caído do equilíbrio (controlador universal, parte 6): estreito e baixo (sobe-se pela
# ponta andando), ao lado da trilha do lago. As pontas (x, z do jogo) e o raio; o jogo lê o eixo das
# âncoras `equilibrio-1-a` e `equilibrio-1-b`, no tampo, no meio do tronco.
TRONCO_CAIDO = ((3.3, 1.3), (3.7, 4.0), 0.19)
# A escada reta (modo escada) do chão até o deque da T4, onde começa o escorregador: no ângulo
# (chão do Blender) longe da ponte e do escorregador. O jogo lê `escada-1-base`, `-topo` (o eixo na
# frente dos degraus) e `-saida` (no deque).
ESCADA_RETA = {'angulo': R(60), 'largura': 0.6, 'degrau': 0.3}
ESCADA_GIRO0 = R(-64)   # ângulo (no chão do Blender) do primeiro degrau da escada da T1
CERCADO = (2.4, -9.2)


# ------------------------------------------------------------------ colisão dos enfeites
# Medidas por escala, um pouco menores que o desenho: o corpo encosta e não atravessa.
MOITA_COL = (0.65, 0.75)     # raio e altura da moita (a folhagem vai a ~0,9 de raio)
PEDRA_COL = (0.58, 0.85)     # raio e altura da pedra (antes de tirar o pé enterrado)
COGUMELO_COL = (0.25, 0.55)  # raio e altura do cogumelo (chapéu de 0,3 a ~0,55)
# O personagem sobe sozinho até uns 0,58 (degrau de 0,45 mais a curva do pé): a moita passa disto
# e o corpo para nela. As pedras da beira do lago ficam abaixo: ele sobe nelas e chega aos cipós
# por qualquer lado.
PEDRA_DO_LAGO_ALTA = 0.4


def col_no_tampo(col, base, x, z, r, alto, fundo=0.1):
    """Cilindro em pé no tampo em (x, z) do jogo: de `fundo` abaixo dele até `alto` acima."""
    col.append(col_cilindro(base, r, alto + fundo, (x, -z, TOPO + (alto - fundo) / 2)))


def col_pedra(col, base, x, z, s, teto=None):
    alto = PEDRA_COL[1] * s - 0.2  # a pedra afunda 0,12 e o topo é arredondado
    col_no_tampo(col, base, x, z, PEDRA_COL[0] * s, alto if teto is None else min(teto, alto))


def tronco_r(t):
    return {'a': 0.75, 'b': 0.6, 'c': 0.55}[t[3]] * t[2]


def angulo(a, b):
    """Ângulo no chão do Blender de a para b (árvores do jogo)."""
    return olhar_para(a[0], a[1], b[0], b[1])


def borda(t, ang):
    return (t[0] + math.cos(ang) * t[5], -t[1] + math.sin(ang) * t[5], TOPO + t[4])


# ------------------------------------------------------------------ percurso nas copas
def casa_na_arvore(col, telhado):
    """A casa na árvore no deque da T1 e a escada em espiral. O telhado e a bandeirinha vão para
    `telhado` (nó que o jogo esmaece quando tapa a câmera). Devolve (objetos, ângulo em que a escada
    chega no deque)."""
    x, z, s, _, h, r = T1
    bx, by = x, -z
    zt = TOPO + h
    p = []
    # A casinha fica de um lado do deque (o tronco passa ao lado, não por dentro).
    lado = R(200)
    cx, cy = bx + math.cos(lado) * 1.85, by + math.sin(lado) * 1.85
    giro_casa = lado
    caixa = box((1.9, 2.4, 2.0), (cx, cy, zt + 1.0), 'casaArvore', bevel=0.08, segs=1, rot=(0, 0, giro_casa))
    p.append(caixa)
    # A porta dá para o tronco (enfeite): a casa colide como uma caixa fechada.
    col.append(col_caixa('casa-na-arvore', (1.9, 2.4, 2.0), (cx, cy, zt + 1.0), (0, 0, giro_casa)))
    # Tábuas na parede (frisos horizontais).
    for k in range(4):
        p.append(box((1.96, 2.46, 0.05), (cx, cy, zt + 0.35 + k * 0.45), 'troncoClaro', bevel=0.0,
                     rot=(0, 0, giro_casa)))
    telhado.append(cone(1.95, 1.2, (cx, cy, zt + 2.6), 'telhadoArvore', verts=4, rot=(0, 0, giro_casa + R(45))))
    telhado.append(uvball(0.14, (cx, cy, zt + 3.25), 'casaArvore', seg=8, ring=5))
    # Porta virada para o tronco (o deque) e janela redonda para fora.
    dentro = giro_casa + math.pi
    px, py = cx + math.cos(dentro) * 0.97, cy + math.sin(dentro) * 0.97
    p += porta(px, py, zt, 0.9, 1.6, dentro, m='tronco', m_batente='troncoClaro')
    fx, fy = cx + math.cos(giro_casa) * 0.98, cy + math.sin(giro_casa) * 0.98
    p.append(torus(0.32, 0.07, (fx, fy, zt + 1.25), 'troncoClaro', seg=12, rseg=4, rot=(R(90), 0, giro_casa + R(90))))
    p.append(cyl(0.3, 0.05, (fx, fy, zt + 1.25), 'vidroJanela', verts=12, rot=(R(90), 0, giro_casa + R(90))))
    for lado2 in (-1, 1):
        a2 = giro_casa + lado2 * math.pi / 2
        p += janela(cx + math.cos(a2) * 1.22, cy + math.sin(a2) * 1.22, zt + 1.15, 0.5, 0.5, a2,
                    m_moldura='troncoClaro')
    # Bandeirinha no telhado e balde na roldana até o chão.
    telhado.append(cyl(0.03, 0.9, (cx, cy, zt + 3.65), 'poste', verts=5))
    telhado.append(prism([(0, 0), (0.55, -0.15), (0, -0.3)], 0.02, (cx + 0.02, cy, zt + 4.05), 'telhadoArvore'))
    braco = R(250)  # entre a casa e o pé da escada
    rx, ry = bx + math.cos(braco) * (r + 0.4), by + math.sin(braco) * (r + 0.4)
    p.append(tube([(bx + math.cos(braco) * 0.9, by + math.sin(braco) * 0.9, zt + 1.6), (rx, ry, zt + 1.6)],
                  [0.07, 0.06], 'poste', seg=5))
    p.append(torus(0.12, 0.03, (rx, ry, zt + 1.5), 'metalEscuro', seg=10, rseg=4, rot=(R(90), 0, braco)))
    p.append(tube([(rx, ry, zt + 1.45), (rx, ry, TOPO + 1.0)], [0.015, 0.015], 'corda', seg=4, cap=False))
    p.append(cyl(0.22, 0.32, (rx, ry, TOPO + 0.85), 'metalEscuro', verts=10, r2=0.17))
    # Escada em espiral do chão até a borda do deque, do lado da trilha.
    # A escada sobe pelo lado de fora da clareira e chega no deque longe da casa e da ponte (a 38° da
    # ponte para a T2): quem chega tem o anel do deque inteiro para contornar o tronco.
    degraus, chegada = escada_espiral(x, z, 0.0, h, tronco_r(T1), raio=r + 0.55, giro0=ESCADA_GIRO0, sentido=1,
                                      col=col)
    p += degraus
    return p, chegada


def escorregador(col):
    """Escorregador do deque da T4 até o chão: calha com duas laterais, curva no fim."""
    x, z, s, _, h, r = T4
    ang = R(-28)  # no chão do Blender: para o +x e um pouco para −y (o jogo: +x, +z)
    ini = Vector((x + math.cos(ang) * (r - 0.1), -z + math.sin(ang) * (r - 0.1), TOPO + h))
    L = 5.6
    p = []
    n = 12
    pts = []
    for i in range(n + 1):
        t = i / n
        hh = h * (1 - (3 * t * t - 2 * t * t * t))
        pts.append(Vector((ini.x + math.cos(ang) * L * t, ini.y + math.sin(ang) * L * t, TOPO + 0.15 + (hh - 0.15) * (1 - t * 0.0))))
    pts[-1].z = TOPO + 0.2
    for i in range(n):
        a, b = pts[i], pts[i + 1]
        d = b - a
        comp = d.length
        incl = math.atan2(d.z, math.hypot(d.x, d.y))
        meio = (a + b) / 2
        p.append(box((comp + 0.04, 1.0, 0.08), meio, 'toldoAzul', bevel=0.0, rot=(0, -incl, ang)))
        col.append(col_caixa('escorregador', (comp + 0.06, 1.0, 0.08), meio, (0, -incl, ang)))
        for lado in (-1, 1):
            ox, oy = -math.sin(ang) * 0.52 * lado, math.cos(ang) * 0.52 * lado
            p.append(box((comp + 0.04, 0.08, 0.4), (meio.x + ox, meio.y + oy, meio.z + 0.18), 'toldoAmarelo',
                         bevel=0.0, rot=(0, -incl, ang)))
            col.append(col_caixa('escorregador-lado', (comp + 0.06, 0.08, 0.4), (meio.x + ox, meio.y + oy, meio.z + 0.18),
                                 (0, -incl, ang)))
        if i % 3 == 1 and meio.z > TOPO + 0.6:
            for lado in (-1, 1):
                ox, oy = -math.sin(ang) * 0.4 * lado, math.cos(ang) * 0.4 * lado
                hp = meio.z - TOPO
                p.append(cyl(0.07, hp, (meio.x + ox, meio.y + oy, TOPO + hp / 2), 'poste', verts=6))
                col.append(col_cilindro('perna-escorregador', 0.08, hp, (meio.x + ox, meio.y + oy, TOPO + hp / 2)))
    return p, pts


# ------------------------------------------------------------------ cabana da Capi
def cabana(col):
    """Cabana de toras (consultório dos bichos), montada na origem de frente para −Y. A porta é
    fechada: a cabana colide como uma caixa (até o beiral), mais a varanda, os postes, o barril e o
    caixote."""
    W, D, H = 4.0, 3.4, 2.4
    p = []
    col.append(col_caixa('cabana', (W + 0.34, D + 0.34, H + 0.1), (0, 0, TOPO + (H + 0.1) / 2)))
    col.append(col_caixa('varanda', (W + 0.4, 1.3, 0.2), (0, -D / 2 - 0.65, TOPO + 0.1)))
    for sx in (-1, 1):
        col.append(col_cilindro('poste', 0.09, 2.3, (sx * (W / 2 - 0.1), -D / 2 - 1.15, TOPO + 1.25)))
    col.append(col_cilindro('barril', 0.38, 0.85, (-W / 2 - 0.6, -D / 2 + 0.3, TOPO + 0.43)))
    col.append(col_caixa('caixote', (0.6, 0.6, 0.6), (W / 2 + 0.6, -D / 2 + 0.2, TOPO + 0.3)))
    rlog = 0.17
    n = int(H / (rlog * 1.9))
    for k in range(n):
        zc = TOPO + rlog + k * rlog * 1.9
        # Paredes do fundo e dos lados inteiras; a da frente com o vão da porta (1,2 de largura).
        p.append(cyl(rlog, W + 0.4, (0, D / 2, zc), 'cabana' if k % 2 else 'cabanaEscura', verts=8,
                     rot=(0, R(90), 0)))
        for sx in (-1, 1):
            p.append(cyl(rlog, D + 0.4, (sx * W / 2, 0, zc + rlog * 0.95), 'cabanaEscura' if k % 2 else 'cabana',
                         verts=8, rot=(R(90), 0, 0)))
        if zc - TOPO < 2.3:
            seg = (W + 0.4 - 1.3) / 2
            for sx in (-1, 1):
                p.append(cyl(rlog, seg, (sx * (0.65 + seg / 2), -D / 2, zc), 'cabana' if k % 2 else 'cabanaEscura',
                             verts=8, rot=(0, R(90), 0)))
        else:
            p.append(cyl(rlog, W + 0.4, (0, -D / 2, zc), 'cabana' if k % 2 else 'cabanaEscura', verts=8,
                         rot=(0, R(90), 0)))
    # Pontas das toras nos cantos (anéis claros).
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl(0.19, H, (sx * W / 2, sy * D / 2, TOPO + H / 2), 'toraAnel', verts=8))
    # Empena e telhado de duas águas.
    p.append(prism([(-W / 2 - 0.2, 0), (W / 2 + 0.2, 0), (0, 1.3)], D - 0.1, (0, D / 2 - 0.05 - (D - 0.1) / 2, TOPO + H),
                   'cabana'))
    for sx in (-1, 1):
        p.append(box((W / 2 + 0.75, D + 1.0, 0.16), (sx * (W / 4 + 0.12), 0, TOPO + H + 0.65), 'telhaMusgo', bevel=0.04,
                     segs=1, rot=(0, sx * math.atan2(1.3, W / 2 + 0.2), 0)))
    p.append(box((0.24, D + 1.05, 0.24), (0, 0, TOPO + H + 1.33), 'cabanaEscura', bevel=0.04, segs=1))
    # Chaminé de pedra.
    p.append(box((0.6, 0.6, 1.7), (W / 2 - 0.7, D / 2 - 0.5, TOPO + H + 1.0), 'pedra', bevel=0.08, segs=1))
    p.append(box((0.75, 0.75, 0.16), (W / 2 - 0.7, D / 2 - 0.5, TOPO + H + 1.9), 'pedraEscura', bevel=0.04, segs=1))
    # Porta e janelas.
    p += porta(0, -D / 2 - 0.12, TOPO, 1.2, 2.2, -math.pi / 2, m='portaNova', m_batente='cabanaEscura')
    for sx in (-1, 1):
        p += janela(sx * (W / 2 + 0.18), 0, TOPO + 1.4, 0.75, 0.65, 0 if sx > 0 else math.pi, m_moldura='placaBranca')
        p.append(box((0.3, 0.9, 0.22), (sx * (W / 2 + 0.38), 0, TOPO + 0.95), 'floreira', bevel=0.03, segs=1))
        col.append(col_caixa('floreira', (0.3, 0.9, 0.22), (sx * (W / 2 + 0.38), 0, TOPO + 0.95)))
        for k in range(3):
            p += flor((sx * (W / 2 + 0.38), -0.3 + k * 0.3, TOPO + 1.02), ['petalaRosa', 'petalaAmarela', 'petalaLilas'][k],
                      seed=k + (5 if sx > 0 else 0), r=0.13, haste=0.12)
    # Varandinha com degrau e o toldinho de tábuas.
    p.append(box((W + 0.4, 1.3, 0.2), (0, -D / 2 - 0.65, TOPO + 0.1), 'deque', bevel=0.03, segs=1))
    for k in range(5):
        p.append(box((0.04, 1.28, 0.03), (-W / 2 + 0.2 + k * (W / 4), -D / 2 - 0.65, TOPO + 0.205), 'dequeEscuro', bevel=0.0))
    for sx in (-1, 1):
        p.append(cyl(0.09, 2.3, (sx * (W / 2 - 0.1), -D / 2 - 1.15, TOPO + 1.25), 'cabanaEscura', verts=6))
    p.append(box((W + 0.4, 1.5, 0.1), (0, -D / 2 - 0.7, TOPO + 2.45), 'telhaMusgo', bevel=0.03, segs=1, rot=(R(-10), 0, 0)))
    # Placa do consultório: cruz verde num círculo branco, em cima da porta.
    p.append(cyl(0.42, 0.06, (0, -D / 2 - 0.22, TOPO + 2.55), 'placaBranca', verts=16, rot=(R(90), 0, 0)))
    p.append(box((0.42, 0.08, 0.13), (0, -D / 2 - 0.27, TOPO + 2.55), 'cruzVerde', bevel=0.0))
    p.append(box((0.13, 0.08, 0.42), (0, -D / 2 - 0.27, TOPO + 2.55), 'cruzVerde', bevel=0.0))
    # Barril de água e caixote de cenoura do lado.
    p.append(cyl(0.38, 0.85, (-W / 2 - 0.6, -D / 2 + 0.3, TOPO + 0.43), 'cabana', verts=12, r2=0.34))
    for zz in (0.18, 0.68):
        p.append(torus(0.385, 0.03, (-W / 2 - 0.6, -D / 2 + 0.3, TOPO + zz), 'metalEscuro', seg=12, rseg=3))
    p += caixote(W / 2 + 0.6, -D / 2 + 0.2, s=0.6, m='cabana')
    for k in range(4):
        p.append(cone(0.07, 0.35, (W / 2 + 0.45 + (k % 2) * 0.25, -D / 2 + 0.05 + (k // 2) * 0.25, TOPO + 0.68), 'orange',
                      verts=6, rot=(R(180), 0, 0)))
    return p


def cercadinho(col):
    """Cercadinho dos bichos para adotar (montado na origem, porteira para −Y)."""
    p = []
    w, d = 3.6, 2.8
    # A cerca usa (x, z) do jogo: na origem, z = +d/2 vira y = −d/2 do Blender (a porteira, na frente).
    p += cerca([(-w / 2, d / 2), (-0.6, d / 2)], h=0.75, col=col)
    p += cerca([(0.6, d / 2), (w / 2, d / 2), (w / 2, -d / 2), (-w / 2, -d / 2), (-w / 2, d / 2)], h=0.75, col=col)
    col.append(col_caixa('casinha', (1.0, 0.9, 0.7), (-1.0, -0.6, TOPO + 0.35)))
    col.append(col_caixa('cocho', (1.1, 0.4, 0.3), (0.9, -0.8, TOPO + 0.3)))
    col.append(col_cilindro('feno', 0.38, 0.75, (-1.2, 0.8, TOPO + 0.38), (0, R(90), 0)))
    p.append(mancha(0, 0, w / 2 - 0.1, d / 2 - 0.1, 'palha', seed=3, z0=TOPO - 0.02, z1=TOPO + 0.02))
    # Casinha de bicho, cocho e potinhos.
    p.append(box((1.0, 0.9, 0.7), (-1.0, -0.6, TOPO + 0.35), 'casaArvore', bevel=0.05, segs=1))
    p.append(cone(0.85, 0.55, (-1.0, -0.6, TOPO + 0.97), 'telhadoArvore', verts=4, rot=(0, 0, R(45))))
    p.append(cyl(0.25, 0.04, (-1.0, -0.6 - 0.46, TOPO + 0.32), 'black', verts=12, rot=(R(90), 0, 0)))
    p.append(box((1.1, 0.4, 0.3), (0.9, -0.8, TOPO + 0.3), 'cabana', bevel=0.04, segs=1))
    p.append(box((1.0, 0.3, 0.06), (0.9, -0.8, TOPO + 0.44), 'palha', bevel=0.0))
    for k, c in enumerate(('toldoAzul', 'toldoRosa')):
        p.append(cyl(0.2, 0.1, (0.6 + k * 0.5, 0.75, TOPO + 0.05), c, verts=12, r2=0.16))
    p.append(cyl(0.16, 0.03, (0.6, 0.75, TOPO + 0.1), 'lagoBosque', verts=12))
    # Fardo de feno.
    p.append(cyl(0.38, 0.75, (-1.2, 0.8, TOPO + 0.38), 'palha', verts=12, rot=(0, R(90), 0)))
    return p


# ------------------------------------------------------------------ lago e cipós
# Do eixo do tronco de escalar até o centro de uma pedra: raio da casca (0,86), o corpo agarrado
# (0,08 de folga e 0,35 de raio, dos dois lados do centro dele) e a pedra (até 0,41).
LONGE_DO_TRONCO_DE_ESCALAR = 0.86 + 0.08 + 0.35 * 2 + 0.41


def lago(col):
    x, z = LAGO
    agua = [mancha(x, z, 2.2, 1.5, 'lagoBosque', seed=7, z0=TOPO - 0.03, z1=TOPO + 0.04, n=28, wob=0.07)]
    borda_ = [mancha(x, z, 2.55, 1.85, 'areiaMolhada', seed=7, z0=TOPO - 0.03, z1=TOPO + 0.02, n=28, wob=0.07)]
    rnd = random.Random(11)
    enfeite = []
    for k in range(9):
        a = 2 * math.pi * k / 9 + rnd.uniform(-0.2, 0.2)
        s = 0.45 + rnd.uniform(0, 0.25)
        px, pz = x + math.cos(a) * 2.5, z + math.sin(a) * 1.85
        # Nenhuma pedra no pé do tronco de escalar (T6): quem dá a volta nele, lá embaixo, passaria
        # por dentro dela (`LONGE_DO_TRONCO_DE_ESCALAR` = casca, corpo e a pedra).
        if math.hypot(px - T6[0], pz - T6[1]) < LONGE_DO_TRONCO_DE_ESCALAR:
            continue
        enfeite += pedra(px, pz, s, 'pedraClara', seed=40 + k, top_m='musgo' if k % 3 == 0 else None)
        col_pedra(col, 'pedra-lago', px, pz, s, teto=PEDRA_DO_LAGO_ALTA)
    for k, (dx, dz) in enumerate(((-0.8, -0.3), (0.6, 0.4), (1.2, -0.5), (-0.2, 0.7))):
        bx, by = x + dx, -z - dz
        o = cyl(0.36, 0.03, (bx, by, TOPO + 0.06), 'vitoriaRegia', verts=12)
        enfeite.append(o)
        if k % 2 == 0:
            enfeite += flor((bx + 0.08, by, TOPO + 0.06), 'petalaRosa', seed=60 + k, r=0.14, haste=0.05)
    # Taboas na beira.
    for k in range(6):
        a = R(150) + k * 0.18
        bx, by = x + math.cos(a) * 2.3, -z + math.sin(a) * 1.6
        hh = 1.0 + (k % 3) * 0.2
        enfeite.append(cyl(0.025, hh, (bx, by, TOPO + hh / 2), 'caule', verts=4))
        enfeite.append(cyl(0.06, 0.28, (bx, by, TOPO + hh - 0.1), 'tronco', verts=6))
    return borda_, agua, enfeite


# O lago tem fundo (física viva, etapa 2): uma bacia na colisão do chão, para a água ter onde boiar
# e a criança nadar. Só na colisão: a água do desenho é opaca e cobre o fundo. Funda no meio
# (`FUNDO_DO_LAGO`, a cintura da criança passa da linha da água) e com rampa até debaixo da areia
# molhada da beira (até uns 43°; o personagem sobe 52°). Raios em fração dos raios da água.
FUNDO_DO_LAGO = 0.85
# O tronco que boia nele: comprimento e raio (`tora-que-boia` em bosque-props.glb).
TORA_QUE_BOIA = (1.6, 0.16)
RAIOS_DO_LAGO = (2.2, 1.5)
BACIA_PLANA, BACIA_FIM = 0.35, 1.25


def fundo_da_bacia(t):
    """Profundidade da bacia (abaixo do tampo) a `t` raios do meio do lago."""
    if t <= BACIA_PLANA:
        return FUNDO_DO_LAGO
    if t >= BACIA_FIM:
        return 0.0
    s = (t - BACIA_PLANA) / (BACIA_FIM - BACIA_PLANA)
    return FUNDO_DO_LAGO * (1 - s * s * (3 - 2 * s))


def bacia(chao_col, voltas=36, aneis=12):
    """Cava a bacia no `col-terreno`: boolean exato com um molde fechado (o fundo em anéis, a
    parede e a tampa acima do tampo). O anel de fora fica um pouco acima do tampo, para o corte
    nunca ficar rente à face de cima."""
    x, z = LAGO
    rx, rz = RAIOS_DO_LAGO
    bm = bmesh.new()
    meio = bm.verts.new(P(x, z, TOPO - FUNDO_DO_LAGO))
    aneis_v = []
    for i in range(1, aneis + 1):
        t = BACIA_FIM * i / aneis
        y = TOPO + 0.05 if i == aneis else TOPO - fundo_da_bacia(t)
        aneis_v.append([bm.verts.new(P(x + math.cos(2 * math.pi * k / voltas) * rx * t,
                                       z + math.sin(2 * math.pi * k / voltas) * rz * t, y))
                        for k in range(voltas)])
    tampa = [bm.verts.new((v.co.x, v.co.y, TOPO + 0.4)) for v in aneis_v[-1]]
    for k in range(voltas):
        k2 = (k + 1) % voltas
        bm.faces.new((meio, aneis_v[0][k2], aneis_v[0][k]))
        for a, b in zip(aneis_v, aneis_v[1:]):
            bm.faces.new((a[k], a[k2], b[k2], b[k]))
        bm.faces.new((aneis_v[-1][k], aneis_v[-1][k2], tampa[k2], tampa[k]))
    bm.faces.new(tampa)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('molde-bacia')
    bm.to_mesh(me)
    bm.free()
    molde = bpy.data.objects.new('molde-bacia', me)
    bpy.context.collection.objects.link(molde)
    m = chao_col.modifiers.new('bacia', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.solver = 'EXACT'
    m.use_hole_tolerant = True
    m.object = molde
    bpy.context.view_layer.objects.active = chao_col
    bpy.ops.object.select_all(action='DESELECT')
    chao_col.select_set(True)
    bpy.ops.object.modifier_apply(modifier='bacia')
    bpy.data.objects.remove(molde, do_unlink=True)
    chao_col.data.materials.clear()


def galho_dos_cipos(col, copas, troncos):
    """A árvore do galho comprido e o galho que passa por cima do lago (as folhas do galho entram na
    copa da mesma árvore)."""
    x, z = T6
    copa, tronco = [], []
    copas.append(copa)
    troncos.append(tronco)
    p = arvore_grande(x, z, 1.05, 'a', seed=6, col=col, copa=copa, tronco=tronco)
    pts = [(gx, -gz, TOPO + gh) for gx, gz, gh in GALHO]
    p.append(tube(pts, [0.42, 0.3, 0.22, 0.14], 'troncoGrande', seg=8))
    for k, (cx, cz, ch) in enumerate(CIPOS + [no_galho(3.0)]):
        copa.append(superellipsoid((1.4, 1.2, 0.8), (cx + 0.2, -cz, TOPO + ch + 0.45), 'copa' if k % 2 else 'copaEscura',
                                   e1=0.8, e2=0.9, seg=8, ring=5))
    return p


def cipo(i):
    """Um cipó pendurado (pivô no galho): a corda verde com folhinhas e uma alça no fim."""
    cx, cz, ch = CIPOS[i]
    topo = Vector((cx, -cz, TOPO + ch - 0.12))
    comp = 4.2
    rnd = random.Random(70 + i)
    pts = []
    for k in range(9):
        t = k / 8
        pts.append((topo.x + math.sin(t * 5 + i) * 0.06, topo.y + math.cos(t * 4 + i) * 0.06, topo.z - comp * t))
    p = [tube(pts, [0.06] * 9, 'cipo', seg=6)]
    for k in range(7):
        t = 0.08 + k * 0.12
        c = (topo.x, topo.y, topo.z - comp * t)
        p.append(leaf(c, rnd.uniform(0, 2 * math.pi), 0.35, 0.12, 'folhaCipo', lift=0.05, droop=0.12, fold=0.2, n=4))
    p.append(torus(0.16, 0.05, (topo.x, topo.y, topo.z - comp - 0.1), 'cipo', seg=10, rseg=4, rot=(R(90), 0, 0)))
    return p, tuple(topo)


# ------------------------------------------------------------------ vegetação de enfeite
def vegetacao(col, copas, troncos):
    """A vegetação de enfeite. A copa de cada árvore vai para uma lista própria em `copas` (um nó
    `copa-*` por árvore, para o jogo esmaecer só a que tapa a câmera)."""
    p = []
    for t in PERCURSO:
        copa, tronco = [], []
        copas.append(copa)
        troncos.append(tronco)
        p += arvore_grande(t[0], t[1], t[2], t[3], seed=int(abs(t[0] * 7 + t[1] * 3)), col=col, copa=copa,
                           tronco=tronco)
    for i, (x, z, s, c) in enumerate([(9.6, -4.4, 0.9, 'copa'), (-10.4, -4.8, 0.85, 'copaFunda'), (-6.8, 9.6, 0.8, 'copa'),
                                      (-1.4, -10.4, 0.85, 'copaEscura'), (5.4, -10.0, 0.75, 'copaFunda'),
                                      (-10.4, 5.4, 0.8, 'copaEscura')]):
        copa = []
        copas.append(copa)
        p += arvore_media(x, z, s, c, seed=90 + i, col=col, folhas=copa)
    for i, (x, z) in enumerate(((4.2, -10.8), (-4.0, -8.8), (-11.0, 1.4), (8.6, -8.6), (3.6, 9.6), (-7.0, 9.6),
                                (0.6, -6.2), (-5.4, 0.4))):
        s = 0.9 + (i % 3) * 0.15
        p += moita(x, z, s, seed=i)
        col_no_tampo(col, 'moita', x, z, MOITA_COL[0] * s, MOITA_COL[1] * s)
    p += tora(1.6, -5.6, 2.4, R(25), col=col)
    p += tora(-1.6, 10.3, 2.0, R(75), r=0.28, col=col)
    p += tora(-10.4, -2.0, 1.8, R(10), r=0.26, col=col)
    for x, z in ((3.8, -3.6), (-5.8, -2.6), (2.0, 7.0)):
        p += toco(x, z, col=col)
    for i, (x, z) in enumerate(((-3.2, 2.2), (-6.0, -8.4), (0.4, 4.4), (-9.6, 4.0), (6.8, 2.8 + 0.6), (-2.4, -6.6))):
        for k in range(3):
            cx, cz, s = x + k * 0.35, z + (k % 2) * 0.3, 0.8 + 0.2 * k
            p += cogumelo(cx, cz, s)
            col_no_tampo(col, 'cogumelo', cx, cz, COGUMELO_COL[0] * s, COGUMELO_COL[1] * s)
    for i, (x, z, r, n) in enumerate(((0.0, 1.8, 2.2, 14), (-5.6, 3.2, 1.6, 8), (4.6, -2.8 - 0.4, 1.0, 6),
                                      (-1.0, -7.6, 1.6, 8), (7.8, 9.0 - 1.2, 1.2, 6), (-8.6, -8.2, 1.2, 6),
                                      (9.8, -6.4, 1.0, 5))):
        p += flores(x, z, r, n, seed=100 + i)
    for i, (x, z, r, n) in enumerate(((2.0, 3.0, 3.0, 14), (-6.0, -4.0, 3.0, 12), (-3.0, 9.0, 2.0, 8),
                                      (5.6, -8.4, 1.6, 6), (-10.0, -0.6, 1.4, 6), (9.0, 8.6 - 1.4, 1.2, 4))):
        p += tufos(x, z, r, n, seed=200 + i)
    # A primeira pedra fica longe do tronco de escalar (`TRONCO_DOS_CIPOS`): quem dá a volta nele
    # passaria por dentro dela.
    for i, (x, z, s) in enumerate(((11.0, 3.9, 0.7), (-11.2, -3.2, 0.8), (6.0, 9.4, 0.6), (-3.6, 11.0, 0.7),
                                   (10.4, -6.4, 0.75))):
        p += pedra(x, z, s, 'pedra', seed=300 + i, top_m='musgo')
        col_pedra(col, 'pedra', x, z, s)
    # Tocas dos bichos (montinho de terra com a entrada escura).
    for x, z in ((-8.0, -10.0 + 2.0), (8.4, -2.8 - 0.6)):
        p.append(uvball(0.8, (x, -z, TOPO - 0.2), 'terraIlha', seg=10, ring=5, scale=(1, 1, 0.72)))
        p.append(cyl(0.34, 0.12, (x, -z - 0.56, TOPO + 0.22), 'black', verts=10, rot=(R(80), 0, 0)))
        # O montinho (0,38 de alto) vira um degrau baixo: o personagem sobe nele em vez de afundar.
        col_no_tampo(col, 'toca', x, z, 0.6, 0.3)
    return p


def terreno(col):
    base = anel.base(SEMENTE)
    # O chão que se pisa: tampo, praia e barranco (as trilhas e manchas, milímetros acima, só desenham).
    col.append(col_terreno(base))
    bacia(col[-1])
    p = list(base)
    # Clareira mais clara no meio e as trilhas de terra.
    p.append(mancha(0.6, 0.6, 3.6, 3.0, 'gramaClara', seed=5, z0=TOPO - 0.02, z1=TOPO + 0.012))
    p.append(trilha([(12.4, 0.0), (9.0, 0.0), (6.0, 0.1), (3.4, 0.5), (1.4, 0.4)], 0.95))
    p.append(trilha([(1.6, 0.3), (0.6, 0.2), (-0.3, 0.1)], 0.65))    # até a escada
    p.append(trilha([(3.6, 0.3), (4.8, -2.0), (5.6, -3.8), (6.0, -4.6)], 0.65))    # cabana
    p.append(trilha([(2.6, 0.0), (2.2, -3.0), (2.4, -6.0), (2.4, -7.6)], 0.6))     # cercadinho
    p.append(trilha([(2.4, 0.6), (2.6, 2.4), (2.4, 3.6)], 0.6))                    # lago
    p.append(trilha([(0.8, 0.8), (-1.6, 2.6), (-3.0, 3.6)], 0.55))                 # debaixo das copas
    return p


ALVO_CABANA = (2.0, -1.0)

# Onde cada bicho se esconde (x, z do jogo, giro): cachorro atrás da moita-6, gato entre os cogumelos e
# as pedras do lago, coelho na toca-1, porquinho atrás da cabana. O giro é para onde o bicho olha,
# (sen g, cos g) no chão do jogo; vai no giro em Z do empty, que o glTF leva para o giro em Y do jogo
# com o mesmo sinal. As medidas são as de `ESCONDERIJOS_NO_MODELO` (src/mundo/bosque.ts), e
# tests/esconde-no-bosque.test.ts confere que as duas batem.
ESCONDERIJOS = [(-6.2, 10.2, -2.21), (1.2, 5.4, -2.65), (-8.0, -7.4, 0.0), (7.3, -8.9, 1.34)]


def frente_da_cabana(d):
    dx, dz = ALVO_CABANA[0] - CABANA[0], ALVO_CABANA[1] - CABANA[1]
    n = math.hypot(dx, dz)
    return CABANA[0] + dx / n * d, CABANA[1] + dz / n * d


def tronco_caido(col):
    """O tronco caído do equilíbrio: uma tora fina deitada ao longo das pontas de `TRONCO_CAIDO`."""
    (x0, z0), (x1, z1), r = TRONCO_CAIDO
    comp = math.hypot(x1 - x0, z1 - z0)
    # A tora deita ao longo de (−sen rot, cos rot) no chão do Blender (y = −z do jogo).
    rot = math.atan2(-(x1 - x0), -(z1 - z0))
    return tora((x0 + x1) / 2, (z0 + z1) / 2, comp, rot, r=r, col=col)


def escada_reta(col):
    """Escada de mão encostada na borda do deque da T4: dois montantes e degraus, com a parte de
    cima passando do deque (para segurar ao sair). Colide como uma tábua fina (só segura o corpo)."""
    t, e = T4, ESCADA_RETA
    a, r, h = e['angulo'], t[5] + 0.06, t[4]
    rx, ry = math.cos(a), math.sin(a)          # para fora do deque (chão do Blender)
    tx, ty = -math.sin(a), math.cos(a)         # de lado, ao longo dos degraus
    bx, by = t[0] + rx * r, -t[1] + ry * r
    alto = h + 0.9
    p = []
    for lado in (-1, 1):
        x, y = bx + tx * lado * e['largura'] / 2, by + ty * lado * e['largura'] / 2
        p.append(box((0.07, 0.07, alto), (x, y, TOPO + alto / 2), 'poste', bevel=0.01, rot=(0, 0, a)))
    n = int(h / e['degrau'])
    for k in range(1, n + 1):
        p.append(cyl(0.03, e['largura'], (bx, by, TOPO + k * e['degrau']), 'tabua', verts=6, rot=(R(90), 0, a)))
    col.append(col_caixa('escada-reta', (0.1, e['largura'] + 0.1, h), (bx, by, TOPO + h / 2), (0, 0, a)))
    return p


def ancoras_da_escada_reta():
    t, e = T4, ESCADA_RETA
    a, r, h = e['angulo'], t[5] + 0.06, t[4]
    # Do Blender para o jogo: x igual, z = −y.
    base = (t[0] + math.cos(a) * r, t[1] - math.sin(a) * r)
    dentro = t[5] - 0.7
    saida = (t[0] + math.cos(a) * dentro, t[1] - math.sin(a) * dentro)
    return [ancora('escada-1-base', base[0], base[1], TOPO), ancora('escada-1-topo', base[0], base[1], TOPO + h),
            ancora('escada-1-saida', saida[0], saida[1], TOPO + h)]


def tampo_do_tronco_caido():
    """A altura do tampo do tronco caído (a tora fica com o meio a 0,9 do raio acima do chão)."""
    return TOPO + TRONCO_CAIDO[2] * 1.9


ESPESSURA_DA_PISTA = 0.08  # a tábua da pista tem o meio nos pontos: a superfície fica meia espessura acima


def ancoras(pista):
    fim_escorregador = pista[-1]
    lado = R(200)
    bx, by = T1[0] + math.cos(lado) * 1.85, -T1[1] + math.sin(lado) * 1.85
    porta_casa = (bx + math.cos(lado + math.pi) * 1.3, by + math.sin(lado + math.pi) * 1.3)
    a = [ancora('chegada', 11.6, 0.0), ancora('morador', *frente_da_cabana(3.4)),
         ancora('lumi-1', -0.6, 3.8), ancora('lumi-2', 3.4, -2.2), ancora('lumi-3', -6.4, 4.4),
         ancora('lumi-4', 6.6, 8.6),
         ancora('escada', T1[0] + math.cos(ESCADA_GIRO0) * (T1[5] + 0.55), T1[1] - math.sin(ESCADA_GIRO0) * (T1[5] + 0.55)),
         ancora('casa-na-arvore', porta_casa[0], -porta_casa[1], TOPO + T1[4]),
         ancora('cabana', *frente_da_cabana(2.3)), ancora('cercado', CERCADO[0], CERCADO[1]),
         ancora('lago', LAGO[0], LAGO[1]),
         ancora('escorregador-fim', fim_escorregador.x, -fim_escorregador.y)]
    for i, t in enumerate(PERCURSO):
        a.append(ancora(f'copas-{i + 1}', t[0] + 0.0, t[1], TOPO + t[4]))
    (x0, z0), (x1, z1), _ = TRONCO_CAIDO
    a.append(ancora('equilibrio-1-a', x0, z0, tampo_do_tronco_caido()))
    a.append(ancora('equilibrio-1-b', x1, z1, tampo_do_tronco_caido()))
    a += ancoras_da_escada_reta()
    # A linha do meio da pista do escorregador, na superfície (modo escorregar).
    for i, pt in enumerate(pista):
        a.append(ancora(f'escorregador-curva-{i + 1}', pt.x, -pt.y, pt.z + ESPESSURA_DA_PISTA / 2))
    for i, (x, z, giro) in enumerate(ESCONDERIJOS):
        e = ancora(f'esconderijo-{i + 1}', x, z)
        e.rotation_euler = (0.0, 0.0, giro)
        a.append(e)
    return a


def construir():
    lib_q.reset()
    col = []
    chao = terreno(col)
    borda_lago, agua, enfeite_lago = lago(col)
    chao += borda_lago
    telhado = []
    obras, chegada_escada = casa_na_arvore(col, telhado)
    for t in PERCURSO:
        aberturas = []
        i = PERCURSO.index(t)
        if i > 0:
            aberturas.append(angulo(t, PERCURSO[i - 1]))
        if i < len(PERCURSO) - 1:
            aberturas.append(angulo(t, PERCURSO[i + 1]))
        if i == len(PERCURSO) - 1:
            aberturas.append(R(-28))
            aberturas.append(ESCADA_RETA['angulo'])  # a escada reta chega no deque da T4
        if i == 0:
            aberturas.append(chegada_escada)  # a escada chega na borda do deque da T1
        obras += plataforma(t[0], t[1], t[4], r=t[5], aberturas=aberturas, col=col)
    for a_, b_ in zip(PERCURSO, PERCURSO[1:]):
        obras += ponte_corda(borda(a_, angulo(a_, b_)), borda(b_, angulo(b_, a_)), col=col)
    esc, pista = escorregador(col)
    obras += esc
    obras += escada_reta(col)
    frente = olhar_para(CABANA[0], CABANA[1], *ALVO_CABANA)
    col_cabana = []
    obras += colocar(cabana(col_cabana), CABANA[0], CABANA[1], frente)
    col += colocar(col_cabana, CABANA[0], CABANA[1], frente)
    frente = olhar_para(CERCADO[0], CERCADO[1], 2.4, -6.0)
    col_cercado = []
    obras += colocar(cercadinho(col_cercado), CERCADO[0], CERCADO[1], frente)
    col += colocar(col_cercado, CERCADO[0], CERCADO[1], frente)
    copas, troncos = [], []
    veg = vegetacao(col, copas, troncos) + enfeite_lago + galho_dos_cipos(col, copas, troncos)
    veg += tronco_caido(col)
    conferir_corredor(obras + veg + telhado + [o for c in copas + troncos for o in c], 'bosque')
    cipos = {}
    for i in range(len(CIPOS)):
        objs, pivo = cipo(i)
        cipos[f'cipo-{i + 1}'] = (objs, pivo)
    anc = ancoras(pista)
    nos_copa = {f'copa-{i + 1}': c for i, c in enumerate(copas)}
    nos_copa.update({f'tronco-{i + 1}': t for i, t in enumerate(troncos)})
    nos = {'terreno': chao, 'agua': agua, 'construcoes': obras, 'vegetacao': veg, **cipos, **nos_copa,
           'telhado-casa-na-arvore': telhado}
    exportar('bosque', nos, anc, colisores=col)


def props():
    """Peças soltas do Bosque, cada uma na origem (pé no y = 0)."""
    lib_q.reset()
    global TOPO
    nos = {
        'arvore-grande-a': arvore_grande(0, 0, 1.0, 'a', seed=1, y=0),
        'arvore-grande-b': arvore_grande(0, 0, 1.0, 'b', seed=2, y=0),
        'arvore-grande-c': arvore_grande(0, 0, 1.0, 'c', seed=3, y=0),
        'arvore-media': arvore_media(0, 0, 1.0, seed=4, y=0),
        'moita': moita(0, 0, 1.0, seed=5, y=0),
        'tora': tora(0, 0, 2.2, 0.0, y=0),
        'toco': toco(0, 0, y=0),
        'cogumelo': cogumelo(0, 0, 1.0, y=0),
        # O tronco que boia no lago (física viva, etapa 2): fino e curto para a criança empurrar e
        # subir nele. Fica com o MEIO na origem (é o centro do corpo da física) e deitado ao longo do
        # z do jogo; as medidas são as de `TRONCO_QUE_BOIA` (src/mundo/tronco-no-lago.tsx).
        'tora-que-boia': tora(0, 0, TORA_QUE_BOIA[0], 0.0, r=TORA_QUE_BOIA[1], y=-0.9 * TORA_QUE_BOIA[1]),
    }
    exportar('bosque-props', nos)


def main():
    construir()
    props()


if __name__ == '__main__':
    main()
