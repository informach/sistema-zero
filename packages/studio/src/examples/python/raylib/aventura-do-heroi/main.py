from pyray import *
from math import sin

LARGURA = 800
ALTURA = 450
CASA = 32
VELOCIDADE = 170
VIDAS = 5
# ~ = água, # = árvore, R = pedra, g = mato, E = gosma, P = herói
MAPA = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~..#....gg......#.....gg....#~',
    '~.P.....gg......#............~',
    '~...##.........###...gg...E..~',
    '~...##..gg...........gg..##..~',
    '~..........R.....E.......##..~',
    '~..gg..#.....................~',
    '~..gg..#..E...........R......~',
    '~......#.......gg.......E....~',
    '~.R.........#..gg..........gg~',
    '~.....E.....#........##....gg~',
    '~..gg..............E.##......~',
    '~..gg....R....gg.............~',
    '~...........#.......gg...R...~',
    '~..E....gg..#.......gg.......~',
    '~...R...gg.......#.......E...~',
    '~..............###...........~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
]
MUNDO_LARGURA = len(MAPA[0]) * CASA
MUNDO_ALTURA = len(MAPA) * CASA

init_window(LARGURA, ALTURA, 'Aventura do Herói')
init_audio_device()
set_target_fps(60)

imagens = {}
for nome in ['heroi-baixo', 'heroi-lado', 'heroi-cima', 'gosma0', 'gosma1', 'arvore', 'pedra', 'mato', 'coracao', 'folha', 'espada']:
    imagens[nome] = load_texture(f'images/{nome}.png')
fonte = load_font_ex('fonts/pressstart2p.ttf', 16, None, 224)
som_espada = load_sound('sounds/espada.wav')
som_acerto = load_sound('sounds/acerto.wav')
som_dano = load_sound('sounds/dano.wav')
musica = load_music_stream('music/aventura.ogg')
set_music_volume(musica, 0.6)
play_music_stream(musica)


class Objeto:
    """Árvore, pedra ou mato: um desenho parado no mapa."""

    def __init__(self, nome, x, y):
        self.nome = nome
        self.textura = imagens[nome]
        self.posicao = Vector2(x + CASA / 2 - self.textura.width / 2, y + CASA - self.textura.height)
        self.cortado = False

    def base(self):
        return self.posicao.y + self.textura.height

    def caixa(self):
        return Rectangle(self.posicao.x + 4, self.base() - 16, self.textura.width - 8, 16)

    def desenhar(self):
        if not self.cortado:
            draw_texture_v(self.textura, self.posicao, WHITE)


def bater_nas_paredes(caixa, deslocamento, eixo):
    """Move a caixa num eixo; se entrar numa parede, volta até a borda dela."""
    if eixo == 'x':
        caixa.x += deslocamento
    else:
        caixa.y += deslocamento
    for parede in paredes:
        if check_collision_recs(caixa, parede):
            if eixo == 'x' and deslocamento > 0:
                caixa.x = parede.x - caixa.width
            elif eixo == 'x':
                caixa.x = parede.x + parede.width
            elif deslocamento > 0:
                caixa.y = parede.y - caixa.height
            else:
                caixa.y = parede.y + parede.height


