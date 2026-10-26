"""Batalha de Monstrinhos: menus, turnos com cronômetro, vantagem de elemento, vitória, fuga e derrota."""


def play(t):
    g = t.game
    yield from t.wait(2)
    t.shot('inicio')

    def escolher(indice):
        """Desce até a opção `indice` do menu aberto e aperta Enter."""
        while g['opcao'] != indice:
            yield from t.tap('DOWN', 1)
        yield from t.tap('ENTER', 1)

    def esperar_a_vez():
        for _ in range(60 * 5):
            if g['menu'] != 'esperando' or g['estado'] != 'batalha':
                return
            yield

    # As setas andam pelo menu e dão a volta.
    t.check(g['menu'] == 'principal' and g['opcao'] == 0, 'o jogo não começou no menu principal')
    yield from t.tap('UP', 1)
    t.check(g['opcao'] == 3, 'a seta para cima não deu a volta até Fugir')

    # Atacar abre os golpes; ESC volta e NÃO fecha o jogo.
    yield from escolher(0)
    t.check(g['menu'] == 'golpes', 'Atacar não abriu os golpes')
    yield from t.tap('ESCAPE', 1)
    t.check(g['menu'] == 'principal', 'o ESC não voltou ao menu')
    t.check(g['estado'] == 'batalha', 'o ESC fechou a batalha')

    # A vantagem: o Jato (água) na Brasa (fogo) tira o dobro.
    t.check(g['multiplicador']('água', 'fogo') == 2, 'água não vence fogo')
    t.check(g['multiplicador']('fogo', 'água') == 0.5, 'fogo não perde para água')
    t.check(g['multiplicador']('raio', 'fogo') == 1, 'raio contra fogo devia ser normal')

    # Um golpe: tira vida do inimigo, o inimigo responde e o menu volta.
    vida = g['inimigo'].vida
    yield from escolher(0)
    yield from escolher(0)
    t.check(g['inimigo'].vida < vida or g['vitorias'] > 0, 'o golpe não tirou vida')
    t.check(g['menu'] == 'esperando', 'depois do golpe não ficou esperando a vez do inimigo')
    mensagem = g['mensagem']
    yield from esperar_a_vez()
    t.check(g['mensagem'] != mensagem, 'o inimigo não respondeu na vez dele')
    t.check(g['menu'] == 'principal', 'o menu não voltou depois do turno')
    t.shot('turno')

    # Batalhar: o golpe forte sempre; curar quando a vida estiver baixa. Vencer três.
    for _ in range(80):
        if g['vitorias'] >= 3 or g['estado'] != 'batalha':
            break
        j = g['jogador']
        if j.vida < j.vida_maxima / 3:
            yield from escolher(0)
            yield from escolher(2)
        else:
            yield from escolher(0)
            yield from escolher(0)
        yield from esperar_a_vez()
    t.check(g['vitorias'] >= 3, f'a batalha só teve {g["vitorias"]} vitórias')

    # Fugir mostra a tela de fuga e o Enter recomeça.
    if g['estado'] == 'batalha':
        yield from escolher(3)
    t.check(g['estado'] == 'fugiu', 'Fugir não acabou a batalha')
    t.shot('fugiu')
    yield from t.tap('ENTER', 1)
    t.check(g['estado'] == 'batalha' and g['vitorias'] == 0, 'o Enter não recomeçou')

    # Sem ninguém de pé para entrar, Trocar avisa e o menu fica no principal (antes, abria uma
    # lista vazia e a seta derrubava o jogo).
    salvas = dict(g['vidas_da_equipe'])
    for nome in g['equipe']:
        if nome != g['jogador'].nome:
            g['vidas_da_equipe'][nome] = 0
    yield from escolher(1)
    t.check(g['menu'] == 'principal', 'Trocar abriu uma lista vazia')
    yield from t.tap('DOWN', 1)
    t.check('Ninguém' in g['mensagem'], 'Trocar sem ninguém não avisou')
    g['vidas_da_equipe'].update(salvas)

    # Derrota: a equipe quase sem vida e só defendendo, até todos desmaiarem.
    for nome in g['equipe']:
        g['vidas_da_equipe'][nome] = 1
    g['jogador'].vida = 1
    for _ in range(60):
        if g['estado'] != 'batalha':
            break
        yield from escolher(2)
        yield from esperar_a_vez()
    t.check(g['estado'] == 'derrota', 'a equipe desmaiou toda e não foi derrota')
    yield from t.wait(2)
    t.shot('derrota')
    t.end()
    yield
