import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Cavando por Gemas'
TAMANHO = 40
TOPO = 40
TEMPO_TOTAL = 150

# A caverna, linha por linha. Cada letra vira uma coisa da grade:
# # parede   . terra   o pedra   * gema   M minerador   S saída   (espaço) vazio
CAVERNA = [
    '####################',
    '#M..o...*..o....*..#',
    '#...o..ooo....o....#',
    '#.*......*..#####..#',
    '#..o.....o.........#',
    '#####.######..o..*.#',
    '#.*...o.....o......#',
    '#..o..........o..o.#',
    '#..*..ooo...*......#',
    '#.......o..#####...#',
    '#..o..*....o.......#',
    '#.......o.....o....#',
    '#..o..........*...S#',
    '####################',
]
NOMES = {
    '#': 'parede',
    '.': 'terra',
    'o': 'pedra',
    '*': 'gema',
    'M': 'minerador',
    'S': 'saida',
    ' ': 'vazio',
}

grade = []
minerador = Actor('minerador_frente')
heroi_linha = 0
heroi_coluna = 0
gemas = 0
gemas_total = 0
tempo = TEMPO_TOTAL
# 'jogando', 'amassado', 'sem_tempo' ou 'venceu'
estado = 'jogando'
# A última seta apertada: um toque rápido também anda uma casa.
pedido = ''


def novo_jogo():
    global heroi_linha, heroi_coluna, gemas, gemas_total, tempo, estado, pedido
    grade.clear()
    gemas = 0
    gemas_total = 0
    for numero in range(len(CAVERNA)):
        linha = []
        for coluna in range(len(CAVERNA[numero])):
            letra = CAVERNA[numero][coluna]
            linha.append(NOMES[letra])
            if letra == '*':
                gemas_total = gemas_total + 1
            if letra == 'M':
                heroi_linha = numero
                heroi_coluna = coluna
        grade.append(linha)
    tempo = TEMPO_TOTAL
    estado = 'jogando'
    pedido = ''
    minerador.image = 'minerador_frente'
    posicionar()


def posicionar():
    minerador.topleft = (heroi_coluna * TAMANHO, TOPO + heroi_linha * TAMANHO)


def abrir_saida():
    for linha in grade:
        for coluna in range(len(linha)):
            if linha[coluna] == 'saida':
                linha[coluna] = 'saida_aberta'
    sounds.abriu.play()


def mover_minerador(mais_linha, mais_coluna):
    global heroi_linha, heroi_coluna, gemas, estado
    destino = grade[heroi_linha + mais_linha][heroi_coluna + mais_coluna]
    if destino in ('terra', 'vazio', 'gema', 'saida_aberta'):
        if destino == 'gema':
            gemas = gemas + 1
            sounds.gema.play()
            if gemas == gemas_total:
                abrir_saida()
        if destino == 'saida_aberta':
            estado = 'venceu'
            sounds.vitoria.play()
        grade[heroi_linha][heroi_coluna] = 'vazio'
        heroi_linha = heroi_linha + mais_linha
        heroi_coluna = heroi_coluna + mais_coluna
        grade[heroi_linha][heroi_coluna] = 'minerador'
    elif destino == 'pedra' and mais_linha == 0:
        # Empurrar: a pedra só anda de lado, e só se do outro lado estiver vazio.
        depois = heroi_coluna + 2 * mais_coluna
        if grade[heroi_linha][depois] == 'vazio':
            grade[heroi_linha][depois] = 'pedra'
            grade[heroi_linha][heroi_coluna] = 'vazio'
            heroi_coluna = heroi_coluna + mais_coluna
            grade[heroi_linha][heroi_coluna] = 'minerador'
    posicionar()


