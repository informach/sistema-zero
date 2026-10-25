"""Cores e Bolinha: the plus and minus buttons add or take PASSO of red, green or blue (never
below 0 or above 255); a ball bouncing in the right-hand box wears the mixed color; making the
target color is a point and a new, different target; space turns the rainbow mode on (the
ball cycles the color wheel and no point is given) and off."""


def play(t):
    botoes = t.get('botoes')
    cor = t.get('cor')
    passo = t.get('PASSO')

    def botao(canal, mudanca):
        for ator, c, m in botoes:
            if c == canal and m == mudanca:
                return ator.pos

    def fazer(alvo):
        for canal in range(3):
            for _ in range(20):
                if cor[canal] == alvo[canal]:
                    break
                t.click(botao(canal, passo if cor[canal] < alvo[canal] else -passo))

    t.get('random').seed(4)

    t.check('a bolinha começa preta', cor == [0, 0, 0])
    t.click(botao(0, -passo))
    t.check('menos não passa de zero', cor[0] == 0 and t.get('cliques') == 1)
    for _ in range(7):
        t.click(botao(1, passo))
    t.check('mais não passa de 255', cor[1] == 255)
    t.click((700, 500))
    t.check('clicar fora dos botões não muda nada', t.get('cliques') == 8)
    t.shot('misturando')

    # Fazer cinco cores pedidas.
    alvos = []
    for _ in range(5):
        alvo = t.get('alvo')
        alvos.append(alvo)
        antes = t.get('pontos')
        fazer(alvo)
        t.check('acertar a cor vale um ponto e traz outra', t.get('pontos') == antes + 1
                and t.get('alvo') != alvo, str(alvo))
    t.check('cinco cores, cinco pontos', t.get('pontos') == 5)
    t.check('cada cor nova é diferente da que a bolinha já tem',
            all(a != b for a, b in zip(alvos, alvos[1:])))
    t.check('fora do arco-íris a bolinha tem a cor misturada', t.get('cor_da_bola')() == tuple(cor))

    # Modo arco-íris.
    t.tap('SPACE')
    t.check('espaço liga o arco-íris', t.get('arco_iris'))
    primeira = t.get('cor_da_bola')()
    t.step(30)
    t.check('no arco-íris a cor da bolinha vai mudando', t.get('cor_da_bola')() != primeira)
    alvo = t.get('alvo')
    fazer(alvo)
    t.check('no arco-íris acertar a cor não vale ponto', t.get('pontos') == 5)
    t.tap('SPACE')
    t.check('espaço desliga o arco-íris', not t.get('arco_iris'))
    t.click(botao(2, passo))
    t.click(botao(2, -passo))
    t.check('fora do arco-íris a mesma cor vale o ponto', t.get('pontos') == 6)

    # A bolinha anda e quica sempre dentro da caixa da direita.
    raio = t.get('RAIO')
    dentro = True
    sentidos = set()
    xs = set()
    for _ in range(900):
        t.step(1)
        x, y = t.get('bola_x'), t.get('bola_y')
        xs.add(round(x))
        sentidos.add(t.get('vel_x') > 0)
        if not (380 + raio <= x <= 780 - raio and 140 + raio <= y <= 580 - raio):
            dentro = False
    t.check('a bolinha anda e quica nas paredes', len(xs) > 20 and sentidos == {True, False},
            f'{len(xs)} lugares, sentidos {sentidos}')
    t.check('a bolinha nunca sai da caixa', dentro)
    t.shot('bolinha')

    # Muitas cores certas: a bolinha acelera, mas tem um limite.
    for _ in range(40):
        fazer(t.get('alvo'))
    t.check('a velocidade da bolinha tem um limite', abs(t.get('vel_x')) < t.get('VELOCIDADE_MAXIMA') * 1.1
            and t.get('pontos') >= 40)

    # Um PASSO enorme não trava o jogo.
    t.set('PASSO', 300)
    t.get('novo_alvo')()
    t.check('com um PASSO enorme o jogo continua', t.get('alvo') is not None)
