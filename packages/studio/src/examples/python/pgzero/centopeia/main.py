import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Centopeia'
CASA = 40
COLUNAS = 20
LINHAS = 15
# O jogador anda só nas linhas de baixo, daqui para baixo.
ZONA_DO_JOGADOR = 11
PEDRAS_NO_COMECO = 30
PARTES_NA_PRIMEIRA_ONDA = 8
VIDAS = 3
VELOCIDADE_DO_JOGADOR = 4
VELOCIDADE_DO_TIRO = 14
# Quantos pixels a centopeia anda por quadro em cada onda.
VELOCIDADES = [2, 4, 5, 8]
# O besouro voador: de quanto em quanto tempo ele aparece, e quanto ele vale.
TEMPO_DO_BESOURO = 6.0
VELOCIDADE_DO_BESOURO = 3
PONTOS_DO_BESOURO = 50


class Parte:
    """Uma parte da centopeia: anda de casa em casa e desce quando bate numa pedra ou na borda."""

    def __init__(self, coluna, linha, direcao, velocidade):
        self.coluna = coluna
        self.linha = linha
        self.direcao = direcao
        self.vertical = 1
        self.velocidade = velocidade
        # Só a primeira parte de cada fila é cabeça.
        self.cabeca = False
        self.ator = Actor('corpo')
        self.ator.topleft = (coluna * CASA, linha * CASA)

    def escolher_proxima_casa(self):
        proxima = self.coluna + self.direcao
        dentro = 0 <= self.coluna < COLUNAS
        bloqueada = proxima < 0 or proxima >= COLUNAS or (proxima, self.linha) in pedras
        if dentro and bloqueada:
            # Desce uma linha e volta para o outro lado. Lá embaixo, na zona do
            # jogador, ela fica subindo e descendo.
            nova_linha = self.linha + self.vertical
            if nova_linha >= LINHAS or (self.vertical < 0 and nova_linha < ZONA_DO_JOGADOR):
                self.vertical = -self.vertical
            self.linha = self.linha + self.vertical
            self.direcao = -self.direcao
        else:
            self.coluna = proxima

    def andar(self):
        alvo = (self.coluna * CASA, self.linha * CASA)
        if self.ator.topleft == alvo:
            self.escolher_proxima_casa()
            alvo = (self.coluna * CASA, self.linha * CASA)
        x = self.ator.left + max(min(alvo[0] - self.ator.left, self.velocidade), -self.velocidade)
        y = self.ator.top + max(min(alvo[1] - self.ator.top, self.velocidade), -self.velocidade)
        self.ator.topleft = (x, y)


jogador = Actor('jogador')
tiro = Actor('tiro')
atirando = False
# O besouro cruza a zona do jogador em zigue-zague e come as pedras por onde passa.
besouro = Actor('besouro')
besouro_voando = False
espera_do_besouro = TEMPO_DO_BESOURO
# As pedras do campo, cada uma na sua casa: (coluna, linha) -> ator.
pedras = {}
centopeia = []
estado = 'inicio'
pontos = 0
vidas = VIDAS
onda = 1
protegido = 0
espera = 0


def espalhar_pedras():
    pedras.clear()
    # Nunca mais pedras do que cabem entre a linha 2 e a zona do jogador.
    quantas = min(PEDRAS_NO_COMECO, COLUNAS * (ZONA_DO_JOGADOR - 2))
    while len(pedras) < quantas:
        casa = (random.randrange(COLUNAS), random.randrange(2, ZONA_DO_JOGADOR))
        if casa not in pedras:
            por_pedra(casa)


def por_pedra(casa):
    pedra = Actor('pedra')
    pedra.topleft = (casa[0] * CASA, casa[1] * CASA)
    pedra.vida = 3
    pedras[casa] = pedra


