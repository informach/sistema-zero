"""O forno: um fogão a gás de quatro bocas com forno embaixo (footprint 1 × 1, frente para -Y).

Nós `forno` (corpo creme com detalhes vermelhos, bocas com as grelhas, botões, relógio no
espelho de trás, o miolo do forno com a grade, a luz e o bolo de fubá na forma) e `porta` (a porta
do forno com o vidro e o puxador; pivô na dobradiça, embaixo na frente). Clipe `abrir` (0,75 s,
toca uma vez; a porta para deitada, em 88°). A luz de dentro usa o material `luz` (o jogo acende
quando o forno assa).
"""
from lib_objetos import *

L, F = 0.76, 0.62
PE = 0.05
A = 0.86                     # altura da mesa (onde ficam as bocas)
Y_FRENTE = -0.29
Y_FUNDO = Y_FRENTE + F
YC = (Y_FRENTE + Y_FUNDO) / 2
EP = 0.05                    # espessura da porta
Z_PORTA, A_PORTA = 0.12, 0.47
Z_MIOLO, A_MIOLO = 0.17, 0.39
L_MIOLO = L - 0.18
ABRIR = {'porta': {'rotation_euler': [(0, (0, 0, 0)), (6, (R(30), 0, 0)), (14, (R(96), 0, 0)),
                                      (18, (R(88), 0, 0))]}}


# As faces que o Pinta pinta (fase3-11): os dois lados do corpo e a frente da porta, na cor do forno
# sem pintura (com a imagem no `map`, o jogo põe a cor em branco). O topo é a mesa das bocas.
for _face in ('pintaFrente', 'pintaLadoEsq', 'pintaLadoDir'):
    lib_q.PALETTE[_face] = lib_q.PALETTE['forno']


