"""Ligue 4 educacional: queda das peças, vez e vitória em quatro direções visíveis em blocos."""

import turtle
import time
import math
import sz_audio


CELULA = 80
COLUNAS = 7
LINHAS = 6
CENTRO_Y = -40
SETA_Y = 250
INTERVALO = 16
LIMITE_QUADRO = 100
QUEDA = 900
PISCAR = 450
COR_FUNDO = "#0b1220"
COR_TABULEIRO = "#1d4ed8"
COR_VERMELHO = "#ef4444"
COR_AMARELO = "#facc15"
COR_CURSOR = "#38bdf8"
COR_VITORIA = "#f8fafc"
CORES = {"vermelho": COR_VERMELHO, "amarelo": COR_AMARELO}
DIRECOES = [(1, 0), (0, 1), (1, 1), (1, -1)]
estado = {"aberto": False, "timer_pendente": False}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
destaque = turtle.Turtle(visible=False)
queda = turtle.Turtle(visible=False)
cursor = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)


def posicao(coluna, linha):
    return ((coluna - (COLUNAS - 1) / 2) * CELULA, (linha - (LINHAS - 1) / 2) * CELULA + CENTRO_Y)


def peca(grade, coluna, linha):
    # Fora do tabuleiro ou acima da pilha é vazio.
    if 0 <= coluna < COLUNAS and 0 <= linha < len(grade[coluna]):
        return grade[coluna][linha]
    return ""


def linha_vencedora(grade, coluna, linha):
    jogador = peca(grade, coluna, linha)
    for dx, dy in DIRECOES:
        casas = [(coluna, linha)]
        for sentido in [1, -1]:
            passo = 1
            while peca(grade, coluna + dx * passo * sentido, linha + dy * passo * sentido) == jogador:
                casas.append((coluna + dx * passo * sentido, linha + dy * passo * sentido))
                passo += 1
        if len(casas) >= 4:
            return casas
    return None


def tabuleiro_cheio(grade):
    for pilha in grade:
        if len(pilha) < LINHAS:
            return False
    return True


def desenhar_cenario():
    cenario.clear()
    x, y = posicao(-0.5, -0.5)
    cenario.goto(x, y)
    cenario.color(COR_TABULEIRO)
    cenario.pendown()
    cenario.begin_fill()
    for lado in range(2):
        cenario.forward(COLUNAS * CELULA)
        cenario.left(90)
        cenario.forward(LINHAS * CELULA)
        cenario.left(90)
    cenario.end_fill()
    cenario.penup()
    for coluna in range(COLUNAS):
        for linha in range(LINHAS):
            cenario.goto(posicao(coluna, linha))
            cenario.dot(CELULA * 0.8, COR_FUNDO)


def mostrar_cursor():
    x, y = posicao(estado["cursor"], 0)
    cursor.goto(x, SETA_Y)


def desenhar_painel():
    placar = estado["placar"]
    linha1 = "VERMELHO  " + str(placar["vermelho"]) + "     AMARELO  " + str(placar["amarelo"]) + "     EMPATES  " + str(placar["empates"])
    mensagem = "Vez do " + estado["vez"]
    if estado["fase"] == "fim":
        mensagem = estado["resultado"] + "   Enter, clique ou R: nova rodada"
    elif estado["aviso"] != "":
        mensagem = estado["aviso"]
    texto = linha1 + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 318)
    painel.color("#e2e8f0")
    painel.write(linha1, align="center", font=("Arial", 18, "bold"))
    painel.goto(0, 278)
    painel.color(CORES[estado["vez"]])
    if estado["fase"] == "fim":
        painel.color(COR_VITORIA)
    painel.write(mensagem, align="center", font=("Arial", 15, "bold"))
    painel.goto(0, -318)
    painel.color("#cbd5e1")
    painel.write("Teclas 1 a 7 soltam na coluna   •   ← → movem a seta, Enter ou ↓ soltam   •   clique na coluna", align="center", font=("Arial", 12, "normal"))
    painel.goto(0, -343)
    painel.write("R: nova rodada   •   Esc: sair", align="center", font=("Arial", 12, "normal"))


def terminar(chave, casas):
    estado["fase"] = "fim"
    estado["placar"][chave] += 1
    if casas is None:
        estado["resultado"] = "EMPATE! O tabuleiro encheu."
        sz_audio.play("empate.wav", volume=0.5)
        return
    estado["vencedoras"] = casas
    estado["resultado"] = chave.upper() + " LIGOU 4!"
    for coluna, linha in casas:
        destaque.goto(posicao(coluna, linha))
        destaque.dot(CELULA * 0.3, COR_VITORIA)
    sz_audio.play("vitoria.wav", volume=0.6)


