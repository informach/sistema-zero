"""Lumis da Vila Doce: Quindim (comum) e Brigadeiro (raro).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/vila_doce.py   # grava src/assets/lumis/{quindim,brigadeiro}.glb
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_lumis as L  # noqa: E402
from mathutils import Vector  # noqa: E402


def quindim():
    L.comecar({
        'corpo': ('#ffc61f', 0.14, None, 0, 1),
        'corpo2': ('#f7e6b5', 0.9, None, 0, 1),
        'detalhe': ('#fffdf6', 0.8, None, 0, 1),
        'luz': ('#fff3a0', 0.35, '#ffcf3a', 6.0, 1),
        'pupila': ('#3a220c', 0.25, None, 0, 1),
        'boca': ('#b8432c', 0.6, None, 0, 1),
    })
    # O doce desenformado: a cúpula amarela brilhante em cima da base de coco ralado.
    cupula = L.torneado('corpo', [(0.465, 0.25), (0.48, 0.34), (0.47, 0.45), (0.44, 0.56), (0.385, 0.67),
                                  (0.3, 0.76), (0.19, 0.82), (0.08, 0.845), (0, 0.85)], seg=28)
    base = L.torneado('corpo2', [(0, 0.09), (0.36, 0.09)] + [(0.43 + 0.06 * math.sin(math.pi * k / 9), 0.1 + 0.02 * k)
                                                              for k in range(10)] + [(0.44, 0.29)], seg=36)
    rng = random.Random(7)

    def coco(v):
        # Coco ralado: a base fica toda granulada, sem mexer no fundo reto.
        if 0.1 < v.z < 0.28:
            r = Vector((v.x, v.y, 0))
            if r.length > 1e-6:
                v += r.normalized() * rng.uniform(-0.012, 0.016)
                v.z += rng.uniform(-0.006, 0.006)
        return v

    L.deformar(base, coco)
    rosto, olho = L.rosto(cupula, 0.155, 0.6, 0.09, 0.112, boca_z=0.465, boca_larg=0.06, boca_alt=0.045,
                          bochecha_x=0.27, bochecha_z=0.485)
    cor = L.coracao(cupula, 0.355, 0.052)
    corpo = L.juntar([cupula, base, *rosto, cor], 'corpo', pivo=(0, 0, 0.09))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.42, 0.6))

    # Touca de cozinheiro, meio de lado.
    touca = [L.torneado('detalhe', [(0.17, 0.0), (0.175, 0.09), (0.17, 0.11)], seg=20, fechar=False)]
    for i in range(5):
        a = 2 * math.pi * i / 5
        touca.append(L.bola('detalhe', 0.105, (0.095 * math.cos(a), 0.095 * math.sin(a), 0.19), (1, 1, 0.8), seg=9, aneis=6))
    touca.append(L.bola('detalhe', 0.12, (0, 0, 0.215), (1, 1, 0.75), seg=9, aneis=6))
    touca = L.juntar(touca, 'touca')
    touca.rotation_euler = (math.radians(-8), math.radians(14), 0)
    touca.location = (0.08, 0.03, 0.8)
    touca = L.juntar([touca], 'touca', pivo=(0.08, 0.03, 0.8))

    lumi = L.Lumi('quindim', corpo, olhos, bracos=L.bracinhos('corpo', 0.44, 0.42), pes=L.pezinhos('corpo2', 0.19, y=-0.22, z=0.05),
                  enfeites=[(touca, 7, 0.15)], pulo=0.28, passo=0.065, peso=1.15)
    lumi.animar()
    L.exportar('quindim', {'familia': 'vila-doce', 'raridade': 'comum'})


def brigadeiro():
    L.comecar({
        'corpo': ('#5e3524', 0.7, None, 0, 1),
        'corpo2': ('#ff5f8f', 0.8, None, 0, 1),
        'detalhe': ('#ff8fc8', 0.5, None, 0, 1),
        'detalhe2': ('#59d9e8', 0.5, None, 0, 1),
        'detalhe3': ('#fffaf0', 0.5, None, 0, 1),
        'luz': ('#fff1a0', 0.35, '#ffcb3a', 6.0, 1),
        'pupila': ('#1a0f0a', 0.25, None, 0, 1),
        'olho': ('#ffffff', 0.3, None, 0, 1),
        'bochecha': ('#ff8fa8', 0.8, None, 0, 1),
    })
    C, R = Vector((0, 0, 0.58)), 0.4
    bola = L.bola('corpo', R, C, (1, 1, 0.95), seg=24, aneis=14)
    # Forminha de papel pregueada: o brigadeiro senta dentro dela.
    pregas = lambda a, z: 1 + 0.045 * math.cos(18 * a)  # noqa: E731
    forminha = L.torneado('corpo2', [(0.26, 0.04), (0.31, 0.13), (0.38, 0.27), (0.44, 0.42), (0.425, 0.43),
                                     (0.36, 0.27)], seg=36, onda=pregas, fechar=False)
    fundo = L.torneado('corpo2', [(0, 0.04), (0.26, 0.04)], seg=36, onda=pregas, fechar=False)
    rosto, olho = L.rosto(bola, 0.145, 0.7, 0.085, 0.107, boca_z=0.575, boca_larg=0.06, boca_alt=0.046,
                          bochecha_x=0.25, bochecha_z=0.59)
    cor = L.coracao(forminha, 0.25, 0.065)

    # Granulado colorido; os dourados acendem (o granulado de luz).
    granulado = []
    rng = random.Random(3)
    n = 54
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n
        a = math.pi * (3 - math.sqrt(5)) * i
        d = Vector((math.sqrt(1 - z * z) * math.cos(a), math.sqrt(1 - z * z) * math.sin(a), z))
        p = C + Vector((d.x * R, d.y * R, d.z * R * 0.95))
        if p.z < 0.47:
            continue
        frente = d.y < -0.55 and abs(d.x) < 0.62 and 0.5 < p.z < 0.84
        if frente:
            continue
        tangente = d.cross(Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))).normalized()
        meio = p + d * 0.008
        material = ('luz', 'detalhe', 'detalhe2', 'detalhe3')[i % 4]
        granulado.append(L.tubo(material, [meio - tangente * 0.024, meio + tangente * 0.024], 0.011, seg=5))
    corpo = L.juntar([bola, forminha, fundo, *rosto, cor, *granulado], 'corpo', pivo=(0, 0, 0.04))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.38, 0.7))

    # Chapeuzinho de festa com pompom de luz.
    chapeu = [L.cone('detalhe2', 0.1, 0.24, (0, 0, 0), seg=16)]
    chapeu.append(L.toro('detalhe', 0.095, 0.018, (0, 0, 0.03), seg=14, rseg=5))
    chapeu.append(L.toro('detalhe3', 0.065, 0.015, (0, 0, 0.11), seg=12, rseg=5))
    chapeu.append(L.bola('luz', 0.04, (0, 0, 0.25), seg=10, aneis=6))
    chapeu = L.juntar(chapeu, 'chapeu')
    chapeu.rotation_euler = (math.radians(-6), math.radians(-20), 0)
    chapeu.location = (-0.12, 0.02, 0.92)
    chapeu = L.juntar([chapeu], 'chapeu', pivo=(-0.12, 0.02, 0.92))

    roda = L.faiscas(0.4, 1.3)
    lumi = L.Lumi('brigadeiro', corpo, olhos, bracos=L.bracinhos('corpo', 0.37, 0.55, tam=(0.06, 0.06, 0.1)),
                  pes=L.pezinhos('corpo', 0.14, y=-0.2, z=0.045, tam=(0.085, 0.11, 0.05)),
                  enfeites=[(chapeu, 12, 0.1)], faiscas=roda, pulo=0.34, passo=0.07)
    lumi.animar()
    L.exportar('brigadeiro', {'familia': 'vila-doce', 'raridade': 'raro'})


if __name__ == '__main__':
    quindim()
    brigadeiro()
