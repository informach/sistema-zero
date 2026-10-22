"""Genius educacional: sequência que cresce, memória e repetição visíveis em blocos."""

import turtle
import random
import time
import math
import sz_audio


CENTRO_Y = -10
RAIO_FORA = 220
RAIO_DENTRO = 70
INTERVALO = 16
LIMITE_QUADRO = 100
ABERTURA = 900
ACESO = 450
APAGADO = 200
TOQUE = 300
PAUSA_RODADA = 800
COR_FUNDO = "#0f172a"
COR_DEDO = "#ffffff"
# Índices 0 a 3: cima, direita, baixo e esquerda, como as setas.
NOMES = ["VERDE", "VERMELHO", "AZUL", "AMARELO"]
ANGULOS = [90, 0, 270, 180]
CORES = ["#166534", "#991b1b", "#1e3a8a", "#a16207"]
CORES_ACESAS = ["#4ade80", "#f87171", "#60a5fa", "#fde047"]
SONS = ["verde.wav", "vermelho.wav", "azul.wav", "amarelo.wav"]
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
luz = turtle.Turtle(visible=False)
dedo = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


def setor(dentro, fora, abertura):
    # Um pedaço de anel apontando para cima; a tartaruga gira para cada cor.
    pontos = []
    for passo in range(17):
        angulo = math.radians(90 - abertura / 2 + abertura * passo / 16)
        pontos.append((fora * math.cos(angulo), fora * math.sin(angulo)))
    for passo in range(17):
        angulo = math.radians(90 + abertura / 2 - abertura * passo / 16)
        pontos.append((dentro * math.cos(angulo), dentro * math.sin(angulo)))
    return tuple(pontos)


def centro_da_cor(cor):
    raio = (RAIO_FORA + RAIO_DENTRO) / 2
    angulo = math.radians(ANGULOS[cor])
    return (round(raio * math.cos(angulo)), round(raio * math.sin(angulo)) + CENTRO_Y)


def desenhar_cenario():
    cenario.clearstamps()
    cenario.goto(0, CENTRO_Y)
    for cor in range(4):
        cenario.setheading(ANGULOS[cor])
        cenario.color(CORES[cor])
        cenario.stamp()


def acender(cor):
    estado["aceso"] = cor
    luz.setheading(ANGULOS[cor])
    luz.color(CORES_ACESAS[cor])
    luz.showturtle()
    sz_audio.play(SONS[cor], volume=0.5)


def apagar():
    estado["aceso"] = None
    luz.hideturtle()


def desenhar_painel():
    rodada = len(estado["sequencia"])
    linha1 = "RODADA  " + str(rodada) + "     ACERTOS  " + str(estado["pontos"]) + "     RECORDE  " + str(estado["recorde"])
    mensagem = "Observe a sequência..."
    if estado["fase"] == "repetindo" or estado["fase"] == "intervalo":
        mensagem = "Sua vez: repita (" + str(estado["passo"]) + " de " + str(rodada) + ")"
    if estado["fase"] == "fim":
        mensagem = estado["resultado"]
    if estado["pausado"]:
        mensagem = "PAUSA   •   P para continuar"
    texto = linha1 + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 300)
    painel.color("#fde68a")
    painel.write(linha1, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, 250)
    painel.color("#e2e8f0")
    painel.write(mensagem, align="center", font=("Arial", 14, "bold"))
    painel.goto(0, CENTRO_Y - 22)
    painel.write(str(rodada), align="center", font=("Arial", 32, "bold"))
    painel.goto(0, -285)
    painel.color("#cbd5e1")
    painel.write("Setas: ↑ verde   → vermelho   ↓ azul   ← amarelo   •   ou clique na cor", align="center", font=("Arial", 12, "normal"))
    painel.goto(0, -310)
    painel.write("P: pausa   •   Enter ou R: novo jogo   •   Esc: sair", align="center", font=("Arial", 12, "normal"))


