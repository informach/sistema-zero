import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Rali com Minimapa'
LADO = 80
# As velocidades precisam dividir LADO (1, 2, 4, 5, 8...): assim cada carro passa bem no
# meio de cada esquina, que é onde ele pode virar.
VELOCIDADE = 4
VELOCIDADE_DOS_VERMELHOS = 2
# O minimapa é o mapa inteiro, dez vezes menor.
MINI = 10
MINI_X = 620
MINI_Y = 230

# O labirinto inteiro: # é muro e . é estrada. Ele é maior que a tela, por isso a tela anda junto
# com o carro e o minimapa mostra onde está cada coisa.
LABIRINTO = [
    '####################',
    '#..........##......#',
    '#.##.#####.##.##.#.#',
    '#.##.#####.##.##.#.#',
    '#.##...............#',
    '#.##.##.##.##.####.#',
    '#.##.##.##.##.####.#',
    '#................#.#',
    '#.##.##.##.#####.#.#',
    '#.##.##.##.#####.#.#',
    '#....##............#',
    '####.##.##.##.##.#.#',
    '####.##.##.##.##.#.#',
    '#.............##...#',
    '#.#####.##.##.##.#.#',
    '#.#####.##.##.##.#.#',
    '#.......##.........#',
    '#.##.##.#####.##.#.#',
    '#..................#',
    '####################',
]
# Onde ficam as bandeiras: (coluna, linha).
BANDEIRAS = [(1, 18), (18, 1), (18, 18), (10, 10), (4, 7), (13, 1), (16, 13), (7, 16)]

jogador = Actor('carro')
vermelhos = []
bandeiras = []
desejo = (1, 0)
combustivel = 100
vidas = 3
# 'jogando', 'venceu' ou 'fim'
estado = 'jogando'


def colocar(carro, coluna, linha, dx, dy):
    # mapa_x e mapa_y: onde o carro está no labirinto inteiro (não na tela).
    carro.mapa_x = coluna * LADO + LADO // 2
    carro.mapa_y = linha * LADO + LADO // 2
    carro.dx = dx
    carro.dy = dy


def largada():
    global desejo
    colocar(jogador, 1, 1, 1, 0)
    desejo = (1, 0)
    colocar(vermelhos[0], 18, 10, -1, 0)
    colocar(vermelhos[1], 10, 18, 0, -1)


def novo_jogo():
    global combustivel, vidas, estado
    vermelhos.clear()
    vermelhos.append(Actor('vermelho'))
    vermelhos.append(Actor('vermelho'))
    bandeiras.clear()
    for lugar in BANDEIRAS:
        bandeiras.append(lugar)
    combustivel = 100
    vidas = 3
    estado = 'jogando'
    largada()


def livre(coluna, linha):
    return LABIRINTO[linha][coluna] == '.'


def no_centro(carro):
    return carro.mapa_x % LADO == LADO // 2 and carro.mapa_y % LADO == LADO // 2


