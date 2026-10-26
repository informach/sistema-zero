from pyray import *
from random import randint, uniform

LARGURA = 800
ALTURA = 450
COR_DO_FUNDO = (15, 10, 25, 255)
VELOCIDADE_NAVE = 360
VELOCIDADE_LASER = 600
TEMPO_ENTRE_METEOROS = 0.5
# Cada ponto do desenho vira ESCALA pontos na tela: um desenho do Pinta fica grande e nítido.
ESCALA = 4

init_window(LARGURA, ALTURA, 'Chuva de Meteoros')
init_audio_device()
set_target_fps(60)

textura_nave = load_texture('images/nave.png')
textura_meteoro = load_texture('images/meteoro.png')
textura_laser = load_texture('images/laser.png')
textura_estrela = load_texture('images/estrela.png')
# A explosão é uma folha com os quadros lado a lado, do jeito que o Pinta exporta.
# O tamanho de um quadro sai da própria imagem: um desenho de qualquer tamanho entra no lugar.
textura_explosao = load_texture('images/explosao.png')
QUADROS_EXPLOSAO = 5
LARGURA_EXPLOSAO = textura_explosao.width / QUADROS_EXPLOSAO
ALTURA_EXPLOSAO = textura_explosao.height
fonte = load_font_ex('fonts/pressstart2p.ttf', 32, None, 224)
som_laser = load_sound('sounds/laser.wav')
som_explosao = load_sound('sounds/explosao.wav')
musica = load_music_stream('music/tema.ogg')
play_music_stream(musica)

estrelas = [(Vector2(randint(0, LARGURA), randint(0, ALTURA)), uniform(1, 3)) for i in range(30)]


class Sprite:
    def __init__(self, textura, posicao, velocidade, direcao):
        self.textura = textura
        self.posicao = posicao
        self.velocidade = velocidade
        self.direcao = direcao
        # O tamanho na tela é o tamanho do desenho vezes a ESCALA.
        self.tamanho = Vector2(textura.width * ESCALA, textura.height * ESCALA)
        self.raio = self.tamanho.y / 2
        self.descartar = False

    def mover(self, dt):
        self.posicao.x += self.direcao.x * self.velocidade * dt
        self.posicao.y += self.direcao.y * self.velocidade * dt

    def centro(self):
        return Vector2(self.posicao.x + self.tamanho.x / 2, self.posicao.y + self.tamanho.y / 2)

    def atualizar(self, dt):
        self.mover(dt)
        self.descartar = not -200 < self.posicao.y < ALTURA + 200

    def desenhar(self):
        draw_texture_ex(self.textura, self.posicao, 0, ESCALA, WHITE)


class Nave(Sprite):
    def __init__(self):
        super().__init__(textura_nave, Vector2(LARGURA / 2, ALTURA - 100), VELOCIDADE_NAVE, Vector2(0, 0))
        self.posicao.x -= self.tamanho.x / 2

    def atualizar(self, dt):
        self.direcao.x = int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))
        self.direcao.y = int(is_key_down(KEY_DOWN)) - int(is_key_down(KEY_UP))
        self.direcao = vector2_normalize(self.direcao)
        self.mover(dt)
        self.posicao.x = max(0, min(self.posicao.x, LARGURA - self.tamanho.x))
        self.posicao.y = max(0, min(self.posicao.y, ALTURA - self.tamanho.y))
        if is_key_pressed(KEY_SPACE):
            meia_largura_laser = textura_laser.width * ESCALA / 2
            atirar(Vector2(self.posicao.x + self.tamanho.x / 2 - meia_largura_laser, self.posicao.y - 40))


class Laser(Sprite):
    def __init__(self, posicao):
        super().__init__(textura_laser, posicao, VELOCIDADE_LASER, Vector2(0, -1))

    def caixa(self):
        return Rectangle(self.posicao.x, self.posicao.y, self.tamanho.x, self.tamanho.y)


