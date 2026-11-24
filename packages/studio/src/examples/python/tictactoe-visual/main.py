# Jogo da Velha educacional: casas, vez, vitória e computador visíveis em blocos.

# 📦 Bibliotecas
import turtle
import random
import time
import math
import sz_audio


# 🎛️ Configurações
CELULA = 150
CENTRO_Y = -20
INTERVALO = 16
LIMITE_QUADRO = 100
DEMORA_COMPUTADOR = 600
PISCAR = 450
ESPESSURA = 14
COR_FUNDO = "#0f172a"
COR_GRADE = "#475569"
COR_X = "#f87171"
COR_O = "#facc15"
COR_CURSOR = "#38bdf8"
COR_VITORIA = "#4ade80"
# As casas seguem o teclado numérico: 1 2 3 embaixo, 4 5 6 no meio, 7 8 9 em cima.
LINHAS = [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)]
CANTOS = [0, 2, 6, 8]


# 🧩 Meus moldes
def posicao(casa):
    return ((casa % 3 - 1) * CELULA, (casa // 3 - 1) * CELULA + CENTRO_Y)


def linha_vencedora(tabuleiro):
    for linha in LINHAS:
        a, b, c = linha
        if tabuleiro[a] != "" and tabuleiro[a] == tabuleiro[b] == tabuleiro[c]:
            return linha
    return None


def casa_que_fecha(tabuleiro, peca):
    # Uma linha com duas peças iguais e uma casa vazia fecha na casa vazia.
    for a, b, c in LINHAS:
        trio = [tabuleiro[a], tabuleiro[b], tabuleiro[c]]
        if trio.count(peca) == 2 and trio.count("") == 1:
            return [a, b, c][trio.index("")]
    return None


def escolher_casa(tabuleiro):
    # Ganhar se puder; senão bloquear o X; depois centro, cantos e qualquer casa.
    for peca in ["O", "X"]:
        casa = casa_que_fecha(tabuleiro, peca)
        if casa is not None:
            return casa
    if tabuleiro[4] == "":
        return 4
    livres = []
    for casa in CANTOS:
        if tabuleiro[casa] == "":
            livres.append(casa)
    if len(livres) == 0:
        for casa in range(9):
            if tabuleiro[casa] == "":
                livres.append(casa)
    return random.choice(livres)


def moldura(lado, espessura):
    # Contorno por fora e furo por dentro: o cursor não cobre a peça.
    m = lado / 2
    d = m - espessura
    return ((-m, -m), (-m, m), (m, m), (m, -m), (-m, -m), (-d, -d), (d, -d), (d, d), (-d, d), (-d, -d))


def desenhar_cenario():
    cenario.clear()
    cenario.color(COR_GRADE)
    cenario.pensize(8)
    for k in [-0.5, 0.5]:
        cenario.goto(k * CELULA, CENTRO_Y - 1.5 * CELULA)
        cenario.pendown()
        cenario.goto(k * CELULA, CENTRO_Y + 1.5 * CELULA)
        cenario.penup()
        cenario.goto(-1.5 * CELULA, CENTRO_Y + k * CELULA)
        cenario.pendown()
        cenario.goto(1.5 * CELULA, CENTRO_Y + k * CELULA)
        cenario.penup()


def desenhar_peca(casa, peca):
    x, y = posicao(casa)
    r = CELULA * 0.3
    pincel.pensize(ESPESSURA)
    if peca == "X":
        pincel.color(COR_X)
        for dx in [-1, 1]:
            pincel.goto(x - r, y - r * dx)
            pincel.pendown()
            pincel.goto(x + r, y + r * dx)
            pincel.penup()
    else:
        pincel.color(COR_O)
        pincel.goto(x, y - r)
        pincel.setheading(0)
        pincel.pendown()
        pincel.circle(r)
        pincel.penup()


def desenhar_vitoria(linha):
    x0, y0 = posicao(linha[0])
    x1, y1 = posicao(linha[2])
    destaque.color(COR_VITORIA)
    destaque.pensize(10)
    destaque.goto(x0 + (x0 - x1) * 0.2, y0 + (y0 - y1) * 0.2)
    destaque.pendown()
    destaque.goto(x1 + (x1 - x0) * 0.2, y1 + (y1 - y0) * 0.2)
    destaque.penup()


def mostrar_cursor():
    cursor.goto(posicao(estado["cursor"]))


def desenhar_painel():
    placar = estado["placar"]
    linha1 = "X  " + str(placar["X"]) + "     O  " + str(placar["O"]) + "     EMPATES  " + str(placar["empates"])
    modo = "2 JOGADORES"
    if estado["computador"]:
        modo = "VOCÊ (X) CONTRA O COMPUTADOR (O)"
    mensagem = "Vez do " + estado["vez"]
    if estado["fase"] == "fim":
        mensagem = estado["resultado"] + "   Enter, clique ou R: nova rodada"
    elif estado["aviso"] != "":
        mensagem = estado["aviso"]
    texto = linha1 + modo + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 300)
    painel.color("#e2e8f0")
    painel.write(linha1, align="center", font=("Arial", 20, "bold"))
    painel.goto(0, 272)
    painel.color("#94a3b8")
    painel.write(modo, align="center", font=("Arial", 12, "normal"))
    painel.goto(0, 228)
    painel.color(COR_X)
    if estado["vez"] == "O":
        painel.color(COR_O)
    if estado["fase"] == "fim":
        painel.color(COR_VITORIA)
    painel.write(mensagem, align="center", font=("Arial", 16, "bold"))
    painel.goto(0, -300)
    painel.color("#cbd5e1")
    painel.write("Teclas 1 a 9 (como o teclado numérico) ou setas + Enter/Espaço   •   clique na casa", align="center", font=("Arial", 12, "normal"))
    painel.goto(0, -325)
    painel.write("C: contra o computador   •   R: nova rodada   •   Esc: sair", align="center", font=("Arial", 12, "normal"))


def terminar(chave, linha):
    estado["fase"] = "fim"
    estado["placar"][chave] += 1
    if linha is None:
        estado["resultado"] = "EMPATE!"
        sz_audio.play("empate.wav", volume=0.5)
        return
    estado["linha"] = linha
    estado["resultado"] = chave + " VENCEU!"
    desenhar_vitoria(linha)
    sz_audio.play("vitoria.wav", volume=0.6)


def marcar(casa):
    tabuleiro = estado["tabuleiro"]
    if tabuleiro[casa] != "":
        estado["aviso"] = "Essa casa já está ocupada. Escolha outra."
        sz_audio.play("recusa.wav", volume=0.5)
        return False
    estado["aviso"] = ""
    tabuleiro[casa] = estado["vez"]
    desenhar_peca(casa, estado["vez"])
    sz_audio.play("jogada.wav", volume=0.5)
    linha = linha_vencedora(tabuleiro)
    if linha is not None:
        terminar(estado["vez"], linha)
    elif "" not in tabuleiro:
        terminar("empates", None)
    elif estado["vez"] == "X":
        estado["vez"] = "O"
        estado["espera"] = 0
    else:
        estado["vez"] = "X"
    return True


def tocar(casa):
    # Tecla numérica, Enter ou clique chegam aqui.
    if estado["fase"] == "fim":
        reiniciar()
        return
    if estado["computador"] and estado["vez"] == "O":
        return
    estado["cursor"] = casa
    mostrar_cursor()
    marcar(casa)


def jogar_na_casa_1():
    tocar(0)


def jogar_na_casa_2():
    tocar(1)


def jogar_na_casa_3():
    tocar(2)


def jogar_na_casa_4():
    tocar(3)


def jogar_na_casa_5():
    tocar(4)


def jogar_na_casa_6():
    tocar(5)


def jogar_na_casa_7():
    tocar(6)


def jogar_na_casa_8():
    tocar(7)


def jogar_na_casa_9():
    tocar(8)


def marcar_no_cursor():
    tocar(estado["cursor"])


def mover(dc, dl):
    coluna = estado["cursor"] % 3 + dc
    linha = estado["cursor"] // 3 + dl
    if 0 <= coluna < 3 and 0 <= linha < 3:
        estado["cursor"] = linha * 3 + coluna
        mostrar_cursor()


def cursor_para_direita():
    mover(1, 0)


def cursor_para_esquerda():
    mover(-1, 0)


def cursor_para_cima():
    mover(0, 1)


def cursor_para_baixo():
    mover(0, -1)


def clicar(x, y):
    coluna = math.floor(x / CELULA + 1.5)
    linha = math.floor((y - CENTRO_Y) / CELULA + 1.5)
    if 0 <= coluna < 3 and 0 <= linha < 3:
        tocar(linha * 3 + coluna)


def pulsar():
    # O cursor respira: muda de tamanho, mas nunca some.
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
    if estado["fase"] == "jogando" and estado["computador"] and estado["vez"] == "O":
        estado["espera"] += tempo
        if estado["espera"] >= DEMORA_COMPUTADOR:
            marcar(escolher_casa(estado["tabuleiro"]))


def alternar_computador():
    estado["computador"] = not estado["computador"]
    estado["placar"] = {"X": 0, "O": 0, "empates": 0}
    reiniciar()


def reiniciar_modelo():
    estado["tabuleiro"] = ["", "", "", "", "", "", "", "", ""]
    estado["vez"] = "X"
    estado["fase"] = "jogando"
    estado["resultado"] = ""
    estado["aviso"] = ""
    estado["linha"] = None
    estado["cursor"] = 4
    estado["espera"] = 0
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
    cursor.shapesize(1, 1)
    mostrar_cursor()
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    tela.update()


def fechar():
    if not estado["aberto"]:
        return
    estado["aberto"] = False
    sz_audio.stop()
    tela.bye()


# ⚙️ Ao iniciar
estado = {"aberto": True, "computador": False}

tela = turtle.Screen()
cenario = turtle.Turtle(visible=False)
pincel = turtle.Turtle(visible=False)
destaque = turtle.Turtle(visible=False)
cursor = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)