def pode_ir(carro, dx, dy):
    return livre(carro.mapa_x // LADO + dx, carro.mapa_y // LADO + dy)


def virar_o_carro(carro):
    # A imagem do carro aponta para a direita; o ângulo vira para onde ele anda.
    if carro.dx == 1:
        carro.angle = 0
    elif carro.dx == -1:
        carro.angle = 180
    elif carro.dy == -1:
        carro.angle = 90
    elif carro.dy == 1:
        carro.angle = 270


def mover_jogador():
    dx, dy = desejo
    if dx == -jogador.dx and dy == -jogador.dy:
        # Dar meia-volta pode a qualquer hora.
        jogador.dx = dx
        jogador.dy = dy
    elif no_centro(jogador):
        if pode_ir(jogador, dx, dy):
            jogador.dx = dx
            jogador.dy = dy
        elif not pode_ir(jogador, jogador.dx, jogador.dy):
            # Bateu no muro: vira sozinho para um lado livre, como no jogo original.
            # Num beco sem saída, dá meia-volta.
            if pode_ir(jogador, jogador.dy, -jogador.dx):
                jogador.dx, jogador.dy = jogador.dy, -jogador.dx
            elif pode_ir(jogador, -jogador.dy, jogador.dx):
                jogador.dx, jogador.dy = -jogador.dy, jogador.dx
            else:
                jogador.dx, jogador.dy = -jogador.dx, -jogador.dy
    jogador.mapa_x = jogador.mapa_x + jogador.dx * VELOCIDADE
    jogador.mapa_y = jogador.mapa_y + jogador.dy * VELOCIDADE
    virar_o_carro(jogador)


def mover_vermelho(carro):
    if no_centro(carro):
        # Em cada esquina, escolhe a rua que deixa mais perto do jogador (sem voltar para trás).
        melhor = None
        menor = 0
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            if dx == -carro.dx and dy == -carro.dy:
                continue
            if pode_ir(carro, dx, dy):
                x = carro.mapa_x + dx * LADO
                y = carro.mapa_y + dy * LADO
                distancia = (x - jogador.mapa_x) ** 2 + (y - jogador.mapa_y) ** 2
                if melhor is None or distancia < menor:
                    melhor = (dx, dy)
                    menor = distancia
        if melhor is not None:
            carro.dx, carro.dy = melhor
        else:
            # Num beco sem saída, a única rua é voltar.
            carro.dx, carro.dy = -carro.dx, -carro.dy
    carro.mapa_x = carro.mapa_x + carro.dx * VELOCIDADE_DOS_VERMELHOS
    carro.mapa_y = carro.mapa_y + carro.dy * VELOCIDADE_DOS_VERMELHOS
    virar_o_carro(carro)


def update():
    global desejo, combustivel, vidas, estado
    if estado != 'jogando':
        return
    if keyboard.left:
        desejo = (-1, 0)
    elif keyboard.right:
        desejo = (1, 0)
    elif keyboard.up:
        desejo = (0, -1)
    elif keyboard.down:
        desejo = (0, 1)
    mover_jogador()
    for carro in vermelhos:
        mover_vermelho(carro)
    combustivel = combustivel - 0.035
    for lugar in list(bandeiras):
        coluna, linha = lugar
        if abs(jogador.mapa_x - (coluna * LADO + LADO // 2)) < 40 and abs(jogador.mapa_y - (linha * LADO + LADO // 2)) < 40:
            bandeiras.remove(lugar)
            combustivel = min(100, combustivel + 5)
            sounds.bandeira.play()
    if not bandeiras:
        estado = 'venceu'
        sounds.vitoria.play()
    for carro in vermelhos:
        if abs(carro.mapa_x - jogador.mapa_x) < 50 and abs(carro.mapa_y - jogador.mapa_y) < 50:
            vidas = vidas - 1
            sounds.batida.play()
            if vidas == 0:
                estado = 'fim'
            else:
                largada()
            return
    if combustivel <= 0:
        combustivel = 0
        estado = 'fim'
        sounds.batida.play()


def draw():
    screen.fill((20, 20, 20))
    # A tela mostra um pedaço do labirinto com o carro sempre no meio dela.
    camera_x = jogador.mapa_x - 300
    camera_y = jogador.mapa_y - 300
    for linha in range(len(LABIRINTO)):
        for coluna in range(len(LABIRINTO[linha])):
            x = coluna * LADO - camera_x
            y = linha * LADO - camera_y
            if -LADO < x < 600 and -LADO < y < 600:
                if LABIRINTO[linha][coluna] == '#':
                    screen.blit('muro', (x, y))
                else:
                    screen.blit('estrada', (x, y))
    for coluna, linha in bandeiras:
        screen.blit('bandeira', (coluna * LADO + 20 - camera_x, linha * LADO + 12 - camera_y))
    for carro in vermelhos:
        carro.pos = (carro.mapa_x - camera_x, carro.mapa_y - camera_y)
        carro.draw()
    jogador.pos = (300, 300)
    jogador.draw()
    desenhar_painel()
    if estado == 'venceu':
        screen.draw.text('Todas as bandeiras!', center=(300, 260), fontsize=56, color='yellow', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('Fim da corrida!', center=(300, 260), fontsize=60, color='orange', owidth=1, ocolor='black')
    if estado != 'jogando':
        screen.draw.text('Espaço joga de novo', center=(300, 320), fontsize=36, color='white', owidth=1, ocolor='black')


def desenhar_painel():
    screen.blit('painel', (600, 0))
    screen.draw.text('Bandeiras: ' + str(len(BANDEIRAS) - len(bandeiras)) + ' de ' + str(len(BANDEIRAS)), topleft=(616, 20), fontsize=26, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topleft=(616, 56), fontsize=26, color='white')
    screen.draw.text('Combustível', topleft=(616, 100), fontsize=26, color='white')
    screen.draw.filled_rect(Rect((616, 130), (combustivel * 1.6, 18)), 'orange')
    screen.draw.rect(Rect((616, 130), (160, 18)), 'white')
    # O minimapa: um pontinho para cada coisa, sem os muros.
    for coluna, linha in bandeiras:
        screen.draw.filled_rect(Rect((MINI_X + (coluna * LADO + LADO // 2) / MINI - 2, MINI_Y + (linha * LADO + LADO // 2) / MINI - 2), (5, 5)), 'yellow')
    for carro in vermelhos:
        screen.draw.filled_rect(Rect((MINI_X + carro.mapa_x / MINI - 2, MINI_Y + carro.mapa_y / MINI - 2), (5, 5)), 'red')
    screen.draw.filled_rect(Rect((MINI_X + jogador.mapa_x / MINI - 3, MINI_Y + jogador.mapa_y / MINI - 3), (7, 7)), 'white')


def on_key_down(key):
    global desejo
    if estado != 'jogando':
        if key == keys.SPACE:
            novo_jogo()
        return
    if key == keys.LEFT:
        desejo = (-1, 0)
    elif key == keys.RIGHT:
        desejo = (1, 0)
    elif key == keys.UP:
        desejo = (0, -1)
    elif key == keys.DOWN:
        desejo = (0, 1)


novo_jogo()
pgzrun.go()
