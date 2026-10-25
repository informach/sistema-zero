import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Memória contra o Computador'
BICHOS = ['gato', 'cachorro', 'peixe', 'sapo', 'coruja', 'tartaruga', 'abelha', 'polvo']
COLUNAS = 4
LINHAS = 4
# A chance de o computador lembrar de uma carta que ele viu (1 lembra de tudo).
MEMORIA_DO_COMPUTADOR = 0.7
TEMPO_PARA_OLHAR = 1.0
TEMPO_DO_COMPUTADOR = 0.6


class Carta:
    """Uma carta da mesa: o bicho dela, o desenho e quem achou o par."""

    def __init__(self, bicho, lugar):
        self.bicho = bicho
        self.ator = Actor('verso')
        self.ator.topleft = lugar
        self.virada = False
        self.dono = ''

    def virar(self):
        self.virada = True
        self.ator.image = 'carta_' + self.bicho

    def esconder(self):
        self.virada = False
        self.ator.image = 'verso'

    def desenhar(self):
        self.ator.draw()
        if self.dono == 'voce':
            screen.draw.filled_circle((self.ator.right - 12, self.ator.top + 12), 8, 'dodgerblue')
        if self.dono == 'computador':
            screen.draw.filled_circle((self.ator.right - 12, self.ator.top + 12), 8, 'orangered')


class Computador:
    """O adversário: lembra (quase sempre) das cartas que viu virar."""

    def __init__(self):
        self.lembra = {}

    def ver(self, numero, bicho):
        if random.random() < MEMORIA_DO_COMPUTADOR:
            self.lembra[numero] = bicho

    def esquecer(self, numero):
        if numero in self.lembra:
            del self.lembra[numero]

    def par_que_lembra(self, livres):
        for numero in self.lembra:
            for outro in self.lembra:
                if numero < outro and self.lembra[numero] == self.lembra[outro]:
                    if numero in livres and outro in livres:
                        return numero
        return -1

    def primeira(self, livres):
        numero = self.par_que_lembra(livres)
        if numero >= 0:
            return numero
        # Sem par conhecido: vira uma carta que ainda não viu (se houver).
        novas = [numero for numero in livres if numero not in self.lembra]
        if novas:
            return random.choice(novas)
        return random.choice(livres)

    def segunda(self, primeira, bicho, livres):
        for numero in self.lembra:
            if numero != primeira and numero in livres and self.lembra[numero] == bicho:
                return numero
        outras = [numero for numero in livres if numero != primeira and numero not in self.lembra]
        if not outras:
            outras = [numero for numero in livres if numero != primeira]
        return random.choice(outras)


cartas = []
computador = Computador()
abertas = []
pontos = {'voce': 0, 'computador': 0}
vez = 'voce'
estado = 'jogando'
espera = 0


def dar_as_cartas():
    global vez, estado, espera
    cartas.clear()
    abertas.clear()
    computador.lembra = {}
    pontos['voce'] = 0
    pontos['computador'] = 0
    # Sorteia os bichos que cabem na mesa (dá para ter mais bichos que pares) e faz um par de cada.
    bichos = random.sample(BICHOS, COLUNAS * LINHAS // 2) * 2
    random.shuffle(bichos)
    for numero in range(COLUNAS * LINHAS):
        coluna = numero % COLUNAS
        linha = numero // COLUNAS
        cartas.append(Carta(bichos[numero], (177 + coluna * 115, 95 + linha * 125)))
    vez = 'voce'
    estado = 'jogando'
    espera = 0


def livres():
    # As cartas que ainda podem ser viradas.
    return [numero for numero in range(len(cartas)) if cartas[numero].dono == '' and not cartas[numero].virada]


def virar(numero):
    global estado, espera
    carta = cartas[numero]
    carta.virar()
    sounds.virar.play()
    # O computador também olha as cartas que você vira.
    computador.ver(numero, carta.bicho)
    abertas.append(numero)
    if len(abertas) == 2:
        estado = 'olhando'
        espera = TEMPO_PARA_OLHAR


def conferir():
    global vez, estado, espera
    primeira = cartas[abertas[0]]
    segunda = cartas[abertas[1]]
    if primeira.bicho == segunda.bicho:
        primeira.dono = vez
        segunda.dono = vez
        pontos[vez] = pontos[vez] + 1
        computador.esquecer(abertas[0])
        computador.esquecer(abertas[1])
        sounds.par.play()
    else:
        primeira.esconder()
        segunda.esconder()
        # Errou: passa a vez.
        vez = 'computador' if vez == 'voce' else 'voce'
    abertas.clear()
    estado = 'jogando'
    espera = TEMPO_DO_COMPUTADOR
    if not livres():
        estado = 'fim'


def jogar_computador():
    global espera
    # A pausa antes da próxima carta (a segunda carta troca pela pausa para olhar).
    espera = TEMPO_DO_COMPUTADOR
    if not abertas:
        virar(computador.primeira(livres()))
    else:
        primeira = abertas[0]
        virar(computador.segunda(primeira, cartas[primeira].bicho, livres()))


def update(dt):
    global espera
    if estado == 'fim':
        return
    espera = espera - dt
    if espera > 0:
        return
    if estado == 'olhando':
        conferir()
    elif vez == 'computador':
        jogar_computador()


def on_mouse_down(pos):
    if estado != 'jogando' or vez != 'voce':
        return
    for numero in livres():
        if cartas[numero].ator.collidepoint(pos):
            virar(numero)
            return


def on_key_down(key):
    if key == keys.SPACE and estado == 'fim':
        dar_as_cartas()


def draw():
    screen.fill((40, 90, 70))
    for carta in cartas:
        carta.desenhar()
    screen.draw.text('Você: ' + str(pontos['voce']), topleft=(20, 20), fontsize=40, color='dodgerblue', owidth=1, ocolor='white')
    screen.draw.text('Computador: ' + str(pontos['computador']), topright=(780, 20), fontsize=40, color='orangered', owidth=1, ocolor='white')
    if estado == 'fim':
        if pontos['voce'] > pontos['computador']:
            final = 'Você venceu!'
        elif pontos['voce'] < pontos['computador']:
            final = 'O computador venceu!'
        else:
            final = 'Empate!'
        screen.draw.text(final, center=(400, 300), fontsize=72, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Espaço: outra partida', center=(400, 360), fontsize=36, color='white', owidth=1, ocolor='black')
    elif vez == 'voce':
        screen.draw.text('Sua vez: vire duas cartas', center=(400, 40), fontsize=32, color='white')
    else:
        screen.draw.text('Vez do computador...', center=(400, 40), fontsize=32, color='white')


dar_as_cartas()
pgzrun.go()
