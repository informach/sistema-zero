"""As comidas que a cozinha da casa faz, cada uma no seu prato, tigela ou panela.

Um nó por arquivo, com o nome do arquivo e a base na origem:
  salada · pipoca · pao-de-queijo · bolo-de-fuba · brigadeiro · acai · moqueca · peixe-com-coco
  chocolate-quente (caneca no pires, com chantili, marshmallows e a fumacinha)
"""
import random

from lib_itens import *

T = TOPO_DO_PRATO

lib_q.PALETTE.update({
    'caneca': ('#e0584f', 0.45, None, 0),
    'canecaListra': ('#fffaf3', 0.45, None, 0),
    'chocolate': ('#6b3a26', 0.35, None, 0),
    'espumaChocolate': ('#c98f62', 0.6, None, 0),
    'chantili': ('#fffaf3', 0.7, None, 0),
    'marshmallow': ('#ffc9d8', 0.85, None, 0),
    'marshmallowBranco': ('#fffdf8', 0.85, None, 0),
    'fumaca': ('#f6f9ff', 0.9, None, 0),
})


def salada():
    t, fundo = tigela(0.13, 0.075, 'loucaVerde')
    p = [t]
    rnd = random.Random(1)
    for k in range(9):
        a = 2 * math.pi * k / 9
        r = 0.05 + 0.02 * (k % 2)
        o = esfera(0.045, (math.cos(a) * r, math.sin(a) * r, 0.07), 'folhaAlface' if k % 2 else 'folhaAlfaceEscura',
                   escala=(1, 0.35, 0.8), seg=10, aneis=6)
        o.rotation_euler = (R(rnd.uniform(-30, 30)), R(rnd.uniform(-20, 20)), a + math.pi / 2)
        p.append(o)
    p.append(esfera(0.05, (0, 0, 0.075), 'folhaAlface', escala=(1, 1, 0.5), seg=12, aneis=7))
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.4
        o = esfera(0.024, (math.cos(a) * 0.045, math.sin(a) * 0.045, 0.1), 'tomate', escala=(1, 1, 0.6), seg=12,
                   aneis=6)
        p.append(o)
    for k in range(7):
        a = k * 2.3
        p.append(esfera(0.008, (math.cos(a) * 0.03, math.sin(a) * 0.03, 0.11), 'milho', seg=6, aneis=4))
    return p


def pipoca():
    cop = torneado([(0, 0), (0.06, 0), (0.062, 0.004), (0.08, 0.16), (0.083, 0.165), (0.077, 0.165),
                    (0.058, 0.01), (0, 0.01)], 'saquinho', seg=24)
    pintar_por(cop, lambda c, n: 'saquinhoListra' if int((math.atan2(c.y, c.x) + math.pi) / (math.pi / 6)) % 2 else None)
    p = [cop]
    rnd = random.Random(4)
    for k in range(22):
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0, 0.065)
        z = 0.16 + 0.035 * (1 - r / 0.065) + rnd.uniform(0, 0.02)
        o = rock((math.cos(a) * r, math.sin(a) * r, z - 0.012), (0.03, 0.028, 0.026), 'pipoca', seed=k, subdiv=1,
                 rough=0.35, top_m='pipocaMiolo' if k % 4 == 0 else None)
        p.append(o)
    return p


def pao_de_queijo():
    p = [prato(0.16, 'loucaBranca')]
    pos = [(0, 0)] + [(math.cos(2 * math.pi * k / 5) * 0.075, math.sin(2 * math.pi * k / 5) * 0.075) for k in range(5)]
    for i, (x, y) in enumerate(pos):
        o = esfera(0.034, (x, y, T + 0.026 + (0.01 if i == 0 else 0)), 'paoDeQueijo', escala=(1, 1, 0.78), seg=14,
                   aneis=9)
        deformar(o, lambda v, i=i: Vector((v.x * (1 + 0.05 * math.sin(v.z * 120 + i)), v.y, max(v.z, -0.02))))
        pintar_por(o, lambda c, n: 'paoDeQueijoTopo' if n.z > 0.75 else None)
        p.append(o)
    return p


