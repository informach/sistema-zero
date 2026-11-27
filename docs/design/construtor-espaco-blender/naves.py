"""As quatro naves da Patrulha Espacial (e da Nave Contra Asteroides, pelo `svg2d.py`).

Todas na caixa `nave` (envergadura 3, comprimento 2,3), bico em +Y. A câmera do jogo vê a nave
por TRÁS e de cima, então o capricho mora no topo e na traseira: cabine, faixas, motores com o
brilho da chama, luzes de navegação (vermelha à esquerda, verde à direita, como nos aviões).

    python naves.py                 # as quatro
    python naves.py nave-arraia-lilas
"""
import sys

from lib_espaco import (R, Vector, asa, cor, cyl, cyl_y, espelhar_x, exportar, loft, mat, pintar_faces,
                        placa, placa_vertical, reset, sphere, topo_de, superellipsoid, torus, corpo_lente, uvball, box,
                        tube)


def comuns():
    cor('motor', '#2f3646', 0.5)
    cor('motorAnel', '#a7b2c7', 0.35)
    cor('grafite', '#252a36', 0.55)
    cor('luzVermelha', '#ff5a5a', 0.3, '#ff3030', 2.2)
    cor('luzVerde', '#62ff8f', 0.3, '#2cff6b', 2.2)
    cor('vidro', '#10285a', 0.08, '#1b47b8', 0.35)
    cor('vidroReflexo', '#d6f1ff', 0.1, '#bfe9ff', 0.9)


def luzes_de_ponta(x, y, z, r=0.04):
    """Vermelha na ponta esquerda, verde na direita."""
    return [sphere(r, (-x, y, z), 'luzVermelha', subdiv=1), sphere(r, (x, y, z), 'luzVerde', subdiv=1)]


def motor(x, y_tras, y_frente, z, r_tras, r_frente, chama, anel=True, bocal=0.85):
    """Nacele com o anel de trás e a chama acesa no bocal (o que a câmera mais vê)."""
    comp = y_frente - y_tras
    pecas = [cyl_y(r_tras, comp, (x, (y_tras + y_frente) / 2, z), 'motor', verts=20, r2=r_frente, bevel=0.01)]
    if anel:
        pecas.append(torus(r_tras * 0.98, r_tras * 0.16, (x, y_tras + 0.02, z), 'motorAnel', seg=24, rseg=6,
                           rot=(R(90), 0, 0)))
    pecas.append(cyl_y(r_tras * bocal, 0.035, (x, y_tras - 0.005, z), chama, verts=20))
    pecas.append(cyl_y(r_tras * bocal * 0.85, 0.09, (x, y_tras - 0.06, z), chama, verts=16, r2=r_tras * bocal * 0.35))
    return pecas


def derivas(x, z, contorno, contorno_ponta, m, m_ponta, inclinar=16, esp=0.045):
    """Deriva (leme) do lado direito: desenhada em pé no x = 0, inclinada para fora e posta em
    (x, z). `contorno` e `contorno_ponta` são (y, z) a partir da base."""
    pecas = [placa_vertical(contorno, -esp / 2, esp / 2, m, bevel=0.008)]
    if contorno_ponta:
        pecas.append(placa_vertical(contorno_ponta, -esp / 2 - 0.002, esp / 2 + 0.002, m_ponta, bevel=0.006))
    for p in pecas:
        p.rotation_euler = (0, R(inclinar), 0)
        p.location = (x, 0, z)
    return pecas


def cabine(y, z, largura, comprimento, altura, moldura):
    """Cabine de vidro com um reflexo comprido e a moldura de trás."""
    vidro = superellipsoid((largura, comprimento, altura * 2), (0, y, z), 'vidro', e1=0.55, e2=0.75,
                           seg=24, ring=14, meia=True)
    reflexo = superellipsoid((largura * 0.18, comprimento * 0.5, altura * 0.5), (-largura * 0.18, y + comprimento * 0.12, z + altura * 0.78),
                             'vidroReflexo', e1=0.6, e2=0.6, seg=12, ring=8)
    aro = superellipsoid((largura * 1.12, comprimento * 0.28, altura * 1.25), (0, y - comprimento * 0.46, z), moldura,
                         e1=0.6, e2=0.7, seg=20, ring=10, meia=True)
    return [vidro, reflexo, aro]


