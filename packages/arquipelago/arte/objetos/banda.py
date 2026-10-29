"""Os instrumentos da banda (Pico Gelado, "montar a banda"): cinco peças soltas num arquivo só.

Cada instrumento é um nó com o pivô no meio da sua própria base (z = 0), e o arquivo os mostra
arrumados como um palco num footprint de 3 × 2. O jogo pode usar o arquivo inteiro ou copiar um nó
e pôr onde quiser (a posição do nó é o lugar dele no palco):
- `bateria`: bumbo com a estrela na pele da frente, pedal com a baqueta do bumbo, caixa no
  suporte com duas baquetas, tom em cima do bumbo e prato;
- `teclado`: teclado de duas oitavas no suporte em X;
- `violao`: violão no suporte;
- `xilofone`: sete teclas coloridas no cavalete, com duas baquetas;
- `microfone`: microfone no pedestal com o fio enrolado no chão.
"""
from lib_objetos import *

LUGARES = {
    'bateria': (0.0, 0.42, 0),
    'teclado': (-1.0, 0.3, R(12)),
    'xilofone': (1.0, 0.32, R(-12)),
    'violao': (-0.62, -0.55, R(10)),
    'microfone': (0.35, -0.55, 0),
}


def tambor(r, h, centro, eixo, casco, pele='peleTambor', aro='aroTambor', seg=24):
    """Tambor com o casco, as duas peles e os aros. `eixo` 'Y' (bumbo, deitado) ou 'Z' (em pé)."""
    p = [cyl(r, h, (0, 0, 0), casco, verts=seg)]
    for s in (-1, 1):
        p.append(cyl(r * 0.96, 0.006, (0, 0, s * (h / 2 + 0.001)), pele, verts=seg))
        p.append(lib_q.torus(r * 1.0, 0.012, (0, 0, s * (h / 2 - 0.004)), aro, seg=seg, rseg=4))
    # Afinadores (os parafusinhos em volta).
    n = 6 if r > 0.15 else 5
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        p.append(box((0.02, 0.016, h * 0.5), (math.cos(a) * (r + 0.004), math.sin(a) * (r + 0.004), 0), aro,
                     bevel=0.0, rot=(0, 0, a)))
    rot = Matrix.Rotation(R(90), 4, 'X') if eixo == 'Y' else Matrix.Identity(4)
    M = Matrix.Translation(Vector(centro)) @ rot
    bpy.context.view_layer.update()
    for o in p:
        o.matrix_world = M @ o.matrix_world
    return p


def tripe(x, y, z_topo, r_pe=0.16, m='aroTambor'):
    """Suporte de três pés com a haste no meio até `z_topo`."""
    p = [barra((x, y, 0.12), (x, y, z_topo), m, r=0.011, verts=8)]
    for k in range(3):
        a = 2 * math.pi * k / 3 + R(90)
        pe = (x + math.cos(a) * r_pe, y + math.sin(a) * r_pe, 0.014)
        p.append(barra((x, y, 0.16), pe, m, r=0.008, verts=6))
        p.append(lib_q.sphere(0.014, pe, 'borracha', subdiv=1))
    p.append(cyl(0.018, 0.04, (x, y, 0.15), m, verts=10))
    return p


