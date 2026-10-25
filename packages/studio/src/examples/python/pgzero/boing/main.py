import math
import random
import pgzrun

WIDTH = 800
HEIGHT = 480
TITLE = 'Raquetada'
PONTOS_PARA_VENCER = 10
VELOCIDADE_INICIAL = 5
# Quanto a bola acelera a cada raquetada, até a velocidade máxima.
ACELERACAO = 0.5
VELOCIDADE_MAXIMA = 14
VELOCIDADE_DA_RAQUETE = 6
# O computador mexe a raquete mais devagar que você: é o que dá a chance de vencer.
VELOCIDADE_DO_COMPUTADOR = 4.5
TOPO = 40
FUNDO = HEIGHT - 40

raquetes = [Actor('raquete_azul', (40, HEIGHT / 2)), Actor('raquete_laranja', (WIDTH - 40, HEIGHT / 2))]
bola = Actor('bola', (WIDTH / 2, HEIGHT / 2))
pontos = [0, 0]
jogadores = 1
estado = 'menu'
dx = 1
dy = 0
velocidade = VELOCIDADE_INICIAL
espera = 0
# Onde o computador mira na raquete (muda a cada raquetada, para ele não ser perfeito).
desvio = 0
faiscas = []
brilho = [0, 0]


def sacar(para):
    # A bola sai do meio, na direção de quem levou o ponto.
    global dx, dy, velocidade, espera
    bola.pos = (WIDTH / 2, HEIGHT / 2)
    inclinacao = random.choice([-0.4, -0.2, 0.2, 0.4])
    tamanho = math.sqrt(1 + inclinacao * inclinacao)
    dx = para / tamanho
    dy = inclinacao / tamanho
    velocidade = VELOCIDADE_INICIAL
    espera = 1.0


def novo_jogo():
    global estado, pontos
    pontos = [0, 0]
    for raquete in raquetes:
        raquete.y = HEIGHT / 2
    faiscas.clear()
    estado = 'jogando'
    sacar(random.choice([-1, 1]))


def soltar_faiscas(x, y, cor):
    for numero in range(12):
        angulo = numero * math.pi / 6
        faiscas.append({'x': x, 'y': y, 'vx': math.cos(angulo) * 3, 'vy': math.sin(angulo) * 3,
                        'vida': 20, 'cor': cor})


def mover_raquete(numero, sobe, desce):
    if sobe:
        raquetes[numero].y = raquetes[numero].y - VELOCIDADE_DA_RAQUETE
    if desce:
        raquetes[numero].y = raquetes[numero].y + VELOCIDADE_DA_RAQUETE


def pensar():
    # O computador segue a bola quando ela vem; quando ela vai embora, volta para o meio.
    if dx > 0:
        alvo = bola.y + desvio
    else:
        alvo = HEIGHT / 2
    distancia = alvo - raquetes[1].y
    raquetes[1].y = raquetes[1].y + min(max(distancia, -VELOCIDADE_DO_COMPUTADOR), VELOCIDADE_DO_COMPUTADOR)


def rebater(numero):
    # Quanto mais longe do meio da raquete a bola bate, mais inclinada ela volta.
    global dx, dy, velocidade, desvio
    raquete = raquetes[numero]
    dx = -dx
    dy = (bola.y - raquete.y) / raquete.height * 1.5
    # Mantém o tamanho do passo: a bola não fica mais rápida só por sair inclinada.
    tamanho = math.sqrt(dx * dx + dy * dy)
    dx = dx / tamanho
    dy = dy / tamanho
    velocidade = min(velocidade + ACELERACAO, VELOCIDADE_MAXIMA)
    desvio = random.randint(-30, 30)
    brilho[numero] = 10
    soltar_faiscas(bola.x, bola.y, 'deepskyblue' if numero == 0 else 'orange')
    sounds.raquete.play()


def mover_bola():
    global dy
    # A bola anda em passinhos de meio pixel: assim ela nunca atravessa a raquete.
    for passo in range(int(velocidade * 2)):
        anterior = bola.x
        bola.x = bola.x + dx / 2
        bola.y = bola.y + dy / 2
        if bola.top < TOPO or bola.bottom > FUNDO:
            dy = -dy
            bola.y = min(max(bola.y, TOPO + bola.height / 2), FUNDO - bola.height / 2)
            sounds.parede.play()
        # Só rebate quem a bola está indo encontrar, quando ela chega na frente da raquete.
        if dx < 0 and anterior >= raquetes[0].right and bola.left <= raquetes[0].right and bola.colliderect(raquetes[0]):
            rebater(0)
        if dx > 0 and anterior <= raquetes[1].left and bola.right >= raquetes[1].left and bola.colliderect(raquetes[1]):
            rebater(1)
        if bola.right < 0 or bola.left > WIDTH:
            marcar_ponto()
            return


