"""Space Arena: Patrulha das Estrelas — exemplo original do Sistema Zero.

Toda a partida usa funções, decisões, repetições, listas e dicionários.
Desenho: Turtle oficial. Áudio: sz_audio 1.0.0 e cinco WAVs originais.
Leia README.md para jogar e NOTICE.md para os créditos.
"""
import math
import random
import time
import turtle
import sz_audio


# Experimente mudar estas regras sem mexer no desenho ou nos controles.
LIMITE_X = 760
LIMITE_Y = 520
IMPULSO = 0.18
VELOCIDADE_MAXIMA = 6
GIRO = 4
CORES = ["#fb7185", "#a78bfa", "#fbbf24"]
jogo = {"aberto": True, "pendente": False}
nave = {}
teclas = {"esquerda": False, "direita": False, "cima": False, "baixo": False, "tiro": False}
sons = {"musica": None, "motor": None, "tiro": None, "explosao": None, "bonus": None}
interface = {"tela": None, "mundo": None, "painel": None, "aviso": None}
inimigos = []
tiros = []
estrelas = []
bonus = []
explosao = []
rastro = []


def reiniciar_modelo():
    jogo.update({"fase": "abertura", "pontos": 0, "vidas": 3, "energia": 100,
                 "imunidade": 120, "recarga": 0, "melhoria": 0, "restantes": 25,
                 "seguir": True, "camera_x": 0, "camera_y": 0, "escala": 1,
                 "particula": 0, "quadro": 0, "som_explosao": -100,
                 "sujo": True, "hud": "", "aviso": ""})
    nave.update({"x": 0, "y": 0, "dx": 0, "dy": 0, "angulo": 90})
    for nome in teclas:
        teclas[nome] = False
    for grupo in [inimigos, tiros, estrelas, bonus, explosao, rastro]:
        grupo.clear()
    for indice in range(25):
        x = random.randint(-650, 650)
        y = random.randint(-440, 440)
        if math.hypot(x, y) < 240:
            if x >= 0:
                x += 360
            else:
                x -= 360
        inimigos.append({"x": x, "y": y, "dx": 0, "dy": 0, "angulo": indice * 37,
                         "tipo": indice % 3, "energia": 2, "ativo": True})
    for indice in range(30):
        tiros.append({"x": 0, "y": 0, "dx": 0, "dy": 0, "tempo": 0, "dano": 1, "ativo": False})
    for indice in range(20):
        estrelas.append({"x": random.randint(-750, 750), "y": random.randint(-510, 510)})
    for indice in range(5):
        bonus.append({"x": -540 + indice * 270, "y": 280 - (indice % 2) * 560, "ativo": True})
    for grupo, quantidade in [(explosao, 30), (rastro, 20)]:
        for indice in range(quantidade):
            grupo.append({"x": 0, "y": 0, "dx": 0, "dy": 0, "tempo": 0})


def limpar_controles():
    for nome in teclas:
        teclas[nome] = False
    if sons["motor"] is not None:
        sz_audio.stop(sons["motor"])
        sons["motor"] = None


def iniciar():
    if jogo["fase"] in ["abertura", "vitoria", "derrota"]:
        reiniciar()


def reiniciar():
    if jogo["aberto"]:
        sz_audio.stop()
        sons["motor"] = None
        reiniciar_modelo()
        jogo["fase"] = "jogando"
        sons["musica"] = sz_audio.play("bgm.wav", loop=True, volume=0.25)


def pausar():
    if jogo["fase"] == "jogando":
        jogo["fase"] = "pausa"
        limpar_controles()
        sz_audio.stop()
        sons["musica"] = None
    elif jogo["fase"] == "pausa":
        jogo["fase"] = "jogando"
        sons["musica"] = sz_audio.play("bgm.wav", loop=True, volume=0.25)
    jogo["sujo"] = True


def terminar(fase):
    jogo["fase"] = fase
    limpar_controles()
    sz_audio.stop()
    sons["musica"] = None
    jogo["sujo"] = True


def alternar_camera():
    jogo["seguir"] = not jogo["seguir"]
    mover_camera()
    jogo["sujo"] = True


