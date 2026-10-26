import pgzrun

WIDTH = 1000
HEIGHT = 600
TITLE = 'Editor de Cavernas'
TAMANHO = 40
TOPO = 40
LINHAS = 14
COLUNAS = 20
ARQUIVO = 'caverna.txt'

# Cada peça tem uma letra, que é como ela fica guardada no arquivo.
LETRAS = {
    'vazio': ' ',
    'terra': '.',
    'pedra': 'o',
    'gema': '*',
    'parede': '#',
    'minerador': 'M',
    'saida': 'S',
}
NOMES = {}
for nome in LETRAS:
    NOMES[LETRAS[nome]] = nome

# O painel da direita: uma peça embaixo da outra.
pecas = []
for numero, nome in enumerate(LETRAS):
    peca = Actor(nome)
    peca.center = (900, 110 + numero * 48)
    pecas.append(peca)
botao_guardar = Rect((820, 460), (160, 40))
botao_carregar = Rect((820, 510), (160, 40))

mapa = []
jogo = []
escolhida = 'pedra'
# 'editar' (desenhando a caverna) ou 'jogar' (testando)
modo = 'editar'
resultado = ''
aviso = 'Clique numa peça e depois no mapa.'
heroi_linha = 0
heroi_coluna = 0
gemas = 0
gemas_total = 0
pedido = ''


def mapa_inicial():
    # Parede em volta, terra por dentro, o minerador num canto e a saída no outro.
    mapa.clear()
    for linha in range(LINHAS):
        fileira = []
        for coluna in range(COLUNAS):
            if linha == 0 or linha == LINHAS - 1 or coluna == 0 or coluna == COLUNAS - 1:
                fileira.append('parede')
            else:
                fileira.append('terra')
        mapa.append(fileira)
    mapa[1][1] = 'minerador'
    mapa[LINHAS - 2][COLUNAS - 2] = 'saida'


def copiar(grade):
    nova = []
    for fileira in grade:
        nova.append(list(fileira))
    return nova


