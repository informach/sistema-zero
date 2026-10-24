"""Corredor do Kung Fu: the arrows walk by moving the corridor (and the goons with it), up to its
ends; A punches (short) and S kicks (longer), hitting only the goon in front, and the hero stands
still while striking; a goon that reaches the hero costs a life and the hero blinks safe for a
while; the stairs end the floor; a player that kicks the goons ahead and turns to the ones behind
reaches the stairs floor after floor."""

import random


def novo_capanga(t, x, lado):
    capanga = t.get('Actor')('capanga_andando1_' + lado, (x, t.get('CHAO')), anchor=('center', 'bottom'))
    capanga.lado = lado
    capanga.caindo = False
    capanga.agarrando = False
    t.get('capangas').append(capanga)
    return capanga


def jogar(t, quadros):
    """Walks to the stairs, kicking the nearest goon in front and turning to the ones behind."""
    heroi = t.get('heroi')
    for _ in range(quadros):
        if t.get('estado') != 'jogando':
            return
        if t.get('tempo_do_golpe') > 0:
            t.step(1)
            continue
        perto = [c for c in t.get('capangas') if not c.caindo and abs(c.x - heroi.x) <= 95]
        if not perto:
            t.down('LEFT')
            t.step(1)
            t.up('LEFT')
            continue
        alvo = min(perto, key=lambda c: abs(c.x - heroi.x))
        lado = 'esquerda' if alvo.x < heroi.x else 'direita'
        if t.get('lado') != lado:
            t.tap('LEFT' if lado == 'esquerda' else 'RIGHT')
        else:
            t.tap('s')
    t.up('LEFT')


