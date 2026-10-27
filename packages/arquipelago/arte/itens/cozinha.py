"""A cozinha da casa: o fogão a lenha e os utensílios (os móveis do quarto vêm da plataforma).

- `fogao`: nós `fogao` (corpo de tijolo e reboco, chapa com duas bocas, porta da fornalha,
  chaminé com telhadinho e lenha do lado) e `fogo` (as chamas da fornalha, material `fogo` e
  `brasa` com emissão 1: o jogo acende quando cozinha);
- `panela`, `frigideira`, `colher-de-pau`, `tabua-de-corte`: um nó cada.
"""
from lib_itens import *


def fogao():
    L, F, A = 0.95, 0.6, 0.72
    f = [box((L, F, A - 0.12), (0, 0, (A - 0.12) / 2 + 0.12), 'fogaoParede', bevel=0.03)]
    f.append(box((L + 0.04, F + 0.04, 0.12), (0, 0, 0.06), 'fogaoTijolo', bevel=0.015))
    # Fileira de tijolinhos na barra de baixo.
    for k in range(8):
        f.append(box((0.1, 0.012, 0.045), (-L / 2 + 0.07 + k * 0.116, -F / 2 - 0.022, 0.035 + 0.05 * (k % 2)),
                     'fogaoTijoloEscuro', bevel=0.005, segs=1))
    f.append(box((L + 0.02, F + 0.02, 0.04), (0, 0, A + 0.02), 'chapa', bevel=0.01))
    for x in (-0.22, 0.12):
        f.append(lib_q.torus(0.1, 0.012, (x, -0.02, A + 0.043), 'metalEscuro', seg=20, rseg=5))
        f.append(cyl(0.085, 0.01, (x, -0.02, A + 0.042), 'ferro', verts=20))
    # Porta da fornalha em arco, com a boca escura atrás (o fogo fica no nó `fogo`).
    arco = [(-0.12, 0)] + [(math.cos(R(180 - 15 * k)) * 0.12, 0.14 + math.sin(R(180 - 15 * k)) * 0.12)
                           for k in range(13)] + [(0.12, 0)]
    f.append(prism(arco, 0.03, (-0.2, -F / 2 - 0.005, 0.2), 'chapa', bevel=0.006))
    boca = [(x * 0.78, z * 0.8) for x, z in arco]
    f.append(prism(boca, 0.01, (-0.2, -F / 2 - 0.02, 0.215), 'ferro'))
    f.append(lib_q.torus(0.03, 0.007, (-0.2, -F / 2 - 0.035, 0.24), 'metal', seg=12, rseg=5, rot=(R(90), 0, 0)))
    # Portinha do forno à direita.
    f.append(box((0.3, 0.03, 0.26), (0.22, -F / 2 - 0.005, 0.36), 'chapa', bevel=0.012))
    f.append(cyl(0.012, 0.18, (0.22, -F / 2 - 0.04, 0.47), 'metal', verts=8, rot=(0, R(90), 0)))
    # Chaminé com telhadinho (a "casinha").
    cx, cy = L / 2 - 0.1, F / 2 - 0.1
    f.append(cyl(0.07, 0.75, (cx, cy, A + 0.4), 'chapa', verts=14))
    f.append(lib_q.torus(0.074, 0.01, (cx, cy, A + 0.5), 'metalEscuro', seg=14, rseg=5))
    telha = prism([(-0.15, 0), (0, 0.11), (0.15, 0)], 0.19, (cx, cy, A + 0.775), 'fogaoTijolo', bevel=0.01)
    f.append(telha)
    # Lenha empilhada do lado esquerdo.
    for k, (x, z) in enumerate(((-L / 2 - 0.14, 0.06), (-L / 2 - 0.08, 0.06), (-L / 2 - 0.11, 0.16))):
        t = cyl(0.05, 0.42, (x, 0, z), 'lenha', verts=8, rot=(R(90), 0, 0))
        f.append(t)
        for s in (-1, 1):
            f.append(cyl(0.044, 0.005, (x, s * 0.212, z), 'madeiraClara', verts=8, rot=(R(90), 0, 0)))
    fogo = []
    for k, (dx, h) in enumerate(((-0.045, 0.1), (0.0, 0.14), (0.045, 0.09))):
        fogo.append(cone(0.035, h, (-0.2 + dx, -F / 2 - 0.03, 0.215 + h / 2), 'fogo', verts=8, smooth_it=True))
    fogo.append(esfera(0.06, (-0.2, -F / 2 - 0.028, 0.222), 'brasa', escala=(1.2, 0.35, 0.3), seg=10, aneis=6))
    return {'nos': {'fogao': f, 'fogo': fogo}, 'grupo': 'cozinha'}


