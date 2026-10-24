import pgzrun

WIDTH = 800
HEIGHT = 400
TITLE = 'Mina que Desmorona'
GRAVIDADE = 0.5
PULO = -9
VELOCIDADE = 3

# A caverna: # é chão firme, ~ é chão que desmorona quando alguém pisa, . é vazio.
MAPA = [
    '##......................',
    '...##..............#....',
    '......##..~~~~.......##.',
    '..##....######....##....',
    '....##~~...##..###......',
    '#######.....############',
]

blocos = []
tipos = []
chaves = []
mineiro = Actor('mineiro_d0')
robo = Actor('robo')
porta = Actor('porta')
porta.midbottom = (70, 100)
velocidade_y = 0
no_chao = False
olhando = 'd'
passos = 0
vidas = 3
venceu = False
robo_vai = 2


def montar_caverna():
    # Lê o mapa e cria um retângulo para cada pedaço de chão; as chaves voltam ao lugar.
    blocos.clear()
    tipos.clear()
    for linha in range(len(MAPA)):
        for coluna in range(len(MAPA[linha])):
            letra = MAPA[linha][coluna]
            if letra != '.':
                blocos.append(Rect((40 + coluna * 30, 100 + linha * 50), (30, 10)))
                tipos.append(letra)
    chaves.clear()
    for lugar in [(235, 300), (415, 200), (625, 150)]:
        chave = Actor('chave')
        chave.midbottom = lugar
        chaves.append(chave)
    porta.image = 'porta'


def recomecar():
    global velocidade_y
    mineiro.midbottom = (70, 350)
    velocidade_y = 0


def pisando_em(pes_antes):
    # O número do bloco embaixo dos pés do mineiro, ou -1 se não houver nenhum.
    # Vale se os pés estavam em cima do bloco e agora chegaram nele ou passaram dele: caindo
    # rápido, os pés pulam vários pixels de uma vez e passariam direto pelo chão.
    for numero in range(len(blocos)):
        bloco = blocos[numero]
        if tipos[numero] != 'x' and mineiro.right > bloco.left + 4 and mineiro.left < bloco.right - 4:
            if pes_antes <= bloco.top + 1 and mineiro.bottom >= bloco.top and velocidade_y >= 0:
                return numero
    return -1


def desmoronar(numero):
    # O chão frágil afunda um pouquinho a cada quadro e some quando acaba.
    bloco = blocos[numero]
    if passos % 4 == 0:
        bloco.top = bloco.top + 1
        bloco.height = bloco.height - 1
        mineiro.bottom = bloco.top
    if bloco.height <= 0:
        tipos[numero] = 'x'
        sounds.desmorona.play()


def mover_mineiro():
    global velocidade_y, no_chao, olhando, passos
    andando = False
    if keyboard.left and mineiro.left > 0:
        mineiro.x = mineiro.x - VELOCIDADE
        olhando = 'e'
        andando = True
    if keyboard.right and mineiro.right < WIDTH:
        mineiro.x = mineiro.x + VELOCIDADE
        olhando = 'd'
        andando = True
    passos = passos + 1
    quadro = 0
    if andando:
        quadro = passos // 6 % 3
    mineiro.image = 'mineiro_' + olhando + str(quadro)
    pes_antes = mineiro.bottom
    velocidade_y = velocidade_y + GRAVIDADE
    mineiro.y = mineiro.y + velocidade_y
    numero = pisando_em(pes_antes)
    no_chao = numero != -1
    if no_chao:
        mineiro.bottom = blocos[numero].top
        velocidade_y = 0
        if tipos[numero] == '~':
            desmoronar(numero)


def mover_robo():
    global robo_vai
    robo.x = robo.x + robo_vai
    if robo.x > 760 or robo.x < 440:
        robo_vai = -robo_vai


def draw():
    screen.blit('fundo', (0, 0))
    for numero in range(len(blocos)):
        if tipos[numero] == '#':
            screen.draw.filled_rect(blocos[numero], (200, 90, 60))
        if tipos[numero] == '~':
            screen.draw.filled_rect(blocos[numero], (240, 200, 90))
    porta.draw()
    for chave in chaves:
        chave.draw()
    robo.draw()
    mineiro.draw()
    screen.draw.text('Vidas: ' + str(vidas) + '   Chaves: ' + str(3 - len(chaves)) + '/3', topleft=(10, 6), fontsize=28, color='white')
    if venceu:
        screen.draw.text('Você saiu da mina!', center=(WIDTH / 2, 200), fontsize=56, color='yellow', owidth=2, ocolor='black')
    if vidas == 0:
        screen.draw.text('Fim de jogo! Espaço recomeça', center=(WIDTH / 2, 200), fontsize=44, color='orange', owidth=2, ocolor='black')


def update():
    global vidas, venceu
    if venceu or vidas == 0:
        return
    mover_mineiro()
    mover_robo()
    for chave in list(chaves):
        if mineiro.colliderect(chave):
            chaves.remove(chave)
            sounds.chave.play()
            if not chaves:
                porta.image = 'porta_aberta'
    if mineiro.colliderect(robo) or mineiro.top > HEIGHT:
        vidas = vidas - 1
        sounds.dano.play()
        recomecar()
    if not chaves and mineiro.colliderect(porta):
        venceu = True
        sounds.vitoria.play()


def on_key_down(key):
    global velocidade_y, vidas, venceu
    if key != keys.SPACE:
        return
    if vidas == 0 or venceu:
        vidas = 3
        venceu = False
        montar_caverna()
        recomecar()
    elif no_chao:
        velocidade_y = PULO
        sounds.pulo.play()


robo.midbottom = (600, 350)
montar_caverna()
recomecar()
pgzrun.go()