# ---------------------------------------------------------------------------------------------
def falcao_azul():
    """Caça clássico: fuselagem afilada, asas em flecha com bordo de ataque branco e ponta
    amarela, dois motores com chama ciano e duas derivas inclinadas."""
    reset()
    comuns()
    cor('casco', '#2f6df0', 0.42)
    cor('cascoEscuro', '#1c3c91', 0.5)
    cor('branco', '#f3f6ff', 0.45)
    cor('amarelo', '#ffc93a', 0.45)
    cor('chama', '#b8fbff', 0.3, '#3fe3ff', 2.6)
    fus = loft([
        (-1.0, 0.2, 0.14, 0.02), (-0.94, 0.27, 0.19, 0.03), (-0.6, 0.31, 0.22, 0.04), (-0.1, 0.3, 0.22, 0.05),
        (0.35, 0.24, 0.18, 0.05), (0.7, 0.16, 0.12, 0.035), (0.97, 0.075, 0.065, 0.015), (1.14, 0.012, 0.012, 0.0),
    ], 'casco', n=20, ex=2.6, achatar_baixo=0.7)
    pintar_faces(fus, 'cascoEscuro', lambda c, n: n.z < -0.35)
    pintar_faces(fus, 'branco', lambda c, n: abs(c.x) < 0.075 and n.z > 0.75 and c.y < 0.2)
    pintar_faces(fus, 'grafite', lambda c, n: c.y > 1.0)
    pecas = [fus]
    pecas += cabine(0.34, 0.15, 0.3, 0.62, 0.16, 'branco')
    asa_d = asa((0.22, 0.26), (0.22, -0.8), (1.42, -0.46), (1.42, -0.8), -0.025, 0.065, [
        (0.0, 0.84, 0.0, 0.2, 'branco'), (0.0, 0.84, 0.2, 0.56, 'casco'), (0.0, 0.84, 0.56, 0.6, 'cascoEscuro'),
        (0.0, 0.84, 0.6, 1.0, 'casco'), (0.84, 1.0, 0.0, 1.0, 'amarelo'),
    ])
    canhao = [cyl_y(0.045, 0.5, (1.3, -0.16, 0.02), 'motorAnel', verts=12, r2=0.038),
              cyl_y(0.058, 0.06, (1.3, 0.1, 0.02), 'grafite', verts=12),
              cyl_y(0.06, 0.16, (1.3, -0.45, 0.02), 'branco', verts=12, bevel=0.01)]
    deriva = derivas(0.36, 0.1, [(-1.0, 0.0), (-0.58, 0.0), (-0.865, 0.25), (-0.99, 0.25)],
                     [(-0.99, 0.25), (-0.865, 0.25), (-0.9, 0.31), (-0.99, 0.33)], 'casco', 'amarelo', 16)
    lado = asa_d + canhao + deriva
    lado += motor(0.36, -1.0, -0.42, 0.0, 0.15, 0.12, 'chama')
    pecas += espelhar_x(lado)
    pecas += luzes_de_ponta(1.43, -0.6, 0.04)
    return exportar('nave-falcao-azul', pecas, 'nave')


# ---------------------------------------------------------------------------------------------
def exploradora_coral():
    """Exploradora simpática: corpo redondo, cabine-bolha grande, asas curtas com cápsulas de
    motor nas pontas, antena com luz e janelinhas redondas."""
    reset()
    comuns()
    cor('coral', '#ff6b57', 0.45)
    cor('creme', '#ffe7c4', 0.55)
    cor('turquesa', '#22c7b8', 0.4)
    cor('chama', '#ffe2a8', 0.3, '#ff9a2e', 2.6)
    cor('janela', '#123c4f', 0.1, '#33d1ff', 0.6)
    cor('antenaLuz', '#9ffcf2', 0.3, '#2ff5dc', 2.4)
    fus = loft([
        (-0.95, 0.24, 0.19, 0.02), (-0.86, 0.35, 0.27, 0.03), (-0.45, 0.42, 0.31, 0.04), (-0.27, 0.42, 0.31, 0.045),
        (-0.13, 0.42, 0.31, 0.045), (0.1, 0.41, 0.3, 0.05),
        (0.5, 0.33, 0.25, 0.04), (0.8, 0.22, 0.17, 0.02), (0.97, 0.1, 0.08, 0.0), (1.02, 0.02, 0.02, 0.0),
    ], 'coral', n=20, ex=2.2, achatar_baixo=0.75)
    pintar_faces(fus, 'creme', lambda c, n: n.z < -0.3)
    pintar_faces(fus, 'turquesa', lambda c, n: -0.27 < c.y < -0.13 and n.z > -0.3)
    pintar_faces(fus, 'creme', lambda c, n: c.y > 0.9)
    pecas = [fus]
    pecas += cabine(0.4, 0.18, 0.46, 0.6, 0.22, 'creme')
    lado = asa((0.36, 0.08), (0.36, -0.58), (1.04, -0.18), (1.04, -0.56), -0.03, 0.06, [
        (0.0, 1.0, 0.0, 0.62, 'coral'), (0.0, 1.0, 0.62, 1.0, 'creme'),
    ], afinar_ponta=0.3)
    capsula = loft([(-0.62, 0.1, 0.1, 0), (-0.55, 0.17, 0.17, 0), (-0.12, 0.19, 0.19, 0), (0.0, 0.19, 0.19, 0),
                    (0.24, 0.15, 0.15, 0), (0.38, 0.06, 0.06, 0), (0.42, 0.01, 0.01, 0)], 'coral', n=18, ex=2.0)
    pintar_faces(capsula, 'creme', lambda c, n: -0.12 < c.y < 0.0)
    pintar_faces(capsula, 'turquesa', lambda c, n: c.y > 0.3)
    capsula.location = (1.22, 0, 0.02)
    lado.append(capsula)
    lado += motor(1.22, -0.64, -0.55, 0.02, 0.12, 0.12, 'chama')
    lado += derivas(1.22, 0.18, [(-0.5, 0.0), (-0.2, 0.0), (-0.38, 0.16), (-0.5, 0.17)], None, 'creme', None, 0, 0.035)
    lado += [sphere(0.05, (0.41, y, 0.08), 'janela', scale=(0.45, 1, 1), subdiv=2) for y in (-0.42, 0.0, 0.2)]
    pecas += espelhar_x(lado)
    pecas += motor(0.0, -0.95, -0.7, 0.03, 0.15, 0.14, 'chama')
    pecas += [cyl(0.014, 0.12, (0, -0.42, 0.37), 'motorAnel', verts=8), sphere(0.035, (0, -0.42, 0.425), 'antenaLuz', subdiv=1)]
    pecas += luzes_de_ponta(1.22, 0.38, 0.12, r=0.035)
    return exportar('nave-exploradora-coral', pecas, 'nave')


