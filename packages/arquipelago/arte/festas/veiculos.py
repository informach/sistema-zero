"""Veículos: o barquinho da chegada e o barco entre ilhas (`src/assets/movimento/`).

- `barquinho`: o barco a remo em que a criança chega (mais caprichado que o barquinho amarrado no
  píer). Nós `barquinho` (casco, bancos, lampião na proa, bandeirinha e a mala da viagem),
  `remo-esq` e `remo-dir` (pivô na forqueta); clipe `remar` (1,5 s, em laço); vazio `assento`
  (filho do `barquinho`) no banco de trás, onde o avatar senta.
- `barco`: a balsinha entre as ilhas, com cabine, chaminé, boia e bancos no convés. Nó `barco`;
  clipe `balancar` (3 s, em laço: sobe, desce e joga de leve); vazio `assento` (filho do `barco`)
  no banco do convés.

A frente dos dois olha para -Y do Blender (+Z do three.js) e a linha d'água fica no README.
"""
from lib_festas import *


def _casco(comp, larg, alt, z0, cores, borda, seg=18, ring=10):
    """Casco oco: superelipsoide cortada em cima, proa afinada; `cores` = [(até z, material)…]."""
    c = superellipsoid((larg, comp, alt * 2), (0, 0, z0 + alt), cores[0][1], e1=0.6, e2=0.75, seg=seg, ring=ring)
    for v in c.data.vertices:
        if v.co.z > 0.0:
            v.co.x *= 0.86
            v.co.y *= 0.92
            v.co.z = -alt * 0.55
        if v.co.y < -comp * 0.18:
            t = (-v.co.y - comp * 0.18) / (comp * 0.32)
            v.co.x *= 1 - 0.5 * min(1.0, t)
            v.co.z += alt * 0.25 * min(1.0, t) ** 2 if v.co.z > -alt * 0.5 else 0
    c.data.update()
    pintar_por(c, lambda q, n: next((m for zz, m in cores if q.z < zz), cores[-1][1]))
    pintar_por(c, lambda q, n: 'convesMadeira' if q.z < z0 + alt * 0.47 and n.z > 0.6 else None)
    aro = lib_q.torus(1.0, 0.045, (0, 0.02, z0 + alt), borda, seg=28, rseg=6)
    aro.scale = (larg * 0.43, comp * 0.47, 1)
    return [c, aro]


def contorno(comp, larg, encolhe=0.8, n=28):
    """Contorno do convés por dentro da borda (a mesma elipse do aro, com a proa afinada)."""
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        x, y = math.cos(a) * larg * 0.43 * encolhe, math.sin(a) * comp * 0.47 * encolhe
        if y < -comp * 0.18:
            x *= 1 - 0.45 * min(1.0, (-y - comp * 0.18) / (comp * 0.3))
        pts.append((x, y + 0.02))
    return pts


def barquinho():
    comp, larg, alt = 2.2, 1.0, 0.36
    p = _casco(comp, larg, alt, 0.0, [(0.16, 'cascoAzul'), (0.28, 'cascoBranco'), (9, 'cascoAzul')], 'convesMadeira')
    for y in (-0.42, 0.18, 0.62):
        p.append(box((0.82 if y > -0.3 else 0.62, 0.22, 0.05), (0, y, 0.3), 'convesMadeira', bevel=0.015, segs=1))
    # Estrela pintada nos dois lados da proa.
    for s in (-1, 1):
        p.append(prism(lib_q.star_pts(0.07, 0.03), 0.01, (s * 0.37, -0.6, 0.27), 'cascoAmarelo', rot=(0, 0, s * R(90) + R(-12) * s)))
    # Forquetas dos remos.
    for s in (-1, 1):
        p.append(lib_q.torus(0.03, 0.01, (s * 0.46, 0.05, 0.42), 'ferro', seg=10, rseg=4, rot=(0, R(90), 0)))
    # Lampião na proa, num pau, e a bandeirinha atrás.
    p.append(cyl(0.015, 0.5, (0, -0.85, 0.55), 'madeiraEscura', verts=8))
    p.append(cyl(0.05, 0.08, (0, -0.85, 0.84), 'luz', verts=12))
    p.append(cone(0.06, 0.05, (0, -0.85, 0.905), 'ferro', verts=12, smooth_it=True))
    p.append(cyl(0.055, 0.015, (0, -0.85, 0.795), 'ferro', verts=12))
    p.append(cyl(0.012, 0.55, (0, 0.98, 0.6), 'madeiraEscura', verts=8))
    p.append(prism([(0, 0), (0.22, -0.06), (0, -0.13)], 0.008, (0, 0.98, 0.86), 'bandeira', rot=(0, 0, R(90))))
    # A mala da viagem no banco do meio e um rolo de corda no fundo.
    p.append(box((0.32, 0.18, 0.22), (0.12, 0.18, 0.44), 'cascoVermelho', bevel=0.03, segs=2))
    p.append(lib_q.torus(0.06, 0.012, (0.12, 0.18, 0.565), 'madeiraEscura', seg=12, rseg=4, rot=(0, R(90), 0), arc=180))
    p.append(box((0.33, 0.04, 0.03), (0.12, 0.18, 0.45), 'ouro', bevel=0.008, segs=1))
    p.append(lib_q.torus(0.09, 0.03, (-0.2, 0.75, 0.15), 'corda', seg=14, rseg=5))
    nos = {'barquinho': p}
    remar = {}
    for lado, s in (('esq', 1), ('dir', -1)):
        piv = (s * 0.46, 0.05, 0.42)
        remo = [tube([(s * 0.3, 0.05, 0.5), (s * 1.25, 0.05, 0.12)], [0.02, 0.02], 'madeiraClara', seg=6)]
        remo.append(box((0.06, 0.22, 0.02), (s * 1.3, 0.05, 0.1), 'madeiraClara', bevel=0.01, segs=1,
                        rot=(0, s * R(22), 0)))
        remo.append(cyl(0.024, 0.08, (s * 0.33, 0.05, 0.49), 'cascoVermelho', verts=8, rot=(0, s * R(-68), 0)))
        nos[f'remo-{lado}'] = (remo, piv)
        # Pá na água varre para trás; depois sobe e volta para a frente.
        remar[f'remo-{lado}'] = {'rotation_euler': [(0, (0, 0, s * R(-28))), (14, (0, 0, s * R(28))),
                                                     (20, (0, s * R(-14), s * R(24))), (30, (0, s * R(-14), s * R(-24))),
                                                     (36, (0, 0, s * R(-28)))]}
    return {'nos': nos, 'vazios': {'assento': (0, 0.62, 0.33)}, 'pais': {'assento': 'barquinho'},
            'clipes': {'remar': remar}, 'grupo': 'veiculos', 'pasta': 'movimento'}


