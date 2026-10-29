"""Nico, o caranguejo carteiro da praia (a sua ilha, junto com o Zappy).

Casco largo e redondo cor de coral com a barriga clara embaixo, o rosto (boca e bochechas) na
frente do casco e os olhos em antenas no alto. Duas pinças grandes de mitene, com a carta presa na
pinça esquerda (a direita fica livre para acenar), e três perninhas de cada lado. De carteiro: quepe
azul com a faixa amarela e o distintivo, e a bolsa de cartas a tiracolo, com os envelopes aparecendo.

  /tmp/claude-0/blender-venv/bin/python arte/personagens/nico.py   # grava src/assets/personagens/nico.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401 (o bmesh só existe depois do bpy)
import bmesh  # noqa: E402
from lib_personagens import Personagem, _matriz, cos, orientar, sen, suave  # noqa: E402
from mathutils import Vector  # noqa: E402

PALETA = {
    'casco': ('#f26a3d', 0.55),
    'barriga': ('#ffd9b0', 0.85),
    'pinta': ('#ffc29a', 0.6),
    'boca': ('#5a1f16', 0.6),
    'bochecha': ('#ff97a3', 0.9),
    'quepe': ('#2f4f94', 0.6),
    'quepe_aba': ('#1f3366', 0.4),
    'faixa': ('#f5c33b', 0.55),
    'metal': ('#f3c94e', 0.3),
    'bolsa': ('#3f72c6', 0.65),
    'aba': ('#f5c33b', 0.6),
    'alca': ('#2a4683', 0.7),
    'carta': ('#fffaf0', 0.8),
    'carta_linha': ('#b9a68a', 0.8),
    'selo': ('#e2484a', 0.55),
    'olho': ('#1b1410', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}

# Casco: centro e raios do elipsoide (antes de achatar o alto).
CASCO = ((0, 0.02, 0.74), (0.56, 0.44, 0.44))
BOCA_Z = 0.885
OMBRO = (0.46, -0.03, 0.7)
MAO = (0.78, -0.22, 0.54)


def bater(objs, origem, direcao):
    """Primeiro ponto (e a normal) em que um raio de `origem` na `direcao` encosta nas peças."""
    d = Vector(direcao).normalized()
    melhor = None
    for o in objs:
        ok, ponto, normal, _ = o.ray_cast(Vector(origem), d)
        if ok and (melhor is None or (ponto - Vector(origem)).length < (melhor[0] - Vector(origem)).length):
            melhor = (ponto, normal)
    if melhor is None:
        raise ValueError(f'nico: nada de {tuple(origem)} para {tuple(d)}')
    return melhor


def pinca(p, osso, centro, cima, vao, maior=1.0):
    """Pinça de mitene: a palma redonda e dois dedos gordinhos que se curvam um para o outro, com
    o vão entre eles na direção `vao`. O dedo de fora é o maior."""
    c, z, g = Vector(centro), Vector(cima).normalized(), Vector(vao).normalized()
    g = (g - z * g.dot(z)).normalized()
    rot = orientar(c, c + z, frente=tuple(z.cross(g)))
    p.esfera(osso, 'casco', tuple(c), (0.125 * maior, 0.105 * maior, 0.13 * maior), rot=rot, seg=12, aneis=8)
    for lado, tam in ((1, 1.0), (-1, 0.8)):
        base = c + z * 0.06 * maior + g * lado * 0.05 * maior
        pts = [base, base + z * 0.07 * maior + g * lado * 0.035 * maior,
               base + z * 0.14 * maior + g * lado * 0.02 * maior,
               base + z * 0.19 * maior * tam - g * lado * 0.025 * maior]
        raios = [0.068 * maior * tam, 0.06 * maior * tam, 0.045 * maior * tam, 0.022 * maior * tam]
        p.tubo(osso, 'casco', [tuple(q) for q in pts], raios, seg=10, tampa=False)
        p.esfera(osso, 'casco', tuple(pts[-1]), (raios[-1],) * 3, seg=6, aneis=4)


def envelope(p, osso, centro, rot, larg=0.2, alt=0.14, esp=0.012, coracao=True):
    """Envelope com a aba em V desenhada na frente e o selo de coração vermelho."""
    m = _rotacao(rot)
    c = Vector(centro)
    p.caixa(osso, 'carta', tuple(c), (larg, esp, alt), rot=rot, bisel=0.004, seg=8, aneis=4)
    frente = m @ Vector((0, -1, 0))
    meio = c + frente * (esp / 2 + 0.004)
    pts = [meio + m @ Vector((-larg * 0.44, 0, alt * 0.4)), meio + m @ Vector((0, 0, -alt * 0.08)),
           meio + m @ Vector((larg * 0.44, 0, alt * 0.4))]
    p.tubo(osso, 'carta_linha', [tuple(q) for q in pts], 0.0045, seg=5)
    if coracao:
        sc = meio + m @ Vector((0, 0, -alt * 0.08)) + frente * 0.002
        for s in (1, -1):
            p.esfera(osso, 'selo', tuple(sc + m @ Vector((0.011 * s, 0, 0.006))), (0.014, 0.006, 0.014), rot=rot,
                     seg=6, aneis=4)
        p.esfera(osso, 'selo', tuple(sc + m @ Vector((0, 0, -0.008))), (0.012, 0.006, 0.012), rot=rot, seg=6, aneis=4)


def _rotacao(rot):
    return _matriz((0, 0, 0), rot).to_3x3()


def faixa(p, osso, m, objs, pontos_plano, largura=0.05, dentro=0.006, fora=0.016, n=56):
    """Alça achatada que dá a volta no corpo: o plano passa pelos três pontos, e cada pedaço da
    alça encosta na superfície mais de fora das `objs` (casco e barriga)."""
    a, b, c = (Vector(q) for q in pontos_plano)
    nrm = (b - a).cross(c - a).normalized()
    cen = Vector(CASCO[0])
    o = cen - nrm * (cen - a).dot(nrm)
    e1 = (a - o).normalized()
    e2 = nrm.cross(e1).normalized()
    bm = bmesh.new()
    secoes = []
    for i in range(n):
        ang = math.tau * i / n
        u = e1 * math.cos(ang) + e2 * math.sin(ang)
        ponto, normal = bater(objs, o + u * 3, -u)
        lado = nrm
        sec = [bm.verts.new(ponto + normal * h + lado * w)
               for h, w in ((-dentro, -largura / 2), (fora, -largura / 2), (fora, largura / 2), (-dentro, largura / 2))]
        secoes.append(sec)
    for i in range(n):
        s0, s1 = secoes[i], secoes[(i + 1) % n]
        for k in range(4):
            bm.faces.new((s0[k], s0[(k + 1) % 4], s1[(k + 1) % 4], s1[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return p._objeto(bm, osso, m, angulo=50)


def construir():
    p = Personagem('nico', PALETA)
    centro, raios = CASCO

    # ------------------------------------------------------------ casco e barriga
    def achatar(v):
        f = 1 + 0.07 * v.z
        z = v.z * (0.88 if v.z > 0 else 1.0)
        return (v.x * f, v.y * (1 - 0.06 * max(0.0, v.z)), z)
    casco = p.esfera('tronco', 'casco', centro, raios, e1=0.86, e2=0.92, seg=28, aneis=14, deformar=achatar)
    barriga = p.esfera('tronco', 'barriga', (0, -0.09, 0.505), (0.42, 0.33, 0.235), seg=20, aneis=8)
    corpo = [casco, barriga]

    # Pintinhas claras no alto e nos lados do casco.
    for x, y, t in ((0.0, 0.3, 0.075), (0.28, 0.14, 0.062), (-0.28, 0.14, 0.062), (0.19, 0.42, 0.058),
                    (-0.2, 0.4, 0.05)):
        p.no_rosto('tronco', 'pinta', casco, x, y, (t, 0.014, t * 0.92), afunda=0.35, seg=8, aneis=4, de=(0, 0, 1))

    # Rosto na frente do casco: o sorriso largo e as bochechas.
    boca = []
    for i in range(7):
        x = -0.1 + 0.2 * i / 6
        z = BOCA_Z - 0.036 * (1 - (x / 0.1) ** 2)
        q, nn = p.superficie(casco, x, z)
        boca.append(tuple(q + nn * 0.004))
    p.tubo('tronco', 'boca', boca, 0.012, seg=6)
    for s in (1, -1):
        p.no_rosto('tronco', 'bochecha', casco, 0.29 * s, BOCA_Z - 0.03, (0.078, 0.03, 0.047), afunda=0.55, seg=10,
                   aneis=4)

    # ------------------------------------------------------------ olhos em antenas
    for s in (1, -1):
        base, _ = p.superficie(casco, 0.22 * s, -0.2, de=(0, 0, 1))
        bulbo = Vector((0.25 * s, -0.25, 1.36))
        p.tubo('cabeca', 'casco', [tuple(base - Vector((0, 0, 0.06))), tuple(base + Vector((0.01 * s, -0.015, 0.09))),
                                   tuple(bulbo - Vector((0, 0, 0.08)))], [0.055, 0.046, 0.05], seg=10, tampa=False)
        bola = p.esfera('cabeca', 'casco', tuple(bulbo), (0.125, 0.11, 0.135), seg=14, aneis=8)
        p.olho_no_rosto(s, bola, 0.25 * s, 1.375, (0.078, 0.044, 0.094), afunda=0.3, seg=12, aneis=7)

    # ------------------------------------------------------------ quepe de carteiro
    qc = Vector((0, 0.1, 1.03))
    inclina = (3, 0, 0)
    m = _rotacao(inclina)
    p.torno('tronco', 'quepe', [(0, 0.0), (0.18, 0.0), (0.185, 0.07), (0.205, 0.19), (0.24, 0.235),
                                (0.243, 0.258), (0.224, 0.279), (0, 0.287)], centro=tuple(qc), rot=inclina, seg=20,
            escala=(1.0, 0.94))
    # Faixa amarela em volta da copa (um pouco mais larga que a copa, sem encostar no mesmo plano).
    p.torno('tronco', 'faixa', [(0.188, 0.07), (0.199, 0.075), (0.209, 0.13), (0.198, 0.135)],
            centro=tuple(qc), rot=inclina, seg=20, escala=(1.0, 0.94))
    # Pala da frente, curva e escura.
    p.esfera('tronco', 'quepe_aba', tuple(qc + m @ Vector((0, -0.19, 0.1))), (0.135, 0.1, 0.018),
             rot=(14 + inclina[0], 0, 0), seg=16, aneis=5, deformar=lambda v: (v.x, v.y, v.z - 0.9 * v.x * v.x))
    # Distintivo dourado na frente da copa.
    p.esfera('tronco', 'metal', tuple(qc + m @ Vector((0, -0.2, 0.175))), (0.048, 0.013, 0.04),
             rot=(-8 + inclina[0], 0, 0), seg=10, aneis=5)

    # ------------------------------------------------------------ bolsa a tiracolo
    pa = Vector((-0.26, -0.44, 0.5))
    pb = Vector((0.52, 0.06, 0.5))
    pd = Vector((-0.46, -0.08, 0.94))
    faixa(p, 'tronco', 'alca', corpo, (pa, pb, pd), n=34)
    ponto, normal = bater(corpo, pa + Vector((0, -2, 0)), (0, 1, 0))
    nh = Vector((normal.x, normal.y, 0)).normalized()
    giro = math.degrees(math.atan2(nh.x, -nh.y))
    rb = (0, 0, giro)
    mb = _rotacao(rb)
    bc = ponto + nh * 0.075 + Vector((0, 0, -0.04))
    frente, cima = mb @ Vector((0, -1, 0)), Vector((0, 0, 1))
    p.caixa('tronco', 'bolsa', tuple(bc), (0.32, 0.12, 0.25), rot=rb, bisel=0.045)
    p.caixa('tronco', 'aba', tuple(bc + frente * 0.064 + cima * 0.055), (0.334, 0.028, 0.155), rot=rb, bisel=0.012)
    # Envelope desenhado na aba (o sinal do correio) e o botão dourado.
    emb = bc + frente * 0.081 + cima * 0.065
    p.caixa('tronco', 'carta', tuple(emb), (0.12, 0.008, 0.078), rot=rb, bisel=0.002, seg=8, aneis=4)
    vf = emb + frente * 0.006
    p.tubo('tronco', 'alca', [tuple(vf + mb @ Vector((-0.054, 0, 0.034))), tuple(vf + mb @ Vector((0, 0, -0.01))),
                              tuple(vf + mb @ Vector((0.054, 0, 0.034)))], 0.0045, seg=5)
    p.esfera('tronco', 'metal', tuple(bc + frente * 0.08 - cima * 0.01), (0.018, 0.009, 0.018), rot=rb, seg=6, aneis=4)
    # Envelopes saindo pela boca da bolsa, atrás da aba.
    for dx, dz, gz, gx in ((-0.06, 0.15, 8, -6), (0.065, 0.125, -10, 4)):
        envelope(p, 'tronco', tuple(bc + mb @ Vector((dx, 0.014, dz))), (gx, 0, giro + gz), larg=0.17, alt=0.12,
                 esp=0.01, coracao=dx > 0)
    # Argolas que prendem a alça nos cantos da bolsa.
    for s in (1, -1):
        p.toro('tronco', 'metal', tuple(bc + mb @ Vector((0.155 * s, 0.0, 0.12))), 0.024, 0.007, rot=(90, 0, giro),
               seg=10, rseg=4)

    # ------------------------------------------------------------ pinças
    for s in (1, -1):
        osso = f'braco_{"esq" if s > 0 else "dir"}'
        ombro, cotovelo, pulso = Vector(OMBRO), Vector((0.7, -0.08, 0.52)), Vector(MAO)
        ombro.x, cotovelo.x, pulso.x = ombro.x * s, cotovelo.x * s, pulso.x * s
        # Braço num tubo só, com o cotovelo arredondado por dois pontos perto da dobra.
        antes = cotovelo + (ombro - cotovelo).normalized() * 0.05
        depois = cotovelo + (pulso - cotovelo).normalized() * 0.05
        p.tubo(osso, 'casco', [tuple(ombro), tuple(antes), tuple(cotovelo + (antes + depois - 2 * cotovelo) * -0.15),
                               tuple(depois), tuple(pulso)], [0.075, 0.068, 0.07, 0.066, 0.062], seg=10, tampa=False)
        cima_p = Vector((0.35 * s, -0.35, 0.87)).normalized()
        vao = (1, 0, 0) if s < 0 else (0.45, 0.9, 0)
        pinca(p, osso, tuple(pulso + cima_p * 0.09), tuple(cima_p), vao, maior=1.3)

    # Carta presa na pinça esquerda.
    pe = Vector(MAO) + Vector((0.35, -0.35, 0.87)).normalized() * 0.33
    envelope(p, 'braco_esq', tuple(pe), (-12, 14, 8), larg=0.3, alt=0.2, esp=0.014)

    # ------------------------------------------------------------ perninhas
    for s in (1, -1):
        osso = f'perna_{"esq" if s > 0 else "dir"}'
        for y in (-0.1, 0.08, 0.26):
            raiz = Vector((0.3 * s, y, 0.38))
            joelho = Vector((0.54 * s, y * 1.1, 0.4))
            ponta = Vector((0.6 * s, y * 1.2, 0.04))
            # Perna num tubo só, com o joelho arredondado e a ponta redonda.
            antes = joelho + (raiz - joelho).normalized() * 0.05
            depois = joelho + (ponta - joelho).normalized() * 0.05
            dobra = joelho + (antes + depois - 2 * joelho) * -0.2
            meio = joelho + (ponta - joelho) * 0.5 + Vector((0.025 * s, 0, 0))
            p.tubo(osso, 'casco', [tuple(raiz), tuple(antes), tuple(dobra), tuple(depois), tuple(meio), tuple(ponta)],
                   [0.068, 0.062, 0.062, 0.06, 0.052, 0.04], seg=7, tampa=False)
            p.esfera(osso, 'casco', tuple(ponta), (0.042,) * 3, seg=7, aneis=4)

    p.esqueleto_chibi(
        quadril=0.36, pescoco=1.06, topo=1.5,
        ombro=OMBRO, mao=MAO,
        anca=(0.3, 0.08, 0.38), pe=(0.6, 0.1, 0.03),
    )
    p.finalizar()
    clipes(p)
    return p


# --------------------------------------------------------------------- clipes
def clipes(p):
    """Os cinco clipes dos moradores, do jeito de caranguejo: as perninhas sapateiam de lado a lado,
    as antenas dos olhos balançam e as pinças abanam."""

    def braco(lado, frente=0.0, sobe=0.0):
        s = 1 if lado == 'esq' else -1
        return {'rot': [('Y', -s * sobe), ('X', -frente)]}

    def perna(lado, ergue=0.0, frente=0.0):
        """`ergue` levanta as pontas para fora; `frente` leva as pernas para a frente."""
        s = 1 if lado == 'esq' else -1
        return {'rot': [('Y', -s * ergue), ('X', -frente)]}

    def parado(t):
        return {
            'quadril': {'loc': (0, 0, 0.008 * sen(t))},
            'tronco': {'rot': [('X', 1.2 * sen(t)), ('Y', 1.5 * sen(t, 1, 0.25))]},
            'cabeca': {'rot': [('Y', 4 * sen(t, 1, 0.3)), ('X', -2 * sen(t, 1, 0.1)), ('Z', 3 * sen(t, 1, 0.6))]},
            'braco_esq': braco('esq', 3 * sen(t, 1, 0.5), 3 + 3 * sen(t)),
            'braco_dir': braco('dir', 3 * sen(t), 3 + 3 * sen(t, 1, 0.5)),
            'perna_esq': perna('esq', 2 * max(0.0, sen(t, 2))),
            'perna_dir': perna('dir', 2 * max(0.0, sen(t, 2, 0.5))),
        }

    def andar(t):
        # Duas voltas por segundo: cada lado ergue as perninhas duas vezes, alternando.
        return {
            'raiz': {},
            'quadril': {'loc': (0, 0, 0.022 * (0.5 + 0.5 * cos(t, 4))),
                        'rot': [('Y', 4 * sen(t, 2)), ('Z', 3 * sen(t, 2))]},
            'tronco': {'rot': [('X', 3), ('Y', -2 * sen(t, 2))]},
            'cabeca': {'rot': [('X', -3 * cos(t, 4)), ('Y', -4 * sen(t, 2, 0.1))]},
            'perna_esq': perna('esq', 14 * max(0.0, sen(t, 2)), 12 * cos(t, 2, 0.5)),
            'perna_dir': perna('dir', 14 * max(0.0, sen(t, 2, 0.5)), 12 * cos(t, 2)),
            'braco_esq': braco('esq', 6 + 6 * sen(t, 2), 6),
            'braco_dir': braco('dir', 6 - 6 * sen(t, 2), 6),
        }

    def falar(t):
        return {
            'quadril': {'loc': (0, 0, 0.006 * sen(t, 2))},
            'tronco': {'rot': [('X', 2 * sen(t, 2)), ('Z', 4 * sen(t))]},
            'cabeca': {'rot': [('X', 5 * sen(t, 4) + 2), ('Y', 7 * sen(t)), ('Z', -4 * sen(t))]},
            'braco_esq': braco('esq', 6 + 3 * sen(t, 2), 4),
            'braco_dir': braco('dir', 28 + 12 * sen(t, 2), 18 + 8 * sen(t, 1, 0.25)),
            'perna_esq': perna('esq', 3 * max(0.0, sen(t, 2))),
            'perna_dir': perna('dir', 3 * max(0.0, sen(t, 2, 0.5))),
        }

    def acenar(t):
        return {
            'quadril': {'loc': (0, 0, 0.006 * sen(t, 3))},
            'tronco': {'rot': [('Y', 4 + 2 * sen(t, 3))]},
            'cabeca': {'rot': [('Y', 8 + 3 * sen(t, 3)), ('X', -3)]},
            'braco_esq': braco('esq', 4, 4),
            'braco_dir': {'rot': [('Y', 58 + 16 * sen(t, 3)), ('X', -26)]},
            'perna_esq': perna('esq'),
            'perna_dir': perna('dir', 4 * max(0.0, sen(t, 3))),
        }

    def feliz(t):
        no_ar = suave(0.12, 0.3, t) * (1 - suave(0.7, 0.88, t))
        u = min(1.0, max(0.0, (t - 0.15) / 0.7))
        alt = 0.15 * math.sin(math.pi * u)
        agacha = 1 - no_ar
        bate = 10 * sen(t, 4)
        return {
            'raiz': {'loc': (0, 0, alt)},
            'quadril': {'loc': (0, 0, -0.035 * agacha)},
            'tronco': {'rot': [('X', 5 * agacha - 3 * no_ar)]},
            'cabeca': {'rot': [('X', -8 * no_ar), ('Y', 6 * sen(t))]},
            'perna_esq': perna('esq', 18 * no_ar),
            'perna_dir': perna('dir', 18 * no_ar),
            'braco_esq': braco('esq', 10, 15 + 45 * no_ar + bate),
            'braco_dir': braco('dir', 10, 15 + 45 * no_ar + bate),
        }

    p.clipe('parado', 48, parado)
    p.clipe('andar', 24, andar)
    p.clipe('falar', 48, falar)
    p.clipe('acenar', 48, acenar)
    p.clipe('feliz', 24, feliz)


if __name__ == '__main__':
    construir().exportar()
