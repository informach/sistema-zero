"""Propulsor no Espaço: thrust follows the nose, the ship drifts (inertia), wraps at the edges,
a big rock splits in two, and a crash costs a life with a moment of protection."""

import math


def play(t):
    n = t.get('nave')
    pedras = t.get('pedras')
    tamanhos = t.get('tamanhos')
    direcoes = t.get('direcoes')
    t.check('a nave começa apontando para cima (ângulo 90)', n.angle == 90)
    # Empurra para cima: a nave sobe (y diminui) e continua deslizando depois de soltar.
    pedras.clear(); tamanhos.clear(); direcoes.clear()
    t.get('nova_pedra')('pequena', -500, -500)  # uma pedra longe, para a onda não recomeçar
    direcoes[0] = (0, 0)
    y0 = n.y
    t.hold('UP', 20)
    subiu = y0 - n.y
    t.step(30)
    t.check('o empurrão leva a nave para onde o bico aponta', subiu > 5, f'subiu {subiu:.1f}')
    t.check('solto o botão, ela continua deslizando', y0 - n.y > subiu + 5, f'andou {y0 - n.y:.1f}')
    # Gira 90 graus para a esquerda (anti-horário): o bico vai para a esquerda.
    t.hold('LEFT', 23)
    t.check('as setas giram a nave', 175 <= n.angle % 360 <= 185, f'ângulo={n.angle}')
    # Atravessa a borda e reaparece do outro lado.
    n.y = 2
    t.set('velocidade_y', -3)
    t.set('velocidade_x', 0)
    t.step(3)
    t.check('saindo por cima, entra por baixo', n.y > 500, f'y={n.y:.0f}')
    # Uma pedra grande na frente do bico: o tiro quebra em duas médias.
    pedras.clear(); tamanhos.clear(); direcoes.clear()
    t.set('velocidade_x', 0); t.set('velocidade_y', 0)
    n.pos = (400, 300)
    n.angle = 0
    t.get('nova_pedra')('grande', 560, 300)
    direcoes[0] = (0, 0)
    t.set('protegida', 0)
    t.tap('SPACE')
    t.step(40)
    t.check('o tiro quebra a pedra grande em duas médias', tamanhos == ['media', 'media'], f'{tamanhos} pontos={t.get("pontos")}')
    # Uma batida tira uma vida e a nave fica protegida um tempo.
    pedras.clear(); tamanhos.clear(); direcoes.clear()
    t.get('nova_pedra')('grande', n.x, n.y)
    direcoes[0] = (0, 0)
    t.get('nova_pedra')('pequena', -500, -500)
    t.step(2)
    t.check('encostar numa pedra tira uma vida', t.get('vidas') == 2, f"vidas={t.get('vidas')}")
    t.check('e a nave volta ao meio protegida', t.get('protegida') > 0 and abs(n.x - 400) < 1)
    t.shot('batida')
