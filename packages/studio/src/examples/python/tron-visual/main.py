"""Tron educacional: motos, rastros, rodadas e placar visíveis em blocos, Ponte e Python."""

import turtle
import math
import time
import sz_audio


CELULA = 16
COLUNAS = 44
LINHAS = 30
INTERVALO = 16
PASSO = 90
CONTAGEM = 1500
PAUSA_RODADA = 1800
VITORIAS_PARA_VENCER = 3
COR_RASTRO_VERMELHA = "#ff4d4d"
COR_CABECA_VERMELHA = "#ffb4a8"
COR_RASTRO_AZUL = "#3b82f6"
COR_CABECA_AZUL = "#b8ecff"
COR_BATIDA = "#fff3a3"
estado = {"aberto": False, "timer_pendente": False, "teclas": set()}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Moto:
    """Uma moto anda uma casa por passo; o rastro fica no conjunto do jogo."""

    def __init__(self, nome, coluna, linha, direcao, cor_rastro, cor_cabeca):
        self.nome = nome
        self.coluna = coluna
        self.linha = linha
        self.direcao = direcao
        self.curva = 0
        self.cor_rastro = cor_rastro
        self.cor_cabeca = cor_cabeca
        self.carimbo = None

    def casa(self):
        return (self.coluna, self.linha)

    def pedir_curva(self, sentido):
        # 1 vira para a esquerda da moto e -1 para a direita; vale no próximo passo.
        self.curva = sentido

    def proxima(self):
        dx, dy = self.direcao
        if self.curva == 1:
            self.direcao = (-dy, dx)
        elif self.curva == -1:
            self.direcao = (dy, -dx)
        self.curva = 0
        return (self.coluna + self.direcao[0], self.linha + self.direcao[1])

    def andar(self, casa):
        self.coluna, self.linha = casa


def posicao(coluna, linha):
    return ((coluna - (COLUNAS - 1) / 2) * CELULA, (linha - (LINHAS - 1) / 2) * CELULA - 20)


def dentro(casa):
    return 0 <= casa[0] < COLUNAS and 0 <= casa[1] < LINHAS


def desenhar_cenario():
    cenario.clear()
    cenario.color("#2b3a67", "#0b1026")
    x, y = posicao(-0.5, -0.5)
    cenario.goto(x, y)
    cenario.pendown()
    cenario.pensize(3)
    cenario.begin_fill()
    for lado in range(2):
        cenario.forward(COLUNAS * CELULA)
        cenario.left(90)
        cenario.forward(LINHAS * CELULA)
        cenario.left(90)
    cenario.end_fill()
    cenario.penup()


def carimbar(casa, cor):
    pincel.color(cor)
    pincel.goto(posicao(casa[0], casa[1]))
    return pincel.stamp()


def pintar_cabeca(moto, cor):
    if moto.carimbo is not None:
        pincel.clearstamp(moto.carimbo)
    moto.carimbo = carimbar(moto.casa(), cor)


def desenhar_painel():
    vitorias = estado["vitorias"]
    placar = "VERMELHA  " + str(vitorias["vermelha"]) + "   ×   " + str(vitorias["azul"]) + "  AZUL"
    mensagem = "Vermelha: A/D viram   •   Azul: ←/→ viram   •   Espaço: pausa   •   R: reiniciar"
    if estado["fase"] == "contagem":
        mensagem = "Rodada " + str(estado["rodada"]) + "   •   largada em " + str(math.ceil(estado["espera"] / 500))
    if estado["fase"] == "rodada" or estado["fase"] == "fim":
        mensagem = estado["resultado"]
    if estado["fase"] == "fim":
        mensagem = mensagem + "   •   R para jogar de novo"
    if estado["pausado"]:
        mensagem = "PAUSA   •   Espaço para continuar"
    texto = placar + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 250)
    painel.color("#e2e8f0")
    painel.write(placar, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, -292)
    painel.color("#a5b4fc")
    painel.write(mensagem, align="center", font=("Arial", 12, "normal"))


def preparar_rodada():
    pincel.clearstamps()
    estado["teclas"] = set()
    estado["fase"] = "contagem"
    estado["espera"] = CONTAGEM
    estado["acumulado"] = 0
    estado["resultado"] = ""
    estado["ocupadas"] = set()
    vermelha = Moto("vermelha", 5, 20, (1, 0), COR_RASTRO_VERMELHA, COR_CABECA_VERMELHA)
    azul = Moto("azul", COLUNAS - 6, 9, (-1, 0), COR_RASTRO_AZUL, COR_CABECA_AZUL)
    estado["motos"] = {"vermelha": vermelha, "azul": azul}
    for moto in [vermelha, azul]:
        estado["ocupadas"].add(moto.casa())
        pintar_cabeca(moto, moto.cor_cabeca)
    sz_audio.play("largada.wav", volume=0.5)


