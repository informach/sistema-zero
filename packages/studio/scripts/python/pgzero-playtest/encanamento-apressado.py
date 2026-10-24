"""Encanamento Apressado: water waits for the countdown, then follows the pipes tile by tile
(curves turn it, the cross lets it go straight), leaks at an open end, and wins after 12 pipes."""


def play(t):
    fila = t.get('fila')
    X0, Y0, TAMANHO = t.get('X0'), t.get('Y0'), t.get('TAMANHO')

    def por(linha, coluna, peca):
        fila[0] = peca  # escolhe a peça da vez, como quem espera a peça certa
        t.click((X0 + coluna * TAMANHO + 30, Y0 + linha * TAMANHO + 30))

    # Um caminho de 12 canos: em frente pela linha 3, uma cruz no meio, descendo pela direita.
    caminho = [(3, c, 'horizontal') for c in range(1, 9)]
    caminho[3] = (3, 4, 'cruz')
    caminho += [(3, 9, 'baixo_esquerda'), (4, 9, 'vertical'), (5, 9, 'vertical'), (6, 9, 'cima_esquerda')]
    for linha, coluna, peca in caminho:
        por(linha, coluna, peca)
    t.check('a água espera a contagem antes de sair', t.get('canos') == 0 and t.get('contagem') == 10)
    t.shot('montado')
    t.click((X0 + 30, Y0 + 3 * TAMANHO + 30))
    t.check('não dá para trocar o começo', t.get('grade')[3][0] == 'inicio')
    t.set('contagem', 0)
    t.until(lambda: t.get('fim') != '', 60 * 60)
    t.check('a água percorre os 12 canos e vence', t.get('fim') == 'venceu' and t.get('canos') == 12, f"fim={t.get('fim')} canos={t.get('canos')}")
    t.shot('venceu')
    t.click((400, 300))
    t.step(2)
    t.check('um clique depois do fim recomeça', t.get('fim') == '' and t.get('canos') == 0)
    # Uma curva para cima com a borda de cima vazia: a água vaza.
    por(3, 1, 'horizontal')
    por(3, 2, 'cima_esquerda')
    t.set('contagem', 0)
    t.until(lambda: t.get('fim') != '', 60 * 60)
    t.check('cano aberto para o nada: vaza', t.get('fim') == 'vazou' and t.get('canos') == 2, f"canos={t.get('canos')}")
