"""As peças da esteira: quatro recicláveis (valem ponto) e quatro proibidas (tiram vida).

Todas na caixa `reciclavel`/`proibido` (cubo de 1,5), apoiadas no fundo dela (z = -0,75). Cada
uma leva as duas marcas da regra (`lib_estacao.aro` e `lib_estacao.selo`): verde com o símbolo de
reciclar nas recicláveis, vermelho com o X nas proibidas. O corpo das peças nunca usa verde nem
vermelho, para a cor da regra ficar só nas marcas.

    python pecas.py
    python pecas.py proibido-lampada
"""
import sys

from lib_estacao import (PISO, R, aro, box, cor, cores_da_regra, cyl, exportar, placa, reset, selo, sphere,
                         superellipsoid, torus, tube)


def etiqueta(tipo, topo, y=-0.18):
    """A plaquinha espetada na peça: haste branca saindo do topo e o selo inclinado para a câmera."""
    haste = cyl(0.025, 0.42, (0, y + 0.06, topo + 0.12), 'haste', verts=8)
    return [haste, selo(tipo, (0, y, topo + 0.36)), aro(tipo)]


def comuns():
    reset()
    cores_da_regra()
    cor('haste', '#f4f6fb', 0.5)


# --- recicláveis ------------------------------------------------------------------------------
def garrafa_pet():
    """Garrafa PET deitada: corpo azul-claro com gomos, rótulo azul, gargalo e tampa."""
    comuns()
    cor('pet', '#a9e6f5', 0.2)
    cor('petClaro', '#e6fbff', 0.15)
    cor('rotulo', '#2f74e0', 0.5)
    cor('rotuloClaro', '#ffffff', 0.5)
    cor('tampa', '#1f4fb8', 0.45)
    r = 0.27
    zc = PISO + r * 1.05  # o rótulo é mais largo que o corpo
    pts = [(-0.6, 0, zc), (-0.56, 0, zc), (0.25, 0, zc), (0.38, 0, zc), (0.5, 0, zc), (0.6, 0, zc)]
    corpo = tube(pts, [0.2, r, r, 0.22, 0.11, 0.1], 'pet', seg=20)
    gomos = [torus(r * 0.95, 0.018, (x, 0, zc), 'petClaro', seg=20, rseg=5, rot=(0, R(90), 0)) for x in (-0.42, 0.1)]
    rotulo = cyl(r * 1.03, 0.36, (-0.15, 0, zc), 'rotulo', verts=24, rot=(0, R(90), 0))
    faixa = cyl(r * 1.045, 0.07, (-0.15, 0, zc), 'rotuloClaro', verts=24, rot=(0, R(90), 0))
    tampa = cyl(0.115, 0.12, (0.66, 0, zc), 'tampa', verts=18, rot=(0, R(90), 0), bevel=0.015)
    brilho = box((0.62, 0.05, 0.03), (-0.05, -0.12, zc + r * 0.93), 'petClaro', bevel=0.012)
    pecas = [corpo, *gomos, rotulo, faixa, tampa, brilho]
    return exportar('reciclavel-garrafa-pet', pecas + etiqueta('reciclavel', zc + r, y=-0.32), 'reciclavel')


def lata():
    """Lata de suco em pé: alumínio cinza-claro, faixa amarela, tampa com o anel de abrir."""
    comuns()
    cor('aluminio', '#cfd8e3', 0.35)
    cor('aluminioEscuro', '#8f9bab', 0.4)
    cor('faixaAmarela', '#ffc93a', 0.45)
    cor('faixaLaranja', '#ff9a2f', 0.45)
    r, h = 0.3, 0.64
    corpo = cyl(r, h, (0, 0, PISO + h / 2), 'aluminio', verts=28, bevel=0.03)
    faixa = cyl(r * 1.02, h * 0.46, (0, 0, PISO + h * 0.5), 'faixaAmarela', verts=28)
    listra = cyl(r * 1.03, h * 0.1, (0, 0, PISO + h * 0.5), 'faixaLaranja', verts=28)
    aro_topo = torus(r * 0.86, 0.03, (0, 0, PISO + h - 0.005), 'aluminioEscuro', seg=24, rseg=6)
    anel = torus(0.07, 0.018, (0.05, 0.08, PISO + h + 0.005), 'aluminioEscuro', seg=12, rseg=4)
    pecas = [corpo, faixa, listra, aro_topo, anel]
    return exportar('reciclavel-lata', pecas + etiqueta('reciclavel', PISO + h, y=-0.1), 'reciclavel')


