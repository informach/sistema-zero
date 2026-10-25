"""Editor de Cavernas: pieces are picked in the panel and painted with a click or a drag; the
border stays wall and there is one miner; the cave is saved to a text file and loaded back;
testing plays a copy, so going back to the editor keeps the drawing; the rocks fall in the
test as in Cavando por Gemas."""

import os

PECAS = ['vazio', 'terra', 'pedra', 'gema', 'parede', 'minerador', 'saida']


def peca(nome):
    return (900, 110 + PECAS.index(nome) * 48)


def casa(linha, coluna):
    return (coluna * 40 + 20, 40 + linha * 40 + 20)


def escolher(t, nome):
    t.click(peca(nome))
    t.step(1)


def play(t):
    if os.path.exists('caverna.txt'):
        os.remove('caverna.txt')
    mapa = t.get('mapa')
    t.check('começa com parede em volta e terra por dentro',
            all(c == 'parede' for c in mapa[0]) and all(f[0] == 'parede' for f in mapa) and mapa[5][5] == 'terra')
    t.check('o minerador começa no canto e a saída no outro', mapa[1][1] == 'minerador' and mapa[12][18] == 'saida')

    escolher(t, 'gema')
    t.check('clicar numa peça do painel escolhe ela', t.get('escolhida') == 'gema')
    t.click(casa(3, 4))
    t.check('clicar no mapa põe a peça escolhida', t.get('mapa')[3][4] == 'gema')
    t.click(casa(0, 4))
    t.check('a borda continua parede', t.get('mapa')[0][4] == 'parede')

    escolher(t, 'parede')
    for coluna in range(6, 11):
        t.drag(casa(6, coluna))
    t.check('arrastar com o botão apertado pinta várias casas',
            all(t.get('mapa')[6][c] == 'parede' for c in range(6, 11)))
    t.move(casa(7, 6))
    t.check('mover sem apertar não pinta', t.get('mapa')[7][6] == 'terra')

    escolher(t, 'minerador')
    t.click(casa(10, 10))
    mapa = t.get('mapa')
    mineradores = sum(f.count('minerador') for f in mapa)
    t.check('só existe um minerador: o antigo some', mineradores == 1 and mapa[10][10] == 'minerador' and mapa[1][1] == 'vazio')
    t.shot('editor')

    # Carregar antes de guardar avisa.
    t.click((900, 530))
    t.check('carregar sem arquivo avisa', 'Ainda não' in t.get('aviso'))
    # Guardar e carregar.
    t.click((900, 480))
    t.check('guardar cria o arquivo da caverna', os.path.exists('caverna.txt'))
    linhas = open('caverna.txt', encoding='utf-8').read().split('\n')
    t.check('o arquivo tem uma linha de letras por fileira', len(linhas[0]) == 20 and linhas[3][4] == '*' and linhas[10][10] == 'M',
            repr(linhas[3]))
    escolher(t, 'pedra')
    t.click(casa(3, 4))
    t.check('mudando o mapa depois de guardar', t.get('mapa')[3][4] == 'pedra')
    t.click((900, 530))
    t.check('carregar traz de volta a caverna guardada', t.get('mapa')[3][4] == 'gema' and t.get('mapa')[10][10] == 'minerador')

    # Testando: uma caverna pequena desenhada à mão.
    mapa = t.get('mapa')
    t.get('mapa_inicial')()
    mapa = t.get('mapa')
    for fileira in mapa[1:13]:
        for coluna in range(1, 19):
            fileira[coluna] = 'vazio'
    mapa[1][1] = 'vazio'
    mapa[5][2] = 'minerador'
    mapa[5][3] = 'gema'
    mapa[5][4] = 'saida'
    mapa[12][18] = 'parede'
    t.tap('SPACE')
    t.step(2)
    t.check('espaço começa o teste', t.get('modo') == 'jogar' and t.get('gemas_total') == 1)
    t.tap('RIGHT')
    t.step(10)
    t.check('pegando a gema, a saída abre', t.get('gemas') == 1 and t.get('jogo')[5][4] == 'saida_aberta')
    t.tap('RIGHT')
    t.step(10)
    t.check('entrando na saída, a caverna dá para vencer', t.get('resultado') == 'venceu')
    t.shot('venceu')
    t.tap('SPACE')
    t.step(2)
    mapa = t.get('mapa')
    t.check('voltando ao editor, o desenho está como era', t.get('modo') == 'editar' and mapa[5][3] == 'gema' and mapa[5][2] == 'minerador')

    # Uma pedra solta no teste cai e amassa quem fica parado embaixo.
    mapa[3][2] = 'pedra'
    t.tap('SPACE')
    t.step(30)
    t.check('no teste, a pedra cai e amassa o minerador', t.get('resultado') == 'amassado')
    t.check('e no editor a pedra continua lá em cima', mapa[3][2] == 'pedra')
    t.tap('SPACE')
    t.step(2)

    # Sem minerador não dá para testar.
    for fileira in mapa:
        for coluna in range(len(fileira)):
            if fileira[coluna] == 'minerador':
                fileira[coluna] = 'vazio'
    t.tap('SPACE')
    t.step(2)
    t.check('sem minerador, avisa e continua no editor', t.get('modo') == 'editar' and 'minerador' in t.get('aviso'))
    os.remove('caverna.txt')
