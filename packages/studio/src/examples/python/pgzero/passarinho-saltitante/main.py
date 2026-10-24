import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Passarinho Saltitante'
CHAO = 540
GRAVIDADE = 0.2
# A velocidade que a batida de asas dá para cima.
BATIDA = -5
VELOCIDADE_DOS_CANOS = 2
# O espaço entre o cano de cima e o de baixo, e entre um par de canos e o seguinte.
VAO = 160
DISTANCIA = 300
LARGURA_DO_CANO = 64

passarinho = Actor('passarinho_baixo', (160, 300))
canos_de_cima = []
canos_de_baixo = []
vy = 0
pontos = 0
recorde = 0
# 'esperando' (até a primeira batida de asas), 'voando' ou 'caiu'
estado = 'esperando'


def criar_canos(x):
    altura = random.randint(80, CHAO - VAO - 80)
    canos_de_cima.append(Rect((x, 0), (LARGURA_DO_CANO, altura)))
    canos_de_baixo.append(Rect((x, altura + VAO), (LARGURA_DO_CANO, CHAO - altura - VAO)))


def recomecar():
    global vy, pontos, estado
    passarinho.pos = (160, 300)
    passarinho.image = 'passarinho_baixo'
    vy = 0
    pontos = 0
    canos_de_cima.clear()
    canos_de_baixo.clear()
    criar_canos(WIDTH)
    estado = 'esperando'


def bater_asas():
    global vy
    vy = BATIDA
    sounds.asa.play()


def cair():
    global estado, recorde
    estado = 'caiu'
    recorde = max(recorde, pontos)
    sounds.batida.play()


def update():
    global vy, pontos
    if estado != 'voando':
        return
    # Segurando o espaço, o passarinho bate as asas sempre que começa a cair.
    if keyboard.space and vy > 0:
        bater_asas()
    vy = vy + GRAVIDADE
    passarinho.y = passarinho.y + vy
    if vy < 0:
        passarinho.image = 'passarinho_cima'
    else:
        passarinho.image = 'passarinho_baixo'
    if passarinho.top < 0:
        passarinho.top = 0
        vy = 0
    for numero in range(len(canos_de_cima)):
        canos_de_cima[numero].x = canos_de_cima[numero].x - VELOCIDADE_DOS_CANOS
        canos_de_baixo[numero].x = canos_de_baixo[numero].x - VELOCIDADE_DOS_CANOS
        # Um ponto quando o par de canos acaba de passar pelo passarinho.
        direita = canos_de_cima[numero].right
        if direita < passarinho.x and direita >= passarinho.x - VELOCIDADE_DOS_CANOS:
            pontos = pontos + 1
            sounds.ponto.play()
    # O par que saiu da tela vai embora, e um novo par entra pela direita.
    if canos_de_cima[0].right < 0:
        canos_de_cima.pop(0)
        canos_de_baixo.pop(0)
    if canos_de_cima[-1].x < WIDTH - DISTANCIA:
        criar_canos(WIDTH)
    for numero in range(len(canos_de_cima)):
        if passarinho.colliderect(canos_de_cima[numero]) or passarinho.colliderect(canos_de_baixo[numero]):
            cair()
            return
    if passarinho.bottom > CHAO:
        passarinho.bottom = CHAO
        cair()


def draw():
    screen.blit('ceu', (0, 0))
    for numero in range(len(canos_de_cima)):
        de_cima = canos_de_cima[numero]
        de_baixo = canos_de_baixo[numero]
        # A imagem do cano é comprida: aparece só o pedaço que cabe em cada um.
        screen.blit('cano_de_cima', (de_cima.x, de_cima.bottom - 600))
        screen.blit('cano_de_baixo', (de_baixo.x, de_baixo.top))
    screen.blit('chao', (0, CHAO))
    passarinho.draw()
    screen.draw.text(str(pontos), center=(WIDTH / 2, 60), fontsize=80, color='white', owidth=1.5, ocolor='black')
    screen.draw.text('Recorde: ' + str(recorde), topright=(WIDTH - 16, 16), fontsize=30, color='white', owidth=1, ocolor='black')
    if estado == 'esperando':
        screen.draw.text('Espaço bate as asas', center=(WIDTH / 2, 420), fontsize=40, color='yellow', owidth=1, ocolor='black')
    if estado == 'caiu':
        screen.draw.text('Bateu!', center=(WIDTH / 2, 240), fontsize=72, color='orange', owidth=1, ocolor='black')
        screen.draw.text('Espaço tenta de novo', center=(WIDTH / 2, 300), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global estado
    if key != keys.SPACE:
        return
    if estado == 'esperando':
        estado = 'voando'
        bater_asas()
    elif estado == 'caiu':
        recomecar()


recomecar()
pgzrun.go()
