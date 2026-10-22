"""Pac-Man educacional: toda a lógica fica visível em blocos, Ponte e Python."""

import turtle
import math
import random
import time
import sz_audio


CELULA = 28
COLUNAS = 31
LINHAS = 25
INTERVALO = 16
INICIO = (15, 23)
DIRECOES = [(1, 0), (0, 1), (-1, 0), (0, -1)]
CORES = ["#ff6384", "#60d5ff", "#ffa657", "#c99cff", "#73edb3", "#ff95da", "#c9ee64"]
NINHOS = [(1, 1), (7, 1), (15, 1), (23, 1), (29, 1), (7, 7), (23, 7)]
MAPA = [
    "###############################",
    "#o...........................o#",
    "#.#####.#######.#######.#####.#",
    "#.#####.#######.#######.#####.#",
    "#.............................#",
    "#.#####.#######.#######.#####.#",
    "#.#####.#######.#######.#####.#",
    "#.............................#",
    "#.#####.#######.#######.#####.#",
    "#.#####.#######.#######.#####.#",
    "#.............................#",
    "#.#####.#######.#######.#####.#",
    "...............................",
    "#.#####.#######.#######.#####.#",
    "#.............................#",
    "#.#####.#######.#######.#####.#",
    "#.#####.#######.#######.#####.#",
    "#.............................#",
    "#.#####.#######.#######.#####.#",
    "#.#####.#######.#######.#####.#",
    "#.............................#",
    "#.#####.#######.#######.#####.#",
    "#.#####.#######.#######.#####.#",
    "#o...........................o#",
    "###############################",
]
estado = {"aberto": False, "timer_pendente": False}
objetos = {}


def posicao(coluna, linha):
    return ((coluna - 15) * CELULA, 330 - linha * CELULA)


def destino(coluna, linha, dx, dy):
    nova_coluna = coluna + dx
    nova_linha = linha + dy
    if linha == 12 and dy == 0:
        nova_coluna = nova_coluna % COLUNAS
    if 0 <= nova_coluna < COLUNAS and 0 <= nova_linha < LINHAS:
        if MAPA[nova_linha][nova_coluna] != "#":
            return (nova_coluna, nova_linha)
    return (-1, -1)


def criar_ator(coluna, linha, numero):
    x, y = posicao(coluna, linha)
    return {"coluna": coluna, "linha": linha, "x": x, "y": y,
            "antes_x": x, "antes_y": y, "dx": 0, "dy": 0,
            "restante": 0, "alvo": (coluna, linha), "numero": numero}


def reposicionar():
    estado["jogador"] = criar_ator(INICIO[0], INICIO[1], -1)
    estado["inimigos"] = []
    for numero in range(len(NINHOS)):
        coluna, linha = NINHOS[numero]
        estado["inimigos"].append(criar_ator(coluna, linha, numero))
    estado["direcao"] = (0, 0)
    estado["protecao"] = 1500


def escolher_direcao(ator):
    if ator["numero"] == -1:
        dx, dy = estado["direcao"]
        if destino(ator["coluna"], ator["linha"], dx, dy) != (-1, -1):
            ator["dx"], ator["dy"] = dx, dy
        return
    caminhos = []
    for dx, dy in DIRECOES:
        if destino(ator["coluna"], ator["linha"], dx, dy) != (-1, -1):
            caminhos.append((dx, dy))
    oposto = (-ator["dx"], -ator["dy"])
    if len(caminhos) > 1 and oposto in caminhos:
        caminhos.remove(oposto)
    jogador = estado["jogador"]
    distancia = abs(ator["coluna"] - jogador["coluna"]) + abs(ator["linha"] - jogador["linha"])
    escolha = random.choice(caminhos)
    if distancia <= 7:
        # Alguns perseguem a posição; outros antecipam uma ou duas casas.
        antecipacao = ator["numero"] % 3
        alvo_x = jogador["coluna"] + jogador["dx"] * antecipacao
        alvo_y = jogador["linha"] + jogador["dy"] * antecipacao
        melhor = 1000
        random.shuffle(caminhos)
        for dx, dy in caminhos:
            coluna, linha = destino(ator["coluna"], ator["linha"], dx, dy)
            distancia = abs(coluna - alvo_x) + abs(linha - alvo_y)
            if distancia < melhor:
                melhor = distancia
                escolha = (dx, dy)
    ator["dx"], ator["dy"] = escolha


