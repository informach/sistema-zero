"""Passarinho Saltitante: the bird waits for the first flap; gravity pulls it down and holding
space flaps whenever it starts to fall; each pair of pipes it passes is one point; touching a
pipe or the ground ends the try and keeps the record; the sky stops it at the top; a player that
flaps to stay in each gap flies through many pipes, and one that never flaps falls."""

import random


def jogar(t, quadros):
    passarinho = t.get('passarinho')
    for _ in range(quadros):
        if t.get('estado') != 'voando':
            return
        # O próximo par de canos que ainda não passou do passarinho.
        proximo = [c for c in t.get('canos_de_baixo') if c.right > passarinho.left]
        fundo_do_vao = proximo[0].top if proximo else t.get('CHAO') - 120
        if passarinho.bottom > fundo_do_vao - 30 and t.get('vy') > 0:
            t.down('SPACE')
        else:
            t.up('SPACE')
        t.step(1)
    t.up('SPACE')


def play(t):
    random.seed(5)
    passarinho = t.get('passarinho')
    y = passarinho.y
    t.step(60)
    t.check('antes da primeira batida, o passarinho espera no ar', t.get('estado') == 'esperando' and passarinho.y == y)
    t.shot('inicio')
    t.tap('SPACE')
    t.check('o espaço começa com uma batida de asas para cima', t.get('estado') == 'voando' and t.get('vy') < 0)

    # Segurar o espaço só bate as asas quando ele começa a cair.
    t.down('SPACE')
    subidas = 0
    anterior = t.get('vy')
    for _ in range(90):
        t.step(1)
        if t.get('vy') < anterior - 1:
            subidas = subidas + 1
        anterior = t.get('vy')
    t.up('SPACE')
    t.check('segurando o espaço, bate as asas de vez em quando, sem parar no ar', 2 <= subidas <= 6, f'{subidas} batidas em 90 quadros')

    # Cada toque no espaço bate as asas, mesmo subindo.
    t.set('vy', -2)
    t.tap('SPACE')
    t.check('um toque no espaço bate as asas mesmo subindo', t.get('vy') < -4, f"vy={t.get('vy')}")

    # O céu segura em cima.
    passarinho.top = 2
    t.set('vy', -5)
    t.step(1)
    t.check('o passarinho não passa do alto da tela', passarinho.top == 0 and t.get('vy') >= 0)

    # Um ponto por par de canos que passa.
    t.get('canos_de_cima').clear()
    t.get('canos_de_baixo').clear()
    t.get('criar_canos')(int(passarinho.x) + 10)
    cima, baixo = t.get('canos_de_cima')[0], t.get('canos_de_baixo')[0]
    passarinho.y = (cima.bottom + baixo.top) / 2
    pontos = t.get('pontos')
    for _ in range(60):
        t.set('vy', 0)
        passarinho.y = (cima.bottom + baixo.top) / 2
        t.step(1)
    t.check('passar por um par de canos vale exatamente um ponto', t.get('pontos') == pontos + 1, f"{t.get('pontos') - pontos}")

    # Encostar num cano termina.
    t.get('criar_canos')(int(passarinho.x) - 10)
    passarinho.y = t.get('canos_de_cima')[-1].bottom - 5
    t.set('vy', 0)
    t.step(1)
    t.check('encostar no cano termina a tentativa', t.get('estado') == 'caiu')
    t.tap('SPACE')
    t.check('espaço recomeça, esperando a batida', t.get('estado') == 'esperando' and t.get('pontos') == 0)

    # Sem bater as asas, cai no chão.
    t.tap('SPACE')
    t.until(lambda: t.get('estado') != 'voando', 600)
    t.check('sem bater as asas, cai no chão', t.get('estado') == 'caiu' and passarinho.bottom == t.get('CHAO'))
    t.tap('SPACE')

    # Batendo as asas para ficar no vão de cada par, passa por muitos canos.
    t.set('recorde', 0)
    t.tap('SPACE')
    jogar(t, 60 * 60)
    t.check('batendo as asas na hora certa, passa por pelo menos 10 canos', t.get('pontos') >= 10, f"{t.get('pontos')} pontos")
    t.shot('voando')
    t.check('há sempre poucos pares de canos na tela', len(t.get('canos_de_cima')) <= 4 and len(t.get('canos_de_cima')) == len(t.get('canos_de_baixo')))
    passarinho.bottom = t.get('CHAO') + 5
    t.step(1)
    t.check('caindo, o recorde guarda os pontos', t.get('estado') == 'caiu' and t.get('recorde') == t.get('pontos'))
