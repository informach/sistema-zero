"""A casinha de bicho (Bosque dos Bichos, footprint 2 × 2, frente para -Y).

Nós:
- `casinha`: a casinha de madeira (tábuas, cantoneiras, porta em arco, janelinha redonda e o
  telhadinho vermelho), a almofada lá dentro, o tapetinho com os potinhos de água e de ração e um
  ossinho de brinquedo;
- `placa` e `texto`: a plaquinha do nome em cima da porta; `texto` é a face lisa (material
  `placaFace`) onde o jogo escreve o nome do bicho.

Cabe o cachorro adulto (0,71 de altura e 0,97 de comprimento): a porta tem 0,42 × 0,51 e o miolo
tem 0,92 × 1,02.
"""
from lib_objetos import *

CX, CY = -0.3, 0.3          # meio da casinha no footprint
L, F = 1.0, 1.1
Z0 = 0.06                    # chão da casinha (em cima do estrado)
H = 0.6                      # altura das paredes
ZT = Z0 + H
CUME = 1.12
EP = 0.04                    # espessura das paredes
PORTA_L, PORTA_RETO = 0.42, 0.3
Y_FRENTE = CY - F / 2
Y_JANELA, Z_JANELA = CY + 0.1, Z0 + 0.36


def meia_porta(z):
    """Meia largura da porta na altura z (0 fora dela)."""
    zz = z - Z0
    r = PORTA_L / 2
    if zz < 0:
        return 0
    if zz <= PORTA_RETO:
        return r
    d = zz - PORTA_RETO
    return math.sqrt(max(0.0, r * r - d * d))


def contorno_porta(n=12):
    r = PORTA_L / 2
    pts = [(-r, -0.1), (r, -0.1), (r, PORTA_RETO)]
    for k in range(1, n):
        a = math.pi * k / n
        pts.append((r * math.cos(a), PORTA_RETO + r * math.sin(a)))
    pts.append((-r, PORTA_RETO))
    return pts


