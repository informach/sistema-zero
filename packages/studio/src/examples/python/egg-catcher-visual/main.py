"""Pega-Ovos: a cesta apanha os ovos que caem, e cada ovo pego deixa o jogo mais rápido."""

import turtle
import random
import time
import sz_audio


LARGURA = 800
ALTURA = 600
INTERVALO = 16
QUADRO = 16
VELOCIDADE_CESTA = 8
LARGURA_CESTA = 90
LIMITE_X = 355
Y_CESTA = -222
Y_TOPO = 225
Y_CHAO = -262
VIDAS = 3
PONTOS_OVO = 10
PONTOS_DOURADO = 50
CHANCE_DOURADO = 6
RAPIDEZ_DOURADO = 1.5
QUEDA_INICIAL = 4000
QUEDA_MINIMA = 1200
ESPERA_INICIAL = 1500
ESPERA_MINIMA = 400
FATOR = 0.95
COR_CESTA = "#c26a2b"
COR_OVO = "#fff4dc"
COR_DOURADO = "#ffc83d"
COR_CEU = "#a8dcf0"
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}
teclas = {"esquerda": False, "direita": False}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
manchas = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Ovo:
    """Um ovo comum cai reto, com a rapidez do momento em que nasceu."""

    def __init__(self, x, velocidade):
        self.x = x
        self.y = Y_TOPO
        self.velocidade = velocidade
        self.pontos = PONTOS_OVO
        self.cor = COR_OVO

    def cair(self, quadros):
        self.y -= self.velocidade * quadros

    def som(self):
        return "pegar.wav"


class OvoDourado(Ovo):
    """Herda tudo do ovo comum, mas vale mais, brilha e cai mais depressa."""

    def __init__(self, x, velocidade):
        super().__init__(x, velocidade * RAPIDEZ_DOURADO)
        self.pontos = PONTOS_DOURADO
        self.cor = COR_DOURADO

    def som(self):
        return "dourado.wav"


def retangulo(x, y, largura, altura, cor):
    cenario.goto(x, y)
    cenario.color(cor)
    cenario.pendown()
    cenario.begin_fill()
    for lado in range(2):
        cenario.forward(largura)
        cenario.left(90)
        cenario.forward(altura)
        cenario.left(90)
    cenario.end_fill()
    cenario.penup()


def desenhar_cenario():
    cenario.clear()
    retangulo(-LARGURA / 2, Y_CHAO - 38, LARGURA, 38, "#5f9e47")
    retangulo(-LARGURA / 2, Y_TOPO + 3, LARGURA, 10, "#8b5a2b")
    retangulo(-LARGURA / 2, ALTURA / 2 - 32, LARGURA, 32, "#2b5d73")
    cenario.shape("circle")
    for x in range(-340, 400, 85):
        # Galinhas estilizadas no poleiro: corpo branco e crista vermelha.
        cenario.color("#ffffff")
        cenario.shapesize(1.1, 1.4)
        cenario.goto(x, Y_TOPO + 25)
        cenario.stamp()
        cenario.color("#e63946")
        cenario.shapesize(0.35, 0.5)
        cenario.goto(x + 6, Y_TOPO + 37)
        cenario.stamp()
        cenario.color("#f4a261")
        cenario.shapesize(0.25, 0.4)
        cenario.goto(x + 15, Y_TOPO + 26)
        cenario.stamp()


def carimbar(x, y, largura, comprimento, cor):
    pincel.color(cor)
    pincel.shapesize(largura, comprimento)
    pincel.goto(x, y)
    pincel.stamp()


def desenhar_cena():
    pincel.clearstamps()
    pincel.shape("circle")
    for ovo in estado["ovos"]:
        carimbar(ovo.x, ovo.y, 1.25, 0.95, ovo.cor)
    x = estado["cesta_x"]
    pincel.shape("square")
    carimbar(x, Y_CESTA - 6, 1.3, LARGURA_CESTA / 20, COR_CESTA)
    carimbar(x, Y_CESTA + 7, 0.4, LARGURA_CESTA / 20 + 0.3, "#7a3e14")


def desenhar_painel():
    pontos = estado["pontos"]
    recorde = estado["recorde"]
    coracoes = "♥ " * estado["vidas"]
    placar = f"PONTOS {pontos}      VIDAS {coracoes}     RECORDE {recorde}"
    mensagem = "← →: mover a cesta   •   Espaço: pausa   •   R: reiniciar   •   Esc: sair"
    destaque = ""
    detalhe = ""
    if estado["pausado"]:
        destaque = "PAUSA"
        detalhe = "Espaço para continuar"
    if estado["fase"] == "fim":
        destaque = "FIM DE JOGO!"
        pegos = estado["pegos"]
        detalhe = f"Você pegou {pegos} ovos e fez {pontos} pontos"
        mensagem = "R: jogar de novo   •   Esc: sair"
    texto = placar + mensagem + destaque + detalhe
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, ALTURA / 2 - 27)
    painel.color("#fff4dc")
    painel.write(placar, align="center", font=("Arial", 16, "bold"))
    painel.goto(0, -ALTURA / 2 + 8)
    painel.color("#ffffff")
    painel.write(mensagem, align="center", font=("Arial", 12, "normal"))
    if destaque != "":
        painel.color("#1d3557")
        painel.goto(0, 20)
        painel.write(destaque, align="center", font=("Arial", 36, "bold"))
        painel.goto(0, -20)
        painel.write(detalhe, align="center", font=("Arial", 16, "bold"))


