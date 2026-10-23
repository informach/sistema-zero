"""Canhão: mire, escolha a força e derrube os alvos antes que cheguem ao seu lado."""

import turtle
import random
import math
import time
import sz_audio


LARGURA = 800
ALTURA = 600
INTERVALO = 16
QUADRO = 16
CANHAO_X = -350
CANHAO_Y = -245
COMPRIMENTO_CANO = 40
ANGULO_INICIAL = 45
FORCA_INICIAL = 13
PASSO_ANGULO = 3
ANGULO_MIN = 5
ANGULO_MAX = 85
FORCA_MIN = 6
FORCA_MAX = 20
DIVISOR_CLIQUE = 25
GRAVIDADE = 0.35
RAIO_ACERTO = 22
VELOCIDADE_ALVO = 1
ESPERA_ALVOS = 2200
ALVO_Y_MIN = -150
ALVO_Y_MAX = 220
COR_MIRA = "#e11d48"
COR_ALVO = "#f97316"
COR_BALA = "#1f2937"
COR_CEU = "#bfe3ff"
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
mira = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Projetil:
    """A bala sai da boca do cano e a gravidade puxa a velocidade vertical para baixo."""

    def __init__(self, angulo, forca):
        radianos = math.radians(angulo)
        self.x = CANHAO_X + math.cos(radianos) * COMPRIMENTO_CANO
        self.y = CANHAO_Y + math.sin(radianos) * COMPRIMENTO_CANO
        self.vx = math.cos(radianos) * forca
        self.vy = math.sin(radianos) * forca

    def andar(self, quadros):
        self.vy -= GRAVIDADE * quadros
        self.x += self.vx * quadros
        self.y += self.vy * quadros

    def fora(self):
        return self.x > LARGURA / 2 + 20 or self.y < -ALTURA / 2 - 20


class Alvo:
    """Cada alvo entra pela direita e anda para a esquerda numa altura."""

    def __init__(self, y):
        self.x = LARGURA / 2 + 20
        self.y = y

    def andar(self, quadros):
        self.x -= VELOCIDADE_ALVO * quadros

    def perto(self, x, y):
        dx = self.x - x
        dy = self.y - y
        return dx * dx + dy * dy < RAIO_ACERTO * RAIO_ACERTO

    def chegou(self):
        return self.x < -LARGURA / 2 + 20


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
    retangulo(-LARGURA / 2, -ALTURA / 2, LARGURA, 38, "#6aa84f")
    retangulo(-LARGURA / 2, ALTURA / 2 - 32, LARGURA, 32, "#1e3a5f")
    cenario.shape("circle")
    cenario.color("#ffffff")
    for x, y in [(-200, 170), (60, 210), (250, 120), (-40, 60)]:
        cenario.shapesize(1.6, 4)
        cenario.goto(x, y)
        cenario.stamp()
    # A base do canhão: uma roda escura sobre um calço.
    cenario.color("#6b4423")
    cenario.shape("square")
    cenario.shapesize(0.8, 2.6)
    cenario.goto(CANHAO_X, CANHAO_Y - 8)
    cenario.stamp()


def ponta(distancia):
    radianos = math.radians(estado["angulo"])
    x = CANHAO_X + math.cos(radianos) * distancia
    y = CANHAO_Y + math.sin(radianos) * distancia
    return (x, y)


def desenhar_mira():
    mira.clear()
    mira.goto(CANHAO_X, CANHAO_Y)
    mira.pendown()
    mira.pensize(14)
    mira.color("#374151")
    mira.goto(ponta(COMPRIMENTO_CANO))
    mira.penup()
    mira.goto(CANHAO_X, CANHAO_Y)
    mira.dot(30, "#111827")
    # A distância da mira até o canhão mostra a força.
    alcance = COMPRIMENTO_CANO + estado["forca"] * 4
    for passo in range(1, 4):
        mira.goto(ponta(COMPRIMENTO_CANO + (alcance - COMPRIMENTO_CANO) * passo / 4))
        mira.dot(6, "#fda4af")
    mira.goto(ponta(alcance))
    mira.dot(16, COR_MIRA)


def desenhar_cena():
    pincel.clearstamps()
    for alvo in estado["alvos"]:
        for tamanho, cor in [(1.6, COR_ALVO), (1.05, "#ffffff"), (0.5, COR_ALVO)]:
            pincel.color(cor)
            pincel.shapesize(tamanho)
            pincel.goto(alvo.x, alvo.y)
            pincel.stamp()
    bala = estado["bala"]
    if bala is not None:
        pincel.color(COR_BALA)
        pincel.shapesize(0.7)
        pincel.goto(bala.x, bala.y)
        pincel.stamp()


