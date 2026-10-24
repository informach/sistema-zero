import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Jardim Feliz'
VELOCIDADE = 5
TEMPO_DE_MURCHAR = 12
LIMITE_MURCHA = 10
MONSTRO_DEPOIS_DE = 25

vaca = Actor('vaca')
vaca.pos = (100, 500)
flores = []
prazos = []
monstros = []
velocidades = []
tempo = 0.0
fim_de_jogo = False
regando = False


def nova_flor():
    if fim_de_jogo:
        return
    flor = Actor('flor')
    flor.pos = (random.randint(60, WIDTH - 60), random.randint(420, HEIGHT - 40))
    flores.append(flor)
    prazos.append(tempo + TEMPO_DE_MURCHAR)


def novo_monstro():
    if fim_de_jogo or not flores:
        return
    numero = random.randint(0, len(flores) - 1)
    monstro = Actor('flor_monstro')
    monstro.pos = flores[numero].pos
    monstros.append(monstro)
    velocidades.append([random.choice([-3, 3]), random.choice([-3, 3])])


def parar_de_regar():
    global regando
    regando = False
    vaca.image = 'vaca'


def regar():
    global regando
    regando = True
    vaca.image = 'vaca_regando'
    clock.schedule(parar_de_regar, 0.5)
    for numero in range(len(flores)):
        if vaca.colliderect(flores[numero]):
            flores[numero].image = 'flor'
            prazos[numero] = tempo + TEMPO_DE_MURCHAR
            sounds.agua.play()


def draw():
    screen.blit('jardim', (0, 0))
    for flor in flores:
        flor.draw()
    for monstro in monstros:
        monstro.draw()
    vaca.draw()
    screen.draw.text('Tempo: ' + str(int(tempo)), topleft=(16, 12), fontsize=36, color='black')
    if fim_de_jogo:
        screen.draw.text('O jardim não está mais feliz!', center=(WIDTH / 2, 200), fontsize=56, color='red', owidth=2, ocolor='white')
        screen.draw.text('Você cuidou dele por ' + str(int(tempo)) + ' segundos', center=(WIDTH / 2, 270), fontsize=36, color='black')


def update(dt):
    global tempo, fim_de_jogo
    if fim_de_jogo:
        return
    tempo = tempo + dt
    if keyboard.left and vaca.left > 0:
        vaca.x = vaca.x - VELOCIDADE
    if keyboard.right and vaca.right < WIDTH:
        vaca.x = vaca.x + VELOCIDADE
    if keyboard.up and vaca.top > 360:
        vaca.y = vaca.y - VELOCIDADE
    if keyboard.down and vaca.bottom < HEIGHT:
        vaca.y = vaca.y + VELOCIDADE
    for numero in range(len(flores)):
        if tempo > prazos[numero]:
            flores[numero].image = 'flor_murcha'
            if tempo - prazos[numero] > LIMITE_MURCHA:
                fim_de_jogo = True
    for numero in range(len(monstros)):
        monstro = monstros[numero]
        velocidade = velocidades[numero]
        monstro.x = monstro.x + velocidade[0]
        monstro.y = monstro.y + velocidade[1]
        if monstro.left < 0 or monstro.right > WIDTH:
            velocidade[0] = -velocidade[0]
        if monstro.top < 360 or monstro.bottom > HEIGHT:
            velocidade[1] = -velocidade[1]
        if monstro.colliderect(vaca):
            fim_de_jogo = True
    if fim_de_jogo:
        sounds.fim.play()


def on_key_down(key):
    if key == keys.SPACE and not regando and not fim_de_jogo:
        regar()


nova_flor()
clock.schedule_interval(nova_flor, 4.0)
clock.schedule_interval(novo_monstro, MONSTRO_DEPOIS_DE)
pgzrun.go()
