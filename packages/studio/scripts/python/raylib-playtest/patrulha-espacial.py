"""Patrulha Espacial: sem jogar a nave é atingida; o tiro acerta e o meteoro pisca; atirando e desviando dá para resistir."""
import pyray


def ameacas(g):
    nave = g['posicao']
    return [m for m in g['meteoros']
            if not m.atingido and -9 < m.posicao.z < 1 and abs(m.posicao.x - nave.x) < m.raio + 0.9]


def play(t):
    g = t.game

    yield from t.wait(5)
    t.shot('inicio')

    # Sem jogar, mais cedo ou mais tarde um meteoro bate na nave.
    for _ in range(3600):
        if g['perdeu']:
            break
        yield
    t.check(g['perdeu'], 'sem jogar, nenhum meteoro bateu na nave')
    t.check(g['destruidos'] == 0, 'meteoro destruído sem tiro')
    t.shot('atingida')

    yield from t.tap('ENTER', 1)
    yield from t.wait(2)
    t.check(not g['perdeu'] and g['tempo'] < 0.2, 'Enter não recomeçou a partida')

    # Um piloto: atira sem parar e foge do meteoro que vem na direção dele.
    viu_clarao = False
    for quadro in range(1200):
        perigo = ameacas(g)
        if perigo:
            perto = max(perigo, key=lambda m: m.posicao.z)
            if perto.posicao.x >= g['posicao'].x and g['posicao'].x > -g['BORDA'] + 0.5:
                t.hold('LEFT')
                t.release('RIGHT')
            else:
                t.hold('RIGHT')
                t.release('LEFT')
        else:
            t.release('LEFT', 'RIGHT')
        if quadro % 8 == 0:
            t.hold('SPACE')
        else:
            t.release('SPACE')
        yield
        t.check(not g['perdeu'], f'o piloto foi atingido aos {g["tempo"]:.1f} s')
        if g['perdeu']:
            return
        if not viu_clarao and any(m.atingido for m in g['meteoros']):
            viu_clarao = True
            t.shot('clarao')
    t.check(viu_clarao, 'nenhum meteoro piscou depois do tiro')
    t.check(g['destruidos'] >= 5, f'o piloto quase não acertou ({g["destruidos"]})')
    t.shot('patrulha')

    # O clarão chega à tela pelo shader: dois meteoros parados, só um atingido. Na tela, o
    # atingido fica branco e o outro mantém a cor da textura.
    t.release('LEFT', 'RIGHT', 'SPACE')
    g['falta'] = 999
    a, b = g['Meteoro'](), g['Meteoro']()
    for meteoro, x in ((a, -2), (b, 2)):
        meteoro.posicao = pyray.Vector3(x, 0, -3)
        meteoro.velocidade = 0
        meteoro.raio = 1.2
        meteoro.falta = 999
        meteoro.bola = g['bolas'][0]
    a.atingido = True
    g['meteoros'][:] = [a, b]
    g['lasers'][:] = []
    yield
    t.capture()
    yield
    cores = []
    for meteoro in (a, b):
        ponto = pyray.get_world_to_screen(meteoro.posicao, g['camera'])
        cores.append(t.pixel(ponto.x, ponto.y))
    t.check(min(cores[0][:3]) > 240, f'o meteoro atingido não ficou branco ({cores[0]})')
    t.check(min(cores[1][:3]) < 200, f'o meteoro que não foi atingido também piscou ({cores[1]})')
