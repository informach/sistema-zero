import math
import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Arena de Dois Comandos'
ARENA = Rect((60, 70), (680, 500))
VELOCIDADE = 4
VELOCIDADE_DA_BALA = 10
# Segundos entre um tiro e outro, segurando a tecla de mira.
INTERVALO_DOS_TIROS = 0.15

tanque = Actor('esteira')
torre = Actor('torre')
balas = []
robos = []
pessoas = []
onda = 1
pontos = 0
vidas = 3
espera_do_tiro = 0
# 'jogando' ou 'fim'
estado = 'jogando'


def longe_do_tanque():
    # Um lugar na arena a pelo menos 200 pixels do tanque.
    while True:
        x = random.randint(ARENA.left + 20, ARENA.right - 20)
        y = random.randint(ARENA.top + 20, ARENA.bottom - 20)
        if tanque.distance_to((x, y)) > 200:
            return (x, y)


def nova_onda():
    robos.clear()
    pessoas.clear()
    balas.clear()
    # A cada onda vêm mais robôs.
    for numero in range(4 + onda * 2):
        robo = Actor('robo', longe_do_tanque())
        robos.append(robo)
    for numero in range(3):
        pessoa = Actor('pessoa', longe_do_tanque())
        pessoa.vx = random.choice([-1, 1])
        pessoa.vy = random.choice([-1, 1])
        pessoas.append(pessoa)


def novo_jogo():
    global onda, pontos, vidas, estado
    onda = 1
    pontos = 0
    vidas = 3
    estado = 'jogando'
    tanque.pos = ARENA.center
    nova_onda()


def mover_tanque():
    dx = 0
    dy = 0
    if keyboard.left:
        dx = dx - 1
    if keyboard.right:
        dx = dx + 1
    if keyboard.up:
        dy = dy - 1
    if keyboard.down:
        dy = dy + 1
    tanque.x = min(max(tanque.x + dx * VELOCIDADE, ARENA.left + 20), ARENA.right - 20)
    tanque.y = min(max(tanque.y + dy * VELOCIDADE, ARENA.top + 20), ARENA.bottom - 20)
    torre.pos = tanque.pos


def mirar_e_atirar(dt):
    global espera_do_tiro
    # W, A, S e D apontam a torre; segurando, ela atira.
    mx = 0
    my = 0
    if keyboard.a:
        mx = mx - 1
    if keyboard.d:
        mx = mx + 1
    if keyboard.w:
        my = my - 1
    if keyboard.s:
        my = my + 1
    espera_do_tiro = espera_do_tiro - dt
    if mx == 0 and my == 0:
        return
    # atan2 transforma a direção em ângulo (a torre desenhada aponta para a direita).
    torre.angle = math.degrees(math.atan2(-my, mx))
    if espera_do_tiro <= 0:
        espera_do_tiro = INTERVALO_DOS_TIROS
        tamanho = math.hypot(mx, my)
        bala = Actor('bala', tanque.pos)
        bala.vx = mx / tamanho * VELOCIDADE_DA_BALA
        bala.vy = my / tamanho * VELOCIDADE_DA_BALA
        balas.append(bala)
        sounds.tiro.play()


def perder_vida():
    global vidas, estado
    vidas = vidas - 1
    sounds.dano.play()
    if vidas == 0:
        estado = 'fim'
    else:
        # Os robôs recuam para longe do tanque.
        for robo in robos:
            robo.pos = longe_do_tanque()


def update(dt):
    global pontos, onda
    if estado != 'jogando':
        return
    mover_tanque()
    mirar_e_atirar(dt)
    for bala in list(balas):
        bala.x = bala.x + bala.vx
        bala.y = bala.y + bala.vy
        if not ARENA.collidepoint(bala.pos):
            balas.remove(bala)
            continue
        for robo in list(robos):
            if bala.colliderect(robo):
                robos.remove(robo)
                if bala in balas:
                    balas.remove(bala)
                pontos = pontos + 50
                sounds.robo.play()
                break
    for robo in robos:
        # Cada robô anda direto para o tanque, mais rápido a cada onda.
        distancia = robo.distance_to(tanque)
        if distancia > 0:
            passo = 1 + onda * 0.25
            robo.x = robo.x + (tanque.x - robo.x) / distancia * passo
            robo.y = robo.y + (tanque.y - robo.y) / distancia * passo
        if robo.distance_to(tanque) < 26:
            perder_vida()
            return
    for pessoa in list(pessoas):
        pessoa.x = pessoa.x + pessoa.vx
        pessoa.y = pessoa.y + pessoa.vy
        if pessoa.left < ARENA.left or pessoa.right > ARENA.right:
            pessoa.vx = -pessoa.vx
        if pessoa.top < ARENA.top or pessoa.bottom > ARENA.bottom:
            pessoa.vy = -pessoa.vy
        if pessoa.distance_to(tanque) < 26:
            pessoas.remove(pessoa)
            pontos = pontos + 100
            sounds.resgate.play()
    if not robos:
        onda = onda + 1
        sounds.onda.play()
        nova_onda()


def draw():
    screen.blit('arena', (0, 0))
    for pessoa in pessoas:
        pessoa.draw()
    for robo in robos:
        robo.draw()
    for bala in balas:
        bala.draw()
    tanque.draw()
    torre.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 14), fontsize=34, color='white')
    screen.draw.text('Onda ' + str(onda), midtop=(WIDTH / 2, 14), fontsize=34, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 12, 14), fontsize=34, color='white')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 280), fontsize=64, color='orange', owidth=1, ocolor='black')
        screen.draw.text('Espaço joga de novo', center=(WIDTH / 2, 330), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    if estado == 'fim' and key == keys.SPACE:
        novo_jogo()


novo_jogo()
pgzrun.go()
