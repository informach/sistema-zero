"""Vidente educacional: toda a lógica fica visível em blocos, Ponte e Python."""

import turtle
import random
import math
import time
import sz_audio


INTERVALO = 16
PASSO_FISICA = 16
VELOCIDADE_MINIMA = 600
VELOCIDADE_MAXIMA = 1080
ATRITO = 0.985
VELOCIDADE_PARADA = 15
PASSO_SETA = 15
RAIO_RODA = 230
CENTRO_Y = 20
INICIO_FATIAS = 67.5
RESPOSTAS = ["Com certeza!", "Nem pensar!", "Pergunte amanhã", "Sim, sim, sim!",
             "Talvez...", "Só se chover", "Os astros: sim", "Melhor não"]
CORES_FATIAS = ["#ff6b6b", "#4dabf7", "#69db7c", "#b197fc", "#ffa94d", "#63e6be", "#f783ac", "#74c0fc"]
COR_PONTEIRO = "#ffe14a"
estado = {"aberto": False, "timer_pendente": False}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
ponteiro = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


def largura_fatia():
    return 360 / len(RESPOSTAS)


def fatia_apontada(angulo):
    """Qual fatia está embaixo de um ponteiro virado para este ângulo (0 = direita)."""
    return math.floor(((angulo - INICIO_FATIAS) % 360) / largura_fatia())


def ponto_da_roda(angulo, raio):
    radianos = math.radians(angulo)
    return (math.cos(radianos) * raio, CENTRO_Y + math.sin(radianos) * raio)


def desenhar_roda():
    cenario.clear()
    for indice in range(len(RESPOSTAS)):
        comeco = INICIO_FATIAS + indice * largura_fatia()
        cenario.color("#1b1b2f", CORES_FATIAS[indice % len(CORES_FATIAS)])
        cenario.goto(0, CENTRO_Y)
        cenario.pendown()
        cenario.begin_fill()
        for passo in range(11):
            cenario.goto(ponto_da_roda(comeco + passo * largura_fatia() / 10, RAIO_RODA))
        cenario.goto(0, CENTRO_Y)
        cenario.end_fill()
        cenario.penup()
    for indice in range(len(RESPOSTAS)):
        meio = INICIO_FATIAS + (indice + 0.5) * largura_fatia()
        x, y = ponto_da_roda(meio, RAIO_RODA * 0.66)
        cenario.goto(x, y - 7)
        cenario.color("#1b1b2f")
        cenario.write(RESPOSTAS[indice], align="center", font=("Arial", 10, "bold"))
    cenario.goto(0, CENTRO_Y - 26)
    cenario.color("#1b1b2f", "#2b2d42")
    cenario.pendown()
    cenario.begin_fill()
    cenario.circle(26)
    cenario.end_fill()
    cenario.penup()


def mostrar_ponteiro():
    ponteiro.setheading(estado["angulo"])


def desenhar_painel():
    titulo = "Aperte Espaço e faça uma pergunta à Vidente"
    if estado["girando"]:
        titulo = "A roda está girando..."
    elif estado["resultado"] != "":
        titulo = "A Vidente diz: " + estado["resultado"]
    if estado["pausado"]:
        titulo = "PAUSA  •  P para continuar"
    ultimas = "Últimas respostas: " + " • ".join(estado["historico"])
    if len(estado["historico"]) == 0:
        ultimas = "Últimas respostas: nenhuma ainda"
    mensagem = "Espaço: girar  •  ← →: mexer o ponteiro  •  P: pausa  •  R: reiniciar  •  Esc: sair"
    texto = titulo + ultimas + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 285)
    painel.color(COR_PONTEIRO)
    painel.write(titulo, align="center", font=("Arial", 20, "bold"))
    painel.goto(0, -285)
    painel.color("#e5dbff")
    painel.write(ultimas, align="center", font=("Arial", 13, "normal"))
    painel.goto(0, -325)
    painel.color("#a5a6c9")
    painel.write(mensagem, align="center", font=("Arial", 11, "normal"))


def parar():
    estado["girando"] = False
    estado["velocidade"] = 0
    estado["resultado"] = RESPOSTAS[fatia_apontada(estado["angulo"])]
    estado["historico"].append(estado["resultado"])
    if len(estado["historico"]) > 3:
        estado["historico"].pop(0)
    sz_audio.play("parar.wav", volume=0.6)


def passo_do_giro():
    antes = fatia_apontada(estado["angulo"])
    # O ponteiro gira no sentido do relógio, por isso o ângulo diminui.
    estado["angulo"] = (estado["angulo"] - estado["velocidade"] * PASSO_FISICA / 1000) % 360
    estado["velocidade"] = estado["velocidade"] * ATRITO
    if fatia_apontada(estado["angulo"]) != antes:
        sz_audio.play("tique.wav", volume=0.3)
    if estado["velocidade"] < VELOCIDADE_PARADA:
        parar()


def atualizar(tempo):
    if not estado["girando"]:
        return
    # Um atraso longo não pode fazer o ponteiro pular várias fatias de uma vez.
    estado["acumulado"] = min(estado["acumulado"] + tempo, PASSO_FISICA * 2)
    while estado["acumulado"] >= PASSO_FISICA and estado["girando"]:
        estado["acumulado"] -= PASSO_FISICA
        passo_do_giro()
    mostrar_ponteiro()


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


def girar():
    if estado["girando"] or estado["pausado"]:
        return
    estado["girando"] = True
    estado["acumulado"] = 0
    estado["velocidade"] = random.randint(VELOCIDADE_MINIMA, VELOCIDADE_MAXIMA)
    estado["resultado"] = ""
    sz_audio.play("tique.wav", volume=0.3)


def empurrar(sentido):
    # Direita gira no sentido do relógio (ângulo diminui); esquerda, ao contrário.
    if estado["girando"] or estado["pausado"]:
        return
    estado["angulo"] = (estado["angulo"] - sentido * PASSO_SETA) % 360
    mostrar_ponteiro()


def pausar():
    estado["pausado"] = not estado["pausado"]
    estado["ultimo_tempo"] = time.monotonic()


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    estado["angulo"] = 90
    estado["velocidade"] = 0
    estado["girando"] = False
    estado["pausado"] = False
    estado["acumulado"] = 0
    estado["resultado"] = ""
    estado["historico"] = []
    estado["painel"] = ""
    mostrar_ponteiro()
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    sz_audio.play("abertura.wav", volume=0.5)
    tela.update()
    # Não agende aqui: o reinício reutiliza a cadeia existente.


def fechar():
    if not estado["aberto"]:
        return
    estado["aberto"] = False
    sz_audio.stop()
    tela.bye()


def iniciar():
    tela.setup(800, 700)
    tela.title("Vidente • Sistema Zero")
    tela.bgcolor("#151226")
    tela.tracer(0)
    for desenho in [cenario, ponteiro, painel]:
        desenho.penup()
        desenho.speed(0)
    tela.register_shape("ponteiro", ((0, 150), (-14, 118), (-5, 118), (-5, -18), (5, -18), (5, 118), (14, 118)))
    ponteiro.shape("ponteiro")
    ponteiro.color(COR_PONTEIRO)
    ponteiro.goto(0, CENTRO_Y)
    ponteiro.showturtle()
    desenhar_roda()
    tela.onkey(girar, "space")
    tela.onkeypress(lambda: empurrar(1), "Right")
    tela.onkeypress(lambda: empurrar(-1), "Left")
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
