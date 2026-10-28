"""Lumis da praia (a sua ilha): Estrelinha (comum) e Búzio (raro). Nomes provisórios.

  /tmp/claude-0/blender-venv/bin/python arte/lumis/praia.py   # grava src/assets/lumis/{estrelinha,buzio}.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_lumis as L  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402


def exportar(nome, info):
    """`L.exportar` com as faixas de NLA desligadas: o exportador liga uma por vez para gravar cada
    clipe, e a pose parada do arquivo fica a de descanso (com as faixas ligadas, a de cima, o
    `feliz`, ficaria valendo no arquivo, de olhos fechadinhos)."""
    for o in L.bpy.data.objects:
        if o.animation_data:
            for faixa in o.animation_data.nla_tracks:
                faixa.mute = True
    L.exportar(nome, info)


# ---------------------------------------------------------------- rosto

# O rosto é o da lib (`L.rosto`), com as camadas um pouco mais afastadas: na lib a pupila fica a
# 3 mm do branco, a boca a 3 mm do corpo e a língua a 1,5 mm da boca, dentro da tolerância de
# `scripts/faces-coplanares.ts` (faces de materiais diferentes no mesmo plano piscam no jogo). Aqui
# a boca fica a 4,5 mm do corpo e cada camada por cima a 6 mm.
CAMADA = 0.006


def olhos(alvo, x, z, larg, alt, pupila=0.8):
    pecas = []
    for lado in (-1, 1):
        cx = x * lado
        branco = L.decalque(alvo, 'olho', (cx, z), (larg, alt), alto=0.004, bojo=alt * 0.22, aneis=3)
        pup = L.decalque(branco, 'pupila', (cx, z), (larg * pupila, alt * pupila), alto=CAMADA, bojo=alt * 0.04,
                         aneis=2)
        b1 = L.decalque(pup, 'olho', (cx + larg * 0.3 * pupila, z + alt * 0.32 * pupila),
                        (larg * 0.3 * pupila, alt * 0.27 * pupila), forma=L.forma_elipse(12), alto=CAMADA,
                        bojo=alt * 0.03, aneis=1)
        b2 = L.decalque(pup, 'olho', (cx - larg * 0.3 * pupila, z - alt * 0.36 * pupila),
                        (larg * 0.13 * pupila, alt * 0.12 * pupila), forma=L.forma_elipse(8), alto=CAMADA, aneis=1)
        pecas += [branco, pup, b1, b2]
    return pecas


def rosto(alvo, olho_x, olho_z, olho_larg, olho_alt, boca_z, boca_larg, boca_alt, bochecha_x, bochecha_z,
          bochecha=(0.06, 0.035)):
    """Devolve (peças que vão no corpo, peças dos olhos), como `L.rosto`."""
    olho = olhos(alvo, olho_x, olho_z, olho_larg, olho_alt)
    pecas = [L.decalque(alvo, 'boca', (0, boca_z), (boca_larg, boca_alt), forma=L.forma_boca(), alto=0.0045, aneis=1),
             L.decalque(alvo, 'lingua', (0, boca_z - boca_alt * 0.55), (boca_larg * 0.5, boca_alt * 0.32),
                        alto=0.0045 + CAMADA, aneis=1)]
    for lado in (-1, 1):
        pecas.append(L.decalque(alvo, 'bochecha', (bochecha_x * lado, bochecha_z), bochecha, alto=0.004, bojo=0.004,
                                aneis=1))
    return pecas, olho


# ---------------------------------------------------------------- Estrelinha

class Estrela(L.Lumi):
    """Os braços da estrela apontam para os lados (os dos outros Lumis ficam pendurados): o mesmo
    clipe da lib vira um giro menor para cima (o abrir) e um giro para a frente (o martelar)."""

    def gravar(self, nome, quadros, funcao, laco=True):
        def da_estrela(lumi, t):
            poses = funcao(lumi, t)
            for o, lado in self.bracos:
                if o in poses:
                    dl, dr, es = poses[o]
                    abre = -dr[1] * lado
                    frente = -dr[0]
                    poses[o] = (dl, (0, -lado * abre * 0.45, -lado * frente * 0.45), es)
            return poses
        super().gravar(nome, quadros, da_estrela, laco)


C_ESTRELA = Vector((0, 0, 0.5))
R_MIOLO = 0.27
# Comprimento de cada ponta, a partir da de cima e girando para o lado direito do Lumi (-X): a de
# cima, a do lado direito (toquinho, o braço sai dela), as duas de baixo e a do lado esquerdo.
PONTAS = (0.52, 0.33, 0.48, 0.48, 0.33)


def _ponta(teta):
    """(índice da ponta mais perto, quanto o ângulo está no meio dela de 0 a 1)."""
    fi = teta - math.pi / 2
    passo = 2 * math.pi / 5
    k = round(fi / passo)
    d = fi - k * passo
    return k % 5, max(0.0, math.cos(2.5 * d)) ** 1.3


def estrelinha():
    L.comecar({
        'corpo': ('#ff9a3c', 0.45, None, 0, 1),
        'corpo2': ('#ef7429', 0.55, None, 0, 1),
        'detalhe': ('#fff0d2', 0.6, None, 0, 1),
        'luz': ('#fff6b8', 0.3, '#ffd84a', 6.0, 1),
        'pupila': ('#2b1608', 0.25, None, 0, 1),
        'bochecha': ('#ff6f8e', 0.8, None, 0, 1),
    })
    # A estrela fofa: uma bola de polos na frente e atrás, esticada em cinco pontas redondas, mais
    # grossa no meio (a barriga estufada) e mais fina nas pontas.
    estrela = L.bola('corpo', 1.0, (0, 0, 0), seg=50, aneis=14, rot=(90, 0, 0))

    def estrelar(v):
        rho = math.hypot(v.x, v.z)
        teta = math.atan2(v.z, v.x)
        k, g = _ponta(teta)
        r = R_MIOLO + (PONTAS[k] - R_MIOLO) * g
        grossura = 0.23 * (1 - 0.45 * g * rho * rho) * (1.0 if v.y < 0 else 0.8)
        return C_ESTRELA + Vector((v.x * r, v.y * grossura, v.z * r))

    L.deformar(estrela, estrelar)
    rosto_, olho = rosto(estrela, 0.122, 0.56, 0.084, 0.106, boca_z=0.425, boca_larg=0.05, boca_alt=0.04,
                          bochecha_x=0.2, bochecha_z=0.45, bochecha=(0.048, 0.029))
    cor = L.coracao(estrela, 0.315, 0.046)

    def no_eixo(ang, r, z0=C_ESTRELA.z):
        a = math.radians(ang)
        return (r * math.cos(a), z0 + r * math.sin(a))

    # Bolinhas claras em fila no meio de cada ponta e a pontinha acesa, como as estrelas do céu.
    pintas = []
    for k, ang in ((0, 90), (2, 234), (3, 306)):
        comp = PONTAS[k]
        for r, t in ((comp - 0.2, 0.026), (comp - 0.135, 0.022)):
            pintas.append(L.decalque(estrela, 'detalhe', no_eixo(ang, r), (t, t), alto=0.003, bojo=0.006, aneis=1,
                                     forma=L.forma_elipse(10)))
        pintas.append(L.decalque(estrela, 'luz', no_eixo(ang, comp - 0.07), (0.03, 0.03), alto=0.003, bojo=0.008,
                                 aneis=1, forma=L.forma_elipse(10)))
    # Nas costas, as bolinhas claras seguem em fila do meio até cada ponta.
    for ang in (90, 18, 162, 234, 306):
        k = (ang - 90) // 72 % 5
        for r, t in ((0.12, 0.024), (PONTAS[k] - 0.2, 0.024), (PONTAS[k] - 0.12, 0.02)):
            if PONTAS[k] - 0.2 < 0.15 and r != 0.12:
                continue
            pintas.append(L.decalque(estrela, 'detalhe', no_eixo(ang, r), (t, t), alto=0.003, bojo=0.005, aneis=1,
                                     forma=L.forma_elipse(8), direcao=(0, -1, 0)))
    pintas.append(L.decalque(estrela, 'detalhe', no_eixo(0, 0), (0.03, 0.03), alto=0.003, bojo=0.006, aneis=1,
                             forma=L.forma_elipse(10), direcao=(0, -1, 0)))
    corpo = L.juntar([estrela, *rosto_, cor, *pintas], 'corpo', pivo=(0, 0, 0.08))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.24, 0.56))

    # Os braços são as pontas dos lados: saem dos toquinhos e balançam soltos.
    bracos = []
    for lado in (1, -1):
        ang = 18 if lado > 0 else 162
        a = math.radians(ang)
        eixo = Vector((math.cos(a), 0, math.sin(a)))
        rs = (0.17, 0.25, 0.33, 0.41, 0.49)
        pts = [C_ESTRELA + eixo * r for r in rs]
        b = L.tubo('corpo', pts, [0.125, 0.112, 0.092, 0.066, 0.038], seg=14)
        ponta = L.bola('corpo', 0.038, pts[-1], seg=10, aneis=6)
        b = L.juntar([b, ponta], 'b')
        L.deformar(b, lambda v: Vector((v.x, v.y * (0.66 if v.y < 0 else 0.56), v.z)))
        enfeite = []
        for r, t in ((0.3, 0.024), (0.37, 0.02)):
            c = C_ESTRELA + eixo * r
            enfeite.append(L.decalque(b, 'detalhe', (c.x, c.z), (t, t), alto=0.003, bojo=0.005, aneis=1,
                                      forma=L.forma_elipse(10)))
        c = C_ESTRELA + eixo * 0.45
        enfeite.append(L.decalque(b, 'luz', (c.x, c.z), (0.026, 0.026), alto=0.003, bojo=0.007, aneis=1,
                                  forma=L.forma_elipse(10)))
        pivo = C_ESTRELA + eixo * 0.24
        bracos.append((L.juntar([b, *enfeite], f'braco-{"e" if lado > 0 else "d"}', pivo=tuple(pivo)), lado))

    # Pezinhos debaixo das duas pontas de baixo.
    pes = []
    for lado, fase in ((1, 0.0), (-1, 0.5)):
        x = lado * 0.235
        pe = L.bola('corpo2', 1, (x, -0.035, 0.05), (0.1, 0.125, 0.06), seg=12, aneis=6)
        pes.append((L.juntar([pe], f'pe-{"e" if lado > 0 else "d"}', pivo=(x, -0.035, 0.05)), lado, fase))

    lumi = Estrela('estrelinha', corpo, olhos, bracos=bracos, pes=pes, pulo=0.34, passo=0.075)
    lumi.animar()
    exportar('estrelinha', {'familia': 'praia', 'raridade': 'comum'})


# ---------------------------------------------------------------- Búzio

def espiral(base, inclina, altura=0.64, voltas=4.0, raio=0.085, grossura=0.2, n=40):
    """A concha de búzio: um tubo que sobe em espiral afinando até a ponta, com as voltas encostadas
    (a costura entre uma volta e a de cima vira o sulco). Devolve os pontos e os raios do tubo e o
    caminho do sulco, onde corre a listra. `base` é o meio da volta de baixo; `inclina` deita a
    ponta para trás."""
    m = Matrix.Translation(base) @ Matrix.Rotation(math.radians(inclina), 4, 'X')

    def volta(t):
        u = 1 - t
        fi = 2 * math.pi * voltas * t + math.pi / 2
        return fi, raio * u, grossura * u ** 1.1 + 0.008, altura * (1 - u ** 1.35)

    centro, raios, sulco = [], [], []
    for i in range(n + 1):
        t = i / n
        fi, rh, rt, z = volta(t)
        fora = Vector((math.cos(fi), math.sin(fi), 0))
        centro.append(m @ (fora * rh + Vector((0, 0, z))))
        raios.append(rt)
        # O sulco: onde o círculo desta volta cruza o da volta de cima, do lado de fora.
        t2 = t + 1 / voltas
        if t2 <= 0.97:
            _, rh2, rt2, z2 = volta(t2)
            a, b = Vector((rh, z)), Vector((rh2, z2))
            d = (b - a).length
            x = (d * d + rt * rt - rt2 * rt2) / (2 * d)
            h = math.sqrt(max(0.0, rt * rt - x * x))
            ab = (b - a) / d
            q = a + ab * x + Vector((ab.y, -ab.x)) * h
            if q.x < rh:
                q = a + ab * x - Vector((ab.y, -ab.x)) * h
            sulco.append(m @ (fora * (q.x + 0.006) + Vector((0, 0, q.y))))
    return centro, raios, sulco


def buzio():
    L.comecar({
        'corpo': ('#5fd6cf', 0.4, None, 0, 1),
        'corpo2': ('#33afb0', 0.55, None, 0, 1),
        'detalhe': ('#ffc596', 0.45, None, 0, 1),
        'detalhe2': ('#f0727f', 0.5, None, 0, 1),
        'luz': ('#fff6b8', 0.3, '#ffe066', 6.0, 1),
        'pupila': ('#13283a', 0.25, None, 0, 1),
        'bochecha': ('#ff86a8', 0.8, None, 0, 1),
        'faisca': ('#e8fffb', 0.3, '#9ff7ee', 5.0, 1),
    })
    C, R = Vector((0, 0, 0.45)), 0.4
    casca = L.bola('corpo', R, C, (1.03, 1.0, 0.95), seg=24, aneis=14)
    rosto_, olho = rosto(casca, 0.145, 0.5, 0.086, 0.108, boca_z=0.365, boca_larg=0.05, boca_alt=0.038,
                          bochecha_x=0.25, bochecha_z=0.395)
    cor = L.coracao(casca, 0.215, 0.052)
    corpo = L.juntar([casca, *rosto_, cor], 'corpo', pivo=(0, 0, 0.08))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.4, 0.5))

    # A conchinha de búzio nas costas, cor de areia com a listra coral no sulco, e a pontinha acesa.
    base = Vector((0, 0.13, 0.75))
    centro, raios, listra = espiral(base, -16)
    concha = [L.tubo("detalhe", centro, raios, seg=9)]
    fio = listra[::2] + listra[-1:]
    concha.append(L.tubo('detalhe2', fio, [0.026 * (1 - 0.5 * i / len(fio)) for i in range(len(fio))], seg=6))
    concha.append(L.bola('luz', 0.035, centro[-1] + (centro[-1] - centro[-3]).normalized() * 0.018, seg=10, aneis=6))
    concha = L.juntar(concha, 'concha', pivo=tuple(base))

    # Duas anteninhas de caracol na testa, com uma gotinha de luz na ponta.
    antenas = []
    for lado in (1, -1):
        pts = [(lado * 0.1, -0.2, 0.74), (lado * 0.13, -0.24, 0.83), (lado * 0.17, -0.27, 0.9)]
        t = L.tubo('corpo', pts, [0.032, 0.027, 0.023], seg=6)
        bolinha = L.bola('luz', 0.046, (lado * 0.18, -0.277, 0.925), seg=9, aneis=6)
        antenas.append((L.juntar([t, bolinha], f'antena-{"e" if lado > 0 else "d"}', pivo=pts[0]), 14,
                        0.0 if lado > 0 else 0.3))

    roda = L.faiscas(0.4, 1.42)
    lumi = L.Lumi('buzio', corpo, olhos, bracos=L.bracinhos('corpo', 0.37, 0.33, tam=(0.062, 0.062, 0.105)),
                  pes=L.pezinhos('corpo2', 0.16, tam=(0.105, 0.135, 0.065)),
                  enfeites=[(concha, 5, 0.15), *antenas], faiscas=roda, pulo=0.3, passo=0.07)
    lumi.animar()
    exportar('buzio', {'familia': 'praia', 'raridade': 'raro'})


if __name__ == '__main__':
    estrelinha()
    buzio()