def bolo_de_fuba():
    p = [prato(0.17, 'loucaAzul')]
    # Bolo de furo no meio, com a casquinha mais escura em cima.
    perfil = [(0.035, T), (0.11, T), (0.115, T + 0.02), (0.112, T + 0.07), (0.1, T + 0.085), (0.075, T + 0.092),
              (0.05, T + 0.085), (0.038, T + 0.07), (0.035, T + 0.0)]
    bolo = torneado(perfil, 'bolo', seg=26)
    # Gomos de forma de pudim.
    deformar(bolo, lambda v: Vector((v.x, v.y, v.z)) * 1 if v.z <= T + 0.001 else
             Vector((v.x * (1 + 0.04 * math.cos(8 * math.atan2(v.y, v.x))),
                     v.y * (1 + 0.04 * math.cos(8 * math.atan2(v.y, v.x))), v.z)))
    pintar_por(bolo, lambda c, n: 'boloTopo' if n.z > 0.45 else None)
    p.append(bolo)
    # Erva-doce salpicada no topo.
    for k in range(14):
        a = k * 2.4
        r = 0.055 + 0.03 * ((k * 7) % 5) / 5
        p.append(esfera(0.004, (math.cos(a) * r, math.sin(a) * r, T + 0.091 - 0.01 * abs(r - 0.075) / 0.03), 'erva',
                        escala=(1.6, 0.8, 0.8), seg=6, aneis=4))
    return p


def _forminha(pos, r=0.034):
    x, y = pos
    f = torneado([(0, 0), (r * 0.7, 0), (r, 0.024), (r * 0.94, 0.026), (r * 0.66, 0.004), (0, 0.004)], 'forminha',
                 seg=20, pos=(x, y, T))
    deformar(f, lambda v: Vector((x + (v.x - x) * (1 + 0.08 * math.cos(10 * math.atan2(v.y - y, v.x - x)) * (v.z - T) / 0.026),
                                  y + (v.y - y) * (1 + 0.08 * math.cos(10 * math.atan2(v.y - y, v.x - x)) * (v.z - T) / 0.026),
                                  v.z)))
    return f


def brigadeiro():
    p = [prato(0.15, 'loucaBranca')]
    rnd = random.Random(7)
    for k, (x, y) in enumerate(((-0.045, -0.04), (0.045, -0.04), (-0.045, 0.045), (0.045, 0.045))):
        p.append(_forminha((x, y)))
        b = lib_q.sphere(0.03, (x, y, T + 0.03), 'brigadeiro', subdiv=2)
        lib_q.flat(b)
        # Granulado: faces sorteadas em chocolate escuro (barato e com cara de granulado).
        pintar_por(b, lambda c, n: 'granulado' if rnd.random() < 0.4 else None)
        p.append(b)
    return p


def acai():
    c, fundo = tigela(0.11, 0.075, 'cuia')
    p = [c, disco(0.1, 0.07, 'acai', seg=26)]
    for k, (a, r) in enumerate(((0.3, 0.05), (1.4, 0.055), (2.5, 0.045), (3.7, 0.05))):
        b = cyl(0.016, 0.008, (math.cos(a) * r, math.sin(a) * r, 0.075), 'banana', verts=12)
        p.append(b)
    rnd = random.Random(2)
    for k in range(14):
        a = rnd.uniform(-1.2, 1.2) + math.pi
        r = rnd.uniform(0.0, 0.06)
        p.append(rock((math.cos(a) * r, math.sin(a) * r, 0.07), (0.014, 0.012, 0.009), 'granola', seed=k, subdiv=1,
                      rough=0.3))
    # Colher espetada.
    p.append(tube([(0.02, 0.02, 0.07), (0.07, 0.06, 0.14), (0.1, 0.085, 0.18)], [0.006, 0.005, 0.005], 'metal', seg=6))
    p.append(esfera(0.016, (0.015, 0.015, 0.072), 'metal', escala=(1.3, 1, 0.35), seg=10, aneis=6))
    return p


