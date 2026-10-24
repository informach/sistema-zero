import math
import random
import pgzrun

WIDTH = 600
HEIGHT = 800
TITLE = 'Helicóptero Bombardeiro'
PEDACOS = 12

heli = Actor('heli0')
heli.pos = (300, 680)
chao_y = 0
quadros = 0
# A bomba se abre em 12 pedaços que voam em roda; depois de 30 quadros, explodem.
pedacos = []
idade_da_bomba = -1
tanques = []
explodindo = []
balas = []
direcoes_das_balas = []
vidas = 3
pontos = 0


def lugar_novo(tanque):
    tanque.pos = (random.randint(60, WIDTH - 60), random.randint(-400, -40))
    tanque.image = 'tanque'


def novo_jogo():
    global vidas, pontos, idade_da_bomba
    vidas = 3
    pontos = 0
    idade_da_bomba = -1
    pedacos.clear()
    balas.clear()
    direcoes_das_balas.clear()
    tanques.clear()
    explodindo.clear()
    for numero in range(4):
        tanque = Actor('tanque')
        lugar_novo(tanque)
        tanques.append(tanque)
        explodindo.append(0)
    heli.pos = (300, 680)


def soltar_bomba():
    global idade_da_bomba
    idade_da_bomba = 0
    pedacos.clear()
    for numero in range(PEDACOS):
        pedaco = Actor('pedaco')
        pedaco.pos = heli.pos
        pedacos.append(pedaco)
    sounds.bomba.play()


def mover_bomba():
    global idade_da_bomba, pontos
    if idade_da_bomba == -1:
        return
    idade_da_bomba = idade_da_bomba + 1
    for numero in range(PEDACOS):
        pedaco = pedacos[numero]
        if idade_da_bomba < 30:
            # Cada pedaço vai numa direção da roda: 360 graus divididos em 12.
            angulo = math.radians(numero * 360 / PEDACOS)
            pedaco.x = pedaco.x + 3 * math.cos(angulo)
            pedaco.y = pedaco.y + 3 * math.sin(angulo) - 2
        else:
            pedaco.image = 'explosao'
            for outro in range(len(tanques)):
                if explodindo[outro] == 0 and pedaco.colliderect(tanques[outro]):
                    explodindo[outro] = 1
                    pontos = pontos + 50
                    sounds.explode.play()
    if idade_da_bomba == 40:
        idade_da_bomba = -1
        pedacos.clear()


def mover_tanques():
    global vidas
    for numero in range(len(tanques)):
        tanque = tanques[numero]
        # Os tanques estão no chão: descem junto com ele.
        tanque.y = tanque.y + 1
        if explodindo[numero] > 0:
            explodindo[numero] = explodindo[numero] + 1
            tanque.image = 'tanque_explodindo'
            if explodindo[numero] > 40:
                explodindo[numero] = 0
                lugar_novo(tanque)
        elif tanque.top > HEIGHT:
            lugar_novo(tanque)
        elif 0 < tanque.y < 500 and random.randint(1, 150) == 1:
            atirar(tanque)


def atirar(tanque):
    bala = Actor('bala')
    bala.pos = tanque.pos
    angulo = math.atan2(heli.y - tanque.y, heli.x - tanque.x)
    balas.append(bala)
    direcoes_das_balas.append((4 * math.cos(angulo), 4 * math.sin(angulo)))


def draw():
    screen.blit('chao', (0, chao_y))
    screen.blit('chao', (0, chao_y - HEIGHT))
    for tanque in tanques:
        tanque.draw()
    for pedaco in pedacos:
        pedaco.draw()
    for bala in balas:
        bala.draw()
    if vidas > 0:
        heli.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 8), fontsize=30, color='white', owidth=1.5, ocolor='black')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 12, 8), fontsize=30, color='white', owidth=1.5, ocolor='black')
    if vidas == 0:
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 380), fontsize=60, color='orange', owidth=2, ocolor='black')
        screen.draw.text('Espaço recomeça', center=(WIDTH / 2, 430), fontsize=36, color='white', owidth=1.5, ocolor='black')


def update():
    global chao_y, quadros, vidas
    quadros = quadros + 1
    chao_y = (chao_y + 1) % HEIGHT
    if vidas == 0:
        return
    heli.image = 'heli' + str(quadros // 4 % 2)
    if keyboard.left and heli.left > 0:
        heli.x = heli.x - 4
    if keyboard.right and heli.right < WIDTH:
        heli.x = heli.x + 4
    if keyboard.up and heli.top > 40:
        heli.y = heli.y - 4
    if keyboard.down and heli.bottom < HEIGHT:
        heli.y = heli.y + 4
    mover_bomba()
    mover_tanques()
    for numero in range(len(balas) - 1, -1, -1):
        bala = balas[numero]
        bala.x = bala.x + direcoes_das_balas[numero][0]
        bala.y = bala.y + direcoes_das_balas[numero][1]
        if bala.colliderect(heli):
            balas.pop(numero)
            direcoes_das_balas.pop(numero)
            vidas = vidas - 1
            sounds.dano.play()
        elif bala.top > HEIGHT or bala.bottom < 0 or bala.right < 0 or bala.left > WIDTH:
            balas.pop(numero)
            direcoes_das_balas.pop(numero)


def on_key_down(key):
    if key != keys.SPACE:
        return
    if vidas == 0:
        novo_jogo()
    elif idade_da_bomba == -1:
        soltar_bomba()


novo_jogo()
pgzrun.go()
