"""Os instrumentos da banda, retro e modernos (31/10/2026): `banda-retro` e `banda-moderna`.

Os cinco nós soltos da clássica (`banda.py`: `bateria`, `teclado`, `violao`, `xilofone`, `microfone`),
cada um com o pivô no meio da própria base e no mesmo lugar do palco. As peças saem das funções da
clássica; o que muda está abaixo. Como na clássica, sem faces do Pinta.

- retro (paleta Doces): tambores rosa com aros brancos, teclado menta de caixa arredondada entre
  duas bochechas redondas castanhas, violão pêssego, xilofone com as teclas no arco-íris da paleta
  e o microfone antigo de cápsula oval com os anéis da grade.
- moderna: tambores amarelos com aros de aço, teclado amarelo de quina viva entre duas bochechas de
  madeira, violão de madeira clara no suporte amarelo, marimba de teclas de madeira clara no
  cavalete amarelo e o microfone reto de bastão.
"""
from lib_estilos import *  # noqa: F403

import banda as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

MAPA = {
    'retro': {'bumbo': 'docesRosa', 'aroTambor': 'docesBranco', 'peleTambor': 'docesBranco', 'estrela': 'docesAmarelo',
              'pratoBateria': 'docesAmarelo', 'botaoAzul': 'docesCeu', 'madeiraClara': 'docesCreme',
              'ferro': 'docesNoite', 'borracha': 'docesNoite', 'metalEscuro': 'docesNoite', 'metal': 'docesBranco',
              'tecido': 'docesRosa', 'teclaBranca': 'docesBranco', 'teclaPreta': 'docesNoite', 'plastico': 'docesNoite',
              'botaoVerde': 'docesMenta', 'botaoVermelho': 'docesRosa', 'botaoAmarelo': 'docesAmarelo',
              'branco': 'docesBranco', 'violao': 'docesPessego', 'violaoEscuro': 'docesCastanho', 'boca': 'docesNoite',
              'corda': 'docesBranco', 'cromado': 'docesBranco', 'madeira': 'docesCastanho',
              'madeiraEscura': 'docesCastanho', 'xilo1': 'docesRosa', 'xilo2': 'docesPessego', 'xilo3': 'docesAmarelo',
              'xilo4': 'docesVerde', 'xilo5': 'docesCeu', 'xilo6': 'docesLilas', 'xilo7': 'docesRoxo',
              'microfone': 'docesNoite', 'gradeMic': 'docesBranco'},
    'moderna': {'bumbo': 'modernaAmarelo', 'aroTambor': 'modernaAco', 'peleTambor': 'modernaBranco',
                'estrela': 'modernaBranco', 'botaoAzul': 'modernaAmarelo', 'madeiraClara': 'modernaMadeira',
                'metalEscuro': 'modernaGrafite', 'ferro': 'modernaGrafite', 'plastico': 'modernaGrafite',
                'violao': 'modernaMadeira', 'violaoEscuro': 'modernaMadeiraVeio', 'boca': 'modernaGrafite',
                'madeira': 'modernaAmarelo', 'madeiraEscura': 'modernaGrafite', 'botaoVermelho': 'modernaAmarelo',
                'botaoAmarelo': 'modernaAmarelo', 'botaoVerde': 'modernaAmarelo', 'metal': 'modernaAco',
                'microfone': 'modernaGrafite', 'gradeMic': 'modernaAco', 'cromado': 'modernaAco',
                **{f'xilo{k}': ('modernaMadeira' if k % 2 else 'modernaMadeiraVeio') for k in range(1, 8)}},
}


def teclado(estilo):
    """O teclado da clássica com outra caixa: mais estreita, entre duas bochechas (a largura total é
    a mesma, para a caixa do arquivo não crescer)."""
    p = g.teclado()
    apagar(p[:1])
    p = p[1:]
    zt = 0.74
    if estilo == 'retro':
        p.append(caixa_redonda((0.82, 0.3, 0.08), (0, 0, zt + 0.04), 'docesMenta', raio=0.034, segs=2))
        for s in (-1, 1):
            p.append(caixa_redonda((0.05, 0.31, 0.12), (s * 0.435, 0, zt + 0.055), 'docesCastanho', raio=0.024, segs=2))
    else:
        p.append(box((0.84, 0.3, 0.08), (0, 0, zt + 0.04), 'modernaAmarelo', bevel=0.0))
        # As bochechas passam 5 mm da caixa na frente, atrás e embaixo: nenhuma face no mesmo plano.
        for s in (-1, 1):
            p.append(box((0.04, 0.31, 0.105), (s * 0.44, 0, zt + 0.0475), 'modernaMadeira', bevel=0.0))
    return p


def microfone(estilo):
    """O pedestal e o fio da clássica; a cabeça muda."""
    p = g.microfone()
    apagar(p[4:7])            # o corpo inclinado, a grade e o anel da clássica
    p = p[:4] + p[7:]
    zt = 1.08
    if estilo == 'retro':
        # Cápsula oval antiga, em pé, presa num garfo, com os anéis da grade.
        zc = zt + 0.13
        p.append(esfera(0.052, (0, 0, zc), 'docesBranco', escala=(1, 0.85, 1.4), seg=12, aneis=8))
        for dz in (-0.03, 0.03):
            r = 0.052 * math.sqrt(max(0.0, 1 - (dz / 0.073) ** 2)) + 0.004
            p.append(lib_q.torus(r, 0.005, (0, 0, zc + dz), 'docesNoite', seg=12, rseg=3))
            p[-1].scale = (1, 0.85, 1)
        # O garfo: meio anel embaixo da cápsula, de um lado ao outro.
        p.append(lib_q.torus(0.064, 0.008, (0, 0, zc), 'docesRosa', seg=8, rseg=4, rot=(R(-90), 0, 0), arc=180))
        p.append(barra((0, 0, zt), (0, 0, zc - 0.062), 'docesRosa', r=0.01, verts=8))
    else:
        d = Vector((0, -math.sin(R(35)), math.cos(R(35))))
        a = Vector((0, 0, zt)) + d * 0.02
        b = a + d * 0.14
        p.append(barra(a, b, 'modernaGrafite', r=0.02, verts=12))
        p.append(barra(b, b + d * 0.055, 'modernaAco', r=0.025, verts=12))
        p.append(barra(a + d * 0.05, a + d * 0.07, 'modernaAmarelo', r=0.026, verts=12))
    return p


def montar(estilo):
    comecar(estilo, 'docesRosa' if estilo == 'retro' else 'modernaAmarelo')
    pecas = (('bateria', g.bateria), ('teclado', lambda: teclado(estilo)), ('violao', g.violao),
             ('xilofone', g.xilofone), ('microfone', lambda: microfone(estilo)))
    nos = {}
    for nome, fn in pecas:
        objs = fn()
        x, y, giro = g.LUGARES[nome]
        lib_ilha.place(objs, loc=(x, y, 0), rot_z=giro)
        nos[nome] = (objs, (x, y, 0))
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {'nos': nos, 'grupo': 'banda'}


if __name__ == '__main__':
    rodar_estilos('banda', montar)
