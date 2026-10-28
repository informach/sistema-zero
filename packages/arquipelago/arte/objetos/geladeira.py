"""A geladeira, nas duas versões do projeto azul (footprint 1 × 1, frente para -Y).

- `geladeira-holograma`: a que vem do primeiro pedido da ilha. Nós `projetor` (a base escura com
  as luzes azuis), `geladeira` (o corpo em holograma, com as prateleiras e a grade da planificação)
  e `porta` (pivô na dobradiça, clipe `abrir`). Materiais `projetoAzul` (faces translúcidas que
  brilham) e `projetoAzulLinha` (contorno e linhas da grade, mais fortes).
- `geladeira`: a completa, com aparência. Nós `geladeira` (corpo oco de quinas arredondadas, com
  prateleiras, gaveta, luz e alimentos) e `porta` (puxador, prateleiras da porta e garrafas; pivô
  na dobradiça, clipe `abrir`). As faces que o Pinta pinta são planas e retangulares, cada uma com
  material próprio e coordenadas de textura de 0 a 1: `pintaFrente` (na porta), `pintaLadoEsq`,
  `pintaLadoDir` e `pintaTopo`. Medidas no README.
"""
from lib_objetos import *

# Medidas comuns às duas versões (o holograma é o "desenho" da completa).
L, F, A = 0.82, 0.66, 1.70     # corpo: largura, fundo, altura (sem a porta)
E = 0.09                        # espessura da porta
PE = 0.045                      # altura dos pezinhos (o corpo começa aqui)
RAIO = 0.06                     # raio das quinas do corpo e da porta
Y_FRENTE = -0.375 + E           # frente do corpo (onde a porta encosta)
Y_FUNDO = 0.375                 # fundo do corpo
YC = (Y_FRENTE + Y_FUNDO) / 2
X_DOBRA = -L / 2                # dobradiça à esquerda; o puxador fica à direita
PAREDE = 0.05
Z_PORTA = 0.15                  # a porta começa aqui; embaixo dela fica o rodapé com a grade
BASE = 0.13                     # fundo do miolo (acima do rodapé)
PRATELEIRAS = (0.45, 0.84, 1.22)
# A porta abre para a esquerda: 0,75 s (18 quadros), toca uma vez e para aberta em -105°.
ABRIR = {'porta': {'rotation_euler': [(0, (0, 0, 0)), (6, (0, 0, R(-38))), (14, (0, 0, R(-112))),
                                      (18, (0, 0, R(-105)))]}}


def pivo_porta():
    return (X_DOBRA, -0.375, Z_PORTA)


# ---------------------------------------------------------------- completa
def corpo():
    zc = PE + A / 2
    c = caixa_redonda((L, F, A), (0, YC, zc), 'geladeira', raio=RAIO, segs=4)
    # Miolo: tudo menos as paredes, aberto na frente.
    fm = F - PAREDE + 0.2
    am = A - PAREDE - BASE
    miolo = box((L - 2 * PAREDE, fm, am), (0, Y_FRENTE - 0.2 + fm / 2, PE + BASE + am / 2), 'geladeiraDentro',
                bevel=0.02, segs=2)
    booleana(c, miolo)
    zt, zb = PE + A, PE
    lim_x = L / 2 - 0.04

    def regra(ct, n):
        if abs(ct.x) < lim_x and zb + 0.04 < ct.z < zt - 0.04 and Y_FRENTE + 0.002 < ct.y < Y_FUNDO - 0.04:
            return 'geladeiraDentro'
        if n.x < -0.999:
            return 'pintaLadoEsq'
        if n.x > 0.999:
            return 'pintaLadoDir'
        if n.z > 0.999 and ct.z > zt - 0.01:
            return 'pintaTopo'
        return None
    pintar_por(c, regra)
    # Faces pintáveis: u para a direita e v para cima de quem olha a face de fora (o topo, visto
    # de cima, com a frente embaixo).
    uv_plano(c, {'pintaLadoEsq'}, (0, -1, 0), (0, 0, 1))
    uv_plano(c, {'pintaLadoDir'}, (0, 1, 0), (0, 0, 1))
    uv_plano(c, {'pintaTopo'}, (1, 0, 0), (0, 1, 0))
    p = [c]
    # Pezinhos redondos.
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl(0.035, PE + 0.01, (sx * (L / 2 - 0.09), YC + sy * (F / 2 - 0.1), (PE + 0.01) / 2),
                         'plastico', verts=10))
    # Rodapé embaixo da porta: grade de respiro com frisos cromados.
    yg = Y_FRENTE - 0.012
    p.append(box((L - 0.2, 0.02, 0.07), (0, yg + 0.004, PE + 0.055), 'geladeiraFrisos', bevel=0.01, segs=2))
    for k in range(5):
        p.append(box((L - 0.26, 0.012, 0.008), (0, yg - 0.008, PE + 0.031 + 0.012 * k), 'cromado', bevel=0.003,
                     segs=1))
    return p


