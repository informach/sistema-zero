"""O museu dos fósseis em casa (Vale dos Dinos, "montar o museu dos fósseis").

Peças soltas num arquivo só, arrumadas como uma salinha num footprint de 3 × 2. Cada nó tem o pivô
no meio da sua própria base (z = 0), então o jogo pode copiar uma peça e pôr onde quiser:
- `redoma`: coluna com almofada e um ovo de dinossauro fossilizado debaixo de uma redoma de vidro;
- `vitrine`: vitrine baixa de madeira e vidro com uma amonite e três dentes no veludo;
- `cranio`: crânio de tiranossauro numa base de pedra, preso numa haste;
- `pegada`: pegada de três dedos numa placa de pedra, num pedestal baixo;
- `placa` e `texto`: a plaquinha de legenda num pedestal fino; `texto` é a face lisa (material
  `placaFace`) onde o jogo escreve, e os dois nós têm o mesmo pivô.
"""
from lib_objetos import *

LUGARES = {
    'redoma': (-1.0, 0.4, 0),
    'cranio': (0.0, 0.45, 0),
    'vitrine': (1.0, 0.4, 0),
    'pegada': (-0.4, -0.5, R(12)),
    'placa': (0.6, -0.55, R(-10)),
}


def redoma():
    p = []
    col = torneado([(0, 0), (0.2, 0), (0.2, 0.05), (0.17, 0.07), (0.16, 0.1), (0.13, 0.13), (0.12, 0.75),
                    (0.15, 0.78), (0.16, 0.81), (0.2, 0.83), (0.2, 0.88), (0, 0.88)], 'pedestal', seg=24)
    p.append(col)
    p.append(lib_q.torus(0.124, 0.012, (0, 0, 0.45), 'pedestalEscuro', seg=24, rseg=4))
    zt = 0.88
    p.append(lib_q.cushion((0.22, 0.22, 0.05), (0, 0, zt + 0.022 + 0.025), 'veludoVermelho', puff=0.3))
    # Ovo fossilizado com rachaduras.
    ovo = esfera(0.075, (0, 0, zt + 0.14), 'rocha', escala=(0.85, 0.85, 1.12), seg=14, aneis=10)
    p.append(ovo)
    for (a, z, ang) in ((0.3, 0.14, 25), (2.2, 0.17, -35), (4.1, 0.12, 10)):
        d = Vector((math.cos(a), math.sin(a), 0))
        c = Vector((0, 0, zt + z)) + d * 0.064
        rach = box((0.004, 0.006, 0.04), tuple(c), 'rochaEscura', bevel=0.0)
        rach.rotation_euler = (0, R(ang), a)
        p.append(rach)
    # Redoma: base dourada, vidro e o puxador em cima.
    zb = zt
    p.append(cyl(0.19, 0.022, (0, 0, zb + 0.011), 'moldura', verts=24))
    vidro = torneado([(0.16, 0), (0.16, 0.2), (0.152, 0.25), (0.13, 0.29), (0.09, 0.32), (0.045, 0.335), (0, 0.338)],
                     'vidro', seg=24)
    vidro.location = (0, 0, zb + 0.022)
    p.append(vidro)
    p.append(lib_q.sphere(0.022, (0, 0, zb + 0.022 + 0.35), 'moldura', subdiv=2))
    return p


def amonite(m, m2, escala=1.0):
    """Concha em espiral de pé (a espiral de frente para -Y), com os gominhos claros."""
    pts, raios = [], []
    n = 30
    for k in range(n):
        t = k / (n - 1)
        th = t * 3.2 * math.pi
        r = 0.01 * math.exp(0.22 * th) * escala
        pts.append((r * math.cos(th), 0, r * math.sin(th)))
        raios.append(max(0.004, r * 0.5))
    tubo = tube(pts, raios, m, seg=10)
    tubo.scale = (1, 0.7, 1)
    p = [tubo]
    for k in range(4, n - 1, 2):
        a, b = Vector(pts[k]), Vector(pts[k + 1])
        anel = lib_q.torus(raios[k] * 1.0, raios[k] * 0.2, tuple(a), m2, seg=10, rseg=3)
        anel.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
        anel.scale = (1, 0.7, 1) if abs((b - a).normalized().y) < 0.5 else (1, 1, 1)
        p.append(anel)
    # A concha fica num suporte de madeira, com a base da espiral em z = 0.
    bpy.context.view_layer.update()
    zmin = min((o.matrix_world @ v.co).z for o in p for v in o.data.vertices)
    lib_ilha.place(p, loc=(0, 0, -zmin + 0.035))
    p.append(caixa_redonda((0.1, 0.07, 0.025), (0, 0, 0.0125), 'madeiraEscura', raio=0.008, segs=1))
    p.append(prism([(-0.03, 0.025), (0.03, 0.025), (0.018, 0.045), (-0.018, 0.045)], 0.02, (0, 0, 0),
                   'madeiraEscura'))
    return p


