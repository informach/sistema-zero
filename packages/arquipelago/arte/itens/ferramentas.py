"""As ferramentas que vão na mão do avatar: lanterna, regador, pá, rede e vara de pescar.

Cada arquivo tem o nó da ferramenta (com o nome do arquivo) e um nó vazio `mao` no ponto da
pegada: o jogo prende o `mao` na mão do avatar. As ferramentas ficam de pé (o cabo para cima, y
do jogo), com a base na origem. A lanterna tem o vidro no material `luz` (emissão 1; o jogo regula
o brilho, como o lampião da casa).
"""
from lib_itens import *


def lanterna():
    p = []
    p.append(cyl(0.07, 0.03, (0, 0, 0.015), 'aro', verts=20, bevel=0.006))
    p.append(cyl(0.05, 0.012, (0, 0, 0.036), 'ferro', verts=20))
    p.append(cyl(0.048, 0.14, (0, 0, 0.11), 'luz', verts=20))
    # Chama dentro do vidro (o vidro é opaco e brilha; a chama dá forma quando o brilho baixa).
    for k in range(4):
        a = 2 * math.pi * k / 4 + R(45)
        p.append(cyl(0.006, 0.15, (math.cos(a) * 0.052, math.sin(a) * 0.052, 0.11), 'aro', verts=6))
    p.append(cyl(0.062, 0.02, (0, 0, 0.19), 'aro', verts=20, bevel=0.006))
    p.append(cone(0.06, 0.055, (0, 0, 0.226), 'aro', verts=20, smooth_it=True))
    p.append(cyl(0.016, 0.02, (0, 0, 0.26), 'ferro', verts=10))
    p.append(lib_q.torus(0.05, 0.007, (0, 0, 0.27), 'ferro', seg=18, rseg=6, rot=(R(90), 0, 0), arc=180))
    return {'nos': {'lanterna': p}, 'vazios': {'mao': (0, 0, 0.318)}, 'grupo': 'ferramentas'}


def regador():
    corpo = torneado([(0, 0), (0.085, 0), (0.09, 0.008), (0.092, 0.11), (0.086, 0.15), (0.06, 0.17), (0.03, 0.175),
                      (0, 0.175)], 'regador', seg=24)
    pintar_por(corpo, lambda c, n: 'regadorEscuro' if c.z < 0.012 or abs(c.z - 0.06) < 0.012 else None)
    p = [corpo]
    p.append(tube([(0.06, 0, 0.04), (0.13, 0, 0.11), (0.19, 0, 0.19)], [0.016, 0.012, 0.01], 'regador', seg=10))
    p.append(cyl(0.03, 0.014, (0.2, 0, 0.2), 'regadorEscuro', verts=16, rot=(0, R(-50), 0)))
    p.append(cyl(0.024, 0.004, (0.206, 0, 0.206), 'metal', verts=16, rot=(0, R(-50), 0)))
    p.append(tube([(-0.075, 0, 0.05), (-0.13, 0, 0.11), (-0.1, 0, 0.2), (-0.02, 0, 0.215), (0.04, 0, 0.17)],
                  [0.012] * 5, 'regadorEscuro', seg=8))
    p.append(cyl(0.032, 0.012, (0, 0, 0.18), 'regadorEscuro', verts=16))
    return {'nos': {'regador': p}, 'vazios': {'mao': (-0.085, 0, 0.205)}, 'grupo': 'ferramentas'}


def pa():
    p = []
    # Lâmina com a ponta arredondada, um pouco côncava.
    lam = []
    for k in range(13):
        a = R(180 + 15 * k)
        lam.append((math.cos(a) * 0.08, 0.07 + math.sin(a) * 0.07))
    lam = [(0.08, 0.2), (-0.08, 0.2)] + lam
    lamina = prism(lam, 0.012, (0, 0, 0), 'lamina', bevel=0.004)
    deformar(lamina, lambda v: Vector((v.x, v.y + 0.025 * (v.x / 0.08) ** 2, v.z)))
    p.append(lamina)
    p.append(cyl(0.024, 0.06, (0, 0, 0.22), 'lamina', verts=12, r2=0.016))
    p.append(cyl(0.016, 0.62, (0, 0, 0.55), 'cabo', verts=10))
    p.append(lib_q.torus(0.04, 0.012, (0, 0, 0.9), 'cabo', seg=16, rseg=6, rot=(R(90), 0, 0)))
    p.append(cyl(0.012, 0.08, (0, 0, 0.94), 'cabo', verts=8, rot=(0, R(90), 0)))
    return {'nos': {'pa': p}, 'vazios': {'mao': (0, 0, 0.6)}, 'grupo': 'ferramentas'}