def pintar(pos):
    coluna = int(pos[0] // TAMANHO)
    linha = int((pos[1] - TOPO) // TAMANHO)
    # A borda fica sempre de parede, para ninguém sair da caverna.
    if 0 < linha < LINHAS - 1 and 0 < coluna < COLUNAS - 1:
        if escolhida == 'minerador':
            # Só existe um minerador: o antigo vira espaço vazio.
            for fileira in mapa:
                for numero in range(len(fileira)):
                    if fileira[numero] == 'minerador':
                        fileira[numero] = 'vazio'
        mapa[linha][coluna] = escolhida


def guardar_mapa():
    global aviso
    with open(ARQUIVO, 'w') as arquivo:
        for fileira in mapa:
            texto = ''
            for peca in fileira:
                texto = texto + LETRAS[peca]
            arquivo.write(texto + '\n')
    aviso = 'Caverna guardada!'
    sounds.guardou.play()


def carregar_mapa():
    global aviso
    linhas = []
    try:
        with open(ARQUIVO, 'r') as arquivo:
            # Uma linha do arquivo para cada fileira da caverna.
            for texto in arquivo:
                linhas.append(texto)
    except OSError:
        aviso = 'Ainda não tem caverna guardada.'
        return
    mapa_inicial()
    for linha in range(1, LINHAS - 1):
        for coluna in range(1, COLUNAS - 1):
            if linha < len(linhas) and coluna < len(linhas[linha]) and linhas[linha][coluna] in NOMES:
                mapa[linha][coluna] = NOMES[linhas[linha][coluna]]
    aviso = 'Caverna carregada!'
    sounds.guardou.play()


def comecar_jogo():
    global jogo, modo, resultado, aviso, heroi_linha, heroi_coluna, gemas, gemas_total, pedido
    achou = False
    gemas_total = 0
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            if mapa[linha][coluna] == 'minerador':
                heroi_linha = linha
                heroi_coluna = coluna
                achou = True
            if mapa[linha][coluna] == 'gema':
                gemas_total = gemas_total + 1
    if not achou:
        aviso = 'Ponha o minerador no mapa!'
        return
    # O teste usa uma cópia: voltando ao editor, o desenho está do jeito que era.
    jogo = copiar(mapa)
    gemas = 0
    pedido = ''
    resultado = ''
    modo = 'jogar'
    if gemas_total == 0:
        abrir_saida()


def abrir_saida():
    for fileira in jogo:
        for numero in range(len(fileira)):
            if fileira[numero] == 'saida':
                fileira[numero] = 'saida_aberta'


def mover_minerador(mais_linha, mais_coluna):
    global heroi_linha, heroi_coluna, gemas, resultado
    destino = jogo[heroi_linha + mais_linha][heroi_coluna + mais_coluna]
    if destino in ('terra', 'vazio', 'gema', 'saida_aberta'):
        if destino == 'gema':
            gemas = gemas + 1
            sounds.gema.play()
            if gemas == gemas_total:
                abrir_saida()
        if destino == 'saida_aberta':
            resultado = 'venceu'
            sounds.vitoria.play()
        jogo[heroi_linha][heroi_coluna] = 'vazio'
        heroi_linha = heroi_linha + mais_linha
        heroi_coluna = heroi_coluna + mais_coluna
        jogo[heroi_linha][heroi_coluna] = 'minerador'


def cair_pedras():
    global resultado
    # De baixo para cima, como no Cavando por Gemas.
    for lin in range(LINHAS - 2, 0, -1):
        for col in range(1, COLUNAS - 1):
            pedra = jogo[lin][col]
            if pedra != 'pedra' and pedra != 'pedra_caindo':
                continue
            embaixo = jogo[lin + 1][col]
            if embaixo == 'vazio':
                jogo[lin][col] = 'vazio'
                jogo[lin + 1][col] = 'pedra_caindo'
            elif embaixo == 'minerador' and pedra == 'pedra_caindo':
                resultado = 'amassado'
                sounds.amassou.play()
            elif embaixo == 'pedra' or embaixo == 'gema':
                if jogo[lin][col - 1] == 'vazio' and jogo[lin + 1][col - 1] == 'vazio':
                    jogo[lin][col] = 'vazio'
                    jogo[lin + 1][col - 1] = 'pedra_caindo'
                elif jogo[lin][col + 1] == 'vazio' and jogo[lin + 1][col + 1] == 'vazio':
                    jogo[lin][col] = 'vazio'
                    jogo[lin + 1][col + 1] = 'pedra_caindo'
                else:
                    jogo[lin][col] = 'pedra'
            else:
                jogo[lin][col] = 'pedra'


def passo():
    global pedido
    if modo != 'jogar' or resultado != '':
        return
    mais_linha = 0
    mais_coluna = 0
    if keyboard.left or pedido == 'esquerda':
        mais_coluna = -1
    elif keyboard.right or pedido == 'direita':
        mais_coluna = 1
    elif keyboard.up or pedido == 'cima':
        mais_linha = -1
    elif keyboard.down or pedido == 'baixo':
        mais_linha = 1
    pedido = ''
    if mais_linha != 0 or mais_coluna != 0:
        mover_minerador(mais_linha, mais_coluna)
    cair_pedras()


def draw():
    screen.fill((20, 14, 10))
    if modo == 'editar':
        grade = mapa
    else:
        grade = jogo
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            screen.blit(grade[linha][coluna], (coluna * TAMANHO, TOPO + linha * TAMANHO))
    desenhar_painel()
    if modo == 'editar':
        screen.draw.text(aviso, topleft=(12, 8), fontsize=30, color='white')
    else:
        texto = 'Gemas: ' + str(gemas) + ' de ' + str(gemas_total) + '    Espaço volta ao editor'
        screen.draw.text(texto, topleft=(12, 8), fontsize=30, color='white')
    if resultado == 'venceu':
        screen.draw.text('A caverna dá para vencer!', center=(400, 280), fontsize=52, color='yellow', owidth=1, ocolor='black')
    if resultado == 'amassado':
        screen.draw.text('Uma pedra caiu no minerador!', center=(400, 280), fontsize=48, color='orange', owidth=1, ocolor='black')


def desenhar_painel():
    screen.draw.filled_rect(Rect((800, 0), (200, HEIGHT)), (26, 35, 64))
    if modo == 'editar':
        screen.draw.text('EDITOR', center=(900, 30), fontsize=44, color='white')
    else:
        screen.draw.text('TESTANDO', center=(900, 30), fontsize=44, color='yellow')
    screen.draw.text('Espaço: testar', center=(900, 66), fontsize=24, color='lightblue')
    for peca in pecas:
        peca.draw()
        if peca.image == escolhida:
            # Uma moldura em volta da peça escolhida.
            screen.draw.rect(Rect((peca.left - 4, peca.top - 4), (peca.width + 8, peca.height + 8)), 'yellow')
    screen.draw.filled_rect(botao_guardar, (67, 160, 71))
    screen.draw.text('Guardar', center=botao_guardar.center, fontsize=32, color='white')
    screen.draw.filled_rect(botao_carregar, (30, 136, 229))
    screen.draw.text('Carregar', center=botao_carregar.center, fontsize=32, color='white')


def on_mouse_down(pos):
    global escolhida
    if modo != 'editar':
        return
    for peca in pecas:
        if peca.collidepoint(pos):
            escolhida = peca.image
            return
    if botao_guardar.collidepoint(pos):
        guardar_mapa()
    elif botao_carregar.collidepoint(pos):
        carregar_mapa()
    else:
        pintar(pos)


def on_mouse_move(pos, buttons):
    # Arrastando com o botão apertado, pinta várias casas de uma vez.
    if modo == 'editar' and mouse.LEFT in buttons:
        pintar(pos)


def on_key_down(key):
    global modo, pedido
    if key == keys.SPACE:
        if modo == 'editar':
            comecar_jogo()
        else:
            modo = 'editar'
        return
    if key == keys.LEFT:
        pedido = 'esquerda'
    elif key == keys.RIGHT:
        pedido = 'direita'
    elif key == keys.UP:
        pedido = 'cima'
    elif key == keys.DOWN:
        pedido = 'baixo'


mapa_inicial()
clock.schedule_interval(passo, 0.12)
pgzrun.go()
