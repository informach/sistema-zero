from pyray import *

LARGURA = 800
ALTURA = 450
# Cada ponto do desenho vira ESCALA pontos na tela: um desenho do Pinta fica grande e nítido.
ESCALA = 4

init_window(LARGURA, ALTURA, 'Olá, Raylib')
set_target_fps(60)

# Imagens: a mesma nave em três versões.
nave = load_texture('images/nave.png')
imagem = load_image('images/nave.png')
image_color_grayscale(imagem)
nave_cinza = load_texture_from_image(imagem)
unload_image(imagem)
imagem = load_image('images/nave.png')
image_color_invert(imagem)
nave_invertida = load_texture_from_image(imagem)
unload_image(imagem)

# Fonte: 224 letras a partir do espaço, para os acentos aparecerem.
fonte = load_font_ex('fonts/pressstart2p.ttf', 16, None, 224)

cor_do_circulo = YELLOW
while not window_should_close():
    # Clique no círculo grande para trocar a cor dele.
    if is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        if check_collision_point_circle(get_mouse_position(), Vector2(600, 260), 90):
            if cor_do_circulo == YELLOW:
                cor_do_circulo = SKYBLUE
            else:
                cor_do_circulo = YELLOW

    begin_drawing()
    clear_background(BLACK)

    # Formas
    draw_pixel(40, 120, RED)
    draw_pixel_v(Vector2(48, 120), WHITE)
    draw_circle_v(Vector2(600, 260), 90, cor_do_circulo)
    draw_circle(600, 260, 45, GREEN)
    draw_line_ex(Vector2(30, 420), Vector2(330, 330), 8, (120, 40, 40, 255))
    draw_rectangle(470, 380, 300, 40, DARKBLUE)

    # Imagens
    draw_texture_ex(nave, Vector2(40, 150), 0, ESCALA, WHITE)
    draw_texture_ex(nave_cinza, Vector2(120, 150), 0, ESCALA, WHITE)
    draw_texture_ex(nave_invertida, Vector2(200, 150), 0, ESCALA, WHITE)

    # Texto: a fonte do raylib e a fonte TTF
    draw_text('Olá, Raylib!', 40, 30, 40, WHITE)
    draw_text_ex(fonte, 'Clique no círculo', Vector2(480, 392), 16, 0, WHITE)
    draw_text_ex(fonte, 'Três naves', Vector2(40, 230), 16, 0, LIGHTGRAY)

    draw_fps(LARGURA - 110, 10)
    end_drawing()

close_window()
