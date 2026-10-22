"""Pong educacional: raquetes, bola, placar e computador visíveis em blocos, Ponte e Python."""

import turtle
import random
import math
import time
import sz_audio


LARGURA = 900
ALTURA = 660
CAMPO_TOPO = 240
CAMPO_BASE = -270
RAQUETE_X = 400
RAQUETE_ALTURA = 90
RAQUETE_LARGURA = 14
RAIO_BOLA = 8
INTERVALO = 16
PASSO_FISICA = 8
VELOCIDADE_RAQUETE = 420
VELOCIDADE_COMPUTADOR = 300
VELOCIDADE_INICIAL = 330
VELOCIDADE_MAXIMA = 780
ACELERACAO = 1.06
ANGULO_MAXIMO = 55
ESPERA_SAQUE = 900
PONTOS_VITORIA = 7
COR_ESQUERDA = "#ffe14a"
COR_DIREITA = "#5cc8ff"
COR_BOLA = "#f8fafc"
estado = {"aberto": False, "timer_pendente": False, "computador": False}

tela = turtle.Screen()
campo = turtle.Turtle(visible=False)
raquete_esquerda = turtle.Turtle()
raquete_direita = turtle.Turtle()
bolinha = turtle.Turtle()
painel = turtle.Turtle(visible=False)


class Raquete:
    """Guarda a posição da raquete e as teclas que estão seguradas."""

    def __init__(self, x):
        self.x = x
        self.y = (CAMPO_TOPO + CAMPO_BASE) / 2
        self.subindo = False
        self.descendo = False

    def sentido(self):
        if self.subindo and not self.descendo:
            return 1
        if self.descendo and not self.subindo:
            return -1
        return 0

    def mover(self, distancia):
        # A raquete fica sempre presa dentro do campo.
        meia = RAQUETE_ALTURA / 2
        self.y = max(CAMPO_BASE + meia, min(CAMPO_TOPO - meia, self.y + distancia))

    def toca(self, bola):
        perto_x = abs(bola.x - self.x) <= RAQUETE_LARGURA / 2 + RAIO_BOLA
        perto_y = abs(bola.y - self.y) <= RAQUETE_ALTURA / 2 + RAIO_BOLA
        return perto_x and perto_y


class Bola:
    """A bola guarda posição (x, y) e velocidade (vx, vy) em pixels por segundo."""

    def __init__(self):
        self.x = 0
        self.y = (CAMPO_TOPO + CAMPO_BASE) / 2
        self.vx = 0
        self.vy = 0

    def rapidez(self):
        return math.sqrt(self.vx * self.vx + self.vy * self.vy)

    def lancar(self, lado, velocidade):
        angulo = math.radians(random.randint(-25, 25))
        self.vx = lado * velocidade * math.cos(angulo)
        self.vy = velocidade * math.sin(angulo)

    def andar(self, segundos):
        self.x += self.vx * segundos
        self.y += self.vy * segundos


def desenhar_campo():
    campo.clear()
    campo.color("#1e3a5f", "#0f1f33")
    campo.goto(-LARGURA / 2 + 20, CAMPO_BASE)
    campo.pendown()
    campo.begin_fill()
    for lado in range(2):
        campo.forward(LARGURA - 40)
        campo.left(90)
        campo.forward(CAMPO_TOPO - CAMPO_BASE)
        campo.left(90)
    campo.end_fill()
    campo.penup()
    # Linha tracejada do meio.
    campo.color("#35567d")
    campo.pensize(4)
    y = CAMPO_TOPO - 10
    while y > CAMPO_BASE:
        campo.goto(0, y)
        campo.pendown()
        campo.goto(0, y - 14)
        campo.penup()
        y -= 28


def desenhar_painel():
    lado_direito = "JOGADOR"
    if estado["computador"]:
        lado_direito = "COMPUTADOR"
    placar = str(estado["pontos"]["esquerda"]) + "     ×     " + str(estado["pontos"]["direita"])
    mensagem = "W/S: esquerda   •   ↑/↓: direita   •   C: computador   •   Espaço: pausa   •   R: reiniciar"
    if estado["fase"] == "fim":
        mensagem = estado["resultado"] + "   •   R para jogar de novo"
    if estado["pausado"]:
        mensagem = "PAUSA   •   Espaço para continuar"
    titulo = "PONG   •   direita: " + lado_direito + "   •   " + str(PONTOS_VITORIA) + " pontos vencem"
    texto = placar + mensagem + titulo
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel.clear()
    painel.goto(0, 278)
    painel.color("#f8fafc")
    painel.write(placar, align="center", font=("Arial", 26, "bold"))
    painel.goto(0, 250)
    painel.color("#9fc3e8")
    painel.write(titulo, align="center", font=("Arial", 12, "normal"))
    painel.goto(0, -310)
    painel.color("#c9e3ff")
    painel.write(mensagem, align="center", font=("Arial", 12, "normal"))


def desenhar():
    raquete_esquerda.goto(estado["esquerda"].x, estado["esquerda"].y)
    raquete_direita.goto(estado["direita"].x, estado["direita"].y)
    bolinha.goto(estado["bola"].x, estado["bola"].y)


