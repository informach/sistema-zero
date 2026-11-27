"""Os quatro galpões da Estação de Reciclagem (o cenário da missão 3D e, vistos de cima, os fundos
da missão 2D).

O galpão é um modelo só, na caixa `galpao` (cubo de 100, bloco "Criar o objeto … com o modelo …
tamanho 100" e o objeto em (0, 0, 0)): chão, três esteiras paralelas, a parede do fundo com as três
bocas de onde as peças saem, paredes laterais com janelas, telhado com treliças e luminárias,
pilhas de fardos e caçambas. A planta, no referencial do JOGO (y para cima, frente em -z):

- chão em y = 0; as esteiras têm o topo em y = 0,6, centros em x = -4, 0 e 4, largura 2,7;
- as esteiras vão de z = +9 até a parede do fundo (frente dela em z = -33); as peças nascem em
  z = -34, atrás da cortina de tiras da boca, e saem dela andando para +z;
- o coletor anda em z = 0 sobre as esteiras (o centro dele fica em y = 1,4);
- a câmera da missão é a da Patrulha: (0, 8, 12) olhando (0, 1, -12).

Os materiais são os de sempre (com luz), todos com `szSemSombra`: o galpão RECEBE as sombras do
coletor e das peças, mas não faz sombra (o telhado escureceria tudo). O objeto leva `szSemCaixa`:
não é área de toque nem obstáculo.

    python galpoes.py
    python galpoes.py galpao-tijolo
"""
import math
import sys

from lib_estacao import (R, _obj, bmesh, box, cor, cyl, exportar, juntar, placa, reset, sphere, superellipsoid, torus)

LANES = (-4.0, 0.0, 4.0)
TOPO_ESTEIRA = 0.6
PAREDE_FUNDO = 33.0  # no Blender, y = -z do jogo
X_LATERAL = 30.0


def c(nome, base, emit=None, forca=0.0, rough=0.6):
    cor(nome, base, rough, emit, forca, sem_sombra=True)


def jogo(x, y, z):
    return (x, -z, y)


def chao(p):
    """Placas de concreto em dois tons, uma malha só."""
    bm = bmesh.new()
    me_mats = []
    passo = 6.0
    x0, x1, y0, y1 = -42.0, 42.0, -18.0, 46.0
    nx, ny = int((x1 - x0) / passo), int((y1 - y0) / passo)
    for i in range(nx):
        for j in range(ny):
            xa, ya = x0 + i * passo, y0 + j * passo
            vs = [bm.verts.new((xa, ya, 0)), bm.verts.new((xa + passo, ya, 0)),
                  bm.verts.new((xa + passo, ya + passo, 0)), bm.verts.new((xa, ya + passo, 0))]
            f = bm.faces.new(vs)
            f.material_index = (i + j) % 2
            me_mats.append(f)
    o = _obj('chao', bm, None)
    from lib_espaco import mat
    o.data.materials.append(mat('chaoA'))
    o.data.materials.append(mat('chaoB'))
    return o


def faixa_chao(x0, x1, y0, y1, m, z=0.012):
    return box((x1 - x0, y1 - y0, 0.02), ((x0 + x1) / 2, (y0 + y1) / 2, z), m, bevel=0.0)


def zebrado(x0, x1, y, largura, z=0.014, passo=0.9):
    """Faixa de atenção amarela e preta atravessada no chão (de x0 a x1, centrada em y)."""
    pecas = [faixa_chao(x0, x1, y - largura / 2, y + largura / 2, 'atencao', z)]
    x = x0 + passo / 4
    while x < x1 - passo / 4:
        pecas.append(box((passo / 2, largura * 0.98, 0.022), (x + passo / 4, y, z + 0.004), 'atencaoPreto', bevel=0.0))
        x += passo
    return pecas


