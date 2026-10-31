"""A casinha de bicho retro e a moderna da galeria (31/10/2026): `casinha-retro` e `casinha-moderna`.

Os nós `casinha`, `placa` e `texto` da clássica (`casinha.py`), a plaquinha do nome no mesmo lugar
(a face lisa `placaFace` é a dela), o mesmo miolo (a almofada), o tapetinho com os potes (a água em
`agua`) e o ossinho. As paredes têm as medidas da clássica, então as faces do Pinta (frente com a
porta e os dois lados) têm o mesmo tamanho, e a porta deixa passar o cachorro adulto (0,42 × 0,51).

- retro (paleta Doces): paredes pêssego, telhado de abóbada redonda azul com três frisos brancos,
  colunas redondas nas quinas, a porta em arco com o debrum branco e a janela redonda de escotilha.
- moderna: paredes vermelhas de quina viva, telhado de uma água só em madeira clara, pilares
  quadrados de madeira nas quinas, a porta retangular com batente de madeira e a janela quadrada.
"""
from lib_estilos import *  # noqa: F403

import casinha as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

COR = {'retro': 'docesPessego', 'moderna': 'modernaVermelho'}
MAPA = {
    'retro': {'portaCasinha': 'docesNoite', 'placa': 'docesCastanho', 'metalEscuro': 'docesNoite',
              'almofada': 'docesCeu', 'almofadaBorda': 'docesAzul', 'tapete': 'docesAmarelo', 'potinho': 'docesRosa',
              'potinhoAzul': 'docesCeu', 'racao': 'docesCastanho', 'osso2': 'docesBranco'},
    'moderna': {'portaCasinha': 'modernaGrafite', 'placa': 'modernaMadeira', 'metalEscuro': 'modernaGrafite',
                'almofada': 'modernaBranco', 'almofadaBorda': 'modernaGrafite', 'tapete': 'modernaMadeira'},
}
# Telhado de abóbada da retro: raios de fora e de dentro (x, z), a partir do alto das paredes.
ABOBADA = ((0.6, 0.52), (0.49, 0.44))
# Telhado da moderna: alto da frente e do fundo, e a espessura.
UMA_AGUA = (0.95, 1.195, 0.05)
BEIRAL = 0.125


def contorno_porta_reta(folga=0.0):
    r = g.PORTA_L / 2 + folga
    return arredondar_contorno([(-r, -0.1), (r, -0.1), (r, 0.51 + folga), (-r, 0.51 + folga)], 0.03, n=4)


