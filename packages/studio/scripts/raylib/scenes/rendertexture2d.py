# Cena-gabarito 2D: recorte dentro de uma render texture, update_texture que preserva o filtro
# e a render texture, e uma imagem criada e descarregada no mesmo quadro.
from pyray import *

init_window(400, 300, 'gabarito')
alvo = load_render_texture(160, 120)
pintada = load_render_texture(128, 64)
miuda = load_texture_from_image(gen_image_color(4, 4, BLANK))
set_texture_filter(miuda, TEXTURE_FILTER_BILINEAR)
xadrez = gen_image_checked(4, 4, 1, 1, RED, BLUE)
degrade = gen_image_gradient_linear(128, 64, 90, ORANGE, PURPLE)

quadros = 0
while not window_should_close():
    quadros += 1
    # Os pixels novos entram na mesma textura: o filtro bilinear continua valendo.
    update_texture(miuda, xadrez.data)
    # Na render texture, os pixels novos entram e o desenho seguinte vai por cima deles.
    update_texture(pintada.texture, degrade.data)
    begin_texture_mode(pintada)
    draw_circle(40, 32, 20, LIME)
    end_texture_mode()

    begin_texture_mode(alvo)
    clear_background(SKYBLUE)
    draw_rectangle(0, 0, 160, 10, DARKBLUE)
    begin_scissor_mode(10, 20, 70, 40)
    draw_rectangle(0, 0, 160, 120, RED)
    draw_text('so aqui', 12, 24, 10, WHITE)
    end_scissor_mode()
    draw_circle(130, 95, 15, GOLD)
    end_texture_mode()

    # Uma imagem que nasce e é descarregada no mesmo quadro não deixa nada para trás.
    passageira = load_texture_from_image(gen_image_color(8, 8, GREEN))
    unload_texture(passageira)

    begin_drawing()
    clear_background(RAYWHITE)
    draw_texture_rec(alvo.texture, Rectangle(0, 0, 160, -120), Vector2(10, 10), WHITE)
    draw_texture_pro(miuda, Rectangle(0, 0, 4, 4), Rectangle(200, 10, 96, 96), Vector2(0, 0), 0, WHITE)
    draw_texture_rec(pintada.texture, Rectangle(0, 0, 128, -64), Vector2(10, 160), WHITE)
    begin_scissor_mode(200, 160, 80, 50)
    draw_circle(240, 185, 45, MAROON)
    end_scissor_mode()
    end_drawing()
    if quadros == 3:
        take_screenshot('rendertexture2d.png')
        break
close_window()