def mostrar_sequencia(tempo):
    # Acende e apaga cada passo da sequência, um de cada vez.
    estado["espera"] -= tempo
    if estado["espera"] > 0:
        return
    if estado["aceso"] is not None:
        apagar()
        estado["mostrado"] += 1
        estado["espera"] = APAGADO
    elif estado["mostrado"] < len(estado["sequencia"]):
        acender(estado["sequencia"][estado["mostrado"]])
        estado["espera"] = ACESO
    else:
        estado["fase"] = "repetindo"
        estado["passo"] = 0


def proxima_rodada():
    apagar()
    estado["toque"] = 0
    estado["sequencia"].append(random.randint(0, 3))
    estado["fase"] = "mostrando"
    estado["mostrado"] = 0
    estado["espera"] = APAGADO


def tocar(cor):
    # Enquanto a sequência é mostrada, a entrada é ignorada.
    if estado["fase"] != "repetindo" or estado["pausado"]:
        return
    dedo.goto(centro_da_cor(cor))
    acender(cor)
    estado["toque"] = TOQUE
    if cor != estado["sequencia"][estado["passo"]]:
        certa = estado["sequencia"][estado["passo"]]
        estado["fase"] = "fim"
        estado["recorde"] = max(estado["recorde"], estado["pontos"])
        estado["resultado"] = "Errou! Era " + NOMES[certa] + ". Maior sequência: " + str(estado["pontos"]) + "   Enter: de novo"
        sz_audio.play("erro.wav", volume=0.6)
        return
    estado["passo"] += 1
    if estado["passo"] == len(estado["sequencia"]):
        estado["pontos"] = len(estado["sequencia"])
        estado["recorde"] = max(estado["recorde"], estado["pontos"])
        estado["fase"] = "intervalo"
        estado["espera"] = PAUSA_RODADA


def clicar(x, y):
    dx = x
    dy = y - CENTRO_Y
    distancia = math.hypot(dx, dy)
    if distancia < RAIO_DENTRO:
        if estado["fase"] == "fim":
            reiniciar()
        return
    if distancia > RAIO_FORA:
        return
    if abs(dx) > abs(dy):
        if dx > 0:
            tocar(1)
        else:
            tocar(3)
    elif dy > 0:
        tocar(0)
    else:
        tocar(2)


def novo_jogo():
    if estado["fase"] == "fim":
        reiniciar()


def atualizar(tempo):
    # Um quadro muito atrasado conta no máximo LIMITE_QUADRO milissegundos.
    tempo = min(tempo, LIMITE_QUADRO)
    if estado["toque"] > 0:
        estado["toque"] -= tempo
        if estado["toque"] <= 0:
            estado["toque"] = 0
            apagar()
    if estado["fase"] == "mostrando":
        mostrar_sequencia(tempo)
    elif estado["fase"] == "intervalo":
        estado["espera"] -= tempo
        if estado["espera"] <= 0:
            proxima_rodada()


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
    if estado["fase"] != "fim":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["sequencia"] = [random.randint(0, 3)]
    estado["fase"] = "mostrando"
    estado["mostrado"] = 0
    estado["espera"] = ABERTURA
    estado["aceso"] = None
    estado["toque"] = 0
    estado["passo"] = 0
    estado["pontos"] = 0
    estado["resultado"] = ""
    estado["pausado"] = False
    estado["painel"] = ""


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    apagar()
    dedo.goto(0, CENTRO_Y)
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
    tela.setup(600, 680)
    tela.title("Genius • Sistema Zero")
    tela.bgcolor(COR_FUNDO)
    tela.tracer(0)
    tela.register_shape("setor", setor(RAIO_DENTRO, RAIO_FORA, 80))
    for desenho in [cenario, luz, dedo, painel]:
        desenho.penup()
        desenho.speed(0)
    cenario.shape("setor")
    luz.shape("setor")
    luz.goto(0, CENTRO_Y)
    dedo.shape("circle")
    dedo.shapesize(1.2)
    dedo.color(COR_DEDO)
    dedo.showturtle()
    desenhar_cenario()
    tela.onkeypress(lambda: tocar(0), "Up")
    tela.onkeypress(lambda: tocar(1), "Right")
    tela.onkeypress(lambda: tocar(2), "Down")
    tela.onkeypress(lambda: tocar(3), "Left")
    tela.onkey(novo_jogo, "Return")
    tela.onkey(novo_jogo, "space")
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
