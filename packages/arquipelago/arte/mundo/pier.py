"""O píer da praia, com um barquinho amarrado e um lampião na ponta.

Referencial: o grupo `Pier` do jogo (x = -5, z = 27 no mundo; y = 0 no nível do mar). As tábuas
seguem +z de 0 a 10 com o tampo em y ~0,61, em cima do colisor de antes (caixa de 2 de largura).

Nós: `pier` e `barquinho-decorativo` (o barquinho a remo e a corda até ele, à parte para o jogo
poder trocá-lo pelo barco da viagem). O vidro do lampião usa o material `lanterna` (o jogo acende à
noite).

Âncoras (fase3-04, o barco entre as ilhas):
- `barco`: onde o barco da viagem (`ilhas/barco.glb`) atraca, na linha d'água (y = 0), ao lado do
  píer; o giro em y aponta a proa do barco (o +x dele) para o mar (+z do píer);
- `embarque`: no tampo (y 0,61), na frente do meio do barco, longe da luneta (z 8,8), das estacas e
  do lampião; vale também para desembarcar.

Colisão: o tampo é a caixa do código. As estacas, o poste e a lanterna do lampião e o barquinho
trazem os nós `col-cil-estaca-*`, `col-cil-poste-*` e `col-barco-*` (sem material), que o jogo lê
do arquivo. O `col-barco-1` é o casco do barquinho decorativo: quem troca o barquinho tira ele
também. A corda e a boia não colidem.
"""
from lib_mundo import *

COMP = 10.0
YT = 0.55       # meio das tábuas
TAMPO = YT + 0.06
# O barco da viagem: 5 × 2 m, pneus até 1,26 do meio. Ao lado das estacas (1,08 + 0,13), com folga.
BARCO = dict(x=2.6, z=6.6)
EMBARQUE = dict(x=0.45, z=6.6)


def G(x, y, z):
    return (x, -z, y)


def caixa(sx, sy, sz, x, y, z, m, bevel=0.02, rot=(0, 0, 0)):
    return box((sx, sz, sy), G(x, y, z), m, bevel=bevel, segs=1, rot=rot)


def pier(col, barquinho_):
    p = []
    rnd = random.Random(5)
    n = int(COMP / 0.5)
    for i in range(n):
        z = i * 0.5
        o = caixa(2.0 + rnd.uniform(-0.04, 0.06), 0.12, 0.44, rnd.uniform(-0.03, 0.03), YT, z,
                  'tabua' if i % 2 else 'tabuaEscura', bevel=0.03, rot=(0, 0, rnd.uniform(-0.015, 0.015)))
        p.append(o)
    # Vigas embaixo das tábuas e travessas.
    for x in (-0.7, 0.7):
        p.append(caixa(0.16, 0.18, COMP + 0.2, x, YT - 0.15, COMP / 2 - 0.25, 'poste', bevel=0.02))
    # Estacas (4 pares), com a ponta para cima virando frade de amarrar.
    for k in range(4):
        z = k * (COMP - 0.5) / 3
        for x in (-1.08, 1.08):
            p.append(cyl(0.13, 2.9, G(x, -0.85, z), 'poste', verts=10))
            # Do fundo até a cabeça do frade (0,7).
            col.append(col_cilindro('estaca', 0.13, 3.0, G(x, -0.8, z)))
            p.append(cyl(0.15, 0.08, G(x, 0.62, z), 'tabuaEscura', verts=10))
            p.append(sphere(0.13, G(x, 0.62, z), 'poste', subdiv=1, scale=(1, 1, 0.6)))
            # Musgo na linha d'água.
            p.append(cyl(0.142, 0.18, G(x, 0.0, z), 'musgo', verts=10))
        p.append(caixa(2.2, 0.12, 0.12, 0, -0.35, z, 'poste', bevel=0.02))
    # Corda enrolada no último frade e esticada até o barquinho.
    zc = COMP - 0.5
    p.append(torus(0.14, 0.035, G(1.08, 0.5, zc), 'corda', seg=14, rseg=5))
    p.append(torus(0.12, 0.035, G(1.08, 0.42, zc), 'corda', seg=14, rseg=5))
    barquinho_.append(tube([G(1.2, 0.45, zc), G(1.6, 0.25, zc - 0.4), G(2.0, 0.42, zc - 0.9)], [0.03, 0.03, 0.03],
                           'corda', seg=5))
    # Lampião na ponta.
    lx, lz = -1.08, COMP - 0.5
    p.append(cyl(0.06, 1.8, G(lx, 1.5, lz), 'poste', verts=8))
    p.append(caixa(0.5, 0.06, 0.06, lx + 0.22, 2.35, lz, 'poste', bevel=0.01))
    p.append(cyl(0.12, 0.3, G(lx + 0.42, 2.08, lz), 'lanterna', verts=8))
    p.append(cone(0.18, 0.16, G(lx + 0.42, 2.3, lz), 'metalEscuro', verts=8))
    p.append(cyl(0.14, 0.05, G(lx + 0.42, 1.91, lz), 'metalEscuro', verts=8))
    p.append(cyl(0.01, 0.12, G(lx + 0.42, 2.27, lz), 'metalEscuro', verts=4))
    col.append(col_cilindro('poste-lampiao', 0.09, 1.85, G(lx, 1.5, lz)))
    # A lanterna fica na altura da cabeça de quem anda no píer.
    col.append(col_cilindro('poste-lanterna', 0.17, 0.5, G(lx + 0.42, 2.1, lz)))
    # Barquinho a remo boiando ao lado (casco amarelo, banco e remos).
    barquinho_ += barquinho((2.25, 0.2, COMP - 1.6))
    # O casco (1 × 2,2, da quilha à borda): quem nada bate nele e quem pula do píer fica de pé.
    col.append(col_caixa('barco', (0.86, 2.0, 0.5), G(2.25, 0.12, COMP - 1.6)))
    # Boia salva-vidas pendurada numa estaca.
    p.append(torus(0.28, 0.08, G(-1.2, 0.35, 3.17), 'red', seg=16, rseg=6, rot=(0, R(90), 0)))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        p.append(box((0.03, 0.06, 0.17), (G(-1.2, 0.35, 3.17)[0] - 0.04, G(-1.2, 0.35, 3.17)[1] + math.cos(a) * 0.28,
                                         0.35 + math.sin(a) * 0.28), 'white', bevel=0.0, rot=(-a, 0, 0)))
    return p


