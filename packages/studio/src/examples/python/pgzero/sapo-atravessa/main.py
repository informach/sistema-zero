import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Sapo Atravessa'
PULO = 40
INICIO = (400, 580)
CHEGADA_Y = 100
TEMPO_POR_SAPO = 30
# Cada faixa: (altura, velocidade, desenho, quantos). Velocidade negativa vai para a esquerda.
ESTRADA = [
    (540, -1.5, 'carro_amarelo', 3),
    (500, 2.0, 'trator', 3),
    (460, -2.5, 'carro_rosa', 3),
    (420, 1.5, 'caminhao', 2),
    (380, -3.0, 'carro_de_corrida', 2),
]
RIO = [
    (300, -1.0, 'tartarugas', 4),
    (260, 1.5, 'tronco', 3),
    (220, 2.5, 'tronco_grande', 2),
    (180, -1.5, 'tartarugas', 4),
    (140, 2.0, 'tronco', 3),
]
TOCAS = [80, 240, 400, 560, 720]

sapo = Actor('sapo')
carros = []
boias = []
ocupadas = []
vidas = 3
pontos = 0
fase = 1
tempo = TEMPO_POR_SAPO
# A linha mais alta que este sapo já alcançou: só pulo novo para cima dá pontos.
mais_alto = INICIO[1]
aviso = ''
mancha = Actor('mancha', (-100, -100))


def arrumar(coisa, altura, velocidade, numero, quantos):
    # Espalha as coisas da faixa pela largura da tela.
    coisa.x = numero * WIDTH / quantos + altura % 97
    coisa.y = altura
    # A cada fase tudo anda um pouco mais rápido.
    coisa.velocidade = velocidade * (1 + 0.25 * (fase - 1))


def nova_fase():
    ocupadas.clear()
    for toca in TOCAS:
        ocupadas.append(False)
    carros.clear()
    for altura, velocidade, desenho, quantos in ESTRADA:
        for numero in range(quantos):
            carro = Actor(desenho)
            arrumar(carro, altura, velocidade, numero, quantos)
            carros.append(carro)
    boias.clear()
    for altura, velocidade, desenho, quantos in RIO:
        for numero in range(quantos):
            boia = Actor(desenho)
            arrumar(boia, altura, velocidade, numero, quantos)
            boias.append(boia)
    novo_sapo()


def novo_jogo():
    global vidas, pontos, fase
    vidas = 3
    pontos = 0
    fase = 1
    nova_fase()


def novo_sapo():
    global tempo, mais_alto
    sapo.pos = INICIO
    sapo.angle = 0
    sapo.image = 'sapo'
    tempo = TEMPO_POR_SAPO
    mais_alto = INICIO[1]


def morrer(motivo):
    global vidas, aviso
    vidas = vidas - 1
    aviso = motivo
    mancha.pos = sapo.pos
    sounds.morreu.play()
    clock.schedule_unique(apagar_aviso, 1.5)
    novo_sapo()


def apagar_aviso():
    global aviso
    aviso = ''
    mancha.pos = (-100, -100)


def andar(coisa):
    coisa.x = coisa.x + coisa.velocidade
    # Saindo de um lado, volta pelo outro.
    if coisa.velocidade > 0 and coisa.left > WIDTH:
        coisa.right = 0
    if coisa.velocidade < 0 and coisa.right < 0:
        coisa.left = WIDTH


def na_mesma_linha(coisa):
    return abs(coisa.y - sapo.y) < 5 and abs(coisa.x - sapo.x) < coisa.width / 2 + 10


def chegar():
    global pontos, fase, aviso
    for numero in range(len(TOCAS)):
        if abs(sapo.x - TOCAS[numero]) < 24 and not ocupadas[numero]:
            ocupadas[numero] = True
            pontos = pontos + 50 + int(tempo) * 2
            sounds.toca.play()
            # Nenhuma toca vazia: fase nova.
            if False not in ocupadas:
                fase = fase + 1
                aviso = 'Fase ' + str(fase) + '!'
                clock.schedule_unique(apagar_aviso, 1.5)
                nova_fase()
            else:
                novo_sapo()
            return
    morrer('Bateu na margem: mire numa toca vazia')


def update(dt):
    global tempo
    if vidas == 0:
        return
    for carro in carros:
        andar(carro)
    for boia in boias:
        andar(boia)
    tempo = tempo - dt
    if tempo <= 0:
        morrer('O tempo acabou')
        return
    if sapo.y in [faixa[0] for faixa in ESTRADA]:
        for carro in carros:
            if na_mesma_linha(carro):
                morrer('Atropelado!')
                return
    if sapo.y in [faixa[0] for faixa in RIO]:
        embaixo = None
        for boia in boias:
            if na_mesma_linha(boia):
                embaixo = boia
        if embaixo is None:
            morrer('Caiu na água!')
            return
        # Em cima do tronco ou das tartarugas, o sapo é levado junto.
        sapo.x = sapo.x + embaixo.velocidade
        if sapo.x < 0 or sapo.x > WIDTH:
            morrer('Foi levado para fora do rio!')
            return
    if sapo.y == CHEGADA_Y:
        chegar()


def pular_de_volta():
    sapo.image = 'sapo'


def on_key_down(key):
    global pontos, mais_alto
    if vidas == 0:
        if key == keys.SPACE:
            novo_jogo()
        return
    x = sapo.x
    y = sapo.y
    if key == keys.UP:
        y = y - PULO
        sapo.angle = 0
    elif key == keys.DOWN:
        y = y + PULO
        sapo.angle = 180
    elif key == keys.LEFT:
        x = x - PULO
        sapo.angle = 90
    elif key == keys.RIGHT:
        x = x + PULO
        sapo.angle = 270
    else:
        return
    if y >= CHEGADA_Y and y <= INICIO[1] and x >= 20 and x <= WIDTH - 20:
        sapo.pos = (x, y)
        sapo.image = 'sapo_pulando'
        clock.schedule(pular_de_volta, 0.15)
        sounds.pulo.play()
        if y < mais_alto:
            mais_alto = y
            pontos = pontos + 10


def draw():
    screen.blit('fundo', (0, 0))
    for numero in range(len(TOCAS)):
        if ocupadas[numero]:
            screen.blit('sapo_na_toca', (TOCAS[numero] - 20, CHEGADA_Y - 20))
    for boia in boias:
        boia.draw()
    for carro in carros:
        carro.draw()
    mancha.draw()
    if vidas > 0:
        sapo.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 10), fontsize=32, color='white')
    screen.draw.text('Vidas: ' + str(vidas), midtop=(WIDTH / 2, 10), fontsize=32, color='white')
    screen.draw.text('Fase ' + str(fase), topright=(WIDTH - 12, 10), fontsize=32, color='white')
    # A barra do tempo encolhe enquanto o sapo não chega.
    screen.draw.filled_rect(Rect((12, 44), (tempo * 8, 10)), 'yellow')
    if aviso != '':
        screen.draw.text(aviso, center=(WIDTH / 2, 360), fontsize=40, color='yellow', owidth=1, ocolor='black')
    if vidas == 0:
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 300), fontsize=64, color='orange', owidth=1, ocolor='black')
        screen.draw.text('Espaço joga de novo', center=(WIDTH / 2, 350), fontsize=36, color='white', owidth=1, ocolor='black')


novo_jogo()
pgzrun.go()
