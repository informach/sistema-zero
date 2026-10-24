def play(t):
    p = t.get('pulador')
    # Sem a bolinha, para provar o caminho; ela é testada separado.
    t.get('clock').unschedule(t.get('soltar_bolinha'))

    def pular(tecla):
        t.tap(tecla)
        t.until(lambda: not t.get('pulando'), 60)
        t.step(2)

    # Desce a coluna 0, sobe a 1, desce a 2...: passa por todos os 28 cubos.
    roteiro = (['LEFT'] * 6 + ['RIGHT', 'DOWN'] + ['RIGHT'] * 5 + ['DOWN'] + ['LEFT'] * 4 + ['RIGHT', 'DOWN']
               + ['RIGHT'] * 3 + ['DOWN'] + ['LEFT'] * 2 + ['RIGHT', 'DOWN'] + ['RIGHT'] + ['DOWN'])
    for tecla in roteiro:
        pular(tecla)
        if t.get('caiu') or t.get('vidas') < 3:
            break
    t.check('pinta os 28 cubos sem cair', t.get('venceu') and t.get('pintados') == 28,
            f"pintados={t.get('pintados')} vidas={t.get('vidas')} linha={t.get('linha_atual')} coluna={t.get('coluna_atual')}")
    t.shot('1-pintada')
    # Pular para fora da pirâmide: cai e perde uma vida, e volta ao topo.
    t.tap('SPACE')
    t.step(3)
    t.check('espaço recomeça com a pirâmide limpa', t.get('pintados') == 1 and not t.get('venceu'))
    pular('RIGHT')
    t.step(60)
    t.check('pular para fora da pirâmide cai e perde uma vida', t.get('vidas') == 2, f"vidas={t.get('vidas')}")
    t.check('depois da queda, volta ao topo', t.get('linha_atual') == 0 and not t.get('caiu'))
    # A bolinha: solta, desce, e encostar nela tira vida.
    bola = t.get('bolinha')
    t.set('bola_linha', 0)
    t.set('bola_coluna', 0)
    bola.pos = t.get('lugar')(0, 0)
    t.step(2)
    t.check('encostar na bolinha tira uma vida', t.get('vidas') == 1 and t.get('bola_linha') == -1, f"vidas={t.get('vidas')}")
    t.shot('2-bolinha')