def esteira(cx):
    """Uma esteira: lona escura com taliscas, laterais de aço com friso, pés."""
    y0, y1 = -9.0, PAREDE_FUNDO + 1.5
    comp = y1 - y0
    pecas = [box((2.7, comp, 0.14), (cx, (y0 + y1) / 2, TOPO_ESTEIRA - 0.07), 'lona', bevel=0.0)]
    y = y0 + 0.6
    while y < y1 - 0.3:
        pecas.append(box((2.6, 0.12, 0.025), (cx, y, TOPO_ESTEIRA + 0.01), 'talisca', bevel=0.0))
        y += 1.2
    for lado in (-1, 1):
        x = cx + lado * 1.43
        pecas.append(box((0.16, comp, 0.34), (x, (y0 + y1) / 2, TOPO_ESTEIRA - 0.06), 'aco', bevel=0.02))
        pecas.append(box((0.17, comp, 0.05), (x, (y0 + y1) / 2, TOPO_ESTEIRA + 0.12), 'friso', bevel=0.0))
    yy = y0 + 1.5
    while yy < y1:
        for lado in (-1, 1):
            pecas.append(box((0.14, 0.14, TOPO_ESTEIRA - 0.2), (cx + lado * 1.2, yy, (TOPO_ESTEIRA - 0.2) / 2), 'acoEscuro', bevel=0.0))
        yy += 4.0
    return pecas


def divisoria(cx):
    """A chapa entre duas esteiras, com listras de atenção."""
    y0, y1 = -9.0, PAREDE_FUNDO
    pecas = [box((0.9, y1 - y0, 0.1), (cx, (y0 + y1) / 2, TOPO_ESTEIRA + 0.02), 'chapa', bevel=0.0)]
    y = y0 + 0.5
    while y < y1:
        pecas.append(box((0.9, 0.5, 0.012), (cx, y, TOPO_ESTEIRA + 0.075), 'atencao', bevel=0.0))
        y += 1.6
    return pecas


def boca(cx):
    """A boca na parede do fundo: moldura, túnel escuro e a cortina de tiras."""
    y = PAREDE_FUNDO
    pecas = [box((3.4, 3.0, 2.6), (cx, y + 1.5, TOPO_ESTEIRA + 1.1), 'tunel', bevel=0.0)]
    pecas.append(box((3.9, 0.35, 0.35), (cx, y - 0.1, TOPO_ESTEIRA + 2.55), 'moldura', bevel=0.05))
    for lado in (-1, 1):
        pecas.append(box((0.35, 0.35, 2.7), (cx + lado * 1.78, y - 0.1, TOPO_ESTEIRA + 1.2), 'moldura', bevel=0.05))
    for i in range(7):
        x = cx - 1.38 + i * 0.46
        pecas.append(box((0.4, 0.04, 1.85), (x, y - 0.05, TOPO_ESTEIRA + 1.42), 'tira', bevel=0.0))
    pecas.append(sphere(0.18, (cx + 1.2, y - 0.35, TOPO_ESTEIRA + 2.95), 'luzBoca', subdiv=2))
    return pecas


def simbolo_reciclar(centro, raio, m, esp=0.12):
    """O símbolo grande de reciclar na parede (três setas), de pé, virado para -Y."""
    pecas = []
    larg = raio * 0.3
    for k in range(3):
        ang = math.radians(90 + 120 * k)
        a0, a1 = ang - math.radians(40), ang + math.radians(24)
        ext, inn = [], []
        for i in range(9):
            t = a0 + (a1 - a0) * i / 8
            ext.append((math.cos(t) * (raio + larg / 2), math.sin(t) * (raio + larg / 2)))
            inn.append((math.cos(t) * (raio - larg / 2), math.sin(t) * (raio - larg / 2)))
        pc = a1 + math.radians(26)
        ponta = [(math.cos(a1) * (raio + larg * 1.2), math.sin(a1) * (raio + larg * 1.2)),
                 (math.cos(pc) * raio, math.sin(pc) * raio),
                 (math.cos(a1) * (raio - larg * 1.2), math.sin(a1) * (raio - larg * 1.2))]
        for contorno in (ext + list(reversed(inn)), ponta):
            o = placa(contorno, 0, esp, m)
            pecas.append(o)
    s = juntar(pecas, 'simbolo')
    s.rotation_euler = (math.radians(90), 0, 0)
    s.location = centro
    return s


