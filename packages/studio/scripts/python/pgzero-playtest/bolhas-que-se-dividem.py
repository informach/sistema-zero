"""Bolhas que se Dividem: the bubbles wait a moment, then bounce, each size always back to the
same height; one harpoon at a time climbs from the player; a hit bubble splits into two smaller
ones and the smallest just pops; a bubble touching the player costs a life and the player blinks
safe for a while; with no bubbles the level is won; a player that dodges low bubbles and shoots the nearest
one clears level after level, and one that never shoots loses."""


def raio(t, bolha):
    return t.get('RAIOS')[bolha.tamanho]


def jogar(t, quadros):
    jogador = t.get('jogador')
    for _ in range(quadros):
        if t.get('estado') != 'jogando':
            break
        t.up('LEFT')
        t.up('RIGHT')
        bolhas = t.get('bolhas')
        if bolhas and t.get('pausa') == 0:
            alinhadas = [b for b in bolhas if abs(b.x - jogador.x) < raio(t, b) * 0.8]
            if alinhadas and not t.get('atirando'):
                t.tap('SPACE')
                continue
            perigo = [b for b in bolhas if b.y + raio(t, b) > t.get('CHAO') - 120 and abs(b.x - jogador.x) < raio(t, b) + 60]
            if perigo:
                # Foge da bolha baixa e perto, para o lado de onde há mais espaço.
                b = min(perigo, key=lambda b: abs(b.x - jogador.x))
                fugir = 'LEFT' if b.x > jogador.x else 'RIGHT'
                if (fugir == 'LEFT' and jogador.left < 10) or (fugir == 'RIGHT' and jogador.right > t.get('WIDTH') - 10):
                    fugir = 'RIGHT' if fugir == 'LEFT' else 'LEFT'
                t.down(fugir)
            else:
                alvo = min(bolhas, key=lambda b: abs(b.x - jogador.x))
                if abs(alvo.x - jogador.x) > raio(t, alvo) / 2:
                    t.down('RIGHT' if alvo.x > jogador.x else 'LEFT')
                elif not t.get('atirando'):
                    t.tap('SPACE')
                    continue
        t.step(1)
    t.up('LEFT')
    t.up('RIGHT')


def play(t):
    jogador = t.get('jogador')
    bolhas = t.get('bolhas')
    t.check('o nível 1 tem uma bolha grande', len(bolhas) == 1 and bolhas[0].tamanho == 3)
    y = bolhas[0].y
    t.tap('SPACE')
    t.step(30)
    t.check('no começo, as bolhas esperam e não dá para atirar', bolhas[0].y == y and not t.get('atirando'))
    t.shot('inicio')

    # Cada tamanho quica sempre até a mesma altura.
    t.set('vidas', 99)
    jogador.x = 30
    bolhas[0].x = 600
    alturas = []
    for _ in range(3):
        topo = 999
        for _ in range(140):
            t.step(1)
            topo = min(topo, bolhas[0].y)
        alturas.append(round(topo))
    t.check('a bolha grande quica sempre até a mesma altura', max(alturas[1:]) - min(alturas[1:]) <= 2, str(alturas))
    t.check('e pula bem acima do jogador', alturas[-1] < t.get('CHAO') - 200, str(alturas))

    # Um arpão de cada vez; acertando, a bolha se divide.
    bolha = bolhas[0]
    bolha.x = 300
    bolha.y = 300
    bolha.vy = 0
    jogador.x = 300
    pontos = t.get('pontos')
    t.tap('SPACE')
    topo = t.get('arpao_topo')
    t.tap('SPACE')
    t.check('enquanto o arpão sobe, não sai outro', t.get('arpao_topo') < topo)
    t.until(lambda: not t.get('atirando'), 60)
    t.check('o arpão divide a bolha grande em duas médias', [b.tamanho for b in bolhas] == [2, 2] and t.get('pontos') == pontos + 100)
    t.check('as duas saltam para lados opostos', bolhas[0].vx < 0 < bolhas[1].vx)
    media = bolhas[0]
    jogador.x = media.x
    media.y = 380
    media.vy = 0
    t.tap('SPACE')
    t.until(lambda: not t.get('atirando'), 60)
    t.check('a média vira duas pequenas', sorted(b.tamanho for b in bolhas) == [1, 1, 2])
    pequena = [b for b in bolhas if b.tamanho == 1][0]
    jogador.x = pequena.x
    pequena.y = 420
    pequena.vy = 0
    t.tap('SPACE')
    t.until(lambda: not t.get('atirando'), 60)
    t.check('a pequena só estoura', sorted(b.tamanho for b in bolhas) == [1, 2])
    t.tap('SPACE')
    t.until(lambda: not t.get('atirando'), 80)
    t.check('o arpão que não acerta nada some no teto', not t.get('atirando'))

    # Encostar numa bolha custa uma vida e recomeça o nível.
    t.set('vidas', 3)
    bolhas[0].x = jogador.x
    bolhas[0].y = t.get('CHAO') - 40
    t.step(1)
    t.check('a bolha que encosta custa uma vida, e as bolhas continuam onde estão', t.get('vidas') == 2 and len(t.get('bolhas')) == 2)
    t.step(1)
    t.check('logo depois, o jogador fica protegido', t.get('vidas') == 2 and t.get('protegido') > 0)
    t.step(130)

    # Sem bolhas, o nível acaba.
    t.get('bolhas').clear()
    t.set('pausa', 0)
    t.step(1)
    t.check('sem bolhas, o nível está completo', t.get('estado') == 'passou')
    t.tap('SPACE')
    t.check('espaço leva ao nível 2, com duas bolhas grandes', t.get('nivel') == 2 and len(t.get('bolhas')) == 2)

    # Quem foge das bolhas baixas e atira na mais perto passa de nível.
    t.get('novo_jogo')()
    for nivel in (1, 2, 3):
        jogar(t, 60 * 90)
        t.check(f'desviando e atirando, completa o nível {nivel}', t.get('estado') == 'passou',
                f"estado={t.get('estado')}, bolhas={len(t.get('bolhas'))}, vidas={t.get('vidas')}")
        if nivel == 1:
            t.shot('nivel')
        t.tap('SPACE')

    # Quem nunca atira acaba alcançado.
    t.get('novo_jogo')()
    t.until(lambda: t.get('estado') == 'fim', 60 * 120)
    t.check('sem atirar, as bolhas acabam com as vidas', t.get('estado') == 'fim')
    t.tap('SPACE')
    t.check('espaço começa de novo', t.get('estado') == 'jogando' and t.get('vidas') == 3 and t.get('nivel') == 1)
