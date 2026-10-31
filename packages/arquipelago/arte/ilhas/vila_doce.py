"""Vila Doce, versão completa (a vila do Bento, o tamanduá confeiteiro).

Mesmo chão da versão leve, com:
- a rua de calçada da chegada até a praça e a fonte de chocolate no meio;
- a banca da feira: seis barracas dos dois lados da rua (frutas, verduras, doces, sucos, flores e
  brinquedos);
- a padaria do Bento e a sorveteria;
- o percurso pelos telhados: caixotes, três casinhas de telhado plano (uma mais alta que a outra)
  e o terraço da sorveteria, com a casquinha gigante no fim;
- pirulitos, jujubas, bengalas, postes com lampião, bancos e canteiros.

Saídas: `vila-doce.glb` (nós `terreno`, `fonte`, `construcoes`, `telhados`, `feira`, `enfeites`, as
âncoras e os nós de colisão `col-*`, 29/10/2026) e `vila-doce-props.glb` (casinhas, barraca, pirulito,
jujuba, bengala, lampião).

Colisão (README de `arte/ilhas`): o chão (`col-terreno`), as casas e lojas (caixas até o topo plano:
os telhados das casinhas e o terraço da sorveteria se pisam, o percurso dos telhados), o telhado de
duas águas da padaria, os caixotes, a fonte em três cilindros, as barracas (o balcão e os postes),
a casquinha gigante e os enfeites de pé (pirulitos, bengalas, postes, jujubas, bancos, canteiros e
moitas). Toldos, flores, tufos e o miúdo das construções não colidem.
"""
from lib_ilhas import *
import lib_cais

# O ponto de embarque do barco (pedido de arte de 30/10/2026): o deque sai do −x da ilha 2 m para o
# +z do eixo, entre o poste da esquina e a casinha de telhado marrom (na linha do meio a casinha 3
# fica a meio metro do poste). A beira do tampo (x −12,7) e o degrau (1,0 depois, onde o chão
# desce abaixo das tábuas) foram medidos no `col-terreno`; a ponta fica 3,3 além do barranco.
PORTO = dict(terra=(-12.7, 2.05), rumo=180, degrau=1.0, comprimento=5.7, lado=-1)

SEMENTE = 3 * 1.7  # a mesma da versão leve

# Percurso dos telhados: (x, z, altura do topo, variante) do jogo.
CAIXOTES = (-2.6, 6.6)
CASINHAS = [(-5.4, 7.0, 2.0, 'a'), (-8.6, 3.6, 2.8, 'b'), (-9.2, -1.4, 3.6, 'c')]
SORVETERIA = (-6.6, -5.6)
ALTURA_SORVETERIA = 4.4
# A padaria e as barracas do lado dela ficam com folga entre o canto da casa e os toldos (antes o
# canto da padaria entrava na barraca 6).
PADARIA = (-2.1, -9.0)
RAIO_FEIRA = 7.8
ANGULOS_FEIRA = (36, 57, 78, -33, -54, -75)
PRODUTOS = ('frutas', 'doces', 'flores', 'verduras', 'sucos', 'brinquedos')
TOLDOS = ('toldoRosa', 'toldoAmarelo', 'toldoVerde', 'toldoAzul', 'toldoLaranja', 'toldoLilas')


