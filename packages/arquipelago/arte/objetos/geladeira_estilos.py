"""A geladeira retro e a moderna da galeria (31/10/2026): `geladeira-retro` e `geladeira-moderna`.

As duas têm as medidas da clássica (`geladeira.py`), os mesmos nós `geladeira` e `porta` (pivô na
dobradiça), o mesmo clipe `abrir`, a luz de dentro e as quatro faces do Pinta do mesmo tamanho. O
miolo (prateleiras, gaveta, alimentos) e o forro da porta com as garrafas são os da clássica.

- retro (paleta Doces do Pinta): corpo e porta rosa de quinas bem macias (mais segmentos), o debrum
  branco redondo em volta da porta, puxador gordinho de pontas redondas com o botão da trava,
  pezinhos de bolinha e o rodapé creme com três respiros de pílula.
- moderna: caixa de quina viva azul, as faces do Pinta como placas lisas encostadas nos lados, no
  topo e na porta, o puxador de madeira clara em barra reta de cima a baixo e o rodapé de madeira.
"""
from lib_estilos import *  # noqa: F403

import geladeira as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

MAPA = {
    'retro': {'geladeiraDentro': 'docesBranco', 'cromado': 'docesBranco', 'papelSombra': 'docesCreme',
              'leite': 'docesBranco', 'leiteAzul': 'docesAzul', 'ovo': 'docesCreme', 'queijo': 'docesAmarelo',
              'queijoFuro': 'docesPessego', 'suco': 'docesPessego', 'maca': 'docesRosa', 'tampinha': 'docesRosa',
              'cenoura': 'docesPessego', 'cabinho': 'docesMenta', 'folhaAlface': 'docesVerde',
              'folhaAlfaceEscura': 'docesMenta', 'bolo': 'docesAmarelo', 'boloTopo': 'docesPessego',
              'loucaBranca': 'docesBranco', 'loucaAzul': 'docesCeu', 'loucaVerde': 'docesMenta',
              'forminha': 'docesRosaClaro', 'morango': 'docesRosa', 'pipocaMiolo': 'docesAmarelo',
              'erva': 'docesVerde'},
    'moderna': {'geladeiraDentro': 'modernaBranco', 'cromado': 'modernaAco'},
}
COR = {'retro': 'docesRosa', 'moderna': 'modernaAzul'}


def corpo(estilo):
    m = COR[estilo]
    zc = g.PE + g.A / 2
    if estilo == 'retro':
        c = caixa_redonda((g.L, g.F, g.A), (0, g.YC, zc), m, raio=g.RAIO, segs=6)
    else:
        c = caixa_viva((g.L, g.F, g.A), (0, g.YC, zc), m, chanfro=0.006)
    fm = g.F - g.PAREDE + 0.2
    am = g.A - g.PAREDE - g.BASE
    miolo = box((g.L - 2 * g.PAREDE, fm, am), (0, g.Y_FRENTE - 0.2 + fm / 2, g.PE + g.BASE + am / 2),
                'geladeiraDentro', bevel=0.02, segs=2)
    booleana(c, miolo)
    zt, zb = g.PE + g.A, g.PE
    lim_x = g.L / 2 - 0.04

    def regra(ct, n):
        if abs(ct.x) < lim_x and zb + 0.04 < ct.z < zt - 0.04 and g.Y_FRENTE + 0.002 < ct.y < g.Y_FUNDO - 0.04:
            return 'geladeiraDentro'
        if estilo == 'moderna':
            return None
        if n.x < -0.999:
            return 'pintaLadoEsq'
        if n.x > 0.999:
            return 'pintaLadoDir'
        if n.z > 0.999 and ct.z > zt - 0.01:
            return 'pintaTopo'
        return None
    pintar_por(c, regra)
    p = [c]
    zl = (0.105 + 1.685) / 2          # meio das faces dos lados (as da clássica)
    if estilo == 'retro':
        uv_plano(c, {'pintaLadoEsq'}, (0, -1, 0), (0, 0, 1))
        uv_plano(c, {'pintaLadoDir'}, (0, 1, 0), (0, 0, 1))
        uv_plano(c, {'pintaTopo'}, (1, 0, 0), (0, 1, 0))
        # Pezinhos de bolinha.
        for sx in (-1, 1):
            for sy in (-1, 1):
                p.append(esfera(0.034, (sx * (g.L / 2 - 0.1), g.YC + sy * (g.F / 2 - 0.11), 0.034), 'docesBranco',
                                seg=14, aneis=8))
        # Rodapé creme de quinas redondas com três respiros de pílula.
        yr = g.Y_FRENTE - 0.008
        p.append(caixa_redonda((g.L - 0.16, 0.024, 0.08), (0, yr, g.PE + 0.05), 'docesCreme', raio=0.012, segs=3))
        for x in (-0.2, 0, 0.2):
            p.append(caixa_redonda((0.15, 0.012, 0.024), (x, yr - 0.012, g.PE + 0.05), 'docesNoite', raio=0.0115,
                                   segs=3))
    else:
        p.append(placa_pintavel('pintaLadoEsq', '-X', (-g.L / 2, g.YC, zl), 0.54, 1.58, m))
        p.append(placa_pintavel('pintaLadoDir', '+X', (g.L / 2, g.YC, zl), 0.54, 1.58, m))
        p.append(placa_pintavel('pintaTopo', '+Z', (0, g.YC, zt), 0.70, 0.54, m))
        # Rodapé de madeira clara, recuado, e a fresta escura do respiro embaixo da porta.
        p.append(box((g.L - 0.1, g.F - 0.12, g.PE + 0.006), (0, g.YC + 0.01, (g.PE + 0.006) / 2), 'modernaMadeira',
                     bevel=0.0))
        p.append(box((g.L - 0.24, 0.012, 0.03), (0, g.Y_FRENTE - 0.002, g.PE + 0.06), 'modernaGrafite', bevel=0.0))
    return p


