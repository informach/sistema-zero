import random
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Batalha Naval'
CASA = 30
LADO = 10
# O tamanho de cada navio da frota, do maior para o menor.
TAMANHOS = [5, 4, 3, 3, 2]
TEMPO_DO_COMPUTADOR = 0.8
AGUA = (30, 90, 160)
LINHAS_DA_GRADE = (90, 150, 210)


class Navio:
    """Um navio: as casas que ele ocupa e quantas delas já levaram tiro."""

    def __init__(self, casas):
        self.casas = casas
        self.acertos = 0

    def afundou(self):
        return self.acertos == len(self.casas)


class Frota:
    """Uma grade de 10 por 10 com os navios de um lado e os tiros que ela já levou."""

    def __init__(self, canto):
        self.canto = canto
        self.navios = []
        self.tiros = {}

    def casas_do_navio(self, tamanho, casa, deitado):
        casas = []
        for parte in range(tamanho):
            if deitado:
                casas.append((casa[0] + parte, casa[1]))
            else:
                casas.append((casa[0], casa[1] + parte))
        return casas

    def navio_em(self, casa):
        for navio in self.navios:
            if casa in navio.casas:
                return navio
        return None

    def cabe(self, casas):
        for casa in casas:
            if casa[0] >= LADO or casa[1] >= LADO:
                return False
            if self.navio_em(casa) is not None:
                return False
        return True

    def colocar(self, tamanho, casa, deitado):
        casas = self.casas_do_navio(tamanho, casa, deitado)
        if not self.cabe(casas):
            return False
        self.navios.append(Navio(casas))
        return True

    def sortear(self):
        # Os navios do computador vão para lugares sorteados. Se o próximo não couber
        # em lugar nenhum depois de muitas tentativas, sorteia a frota toda de novo.
        self.navios = []
        tentativas = 0
        while len(self.navios) < len(TAMANHOS):
            casa = (random.randrange(LADO), random.randrange(LADO))
            self.colocar(TAMANHOS[len(self.navios)], casa, random.choice([True, False]))
            tentativas = tentativas + 1
            if tentativas > 1000:
                self.navios = []
                tentativas = 0

    def atirar(self, casa):
        navio = self.navio_em(casa)
        if navio is None:
            self.tiros[casa] = 'agua'
            return 'agua'
        self.tiros[casa] = 'acerto'
        navio.acertos = navio.acertos + 1
        if navio.afundou():
            return 'afundou'
        return 'acerto'

    def afundados(self):
        return len([navio for navio in self.navios if navio.afundou()])

    def casa_em(self, pos):
        # Que casa da grade fica neste ponto da tela (None se for fora dela).
        coluna = (pos[0] - self.canto[0]) // CASA
        linha = (pos[1] - self.canto[1]) // CASA
        if 0 <= coluna < LADO and 0 <= linha < LADO:
            return (coluna, linha)
        return None

    def lugar(self, casa):
        return (self.canto[0] + casa[0] * CASA, self.canto[1] + casa[1] * CASA)

    def desenhar(self, mostrar_navios):
        x = self.canto[0]
        y = self.canto[1]
        screen.draw.filled_rect(Rect(self.canto, (LADO * CASA, LADO * CASA)), AGUA)
        for numero in range(LADO + 1):
            screen.draw.line((x + numero * CASA, y), (x + numero * CASA, y + LADO * CASA), LINHAS_DA_GRADE)
            screen.draw.line((x, y + numero * CASA), (x + LADO * CASA, y + numero * CASA), LINHAS_DA_GRADE)
        for navio in self.navios:
            # Os navios do computador só aparecem depois de afundados.
            if mostrar_navios or navio.afundou():
                for casa in navio.casas:
                    screen.blit('casco', self.lugar(casa))
        for casa in self.tiros:
            if self.tiros[casa] == 'acerto':
                screen.blit('fogo', self.lugar(casa))
            else:
                screen.blit('respingo', self.lugar(casa))


class Computador:
    """O adversário: procura os navios e, quando acerta um, atira nas casas em volta."""

    def __init__(self):
        self.tentadas = []
        self.alvos = []

    def escolher(self):
        while self.alvos:
            casa = self.alvos.pop(0)
            if casa not in self.tentadas:
                return casa
        # Todo navio tem pelo menos duas casas: basta procurar em casas alternadas,
        # como as pretas de um tabuleiro de xadrez.
        livres = []
        for coluna in range(LADO):
            for linha in range(LADO):
                if (coluna + linha) % 2 == 0 and (coluna, linha) not in self.tentadas:
                    livres.append((coluna, linha))
        if not livres:
            for coluna in range(LADO):
                for linha in range(LADO):
                    if (coluna, linha) not in self.tentadas:
                        livres.append((coluna, linha))
        return random.choice(livres)

    def resultado(self, casa, efeito):
        self.tentadas.append(casa)
        if efeito == 'acerto':
            # Acertou: as casas vizinhas viram os próximos alvos.
            vizinhas = [(casa[0] + 1, casa[1]), (casa[0] - 1, casa[1]), (casa[0], casa[1] + 1), (casa[0], casa[1] - 1)]
            for vizinha in vizinhas:
                if 0 <= vizinha[0] < LADO and 0 <= vizinha[1] < LADO:
                    self.alvos.append(vizinha)
        if efeito == 'afundou':
            # Afundou o navio: volta a atirar ao acaso.
            self.alvos = []