def bateria():
    p = []
    rb, hb = 0.24, 0.3
    zb = rb + 0.03
    p += tambor(rb, hb, (0, 0, zb), 'Y', 'bumbo')
    # Estrela e círculo na pele da frente (a frente é -Y).
    yf = -hb / 2 - 0.008
    p.append(cyl(0.13, 0.006, (0, yf - 0.002, zb), 'bumbo', verts=24, rot=(R(90), 0, 0)))
    p.append(prism(lib_q.star_pts(0.1, 0.045), 0.006, (0, yf - 0.008, zb), 'estrela'))
    # Esporas da frente e o pedal com a baqueta atrás.
    for s in (-1, 1):
        p.append(barra((s * 0.2, -0.08, zb - 0.1), (s * 0.3, -0.16, 0.012), 'aroTambor', r=0.01, verts=6))
        p.append(lib_q.sphere(0.016, (s * 0.3, -0.16, 0.016), 'borracha', subdiv=1))
    yp = hb / 2 + 0.16
    p.append(caixa_redonda((0.09, 0.24, 0.02), (0, yp, 0.03), 'ferro', raio=0.006, segs=1))
    p.append(box((0.07, 0.16, 0.012), (0, yp + 0.02, 0.05), 'metalEscuro', bevel=0.004, segs=1, rot=(R(-12), 0, 0)))
    p.append(barra((0, yp - 0.1, 0.03), (0, hb / 2 + 0.06, zb - 0.02), 'aroTambor', r=0.007, verts=6))
    p.append(lib_q.sphere(0.035, (0, hb / 2 + 0.045, zb - 0.02), 'peleTambor', subdiv=2))
    for s in (-1, 1):
        p.append(barra((s * 0.045, yp - 0.1, 0.03), (s * 0.045, yp - 0.1, 0.2), 'aroTambor', r=0.008, verts=6))
    # Tom em cima do bumbo, inclinado para quem toca.
    tom = tambor(0.11, 0.1, (0, 0, 0), 'Z', 'bumbo', seg=18)
    M = Matrix.Translation((0.0, 0.02, zb + rb + 0.13)) @ Matrix.Rotation(R(-20), 4, 'X')
    bpy.context.view_layer.update()
    for o in tom:
        o.matrix_world = M @ o.matrix_world
    p += tom
    p.append(barra((0, 0.0, zb + rb - 0.01), (0, 0.02, zb + rb + 0.08), 'aroTambor', r=0.012, verts=8))
    # Caixa à esquerda, no tripé, com as duas baquetas cruzadas em cima.
    xc, yc, zc = -0.4, 0.06, 0.5
    p += tripe(xc, yc, zc - 0.07)
    p += tambor(0.15, 0.12, (xc, yc, zc), 'Z', 'botaoAzul', seg=22)
    zt = zc + 0.06 + 0.012
    for a in (R(20), R(-30)):
        d = Vector((math.cos(a), math.sin(a), 0)) * 0.19
        c = Vector((xc, yc, zt + 0.006))
        p.append(tube([tuple(c - d), tuple(c + d)], [0.007, 0.01], 'madeiraClara', seg=6))
        p.append(lib_q.sphere(0.01, tuple(c + d * 1.02), 'madeiraClara', subdiv=1))
    # Prato à direita.
    xp, yp2 = 0.42, 0.1
    p += tripe(xp, yp2, 0.95)
    prato = torneado([(0, 0.012), (0.03, 0.01), (0.05, 0.0), (0.2, -0.018), (0.2, -0.024), (0.05, -0.006),
                      (0.03, 0.002), (0, 0.004)], 'pratoBateria', seg=26)
    prato.rotation_euler = (R(-12), R(8), 0)
    prato.location = (xp, yp2, 0.97)
    p.append(prato)
    p.append(cyl(0.012, 0.03, (xp, yp2, 0.975), 'tecido', verts=8))
    return p