def miolo_da_geladeira():
    """Prateleiras de vidro, a gaveta de legumes, a luz e os alimentos."""
    p = []
    xi = L / 2 - PAREDE           # parede de dentro
    y0 = Y_FRENTE + 0.13           # as prateleiras deixam lugar para as da porta
    y1 = Y_FUNDO - PAREDE
    fundo = y1 - y0
    yc = (y0 + y1) / 2
    for z in PRATELEIRAS:
        p.append(box((2 * xi + 0.02, fundo, 0.018), (0, yc, z), 'prateleira', bevel=0.004, segs=1))
        p.append(box((2 * xi - 0.01, 0.022, 0.03), (0, y0 + 0.006, z + 0.002), 'cromado', bevel=0.006, segs=1))
    # Gaveta de legumes (translúcida) com cenoura e alface.
    zg0 = PE + BASE
    hg = PRATELEIRAS[0] - 0.009 - zg0 - 0.012
    p.append(box((2 * xi - 0.06, fundo - 0.02, hg), (0, yc - 0.01, zg0 + 0.004 + hg / 2), 'gaveta', bevel=0.02,
                 segs=2))
    p.append(box((0.22, 0.02, 0.035), (0, y0 - 0.012, zg0 + hg * 0.72), 'cromado', bevel=0.008, segs=1))
    for k, x in enumerate((-0.2, -0.12)):
        cen = cone(0.028, 0.2, (x, yc + 0.02, zg0 + 0.05), 'cenoura', verts=8, rot=(R(-84), 0, R(10 * k)))
        p.append(cen)
        p.append(cone(0.02, 0.05, (x, yc + 0.125, zg0 + 0.06), 'cabinho', verts=5, rot=(R(-84), 0, 0)))
    for k in range(3):
        p.append(esfera(0.065 - 0.008 * k, (0.1 + 0.07 * k, yc + 0.05 - 0.05 * k, zg0 + 0.07 - 0.008 * k),
                        'folhaAlface' if k % 2 == 0 else 'folhaAlfaceEscura', seg=10, aneis=7))
    # Prateleira de baixo: bolo de fubá no prato, gelatina e caixa de ovos.
    zs = PRATELEIRAS[0] + 0.009
    p.append(cyl(0.11, 0.012, (-0.2, yc, zs + 0.006), 'loucaBranca', verts=20))
    p.append(cyl(0.085, 0.08, (-0.2, yc, zs + 0.012 + 0.04), 'bolo', verts=20))
    p.append(esfera(0.084, (-0.2, yc, zs + 0.092), 'boloTopo', escala=(1, 1, 0.22), seg=20, aneis=6))
    gel = torneado([(0, 0), (0.07, 0), (0.072, 0.01), (0.06, 0.07), (0.035, 0.1), (0, 0.105)], 'gelatina', seg=18)
    gel.location = (0.05, yc + 0.05, zs + 0.012)
    p.append(gel)
    p.append(cyl(0.085, 0.012, (0.05, yc + 0.05, zs + 0.006), 'loucaAzul', verts=18))
    p.append(box((0.2, 0.12, 0.05), (0.24, yc - 0.03, zs + 0.025), 'papelSombra', bevel=0.012, segs=2))
    for k in range(3):
        p.append(esfera(0.026, (0.18 + 0.06 * k, yc - 0.03, zs + 0.06), 'ovo', escala=(1, 1, 1.25), seg=8, aneis=6))
    # Prateleira do meio: caixa de leite, queijo e fruteira com maçãs.
    zs = PRATELEIRAS[1] + 0.009
    p.append(box((0.1, 0.1, 0.2), (-0.24, yc + 0.04, zs + 0.1), 'leite', bevel=0.006, segs=1))
    p.append(prism([(-0.054, 0), (0.054, 0), (0, 0.05)], 0.108, (-0.24, yc + 0.04, zs + 0.2), 'leiteAzul', bevel=0.004))
    p.append(box((0.11, 0.11, 0.06), (-0.24, yc + 0.04, zs + 0.08), 'leiteAzul', bevel=0.006, segs=1))
    queijo = prism([(-0.08, 0), (0.08, 0), (0.06, 0.07)], 0.12, (0.0, yc - 0.02, zs), 'queijo', bevel=0.008)
    p.append(queijo)
    for x, z in ((-0.03, 0.03), (0.035, 0.022)):
        p.append(esfera(0.014, (x, yc - 0.081, zs + z), 'queijoFuro', escala=(1, 0.5, 1), seg=8, aneis=5))
    tig = torneado([(0, 0), (0.05, 0), (0.08, 0.03), (0.1, 0.07), (0.09, 0.072), (0.07, 0.035), (0, 0.025)],
                   'loucaVerde', seg=16)
    tig.location = (0.23, yc + 0.03, zs)
    p.append(tig)
    for k, (dx, dy) in enumerate(((-0.035, -0.02), (0.035, -0.01), (0.0, 0.035))):
        p.append(esfera(0.036, (0.23 + dx, yc + 0.03 + dy, zs + 0.08), 'maca', seg=9, aneis=6))
        p.append(cyl(0.004, 0.025, (0.23 + dx, yc + 0.03 + dy, zs + 0.12), 'cabinho', verts=5))
    # Prateleira de cima: jarra de suco e potinhos.
    zs = PRATELEIRAS[2] + 0.009
    jarra = torneado([(0, 0), (0.06, 0), (0.065, 0.02), (0.065, 0.2), (0.058, 0.205), (0.058, 0.03), (0, 0.03)],
                     'garrafa', seg=14)
    jarra.location = (-0.2, yc + 0.04, zs)
    p.append(jarra)
    suco = cyl(0.056, 0.15, (-0.2, yc + 0.04, zs + 0.03 + 0.075), 'suco', verts=14)
    p.append(suco)
    p.append(lib_q.torus(0.04, 0.01, (-0.2 + 0.085, yc + 0.04, zs + 0.12), 'garrafa', seg=12, rseg=5,
                         rot=(R(90), 0, 0), arc=360))
    for k in range(3):
        x = 0.08 + 0.09 * k
        p.append(cyl(0.035, 0.07, (x, yc - 0.01, zs + 0.035), ('loucaBranca', 'loucaAzul', 'forminha')[k], verts=14))
        p.append(cyl(0.039, 0.012, (x, yc - 0.01, zs + 0.076), ('morango', 'pipocaMiolo', 'erva')[k], verts=14))
    # Luzinha no teto de dentro (o jogo acende ao abrir).
    p.append(esfera(0.05, (0, yc + 0.1, PE + A - PAREDE), 'luz', escala=(1.4, 1, 0.45), seg=12, aneis=5))
    return p