def barco():
    comp, larg, alt = 4.0, 1.8, 0.55
    p = _casco(comp, larg, alt, 0.0, [(0.22, 'cascoVermelho'), (0.3, 'cascoBranco'), (9, 'cascoBranco')],
               'cascoAzul', seg=20, ring=10)
    p.append(slab(contorno(comp, larg, 0.9), 0.46, 0.52, 'convesMadeira', bevel=0.015))
    # Cabine: paredes brancas, janelas, porta e o teto azul com a chaminé.
    p.append(box((1.1, 1.0, 0.75), (0, -0.35, 0.9), 'cascoBranco', bevel=0.05, segs=2))
    p.append(box((1.26, 1.18, 0.08), (0, -0.35, 1.31), 'cascoAzul', bevel=0.03, segs=2))
    for x in (-0.3, 0.3):
        p.append(box((0.32, 0.02, 0.24), (x, -0.86, 1.0), 'vidroCabine', bevel=0.02, segs=1))
    for s in (-1, 1):
        for y in (-0.6, -0.15):
            p.append(box((0.02, 0.26, 0.22), (s * 0.56, y, 1.0), 'vidroCabine', bevel=0.02, segs=1))
    p.append(box((0.36, 0.02, 0.56), (0, 0.16, 0.82), 'cascoAzul', bevel=0.03, segs=1))
    p.append(cyl(0.12, 0.42, (0.3, -0.35, 1.55), 'cascoAmarelo', verts=14))
    p.append(cyl(0.125, 0.08, (0.3, -0.35, 1.7), 'cascoVermelho', verts=14))
    p.append(lib_q.torus(0.17, 0.05, (-0.57, -0.35, 0.95), 'boiaLaranja', seg=16, rseg=6, rot=(0, R(90), 0)))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        p.append(box((0.02, 0.05, 0.1), (-0.6, -0.35 + math.cos(a) * 0.17, 0.95 + math.sin(a) * 0.17), 'cascoBranco',
                     bevel=0.0, rot=(-a, 0, 0)))
    # Grade em volta do convés de trás e dois bancos.
    for s in (-1, 1):
        for y in (0.35, 0.75, 1.15):
            p.append(cyl(0.018, 0.3, (s * 0.62, y, 0.68), 'metal', verts=6))
        p.append(tube([(s * 0.62, 0.35, 0.83), (s * 0.62, 1.15, 0.83)], [0.02, 0.02], 'metal', seg=6))
        p.append(box((0.28, 0.8, 0.07), (s * 0.38, 0.75, 0.72), 'convesMadeira', bevel=0.015, segs=1))
        p.append(box((0.06, 0.8, 0.26), (s * 0.53, 0.75, 0.84), 'convesMadeira', bevel=0.015, segs=1))
    p.append(cyl(0.015, 0.7, (0, 1.45, 0.85), 'madeiraEscura', verts=8))
    p.append(prism([(0, 0), (0.3, -0.08), (0, -0.17)], 0.008, (0, 1.45, 1.18), 'bandeira', rot=(0, 0, R(90))))
    p.append(cyl(0.06, 0.1, (0, -1.25, 0.6), 'luz', verts=10))
    balancar = {'barco': {'location': [(0, (0, 0, 0)), (36, (0, 0, 0.05)), (72, (0, 0, 0))],
                          'rotation_euler': [(0, (0, 0, 0)), (18, (R(1.5), R(2.5), 0)), (36, (0, 0, 0)),
                                             (54, (R(-1.5), R(-2.5), 0)), (72, (0, 0, 0))]}}
    return {'nos': {'barco': (p, (0, 0, 0))}, 'vazios': {'assento': (0.38, 0.75, 0.76)}, 'pais': {'assento': 'barco'},
            'clipes': {'balancar': balancar}, 'grupo': 'veiculos', 'pasta': 'movimento'}


PECAS = [('barquinho', barquinho), ('barco', barco)]

if __name__ == '__main__':
    rodar(PECAS)
