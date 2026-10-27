"""Os outros sete personagens da Chave do Farol em 3D (o aventureiro mora em `objetos.py`).

Todos usam o MESMO esqueleto e os mesmos clipes do aventureiro (`parado` e `andando`, em
`objetos._animar_boneco`) e saem com a mesma altura, 1,58: na personalização a criança troca o
modelo no bloco "Criar o objeto … com o modelo" e o jogo continua igual (tamanho e área de toque).
Cores e acessórios vêm de cada desenho 2D (`studio/src/arte/assets/farol/*-farol.svg`).
"""
from lib_ilha import *
from objetos import _boneco_base, _animar_boneco


def c(hexa, rug=0.8):
    """Material de cor única pelo próprio hex (as cores dos desenhos, sem nome na paleta)."""
    chave = 'c' + hexa.lstrip('#')
    lib_q.PALETTE.setdefault(chave, (hexa, rug, None, 0))
    return chave


CZ = 1.0  # centro da cabeça


def _cachos(cz, m, n=14, seed=5):
    """Cabelo crespo: touca e bolinhas em volta do alto e da nuca."""
    rnd = random.Random(seed)
    p = [superellipsoid((0.74, 0.66, 0.44), (0, 0.05, cz + 0.17), m, e1=0.6, e2=0.6, seg=20, ring=10),
         superellipsoid((0.74, 0.36, 0.6), (0, 0.15, cz + 0.02), m, e1=0.6, e2=0.6, seg=20, ring=10)]
    for i in range(n):
        a = math.pi * (0.05 + 0.9 * i / (n - 1))
        x, z = 0.36 * math.cos(a), 0.3 * math.sin(a)
        p.append(sphere(0.11 + rnd.uniform(-0.015, 0.02), (x, 0.1 + rnd.uniform(-0.05, 0.08), cz + 0.08 + z), m, subdiv=2))
    return p


def menina_de_laco():
    reset()
    pele, cabelo = c('#8a5533'), c('#1f1612', 0.7)
    partes = _boneco_base({'pele': pele, 'camiseta': c('#ffc83d'), 'manga': c('#f2b01e'),
                           'saia': c('#7c4fd6'), 'short': c('#7c4fd6'), 'sapato': c('#e8505b'),
                           'sola': 'camiseta', 'cilios': cabelo})
    cab = partes['Cabeca']
    cab += _cachos(CZ, cabelo)
    # Coque alto de cachos com o laço rosa ao lado.
    cab.append(sphere(0.2, (0, 0.12, CZ + 0.46), cabelo, subdiv=2))
    for a in range(6):
        t = 2 * math.pi * a / 6
        cab.append(sphere(0.1, (0.15 * math.cos(t), 0.12 + 0.15 * math.sin(t), CZ + 0.47), cabelo, subdiv=2))
    rosa = c('#ff5f8f', 0.6)
    for s in (-1, 1):  # laço grande na frente do coque, puxado para a direita como no desenho
        cab.append(ellipsoid((0.16 + s * 0.12, -0.08, CZ + 0.5), (0.13, 0.06, 0.09), rosa, rot=(0, R(s * 25), 0)))
    cab.append(sphere(0.065, (0.16, -0.11, CZ + 0.5), rosa, subdiv=2))
    for s in (-1, 1):  # brincos dourados
        cab.append(sphere(0.03, (s * 0.35, -0.04, CZ - 0.13), c('#ffd23f', 0.3), subdiv=1))
    _animar_boneco('menina-de-laco', partes)


def marinheira():
    reset()
    pele, cabelo, azul = c('#e9b98f'), c('#5a2f17', 0.7), c('#1f3a7a')
    partes = _boneco_base({'pele': pele, 'camiseta': 'camiseta', 'manga': 'camiseta', 'saia': azul,
                           'short': azul, 'sapato': c('#e63946'), 'sola': 'camiseta', 'cilios': cabelo})
    corpo = partes['Corpo']
    for z in (0.47, 0.56, 0.65):  # listras azuis da blusa de marinheira
        corpo.append(cyl(0.197, 0.035, (0, 0, z), azul, verts=24))
    for s in (-1, 1):
        partes['Braco' + ('E' if s < 0 else 'D')].append(
            torus(0.07, 0.016, (s * 0.24, 0, 0.58), azul, seg=16, rseg=5, rot=(0, R(90 - s * 25), 0)))
    # Gola com lenço vermelho na frente.
    corpo.append(prism([(-0.13, 0), (0.13, 0), (0, -0.14)], 0.03, (0, -0.15, 0.7), c('#e63946'), bevel=0.008))
    cab = partes['Cabeca']
    cab.append(superellipsoid((0.73, 0.65, 0.42), (0, 0.06, CZ + 0.17), cabelo, e1=0.55, e2=0.55))
    cab.append(superellipsoid((0.72, 0.34, 0.56), (0, 0.15, CZ + 0.03), cabelo, e1=0.55, e2=0.55))
    cab.append(lock((-0.28, -0.22, CZ + 0.3), (0.9, -0.3, -0.25), 0.36, 0.11, cabelo, bend=(0.05, 0, -0.06)))
    for s in (-1, 1):
        cab.append(superellipsoid((0.08, 0.28, 0.4), (s * 0.335, 0.08, CZ + 0.02), cabelo, e1=0.6, e2=0.6))
    # Trança comprida descendo pelas costas, com a fita vermelha na ponta.
    for i in range(5):
        cab.append(sphere(0.085 - 0.006 * i, (0, 0.34 + 0.02 * i, CZ - 0.12 - 0.11 * i), cabelo, subdiv=2))
    cab.append(torus(0.05, 0.022, (0, 0.43, CZ - 0.63), c('#e63946'), seg=14, rseg=5))
    _animar_boneco('marinheira', partes)


