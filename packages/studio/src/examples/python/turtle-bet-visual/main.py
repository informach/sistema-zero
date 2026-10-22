"""Corrida com Aposta educacional: toda a lógica fica visível em blocos, Ponte e Python."""

import turtle
import random
import time
import sz_audio


INTERVALO = 16
PASSO_CORRIDA = 100
PASSO_MINIMO = 2
PASSO_MAXIMO = 12
LARGADA = -340
CHEGADA = 340
RAIA_DE_CIMA = 105
ESPACO_RAIAS = 70
ALTURA_RAIA = 60
CORES = ["#ff5c7a", "#4dabf7", "#69db7c", "#ffd43b"]
NOMES = ["vermelha", "azul", "verde", "amarela"]
estado = {"aberto": False, "timer_pendente": False}

tela = turtle.Screen()
pista = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
marcador = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Corredora:
    """Uma tartaruga da corrida: cor, raia (1 a 4) e quanto ela já andou."""

    def __init__(self, cor, raia):
        self.cor = cor
        self.raia = raia
        self.x = LARGADA

    def y(self):
        return altura_da_raia(self.raia)

    def andar(self, passo):
        self.x += passo

    def cruzou(self):
        return self.x >= CHEGADA


def altura_da_raia(raia):
    return RAIA_DE_CIMA - (raia - 1) * ESPACO_RAIAS


def raia_do_ponto(y):
    for raia in range(1, len(CORES) + 1):
        if abs(y - altura_da_raia(raia)) <= ALTURA_RAIA / 2:
            return raia
    return 0


def desenhar_pista():
    pista.clear()
    for raia in range(1, len(CORES) + 1):
        y = altura_da_raia(raia)
        pista.goto(LARGADA - 40, y - ALTURA_RAIA / 2)
        pista.color("#2f6b3a", "#3c8a4a")
        if raia % 2 == 0:
            pista.color("#2f6b3a", "#357d43")
        pista.pendown()
        pista.begin_fill()
        for lado in range(2):
            pista.forward(CHEGADA - LARGADA + 80)
            pista.left(90)
            pista.forward(ALTURA_RAIA)
            pista.left(90)
        pista.end_fill()
        pista.penup()
        pista.goto(LARGADA - 60, y - 10)
        pista.color("#ffffff")
        pista.write(str(raia), align="center", font=("Arial", 16, "bold"))
    for x in [LARGADA, CHEGADA]:
        pista.color("#ffffff")
        pista.pensize(4)
        pista.goto(x, altura_da_raia(1) + ALTURA_RAIA / 2)
        pista.pendown()
        pista.goto(x, altura_da_raia(len(CORES)) - ALTURA_RAIA / 2)
        pista.penup()
    pista.pensize(1)
    for metro in range(0, CHEGADA - LARGADA + 1, 100):
        pista.goto(LARGADA + metro, altura_da_raia(1) + ALTURA_RAIA / 2 + 8)
        pista.color("#d7f5dd")
        pista.write(str(metro), align="center", font=("Arial", 10, "normal"))


def desenhar_corredoras():
    pincel.clearstamps()
    for corredora in estado["corredoras"]:
        pincel.color(corredora.cor)
        pincel.goto(corredora.x, corredora.y())
        pincel.stamp()


def mostrar_aposta():
    marcador.goto(LARGADA - 85, altura_da_raia(estado["aposta"]))


def desenhar_painel():
    nome = NOMES[estado["aposta"] - 1]
    placar = "APOSTA: tartaruga " + nome + "     CERTAS " + str(estado["certas"]) + "     ERRADAS " + str(estado["erradas"])
    mensagem = "Escolha 1, 2, 3 ou 4 (ou clique na raia) e aperte Espaço para a largada"
    if estado["fase"] == "correndo":
        mensagem = "Corrida em andamento..."
    if estado["fase"] == "fim":
        mensagem = estado["resultado"] + "   Espaço: nova corrida"
    if estado["pausado"]:
        mensagem = "PAUSA  •  P para continuar"
    ajuda = "1-4 ou clique: apostar  •  Espaço: largada  •  P: pausa  •  R: zerar o placar  •  Esc: sair"
    texto = placar + mensagem + ajuda
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 230)
    painel.color("#ffe14a")
    painel.write(placar, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, -200)
    painel.color("#ffffff")
    painel.write(mensagem, align="center", font=("Arial", 15, "bold"))
    painel.goto(0, -270)
    painel.color("#b8e0c2")
    painel.write(ajuda, align="center", font=("Arial", 11, "normal"))


