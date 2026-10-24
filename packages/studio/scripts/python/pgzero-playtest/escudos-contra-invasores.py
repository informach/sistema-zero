def play(t):
    c = t.get('canhao')
    tiro = t.get('tiro')
    escudos = t.get('escudos')
    t.get('clock').unschedule(t.get('soltar_bomba'))
    t.get('bombas').clear()

    def pedacos(numero):
        return sum(sum(1 for p in linha if p) for linha in escudos[numero])

    inteiro = pedacos(1)
    # Embaixo do segundo escudo (x de 290 a 374), atirando sempre no mesmo lugar.
    t.until(lambda: c.x <= 330, 200, key='LEFT')
    t.check('o canhão para embaixo do escudo', abs(c.x - 330) <= 5, f'x={c.x}')
    tiros = 0
    furou = False
    for tiro_numero in range(20):
        t.tap('SPACE')
        subiu_alem = False
        for _ in range(120):
            t.step(1)
            if tiro.y < t.get('ESCUDO_Y') - 10 and tiro.y > 0:
                subiu_alem = True
            if tiro.y <= -20:
                break
        tiros += 1
        if subiu_alem:
            furou = True
            break
    t.check('cada tiro arranca pedaços do escudo', pedacos(1) < inteiro, f'pedaços: {inteiro} -> {pedacos(1)}')
    t.check('atirando no mesmo lugar, abre um buraco e o tiro passa', furou, f'tiros depois de começar: {tiros}')
    t.shot('1-buraco')
    # Um invasor alinhado com o canhão: o tiro acerta e conta 10 pontos.
    invasores = t.get('invasores')
    alvo = invasores[0]
    t.set('marcha', 0)
    alvo.pos = (c.x, 200)
    pontos = t.get('pontos')
    t.tap('SPACE')
    t.until(lambda: alvo not in invasores, 120)
    t.check('acertar um invasor tira ele do jogo e soma 10', alvo not in invasores and t.get('pontos') == pontos + 10, f"pontos={t.get('pontos')}")
    # Uma bomba no canhão tira uma vida.
    bomba = t.get('Actor')('bomba')
    bomba.midbottom = (c.x, c.top - 2)
    t.get('bombas').append(bomba)
    t.step(3)
    t.check('uma bomba no canhão tira uma vida', t.get('vidas') == 2, f"vidas={t.get('vidas')}")
    # Acabando os invasores, vence.
    invasores.clear()
    t.step(2)
    t.check('sem invasores, a Terra está salva', t.get('venceu'))
    t.shot('2-venceu')
    t.tap('SPACE')
    t.step(2)
    t.check('espaço recomeça com escudos inteiros e 24 invasores', pedacos(1) == inteiro and len(invasores) == 24 and t.get('vidas') == 3)
