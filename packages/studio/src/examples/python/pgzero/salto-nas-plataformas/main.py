import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Salto nas Plataformas'
GRAVIDADE = 0.4
PULO = -10
VELOCIDADE = 4

# O chão e as plataformas, em zigue-zague: nenhuma fica em cima do caminho de outro pulo.
plataformas = [
    Rect((0, 560), (800, 40)),
    Rect((150, 480), (120, 20)),
    Rect((340, 410), (120, 20)),
    Rect((540, 340), (120, 20)),
    Rect((680, 260), (100, 20)),
    Rect((440, 190), (120, 20)),
    Rect((180, 150), (160, 20)),
]
estrelas = []
for plataforma in plataformas[1:]:
    estrela = Actor('estrela')
    estrela.midbottom = (plataforma.centerx, plataforma.top - 8)
    estrelas.append(estrela)

dino = Actor('dino')
dino.midbottom = (60, 560)
velocidade_y = 0
no_chao = False
pontos = 0


def draw():
    screen.blit('fundo', (0, 0))
    for plataforma in plataformas:
        screen.draw.filled_rect(plataforma, (121, 85, 72))
        screen.draw.filled_rect(Rect((plataforma.x, plataforma.y), (plataforma.w, 6)), (104, 159, 56))
    for estrela in estrelas:
        estrela.draw()
    dino.draw()
    screen.draw.text('Estrelas: ' + str(pontos), topleft=(12, 10), fontsize=34, color='white', owidth=1.5, ocolor='black')
    if not estrelas:
        screen.draw.text('Você pegou todas as estrelas!', center=(WIDTH / 2, 80), fontsize=52, color='yellow', owidth=2, ocolor='black')


def mover_na_horizontal(passo):
    dino.x = dino.x + passo
    for plataforma in plataformas:
        if dino.colliderect(plataforma):
            if passo > 0:
                dino.right = plataforma.left
            else:
                dino.left = plataforma.right


def mover_na_vertical():
    global velocidade_y, no_chao
    velocidade_y = velocidade_y + GRAVIDADE
    dino.y = dino.y + velocidade_y
    no_chao = False
    for plataforma in plataformas:
        if dino.colliderect(plataforma):
            if velocidade_y > 0:
                dino.bottom = plataforma.top
                no_chao = True
            else:
                dino.top = plataforma.bottom
            velocidade_y = 0


def update():
    global velocidade_y, pontos
    if keyboard.left and dino.left > 0:
        mover_na_horizontal(-VELOCIDADE)
    if keyboard.right and dino.right < WIDTH:
        mover_na_horizontal(VELOCIDADE)
    mover_na_vertical()
    for estrela in list(estrelas):
        if dino.colliderect(estrela):
            estrelas.remove(estrela)
            pontos = pontos + 1
            sounds.estrela.play()


def on_key_down(key):
    global velocidade_y
    if key == keys.SPACE and no_chao:
        velocidade_y = PULO
        sounds.pulo.play()


pgzrun.go()
