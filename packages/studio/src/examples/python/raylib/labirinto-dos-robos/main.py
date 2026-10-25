from pyray import *
from math import sin, cos

LARGURA = 800
ALTURA = 450
LADO = 2
ALTURA_DA_PAREDE = 3
OLHOS = 1.2
VELOCIDADE = 4
GIRO_DAS_SETAS = 2.5
SENSIBILIDADE = 0.003
RAIO_DO_CORPO = 0.3
ALCANCE_DO_RAIO = 30
DANO_DO_RAIO = 1
VIDA_DO_ROBO = 3
DANO_DO_CHOQUE = 10

# O labirinto: # é parede, J é onde você começa e R é um robô. Mude as letras para fazer outro.
MAPA = [
    '############',
    '#J.....#...#',
    '#.##.#.#.R.#',
    '#.#..#.....#',
    '#.#.##.###.#',
    '#......#R..#',
    '###.##.#.###',
    '#R..#......#',
    '#.#.#.####.#',
    '#.#...#..R.#',
    '#...#...#..#',
    '############',
]

init_window(LARGURA, ALTURA, 'Labirinto dos Robôs')
init_audio_device()
set_target_fps(60)
# O mouse fica preso na janela: mexer o mouse vira o olhar.
disable_cursor()

# Paredes, chão e céu foram feitos no Molda; o robô e o lançador foram desenhados no Pinta.
parede = load_model_from_mesh(gen_mesh_cube(LADO, ALTURA_DA_PAREDE, LADO))
set_material_texture(parede.materials[0], MATERIAL_MAP_ALBEDO, load_texture('images/parede.png'))
chao = load_model_from_mesh(gen_mesh_cube(LADO, 0.2, LADO))
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

# A folha do robô tem uma linha por animação: parado, andando, atacando e desligado, com até
# dois quadros em cada linha (por isso a largura do quadro é a metade da imagem).
textura_robo = load_texture('images/robo.png')
LARGURA_DO_ROBO = textura_robo.width / 2
ALTURA_DO_ROBO = textura_robo.height / 4
# A folha do lançador: pronto em cima, disparando embaixo.
textura_lancador = load_texture('images/lancador.png')
LARGURA_DO_LANCADOR = textura_lancador.width
ALTURA_DO_LANCADOR = textura_lancador.height / 2

som_raio = load_sound('sounds/raio.wav')
som_choque = load_sound('sounds/choque.wav')
som_desliga = load_sound('sounds/desliga.wav')

# Uma caixa por parede: é nelas que o raio de energia bate.
caixas = []
for linha in range(len(MAPA)):
    for coluna in range(len(MAPA[linha])):
        if MAPA[linha][coluna] == '#':
            canto = Vector3(coluna * LADO - LADO / 2, 0, linha * LADO - LADO / 2)
            caixas.append(BoundingBox(canto, Vector3(canto.x + LADO, ALTURA_DA_PAREDE, canto.z + LADO)))


