"""Fim de ano (`src/assets/festas/fim-de-ano.glb`): um arquivo com as peças lado a lado.

Nós (cada um com o pivô no meio da própria base):
- `palmeira-enfeitada`: o pinheiro de Natal da ilha é uma palmeira, com um cordão de luzes em
  espiral no tronco (material `luz`), bolas penduradas nas folhas e a estrela no alto (`estrela`);
- `fogos`: o tubo de lançar no chão (`fogos`), o foguete (`foguete`) e o estouro (`estouro`, pivô
  no centro dele, 3 acima do chão). Clipe `estourar` (2 s, toca UMA vez: `LoopOnce` com
  `clampWhenFinished`): o foguete sobe e some, o estouro abre e se apaga. Parados, o foguete fica
  no tubo e o estouro fica pequenininho (escala 0,01), então o arquivo já sai certo sem o clipe;
- `mesa-da-ceia`: mesa com toalha, pratos, frutas (uva e abacaxi), panetone, jarra de suco, copos
  e uma vela (`luz`).
"""
from lib_festas import *


def palmeira():
    p = []
    pts = [(0.06 * math.sin(k * 0.5), 0.0, 2.4 * k / 10) for k in range(11)]
    p.append(tube(pts, [0.14 - 0.05 * k / 10 for k in range(11)], 'tronco', seg=10))
    for k in range(1, 10):
        x, _, z = pts[k]
        p.append(lib_q.torus(0.13 - 0.05 * k / 10, 0.02, (x, 0, z), 'troncoAnel', seg=12, rseg=4))
    topo = Vector(pts[-1])
    for k in range(8):
        yaw = 2 * math.pi * k / 8
        p.append(leaf(tuple(topo), yaw, 1.1, 0.24, 'palmeira' if k % 2 else 'palmeiraClara', lift=0.35, droop=0.9,
                      teeth=6, n=10))
    p.append(sphere(0.12, tuple(topo + Vector((0, 0, 0.02))), 'troncoAnel', subdiv=1))
    # Cocos e bolas de Natal penduradas nas folhas.
    for k in range(3):
        a = 2 * math.pi * k / 3
        p.append(sphere(0.07, (topo.x + math.cos(a) * 0.12, math.sin(a) * 0.12, topo.z - 0.1), 'coco', subdiv=1))
    for k in range(8):
        yaw = 2 * math.pi * k / 8 + 0.2
        r = 0.7
        z = topo.z + 0.35 * (r / 1.1) - 0.9 * (r / 1.1) ** 2
        m = 'enfeiteVermelho' if k % 2 else 'enfeiteAzul'
        p.append(cyl(0.004, 0.12, (topo.x + math.cos(yaw) * r, math.sin(yaw) * r, z - 0.08), 'ouro', verts=4))
        p.append(sphere(0.06, (topo.x + math.cos(yaw) * r, math.sin(yaw) * r, z - 0.17), m, subdiv=2))
    # Cordão de luzes em espiral.
    esp = []
    for k in range(60):
        t = k / 59
        z = 0.2 + t * 2.0
        r = 0.15 - 0.05 * t
        a = t * math.pi * 10
        x0 = 0.06 * math.sin(z / 2.4 * 10 * 0.5)
        esp.append((x0 + math.cos(a) * r, math.sin(a) * r, z))
    p.append(tube(esp, [0.006] * len(esp), 'fio', seg=4))
    for k in range(2, 60, 4):
        p.append(sphere(0.025, esp[k], 'luz', subdiv=1))
    # Estrela no alto.
    p.append(prism(lib_q.star_pts(0.2, 0.09), 0.06, (topo.x, 0, topo.z + 0.42), 'estrela', bevel=0.01))
    p.append(cyl(0.015, 0.25, (topo.x, 0, topo.z + 0.2), 'ouro', verts=6))
    # Presentes no pé.
    for k, (x, y, s, m) in enumerate(((0.35, -0.15, 0.22, 'enfeiteVermelho'), (-0.3, -0.2, 0.18, 'enfeiteAzul'),
                                      (0.05, -0.38, 0.15, 'confeteAmarelo'))):
        p.append(box((s, s, s), (x, y, s / 2), m, bevel=0.015, segs=1, rot=(0, 0, k * 0.4)))
        p.append(box((s + 0.01, 0.03, s + 0.01), (x, y, s / 2), 'ouro', bevel=0.004, segs=1, rot=(0, 0, k * 0.4)))
        p.append(box((0.03, s + 0.01, s + 0.01), (x, y, s / 2), 'ouro', bevel=0.004, segs=1, rot=(0, 0, k * 0.4)))
    return p


def fogos():
    tubo = [cyl(0.12, 0.3, (0, 0, 0.15), 'enfeiteAzul', verts=14, bevel=0.01)]
    tubo.append(cyl(0.125, 0.04, (0, 0, 0.28), 'confeteAmarelo', verts=14))
    tubo.append(cyl(0.125, 0.04, (0, 0, 0.05), 'confeteAmarelo', verts=14))
    tubo.append(cyl(0.09, 0.02, (0, 0, 0.3), 'ferro', verts=12))
    foguete = [cyl(0.05, 0.3, (0, 0, 0.45), 'foguete', verts=10)]
    foguete.append(cone(0.06, 0.12, (0, 0, 0.66), 'confeteAmarelo', verts=10, smooth_it=True))
    for k in range(3):
        a = 2 * math.pi * k / 3
        foguete.append(prism([(0, 0), (0.07, -0.05), (0, 0.1)], 0.015, (math.cos(a) * 0.05, math.sin(a) * 0.05, 0.32),
                             'enfeiteAzul', rot=(0, 0, a + R(90))))
    C = Vector((0, 0, 3.0))
    estouro = [sphere(0.12, tuple(C), 'fogoArtificio3', subdiv=1)]
    cores = ['fogoArtificio1', 'fogoArtificio2', 'fogoArtificio3']
    k = 0
    for i in range(5):
        el = math.pi * (i + 0.5) / 5 - math.pi / 2
        n = max(4, int(10 * math.cos(el)))
        for j in range(n):
            az = 2 * math.pi * j / n + i * 0.4
            d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
            estouro.append(tube([tuple(C + d * 0.25), tuple(C + d * 0.6)], [0.012, 0.022], cores[k % 3], seg=4))
            estouro.append(sphere(0.04, tuple(C + d * 0.66), cores[k % 3], subdiv=1))
            k += 1
    return tubo, foguete, estouro, C