def bateu(casa):
    return not dentro(casa) or casa in estado["ocupadas"]


def terminar_rodada(perdedoras):
    estado["fase"] = "rodada"
    estado["espera"] = PAUSA_RODADA
    sz_audio.play("batida.wav", volume=0.6)
    for moto in perdedoras:
        pintar_cabeca(moto, COR_BATIDA)
    if len(perdedoras) == 2:
        estado["resultado"] = "EMPATE! Ninguém pontua."
        return
    vencedora = "vermelha"
    if perdedoras[0].nome == "vermelha":
        vencedora = "azul"
    estado["vitorias"][vencedora] += 1
    nome = vencedora.upper()
    estado["resultado"] = nome + " VENCEU A RODADA!"
    if estado["vitorias"][vencedora] >= VITORIAS_PARA_VENCER:
        estado["fase"] = "fim"
        estado["resultado"] = nome + " VENCEU A PARTIDA!"
        sz_audio.play("vitoria.wav", volume=0.6)


def dar_passo():
    vermelha = estado["motos"]["vermelha"]
    azul = estado["motos"]["azul"]
    nova_vermelha = vermelha.proxima()
    nova_azul = azul.proxima()
    perdedoras = []
    if nova_vermelha == nova_azul:
        # Cabeças na mesma casa: as duas batem.
        perdedoras = [vermelha, azul]
    else:
        if bateu(nova_vermelha):
            perdedoras.append(vermelha)
        if bateu(nova_azul):
            perdedoras.append(azul)
    if len(perdedoras) > 0:
        terminar_rodada(perdedoras)
        return
    for moto, nova in [(vermelha, nova_vermelha), (azul, nova_azul)]:
        # A cabeça antiga vira rastro e a nova ganha a cor clara.
        pintar_cabeca(moto, moto.cor_rastro)
        moto.carimbo = None
        moto.andar(nova)
        estado["ocupadas"].add(nova)
        pintar_cabeca(moto, moto.cor_cabeca)


def atualizar(tempo):
    if estado["fase"] == "contagem" or estado["fase"] == "rodada":
        estado["espera"] -= tempo
        if estado["espera"] > 0:
            return
        if estado["fase"] == "rodada":
            estado["rodada"] += 1
            preparar_rodada()
            return
        estado["fase"] = "jogando"
        estado["acumulado"] = 0
        return
    if estado["fase"] != "jogando":
        return
    # Um atraso longo não pode fazer as motos pularem várias casas de uma vez.
    estado["acumulado"] = min(estado["acumulado"] + tempo, PASSO * 2)
    while estado["acumulado"] >= PASSO and estado["fase"] == "jogando":
        estado["acumulado"] -= PASSO
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


def virar(nome, sentido):
    if estado["pausado"]:
        return
    if estado["fase"] == "contagem" or estado["fase"] == "jogando":
        estado["motos"][nome].pedir_curva(sentido)
        sz_audio.play("curva.wav", volume=0.25)


def apertar(tecla, nome, sentido):
    # Segurar a tecla não repete a curva: só um novo aperto vira de novo.
    if tecla in estado["teclas"]:
        return
    estado["teclas"].add(tecla)
    virar(nome, sentido)


def soltar(tecla):
    estado["teclas"].discard(tecla)


def ligar_tecla(tecla, nome, sentido):
    tela.onkeypress(lambda: apertar(tecla, nome, sentido), tecla)
    tela.onkeyrelease(lambda: soltar(tecla), tecla)


def pausar():
    if estado["fase"] != "fim":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["pausado"] = False
    estado["painel"] = ""
    estado["rodada"] = 1
    estado["vitorias"] = {"vermelha": 0, "azul": 0}
    preparar_rodada()


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
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
    tela.setup(760, 620)
    tela.title("Tron • Sistema Zero")
    tela.bgcolor("#05070f")
    tela.tracer(0)
    for desenho in [cenario, pincel, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("square")
    pincel.shapesize(CELULA / 20 * 0.95)
    desenhar_cenario()
    ligar_tecla("a", "vermelha", 1)
    ligar_tecla("A", "vermelha", 1)
    ligar_tecla("d", "vermelha", -1)
    ligar_tecla("D", "vermelha", -1)
    ligar_tecla("Left", "azul", 1)
    ligar_tecla("Right", "azul", -1)
    tela.onkey(pausar, "space")
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
