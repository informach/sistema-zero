"""Mergulho Alienígena: a shot destroys an alien in formation, a dive curves and returns to its
place, two bombs (or two aliens) in the same frame never crash the game nor take lives below
zero, and clearing the squadron wins and stops the game."""

import random


def play(t):
    random.seed(3)
    n = t.get('nave')
    aliens = t.get('aliens')
    tiro = t.get('tiro')
    Actor = t.get('Actor')
    t.set('quadros', 0)
    acertado = None
    for _ in range(6):
        # Mira num alien que está na fila (algum pode ter saído para mergulhar).
        alvo = [a for a in aliens if a.estado == 'fila'][-1]
        t.until(lambda: abs(n.x - alvo.x) < 4, 300, key='RIGHT' if alvo.x > n.x else 'LEFT')
        t.tap('SPACE')
        t.until(lambda: tiro.y <= -20, 120)
        if alvo.estado in ('explodindo', 'fora'):
            acertado = alvo
            break
    t.check('o tiro acerta o alien da fila e ele explode', acertado is not None, f'pontos={t.get("pontos")}')
    alvo = acertado or alvo
    t.step(20)
    t.check('depois da explosão ele sai do jogo', alvo.estado == 'fora' and alvo.x < 0)
    mergulhador = aliens[3]
    n.x = 50
    mergulhador.estado = 'mergulho'
    maior_angulo = 0
    for _ in range(400):
        t.step(1)
        maior_angulo = max(maior_angulo, abs(mergulhador.angle))
        if mergulhador.estado != 'mergulho':
            break
    t.check('o mergulho faz a curva (o alien vira até 180°)', maior_angulo >= 180, f'ângulo máximo={maior_angulo}')
    t.check('sai por baixo e volta para a formação', mergulhador.estado == 'fila' and mergulhador.angle == 0)
    # Duas bombas acertando no mesmo quadro: uma vida só, e nada quebra.
    bombas = t.get('bombas')
    for _ in range(2):
        bomba = Actor('bomba')
        bomba.midbottom = (n.x, n.top + 2)
        bombas.append(bomba)
    vidas = t.get('vidas')
    t.step(2)
    t.check('duas bombas no mesmo quadro tiram uma vida só, sem travar', t.get('vidas') == vidas - 1, f"vidas={t.get('vidas')}")
    # Com uma vida, dois aliens encostando juntos: as vidas param no zero.
    t.set('vidas', 1)
    for alien in aliens[4:6]:
        alien.estado = 'mergulho'
        alien.pos = n.pos
    t.step(2)
    t.check('as vidas nunca ficam negativas', t.get('vidas') == 0, f"vidas={t.get('vidas')}")
    t.tap('SPACE')
    t.step(2)
    t.check('espaço recomeça com 16 aliens na fila', all(a.estado == 'fila' for a in aliens) and t.get('vidas') == 3)
    # Acabando todos, vence e o jogo para.
    for alien in aliens:
        alien.estado = 'fora'
        alien.pos = (-100, -100)
    t.step(2)
    t.check('sem aliens, vence', t.get('venceu'))
    nave_x = n.x
    t.hold('LEFT', 10)
    t.check('depois de vencer, o jogo para', n.x == nave_x)
    t.shot('venceu')
