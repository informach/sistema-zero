import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Voo de Balão'
ARQUIVO_DE_RECORDE = 'recorde.txt'

balao = Actor('balao')
balao.pos = (400, 300)
passaro = Actor('passaro_cima')
passaro.pos = (random.randint(800, 1600), random.randint(10, 200))
casa = Actor('casa')
casa.pos = (random.randint(800, 1600), 460)
arvore = Actor('arvore')
arvore.pos = (random.randint(800, 1600), 450)

subindo = False
fim_de_jogo = False
pontos = 0
recorde = 0
batidas_de_asa = 0


def ler_recorde():
    global recorde
    try:
        with open(ARQUIVO_DE_RECORDE, 'r') as arquivo:
            recorde = int(arquivo.read())
    except (OSError, ValueError):
        recorde = 0


def salvar_recorde():
    global recorde
    if pontos > recorde:
        recorde = pontos
        with open(ARQUIVO_DE_RECORDE, 'w') as arquivo:
            arquivo.write(str(recorde))


def draw():
    screen.blit('fundo', (0, 0))
    if fim_de_jogo:
        screen.draw.text('Fim de jogo!', center=(400, 220), fontsize=72, color='black')
        screen.draw.text('Pontos: ' + str(pontos), center=(400, 300), fontsize=44, color='black')
        screen.draw.text('Recorde: ' + str(recorde), center=(400, 360), fontsize=44, color='black')
        screen.draw.text('Aperte espaço para voar de novo', center=(400, 440), fontsize=32, color='black')
        return
    balao.draw()
    passaro.draw()
    casa.draw()
    arvore.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(10, 10), fontsize=36, color='black')


def on_mouse_down():
    global subindo
    subindo = True
    balao.y = balao.y - 50


def on_mouse_up():
    global subindo
    subindo = False


def on_key_down(key):
    global fim_de_jogo, pontos
    if key == keys.SPACE and fim_de_jogo:
        fim_de_jogo = False
        pontos = 0
        balao.pos = (400, 300)
        passaro.x = random.randint(800, 1600)
        casa.x = random.randint(800, 1600)
        arvore.x = random.randint(800, 1600)


def bater_asas():
    global batidas_de_asa
    batidas_de_asa = batidas_de_asa + 1
    if batidas_de_asa % 10 == 0:
        if passaro.image == 'passaro_cima':
            passaro.image = 'passaro_baixo'
        else:
            passaro.image = 'passaro_cima'


def passou(obstaculo, velocidade, de, ate):
    global pontos
    if obstaculo.right > 0:
        obstaculo.x = obstaculo.x - velocidade
    else:
        obstaculo.x = random.randint(800, 1600)
        obstaculo.y = random.randint(de, ate)
        pontos = pontos + 1


def bateu(obstaculo):
    # A caixa do obstáculo, um pouco menor que o desenho: encostar de raspão não conta.
    caixa = Rect((obstaculo.left + 10, obstaculo.top + 10), (obstaculo.width - 20, obstaculo.height - 20))
    return balao.colliderect(caixa)


def update():
    global fim_de_jogo
    if fim_de_jogo:
        return
    if not subindo:
        balao.y = balao.y + 1
    bater_asas()
    passou(passaro, 4, 10, 200)
    passou(casa, 2, 460, 460)
    passou(arvore, 2, 450, 450)
    if balao.top < 0 or balao.bottom > 560:
        fim_de_jogo = True
    if bateu(passaro) or bateu(casa) or bateu(arvore):
        fim_de_jogo = True
    if fim_de_jogo:
        sounds.fim.play()
        salvar_recorde()


ler_recorde()
pgzrun.go()