def corpo():
    c = caixa_redonda((L, F, A - PE), (0, YC, PE + (A - PE) / 2), 'forno', raio=0.045, segs=3)
    fm = F - 0.06 + 0.2
    miolo = box((L_MIOLO, fm, A_MIOLO), (0, Y_FRENTE - 0.2 + fm / 2, Z_MIOLO + A_MIOLO / 2), 'fornoDentro',
                bevel=0.02, segs=2)
    booleana(c, miolo)
    lim = L_MIOLO / 2 + 0.002

    def regra(ct, n):
        if abs(ct.x) < lim and Z_MIOLO - 0.002 < ct.z < Z_MIOLO + A_MIOLO + 0.002 and ct.y > Y_FRENTE + 0.002:
            return 'fornoDentro'
        # Os lados de fora: só a parte plana (as quinas arredondadas ficam creme).
        if n.x < -0.999 and ct.x < -L / 2 + 0.01:
            return 'pintaLadoEsq'
        if n.x > 0.999 and ct.x > L / 2 - 0.01:
            return 'pintaLadoDir'
        return None
    pintar_por(c, regra)
    # u para a direita e v para cima de quem olha cada lado de fora.
    uv_plano(c, {'pintaLadoEsq'}, (0, -1, 0), (0, 0, 1))
    uv_plano(c, {'pintaLadoDir'}, (0, 1, 0), (0, 0, 1))
    p = [c]
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl(0.03, PE + 0.01, (sx * (L / 2 - 0.07), YC + sy * (F / 2 - 0.08), (PE + 0.01) / 2), 'plastico',
                         verts=10))
    # Rodapé vermelho embaixo da porta e a faixa vermelha do painel.
    p.append(box((L - 0.1, 0.02, 0.05), (0, Y_FRENTE - 0.006, PE + 0.035), 'fornoEscuro', bevel=0.01, segs=2))
    p.append(box((L - 0.06, 0.02, 0.2), (0, Y_FRENTE - 0.006, 0.735), 'fornoEscuro', bevel=0.02, segs=2))
    # Botões: quatro das bocas e um do forno, com o risquinho de onde está.
    for k in range(5):
        x = -0.26 + 0.13 * k
        p.append(cyl(0.036, 0.012, (x, Y_FRENTE - 0.022, 0.735), 'cromado', verts=14, rot=(R(90), 0, 0)))
        p.append(cyl(0.03, 0.035, (x, Y_FRENTE - 0.045, 0.735), 'botao', verts=14, rot=(R(90), 0, 0)))
        p.append(cyl(0.022, 0.006, (x, Y_FRENTE - 0.064, 0.735), 'botao', verts=14, rot=(R(90), 0, 0)))
        p.append(box((0.01, 0.012, 0.04), (x, Y_FRENTE - 0.072, 0.742), 'fornoEscuro', bevel=0.003, segs=1))
    # Mesa escura com as quatro bocas.
    p.append(caixa_redonda((L - 0.04, F - 0.06, 0.02), (0, YC - 0.01, A + 0.01), 'metalEscuro', raio=0.008, segs=2))
    for x in (-0.18, 0.18):
        for y, r in ((YC - 0.13, 0.085), (YC + 0.12, 0.072)):
            z = A + 0.02
            p.append(cyl(r * 0.78, 0.016, (x, y, z + 0.008), 'bocaGas', verts=18))
            p.append(cyl(r * 0.48, 0.018, (x, y, z + 0.025), 'metalEscuro', verts=14))
            p.append(lib_q.torus(r, 0.008, (x, y, z + 0.035), 'ferro', seg=16, rseg=4))
            for a in range(4):
                ang = R(45 + 90 * a)
                c0 = Vector((x + math.cos(ang) * r * 0.45, y + math.sin(ang) * r * 0.45, z + 0.04))
                c1 = Vector((x + math.cos(ang) * r * 1.08, y + math.sin(ang) * r * 1.08, z + 0.035))
                p.append(barra(c0, c1, 'ferro', r=0.007, verts=4))
                p.append(cyl(0.008, 0.035, (c1.x, c1.y, z + 0.0175), 'ferro', verts=4))
    # Espelho de trás com o relógio (o timer do bolo).
    p.append(caixa_redonda((L, 0.05, 0.2), (0, Y_FUNDO - 0.025, A + 0.1), 'fornoEscuro', raio=0.025, segs=3))
    yr = Y_FUNDO - 0.05
    p.append(cyl(0.065, 0.02, (0, yr - 0.005, A + 0.11), 'botao', verts=22, rot=(R(90), 0, 0), bevel=0.006))
    p.append(lib_q.torus(0.065, 0.008, (0, yr - 0.012, A + 0.11), 'cromado', seg=22, rseg=5, rot=(R(90), 0, 0)))
    p.append(box((0.008, 0.006, 0.045), (0, yr - 0.018, A + 0.13), 'tinta', bevel=0.002, segs=1))
    pont = box((0.008, 0.006, 0.035), (0.0, yr - 0.018, A + 0.11), 'tinta', bevel=0.002, segs=1)
    pont.rotation_euler = (0, R(-60), 0)
    pont.location = (0.015, yr - 0.018, A + 0.1)
    p.append(pont)
    for k in range(4):
        a = R(90 * k)
        p.append(cyl(0.006, 0.006, (math.cos(a) * 0.048, yr - 0.017, A + 0.11 + math.sin(a) * 0.048), 'fornoEscuro',
                     verts=6, rot=(R(90), 0, 0)))
    for s in (-1, 1):
        p.append(cyl(0.02, 0.025, (s * 0.25, yr - 0.008, A + 0.11), 'botao', verts=12, rot=(R(90), 0, 0)))
    return p