def mover(ator, distancia):
    visitados = []
    ator["antes_x"], ator["antes_y"] = ator["x"], ator["y"]
    while distancia > 0:
        if ator["restante"] == 0:
            escolher_direcao(ator)
            if ator["dx"] == 0 and ator["dy"] == 0:
                break
            alvo = destino(ator["coluna"], ator["linha"], ator["dx"], ator["dy"])
            if alvo == (-1, -1):
                break
            if abs(alvo[0] - ator["coluna"]) > 1:
                # O túnel liga as bordas; não atravessamos o centro do mapa.
                ator["coluna"], ator["linha"] = alvo
                ator["x"], ator["y"] = posicao(alvo[0], alvo[1])
                ator["antes_x"], ator["antes_y"] = ator["x"], ator["y"]
                visitados.append(alvo)
                continue
            ator["alvo"] = alvo
            ator["restante"] = CELULA
        passo = min(distancia, ator["restante"])
        ator["x"] += ator["dx"] * passo
        ator["y"] -= ator["dy"] * passo
        ator["restante"] -= passo
        distancia -= passo
        if ator["restante"] < 0.000001:
            ator["restante"] = 0
            ator["coluna"], ator["linha"] = ator["alvo"]
            ator["x"], ator["y"] = posicao(ator["coluna"], ator["linha"])
            visitados.append((ator["coluna"], ator["linha"]))
    return visitados


def colidir(jogador, inimigo):
    # Distância entre os trajetos neste quadro: cruzar não evita a colisão.
    x = jogador["antes_x"] - inimigo["antes_x"]
    y = jogador["antes_y"] - inimigo["antes_y"]
    vx = jogador["x"] - inimigo["x"] - x
    vy = jogador["y"] - inimigo["y"] - y
    tamanho = vx * vx + vy * vy
    proporcao = 0
    if tamanho > 0:
        proporcao = max(0, min(1, -(x * vx + y * vy) / tamanho))
    return math.hypot(x + vx * proporcao, y + vy * proporcao) < 20


def desenhar_mapa():
    lapis = objetos["lapis"]
    lapis.clear()
    estado["pontos"] = {}
    for simbolo in ["#", ".", "o"]:
        lapis.shape("circle")
        lapis.color("#fff0c4")
        lapis.shapesize(0.16)
        if simbolo == "#":
            lapis.shape("square")
            lapis.color("#355dff", "#112878")
            lapis.shapesize(1.3)
        if simbolo == "o":
            lapis.color("#fff8b0", "#ffb52e")
            lapis.shapesize(0.48)
        for linha in range(LINHAS):
            for coluna in range(COLUNAS):
                if MAPA[linha][coluna] == simbolo:
                    lapis.goto(posicao(coluna, linha))
                    carimbo = lapis.stamp()
                    if simbolo != "#":
                        estado["pontos"][(coluna, linha)] = (carimbo, simbolo)
    # A bolinha de nascimento desaparece sem dar pontos.
    lapis.clearstamp(estado["pontos"][INICIO][0])
    del estado["pontos"][INICIO]


def mostrar_ator(desenho, forma, cor, x, y, angulo):
    if desenho.shape() != forma:
        desenho.shape(forma)
    desenho.color(cor)
    desenho.setheading(angulo)
    desenho.goto(x, y)
    desenho.showturtle()


def desenhar_atores():
    if estado["fase"] == "fim":
        for desenho in objetos["atores"] + [objetos["heroi"]]:
            desenho.hideturtle()
        return
    for inimigo in estado["inimigos"]:
        forma = "inimigo_" + str(inimigo["numero"]) + "_" + str(inimigo["dx"]) + "_" + str(inimigo["dy"])
        desenho = objetos["atores"][inimigo["numero"]]
        mostrar_ator(desenho, forma, CORES[inimigo["numero"]], inimigo["x"], inimigo["y"], 90)
    jogador = estado["jogador"]
    if estado["protecao"] == 0 or int(estado["animacao"] / 100) % 2 == 0:
        angulo = math.degrees(math.atan2(-jogador["dy"], jogador["dx"]))
        forma = "heroi"
        if int(estado["animacao"] / 100) % 2 == 0:
            forma = "circle"
        cor = "#ffe14a"
        if estado["bonus"] > 0:
            cor = "#ffffff"
        # Polígonos Turtle apontam para o eixo local y; +90 alinha nossa boca.
        mostrar_ator(objetos["heroi"], forma, cor, jogador["x"], jogador["y"], angulo + 90)
    else:
        objetos["heroi"].hideturtle()