def desenhar_painel():
    pontos = estado["pontos"]
    recorde = estado["recorde"]
    angulo = estado["angulo"]
    forca = estado["forca"]
    placar = f"PONTOS {pontos}     RECORDE {recorde}     ÂNGULO {angulo}°     FORÇA {forca}"
    mensagem = "↑ ↓: ângulo   •   ← →: força   •   Espaço ou clique: atirar   •   P: pausa   •   R: reiniciar   •   Esc: sair"
    destaque = ""
    detalhe = ""
    if estado["pausado"]:
        destaque = "PAUSA"
        detalhe = "P para continuar"
    if estado["fase"] == "fim":
        destaque = "FIM DE JOGO!"
        detalhe = f"Um alvo chegou ao seu lado. Você derrubou {pontos}."
        mensagem = "R: jogar de novo   •   Esc: sair"
    texto = placar + mensagem + destaque + detalhe
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, ALTURA / 2 - 27)
    painel.color("#e0f2fe")
    painel.write(placar, align="center", font=("Arial", 16, "bold"))
    painel.goto(0, -ALTURA / 2 + 8)
    painel.color("#ffffff")
    painel.write(mensagem, align="center", font=("Arial", 11, "normal"))
    if destaque != "":
        painel.color("#1e3a5f")
        painel.goto(0, 20)
        painel.write(destaque, align="center", font=("Arial", 36, "bold"))
        painel.goto(0, -20)
        painel.write(detalhe, align="center", font=("Arial", 16, "bold"))


def jogando():
    return estado["fase"] == "jogando" and not estado["pausado"]


def mirar(angulo, forca):
    if not jogando():
        return
    estado["angulo"] = max(ANGULO_MIN, min(ANGULO_MAX, estado["angulo"] + angulo))
    estado["forca"] = max(FORCA_MIN, min(FORCA_MAX, estado["forca"] + forca))
    desenhar_mira()


def atirar():
    # Um tiro por vez: enquanto a bala voa, o canhão espera.
    if not jogando() or estado["bala"] is not None:
        return
    estado["bala"] = Projetil(estado["angulo"], estado["forca"])
    sz_audio.play("tiro.wav", volume=0.5)


def clicar(x, y):
    if not jogando():
        return
    dx = max(1, x - CANHAO_X)
    dy = y - CANHAO_Y
    angulo = round(math.degrees(math.atan2(dy, dx)))
    forca = round(math.sqrt(dx * dx + dy * dy) / DIVISOR_CLIQUE)
    estado["angulo"] = max(ANGULO_MIN, min(ANGULO_MAX, angulo))
    estado["forca"] = max(FORCA_MIN, min(FORCA_MAX, forca))
    desenhar_mira()
    atirar()


def terminar():
    estado["fase"] = "fim"
    estado["bala"] = None
    estado["recorde"] = max(estado["recorde"], estado["pontos"])
    sz_audio.play("fim.wav", volume=0.6)


def atualizar(tempo):
    if estado["fase"] != "jogando":
        return
    # Um quadro atrasado avança no máximo três quadros, nunca um salto enorme.
    tempo = min(tempo, 3 * QUADRO)
    quadros = tempo / QUADRO
    estado["espera"] -= tempo
    if estado["espera"] <= 0:
        estado["alvos"].append(Alvo(random.randint(ALVO_Y_MIN, ALVO_Y_MAX)))
        estado["espera"] = ESPERA_ALVOS
    bala = estado["bala"]
    if bala is not None:
        bala.andar(quadros)
        for alvo in list(estado["alvos"]):
            if alvo.perto(bala.x, bala.y):
                estado["alvos"].remove(alvo)
                estado["pontos"] += 1
                sz_audio.play("acerto.wav", volume=0.6)
        if bala.fora():
            estado["bala"] = None
    for alvo in estado["alvos"]:
        alvo.andar(quadros)
        if alvo.chegou():
            terminar()
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


def pausar():
    if estado["fase"] == "jogando":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["fase"] = "jogando"
    estado["pausado"] = False
    estado["pontos"] = 0
    estado["angulo"] = ANGULO_INICIAL
    estado["forca"] = FORCA_INICIAL
    estado["espera"] = 1000
    estado["alvos"] = []
    estado["bala"] = None
    estado["painel"] = ""


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    desenhar_mira()
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
    tela.title("Canhão • Sistema Zero")
    tela.bgcolor(COR_CEU)
    tela.tracer(0)
    for desenho in [cenario, pincel, mira, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("circle")
    desenhar_cenario()
    tela.onkeypress(lambda: mirar(PASSO_ANGULO, 0), "Up")
    tela.onkeypress(lambda: mirar(-PASSO_ANGULO, 0), "Down")
    tela.onkeypress(lambda: mirar(0, 1), "Right")
    tela.onkeypress(lambda: mirar(0, -1), "Left")
    tela.onkey(atirar, "space")
    tela.onscreenclick(clicar)
    tela.onkey(pausar, "p")
    tela.onkey(pausar, "P")
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
