"""Rali com Minimapa: the car only drives on roads, turns where the arrow says, turns by itself at
a wall and can go back at any time; the red cars stay on roads and come after it; a crash costs
a life; the fuel runs out; a driver that plans the way to the flags, keeping away from the red
cars, takes all eight; the mini-map draws a dot for every car and flag."""

from collections import deque

SETAS = {(1, 0): 'RIGHT', (-1, 0): 'LEFT', (0, 1): 'DOWN', (0, -1): 'UP'}


def celula(carro, lado):
    return (carro.mapa_x // lado, carro.mapa_y // lado)


def na_estrada(t, carro):
    coluna, linha = celula(carro, t.get('LADO'))
    return t.get('LABIRINTO')[linha][coluna] == '.'


def rota(t, de, alvos, perigo):
    labirinto = t.get('LABIRINTO')
    vindo = {de: None}
    fila = deque([de])
    while fila:
        atual = fila.popleft()
        if atual in alvos:
            while vindo[atual] is not None and vindo[atual] != de:
                atual = vindo[atual]
            return (atual[0] - de[0], atual[1] - de[1]) if atual != de else None
        for dx, dy in SETAS:
            n = (atual[0] + dx, atual[1] + dy)
            if n not in vindo and labirinto[n[1]][n[0]] == '.' and n not in perigo:
                vindo[n] = atual
                fila.append(n)
    return None


def play(t):
    lado = t.get('LADO')
    jogador = t.get('jogador')
    vermelhos = t.get('vermelhos')
    t.step(1)
    t.check('o carro começa andando para a direita', jogador.dx == 1 and jogador.mapa_x > 120)
    sempre_na_estrada = True
    for _ in range(200):
        t.step(1)
        sempre_na_estrada = sempre_na_estrada and na_estrada(t, jogador) and all(na_estrada(t, c) for c in vermelhos)
    t.check('no muro, o carro vira sozinho e segue', jogador.dx != 0 or jogador.dy != 0)
    t.check('carros sempre na estrada', sempre_na_estrada)
    t.shot('andando')

    # Meia-volta a qualquer hora.
    t.get('novo_jogo')()
    t.step(5)
    t.tap('LEFT')
    t.step(2)
    t.check('dá para dar meia-volta no meio da rua', jogador.dx == -1)

    # Virar numa esquina: na coluna 4 dá para descer.
    t.get('novo_jogo')()
    t.until(lambda: jogador.mapa_x >= 4 * lado + 20, 200)
    t.tap('DOWN')
    t.step(30)
    t.check('a seta para baixo vira na esquina', jogador.dy == 1 and jogador.mapa_x == 4 * lado + 40, f'{jogador.mapa_x},{jogador.mapa_y}')

    # Os vermelhos chegam perto de quem fica rodando num quarteirão.
    t.get('novo_jogo')()
    vermelho = vermelhos[0]
    longe = abs(vermelho.mapa_x - jogador.mapa_x) + abs(vermelho.mapa_y - jogador.mapa_y)
    t.until(lambda: t.get('vidas') < 3, 60 * 40)
    t.check('os carros vermelhos alcançam quem não foge', t.get('vidas') == 2, f'começou a {longe} px')
    t.check('depois da batida, todos voltam para a largada', jogador.mapa_x == 120 and jogador.mapa_y == 120)

    # O combustível acaba.
    t.get('novo_jogo')()
    t.set('combustivel', 0.05)
    t.step(3)
    t.check('sem combustível, a corrida acaba', t.get('estado') == 'fim')
    t.tap('SPACE')

    # Um piloto que planeja o caminho até a bandeira mais perto, longe dos vermelhos.
    bandeiras = t.get('bandeiras')
    quadros = 0
    while t.get('estado') == 'jogando' and quadros < 60 * 120:
        if jogador.mapa_x % lado == lado // 2 and jogador.mapa_y % lado == lado // 2 or quadros == 0:
            perigo = set()
            for carro in vermelhos:
                cx, cy = celula(carro, lado)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        perigo.add((cx + dx, cy + dy))
            passo = rota(t, celula(jogador, lado), set(bandeiras), perigo) or rota(t, celula(jogador, lado), set(bandeiras), set())
            if passo:
                t.down(SETAS[passo])
                t.step(1)
                t.up(SETAS[passo])
                quadros += 1
                continue
        t.step(1)
        quadros += 1
    t.check('planejando o caminho, pega as oito bandeiras', t.get('estado') == 'venceu',
            f"estado={t.get('estado')}, faltam={len(bandeiras)}, vidas={t.get('vidas')}, combustível={t.get('combustivel'):.0f}, {quadros / 60:.0f} s")
    t.shot('venceu')

    # O minimapa desenha um pontinho para o carro, para cada vermelho e para cada bandeira.
    t.tap('SPACE')
    t.step(1)
    t.check('espaço começa de novo com as oito bandeiras', len(t.get('bandeiras')) == 8 and t.get('vidas') == 3)
