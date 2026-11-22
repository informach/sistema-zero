# 📦 Bibliotecas
import random
import pgzrun

# 🎛️ Configurações
WIDTH = 640
HEIGHT = 480
TITLE = 'Acerte a Maçã'


# 🧩 Meus moldes
def sortear_lugar():
    maca.x = random.randint(60, WIDTH - 60)
    maca.y = random.randint(100, HEIGHT - 60)

# ⚙️ Ao iniciar
maca = Actor('maca')
pontos = 0
recorde = 0
jogando = True


sortear_lugar()


# ⚡ Quando acontecer
def on_mouse_down(pos):
    global pontos, recorde, jogando
    if not jogando:
        pontos = 0
        jogando = True
        sortear_lugar()
    elif maca.collidepoint(pos):
        pontos = pontos + 1
        sounds.acerto.play()
        sortear_lugar()
    else:
        sounds.erro.play()
        recorde = max(recorde, pontos)
        jogando = False


# 🔁 Enquanto estiver rodando
def draw():
    screen.fill((126, 200, 240))
    screen.draw.filled_rect(Rect((0, HEIGHT - 40), (WIDTH, 40)), (90, 170, 80))
    if jogando:
        maca.draw()
        screen.draw.text('Pontos: ' + str(pontos), topleft=(16, 12), fontsize=36, color='white', owidth=1.5, ocolor='black')
    else:
        screen.draw.text('Errou!', center=(WIDTH / 2, 170), fontsize=80, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Você acertou ' + str(pontos) + ' maçãs', center=(WIDTH / 2, 250), fontsize=40, color='white')
        screen.draw.text('Recorde: ' + str(recorde), center=(WIDTH / 2, 300), fontsize=32, color='white')
        screen.draw.text('Clique para jogar de novo', center=(WIDTH / 2, 380), fontsize=32, color='white')
pgzrun.go()