# ------------------------------------------------------------------ casinhas (montadas na origem)
def casinha(variante, w=3.0, d=3.0, h=2.0, col=None):
    """Casinha doce de telhado PLANO (dá para andar em cima): a cobertura escorre pelas bordas."""
    if col is not None:
        # Uma caixa até o topo plano (a cobertura passa 0,16 de cada lado): o telhado se pisa.
        col.append(col_caixa('casinha', (w + 0.32, d + 0.32, h), (0, 0, TOPO + h / 2)))
        if variante == 'a':
            col.append(col_cilindro('morango', 0.28, 0.65, (w / 2 + 0.05, -d / 2 - 0.05, TOPO + h + 0.3)))
    parede, cobertura, detalhe = {'a': ('casinhaRosa', 'morango', 'doceBranco'),
                                  'b': ('casinhaCreme', 'chocolate', 'chocolateClaro'),
                                  'c': ('casinhaAzul', 'menta', 'doceBranco')}[variante]
    p = [box((w, d, h - 0.18), (0, 0, TOPO + (h - 0.18) / 2), parede, bevel=0.14, segs=2)]
    # Rodapé de biscoito e a cobertura de cima (o topo plano fica em y = h).
    p.append(box((w + 0.12, d + 0.12, 0.3), (0, 0, TOPO + 0.13), 'casquinha', bevel=0.06, segs=1))
    p.append(box((w + 0.32, d + 0.32, 0.24), (0, 0, TOPO + h - 0.12), cobertura, bevel=0.1, segs=2))
    # Pingos escorrendo pelas quatro bordas.
    rnd = random.Random(ord(variante))
    for lado in range(4):
        L = w if lado % 2 == 0 else d
        n = int(L / 0.42)
        for k in range(n):
            t = -L / 2 + (k + 0.5) * L / n
            comp = rnd.uniform(0.18, 0.42)
            if lado == 0:
                c = (t, -d / 2 - 0.14, TOPO + h - 0.22 - comp / 2)
            elif lado == 1:
                c = (w / 2 + 0.14, t, TOPO + h - 0.22 - comp / 2)
            elif lado == 2:
                c = (t, d / 2 + 0.14, TOPO + h - 0.22 - comp / 2)
            else:
                c = (-w / 2 - 0.14, t, TOPO + h - 0.22 - comp / 2)
            p.append(uvball(0.11, c, cobertura, seg=6, ring=4, scale=(1, 1, comp / 0.22 + 0.4)))
    # Porta e janelas.
    p += porta(0, -d / 2 - 0.02, TOPO + 0.28, 0.9, 1.45, -math.pi / 2, m=detalhe if variante != 'b' else 'chocolate',
               m_batente='casquinhaEscura')
    if h > 2.4:
        for sx in (-1, 1):
            p += janela(sx * 0.85, -d / 2 - 0.02, TOPO + h - 0.85, 0.5, 0.5, -math.pi / 2, m_moldura=detalhe)
    for sx in (-1, 1):
        p += janela(sx * (w / 2 + 0.02), 0, TOPO + 1.15, 0.6, 0.6, 0 if sx > 0 else math.pi, m_moldura=detalhe)
    if variante == 'a':
        # Morango gordo num canto e coraçãozinho em cima da porta.
        p.append(uvball(0.32, (w / 2 + 0.05, -d / 2 - 0.05, TOPO + h + 0.25), 'morango', seg=10, ring=6,
                        scale=(1, 1, 1.15)))
        for k in range(5):
            a = 2 * math.pi * k / 5
            p.append(leaf((w / 2 + 0.05, -d / 2 - 0.05, TOPO + h + 0.55), a, 0.22, 0.09, 'doceVerde', lift=0.05,
                          droop=0.1, n=4))
        p.append(prism(heart_pts(0.28), 0.06, (0, -d / 2 - 0.1, TOPO + 1.98), 'morango'))
    elif variante == 'b':
        # Barras de chocolate nas paredes e o canudo de biscoito no canto.
        for sx in (-1, 1):
            for gz in range(2):
                for gx in range(2):
                    p.append(box((0.28, 0.06, 0.24), (sx * (0.85 + (gx - 0.5) * 0.32), -d / 2 - 0.03,
                                                      TOPO + 0.65 + gz * 0.28), 'chocolateClaro', bevel=0.03, segs=1))
        p.append(cyl(0.12, 1.2, (-w / 2 - 0.05, d / 2 + 0.05, TOPO + h + 0.5), 'casquinha', verts=8,
                     rot=(R(12), R(-8), 0)))
    else:
        # Confeitos em cima (bem baixinhos, para não atrapalhar quem anda) e folhas de hortelã.
        for k in range(18):
            a = rnd.uniform(0, 2 * math.pi)
            r = rnd.uniform(0.2, min(w, d) / 2 - 0.2)
            cores = ('morango', 'toldoAmarelo', 'doceBranco', 'toldoLilas')
            p.append(box((0.16, 0.05, 0.03), (math.cos(a) * r, math.sin(a) * r, TOPO + h + 0.012 + 0.007 * (k % 9)), cores[k % 4],
                         bevel=0.0, rot=(0, 0, rnd.uniform(0, math.pi))))
        for sx in (-1, 1):
            p.append(leaf((sx * (w / 2 + 0.15), -d / 2 - 0.15, TOPO + h - 0.1), R(-90 + sx * 35), 0.5, 0.2, 'doceVerde',
                          lift=0.15, droop=0.2, n=5))
    return p


def caixotes(col=None):
    """Caixotes do começo do percurso (o de baixo tem 1 de altura, o primeiro pulo)."""
    if col is not None:
        col.append(col_caixa('caixote', (1.0, 1.0, 1.0), (0, 0, TOPO + 0.5)))
        col.append(col_caixa('caixote', (0.55, 0.55, 0.55), (0.95, -0.15, TOPO + 0.275), (0, 0, 0.3)))
    p = caixote(0, 0, s=1.0, y=TOPO, m='madeiraDoce')
    p += caixote(0.95, 0.15, s=0.55, y=TOPO, rot=0.3, m='madeiraDoce')
    for k in range(3):
        p.append(uvball(0.12, (-0.25 + k * 0.25, -0.2, TOPO + 1.08), ('morango', 'toldoLaranja', 'toldoAmarelo')[k],
                        seg=8, ring=5))
    return p


