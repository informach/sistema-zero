"""Os quatro asteroides da Patrulha Espacial (e da Nave Contra Asteroides, pelo `svg2d.py`).

Pedras de low-poly com facetas chapadas, todas esticadas até encher a caixa `asteroide` (o cubo de
1,8 do meteoro do exemplo): o contato fica justo, sem cantos vazios que tirem vida de longe.

    python asteroides.py
    python asteroides.py asteroide-lava-laranja
"""
import math
import sys

from lib_espaco import (Vector, cor, cyl, exportar, juntar, mat, noise, pintar_faces, reset, rocha, semente)

LIMITE = 0.885  # meia aresta que a pedra ocupa (a caixa é 0,9; sobra o marco de 1 mm)


def crateras(o, centros, profundidade=0.16, borda=0.05):
    """Cava crateras: (direção, raio angular). Devolve as direções para a pintura."""
    for v in o.data.vertices:
        d = v.co.normalized()
        r = v.co.length
        for c, a in centros:
            th = d.angle(c)
            if th < a:
                r *= 1 - profundidade * (1 - (th / a) ** 2)
            elif th < a * 1.35:
                r *= 1 + borda * math.sin((th - a) / (0.35 * a) * math.pi)
        v.co = d * r
    o.data.update()
    return centros


def encher_caixa(o):
    """Estica cada eixo até a pedra ocupar a caixa (contato justo, mesma forma geral)."""
    xs = [v.co for v in o.data.vertices]
    for i in range(3):
        lo, hi = min(p[i] for p in xs), max(p[i] for p in xs)
        meio, meia = (lo + hi) / 2, (hi - lo) / 2
        for p in xs:
            p[i] = (p[i] - meio) / meia * LIMITE
    o.data.update()
    return o


def caber(o):
    """Encolhe por igual (sem esticar) até caber na caixa: depois de pôr os cristais."""
    a = max(abs(c) for v in o.data.vertices for c in v.co)
    if a > LIMITE:
        k = LIMITE / a
        for v in o.data.vertices:
            v.co *= k
        o.data.update()
    return o


def cristal(base, direcao, r, h, m, m_ponta=None, giro=0.0):
    """Cristal de seis lados com a ponta em pirâmide, plantado em `base` e apontado para fora."""
    corpo = cyl(r, h, (0, 0, h / 2), m, verts=6, r2=r * 0.85)
    ponta = cyl(r * 0.85, h * 0.45, (0, 0, h + h * 0.225), m_ponta or m, verts=6, r2=0.0)
    for p in (corpo, ponta):
        for f in p.data.polygons:
            f.use_smooth = False
    peca = juntar([corpo, ponta], 'cristal')
    q = direcao.normalized().to_track_quat('Z', 'Y')
    peca.rotation_mode = 'QUATERNION'
    peca.rotation_quaternion = q
    peca.rotation_quaternion.rotate(q.__class__(direcao.normalized(), giro))
    peca.location = base
    return peca


def raio_em(o, d):
    """Distância do centro à superfície da pedra na direção `d` (vértice mais alinhado)."""
    melhor = max(o.data.vertices, key=lambda v: v.co.normalized().dot(d))
    return melhor.co.length


def manchas_por_ruido(o, escuro, claro, escala=2.6, corte=0.28, semente_=0):
    off = Vector((semente_ * 5.1, semente_ * 1.7, semente_ * 9.3))
    pintar_faces(o, escuro, lambda c, n: noise.noise(c * escala + off) < -corte)
    pintar_faces(o, claro, lambda c, n: noise.noise(c * escala + off) > corte + 0.05)


# ---------------------------------------------------------------------------------------------
def rocha_lunar():
    """Pedra cinza da Lua: crateras com fundo escuro e beirada clara."""
    reset()
    cor('rocha', '#9a9daa', 0.85)
    cor('rochaEscura', '#6b6f7e', 0.85)
    cor('rochaClara', '#c9cbd4', 0.8)
    cor('cratera', '#4e5262', 0.9)
    o = rocha(1.0, 'rocha', semente=3, subdiv=4, aspereza=0.18, escala_ruido=1.3)
    centros = [(Vector(d).normalized(), a) for d, a in (
        ((0.3, -0.9, 0.4), 0.42), ((-0.7, -0.2, 0.6), 0.3), ((0.6, 0.3, 0.7), 0.26), ((-0.2, 0.8, -0.3), 0.38),
        ((0.8, -0.1, -0.5), 0.24), ((-0.6, -0.6, -0.4), 0.3), ((0.1, 0.1, -1), 0.22), ((-0.95, 0.3, 0.0), 0.2),
    )]
    crateras(o, centros, 0.17, 0.06)
    encher_caixa(o)
    manchas_por_ruido(o, 'rochaEscura', 'rochaClara', semente_=3)
    pintar_faces(o, 'cratera', lambda c, n: any(c.normalized().angle(d) < a * 0.75 for d, a in centros))
    pintar_faces(o, 'rochaClara', lambda c, n: any(a * 1.0 < c.normalized().angle(d) < a * 1.3 for d, a in centros))
    return exportar('asteroide-rocha-lunar', [o], 'asteroide')


