from pyray import *

LARGURA = 800
ALTURA = 450
VELOCIDADE = 5
# Metade do lado do cubo do jogador e das caixas (todos têm lado 1).
METADE = 0.5
# Um tiquinho a mais que encostar: parado na face, a caixa não conta como encostada no outro eixo.
FOLGA = 1.001
BORDA = 5

init_window(LARGURA, ALTURA, 'Caixas que se Encostam')
set_target_fps(60)
camera = Camera3D(Vector3(0, 10, 8), Vector3(0, 0, 0.5), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)

# A textura da caixa veio do Molda; o cubo do jogador e as caixas são malhas prontas.
textura_caixa = load_texture('images/caixa.png')
jogador = load_model_from_mesh(gen_mesh_cube(1, 1, 1))
caixa = load_model_from_mesh(gen_mesh_cube(1, 1, 1))
set_material_texture(caixa.materials[0], MATERIAL_MAP_ALBEDO, textura_caixa)

LUGARES = [(-3, -2), (-2, -2), (1, 0), (2, 0), (3, 0), (-2, 2), (-2, 3), (1, 2), (2, 2)]
caixas = [Vector3(x, METADE, z) for x, z in LUGARES]
MOEDAS = [Vector3(4, METADE, -3), Vector3(-4, METADE, -4), Vector3(3, METADE, 3), Vector3(-1, METADE, 0)]
pos = Vector3(-4, METADE, 0)
moeda = 0
pegou = 0


def caixa_de(centro):
    return BoundingBox(Vector3(centro.x - METADE, centro.y - METADE, centro.z - METADE),
                       Vector3(centro.x + METADE, centro.y + METADE, centro.z + METADE))


def resolver(eixo, passo):
    # Andou e encostou numa caixa? Volta para a face dela, só no eixo em que andou.
    for centro in caixas:
        if check_collision_boxes(caixa_de(pos), caixa_de(centro)):
            if eixo == 'x':
                pos.x = centro.x - FOLGA if passo > 0 else centro.x + FOLGA
            else:
                pos.z = centro.z - FOLGA if passo > 0 else centro.z + FOLGA


while not window_should_close():
    dt = get_frame_time()
    passo_x = (int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))) * VELOCIDADE * dt
    passo_z = (int(is_key_down(KEY_DOWN)) - int(is_key_down(KEY_UP))) * VELOCIDADE * dt
    # Um eixo de cada vez: assim dá para deslizar encostado numa parede.
    pos.x = clamp(pos.x + passo_x, -BORDA, BORDA)
    resolver('x', passo_x)
    pos.z = clamp(pos.z + passo_z, -BORDA, BORDA)
    resolver('z', passo_z)

    if check_collision_box_sphere(caixa_de(pos), MOEDAS[moeda], 0.3):
        pegou += 1
        moeda = (moeda + 1) % len(MOEDAS)

    begin_drawing()
    clear_background(RAYWHITE)
    begin_mode_3d(camera)
    draw_plane(Vector3(0, 0, 0), Vector2(11, 11), LIGHTGRAY)
    draw_grid(11, 1)
    for centro in caixas:
        draw_model(caixa, centro, 1, WHITE)
    draw_model(jogador, pos, 1, RED)
    draw_bounding_box(caixa_de(pos), MAROON)
    draw_sphere(MOEDAS[moeda], 0.3, GOLD)
    end_mode_3d()
    draw_text(f'Moedas: {pegou}', 10, 10, 30, DARKGRAY)
    draw_text('Setas: andar', 10, 45, 20, GRAY)
    end_drawing()

close_window()
