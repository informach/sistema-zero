from pyray import *

LARGURA = 800
ALTURA = 450
VELOCIDADE_NAVE = 300
VELOCIDADE_PEDRA = 220
# Cada ponto do desenho vira ESCALA pontos na tela: um desenho do Pinta fica grande e nítido.
ESCALA = 3

init_window(LARGURA, ALTURA, 'Nave que Desliza')
set_target_fps(60)

nave = load_texture('images/nave.png')
pedra = load_texture('images/pedra.png')
estrela = load_texture('images/estrela.png')
# O tamanho de cada coisa na tela é o tamanho do desenho vezes a ESCALA.
largura_nave = nave.width * ESCALA
altura_nave = nave.height * ESCALA
tamanho_pedra = pedra.width * ESCALA
tamanho_estrela = estrela.width * ESCALA

posicao = Vector2(380, 340)
direcao = Vector2(0, 0)
pedra_posicao = Vector2(80, 60)
pedra_direcao = Vector2(1, 1)
estrela_posicao = Vector2(get_random_value(40, 740), get_random_value(40, 400))
pontos = 0
batidas = 0

while not window_should_close():
    # O tempo do quadro: multiplicar por ele deixa a velocidade igual em qualquer computador.
    dt = get_frame_time()

    # A pedra anda sozinha e quica nas bordas: a direção troca de sinal.
    if pedra_posicao.x <= 0:
        pedra_direcao.x = 1
    if pedra_posicao.x >= LARGURA - tamanho_pedra:
        pedra_direcao.x = -1
    if pedra_posicao.y <= 0:
        pedra_direcao.y = 1
    if pedra_posicao.y >= ALTURA - tamanho_pedra:
        pedra_direcao.y = -1
    pedra_posicao.x += pedra_direcao.x * VELOCIDADE_PEDRA * dt
    pedra_posicao.y += pedra_direcao.y * VELOCIDADE_PEDRA * dt

    # A nave anda com as setas. Normalizar deixa a diagonal tão rápida quanto o resto.
    direcao.x = int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))
    direcao.y = int(is_key_down(KEY_DOWN)) - int(is_key_down(KEY_UP))
    direcao = vector2_normalize(direcao)
    posicao.x += direcao.x * VELOCIDADE_NAVE * dt
    posicao.y += direcao.y * VELOCIDADE_NAVE * dt
    posicao.x = max(0, min(posicao.x, LARGURA - largura_nave))
    posicao.y = max(0, min(posicao.y, ALTURA - altura_nave))

    caixa_da_nave = Rectangle(posicao.x, posicao.y, largura_nave, altura_nave)
    caixa_da_estrela = Rectangle(estrela_posicao.x, estrela_posicao.y, tamanho_estrela, tamanho_estrela)
    if check_collision_recs(caixa_da_nave, caixa_da_estrela):
        pontos += 1
        estrela_posicao = Vector2(get_random_value(40, 740), get_random_value(40, 400))

    centro_da_pedra = Vector2(pedra_posicao.x + tamanho_pedra / 2, pedra_posicao.y + tamanho_pedra / 2)
    if check_collision_circle_rec(centro_da_pedra, tamanho_pedra / 2 - 6, caixa_da_nave):
        batidas += 1
        posicao = Vector2(380, 340)
        pedra_posicao = Vector2(80, 60)

    begin_drawing()
    clear_background((12, 14, 32, 255))
    draw_texture_ex(estrela, estrela_posicao, 0, ESCALA, WHITE)
    draw_texture_ex(pedra, pedra_posicao, 0, ESCALA, WHITE)
    draw_texture_ex(nave, posicao, 0, ESCALA, WHITE)
    draw_text(f'Estrelas: {pontos}', 16, 14, 24, YELLOW)
    draw_text(f'Batidas: {batidas}', 16, 44, 20, LIGHTGRAY)
    draw_text('Setas: pilotar', LARGURA - 170, ALTURA - 30, 20, GRAY)
    end_drawing()

close_window()
