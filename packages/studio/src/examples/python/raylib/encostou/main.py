from pyray import *

TAMANHO = 50
VELOCIDADE = 220
# 1 = parede, M = moeda, S = começo, E = saída
MAPA = [
    '1111111111111111',
    '1S....M1......M1',
    '1.111..1..111.11',
    '1M..1.....1....1',
    '1.1.1111..1.11.1',
    '1.1....1....1M.1',
    '1.1111.1.11.1.E1',
    '1M.....1M...1..1',
    '1111111111111111',
]

init_window(len(MAPA[0]) * TAMANHO, len(MAPA) * TAMANHO, 'Encostou!')
set_target_fps(60)


def criar_moedas():
    moedas = []
    for linha, texto in enumerate(MAPA):
        for coluna, letra in enumerate(texto):
            if letra == 'M':
                moedas.append(Vector2(coluna * TAMANHO + 25, linha * TAMANHO + 25))
    return moedas


paredes = []
for linha, texto in enumerate(MAPA):
    for coluna, letra in enumerate(texto):
        if letra == '1':
            paredes.append(Rectangle(coluna * TAMANHO, linha * TAMANHO, TAMANHO, TAMANHO))
        if letra == 'S':
            inicio = Vector2(coluna * TAMANHO + 10, linha * TAMANHO + 10)
        if letra == 'E':
            saida = Rectangle(coluna * TAMANHO, linha * TAMANHO, TAMANHO, TAMANHO)

jogador = Rectangle(inicio.x, inicio.y, 30, 30)
direcao = Vector2(0, 0)
moedas = criar_moedas()
venceu = False


def colisao(eixo):
    # Andou e encostou numa parede? Volta até a borda dela, só no eixo em que andou.
    for parede in paredes:
        if check_collision_recs(parede, jogador):
            if eixo == 'x':
                if direcao.x > 0:
                    jogador.x = parede.x - jogador.width
                if direcao.x < 0:
                    jogador.x = parede.x + parede.width
            else:
                if direcao.y > 0:
                    jogador.y = parede.y - jogador.height
                if direcao.y < 0:
                    jogador.y = parede.y + parede.height


while not window_should_close():
    dt = get_frame_time()
    if venceu:
        if is_key_pressed(KEY_ENTER):
            jogador.x = inicio.x
            jogador.y = inicio.y
            moedas = criar_moedas()
            venceu = False
    else:
        direcao.x = int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))
        direcao.y = int(is_key_down(KEY_DOWN)) - int(is_key_down(KEY_UP))
        # Um eixo de cada vez: assim a parede sabe de que lado você chegou.
        jogador.x += direcao.x * VELOCIDADE * dt
        colisao('x')
        jogador.y += direcao.y * VELOCIDADE * dt
        colisao('y')

        for moeda in moedas[:]:
            if check_collision_circle_rec(moeda, 10, jogador):
                moedas.remove(moeda)
        if len(moedas) == 0 and check_collision_recs(jogador, saida):
            venceu = True

    begin_drawing()
    clear_background((24, 20, 37, 255))
    for parede in paredes:
        draw_rectangle_rec(parede, (92, 84, 112, 255))
        draw_rectangle_lines_ex(parede, 2, (60, 54, 76, 255))
    if len(moedas) == 0:
        draw_rectangle_rec(saida, GREEN)
    else:
        draw_rectangle_rec(saida, DARKGRAY)
        # Encostou na saída fechada: a parte que se sobrepõe fica vermelha.
        if check_collision_recs(jogador, saida):
            draw_rectangle_rec(get_collision_rec(jogador, saida), RED)
    for moeda in moedas:
        draw_circle_v(moeda, 10, GOLD)
        draw_circle_v(moeda, 5, YELLOW)
    draw_rectangle_rec(jogador, SKYBLUE)
    draw_text(f'Moedas: {len(moedas)}', 10, 10, 20, WHITE)
    if venceu:
        draw_rectangle(150, 160, 500, 120, (0, 0, 0, 200))
        draw_text('Você saiu do labirinto!', 190, 190, 30, YELLOW)
        draw_text('Enter: jogar de novo', 270, 240, 20, WHITE)
    end_drawing()

close_window()
