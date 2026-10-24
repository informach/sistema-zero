import random
import pgzrun

WIDTH = 600
HEIGHT = 800
TITLE = 'Quebra-Tijolos'
MARGEM = 50
COLUNAS = 10
LINHAS = 6
LARGURA_DO_TIJOLO = (WIDTH - 2 * MARGEM) // COLUNAS
ALTURA_DO_TIJOLO = 24
TOPO = 100
# Uma cor para cada fileira, de cima para baixo. A de cima vale mais.
CORES = [(229, 57, 53), (251, 140, 0), (253, 216, 53), (67, 160, 71), (30, 136, 229), (142, 36, 170)]
# A cada quadro a bola anda em 3 passinhos, para não atravessar um tijolo.
PASSOS = 3

tijolos = []
raquete = Rect((WIDTH / 2 - 45, HEIGHT - 60), (90, 14))
bola = Actor('bola')
vx = 0
vy = 0
vidas = 3
pontos = 0
fase = 1
# 'esperando' (a bola em cima da raquete), 'jogando' ou 'fim'
estado = 'esperando'


def montar_tijolos():
    tijolos.clear()
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            tijolo = Rect((MARGEM + coluna * LARGURA_DO_TIJOLO, TOPO + linha * ALTURA_DO_TIJOLO), (LARGURA_DO_TIJOLO - 2, ALTURA_DO_TIJOLO - 2))
            tijolos.append(tijolo)


def fileira_de(tijolo):
    # A fileira sai da altura do tijolo: 0 é a de cima.
    return int((tijolo.y - TOPO) // ALTURA_DO_TIJOLO)


def novo_jogo():
    global vidas, pontos, fase
    vidas = 3
    pontos = 0
    fase = 1
    montar_tijolos()
    preparar_bola()


def preparar_bola():
    global estado
    estado = 'esperando'
    bola.midbottom = raquete.midtop


def lancar():
    global vx, vy, estado
    # A cada fase a bola fica mais rápida.
    vx = random.choice([-3, 3])
    vy = -(4 + fase)
    estado = 'jogando'


def andar_um_passo():
    global vx, vy, vidas, pontos, estado
    bola.x = bola.x + vx / PASSOS
    bola.y = bola.y + vy / PASSOS
    # As paredes dos lados e o teto.
    if bola.left < 0:
        bola.left = 0
        vx = abs(vx)
    if bola.right > WIDTH:
        bola.right = WIDTH
        vx = -abs(vx)
    if bola.top < 0:
        bola.top = 0
        vy = abs(vy)
    # A raquete: o lugar em que a bola bate decide para que lado ela vai.
    if vy > 0 and bola.colliderect(raquete):
        bola.bottom = raquete.top
        vy = -abs(vy)
        vx = (bola.centerx - raquete.centerx) / 6
        sounds.raquete.play()
    # Um tijolo por passinho: o lado em que a bola entrou menos é o lado da batida.
    for tijolo in tijolos:
        if bola.colliderect(tijolo):
            por_cima = min(bola.bottom - tijolo.top, tijolo.bottom - bola.top)
            pelo_lado = min(bola.right - tijolo.left, tijolo.right - bola.left)
            if por_cima < pelo_lado:
                vy = -vy
            else:
                vx = -vx
            tijolos.remove(tijolo)
            pontos = pontos + 10 * (LINHAS - fileira_de(tijolo))
            sounds.tijolo.play()
            break
    if bola.top > HEIGHT:
        vidas = vidas - 1
        sounds.perdeu.play()
        if vidas == 0:
            estado = 'fim'
        else:
            preparar_bola()


def update():
    global fase
    if keyboard.left and raquete.left > 0:
        raquete.x = raquete.x - 8
    if keyboard.right and raquete.right < WIDTH:
        raquete.x = raquete.x + 8
    if estado == 'esperando':
        bola.midbottom = raquete.midtop
    if estado == 'jogando':
        for passo in range(PASSOS):
            andar_um_passo()
            if estado != 'jogando':
                break
        if not tijolos:
            # Parede inteira derrubada: outra parede, com a bola mais rápida.
            fase = fase + 1
            sounds.fase.play()
            montar_tijolos()
            preparar_bola()


def draw():
    screen.fill((16, 20, 40))
    for tijolo in tijolos:
        screen.draw.filled_rect(tijolo, CORES[fileira_de(tijolo)])
    screen.draw.filled_rect(raquete, (236, 239, 241))
    bola.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 12), fontsize=32, color='white')
    screen.draw.text('Fase ' + str(fase), midtop=(WIDTH / 2, 12), fontsize=32, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 12, 12), fontsize=32, color='white')
    if estado == 'esperando':
        screen.draw.text('Clique ou aperte espaço para lançar', center=(WIDTH / 2, 500), fontsize=32, color='yellow')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 450), fontsize=64, color='orange')
        screen.draw.text('Clique ou aperte espaço para jogar de novo', center=(WIDTH / 2, 510), fontsize=30, color='white')


def on_mouse_move(pos):
    # A raquete segue o mouse, sem sair da tela.
    raquete.centerx = min(max(pos[0], raquete.width / 2), WIDTH - raquete.width / 2)


def comecar():
    if estado == 'esperando':
        lancar()
    elif estado == 'fim':
        novo_jogo()


def on_mouse_down():
    comecar()


def on_key_down(key):
    if key == keys.SPACE:
        comecar()


novo_jogo()
pgzrun.go()
