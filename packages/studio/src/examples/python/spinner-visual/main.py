"""Spinner educacional: impulso, atrito e contagem de voltas visíveis em blocos, Ponte e Python."""

import turtle
import math
import time
import sz_audio


LARGURA = 700
ALTURA = 700
CENTRO_Y = -20
INTERVALO = 16
COMPRIMENTO_BRACO = 150
TAMANHO_BOLA = 46
IMPULSO = 240
ATRITO = 90
VELOCIDADE_MAXIMA = 1440
COR_DESTAQUE = "#ff5c7a"
COR_BOLA = "#5cc8ff"
COR_BRACO = "#94a3b8"
COR_CENTRO = "#ffe14a"
estado = {"aberto": False, "timer_pendente": False, "recorde": 0}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
bracos = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


def posicao_bola(indice):
    # Os três braços ficam a 120 graus um do outro.
    angulo = math.radians(estado["angulo"] + indice * 120)
    return (math.cos(angulo) * COMPRIMENTO_BRACO, CENTRO_Y + math.sin(angulo) * COMPRIMENTO_BRACO)


def desenhar_cenario():
    cenario.clear()
    cenario.color("#1e293b")
    cenario.pensize(2)
    cenario.goto(0, CENTRO_Y - COMPRIMENTO_BRACO - 40)
    cenario.pendown()
    cenario.circle(COMPRIMENTO_BRACO + 40)
    cenario.penup()


def desenhar():
    bracos.clear()
    for indice in range(3):
        x, y = posicao_bola(indice)
        bracos.goto(0, CENTRO_Y)
        bracos.color(COR_BRACO)
        bracos.pendown()
        bracos.goto(x, y)
        bracos.penup()
        cor = COR_BOLA
        if indice == 0:
            cor = COR_DESTAQUE
        bracos.dot(TAMANHO_BOLA, cor)
    bracos.goto(0, CENTRO_Y)
    bracos.dot(34, COR_CENTRO)


def desenhar_painel():
    sentido = "parado"
    if estado["velocidade"] < 0:
        sentido = "horário"
    elif estado["velocidade"] > 0:
        sentido = "anti-horário"
    rapidez = round(abs(estado["velocidade"]) / 360, 1)
    placar = "VELOCIDADE  " + str(rapidez) + " voltas/s (" + sentido + ")"
    contagem = "VOLTAS NESTE IMPULSO  " + str(estado["voltas"]) + "     RECORDE  " + str(estado["recorde"])
    mensagem = "Espaço ou clique: impulso   •   ←/→: impulso para um lado   •   P: pausa   •   R: zerar"
    if estado["pausado"]:
        mensagem = "PAUSA   •   P para continuar"
    texto = placar + contagem + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 300)
    painel.color("#f8fafc")
    painel.write(placar, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, 270)
    painel.color("#ffe14a")
    painel.write(contagem, align="center", font=("Arial", 14, "bold"))
    painel.goto(0, -320)
    painel.color("#cbd5e1")
    painel.write(mensagem, align="center", font=("Arial", 12, "normal"))


def frear(velocidade, segundos):
    # O atrito tira velocidade, mas nunca faz o spinner girar ao contrário.
    perda = ATRITO * segundos
    if abs(velocidade) <= perda:
        return 0
    if velocidade > 0:
        return velocidade - perda
    return velocidade + perda


def atualizar(tempo):
    # Um quadro atrasado avança no máximo dois quadros.
    segundos = min(tempo, 2 * INTERVALO) / 1000
    estado["velocidade"] = frear(estado["velocidade"], segundos)
    giro = estado["velocidade"] * segundos
    estado["angulo"] = (estado["angulo"] + giro) % 360
    estado["giro"] += abs(giro)
    while estado["giro"] >= (estado["voltas"] + 1) * 360:
        estado["voltas"] += 1
        estado["recorde"] = max(estado["recorde"], estado["voltas"])
        sz_audio.play("clique.wav", volume=0.4)


def impulsionar(sentido=0):
    if estado["pausado"]:
        return
    if sentido == 0:
        # Espaço empurra no sentido em que ele já gira; parado, gira no horário.
        sentido = -1
        if estado["velocidade"] > 0:
            sentido = 1
    nova = estado["velocidade"] + sentido * IMPULSO
    estado["velocidade"] = max(-VELOCIDADE_MAXIMA, min(VELOCIDADE_MAXIMA, nova))
    estado["giro"] = 0
    estado["voltas"] = 0
    sz_audio.play("impulso.wav", volume=0.5)


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


def pausar():
    estado["pausado"] = not estado["pausado"]
    estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["pausado"] = False
    estado["painel"] = ""
    estado["angulo"] = 90
    estado["velocidade"] = 0
    estado["giro"] = 0
    estado["voltas"] = 0


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
    tela.title("Spinner • Sistema Zero")
    tela.bgcolor("#0b1120")
    tela.tracer(0)
    for desenho in [cenario, bracos, painel]:
        desenho.penup()
        desenho.speed(0)
    bracos.pensize(10)
    desenhar_cenario()
    tela.onkey(impulsionar, "space")
    tela.onkey(lambda: impulsionar(-1), "Right")
    tela.onkey(lambda: impulsionar(1), "Left")
    tela.onscreenclick(lambda x, y: impulsionar())
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