# ------------------------------------------------------------------ sorveteria e padaria
def sorveteria(col=None):
    """Sorveteria de dois andares com terraço (o fim do percurso dos telhados) e a casquinha gigante."""
    W = D = 3.6
    H = ALTURA_SORVETERIA
    if col is not None:
        # O corpo até o piso do terraço, a mureta (aberta na frente-esquerda), o balcão e a casquinha.
        col.append(col_caixa('sorveteria', (W + 0.3, D + 0.3, H), (0, 0, TOPO + H / 2)))
        for (cx, cy, sx, sy) in ((0.9, -D / 2 - 0.05, W / 2 + 0.3, 0.16), (W / 2 + 0.05, 0, 0.16, D + 0.3),
                                 (0, D / 2 + 0.05, W + 0.3, 0.16)):
            col.append(col_caixa('mureta', (sx, sy, 0.4), (cx, cy, TOPO + H + 0.2)))
        col.append(col_caixa('balcao', (2.4, 0.5, 1.06), (0, -D / 2 - 0.25, TOPO + 0.53)))
        col.append(col_cilindro('casquinha', 0.75, 4.6, (0.2, 0.75, TOPO + H + 2.3)))
    p = [box((W, D, H - 0.2), (0, 0, TOPO + (H - 0.2) / 2), 'menta', bevel=0.12, segs=2)]
    # Faixas brancas (listras de baunilha) e o rodapé de biscoito.
    for k in range(3):
        p.append(box((W + 0.06, D + 0.06, 0.12), (0, 0, TOPO + 1.1 + k * 1.05), 'baunilha', bevel=0.03, segs=1))
    p.append(box((W + 0.14, D + 0.14, 0.34), (0, 0, TOPO + 0.15), 'casquinha', bevel=0.06, segs=1))
    # Terraço: laje com mureta baixa (fica uma abertura na frente-esquerda para chegar pelo telhado).
    p.append(box((W + 0.3, D + 0.3, 0.22), (0, 0, TOPO + H - 0.11), 'baunilha', bevel=0.08, segs=1))
    for (cx, cy, sx, sy) in ((0.9, -D / 2 - 0.05, W / 2 + 0.3, 0.16), (W / 2 + 0.05, 0, 0.16, D + 0.3),
                             (0, D / 2 + 0.05, W + 0.3, 0.16)):
        p.append(box((sx, sy, 0.4), (cx, cy, TOPO + H + 0.2), 'morango', bevel=0.05, segs=1))
    # Balcão na frente com a janela grande, os potes de sorvete e o toldo listrado.
    p.append(box((2.4, 0.5, 1.0), (0, -D / 2 - 0.25, TOPO + 0.5), 'baunilha', bevel=0.06, segs=1))
    p.append(box((2.5, 0.6, 0.08), (0, -D / 2 - 0.25, TOPO + 1.02), 'morango', bevel=0.02, segs=1))
    p.append(box((2.2, 0.08, 1.0), (0, -D / 2 - 0.02, TOPO + 1.7), 'vidroJanela', bevel=0.0))
    for k, c in enumerate(('morango', 'baunilha', 'chocolate', 'menta')):
        x = -0.8 + k * 0.53
        p.append(cyl(0.2, 0.18, (x, -D / 2 - 0.3, TOPO + 1.14), 'doceBranco', verts=10))
        p.append(uvball(0.19, (x, -D / 2 - 0.3, TOPO + 1.26), c, seg=10, ring=6, scale=(1, 1, 0.7)))
    p += toldo_listrado(0, -D / 2 - 0.02, TOPO + 2.55, 2.9, 0.9, -math.pi / 2, ['toldoRosa', 'toldoBranco'], n=8)
    # Andar de cima: duas janelas redondas e a placa de bola de sorvete.
    for sx in (-1, 1):
        p.append(torus(0.3, 0.07, (sx * 0.9, -D / 2 - 0.03, TOPO + 3.4), 'baunilha', seg=12, rseg=4,
                       rot=(R(90), 0, 0)))
        p.append(cyl(0.28, 0.05, (sx * 0.9, -D / 2 - 0.02, TOPO + 3.4), 'vidroJanela', verts=12, rot=(R(90), 0, 0)))
    p.append(cone(0.32, 0.6, (0, -D / 2 - 0.12, TOPO + 3.25), 'casquinha', verts=8, rot=(R(180), 0, 0)))
    p.append(uvball(0.3, (0, -D / 2 - 0.12, TOPO + 3.62), 'morango', seg=10, ring=6))
    # Porta do lado.
    p += porta(-W / 2 - 0.02, -0.4, TOPO + 0.32, 1.0, 2.0, math.pi, m='morango', m_batente='baunilha')
    # Casquinha gigante na metade de trás do terraço.
    base = (0.2, 0.75, TOPO + H)
    p.append(cone(0.95, 2.2, (base[0], base[1], base[2] + 1.1), 'casquinha', verts=12, rot=(R(180), 0, 0)))
    for k in range(5):
        p.append(torus(0.25 + k * 0.16, 0.025, (base[0], base[1], base[2] + 0.45 + k * 0.38), 'casquinhaEscura', seg=12,
                       rseg=3))
    for k, (c, r, dz) in enumerate((('menta', 0.98, 2.45), ('morango', 0.86, 3.2), ('baunilha', 0.72, 3.85))):
        p.append(uvball(r, (base[0], base[1], base[2] + dz), c, seg=14, ring=9, scale=(1, 1, 0.82)))
        for j in range(7):
            a = 2 * math.pi * j / 7 + k
            p.append(uvball(r * 0.22, (base[0] + math.cos(a) * r * 0.92, base[1] + math.sin(a) * r * 0.92,
                                       base[2] + dz - r * 0.45), c, seg=6, ring=4, scale=(1, 1, 1.4)))
    p.append(uvball(0.24, (base[0], base[1], base[2] + 4.55), 'doceVermelho', seg=10, ring=6))
    p.append(tube([(base[0], base[1], base[2] + 4.75), (base[0] + 0.1, base[1], base[2] + 5.15)], [0.03, 0.02],
                  'caule', seg=4))
    return p


