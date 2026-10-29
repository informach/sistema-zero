"""Carnaval (`src/assets/festas/carnaval.glb`): um arquivo com as peças lado a lado.

Nós (cada um com o pivô no meio da própria base):
- `confetes`: confete espalhado no chão (um tapete redondo de 1,4 de diâmetro);
- `serpentinas`: serpentinas enroladas e soltas no chão;
- `mascaras`: um painel de parede com três máscaras de baile e penas (o jogo encosta na parede;
  a frente olha para +Z do three.js);
- `carro-alegorico`: carro alegórico pequeno, com rodas, saia em ondas e um sol sorridente no alto.
  Os raios do sol são o nó `sol-do-carro` (pivô no centro do sol), com o clipe `girar` (4 s, em
  laço): eles giram atrás do rosto, que fica parado no carro;
- `faixas`: dois postes com fitas coloridas penduradas entre eles.
"""
from lib_festas import *

CONF = ['confeteRosa', 'confeteAzul', 'confeteAmarelo', 'confeteVerde', 'confeteLilas']


def confetes():
    rnd = __import__('random').Random(7)
    p = []
    for k in range(70):
        r = 0.7 * math.sqrt(rnd.random())
        a = rnd.random() * 2 * math.pi
        x, y = math.cos(a) * r, math.sin(a) * r
        m = CONF[k % len(CONF)]
        if k % 3:
            p.append(cyl(0.025, 0.006, (x, y, 0.003), m, verts=6))
        else:
            p.append(box((0.04, 0.03, 0.006), (x, y, 0.003), m, bevel=0, rot=(0, 0, rnd.random() * 3)))
    return p


def _helice(c, r, voltas, alt, n=36):
    return [(c[0] + r * math.cos(2 * math.pi * voltas * k / n), c[1] + r * math.sin(2 * math.pi * voltas * k / n),
             c[2] + alt * k / n) for k in range(n + 1)]


def serpentinas():
    p = []
    for k, (cx, cy, m) in enumerate(((0, 0, 'confeteRosa'), (0.35, 0.15, 'confeteAzul'), (-0.3, 0.2, 'confeteAmarelo'),
                                    (0.1, -0.3, 'confeteVerde'))):
        # Rolinho em pé que se desenrola em ondas pelo chão, cada um para um lado.
        p.append(cyl(0.05, 0.03, (cx, cy, 0.015), m, verts=12))
        ang = k * 1.6
        onda = []
        for i in range(25):
            t = i / 24
            u, v = 0.05 + 0.5 * t, 0.06 * math.sin(t * 14 + k)
            onda.append((cx + u * math.cos(ang) - v * math.sin(ang), cy + u * math.sin(ang) + v * math.cos(ang),
                         0.008 + 0.01 * abs(math.sin(t * 7))))
        p.append(tube(onda, [0.008] * len(onda), m, seg=4))
        p.append(tube(_helice((cx, cy, 0.04), 0.05, 2.5, 0.18, n=30), [0.007] * 31, m, seg=4))
    return p


def mascara(cx, cz, cor, pena, k=1.35):
    """Uma máscara de baile no painel; `k` é o tamanho (1,35: com 1 elas sumiam no painel)."""
    p = []
    # Máscara de baile: dois lóbulos com a ponta para cima nas laterais.
    pts = []
    for i in range(25):
        t = i / 24 * 2 * math.pi
        x = 0.16 * math.sin(t)
        z = 0.06 * math.cos(t) + 0.03 * math.cos(2 * t) + 0.04 * abs(math.sin(t)) ** 3
        if abs(x) < 0.02 and math.cos(t) < 0:
            z += 0.03
        pts.append((x * k, z * k))
    p.append(prism(pts, 0.025, (cx, -0.05, cz), cor, bevel=0.006))
    for s in (-1, 1):
        olho = esfera(0.035 * k, (cx + s * 0.065 * k, -0.065, cz + 0.01 * k), 'ferro', escala=(1.25, 0.3, 0.8), seg=10,
                      aneis=6)
        p.append(olho)
        p.append(lib_q.torus(0.042 * k, 0.007 * k, (cx + s * 0.065 * k, -0.068, cz + 0.01 * k), 'brilho', seg=14,
                             rseg=4, rot=(R(90), 0, 0)))
    # Penas saindo do canto de cima, abertas em leque para cima (sem passar da borda do painel).
    for i in range(3):
        yaw = R(-30 + 25 * i)
        p.append(leaf((cx + 0.11 * k, -0.06, cz + 0.05 * k), yaw, 0.14 * k, 0.045 * k, pena, lift=0.3, droop=0.04,
                      fold=0.2, n=6))
    for i in range(5):
        p.append(sphere(0.008 * k, (cx + (-0.1 + i * 0.05) * k, -0.068, cz - 0.045 * k), 'brilho', subdiv=1))
    return p


