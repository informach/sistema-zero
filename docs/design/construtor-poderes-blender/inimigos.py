"""As naves inimigas e os lasers delas (quatro de cada).

As naves ficam na caixa da nave da criança (envergadura 3), desenhadas com o bico em +Y como as
naves da Patrulha e giradas meia volta no fim (`virar_para_a_nave`): elas vêm do fundo, com o bico
para a câmera. Cores quentes e escuras, para nunca se confundirem com a nave da criança. Os lasers
inimigos ficam na caixa do laser e repetem o núcleo aceso dentro da casca translúcida.

    python inimigos.py
    python inimigos.py inimiga-disco-roxo
"""
import math
import sys

from lib_poderes import (R, asa, box, cor, cyl, cyl_y, espelhar_x, exportar, loft, pintar_faces, placa_vertical,
                         reset, sphere, superellipsoid, torus, tube, virar_para_a_nave)


def comuns():
    reset()
    cor('grafite', '#252a36', 0.55)
    cor('metal', '#8f9bab', 0.4)
    cor('olho', '#ffe4e4', 0.2, '#ff3b3b', 2.2)
    cor('chamaInimiga', '#ffd2b0', 0.3, '#ff6a2a', 2.4)


def motor_inimigo(x, y_tras, y_frente, z, r):
    return [cyl_y(r, y_frente - y_tras, (x, (y_tras + y_frente) / 2, z), 'grafite', verts=16, r2=r * 0.85, bevel=0.01),
            cyl_y(r * 0.8, 0.04, (x, y_tras - 0.01, z), 'chamaInimiga', verts=16)]


def garra_vermelha():
    """Caça de ataque: fuselagem vermelho-escura, asas em garra viradas para a frente, canhões."""
    comuns()
    cor('casco', '#9b1c2c', 0.45)
    cor('cascoEscuro', '#4a0d17', 0.5)
    cor('faixa', '#ff8a3d', 0.45)
    fus = loft([(-0.95, 0.18, 0.13, 0.02), (-0.6, 0.3, 0.2, 0.04), (0.0, 0.3, 0.21, 0.05), (0.5, 0.2, 0.15, 0.04),
                (0.9, 0.08, 0.07, 0.01), (1.1, 0.01, 0.01, 0.0)], 'casco', n=18, ex=2.4, achatar_baixo=0.7)
    pintar_faces(fus, 'cascoEscuro', lambda c, n: n.z < -0.3)
    pecas = [fus, superellipsoid((0.26, 0.44, 0.24), (0, 0.25, 0.12), 'olho', e1=0.5, e2=0.7, seg=20, ring=10, meia=True)]
    lado = asa((0.2, -0.5), (0.2, -0.9), (1.45, 0.55), (1.45, 0.25), -0.02, 0.06,
               [(0.0, 1.0, 0.0, 0.7, 'casco'), (0.0, 1.0, 0.7, 1.0, 'faixa')])
    lado += [cyl_y(0.04, 0.5, (1.3, 0.75, 0.0), 'metal', verts=10, r2=0.03)]
    lado += motor_inimigo(0.3, -1.0, -0.5, 0.0, 0.12)
    pecas += espelhar_x(lado)
    return exportar('inimiga-garra-vermelha', virar_para_a_nave(pecas, 'inimiga-garra-vermelha'), 'inimiga')


