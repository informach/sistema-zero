"""Jogo da Vida educacional: toda a lógica fica visível em blocos, Ponte e Python."""

import turtle
import random
import math
import time
import sz_audio


CELULA = 20
COLUNAS = 40
LINHAS = 30
INTERVALO = 16
INTERVALO_GERACAO = 150
DENSIDADE = 30
NASCE_COM = [3]
SOBREVIVE_COM = [2, 3]
BORDAS_DAO_VOLTA = True
X0 = -400
Y0 = -310
COR_VIVA = "#4ade80"
COR_CURSOR = "#ff4fd8"
COR_FUNDO = "#0f1d2b"
COR_LINHA = "#1b3147"
estado = {"aberto": False, "timer_pendente": False}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
cursor = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


def posicao(casa):
    return (X0 + (casa[0] + 0.5) * CELULA, Y0 + (casa[1] + 0.5) * CELULA)


def casa_do_ponto(x, y):
    coluna = math.floor((x - X0) / CELULA)
    linha = math.floor((y - Y0) / CELULA)
    if 0 <= coluna < COLUNAS and 0 <= linha < LINHAS:
        return (coluna, linha)
    return None


def vizinhas(casa):
    """As oito casas em volta. Com as bordas dando a volta, a grade é um 'pneu'."""
    resultado = []
    for dx in [-1, 0, 1]:
        for dy in [-1, 0, 1]:
            if dx != 0 or dy != 0:
                coluna = casa[0] + dx
                linha = casa[1] + dy
                if BORDAS_DAO_VOLTA:
                    resultado.append((coluna % COLUNAS, linha % LINHAS))
                elif 0 <= coluna < COLUNAS and 0 <= linha < LINHAS:
                    resultado.append((coluna, linha))
    return resultado


def contar_vizinhos(vivas):
    """Cada célula viva soma 1 em cada vizinha; só casas perto de vida aparecem."""
    contagem = {}
    for casa in vivas:
        for outra in vizinhas(casa):
            if outra in contagem:
                contagem[outra] += 1
            else:
                contagem[outra] = 1
    return contagem


def proxima_geracao(vivas):
    novas = set()
    contagem = contar_vizinhos(vivas)
    for casa, quantas in contagem.items():
        if casa in vivas:
            if quantas in SOBREVIVE_COM:
                novas.add(casa)
        elif quantas in NASCE_COM:
            novas.add(casa)
    return novas


def acender(casa):
    pincel.goto(posicao(casa))
    estado["carimbos"][casa] = pincel.stamp()


def apagar(casa):
    pincel.clearstamp(estado["carimbos"].pop(casa))


def aplicar(novas):
    # Só o que MUDOU ganha ou perde carimbo; o resto da grade fica como está.
    for casa in list(estado["vivas"]):
        if casa not in novas:
            apagar(casa)
    for casa in novas:
        if casa not in estado["vivas"]:
            acender(casa)
    estado["vivas"] = novas


def dar_passo():
    aplicar(proxima_geracao(estado["vivas"]))
    estado["geracao"] += 1


def alternar(casa):
    novas = set(estado["vivas"])
    if casa in novas:
        novas.remove(casa)
    else:
        novas.add(casa)
    aplicar(novas)
    sz_audio.play("marcar.wav", volume=0.4)


def esvaziar():
    pincel.clearstamps()
    estado["carimbos"] = {}
    estado["vivas"] = set()
    estado["geracao"] = 0


def sortear():
    esvaziar()
    novas = set()
    for coluna in range(COLUNAS):
        for linha in range(LINHAS):
            if random.randint(1, 100) <= DENSIDADE:
                novas.add((coluna, linha))
    aplicar(novas)


def desenhar_cenario():
    cenario.clear()
    cenario.color(COR_LINHA, COR_FUNDO)
    cenario.goto(X0, Y0)
    cenario.pendown()
    cenario.begin_fill()
    for lado in range(2):
        cenario.forward(COLUNAS * CELULA)
        cenario.left(90)
        cenario.forward(LINHAS * CELULA)
        cenario.left(90)
    cenario.end_fill()
    cenario.penup()
    for coluna in range(1, COLUNAS):
        cenario.goto(X0 + coluna * CELULA, Y0)
        cenario.pendown()
        cenario.goto(X0 + coluna * CELULA, Y0 + LINHAS * CELULA)
        cenario.penup()
    for linha in range(1, LINHAS):
        cenario.goto(X0, Y0 + linha * CELULA)
        cenario.pendown()
        cenario.goto(X0 + COLUNAS * CELULA, Y0 + linha * CELULA)
        cenario.penup()


