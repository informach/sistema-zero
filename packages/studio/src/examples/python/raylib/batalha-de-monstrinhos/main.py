from pyray import *
from random import choice

LARGURA = 800
ALTURA = 450
ESCALA = 6
TEMPO_DO_TURNO = 1.2

init_window(LARGURA, ALTURA, 'Batalha de Monstrinhos')
init_audio_device()
set_target_fps(60)
# O ESC volta no menu, então ele não pode fechar o jogo.
set_exit_key(KEY_NULL)

# Os dados da batalha: mude os números para deixar um monstrinho mais forte.
MONSTROS = {
    'Faísca': {'elemento': 'raio', 'vida': 90, 'golpes': ['Choque', 'Arranhão', 'Cura']},
    'Bolha': {'elemento': 'água', 'vida': 110, 'golpes': ['Jato', 'Arranhão', 'Cura']},
    'Brasa': {'elemento': 'fogo', 'vida': 100, 'golpes': ['Chama', 'Arranhão', 'Cura']},
    'Folhinha': {'elemento': 'planta', 'vida': 120, 'golpes': ['Folhada', 'Arranhão', 'Cura']},
}
GOLPES = {
    'Choque': {'dano': 24, 'elemento': 'raio', 'cor': YELLOW, 'som': 'choque'},
    'Jato': {'dano': 22, 'elemento': 'água', 'cor': SKYBLUE, 'som': 'jato'},
    'Chama': {'dano': 24, 'elemento': 'fogo', 'cor': ORANGE, 'som': 'chama'},
    'Folhada': {'dano': 22, 'elemento': 'planta', 'cor': GREEN, 'som': 'folha'},
    'Arranhão': {'dano': 14, 'elemento': 'normal', 'cor': WHITE, 'som': 'arranhao'},
    'Cura': {'dano': -30, 'elemento': 'normal', 'cor': PINK, 'som': 'cura'},
}
# Quem leva vantagem: o primeiro machuca o segundo em dobro (e o segundo devolve só a metade).
VANTAGENS = [('água', 'fogo'), ('fogo', 'planta'), ('planta', 'água'), ('raio', 'água')]

texturas = {}
for nome in MONSTROS:
    texturas[nome] = load_texture(f'images/{nome.lower().replace("í", "i")}.png')
sons = {}
for nome in ['choque', 'jato', 'chama', 'folha', 'arranhao', 'cura']:
    sons[nome] = load_sound(f'sounds/{nome}.wav')
fonte = load_font_ex('fonts/pressstart2p.ttf', 16, None, 224)
musica = load_music_stream('music/batalha.ogg')
play_music_stream(musica)


def multiplicador(elemento_do_golpe, elemento_do_alvo):
    if (elemento_do_golpe, elemento_do_alvo) in VANTAGENS:
        return 2
    if (elemento_do_alvo, elemento_do_golpe) in VANTAGENS:
        return 0.5
    return 1


class Cronometro:
    """Chama uma função `duracao` segundos depois de ativar."""

    def __init__(self, duracao, funcao):
        self.duracao = duracao
        self.funcao = funcao
        self.inicio = 0
        self.ativo = False

    def ativar(self):
        self.ativo = True
        self.inicio = get_time()

    def atualizar(self):
        if self.ativo and get_time() - self.inicio >= self.duracao:
            self.ativo = False
            self.funcao()


