"""Bússola Maluca: the compass shows a direction and the explorer must reach that border before
the time runs out; each border is a point; the next direction is never the current one nor a
border the explorer already touches; every ten points a rock appears, never on the explorer;
the time per point shrinks down to a minimum and a new level gives it back; touching a rock
or running out of time ends the game, and the best score survives in a file."""

import os

SETA = {'NORTE': 'UP', 'SUL': 'DOWN', 'LESTE': 'RIGHT', 'OESTE': 'LEFT'}
OPOSTA = {'NORTE': 'SUL', 'SUL': 'NORTE', 'LESTE': 'OESTE', 'OESTE': 'LESTE'}
ANGULO = {'NORTE': 0, 'OESTE': 90, 'SUL': 180, 'LESTE': 270}


def play(t):
    explorador = t.get('explorador')
    arquivo = t.get('ARQUIVO_DE_RECORDE')
    if os.path.exists(arquivo):
        os.remove(arquivo)
    t.get('ler_recorde')()
    t.get('random').seed(5)

    def ao_centro():
        # Volta ao meio pelas linhas do centro, por onde nunca há pedra.
        for _ in range(200):
            if abs(explorador.x - 400) <= 4:
                break
            t.hold('LEFT' if explorador.x > 400 else 'RIGHT', 1)
        for _ in range(200):
            if abs(explorador.y - 300) <= 4:
                break
            t.hold('UP' if explorador.y > 300 else 'DOWN', 1)

    t.check('a tela de início espera o espaço', t.get('estado') == 'inicio')
    t.shot('inicio')
    t.tap('SPACE')
    t.check('espaço começa no meio da tela, sem pedras', t.get('estado') == 'jogando'
            and t.get('pedras') == [] and t.get('pontos') == 0)

    # A borda errada não vale ponto.
    direcao = t.get('direcao')
    t.until(lambda: t.get('chegou')(OPOSTA[direcao]), 200, key=SETA[OPOSTA[direcao]])
    t.step(5)
    t.check('chegar na borda errada não vale ponto', t.get('pontos') == 0
            and t.get('direcao') == direcao)
    ao_centro()

    # Seguir a bússola: cada borda certa vale um ponto.
    direcoes = []
    tempos = []
    for _ in range(25):
        direcao = t.get('direcao')
        direcoes.append(direcao)
        if t.get('agulha').angle != ANGULO[direcao]:
            t.check('a agulha aponta para a direção pedida', False, direcao)
        ao_centro()
        antes = t.get('pontos')
        usados = t.until(lambda: t.get('pontos') > antes or t.get('estado') != 'jogando', 300,
                         key=SETA[direcao])
        if t.get('pontos') != antes + 1:
            t.check('correr para a borda certa vale um ponto', False, f'{direcao} em {usados} quadros')
            return
        tempos.append(t.get('tempo'))
    t.check('25 bordas certas valem 25 pontos', t.get('pontos') == 25)
    t.check('a direção seguinte é sempre outra', all(a != b for a, b in zip(direcoes, direcoes[1:])))
    t.check('as quatro direções aparecem', set(direcoes) == set(SETA))
    t.check('a cada dez pontos sobe o nível e aparece uma pedra',
            t.get('nivel') == 3 and len(t.get('pedras')) == 2)
    t.check('cada ponto do nível dá menos tempo, até o mínimo', tempos[1] < tempos[0]
            and min(tempos) >= t.get('TEMPO_MINIMO'))
    t.check('ao subir de nível o tempo volta a ser o maior', tempos[9] == t.get('TEMPO_INICIAL'))
    t.shot('jogando')

    # Ficar parado: o tempo acaba no prazo.
    restante = t.get('tempo')
    usados = t.until(lambda: t.get('estado') != 'jogando', 60 * 15)
    t.check('sem andar, o tempo acaba e o jogo termina', t.get('estado') == 'fim'
            and abs(usados - restante * 60) <= 2, f'{usados} quadros para {restante:.2f} s')
    t.check('o recorde fica com os pontos da partida', t.get('recorde') == 25)
    with open(arquivo) as guardado:
        t.check('e fica guardado no arquivo', guardado.read() == '25')
    t.shot('fim')

    # Recomeçar zera tudo.
    t.tap('SPACE')
    t.check('espaço joga de novo, zerado e sem pedras', t.get('estado') == 'jogando'
            and t.get('pontos') == 0 and t.get('nivel') == 1 and t.get('pedras') == [])

    # No canto, a direção nova nunca é uma borda que o explorador já toca.
    nova_direcao = t.get('nova_direcao')
    chegou = t.get('chegou')
    explorador.topleft = (0, 0)
    de_graca = 0
    for _ in range(300):
        t.set('direcao', 'NORTE')
        nova_direcao()
        if chegou(t.get('direcao')):
            de_graca = de_graca + 1
    t.check('no canto, a bússola nunca pede a borda onde ele já está', de_graca == 0)

    # A pedra nunca nasce em cima do explorador.
    lugares = t.get('LUGARES_DAS_PEDRAS')
    em_cima = 0
    for lugar in lugares:
        explorador.center = lugar
        t.set('nivel', len(lugares) + 1)
        t.get('colocar_pedras')()
        if any(pedra.colliderect(explorador) for pedra in t.get('pedras')):
            em_cima = em_cima + 1
    t.check('subir de nível nunca põe uma pedra em cima do explorador', em_cima == 0)

    # Uma pedra no caminho acaba o jogo.
    explorador.center = (400, 300)
    t.set('nivel', 2)
    t.get('colocar_pedras')()
    pedra = t.get('pedras')[0]
    for _ in range(200):
        if abs(explorador.x - pedra.x) <= 4:
            break
        t.hold('LEFT' if explorador.x > pedra.x else 'RIGHT', 1)
    t.until(lambda: t.get('estado') != 'jogando', 120, key='UP' if pedra.y < explorador.y else 'DOWN')
    t.check('esbarrar numa pedra acaba o jogo', t.get('estado') == 'fim')
    t.check('uma partida pior não troca o recorde', t.get('recorde') == 25)

    # O recorde volta do arquivo.
    t.set('recorde', 0)
    t.get('ler_recorde')()
    t.check('o arquivo traz o recorde de volta', t.get('recorde') == 25)
    os.remove(arquivo)
    t.get('ler_recorde')()
    t.check('sem arquivo, o recorde é zero', t.get('recorde') == 0)
