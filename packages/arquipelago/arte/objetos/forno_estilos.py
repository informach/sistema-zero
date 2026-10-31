"""O forno retro e o moderno da galeria (31/10/2026): `forno-retro` e `forno-moderna`.

As medidas, os nós `forno` e `porta` (pivô na dobradiça, embaixo na frente), o clipe `abrir`, a luz
de dentro e as faces do Pinta são os da clássica (`forno.py`); o miolo (grade, trilhos, luz e o bolo
de fubá na forma) é o dela.

- retro (paleta Doces): fogão amarelo-manteiga de quinas macias, porta com a janela redonda de
  escotilha e aro branco, botões redondos rosa, mesa branca com as bocas e grelhas redondas, espelho
  de trás de pontas arredondadas com o relógio, pezinhos de bolinha.
- moderna: corpo vermelho de quina viva com as faces do Pinta em placas lisas nos lados, porta de
  chanfro reto com a janela retangular, cooktop de vidro grafite com as bocas em anéis finos,
  botões e puxador de madeira clara, espelho de trás de madeira com o relógio e rodapé recuado.
"""
from lib_estilos import *  # noqa: F403

import forno as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

COR = {'retro': 'docesAmarelo', 'moderna': 'modernaVermelho'}
MAPA = {
    'retro': {'fornoDentro': 'docesNoite', 'grade': 'docesBranco', 'cromado': 'docesBranco', 'forma': 'docesCastanho',
              'bolo': 'docesAmarelo', 'boloTopo': 'docesPessego'},
    'moderna': {'fornoDentro': 'modernaGrafite', 'grade': 'modernaAco', 'cromado': 'modernaAco', 'forma': 'modernaAco'},
}


def corpo(estilo):
    m = COR[estilo]
    retro = estilo == 'retro'
    tam, centro = (g.L, g.F, g.A - g.PE), (0, g.YC, g.PE + (g.A - g.PE) / 2)
    c = caixa_redonda(tam, centro, m, raio=0.045, segs=5) if retro else caixa_viva(tam, centro, m, chanfro=0.006)
    fm = g.F - 0.06 + 0.2
    miolo = box((g.L_MIOLO, fm, g.A_MIOLO), (0, g.Y_FRENTE - 0.2 + fm / 2, g.Z_MIOLO + g.A_MIOLO / 2), 'fornoDentro',
                bevel=0.02, segs=2)
    booleana(c, miolo)
    lim = g.L_MIOLO / 2 + 0.002

    def regra(ct, n):
        if abs(ct.x) < lim and g.Z_MIOLO - 0.002 < ct.z < g.Z_MIOLO + g.A_MIOLO + 0.002 and ct.y > g.Y_FRENTE + 0.002:
            return 'fornoDentro'
        if not retro:
            return None
        if n.x < -0.999 and ct.x < -g.L / 2 + 0.01:
            return 'pintaLadoEsq'
        if n.x > 0.999 and ct.x > g.L / 2 - 0.01:
            return 'pintaLadoDir'
        return None
    pintar_por(c, regra)
    p = [c]
    zl = g.PE + (g.A - g.PE) / 2
    yf = g.Y_FRENTE
    if retro:
        uv_plano(c, {'pintaLadoEsq'}, (0, -1, 0), (0, 0, 1))
        uv_plano(c, {'pintaLadoDir'}, (0, 1, 0), (0, 0, 1))
        for sx in (-1, 1):
            for sy in (-1, 1):
                p.append(esfera(0.03, (sx * (g.L / 2 - 0.08), g.YC + sy * (g.F / 2 - 0.09), 0.03), 'docesBranco',
                                seg=12,
                                aneis=8))
        p.append(caixa_redonda((g.L - 0.1, 0.02, 0.05), (0, yf - 0.006, g.PE + 0.035), 'docesBranco', raio=0.012,
                               segs=3))
        # O painel dos botões, de pontas redondas, e cinco botões redondos com o risquinho.
        p.append(caixa_redonda((g.L - 0.06, 0.02, 0.2), (0, yf - 0.006, 0.735), 'docesBranco', raio=0.045, segs=4))
        for k in range(5):
            x = -0.26 + 0.13 * k
            p.append(cyl(0.036, 0.03, (x, yf - 0.03, 0.735), 'docesRosa', verts=18, rot=(R(90), 0, 0)))
            p.append(esfera(0.034, (x, yf - 0.045, 0.735), 'docesRosa', escala=(1, 0.45, 1), seg=16, aneis=8))
            p.append(box((0.01, 0.012, 0.03), (x, yf - 0.06, 0.75), 'docesNoite', bevel=0.003, segs=1))
    else:
        p.append(placa_pintavel('pintaLadoEsq', '-X', (-g.L / 2, g.YC, zl), 0.53, 0.72, m))
        p.append(placa_pintavel('pintaLadoDir', '+X', (g.L / 2, g.YC, zl), 0.53, 0.72, m))
        p.append(box((g.L - 0.08, g.F - 0.08, g.PE + 0.006), (0, g.YC, (g.PE + 0.006) / 2), 'modernaGrafite',
                     bevel=0.0))
        # Faixa grafite dos botões e cinco botões de madeira clara, chatos, com o risco branco.
        p.append(box((g.L - 0.04, 0.02, 0.16), (0, yf - 0.004, 0.735), 'modernaGrafite', bevel=0.0))
        for k in range(5):
            x = -0.26 + 0.13 * k
            p.append(cyl(0.028, 0.03, (x, yf - 0.024, 0.735), 'modernaMadeira', verts=16, rot=(R(90), 0, 0)))
            p.append(box((0.006, 0.006, 0.026), (x, yf - 0.04, 0.745), 'modernaBranco', bevel=0.0))
    return p