def paredes(estilo):
    retro = estilo == 'retro'
    m = COR[estilo]
    CX, CY, L, F, H, Z0, EP = g.CX, g.CY, g.L, g.F, g.H, g.Z0, g.EP
    c = box((L, F, H), (CX, CY, Z0 + H / 2), m, bevel=0.01, segs=2 if retro else 1)
    miolo = box((L - 2 * EP, F - 2 * EP, H), (CX, CY, Z0 + H / 2 + 0.02), m, bevel=0.0)
    booleana(c, miolo)
    booleana(c, prism(g.contorno_porta() if retro else contorno_porta_reta(), 0.3, (CX, g.Y_FRENTE, Z0), m))
    xi, yi = L / 2 - EP + 0.002, F / 2 - EP + 0.002

    def por_dentro(ct, n):
        if not (abs(ct.x - CX) < xi and abs(ct.y - CY) < yi):
            return None
        if abs(n.z) < 0.5 and n.dot(Vector((ct.x - CX, ct.y - CY, 0))) < 0:
            return 'portaCasinha'
        if n.z > 0.5 and ct.z < Z0 + 0.03:
            return 'portaCasinha'
        return None
    pintar_por(c, por_dentro)

    def por_fora(ct, n):
        if n.y < -0.999 and ct.y < g.Y_FRENTE + 0.002:
            return 'pintaFrente'
        if n.x < -0.999 and ct.x < CX - L / 2 + 0.002:
            return 'pintaLadoEsq'
        if n.x > 0.999 and ct.x > CX + L / 2 - 0.002:
            return 'pintaLadoDir'
        return None
    pintar_por(c, por_fora)
    uv_plano(c, {'pintaFrente'}, (1, 0, 0), (0, 0, 1))
    uv_plano(c, {'pintaLadoEsq'}, (0, -1, 0), (0, 0, 1))
    uv_plano(c, {'pintaLadoDir'}, (0, 1, 0), (0, 0, 1))
    p = [c]
    xj = CX + L / 2
    if retro:
        # Colunas redondas nas quinas.
        for sx in (-1, 1):
            for sy in (-1, 1):
                p.append(cyl(0.045, H + 0.02, (CX + sx * (L / 2 - 0.025), CY + sy * (F / 2 - 0.025), Z0 + H / 2),
                             'docesBranco', verts=16))
        # Debrum redondo no arco da porta (o da clássica, em branco).
        r = g.PORTA_L / 2 + 0.03
        n = 12
        pts = [(CX - r, g.Y_FRENTE - 0.012, Z0), (CX - r, g.Y_FRENTE - 0.012, Z0 + g.PORTA_RETO)]
        for k in range(1, n):
            a = math.pi - math.pi * k / n
            pts.append((CX + r * math.cos(a), g.Y_FRENTE - 0.012, Z0 + g.PORTA_RETO + r * math.sin(a)))
        pts += [(CX + r, g.Y_FRENTE - 0.012, Z0 + g.PORTA_RETO), (CX + r, g.Y_FRENTE - 0.012, Z0)]
        p.append(tube(pts, [0.026] * len(pts), 'docesBranco', seg=8))
        # Janela redonda de escotilha do lado direito.
        vidro = prism(circulo(0.085, 24), 0.01, (0, 0, 0), 'docesNoite')
        vidro.rotation_euler = (0, 0, R(90))
        vidro.location = (xj + 0.004, g.Y_JANELA, g.Z_JANELA)
        p.append(vidro)
        p.append(lib_q.torus(0.092, 0.016, (xj + 0.004, g.Y_JANELA, g.Z_JANELA), 'docesBranco', seg=24, rseg=6,
                             rot=(0, R(90), 0)))
        p.append(caixa_redonda((L + 0.1, F + 0.1, Z0), (CX, CY, Z0 / 2), 'docesCreme', raio=0.025, segs=3))
    else:
        for sx in (-1, 1):
            for sy in (-1, 1):
                y = CY + sy * (F / 2 - 0.02)
                # Do estrado (entra 4 mm nele) até 1 cm dentro do telhado.
                z0, z1 = Z0 - 0.004, telhado_embaixo(y) + 0.01
                p.append(box((0.06, 0.06, z1 - z0), (CX + sx * (L / 2 - 0.02), y, (z0 + z1) / 2), 'modernaMadeira',
                             bevel=0.0))
        # Batente de madeira em volta da porta (1 cm para fora do vão, sem face no mesmo plano dele).
        bat = box((g.PORTA_L + 0.12, 0.02, 0.62), (CX, g.Y_FRENTE - 0.004, Z0 - 0.004 + 0.31), 'modernaMadeira',
                  bevel=0.0)
        booleana(bat, prism(contorno_porta_reta(0.01), 0.2, (CX, g.Y_FRENTE, Z0 - 0.05), 'modernaMadeira'))
        p.append(bat)
        # Janela quadrada com moldura de madeira, do lado direito.
        p.append(box((0.01, 0.16, 0.16), (xj + 0.005, g.Y_JANELA, g.Z_JANELA), 'modernaGrafite', bevel=0.0))
        mold = box((0.016, 0.22, 0.22), (xj + 0.004, g.Y_JANELA, g.Z_JANELA), 'modernaMadeira', bevel=0.0)
        booleana(mold, box((0.1, 0.17, 0.17), (xj, g.Y_JANELA, g.Z_JANELA), 'modernaMadeira', bevel=0.0))
        p.append(mold)
        # Estrado um pouco menor que o da clássica: a quina viva não encosta no tapetinho no chão.
        p.append(box((L + 0.05, F + 0.05, Z0), (CX, CY, Z0 / 2), 'modernaGrafite', bevel=0.0))
    return p