def soltar(coluna):
    if estado["fase"] == "fim":
        reiniciar()
        return
    if estado["fase"] != "jogando":
        return
    if len(estado["grade"][coluna]) >= LINHAS:
        estado["aviso"] = "Essa coluna está cheia. Escolha outra."
        sz_audio.play("recusa.wav", volume=0.5)
        return
    estado["aviso"] = ""
    estado["fase"] = "caindo"
    x, y = posicao(coluna, LINHAS - 0.5)
    estado["queda"] = {"coluna": coluna, "linha": len(estado["grade"][coluna]), "x": x, "y": y}
    queda.color(CORES[estado["vez"]])
    queda.goto(x, y)
    queda.showturtle()


def pousar():
    cair = estado["queda"]
    estado["grade"][cair["coluna"]].append(estado["vez"])
    queda.hideturtle()
    pincel.goto(posicao(cair["coluna"], cair["linha"]))
    pincel.dot(CELULA * 0.8, CORES[estado["vez"]])
    sz_audio.play("encaixe.wav", volume=0.5)
    casas = linha_vencedora(estado["grade"], cair["coluna"], cair["linha"])
    if casas is not None:
        terminar(estado["vez"], casas)
    elif tabuleiro_cheio(estado["grade"]):
        terminar("empates", None)
    else:
        estado["fase"] = "jogando"
        if estado["vez"] == "vermelho":
            estado["vez"] = "amarelo"
        else:
            estado["vez"] = "vermelho"


def escolher(coluna):
    estado["cursor"] = coluna
    mostrar_cursor()
    soltar(coluna)


def tecla_coluna(coluna):
    return lambda: escolher(coluna)


def mover(dx):
    coluna = estado["cursor"] + dx
    if 0 <= coluna < COLUNAS:
        estado["cursor"] = coluna
        mostrar_cursor()


def clicar(x, y):
    coluna = math.floor(x / CELULA + COLUNAS / 2)
    if 0 <= coluna < COLUNAS:
        escolher(coluna)


def pulsar():
    escala = 1
    if estado["relogio"] // PISCAR % 2 == 1:
        escala = 0.85
    if escala != estado["escala"]:
        estado["escala"] = escala
        cursor.shapesize(escala, escala)


def atualizar(tempo):
    # Um quadro muito atrasado conta no máximo LIMITE_QUADRO milissegundos.
    tempo = min(tempo, LIMITE_QUADRO)
    estado["relogio"] += tempo
    pulsar()
    if estado["fase"] == "caindo":
        cair = estado["queda"]
        destino = posicao(cair["coluna"], cair["linha"])[1]
        cair["y"] -= QUEDA * tempo / 1000
        if cair["y"] <= destino:
            pousar()
        else:
            queda.goto(cair["x"], cair["y"])


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


def reiniciar_modelo():
    estado["grade"] = []
    for coluna in range(COLUNAS):
        estado["grade"].append([])
    estado["vez"] = "vermelho"
    estado["fase"] = "jogando"
    estado["resultado"] = ""
    estado["aviso"] = ""
    estado["vencedoras"] = None
    estado["queda"] = None
    estado["cursor"] = COLUNAS // 2
    estado["relogio"] = 0
    estado["escala"] = 1
    estado["painel"] = ""


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    pincel.clear()
    destaque.clear()
    queda.hideturtle()
    cursor.shapesize(1, 1)
    mostrar_cursor()
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
    tela.setup(700, 720)
    tela.title("Ligue 4 • Sistema Zero")
    tela.bgcolor(COR_FUNDO)
    tela.tracer(0)
    tela.register_shape("seta", ((-18, 14), (18, 14), (0, -14)))
    for desenho in [cenario, pincel, destaque, queda, cursor, painel]:
        desenho.penup()
        desenho.speed(0)
    queda.shape("circle")
    queda.shapesize(CELULA * 0.8 / 20)
    cursor.shape("seta")
    cursor.setheading(90)
    cursor.color(COR_CURSOR)
    cursor.showturtle()
    desenhar_cenario()
    for numero in range(1, COLUNAS + 1):
        tela.onkey(tecla_coluna(numero - 1), str(numero))
    tela.onkeypress(lambda: mover(1), "Right")
    tela.onkeypress(lambda: mover(-1), "Left")
    tela.onkey(lambda: soltar(estado["cursor"]), "Down")
    tela.onkey(lambda: soltar(estado["cursor"]), "Return")
    tela.onkey(lambda: soltar(estado["cursor"]), "space")
    tela.onkey(reiniciar, "r")
    tela.onkey(reiniciar, "R")
    tela.onkey(fechar, "Escape")
    tela.onscreenclick(clicar)
    tela.listen()
    estado["aberto"] = True
    estado["placar"] = {"vermelho": 0, "amarelo": 0, "empates": 0}
    reiniciar()
    agendar()
    if estado["aberto"]:
        tela.mainloop()


if __name__ == "__main__":
    iniciar()
