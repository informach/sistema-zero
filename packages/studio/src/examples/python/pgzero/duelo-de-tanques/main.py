import math
import random
import pygame
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Duelo de Tanques'
CEU = (150, 195, 235)
CHAO = (70, 130, 50)
GRAVIDADE = 0.12
PEDACO = 20
SUBIDA = 18
COMPUTADOR = True
PASSOS_DO_TIRO = 4

terreno = []
tanques = [Actor('tanque_azul'), Actor('tanque_laranja')]
canos = [Actor('cano', anchor=('left', 'middle')), Actor('cano', anchor=('left', 'middle'))]
NOMES = ['Azul', 'Laranja']
angulos = [45, 45]
forcas = [60, 60]
vitorias = [0, 0]
vez = 0
estado = 'mirando'
espera = 0
vento = 0
tiro_x = 0
tiro_y = 0
tiro_vx = 0
tiro_vy = 0
rastro = []
explosao = 0
# O que o computador aprendeu com o último tiro dele.
ajuste = 10
ultimo_tiro = None


def criar_terreno():
    # O chão é um polígono: sobe e desce aos pedaços, com um lugar plano para cada tanque.
    global terreno
    lugar_azul = random.randint(3, 12) * PEDACO
    lugar_laranja = random.randint(27, 35) * PEDACO
    y = random.randint(330, 430)
    terreno = [(0, HEIGHT)]
    x = 0
    while x <= WIDTH:
        if x == lugar_azul or x == lugar_laranja:
            terreno.append((x, y))
            terreno.append((x + 60, y))
            tanque = tanques[0] if x == lugar_azul else tanques[1]
            tanque.midbottom = (x + 30, y)
            x = x + 60
        else:
            terreno.append((x, y))
            x = x + PEDACO
        y = min(max(y + random.randint(-SUBIDA, SUBIDA), 220), 560)
    terreno.append((WIDTH, HEIGHT))
    for numero in range(2):
        canos[numero].pos = (tanques[numero].x, tanques[numero].top + 6)


def nova_rodada():
    global estado, vez, ajuste, ultimo_tiro, explosao
    criar_terreno()
    estado = 'mirando'
    vez = 0
    explosao = 0
    rastro.clear()
    # O computador começa a mira do zero em cada terreno novo.
    if COMPUTADOR:
        angulos[1] = 45
        forcas[1] = 60
    ajuste = 10
    ultimo_tiro = None
    sortear_vento()


def sortear_vento():
    global vento
    vento = random.choice([-3, -2, -1, 0, 1, 2, 3]) / 100


def apontar_canos():
    # O azul atira para a direita; o laranja, para a esquerda.
    canos[0].angle = angulos[0]
    canos[1].angle = 180 - angulos[1]


def atirar():
    global estado, tiro_x, tiro_y, tiro_vx, tiro_vy, rastro
    angulo = math.radians(angulos[vez])
    lado = 1 if vez == 0 else -1
    velocidade = forcas[vez] * 0.14
    # O tiro sai da ponta do cano.
    tiro_x = canos[vez].x + math.cos(angulo) * 26 * lado
    tiro_y = canos[vez].y - math.sin(angulo) * 26
    tiro_vx = math.cos(angulo) * velocidade * lado
    tiro_vy = -math.sin(angulo) * velocidade
    rastro = []
    estado = 'voando'
    sounds.tiro.play()


def mirar():
    # As setas mexem no ângulo (cima e baixo) e na força (esquerda e direita).
    if keyboard.up:
        angulos[vez] = min(angulos[vez] + 1, 90)
    if keyboard.down:
        angulos[vez] = max(angulos[vez] - 1, 0)
    if keyboard.right:
        forcas[vez] = min(forcas[vez] + 1, 100)
    if keyboard.left:
        forcas[vez] = max(forcas[vez] - 1, 10)


def pensar():
    # O computador corrige a mira pelo último tiro dele, como quem aprende.
    global ajuste
    if ultimo_tiro is None:
        return
    if ultimo_tiro > tanques[1].x - 120:
        # Bateu num morro perto dele: mira mais para o alto e recomeça a acertar a força.
        angulos[1] = min(angulos[1] + 10, 80)
        ajuste = 10
    elif ultimo_tiro > tanques[0].x:
        forcas[1] = min(forcas[1] + ajuste, 100)
        ajuste = max(ajuste * 0.6, 1)
    else:
        forcas[1] = max(forcas[1] - ajuste, 10)
        ajuste = max(ajuste * 0.6, 1)


