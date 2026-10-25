def play(t):
    e = t.get('explorador')
    ponta = t.get('ponta_do_cipo')
    t.shot('0-inicio')
    t.until(lambda: e.x >= 235, 300, key='RIGHT')
    t.check('anda até a beira do poço sem cair', not t.get('caindo') and e.x >= 235, f'x={e.x}')
    # Pula quando a ponta do cipó vem chegando (ela anda para a esquerda com balanco == -1).
    for tentativa in range(12):
        t.until(lambda: t.get('balanco') == -1 and ponta()[0] - e.x < 70, 400)
        t.tap('SPACE')
        t.until(lambda: t.get('pendurado'), 40)
        if t.get('pendurado'):
            break
        t.until(lambda: e.bottom >= t.get('CHAO') - 1, 80)
    t.check('agarra o cipó com um pulo', t.get('pendurado'), f'tentativas={tentativa + 1}')
    t.shot('1-pendurado')
    t.until(lambda: ponta()[0] > 575, 400)
    t.tap('SPACE')
    t.step(90)
    t.check('solta do outro lado e pisa no chão', not t.get('caindo') and e.x > t.get('POCO_FIM'), f'x={e.x} bottom={e.bottom}')
    t.shot('2-outro-lado')
    tronco = t.get('tronco')
    vidas = t.get('vidas')
    t.down('RIGHT')
    for _ in range(600):
        if t.get('pegou_tesouro'):
            break
        if 0 < tronco.left - e.right < 40 and e.bottom >= t.get('CHAO') - 1:
            t.tap('SPACE')
        t.step(1)
    t.up('RIGHT')
    t.check('pula o tronco sem perder vida', t.get('vidas') == vidas, f"vidas={t.get('vidas')}")
    t.check('pega o tesouro', t.get('pegou_tesouro'))
    t.shot('3-tesouro')
    t.tap('SPACE')
    t.step(5)
    t.check('espaço recomeça do início', not t.get('pegou_tesouro') and e.x < 100)
