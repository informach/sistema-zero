"""Bolhas no Fundo do Mar: o submarino estoura bolhas antes que o tempo acabe."""

import turtle
import random
import math
import time
import sz_audio


LARGURA = 800
ALTURA = 500
INTERVALO = 16
QUADRO = 16
VELOCIDADE_SUB = 5
RAIO_SUB = 20
LIMITE_X = 370
LIMITE_CIMA = 180
LIMITE_BAIXO = -200
RAIO_MIN = 10
RAIO_MAX = 30
VELOCIDADE_MAX = 6
CHANCE_BOLHA = 8
MAX_BOLHAS = 24
TEMPO_INICIAL = 30
BONUS_PONTOS = 1000
BONUS_TEMPO = 30
COR_SUB = "#ffd23f"
COR_BOLHA = "#9be7ff"
COR_MAR = "#0b4f6c"
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}
teclas = {"esquerda": False, "direita": False, "cima": False, "baixo": False}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Bolha:
    """Cada bolha guarda só o modelo: onde está, o tamanho e a rapidez."""

    def __init__(self, y):
        self.raio = random.randint(RAIO_MIN, RAIO_MAX)
        self.velocidade = random.randint(1, VELOCIDADE_MAX)
        self.x = LARGURA / 2 + self.raio
        self.y = y

    def andar(self, quadros):
        self.x -= self.velocidade * quadros

    def saiu(self):
        return self.x < -LARGURA / 2 - self.raio

    def encosta(self, x, y, raio):
        # Dois círculos se tocam quando a distância dos centros é menor que a soma dos raios.
        dx = self.x - x
        dy = self.y - y
        soma = self.raio + raio
        return dx * dx + dy * dy < soma * soma

    def valor(self):
        # Bolha grande e rápida vale mais.
        return self.raio + self.velocidade


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
    retangulo(-LARGURA / 2, ALTURA / 2 - 45, LARGURA, 45, "#083a50")
    retangulo(-LARGURA / 2, -ALTURA / 2, LARGURA, 28, "#c9a66b")
    for x in range(-360, 400, 90):
        retangulo(x, -ALTURA / 2 + 28, 6, random.randint(20, 60), "#2f8f5b")


def carimbar(forma, x, y, largura, comprimento, cor):
    pincel.shape(forma)
    pincel.color(cor)
    pincel.shapesize(largura, comprimento)
    pincel.goto(x, y)
    pincel.stamp()


def desenhar_cena():
    pincel.clearstamps()
    for bolha in estado["bolhas"]:
        tamanho = bolha.raio / 10
        carimbar("circle", bolha.x, bolha.y, tamanho, tamanho, COR_BOLHA)
        brilho = bolha.raio * 0.4
        carimbar("circle", bolha.x - brilho, bolha.y + brilho, tamanho / 4, tamanho / 4, "#ffffff")
    x = estado["sub_x"]
    y = estado["sub_y"]
    carimbar("square", x - 4, y + 15, 0.6, 0.8, COR_SUB)
    carimbar("square", x - 25, y, 0.7, 0.3, "#5c4a12")
    carimbar("circle", x, y, 1.1, 2.3, COR_SUB)
    carimbar("circle", x + 13, y + 2, 0.35, 0.35, "#0b3954")


def escrever_no_centro(texto, y, tamanho):
    # Uma sombra escura embaixo deixa o texto legível por cima das bolhas.
    painel.goto(2, y - 2)
    painel.color("#04202c")
    painel.write(texto, align="center", font=("Arial", tamanho, "bold"))
    painel.goto(0, y)
    painel.color("#ffffff")
    painel.write(texto, align="center", font=("Arial", tamanho, "bold"))


