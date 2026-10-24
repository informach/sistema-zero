"""Sinuca: a head-on hit passes the speed from one ball to the other; balls stay on the cloth;
a player that aims with the ghost ball clears the table within the shots; the cue ball that
falls comes back; with no shots left the game ends; the arrows aim and set the power."""

import math


def esperar_parar(t, limite=1500):
    t.until(lambda: t.get('estado') != 'rolando', limite)


def livre(bolas, de, para, ignorar, raio):
    """True when no other ball touches the straight path from de to para."""
    dx, dy = para[0] - de[0], para[1] - de[1]
    tamanho = math.hypot(dx, dy) or 1
    for bola in bolas:
        if bola in ignorar:
            continue
        bx, by = bola.ator.x - de[0], bola.ator.y - de[1]
        ao_longo = max(0, min(tamanho, (bx * dx + by * dy) / tamanho))
        perto = math.hypot(bx - dx / tamanho * ao_longo, by - dy / tamanho * ao_longo)
        if perto < 2 * raio + 2:
            return False
    return True


def escolher_tacada(t):
    bolas = t.get('bolas')
    branca = t.get('branca')
    raio = t.get('RAIO')
    melhor = None
    for bola in bolas:
        if bola is branca:
            continue
        for cacapa in t.get('CACAPAS'):
            ux, uy = cacapa[0] - bola.ator.x, cacapa[1] - bola.ator.y
            ate_a_cacapa = math.hypot(ux, uy)
            fantasma = (bola.ator.x - ux / ate_a_cacapa * 2 * raio, bola.ator.y - uy / ate_a_cacapa * 2 * raio)
            area = t.get('AREA')
            if not (area.left + raio <= fantasma[0] <= area.right - raio and area.top + raio <= fantasma[1] <= area.bottom - raio):
                continue
            vx, vy = fantasma[0] - branca.ator.x, fantasma[1] - branca.ator.y
            ate_o_fantasma = math.hypot(vx, vy)
            corte = math.degrees(math.acos(max(-1, min(1, (vx * ux + vy * uy) / (ate_o_fantasma * ate_a_cacapa)))))
            if corte > 60:
                continue
            if not livre(bolas, branca.ator.pos, fantasma, [branca, bola], raio):
                continue
            if not livre(bolas, bola.ator.pos, cacapa, [branca, bola], raio):
                continue
            custo = corte * 6 + ate_o_fantasma + ate_a_cacapa
            if melhor is None or custo < melhor[0]:
                forca = min(10, 3 + (ate_o_fantasma + ate_a_cacapa * 1.5) / 110)
                melhor = (custo, math.degrees(math.atan2(vy, vx)) % 360, round(forca))
    return melhor


def tacar(t, mira, forca):
    t.set('mira', mira)
    t.set('forca', forca)
    t.tap('SPACE')
    esperar_parar(t)


def play(t):
    # Batida de frente: a branca para e a outra sai com a velocidade dela.
    bolas = t.get('bolas')
    branca = t.get('branca')
    Bola = t.get('Bola')
    bolas.clear()
    branca.ator.pos = (300, 300)
    outra = Bola('bola1', 400, 300)
    bolas.extend([branca, outra])
    branca.vx = 8
    for _ in range(20):
        for _ in range(t.get('PASSOS')):
            branca.andar()
            outra.andar()
            t.get('bater')(branca, outra)
    t.check('batida de frente: a branca quase para', abs(branca.vx) < 0.5, f'branca={branca.vx:.2f}')
    t.check('e a outra sai com a velocidade', 7.5 < outra.vx <= 8.01, f'outra={outra.vx:.2f}')

    t.get('arrumar_mesa')()
    t.shot('mesa')
    t.check('mirando, com 15 tacadas', t.get('estado') == 'mirando' and t.get('tacadas') == 15)
    t.hold('RIGHT', 20)
    t.check('a seta para a direita gira a mira', 29 < t.get('mira') < 31, f"mira={t.get('mira')}")
    for _ in range(8):
        t.tap('UP')
    t.check('a força para em 10', t.get('forca') == 10)
    for _ in range(12):
        t.tap('DOWN')
    t.check('e não desce de 1', t.get('forca') == 1)

    # A abertura: a branca bate no triângulo com força.
    area = t.get('AREA')
    tacar(t, 0, 10)
    bolas = t.get('bolas')
    t.check('na abertura, as bolas se espalham', len({(round(b.ator.x), round(b.ator.y)) for b in bolas}) == len(bolas))
    t.check('nenhuma bola sai do pano', all(area.left <= b.ator.x <= area.right and area.top <= b.ator.y <= area.bottom for b in bolas))

    # Um jogador que mira pela bola fantasma limpa a mesa.
    jogadas = 1
    while t.get('estado') == 'mirando' and jogadas < 40:
        escolha = escolher_tacada(t)
        if escolha is None:
            # Sem tacada limpa: bate de leve na bola mais perto.
            branca = t.get('branca')
            alvo = min((b for b in t.get('bolas') if b is not branca), key=lambda b: branca.ator.distance_to(b.ator))
            tacar(t, branca.ator.angle_to(alvo.ator) * -1 % 360, 5)
        else:
            tacar(t, escolha[1], escolha[2])
        jogadas += 1
        bolas = t.get('bolas')
        if not all(area.left <= b.ator.x <= area.right and area.top <= b.ator.y <= area.bottom for b in bolas):
            break
    t.check('mirando pela bola fantasma, limpa a mesa', t.get('estado') == 'venceu',
            f"estado={t.get('estado')}, encaçapadas={t.get('encacapadas')}, tacadas usadas={15 - t.get('tacadas')}")
    t.shot('mesa-limpa')
    t.tap('SPACE')
    t.step(2)
    t.check('espaço arruma a mesa de novo', len(t.get('bolas')) == 7 and t.get('tacadas') == 15)

    # A branca que cai na caçapa volta para o lugar dela.
    branca = t.get('branca')
    branca.ator.pos = (120, 150)
    tacar(t, 225, 4)
    branca = t.get('branca')
    t.check('a branca que cai volta para a mesa', branca in t.get('bolas') and t.get('estado') == 'mirando'
            and area.left <= branca.ator.x <= area.right, f'{branca.ator.pos}')
    t.check('e a tacada conta', t.get('tacadas') == 14)

    # Sem tacadas, o jogo acaba.
    t.set('tacadas', 1)
    tacar(t, 180, 2)
    t.check('com a última tacada sem limpar a mesa, acabou', t.get('estado') == 'perdeu')
    t.shot('perdeu')
