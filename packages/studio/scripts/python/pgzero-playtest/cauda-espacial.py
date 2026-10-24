"""Cauda Espacial: the tail links stay one SEGMENTO apart while the tail whips; only a shot
into the open eye hurts the monster; the tail hurts the ship; the monster can be beaten."""

import math


def play(t):
    n = t.get('nave')
    gomos = t.get('gomos')
    olho = t.get('olho')
    SEGMENTO = t.get('SEGMENTO')
    t.step(5)
    distancias = [round(gomos[i].distance_to(gomos[i + 1])) for i in range(len(gomos) - 1)]
    t.check('os gomos ficam sempre à mesma distância (a corrente não estica)', set(distancias) <= {SEGMENTO, SEGMENTO - 1, SEGMENTO + 1}, f'{distancias}')
    antes = gomos[-1].pos
    t.step(20)
    t.check('a ponta da cauda balança', gomos[-1].distance_to(antes) > 10, f'andou {gomos[-1].distance_to(antes):.0f}')
    t.shot('cauda')

    def atirar_no_olho(aberto):
        t.until(lambda: t.get('olho_aberto')() == aberto, 240)
        # O monstro sobe e desce: mira onde o olho vai estar quando o tiro chegar.
        voo = (olho.x - n.right) / 9 / 60
        n.y = 300 + 120 * math.sin((t.get('tempo') + voo) * 0.7) - 10
        vida = t.get('vida_do_monstro')
        t.set('protegida', 600)  # só o tiro importa aqui
        t.tap('SPACE')
        t.until(lambda: not t.get('tiros'), 120)
        return vida - t.get('vida_do_monstro')

    n.pos = (300, 300)
    t.check('tiro no olho fechado não machuca', atirar_no_olho(False) == 0)
    t.check('tiro no olho aberto machuca', atirar_no_olho(True) == 1)
    # Encostar na cauda tira uma vida.
    t.set('protegida', 0)
    vidas = t.get('vidas')
    n.pos = gomos[6].pos
    t.step(1)
    t.check('encostar na cauda tira uma vida', t.get('vidas') == vidas - 1, f"vidas={t.get('vidas')}")
    # Acertando o olho aberto 15 vezes, o monstro cai.
    for _ in range(40):
        if t.get('vida_do_monstro') == 0:
            break
        atirar_no_olho(True)
    t.check('dá para vencer o monstro', t.get('vida_do_monstro') == 0)
    t.shot('venceu')