def mostrar_cursor():
    cursor.goto(posicao(estado["cursor"]))


def desenhar_painel():
    situacao = "PAUSADO"
    if estado["rodando"]:
        situacao = "RODANDO"
    placar = "GERAÇÃO " + str(estado["geracao"]) + "     POPULAÇÃO " + str(len(estado["vivas"])) + "     " + situacao
    mensagem = "Espaço: rodar/pausar  •  N: passo  •  Setas + Enter ou clique: marcar  •  C: limpar  •  R: sortear"
    texto = placar + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 320)
    painel.color("#ffe14a")
    painel.write(placar, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, -360)
    painel.color("#c9f7d8")
    painel.write(mensagem, align="center", font=("Arial", 11, "normal"))


def atualizar(tempo):
    if not estado["rodando"]:
        return
    # Um atraso longo não pode pular muitas gerações de uma vez.
    estado["acumulado"] = min(estado["acumulado"] + tempo, INTERVALO_GERACAO * 2)
    while estado["acumulado"] >= INTERVALO_GERACAO:
        estado["acumulado"] -= INTERVALO_GERACAO
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
    atualizar(tempo)
    desenhar_painel()
    tela.update()
    agendar()


def rodar_ou_pausar():
    estado["rodando"] = not estado["rodando"]
    estado["acumulado"] = 0
    estado["ultimo_tempo"] = time.monotonic()


def um_passo():
    if not estado["rodando"]:
        dar_passo()
        sz_audio.play("passo.wav", volume=0.4)


def mover_cursor(dx, dy):
    coluna = min(COLUNAS - 1, max(0, estado["cursor"][0] + dx))
    linha = min(LINHAS - 1, max(0, estado["cursor"][1] + dy))
    estado["cursor"] = (coluna, linha)
    mostrar_cursor()


def marcar():
    alternar(estado["cursor"])


def clicar(x, y):
    casa = casa_do_ponto(x, y)
    if casa is not None:
        estado["cursor"] = casa
        mostrar_cursor()
        alternar(casa)


def limpar():
    esvaziar()
    estado["rodando"] = False
    sz_audio.play("limpar.wav", volume=0.5)


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    sortear()
    estado["rodando"] = True
    estado["acumulado"] = 0
    estado["painel"] = ""
    estado["cursor"] = (20, 15)
    mostrar_cursor()
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    sz_audio.play("sortear.wav", volume=0.5)
    tela.update()
    # Não agende aqui: o reinício reutiliza a cadeia existente.


def fechar():
    if not estado["aberto"]:
        return
    estado["aberto"] = False
    sz_audio.stop()
    tela.bye()


def iniciar():
    tela.setup(900, 760)
    tela.title("Jogo da Vida • Sistema Zero")
    tela.bgcolor("#08121c")
    tela.tracer(0)
    for desenho in [cenario, pincel, cursor, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("square")
    pincel.color(COR_VIVA)
    pincel.shapesize(CELULA / 20 * 0.85)
    cursor.shape("square")
    cursor.color(COR_CURSOR)
    cursor.shapesize(CELULA / 20 * 0.55)
    cursor.showturtle()
    desenhar_cenario()
    tela.onkeypress(lambda: mover_cursor(1, 0), "Right")
    tela.onkeypress(lambda: mover_cursor(-1, 0), "Left")
    tela.onkeypress(lambda: mover_cursor(0, 1), "Up")
    tela.onkeypress(lambda: mover_cursor(0, -1), "Down")
    tela.onkey(marcar, "Return")
    tela.onkey(rodar_ou_pausar, "space")
    tela.onkey(rodar_ou_pausar, "p")
    tela.onkey(rodar_ou_pausar, "P")
    tela.onkey(um_passo, "n")
    tela.onkey(um_passo, "N")
    tela.onkey(limpar, "c")
    tela.onkey(limpar, "C")
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
