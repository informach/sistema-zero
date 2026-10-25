import math
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Cipó sobre o Poço'
CHAO = 470
POCO_COMECO = 260
POCO_FIM = 540
COMPRIMENTO = 260

# O cipó gira em volta do ponto de cima, preso no galho.
cipo = Actor('cipo', anchor=('center', 'top'))
cipo.pos = (400, 170)
balanco = 1
explorador = Actor('explorador')
explorador.midbottom = (80, CHAO)
tronco = Actor('tronco')
tronco.midbottom = (WIDTH + 40, CHAO)
tesouro = Actor('tesouro')
tesouro.midbottom = (730, CHAO)
pendurado = False
# Depois de soltar o cipó, só dá para agarrar de novo depois de pisar no chão.
pode_agarrar = True
pulo = 0
caindo = False
vidas = 3
pegou_tesouro = False


def ponta_do_cipo():
    # A ponta fica a COMPRIMENTO pixels do galho, na direção do ângulo.
    angulo = math.radians(cipo.angle)
    return (cipo.x + COMPRIMENTO * math.sin(angulo), cipo.y + COMPRIMENTO * math.cos(angulo))


def no_chao():
    if POCO_COMECO < explorador.x < POCO_FIM:
        return False
    return explorador.bottom >= CHAO


def balancar_cipo():
    global balanco
    if cipo.angle > 45:
        cipo.angle = 45
        balanco = -1
    if cipo.angle < -45:
        cipo.angle = -45
        balanco = 1
    # Mais rápido no meio, mais devagar nas pontas, como um balanço de verdade.
    passo = (7 - math.sqrt(abs(cipo.angle))) / 3
    cipo.angle = cipo.angle + balanco * passo


def recomecar():
    global pendurado, pulo, caindo, pode_agarrar
    explorador.midbottom = (80, CHAO)
    pendurado = False
    pode_agarrar = True
    pulo = 0
    caindo = False


def draw():
    screen.blit('fundo', (0, 0))
    cipo.draw()
    screen.blit('copas', (0, 0))
    tesouro.draw()
    tronco.draw()
    explorador.draw()
    screen.blit('chao', (0, CHAO - 5))
    screen.draw.text('Vidas: ' + str(vidas), topleft=(12, 10), fontsize=32, color='white', owidth=1.5, ocolor='black')
    if pegou_tesouro:
        screen.draw.text('Você pegou o tesouro!', center=(WIDTH / 2, 560), fontsize=44, color='yellow', owidth=2, ocolor='black')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, 560), fontsize=40, color='orange', owidth=2, ocolor='black')


def mover_explorador():
    global pulo, caindo
    if keyboard.right and (no_chao() or pulo > 0):
        explorador.x = explorador.x + 3
        explorador.image = 'explorador'
    if keyboard.left and (no_chao() or pulo > 0):
        explorador.x = explorador.x - 3
        explorador.image = 'explorador_esq'
    explorador.x = max(20, min(WIDTH - 20, explorador.x))
    if pulo > 0:
        explorador.y = explorador.y - 3
        pulo = pulo - 1
    elif not no_chao():
        explorador.y = explorador.y + 4
        if POCO_COMECO < explorador.x < POCO_FIM and explorador.bottom > CHAO:
            caindo = True
    if explorador.bottom > CHAO and not caindo:
        explorador.bottom = CHAO


def update():
    global pendurado, caindo, vidas, pegou_tesouro, pode_agarrar
    balancar_cipo()
    if vidas == 0 or pegou_tesouro:
        return
    tronco.x = tronco.x - 2
    tronco.angle = tronco.angle + 4
    if tronco.right < POCO_FIM:
        tronco.left = WIDTH
    if pendurado:
        explorador.midtop = ponta_do_cipo()
    else:
        mover_explorador()
        if no_chao():
            pode_agarrar = True
        if pode_agarrar and explorador.collidepoint(ponta_do_cipo()):
            pendurado = True
            explorador.midtop = ponta_do_cipo()
            sounds.agarra.play()
    if caindo and explorador.top > HEIGHT:
        vidas = vidas - 1
        sounds.queda.play()
        recomecar()
    # O tronco gira, e girar muda o tamanho do retângulo dele: a batida conta pela distância.
    if explorador.distance_to(tronco) < 30 and no_chao():
        vidas = vidas - 1
        sounds.queda.play()
        tronco.left = WIDTH
        recomecar()
    if explorador.colliderect(tesouro):
        pegou_tesouro = True
        sounds.tesouro.play()


def on_key_down(key):
    global pendurado, pulo, vidas, pegou_tesouro, pode_agarrar
    if key != keys.SPACE:
        return
    if vidas == 0 or pegou_tesouro:
        vidas = 3
        pegou_tesouro = False
        tronco.left = WIDTH
        recomecar()
    elif pendurado:
        pendurado = False
        pode_agarrar = False
        pulo = 12
    elif no_chao():
        pulo = 22
        sounds.pulo.play()


pgzrun.go()