def teclado():
    p = []
    L, F, zt = 0.92, 0.3, 0.74
    p.append(caixa_redonda((L, F, 0.08), (0, 0, zt + 0.04), 'teclado', raio=0.025, segs=2))
    # Duas oitavas e uma tecla: 15 brancas e 10 pretas.
    nb = 15
    lb = 0.052
    x0 = -nb * lb / 2 + lb / 2
    yk = -F / 2 + 0.085
    ztk = zt + 0.08
    for i in range(nb):
        p.append(box((lb - 0.005, 0.15, 0.02), (x0 + i * lb, yk - 0.004, ztk + 0.004), 'teclaBranca', bevel=0.004,
                     segs=1))
    for i in range(nb - 1):
        if i % 7 in (2, 6):
            continue
        p.append(box((0.028, 0.09, 0.022), (x0 + (i + 0.5) * lb, yk + 0.025, ztk + 0.02), 'teclaPreta', bevel=0.0))
    # Painel de trás: alto-falantes, visorzinho e botões.
    zp = zt + 0.08
    for s in (-1, 1):
        p.append(cyl(0.04, 0.008, (s * 0.36, 0.07, zp + 0.002), 'plastico', verts=16))
        for k in range(2):
            p.append(lib_q.torus(0.014 + 0.014 * k, 0.003, (s * 0.36, 0.07, zp + 0.007), 'teclaPreta', seg=12, rseg=3))
    p.append(caixa_redonda((0.16, 0.06, 0.012), (0, 0.08, zp + 0.004), 'botaoVerde', raio=0.004, segs=1))
    for k, m in enumerate(('botaoVermelho', 'botaoAmarelo', 'botaoAzul')):
        p.append(cyl(0.011, 0.012, (-0.22 + 0.04 * k, 0.08, zp + 0.005), m, verts=10))
    for x in (0.13, 0.17, 0.21):
        p.append(cyl(0.011, 0.012, (x, 0.08, zp + 0.005), 'branco', verts=10))
    # Suporte em X dos dois lados, com as barras de apoio.
    for s in (-1, 1):
        x = s * 0.3
        for dy in (-1, 1):
            p.append(barra((x, dy * 0.2, 0.02), (x, -dy * 0.12, zt - 0.02), 'metalEscuro', r=0.016, verts=8))
            p.append(cyl(0.022, 0.03, (x, dy * 0.2, 0.022), 'borracha', verts=10, rot=(R(90), 0, 0)))
        p.append(lib_q.sphere(0.026, (x, 0.04, (0.02 + zt - 0.02) / 2), 'metalEscuro', subdiv=1))
    for dy in (-0.12, 0.12):
        p.append(barra((-0.3, dy, zt - 0.02), (0.3, dy, zt - 0.02), 'metalEscuro', r=0.012, verts=8))
    return p


def contorno_violao():
    """Contorno do corpo: duas bocas de círculo juntas na cintura."""
    a = (0.0, 0.19, 0.19)    # (cx, cz, r) de baixo
    b = (0.0, 0.43, 0.15)
    pts = []
    n = 26
    for (cx, cz, r), (ox, oz, orr) in ((a, b), (b, a)):
        for k in range(n):
            t = 2 * math.pi * k / n + (-math.pi / 2 if r == a[2] else math.pi / 2)
            x, z = cx + r * math.cos(t), cz + r * math.sin(t)
            if (x - ox) ** 2 + (z - oz) ** 2 > orr ** 2 * 0.98:
                pts.append((x, z))
    # Ordena pelo ângulo em volta do meio para um contorno simples.
    mz = 0.3
    pts.sort(key=lambda q: math.atan2(q[1] - mz, q[0]))
    return pts


