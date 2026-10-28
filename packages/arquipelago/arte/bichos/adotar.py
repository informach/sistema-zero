"""Bichos do Bosque para adotar: cachorro caramelo, gato frajola, coelho e porquinho-da-índia,
cada um em filhote e adulto.

O filhote é o mesmo desenho com a cabeça maior, as pernas mais curtas e os olhos maiores, e sai
menor pela escala do `Bicho`. Todos têm os mesmos seis clipes: `parado`, `andar`, `correr`,
`sentar`, `feliz` e o `truque` da espécie (o cachorro dá a pata, o gato se espreguiça, o coelho dá
o pulo com giro e o porquinho dá os pulinhos de pipoca).

  /tmp/claude-0/blender-venv/bin/python arte/bichos/adotar.py              # os oito
  /tmp/claude-0/blender-venv/bin/python arte/bichos/adotar.py gato-filhote # só um
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_bichos import Bicho, clipes_quadrupede, sen, suave  # noqa: E402
from mathutils import Vector  # noqa: E402

COMUM = {
    'olho': ('#1b1410', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#f4a0a0', 0.9),
    'boca': ('#3b261a', 0.6),
}

PALETAS = {
    'cachorro': {
        'pelo': ('#c98a4b', 0.85), 'claro': ('#f3dcb4', 0.9), 'nariz': ('#2b201b', 0.4),
        'orelha': ('#a86c36', 0.85), 'coleira': ('#d8473f', 0.55), 'medalha': ('#f0c64a', 0.3),
        'lingua': ('#ef7f8c', 0.5),
    },
    'gato': {
        'pelo': ('#2c2a33', 0.75), 'claro': ('#f7f4ee', 0.85), 'nariz': ('#f08b9a', 0.45),
        'orelha': ('#f3a7b4', 0.8), 'bigode': ('#f7f4ee', 0.6), 'iris': ('#9ccb54', 0.25),
        'coleira': ('#3e8fd6', 0.55), 'medalha': ('#f0c64a', 0.3),
    },
    'coelho': {
        'pelo': ('#b8b2c6', 0.9), 'claro': ('#f7f4f1', 0.9), 'nariz': ('#ef8fa0', 0.45),
        'orelha': ('#f6b3bf', 0.8), 'dente': ('#ffffff', 0.4),
    },
    'porquinho': {
        'pelo': ('#f8f1e6', 0.9), 'mancha': ('#d68a3e', 0.9), 'escuro': ('#3a2a22', 0.8),
        'nariz': ('#e7949c', 0.45), 'orelha': ('#e9a9a3', 0.8), 'pe': ('#f0b8b0', 0.7),
    },
}


def paleta(especie):
    return {**COMUM, **PALETAS[especie]}


def olhos(p, alvo, x, z, raios, **kw):
    for s in (1, -1):
        p.olho_no_rosto(s, alvo, x * s, z, raios, seg=12, aneis=7, **kw)


def bochechas(p, alvo, x, z, r):
    for s in (1, -1):
        p.no_rosto('cabeca', 'bochecha', alvo, x * s, z, (r, r * 0.4, r * 0.62), afunda=0.6, seg=8, aneis=5)


def boca_w(p, alvo, z, larg, de_nariz):
    """Boca de bichinho: o risco que desce do nariz e os dois arcos (o "ω")."""
    y = p.superficie(alvo, 0, z)[0].y - 0.004
    p.tubo('cabeca', 'boca', [(0, y, z + de_nariz), (0, y, z)], 0.006, seg=5)
    for s in (1, -1):
        p.tubo('cabeca', 'boca', [(0, y, z), (larg * 0.5 * s, y + 0.003, z - larg * 0.28),
                                  (larg * s, y + 0.008, z - larg * 0.08)], 0.006, seg=5)


def pata(p, osso, m, centro, r):
    """Patinha arredondada, um pouco mais comprida para a frente."""
    p.esfera(osso, m, centro, (r, r * 1.25, r * 0.7), seg=10, aneis=6)


def coleira(p, m_fita, m_medalha, centro, R, r, inclina):
    p.toro('corpo', m_fita, centro, R, r, rot=(inclina, 0, 0), seg=16, rseg=4)
    c = Vector(centro)
    frente = Vector((0, -math.cos(math.radians(inclina)), -math.sin(math.radians(inclina))))
    baixo = Vector((0, math.sin(math.radians(inclina)) * 0.3, -1)).normalized()
    pos = c + frente * R * 0.98 + baixo * r * 1.6
    p.torno('corpo', m_medalha, [(0, -0.006), (r * 1.4, -0.006), (r * 1.4, 0.006), (0, 0.006)],
            centro=tuple(pos), rot=(90 - inclina, 0, 0), seg=12)


# --------------------------------------------------------------------- cachorro caramelo
def cachorro(pid, filhote):
    fc, fp, fo = (1.34, 0.7, 1.22) if filhote else (1.0, 1.0, 1.0)
    p = Bicho(pid, paleta('cachorro'), escala=0.7 if filhote else 1.0, alvo=3000)
    perna = 0.24 * fp
    rx, rz, L = 0.15, 0.15, 0.27 * (0.8 if filhote else 1.0)
    hc = perna + rz * 0.5
    ox, oy = 0.085, -L * 0.6
    ax, ay = 0.095, L * 0.6

    def peito(v):
        f = 1.0 + 0.1 * max(0.0, -v.y)
        return (v.x * f, v.y, v.z * f)
    p.esfera('corpo', 'pelo', (0, 0, hc), (rx, L, rz), deformar=peito, seg=18, aneis=10)
    p.esfera('corpo', 'claro', (0, -L * 0.72, hc - 0.025), (rx * 0.72, 0.09, rz * 0.78), seg=12, aneis=7)
    p.esfera('corpo', 'claro', (0, -L * 0.1, hc - rz * 0.45), (rx * 0.7, L * 0.7, rz * 0.5), seg=12, aneis=7)
    for s, lado in ((1, 'e'), (-1, 'd')):
        p.capsula(f'pata_f{lado}', 'pelo', (ox * s, oy, hc - 0.03), (ox * s, oy, 0.045), 0.054, 0.05, seg=8)
        pata(p, f'pata_f{lado}', 'claro', (ox * s, oy - 0.02, 0.032), 0.05)
        p.esfera(f'pata_t{lado}', 'pelo', ((ax + 0.01) * s, ay, hc - 0.02), (0.07, 0.1, 0.105), seg=12, aneis=7)
        p.capsula(f'pata_t{lado}', 'pelo', (ax * s, ay + 0.02, hc - 0.07), (ax * s, ay + 0.01, 0.045), 0.05, 0.048, seg=8)
        pata(p, f'pata_t{lado}', 'claro', (ax * s, ay - 0.01, 0.032), 0.05)

    # Pescoço (no corpo) e cabeça redonda com o focinho claro comprido.
    pes = (0, -L * 0.8, hc + 0.05)
    cc = Vector((0, -L - 0.06 * fc, hc + 0.2 * (0.9 if filhote else 1.0)))
    p.capsula('corpo', 'pelo', (0, -L * 0.62, hc + 0.02), (0, cc.y + 0.04, cc.z - 0.05), 0.085, 0.08)
    cab = p.esfera('cabeca', 'pelo', tuple(cc), (0.15 * fc, 0.14 * fc, 0.135 * fc), seg=18, aneis=10)
    foc_c = (0, cc.y - 0.13 * fc, cc.z - 0.045 * fc)
    foc = p.esfera('cabeca', 'claro', foc_c, (0.085 * fc, 0.085 * fc * (0.85 if filhote else 1.0), 0.07 * fc),
                   seg=16, aneis=9)
    rosto = [cab, foc]
    p.no_rosto('cabeca', 'nariz', rosto, 0, foc_c[2] + 0.03 * fc, (0.04 * fc, 0.028 * fc, 0.03 * fc), afunda=0.35,
               seg=12, aneis=7)
    boca_w(p, rosto, foc_c[2] - 0.012 * fc, 0.035 * fc, 0.03 * fc)
    olhos(p, rosto, 0.068 * fc, cc.z + 0.03 * fc, (0.033 * fo * fc, 0.022 * fc, 0.04 * fo * fc), afunda=0.2)
    # Sobrancelhas claras de caramelo, por cima dos olhos.
    for s in (1, -1):
        p.no_rosto('cabeca', 'claro', [cab], 0.062 * fc * s, cc.z + 0.088 * fc, (0.02 * fc, 0.01, 0.012 * fc),
                   afunda=0.3, seg=8, aneis=5)
    bochechas(p, rosto, 0.1 * fc, cc.z - 0.03 * fc, 0.03 * fc)

    # Orelhas meio de pé com a ponta dobrada para a frente (o jeito do vira-lata caramelo):
    # uma gota achatada que afina para cima, com o terço de cima tombando para a frente.
    base = (0.09 * fc, cc.y + 0.025 * fc, cc.z + 0.09 * fc)
    ponta = (0.13 * fc, cc.y - 0.01 * fc, cc.z + 0.2 * fc)
    for s, osso in ((1, 'orelha_esq'), (-1, 'orelha_dir')):
        c0 = Vector((base[0] * s * 1.12, base[1], base[2] + 0.055 * fc))

        def afina(v):
            k = 1 - 0.78 * max(0.0, v.z) ** 1.2
            return (v.x * k, v.y * (1 - 0.3 * max(0.0, v.z)), v.z)

        def dobra(q, c0=c0):
            alto = q.z - (c0.z + 0.02 * fc)
            if alto <= 0:
                return q
            return (q.x, q.y - alto * 0.9, c0.z + 0.02 * fc + alto * 0.55)
        p.esfera(osso, 'orelha', tuple(c0), (0.05 * fc, 0.02 * fc, 0.07 * fc), rot=(-10, 18 * s, 0), seg=12,
                 aneis=9, deformar=afina, depois=dobra)
    # Rabo enrolado para cima, com a pontinha clara.
    pts = []
    for i in range(7):
        a = math.radians(-30 + 200 * i / 6)
        pts.append((0, L * 0.92 + 0.07 * (1 - math.cos(a)) * 0.9 + 0.02, hc + 0.05 + 0.1 * math.sin(a) + 0.06 * i / 6))
    p.tubo('cauda', 'pelo', pts, [0.036 - 0.0025 * i for i in range(7)], seg=8)
    p.esfera('cauda', 'claro', pts[-1], (0.024, 0.026, 0.024), seg=8, aneis=5)
    coleira(p, 'coleira', 'medalha', (0, -L * 0.8, hc + 0.1), 0.082, 0.016, -35)

    p.esqueleto_quadrupede(
        hc=hc, anca=(ax, ay, hc - 0.03), ombro=(ox, oy, hc - 0.03),
        pescoco=(0, cc.y + 0.06, cc.z - 0.07), topo=(0, cc.y, cc.z + 0.14 * fc),
        cauda=((0, L * 0.9, hc + 0.03), pts[-1]),
        orelha=(base, ponta),
    )
    p.finalizar()

    # Truque: senta e dá a pata direita, balançando.
    def truque(t):
        sobe = suave(0.08, 0.28, t) * (1 - suave(0.78, 0.95, t))
        return p.sentado(t, {
            'pata_fd': {'rot': [('X', p_ang - 85 * sobe - 8 * sobe * sen(t, 3))]},
            'cabeca': {'rot': [('X', p_ang * 0.75 + 4), ('Y', -12 * sobe)]},
            'cauda': {'rot': [('X', p_ang), ('Z', 28 * sen(t, 4))]},
        })
    p_ang = 30.0
    clipes_quadrupede(p, {'passo': 28, 'galope': 40, 'cauda': 22, 'orelha': 7, 'sentar': p_ang},
                      truque=(48, truque))
    return p


# --------------------------------------------------------------------- gato frajola
def gato(pid, filhote):
    fc, fp, fo = (1.34, 0.72, 1.22) if filhote else (1.0, 1.0, 1.0)
    p = Bicho(pid, paleta('gato'), escala=0.68 if filhote else 1.0, alvo=3000)
    perna = 0.2 * fp
    rx, rz, L = 0.12, 0.12, 0.24 * (0.8 if filhote else 1.0)
    hc = perna + rz * 0.5
    ox, oy = 0.07, -L * 0.62
    ax, ay = 0.078, L * 0.62
    p.esfera('corpo', 'pelo', (0, 0, hc), (rx, L, rz), seg=18, aneis=10)
    p.esfera('corpo', 'claro', (0, -L * 0.74, hc - 0.02), (rx * 0.7, 0.075, rz * 0.8), seg=12, aneis=7)
    p.esfera('corpo', 'claro', (0, -L * 0.05, hc - rz * 0.5), (rx * 0.6, L * 0.62, rz * 0.45), seg=12, aneis=7)
    for s, lado in ((1, 'e'), (-1, 'd')):
        p.capsula(f'pata_f{lado}', 'pelo', (ox * s, oy, hc - 0.03), (ox * s, oy, 0.04), 0.042, 0.038, seg=8)
        pata(p, f'pata_f{lado}', 'claro', (ox * s, oy - 0.015, 0.026), 0.04)
        p.esfera(f'pata_t{lado}', 'pelo', ((ax + 0.008) * s, ay, hc - 0.015), (0.056, 0.085, 0.085), seg=12, aneis=7)
        p.capsula(f'pata_t{lado}', 'pelo', (ax * s, ay + 0.02, hc - 0.06), (ax * s, ay + 0.01, 0.04), 0.04, 0.037, seg=8)
        pata(p, f'pata_t{lado}', 'claro', (ax * s, ay - 0.008, 0.026), 0.04)

    cc = Vector((0, -L - 0.04 * fc, hc + 0.16 * (0.92 if filhote else 1.0)))
    p.capsula('corpo', 'pelo', (0, -L * 0.62, hc + 0.02), (0, cc.y + 0.03, cc.z - 0.04), 0.068, 0.064)

    def bochechuda(v):
        # Rosto de gato: mais largo embaixo (as bochechas) e o queixo curtinho.
        f = 1.0 + 0.12 * max(0.0, -v.z) * (1 - abs(v.y))
        return (v.x * f, v.y, v.z)
    cab = p.esfera('cabeca', 'pelo', tuple(cc), (0.135 * fc, 0.118 * fc, 0.112 * fc), deformar=bochechuda, seg=18,
                   aneis=10)
    # Máscara branca do frajola: focinho e queixo brancos, subindo em ponta entre os olhos.
    foc = p.esfera('cabeca', 'claro', (0, cc.y - 0.085 * fc, cc.z - 0.04 * fc), (0.072 * fc, 0.05 * fc, 0.055 * fc),
                   seg=12, aneis=7)
    p.esfera('cabeca', 'claro', (0, cc.y - 0.09 * fc, cc.z + 0.01 * fc), (0.02 * fc, 0.035 * fc, 0.045 * fc),
             seg=10, aneis=6)
    rosto = [cab, foc]
    p.no_rosto('cabeca', 'nariz', rosto, 0, cc.z - 0.018 * fc, (0.018 * fc, 0.012, 0.012 * fc), afunda=0.3,
               seg=10, aneis=6)
    boca_w(p, rosto, cc.z - 0.045 * fc, 0.024 * fc, 0.022 * fc)
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.052 * fc * s, cc.z + 0.02 * fc,
                        (0.03 * fo * fc, 0.02 * fc, 0.034 * fo * fc), afunda=0.2, iris=('iris', 1.0), pupila=0.5,
                        seg=12, aneis=7)
    bochechas(p, rosto, 0.088 * fc, cc.z - 0.035 * fc, 0.024 * fc)
    # Bigodes: três fios de cada lado saindo do focinho.
    yb = p.superficie(rosto, 0.04 * fc, cc.z - 0.04 * fc)[0].y
    for s in (1, -1):
        for k, dz in enumerate((0.012, 0.0, -0.012)):
            a = (0.035 * fc * s, yb + 0.004, cc.z - 0.04 * fc + dz * fc)
            b = (0.13 * fc * s, yb + 0.03, cc.z - 0.04 * fc + dz * fc * 2.4 + 0.008)
            p.tubo('cabeca', 'bigode', [a, b], 0.0028, seg=4)
    # Orelhas em pé, triangulares, com o miolo rosado.
    base = (0.072 * fc, cc.y + 0.01 * fc, cc.z + 0.085 * fc)
    ponta = (0.1 * fc, cc.y + 0.0, cc.z + 0.17 * fc)
    fora = [(-0.042, 0.0), (0.042, 0.0), (0.004, 0.085)]
    dentro = [(-0.028, 0.004), (0.028, 0.004), (0.003, 0.06)]
    for s, osso in ((1, 'orelha_esq'), (-1, 'orelha_dir')):
        rot = (88, 0, -18 * s)
        p.placa(osso, 'pelo', [(x * fc, y * fc) for x, y in fora], 0.02 * fc, centro=(base[0] * s, base[1], base[2]),
                rot=rot, bisel=0.004 * fc)
        p.placa(osso, 'orelha', [(x * fc, y * fc) for x, y in dentro], 0.012 * fc,
                centro=(base[0] * s, base[1] - 0.009 * fc, base[2] + 0.002), rot=rot)
    # Rabo comprido em S, erguido, com a ponta branca.
    pts = []
    for i in range(8):
        u = i / 7
        pts.append((0, L * 0.92 + 0.2 * u - 0.05 * math.sin(math.pi * u * 1.6), hc + 0.03 + 0.26 * u ** 1.3
                    + 0.03 * math.sin(math.pi * u * 2)))
    p.tubo('cauda', 'pelo', pts, [0.027 - 0.001 * i for i in range(8)], seg=8)
    p.esfera('cauda', 'claro', pts[-1], (0.022, 0.022, 0.026), seg=8, aneis=5)
    coleira(p, 'coleira', 'medalha', (0, -L * 0.78, hc + 0.085), 0.066, 0.012, -38)

    p.esqueleto_quadrupede(
        hc=hc, anca=(ax, ay, hc - 0.03), ombro=(ox, oy, hc - 0.03),
        pescoco=(0, cc.y + 0.05, cc.z - 0.06), topo=(0, cc.y, cc.z + 0.12 * fc),
        cauda=((0, L * 0.9, hc + 0.02), pts[-1]),
        orelha=(base, ponta),
    )
    p.finalizar()

    # Truque: espreguiça (a frente desce com as patas esticadas, o traseiro e o rabo sobem).
    def truque(t):
        e = suave(0.1, 0.35, t) * (1 - suave(0.7, 0.92, t))
        return {
            'corpo': {'loc': (0, 0, -0.03 * e), 'rot': [('X', 16 * e)]},
            'cabeca': {'rot': [('X', -22 * e), ('Y', 8 * e * sen(t, 1, 0.2))]},
            'pata_fe': {'rot': [('X', -16 * e - 40 * e)]},
            'pata_fd': {'rot': [('X', -16 * e - 40 * e)]},
            'pata_te': {'rot': [('X', -16 * e + 8 * e)]},
            'pata_td': {'rot': [('X', -16 * e + 8 * e)]},
            'cauda': {'rot': [('X', -14 - 24 * e), ('Z', 10 * sen(t, 2))]},
            'orelha_esq': {'rot': [('X', 10 * e)]},
            'orelha_dir': {'rot': [('X', 10 * e)]},
        }
    clipes_quadrupede(p, {'passo': 24, 'galope': 36, 'cauda': 10, 'orelha': 4, 'sentar': 34, 'cauda_alta': 6},
                      truque=(48, truque))
    return p


# --------------------------------------------------------------------- coelho
def coelho(pid, filhote):
    fc, fp, fo = (1.3, 0.85, 1.22) if filhote else (1.0, 1.0, 1.0)
    p = Bicho(pid, paleta('coelho'), escala=0.68 if filhote else 1.0, alvo=3000)
    L = 0.17 * (0.9 if filhote else 1.0)
    hc = 0.2 * fp
    ox, oy = 0.06, -L * 0.75
    ax, ay = 0.085, L * 0.55

    def corcunda(v):
        # Mais alto e cheio atrás: o coelho sentado sobre as patas de trás.
        f = 1.0 + 0.18 * max(0.0, v.y)
        return (v.x * f, v.y, v.z * f + 0.12 * max(0.0, v.y) * max(0.0, v.z))
    p.esfera('corpo', 'pelo', (0, 0.02, hc), (0.14, L, 0.135), deformar=corcunda, seg=18, aneis=10)
    p.esfera('corpo', 'claro', (0, -L * 0.6, hc - 0.03), (0.09, 0.07, 0.1), seg=12, aneis=7)
    for s, lado in ((1, 'e'), (-1, 'd')):
        p.capsula(f'pata_f{lado}', 'pelo', (ox * s, oy, hc - 0.05), (ox * s, oy, 0.035), 0.034, 0.032, seg=8)
        pata(p, f'pata_f{lado}', 'claro', (ox * s, oy - 0.012, 0.022), 0.032)
        # Coxa grande e o pé comprido deitado no chão.
        p.esfera(f'pata_t{lado}', 'pelo', ((ax + 0.015) * s, ay, hc - 0.075), (0.072, 0.105, 0.095), seg=12, aneis=7)
        p.esfera(f'pata_t{lado}', 'claro', (ax * s, ay - 0.05, 0.024), (0.042, 0.095, 0.028), seg=12, aneis=7)

    cc = Vector((0, -L - 0.03 * fc, hc + 0.15 * (0.92 if filhote else 1.0)))
    cab = p.esfera('cabeca', 'pelo', tuple(cc), (0.12 * fc, 0.112 * fc, 0.11 * fc), seg=18, aneis=10)
    foc = p.esfera('cabeca', 'claro', (0, cc.y - 0.08 * fc, cc.z - 0.04 * fc), (0.06 * fc, 0.045 * fc, 0.05 * fc),
                   seg=12, aneis=7)
    rosto = [cab, foc]
    p.no_rosto('cabeca', 'nariz', rosto, 0, cc.z - 0.012 * fc, (0.017 * fc, 0.012, 0.012 * fc), afunda=0.3,
               seg=10, aneis=6)
    boca_w(p, rosto, cc.z - 0.04 * fc, 0.022 * fc, 0.02 * fc)
    yd = p.superficie(rosto, 0, cc.z - 0.06 * fc)[0].y
    for s in (1, -1):
        p.caixa('cabeca', 'dente', (0.0075 * s * fc, yd - 0.004, cc.z - 0.064 * fc), (0.013 * fc, 0.008, 0.017 * fc),
                bisel=0.004)
    olhos(p, rosto, 0.058 * fc, cc.z + 0.022 * fc, (0.03 * fo * fc, 0.02 * fc, 0.034 * fo * fc), afunda=0.2)
    bochechas(p, rosto, 0.08 * fc, cc.z - 0.03 * fc, 0.024 * fc)
    # Orelhas compridas em pé, com o miolo rosa, um pouco abertas.
    base = (0.045 * fc, cc.y + 0.03 * fc, cc.z + 0.085 * fc)
    ponta = (0.075 * fc, cc.y + 0.05 * fc, cc.z + 0.3 * fc)
    for s, osso in ((1, 'orelha_esq'), (-1, 'orelha_dir')):
        meio = (base[0] * s * 1.3, base[1] + 0.02 * fc, base[2] + 0.12 * fc)
        p.esfera(osso, 'pelo', meio, (0.034 * fc, 0.018 * fc, 0.12 * fc), rot=(-8, 12 * s, 0), seg=12, aneis=9)
        p.esfera(osso, 'orelha', (meio[0], meio[1] - 0.012 * fc, meio[2] + 0.005), (0.022 * fc, 0.01 * fc, 0.095 * fc),
                 rot=(-8, 12 * s, 0), seg=10, aneis=8)
    # Rabinho de algodão.
    p.esfera('cauda', 'claro', (0, L * 1.18, hc + 0.03), (0.045, 0.04, 0.045), seg=12, aneis=7)

    p.esqueleto_quadrupede(
        hc=hc, anca=(ax, ay, hc - 0.03), ombro=(ox, oy, hc - 0.04),
        pescoco=(0, cc.y + 0.05, cc.z - 0.06), topo=(0, cc.y, cc.z + 0.12 * fc),
        cauda=((0, L * 1.05, hc + 0.02), (0, L * 1.25, hc + 0.05)),
        orelha=(base, ponta),
    )
    p.finalizar()

    # Truque: o pulo de alegria do coelho, alto e com um giro no ar.
    def truque(t):
        u = suave(0.12, 0.82, t)
        no_ar = math.sin(math.pi * u)
        return {
            'raiz': {'loc': (0, 0, 0.26 * no_ar), 'rot': [('Z', 360 * u), ('Y', 14 * no_ar)]},
            'corpo': {'rot': [('X', -10 * no_ar)]},
            'pata_te': {'rot': [('X', 35 * no_ar)]},
            'pata_td': {'rot': [('X', 35 * no_ar)]},
            'pata_fe': {'rot': [('X', -20 * no_ar)]},
            'pata_fd': {'rot': [('X', -20 * no_ar)]},
            'orelha_esq': {'rot': [('X', 18 * no_ar), ('Y', -10 * no_ar)]},
            'orelha_dir': {'rot': [('X', 18 * no_ar), ('Y', 10 * no_ar)]},
        }
    clipes_quadrupede(p, {'passo': 30, 'galope': 40, 'cauda': 8, 'orelha': 6, 'sentar': 34, 'saltitante': True,
                          'pulo': 0.14}, truque=(36, truque))
    return p


# --------------------------------------------------------------------- porquinho-da-índia
def porquinho(pid, filhote):
    fc, fo = (1.22, 1.2) if filhote else (1.0, 1.0)
    p = Bicho(pid, paleta('porquinho'), escala=0.7 if filhote else 1.0, alvo=3000)
    L = 0.19 * (0.9 if filhote else 1.0)
    hc = 0.12
    ox, oy = 0.062, -L * 0.58
    ax, ay = 0.07, L * 0.58

    def pao(v):
        # Formato de pãozinho: costas redondas e barriga reta.
        return (v.x, v.y, v.z if v.z > 0 else v.z * 0.75)
    corpo = p.esfera('corpo', 'pelo', (0, 0.0, hc), (0.135, L, 0.115), deformar=pao, seg=22, aneis=12)
    # Manchas do tricolor: caramelo no traseiro e preta no lombo.
    p.casca('corpo', 'mancha', 'mancha', (0, 0.0, hc), (0.135, L, 0.115), deformar=pao, folga=0.003,
            espessura=0.004, manter=lambda q: q.y > L * 0.25 and q.z > hc - 0.05)
    p.casca('corpo', 'escuro', 'escuro', (0, 0.0, hc), (0.135, L, 0.115), deformar=pao, folga=0.004,
            espessura=0.004, manter=lambda q: abs(q.y + 0.01) < L * 0.3 and q.z > hc + 0.04 and q.x < 0.05)
    del corpo
    for s, lado in ((1, 'e'), (-1, 'd')):
        p.esfera(f'pata_f{lado}', 'pe', (ox * s, oy - 0.01, 0.018), (0.027, 0.034, 0.02), seg=10, aneis=6)
        p.esfera(f'pata_t{lado}', 'pe', (ax * s, ay - 0.01, 0.018), (0.029, 0.038, 0.02), seg=10, aneis=6)

    cc = Vector((0, -L - 0.01 * fc, hc + 0.035 * fc))
    cab = p.esfera('cabeca', 'pelo', tuple(cc), (0.105 * fc, 0.1 * fc, 0.095 * fc), seg=18, aneis=10)
    # Mancha caramelo em volta de um olho, o jeito de porquinho tricolor.
    p.casca('cabeca', 'mancha', 'mancha', tuple(cc), (0.105 * fc, 0.1 * fc, 0.095 * fc), folga=0.003,
            espessura=0.004, manter=lambda q: q.x > 0.012 * fc and q.z > cc.z - 0.03 * fc and q.y < cc.y + 0.01 * fc)
    foc = p.esfera('cabeca', 'pelo', (0, cc.y - 0.07 * fc, cc.z - 0.03 * fc), (0.06 * fc, 0.045 * fc, 0.045 * fc),
                   seg=12, aneis=7)
    rosto = [cab, foc]
    p.no_rosto('cabeca', 'nariz', rosto, 0, cc.z - 0.02 * fc, (0.016 * fc, 0.011, 0.011 * fc), afunda=0.3,
               seg=10, aneis=6)
    boca_w(p, rosto, cc.z - 0.045 * fc, 0.02 * fc, 0.02 * fc)
    olhos(p, rosto, 0.055 * fc, cc.z + 0.02 * fc, (0.026 * fo * fc, 0.018 * fc, 0.03 * fo * fc), afunda=0.2)
    bochechas(p, rosto, 0.075 * fc, cc.z - 0.03 * fc, 0.022 * fc)
    # Orelhinhas de pétala, caídas para o lado.
    base = (0.075 * fc, cc.y + 0.035 * fc, cc.z + 0.06 * fc)
    ponta = (0.11 * fc, cc.y + 0.04 * fc, cc.z + 0.085 * fc)
    for s, osso in ((1, 'orelha_esq'), (-1, 'orelha_dir')):
        p.esfera(osso, 'orelha', (0.088 * fc * s, base[1], base[2] + 0.008), (0.03 * fc, 0.009 * fc, 0.024 * fc),
                 rot=(0, -40 * s, 0), seg=12, aneis=7)

    p.esqueleto_quadrupede(
        hc=hc, anca=(ax, ay, 0.06), ombro=(ox, oy, 0.06),
        pescoco=(0, cc.y + 0.06, cc.z - 0.05), topo=(0, cc.y, cc.z + 0.1 * fc),
        orelha=(base, ponta),
    )
    p.finalizar()

    # Truque: pulinhos de pipoca (sai do chão de repente e torce o corpo, várias vezes).
    def truque(t):
        k = (t * 3) % 1.0
        no_ar = math.sin(math.pi * suave(0.0, 0.7, k)) if k < 0.7 else 0.0
        lado = 1 if int(t * 3) % 2 == 0 else -1
        return {
            'raiz': {'loc': (0, 0, 0.09 * no_ar), 'rot': [('Z', 22 * lado * no_ar)]},
            'corpo': {'rot': [('Y', 10 * lado * no_ar)]},
            'cabeca': {'rot': [('X', -12 * no_ar)]},
            'orelha_esq': {'rot': [('X', 20 * no_ar)]},
            'orelha_dir': {'rot': [('X', 20 * no_ar)]},
        }
    clipes_quadrupede(p, {'passo': 30, 'galope': 40, 'orelha': 8, 'sentar': 22, 'pulo': 0.08}, truque=(36, truque))
    return p


BICHOS = {}
for especie, fn in (('cachorro', cachorro), ('gato', gato), ('coelho', coelho), ('porquinho', porquinho)):
    BICHOS[f'{especie}-filhote'] = (fn, True)
    BICHOS[especie] = (fn, False)


if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        fn, filhote = BICHOS[pid]
        fn(pid, filhote).exportar()
