import random
import pgzrun

WIDTH = 800
HEIGHT = 450
TITLE = 'Corredor do Kung Fu'
CHAO = 400
# O corredor é mais largo que a tela: andar move o fundo, e o herói fica no meio.
COMPRIMENTO = 2000
PASSO = 3
ALCANCE_DO_SOCO = 70
ALCANCE_DO_CHUTE = 100
# Quadros que cada golpe dura (o herói não anda enquanto golpeia).
TEMPO_DO_SOCO = 10
TEMPO_DO_CHUTE = 20

heroi = Actor('heroi_parado_esquerda', (WIDTH / 2, CHAO), anchor=('center', 'bottom'))
capangas = []
lado = 'esquerda'
# '', 'soco' ou 'chute'
golpe = ''
tempo_do_golpe = 0
fundo_x = 0
quadros = 0
pontos = 0
vidas = 3
andar = 1
piscando = 0
# 'jogando', 'passou' ou 'fim'
estado = 'jogando'


def novo_andar():
    global fundo_x, lado, golpe, tempo_do_golpe, piscando, estado
    # O herói começa na porta, na ponta direita do corredor; a escada fica na esquerda.
    fundo_x = WIDTH - COMPRIMENTO
    lado = 'esquerda'
    golpe = ''
    tempo_do_golpe = 0
    piscando = 0
    capangas.clear()
    estado = 'jogando'


def novo_jogo():
    global pontos, vidas, andar
    pontos = 0
    vidas = 3
    andar = 1
    novo_andar()


def soltar_capanga():
    if random.randint(0, 1) == 0:
        capanga = Actor('capanga_andando1_direita', (-50, CHAO), anchor=('center', 'bottom'))
        capanga.lado = 'direita'
    else:
        capanga = Actor('capanga_andando1_esquerda', (WIDTH + 50, CHAO), anchor=('center', 'bottom'))
        capanga.lado = 'esquerda'
    capanga.caindo = False
    capangas.append(capanga)


def caminhar(passo, novo_lado):
    global fundo_x, lado
    lado = novo_lado
    # O fundo só anda até as pontas do corredor; os capangas andam junto com ele.
    if fundo_x + passo >= WIDTH - COMPRIMENTO and fundo_x + passo <= 0:
        fundo_x = fundo_x + passo
        for capanga in capangas:
            capanga.x = capanga.x + passo
    quadro = quadros // 8 % 4 + 1
    heroi.image = 'heroi_andando' + str(quadro) + '_' + lado


def golpear():
    global pontos
    alcance = ALCANCE_DO_SOCO
    if golpe == 'chute':
        alcance = ALCANCE_DO_CHUTE
    # Acerta o primeiro capanga que estiver na frente do herói, perto o bastante.
    for capanga in capangas:
        distancia = capanga.x - heroi.x
        if lado == 'esquerda':
            distancia = -distancia
        if not capanga.caindo and distancia > 0 and distancia <= alcance:
            capanga.caindo = True
            capanga.image = 'capanga_caindo_' + capanga.lado
            pontos = pontos + 100
            sounds.golpe.play()
            return


def mover_capangas():
    global vidas, piscando, estado
    velocidade = 1 + andar * 0.5
    quadro = quadros // 8 % 4 + 1
    for capanga in list(capangas):
        if capanga.caindo:
            capanga.y = capanga.y + 6
            if capanga.top > HEIGHT:
                capangas.remove(capanga)
        else:
            if capanga.lado == 'direita':
                capanga.x = capanga.x + velocidade
            else:
                capanga.x = capanga.x - velocidade
            capanga.image = 'capanga_andando' + str(quadro) + '_' + capanga.lado
            if capanga.x < -100 or capanga.x > WIDTH + 100:
                capangas.remove(capanga)
            elif abs(capanga.x - heroi.x) < 30 and piscando == 0:
                # O capanga que alcança o herói custa uma vida.
                capangas.remove(capanga)
                vidas = vidas - 1
                piscando = 90
                sounds.ai.play()
                if vidas == 0:
                    estado = 'fim'


def update():
    global quadros, tempo_do_golpe, golpe, piscando, estado
    if estado != 'jogando':
        return
    quadros = quadros + 1
    if piscando > 0:
        piscando = piscando - 1
    if tempo_do_golpe > 0:
        tempo_do_golpe = tempo_do_golpe - 1
        heroi.image = 'heroi_' + golpe + '_' + lado
        if tempo_do_golpe == 0:
            golpe = ''
    elif keyboard.left:
        caminhar(PASSO, 'esquerda')
    elif keyboard.right:
        caminhar(-PASSO, 'direita')
    else:
        heroi.image = 'heroi_parado_' + lado
    # A cada andar, mais capangas ao mesmo tempo e mais depressa.
    if len(capangas) < 2 + andar and random.randint(1, 120) <= andar + 1:
        soltar_capanga()
    mover_capangas()
    if estado == 'jogando' and fundo_x >= 0:
        estado = 'passou'
        sounds.escada.play()


def draw():
    screen.fill((25, 18, 30))
    screen.blit('fundo', (fundo_x, 40))
    for capanga in capangas:
        capanga.draw()
    if estado != 'fim' and piscando // 6 % 2 == 0:
        heroi.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(10, 10), fontsize=30, color='white')
    screen.draw.text('Andar ' + str(andar) + '   Escada: ' + str(-fundo_x // 10) + ' m', midtop=(WIDTH / 2, 10), fontsize=30, color='yellow')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 10, 10), fontsize=30, color='white')
    if estado == 'passou':
        screen.draw.text('Você chegou à escada!', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='yellow', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='orange', owidth=1, ocolor='black')
    if estado != 'jogando':
        screen.draw.text('Espaço continua', center=(WIDTH / 2, HEIGHT / 2 + 50), fontsize=34, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global golpe, tempo_do_golpe, andar
    if estado == 'passou':
        if key == keys.SPACE:
            andar = andar + 1
            novo_andar()
        return
    if estado == 'fim':
        if key == keys.SPACE:
            novo_jogo()
        return
    if tempo_do_golpe > 0:
        return
    # A dá um soco (rápido e curto); S dá um chute (mais longe, mais demorado).
    if key == keys.A:
        golpe = 'soco'
        tempo_do_golpe = TEMPO_DO_SOCO
        golpear()
    elif key == keys.S:
        golpe = 'chute'
        tempo_do_golpe = TEMPO_DO_CHUTE
        golpear()


novo_jogo()
pgzrun.go()