def disco_roxo():
    """Disco voador: prato largo roxo, cúpula com o olho aceso e um anel de luzes."""
    comuns()
    cor('prato', '#3b1580', 0.4)
    cor('pratoClaro', '#7c4ddb', 0.4)
    cor('cupula', '#1e1b4b', 0.1, '#7c3aed', 0.5)
    cor('luz', '#fde68a', 0.3, '#fbbf24', 2.0)
    prato = superellipsoid((2.9, 2.2, 0.36), (0, 0, 0.0), 'prato', e1=0.6, e2=1.0, seg=40, ring=14)
    pintar_faces(prato, 'pratoClaro', lambda c, n: n.z > 0.6)
    pecas = [prato, superellipsoid((1.0, 0.8, 0.66), (0, 0, 0.1), 'cupula', e1=0.6, e2=1.0, seg=28, ring=12, meia=True)]
    pecas.append(sphere(0.12, (0, 0.33, 0.24), 'olho', subdiv=2))
    aro = torus(1.12, 0.035, (0, 0, 0.09), 'grafite', seg=48, rseg=6)
    aro.scale = (1, 0.78, 1)
    pecas.append(aro)
    for k in range(12):
        a = 2 * math.pi * k / 12
        pecas.append(sphere(0.06, (math.cos(a) * 1.22, math.sin(a) * 0.9, 0.11), 'luz', subdiv=1))
    pecas.append(cyl(0.3, 0.12, (0, 0, -0.24), 'grafite', verts=20, r2=0.18))
    return exportar('inimiga-disco-roxo', virar_para_a_nave(pecas, 'inimiga-disco-roxo'), 'inimiga')


def vespa_amarela():
    """Vespa robô: corpo em gomos amarelos e pretos, asas finas translúcidas, ferrão atrás."""
    comuns()
    cor('amarelo', '#f5b70a', 0.45)
    cor('preto', '#1f2430', 0.5)
    cor('asaVespa', '#e0f2fe', 0.2, '#bae6fd', 0.4, alfa=0.45)
    pecas = []
    for i, (y, r) in enumerate(((-0.75, 0.2), (-0.5, 0.26), (-0.22, 0.28), (0.06, 0.24), (0.34, 0.2))):
        pecas.append(sphere(r, (0, y, 0.04), 'amarelo' if i % 2 == 0 else 'preto', scale=(1, 0.75, 0.8), subdiv=2))
    pecas.append(sphere(0.22, (0, 0.62, 0.06), 'preto', scale=(1, 0.9, 0.85), subdiv=2))
    pecas += [sphere(0.08, (x, 0.78, 0.12), 'olho', subdiv=2) for x in (-0.1, 0.1)]
    pecas.append(cyl_y(0.06, 0.3, (0, -1.0, 0.04), 'preto', verts=10, r2=0.0))
    lado = asa((0.15, 0.25), (0.15, -0.15), (1.48, 0.1), (1.48, -0.35), 0.1, 0.12, [(0, 1, 0, 1, 'asaVespa')], afinar_ponta=0.0)
    lado += asa((0.15, -0.2), (0.15, -0.45), (1.0, -0.55), (1.0, -0.75), 0.06, 0.08, [(0, 1, 0, 1, 'asaVespa')], afinar_ponta=0.0)
    lado += [tube([(0.12, y, -0.05), (0.32, y, -0.2), (0.38, y + 0.1, -0.3)], [0.025, 0.02, 0.015], 'preto', seg=6)
             for y in (-0.4, 0.0, 0.35)]
    pecas += espelhar_x(lado)
    return exportar('inimiga-vespa-amarela', virar_para_a_nave(pecas, 'inimiga-vespa-amarela'), 'inimiga')


