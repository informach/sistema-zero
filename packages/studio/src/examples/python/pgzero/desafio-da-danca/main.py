import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Desafio da Dança'
DIRECOES = ['cima', 'direita', 'baixo', 'esquerda']

dancarino = Actor('dancarino')
dancarino.pos = (WIDTH / 2, 280)
setas = []
x = 220
for direcao in DIRECOES:
    seta = Actor('seta_' + direcao)
    seta.pos = (x, 520)
    setas.append(seta)
    x = x + 120

sequencia = []
posicao = 0
mostrando = True
vez_de_jogar = False
fim_de_jogo = False
pontos = 0
contagem = 3


def mostrar_passo(numero):
    dancarino.image = 'dancarino_' + DIRECOES[numero]
    setas[numero].image = 'seta_' + DIRECOES[numero] + '_acesa'


def voltar_ao_inicio():
    dancarino.image = 'dancarino'
    numero = 0
    for seta in setas:
        seta.image = 'seta_' + DIRECOES[numero]
        numero = numero + 1


def nova_rodada():
    global posicao, mostrando, vez_de_jogar, contagem
    sequencia.append(random.randint(0, 3))
    posicao = 0
    mostrando = True
    vez_de_jogar = False
    contagem = 3
    clock.schedule(proximo_da_sequencia, 1.0)


def proximo_da_sequencia():
    global posicao, mostrando
    voltar_ao_inicio()
    if posicao < len(sequencia):
        mostrar_passo(sequencia[posicao])
        posicao = posicao + 1
        clock.schedule(voltar_ao_inicio, 0.5)
        clock.schedule(proximo_da_sequencia, 0.8)
    else:
        mostrando = False
        posicao = 0
        clock.schedule_interval(contar, 1.0)


def contar():
    global contagem, vez_de_jogar
    contagem = contagem - 1
    if contagem == 0:
        clock.unschedule(contar)
        vez_de_jogar = True


def draw():
    screen.blit('palco', (0, 0))
    dancarino.draw()
    for seta in setas:
        seta.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(16, 12), fontsize=36, color='white')
    if fim_de_jogo:
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 110), fontsize=72, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Aperte espaço para dançar de novo', center=(WIDTH / 2, 170), fontsize=32, color='white')
    elif mostrando:
        screen.draw.text('Preste atenção!', center=(WIDTH / 2, 90), fontsize=56, color='white', owidth=1.5, ocolor='black')
    elif vez_de_jogar:
        screen.draw.text('Sua vez: dance!', center=(WIDTH / 2, 90), fontsize=56, color='white', owidth=1.5, ocolor='black')
    else:
        screen.draw.text(str(contagem), center=(WIDTH / 2, 90), fontsize=80, color='white', owidth=1.5, ocolor='black')


def acertou_ou_errou(numero):
    global posicao, pontos, fim_de_jogo, vez_de_jogar
    mostrar_passo(numero)
    clock.schedule(voltar_ao_inicio, 0.4)
    if numero == sequencia[posicao]:
        posicao = posicao + 1
        if posicao == len(sequencia):
            pontos = pontos + 1
            vez_de_jogar = False
            nova_rodada()
    else:
        fim_de_jogo = True
        vez_de_jogar = False
        music.stop()


def on_key_down(key):
    global fim_de_jogo, pontos
    if fim_de_jogo:
        if key == keys.SPACE:
            fim_de_jogo = False
            pontos = 0
            sequencia.clear()
            music.play('ritmo')
            nova_rodada()
        return
    if not vez_de_jogar:
        return
    if key == keys.UP:
        acertou_ou_errou(0)
    elif key == keys.RIGHT:
        acertou_ou_errou(1)
    elif key == keys.DOWN:
        acertou_ou_errou(2)
    elif key == keys.LEFT:
        acertou_ou_errou(3)


music.play('ritmo')
nova_rodada()
pgzrun.go()