def menino_de_bone():
    reset()
    pele, cabelo = c('#6b3f24'), c('#16100d', 0.7)
    calca = c('#3d4a6b')
    partes = _boneco_base({'pele': pele, 'camiseta': c('#2eb36b'), 'manga': c('#24985a'),
                           'short': calca, 'perna': calca, 'sapato': c('#1f2430'), 'sola': 'camiseta'})
    cab = partes['Cabeca']
    cab.append(superellipsoid((0.72, 0.64, 0.36), (0, 0.06, CZ + 0.14), cabelo, e1=0.6, e2=0.6))
    cab.append(superellipsoid((0.72, 0.3, 0.5), (0, 0.17, CZ + 0.0), cabelo, e1=0.6, e2=0.6))
    # Boné vermelho com a aba para a frente e a faixa branca.
    vermelho = c('#e23b3b', 0.6)
    cab.append(superellipsoid((0.76, 0.7, 0.46), (0, 0.04, CZ + 0.3), vermelho, e1=0.6, e2=0.6, flat_bottom=0.45))
    cab.append(cyl(0.375, 0.05, (0, 0.04, CZ + 0.27), 'camiseta', verts=28))
    aba = superellipsoid((0.54, 0.32, 0.05), (0.02, -0.34, CZ + 0.27), c('#b82a2a', 0.6), e1=0.4, e2=0.8, rot=(R(-8), 0, 0))
    cab.append(aba)
    cab.append(sphere(0.045, (0, 0.04, CZ + 0.53), vermelho, subdiv=2))
    _animar_boneco('menino-de-bone', partes)


def exploradora_de_chapeu():
    reset()
    pele, cabelo = c('#f7d2b3'), c('#cf5a26', 0.7)
    caqui = c('#c9a659')
    partes = _boneco_base({'pele': pele, 'camiseta': c('#e2c27c'), 'manga': caqui, 'short': c('#7b5232'),
                           'sapato': c('#5a3a1e'), 'sola': c('#7a4b23'), 'cilios': c('#b8481b')})
    corpo = partes['Corpo']
    corpo.append(box((0.1, 0.02, 0.12), (0.09, -0.135, 0.58), caqui, bevel=0.01))  # bolso
    cab = partes['Cabeca']
    # Cabelo ruivo em chanel, por baixo do chapéu.
    cab.append(superellipsoid((0.72, 0.65, 0.46), (0, 0.06, CZ + 0.12), cabelo, e1=0.6, e2=0.55))
    for s in (-1, 1):
        cab.append(superellipsoid((0.1, 0.36, 0.4), (s * 0.34, 0.06, CZ - 0.04), cabelo, e1=0.6, e2=0.6))
    cab.append(superellipsoid((0.6, 0.12, 0.16), (0, -0.25, CZ + 0.2), cabelo, e1=0.6, e2=0.7))
    # Sardas e óculos redondos.
    for s in (-1, 1):
        for k in range(3):
            cab.append(sphere(0.012, (s * (0.16 + 0.03 * k), -0.3, CZ - 0.07 - 0.015 * (k % 2)), c('#d9875a'), subdiv=1))
        cab.append(torus(0.09, 0.016, (s * 0.135, -0.33, CZ + 0.02), c('#2b2b2b', 0.4), seg=20, rseg=5, rot=(R(90), 0, 0)))
    cab.append(tube([(-0.05, -0.335, CZ + 0.03), (0.05, -0.335, CZ + 0.03)], [0.012, 0.012], c('#2b2b2b', 0.4), seg=4))
    # Chapéu de explorador: copa, faixa marrom e aba larga.
    palha = c('#e2c27c', 0.85)
    cab.append(superellipsoid((0.6, 0.56, 0.24), (0, 0.04, CZ + 0.44), palha, e1=0.5, e2=0.6, flat_bottom=0.2))
    cab.append(cyl(0.3, 0.07, (0, 0.04, CZ + 0.37), c('#7a4b23'), verts=28))
    cab.append(cyl(0.47, 0.035, (0, 0.04, CZ + 0.33), palha, verts=32, r2=0.44, bevel=0.012))
    _animar_boneco('exploradora-de-chapeu', partes)


