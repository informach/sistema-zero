"""Os quatro tiros de plasma (Poder Troca de arma): grandes, redondos e lentos, para a criança ver
de longe que a arma mudou. Na caixa `plasma` (0,6 de largura, 0,8 de comprimento no eixo do voo,
frente em +Y, como os lasers da nave da criança).

    python plasmas.py
"""
import math
import sys

from lib_poderes import R, cor, exportar, reset, sphere, superellipsoid, torus


def bola(pid, nucleo, casca, forma):
    reset()
    cor('nucleo', '#ffffff', 0.3, nucleo, 1.4)
    cor('casca', casca, 0.3, casca, 1.0, alfa=0.55)
    cor('faisca', nucleo, 0.3, nucleo, 1.6)
    pecas = []
    if forma == 'aneis':
        pecas += [sphere(0.16, (0, 0.1, 0), 'nucleo', subdiv=3), sphere(0.25, (0, 0.1, 0), 'casca', subdiv=3)]
        pecas += [torus(0.27, 0.02, (0, 0.1, 0), 'faisca', seg=24, rseg=5, rot=(R(a), R(b), 0)) for a, b in ((90, 0), (30, 60))]
    elif forma == 'cometa':
        pecas += [sphere(0.18, (0, 0.18, 0), 'nucleo', subdiv=3), sphere(0.26, (0, 0.14, 0), 'casca', subdiv=3)]
        pecas.append(superellipsoid((0.3, 0.5, 0.3), (0, -0.14, 0), 'casca', e1=0.9, e2=1.0, seg=18, ring=10))
    elif forma == 'estrela':
        pecas += [sphere(0.15, (0, 0.05, 0), 'nucleo', subdiv=3), sphere(0.22, (0, 0.05, 0), 'casca', subdiv=2)]
        for k in range(6):
            a = 2 * math.pi * k / 6
            pecas.append(sphere(0.05, (math.cos(a) * 0.24, 0.05, math.sin(a) * 0.24), 'faisca', subdiv=1))
    else:  # cubo de energia
        nucleo_cubo = superellipsoid((0.26, 0.26, 0.26), (0, 0.05, 0), 'nucleo', e1=0.3, e2=0.3, seg=16, ring=8)
        nucleo_cubo.rotation_euler = (R(45), R(35), 0)
        pecas += [nucleo_cubo, sphere(0.27, (0, 0.05, 0), 'casca', subdiv=2)]
    return exportar(pid, pecas, 'plasma')


PLASMAS = {
    'plasma-roxo': lambda: bola('plasma-roxo', '#f5d0fe', '#a855f7', 'aneis'),
    'plasma-verde': lambda: bola('plasma-verde', '#dcfce7', '#22c55e', 'cometa'),
    'plasma-laranja': lambda: bola('plasma-laranja', '#ffedd5', '#f97316', 'estrela'),
    'plasma-azul': lambda: bola('plasma-azul', '#e0f2fe', '#3b82f6', 'cubo'),
}

if __name__ == '__main__':
    for pid in sys.argv[1:] or PLASMAS:
        PLASMAS[pid]()
