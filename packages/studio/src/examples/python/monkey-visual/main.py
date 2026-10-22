"""Macaco e Morcego: o macaco lança a banana para cima e tenta acertar quem voa."""

import turtle
import random
import math
import time
import sz_audio


LARGURA = 800
ALTURA = 600
INTERVALO = 16
QUADRO = 16
DURACAO = 30
VELOCIDADE_MACACO = 6
VELOCIDADE_BANANA = 9
LIMITE_X = 360
Y_MACACO = -205
Y_TOPO = 262
ALTURA_MIN = 20
ALTURA_MAX = 200
ALCANCE_PEGAR = 34
RAIO_BANANA = 12
QUEDA_ALVO = 7
VELOCIDADE_MORCEGO = 4
RAIO_MORCEGO = 16
PONTOS_MORCEGO = 10
VELOCIDADE_HIPOPOTAMO = 1.5
RAIO_HIPOPOTAMO = 30
PONTOS_HIPOPOTAMO = 5
ENTRADA_HIPOPOTAMO = 30
COR_MACACO = "#8b5a2b"
COR_ROSTO = "#f2c38b"
COR_BANANA = "#ffe135"
COR_MORCEGO = "#4c3a78"
COR_HIPOPOTAMO = "#b48ef0"
COR_CEU = "#9fd8cb"
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}
teclas = {"esquerda": False, "direita": False}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Alvo:
    """Voa de um lado para o outro numa altura; atingido, cai e renasce."""

    def __init__(self, velocidade, raio, pontos, cor, cor_asa, focinho=None):
        self.velocidade = velocidade
        self.raio = raio
        self.pontos = pontos
        self.cor = cor
        self.cor_asa = cor_asa
        self.focinho = focinho
        self.renascer()

    def renascer(self):
        self.direcao = random.choice([-1, 1])
        self.x = -LIMITE_X * self.direcao
        self.y = random.randint(ALTURA_MIN, ALTURA_MAX)
        self.caindo = False

    def andar(self, quadros):
        if self.caindo:
            self.y -= QUEDA_ALVO * quadros
            if self.y < -ALTURA / 2 - self.raio:
                self.renascer()
            return
        self.x += self.velocidade * self.direcao * quadros
        # Vai e volta: chegou na borda, dá meia-volta.
        if self.x > LIMITE_X:
            self.x = LIMITE_X
            self.direcao = -1
        elif self.x < -LIMITE_X:
            self.x = -LIMITE_X
            self.direcao = 1

    def acertado(self, x, y):
        dx = self.x - x
        dy = self.y - y
        soma = self.raio + RAIO_BANANA
        return not self.caindo and dx * dx + dy * dy < soma * soma


class Morcego(Alvo):
    """Pequeno e rápido: vale mais."""

    def __init__(self):
        super().__init__(VELOCIDADE_MORCEGO, RAIO_MORCEGO, PONTOS_MORCEGO, COR_MORCEGO, "#2a1f45")


class Hipopotamo(Alvo):
    """Um hipopótamo voador: grande e lento, mais fácil de acertar."""

    def __init__(self):
        super().__init__(VELOCIDADE_HIPOPOTAMO, RAIO_HIPOPOTAMO, PONTOS_HIPOPOTAMO, COR_HIPOPOTAMO, "#f9a8d4", "#d8b4fe")


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
    retangulo(-LARGURA / 2, -ALTURA / 2, LARGURA, 50, "#4f8f3a")
    retangulo(-LARGURA / 2, ALTURA / 2 - 32, LARGURA, 32, "#1f4e3d")
    cenario.shape("circle")
    for x in [-300, -120, 140, 310]:
        retangulo(x - 8, -ALTURA / 2 + 50, 16, 120, "#6b4423")
        cenario.color("#2f7a3b")
        cenario.shapesize(2.2, 3.4)
        cenario.goto(x, -ALTURA / 2 + 175)
        cenario.stamp()


def carimbar(x, y, largura, comprimento, cor):
    pincel.color(cor)
    pincel.shapesize(largura, comprimento)
    pincel.goto(x, y)
    pincel.stamp()


def desenhar_alvo(alvo):
    r = alvo.raio
    # As asas batem: a altura delas muda com o relógio.
    asa = r / 22 * (0.4 + abs(math.sin(estado["relogio"] / 90)))
    carimbar(alvo.x - r - 8, alvo.y + 4, asa, r / 10, alvo.cor_asa)
    carimbar(alvo.x + r + 8, alvo.y + 4, asa, r / 10, alvo.cor_asa)
    carimbar(alvo.x - r * 0.55, alvo.y + r * 0.8, r / 45, r / 45, alvo.cor)
    carimbar(alvo.x + r * 0.55, alvo.y + r * 0.8, r / 45, r / 45, alvo.cor)
    carimbar(alvo.x, alvo.y, r / 10, r / 10, alvo.cor)
    carimbar(alvo.x - r * 0.35, alvo.y + r * 0.2, r / 70, r / 70, "#ffffff")
    carimbar(alvo.x + r * 0.35, alvo.y + r * 0.2, r / 70, r / 70, "#ffffff")
    if alvo.focinho is not None:
        carimbar(alvo.x, alvo.y - r * 0.4, r / 25, r / 16, alvo.focinho)
        carimbar(alvo.x - r * 0.2, alvo.y - r * 0.4, r / 120, r / 120, "#6b21a8")
        carimbar(alvo.x + r * 0.2, alvo.y - r * 0.4, r / 120, r / 120, "#6b21a8")


def desenhar_banana(x, y):
    carimbar(x, y, 0.45, 1.3, COR_BANANA)
    carimbar(x + 12, y, 0.2, 0.2, "#5c3d10")


