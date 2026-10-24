import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Masmorra para Quatro'
TAMANHO = 32
TOPO = 24
VELOCIDADE = 2
# '#' é parede, '$' é tesouro, 'G' é a toca dos fantasmas, 'S' é a saída
# e de '1' a '4' é onde cada herói começa.
MAPA = [
    '#########################',
    '#1......#.......#......2#',
    '#.####..#..$.$..#..####.#',
    '#.#$....#.......#....$#.#',
    '#.#.###.###.#.###.###.#.#',
    '#...#$........G.....$#..#',
    '###.#.#####.#.#####.#.###',
    '#$..#.......#.......#..$#',
    '#.###.#.#.#####.#.#.###.#',
    '#.....#.#...S...#.#.....#',
    '#.###.#.#.#####.#.#.###.#',
    '#$..#.......#.......#..$#',
    '###.#.#####.#.#####.#.###',
    '#...#$...G..........#...#',
    '#.#.###.###.#.###.###.#.#',
    '#.#.....#.......#.....#.#',
    '#3......#...$...#......4#',
    '#########################',
]
NOMES = ['guerreira', 'mago', 'elfa', 'valente']

herois = []
tesouros = []
fantasmas = []
tocas = []
saida = Actor('saida')
pontos = 0
vidas = 5
nivel = 1
quadros = 0
# 'jogando', 'passou' ou 'fim'
estado = 'jogando'


def centro(coluna, linha):
    return (coluna * TAMANHO + TAMANHO / 2, TOPO + linha * TAMANHO + TAMANHO / 2)


def montar_nivel():
    global quadros, estado
    herois.clear()
    tesouros.clear()
    fantasmas.clear()
    tocas.clear()
    for linha in range(len(MAPA)):
        for coluna in range(len(MAPA[linha])):
            casa = MAPA[linha][coluna]
            if casa == '$':
                tesouros.append(Actor('tesouro', centro(coluna, linha)))
            elif casa == 'G':
                tocas.append(centro(coluna, linha))
            elif casa == 'S':
                saida.pos = centro(coluna, linha)
            elif casa in '1234':
                numero = int(casa) - 1
                heroi = Actor(NOMES[numero] + '_baixo1', centro(coluna, linha))
                heroi.numero = numero
                heroi.inicio = heroi.pos
                heroi.lado = 'baixo'
                heroi.passos = 0
                # O herói só entra no jogo quando alguém aperta as teclas dele.
                heroi.jogando = False
                herois.append(heroi)
    quadros = 0
    estado = 'jogando'


def novo_jogo():
    global pontos, vidas, nivel
    pontos = 0
    vidas = 5
    nivel = 1
    montar_nivel()


