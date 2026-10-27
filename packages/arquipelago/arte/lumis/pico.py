"""Lumis do Pico Gelado: Gelinho (comum) e Cristal (raro).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/pico.py   # grava src/assets/lumis/{gelinho,cristal}.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_lumis as L  # noqa: E402
from mathutils import Vector  # noqa: E402


def gelinho():
    L.comecar({
        'corpo': ('#93ddff', 0.08, '#bdeeff', 0.1, 1),
        'corpo2': ('#ffffff', 0.85, None, 0, 1),
        'detalhe': ('#7cc8ee', 0.3, None, 0, 1),
        'luz': ('#a8f6ff', 0.3, '#5eeaff', 6.0, 1),
        'pupila': ('#13263a', 0.25, None, 0, 1),
        'bochecha': ('#ff9fc0', 0.8, None, 0, 1),
    })
    # Cubo de gelo de quinas bem redondas (superelipsoide), translúcido.
    C = Vector((0, 0, 0.5))
    casca = L.bola('corpo', 1, (0, 0, 0), seg=28, aneis=18)

    def cubo(v):
        f = lambda c: math.copysign(abs(c) ** 0.55, c)  # noqa: E731
        return C + Vector((f(v.x) * 0.42, f(v.y) * 0.4, f(v.z) * 0.43))

    L.deformar(casca, cubo)
    # A neve em cima, fofa, escorrendo um pouco pelas beiradas.
    lobos = [(math.cos(2 * math.pi * i / 22) * (1 + 0.09 * math.cos(5 * 2 * math.pi * i / 22) + 0.05 * math.sin(3 * 2 * math.pi * i / 22)),
              math.sin(2 * math.pi * i / 22) * (1 + 0.09 * math.cos(5 * 2 * math.pi * i / 22) + 0.05 * math.sin(3 * 2 * math.pi * i / 22)))
             for i in range(22)]
    neve = L.decalque(casca, 'corpo2', (0, 0), (0.41, 0.39), forma=lobos, alto=0.01, bojo=0.07, aneis=4,
                      direcao=(0, 0, -1), cima=(0, 1, 0), nome='neve')
    rosto, olho = L.rosto(casca, 0.15, 0.56, 0.088, 0.11, boca_z=0.42, boca_larg=0.055, boca_alt=0.04,
                          bochecha_x=0.27, bochecha_z=0.44)
    cor = L.coracao(casca, 0.27, 0.058)
    # Os riscos de brilho do gelo, de desenho animado.
    brilhos = [L.decalque(casca, 'corpo2', (-0.3, 0.72), (0.022, 0.075), rot=-28, alto=0.004, aneis=1),
               L.decalque(casca, 'corpo2', (-0.25, 0.62), (0.016, 0.035), rot=-28, alto=0.004, aneis=1)]
    corpo = L.juntar([casca, neve, *rosto, cor, *brilhos], 'corpo', pivo=(0, 0, 0.07))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.4, 0.56))

    # Uma bolinha de neve no alto, que balança.
    topete = L.juntar([L.bola('corpo2', 0.075, (0.06, 0.02, 0.99), seg=10, aneis=7),
                       L.bola('corpo2', 0.05, (-0.02, 0.05, 0.97), seg=8, aneis=6)], 'topete', pivo=(0.03, 0.02, 0.94))
    lumi = L.Lumi('gelinho', corpo, olhos, bracos=L.bracinhos('detalhe', 0.4, 0.38),
                  pes=L.pezinhos('detalhe', 0.17, tam=(0.11, 0.13, 0.065)), enfeites=[(topete, 10, 0.1)],
                  pulo=0.26, passo=0.06, peso=1.1)
    lumi.animar()
    L.exportar('gelinho', {'familia': 'pico', 'raridade': 'comum'})


def floco_de_neve(material, raio, pos, esp=0.016):
    """Floco de neve de seis braços com raminhos, de frente para -Y."""
    pecas = []
    cx, cy, cz = pos
    for i in range(6):
        a = math.pi / 2 + 2 * math.pi * i / 6
        d = Vector((math.cos(a), 0, math.sin(a)))
        n = Vector((-d.z, 0, d.x))
        c = Vector(pos)
        pecas.append(L.tubo(material, [c, c + d * raio], [esp, esp * 0.8], seg=4))
        for k, (t, comp) in enumerate(((0.45, 0.32), (0.72, 0.22))):
            b = c + d * raio * t
            for s in (1, -1):
                pecas.append(L.tubo(material, [b, b + (d * 0.55 + n * s).normalized() * raio * comp], [esp * 0.8, esp * 0.6], seg=4))
        pecas.append(L.bola(material, esp * 1.6, c + d * raio, seg=6, aneis=4))
    pecas.append(L.bola(material, esp * 3, Vector(pos), (1, 0.6, 1), seg=8, aneis=5))
    return L.juntar(pecas, 'floco')


def cristal():
    L.comecar({
        'corpo': ('#a3bcff', 0.06, '#b8ccff', 0.14, 1),
        'corpo2': ('#7b8ff0', 0.1, '#8ea2ff', 0.12, 1),
        'luz': ('#c9fbff', 0.25, '#8ff4ff', 9.0, 1),
        'pupila': ('#18183a', 0.25, None, 0, 1),
        'bochecha': ('#ffa6d0', 0.8, None, 0, 1),
        'faisca': ('#f2fbff', 0.3, '#bdf3ff', 6.0, 1),
    })
    # Uma pedra de gelo lapidada: seis faces, ponta em cima e embaixo, facetas retas.
    casca = L.torneado('corpo', [(0.41, 0.3), (0.43, 0.5), (0.39, 0.7), (0.25, 0.9), (0, 1.04)],
                       seg=8, rot=(0, 0, 22.5), liso=False, fechar=False)
    coroa = L.torneado('corpo2', [(0, 0.06), (0.26, 0.14), (0.41, 0.3)], seg=8, rot=(0, 0, 22.5), liso=False, fechar=False)
    casca = L.juntar([casca, coroa], 'casca')
    rosto, olho = L.rosto(casca, 0.135, 0.56, 0.082, 0.105, boca_z=0.43, boca_larg=0.05, boca_alt=0.038,
                          bochecha_x=0.25, bochecha_z=0.45)
    cor = L.coracao(casca, 0.29, 0.055)
    # Lascas de gelo nas costas, para o contorno ficar de cristal.
    lascas = [L.cone('corpo2', r, h, p, rot=rt, seg=5, liso=False) for r, h, p, rt in (
        (0.09, 0.26, (0.16, 0.24, 0.72), (-35, 25, 0)), (0.075, 0.2, (-0.18, 0.22, 0.66), (-35, -30, 0)),
        (0.06, 0.16, (0.02, 0.3, 0.5), (-60, 0, 0)))]
    corpo = L.juntar([casca, *rosto, cor, *lascas], 'corpo', pivo=(0, 0, 0.08))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.38, 0.56))

    floco = floco_de_neve('luz', 0.15, (0, 0, 0))
    floco = L.juntar([floco], 'floco', pivo=(0, 0, 0))
    floco.location = (0, 0.02, 1.26)

    bracos = []
    for lado in (1, -1):
        b = L.icobola('corpo2', 1, (lado * 0.45, -0.02, 0.4), (0.055, 0.055, 0.1), sub=1, rot=(0, lado * 25, 0), liso=False)
        bracos.append((L.juntar([b], f'braco-{"e" if lado > 0 else "d"}', pivo=(lado * 0.4, -0.02, 0.47)), lado))
    pes = []
    for lado, fase in ((1, 0.0), (-1, 0.5)):
        p = L.icobola('corpo2', 1, (lado * 0.15, -0.04, 0.06), (0.1, 0.12, 0.065), sub=1, liso=False)
        pes.append((L.juntar([p], f'pe-{"e" if lado > 0 else "d"}', pivo=(lado * 0.15, -0.04, 0.06)), lado, fase))
    roda = L.faiscas(0.44, 1.2)
    lumi = L.Lumi('cristal', corpo, olhos, bracos=bracos, pes=pes, enfeites=[(floco, 14, 0.2)], faiscas=roda,
                  pulo=0.3, passo=0.065)
    lumi.animar()
    L.exportar('cristal', {'familia': 'pico', 'raridade': 'raro'})


if __name__ == '__main__':
    gelinho()
    cristal()
