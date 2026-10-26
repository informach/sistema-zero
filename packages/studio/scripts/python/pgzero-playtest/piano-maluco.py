"""Piano Maluco: every white and black key plays its own note made once with tone.create (the
black keys sit over the white ones and win the click); "Ouvir" plays the song by itself; in
"Jogar" the note on the line is the one to play: the right key in its beat is a hit (only
once), another key is a mistake, and a note that passes untouched is lost; the song ends."""


def play(t):
    brancas = t.get('teclas_brancas')
    pretas = t.get('teclas_pretas')
    musica = t.get('MUSICA')
    notas = [nota for nota in musica if nota != '']
    t.check('cada tecla tem a sua nota pronta', set(t.get('sons')) == set(brancas) | set(pretas)
            and len(pretas) == 7)

    def clicar_na(nota):
        tecla = pretas[nota] if nota in pretas else brancas[nota]
        # Na branca, clica embaixo, onde a preta não chega.
        t.click((tecla.centerx, tecla.bottom - 10 if nota in brancas else tecla.centery))

    # As pretas ficam por cima das brancas.
    tecla_em = t.get('tecla_em')
    t.check('a parte de cima entre C e D é o C#', tecla_em((brancas['C4'].right, brancas['C4'].top + 30)) == 'C#4')
    t.check('a parte de baixo da tecla é o C', tecla_em((brancas['C4'].right - 5, brancas['C4'].bottom - 5)) == 'C4')
    clicar_na('F#4')
    t.check('clicar numa tecla acende a tecla', t.get('tecla_acesa') == 'F#4')

    # Cada nota toca de verdade: um dublê conta os play() de cada som.
    tocadas_de_verdade = []

    class Duble:
        def __init__(self, nota):
            self.nota = nota

        def play(self):
            tocadas_de_verdade.append(self.nota)

    sons = t.get('sons')
    for nota in list(sons):
        sons[nota] = Duble(nota)
    clicar_na('G4')
    t.check('clicar numa tecla toca a nota dela', tocadas_de_verdade == ['G4'])

    # Ouvir: a música toca sozinha.
    tocadas = []
    tocar = t.get('tocar')
    t.set('tocar', lambda nota: (tocadas.append(nota), tocar(nota)))
    t.click(t.get('botao_ouvir').pos)
    t.check('"Ouvir" começa a música', t.get('estado') == 'ouvir')
    t.until(lambda: t.get('estado') != 'ouvir', 60 * 60)
    t.check('a música toca sozinha, nota por nota, e volta ao menu',
            t.get('estado') == 'menu' and tocadas == notas and tocadas_de_verdade[1:] == notas)
    t.set('tocar', tocar)

    # Jogar e acertar todas.
    t.click(t.get('botao_jogar').pos)
    t.check('"Jogar" começa a música zerada', t.get('estado') == 'jogar' and t.get('pontos') == 0)
    clicar_na('C4')
    t.check('na contagem, a tecla só toca: não é erro', t.get('erros') == 0
            and tocadas_de_verdade[-1] == 'C4')
    feitas = 0
    while t.get('estado') == 'jogar':
        nota = t.get('nota_atual')()
        if nota != '' and not t.get('acertou'):
            clicar_na(nota)
            feitas = feitas + 1
            if feitas == 5:
                t.shot('jogando')
        t.step(1)
    t.check('tocar cada nota na hora certa acerta a música inteira',
            t.get('pontos') == len(notas) and t.get('erros') == 0 and t.get('perdidas') == 0,
            f"{t.get('pontos')} de {len(notas)}")
    t.check('no fim da música o jogo termina', t.get('estado') == 'fim')
    t.shot('fim')

    # Jogar sem tocar: todas as notas se perdem.
    t.click(t.get('botao_jogar').pos)
    t.until(lambda: t.get('estado') != 'jogar', 60 * 60)
    t.check('nota que passa sem ser tocada fica perdida',
            t.get('pontos') == 0 and t.get('perdidas') == len(notas))

    # Errar a tecla, e tocar a certa duas vezes.
    t.click(t.get('botao_jogar').pos)
    t.until(lambda: t.get('nota_atual')() != '', 60 * 10)
    certa = t.get('nota_atual')()
    clicar_na('E5')
    t.check('a tecla errada é um erro', t.get('erros') == 1 and t.get('pontos') == 0)
    clicar_na(certa)
    clicar_na(certa)
    t.check('a nota certa vale uma vez só; tocar de novo é erro', t.get('pontos') == 1 and t.get('erros') == 2)
