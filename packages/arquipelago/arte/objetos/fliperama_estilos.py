"""O fliperama retro e o moderno da galeria (31/10/2026): `fliperama-retro` e `fliperama-moderna`.

Os nós `fliperama` e `tela` da clássica (`fliperama.py`); a `tela` é a mesma (4 por 3, inclinada, com
as coordenadas de textura de 0 a 1, onde o jogo põe a capa do minijogo), com a moldura, o painel de
controle e o letreiro (`luz`) no mesmo lugar.

- retro (paleta Doces): laterais lilás de contorno todo arredondado com bolinhas no lugar das
  faixas, corpo e letreiro com o vagalume da clássica nas cores da paleta, botões redondos.
- moderna: laterais de madeira clara de quina viva com uma faixa reta roxa, corpo roxo, letreiro
  liso com o vagalume em pixels grafite e o teto reto.
"""
from lib_estilos import *  # noqa: F403

import fliperama as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

MAPA = {
    'retro': {'gabinete': 'docesLilas', 'gabineteClaro': 'docesRosa', 'gabineteEscuro': 'docesNoite',
              'estrela': 'docesAmarelo', 'plastico': 'docesNoite', 'metalEscuro': 'docesNoite', 'metal': 'docesBranco',
              'branco': 'docesBranco', 'botaoVermelho': 'docesRosa', 'botaoAmarelo': 'docesAmarelo',
              'botaoVerde': 'docesMenta', 'botaoAzul': 'docesAzul', 'foto': 'docesCeu'},
    'moderna': {'gabineteClaro': 'modernaMadeira', 'plastico': 'modernaGrafite', 'metalEscuro': 'modernaGrafite',
                'metal': 'modernaAco', 'branco': 'modernaBranco', 'botaoVermelho': 'modernaRoxo',
                'botaoAmarelo': 'modernaBranco', 'botaoVerde': 'modernaRoxo', 'botaoAzul': 'modernaBranco'},
}


def circulo(cy, cz, r, n=16):
    return [(cy + r * math.cos(2 * math.pi * k / n), cz + r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def gabinete(estilo):
    retro = estilo == 'retro'
    corpo_m = 'docesNoite' if retro else 'modernaRoxo'
    lado_m = 'docesLilas' if retro else 'modernaMadeira'
    corpo = arredondar_contorno(g.CORPO, 0.045, n=4) if retro else g.CORPO
    perfil = arredondar_contorno(g.PERFIL, 0.06, n=5) if retro else g.PERFIL
    p = [g.no_perfil(corpo, 0, g.LI + 0.01, corpo_m)]
    for s in (-1, 1):
        p.append(g.no_perfil(perfil, s * (g.LI / 2 + g.EL / 2), g.EL, lado_m, bevel=0.012 if retro else 0.0))
        x = s * (g.LI / 2 + g.EL + 0.004)
        if retro:
            # Bolinhas de três tamanhos no lugar das faixas e das estrelas.
            for (y, z, r, m) in ((-0.12, 0.3, 0.07, 'docesRosa'), (0.12, 0.5, 0.05, 'docesAmarelo'),
                                 (-0.02, 0.68, 0.035, 'docesMenta'), (0.18, 0.86, 0.06, 'docesRosa'),
                                 (0.12, 1.25, 0.05, 'docesAmarelo'), (-0.05, 1.55, 0.035, 'docesMenta'),
                                 (0.22, 1.5, 0.03, 'docesRosa')):
                p.append(g.no_perfil(circulo(y, z, r, 18), x, 0.008, m))
        else:
            p.append(g.no_perfil([(-0.28, 0.42), (0.34, 0.42), (0.34, 0.5), (-0.28, 0.5)], x, 0.008, 'modernaRoxo'))
    p.append(box((g.LI - 0.004, 0.62, 0.07), (0, g.DY + 0.03, 0.035), 'plastico', bevel=0.01 if retro else 0.0,
                 segs=1))
    # Porta das fichas.
    yf = -0.285 + g.DY
    if retro:
        p.append(caixa_redonda((0.3, 0.02, 0.26), (0, yf - 0.008, 0.45), 'docesBranco', raio=0.03, segs=3))
        for x in (-0.06, 0.06):
            p.append(caixa_redonda((0.07, 0.014, 0.1), (x, yf - 0.022, 0.5), 'docesAmarelo', raio=0.025, segs=3))
            p.append(box((0.008, 0.01, 0.05), (x, yf - 0.03, 0.5), 'docesNoite', bevel=0.002, segs=1))
        p.append(esfera(0.014, (0.1, yf - 0.018, 0.37), 'docesRosa', seg=10, aneis=6))
    else:
        p.append(box((0.3, 0.02, 0.26), (0, yf - 0.008, 0.45), 'modernaGrafite', bevel=0.0))
        for x in (-0.06, 0.06):
            p.append(box((0.06, 0.014, 0.09), (x, yf - 0.022, 0.5), 'modernaAco', bevel=0.0))
            p.append(box((0.008, 0.01, 0.05), (x, yf - 0.03, 0.5), 'modernaGrafite', bevel=0.0))
    return p


def letreiro_moderna():
    yf = -0.275 + g.DY
    zc = (1.49 + 1.745) / 2
    p = [box((g.LI - 0.02, 0.02, 0.2), (0, yf - 0.01, zc), 'luz', bevel=0.0)]
    # O vagalume em pixels grafite: corpo, cabeça, asa e a cauda roxa que acende com o letreiro.
    px = 0.04
    for (i, j, m) in ((-1, 0, 'modernaGrafite'), (0, 0, 'modernaGrafite'), (-2, 1, 'modernaGrafite'),
                      (0, 1, 'modernaBranco'), (-1, 1, 'modernaBranco'), (1, 0, 'modernaRoxo'), (2, 0, 'modernaRoxo'),
                      (-3, 2, 'modernaGrafite'), (-2, 2, 'modernaGrafite')):
        p.append(box((px, 0.012, px), (i * px, yf - 0.024, zc + (j - 0.5) * px), m, bevel=0.0))
    p.append(box((g.LI + 2 * g.EL + 0.02, 0.7, 0.04), (0, g.DY + 0.035, 1.78), 'modernaRoxo', bevel=0.0))
    return p


def montar(estilo):
    comecar(estilo, 'docesLilas' if estilo == 'retro' else 'modernaRoxo', pintas=())
    moldura, tela = g.tela_e_moldura()
    letreiro = g.letreiro() if estilo == 'retro' else letreiro_moderna()
    nos = {'fliperama': gabinete(estilo) + g.painel() + moldura + letreiro, 'tela': tela}
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {'nos': nos, 'grupo': 'fliperama', 'uv': True}


if __name__ == '__main__':
    rodar_estilos('fliperama', montar)
