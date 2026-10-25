"""Clarão com Shader: a barra e o clique no personagem acendem o clarão, que apaga sozinho."""


def play(t):
    g = t.game

    yield from t.wait(10)
    t.check(g['quanto'].x == 0, 'o clarão começou aceso')
    yield from t.tap('SPACE', frames=1)
    t.check(g['quanto'].x > 0.9 and g['toques'] == 1, 'a barra não acendeu o clarão')
    t.shot('clarao')
    yield from t.wait(40)
    t.check(g['quanto'].x == 0, 'o clarão não apagou sozinho')

    # Clique no meio do personagem (o centro da tela mira o corpo dele).
    yield from t.click(400, 230)
    yield
    t.check(g['toques'] == 2, 'o clique no personagem não contou')
    # Clique no céu, longe dele: não conta.
    yield from t.click(40, 420)
    yield
    t.check(g['toques'] == 2, 'um clique fora do personagem contou')
