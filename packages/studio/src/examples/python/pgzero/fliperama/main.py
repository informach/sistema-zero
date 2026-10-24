import math
import random
import pgzrun

WIDTH = 600
HEIGHT = 800
TITLE = 'Fliperama'
RAIO = 10
GRAVIDADE = 0.18
VELOCIDADE_MAXIMA = 19
# Cada quadro a bola anda em 3 passinhos, para não atravessar uma parede fina.
PASSOS = 3
TAMANHO_DO_FLIPER = 80
GROSSURA_DO_FLIPER = 8

# O mapa é uma imagem que não aparece: preto é por onde a bola anda, branco é parede e
# vermelho é um batedor, que joga a bola longe e dá pontos.
flipper_esquerdo = Actor('flipper_esquerdo', (200, 690), anchor=(12, 12))
flipper_direito = Actor('flipper_direito', (400, 690), anchor=(86, 12))
bola = Actor('bola')
bola.vx = 0
bola.vy = 0
pontos = 0
bolas = 3
# 'esperando' (a bola na canaleta), 'jogando' ou 'fim'
estado = 'esperando'
batedor_aceso = 0


def nova_bola():
    global estado
    bola.pos = (558, 748)
    bola.vx = 0
    bola.vy = 0
    estado = 'esperando'


def novo_jogo():
    global pontos, bolas
    pontos = 0
    bolas = 3
    flipper_esquerdo.angle = -30
    flipper_direito.angle = 30
    nova_bola()


def cor_do_mapa(x, y):
    if x < 0 or x >= WIDTH or y < 0 or y >= HEIGHT:
        return (0, 0, 0)
    return images.mapa.get_at((int(x), int(y)))


def bater_nas_paredes():
    global pontos, batedor_aceso
    # Olha 12 pontinhos em volta da bola. Os que caem numa parede apontam para ela:
    # o contrário da soma deles é a direção para fora da parede.
    fora_x = 0
    fora_y = 0
    batedor = False
    for numero in range(12):
        angulo = numero * math.pi / 6
        dx = math.cos(angulo)
        dy = math.sin(angulo)
        cor = cor_do_mapa(bola.x + dx * (RAIO + 1), bola.y + dy * (RAIO + 1))
        if cor[0] > 100:
            fora_x = fora_x - dx
            fora_y = fora_y - dy
            if cor[1] < 100:
                batedor = True
    tamanho = math.hypot(fora_x, fora_y)
    if tamanho == 0:
        return
    fora_x = fora_x / tamanho
    fora_y = fora_y / tamanho
    # Tira a bola de dentro da parede.
    bola.x = bola.x + fora_x
    bola.y = bola.y + fora_y
    contra = bola.vx * fora_x + bola.vy * fora_y
    if contra < 0:
        # Quica: a parte da velocidade que ia contra a parede volta, um pouco mais fraca.
        bola.vx = bola.vx - 1.7 * contra * fora_x
        bola.vy = bola.vy - 1.7 * contra * fora_y
        if batedor:
            bola.vx = bola.vx + fora_x * 7
            bola.vy = bola.vy + fora_y * 7
            pontos = pontos + 100
            batedor_aceso = 8
            sounds.batedor.play()


def ponta_do_flipper(flipper, lado):
    # A ponta do flíper, girando em volta do pino (lado 1: esquerdo, -1: direito).
    angulo = math.radians(flipper.angle)
    return (flipper.x + lado * math.cos(angulo) * TAMANHO_DO_FLIPER, flipper.y - lado * math.sin(angulo) * TAMANHO_DO_FLIPER)