def porta():
    ap = PE + A - Z_PORTA
    zc = Z_PORTA + ap / 2
    yc = -0.375 + E / 2
    d = caixa_redonda((L, E, ap), (0, yc, zc), 'geladeira', raio=RAIO, segs=4)
    pintar_por(d, lambda ct, n: 'pintaFrente' if n.y < -0.999 else None)
    uv_plano(d, {'pintaFrente'}, (1, 0, 0), (0, 0, 1))
    p = [d]
    # Puxador cromado na borda livre (direita).
    xp = L / 2 - 0.085
    yp = -0.375 - 0.05
    p.append(tube([(xp, yp + 0.045, 0.8), (xp, yp + 0.012, 0.84), (xp, yp, 0.92), (xp, yp, 1.2), (xp, yp + 0.012, 1.28),
                   (xp, yp + 0.045, 1.32)], [0.022, 0.024, 0.026, 0.026, 0.024, 0.022], 'cromado', seg=10))
    # Lado de dentro: forro, duas prateleiras de porta e garrafas.
    yi = -0.375 + E
    p.append(box((L - 0.14, 0.024, ap - 0.16), (0, yi + 0.012, zc), 'geladeiraDentro', bevel=0.012, segs=2))
    for z in (0.5, 1.05):
        p.append(box((L - 0.2, 0.095, 0.012), (0, yi + 0.024 + 0.047, z), 'prateleira', bevel=0.004, segs=1))
        p.append(box((L - 0.2, 0.012, 0.09), (0, yi + 0.024 + 0.09, z + 0.045), 'prateleira', bevel=0.004, segs=1))
    yb = yi + 0.024 + 0.045
    for k, (x, m) in enumerate(((-0.24, 'garrafa'), (-0.13, 'suco'), (0.12, 'garrafa'))):
        h = 0.2 if m == 'garrafa' else 0.17
        gar = torneado([(0, 0), (0.035, 0), (0.038, 0.01), (0.038, h * 0.7), (0.016, h * 0.88), (0.014, h), (0, h)],
                       m, seg=10)
        gar.location = (x, yb, 0.506)
        p.append(gar)
        p.append(cyl(0.017, 0.022, (x, yb, 0.506 + h + 0.008), 'tampinha', verts=10))
    p.append(box((0.08, 0.06, 0.14), (0.25, yb, 0.506 + 0.07), 'leite', bevel=0.006, segs=1))
    p.append(box((0.09, 0.07, 0.05), (0.25, yb, 0.506 + 0.09), 'leiteAzul', bevel=0.006, segs=1))
    # Porta de cima: ovinhos na forminha.
    for k in range(4):
        p.append(esfera(0.024, (-0.2 + 0.07 * k, yb, 1.056 + 0.03), 'ovo', escala=(1, 1, 1.25), seg=8, aneis=6))
    return p


