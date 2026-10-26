from pyray import *

LARGURA = 800
ALTURA = 450
TAMANHO = 3
DURACAO_DO_CLARAO = 0.4
VELOCIDADE_DO_GIRO = 30

# O shader do clarão, escrito em GLSL (a mesma língua dos shaders do raylib no computador):
# mistura a cor do modelo com branco, tanto quanto diz o uniform "clarao".
CLARAO = """#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform vec2 clarao;
out vec4 finalColor;
void main() {
    vec4 cor = texture(texture0, fragTexCoord) * colDiffuse;
    finalColor = mix(cor, vec4(1.0, 1.0, 1.0, cor.a), clarao.x);
}
"""

init_window(LARGURA, ALTURA, 'Clarão com Shader')
set_target_fps(60)
camera = Camera3D(Vector3(0, 3, 7), Vector3(0, 1.4, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)

# O personagem é o modelo pronto do Molda. Cada material dele passa a usar o shader do clarão.
personagem = load_model('models/personagem.glb')
shader = load_shader_from_memory(ffi.NULL, CLARAO)
for indice in range(personagem.materialCount):
    personagem.materials[indice].shader = shader
lugar = get_shader_location(shader, 'clarao')
quanto = ffi.new('struct Vector2 *', [0, 0])

caixa_original = get_model_bounding_box(personagem)
maior = max(caixa_original.max.x - caixa_original.min.x, caixa_original.max.y - caixa_original.min.y,
            caixa_original.max.z - caixa_original.min.z)
escala = TAMANHO / maior
# A caixa do personagem na cena: a do arquivo, na escala e em cima do chão.
caixa = BoundingBox(
    Vector3(caixa_original.min.x * escala, 0, caixa_original.min.z * escala),
    Vector3(caixa_original.max.x * escala, (caixa_original.max.y - caixa_original.min.y) * escala,
            caixa_original.max.z * escala))

tempo = 0
toques = 0
giro = 0

while not window_should_close():
    dt = get_frame_time()
    giro += VELOCIDADE_DO_GIRO * dt
    # Um clique no personagem: o raio que sai da câmera pelo mouse bate na caixa dele?
    clicou = False
    if is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        raio = get_screen_to_world_ray(get_mouse_position(), camera)
        clicou = get_ray_collision_box(raio, caixa).hit
    if clicou or is_key_pressed(KEY_SPACE):
        tempo = DURACAO_DO_CLARAO
        toques += 1
    tempo = max(0, tempo - dt)
    quanto.x = tempo / DURACAO_DO_CLARAO
    set_shader_value(shader, lugar, quanto, SHADER_UNIFORM_VEC2)

    begin_drawing()
    clear_background(DARKBLUE)
    begin_mode_3d(camera)
    draw_grid(10, 1)
    draw_model_ex(personagem, Vector3(0, -caixa_original.min.y * escala, 0), Vector3(0, 1, 0), giro,
                  Vector3(escala, escala, escala), WHITE)
    end_mode_3d()
    draw_text(f'Toques: {toques}', 10, 10, 30, RAYWHITE)
    draw_text('Clique no personagem ou aperte a barra', 10, 45, 20, SKYBLUE)
    end_drawing()

close_window()