def mesa_e_bocas(estilo):
    p = []
    retro = estilo == 'retro'
    z = g.A + 0.02
    if retro:
        p.append(caixa_redonda((g.L - 0.04, g.F - 0.06, 0.02), (0, g.YC - 0.01, g.A + 0.01), 'docesBranco', raio=0.008,
                               segs=2))
    else:
        p.append(box((g.L - 0.02, g.F - 0.04, 0.02), (0, g.YC - 0.01, g.A + 0.01), 'modernaGrafite', bevel=0.0))
    for x in (-0.18, 0.18):
        for y, r in ((g.YC - 0.13, 0.085), (g.YC + 0.12, 0.072)):
            if retro:
                p.append(cyl(r * 0.78, 0.016, (x, y, z + 0.008), 'docesNoite', verts=20))
                p.append(esfera(r * 0.5, (x, y, z + 0.016), 'docesNoite', escala=(1, 1, 0.45), seg=16, aneis=6))
                p.append(lib_q.torus(r, 0.009, (x, y, z + 0.035), 'docesNoite', seg=20, rseg=6))
                for a in range(4):
                    ang = R(45 + 90 * a)
                    c0 = Vector((x + math.cos(ang) * r * 0.45, y + math.sin(ang) * r * 0.45, z + 0.04))
                    c1 = Vector((x + math.cos(ang) * r * 1.08, y + math.sin(ang) * r * 1.08, z + 0.035))
                    p.append(barra(c0, c1, 'docesNoite', r=0.007, verts=6))
                    p.append(cyl(0.009, 0.035, (c1.x, c1.y, z + 0.0175), 'docesNoite', verts=6))
            else:
                # Indução: dois anéis finos em cima do vidro.
                for rr in (r, r * 0.6):
                    p.append(lib_q.torus(rr, 0.003, (x, y, z), 'modernaAco', seg=28, rseg=4))
    return p