def desenhar_painel():
    mensagem = ""
    if estado["fase"] == "abertura":
        mensagem = "PREPARE-SE!  " + str(math.ceil(estado["espera"] / 1000))
    if estado["fase"] == "fim":
        mensagem = estado["resultado"] + "  •  R para jogar de novo"
    if estado["pausado"]:
        mensagem = "PAUSA  •  Espaço para continuar"
    placar = "PONTOS  " + str(estado["placar"]) + "     VIDAS  " + str(estado["vidas"])
    if estado["bonus"] > 0:
        placar += "     TURBO  " + str(math.ceil(estado["bonus"] / 1000))
    texto = placar + mensagem
    if texto == estado["painel"]:
        return
    estado["painel"] = texto
    painel = objetos["painel"]
    painel.clear()
    painel.goto(0, 385)
    painel.color("#ffe14a")
    painel.write("PAC-MAN • LABIRINTO CRIATIVO", align="center", font=("Arial", 22, "bold"))
    painel.goto(0, 353)
    painel.color("white")
    painel.write(placar, align="center", font=("Arial", 15, "bold"))
    painel.goto(0, -386)
    painel.color("#9cb0dd")
    painel.write("Setas: mover   •   Espaço/P: pausa   •   R: reiniciar   •   Esc: sair", align="center", font=("Arial", 12, "normal"))
    painel.goto(0, -418)
    painel.color("#ffe14a")
    painel.write(mensagem, align="center", font=("Arial", 16, "bold"))


def terminar(mensagem):
    estado["fase"] = "fim"
    estado["resultado"] = mensagem
    estado["espera"] = 3000
    estado["bonus"] = 0


def coletar(casa):
    if casa not in estado["pontos"]:
        return
    carimbo, simbolo = estado["pontos"].pop(casa)
    objetos["lapis"].clearstamp(carimbo)
    if simbolo == "o":
        estado["placar"] += 50
        estado["bonus"] = 3000
        sz_audio.play("power.wav", volume=0.65)
    else:
        estado["placar"] += 2
        sz_audio.play("collect.wav", volume=0.4)
    if len(estado["pontos"]) == 0:
        terminar("VOCÊ VENCEU!")


def atualizar(tempo):
    estado["animacao"] += tempo
    if estado["fase"] != "jogando":
        estado["espera"] = max(0, estado["espera"] - tempo)
        if estado["espera"] == 0:
            if estado["fase"] == "fim":
                fechar()
            else:
                estado["fase"] = "jogando"
        return
    estado["bonus"] = max(0, estado["bonus"] - tempo)
    estado["protecao"] = max(0, estado["protecao"] - tempo)
    velocidade = 4
    if estado["bonus"] > 0:
        velocidade += 3
    # Um atraso não permite saltar paredes ou correr o mapa inteiro.
    ritmo = min(tempo / INTERVALO, 2)
    for casa in mover(estado["jogador"], velocidade * ritmo):
        coletar(casa)
    if estado["fase"] == "fim":
        return
    for inimigo in estado["inimigos"]:
        mover(inimigo, 3 * ritmo)
    if estado["protecao"] == 0:
        for inimigo in estado["inimigos"]:
            if colidir(estado["jogador"], inimigo):
                sz_audio.play("collision.wav", volume=0.7)
                estado["vidas"] -= 1
                estado["bonus"] = 0
                if estado["vidas"] == 0:
                    terminar("FIM DE JOGO!")
                else:
                    reposicionar()
                break


def agendar():
    if estado["aberto"] and not estado["timer_pendente"]:
        estado["timer_pendente"] = True
        objetos["tela"].ontimer(quadro, INTERVALO)