def porta(estilo):
    m = COR[estilo]
    ap = g.PE + g.A - g.Z_PORTA
    zc = g.Z_PORTA + ap / 2
    yc = -0.375 + g.E / 2
    xp = g.L / 2 - 0.085
    yp = -0.375 - 0.05
    # O forro, as prateleiras da porta e as garrafas são os da clássica (sem a folha e o puxador).
    classica = g.porta()
    apagar(classica[:2])
    if estilo == 'retro':
        d = caixa_redonda((g.L, g.E, ap), (0, yc, zc), m, raio=g.RAIO, segs=6)
        pintar_face(d, 'pintaFrente', '-Y')
        p = [d]
        # Puxador gordinho de pontas redondas e o botão redondo da trava embaixo dele.
        p.append(tube([(xp, yp + 0.045, 0.94), (xp, yp + 0.012, 0.98), (xp, yp, 1.04), (xp, yp, 1.2),
                       (xp, yp + 0.012, 1.26), (xp, yp + 0.045, 1.3)], [0.03, 0.032, 0.034, 0.034, 0.032, 0.03],
                      'docesBranco', seg=14))
        for z in (0.94, 1.3):
            p.append(cyl(0.042, 0.012, (xp, -0.375 - 0.004, z), 'docesBranco', verts=18, rot=(R(90), 0, 0)))
        p.append(esfera(0.026, (xp, -0.375 - 0.012, 0.86), 'docesCeu', escala=(1, 0.6, 1), seg=14, aneis=8))
        # Debrum branco em volta da porta, em cima do arredondado da quina (fora da face do Pinta).
        b = 0.013
        p.append(debrum(contorno_de_quinas_redondas(-g.L / 2 + b, g.L / 2 - b, g.Z_PORTA + b, g.PE + g.A - b, 0.05),
                        lambda u, v: (u, -0.375 + 0.011, v), 'docesBranco', r=0.011))
    else:
        d = caixa_viva((g.L, g.E, ap), (0, yc, zc), m, chanfro=0.006)
        p = [d, placa_pintavel('pintaFrente', '-Y', (0, -0.375, (0.19 + 1.70) / 2), 0.74, 1.51, m)]
        # Puxador de madeira clara: uma barra reta presa em dois tocos, na borda livre da porta.
        xb = g.L / 2 - 0.025
        p.append(box((0.03, 0.03, 0.92), (xb, -0.436, 0.95), 'modernaMadeira', bevel=0.0))
        for z in (0.56, 1.34):
            p.append(box((0.022, 0.06, 0.03), (xb, -0.395, z), 'modernaMadeira', bevel=0.0))
    return p + classica[2:]


def montar(estilo):
    comecar(estilo, COR[estilo])
    nos = {'geladeira': corpo(estilo) + g.miolo_da_geladeira(), 'porta': (porta(estilo), g.pivo_porta())}
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {'nos': nos, 'clipes': {'abrir': g.ABRIR}, 'grupo': 'geladeira', 'uv': True}


if __name__ == '__main__':
    rodar_estilos('geladeira', montar)
