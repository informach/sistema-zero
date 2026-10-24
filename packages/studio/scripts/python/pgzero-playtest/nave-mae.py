"""Nave-Mãe: dodging the bombs and shooting from below, the pilot can be hit before the
mothership arrives (three fixed draws)."""

import random


def play(t):
    for semente in (1, 2, 3):
        random.seed(semente)
        t.get('novo_jogo')()
        jogar(t, semente)
    t.click((300, 600))
    t.step(2)
    t.check('um clique recomeça com a Nave-Mãe no alto', not t.get('venceu') and t.get('mae').y < 120)
    # Se a Nave-Mãe chega, quem decide é o escudo mais baixo, não o casco.
    t.get('novo_jogo')()
    t.get('clock').unschedule(t.get('soltar_bomba'))
    t.get('mae').y = t.get('nave').top - 120
    t.step(2)
    t.check('o escudo mais baixo encostando na nave acaba o jogo', t.get('vidas') == 0 and t.get('chegou'))


def jogar(t, semente):
    n = t.get('nave')
    mae = t.get('mae')
    tiro = t.get('tiro')
    bombas = t.get('bombas')

    def perigo_em(x):
        return [b for b in bombas if abs(b.x - x) < 46 and 380 < b.y < n.bottom + 12]

    tiros = 0
    for _ in range(12000):
        if t.get('venceu') or t.get('vidas') == 0:
            break
        perigo = perigo_em(n.x)
        if perigo:
            lado = 1 if perigo[0].x < n.x else -1
            t.move((max(30, min(570, n.x + lado * 12)), n.y))
        elif abs(n.x - mae.x) > 1 and not perigo_em(mae.x):
            t.move((mae.x, n.y))
        if tiro.y <= -20 and not perigo:
            t.click((n.x, n.y))
            tiros += 1
        else:
            t.step(1)
    t.check(f'sorteio {semente}: desviando e atirando de baixo, acerta o piloto antes da Nave-Mãe chegar', t.get('venceu'),
            f'{tiros} tiros, vidas={t.get("vidas")}, Nave-Mãe em y={round(mae.y)}')
    t.shot(f'fim-{semente}')