def barquinho(c):
    p = []
    cx, cy, cz = G(*c)
    # Casco: superelipsoide cortada em cima, com a borda de madeira.
    casco = superellipsoid((1.0, 2.2, 0.8), (cx, cy, cz + 0.05), 'yellow', e1=0.6, e2=0.75, seg=16, ring=10)
    for v in casco.data.vertices:
        alto = v.co.z > 0.12
        if alto:
            # O que passaria da borda vira o fundo de dentro: afunda e encolhe (casco oco).
            v.co.x *= 0.82
            v.co.y *= 0.9
            v.co.z = -0.08
        # Proa afinada (frente em -y do Blender).
        if v.co.y < -0.4:
            v.co.x *= 1 - 0.45 * (-v.co.y - 0.4) / 0.7
    casco.data.materials.append(lib_q.mat('woodDark'))
    for f in casco.data.polygons:
        if all(casco.data.vertices[i].co.z < -0.07 for i in f.vertices):
            f.material_index = 1
    p.append(casco)
    p.append(torus(1.0, 0.05, (cx, cy, cz + 0.19), 'woodDark', seg=24, rseg=5))
    p[-1].scale = (0.46, 1.02, 1)
    p.append(box((0.84, 0.22, 0.06), (cx, cy + 0.15, cz + 0.12), 'wood', bevel=0.02, segs=1))
    p.append(box((0.84, 0.18, 0.06), (cx, cy - 0.45, cz + 0.12), 'wood', bevel=0.02, segs=1))
    for s in (-1, 1):
        p.append(tube([(cx + s * 0.3, cy + 0.3, cz + 0.22), (cx + s * 0.75, cy - 0.5, cz - 0.02)], [0.025, 0.025],
                      'wood', seg=5))
        p.append(box((0.04, 0.3, 0.12), (cx + s * 0.78, cy - 0.6, cz - 0.04), 'wood', bevel=0.01, segs=1,
                     rot=(0, 0, s * 0.5)))
    return p


def ancoras():
    """`barco` (proa do barco da viagem para o mar) e `embarque` (no tampo)."""
    barco = bpy.data.objects.new('barco', None)
    barco.location = G(BARCO['x'], 0.0, BARCO['z'])
    # O +x do barco vira o +z do píer (o −y do Blender).
    barco.rotation_euler = (0, 0, R(-90))
    embarque = bpy.data.objects.new('embarque', None)
    embarque.location = G(EMBARQUE['x'], TAMPO, EMBARQUE['z'])
    for e in (barco, embarque):
        e.empty_display_type = 'PLAIN_AXES'
        bpy.context.collection.objects.link(e)
    return [barco, embarque]


def main():
    lib_q.reset()
    col = []
    barquinho_ = []
    exportar('pier', {'pier': pier(col, barquinho_), 'barquinho-decorativo': barquinho_}, colisores=col,
             ancoras=ancoras())


if __name__ == '__main__':
    main()
