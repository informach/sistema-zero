"""Barris na Rampa: the route to the flag exists, barrels roll downhill and leave, a running
jump clears a barrel (and standing still costs a life)."""

VIGAS = [(0, 570, 800, 556), (100, 482, 800, 452), (0, 340, 700, 370), (100, 262, 800, 232), (0, 120, 700, 150)]


def topo(i, x):
    x0, y0, x1, y1 = VIGAS[i]
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)


def caminho_ate_a_bandeira(t):
    h = t.get('heroi')
    escada_em = t.get('escada_em')

    def andar(x):
        direita = x > h.x
        t.until(lambda: h.x >= x if direita else h.x <= x, 700, key='RIGHT' if direita else 'LEFT')

    def subir():
        t.until(lambda: not escada_em(h.x, h.bottom - 4) and not escada_em(h.x, h.bottom + 3), 300, key='UP')
        t.step(10)

    for x in [650, 200, 600, 250]:
        andar(x)
        subir()
    andar(640)
    t.step(5)
    t.check('sem barris, o caminho pelas quatro escadas chega à bandeira', t.get('venceu'), f'x={round(h.x)} y={round(h.bottom)}')


def play(t):
    h = t.get('heroi')
    barris = t.get('barris')
    Actor = t.get('Actor')
    t.set('espera', 10**6)  # nenhum barril novo: cada teste põe os seus
    barris.clear()
    h.pos = (-200, -200)
    for i, (x0, y0, x1, y1) in enumerate(VIGAS):
        barril = Actor('barril0', (400, 0))
        barril.bottom = topo(i, 400) - 1
        barris.clear()
        barris.append(barril)
        t.step(30)
        esperado = 'esquerda' if y0 > y1 else 'direita'
        andou = 'esquerda' if barril.x < 400 else 'direita'
        t.check(f'na viga {i} o barril rola para a {esperado}', andou == esperado, f'x={round(barril.x)}')
    barris.clear()
    h.midbottom = (300, topo(0, 300))
    t.step(20)
    barril = Actor('barril0', (520, 0))
    barril.bottom = topo(0, 520) - 1
    barris.append(barril)
    pulou = False
    t.down('RIGHT')
    for _ in range(300):
        if barril.x - h.x < 55 and not pulou:
            t.tap('SPACE')
            pulou = True
        t.step(1)
        if barril.x < h.x - 60:
            break
    t.up('RIGHT')
    t.check('correndo e pulando, o herói passa por cima do barril', barril.x < h.x - 60 and t.get('vidas') == 3, f"vidas={t.get('vidas')}")
    t.until(lambda: barril.x < -30, 400)
    barril = Actor('barril0', (520, 0))
    barril.bottom = topo(0, 520) - 1
    barris.clear()
    barris.append(barril)
    t.until(lambda: t.get('vidas') < 3, 300)
    t.check('parado, o barril tira uma vida', t.get('vidas') == 2)
    t.set('vidas', 3)
    h.midbottom = (60, 540)
    barris.clear()
    caminho_ate_a_bandeira(t)
    t.set('fim_de_jogo', True)
    t.tap('SPACE')
    t.step(2)
    t.check('espaço recomeça depois do fim', not t.get('fim_de_jogo') and t.get('vidas') == 3 and t.get('pontos') == 0)
