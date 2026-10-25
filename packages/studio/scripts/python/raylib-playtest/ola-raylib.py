"""Olá, Raylib: o clique no círculo grande troca a cor dele; fora do círculo não troca."""


def play(t):
    yield from t.wait(5)
    t.shot('inicio')
    cor = t.game['cor_do_circulo']
    # Fora do círculo: nada muda (anti-vácuo do clique).
    yield from t.click(100, 400)
    t.check(t.game['cor_do_circulo'] == cor, 'clique fora do círculo trocou a cor')
    yield from t.click(600, 260)
    t.check(t.game['cor_do_circulo'] != cor, 'clique no círculo não trocou a cor')
    yield from t.wait(2)
    t.shot('depois-do-clique')
    yield from t.click(640, 300)
    t.check(t.game['cor_do_circulo'] == cor, 'o segundo clique não devolveu a cor')
    t.end()
    yield
