"""Bombas no Labirinto: the walls form a grid and the start corner is free; one bomb at a time
explodes after its time in four directions up to the range, stopping at walls and at the first
brick it breaks; a bomb in the fire explodes too; the fire kills monsters and the hero; a
monster touching the hero costs a life; with no monsters the uncovered door ends the level; a
player that bombs bricks and monsters and runs from the fire clears the level."""

import random
from collections import deque

PASSOS = {(0, -1): 'UP', (1, 0): 'RIGHT', (0, 1): 'DOWN', (-1, 0): 'LEFT'}


def fogo_de(t, coluna, linha):
    """The cells a bomb at (coluna, linha) would set on fire."""
    mapa = t.get('mapa')
    casas = {(coluna, linha)}
    for dc, dl in PASSOS:
        for passo in range(1, t.get('ALCANCE') + 1):
            c, l = coluna + dc * passo, linha + dl * passo
            if not (0 <= c < t.get('COLUNAS') and 0 <= l < t.get('LINHAS')) or mapa[l][c] == 'parede':
                break
            casas.add((c, l))
            if mapa[l][c] in ('tijolo', 'bomba'):
                break
    return casas


def perigo(t):
    mapa = t.get('mapa')
    casas = set()
    for l in range(t.get('LINHAS')):
        for c in range(t.get('COLUNAS')):
            if mapa[l][c] == 'fogo':
                casas.add((c, l))
            if mapa[l][c] == 'bomba':
                casas |= fogo_de(t, c, l)
    return casas


def perto_de_monstro(t):
    casas = set()
    for m in t.get('monstros'):
        casas.add((m.coluna, m.linha))
        for dc, dl in PASSOS:
            casas.add((m.coluna + dc, m.linha + dl))
    return casas


def caminho(t, de, alvo, evitar, extra_livre=()):
    """First step of the shortest walk from de to any cell for which alvo(cell) is true."""
    pode = t.get('pode_andar')
    vindo = {de: None}
    fila = deque([de])
    while fila:
        atual = fila.popleft()
        if alvo(atual):
            if atual == de:
                return (0, 0)
            while vindo[atual] != de:
                atual = vindo[atual]
            return (atual[0] - de[0], atual[1] - de[1])
        for dc, dl in PASSOS:
            n = (atual[0] + dc, atual[1] + dl)
            if n in vindo or n in evitar:
                continue
            if pode(*n) or n in extra_livre:
                vindo[n] = atual
                fila.append(n)
    return None


def tem_fuga(t, casa, ja_perigo, evitar):
    fogo = fogo_de(t, *casa) | ja_perigo
    pode = t.get('pode_andar')
    vistas = {casa}
    fila = deque([(casa, 0)])
    while fila:
        atual, dist = fila.popleft()
        if atual not in fogo:
            return True
        if dist >= 6:
            continue
        for dc, dl in PASSOS:
            n = (atual[0] + dc, atual[1] + dl)
            if n not in vistas and n not in evitar and pode(*n):
                vistas.add(n)
                fila.append((n, dist + 1))
    return False