class Heroi:
    def __init__(self, x, y):
        # A caixa é só os pés: assim a cabeça passa na frente da árvore.
        self.pes = Rectangle(x + 6, y + 18, 20, 12)
        self.olhando = 'baixo'
        self.andando = False
        self.vidas = VIDAS
        self.invencivel = 0
        self.atacando = 0
        self.golpes = 0

    def base(self):
        return self.pes.y + self.pes.height

    def caixa(self):
        return self.pes

    def atualizar(self, dt):
        dx = int(is_key_down(KEY_RIGHT)) - int(is_key_down(KEY_LEFT))
        dy = int(is_key_down(KEY_DOWN)) - int(is_key_down(KEY_UP))
        self.andando = dx != 0 or dy != 0
        if dx > 0:
            self.olhando = 'direita'
        elif dx < 0:
            self.olhando = 'esquerda'
        elif dy > 0:
            self.olhando = 'baixo'
        elif dy < 0:
            self.olhando = 'cima'
        direcao = vector2_normalize(Vector2(dx, dy))
        if self.atacando <= 0:
            bater_nas_paredes(self.pes, direcao.x * VELOCIDADE * dt, 'x')
            bater_nas_paredes(self.pes, direcao.y * VELOCIDADE * dt, 'y')
        if is_key_pressed(KEY_SPACE) and self.atacando <= 0:
            self.atacando = 0.3
            self.golpes += 1
            play_sound(som_espada)
        self.atacando -= dt
        self.invencivel -= dt

    def golpe(self):
        """O lugar onde a espada acerta, na frente de onde o herói está olhando."""
        x, y = self.pes.x, self.pes.y
        if self.olhando == 'direita':
            return Rectangle(x + 20, y - 18, 30, 30)
        if self.olhando == 'esquerda':
            return Rectangle(x - 30, y - 18, 30, 30)
        if self.olhando == 'cima':
            return Rectangle(x - 5, y - 46, 30, 30)
        return Rectangle(x - 5, y + 12, 30, 30)

    def desenhar(self):
        if self.invencivel > 0 and int(self.invencivel * 10) % 2 == 0:
            return
        nome = 'heroi-lado' if self.olhando in ('direita', 'esquerda') else f'heroi-{self.olhando}'
        textura = imagens[nome]
        balanco = int(sin(get_time() * 18) * 2) if self.andando else 0
        largura = -textura.width if self.olhando == 'esquerda' else textura.width
        posicao = Vector2(self.pes.x - 6, self.pes.y - 18 + balanco)
        draw_texture_rec(textura, Rectangle(0, 0, largura, textura.height), posicao, WHITE)
        if self.atacando > 0:
            area = self.golpe()
            giro = {'cima': 0, 'direita': 90, 'baixo': 180, 'esquerda': 270}[self.olhando]
            espada = imagens['espada']
            destino = Rectangle(area.x + area.width / 2, area.y + area.height / 2, espada.width, espada.height)
            meio = Vector2(espada.width / 2, espada.height / 2)
            draw_texture_pro(espada, Rectangle(0, 0, espada.width, espada.height), destino, meio, giro, WHITE)


class Gosma:
    def __init__(self, x, y):
        self.pes = Rectangle(x + 6, y + 14, 22, 14)
        self.vida = 3
        self.quadro = 0
        self.empurrao = Vector2(0, 0)
        self.ultimo_golpe = 0

    def base(self):
        return self.pes.y + self.pes.height

    def caixa(self):
        return self.pes

    def atualizar(self, dt):
        self.quadro = (self.quadro + 4 * dt) % 2
        centro = Vector2(self.pes.x + 11, self.pes.y + 7)
        alvo = Vector2(heroi.pes.x + 10, heroi.pes.y + 6)
        caminho = vector2_subtract(alvo, centro)
        # Persegue o herói quando ele chega perto.
        if vector2_length(caminho) < 200:
            direcao = vector2_normalize(caminho)
        else:
            direcao = Vector2(0, 0)
        movimento = vector2_add(vector2_scale(direcao, 70 * dt), vector2_scale(self.empurrao, dt))
        self.empurrao = vector2_scale(self.empurrao, 0.88)
        bater_nas_paredes(self.pes, movimento.x, 'x')
        bater_nas_paredes(self.pes, movimento.y, 'y')

    def desenhar(self):
        textura = imagens[f'gosma{int(self.quadro)}']
        draw_texture(textura, int(self.pes.x - 5), int(self.pes.y - 14), WHITE)


def soltar_folhas(x, y):
    for i in range(6):
        velocidade = Vector2(sin(i * 1.7) * 90, -60 - i * 15)
        folhas.append([Vector2(x, y), velocidade, 0.7])


def comecar():
    global paredes, objetos, gosmas, heroi, folhas, estado
    paredes = []
    objetos = []
    gosmas = []
    folhas = []
    for linha, texto in enumerate(MAPA):
        for coluna, letra in enumerate(texto):
            x = coluna * CASA
            y = linha * CASA
            if letra == '~':
                paredes.append(Rectangle(x, y, CASA, CASA))
            elif letra == '#':
                objetos.append(Objeto('arvore', x, y))
            elif letra == 'R':
                objetos.append(Objeto('pedra', x, y))
            elif letra == 'g':
                objetos.append(Objeto('mato', x, y))
            elif letra == 'E':
                gosmas.append(Gosma(x, y))
            elif letra == 'P':
                heroi = Heroi(x, y)
    for objeto in objetos:
        if objeto.nome != 'mato':
            paredes.append(objeto.caixa())
    estado = 'jogando'


