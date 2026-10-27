"""Peças novas do quarto (27/10/2026): móveis, cantinho gamer, enfeites, plantas, luzes e parede.

Mesmas convenções do resto (`lib_q.py`): chão com a base em z = 0 e a frente para -Y; parede
centrada na origem com o fundo em y = +0.10. Peças que empilham (`stackable`) cabem em ~0.8 de
lado, porque o quarto as encolhe para 0.72 em cima dos móveis. O aquário e a lâmpada de lava têm
animação em laço; o resto é uma malha só.
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_q import *
from decor import WALL_BACK, plate, folha
from pets import part, parent

R = math.radians


def anim_scene(frames, interp='LINEAR'):
    sc = bpy.context.scene
    sc.frame_start = 1
    sc.frame_end = frames
    sc.render.fps = 24
    bpy.context.preferences.edit.keyframe_new_interpolation_type = interp


def keys(obj, path, pairs):
    """Chaves em quadros escolhidos: [(quadro, valor), ...]."""
    for f, v in pairs:
        setattr(obj, path, v)
        obj.keyframe_insert(data_path=path, frame=f)


def front_disc(r, d, loc, m, verts=24):
    """Disco de frente (eixo em Y)."""
    return cyl(r, d, loc, m, verts=verts, rot=(R(90), 0, 0))


# ── Móveis ───────────────────────────────────────────────────────────────────
def guarda_roupa():
    reset()
    H = 2.3
    p = [box((1.9, 0.86, H - 0.1), (0, 0.02, 0.1 + (H - 0.1) / 2), 'wood', bevel=0.03)]
    p.append(box((2.0, 0.94, 0.1), (0, 0.02, H + 0.05), 'woodDark', bevel=0.03))
    p.append(box((1.96, 0.9, 0.1), (0, 0.02, 0.05), 'woodDark', bevel=0.02))
    for s in (-1, 1):
        p.append(box((0.9, 0.04, 1.55), (s * 0.47, -0.43, 1.45), 'woodLight', bevel=0.015))
        p.append(box((0.7, 0.02, 1.3), (s * 0.47, -0.455, 1.45), 'cream', bevel=0.01))
        p.append(cyl(0.022, 0.06, (s * 0.08, -0.48, 1.4), 'gold', verts=10, rot=(R(90), 0, 0)))
        p.append(sphere(0.04, (s * 0.08, -0.515, 1.4), 'gold', subdiv=2))
    # Estrelinhas nas portas (o guarda-roupa é de quarto de criança).
    for s, m in ((-1, 'yellow'), (1, 'pink')):
        p.append(prism(star_pts(0.13, 0.055), 0.02, (s * 0.47, -0.47, 1.85), m, bevel=0.005))
    p.append(box((1.8, 0.04, 0.42), (0, -0.43, 0.38), 'woodLight', bevel=0.015))
    p.append(box((0.5, 0.05, 0.05), (0, -0.47, 0.42), 'gold', bevel=0.015))
    export('guarda-roupa', p)


def criado_mudo():
    reset()
    p = []
    for x in (-0.32, 0.32):
        for y in (-0.26, 0.3):
            p.append(cyl(0.03, 0.1, (x, y, 0.05), 'woodDark', verts=8, r2=0.022))
    p.append(box((0.78, 0.7, 0.48), (0, 0.02, 0.34), 'wood', bevel=0.025))
    p.append(box((0.86, 0.78, 0.06), (0, 0.02, 0.61), 'woodLight', bevel=0.02))
    p.append(box((0.68, 0.04, 0.18), (0, -0.34, 0.45), 'woodLight', bevel=0.012))
    p.append(sphere(0.035, (0, -0.375, 0.45), 'gold', subdiv=2))
    p.append(box((0.66, 0.02, 0.2), (0, -0.325, 0.215), 'woodDark', bevel=0.0))
    for x, h, m in ((-0.24, 0.16, 'red'), (-0.18, 0.14, 'blue'), (-0.12, 0.17, 'green')):
        p.append(box((0.05, 0.16, h), (x, -0.25, 0.12 + h / 2), m, bevel=0.008))
    export('criado-mudo', p)


def comoda():
    reset()
    p = []
    for x in (-0.82, 0.82):
        for y in (-0.3, 0.34):
            p.append(cyl(0.035, 0.12, (x, y, 0.06), 'woodDark', verts=8, r2=0.025))
    p.append(box((1.8, 0.76, 0.74), (0, 0.02, 0.49), 'white', bevel=0.03))
    p.append(box((1.88, 0.82, 0.06), (0, 0.02, 0.89), 'woodLight', bevel=0.02))
    for z, m in ((0.24, 'teal'), (0.47, 'yellow'), (0.7, 'pink')):
        for x in (-0.44, 0.44):
            p.append(box((0.82, 0.03, 0.2), (x, -0.375, z), m, bevel=0.012))
            p.append(sphere(0.035, (x, -0.405, z), 'white', subdiv=2))
    export('comoda', p)


def poltrona():
    reset()
    p = []
    for x in (-0.62, 0.62):
        for y in (-0.5, 0.6):
            p.append(cyl(0.045, 0.14, (x, y, 0.07), 'woodDark', verts=8, r2=0.03))
    p.append(cushion((1.5, 1.3, 0.3), (0, 0.05, 0.28), 'teal', puff=0.05, round_=0.25))
    p.append(cushion((1.06, 1.0, 0.22), (0, -0.07, 0.52), 'teal', puff=0.25, round_=0.4))
    p.append(cushion((1.5, 0.34, 0.85), (0, 0.55, 0.8), 'teal', puff=0.1, round_=0.35, rot=(R(-8), 0, 0)))
    for s in (-1, 1):
        p.append(cushion((0.24, 1.3, 0.5), (s * 0.66, 0.05, 0.6), 'teal', puff=0.05, round_=0.4))
    p.append(cushion((0.5, 0.16, 0.45), (0.22, 0.3, 0.82), 'yellow', puff=0.3, round_=0.45, rot=(R(-15), 0, R(-10))))
    # Mantinha dobrada no braço.
    p.append(cushion((0.3, 0.5, 0.06), (-0.66, 0.0, 0.88), 'pink', puff=0.1, round_=0.4))
    export('poltrona', p)


def cadeira_gamer():
    reset()
    p = [cyl(0.06, 0.08, (0, 0, 0.12), 'grayDark', verts=12)]
    for k in range(5):
        a = R(90 + 72 * k)
        p.append(box((0.36, 0.06, 0.04), (0.18 * math.cos(a), 0.18 * math.sin(a), 0.1), 'black', bevel=0.012, rot=(0, 0, a)))
        p.append(sphere(0.045, (0.36 * math.cos(a), 0.36 * math.sin(a), 0.045), 'grayDark', scale=(1, 1, 1), subdiv=1))
    p.append(cyl(0.035, 0.32, (0, 0, 0.3), 'metal', verts=10))
    p.append(cushion((0.62, 0.6, 0.14), (0, -0.02, 0.5), 'black', puff=0.2, round_=0.35))
    for s in (-1, 1):
        p.append(cushion((0.1, 0.58, 0.12), (s * 0.29, -0.02, 0.58), 'red', puff=0.1, round_=0.45))
    rot = (R(-10), 0, 0)
    p.append(cushion((0.6, 0.14, 0.95), (0, 0.28, 1.05), 'black', puff=0.15, round_=0.35, rot=rot))
    for s in (-1, 1):
        p.append(cushion((0.1, 0.16, 0.85), (s * 0.27, 0.29, 1.0), 'red', puff=0.1, round_=0.45, rot=rot))
        p.append(cyl(0.025, 0.18, (s * 0.34, 0.0, 0.62), 'grayDark', verts=8))
        p.append(box((0.08, 0.3, 0.04), (s * 0.34, -0.02, 0.72), 'black', bevel=0.015))
    p.append(cushion((0.34, 0.12, 0.16), (0, 0.24, 1.38), 'red', puff=0.3, round_=0.45, rot=rot))
    p.append(cushion((0.36, 0.1, 0.16), (0, 0.14, 0.72), 'red', puff=0.3, round_=0.45, rot=rot))
    export('cadeira-gamer', p)


def mesa_gamer():
    reset()
    p = [box((2.8, 0.8, 0.06), (0, 0.05, 0.78), 'black', bevel=0.02)]
    p.append(box((2.7, 0.02, 0.02), (0, -0.36, 0.765), 'neonCyan', bevel=0.0))
    for s in (-1, 1):
        p.append(box((0.08, 0.7, 0.72), (s * 1.3, 0.05, 0.38), 'grayDark', bevel=0.02))
        p.append(box((0.1, 0.06, 0.6), (s * 1.3, -0.24, 0.38), 'red', bevel=0.015))
    p.append(box((2.5, 0.04, 0.1), (0, 0.4, 0.55), 'grayDark', bevel=0.01))
    # Monitor largo, caixinhas de som com o anel aceso, teclado e mouse.
    p.append(box((0.32, 0.2, 0.02), (0, 0.28, 0.82), 'grayDark', bevel=0.008))
    p.append(box((0.06, 0.04, 0.3), (0, 0.33, 0.97), 'grayDark', bevel=0.01))
    p.append(box((1.3, 0.05, 0.52), (0, 0.29, 1.25), 'black', bevel=0.02))
    p.append(box((1.22, 0.01, 0.44), (0, 0.262, 1.25), 'screen', bevel=0.0))
    for x, z, w, h, m in ((-0.35, 1.1, 0.2, 0.08, 'neonGreen'), (0.1, 1.32, 0.3, 0.05, 'neonPink'), (0.38, 1.18, 0.12, 0.12, 'neonYellow')):
        p.append(box((w, 0.01, h), (x, 0.255, z), m, bevel=0.0))
    for s in (-1, 1):
        p.append(box((0.16, 0.16, 0.28), (s * 0.92, 0.24, 0.95), 'black', bevel=0.02))
        p.append(front_disc(0.055, 0.01, (s * 0.92, 0.155, 0.92), 'grayDark', verts=16))
        p.append(torus(0.065, 0.008, (s * 0.92, 0.155, 0.92), 'neonPink', seg=20, rseg=5, rot=(R(90), 0, 0)))
    p.append(box((0.7, 0.2, 0.03), (-0.1, -0.12, 0.825), 'black', bevel=0.01))
    p.append(box((0.66, 0.16, 0.012), (-0.1, -0.12, 0.845), 'grayDark', bevel=0.0))
    p.append(box((0.72, 0.22, 0.006), (-0.1, -0.12, 0.812), 'neonPink', bevel=0.0))
    p.append(box((0.36, 0.3, 0.006), (0.5, -0.1, 0.812), 'purple', bevel=0.0))
    p.append(sphere(0.04, (0.5, -0.1, 0.83), 'black', scale=(0.9, 1.4, 0.55), subdiv=2))
    export('mesa-gamer', p)


def fliperama():
    reset()
    perfil = [(0.38, 0), (0.38, 1.95), (-0.3, 1.95), (-0.3, 1.62), (-0.18, 1.55), (-0.22, 1.06),
              (-0.46, 0.98), (-0.46, 0.9), (-0.36, 0.86), (-0.36, 0)]
    p = []
    for s in (-1, 1):
        p.append(prism(perfil, 0.06, (s * 0.37, 0, 0), 'purple', rot=(0, 0, R(90)), bevel=0.012))
        p.append(prism(star_pts(0.14, 0.06), 0.01, (s * 0.405, 0.05, 0.55), 'yellow', rot=(0, 0, R(90))))
        p.append(tube([(s * 0.405, -0.36, 0.0), (s * 0.405, -0.36, 0.86), (s * 0.405, -0.46, 0.9),
                       (s * 0.405, -0.46, 0.98), (s * 0.405, -0.22, 1.06), (s * 0.405, -0.18, 1.55),
                       (s * 0.405, -0.3, 1.62), (s * 0.405, -0.3, 1.95)], [0.012] * 8, 'neonPink', seg=6))
    p.append(box((0.68, 0.04, 0.86), (0, -0.34, 0.43), 'purple', bevel=0.0))
    p.append(box((0.26, 0.02, 0.3), (0, -0.365, 0.45), 'grayDark', bevel=0.01))
    for x in (-0.06, 0.06):
        p.append(box((0.04, 0.01, 0.08), (x, -0.377, 0.5), 'neonOrange', bevel=0.0))
    p.append(box((0.68, 0.27, 0.06), (0, -0.335, 0.99), 'black', bevel=0.01, rot=(R(18), 0, 0)))
    p.append(box((0.68, 0.12, 0.06), (0, -0.41, 0.9), 'black', bevel=0.0, rot=(R(-20), 0, 0)))
    p.append(cyl(0.012, 0.1, (-0.17, -0.37, 1.08), 'metal', verts=6))
    p.append(sphere(0.038, (-0.17, -0.37, 1.14), 'red', subdiv=2))
    for x, m in ((0.02, 'yellow'), (0.12, 'blue'), (0.22, 'green')):
        p.append(cyl(0.028, 0.03, (x, -0.33, 1.055), m, verts=12, rot=(R(18), 0, 0)))
    tilt = (R(-5), 0, 0)
    p.append(box((0.68, 0.04, 0.5), (0, -0.19, 1.3), 'black', bevel=0.01, rot=tilt))
    p.append(box((0.56, 0.01, 0.4), (0, -0.215, 1.3), 'screen', bevel=0.0, rot=tilt))
    # Um invasor de pixel na tela.
    inv = ['..X...X..', '...X.X...', '..XXXXX..', '.XX.X.XX.', 'XXXXXXXXX', 'X.XXXXX.X', 'X.X...X.X', '...X.X...']
    px = 0.03
    for j, row in enumerate(inv):
        for i, c in enumerate(row):
            if c == 'X':
                x = (i - 4) * px
                z = 1.38 - j * px
                yy = -0.225 - (z - 1.3) * math.tan(R(5))
                p.append(box((px * 0.92, 0.01, px * 0.92), (x, yy, z), 'neonGreen', bevel=0.0, rot=tilt))
    p.append(box((0.68, 0.15, 0.04), (0, -0.245, 1.59), 'black', bevel=0.0, rot=(R(30), 0, 0)))
    p.append(box((0.68, 0.04, 0.33), (0, -0.29, 1.785), 'navy', bevel=0.0))
    p.append(box((0.6, 0.01, 0.06), (0, -0.312, 1.68), 'neonCyan', bevel=0.0))
    for x, m in ((-0.18, 'neonPink'), (0.0, 'neonYellow'), (0.18, 'neonPink')):
        p.append(prism(star_pts(0.08, 0.035), 0.015, (x, -0.315, 1.82), m))
    p.append(box((0.68, 0.68, 0.04), (0, 0.04, 1.93), 'purple', bevel=0.0))
    p.append(box((0.68, 0.04, 1.9), (0, 0.36, 0.97), 'purple', bevel=0.0))
    export('fliperama', p)


def caixa_som():
    reset()
    p = [box((0.5, 0.44, 0.8), (0, 0, 0.42), 'black', bevel=0.03)]
    for x in (-0.18, 0.18):
        for y in (-0.15, 0.15):
            p.append(cyl(0.03, 0.02, (x, y, 0.01), 'grayDark', verts=8))
    for z, r, ring in ((0.3, 0.17, 'neonCyan'), (0.63, 0.08, 'neonPink')):
        p.append(front_disc(r, 0.02, (0, -0.225, z), 'grayDark', verts=28))
        p.append(torus(r, 0.018, (0, -0.232, z), 'gray', seg=28, rseg=6, rot=(R(90), 0, 0)))
        p.append(torus(r + 0.03, 0.01, (0, -0.226, z), ring, seg=28, rseg=5, rot=(R(90), 0, 0)))
        p.append(sphere(r * 0.38, (0, -0.235, z), 'black', scale=(1, 0.45, 1), subdiv=2))
    p.append(cyl(0.03, 0.03, (0.15, -0.1, 0.835), 'gray', verts=12))
    export('caixa-som', p)


def cesto_brinquedos():
    reset()
    p = [cyl(0.36, 0.48, (0, 0, 0.24), 'woodLight', verts=24, r2=0.4)]
    for z in (0.1, 0.22, 0.34):
        r = 0.36 + 0.04 * z / 0.48
        p.append(torus(r + 0.005, 0.016, (0, 0, z), 'wood', seg=24, rseg=5))
    p.append(torus(0.4, 0.035, (0, 0, 0.48), 'wood', seg=24, rseg=6))
    p.append(cyl(0.38, 0.02, (0, 0, 0.42), 'woodDark', verts=24))
    for s in (-1, 1):
        p.append(torus(0.06, 0.015, (s * 0.39, 0, 0.38), 'wood', seg=12, rseg=5, rot=(0, R(90), 0)))
    p.append(sphere(0.15, (0.13, 0.1, 0.52), 'red', subdiv=2))
    p.append(torus(0.15, 0.02, (0.13, 0.1, 0.52), 'white', seg=24, rseg=5, rot=(R(70), 0, 0)))
    p.append(box((0.16, 0.16, 0.16), (-0.14, -0.1, 0.5), 'yellow', bevel=0.02, rot=(0, R(10), R(20))))
    p.append(box((0.14, 0.14, 0.14), (-0.02, -0.2, 0.47), 'blue', bevel=0.02, rot=(R(15), 0, R(-15))))
    p.append(cyl(0.03, 0.62, (-0.16, 0.16, 0.62), 'orange', verts=10, rot=(R(18), R(-14), 0)))
    p.append(sphere(0.05, (-0.24, 0.26, 0.92), 'orange', subdiv=2))
    # Patinho de borracha na beirada.
    p.append(sphere(0.08, (0.22, -0.2, 0.5), 'yellow', scale=(1, 1.2, 0.8), subdiv=2))
    p.append(sphere(0.055, (0.22, -0.27, 0.6), 'yellow', subdiv=2))
    p.append(sphere(0.03, (0.22, -0.32, 0.59), 'orange', scale=(1, 1.2, 0.5), subdiv=1))
    for s in (-1, 1):
        p.append(sphere(0.012, (0.22 + s * 0.025, -0.315, 0.62), 'black', subdiv=1))
    export('cesto-brinquedos', p)


def skate():
    reset()

    def shape(w, l):
        r = w / 2
        pts = [(r * math.cos(R(a)), l / 2 - r + r * math.sin(R(a))) for a in range(0, 181, 15)]
        pts += [(r * math.cos(R(a)), -(l / 2 - r) + r * math.sin(R(a))) for a in range(180, 361, 15)]
        return pts

    def deck(w, l, d, z, m):
        o = prism(shape(w, l), d, (0, 0, 0), m)
        # As pontas (o "kicktail") sobem: no prisma, o comprimento é z e a espessura é y.
        for v in o.data.vertices:
            e = abs(v.co.z) - 0.5
            if e > 0:
                v.co.y -= 1.1 * e * e
        o.rotation_euler = (R(90), 0, 0)
        o.location = (0, 0, z)
        return o

    p = [deck(0.5, 1.6, 0.035, 0.13, 'purple'), deck(0.46, 1.56, 0.006, 0.15, 'black')]
    for o in p:
        flat(o)
    raio = prism([(-0.05, 0.25), (0.06, 0.04), (0.0, 0.03), (0.07, -0.25), (-0.06, -0.03), (0.0, -0.02)], 0.004,
                 (0, 0, 0.155), 'yellow', rot=(R(90), 0, 0))
    p.append(raio)
    for y in (-0.5, 0.5):
        p.append(box((0.3, 0.07, 0.05), (0, y, 0.09), 'metal', bevel=0.012))
        p.append(cyl(0.012, 0.46, (0, y, 0.06), 'metal', verts=8, rot=(0, R(90), 0)))
        for x in (-0.21, 0.21):
            p.append(cyl(0.055, 0.05, (x, y, 0.055), 'yellow', verts=16, bevel=0.01, rot=(0, R(90), 0)))
    export('skate', p)


def cafeteira():
    reset()
    p = [box((0.42, 0.42, 0.06), (0, 0, 0.03), 'black', bevel=0.015)]
    p.append(box((0.42, 0.16, 0.62), (0, 0.13, 0.37), 'red', bevel=0.03))
    p.append(box((0.42, 0.4, 0.14), (0, 0.01, 0.61), 'red', bevel=0.03))
    p.append(cyl(0.1, 0.04, (0, -0.06, 0.52), 'black', verts=16))
    p.append(cyl(0.12, 0.24, (0, -0.06, 0.18), 'glassClear', verts=20, r2=0.1))
    p.append(cyl(0.11, 0.13, (0, -0.06, 0.125), 'woodDark', verts=20, r2=0.105))
    p.append(cyl(0.105, 0.03, (0, -0.06, 0.315), 'black', verts=20))
    p.append(torus(0.06, 0.016, (0.13, -0.06, 0.2), 'black', seg=14, rseg=5, rot=(R(90), 0, 0)))
    p.append(front_disc(0.022, 0.02, (0.12, -0.19, 0.61), 'neonGreen', verts=12))
    p.append(front_disc(0.022, 0.02, (0.05, -0.19, 0.61), 'white', verts=12))
    # Canequinha ao lado, com o vapor.
    p.append(cyl(0.065, 0.11, (-0.24, -0.12, 0.115), 'white', verts=16))
    p.append(cyl(0.058, 0.01, (-0.24, -0.12, 0.17), 'woodDark', verts=16))
    p.append(torus(0.035, 0.012, (-0.31, -0.12, 0.12), 'white', seg=12, rseg=5, rot=(R(90), 0, 0)))
    export('cafeteira', p)


def livros():
    reset()
    p = []
    z = 0.0
    random.seed(3)
    for w, d, h, m in ((0.62, 0.44, 0.09, 'blue'), (0.56, 0.4, 0.08, 'red'), (0.6, 0.42, 0.1, 'green'), (0.5, 0.36, 0.07, 'yellow')):
        a = R(random.uniform(-12, 12))
        c = box((w, d, h), (0, 0, z + h / 2), m, bevel=0.012, rot=(0, 0, a))
        pg = box((w - 0.03, d - 0.035, h - 0.022), (0.015 * math.cos(a), 0.015 * math.sin(a), z + h / 2), 'cream', bevel=0.0, rot=(0, 0, a))
        p += [c, pg]
        z += h
    p.append(sphere(0.08, (0.06, 0.0, z + 0.075), 'red', scale=(1, 1, 0.9), subdiv=2))
    p.append(cyl(0.008, 0.05, (0.06, 0.0, z + 0.165), 'woodDark', verts=6))
    f = folha((0.065, 0.0, z + 0.17), 30, 0.07, 0.03, 60, 'leafLight')
    p.append(f)
    export('livros', p)


def porta_retrato():
    reset()
    q = [box((0.5, 0.06, 0.62), (0, 0, 0.31), 'woodLight', bevel=0.02)]
    y = -0.032
    q.append(box((0.4, 0.01, 0.5), (0, y, 0.31), 'glass', bevel=0.0))
    q.append(prism([(-0.2, 0.06), (-0.1, 0.16), (0.02, 0.2), (0.2, 0.14), (0.2, 0.06)], 0.01, (0, y - 0.006, 0), 'leafLight'))
    q.append(prism([(-0.2, 0.06), (0.2, 0.06), (0.2, 0.1), (0.08, 0.13), (-0.08, 0.11), (-0.2, 0.15)], 0.01, (0, y - 0.01, 0), 'leaf'))
    q.append(front_disc(0.055, 0.01, (0.1, y - 0.008, 0.46), 'yellow', verts=18))
    q.append(prism(heart_pts(0.07), 0.01, (-0.06, y - 0.012, 0.36), 'pink'))
    for dx, r in ((-0.13, 0.03), (-0.09, 0.04), (-0.05, 0.03)):
        q.append(sphere(r, (dx, y - 0.01, 0.5), 'white', scale=(1, 0.2, 0.7), subdiv=1))
    fr = join(q, 'quadro')
    fr.rotation_euler = (R(-12), 0, 0)
    fr.location = (0, -0.05, 0)
    st = box((0.06, 0.03, 0.42), (0, 0.13, 0.19), 'woodDark', bevel=0.01, rot=(R(28), 0, 0))
    export('porta-retrato', [fr, st])


# ── Luzes ────────────────────────────────────────────────────────────────────
def luminaria_mesa():
    reset()
    p = [cyl(0.16, 0.05, (0, 0.04, 0.025), 'teal', verts=24, bevel=0.015)]
    p.append(sphere(0.035, (0, 0.06, 0.07), 'grayDark', subdiv=2))
    p.append(tube([(0, 0.06, 0.07), (0, 0.13, 0.45)], [0.018, 0.018], 'teal', seg=8))
    p.append(sphere(0.032, (0, 0.13, 0.45), 'grayDark', subdiv=2))
    p.append(tube([(0, 0.13, 0.45), (0, -0.1, 0.6)], [0.016, 0.016], 'teal', seg=8))
    p.append(sphere(0.03, (0, -0.1, 0.6), 'grayDark', subdiv=2))
    p.append(cyl(0.12, 0.17, (0, -0.15, 0.55), 'teal', verts=24, r2=0.05, rot=(R(-35), 0, 0)))
    p.append(sphere(0.05, (0, -0.19, 0.5), 'lamp', subdiv=2))
    export('luminaria-mesa', p)


def lampada_lava():
    reset()
    anim_scene(96, 'BEZIER')
    base = [cyl(0.13, 0.17, (0, 0, 0.085), 'metal', verts=24, r2=0.075)]
    base.append(torus(0.13, 0.012, (0, 0, 0.01), 'grayDark', seg=24, rseg=5))
    base.append(tube([(0, 0, 0.17), (0, 0, 0.26), (0, 0, 0.38), (0, 0, 0.5), (0, 0, 0.56)],
                     [0.075, 0.1, 0.1, 0.075, 0.06], 'lavaGlass', seg=20))
    base.append(sphere(0.07, (0, 0, 0.19), 'neonOrange', scale=(1, 1, 0.45), subdiv=2))
    base.append(cyl(0.06, 0.07, (0, 0, 0.59), 'metal', verts=20, r2=0.035))
    body = join(base, 'lampada')
    gotas = []
    for i, (r, f0, x) in enumerate(((0.045, 1, 0.015), (0.035, 33, -0.02), (0.03, 65, 0.01))):
        g = sphere(r, (x, 0, 0.22), 'neonOrange', scale=(1, 1, 1.2), subdiv=2)
        g.name = f'gota{i}'
        # Sobe e desce devagar, cada gota no seu tempo (o laço tem 96 quadros = 4 s).
        pts = []
        for k in range(5):
            f = 1 + k * 24
            t = ((f - f0) % 96) / 96
            pts.append((f, (x, 0, 0.22 + 0.24 * (0.5 - 0.5 * math.cos(2 * math.pi * t)))))
        keys(g, 'location', pts)
        gotas.append(g)
    export('lampada-lava', [body] + gotas, animated=True)


# ── Plantas ──────────────────────────────────────────────────────────────────
def costelas(o, n=8, amp=0.12):
    for v in o.data.vertices:
        a = math.atan2(v.co.y, v.co.x)
        k = 1 + amp * math.cos(n * a)
        v.co.x *= k
        v.co.y *= k
    return o


def cacto():
    reset()
    p = [cyl(0.15, 0.2, (0, 0, 0.1), 'terracotta', verts=18, r2=0.18, bevel=0.01)]
    p.append(torus(0.18, 0.025, (0, 0, 0.2), 'terracotta', seg=18, rseg=6))
    p.append(cyl(0.165, 0.02, (0, 0, 0.19), 'woodDark', verts=18))
    p.append(costelas(uvball(1, (0, 0, 0.42), 'leaf', scale=(0.1, 0.1, 0.25), seg=32, ring=12)))
    p.append(tube([(0.06, 0, 0.38), (0.15, 0, 0.4), (0.17, 0, 0.5)], [0.045, 0.042, 0.04], 'leaf', seg=12))
    p.append(sphere(0.04, (0.17, 0, 0.5), 'leaf', subdiv=2))
    p.append(tube([(-0.06, 0, 0.46), (-0.14, 0, 0.47), (-0.15, 0, 0.55)], [0.04, 0.037, 0.035], 'leafLight', seg=12))
    p.append(sphere(0.035, (-0.15, 0, 0.55), 'leafLight', subdiv=2))
    for k in range(5):
        a = R(72 * k)
        p.append(sphere(0.03, (0.035 * math.cos(a), 0.035 * math.sin(a), 0.67), 'pink', scale=(1, 1, 0.6), subdiv=1))
    p.append(sphere(0.022, (0, 0, 0.68), 'yellow', subdiv=1))
    export('cacto', p)


def flor(c, m, centro='yellow', r=0.045):
    out = [sphere(r * 0.6, c, centro, subdiv=1)]
    for k in range(6):
        a = R(60 * k)
        o = sphere(r, (c[0] + r * math.cos(a), c[1] + r * math.sin(a), c[2] - 0.005), m, scale=(1.1, 0.6, 0.3), subdiv=1)
        o.rotation_euler = (0, 0, a)
        out.append(o)
    return out


def vaso_flores():
    reset()
    p = [tube([(0, 0, 0.0), (0, 0, 0.08), (0, 0, 0.2), (0, 0, 0.29), (0, 0, 0.33)], [0.1, 0.13, 0.11, 0.06, 0.08], 'blue', seg=20)]
    p.append(torus(0.08, 0.012, (0, 0, 0.33), 'blue', seg=20, rseg=5))
    for (x, y, z), m in (((0.0, 0.0, 0.68), 'red'), ((0.13, 0.03, 0.6), 'pink'), ((-0.12, -0.04, 0.62), 'yellow'),
                         ((0.05, -0.12, 0.56), 'white'), ((-0.05, 0.12, 0.58), 'purple')):
        p.append(tube([(0, 0, 0.3), (x * 0.4, y * 0.4, 0.45), (x, y, z)], [0.01, 0.01, 0.008], 'leaf', seg=6))
        p += flor((x, y, z), m, centro='orange' if m == 'yellow' else 'yellow')
    for a in (40, 200, 300):
        p.append(folha((0, 0, 0.33), a, 0.16, 0.05, 50, 'leafLight'))
    export('vaso-flores', p)


def planta_pendurada():
    reset()
    y0 = WALL_BACK
    p = [plate(0.12, 0.26, 0.04, 'woodDark', z=0.86)]
    p.append(box((0.04, 0.42, 0.04), (0, y0 - 0.23, 0.92), 'woodDark', bevel=0.012))
    p.append(torus(0.03, 0.008, (0, y0 - 0.42, 0.88), 'metal', seg=12, rseg=4, rot=(R(90), 0, 0)))
    cy = y0 - 0.42
    for k in range(3):
        a = R(90 + 120 * k)
        p.append(tube([(0, cy, 0.86), (0.2 * math.cos(a), cy + 0.2 * math.sin(a), 0.24)], [0.006, 0.006], 'cream', seg=5))
    p.append(cyl(0.15, 0.22, (0, cy, 0.13), 'white', verts=20, r2=0.21))
    p.append(torus(0.21, 0.02, (0, cy, 0.24), 'white', seg=20, rseg=5))
    p.append(cyl(0.2, 0.02, (0, cy, 0.23), 'woodDark', verts=20))
    for k in range(6):
        p.append(folha((0, cy, 0.24), k * 60 + 20, 0.16, 0.06, 40, 'leaf' if k % 2 else 'leafLight'))
    random.seed(5)
    for k, (a, comp) in enumerate(((200, 0.95), (250, 1.15), (300, 0.8), (340, 1.05), (160, 0.7))):
        a = R(a)
        x0, yy0 = 0.19 * math.cos(a), cy + 0.19 * math.sin(a)
        yy0 = min(yy0, y0 - 0.06)
        pts = []
        for i in range(9):
            t = i / 8
            pts.append((x0 + 0.05 * math.sin(t * 5 + k), yy0 - 0.03 * t, 0.24 - comp * t))
        p.append(tube(pts, [0.008] * 9, 'leaf', seg=5))
        for i in range(1, 9):
            x, y, z = pts[i]
            s = 1 if i % 2 else -1
            p.append(sphere(0.035, (x + s * 0.03, y - 0.01, z), 'leaf' if (i + k) % 2 else 'leafLight', scale=(1, 0.35, 0.75), subdiv=1))
    export('planta-pendurada', p)


# ── Bichinhos ────────────────────────────────────────────────────────────────
def aquario():
    reset()
    anim_scene(96, 'LINEAR')
    est = [box((0.84, 0.5, 0.06), (0, 0, 0.03), 'black', bevel=0.015)]
    est.append(box((0.84, 0.5, 0.05), (0, 0, 0.605), 'black', bevel=0.015))
    est.append(box((0.76, 0.42, 0.01), (0, 0, 0.578), 'lamp', bevel=0.0))
    for x in (-0.4, 0.4):
        for y in (-0.23, 0.23):
            est.append(box((0.025, 0.025, 0.52), (x, y, 0.32), 'black', bevel=0.0))
    est.append(box((0.78, 0.44, 0.05), (0, 0, 0.085), 'cream', bevel=0.0))
    random.seed(9)
    for k in range(14):
        est.append(sphere(0.03, (random.uniform(-0.35, 0.35), random.uniform(-0.18, 0.18), 0.11), random.choice(['terracotta', 'gray', 'pink', 'cream']), scale=(1, 1, 0.6), subdiv=1, smooth_it=False))
    for x, h in ((-0.3, 0.32), (-0.24, 0.26), (0.3, 0.36)):
        for k in range(3):
            est.append(folha((x, 0.12, 0.11), k * 120, h, 0.04, 12, 'leafLight' if k % 2 else 'leaf'))
    # Castelinho no fundo.
    est.append(box((0.16, 0.1, 0.14), (0.12, 0.13, 0.18), 'gray', bevel=0.01))
    for x in (0.05, 0.19):
        est.append(cyl(0.04, 0.2, (x, 0.13, 0.21), 'gray', verts=10))
        est.append(cone(0.05, 0.08, (x, 0.13, 0.35), 'red', verts=10))
    est.append(front_disc(0.03, 0.01, (0.12, 0.075, 0.16), 'black', verts=12))
    est.append(box((0.78, 0.44, 0.44), (0, 0, 0.33), 'waterClear', bevel=0.0))
    body = join(est, 'aquario')

    def peixe(m, r, z, sentido, nome):
        h = sentido  # +1 nada no anti-horário (cabeça para +Y em x = r)
        f = [sphere(0.065, (r, 0, z), m, scale=(0.55, 1.3, 0.9), subdiv=2)]
        f.append(prism([(0, 0), (0.05, 0.05), (-0.05, 0.05)], 0.01, (r, -h * 0.055, z), m, rot=(R(-90 if h > 0 else 90), 0, R(90))))
        f.append(prism([(0, 0), (0.035, 0.04), (-0.02, 0.035)], 0.008, (r, 0.0, z + 0.04), m, rot=(0, 0, R(90))))
        for s in (-1, 1):
            f.append(sphere(0.011, (r + s * 0.026, h * 0.035, z + 0.012), 'black', subdiv=1))
        o = part(f, nome, (0, 0, z))
        keys(o, 'rotation_euler', [(1, (0, 0, 0)), (96, (0, 0, h * 2 * math.pi))])
        parent(o, body)
        return o

    f1 = peixe('orange', 0.12, 0.36, 1, 'peixe1')
    f2 = peixe('yellow', 0.08, 0.26, -1, 'peixe2')
    bolhas = []
    for i, (x, y, f0) in enumerate(((0.26, 0.1, 0), (0.28, 0.08, 16), (0.25, 0.12, 32))):
        b = sphere(0.016, (x, y, 0.13), 'white', subdiv=1)
        b.name = f'bolha{i}'
        pts = []
        for ciclo in range(2):
            a = 1 + ciclo * 48 + f0
            if a > 96:
                continue
            pts += [(a, (x, y, 0.13)), (min(a + 47, 96), (x, y, 0.13 + 0.42 * (min(a + 47, 96) - a) / 47))]
        if f0:
            pts = [(1, (x, y, 0.13 + 0.42 * (48 - f0) / 47))] + [(f0, (x, y, 0.55))] + pts
        keys(b, 'location', pts)
        parent(b, body)
        bolhas.append(b)
    export('aquario', [body, f1, f2] + bolhas, animated=True)


def caminha_pet():
    reset()
    p = [cyl(0.42, 0.08, (0, 0, 0.04), 'blue', verts=28)]
    rim = torus(0.32, 0.12, (0, 0, 0.15), 'blue', seg=28, rseg=12)
    for v in rim.data.vertices:
        if v.co.y < -0.1:
            v.co.z -= 0.025 * min(1, (-v.co.y - 0.1) / 0.25)
    p.append(rim)
    p.append(sphere(0.31, (0, 0, 0.1), 'cream', scale=(1, 1, 0.22), subdiv=3))
    for x in (-0.06, 0.06):
        for y in (-0.03, 0.03):
            p.append(sphere(0.028, (0.08 + x, -0.05 + y, 0.18), 'white', subdiv=1))
    p.append(cyl(0.017, 0.12, (0.08, -0.05, 0.18), 'white', verts=8, rot=(0, R(90), 0)))
    export('caminha-pet', p)


def arranhador():
    reset()
    p = [box((0.8, 0.8, 0.08), (0, 0, 0.04), 'cream', bevel=0.03)]
    p.append(box((0.42, 0.42, 0.42), (0.14, -0.12, 0.29), 'cream', bevel=0.04))
    p.append(front_disc(0.11, 0.01, (0.14, -0.335, 0.27), 'grayDark', verts=20))
    p.append(cyl(0.07, 0.68, (-0.24, 0.22, 0.42), 'woodLight', verts=14))
    for z in (0.18, 0.3, 0.42, 0.54, 0.66):
        p.append(torus(0.072, 0.008, (-0.24, 0.22, z), 'wood', seg=14, rseg=4))
    p.append(cushion((0.7, 0.66, 0.07), (0, 0.02, 0.79), 'cream', puff=0.1, round_=0.4))
    p.append(cyl(0.065, 0.46, (0.2, 0.18, 1.06), 'woodLight', verts=14))
    for z in (0.92, 1.04, 1.16):
        p.append(torus(0.067, 0.008, (0.2, 0.18, z), 'wood', seg=14, rseg=4))
    p.append(cyl(0.26, 0.06, (0.08, 0.02, 1.3), 'cream', verts=22))
    p.append(torus(0.24, 0.055, (0.08, 0.02, 1.35), 'cream', seg=22, rseg=8))
    p.append(sphere(0.2, (0.08, 0.02, 1.33), 'pink', scale=(1, 1, 0.2), subdiv=2))
    p.append(tube([(-0.3, -0.28, 0.76), (-0.3, -0.29, 0.58)], [0.005, 0.005], 'grayDark', seg=4))
    p.append(sphere(0.045, (-0.3, -0.29, 0.54), 'pink', subdiv=1, smooth_it=False))
    export('arranhador', p)


# ── Parede ───────────────────────────────────────────────────────────────────
def letreiro_neon():
    reset()
    p = [plate(1.9, 0.86, 0.04, 'black', bevel=0.03)]
    y = WALL_BACK - 0.05
    for x in (-0.88, 0.88):
        for z in (-0.36, 0.36):
            p.append(front_disc(0.025, 0.02, (x, y - 0.005, z), 'metal', verts=10))
    p.append(text('CRIAR', 0.42, (0.06, y - 0.02, -0.06), 'neonPink', depth=0.02))
    p.append(prism(star_pts(0.13, 0.055), 0.02, (-0.68, y - 0.02, 0.0), 'neonYellow'))
    ret = [(-0.84, -0.32), (0.84, -0.32), (0.84, 0.32), (-0.84, 0.32), (-0.84, -0.32)]
    p.append(tube([(x, y - 0.02, z) for x, z in ret], [0.012] * 5, 'neonCyan', seg=6))
    export('letreiro-neon', p)


def varal_luzes():
    reset()
    y = WALL_BACK - 0.05
    xs = [-0.95 + 1.9 * i / 24 for i in range(25)]
    fio = lambda x: 0.3 - 0.42 * (1 - (x / 0.95) ** 2)
    p = [tube([(x, y, fio(x)) for x in xs], [0.008] * 25, 'black', seg=5)]
    for x in (-0.95, 0.95):
        p.append(sphere(0.025, (x, y, 0.3), 'metal', subdiv=1))
    cores = ['neonYellow', 'neonPink', 'neonCyan', 'neonGreen', 'neonOrange']
    k = 0
    for i in range(1, 12):
        x = -0.95 + 1.9 * i / 12
        z = fio(x)
        if i in (3, 6, 9):
            p.append(box((0.03, 0.03, 0.05), (x, y - 0.01, z - 0.02), 'woodLight', bevel=0.005))
            p.append(box((0.2, 0.01, 0.24), (x, y - 0.025, z - 0.16), 'white', bevel=0.0))
            p.append(box((0.16, 0.01, 0.16), (x, y - 0.03, z - 0.14), ['blue', 'pink', 'green'][i // 3 - 1], bevel=0.0))
        else:
            p.append(cyl(0.015, 0.035, (x, y, z - 0.025), 'black', verts=8))
            p.append(sphere(0.04, (x, y, z - 0.075), cores[k % 5], scale=(1, 1, 1.3), subdiv=2))
            k += 1
    export('varal-luzes', p)


def quadro_cortica():
    reset()
    p = [plate(1.9, 0.95, 0.06, 'woodLight', bevel=0.02)]
    y = WALL_BACK - 0.06
    p.append(plate(1.78, 0.83, 0.02, 'cork', y=y - 0.005, bevel=0.0))
    yy = y - 0.02
    random.seed(4)
    notas = ((-0.65, 0.15, 'yellow'), (-0.35, -0.12, 'pink'), (0.55, 0.18, 'blue'), (0.7, -0.15, 'yellow'))
    for x, z, m in notas:
        a = R(random.uniform(-10, 10))
        p.append(box((0.24, 0.006, 0.24), (x, yy, z), m, bevel=0.0, rot=(0, a, 0)))
        for j in range(3):
            p.append(box((0.15, 0.004, 0.012), (x - 0.01, yy - 0.004, z + 0.04 - j * 0.04), 'grayDark', bevel=0.0, rot=(0, a, 0)))
        p.append(sphere(0.022, (x, yy - 0.02, z + 0.1), random.choice(['red', 'green', 'blue', 'purple']), subdiv=1))
    p.append(box((0.3, 0.006, 0.36), (0.1, yy, 0.05), 'white', bevel=0.0, rot=(0, R(5), 0)))
    p.append(box((0.26, 0.004, 0.24), (0.1, yy - 0.004, 0.09), 'glass', bevel=0.0, rot=(0, R(5), 0)))
    p.append(prism([(-0.13, -0.03), (-0.04, 0.06), (0.03, 0.0), (0.13, 0.08), (0.13, -0.03)], 0.004, (0.1, yy - 0.008, 0.05), 'leafLight', rot=(0, R(5), 0)))
    p.append(sphere(0.022, (0.1, yy - 0.02, 0.21), 'red', subdiv=1))
    p.append(box((0.26, 0.006, 0.2), (-0.15, yy, 0.22), 'white', bevel=0.0, rot=(0, R(-6), 0)))
    p.append(prism(heart_pts(0.07), 0.004, (-0.15, yy - 0.006, 0.22), 'red'))
    p.append(box((0.3, 0.006, 0.1), (0.3, yy, -0.25), 'orange', bevel=0.0, rot=(0, R(-4), 0)))
    p.append(sphere(0.02, (0.3, yy - 0.02, -0.22), 'green', subdiv=1))
    export('quadro-cortica', p)


def mapa_mundi():
    reset()
    p = [plate(1.84, 1.36, 0.06, 'woodDark', bevel=0.02)]
    y = WALL_BACK - 0.06
    p.append(plate(1.72, 1.24, 0.02, 'blue', y=y - 0.005, bevel=0.0))
    yy = y - 0.018
    for z in (-0.3, 0.0, 0.3):
        p.append(box((1.7, 0.003, 0.006), (0, yy + 0.004, z), 'glass', bevel=0.0))
    for x in (-0.6, -0.3, 0.0, 0.3, 0.6):
        p.append(box((0.006, 0.003, 1.22), (x, yy + 0.004, 0), 'glass', bevel=0.0))
    terras = {
        'green': [(-0.78, 0.45), (-0.55, 0.55), (-0.35, 0.5), (-0.3, 0.35), (-0.4, 0.25), (-0.45, 0.1), (-0.52, 0.05), (-0.6, 0.15), (-0.7, 0.25), (-0.8, 0.32)],
        'yellow': [(-0.45, 0.02), (-0.3, -0.05), (-0.25, -0.18), (-0.32, -0.35), (-0.38, -0.5), (-0.42, -0.4), (-0.45, -0.2), (-0.5, -0.05)],
        'pink': [(-0.05, 0.5), (0.12, 0.52), (0.15, 0.4), (0.08, 0.32), (-0.05, 0.3), (-0.1, 0.38)],
        'orange': [(-0.1, 0.25), (0.15, 0.27), (0.25, 0.1), (0.22, -0.05), (0.12, -0.3), (0.05, -0.32), (0.0, -0.12), (-0.12, 0.05)],
        'leafLight': [(0.15, 0.52), (0.6, 0.58), (0.8, 0.48), (0.72, 0.3), (0.6, 0.2), (0.5, 0.08), (0.35, 0.15), (0.25, 0.27), (0.15, 0.38)],
        'purple': [(0.55, -0.2), (0.72, -0.18), (0.76, -0.32), (0.62, -0.38), (0.52, -0.3)],
        'white': [(-0.7, -0.53), (0.7, -0.53), (0.6, -0.59), (-0.6, -0.59)],
    }
    for m, pts in terras.items():
        p.append(prism(pts, 0.012, (0, yy, 0), m, bevel=0.003))
    p.append(prism(star_pts(0.14, 0.035, n=4), 0.012, (0.66, yy - 0.004, -0.0), 'white'))
    p.append(prism(star_pts(0.07, 0.02, n=4, rot=45), 0.012, (0.66, yy - 0.01, -0.0), 'red'))
    # O alfinete no Brasil.
    p.append(cyl(0.006, 0.07, (-0.35, yy - 0.03, -0.17), 'metal', verts=6, rot=(R(90), 0, 0)))
    p.append(sphere(0.03, (-0.35, yy - 0.07, -0.17), 'red', subdiv=2))
    export('mapa-mundi', p)


# ── Música ───────────────────────────────────────────────────────────────────
def vitrola():
    reset()
    p = [box((0.6, 0.48, 0.16), (0, 0, 0.08), 'teal', bevel=0.02)]
    p.append(box((0.54, 0.42, 0.01), (0, 0, 0.162), 'cream', bevel=0.0))
    lid = box((0.6, 0.04, 0.46), (0, 0.26 + 0.23 * math.sin(R(12)), 0.16 + 0.23 * math.cos(R(12))), 'teal', bevel=0.02, rot=(R(-12), 0, 0))
    p.append(lid)
    p.append(box((0.54, 0.01, 0.4), (0, 0.235 + 0.23 * math.sin(R(12)), 0.16 + 0.23 * math.cos(R(12))), 'cream', bevel=0.0, rot=(R(-12), 0, 0)))
    p.append(cyl(0.17, 0.02, (-0.06, 0.0, 0.175), 'grayDark', verts=32))
    p.append(cyl(0.165, 0.008, (-0.06, 0.0, 0.189), 'black', verts=32))
    for r in (0.09, 0.12, 0.145):
        p.append(torus(r, 0.003, (-0.06, 0.0, 0.193), 'grayDark', seg=32, rseg=3))
    p.append(cyl(0.05, 0.01, (-0.06, 0.0, 0.195), 'red', verts=20))
    p.append(cyl(0.006, 0.03, (-0.06, 0.0, 0.205), 'metal', verts=6))
    p.append(cyl(0.025, 0.04, (0.2, 0.12, 0.185), 'metal', verts=12))
    p.append(tube([(0.2, 0.12, 0.21), (0.17, -0.06, 0.21), (0.07, -0.1, 0.205)], [0.008] * 3, 'metal', seg=6))
    p.append(box((0.04, 0.03, 0.015), (0.065, -0.1, 0.2), 'black', bevel=0.004))
    for x in (0.18, 0.24):
        p.append(cyl(0.018, 0.02, (x, -0.15, 0.175), 'gold', verts=10))
    p.append(box((0.32, 0.01, 0.09), (0, -0.245, 0.08), 'cream', bevel=0.0))
    for x in (-0.2, 0.2):
        p.append(box((0.04, 0.012, 0.03), (x, -0.245, 0.15), 'gold', bevel=0.004))
    export('vitrola', p)


def teclado():
    reset()
    p = []
    for x in (-0.6, 0.6):
        p.append(tube([(x, -0.26, 0.0), (x, 0.26, 0.72)], [0.022, 0.022], 'black', seg=8))
        p.append(tube([(x, 0.26, 0.0), (x, -0.26, 0.72)], [0.022, 0.022], 'black', seg=8))
        for y in (-0.26, 0.26):
            p.append(box((0.06, 0.06, 0.03), (x, y, 0.015), 'grayDark', bevel=0.01))
        p.append(box((0.06, 0.42, 0.03), (x, 0.0, 0.735), 'black', bevel=0.01))
    p.append(box((1.8, 0.4, 0.1), (0, 0.0, 0.8), 'black', bevel=0.025))
    n = 36
    kw = 1.5 / n
    for i in range(n):
        x = -0.75 + kw * (i + 0.5)
        p.append(box((kw * 0.9, 0.2, 0.03), (x, -0.08, 0.86), 'white', bevel=0.0))
        if i % 7 in (0, 1, 3, 4, 5) and i < n - 1:
            p.append(box((kw * 0.55, 0.12, 0.03), (x + kw / 2, -0.04, 0.885), 'black', bevel=0.0))
    for s in (-1, 1):
        p.append(box((0.12, 0.3, 0.005), (s * 0.83, 0.0, 0.852), 'grayDark', bevel=0.0))
    p.append(box((0.24, 0.06, 0.01), (0, 0.12, 0.855), 'screen', bevel=0.0))
    for x, m in ((-0.3, 'yellow'), (-0.24, 'pink'), (-0.18, 'teal'), (0.2, 'red')):
        p.append(cyl(0.018, 0.015, (x, 0.12, 0.857), m, verts=10))
    for x in (0.3, 0.38):
        p.append(cyl(0.022, 0.03, (x, 0.12, 0.865), 'gray', verts=12))
    p.append(box((0.6, 0.02, 0.32), (0, 0.18, 1.05), 'black', bevel=0.01, rot=(R(-15), 0, 0)))
    for x in (-0.14, 0.14):
        p.append(box((0.26, 0.01, 0.3), (x, 0.163, 1.06), 'white', bevel=0.0, rot=(R(-15), 0, 0)))
        for j in range(4):
            z = 1.14 - j * 0.06
            p.append(box((0.22, 0.004, 0.004), (x, 0.157 + (z - 1.06) * math.sin(R(15)), z), 'grayDark', bevel=0.0, rot=(R(-15), 0, 0)))
    export('teclado', p)


TODOS = ['guarda-roupa', 'criado-mudo', 'comoda', 'poltrona', 'cadeira-gamer', 'mesa-gamer', 'fliperama',
         'caixa-som', 'cesto-brinquedos', 'skate', 'cafeteira', 'livros', 'porta-retrato', 'luminaria-mesa',
         'lampada-lava', 'cacto', 'vaso-flores', 'planta-pendurada', 'aquario', 'caminha-pet', 'arranhador',
         'letreiro-neon', 'varal-luzes', 'quadro-cortica', 'mapa-mundi', 'vitrola', 'teclado']

if __name__ == '__main__':
    nomes = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for name in nomes or TODOS:
        globals()[name.replace('-', '_')]()
