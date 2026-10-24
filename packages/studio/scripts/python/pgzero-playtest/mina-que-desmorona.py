def play(t):
    m = t.get('mineiro')
    robo = t.get('robo')

    def andar(x):
        key = 'RIGHT' if x > m.x else 'LEFT'
        t.until(lambda: m.x >= x if key == 'RIGHT' else m.x <= x, 400, key=key)

    def pular(ate_x=None):
        """Jumps; steers in the air until x reaches ate_x, then lets go and lands."""
        antes = m.bottom
        t.tap('SPACE')
        if ate_x is not None:
            key = 'RIGHT' if ate_x > m.x else 'LEFT'
            t.until(lambda: (m.x >= ate_x if key == 'RIGHT' else m.x <= ate_x) or t.get('no_chao'), 120, key=key)
        t.until(lambda: t.get('no_chao'), 120)
        print(f'    pulo até {ate_x}: de y={antes} para y={m.bottom} x={round(m.x)} vidas={t.get("vidas")}')

    def esperar_robo_longe():
        t.until(lambda: robo.x > 700 and t.get('robo_vai') > 0, 600)

    t.shot('0-inicio')
    andar(150)
    pular(190)
    andar(235)
    t.check('pega a 1ª chave (no chão que desmorona)', len(t.get('chaves')) == 2, f'x={m.x} y={m.bottom}')
    pular(290)
    andar(400)
    pular()
    t.check('pega a 2ª chave (no meio da mina)', len(t.get('chaves')) == 1, f'x={m.x} y={m.bottom}')
    t.shot('1-duas-chaves')
    esperar_robo_longe()
    andar(485)
    t.until(lambda: t.get('no_chao') and m.bottom == 350, 120)
    pular(520)
    andar(565)
    pular(600)
    andar(625)
    pular(690)
    andar(680)
    pular(630)
    t.check('pega a 3ª chave (no alto à direita)', len(t.get('chaves')) == 0, f'x={m.x} y={m.bottom}')
    t.check('a porta abre', t.get('porta').image == 'porta_aberta')
    t.shot('2-tres-chaves')
    # A volta até a porta, no alto à esquerda.
    andar(690)
    t.until(lambda: m.bottom == 250, 60)
    andar(600)
    t.until(lambda: m.bottom == 300, 60)
    andar(500)
    pular(440)
    andar(300)
    t.until(lambda: m.bottom == 300, 120)
    print(f'    caminho de volta: x={round(m.x)} y={m.bottom}')
    andar(150)
    pular(110)
    pular(190)
    pular(140)
    pular(250)
    pular(160)
    pular(70)
    t.check('sai pela porta', t.get('venceu'), f'x={m.x} y={m.bottom}')
    t.check('sem perder vida pelo caminho', t.get('vidas') == 3, f"vidas={t.get('vidas')}")
    t.shot('3-saiu')
    t.tap('SPACE')
    t.step(3)
    t.check('espaço recomeça com as três chaves de volta', len(t.get('chaves')) == 3 and not t.get('venceu'))
    # Em cima de dois blocos frágeis vizinhos, os dois afundam juntos (o mineiro não atravessa nenhum).
    tipos = t.get('tipos')
    blocos = t.get('blocos')
    vizinhos = [n for n, b in enumerate(blocos) if tipos[n] == '~' and b.top == 200 and b.left in (340, 370)]
    m.midbottom = (370, 200)
    t.step(260)
    t.check('dois blocos frágeis embaixo dos pés afundam juntos', all(tipos[n] == 'x' for n in vizinhos) and len(vizinhos) == 2,
            f'{[tipos[n] for n in vizinhos]} y={m.bottom}')
