"""O museu dos fósseis retro e o moderno da galeria (31/10/2026): `museu-retro` e `museu-moderna`.

Os seis nós soltos da clássica (`museu.py`: `redoma`, `vitrine`, `cranio`, `pegada`, `placa` e
`texto`), cada um com o pivô no meio da própria base e no mesmo lugar da sala. Os fósseis (o ovo, a
amonite, os dentes, o crânio e a pegada) e a face lisa da legenda (`placaFace`) são os da clássica;
as faces do Pinta continuam na frente e nos lados da base da vitrine, do mesmo tamanho.

- retro (paleta Doces): a vitrine de base rosa arredondada em pés redondos que afinam, com o vidro
  de quinas bem redondas e sem caixilho; a coluna torneada, o crânio, a pegada e a placa da
  clássica nas cores da paleta.
- moderna: tudo em blocos de quina viva: a redoma vira um cubo de vidro com tampa de madeira em cima
  de um pedestal branco, a vitrine tem a base de madeira clara de chanfro reto em pés quadrados e o
  vidro com cantoneiras grafite, o crânio e a pegada em pedestais petróleo e branco, e a placa num
  poste quadrado.
"""
from lib_estilos import *  # noqa: F403

import museu as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

COR = {'retro': 'docesRosa', 'moderna': 'modernaMadeira'}
MAPA = {
    'retro': {'pedestal': 'docesBranco', 'pedestalEscuro': 'docesCreme', 'veludoVermelho': 'docesRosa',
              'veludo': 'docesAzul', 'rocha': 'docesLavanda', 'rochaEscura': 'docesRoxo', 'osso': 'docesCreme',
              'ossoSombra': 'docesCastanho', 'amonite': 'docesPessego', 'amoniteClaro': 'docesAmarelo',
              'dente': 'docesBranco', 'fuligem': 'docesNoite', 'moldura': 'docesAmarelo', 'madeira': 'docesCastanho',
              'madeiraEscura': 'docesCastanho', 'metalEscuro': 'docesNoite', 'placa': 'docesCastanho'},
    'moderna': {'pedestal': 'modernaBranco', 'pedestalEscuro': 'modernaGrafite', 'veludo': 'modernaPetroleo',
                'veludoVermelho': 'modernaPetroleo', 'moldura': 'modernaMadeira', 'madeira': 'modernaMadeira',
                'madeiraEscura': 'modernaGrafite', 'placa': 'modernaMadeira', 'metalEscuro': 'modernaGrafite'},
}


def fosseis_da_vitrine(zv):
    """A amonite e os três dentes, no lugar da clássica (`zv` = em cima do veludo)."""
    am = g.amonite('amonite', 'amoniteClaro', escala=1.25)
    mover(am, (-0.2, 0.02, zv + 0.002))
    p = list(am)
    for x, y, ang, c in ((0.04, 0.05, 20, 0.15), (0.18, -0.06, -15, 0.12), (0.3, 0.07, 40, 0.1)):
        d = g.dente(c, 0.03)
        d.rotation_euler = (R(90), 0, R(ang))
        d.location = (x, y, zv + 0.018)
        p.append(d)
    return p


def vitrine(estilo):
    L, F, A = 0.86, 0.48, 0.58
    hv = 0.2
    zt = A
    m = COR[estilo]
    p = []
    if estilo == 'retro':
        base = caixa_redonda((L, F, 0.16), (0, 0, A - 0.08), m, raio=0.02, segs=4)
    else:
        base = caixa_viva((L, F, 0.16), (0, 0, A - 0.08), m, chanfro=0.02)
    pintar_por(base, lambda ct, n: 'pintaFrente' if n.y < -0.999 else 'pintaLadoEsq' if n.x < -0.999
               else 'pintaLadoDir' if n.x > 0.999 else None)
    uv_plano(base, {'pintaFrente'}, (1, 0, 0), (0, 0, 1))
    uv_plano(base, {'pintaLadoEsq'}, (0, -1, 0), (0, 0, 1))
    uv_plano(base, {'pintaLadoDir'}, (0, 1, 0), (0, 0, 1))
    p.append(base)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (L / 2 - 0.06), sy * (F / 2 - 0.06)
            if estilo == 'retro':
                p.append(cyl(0.032, A - 0.15, (x, y, (A - 0.15) / 2 + 0.005), 'docesCastanho', verts=12, r2=0.02))
                p.append(esfera(0.024, (x, y, 0.024), 'docesCastanho', seg=10, aneis=6))
            else:
                p.append(box((0.04, 0.04, A - 0.145), (x, y, (A - 0.145) / 2), 'modernaMadeira', bevel=0.0))
    if estilo == 'retro':
        p.append(caixa_redonda((L - 0.14, F - 0.14, 0.02), (0, 0, 0.12), 'docesCastanho', raio=0.009, segs=2))
        p.append(caixa_redonda((L - 0.06, F - 0.06, 0.03), (0, 0, zt + 0.015), 'veludo', raio=0.012, segs=3))
        p.append(caixa_redonda((L - 0.03, F - 0.03, hv), (0, 0, zt + hv / 2 + 0.006), 'vidro', raio=0.06, segs=5))
    else:
        p.append(box((L - 0.14, F - 0.14, 0.02), (0, 0, 0.12), 'modernaGrafite', bevel=0.0))
        p.append(box((L - 0.06, F - 0.06, 0.03), (0, 0, zt + 0.015), 'veludo', bevel=0.0))
        p.append(box((L - 0.03, F - 0.03, hv), (0, 0, zt + hv / 2 + 0.006), 'vidro', bevel=0.0))
        xe, ye = L / 2 - 0.012, F / 2 - 0.012
        for x in (-xe, xe):
            for y in (-ye, ye):
                p.append(box((0.022, 0.022, hv + 0.014), (x, y, zt + (hv + 0.014) / 2), 'modernaGrafite', bevel=0.0))
    return p + fosseis_da_vitrine(zt + 0.03)


