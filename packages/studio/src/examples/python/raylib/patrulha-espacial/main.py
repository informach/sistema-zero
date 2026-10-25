from pyray import *
from random import randint
from math import sin

LARGURA = 800
ALTURA = 450
VELOCIDADE_DA_NAVE = 7
VELOCIDADE_DO_LASER = 12
LARGURA_DA_NAVE = 1.6
TEMPO_ENTRE_METEOROS = 0.6
BORDA = 6

# O clarão do meteoro atingido: o mesmo shader de "flash" do curso, escrito aqui mesmo.
CLARAO = """#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
uniform sampler2D texture0;
uniform vec2 clarao;
out vec4 finalColor;
void main() {
    vec4 cor = texture(texture0, fragTexCoord);
    finalColor = mix(cor, vec4(1.0, 1.0, 1.0, cor.a), clarao.x);
}
"""

init_window(LARGURA, ALTURA, 'Patrulha Espacial')
init_audio_device()
set_target_fps(60)
camera = Camera3D(Vector3(-4, 8, 6), Vector3(0, 0, -1), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)

# A nave foi feita no Molda. A caixa dela diz o tamanho no arquivo; a escala a deixa da largura certa.
nave = load_model('models/nave.glb')
caixa_da_nave = get_model_bounding_box(nave)
escala_da_nave = LARGURA_DA_NAVE / (caixa_da_nave.max.x - caixa_da_nave.min.x)
meio_da_nave = (caixa_da_nave.min.y + caixa_da_nave.max.y) / 2

# O chão escuro: uma peça quadrada com a textura do Molda, repetida embaixo da patrulha.
LADO_DO_CHAO = 8
chao = load_model_from_mesh(gen_mesh_cube(LADO_DO_CHAO, 1, LADO_DO_CHAO))
set_material_texture(chao.materials[0], MATERIAL_MAP_ALBEDO, load_texture('images/chao.png'))

# Uma bola para cada cor de meteoro, todas com o mesmo shader do clarão.
shader = load_shader_from_memory(ffi.NULL, CLARAO)
lugar_do_clarao = get_shader_location(shader, 'clarao')
quanto = ffi.new('struct Vector2 *', [0, 0])
bolas = []
for cor in ['vermelho', 'verde', 'laranja', 'roxo']:
    bola = load_model_from_mesh(gen_mesh_sphere(1, 8, 8))
    set_material_texture(bola.materials[0], MATERIAL_MAP_ALBEDO, load_texture(f'images/meteoro-{cor}.png'))
    bola.materials[0].shader = shader
    bolas.append(bola)

som_laser = load_sound('sounds/laser.wav')
som_explosao = load_sound('sounds/explosao.wav')


class Meteoro:
    def __init__(self):
        self.bola = bolas[randint(0, len(bolas) - 1)]
        self.raio = randint(6, 15) / 10
        self.posicao = Vector3(randint(-BORDA, BORDA), 0, -20)
        self.velocidade = randint(30, 45) / 10
        self.eixo = Vector3(randint(-10, 10) / 10, 1, randint(-10, 10) / 10)
        self.giro = 0
        # Depois do tiro, o meteoro pisca e some um quarto de segundo depois.
        self.atingido = False
        self.falta = 0.25

    def atualizar(self, dt):
        if self.atingido:
            self.falta -= dt
        else:
            self.posicao.z += self.velocidade * dt
            self.giro += 60 * dt

    def desenhar(self):
        quanto.x = 1 if self.atingido else 0
        set_shader_value(shader, lugar_do_clarao, quanto, SHADER_UNIFORM_VEC2)
        tamanho = Vector3(self.raio, self.raio, self.raio)
        draw_model_ex(self.bola, self.posicao, self.eixo, self.giro, tamanho, WHITE)


def comecar():
    global posicao, inclinacao, lasers, meteoros, falta, tempo, destruidos, perdeu
    posicao = Vector3(0, 0, 0)
    inclinacao = 0
    lasers = []
    meteoros = []
    falta = 1
    tempo = 0
    destruidos = 0
    perdeu = False


