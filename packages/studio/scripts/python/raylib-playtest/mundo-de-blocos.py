"""Mundo de Blocos: a mira põe o bloco na face certa, não prende o jogador, o bloco barra o caminho e some com X."""


def play(t):
    g = t.game
    mundo = lambda: g['mundo']

    yield from t.wait(5)
    t.check(len(mundo()) == 319, f'o mundo não nasceu com 319 blocos ({len(mundo())})')
    # Sem jogar, nada muda.
    yield from t.wait(30)
    t.check(len(mundo()) == 319, 'o mundo mudou sozinho')
    t.shot('inicio')

    # Olhando para o chão logo à frente, C põe um tijolo em cima do bloco (1, 0, 0).
    g['angulo'] = 0
    g['olhar'] = -1.0
    yield from t.wait(2)
    t.check(g['alvo'] is not None and g['chave'](1, 0, 0) == '1,0,0', 'a mira não achou o chão')
    t.check(g['normal'].y == 1, f'a normal da face de cima não aponta para cima ({g["normal"].y})')
    yield from t.tap('C', 1)
    t.check('1,1,0' in mundo(), 'o C não pôs o bloco em cima do chão')
    t.check(mundo()['1,1,0'].tipo == g['NOMES'].index('tijolo'), 'o bloco posto não é o escolhido')
    t.shot('colocou')

    # A mira agora bate na face do tijolo que olha para o jogador: o bloco novo cairia em cima dele.
    yield from t.wait(2)
    t.check(g['normal'].x == -1, f'a mira não pegou a face de frente ({g["normal"].x})')
    yield from t.tap('C', 1)
    t.check(len(mundo()) == 320, f'um bloco entrou no lugar do jogador ({len(mundo())})')

    # O tijolo barra o caminho.
    t.hold('W')
    yield from t.wait(60)
    t.release('W')
    yield
    t.check(g['posicao'].x < 0.5, f'o jogador atravessou o tijolo (x = {g["posicao"].x:.2f})')

    # E troca o bloco escolhido; X tira o bloco mirado.
    yield from t.tap('E', 1)
    t.check(g['NOMES'][g['escolhido']] == 'madeira', 'o E não trocou o bloco')
    yield from t.tap('X', 1)
    t.check('1,1,0' not in mundo() and len(mundo()) == 319, 'o X não tirou o tijolo')

    # Pular sobe e volta para o chão.
    chao = g['posicao'].y
    yield from t.tap('SPACE', 1)
    yield from t.wait(10)
    t.check(g['posicao'].y > chao + 0.5, 'o pulo não subiu')
    yield from t.wait(60)
    t.check(abs(g['posicao'].y - chao) < 0.05 and g['no_chao'], 'o jogador não voltou para o chão')
    t.shot('fim')

    # Cavar o bloco embaixo dos pés: o jogador cai, renasce e o chão do começo volta (antes ele
    # caía de novo pelo mesmo buraco, sem fim).
    g['posicao'].x = 0
    g['posicao'].z = 0
    g['olhar'] = -1.5
    yield from t.wait(2)
    yield from t.tap('X', 1)
    t.check('0,0,0' not in mundo(), 'o X não cavou o bloco embaixo dos pés')
    for _ in range(240):
        yield
    t.check('0,0,0' in mundo(), 'o chão do começo não voltou')
    t.check(g['no_chao'] and abs(g['posicao'].y - chao) < 0.05, 'o jogador não ficou de pé no começo')