# ---------------------------------------------------------------------------------------------
def arraia_lilas():
    """Asa voadora em forma de raia: corpo-lente largo, pontas em flecha, manchas claras no dorso,
    chifres na frente, ferrão de cauda e fios rosa que brilham no bordo de fuga."""
    reset()
    comuns()
    cor('lilas', '#b9a4ff', 0.42)
    cor('roxo', '#4c2a9e', 0.5)
    cor('mancha', '#efe6ff', 0.5)
    cor('roxoMeio', '#7454d8', 0.45)
    cor('rosaLuz', '#ffc2e6', 0.3, '#ff4fb8', 2.4)
    cor('chama', '#ffd0f0', 0.3, '#ff3fd0', 2.6)
    corpo = corpo_lente([
        (-0.74, 0.24, 0.16, 0.02), (-0.62, 0.88, 0.26, 0.02), (-0.47, 1.44, 0.32, 0.03), (-0.22, 1.28, 0.4, 0.03),
        (0.12, 0.98, 0.44, 0.03), (0.48, 0.66, 0.38, 0.03), (0.78, 0.44, 0.26, 0.02), (0.95, 0.34, 0.14, 0.02),
    ], 'lilas', colunas=30, perfil=0.6, linhas=26)
    pintar_faces(corpo, 'roxo', lambda c, n: n.z < -0.2)
    pecas = [corpo]
    pecas += cabine(0.44, 0.17, 0.3, 0.42, 0.13, 'roxo')
    lado = [tube([(0.26, 0.86, 0.02), (0.32, 1.0, 0.03), (0.33, 1.12, 0.05)], [0.07, 0.05, 0.02], 'roxo', seg=10)]
    lado += [tube([(0.26, -0.72, 0.03), (0.75, -0.64, 0.035), (1.18, -0.54, 0.04), (1.4, -0.48, 0.04)],
                  [0.018, 0.02, 0.018, 0.012], 'rosaLuz', seg=8)]
    for c0 in (0.06, -0.27):
        pts = []
        for i in range(9):
            x = 0.04 + i * 0.13
            y = c0 - 0.62 * x
            z = topo_de(corpo, x, y)
            if z is None:
                break
            pts.append((x, y, z + 0.006))
        if len(pts) > 2:
            lado.append(tube(pts, [0.03] * len(pts), 'roxoMeio', seg=6))
    for x, y, r in ((0.55, -0.12, 0.08), (0.84, -0.3, 0.065), (0.36, 0.2, 0.065), (1.08, -0.42, 0.045)):
        z = topo_de(corpo, x, y)
        lado.append(sphere(r, (x, y, z - 0.004), 'mancha', scale=(1, 1, 0.22), subdiv=2))
    lado += motor(0.32, -0.74, -0.5, 0.03, 0.08, 0.08, 'chama', anel=False)
    pecas += espelhar_x(lado)
    # as manchas acompanham o dorso: sobem até a superfície de cima do corpo
    pecas += [tube([(0, -0.66, 0.04), (0, -0.9, 0.06), (0, -1.12, 0.09)], [0.05, 0.03, 0.008], 'roxo', seg=10),
              box((0.42, 0.05, 0.07), (0, -0.74, 0.04), 'chama', bevel=0.02)]
    pecas += luzes_de_ponta(1.42, -0.47, 0.04, r=0.035)
    pecas += derivas(0.0, 0.12, [(-0.7, 0.0), (-0.35, 0.0), (-0.55, 0.2), (-0.7, 0.22)], None, 'roxo', None, 0, 0.04)
    return exportar('nave-arraia-lilas', pecas, 'nave')


