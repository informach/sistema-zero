import random
import pgzrun

WIDTH = 800
HEIGHT = 450
TITLE = 'Patrulha em Camadas'
CHAO = 380
GRAVIDADE = 0.5
PULO = 11
CHEGADA = 1000

# Três camadas de fundo, cada uma com o dobro da largura da tela. A de trás anda devagar e a
# da frente anda rápido: é isso que dá a sensação de distância.
camadas = []
for imagem, ritmo in [('montanhas_longe', 0.2), ('morros', 0.5), ('chao', 1.0)]:
    camada = Actor(imagem)
    camada.topleft = (0, 0)
    camada.ritmo = ritmo
    camadas.append(camada)

jipe = Actor('jipe')
obstaculos = []
velocidade = 5
vy = 0
metros = 0
vidas = 3
proximo = 400
# 'andando', 'batida', 'chegou' ou 'fim'
estado = 'andando'


def novo_jogo():
    global vidas, metros
    vidas = 3
    metros = 0
    recomecar()


def recomecar():
    global vy, velocidade, estado, proximo
    obstaculos.clear()
    jipe.midbottom = (200, CHAO)
    vy = 0
    velocidade = 5
    proximo = 400
    estado = 'andando'


def no_chao():
    return jipe.bottom >= CHAO


def criar_obstaculo():
    # Um buraco ou uma pedra aparece na direita da tela.
    if random.randint(1, 2) == 1:
        # O buraco fica cavado no chão: o topo dele é a linha do chão.
        coisa = Actor('buraco')
        coisa.tipo = 'buraco'
        coisa.midtop = (WIDTH + 60, CHAO - 4)
    else:
        # A pedra fica em cima do chão.
        coisa = Actor('pedra')
        coisa.tipo = 'pedra'
        coisa.midbottom = (WIDTH + 60, CHAO + 4)
    obstaculos.append(coisa)


def bateu(coisa):
    if coisa.tipo == 'buraco':
        # Cai no buraco se as rodas estão no chão bem em cima dele.
        return no_chao() and coisa.left + 10 < jipe.x < coisa.right - 10
    return abs(coisa.x - jipe.x) < (coisa.width + jipe.width) / 2 - 8 and jipe.bottom > coisa.top + 6


def update():
    global vy, velocidade, metros, proximo, estado, vidas
    if estado != 'andando':
        return
    if keyboard.left:
        velocidade = max(3, velocidade - 0.1)
    if keyboard.right:
        velocidade = min(8, velocidade + 0.1)
    for camada in camadas:
        camada.left = camada.left - velocidade * camada.ritmo
        # A imagem tem duas cópias lado a lado: quando a segunda chega ao começo, volta.
        if camada.right <= WIDTH:
            camada.left = 0
    vy = vy + GRAVIDADE
    jipe.y = jipe.y + vy
    if no_chao():
        jipe.bottom = CHAO
        vy = 0
    metros = metros + velocidade / 40
    proximo = proximo - velocidade
    if proximo <= 0:
        criar_obstaculo()
        proximo = random.randint(260, 520)
    for coisa in list(obstaculos):
        coisa.x = coisa.x - velocidade
        if coisa.right < 0:
            obstaculos.remove(coisa)
        elif bateu(coisa):
            vidas = vidas - 1
            sounds.batida.play()
            if vidas == 0:
                estado = 'fim'
            else:
                estado = 'batida'
                clock.schedule(recomecar, 1)
            return
    if metros >= CHEGADA:
        estado = 'chegou'
        sounds.chegou.play()


def draw():
    for camada in camadas:
        camada.draw()
    for coisa in obstaculos:
        coisa.draw()
    if estado == 'batida' or estado == 'fim':
        screen.blit('jipe_batido', (jipe.left, jipe.top))
    else:
        jipe.draw()
    screen.draw.text('Metros: ' + str(int(metros)) + ' de ' + str(CHEGADA), topleft=(12, 10), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 12, 10), fontsize=30, color='white')
    screen.draw.text('Velocidade: ' + str(int(velocidade)), midtop=(WIDTH / 2, 10), fontsize=30, color='white')
    if estado == 'chegou':
        screen.draw.text('Patrulha completa!', center=(WIDTH / 2, 180), fontsize=56, color='yellow', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('Fim da patrulha!', center=(WIDTH / 2, 180), fontsize=56, color='orange', owidth=1, ocolor='black')
    if estado == 'chegou' or estado == 'fim':
        screen.draw.text('Espaço joga de novo', center=(WIDTH / 2, 230), fontsize=34, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global vy
    if estado == 'chegou' or estado == 'fim':
        if key == keys.SPACE:
            novo_jogo()
        return
    if (key == keys.SPACE or key == keys.UP) and no_chao() and estado == 'andando':
        vy = -PULO
        sounds.pulo.play()


novo_jogo()
pgzrun.go()
