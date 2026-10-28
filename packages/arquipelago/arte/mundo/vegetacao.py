"""As árvores da ilha central: quatro variedades, cada uma um nó no próprio referencial.

Escala 1 = a árvore do jogo antes (tronco de ~1,8 e copa em volta de y 2,5, raio ~1,3). O jogo
põe cada uma nas posições de `ARVORES` com a mesma escala e o mesmo colisor (cilindro de raio
0,3 e altura 1,8 no pé do tronco), então o tronco fica sempre dentro desse raio.

Nós: `arvore-redonda`, `arvore-frutas`, `arvore-pinheiro`, `coqueiro`. Base em y = 0.
"""
from lib_mundo import *


def bolota(centro, raios, m, seed=0, seg=12, ring=8, amassado=0.08):
    """Bolota de copa: elipsoide macia com calombos suaves (sem facetas duras)."""
    o = superellipsoid((2 * raios[0], 2 * raios[1], 2 * raios[2]), (0, 0, 0), m, e1=0.85, e2=0.95,
                       seg=seg, ring=ring)
    rnd = random.Random(seed)
    calombos = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.3, 1))).normalized(),
                 rnd.uniform(-amassado, amassado * 1.4)) for _ in range(6)]
    for v in o.data.vertices:
        d = Vector((v.co.x / raios[0], v.co.y / raios[1], v.co.z / raios[2]))
        if d.length == 0:
            continue
        dn = d.normalized()
        k = 1 + sum(a * max(0.0, dn.dot(c)) ** 2 for c, a in calombos)
        # Embaixo a copa fica mais reta (sombra e sem "barriga").
        if dn.z < -0.55:
            k *= 0.92
        v.co *= k
    o.location = centro
    return o


def tronco(altura_, r0, r1, m='tronco', curva=(0.0, 0.0), seg=8):
    pts, raios = [], []
    n = 6
    for i in range(n + 1):
        t = i / n
        pts.append((curva[0] * t * t, curva[1] * t * t, altura_ * t))
        raios.append(r0 + (r1 - r0) * t ** 0.8)
    p = [tube(pts, raios, m, seg=seg)]
    # Raízes: três calombos no pé (o tronco "segura" o chão).
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.4
        p.append(tube([(math.cos(a) * r0 * 0.4, math.sin(a) * r0 * 0.4, 0.22),
                       (math.cos(a) * r0 * 1.35, math.sin(a) * r0 * 1.35, -0.02)], [r0 * 0.45, r0 * 0.22], m, seg=5))
    return p


def galho(base, ponta, r, m='tronco'):
    return tube([base, ponta], [r, r * 0.6], m, seg=6)


def arvore_redonda():
    p = tronco(2.1, 0.24, 0.14, curva=(0.08, 0.0))
    p.append(galho((0.05, 0, 1.4), (0.55, -0.15, 2.0), 0.08))
    p.append(galho((0.02, 0, 1.6), (-0.5, 0.2, 2.15), 0.07))
    p.append(bolota((0.05, 0, 2.55), (1.15, 1.1, 0.95), 'copa', seed=1))
    p.append(bolota((0.62, -0.25, 2.15), (0.75, 0.72, 0.62), 'copaEscura', seed=2))
    p.append(bolota((-0.58, 0.3, 2.25), (0.72, 0.7, 0.6), 'copaEscura', seed=3))
    p.append(bolota((-0.15, -0.5, 3.05), (0.7, 0.66, 0.58), 'copaClara', seed=4))
    p.append(bolota((0.3, 0.55, 2.95), (0.62, 0.6, 0.52), 'copa', seed=5))
    return p