def soltar_centopeia():
    # As partes entram pela esquerda, uma atrás da outra, na linha de cima.
    centopeia.clear()
    velocidade = VELOCIDADES[min(onda - 1, len(VELOCIDADES) - 1)]
    for numero in range(PARTES_NA_PRIMEIRA_ONDA + onda - 1):
        centopeia.append(Parte(-1 - numero, 1, 1, velocidade))
    centopeia[0].cabeca = True


def novo_jogo():
    global estado, pontos, vidas, onda, atirando, protegido, besouro_voando, espera_do_besouro
    estado = 'jogando'
    pontos = 0
    vidas = VIDAS
    onda = 1
    atirando = False
    protegido = 0
    besouro_voando = False
    espera_do_besouro = TEMPO_DO_BESOURO
    jogador.midbottom = (WIDTH / 2, HEIGHT)
    espalhar_pedras()
    soltar_centopeia()


def mover_jogador():
    if keyboard.left:
        jogador.x = jogador.x - VELOCIDADE_DO_JOGADOR
    if keyboard.right:
        jogador.x = jogador.x + VELOCIDADE_DO_JOGADOR
    if keyboard.up:
        jogador.y = jogador.y - VELOCIDADE_DO_JOGADOR
    if keyboard.down:
        jogador.y = jogador.y + VELOCIDADE_DO_JOGADOR
    jogador.left = min(max(jogador.left, 0), WIDTH - jogador.width)
    jogador.top = min(max(jogador.top, ZONA_DO_JOGADOR * CASA), HEIGHT - jogador.height)


def soltar_besouro():
    # Ele entra por um dos lados, numa altura sorteada da zona do jogador.
    global besouro_voando
    lado = random.choice([-1, 1])
    if lado == 1:
        besouro.right = 0
    else:
        besouro.left = WIDTH
    besouro.y = random.randint(ZONA_DO_JOGADOR * CASA + 20, HEIGHT - 20)
    besouro.vx = VELOCIDADE_DO_BESOURO * lado
    besouro.vy = VELOCIDADE_DO_BESOURO * random.choice([-1, 1])
    besouro_voando = True
    sounds.besouro.play()