comecar()
camera = Camera2D()
camera.offset = Vector2(LARGURA / 2, ALTURA / 2)
camera.zoom = 1

while not window_should_close():
    dt = get_frame_time()
    update_music_stream(musica)

    if estado == 'jogando':
        heroi.atualizar(dt)
        for gosma in gosmas:
            gosma.atualizar(dt)
        if heroi.atacando > 0:
            golpe = heroi.golpe()
            for gosma in gosmas[:]:
                # Cada balançada da espada acerta a gosma uma vez só.
                if gosma.ultimo_golpe != heroi.golpes and check_collision_recs(golpe, gosma.caixa()):
                    gosma.ultimo_golpe = heroi.golpes
                    gosma.vida -= 1
                    play_sound(som_acerto)
                    afastar = vector2_subtract(Vector2(gosma.pes.x, gosma.pes.y), Vector2(heroi.pes.x, heroi.pes.y))
                    gosma.empurrao = vector2_scale(vector2_normalize(afastar), 400)
                    if gosma.vida <= 0:
                        soltar_folhas(gosma.pes.x + 10, gosma.pes.y)
                        gosmas.remove(gosma)
            for objeto in objetos:
                if objeto.nome == 'mato' and not objeto.cortado and check_collision_recs(golpe, objeto.caixa()):
                    objeto.cortado = True
                    soltar_folhas(objeto.posicao.x + 16, objeto.posicao.y + 16)
        for gosma in gosmas:
            if heroi.invencivel <= 0 and check_collision_recs(gosma.caixa(), heroi.caixa()):
                heroi.vidas -= 1
                heroi.invencivel = 1.2
                play_sound(som_dano)
        if heroi.vidas <= 0:
            estado = 'perdeu'
        elif len(gosmas) == 0:
            estado = 'venceu'
    elif is_key_pressed(KEY_ENTER):
        comecar()

    for folha in folhas[:]:
        folha[1].y += 300 * dt
        folha[0] = vector2_add(folha[0], vector2_scale(folha[1], dt))
        folha[2] -= dt
        if folha[2] <= 0:
            folhas.remove(folha)

    # A câmera segue o herói, mas não mostra o que fica fora do mundo.
    alvo_x = max(LARGURA / 2, min(heroi.pes.x, MUNDO_LARGURA - LARGURA / 2))
    alvo_y = max(ALTURA / 2, min(heroi.pes.y, MUNDO_ALTURA - ALTURA / 2))
    camera.target = Vector2(alvo_x, alvo_y)

    begin_drawing()
    clear_background((113, 221, 238, 255))
    begin_mode_2d(camera)
    for linha, texto in enumerate(MAPA):
        for coluna, letra in enumerate(texto):
            if letra != '~':
                cor = (120, 190, 90, 255) if (linha + coluna) % 2 == 0 else (110, 182, 84, 255)
                draw_rectangle(coluna * CASA, linha * CASA, CASA, CASA, cor)
    # Quem está mais embaixo na tela é desenhado por último, na frente dos outros.
    for coisa in sorted(objetos + gosmas + [heroi], key=lambda c: c.base()):
        coisa.desenhar()
    for folha in folhas:
        draw_texture_v(imagens['folha'], folha[0], WHITE)
    end_mode_2d()

    for i in range(VIDAS):
        cor = WHITE if i < heroi.vidas else (60, 60, 60, 200)
        draw_texture_ex(imagens['coracao'], Vector2(16 + i * 34, 14), 0, 2, cor)
    draw_text_ex(fonte, f'Gosmas: {len(gosmas)}', Vector2(LARGURA - 190, 20), 16, 0, WHITE)
    if estado != 'jogando':
        draw_rectangle(140, 150, 520, 130, (0, 0, 0, 200))
        titulo = 'Você limpou a ilha!' if estado == 'venceu' else 'Acabaram os corações!'
        draw_text_ex(fonte, titulo, Vector2(170, 185), 24, 0, YELLOW)
        draw_text_ex(fonte, 'Enter: jogar de novo', Vector2(245, 235), 16, 0, WHITE)
    end_drawing()

unload_music_stream(musica)
close_audio_device()
close_window()
