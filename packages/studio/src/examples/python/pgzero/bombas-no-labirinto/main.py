import random
import pgzrun

LADO = 48
COLUNAS = 13
LINHAS = 11
TOPO = 48
WIDTH = COLUNAS * LADO
HEIGHT = TOPO + LINHAS * LADO
TITLE = 'Bombas no Labirinto'
ALCANCE = 3
# Quadros até a bomba explodir e até o fogo apagar.
TEMPO_DA_BOMBA = 120
TEMPO_DO_FOGO = 30
DIRECOES = [(0, -1), (1, 0), (0, 1), (-1, 0)]

# Cada casa guarda o nome do que está nela (que é também o nome da imagem) e um relógio.
mapa = []
relogio = []
heroi = Actor('heroi')
monstros = []
porta = (0, 0)
heroi_coluna = 0
heroi_linha = 0
vidas = 3
# Quadros em que o herói pisca protegido, logo depois de perder uma vida.
protegido = 0
pontos = 0
fase = 1
quadros = 0
# 'jogando', 'passou' ou 'fim'
estado = 'jogando'


def montar_fase():
    global porta, quadros, estado
    mapa.clear()
    relogio.clear()
    for linha in range(LINHAS):
        mapa.append([])
        relogio.append([])
        for coluna in range(COLUNAS):
            if coluna % 2 == 1 and linha % 2 == 1:
                casa = 'parede'
            elif coluna + linha <= 2:
                # O canto de cima à esquerda fica livre para o herói começar.
                casa = 'chao'
            elif random.randint(1, 100) <= 45:
                casa = 'tijolo'
            else:
                casa = 'chao'
            mapa[linha].append(casa)
            relogio[linha].append(0)
    # A porta fica escondida debaixo de um tijolo sorteado.
    tijolos = []
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            if mapa[linha][coluna] == 'tijolo':
                tijolos.append((coluna, linha))
    porta = random.choice(tijolos)
    monstros.clear()
    while len(monstros) < 2 + fase:
        coluna = random.randint(4, COLUNAS - 1)
        linha = random.randint(4, LINHAS - 1)
        if mapa[linha][coluna] == 'chao':
            monstro = Actor('monstro')
            monstro.coluna = coluna
            monstro.linha = linha
            monstros.append(monstro)
    colocar_heroi()
    quadros = 0
    estado = 'jogando'


def novo_jogo():
    global vidas, pontos, fase
    vidas = 3
    pontos = 0
    fase = 1
    montar_fase()


def colocar_heroi():
    global heroi_coluna, heroi_linha, protegido
    heroi_coluna = 0
    heroi_linha = 0
    protegido = 0


def centro(coluna, linha):
    return (coluna * LADO + LADO / 2, TOPO + linha * LADO + LADO / 2)


def pode_andar(coluna, linha):
    if coluna < 0 or coluna >= COLUNAS or linha < 0 or linha >= LINHAS:
        return False
    return mapa[linha][coluna] in ('chao', 'fogo')


def explodir(coluna, linha):
    mapa[linha][coluna] = 'fogo'
    relogio[linha][coluna] = TEMPO_DO_FOGO
    sounds.explosao.play()
    # O fogo vai para os quatro lados até o alcance, parando na parede.
    for dc, dl in DIRECOES:
        for passo in range(1, ALCANCE + 1):
            c = coluna + dc * passo
            l = linha + dl * passo
            if c < 0 or c >= COLUNAS or l < 0 or l >= LINHAS or mapa[l][c] == 'parede':
                break
            if mapa[l][c] == 'bomba':
                # Outra bomba no caminho explode logo em seguida.
                relogio[l][c] = 1
                break
            parar = mapa[l][c] == 'tijolo'
            mapa[l][c] = 'fogo'
            relogio[l][c] = TEMPO_DO_FOGO
            if parar:
                break


def perder_vida():
    global vidas, estado, protegido
    vidas = vidas - 1
    sounds.ai.play()
    if vidas == 0:
        estado = 'fim'
    else:
        colocar_heroi()
        # Volta ao começo protegido por dois segundos: o fogo e os monstros não machucam.
        protegido = 120


