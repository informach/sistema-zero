"""O aquário retro e o moderno da galeria (31/10/2026): `aquario-retro` e `aquario-moderna`.

O vidro, a água, a areia, as plantas, o baú, a barra de luz, os quatro peixes, as seis bolhas e o
clipe `nadar` são os da clássica (`aquario.py`, montados pela própria função dela); só o móvel muda.
As faces do Pinta têm o tamanho das da clássica (as duas portinhas, uma imagem só, e os lados).

- retro (paleta Doces): móvel azul-céu de quinas macias em quatro pés redondos afinando, tampo creme
  arredondado, portinhas lavanda com puxador de bolinha e três bolhas em cada uma; o aro do vidro
  azul e o miolo nas cores da paleta.
- moderna: móvel de madeira clara de quina viva com as faces dos lados em placas lisas, portinhas e
  tampo verdes de chanfro reto, puxadores em barra grafite, rodapé recuado e o aro grafite.
"""
from lib_estilos import *  # noqa: F403

import aquario as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

COR = {'retro': ('docesCeu', 'docesLavanda'), 'moderna': ('modernaMadeira', 'modernaVerde')}
MAPA = {
    'retro': {'aquarioAro': 'docesRoxo', 'areiaAquario': 'docesCreme', 'peixeLaranja': 'docesPessego',
              'peixeAzul': 'docesAzul', 'peixeAmarelo': 'docesAmarelo', 'peixeRosa': 'docesRosa',
              'peixeRoxo': 'docesRoxo', 'peixeBranco': 'docesBranco', 'olhoPeixe': 'docesNoite',
              'planta': 'docesMenta', 'plantaEscura': 'docesMenta', 'plantaClara': 'docesVerde',
              'pedrinha1': 'docesRosa', 'pedrinha2': 'docesCeu', 'pedrinha3': 'docesBranco', 'pedrinha4': 'docesLilas',
              'pedra': 'docesCastanho', 'pedraClara': 'docesCreme', 'bauMadeira': 'docesCastanho',
              'bauMadeiraClara': 'docesCreme', 'bauFaixa': 'docesAmarelo', 'bauMiolo': 'docesNoite',
              'tesouro': 'docesAmarelo'},
    'moderna': {'aquarioAro': 'modernaGrafite'},
}


def movel(estilo):
    corpo_m, porta_m = COR[estilo]
    retro = estilo == 'retro'
    tam, centro = (g.LM, g.FM, g.AM - 0.11), (0, 0, 0.08 + (g.AM - 0.11) / 2)
    if retro:
        corpo = caixa_redonda(tam, centro, corpo_m, raio=0.035, segs=5)
        pintar_por(corpo, lambda ct, n: 'pintaLadoEsq' if n.x < -0.999 and ct.x < -g.LM / 2 + 0.01
                   else 'pintaLadoDir' if n.x > 0.999 and ct.x > g.LM / 2 - 0.01 else None)
        uv_plano(corpo, {'pintaLadoEsq'}, (0, -1, 0), (0, 0, 1))
        uv_plano(corpo, {'pintaLadoDir'}, (0, 1, 0), (0, 0, 1))
        p = [corpo]
        # Quatro pés redondos que afinam, com a bolinha embaixo.
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (g.LM / 2 - 0.08), sy * (g.FM / 2 - 0.08)
                p.append(cyl(0.034, 0.08, (x, y, 0.05), 'docesBranco', verts=14, r2=0.022))
                p.append(esfera(0.026, (x, y, 0.026), 'docesBranco', seg=12, aneis=7))
        p.append(caixa_redonda((g.LM + 0.03, g.FM + 0.03, 0.045), (0, 0, g.AM - 0.0225), 'docesCreme', raio=0.02,
                               segs=4))
    else:
        corpo = caixa_viva(tam, centro, corpo_m, chanfro=0.004)
        p = [corpo]
        for s, face, n in ((-1, 'pintaLadoEsq', '-X'), (1, 'pintaLadoDir', '+X')):
            p.append(placa_pintavel(face, n, (s * g.LM / 2, 0, centro[2]), 0.55, 0.42, corpo_m))
        p.append(box((g.LM - 0.08, g.FM - 0.08, 0.09), (0, 0, 0.045), 'modernaGrafite', bevel=0.0))
        p.append(box((g.LM + 0.03, g.FM + 0.03, 0.045), (0, 0, g.AM - 0.0225), porta_m, bevel=0.0))
    # Duas portinhas: a frente das duas é uma face só do Pinta.
    portas = []
    for s in (-1, 1):
        x = s * (g.LM / 4 + 0.005)
        tam_p = (g.LM / 2 - 0.08, 0.025, g.AM - 0.24)
        lugar = (x, -g.FM / 2 - 0.006, 0.08 + (g.AM - 0.12) / 2 + 0.005)
        if retro:
            portinha = caixa_redonda(tam_p, lugar, porta_m, raio=0.02, segs=4)
        else:
            portinha = caixa_viva(tam_p, lugar, porta_m, chanfro=0.01125)
        pintar_por(portinha, lambda ct, n: 'pintaFrente' if n.y < -0.999 else None)
        portas.append(portinha)
        yf = -g.FM / 2 - 0.0185
        if retro:
            p.append(lib_q.sphere(0.025, (x - s * (g.LM / 4 - 0.1), -g.FM / 2 - 0.03, 0.36), 'docesBranco', subdiv=2,
                                  scale=(1, 0.7, 1)))
            # Três bolhas em relevo em cada porta.
            for dx, dz, r in ((0.0, 0.0, 0.05), (0.07, 0.07, 0.03), (0.1, -0.03, 0.02)):
                p.append(cyl(r, 0.012, (x + s * dx, -g.FM / 2 - 0.019, 0.31 + dz), 'docesBranco', verts=20,
                             rot=(R(90), 0, 0)))
        else:
            p.append(box((0.016, 0.022, 0.2), (s * 0.09, yf - 0.006, 0.33), 'modernaGrafite', bevel=0.0))
    uv_plano_juntos(portas, {'pintaFrente'}, (1, 0, 0), (0, 0, 1))
    return p + portas


def montar(estilo):
    corpo_m, porta_m = COR[estilo]
    comecar(estilo, corpo_m)
    cor = lib_q.PALETTE[porta_m]
    lib_q.PALETTE['pintaFrente'] = (cor[0], cor[1], None, 0)
    res = g.aquario()
    nos = res['nos']
    # Do aquário da clássica fica tudo menos o móvel.
    apagar(nos['aquario'])
    nos['aquario'] = movel(estilo) + g.vidro() + [g.areia()] + g.decoracao() + g.agua()
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {**res, 'nos': nos, 'grupo': 'aquario'}


if __name__ == '__main__':
    rodar_estilos('aquario', montar)
