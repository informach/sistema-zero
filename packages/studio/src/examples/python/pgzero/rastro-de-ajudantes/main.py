import math
import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Rastro de Ajudantes'
DISTANCIA = 15
MAXIMO = 4

nave = Actor('nave')
nave.pos = (150, 300)
# Os lugares por onde a nave passou, do mais novo para o mais antigo.
rastro = []
ajudantes = []
tiros = []
inimigos = []
alturas = []
capsula = Actor('capsula')
capsula.pos = (-100, -100)
ceu_x = 0
vidas = 3
pontos = 0
quadros = 0


def guardar_lugar():
    # Só guarda quando a nave se mexe: parada, os ajudantes também param.
    if not rastro or rastro[0] != nave.pos:
        rastro.insert(0, nave.pos)
    while len(rastro) > DISTANCIA * MAXIMO + 1:
        rastro.pop()


def posicionar_ajudantes():
    for numero in range(len(ajudantes)):
        atras = (numero + 1) * DISTANCIA
        if atras < len(rastro):
            ajudantes[numero].pos = rastro[atras]
        else:
            ajudantes[numero].pos = rastro[-1]


def novo_inimigo():
    if vidas > 0:
        inimigo = Actor('drone')
        altura = random.randint(80, HEIGHT - 80)
        inimigo.pos = (WIDTH + 30, altura)
        inimigos.append(inimigo)
        alturas.append(altura)


def soltar_capsula():
    if capsula.x < 0 and len(ajudantes) < MAXIMO:
        capsula.pos = (WIDTH + 20, random.randint(80, HEIGHT - 80))


def atirar():
    for atirador in [nave] + ajudantes:
        tiro = Actor('tiro')
        tiro.midleft = atirador.midright
        tiros.append(tiro)
    sounds.tiro.play()


def novo_jogo():
    global vidas, pontos
    vidas = 3
    pontos = 0
    nave.pos = (150, 300)
    rastro.clear()
    ajudantes.clear()
    ajudantes.append(Actor('ajudante'))
    tiros.clear()
    inimigos.clear()
    alturas.clear()
    capsula.pos = (-100, -100)


def draw():
    screen.blit('fundo', (ceu_x, 0))
    screen.blit('fundo', (ceu_x + WIDTH, 0))
    capsula.draw()
    for inimigo in inimigos:
        inimigo.draw()
    for tiro in tiros:
        tiro.draw()
    for ajudante in ajudantes:
        ajudante.draw()
    if vidas > 0:
        nave.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 8), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas) + '   Ajudantes: ' + str(len(ajudantes)), topright=(WIDTH - 12, 8), fontsize=30, color='white')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, HEIGHT / 2), fontsize=48, color='orange')


def update():
    global ceu_x, vidas, pontos, quadros
    quadros = quadros + 1
    ceu_x = ceu_x - 1
    if ceu_x <= -WIDTH:
        ceu_x = 0
    if vidas == 0:
        return
    if keyboard.left and nave.left > 0:
        nave.x = nave.x - 4
    if keyboard.right and nave.right < WIDTH:
        nave.x = nave.x + 4
    if keyboard.up and nave.top > 40:
        nave.y = nave.y - 4
    if keyboard.down and nave.bottom < HEIGHT:
        nave.y = nave.y + 4
    guardar_lugar()
    posicionar_ajudantes()
    capsula.x = capsula.x - 2
    if nave.colliderect(capsula):
        capsula.pos = (-100, -100)
        ajudantes.append(Actor('ajudante'))
        sounds.capsula.play()
    for tiro in list(tiros):
        tiro.x = tiro.x + 10
        if tiro.left > WIDTH:
            tiros.remove(tiro)
    for numero in range(len(inimigos) - 1, -1, -1):
        inimigo = inimigos[numero]
        # Os drones vêm ondulando: a altura segue uma curva de seno.
        inimigo.x = inimigo.x - 3
        inimigo.y = alturas[numero] + 50 * math.sin((inimigo.x + quadros) / 40)
        acertou = False
        for tiro in list(tiros):
            if inimigo.colliderect(tiro):
                tiros.remove(tiro)
                acertou = True
                break
        if acertou:
            inimigos.pop(numero)
            alturas.pop(numero)
            pontos = pontos + 10
            sounds.acerto.play()
        elif inimigo.colliderect(nave):
            inimigos.pop(numero)
            alturas.pop(numero)
            vidas = vidas - 1
            sounds.dano.play()
        elif inimigo.right < 0:
            inimigos.pop(numero)
            alturas.pop(numero)


def on_key_down(key):
    if key != keys.SPACE:
        return
    if vidas == 0:
        novo_jogo()
    else:
        atirar()


novo_jogo()
clock.schedule_interval(novo_inimigo, 0.8)
clock.schedule_interval(soltar_capsula, 6)
pgzrun.go()
