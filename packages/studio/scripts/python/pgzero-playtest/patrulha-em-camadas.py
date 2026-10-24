"""Patrulha em Camadas: the three layers move at their own pace (the back one slowest) and wrap
without a jump; driving into a hole or a rock costs a life; a jump clears them; the arrows
change the speed within limits; a driver that jumps in time reaches the finish."""

import random


def play(t):
    random.seed(5)
    camadas = t.get('camadas')
    jipe = t.get('jipe')
    antes = [camada.left for camada in camadas]
    t.step(10)
    andou = [antes[i] - camadas[i].left for i in range(3)]
    t.check('a camada de trás anda mais devagar que a do meio, e esta que a da frente',
            0 < andou[0] < andou[1] < andou[2], f'{andou}')
    for camada in camadas:
        camada.left = -799.5
    t.step(1)
    esperado = [-799.5 - t.get('velocidade') * c.ritmo + t.get('WIDTH') for c in camadas]
    t.check('quando a segunda metade chega ao começo, a camada volta uma tela, sem pulo',
            all(abs(c.left - e) < 0.01 for c, e in zip(camadas, esperado)), f'{[c.left for c in camadas]}')

    # Um buraco bem debaixo das rodas.
    t.get('obstaculos').clear()
    t.set('proximo', 99999)
    t.get('criar_obstaculo')()
    buraco = t.get('obstaculos')[-1]
    buraco.tipo = 'buraco'
    buraco.image = 'buraco'
    buraco.midtop = (jipe.x, t.get('CHAO') - 4)
    t.step(2)
    t.check('passar por cima de um buraco com as rodas no chão custa uma vida', t.get('vidas') == 2)
    t.step(70)
    t.check('depois da batida, o jipe recomeça', t.get('estado') == 'andando' and not t.get('obstaculos'))

    # Sem pular, a pedra custa uma vida.
    t.set('proximo', 99999)
    t.get('criar_obstaculo')()
    pedra = t.get('obstaculos')[-1]
    pedra.tipo = 'pedra'
    pedra.image = 'pedra'
    pedra.midbottom = (jipe.x + 120, t.get('CHAO') + 4)
    t.until(lambda: t.get('vidas') < 2 or pedra.x < jipe.x - 60, 120)
    t.check('sem pular, bater na pedra custa uma vida', t.get('vidas') == 1)
    t.step(70)
    t.set('vidas', 2)

    # Pulando, passa por cima da pedra.
    t.set('proximo', 99999)
    t.get('criar_obstaculo')()
    pedra = t.get('obstaculos')[-1]
    pedra.tipo = 'pedra'
    pedra.image = 'pedra'
    pedra.midbottom = (jipe.x + 120, t.get('CHAO') + 4)
    t.tap('SPACE')
    t.until(lambda: pedra.x < jipe.x - 60, 120)
    t.check('pulando, o jipe passa por cima da pedra', t.get('vidas') == 2)

    # Velocidade: as setas mudam, dentro dos limites.
    t.hold('RIGHT', 80)
    t.check('a seta para a direita acelera até 8', t.get('velocidade') == 8)
    t.hold('LEFT', 80)
    t.check('a seta para a esquerda freia até 3', t.get('velocidade') == 3)

    # Um motorista que pula na hora certa chega ao fim.
    t.get('novo_jogo')()
    random.seed(9)
    for _ in range(60 * 240):
        if t.get('estado') in ('chegou', 'fim'):
            break
        perto = [c for c in t.get('obstaculos') if 0 < c.left - jipe.right < t.get('velocidade') * 6]
        if perto and jipe.bottom >= t.get('CHAO'):
            t.tap('SPACE')
        t.step(1)
    t.check('pulando na hora certa, a patrulha chega aos 1000 metros', t.get('estado') == 'chegou',
            f"estado={t.get('estado')}, metros={int(t.get('metros'))}, vidas={t.get('vidas')}")
    t.shot('chegou')

    # Sem pular, as vidas acabam.
    t.get('novo_jogo')()
    t.until(lambda: t.get('estado') == 'fim', 60 * 120)
    t.check('sem pular, a patrulha acaba', t.get('estado') == 'fim' and t.get('vidas') == 0)
    t.shot('fim')
    t.tap('SPACE')
    t.check('espaço começa de novo', t.get('estado') == 'andando' and t.get('vidas') == 3 and t.get('metros') < 1)