def mudar_tecla(nome, valor):
    if jogo["aberto"] and (jogo["fase"] == "jogando" or not valor):
        teclas[nome] = valor


def pressionar_esquerda():
    mudar_tecla("esquerda", True)


def soltar_esquerda():
    mudar_tecla("esquerda", False)


def pressionar_direita():
    mudar_tecla("direita", True)


def soltar_direita():
    mudar_tecla("direita", False)


def pressionar_cima():
    if jogo["fase"] == "jogando" and not teclas["cima"] and jogo["aberto"]:
        teclas["cima"] = True
        sons["motor"] = sz_audio.play("thruster.wav", loop=True, volume=0.2)


def soltar_cima():
    mudar_tecla("cima", False)
    if sons["motor"] is not None:
        sz_audio.stop(sons["motor"])
        sons["motor"] = None


def pressionar_baixo():
    mudar_tecla("baixo", True)


def soltar_baixo():
    mudar_tecla("baixo", False)


def pressionar_tiro():
    mudar_tecla("tiro", True)


def soltar_tiro():
    mudar_tecla("tiro", False)


def limitar(objeto, velocidade):
    rapidez = math.hypot(objeto["dx"], objeto["dy"])
    if rapidez > velocidade:
        objeto["dx"] *= velocidade / rapidez
        objeto["dy"] *= velocidade / rapidez
    objeto["x"] += objeto["dx"]
    objeto["y"] += objeto["dy"]
    for eixo, limite in [("x", LIMITE_X), ("y", LIMITE_Y)]:
        if abs(objeto[eixo]) > limite:
            objeto[eixo] = max(-limite, min(limite, objeto[eixo]))
            objeto["d" + eixo] *= -0.7


def tocar_efeito(nome, arquivo, volume):
    if sons[nome] is not None:
        sz_audio.stop(sons[nome])
    sons[nome] = sz_audio.play(arquivo, volume=volume)


def emitir_explosao(x, y):
    for particula in explosao:
        angulo = math.radians(random.randint(0, 359))
        rapidez = random.randint(12, 45) / 10
        particula.update({"x": x, "y": y, "dx": math.cos(angulo) * rapidez,
                          "dy": math.sin(angulo) * rapidez, "tempo": random.randint(18, 30)})
    # Colisões simultâneas compartilham uma voz, sem criar uma tempestade de sons.
    if jogo["quadro"] - jogo["som_explosao"] >= 6:
        jogo["som_explosao"] = jogo["quadro"]
        tocar_efeito("explosao", "explosion.wav", 0.45)


def mover_nave():
    if teclas["esquerda"]:
        nave["angulo"] += GIRO
    if teclas["direita"]:
        nave["angulo"] -= GIRO
    nave["angulo"] %= 360
    angulo = math.radians(nave["angulo"])
    if teclas["cima"]:
        nave["dx"] += math.cos(angulo) * IMPULSO
        nave["dy"] += math.sin(angulo) * IMPULSO
        for indice in range(2):
            particula = rastro[jogo["particula"]]
            particula.update({"x": nave["x"] - math.cos(angulo) * 12,
                              "y": nave["y"] - math.sin(angulo) * 12,
                              "dx": -math.cos(angulo) * 2 + random.randint(-5, 5) / 10,
                              "dy": -math.sin(angulo) * 2 + random.randint(-5, 5) / 10, "tempo": 10})
            jogo["particula"] = (jogo["particula"] + 1) % len(rastro)
    if teclas["baixo"]:
        nave["dx"] *= 0.9
        nave["dy"] *= 0.9
    limitar(nave, VELOCIDADE_MAXIMA)