def parede_fundo(v):
    y = PAREDE_FUNDO
    pecas = [box((84, 1.0, 20), (0, y + 0.5, 10), 'parede', bevel=0.0)]
    pecas.append(box((84, 0.2, 1.4), (0, y - 0.05, 0.7), 'rodape', bevel=0.0))
    for z in (5.2, 10.4):
        pecas.append(box((84, 0.16, 0.25), (0, y - 0.05, z), 'frisoParede', bevel=0.0))
    if v.get('tijolo'):
        z = 1.6
        k = 0
        while z < 19.5:
            pecas.append(box((84, 0.1, 0.06), (0, y - 0.02, z), 'rejunte', bevel=0.0))
            z += 0.55
            k += 1
    # janelas altas
    for x in range(-36, 37, 6):
        if abs(x) < 9:
            continue
        pecas.append(box((4.2, 0.18, 3.0), (x, y - 0.05, 15.0), 'janelaMoldura', bevel=0.04))
        pecas.append(box((3.8, 0.2, 2.6), (x, y - 0.06, 15.0), 'janela', bevel=0.0))
        pecas.append(box((0.12, 0.22, 2.6), (x, y - 0.07, 15.0), 'janelaMoldura', bevel=0.0))
    # placa com o símbolo de reciclar
    pecas.append(cyl(4.2, 0.3, (0, y - 0.15, 12.2), 'placaFundo', verts=40, rot=(R(90), 0, 0)))
    pecas.append(torus(4.2, 0.25, (0, y - 0.3, 12.2), 'placaBorda', seg=40, rseg=6, rot=(R(90), 0, 0)))
    pecas.append(simbolo_reciclar((0, y - 0.32, 12.2), 2.6, 'placaSimbolo'))
    for cx in LANES:
        pecas += boca(cx)
    return pecas


def parede_lateral(lado, v):
    x = lado * X_LATERAL
    y0, y1 = -18.0, PAREDE_FUNDO + 1
    comp = y1 - y0
    pecas = [box((1.0, comp, 20), (x + lado * 0.5, (y0 + y1) / 2, 10), 'paredeLado', bevel=0.0)]
    pecas.append(box((0.2, comp, 1.4), (x - lado * 0.05, (y0 + y1) / 2, 0.7), 'rodape', bevel=0.0))
    if v.get('tijolo'):
        z = 1.6
        while z < 19.5:
            pecas.append(box((0.1, comp, 0.06), (x - lado * 0.02, (y0 + y1) / 2, z), 'rejunte', bevel=0.0))
            z += 0.55
    y = y0 + 4
    while y < y1 - 2:
        pecas.append(box((0.8, 0.8, 20), (x - lado * 0.3, y, 10), 'pilar', bevel=0.05))
        y += 8
    y = y0 + 8
    while y < y1 - 4:
        pecas.append(box((0.18, 5.0, 4.0), (x - lado * 0.05, y, 8.5), 'janelaMoldura', bevel=0.04))
        pecas.append(box((0.2, 4.6, 3.6), (x - lado * 0.06, y, 8.5), 'janela', bevel=0.0))
        y += 8
    return pecas


def telhado():
    pecas = [box((84, 64, 0.5), (0, 14, 20.2), 'forro', bevel=0.0)]
    y = -14.0
    while y < PAREDE_FUNDO:
        pecas.append(box((62, 0.35, 0.6), (0, y, 18.4), 'trelica', bevel=0.0))
        for k in range(-7, 8):
            xk = k * 4.0
            pecas.append(box((0.18, 0.18, 1.6), (xk, y, 19.1), 'trelica', bevel=0.0))
        pecas.append(box((62, 0.3, 0.3), (0, y, 19.8), 'trelica', bevel=0.0))
        y += 8.0
    for x in (-12, 0, 12):
        pecas.append(box((3.0, 60, 0.1), (x, 14, 19.9), 'claraboia', bevel=0.0))
    return pecas