def cair_pedras():
    global estado
    # De baixo para cima: assim uma pedra que acabou de cair não é olhada de novo.
    for lin in range(len(grade) - 2, 0, -1):
        for col in range(1, len(grade[lin]) - 1):
            pedra = grade[lin][col]
            if pedra != 'pedra' and pedra != 'pedra_caindo':
                continue
            embaixo = grade[lin + 1][col]
            if embaixo == 'vazio':
                grade[lin][col] = 'vazio'
                grade[lin + 1][col] = 'pedra_caindo'
            elif embaixo == 'minerador' and pedra == 'pedra_caindo':
                # Só a pedra que está CAINDO machuca; parada, ela fica apoiada no minerador.
                estado = 'amassado'
                sounds.amassou.play()
            elif embaixo == 'pedra' or embaixo == 'gema':
                # Em cima de uma pedra ou de uma gema redonda, ela rola para um lado livre.
                if grade[lin][col - 1] == 'vazio' and grade[lin + 1][col - 1] == 'vazio':
                    grade[lin][col] = 'vazio'
                    grade[lin + 1][col - 1] = 'pedra_caindo'
                elif grade[lin][col + 1] == 'vazio' and grade[lin + 1][col + 1] == 'vazio':
                    grade[lin][col] = 'vazio'
                    grade[lin + 1][col + 1] = 'pedra_caindo'
                else:
                    grade[lin][col] = 'pedra'
            else:
                grade[lin][col] = 'pedra'


def passo():
    global pedido
    if estado != 'jogando':
        return
    mais_linha = 0
    mais_coluna = 0
    if keyboard.left or pedido == 'esquerda':
        mais_coluna = -1
        minerador.image = 'minerador_esquerda'
    elif keyboard.right or pedido == 'direita':
        mais_coluna = 1
        minerador.image = 'minerador_direita'
    elif keyboard.up or pedido == 'cima':
        mais_linha = -1
        minerador.image = 'minerador_frente'
    elif keyboard.down or pedido == 'baixo':
        mais_linha = 1
        minerador.image = 'minerador_frente'
    pedido = ''
    if mais_linha != 0 or mais_coluna != 0:
        mover_minerador(mais_linha, mais_coluna)
    cair_pedras()


def contar_tempo():
    global tempo, estado
    if estado == 'jogando':
        tempo = tempo - 1
        if tempo == 0:
            estado = 'sem_tempo'
            sounds.amassou.play()


def draw():
    screen.blit('fundo', (0, 0))
    for lin in range(len(grade)):
        for col in range(len(grade[lin])):
            coisa = grade[lin][col]
            if coisa != 'vazio' and coisa != 'minerador':
                screen.blit(coisa, (col * TAMANHO, TOPO + lin * TAMANHO))
    if estado != 'amassado':
        minerador.draw()
    screen.draw.text('Gemas: ' + str(gemas) + ' de ' + str(gemas_total), topleft=(12, 6), fontsize=34, color='white')
    screen.draw.text('Tempo: ' + str(tempo), topright=(WIDTH - 12, 6), fontsize=34, color='white')
    if estado == 'jogando' and gemas == gemas_total:
        screen.draw.text('A saída abriu!', midtop=(WIDTH / 2, 6), fontsize=34, color='yellow')
    if estado == 'venceu':
        screen.draw.text('Você saiu com todas as gemas!', center=(WIDTH / 2, 280), fontsize=52, color='yellow', owidth=1, ocolor='black')
    if estado == 'amassado':
        screen.draw.text('Uma pedra caiu em você!', center=(WIDTH / 2, 280), fontsize=52, color='orange', owidth=1, ocolor='black')
    if estado == 'sem_tempo':
        screen.draw.text('O tempo acabou!', center=(WIDTH / 2, 280), fontsize=52, color='orange', owidth=1, ocolor='black')
    if estado != 'jogando':
        screen.draw.text('Espaço joga de novo', center=(WIDTH / 2, 330), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global pedido
    if estado != 'jogando':
        if key == keys.SPACE:
            novo_jogo()
        return
    if key == keys.LEFT:
        pedido = 'esquerda'
    elif key == keys.RIGHT:
        pedido = 'direita'
    elif key == keys.UP:
        pedido = 'cima'
    elif key == keys.DOWN:
        pedido = 'baixo'


novo_jogo()
clock.schedule_interval(passo, 0.12)
clock.schedule_interval(contar_tempo, 1)
pgzrun.go()
