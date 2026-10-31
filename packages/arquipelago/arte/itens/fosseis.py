"""Os fósseis do Vale dos Dinos: crânio de rex, dente, garra, vértebra, chifre de tricerátopo e ovo.

O desenho de cada fóssil mora só aqui (`FORMAS`). Dois lados usam o mesmo desenho:

- este script grava um GLB por fóssil em `src/assets/itens/<id>.glb` (o museu de casa), com UM nó
  `<id>` e a origem no meio da base, como os outros itens;
- `arte/ilhas-b/vale.py` importa este módulo e põe os mesmos fósseis como nós do
  `vale-dos-dinos-props.glb` (os nós têm o nome do id: `fossil-cranio-rex`, `fossil-dente`…).

Por isso o módulo só usa as formas do `lib_ilha`/`lib_q` (que os dois lados carregam) e a paleta
própria abaixo. Cores de osso e de pedra, pelo nome do material: `ossoFossil*` e `pedraFossil*`.
Cada fóssil fica deitado no chão, com 0,3 a 0,6 m na maior dimensão.

  /tmp/claude-0/blender-venv/bin/python -B arte/itens/fosseis.py
  ITEM=fossil-dente /tmp/claude-0/blender-venv/bin/python -B arte/itens/fosseis.py
"""
import math
import random

if __name__ == '__main__':
    import lib_itens  # noqa: F401  (caminhos do lib_q e do lib_ilha, paleta dos itens)

import bpy  # noqa: E402
import lib_ilha  # noqa: E402
import lib_q  # noqa: E402
from lib_ilha import cone, cyl, rock, superellipsoid, torus, tube, uvball  # noqa: E402
from mathutils import Vector  # noqa: E402

R = math.radians

lib_q.PALETTE.update({
    'ossoFossil': ('#e3d2ad', 0.85, None, 0),
    'ossoFossilClaro': ('#f3e9d0', 0.8, None, 0),
    'ossoFossilEscuro': ('#b49a72', 0.9, None, 0),
    'pedraFossil': ('#a89b88', 0.9, None, 0),
    'pedraFossilEscura': ('#5e554b', 0.95, None, 0),
})