def dente(comp, r, m='dente'):
    pts = [(0, 0, 0), (comp * 0.4, 0, r * 0.2), (comp * 0.75, 0, r * 0.7), (comp, 0, r * 1.4)]
    o = tube(pts, [r, r * 0.8, r * 0.45, 0.002], m, seg=8)
    return o


def vitrine():
    p = []
    L, F, A = 0.86, 0.48, 0.58
    # Móvel de madeira com pés torneados.
    p.append(caixa_redonda((L, F, 0.16), (0, 0, A - 0.08), 'madeira', raio=0.02, segs=2))
    for sx in (-1, 1):
        for sy in (-1, 1):
            pe = torneado([(0, 0), (0.03, 0), (0.035, 0.03), (0.022, 0.08), (0.028, 0.25), (0.022, A - 0.15),
                           (0.03, A - 0.15), (0, A - 0.15)], 'madeiraEscura', seg=10)
            pe.location = (sx * (L / 2 - 0.06), sy * (F / 2 - 0.06), 0)
            p.append(pe)
    p.append(box((L - 0.14, F - 0.14, 0.02), (0, 0, 0.12), 'madeiraEscura', bevel=0.006, segs=1))
    # Veludo e o vidro, com o caixilho de madeira nas quinas.
    zt = A
    p.append(caixa_redonda((L - 0.06, F - 0.06, 0.03), (0, 0, zt + 0.015), 'veludo', raio=0.01, segs=2))
    hv = 0.2
    p.append(box((L - 0.03, F - 0.03, hv), (0, 0, zt + hv / 2 + 0.006), 'vidro', bevel=0.004, segs=1))
    xe, ye = L / 2 - 0.012, F / 2 - 0.012
    z0, z1 = zt, zt + hv + 0.014
    for x in (-xe, xe):
        for y in (-ye, ye):
            p.append(barra((x, y, z0), (x, y, z1), 'madeiraEscura', r=0.014, verts=6))
    for z in (z1,):
        for y in (-ye, ye):
            p.append(barra((-xe, y, z), (xe, y, z), 'madeiraEscura', r=0.014, verts=6))
        for x in (-xe, xe):
            p.append(barra((x, -ye, z), (x, ye, z), 'madeiraEscura', r=0.014, verts=6))
    # Amonite à esquerda e três dentes à direita.
    zv = zt + 0.03
    am = amonite('amonite', 'amoniteClaro', escala=1.25)
    mover(am, (-0.2, 0.02, zv + 0.002))
    p += am
    for k, (x, y, ang, c) in enumerate(((0.04, 0.05, 20, 0.15), (0.18, -0.06, -15, 0.12), (0.3, 0.07, 40, 0.1))):
        d = dente(c, 0.03)
        d.rotation_euler = (R(90), 0, R(ang))
        d.location = (x, y, zv + 0.018)
        p.append(d)
    return p


