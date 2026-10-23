"""Jogo da Memória educacional: cartas, pares, espera e vitória visíveis em blocos."""

import turtle
import random
import time
import math
import sz_audio


LADO = 4
CELULA = 110
CENTRO_Y = -10
INTERVALO = 16
LIMITE_QUADRO = 100
TEMPO_DESVIRAR = 900
PISCAR = 450
COR_FUNDO = "#1e1b4b"
COR_VERSO = "#475569"
COR_FRENTE = "#f8fafc"
COR_ACHADA = "#bbf7d0"
COR_CURSOR = "#38bdf8"
# Oito figuras desenhadas com polígonos: cada uma aparece em duas cartas.
FIGURAS = [("circle", "#ef4444"), ("square", "#3b82f6"), ("triangle", "#16a34a"), ("estrela", "#eab308"),
           ("losango", "#a855f7"), ("hexagono", "#f97316"), ("cruz", "#db2777"), ("turtle", "#0d9488")]
estado = {"aberto": False, "timer_pendente": False, "melhor": None}

tela = turtle.Screen()
pincel = turtle.Turtle(visible=False)
simbolo = turtle.Turtle(visible=False)
cursor = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


class Carta:
    """Uma carta sabe a própria figura e se está virada ou já achada."""

    def __init__(self, figura, cor):
        self.figura = figura
        self.cor = cor
        self.virada = False
        self.achada = False

    def combina(self, outra):
        return self.figura == outra.figura and self.cor == outra.cor


def baralho():
    cartas = []
    for forma, cor in FIGURAS:
        cartas.append(Carta(forma, cor))
        cartas.append(Carta(forma, cor))
    random.shuffle(cartas)
    return cartas