def parede_em(x, z):
    return MAPA[int((z + LADO / 2) // LADO)][int((x + LADO / 2) // LADO)] == '#'


def bate(x, z):
    # O corpo é um quadradinho em volta do ponto: bate se um dos cantos estiver numa parede.
    for dx in [-RAIO_DO_CORPO, RAIO_DO_CORPO]:
        for dz in [-RAIO_DO_CORPO, RAIO_DO_CORPO]:
            if parede_em(x + dx, z + dz):
                return True
    return False


def andar(posicao, passo_x, passo_z):
    # Um eixo de cada vez: encostado na parede, ainda dá para deslizar por ela.
    if not bate(posicao.x + passo_x, posicao.z):
        posicao.x += passo_x
    if not bate(posicao.x, posicao.z + passo_z):
        posicao.z += passo_z


class Robo:
    def __init__(self, x, z):
        self.posicao = Vector3(x, 0.9, z)
        self.vida = VIDA_DO_ROBO
        self.estado = 'parado'
        self.quadro = 0
        self.recarga = 1

    def ligado(self):
        return self.vida > 0

    def atualizar(self, dt):
        if not self.ligado():
            self.estado = 'desligado'
            return
        distancia = vector3_distance(Vector3(posicao.x, 0.9, posicao.z), self.posicao)
        # Perto, ele dá choque; mais longe, ele vem atrás; muito longe, ele espera.
        if distancia < 1.8:
            self.estado = 'atacando'
            self.recarga -= dt
            if self.recarga <= 0:
                self.recarga = 1
                levar_choque()
        elif distancia < 8:
            self.estado = 'andando'
            direcao = vector3_normalize(vector3_subtract(Vector3(posicao.x, 0.9, posicao.z), self.posicao))
            andar(self.posicao, direcao.x * 1.6 * dt, direcao.z * 1.6 * dt)
        else:
            self.estado = 'parado'
        self.quadro = (self.quadro + 4 * dt) % 2

    def desenhar(self):
        linhas = {'parado': 0, 'andando': 1, 'atacando': 2, 'desligado': 3}
        coluna = int(self.quadro) if self.estado in ['andando', 'atacando'] else 0
        recorte = Rectangle(coluna * LARGURA_DO_ROBO, linhas[self.estado] * ALTURA_DO_ROBO,
                            LARGURA_DO_ROBO, ALTURA_DO_ROBO)
        draw_billboard_rec(camera, textura_robo, recorte, self.posicao, Vector2(1.6, 1.8), WHITE)


def levar_choque():
    global energia, piscar
    energia = max(0, energia - DANO_DO_CHOQUE)
    piscar = 0.25
    play_sound(som_choque)


def comecar():
    global posicao, angulo, olhar, robos, energia, piscar, disparo, recarga_do_raio, fim_do_raio, perdeu, venceu
    robos = []
    for linha in range(len(MAPA)):
        for coluna in range(len(MAPA[linha])):
            if MAPA[linha][coluna] == 'J':
                posicao = Vector3(coluna * LADO, OLHOS, linha * LADO)
            if MAPA[linha][coluna] == 'R':
                robos.append(Robo(coluna * LADO, linha * LADO))
    angulo = 0
    olhar = 0
    energia = 100
    piscar = 0
    disparo = 0
    recarga_do_raio = 0
    fim_do_raio = Vector3(0, 0, 0)
    perdeu = False
    venceu = False


def disparar():
    global disparo, fim_do_raio
    disparo = 0.12
    play_sound(som_raio)
    # O raio sai do meio da tela, para onde a mira aponta.
    raio = get_screen_to_world_ray(Vector2(LARGURA / 2, ALTURA / 2), camera)
    mais_perto = ALCANCE_DO_RAIO
    for caixa in caixas:
        batida = get_ray_collision_box(raio, caixa)
        if batida.hit and batida.distance < mais_perto:
            mais_perto = batida.distance
    alvo = None
    for robo in robos:
        batida = get_ray_collision_sphere(raio, robo.posicao, 0.6)
        if robo.ligado() and batida.hit and batida.distance < mais_perto:
            mais_perto = batida.distance
            alvo = robo
    fim_do_raio = vector3_add(raio.position, vector3_scale(raio.direction, mais_perto))
    if alvo:
        alvo.vida -= DANO_DO_RAIO
        if not alvo.ligado():
            play_sound(som_desliga)


camera = Camera3D(Vector3(0, OLHOS, 0), Vector3(1, OLHOS, 0), Vector3(0, 1, 0), 60, CAMERA_PERSPECTIVE)
comecar()

while not window_should_close():
    dt = get_frame_time()

    if perdeu or venceu:
        if is_key_pressed(KEY_ENTER):
            comecar()
    else:
        # Olhar: o mouse gira e inclina; as setas para os lados também giram.
        giro = get_mouse_delta()
        angulo += giro.x * SENSIBILIDADE
        angulo += (int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))) * GIRO_DAS_SETAS * dt
        olhar = max(-1.2, min(1.2, olhar - giro.y * SENSIBILIDADE))
        # Andar: W e S (ou as setas) para frente e para trás, A e D para os lados.
        frente = int(is_key_down(KEY_W) or is_key_down(KEY_UP)) - int(is_key_down(KEY_S) or is_key_down(KEY_DOWN))
        lado = int(is_key_down(KEY_D)) - int(is_key_down(KEY_A))
        passo_x = (cos(angulo) * frente - sin(angulo) * lado) * VELOCIDADE * dt
        passo_z = (sin(angulo) * frente + cos(angulo) * lado) * VELOCIDADE * dt
        andar(posicao, passo_x, passo_z)

        recarga_do_raio = max(0, recarga_do_raio - dt)
        if recarga_do_raio == 0 and (is_mouse_button_pressed(MOUSE_BUTTON_LEFT) or is_key_pressed(KEY_SPACE)):
            recarga_do_raio = 0.3
            disparar()
        disparo = max(0, disparo - dt)
        piscar = max(0, piscar - dt)
        for robo in robos:
            robo.atualizar(dt)

        if energia <= 0:
            perdeu = True
        if len([robo for robo in robos if robo.ligado()]) == 0:
            venceu = True

    camera.position = Vector3(posicao.x, posicao.y, posicao.z)
    camera.target = Vector3(posicao.x + cos(olhar) * cos(angulo), posicao.y + sin(olhar),
                            posicao.z + cos(olhar) * sin(angulo))

    begin_drawing()
    clear_background(BLACK)
    begin_mode_3d(camera)
    rl_disable_backface_culling()
    rl_disable_depth_mask()
    draw_model_ex(ceu, camera.position, Vector3(1, 0, 0), -90, Vector3(1, 1, 1), WHITE)
    rl_enable_depth_mask()
    rl_enable_backface_culling()
    for linha in range(len(MAPA)):
        for coluna in range(len(MAPA[linha])):
            if MAPA[linha][coluna] == '#':
                draw_model(parede, Vector3(coluna * LADO, ALTURA_DA_PAREDE / 2, linha * LADO), 1, WHITE)
            else:
                draw_model(chao, Vector3(coluna * LADO, -0.1, linha * LADO), 1, WHITE)
    # Os robôs de longe primeiro: assim o de perto sempre fica na frente.
    for robo in sorted(robos, key=lambda r: -vector3_distance(r.posicao, camera.position)):
        robo.desenhar()
    if disparo > 0:
        saida = Vector3(posicao.x + cos(angulo) * 0.3, posicao.y - 0.25, posicao.z + sin(angulo) * 0.3)
        draw_cylinder_ex(saida, fim_do_raio, 0.03, 0.03, 6, SKYBLUE)
    end_mode_3d()

    # A mira, o lançador, a energia e os robôs que ainda estão ligados.
    draw_line(LARGURA // 2 - 8, ALTURA // 2, LARGURA // 2 + 8, ALTURA // 2, RAYWHITE)
    draw_line(LARGURA // 2, ALTURA // 2 - 8, LARGURA // 2, ALTURA // 2 + 8, RAYWHITE)
    linha_do_lancador = 1 if disparo > 0 else 0
    recorte = Rectangle(0, linha_do_lancador * ALTURA_DO_LANCADOR, LARGURA_DO_LANCADOR, ALTURA_DO_LANCADOR)
    destino = Rectangle(LARGURA / 2 - 48, ALTURA - 96, 96, 96)
    draw_texture_pro(textura_lancador, recorte, destino, Vector2(0, 0), 0, WHITE)
    draw_rectangle(10, 10, 204, 24, fade(BLACK, 0.5))
    draw_rectangle(12, 12, energia * 2, 20, GREEN)
    draw_text(f'Energia {energia}', 20, 14, 18, RAYWHITE)
    ligados = len([robo for robo in robos if robo.ligado()])
    draw_text(f'Robôs ligados: {ligados}', 10, 42, 20, RAYWHITE)
    if piscar > 0:
        draw_rectangle(0, 0, LARGURA, ALTURA, fade(RED, piscar))
    if perdeu or venceu:
        draw_rectangle(0, 170, LARGURA, 110, fade(BLACK, 0.7))
        if venceu:
            draw_text('Todos os robôs desligados!', 215, 185, 30, RAYWHITE)
        else:
            draw_text('Sua energia acabou!', 270, 185, 30, RAYWHITE)
        draw_text('Enter: jogar de novo', 285, 235, 24, RAYWHITE)
    else:
        draw_rectangle(0, 66, 530, 46, fade(BLACK, 0.5))
        draw_text('Mouse (ou setas para os lados): olhar   W A S D (ou setas): andar', 10, 70, 16, RAYWHITE)
        draw_text('Clique ou espaço: soltar o raio', 10, 90, 16, RAYWHITE)
    end_drawing()

enable_cursor()
close_audio_device()
close_window()
