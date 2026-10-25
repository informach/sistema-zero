"""Centopeia: rocks are scattered over the field; the centipede enters at the top, walks sideways
and goes one row down when it meets a rock or the border, and in the player's zone it keeps going
up and down; its parts stay in a chain; one shot at a time; a hit part becomes a rock and the
parts behind it get their own head; a rock takes three shots; touching the centipede costs a
life; a cleared centipede brings a longer, faster one."""


def play(t):
    t.get('random').seed(5)
    pedras = t.get('pedras')
    Parte = t.get('Parte')
    casa_px = t.get('CASA')
    zona = t.get('ZONA_DO_JOGADOR')
    linhas = t.get('LINHAS')

    t.check('o campo começa com as pedras fora da zona do jogador', len(pedras) == 30
            and all(2 <= linha < zona for coluna, linha in pedras))
    t.shot('inicio')
    t.tap('SPACE')
    centopeia = t.get('centopeia')
    t.check('espaço começa com uma centopeia de oito partes', t.get('estado') == 'jogando' and len(centopeia) == 8)

    def em_fila():
        casas = [(parte.coluna, parte.linha) for parte in centopeia]
        return all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1 for a, b in zip(casas, casas[1:]))

    # As partes seguem em fila, mesmo nas curvas.
    t.set('protegido', 999)
    sempre_em_fila = True
    for _ in range(600):
        t.step(1)
        if not em_fila():
            sempre_em_fila = False
    t.check('as partes andam em fila, uma atrás da outra, mesmo nas curvas', sempre_em_fila)
    t.check('a centopeia desce enquanto anda', max(parte.linha for parte in centopeia) > 2)

    # Desce na borda e na pedra.
    pedras.clear()
    centopeia.clear()
    centopeia.append(Parte(17, 3, 1, 4))
    t.until(lambda: centopeia[0].linha == 4, 120)
    t.check('na borda, ela desce uma linha e volta', centopeia[0].coluna == 19 and centopeia[0].direcao == -1)
    t.get('por_pedra')((15, 4))
    t.until(lambda: centopeia[0].linha == 5, 120)
    t.check('na pedra, ela desce uma linha e volta', centopeia[0].coluna == 16 and centopeia[0].direcao == 1)

    # Lá embaixo, sobe e desce na zona do jogador, sem sair do campo.
    t.until(lambda: centopeia[0].linha == linhas - 1, 60 * 40)
    linhas_vistas = set()
    for _ in range(60 * 40):
        t.step(1)
        linhas_vistas.add(centopeia[0].linha)
    t.check('lá embaixo, ela sobe e desce só na zona do jogador, sem sair do campo',
            min(linhas_vistas) == zona and max(linhas_vistas) == linhas - 1, str(sorted(linhas_vistas)))

    # Um tiro por vez.
    centopeia.clear()
    jogador = t.get('jogador')
    t.down('SPACE')
    t.step(3)
    primeiro = t.get('tiro').y
    t.step(3)
    t.up('SPACE')
    t.check('segurando o espaço, sai um tiro de cada vez', t.get('atirando') and t.get('tiro').y < primeiro)

    # Acertar uma parte: vira pedra e a fila se parte em duas.
    t.until(lambda: not t.get('atirando'), 120)
    # Uma fila parada, andando para a esquerda: a cabeça é a da coluna 5.
    centopeia.clear()
    fila = [Parte(coluna, 3, -1, 0) for coluna in range(5, 10)]
    fila[0].cabeca = True
    centopeia.extend(fila)
    jogador.centerx = 7 * casa_px + casa_px / 2
    pontos = t.get('pontos')
    t.tap('SPACE')
    t.until(lambda: not t.get('atirando'), 120)
    t.check('a parte acertada some, vale 10 pontos e vira pedra',
            fila[2] not in centopeia and (fila[2].coluna, 3) in pedras and t.get('pontos') == pontos + 10)
    t.check('a parte de trás vira a cabeça da nova fila', fila[3].cabeca and not fila[1].cabeca and not fila[4].cabeca)
    t.shot('partida-em-duas')

    # Uma pedra aguenta três tiros.
    centopeia.clear()
    t.get('por_pedra')((2, 6))
    jogador.centerx = 2 * casa_px + casa_px / 2
    for tiro in range(3):
        t.tap('SPACE')
        t.until(lambda: not t.get('atirando'), 120)
        if tiro < 2:
            t.check(f'a pedra aguenta o tiro {tiro + 1}', (2, 6) in pedras and pedras[(2, 6)].vida == 2 - tiro)
    t.check('no terceiro tiro a pedra some', (2, 6) not in pedras)

    # Encostar na centopeia custa uma vida.
    t.set('protegido', 0)
    vidas = t.get('vidas')
    parte = Parte(0, 0, 1, 0)
    parte.ator.center = jogador.center
    centopeia.append(parte)
    t.step(1)
    t.check('encostar na centopeia custa uma vida e protege por um tempo',
            t.get('vidas') == vidas - 1 and t.get('protegido') > 1.5)
    t.step(1)
    t.check('protegido, não perde outra', t.get('vidas') == vidas - 1)

    # Metade que vence uma onda: um atirador que fica embaixo da parte mais baixa.
    t.set('vidas', 3)
    t.get('novo_jogo')()
    centopeia = t.get('centopeia')
    perdidas = 0
    for _ in range(60 * 90):
        if t.get('onda') == 2 or t.get('estado') != 'jogando':
            break
        visiveis = [p for p in centopeia if p.ator.left >= 0]
        if visiveis:
            alvo = max(visiveis, key=lambda p: p.ator.y)
            t.up('LEFT')
            t.up('RIGHT')
            if alvo.ator.x < jogador.x - 4:
                t.down('LEFT')
            if alvo.ator.x > jogador.x + 4:
                t.down('RIGHT')
        vidas = t.get('vidas')
        t.down('SPACE')
        t.step(1)
        perdidas = perdidas + vidas - t.get('vidas')
    for tecla in ['LEFT', 'RIGHT', 'SPACE']:
        t.up(tecla)
    t.check('atirando na parte mais baixa, o jogador acaba com a primeira centopeia', t.get('onda') == 2,
            f"{t.get('pontos')} pontos, {perdidas} vidas perdidas")
    t.check('a segunda centopeia é maior e mais rápida', len(centopeia) == 9 and centopeia[0].velocidade == 4)
    t.check('cada centopeia nova tem uma cabeça só, na frente', [parte.cabeca for parte in centopeia] == [True] + [False] * 8)
    t.shot('onda-2')

    # Metade que perde: parado e sem atirar.
    t.until(lambda: t.get('estado') == 'fim', 60 * 300)
    t.check('sem vidas, o jogo acaba', t.get('estado') == 'fim' and t.get('vidas') == 0)
    t.tap('SPACE')
    t.check('logo depois do fim, o espaço ainda não recomeça', t.get('estado') == 'fim')
    t.step(70)
    t.tap('SPACE')
    t.check('depois de um segundo, espaço joga de novo', t.get('estado') == 'jogando' and t.get('vidas') == 3)

    # Um campo cheio demais não trava o jogo: as pedras param quando a área enche.
    t.set('PEDRAS_NO_COMECO', 500)
    t.get('espalhar_pedras')()
    t.check('com pedras demais, o campo enche e o jogo segue', len(t.get('pedras')) == 20 * (zona - 2))
    t.set('PEDRAS_NO_COMECO', 30)