def gelo_azul():
    """Pedaço de gelo facetado: azul por dentro, geada branca em cima e lascas de cristal."""
    reset()
    cor('gelo', '#8fd2f2', 0.3)
    cor('geloFundo', '#4d9fd4', 0.35)
    cor('geada', '#f3fbff', 0.5)
    cor('lasca', '#9ae6ff', 0.15, '#3fc6ff', 0.45)
    o = rocha(1.0, 'gelo', semente=7, subdiv=3, aspereza=0.3, escala_ruido=1.0)
    encher_caixa(o)
    pintar_faces(o, 'geloFundo', lambda c, n: n.z < -0.35 or noise.noise(c * 2.2 + Vector((4, 4, 4))) < -0.3)
    pintar_faces(o, 'geada', lambda c, n: n.z > 0.5)
    pecas = [o]
    rnd = semente('gelo')
    for d in ((0.4, -0.6, 0.7), (-0.7, 0.2, 0.6), (0.8, 0.4, 0.1), (-0.3, -0.8, -0.3), (0.1, 0.7, 0.6)):
        d = Vector(d).normalized()
        r = raio_em(o, d)
        pecas.append(cristal(d * r * 0.8, d, 0.09 + rnd.random() * 0.04, 0.22 + rnd.random() * 0.1, 'lasca',
                             giro=rnd.random()))
    peca = juntar(pecas, 'asteroide-gelo-azul')
    caber(peca)
    return exportar('asteroide-gelo-azul', [peca], 'asteroide')


def cristal_violeta():
    """Rocha escura com tufos de cristais violeta que brilham."""
    reset()
    cor('rochaRoxa', '#6e639a', 0.85)
    cor('rochaRoxaEscura', '#4d4370', 0.9)
    cor('rochaRoxaClara', '#9a8fc4', 0.8)
    cor('cristal', '#3a1166', 0.25, '#b356ff', 1.0)
    cor('cristalClaro', '#5a2a88', 0.25, '#e6b2ff', 0.85)
    o = rocha(1.0, 'rochaRoxa', semente=11, subdiv=4, aspereza=0.2, escala_ruido=1.5)
    encher_caixa(o)
    manchas_por_ruido(o, 'rochaRoxaEscura', 'rochaRoxaClara', escala=3.0, semente_=11)
    for v in o.data.vertices:
        v.co *= 0.86
    o.data.update()
    pecas = [o]
    rnd = semente('violeta')
    for centro in ((0.3, -0.5, 0.8), (-0.8, 0.1, 0.3), (0.5, 0.7, -0.3), (-0.2, -0.7, -0.6)):
        c = Vector(centro).normalized()
        for k in range(4):
            d = (c + Vector((rnd.uniform(-0.35, 0.35), rnd.uniform(-0.35, 0.35), rnd.uniform(-0.35, 0.35)))).normalized()
            r = raio_em(o, d)
            pecas.append(cristal(d * r * 0.82, d, 0.06 + rnd.random() * 0.05, 0.16 + rnd.random() * 0.2,
                                 'cristal', 'cristalClaro', giro=rnd.random() * 3))
    peca = juntar(pecas, 'asteroide-cristal-violeta')
    caber(peca)
    return exportar('asteroide-cristal-violeta', [peca], 'asteroide')


def lava_laranja():
    """Basalto escuro com rachaduras de lava acesa e bolsões que brilham."""
    reset()
    cor('basalto', '#5b4b46', 0.9)
    cor('basaltoClaro', '#857168', 0.85)
    cor('lava', '#4a1504', 0.5, '#ff5200', 1.0)
    cor('lavaClara', '#5a2a04', 0.5, '#ffb020', 1.0)
    o = rocha(1.0, 'basalto', semente=17, subdiv=4, aspereza=0.2, escala_ruido=1.4)
    encher_caixa(o)
    pintar_faces(o, 'basaltoClaro', lambda c, n: n.z > 0.55 or noise.noise(c * 3.0) > 0.35)
    off = Vector((2.3, 8.1, 5.5))
    pintar_faces(o, 'lava', lambda c, n: abs(noise.noise(c * 2.2 + off)) < 0.06)
    pintar_faces(o, 'lavaClara', lambda c, n: abs(noise.noise(c * 2.2 + off)) < 0.018)
    return exportar('asteroide-lava-laranja', [o], 'asteroide')


ASTEROIDES = {
    'asteroide-rocha-lunar': rocha_lunar,
    'asteroide-gelo-azul': gelo_azul,
    'asteroide-cristal-violeta': cristal_violeta,
    'asteroide-lava-laranja': lava_laranja,
}

if __name__ == '__main__':
    pedidas = [a for a in sys.argv[1:] if not a.startswith('-')] or list(ASTEROIDES)
    for pid in pedidas:
        ASTEROIDES[pid]()
