from pyray import *
from math import sin

LARGURA = 800
ALTURA = 450
CASA = 32
VELOCIDADE = 170
VIDAS = 5
# Cada ponto do desenho vira ESCALA pontos na tela: um desenho do Pinta fica grande e nítido.
ESCALA = 2
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
for nome in ['arvore', 'pedra', 'mato', 'coracao', 'folha', 'espada']:
    imagens[nome] = load_texture(f'images/{nome}.png')
# O herói e a gosma são folhas de quadros, do jeito que o Pinta exporta: uma linha por animação.
# O herói tem uma linha por direção (baixo, lado, cima); a gosma, uma linha com dois quadros.
# O tamanho de um quadro sai da própria imagem: um desenho de qualquer tamanho entra no lugar.
textura_heroi = load_texture('images/heroi.png')
LINHA_DO_HEROI = {'baixo': 0, 'direita': 1, 'esquerda': 1, 'cima': 2}
LARGURA_HEROI = textura_heroi.width
ALTURA_HEROI = textura_heroi.height / 3
textura_gosma = load_texture('images/gosma.png')
LARGURA_GOSMA = textura_gosma.width / 2
ALTURA_GOSMA = textura_gosma.height
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
        # O tamanho na tela é o tamanho do desenho vezes a ESCALA.
        self.tamanho = Vector2(self.textura.width * ESCALA, self.textura.height * ESCALA)
        self.posicao = Vector2(x + CASA / 2 - self.tamanho.x / 2, y + CASA - self.tamanho.y)
        self.cortado = False

    def base(self):
        return self.posicao.y + self.tamanho.y

    def caixa(self):
        return Rectangle(self.posicao.x + 4, self.base() - 16, self.tamanho.x - 8, 16)

    def desenhar(self):
        if not self.cortado:
            draw_texture_ex(self.textura, self.posicao, 0, ESCALA, WHITE)


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
        balanco = int(sin(get_time() * 18) * 2) if self.andando else 0
        # A linha da folha é a da direção; para a esquerda, o mesmo desenho de lado espelhado.
        y = LINHA_DO_HEROI[self.olhando] * ALTURA_HEROI
        largura = -LARGURA_HEROI if self.olhando == 'esquerda' else LARGURA_HEROI
        recorte = Rectangle(0, y, largura, ALTURA_HEROI)
        # O desenho fica centrado nos pés e com a base na base deles.
        tela_x = self.pes.x + self.pes.width / 2 - LARGURA_HEROI * ESCALA / 2
        tela_y = self.base() - ALTURA_HEROI * ESCALA + balanco
        destino = Rectangle(tela_x, tela_y, LARGURA_HEROI * ESCALA, ALTURA_HEROI * ESCALA)
        draw_texture_pro(textura_heroi, recorte, destino, Vector2(0, 0), 0, WHITE)
        if self.atacando > 0:
            area = self.golpe()
            giro = {'cima': 0, 'direita': 90, 'baixo': 180, 'esquerda': 270}[self.olhando]
            espada = imagens['espada']
            largura_espada = espada.width * ESCALA
            altura_espada = espada.height * ESCALA
            destino = Rectangle(area.x + area.width / 2, area.y + area.height / 2, largura_espada, altura_espada)
            meio = Vector2(largura_espada / 2, altura_espada / 2)
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
        recorte = Rectangle(int(self.quadro) * LARGURA_GOSMA, 0, LARGURA_GOSMA, ALTURA_GOSMA)
        tela_x = self.pes.x + self.pes.width / 2 - LARGURA_GOSMA * ESCALA / 2
        tela_y = self.base() - ALTURA_GOSMA * ESCALA
        destino = Rectangle(tela_x, tela_y, LARGURA_GOSMA * ESCALA, ALTURA_GOSMA * ESCALA)
        draw_texture_pro(textura_gosma, recorte, destino, Vector2(0, 0), 0, WHITE)


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
        draw_texture_ex(imagens['folha'], folha[0], 0, ESCALA, WHITE)
    end_mode_2d()

    coracao = imagens['coracao']
    for i in range(VIDAS):
        cor = WHITE if i < heroi.vidas else (60, 60, 60, 200)
        # No placar, cada coração ocupa 28 x 28, qualquer que seja o tamanho do desenho.
        recorte = Rectangle(0, 0, coracao.width, coracao.height)
        draw_texture_pro(coracao, recorte, Rectangle(16 + i * 34, 14, 28, 28), Vector2(0, 0), 0, cor)
    draw_text_ex(fonte, f'Gosmas: {len(gosmas)}', Vector2(LARGURA - 190, 20), 16, 0, WHITE)
    if estado != 'jogando':
        draw_rectangle(140, 150, 520, 130, (0, 0, 0, 200))
        titulo = 'Você limpou a ilha!' if estado == 'venceu' else 'Acabaram os corações!'
        # Os textos ficam no meio da caixa, pela medida de cada um.
        largura_titulo = measure_text_ex(fonte, titulo, 24, 0).x
        draw_text_ex(fonte, titulo, Vector2(LARGURA / 2 - largura_titulo / 2, 185), 24, 0, YELLOW)
        largura_dica = measure_text_ex(fonte, 'Enter: jogar de novo', 16, 0).x
        draw_text_ex(fonte, 'Enter: jogar de novo', Vector2(LARGURA / 2 - largura_dica / 2, 235), 16, 0,
                     WHITE)
    end_drawing()

unload_music_stream(musica)
close_audio_device()
close_window()
