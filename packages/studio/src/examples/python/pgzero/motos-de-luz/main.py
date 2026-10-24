import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Motos de Luz'
LADO = 10
COLUNAS = 80
LINHAS = 55
TOPO = 50
# A cada quantos quadros as motos andam uma casa (menos é mais rápido).
RITMO = 3
VITORIAS_PARA_GANHAR = 3
# Para cima, esquerda, baixo, direita: o ângulo do Actor é a posição na lista vezes 90.
DIRECOES = [(0, -1), (-1, 0), (0, 1), (1, 0)]

jogador = Actor('moto_azul')
computador = Actor('moto_amarela')
grade = []
rastros = []
quadros = 0
pontos_jogador = 0
pontos_computador = 0
# 'correndo', 'fim_da_rodada' ou 'fim'
estado = 'correndo'
resultado = ''


def nova_rodada():
    global quadros, estado
    grade.clear()
    for coluna in range(COLUNAS):
        grade.append([0] * LINHAS)
    rastros.clear()
    # Uma sobe pela esquerda e a outra desce pela direita.
    colocar(jogador, 20, 45, 0)
    colocar(computador, 60, 10, 2)
    quadros = 0
    estado = 'correndo'


def novo_jogo():
    global pontos_jogador, pontos_computador
    pontos_jogador = 0
    pontos_computador = 0
    nova_rodada()


def colocar(moto, coluna, linha, direcao):
    moto.coluna = coluna
    moto.linha = linha
    moto.direcao = direcao
    moto.bateu = False
    posicionar(moto)


def posicionar(moto):
    moto.pos = (moto.coluna * LADO + LADO / 2, TOPO + moto.linha * LADO + LADO / 2)
    moto.angle = moto.direcao * 90


def livre(coluna, linha):
    return 0 <= coluna < COLUNAS and 0 <= linha < LINHAS and grade[coluna][linha] == 0


def espaco_livre(coluna, linha, limite):
    # Conta quantas casas livres dá para alcançar dali, até o limite (para o computador pensar).
    if not livre(coluna, linha):
        return 0
    vistas = [(coluna, linha)]
    fila = [(coluna, linha)]
    while fila and len(vistas) < limite:
        c, l = fila.pop(0)
        for dc, dl in DIRECOES:
            vizinha = (c + dc, l + dl)
            if vizinha not in vistas and livre(vizinha[0], vizinha[1]):
                vistas.append(vizinha)
                fila.append(vizinha)
    return len(vistas)


def pensar():
    # O computador experimenta seguir reto, virar para um lado ou para o outro,
    # e fica com o caminho que deixa mais espaço livre à frente.
    melhor = computador.direcao
    maior = -1
    # A casa para onde o jogador vai agora também é perigosa.
    jc, jl = DIRECOES[jogador.direcao]
    perigo = (jogador.coluna + jc, jogador.linha + jl)
    for virada in [0, 1, 3]:
        direcao = (computador.direcao + virada) % 4
        dc, dl = DIRECOES[direcao]
        if (computador.coluna + dc, computador.linha + dl) == perigo:
            continue
        espaco = espaco_livre(computador.coluna + dc, computador.linha + dl, 60)
        if virada == 0:
            # Seguir reto ganha um pouquinho de preferência.
            espaco = espaco + 2
        # E um pouquinho de sorte, para cada corrida ser diferente.
        espaco = espaco + random.randint(0, 2)
        if espaco > maior:
            maior = espaco
            melhor = direcao
    computador.direcao = melhor


def andar(moto, cor):
    grade[moto.coluna][moto.linha] = cor
    rastros.append((moto.coluna, moto.linha, cor))
    dc, dl = DIRECOES[moto.direcao]
    moto.coluna = moto.coluna + dc
    moto.linha = moto.linha + dl
    if not livre(moto.coluna, moto.linha):
        moto.bateu = True
    posicionar(moto)


def fim_da_rodada():
    global pontos_jogador, pontos_computador, estado, resultado
    if jogador.bateu and computador.bateu:
        resultado = 'Empate!'
    elif computador.bateu:
        pontos_jogador = pontos_jogador + 1
        resultado = 'Você ganhou a rodada!'
    else:
        pontos_computador = pontos_computador + 1
        resultado = 'O computador ganhou a rodada'
    sounds.batida.play()
    if pontos_jogador == VITORIAS_PARA_GANHAR or pontos_computador == VITORIAS_PARA_GANHAR:
        estado = 'fim'
    else:
        estado = 'fim_da_rodada'


def update():
    global quadros
    if estado != 'correndo':
        return
    quadros = quadros + 1
    if quadros % RITMO != 0:
        return
    pensar()
    andar(jogador, 1)
    andar(computador, 2)
    # As duas cabeças na mesma casa: as duas batem.
    if jogador.coluna == computador.coluna and jogador.linha == computador.linha:
        jogador.bateu = True
        computador.bateu = True
    if jogador.bateu or computador.bateu:
        fim_da_rodada()


def draw():
    screen.blit('arena', (0, 0))
    for coluna, linha, cor in rastros:
        if cor == 1:
            tinta = (64, 196, 255)
        else:
            tinta = (255, 214, 0)
        screen.draw.filled_rect(Rect((coluna * LADO + 1, TOPO + linha * LADO + 1), (LADO - 2, LADO - 2)), tinta)
    jogador.draw()
    computador.draw()
    placar = 'Você ' + str(pontos_jogador) + ' x ' + str(pontos_computador) + ' Computador'
    screen.draw.text(placar, center=(WIDTH / 2, 25), fontsize=36, color='white')
    if estado != 'correndo':
        texto = resultado
        if estado == 'fim':
            if pontos_jogador == VITORIAS_PARA_GANHAR:
                texto = 'Você venceu a corrida!'
            else:
                texto = 'O computador venceu a corrida'
        screen.draw.text(texto, center=(WIDTH / 2, 300), fontsize=52, color='white', owidth=1, ocolor='black')
        screen.draw.text('Espaço continua', center=(WIDTH / 2, 350), fontsize=34, color='yellow', owidth=1, ocolor='black')


def on_key_down(key):
    if key == keys.SPACE:
        if estado == 'fim_da_rodada':
            nova_rodada()
        elif estado == 'fim':
            novo_jogo()
        return
    # A moto não dá meia-volta: só vira para os lados.
    pedido = -1
    if key == keys.UP:
        pedido = 0
    elif key == keys.LEFT:
        pedido = 1
    elif key == keys.DOWN:
        pedido = 2
    elif key == keys.RIGHT:
        pedido = 3
    if pedido != -1 and pedido != (jogador.direcao + 2) % 4:
        jogador.direcao = pedido
        jogador.angle = pedido * 90


novo_jogo()
pgzrun.go()
