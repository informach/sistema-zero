import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Tiro ao Prato'
PRATOS_POR_RODADA = 20

atirador = Actor('atirador', (400, 480))
mira_esquerda = Actor('mira', (320, 350))
mira_direita = Actor('mira', (480, 350))
pratos = []
lancados = 0
acertos = 0
pontos = 0
espera_do_tiro = 0
fim = False


def nova_rodada():
    global lancados, acertos, pontos, espera_do_tiro, fim
    pratos.clear()
    lancados = 0
    acertos = 0
    pontos = 0
    espera_do_tiro = 0
    fim = False
    mira_esquerda.y = 350
    mira_direita.y = 350


def lancar_prato(de_onde):
    global lancados
    prato = Actor('prato', (de_onde, 370))
    # O prato atravessa a tela até o outro lado, subindo até uma altura sorteada.
    if de_onde < 400:
        prato.indo = 'direita'
        destino = 800
    else:
        prato.indo = 'esquerda'
        destino = 0
    # quebrado = 0: inteiro; de 1 a 18: quebrando; 19: já sumiu.
    prato.quebrado = 0
    animate(prato, duration=3, pos=(destino, random.randint(80, 300)))
    pratos.append(prato)
    lancados = lancados + 1
    sounds.lancar.play()


def prato_mais_perto(lado):
    # O prato inteiro que ainda vai passar pela mira deste lado, o mais perto dela.
    melhor = None
    for prato in pratos:
        if prato.quebrado > 0:
            continue
        if lado == 'esquerda' and prato.indo == 'direita' and prato.x < mira_esquerda.x:
            if melhor is None or prato.x > melhor.x:
                melhor = prato
        if lado == 'direita' and prato.indo == 'esquerda' and prato.x > mira_direita.x:
            if melhor is None or prato.x < melhor.x:
                melhor = prato
    return melhor


def atirar(lado):
    global espera_do_tiro, acertos, pontos
    if lado == 'esquerda':
        atirador.image = 'atirador_esquerda'
        mira = mira_esquerda
    else:
        atirador.image = 'atirador_direita'
        mira = mira_direita
    espera_do_tiro = 10
    sounds.tiro.play()
    for prato in pratos:
        if prato.quebrado == 0 and prato.collidepoint(mira.pos):
            prato.quebrado = 1
            acertos = acertos + 1
            pontos = pontos + 1000
            sounds.quebrou.play()


def update():
    global espera_do_tiro, fim
    if fim:
        return
    if lancados < PRATOS_POR_RODADA:
        sorteio = random.randint(0, 100)
        if sorteio == 1:
            lancar_prato(700)
        elif sorteio == 2:
            lancar_prato(100)
    if espera_do_tiro > 0:
        espera_do_tiro = espera_do_tiro - 1
        if espera_do_tiro == 0:
            atirador.image = 'atirador'
    # As miras andam metade do caminho até a altura do prato que vem chegando.
    alvo = prato_mais_perto('esquerda')
    if alvo is not None:
        mira_esquerda.y = mira_esquerda.y + (alvo.y - mira_esquerda.y) / 2
    alvo = prato_mais_perto('direita')
    if alvo is not None:
        mira_direita.y = mira_direita.y + (alvo.y - mira_direita.y) / 2
    for prato in pratos:
        if 0 < prato.quebrado < 19:
            # Três desenhos de prato quebrando, seis quadros cada.
            prato.image = 'prato_quebrando' + str((prato.quebrado - 1) // 6 + 1)
            prato.quebrado = prato.quebrado + 1
        if prato.x <= 0 or prato.x >= 800:
            prato.quebrado = 19
    if lancados == PRATOS_POR_RODADA:
        terminou = True
        for prato in pratos:
            if prato.quebrado < 19:
                terminou = False
        if terminou:
            fim = True
            sounds.fim.play()


def draw():
    screen.blit('fundo', (0, 0))
    for prato in pratos:
        if prato.quebrado < 19:
            if prato.quebrado == 0:
                screen.blit('sombra', (prato.x - 14, 440))
            prato.draw()
    atirador.draw()
    mira_esquerda.draw()
    mira_direita.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(16, 12), fontsize=34, color='white', owidth=1, ocolor='black')
    screen.draw.text('Pratos: ' + str(lancados) + ' de ' + str(PRATOS_POR_RODADA), topright=(WIDTH - 16, 12), fontsize=34, color='white', owidth=1, ocolor='black')
    if fim:
        screen.draw.text('Acertou ' + str(acertos) + ' de ' + str(PRATOS_POR_RODADA) + '!', center=(400, 250), fontsize=64, color='yellow', owidth=1, ocolor='black')
        screen.draw.text('Espaço joga de novo', center=(400, 310), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    if fim:
        if key == keys.SPACE:
            nova_rodada()
        return
    if espera_do_tiro > 0:
        return
    if key == keys.LEFT:
        atirar('esquerda')
    elif key == keys.RIGHT:
        atirar('direita')


nova_rodada()
pgzrun.go()
