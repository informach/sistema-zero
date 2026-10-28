"""Lumis do Vale dos Dinos: Ovinho (comum) e Brotinho (raro).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/dinos.py   # grava src/assets/lumis/{ovinho,brotinho}.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_lumis as L  # noqa: E402
from mathutils import Vector  # noqa: E402


def _zigue(a, dentes):
    """Onda em zigue-zague (0 a 1) em volta do círculo: a borda da casca quebrada."""
    x = (a / (2 * math.pi) * dentes) % 1
    return 1 - abs(2 * x - 1)


def ovinho():
    L.comecar({
        'corpo': ('#6fd38b', 0.5, None, 0, 1),
        'corpo2': ('#fff3da', 0.6, None, 0, 1),
        'detalhe': ('#f2b45f', 0.6, None, 0, 1),
        'detalhe2': ('#ff8d4d', 0.5, None, 0, 1),
        'luz': ('#fff4a0', 0.35, '#ffd93a', 6.0, 1),
        'pupila': ('#18241a', 0.25, None, 0, 1),
    })
    C, R = Vector((0, 0, 0.68)), 0.38
    cabeca = L.bola('corpo', R, C, (1, 1.02, 0.97), seg=24, aneis=14)

    def focinho(v):
        # Um focinho redondinho na frente, embaixo dos olhos.
        d = v - C
        k = math.exp(-(((d.x) / 0.22) ** 2 + ((d.z + 0.1) / 0.16) ** 2)) * max(0.0, -d.y / R)
        return v + Vector((0, -0.05 * k, -0.01 * k))

    L.deformar(cabeca, focinho)
    rosto, olho = L.rosto(cabeca, 0.15, 0.79, 0.085, 0.108, boca_z=0.645, boca_larg=0.06, boca_alt=0.045,
                          bochecha_x=0.26, bochecha_z=0.67)
    dente = L.decalque(cabeca, 'olho', (0.025, 0.635), (0.013, 0.014), alto=0.0055, aneis=1, forma=L.forma_elipse(8))
    cor = L.coracao(cabeca, 0.555, 0.04)

    # A casca de baixo com a borda quebrada em zigue-zague e pintinhas.
    casca = L.torneado('corpo2', [(0, 0.04), (0.24, 0.06), (0.38, 0.15), (0.45, 0.28), (0.46, 0.4), (0.445, 0.5),
                                  (0.41, 0.49), (0.42, 0.4), (0.41, 0.28)], seg=40, fechar=False)

    def quebra(v):
        if v.z > 0.45:
            v.z += 0.08 * _zigue(math.atan2(v.y, v.x) + 0.2, 9)
        return v

    L.deformar(casca, quebra)
    pintas = []
    for u, z, r, dirx in ((-0.2, 0.3, 0.05, 0), (0.24, 0.2, 0.04, 0), (0.05, 0.12, 0.03, 0)):
        pintas.append(L.decalque(casca, 'detalhe', (u, z), (r, r * 0.85), alto=0.004, aneis=1))
    for u, z, r in ((0.1, 0.33, 0.05), (-0.2, 0.18, 0.04)):
        pintas.append(L.decalque(casca, 'detalhe', (u, z), (r, r * 0.85), alto=0.004, aneis=1, direcao=(0, -1, 0)))
    for u, z, r in ((0.0, 0.25, 0.045),):
        pintas.append(L.decalque(casca, 'detalhe', (u, z), (r, r), alto=0.004, aneis=1, direcao=(-1, 0, 0)))
        pintas.append(L.decalque(casca, 'detalhe', (u + 0.1, z + 0.1), (r * 0.8, r * 0.8), alto=0.004, aneis=1, direcao=(1, 0, 0)))
    # Os espinhos macios das costas.
    espinhos = [L.cone('detalhe2', r, h, p, rot=rt, seg=10, liso=True) for r, h, p, rt in (
        (0.06, 0.11, (0, 0.06, 1.03), (-12, 0, 0)), (0.065, 0.12, (0, 0.24, 0.98), (-48, 0, 0)),
        (0.055, 0.1, (0, 0.35, 0.86), (-80, 0, 0)))]
    corpo = L.juntar([cabeca, *rosto, dente, cor, casca, *pintas, *espinhos], 'corpo', pivo=(0, 0, 0.05))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.38, 0.79))

    # O chapéu: a tampa da casca, de lado na cabeça.
    tampa = L.torneado('corpo2', [(0.21, 0.0), (0.205, 0.05), (0.17, 0.11), (0.09, 0.155), (0, 0.17),
                                  (0, 0.15), (0.08, 0.135), (0.15, 0.09), (0.185, 0.03)], seg=24, fechar=False)

    def quebra_tampa(v):
        if v.z < 0.035:
            v.z -= 0.045 * _zigue(math.atan2(v.y, v.x), 7)
        return v

    L.deformar(tampa, quebra_tampa)
    tampa_pinta = L.decalque(tampa, 'detalhe', (0.03, 0.09), (0.04, 0.03), alto=0.004, aneis=1)
    tampa = L.juntar([tampa, tampa_pinta], 'tampa')
    tampa.rotation_euler = (math.radians(-10), math.radians(-22), 0)
    tampa.location = (-0.1, 0.0, 0.99)
    tampa = L.juntar([tampa], 'tampa', pivo=(-0.1, 0.0, 1.0))

    lumi = L.Lumi('ovinho', corpo, olhos, bracos=L.bracinhos('corpo', 0.37, 0.52, tam=(0.06, 0.06, 0.1)),
                  pes=L.pezinhos('corpo', 0.17, y=-0.08, z=0.05, tam=(0.1, 0.14, 0.06)), enfeites=[(tampa, 10, 0.12)],
                  pulo=0.42, passo=0.075)
    lumi.animar()
    L.exportar('ovinho', {'familia': 'dinos', 'raridade': 'comum'})


def brotinho():
    L.comecar({
        'corpo': ('#f3a85e', 0.55, None, 0, 1),
        'corpo2': ('#ffe7bf', 0.6, None, 0, 1),
        'detalhe': ('#e48a3e', 0.6, None, 0, 1),
        'luz': ('#e2ff86', 0.35, '#b8ff3a', 6.0, 1),
        'pupila': ('#2a1608', 0.25, None, 0, 1),
        'faisca': ('#f8ffd8', 0.3, '#dcff8a', 5.0, 1),
    })
    # Corpo comprido e gordinho (um saurópode bebê), barriga clara.
    tronco = L.bola('corpo', 1, (0, 0.14, 0.38), (0.37, 0.5, 0.3), seg=24, aneis=14)
    barriga = L.decalque(tronco, 'corpo2', (0, 0.16), (0.25, 0.42), alto=0.003, aneis=2, direcao=(0, 0, 1), cima=(0, 1, 0))
    pescoco = L.tubo('corpo', [(0, -0.2, 0.49), (0, -0.33, 0.6), (0, -0.4, 0.72)], [0.17, 0.14, 0.13], seg=10)
    cor = L.coracao(pescoco, 0.55, 0.05)
    rabo = L.tubo('corpo', [(0, 0.55, 0.36), (0, 0.72, 0.3), (0.04, 0.86, 0.28), (0.1, 0.96, 0.34)],
                  [0.16, 0.11, 0.065, 0.03], seg=8)
    rabo = L.juntar([rabo, L.bola('corpo', 0.03, (0.1, 0.96, 0.34), seg=6, aneis=4)], 'rabo', pivo=(0, 0.55, 0.36))
    # Placas de samambaia nas costas, acesas (o brilho dos raros).
    placas = []
    for i, (y, z, tam, ang) in enumerate(((-0.12, 0.66, 0.17, 22), (0.08, 0.7, 0.2, 2), (0.28, 0.66, 0.18, -18),
                                          (0.46, 0.56, 0.13, -38))):
        placas.append(L.folha('luz', tam, tam * 0.8, (0, y, z - 0.04), rot=(ang, 0, 90), curva=0.0, dobra=0.15,
                              gordura=0.55, n=4, esp=0.03))
    corpo = L.juntar([tronco, barriga, pescoco, cor, *placas], 'corpo', pivo=(0, 0.14, 0.1))

    C = Vector((0, -0.45, 0.8))
    cabeca = L.bola('corpo', 0.25, C, (1, 1.05, 0.92), seg=18, aneis=10)

    def focinho(v):
        d = v - C
        k = math.exp(-((d.x / 0.18) ** 2 + ((d.z + 0.05) / 0.12) ** 2)) * max(0.0, -d.y / 0.25)
        return v + Vector((0, -0.06 * k, 0))

    L.deformar(cabeca, focinho)
    rosto, olho = L.rosto(cabeca, 0.1, 0.84, 0.062, 0.078, boca_z=0.74, boca_larg=0.04, boca_alt=0.024,
                          bochecha_x=0.17, bochecha_z=0.75, sorriso=True)
    broto = [L.tubo('detalhe', [(0, -0.47, 1.0), (0.0, -0.47, 1.07), (0.03, -0.46, 1.12)], [0.018, 0.015, 0.012], seg=6)]
    broto.append(L.folha('luz', 0.1, 0.07, (0.03, -0.46, 1.11), rot=(0, -50, 0), curva=0.2, n=5))
    broto.append(L.folha('luz', 0.08, 0.06, (0.0, -0.47, 1.07), rot=(0, 55, 0), curva=0.2, n=5))
    cabeca = L.juntar([cabeca, *rosto, *broto], 'cabeca', pivo=(0, -0.38, 0.66))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.66, 0.84))

    pes = []
    for nome, x, y, lado, fase in (('pe-fe', 0.2, -0.16, 1, 0.0), ('pe-fd', -0.2, -0.16, -1, 0.5),
                                   ('pe-te', 0.2, 0.42, 1, 0.5), ('pe-td', -0.2, 0.42, -1, 0.0)):
        perna = L.torneado('corpo', [(0, 0.0), (0.095, 0.0), (0.108, 0.035), (0.1, 0.11), (0.09, 0.2), (0, 0.21)],
                           pos=(x, y, 0), seg=10)
        unhas = [L.decalque(perna, 'corpo2', (x + dx, 0.035), (0.022, 0.02), alto=0.004, bojo=0.006, aneis=1,
                            forma=L.forma_elipse(8)) for dx in (-0.045, 0, 0.045)]
        pes.append((L.juntar([perna, *unhas], nome, pivo=(x, y, 0.19)), lado, fase))
    L.prender(rabo, corpo)
    roda = L.faiscas(0.4, 1.26)
    lumi = L.Lumi('brotinho', corpo, olhos, cabeca=cabeca, pes=pes, enfeites=[(rabo, 14, 0.2)], faiscas=roda,
                  quadrupede=True, pulo=0.2, passo=0.06, peso=1.25)
    lumi.animar()
    L.exportar('brotinho', {'familia': 'dinos', 'raridade': 'raro'})


if __name__ == '__main__':
    ovinho()
    brotinho()
