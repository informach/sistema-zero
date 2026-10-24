import math
import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Propulsor no Espaço'
EMPURRAO = 0.15
ATRITO = 0.99
# O tamanho de cada pedra para as batidas. A pedra gira só no desenho: girar um ator muda o
# tamanho do retângulo dele, então a conta usa a distância até o centro.
RAIO = {'grande': 40, 'media': 22, 'pequena': 12}

nave = Actor('nave')
velocidade_x = 0
velocidade_y = 0
tiros = []
idades = []
pedras = []
tamanhos = []
direcoes = []
vidas = 3
pontos = 0
protegida = 0


def nova_pedra(tamanho, x, y):
    pedra = Actor('pedra_' + tamanho)
    pedra.pos = (x, y)
    pedra.angle = random.randint(0, 359)
    pedras.append(pedra)
    tamanhos.append(tamanho)
    angulo = math.radians(random.randint(0, 359))
    rapidez = {'grande': 1, 'media': 1.8, 'pequena': 2.6}[tamanho]
    direcoes.append((math.cos(angulo) * rapidez, math.sin(angulo) * rapidez))


def nova_onda():
    for numero in range(4):
        # As pedras nascem nas beiradas, longe da nave no meio.
        if numero % 2 == 0:
            nova_pedra('grande', random.randint(0, WIDTH), 0)
        else:
            nova_pedra('grande', 0, random.randint(0, HEIGHT))


def dar_a_volta(ator):
    # Saiu por um lado da tela, entra pelo outro.
    if ator.x < 0:
        ator.x = ator.x + WIDTH
    if ator.x > WIDTH:
        ator.x = ator.x - WIDTH
    if ator.y < 0:
        ator.y = ator.y + HEIGHT
    if ator.y > HEIGHT:
        ator.y = ator.y - HEIGHT


def quebrar(numero):
    global pontos
    pedra = pedras.pop(numero)
    tamanho = tamanhos.pop(numero)
    direcoes.pop(numero)
    sounds.quebra.play()
    if tamanho == 'grande':
        pontos = pontos + 20
        nova_pedra('media', pedra.x, pedra.y)
        nova_pedra('media', pedra.x, pedra.y)
    elif tamanho == 'media':
        pontos = pontos + 50
        nova_pedra('pequena', pedra.x, pedra.y)
        nova_pedra('pequena', pedra.x, pedra.y)
    else:
        pontos = pontos + 100


def recomecar_nave():
    global velocidade_x, velocidade_y, protegida
    nave.pos = (WIDTH / 2, HEIGHT / 2)
    nave.angle = 90
    velocidade_x = 0
    velocidade_y = 0
    protegida = 120


def novo_jogo():
    global vidas, pontos
    vidas = 3
    pontos = 0
    tiros.clear()
    idades.clear()
    pedras.clear()
    tamanhos.clear()
    direcoes.clear()
    recomecar_nave()
    nova_onda()


def draw():
    screen.blit('fundo', (0, 0))
    for pedra in pedras:
        pedra.draw()
    for tiro in tiros:
        tiro.draw()
    # Logo depois de uma batida, a nave pisca e não pode ser atingida.
    if vidas > 0 and protegida // 6 % 2 == 0:
        nave.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 8), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 12, 8), fontsize=30, color='white')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, HEIGHT / 2), fontsize=48, color='orange')


def update():
    global velocidade_x, velocidade_y, vidas, protegida
    if vidas == 0:
        return
    # O ângulo 0 aponta para a direita e cresce no sentido anti-horário, como no Pygame Zero.
    angulo = nave.angle
    if keyboard.left:
        angulo = angulo + 4
    if keyboard.right:
        angulo = angulo - 4
    if keyboard.up:
        nave.image = 'nave_fogo'
        radianos = math.radians(angulo)
        velocidade_x = velocidade_x + EMPURRAO * math.cos(radianos)
        velocidade_y = velocidade_y - EMPURRAO * math.sin(radianos)
    else:
        nave.image = 'nave'
    # Trocar a imagem volta o ângulo para 0: por isso ele é guardado antes e posto de novo.
    nave.angle = angulo
    velocidade_x = velocidade_x * ATRITO
    velocidade_y = velocidade_y * ATRITO
    nave.x = nave.x + velocidade_x
    nave.y = nave.y + velocidade_y
    dar_a_volta(nave)
    for numero in range(len(pedras)):
        pedra = pedras[numero]
        pedra.x = pedra.x + direcoes[numero][0]
        pedra.y = pedra.y + direcoes[numero][1]
        pedra.angle = pedra.angle + 1
        dar_a_volta(pedra)
    for numero in range(len(tiros) - 1, -1, -1):
        tiro = tiros[numero]
        radianos = math.radians(tiro.angle)
        tiro.x = tiro.x + 8 * math.cos(radianos)
        tiro.y = tiro.y - 8 * math.sin(radianos)
        dar_a_volta(tiro)
        idades[numero] = idades[numero] + 1
        if idades[numero] > 60:
            tiros.pop(numero)
            idades.pop(numero)
    for numero in range(len(pedras) - 1, -1, -1):
        for outro in range(len(tiros) - 1, -1, -1):
            if pedras[numero].distance_to(tiros[outro]) < RAIO[tamanhos[numero]]:
                tiros.pop(outro)
                idades.pop(outro)
                quebrar(numero)
                break
    if protegida > 0:
        protegida = protegida - 1
    else:
        for numero in range(len(pedras)):
            if pedras[numero].distance_to(nave) < RAIO[tamanhos[numero]] + 12:
                vidas = vidas - 1
                sounds.batida.play()
                recomecar_nave()
                break
    if not pedras:
        nova_onda()


def on_key_down(key):
    if key != keys.SPACE:
        return
    if vidas == 0:
        novo_jogo()
    elif len(tiros) < 5:
        tiro = Actor('tiro')
        tiro.pos = nave.pos
        tiro.angle = nave.angle
        tiros.append(tiro)
        idades.append(0)
        sounds.tiro.play()


novo_jogo()
pgzrun.go()