minha_frota = Frota((50, 160))
frota_inimiga = Frota((450, 160))
computador = Computador()
estado = 'colocando'
proximo = 0
deitado = True
mouse_em = (0, 0)
espera = 0
recado = ''


def novo_jogo():
    global computador, estado, proximo, deitado, espera, recado
    minha_frota.navios = []
    minha_frota.tiros = {}
    frota_inimiga.tiros = {}
    frota_inimiga.sortear()
    computador = Computador()
    estado = 'colocando'
    proximo = 0
    deitado = True
    espera = 0
    recado = 'Clique na grade para pôr os navios. Espaço gira; R recomeça.'


def contar(quem, efeito):
    # O som e o recado de cada tiro.
    if efeito == 'agua':
        sounds.agua.play()
        return quem + ': água.'
    if efeito == 'acerto':
        sounds.acerto.play()
        return quem + ': acertou um navio!'
    sounds.afundou.play()
    return quem + ': afundou um navio!'


def on_mouse_move(pos):
    global mouse_em
    mouse_em = pos


def on_mouse_down(pos):
    global estado, proximo, espera, recado
    if estado == 'colocando':
        casa = minha_frota.casa_em(pos)
        if casa is not None and minha_frota.colocar(TAMANHOS[proximo], casa, deitado):
            sounds.colocar.play()
            proximo = proximo + 1
            if proximo == len(TAMANHOS):
                estado = 'jogando'
                recado = 'Sua vez: atire na grade do computador.'
    elif estado == 'jogando':
        casa = frota_inimiga.casa_em(pos)
        if casa is None or casa in frota_inimiga.tiros:
            return
        recado = contar('Você', frota_inimiga.atirar(casa))
        if frota_inimiga.afundados() == len(TAMANHOS):
            estado = 'fim'
        else:
            estado = 'computador'
            espera = TEMPO_DO_COMPUTADOR


def on_key_down(key):
    global deitado, proximo
    if key == keys.SPACE:
        if estado == 'colocando':
            deitado = not deitado
        elif estado == 'fim':
            novo_jogo()
    # R tira os navios já postos, para pôr de outro jeito.
    if key == keys.R and estado == 'colocando':
        minha_frota.navios = []
        proximo = 0


def update(dt):
    global estado, espera, recado
    if estado != 'computador':
        return
    espera = espera - dt
    if espera > 0:
        return
    casa = computador.escolher()
    efeito = minha_frota.atirar(casa)
    computador.resultado(casa, efeito)
    recado = contar('Computador', efeito)
    if minha_frota.afundados() == len(TAMANHOS):
        estado = 'fim'
    else:
        estado = 'jogando'


def draw():
    screen.fill((20, 40, 70))
    screen.draw.text('Batalha Naval', center=(400, 50), fontsize=60, color='white', owidth=1, ocolor='black')
    screen.draw.text('Seus navios', midbottom=(200, 150), fontsize=34, color='white')
    screen.draw.text('Navios do computador', midbottom=(600, 150), fontsize=34, color='white')
    minha_frota.desenhar(True)
    frota_inimiga.desenhar(False)
    if estado == 'colocando':
        # A sombra do próximo navio embaixo do mouse: verde se cabe, vermelha se não cabe.
        casa = minha_frota.casa_em(mouse_em)
        if casa is not None:
            casas = minha_frota.casas_do_navio(TAMANHOS[proximo], casa, deitado)
            cor = 'lime' if minha_frota.cabe(casas) else 'red'
            for parte in casas:
                if parte[0] < LADO and parte[1] < LADO:
                    screen.draw.rect(Rect(minha_frota.lugar(parte), (CASA, CASA)), cor)
    screen.draw.text('Afundados: ' + str(frota_inimiga.afundados()) + ' de ' + str(len(TAMANHOS)), midtop=(600, 470), fontsize=30, color='white')
    screen.draw.text('Perdidos: ' + str(minha_frota.afundados()) + ' de ' + str(len(TAMANHOS)), midtop=(200, 470), fontsize=30, color='white')
    if estado == 'fim':
        if frota_inimiga.afundados() == len(TAMANHOS):
            final = 'Você venceu!'
        else:
            final = 'O computador venceu!'
        screen.draw.text(final, center=(400, 530), fontsize=56, color='yellow', owidth=2, ocolor='black')
        screen.draw.text('Espaço: outra partida', center=(400, 575), fontsize=30, color='white')
    else:
        screen.draw.text(recado, center=(400, 540), fontsize=30, color='white')


novo_jogo()
pgzrun.go()
