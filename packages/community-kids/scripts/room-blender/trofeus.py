"""Troféus do quarto (concedidos por conquista) e a Estante de Troféus.

Troféu de chão: base em z = 0, cabe num nicho da estante (a peça entra a 72% de tamanho). O
dourado (`gold`) tem um brilho leve, para chamar o olho sem luz extra na cena.
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_q import *
from decor import WALL_BACK, plate


def pedestal(h=0.16, r=0.3, plaquinha=True):
    """Base de troféu em dois degraus, com a plaquinha dourada na frente."""
    p = [box((r * 2, r * 2, h * 0.6), (0, 0, h * 0.3), 'black', bevel=0.03)]
    p.append(box((r * 1.6, r * 1.6, h * 0.5), (0, 0, h * 0.85), 'grayDark', bevel=0.025))
    if plaquinha:
        p.append(box((r * 1.0, 0.02, h * 0.3), (0, -r, h * 0.32), 'gold', bevel=0.005))
    return p, h * 1.1


def taca(z0, h=0.5, r=0.26):
    """Taça clássica: haste, bojo largo que afina e duas alças."""
    p = [cyl(0.05, 0.14, (0, 0, z0 + 0.07), 'gold', verts=12)]
    p.append(cyl(0.12, 0.04, (0, 0, z0 + 0.16), 'gold', verts=16, bevel=0.01))
    p.append(cyl(r, h, (0, 0, z0 + 0.18 + h / 2), 'gold', verts=24, r2=r * 0.45))
    p[-1].rotation_euler = (math.radians(180), 0, 0)
    p.append(torus(r * 0.98, 0.025, (0, 0, z0 + 0.18 + h), 'gold', seg=24, rseg=6))
    for s in (-1, 1):
        p.append(torus(0.12, 0.025, (s * (r + 0.02), 0, z0 + 0.18 + h * 0.62), 'gold', seg=16, rseg=6, rot=(math.radians(90), 0, 0), arc=360))
    return p, z0 + 0.18 + h


def trofeu_primeiro_jogo():
    reset()
    p, z = pedestal()
    t, top = taca(z)
    p += t
    # Controle de videogame em relevo no bojo.
    p.append(box((0.22, 0.03, 0.1), (0, -0.2, z + 0.48), 'navy', bevel=0.03))
    p.append(box((0.07, 0.035, 0.02), (-0.05, -0.215, z + 0.48), 'white', bevel=0.0))
    p.append(box((0.02, 0.035, 0.07), (-0.05, -0.215, z + 0.48), 'white', bevel=0.0))
    for dx, c in ((0.04, 'red'), (0.075, 'green')):
        p.append(sphere(0.016, (dx, -0.22, z + 0.48 + (0.015 if c == 'red' else -0.015)), c, subdiv=1))
    p.append(prism(star_pts(0.08, 0.035), 0.03, (0, 0, top + 0.1), 'yellow', bevel=0.005))
    export('trofeu-primeiro-jogo', p)


def trofeu_diploma():
    reset()
    y = WALL_BACK
    p = [plate(0.86, 0.86, 0.06, 'gold', bevel=0.02)]
    p.append(plate(0.7, 0.7, 0.02, 'cream', y=y - 0.07, bevel=0.0))
    for z, w in ((0.2, 0.44), (0.08, 0.5), (-0.02, 0.36)):
        p.append(box((w, 0.01, 0.025), (0, y - 0.085, z), 'grayDark', bevel=0.0))
    p.append(cyl(0.09, 0.02, (0.18, y - 0.09, -0.2), 'red', verts=16, rot=(math.radians(90), 0, 0)))
    for s in (-1, 1):
        p.append(prism([(0, 0), (0.05, 0), (0.06, -0.14), (0.025, -0.11), (-0.01, -0.14)], 0.01, (0.18 + s * 0.04, y - 0.085, -0.24), 'red'))
    p.append(prism(star_pts(0.045, 0.02), 0.015, (0.18, y - 0.105, -0.2), 'yellow'))
    export('trofeu-diploma', p)


def chama(h, r, loc, m):
    """Labareda: gota que afina e entorta na ponta."""
    c = sphere(r, loc, m, scale=(1, 1, h / r), subdiv=3)
    for v in c.data.vertices:
        if v.co.z > 0:
            t = v.co.z / h
            f = max(0.05, 1 - t ** 1.3)
            v.co.x = v.co.x * f + 0.25 * r * t * t
            v.co.y *= f
    return c


def trofeu_chama():
    reset()
    p, z = pedestal()
    p.append(cyl(0.18, 0.14, (0, 0, z + 0.07), 'gold', verts=20, r2=0.24))
    # Três labaredas escalonadas para a frente: cada camada aparece por cima da de trás.
    p.append(chama(0.46, 0.19, (0, 0.05, z + 0.34), 'red'))
    p.append(chama(0.34, 0.14, (0.02, -0.08, z + 0.3), 'orange'))
    p.append(chama(0.22, 0.085, (0.0, -0.17, z + 0.26), 'lamp'))
    for s_ in (-1, 1):
        p.append(chama(0.2, 0.08, (s_ * 0.14, 0.0, z + 0.22), 'red'))
    p.append(text('30', 0.1, (0, -0.25, z * 0.35), 'white', depth=0.01))
    export('trofeu-chama', p)


def trofeu_medalha_mil():
    reset()
    y = WALL_BACK
    p = [plate(0.8, 0.86, 0.05, 'woodDark', bevel=0.02)]
    # Fita em V e a medalha com o alvo acertado no meio.
    for s in (-1, 1):
        p.append(box((0.14, 0.02, 0.42), (s * 0.09, y - 0.07, 0.16), 'blue' if s < 0 else 'red', bevel=0.005, rot=(0, math.radians(s * 22), 0)))
    p.append(cyl(0.2, 0.05, (0, y - 0.09, -0.14), 'gold', verts=28, bevel=0.01, rot=(math.radians(90), 0, 0)))
    for r, c in ((0.15, 'red'), (0.11, 'white'), (0.07, 'red'), (0.035, 'yellow')):
        p.append(cyl(r, 0.01, (0, y - 0.12 - (0.15 - r) * 0.05, -0.14), c, verts=24, rot=(math.radians(90), 0, 0)))
    export('trofeu-medalha-mil', p)


def trofeu_foguete():
    reset()
    p, z = pedestal(r=0.3)
    p.append(cyl(0.16, 0.12, (0, 0, z + 0.06), 'gold', verts=16, r2=0.12))
    corpo = cyl(0.17, 0.8, (0, 0, z + 0.6), 'white', verts=20)
    for v in corpo.data.vertices:  # charuto: mais largo no meio
        k = 1 - (v.co.z / 0.4) ** 2 * 0.2
        v.co.x *= k
        v.co.y *= k
    p.append(corpo)
    p.append(cone(0.15, 0.32, (0, 0, z + 1.16), 'red', verts=20, smooth_it=True))
    p.append(cyl(0.075, 0.03, (0, -0.16, z + 0.72), 'glass', verts=16, rot=(math.radians(90), 0, 0)))
    p.append(torus(0.075, 0.018, (0, -0.165, z + 0.72), 'gold', seg=16, rseg=5, rot=(math.radians(90), 0, 0)))
    for k in range(3):
        a = math.radians(90 + 120 * k)
        aleta = prism([(0, 0), (0.18, -0.12), (0.18, 0.06), (0, 0.24)], 0.03, (0, 0, 0), 'red', bevel=0.005)
        aleta.location = (0.13 * math.cos(a), 0.13 * math.sin(a), z + 0.3)
        aleta.rotation_euler = (0, 0, a)
        p.append(aleta)
    p.append(chama(0.18, 0.08, (0, 0, z + 0.1), 'lamp'))
    p[-1].rotation_euler = (math.radians(180), 0, 0)
    export('trofeu-foguete', p)


def trofeu_console():
    reset()
    p, z = pedestal(r=0.32)
    p.append(box((0.5, 0.36, 0.62), (0, 0.02, z + 0.31), 'gold', bevel=0.04))
    p.append(box((0.4, 0.02, 0.28), (0, -0.165, z + 0.44), 'screen', bevel=0.01))
    p.append(box((0.42, 0.24, 0.06), (0, -0.12, z + 0.2), 'gold', bevel=0.02, rot=(math.radians(-20), 0, 0)))
    p.append(cyl(0.015, 0.06, (-0.1, -0.16, z + 0.25), 'black', verts=8))
    p.append(sphere(0.03, (-0.1, -0.16, z + 0.29), 'red', subdiv=2))
    for dx, c in ((0.05, 'green'), (0.11, 'blue')):
        p.append(cyl(0.025, 0.02, (dx, -0.17, z + 0.23), c, verts=12, rot=(math.radians(70), 0, 0)))
    p.append(prism(star_pts(0.05, 0.022), 0.012, (0, -0.172, z + 0.44), 'yellow'))
    export('trofeu-console', p)


def trofeu_estrela_do_mural():
    reset()
    p, z = pedestal()
    p.append(cyl(0.05, 0.3, (0, 0, z + 0.15), 'gold', verts=12))
    est = prism(star_pts(0.3, 0.13), 0.1, (0, 0, z + 0.58), 'gold', bevel=0.02)
    for v in est.data.vertices:
        if v.co.y < 0:
            v.co.y -= 0.06 * max(0, 1 - math.hypot(v.co.x, v.co.z) / 0.3)
    p.append(est)
    p.append(text('100', 0.1, (0, -0.12, z + 0.56), 'red', depth=0.01))
    export('trofeu-estrela-do-mural', p)


def trofeu_oficina_completa():
    reset()
    p, z = pedestal()
    p.append(cyl(0.05, 0.22, (0, 0, z + 0.11), 'gold', verts=12))
    p.append(box((0.6, 0.12, 0.42), (0, 0, z + 0.45), 'gold', bevel=0.03))
    p.append(box((0.48, 0.02, 0.3), (0, -0.06, z + 0.45), 'screen', bevel=0.01))
    p.append(sphere(0.035, (0.18, -0.075, z + 0.56), 'red', subdiv=2))
    p.append(prism([(-0.05, -0.06), (0.07, 0), (-0.05, 0.06)], 0.012, (0, -0.075, z + 0.45), 'lamp'))
    for s in (-1, 1):  # antenas da câmera de transmissão
        p.append(cyl(0.012, 0.2, (s * 0.1, 0, z + 0.74), 'gold', verts=6, rot=(0, math.radians(s * 25), 0)))
        p.append(sphere(0.03, (s * 0.145, 0, z + 0.83), 'gold', subdiv=1))
    export('trofeu-oficina-completa', p)


def estante_trofeus():
    """3 × 2 com 6 nichos. Pisos em z 0.2 e 1.24, nichos em x -0.92, 0, 0.92 (SURFACE_SLOTS)."""
    reset()
    W, D, H = 2.9, 0.62, 2.1
    p = [box((W, D, 0.2), (0, 0, 0.1), 'woodDark', bevel=0.03)]
    p.append(box((W, D, 0.1), (0, 0, 1.19), 'woodDark', bevel=0.02))
    p.append(box((W + 0.08, D + 0.06, 0.12), (0, 0, H), 'woodDark', bevel=0.03))
    p.append(box((W - 0.1, 0.05, H - 0.1), (0, D / 2 - 0.025, H / 2), 'navy', bevel=0.0))
    for x in (-W / 2 + 0.05, -0.46, 0.46, W / 2 - 0.05):
        p.append(box((0.1, D, H - 0.12), (x, 0, (H - 0.06) / 2), 'woodDark', bevel=0.02))
    # Friso dourado no alto e nos pisos, e a placa com a estrela.
    p.append(box((W, 0.03, 0.04), (0, -D / 2, 0.19), 'gold', bevel=0.005))
    p.append(box((W, 0.03, 0.04), (0, -D / 2, 1.23), 'gold', bevel=0.005))
    p.append(box((W + 0.08, 0.03, 0.05), (0, -D / 2 - 0.03, H - 0.02), 'gold', bevel=0.005))
    p.append(prism(star_pts(0.12, 0.05), 0.03, (0, -D / 2 - 0.05, H + 0.16), 'gold', bevel=0.01))
    for x in (-0.92, 0, 0.92):
        for z in (0.2, 1.24):
            p.append(cyl(0.16, 0.02, (x, 0.06, z + 0.01), 'gold', verts=16))
    export('estante-trofeus', p)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name.replace('-', '_')]()
