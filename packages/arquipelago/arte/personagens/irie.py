"""Iriê, a arara-vermelha que tece o arco-íris na Ilha das Nuvens.

Vermelha, com o rosto branco em volta dos olhos, o bico grande e curvo (claro em cima, preto
embaixo), asas com a faixa amarela e as pontas azuis, e o rabo comprido. Carrega na asa esquerda
o tear de mão com o arco-íris pela metade e os fios esticados.

  /tmp/blender-venv/bin/python arte/personagens/irie.py   # grava src/assets/personagens/irie.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_personagens import Personagem, clipes_chibi, orientar  # noqa: E402
from mathutils import Vector  # noqa: E402

ARCO_IRIS = ('#ff5a5f', '#ff9f43', '#ffd93d', '#6bcb77', '#4d96ff', '#9b5de5')

PALETA = {
    'penas': ('#e8363c', 0.8),
    'amarelo': ('#ffcd3c', 0.8),
    'azul': ('#2f72d8', 0.75),
    'rosto': ('#fbf6f0', 0.9),
    'risco': ('#e9b7a6', 0.9),
    'bico': ('#f2e7d2', 0.45),
    'bico_baixo': ('#2a2420', 0.5),
    'pe': ('#8b8f99', 0.7),
    'bochecha': ('#ff9fb0', 0.9),
    'madeira': ('#c98c55', 0.55),
    'fio': ('#fff7ea', 0.6),
    'olho': ('#14110e', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}
for i, cor in enumerate(ARCO_IRIS):
    PALETA[f'arco{i}'] = (cor, 0.75)


def construir():
    p = Personagem('irie', PALETA)

    # Patinhas cinza com dedos para a frente e para trás.
    for s in (1, -1):
        osso = f'perna_{"esq" if s > 0 else "dir"}'
        p.capsula(osso, 'penas', (0.13 * s, 0.02, 0.26), (0.14 * s, 0.0, 0.12), 0.075, 0.05)
        a = Vector((0.14 * s, -0.01, 0.06))
        for d in ((0.04, -0.12, -0.03), (-0.04, -0.11, -0.03), (0.0, 0.1, -0.035)):
            p.capsula(osso, 'pe', tuple(a), tuple(a + Vector(d)), 0.03, 0.02, seg=8)

    # Corpo vermelho.
    p.esfera('tronco', 'penas', (0, 0.03, 0.52), (0.32, 0.3, 0.37), seg=20, aneis=11)

    # Rabo comprido: três penas vermelhas com a ponta azul.
    for k in (-1, 0, 1):
        base = Vector((0.05 * k, 0.24, 0.32))
        fim = base + Vector((0.09 * k, 0.32, -0.26 - 0.06 * (1 - abs(k))))
        meio = (base + fim) / 2
        p.esfera('cauda', 'penas', tuple(meio), (0.06, 0.025, (fim - base).length / 2 + 0.02),
                 rot=orientar(base, fim, frente=(0, 0, 1)), seg=10, aneis=8)
        ponta = base + (fim - base) * 0.88
        p.esfera('cauda', 'azul', tuple(ponta), (0.058, 0.026, 0.075), rot=orientar(base, fim, frente=(0, 0, 1)),
                 seg=10, aneis=6)

    # Asas: ombro vermelho, faixa amarela e as penas azuis da ponta.
    for s in (1, -1):
        osso = f'braco_{"esq" if s > 0 else "dir"}'
        ombro, ponta = Vector((0.28 * s, 0.02, 0.76)), Vector((0.43 * s, -0.04, 0.38))
        eixo = (ponta - ombro).normalized()
        rot = orientar(ombro, ponta)
        comp = (ponta - ombro).length
        p.esfera(osso, 'penas', tuple(ombro + eixo * comp * 0.3), (0.11, 0.05, 0.16), rot=rot, seg=14, aneis=8)
        p.esfera(osso, 'amarelo', tuple(ombro + eixo * comp * 0.55), (0.1, 0.045, 0.1), rot=rot, seg=12, aneis=7)
        lado = eixo.cross(Vector((0, -1, 0))).normalized()
        for k in (-1, 0, 1):
            base = ombro + eixo * comp * 0.62 + lado * 0.045 * k
            fim = ponta + eixo * (0.08 - 0.03 * abs(k)) + lado * 0.03 * k
            p.esfera(osso, 'azul', tuple((base + fim) / 2), (0.04, 0.032, (fim - base).length / 2 + 0.02),
                     rot=orientar(base, fim), seg=8, aneis=6)

    # Cabeça, o rosto branco com riscos e o bico curvo.
    cab = p.esfera('cabeca', 'penas', (0, 0.0, 1.13), (0.39, 0.38, 0.36), seg=24, aneis=13)
    rosto = [cab]
    for s in (1, -1):
        rosto.append(p.esfera('cabeca', 'rosto', (0.17 * s, -0.18, 1.14), (0.17, 0.2, 0.19), seg=14, aneis=9))
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.16 * s, 1.19, (0.062, 0.04, 0.076), afunda=0.15)
        for z in (1.07, 1.03):
            pts = [tuple(p.superficie(rosto, x * s, z)[0] + Vector((0, -0.003, 0))) for x in (0.12, 0.18, 0.24)]
            p.tubo('cabeca', 'risco', pts, 0.006, seg=4)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.27 * s, 1.0, (0.055, 0.03, 0.035), afunda=0.6, seg=10, aneis=6)
    py = p.superficie(rosto, 0, 1.1)[0].y
    # Bico de cima: grande, curvo, descendo em gancho; bico de baixo preto.
    gancho = [(0, py + 0.05, 1.14), (0, py - 0.06, 1.13), (0, py - 0.13, 1.07), (0, py - 0.15, 0.99), (0, py - 0.12, 0.93)]
    p.tubo('cabeca', 'bico', gancho, [0.12, 0.105, 0.08, 0.05, 0.014], seg=12)
    p.esfera('cabeca', 'bico_baixo', (0, py - 0.035, 0.985), (0.085, 0.075, 0.06), seg=12, aneis=8)
    # Topete de duas peninhas.
    for k, inc in ((-1, -14), (1, 10)):
        p.esfera('cabeca', 'penas', (0.03 * k, -0.05, 1.5), (0.035, 0.03, 0.1), rot=(-20, inc, 0), seg=8, aneis=6)

    # Tear de mão na asa esquerda: moldura de madeira, fios esticados e o arco-íris tecido até o meio.
    mao = Vector((0.44, -0.08, 0.38))
    c = mao + Vector((0.07, -0.08, 0.02))
    larg, alt = 0.24, 0.3
    rot = (0, 0, 20)
    giro = Vector((math.cos(math.radians(20)), math.sin(math.radians(20)), 0))
    for dz in (-alt / 2, alt / 2):
        p.caixa('braco_esq', 'madeira', tuple(c + Vector((0, 0, dz))), (larg + 0.04, 0.03, 0.03), rot=rot, bisel=0.01)
    for dx in (-larg / 2, larg / 2):
        p.caixa('braco_esq', 'madeira', tuple(c + giro * dx), (0.03, 0.03, alt), rot=rot, bisel=0.01)
    for i in range(7):
        x = -larg / 2 + 0.02 + (larg - 0.04) * i / 6
        p.tubo('braco_esq', 'fio', [tuple(c + giro * x + Vector((0, 0, -alt / 2))),
                                    tuple(c + giro * x + Vector((0, 0, alt / 2)))], 0.003, seg=3, tampa=False)
    for i in range(len(ARCO_IRIS)):
        z = -alt / 2 + 0.03 + i * 0.022
        p.caixa('braco_esq', f'arco{i}', tuple(c + Vector((0, 0, z))), (larg - 0.03, 0.016, 0.022), rot=rot, bisel=0.006,
                seg=8, aneis=4)

    p.esqueleto_chibi(
        quadril=0.3, pescoco=0.82, topo=1.6,
        ombro=(0.28, 0.02, 0.76), mao=(0.44, -0.05, 0.38),
        anca=(0.13, 0.02, 0.26), pe=(0.14, -0.02, 0.04),
        cauda=((0, 0.22, 0.34), (0, 0.5, 0.12)),
    )
    p.finalizar()
    clipes_chibi(p, {'ginga': 5, 'passo': 20, 'braco': 20, 'abre': 6, 'asa': True, 'cauda': 8})
    return p


if __name__ == '__main__':
    construir().exportar()
