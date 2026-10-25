"""Batalha Naval: the five ships go on your grid by clicking (space turns the next one; a ship that
would leave the grid or overlap another is refused; R takes them back); then each side fires one shot per turn; the
computer, after a hit, aims at the cells around it until the ship sinks; whoever sinks the five
ships of the other wins, and space starts another match."""


def play(t):
    t.get('random').seed(7)
    minha = t.get('minha_frota')
    inimiga = t.get('frota_inimiga')
    tamanhos = t.get('TAMANHOS')
    casa_px = t.get('CASA')

    def centro(frota, casa):
        x, y = frota.lugar(casa)
        return (x + casa_px // 2, y + casa_px // 2)

    def vez_do_computador():
        t.until(lambda: t.get('estado') != 'computador', 60 * 3)

    t.check('o computador esconde os cinco navios dele',
            [len(navio.casas) for navio in inimiga.navios] == tamanhos)
    ocupadas = [casa for navio in inimiga.navios for casa in navio.casas]
    t.check('os navios do computador não se sobrepõem nem saem da grade',
            len(set(ocupadas)) == sum(tamanhos) and all(0 <= c < 10 and 0 <= l < 10 for c, l in ocupadas))

    # Pôr os navios.
    t.click((700, 100))
    t.check('clicar fora da grade não põe navio', len(minha.navios) == 0)
    t.click(centro(minha, (7, 0)))
    t.check('navio que sairia da grade não entra', len(minha.navios) == 0)
    t.tap('SPACE')
    t.check('espaço gira o navio', t.get('deitado') is False)
    t.click(centro(minha, (0, 0)))
    t.check('o navio em pé ocupa a coluna', minha.navios[0].casas == [(0, l) for l in range(5)])
    t.tap('SPACE')
    t.click(centro(minha, (0, 2)))
    t.check('navio em cima de outro não entra', len(minha.navios) == 1)
    for linha in [2, 4, 6, 8]:
        t.click(centro(minha, (2, linha)))
    t.check('com os cinco navios postos, a batalha começa', t.get('estado') == 'jogando'
            and len(minha.navios) == 5)
    t.shot('navios-postos')

    # Metade que vence: atirar só onde há navio.
    t.click(centro(inimiga, ocupadas[0]))
    t.check('acertar um navio marca fogo e passa a vez', inimiga.tiros[ocupadas[0]] == 'acerto'
            and t.get('estado') == 'computador')
    t.click(centro(inimiga, ocupadas[1]))
    t.check('na vez do computador o clique não atira', ocupadas[1] not in inimiga.tiros)
    vez_do_computador()
    t.check('o computador atira de volta', len(minha.tiros) == 1)
    t.click(centro(inimiga, ocupadas[0]))
    t.check('atirar de novo na mesma casa não gasta a vez', t.get('estado') == 'jogando')
    for casa in ocupadas[1:]:
        if t.get('estado') == 'fim':
            break
        t.click(centro(inimiga, casa))
        if t.get('estado') == 'computador':
            vez_do_computador()
    t.check('afundar os cinco navios do computador vence',
            t.get('estado') == 'fim' and inimiga.afundados() == 5 and minha.afundados() < 5)
    # Na borda da casa, fora do fogo, aparece o casco do navio afundado.
    t.step(1)
    tela = t.get('screen').surface
    casa_afundada = inimiga.lugar(inimiga.navios[0].casas[0])
    t.check('navio afundado do computador aparece', tuple(tela.get_at((casa_afundada[0] + 4, casa_afundada[1] + 15)))[:3] == (120, 144, 156))
    t.shot('voce-venceu')

    # Metade que perde: outra partida, atirando só na água.
    t.tap('SPACE')
    t.check('espaço começa outra partida', t.get('estado') == 'colocando' and minha.navios == []
            and inimiga.tiros == {})
    t.click(centro(minha, (0, 0)))
    t.click(centro(minha, (0, 2)))
    t.tap('r')
    t.check('R tira os navios já postos', minha.navios == [] and t.get('proximo') == 0)
    for linha in [0, 2, 4, 6, 8]:
        t.click(centro(minha, (0, linha)))
    agua = [(c, l) for c in range(10) for l in range(10)
            if inimiga.navio_em((c, l)) is None]
    tiros_do_computador = []
    casas_novas = []
    while t.get('estado') == 'jogando':
        antes = dict(minha.tiros)
        t.click(centro(inimiga, agua.pop(0)))
        vez_do_computador()
        novas = [casa for casa in minha.tiros if casa not in antes]
        casas_novas.append(len(novas))
        tiros_do_computador = tiros_do_computador + novas
    t.check('o computador nunca atira duas vezes na mesma casa', set(casas_novas) == {1},
            f'casas novas por vez: {sorted(set(casas_novas))}')
    # Os navios do computador que não afundaram continuam escondidos na água.
    tela = t.get('screen').surface
    escondida = inimiga.lugar(inimiga.navios[0].casas[0])
    t.check('navio que não afundou fica escondido', tuple(tela.get_at((escondida[0] + 4, escondida[1] + 15)))[:3] == t.get('AGUA'))
    # A procura em volta, direto na classe do adversário.
    Computador = t.get('Computador')
    Navio = t.get('Navio')
    robo = Computador()
    robo.resultado((4, 4), 'acerto', None)
    vizinhas = [robo.escolher() for _ in range(4)]
    t.check('depois de acertar, o computador atira nas quatro casas em volta',
            sorted(vizinhas) == [(3, 4), (4, 3), (4, 5), (5, 4)])
    robo = Computador()
    robo.resultado((0, 0), 'acerto', None)
    t.check('no canto da grade, só as vizinhas que existem', sorted(robo.alvos) == [(0, 1), (1, 0)])
    robo.resultado((0, 1), 'afundou', Navio([(0, 0), (0, 1)]))
    t.check('afundou o navio: volta a procurar', robo.alvos == [] and robo.acertos == [])
    # Dois navios encostados: afundar um não faz esquecer o acerto no outro.
    robo = Computador()
    robo.resultado((5, 5), 'acerto', None)
    robo.resultado((6, 5), 'acerto', None)
    robo.resultado((5, 6), 'afundou', Navio([(5, 5), (5, 6)]))
    t.check('afundou um navio: continua em volta do acerto no navio vizinho',
            robo.acertos == [(6, 5)] and sorted(set(robo.alvos)) == [(5, 5), (6, 4), (6, 6), (7, 5)]
            and robo.escolher() in [(6, 4), (6, 6), (7, 5)], f'acertos {robo.acertos}, alvos {robo.alvos}')
    procura = [robo.escolher() for _ in range(10)]
    t.check('para procurar, o computador usa casas alternadas', all((c + l) % 2 == 0 for c, l in procura))
    t.check('o computador acha os navios bem antes de atirar em tudo', len(tiros_do_computador) < 70,
            f'{len(tiros_do_computador)} tiros')
    t.check('quando o computador afunda os seus cinco navios, ele vence',
            t.get('estado') == 'fim' and minha.afundados() == 5 and inimiga.afundados() == 0)
    t.shot('computador-venceu')

    # Uma frota grande demais para sortear de primeira: o computador sorteia de novo, sem travar.
    t.set('TAMANHOS', [5] * 10)
    frota = t.get('Frota')((0, 0))
    for semente in range(20):
        t.get('random').seed(semente)
        frota.sortear()
    t.check('frota apertada: o sorteio recomeça e põe os dez navios', len(frota.navios) == 10
            and len({casa for navio in frota.navios for casa in navio.casas}) == 50)
    # Uma frota que não cabe avisa, em vez de travar o jogo.
    for impossivel in ([11], [5] * 11):
        t.set('TAMANHOS', impossivel)
        try:
            frota.sortear()
            avisou = False
        except ValueError as erro:
            avisou = 'não cabem' in str(erro)
        t.check(f'navios que não cabem ({len(impossivel)} de {impossivel[0]}) dão um aviso', avisou)
    t.set('TAMANHOS', [5, 4, 3, 3, 2])
