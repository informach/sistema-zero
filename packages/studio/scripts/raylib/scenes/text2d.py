# Cena-gabarito 2D: a fonte padrão em vários tamanhos e uma fonte TTF (Press Start 2P, OFL).
from pyray import *
from os.path import join

init_window(400, 300, 'gabarito')
fonte = load_font_ex(join('fonts', 'pressstart2p.ttf'), 16, ffi.NULL, 0)
fonte_padrao_32 = load_font(join('fonts', 'pressstart2p.ttf'))
quadros = 0
while not window_should_close():
    quadros += 1
    begin_drawing()
    clear_background(RAYWHITE)
    draw_text('Placar 120', 10, 10, 10, BLACK)
    draw_text('Placar 120', 10, 24, 20, DARKBLUE)
    draw_text('Duas\nlinhas', 150, 10, 30, MAROON)
    draw_text_ex(get_font_default(), 'espaco 3', Vector2(10, 80), 20, 3, DARKGREEN)
    draw_text_pro(get_font_default(), 'girado', Vector2(300, 70), Vector2(0, 0), 30, 20, 2, RED)
    draw_text_ex(fonte, 'PRESS 16', Vector2(10, 120), 16, 0, BLACK)
    tamanho = measure_text_ex(fonte, 'PRESS 16', 16, 0)
    draw_rectangle_lines(10, 120, int(tamanho.x), int(tamanho.y), RED)
    draw_text_ex(fonte, 'Escala 32', Vector2(10, 150), 32, 0, MAROON)
    draw_text_ex(fonte, 'acao: ação', Vector2(10, 200), 16, 2, DARKPURPLE)
    draw_text_ex(fonte_padrao_32, 'load 32', Vector2(10, 240), 32, 0, DARKBLUE)
    draw_text_codepoint(fonte, ord('A'), Vector2(370, 10), 16, RED)
    draw_text_ex(fonte, 'meio', Vector2(300, 200), 24, 0, BLACK)
    end_drawing()
    if quadros == 3:
        take_screenshot('text2d.png')
        break
close_window()
