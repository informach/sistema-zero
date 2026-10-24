import random
import pgzrun

WIDTH = 800
HEIGHT = 500
TITLE = 'Duelo por Turnos'
# Segundos entre uma ação e a próxima, para dar tempo de ler o que aconteceu.
ESPERA = 1.2
POCOES = 2

heroi = Actor('heroi', (220, 290))
heroi.nome = 'Você'
heroi.vida_maxima = 100
dragao = Actor('dragao', (580, 270))
dragao.nome = 'O dragão'
dragao.vida_maxima = 120
# Quem luta, na ordem das vezes.
lutadores = [heroi, dragao]
golpe = Actor('golpe')
escudo = Actor('escudo')
mostrar_golpe = 0
mensagem = ''
# A posição de quem joga agora na lista de lutadores.
vez = 0
# Enquanto uma vez está acontecendo, as teclas não escolhem nada.
esperando = False
pocoes = 0
# 'lutando', 'venceu' ou 'perdeu'
estado = 'lutando'


def nova_luta():
    global vez, esperando, pocoes, mensagem, estado
    clock.unschedule(proxima_vez)
    clock.unschedule(vez_do_dragao)
    for lutador in lutadores:
        lutador.vida = lutador.vida_maxima
        lutador.defendendo = False
    pocoes = POCOES
    vez = 0
    esperando = False
    mensagem = 'Sua vez! Escolha uma ação.'
    estado = 'lutando'


def atacar(atacante, alvo):
    global mensagem, mostrar_golpe
    atacante.defendendo = False
    # Quem se defende com o escudo leva só metade do golpe.
    if alvo.defendendo:
        dano = random.randint(10, 19)
    else:
        dano = random.randint(20, 39)
    alvo.vida = max(0, alvo.vida - dano)
    golpe.pos = alvo.pos
    mostrar_golpe = 30
    mensagem = atacante.nome + ' ataca! ' + alvo.nome + ' perde ' + str(dano) + '.'
    sounds.golpe.play()


def defender(lutador):
    global mensagem
    lutador.defendendo = True
    mensagem = lutador.nome + ' se protege com o escudo.'
    sounds.escudo.play()


def tomar_pocao():
    global pocoes, mensagem
    pocoes = pocoes - 1
    heroi.defendendo = False
    cura = random.randint(25, 35)
    heroi.vida = min(heroi.vida_maxima, heroi.vida + cura)
    mensagem = 'Você toma uma poção e recupera ' + str(cura) + '.'
    sounds.pocao.play()


def terminar_vez():
    global estado, mensagem
    # Depois de cada ação, confere se a luta acabou; se não, a vez passa adiante.
    if dragao.vida == 0:
        estado = 'venceu'
        mensagem = 'O dragão foi derrotado!'
        sounds.vitoria.play()
    elif heroi.vida == 0:
        estado = 'perdeu'
        mensagem = 'O dragão venceu desta vez.'
        sounds.derrota.play()
    else:
        clock.schedule(proxima_vez, ESPERA)


def proxima_vez():
    global vez, esperando, mensagem
    vez = (vez + 1) % len(lutadores)
    if vez == 0:
        esperando = False
        mensagem = 'Sua vez! Escolha uma ação.'
    else:
        mensagem = 'Vez do dragão...'
        clock.schedule(vez_do_dragao, ESPERA)


def vez_do_dragao():
    # O computador escolhe ao acaso: ataca duas vezes em cada três.
    if random.choice(['atacar', 'atacar', 'defender']) == 'atacar':
        atacar(dragao, heroi)
    else:
        defender(dragao)
    terminar_vez()


def update():
    global mostrar_golpe
    if mostrar_golpe > 0:
        mostrar_golpe = mostrar_golpe - 1


def desenhar_vida(lutador, x, y):
    screen.draw.text(lutador.nome, topleft=(x, y - 28), fontsize=28, color='white')
    screen.draw.filled_rect(Rect((x, y), (200, 18)), (60, 20, 20))
    largura = int(200 * lutador.vida / lutador.vida_maxima)
    screen.draw.filled_rect(Rect((x, y), (largura, 18)), (76, 175, 80))
    screen.draw.text(str(lutador.vida) + ' / ' + str(lutador.vida_maxima), center=(x + 100, y + 9), fontsize=20, color='white')


def draw():
    screen.blit('arena', (0, 0))
    for lutador in lutadores:
        lutador.draw()
        if lutador.defendendo:
            escudo.pos = (lutador.x, lutador.y - 90)
            escudo.draw()
    if mostrar_golpe > 0:
        golpe.draw()
    desenhar_vida(heroi, 40, 50)
    desenhar_vida(dragao, 560, 50)
    screen.draw.filled_rect(Rect((20, 400), (760, 84)), (20, 20, 40))
    screen.draw.text(mensagem, topleft=(40, 410), fontsize=32, color='white')
    if estado == 'lutando' and not esperando:
        screen.draw.text('1  Atacar      2  Defender      3  Poção (' + str(pocoes) + ')', topleft=(40, 448), fontsize=28, color='yellow')
    if estado != 'lutando':
        screen.draw.text('Espaço começa outra luta', topleft=(40, 448), fontsize=28, color='yellow')


def on_key_down(key):
    global esperando
    if estado != 'lutando':
        if key == keys.SPACE:
            nova_luta()
        return
    if esperando:
        return
    if key == keys.K_1:
        esperando = True
        atacar(heroi, dragao)
        terminar_vez()
    elif key == keys.K_2:
        esperando = True
        defender(heroi)
        terminar_vez()
    elif key == keys.K_3 and pocoes > 0 and heroi.vida < heroi.vida_maxima:
        esperando = True
        tomar_pocao()
        terminar_vez()


nova_luta()
pgzrun.go()