def desenhar_cena():
    pincel.clearstamps()
    for alvo in estado["alvos"]:
        desenhar_alvo(alvo)
    x = estado["macaco_x"]
    y = Y_MACACO
    carimbar(x, y - 30, 1.6, 1.8, COR_MACACO)
    carimbar(x - 21, y + 6, 0.8, 0.8, COR_MACACO)
    carimbar(x + 21, y + 6, 0.8, 0.8, COR_MACACO)
    carimbar(x - 21, y + 6, 0.45, 0.45, COR_ROSTO)
    carimbar(x + 21, y + 6, 0.45, 0.45, COR_ROSTO)
    carimbar(x, y, 2, 2, COR_MACACO)
    carimbar(x, y - 4, 1.3, 1.5, COR_ROSTO)
    carimbar(x - 6, y + 2, 0.3, 0.3, "#2b1a0c")
    carimbar(x + 6, y + 2, 0.3, 0.3, "#2b1a0c")
    if estado["banana"] == "mao":
        desenhar_banana(x + 24, y + 26)
    else:
        desenhar_banana(estado["banana_x"], estado["banana_y"])


def desenhar_painel():
    segundos = math.ceil(estado["tempo"] / 1000)
    pontos = estado["pontos"]
    recorde = estado["recorde"]
    placar = f"TEMPO {segundos}      PONTOS {pontos}      RECORDE {recorde}"
    mensagem = "← →: andar   •   Espaço: lançar a banana   •   P: pausa   •   R: reiniciar   •   Esc: sair"
    if estado["banana"] == "chao":
        mensagem = "A banana caiu num lado da tela: vá buscá-la com ← →"
    destaque = ""
    detalhe = ""
    if estado["pausado"]:
        destaque = "PAUSA"
        detalhe = "P para continuar"
    if estado["fase"] == "fim":
        destaque = "FIM DE JOGO!"
        detalhe = f"{pontos} pontos em {DURACAO} segundos"
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
        painel.color("#1f2f2a")
        painel.goto(0, 20)
        painel.write(destaque, align="center", font=("Arial", 36, "bold"))
        painel.goto(0, -20)
        painel.write(detalhe, align="center", font=("Arial", 16, "bold"))


def lancar():
    if estado["fase"] != "jogando" or estado["pausado"]:
        return
    if estado["banana"] == "mao":
        estado["banana"] = "voando"
        estado["banana_x"] = estado["macaco_x"]
        estado["banana_y"] = Y_MACACO + 30
        sz_audio.play("lancar.wav", volume=0.5)


def largar_banana():
    # A banana reaparece num dos lados, no chão; o macaco precisa ir buscá-la.
    estado["banana"] = "chao"
    estado["banana_x"] = random.choice([-LIMITE_X, LIMITE_X])
    estado["banana_y"] = Y_MACACO - 40


def mover_banana(quadros):
    if estado["banana"] == "voando":
        estado["banana_y"] += VELOCIDADE_BANANA * quadros
        for alvo in estado["alvos"]:
            if alvo.acertado(estado["banana_x"], estado["banana_y"]):
                alvo.caindo = True
                estado["pontos"] += alvo.pontos
                sz_audio.play("acertar.wav", volume=0.6)
                largar_banana()
                return
        if estado["banana_y"] > Y_TOPO:
            largar_banana()
    elif estado["banana"] == "chao":
        if abs(estado["macaco_x"] - estado["banana_x"]) < ALCANCE_PEGAR:
            estado["banana"] = "mao"
            sz_audio.play("pegar.wav", volume=0.5)


def mover_macaco(quadros):
    passo = VELOCIDADE_MACACO * quadros
    if teclas["esquerda"]:
        estado["macaco_x"] -= passo
    if teclas["direita"]:
        estado["macaco_x"] += passo
    estado["macaco_x"] = max(-LIMITE_X, min(LIMITE_X, estado["macaco_x"]))


def terminar():
    estado["fase"] = "fim"
    estado["tempo"] = 0
    estado["recorde"] = max(estado["recorde"], estado["pontos"])
    sz_audio.play("fim.wav", volume=0.6)


def atualizar(tempo):
    if estado["fase"] != "jogando":
        return
    # Um quadro atrasado avança no máximo três quadros, nunca um salto enorme.
    tempo = min(tempo, 3 * QUADRO)
    quadros = tempo / QUADRO
    estado["relogio"] += tempo
    mover_macaco(quadros)
    for alvo in estado["alvos"]:
        alvo.andar(quadros)
    mover_banana(quadros)
    if estado["pontos"] >= ENTRADA_HIPOPOTAMO and len(estado["alvos"]) == 1:
        estado["alvos"].append(Hipopotamo())
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
    estado["tempo"] = DURACAO * 1000
    estado["relogio"] = 0
    estado["macaco_x"] = 0
    estado["banana"] = "mao"
    estado["banana_x"] = 0
    estado["banana_y"] = 0
    estado["alvos"] = [Morcego()]
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
    tela.title("Macaco e Morcego • Sistema Zero")
    tela.bgcolor(COR_CEU)
    tela.tracer(0)
    for desenho in [cenario, pincel, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("circle")
    desenhar_cenario()
    tela.onkeypress(lambda: segurar("esquerda", True), "Left")
    tela.onkeyrelease(lambda: segurar("esquerda", False), "Left")
    tela.onkeypress(lambda: segurar("direita", True), "Right")
    tela.onkeyrelease(lambda: segurar("direita", False), "Right")
    tela.onkey(lancar, "space")
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