def caixa_papelao():
    """Caixa de papelão fechada com fita e as abas marcadas."""
    comuns()
    cor('papelao', '#c98b4b', 0.8)
    cor('papelaoEscuro', '#9a6533', 0.8)
    cor('fita', '#ecd9a8', 0.5)
    w, d, h = 0.92, 0.78, 0.52
    corpo = box((w, d, h), (0, 0, PISO + h / 2), 'papelao', bevel=0.03)
    fita = box((0.16, d + 0.01, 0.012), (0, 0, PISO + h + 0.004), 'fita', bevel=0.004)
    fita_frente = box((0.16, 0.012, h * 0.45), (0, -d / 2 - 0.004, PISO + h * 0.78), 'fita', bevel=0.003)
    vincos = [box((0.012, d * 0.98, 0.012), (x, 0, PISO + h + 0.002), 'papelaoEscuro', bevel=0.0) for x in (-0.25, 0.25)]
    seta = placa([(0.27, -0.12), (0.37, 0.02), (0.31, 0.02), (0.31, 0.14), (0.23, 0.14), (0.23, 0.02), (0.17, 0.02)],
                 PISO + h + 0.002, PISO + h + 0.012, 'papelaoEscuro')
    pecas = [corpo, fita, fita_frente, *vincos, seta]
    return exportar('reciclavel-caixa-papelao', pecas + etiqueta('reciclavel', PISO + h, y=-0.2), 'reciclavel')


def pote_vidro():
    """Pote de vidro em pé, azul-água, com tampa lilás e rótulo branco."""
    comuns()
    cor('vidro', '#b9ecf7', 0.12)
    cor('vidroBrilho', '#f2feff', 0.1, '#ffffff', 0.25)
    cor('tampaLilas', '#8b6cff', 0.45)
    cor('rotuloBranco', '#fbfbf5', 0.6)
    cor('rotuloAzul', '#3b79e6', 0.5)
    r, h = 0.3, 0.56
    corpo = superellipsoid((r * 2, r * 2, h), (0, 0, PISO + h / 2), 'vidro', e1=0.35, e2=1.0, seg=26, ring=12)
    gargalo = cyl(r * 0.78, 0.06, (0, 0, PISO + h + 0.01), 'vidro', verts=24)
    tampa = cyl(r * 0.84, 0.1, (0, 0, PISO + h + 0.08), 'tampaLilas', verts=24, bevel=0.02)
    rotulo = cyl(r * 1.02, h * 0.38, (0, 0, PISO + h * 0.48), 'rotuloBranco', verts=26)
    tarja = cyl(r * 1.03, h * 0.09, (0, 0, PISO + h * 0.48), 'rotuloAzul', verts=26)
    brilho = box((0.05, 0.03, h * 0.6), (-0.15, -0.24, PISO + h * 0.52), 'vidroBrilho', bevel=0.012)
    pecas = [corpo, gargalo, tampa, rotulo, tarja, brilho]
    return exportar('reciclavel-pote-vidro', pecas + etiqueta('reciclavel', PISO + h + 0.13, y=-0.06), 'reciclavel')


# --- proibidas --------------------------------------------------------------------------------
def pilha():
    """Pilha grande deitada: metade preta, metade laranja, polo positivo e a faixa de carga."""
    comuns()
    cor('pilhaPreta', '#262b37', 0.45)
    cor('pilhaLaranja', '#ff8f2a', 0.4)
    cor('polo', '#c6ced9', 0.35)
    cor('carga', '#ffe066', 0.45)
    r = 0.25
    zc = PISO + r + 0.005
    preta = cyl(r, 0.56, (-0.28, 0, zc), 'pilhaPreta', verts=26, rot=(0, R(90), 0), bevel=0.03)
    laranja = cyl(r, 0.5, (0.25, 0, zc), 'pilhaLaranja', verts=26, rot=(0, R(90), 0), bevel=0.03)
    polo = cyl(0.09, 0.08, (0.54, 0, zc), 'polo', verts=16, rot=(0, R(90), 0), bevel=0.015)
    fundo = cyl(r * 0.8, 0.02, (-0.565, 0, zc), 'polo', verts=20, rot=(0, R(90), 0))
    raio = placa([(-0.12, -0.06), (0.02, -0.06), (-0.02, 0.0), (0.12, 0.0), (-0.04, 0.12), (0.0, 0.04), (-0.14, 0.04)],
                 0, 0.012, 'carga')
    raio.rotation_euler = (0, 0, R(90))
    raio.location = (0.25, -0.03, zc + r - 0.002)
    mais = [box((0.12, 0.03, 0.012), (0.4, 0.0, zc + r + 0.0), 'carga', bevel=0.003),
            box((0.03, 0.12, 0.012), (0.4, 0.0, zc + r + 0.0), 'carga', bevel=0.003)]
    pecas = [preta, laranja, polo, fundo, raio, *mais]
    return exportar('proibido-pilha', pecas + etiqueta('proibido', zc + r, y=-0.3), 'proibido')


