"""A horta: o canteiro de madeira e as plantas em cada estágio.

Referencial: o centro de UM canteiro, com y = 0 no chão (o jogo põe os seis em `HORTA`). O tampo
da terra fica em y = 0,22 e cada canteiro tem quatro covas em (±0,35, ±0,35), como antes.

Nós (contrato com `src/mundo/horta.tsx`):
- `canteiro`: a caixa de tábuas com a terra; o material da terra chama `terra` (o jogo escurece
  quando está regado);
- `semente`: a covinha com as sementes (estágio "semente", esperando água);
- `<planta>-broto`, `<planta>-crescendo`, `<planta>-maduro` para alface, tomate e milho: UMA
  planta, com a base na origem (o jogo põe uma em cada cova, já na altura da terra).
"""
from lib_mundo import *

TERRA = 0.22
LADO = 1.35


def canteiro():
    p = []
    h = 0.3
    meio = LADO / 2
    # Duas tábuas empilhadas por lado, com as pontas encaixadas nos pilares.
    for k, (z0, z1) in enumerate(((0.0, 0.15), (0.15, 0.3))):
        cor = 'madeiraCanteiro' if k == 0 else 'madeiraCanteiroEscura'
        zc, alt = (z0 + z1) / 2, z1 - z0 - 0.015
        for s in (-1, 1):
            p.append(box((LADO - 0.16, 0.08, alt), (0, s * (meio - 0.04), zc), cor, bevel=0.02, segs=1))
            p.append(box((0.08, LADO - 0.16, alt), (s * (meio - 0.04), 0, zc), cor, bevel=0.02, segs=1))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(box((0.13, 0.13, h + 0.06), (sx * (meio - 0.05), sy * (meio - 0.05), (h + 0.06) / 2), 'tronco',
                         bevel=0.025, segs=1))
    # Terra fofa: grade com calombos e dois sulcos.
    n = 6
    verts, faces = [], []
    w = LADO - 0.14
    for j in range(n + 1):
        for i in range(n + 1):
            x = -w / 2 + w * i / n
            y = -w / 2 + w * j / n
            borda = i in (0, n) or j in (0, n)
            z = TERRA - 0.01 if borda else TERRA + 0.03 * math.cos(x / w * 2 * math.pi * 2) ** 2 + 0.01 * math.sin(i * 3.1 + j * 1.7)
            verts.append((x, y, z))
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            faces.append((a, a + 1, a + n + 2, a + n + 1))
    p.append(malha('terra', verts, faces, 'terra', liso=True))
    # Plaquinha de madeira espetada no canto.
    p.append(box((0.04, 0.03, 0.34), (meio - 0.16, -meio + 0.12, 0.42), 'tronco', bevel=0.0))
    p.append(box((0.2, 0.025, 0.13), (meio - 0.16, -meio + 0.11, 0.56), 'woodLight', bevel=0.01, segs=1))
    return p


def semente():
    p = [sphere(0.11, (0, 0, -0.02), 'terraGrao', subdiv=1, scale=(1, 1, 0.45))]
    for k, (x, y) in enumerate(((0.03, 0.01), (-0.03, 0.03), (0.0, -0.035))):
        o = uvball(0.022, (x, y, 0.03), 'semente', seg=6, ring=4, scale=(1, 0.7, 0.6))
        o.rotation_euler = (0, 0, k)
        p.append(o)
    return p


def broto(folha):
    p = [tube([(0, 0, -0.02), (0.01, 0, 0.07), (0, 0.005, 0.12)], [0.014, 0.012, 0.01], 'caule', seg=5, cap=False)]
    for s in (0, math.pi):
        p.append(leaf((0, 0, 0.11), s + 0.3, 0.09, 0.045, folha, lift=0.03, droop=0.01, fold=0.25, n=5))
    return p


def alface_crescendo():
    p = []
    for k in range(5):
        a = 2 * math.pi * k / 5
        p.append(leaf((0, 0, 0.01), a, 0.17, 0.09, 'folhaAlface' if k % 2 else 'folhaAlfaceEscura', lift=0.12,
                      droop=0.05, fold=0.25, n=6))
    return p


def alface_madura():
    p = []
    # Folhas de fora largas e onduladas, de dentro mais fechadas, e o miolo.
    for k in range(8):
        a = 2 * math.pi * k / 8
        p.append(leaf((0, 0, 0.02), a, 0.33, 0.19, 'folhaAlfaceEscura', lift=0.2, droop=0.12, fold=0.2, teeth=4, n=7))
    for k in range(6):
        a = 2 * math.pi * (k + 0.5) / 6
        p.append(leaf((0, 0, 0.05), a, 0.22, 0.15, 'folhaAlface', lift=0.25, droop=0.02, fold=0.35, n=6))
    p.append(uvball(0.14, (0, 0, 0.15), 'folhaAlface', seg=10, ring=7, scale=(1, 1, 0.85)))
    return p


def estaca(altura_):
    return box((0.025, 0.025, altura_), (0.07, 0.07, altura_ / 2 - 0.02), 'estaca', bevel=0.0)


