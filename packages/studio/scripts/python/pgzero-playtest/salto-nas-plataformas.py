def play(t):
    d = t.get('dino')

    def andar(x):
        key = 'RIGHT' if x > d.x else 'LEFT'
        t.until(lambda: d.x >= x if key == 'RIGHT' else d.x <= x, 400, key=key)
        t.until(lambda: t.get('no_chao'), 120)

    def pular(ate_x):
        antes = d.bottom
        t.tap('SPACE')
        key = 'RIGHT' if ate_x > d.x else 'LEFT'
        t.until(lambda: (d.x >= ate_x if key == 'RIGHT' else d.x <= ate_x) or t.get('no_chao'), 120, key=key)
        t.until(lambda: t.get('no_chao'), 120)
        print(f'    pulo até {ate_x}: de y={round(antes)} para y={round(d.bottom)} x={round(d.x)} estrelas={t.get("pontos")}')

    t.shot('0-inicio')
    andar(110)
    pular(210)
    andar(260)
    pular(400)
    andar(450)
    pular(600)
    andar(650)
    pular(730)
    andar(700)
    pular(500)
    andar(460)
    pular(260)
    t.check('pega todas as estrelas', not t.get('estrelas'), f"pontos={t.get('pontos')}")
    t.check('a mensagem de vitória aparece (lista vazia)', len(t.get('estrelas')) == 0)
    t.shot('1-todas')