def tridente_cinza():
    """Tridente: três pontas de metal escuro, com luzes laranja e um núcleo vermelho no meio."""
    comuns()
    cor('cinza', '#4b5563', 0.45)
    cor('cinzaClaro', '#9ca3af', 0.4)
    cor('laranja', '#fb923c', 0.4, '#f97316', 1.6)
    centro = loft([(-0.9, 0.22, 0.16, 0.03), (-0.4, 0.32, 0.22, 0.05), (0.3, 0.26, 0.18, 0.04), (0.9, 0.1, 0.08, 0.01),
                   (1.12, 0.01, 0.01, 0.0)], 'cinza', n=16, ex=2.2, achatar_baixo=0.7)
    pintar_faces(centro, 'cinzaClaro', lambda c, n: n.z > 0.6)
    pecas = [centro, sphere(0.14, (0, 0.1, 0.2), 'olho', subdiv=2)]
    lado = [loft([(-0.7, 0.12, 0.1, 0.0), (0.0, 0.14, 0.11, 0.0), (0.6, 0.08, 0.07, 0.0), (0.9, 0.01, 0.01, 0.0)],
                 'cinza', n=12, ex=2.2)]
    lado[0].location = (1.2, 0, 0)
    lado += [box((1.0, 0.24, 0.06), (0.7, -0.3, 0.0), 'cinzaClaro', bevel=0.02)]
    lado += [sphere(0.05, (1.2, y, 0.1), 'laranja', subdiv=1) for y in (-0.3, 0.1, 0.45)]
    lado += motor_inimigo(1.2, -0.95, -0.6, 0.0, 0.1)
    pecas += espelhar_x(lado)
    pecas += motor_inimigo(0.0, -1.05, -0.8, 0.03, 0.14)
    return exportar('inimiga-tridente-cinza', virar_para_a_nave(pecas, 'inimiga-tridente-cinza'), 'inimiga')


def capsula(raio, comp, centro, m, seg=16):
    return superellipsoid((raio * 2, comp, raio * 2), centro, m, e1=0.9, e2=1.0, seg=seg, ring=10)


def laser(pid, nucleo_cor, casca_cor, forma):
    reset()
    cor('nucleo', '#fff1f0', 0.3, nucleo_cor, 1.3)
    cor('casca', casca_cor, 0.3, casca_cor, 1.0, alfa=0.6)
    pecas = []
    if forma == 'espinho':
        pecas += [cyl_y(0.11, 0.8, (0, 0, 0), 'casca', verts=6, r2=0.0), cyl_y(0.05, 0.7, (0, 0.02, 0), 'nucleo', verts=6, r2=0.0)]
    elif forma == 'bola':
        pecas += [sphere(0.12, (0, 0.25, 0), 'casca', subdiv=2), sphere(0.07, (0, 0.25, 0), 'nucleo', subdiv=2),
                  capsula(0.05, 0.55, (0, -0.12, 0), 'casca')]
    elif forma == 'anel':
        pecas += [capsula(0.045, 0.8, (0, 0, 0), 'nucleo')]
        pecas += [torus(0.1, 0.022, (0, y, 0), 'casca', seg=16, rseg=5, rot=(R(90), 0, 0)) for y in (-0.25, 0.0, 0.25)]
    else:  # divisas
        for y in (0.25, 0.0, -0.25):
            for lado in (-1, 1):
                b = box((0.16, 0.05, 0.05), (lado * 0.055, y - 0.05, 0), 'casca', bevel=0.01)
                b.rotation_euler = (0, 0, R(-lado * 40))
                pecas.append(b)
        pecas.append(capsula(0.03, 0.7, (0, 0, 0), 'nucleo'))
    return exportar(pid, virar_para_a_nave(pecas, pid), 'laser-inimigo')


INIMIGAS = {
    'inimiga-garra-vermelha': garra_vermelha,
    'inimiga-disco-roxo': disco_roxo,
    'inimiga-vespa-amarela': vespa_amarela,
    'inimiga-tridente-cinza': tridente_cinza,
}
LASERS_INIMIGOS = {
    'laser-inimigo-vermelho': lambda: laser('laser-inimigo-vermelho', '#ff6b6b', '#dc2626', 'espinho'),
    'laser-inimigo-laranja': lambda: laser('laser-inimigo-laranja', '#ffb36b', '#ea580c', 'bola'),
    'laser-inimigo-rosa': lambda: laser('laser-inimigo-rosa', '#ff9bd2', '#db2777', 'anel'),
    'laser-inimigo-amarelo': lambda: laser('laser-inimigo-amarelo', '#fff1a6', '#ca8a04', 'divisas'),
}

if __name__ == '__main__':
    todas = {**INIMIGAS, **LASERS_INIMIGOS}
    for pid in sys.argv[1:] or todas:
        todas[pid]()
