"""Motos de Luz: both cycles leave a trail; the player turns but never reverses; a wall or a
trail ends the round; the computer avoids walls and trails on its own for a long time; a player
that keeps to the open side wins rounds; the first to three wins the race."""

import random
from collections import deque

SETAS = {(0, -1): 'UP', (-1, 0): 'LEFT', (0, 1): 'DOWN', (1, 0): 'RIGHT'}


def espaco(t, coluna, linha, limite=400):
    livre = t.get('livre')
    if not livre(coluna, linha):
        return 0
    vistas = {(coluna, linha)}
    fila = deque([(coluna, linha)])
    while fila and len(vistas) < limite:
        c, l = fila.popleft()
        for dc, dl in SETAS:
            n = (c + dc, l + dl)
            if n not in vistas and livre(*n):
                vistas.add(n)
                fila.append(n)
    return len(vistas)


def jogar_rodada(t, inteligente=True, limite=60 * 120):
    jogador = t.get('jogador')
    direcoes = t.get('DIRECOES')
    for quadro in range(limite):
        if t.get('estado') != 'correndo':
            return quadro
        if inteligente and t.get('quadros') % t.get('RITMO') == t.get('RITMO') - 1:
            melhor, maior = None, -1
            for virada in (0, 1, 3):
                d = (jogador.direcao + virada) % 4
                dc, dl = direcoes[d]
                e = espaco(t, jogador.coluna + dc, jogador.linha + dl) + (3 if virada == 0 else 0)
                if e > maior:
                    melhor, maior = d, e
            if melhor != jogador.direcao:
                t.tap(SETAS[direcoes[melhor]])
                continue
        t.step(1)
    return limite


def play(t):
    random.seed(6)
    jogador = t.get('jogador')
    computador = t.get('computador')
    t.step(9)
    t.check('as duas motos andam e deixam rastro', len(t.get('rastros')) == 6 and jogador.linha == 42)
    t.tap('DOWN')
    t.step(3)
    t.check('indo para cima, a seta para baixo não faz meia-volta', jogador.direcao == 0)
    t.tap('LEFT')
    t.step(3)
    t.check('a seta da esquerda vira para a esquerda', jogador.direcao == 1 and jogador.angle == 90)

    t.tap('UP')
    t.tap('RIGHT')
    t.step(3)
    t.check('duas setas rápidas não fazem meia-volta (a segunda é recusada)', jogador.direcao == 0 and not jogador.bateu)
    t.tap('LEFT')
    t.step(3)

    # Seguindo reto até a parede da esquerda, bate.
    t.until(lambda: t.get('estado') != 'correndo', 60 * 30)
    t.check('bater na parede termina a rodada e o computador marca', t.get('pontos_computador') == 1 and jogador.bateu)
    t.check('o computador segue vivo sozinho enquanto isso', not computador.bateu)
    t.shot('rodada')
    t.tap('SPACE')
    t.check('espaço começa outra rodada', t.get('estado') == 'correndo' and not t.get('rastros'))

    # Um rastro também derruba.
    t.get('grade')[jogador.coluna][jogador.linha - 3] = 2
    t.until(lambda: t.get('estado') != 'correndo', 60)
    t.check('passar por um rastro termina a rodada', jogador.bateu)
    t.tap('SPACE')

    # Ninguém atravessa a moto do outro: a casa que a moto deixa já é rastro.
    def lado_a_lado(jc, jl, jd, cc, cl, cd):
        t.get('grade').clear()
        for _ in range(t.get('COLUNAS')):
            t.get('grade').append([0] * t.get('LINHAS'))
        t.get('colocar')(jogador, jc, jl, jd)
        t.get('colocar')(computador, cc, cl, cd)
        t.set('estado', 'correndo')
        t.set('pensar', lambda: None)
        t.until(lambda: t.get('estado') != 'correndo', 10)
        t.set('pensar', pensar)
    pensar = t.get('pensar')
    lado_a_lado(30, 20, 3, 31, 20, 2)
    t.check('entrar na casa que a outra moto acabou de deixar derruba', jogador.bateu and not computador.bateu)
    t.tap('SPACE')
    lado_a_lado(30, 20, 3, 31, 20, 1)
    t.check('frente a frente, em casas vizinhas, é empate', jogador.bateu and computador.bateu and t.get('resultado') == 'Empate!')
    t.tap('SPACE')
    lado_a_lado(30, 20, 3, 32, 20, 1)
    t.check('frente a frente, com uma casa no meio, também é empate', jogador.bateu and computador.bateu)
    t.tap('SPACE')

    # Jogando com cuidado, numa corrida nova, o jogador ganha rodadas, e alguém chega a três.
    t.get('novo_jogo')()
    rodadas = 0
    while t.get('estado') != 'fim' and rodadas < 15:
        quadros = jogar_rodada(t)
        t.check(f'a rodada {rodadas + 1} dura bastante (o computador desvia sozinho)', quadros > 200, f'{quadros} quadros')
        if t.get('estado') == 'fim_da_rodada':
            t.tap('SPACE')
        rodadas += 1
    t.check('alguém chega a três vitórias', t.get('estado') == 'fim')
    t.check('fugindo para o lado livre, o jogador ganha rodadas', t.get('pontos_jogador') >= 1,
            f"jogador {t.get('pontos_jogador')} x {t.get('pontos_computador')} computador")
    t.shot('fim')
    t.tap('SPACE')
    t.check('espaço começa uma corrida nova', t.get('pontos_jogador') == 0 and t.get('pontos_computador') == 0)
