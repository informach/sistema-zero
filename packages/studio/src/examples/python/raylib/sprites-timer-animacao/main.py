from pyray import *
from random import randint

LARGURA = 800
ALTURA = 450
CHAO = 320
ESCALA = 4

init_window(LARGURA, ALTURA, 'Sprites, Timer e Animação')
init_audio_device()
set_target_fps(60)

quadros_do_heroi = [load_texture(f'images/heroi{i}.png') for i in range(4)]
textura_maca = load_texture('images/maca.png')
som_pegar = load_sound('sounds/pegar.wav')
som_perder = load_sound('sounds/perder.wav')


class Cronometro:
    """Chama uma função depois de `duracao` segundos; se repetir, recomeça sozinho."""

    def __init__(self, duracao, repetir, funcao):
        self.duracao = duracao
        self.repetir = repetir
        self.funcao = funcao
        self.inicio = get_time()
        self.ativo = True

    def atualizar(self):
        if self.ativo and get_time() - self.inicio >= self.duracao:
            self.funcao()
            if self.repetir:
                self.inicio = get_time()
            else:
                self.ativo = False


class Sprite:
    def __init__(self, posicao, velocidade):
        self.posicao = posicao
        self.velocidade = velocidade
        self.direcao = Vector2(0, 0)

    def mover(self, dt):
        self.posicao.x += self.direcao.x * self.velocidade * dt
        self.posicao.y += self.direcao.y * self.velocidade * dt


class Heroi(Sprite):
    def __init__(self):
        super().__init__(Vector2(LARGURA / 2, CHAO), 320)
        self.quadro = 0
        self.olhando_esquerda = False

    def atualizar(self, dt):
        self.direcao.x = int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))
        self.mover(dt)
        self.posicao.x = max(0, min(self.posicao.x, LARGURA - 12 * ESCALA))
        if self.direcao.x != 0:
            # Andando: os quadros trocam 8 vezes por segundo.
            self.quadro = (self.quadro + 8 * dt) % len(quadros_do_heroi)
            self.olhando_esquerda = self.direcao.x < 0
        else:
            self.quadro = 0

    def caixa(self):
        return Rectangle(self.posicao.x, self.posicao.y, 12 * ESCALA, 16 * ESCALA)

    def desenhar(self):
        textura = quadros_do_heroi[int(self.quadro)]
        # Largura negativa no recorte espelha a imagem: o herói vira para a esquerda.
        largura = -textura.width if self.olhando_esquerda else textura.width
        origem = Rectangle(0, 0, largura, textura.height)
        destino = Rectangle(self.posicao.x, self.posicao.y, textura.width * ESCALA, textura.height * ESCALA)
        draw_texture_pro(textura, origem, destino, Vector2(0, 0), 0, WHITE)


class Maca(Sprite):
    def __init__(self):
        super().__init__(Vector2(randint(20, LARGURA - 60), -40), randint(140, 220))
        self.direcao = Vector2(0, 1)

    def caixa(self):
        return Rectangle(self.posicao.x, self.posicao.y, 10 * ESCALA, 10 * ESCALA)

    def desenhar(self):
        draw_texture_ex(textura_maca, self.posicao, 0, ESCALA, WHITE)


heroi = Heroi()
macas = []
pontos = 0
vidas = 3


def soltar_maca():
    macas.append(Maca())


cronometro = Cronometro(0.9, True, soltar_maca)

while not window_should_close():
    dt = get_frame_time()
    if vidas > 0:
        cronometro.atualizar()
        heroi.atualizar(dt)
        for maca in macas[:]:
            maca.mover(dt)
            if check_collision_recs(maca.caixa(), heroi.caixa()):
                macas.remove(maca)
                pontos += 1
                play_sound(som_pegar)
            elif maca.posicao.y > ALTURA:
                macas.remove(maca)
                vidas -= 1
                play_sound(som_perder)
    elif is_key_pressed(KEY_ENTER):
        macas.clear()
        pontos = 0
        vidas = 3

    begin_drawing()
    clear_background((135, 206, 235, 255))
    draw_rectangle(0, CHAO + 16 * ESCALA, LARGURA, ALTURA, (96, 160, 72, 255))
    for maca in macas:
        maca.desenhar()
    heroi.desenhar()
    draw_text(f'Maçãs: {pontos}', 16, 14, 26, DARKBLUE)
    draw_text(f'Vidas: {vidas}', LARGURA - 130, 14, 26, MAROON)
    if vidas == 0:
        draw_rectangle(170, 150, 460, 130, (0, 0, 0, 190))
        draw_text('Acabaram as vidas!', 230, 180, 34, WHITE)
        draw_text('Enter: jogar de novo', 280, 230, 22, YELLOW)
    end_drawing()

unload_sound(som_pegar)
unload_sound(som_perder)
close_audio_device()
close_window()
