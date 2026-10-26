"""Clarão com Shader: a barra e o clique no personagem acendem o clarão, que apaga sozinho."""
import pyray


def play(t):
    g = t.game

    yield from t.wait(10)
    t.check(g['quanto'].x == 0, 'o clarão começou aceso')
    # Um ponto da calça do personagem, na tela.
    caixa = g['caixa']
    altura = caixa.min.y + (caixa.max.y - caixa.min.y) * 0.25
    ponto = pyray.get_world_to_screen(pyray.Vector3(0, altura, 0), g['camera'])
    t.capture()
    yield
    apagado = t.pixel(ponto.x, ponto.y)
    t.check(min(apagado[:3]) < 200, f'o personagem já estava branco ({apagado})')
    yield from t.tap('SPACE', frames=1)
    t.check(g['quanto'].x > 0.9 and g['toques'] == 1, 'a barra não acendeu o clarão')
    # O clarão chega à tela: o mesmo ponto fica quase branco (o shader recebeu o valor).
    t.capture()
    yield
    aceso = t.pixel(ponto.x, ponto.y)
    t.check(min(aceso[:3]) > 220, f'o clarão não apareceu na tela ({apagado} -> {aceso})')
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
