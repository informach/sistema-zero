"""Faróis da ilha: o farol listrado (vermelho e branco), apagado e aceso.

Referencial do projeto do Molda que ele substitui: base no chão (z = 0), torre centrada na origem
e a PORTA virada para a câmera (-Y no Blender, +Z no jogo). O pé do farol mede ~1,8 de lado, como
o atual, porque a caixa do modelo é a área que o personagem toca para abrir a porta.

O desenho segue `farol-listrado-{apagado,aceso}.svg`: base vermelha com tampo laranja, torre
branca afunilada com três faixas vermelhas, lanterna de vidro escuro com caixilhos brancos, telhado
cônico vermelho com bolinha na ponta; aceso, o vidro brilha amarelo e dois feixes saem para os lados.
"""
from lib_ilha import *

BASE_H = 0.3          # pedestal
TORRE_H = 3.05        # do pedestal até a galeria
R0, R1 = 0.66, 0.5    # raio da torre embaixo e em cima


def _raio(z):
    t = (z - BASE_H) / TORRE_H
    return R0 + (R1 - R0) * t


def _faixa(z0, z1, m, folga=0.012):
    r0, r1 = _raio(z0) + folga, _raio(z1) + folga
    o = cyl(r0, z1 - z0, (0, 0, (z0 + z1) / 2), m, verts=28, r2=r1)
    return o


def farol_listrado(aceso=False):
    reset()
    p = []
    # Pedestal: cilindro vermelho com tampo laranja chanfrado (o "prato" do desenho).
    p.append(cyl(0.86, BASE_H - 0.06, (0, 0, (BASE_H - 0.06) / 2), 'farolVermelho', verts=28, bevel=0.03))
    p.append(cyl(0.88, 0.07, (0, 0, BASE_H - 0.035), 'farolLaranja', verts=28, bevel=0.025))
    # Torre branca afunilada e três faixas vermelhas (a de cima encosta na galeria, como no 2D).
    p.append(cyl(R0, TORRE_H, (0, 0, BASE_H + TORRE_H / 2), 'farolBranco', verts=28, r2=R1))
    topo = BASE_H + TORRE_H
    for z0, z1 in ((1.02, 1.48), (1.92, 2.38), (2.82, BASE_H + TORRE_H)):
        p.append(_faixa(z0, z1, 'farolVermelho'))
    p.append(_faixa(BASE_H, BASE_H + 0.1, 'farolVermelho', folga=0.02))
    # Galeria: piso escuro mais largo, com mãos-francesas embaixo e gradil branco em volta.
    p.append(cyl(0.74, 0.1, (0, 0, topo + 0.05), 'marinho', verts=28, bevel=0.025))
    p.append(cyl(R1 + 0.02, 0.14, (0, 0, topo - 0.06), 'marinho', verts=28, r2=0.68))
    for i in range(12):
        a = 2 * math.pi * i / 12
        p.append(cyl(0.014, 0.24, (0.7 * math.cos(a), 0.7 * math.sin(a), topo + 0.22), 'farolBranco',
                     verts=6, smooth_sides=False))
    p.append(torus(0.7, 0.018, (0, 0, topo + 0.34), 'farolBranco', seg=32, rseg=5))
    p.append(torus(0.7, 0.012, (0, 0, topo + 0.21), 'farolBranco', seg=32, rseg=4))
    # Lanterna: vidro cilíndrico com oito caixilhos brancos, aro de baixo e de cima.
    zl0, zl1 = topo + 0.1, topo + 0.86
    p.append(cyl(0.47, zl1 - zl0, (0, 0, (zl0 + zl1) / 2), 'vidroAceso' if aceso else 'vidroApagado', verts=32))
    p.append(cyl(0.53, 0.08, (0, 0, zl0 + 0.04), 'farolVermelho', verts=28, bevel=0.02))
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        p.append(box((0.05, 0.05, zl1 - zl0), (0.48 * math.cos(a), 0.48 * math.sin(a), (zl0 + zl1) / 2),
                     'farolBranco', bevel=0.0, rot=(0, 0, a)))
    p.append(torus(0.475, 0.025, (0, 0, (zl0 + zl1) / 2 + 0.1), 'farolBranco', seg=28, rseg=5))
    if aceso:
        # A lâmpada aparece pelo vidro.
        p.append(sphere(0.2, (0, 0, (zl0 + zl1) / 2), 'lampada', subdiv=2))
    else:
        # Apagada: a lente escura (um "olho" de vidro) fica no centro.
        p.append(cyl(0.12, 0.34, (0, 0, (zl0 + zl1) / 2), 'marinho', verts=16))
    # Telhado: aba marinho, cone vermelho com gomos e bolinha na ponta.
    p.append(cyl(0.6, 0.07, (0, 0, zl1 + 0.035), 'marinho', verts=28, bevel=0.02))
    roof = cyl(0.63, 0.72, (0, 0, zl1 + 0.07 + 0.36), 'farolVermelho', verts=28, r2=0.05)
    p.append(roof)
    for i in range(8):
        a = 2 * math.pi * i / 8
        # Gomos do telhado: frisos finos que descem da ponta até a aba.
        p.append(tube([(0.07 * math.cos(a), 0.07 * math.sin(a), zl1 + 0.78),
                       (0.63 * math.cos(a), 0.63 * math.sin(a), zl1 + 0.08)], [0.016, 0.022], 'farolLaranja', seg=5))
    p.append(cyl(0.04, 0.12, (0, 0, zl1 + 0.86), 'farolVermelho', verts=10))
    p.append(sphere(0.085, (0, 0, zl1 + 0.98), 'farolVermelho', subdiv=2))
    # Porta em arco virada para a câmera, com batente branco, frisos e maçanetas.
    rd = _raio(0.6)
    arco = [(0.2 * math.cos(math.pi * i / 12), 0.42 + 0.2 * math.sin(math.pi * i / 12)) for i in range(13)]
    porta = [(0.2, 0.0)] + arco + [(-0.2, 0.0)]
    batente = [(x * 1.32, z * 1.12) for x, z in porta]
    p.append(prism(batente, 0.08, (0, -rd + 0.02, BASE_H + 0.0), 'farolBranco', bevel=0.012))
    p.append(prism(porta, 0.1, (0, -rd - 0.005, BASE_H + 0.0), 'ardosia', bevel=0.012))
    p.append(box((0.014, 0.02, 0.56), (0, -rd - 0.06, BASE_H + 0.29), 'marinho', bevel=0.004))
    for s in (-1, 1):
        p.append(sphere(0.026, (s * 0.06, -rd - 0.07, BASE_H + 0.32), 'ouro', subdiv=1))
    if aceso:
        # Feixes: cones abertos e translúcidos para os dois lados, como as faixas do desenho.
        zc = (zl0 + zl1) / 2
        for s in (-1, 1):
            # Estreito junto ao vidro e largo na ponta, como as faixas do desenho.
            p.append(cyl(0.08, 2.0, (s * 1.5, 0, zc), 'feixe', verts=24, r2=0.5, rot=(0, R(90) * s, 0)))
    export('farol-listrado-aceso' if aceso else 'farol-listrado-apagado', p)


def farol_listrado_apagado():
    farol_listrado(False)


def farol_listrado_aceso():
    farol_listrado(True)


TODOS = ['farol-listrado-apagado', 'farol-listrado-aceso']