class Monstrinho:
    def __init__(self, nome, vida, posicao, de_costas):
        self.nome = nome
        self.elemento = MONSTROS[nome]['elemento']
        self.vida_maxima = MONSTROS[nome]['vida']
        self.vida = vida
        self.golpes = MONSTROS[nome]['golpes']
        self.posicao = posicao
        self.de_costas = de_costas
        self.defendendo = False

    def desenhar(self):
        textura = texturas[self.nome]
        # O nosso monstrinho fica de costas: a largura negativa espelha o desenho.
        largura = -textura.width if self.de_costas else textura.width
        recorte = Rectangle(0, 0, largura, textura.height)
        destino = Rectangle(self.posicao.x, self.posicao.y, textura.width * ESCALA, textura.height * ESCALA)
        meio = Vector2(textura.width * ESCALA / 2, textura.height * ESCALA)
        draw_ellipse(int(self.posicao.x), int(self.posicao.y), 70, 16, (0, 0, 0, 50))
        draw_texture_pro(textura, recorte, destino, meio, 0, WHITE)

    def desenhar_vida(self, x, y):
        draw_rectangle_rounded(Rectangle(x, y, 250, 56), 0.3, 6, (255, 255, 255, 220))
        draw_text_ex(fonte, self.nome, Vector2(x + 12, y + 8), 16, 0, DARKGRAY)
        draw_rectangle(int(x + 12), int(y + 32), 226, 12, LIGHTGRAY)
        cor = GREEN if self.vida > self.vida_maxima / 3 else RED
        draw_rectangle(int(x + 12), int(y + 32), int(226 * self.vida / self.vida_maxima), 12, cor)


def golpear(atacante, alvo, nome_do_golpe):
    global mensagem, efeito, vitorias, estado
    golpe = GOLPES[nome_do_golpe]
    play_sound(sons[golpe['som']])
    if golpe['dano'] < 0:
        # Cura: o golpe vale para quem usou.
        atacante.vida = min(atacante.vida - golpe['dano'], atacante.vida_maxima)
        mensagem = f'{atacante.nome} usou {nome_do_golpe} e se curou!'
        efeito = [golpe['cor'], atacante.posicao, 0.6]
        return
    vezes = multiplicador(golpe['elemento'], alvo.elemento)
    dano = golpe['dano'] * vezes
    if alvo.defendendo:
        dano = dano / 2
    alvo.vida = max(alvo.vida - dano, 0)
    efeito = [golpe['cor'], alvo.posicao, 0.6]
    mensagem = f'{atacante.nome} usou {nome_do_golpe}!'
    if vezes > 1:
        mensagem += ' Foi muito forte!'
    elif vezes < 1:
        mensagem += ' Foi fraquinho.'
    if alvo.vida == 0:
        if alvo == inimigo:
            vitorias += 1
            mensagem = f'{alvo.nome} desmaiou! Vem outro...'
            trocar_inimigo()
        else:
            vidas_da_equipe[alvo.nome] = 0
            proximo = [nome for nome in equipe if vidas_da_equipe[nome] > 0]
            if proximo:
                entrar_na_batalha(proximo[0])
                mensagem = f'{alvo.nome} desmaiou! Vai, {proximo[0]}!'
            else:
                estado = 'derrota'


def trocar_inimigo():
    global inimigo
    nome = choice(list(MONSTROS))
    inimigo = Monstrinho(nome, MONSTROS[nome]['vida'], Vector2(590, 230), False)


def entrar_na_batalha(nome):
    global jogador
    if jogador:
        vidas_da_equipe[jogador.nome] = jogador.vida
    jogador = Monstrinho(nome, vidas_da_equipe[nome], Vector2(210, 380), True)


def vez_do_inimigo():
    golpear(inimigo, jogador, choice(inimigo.golpes))


def volta_o_menu():
    global menu, opcao
    jogador.defendendo = False
    menu = 'principal'
    opcao = 0


def passar_a_vez():
    global menu
    menu = 'esperando'
    ataque_do_inimigo.ativar()
    fim_do_turno.ativar()


def comecar():
    global equipe, vidas_da_equipe, jogador, menu, opcao, mensagem, efeito, vitorias, estado
    equipe = ['Faísca', 'Bolha', 'Folhinha']
    vidas_da_equipe = {}
    for nome in equipe:
        vidas_da_equipe[nome] = MONSTROS[nome]['vida']
    jogador = None
    entrar_na_batalha(equipe[0])
    trocar_inimigo()
    menu = 'principal'
    opcao = 0
    mensagem = 'Um monstrinho apareceu!'
    efeito = None
    vitorias = 0
    estado = 'batalha'


ataque_do_inimigo = Cronometro(TEMPO_DO_TURNO, vez_do_inimigo)
fim_do_turno = Cronometro(TEMPO_DO_TURNO * 2, volta_o_menu)
comecar()