def rede():
    p = []
    topo = 0.98
    p.append(cyl(0.016, 0.66, (0, 0, 0.33), 'cabo', verts=10))
    p.append(cyl(0.02, 0.14, (0, 0, 0.08), 'aro', verts=10))
    aro = lib_q.torus(0.15, 0.01, (0, 0, topo - 0.15), 'aro', seg=24, rseg=6, rot=(R(90), 0, 0))
    p.append(aro)
    p.append(cyl(0.012, 0.18, (0, 0, 0.72), 'aro', verts=8))
    # O saco da rede: um cone de malha aberta (modificador de arame).
    bm = bmesh.new()
    an = 10
    aneis = []
    for j, (r, y) in enumerate(((0.15, 0.0), (0.13, 0.07), (0.1, 0.13), (0.06, 0.17))):
        aneis.append([bm.verts.new((r * math.cos(2 * math.pi * k / an), y, topo - 0.15 + r * math.sin(2 * math.pi * k / an)))
                      for k in range(an)])
    for a, b in zip(aneis, aneis[1:]):
        for k in range(an):
            bm.faces.new((a[k], a[(k + 1) % an], b[(k + 1) % an], b[k]))
    fim = bm.verts.new((0, 0.19, topo - 0.15))
    for k in range(an):
        bm.faces.new((aneis[-1][k], aneis[-1][(k + 1) % an], fim))
    saco = lib_q._obj('saco', bm, 'rede')
    w = saco.modifiers.new('arame', 'WIREFRAME')
    w.thickness = 0.005
    lib_q._apply(saco, w)
    p.append(saco)
    return {'nos': {'rede': p}, 'vazios': {'mao': (0, 0, 0.3)}, 'grupo': 'ferramentas'}


def vara_de_pescar():
    p = []
    alto = 1.35
    p.append(tube([(0, 0, 0.0), (0, 0, 0.5), (0, 0.03, 1.0), (0, 0.09, alto)], [0.016, 0.012, 0.008, 0.005], 'vara',
                  seg=8))
    p.append(cyl(0.02, 0.24, (0, 0, 0.16), 'madeiraEscura', verts=10))
    for z in (0.5, 0.8, 1.08):
        p.append(lib_q.torus(0.012, 0.003, (0, 0.02 + (0.06 if z > 1 else 0), z), 'metal', seg=10, rseg=4))
    # Molinete.
    p.append(cyl(0.035, 0.026, (0.04, 0, 0.32), 'molinete', verts=16, rot=(0, R(90), 0), bevel=0.004))
    p.append(cyl(0.005, 0.05, (0.068, 0, 0.32), 'metal', verts=6, rot=(0, R(90), 0)))
    p.append(cyl(0.012, 0.016, (0.09, 0, 0.29), 'ferro', verts=8, rot=(0, R(90), 0)))
    # Linha que desce da ponta até a boia e o anzol.
    ponta = (0, 0.09, alto)
    p.append(tube([ponta, (0, 0.2, alto - 0.2), (0, 0.24, 0.62)], [0.0025] * 3, 'linha', seg=4, cap=False))
    boia = esfera(0.03, (0, 0.24, 0.6), 'boia', seg=12, aneis=8)
    pintar_por(boia, lambda c, n: 'boiaBranca' if c.z > 0.6 else None)
    p.append(boia)
    p.append(tube([(0, 0.24, 0.57), (0, 0.24, 0.46)], [0.0025] * 2, 'linha', seg=4, cap=False))
    p.append(lib_q.torus(0.014, 0.003, (0, 0.24, 0.45), 'metal', seg=10, rseg=4, rot=(R(90), 0, 0), arc=250))
    return {'nos': {'vara-de-pescar': p}, 'vazios': {'mao': (0, 0, 0.2)}, 'grupo': 'ferramentas'}


ITENS = [('lanterna', lanterna), ('regador', regador), ('pa', pa), ('rede', rede), ('vara-de-pescar', vara_de_pescar)]

if __name__ == '__main__':
    rodar(ITENS)
