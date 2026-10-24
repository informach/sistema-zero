import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Continuar?'
VIDAS = 3
# Segundos da contagem da tela de continuar.
CONTAGEM = 10

nave = Actor('nave', (WIDTH / 2, 540))
pedras = []
vidas = 0
pontos = 0
recorde = 0
quadros_da_contagem = 0
apertou_espaco = False
estado = 'titulo'


# O que acontece ao entrar em cada estado.

def entrar_no_titulo():
    global recorde, pontos
    recorde = max(recorde, pontos)
    pontos = 0


def entrar_no_jogo():
    # Ao continuar, os pontos ficam: só as vidas e as pedras recomeçam.
    global vidas
    vidas = VIDAS
    pedras.clear()
    nave.x = WIDTH / 2


def entrar_no_continuar():
    global quadros_da_contagem
    quadros_da_contagem = CONTAGEM * 60
    sounds.fim.play()


# O que cada estado faz a cada quadro.

def atualizar_titulo():
    pass


def atualizar_jogo():
    global vidas, pontos
    if keyboard.left and nave.left > 0:
        nave.x = nave.x - 6
    if keyboard.right and nave.right < WIDTH:
        nave.x = nave.x + 6
    if random.randint(1, 100) <= 4:
        pedra = Actor('pedra', (random.randint(20, WIDTH - 20), -30))
        pedra.velocidade = random.randint(3, 6) + pontos // 25
        pedras.append(pedra)
    for pedra in list(pedras):
        pedra.y = pedra.y + pedra.velocidade
        if pedra.colliderect(nave):
            pedras.remove(pedra)
            vidas = vidas - 1
            sounds.batida.play()
        elif pedra.top > HEIGHT:
            # Cada pedra que passa sem bater vale um ponto.
            pedras.remove(pedra)
            pontos = pontos + 1


def atualizar_continuar():
    global quadros_da_contagem
    quadros_da_contagem = quadros_da_contagem - 1


# As regras: em cada estado, uma lista de pares (condição, próximo estado).
# A condição é uma função pequena, escrita com lambda, que responde True ou False.
REGRAS = {
    'titulo': [(lambda: apertou_espaco, 'jogo')],
    'jogo': [(lambda: vidas <= 0, 'continuar')],
    'continuar': [(lambda: apertou_espaco, 'jogo'), (lambda: quadros_da_contagem <= 0, 'titulo')],
}
AO_ENTRAR = {'titulo': entrar_no_titulo, 'jogo': entrar_no_jogo, 'continuar': entrar_no_continuar}
A_CADA_QUADRO = {'titulo': atualizar_titulo, 'jogo': atualizar_jogo, 'continuar': atualizar_continuar}


def mudar_para(proximo):
    global estado
    estado = proximo
    AO_ENTRAR[proximo]()


def update():
    global apertou_espaco
    A_CADA_QUADRO[estado]()
    for condicao, proximo in REGRAS[estado]:
        if condicao():
            mudar_para(proximo)
            break
    apertou_espaco = False


def on_key_down(key):
    global apertou_espaco
    if key == keys.SPACE:
        apertou_espaco = True


def draw():
    screen.blit('fundo', (0, 0))
    if estado == 'titulo':
        screen.draw.text('Chuva de Pedras', center=(WIDTH / 2, 220), fontsize=80, color='yellow', owidth=1.5, ocolor='black')
        screen.draw.text('As setas desviam a nave. Espaço começa.', center=(WIDTH / 2, 300), fontsize=36, color='white')
        screen.draw.text('Recorde: ' + str(recorde), center=(WIDTH / 2, 360), fontsize=34, color='white')
    if estado == 'jogo' or estado == 'continuar':
        for pedra in pedras:
            pedra.draw()
        nave.draw()
        screen.draw.text('Pontos: ' + str(pontos), topleft=(20, 16), fontsize=34, color='white')
        screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 20, 16), fontsize=34, color='white')
    if estado == 'continuar':
        screen.draw.filled_rect(Rect((150, 170), (500, 260)), (20, 20, 40))
        screen.draw.text('Continuar?', center=(WIDTH / 2, 230), fontsize=70, color='yellow')
        screen.draw.text(str((quadros_da_contagem + 59) // 60), center=(WIDTH / 2, 310), fontsize=90, color='white')
        screen.draw.text('Espaço continua com os seus pontos', center=(WIDTH / 2, 390), fontsize=30, color='white')


pgzrun.go()
