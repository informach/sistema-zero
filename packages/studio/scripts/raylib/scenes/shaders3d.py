# Cena-gabarito de shaders: roda igual no raylib do computador e no Estúdio (extensão Raylib 3D).
# O clarão do curso (fragment com uniform vec2 pelo ffi), o cinza no lote 2D com
# begin_shader_mode, um vertex shader próprio com matriz, textura extra, vetor e valor inicial.
from pyray import *

CLARAO = """#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
uniform sampler2D texture0;
uniform vec2 flash;
out vec4 finalColor;
void main() {
    vec4 texelColor = texture(texture0, fragTexCoord);
    finalColor = mix(texelColor, vec4(1.0, 1.0, 1.0, texelColor.a), flash.x);
}
"""
CINZA = """#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
uniform sampler2D texture0;
uniform vec4 colDiffuse;
out vec4 finalColor;
void main() {
    vec4 texelColor = texture(texture0, fragTexCoord)*colDiffuse*fragColor;
    float gray = dot(texelColor.rgb, vec3(0.299, 0.587, 0.114));
    finalColor = vec4(gray, gray, gray, texelColor.a);
}
"""
ONDA_VS = """#version 330
in vec3 vertexPosition;
in vec2 vertexTexCoord;
in vec4 vertexColor;
uniform mat4 mvp;
uniform mat4 torcer;
uniform float altura = 0.5;
out vec2 fragTexCoord;
out vec4 fragColor;
void main() {
    fragTexCoord = vertexTexCoord;
    fragColor = vertexColor;
    vec4 p = torcer*vec4(vertexPosition, 1.0);
    p.y += altura*sin(p.x*3.0);
    gl_Position = mvp*p;
}
"""
ONDA_FS = """#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
uniform sampler2D texture0;
uniform sampler2D listras;
uniform vec4 colDiffuse;
uniform vec3 cores[2];
out vec4 finalColor;
void main() {
    vec4 a = texture(texture0, fragTexCoord)*colDiffuse;
    vec4 b = texture(listras, fragTexCoord*4.0);
    finalColor = vec4(mix(a.rgb*cores[0], cores[1], b.r*0.5), 1.0);
}
"""

init_window(400, 300, 'gabarito shaders')
camera = Camera3D(Vector3(6, 5, 8), Vector3(0, 0.5, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)
xadrez = load_texture_from_image(gen_image_checked(32, 32, 8, 8, ORANGE, DARKBLUE))
listras = load_texture_from_image(gen_image_checked(16, 16, 8, 16, WHITE, BLACK))

cubo = load_model_from_mesh(gen_mesh_cube(1.5, 1.5, 1.5))
set_material_texture(cubo.materials[0], MATERIAL_MAP_ALBEDO, xadrez)
clarao = load_shader_from_memory(ffi.NULL, CLARAO)
cubo.materials[0].shader = clarao
onde = get_shader_location(clarao, 'flash')
quanto = ffi.new('struct Vector2 *', [0.6, 0])
set_shader_value(clarao, onde, quanto, SHADER_UNIFORM_VEC2)

cinza = load_shader_from_memory(ffi.NULL, CINZA)

chao = load_model_from_mesh(gen_mesh_plane(6, 3, 12, 6))
set_material_texture(chao.materials[0], MATERIAL_MAP_ALBEDO, xadrez)
onda = load_shader_from_memory(ONDA_VS, ONDA_FS)
chao.materials[0].shader = onda
set_shader_value_matrix(onda, get_shader_location(onda, 'torcer'), matrix_rotate_y(0.4))
set_shader_value_texture(onda, get_shader_location(onda, 'listras'), listras)
cores = ffi.new('struct Vector3[2]', [(1.0, 0.9, 0.6), (0.2, 0.8, 1.0)])
set_shader_value_v(onda, get_shader_location(onda, 'cores'), cores, SHADER_UNIFORM_VEC3, 2)

quadros = 0
while not window_should_close():
    quadros += 1
    begin_drawing()
    clear_background(RAYWHITE)
    begin_mode_3d(camera)
    draw_model(chao, Vector3(0, 0, 0), 1, WHITE)
    draw_model(cubo, Vector3(-1.5, 1, -1), 1, WHITE)
    draw_model(cubo, Vector3(1.8, 1, -1.5), 0.7, (255, 120, 120, 255))
    end_mode_3d()
    begin_shader_mode(cinza)
    draw_texture_ex(xadrez, Vector2(250, 10), 0, 2, WHITE)
    draw_rectangle(250, 90, 60, 30, RED)
    end_shader_mode()
    draw_rectangle(320, 90, 60, 30, RED)
    draw_text('shaders', 10, 10, 20, BLACK)
    end_drawing()
    if quadros == 3:
        take_screenshot('shaders3d.png')
        break
close_window()