def padaria(col=None):
    """Padaria do Bento: paredes creme com vigas de chocolate, telhado de duas águas, vitrine com
    pães e bolos, toldo listrado, chaminé fumegando e a placa do pão pendurada."""
    W, D, H = 4.5, 3.6, 3.0
    inc = math.atan2(1.4, D / 2 + 0.25)
    # A mesinha de fora fica na frente da vitrine, ao lado de onde o Bento espera (longe da barraca 6
    # e da sorveteria).
    MX, MY = -1.0, -D / 2 - 0.95
    if col is not None:
        # As paredes, as duas águas do telhado, a chaminé, os sacos de farinha e a mesinha de fora.
        col.append(col_caixa('padaria', (W + 0.12, D + 0.12, H), (0, 0, TOPO + H / 2)))
        for sy in (-1, 1):
            col.append(col_caixa('telhado-padaria', (W + 0.6, D / 2 + 0.75, 0.2), (0, sy * (D / 4 + 0.13), TOPO + H + 0.7),
                                 (-sy * inc, 0, 0)))
        col.append(col_caixa('chamine', (0.55, 0.55, 1.6), (W / 2 - 0.8, D / 4, TOPO + H + 1.3)))
        for k in range(2):
            col.append(col_cilindro('saco', 0.25, 0.7, (-W / 2 - 0.45, -0.6 + k * 0.6, TOPO + 0.35)))
        col.append(col_cilindro('mesa', 0.45, 0.78, (MX, MY, TOPO + 0.39)))
        for k in (-1, 1):
            col.append(col_cilindro('banquinho', 0.2, 0.45, (MX + k * 0.65, MY, TOPO + 0.22)))
    p = [box((W, D, H), (0, 0, TOPO + H / 2), 'casinhaCreme', bevel=0.1, segs=1)]
    p.append(box((W + 0.12, D + 0.12, 0.32), (0, 0, TOPO + 0.14), 'chocolateClaro', bevel=0.05, segs=1))
    # Vigas (enxaimel) na frente e nos lados.
    for x in (-W / 2 + 0.1, -0.75, 0.75, W / 2 - 0.1):
        p.append(box((0.16, 0.08, H - 0.3), (x, -D / 2 - 0.03, TOPO + 0.3 + (H - 0.3) / 2), 'chocolate', bevel=0.0))
    p.append(box((W, 0.08, 0.16), (0, -D / 2 - 0.03, TOPO + H - 0.1), 'chocolate', bevel=0.0))
    for sx in (-1, 1):
        for y in (-D / 2 + 0.1, 0, D / 2 - 0.1):
            p.append(box((0.08, 0.16, H - 0.3), (sx * (W / 2 + 0.03), y, TOPO + 0.3 + (H - 0.3) / 2), 'chocolate',
                         bevel=0.0))
        p.append(box((0.08, D, 0.16), (sx * (W / 2 + 0.03), 0, TOPO + 1.6), 'chocolate', bevel=0.0))
    # Telhado de duas águas (cumeeira em x), em barra de chocolate com os gomos.
    for sy in (-1, 1):
        p.append(box((W + 0.6, D / 2 + 0.75, 0.2), (0, sy * (D / 4 + 0.13), TOPO + H + 0.7), 'chocolate', bevel=0.05,
                     segs=1, rot=(-sy * inc, 0, 0)))
        for k in range(5):
            x = -W / 2 + 0.2 + k * (W + 0.2) / 5 + 0.25
            p.append(box((0.06, D / 2 + 0.7, 0.04), (x, sy * (D / 4 + 0.13), TOPO + H + 0.82), 'chocolateClaro',
                         bevel=0.0, rot=(-sy * inc, 0, 0)))
    for sx in (-1, 1):
        p.append(prism([(-D / 2 - 0.2, 0), (D / 2 + 0.2, 0), (0, 1.4)], 0.12, (sx * (W / 2 - 0.02), 0, TOPO + H),
                       'casinhaCreme', rot=(0, 0, R(90))))
    p.append(box((W + 0.7, 0.22, 0.22), (0, 0, TOPO + H + 1.42), 'chocolateClaro', bevel=0.05, segs=1))
    # Chaminé com fumaça.
    p.append(box((0.55, 0.55, 1.6), (W / 2 - 0.8, D / 4, TOPO + H + 1.3), 'tijolo', bevel=0.06, segs=1))
    for k, (dz, r) in enumerate(((2.4, 0.3), (2.85, 0.38), (3.35, 0.46))):
        p.append(uvball(r, (W / 2 - 0.8 + k * 0.15, D / 4 - k * 0.05, TOPO + H + dz), 'nuvemSombra', seg=8, ring=5))
    # Vitrine (pães e bolo) à esquerda, porta à direita, toldo listrado por cima.
    # O vidro fica à frente do fundo das vigas (o fundo das duas ficava no mesmo plano).
    p.append(box((1.5, 0.08, 1.15), (-1.35, -D / 2 - 0.05, TOPO + 1.35), 'vidroJanela', bevel=0.0))
    p.append(box((1.7, 0.12, 0.12), (-1.35, -D / 2 - 0.06, TOPO + 0.74), 'chocolate', bevel=0.0))
    p.append(box((1.6, 0.45, 0.08), (-1.35, -D / 2 - 0.2, TOPO + 0.8), 'madeiraDoce', bevel=0.02, segs=1))
    for k in range(3):
        p.append(superellipsoid((0.42, 0.26, 0.2), (-1.85 + k * 0.5, -D / 2 - 0.2, TOPO + 0.93), 'pao', e1=0.7, e2=0.8,
                                seg=8, ring=5))
    p.append(cyl(0.2, 0.25, (-1.35, -D / 2 - 0.16, TOPO + 1.08 + 0.12), 'baunilha', verts=12))
    p += porta(1.1, -D / 2 - 0.02, TOPO + 0.3, 1.1, 2.1, -math.pi / 2, m='madeiraDoce', m_batente='chocolate')
    p += toldo_listrado(0, -D / 2 - 0.02, TOPO + 2.55, W - 0.2, 0.85, -math.pi / 2, ['toldoRosa', 'toldoBranco'], n=10)
    # Placa do pão pendurada num braço de ferro, do lado da porta.
    p.append(tube([(W / 2 - 0.1, -D / 2 - 0.05, TOPO + 2.85), (W / 2 + 0.75, -D / 2 - 0.05, TOPO + 2.85)],
                  [0.04, 0.04], 'metalEscuro', seg=5))
    pao = superellipsoid((0.8, 0.3, 0.42), (W / 2 + 0.45, -D / 2 - 0.05, TOPO + 2.4), 'pao', e1=0.7, e2=0.8, seg=10,
                         ring=6)
    p.append(pao)
    for k in range(3):
        p.append(box((0.05, 0.31, 0.2), (W / 2 + 0.25 + k * 0.2, -D / 2 - 0.05, TOPO + 2.55), 'paoEscuro', bevel=0.0,
                     rot=(0, R(25), 0)))
    # Sacos de farinha e uma mesinha com dois banquinhos.
    for k in range(2):
        p.append(superellipsoid((0.55, 0.45, 0.7), (-W / 2 - 0.45, -0.6 + k * 0.6, TOPO + 0.35), 'farinha', e1=0.6,
                                e2=0.8, seg=8, ring=5))
    p.append(cyl(0.45, 0.06, (MX, MY, TOPO + 0.75), 'madeiraDoce', verts=12))
    p.append(cyl(0.06, 0.75, (MX, MY, TOPO + 0.37), 'metalEscuro', verts=6))
    for k in (-1, 1):
        p.append(cyl(0.2, 0.45, (MX + k * 0.65, MY, TOPO + 0.22), 'toldoRosa', verts=10))
    return p


