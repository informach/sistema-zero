import random
import pgzrun

WIDTH = 520
HEIGHT = 600
TITLE = 'Troca de Joias'
LINHAS = 10
COLUNAS = 8
TAMANHO = 52
CORES = 6
X0 = 52
Y0 = 70

tabuleiro = []
linha_escolhida = 0
coluna_escolhida = 0
pontos = 0
jogadas = 20
esperando = False
aviso = ''


def sortear_sem_trio(linha, coluna):
    # Sorteia uma joia que não forma três iguais com as duas da esquerda nem as duas de cima.
    while True:
        cor = random.randint(0, CORES - 1)
        trio_ao_lado = coluna >= 2 and tabuleiro[linha][coluna - 1] == cor and tabuleiro[linha][coluna - 2] == cor
        trio_em_cima = linha >= 2 and tabuleiro[linha - 1][coluna] == cor and tabuleiro[linha - 2][coluna] == cor
        if not trio_ao_lado and not trio_em_cima:
            return cor


def montar_tabuleiro():
    tabuleiro.clear()
    for linha in range(LINHAS):
        tabuleiro.append([])
        for coluna in range(COLUNAS):
            tabuleiro[linha].append(-1)
            tabuleiro[linha][coluna] = sortear_sem_trio(linha, coluna)
    # Um tabuleiro sem nenhuma troca possível não serve: monta outro.
    if not tem_jogada():
        montar_tabuleiro()


def achar_trios():
    # Uma lista de [linha, coluna] de cada joia que faz parte de três ou mais iguais em fila.
    marcadas = []
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            cor = tabuleiro[linha][coluna]
            if cor == -1:
                continue
            if coluna <= COLUNAS - 3 and tabuleiro[linha][coluna + 1] == cor and tabuleiro[linha][coluna + 2] == cor:
                for mais in range(3):
                    if [linha, coluna + mais] not in marcadas:
                        marcadas.append([linha, coluna + mais])
            if linha <= LINHAS - 3 and tabuleiro[linha + 1][coluna] == cor and tabuleiro[linha + 2][coluna] == cor:
                for mais in range(3):
                    if [linha + mais, coluna] not in marcadas:
                        marcadas.append([linha + mais, coluna])
    return marcadas


def trocar_em(linha, coluna):
    proxima = tabuleiro[linha][coluna + 1]
    tabuleiro[linha][coluna + 1] = tabuleiro[linha][coluna]
    tabuleiro[linha][coluna] = proxima


def trocar():
    trocar_em(linha_escolhida, coluna_escolhida)


def tem_jogada():
    # Experimenta cada troca: se alguma forma três iguais, ainda dá para jogar.
    for linha in range(LINHAS):
        for coluna in range(COLUNAS - 1):
            trocar_em(linha, coluna)
            forma_trio = len(achar_trios()) > 0
            trocar_em(linha, coluna)
            if forma_trio:
                return True
    return False


def apagar_aviso():
    global aviso
    aviso = ''


def tirar_trios():
    # Some com as joias dos trios. Se não havia nenhum, a cascata acabou.
    global pontos, esperando, aviso
    marcadas = achar_trios()
    if not marcadas:
        esperando = False
        if jogadas > 0 and not tem_jogada():
            # Acabaram as trocas possíveis: joias novas para continuar.
            montar_tabuleiro()
            aviso = 'Sem jogadas: joias novas!'
            clock.schedule(apagar_aviso, 2)
        return
    for linha, coluna in marcadas:
        tabuleiro[linha][coluna] = -1
    pontos = pontos + 10 * len(marcadas)
    sounds.trio.play()
    clock.schedule(cair, 0.25)


def cair():
    # As joias de cima caem nos buracos, e novas entram pelo alto. Depois, procura trios de novo.
    for coluna in range(COLUNAS):
        for linha in range(LINHAS - 1, -1, -1):
            if tabuleiro[linha][coluna] == -1:
                acima = linha - 1
                while acima >= 0 and tabuleiro[acima][coluna] == -1:
                    acima = acima - 1
                if acima >= 0:
                    tabuleiro[linha][coluna] = tabuleiro[acima][coluna]
                    tabuleiro[acima][coluna] = -1
        for linha in range(LINHAS):
            if tabuleiro[linha][coluna] == -1:
                tabuleiro[linha][coluna] = random.randint(0, CORES - 1)
    clock.schedule(tirar_trios, 0.25)


def draw():
    screen.blit('fundo', (0, 0))
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            cor = tabuleiro[linha][coluna]
            if cor != -1:
                screen.blit('joia' + str(cor), (X0 + coluna * TAMANHO, Y0 + linha * TAMANHO))
    caixa = Rect((X0 + coluna_escolhida * TAMANHO, Y0 + linha_escolhida * TAMANHO), (TAMANHO * 2, TAMANHO))
    screen.draw.rect(caixa, 'white')
    screen.draw.rect(Rect((caixa.x - 2, caixa.y - 2), (caixa.width + 4, caixa.height + 4)), 'white')
    screen.draw.text('Pontos: ' + str(pontos), topleft=(X0, 22), fontsize=32, color='white')
    screen.draw.text('Jogadas: ' + str(jogadas), topright=(WIDTH - X0, 22), fontsize=32, color='white')
    if aviso != '':
        screen.draw.text(aviso, center=(WIDTH / 2, 54), fontsize=26, color='yellow')
    if jogadas == 0 and not esperando:
        screen.draw.text('Fim! ' + str(pontos) + ' pontos', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Espaço joga de novo', center=(WIDTH / 2, HEIGHT / 2 + 50), fontsize=32, color='white', owidth=1.5, ocolor='black')


def on_key_down(key):
    global linha_escolhida, coluna_escolhida, jogadas, pontos, esperando
    if esperando:
        return
    if jogadas == 0:
        if key == keys.SPACE:
            pontos = 0
            jogadas = 20
            montar_tabuleiro()
        return
    if key == keys.LEFT and coluna_escolhida > 0:
        coluna_escolhida = coluna_escolhida - 1
    if key == keys.RIGHT and coluna_escolhida < COLUNAS - 2:
        coluna_escolhida = coluna_escolhida + 1
    if key == keys.UP and linha_escolhida > 0:
        linha_escolhida = linha_escolhida - 1
    if key == keys.DOWN and linha_escolhida < LINHAS - 1:
        linha_escolhida = linha_escolhida + 1
    if key == keys.SPACE:
        trocar()
        if achar_trios():
            jogadas = jogadas - 1
            esperando = True
            tirar_trios()
        else:
            # Sem trio, a troca não vale: as joias voltam ao lugar.
            trocar()
            sounds.erro.play()


montar_tabuleiro()
pgzrun.go()
