import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Bússola Maluca'
ARQUIVO_DE_RECORDE = 'recorde.txt'
VELOCIDADE = 5
BORDA = 60
PONTOS_POR_NIVEL = 10
TEMPO_INICIAL = 10
TEMPO_MINIMO = 4
DESCONTO_POR_PONTO = 0.6

# Para onde a agulha da bússola aponta em cada direção (o ator gira em graus).
ANGULO_DA_AGULHA = {'NORTE': 0, 'OESTE': 90, 'SUL': 180, 'LESTE': 270}
# As pedras ficam longe das bordas e das linhas do meio da tela.
LUGARES_DAS_PEDRAS = [(200, 170), (600, 430), (180, 440), (620, 160), (300, 200),
                      (500, 400), (250, 380), (560, 220), (150, 200), (660, 380)]

explorador = Actor('explorador_baixo_1')
bussola = Actor('bussola')
bussola.pos = (400, 60)
agulha = Actor('agulha')
agulha.pos = (400, 60)
pedras = []

estado = 'inicio'
direcao = 'NORTE'
olhando = 'baixo'
passos = 0
pontos = 0
nivel = 1
tempo = TEMPO_INICIAL
recorde = 0


def ler_recorde():
    global recorde
    try:
        with open(ARQUIVO_DE_RECORDE, 'r') as arquivo:
            recorde = int(arquivo.read())
    except (OSError, ValueError):
        recorde = 0


def salvar_recorde():
    global recorde
    if pontos > recorde:
        recorde = pontos
        try:
            with open(ARQUIVO_DE_RECORDE, 'w') as arquivo:
                arquivo.write(str(recorde))
        except OSError:
            print('Não consegui guardar o recorde.')


def nova_direcao():
    # Sorteia uma direção nova, de uma borda onde o explorador ainda não está.
    global direcao
    escolhas = []
    for lado in ['NORTE', 'SUL', 'LESTE', 'OESTE']:
        if lado != direcao and not chegou(lado):
            escolhas.append(lado)
    direcao = random.choice(escolhas)
    agulha.angle = ANGULO_DA_AGULHA[direcao]


def colocar_pedras():
    # Uma pedra a mais em cada nível, até acabarem os lugares; nunca em cima do explorador.
    pedras.clear()
    for lugar in LUGARES_DAS_PEDRAS[:nivel - 1]:
        pedra = Actor('pedra', lugar)
        if not pedra.colliderect(explorador):
            pedras.append(pedra)


def comecar():
    global estado, pontos, nivel, tempo
    estado = 'jogando'
    pontos = 0
    nivel = 1
    tempo = TEMPO_INICIAL
    explorador.pos = (400, 300)
    colocar_pedras()
    nova_direcao()


def chegou(lado):
    if lado == 'NORTE':
        return explorador.top < BORDA
    if lado == 'SUL':
        return explorador.bottom > HEIGHT - BORDA
    if lado == 'LESTE':
        return explorador.right > WIDTH - BORDA
    return explorador.left < BORDA


def andar():
    # As setas andam; a última apertada escolhe para onde o explorador olha.
    global olhando, passos
    andou = False
    if keyboard.up:
        explorador.y = explorador.y - VELOCIDADE
        olhando = 'cima'
        andou = True
    if keyboard.down:
        explorador.y = explorador.y + VELOCIDADE
        olhando = 'baixo'
        andou = True
    if keyboard.left:
        explorador.x = explorador.x - VELOCIDADE
        olhando = 'esquerda'
        andou = True
    if keyboard.right:
        explorador.x = explorador.x + VELOCIDADE
        olhando = 'direita'
        andou = True
    explorador.x = min(max(explorador.x, 20), WIDTH - 20)
    explorador.y = min(max(explorador.y, 30), HEIGHT - 30)
    if andou:
        passos = passos + 1
    explorador.image = 'explorador_' + olhando + '_' + str(passos // 8 % 2 + 1)


def marcar_ponto():
    global pontos, nivel, tempo
    pontos = pontos + 1
    sounds.ponto.play()
    pontos_no_nivel = pontos % max(PONTOS_POR_NIVEL, 1)
    if pontos_no_nivel == 0:
        nivel = nivel + 1
        colocar_pedras()
    # Cada ponto do nível tira um pouco do tempo para a próxima borda; o nível novo devolve.
    tempo = max(TEMPO_MINIMO, TEMPO_INICIAL - pontos_no_nivel * DESCONTO_POR_PONTO)
    nova_direcao()


def acabar():
    global estado
    estado = 'fim'
    sounds.fim.play()
    salvar_recorde()


def update(dt):
    global tempo
    if estado != 'jogando':
        return
    andar()
    tempo = tempo - dt
    if tempo <= 0:
        acabar()
        return
    if chegou(direcao):
        marcar_ponto()
    for pedra in pedras:
        if explorador.colliderect(pedra):
            acabar()
            return


def on_key_down(key):
    if key == keys.SPACE and estado != 'jogando':
        comecar()


def draw():
    screen.blit('fundo', (0, 0))
    for pedra in pedras:
        pedra.draw()
    if estado == 'inicio':
        screen.draw.text('Bússola Maluca', center=(400, 220), fontsize=72, color='white', owidth=2, ocolor='black')
        screen.draw.text('Corra até a borda que a bússola mostra', center=(400, 300), fontsize=36, color='white', owidth=1, ocolor='black')
        screen.draw.text('Recorde: ' + str(recorde) + '   Espaço começa', center=(400, 360), fontsize=36, color='yellow', owidth=1, ocolor='black')
        return
    bussola.draw()
    agulha.draw()
    screen.draw.text(direcao, center=(400, 120), fontsize=40, color='white', owidth=2, ocolor='black')
    # O explorador por último: ele passa por cima da bússola na borda de cima.
    explorador.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(20, 20), fontsize=36, color='white', owidth=1, ocolor='black')
    segundos = 0
    if estado == 'jogando':
        segundos = int(tempo) + 1
    screen.draw.text('Tempo: ' + str(segundos), topright=(780, 20), fontsize=36, color='white', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(400, 260), fontsize=72, color='orange', owidth=2, ocolor='black')
        screen.draw.text('Pontos: ' + str(pontos) + '   Recorde: ' + str(recorde), center=(400, 330), fontsize=40, color='white', owidth=1, ocolor='black')
        screen.draw.text('Espaço joga de novo', center=(400, 380), fontsize=36, color='white', owidth=1, ocolor='black')


ler_recorde()
pgzrun.go()
