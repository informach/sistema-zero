import pgzrun

WIDTH = 800
HEIGHT = 460
TITLE = 'Piano Maluco'
BATIDAS_POR_MINUTO = 100
TEMPO_DA_BATIDA = 60 / BATIDAS_POR_MINUTO
LINHA = 250
DISTANCIA = 28
TOPO_DO_PIANO = 290
INICIO_X = 100

# Brilha, Brilha, Estrelinha: uma nota por batida; '' é uma pausa.
# A música é feita de três frases, e algumas se repetem.
FRASE_A = ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', '']
FRASE_B = ['F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4', '']
FRASE_C = ['G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', '']
MUSICA = FRASE_A + FRASE_B + FRASE_C + FRASE_C + FRASE_A + FRASE_B
BRANCAS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5']
# Estas brancas têm uma tecla preta (o sustenido) logo à direita.
COM_SUSTENIDO = ['C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5']

# O lugar de cada tecla e o som de cada nota, preparados uma vez só.
teclas_brancas = {}
teclas_pretas = {}
sons = {}
for numero in range(len(BRANCAS)):
    nota = BRANCAS[numero]
    teclas_brancas[nota] = Rect((INICIO_X + numero * 60, TOPO_DO_PIANO), (60, 150))
    if nota in COM_SUSTENIDO:
        sustenido = nota[0] + '#' + nota[1]
        teclas_pretas[sustenido] = Rect((INICIO_X + numero * 60 + 42, TOPO_DO_PIANO), (36, 95))
for nota in list(teclas_brancas) + list(teclas_pretas):
    sons[nota] = tone.create(nota, 0.4)

botao_ouvir = Actor('botao_ouvir')
botao_ouvir.pos = (160, 45)
botao_jogar = Actor('botao_jogar')
botao_jogar.pos = (640, 45)

estado = 'menu'
posicao = -6
relogio = 0
pontos = 0
erros = 0
perdidas = 0
acertou = False
tecla_acesa = ''
brilho = 0


def tocar(nota):
    global tecla_acesa, brilho
    sons[nota].play()
    tecla_acesa = nota
    brilho = 0.2


def nota_atual():
    if 0 <= posicao < len(MUSICA):
        return MUSICA[posicao]
    return ''


def comecar(modo):
    global estado, posicao, relogio, pontos, erros, perdidas, acertou
    estado = modo
    posicao = -6
    relogio = 0
    pontos = 0
    erros = 0
    perdidas = 0
    acertou = False


def proxima_batida():
    global posicao, acertou, perdidas, estado
    if estado == 'jogar' and nota_atual() != '' and not acertou:
        perdidas = perdidas + 1
    posicao = posicao + 1
    acertou = False
    if posicao >= len(MUSICA):
        if estado == 'ouvir':
            estado = 'menu'
        else:
            estado = 'fim'
        return
    if estado == 'ouvir' and nota_atual() != '':
        tocar(nota_atual())


def update(dt):
    global relogio, brilho
    brilho = max(brilho - dt, 0)
    if estado not in ('ouvir', 'jogar'):
        return
    relogio = relogio + dt
    if relogio >= TEMPO_DA_BATIDA:
        relogio = relogio - TEMPO_DA_BATIDA
        proxima_batida()


def tecla_em(pos):
    # As pretas ficam por cima das brancas: elas são procuradas primeiro.
    for nota in teclas_pretas:
        if teclas_pretas[nota].collidepoint(pos):
            return nota
    for nota in teclas_brancas:
        if teclas_brancas[nota].collidepoint(pos):
            return nota
    return ''


def on_mouse_down(pos):
    global pontos, erros, acertou
    if botao_ouvir.collidepoint(pos):
        comecar('ouvir')
        return
    if botao_jogar.collidepoint(pos):
        comecar('jogar')
        return
    nota = tecla_em(pos)
    if nota == '':
        return
    tocar(nota)
    # Na pausa e na contagem, a tecla só toca: não é acerto nem erro.
    if estado == 'jogar' and nota_atual() != '':
        if nota == nota_atual() and not acertou:
            pontos = pontos + 1
            acertou = True
        else:
            erros = erros + 1


def centro_da_tecla(nota):
    if nota in teclas_pretas:
        return teclas_pretas[nota].centerx
    return teclas_brancas[nota].centerx


def desenhar_piano():
    for nota in teclas_brancas:
        cor = 'yellow' if nota == tecla_acesa and brilho > 0 else 'white'
        screen.draw.filled_rect(teclas_brancas[nota], cor)
        screen.draw.rect(teclas_brancas[nota], 'black')
        screen.draw.text(nota[0], midbottom=(teclas_brancas[nota].centerx, 432), fontsize=26, color='gray')
    for nota in teclas_pretas:
        cor = 'orange' if nota == tecla_acesa and brilho > 0 else 'black'
        screen.draw.filled_rect(teclas_pretas[nota], cor)


def desenhar_notas():
    # As próximas notas descem até a linha: a verde é a da vez e passa pela linha no meio dela.
    descida = relogio / TEMPO_DA_BATIDA * DISTANCIA - DISTANCIA / 2
    for adiante in range(5):
        lugar = posicao + adiante
        if 0 <= lugar < len(MUSICA) and MUSICA[lugar] != '':
            y = LINHA - adiante * DISTANCIA + descida
            cor = 'limegreen' if adiante == 0 else 'royalblue'
            screen.draw.filled_circle((centro_da_tecla(MUSICA[lugar]), y), 11, cor)


def draw():
    screen.fill((250, 245, 230))
    botao_ouvir.draw()
    botao_jogar.draw()
    screen.draw.text('Ouvir', center=(botao_ouvir.x + 20, botao_ouvir.y), fontsize=36, color='white')
    screen.draw.text('Jogar', center=(botao_jogar.x + 20, botao_jogar.y), fontsize=36, color='white')
    screen.draw.line((80, LINHA), (WIDTH - 80, LINHA), 'black')
    desenhar_notas()
    desenhar_piano()
    if estado == 'menu':
        screen.draw.text('Ouça a música ou toque junto!', center=(400, 150), fontsize=40, color='black')
    if estado == 'jogar' or estado == 'fim':
        placar = 'Acertos: ' + str(pontos) + '   Erros: ' + str(erros) + '   Perdidas: ' + str(perdidas)
        screen.draw.text(placar, center=(400, 95), fontsize=26, color='black')
    if estado == 'fim':
        screen.draw.text('Fim da música!', center=(400, 160), fontsize=56, color='purple')


pgzrun.go()
