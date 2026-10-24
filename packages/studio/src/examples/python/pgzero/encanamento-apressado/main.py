import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Encanamento Apressado'
LINHAS = 7
COLUNAS = 10
TAMANHO = 64
X0 = 120
Y0 = 100
META = 12

# Cada peça diz por quais lados a água entra e sai.
ABERTURAS = {
    'horizontal': ['esquerda', 'direita'],
    'vertical': ['cima', 'baixo'],
    'cruz': ['cima', 'baixo', 'esquerda', 'direita'],
    'cima_direita': ['cima', 'direita'],
    'cima_esquerda': ['cima', 'esquerda'],
    'baixo_direita': ['baixo', 'direita'],
    'baixo_esquerda': ['baixo', 'esquerda'],
    'inicio': ['direita'],
}
OPOSTO = {'cima': 'baixo', 'baixo': 'cima', 'esquerda': 'direita', 'direita': 'esquerda'}
PASSO = {'cima': (-1, 0), 'baixo': (1, 0), 'esquerda': (0, -1), 'direita': (0, 1)}
PECAS = ['horizontal', 'vertical', 'cruz', 'cima_direita', 'cima_esquerda', 'baixo_direita', 'baixo_esquerda']

grade = []
cheios = []
fila = []
agua_linha = 3
agua_coluna = 0
entrou_por = 'esquerda'
saindo_por = 'direita'
quanto = 0
contagem = 10
canos = 0
fim = ''


def novo_jogo():
    global agua_linha, agua_coluna, entrou_por, saindo_por, quanto, contagem, canos, fim
    grade.clear()
    cheios.clear()
    for linha in range(LINHAS):
        grade.append([''] * COLUNAS)
        cheios.append([False] * COLUNAS)
    grade[3][0] = 'inicio'
    fila.clear()
    for numero in range(5):
        fila.append(random.choice(PECAS))
    agua_linha = 3
    agua_coluna = 0
    entrou_por = 'esquerda'
    saindo_por = 'direita'
    quanto = 0
    contagem = 10
    canos = 0
    fim = ''


def contar():
    global contagem
    if contagem > 0 and fim == '':
        contagem = contagem - 1


def saida_de(peca, entrada):
    # A cruz deixa a água seguir reto; as outras peças têm só uma saída além da entrada.
    if peca == 'cruz':
        return OPOSTO[entrada]
    for lado in ABERTURAS[peca]:
        if lado != entrada:
            return lado
    return ''


def andar_a_agua():
    global agua_linha, agua_coluna, entrou_por, saindo_por, quanto, canos, fim
    cheios[agua_linha][agua_coluna] = True
    mais_linha, mais_coluna = PASSO[saindo_por]
    linha = agua_linha + mais_linha
    coluna = agua_coluna + mais_coluna
    entrada = OPOSTO[saindo_por]
    if not (0 <= linha < LINHAS and 0 <= coluna < COLUNAS) or entrada not in ABERTURAS.get(grade[linha][coluna], []):
        fim = 'vazou'
        sounds.vazou.play()
        return
    agua_linha = linha
    agua_coluna = coluna
    entrou_por = entrada
    saindo_por = saida_de(grade[linha][coluna], entrada)
    quanto = 0
    canos = canos + 1
    if canos == META:
        fim = 'venceu'
        sounds.venceu.play()


def ponto_do_lado(linha, coluna, lado):
    x = X0 + coluna * TAMANHO + TAMANHO / 2
    y = Y0 + linha * TAMANHO + TAMANHO / 2
    mais_linha, mais_coluna = PASSO[lado]
    return (x + mais_coluna * TAMANHO / 2, y + mais_linha * TAMANHO / 2)


def frente_da_agua():
    # A ponta da água anda do lado de entrada até o centro e, depois, do centro até a saída.
    centro_x = X0 + agua_coluna * TAMANHO + TAMANHO / 2
    centro_y = Y0 + agua_linha * TAMANHO + TAMANHO / 2
    if quanto < 0.5:
        x, y = ponto_do_lado(agua_linha, agua_coluna, entrou_por)
        parte = quanto * 2
        return (x + (centro_x - x) * parte, y + (centro_y - y) * parte)
    x, y = ponto_do_lado(agua_linha, agua_coluna, saindo_por)
    parte = quanto * 2 - 1
    return (centro_x + (x - centro_x) * parte, centro_y + (y - centro_y) * parte)


def draw():
    screen.blit('fundo', (0, 0))
    for linha in range(LINHAS):
        for coluna in range(COLUNAS):
            x = X0 + coluna * TAMANHO
            y = Y0 + linha * TAMANHO
            screen.blit('vazio', (x, y))
            if grade[linha][coluna] != '':
                screen.blit('cano_' + grade[linha][coluna], (x, y))
            if cheios[linha][coluna]:
                screen.blit('agua_' + grade[linha][coluna], (x, y))
    if contagem == 0 and fim == '':
        screen.draw.filled_circle(frente_da_agua(), 9, (70, 170, 255))
    screen.draw.text('Próximas', midtop=(60, 100), fontsize=26, color='white')
    for numero in range(len(fila)):
        screen.blit('cano_' + fila[numero], (28, 130 + numero * 72))
    screen.draw.rect(Rect((26, 128), (68, 68)), 'yellow')
    screen.draw.text('Canos: ' + str(canos) + '/' + str(META), topleft=(X0, 30), fontsize=34, color='white')
    if contagem > 0:
        screen.draw.text('A água sai em ' + str(contagem), topright=(WIDTH - 40, 30), fontsize=34, color='yellow')
    if fim == 'venceu':
        screen.draw.text('A água chegou longe! Você venceu!', center=(WIDTH / 2, 570), fontsize=40, color='yellow', owidth=2, ocolor='black')
    if fim == 'vazou':
        screen.draw.text('Vazou! Clique para tentar de novo', center=(WIDTH / 2, 570), fontsize=40, color='orange', owidth=2, ocolor='black')


def update():
    global quanto
    if contagem > 0 or fim != '':
        return
    quanto = quanto + 0.008
    if quanto >= 1:
        andar_a_agua()


def on_mouse_down(pos):
    if fim != '':
        novo_jogo()
        return
    coluna = int((pos[0] - X0) // TAMANHO)
    linha = int((pos[1] - Y0) // TAMANHO)
    if not (0 <= linha < LINHAS and 0 <= coluna < COLUNAS):
        return
    # Não dá para trocar o começo nem um cano por onde a água já passou ou está passando.
    if grade[linha][coluna] == 'inicio' or cheios[linha][coluna] or (linha == agua_linha and coluna == agua_coluna):
        sounds.nao.play()
        return
    grade[linha][coluna] = fila.pop(0)
    fila.append(random.choice(PECAS))
    sounds.encaixe.play()


novo_jogo()
clock.schedule_interval(contar, 1)
pgzrun.go()
