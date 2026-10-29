"""Lumis da Ilha das Nuvens: Algodão (comum) e Pluma (raro).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/nuvens.py   # grava src/assets/lumis/{algodao,pluma}.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_lumis as L  # noqa: E402
from mathutils import Vector  # noqa: E402


def algodao():
    L.comecar({
        'corpo': ('#ffffff', 0.85, '#f4f8ff', 0.08, 1),
        'detalhe': ('#86cbff', 0.25, '#9fd6ff', 0.2, 1),
        # A luz do Algodão é azul de chuva: o coração e a gotinha acendem juntos (o jogo pulsa a
        # `luz` e acende mais à noite). Com o coração rosa pequeno e a gota apagada, ele sumia no escuro.
        'luz': ('#a6dcff', 0.3, '#5cc3ff', 3.2, 1),
        'pupila': ('#1c2238', 0.25, None, 0, 1),
        'bochecha': ('#ffadc8', 0.8, None, 0, 1),
    })
    # Uma nuvem fofa: bolas sobrepostas fundidas numa massa só, sem costura.
    bolas = [L.bola('corpo', r, p, seg=20, aneis=12) for p, r in (
        ((0, 0, 0.62), 0.36), ((0.3, 0.02, 0.52), 0.25), ((-0.3, 0.02, 0.52), 0.25), ((-0.12, 0.04, 0.88), 0.22),
        ((0.15, 0.04, 0.9), 0.2), ((0.14, 0.0, 0.33), 0.2), ((-0.15, 0.0, 0.33), 0.2), ((0, 0.16, 0.6), 0.32),
        ((0.38, 0.1, 0.7), 0.16), ((-0.38, 0.1, 0.72), 0.15))]
    nuvem = L.fundir(bolas, 'nuvem', voxel=0.026, tris=1100, alisar=3)
    rosto, olho = L.rosto(nuvem, 0.15, 0.66, 0.088, 0.11, boca_z=0.52, boca_larg=0.05, boca_alt=0.04,
                          bochecha_x=0.27, bochecha_z=0.54)
    cor = L.coracao(nuvem, 0.44, 0.072)
    corpo = L.juntar([nuvem, *rosto, cor], 'corpo', pivo=(0, 0, 0.16))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.38, 0.66))

    # Uma gotinha de chuva no alto, presa num fiozinho de nuvem.
    gota = [L.torneado('luz', [(0, 0.0)] + [(0.07 * math.sin(math.pi * t) ** 0.8 * (1 - 0.55 * t), 0.15 * t)
                                                for t in (0.15, 0.3, 0.45, 0.6, 0.75, 0.9)] + [(0, 0.16)],
                       pos=(0.1, 0.05, 1.08), seg=14)]
    gota.append(L.tubo('corpo', [(0.05, 0.05, 1.04), (0.08, 0.05, 1.08), (0.1, 0.05, 1.1)], [0.02, 0.016, 0.012], seg=6))
    gota = L.juntar(gota, 'gota', pivo=(0.05, 0.05, 1.04))
    bracos = []
    for lado in (1, -1):
        b = L.bola('corpo', 1, (lado * 0.53, -0.02, 0.5), (0.085, 0.075, 0.075), seg=10, aneis=6)
        bracos.append((L.juntar([b], f'braco-{"e" if lado > 0 else "d"}', pivo=(lado * 0.47, -0.02, 0.52)), lado))
    lumi = L.Lumi('algodao', corpo, olhos, bracos=bracos, enfeites=[(gota, 14, 0.15)], flutua=True)
    lumi.animar()
    L.exportar('algodao', {'familia': 'nuvens', 'raridade': 'comum'})


def pluma():
    L.comecar({
        'corpo': ('#c9b6ff', 0.75, None, 0, 1),
        'corpo2': ('#fff4e4', 0.8, None, 0, 1),
        'detalhe': ('#ffb33d', 0.45, None, 0, 1),
        'pena1': ('#ff6f9a', 0.6, None, 0, 1),
        'pena2': ('#ffd25a', 0.6, None, 0, 1),
        'pena3': ('#58dcc6', 0.6, None, 0, 1),
        'luz': ('#ffb21f', 0.3, '#ff9a00', 3.6, 1),
        'pupila': ('#1f1636', 0.25, None, 0, 1),
        'bochecha': ('#ff9fc6', 0.8, None, 0, 1),
        'faisca': ('#fffbe6', 0.3, '#fff0a8', 5.0, 1),
    })
    C, R = Vector((0, 0, 0.6)), 0.38
    casca = L.bola('corpo', R, C, (1, 0.98, 0.95), seg=24, aneis=14)
    barriga = L.decalque(casca, 'corpo2', (0, 0.47), (0.2, 0.15), alto=0.003, bojo=0.006, aneis=2)
    olho = L.olhos(casca, 0.14, 0.66, 0.088, 0.112)
    bochechas = [L.decalque(casca, 'bochecha', (0.25 * lado, 0.56), (0.055, 0.032), alto=0.003, aneis=1) for lado in (-1, 1)]
    cor = L.coracao(barriga, 0.45, 0.062)
    # O biquinho, dois cones achatados.
    bico_p, bico_n = L.projetar(casca, 0, 0.56)
    bico = [L.cone('detalhe', 0.055, 0.09, tuple(bico_p - bico_n * 0.01), rot=(90, 0, 0), seg=10, escala=(1, 0.7, 1), liso=True)]
    corpo = L.juntar([casca, barriga, *bochechas, cor, *bico], 'corpo', pivo=(0, 0, 0.2))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.37, 0.66))

    # Penacho de arco-íris com pontinhas de luz, e o rabinho.
    penacho = []
    for i, (mat, ang, comp) in enumerate((('pena1', -24, 0.26), ('pena2', 0, 0.32), ('pena3', 24, 0.26))):
        penacho.append(L.folha(mat, comp, 0.1, (0, 0.04, 0.94), rot=(-18, ang, 0), curva=0.35, dobra=0.3, gordura=0.7))
        a = math.radians(ang)
        ponta = Vector((math.sin(a) * comp * 0.92, 0.04 + comp * 0.32, 0.94 + math.cos(a) * comp * 0.88))
        penacho.append(L.bola('luz', 0.045, tuple(ponta), seg=8, aneis=5))
    penacho = L.juntar(penacho, 'penacho', pivo=(0, 0.04, 0.94))
    rabo = []
    for mat, ang in (('pena3', -28), ('pena1', 0), ('pena2', 28)):
        rabo.append(L.folha(mat, 0.26, 0.11, (0, 0.33, 0.48), rot=(-115, 0, ang), curva=-0.25, dobra=0.3, gordura=0.7))
    rabo = L.juntar(rabo, 'rabo', pivo=(0, 0.33, 0.48))
    asas = []
    for lado in (1, -1):
        asa = [L.folha('corpo', 0.3, 0.2, (lado * 0.35, 0.05, 0.66), rot=(-12, lado * 138, 0), curva=-0.15, dobra=0.25, gordura=0.6)]
        for k, (mat, giro) in enumerate((('pena1', 150), ('pena3', 162))):
            a = math.radians(giro)
            base = Vector((lado * (0.35 + 0.2 * math.sin(a)), 0.07 + 0.02 * k, 0.66 + 0.2 * math.cos(a)))
            asa.append(L.folha(mat, 0.13, 0.065, tuple(base), rot=(-12, lado * (giro + 8), 0), curva=-0.1, dobra=0.2, n=5))
        asas.append((L.juntar(asa, f'asa-{"e" if lado > 0 else "d"}', pivo=(lado * 0.35, 0.05, 0.66)), lado))
    pes = []
    for lado in (1, -1):
        p = [L.tubo('detalhe', [(lado * 0.1, -0.02, 0.27), (lado * 0.11, -0.03, 0.17)], 0.018, seg=6)]
        for dx in (-0.025, 0.0, 0.025):
            p.append(L.bola('detalhe', 0.022, (lado * 0.11 + dx, -0.06, 0.16), (1, 1.6, 0.7), seg=6, aneis=4))
        pes.append((L.juntar(p, f'pe-{"e" if lado > 0 else "d"}', pivo=(lado * 0.1, -0.02, 0.28)), 10, 0.1 if lado > 0 else 0.35))
    roda = L.faiscas(0.42, 1.38)
    lumi = L.Lumi('pluma', corpo, olhos, bracos=asas, enfeites=[(penacho, 10, 0.12), (rabo, 12, 0.25), *pes],
                  faiscas=roda, flutua=True, asas=True)
    lumi.animar()
    L.exportar('pluma', {'familia': 'nuvens', 'raridade': 'raro'})


if __name__ == '__main__':
    algodao()
    pluma()
