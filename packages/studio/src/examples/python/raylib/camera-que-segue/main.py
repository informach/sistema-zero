from pyray import *
from random import randint, choice

LARGURA = 800
ALTURA = 450
MUNDO = 1200
VELOCIDADE = 320
RAIO = 22

init_window(LARGURA, ALTURA, 'Câmera que Segue')
set_target_fps(60)

posicao = Vector2(0, 0)
direcao = Vector2(0, 0)

# O mundo é maior que a tela: planetas e gemas espalhados de -MUNDO a MUNDO.
planetas = []
for i in range(70):
    centro = Vector2(randint(-MUNDO, MUNDO), randint(-MUNDO, MUNDO))
    cor = choice([RED, GREEN, BLUE, ORANGE, PURPLE, PINK])
    planetas.append([centro, randint(30, 110), cor])


def espalhar_gemas():
    gemas = []
    for i in range(12):
        gemas.append(Vector2(randint(-MUNDO + 50, MUNDO - 50), randint(-MUNDO + 50, MUNDO - 50)))
    return gemas


gemas = espalhar_gemas()

# A câmera: offset é o ponto da TELA onde fica o alvo (o meio), target é o ponto do MUNDO.
camera = Camera2D()
camera.offset = Vector2(LARGURA / 2, ALTURA / 2)
camera.target = posicao
camera.rotation = 0
camera.zoom = 1

while not window_should_close():
    dt = get_frame_time()

    direcao.x = int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))
    direcao.y = int(is_key_down(KEY_DOWN)) - int(is_key_down(KEY_UP))
    direcao = vector2_normalize(direcao)
    posicao.x += direcao.x * VELOCIDADE * dt
    posicao.y += direcao.y * VELOCIDADE * dt
    posicao.x = max(-MUNDO, min(posicao.x, MUNDO))
    posicao.y = max(-MUNDO, min(posicao.y, MUNDO))

    # Q e W: zoom. A e S: girar. R: câmera reta de novo.
    camera.zoom += (int(is_key_down(KEY_W)) - int(is_key_down(KEY_Q))) * dt
    camera.zoom = max(0.3, min(camera.zoom, 2))
    camera.rotation += (int(is_key_down(KEY_S)) - int(is_key_down(KEY_A))) * 60 * dt
    if is_key_pressed(KEY_R):
        camera.zoom = 1
        camera.rotation = 0
    # Dar o alvo de novo a cada quadro: a câmera guarda uma CÓPIA da posição.
    camera.target = posicao

    for gema in gemas[:]:
        if check_collision_circles(posicao, RAIO, gema, 14):
            gemas.remove(gema)
    if len(gemas) == 0 and is_key_pressed(KEY_ENTER):
        gemas = espalhar_gemas()

    begin_drawing()
    clear_background((236, 240, 255, 255))
    begin_mode_2d(camera)
    draw_rectangle_lines_ex(Rectangle(-MUNDO, -MUNDO, MUNDO * 2, MUNDO * 2), 8, DARKGRAY)
    for planeta in planetas:
        draw_circle_v(planeta[0], planeta[1], planeta[2])
    for gema in gemas:
        draw_poly(gema, 4, 14, 45, SKYBLUE)
        draw_poly_lines(gema, 4, 14, 45, DARKBLUE)
    draw_circle_v(posicao, RAIO, BLACK)
    end_mode_2d()

    # O que vem depois do end_mode_2d fica parado na tela, fora da câmera.
    draw_rectangle(0, 0, LARGURA, 36, (0, 0, 0, 160))
    draw_text(f'Gemas: {len(gemas)}', 12, 8, 20, WHITE)
    draw_text('Q/W zoom  A/S girar  R reto', 360, 10, 18, LIGHTGRAY)
    if len(gemas) == 0:
        draw_text('Achou todas as gemas!', 200, 200, 36, DARKGREEN)
        draw_text('Enter: espalhar de novo', 270, 250, 20, DARKGRAY)
    end_drawing()

close_window()