recorde = 0
comecar()

while not window_should_close():
    dt = get_frame_time()

    if perdeu:
        if is_key_pressed(KEY_ENTER):
            comecar()
    else:
        tempo += dt
        # A nave anda para os lados, inclina na curva e balança de leve no ar.
        direcao = int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))
        posicao.x = max(-BORDA, min(BORDA, posicao.x + direcao * VELOCIDADE_DA_NAVE * dt))
        inclinacao = max(-15, min(15, inclinacao - direcao * 60 * dt))
        if direcao == 0:
            inclinacao *= 0.9
        posicao.y = 0.1 * sin(get_time() * 5)
        if is_key_pressed(KEY_SPACE):
            lasers.append(Vector3(posicao.x, 0, posicao.z - 1))
            play_sound(som_laser)

        falta -= dt
        if falta <= 0:
            meteoros.append(Meteoro())
            falta = TEMPO_ENTRE_METEOROS
        for laser in lasers:
            laser.z -= VELOCIDADE_DO_LASER * dt
        for meteoro in meteoros:
            meteoro.atualizar(dt)

        # O laser é uma caixinha comprida: bate no meteoro quando a caixa encosta na bola.
        for laser in lasers:
            caixa_do_laser = BoundingBox(Vector3(laser.x - 0.08, -0.08, laser.z - 0.4),
                                         Vector3(laser.x + 0.08, 0.08, laser.z + 0.4))
            for meteoro in meteoros:
                if not meteoro.atingido and check_collision_box_sphere(caixa_do_laser, meteoro.posicao, meteoro.raio):
                    meteoro.atingido = True
                    laser.z = -100
                    destruidos += 1
                    play_sound(som_explosao)
        for meteoro in meteoros:
            if not meteoro.atingido and check_collision_spheres(posicao, 0.6, meteoro.posicao, meteoro.raio):
                perdeu = True
                play_sound(som_explosao)
                recorde = max(recorde, destruidos)
        lasers = [laser for laser in lasers if laser.z > -30]
        meteoros = [m for m in meteoros if m.falta > 0 and m.posicao.z < 10]

    begin_drawing()
    clear_background(BLACK)
    begin_mode_3d(camera)
    for linha in range(-5, 2):
        for coluna in range(-2, 4):
            draw_model(chao, Vector3(coluna * LADO_DO_CHAO, -2, linha * LADO_DO_CHAO), 1, WHITE)
    # As sombras são cilindros bem baixinhos e meio transparentes no chão.
    draw_cylinder(Vector3(posicao.x, -1.5, posicao.z), 0.6, 0.6, 0.05, 20, Color(0, 0, 0, 80))
    for meteoro in meteoros:
        raio = meteoro.raio * 0.8
        draw_cylinder(Vector3(meteoro.posicao.x, -1.5, meteoro.posicao.z), raio, raio, 0.05, 20, Color(0, 0, 0, 80))
    tamanho = Vector3(escala_da_nave, escala_da_nave, escala_da_nave)
    lugar = Vector3(posicao.x, posicao.y - meio_da_nave * escala_da_nave, posicao.z)
    draw_model_ex(nave, lugar, Vector3(0, 0, 1), inclinacao, tamanho, WHITE)
    for laser in lasers:
        draw_cube(laser, 0.16, 0.16, 0.8, YELLOW)
    for meteoro in meteoros:
        meteoro.desenhar()
    end_mode_3d()

    draw_text(f'Meteoros: {destruidos}', 10, 10, 30, RAYWHITE)
    draw_text(f'Recorde: {recorde}', 10, 45, 20, GRAY)
    if perdeu:
        draw_rectangle(0, 170, LARGURA, 110, fade(BLACK, 0.6))
        draw_text('A nave foi atingida!', 260, 185, 30, RAYWHITE)
        draw_text('Enter: jogar de novo', 285, 235, 24, RAYWHITE)
    else:
        draw_text('Setas: andar   Barra de espaço: atirar', 10, ALTURA - 30, 20, GRAY)
    end_drawing()

close_audio_device()
close_window()
