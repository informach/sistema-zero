import math
import random
import pgzrun

WIDTH = 600
HEIGHT = 800
TITLE = 'Mergulho Alienígena'

nave = Actor('nave')
tiro = Actor('tiro')
aliens = []
casas = []
estados = []
explosoes = []
lados = []
bombas = []
ceu_y = 0
quadros = 0
vidas = 3
pontos = 0


def montar_aliens():
    aliens.clear()
    casas.clear()
    estados.clear()
    explosoes.clear()
    lados.clear()
    for fila in range(2):
        for coluna in range(8):
            alien = Actor('alien0')
            casa = (125 + coluna * 50, 160 + fila * 50)
            alien.pos = casa
            aliens.append(alien)
            casas.append(casa)
            # 'fila' = na formação, 'mergulho' = descendo, 'explodindo' e 'fora' = acabou.
            estados.append('fila')
            explosoes.append(0)
            # A metade da esquerda mergulha para a esquerda, a da direita para a direita.
            lados.append(coluna // 4)


def novo_jogo():
    global vidas, pontos
    vidas = 3
    pontos = 0
    bombas.clear()
    montar_aliens()
    nave.pos = (300, 720)
    tiro.y = -20


def mergulhar(numero):
    # Faz uma curva: primeiro sobe um pouco virando, depois desce rápido em direção à nave.
    alien = aliens[numero]
    if lados[numero] == 0:
        if alien.angle < 180:
            alien.angle = alien.angle + 3
            alien.x = alien.x - 1.5
        else:
            alien.x = alien.x + (nave.x - alien.x) * 0.01
    else:
        if alien.angle > -180:
            alien.angle = alien.angle - 3
            alien.x = alien.x + 1.5
        else:
            alien.x = alien.x + (nave.x - alien.x) * 0.01
    if abs(alien.angle) < 90:
        alien.y = alien.y - 1
    else:
        alien.y = alien.y + 4
    if random.randint(1, 60) == 1:
        bomba = Actor('bomba')
        bomba.pos = alien.pos
        bombas.append(bomba)
    if alien.top > HEIGHT:
        # Saiu por baixo: volta para a sua casa na formação.
        estados[numero] = 'fila'
        alien.angle = 0


def mover_aliens():
    global pontos
    balanco = math.sin(quadros / 90) * 60
    for numero in range(len(aliens)):
        alien = aliens[numero]
        estado = estados[numero]
        if estado == 'fila':
            alien.x = casas[numero][0] + balanco
            alien.y = casas[numero][1]
            alien.image = 'alien' + str(quadros // 15 % 2)
            if random.randint(1, 900) == 1:
                estados[numero] = 'mergulho'
                sounds.mergulho.play()
        elif estado == 'mergulho':
            mergulhar(numero)
        elif estado == 'explodindo':
            # Três desenhos de explosão, seis quadros cada.
            alien.image = 'explosao' + str(explosoes[numero] // 6 + 1)
            explosoes[numero] = explosoes[numero] + 1
            if explosoes[numero] == 18:
                estados[numero] = 'fora'
                # Fora do jogo: o alien vai para longe da tela.
                alien.pos = (-100, -100)
        if estados[numero] in ('fila', 'mergulho'):
            if alien.collidepoint(tiro.pos):
                estados[numero] = 'explodindo'
                tiro.y = -20
                pontos = pontos + 50
                sounds.acerto.play()
            elif alien.colliderect(nave):
                estados[numero] = 'explodindo'
                perder_vida()


def perder_vida():
    global vidas
    vidas = vidas - 1
    sounds.dano.play()
    bombas.clear()


def draw():
    screen.blit('fundo', (0, 0))
    screen.blit('estrelas', (0, ceu_y))
    screen.blit('estrelas', (0, ceu_y - HEIGHT))
    for alien in aliens:
        alien.draw()
    for bomba in bombas:
        bomba.draw()
    tiro.draw()
    if vidas > 0:
        nave.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 8), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 12, 8), fontsize=30, color='white')
    if 'fila' not in estados and 'mergulho' not in estados:
        screen.draw.text('Você venceu a esquadra!', center=(WIDTH / 2, 400), fontsize=48, color='yellow')
    if vidas == 0:
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 380), fontsize=60, color='orange')
        screen.draw.text('Espaço recomeça', center=(WIDTH / 2, 430), fontsize=36, color='white')


def update():
    global ceu_y, quadros
    quadros = quadros + 1
    ceu_y = (ceu_y + 0.5) % HEIGHT
    if vidas == 0:
        return
    if keyboard.left and nave.left > 0:
        nave.x = nave.x - 5
    if keyboard.right and nave.right < WIDTH:
        nave.x = nave.x + 5
    if tiro.y > -20:
        tiro.y = tiro.y - 10
    mover_aliens()
    for bomba in list(bombas):
        bomba.y = bomba.y + 5
        if bomba.top > HEIGHT:
            bombas.remove(bomba)
        elif bomba.colliderect(nave):
            bombas.remove(bomba)
            perder_vida()


def on_key_down(key):
    if key != keys.SPACE:
        return
    if vidas == 0 or ('fila' not in estados and 'mergulho' not in estados):
        novo_jogo()
    elif tiro.y <= -20:
        tiro.midbottom = nave.midtop
        sounds.tiro.play()


novo_jogo()
pgzrun.go()