def marcar_ponto():
    global estado
    quem = 1 if bola.right < 0 else 0
    pontos[quem] = pontos[quem] + 1
    sounds.ponto.play()
    if pontos[quem] >= PONTOS_PARA_VENCER:
        estado = 'fim'
    else:
        # Saca para quem perdeu o ponto.
        sacar(-1 if quem == 1 else 1)


def update(dt):
    global espera
    for faisca in list(faiscas):
        faisca['x'] = faisca['x'] + faisca['vx']
        faisca['y'] = faisca['y'] + faisca['vy']
        faisca['vida'] = faisca['vida'] - 1
        if faisca['vida'] <= 0:
            faiscas.remove(faisca)
    for numero in range(2):
        brilho[numero] = max(brilho[numero] - 1, 0)
    if estado != 'jogando':
        return
    if jogadores == 1:
        mover_raquete(0, keyboard.up or keyboard.w, keyboard.down or keyboard.s)
        pensar()
    else:
        mover_raquete(0, keyboard.w, keyboard.s)
        mover_raquete(1, keyboard.up, keyboard.down)
    for raquete in raquetes:
        raquete.y = min(max(raquete.y, TOPO + raquete.height / 2), FUNDO - raquete.height / 2)
    if espera > 0:
        espera = espera - dt
        return
    mover_bola()


def on_key_down(key):
    global jogadores, estado
    if estado == 'menu':
        if key == keys.UP or key == keys.DOWN:
            jogadores = 3 - jogadores
        if key == keys.SPACE:
            novo_jogo()
    elif estado == 'fim' and key == keys.SPACE:
        estado = 'menu'


def draw():
    screen.fill((10, 20, 40))
    # A quadra: as linhas de cima e de baixo e a rede tracejada.
    screen.draw.filled_rect(Rect((0, TOPO - 6), (WIDTH, 6)), 'white')
    screen.draw.filled_rect(Rect((0, FUNDO), (WIDTH, 6)), 'white')
    for y in range(TOPO + 10, FUNDO, 30):
        screen.draw.filled_rect(Rect((WIDTH / 2 - 3, y), (6, 16)), (90, 100, 130))
    for numero in range(2):
        raquetes[numero].draw()
        if brilho[numero] > 0:
            # A raquete que rebateu brilha por um instante.
            raquete = raquetes[numero]
            borda = brilho[numero] / 2
            screen.draw.rect(Rect((raquete.left - borda, raquete.top - borda), (raquete.width + brilho[numero], raquete.height + brilho[numero])), 'white')
    if estado != 'menu':
        bola.draw()
    for faisca in faiscas:
        screen.draw.filled_circle((faisca['x'], faisca['y']), faisca['vida'] / 6 + 1, faisca['cor'])
    screen.draw.text(str(pontos[0]), center=(WIDTH / 2 - 60, 18), fontsize=40, color='deepskyblue')
    screen.draw.text(str(pontos[1]), center=(WIDTH / 2 + 60, 18), fontsize=40, color='orange')
    if estado == 'menu':
        screen.draw.text('Raquetada', center=(WIDTH / 2, 150), fontsize=96, color='white', owidth=2, ocolor='deepskyblue')
        um = '> 1 jogador <' if jogadores == 1 else '1 jogador'
        dois = '> 2 jogadores <' if jogadores == 2 else '2 jogadores'
        screen.draw.text(um, center=(WIDTH / 2, 260), fontsize=40, color='yellow' if jogadores == 1 else 'white')
        screen.draw.text(dois, center=(WIDTH / 2, 305), fontsize=40, color='yellow' if jogadores == 2 else 'white')
        screen.draw.text('Setas: escolher   Espaço: jogar', center=(WIDTH / 2, 380), fontsize=30, color='white')
    if estado == 'fim':
        if pontos[0] > pontos[1]:
            final = 'O azul venceu!'
        else:
            final = 'O laranja venceu!'
        screen.draw.text(final, center=(WIDTH / 2, 200), fontsize=72, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Espaço: voltar ao começo', center=(WIDTH / 2, 280), fontsize=34, color='white')


pgzrun.go()