def bateria():
    """Bateria de carro: caixa cinza-chumbo, tampa clara, dois polos e a alça."""
    comuns()
    cor('bateriaCorpo', '#3a4054', 0.5)
    cor('bateriaTampa', '#c9ced8', 0.5)
    cor('poloMais', '#ffb02e', 0.4)
    cor('poloMenos', '#2a2f3a', 0.4)
    cor('alca', '#22262f', 0.5)
    cor('faixaAmarela', '#ffd23f', 0.45)
    w, d, h = 1.0, 0.62, 0.5
    corpo = box((w, d, h), (0, 0, PISO + h / 2), 'bateriaCorpo', bevel=0.03)
    tampa = box((w * 1.02, d * 1.02, 0.08), (0, 0, PISO + h + 0.02), 'bateriaTampa', bevel=0.02)
    faixa = box((w * 1.01, 0.012, 0.09), (0, -d / 2 - 0.004, PISO + h * 0.55), 'faixaAmarela', bevel=0.0)
    polos = [cyl(0.07, 0.09, (x, 0.14, PISO + h + 0.1), m, verts=14, bevel=0.012)
             for x, m in ((-0.33, 'poloMais'), (0.33, 'poloMenos'))]
    alca = tube([(-0.2, -0.05, PISO + h + 0.06), (-0.17, -0.05, PISO + h + 0.18), (0.17, -0.05, PISO + h + 0.18),
                 (0.2, -0.05, PISO + h + 0.06)], [0.025] * 4, 'alca', seg=8)
    pecas = [corpo, tampa, faixa, *polos, alca]
    return exportar('proibido-bateria', pecas + etiqueta('proibido', PISO + h + 0.06, y=-0.28), 'proibido')


def lampada():
    """Lâmpada deitada: bulbo amarelo-claro aceso de leve, base de rosca e o contato."""
    comuns()
    cor('bulbo', '#fff3b8', 0.15, '#ffe680', 0.35)
    cor('filamento', '#ffb347', 0.3, '#ffae3a', 1.4)
    cor('rosca', '#b4bdca', 0.35)
    cor('roscaEscura', '#7d8796', 0.4)
    cor('contato', '#262b37', 0.5)
    zc = PISO + 0.33
    bulbo = sphere(0.33, (0.2, 0, zc), 'bulbo', subdiv=3)
    pescoco = cyl(0.17, 0.22, (-0.18, 0, zc), 'bulbo', verts=22, rot=(0, R(90), 0), r2=0.26)
    rosca = cyl(0.165, 0.28, (-0.42, 0, zc), 'rosca', verts=22, rot=(0, R(90), 0))
    voltas = [torus(0.165, 0.025, (x, 0, zc), 'roscaEscura', seg=22, rseg=5, rot=(0, R(90), 0)) for x in (-0.5, -0.42, -0.34)]
    contato = cyl(0.08, 0.08, (-0.6, 0, zc), 'contato', verts=14, rot=(0, R(90), 0), r2=0.12)
    fio = tube([(0.02, 0, zc - 0.06), (0.12, 0, zc + 0.09), (0.22, 0, zc - 0.03), (0.32, 0, zc + 0.08)], [0.018] * 4,
               'filamento', seg=6)
    pecas = [bulbo, pescoco, rosca, *voltas, contato, fio]
    return exportar('proibido-lampada', pecas + etiqueta('proibido', zc + 0.33, y=-0.18), 'proibido')


def celular():
    """Celular velho deitado, com a tela trincada e a capinha amarela."""
    comuns()
    cor('capa', '#ffc93a', 0.5)
    cor('corpoCel', '#2a2f3a', 0.45)
    cor('tela', '#1d3f8f', 0.2, '#2d5fd0', 0.4)
    cor('trinca', '#e9f2ff', 0.3, '#ffffff', 0.3)
    cor('botao', '#8f9bab', 0.4)
    w, d, h = 0.62, 1.05, 0.13
    capa = box((w + 0.06, d + 0.06, h), (0, 0.05, PISO + h / 2), 'capa', bevel=0.05)
    corpo = box((w, d, 0.04), (0, 0.05, PISO + h + 0.005), 'corpoCel', bevel=0.02)
    tela = box((w * 0.86, d * 0.8, 0.012), (0, 0.07, PISO + h + 0.027), 'tela', bevel=0.004)
    trincas = []
    for (x0, y0), (x1, y1) in (((-0.05, 0.1), (0.2, 0.42)), ((-0.05, 0.1), (-0.22, 0.3)), ((-0.05, 0.1), (0.05, -0.25)),
                               ((-0.05, 0.1), (0.24, 0.0)), ((0.05, -0.25), (-0.2, -0.3))):
        trincas.append(tube([(x0, y0, PISO + h + 0.035), (x1, y1, PISO + h + 0.035)], [0.008, 0.005], 'trinca', seg=5))
    botao = cyl(0.045, 0.012, (0, -0.42, PISO + h + 0.03), 'botao', verts=14)
    pecas = [capa, corpo, tela, *trincas, botao]
    return exportar('proibido-celular', pecas + etiqueta('proibido', PISO + h, y=-0.45), 'proibido')


RECICLAVEIS = {
    'reciclavel-garrafa-pet': garrafa_pet,
    'reciclavel-lata': lata,
    'reciclavel-caixa-papelao': caixa_papelao,
    'reciclavel-pote-vidro': pote_vidro,
}
PROIBIDOS = {
    'proibido-pilha': pilha,
    'proibido-bateria': bateria,
    'proibido-lampada': lampada,
    'proibido-celular': celular,
}

if __name__ == '__main__':
    todas = {**RECICLAVEIS, **PROIBIDOS}
    for pid in sys.argv[1:] or todas:
        todas[pid]()