def luminarias():
    pecas = []
    for cx in LANES:
        for y in (4.0, 14.0, 24.0):
            pecas.append(cyl(0.025, 4.5, (cx, y, 16.3), 'acoEscuro', verts=6))
            pecas.append(cyl(0.8, 0.5, (cx, y, 13.9), 'luminaria', verts=18, r2=0.3))
            pecas.append(cyl(0.7, 0.06, (cx, y, 13.63), 'lampada', verts=18))
    return pecas


def fardo(x, y, z, w, d, h, m, m_fita):
    pecas = [box((w, d, h), (x, y, z + h / 2), m, bevel=0.06)]
    for k in (-0.3, 0.3):
        pecas.append(box((w + 0.02, 0.06, h + 0.02), (x, y + d * k, z + h / 2), m_fita, bevel=0.0))
    return pecas


def pilhas_de_fardos(rnd_lado, v):
    """Fardos prensados (papelão, latas e garrafas) junto das paredes laterais."""
    pecas = []
    tipos = [('fardoPapelao', 'fita'), ('fardoLata', 'fita'), ('fardoGarrafa', 'fita')]
    for lado in (-1, 1):
        x = lado * (X_LATERAL - 2.6)
        for i, y in enumerate((-6.0, 2.0, 10.0, 18.0, 26.0)):
            m, f = tipos[(i + (lado > 0)) % 3]
            alturas = 2 + ((i * 7 + (lado > 0) * 3) % 3)
            for k in range(alturas):
                pecas += fardo(x + (0.15 if k % 2 else -0.15) * lado, y, k * 1.6, 3.2, 3.0, 1.55, m, f)
    return pecas


def cacambas():
    """Caçambas coloridas da coleta seletiva, perto das paredes."""
    pecas = []
    cores = ['cacambaAzul', 'cacambaAmarela', 'cacambaLaranja', 'cacambaAzul']
    for lado in (-1, 1):
        for i, y in enumerate((-12.0, 30.0)):
            x = lado * 15.0
            m = cores[(i + (lado > 0) * 2) % 4]
            pecas.append(box((4.0, 2.6, 2.2), (x, y, 1.1), m, bevel=0.12))
            pecas.append(box((4.2, 2.8, 0.25), (x, y, 2.3), 'tampaCacamba', bevel=0.08))
            for xx in (-1.4, 1.4):
                pecas.append(cyl(0.3, 0.2, (x + xx, y - 1.35, 0.3), 'acoEscuro', verts=12, rot=(R(90), 0, 0)))
    return pecas


def paletes_perto():
    """Paletes com caixas e sacos junto das esteiras: dão o que ver nas bordas do fundo 2D (que
    mostra o chão de x = -10 a 10) e no 3D ficam ao lado da partida, sem tapar nada."""
    pecas = []
    arrumacao = [(-8.6, 3.0, 'caixas'), (-8.6, 9.0, 'sacos'), (8.6, 5.0, 'sacos'), (8.6, 11.0, 'caixas'),
                 (-8.6, 15.5, 'caixas'), (8.6, 17.0, 'caixas')]
    for x, y, tipo in arrumacao:
        pecas.append(box((2.2, 2.2, 0.22), (x, y, 0.11), 'palete', bevel=0.02))
        for k in (-0.7, 0, 0.7):
            pecas.append(box((2.2, 0.25, 0.08), (x, y + k, 0.27), 'palete', bevel=0.0))
        if tipo == 'caixas':
            for dx, dy, h in ((-0.5, -0.5, 0.8), (0.5, -0.5, 0.7), (-0.5, 0.5, 0.75), (0.45, 0.5, 1.4)):
                pecas.append(box((0.95, 0.95, h), (x + dx, y + dy, 0.31 + h / 2), 'fardoPapelao', bevel=0.04))
                pecas.append(box((0.2, 0.97, 0.01), (x + dx, y + dy, 0.31 + h + 0.004), 'fitaClara', bevel=0.0))
        else:
            for dx, dy in ((-0.5, -0.45), (0.5, -0.45), (0.0, 0.5)):
                pecas.append(superellipsoid((0.95, 0.85, 0.7), (x + dx, y + dy, 0.66), 'saco', e1=0.6, e2=0.6, seg=14, ring=8))
                pecas.append(cyl(0.1, 0.18, (x + dx, y + dy, 1.06), 'saco', verts=8))
    return pecas


