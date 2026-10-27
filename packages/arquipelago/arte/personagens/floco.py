"""Floco, o pinguim músico do Pico Gelado.

Cabeça grande azul-marinho com o rosto branco em coração, bico e pés laranja, barriga branca e as
nadadeiras. De músico: cachecol de tricô listrado com as pontas soltas e o cavaquinho pendurado
na nadadeira esquerda. Anda gingando.

  /tmp/blender-venv/bin/python arte/personagens/floco.py   # grava src/assets/personagens/floco.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_personagens import Personagem, clipes_chibi, orientar  # noqa: E402
from mathutils import Vector  # noqa: E402

PALETA = {
    'penas': ('#28324a', 0.7),
    'branco': ('#f6f8fc', 0.85),
    'bico': ('#ffa23c', 0.5),
    'pe': ('#ff9a35', 0.6),
    'bochecha': ('#ff9fb0', 0.9),
    'cachecol': ('#e84a5f', 0.85),
    'listra': ('#fff4e0', 0.85),
    'madeira': ('#dc9a52', 0.5),
    'braco_do_cavaco': ('#7b4a2b', 0.5),
    'boca_do_cavaco': ('#3a2416', 0.6),
    'corda': ('#f2f2f2', 0.3),
    'olho': ('#14161c', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}


def construir():
    p = Personagem('floco', PALETA)

    # Pés laranja com três dedos, quase sem perna.
    for s in (1, -1):
        osso = f'perna_{"esq" if s > 0 else "dir"}'
        p.capsula(osso, 'penas', (0.14 * s, 0.02, 0.24), (0.15 * s, 0.0, 0.1), 0.08, 0.075)
        p.esfera(osso, 'pe', (0.15 * s, -0.06, 0.04), (0.1, 0.13, 0.04), seg=12, aneis=7)
        for k in (-1, 0, 1):
            p.esfera(osso, 'pe', (0.15 * s + 0.055 * k, -0.17, 0.035), (0.04, 0.06, 0.03),
                     rot=(0, 0, -20 * k), seg=8, aneis=5)

    # Corpo de pera com a barriga branca embutida (a borda fica limpa onde as formas se cruzam).
    def pera(v):
        f = 1.0 + 0.16 * max(0.0, -v.z)
        return (v.x * f, v.y * f, v.z)
    p.esfera('tronco', 'penas', (0, 0.03, 0.52), (0.33, 0.3, 0.38), deformar=pera, seg=20, aneis=11)
    p.esfera('tronco', 'branco', (0, -0.06, 0.48), (0.27, 0.25, 0.33), deformar=pera, seg=18, aneis=10)
    # Rabinho.
    p.esfera('tronco', 'penas', (0, 0.3, 0.2), (0.12, 0.1, 0.05), rot=(-30, 0, 0), seg=10, aneis=6)

    # Nadadeiras achatadas.
    for s in (1, -1):
        osso = f'braco_{"esq" if s > 0 else "dir"}'
        ombro, ponta = (0.29 * s, 0.0, 0.76), (0.44 * s, -0.04, 0.42)
        meio = tuple((a + b) / 2 for a, b in zip(ombro, ponta))

        def nadadeira(v):
            f = 1 - 0.5 * max(0.0, -v.z) ** 1.5
            return (v.x * f, v.y, v.z)
        p.esfera(osso, 'penas', meio, (0.085, 0.035, 0.2), rot=orientar(ombro, ponta), seg=14, aneis=9,
                 deformar=nadadeira)

    # Cabeça grande e o rosto branco em coração (duas formas brancas embutidas).
    cab = p.esfera('cabeca', 'penas', (0, -0.01, 1.12), (0.4, 0.38, 0.37), seg=24, aneis=13)
    rosto = [cab]
    for s in (1, -1):
        rosto.append(p.esfera('cabeca', 'branco', (0.13 * s, -0.2, 1.1), (0.2, 0.2, 0.235), seg=16, aneis=10))
    p.esfera('cabeca', 'branco', (0, -0.24, 0.98), (0.2, 0.15, 0.13), seg=14, aneis=8)
    # Bico laranja.
    py = p.superficie(rosto, 0, 1.06)[0].y
    p.torno('cabeca', 'bico', [(0.075, 0), (0.07, 0.03), (0.04, 0.08), (0, 0.11)],
            de=(0, py + 0.03, 1.06), ate=(0, py - 0.2, 1.03), seg=12, escala=(1.25, 0.8))
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.15 * s, 1.18, (0.065, 0.04, 0.08), afunda=0.2)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.24 * s, 1.04, (0.062, 0.03, 0.038), afunda=0.6, seg=10, aneis=6)

    # Cachecol de tricô: a volta no pescoço com gomos e as duas pontas listradas caindo.
    p.toro('tronco', 'cachecol', (0, 0.0, 0.82), 0.25, 0.065, rot=(6, 0, 0), seg=22, rseg=8,
           escala=(1, 0.95, 1))
    for ang in range(0, 360, 30):
        a = math.radians(ang)
        p.esfera('tronco', 'listra', (0.25 * math.cos(a), 0.25 * math.sin(a) * 0.95, 0.82 + 0.025 * math.sin(a)),
                 (0.02, 0.02, 0.067), rot=(0, 0, ang), seg=6, aneis=4)
    for k, (x0, giro, comp) in enumerate(((0.12, -8, 0.3), (0.2, 6, 0.24))):
        topo = Vector((x0, -0.28, 0.78))
        base = topo + Vector((0.02 * k, -0.04 - 0.02 * k, -comp))
        rot = orientar(topo, base)
        meio = (topo + base) / 2
        p.caixa('tronco', 'cachecol', tuple(meio), (0.1, 0.035, comp), rot=rot, bisel=0.012)
        for t in (0.55, 0.8):
            c = topo + (base - topo) * t
            p.caixa('tronco', 'listra', tuple(c + Vector((0, -0.002, 0))), (0.104, 0.039, 0.035), rot=rot, bisel=0.01,
                    seg=8, aneis=4)
        for j in range(4):
            c = base + Vector((-0.035 + 0.023 * j, 0, -0.025))
            p.capsula('tronco', 'cachecol', tuple(c + Vector((0, 0, 0.02))), tuple(c), 0.008, 0.008, seg=5)

    # Cavaquinho pendurado pela mão esquerda: braço na mão, corpo de oito para baixo.
    mao = Vector((0.44, -0.07, 0.42))
    pe = mao + Vector((0.05, -0.08, -0.42))
    rot = orientar(pe, mao, frente=(0.3, -1, 0))
    eixo = (mao - pe).normalized()
    p.caixa('braco_esq', 'braco_do_cavaco', tuple(mao + eixo * 0.03), (0.035, 0.022, 0.26), rot=rot, bisel=0.008)
    p.caixa('braco_esq', 'braco_do_cavaco', tuple(mao + eixo * 0.16), (0.05, 0.022, 0.07), rot=rot, bisel=0.01)
    for t, r in ((0.05, 0.095), (0.18, 0.075)):
        c = pe + eixo * t
        p.esfera('braco_esq', 'madeira', tuple(c), (r, 0.035, r), rot=rot, seg=16, aneis=8)
    frente = Vector((0.3, -1, 0)).normalized()
    p.esfera('braco_esq', 'boca_do_cavaco', tuple(pe + eixo * 0.12 + frente * 0.032), (0.026, 0.006, 0.026),
             rot=rot, seg=10, aneis=5)
    for j in range(4):
        lado = eixo.cross(frente).normalized() * (-0.012 + 0.008 * j)
        a = pe + eixo * 0.02 + frente * 0.037 + lado
        b = mao + eixo * 0.13 + frente * 0.013 + lado
        p.tubo('braco_esq', 'corda', [tuple(a), tuple(b)], 0.0022, seg=3, tampa=False)

    p.esqueleto_chibi(
        quadril=0.28, pescoco=0.82, topo=1.6,
        ombro=(0.29, 0.0, 0.76), mao=(0.44, -0.04, 0.42),
        anca=(0.14, 0.02, 0.24), pe=(0.15, -0.02, 0.03),
        cauda=((0, 0.26, 0.24), (0, 0.4, 0.14)),
    )
    p.finalizar()
    clipes_chibi(p, {'ginga': 10, 'passo': 16, 'braco': 18, 'abre': 10, 'asa': True, 'cauda': 6})
    return p


if __name__ == '__main__':
    construir().exportar()