def assentar(objs):
    """Põe o conjunto com o meio da base na origem (centrado em x e y, o ponto mais baixo em z = 0)."""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    lib_ilha.place(objs, loc=(-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
    return objs


def _deformar(o, f):
    for v in o.data.vertices:
        v.co = f(v.co.copy())
    o.data.update()
    return o


def cranio_rex():
    """Crânio de rex deitado: caixa craniana alta, focinho, mandíbula, órbita, janelas e dentes."""
    p = [superellipsoid((0.30, 0.24, 0.22), (-0.10, 0, 0.14), 'ossoFossil', e1=0.75, e2=0.8, seg=12, ring=7),
         superellipsoid((0.30, 0.17, 0.15), (0.11, 0, 0.12), 'ossoFossil', e1=0.75, e2=0.8, seg=12, ring=6),
         superellipsoid((0.44, 0.18, 0.07), (0.03, 0, 0.04), 'ossoFossilEscuro', e1=0.8, e2=0.8, seg=10, ring=5)]
    # Sobrancelha (o calombo em cima do olho) e o osso da bochecha.
    for y in (-0.085, 0.085):
        p.append(uvball(0.035, (-0.07, y, 0.245), 'ossoFossil', seg=8, ring=5, scale=(1.4, 0.8, 0.6)))
        p.append(uvball(0.045, (-0.17, y * 1.2, 0.09), 'ossoFossilEscuro', seg=8, ring=5, scale=(1.5, 0.6, 0.8)))
    # Órbita, a janela de trás e a narina, vazadas (pedra escura dentro).
    for y in (-0.112, 0.112):
        p.append(uvball(0.04, (-0.08, y, 0.175), 'pedraFossilEscura', seg=8, ring=5, scale=(1.0, 0.45, 1.1)))
        p.append(uvball(0.035, (0.04, y * 0.78, 0.12), 'pedraFossilEscura', seg=8, ring=5, scale=(1.5, 0.45, 0.7)))
        p.append(uvball(0.016, (0.235, y * 0.45, 0.15), 'pedraFossilEscura', seg=6, ring=4, scale=(1.4, 0.6, 0.8)))
    # Dentes de cima, apontando para baixo, entre o focinho e a mandíbula.
    for k in range(5):
        x = -0.02 + k * 0.055
        for y in (-0.065, 0.065):
            p.append(cone(0.013, 0.05, (x, y * (1 - k * 0.06), 0.065), 'ossoFossilClaro', verts=4, rot=(math.pi, 0, 0)))
    return p


def dente():
    """Dente de rex deitado de lado: a coroa curva e serrilhada e a raiz mais escura."""
    pts, raios = [], []
    for i in range(8):
        t = i / 7
        a = t * 0.9
        pts.append((-0.12 + 0.28 * math.sin(a) / math.sin(0.9), 0.07 * (1 - math.cos(a)) / (1 - math.cos(0.9)), 0))
        raios.append(0.048 * (1 - t) ** 0.8 + 0.004)
    coroa = tube(pts, raios, 'ossoFossilClaro', seg=10)
    # Achata de lado (a lâmina do dente) e assenta no chão.
    _deformar(coroa, lambda v: Vector((v.x, v.y, v.z * 0.62)))
    raiz = tube([(-0.2, -0.004, 0), (-0.15, -0.002, 0), (-0.11, 0, 0)], [0.036, 0.046, 0.049], 'ossoFossilEscuro', seg=10)
    _deformar(raiz, lambda v: Vector((v.x, v.y, v.z * 0.62)))
    p = [coroa, raiz]
    # O serrilhado: dentinhos miúdos ao longo da borda de dentro da curva.
    for i in range(1, 6):
        t = i / 7
        a = t * 0.9
        x = -0.12 + 0.28 * math.sin(a) / math.sin(0.9)
        y = 0.07 * (1 - math.cos(a)) / (1 - math.cos(0.9))
        r = 0.048 * (1 - t) ** 0.8 + 0.004
        p.append(uvball(0.008, (x + 0.004, y - r * 0.92, 0), 'ossoFossil', seg=6, ring=4))
    return p


def garra():
    """Garra de rex em gancho, em pé sobre a curva, com o osso do dedo na base."""
    pts, raios = [], []
    for i in range(10):
        t = i / 9
        a = R(118 - 105 * t)
        pts.append((0.2 * math.cos(a), 0, 0.2 * math.sin(a)))
        raios.append(0.055 * (1 - t) ** 0.85 + 0.003)
    o = tube(pts, raios, 'ossoFossilClaro', seg=12)
    # Achatada de lado (lâmina da garra).
    _deformar(o, lambda v: Vector((v.x, v.y * 0.62, v.z)))
    # A estria do lado da garra, de um lado e do outro.
    estrias = []
    for s_ in (-1, 1):
        q = []
        for t in (0.05, 0.25, 0.45, 0.65, 0.85):
            a = R(118 - 105 * t)
            r = 0.055 * (1 - t) ** 0.85 + 0.003
            q.append((0.2 * math.cos(a), s_ * r * 0.6, 0.2 * math.sin(a) + 0.006))
        estrias.append(tube(q, [0.006, 0.0055, 0.005, 0.004, 0.003], 'ossoFossilEscuro', seg=5))
    bx, bz = 0.2 * math.cos(R(118)), 0.2 * math.sin(R(118))
    base = [uvball(0.058, (bx - 0.02, 0, bz - 0.02), 'ossoFossil', seg=10, ring=6, scale=(1.1, 0.8, 0.9)),
            cyl(0.034, 0.09, (bx - 0.085, 0, bz - 0.045), 'ossoFossil', verts=8, rot=(0, R(70), 0)),
            uvball(0.042, (bx - 0.135, 0, bz - 0.065), 'ossoFossilEscuro', seg=8, ring=5, scale=(0.8, 0.9, 0.85))]
    return [o] + estrias + base


def vertebra():
    """Vértebra em pé: o corpo redondo deitado, o arco com o furo, o espinho e as duas asas."""
    p = [cyl(0.095, 0.15, (0, 0, 0.095), 'ossoFossil', verts=14, rot=(0, R(90), 0))]
    for x in (-0.078, 0.078):
        p.append(torus(0.085, 0.016, (x, 0, 0.095), 'ossoFossilEscuro', seg=14, rseg=5, rot=(0, R(90), 0)))
    # O arco (por onde passava a medula) e o furo escuro no meio.
    p.append(torus(0.05, 0.024, (0, 0, 0.225), 'ossoFossil', seg=12, rseg=6, rot=(0, R(90), 0)))
    p.append(cyl(0.03, 0.06, (0, 0, 0.225), 'pedraFossilEscura', verts=10, rot=(0, R(90), 0)))
    # O espinho de cima, achatado e inclinado para trás.
    esp = tube([(0, 0, 0.26), (-0.02, 0, 0.34), (-0.05, 0, 0.42)], [0.03, 0.022, 0.012], 'ossoFossil', seg=8)
    _deformar(esp, lambda v: Vector((v.x, v.y * 0.5, v.z)))
    p.append(esp)
    # As asas (processos transversos), para os lados e um pouco para cima.
    for s in (-1, 1):
        asa = tube([(0, s * 0.04, 0.2), (0, s * 0.11, 0.22), (0, s * 0.17, 0.25)], [0.024, 0.018, 0.012], 'ossoFossil',
                   seg=7)
        p.append(asa)
        p.append(uvball(0.016, (0, s * 0.172, 0.252), 'ossoFossilEscuro', seg=6, ring=4))
    return p


def chifre_triceratopo():
    """Chifre de tricerátopo deitado, curvando para cima, preso num pedaço do osso do crânio."""
    pts, raios = [], []
    for i in range(8):
        t = i / 7
        pts.append((-0.16 + 0.42 * t, 0, 0.09 + 0.2 * t ** 1.8))
        raios.append(0.075 * (1 - t) ** 0.85 + 0.005)
    p = [tube(pts, raios, 'ossoFossil', seg=12)]
    # As estrias do chifre (anéis rasos) e a base no osso do crânio.
    for t in (0.18, 0.36, 0.54):
        i = t * 7
        k = int(i)
        f = i - k
        c = Vector(pts[k]).lerp(Vector(pts[k + 1]), f)
        r = 0.075 * (1 - t) ** 0.85 + 0.005
        d = (Vector(pts[k + 1]) - Vector(pts[k])).normalized()
        ang = math.atan2(d.z, d.x)
        p.append(torus(r * 0.98, 0.006, tuple(c), 'ossoFossilEscuro', seg=12, rseg=4, rot=(0, R(90) - ang, 0)))
    p.append(superellipsoid((0.2, 0.22, 0.14), (-0.19, 0, 0.07), 'ossoFossilEscuro', e1=0.7, e2=0.8, seg=12, ring=6))
    p.append(uvball(0.05, (-0.22, 0.07, 0.12), 'pedraFossilEscura', seg=8, ring=5, scale=(1, 0.6, 0.8)))
    return p


def ovo():
    """Ovo de dino virado pedra, deitado num pedaço de rocha, com rachaduras."""
    rnd = random.Random(11)
    base = rock((0, 0, 0), (0.36, 0.3, 0.09), 'pedraFossilEscura', seed=5, subdiv=1, rough=0.2)
    centro = Vector((0.0, 0.0, 0.12))
    raios = Vector((0.135, 0.105, 0.1))
    o = uvball(1, tuple(centro), 'pedraFossil', seg=16, ring=10, scale=tuple(raios))
    o.rotation_euler = (0, R(-14), R(25))
    p = [base, o]
    bpy.context.view_layer.update()
    M = o.matrix_world.copy()
    # Rachaduras: linhas quebradas por cima da casca (um pouco para fora dela).
    for k in range(3):
        a0 = rnd.uniform(0, 2 * math.pi)
        pts = []
        for i in range(5):
            u = a0 + i * 0.35 + rnd.uniform(-0.1, 0.1)
            w = R(10 + i * 13 + rnd.uniform(-6, 6))
            loc = Vector((math.cos(w) * math.cos(u), math.cos(w) * math.sin(u), math.sin(w)))
            pts.append(tuple(M @ (Vector((loc.x * raios.x, loc.y * raios.y, loc.z * raios.z)) * 1.03)))
        p.append(tube(pts, [0.007] * 5, 'pedraFossilEscura', seg=5))
    return p


FORMAS = {
    'fossil-cranio-rex': cranio_rex,
    'fossil-dente': dente,
    'fossil-garra': garra,
    'fossil-vertebra': vertebra,
    'fossil-chifre-triceratopo': chifre_triceratopo,
    'fossil-ovo': ovo,
}


def fossil(pid):
    """As peças do fóssil `pid`, já com o meio da base na origem."""
    return assentar(FORMAS[pid]())


ITENS = [(pid, (lambda pid=pid: {'nos': {pid: fossil(pid)}, 'grupo': 'fosseis'})) for pid in FORMAS]

if __name__ == '__main__':
    from lib_itens import rodar

    rodar(ITENS)