# ---------------------------------------------------------------------------------------------
def cometa_verde():
    """Interceptadora de corrida: bico de agulha, canards na frente, asas delta com pontas
    viradas para cima, três motores de chama verde-limão e faixas de corrida."""
    reset()
    comuns()
    cor('grafiteCasco', '#30384a', 0.45)
    cor('verde', '#2fcf62', 0.4)
    cor('limao', '#c6f04a', 0.42)
    cor('amarelo', '#ffd23f', 0.45)
    cor('vidroCometa', '#0d3a37', 0.08, '#17c4ae', 0.45)
    cor('chama', '#f2ffc4', 0.3, '#a6ff3a', 2.6)
    fus = loft([
        (-1.0, 0.17, 0.13, 0.02), (-0.9, 0.21, 0.155, 0.03), (-0.4, 0.22, 0.165, 0.04), (0.2, 0.175, 0.14, 0.04),
        (0.65, 0.11, 0.09, 0.03), (0.95, 0.05, 0.045, 0.01), (1.15, 0.008, 0.008, 0.0),
    ], 'grafiteCasco', n=20, ex=2.6, achatar_baixo=0.7)
    pintar_faces(fus, 'verde', lambda c, n: n.z > 0.45 and c.y < 0.9)
    pintar_faces(fus, 'limao', lambda c, n: abs(c.x) < 0.05 and n.z > 0.8)
    pintar_faces(fus, 'amarelo', lambda c, n: c.y > 0.95)
    pecas = [fus]
    vidro = superellipsoid((0.17, 0.56, 0.26), (0, 0.3, 0.1), 'vidroCometa', e1=0.5, e2=0.7, seg=24, ring=14, meia=True)
    pecas += [vidro, superellipsoid((0.04, 0.26, 0.05), (-0.03, 0.38, 0.215), 'vidroReflexo', e1=0.6, e2=0.6, seg=10, ring=6)]
    lado = asa((0.12, 0.74), (0.12, 0.5), (0.5, 0.58), (0.5, 0.48), -0.01, 0.035, [(0, 1, 0, 1, 'verde')], afinar_ponta=0.4)
    lado += asa((0.18, -0.02), (0.18, -0.92), (1.3, -0.76), (1.3, -0.94), -0.02, 0.055, [
        (0.0, 1.0, 0.0, 0.16, 'verde'), (0.0, 1.0, 0.16, 0.5, 'grafiteCasco'), (0.0, 1.0, 0.5, 0.6, 'amarelo'),
        (0.0, 1.0, 0.6, 1.0, 'grafiteCasco'),
    ])
    lado += derivas(1.31, 0.02, [(-0.95, 0.0), (-0.72, 0.0), (-0.86, 0.26), (-0.96, 0.28)],
                    [(-0.96, 0.21), (-0.81, 0.21), (-0.86, 0.26), (-0.96, 0.28)], 'verde', 'limao', 20, 0.035)
    lado += motor(0.27, -0.98, -0.64, 0.0, 0.095, 0.08, 'chama')
    lado += [box((0.07, 0.3, 0.09), (0.21, 0.02, -0.01), 'grafite', bevel=0.02)]
    pecas += espelhar_x(lado)
    pecas += motor(0.0, -1.0, -0.6, 0.04, 0.125, 0.11, 'chama')
    pecas += luzes_de_ponta(1.33, -0.9, 0.06, r=0.03)
    return exportar('nave-cometa-verde', pecas, 'nave')


NAVES = {
    'nave-falcao-azul': falcao_azul,
    'nave-exploradora-coral': exploradora_coral,
    'nave-arraia-lilas': arraia_lilas,
    'nave-cometa-verde': cometa_verde,
}

if __name__ == '__main__':
    pedidas = [a for a in sys.argv[1:] if not a.startswith('-')] or list(NAVES)
    for pid in pedidas:
        NAVES[pid]()