def quadro():
    estado["timer_pendente"] = False
    if not estado["aberto"]:
        return
    agora = time.monotonic()
    tempo = max(0, (agora - estado["ultimo_tempo"]) * 1000)
    estado["ultimo_tempo"] = agora
    if not estado["pausado"]:
        atualizar(tempo)
    if estado["aberto"]:
        if not estado["pausado"]:
            desenhar_atores()
        desenhar_painel()
        objetos["tela"].update()
        agendar()


def pedir_direcao(dx, dy):
    if estado["fase"] == "jogando" and not estado["pausado"]:
        estado["direcao"] = (dx, dy)


def direita():
    pedir_direcao(1, 0)


def esquerda():
    pedir_direcao(-1, 0)


def cima():
    pedir_direcao(0, -1)


def baixo():
    pedir_direcao(0, 1)


def pausar():
    if estado["fase"] != "fim":
        estado["pausado"] = not estado["pausado"]
        estado["ultimo_tempo"] = time.monotonic()


def reiniciar_modelo():
    estado["fase"] = "abertura"
    estado["placar"] = 0
    estado["vidas"] = 3
    estado["bonus"] = 0
    estado["espera"] = 2500
    estado["pausado"] = False
    estado["animacao"] = 0
    estado["painel"] = ""
    reposicionar()


def reiniciar():
    if not estado["aberto"]:
        return
    sz_audio.stop()
    reiniciar_modelo()
    desenhar_mapa()
    desenhar_atores()
    desenhar_painel()
    estado["ultimo_tempo"] = time.monotonic()
    sz_audio.play("opening.wav", volume=0.6)
    objetos["tela"].update()
    # Não agende aqui: o reinício reutiliza a cadeia existente.


def fechar():
    if not estado["aberto"]:
        return
    estado["aberto"] = False
    sz_audio.stop()
    objetos["tela"].bye()


def registrar_formas():
    tela = objetos["tela"]
    contorno = [(0, 0)]
    for angulo in range(35, 326, 10):
        radianos = math.radians(angulo)
        contorno.append((11 * math.cos(radianos), 11 * math.sin(radianos)))
    tela.register_shape("heroi", tuple(contorno))
    corpo = ((-11, -10), (-11, 2), (-8, 8), (-3, 11), (3, 11), (8, 8), (11, 2), (11, -10), (6, -6), (2, -10), (-2, -6), (-6, -10))
    for numero in range(len(CORES)):
        for dx, dy in DIRECOES + [(0, 0)]:
            forma = turtle.Shape("compound")
            forma.addcomponent(corpo, CORES[numero], CORES[numero])
            for lado in [-1, 1]:
                for parte in ["olho", "pupila"]:
                    x, y, raio, cor = lado * 4, 3, 2.6, "white"
                    if parte == "pupila":
                        x, y, raio, cor = x + dx, y - dy, 1.1, "#172044"
                    pontos = []
                    for angulo in range(0, 360, 45):
                        radianos = math.radians(angulo)
                        pontos.append((x + raio * math.cos(radianos), y + raio * math.sin(radianos)))
                    forma.addcomponent(tuple(pontos), cor, cor)
            nome = "inimigo_" + str(numero) + "_" + str(dx) + "_" + str(dy)
            tela.register_shape(nome, forma)


def criar_desenhistas():
    for nome in ["lapis", "painel", "heroi"]:
        objetos[nome] = turtle.Turtle(visible=False)
    objetos["atores"] = []
    for numero in range(len(NINHOS)):
        objetos["atores"].append(turtle.Turtle(visible=False))
    for desenho in objetos["atores"] + [objetos["lapis"], objetos["painel"], objetos["heroi"]]:
        desenho.penup()
        desenho.speed(0)


def iniciar():
    tela = turtle.Screen()
    objetos["tela"] = tela
    tela.setup(1010, 860)
    tela.title("Pac-Man educacional • Sistema Zero")
    tela.bgcolor("black")
    tela.tracer(0)
    registrar_formas()
    criar_desenhistas()
    tela.onkeypress(direita, "Right")
    tela.onkeypress(esquerda, "Left")
    tela.onkeypress(cima, "Up")
    tela.onkeypress(baixo, "Down")
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
