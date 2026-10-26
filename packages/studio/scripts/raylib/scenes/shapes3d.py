# Cena-gabarito 3D: roda igual no raylib do computador e no Estúdio (extensão Raylib 3D).
from pyray import *

init_window(400, 300, 'gabarito 3d')
camera = Camera3D(Vector3(9, 7, 11), Vector3(0, 0.5, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)
de_cima = Camera3D(Vector3(0, 10, 0.01), Vector3(0, 0, 0), Vector3(0, 1, 0), 8, CAMERA_ORTHOGRAPHIC)
xadrez = load_texture_from_image(gen_image_checked(16, 16, 4, 4, ORANGE, DARKBLUE))
alvo = load_render_texture(120, 90)
faixa = [Vector3(-4, 0, 4), Vector3(-4, 1, 4), Vector3(-3, 0, 4), Vector3(-3, 1.4, 4), Vector3(-2, 0, 4)]
quadros = 0
while not window_should_close():
    quadros += 1
    begin_texture_mode(alvo)
    clear_background(LIGHTGRAY)
    begin_mode_3d(de_cima)
    draw_cube(Vector3(0, 0, 0), 2, 1, 2, RED)
    draw_sphere(Vector3(2.5, 0, 1), 0.8, BLUE)
    draw_grid(8, 1)
    end_mode_3d()
    end_texture_mode()

    begin_drawing()
    clear_background(RAYWHITE)
    begin_mode_3d(camera)
    draw_grid(12, 1)
    draw_plane(Vector3(0, -0.01, 0), Vector2(10, 6), (200, 230, 200, 255))
    draw_cube(Vector3(-3, 0.5, -1), 1, 1, 1, RED)
    draw_cube_wires(Vector3(-3, 0.5, -1), 1.2, 1.2, 1.2, MAROON)
    draw_cube_v(Vector3(-1, 0.75, -2), Vector3(1.5, 1.5, 0.6), GOLD)
    # Arame afastado da superfície: arame colado nela briga pela profundidade (varia por placa).
    draw_sphere(Vector3(1, 1, -1), 0.9, SKYBLUE)
    draw_sphere_wires(Vector3(1, 1, -1), 1.05, 8, 8, DARKBLUE)
    draw_sphere_ex(Vector3(3.5, 0.6, -2), 0.6, 5, 7, LIME)
    draw_cylinder(Vector3(3, 0, 1), 0.6, 0.8, 1.5, 9, PURPLE)
    draw_cylinder_wires(Vector3(3, 0, 1), 0.7, 0.9, 1.6, 9, DARKPURPLE)
    draw_cylinder(Vector3(1.5, 0, 2.5), 0, 0.6, 1.2, 6, ORANGE)
    draw_cylinder_ex(Vector3(-1, 0, 2), Vector3(0, 1.5, 3), 0.4, 0.15, 8, PINK)
    draw_cylinder_wires_ex(Vector3(-1, 0, 2), Vector3(0, 1.5, 3), 0.5, 0.25, 8, MAROON)
    draw_capsule(Vector3(-4.5, 0.5, 1), Vector3(-4.5, 2, 1), 0.4, 6, 3, VIOLET)
    draw_capsule_wires(Vector3(4.5, 0.5, 3), Vector3(5, 1.5, 2), 0.35, 5, 2, DARKGREEN)
    draw_line_3d(Vector3(-5, 3, -3), Vector3(5, 3, -3), RED)
    draw_point_3d(Vector3(0, 3, 0), BLACK)
    draw_circle_3d(Vector3(0, 2.5, 0), 1.2, Vector3(1, 0, 0), 90, DARKGRAY)
    draw_triangle_3d(Vector3(4, 2, -3), Vector3(5, 2, -3), Vector3(4.5, 3, -3), GREEN)
    # Ao contrário: a face de trás não aparece (o rlgl descarta).
    draw_triangle_3d(Vector3(2, 2, -3), Vector3(2.5, 3, -3), Vector3(3, 2, -3), RED)
    draw_triangle_strip_3d(faixa, 5, BROWN)
    draw_bounding_box(BoundingBox(Vector3(-5.5, 0, -3.5), Vector3(-4.5, 1.2, -2.5)), BLUE)
    draw_ray(Ray(Vector3(-5, 0.2, 5), Vector3(1, 0, 0)), ORANGE)
    draw_billboard(camera, xadrez, Vector3(0, 2, 4), 1.2, WHITE)
    draw_billboard_rec(camera, xadrez, Rectangle(0, 0, 8, 8), Vector3(2, 2.2, 4), Vector2(0.8, 0.8), WHITE)
    draw_billboard_pro(camera, xadrez, Rectangle(0, 0, 16, 16), Vector3(-2, 2, 4), Vector3(0, 1, 0),
                       Vector2(1, 1), Vector2(0.5, 0.5), 30, WHITE)
    end_mode_3d()
    draw_texture_rec(alvo.texture, Rectangle(0, 0, 120, -90), Vector2(275, 205), WHITE)
    tela = get_world_to_screen(Vector3(1, 2.2, -1), camera)
    draw_circle_v(tela, 4, RED)
    draw_text('3D', 10, 10, 20, BLACK)
    end_drawing()
    if quadros == 3:
        take_screenshot('shapes3d.png')
        break
close_window()
