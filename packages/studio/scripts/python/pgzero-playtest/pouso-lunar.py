"""Pouso Lunar: falling without the engine breaks the lander; touching rough ground slowly also
breaks it; a pilot that tilts and doses the engine lands on each of the three pads and scores
50 × the pad's value plus the fuel left; the engine stops when the fuel ends; the lander wraps
around the sides; space flies again."""


def limitar(valor, menor, maior):
    return max(menor, min(maior, valor))


def pilotar(t, alvo_x, limite=60 * 60):
    """Flies to alvo_x and comes down slowly; returns the frames used."""
    modulo = t.get('modulo')
    for quadro in range(limite):
        if t.get('estado') != 'voando':
            return quadro
        vx, vy = t.get('vx'), t.get('vy')
        altura = t.get('altitude')()
        distancia = alvo_x - modulo.x
        perto = abs(distancia) < 12
        vx_desejada = limitar(distancia / 90, -1.3, 1.3)
        if perto or altura < 30:
            angulo_desejado = limitar((vx - vx_desejada) * 25, -8, 8) if altura > 12 else 0
        else:
            angulo_desejado = limitar((vx - vx_desejada) * 35, -35, 35)
        if perto:
            vy_desejada = 0.5 if altura < 60 else 1.2
        elif altura < 80:
            vy_desejada = -0.6
        else:
            vy_desejada = 0.3
        teclas = []
        if modulo.angle < angulo_desejado - 1:
            teclas.append('LEFT')
        elif modulo.angle > angulo_desejado + 1:
            teclas.append('RIGHT')
        precisa_lado = abs(vx - vx_desejada) > 0.15 and abs(modulo.angle) > 4
        if vy > vy_desejada or precisa_lado:
            teclas.append('UP')
        for tecla in ('LEFT', 'RIGHT', 'UP'):
            if tecla in teclas:
                t.down(tecla)
            else:
                t.up(tecla)
        t.step(1)
    return limite


def play(t):
    modulo = t.get('modulo')
    t.check('começa voando no alto, indo para a direita', t.get('estado') == 'voando' and t.get('vx') > 0)
    t.check('o altímetro mede até o chão', 300 < t.get('altitude')() < 420, f"altitude={t.get('altitude')()}")
    t.shot('inicio')

    # Sem motor, ele cai e quebra.
    t.until(lambda: t.get('estado') != 'voando', 60 * 20)
    t.check('caindo sem motor, o módulo quebra', t.get('estado') == 'quebrou', t.get('mensagem'))
    t.shot('quebrou')
    t.tap('SPACE')
    t.step(1)
    t.check('espaço voa de novo', t.get('estado') == 'voando' and t.get('combustivel') == t.get('COMBUSTIVEL'))

    # Pousar devagar fora de uma pista também quebra.
    modulo.pos = (300, 300)
    modulo.angle = 0
    t.set('vx', 0)
    t.set('vy', 0.3)
    t.until(lambda: t.get('estado') != 'voando', 600)
    t.check('chegar devagar num morro quebra: só as pistas são planas',
            t.get('estado') == 'quebrou' and 'pista' in t.get('mensagem'), t.get('mensagem'))

    # Numa pista, chegar rápido demais ou torto também quebra.
    comeco, fim, altura, vale = t.get('PISTAS')[0]
    for vy, angulo, motivo in ((2.5, 0, 'rápido'), (0.3, 30, 'torto')):
        t.tap('SPACE')
        t.step(1)
        modulo.pos = ((comeco + fim) / 2, altura - 18)
        modulo.angle = angulo
        t.set('vx', 0)
        t.set('vy', vy)
        t.until(lambda: t.get('estado') != 'voando', 120)
        t.check(f'numa pista, chegar {motivo} quebra o módulo', t.get('estado') == 'quebrou' and motivo in t.get('mensagem'), t.get('mensagem'))
    t.tap('SPACE')
    t.step(1)
    modulo.pos = ((comeco + fim) / 2, altura - 18)
    modulo.angle = 0
    t.set('vx', 0)
    t.set('vy', 0.3)
    t.until(lambda: t.get('estado') != 'voando', 120)
    t.check('e devagar e em pé, pousa', t.get('estado') == 'pousou', t.get('mensagem'))

    # Uma volta inteira deixa o módulo em pé de novo.
    t.tap('SPACE')
    t.step(1)
    t.down('LEFT')
    for _ in range(180):
        modulo.pos = (400, 100)
        t.set('vy', 0)
        t.step(1)
    t.up('LEFT')
    t.check('depois de uma volta inteira, o ângulo volta perto de zero', abs(modulo.angle) < 10, f'ângulo {modulo.angle}')

    # O piloto pousa em cada pista.
    for comeco, fim, altura, vale in t.get('PISTAS'):
        t.tap('SPACE')
        t.step(1)
        antes = t.get('pontos')
        quadros = pilotar(t, (comeco + fim) / 2)
        for tecla in ('LEFT', 'RIGHT', 'UP'):
            t.up(tecla)
        ganhou = t.get('pontos') - antes
        t.check(f'pousa na pista x{vale}', t.get('estado') == 'pousou',
                f"{t.get('mensagem')} em {quadros} quadros, vx={t.get('vx'):.2f} vy={t.get('vy'):.2f} ângulo={modulo.angle}")
        t.check(f'a pista x{vale} vale {vale} vezes 50 mais o combustível', ganhou == 50 * vale + t.get('combustivel') // 10,
                f'ganhou {ganhou}')
        t.shot(f'pousou-x{vale}')

    # Sem combustível, o motor não empurra.
    t.tap('SPACE')
    t.step(1)
    t.set('combustivel', 0)
    vy = t.get('vy')
    t.hold('UP', 20)
    t.check('sem combustível, o motor não freia a queda', t.get('vy') > vy + 0.3 and t.get('combustivel') == 0)

    # Saindo por um lado, entra pelo outro.
    modulo.pos = (799, 100)
    t.set('vx', 2)
    t.set('vy', 0)
    t.step(2)
    t.check('saindo pela direita, aparece na esquerda', modulo.x < 20, f'x={modulo.x}')
