"""Memória contra o Computador: sixteen cards, eight animals twice; two clicks turn two cards;
a pair stays with whoever found it and that player goes on; a miss turns them back and passes
the turn; the computer also sees the child's cards, remembers them with a chance and plays a
pair it knows; whoever has more pairs at the end wins."""


def play(t):
    sorteio = t.get('random')
    cartas = t.get('cartas')

    def nova_partida(semente):
        sorteio.seed(semente)
        t.get('dar_as_cartas')()

    def clicar(numero):
        t.click(cartas[numero].ator.center)

    def esperar_minha_vez():
        t.until(lambda: t.get('estado') == 'fim'
                or (t.get('vez') == 'voce' and t.get('estado') == 'jogando'), 60 * 60)

    nova_partida(1)
    bichos = [carta.bicho for carta in cartas]
    t.check('dezesseis cartas, oito bichos, cada um duas vezes', len(cartas) == 16
            and all(bichos.count(bicho) == 2 for bicho in t.get('BICHOS')))
    t.shot('mesa')

    # Memória perfeita: todos os pares de uma vez.
    for bicho in t.get('BICHOS'):
        par = [numero for numero in range(16) if cartas[numero].bicho == bicho]
        clicar(par[0])
        clicar(par[1])
        t.until(lambda: t.get('estado') != 'olhando', 120)
        t.check('um par fica com quem achou', cartas[par[0]].dono == 'voce' and cartas[par[1]].dono == 'voce')
        esperar_minha_vez()
    t.check('achar par atrás de par: oito a zero', t.get('estado') == 'fim'
            and t.get('pontos') == {'voce': 8, 'computador': 0})
    t.shot('voce-venceu')

    # As regras do clique.
    t.tap('SPACE')
    t.check('espaço dá as cartas de novo', t.get('estado') == 'jogando'
            and t.get('pontos') == {'voce': 0, 'computador': 0} and all(carta.dono == '' for carta in cartas))
    t.set('MEMORIA_DO_COMPUTADOR', 1)
    nova_partida(2)
    diferentes = [numero for numero in range(1, 16) if cartas[numero].bicho != cartas[0].bicho]
    clicar(0)
    clicar(diferentes[0])
    clicar(diferentes[1])
    t.check('a terceira carta não vira enquanto você olha as duas', not cartas[diferentes[1]].virada)
    t.until(lambda: t.get('vez') == 'computador', 120)
    t.check('errou: as cartas voltam e a vez passa', not cartas[0].virada and t.get('vez') == 'computador')
    clicar(diferentes[2])
    t.check('na vez do computador o seu clique não vira carta', not cartas[diferentes[2]].virada
            or t.get('abertas') != [diferentes[2]])

    # Quem só erra perde para o computador, que lembra do que viu.
    while t.get('estado') != 'fim':
        esperar_minha_vez()
        if t.get('estado') == 'fim':
            break
        livres = t.get('livres')()
        primeira = livres[0]
        outra = [numero for numero in livres if cartas[numero].bicho != cartas[primeira].bicho]
        if not outra:
            break
        clicar(primeira)
        clicar(outra[0])
        t.until(lambda: t.get('estado') != 'olhando', 120)
    pontos = t.get('pontos')
    t.check('virando cartas erradas, o computador fica com os pares', t.get('estado') == 'fim'
            and pontos['computador'] >= 7 and pontos['voce'] <= 1, str(pontos))
    t.shot('computador-venceu')

    # Um computador que nunca esquece não erra um par que já viu.
    nova_partida(3)
    computador = t.get('computador')
    for numero in range(16):
        computador.lembra[numero] = cartas[numero].bicho
    t.set('vez', 'computador')
    t.until(lambda: t.get('estado') == 'fim', 60 * 60)
    t.check('sabendo todas as cartas, ele faz os oito pares seguidos',
            t.get('pontos') == {'voce': 0, 'computador': 8})

    # As cartas do computador ficam viradas o tempo de olhar (TEMPO_PARA_OLHAR).
    nova_partida(4)
    t.set('TEMPO_PARA_OLHAR', 2.0)
    t.set('vez', 'computador')
    t.until(lambda: t.get('estado') == 'olhando', 60 * 10)
    quadros = t.until(lambda: t.get('estado') != 'olhando', 60 * 10)
    t.check('as duas cartas do computador ficam viradas o TEMPO_PARA_OLHAR', 115 <= quadros <= 125,
            f'{quadros} quadros')
    t.set('TEMPO_PARA_OLHAR', 1.0)

    # Com um bicho a mais (desenhado no Pinta), a mesa sorteia oito e cada um vem em par.
    t.set('BICHOS', t.get('BICHOS') + ['dragao'])
    for semente in range(5, 15):
        nova_partida(semente)
        bichos = [carta.bicho for carta in cartas]
        if len(bichos) != 16 or any(bichos.count(bicho) != 2 for bicho in bichos):
            break
    t.check('com nove bichos, a mesa tem oito pares, nunca bicho sem par',
            len(bichos) == 16 and all(bichos.count(bicho) == 2 for bicho in bichos))