class Meteoro(Sprite):
    def __init__(self):
        posicao = Vector2(randint(0, LARGURA), randint(-150, -50))
        super().__init__(textura_meteoro, posicao, randint(160, 260), Vector2(uniform(-0.5, 0.5), 1))
        self.giro = 0

    def atualizar(self, dt):
        super().atualizar(dt)
        self.giro += 60 * dt

    def centro(self):
        # O meteoro gira em volta do meio: a posição já é o centro.
        return self.posicao

    def desenhar(self):
        recorte = Rectangle(0, 0, self.textura.width, self.textura.height)
        destino = Rectangle(self.posicao.x, self.posicao.y, self.tamanho.x, self.tamanho.y)
        meio = Vector2(self.tamanho.x / 2, self.tamanho.y / 2)
        draw_texture_pro(self.textura, recorte, destino, meio, self.giro, WHITE)


class Explosao:
    def __init__(self, centro):
        self.posicao = Vector2(centro.x - LARGURA_EXPLOSAO * ESCALA / 2, centro.y - ALTURA_EXPLOSAO * ESCALA / 2)
        self.quadro = 0
        self.descartar = False

    def atualizar(self, dt):
        self.quadro += 12 * dt
        self.descartar = self.quadro >= QUADROS_EXPLOSAO

    def desenhar(self):
        if not self.descartar:
            recorte = Rectangle(int(self.quadro) * LARGURA_EXPLOSAO, 0, LARGURA_EXPLOSAO, ALTURA_EXPLOSAO)
            destino = Rectangle(self.posicao.x, self.posicao.y, LARGURA_EXPLOSAO * ESCALA, ALTURA_EXPLOSAO * ESCALA)
            draw_texture_pro(textura_explosao, recorte, destino, Vector2(0, 0), 0, WHITE)


def escrever_no_meio(texto, y, tamanho, cor):
    largura = measure_text_ex(fonte, texto, tamanho, 0).x
    draw_text_ex(fonte, texto, Vector2(LARGURA / 2 - largura / 2, y), tamanho, 0, cor)


def atirar(posicao):
    lasers.append(Laser(posicao))
    play_sound(som_laser)


def comecar():
    global nave, lasers, meteoros, explosoes, tempo, falta, perdeu
    nave = Nave()
    lasers = []
    meteoros = []
    explosoes = []
    tempo = 0
    falta = TEMPO_ENTRE_METEOROS
    perdeu = False


recorde = 0
comecar()

while not window_should_close():
    dt = get_frame_time()
    update_music_stream(musica)

    if perdeu:
        # A explosão da nave continua até o fim, mesmo com o jogo parado.
        for explosao in explosoes:
            explosao.atualizar(dt)
        explosoes = [explosao for explosao in explosoes if not explosao.descartar]
        if is_key_pressed(KEY_ENTER):
            comecar()
    else:
        tempo += dt
        falta -= dt
        if falta <= 0:
            meteoros.append(Meteoro())
            falta = TEMPO_ENTRE_METEOROS
        nave.atualizar(dt)
        for sprite in lasers + meteoros + explosoes:
            sprite.atualizar(dt)

        for laser in lasers:
            for meteoro in meteoros:
                if check_collision_circle_rec(meteoro.centro(), meteoro.raio, laser.caixa()):
                    laser.descartar = True
                    meteoro.descartar = True
                    explosoes.append(Explosao(meteoro.centro()))
                    play_sound(som_explosao)
        for meteoro in meteoros:
            if check_collision_circles(nave.centro(), nave.raio - 8, meteoro.centro(), meteoro.raio - 6):
                perdeu = True
                recorde = max(recorde, int(tempo))
                explosoes.append(Explosao(nave.centro()))
                play_sound(som_explosao)

        lasers = [laser for laser in lasers if not laser.descartar]
        meteoros = [meteoro for meteoro in meteoros if not meteoro.descartar]
        explosoes = [explosao for explosao in explosoes if not explosao.descartar]

    begin_drawing()
    clear_background(COR_DO_FUNDO)
    for estrela in estrelas:
        draw_texture_ex(textura_estrela, estrela[0], 0, estrela[1], WHITE)
    escrever_no_meio(str(int(tempo)), 30, 32, WHITE)
    if not perdeu:
        nave.desenhar()
    for sprite in lasers + meteoros + explosoes:
        sprite.desenhar()
    if perdeu:
        escrever_no_meio('FIM DE JOGO', 170, 32, ORANGE)
        escrever_no_meio(f'Recorde: {recorde} s', 230, 16, WHITE)
        escrever_no_meio('Enter: voar de novo', 270, 16, LIGHTGRAY)
    end_drawing()

unload_music_stream(musica)
close_audio_device()
close_window()