def costuras(v):
    """Emendas verticais dos painéis da parede do fundo (o desenho da parede vem da cor)."""
    if v.get('tijolo'):
        return []
    return [box((0.12, 0.12, 18.5), (x, PAREDE_FUNDO - 0.03, 10.6), 'frisoParede', bevel=0.0)
            for x in range(-39, 40, 3) if abs(x) > 5]


def marcas_no_chao():
    pecas = []
    pecas += zebrado(-6.4, 6.4, -9.6, 0.5)
    for x in (-6.6, 6.6):
        pecas.append(faixa_chao(x - 0.12, x + 0.12, -9.6, PAREDE_FUNDO, 'atencao'))
    for lado in (-1, 1):  # a calçada de cada lado das esteiras, na cor do galpão
        pecas.append(faixa_chao(min(lado * 7.1, lado * 10.1), max(lado * 7.1, lado * 10.1), -18, PAREDE_FUNDO, 'calcada', z=0.008))
    for x in (-10.5, 10.5):
        pecas.append(faixa_chao(x - 0.15, x + 0.15, -18, PAREDE_FUNDO, 'faixaCaminho'))
    for x in (-24.0, 24.0):
        pecas.append(faixa_chao(x - 0.15, x + 0.15, -18, PAREDE_FUNDO, 'faixaCaminho'))
    return pecas


PALETAS = {
    'galpao-menta': {
        'parede': '#bfe6d6', 'paredeLado': '#a9dcc8', 'pilar': '#2f8f86', 'rodape': '#2f8f86', 'frisoParede': '#ffffff',
        'forro': '#d9e4ee', 'trelica': '#5b6b80', 'chaoA': '#c9c3b8', 'chaoB': '#bdb7ab', 'janela': '#bfeaff',
        'janelaEmit': '#d8f3ff', 'janelaForca': 0.55, 'placaFundo': '#ffffff', 'placaBorda': '#2f8f86', 'calcada': '#9fd6c2',
    },
    'galpao-tijolo': {
        'parede': '#c9674e', 'paredeLado': '#bb5d46', 'pilar': '#efe3cc', 'rodape': '#6e3b2f', 'frisoParede': '#efe3cc',
        'forro': '#e8e0d2', 'trelica': '#4b4f5c', 'chaoA': '#cfccc6', 'chaoB': '#c3c0b9', 'janela': '#cfeeff',
        'janelaEmit': '#e2f6ff', 'janelaForca': 0.55, 'placaFundo': '#fff8e8', 'placaBorda': '#6e3b2f', 'tijolo': True, 'calcada': '#e0ad94',
        'rejunte': '#e6b9a4',
    },
    'galpao-azul': {
        'parede': '#6d9be6', 'paredeLado': '#5e8ddc', 'pilar': '#f3f6ff', 'rodape': '#28407f', 'frisoParede': '#f3f6ff',
        'forro': '#dfe7f5', 'trelica': '#28407f', 'chaoA': '#c4c8d0', 'chaoB': '#b8bcc5', 'janela': '#d6f1ff',
        'janelaEmit': '#e8f8ff', 'janelaForca': 0.6, 'placaFundo': '#ffffff', 'placaBorda': '#28407f', 'calcada': '#a8c2ee',
    },
    'galpao-noite': {
        'parede': '#2f3866', 'paredeLado': '#283058', 'pilar': '#8b6cff', 'rodape': '#181d3a', 'frisoParede': '#8b6cff',
        'forro': '#252b4d', 'trelica': '#171b33', 'chaoA': '#5a5f73', 'chaoB': '#52576a', 'janela': '#14205a',
        'janelaEmit': '#3550c8', 'janelaForca': 0.6, 'placaFundo': '#e9e3ff', 'placaBorda': '#8b6cff', 'calcada': '#4a4680',
        'luzForte': True,
    },
}


