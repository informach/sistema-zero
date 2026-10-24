import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Bichinhos em Fila'
TOTAL = 10
PARA_VENCER = 6
QUEDA_MAXIMA = 150
SUBIDA = 4

entrada = Actor('entrada')
entrada.pos = (90, 150)
saida = Actor('saida')
saida.midbottom = (740, 420)
bichos = []
direcoes = []
estados = []
quedas = []
soltos = 0
salvos = 0
bloqueios = 0


def chao_em(x, y):
    # A imagem da fase é o mapa: onde ela tem cor, tem chão; onde é transparente, é ar.
    if x < 0 or x >= WIDTH or y < 0 or y >= HEIGHT:
        return False
    return images.fase.get_at((int(x), int(y)))[3] > 0


def soltar_bicho():
    global soltos
    if soltos < TOTAL:
        bicho = Actor('bicho_d0')
        bicho.midbottom = (entrada.x, entrada.bottom + 4)
        bichos.append(bicho)
        direcoes.append(1)
        estados.append('caindo')
        quedas.append(0)
        soltos = soltos + 1


def andar(numero):
    bicho = bichos[numero]
    passo = direcoes[numero]
    frente = bicho.x + passo * 5
    # Procura um lugar livre na frente, subindo no máximo SUBIDA pixels de degrau.
    for degrau in range(SUBIDA + 1):
        if not chao_em(frente, bicho.bottom - 1 - degrau):
            bicho.x = bicho.x + passo
            bicho.y = bicho.y - degrau
            return
    # Parede alta demais: dá meia-volta.
    direcoes[numero] = -passo


def sumir(numero, estado):
    # Quem chegou à saída ou caiu sai do jogo: vai para longe da tela.
    estados[numero] = estado
    bichos[numero].pos = (-100, -100)


def mover(numero):
    global salvos
    bicho = bichos[numero]
    estado = estados[numero]
    if estado in ('salvo', 'morto', 'bloqueando'):
        return
    if bicho.top > HEIGHT:
        sumir(numero, 'morto')
        return
    if not chao_em(bicho.x, bicho.bottom):
        estados[numero] = 'caindo'
        bicho.y = bicho.y + 2
        quedas[numero] = quedas[numero] + 2
        return
    if quedas[numero] > QUEDA_MAXIMA:
        sumir(numero, 'morto')
        sounds.ai.play()
        return
    quedas[numero] = 0
    estados[numero] = 'andando'
    andar(numero)
    # Quem encosta num bloqueador volta.
    for outro in range(len(bichos)):
        if estados[outro] == 'bloqueando' and abs(bichos[outro].x - bicho.x) < 14 and abs(bichos[outro].y - bicho.y) < 16:
            direcoes[numero] = -1 if bicho.x < bichos[outro].x else 1
    if bicho.colliderect(saida):
        sumir(numero, 'salvo')
        salvos = salvos + 1
        sounds.salvo.play()


def draw():
    screen.blit('ceu', (0, 0))
    screen.blit('fase', (0, 0))
    entrada.draw()
    saida.draw()
    for bicho in bichos:
        bicho.draw()
    screen.draw.text('Salvos: ' + str(salvos) + ' (meta: ' + str(PARA_VENCER) + ')', topleft=(12, 8), fontsize=30, color='white', owidth=1.5, ocolor='black')
    screen.draw.text('Bloqueios: ' + str(3 - bloqueios), topright=(WIDTH - 12, 8), fontsize=30, color='white', owidth=1.5, ocolor='black')
    if acabou():
        if salvos >= PARA_VENCER:
            mensagem = 'Você salvou ' + str(salvos) + ' bichinhos! Clique para jogar de novo'
        else:
            mensagem = 'Só ' + str(salvos) + ' chegaram. Clique para tentar de novo'
        screen.draw.text(mensagem, center=(WIDTH / 2, 560), fontsize=36, color='yellow', owidth=2, ocolor='black')


def acabou():
    if soltos < TOTAL:
        return False
    for estado in estados:
        if estado in ('andando', 'caindo'):
            return False
    return True


def update():
    for numero in range(len(bichos)):
        mover(numero)
        bicho = bichos[numero]
        lado = 'd' if direcoes[numero] == 1 else 'e'
        if estados[numero] == 'bloqueando':
            bicho.image = 'bicho_bloqueio'
        elif estados[numero] == 'caindo':
            bicho.image = 'bicho_' + lado + '0'
        else:
            bicho.image = 'bicho_' + lado + str(int(bicho.x / 6) % 2)


def on_mouse_down(pos):
    global bloqueios, soltos, salvos
    if acabou():
        bichos.clear()
        direcoes.clear()
        estados.clear()
        quedas.clear()
        soltos = 0
        salvos = 0
        bloqueios = 0
        return
    # Clicar num bichinho andando faz ele parar e mandar os outros de volta.
    # Clicar num que está bloqueando solta ele: assim os bichinhos nunca ficam presos.
    for numero in range(len(bichos)):
        if not bichos[numero].collidepoint(pos):
            continue
        if estados[numero] == 'andando' and bloqueios < 3:
            estados[numero] = 'bloqueando'
            bloqueios = bloqueios + 1
            sounds.bloqueio.play()
            return
        if estados[numero] == 'bloqueando':
            estados[numero] = 'andando'
            bloqueios = bloqueios - 1
            sounds.bloqueio.play()
            return


clock.schedule_interval(soltar_bicho, 1.5)
pgzrun.go()
