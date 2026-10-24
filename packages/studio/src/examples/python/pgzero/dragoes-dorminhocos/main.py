import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Dragões Dorminhocos'
VELOCIDADE = 4
OVOS_PARA_VENCER = 20

heroi = Actor('heroi')
heroi.pos = (400, 540)

# Uma toca por dragão: quanto tempo ele dorme e quanto fica acordado (em quadros).
dragoes = [Actor('dragao_dormindo'), Actor('dragao_dormindo'), Actor('dragao_dormindo')]
ninhos = [Actor('ovos'), Actor('ovos'), Actor('ovos')]
tempo_dormindo = [180, 130, 90]
tempo_acordado = [70, 60, 50]
acordado = [False, False, False]
contadores = [0, 40, 80]
ovos_por_ninho = [1, 2, 3]

x = 160
for numero in range(3):
    dragoes[numero].pos = (x, 110)
    ninhos[numero].pos = (x, 230)
    x = x + 240

ovos = 0
vidas = 3
fim_de_jogo = False
venceu = False
protegido = 0


def voltar_ao_comeco():
    global protegido
    heroi.pos = (400, 540)
    protegido = 60


def atualizar_dragoes():
    for numero in range(3):
        contadores[numero] = contadores[numero] + 1
        if acordado[numero] and contadores[numero] >= tempo_acordado[numero]:
            acordado[numero] = False
            dragoes[numero].image = 'dragao_dormindo'
            contadores[numero] = 0
        elif not acordado[numero] and contadores[numero] >= tempo_dormindo[numero]:
            acordado[numero] = True
            dragoes[numero].image = 'dragao_acordado'
            contadores[numero] = 0


def pegar_ou_perder():
    global ovos, vidas, fim_de_jogo, venceu
    for numero in range(3):
        if heroi.colliderect(ninhos[numero]):
            if acordado[numero]:
                vidas = vidas - 1
                sounds.dano.play()
                if vidas == 0:
                    fim_de_jogo = True
                else:
                    voltar_ao_comeco()
            else:
                ovos = ovos + ovos_por_ninho[numero]
                sounds.ovo.play()
                voltar_ao_comeco()
                if ovos >= OVOS_PARA_VENCER:
                    venceu = True


def draw():
    screen.blit('masmorra', (0, 0))
    for ninho in ninhos:
        ninho.draw()
    for dragao in dragoes:
        dragao.draw()
    heroi.draw()
    screen.draw.text('Ovos: ' + str(ovos), topleft=(16, 12), fontsize=36, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 16, 12), fontsize=36, color='white')
    if fim_de_jogo:
        screen.draw.text('Os dragões acordaram! Fim de jogo', center=(WIDTH / 2, 360), fontsize=48, color='orange', owidth=2, ocolor='black')
    if venceu:
        screen.draw.text('Você juntou ' + str(ovos) + ' ovos e venceu!', center=(WIDTH / 2, 360), fontsize=48, color='yellow', owidth=2, ocolor='black')


def update():
    global protegido
    if fim_de_jogo or venceu:
        return
    atualizar_dragoes()
    if keyboard.left and heroi.left > 0:
        heroi.x = heroi.x - VELOCIDADE
    if keyboard.right and heroi.right < WIDTH:
        heroi.x = heroi.x + VELOCIDADE
    if keyboard.up and heroi.top > 0:
        heroi.y = heroi.y - VELOCIDADE
    if keyboard.down and heroi.bottom < HEIGHT:
        heroi.y = heroi.y + VELOCIDADE
    if protegido > 0:
        protegido = protegido - 1
    else:
        pegar_ou_perder()


pgzrun.go()