# ------------------------------------------------------------------ feira
def barraca(i, col=None):
    """Barraca da feira na origem (o balcão para −Y), com o toldo e os produtos dela."""
    toldo = TOLDOS[i % len(TOLDOS)]
    produto = PRODUTOS[i % len(PRODUTOS)]
    W, D = 2.1, 1.0
    if col is not None:
        # O balcão e os quatro postes; o toldo não segura ninguém.
        col.append(col_caixa('barraca', (W + 0.1, D + 0.1, 0.96), (0, 0, TOPO + 0.48)))
        for sx in (-1, 1):
            for sy in (-1, 1):
                col.append(col_cilindro('poste', 0.06, 2.2, (sx * (W / 2 - 0.05), sy * (D / 2 + 0.1), TOPO + 1.1)))
    p = [box((W, D, 0.9), (0, 0, TOPO + 0.45), 'madeiraDoce', bevel=0.05, segs=1)]
    p.append(box((W + 0.04, 0.06, 0.55), (0, -D / 2 - 0.03, TOPO + 0.55), toldo, bevel=0.02, segs=1))
    p.append(box((W + 0.1, D + 0.1, 0.08), (0, 0, TOPO + 0.92), 'madeiraDoce', bevel=0.02, segs=1))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl(0.05, 2.2, (sx * (W / 2 - 0.05), sy * (D / 2 + 0.1), TOPO + 1.1), 'tronco', verts=6))
    # Toldo de duas águas listrado (listras ao longo da largura) e o babado da frente.
    cores = [toldo, 'toldoBranco']
    # As listras vizinhas se sobrepõem um pouco: a branca é mais grossa e mais comprida, para as faces
    # das duas não ficarem no mesmo plano. Barracas vizinhas têm o toldo em alturas diferentes (os cantos se cruzam).
    alto = TOPO + 2.35 + 0.05 * (i % 2)
    for sy in (-1, 1):
        for k in range(6):
            x = -W / 2 - 0.15 + (k + 0.5) * (W + 0.3) / 6
            p.append(box(((W + 0.3) / 6 * 1.01, D / 2 + 0.45 + 0.012 * (k % 2), 0.05 + 0.016 * (k % 2)), (x, sy * (D / 4 + 0.22), alto),
                         cores[k % 2], bevel=0.0, rot=(-sy * R(18), 0, 0)))
    for k in range(7):
        x = -W / 2 - 0.15 + k * (W + 0.3) / 6
        p.append(uvball(0.12, (x, -D / 2 - 0.6, alto - 0.18), cores[k % 2], seg=8, ring=4, scale=(1, 0.4, 0.8)))
    # Placa no alto da frente.
    p.append(box((1.0, 0.06, 0.36), (0, -D / 2 - 0.66, alto + 0.15), 'doceBranco', bevel=0.03, segs=1))
    p.append(box((0.7, 0.07, 0.1), (0, -D / 2 - 0.67, alto + 0.15), toldo, bevel=0.0))
    # Produtos em cima do balcão.
    rnd = random.Random(i)
    topo = TOPO + 0.96
    if produto == 'frutas':
        for c, x in (('morango', -0.6), ('toldoLaranja', 0.0), ('toldoAmarelo', 0.6)):
            p += caixote(x, 0.0, s=0.5, y=topo - 0.25, m='madeiraDoce')
            for k in range(5):
                p.append(uvball(0.09, (x + rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15), topo + 0.28), c, seg=8,
                                ring=5))
    elif produto == 'verduras':
        for k in range(5):
            x = -0.8 + k * 0.4
            p.append(uvball(0.17, (x, 0.05, topo + 0.12), 'folhaAlface' if k % 2 else 'folhaAlfaceEscura', seg=8,
                            ring=5, scale=(1, 1, 0.8)))
        for k in range(4):
            p.append(cone(0.06, 0.32, (-0.6 + k * 0.4, -0.25, topo + 0.06), 'orange', verts=6, rot=(0, R(90), 0)))
    elif produto == 'doces':
        for k in range(6):
            x = -0.75 + k * 0.3
            p.append(cyl(0.1, 0.12, (x, 0.0, topo + 0.06), 'casquinha', verts=8, r2=0.12))
            p.append(uvball(0.12, (x, 0.0, topo + 0.17), ('morango', 'baunilha', 'menta')[k % 3], seg=8, ring=5,
                            scale=(1, 1, 0.8)))
        p.append(cyl(0.22, 0.22, (0.0, 0.3, topo + 0.11), 'casinhaRosa', verts=12))
    elif produto == 'sucos':
        for k in range(7):
            x = -0.8 + k * 0.26
            c = ('toldoLaranja', 'morango', 'toldoVerde', 'toldoAmarelo')[k % 4]
            p.append(cyl(0.07, 0.28, (x, 0.05, topo + 0.14), c, verts=8))
            p.append(cyl(0.035, 0.08, (x, 0.05, topo + 0.32), 'doceBranco', verts=6))
    elif produto == 'flores':
        for k in range(4):
            x = -0.7 + k * 0.46
            p.append(cyl(0.13, 0.22, (x, 0.0, topo + 0.11), 'tijolo', verts=8, r2=0.1))
            p += flor((x, 0.0, topo + 0.22), ('petalaRosa', 'petalaAmarela', 'petalaLilas', 'petalaBranca')[k],
                      seed=k + 10 * i, r=0.16, haste=0.2)
    else:  # brinquedos: balões presos no poste e piões
        for k in range(4):
            c = ('morango', 'toldoAzul', 'toldoAmarelo', 'toldoVerde')[k]
            bx = W / 2 - 0.05 + 0.1 * (k % 2)
            p.append(uvball(0.2, (bx + 0.15 * k, -D / 2 - 0.1, TOPO + 2.6 + 0.25 * (k % 2)), c, seg=10, ring=6,
                            scale=(1, 1, 1.15)))
            p.append(tube([(bx, -D / 2 - 0.1, TOPO + 1.2), (bx + 0.15 * k, -D / 2 - 0.1, TOPO + 2.4)], [0.008, 0.008],
                          'doceBranco', seg=3, cap=False))
        for k in range(3):
            p.append(cone(0.12, 0.2, (-0.6 + k * 0.4, 0.0, topo + 0.1), ('toldoLilas', 'morango', 'toldoAzul')[k],
                          verts=10, rot=(R(180), 0, 0)))
    return p


