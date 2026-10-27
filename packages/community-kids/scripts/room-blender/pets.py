"""Bichinhos do quarto, com animação em laço gravada no próprio GLB.

O quarto move o bichinho pelo chão (`pet-3d.tsx`); aqui moram o corpo e o movimento de dentro:
rabo que balança, passinho do corpo e asas batendo. Cada parte que mexe é um objeto com o pivô no
ponto da junta (sem esqueleto: o glTF anima o objeto). Frente para -Y, base em z = 0.
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_q import *

FRAMES = 24  # 1 s a 24 quadros por segundo


def setup_scene():
    sc = bpy.context.scene
    sc.frame_start = 1
    sc.frame_end = FRAMES
    sc.render.fps = 24


def part(objs, name, pivot):
    """Junta as peças numa parte só, com a origem no pivô (onde ela gira)."""
    o = join(objs, name)
    pv = Vector(pivot)
    o.data.transform(Matrix.Translation(-pv))
    o.location = pv
    return o


def parent(child, par):
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()


def loop(obj, path, values, axis=None):
    """Chaves em laço: `values` espalhados no ciclo, e o último quadro repete o primeiro."""
    n = len(values)
    for i, v in enumerate(values + [values[0]]):
        f = 1 + round(i * (FRAMES - 1) / n)
        if path == 'rotation_euler':
            obj.rotation_euler = v
        else:
            obj.location = v
        obj.keyframe_insert(data_path=path, frame=f)


def pet_gato():
    reset()
    setup_scene()
    corpo = [sphere(0.2, (0, 0.05, 0.26), 'furDark', scale=(0.9, 1.45, 0.85), subdiv=3)]
    for x in (-0.1, 0.1):
        for y in (-0.16, 0.24):
            corpo.append(cyl(0.05, 0.2, (x, y, 0.1), 'furDark', verts=10))
            corpo.append(sphere(0.055, (x, y - 0.02, 0.02), 'white', scale=(1, 1.2, 0.6), subdiv=2))
    corpo.append(sphere(0.12, (0, -0.2, 0.25), 'white', scale=(1, 0.6, 1.1), subdiv=2))
    body = part(corpo, 'corpo', (0, 0, 0))
    cab = [sphere(0.17, (0, -0.32, 0.46), 'furDark', scale=(1.1, 0.95, 0.9), subdiv=3)]
    cab.append(sphere(0.08, (0, -0.45, 0.42), 'white', scale=(1.1, 0.6, 0.75), subdiv=2))
    cab.append(sphere(0.022, (0, -0.5, 0.44), 'pink', subdiv=1))
    for s in (-1, 1):
        cab.append(cone(0.07, 0.14, (s * 0.1, -0.3, 0.6), 'furDark', verts=4, rot=(math.radians(-8), math.radians(s * 14), math.radians(45))))
        cab.append(cone(0.04, 0.08, (s * 0.1, -0.33, 0.6), 'pink', verts=4, rot=(math.radians(-8), math.radians(s * 14), math.radians(45))))
        cab.append(sphere(0.035, (s * 0.07, -0.47, 0.5), 'yellow', scale=(1, 0.5, 1.1), subdiv=2))
        cab.append(sphere(0.016, (s * 0.07, -0.49, 0.5), 'black', scale=(0.6, 0.5, 1.3), subdiv=1))
        for k in (-1, 1):
            cab.append(cyl(0.004, 0.16, (s * 0.12, -0.47, 0.42 + 0.02 * k), 'white', verts=4, rot=(0, math.radians(90 + 10 * k * s), 0)))
    head = part(cab, 'cabeca', (0, -0.28, 0.4))
    rabo = tube([(0, 0.32, 0.3), (0, 0.42, 0.36), (0.02, 0.48, 0.5), (0.06, 0.46, 0.64), (0.1, 0.4, 0.7)], [0.045, 0.042, 0.04, 0.037, 0.03], 'furDark', seg=8)
    tail = part([rabo], 'rabo', (0, 0.32, 0.3))
    parent(head, body)
    parent(tail, body)
    loop(tail, 'rotation_euler', [(0, 0, math.radians(a)) for a in (-22, 0, 22, 0)])
    loop(body, 'location', [(0, 0, h) for h in (0, 0.025, 0, 0.025)])
    loop(head, 'rotation_euler', [(math.radians(a), 0, 0) for a in (0, -4, 0, 4)])
    export('pet-gato', [body, head, tail], animated=True)


def pet_cachorro():
    reset()
    setup_scene()
    corpo = [sphere(0.22, (0, 0.05, 0.3), 'fur', scale=(0.95, 1.45, 0.85), subdiv=3)]
    corpo.append(sphere(0.12, (0.06, 0.12, 0.42), 'furLight', scale=(1.2, 1.6, 0.5), subdiv=2))
    for x in (-0.11, 0.11):
        for y in (-0.18, 0.26):
            corpo.append(cyl(0.06, 0.22, (x, y, 0.11), 'fur', verts=10))
            corpo.append(sphere(0.065, (x, y - 0.03, 0.03), 'furLight', scale=(1, 1.25, 0.6), subdiv=2))
    corpo.append(torus(0.1, 0.022, (0, -0.2, 0.42), 'red', seg=16, rseg=6, rot=(math.radians(70), 0, 0)))
    corpo.append(sphere(0.03, (0, -0.28, 0.36), 'yellow', subdiv=1))
    body = part(corpo, 'corpo', (0, 0, 0))
    cab = [sphere(0.18, (0, -0.33, 0.52), 'fur', scale=(1, 0.95, 0.92), subdiv=3)]
    cab.append(sphere(0.1, (0, -0.48, 0.47), 'furLight', scale=(0.9, 1.1, 0.7), subdiv=2))
    cab.append(sphere(0.04, (0, -0.58, 0.5), 'black', scale=(1.2, 0.8, 0.9), subdiv=1))
    cab.append(sphere(0.045, (0, -0.52, 0.41), 'pink', scale=(1, 0.6, 0.4), subdiv=1))
    for s in (-1, 1):
        cab.append(sphere(0.03, (s * 0.075, -0.47, 0.58), 'black', subdiv=1))
        cab.append(sphere(0.012, (s * 0.07, -0.49, 0.595), 'white', subdiv=1))
        orelha = sphere(0.09, (s * 0.17, -0.3, 0.5), 'furDark', scale=(0.45, 0.8, 1.4), subdiv=2)
        orelha.rotation_euler = (0, math.radians(s * 18), 0)
        cab.append(orelha)
    head = part(cab, 'cabeca', (0, -0.3, 0.46))
    rabo = tube([(0, 0.34, 0.36), (0, 0.42, 0.44), (0, 0.46, 0.54)], [0.04, 0.035, 0.025], 'fur', seg=8)
    tail = part([rabo], 'rabo', (0, 0.34, 0.36))
    parent(head, body)
    parent(tail, body)
    loop(tail, 'rotation_euler', [(0, math.radians(a), 0) for a in (-35, 35, -35, 35)])
    loop(body, 'location', [(0, 0, h) for h in (0, 0.03, 0, 0.03)])
    loop(head, 'rotation_euler', [(0, 0, math.radians(a)) for a in (0, 6, 0, -6)])
    export('pet-cachorro', [body, head, tail], animated=True)


def pet_passaro():
    reset()
    setup_scene()
    corpo = [sphere(0.16, (0, 0.02, 0.2), 'yellow', scale=(0.95, 1.2, 1.0), subdiv=3)]
    corpo.append(sphere(0.12, (0, -0.06, 0.18), 'cream', scale=(0.9, 0.7, 0.85), subdiv=2))
    corpo.append(sphere(0.11, (0, -0.12, 0.34), 'yellow', subdiv=3))
    corpo.append(cone(0.045, 0.11, (0, -0.24, 0.33), 'orange', verts=8, rot=(math.radians(90), 0, 0)))
    for s in (-1, 1):
        corpo.append(sphere(0.025, (s * 0.06, -0.2, 0.38), 'black', subdiv=1))
        corpo.append(sphere(0.008, (s * 0.058, -0.22, 0.39), 'white', subdiv=1))
        corpo.append(sphere(0.03, (s * 0.08, -0.17, 0.3), 'pink', scale=(1, 0.4, 0.7), subdiv=1))
        corpo.append(cyl(0.012, 0.08, (s * 0.05, 0.02, 0.04), 'orange', verts=6))
    corpo.append(prism([(-0.07, 0), (0.07, 0), (0.1, -0.16), (0, -0.12), (-0.1, -0.16)], 0.03, (0, 0.18, 0.2), 'orange', rot=(math.radians(110), 0, 0)))
    corpo.append(sphere(0.04, (0, -0.1, 0.46), 'orange', scale=(0.5, 1, 1.3), subdiv=1))
    body = part(corpo, 'corpo', (0, 0, 0))
    asas = []
    for s in (-1, 1):
        a = sphere(0.11, (s * 0.15, 0.05, 0.22), 'orange', scale=(0.28, 0.95, 0.62), subdiv=2)
        a.rotation_euler = (math.radians(-12), 0, 0)
        wing = part([a], f'asa{s}', (s * 0.11, -0.02, 0.28))
        parent(wing, body)
        loop(wing, 'rotation_euler', [(0, math.radians(s * v), 0) for v in (-10, 45, -10, 45)])
        asas.append(wing)
    loop(body, 'location', [(0, 0, h) for h in (0, 0.03, 0, 0.03)])
    export('pet-passaro', [body] + asas, animated=True)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name.replace('-', '_')]()