def play(t):
    random.seed(7)
    heroi = t.get('heroi')
    largura = t.get('WIDTH')
    inicio = largura - t.get('COMPRIMENTO')
    t.check('começa na ponta direita do corredor, olhando para a escada', t.get('fundo_x') == inicio and t.get('lado') == 'esquerda')
    t.shot('inicio')

    # Sem capangas novos enquanto conferimos as regras.
    soltar = t.get('soltar_capanga')
    t.set('soltar_capanga', lambda: None)
    t.get('capangas').clear()

    t.hold('RIGHT', 30)
    t.check('na ponta do corredor, o fundo não anda mais', t.get('fundo_x') == inicio and t.get('lado') == 'direita')
    capanga = novo_capanga(t, 600, 'esquerda')
    x = capanga.x
    t.hold('LEFT', 20)
    passo = t.get('PASSO')
    t.check('andar move o fundo e os capangas juntos', t.get('fundo_x') == inicio + 20 * passo, f"fundo_x={t.get('fundo_x')}")
    t.check('o herói fica no meio da tela', heroi.x == largura / 2)
    andou = capanga.x - x
    t.check('o capanga anda com o fundo e na direção do herói, mais depressa que ele',
            andou == 20 * passo - 20 * t.get('VELOCIDADE_DOS_CAPANGAS') and andou < 0, f'andou {andou}')
    t.get('capangas').clear()

    # Para conferir os golpes, os capangas ficam parados onde forem colocados.
    mover = t.get('mover_capangas')
    t.set('mover_capangas', lambda: None)

    # O soco é curto, o chute vai mais longe, e os dois só acertam quem está na frente.
    perto = novo_capanga(t, heroi.x - 60, 'direita')
    pontos = t.get('pontos')
    t.tap('a')
    t.check('o soco derruba o capanga perto, na frente', perto.caindo and t.get('pontos') == pontos + 100)
    fundo = t.get('fundo_x')
    t.hold('LEFT', 5)
    t.check('golpeando, o herói não anda', t.get('fundo_x') == fundo)
    t.step(20)
    t.get('capangas').clear()
    longe = novo_capanga(t, heroi.x - 90, 'direita')
    t.tap('a')
    t.check('o soco não alcança o capanga mais longe', not longe.caindo)
    t.step(15)
    t.tap('s')
    t.check('o chute alcança', longe.caindo)
    t.step(25)
    t.get('capangas').clear()
    atras = novo_capanga(t, heroi.x + 60, 'esquerda')
    t.tap('s')
    t.check('de costas, o golpe não acerta quem vem por trás', not atras.caindo)
    t.step(25)
    t.tap('RIGHT')
    t.tap('s')
    t.check('virando para ele, acerta', atras.caindo, f'distância {atras.x - heroi.x}')
    t.step(25)
    t.set('mover_capangas', mover)
    t.until(lambda: not t.get('capangas'), 120)
    t.check('o capanga derrubado cai para fora da tela e some', not t.get('capangas'))

    # Quem alcança o herói o agarra: ele não anda e vai perdendo energia.
    t.check('até aqui nenhum capanga alcançou o herói', t.get('vidas') == 3 and t.get('energia') == 100)
    capanga = novo_capanga(t, heroi.x - 40, 'direita')
    t.step(10)
    t.check('o capanga que chega agarra o herói e para', capanga.agarrando and abs(capanga.x - heroi.x) <= 30)
    fundo = t.get('fundo_x')
    energia = t.get('energia')
    t.hold('LEFT', 30)
    t.check('agarrado, o herói não anda', t.get('fundo_x') == fundo)
    t.check('e perde energia', t.get('energia') < energia)
    t.tap('a')
    t.check('um golpe solta o herói', capanga.caindo and not t.get('agarrado')())
    t.step(20)
    t.hold('LEFT', 5)
    t.check('solto, ele volta a andar', t.get('fundo_x') > fundo)
    t.until(lambda: not t.get('capangas'), 120)
    vidas = t.get('vidas')
    novo_capanga(t, heroi.x - 20, 'direita')
    novo_capanga(t, heroi.x + 20, 'esquerda')
    t.set('energia', 0.3)
    t.step(1)
    t.check('sem energia, perde uma vida e recomeça com energia cheia e sem capangas',
            t.get('vidas') == vidas - 1 and t.get('energia') == 100 and not t.get('capangas'))

    # Chegando à escada, o andar acaba.
    t.set('fundo_x', -2 * t.get('PASSO'))
    t.hold('LEFT', 2)
    t.check('chegando à escada, o andar acaba', t.get('estado') == 'passou')
    t.shot('escada')
    t.tap('SPACE')
    t.check('espaço leva ao andar 2, de novo na porta', t.get('andar') == 2 and t.get('fundo_x') == inicio)

    # Um jogador que chuta quem vem na frente e se vira para quem vem atrás sobe três andares.
    t.set('soltar_capanga', soltar)
    random.seed(11)
    t.get('novo_jogo')()
    for andar in (1, 2, 3):
        jogar(t, 60 * 60)
        t.check(f'chutando os capangas, chega à escada do andar {andar}', t.get('estado') == 'passou',
                f"estado={t.get('estado')}, fundo_x={t.get('fundo_x')}, vidas={t.get('vidas')}")
        if andar == 1:
            t.shot('jogando')
        t.tap('SPACE')
    t.check('derrubou muitos capangas no caminho', t.get('pontos') >= 1000, f"pontos={t.get('pontos')}")

    # Sem golpear, os capangas alcançam o herói e ele não chega à escada.
    chegou = 0
    vidas_de_quem_chegou = []
    for semente in range(10):
        random.seed(semente)
        t.get('novo_jogo')()
        t.until(lambda: t.get('estado') != 'jogando', 60 * 60, 'LEFT')
        if t.get('estado') == 'passou':
            chegou = chegou + 1
            vidas_de_quem_chegou.append(t.get('vidas'))
    t.check('só andando, sem golpear, quase nunca se chega à escada (e quem chega chega no fim das vidas)',
            chegou <= 1 and all(v == 1 for v in vidas_de_quem_chegou), f'chegou {chegou} de 10, vidas {vidas_de_quem_chegou}')

    # Perdendo a última vida, acabou.
    t.get('novo_jogo')()
    t.set('vidas', 1)
    t.set('soltar_capanga', lambda: None)
    novo_capanga(t, heroi.x - 20, 'direita')
    t.until(lambda: t.get('estado') == 'fim', 60 * 10)
    t.check('perdendo a última vida, fim de jogo', t.get('estado') == 'fim')
    t.tap('SPACE')
    t.check('espaço começa de novo', t.get('estado') == 'jogando' and t.get('andar') == 1 and t.get('vidas') == 3)
