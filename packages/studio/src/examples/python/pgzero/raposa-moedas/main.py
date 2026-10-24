import random
import pgzrun

WIDTH = 640
HEIGHT = 480
TITLE = 'Raposa Caça-Moedas'
VELOCIDADE = 5

raposa = Actor('raposa')
raposa.pos = (100, 300)
moeda = Actor('moeda')
pontos = 0
tempo = 30
fim_de_jogo = False


def colocar_moeda():
    moeda.x = random.randint(40, WIDTH - 40)
    moeda.y = random.randint(100, HEIGHT - 40)


def contar_tempo():
    global tempo, fim_de_jogo
    tempo = tempo - 1
    if tempo == 0:
        fim_de_jogo = True
        clock.unschedule(contar_tempo)
        sounds.fim.play()


def draw():
    screen.blit('fundo', (0, 0))
    moeda.draw()
    raposa.draw()
    screen.draw.text('Moedas: ' + str(pontos), topleft=(16, 12), fontsize=36, color='white', owidth=1.5, ocolor='black')
    screen.draw.text('Tempo: ' + str(tempo), topright=(WIDTH - 16, 12), fontsize=36, color='white', owidth=1.5, ocolor='black')
    if fim_de_jogo:
        screen.draw.filled_rect(Rect((120, 160), (400, 160)), (40, 30, 60))
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 210), fontsize=56, color='yellow')
        screen.draw.text('Você pegou ' + str(pontos) + ' moedas', center=(WIDTH / 2, 270), fontsize=32, color='white')


def update():
    global pontos
    if fim_de_jogo:
        return
    if keyboard.left:
        raposa.x = raposa.x - VELOCIDADE
    if keyboard.right:
        raposa.x = raposa.x + VELOCIDADE
    if keyboard.up:
        raposa.y = raposa.y - VELOCIDADE
    if keyboard.down:
        raposa.y = raposa.y + VELOCIDADE
    if raposa.colliderect(moeda):
        pontos = pontos + 1
        sounds.moeda.play()
        colocar_moeda()


colocar_moeda()
clock.schedule_interval(contar_tempo, 1.0)
pgzrun.go()