def mover_besouro(dt):
    global besouro_voando, espera_do_besouro
    if not besouro_voando:
        espera_do_besouro = espera_do_besouro - dt
        if espera_do_besouro <= 0:
            soltar_besouro()
        return
    besouro.x = besouro.x + besouro.vx
    besouro.y = besouro.y + besouro.vy
    # Zigue-zague: bate no alto da zona ou no chão e volta (só vira quando está indo para fora).
    if (besouro.top < ZONA_DO_JOGADOR * CASA and besouro.vy < 0) or (besouro.bottom > HEIGHT and besouro.vy > 0):
        besouro.vy = -besouro.vy
    # Come a pedra que estiver embaixo dele.
    casa = (int(besouro.x // CASA), int(besouro.y // CASA))
    if casa in pedras:
        del pedras[casa]
    # Saiu pelo outro lado: some, e volta depois de um tempo.
    if besouro.right < -10 or besouro.left > WIDTH + 10:
        besouro_voando = False
        espera_do_besouro = TEMPO_DO_BESOURO


def mover_tiro():
    global atirando, pontos, besouro_voando, espera_do_besouro
    if not atirando:
        if keyboard.space:
            # Um tiro por vez: o próximo só sai quando este acertar ou sumir.
            tiro.midbottom = jogador.midtop
            atirando = True
            sounds.tiro.play()
        return
    tiro.y = tiro.y - VELOCIDADE_DO_TIRO
    if tiro.bottom < 0:
        atirando = False
        return
    if besouro_voando and tiro.colliderect(besouro):
        besouro_voando = False
        espera_do_besouro = TEMPO_DO_BESOURO
        pontos = pontos + PONTOS_DO_BESOURO
        atirando = False
        sounds.acerto.play()
        return
    for numero in range(len(centopeia)):
        parte = centopeia[numero]
        if tiro.colliderect(parte.ator):
            # A parte acertada vira pedra na casa para onde ia, e a fila se parte em duas:
            # a parte de trás vira a cabeça da nova fila.
            if numero + 1 < len(centopeia):
                centopeia[numero + 1].cabeca = True
            casa = (parte.coluna, parte.linha)
            centopeia.remove(parte)
            if casa not in pedras and 0 <= casa[0] < COLUNAS:
                por_pedra(casa)
            pontos = pontos + 10
            atirando = False
            sounds.acerto.play()
            return
    for casa in list(pedras):
        pedra = pedras[casa]
        if tiro.colliderect(pedra):
            pedra.vida = pedra.vida - 1
            if pedra.vida == 0:
                del pedras[casa]
                pontos = pontos + 1
            atirando = False
            sounds.pedra.play()
            return


def bater():
    # Encostou na centopeia ou no besouro: perde uma vida e fica protegido um tempo.
    global vidas, protegido, estado, espera
    vidas = vidas - 1
    protegido = 2.0
    sounds.batida.play()
    if vidas <= 0:
        estado = 'fim'
        espera = 1.0


def update(dt):
    global onda, protegido, espera
    if estado == 'fim':
        espera = espera - dt
    if estado != 'jogando':
        return
    protegido = protegido - dt
    mover_jogador()
    mover_tiro()
    mover_besouro(dt)
    if besouro_voando and protegido <= 0 and besouro.colliderect(jogador):
        bater()
    for parte in centopeia:
        parte.andar()
        if protegido <= 0 and parte.ator.colliderect(jogador):
            bater()
    if estado != 'jogando':
        return
    if not centopeia:
        # Acabou a centopeia: vem outra, maior e mais rápida.
        onda = onda + 1
        soltar_centopeia()


def on_key_down(key):
    if key == keys.SPACE:
        if estado == 'inicio' or (estado == 'fim' and espera <= 0):
            novo_jogo()


def draw():
    screen.fill((25, 45, 30))
    screen.draw.filled_rect(Rect((0, ZONA_DO_JOGADOR * CASA), (WIDTH, HEIGHT - ZONA_DO_JOGADOR * CASA)), (35, 60, 40))
    for casa in pedras:
        pedra = pedras[casa]
        pedra.draw()
        # Rachaduras: cada tiro que a pedra levou deixa uma marca.
        for marca in range(3 - pedra.vida):
            screen.draw.line((pedra.left + 10 + marca * 8, pedra.top + 8), (pedra.left + 16 + marca * 8, pedra.bottom - 8), (60, 40, 30))
    for parte in centopeia:
        if parte.cabeca:
            parte.ator.image = 'cabeca'
        else:
            parte.ator.image = 'corpo'
        parte.ator.draw()
    if besouro_voando:
        besouro.draw()
    if atirando:
        tiro.draw()
    if estado == 'jogando' and (protegido <= 0 or int(protegido * 10) % 2 == 0):
        jogador.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(10, 6), fontsize=32, color='white')
    screen.draw.text('Onda ' + str(onda) + '   Vidas: ' + str(vidas), topright=(WIDTH - 10, 6), fontsize=32, color='white')
    if estado == 'inicio':
        screen.draw.text('Centopeia', center=(WIDTH / 2, 230), fontsize=80, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Setas: andar   Espaço: atirar', center=(WIDTH / 2, 310), fontsize=36, color='white')
        screen.draw.text('Aperte espaço para começar', center=(WIDTH / 2, 360), fontsize=36, color='yellow')
    if estado == 'fim':
        screen.draw.text('Fim de jogo', center=(WIDTH / 2, 250), fontsize=80, color='white', owidth=2, ocolor='red')
        if espera <= 0:
            screen.draw.text('Espaço: jogar de novo', center=(WIDTH / 2, 330), fontsize=36, color='yellow')


espalhar_pedras()
pgzrun.go()
