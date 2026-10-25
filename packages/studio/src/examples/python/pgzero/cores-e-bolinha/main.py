import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Cores e Bolinha'
PASSO = 51
RAIO = 30
VELOCIDADE_MAXIMA = 9
CANAIS = ['vermelho', 'verde', 'azul']
CORES_DOS_NOMES = ['#e53935', '#43a047', '#1e88e5']

# A cor da bolinha: quanto de vermelho, de verde e de azul (de 0 a 255).
cor = [0, 0, 0]
alvo = (255, 0, 0)
pontos = 0
cliques = 0
arco_iris = False
giro = 0
bola_x = 580
bola_y = 300
vel_x = 4
vel_y = 3

# Cada botão muda um canal: o de menos tira PASSO, o de mais põe PASSO.
botoes = []
for canal in range(3):
    menos = Actor('menos_' + CANAIS[canal])
    menos.pos = (230, 90 + canal * 110)
    mais = Actor('mais_' + CANAIS[canal])
    mais.pos = (300, 90 + canal * 110)
    botoes.append((menos, canal, -PASSO))
    botoes.append((mais, canal, PASSO))


def novo_alvo():
    # Uma cor que dá para fazer com os botões e que ainda não é a da bolinha.
    global alvo
    valores = list(range(0, 256, PASSO))
    # Algumas tentativas bastam; com um PASSO enorme talvez só exista uma cor.
    for tentativa in range(50):
        alvo = (random.choice(valores), random.choice(valores), random.choice(valores))
        if alvo != tuple(cor):
            return


def roda_de_cores(posicao):
    # Dá a volta no arco-íris: vermelho, verde, azul e de volta ao vermelho.
    if posicao < 85:
        return (255 - posicao * 3, posicao * 3, 0)
    if posicao < 170:
        posicao = posicao - 85
        return (0, 255 - posicao * 3, posicao * 3)
    posicao = posicao - 170
    return (posicao * 3, 0, 255 - posicao * 3)


def cor_da_bola():
    if arco_iris:
        return roda_de_cores(giro)
    return tuple(cor)


def conferir():
    global pontos, vel_x, vel_y
    if not arco_iris and tuple(cor) == alvo:
        pontos = pontos + 1
        sounds.acerto.play()
        # A bolinha comemora correndo um pouco mais, até a velocidade máxima.
        if abs(vel_x) < VELOCIDADE_MAXIMA:
            vel_x = vel_x * 1.1
            vel_y = vel_y * 1.1
        novo_alvo()


def on_mouse_down(pos):
    global cliques
    for botao, canal, mudanca in botoes:
        if botao.collidepoint(pos):
            cor[canal] = min(max(cor[canal] + mudanca, 0), 255)
            cliques = cliques + 1
            sounds.clique.play()
            conferir()


def on_key_down(key):
    global arco_iris
    if key == keys.SPACE:
        arco_iris = not arco_iris


def update():
    global bola_x, bola_y, vel_x, vel_y, giro
    giro = (giro + 1) % 255
    bola_x = bola_x + vel_x
    bola_y = bola_y + vel_y
    # A bolinha quica dentro da caixa da direita.
    if bola_x < 380 + RAIO or bola_x > WIDTH - 20 - RAIO:
        vel_x = -vel_x
        bola_x = min(max(bola_x, 380 + RAIO), WIDTH - 20 - RAIO)
    if bola_y < 140 + RAIO or bola_y > HEIGHT - 20 - RAIO:
        vel_y = -vel_y
        bola_y = min(max(bola_y, 140 + RAIO), HEIGHT - 20 - RAIO)


def draw():
    screen.fill((32, 34, 48))
    for canal in range(3):
        y = 90 + canal * 110
        screen.draw.filled_rect(Rect((20, y - 35), (170, 70)), 'white')
        screen.draw.text(CANAIS[canal], midleft=(30, y - 12), fontsize=30, color=CORES_DOS_NOMES[canal])
        screen.draw.text(str(cor[canal]), midleft=(30, y + 16), fontsize=34, color='black')
    for botao, canal, mudanca in botoes:
        botao.draw()
    screen.draw.text('Faça esta cor:', midleft=(400, 50), fontsize=36, color='white')
    screen.draw.filled_circle((660, 52), 34, alvo)
    screen.draw.circle((660, 52), 34, 'white')
    screen.draw.rect(Rect((380, 140), (WIDTH - 400, HEIGHT - 160)), 'white')
    screen.draw.filled_circle((bola_x, bola_y), RAIO, cor_da_bola())
    screen.draw.circle((bola_x, bola_y), RAIO, 'white')
    screen.draw.text('Pontos: ' + str(pontos) + '   Cliques: ' + str(cliques), midleft=(20, 440), fontsize=32, color='white')
    if arco_iris:
        screen.draw.text('Arco-íris! Espaço volta', midleft=(20, 490), fontsize=30, color='yellow')
    else:
        screen.draw.text('Espaço: modo arco-íris', midleft=(20, 490), fontsize=30, color='white')


novo_alvo()
pgzrun.go()
