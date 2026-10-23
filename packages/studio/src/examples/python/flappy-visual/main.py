"""Flappy educacional: gravidade, canos reutilizados e pontos visíveis em blocos, Ponte e Python."""

import turtle
import random
import time
import sz_audio


LARGURA = 480
ALTURA = 720
TETO = 300
CHAO = -300
INTERVALO = 16
PASSARO_X = -120
RAIO_PASSARO = 14
GRAVIDADE = 1500
IMPULSO = 430
QUEDA_MAXIMA = 650
VELOCIDADE_CANOS = 170
LARGURA_CANO = 70
VAO = 170
DISTANCIA_CANOS = 230
QUANTIDADE_CANOS = 3
COR_PASSARO = "#ffd23f"
COR_CANO = "#3fbf5f"
COR_BORDA_CANO = "#23843b"
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Passaro:
    """Só a altura muda: a gravidade puxa e cada batida de asa empurra para cima."""

    def __init__(self):
        self.x = PASSARO_X
        self.y = 0
        self.vy = 0

    def bater_asas(self):
        self.vy = IMPULSO

    def cair(self, segundos):
        self.vy = max(-QUEDA_MAXIMA, self.vy - GRAVIDADE * segundos)
        self.y += self.vy * segundos


class Cano:
    """Um par de canos com um vão; quando sai pela esquerda volta pela direita."""

    def __init__(self, x):
        self.x = x
        self.centro = 0
        self.passou = False
        self.sortear()

    def sortear(self):
        margem = VAO // 2 + 40
        self.centro = random.randint(CHAO + margem, TETO - margem)
        self.passou = False

    def andar(self, segundos):
        self.x -= VELOCIDADE_CANOS * segundos
        if self.x + LARGURA_CANO / 2 < -LARGURA / 2:
            self.x += QUANTIDADE_CANOS * DISTANCIA_CANOS
            self.sortear()

    def acerta(self, passaro):
        # Ponto do cano mais perto do centro do pássaro, em cima e embaixo do vão.
        perto_x = max(self.x - LARGURA_CANO / 2, min(passaro.x, self.x + LARGURA_CANO / 2))
        dx = passaro.x - perto_x
        acima = max(0, self.centro + VAO / 2 - passaro.y)
        abaixo = max(0, passaro.y - (self.centro - VAO / 2))
        if dx * dx + acima * acima < RAIO_PASSARO * RAIO_PASSARO:
            return True
        return dx * dx + abaixo * abaixo < RAIO_PASSARO * RAIO_PASSARO


def desenhar_cenario():
    cenario.clear()
    cenario.color("#c58b4b", "#8a5a2b")
    cenario.goto(-LARGURA / 2, CHAO)
    cenario.pendown()
    cenario.begin_fill()
    for lado in range(2):
        cenario.forward(LARGURA)
        cenario.right(90)
        cenario.forward(ALTURA / 2 + CHAO)
        cenario.right(90)
    cenario.end_fill()
    cenario.penup()
    cenario.color("#2b6cb0")
    cenario.pensize(3)
    cenario.goto(-LARGURA / 2, TETO)
    cenario.pendown()
    cenario.goto(LARGURA / 2, TETO)
    cenario.penup()


def carimbar_retangulo(x, y, largura, altura, cor):
    pincel.shape("square")
    pincel.color(cor)
    pincel.shapesize(altura / 20, largura / 20)
    pincel.goto(x, y)
    pincel.stamp()


