"""Corrida Infinita: os movimentos do Molda são achados pelo nome; sem pular bate; pulando na hora certa dá para correr."""
from pyray import ffi


def nome(t, movimento):
    return ffi.string(movimento.name).decode('utf-8')


def play(t):
    g = t.game

    yield from t.wait(5)
    t.check(nome(t, g['correr']) == 'Correr', f'o movimento de correr não foi achado ({nome(t, g["correr"])})')
    t.check(nome(t, g['pular']) == 'Pular', f'o movimento de pular não foi achado ({nome(t, g["pular"])})')
    t.check(nome(t, g['andar']) == 'Andar', f'o movimento do robô não foi achado ({nome(t, g["andar"])})')
    t.shot('inicio')

    # Sem jogar, o primeiro obstáculo derruba o corredor.
    for _ in range(600):
        if g['perdeu']:
            break
        yield
    t.check(g['perdeu'], 'sem pular, o corredor nunca bateu')
    t.shot('bateu')

    # Enter recomeça, e agora um piloto pula quando o obstáculo da frente está a meio segundo.
    yield from t.tap('ENTER', 1)
    yield from t.wait(2)
    t.check(not g['perdeu'] and g['tempo'] < 0.2, 'Enter não recomeçou a corrida')
    pulos = 0
    for quadro in range(1200):
        frente = [o for o in g['obstaculos'] if o.posicao.z > 0]
        perto = min(frente, key=lambda o: o.posicao.z) if frente else None
        if perto and g['altura'] <= 0 and perto.posicao.z / perto.velocidade < 0.32:
            t.hold('SPACE')
            pulos += 1
        else:
            t.release('SPACE')
        if quadro == 300:
            t.shot('pulando')
        yield
        t.check(not g['perdeu'], f'o piloto bateu aos {g["tempo"]:.1f} s')
        if g['perdeu']:
            return
    t.check(pulos >= 6, f'o piloto quase não pulou ({pulos} pulos)')
    t.check(g['movimento_atual'] is g['correr'] or g['altura'] > 0, 'o corredor não voltou a correr no chão')
    t.shot('correndo')