def panela():
    corpo = torneado([(0, 0), (0.1, 0), (0.105, 0.01), (0.108, 0.13), (0.112, 0.135), (0.104, 0.135), (0.1, 0.02),
                      (0, 0.02)], 'panela', seg=24)
    pintar_por(corpo, lambda c, n: 'panelaInterna' if n.z > 0.5 and c.z < 0.05 or (abs(c.x) ** 2 + abs(c.y) ** 2) ** 0.5 < 0.102 and c.z > 0.02 else None)
    p = [corpo]
    tampa = torneado([(0.11, 0.13), (0.11, 0.135), (0.08, 0.16), (0.03, 0.17), (0, 0.17)], 'panela', seg=24)
    p.append(tampa)
    p.append(esfera(0.022, (0, 0, 0.18), 'ferro', escala=(1, 1, 0.7), seg=10, aneis=6))
    for s in (-1, 1):
        p.append(lib_q.torus(0.03, 0.009, (s * 0.12, 0, 0.11), 'ferro', seg=12, rseg=5, rot=(0, 0, R(90 if s > 0 else -90)),
                             arc=180))
    return {'nos': {'panela': p}, 'grupo': 'cozinha'}


def frigideira():
    corpo = torneado([(0, 0), (0.11, 0), (0.12, 0.01), (0.14, 0.045), (0.133, 0.048), (0.115, 0.016), (0, 0.012)],
                     'ferro', seg=24)
    p = [corpo]
    p.append(tube([(0.135, 0, 0.035), (0.22, 0, 0.055), (0.33, 0, 0.07)], [0.012, 0.011, 0.011], 'metalEscuro', seg=8))
    p.append(cyl(0.02, 0.13, (0.29, 0, 0.066), 'cabo', verts=10, rot=(0, R(80), 0)))
    return {'nos': {'frigideira': p}, 'grupo': 'cozinha'}


def colher_de_pau():
    p = [tube([(-0.16, 0, 0.012), (0.0, 0, 0.014), (0.1, 0, 0.016)], [0.012, 0.01, 0.009], 'madeiraClara', seg=8)]
    concha = esfera(0.035, (0.13, 0, 0.016), 'madeiraClara', escala=(1.3, 1, 0.35), seg=14, aneis=8)
    deformar(concha, lambda v: Vector((v.x, v.y, v.z - 0.02 * max(0.0, 1 - (v.x ** 2 + v.y ** 2) / 0.0012)
                                       if v.z > 0 else v.z)))
    p.append(concha)
    return {'nos': {'colher-de-pau': p}, 'grupo': 'cozinha'}


def tabua_de_corte():
    w, h = 0.36, 0.22
    r = 0.04
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180),
                       (w / 2 - r, -h / 2 + r, 270)):
        for k in range(5):
            a = R(a0 + 90 * k / 4)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    # Cabo com furo na ponta direita.
    p = [slab(pts, 0, 0.025, 'tabua', bevel=0.006)]
    alca = lib_ilha.blob(w / 2 + 0.05, 0, 0.07, 0.045, seed=1, n=20, wob=0.0)
    p.append(slab(alca, 0, 0.025, 'tabua', bevel=0.006))
    p.append(cyl(0.016, 0.03, (w / 2 + 0.08, 0, 0.0125), 'madeiraEscura', verts=12))
    for k in range(3):
        p.append(box((w * 0.8, 0.004, 0.001), (0, -0.06 + k * 0.05, 0.0255), 'madeira', bevel=0))
    return {'nos': {'tabua-de-corte': p}, 'grupo': 'cozinha'}


ITENS = [('fogao', fogao), ('panela', panela), ('frigideira', frigideira), ('colher-de-pau', colher_de_pau),
         ('tabua-de-corte', tabua_de_corte)]

if __name__ == '__main__':
    rodar(ITENS)