# ------------------------------------------------------------------ fonte de chocolate
def fonte():
    p = [cyl(1.7, 0.5, (0, 0, TOPO + 0.25), 'doceBranco', verts=24, bevel=0.08)]
    p.append(cyl(1.5, 0.08, (0, 0, TOPO + 0.44), 'chocolate', verts=24))
    p.append(torus(1.68, 0.1, (0, 0, TOPO + 0.5), 'morango', seg=24, rseg=5))
    p.append(cyl(0.22, 1.15, (0, 0, TOPO + 1.025), 'doceBranco', verts=10))
    p.append(cyl(0.95, 0.22, (0, 0, TOPO + 1.55), 'doceBranco', verts=18, r2=0.8, bevel=0.04))
    p.append(cyl(0.82, 0.06, (0, 0, TOPO + 1.67), 'chocolate', verts=18))
    p.append(cyl(0.14, 0.6, (0, 0, TOPO + 1.95), 'doceBranco', verts=8))
    p.append(cyl(0.5, 0.18, (0, 0, TOPO + 2.3), 'doceBranco', verts=14, r2=0.42, bevel=0.03))
    p.append(cyl(0.42, 0.05, (0, 0, TOPO + 2.4), 'chocolate', verts=14))
    p.append(uvball(0.3, (0, 0, TOPO + 2.72), 'morango', seg=12, ring=8, scale=(1, 1, 1.15)))
    for k in range(5):
        a = 2 * math.pi * k / 5
        p.append(leaf((0, 0, TOPO + 3.0), a, 0.28, 0.1, 'doceVerde', lift=0.05, droop=0.1, n=4))
    # Cortinas de chocolate escorrendo de cada bacia (como nas fontes de chocolate de verdade), com
    # pingos na borda de baixo.
    p.append(cyl(0.6, 0.62, (0, 0, TOPO + 2.0), 'chocolateClaro', verts=18, r2=0.5))
    p.append(cyl(1.12, 1.05, (0, 0, TOPO + 1.0), 'chocolateClaro', verts=24, r2=0.95))
    for k in range(12):
        a = 2 * math.pi * k / 12
        p.append(uvball(0.08, (math.cos(a) * 1.08, math.sin(a) * 1.08, TOPO + 0.5), 'chocolateClaro', seg=6, ring=4,
                        scale=(1, 1, 1.6)))
    return p