def arvore_frutas():
    p = tronco(1.9, 0.24, 0.15, curva=(-0.06, 0.05))
    p.append(galho((0, 0, 1.3), (0.6, 0.1, 1.85), 0.08))
    p.append(bolota((0, 0, 2.45), (1.25, 1.2, 1.0), 'copaEscura', seed=11))
    p.append(bolota((0.55, -0.45, 2.75), (0.7, 0.68, 0.6), 'copa', seed=12))
    p.append(bolota((-0.6, -0.2, 2.6), (0.68, 0.66, 0.58), 'copa', seed=13))
    p.append(bolota((0.05, 0.5, 3.15), (0.66, 0.62, 0.55), 'copaClara', seed=14))
    # Frutinhas vermelhas pousadas na superfície da copa.
    rnd = random.Random(3)
    for k in range(9):
        a = 2 * math.pi * k / 9 + rnd.uniform(-0.25, 0.25)
        el = rnd.uniform(-0.35, 0.55)
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        c = Vector((0, 0, 2.45)) + Vector((d.x * 1.3, d.y * 1.25, d.z * 1.05))
        p.append(uvball(0.12, tuple(c), 'fruta', seg=8, ring=6))
        p.append(cyl(0.012, 0.08, tuple(c + Vector((0, 0, 0.13))), 'tronco', verts=4))
    return p


def camada_de_pinheiro(z, r, h, m, seed, pontas=9):
    """Uma "saia" do pinheiro: cone com a borda em pontas caídas."""
    rnd = random.Random(seed)
    verts = [(0, 0, z + h)]
    n = pontas * 2
    for i in range(n):
        a = 2 * math.pi * i / n + seed
        rr = r if i % 2 == 0 else r * 0.78
        dz = -0.12 if i % 2 == 0 else 0.05
        verts.append((math.cos(a) * rr, math.sin(a) * rr, z + dz + rnd.uniform(-0.03, 0.03)))
    verts.append((0, 0, z + 0.12))
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    faces += [(n + 1, 1 + (i + 1) % n, 1 + i) for i in range(n)]
    o = malha('pinheiro', verts, faces, m, cima=False)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    return o


def arvore_pinheiro():
    p = tronco(1.2, 0.24, 0.16)
    p.append(cyl(0.16, 1.6, (0, 0, 1.6), 'tronco', verts=8))
    for i, (z, r, h, m) in enumerate([(1.0, 1.45, 1.5, 'copaFunda'), (1.85, 1.15, 1.35, 'copaEscura'),
                                      (2.65, 0.85, 1.2, 'copaFunda'), (3.35, 0.55, 1.0, 'copaEscura')]):
        p.append(camada_de_pinheiro(z, r, h, m, seed=i * 0.7))
    return p


def coqueiro():
    # Tronco curvo em gomos (anéis alternando a grossura), inclinado para o mar.
    pts, raios = [], []
    n = 14
    for i in range(n + 1):
        t = i / n
        pts.append((0.55 * t * t, 0.1 * t, 3.4 * t))
        raios.append((0.2 - 0.07 * t) * (1.0 if i % 2 == 0 else 0.88))
    p = [tube(pts, raios, 'troncoClaro', seg=8)]
    topo = Vector(pts[-1])
    for k in range(8):
        a = 2 * math.pi * k / 8 + 0.2
        p.append(leaf(tuple(topo + Vector((0, 0, 0.05))), a, 1.9 if k % 2 else 1.6, 0.36,
                      'copa' if k % 2 else 'copaEscura', lift=0.45, droop=1.25, fold=0.3, teeth=7, n=10))
    for k in range(3):
        a = 2 * math.pi * k / 3
        p.append(uvball(0.16, tuple(topo + Vector((math.cos(a) * 0.17, math.sin(a) * 0.17, -0.12))), 'tronco',
                        seg=8, ring=6))
    p += tronco(0.3, 0.24, 0.2, m='troncoClaro')[1:]
    return p


def main():
    lib_q.reset()
    exportar('arvores', {
        'arvore-redonda': arvore_redonda(),
        'arvore-frutas': arvore_frutas(),
        'arvore-pinheiro': arvore_pinheiro(),
        'coqueiro': coqueiro(),
    })


if __name__ == '__main__':
    main()