def paredes():
    c = box((L, F, H), (CX, CY, Z0 + H / 2), 'casinha', bevel=0.01, segs=1)
    miolo = box((L - 2 * EP, F - 2 * EP, H), (CX, CY, Z0 + H / 2 + 0.02), 'casinha', bevel=0.0)
    booleana(c, miolo)
    booleana(c, prism(contorno_porta(), 0.3, (CX, Y_FRENTE, Z0), 'casinha'))
    xi, yi = L / 2 - EP + 0.002, F / 2 - EP + 0.002

    def por_dentro(ct, n):
        if not (abs(ct.x - CX) < xi and abs(ct.y - CY) < yi):
            return None
        if abs(n.z) < 0.5 and n.dot(Vector((ct.x - CX, ct.y - CY, 0))) < 0:
            return 'portaCasinha'
        if n.z > 0.5 and ct.z < Z0 + 0.03:
            return 'portaCasinha'
        return None
    pintar_por(c, por_dentro)
    p = [c]
    # Tábuas: frisos escuros na horizontal (na frente, contornando a porta).
    for z in (Z0 + 0.13, Z0 + 0.26, Z0 + 0.39, Z0 + 0.52):
        hp = meia_porta(z + 0.01)
        hp = max(hp, meia_porta(z - 0.01))
        y = Y_FRENTE - 0.004
        if hp > 0:
            for s in (-1, 1):
                x0, x1 = CX + s * (hp + 0.035), CX + s * (L / 2 - 0.04)
                p.append(box((abs(x1 - x0), 0.012, 0.014), ((x0 + x1) / 2, y, z), 'casinhaEscura', bevel=0.0))
        else:
            p.append(box((L - 0.08, 0.012, 0.014), (CX, y, z), 'casinhaEscura', bevel=0.0))
        for s in (-1, 1):
            if s > 0 and abs(z - Z_JANELA) < 0.13:
                # Do lado da janelinha o friso para antes dela e continua depois.
                for y0, y1 in ((CY - F / 2 + 0.04, Y_JANELA - 0.13), (Y_JANELA + 0.13, CY + F / 2 - 0.04)):
                    p.append(box((0.012, y1 - y0, 0.014), (CX + L / 2 + 0.004, (y0 + y1) / 2, z), 'casinhaEscura',
                                 bevel=0.0))
                continue
            p.append(box((0.012, F - 0.08, 0.014), (CX + s * (L / 2 + 0.004), CY, z), 'casinhaEscura', bevel=0.0))
        p.append(box((L - 0.08, 0.012, 0.014), (CX, CY + F / 2 + 0.004, z), 'casinhaEscura', bevel=0.0))
    # Cantoneiras e o arco da porta.
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(box((0.07, 0.07, H + 0.02), (CX + sx * (L / 2 - 0.025), CY + sy * (F / 2 - 0.025), Z0 + H / 2),
                         'casinhaEscura', bevel=0.012, segs=2))
    r = PORTA_L / 2 + 0.03
    n = 12
    pts = [(CX - r, Y_FRENTE - 0.012, Z0)]
    pts += [(CX - r, Y_FRENTE - 0.012, Z0 + PORTA_RETO)]
    for k in range(1, n):
        a = math.pi - math.pi * k / n
        pts.append((CX + r * math.cos(a), Y_FRENTE - 0.012, Z0 + PORTA_RETO + r * math.sin(a)))
    pts += [(CX + r, Y_FRENTE - 0.012, Z0 + PORTA_RETO), (CX + r, Y_FRENTE - 0.012, Z0)]
    p.append(tube(pts, [0.026] * len(pts), 'casinhaEscura', seg=6))
    # Janelinha de coração do lado direito, com moldura.
    xj = CX + L / 2
    for esc, m, x, e in ((1.3, 'casinhaEscura', xj + 0.003, 0.01), (1.0, 'portaCasinha', xj + 0.008, 0.01)):
        cor = prism(lib_q.heart_pts(0.085 * esc), e, (0, 0, 0), m)
        cor.rotation_euler = (0, 0, R(90))
        cor.location = (x, Y_JANELA, Z_JANELA - 0.01)
        p.append(fechar_emendas(cor))
    # Estrado embaixo.
    p.append(caixa_redonda((L + 0.1, F + 0.1, Z0), (CX, CY, Z0 / 2), 'casinhaEscura', raio=0.015, segs=2))
    return p


def telhado():
    p = []
    meia = L / 2
    ang = math.atan2(CUME - ZT, meia)
    larg = math.hypot(meia, CUME - ZT) + 0.14
    comp = F + 0.22
    e = 0.06
    for s in (-1, 1):
        lado = []
        lado.append(caixa_redonda((larg, comp, e), (0, 0, 0), 'telhado', raio=0.02, segs=2))
        # Fileiras de telhas (frisos mais escuros).
        for k in range(3):
            u = -larg / 2 + 0.16 + k * 0.22
            lado.append(caixa_redonda((0.05, comp + 0.01, 0.014), (u, 0, e / 2 + 0.002), 'telhadoEscuro', raio=0.006,
                                      segs=1))
        # O lado é feito deitado, com a borda de cima em +x, depois girado para o cume.
        bpy.context.view_layer.update()
        M = (Matrix.Translation((CX, CY, CUME)) @ Matrix.Rotation(s * ang, 4, 'Y') @
             Matrix.Translation((s * (larg / 2 - 0.035), 0, e / 2 - 0.02)))
        for o in lado:
            o.matrix_world = M @ o.matrix_world
        p += lado
    p.append(cyl(0.045, comp + 0.04, (CX, CY, CUME + 0.03), 'telhadoEscuro', verts=10, rot=(R(90), 0, 0)))
    # Oitões (os triângulos da frente e de trás).
    tri = [(-meia + 0.001, 0), (meia - 0.001, 0), (0, CUME - ZT)]
    # Afastados 6 mm para fora: assim não ficam no mesmo plano das paredes de dentro.
    for y in (Y_FRENTE + EP / 2 - 0.006, CY + F / 2 - EP / 2 + 0.006):
        o = prism(tri, EP, (CX, y, ZT), 'casinha')
        p.append(o)
    return p


