import pgzrun

WIDTH = 600
HEIGHT = 600
TITLE = 'Bolinha Rolante'
# O mapa de alturas é a pista vista de cima: quanto mais claro o vermelho, mais alto.
# Vermelho 0 é o vazio; azul 255 marca chão seguro; verde 255 marca a chegada.
LARGURA_DO_MAPA = 600
ALTURA_DO_MAPA = 640
# Como a pista vista de cima vira a pista inclinada da tela.
TOPO = 20
ACHATAR = 0.6
DEGRAU = 0.8
ACELERACAO = 0.08
ATRITO = 0.98
DESCIDA = 0.004
VELOCIDADE_MAXIMA = 4
TEMPO = 45
INICIO = (300, 60)

bolinha = Actor('bolinha')
bandeira = Actor('bandeira', (300, 0), anchor=('center', 'bottom'))
x = 0
y = 0
vx = 0
vy = 0
salvo = INICIO
queda = 0
# A altura de onde a bolinha caiu (para ela cair dali na tela).
altura_da_queda = 0
quadros_restantes = 0
# 'jogando', 'caindo', 'chegou' ou 'fim'
estado = 'jogando'


def cor(px, py):
    if px < 0 or px >= LARGURA_DO_MAPA or py < 0 or py >= ALTURA_DO_MAPA:
        return (0, 0, 0)
    return images.alturas.get_at((int(px), int(py)))


def altura(px, py):
    return cor(px, py)[0]


def tela_y(py, h):
    return TOPO + py * ACHATAR + (255 - h) * DEGRAU


def recomecar():
    global x, y, vx, vy, salvo, queda, quadros_restantes, estado
    x = INICIO[0]
    y = INICIO[1]
    vx = 0
    vy = 0
    salvo = INICIO
    queda = 0
    quadros_restantes = TEMPO * 60
    estado = 'jogando'


def inclinacao(h, lado1, lado2):
    # O vazio dos lados não puxa: só a rampa faz a bolinha descer.
    if lado1 == 0:
        lado1 = h
    if lado2 == 0:
        lado2 = h
    return lado1 - lado2


def rolar():
    global x, y, vx, vy, salvo, estado, altura_da_queda
    if keyboard.left:
        vx = vx - ACELERACAO
    if keyboard.right:
        vx = vx + ACELERACAO
    if keyboard.up:
        vy = vy - ACELERACAO
    if keyboard.down:
        vy = vy + ACELERACAO
    h = altura(x, y)
    # Na rampa, a bolinha ganha velocidade para o lado mais baixo.
    vx = vx + inclinacao(h, altura(x - 6, y), altura(x + 6, y)) * DESCIDA
    vy = vy + inclinacao(h, altura(x, y - 6), altura(x, y + 6)) * DESCIDA
    vx = max(-VELOCIDADE_MAXIMA, min(VELOCIDADE_MAXIMA, vx * ATRITO))
    vy = max(-VELOCIDADE_MAXIMA, min(VELOCIDADE_MAXIMA, vy * ATRITO))
    x = x + vx
    y = y + vy
    bolinha.angle = bolinha.angle - vx * 8
    aqui = cor(x, y)
    if aqui[0] == 0:
        altura_da_queda = h
        estado = 'caindo'
        sounds.queda.play()
    elif aqui[1] == 255:
        estado = 'chegou'
        sounds.chegada.play()
    elif aqui[2] == 255:
        salvo = (x, y)


def update():
    global quadros_restantes, estado, queda, x, y, vx, vy
    if estado == 'chegou' or estado == 'fim':
        return
    quadros_restantes = quadros_restantes - 1
    if quadros_restantes <= 0:
        estado = 'fim'
        sounds.fim.play()
        return
    if estado == 'caindo':
        # Caiu da pista: depois de cair, volta ao último chão seguro.
        queda = queda + 1
        if queda > 40:
            x = salvo[0]
            y = salvo[1]
            vx = 0
            vy = 0
            queda = 0
            estado = 'jogando'
        return
    rolar()


def draw():
    screen.fill((26, 16, 51))
    screen.blit('pista', (0, 0))
    bandeira.y = tela_y(620, 60)
    bandeira.draw()
    if estado == 'caindo':
        bolinha.pos = (x, tela_y(y, altura_da_queda) - 10 + queda * 6)
    else:
        bolinha.pos = (x, tela_y(y, altura(x, y)) - 10)
    bolinha.draw()
    screen.draw.text('Tempo: ' + str((quadros_restantes + 59) // 60), topleft=(10, 10), fontsize=34, color='white')
    if estado == 'chegou':
        screen.draw.text('Chegou!', center=(WIDTH / 2, 250), fontsize=72, color='yellow', owidth=1, ocolor='black')
        segundos = (quadros_restantes + 59) // 60
        if segundos == 1:
            sobra = 'Sobrou 1 segundo'
        else:
            sobra = 'Sobraram ' + str(segundos) + ' segundos'
        screen.draw.text(sobra, center=(WIDTH / 2, 310), fontsize=36, color='white', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('O tempo acabou!', center=(WIDTH / 2, 280), fontsize=64, color='orange', owidth=1, ocolor='black')
    if estado == 'chegou' or estado == 'fim':
        screen.draw.text('Espaço joga de novo', center=(WIDTH / 2, 360), fontsize=34, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    if (estado == 'chegou' or estado == 'fim') and key == keys.SPACE:
        recomecar()


recomecar()
pgzrun.go()