# ------------------------------------------------------------------ praça e enfeites
def praca():
    """Calçada da praça, a rua da chegada e os canteiros (tudo baixinho, no chão)."""
    p = [mancha(0, 0, 3.6, 3.5, 'calcada', seed=2, n=32, wob=0.04)]
    p.append(trilha([(12.6, 0.0), (8.0, 0.0), (3.2, 0.0)], 1.25, m='calcada', z1=TOPO + 0.032))
    rnd = random.Random(8)
    # Pedrinhas da calçada (bem achatadas) em dois anéis em volta da fonte.
    for k in range(28):
        a = 2 * math.pi * k / 28
        r = 2.35 if k % 2 else 2.9
        p.append(box((0.42, 0.3, 0.03), (math.cos(a) * r, math.sin(a) * r, TOPO + 0.035), 'calcadaPedra', bevel=0.0,
                     rot=(0, 0, a + rnd.uniform(-0.2, 0.2))))
    for k in range(10):
        x = 4.0 + k * 0.85
        p.append(box((0.4, 0.3, 0.03), (x, rnd.uniform(-0.8, 0.8), TOPO + 0.036), 'calcadaPedra', bevel=0.0,
                     rot=(0, 0, rnd.uniform(0, 1))))
    # Trilhas de calçada até a padaria, a sorveteria e os caixotes do percurso.
    p.append(trilha([(-0.6, -3.2), (-1.0, -5.2), (-1.0, -6.6)], 0.8, m='calcada'))
    p.append(trilha([(-2.8, -2.2), (-4.4, -3.6), (-5.4, -4.4)], 0.75, m='calcada'))
    p.append(trilha([(-1.4, 3.2), (-2.0, 4.8), (-2.4, 5.8)], 0.7, m='calcada'))
    return p


def enfeites(col):
    p = []
    for i, (x, z, c) in enumerate([(9.4, 6.4, 'doceVermelho'), (9.6, -6.6, 'cupulaAzul'), (-11.0, 1.2, 'cupulaRosa'),
                                   (2.6, 10.6, 'doceVerde'), (-3.0, 10.4, 'cupulaLaranja'), (4.8, -10.2, 'doceVermelho')]):
        s = 1.0 + 0.25 * (i % 2)
        p += anel.pirulito(x, z, c, s)
        # O cabo e o disco (lá em cima, mas baixo o bastante para bater a cabeça): um poste só.
        col.append(col_cilindro('poste', 0.09, 3.25 * s, P(x, z, TOPO + 3.25 * s / 2)))
    for x, z, c in ((11.0, 4.0, 'doceVerde'), (11.2, -3.6, 'cupulaLaranja'), (6.6, 9.2, 'cupulaRosa'),
                    (-6.2, 10.0, 'doceVerde'), (7.2, -9.0, 'cupulaAzul'), (-11.0, -4.6, 'doceVermelho')):
        p += anel.jujuba(x, z, c)
        col.append(col_cilindro('jujuba', 0.4, 0.7, P(x, z, TOPO + 0.35)))
    for x, z in ((3.6, 2.9), (3.6, -2.9)):
        p += anel.bengala(x, z)
        col.append(col_cilindro('poste', 0.1, 1.95, P(x, z, TOPO + 0.975)))
    for x, z in ((6.0, 2.9), (9.4, 2.9), (6.0, -2.9), (9.4, -2.9), (-2.6, 2.6), (-2.6, -2.6), (2.2, 3.4)):
        p += lampiao_poste(x, z, h=2.6, m='chocolate')
        col.append(col_cilindro('poste', 0.08, 2.9, P(x, z, TOPO + 1.45)))
    for x, z, rot in ((0.0, 3.1, 0.0), (0.0, -3.1, math.pi), (-3.2, 0.0, R(-90))):
        p += banco(x, z, rot=rot, m='madeiraDoce')
        col.append(col_caixa('banco', (1.6, 0.55, 0.53), P(x, z, TOPO + 0.265), (0, 0, rot)))
    # Canteiros redondos de flores (em volta da praça) e moitas aparadas.
    for k, (x, z) in enumerate(((2.6, -2.4), (-2.0, 2.8 + 0.2), (-3.6, 1.6 + 0.4))):
        bx, by = x, -z
        p.append(cyl(0.6, 0.25, (bx, by, TOPO + 0.12), 'casquinha', verts=14))
        # Até a altura que segura (0,72): ninguém sobe no canteiro e pisa as flores.
        col.append(col_cilindro('vaso', 0.6, 0.72, (bx, by, TOPO + 0.36)))
        p.append(cyl(0.52, 0.06, (bx, by, TOPO + 0.26), 'terra', verts=14))
        p += flores(x, z, 0.4, 5, seed=400 + k, y=TOPO + 0.28)
    for k, (x, z) in enumerate(((10.4, 6.8 - 1.6), (-4.4, -10.2 + 1.0), (0.4, -11.0 + 0.6), (-10.6, -6.6 + 2.6))):
        p += moita(x, z, 0.8, m='copa', seed=500 + k)
        col.append(col_cilindro('moita', 0.65 * 0.8, 0.75, P(x, z, TOPO + 0.375)))
    p += tufos(4.0, 9.0, 1.6, 6, seed=600)
    p += tufos(-1.0, -6.0, 1.2, 4, seed=601)
    return p