def geladeira():
    nos = {'geladeira': corpo() + miolo_da_geladeira(), 'porta': (porta(), pivo_porta())}
    return {'nos': nos, 'clipes': {'abrir': ABRIR}, 'grupo': 'geladeira', 'uv': True}


# ---------------------------------------------------------------- holograma
def contorno(x0, x1, y0, y1, z0, z1, r=0.012, m='projetoAzulLinha'):
    p = []
    for y in (y0, y1):
        for z in (z0, z1):
            p.append(barra((x0, y, z), (x1, y, z), m, r=r, verts=4))
    for x in (x0, x1):
        for z in (z0, z1):
            p.append(barra((x, y0, z), (x, y1, z), m, r=r, verts=4))
        for y in (y0, y1):
            p.append(barra((x, y, z0), (x, y, z1), m, r=r, verts=4))
    for x in (x0, x1):
        for y in (y0, y1):
            for z in (z0, z1):
                p.append(lib_q.sphere(r * 1.5, (x, y, z), m, subdiv=1))
    return p


def grade(origem, eu, ev, lu, lv, passo, r=0.006, m='projetoAzulLinha'):
    """Linhas da grade da planificação numa face: retângulo lu × lv a partir de `origem`, nos eixos
    eu e ev (a face já vem afastada para fora, para as linhas não encostarem nela)."""
    o, eu, ev = Vector(origem), Vector(eu), Vector(ev)
    p = []
    nu = max(1, round(lu / passo))
    nv = max(1, round(lv / passo))
    for i in range(1, nu):
        a = o + eu * (lu * i / nu)
        p.append(barra(a, a + ev * lv, m, r=r, verts=4))
    for j in range(1, nv):
        a = o + ev * (lv * j / nv)
        p.append(barra(a, a + eu * lu, m, r=r, verts=4))
    return p


Z0_HOLO = 0.07   # o holograma flutua sobre o projetor


