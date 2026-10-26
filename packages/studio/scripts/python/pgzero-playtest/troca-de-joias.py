"""Troca de Joias: the board starts with no trio; a swap that makes a trio scores, clears and
refills (cascades included); a swap that makes none goes back and costs no move."""

import random


def play(t):
    random.seed(7)
    t.get('montar_tabuleiro')()
    tabuleiro = t.get('tabuleiro')
    achar = t.get('achar_trios')
    trocar = t.get('trocar')
    t.check('o tabuleiro começa sem nenhum trio', achar() == [])
    LINHAS, COLUNAS = t.get('LINHAS'), t.get('COLUNAS')

    def ir_para(linha, coluna):
        while t.get('linha_escolhida') < linha:
            t.tap('DOWN')
        while t.get('linha_escolhida') > linha:
            t.tap('UP')
        while t.get('coluna_escolhida') < coluna:
            t.tap('RIGHT')
        while t.get('coluna_escolhida') > coluna:
            t.tap('LEFT')

    def troca_que(faz_trio):
        for linha in range(LINHAS):
            for coluna in range(COLUNAS - 1):
                t.set('linha_escolhida', linha)
                t.set('coluna_escolhida', coluna)
                trocar()
                deu = bool(achar())
                trocar()
                if deu == faz_trio:
                    return linha, coluna
        return None

    t.set('linha_escolhida', 0)
    t.set('coluna_escolhida', 0)
    sem = troca_que(False)
    t.set('linha_escolhida', 0)
    t.set('coluna_escolhida', 0)
    ir_para(*sem)
    antes = [list(linha) for linha in tabuleiro]
    t.tap('SPACE')
    t.check('troca sem trio volta atrás e não gasta jogada',
            tabuleiro == antes and t.get('jogadas') == 20 and t.get('pontos') == 0)
    com = troca_que(True)
    t.set('linha_escolhida', 0)
    t.set('coluna_escolhida', 0)
    ir_para(*com)
    t.tap('SPACE')
    t.check('troca com trio gasta uma jogada', t.get('jogadas') == 19)
    t.until(lambda: not t.get('esperando'), 600)
    t.check('o trio some, as joias caem e o tabuleiro fica cheio de novo',
            t.get('pontos') >= 30 and all(cor != -1 for linha in tabuleiro for cor in linha) and achar() == [],
            f"pontos={t.get('pontos')}")
    t.shot('depois-da-troca')
    # Jogando até acabar as jogadas, o fim aparece e espaço recomeça.
    for _ in range(19):
        com = troca_que(True)
        t.set('linha_escolhida', com[0]); t.set('coluna_escolhida', com[1])
        t.tap('SPACE')
        t.until(lambda: not t.get('esperando'), 600)
    t.check('as jogadas acabam em 0', t.get('jogadas') == 0, f"pontos={t.get('pontos')}")
    t.shot('fim')
    t.tap('SPACE')
    t.step(2)
    t.check('espaço recomeça com 20 jogadas e 0 pontos', t.get('jogadas') == 20 and t.get('pontos') == 0)

    # Sem nenhuma troca possível no fim da cascata, o tabuleiro é montado de novo.
    tabuleiro = t.get('tabuleiro')
    tabuleiro.clear()
    for linha in range(t.get('LINHAS')):
        tabuleiro.append([(linha * 2 + coluna) % 4 for coluna in range(t.get('COLUNAS'))])
    t.check('o tabuleiro de teste não tem trio nem jogada', not achar() and not t.get('tem_jogada')())
    t.set('jogadas', 5)
    t.set('esperando', True)
    t.get('tirar_trios')()
    t.check('sem jogada, vêm joias novas com jogada', t.get('tem_jogada')() and not achar() and not t.get('esperando'))
    t.check('e o jogo avisa', 'Sem jogadas' in t.get('aviso'))
    t.step(150)
    t.check('o aviso some depois de um tempo', t.get('aviso') == '')