def violao():
    p = []
    corpo = prism(contorno_violao(), 0.1, (0, 0, 0), 'violao', bevel=0.02)
    p.append(corpo)
    def para_fora(x, z, d=0.006):
        r = math.hypot(x, z - 0.3)
        return (x * (r + d) / r, 0.3 + (z - 0.3) * (r + d) / r)
    p.append(prism([para_fora(x, z) for x, z in contorno_violao()], 0.06, (0, 0, 0), 'violaoEscuro'))
    yf = -0.05
    p.append(cyl(0.052, 0.008, (0, yf - 0.001, 0.4), 'boca', verts=20, rot=(R(90), 0, 0)))
    p.append(lib_q.torus(0.062, 0.006, (0, yf - 0.002, 0.4), 'violaoEscuro', seg=22, rseg=4, rot=(R(90), 0, 0)))
    p.append(caixa_redonda((0.14, 0.02, 0.03), (0, yf - 0.008, 0.16), 'violaoEscuro', raio=0.006, segs=1))
    # Braço, escala, mão e tarraxas.
    p.append(box((0.055, 0.04, 0.44), (0, 0.0, 0.58 + 0.22), 'violaoEscuro', bevel=0.012, segs=2))
    p.append(box((0.05, 0.008, 0.42), (0, -0.024, 0.58 + 0.23), 'boca', bevel=0.002, segs=1))
    for k in range(6):
        z = 0.62 + k * 0.065
        p.append(box((0.046, 0.006, 0.005), (0, -0.029, z), 'cromado', bevel=0.0))
    mao = caixa_redonda((0.08, 0.035, 0.16), (0, 0.012, 1.08), 'violaoEscuro', raio=0.012, segs=2)
    mao.rotation_euler = (R(-12), 0, 0)
    p.append(mao)
    for s in (-1, 1):
        for k in range(3):
            z = 1.04 + k * 0.045
            p.append(cyl(0.011, 0.03, (s * 0.055, 0.02, z), 'cromado', verts=8, rot=(0, R(90), 0)))
    # Seis cordas do cavalete até a pestana.
    for k in range(6):
        x = -0.02 + k * 0.008
        p.append(box((0.0025, 0.0025, 0.85), (x, -0.036, 0.165 + 0.425), 'corda', bevel=0.0))
    p.append(box((0.055, 0.012, 0.012), (0, -0.03, 1.02), 'peleTambor', bevel=0.002, segs=1))
    # Inclina para trás e põe no suporte.
    bpy.context.view_layer.update()
    M = Matrix.Translation((0, 0.02, 0.12)) @ Matrix.Rotation(R(-14), 4, 'X')
    for o in p:
        o.matrix_world = M @ o.matrix_world
    s = []
    for x in (-0.16, 0.16):
        s.append(barra((x, -0.12, 0.012), (x * 0.4, 0.04, 0.16), 'metalEscuro', r=0.012, verts=8))
        s.append(lib_q.sphere(0.016, (x, -0.12, 0.016), 'borracha', subdiv=1))
    s.append(barra((0, 0.28, 0.012), (0, 0.13, 0.75), 'metalEscuro', r=0.012, verts=8))
    s.append(lib_q.sphere(0.016, (0, 0.28, 0.016), 'borracha', subdiv=1))
    s.append(barra((-0.1, 0.0, 0.1), (0.1, 0.0, 0.1), 'metalEscuro', r=0.011, verts=8))
    for x in (-0.11, 0.11):
        s.append(barra((x, -0.06, 0.08), (x, 0.02, 0.1), 'borracha', r=0.02, verts=8))
    s.append(barra((-0.04, 0.17, 0.76), (0.04, 0.17, 0.76), 'borracha', r=0.016, verts=8))
    s.append(barra((0, 0.0, 0.1), (0, 0.13, 0.75), 'metalEscuro', r=0.011, verts=8))
    return p + s


def xilofone():
    p = []
    zt = 0.52
    # Cavalete: dois trilhos que se aproximam (as teclas agudas são menores).
    for s in (-1, 1):
        p.append(caixa_redonda((0.72, 0.035, 0.04), (0, 0, 0), 'madeira', raio=0.01, segs=1))
        p[-1].rotation_euler = (0, 0, s * R(4.5))
        p[-1].location = (0, s * 0.095, zt)
    for x, y in ((-0.3, 0.1), (0.3, 0.07)):
        for s in (-1, 1):
            p.append(barra((x, s * y, zt - 0.02), (x * 1.05, s * (y + 0.07), 0.018), 'madeiraEscura', r=0.014, verts=8))
            p.append(lib_q.sphere(0.018, (x * 1.05, s * (y + 0.07), 0.018), 'borracha', subdiv=1))
    p.append(barra((-0.3, 0, 0.18), (0.3, 0, 0.18), 'madeiraEscura', r=0.014, verts=8))
    for x, y in ((-0.3, 0.1), (0.3, 0.07)):
        p.append(barra((x, -y - 0.03, 0.2), (x, y + 0.03, 0.2), 'madeiraEscura', r=0.012, verts=8))
    # Sete teclas coloridas com dois preguinhos cada.
    for k in range(7):
        x = -0.3 + k * 0.1
        comp = 0.32 - k * 0.018
        p.append(caixa_redonda((0.075, comp, 0.024), (x, 0, zt + 0.032), f'xilo{k + 1}', raio=0.009, segs=2))
        for s in (-1, 1):
            p.append(cyl(0.007, 0.01, (x, s * (0.095 - k * 0.0018 + 0.0) * (1 if s > 0 else 1), zt + 0.046), 'cromado',
                         verts=8))
    # Duas baquetas deitadas na frente.
    for k, (dx, ang) in enumerate(((-0.08, R(-8)), (0.12, R(10)))):
        d = Vector((math.cos(ang), math.sin(ang), 0))
        a = Vector((dx - 0.13, -0.2, zt + 0.06)) + d * 0.0
        b = a + d * 0.28
        p.append(tube([tuple(a), tuple(b)], [0.007, 0.006], 'madeiraClara', seg=6))
        p.append(lib_q.sphere(0.022, tuple(b + d * 0.015), ('botaoVermelho', 'botaoAmarelo')[k], subdiv=2))
    # As baquetas ficam num apoio na frente do cavalete.
    p.append(caixa_redonda((0.5, 0.06, 0.02), (-0.0, -0.2, zt + 0.035), 'madeira', raio=0.008, segs=1))
    for x in (-0.22, 0.22):
        p.append(barra((x, -0.2, zt + 0.025), (x, -0.13, zt + 0.0), 'madeiraEscura', r=0.01, verts=6))
    return p