def livre(x, y):
    # Quem anda ocupa um quadrado de 22 pixels: os quatro cantos precisam estar fora das paredes.
    for canto_x in (x - 11, x + 10):
        for canto_y in (y - 11, y + 10):
            coluna = int(canto_x // TAMANHO)
            linha = int((canto_y - TOPO) // TAMANHO)
            if MAPA[linha][coluna] == '#':
                return False
    return True


def bate_em_heroi(heroi, x, y):
    for outro in herois:
        if outro != heroi and outro.jogando and abs(outro.x - x) < 22 and abs(outro.y - y) < 22:
            # Só não deixa chegar MAIS perto: dois heróis encavalados conseguem se separar.
            if abs(outro.x - x) + abs(outro.y - y) < abs(outro.x - heroi.x) + abs(outro.y - heroi.y):
                return True
    return False


def teclas(numero):
    # Esquerda, direita, cima e baixo de cada herói.
    if numero == 0:
        return (keyboard.left, keyboard.right, keyboard.up, keyboard.down)
    if numero == 1:
        return (keyboard.a, keyboard.d, keyboard.w, keyboard.s)
    if numero == 2:
        return (keyboard.j, keyboard.l, keyboard.i, keyboard.k)
    return (keyboard.f, keyboard.h, keyboard.t, keyboard.g)


def mover_heroi(heroi):
    esquerda, direita, cima, baixo = teclas(heroi.numero)
    dx = 0
    dy = 0
    if esquerda:
        dx = -1
    if direita:
        dx = 1
    if cima:
        dy = -1
    if baixo:
        dy = 1
    if dx == 0 and dy == 0:
        return
    heroi.jogando = True
    # Cada eixo anda separado: assim o herói desliza pela parede em vez de grudar nela.
    x = heroi.x + dx * VELOCIDADE
    if livre(x, heroi.y) and not bate_em_heroi(heroi, x, heroi.y):
        heroi.x = x
    y = heroi.y + dy * VELOCIDADE
    if livre(heroi.x, y) and not bate_em_heroi(heroi, heroi.x, y):
        heroi.y = y
    if dx == -1:
        heroi.lado = 'esquerda'
    elif dx == 1:
        heroi.lado = 'direita'
    elif dy == -1:
        heroi.lado = 'cima'
    else:
        heroi.lado = 'baixo'
    heroi.passos = heroi.passos + 1
    heroi.image = NOMES[heroi.numero] + '_' + heroi.lado + str(heroi.passos // 10 % 2 + 1)


DIRECOES = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def vagar(fantasma, passo):
    # Andando à toa: segue a direção sorteada e sorteia outra quando bate na parede.
    dx, dy = fantasma.direcao
    if livre(fantasma.x + dx * passo, fantasma.y + dy * passo):
        fantasma.x = fantasma.x + dx * passo
        fantasma.y = fantasma.y + dy * passo
    else:
        fantasma.direcao = random.choice(DIRECOES)
    fantasma.vagando = fantasma.vagando - 1


def mover_fantasma(fantasma):
    passo = 1 + nivel * 0.15
    if fantasma.vagando > 0:
        vagar(fantasma, passo)
        return
    # O fantasma vai atrás do herói em jogo que estiver mais perto.
    alvo = None
    for heroi in herois:
        if heroi.jogando and (alvo is None or fantasma.distance_to(heroi) < fantasma.distance_to(alvo)):
            alvo = heroi
    if alvo is None:
        return
    antes = fantasma.pos
    if alvo.x > fantasma.x + 1 and livre(fantasma.x + passo, fantasma.y):
        fantasma.x = fantasma.x + passo
    elif alvo.x < fantasma.x - 1 and livre(fantasma.x - passo, fantasma.y):
        fantasma.x = fantasma.x - passo
    if alvo.y > fantasma.y + 1 and livre(fantasma.x, fantasma.y + passo):
        fantasma.y = fantasma.y + passo
    elif alvo.y < fantasma.y - 1 and livre(fantasma.x, fantasma.y - passo):
        fantasma.y = fantasma.y - passo
    # Se a parede não deixou chegar mais perto, ele anda à toa por um tempo.
    if fantasma.pos == antes:
        fantasma.vagando = 60
        fantasma.direcao = random.choice(DIRECOES)


def soltar_fantasma():
    toca = random.choice(tocas)
    # O fantasma não nasce em cima de um herói: se a toca estiver ocupada, fica para a próxima.
    for heroi in herois:
        if heroi.jogando and heroi.distance_to(toca) < 64:
            return
    fantasma = Actor('fantasma', toca)
    fantasma.vagando = 0
    fantasma.direcao = (0, 0)
    fantasmas.append(fantasma)


def update():
    global quadros, pontos, vidas, estado
    if estado != 'jogando':
        return
    quadros = quadros + 1
    for heroi in herois:
        mover_heroi(heroi)
    # Das tocas sai um fantasma a cada três segundos, até um limite.
    if quadros % 180 == 0 and len(fantasmas) < 1 + nivel:
        soltar_fantasma()
    for fantasma in list(fantasmas):
        mover_fantasma(fantasma)
        for heroi in herois:
            if heroi.jogando and fantasma.colliderect(heroi) and fantasma in fantasmas and estado == 'jogando':
                # O fantasma some e o herói volta ao começo; o grupo perde uma vida.
                fantasmas.remove(fantasma)
                heroi.pos = heroi.inicio
                vidas = vidas - 1
                sounds.ai.play()
                if vidas == 0:
                    estado = 'fim'
    for heroi in herois:
        for tesouro in list(tesouros):
            if heroi.jogando and heroi.colliderect(tesouro):
                tesouros.remove(tesouro)
                pontos = pontos + 100
                sounds.tesouro.play()
        # Com todos os tesouros juntos, a saída se abre.
        if heroi.jogando and not tesouros and heroi.colliderect(saida) and estado == 'jogando':
            # Sair da masmorra dá uma vida a mais para o grupo.
            estado = 'passou'
            vidas = vidas + 1
            sounds.saida.play()
    if tesouros:
        saida.image = 'saida'
    else:
        saida.image = 'saida_aberta'


def draw():
    screen.fill((20, 16, 28))
    for linha in range(len(MAPA)):
        for coluna in range(len(MAPA[linha])):
            if MAPA[linha][coluna] == '#':
                screen.blit('parede', (coluna * TAMANHO, TOPO + linha * TAMANHO))
            else:
                screen.blit('chao', (coluna * TAMANHO, TOPO + linha * TAMANHO))
    saida.draw()
    for tesouro in tesouros:
        tesouro.draw()
    for heroi in herois:
        heroi.draw()
    for fantasma in fantasmas:
        fantasma.draw()
    screen.draw.text('Tesouros: ' + str(len(tesouros)), topleft=(8, 2), fontsize=24, color='yellow')
    screen.draw.text('Nível ' + str(nivel) + '   Pontos: ' + str(pontos), midtop=(WIDTH / 2, 2), fontsize=24, color='white')
    screen.draw.text('Vidas do grupo: ' + str(vidas), topright=(WIDTH - 8, 2), fontsize=24, color='white')
    if quadros < 240 and estado == 'jogando':
        screen.draw.text('Setas, WASD, IJKL ou TFGH: cada herói entra quando você o move', center=(WIDTH / 2, HEIGHT - 40), fontsize=26, color='white', owidth=1, ocolor='black')
    if estado == 'passou':
        screen.draw.text('Fora da masmorra!', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='yellow', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='orange', owidth=1, ocolor='black')
    if estado != 'jogando':
        screen.draw.text('Espaço continua', center=(WIDTH / 2, HEIGHT / 2 + 50), fontsize=34, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global nivel
    if key != keys.SPACE:
        return
    if estado == 'passou':
        nivel = nivel + 1
        montar_nivel()
    elif estado == 'fim':
        novo_jogo()


novo_jogo()
pgzrun.go()
