"""Aventura do Herói: a água segura, a espada corta o mato e derrota as gosmas, o encostão tira
coração com invencibilidade, e a ilha pode ser limpa."""
from collections import deque

BLOQUEIA = '~#R'


def caminho(mapa, de, para):
    fila, veio = deque([de]), {de: None}
    while fila:
        atual = fila.popleft()
        if atual == para:
            break
        linha, coluna = atual
        for dl, dc in ((0, 1), (1, 0), (0, -1), (-1, 0)):
            prox = (linha + dl, coluna + dc)
            dentro = 0 <= prox[0] < len(mapa) and 0 <= prox[1] < len(mapa[0])
            if dentro and mapa[prox[0]][prox[1]] not in BLOQUEIA and prox not in veio:
                veio[prox] = atual
                fila.append(prox)
    if para not in veio:
        return []
    passos, atual = [], para
    while atual != de:
        passos.append(atual)
        atual = veio[atual]
    return passos[::-1]


def centro(r):
    return (r.x + r.width / 2, r.y + r.height / 2)


def play(t):
    g = t.game
    mapa, casa = g['MAPA'], g['CASA']
    yield from t.wait(2)
    t.shot('inicio')

    def casa_de(r):
        x, y = centro(r)
        return (int(y // casa), int(x // casa))

    def distancia(a, b):
        ax, ay = centro(a)
        bx, by = centro(b)
        return ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5

    # A água segura: andar para cima a partir do começo não entra no mar.
    t.hold('UP')
    yield from t.wait(60)
    t.release('UP')
    yield
    t.check(g['heroi'].pes.y >= casa, 'o herói entrou na água')

    # O encostão tira um coração e dá invencibilidade: dois encostões seguidos tiram só um.
    gosma = g['gosmas'][0]
    vidas = g['heroi'].vidas
    gosma.pes.x, gosma.pes.y = g['heroi'].pes.x, g['heroi'].pes.y
    yield from t.wait(3)
    t.check(g['heroi'].vidas == vidas - 1, 'o encostão não tirou um coração')
    yield from t.wait(20)
    t.check(g['heroi'].vidas == vidas - 1, 'a invencibilidade não segurou o segundo encostão')
    gosma.pes.x, gosma.pes.y = 3 * casa, 14 * casa
    g['heroi'].vidas = g['VIDAS']

    def andar_ate(alvo, perto):
        """Anda casa a casa até a casa `alvo`; para quando `perto()` já for verdade."""
        for _ in range(80):
            if perto():
                return
            passos = caminho(mapa, casa_de(g['heroi'].pes), alvo)
            if not passos:
                return
            linha, coluna = passos[0]
            cx, cy = coluna * casa + casa / 2, linha * casa + casa / 2
            hx, hy = centro(g['heroi'].pes)
            if coluna != casa_de(g['heroi'].pes)[1]:
                tecla = 'RIGHT' if cx > hx else 'LEFT'
            else:
                tecla = 'DOWN' if cy > hy else 'UP'
            t.hold(tecla)
            for _ in range(30):
                yield
                hx, hy = centro(g['heroi'].pes)
                if (abs(cx - hx) < 4 and abs(cy - hy) < 4) or perto():
                    break
            t.release(tecla)

    def virar_e_golpear(alvo_x, alvo_y):
        hx, hy = centro(g['heroi'].pes)
        dx, dy = alvo_x - hx, alvo_y - hy
        if abs(dx) > abs(dy):
            tecla = 'RIGHT' if dx > 0 else 'LEFT'
        else:
            tecla = 'DOWN' if dy > 0 else 'UP'
        t.hold(tecla)
        yield
        t.release(tecla)
        yield from t.tap('SPACE', 1)
        yield from t.wait(20)

    # Cortar um mato: chegar perto, virar e golpear.
    mato = next(o for o in g['objetos'] if o.nome == 'mato')
    alvo = casa_de(mato.caixa())
    yield from andar_ate(alvo, lambda: distancia(mato.caixa(), g['heroi'].pes) < 40)
    for _ in range(4):
        if mato.cortado:
            break
        yield from virar_e_golpear(*centro(mato.caixa()))
    t.check(mato.cortado, 'a espada não cortou o mato')

    # Limpar a ilha: a gosma mais perto, até não sobrar nenhuma.
    for _ in range(40):
        if g['estado'] != 'jogando' or not g['gosmas']:
            break
        gosma = min(g['gosmas'], key=lambda s: distancia(s.pes, g['heroi'].pes))
        yield from andar_ate(
            casa_de(gosma.pes),
            lambda: gosma not in g['gosmas'] or distancia(gosma.pes, g['heroi'].pes) < 45,
        )
        for _ in range(8):
            if gosma not in g['gosmas']:
                break
            yield from virar_e_golpear(*centro(gosma.pes))
        g['heroi'].vidas = g['VIDAS']  # o roteiro testa a limpeza da ilha, não a esquiva
    if g['estado'] != 'venceu':
        t.shot('sobrou')
    t.check(g['estado'] == 'venceu', f'a ilha ficou com {len(g["gosmas"])} gosmas')
    yield from t.wait(2)
    t.shot('venceu')
    yield from t.tap('ENTER', 1)
    t.check(g['estado'] == 'jogando' and len(g['gosmas']) == 8, 'o Enter não recomeçou')

    # Perder: os corações acabam com encostões seguidos.
    for _ in range(6):
        g['heroi'].invencivel = 0
        gosma = g['gosmas'][0]
        gosma.pes.x, gosma.pes.y = g['heroi'].pes.x, g['heroi'].pes.y
        yield from t.wait(2)
    t.check(g['estado'] == 'perdeu', 'os corações acabaram e não foi o fim')
    t.end()
    yield