# ------------------------------------------------------------------ montagem
def frente(x, z, d, tx=0.0, tz=0.0):
    dx, dz = tx - x, tz - z
    n = math.hypot(dx, dz)
    return x + dx / n * d, z + dz / n * d


def construir():
    lib_q.reset()
    col = []
    base = anel.base(SEMENTE, topo='gramaClara', borda_topo='doceBranco')
    # O chão que se pisa: tampo, praia e barranco (a calçada, milímetros acima, só desenha).
    col.append(col_terreno(base))
    chao = base + praca()
    agua_fonte = fonte()
    # A fonte: a bacia de baixo, a cortina de chocolate com a bacia do meio e a parte de cima.
    col.append(col_cilindro('fonte', 1.7, 0.6, (0, 0, TOPO + 0.3)))
    col.append(col_cilindro('fonte', 1.12, 1.17, (0, 0, TOPO + 1.08)))
    col.append(col_cilindro('fonte', 0.6, 1.7, (0, 0, TOPO + 2.5)))

    def montar(fn, x, z, frente_, *args):
        c = []
        objs = colocar(fn(*args, col=c), x, z, frente_)
        col.extend(colocar(c, x, z, frente_))
        return objs

    obras = []
    obras += montar(padaria, PADARIA[0], PADARIA[1], olhar_para(PADARIA[0], PADARIA[1], -1.0, -3.0))
    obras += montar(sorveteria, SORVETERIA[0], SORVETERIA[1], olhar_para(SORVETERIA[0], SORVETERIA[1], -3.4, -3.0))
    telhados = montar(caixotes, CAIXOTES[0], CAIXOTES[1], olhar_para(CAIXOTES[0], CAIXOTES[1], 0.0, 0.0))
    for x, z, h, v in CASINHAS:
        c = []
        telhados += colocar(casinha(v, h=h, col=c), x, z, olhar_para(x, z, 0.0, 0.0))
        col.extend(colocar(c, x, z, olhar_para(x, z, 0.0, 0.0)))
    feira = []
    ancoras_feira = []
    for i, ang in enumerate(ANGULOS_FEIRA):
        a = R(ang)
        x, z = math.cos(a) * RAIO_FEIRA, math.sin(a) * RAIO_FEIRA
        feira += montar(barraca, x, z, olhar_para(x, z, 0.0, 0.0), i)
        fx, fz = frente(x, z, 1.4)
        ancoras_feira.append(ancora(f'barraca-{i + 1}', fx, fz))
    enf = enfeites(col)
    conferir_corredor(obras + telhados + feira + enf + agua_fonte, 'vila-doce')
    anc = [ancora('chegada', 11.6, 0.0), ancora('morador', *frente(PADARIA[0], PADARIA[1], 3.4, -1.0, -3.0)),
           ancora('lumi-1', 2.4, 2.2), ancora('lumi-2', -3.2, -1.6), ancora('lumi-3', 3.6, -5.0),
           ancora('lumi-4', -4.2, 4.0), ancora('fonte', 0.0, 0.0),
           ancora('padaria', *frente(PADARIA[0] + 0.2, PADARIA[1], 2.4, -1.0, -3.0)),
           ancora('sorveteria', *frente(SORVETERIA[0], SORVETERIA[1], 2.9, -3.4, -3.0)),
           ancora('telhados-inicio', CAIXOTES[0], CAIXOTES[1], TOPO + 1.0)]
    for k, (x, z, h, _) in enumerate(CASINHAS):
        anc.append(ancora(f'telhados-{k + 1}', x, z, TOPO + h))
    anc.append(ancora('telhados-fim', *frente(SORVETERIA[0], SORVETERIA[1], 0.6, -3.4, -3.0), TOPO + ALTURA_SORVETERIA))
    nos = {'terreno': chao, 'fonte': agua_fonte, 'construcoes': obras, 'telhados': telhados, 'feira': feira,
           'enfeites': enf}
    porto, _, dados_porto = lib_cais.deque_de_praia(**PORTO, col=col, col_caixa=col_caixa, col_cilindro=col_cilindro)
    anc += lib_cais.ancoras_do_porto(ancora, dados_porto)
    dados_porto['caixa_do_deque'] = lib_cais.caixa_no_jogo(porto)
    dados_porto['caixa_da_ilha'] = lib_cais.caixas_da_ilha(nos, porto)
    nos['porto'] = porto
    exportar('vila-doce', nos, anc + ancoras_feira, colisores=col, porto=dados_porto)


def props():
    lib_q.reset()
    nos = {}
    for v in 'abc':
        objs = casinha(v)
        for o in objs:
            o.location.z -= TOPO
        nos[f'casinha-{v}'] = objs
    objs = barraca(0)
    for o in objs:
        o.location.z -= TOPO
    nos['barraca'] = objs
    for nome, f in (('pirulito', lambda: anel.pirulito(0, 0, 'doceVermelho')), ('jujuba', lambda: anel.jujuba(0, 0, 'doceVerde')),
                    ('bengala', lambda: anel.bengala(0, 0)), ('lampiao', lambda: lampiao_poste(0, 0, m='chocolate'))):
        objs = f()
        for o in objs:
            o.location.z -= TOPO
        nos[nome] = objs
    exportar('vila-doce-props', nos)


def main():
    construir()
    props()


if __name__ == '__main__':
    main()
