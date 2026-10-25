"""Sapo Atravessa: a car hits the frog; the water drowns it unless a log or the turtles carry it,
and they carry it off the screen too; the bank outside a den kills; a den fills once; time runs
out; a careful frog that waits for gaps fills the five dens and the next level is faster."""


def futuro(coisa, quadros):
    return coisa.x + coisa.velocidade * quadros


def faixa_livre(t, y, x, quadros):
    """No car of row y comes near x during the next frames."""
    for carro in t.get('carros'):
        if abs(carro.y - y) > 5:
            continue
        for k in range(quadros + 1):
            if abs(futuro(carro, k) - x) < carro.width / 2 + 26:
                return False
    return True


def boia_debaixo(t, y, x):
    """A log or turtles of row y well under x right now and in the next frames."""
    for boia in t.get('boias'):
        if abs(boia.y - y) < 5 and all(abs(futuro(boia, k) - x) < boia.width / 2 - 12 for k in range(4)):
            return True
    return False


def velocidade_da_faixa(t, y):
    for altura, velocidade, desenho, quantos in t.get('RIO'):
        if altura == y:
            return velocidade
    return 0


def pular(t, tecla):
    t.tap(tecla)
    t.step(3)


def jogar(t, quadros):
    sapo = t.get('sapo')
    estrada = [faixa[0] for faixa in t.get('ESTRADA')]
    rio = [faixa[0] for faixa in t.get('RIO')]
    for _ in range(quadros):
        if t.get('vidas') == 0 or t.get('fase') > 1:
            return
        y, x = sapo.y, sapo.x
        acima = y - 40
        if acima == t.get('CHEGADA_Y'):
            livres = [toca for toca, ocupada in zip(t.get('TOCAS'), t.get('ocupadas')) if not ocupada]
            if any(abs(toca - x) < 18 for toca in livres):
                pular(t, 'UP')
                continue
        elif acima in estrada:
            if faixa_livre(t, acima, x, 30):
                pular(t, 'UP')
                continue
        elif acima in rio:
            # Na faixa de baixo das tocas, só sobe se a correnteza ainda leva até uma toca vazia.
            if acima == t.get('CHEGADA_Y') + 40:
                livres = [toca for toca, ocupada in zip(t.get('TOCAS'), t.get('ocupadas')) if not ocupada]
                vai = velocidade_da_faixa(t, acima)
                bom = any((toca - x) * vai >= -10 for toca in livres)
            else:
                bom = True
            if bom and boia_debaixo(t, acima, x):
                pular(t, 'UP')
                continue
        elif acima >= t.get('CHEGADA_Y'):
            pular(t, 'UP')
            continue
        # No rio, perto da beirada para onde a correnteza leva: anda contra ela pelo tronco ou volta.
        if y in rio:
            vai = velocidade_da_faixa(t, y)
            perto_da_beirada = x > 700 if vai > 0 else x < 100
            livres = [toca for toca, ocupada in zip(t.get('TOCAS'), t.get('ocupadas')) if not ocupada]
            sem_toca_adiante = y == t.get('CHEGADA_Y') + 40 and not any((toca - x) * vai >= -10 for toca in livres)
            if perto_da_beirada or sem_toca_adiante:
                contra = 'LEFT' if vai > 0 else 'RIGHT'
                nx = x - 40 if vai > 0 else x + 40
                if boia_debaixo(t, y, nx):
                    pular(t, contra)
                    continue
                if y + 40 not in rio or boia_debaixo(t, y + 40, x):
                    pular(t, 'DOWN')
                    continue
        # Parado numa faixa da estrada, foge de um carro que vem chegando.
        if y in estrada and not faixa_livre(t, y, x, 20):
            fugiu = False
            for tecla, ny, nx in (('DOWN', y + 40, x), ('LEFT', y, x - 40), ('RIGHT', y, x + 40)):
                seguro = ny not in estrada or faixa_livre(t, ny, nx, 20)
                if seguro and 20 <= nx <= 780 and ny <= 580:
                    pular(t, tecla)
                    fugiu = True
                    break
            if fugiu:
                continue
        t.step(1)


def play(t):
    sapo = t.get('sapo')
    t.check('cinco tocas vazias, três vidas', t.get('ocupadas') == [False] * 5 and t.get('vidas') == 3)
    t.shot('inicio')
    t.tap('UP')
    t.step(1)
    t.check('a seta para cima pula uma faixa e dá 10 pontos', sapo.y == 540 and t.get('pontos') == 10)
    t.tap('DOWN')
    t.step(1)
    t.tap('UP')
    t.step(1)
    t.check('voltar para a mesma faixa não dá ponto de novo', t.get('pontos') == 10)

    # Um carro passando por cima.
    carro = t.get('carros')[0]
    carro.x = sapo.x + carro.velocidade * -3
    t.step(4)
    t.check('o carro atropela o sapo', t.get('vidas') == 2 and sapo.pos == t.get('INICIO'), t.get('aviso'))

    # Na água sem tronco, afunda.
    for boia in t.get('boias'):
        boia.x = -500
        boia.velocidade = 0
    sapo.pos = (400, 300)
    t.step(2)
    t.check('na água sem tronco, o sapo afunda', t.get('vidas') == 1 and 'água' in t.get('aviso'))

    # Em cima do tronco, é levado junto.
    t.get('novo_jogo')()
    tronco = [b for b in t.get('boias') if b.y == 260][0]
    tronco.x = 400
    sapo.pos = (400, 260)
    t.step(10)
    t.check('em cima do tronco, o sapo vai junto', abs(sapo.x - tronco.x) < 1 and t.get('vidas') == 3,
            f'sapo={sapo.x} tronco={tronco.x}')
    tronco.x = 790
    sapo.x = 790
    t.step(10)
    t.check('o tronco leva o sapo para fora do rio', t.get('vidas') == 2)

    # A margem fora da toca mata; a toca se enche uma vez só.
    t.get('novo_jogo')()
    sapo.pos = (160, 100)
    t.step(1)
    t.check('pular na margem entre as tocas mata', t.get('vidas') == 2)
    sapo.pos = (240, 100)
    t.step(1)
    t.check('pular numa toca vazia enche ela e dá pontos', t.get('ocupadas')[1] and sapo.pos == t.get('INICIO'))
    sapo.pos = (240, 100)
    t.step(1)
    t.check('a mesma toca não enche de novo', t.get('vidas') == 1)

    # O tempo acaba.
    t.get('novo_jogo')()
    t.set('tempo', 0.05)
    t.step(5)
    t.check('o tempo acabando custa uma vida', t.get('vidas') == 2 and 'tempo' in t.get('aviso'))

    # Um sapo cuidadoso enche as cinco tocas.
    t.get('novo_jogo')()
    jogar(t, 60 * 300)
    t.check('esperando as brechas, o sapo enche as cinco tocas e vai para a fase 2', t.get('fase') == 2,
            f"tocas={t.get('ocupadas')}, vidas={t.get('vidas')}")
    rapido = abs(t.get('carros')[0].velocidade)
    t.check('na fase 2 os carros andam mais rápido', rapido > 1.5, f'velocidade={rapido}')
    t.shot('fase2')

    # Sem vidas, espaço recomeça.
    t.set('vidas', 1)
    t.set('tempo', 0.01)
    t.step(3)
    t.check('sem vidas, o jogo para', t.get('vidas') == 0)
    t.shot('fim')
    t.tap('SPACE')
    t.check('espaço começa de novo', t.get('vidas') == 3 and t.get('fase') == 1)