def miolo():
    p = []
    yi0, yi1 = Y_FRENTE + 0.01, Y_FUNDO - 0.06
    xi = L_MIOLO / 2
    zg = 0.3
    # Grade de arame: moldura e varetas, presa nas paredes.
    p.append(barra((-xi - 0.005, yi0 + 0.03, zg), (xi + 0.005, yi0 + 0.03, zg), 'grade', r=0.007, verts=6))
    p.append(barra((-xi - 0.005, yi1 - 0.03, zg), (xi + 0.005, yi1 - 0.03, zg), 'grade', r=0.007, verts=6))
    for k in range(8):
        x = -xi + 0.04 + k * (2 * xi - 0.08) / 7
        p.append(barra((x, yi0 + 0.03, zg + 0.008), (x, yi1 - 0.03, zg + 0.008), 'grade', r=0.005, verts=5))
    # Forma redonda com o bolo de fubá crescendo.
    zf = zg + 0.013
    yc = (yi0 + yi1) / 2 + 0.02
    forma = torneado([(0, 0), (0.12, 0), (0.125, 0.06), (0.132, 0.065), (0.118, 0.062), (0.113, 0.008), (0, 0.008)],
                     'forma', seg=22)
    forma.location = (0, yc, zf)
    p.append(forma)
    p.append(cyl(0.112, 0.05, (0, yc, zf + 0.008 + 0.025), 'bolo', verts=20))
    p.append(esfera(0.114, (0, yc, zf + 0.06), 'boloTopo', escala=(1, 1, 0.3), seg=20, aneis=6))
    # Luz no canto de cima, no fundo.
    p.append(esfera(0.035, (xi - 0.06, yi1 - 0.002, Z_MIOLO + A_MIOLO - 0.06), 'luz', escala=(1, 0.5, 1), seg=12,
                    aneis=6))
    p.append(lib_q.torus(0.036, 0.007, (xi - 0.06, yi1 - 0.004, Z_MIOLO + A_MIOLO - 0.06), 'cromado', seg=14, rseg=4,
                         rot=(R(90), 0, 0)))
    # Trilhos das grades nas paredes do lado.
    for s in (-1, 1):
        for z in (zg - 0.012, zg + 0.12):
            p.append(barra((s * (xi + 0.004), yi0 + 0.04, z), (s * (xi + 0.004), yi1 - 0.02, z), 'grade', r=0.006,
                           verts=5))
    return p


def porta():
    yc = Y_FRENTE - EP / 2 - 0.002
    zc = Z_PORTA + A_PORTA / 2
    d = caixa_redonda((L - 0.06, EP, A_PORTA), (0, yc, zc), 'forno', raio=0.022, segs=3)
    furo = box((0.44, EP + 0.1, 0.2), (0, yc, zc - 0.01), 'forno', bevel=0.03, segs=3)
    booleana(d, furo)
    # A frente da porta, em volta do vidro (o vidro e a moldura ficam por cima do furo).
    pintar_por(d, lambda ct, n: 'pintaFrente' if n.y < -0.999 and ct.y < yc - EP / 2 + 0.002 else None)
    uv_plano(d, {'pintaFrente'}, (1, 0, 0), (0, 0, 1))
    p = [d]
    p.append(box((0.45, 0.01, 0.21), (0, yc, zc - 0.01), 'vidroForno', bevel=0.004, segs=1))
    # Moldura cromada em volta do vidro.
    xs, zs = 0.235, 0.115
    pts = [(-xs, zc - 0.01 - zs), (xs, zc - 0.01 - zs), (xs, zc - 0.01 + zs), (-xs, zc - 0.01 + zs)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:] + pts[:1]):
        p.append(barra((x0, Y_FRENTE - EP - 0.005, z0), (x1, Y_FRENTE - EP - 0.005, z1), 'cromado', r=0.009, verts=8))
    for x, z in pts:
        p.append(lib_q.sphere(0.009, (x, Y_FRENTE - EP - 0.005, z), 'cromado', subdiv=1))
    # Puxador.
    yp = Y_FRENTE - EP - 0.05
    zp = Z_PORTA + A_PORTA - 0.045
    p.append(cyl(0.017, 0.56, (0, yp, zp), 'cromado', verts=12, rot=(0, R(90), 0)))
    for x in (-0.26, 0.26):
        p.append(cyl(0.012, 0.05, (x, yp + 0.027, zp), 'cromado', verts=8, rot=(R(90), 0, 0)))
    return p


def forno():
    pivo = (0, Y_FRENTE - EP - 0.002, Z_PORTA)
    nos = {'forno': corpo() + miolo(), 'porta': (porta(), pivo)}
    return {'nos': nos, 'clipes': {'abrir': ABRIR}, 'grupo': 'forno', 'uv': True}


ITENS = [('forno', forno)]

if __name__ == '__main__':
    rodar(ITENS)