def soltar_ovo():
    x = random.randint(-LIMITE_X, LIMITE_X)
    # A rapidez vem do tempo que um ovo leva do poleiro ao chão.
    velocidade = (Y_TOPO - Y_CHAO) / estado["queda"] * QUADRO
    if random.randint(1, CHANCE_DOURADO) == 1:
        estado["ovos"].append(OvoDourado(x, velocidade))
    else:
        estado["ovos"].append(Ovo(x, velocidade))
    estado["espera"] = estado["intervalo"]


def na_cesta(ovo):
    # Dentro da cesta na horizontal e perto da boca dela na vertical.
    return abs(ovo.x - estado["cesta_x"]) < LARGURA_CESTA / 2 and abs(ovo.y - Y_CESTA) < 18


def pegar(ovo):
    estado["ovos"].remove(ovo)
    estado["pontos"] += ovo.pontos
    estado["pegos"] += 1
    sz_audio.play(ovo.som(), volume=0.5)
    # Cada ovo pego deixa a queda e a espera 5% mais curtas, até um piso.
    estado["queda"] = max(QUEDA_MINIMA, estado["queda"] * FATOR)
    estado["intervalo"] = max(ESPERA_MINIMA, estado["intervalo"] * FATOR)


def quebrar(ovo):
    estado["ovos"].remove(ovo)
    estado["vidas"] -= 1
    manchas.goto(ovo.x, Y_CHAO - 2)
    manchas.stamp()
    sz_audio.play("quebrar.wav", volume=0.6)
    if estado["vidas"] <= 0:
        terminar()


def terminar():
    estado["fase"] = "fim"
    estado["ovos"] = []
    estado["recorde"] = max(estado["recorde"], estado["pontos"])
    sz_audio.play("fim.wav", volume=0.6)


def mover_cesta(quadros):
    passo = VELOCIDADE_CESTA * quadros
    if teclas["esquerda"]:
        estado["cesta_x"] -= passo
    if teclas["direita"]:
        estado["cesta_x"] += passo
    estado["cesta_x"] = max(-LIMITE_X, min(LIMITE_X, estado["cesta_x"]))


def atualizar(tempo):
    if estado["fase"] != "jogando":
        return
    # Um quadro atrasado avança no máximo três quadros, nunca um salto enorme.
    tempo = min(tempo, 3 * QUADRO)
    quadros = tempo / QUADRO
    mover_cesta(quadros)
    estado["espera"] -= tempo
    if estado["espera"] <= 0:
        soltar_ovo()
    for ovo in list(estado["ovos"]):
        ovo.cair(quadros)
        if na_cesta(ovo):
            pegar(ovo)
        elif ovo.y <= Y_CHAO + 12:
            # A ponta de baixo do ovo encostou na grama.
            quebrar(ovo)
            if estado["fase"] == "fim":
                break
    desenhar_cena()


def agendar():
    if estado["aberto"] and not estado["timer_pendente"]:
        estado["timer_pendente"] = True
        tela.ontimer(quadro, INTERVALO)


def quadro():
    estado["timer_pendente"] = False
    if not estado["aberto"]:
        return
    agora = time.monotonic()
    tempo = max(0, (agora - estado["ultimo_tempo"]) * 1000)
    estado["ultimo_tempo"] = agora
    if not estado["pausado"]:
        atualizar(tempo)
    desenhar_painel()
    tela.update()
    agendar()


def segurar(nome, apertada):
    teclas[nome] = apertada


def pausar():
    if estado["fase"] == "jogando":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["fase"] = "jogando"
    estado["pausado"] = False
    estado["pontos"] = 0
    estado["pegos"] = 0
    estado["vidas"] = VIDAS
    estado["queda"] = QUEDA_INICIAL
    estado["intervalo"] = ESPERA_INICIAL
    estado["espera"] = 600
    estado["ovos"] = []
    estado["cesta_x"] = 0
    estado["painel"] = ""
    for nome in teclas:
        teclas[nome] = False


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    manchas.clearstamps()
    desenhar_cena()
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    tela.update()
    # Não agende aqui: o reinício reutiliza a cadeia existente.


def fechar():
    if not estado["aberto"]:
        return
    estado["aberto"] = False
    sz_audio.stop()
    tela.bye()


def iniciar():
    tela.setup(LARGURA, ALTURA)
    tela.title("Pega-Ovos • Sistema Zero")
    tela.bgcolor(COR_CEU)
    tela.tracer(0)
    for desenho in [cenario, pincel, manchas, painel]:
        desenho.penup()
        desenho.speed(0)
    manchas.shape("circle")
    manchas.color("#ffffff", "#f4b400")
    manchas.shapesize(0.45, 1.5)
    desenhar_cenario()
    tela.onkeypress(lambda: segurar("esquerda", True), "Left")
    tela.onkeyrelease(lambda: segurar("esquerda", False), "Left")
    tela.onkeypress(lambda: segurar("direita", True), "Right")
    tela.onkeyrelease(lambda: segurar("direita", False), "Right")
    tela.onkey(pausar, "space")
    tela.onkey(reiniciar, "r")
    tela.onkey(reiniciar, "R")
    tela.onkey(fechar, "Escape")
    tela.listen()
    estado["aberto"] = True
    reiniciar()
    agendar()
    if estado["aberto"]:
        tela.mainloop()


if __name__ == "__main__":
    iniciar()
