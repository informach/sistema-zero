"""Cobrinha educacional: toda a lógica fica visível em blocos, Ponte e Python."""

import turtle
import random
import time
import sz_audio


CELULA = 24
COLUNAS = 20
LINHAS = 20
INTERVALO = 16
PASSO_COBRINHA = 120
PASSO_LAGARTA = 180
ACELERACAO = 0.93
PASSO_MINIMO = 60
COR_CABECA = "#ffe14a"
COR_CORPO = "#4ade80"
COR_FRUTA = "#ff5c7a"
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
fruta = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Cobra:
    """O corpo é uma lista de casas (coluna, linha); a última é a cabeça."""

    def __init__(self, coluna, linha):
        self.corpo = [(coluna - 2, linha), (coluna - 1, linha), (coluna, linha)]
        self.direcao = (1, 0)
        self.pedido = (1, 0)
        self.crescer = 0

    def cabeca(self):
        return self.corpo[-1]

    def virar(self, dx, dy):
        # Voltar para dentro de si mesma não é uma curva.
        if (dx, dy) != (-self.direcao[0], -self.direcao[1]):
            self.pedido = (dx, dy)

    def proxima(self):
        self.direcao = self.pedido
        coluna, linha = self.cabeca()
        return (coluna + self.direcao[0], linha + self.direcao[1])

    def ocupa(self, casa):
        # A ponta da cauda sai do lugar neste passo, a menos que a cobra esteja crescendo.
        inicio = 0
        if self.crescer == 0:
            inicio = 1
        for indice in range(inicio, len(self.corpo)):
            if self.corpo[indice] == casa:
                return True
        return False

    def andar(self, nova):
        self.corpo.append(nova)
        if self.crescer > 0:
            self.crescer -= 1
            return None
        return self.corpo.pop(0)


def posicao(coluna, linha):
    return ((coluna - 9.5) * CELULA, (linha - 9.5) * CELULA - 30)


def dentro(casa):
    return 0 <= casa[0] < COLUNAS and 0 <= casa[1] < LINHAS


def sortear_fruta():
    livres = []
    for coluna in range(COLUNAS):
        for linha in range(LINHAS):
            if (coluna, linha) not in estado["cobra"].corpo:
                livres.append((coluna, linha))
    if len(livres) == 0:
        return None
    return random.choice(livres)


def desenhar_cenario():
    cenario.clear()
    cenario.color("#1f3b2c", "#14261d")
    x, y = posicao(-0.5, -0.5)
    cenario.goto(x, y)
    cenario.pendown()
    cenario.begin_fill()
    for lado in range(4):
        cenario.forward(COLUNAS * CELULA)
        cenario.left(90)
    cenario.end_fill()
    cenario.penup()


def carimbar(casa, cor):
    pincel.color(cor)
    pincel.goto(posicao(casa[0], casa[1]))
    return pincel.stamp()


def desenhar_cobra():
    pincel.clearstamps()
    estado["carimbos"] = []
    for casa in estado["cobra"].corpo:
        estado["carimbos"].append(carimbar(casa, COR_CORPO))
    pincel.clearstamp(estado["carimbos"].pop())
    estado["carimbos"].append(carimbar(estado["cobra"].cabeca(), COR_CABECA))


def mostrar_fruta():
    if estado["fruta"] is None:
        fruta.hideturtle()
        return
    fruta.goto(posicao(estado["fruta"][0], estado["fruta"][1]))
    fruta.showturtle()


def desenhar_painel():
    mensagem = "Setas: virar   •   1: Cobrinha   •   2: Lagarta   •   Espaço: pausa   •   R: reiniciar"
    if estado["fase"] == "fim":
        mensagem = estado["resultado"] + "   •   R ou 1/2 para jogar de novo"
    if estado["pausado"]:
        mensagem = "PAUSA   •   Espaço para continuar"
    nome = "COBRINHA"
    if estado["modo"] == 2:
        nome = "LAGARTA"
    placar = nome + "     PONTOS  " + str(estado["pontos"]) + "     RECORDE  " + str(estado["recorde"])
    texto = placar + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 255)
    painel.color("#ffe14a")
    painel.write(placar, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, -320)
    painel.color("#c9f7d8")
    painel.write(mensagem, align="center", font=("Arial", 12, "normal"))