def cranio():
    p = []
    # Base de pedra com a haste.
    p.append(caixa_redonda((0.46, 0.34, 0.26), (0, 0, 0.13), 'rocha', raio=0.04, segs=3))
    p.append(caixa_redonda((0.4, 0.28, 0.04), (0, 0, 0.28), 'rochaEscura', raio=0.012, segs=2))
    p.append(cyl(0.02, 0.36, (0, 0.0, 0.3 + 0.18), 'metalEscuro', verts=10))
    p.append(cyl(0.05, 0.02, (0, 0.0, 0.31), 'metalEscuro', verts=14))
    # Crânio de tiranossauro feito com o focinho para +X e a boca entreaberta.
    c = []
    c.append(lib_ilha.superellipsoid((0.36, 0.3, 0.3), (-0.08, 0, 0.03), 'osso', e1=0.6, e2=0.7, seg=16, ring=10))
    foc = lib_ilha.superellipsoid((0.42, 0.22, 0.2), (0.2, 0, -0.01), 'osso', e1=0.55, e2=0.65, seg=14, ring=8)
    deformar(foc, lambda v: Vector((v.x, v.y * (1 - 0.35 * (v.x + 0.21) / 0.42),
                                    v.z * (1 - 0.3 * (v.x + 0.21) / 0.42) - 0.03 * (v.x + 0.21) / 0.42)))
    c.append(foc)
    mand = lib_ilha.superellipsoid((0.5, 0.22, 0.08), (0.1, 0, -0.13), 'ossoSombra', e1=0.55, e2=0.6, seg=14,
                                   ring=6)
    deformar(mand, lambda v: Vector((v.x, v.y * (1 - 0.3 * (v.x + 0.25) / 0.5), v.z)))
    mand_dentes = []
    for s in (-1, 1):
        # Olhos (buracos escuros no alto), as janelas do crânio atrás deles e as narinas.
        c.append(esfera(0.055, (-0.03, s * 0.125, 0.07), 'fuligem', escala=(1, 0.5, 0.9), seg=12, aneis=8))
        c.append(esfera(0.042, (-0.17, s * 0.13, -0.01), 'fuligem', escala=(0.8, 0.45, 1.2), seg=12, aneis=7))
        c.append(esfera(0.06, (0.08, s * 0.095, -0.04), 'fuligem', escala=(1.4, 0.45, 0.55), seg=12, aneis=7))
        c.append(esfera(0.022, (0.36, s * 0.045, 0.02), 'fuligem', escala=(1.2, 0.6, 0.6), seg=8, aneis=5))
        c.append(esfera(0.045, (-0.01, s * 0.1, 0.15), 'osso', escala=(1.4, 0.8, 0.55), seg=10, aneis=6))
        for k in range(7):
            x = 0.36 - k * 0.048
            y = s * (0.06 + k * 0.009)
            c.append(cone(0.016 - k * 0.0007, 0.06, (x, y, -0.115), 'dente', verts=6, rot=(R(180), 0, 0)))
            if k < 6:
                mand_dentes.append(cone(0.013, 0.045, (x - 0.02, y * 0.95, -0.09), 'dente', verts=6))
    c.append(lib_ilha.superellipsoid((0.22, 0.14, 0.1), (-0.2, 0, 0.12), 'ossoSombra', e1=0.6, e2=0.7, seg=10, ring=6))
    # A mandíbula abre um pouco na dobradiça de trás.
    bpy.context.view_layer.update()
    J = Matrix.Translation((-0.14, 0, -0.12)) @ Matrix.Rotation(R(12), 4, 'Y') @ Matrix.Translation((0.14, 0, 0.12))
    for o in [mand] + mand_dentes:
        o.matrix_world = J @ o.matrix_world
    c += [mand] + mand_dentes
    bpy.context.view_layer.update()
    M = (Matrix.Translation((0.0, 0.0, 0.8)) @ Matrix.Rotation(R(-125), 4, 'Z') @ Matrix.Scale(1.15, 4) @
         Matrix.Rotation(R(-5), 4, 'Y'))
    for o in c:
        o.matrix_world = M @ o.matrix_world
    return p + c