def jogar(t, quadros):
    mapa = t.get('mapa')
    for _ in range(quadros // 8):
        if t.get('estado') != 'jogando':
            return
        heroi = (t.get('heroi_coluna'), t.get('heroi_linha'))
        p = perigo(t)
        monstros = perto_de_monstro(t)
        em_chamas = {(c, l) for l in range(t.get('LINHAS')) for c in range(t.get('COLUNAS')) if mapa[l][c] == 'fogo'}
        if heroi in p or heroi in monstros:
            passo = caminho(t, heroi, lambda c: c not in p and c not in monstros, em_chamas)
        elif any('bomba' in linha for linha in mapa):
            passo = (0, 0)
        elif not t.get('monstros') and mapa[t.get('porta')[1]][t.get('porta')[0]] == 'chao':
            passo = caminho(t, heroi, lambda c: c == t.get('porta'), p | monstros)
        else:
            vivos = {(m.coluna, m.linha) for m in t.get('monstros')}

            def bom(casa):
                fogo = fogo_de(t, *casa)
                quebra = any(mapa[l][c] == 'tijolo' for c, l in fogo)
                pega = bool(fogo & vivos)
                return (quebra or pega) and tem_fuga(t, casa, p, monstros)

            passo = caminho(t, heroi, bom, p | monstros)
            if passo == (0, 0):
                t.tap('SPACE')
                t.step(7)
                continue
        if passo and passo != (0, 0):
            t.tap(PASSOS[passo])
            t.step(7)
        else:
            t.step(8)


def play(t):
    random.seed(4)
    t.get('novo_jogo')()
    mapa = t.get('mapa')
    t.check('as paredes formam uma grade', all(mapa[l][c] == 'parede' for l in range(1, 11, 2) for c in range(1, 13, 2)))
    t.check('o canto do começo está livre', mapa[0][0] == 'chao' and mapa[0][1] == 'chao' and mapa[1][0] == 'chao')
    t.shot('inicio')

    # Uma bomba: o fogo vai até 3 casas, para na parede e no primeiro tijolo.
    for l in range(11):
        for c in range(13):
            if mapa[l][c] == 'tijolo':
                mapa[l][c] = 'chao'
    t.get('monstros').clear()
    mapa[0][4] = 'tijolo'
    mapa[0][6] = 'tijolo'
    t.set('heroi_coluna', 1)
    t.set('heroi_linha', 0)
    t.tap('DOWN')
    t.check('a parede não deixa passar', (t.get('heroi_coluna'), t.get('heroi_linha')) == (1, 0))
    t.set('heroi_coluna', 2)
    t.tap('SPACE')
    t.tap('LEFT')
    t.tap('SPACE')
    bombas = sum(linha.count('bomba') for linha in mapa)
    t.check('só uma bomba de cada vez', bombas == 1)
    t.set('heroi_coluna', 0)
    t.set('heroi_linha', 6)
    t.step(t.get('TEMPO_DA_BOMBA'))
    t.check('a bomba explode depois do tempo dela', mapa[0][2] == 'fogo')
    t.check('o fogo vai até 3 casas de um lado', mapa[0][0] == 'fogo' and mapa[0][1] == 'fogo')
    t.check('o tijolo atingido quebra e o fogo para nele', mapa[0][4] == 'fogo' and mapa[0][5] == 'chao' and mapa[0][6] == 'tijolo')
    t.check('a parede segura o fogo', mapa[1][1] == 'parede' and mapa[1][2] == 'fogo' and mapa[2][2] == 'fogo')
    t.step(t.get('TEMPO_DO_FOGO') + 1)
    t.check('o fogo apaga e vira chão', mapa[0][2] == 'chao' and mapa[0][4] == 'chao')

    # Uma bomba no fogo de outra explode junto.
    mapa[0][8] = 'bomba'
    t.get('relogio')[0][8] = 999
    mapa[0][10] = 'bomba'
    t.get('relogio')[0][10] = 1
    t.step(3)
    t.check('uma bomba atingida pelo fogo explode em seguida', mapa[0][8] == 'fogo')
    t.step(40)

    # O fogo derruba monstros e o herói; o monstro encostando custa vida.
    monstro = t.get('Actor')('monstro')
    monstro.coluna, monstro.linha = 6, 4
    t.get('monstros').append(monstro)
    mapa[4][6] = 'fogo'
    t.get('relogio')[4][6] = 10
    pontos = t.get('pontos')
    t.step(1)
    t.check('o monstro no fogo some e dá 100', not t.get('monstros') and t.get('pontos') == pontos + 100)
    vidas = t.get('vidas')
    mapa[t.get('heroi_linha')][t.get('heroi_coluna')] = 'fogo'
    t.get('relogio')[t.get('heroi_linha')][t.get('heroi_coluna')] = 10
    t.step(1)
    t.check('o herói no fogo perde uma vida e volta ao começo', t.get('vidas') == vidas - 1 and t.get('heroi_coluna') == 0)
    t.check('volta protegido, piscando', t.get('protegido') > 0)
    t.step(130)

    # O monstro que encosta custa uma vida.
    vidas = t.get('vidas')
    monstro = t.get('Actor')('monstro')
    monstro.coluna, monstro.linha = t.get('heroi_coluna'), t.get('heroi_linha')
    t.get('monstros').append(monstro)
    mover = t.get('mover_monstros')
    t.set('mover_monstros', lambda: None)
    t.step(1)
    t.check('o monstro que encosta no herói custa uma vida', t.get('vidas') == vidas - 1)
    t.step(1)
    t.check('protegido, o mesmo monstro não tira outra vida logo em seguida', t.get('vidas') == vidas - 1)

    # A porta só leva adiante depois de derrotar todos os monstros.
    coluna, linha = t.get('porta')
    mapa[linha][coluna] = 'chao'
    t.set('heroi_coluna', coluna)
    t.set('heroi_linha', linha)
    t.step(1)
    t.check('com monstros vivos, a porta não leva adiante', t.get('estado') == 'jogando')
    t.get('monstros').clear()
    t.step(1)
    t.check('sem monstros, a porta descoberta termina a fase', t.get('estado') == 'passou')
    t.set('mover_monstros', mover)

    # Uma bomba logo no começo custa uma vida só: o herói volta protegido do fogo.
    random.seed(4)
    t.get('novo_jogo')()
    t.get('monstros').clear()
    t.tap('SPACE')
    t.tap('RIGHT')
    t.step(t.get('TEMPO_DA_BOMBA') + t.get('TEMPO_DO_FOGO') + 10)
    t.check('a própria bomba perto do começo tira uma vida só', t.get('vidas') == 2, f"vidas={t.get('vidas')}")

    # Um jogador cuidadoso limpa a fase.
    random.seed(4)
    t.get('novo_jogo')()
    jogar(t, 60 * 300)
    t.check('quebrando tijolos e fugindo do fogo, passa da fase 1', t.get('estado') == 'passou',
            f"estado={t.get('estado')}, monstros={len(t.get('monstros'))}, vidas={t.get('vidas')}")
    t.shot('passou')
    t.tap('SPACE')
    t.check('espaço leva à fase 2, com um monstro a mais', t.get('fase') == 2 and len(t.get('monstros')) == 4)
