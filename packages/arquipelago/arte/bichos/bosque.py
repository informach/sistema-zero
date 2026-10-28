"""Bichos de enfeite do Bosque dos Bichos: o bem-te-vi (barriga amarela, faixa branca na cabeça)
e a borboleta azul (asas de azul-morfo com a beirada preta e pintinhas brancas). Clipes: `voar` e
`pousado` (a borboleta pousa com as asas fechadas para cima, abrindo devagar).

  /tmp/claude-0/blender-venv/bin/python arte/bichos/bosque.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_bichos import Bicho, clipes_ave, corpo_de_passaro  # noqa: E402

COMUM = {
    'olho': ('#151216', 0.1),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#ff9fae', 0.9),
}


def bem_te_vi(pid):
    p = Bicho(pid, {**COMUM, 'penas': ('#7a5a3c', 0.75), 'barriga': ('#ffd43a', 0.7), 'asa': ('#8b6a45', 0.75),
                     'bico': ('#2a2420', 0.45), 'pe': ('#5a4a40', 0.6), 'mascara': ('#26211f', 0.6),
                     'faixa': ('#ffffff', 0.7)}, alvo=2200)

    def cabeca_listrada(p, cab, cc):
        # Cabeça preta com a faixa branca por cima do olho e o queixo branco: o desenho do bem-te-vi.
        p.casca('cabeca', 'mascara', 'mascara', cc, (0.068, 0.066, 0.064), folga=0.002, espessura=0.002,
                seg=18, aneis=10, cortes=[((0, 0, cc[2] - 0.012), (0, 0, -1))])
        p.casca('cabeca', 'faixa', 'faixa', cc, (0.068, 0.066, 0.064), folga=0.004, espessura=0.002, seg=18,
                aneis=10, cortes=[((0, 0, cc[2] + 0.033), (0, 0, 1)), ((0, 0, cc[2] + 0.022), (0, 0, -1)),
                                  ((0, cc[1] - 0.05, 0), (0, -1, 0))])
        p.esfera('cabeca', 'faixa', (0, cc[1] - 0.035, cc[2] - 0.04), (0.035, 0.025, 0.025), seg=10, aneis=6)
        p.esfera('cabeca', 'barriga', (0, cc[1] + 0.005, cc[2] + 0.063), (0.022, 0.03, 0.006), seg=8, aneis=4)

    corpo_de_passaro(p, crista=cabeca_listrada)
    p.finalizar()
    clipes_ave(p, {'bate': 42})
    return p


def borboleta(pid):
    p = Bicho(pid, {**COMUM, 'corpo': ('#2b2440', 0.6), 'asa': ('#3d8cff', 0.35), 'borda': ('#1a1830', 0.5),
                     'ponto': ('#ffffff', 0.5), 'antena': ('#2b2440', 0.6)}, alvo=1600)
    z = 0.03
    p.capsula('corpo', 'corpo', (0, 0.045, z), (0, -0.03, z), 0.009, 0.012, seg=8)
    cab = p.esfera('cabeca', 'corpo', (0, -0.045, z + 0.005), (0.016, 0.016, 0.016), seg=12, aneis=8)
    for s in (1, -1):
        p.olho_no_rosto(s, [cab], 0.008 * s, z + 0.008, (0.0065, 0.004, 0.0075), afunda=0.1, seg=10, aneis=6)
        p.tubo('cabeca', 'antena', [(0.004 * s, -0.05, z + 0.016), (0.014 * s, -0.07, z + 0.04),
                                    (0.022 * s, -0.08, z + 0.055)], 0.0018, seg=4)
        p.esfera('cabeca', 'antena', (0.022 * s, -0.08, z + 0.056), (0.004, 0.004, 0.004), seg=6, aneis=4)
    # Asas: a de cima maior e a de baixo arredondada, o azul por cima da beirada preta.
    cima = [(0.0, -0.005), (0.04, -0.045), (0.09, -0.06), (0.115, -0.045), (0.1, 0.0), (0.05, 0.01)]
    baixo = [(0.0, 0.005), (0.05, 0.01), (0.085, 0.035), (0.075, 0.07), (0.04, 0.075), (0.01, 0.04)]
    for s, osso in ((1, 'asa_esq'), (-1, 'asa_dir')):
        for forma in (cima, baixo):
            borda = [(x * s, y) for x, y in forma]
            meio = [(x * s * 0.84 + 0.012 * s, y * 0.8) for x, y in forma]
            if s < 0:
                borda, meio = borda[::-1], meio[::-1]
            p.placa(osso, 'borda', borda, 0.003, centro=(0.006 * s, 0.0, z + 0.002))
            p.placa(osso, 'asa', meio, 0.003, centro=(0.004 * s, 0.0, z + 0.004))
        for x, y in ((0.1, -0.04), (0.085, -0.05), (0.07, 0.06)):
            p.esfera(osso, 'ponto', (x * s, y, z + 0.0035), (0.006, 0.006, 0.0025), seg=6, aneis=3)
    p.esqueleto_ave(corpo=((0, 0.045, z), (0, -0.04, z)), pescoco=(0, -0.04, z), topo=(0, -0.07, z + 0.05),
                    ombro=(0.006, 0.0, z + 0.003), ponta=(0.12, 0.0, z + 0.003))
    p.finalizar()
    clipes_ave(p, {'bate': 52, 'borboleta': True, 'voo': 8})
    return p


BICHOS = {'bem-te-vi': bem_te_vi, 'borboleta': borboleta}

if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        BICHOS[pid](pid).exportar()