def atirar():
    if jogo["fase"] != "jogando" or jogo["recarga"] > 0:
        return
    disparados = 0
    for abertura in [-7, 0, 7]:
        for tiro in tiros:
            if not tiro["ativo"]:
                angulo = math.radians(nave["angulo"] + abertura)
                tiro.update({"x": nave["x"] + math.cos(angulo) * 16,
                             "y": nave["y"] + math.sin(angulo) * 16,
                             "dx": math.cos(angulo) * 12 + nave["dx"],
                             "dy": math.sin(angulo) * 12 + nave["dy"],
                             "tempo": 75, "dano": 1 + jogo["melhoria"] // 2, "ativo": True})
                nave["dx"] -= math.cos(angulo) * 0.08
                nave["dy"] -= math.sin(angulo) * 0.08
                disparados += 1
                break
    if disparados > 0:
        jogo["recarga"] = 14
        tocar_efeito("tiro", "missile_fire.wav", 0.3)


def receber_dano(dano):
    if jogo["imunidade"] > 0 or jogo["fase"] != "jogando":
        return
    jogo["energia"] -= dano
    jogo["imunidade"] = 60
    emitir_explosao(nave["x"], nave["y"])
    if jogo["energia"] <= 0:
        jogo["vidas"] -= 1
        if jogo["vidas"] == 0:
            jogo["energia"] = 0
            terminar("derrota")
        else:
            nave.update({"x": 0, "y": 0, "dx": 0, "dy": 0, "angulo": 90})
            jogo["energia"] = 100
            jogo["imunidade"] = 150
            limpar_controles()


def mover_inimigos():
    for inimigo in inimigos:
        if inimigo["ativo"]:
            x = nave["x"] - inimigo["x"]
            y = nave["y"] - inimigo["y"]
            distancia = max(1, math.hypot(x, y))
            if inimigo["tipo"] == 0 or (inimigo["tipo"] == 2 and distancia < 190):
                inimigo["dx"] += x / distancia * 0.035
                inimigo["dy"] += y / distancia * 0.035
            elif inimigo["tipo"] == 1:
                inimigo["angulo"] += 2
                inimigo["dx"] = math.cos(math.radians(inimigo["angulo"])) * 1.4
                inimigo["dy"] = math.sin(math.radians(inimigo["angulo"])) * 1.4
            limitar(inimigo, 2.1)
            if math.hypot(nave["x"] - inimigo["x"], nave["y"] - inimigo["y"]) < 25:
                receber_dano(25)
                inimigo["dx"] *= -1
                inimigo["dy"] *= -1


def mover_tiros():
    for tiro in tiros:
        if tiro["ativo"]:
            tiro["x"] += tiro["dx"]
            tiro["y"] += tiro["dy"]
            tiro["tempo"] -= 1
            if tiro["tempo"] <= 0 or abs(tiro["x"]) > LIMITE_X or abs(tiro["y"]) > LIMITE_Y:
                tiro["ativo"] = False
            for inimigo in inimigos:
                if tiro["ativo"] and inimigo["ativo"]:
                    if math.hypot(tiro["x"] - inimigo["x"], tiro["y"] - inimigo["y"]) < 20:
                        tiro["ativo"] = False
                        inimigo["energia"] -= tiro["dano"]
                        if inimigo["energia"] <= 0:
                            inimigo["ativo"] = False
                            jogo["pontos"] += 100
                            jogo["restantes"] -= 1
                            emitir_explosao(inimigo["x"], inimigo["y"])


def recolher_bonus():
    for item in bonus:
        if item["ativo"] and math.hypot(nave["x"] - item["x"], nave["y"] - item["y"]) < 24:
            item["ativo"] = False
            jogo["energia"] = min(100, jogo["energia"] + 25)
            jogo["melhoria"] += 1
            jogo["pontos"] += 50
            tocar_efeito("bonus", "powerup.wav", 0.4)


def mover_particulas():
    for grupo in [explosao, rastro]:
        for particula in grupo:
            if particula["tempo"] > 0:
                particula["x"] += particula["dx"]
                particula["y"] += particula["dy"]
                particula["dx"] *= 0.94
                particula["dy"] *= 0.94
                particula["tempo"] -= 1


def mover_camera():
    if jogo["seguir"]:
        jogo["camera_x"] += (nave["x"] - jogo["camera_x"]) / 8
        jogo["camera_y"] += (nave["y"] - jogo["camera_y"]) / 8
        jogo["escala"] = 1
    else:
        jogo["camera_x"] = 0
        jogo["camera_y"] = 0
        jogo["escala"] = 0.5


def avancar():
    if jogo["fase"] != "jogando":
        return
    jogo["quadro"] += 1
    jogo["imunidade"] = max(0, jogo["imunidade"] - 1)
    jogo["recarga"] = max(0, jogo["recarga"] - 1)
    mover_nave()
    if teclas["tiro"]:
        atirar()
    mover_inimigos()
    if jogo["fase"] == "jogando":
        mover_tiros()
        recolher_bonus()
        if jogo["restantes"] == 0:
            terminar("vitoria")
    mover_particulas()
    mover_camera()


# O modelo usa coordenadas da arena. Apenas aqui elas viram pixels na janela.
def projetar(x, y):
    return ((x - jogo["camera_x"]) * jogo["escala"] - 110,
            (y - jogo["camera_y"]) * jogo["escala"])


def carimbar(x, y, forma, cor, tamanho, angulo):
    px, py = projetar(x, y)
    if -478 < px < 258 and -268 < py < 268:
        caneta = interface["mundo"]
        caneta.goto(px, py)
        caneta.shape(forma)
        caneta.color(cor)
        caneta.shapesize(tamanho * jogo["escala"])
        caneta.setheading(angulo)
        caneta.stamp()


def escrever(caneta, x, y, texto, tamanho):
    caneta.goto(x, y)
    caneta.write(texto, align="center", font=("Arial", tamanho, "normal"))


def linha(x1, y1, x2, y2, cor):
    caneta = interface["mundo"]
    caneta.color(cor)
    caneta.goto(x1, y1)
    caneta.pendown()
    caneta.goto(x2, y2)
    caneta.penup()


def desenhar_limites():
    for x1, y1, x2, y2 in [(-490, -280, 270, -280), (270, -280, 270, 280),
                            (270, 280, -490, 280), (-490, 280, -490, -280),
                            (310, -143, 480, -143), (480, -143, 480, -27),
                            (480, -27, 310, -27), (310, -27, 310, -143)]:
        linha(x1, y1, x2, y2, "#334155")
    esquerda, baixo = projetar(-LIMITE_X, -LIMITE_Y)
    direita, alto = projetar(LIMITE_X, LIMITE_Y)
    for x in [esquerda, direita]:
        if -490 <= x <= 270:
            linha(x, max(-280, baixo), x, min(280, alto), "#38bdf8")
    for y in [baixo, alto]:
        if -280 <= y <= 280:
            linha(max(-490, esquerda), y, min(270, direita), y, "#38bdf8")


def desenhar_radar():
    caneta = interface["mundo"]
    caneta.shape("circle")
    caneta.shapesize(0.15)
    for inimigo in inimigos:
        if inimigo["ativo"]:
            caneta.goto(395 + inimigo["x"] * 0.11, -85 + inimigo["y"] * 0.11)
            caneta.color(CORES[inimigo["tipo"]])
            caneta.stamp()
    for item in bonus:
        if item["ativo"]:
            caneta.goto(395 + item["x"] * 0.11, -85 + item["y"] * 0.11)
            caneta.color("#34d399")
            caneta.stamp()
    caneta.goto(395 + nave["x"] * 0.11, -85 + nave["y"] * 0.11)
    caneta.color("white")
    caneta.shapesize(0.25)
    caneta.stamp()


def desenhar_painel():
    texto = ("Pontos: " + str(jogo["pontos"]) + "\nVidas: " + str(jogo["vidas"])
             + "\nEnergia: " + str(jogo["energia"]) + "\nDrones: " + str(jogo["restantes"])
             + "\nMelhorias: " + str(jogo["melhoria"]))
    if texto != jogo["hud"]:
        jogo["hud"] = texto
        caneta = interface["painel"]
        caneta.clear()
        caneta.color("#e2e8f0")
        escrever(caneta, 395, 145, "PATRULHA", 18)
        escrever(caneta, 395, 30, texto, 13)
        escrever(caneta, 395, -15, "RADAR", 11)
        escrever(caneta, 395, -280, "Setas: pilotar / frear\nEspaço: disparar\nP: pausa   C: câmera\nR: reiniciar   Esc: sair", 10)
    if jogo["fase"] != jogo["aviso"]:
        jogo["aviso"] = jogo["fase"]
        caneta = interface["aviso"]
        caneta.clear()
        caneta.color("#f8fafc")
        mensagens = {"abertura": "PATRULHA DAS ESTRELAS\nProteja a arena dos 25 drones!\nS: iniciar  |  Espaço: disparar",
                     "pausa": "PAUSA\nP: continuar", "vitoria": "ARENA PROTEGIDA!\nS ou R: jogar novamente",
                     "derrota": "FIM DA PATRULHA\nS ou R: tentar novamente", "jogando": ""}
        escrever(caneta, -110, 10, mensagens[jogo["fase"]], 20)


def desenhar():
    caneta = interface["mundo"]
    caneta.clear()
    desenhar_limites()
    for estrela in estrelas:
        carimbar(estrela["x"], estrela["y"], "circle", "#64748b", 0.12, 0)
    for item in bonus:
        if item["ativo"]:
            carimbar(item["x"], item["y"], "square", "#34d399", 0.6, 45)
    for inimigo in inimigos:
        if inimigo["ativo"]:
            carimbar(inimigo["x"], inimigo["y"], "drone", CORES[inimigo["tipo"]], 1, inimigo["angulo"])
    for tiro in tiros:
        if tiro["ativo"]:
            carimbar(tiro["x"], tiro["y"], "circle", "#fef08a", 0.2, 0)
    for grupo, cor in [(explosao, "#fb923c"), (rastro, "#38bdf8")]:
        for particula in grupo:
            if particula["tempo"] > 0:
                carimbar(particula["x"], particula["y"], "circle", cor, 0.17, 0)
    if jogo["fase"] != "derrota":
        cor = "#67e8f9"
        if jogo["imunidade"] > 0 and jogo["quadro"] % 10 < 5:
            cor = "#f8fafc"
        carimbar(nave["x"], nave["y"], "nave", cor, 1, nave["angulo"])
    desenhar_radar()
    desenhar_painel()
    interface["tela"].update()


def agendar(intervalo):
    if jogo["aberto"] and not jogo["pendente"]:
        jogo["pendente"] = True
        interface["tela"].ontimer(quadro, intervalo)


def quadro():
    jogo["pendente"] = False
    if jogo["aberto"]:
        inicio = time.perf_counter()
        if jogo["fase"] == "jogando" or jogo["sujo"]:
            avancar()
            jogo["sujo"] = False
            desenhar()
        intervalo = max(1, math.ceil(1000 / 60 - (time.perf_counter() - inicio) * 1000))
        agendar(intervalo)


def fechar():
    if jogo["aberto"]:
        jogo["aberto"] = False
        limpar_controles()
        sz_audio.stop()
        interface["tela"].bye()


def executar():
    interface["tela"] = turtle.Screen()
    janela = interface["tela"]
    janela.setup(1020, 620)
    janela.title("Space Arena — Patrulha das Estrelas")
    janela.bgcolor("#08111f")
    janela.tracer(0)
    janela.register_shape("nave", ((0, 16), (-10, -11), (0, -6), (10, -11)))
    janela.register_shape("drone", ((12, 0), (6, 10), (-6, 10), (-12, 0), (-6, -10), (6, -10)))
    for nome in ["mundo", "painel", "aviso"]:
        caneta = turtle.Turtle()
        caneta.hideturtle()
        caneta.penup()
        caneta.speed(0)
        interface[nome] = caneta
    reiniciar_modelo()
    for tecla, pressionar, soltar in [("Left", pressionar_esquerda, soltar_esquerda),
                                     ("Right", pressionar_direita, soltar_direita),
                                     ("Up", pressionar_cima, soltar_cima),
                                     ("Down", pressionar_baixo, soltar_baixo),
                                     ("space", pressionar_tiro, soltar_tiro)]:
        janela.onkeypress(pressionar, tecla)
        janela.onkeyrelease(soltar, tecla)
    for tecla, acao in [("s", iniciar), ("S", iniciar), ("p", pausar), ("P", pausar),
                        ("c", alternar_camera), ("C", alternar_camera),
                        ("r", reiniciar), ("R", reiniciar), ("Escape", fechar)]:
        janela.onkey(acao, tecla)
    janela.listen()
    desenhar()
    agendar(17)
    try:
        janela.mainloop()
    finally:
        jogo["aberto"] = False
        sz_audio.stop()


if __name__ == "__main__":
    executar()