while not window_should_close():
    dt = get_frame_time()
    update_music_stream(musica)
    ataque_do_inimigo.atualizar()
    fim_do_turno.atualizar()
    if efeito:
        efeito[2] -= dt
        if efeito[2] <= 0:
            efeito = None

    if estado != 'batalha':
        if is_key_pressed(KEY_ENTER):
            comecar()
    elif menu != 'esperando':
        if menu == 'principal':
            opcoes = ['Atacar', 'Trocar', 'Defender', 'Fugir']
        elif menu == 'golpes':
            opcoes = jogador.golpes
        else:
            opcoes = [nome for nome in equipe if nome != jogador.nome and vidas_da_equipe[nome] > 0]
        if is_key_pressed(KEY_DOWN):
            opcao = (opcao + 1) % len(opcoes)
        if is_key_pressed(KEY_UP):
            opcao = (opcao - 1) % len(opcoes)
        if is_key_pressed(KEY_ESCAPE):
            menu = 'principal'
            opcao = 0
        # No curso este pedaço era um match/case; aqui ele virou if/elif.
        elif is_key_pressed(KEY_ENTER) and opcoes:
            escolha = opcoes[opcao]
            if menu == 'golpes':
                golpear(jogador, inimigo, escolha)
                passar_a_vez()
            elif menu == 'trocar':
                entrar_na_batalha(escolha)
                mensagem = f'Vai, {escolha}!'
                passar_a_vez()
            elif escolha == 'Atacar':
                menu = 'golpes'
                opcao = 0
            elif escolha == 'Trocar':
                menu = 'trocar'
                opcao = 0
            elif escolha == 'Defender':
                jogador.defendendo = True
                mensagem = f'{jogador.nome} se protege.'
                passar_a_vez()
            elif escolha == 'Fugir':
                estado = 'fugiu'

    begin_drawing()
    draw_rectangle_gradient_v(0, 0, LARGURA, ALTURA, (150, 210, 255, 255), (210, 240, 200, 255))
    draw_ellipse(590, 240, 150, 34, (120, 180, 110, 255))
    draw_ellipse(210, 390, 170, 38, (120, 180, 110, 255))
    inimigo.desenhar()
    jogador.desenhar()
    if efeito:
        raio = int(70 * (1 - efeito[2] / 0.6)) + 10
        draw_circle_lines(int(efeito[1].x), int(efeito[1].y - 50), raio, efeito[0])
        draw_circle_lines(int(efeito[1].x), int(efeito[1].y - 50), raio * 0.6, efeito[0])
    inimigo.desenhar_vida(40, 30)
    jogador.desenhar_vida(300, 300)
    draw_text_ex(fonte, f'Vitórias: {vitorias}', Vector2(560, 20), 16, 0, DARKBLUE)

    draw_rectangle(0, ALTURA - 60, LARGURA, 60, (30, 30, 50, 230))
    draw_text_ex(fonte, mensagem, Vector2(16, ALTURA - 40), 16, 0, WHITE)
    if estado == 'batalha' and menu != 'esperando':
        draw_rectangle_rounded(Rectangle(570, 270, 210, 26 + 26 * len(opcoes)), 0.2, 6, (255, 255, 255, 235))
        for i, texto in enumerate(opcoes):
            cor = RED if i == opcao else DARKGRAY
            draw_text_ex(fonte, ('> ' if i == opcao else '  ') + texto, Vector2(584, 284 + 26 * i), 16, 0, cor)
    if estado != 'batalha':
        draw_rectangle(120, 120, 560, 150, (0, 0, 0, 200))
        titulo = 'Você fugiu!' if estado == 'fugiu' else 'Sua equipe desmaiou!'
        draw_text_ex(fonte, titulo, Vector2(160, 160), 24, 0, YELLOW)
        draw_text_ex(fonte, 'Enter: batalhar de novo', Vector2(160, 215), 16, 0, WHITE)
    end_drawing()

unload_music_stream(musica)
close_audio_device()
close_window()
