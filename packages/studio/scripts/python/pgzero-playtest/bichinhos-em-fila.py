"""Bichinhos em Fila: the critters read the level image to walk, fall and climb small steps;
with no blocker they all fall into the pit; one blocker at the edge saves enough of them."""


def play(t):
    bichos = t.get('bichos')
    estados = t.get('estados')
    t.until(lambda: t.get('acabou')(), 4000)
    t.check('sem bloqueio, todos caem no buraco da direita', t.get('salvos') == 0 and estados.count('morto') == 10,
            f"salvos={t.get('salvos')} {estados}")
    t.shot('sem-bloqueio')
    t.click((400, 300))
    t.step(2)
    t.check('um clique depois do fim recomeça a fase', not bichos and t.get('soltos') == 0)
    # O primeiro bichinho vira bloqueador perto da beirada da direita.
    t.until(lambda: bichos and estados[0] == 'andando' and bichos[0].x >= 640, 2000)
    t.click(bichos[0].pos)
    t.step(2)
    t.check('clicar num bichinho andando faz ele bloquear', estados[0] == 'bloqueando')
    subiu_degrau = [False]
    for _ in range(5000):
        if t.get('acabou')():
            break
        t.step(1)
        for numero, bicho in enumerate(bichos):
            if estados[numero] == 'andando' and 300 < bicho.bottom < 310 and 180 <= bicho.x <= 240:
                subiu_degrau[0] = True
    t.check('os bichinhos sobem os degrauzinhos do caminho', subiu_degrau[0])
    t.check('com um bloqueio, a maioria chega à saída', t.get('salvos') >= t.get('PARA_VENCER'),
            f"salvos={t.get('salvos')} {estados}")
    t.shot('salvos')
    # Clicar num bloqueador solta ele: um bichinho preso para sempre sempre tem saída.
    t.click((400, 300))
    t.step(2)
    t.until(lambda: bichos and estados[0] == 'andando' and bichos[0].x >= 300, 2000)
    t.click(bichos[0].pos)
    t.step(2)
    t.check('com o bloqueio posto, sobram dois', estados[0] == 'bloqueando' and t.get('bloqueios') == 1)
    t.click(bichos[0].pos)
    t.step(2)
    t.check('clicar de novo no bloqueador solta ele e devolve o bloqueio', estados[0] == 'andando' and t.get('bloqueios') == 0)
