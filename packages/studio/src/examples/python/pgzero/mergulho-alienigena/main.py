import math
import random
import pgzrun

WIDTH = 600
HEIGHT = 800
TITLE = 'Mergulho Alienígena'

nave = Actor('nave')
tiro = Actor('tiro')
aliens = []
bombas = []
ceu_y = 0
quadros = 0
vidas = 3
pontos = 0
venceu = False


def montar_aliens():
    aliens.clear()
    for fila in range(2):
        for coluna in range(8):
            alien = Actor('alien0')
            # Cada alien guarda as próprias informações:
            # casa = o lugar dele na formação;
            # estado = 'fila' (na formação), 'mergulho' (descendo), 'explodindo' ou 'fora';
            # lado = -1 mergulha para a esquerda, 1 para a direita (metade da fila para cada lado).
            alien.casa = (125 + coluna * 50, 160 + fila * 50)
            alien.pos = alien.casa
            alien.estado = 'fila'
            alien.explosao = 0
            if coluna < 4:
                alien.lado = -1
            else:
                alien.lado = 1
            aliens.append(alien)


def novo_jogo():
    global vidas, pontos, venceu
    vidas = 3
    pontos = 0
    venceu = False
    bombas.clear()
    montar_aliens()
    nave.pos = (300, 720)
    tiro.y = -20


def mergulhar(alien):
    # Faz uma curva: primeiro sobe um pouco virando, depois desce rápido em direção à nave.
    if abs(alien.angle) < 180:
        alien.angle = alien.angle - 3 * alien.lado
        alien.x = alien.x + 1.5 * alien.lado
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
        alien.estado = 'fila'
        alien.angle = 0


def acertou(alien):
    # O alien gira no mergulho, e girar muda o tamanho do retângulo dele:
    # por isso as batidas contam pela distância até o centro.
    return alien.distance_to(tiro) < 20


def mover_aliens():
    global pontos
    balanco = math.sin(quadros / 90) * 60
    for alien in aliens:
        if alien.estado == 'fila':
            alien.x = alien.casa[0] + balanco
            alien.y = alien.casa[1]
            alien.image = 'alien' + str(quadros // 15 % 2)
            if random.randint(1, 900) == 1:
                alien.estado = 'mergulho'
                sounds.mergulho.play()
        elif alien.estado == 'mergulho':
            mergulhar(alien)
        elif alien.estado == 'explodindo':
            # Três desenhos de explosão, seis quadros cada.
            alien.image = 'explosao' + str(alien.explosao // 6 + 1)
            alien.explosao = alien.explosao + 1
            if alien.explosao == 18:
                alien.estado = 'fora'
                # Fora do jogo: o alien vai para longe da tela.
                alien.pos = (-100, -100)
        if alien.estado in ('fila', 'mergulho'):
            if acertou(alien):
                alien.estado = 'explodindo'
                alien.angle = 0
                tiro.y = -20
                pontos = pontos + 50
                sounds.acerto.play()
            elif alien.distance_to(nave) < 34:
                alien.estado = 'explodindo'
                alien.angle = 0
                perder_vida()


def sobrou_algum():
    for alien in aliens:
        if alien.estado in ('fila', 'mergulho'):
            return True
    return False


def perder_vida():
    global vidas
    if vidas > 0:
        vidas = vidas - 1
        sounds.dano.play()
    # As bombas que estavam caindo somem: a nave ganha um respiro.
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
    if venceu:
        screen.draw.text('Você venceu a esquadra!', center=(WIDTH / 2, 380), fontsize=48, color='yellow')
    elif vidas == 0:
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 380), fontsize=60, color='orange')
    if venceu or vidas == 0:
        screen.draw.text('Espaço recomeça', center=(WIDTH / 2, 430), fontsize=36, color='white')


def update():
    global ceu_y, quadros, venceu
    quadros = quadros + 1
    ceu_y = (ceu_y + 0.5) % HEIGHT
    if vidas == 0 or venceu:
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
            # perder_vida esvazia a lista de bombas: não há mais nenhuma para olhar.
            perder_vida()
            break
    if not sobrou_algum():
        venceu = True
        sounds.vitoria.play()


def on_key_down(key):
    if key != keys.SPACE:
        return
    if vidas == 0 or venceu:
        novo_jogo()
    elif tiro.y <= -20:
        tiro.midbottom = nave.midtop
        sounds.tiro.play()


novo_jogo()
pgzrun.go()
