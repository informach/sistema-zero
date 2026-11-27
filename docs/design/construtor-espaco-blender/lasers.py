"""Os quatro lasers da Patrulha Espacial (e da Nave Contra Asteroides, pelo `svg2d.py`).

Todos na caixa `laser` (0,9 de comprimento no eixo do voo, +Y é a frente). Um núcleo quase
branco que brilha por dentro de uma casca translúcida da cor do laser; a casca não faz sombra.

    python lasers.py
"""
import sys

from lib_espaco import R, cor, cyl, exportar, reset, sphere, superellipsoid, torus


def capsula(raio, comp, centro, m, seg=16):
    """Cápsula deitada no eixo y."""
    return superellipsoid((raio * 2, comp, raio * 2), centro, m, e1=0.9, e2=1.0, seg=seg, ring=10)


def nucleo_e_casca(x, z, comp, r_nucleo, r_casca, nucleo, casca, y=0.0):
    return [capsula(r_nucleo, comp, (x, y, z), nucleo), capsula(r_casca, comp + r_casca * 0.6, (x, y, z), casca)]


def laser_ciano():
    """O raio clássico: um traço comprido e reto."""
    reset()
    cor('nucleo', '#f2feff', 0.3, '#d8fbff', 1.2)
    cor('casca', '#0e7490', 0.3, '#22d3ee', 1.0, alfa=0.55)
    return exportar('laser-ciano', nucleo_e_casca(0, 0, 0.82, 0.045, 0.1, 'nucleo', 'casca'), 'laser')


def laser_dourado():
    """Dois raios lado a lado, como um tiro duplo."""
    reset()
    cor('nucleo', '#fffbea', 0.3, '#fff3c0', 1.2)
    cor('casca', '#92400e', 0.3, '#fbbf24', 1.0, alfa=0.6)
    pecas = []
    for x in (-0.075, 0.075):
        pecas += nucleo_e_casca(x, 0, 0.78, 0.03, 0.06, 'nucleo', 'casca')
    return exportar('laser-dourado', pecas, 'laser')


def laser_lilas():
    """Bola de plasma com anéis que giram em volta do caminho."""
    reset()
    cor('nucleo', '#fdf4ff', 0.3, '#f5d0fe', 1.2)
    cor('casca', '#581c87', 0.3, '#c084fc', 1.0, alfa=0.55)
    cor('anel', '#3b0764', 0.3, '#d8b4fe', 1.0)
    pecas = nucleo_e_casca(0, 0, 0.78, 0.05, 0.09, 'nucleo', 'casca')
    for y, r in ((0.2, 0.105), (0.0, 0.118), (-0.2, 0.105)):
        pecas.append(torus(r, 0.016, (0, y, 0), 'anel', seg=20, rseg=6, rot=(R(90), 0, 0)))
    return exportar('laser-lilas', pecas, 'laser')


def laser_verde():
    """Ponta de flecha com três pedaços que vão diminuindo para trás."""
    reset()
    cor('nucleo', '#f7fff0', 0.3, '#dcffc4', 1.2)
    cor('casca', '#14532d', 0.3, '#4ade80', 1.0, alfa=0.6)
    cor('ponta', '#166534', 0.3, '#86efac', 1.1)
    pecas = [cyl(0.11, 0.24, (0, 0.31, 0), 'ponta', verts=4, rot=(R(-90), R(45), 0), r2=0.0)]
    for y, comp, r in ((0.08, 0.26, 0.07), (-0.17, 0.2, 0.055), (-0.36, 0.14, 0.04)):
        pecas += nucleo_e_casca(0, 0, comp, r * 0.45, r, 'nucleo', 'casca', y=y)
    for p in pecas[:1]:
        for f in p.data.polygons:
            f.use_smooth = False
    return exportar('laser-verde', pecas, 'laser')


LASERS = {
    'laser-ciano': laser_ciano,
    'laser-dourado': laser_dourado,
    'laser-lilas': laser_lilas,
    'laser-verde': laser_verde,
}

if __name__ == '__main__':
    pedidas = [a for a in sys.argv[1:] if not a.startswith('-')] or list(LASERS)
    for pid in pedidas:
        LASERS[pid]()