def desenhar():
    pincel.clearstamps()
    for cano in estado["canos"]:
        topo_vao = cano.centro + VAO / 2
        base_vao = cano.centro - VAO / 2
        carimbar_retangulo(cano.x, (TETO + topo_vao) / 2, LARGURA_CANO, TETO - topo_vao, COR_CANO)
        carimbar_retangulo(cano.x, (CHAO + base_vao) / 2, LARGURA_CANO, base_vao - CHAO, COR_CANO)
        carimbar_retangulo(cano.x, topo_vao + 9, LARGURA_CANO + 10, 18, COR_BORDA_CANO)
        carimbar_retangulo(cano.x, base_vao - 9, LARGURA_CANO + 10, 18, COR_BORDA_CANO)
    passaro = estado["passaro"]
    pincel.shape("circle")
    pincel.color(estado["cor"])
    pincel.shapesize(RAIO_PASSARO / 10)
    pincel.goto(passaro.x, passaro.y)
    pincel.stamp()
    pincel.color("#ffffff")
    pincel.shapesize(0.35)
    pincel.goto(passaro.x + 6, passaro.y + 5)
    pincel.stamp()
    pincel.shape("triangle")
    pincel.color("#ff8c42")
    pincel.shapesize(0.4)
    pincel.goto(passaro.x + 16, passaro.y - 2)
    pincel.stamp()


def desenhar_painel():
    placar = "PONTOS  " + str(estado["pontos"]) + "     RECORDE  " + str(estado["recorde"])
    mensagem = "Espaço ou clique: voar   •   P: pausa   •   R: reiniciar"
    if estado["fase"] == "esperando":
        mensagem = "Espaço para voar!   •   clique também bate as asas"
    if estado["fase"] == "fim":
        mensagem = "BATEU!   •   Espaço ou R para tentar de novo"
    if estado["pausado"]:
        mensagem = "PAUSA   •   P para continuar"
    texto = placar + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 318)
    painel.color("#ffffff")
    painel.write(placar, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, -345)
    painel.color("#fff4d6")
    painel.write(mensagem, align="center", font=("Arial", 12, "bold"))


def terminar():
    estado["fase"] = "fim"
    estado["cor"] = "#ff6b6b"
    estado["recorde"] = max(estado["recorde"], estado["pontos"])
    sz_audio.play("batida.wav", volume=0.7)


def atualizar(tempo):
    if estado["fase"] != "jogando":
        return
    # Um quadro atrasado avança no máximo dois quadros.
    segundos = min(tempo, 2 * INTERVALO) / 1000
    passaro = estado["passaro"]
    passaro.cair(segundos)
    for cano in estado["canos"]:
        cano.andar(segundos)
        if not cano.passou and cano.x < passaro.x:
            cano.passou = True
            estado["pontos"] += 1
            sz_audio.play("ponto.wav", volume=0.5)
    if passaro.y - RAIO_PASSARO <= CHAO or passaro.y + RAIO_PASSARO >= TETO:
        terminar()
        return
    for cano in estado["canos"]:
        if cano.acerta(passaro):
            terminar()
            return


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
    desenhar()
    desenhar_painel()
    tela.update()
    agendar()


def voar():
    if estado["pausado"]:
        return
    if estado["fase"] == "fim":
        reiniciar()
        return
    if estado["fase"] == "esperando":
        estado["fase"] = "jogando"
        estado["ultimo_tempo"] = time.monotonic()
    estado["passaro"].bater_asas()
    sz_audio.play("asa.wav", volume=0.35)


def pausar():
    if estado["fase"] == "jogando":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["fase"] = "esperando"
    estado["pausado"] = False
    estado["pontos"] = 0
    estado["painel"] = ""
    estado["cor"] = COR_PASSARO
    estado["passaro"] = Passaro()
    estado["canos"] = []
    for indice in range(QUANTIDADE_CANOS):
        estado["canos"].append(Cano(LARGURA / 2 + 80 + indice * DISTANCIA_CANOS))


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    desenhar()
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
    tela.title("Flappy • Sistema Zero")
    tela.bgcolor("#7cc6f2")
    tela.tracer(0)
    for desenho in [cenario, pincel, painel]:
        desenho.penup()
        desenho.speed(0)
    desenhar_cenario()
    tela.onkey(voar, "space")
    tela.onkey(voar, "Up")
    tela.onscreenclick(lambda x, y: voar())
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
