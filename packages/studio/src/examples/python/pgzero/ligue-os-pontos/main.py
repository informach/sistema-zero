import random
import pgzrun

WIDTH = 640
HEIGHT = 480
TITLE = 'Ligue os Pontos'
QUANTIDADE = 10

pontos = []
linhas = []
proximo = 0
terminou = False


def novo_desenho():
    global proximo, terminou
    pontos.clear()
    linhas.clear()
    proximo = 0
    terminou = False
    for numero in range(QUANTIDADE):
        ponto = Actor('ponto')
        sortear_lugar_livre(ponto)
        pontos.append(ponto)


def sortear_lugar_livre(ponto):
    # Sorteia de novo enquanto o ponto cair perto demais de outro: os números não se cobrem.
    perto = True
    while perto:
        ponto.x = random.randint(40, WIDTH - 40)
        ponto.y = random.randint(60, HEIGHT - 40)
        perto = False
        for outro in pontos:
            if ponto.distance_to(outro) < 60:
                perto = True


def draw():
    screen.fill((250, 246, 232))
    for linha in linhas:
        screen.draw.line(linha[0], linha[1], (60, 60, 160))
    numero = 1
    for ponto in pontos:
        ponto.draw()
        screen.draw.text(str(numero), center=(ponto.x, ponto.y - 22), fontsize=26, color='black')
        numero = numero + 1
    if terminou:
        screen.draw.text('Você ligou todos os pontos!', center=(WIDTH / 2, 30), fontsize=40, color=(30, 120, 60))
        screen.draw.text('Aperte espaço para outro desenho', center=(WIDTH / 2, HEIGHT - 20), fontsize=26, color='black')


def on_mouse_down(pos):
    global proximo, terminou
    if terminou:
        return
    if pontos[proximo].collidepoint(pos):
        if proximo > 0:
            linhas.append((pontos[proximo - 1].pos, pontos[proximo].pos))
        proximo = proximo + 1
        sounds.ponto.play()
        if proximo == QUANTIDADE:
            terminou = True
            sounds.fim.play()
    else:
        linhas.clear()
        proximo = 0
        sounds.erro.play()


def on_key_down(key):
    if key == keys.SPACE and terminou:
        novo_desenho()


novo_desenho()
pgzrun.go()