def rebater(raquete, lado):
    bola = estado["bola"]
    # Só rebate a bola que vem na direção da raquete; assim ela nunca gruda.
    if bola.vx * lado <= 0 or not raquete.toca(bola):
        return False
    impacto = (bola.y - raquete.y) / (RAQUETE_ALTURA / 2 + RAIO_BOLA)
    angulo = math.radians(impacto * ANGULO_MAXIMO)
    velocidade = min(VELOCIDADE_MAXIMA, bola.rapidez() * ACELERACAO)
    bola.vx = -lado * velocidade * math.cos(angulo)
    bola.vy = velocidade * math.sin(angulo)
    bola.x = raquete.x - lado * (RAQUETE_LARGURA / 2 + RAIO_BOLA)
    sz_audio.play("rebater.wav", volume=0.5)
    return True


def quicar_paredes(bola):
    if bola.y + RAIO_BOLA > CAMPO_TOPO and bola.vy > 0:
        bola.y = CAMPO_TOPO - RAIO_BOLA
        bola.vy = -bola.vy
        sz_audio.play("parede.wav", volume=0.4)
    elif bola.y - RAIO_BOLA < CAMPO_BASE and bola.vy < 0:
        bola.y = CAMPO_BASE + RAIO_BOLA
        bola.vy = -bola.vy
        sz_audio.play("parede.wav", volume=0.4)


def marcar_ponto(vencedor, lado_que_sofreu):
    estado["pontos"][vencedor] += 1
    estado["bola"] = Bola()
    if estado["pontos"][vencedor] >= PONTOS_VITORIA:
        estado["fase"] = "fim"
        nome = "ESQUERDA"
        if vencedor == "direita":
            nome = "DIREITA"
        estado["resultado"] = "VITÓRIA DA " + nome + "!"
        sz_audio.play("vitoria.wav", volume=0.6)
        return
    sz_audio.play("ponto.wav", volume=0.5)
    # A bola recomeça no centro e vai para quem sofreu o ponto.
    estado["saque"] = ESPERA_SAQUE
    estado["lado_saque"] = lado_que_sofreu


def guiar_computador(raquete, segundos):
    bola = estado["bola"]
    alvo = (CAMPO_TOPO + CAMPO_BASE) / 2
    if bola.vx > 0:
        alvo = bola.y
    limite = VELOCIDADE_COMPUTADOR * segundos
    raquete.mover(max(-limite, min(limite, alvo - raquete.y)))


def passo_fisica(segundos):
    esquerda = estado["esquerda"]
    direita = estado["direita"]
    esquerda.mover(esquerda.sentido() * VELOCIDADE_RAQUETE * segundos)
    if estado["computador"]:
        guiar_computador(direita, segundos)
    else:
        direita.mover(direita.sentido() * VELOCIDADE_RAQUETE * segundos)
    bola = estado["bola"]
    if estado["saque"] > 0:
        estado["saque"] -= segundos * 1000
        if estado["saque"] <= 0:
            bola.lancar(estado["lado_saque"], VELOCIDADE_INICIAL)
        return
    bola.andar(segundos)
    quicar_paredes(bola)
    rebater(esquerda, -1)
    rebater(direita, 1)
    if bola.x < -LARGURA / 2:
        marcar_ponto("direita", -1)
    elif bola.x > LARGURA / 2:
        marcar_ponto("esquerda", 1)


def atualizar(tempo):
    if estado["fase"] != "jogando":
        return
    # Um quadro atrasado avança no máximo dois quadros, em passos curtos.
    restante = min(tempo, 2 * INTERVALO)
    while restante > 0 and estado["fase"] == "jogando":
        passo = min(restante, PASSO_FISICA)
        restante -= passo
        passo_fisica(passo / 1000)


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


def segurar(lado, sentido, apertada):
    raquete = estado[lado]
    if sentido == 1:
        raquete.subindo = apertada
    else:
        raquete.descendo = apertada


def ligar_tecla(tecla, lado, sentido):
    tela.onkeypress(lambda: segurar(lado, sentido, True), tecla)
    tela.onkeyrelease(lambda: segurar(lado, sentido, False), tecla)


def alternar_computador():
    estado["computador"] = not estado["computador"]
    estado["direita"].subindo = False
    estado["direita"].descendo = False


def pausar():
    if estado["fase"] == "jogando":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["fase"] = "jogando"
    estado["pausado"] = False
    estado["painel"] = ""
    estado["resultado"] = ""
    estado["pontos"] = {"esquerda": 0, "direita": 0}
    estado["esquerda"] = Raquete(-RAQUETE_X)
    estado["direita"] = Raquete(RAQUETE_X)
    estado["bola"] = Bola()
    estado["saque"] = ESPERA_SAQUE
    estado["lado_saque"] = random.choice([-1, 1])


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
    tela.title("Pong • Sistema Zero")
    tela.bgcolor("#071222")
    tela.tracer(0)
    for desenho in [campo, raquete_esquerda, raquete_direita, bolinha, painel]:
        desenho.penup()
        desenho.speed(0)
    for raquete in [raquete_esquerda, raquete_direita]:
        raquete.shape("square")
        raquete.shapesize(RAQUETE_ALTURA / 20, RAQUETE_LARGURA / 20)
    raquete_esquerda.color(COR_ESQUERDA)
    raquete_direita.color(COR_DIREITA)
    bolinha.shape("circle")
    bolinha.shapesize(RAIO_BOLA / 10)
    bolinha.color(COR_BOLA)
    desenhar_campo()
    ligar_tecla("w", "esquerda", 1)
    ligar_tecla("W", "esquerda", 1)
    ligar_tecla("s", "esquerda", -1)
    ligar_tecla("S", "esquerda", -1)
    ligar_tecla("Up", "direita", 1)
    ligar_tecla("Down", "direita", -1)
    tela.onkey(alternar_computador, "c")
    tela.onkey(alternar_computador, "C")
    tela.onkey(pausar, "space")
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