def microfone():
    p = []
    base = torneado([(0, 0), (0.14, 0), (0.145, 0.012), (0.12, 0.03), (0.03, 0.04), (0, 0.042)], 'plastico', seg=24)
    p.append(base)
    zt = 1.08
    p.append(cyl(0.013, zt - 0.04, (0, 0, 0.04 + (zt - 0.04) / 2), 'metal', verts=10))
    p.append(cyl(0.02, 0.05, (0, 0, 0.62), 'metalEscuro', verts=12))
    p.append(lib_q.sphere(0.024, (0, 0, zt), 'metalEscuro', subdiv=2))
    # Microfone inclinado para a frente.
    d = Vector((0, -math.sin(R(35)), math.cos(R(35))))
    a = Vector((0, 0, zt)) + d * 0.02
    b = a + d * 0.14
    p.append(tube([tuple(a), tuple(a + d * 0.07), tuple(b)], [0.016, 0.02, 0.026], 'microfone', seg=12))
    cab = b + d * 0.035
    p.append(lib_q.sphere(0.042, tuple(cab), 'gradeMic', subdiv=2))
    anel = lib_q.torus(0.034, 0.008, tuple(b + d * 0.006), 'microfone', seg=16, rseg=5)
    anel.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    p.append(anel)
    # Fio: desce do microfone, enrola no pedestal e faz uma volta no chão.
    fio = [tuple(a - d * 0.0 + Vector((0.0, 0.025, -0.01)))]
    for k in range(1, 9):
        t = k / 8
        ang = t * 3.5 * math.pi
        z = zt - 0.05 - t * (zt - 0.1)
        fio.append((math.cos(ang) * 0.03, math.sin(ang) * 0.03 + 0.0, z))
    for k in range(9):
        ang = 2 * math.pi * k / 8 + 0.5
        fio.append((0.17 + math.cos(ang) * 0.09, 0.08 + math.sin(ang) * 0.07, 0.012))
    fio.append((0.33, 0.14, 0.012))
    p.append(tube(fio, [0.008] * len(fio), 'borracha', seg=6))
    return p


def banda():
    nos = {}
    for nome, fn in (('bateria', bateria), ('teclado', teclado), ('violao', violao), ('xilofone', xilofone),
                     ('microfone', microfone)):
        objs = fn()
        x, y, giro = LUGARES[nome]
        lib_ilha.place(objs, loc=(x, y, 0), rot_z=giro)
        nos[nome] = (objs, (x, y, 0))
    return {'nos': nos, 'grupo': 'banda'}


ITENS = [('banda', banda)]

if __name__ == '__main__':
    rodar(ITENS)
