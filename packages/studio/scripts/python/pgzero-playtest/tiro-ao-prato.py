"""Tiro ao Prato: a shot with no disc in the sight scores nothing; the sight follows the disc that
is coming; shooting when it is inside breaks it for 1000 points; a disc nobody shoots leaves;
a player that shoots on time breaks almost every disc of the round; space plays again."""

import random


def play(t):
    # Na parte roteirizada nenhum prato sai sozinho: o sorteio sempre dá 150 (alto, no céu).
    sorteio = random.randint
    random.randint = lambda de, ate: 150
    t.tap('LEFT')
    t.check('atirar sem prato na mira não dá pontos', t.get('pontos') == 0)
    t.check('o atirador vira para o lado do tiro', t.get('atirador').image == 'atirador_esquerda')
    t.tap('LEFT')
    t.check('e espera um pouco antes do próximo tiro', t.get('espera_do_tiro') > 0)
    t.step(12)
    t.check('depois volta a olhar para a frente', t.get('atirador').image == 'atirador')

    # A mira da esquerda segue o prato que vem da esquerda.
    t.get('nova_rodada')()
    t.set('lancados', 18)
    t.get('lancar_prato')(100)
    prato = t.get('pratos')[0]
    mira = t.get('mira_esquerda')
    t.step(40)
    t.check('a mira chega perto da altura do prato', abs(mira.y - prato.y) < 15, f'mira={mira.y:.0f}, prato={prato.y:.0f}')
    t.until(lambda: prato.collidepoint(mira.pos), 200)
    t.tap('LEFT')
    t.check('atirando com o prato na mira, ele quebra', prato.quebrado > 0 and t.get('pontos') == 1000)
    t.shot('quebrando')
    t.step(30)
    t.check('o prato quebrado some', prato.quebrado == 19)

    # Prato que ninguém acerta passa direto.
    t.get('lancar_prato')(700)
    outro = t.get('pratos')[-1]
    t.step(200)
    t.check('o prato que ninguém acerta sai da tela', outro.quebrado == 19 and t.get('acertos') == 1)
    t.check('com os 20 pratos lançados e nenhum no ar, a rodada acaba', t.get('fim'))

    # Uma rodada inteira atirando na hora certa.
    random.randint = sorteio
    random.seed(3)
    t.tap('SPACE')
    for _ in range(60 * 90):
        if t.get('fim'):
            break
        for lado, tecla in (('mira_esquerda', 'LEFT'), ('mira_direita', 'RIGHT')):
            mira = t.get(lado)
            if t.get('espera_do_tiro') == 0 and any(p.quebrado == 0 and p.collidepoint(mira.pos) for p in t.get('pratos')):
                t.tap(tecla)
        t.step(1)
    t.check('a rodada termina com os 20 pratos', t.get('fim') and t.get('lancados') == 20)
    t.check('atirando na hora certa, quebra quase todos', t.get('acertos') >= 16, f"acertos={t.get('acertos')}")
    t.check('cada prato quebrado vale 1000', t.get('pontos') == 1000 * t.get('acertos'))
    t.shot('fim')
    t.tap('SPACE')
    t.check('espaço começa outra rodada', not t.get('fim') and t.get('lancados') == 0 and t.get('pontos') == 0)