def pegada():
    p = []
    # Pedestal baixo.
    p.append(caixa_redonda((0.56, 0.36, 0.2), (0, 0.04, 0.12), 'pedestal', raio=0.025, segs=2))
    p.append(caixa_redonda((0.6, 0.4, 0.03), (0, 0.04, 0.015), 'pedestalEscuro', raio=0.012, segs=2))
    # Placa de pedra feita deitada (pegada para cima), depois inclinada para a frente.
    w, h, e = 0.46, 0.56, 0.07
    laje = caixa_redonda((w, h, e), (0, h / 2, e / 2), 'rocha', raio=0.025, segs=2)
    cortes = []
    cortes.append(esfera(0.09, (0, 0.17, e), 'rocha', escala=(0.95, 1.0, 0.45), seg=16, aneis=8))
    for ang in (-30, 0, 30):
        a = R(90 + ang)
        d = Vector((math.cos(a), math.sin(a), 0))
        c = Vector((0, 0.22, e)) + d * 0.14
        dedo = esfera(0.075, tuple(c), 'rocha', escala=(0.52, 1.0, 0.42), seg=12, aneis=6)
        dedo.rotation_euler = (0, 0, a - R(90))
        cortes.append(dedo)
        unha = Vector((0, 0.22, e)) + d * 0.225
        u = cone(0.02, 0.06, tuple(unha), 'rocha', verts=8)
        u.rotation_euler = (R(-90), 0, a - R(90))
        u.scale = (1, 0.6, 1)
        cortes.append(u)
    for ct in cortes:
        bpy.context.view_layer.update()
        booleana(laje, ct)
    topo = e - 0.004
    pintar_por(laje, lambda ct, n: 'rochaEscura' if ct.z < topo and n.z > -0.3 and abs(ct.x) < w / 2 - 0.03
               and 0.03 < ct.y < h - 0.03 and ct.z > 0.01 else None)
    pecas = [laje]
    # Pedrinhas e um risco de "rachadura" na pedra, para não ficar lisa demais.
    for (x, y) in ((-0.16, 0.06), (0.17, 0.48), (0.18, 0.1)):
        pecas.append(esfera(0.018, (x, y, e - 0.002), 'rochaEscura', escala=(1.2, 1, 0.4), seg=8, aneis=4))
    bpy.context.view_layer.update()
    M = Matrix.Translation((0, -0.12, 0.2)) @ Matrix.Rotation(R(55), 4, 'X')
    for o in pecas:
        o.matrix_world = M @ o.matrix_world
    # Calço atrás da placa.
    calco = prism([(-0.06, 0.02), (0.15, 0.0), (0.15, 0.4)], 0.3, (0, 0, 0), 'pedestalEscuro')
    calco.rotation_euler = (0, 0, R(90))
    calco.location = (0, 0, 0.2)
    p.append(calco)
    return p + pecas


def placa_e_texto():
    p = []
    p.append(cyl(0.14, 0.03, (0, 0, 0.015), 'pedestalEscuro', verts=20, bevel=0.008))
    p.append(cyl(0.028, 0.78, (0, 0, 0.03 + 0.39), 'moldura', verts=12))
    # Tampo inclinado de frente para quem lê.
    tampo = caixa_redonda((0.38, 0.28, 0.03), (0, 0, 0), 'placa', raio=0.012, segs=2)
    face = box((0.32, 0.22, 0.006), (0, 0, 0.015 + 0.003), 'placaFace', bevel=0.003, segs=1)
    bpy.context.view_layer.update()
    M = Matrix.Translation((0, 0.0, 0.84)) @ Matrix.Rotation(R(35), 4, 'X')
    for o in (tampo, face):
        o.matrix_world = M @ o.matrix_world
    p.append(tampo)
    p.append(cyl(0.04, 0.05, (0, 0, 0.8), 'moldura', verts=12))
    return p, [face]


def museu():
    nos = {}
    for nome, fn in (('redoma', redoma), ('vitrine', vitrine), ('cranio', cranio), ('pegada', pegada)):
        objs = fn()
        x, y, giro = LUGARES[nome]
        lib_ilha.place(objs, loc=(x, y, 0), rot_z=giro)
        nos[nome] = (objs, (x, y, 0))
    placa, texto = placa_e_texto()
    x, y, giro = LUGARES['placa']
    lib_ilha.place(placa + texto, loc=(x, y, 0), rot_z=giro)
    nos['placa'] = (placa, (x, y, 0))
    nos['texto'] = (texto, (x, y, 0))
    return {'nos': nos, 'grupo': 'museu'}


ITENS = [('museu', museu)]

if __name__ == '__main__':
    rodar(ITENS)
