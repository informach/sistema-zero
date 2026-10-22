"""Quebra-cabeça de 15 educacional: grade, vizinhos, embaralhar e vitória visíveis em blocos."""

import turtle
import random
import time
import math
import sz_audio


LADO = 4
CELULA = 100
CENTRO_Y = -20
INTERVALO = 16
LIMITE_QUADRO = 100
EMBARALHAR = 200
PISCAR = 450
COR_FUNDO = "#111827"
COR_MOLDURA = "#374151"
COR_PECA = "#f59e0b"
COR_CERTA = "#22c55e"
COR_NUMERO = "#1f2937"
COR_VAZIO = "#38bdf8"
RESOLVIDO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
estado = {"aberto": False, "timer_pendente": False, "melhor": None}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
numeros = turtle.Turtle(visible=False)
vazio = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


def posicao(casa):
    return ((casa % LADO - (LADO - 1) / 2) * CELULA, ((LADO - 1) / 2 - casa // LADO) * CELULA + CENTRO_Y)


def vizinhos(casa):
    coluna = casa % LADO
    linha = casa // LADO
    perto = []
    if coluna > 0:
        perto.append(casa - 1)
    if coluna < LADO - 1:
        perto.append(casa + 1)
    if linha > 0:
        perto.append(casa - LADO)
    if linha < LADO - 1:
        perto.append(casa + LADO)
    return perto


def trocar(pecas, a, b):
    guardada = pecas[a]
    pecas[a] = pecas[b]
    pecas[b] = guardada


def embaralhar(pecas, quantidade):
    # Só movimentos legais a partir do resolvido: o embaralhado sempre tem solução.
    casa_vazia = pecas.index(0)
    anterior = -1
    caminho = [casa_vazia]
    for passo in range(quantidade):
        opcoes = []
        for casa in vizinhos(casa_vazia):
            if casa != anterior:
                opcoes.append(casa)
        casa = random.choice(opcoes)
        trocar(pecas, casa, casa_vazia)
        anterior = casa_vazia
        casa_vazia = casa
        caminho.append(casa_vazia)
    # O vazio volta ao canto de baixo à direita, também com movimentos legais.
    while casa_vazia % LADO < LADO - 1:
        trocar(pecas, casa_vazia + 1, casa_vazia)
        casa_vazia += 1
        caminho.append(casa_vazia)
    while casa_vazia // LADO < LADO - 1:
        trocar(pecas, casa_vazia + LADO, casa_vazia)
        casa_vazia += LADO
        caminho.append(casa_vazia)
    return caminho


def moldura(lado, espessura):
    m = lado / 2
    d = m - espessura
    return ((-m, -m), (-m, m), (m, m), (m, -m), (-m, -m), (-d, -d), (d, -d), (d, d), (-d, d), (-d, -d))


def desenhar_cenario():
    cenario.clear()
    cenario.color(COR_MOLDURA)
    x, y = posicao(0)
    cenario.goto(x - CELULA / 2 - 10, y + CELULA / 2 + 10)
    cenario.setheading(0)
    cenario.pendown()
    cenario.begin_fill()
    for lado in range(4):
        cenario.forward(LADO * CELULA + 20)
        cenario.right(90)
    cenario.end_fill()
    cenario.penup()


def desenhar_pecas():
    pincel.clearstamps()
    numeros.clear()
    pecas = estado["pecas"]
    for casa in range(len(pecas)):
        if pecas[casa] != 0:
            x, y = posicao(casa)
            # Peça no lugar certo fica verde.
            pincel.color(COR_PECA)
            if pecas[casa] == casa + 1:
                pincel.color(COR_CERTA)
            pincel.goto(x, y)
            pincel.stamp()
            numeros.goto(x, y - 20)
            numeros.write(str(pecas[casa]), align="center", font=("Arial", 30, "bold"))
    vazio.goto(posicao(pecas.index(0)))


def desenhar_painel():
    segundos = int(estado["tempo"] // 1000)
    melhor = "-"
    if estado["melhor"] is not None:
        melhor = str(estado["melhor"])
    linha1 = "MOVIMENTOS  " + str(estado["movimentos"]) + "     TEMPO  " + str(segundos) + " s     MELHOR  " + melhor
    mensagem = "Deixe as peças de 1 a 15 em ordem, com o espaço vazio no fim"
    if estado["fase"] == "fim":
        mensagem = "RESOLVIDO em " + str(estado["movimentos"]) + " movimentos!   R: embaralhar de novo"
    if estado["pausado"]:
        mensagem = "PAUSA   •   P ou Espaço para continuar"
    texto = linha1 + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 290)
    painel.color("#fde68a")
    painel.write(linha1, align="center", font=("Arial", 17, "bold"))
    painel.goto(0, 212)
    painel.color("#e5e7eb")
    if estado["fase"] == "fim":
        painel.color(COR_CERTA)
    painel.write(mensagem, align="center", font=("Arial", 13, "bold"))
    painel.goto(0, -275)
    painel.color("#cbd5e1")
    painel.write("Setas: a peça vizinha do vazio desliza no sentido da seta (← traz a peça da direita)", align="center", font=("Arial", 12, "normal"))
    painel.goto(0, -300)
    painel.write("Clique numa peça vizinha ao vazio   •   P ou Espaço: pausa   •   R: embaralhar   •   Esc: sair", align="center", font=("Arial", 12, "normal"))


def deslizar(casa):
    # Só anda a peça que encosta no vazio; ela troca de lugar com ele.
    if estado["fase"] != "jogando" or estado["pausado"]:
        return False
    pecas = estado["pecas"]
    casa_vazia = pecas.index(0)
    if casa not in vizinhos(casa_vazia):
        sz_audio.play("bloqueio.wav", volume=0.4)
        return False
    trocar(pecas, casa, casa_vazia)
    estado["movimentos"] += 1
    sz_audio.play("deslizar.wav", volume=0.4)
    desenhar_pecas()
    if pecas == RESOLVIDO:
        estado["fase"] = "fim"
        if estado["melhor"] is None or estado["movimentos"] < estado["melhor"]:
            estado["melhor"] = estado["movimentos"]
        sz_audio.play("vitoria.wav", volume=0.6)
    return True


def empurrar(dx, dy):
    # A peça anda no sentido da seta, então ela sai do lado oposto ao vazio.
    casa_vazia = estado["pecas"].index(0)
    coluna = casa_vazia % LADO - dx
    linha = casa_vazia // LADO - dy
    if 0 <= coluna < LADO and 0 <= linha < LADO:
        deslizar(linha * LADO + coluna)
    elif estado["fase"] == "jogando" and not estado["pausado"]:
        sz_audio.play("bloqueio.wav", volume=0.4)


def clicar(x, y):
    coluna = math.floor(x / CELULA + LADO / 2)
    linha = math.floor((CENTRO_Y - y) / CELULA + LADO / 2)
    if 0 <= coluna < LADO and 0 <= linha < LADO:
        deslizar(linha * LADO + coluna)


def pulsar():
    escala = 1
    if estado["relogio"] // PISCAR % 2 == 1:
        escala = 0.9
    if escala != estado["escala"]:
        estado["escala"] = escala
        vazio.shapesize(escala, escala)


def atualizar(tempo):
    # Um quadro muito atrasado conta no máximo LIMITE_QUADRO milissegundos.
    tempo = min(tempo, LIMITE_QUADRO)
    estado["relogio"] += tempo
    pulsar()
    # O relógio da partida só começa no primeiro movimento.
    if estado["fase"] == "jogando" and estado["movimentos"] > 0:
        estado["tempo"] += tempo


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
    estado["pecas"] = list(RESOLVIDO)
    while estado["pecas"] == RESOLVIDO:
        embaralhar(estado["pecas"], EMBARALHAR)
    estado["movimentos"] = 0
    estado["tempo"] = 0
    estado["fase"] = "jogando"
    estado["pausado"] = False
    estado["relogio"] = 0
    estado["escala"] = 1
    estado["painel"] = ""


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    vazio.shapesize(1, 1)
    desenhar_pecas()
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    sz_audio.play("embaralhar.wav", volume=0.5)
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
    tela.title("Quebra-cabeça de 15 • Sistema Zero")
    tela.bgcolor(COR_FUNDO)
    tela.tracer(0)
    tela.register_shape("moldura", moldura(CELULA - 8, 8))
    for desenho in [cenario, pincel, numeros, vazio, painel]:
        desenho.penup()
        desenho.speed(0)
    pincel.shape("square")
    pincel.shapesize((CELULA - 8) / 20)
    numeros.color(COR_NUMERO)
    vazio.shape("moldura")
    vazio.color(COR_VAZIO)
    vazio.showturtle()
    desenhar_cenario()
    tela.onkeypress(lambda: empurrar(-1, 0), "Left")
    tela.onkeypress(lambda: empurrar(1, 0), "Right")
    tela.onkeypress(lambda: empurrar(0, -1), "Up")
    tela.onkeypress(lambda: empurrar(0, 1), "Down")
    tela.onkey(pausar, "p")
    tela.onkey(pausar, "P")
    tela.onkey(pausar, "space")
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