def terminar(resultado):
    estado["fase"] = "fim"
    estado["resultado"] = resultado
    estado["recorde"] = max(estado["recorde"], estado["pontos"])
    pincel.clearstamp(estado["carimbos"].pop())
    estado["carimbos"].append(carimbar(estado["cobra"].cabeca(), "#ff4d4d"))


def dar_passo():
    cobra = estado["cobra"]
    nova = cobra.proxima()
    if not dentro(nova) or cobra.ocupa(nova):
        sz_audio.play("bater.wav", volume=0.7)
        terminar("FIM DE JOGO!")
        return
    cauda = cobra.andar(nova)
    # A cabeça antiga vira corpo; a nova ganha a cor da cabeça.
    pincel.clearstamp(estado["carimbos"].pop())
    estado["carimbos"].append(carimbar(cobra.corpo[-2], COR_CORPO))
    estado["carimbos"].append(carimbar(nova, COR_CABECA))
    if cauda is not None:
        pincel.clearstamp(estado["carimbos"].pop(0))
    if nova == estado["fruta"]:
        estado["pontos"] += 1
        cobra.crescer += 2
        sz_audio.play("comer.wav", volume=0.5)
        if estado["modo"] == 2:
            estado["passo"] = max(PASSO_MINIMO, estado["passo"] * ACELERACAO)
        estado["fruta"] = sortear_fruta()
        mostrar_fruta()
        if estado["fruta"] is None:
            terminar("VOCÊ ENCHEU O JARDIM!")


def atualizar(tempo):
    if estado["fase"] != "jogando":
        return
    # Um atraso longo não pode fazer a cobra atravessar várias casas de uma vez.
    estado["acumulado"] = min(estado["acumulado"] + tempo, estado["passo"] * 2)
    while estado["acumulado"] >= estado["passo"] and estado["fase"] == "jogando":
        estado["acumulado"] -= estado["passo"]
        dar_passo()


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


def virar(dx, dy):
    if estado["fase"] == "jogando" and not estado["pausado"]:
        estado["cobra"].virar(dx, dy)


def pausar():
    if estado["fase"] == "jogando":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo(modo):
    estado["modo"] = modo
    estado["fase"] = "jogando"
    estado["pausado"] = False
    estado["pontos"] = 0
    estado["acumulado"] = 0
    estado["painel"] = ""
    estado["passo"] = PASSO_COBRINHA
    if modo == 2:
        estado["passo"] = PASSO_LAGARTA
    estado["cobra"] = Cobra(5, 10)
    estado["fruta"] = sortear_fruta()


def reiniciar(modo=0):
    if not estado["aberto"]:
        return
    if modo == 0:
        modo = estado["modo"]
    sz_audio.stop()
    reiniciar_modelo(modo)
    desenhar_cobra()
    mostrar_fruta()
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    sz_audio.play("abertura.wav", volume=0.6)
    tela.update()
    # Não agende aqui: o reinício reutiliza a cadeia existente.


def fechar():
    if not estado["aberto"]:
        return
    estado["aberto"] = False
    sz_audio.stop()
    tela.bye()


def iniciar():
    tela.setup(640, 700)
    tela.title("Cobrinha • Sistema Zero")
    tela.bgcolor("#0b1610")
    tela.tracer(0)
    for desenho in [cenario, pincel, fruta, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("square")
    pincel.shapesize(CELULA / 20 * 0.9)
    fruta.shape("circle")
    fruta.color(COR_FRUTA)
    fruta.shapesize(CELULA / 20 * 0.7)
    desenhar_cenario()
    tela.onkeypress(lambda: virar(1, 0), "Right")
    tela.onkeypress(lambda: virar(-1, 0), "Left")
    tela.onkeypress(lambda: virar(0, 1), "Up")
    tela.onkeypress(lambda: virar(0, -1), "Down")
    tela.onkey(lambda: reiniciar(1), "1")
    tela.onkey(lambda: reiniciar(2), "2")
    tela.onkey(pausar, "space")
    tela.onkey(reiniciar, "r")
    tela.onkey(reiniciar, "R")
    tela.onkey(fechar, "Escape")
    tela.listen()
    estado["aberto"] = True
    estado["modo"] = 1
    reiniciar()
    agendar()
    if estado["aberto"]:
        tela.mainloop()


if __name__ == "__main__":
    iniciar()
