"""A lareira retro e a moderna da galeria (31/10/2026): `lareira-retro` e `lareira-moderna`.

O fogo é o da clássica (`lareira.py`, montada pela própria função dela): os nós `fogo` e
`chama-1` a `chama-3` com o mesmo pivô, o clipe `crepitar`, os materiais `fogo` e `brasa`, as velas
(`chama`), a lenha na grelha, a pilha de lenha, o vaso e o porta-retrato. A boca fica onde estava,
então o fogo cabe nela. Como na clássica, sem faces do Pinta.

- retro (paleta Doces): corpo liso rosa-claro de quinas bem redondas, a boca em arco com o debrum
  redondo branco, uma fileira de medalhões menta, a soleira creme e a prateleira arredondada com
  mãos-francesas de curva.
- moderna: caixa laranja de quina viva com a boca retangular larga numa moldura grafite, soleira
  grafite e a prateleira de madeira clara sem apoio aparente.
"""
from lib_estilos import *  # noqa: F403

import lareira as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

COR = {'retro': 'docesRosaClaro', 'moderna': 'modernaLaranja'}
MAPA = {
    'retro': {'fuligem': 'docesNoite', 'lenha': 'docesCastanho', 'madeiraClara': 'docesCreme', 'ferro': 'docesNoite',
              'vela': 'docesBranco', 'vaso': 'docesCeu', 'folha': 'docesMenta', 'folhaEscura': 'docesVerde',
              'moldura': 'docesAmarelo', 'foto': 'docesCeu', 'branco': 'docesBranco', 'tinta': 'docesNoite',
              'loucaBranca': 'docesBranco', 'madeira': 'docesCastanho', 'madeiraEscura': 'docesCastanho'},
    'moderna': {'fuligem': 'modernaGrafite', 'vaso': 'modernaBranco', 'moldura': 'modernaMadeira',
                'ferro': 'modernaGrafite'},
}
# A boca retangular da moderna (largura, altura): cobre as chamas mais altas do clipe.
BOCA_RETA = (0.86, 0.66)


def corpo(estilo):
    m = COR[estilo]
    zc = (g.Z_BASE + g.Z_TOPO) / 2
    yc = (g.Y_FRENTE + g.Y_FUNDO) / 2
    tam = (g.L, g.F, g.Z_TOPO - g.Z_BASE)
    funda = 0.2 + g.BOCA_FUNDO * 2
    if estilo == 'retro':
        c = caixa_redonda(tam, (0, yc, zc), m, raio=0.07, segs=5)
        booleana(c, prism(g.contorno_boca(), funda, (0, g.Y_FRENTE, g.Z_BASE), 'fuligem'))
        pintar_por(c, lambda ct, n: 'fuligem' if ct.y > g.Y_FRENTE + 0.002 and g.dentro_da_boca(ct.x, ct.z, 0.002)
                   else None)
        p = [c]
        # Debrum redondo em volta da boca, dos pés ao alto do arco (os pés entram na soleira).
        r = g.BOCA_L / 2 + 0.025
        pts = [(-r, g.Z_BASE - 0.012), (-r, g.Z_BASE + g.BOCA_RETO)]
        n = 16
        for k in range(1, n):
            a = math.pi - math.pi * k / n
            pts.append((r * math.cos(a), g.Z_BASE + g.BOCA_RETO + r * math.sin(a)))
        pts += [(r, g.Z_BASE + g.BOCA_RETO), (r, g.Z_BASE - 0.012)]
        p.append(tube([(x, g.Y_FRENTE, z) for x, z in pts], [0.034] * len(pts), 'docesBranco', seg=10))
        # Medalhões menta numa fileira, acima da boca.
        for x in fileira(7, -0.6, 0.6):
            if abs(x) < 0.3:
                continue
            p.append(cyl(0.04, 0.012, (x, g.Y_FRENTE, 0.98), 'docesMenta', verts=20, rot=(R(90), 0, 0)))
            p.append(cyl(0.018, 0.012, (x, g.Y_FRENTE - 0.006, 0.98), 'docesBranco', verts=14, rot=(R(90), 0, 0)))
        for x in (-0.12, 0, 0.12):
            p.append(cyl(0.026, 0.012, (x, g.Y_FRENTE, 1.02), 'docesLilas', verts=16, rot=(R(90), 0, 0)))
    else:
        c = caixa_viva(tam, (0, yc, zc), m, chanfro=0.004)
        bl, ba = BOCA_RETA
        corte = box((bl, funda, ba + 0.1), (0, g.Y_FRENTE, g.Z_BASE + (ba - 0.1) / 2), 'fuligem', bevel=0.0)
        booleana(c, corte)
        pintar_por(c, lambda ct, n: 'fuligem' if ct.y > g.Y_FRENTE + 0.002 and abs(ct.x) < bl / 2 + 0.002
                   and ct.z < g.Z_BASE + ba + 0.002 else None)
        p = [c]
        # Moldura grafite em volta da boca, aberta embaixo (os pés entram na soleira).
        mold = box((bl + 0.14, 0.02, ba + 0.074), (0, g.Y_FRENTE - 0.004, g.Z_BASE - 0.004 + (ba + 0.074) / 2),
                   'modernaGrafite', bevel=0.0)
        furo = box((bl - 0.02, 0.2, ba + 0.04), (0, g.Y_FRENTE, g.Z_BASE - 0.05 + (ba + 0.04) / 2), 'modernaGrafite',
                   bevel=0.0)
        booleana(mold, furo)
        p.append(mold)
    return p


def soleira_e_prateleira(estilo):
    p = []
    zp = g.Z_TOPO
    tam_s = (g.L + 0.1, g.F + 0.38, g.Z_BASE)
    lugar_s = (0, g.Y_FUNDO - (g.F + 0.38) / 2, g.Z_BASE / 2)
    tam_p = (g.L + 0.2, g.F + 0.1, 0.07)
    lugar_p = (0, g.Y_FUNDO - (g.F + 0.1) / 2, zp + 0.035)
    if estilo == 'retro':
        p.append(caixa_redonda(tam_s, lugar_s, 'docesCreme', raio=0.035, segs=4))
        p.append(caixa_redonda(tam_p, lugar_p, 'docesCastanho', raio=0.033, segs=4))
        for s in (-1, 1):
            pts = arredondar_contorno([(0, 0), (0.0, -0.16), (0.03, -0.16), (0.09, -0.03), (0.09, 0)], 0.04, n=5)
            mao = prism(pts, 0.08, (0, 0, 0), 'docesCastanho', bevel=0.006)
            mao.rotation_euler = (0, 0, R(-90))
            mao.location = (s * (g.L / 2 - 0.12), g.Y_FRENTE, zp)
            p.append(mao)
    else:
        p.append(box(tam_s, lugar_s, 'modernaGrafite', bevel=0.0))
        p.append(box((tam_p[0], tam_p[1], 0.06), (lugar_p[0], lugar_p[1], zp + 0.03), 'modernaMadeira', bevel=0.0))
    return p


def montar(estilo):
    comecar(estilo, COR[estilo])
    res = g.lareira()
    nos = res['nos']
    # Da lareira da clássica ficam o fogo, a lenha, a pilha e os enfeites; o corpo e a prateleira mudam.
    apagar(nos['lareira'])
    nos['lareira'] = (corpo(estilo) + soleira_e_prateleira(estilo) + g.enfeites() + g.lenha_e_grelha()
                      + g.pilha_de_lenha())
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {**res, 'nos': nos}


if __name__ == '__main__':
    rodar_estilos('lareira', montar)
