# Céu Estrelado educacional: toda a lógica fica visível em blocos, Ponte e Python.

# 📦 Bibliotecas
import turtle
import random
import math
import time
import sz_audio


# 🎛️ Configurações
INTERVALO = 16
RITMO_ESTRELA = 350
MAX_ESTRELAS = 150
PONTAS = [5, 7, 9, 11]
TAMANHO_MINIMO = 12
TAMANHO_MAXIMO = 42
PASSO_LUNETA = 24
CEU_X = 370
CEU_BAIXO = -250
CEU_ALTO = 250
COR_LUNETA = "#67e8f9"
COR_LINHA = "#93c5fd"
CORES_ESTRELAS = ["#fff7ae", "#ffd166", "#ffffff", "#f9a8d4", "#c4b5fd", "#fdba74", "#bbf7d0"]


# 🧩 Meus moldes
class Estrela:
    """Uma estrela de N pontas: o desenho gira 180 - 180/N graus em cada ponta."""

    def __init__(self, x, y, pontas, tamanho, cor, feita_a_mao=False):
        self.x = x
        self.y = y
        self.pontas = pontas
        self.tamanho = tamanho
        self.cor = cor
        self.feita_a_mao = feita_a_mao

    def angulo(self):
        return 180 - 180 / self.pontas

    def raio(self):
        # As pontas ficam num círculo; cada risco liga duas pontas separadas por "salto".
        salto = (self.pontas - 1) / 2
        return self.tamanho / (2 * math.sin(math.pi * salto / self.pontas))

    def rumo_inicial(self):
        # Começando na ponta de cima, este é o rumo que leva à próxima ponta do desenho.
        return -90 * (self.pontas - 1) / self.pontas


def dentro_do_ceu(x, y):
    return -CEU_X <= x <= CEU_X and CEU_BAIXO <= y <= CEU_ALTO


def estrela_sorteada(x, y, feita_a_mao=False):
    return Estrela(x, y, random.choice(PONTAS), random.randint(TAMANHO_MINIMO, TAMANHO_MAXIMO),
                   random.choice(CORES_ESTRELAS), feita_a_mao)


def desenhar_estrela(estrela):
    pincel.goto(estrela.x, estrela.y + estrela.raio())
    pincel.setheading(estrela.rumo_inicial())
    pincel.color(estrela.cor)
    pincel.pendown()
    pincel.begin_fill()
    for ponta in range(estrela.pontas):
        pincel.forward(estrela.tamanho)
        pincel.right(estrela.angulo())
    pincel.end_fill()
    pincel.penup()


def ceu_cheio():
    return len(estado["estrelas"]) >= MAX_ESTRELAS


def adicionar(estrela):
    if ceu_cheio():
        return False
    estado["estrelas"].append(estrela)
    desenhar_estrela(estrela)
    if estrela.feita_a_mao:
        estado["mao"].append(estrela)
        if estado["constelacao"]:
            desenhar_constelacao()
    return True


def desenhar_constelacao():
    linhas.clear()
    if not estado["constelacao"] or len(estado["mao"]) < 2:
        return
    primeira = estado["mao"][0]
    linhas.goto(primeira.x, primeira.y)
    linhas.pendown()
    for estrela in estado["mao"]:
        linhas.goto(estrela.x, estrela.y)
    linhas.penup()


def desenhar_painel():
    situacao = "ENCHENDO"
    if estado["pausado"]:
        situacao = "PAUSADO"
    if ceu_cheio():
        situacao = "CÉU CHEIO: L limpa"
    placar = "ESTRELAS " + str(len(estado["estrelas"])) + " / " + str(MAX_ESTRELAS) + "     À MÃO " + str(len(estado["mao"])) + "     " + situacao
    mensagem = "Setas: luneta  •  Enter ou clique: estrela  •  C: constelação  •  L: limpar  •  Espaço: pausa"
    texto = placar + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 275)
    painel.color("#ffe14a")
    painel.write(placar, align="center", font=("Arial", 16, "bold"))
    painel.goto(0, -305)
    painel.color("#c7d2fe")
    painel.write(mensagem, align="center", font=("Arial", 11, "normal"))


