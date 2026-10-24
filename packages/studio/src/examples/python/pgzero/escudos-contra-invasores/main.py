import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Escudos contra Invasores'
TAMANHO = 6
ESCUDO_Y = 440
ESCUDO_X = [110, 290, 470, 650]

# O desenho de um escudo: cada # é um pedacinho que um tiro pode arrancar.
FORMA = [
    '...########...',
    '..##########..',
    '.############.',
    '##############',
    '##############',
    '##############',
    '####......####',
    '###........###',
]

escudos = []
invasores = []
bombas = []
explosoes = []
canhao = Actor('canhao')
tiro = Actor('tiro')
marcha = 1
vidas = 3
pontos = 0
venceu = False


def montar_escudos():
    escudos.clear()
    for numero in range(len(ESCUDO_X)):
        grade = []
        for linha in FORMA:
            pedacos = []
            for letra in linha:
                pedacos.append(letra == '#')
            grade.append(pedacos)
        escudos.append(grade)


def montar_invasores():
    invasores.clear()
    tipos = ['invasor_a', 'invasor_b', 'invasor_c']
    for fila in range(3):
        for coluna in range(8):
            invasor = Actor(tipos[fila])
            invasor.pos = (150 + coluna * 70, 90 + fila * 55)
            invasores.append(invasor)


def novo_jogo():
    global vidas, pontos, venceu, marcha
    vidas = 3
    pontos = 0
    venceu = False
    marcha = 1
    bombas.clear()
    explosoes.clear()
    montar_escudos()
    montar_invasores()
    canhao.pos = (WIDTH / 2, 560)
    tiro.y = -20


def estragar(numero, linha, coluna):
    # A explosão arranca o pedaço atingido e alguns vizinhos, sorteados.
    grade = escudos[numero]
    for mais_linha in range(-1, 2):
        for mais_coluna in range(-1, 2):
            perto_linha = linha + mais_linha
            perto_coluna = coluna + mais_coluna
            if 0 <= perto_linha < len(grade) and 0 <= perto_coluna < len(grade[0]):
                if mais_linha == 0 and mais_coluna == 0 or random.randint(1, 3) > 1:
                    grade[perto_linha][perto_coluna] = False


def bateu_no_escudo(x, y):
    for numero in range(len(escudos)):
        coluna = int((x - ESCUDO_X[numero]) // TAMANHO)
        linha = int((y - ESCUDO_Y) // TAMANHO)
        if 0 <= linha < len(FORMA) and 0 <= coluna < len(FORMA[0]):
            if escudos[numero][linha][coluna]:
                estragar(numero, linha, coluna)
                explodir(x, y)
                return True
    return False


def explodir(x, y):
    explosao = Actor('explosao')
    explosao.pos = (x, y)
    explosoes.append(explosao)
    clock.schedule(apagar_explosao, 0.15)


def apagar_explosao():
    if explosoes:
        explosoes.pop(0)


def soltar_bomba():
    if invasores and not venceu and vidas > 0:
        invasor = random.choice(invasores)
        bomba = Actor('bomba')
        bomba.midtop = invasor.midbottom
        bombas.append(bomba)


def marchar():
    global marcha
    descer = False
    for invasor in invasores:
        invasor.x = invasor.x + marcha
        if invasor.right > WIDTH - 10 or invasor.left < 10:
            descer = True
    if descer:
        marcha = -marcha
        for invasor in invasores:
            invasor.y = invasor.y + 16


def draw():
    screen.blit('fundo', (0, 0))
    for numero in range(len(escudos)):
        grade = escudos[numero]
        for linha in range(len(grade)):
            for coluna in range(len(grade[linha])):
                if grade[linha][coluna]:
                    x = ESCUDO_X[numero] + coluna * TAMANHO
                    y = ESCUDO_Y + linha * TAMANHO
                    screen.draw.filled_rect(Rect((x, y), (TAMANHO, TAMANHO)), (60, 220, 90))
    for invasor in invasores:
        invasor.draw()
    for bomba in bombas:
        bomba.draw()
    for explosao in explosoes:
        explosao.draw()
    tiro.draw()
    canhao.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(12, 8), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 12, 8), fontsize=30, color='white')
    if venceu:
        screen.draw.text('A Terra está salva!', center=(WIDTH / 2, 300), fontsize=56, color='yellow')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, 300), fontsize=48, color='orange')


def update():
    global vidas, pontos, venceu
    if venceu or vidas == 0:
        return
    if keyboard.left and canhao.left > 0:
        canhao.x = canhao.x - 5
    if keyboard.right and canhao.right < WIDTH:
        canhao.x = canhao.x + 5
    marchar()
    if tiro.y > -20:
        tiro.y = tiro.y - 9
        if bateu_no_escudo(tiro.x, tiro.top):
            tiro.y = -20
    for invasor in list(invasores):
        if invasor.colliderect(tiro):
            invasores.remove(invasor)
            tiro.y = -20
            pontos = pontos + 10
            sounds.acerto.play()
        elif invasor.bottom > ESCUDO_Y:
            vidas = 0
    for bomba in list(bombas):
        bomba.y = bomba.y + 4
        if bateu_no_escudo(bomba.x, bomba.bottom) or bomba.top > HEIGHT:
            bombas.remove(bomba)
        elif bomba.colliderect(canhao):
            bombas.remove(bomba)
            explodir(canhao.x, canhao.y)
            vidas = vidas - 1
            sounds.dano.play()
    if not invasores:
        venceu = True
        sounds.vitoria.play()


def on_key_down(key):
    if key != keys.SPACE:
        return
    if venceu or vidas == 0:
        novo_jogo()
    elif tiro.y <= -20:
        # Um tiro de cada vez, como nos fliperamas antigos.
        tiro.midbottom = canhao.midtop
        sounds.tiro.play()


novo_jogo()
clock.schedule_interval(soltar_bomba, 0.7)
pgzrun.go()