def errou(x):
    global estado, explosao, ultimo_tiro
    if vez == 1:
        ultimo_tiro = x
    estado = 'explosao'
    explosao = 30
    sounds.chao.play()


def acertou():
    global estado, explosao
    vitorias[vez] = vitorias[vez] + 1
    estado = 'fim'
    explosao = 30
    sounds.acerto.play()


def voar():
    # O tiro anda em passinhos para não atravessar um morro entre um quadro e outro.
    global tiro_x, tiro_y, tiro_vx, tiro_vy
    tiro_vx = tiro_vx + vento
    tiro_vy = tiro_vy + GRAVIDADE
    for passo in range(PASSOS_DO_TIRO):
        tiro_x = tiro_x + tiro_vx / PASSOS_DO_TIRO
        tiro_y = tiro_y + tiro_vy / PASSOS_DO_TIRO
        # Saiu pelos lados, por baixo ou subiu demais: o tiro se perdeu.
        if tiro_x < 0 or tiro_x >= WIDTH or tiro_y >= HEIGHT or tiro_y < -HEIGHT:
            errou(tiro_x)
            return
        if tanques[1 - vez].collidepoint((tiro_x, tiro_y)):
            acertou()
            return
        # A cor da tela no lugar do tiro diz se ele chegou no chão.
        if tiro_y >= 0 and screen.surface.get_at((int(tiro_x), int(tiro_y))) == CHAO:
            errou(tiro_x)
            return
    rastro.append((tiro_x, tiro_y))


def passar_a_vez():
    global estado, vez, espera
    vez = 1 - vez
    estado = 'mirando'
    espera = 60
    sortear_vento()


def update():
    global espera, explosao
    apontar_canos()
    if estado == 'mirando':
        if vez == 1 and COMPUTADOR:
            espera = espera - 1
            if espera <= 0:
                pensar()
                atirar()
        else:
            mirar()
    elif estado == 'voando':
        voar()
    elif estado == 'explosao':
        explosao = explosao - 1
        if explosao <= 0:
            passar_a_vez()
    elif estado == 'fim':
        explosao = max(explosao - 1, 0)


def on_key_down(key):
    if key != keys.SPACE:
        return
    if estado == 'fim':
        nova_rodada()
    elif estado == 'mirando' and not (vez == 1 and COMPUTADOR):
        atirar()


def draw():
    screen.fill(CEU)
    pygame.draw.polygon(screen.surface, CHAO, terreno)
    for numero in range(2):
        canos[numero].draw()
        tanques[numero].draw()
    for x, y in rastro[-40:]:
        screen.draw.filled_circle((x, y), 2, 'white')
    if estado == 'voando':
        screen.draw.filled_circle((tiro_x, tiro_y), 4, 'black')
    if explosao > 0:
        screen.draw.filled_circle((tiro_x, tiro_y), 34 - explosao, 'orange')
    seta = '<<<' if vento < 0 else '>>>' if vento > 0 else '---'
    screen.draw.text('Vento ' + seta + ' ' + str(abs(int(vento * 100))), center=(400, 30), fontsize=32, color='white', owidth=1, ocolor='black')
    screen.draw.text('Azul ' + str(vitorias[0]) + ' x ' + str(vitorias[1]) + ' Laranja', center=(400, 64), fontsize=28, color='black')
    if estado == 'fim':
        screen.draw.text(NOMES[vez] + ' venceu!', center=(400, 160), fontsize=64, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Espaço: outra rodada', center=(400, 215), fontsize=32, color='white', owidth=1, ocolor='black')
        return
    texto = NOMES[vez] + ': ângulo ' + str(angulos[vez]) + '   força ' + str(round(forcas[vez]))
    canto = (20, 20) if vez == 0 else (WIDTH - 20, 20)
    if vez == 0:
        screen.draw.text(texto, topleft=canto, fontsize=28, color='white', owidth=1, ocolor='black')
    else:
        screen.draw.text(texto, topright=canto, fontsize=28, color='white', owidth=1, ocolor='black')


nova_rodada()
pgzrun.go()