def placa_e_texto():
    z = ZT + 0.14
    y = Y_FRENTE - 0.012
    placa = [caixa_redonda((0.38, 0.03, 0.13), (CX, y - 0.004, z), 'placa', raio=0.012, segs=2)]
    for s in (-1, 1):
        placa.append(cyl(0.01, 0.01, (CX + s * 0.165, y - 0.022, z), 'metalEscuro', verts=8, rot=(R(90), 0, 0)))
    texto = [box((0.3, 0.006, 0.09), (CX, y - 0.022, z), 'placaFace', bevel=0.003, segs=1)]
    return placa, texto


def miolo():
    p = []
    # Almofada redonda com a borda gordinha.
    cx, cy, z = CX, CY + 0.08, Z0 + 0.02
    p.append(cyl(0.36, 0.05, (cx, cy, z + 0.025), 'almofada', verts=24, bevel=0.02))
    p.append(lib_q.torus(0.36, 0.06, (cx, cy, z + 0.06), 'almofadaBorda', seg=24, rseg=8))
    p[-1].scale = (1, 1, 0.8)
    return p


def pata(x, y, z, m, escala=1.0, giro=0.0):
    p = [esfera(0.05 * escala, (0, 0, 0), m, escala=(1.1, 0.9, 0.12), seg=12, aneis=4)]
    for k, a in enumerate((-50, -18, 18, 50)):
        aa = R(90 + a)
        p.append(esfera(0.022 * escala, (math.cos(aa) * 0.068 * escala, math.sin(aa) * 0.062 * escala, 0), m,
                        escala=(1, 1.2, 0.27), seg=8, aneis=4))
    lib_ilha.place(p, loc=(x, y, z), rot_z=giro)
    return p


def potes():
    p = []
    # Tapetinho com duas patinhas.
    tx, ty = 0.5, -0.5
    p.append(lib_q.cushion((0.78, 0.44, 0.02), (tx, ty, 0.01), 'tapete', puff=0.0, round_=0.4))
    p += pata(tx - 0.0, ty - 0.14, 0.024, 'potinho', 0.75, R(-10))
    p += pata(tx + 0.3, ty + 0.12, 0.024, 'potinho', 0.65, R(20))
    # Potinho de água (azul) e de ração (rosa).
    for x, m in ((tx - 0.17, 'potinhoAzul'), (tx + 0.17, 'potinho')):
        pote = torneado([(0, 0), (0.11, 0), (0.12, 0.012), (0.105, 0.07), (0.11, 0.08), (0.095, 0.082), (0.075, 0.02),
                         (0, 0.018)], m, seg=22)
        pote.location = (x, ty + 0.03, 0.02)
        p.append(pote)
    xa = tx - 0.17
    p.append(cyl(0.086, 0.004, (xa, ty + 0.03, 0.02 + 0.06), 'agua', verts=20))
    xr = tx + 0.17
    p.append(esfera(0.08, (xr, ty + 0.03, 0.02 + 0.05), 'racao', escala=(1, 1, 0.3), seg=14, aneis=5))
    for k in range(9):
        a = k * 2.4
        rr = 0.025 + 0.02 * (k % 3)
        p.append(esfera(0.012, (xr + math.cos(a) * rr, ty + 0.03 + math.sin(a) * rr, 0.02 + 0.07 - 0.005 * (k % 3)),
                        'racao', escala=(1, 1, 0.7), seg=6, aneis=4))
    # Ossinho de brinquedo no chão.
    ox, oy = -0.05, -0.62
    osso = [cyl(0.018, 0.16, (0, 0, 0), 'osso2', verts=10, rot=(0, R(90), 0))]
    for sx in (-1, 1):
        for sy in (-1, 1):
            osso.append(lib_q.sphere(0.026, (sx * 0.085, sy * 0.022, 0), 'osso2', subdiv=1))
    lib_ilha.place(osso, loc=(ox, oy, 0.03), rot_z=R(25))
    p += osso
    return p


def casinha():
    placa, texto = placa_e_texto()
    nos = {'casinha': paredes() + telhado() + miolo() + potes(),
           'placa': placa, 'texto': texto}
    return {'nos': nos, 'grupo': 'casinha'}


ITENS = [('casinha', casinha)]

if __name__ == '__main__':
    rodar(ITENS)
