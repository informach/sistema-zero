"""Lumis do Recife Coral: Bolha (comum) e Pérola (raro).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/recife.py   # grava src/assets/lumis/{bolha,perola}.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import lib_lumis as L  # noqa: E402
from mathutils import Vector  # noqa: E402


def bolha():
    L.comecar({
        'corpo': ('#c79cff', 0.25, None, 0, 1),
        'corpo2': ('#ffb8e6', 0.4, '#ffb8e6', 0.15, 0.62),
        'detalhe': ('#ff9fd8', 0.5, None, 0, 1),
        'luz': ('#b8fbff', 0.3, '#6ff3ff', 6.0, 1),
        'pupila': ('#21143a', 0.25, None, 0, 1),
        'bochecha': ('#ff86c4', 0.8, None, 0, 1),
    })
    # O sino da água-viva: domo liso e a barra de baixo recortada em ondas.
    ondas = lambda a, z: 1 + 0.05 * math.cos(8 * a) * max(0.0, (0.75 - z) / 0.2)  # noqa: E731
    domo = L.torneado('corpo', [(0, 1.12), (0.17, 1.105), (0.31, 1.05), (0.41, 0.96), (0.47, 0.85), (0.495, 0.74),
                                (0.49, 0.66), (0.44, 0.6), (0.3, 0.63), (0, 0.66)], seg=32, onda=ondas)
    # A saia translúcida em volta da barra, que dá o ar de gelatina.
    saia = L.torneado('corpo2', [(0.47, 0.7), (0.53, 0.64), (0.55, 0.57), (0.53, 0.52), (0.47, 0.56), (0.43, 0.62)],
                      seg=32, onda=lambda a, z: 1 + 0.07 * math.cos(8 * a + 0.4), fechar=False)
    rosto, olho = L.rosto(domo, 0.15, 0.86, 0.09, 0.112, boca_z=0.735, boca_larg=0.05, boca_alt=0.036,
                          bochecha_x=0.28, bochecha_z=0.75)
    # Pintinhas de luz no alto do domo, como as águas-vivas que brilham no escuro.
    pintas = []
    for i in range(7):
        a = 2 * math.pi * i / 7 + 0.2
        pintas.append(L.decalque(domo, 'luz', (0.2 * math.cos(a), 0.2 * math.sin(a)), (0.04, 0.04), alto=0.004,
                                 bojo=0.012, aneis=1, forma=L.forma_elipse(10), direcao=(0, 0, -1), cima=(0, 1, 0)))
    # O coraçãozinho de luz fica no alto do domo (é o que a câmera do jogo vê de cima).
    cor = L.decalque(domo, 'luz', (0, -0.02), (0.075, 0.075), forma=L.forma_coracao(), alto=0.004, bojo=0.02,
                     aneis=2, direcao=(0, 0, -1), cima=(0, -1, 0), nome='coracao')
    corpo = L.juntar([domo, saia, *rosto, cor, *pintas], 'corpo', pivo=(0, 0, 0.62))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.42, 0.86))

    # Quatro tentáculos enroladinhos embaixo (balançam atrasados) e dois de braço.
    tentaculos = []
    for i, (a, comp) in enumerate(((45, 0.42), (135, 0.36), (225, 0.4), (315, 0.38))):
        ar = math.radians(a)
        base = Vector((0.2 * math.cos(ar), 0.2 * math.sin(ar), 0.63))
        fora = Vector((math.cos(ar), math.sin(ar), 0))
        pts, raios = [], []
        for k in range(8):
            u = k / 7
            p = base + fora * (0.06 * math.sin(math.pi * u * 1.5)) + Vector((0, 0, -comp * u))
            p += fora.cross(Vector((0, 0, 1))) * 0.05 * math.sin(math.pi * u * 2 + i)
            pts.append(p)
            raios.append(0.045 * (1 - 0.75 * u))
        t = L.tubo('detalhe', pts, raios, seg=7)
        ponta = L.bola('detalhe', raios[-1] * 1.2, pts[-1], seg=6, aneis=4)
        tentaculos.append((L.juntar([t, ponta], f'tentaculo-{i + 1}', pivo=tuple(base)), 16, 0.12 * i))
    bracos = []
    for lado in (1, -1):
        pts = [(lado * 0.36, -0.06, 0.64), (lado * 0.42, -0.1, 0.55), (lado * 0.47, -0.12, 0.45),
               (lado * 0.53, -0.1, 0.37), (lado * 0.58, -0.07, 0.36)]
        t = L.tubo('detalhe', pts, [0.048, 0.044, 0.038, 0.03, 0.024], seg=7)
        ponta = L.bola('detalhe', 0.028, pts[-1], seg=6, aneis=4)
        bracos.append((L.juntar([t, ponta], f'braco-{"e" if lado > 0 else "d"}', pivo=pts[0]), lado))
    lumi = L.Lumi('bolha', corpo, olhos, bracos=bracos, enfeites=tentaculos, flutua=True)
    lumi.animar()
    L.exportar('bolha', {'familia': 'recife', 'raridade': 'comum'})


def concha(material, raio, pos, costelas=9, abre=78, fundo=0.16, esp=0.03):
    """Leque de vieira com costelas e a borda ondulada, de frente para -Y e com a dobradiça em `pos`."""
    nu, nv = costelas * 4, 4
    verts, faces = [], []
    for j in range(nv + 1):
        v = j / nv
        for i in range(nu + 1):
            u = math.radians(-abre + 2 * abre * i / nu)
            onda = math.cos(math.pi * i / 2)
            r = raio * v * (1 + 0.035 * onda * v)
            x, z = r * math.sin(u), r * math.cos(u)
            y = fundo * v * v * (1 - 0.3 * (u / math.radians(abre)) ** 2) - 0.022 * onda * v
            verts.append((x, y, z))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    me = bpy.data.meshes.new('concha')
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new('concha', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(L.mat(material))
    s = o.modifiers.new('esp', 'SOLIDIFY')
    s.thickness = esp
    L._aplicar(o, s)
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.transform(L.Matrix.Translation(pos))
    return o


def perola():
    L.comecar({
        'corpo': ('#f4e2f4', 0.15, '#ffeefa', 0.1, 1),
        'corpo2': ('#ffa58c', 0.5, None, 0, 1),
        'detalhe': ('#ff7f73', 0.6, None, 0, 1),
        'luz': ('#fff4c2', 0.3, '#ffd6f0', 6.0, 1),
        'pupila': ('#2c1830', 0.25, None, 0, 1),
        'bochecha': ('#ffa0bf', 0.8, None, 0, 1),
        'faisca': ('#fff3fb', 0.3, '#ffc8ec', 5.0, 1),
    })
    C, R = Vector((0, 0, 0.47)), 0.39
    casca = L.bola('corpo', R, C, (1, 0.97, 0.98), seg=24, aneis=14)
    rosto, olho = L.rosto(casca, 0.145, 0.53, 0.088, 0.11, boca_z=0.39, boca_larg=0.05, boca_alt=0.04,
                          bochecha_x=0.25, bochecha_z=0.41)
    cor = L.coracao(casca, 0.26, 0.055)
    corpo = L.juntar([casca, *rosto, cor], 'corpo', pivo=(0, 0, 0.08))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.38, 0.53))

    # A concha de vieira atrás, como um capuz que abre em leque, com contas de luz na borda.
    leque = [concha('corpo2', 0.72, (0, 0.22, 0.24), costelas=11, abre=74, fundo=0.3)]
    leque.append(L.bola('luz', 0.05, (0, 0.22 + 0.33, 0.24 + 0.74), seg=12, aneis=8))
    for lado in (1, -1):
        leque.append(L.cone('corpo2', 0.1, 0.13, (lado * 0.08, 0.24, 0.2), rot=(0, lado * 115, 0), seg=10))
    leque = L.juntar(leque, 'concha', pivo=(0, 0.22, 0.24))
    leque.rotation_euler = (math.radians(-18), 0, 0)
    leque = L.juntar([leque], 'concha', pivo=(0, 0.22, 0.24))

    roda = L.faiscas(0.38, 1.12)
    lumi = L.Lumi('perola', corpo, olhos, bracos=L.bracinhos('corpo', 0.35, 0.36, tam=(0.06, 0.06, 0.1)),
                  pes=L.pezinhos('detalhe', 0.15, tam=(0.1, 0.13, 0.065)), enfeites=[(leque, 6, 0.15)],
                  faiscas=roda, pulo=0.3, passo=0.07)
    lumi.animar()
    L.exportar('perola', {'familia': 'recife', 'raridade': 'raro'})


if __name__ == '__main__':
    bolha()
    perola()