def atualizar(tempo):
    if estado["pausado"] or ceu_cheio():
        return
    # Um atraso longo não pode despejar um monte de estrelas de uma vez.
    estado["acumulado"] = min(estado["acumulado"] + tempo, RITMO_ESTRELA * 2)
    while estado["acumulado"] >= RITMO_ESTRELA and not ceu_cheio():
        estado["acumulado"] -= RITMO_ESTRELA
        x = random.randint(-CEU_X, CEU_X)
        y = random.randint(CEU_BAIXO, CEU_ALTO)
        adicionar(estrela_sorteada(x, y))


def mover_luneta(dx, dy):
    x = min(CEU_X, max(-CEU_X, estado["luneta"][0] + dx * PASSO_LUNETA))
    y = min(CEU_ALTO, max(CEU_BAIXO, estado["luneta"][1] + dy * PASSO_LUNETA))
    estado["luneta"] = (x, y)
    luneta.goto(x, y)


def luneta_para_direita():
    mover_luneta(1, 0)


def luneta_para_esquerda():
    mover_luneta(-1, 0)


def luneta_para_cima():
    mover_luneta(0, 1)


def luneta_para_baixo():
    mover_luneta(0, -1)


def por_estrela(x, y):
    if dentro_do_ceu(x, y) and adicionar(estrela_sorteada(x, y, True)):
        sz_audio.play("brilho.wav", volume=0.5)


def estrela_na_luneta():
    por_estrela(estado["luneta"][0], estado["luneta"][1])


def alternar_constelacao():
    estado["constelacao"] = not estado["constelacao"]
    desenhar_constelacao()
    if estado["constelacao"]:
        sz_audio.play("constelacao.wav", volume=0.5)


def pausar():
    estado["pausado"] = not estado["pausado"]
    estado["ultimo_tempo"] = time.monotonic()


def esvaziar():
    pincel.clear()
    estado["estrelas"] = []
    estado["mao"] = []
    estado["acumulado"] = 0
    desenhar_constelacao()


def limpar():
    esvaziar()
    sz_audio.play("limpar.wav", volume=0.5)


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    estado["pausado"] = False
    estado["constelacao"] = False
    estado["painel"] = ""
    esvaziar()
    estado["luneta"] = (0, 0)
    luneta.goto(0, 0)
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    sz_audio.play("abertura.wav", volume=0.5)
    tela.update()


def fechar():
    if not estado["aberto"]:
        return
    estado["aberto"] = False
    sz_audio.stop()
    tela.bye()


# ⚙️ Ao iniciar
estado = {"aberto": True}

tela = turtle.Screen()
pincel = turtle.Turtle(visible=False)
linhas = turtle.Turtle(visible=False)
luneta = turtle.Turtle(visible=False)
painel = turtle.Turtle(visible=False)

tela.setup(800, 650)
tela.title("Céu Estrelado • Sistema Zero")
tela.bgcolor("#0b1026")
tela.tracer(0)
for desenho in [pincel, linhas, luneta, painel]:
    desenho.penup()
    desenho.speed(0)
linhas.color(COR_LINHA)
linhas.pensize(2)
luneta.shape("circle")
luneta.color(COR_LUNETA)
luneta.shapesize(0.9)
luneta.showturtle()
reiniciar()


# ⚡ Quando acontecer
tela.onkeypress(luneta_para_direita, "Right")
tela.onkeypress(luneta_para_esquerda, "Left")
tela.onkeypress(luneta_para_cima, "Up")
tela.onkeypress(luneta_para_baixo, "Down")
tela.onkey(estrela_na_luneta, "Return")
tela.onkey(alternar_constelacao, "c")
tela.onkey(alternar_constelacao, "C")
tela.onkey(limpar, "l")
tela.onkey(limpar, "L")
tela.onkey(pausar, "space")
tela.onkey(pausar, "p")
tela.onkey(pausar, "P")
tela.onkey(reiniciar, "r")
tela.onkey(reiniciar, "R")
tela.onkey(fechar, "Escape")
tela.onscreenclick(por_estrela)
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
