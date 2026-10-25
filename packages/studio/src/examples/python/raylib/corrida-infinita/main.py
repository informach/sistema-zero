from pyray import *
from random import randint

LARGURA = 800
ALTURA = 450
VELOCIDADE = 6
GRAVIDADE = 16
PULO = 8
# A altura de cada um na pista. Cada modelo do Molda vem de um tamanho, e o jogo ajusta.
ALTURA_DO_CORREDOR = 1.8
ALTURA_DO_ROBO = 1.2
ALTURA_DO_CRISTAL = 0.9
LADO_DO_CHAO = 2
VELOCIDADE_DA_ANIMACAO = 30

init_window(LARGURA, ALTURA, 'Corrida Infinita')
init_audio_device()
set_target_fps(60)

# A câmera olha a pista de lado, um pouco à frente do corredor.
camera = Camera3D(Vector3(10, 5, 5), Vector3(0, 1, 2), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)

# O corredor e o robô foram feitos no Molda, com esqueleto e movimentos.
# Cada movimento tem o nome que ele ganhou no Molda: é por esse nome que o jogo escolhe.
corredor = load_model('models/corredor.glb')
quantos_do_corredor = ffi.new('int *', 0)
movimentos_do_corredor = load_model_animations('models/corredor.glb', quantos_do_corredor)
robo = load_model('models/robo.glb')
quantos_do_robo = ffi.new('int *', 0)
movimentos_do_robo = load_model_animations('models/robo.glb', quantos_do_robo)
cristal = load_model('models/cristal.glb')


def movimento(movimentos, quantos, nome):
    for indice in range(quantos[0]):
        if ffi.string(movimentos[indice].name).decode('utf-8') == nome:
            return movimentos[indice]
    return movimentos[0]


correr = movimento(movimentos_do_corredor, quantos_do_corredor, 'Correr')
pular = movimento(movimentos_do_corredor, quantos_do_corredor, 'Pular')
andar = movimento(movimentos_do_robo, quantos_do_robo, 'Andar')

# O chão é uma peça quadrada vestida com a textura de grama do Molda, repetida pela pista.
chao = load_model_from_mesh(gen_mesh_cube(LADO_DO_CHAO, 1, LADO_DO_CHAO))
set_material_texture(chao.materials[0], MATERIAL_MAP_ALBEDO, load_texture('images/chao.png'))

# O céu 360° do Molda é uma imagem panorâmica. A esfera do raylib vai de polo a polo pela
# largura da imagem e dá a volta pela altura, então a imagem entra deitada (girada e espelhada)
# e a esfera é desenhada girada, com o polo para cima.
imagem_do_ceu = load_image('images/ceu.png')
image_rotate_cw(imagem_do_ceu)
image_flip_horizontal(imagem_do_ceu)
ceu = load_model_from_mesh(gen_mesh_sphere(60, 32, 32))
set_material_texture(ceu.materials[0], MATERIAL_MAP_ALBEDO, load_texture_from_image(imagem_do_ceu))
unload_image(imagem_do_ceu)

som_pulo = load_sound('sounds/pulo.wav')
som_batida = load_sound('sounds/batida.wav')


def escala_para(modelo, altura):
    # A caixa do modelo diz a altura dele no arquivo; a escala o deixa da altura pedida.
    original = get_model_bounding_box(modelo)
    return altura / (original.max.y - original.min.y)


def pe(modelo, escala):
    # Quanto subir o modelo para os pés dele ficarem no chão.
    return -get_model_bounding_box(modelo).min.y * escala


def caixa(modelo, escala, posicao, folga):
    # A caixa do modelo na pista, um pouco menor que ele: só bate quando encosta de verdade.
    original = get_model_bounding_box(modelo)
    return BoundingBox(
        Vector3(posicao.x + original.min.x * escala + folga, posicao.y + folga,
                posicao.z + original.min.z * escala + folga),
        Vector3(posicao.x + original.max.x * escala - folga,
                posicao.y + (original.max.y - original.min.y) * escala - folga,
                posicao.z + original.max.z * escala - folga))


escala_do_corredor = escala_para(corredor, ALTURA_DO_CORREDOR)
escala_do_robo = escala_para(robo, ALTURA_DO_ROBO)
escala_do_cristal = escala_para(cristal, ALTURA_DO_CRISTAL)