def holograma_corpo():
    z0 = Z0_HOLO
    zc = z0 + A / 2
    p = [caixa_redonda((L, F, A), (0, YC, zc), 'projetoAzul', raio=RAIO, segs=2)]
    # A frente do contorno fica um pouco atrás da porta (o contorno da porta tem o dela).
    p += contorno(-L / 2, L / 2, Y_FRENTE + 0.03, Y_FUNDO, z0, z0 + A)
    fora = 0.016
    # Grade nas faces que o Pinta pinta (os lados e o topo; a frente está na porta).
    for s in (-1, 1):
        x = s * (L / 2 + fora)
        p += grade((x, Y_FRENTE + RAIO, z0 + RAIO), (0, 1, 0), (0, 0, 1), F - 2 * RAIO, A - 2 * RAIO, 0.2)
    p += grade((-L / 2 + RAIO, Y_FRENTE + RAIO, z0 + A + fora), (1, 0, 0), (0, 1, 0), L - 2 * RAIO, F - 2 * RAIO, 0.2)
    # Prateleiras de dentro, só o contorno da frente (o holograma "mostra" para que serve).
    for z in PRATELEIRAS:
        zz = z - PE + z0
        p.append(barra((-L / 2 + PAREDE, Y_FRENTE + 0.14, zz), (L / 2 - PAREDE, Y_FRENTE + 0.14, zz), 'projetoAzulLinha',
                       r=0.008, verts=4))
    # Rodapé com a grade de respiro (embaixo da porta).
    for k in range(3):
        zz = z0 + 0.035 + 0.025 * k
        p.append(barra((-L / 2 + 0.12, Y_FRENTE - 0.02, zz), (L / 2 - 0.12, Y_FRENTE - 0.02, zz), 'projetoAzulLinha',
                       r=0.007, verts=4))
    return p


def holograma_porta():
    z0 = Z0_HOLO + Z_PORTA - PE
    ap = PE + A - Z_PORTA
    zc = z0 + ap / 2
    yc = -0.375 + E / 2
    p = [caixa_redonda((L, E, ap), (0, yc, zc), 'projetoAzul', raio=RAIO, segs=2)]
    p += contorno(-L / 2, L / 2, -0.375, -0.375 + E, z0, z0 + ap, r=0.011)
    p += grade((-L / 2 + RAIO, -0.375 - 0.016, z0 + RAIO), (1, 0, 0), (0, 0, 1), L - 2 * RAIO, ap - 2 * RAIO, 0.2)
    z0 = Z0_HOLO
    xp = L / 2 - 0.085
    p.append(barra((xp, -0.42, 0.8 - PE + z0), (xp, -0.42, 1.3 - PE + z0), 'projetoAzulLinha', r=0.02, verts=6))
    for z in (0.83, 1.27):
        zz = z - PE + z0
        p.append(barra((xp, -0.42, zz), (xp, -0.375 - 0.004, zz), 'projetoAzulLinha', r=0.012, verts=6))
    return p


def projetor():
    p = []
    w, f = L + 0.14, 0.86
    # Retângulo de cantos redondos (superelipse) para a base acompanhar a geladeira.
    pts = []
    for k in range(40):
        a = 2 * math.pi * k / 40
        c, s = math.cos(a), math.sin(a)
        pts.append((w / 2 * math.copysign(abs(c) ** 0.4, c), f / 2 * math.copysign(abs(s) ** 0.4, s)))
    p.append(slab(pts, 0, 0.045, 'projetor', bevel=0.015, segs=2))
    inner = [(x * 0.9, y * 0.88) for x, y in pts]
    p.append(slab(inner, 0.04, 0.052, 'projetorLuz'))
    inner2 = [(x * 0.84, y * 0.8) for x, y in pts]
    p.append(slab(inner2, 0.045, 0.058, 'projetor'))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(lib_q.sphere(0.03, (sx * (w / 2 - 0.06), sy * (f / 2 - 0.06), 0.05), 'projetorLuz', subdiv=1,
                                  scale=(1, 1, 0.6)))
    return p


def pivo_holo():
    return (X_DOBRA, -0.375, Z0_HOLO + Z_PORTA - PE)


def geladeira_holograma():
    nos = {'projetor': projetor(), 'geladeira': holograma_corpo(), 'porta': (holograma_porta(), pivo_holo())}
    return {'nos': nos, 'clipes': {'abrir': ABRIR}, 'grupo': 'geladeira'}


ITENS = [('geladeira', geladeira), ('geladeira-holograma', geladeira_holograma)]

if __name__ == '__main__':
    rodar(ITENS)
