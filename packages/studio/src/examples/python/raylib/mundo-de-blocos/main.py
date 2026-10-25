from pyray import *
from math import sin, cos, floor

LARGURA = 800
ALTURA = 450
TAMANHO_DO_MUNDO = 8
VELOCIDADE = 5
PULO = 8
GRAVIDADE = 20
ALCANCE = 6
SENSIBILIDADE = 0.003
GIRO_DAS_SETAS = 2.5
OLHOS = 1.5
RAIO_DO_CORPO = 0.3

init_window(LARGURA, ALTURA, 'Mundo de Blocos')
set_target_fps(60)
# O mouse fica preso na janela: mexer o mouse vira o olhar.
disable_cursor()

# Cada tipo de bloco é um cubo vestido com uma textura pintada no Molda.
NOMES = ['grama', 'terra', 'grama-com-terra', 'areia', 'tijolo', 'madeira', 'folhas', 'lava']
modelos = []
for nome in NOMES:
    modelo = load_model_from_mesh(gen_mesh_cube(1, 1, 1))
    set_material_texture(modelo.materials[0], MATERIAL_MAP_ALBEDO, load_texture(f'images/{nome}.png'))
    modelos.append(modelo)

# A prévia do bloco escolhido é desenhada numa imagem à parte (uma render texture).
previa = load_render_texture(120, 120)
camera_da_previa = Camera3D(Vector3(2, 1.6, 2), Vector3(0, 0, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)


class Bloco:
    def __init__(self, x, y, z, tipo):
        self.posicao = Vector3(x, y, z)
        self.tipo = tipo
        self.caixa = BoundingBox(Vector3(x - 0.5, y - 0.5, z - 0.5), Vector3(x + 0.5, y + 0.5, z + 0.5))


def inteiro(valor):
    return int(floor(valor + 0.5))


def chave(x, y, z):
    return f'{inteiro(x)},{inteiro(y)},{inteiro(z)}'


def por_bloco(x, y, z, tipo):
    if chave(x, y, z) not in mundo:
        mundo[chave(x, y, z)] = Bloco(inteiro(x), inteiro(y), inteiro(z), tipo)


def solido(x, y, z):
    return chave(x, y, z) in mundo


def criar_mundo():
    global mundo
    mundo = {}
    for x in range(-TAMANHO_DO_MUNDO, TAMANHO_DO_MUNDO):
        for z in range(-TAMANHO_DO_MUNDO, TAMANHO_DO_MUNDO):
            if 3 <= x <= 4 and 2 <= z <= 3:
                por_bloco(x, 0, z, NOMES.index('lava'))
            elif 2 <= x <= 5 and 1 <= z <= 4:
                por_bloco(x, 0, z, NOMES.index('areia'))
            elif (x + z) % 5 == 0:
                por_bloco(x, 0, z, NOMES.index('grama-com-terra'))
            else:
                por_bloco(x, 0, z, NOMES.index('grama'))
    # Árvores: um tronco de madeira e uma copa de folhas.
    for tronco_x, tronco_z in [(-5, -4), (4, -5), (-3, 4)]:
        for y in range(1, 4):
            por_bloco(tronco_x, y, tronco_z, NOMES.index('madeira'))
        for x in range(tronco_x - 1, tronco_x + 2):
            for z in range(tronco_z - 1, tronco_z + 2):
                for y in range(3, 5):
                    por_bloco(x, y, z, NOMES.index('folhas'))
        por_bloco(tronco_x, 5, tronco_z, NOMES.index('folhas'))


def colide(x, y, z):
    # O corpo vai dos pés (OLHOS abaixo dos olhos) até um pouco acima dos olhos.
    for dx in [-RAIO_DO_CORPO, RAIO_DO_CORPO]:
        for dz in [-RAIO_DO_CORPO, RAIO_DO_CORPO]:
            for altura in [y - OLHOS + 0.01, y - OLHOS + 0.8, y + 0.1]:
                if solido(x + dx, altura, z + dz):
                    return True
    return False


def mirar():
    # O raio sai do meio da tela; o bloco mais perto que ele toca é o alvo.
    global alvo, normal
    raio = get_screen_to_world_ray(Vector2(LARGURA / 2, ALTURA / 2), camera)
    alvo = None
    mais_perto = ALCANCE
    for bloco in mundo.values():
        if vector3_distance(bloco.posicao, camera.position) < ALCANCE + 1:
            batida = get_ray_collision_box(raio, bloco.caixa)
            if batida.hit and batida.distance < mais_perto:
                mais_perto = batida.distance
                alvo = bloco
                # Copia a normal: no computador, a batida some no próximo bloco e levaria a normal junto.
                normal = Vector3(batida.normal.x, batida.normal.y, batida.normal.z)


def comecar():
    global posicao, angulo, olhar, velocidade_y, no_chao, escolhido, giro_da_previa
    criar_mundo()
    posicao = Vector3(0, 0.5 + OLHOS, 0)
    angulo = 0
    olhar = -0.3
    velocidade_y = 0
    no_chao = False
    escolhido = NOMES.index('tijolo')
    giro_da_previa = 0


camera = Camera3D(Vector3(0, 2, 0), Vector3(1, 2, 0), Vector3(0, 1, 0), 60, CAMERA_PERSPECTIVE)
alvo = None
normal = Vector3(0, 1, 0)
comecar()

while not window_should_close():
    dt = get_frame_time()

    # Olhar: o mouse gira e inclina; as setas para os lados também giram.
    giro = get_mouse_delta()
    angulo += giro.x * SENSIBILIDADE
    angulo += (int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))) * GIRO_DAS_SETAS * dt
    olhar = max(-1.5, min(1.5, olhar - giro.y * SENSIBILIDADE))

    # Andar, um eixo de cada vez, para deslizar encostado nos blocos.
    frente = int(is_key_down(KEY_W) or is_key_down(KEY_UP)) - int(is_key_down(KEY_S) or is_key_down(KEY_DOWN))
    lado = int(is_key_down(KEY_D)) - int(is_key_down(KEY_A))
    passo_x = (cos(angulo) * frente - sin(angulo) * lado) * VELOCIDADE * dt
    passo_z = (sin(angulo) * frente + cos(angulo) * lado) * VELOCIDADE * dt
    if not colide(posicao.x + passo_x, posicao.y, posicao.z):
        posicao.x += passo_x
    if not colide(posicao.x, posicao.y, posicao.z + passo_z):
        posicao.z += passo_z

    # Cair e pular.
    if no_chao and is_key_pressed(KEY_SPACE):
        velocidade_y = PULO
    velocidade_y -= GRAVIDADE * dt
    novo_y = posicao.y + velocidade_y * dt
    if colide(posicao.x, novo_y, posicao.z):
        no_chao = velocidade_y < 0
        velocidade_y = 0
    else:
        posicao.y = novo_y
        no_chao = False
    # Caiu para fora do mundo: volta para o começo.
    if posicao.y < -10:
        posicao = Vector3(0, 0.5 + OLHOS, 0)
        velocidade_y = 0

    camera.position = Vector3(posicao.x, posicao.y, posicao.z)
    camera.target = Vector3(posicao.x + cos(olhar) * cos(angulo), posicao.y + sin(olhar),
                            posicao.z + cos(olhar) * sin(angulo))

    # Q e E trocam o bloco escolhido.
    if is_key_pressed(KEY_Q):
        escolhido = (escolhido - 1) % len(NOMES)
    if is_key_pressed(KEY_E):
        escolhido = (escolhido + 1) % len(NOMES)

    mirar()
    if alvo:
        # Colocar: o bloco novo encosta na face do alvo, para o lado da normal.
        if is_mouse_button_pressed(MOUSE_BUTTON_LEFT) or is_key_pressed(KEY_C):
            x = alvo.posicao.x + normal.x
            y = alvo.posicao.y + normal.y
            z = alvo.posicao.z + normal.z
            if chave(x, y, z) not in mundo:
                por_bloco(x, y, z, escolhido)
                # Um bloco no lugar do jogador não vale: ele ficaria preso dentro.
                if colide(posicao.x, posicao.y, posicao.z):
                    mundo.pop(chave(x, y, z))
        # Tirar: o alvo some.
        elif is_mouse_button_pressed(MOUSE_BUTTON_RIGHT) or is_key_pressed(KEY_X):
            mundo.pop(chave(alvo.posicao.x, alvo.posicao.y, alvo.posicao.z))
            alvo = None

    giro_da_previa += 40 * dt
    begin_texture_mode(previa)
    clear_background(BLANK)
    begin_mode_3d(camera_da_previa)
    tamanho = Vector3(1.4, 1.4, 1.4)
    draw_model_ex(modelos[escolhido], Vector3(0, 0, 0), Vector3(0, 1, 0), giro_da_previa, tamanho, WHITE)
    end_mode_3d()
    end_texture_mode()

    begin_drawing()
    clear_background(SKYBLUE)
    begin_mode_3d(camera)
    for bloco in mundo.values():
        draw_model(modelos[bloco.tipo], bloco.posicao, 1, WHITE)
    if alvo:
        draw_cube_wires(alvo.posicao, 1.02, 1.02, 1.02, BLACK)
    end_mode_3d()

    # A mira e a prévia do bloco escolhido (a render texture vem de cabeça para baixo).
    draw_circle(LARGURA // 2, ALTURA // 2, 4, RED)
    draw_rectangle(10, ALTURA - 150, 130, 140, fade(BLACK, 0.4))
    draw_texture_rec(previa.texture, Rectangle(0, 0, 120, -120), Vector2(15, ALTURA - 145), WHITE)
    draw_text(NOMES[escolhido], 15, ALTURA - 28, 16, RAYWHITE)
    draw_text('Clique ou C: colocar   Clique direito ou X: tirar   Q e E: trocar o bloco', 10, 10, 16, DARKBLUE)
    draw_text('Mouse ou setas: olhar   W A S D: andar   Espaço: pular', 10, 30, 16, DARKBLUE)
    end_drawing()

enable_cursor()
close_window()
