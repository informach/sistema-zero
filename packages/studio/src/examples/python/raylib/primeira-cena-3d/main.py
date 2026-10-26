from pyray import *

LARGURA = 800
ALTURA = 450
VELOCIDADE_DO_GIRO = 2
VELOCIDADE_DA_BOLA = 3

init_window(LARGURA, ALTURA, 'Primeira Cena 3D')
set_target_fps(60)

# A câmera: onde ela está, para onde olha, qual lado é para cima e a abertura do olhar.
camera = Camera3D(Vector3(0, 5, 7), Vector3(0, 0.5, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)

# Um cilindro vestido com um degradê do vermelho ao amarelo.
cilindro = load_model_from_mesh(gen_mesh_cylinder(0.8, 2, 20))
degrade = load_texture_from_image(gen_image_gradient_linear(20, 20, 0, RED, YELLOW))
set_material_texture(cilindro.materials[0], MATERIAL_MAP_ALBEDO, degrade)

giro = 0
sentido = 1
bola = Vector3(2.5, 0.5, 0)

while not window_should_close():
    dt = get_frame_time()
    # Espaço troca o sentido do giro; as setas andam com a bola pelo chão.
    if is_key_pressed(KEY_SPACE):
        sentido = -sentido
    giro += VELOCIDADE_DO_GIRO * sentido * dt
    cilindro.transform = matrix_rotate_x(giro)
    bola.x += (int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))) * VELOCIDADE_DA_BOLA * dt
    bola.z += (int(is_key_down(KEY_DOWN)) - int(is_key_down(KEY_UP))) * VELOCIDADE_DA_BOLA * dt

    begin_drawing()
    clear_background(RAYWHITE)
    begin_mode_3d(camera)
    draw_grid(12, 0.5)
    draw_model(cilindro, Vector3(0, 1, 0), 1, WHITE)
    draw_cube(Vector3(-2.5, 0.5, 0), 1, 1, 1, SKYBLUE)
    draw_cube_wires(Vector3(-2.5, 0.5, 0), 1, 1, 1, DARKBLUE)
    draw_sphere(bola, 0.5, ORANGE)
    draw_line_3d(Vector3(-4, 0, -2), Vector3(4, 2, 2), BLACK)
    end_mode_3d()
    draw_text('Barra: trocar o giro   Setas: andar com a bola', 10, 10, 20, DARKGRAY)
    end_drawing()

close_window()