def espelho(estilo):
    p = []
    yr = g.Y_FUNDO - 0.05
    if estilo == 'retro':
        pts = arredondar_contorno([(-g.L / 2, g.A - 0.01), (g.L / 2, g.A - 0.01), (g.L / 2, g.A + 0.2),
                                   (-g.L / 2, g.A + 0.2)], 0.09, n=6)
        p.append(prism(pts, 0.05, (0, g.Y_FUNDO - 0.025, 0), COR['retro'], bevel=0.008))
        p.append(cyl(0.065, 0.02, (0, yr - 0.005, g.A + 0.11), 'docesBranco', verts=24, rot=(R(90), 0, 0), bevel=0.006))
        p.append(lib_q.torus(0.065, 0.009, (0, yr - 0.013, g.A + 0.11), 'docesRosa', seg=24, rseg=6, rot=(R(90), 0, 0)))
        p.append(box((0.008, 0.006, 0.045), (0, yr - 0.018, g.A + 0.13), 'docesNoite', bevel=0.002, segs=1))
        pont = box((0.008, 0.006, 0.035), (0.0, yr - 0.018, g.A + 0.11), 'docesNoite', bevel=0.002, segs=1)
        pont.rotation_euler = (0, R(-60), 0)
        pont.location = (0.015, yr - 0.018, g.A + 0.1)
        p.append(pont)
        for s in (-1, 1):
            p.append(esfera(0.022, (s * 0.25, yr - 0.008, g.A + 0.11), 'docesRosa', escala=(1, 0.7, 1), seg=12,
                            aneis=6))
    else:
        p.append(box((g.L, 0.04, 0.195), (0, g.Y_FUNDO - 0.02, g.A + 0.1025), 'modernaMadeira', bevel=0.0))
        p.append(box((0.16, 0.012, 0.06), (0, g.Y_FUNDO - 0.044, g.A + 0.12), 'modernaGrafite', bevel=0.0))
        p.append(box((0.1, 0.004, 0.024), (0, g.Y_FUNDO - 0.0525, g.A + 0.12), 'luz', bevel=0.0))
    return p


def porta(estilo):
    yc = g.Y_FRENTE - g.EP / 2 - 0.002
    zc = g.Z_PORTA + g.A_PORTA / 2
    yfr = g.Y_FRENTE - g.EP
    yp = yfr - 0.05
    zp = g.Z_PORTA + g.A_PORTA - 0.045
    if estilo == 'retro':
        d = caixa_redonda((g.L - 0.06, g.EP, g.A_PORTA), (0, yc, zc), COR['retro'], raio=0.022, segs=4)
        zj = zc - 0.01
        furo = cyl(0.11, g.EP + 0.1, (0, yc, zj), COR['retro'], verts=32, rot=(R(90), 0, 0))
        booleana(d, furo)
        pintar_face(d, 'pintaFrente', '-Y', filtro=lambda c: c.y < yc - g.EP / 2 + 0.002)
        p = [d]
        p.append(cyl(0.115, 0.01, (0, yc, zj), 'vidroForno', verts=32, rot=(R(90), 0, 0)))
        p.append(lib_q.torus(0.116, 0.014, (0, yfr - 0.004, zj), 'docesBranco', seg=32, rseg=8, rot=(R(90), 0, 0)))
        # Puxador redondo de pontas de bolinha.
        p.append(cyl(0.017, 0.5, (0, yp, zp), 'docesBranco', verts=14, rot=(0, R(90), 0)))
        for x in (-0.25, 0.25):
            p.append(lib_q.sphere(0.024, (x, yp, zp), 'docesBranco', subdiv=2))
            p.append(cyl(0.012, 0.05, (x, yp + 0.027, zp), 'docesBranco', verts=10, rot=(R(90), 0, 0)))
    else:
        d = caixa_viva((g.L - 0.06, g.EP, g.A_PORTA), (0, yc, zc), COR['moderna'], chanfro=0.02)
        furo = box((0.5, g.EP + 0.1, 0.22), (0, yc, zc - 0.01), COR['moderna'], bevel=0.0)
        booleana(d, furo)
        pintar_face(d, 'pintaFrente', '-Y', filtro=lambda c: c.y < yc - g.EP / 2 + 0.002)
        p = [d]
        p.append(box((0.51, 0.01, 0.23), (0, yc, zc - 0.01), 'vidroForno', bevel=0.0))
        p.append(box((0.56, 0.03, 0.03), (0, yp, zp), 'modernaMadeira', bevel=0.0))
        for x in (-0.25, 0.25):
            p.append(box((0.024, 0.05, 0.02), (x, yp + 0.035, zp), 'modernaMadeira', bevel=0.0))
    return p


def montar(estilo):
    comecar(estilo, COR[estilo])
    pivo = (0, g.Y_FRENTE - g.EP - 0.002, g.Z_PORTA)
    nos = {'forno': corpo(estilo) + mesa_e_bocas(estilo) + espelho(estilo) + g.miolo(), 'porta': (porta(estilo), pivo)}
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {'nos': nos, 'clipes': {'abrir': g.ABRIR}, 'grupo': 'forno', 'uv': True}


if __name__ == '__main__':
    rodar_estilos('forno', montar)
