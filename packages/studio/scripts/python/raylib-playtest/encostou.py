"""Encostou!: a parede segura a caixa, a saída só abre sem moedas e o labirinto tem saída.

O roteiro acha um caminho pelo mapa (busca em largura de casa em casa) e anda nele com as
setas: pega todas as moedas e depois vai até a saída. Antes, confere a parede e a saída fechada.
"""
from collections import deque


def caminho(mapa, de, para):
    fila, veio = deque([de]), {de: None}
    while fila:
        atual = fila.popleft()
        if atual == para:
            break
        linha, coluna = atual
        for dl, dc in ((0, 1), (1, 0), (0, -1), (-1, 0)):
            prox = (linha + dl, coluna + dc)
            if mapa[prox[0]][prox[1]] != '1' and prox not in veio:
                veio[prox] = atual
                fila.append(prox)
    passos, atual = [], para
    while atual != de:
        passos.append(atual)
        atual = veio[atual]
    return passos[::-1]


def play(t):
    g = t.game
    mapa, tam = g['MAPA'], g['TAMANHO']
    yield from t.wait(2)
    t.shot('inicio')

    def casa():
        j = g['jogador']
        return (int((j.y + j.height / 2) // tam), int((j.x + j.width / 2) // tam))

    def ir(alvo):
        """Anda de uma casa para a vizinha, segurando a seta até o centro chegar lá."""
        linha, coluna = alvo
        cx, cy = coluna * tam + tam / 2, linha * tam + tam / 2
        j = g['jogador']
        if coluna != casa()[1]:
            tecla = 'RIGHT' if cx > j.x + j.width / 2 else 'LEFT'
            t.hold(tecla)
            for _ in range(60):
                yield
                centro = j.x + j.width / 2
                if (tecla == 'RIGHT' and centro >= cx - 2) or (tecla == 'LEFT' and centro <= cx + 2):
                    break
            t.release(tecla)
        else:
            tecla = 'DOWN' if cy > j.y + j.height / 2 else 'UP'
            t.hold(tecla)
            for _ in range(60):
                yield
                centro = j.y + j.height / 2
                if (tecla == 'DOWN' and centro >= cy - 2) or (tecla == 'UP' and centro <= cy + 2):
                    break
            t.release(tecla)
        yield

    # A parede segura: o começo tem parede à esquerda; segurar a seta não atravessa.
    x0 = g['jogador'].x
    t.hold('LEFT')
    yield from t.wait(40)
    t.release('LEFT')
    yield
    t.check(g['jogador'].x >= g['TAMANHO'] - 0.01, 'a caixa atravessou a parede da esquerda')
    t.check(g['jogador'].x < x0, 'a seta para a esquerda nem andou até a parede')

    alvos = [(l, c) for l, linha in enumerate(mapa) for c, letra in enumerate(linha) if letra == 'M']
    saida = next((l, c) for l, linha in enumerate(mapa) for c, letra in enumerate(linha) if letra == 'E')
    moedas_no_inicio = len(g['moedas'])
    t.check(moedas_no_inicio == len(alvos), 'o mapa e a lista de moedas não batem')

    # A saída fechada: chegar nela antes de pegar as moedas não vence.
    for passo in caminho(mapa, casa(), saida):
        yield from ir(passo)
    yield from t.wait(3)
    t.check(not g['venceu'], 'a saída abriu com moedas no mapa')
    t.shot('saida-fechada')

    # Todas as moedas, a mais perto primeiro, e de volta à saída.
    while g['moedas']:
        restantes = [(int(m.y // tam), int(m.x // tam)) for m in g['moedas']]
        rotas = [caminho(mapa, casa(), alvo) for alvo in restantes]
        rota = min(rotas, key=len)
        antes = len(g['moedas'])
        for passo in rota:
            yield from ir(passo)
        yield from t.wait(2)
        t.check(len(g['moedas']) < antes, f'chegou na moeda {rota[-1] if rota else "?"} e ela não sumiu')
        if len(g['moedas']) >= antes:
            t.shot('preso')
            break
    for passo in caminho(mapa, casa(), saida):
        yield from ir(passo)
    yield from t.wait(3)
    t.check(g['venceu'], 'pegou as moedas, chegou na saída e não venceu')
    t.shot('venceu')

    # Enter recomeça com as moedas de volta.
    yield from t.tap('ENTER')
    yield
    t.check(not g['venceu'] and len(g['moedas']) == moedas_no_inicio, 'o Enter não recomeçou')
    t.end()
    yield
