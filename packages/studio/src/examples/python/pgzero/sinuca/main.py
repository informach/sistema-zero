import math
import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Sinuca'
RAIO = 14
# O pano verde, por onde as bolas andam.
AREA = Rect((80, 110), (640, 380))
# O ponto de cada caçapa fica um pouco para dentro do pano: assim a bola que vai para o canto
# cai, em vez de bater na tabela ao lado dele.
CACAPAS = [
    (88, 118), (400, 112), (712, 118),
    (88, 482), (400, 488), (712, 482),
]
TAMANHO_DA_CACAPA = 28
ATRITO = 0.985
# A cada quadro as bolas andam em 8 passinhos: assim uma bola rápida não atravessa a outra.
PASSOS = 8
TACADAS = 15


class Bola:
    def __init__(self, imagem, x, y):
        self.ator = Actor(imagem, (x, y))
        self.vx = 0
        self.vy = 0

    def andar(self):
        self.ator.x = self.ator.x + self.vx / PASSOS
        self.ator.y = self.ator.y + self.vy / PASSOS
        # Bate na tabela e volta, perdendo um pouco de força.
        if self.ator.x < AREA.left + RAIO:
            self.ator.x = AREA.left + RAIO
            self.vx = -self.vx * 0.9
        if self.ator.x > AREA.right - RAIO:
            self.ator.x = AREA.right - RAIO
            self.vx = -self.vx * 0.9
        if self.ator.y < AREA.top + RAIO:
            self.ator.y = AREA.top + RAIO
            self.vy = -self.vy * 0.9
        if self.ator.y > AREA.bottom - RAIO:
            self.ator.y = AREA.bottom - RAIO
            self.vy = -self.vy * 0.9

    def frear(self):
        self.vx = self.vx * ATRITO
        self.vy = self.vy * ATRITO
        if abs(self.vx) + abs(self.vy) < 0.08:
            self.vx = 0
            self.vy = 0

    def parada(self):
        return self.vx == 0 and self.vy == 0


bolas = []
branca = Bola('branca', 240, 300)
mira = 0
forca = 6
tacadas = TACADAS
encacapadas = 0
total_de_bolas = 0
branca_caiu = False
# 'mirando', 'rolando', 'venceu' ou 'perdeu'
estado = 'mirando'


def arrumar_mesa():
    global mira, forca, tacadas, encacapadas, branca_caiu, estado, total_de_bolas
    bolas.clear()
    branca.ator.pos = (240, 300)
    branca.vx = 0
    branca.vy = 0
    bolas.append(branca)
    # Seis bolas coloridas num triângulo, encostadas umas nas outras.
    lugares = [(520, 300), (545, 286), (545, 314), (570, 272), (570, 300), (570, 328)]
    # A mesa fica limpa quando todas as bolas coloridas caírem.
    total_de_bolas = len(lugares)
    for numero in range(len(lugares)):
        x, y = lugares[numero]
        bolas.append(Bola('bola' + str(numero + 1), x, y))
    mira = 0
    forca = 6
    tacadas = TACADAS
    encacapadas = 0
    branca_caiu = False
    estado = 'mirando'


def bater(a, b):
    dx = b.ator.x - a.ator.x
    dy = b.ator.y - a.ator.y
    distancia = math.hypot(dx, dy)
    if distancia == 0 or distancia >= 2 * RAIO:
        return
    # A direção da batida, de uma bola até a outra, com tamanho 1.
    nx = dx / distancia
    ny = dy / distancia
    # Separa as duas para não ficarem uma dentro da outra.
    sobra = (2 * RAIO - distancia) / 2
    a.ator.x = a.ator.x - nx * sobra
    a.ator.y = a.ator.y - ny * sobra
    b.ator.x = b.ator.x + nx * sobra
    b.ator.y = b.ator.y + ny * sobra
    # A parte da velocidade que vai na direção da batida passa de uma bola para a outra.
    va = a.vx * nx + a.vy * ny
    vb = b.vx * nx + b.vy * ny
    if va - vb > 0:
        troca = va - vb
        a.vx = a.vx - troca * nx
        a.vy = a.vy - troca * ny
        b.vx = b.vx + troca * nx
        b.vy = b.vy + troca * ny
        sounds.toque.play()