def pirata():
    reset()
    pele, cabelo, marinho = c('#cd8d64'), c('#563424', 0.7), c('#19283d')
    partes = _boneco_base({'pele': pele, 'camiseta': c('#e8edf6'), 'manga': c('#e8edf6'), 'short': marinho,
                           'perna': marinho, 'sapato': c('#000000', 0.5), 'sola': c('#19283d')})
    corpo = partes['Corpo']
    # Colete aberto azul-marinho e cinto vermelho com fivela dourada.
    for s in (-1, 1):
        corpo.append(superellipsoid((0.15, 0.29, 0.3), (s * 0.12, 0.0, 0.56), marinho, e1=0.55, e2=0.6))
    corpo.append(cyl(0.2, 0.06, (0, 0, 0.44), c('#e05245'), verts=24))
    corpo.append(box((0.07, 0.03, 0.06), (0, -0.2, 0.44), c('#f3b123', 0.3), bevel=0.01))
    cab = partes['Cabeca']
    cab.append(superellipsoid((0.72, 0.36, 0.62), (0, 0.15, CZ - 0.02), cabelo, e1=0.6, e2=0.6))
    for s in (-1, 1):
        cab.append(superellipsoid((0.12, 0.34, 0.5), (s * 0.33, 0.04, CZ - 0.06), cabelo, e1=0.6, e2=0.6))
    # Barba curta no queixo.
    cab.append(superellipsoid((0.5, 0.2, 0.18), (0, -0.2, CZ - 0.25), cabelo, e1=0.6, e2=0.7))
    # Tapa-olho com a tira.
    cab.append(ellipsoid((0.135, -0.32, CZ + 0.02), (0.085, 0.03, 0.09), marinho))
    cab.append(tube([(0.2, -0.3, CZ + 0.1), (0.36, 0.0, CZ + 0.16), (0.0, 0.33, CZ + 0.22), (-0.36, 0.0, CZ + 0.2),
                     (-0.2, -0.29, CZ + 0.16)], [0.015] * 5, marinho, seg=4, cap=False))
    cab.append(sphere(0.035, (-0.35, -0.04, CZ - 0.13), c('#f3b123', 0.3), subdiv=1))
    # Chapéu de pirata: copa azul-marinho, faixa vermelha, abas viradas e a caveira na frente.
    cab.append(superellipsoid((0.72, 0.64, 0.3), (0, 0.04, CZ + 0.38), marinho, e1=0.5, e2=0.6, flat_bottom=0.2))
    cab.append(cyl(0.36, 0.07, (0, 0.04, CZ + 0.29), c('#e05245'), verts=28))
    for s in (-1, 1):
        cab.append(superellipsoid((0.24, 0.5, 0.18), (s * 0.34, 0.04, CZ + 0.36), marinho, e1=0.5, e2=0.6,
                                  rot=(0, R(s * 35), 0)))
    osso = c('#f3e5c7')
    cab.append(sphere(0.06, (0, -0.32, CZ + 0.42), osso, subdiv=2))
    for s in (-1, 1):
        cab.append(tube([(-0.07, -0.31, CZ + 0.35 + s * 0.03), (0.07, -0.31, CZ + 0.35 - s * 0.03)], [0.012, 0.012], osso, seg=4))
    _animar_boneco('pirata', partes)


