import math
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Cauda Espacial'
# A cauda: cada gomo fica a SEGMENTO pixels do anterior; só o ângulo entre eles muda.
GOMOS = 12
SEGMENTO = 26
ANGULO_BASE = math.radians(200)
BALANCO = 0.55
FASE = 0.45
RAPIDEZ = 3.0

monstro = Actor('monstro')
monstro.pos = (660, 300)
olho = Actor('olho_fechado')
gomos = []
for numero in range(GOMOS):
    gomos.append(Actor('gomo'))
gomos.append(Actor('ferrao'))
nave = Actor('nave')
tiros = []
tempo = 0
vida_do_monstro = 15
vidas = 3
protegida = 0


def posicionar_cauda():
    # Começa embaixo do monstro e vai encadeando: cada gomo parte de onde o outro está.
    x = monstro.x - 40
    y = monstro.y + 70
    for numero in range(len(gomos)):
        gomos[numero].pos = (x, y)
        angulo = ANGULO_BASE + BALANCO * math.sin(numero * FASE - tempo * RAPIDEZ)
        x = x + SEGMENTO * math.cos(angulo)
        y = y - SEGMENTO * math.sin(angulo)


def corpo():
    # O desenho do monstro tem uma sobra transparente na frente da cara: o corpo de verdade
    # é este retângulo, que começa logo atrás do olho.
    return Rect((monstro.x - 40, monstro.top + 30), (130, monstro.height - 60))


def olho_aberto():
    # O olho fica aberto um segundo e meio a cada três: é só aí que o tiro machuca.
    return tempo % 3 < 1.5


def novo_jogo():
    global vida_do_monstro, vidas, protegida, tempo
    vida_do_monstro = 15
    vidas = 3
    protegida = 60
    tempo = 0
    tiros.clear()
    nave.pos = (100, 300)


def draw():
    screen.blit('fundo', (0, 0))
    for gomo in gomos:
        gomo.draw()
    if vida_do_monstro > 0:
        monstro.draw()
        olho.draw()
    for tiro in tiros:
        tiro.draw()
    if vidas > 0 and protegida // 6 % 2 == 0:
        nave.draw()
    screen.draw.text('Vidas: ' + str(vidas), topleft=(12, 8), fontsize=30, color='white')
    screen.draw.filled_rect(Rect((WIDTH - 220, 14), (vida_do_monstro * 13, 14)), (230, 60, 90))
    screen.draw.rect(Rect((WIDTH - 220, 14), (15 * 13, 14)), 'white')
    if vida_do_monstro == 0:
        screen.draw.text('Você venceu o monstro!', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='yellow')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, HEIGHT / 2), fontsize=48, color='orange')


def update(dt):
    global tempo, vida_do_monstro, vidas, protegida
    if vidas == 0 or vida_do_monstro == 0:
        return
    tempo = tempo + dt
    monstro.y = 300 + 120 * math.sin(tempo * 0.7)
    olho.pos = (monstro.x - 62, monstro.y - 10)
    if olho_aberto():
        olho.image = 'olho_aberto'
    else:
        olho.image = 'olho_fechado'
    posicionar_cauda()
    if keyboard.left and nave.left > 0:
        nave.x = nave.x - 4
    if keyboard.right and nave.right < 420:
        nave.x = nave.x + 4
    if keyboard.up and nave.top > 40:
        nave.y = nave.y - 4
    if keyboard.down and nave.bottom < HEIGHT:
        nave.y = nave.y + 4
    for tiro in list(tiros):
        tiro.x = tiro.x + 9
        if olho.colliderect(tiro):
            tiros.remove(tiro)
            if olho_aberto():
                vida_do_monstro = vida_do_monstro - 1
                if vida_do_monstro == 0:
                    sounds.vitoria.play()
                    return
                sounds.acerto.play()
            else:
                sounds.bloqueio.play()
        elif tiro.colliderect(corpo()) or tiro.left > WIDTH:
            tiros.remove(tiro)
    if protegida > 0:
        protegida = protegida - 1
        return
    for gomo in gomos:
        if gomo.distance_to(nave) < 26:
            vidas = vidas - 1
            protegida = 90
            sounds.dano.play()
            return
    if nave.colliderect(corpo()):
        vidas = vidas - 1
        protegida = 90
        sounds.dano.play()


def on_key_down(key):
    if key != keys.SPACE:
        return
    if vidas == 0 or vida_do_monstro == 0:
        novo_jogo()
    elif len(tiros) < 4:
        tiro = Actor('tiro')
        tiro.midleft = nave.midright
        tiros.append(tiro)
        sounds.tiro.play()


novo_jogo()
pgzrun.go()