def circulo(r, n):
    return [(r * math.cos(2 * math.pi * k / n), r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def telhado_retro():
    CX, CY, ZT = g.CX, g.CY, g.ZT
    (ox, oz), (ix, iz) = ABOBADA
    n = 20
    fora = [(ox * math.cos(math.pi * k / n), oz * math.sin(math.pi * k / n)) for k in range(n + 1)]
    dentro = [(ix * math.cos(math.pi * k / n), iz * math.sin(math.pi * k / n)) for k in range(n, -1, -1)]
    comp = g.F + 0.26          # o beiral passa 13 cm na frente e atrás (a caixa da clássica)
    arco = prism(fora + dentro, comp, (CX, CY, ZT), 'docesAzul')
    for f in arco.data.polygons:     # a curva lisa; as pontas e a base, retas
        f.use_smooth = abs(f.normal.y) < 0.5 and abs(f.normal.z) < 0.999
    p = [arco]
    # Três frisos brancos por cima da abóbada (as pontas ficam 1 cm acima da base do telhado).
    for dy in (-0.5, 0.0, 0.5):
        pts = []
        for k in range(1, n):
            a = math.pi * k / n
            pts.append((CX + ox * math.cos(a), CY + dy, ZT + oz * math.sin(a)))
        p.append(tube(pts, [0.02] * len(pts), 'docesBranco', seg=6))
    # Oitões em meia elipse, na frente e atrás (afastados 6 mm para fora, como os da clássica).
    # A base entra 4 mm na parede: assim não fica no plano da base da abóbada.
    meia = [((ix + 0.009) * math.cos(math.pi * k / n), (iz + 0.019) * math.sin(math.pi * k / n)) for k in range(n + 1)]
    for y in (g.Y_FRENTE + g.EP / 2 - 0.006, CY + g.F / 2 - g.EP / 2 + 0.006):
        p.append(prism(meia, g.EP, (CX, y, ZT - 0.004), COR['retro']))
    return p


def telhado_embaixo(y):
    """Altura de baixo do telhado de uma água da moderna na profundidade y."""
    yf, yt = g.Y_FRENTE - BEIRAL, g.CY + g.F / 2 + BEIRAL
    zf, zt, e = UMA_AGUA
    t = (y - yf) / (yt - yf)
    ang = math.atan2(zt - zf, yt - yf)
    return zf + (zt - zf) * t - e / math.cos(ang)


def telhado_moderna():
    CX, CY, ZT, L, F, EP = g.CX, g.CY, g.ZT, g.L, g.F, g.EP
    yf, yt = g.Y_FRENTE - BEIRAL, CY + F / 2 + BEIRAL
    zf, zt, e = UMA_AGUA
    ang = math.atan2(zt - zf, yt - yf)
    comp = math.hypot(yt - yf, zt - zf)
    # A placa do telhado, feita deitada e girada para cair para a frente.
    t = box((L + 0.19, comp, e), (0, 0, 0), 'modernaMadeira', bevel=0.0)
    bpy.context.view_layer.update()
    meio = Vector((CX, (yf + yt) / 2, (zf + zt) / 2 - e / 2 / math.cos(ang)))
    t.matrix_world = Matrix.Translation(meio) @ Matrix.Rotation(ang, 4, 'X') @ t.matrix_world
    p = [t]
    # Fechamentos acima das paredes até o telhado, 6 mm para fora delas (sem face no mesmo plano).
    y0, y1 = g.Y_FRENTE, CY + F / 2
    for y, z in ((y0 + EP / 2 - 0.006, telhado_embaixo(y0)), (y1 - EP / 2 + 0.006, telhado_embaixo(y1))):
        topo = z - ZT + 0.02
        p.append(prism([(-L / 2 + 0.03, 0), (L / 2 - 0.03, 0), (L / 2 - 0.03, topo), (-L / 2 + 0.03, topo)],
                       EP, (CX, y, ZT), COR['moderna']))
    for s in (-1, 1):
        ya, yb = y0 + 0.05, y1 - 0.05
        lado = prism([(ya - CY, 0), (yb - CY, 0), (yb - CY, telhado_embaixo(yb) - ZT + 0.02),
                      (ya - CY, telhado_embaixo(ya) - ZT + 0.02)], EP, (0, 0, 0), COR['moderna'])
        lado.rotation_euler = (0, 0, R(90))
        lado.location = (CX + s * (L / 2 - EP / 2 + 0.006), CY, ZT)
        p.append(lado)
    return p


def montar(estilo):
    comecar(estilo, COR[estilo])
    placa, texto = g.placa_e_texto()
    telhado = telhado_retro() if estilo == 'retro' else telhado_moderna()
    nos = {'casinha': paredes(estilo) + telhado + g.miolo() + g.potes(), 'placa': placa, 'texto': texto}
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {'nos': nos, 'grupo': 'casinha', 'uv': True}


if __name__ == '__main__':
    rodar_estilos('casinha', montar)
