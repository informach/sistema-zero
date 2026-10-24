import random
import time
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Mochila a Jato'
GRAVIDADE = 0.25
EMPURRAO = 0.5
BASE_DO_FOGUETE = 600

chao = Rect((0, 550), (WIDTH, 50))
# Entre uma plataforma e outra sobra bastante espaço para o astronauta passar voando.
plataformas = [chao, Rect((330, 380), (140, 16)), Rect((60, 230), (160, 16)), Rect((580, 230), (160, 16))]
astronauta = Actor('astro_d')
chama = Actor('chama')
partes = [Actor('foguete_base'), Actor('foguete_meio'), Actor('foguete_ponta')]
combustivel = Actor('combustivel')
meteoros = []
lados = []
laser = Actor('laser')
velocidade_y = 0
olhando = 'd'
# A próxima coisa a buscar: 1 e 2 são partes do foguete, 3 é o combustível.
proxima = 1
carregando = False
tanque = 0
decolando = False
vidas = 3
comeco = time.time()
segundos = 0


def no_chao_de(ator):
    # A plataforma onde o ator está pisando, ou None se ele está no ar.
    for plataforma in plataformas:
        if ator.right > plataforma.left and ator.left < plataforma.right:
            if plataforma.top - 2 <= ator.bottom <= plataforma.top + 8:
                return plataforma
    return None


def montar():
    global proxima, carregando, tanque, decolando, velocidade_y, comeco
    partes[0].midbottom = (BASE_DO_FOGUETE, chao.top)
    partes[1].midbottom = (400, 380)
    partes[2].midbottom = (140, 230)
    astronauta.midbottom = (300, chao.top)
    combustivel.pos = (-100, -100)
    proxima = 1
    carregando = False
    tanque = 0
    decolando = False
    velocidade_y = 0
    comeco = time.time()
    meteoros.clear()
    lados.clear()
    laser.x = -100


def item_da_vez():
    if proxima <= 2:
        return partes[proxima]
    return combustivel


def topo_do_foguete():
    # As partes empilham: a de cima encosta na de baixo.
    return partes[min(proxima, 3) - 1].top


def soltar_combustivel():
    combustivel.pos = (random.randint(80, WIDTH - 80), -20)


def mover_astronauta():
    global velocidade_y, olhando
    if keyboard.left and astronauta.left > 0:
        astronauta.x = astronauta.x - 3
        olhando = 'e'
    if keyboard.right and astronauta.right < WIDTH:
        astronauta.x = astronauta.x + 3
        olhando = 'd'
    astronauta.image = 'astro_' + olhando
    if keyboard.up:
        velocidade_y = velocidade_y - EMPURRAO
    velocidade_y = min(max(velocidade_y + GRAVIDADE, -4), 5)
    astronauta.y = astronauta.y + velocidade_y
    if astronauta.top < 30:
        astronauta.top = 30
        velocidade_y = 0
    for plataforma in plataformas:
        if astronauta.colliderect(plataforma):
            if velocidade_y > 0:
                astronauta.bottom = plataforma.top
            else:
                astronauta.top = plataforma.bottom
            velocidade_y = 0
    chama.midtop = astronauta.midbottom


def cair(ator):
    # Uma peça solta cai até uma plataforma (ou até o topo do foguete).
    if no_chao_de(ator) is None:
        ator.y = ator.y + 3


def carregar():
    global carregando, proxima, tanque
    item = item_da_vez()
    if not carregando and astronauta.colliderect(item):
        carregando = True
        sounds.pega.play()
    if carregando:
        item.midtop = astronauta.midbottom
        # Em cima do foguete, a peça desce e se encaixa.
        if abs(astronauta.x - BASE_DO_FOGUETE) < 12:
            carregando = False
            item.midbottom = (BASE_DO_FOGUETE, topo_do_foguete())
            sounds.encaixa.play()
            if proxima <= 2:
                proxima = proxima + 1
                if proxima == 3:
                    soltar_combustivel()
            else:
                tanque = tanque + 1
                combustivel.pos = (-100, -100)
                if tanque < 3:
                    soltar_combustivel()
    elif proxima == 3 and combustivel.x > 0:
        # A lata cai do céu (ela começa um pouco acima da tela) até pousar.
        cair(combustivel)


def novo_meteoro():
    if not decolando and vidas > 0:
        meteoro = Actor('meteoro')
        lado = random.choice([-1, 1])
        meteoro.pos = (WIDTH + 30 if lado == -1 else -30, random.randint(80, 520))
        meteoros.append(meteoro)
        lados.append(lado)


def perder_vida():
    global vidas, carregando, velocidade_y
    vidas = vidas - 1
    sounds.dano.play()
    if carregando:
        carregando = False
    astronauta.midbottom = (300, chao.top)
    velocidade_y = 0


def draw():
    screen.blit('fundo', (0, 0))
    for plataforma in plataformas[1:]:
        screen.draw.filled_rect(plataforma, (120, 200, 90))
    for parte in partes:
        parte.draw()
    combustivel.draw()
    for meteoro in meteoros:
        meteoro.draw()
    laser.draw()
    if not decolando and vidas > 0:
        if keyboard.up:
            chama.draw()
        astronauta.draw()
    screen.draw.text('Combustível: ' + str(tanque) + '/3', topleft=(12, 8), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas) + '   Tempo: ' + str(segundos) + ' s', topright=(WIDTH - 12, 8), fontsize=30, color='white')
    if tanque == 3 and not decolando:
        screen.draw.text('Foguete pronto: entre nele!', center=(WIDTH / 2, 60), fontsize=36, color='yellow')
    if decolando and partes[2].bottom < 0:
        screen.draw.text('Decolou em ' + str(segundos) + ' segundos!', center=(WIDTH / 2, HEIGHT / 2), fontsize=52, color='yellow')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, HEIGHT / 2), fontsize=48, color='orange')


def update():
    global decolando, segundos
    if vidas == 0:
        return
    if decolando:
        for parte in partes:
            parte.y = parte.y - 4
        return
    segundos = int(time.time() - comeco)
    mover_astronauta()
    carregar()
    for numero in range(len(meteoros) - 1, -1, -1):
        meteoro = meteoros[numero]
        meteoro.x = meteoro.x + 3 * lados[numero]
        if meteoro.colliderect(laser):
            meteoros.pop(numero)
            lados.pop(numero)
            laser.x = -100
            sounds.estouro.play()
        elif meteoro.colliderect(astronauta):
            meteoros.pop(numero)
            lados.pop(numero)
            perder_vida()
        elif meteoro.right < -40 or meteoro.left > WIDTH + 40:
            meteoros.pop(numero)
            lados.pop(numero)
    if laser.x > -100:
        laser.x = laser.x + 12 * laser.direcao
        if laser.right < 0 or laser.left > WIDTH:
            laser.x = -100
    if tanque == 3 and astronauta.colliderect(partes[0]):
        decolando = True
        sounds.decola.play()


def on_key_down(key):
    global vidas
    if key != keys.SPACE:
        return
    if vidas == 0 or (decolando and partes[2].bottom < 0):
        vidas = 3
        montar()
    elif laser.x <= -100:
        laser.direcao = 1 if olhando == 'd' else -1
        laser.pos = astronauta.pos
        sounds.laser.play()


montar()
clock.schedule_interval(novo_meteoro, 2.5)
pgzrun.go()