def posicao(casa):
    return ((casa % LADO - (LADO - 1) / 2) * CELULA, ((LADO - 1) / 2 - casa // LADO) * CELULA + CENTRO_Y)


def poligono(raios, lados):
    # Pontos em volta do centro; raios alternados fazem a estrela.
    pontos = []
    for passo in range(lados):
        angulo = math.radians(90 + passo * 360 / lados)
        raio = raios[passo % len(raios)]
        pontos.append((raio * math.cos(angulo), raio * math.sin(angulo)))
    return tuple(pontos)


def moldura(lado, espessura):
    m = lado / 2
    d = m - espessura
    return ((-m, -m), (-m, m), (m, m), (m, -m), (-m, -m), (-d, -d), (d, -d), (d, d), (-d, d), (-d, -d))


def registrar_formas():
    tela.register_shape("estrela", poligono([11, 4.5], 10))
    tela.register_shape("losango", ((0, 12), (8, 0), (0, -12), (-8, 0)))
    tela.register_shape("hexagono", poligono([10], 6))
    tela.register_shape("cruz", ((-3, 10), (3, 10), (3, 3), (10, 3), (10, -3), (3, -3), (3, -10), (-3, -10), (-3, -3), (-10, -3), (-10, 3), (-3, 3)))
    tela.register_shape("moldura", moldura(CELULA - 4, 6))


def desenhar_cartas():
    pincel.clearstamps()
    simbolo.clearstamps()
    cartas = estado["cartas"]
    for casa in range(len(cartas)):
        carta = cartas[casa]
        x, y = posicao(casa)
        pincel.goto(x, y)
        pincel.color(COR_VERSO)
        if carta.achada:
            pincel.color(COR_ACHADA)
        elif carta.virada:
            pincel.color(COR_FRENTE)
        pincel.stamp()
        if carta.virada or carta.achada:
            simbolo.shape(carta.figura)
            simbolo.color(carta.cor)
            simbolo.goto(x, y)
            simbolo.stamp()


def mostrar_cursor():
    cursor.goto(posicao(estado["cursor"]))


def desenhar_painel():
    segundos = int(estado["tempo"] // 1000)
    melhor = "-"
    if estado["melhor"] is not None:
        melhor = str(estado["melhor"])
    linha1 = "PARES  " + str(estado["pares"]) + "/8     TENTATIVAS  " + str(estado["tentativas"]) + "     TEMPO  " + str(segundos) + " s     MELHOR  " + melhor
    mensagem = "Vire duas cartas: se forem iguais, ficam abertas"
    if estado["fase"] == "fim":
        mensagem = "VOCÊ ACHOU TODOS OS PARES em " + str(estado["tentativas"]) + " tentativas!   R: jogar de novo"
    if estado["pausado"]:
        mensagem = "PAUSA   •   P para continuar"
    texto = linha1 + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 300)
    painel.color("#fde68a")
    painel.write(linha1, align="center", font=("Arial", 16, "bold"))
    painel.goto(0, 238)
    painel.color("#e0e7ff")
    if estado["fase"] == "fim":
        painel.color(COR_ACHADA)
    painel.write(mensagem, align="center", font=("Arial", 14, "bold"))
    painel.goto(0, -285)
    painel.color("#c7d2fe")
    painel.write("Setas: mover   •   Enter ou Espaço: virar   •   clique na carta", align="center", font=("Arial", 12, "normal"))
    painel.goto(0, -310)
    painel.write("P: pausa   •   R: embaralhar   •   Esc: sair", align="center", font=("Arial", 12, "normal"))


def virar(casa):
    if estado["fase"] != "jogando" or estado["pausado"] or estado["espera"] > 0:
        return
    carta = estado["cartas"][casa]
    if carta.virada or carta.achada:
        return
    carta.virada = True
    sz_audio.play("virar.wav", volume=0.4)
    if estado["primeira"] is None:
        estado["primeira"] = casa
    else:
        estado["tentativas"] += 1
        outra = estado["cartas"][estado["primeira"]]
        if carta.combina(outra):
            carta.achada = True
            outra.achada = True
            estado["pares"] += 1
            estado["primeira"] = None
            sz_audio.play("acerto.wav", volume=0.5)
            if estado["pares"] == len(FIGURAS):
                estado["fase"] = "fim"
                if estado["melhor"] is None or estado["tentativas"] < estado["melhor"]:
                    estado["melhor"] = estado["tentativas"]
                sz_audio.play("vitoria.wav", volume=0.6)
        else:
            # Diferentes: ficam à mostra um pouco e depois desviram sozinhas.
            estado["segunda"] = casa
            estado["espera"] = TEMPO_DESVIRAR
            sz_audio.play("erro.wav", volume=0.4)
    desenhar_cartas()


def desvirar():
    estado["cartas"][estado["primeira"]].virada = False
    estado["cartas"][estado["segunda"]].virada = False
    estado["primeira"] = None
    estado["segunda"] = None
    desenhar_cartas()


def mover(dc, dl):
    coluna = estado["cursor"] % LADO + dc
    linha = estado["cursor"] // LADO + dl
    if 0 <= coluna < LADO and 0 <= linha < LADO:
        estado["cursor"] = linha * LADO + coluna
        mostrar_cursor()


def clicar(x, y):
    coluna = math.floor(x / CELULA + LADO / 2)
    linha = math.floor((CENTRO_Y - y) / CELULA + LADO / 2)
    if 0 <= coluna < LADO and 0 <= linha < LADO:
        estado["cursor"] = linha * LADO + coluna
        mostrar_cursor()
        virar(estado["cursor"])


def pulsar():
    escala = 1
    if estado["relogio"] // PISCAR % 2 == 1:
        escala = 0.94
    if escala != estado["escala"]:
        estado["escala"] = escala
        cursor.shapesize(escala, escala)


def atualizar(tempo):
    # Um quadro muito atrasado conta no máximo LIMITE_QUADRO milissegundos.
    tempo = min(tempo, LIMITE_QUADRO)
    estado["relogio"] += tempo
    pulsar()
    if estado["fase"] != "jogando":
        return
    estado["tempo"] += tempo
    if estado["espera"] > 0:
        estado["espera"] -= tempo
        if estado["espera"] <= 0:
            estado["espera"] = 0
            desvirar()


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
    estado["cartas"] = baralho()
    estado["primeira"] = None
    estado["segunda"] = None
    estado["espera"] = 0
    estado["pares"] = 0
    estado["tentativas"] = 0
    estado["tempo"] = 0
    estado["fase"] = "jogando"
    estado["pausado"] = False
    estado["cursor"] = 0
    estado["relogio"] = 0
    estado["escala"] = 1
    estado["painel"] = ""


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    cursor.shapesize(1, 1)
    mostrar_cursor()
    desenhar_cartas()
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
    tela.setup(620, 700)
    tela.title("Jogo da Memória • Sistema Zero")
    tela.bgcolor(COR_FUNDO)
    tela.tracer(0)
    registrar_formas()
    for desenho in [pincel, simbolo, cursor, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("square")
    pincel.shapesize((CELULA - 16) / 20)
    simbolo.setheading(90)
    simbolo.shapesize(2.6)
    cursor.shape("moldura")
    cursor.color(COR_CURSOR)
    cursor.showturtle()
    tela.onkeypress(lambda: mover(1, 0), "Right")
    tela.onkeypress(lambda: mover(-1, 0), "Left")
    tela.onkeypress(lambda: mover(0, -1), "Up")
    tela.onkeypress(lambda: mover(0, 1), "Down")
    tela.onkey(lambda: virar(estado["cursor"]), "Return")
    tela.onkey(lambda: virar(estado["cursor"]), "space")
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