def cair_nas_cacapas():
    global encacapadas, branca_caiu
    for bola in list(bolas):
        for x, y in CACAPAS:
            if bola.ator.distance_to((x, y)) < TAMANHO_DA_CACAPA:
                bolas.remove(bola)
                bola.vx = 0
                bola.vy = 0
                if bola == branca:
                    branca_caiu = True
                    sounds.erro.play()
                else:
                    encacapadas = encacapadas + 1
                    sounds.cacapa.play()
                break


def alguma_rolando():
    for bola in bolas:
        if not bola.parada():
            return True
    return False


def fim_da_tacada():
    global branca_caiu, estado
    if branca_caiu:
        # A branca volta para o lugar dela (um pouco para o lado, se tiver bola ali).
        branca.ator.pos = (240, 300)
        for bola in bolas:
            if branca.ator.distance_to(bola.ator) < 2 * RAIO:
                branca.ator.y = branca.ator.y - 3 * RAIO
        bolas.append(branca)
        branca_caiu = False
    if encacapadas == total_de_bolas:
        estado = 'venceu'
        sounds.vitoria.play()
    elif tacadas == 0:
        estado = 'perdeu'
    else:
        estado = 'mirando'


def tacar():
    global tacadas, estado
    angulo = math.radians(mira)
    branca.vx = math.cos(angulo) * forca * 1.8
    branca.vy = math.sin(angulo) * forca * 1.8
    tacadas = tacadas - 1
    estado = 'rolando'
    sounds.tacada.play()


def update():
    global mira
    if estado == 'mirando':
        if keyboard.left:
            mira = (mira - 1.5) % 360
        if keyboard.right:
            mira = (mira + 1.5) % 360
    if estado == 'rolando':
        for passo in range(PASSOS):
            for bola in bolas:
                bola.andar()
            for numero in range(len(bolas)):
                for outra in range(numero + 1, len(bolas)):
                    bater(bolas[numero], bolas[outra])
            cair_nas_cacapas()
        for bola in bolas:
            bola.frear()
        if not alguma_rolando():
            fim_da_tacada()


def desenhar_mira():
    # Uma linha de pontinhos que mostra para onde a branca vai, voltando nas tabelas.
    x = branca.ator.x
    y = branca.ator.y
    dx = math.cos(math.radians(mira))
    dy = math.sin(math.radians(mira))
    for ponto in range(25):
        x = x + dx * 12
        y = y + dy * 12
        if x < AREA.left + RAIO or x > AREA.right - RAIO:
            dx = -dx
        if y < AREA.top + RAIO or y > AREA.bottom - RAIO:
            dy = -dy
        # A linha para na primeira bola que encontrar.
        for bola in bolas:
            if bola != branca and bola.ator.distance_to((x, y)) < RAIO:
                return
        screen.draw.filled_circle((x, y), 2, 'white')


def draw():
    screen.blit('mesa', (0, 0))
    for bola in bolas:
        bola.ator.draw()
    if estado == 'mirando':
        desenhar_mira()
    screen.draw.text('Bolas na caçapa: ' + str(encacapadas) + ' de ' + str(total_de_bolas), topleft=(16, 12), fontsize=32, color='white')
    screen.draw.text('Tacadas: ' + str(tacadas), topright=(WIDTH - 16, 12), fontsize=32, color='white')
    screen.draw.text('Força', midleft=(240, 560), fontsize=30, color='white')
    for numero in range(10):
        cor = 'gray20'
        if numero < forca:
            cor = 'orange'
        screen.draw.filled_rect(Rect((320 + numero * 24, 548), (20, 24)), cor)
    if estado == 'venceu':
        screen.draw.text('Mesa limpa!', center=(400, 280), fontsize=72, color='yellow', owidth=1, ocolor='black')
    if estado == 'perdeu':
        screen.draw.text('Acabaram as tacadas!', center=(400, 280), fontsize=60, color='orange', owidth=1, ocolor='black')
    if estado == 'venceu' or estado == 'perdeu':
        screen.draw.text('Espaço joga de novo', center=(400, 340), fontsize=36, color='white', owidth=1, ocolor='black')


def on_key_down(key):
    global forca
    if estado == 'venceu' or estado == 'perdeu':
        if key == keys.SPACE:
            arrumar_mesa()
        return
    if estado != 'mirando':
        return
    if key == keys.UP and forca < 10:
        forca = forca + 1
    elif key == keys.DOWN and forca > 1:
        forca = forca - 1
    elif key == keys.SPACE:
        tacar()


arrumar_mesa()
pgzrun.go()