def mover_monstros():
    for monstro in monstros:
        caminhos = []
        for dc, dl in DIRECOES:
            if pode_andar(monstro.coluna + dc, monstro.linha + dl):
                caminhos.append((monstro.coluna + dc, monstro.linha + dl))
        if caminhos:
            monstro.coluna, monstro.linha = random.choice(caminhos)


def update():
    global quadros, pontos, estado, protegido
    if estado != 'jogando':
        return
    quadros = quadros + 1
    if protegido > 0:
        protegido = protegido - 1
    # Os relógios das bombas e do fogo.
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            if relogio[linha][coluna] > 0:
                relogio[linha][coluna] = relogio[linha][coluna] - 1
                if relogio[linha][coluna] == 0:
                    if mapa[linha][coluna] == 'bomba':
                        explodir(coluna, linha)
                    elif mapa[linha][coluna] == 'fogo':
                        mapa[linha][coluna] = 'chao'
    if quadros % 30 == 0:
        mover_monstros()
    for monstro in list(monstros):
        if mapa[monstro.linha][monstro.coluna] == 'fogo':
            monstros.remove(monstro)
            pontos = pontos + 100
            sounds.monstro.play()
        elif monstro.coluna == heroi_coluna and monstro.linha == heroi_linha and protegido == 0:
            perder_vida()
            return
    if mapa[heroi_linha][heroi_coluna] == 'fogo' and protegido == 0:
        perder_vida()
        return
    # Sem monstros, a porta descoberta leva para a fase seguinte.
    if not monstros and (heroi_coluna, heroi_linha) == porta and mapa[heroi_linha][heroi_coluna] == 'chao':
        estado = 'passou'
        sounds.porta.play()


def draw():
    screen.fill((20, 20, 30))
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            x = coluna * LADO
            y = TOPO + linha * LADO
            screen.blit('chao', (x, y))
            if (coluna, linha) == porta and mapa[linha][coluna] != 'tijolo':
                screen.blit('porta', (x, y))
            if mapa[linha][coluna] != 'chao':
                screen.blit(mapa[linha][coluna], (x, y))
    for monstro in monstros:
        monstro.pos = centro(monstro.coluna, monstro.linha)
        monstro.draw()
    if estado != 'fim' and protegido // 6 % 2 == 0:
        heroi.pos = centro(heroi_coluna, heroi_linha)
        heroi.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(10, 12), fontsize=30, color='white')
    screen.draw.text('Fase ' + str(fase) + '   Monstros: ' + str(len(monstros)), midtop=(WIDTH / 2, 12), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 10, 12), fontsize=30, color='white')
    if estado == 'passou':
        screen.draw.text('Fase ' + str(fase) + ' completa!', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='yellow', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, HEIGHT / 2), fontsize=56, color='orange', owidth=1, ocolor='black')
    if estado != 'jogando':
        screen.draw.text('Espaço continua', center=(WIDTH / 2, HEIGHT / 2 + 50), fontsize=34, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global heroi_coluna, heroi_linha, fase
    if estado == 'passou':
        if key == keys.SPACE:
            fase = fase + 1
            montar_fase()
        return
    if estado == 'fim':
        if key == keys.SPACE:
            novo_jogo()
        return
    if key == keys.SPACE:
        # Uma bomba de cada vez, na casa onde o herói está.
        for linha in mapa:
            if 'bomba' in linha:
                return
        mapa[heroi_linha][heroi_coluna] = 'bomba'
        relogio[heroi_linha][heroi_coluna] = TEMPO_DA_BOMBA
        return
    dc = 0
    dl = 0
    if key == keys.LEFT:
        dc = -1
    elif key == keys.RIGHT:
        dc = 1
    elif key == keys.UP:
        dl = -1
    elif key == keys.DOWN:
        dl = 1
    if (dc != 0 or dl != 0) and pode_andar(heroi_coluna + dc, heroi_linha + dl):
        heroi_coluna = heroi_coluna + dc
        heroi_linha = heroi_linha + dl


novo_jogo()
pgzrun.go()