def moqueca():
    perfil = [(0, 0), (0.09, 0), (0.1, 0.01), (0.13, 0.05), (0.135, 0.075), (0.122, 0.08), (0.118, 0.07),
              (0.09, 0.025), (0, 0.022)]
    panela = torneado(perfil, 'barro', seg=28)
    pintar_por(panela, lambda c, n: 'barroEscuro' if c.z > 0.07 else None)
    p = [panela]
    for s in (-1, 1):
        p.append(lib_q.torus(0.022, 0.008, (s * 0.145, 0, 0.06), 'barroEscuro', seg=12, rseg=6, rot=(R(90), 0, 0),
                             arc=200))
    p.append(disco(0.12, 0.066, 'caldoMoqueca', seg=28))
    rnd = random.Random(5)
    for k, (x, y) in enumerate(((-0.04, -0.03), (0.035, -0.045), (0.05, 0.03), (-0.03, 0.05), (0.0, 0.0))):
        o = lib_q.cushion((0.05, 0.035, 0.025), (x, y, 0.072), 'peixe', puff=0.3, round_=0.4)
        o.rotation_euler = (0, 0, rnd.uniform(0, 3))
        p.append(o)
    for k, (x, y, cor) in enumerate(((-0.07, 0.0, 'pimentao'), (0.07, -0.01, 'pimentaoVerde'), (0.0, -0.075, 'pimentao'),
                                     (0.01, 0.075, 'cebola'))):
        p.append(lib_q.torus(0.018, 0.005, (x, y, 0.071), cor, seg=14, rseg=5))
    for k in range(5):
        a = k * 1.3
        p.append(leaf((math.cos(a) * 0.06, math.sin(a) * 0.06, 0.08), a, 0.03, 0.014, 'coentro', lift=0.01, droop=0.01,
                      fold=0.2, n=4))
    return p


def peixe_com_coco():
    p = [prato(0.18, 'loucaBranca')]
    p.append(esfera(0.12, (0, 0, T + 0.002), 'molhoCoco', escala=(1, 0.72, 0.06), seg=20, aneis=6))
    corpo = esfera(1, (0, 0, 0), 'peixeAssado', escala=(0.085, 0.035, 0.032), seg=18, aneis=10)
    deformar(corpo, lambda v: Vector((v.x, v.y * (1 - 0.35 * max(0.0, -v.x / 0.085)), v.z * (1 - 0.3 * max(0.0, -v.x / 0.085)))))
    pintar_por(corpo, lambda c, n: 'peixeAssadoEscuro' if n.z > 0.6 and abs(math.sin(c.x * 160)) > 0.75 else None)
    corpo.location = (0.01, 0, T + 0.03)
    p.append(corpo)
    p.append(prism([(0, 0), (-0.05, 0.035), (-0.04, 0), (-0.05, -0.035)], 0.01, (-0.07, 0, T + 0.03), 'peixeAssado',
                   rot=(R(90), 0, 0)))
    p.append(esfera(0.007, (0.07, -0.024, T + 0.038), 'cocoBranco', seg=8, aneis=5))
    p.append(esfera(0.004, (0.072, -0.029, T + 0.038), 'ferro', seg=6, aneis=4))
    # Meio coco e uma fatia de limão.
    coco = torneado([(0, 0), (0.03, 0.004), (0.045, 0.02), (0.05, 0.04), (0.044, 0.041), (0.04, 0.024), (0, 0.016)],
                    'coco', seg=18, pos=(0.11, 0.09, T - 0.006))
    pintar_por(coco, lambda c, n: 'cocoBranco' if n.z > 0.2 and c.z > T + 0.01 else None)
    p.append(coco)
    lim = cyl(0.026, 0.012, (-0.1, 0.085, T + 0.006), 'limao', verts=14)
    lim.rotation_euler = (R(75), 0, R(30))
    p.append(lim)
    for k in range(4):
        p.append(leaf((-0.02 + k * 0.02, 0.01, T + 0.065), R(90 * k + 20), 0.025, 0.012, 'coentro', lift=0.005,
                      droop=0.01, fold=0.2, n=4))
    return p


