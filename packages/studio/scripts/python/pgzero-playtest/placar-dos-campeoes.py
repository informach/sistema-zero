"""Placar dos Campeões: the table starts with ten empty places; clicking stars in 15 seconds makes
points; a score better than the last place asks for a name typed on the screen (letters, digits
and space, up to ten; backspace erases, Enter confirms an unempty name); the new score goes in
its place in order, ties after the older ones, only ten stay, and the table survives in a file;
a score that does not enter the table goes straight back to it."""

import os


def play(t):
    placar = lambda: t.get('placar')
    t.check('o placar começa com dez lugares vazios', len(placar()) == 10 and placar()[0] == (0, '---'))
    t.shot('placar')

    # Clicar nas estrelas dá pontos.
    t.tap('SPACE')
    t.check('espaço começa a rodada', t.get('estado') == 'jogando' and t.get('pontos') == 0)
    estrela = t.get('estrela')
    t.click((5, 5))
    t.check('clicar fora da estrela não vale', t.get('pontos') == 0)
    for _ in range(12):
        lugar = estrela.pos
        t.click(lugar)
    t.check('cada estrela clicada vale um ponto e ela muda de lugar', t.get('pontos') == 12)
    t.until(lambda: t.get('estado') != 'jogando', 60 * 20)
    t.check('o tempo acaba e os pontos entram no placar: pede o nome', t.get('estado') == 'nome')

    # O nome é digitado na tela.
    t.tap('RETURN')
    t.check('sem nome, Enter não confirma', t.get('estado') == 'nome')
    t.type('ninaa')
    t.tap('BACKSPACE')
    t.check('as letras aparecem e a tecla de apagar volta uma', t.get('nome') == 'nina')
    t.type('nnnnnnnnnn')
    t.check('o nome tem no máximo dez letras', len(t.get('nome')) == 10)
    for _ in range(6):
        t.tap('BACKSPACE')
    t.tap('RETURN')
    t.check('Enter põe o nome no primeiro lugar', t.get('estado') == 'placar' and placar()[0] == (12, 'nina'))
    t.check('e o placar continua com dez lugares', len(placar()) == 10)
    t.check('o placar fica guardado num arquivo', os.path.exists(t.get('ARQUIVO')))

    # A ordem do placar.
    anotar = t.get('anotar')
    anotar(5, 'lia')
    anotar(20, 'dani')
    anotar(12, 'gil')
    t.check('cada pontuação entra no seu lugar, do maior para o menor',
            [p for p, n in placar()[:4]] == [20, 12, 12, 5], str(placar()[:4]))
    t.check('no empate, quem chegou antes fica na frente', placar()[1][1] == 'nina' and placar()[2][1] == 'gil')
    for pontos in range(30, 41):
        anotar(pontos, 'tia')
    t.check('só os dez melhores ficam', len(placar()) == 10 and placar()[-1][0] == 31 and placar()[0][0] == 40)
    t.get('placar_vazio')()
    t.get('carregar_placar')()
    t.check('o arquivo traz o placar de volta igualzinho', len(placar()) == 10 and placar()[0] == (40, 'tia') and placar()[-1] == (31, 'tia'))
    t.shot('campeoes')

    # Quem não chega ao último lugar não digita nome.
    t.tap('SPACE')
    t.until(lambda: t.get('estado') != 'jogando', 60 * 20)
    t.check('sem pontos para o placar, volta direto para ele', t.get('estado') == 'placar' and t.get('jogou'))
    t.set('pontos', 1)
    t.check('um ponto se escreve no singular', t.get('pontos_por_extenso')() == '1 ponto')

    # Um arquivo estragado não quebra o jogo.
    with open(t.get('ARQUIVO'), 'w') as arquivo:
        arquivo.write('isto não é um placar\n')
    t.get('carregar_placar')()
    t.check('com o arquivo estragado, o placar começa vazio', len(placar()) == 10 and placar()[0] == (0, '---'))
