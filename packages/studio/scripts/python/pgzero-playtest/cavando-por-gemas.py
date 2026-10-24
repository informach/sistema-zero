"""Cavando por Gemas: a bot that plans a path every step takes every gem and leaves by the exit
in time; a falling rock crushes, a resting one does not; rocks roll off rocks; pushing works
only into an empty cell; the exit opens only with every gem; a tap moves one cell."""

from collections import deque

SETAS = {(0, -1): 'LEFT', (0, 1): 'RIGHT', (-1, 0): 'UP', (1, 0): 'DOWN'}
PEDRAS = ('pedra', 'pedra_caindo')


def caverna(t, linhas):
    """Replaces the cave with a small test drawing (same letters as CAVERNA)."""
    t.set('CAVERNA', linhas)
    t.get('novo_jogo')()


def onde(t):
    return t.get('heroi_linha'), t.get('heroi_coluna')


def proximo_passo(grade, inicio, alvos):
    """Breadth-first search over cells the miner may enter safely; returns the first move."""
    altura, largura = len(grade), len(grade[0])

    def seguro(de, para):
        linha, coluna = para
        if grade[linha][coluna] not in ('terra', 'vazio', 'gema', 'saida_aberta'):
            return False
        if grade[linha - 1][coluna] == 'pedra_caindo':
            return False
        # Going down from under a rock would make it fall after us.
        if para[0] > de[0] and grade[de[0] - 1][de[1]] in PEDRAS:
            return False
        return True

    vindo = {inicio: None}
    fila = deque([inicio])
    while fila:
        atual = fila.popleft()
        if atual in alvos:
            while vindo[atual] != inicio:
                atual = vindo[atual]
            return (atual[0] - inicio[0], atual[1] - inicio[1])
        for passo in SETAS:
            vizinho = (atual[0] + passo[0], atual[1] + passo[1])
            if 0 < vizinho[0] < altura - 1 and 0 < vizinho[1] < largura - 1 and vizinho not in vindo:
                if seguro(atual, vizinho):
                    vindo[vizinho] = atual
                    fila.append(vizinho)
    return None


def esperar_passo(t):
    """Steps until the game's own step (0.12 s) has run once."""
    t.step(8)


def jogar_sozinho(t, limite_de_passos):
    grade = t.get('grade')
    parado = 0
    for _ in range(limite_de_passos):
        if t.get('estado') != 'jogando':
            break
        if t.get('gemas') < t.get('gemas_total'):
            alvos = {(l, c) for l in range(len(grade)) for c in range(len(grade[0])) if grade[l][c] == 'gema'}
        else:
            alvos = {(l, c) for l in range(len(grade)) for c in range(len(grade[0])) if grade[l][c] == 'saida_aberta'}
        passo = proximo_passo(grade, onde(t), alvos)
        if passo is None:
            parado += 1
            esperar_passo(t)
            continue
        t.tap(SETAS[passo])
        esperar_passo(t)


def play(t):
    grade = t.get('grade')
    t.check('a caverna tem 14 linhas de 20 casas', len(grade) == 14 and all(len(linha) == 20 for linha in grade))
    t.check('dez gemas para pegar', t.get('gemas_total') == 10)
    t.shot('inicio')

    # Um toque rápido anda exatamente uma casa.
    antes = onde(t)
    t.tap('RIGHT')
    t.step(30)
    t.check('um toque na seta anda uma casa só', onde(t) == (antes[0], antes[1] + 1), f'{antes} -> {onde(t)}')

    # O robô pega todas as gemas e sai pela porta antes de o tempo acabar.
    t.get('novo_jogo')()
    jogar_sozinho(t, 2500)
    t.check('pegando todas as gemas e indo à saída, vence', t.get('estado') == 'venceu',
            f"estado={t.get('estado')}, gemas={t.get('gemas')}, tempo={t.get('tempo')}")
    t.check('sobra tempo no relógio', t.get('tempo') > 30, f"tempo={t.get('tempo')}")
    t.shot('venceu')
    t.tap('SPACE')
    t.step(2)
    t.check('espaço recomeça com a caverna inteira', t.get('estado') == 'jogando' and t.get('gemas') == 0)

    # Uma pedra parada fica apoiada no minerador; cavando a terra embaixo, ela cai.
    caverna(t, [
        '#####',
        '#.o.#',
        '#.M.#',
        '#...#',
        '#*.S#',
        '#####',
    ])
    t.step(60)
    t.check('pedra parada em cima do minerador não machuca', t.get('estado') == 'jogando')
    t.tap('LEFT')
    t.step(16)
    grade = t.get('grade')
    t.check('saindo de baixo, a pedra cai na casa que ficou vazia', grade[2][2] in PEDRAS and grade[1][2] == 'vazio',
            f'{grade[1][2]} / {grade[2][2]}')

    # Uma pedra que já está caindo amassa quem estiver embaixo.
    caverna(t, [
        '#####',
        '#.o.#',
        '#...#',
        '#.M.#',
        '#*.S#',
        '#####',
    ])
    t.get('grade')[2][2] = 'vazio'
    t.step(30)
    t.check('pedra caindo amassa o minerador parado', t.get('estado') == 'amassado')
    t.shot('amassado')

    # Em cima de outra pedra, ela rola para o lado livre.
    caverna(t, [
        '######',
        '#M.o.#',
        '#..o.#',
        '#*...#',
        '#...S#',
        '######',
    ])
    for linha in (1, 2, 3):
        t.get('grade')[linha][4] = 'vazio'
    t.step(16)
    grade = t.get('grade')
    coluna_4 = [grade[linha][4] for linha in (1, 2, 3)]
    t.check('pedra em cima de pedra rola para o lado vazio', grade[1][3] == 'vazio' and any(c in PEDRAS for c in coluna_4),
            f'{grade[1][3]} / {coluna_4}')

    # Empurrar: só para um lado vazio.
    caverna(t, [
        '######',
        '#Mo..#',
        '#....#',
        '#*..S#',
        '######',
    ])
    t.tap('RIGHT')
    t.step(16)
    t.check('empurrar pedra contra a terra não anda', onde(t) == (1, 1) and t.get('grade')[1][2] == 'pedra')
    t.get('grade')[1][3] = 'vazio'
    t.tap('RIGHT')
    t.step(16)
    grade = t.get('grade')
    t.check('com espaço vazio do outro lado, a pedra é empurrada', onde(t) == (1, 2) and grade[1][3] in PEDRAS)

    # A saída só abre com todas as gemas.
    caverna(t, [
        '#####',
        '#MS*#',
        '#####',
    ])
    t.tap('RIGHT')
    t.step(16)
    t.check('a saída fechada é parede', onde(t) == (1, 1) and t.get('estado') == 'jogando')
    caverna(t, [
        '######',
        '#M*S.#',
        '######',
    ])
    t.tap('RIGHT')
    t.step(16)
    t.check('pegando a última gema, a saída abre', t.get('grade')[1][3] == 'saida_aberta')
    t.tap('RIGHT')
    t.step(16)
    t.check('entrar na saída aberta vence', t.get('estado') == 'venceu')

    # O tempo acaba.
    t.get('novo_jogo')()
    t.set('tempo', 2)
    t.step(150)
    t.check('o tempo acabando termina o jogo', t.get('estado') == 'sem_tempo' and t.get('tempo') == 0)
    t.shot('sem-tempo')