def mascaras():
    p = [box((1.5, 0.04, 0.66), (0, 0, 0.33), 'parede', bevel=0.02, segs=1)]
    p.append(box((1.56, 0.05, 0.05), (0, -0.005, 0.66), 'madeira', bevel=0.012, segs=1))
    p.append(box((1.56, 0.05, 0.05), (0, -0.005, 0.0), 'madeira', bevel=0.012, segs=1))
    for i, (cor, pena) in enumerate((('confeteRosa', 'pena'), ('confeteAzul', 'confeteAmarelo'),
                                     ('confeteLilas', 'confeteVerde'))):
        # As penas saem para a direita: o trio fica um pouco à esquerda para a última não passar da borda.
        p += mascara(-0.5 + i * 0.46, 0.26, cor, pena)
    return p


def carro():
    p = [box((1.6, 1.0, 0.45), (0, 0, 0.5), 'carroBase', bevel=0.05, segs=2)]
    # Saia em ondas em volta da base.
    for k in range(16):
        t = k / 16
        if t < 0.5:
            x, y, rz = -0.8 + 1.6 * (t / 0.5), -0.52, 0
        else:
            x, y, rz = 0.8 - 1.6 * ((t - 0.5) / 0.5), 0.52, 0
        p.append(cyl(0.1, 0.02, (x + 0.05, y, 0.28), CONF[k % 5], verts=12, rot=(R(90), 0, rz)))
    for x in (-0.55, 0.55):
        for y in (-0.42, 0.42):
            p.append(cyl(0.15, 0.1, (x, y, 0.15), 'carroRoda', verts=14, rot=(R(90), 0, 0), bevel=0.02))
            p.append(cyl(0.06, 0.11, (x, y, 0.15), 'ouro', verts=10, rot=(R(90), 0, 0)))
    # Degraus e um coreto de onde sai o sol.
    p.append(box((1.1, 0.7, 0.2), (0, 0.05, 0.82), 'confeteAmarelo', bevel=0.04, segs=2))
    p.append(cyl(0.12, 0.6, (0, 0.05, 1.2), 'confeteRosa', verts=12))
    for k in range(8):
        a = 2 * math.pi * k / 8
        p.append(sphere(0.06, (math.cos(a) * 0.62, 0.05 + math.sin(a) * 0.3, 0.98), CONF[k % 5], subdiv=1))
    rosto = [esfera(0.3, (0, 0, 0), 'confeteAmarelo', escala=(1, 0.5, 1), seg=16, aneis=10)]
    sol = []
    for k in range(12):
        a = 2 * math.pi * k / 12
        raio = prism([(-0.06, 0), (0.06, 0), (0, 0.2)], 0.05, (math.cos(a) * 0.3, 0, math.sin(a) * 0.3),
                     'abobora' if k % 2 else 'confeteAmarelo', rot=(0, -a + R(90), 0))
        sol.append(raio)
    for s in (-1, 1):
        rosto.append(esfera(0.04, (s * 0.1, -0.15, 0.06), 'ferro', escala=(0.8, 0.4, 1.1), seg=8, aneis=6))
        rosto.append(esfera(0.045, (s * 0.17, -0.145, -0.05), 'confeteRosa', escala=(1, 0.3, 0.7), seg=8, aneis=5))
    sorriso = lib_q.torus(0.09, 0.015, (0, 0, 0), 'ferro', seg=14, rseg=4, arc=180)
    sorriso.rotation_euler = (R(90), R(180), 0)
    sorriso.location = (0, -0.15, -0.02)
    rosto.append(sorriso)
    lib_ilha.place(rosto + sol, loc=(0, 0.05, 1.82))
    return p + rosto, sol, (0, 0.05, 1.82)


def faixas():
    p = []
    for x in (-1.0, 1.0):
        p.append(cyl(0.04, 1.9, (x, 0, 0.95), 'madeira', verts=10))
        p.append(sphere(0.07, (x, 0, 1.92), 'brilho', subdiv=1))
    for k in range(7):
        x = -0.9 + k * 0.3
        z0 = 1.75 - 0.12 * (1 - (x / 1.0) ** 2)
        comp = 0.6 + 0.25 * ((k * 37) % 3)
        pts = [(x + 0.03 * math.sin(i * 1.4), 0.02 * math.cos(i), z0 - comp * i / 8) for i in range(9)]
        fita = tube(pts, [0.03] * 9, CONF[k % 5], seg=4)
        fita.scale = (1, 0.25, 1)
        p.append(fita)
    p.append(tube([(-1.0, 0, 1.75), (0, 0, 1.63), (1.0, 0, 1.75)], [0.012] * 3, 'barbante', seg=5))
    return p


def carnaval():
    cbase, csol, cpiv = carro()
    pecas = [('confetes', confetes()), ('serpentinas', serpentinas()), ('mascaras', mascaras()),
             ('carro-alegorico', cbase + csol), ('faixas', faixas())]
    nos, desl = enfileirar(pecas, vao=0.9, largura_max=4.5)
    nos['carro-alegorico'] = (cbase, nos['carro-alegorico'][1])
    nos['sol-do-carro'] = (csol, tuple(Vector(cpiv) + desl['carro-alegorico']))
    girar = {'sol-do-carro': {'rotation_euler': [(0, (0, 0, 0)), (48, (0, R(180), 0)), (96, (0, R(360), 0))],
                              '_linear': True}}
    return {'nos': nos, 'clipes': {'girar': girar}, 'grupo': 'festas'}


PECAS = [('carnaval', carnaval)]

if __name__ == '__main__':
    rodar(PECAS)