def redoma_moderna():
    classica = g.redoma()
    # Da clássica ficam o ovo e as rachaduras; a coluna, a almofada e a redoma redonda saem.
    apagar(classica[:3] + classica[7:])
    p = classica[3:7]
    zt = 0.88
    p.append(box((0.34, 0.34, zt), (0, 0, zt / 2), 'modernaBranco', bevel=0.0))
    p.append(box((0.38, 0.38, 0.03), (0, 0, zt + 0.015), 'modernaMadeira', bevel=0.0))
    p.append(box((0.1, 0.1, 0.04), (0, 0, zt + 0.025 + 0.02), 'modernaPetroleo', bevel=0.0))
    p.append(box((0.32, 0.32, 0.33), (0, 0, zt + 0.03 + 0.165), 'vidro', bevel=0.0))
    p.append(box((0.34, 0.34, 0.03), (0, 0, zt + 0.36 + 0.015), 'modernaMadeira', bevel=0.0))
    return p


def cranio_moderna():
    classica = g.cranio()
    apagar(classica[:2])
    p = [box((0.46, 0.34, 0.26), (0, 0, 0.13), 'modernaPetroleo', bevel=0.0),
         box((0.4, 0.28, 0.04), (0, 0, 0.28), 'modernaMadeira', bevel=0.0)]
    return p + classica[2:]


def pegada_moderna():
    classica = g.pegada()
    apagar(classica[:2])
    p = [box((0.56, 0.36, 0.2), (0, 0.04, 0.12), 'modernaBranco', bevel=0.0),
         box((0.6, 0.4, 0.03), (0, 0.04, 0.015), 'modernaPetroleo', bevel=0.0)]
    return p + classica[2:]


def placa_e_texto_moderna():
    placa, texto = g.placa_e_texto()
    # A face lisa da legenda é a da clássica; o pedestal vira um poste quadrado e o tampo, quina viva.
    apagar([placa[0], placa[1], placa[3]])
    tampo = placa[2]
    novos = [box((0.26, 0.26, 0.03), (0, 0, 0.015), 'modernaGrafite', bevel=0.0),
             box((0.05, 0.05, 0.79), (0, 0, 0.03 + 0.395), 'modernaPetroleo', bevel=0.0)]
    t = box((0.38, 0.28, 0.03), (0, 0, 0), 'modernaMadeira', bevel=0.0)
    bpy.context.view_layer.update()
    t.matrix_world = Matrix.Translation((0, 0.0, 0.84)) @ Matrix.Rotation(R(35), 4, 'X') @ t.matrix_world
    apagar([tampo])
    return novos + [t], texto


def montar(estilo):
    comecar(estilo, COR[estilo])
    retro = estilo == 'retro'
    pecas = (('redoma', g.redoma if retro else redoma_moderna), ('vitrine', lambda: vitrine(estilo)),
             ('cranio', g.cranio if retro else cranio_moderna), ('pegada', g.pegada if retro else pegada_moderna))
    nos = {}
    for nome, fn in pecas:
        objs = fn()
        x, y, giro = g.LUGARES[nome]
        lib_ilha.place(objs, loc=(x, y, 0), rot_z=giro)
        nos[nome] = (objs, (x, y, 0))
    placa, texto = g.placa_e_texto() if retro else placa_e_texto_moderna()
    x, y, giro = g.LUGARES['placa']
    lib_ilha.place(placa + texto, loc=(x, y, 0), rot_z=giro)
    nos['placa'] = (placa, (x, y, 0))
    nos['texto'] = (texto, (x, y, 0))
    repintar(nos, MAPA[estilo], estilo)
    if retro:
        conferir_doces(nos)
    return {'nos': nos, 'grupo': 'museu', 'uv': True}


if __name__ == '__main__':
    rodar_estilos('museu', montar)