def desenhar_painel():
    segundos = math.ceil(estado["tempo"] / 1000)
    pontos = estado["pontos"]
    recorde = estado["recorde"]
    placar = f"TEMPO {segundos}      PONTOS {pontos}      RECORDE {recorde}"
    mensagem = "Setas: mover   •   Espaço: pausa   •   R: reiniciar   •   Esc: sair"
    destaque = ""
    detalhe = ""
    if estado["pausado"]:
        destaque = "PAUSA"
        detalhe = "Espaço para continuar"
    if estado["fase"] == "fim":
        bonus = estado["bonus"]
        extra = bonus * BONUS_TEMPO
        destaque = "FIM DE JOGO!"
        detalhe = f"{pontos} pontos   •   bônus ganhos: {bonus} (+{extra} s)"
        mensagem = "R: jogar de novo   •   Esc: sair"
    texto = placar + mensagem + destaque + detalhe
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, ALTURA / 2 - 35)
    painel.color("#e0f7ff")
    painel.write(placar, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, -ALTURA / 2 + 6)
    painel.color("#3d2b14")
    painel.write(mensagem, align="center", font=("Arial", 12, "normal"))
    if destaque != "":
        escrever_no_centro(destaque, 20, 36)
        escrever_no_centro(detalhe, -25, 16)


def mover_submarino(quadros):
    passo = VELOCIDADE_SUB * quadros
    if teclas["esquerda"]:
        estado["sub_x"] -= passo
    if teclas["direita"]:
        estado["sub_x"] += passo
    if teclas["cima"]:
        estado["sub_y"] += passo
    if teclas["baixo"]:
        estado["sub_y"] -= passo
    # O submarino fica preso dentro da tela.
    estado["sub_x"] = max(-LIMITE_X, min(LIMITE_X, estado["sub_x"]))
    estado["sub_y"] = max(LIMITE_BAIXO, min(LIMITE_CIMA, estado["sub_y"]))


def estourar(bolha):
    estado["bolhas"].remove(bolha)
    estado["pontos"] += bolha.valor()
    sz_audio.play("estourar.wav", volume=0.4)
    if estado["pontos"] >= estado["proximo_bonus"]:
        estado["proximo_bonus"] += BONUS_PONTOS
        estado["tempo"] += BONUS_TEMPO * 1000
        estado["bonus"] += 1
        sz_audio.play("bonus.wav", volume=0.6)


def terminar():
    estado["fase"] = "fim"
    estado["tempo"] = 0
    estado["bolhas"] = []
    estado["recorde"] = max(estado["recorde"], estado["pontos"])
    sz_audio.play("fim.wav", volume=0.6)


def atualizar(tempo):
    if estado["fase"] != "jogando":
        return
    # Um quadro atrasado avança no máximo três quadros, nunca um salto enorme.
    tempo = min(tempo, 3 * QUADRO)
    quadros = tempo / QUADRO
    mover_submarino(quadros)
    if random.randint(1, CHANCE_BOLHA) == 1 and len(estado["bolhas"]) < MAX_BOLHAS:
        estado["bolhas"].append(Bolha(random.randint(LIMITE_BAIXO, LIMITE_CIMA)))
    for bolha in list(estado["bolhas"]):
        bolha.andar(quadros)
        if bolha.encosta(estado["sub_x"], estado["sub_y"], RAIO_SUB):
            estourar(bolha)
        elif bolha.saiu():
            estado["bolhas"].remove(bolha)
    estado["tempo"] -= tempo
    if estado["tempo"] <= 0:
        terminar()
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
    estado["tempo"] = TEMPO_INICIAL * 1000
    estado["proximo_bonus"] = BONUS_PONTOS
    estado["bonus"] = 0
    estado["bolhas"] = []
    estado["sub_x"] = -250
    estado["sub_y"] = 0
    estado["painel"] = ""
    for nome in teclas:
        teclas[nome] = False


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
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
    tela.title("Bolhas no Fundo do Mar • Sistema Zero")
    tela.bgcolor(COR_MAR)
    tela.tracer(0)
    for desenho in [cenario, pincel, painel]:
        desenho.penup()
        desenho.speed(0)
    desenhar_cenario()
    tela.onkeypress(lambda: segurar("esquerda", True), "Left")
    tela.onkeyrelease(lambda: segurar("esquerda", False), "Left")
    tela.onkeypress(lambda: segurar("direita", True), "Right")
    tela.onkeyrelease(lambda: segurar("direita", False), "Right")
    tela.onkeypress(lambda: segurar("cima", True), "Up")
    tela.onkeyrelease(lambda: segurar("cima", False), "Up")
    tela.onkeypress(lambda: segurar("baixo", True), "Down")
    tela.onkeyrelease(lambda: segurar("baixo", False), "Down")
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
