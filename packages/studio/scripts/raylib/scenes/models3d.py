# Cena-gabarito de modelos: roda igual no raylib do computador e no Estúdio (extensão Raylib 3D).
# Malhas geradas, textura no material, arame, draw_mesh com matriz, model.transform, o rlgl
# empilhado, um modelo pronto do Molda (a nave) e um personagem com esqueleto animado.
from pyray import *

init_window(400, 300, 'gabarito modelos')
camera = Camera3D(Vector3(8, 7, 10), Vector3(0, 1, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)
xadrez = load_texture_from_image(gen_image_checked(32, 32, 8, 8, ORANGE, DARKBLUE))

cubo = load_model_from_mesh(gen_mesh_cube(1.5, 1, 1))
set_material_texture(cubo.materials[0], MATERIAL_MAP_ALBEDO, xadrez)
# Arame sem textura: na aresta de duas faces, qual cor fica por cima é escolha do driver.
caixa = load_model_from_mesh(gen_mesh_cube(1.5, 1, 1))
bola = load_model_from_mesh(gen_mesh_sphere(0.7, 8, 10))
rosca = load_model_from_mesh(gen_mesh_torus(0.3, 1.4, 8, 14))
rosca.transform = matrix_rotate_x(1.1)
no = load_model_from_mesh(gen_mesh_knot(0.6, 1.5, 10, 40))
cone = gen_mesh_cone(0.6, 1.2, 7)
chao = load_model_from_mesh(gen_mesh_plane(10, 7, 3, 2))
set_material_texture(chao.materials[0], MATERIAL_MAP_ALBEDO, xadrez)
poly = load_model_from_mesh(gen_mesh_poly(6, 0.8))
cilindro = load_model_from_mesh(gen_mesh_cylinder(0.4, 1.3, 9))
meia = load_model_from_mesh(gen_mesh_hemi_sphere(0.6, 6, 8))
material = load_material_default()
material.maps[MATERIAL_MAP_ALBEDO].color = PURPLE

nave = load_model('models/molda-nave.glb')
boneco = load_model('models/molda-pesos.glb')
quantos = ffi.new('int *', 0)
movimentos = load_model_animations('models/molda-pesos.glb', quantos)
update_model_animation(boneco, movimentos[0], 20)

quadros = 0
while not window_should_close():
    quadros += 1
    begin_drawing()
    clear_background(SKYBLUE)
    begin_mode_3d(camera)
    draw_model(chao, Vector3(0, 0, 0), 1, (230, 230, 230, 255))
    draw_model(cubo, Vector3(-3, 0.5, -1.5), 1, WHITE)
    draw_model_wires(caixa, Vector3(-3, 0.5, 0.5), 1.2, DARKBLUE)
    draw_model_ex(bola, Vector3(-1, 1, -2), Vector3(0, 1, 0), 40, Vector3(1, 1.4, 1), RED)
    draw_model(rosca, Vector3(1.5, 1.2, -2.5), 1, GOLD)
    draw_model_wires_ex(no, Vector3(3.5, 1.5, 0), Vector3(1, 0, 0), 30, Vector3(0.8, 0.8, 0.8), MAROON)
    draw_mesh(cone, material, matrix_multiply(matrix_rotate_z(0.4), matrix_translate(-1.5, 0, 1.5)))
    draw_model(poly, Vector3(0.5, 0.05, 2.5), 1, LIME)
    draw_model(cilindro, Vector3(-4, 0, 2.5), 1, ORANGE)
    draw_model(meia, Vector3(4, 0, 2.5), 1, PINK)
    rl_push_matrix()
    rl_translatef(0, 2.6, 0)
    rl_rotatef(25, 0, 1, 0)
    draw_model(cubo, Vector3(0, 0, 0), 0.6, WHITE)
    rl_pop_matrix()
    # As peças da nave se encostam face com face: um pixel bem em cima dessa aresta é decidido pelo
    # último bit do arredondamento (varia até entre placas de vídeo). O ângulo evita esse empate.
    draw_model_ex(nave, Vector3(1, 0.3, 0.5), Vector3(0, 1, 0), 205, Vector3(0.3, 0.3, 0.3), WHITE)
    draw_model_ex(boneco, Vector3(-4.5, 3.6, 1.5), Vector3(0, 1, 0), 20, Vector3(0.8, 0.8, 0.8), WHITE)
    draw_bounding_box(get_model_bounding_box(rosca), BLACK)
    end_mode_3d()
    draw_text('modelos', 10, 10, 20, BLACK)
    end_drawing()
    if quadros == 3:
        take_screenshot('models3d.png')
        break
close_window()