tela.setup(600, 700)
tela.title("Jogo da Velha • Sistema Zero")
tela.bgcolor(COR_FUNDO)
tela.tracer(0)
tela.register_shape("moldura", moldura(CELULA - 12, 8))
for desenho in [cenario, pincel, destaque, cursor, painel]:
    desenho.penup()
    desenho.speed(0)
cursor.shape("moldura")
cursor.color(COR_CURSOR)
cursor.showturtle()
desenhar_cenario()
estado["placar"] = {"X": 0, "O": 0, "empates": 0}
reiniciar()


# ⚡ Quando acontecer
tela.onkey(jogar_na_casa_1, "1")
tela.onkey(jogar_na_casa_2, "2")
tela.onkey(jogar_na_casa_3, "3")
tela.onkey(jogar_na_casa_4, "4")
tela.onkey(jogar_na_casa_5, "5")
tela.onkey(jogar_na_casa_6, "6")
tela.onkey(jogar_na_casa_7, "7")
tela.onkey(jogar_na_casa_8, "8")
tela.onkey(jogar_na_casa_9, "9")
tela.onkeypress(cursor_para_direita, "Right")
tela.onkeypress(cursor_para_esquerda, "Left")
tela.onkeypress(cursor_para_cima, "Up")
tela.onkeypress(cursor_para_baixo, "Down")
tela.onkey(marcar_no_cursor, "Return")
tela.onkey(marcar_no_cursor, "space")
tela.onkey(alternar_computador, "c")
tela.onkey(alternar_computador, "C")
tela.onkey(reiniciar, "r")
tela.onkey(reiniciar, "R")
tela.onkey(fechar, "Escape")
tela.onscreenclick(clicar)
tela.listen()


# 🔁 Enquanto estiver rodando
def a_cada_quadro():
    if not estado["aberto"]:
        return
    agora = time.monotonic()
    tempo = max(0, (agora - estado["ultimo_tempo"]) * 1000)
    estado["ultimo_tempo"] = agora
    atualizar(tempo)
    desenhar_painel()
    tela.update()
    # Se a janela fechou durante esta volta, o laço para aqui.
    if not estado["aberto"]:
        return
    tela.ontimer(a_cada_quadro, INTERVALO)


a_cada_quadro()
tela.mainloop()
