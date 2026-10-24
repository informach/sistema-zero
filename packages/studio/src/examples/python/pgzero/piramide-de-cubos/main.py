import random
import pgzrun

WIDTH = 500
HEIGHT = 500
TITLE = 'Pirâmide de Cubos'
ANDARES = 7

# Cada cubo mora numa linha (0 é o topo) e numa coluna (de 0 até o número da linha).
# cubos[linha] é a fileira daquela linha; todos_os_cubos tem os 28 juntos, para desenhar.
cubos = []
todos_os_cubos = []
for linha in range(ANDARES):
    fileira = []
    for coluna in range(linha + 1):
        cubo = Actor('cubo')
        cubo.pos = (250 - linha * 32 + coluna * 64, 110 + linha * 48)
        fileira.append(cubo)
        todos_os_cubos.append(cubo)
    cubos.append(fileira)

pulador = Actor('pulador')
bolinha = Actor('bolinha')
linha_atual = 0
coluna_atual = 0
pulando = False
caiu = False
vidas = 3
pintados = 0
venceu = False
bola_linha = -1
bola_coluna = 0


def lugar(linha, coluna):
    # O pulador fica em pé sobre o topo do cubo.
    return (250 - linha * 32 + coluna * 64, 110 + linha * 48 - 34)


def colocar_no_topo():
    global linha_atual, coluna_atual, pulando, caiu
    linha_atual = 0
    coluna_atual = 0
    pulando = False
    caiu = False
    pulador.pos = lugar(0, 0)


def pintar_cubo():
    global pintados, venceu
    cubo = cubos[linha_atual][coluna_atual]
    if cubo.image == 'cubo':
        cubo.image = 'cubo_pintado'
        pintados = pintados + 1
        sounds.pinta.play()
    if pintados == 28:
        venceu = True
        sounds.vitoria.play()


def chegou():
    global pulando, caiu
    pulando = False
    if 0 <= coluna_atual <= linha_atual < ANDARES:
        pintar_cubo()
    else:
        # Pulou para fora da pirâmide: cai até o chão.
        caiu = True
        sounds.queda.play()
        animate(pulador, tween='accelerate', duration=0.6, y=HEIGHT + 60, on_finished=perder_vida)


def perder_vida():
    global vidas
    vidas = vidas - 1
    if vidas > 0:
        colocar_no_topo()


def pular(mais_linha, mais_coluna):
    global linha_atual, coluna_atual, pulando
    linha_atual = linha_atual + mais_linha
    coluna_atual = coluna_atual + mais_coluna
    pulando = True
    sounds.pulo.play()
    animate(pulador, tween='bounce_end', duration=0.35, pos=lugar(linha_atual, coluna_atual), on_finished=chegou)


def soltar_bolinha():
    global bola_linha, bola_coluna
    if bola_linha == -1 and not venceu and vidas > 0:
        bola_linha = 0
        bola_coluna = 0
        bolinha.pos = lugar(0, 0)


def descer_bolinha():
    # A bolinha desce um andar por vez, para a esquerda ou para a direita, e some lá embaixo.
    global bola_linha, bola_coluna
    if bola_linha == -1:
        return
    bola_linha = bola_linha + 1
    if bola_linha == ANDARES:
        bola_linha = -1
        return
    bola_coluna = bola_coluna + random.randint(0, 1)
    animate(bolinha, tween='bounce_end', duration=0.3, pos=lugar(bola_linha, bola_coluna))


def draw():
    screen.blit('fundo', (0, 0))
    for cubo in todos_os_cubos:
        cubo.draw()
    if bola_linha != -1:
        bolinha.draw()
    if vidas > 0:
        pulador.draw()
    screen.draw.text('Vidas: ' + str(vidas), topleft=(12, 10), fontsize=30, color='white')
    screen.draw.text('Cubos: ' + str(pintados) + '/28', topright=(WIDTH - 12, 10), fontsize=30, color='white')
    if venceu:
        screen.draw.text('Você pintou a pirâmide!', center=(WIDTH / 2, 460), fontsize=44, color='yellow', owidth=2, ocolor='black')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, 460), fontsize=40, color='orange', owidth=2, ocolor='black')


def update():
    global bola_linha
    if venceu or vidas == 0 or caiu:
        return
    if bola_linha != -1 and not pulando and bolinha.distance_to(pulador) < 24:
        # A bolinha some junto: senão ela acertaria de novo quem volta ao topo.
        bola_linha = -1
        sounds.queda.play()
        perder_vida()
        return
    if pulando:
        return
    # As setas pulam na diagonal: esquerda e baixo descem, direita e cima sobem.
    if keyboard.left:
        pular(1, 0)
    elif keyboard.down:
        pular(1, 1)
    elif keyboard.up:
        pular(-1, -1)
    elif keyboard.right:
        pular(-1, 0)


def on_key_down(key):
    global vidas, pintados, venceu
    if key == keys.SPACE and (vidas == 0 or venceu):
        for cubo in todos_os_cubos:
            cubo.image = 'cubo'
        vidas = 3
        pintados = 0
        venceu = False
        colocar_no_topo()
        pintar_cubo()


colocar_no_topo()
pintar_cubo()
clock.schedule_interval(soltar_bolinha, 5)
clock.schedule_interval(descer_bolinha, 0.7)
pgzrun.go()
