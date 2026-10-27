"""Bento, o tamanduá confeiteiro da Vila Doce.

Focinho comprido que desce em curva, olhinhos pequenos, a faixa preta com as bordas brancas que
atravessa o ombro (a marca do tamanduá-bandeira), braços claros com a pulseira preta e o rabão
de pincel. De confeiteiro: chapéu alto com pregas, avental com debrum rosa e bolso, e o batedor
de arame na mão esquerda.

  /tmp/blender-venv/bin/python arte/personagens/bento.py   # grava src/assets/personagens/bento.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_personagens import TAU, Personagem, clipes_chibi  # noqa: E402
from mathutils import Quaternion, Vector  # noqa: E402

PALETA = {
    'pelo': ('#9a8573', 0.9),
    'claro': ('#ece3d4', 0.9),
    'faixa': ('#2b2522', 0.8),
    'nariz': ('#231d1a', 0.4),
    'boca': ('#3a2c26', 0.6),
    'bochecha': ('#f4a0a0', 0.9),
    'unha': ('#f3ead8', 0.5),
    'chapeu': ('#fbfbf7', 0.75),
    'avental': ('#fff6e6', 0.8),
    'debrum': ('#ff8fab', 0.6),
    'metal': ('#cfd8e0', 0.25),
    'cabo': ('#ff8fab', 0.5),
    'olho': ('#1b1410', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}

CORPO = ((0, 0.03, 0.53), (0.33, 0.3, 0.36))


def construir():
    p = Personagem('bento', PALETA)

    for s in (1, -1):
        osso = f'perna_{"esq" if s > 0 else "dir"}'
        p.capsula(osso, 'pelo', (0.15 * s, 0.02, 0.3), (0.16 * s, 0.0, 0.09), 0.085, 0.09)
        p.esfera(osso, 'pelo', (0.16 * s, -0.05, 0.055), (0.105, 0.14, 0.062), seg=14, aneis=8)
        for k in (-1, 1):
            p.esfera(osso, 'unha', (0.16 * s + 0.04 * k, -0.18, 0.045), (0.024, 0.03, 0.02), seg=6, aneis=4)

    def pera(v):
        f = 1.0 + 0.1 * max(0.0, -v.z)
        return (v.x * f, v.y * f, v.z)
    centro, raios = CORPO
    p.esfera('tronco', 'pelo', centro, raios, deformar=pera, seg=20, aneis=11)

    # Faixa preta com bordas brancas, do peito ao meio das costas, inclinada.
    def faixa(a, b):
        inclinada = (0, 0.42, 1)
        return [((0, 0, 0.62 + b), inclinada), ((0, 0, 0.62 + a), tuple(-c for c in inclinada))]
    p.casca('tronco', 'claro', 'claro', centro, raios, cortes=faixa(-0.07, 0.11), espessura=0.006,
            folga=0.006, seg=22, aneis=12, deformar=pera)
    p.casca('tronco', 'faixa', 'faixa', centro, raios, cortes=faixa(-0.035, 0.075), espessura=0.006,
            folga=0.012, seg=22, aneis=12, deformar=pera)

    # Avental com debrum rosa, a alça no pescoço e o bolso com um coraçãozinho.
    p.casca('tronco', 'avental', 'debrum', centro, raios, espessura=0.018, folga=0.02, seg=22, aneis=12,
            deformar=pera, cortes=[((0, -0.06, 0), (0, 1, 0)), ((0, 0, 0.18), (0, 0, -1)),
                                   ((0, 0, 0.74), (0.25, 0, 1)), ((0, 0, 0.74), (-0.25, 0, 1)),
                                   ((0.27, 0, 0), (1, 0, 0)), ((-0.27, 0, 0), (-1, 0, 0))])
    p.toro('tronco', 'debrum', (0, 0.02, 0.84), 0.2, 0.016, rot=(8, 0, 0), seg=20, rseg=6, escala=(1, 1.05, 1))
    p.caixa('tronco', 'debrum', (0, -0.345, 0.38), (0.16, 0.03, 0.1), rot=(14, 0, 0), bisel=0.012)
    for s in (1, -1):
        p.esfera('tronco', 'avental', (0.018 * s, -0.364, 0.395), (0.022, 0.008, 0.02), rot=(14, 0, 40 * s), seg=8, aneis=5)
    p.esfera('tronco', 'avental', (0, -0.364, 0.378), (0.022, 0.008, 0.022), rot=(14, 0, 45), seg=4, aneis=3)

    # Braços claros com a pulseira preta e as garras.
    for s in (1, -1):
        osso = f'braco_{"esq" if s > 0 else "dir"}'
        p.capsula(osso, 'pelo', (0.28 * s, 0.0, 0.74), (0.33 * s, -0.02, 0.62), 0.074, 0.064)
        p.capsula(osso, 'claro', (0.335 * s, -0.022, 0.6), (0.37 * s, -0.04, 0.5), 0.079, 0.08)
        p.toro(osso, 'faixa', (0.365 * s, -0.04, 0.53), 0.075, 0.018, rot=(0, -15 * s, 0), seg=14, rseg=5)
        p.esfera(osso, 'claro', (0.38 * s, -0.05, 0.46), (0.085, 0.08, 0.085), seg=14, aneis=8)
        for k in (-1, 1):
            p.capsula(osso, 'unha', (0.38 * s + 0.03 * k, -0.1, 0.43), (0.385 * s + 0.035 * k, -0.13, 0.39), 0.016, 0.01, seg=6)

    # Cabeça e o focinho comprido, descendo em curva até o narizinho preto.
    cab = p.esfera('cabeca', 'pelo', (0, 0.0, 1.13), (0.35, 0.36, 0.33), seg=22, aneis=12)
    caminho = [(0, -0.12, 1.1), (0, -0.32, 1.05), (0, -0.5, 0.97), (0, -0.64, 0.88), (0, -0.72, 0.82)]
    p.tubo('cabeca', 'pelo', caminho, [0.24, 0.17, 0.115, 0.085, 0.07], seg=12)
    p.esfera('cabeca', 'nariz', (0, -0.735, 0.81), (0.07, 0.04, 0.062), rot=(-40, 0, 0), seg=12, aneis=8)
    p.tubo('cabeca', 'boca', [(-0.035, -0.69, 0.765), (0, -0.705, 0.758), (0.035, -0.69, 0.765)], 0.009, seg=5)
    for s in (1, -1):
        p.olho_no_rosto(s, cab, 0.2 * s, 1.21, (0.052, 0.035, 0.064), afunda=0.15)
        p.no_rosto('cabeca', 'bochecha', cab, 0.25 * s, 1.07, (0.065, 0.03, 0.04), afunda=0.6, seg=10, aneis=6)
        # Orelhas pequenas e redondas.
        p.esfera('cabeca', 'pelo', (0.25 * s, 0.1, 1.38), (0.075, 0.045, 0.07), rot=(0, 30 * s, 0), seg=10, aneis=6)
        p.esfera('cabeca', 'faixa', (0.25 * s, 0.085, 1.375), (0.045, 0.02, 0.042), rot=(0, 30 * s, 0), seg=10, aneis=6)

    # Chapéu alto de confeiteiro: faixa lisa e a copa fofa com pregas.
    perfil = [(0, 0), (0.24, 0), (0.24, 0.12), (0.26, 0.14), (0.32, 0.2), (0.35, 0.28),
              (0.33, 0.36), (0.25, 0.42), (0.12, 0.45), (0, 0.455)]
    p.torno('cabeca', 'chapeu', perfil, centro=(0, 0.06, 1.38), rot=(-10, 0, 0), seg=20,
            onda=lambda i, a: 1 + (0.06 * math.cos(8 * a) if i >= 3 else 0))

    # Batedor de arame na mão esquerda: cabo rosa e quatro arames em balão, que saem do cabo e
    # voltam para ele.
    base, ponta = Vector((0.4, -0.13, 0.45)), Vector((0.43, -0.4, 0.63))
    p.capsula('braco_esq', 'cabo', (0.395, -0.02, 0.4), tuple(base), 0.022, 0.026, seg=8)
    eixo = (ponta - base).normalized()
    comp = (ponta - base).length
    lado0 = eixo.cross(Vector((0, 0, 1))).normalized()
    for k in range(4):
        lado = Quaternion(eixo, math.radians(45 * k)) @ lado0
        pontos = []
        for i in range(13):
            a = TAU * i / 12
            ao_longo = comp * (1 - math.cos(a)) / 2
            largura = 0.075 * math.sin(a) * (0.35 + 0.65 * (1 - math.cos(a)) / 2)
            pontos.append(tuple(base + eixo * ao_longo + lado * largura))
        p.tubo('braco_esq', 'metal', pontos, 0.0055, seg=4, tampa=False)

    p.esqueleto_chibi(
        quadril=0.32, pescoco=0.82, topo=1.6,
        ombro=(0.28, 0.0, 0.74), mao=(0.38, -0.05, 0.46),
        anca=(0.15, 0.02, 0.3), pe=(0.16, -0.02, 0.04),
        cauda=((0, 0.28, 0.4), (0, 0.6, 0.95)),
    )

    # Rabão de pincel: alto, achatado de lado, com franja ondulada.
    def pincel(v):
        lon = math.atan2(v.z, v.y)
        f = 1 + 0.07 * math.sin(9 * lon) * (1 - abs(v.x))
        return (v.x * (0.8 + 0.2 * max(0.0, v.y)), v.y * f, v.z * f)
    p.esfera('cauda', 'pelo', (0, 0.48, 0.78), (0.11, 0.24, 0.42), rot=(-28, 0, 0), seg=20, aneis=12, deformar=pincel)
    p.finalizar()
    clipes_chibi(p, {'ginga': 3, 'passo': 26, 'abre': 4, 'cauda': 12})
    return p


if __name__ == '__main__':
    construir().exportar()
