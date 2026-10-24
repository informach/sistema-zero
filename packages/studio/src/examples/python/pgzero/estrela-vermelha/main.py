import random
import pgzrun

WIDTH = 640
HEIGHT = 480
TITLE = 'Estrela Vermelha'
CORES = ['verde', 'azul', 'amarela', 'roxa']
ULTIMA_FASE = 6

estrelas = []
animacoes = []
fase = 1
fim = False
venceu = False


def parar_estrelas():
    for animacao in animacoes:
        if animacao.running:
            animacao.stop()
    animacoes.clear()


def nova_fase():
    estrelas.clear()
    parar_estrelas()
    cores = ['vermelha']
    for numero in range(fase):
        cores.append(random.choice(CORES))
    random.shuffle(cores)
    espaco = WIDTH / (len(cores) + 1)
    x = espaco
    for cor in cores:
        estrela = Actor('estrela_' + cor)
        estrela.x = x
        estrela.y = 0
        estrelas.append(estrela)
        animacoes.append(animate(estrela, duration=10 - fase, y=HEIGHT))
        x = x + espaco


def draw():
    screen.fill((10, 12, 32))
    for estrela in estrelas:
        estrela.draw()
    screen.draw.text('Fase ' + str(fase), topleft=(12, 10), fontsize=32, color='white')
    if fim:
        screen.draw.text('Fim de jogo! Clique para recomeçar', center=(WIDTH / 2, HEIGHT / 2), fontsize=40, color='yellow')
    if venceu:
        screen.draw.text('Você venceu todas as fases!', center=(WIDTH / 2, HEIGHT / 2), fontsize=44, color='yellow')


def update():
    global fim
    if fim or venceu:
        return
    for estrela in estrelas:
        if estrela.y >= HEIGHT:
            fim = True
            parar_estrelas()


def on_mouse_down(pos):
    global fase, fim, venceu
    if fim:
        fase = 1
        fim = False
        nova_fase()
        return
    if venceu:
        return
    for estrela in estrelas:
        if estrela.collidepoint(pos):
            if estrela.image == 'estrela_vermelha':
                sounds.acerto.play()
                if fase == ULTIMA_FASE:
                    venceu = True
                    parar_estrelas()
                else:
                    fase = fase + 1
                    nova_fase()
            else:
                sounds.erro.play()
                fim = True
                parar_estrelas()
            return


nova_fase()
pgzrun.go()