def bater_no_flipper(flipper, lado, subindo):
    ponta_x, ponta_y = ponta_do_flipper(flipper, lado)
    # O ponto do flíper mais perto da bola.
    ax = ponta_x - flipper.x
    ay = ponta_y - flipper.y
    parte = ((bola.x - flipper.x) * ax + (bola.y - flipper.y) * ay) / (ax * ax + ay * ay)
    parte = max(0, min(1, parte))
    perto_x = flipper.x + ax * parte
    perto_y = flipper.y + ay * parte
    distancia = math.hypot(bola.x - perto_x, bola.y - perto_y)
    if distancia == 0 or distancia >= RAIO + GROSSURA_DO_FLIPER:
        return
    fora_x = (bola.x - perto_x) / distancia
    fora_y = (bola.y - perto_y) / distancia
    bola.x = perto_x + fora_x * (RAIO + GROSSURA_DO_FLIPER)
    bola.y = perto_y + fora_y * (RAIO + GROSSURA_DO_FLIPER)
    contra = bola.vx * fora_x + bola.vy * fora_y
    if contra < 0:
        bola.vx = bola.vx - 1.4 * contra * fora_x
        bola.vy = bola.vy - 1.4 * contra * fora_y
    if subindo:
        # O flíper subindo dá um tranco; perto da ponta ele anda mais, então o tranco é maior.
        bola.vx = bola.vx + fora_x * (4 + 9 * parte)
        bola.vy = bola.vy + fora_y * (4 + 9 * parte)
        sounds.flipper.play()


def girar_flippers():
    # Devolve se cada flíper está subindo neste quadro.
    antes_esquerdo = flipper_esquerdo.angle
    antes_direito = flipper_direito.angle
    if keyboard.left:
        flipper_esquerdo.angle = min(flipper_esquerdo.angle + 20, 30)
    else:
        flipper_esquerdo.angle = max(flipper_esquerdo.angle - 20, -30)
    if keyboard.right:
        flipper_direito.angle = max(flipper_direito.angle - 20, -30)
    else:
        flipper_direito.angle = min(flipper_direito.angle + 20, 30)
    return flipper_esquerdo.angle > antes_esquerdo, flipper_direito.angle < antes_direito


def limitar_velocidade():
    velocidade = math.hypot(bola.vx, bola.vy)
    if velocidade > VELOCIDADE_MAXIMA:
        bola.vx = bola.vx / velocidade * VELOCIDADE_MAXIMA
        bola.vy = bola.vy / velocidade * VELOCIDADE_MAXIMA


def update():
    global estado, bolas, batedor_aceso
    if estado == 'fim':
        return
    subindo_esquerdo, subindo_direito = girar_flippers()
    batedor_aceso = max(0, batedor_aceso - 1)
    bola.vy = bola.vy + GRAVIDADE
    for passo in range(PASSOS):
        limitar_velocidade()
        bola.x = bola.x + bola.vx / PASSOS
        bola.y = bola.y + bola.vy / PASSOS
        bater_nas_paredes()
        if bola.x > 520 and bola.y < 160 and bola.vx > 0:
            # A cancela: a bola sai da canaleta para a mesa, mas não entra de volta por cima.
            bola.vx = -bola.vx
        bater_no_flipper(flipper_esquerdo, 1, subindo_esquerdo)
        bater_no_flipper(flipper_direito, -1, subindo_direito)
    if bola.x > 532 and bola.y > 740 and abs(bola.vy) < 1:
        # Voltou para a canaleta e parou na mola: dá para lançar de novo.
        nova_bola()
    if bola.y > HEIGHT + RAIO:
        # Caiu pelo meio dos flíperes.
        bolas = bolas - 1
        sounds.perdeu.play()
        if bolas == 0:
            estado = 'fim'
        else:
            nova_bola()


def draw():
    screen.blit('mesa', (0, 0))
    if batedor_aceso > 0:
        screen.blit('brilho', (0, 0))
    flipper_esquerdo.draw()
    flipper_direito.draw()
    if estado != 'fim':
        bola.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(24, 22), fontsize=32, color='white')
    screen.draw.text('Bolas: ' + str(bolas), topright=(500, 22), fontsize=32, color='white')
    if estado == 'esperando':
        screen.draw.text('Espaço lança a bola', center=(300, 560), fontsize=34, color='yellow')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(300, 380), fontsize=64, color='orange', owidth=1, ocolor='black')
        screen.draw.text('Espaço joga de novo', center=(300, 440), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global estado
    if key != keys.SPACE:
        return
    if estado == 'fim':
        novo_jogo()
    elif estado == 'esperando':
        # A mola: cada lançamento sai com uma força um pouco diferente.
        bola.vy = -random.randint(175, 190) / 10
        estado = 'jogando'
        sounds.lancar.play()


novo_jogo()
pgzrun.go()
