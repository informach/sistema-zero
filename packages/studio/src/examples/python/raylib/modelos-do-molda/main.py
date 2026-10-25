from pyray import *

LARGURA = 800
ALTURA = 450
VELOCIDADE_DO_GIRO = 40
TAMANHO = 3

init_window(LARGURA, ALTURA, 'Modelos do Molda')
set_target_fps(60)
camera = Camera3D(Vector3(0, 4, 8), Vector3(0, 1.2, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)

# Os modelos vieram do Molda pela janela "Materiais do jogo". Ponha um seu na lista!
arquivos = ['models/nave.glb', 'models/carro.glb', 'models/arvore.glb', 'models/casa.glb']
modelos = [load_model(arquivo) for arquivo in arquivos]
atual = 0
giro = 0

while not window_should_close():
    dt = get_frame_time()
    if is_key_pressed(KEY_RIGHT):
        atual = (atual + 1) % len(modelos)
    if is_key_pressed(KEY_LEFT):
        atual = (atual - 1) % len(modelos)
    giro += VELOCIDADE_DO_GIRO * dt

    modelo = modelos[atual]
    # A caixa do modelo diz o tamanho dele: todos aparecem do mesmo tamanho, em cima da mesa.
    caixa = get_model_bounding_box(modelo)
    maior = max(caixa.max.x - caixa.min.x, caixa.max.y - caixa.min.y, caixa.max.z - caixa.min.z)
    escala = TAMANHO / maior

    begin_drawing()
    clear_background(SKYBLUE)
    begin_mode_3d(camera)
    draw_grid(16, 1)
    draw_cylinder(Vector3(0, -0.2, 0), 2.2, 2.4, 0.2, 32, LIGHTGRAY)
    draw_model_ex(modelo, Vector3(0, -caixa.min.y * escala, 0), Vector3(0, 1, 0), giro,
                  Vector3(escala, escala, escala), WHITE)
    end_mode_3d()
    draw_text(arquivos[atual], 10, 10, 20, DARKBLUE)
    draw_text('Setas: trocar de modelo', 10, 40, 20, DARKGRAY)
    end_drawing()

close_window()
