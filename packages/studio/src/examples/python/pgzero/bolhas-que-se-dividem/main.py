import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Bolhas que se Dividem'
CHAO = 560
GRAVIDADE = 0.15
# Cada lista é lida pelo tamanho da bolha: 1 é a menor e 3 a maior (a posição 0 não é usada).
RAIOS = [0, 16, 30, 48]
QUIQUES = [0, 6, 7.5, 9]
PONTOS = [0, 300, 200, 100]
VELOCIDADE_DO_ARPAO = 10

jogador = Actor('jogador', (WIDTH / 2, CHAO), anchor=('center', 'bottom'))
ponta = Actor('ponta', anchor=('center', 'top'))
bolhas = []
atirando = False
arpao_x = 0
arpao_topo = 0
pontos = 0
vidas = 3
nivel = 1
# Quadros de espera antes de as bolhas começarem a pular.
pausa = 0
# Quadros em que o jogador pisca protegido, logo depois de perder uma vida.
protegido = 0
# 'jogando', 'passou' ou 'fim'
estado = 'jogando'


def nova_bolha(tamanho, x, y, vx, vy):
    bolha = Actor('bolha' + str(tamanho), (x, y))
    bolha.tamanho = tamanho
    bolha.vx = vx
    bolha.vy = vy
    bolhas.append(bolha)


def comecar_nivel():
    global atirando, pausa, protegido, estado
    bolhas.clear()
    # Uma bolha grande a mais a cada nível, até quatro.
    for i in range(min(nivel, 4)):
        vx = 2
        if i % 2 == 1:
            vx = -2
        nova_bolha(3, 150 + i * 170, 150, vx, 0)
    jogador.x = WIDTH / 2
    atirando = False
    pausa = 60
    protegido = 0
    estado = 'jogando'


def novo_jogo():
    global pontos, vidas, nivel
    pontos = 0
    vidas = 3
    nivel = 1
    comecar_nivel()


def mover_bolhas():
    for bolha in bolhas:
        raio = RAIOS[bolha.tamanho]
        bolha.vy = bolha.vy + GRAVIDADE
        bolha.x = bolha.x + bolha.vx
        bolha.y = bolha.y + bolha.vy
        if bolha.x < raio:
            bolha.x = raio
            bolha.vx = abs(bolha.vx)
        if bolha.x > WIDTH - raio:
            bolha.x = WIDTH - raio
            bolha.vx = -abs(bolha.vx)
        # No chão, cada tamanho quica sempre até a mesma altura.
        if bolha.y > CHAO - raio:
            bolha.y = CHAO - raio
            bolha.vy = -QUIQUES[bolha.tamanho]


def acertar():
    global atirando, pontos
    for bolha in bolhas:
        raio = RAIOS[bolha.tamanho]
        if abs(bolha.x - arpao_x) < raio and bolha.y + raio > arpao_topo:
            atirando = False
            bolhas.remove(bolha)
            pontos = pontos + PONTOS[bolha.tamanho]
            sounds.estouro.play()
            # A bolha se divide em duas menores, que saltam para os lados.
            if bolha.tamanho > 1:
                nova_bolha(bolha.tamanho - 1, bolha.x - 10, bolha.y, -2, -5)
                nova_bolha(bolha.tamanho - 1, bolha.x + 10, bolha.y, 2, -5)
            return


def encostou():
    for bolha in bolhas:
        raio = RAIOS[bolha.tamanho]
        if abs(bolha.x - jogador.x) < raio + 12 and bolha.y + raio > jogador.top + 10:
            return True
    return False


def perder_vida():
    global vidas, estado, protegido
    vidas = vidas - 1
    sounds.ai.play()
    if vidas == 0:
        estado = 'fim'
    else:
        # As bolhas continuam onde estão; o jogador pisca protegido por dois segundos.
        protegido = 120


def update():
    global pausa, arpao_topo, atirando, estado, protegido
    if estado != 'jogando':
        return
    if pausa > 0:
        pausa = pausa - 1
        return
    if keyboard.left and jogador.left > 0:
        jogador.x = jogador.x - 4
    if keyboard.right and jogador.right < WIDTH:
        jogador.x = jogador.x + 4
    if atirando:
        arpao_topo = arpao_topo - VELOCIDADE_DO_ARPAO
        if arpao_topo <= 0:
            atirando = False
        else:
            acertar()
    mover_bolhas()
    if protegido > 0:
        protegido = protegido - 1
    elif encostou():
        perder_vida()
    elif not bolhas:
        estado = 'passou'
        sounds.nivel.play()


def draw():
    screen.blit('fundo', (0, 0))
    if atirando:
        screen.draw.line((arpao_x, CHAO), (arpao_x, arpao_topo), (255, 235, 59))
        ponta.pos = (arpao_x, arpao_topo)
        ponta.draw()
    for bolha in bolhas:
        bolha.draw()
    if estado != 'fim' and protegido // 6 % 2 == 0:
        jogador.draw()
    screen.draw.text('Pontos: ' + str(pontos), topleft=(20, 568), fontsize=30, color='white')
    screen.draw.text('Nível ' + str(nivel), midtop=(WIDTH / 2, 568), fontsize=30, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(WIDTH - 20, 568), fontsize=30, color='white')
    if estado == 'passou':
        screen.draw.text('Nível ' + str(nivel) + ' completo!', center=(WIDTH / 2, 260), fontsize=60, color='yellow', owidth=1, ocolor='black')
    if estado == 'fim':
        screen.draw.text('Fim de jogo!', center=(WIDTH / 2, 260), fontsize=60, color='orange', owidth=1, ocolor='black')
    if estado != 'jogando':
        screen.draw.text('Espaço continua', center=(WIDTH / 2, 320), fontsize=34, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global atirando, arpao_x, arpao_topo, nivel
    if key != keys.SPACE:
        return
    if estado == 'passou':
        nivel = nivel + 1
        comecar_nivel()
    elif estado == 'fim':
        novo_jogo()
    elif not atirando and pausa == 0:
        # Um arpão de cada vez: ele sobe de onde o jogador está.
        atirando = True
        arpao_x = jogador.x
        arpao_topo = CHAO - 40
        sounds.arpao.play()


novo_jogo()
pgzrun.go()