def vencedora_da_chegada():
    """Quem cruzou neste passo e foi mais longe; empate exato fica com a raia de cima."""
    melhor = None
    for corredora in estado["corredoras"]:
        if corredora.cruzou():
            if melhor is None or corredora.x > melhor.x:
                melhor = corredora
    return melhor


def terminar(vencedora):
    estado["fase"] = "fim"
    nome = "A tartaruga " + NOMES[vencedora.raia - 1] + " venceu!"
    sz_audio.play("chegada.wav", volume=0.6)
    if vencedora.raia == estado["aposta"]:
        estado["certas"] += 1
        estado["resultado"] = nome + " Você acertou!"
        sz_audio.play("acerto.wav", volume=0.6)
    else:
        estado["erradas"] += 1
        estado["resultado"] = nome + " Não foi desta vez."


def dar_passo():
    for corredora in estado["corredoras"]:
        corredora.andar(random.randint(PASSO_MINIMO, PASSO_MAXIMO))
    vencedora = vencedora_da_chegada()
    if vencedora is not None:
        terminar(vencedora)


def atualizar(tempo):
    if estado["fase"] != "correndo":
        return
    # Um atraso longo não pode fazer as tartarugas darem muitos passos de uma vez.
    estado["acumulado"] = min(estado["acumulado"] + tempo, PASSO_CORRIDA * 2)
    andou = False
    while estado["acumulado"] >= PASSO_CORRIDA and estado["fase"] == "correndo":
        estado["acumulado"] -= PASSO_CORRIDA
        dar_passo()
        andou = True
    if andou:
        desenhar_corredoras()


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


def alinhar():
    estado["corredoras"] = []
    for indice in range(len(CORES)):
        estado["corredoras"].append(Corredora(CORES[indice], indice + 1))
    desenhar_corredoras()


def apostar(raia):
    if estado["fase"] == "correndo" or estado["pausado"]:
        return
    estado["aposta"] = raia
    mostrar_aposta()


def clicar(x, y):
    raia = raia_do_ponto(y)
    if raia != 0:
        apostar(raia)


def largar():
    if estado["fase"] == "correndo" or estado["pausado"]:
        return
    alinhar()
    estado["fase"] = "correndo"
    estado["acumulado"] = 0
    estado["resultado"] = ""
    sz_audio.play("largada.wav", volume=0.6)


def pausar():
    estado["pausado"] = not estado["pausado"]
    estado["ultimo_tempo"] = time.monotonic()


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    estado["fase"] = "apostando"
    estado["pausado"] = False
    estado["aposta"] = 1
    estado["certas"] = 0
    estado["erradas"] = 0
    estado["resultado"] = ""
    estado["acumulado"] = 0
    estado["painel"] = ""
    alinhar()
    mostrar_aposta()
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
    tela.setup(900, 600)
    tela.title("Corrida com Aposta • Sistema Zero")
    tela.bgcolor("#16301d")
    tela.tracer(0)
    for desenho in [pista, pincel, marcador, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("turtle")
    pincel.shapesize(1.6)
    marcador.shape("triangle")
    marcador.color("#ffffff")
    marcador.shapesize(0.8)
    marcador.showturtle()
    desenhar_pista()
    tela.onkey(lambda: apostar(1), "1")
    tela.onkey(lambda: apostar(2), "2")
    tela.onkey(lambda: apostar(3), "3")
    tela.onkey(lambda: apostar(4), "4")
    tela.onkey(largar, "space")
    tela.onkey(pausar, "p")
    tela.onkey(pausar, "P")
    tela.onkey(reiniciar, "r")
    tela.onkey(reiniciar, "R")
    tela.onkey(fechar, "Escape")
    tela.onscreenclick(clicar)
    tela.listen()
    estado["aberto"] = True
    reiniciar()
    agendar()
    if estado["aberto"]:
        tela.mainloop()


if __name__ == "__main__":
    iniciar()
