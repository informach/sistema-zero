import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Barris na Rampa'

heroi = Actor('heroi', (60, 540))
barris = []
vidas = 3
pontos = 0
venceu = False
fim_de_jogo = False
velocidade_y = 0
espera = 0


def cor_do_mapa(x, y, canal):
    # O mapa invisível (images/mapa.png): vermelho onde há viga, azul onde há escada.
    if x < 0 or x >= WIDTH or y < 0 or y >= HEIGHT:
        return 0
    return images.mapa.get_at((int(x), int(y)))[canal]


def viga_em(x, y):
    return cor_do_mapa(x, y, 0) > 128


def escada_em(x, y):
    return cor_do_mapa(x, y, 2) > 128


def altura_da_viga(x, y):
    # Desce do ponto (x, y) até achar a viga, olhando no máximo 40 pixels.
    for passo in range(40):
        if viga_em(x, y + passo):
            return y + passo
    return y + 40


def novo_barril():
    barril = Actor('barril0', (90, 110))
    barris.append(barril)


def mover_barril(barril):
    base = barril.bottom + 1
    if not viga_em(barril.x, base):
        barril.y = barril.y + 3
        return
    # Rola rampa abaixo: para o lado em que a viga está mais baixa (um y maior).
    esquerda = altura_da_viga(barril.x - 40, barril.bottom - 8)
    direita = altura_da_viga(barril.x + 40, barril.bottom - 8)
    if esquerda > direita:
        barril.x = barril.x - 2
    else:
        barril.x = barril.x + 2
    # Quatro desenhos com a faixa girando: trocar o desenho faz o barril parecer rolar.
    barril.image = 'barril' + str(int(barril.x / 6) % 4)
    while viga_em(barril.x, barril.bottom - 1):
        barril.y = barril.y - 1
    if escada_em(barril.x, base + 2) and random.randint(1, 80) == 1:
        barril.y = barril.y + 18


def mover_heroi():
    global velocidade_y
    pes = heroi.bottom + 1
    na_escada = escada_em(heroi.x, heroi.bottom - 4) or escada_em(heroi.x, pes + 2)
    if keyboard.left:
        heroi.x = heroi.x - 3
    if keyboard.right:
        heroi.x = heroi.x + 3
    if na_escada and keyboard.up:
        heroi.y = heroi.y - 3
        velocidade_y = 0
        return
    if na_escada and keyboard.down and escada_em(heroi.x, pes + 2):
        heroi.y = heroi.y + 3
        velocidade_y = 0
        return
    if viga_em(heroi.x, pes) and velocidade_y >= 0:
        velocidade_y = 0
        while viga_em(heroi.x, heroi.bottom - 1):
            heroi.y = heroi.y - 1
        if keyboard.space:
            velocidade_y = -9
            sounds.pulo.play()
    else:
        velocidade_y = min(velocidade_y + 0.6, 8)
    heroi.y = heroi.y + velocidade_y


def recomecar_heroi():
    global velocidade_y
    heroi.pos = (60, 540)
    velocidade_y = 0
    barris.clear()


def update():
    global espera, vidas, fim_de_jogo, venceu, pontos
    if fim_de_jogo or venceu:
        return
    espera = espera - 1
    if espera <= 0:
        novo_barril()
        espera = random.randint(150, 240)
    for barril in barris:
        mover_barril(barril)
    for barril in list(barris):
        # Saiu pela beirada ou caiu da última viga: some e conta como desviado.
        if barril.x < -20 or barril.x > WIDTH + 20 or barril.top > HEIGHT:
            barris.remove(barril)
            pontos = pontos + 1
    mover_heroi()
    heroi.x = max(12, min(WIDTH - 12, heroi.x))
    for barril in barris:
        if heroi.colliderect(barril):
            vidas = vidas - 1
            sounds.batida.play()
            if vidas == 0:
                fim_de_jogo = True
            else:
                recomecar_heroi()
            return
    if heroi.bottom < 165 and heroi.x > 600:
        venceu = True
        sounds.vitoria.play()


def draw():
    screen.blit('fundo', (0, 0))
    for barril in barris:
        barril.draw()
    heroi.draw()
    screen.draw.text('Vidas: ' + str(vidas), topleft=(12, 8), fontsize=30, color='white')
    screen.draw.text('Barris desviados: ' + str(pontos), topright=(WIDTH - 12, 8), fontsize=30, color='white')
    if fim_de_jogo:
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, HEIGHT / 2), fontsize=72, color='yellow', owidth=2, ocolor='black')
    if venceu:
        screen.draw.text('Você chegou ao topo!', center=(WIDTH / 2, HEIGHT / 2), fontsize=64, color='yellow', owidth=2, ocolor='black')
    if fim_de_jogo or venceu:
        screen.draw.text('Espaço joga de novo', center=(WIDTH / 2, HEIGHT / 2 + 56), fontsize=36, color='white', owidth=1.5, ocolor='black')


def on_key_down(key):
    global vidas, pontos, fim_de_jogo, venceu, espera
    if key == keys.SPACE and (fim_de_jogo or venceu):
        vidas = 3
        pontos = 0
        fim_de_jogo = False
        venceu = False
        espera = 0
        recomecar_heroi()


pgzrun.go()
