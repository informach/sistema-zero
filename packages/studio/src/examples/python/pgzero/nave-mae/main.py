import random
import pgzrun

WIDTH = 600
HEIGHT = 800
TITLE = 'Nave-Mãe'
BLOCO = 20
# As fileiras de escudos amarelos: quantos blocos e a que altura, abaixo do piloto.
FILEIRAS = [(14, 65), (10, 85), (4, 105)]
CORES_DA_BARRA = [(150, 70, 200), (120, 55, 165), (90, 40, 125), (60, 25, 85)]
CORES_DO_ESCUDO = [(255, 214, 0), (230, 170, 0), (200, 120, 0), (150, 80, 0)]

mae = Actor('nave_mae')
piloto = Actor('piloto')
nave = Actor('nave')
tiro = Actor('tiro')
barra = []
escudos = []
lugares = []
bombas = []
giro = 0
quadros = 0
vidas = 3
venceu = False
chegou = False
ceu_y = 0


def novo_jogo():
    global vidas, venceu, giro, chegou
    vidas = 3
    venceu = False
    chegou = False
    giro = 0
    mae.pos = (300, 110)
    nave.pos = (300, 720)
    tiro.y = -20
    bombas.clear()
    # Cada bloco guarda quantos tiros já levou: no quarto ele some.
    barra.clear()
    for numero in range(14):
        barra.append(0)
    escudos.clear()
    lugares.clear()
    for quantidade, altura in FILEIRAS:
        for numero in range(quantidade):
            escudos.append(0)
            lugares.append(((numero - quantidade / 2) * BLOCO, altura))


def bloco_da_barra(numero):
    # A barra gira: cada bloco anda uma casa para a direita e o último volta para o começo.
    casa = (numero + giro) % 14
    return Rect((mae.x + (casa - 7) * BLOCO, mae.y + 35), (BLOCO, BLOCO))


def bloco_do_escudo(numero):
    x, altura = lugares[numero]
    return Rect((mae.x + x, mae.y + altura), (BLOCO, BLOCO))


def acertou_bloco():
    # Devolve True se o tiro bateu em algum bloco ainda inteiro (e o estraga).
    for numero in range(len(barra)):
        if barra[numero] < 4 and tiro.colliderect(bloco_da_barra(numero)):
            barra[numero] = barra[numero] + 1
            return True
    for numero in range(len(escudos)):
        if escudos[numero] < 4 and tiro.colliderect(bloco_do_escudo(numero)):
            escudos[numero] = escudos[numero] + 1
            return True
    return False


def soltar_bomba():
    if not venceu and vidas > 0:
        bomba = Actor('bomba')
        bomba.pos = (mae.x + random.randint(-140, 140), mae.bottom)
        bombas.append(bomba)


def draw():
    screen.blit('fundo', (0, 0))
    screen.blit('estrelas', (0, ceu_y))
    screen.blit('estrelas', (0, ceu_y - HEIGHT))
    mae.draw()
    if not venceu or quadros % 10 < 5:
        piloto.draw()
    for numero in range(len(barra)):
        if barra[numero] < 4:
            bloco = bloco_da_barra(numero)
            screen.draw.filled_rect(bloco, CORES_DA_BARRA[barra[numero]])
            if numero % 2 == 0:
                # Janelinhas em blocos alternados: é assim que se vê a barra girar.
                screen.draw.filled_circle(bloco.center, 4, (200, 230, 255))
    for numero in range(len(escudos)):
        if escudos[numero] < 4:
            screen.draw.filled_rect(bloco_do_escudo(numero), CORES_DO_ESCUDO[escudos[numero]])
    for bomba in bombas:
        bomba.draw()
    tiro.draw()
    if vidas > 0:
        nave.draw()
    screen.draw.text('Vidas: ' + str(vidas), topleft=(12, 8), fontsize=30, color='white')
    if venceu:
        screen.draw.text('Você venceu a Nave-Mãe!', center=(WIDTH / 2, 590), fontsize=48, color='yellow', owidth=2, ocolor='black')
    if vidas == 0 and chegou:
        screen.draw.text('A Nave-Mãe chegou!', center=(WIDTH / 2, 590), fontsize=52, color='orange', owidth=2, ocolor='black')
    elif vidas == 0:
        screen.draw.text('As bombas venceram!', center=(WIDTH / 2, 590), fontsize=52, color='orange', owidth=2, ocolor='black')
    if venceu or vidas == 0:
        screen.draw.text('Clique para jogar de novo', center=(WIDTH / 2, 640), fontsize=32, color='white')


def parte_de_baixo():
    # O ponto mais baixo da Nave-Mãe: o fundo dela ou o escudo inteiro mais baixo.
    baixo = mae.bottom
    for numero in range(len(escudos)):
        if escudos[numero] < 4:
            baixo = max(baixo, bloco_do_escudo(numero).bottom)
    return baixo


def update():
    global giro, quadros, vidas, venceu, ceu_y, chegou
    quadros = quadros + 1
    ceu_y = (ceu_y + 0.4) % HEIGHT
    if venceu or vidas == 0:
        return
    mae.y = mae.y + 0.1
    piloto.pos = (mae.x, mae.y + 5)
    if quadros % 10 == 0:
        giro = giro + 1
    if tiro.y > -20:
        tiro.y = tiro.y - 8
        if acertou_bloco():
            tiro.y = -20
        elif piloto.colliderect(tiro):
            venceu = True
            tiro.y = -20
            sounds.vitoria.play()
    for bomba in list(bombas):
        bomba.y = bomba.y + 4
        if bomba.top > HEIGHT:
            bombas.remove(bomba)
        elif bomba.colliderect(nave) and vidas > 0:
            bombas.remove(bomba)
            vidas = vidas - 1
            sounds.dano.play()
    if parte_de_baixo() > nave.top:
        vidas = 0
        chegou = True
        sounds.dano.play()


def on_mouse_move(pos):
    nave.x = min(max(pos[0], 30), WIDTH - 30)


def on_mouse_down(pos):
    if venceu or vidas == 0:
        novo_jogo()
    elif tiro.y <= -20:
        tiro.midbottom = nave.midtop
        sounds.tiro.play()


novo_jogo()
clock.schedule_interval(soltar_bomba, 1.2)
pgzrun.go()