class Obstaculo:
    def __init__(self, modelo, escala, anda):
        self.modelo = modelo
        self.escala = escala
        self.posicao = Vector3(0, 0, 18)
        # O robô vem andando na nossa direção, então chega mais depressa que o cristal.
        self.anda = anda
        self.velocidade = VELOCIDADE + 1.5 * anda

    def atualizar(self, dt):
        self.posicao.z -= self.velocidade * dt

    def desenhar(self):
        lugar = Vector3(self.posicao.x, self.posicao.y + pe(self.modelo, self.escala), self.posicao.z)
        tamanho = Vector3(self.escala, self.escala, self.escala)
        draw_model_ex(self.modelo, lugar, Vector3(0, 1, 0), 180, tamanho, WHITE)


def comecar():
    global altura, velocidade_y, obstaculos, falta, tempo, perdeu, quadro, movimento_atual, rolagem
    altura = 0
    velocidade_y = 0
    obstaculos = []
    falta = 1.5
    tempo = 0
    perdeu = False
    quadro = 0
    movimento_atual = correr
    rolagem = 0


recorde = 0
quadro_do_robo = 0
comecar()

while not window_should_close():
    dt = get_frame_time()

    if perdeu:
        if is_key_pressed(KEY_ENTER):
            comecar()
    else:
        tempo += dt
        rolagem = (rolagem + VELOCIDADE * dt) % LADO_DO_CHAO

        # Pular só vale com os pés no chão.
        if altura <= 0 and (is_key_pressed(KEY_SPACE) or is_key_pressed(KEY_UP)):
            velocidade_y = PULO
            movimento_atual = pular
            quadro = 0
            play_sound(som_pulo)
        velocidade_y -= GRAVIDADE * dt
        altura += velocidade_y * dt
        if altura < 0:
            altura = 0
            velocidade_y = 0
            movimento_atual = correr

        # Um obstáculo novo de tempos em tempos: um robô ou um cristal.
        falta -= dt
        if falta <= 0:
            if randint(0, 1) == 0:
                obstaculos.append(Obstaculo(robo, escala_do_robo, 1))
            else:
                obstaculos.append(Obstaculo(cristal, escala_do_cristal, 0))
            falta = randint(15, 28) / 10
        for obstaculo in obstaculos:
            obstaculo.atualizar(dt)
        obstaculos = [o for o in obstaculos if o.posicao.z > -14]

        caixa_do_corredor = caixa(corredor, escala_do_corredor, Vector3(0, altura, 0), 0.15)
        for obstaculo in obstaculos:
            if check_collision_boxes(caixa_do_corredor, caixa(obstaculo.modelo, obstaculo.escala, obstaculo.posicao, 0.15)):
                perdeu = True
                play_sound(som_batida)
                recorde = max(recorde, int(tempo * 10))

    # Os movimentos andam um quadro de cada vez, em volta, como um desenho animado.
    quadro = (quadro + VELOCIDADE_DA_ANIMACAO * dt) % movimento_atual.keyframeCount
    update_model_animation(corredor, movimento_atual, int(quadro))
    quadro_do_robo = (quadro_do_robo + VELOCIDADE_DA_ANIMACAO * dt) % andar.keyframeCount
    update_model_animation(robo, andar, int(quadro_do_robo))

    begin_drawing()
    clear_background(SKYBLUE)
    begin_mode_3d(camera)
    # O céu vem primeiro, sem esconder nada: a esfera é vista por dentro.
    rl_disable_backface_culling()
    rl_disable_depth_mask()
    draw_model_ex(ceu, camera.position, Vector3(1, 0, 0), -90, Vector3(1, 1, 1), WHITE)
    rl_enable_depth_mask()
    rl_enable_backface_culling()
    for linha in range(-7, 12):
        for coluna in range(-1, 2):
            lugar = Vector3(coluna * LADO_DO_CHAO, -0.5, linha * LADO_DO_CHAO - rolagem)
            draw_model(chao, lugar, 1, WHITE)
    for obstaculo in obstaculos:
        obstaculo.desenhar()
    tamanho = Vector3(escala_do_corredor, escala_do_corredor, escala_do_corredor)
    draw_model_ex(corredor, Vector3(0, altura + pe(corredor, escala_do_corredor), 0), Vector3(0, 1, 0), 0,
                  tamanho, WHITE)
    end_mode_3d()

    draw_text(f'Pontos: {int(tempo * 10)}', 10, 10, 30, DARKBLUE)
    draw_text(f'Recorde: {recorde}', 10, 45, 20, DARKGRAY)
    if perdeu:
        draw_rectangle(0, 170, LARGURA, 110, fade(BLACK, 0.6))
        draw_text('Bateu!', 340, 185, 40, RAYWHITE)
        draw_text('Enter: correr de novo', 280, 235, 24, RAYWHITE)
    else:
        draw_text('Barra de espaço: pular', 10, ALTURA - 30, 20, DARKGRAY)
    end_drawing()

close_audio_device()
close_window()
