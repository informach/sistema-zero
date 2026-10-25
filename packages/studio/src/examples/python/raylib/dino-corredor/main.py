from pyray import *
from random import randint, choice

LARGURA = 800
ALTURA = 450
CHAO = 300
ESCALA = 4
PE = CHAO + 16 * ESCALA
GRAVIDADE = 2400
PULO = -820
COR = (83, 83, 83, 255)

init_window(LARGURA, ALTURA, 'Dino Corredor')
init_audio_device()
set_target_fps(60)

correndo = [load_texture('images/dino0.png'), load_texture('images/dino1.png')]
pulando = load_texture('images/dino-pulo.png')
cactos = [load_texture(f'images/cacto{i}.png') for i in range(3)]
passaro = [load_texture('images/passaro0.png'), load_texture('images/passaro1.png')]
textura_nuvem = load_texture('images/nuvem.png')
fonte = load_font_ex('fonts/pressstart2p.ttf', 16, None, 224)
som_pulo = load_sound('sounds/pulo.wav')
som_batida = load_sound('sounds/batida.wav')
musica = load_music_stream('music/tema.ogg')
play_music_stream(musica)


class Obstaculo:
    def __init__(self, texturas, y, velocidade):
        self.texturas = texturas
        self.posicao = Vector2(LARGURA, y)
        self.velocidade = velocidade
        self.quadro = 0

    def atualizar(self, dt):
        self.posicao.x -= self.velocidade * dt
        self.quadro = (self.quadro + 6 * dt) % len(self.texturas)

    def textura(self):
        return self.texturas[int(self.quadro)]

    def caixa(self):
        t = self.textura()
        # Uma caixa um pouco menor que o desenho: só bate quando encosta de verdade.
        return Rectangle(self.posicao.x + 4, self.posicao.y + 4, t.width * ESCALA - 8, t.height * ESCALA - 8)

    def desenhar(self):
        draw_texture_ex(self.textura(), self.posicao, 0, ESCALA, WHITE)


def novo_obstaculo(velocidade):
    if randint(0, 10) <= 7:
        textura = choice(cactos)
        return Obstaculo([textura], PE - textura.height * ESCALA, velocidade)
    return Obstaculo(passaro, PE - 8 * ESCALA - randint(0, 40), velocidade)


def comecar():
    global dino_y, velocidade_y, obstaculos, nuvens, tempo, falta, perdeu
    dino_y = CHAO
    velocidade_y = 0
    obstaculos = []
    nuvens = [Vector2(randint(0, LARGURA), randint(40, 160)) for i in range(4)]
    tempo = 0
    falta = 1.5
    perdeu = False


recorde = 0
quadro_dino = 0
comecar()

while not window_should_close():
    dt = get_frame_time()
    update_music_stream(musica)

    if perdeu:
        if is_key_pressed(KEY_ENTER):
            comecar()
    else:
        tempo += dt
        velocidade = 360 + tempo * 8

        # Gravidade e pulo: a velocidade para baixo cresce a cada quadro.
        velocidade_y += GRAVIDADE * dt
        dino_y += velocidade_y * dt
        no_chao = dino_y >= CHAO
        if no_chao:
            dino_y = CHAO
            velocidade_y = 0
        if no_chao and (is_key_pressed(KEY_SPACE) or is_key_pressed(KEY_UP)):
            velocidade_y = PULO
            play_sound(som_pulo)
        quadro_dino = (quadro_dino + 10 * dt) % 2

        falta -= dt
        if falta <= 0:
            obstaculos.append(novo_obstaculo(velocidade))
            falta = randint(9, 18) / 10
        for obstaculo in obstaculos:
            obstaculo.velocidade = velocidade
            obstaculo.atualizar(dt)
        obstaculos = [o for o in obstaculos if o.posicao.x > -100]
        for nuvem in nuvens:
            nuvem.x -= 40 * dt
            if nuvem.x < -60:
                nuvem.x = LARGURA + randint(0, 100)

        caixa_dino = Rectangle(100 + 8, dino_y + 6, 16 * ESCALA - 18, 16 * ESCALA - 8)
        for obstaculo in obstaculos:
            if check_collision_recs(caixa_dino, obstaculo.caixa()):
                perdeu = True
                play_sound(som_batida)
                recorde = max(recorde, int(tempo * 10))

    begin_drawing()
    clear_background(RAYWHITE)
    for nuvem in nuvens:
        draw_texture_ex(textura_nuvem, nuvem, 0, ESCALA, WHITE)
    draw_line_ex(Vector2(0, PE), Vector2(LARGURA, PE), 4, COR)
    for obstaculo in obstaculos:
        obstaculo.desenhar()
    if dino_y < CHAO:
        textura_dino = pulando
    else:
        textura_dino = correndo[int(quadro_dino)]
    draw_texture_ex(textura_dino, Vector2(100, dino_y), 0, ESCALA, WHITE)

    pontos = f'{int(tempo * 10):05d}'
    largura_texto = measure_text_ex(fonte, pontos, 16, 0).x
    draw_text_ex(fonte, pontos, Vector2(LARGURA - largura_texto - 20, 20), 16, 0, COR)
    draw_text_ex(fonte, f'RECORDE {recorde:05d}', Vector2(20, 20), 16, 0, GRAY)
    if perdeu:
        draw_text_ex(fonte, 'FIM DE JOGO', Vector2(310, 150), 24, 0, COR)
        draw_text_ex(fonte, 'Enter: correr de novo', Vector2(240, 200), 16, 0, GRAY)
    end_drawing()

unload_music_stream(musica)
close_audio_device()
close_window()
