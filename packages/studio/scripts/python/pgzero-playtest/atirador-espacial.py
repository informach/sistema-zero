"""Atirador Espacial: the rocks of each wave come from inimigos.txt (when, which, where, how fast,
how many shots); arrows fly the ship inside the lower half of the screen and space fires with a
cooldown; small rocks fall to one shot, big ones to three; hitting a rock costs a life and
leaves the ship protected for a moment; each wave restarts faster; without lives the game ends,
and a broken line of the file is reported instead of crashing the game."""

import os


def play(t):
    t.check('o jogo começa na tela de início', t.get('estado') == 'inicio')
    roteiro = t.get('roteiro')
    t.check('as pedras da onda vêm do arquivo inimigos.txt', len(roteiro) == 15
            and t.get('fim_da_onda') == 12 and t.get('aviso') == '')
    t.shot('inicio')
    t.tap('SPACE')
    t.check('espaço começa o jogo', t.get('estado') == 'jogando' and t.get('vidas') == 3)

    # O relógio solta as pedras na hora escrita no arquivo.
    t.until(lambda: len(t.get('pedras')) > 0, 60)
    primeira = t.get('pedras')[0]
    t.check('a primeira pedra aparece em x 200, como manda o arquivo',
            primeira.image == 'pedra_pequena' and primeira.x == 200 and 0.5 <= t.get('relogio') < 0.55)

    # A nave não sai da metade de baixo da tela.
    nave = t.get('nave')
    t.hold('LEFT', 200)
    t.hold('UP', 200)
    t.check('a nave não passa da borda nem da metade da tela', nave.left >= 0 and nave.top >= 300 - nave.height / 2,
            f'{nave.left} {nave.top}')

    # A recarga segura a cadência dos tiros.
    criados = set()
    for _ in range(60):
        t.down('SPACE')
        t.step(1)
        criados.update(id(tiro) for tiro in t.get('tiros'))
    t.up('SPACE')
    t.check('segurar o espaço atira com intervalo, não a cada quadro', 3 <= len(criados) <= 5,
            f'{len(criados)} tiros em 1 s')

    # Uma pedra grande aguenta três tiros e vale 10 pontos.
    t.get('pedras').clear()
    t.get('tiros').clear()
    t.set('protegida', 99)
    soltar = t.get('soltar')
    soltar({'imagem': 'pedra_grande', 'x': 400, 'velocidade': 0, 'vida': 3})
    grande = t.get('pedras')[-1]
    grande.y = 150
    nave.x = 400
    pontos = t.get('pontos')
    vidas_vistas = []
    explodiu = False
    for _ in range(90):
        t.down('SPACE')
        t.step(1)
        if grande in t.get('pedras'):
            vidas_vistas.append(grande.vida)
        elif any(explosao['pos'] == grande.pos for explosao in t.get('explosoes')):
            explodiu = True
    t.up('SPACE')
    t.check('a pedra grande perde uma vida a cada tiro', sorted(set(vidas_vistas), reverse=True) == [3, 2, 1],
            str(sorted(set(vidas_vistas))))
    t.check('a pedra grande cai no terceiro tiro e vale 10 pontos',
            grande not in t.get('pedras') and t.get('pontos') == pontos + 10)
    t.check('a pedra destruída explode no lugar dela', explodiu)

    # Bater numa pedra custa uma vida e deixa a nave protegida.
    t.set('protegida', 0)
    soltar({'imagem': 'pedra_media', 'x': int(nave.x), 'velocidade': 0, 'vida': 2})
    t.get('pedras')[-1].center = nave.center
    vidas = t.get('vidas')
    t.step(1)
    t.check('bater numa pedra custa uma vida', t.get('vidas') == vidas - 1 and t.get('protegida') > 1.5)
    soltar({'imagem': 'pedra_media', 'x': int(nave.x), 'velocidade': 0, 'vida': 2})
    t.get('pedras')[-1].center = nave.center
    t.step(1)
    t.check('protegida, a nave não perde outra vida', t.get('vidas') == vidas - 1)
    t.shot('jogando')

    # Metade que vence uma onda: um piloto que mira na pedra mais baixa e atira.
    t.tap('SPACE')
    t.set('estado', 'inicio')
    t.tap('SPACE')
    t.check('outra partida começa zerada', t.get('pontos') == 0 and t.get('onda') == 1 and t.get('pedras') == [])
    nave = t.get('nave')
    perdidas = 0
    for _ in range(60 * 13):
        if t.get('onda') == 2:
            break
        pedras = t.get('pedras')
        destino = nave.x
        # Mira só nas pedras que ainda estão acima da nave...
        acima = [pedra for pedra in pedras if pedra.bottom < nave.top - 40]
        if acima:
            destino = max(acima, key=lambda pedra: pedra.y).x
        # ...e sai da frente de uma pedra que já vai bater.
        for pedra in pedras:
            if nave.top - 90 < pedra.bottom and pedra.top < nave.bottom and abs(pedra.x - nave.x) < pedra.width / 2 + nave.width / 2 + 10:
                destino = nave.x + (80 if pedra.x < nave.x or nave.x < 100 else -80)
        t.up('LEFT')
        t.up('RIGHT')
        if destino < nave.x - 4:
            t.down('LEFT')
        if destino > nave.x + 4:
            t.down('RIGHT')
        vidas = t.get('vidas')
        t.down('SPACE')
        t.step(1)
        perdidas = perdidas + vidas - t.get('vidas')
    for tecla in ['LEFT', 'RIGHT', 'SPACE']:
        t.up(tecla)
    # A onda inteira vale 340 pontos: o piloto faz pelo menos metade.
    t.check('mirando, desviando e atirando, o piloto passa da primeira onda', t.get('onda') == 2
            and t.get('estado') == 'jogando' and perdidas <= 1 and t.get('pontos') >= 150,
            f"{t.get('pontos')} pontos, {perdidas} vidas perdidas")
    nova = lambda: [pedra for pedra in t.get('pedras') if pedra.x == 200 and pedra.image == 'pedra_pequena' and pedra.y < 60]
    t.until(lambda: nova() != [], 60)
    t.check('a onda 2 é mais rápida', nova() != [] and abs(nova()[0].velocidade - 3 * 1.2) < 1e-9)

    # Metade que perde: parada, sem atirar, a nave vai perdendo as vidas.
    t.until(lambda: t.get('estado') == 'fim', 60 * 120)
    t.check('sem vidas, o jogo acaba', t.get('estado') == 'fim' and t.get('vidas') == 0)
    t.tap('SPACE')
    t.check('logo depois do fim, o espaço ainda não recomeça', t.get('estado') == 'fim')
    t.shot('fim')
    t.step(70)
    t.tap('SPACE')
    t.check('depois de um segundo, espaço joga de novo', t.get('estado') == 'jogando')

    # O arquivo de ondas pode ser mudado: e pode ter erro.
    with open('ondas_teste.txt', 'w', encoding='utf-8') as arquivo:
        arquivo.write('# teste\n1, pedra_media, 100, 2, 2\n\n2, pedra_gigante, 100, 2, 2\n3, pedra_pequena, cem, 2, 1\n5, fim\n')
    t.set('ARQUIVO_DAS_ONDAS', 'ondas_teste.txt')
    t.get('ler_ondas')()
    t.check('uma linha certa do arquivo vira pedra e o fim muda a duração da onda',
            len(t.get('roteiro')) == 1 and t.get('fim_da_onda') == 5)
    t.step(1)
    t.shot('aviso')
    t.check('uma linha com erro vira aviso com o número dela, sem travar', t.get('aviso') == 'A linha 5 de ondas_teste.txt tem um erro.',
            t.get('aviso'))
    with open('ondas_teste.txt', 'w', encoding='utf-8') as arquivo:
        arquivo.write('2, pedra_gigante, 100, 2, 2\n')
    t.get('ler_ondas')()
    t.check('imagem que o jogo não conhece vira aviso', 'veja PONTOS' in t.get('aviso'))
    with open('ondas_teste.txt', 'wb') as arquivo:
        arquivo.write(bytes([0x81]) + b', fim')
    t.get('ler_ondas')()
    t.check('uma letra que não dá para ler vira aviso, sem travar', 'Não consegui ler' in t.get('aviso'))
    os.remove('ondas_teste.txt')
    t.get('ler_ondas')()
    t.check('sem o arquivo, o jogo avisa', t.get('aviso') == 'Não achei o arquivo ondas_teste.txt.')

    # A linha "fim" manda na duração da onda.
    with open('ondas_teste.txt', 'w', encoding='utf-8') as arquivo:
        arquivo.write('0.5, pedra_pequena, 100, 2, 1\n3, fim\n')
    t.set('protegida', 0)
    t.get('novo_jogo')()
    t.set('protegida', 999)
    quadros = t.until(lambda: t.get('onda') == 2, 60 * 10)
    t.check('a onda dura os segundos da linha "fim"', 175 <= quadros <= 185, f'{quadros} quadros')
    os.remove('ondas_teste.txt')

    # Velocidade de pedra fora do razoável fica entre o mínimo e o máximo.
    for velocidade, esperada in [(-5, 0.5), (0, 0.5), (500, 12)]:
        t.get('soltar')({'imagem': 'pedra_pequena', 'x': 100, 'velocidade': velocidade, 'vida': 1})
        t.check(f'pedra com velocidade {velocidade} desce a {esperada}', t.get('pedras')[-1].velocidade == esperada)
