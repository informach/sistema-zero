"""Masmorra para Quatro: four heroes, each on its own keys (arrows, WASD, IJKL, TFGH), join when
moved; walls and other heroes block, and a diagonal slides along a wall; ghosts come out of the
dens and chase the nearest hero in play, ignoring the others; a ghost costs the group a life and
sends that hero home; with every treasure taken the exit opens and a hero on it ends the level; a
player that walks the shortest safe way to each treasure and then to the exit clears levels."""

import random
from collections import deque

TECLAS = [('LEFT', 'RIGHT', 'UP', 'DOWN'), ('a', 'd', 'w', 's'), ('j', 'l', 'i', 'k'), ('f', 'h', 't', 'g')]


def casa(t, x, y):
    return (int(x // t.get('TAMANHO')), int((y - t.get('TOPO')) // t.get('TAMANHO')))


def caminho(t, de, alvos, evitar):
    mapa = t.get('MAPA')
    vindo = {de: None}
    fila = deque([de])
    while fila:
        atual = fila.popleft()
        if atual in alvos:
            while vindo[atual] is not None and vindo[atual] != de:
                atual = vindo[atual]
            return atual
        for dc, dl in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (atual[0] + dc, atual[1] + dl)
            if n not in vindo and mapa[n[1]][n[0]] != '#' and n not in evitar:
                vindo[n] = atual
                fila.append(n)
    return None


def soltar(t, numero):
    for tecla in TECLAS[numero]:
        t.up(tecla)


def jogar(t, quadros):
    """Hero 1 alone: the nearest treasure (then the exit) by the shortest way away from ghosts."""
    heroi = t.get('herois')[0]
    tamanho, topo = t.get('TAMANHO'), t.get('TOPO')
    for _ in range(quadros):
        if t.get('estado') != 'jogando':
            break
        soltar(t, 0)
        aqui = casa(t, heroi.x, heroi.y)
        evitar = set()
        for f in t.get('fantasmas'):
            c, l = casa(t, f.x, f.y)
            for dc in (-1, 0, 1):
                for dl in (-1, 0, 1):
                    evitar.add((c + dc, l + dl))
        evitar.discard(aqui)
        if t.get('tesouros'):
            alvos = {casa(t, x.x, x.y) for x in t.get('tesouros')}
        else:
            alvos = {casa(t, t.get('saida').x, t.get('saida').y)}
        proxima = caminho(t, aqui, alvos, evitar) if aqui not in alvos else aqui
        if proxima is None:
            # Sem caminho longe dos fantasmas, foge para a casa vizinha mais longe deles.
            mapa = t.get('MAPA')
            fantasmas = [casa(t, f.x, f.y) for f in t.get('fantasmas')]
            opcoes = [aqui] + [(aqui[0] + dc, aqui[1] + dl) for dc, dl in ((1, 0), (-1, 0), (0, 1), (0, -1))
                               if mapa[aqui[1] + dl][aqui[0] + dc] != '#']
            proxima = max(opcoes, key=lambda c: min((abs(c[0] - f[0]) + abs(c[1] - f[1]) for f in fantasmas), default=99))
        if proxima is not None:
            cx = proxima[0] * tamanho + tamanho / 2
            cy = topo + proxima[1] * tamanho + tamanho / 2
            esquerda, direita, cima, baixo = TECLAS[0]
            if cx < heroi.x - 1:
                t.down(esquerda)
            elif cx > heroi.x + 1:
                t.down(direita)
            if cy < heroi.y - 1:
                t.down(cima)
            elif cy > heroi.y + 1:
                t.down(baixo)
        t.step(1)
    soltar(t, 0)


def play(t):
    herois = t.get('herois')
    t.check('quatro heróis, nenhum em jogo ainda', len(herois) == 4 and not any(h.jogando for h in herois))
    t.check('doze tesouros e a saída fechada', len(t.get('tesouros')) == 12 and t.get('saida').image == 'saida')
    t.shot('inicio')

    # Cada herói tem as suas teclas e entra quando é movido.
    for numero in range(4):
        h = herois[numero]
        antes = h.pos
        esquerda, direita, cima, baixo = TECLAS[numero]
        t.hold(direita if numero in (0, 2) else esquerda, 10)
        t.check(f'as teclas {"".join(TECLAS[numero]) if numero else "setas"} movem o herói {numero + 1}',
                h.jogando and h.pos != antes and all(o.pos == o.inicio or o is h or o.jogando for o in herois))
    mago = herois[1]
    t.check('cada herói tem um nome e um desenho para o lado em que anda', mago.image.startswith('mago_esquerda'))

    # Parede não deixa passar; na diagonal, desliza.
    guerreira = herois[0]
    guerreira.pos = guerreira.inicio
    t.hold('UP', 20)
    encostado = guerreira.y
    t.hold('UP', 20)
    t.check('a parede segura o herói', guerreira.y == encostado and encostado > guerreira.inicio[1] - 8)
    t.down('UP')
    t.hold('RIGHT', 20)
    t.up('UP')
    t.check('na diagonal contra a parede, ele desliza para o lado', guerreira.x > guerreira.inicio[0] + 30 and guerreira.y == encostado)

    # Um herói não atravessa o outro.
    elfa = herois[2]
    elfa.pos = (guerreira.x + 40, guerreira.y)
    t.hold('RIGHT', 30)
    t.check('um herói não atravessa o outro', elfa.x - guerreira.x >= 22, f'distância {elfa.x - guerreira.x}')

    # Fantasmas saem das tocas e perseguem só quem está em jogo.
    for h in herois:
        h.jogando = False
        h.pos = h.inicio
    t.set('quadros', 179)
    t.step(1)
    fantasma = t.get('fantasmas')[0] if t.get('fantasmas') else None
    t.check('a cada três segundos sai um fantasma da toca', fantasma is not None and fantasma.pos in t.get('tocas'))
    t.step(60)
    t.check('sem ninguém em jogo, o fantasma não sai do lugar', fantasma.pos in t.get('tocas'))
    guerreira.jogando = True
    t.step(60)
    t.check('com alguém em jogo, ele vai atrás', fantasma.pos not in t.get('tocas'))
    vidas = t.get('vidas')
    guerreira.pos = (300, 300)
    fantasma.pos = guerreira.pos
    t.step(1)
    t.check('o fantasma tira uma vida do grupo e manda o herói para o começo',
            t.get('vidas') == vidas - 1 and guerreira.pos == guerreira.inicio and fantasma not in t.get('fantasmas'))

    # Tesouros abrem a saída; um herói na saída aberta termina o nível.
    t.get('fantasmas').clear()
    tesouro = t.get('tesouros')[0]
    pontos = t.get('pontos')
    guerreira.pos = tesouro.pos
    t.step(1)
    t.check('o herói pega o tesouro', tesouro not in t.get('tesouros') and t.get('pontos') == pontos + 100)
    guerreira.pos = t.get('saida').pos
    t.step(1)
    t.check('com tesouros faltando, a saída fica fechada', t.get('estado') == 'jogando')
    t.get('tesouros').clear()
    vidas = t.get('vidas')
    t.step(1)
    t.check('com todos os tesouros, a saída abre e o herói sai', t.get('saida').image == 'saida_aberta' and t.get('estado') == 'passou')
    t.check('e o grupo ganha uma vida', t.get('vidas') == vidas + 1)
    t.shot('saida')
    t.tap('SPACE')
    t.check('espaço leva ao nível 2, com os tesouros de volta', t.get('nivel') == 2 and len(t.get('tesouros')) == 12)

    # Uma pessoa só, pelo caminho mais curto e longe dos fantasmas, passa dos dois primeiros níveis.
    for semente in range(4):
        random.seed(semente)
        t.get('novo_jogo')()
        for nivel in (1, 2):
            jogar(t, 60 * 120)
            t.check(f'uma pessoa só passa do nível {nivel} (sorteio {semente})', t.get('estado') == 'passou',
                    f"estado={t.get('estado')}, tesouros={len(t.get('tesouros'))}, vidas={t.get('vidas')}")
            if nivel == 1 and semente == 0:
                t.shot('jogando')
            t.tap('SPACE')

    # Perdendo a última vida, acabou.
    t.get('novo_jogo')()
    t.set('vidas', 1)
    guerreira = t.get('herois')[0]
    guerreira.jogando = True
    fantasma = t.get('Actor')('fantasma', guerreira.pos)
    fantasma.vagando = 0
    fantasma.direcao = (0, 0)
    t.get('fantasmas').append(fantasma)
    t.step(1)
    t.check('sem vidas, fim de jogo', t.get('estado') == 'fim')
    t.tap('SPACE')
    t.check('espaço começa de novo', t.get('estado') == 'jogando' and t.get('vidas') == 5 and t.get('nivel') == 1)
