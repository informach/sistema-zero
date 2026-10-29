"""Jade, a coruja dos fósseis e dos ninhos do Vale dos Dinos.

Coruja redonda verde-jade com o disco claro do rosto em coração, olhos grandes cor de âmbar, bico
curvo, tufos de orelha, peito com as penas em escama e asas com as pontas das penas. De
exploradora: chapéu de safári com a fita e a lupa de cabo de madeira na asa esquerda.

  /tmp/claude-0/blender-venv/bin/python arte/personagens/jade.py   # grava src/assets/personagens/jade.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_personagens import Personagem, clipes_chibi, orientar  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

PALETA = {
    'penas': ('#6aa98f', 0.85),
    'asa': ('#4c8a73', 0.85),
    'claro': ('#f3e8cf', 0.9),
    'peito': ('#cfe3c8', 0.9),
    'escama': ('#8fbfa8', 0.85),
    'bico': ('#f2a93b', 0.45),
    'pe': ('#f0b04a', 0.6),
    'bochecha': ('#f6a39a', 0.9),
    'chapeu': ('#dcc48f', 0.8),
    'fita': ('#7a5636', 0.7),
    'madeira': ('#8a5a34', 0.55),
    'latao': ('#e2b84a', 0.3),
    'lente': ('#bfe6f2', 0.08, '#e8fbff', 0.08),
    'iris': ('#f2a52f', 0.3),
    'olho': ('#14110e', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}


def construir():
    p = Personagem('jade', PALETA)

    # Patinhas com três garras.
    for s in (1, -1):
        osso = f'perna_{"esq" if s > 0 else "dir"}'
        p.capsula(osso, 'penas', (0.13 * s, 0.02, 0.26), (0.14 * s, 0.0, 0.1), 0.075, 0.06)
        for k in (-1, 0, 1):
            a = Vector((0.14 * s, -0.02, 0.07))
            b = a + Vector((0.06 * k, -0.13, -0.04))
            p.capsula(osso, 'pe', tuple(a), tuple(b), 0.03, 0.022, seg=8)

    # Corpo redondo com o peito claro de penas em escama.
    p.esfera('tronco', 'penas', (0, 0.03, 0.52), (0.34, 0.31, 0.37), seg=20, aneis=11)
    peito = p.esfera('tronco', 'peito', (0, -0.08, 0.5), (0.26, 0.24, 0.3), seg=18, aneis=10)
    for fila, (z, n) in enumerate(((0.62, 3), (0.5, 4), (0.38, 3), (0.27, 2))):
        for i in range(n):
            x = (i - (n - 1) / 2) * 0.1
            ponto, normal = p.superficie(peito, x, z)
            rot = Vector((0, -1, 0)).rotation_difference(normal).to_euler()
            rot = tuple(math.degrees(a) for a in rot)
            # Escama em "v": dois risquinhos inclinados.
            for lado in (1, -1):
                q = ponto + Vector((0.017 * lado, -0.004, 0.0))
                p.esfera('tronco', 'escama', tuple(q), (0.024, 0.008, 0.009), rot=rot,
                         seg=6, aneis=3)
                p.pecas['tronco'][-1].data.transform(
                    Matrix.Translation(q)
                    @ Matrix.Rotation(0.5 * lado, 4, normal)
                    @ Matrix.Translation(-q))

    # Asas com três pontas de pena.
    for s in (1, -1):
        osso = f'braco_{"esq" if s > 0 else "dir"}'
        ombro, ponta = (0.29 * s, 0.02, 0.76), (0.43 * s, -0.04, 0.38)
        meio = tuple((a + b) / 2 for a, b in zip(ombro, ponta))
        rot = orientar(ombro, ponta)
        p.esfera(osso, 'asa', meio, (0.11, 0.045, 0.21), rot=rot, seg=14, aneis=9)
        eixo = (Vector(ponta) - Vector(ombro)).normalized()
        lado = eixo.cross(Vector((0, -1, 0))).normalized()
        for k in (-1, 0, 1):
            base = Vector(ponta) - eixo * 0.06 + lado * 0.05 * k
            fim = base + eixo * (0.1 - 0.025 * abs(k)) + lado * 0.02 * k
            p.esfera(osso, 'asa', tuple((base + fim) / 2), (0.032, 0.03, 0.07), rot=orientar(base, fim), seg=8, aneis=6)

    # Cabeça redonda, disco do rosto em coração e os olhos grandes de âmbar.
    cab = p.esfera('cabeca', 'penas', (0, 0.0, 1.13), (0.41, 0.38, 0.37), seg=22, aneis=12)
    rosto = [cab]
    for s in (1, -1):
        rosto.append(p.esfera('cabeca', 'claro', (0.14 * s, -0.19, 1.13), (0.21, 0.21, 0.23), seg=14, aneis=9))
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.15 * s, 1.15, (0.1, 0.045, 0.105), afunda=0.12, iris=('iris', 0.95),
                        pupila=0.5, brilhos=((0.3, 0.32, 0.36), (-0.25, -0.3, 0.18)))
        p.no_rosto('cabeca', 'bochecha', rosto, 0.27 * s, 1.0, (0.06, 0.03, 0.036), afunda=0.6, seg=10, aneis=6)
    # Bico curvo entre os olhos.
    py = p.superficie(rosto, 0, 1.08)[0].y
    p.torno('cabeca', 'bico', [(0.055, 0), (0.05, 0.03), (0.03, 0.07), (0, 0.1)],
            de=(0, py + 0.02, 1.11), ate=(0, py - 0.05, 0.99), seg=10, escala=(0.9, 1.1))
    # Sobrancelhas de pena que viram os tufos.
    for s in (1, -1):
        p.esfera('cabeca', 'asa', (0.21 * s, -0.25, 1.37), (0.11, 0.035, 0.03), rot=(-15, 0, 18 * s), seg=10, aneis=6)
        p.esfera('cabeca', 'asa', (0.32 * s, -0.08, 1.45), (0.05, 0.05, 0.13), rot=(-10, 25 * s, 0), seg=10, aneis=7)

    # Chapéu de safári: copa redonda, fita e aba larga.
    copa = [(0, 0.27), (0.1, 0.262), (0.18, 0.23), (0.24, 0.16), (0.27, 0.07), (0.275, 0.0)]
    centro_chapeu = (0, 0.02, 1.43)
    p.torno('cabeca', 'chapeu', list(reversed(copa)), centro=centro_chapeu, rot=(-8, 0, 0), seg=20)
    p.torno('cabeca', 'fita', [(0.275, 0.0), (0.278, 0.01), (0.275, 0.055), (0.268, 0.065)],
            centro=centro_chapeu, rot=(-8, 0, 0), seg=20)
    p.torno('cabeca', 'chapeu', [(0.26, -0.012), (0.4, -0.06), (0.43, -0.075), (0.43, -0.06), (0.4, -0.045), (0.26, 0.01)],
            centro=centro_chapeu, rot=(-8, 0, 0), seg=22)

    # Lupa na asa esquerda: cabo de madeira, aro de latão e a lente clarinha.
    mao = Vector((0.44, -0.07, 0.38))
    topo = mao + Vector((0.04, -0.16, 0.24))
    p.capsula('braco_esq', 'madeira', tuple(mao + Vector((0, 0.02, -0.03))), tuple(mao + (topo - mao) * 0.45), 0.02, 0.018, seg=8)
    centro_lente = mao + (topo - mao) * 0.75
    normal = Vector((0.1, -1, 0.35)).normalized()
    rlente = tuple(math.degrees(a) for a in Vector((0, 0, 1)).rotation_difference(normal).to_euler())
    p.toro('braco_esq', 'latao', tuple(centro_lente), 0.075, 0.014, rot=rlente, seg=20, rseg=6)
    p.esfera('braco_esq', 'lente', tuple(centro_lente), (0.072, 0.072, 0.008), rot=rlente, seg=16, aneis=6)

    p.esqueleto_chibi(
        quadril=0.3, pescoco=0.82, topo=1.6,
        ombro=(0.29, 0.02, 0.76), mao=(0.44, -0.05, 0.38),
        anca=(0.13, 0.02, 0.26), pe=(0.14, -0.02, 0.04),
    )
    p.finalizar()
    clipes_chibi(p, {'ginga': 5, 'passo': 20, 'braco': 18, 'abre': 6, 'asa': True})
    return p


if __name__ == '__main__':
    construir().exportar()
