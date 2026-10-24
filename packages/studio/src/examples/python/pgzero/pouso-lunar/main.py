import math
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Pouso Lunar'
GRAVIDADE = 0.02
EMPUXO = 0.05
COMBUSTIVEL = 1000
# Velocidades máximas para pousar sem quebrar.
POUSO_VERTICAL = 1.0
POUSO_LATERAL = 0.6
# As pistas planas: (começo, fim, altura, quanto vale). Elas também estão desenhadas no mapa.
PISTAS = [(120, 200, 470, 2), (360, 420, 540, 3), (620, 670, 300, 5)]

modulo = Actor('modulo')
vx = 0
vy = 0
combustivel = COMBUSTIVEL
pontos = 0
# 'voando', 'pousou' ou 'quebrou'
estado = 'voando'
mensagem = ''


def novo_voo():
    global vx, vy, combustivel, estado, mensagem
    modulo.pos = (80, 60)
    modulo.angle = 0
    vx = 1.0
    vy = 0
    combustivel = COMBUSTIVEL
    estado = 'voando'
    mensagem = ''


def no_chao(x, y):
    # No mapa (que não aparece), o chão é branco e o céu é preto.
    if x < 0 or x >= WIDTH or y < 0:
        return False
    if y >= HEIGHT:
        return True
    return images.mapa.get_at((int(x), int(y)))[0] > 128


def altitude():
    # Desce de pixel em pixel abaixo dos pés até achar o chão.
    altura = 0
    while altura < HEIGHT and not no_chao(modulo.x, modulo.y + 16 + altura):
        altura = altura + 1
    return altura


def pista_embaixo():
    for comeco, fim, altura, vale in PISTAS:
        if comeco <= modulo.x - 12 and modulo.x + 12 <= fim:
            return vale
    return 0


def tocou_o_chao():
    # Os dois pés e o meio do módulo.
    for lado in (-12, 0, 12):
        if no_chao(modulo.x + lado, modulo.y + 16):
            return True
    return False


def update():
    global vx, vy, combustivel, estado, pontos, mensagem
    if estado != 'voando':
        return
    if keyboard.left:
        modulo.angle = modulo.angle + 2
    if keyboard.right:
        modulo.angle = modulo.angle - 2
    # Depois de uma volta inteira, o ângulo volta a ficar entre -180 e 180.
    if modulo.angle > 180:
        modulo.angle = modulo.angle - 360
    if modulo.angle < -180:
        modulo.angle = modulo.angle + 360
    modulo.image = 'modulo'
    if keyboard.up and combustivel > 0:
        # O motor empurra para onde o bico aponta.
        angulo = math.radians(modulo.angle)
        vx = vx - math.sin(angulo) * EMPUXO
        vy = vy - math.cos(angulo) * EMPUXO
        combustivel = combustivel - 1
        modulo.image = 'modulo_fogo'
    vy = vy + GRAVIDADE
    modulo.x = modulo.x + vx
    modulo.y = modulo.y + vy
    if modulo.x < 0:
        modulo.x = WIDTH
    if modulo.x > WIDTH:
        modulo.x = 0
    if tocou_o_chao():
        modulo.image = 'modulo'
        vale = pista_embaixo()
        devagar = vy < POUSO_VERTICAL and abs(vx) < POUSO_LATERAL
        em_pe = abs(modulo.angle) < 10
        if vale > 0 and devagar and em_pe:
            estado = 'pousou'
            ganhou = 50 * vale + combustivel // 10
            pontos = pontos + ganhou
            mensagem = 'Pouso perfeito! +' + str(ganhou)
            sounds.pousou.play()
        else:
            estado = 'quebrou'
            if vale == 0:
                mensagem = 'Aqui não é plano: procure uma pista'
            elif not em_pe:
                mensagem = 'O módulo chegou torto'
            else:
                mensagem = 'Chegou rápido demais'
            sounds.quebrou.play()


def draw():
    screen.blit('ceu', (0, 0))
    screen.blit('terreno', (0, 0))
    for comeco, fim, altura, vale in PISTAS:
        screen.draw.text('x' + str(vale), midtop=((comeco + fim) / 2, altura + 6), fontsize=26, color='yellow')
    if estado == 'quebrou':
        screen.blit('pedacos', (modulo.x - 24, modulo.y - 10))
    else:
        modulo.draw()
    screen.draw.text('Altitude: ' + str(altitude()), topleft=(12, 10), fontsize=26, color='white')
    screen.draw.text('Descendo: ' + str(round(vy, 1)), topleft=(12, 36), fontsize=26, color='white')
    screen.draw.text('Para o lado: ' + str(round(vx, 1)), topleft=(12, 62), fontsize=26, color='white')
    screen.draw.text('Combustível: ' + str(combustivel), topright=(WIDTH - 12, 10), fontsize=26, color='white')
    screen.draw.text('Pontos: ' + str(pontos), topright=(WIDTH - 12, 36), fontsize=26, color='white')
    if estado != 'voando':
        screen.draw.text(mensagem, center=(WIDTH / 2, 200), fontsize=44, color='yellow', owidth=1, ocolor='black')
        screen.draw.text('Espaço voa de novo', center=(WIDTH / 2, 245), fontsize=32, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    if estado != 'voando' and key == keys.SPACE:
        novo_voo()


novo_voo()
pgzrun.go()
