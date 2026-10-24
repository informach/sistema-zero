import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Placar dos Campeões'
TEMPO = 15
ARQUIVO = 'placar.txt'
TAMANHO_DO_PLACAR = 10
LETRAS_NO_NOME = 10

estrela = Actor('estrela')
# O placar é uma lista de pares (pontos, nome), do maior para o menor.
placar = []
pontos = 0
quadros_restantes = 0
nome = ''
# 'placar', 'jogando' ou 'nome'
estado = 'placar'


def placar_vazio():
    placar.clear()
    for numero in range(TAMANHO_DO_PLACAR):
        placar.append((0, '---'))


def carregar_placar():
    placar_vazio()
    try:
        with open(ARQUIVO, 'r') as arquivo:
            linhas = []
            for linha in arquivo:
                partes = linha.strip().split(';')
                linhas.append((int(partes[0]), partes[1]))
    except (OSError, ValueError, IndexError):
        return
    placar.clear()
    for par in linhas[:TAMANHO_DO_PLACAR]:
        placar.append(par)
    while len(placar) < TAMANHO_DO_PLACAR:
        placar.append((0, '---'))


def guardar_placar():
    with open(ARQUIVO, 'w') as arquivo:
        for par in placar:
            arquivo.write(str(par[0]) + ';' + par[1] + '\n')


def entra_no_placar(novos_pontos):
    # Entra quem fez mais pontos que o último da lista.
    return novos_pontos > placar[TAMANHO_DO_PLACAR - 1][0]


def anotar(novos_pontos, novo_nome):
    global placar
    # Anda pela lista até achar o primeiro lugar com menos pontos: é ali que o nome entra.
    lugar = 0
    while lugar < len(placar) and novos_pontos <= placar[lugar][0]:
        lugar = lugar + 1
    placar = placar[:lugar] + [(novos_pontos, novo_nome)] + placar[lugar:]
    # Só os dez primeiros ficam.
    placar = placar[:TAMANHO_DO_PLACAR]
    guardar_placar()


def mudar_estrela():
    estrela.pos = (random.randint(60, WIDTH - 60), random.randint(120, HEIGHT - 60))


def comecar():
    global pontos, quadros_restantes, estado
    pontos = 0
    quadros_restantes = TEMPO * 60
    mudar_estrela()
    estado = 'jogando'


def update():
    global quadros_restantes, estado, nome
    if estado != 'jogando':
        return
    quadros_restantes = quadros_restantes - 1
    if quadros_restantes <= 0:
        sounds.fim.play()
        if entra_no_placar(pontos):
            nome = ''
            estado = 'nome'
        else:
            estado = 'placar'


def on_mouse_down(pos):
    global pontos
    if estado == 'jogando' and estrela.collidepoint(pos):
        pontos = pontos + 1
        sounds.estrela.play()
        mudar_estrela()


def on_key_down(key, unicode):
    global nome, estado
    if estado == 'placar' and key == keys.SPACE:
        comecar()
    elif estado == 'nome':
        # O nome é digitado na tela: Enter confirma e a tecla de apagar volta uma letra.
        if key == keys.RETURN and nome != '':
            anotar(pontos, nome)
            sounds.recorde.play()
            estado = 'placar'
        elif key == keys.BACKSPACE:
            nome = nome[:-1]
        elif unicode != '' and (unicode.isalnum() or unicode == ' ') and len(nome) < LETRAS_NO_NOME:
            nome = nome + unicode


def draw():
    screen.blit('fundo', (0, 0))
    if estado == 'jogando':
        estrela.draw()
        screen.draw.text('Pontos: ' + str(pontos), topleft=(20, 20), fontsize=40, color='white')
        screen.draw.text('Tempo: ' + str((quadros_restantes + 59) // 60), topright=(WIDTH - 20, 20), fontsize=40, color='white')
        return
    screen.draw.text('Placar dos Campeões', center=(WIDTH / 2, 50), fontsize=56, color='yellow', owidth=1, ocolor='black')
    if estado == 'nome':
        screen.draw.text('Você fez ' + str(pontos) + ' pontos e entrou no placar!', center=(WIDTH / 2, 200), fontsize=40, color='white')
        screen.draw.text('Digite seu nome e aperte Enter:', center=(WIDTH / 2, 260), fontsize=34, color='white')
        screen.draw.text(nome + '_', center=(WIDTH / 2, 330), fontsize=60, color='yellow', owidth=1, ocolor='black')
        return
    for lugar in range(len(placar)):
        y = 110 + lugar * 38
        screen.draw.text(str(lugar + 1) + '.', topright=(250, y), fontsize=34, color='white')
        screen.draw.text(placar[lugar][1], topleft=(280, y), fontsize=34, color='white')
        screen.draw.text(str(placar[lugar][0]), topright=(560, y), fontsize=34, color='yellow')
    screen.draw.text('Espaço começa: clique em quantas estrelas puder em ' + str(TEMPO) + ' segundos', center=(WIDTH / 2, 520), fontsize=28, color='white', owidth=1, ocolor='black')


carregar_placar()
pgzrun.go()