def mergulhador():
    reset()
    pele, roupa, verde = c('#cd8d64'), c('#19283d', 0.5), c('#00a9a3', 0.5)
    amarelo = c('#f3b123', 0.4)
    partes = _boneco_base({'pele': pele, 'camiseta': roupa, 'manga': roupa, 'short': roupa, 'perna': roupa,
                           'sapato': amarelo, 'sola': amarelo, 'mao': roupa})
    for lado in ('E', 'D'):  # nadadeiras compridas no lugar do tênis
        x = -0.1 if lado == 'E' else 0.1
        partes['Perna' + lado].append(superellipsoid((0.2, 0.42, 0.05), (x, -0.12, 0.03), amarelo, e1=0.4, e2=0.5))
    corpo = partes['Corpo']
    corpo.append(superellipsoid((0.26, 0.05, 0.22), (0, -0.13, 0.57), verde, e1=0.5, e2=0.6))
    # Cilindro de ar nas costas.
    corpo.append(cyl(0.08, 0.34, (0, 0.2, 0.57), amarelo, verts=16, bevel=0.03))
    cab = partes['Cabeca']
    # Capuz verde cobrindo a cabeça, com o rosto à mostra.
    cab.append(superellipsoid((0.74, 0.66, 0.66), (0, 0.06, CZ + 0.03), verde, e1=0.55, e2=0.55))
    cab.append(superellipsoid((0.5, 0.06, 0.5), (0, -0.3, CZ - 0.04), pele, e1=0.5, e2=0.5))
    # Máscara amarela com o vidro azul e um reflexo; snorkel do lado.
    cab.append(superellipsoid((0.5, 0.1, 0.24), (0, -0.33, CZ + 0.05), amarelo, e1=0.4, e2=0.4))
    cab.append(superellipsoid((0.42, 0.04, 0.17), (0, -0.38, CZ + 0.05), c('#94d5f5', 0.1), e1=0.4, e2=0.4))
    cab.append(box((0.04, 0.01, 0.13), (-0.08, -0.405, CZ + 0.07), 'olho', bevel=0.004, rot=(0, R(35), 0)))
    cab.append(tube([(-0.36, -0.1, CZ - 0.1), (-0.42, -0.05, CZ + 0.2), (-0.42, 0.0, CZ + 0.45),
                     (-0.36, -0.08, CZ + 0.52)], [0.035] * 4, amarelo, seg=8))
    _animar_boneco('mergulhador', partes)


def robo():
    reset()
    claro, escuro, amarelo = c('#a5bbca', 0.5), c('#6e829a', 0.5), c('#f3b123', 0.4)
    partes = {'Corpo': [], 'Cabeca': [], 'PernaE': [], 'PernaD': [], 'BracoE': [], 'BracoD': []}
    for s, lado in ((-1, 'E'), (1, 'D')):
        x = s * 0.1
        partes['Perna' + lado] += [cyl(0.06, 0.24, (x, 0, 0.19), escuro, verts=12),
                                   superellipsoid((0.17, 0.26, 0.09), (x, -0.03, 0.045), c('#19283d', 0.5),
                                                  e1=0.4, e2=0.4, flat_bottom=0.2)]
        partes['Braco' + lado] += [sphere(0.07, (s * 0.22, 0, 0.63), escuro, subdiv=2),
                                   tube([(s * 0.235, 0, 0.6), (s * 0.26, -0.01, 0.42)], [0.04, 0.04], escuro, seg=8),
                                   sphere(0.065, (s * 0.262, -0.02, 0.38), amarelo, subdiv=2)]
    corpo = partes['Corpo']
    corpo.append(superellipsoid((0.4, 0.3, 0.42), (0, 0, 0.53), claro, e1=0.3, e2=0.35))
    corpo.append(superellipsoid((0.16, 0.04, 0.14), (0, -0.155, 0.56), c('#293f61'), e1=0.3, e2=0.35))
    corpo.append(sphere(0.045, (0, -0.17, 0.56), amarelo, subdiv=2))
    corpo.append(cyl(0.07, 0.1, (0, 0, 0.75), escuro, verts=12))
    cab = partes['Cabeca']
    cab.append(superellipsoid((0.66, 0.56, 0.58), (0, 0, CZ), claro, e1=0.3, e2=0.3))
    cab.append(superellipsoid((0.48, 0.06, 0.34), (0, -0.27, CZ - 0.01), c('#293f61', 0.3), e1=0.3, e2=0.3))
    azul = c('#94d5f5', 0.2)
    lib_q.PALETTE[azul] = ('#94d5f5', 0.2, '#94d5f5', 0.6)
    for s in (-1, 1):
        cab.append(superellipsoid((0.08, 0.03, 0.12), (s * 0.11, -0.3, CZ + 0.04), azul, e1=0.4, e2=0.4))
        cab.append(cyl(0.05, 0.08, (s * 0.34, 0, CZ), amarelo, verts=12, rot=(0, R(90), 0)))
    cab.append(box((0.16, 0.02, 0.035), (0, -0.305, CZ - 0.09), 'olho', bevel=0.008))
    cab.append(cyl(0.02, 0.14, (0, 0, CZ + 0.36), escuro, verts=8))
    cab.append(sphere(0.055, (0, 0, CZ + 0.45), c('#e05245', 0.4), subdiv=2))
    _animar_boneco('robo', partes)


TODOS = ['menina-de-laco', 'marinheira', 'menino-de-bone', 'exploradora-de-chapeu', 'pirata', 'mergulhador', 'robo']