def mesa():
    p = [box((1.4, 0.8, 0.06), (0, 0, 0.74), 'madeira', bevel=0.02, segs=1)]
    for x in (-0.62, 0.62):
        for y in (-0.32, 0.32):
            p.append(cyl(0.035, 0.72, (x, y, 0.36), 'madeiraEscura', verts=8))
    p.append(box((1.5, 0.9, 0.02), (0, 0, 0.78), 'toalha', bevel=0.008, segs=1))
    for s in (-1, 1):
        p.append(box((1.5, 0.02, 0.18), (0, s * 0.45, 0.7), 'toalha', bevel=0.006, segs=1))
        p.append(box((1.5, 0.025, 0.04), (0, s * 0.455, 0.62), 'toalhaBarra', bevel=0.006, segs=1))
    zt = 0.79
    for x in (-0.5, 0.5):
        for y in (-0.25, 0.25):
            p.append(prato(0.11, 'loucaBranca', pos=(x, y, zt)))
    # Fruteira com uva e abacaxi, panetone, jarra, copos e a vela.
    t, h = tigela(0.15, 0.08, 'loucaAzul', pos=(-0.15, 0, zt))
    p.append(t)
    for k in range(10):
        a = k * 2.4
        p.append(sphere(0.03, (-0.15 + math.cos(a) * 0.05 * (k % 3), math.sin(a) * 0.05 * (k % 3), zt + 0.06 + 0.02 * (k % 4)),
                        'uva', subdiv=1))
    p.append(esfera(0.07, (-0.05, 0.05, zt + 0.12), 'abacaxi', escala=(0.9, 0.9, 1.25), seg=10, aneis=8))
    for k in range(5):
        p.append(leaf((-0.05, 0.05, zt + 0.2), 2 * math.pi * k / 5, 0.1, 0.025, 'palmeira', lift=0.12, droop=0.02, n=4))
    p.append(torneado([(0, 0), (0.08, 0), (0.085, 0.1), (0.07, 0.15), (0.0, 0.17)], 'panetone', seg=14, pos=(0.18, 0, zt)))
    p.append(cyl(0.083, 0.03, (0.18, 0, zt + 0.02), 'papel', verts=14))
    jarra = torneado([(0, 0), (0.06, 0), (0.065, 0.04), (0.06, 0.16), (0.045, 0.2), (0, 0.2)], 'vidroCabine', seg=12,
                     pos=(0.42, 0.02, zt))
    p.append(jarra)
    p.append(torneado([(0, 0.005), (0.056, 0.005), (0.06, 0.13), (0, 0.13)], 'suco', seg=12, pos=(0.42, 0.02, zt)))
    for x, y in ((-0.38, -0.08), (0.38, 0.22), (-0.38, 0.12), (0.62, -0.05)):
        p.append(torneado([(0, 0), (0.025, 0), (0.03, 0.08), (0.025, 0.08), (0.02, 0.008), (0, 0.008)], 'vidroCabine',
                          seg=8, pos=(x, y, zt)))
    p.append(cyl(0.035, 0.02, (0.05, -0.28, zt + 0.01), 'ouro', verts=10))
    p.append(cyl(0.015, 0.1, (0.05, -0.28, zt + 0.07), 'papel', verts=8))
    p.append(prism([(0, 0), (0.012, 0.015), (0, 0.04), (-0.012, 0.015)], 0.012, (0.05, -0.28, zt + 0.12), 'luz'))
    return p


def fim_de_ano():
    tubo, foguete, estouro, C = fogos()
    pecas = [('palmeira-enfeitada', palmeira()), ('fogos', tubo + foguete + estouro), ('mesa-da-ceia', mesa())]
    nos, desl = enfileirar(pecas, vao=0.9, largura_max=4.5)
    d = desl['fogos']
    nos['fogos'] = (tubo, nos['fogos'][1])
    nos['foguete'] = (foguete, tuple(Vector((0, 0, 0.3)) + d))
    nos['estouro'] = (estouro, tuple(C + d))
    estourar = {
        'foguete': {'location': [(0, (0, 0, 0)), (16, (0, 0, 2.55)), (18, (0, 0, 2.7))],
                    'scale': [(0, (1, 1, 1)), (16, (1, 1, 1)), (18, (0.01, 0.01, 0.01)), (48, (0.01, 0.01, 0.01))]},
        'estouro': {'scale': [(0, (0.01, 0.01, 0.01)), (16, (0.01, 0.01, 0.01)), (24, (1.1, 1.1, 1.1)),
                              (36, (1.2, 1.2, 1.2)), (48, (0.01, 0.01, 0.01))]},
    }
    return {'nos': nos, 'clipes': {'estourar': estourar}, 'escala_repouso': {'estouro': 0.01},
            'grupo': 'festas'}


PECAS = [('fim-de-ano', fim_de_ano)]

if __name__ == '__main__':
    rodar(PECAS)
