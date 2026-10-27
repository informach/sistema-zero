"""A bancada de cozinhar como PROJETO AZUL: um holograma de bancada de cozinha sobre um projetor.

Referencial: o grupo `Bancada` do jogo (y = 0 no chão). O holograma ocupa a mesma caixa do colisor
(2,2 × 1 × 1, de y = 0 a 1) e flutua um pouco (o jogo balança o nó).

Nós: `projetor` (a base escura com luzes azuis, parada) e `holograma` (a bancada translúcida: o
material `holograma` é o volume e `hologramaAresta` são os contornos que brilham).
"""
from lib_mundo import *

W, D, H = 2.2, 1.0, 1.0


def G(x, y, z):
    return (x, -z, y)


def barra(a, b, m='hologramaAresta', r=0.014):
    """Contorno: barra fina entre dois pontos do jogo."""
    pa, pb = Vector(G(*a)), Vector(G(*b))
    d = pb - pa
    o = cyl(r, d.length, tuple((pa + pb) / 2), m, verts=4, smooth_sides=False)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return o


def contorno_caixa(x0, x1, y0, y1, z0, z1, r=0.014):
    p = []
    for y in (y0, y1):
        for z in (z0, z1):
            p.append(barra((x0, y, z), (x1, y, z), r=r))
        for x in (x0, x1):
            p.append(barra((x, y, z0), (x, y, z1), r=r))
    for x in (x0, x1):
        for z in (z0, z1):
            p.append(barra((x, y0, z), (x, y1, z), r=r))
    return p


def retangulo_na_frente(x0, x1, y0, y1, z, r=0.011):
    return [barra((x0, y0, z), (x1, y0, z), r=r), barra((x0, y1, z), (x1, y1, z), r=r),
            barra((x0, y0, z), (x0, y1, z), r=r), barra((x1, y0, z), (x1, y1, z), r=r)]


def holograma():
    p = []
    hw, hd = W / 2, D / 2
    # Corpo do armário e tampo (volumes translúcidos).
    p.append(box((W - 0.06, D - 0.1, 0.84), G(0, 0.48, -0.03), 'holograma', bevel=0.02, segs=1))
    p.append(box((W, D, 0.07), G(0, 0.935, 0), 'holograma', bevel=0.015, segs=1))
    p.append(box((W, 0.06, 0.3), G(0, 1.12, -hd + 0.03), 'holograma', bevel=0.01, segs=1))
    p += contorno_caixa(-hw + 0.03, hw - 0.03, 0.06, 0.9, -hd + 0.02, hd - 0.08)
    p += contorno_caixa(-hw, hw, 0.9, 0.97, -hd, hd, r=0.012)
    # Portas, gaveta e puxadores na frente.
    zf = hd - 0.075
    p += retangulo_na_frente(-hw + 0.1, -0.05, 0.12, 0.62, zf)
    p += retangulo_na_frente(0.05, hw - 0.1, 0.12, 0.62, zf)
    p += retangulo_na_frente(-hw + 0.1, hw - 0.1, 0.68, 0.84, zf)
    for x in (-0.18, 0.18):
        p.append(barra((x, 0.3, zf + 0.02), (x, 0.45, zf + 0.02), r=0.02))
    p.append(barra((-0.2, 0.76, zf + 0.02), (0.2, 0.76, zf + 0.02), r=0.018))
    # Fogão de duas bocas à esquerda.
    for x, z, r in ((-0.68, -0.15, 0.17), (-0.32, 0.15, 0.14)):
        p.append(torus(r, 0.016, G(x, 0.985, z), 'hologramaAresta', seg=16, rseg=4))
        p.append(torus(r * 0.5, 0.012, G(x, 0.985, z), 'hologramaAresta', seg=12, rseg=4))
    # Pia à direita: cuba (contorno afundado) e torneira.
    p += contorno_caixa(0.3, 0.9, 0.78, 0.97, -0.3, 0.3, r=0.011)
    p.append(box((0.58, 0.58, 0.16), G(0.6, 0.88, 0), 'holograma', bevel=0.02, segs=1))
    p.append(tube([G(0.6, 0.97, -0.42), G(0.6, 1.25, -0.42), G(0.6, 1.3, -0.3), G(0.6, 1.2, -0.2)],
                  [0.025, 0.025, 0.022, 0.02], 'hologramaAresta', seg=6))
    # Panela no fogão (o "projeto" mostra para que serve a bancada).
    p.append(cyl(0.14, 0.14, G(-0.68, 1.06, -0.15), 'holograma', verts=14))
    p.append(torus(0.14, 0.012, G(-0.68, 1.13, -0.15), 'hologramaAresta', seg=14, rseg=4))
    p.append(barra((-0.82, 1.1, -0.15), (-1.0, 1.12, -0.15), r=0.015))
    # Cantos marcados (o "esquadro" de projeto) e uma régua pontilhada no chão do holograma.
    for sx in (-1, 1):
        for sz in (-1, 1):
            c = (sx * (hw + 0.08), 0.02, sz * (hd + 0.08))
            p.append(barra(c, (c[0] - sx * 0.25, 0.02, c[2]), r=0.016))
            p.append(barra(c, (c[0], 0.02, c[2] - sz * 0.25), r=0.016))
            p.append(barra(c, (c[0], 0.27, c[2]), r=0.016))
    for k in range(7):
        x = -hw + 0.15 + k * (W - 0.3) / 6
        p.append(box((0.12, 0.03, 0.012), G(x, 0.02, hd + 0.2), 'hologramaAresta', bevel=0.0))
    return p


def projetor():
    p = []
    pts = blob(0, 0, W / 2 + 0.35, D / 2 + 0.32, seed=4, n=40, wob=0.0)
    p.append(slab(pts, -0.06, 0.05, 'projetor', bevel=0.03, segs=1, name='base', fundo=False))
    pts2 = blob(0, 0, W / 2 + 0.22, D / 2 + 0.2, seed=4, n=40, wob=0.0)
    p.append(slab(pts2, 0.05, 0.065, 'projetorLuz', name='aro', fundo=False))
    p.append(slab(blob(0, 0, W / 2 + 0.16, D / 2 + 0.14, seed=4, n=40, wob=0.0), 0.05, 0.07, 'projetor',
                  name='miolo', fundo=False))
    for sx in (-1, 1):
        for sz in (-1, 1):
            c = G(sx * (W / 2 + 0.12), 0.07, sz * (D / 2 + 0.1))
            p.append(cyl(0.09, 0.05, c, 'metalEscuro', verts=10))
            p.append(sphere(0.06, (c[0], c[1], c[2] + 0.03), 'projetorLuz', subdiv=1, scale=(1, 1, 0.6)))
    return p


def main():
    lib_q.reset()
    exportar('bancada', {'projetor': projetor(), 'holograma': holograma()})


if __name__ == '__main__':
    main()