def tomate_crescendo():
    p = [tube([(0, 0, -0.02), (0.01, 0, 0.15), (-0.01, 0.01, 0.32)], [0.018, 0.015, 0.01], 'caule', seg=5)]
    for k, z in enumerate((0.1, 0.19, 0.27)):
        a = k * 2.3
        p.append(leaf((0, 0, z), a, 0.13, 0.06, 'folhaTomate', lift=0.05, droop=0.05, fold=0.3, teeth=3, n=5))
        p.append(leaf((0, 0, z + 0.02), a + math.pi, 0.11, 0.05, 'folhaTomate', lift=0.05, droop=0.05, fold=0.3, n=5))
    p.append(estaca(0.4))
    return p


def tomate_maduro():
    p = [tube([(0, 0, -0.02), (0.02, 0, 0.25), (-0.01, 0.02, 0.5), (0.01, 0, 0.66)], [0.024, 0.02, 0.016, 0.01],
              'caule', seg=6)]
    for k, z in enumerate((0.12, 0.24, 0.36, 0.48, 0.6)):
        a = k * 2.2
        p.append(leaf((0, 0, z), a, 0.17, 0.075, 'folhaTomate', lift=0.06, droop=0.07, fold=0.3, teeth=3, n=5))
        p.append(leaf((0, 0, z + 0.02), a + math.pi * 0.9, 0.14, 0.065, 'folhaTomate', lift=0.05, droop=0.06,
                      fold=0.3, n=5))
    for k, (a, z) in enumerate(((0.4, 0.3), (2.6, 0.42), (4.4, 0.24), (1.6, 0.54))):
        c = (math.cos(a) * 0.1, math.sin(a) * 0.1, z)
        p.append(uvball(0.065, c, 'tomate' if k != 3 else 'tomateVerde', seg=10, ring=7, scale=(1, 1, 0.88)))
        p.append(cone(0.035, 0.03, (c[0], c[1], c[2] + 0.06), 'folhaTomate', verts=5))
    p.append(estaca(0.72))
    p.append(torus(0.04, 0.008, (0.05, 0.05, 0.4), 'corda', seg=10, rseg=4))
    return p


def folha_de_milho(z, a, comp, m, larg=0.05):
    return leaf((0, 0, z), a, comp, larg, m, lift=0.22, droop=0.32, fold=0.18, n=7)


def milho_crescendo():
    p = [tube([(0, 0, -0.02), (0, 0, 0.3)], [0.022, 0.015], 'folhaMilho', seg=5)]
    for k, z in enumerate((0.05, 0.12, 0.2, 0.26)):
        p.append(folha_de_milho(z, k * 2.4, 0.26 - k * 0.03, 'folhaMilho' if k % 2 else 'caule'))
    return p


def espiga(base, a):
    bx, by, bz = base
    dx, dy = math.cos(a), math.sin(a)
    eixo = Vector((dx * 0.35, dy * 0.35, 1)).normalized()
    c = Vector(base) + eixo * 0.1
    o = superellipsoid((0.07, 0.07, 0.2), tuple(c), 'milho', e1=0.6, e2=1.0, seg=8, ring=6)
    o.rotation_euler = eixo.to_track_quat('Z', 'Y').to_euler()
    p = [o]
    # Palha abrindo em volta da espiga.
    for k in range(3):
        ak = a + (k - 1) * 0.9
        p.append(leaf((bx, by, bz), ak, 0.16, 0.04, 'palha', lift=0.16, droop=0.03, fold=0.4, n=4,
                      pitch=0.6))
    p.append(cone(0.03, 0.07, tuple(Vector(base) + eixo * 0.23), 'cabelo', verts=5))
    return p


def milho_maduro():
    p = [tube([(0, 0, -0.02), (0.01, 0, 0.5), (0, 0.01, 0.95)], [0.03, 0.022, 0.012], 'folhaMilho', seg=6)]
    for k, z in enumerate((0.08, 0.2, 0.33, 0.47, 0.6, 0.72)):
        p.append(folha_de_milho(z, k * 2.3, 0.36 - k * 0.025, 'folhaMilho' if k % 2 else 'caule', larg=0.06))
    p += espiga((0.02, 0.0, 0.42), 0.3)
    p += espiga((-0.02, 0.01, 0.55), 3.4)
    # Pendão no topo.
    for k in range(5):
        a = 2 * math.pi * k / 5
        p.append(tube([(0, 0.01, 0.93), (math.cos(a) * 0.07, math.sin(a) * 0.07 + 0.01, 1.03)], [0.008, 0.004],
                      'cabelo', seg=4))
    return p


def main():
    lib_q.reset()
    exportar('horta', {
        'canteiro': canteiro(),
        'semente': semente(),
        'alface-broto': broto('folhaAlface'),
        'alface-crescendo': alface_crescendo(),
        'alface-maduro': alface_madura(),
        'tomate-broto': broto('folhaTomate'),
        'tomate-crescendo': tomate_crescendo(),
        'tomate-maduro': tomate_maduro(),
        'milho-broto': broto('folhaMilho'),
        'milho-crescendo': milho_crescendo(),
        'milho-maduro': milho_maduro(),
    })


if __name__ == '__main__':
    main()
