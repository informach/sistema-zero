import pgzrun

WIDTH = 720
HEIGHT = 480
TITLE = 'Quiz Relâmpago'
TEMPO_POR_PERGUNTA = 10

caixa_pergunta = Rect((20, 20), (680, 120))
caixa_tempo = Rect((580, 160), (120, 290))
caixas = [
    Rect((20, 160), (270, 135)),
    Rect((300, 160), (270, 135)),
    Rect((20, 315), (270, 135)),
    Rect((300, 315), (270, 135)),
]

perguntas = [
    ['Quantas patas tem uma aranha?', '8', '6', '10', '4', 1],
    ['Qual planeta é conhecido como planeta vermelho?', 'Vênus', 'Marte', 'Júpiter', 'Saturno', 2],
    ['Quanto é 7 vezes 8?', '54', '48', '56', '64', 3],
    ['Qual destes animais é um mamífero?', 'Tubarão', 'Pinguim', 'Sapo', 'Baleia', 4],
    ['Em que linguagem este jogo foi escrito?', 'Python', 'Java', 'Lua', 'C', 1],
    ['Quantos lados tem um hexágono?', '5', '6', '7', '8', 2],
    ['Qual é o maior oceano da Terra?', 'Atlântico', 'Índico', 'Pacífico', 'Ártico', 3],
]

numero = 0
pontos = 0
tempo = TEMPO_POR_PERGUNTA
acabou = False


def draw():
    screen.fill((32, 22, 70))
    screen.draw.filled_rect(caixa_pergunta, (20, 110, 160))
    screen.draw.filled_rect(caixa_tempo, (20, 110, 160))
    for caixa in caixas:
        screen.draw.filled_rect(caixa, (240, 150, 30))
    if acabou:
        screen.draw.textbox('Fim! Você acertou ' + str(pontos) + ' de ' + str(len(perguntas)), caixa_pergunta, color='white')
        screen.draw.textbox(':)', caixa_tempo, color='white')
        screen.draw.text('Clique para jogar de novo', bottomleft=(20, 474), fontsize=24, color='white')
        return
    pergunta = perguntas[numero]
    screen.draw.textbox(pergunta[0], caixa_pergunta, color='white')
    screen.draw.textbox(str(tempo), caixa_tempo, color='white')
    indice = 1
    for caixa in caixas:
        screen.draw.textbox(pergunta[indice], caixa, color='black')
        indice = indice + 1
    screen.draw.text('Pontos: ' + str(pontos), bottomleft=(20, 474), fontsize=24, color='white')


def proxima_pergunta():
    global numero, tempo, acabou
    numero = numero + 1
    tempo = TEMPO_POR_PERGUNTA
    # O relógio recomeça junto com a pergunta: cada uma tem os segundos inteiros.
    clock.unschedule(contar_tempo)
    if numero == len(perguntas):
        acabou = True
    else:
        clock.schedule_interval(contar_tempo, 1)


def contar_tempo():
    global tempo
    tempo = tempo - 1
    if tempo == 0:
        sounds.erro.play()
        proxima_pergunta()


def on_mouse_down(pos):
    global pontos, numero, tempo, acabou
    if acabou:
        numero = 0
        pontos = 0
        tempo = TEMPO_POR_PERGUNTA
        acabou = False
        clock.schedule_interval(contar_tempo, 1)
        return
    certa = perguntas[numero][5]
    indice = 1
    for caixa in caixas:
        if caixa.collidepoint(pos):
            if indice == certa:
                pontos = pontos + 1
                sounds.acerto.play()
            else:
                sounds.erro.play()
            proxima_pergunta()
            return
        indice = indice + 1


clock.schedule_interval(contar_tempo, 1.0)
pgzrun.go()