def materiais(v):
    for nome in ('parede', 'paredeLado', 'pilar', 'rodape', 'frisoParede', 'forro', 'trelica', 'chaoA', 'chaoB',
                 'placaFundo', 'placaBorda', 'calcada'):
        c(nome, v[nome])
    if v.get('tijolo'):
        c('rejunte', v['rejunte'])
    c('janela', v['janela'], v['janelaEmit'], v['janelaForca'], rough=0.2)
    c('janelaMoldura', '#f3f6ff' if not v.get('luzForte') else '#3a4170')
    c('claraboia', '#e9f7ff', '#f2fbff', 0.9 if not v.get('luzForte') else 0.25, rough=0.2)
    c('luminaria', '#2b2f3b')
    c('lampada', '#fff6d6', '#fff1b8', 2.2 if v.get('luzForte') else 1.4, rough=0.2)
    c('lona', '#3b404d', rough=0.8)
    c('talisca', '#5a6070', rough=0.8)
    c('palete', '#b88a55', rough=0.8)
    c('fitaClara', '#ecd9a8', rough=0.5)
    c('saco', '#e9eef6', rough=0.7)
    c('aco', '#9aa4b4', rough=0.45)
    c('acoEscuro', '#5d6677', rough=0.5)
    c('friso', '#ffc93a', rough=0.45)
    c('chapa', '#7d8796', rough=0.5)
    c('atencao', '#ffc93a', rough=0.6)
    c('atencaoPreto', '#2a2d36', rough=0.6)
    c('faixaCaminho', '#f3f6ff', rough=0.6)
    c('tunel', '#0d1020', rough=0.9)
    c('moldura', '#ffc93a', rough=0.45)
    c('tira', '#3c4b5e', rough=0.4)
    c('luzBoca', '#ffb347', '#ffa22a', 1.6, rough=0.3)
    c('placaSimbolo', '#22b85a', '#2fe07a', 0.25, rough=0.45)
    c('fardoPapelao', '#c98b4b', rough=0.85)
    c('fardoLata', '#b9c3d0', rough=0.5)
    c('fardoGarrafa', '#9fdcf0', rough=0.35)
    c('fita', '#3b4252', rough=0.6)
    c('cacambaAzul', '#2f6df0', rough=0.5)
    c('cacambaAmarela', '#ffc93a', rough=0.5)
    c('cacambaLaranja', '#ff8f2a', rough=0.5)
    c('tampaCacamba', '#2b2f3b', rough=0.5)


def galpao(pid):
    v = PALETAS[pid]

    def fazer():
        reset()
        materiais(v)
        pecas = [chao(v)]
        for cx in LANES:
            pecas += esteira(cx)
        for cx in (-2.0, 2.0):
            pecas += divisoria(cx)
        pecas += parede_fundo(v)
        for lado in (-1, 1):
            pecas += parede_lateral(lado, v)
        pecas += telhado()
        pecas += luminarias()
        pecas += pilhas_de_fardos(None, v)
        pecas += cacambas()
        pecas += marcas_no_chao()
        pecas += paletes_perto()
        pecas += costuras(v)
        return exportar(pid, pecas, 'galpao', sem_caixa=True)
    return fazer


GALPOES = {pid: galpao(pid) for pid in PALETAS}

if __name__ == '__main__':
    for pid in sys.argv[1:] or GALPOES:
        GALPOES[pid]()
