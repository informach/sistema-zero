import math
import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Corrida Vista de Cima'
VOLTAS = 3
LINHA_DE_CHEGADA = 420
VELOCIDADE_MAXIMA = 4

# O guia é uma imagem que não aparece na tela: vermelho é a grama de fora, azul é a grama de
# dentro e o cinza é a pista. O cinza fica mais claro perto da beirada de fora e mais escuro
# perto da de dentro, e é esse tom que os carros do computador seguem.
CENTRO_DA_PISTA = 136

carros = []
largada = 3
terminou = False
lugar = 0
chegaram = 0


def novo_jogo():
    global largada, terminou, lugar, chegaram
    carros.clear()
    lugares = [(380, 90), (380, 150), (320, 90), (320, 150)]
    for numero in range(4):
        carro = Actor('carro' + str(numero))
        carro.pos = lugares[numero]
        carro.angle = 0
        carro.velocidade = 0
        carro.voltas = 0
        # Para a volta valer, o carro precisa ter passado pela parte de baixo da pista.
        carro.passou_embaixo = False
        carro.chegou = False
        carros.append(carro)
    largada = 3
    terminou = False
    lugar = 0
    chegaram = 0
    clock.schedule_interval(contar_largada, 1)


def contar_largada():
    global largada
    largada = largada - 1
    if largada == 0:
        clock.unschedule(contar_largada)
        sounds.largada.play()
    else:
        sounds.bip.play()


def cor_do_guia(x, y):
    if x < 0 or x >= WIDTH or y < 0 or y >= HEIGHT:
        return (255, 0, 0)
    return images.guia.get_at((int(x), int(y)))


def na_pista(x, y):
    cor = cor_do_guia(x, y)
    # Na pista o guia é cinza: vermelho, verde e azul iguais.
    return cor[0] == cor[2]


def guiar_o_computador(carro, numero):
    # Acelera até a velocidade dele (cada carro é um pouco mais rápido que o anterior).
    if carro.velocidade < 2.6 + numero * 0.3:
        carro.velocidade = carro.velocidade + random.randint(0, 1) / 10
    # Olha um pouco à frente do carro, como faz um piloto de verdade.
    angulo = math.radians(carro.angle)
    frente_x = carro.x + math.cos(angulo) * 30
    frente_y = carro.y - math.sin(angulo) * 30
    cor = cor_do_guia(frente_x, frente_y)
    if cor[0] == 255:
        # A frente já está na grama de fora: vira forte para dentro (para a direita).
        carro.angle = carro.angle - 5
    elif cor[2] == 255:
        # Na grama de dentro: vira forte para fora.
        carro.angle = carro.angle + 5
    else:
        # Mais claro que o meio quer dizer perto de fora: vira um pouco para dentro.
        virada = (CENTRO_DA_PISTA - cor[1]) * 0.05
        carro.angle = carro.angle + max(-4, min(4, virada))


def guiar_o_jogador(carro):
    if keyboard.up:
        carro.velocidade = min(carro.velocidade + 0.15, VELOCIDADE_MAXIMA)
    elif keyboard.down:
        carro.velocidade = max(carro.velocidade - 0.2, -1.5)
    else:
        carro.velocidade = carro.velocidade * 0.98
    if carro.velocidade != 0:
        if keyboard.left:
            carro.angle = carro.angle + 3
        if keyboard.right:
            carro.angle = carro.angle - 3


def andar(carro):
    angulo = math.radians(carro.angle)
    novo_x = carro.x + math.cos(angulo) * carro.velocidade
    novo_y = carro.y - math.sin(angulo) * carro.velocidade
    if na_pista(novo_x, novo_y):
        antes = carro.x
        carro.pos = (novo_x, novo_y)
        contar_volta(carro, antes)
    else:
        # Bateu na grama: volta um pouco e perde a velocidade.
        carro.velocidade = -carro.velocidade * 0.4
        if cor_do_guia(novo_x, novo_y)[0] == 255:
            carro.angle = carro.angle - 6
        else:
            carro.angle = carro.angle + 6


def contar_volta(carro, antes):
    global chegaram, lugar, terminou
    if carro.y > 400:
        carro.passou_embaixo = True
    if carro.y < 200 and antes < LINHA_DE_CHEGADA <= carro.x and carro.passou_embaixo:
        carro.voltas = carro.voltas + 1
        carro.passou_embaixo = False
        if carro.voltas == VOLTAS and not carro.chegou:
            carro.chegou = True
            chegaram = chegaram + 1
            if carro == carros[0]:
                lugar = chegaram
                terminou = True
                sounds.chegada.play()


def separar_batidas():
    for numero in range(len(carros)):
        for outro in range(numero + 1, len(carros)):
            a = carros[numero]
            b = carros[outro]
            distancia = a.distance_to(b)
            if 0 < distancia < 26:
                # Empurra um para cada lado e os dois perdem velocidade.
                empurrao = (26 - distancia) / 2
                dx = (a.x - b.x) / distancia * empurrao
                dy = (a.y - b.y) / distancia * empurrao
                if na_pista(a.x + dx, a.y + dy):
                    a.pos = (a.x + dx, a.y + dy)
                if na_pista(b.x - dx, b.y - dy):
                    b.pos = (b.x - dx, b.y - dy)
                a.velocidade = a.velocidade * 0.8
                b.velocidade = b.velocidade * 0.8


def update():
    if largada > 0 or terminou:
        return
    for numero in range(len(carros)):
        carro = carros[numero]
        if numero == 0:
            guiar_o_jogador(carro)
        else:
            guiar_o_computador(carro, numero)
        andar(carro)
    separar_batidas()


def draw():
    screen.blit('pista', (0, 0))
    for carro in carros:
        carro.draw()
    volta = min(carros[0].voltas + 1, VOLTAS)
    screen.draw.text('Volta ' + str(volta) + ' de ' + str(VOLTAS), topleft=(12, 10), fontsize=34, color='white', owidth=1, ocolor='black')
    if largada > 0:
        screen.draw.text(str(largada), center=(400, 300), fontsize=120, color='yellow', owidth=2, ocolor='black')
    if terminou:
        screen.draw.text('Você chegou em ' + str(lugar) + 'º lugar!', center=(400, 280), fontsize=56, color='yellow', owidth=1, ocolor='black')
        screen.draw.text('Espaço corre de novo', center=(400, 330), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    if terminou and key == keys.SPACE:
        novo_jogo()


novo_jogo()
pgzrun.go()