def chocolate_quente():
    """Caneca de chocolate quente no pires: espuma, chantili em espiral, marshmallows e a fumacinha."""
    p = [prato(0.095, 'loucaBranca')]
    z0 = T - 0.002
    caneca = torneado([(0, z0), (0.04, z0), (0.045, z0 + 0.005), (0.048, z0 + 0.02), (0.05, z0 + 0.06),
                       (0.0505, z0 + 0.07), (0.051, z0 + 0.08), (0.0515, z0 + 0.092), (0.052, z0 + 0.1),
                       (0.047, z0 + 0.103), (0.045, z0 + 0.097), (0.044, z0 + 0.02), (0, z0 + 0.016)], 'caneca', seg=28)
    # Uma faixa branca no alto da caneca.
    pintar_por(caneca, lambda c, n: 'canecaListra' if z0 + 0.07 < c.z < z0 + 0.08 and n.z < 0.5 and
               math.hypot(c.x, c.y) > 0.048 else None)
    p.append(caneca)
    # Asa do lado direito (o lado que a câmera vê).
    asa = torus(0.024, 0.0078, (0, 0, 0), 'caneca', seg=14, rseg=8, arc=180, rot=(R(90), R(90), 0))
    asa.location = (0.047, 0, z0 + 0.052)
    lib_ilha.place([asa], rot_z=R(31))
    p.append(asa)
    zc = z0 + 0.088
    p.append(disco(0.0455, zc, 'chocolate', seg=28))
    # Espuma: bolhinhas claras encostadas na borda de dentro.
    for k in range(11):
        a = 2 * math.pi * k / 11 + 0.3
        r = 0.006 + 0.002 * (k % 3 == 0)
        p.append(esfera(r, (math.cos(a) * 0.039, math.sin(a) * 0.039, zc), 'espumaChocolate', escala=(1, 1, 0.55),
                        seg=8, aneis=5))
    # Chantili em espiral, como sorvete de máquina.
    perfil = [(0.0, zc + 0.003), (0.025, zc + 0.003), (0.028, zc + 0.011), (0.022, zc + 0.018), (0.023, zc + 0.023),
              (0.016, zc + 0.03), (0.017, zc + 0.034), (0.009, zc + 0.041), (0.003, zc + 0.047), (0, zc + 0.048)]
    ch = torneado(perfil, 'chantili', seg=24)

    def espiral(v):
        a = math.atan2(v.y, v.x)
        rr = math.hypot(v.x, v.y)
        k = 1 + 0.12 * math.cos(6 * a)
        g = (v.z - zc) * 14
        return Vector((rr * k * math.cos(a + g), rr * k * math.sin(a + g), v.z))
    deformar(ch, espiral)
    ch.location = (-0.004, 0.004, 0)
    p.append(ch)
    # Dois marshmallows encostados no chantili e o chocolate raspado por cima.
    for k, (x, y, cor, rot) in enumerate(((0.022, -0.024, 'marshmallow', (R(20), R(10), R(-30))),
                                         (-0.03, -0.012, 'marshmallowBranco', (R(-15), R(25), R(40))),
                                         (0.03, 0.016, 'marshmallow', (R(10), R(-20), R(10))))):
        o = cyl(0.0085, 0.014, (x, y, zc + 0.005), cor, verts=12, bevel=0.0025)
        o.rotation_euler = rot
        p.append(o)
    rnd = random.Random(9)
    for k in range(9):
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0.004, 0.02)
        z = zc + 0.048 * (1 - r / 0.026) + 0.002
        o = box((0.006, 0.003, 0.002), (math.cos(a) * r - 0.004, math.sin(a) * r + 0.004, z), 'chocolate', bevel=0)
        o.rotation_euler = (R(rnd.uniform(-30, 30)), R(rnd.uniform(-30, 30)), a)
        p.append(o)
    # A fumacinha: dois fios que sobem ondulando e afinam.
    for k, (x0, y0, fase, alto) in enumerate(((-0.022, 0.012, 0.0, 0.075), (0.02, 0.02, 0.0, 0.06))):
        pts, raios = [], []
        for i in range(9):
            t = i / 8
            z = zc + 0.05 + t * alto
            pts.append((x0 + 0.007 * math.sin(t * 4.6 + fase), y0 + 0.003 * math.cos(t * 3 + fase), z))
            raios.append(0.0095 * (1 - 0.6 * t) + 0.0015)
        p.append(tube(pts, raios, 'fumaca', seg=8))
        p.append(esfera(raios[-1], pts[-1], 'fumaca', seg=8, aneis=5))
        p.append(esfera(raios[0], pts[0], 'fumaca', seg=8, aneis=5))
    return p


FUNCOES = {'salada': salada, 'pipoca': pipoca, 'pao-de-queijo': pao_de_queijo, 'bolo-de-fuba': bolo_de_fuba,
           'brigadeiro': brigadeiro, 'acai': acai, 'moqueca': moqueca, 'peixe-com-coco': peixe_com_coco,
           'chocolate-quente': chocolate_quente}
ITENS = [(pid, (lambda pid=pid: {'nos': {pid: FUNCOES[pid]()}, 'grupo': 'comidas'})) for pid in FUNCOES]

if __name__ == '__main__':
    rodar(ITENS)
