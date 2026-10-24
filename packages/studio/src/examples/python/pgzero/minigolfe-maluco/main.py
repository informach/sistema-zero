import math
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Minigolfe Maluco'
RAIO = 6
ATRITO = 0.985

# Cada buraco tem uma imagem que aparece e um mapa que não aparece. No mapa:
# branco é grama, vermelho é parede deitada, azul é parede em pé, verde é água e preto é o buraco.
INICIOS = [(120, 190), (110, 500), (100, 330)]
PARES = [2, 3, 3]

seta = Actor('seta', anchor=(0, 9))
bolinha = Actor('bolinha')
bolinha.vx = 0
bolinha.vy = 0
buraco = 0
forca = 5
tacadas = 0
placar = []
antes_da_tacada = (0, 0)
aviso = ''
# 'mirando', 'rolando', 'acertou' ou 'fim'
estado = 'mirando'


def novo_jogo():
    global buraco
    placar.clear()
    buraco = 0
    comecar_buraco()


def comecar_buraco():
    global tacadas, estado, aviso
    bolinha.pos = INICIOS[buraco]
    bolinha.vx = 0
    bolinha.vy = 0
    seta.angle = 0
    tacadas = 0
    aviso = ''
    estado = 'mirando'


def cor_do_mapa(x, y):
    ponto = (int(x), int(y))
    if buraco == 0:
        return images.mapa1.get_at(ponto)
    if buraco == 1:
        return images.mapa2.get_at(ponto)
    return images.mapa3.get_at(ponto)


def bater_nas_paredes():
    # Olha 8 pontinhos em volta da bola.
    for numero in range(8):
        angulo = numero * math.pi / 4
        dx = math.cos(angulo)
        dy = math.sin(angulo)
        cor = cor_do_mapa(bolinha.x + dx * (RAIO + 1), bolinha.y + dy * (RAIO + 1))
        vermelho = cor[0] > 200 and cor[2] < 100
        azul = cor[2] > 200 and cor[0] < 100
        # Parede deitada inverte o movimento para cima e para baixo, se a bola for contra ela.
        if vermelho and dy * bolinha.vy > 0:
            bolinha.vy = -bolinha.vy
            sounds.toque.play()
        # Parede em pé inverte o movimento para os lados.
        if azul and dx * bolinha.vx > 0:
            bolinha.vx = -bolinha.vx
            sounds.toque.play()


def olhar_o_chao():
    global estado, tacadas, aviso
    cor = cor_do_mapa(bolinha.x, bolinha.y)
    if cor[0] < 50 and cor[1] < 50 and cor[2] < 50:
        placar.append(tacadas)
        estado = 'acertou'
        sounds.buraco.play()
        clock.schedule(proximo_buraco, 2)
    elif cor[1] > 200 and cor[0] < 100:
        # Caiu na água: volta para onde estava e ganha uma tacada a mais.
        bolinha.pos = antes_da_tacada
        bolinha.vx = 0
        bolinha.vy = 0
        tacadas = tacadas + 1
        aviso = 'Caiu na água! Mais uma tacada.'
        sounds.agua.play()


def proximo_buraco():
    global buraco, estado
    if buraco == len(INICIOS) - 1:
        estado = 'fim'
        sounds.vitoria.play()
    else:
        buraco = buraco + 1
        comecar_buraco()


def tacar():
    global tacadas, estado, antes_da_tacada, aviso
    angulo = math.radians(seta.angle)
    bolinha.vx = math.cos(angulo) * forca
    bolinha.vy = -math.sin(angulo) * forca
    antes_da_tacada = bolinha.pos
    tacadas = tacadas + 1
    aviso = ''
    estado = 'rolando'
    sounds.tacada.play()


def update():
    global forca, estado
    if estado == 'mirando':
        if keyboard.left:
            seta.angle = seta.angle + 3
        if keyboard.right:
            seta.angle = seta.angle - 3
    if estado == 'rolando':
        # Dois passinhos por quadro, para a bola não pular uma parede fina.
        for passo in range(2):
            bolinha.x = bolinha.x + bolinha.vx / 2
            bolinha.y = bolinha.y + bolinha.vy / 2
            bater_nas_paredes()
            olhar_o_chao()
            if estado != 'rolando':
                return
        bolinha.vx = bolinha.vx * ATRITO
        bolinha.vy = bolinha.vy * ATRITO
        if abs(bolinha.vx) + abs(bolinha.vy) < 0.1:
            bolinha.vx = 0
            bolinha.vy = 0
            estado = 'mirando'


def draw():
    screen.blit('buraco' + str(buraco + 1), (0, 0))
    if estado != 'acertou':
        bolinha.draw()
    if estado == 'mirando':
        seta.pos = bolinha.pos
        seta.draw()
    texto = 'Buraco ' + str(buraco + 1) + ' de ' + str(len(INICIOS)) + '    Par ' + str(PARES[buraco]) + '    Tacadas: ' + str(tacadas)
    screen.draw.text(texto, topleft=(16, 10), fontsize=30, color='white')
    screen.draw.text('Força', topleft=(16, 44), fontsize=24, color='white')
    screen.draw.filled_rect(Rect((80, 46), (forca * 30, 16)), 'orange')
    screen.draw.rect(Rect((80, 46), (300, 16)), 'white')
    if aviso != '':
        screen.draw.text(aviso, midtop=(560, 42), fontsize=26, color='lightblue')
    if estado == 'acertou':
        screen.draw.text('No buraco em ' + str(tacadas) + ' tacadas!', center=(400, 300), fontsize=56, color='yellow', owidth=1, ocolor='black')
    if estado == 'fim':
        total = 0
        for numero in placar:
            total = total + numero
        par_total = 0
        for numero in PARES:
            par_total = par_total + numero
        screen.draw.text('Total: ' + str(total) + ' tacadas (par ' + str(par_total) + ')', center=(400, 280), fontsize=52, color='yellow', owidth=1, ocolor='black')
        screen.draw.text('Espaço joga de novo', center=(400, 340), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global forca
    if estado == 'fim':
        if key == keys.SPACE:
            novo_jogo()
        return
    if estado != 'mirando':
        return
    if key == keys.UP and forca < 10:
        forca = forca + 1
    elif key == keys.DOWN and forca > 1:
        forca = forca - 1
    elif key == keys.SPACE or key == keys.RETURN:
        tacar()


novo_jogo()
pgzrun.go()
