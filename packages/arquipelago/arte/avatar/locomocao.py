"""As animações de movimento do avatar no jogo: andar, correr, pular, cair, aterrissar, nadar,
ficar pendurado no cipó, escalar o tronco e os modos novos do Bosque (equilibrar no tronco caído,
subir escada, pendurar na borda e subir, escorregar).

O avatar é o mesmo da plataforma (esqueleto Mixamo em `community-kids/public/avatar3d/base/`), que
só traz a pose "Idle" com movimento. Este script abre esse esqueleto no Blender sem tela, monta
cada ciclo quadro a quadro e grava só as animações em `src/assets/avatar/locomocao.glb`.

Como os jogos fazem (e como é feito aqui):
- As pernas usam IK de dois ossos: o script decide onde fica o TORNOZELO e calcula coxa e canela.
  No apoio o pé desliza para trás exatamente na velocidade do ciclo; no jogo o corpo anda para a
  frente na mesma velocidade, então o pé fica parado no chão (sem patinar).
- O pé gira sobre o calcanhar ao pisar e sobre a ponta ao sair do chão; os dedos ficam no chão.
- A bacia sobe e desce, balança de lado, gira e inclina; o peito gira ao contrário da bacia; os
  braços balançam ao contrário das pernas; a cabeça compensa parte do balanço (olhar firme).
- A bacia desce sozinha quando um pé não alcança o alvo (como o "pelvis solve" dos jogos).
- Os ciclos fecham (o último quadro é igual ao primeiro) e começam com o pé esquerdo pisando.
  O jogo sincroniza andar e correr pela FASE e ajusta a velocidade do clipe à do chão.

Medidas em metros no mundo do Blender. A frente do avatar é -Y, a esquerda dele é +X e z é para cima.

Rodar (da pasta do pacote):
    /tmp/claude-0/blender-venv/bin/python -B arte/avatar/locomocao.py
"""
import json
import math
import os
import struct
import sys

sys.dont_write_bytecode = True

import bpy  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
PACOTE = os.path.abspath(os.path.join(AQUI, '..', '..'))
RAIZ = os.path.abspath(os.path.join(PACOTE, '..', '..'))
POSES = os.path.join(RAIZ, 'packages/community-kids/public/avatar3d/base/Poses.glb')
SAIDA = os.environ.get('LOCOMOCAO_OUT', os.path.join(PACOTE, 'src/assets/avatar/locomocao.glb'))
FPS = 30
R = math.radians

FRENTE = Vector((0, -1, 0))
CIMA = Vector((0, 0, 1))
X = Vector((1, 0, 0))
Y = Vector((0, 1, 0))
Z = Vector((0, 0, 1))


def suave(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def mistura(a, b, t):
    return a + (b - a) * t


def curva(pontos, t):
    """Interpolação suave por trechos: `pontos` = [(t0, v0), (t1, v1), ...] com t crescente."""
    if t <= pontos[0][0]:
        return pontos[0][1]
    for (t0, v0), (t1, v1) in zip(pontos, pontos[1:]):
        if t <= t1:
            return mistura(v0, v1, suave((t - t0) / (t1 - t0)))
    return pontos[-1][1]


# ── Cena ─────────────────────────────────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=POSES)
cena = bpy.context.scene
cena.render.fps = FPS
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in list(bpy.data.objects):
    if o is not arm:
        bpy.data.objects.remove(o, do_unlink=True)
camada = bpy.context.view_layer
PB = arm.pose.bones


def b(nome):
    return PB['mixamorig:' + nome]


# Ordem pai antes de filho (para atualizar a cadeia em ordem).
def profundidade(pb):
    n = 0
    while pb.parent:
        pb = pb.parent
        n += 1
    return n


OSSOS = sorted(PB, key=profundidade)
# Só os ossos que o avatar da plataforma tem (as pontas `_end_end` só existem neste arquivo).
CHAVEADOS = [pb for pb in OSSOS if not pb.name.endswith('_end_end')]

# A pose de base: o primeiro quadro do "Idle" (braços soltos, dedos relaxados).
idle = bpy.data.actions['Idle']
arm.animation_data.action = idle
cena.frame_set(int(idle.frame_range[0]))
camada.update()
BASE = {pb.name: pb.matrix_basis.copy() for pb in PB}
arm.animation_data.action = None
if arm.animation_data:
    for trilha in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(trilha)
for acao in list(bpy.data.actions):
    bpy.data.actions.remove(acao)
for pb in PB:
    pb.rotation_mode = 'QUATERNION'


def voltar_a_base():
    for pb in PB:
        pb.matrix_basis = BASE[pb.name].copy()
    camada.update()


# O objeto do esqueleto tem escala 0,01 e um giro de 90° em X (o glTF tem y para cima): toda conta
# é feita no MUNDO e convertida para o espaço do esqueleto com a matriz do objeto.
MUNDO = arm.matrix_world.copy()
DO_MUNDO = MUNDO.inverted()


def cabeca(pb):
    """Onde começa o osso, no mundo (metros)."""
    return MUNDO @ pb.head


def girar(pb, q, pivo):
    """Gira o osso (e os filhos) com o quatérnion `q` (no mundo) em volta de um ponto do mundo."""
    no_mundo = Matrix.Translation(pivo) @ q.to_matrix().to_4x4() @ Matrix.Translation(-pivo)
    pb.matrix = DO_MUNDO @ no_mundo @ MUNDO @ pb.matrix
    camada.update()


def mover(pb, d):
    pb.matrix = DO_MUNDO @ Matrix.Translation(d) @ MUNDO @ pb.matrix
    camada.update()


def rotacao(pb):
    """A rotação do osso no mundo."""
    return (MUNDO @ pb.matrix).to_3x3().normalized().to_quaternion()


def q(eixo, angulo):
    return Quaternion(eixo, angulo)


voltar_a_base()
# Medidas da perna (iguais dos dois lados) e do pé, na pose de base.
COXA = (cabeca(b('LeftLeg')) - cabeca(b('LeftUpLeg'))).length
CANELA = (cabeca(b('LeftFoot')) - cabeca(b('LeftLeg'))).length
ALCANCE = COXA + CANELA
TORNOZELO_Z = cabeca(b('LeftFoot')).z
_bola = cabeca(b('LeftToeBase')) - cabeca(b('LeftFoot'))
BOLA_FRENTE = -_bola.y  # a bola do pé fica à frente do tornozelo
BOLA_ABAIXO = -_bola.z
CALCANHAR_ATRAS = 0.035
QUADRIL_X = cabeca(b('LeftUpLeg')).x
BACIA_BASE = cabeca(b('Hips'))
ROT_BASE = {pb.name: rotacao(pb) for pb in PB}
print(f'perna {ALCANCE:.3f} (coxa {COXA:.3f}, canela {CANELA:.3f}), tornozelo {TORNOZELO_Z:.3f}')


# ── O pé: onde fica o tornozelo para um ponto de apoio, um giro e uma altura ─────────────────────
def tornozelo(lado_x, f, giro, altura):
    """`f` é a posição do pé (para a frente) com ele chato no chão; `giro` > 0 levanta o calcanhar
    (gira sobre a bola), < 0 levanta a ponta (gira sobre o calcanhar). Devolve o ponto (metros)."""
    if giro >= 0:
        # Gira sobre a bola do pé (que fica no chão): o tornozelo sobe e vai para trás.
        v = Vector((-BOLA_FRENTE, BOLA_ABAIXO))
        pivo_f, pivo_z = f + BOLA_FRENTE, TORNOZELO_Z - BOLA_ABAIXO
    else:
        # Gira sobre o calcanhar (no chão): a ponta sobe e o tornozelo vai um pouco para trás.
        v = Vector((CALCANHAR_ATRAS, TORNOZELO_Z))
        pivo_f, pivo_z = f - CALCANHAR_ATRAS, 0.0
    a = math.atan2(v.y, v.x) - giro
    fa = pivo_f + v.length * math.cos(a)
    za = pivo_z + v.length * math.sin(a)
    return Vector((lado_x, -fa, za + altura))


# ── IK de dois ossos ─────────────────────────────────────────────────────────────────────────────
def perna(lado, alvo, giro_pe, giro_dedos, abertura=0.12):
    """Põe o tornozelo do lado ('Left'/'Right') no alvo, o pé com `giro_pe` e os dedos com
    `giro_dedos` (no mundo, em volta do eixo X: > 0 é ponta para baixo)."""
    coxa, canela, pe, dedos = b(lado + 'UpLeg'), b(lado + 'Leg'), b(lado + 'Foot'), b(lado + 'ToeBase')
    sinal = 1 if lado == 'Left' else -1
    h = cabeca(coxa)
    para = alvo - h
    d = max(abs(COXA - CANELA) + 1e-4, min(para.length, ALCANCE * 0.999))
    u = para.normalized()
    polo = FRENTE + X * (abertura * sinal)
    p = (polo - u * polo.dot(u)).normalized()
    cos_a = (COXA * COXA + d * d - CANELA * CANELA) / (2 * COXA * d)
    sen_a = math.sqrt(max(0.0, 1 - cos_a * cos_a))
    joelho = h + u * (COXA * cos_a) + p * (COXA * sen_a)
    agora = (cabeca(canela) - h).normalized()
    girar(coxa, agora.rotation_difference((joelho - h).normalized()), h)
    k = cabeca(canela)
    fim = h + u * d
    agora = (cabeca(pe) - k).normalized()
    girar(canela, agora.rotation_difference((fim - k).normalized()), k)
    # O pé no mundo: a rotação de base girada em volta do eixo X.
    desejada = q(X, giro_pe) @ ROT_BASE[pe.name]
    girar(pe, desejada @ rotacao(pe).inverted(), cabeca(pe))
    desejada = q(X, giro_dedos) @ ROT_BASE[dedos.name]
    girar(dedos, desejada @ rotacao(dedos).inverted(), cabeca(dedos))
    return (alvo - h).length / ALCANCE


def bacia(sobe=0.0, lado=0.0, frente=0.0, giro=0.0, rolar=0.0, inclinar=0.0):
    """Mexe a bacia (Hips): deslocamento em metros e giros no mundo (radianos)."""
    hips = b('Hips')
    mover(hips, Vector((lado, -frente, sobe)))
    c = cabeca(hips)
    girar(hips, q(Z, giro) @ q(Y, rolar) @ q(X, inclinar), c)


def tronco(giro=0.0, inclinar=0.0, rolar=0.0):
    """Divide giro, inclinação e rolagem pelos três ossos da coluna."""
    for nome in ('Spine', 'Spine1', 'Spine2'):
        o = b(nome)
        girar(o, q(Z, giro / 3) @ q(X, inclinar / 3) @ q(Y, rolar / 3), cabeca(o))


def braco(lado, balanco, cotovelo, abrir=0.0, frente_extra=0.0):
    """Braço solto da pose de base: `balanco` > 0 leva a mão para a FRENTE; `cotovelo` dobra o
    antebraço (mão para a frente e para cima); `abrir` afasta do corpo."""
    sinal = 1 if lado == 'Left' else -1
    ombro, ante = b(lado + 'Arm'), b(lado + 'ForeArm')
    girar(ombro, q(Y, -abrir * sinal) @ q(X, -(balanco + frente_extra)), cabeca(ombro))
    girar(ante, q(X, -cotovelo), cabeca(ante))


def firmar_cabeca(peso):
    """A cabeça volta `peso` do caminho para a rotação de base (o olhar não balança)."""
    for nome, p in (('Neck', peso * 0.4), ('Head', peso)):
        o = b(nome)
        alvo = ROT_BASE[o.name]
        delta = alvo @ rotacao(o).inverted()
        girar(o, Quaternion().slerp(delta, p), cabeca(o))


def baixar_para_alcancar(alvos, folga=0.985):
    """Quanto a bacia precisa descer para os dois tornozelos alcançarem os alvos."""
    desce = 0.0
    for lado, alvo in alvos:
        h = cabeca(b(lado + 'UpLeg'))
        horiz = math.hypot(alvo.x - h.x, alvo.y - h.y)
        maximo = ALCANCE * folga
        if horiz >= maximo:
            continue
        vertical_max = math.sqrt(maximo * maximo - horiz * horiz)
        desce = max(desce, (h.z - alvo.z) - vertical_max)
    return desce


# ── Ciclos de passo (andar e correr) ─────────────────────────────────────────────────────────────
def pe_no_ciclo(fase, g):
    """Posição (para a frente), giro do pé, altura e giro dos dedos de UM pé numa fase 0..1, com o
    apoio começando em 0 (calcanhar tocando)."""
    d, S = g['apoio'], g['passada'] * g['apoio']
    if fase < d:
        t = fase / d
        f = S / 2 - S * t + g['adiante']
        giro = curva([(0, g['pisada']), (0.18, 0), (g['solta_calcanhar'], 0), (1, g['saida'])], t)
        dedos = 0.0
        altura = 0.0
    else:
        u = (fase - d) / (1 - d)
        atraso = g.get('atraso_no_ar', 0.0)
        f = -S / 2 + S * suave((u - atraso) / (1 - atraso)) + g['adiante']
        altura = g['altura_do_pe'] * math.sin(math.pi * u) ** g.get('forma_do_ar', 1.0)
        giro = curva([(0, g['saida']), (0.35, g['no_ar']), (0.85, g['pisada']), (1, g['pisada'])], u)
        dedos = giro * suave(u / 0.15)
    return f, giro, altura, dedos


def pose_do_ciclo(fase, g):
    voltar_a_base()
    pes = {'Left': pe_no_ciclo(fase % 1, g), 'Right': pe_no_ciclo((fase + 0.5) % 1, g)}
    c = math.cos(2 * math.pi * fase)
    s = math.sin(2 * math.pi * fase)
    # Bacia: mais baixa no apoio que amortece (andar: ao pisar; correr: no meio do apoio).
    meio = g.get('fase_mais_baixa', 0.0)
    sobe = -g['baixa'] - g['balanco_vertical'] * math.cos(4 * math.pi * (fase - meio))
    bacia(
        sobe=sobe,
        lado=g['balanco_lateral'] * s,
        giro=-g['giro_bacia'] * c,
        rolar=-g['rolar_bacia'] * s,
        inclinar=g['inclinacao'],
    )
    alvos = []
    for lado, (f, giro, altura, dedos) in pes.items():
        x = g['largura'] * (1 if lado == 'Left' else -1)
        alvos.append((lado, tornozelo(x, f, giro, altura)))
    # Se um pé não alcança, a bacia desce (nunca estica a perna além do osso).
    desce = baixar_para_alcancar(alvos)
    if desce > 0:
        mover(b('Hips'), Vector((0, 0, -desce)))
    tronco(giro=g['giro_peito'] * c, inclinar=g['inclinacao_peito'])
    # Braço esquerdo vai para a frente quando o pé direito está na frente (fase 0,5).
    braco('Left', -g['braco'] * c, g['cotovelo'] - g['cotovelo_balanco'] * c, g['abrir_braco'])
    braco('Right', g['braco'] * c, g['cotovelo'] + g['cotovelo_balanco'] * c, g['abrir_braco'])
    firmar_cabeca(g['firmar_cabeca'])
    uso = 0.0
    for (lado, alvo), (_, giro, _, dedos) in zip(alvos, pes.values()):
        uso = max(uso, perna(lado, alvo, giro, dedos))
    return uso, desce


ANDAR = dict(
    duracao=0.42,  # um ciclo (dois passos)
    passada=0.62,  # o corpo anda isto por ciclo → 1,48 m/s
    apoio=0.6,
    adiante=0.02,
    largura=0.16,
    pisada=R(-16),
    saida=R(38),
    solta_calcanhar=0.62,
    no_ar=R(4),
    altura_do_pe=0.075,
    baixa=0.015,
    balanco_vertical=0.012,
    balanco_lateral=0.014,
    giro_bacia=R(9),
    rolar_bacia=R(3),
    inclinacao=R(2),
    giro_peito=R(-12),
    inclinacao_peito=R(2),
    braco=R(26),
    cotovelo=R(14),
    cotovelo_balanco=R(8),
    abrir_braco=R(4),
    firmar_cabeca=0.7,
)

CORRER = dict(
    duracao=0.36,
    passada=1.30,  # → 3,6 m/s
    apoio=0.34,
    adiante=0.04,
    largura=0.12,
    pisada=R(-4),
    saida=R(48),
    solta_calcanhar=0.45,
    no_ar=R(22),
    altura_do_pe=0.17,
    atraso_no_ar=0.18,
    forma_do_ar=0.7,
    baixa=0.06,
    balanco_vertical=0.022,
    fase_mais_baixa=0.17,  # o meio do apoio esquerdo
    balanco_lateral=0.008,
    giro_bacia=R(11),
    rolar_bacia=R(2),
    inclinacao=R(9),
    giro_peito=R(-16),
    inclinacao_peito=R(5),
    braco=R(42),
    cotovelo=R(78),
    cotovelo_balanco=R(14),
    abrir_braco=R(6),
    firmar_cabeca=0.75,
)


# ── Poses soltas (pulo, queda, aterrissagem e nado) ──────────────────────────────────────────────
def pernas_soltas(sobe, esq, dir_, giro_pe=R(20)):
    """Pernas no ar: alvos dos tornozelos relativos ao quadril (frente, abaixo)."""
    alvos = []
    for lado, (frente, abaixo, x) in (('Left', esq), ('Right', dir_)):
        h = cabeca(b(lado + 'UpLeg'))
        alvos.append((lado, Vector((h.x + x, h.y - frente, h.z - abaixo))))
    for lado, alvo in alvos:
        perna(lado, alvo, giro_pe, giro_pe * 0.6, abertura=0.25)


def pose_pulo(t):
    """0 → 1: agacha um tiquinho, empurra o chão (corpo esticado, braços para cima) e encolhe."""
    voltar_a_base()
    agacha = curva([(0, 0.0), (0.25, 0.07), (0.5, -0.02), (1, 0.03)], t)
    bacia(sobe=-agacha, inclinar=curva([(0, R(4)), (0.25, R(14)), (0.5, R(2)), (1, R(6))], t))
    tronco(inclinar=curva([(0, 0), (0.25, R(10)), (0.55, R(-4)), (1, R(4))], t))
    for lado in ('Left', 'Right'):
        braco(lado, curva([(0, 0), (0.25, R(-30)), (0.55, R(120)), (1, R(95))], t),
              curva([(0, R(14)), (0.55, R(25)), (1, R(40))], t),
              curva([(0, R(4)), (1, R(22))], t))
    firmar_cabeca(0.5)
    if t <= 0.5:
        # No chão: os pés ficam no lugar, o calcanhar sai no fim do empurrão.
        giro = curva([(0, 0), (0.3, 0), (0.5, R(40))], t)
        for lado in ('Left', 'Right'):
            x = 0.17 * (1 if lado == 'Left' else -1)
            perna(lado, tornozelo(x, 0.0, giro, 0.0), giro, 0.0)
    else:
        u = (t - 0.5) / 0.5
        encolhe = curva([(0, 0.40), (1, 0.30)], u)
        pernas_soltas(0, (curva([(0, 0), (1, 0.10)], u), encolhe, 0.0),
                      (curva([(0, 0), (1, -0.02)], u), encolhe + 0.02, 0.0),
                      giro_pe=curva([(0, R(40)), (1, R(25))], u))


def pose_queda(t):
    """Laço: pernas meio dobradas, uma à frente; braços abertos para cima balançando."""
    voltar_a_base()
    w = 2 * math.pi * t
    bacia(sobe=0.0, inclinar=R(2) + R(2) * math.sin(w))
    tronco(inclinar=R(-3), rolar=R(2) * math.sin(w))
    braco('Left', R(70) + R(10) * math.sin(w), R(35) + R(8) * math.sin(w + 1), R(38) + R(6) * math.cos(w))
    braco('Right', R(70) + R(10) * math.sin(w + 0.6), R(35) + R(8) * math.sin(w + 1.6), R(38) + R(6) * math.cos(w + 0.6))
    firmar_cabeca(0.6)
    pernas_soltas(0, (0.10 + 0.02 * math.sin(w), 0.34, 0.02), (-0.04 + 0.02 * math.sin(w + 2), 0.37, -0.02),
                  giro_pe=R(22))


def pose_aterrissagem(t):
    """0 → 1: os pés tocam o chão, os joelhos amortecem e o corpo volta a ficar em pé."""
    voltar_a_base()
    agacha = curva([(0, 0.02), (0.25, 0.12), (1, 0.0)], t)
    bacia(sobe=-agacha, inclinar=curva([(0, R(4)), (0.25, R(16)), (1, R(0))], t))
    tronco(inclinar=curva([(0, 0), (0.25, R(10)), (1, 0)], t))
    for lado in ('Left', 'Right'):
        braco(lado, curva([(0, R(60)), (0.3, R(25)), (1, 0)], t),
              curva([(0, R(35)), (1, R(14))], t),
              curva([(0, R(30)), (0.3, R(18)), (1, R(4))], t))
    firmar_cabeca(0.6)
    for lado in ('Left', 'Right'):
        x = 0.17 * (1 if lado == 'Left' else -1)
        f = 0.05 if lado == 'Left' else -0.03
        perna(lado, tornozelo(x, f, 0.0, 0.0), 0.0, 0.0)


def pose_nado(t):
    """Laço do nado "cachorrinho": no jogo o corpo inteiro deita para a frente; aqui os braços
    remam alternados na frente do rosto e as pernas batem."""
    voltar_a_base()
    w = 2 * math.pi * t
    bacia(sobe=0.0, inclinar=R(-6), rolar=R(4) * math.sin(w))
    tronco(inclinar=R(-14), giro=R(6) * math.sin(w))
    for lado, atraso in (('Left', 0.0), ('Right', math.pi)):
        a = w + atraso
        braco(lado, R(115) + R(35) * math.sin(a), R(55) + R(30) * math.cos(a), R(14) + R(8) * math.cos(a))
    firmar_cabeca(0.2)
    # A cabeça olha para a frente (o corpo está deitado no jogo): sobe o queixo.
    girar(b('Head'), q(X, R(-38)), cabeca(b('Head')))
    pernas_soltas(0, (0.06 * math.sin(w), 0.40, 0.03), (0.06 * math.sin(w + math.pi), 0.40, -0.03),
                  giro_pe=R(45))


def pose_pendurado(t):
    """Laço pendurado no cipó: braços no alto (o jogo ainda mira as mãos na corda), pernas soltas,
    um pouco dobradas, balançando devagar uma contra a outra."""
    voltar_a_base()
    w = 2 * math.pi * t
    bacia(sobe=0.0, inclinar=R(-4) + R(2) * math.sin(w))
    tronco(inclinar=R(-6), rolar=R(1.5) * math.sin(w))
    for lado, atraso in (('Left', 0.0), ('Right', 0.5)):
        braco(lado, R(165) + R(3) * math.sin(w + atraso), R(10), R(8))
    firmar_cabeca(0.35)
    # Cada perna vai e volta (frente) e dobra o joelho na ida, meia volta depois da outra.
    alvos = []
    for fase, x in ((w, 0.03), (w + math.pi, -0.03)):
        alvos.append((0.05 + 0.12 * math.sin(fase), 0.36 - 0.05 * max(0.0, math.sin(fase)), x))
    pernas_soltas(0, alvos[0], alvos[1], giro_pe=R(28))


ESCALAR = dict(
    duracao=0.8,  # um ciclo (dois passos de pé e duas mãos)
    passada=0.5,  # o corpo sobe isto por ciclo
)


def pose_escalar(t):
    """Ciclo de subir no tronco (o avatar de frente para ele): o pé apoiado na casca desce em
    relação ao corpo enquanto o corpo sobe; o outro sai da casca e sobe para o próximo apoio. A mão
    do lado oposto alcança junto, como numa escada."""
    voltar_a_base()
    w = 2 * math.pi * t
    bacia(lado=0.035 * math.sin(w), giro=R(6) * math.sin(w), inclinar=R(10))
    tronco(inclinar=R(4), giro=R(-8) * math.sin(w), rolar=R(4) * math.sin(w))
    # Mão esquerda alcança no alto quando o pé direito sobe (meia volta depois do esquerdo); a
    # outra fica na altura do peito, agarrada, com o cotovelo dobrado.
    for lado, atraso in (('Left', 0.0), ('Right', math.pi)):
        alto = 0.5 + 0.5 * math.cos(w + atraso)  # 1 = esticada no alto
        braco(lado, R(90) + R(85) * alto, R(80) - R(70) * alto, R(16))
    firmar_cabeca(0.4)
    d = 0.5
    S = ESCALAR['passada'] * d
    alvos = {}
    for lado, fase in (('Left', t), ('Right', (t + 0.5) % 1)):
        if fase < d:
            u = fase / d
            abaixo = 0.16 + S * u  # apoiado: desce em relação ao corpo
            frente = 0.22
        else:
            u = (fase - d) / (1 - d)
            abaixo = 0.16 + S - S * suave(u)  # solto: sobe para o próximo apoio
            frente = 0.22 - 0.14 * math.sin(math.pi * u)  # sai da casca e volta
        alvos[lado] = (frente, abaixo, 0.06 if lado == 'Left' else -0.06)
    pernas_soltas(0, alvos['Left'], alvos['Right'], giro_pe=R(-10))


# ── Modos novos do Bosque (controlador universal, parte 6) ───────────────────────────────────────
EQUILIBRAR = dict(
    ANDAR,
    duracao=0.5,
    passada=0.5,  # passo curto: o corpo anda isto por ciclo (o jogo toca pela distância)
    largura=0.035,  # um pé na frente do outro, em cima do eixo do tronco
    altura_do_pe=0.05,
    balanco_lateral=0.024,
    giro_bacia=R(5),
    rolar_bacia=R(5),
    giro_peito=R(-5),
    braco=R(5),
    cotovelo=R(18),
    cotovelo_balanco=R(5),
    abrir_braco=R(72),  # braços abertos para o equilíbrio
    firmar_cabeca=0.85,
)

ESCADA = dict(
    duracao=0.7,  # um ciclo (dois degraus de cada pé e duas mãos)
    passada=0.5,  # o corpo sobe isto por ciclo
)


def pose_escada(t):
    """Ciclo de subir escada reta (de frente para ela): como o Escalar, mas de corpo em pé, mãos na
    largura dos ombros nos degraus e pés perto da escada."""
    voltar_a_base()
    w = 2 * math.pi * t
    bacia(lado=0.02 * math.sin(w), giro=R(4) * math.sin(w), inclinar=R(4))
    tronco(inclinar=R(2), giro=R(-5) * math.sin(w), rolar=R(3) * math.sin(w))
    for lado, atraso in (('Left', 0.0), ('Right', math.pi)):
        alto = 0.5 + 0.5 * math.cos(w + atraso)
        braco(lado, R(100) + R(70) * alto, R(70) - R(55) * alto, R(9))
    firmar_cabeca(0.5)
    d = 0.5
    S = ESCADA['passada'] * d
    alvos = {}
    for lado, fase in (('Left', t), ('Right', (t + 0.5) % 1)):
        if fase < d:
            u = fase / d
            abaixo = 0.18 + S * u
            frente = 0.16
        else:
            u = (fase - d) / (1 - d)
            abaixo = 0.18 + S - S * suave(u)
            frente = 0.16 - 0.08 * math.sin(math.pi * u)
        alvos[lado] = (frente, abaixo, 0.09 if lado == 'Left' else -0.09)
    pernas_soltas(0, alvos['Left'], alvos['Right'], giro_pe=R(-6))


def pose_pendurar_borda(t):
    """Laço pendurado na borda: as mãos no alto, à frente (na quina), o corpo perto da parede e as
    pernas soltas balançando de leve."""
    voltar_a_base()
    w = 2 * math.pi * t
    bacia(sobe=0.0, inclinar=R(-3) + R(1.5) * math.sin(w))
    tronco(inclinar=R(-5), rolar=R(1) * math.sin(w))
    for lado in ('Left', 'Right'):
        braco(lado, R(158), R(16), R(17))
    firmar_cabeca(0.3)
    girar(b('Head'), q(X, R(-10)), cabeca(b('Head')))  # olha a quina, um pouco para cima
    pernas_soltas(0, (0.08 + 0.03 * math.sin(w), 0.40, 0.04), (0.08 + 0.03 * math.sin(w + math.pi), 0.40, -0.04),
                  giro_pe=R(25))


def alvo_pendurado(lado, frente, abaixo, x):
    h = cabeca(b(lado + 'UpLeg'))
    return Vector((h.x + x, h.y - frente, h.z - abaixo))


def pose_subir_borda(t):
    """0 → 1 (uma vez): de pendurado na borda até de pé em cima dela. Os braços puxam e depois
    empurram para baixo, o corpo se curva por cima da quina, um joelho sobe e o corpo levanta. O
    jogo leva o corpo do pendurado até em cima no mesmo tempo."""
    voltar_a_base()
    bacia(inclinar=curva([(0, R(-3)), (0.5, R(24)), (0.85, R(6)), (1, 0)], t))
    tronco(inclinar=curva([(0, R(-5)), (0.5, R(20)), (0.85, R(4)), (1, 0)], t))
    for lado in ('Left', 'Right'):
        braco(lado, curva([(0, R(158)), (0.45, R(85)), (0.75, R(25)), (1, R(4))], t),
              curva([(0, R(16)), (0.45, R(95)), (0.75, R(35)), (1, R(14))], t),
              curva([(0, R(17)), (0.6, R(14)), (1, R(4))], t))
    firmar_cabeca(0.5)
    # Pernas: soltas no começo; a esquerda sobe o joelho para a quina; no fim as duas em pé.
    em_pe = suave((t - 0.75) / 0.25)
    joelho = curva([(0, 0.0), (0.45, 0.0), (0.65, 1.0), (0.85, 1.0), (1, 0.0)], t)
    for lado in ('Left', 'Right'):
        x = 0.04 if lado == 'Left' else -0.04
        solto = alvo_pendurado(lado, 0.08, 0.40, x)
        if lado == 'Left':
            solto = solto.lerp(alvo_pendurado(lado, 0.30, 0.16, x), joelho)
        de_pe = tornozelo(0.17 if lado == 'Left' else -0.17, 0.0, 0.0, 0.0)
        alvo = solto.lerp(de_pe, em_pe)
        giro = mistura(R(25), 0.0, em_pe)
        perna(lado, alvo, giro, giro * 0.6, abertura=0.25)


def pose_escorregar(t):
    """Laço do escorregador: sentado, pernas esticadas para a frente, corpo um pouco para trás e
    braços para trás, com uma tremidinha da descida."""
    voltar_a_base()
    w = 2 * math.pi * t
    senta = BACIA_BASE.z - 0.18  # a bacia fica a uns 18 cm da pista
    bacia(sobe=-senta, lado=0.004 * math.sin(4 * w), inclinar=R(-18))
    tronco(inclinar=R(-12), rolar=R(1.5) * math.sin(2 * w))
    for lado in ('Left', 'Right'):
        braco(lado, R(-32) + R(3) * math.sin(w), R(12), R(22))
    firmar_cabeca(0.6)
    girar(b('Head'), q(X, R(10)), cabeca(b('Head')))  # olha para a frente da pista
    pernas_soltas(0, (0.42, 0.05, 0.07), (0.42, 0.05, -0.07), giro_pe=R(-18))


# ── Gravar ───────────────────────────────────────────────────────────────────────────────────────
def gravar(nome, quadros, pose, laco=True):
    """Cria a ação `nome` com `quadros` + 1 chaves (no laço, a última repete a primeira)."""
    acao = bpy.data.actions.new(nome)
    arm.animation_data_create()
    arm.animation_data.action = acao
    usos = []
    for i in range(quadros + 1):
        t = (i % quadros) / quadros if laco else i / quadros
        r = pose(t)
        if r:
            usos.append(r)
        for pb in CHAVEADOS:
            pb.keyframe_insert('rotation_quaternion', frame=i)
        b('Hips').keyframe_insert('location', frame=i)
    acao.use_fake_user = True
    if usos:
        print(f'{nome}: perna usa até {max(u for u, _ in usos):.3f} do alcance; '
              f'bacia desceu até {max(d for _, d in usos) * 100:.1f} cm')
    # NLA: uma faixa por ação para o exportador gravar cada uma separada.
    trilha = arm.animation_data.nla_tracks.new()
    trilha.name = nome
    trilha.strips.new(nome, 0, acao)
    arm.animation_data.action = None
    return acao


def ciclo(g):
    return lambda t: pose_do_ciclo(t, g)


resumo = {}
for nome, g in (('Andar', ANDAR), ('Correr', CORRER)):
    quadros = round(g['duracao'] * FPS)
    gravar(nome, quadros, ciclo(g))
    resumo[nome] = {
        'duracao': quadros / FPS,
        'passada': g['passada'],
        'velocidade': g['passada'] / (quadros / FPS),
    }
gravar('Pulo', round(0.36 * FPS), pose_pulo, laco=False)
gravar('Queda', round(1.2 * FPS), pose_queda)
gravar('Aterrissagem', round(0.34 * FPS), pose_aterrissagem, laco=False)
gravar('Nado', round(1.1 * FPS), pose_nado)
gravar('Pendurado', round(1.6 * FPS), pose_pendurado)
gravar('Escalar', round(ESCALAR['duracao'] * FPS), pose_escalar)
resumo['Escalar'] = {'duracao': round(ESCALAR['duracao'] * FPS) / FPS, 'passada': ESCALAR['passada']}
gravar('Equilibrar', round(EQUILIBRAR['duracao'] * FPS), ciclo(EQUILIBRAR))
resumo['Equilibrar'] = {'duracao': round(EQUILIBRAR['duracao'] * FPS) / FPS, 'passada': EQUILIBRAR['passada']}
gravar('SubirEscada', round(ESCADA['duracao'] * FPS), pose_escada)
resumo['SubirEscada'] = {'duracao': round(ESCADA['duracao'] * FPS) / FPS, 'passada': ESCADA['passada']}
gravar('PendurarBorda', round(1.4 * FPS), pose_pendurar_borda)
gravar('SubirBorda', round(0.5 * FPS), pose_subir_borda, laco=False)
gravar('Escorregar', round(1.0 * FPS), pose_escorregar)

os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
camada.objects.active = arm
voltar_a_base()
bpy.ops.export_scene.gltf(
    filepath=SAIDA,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_force_sampling=True,
    export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True,
    export_anim_slide_to_zero=True,
    export_skins=True,
    export_morph=False,
    export_materials='NONE',
)


def enxugar(caminho):
    """Tira do GLB o que não muda e o que o avatar não tem: a escala de todos os ossos, a posição
    de todos menos a bacia e as pontas `_end_end`. Reescreve o binário só com o que sobrou."""
    with open(caminho, 'rb') as f:
        dados = f.read()
    n = struct.unpack_from('<I', dados, 12)[0]
    gltf = json.loads(dados[20:20 + n])
    binario = dados[20 + n + 8:]
    nomes = [no.get('name', '') for no in gltf['nodes']]

    def fica(canal):
        alvo = canal['target']
        nome = nomes[alvo['node']]
        if nome.endswith('_end_end') or alvo['path'] == 'scale':
            return False
        return alvo['path'] != 'translation' or nome == 'mixamorig:Hips'

    usados = []
    for anim in gltf['animations']:
        canais = [c for c in anim['channels'] if fica(c)]
        amostras = sorted({c['sampler'] for c in canais})
        nova = {old: i for i, old in enumerate(amostras)}
        anim['samplers'] = [anim['samplers'][i] for i in amostras]
        for c in canais:
            c['sampler'] = nova[c['sampler']]
        anim['channels'] = canais
        for s_ in anim['samplers']:
            usados += [s_['input'], s_['output']]
    # Novos acessores e um bufferView por acessor, colados em sequência (alinhados em 4).
    novos_acessores, vistas, pedaco = [], [], bytearray()
    mapa = {}
    for i in sorted(set(usados)):
        a = dict(gltf['accessors'][i])
        v = gltf['bufferViews'][a['bufferView']]
        tam = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']] * 4 * a['count']
        ini = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        while len(pedaco) % 4:
            pedaco.append(0)
        vistas.append({'buffer': 0, 'byteOffset': len(pedaco), 'byteLength': tam})
        pedaco += binario[ini:ini + tam]
        a['bufferView'] = len(vistas) - 1
        a.pop('byteOffset', None)
        mapa[i] = len(novos_acessores)
        novos_acessores.append(a)
    for anim in gltf['animations']:
        for s_ in anim['samplers']:
            s_['input'], s_['output'] = mapa[s_['input']], mapa[s_['output']]
    gltf['accessors'], gltf['bufferViews'] = novos_acessores, vistas
    gltf['buffers'] = [{'byteLength': len(pedaco)}]
    texto = json.dumps(gltf, separators=(',', ':')).encode()
    texto += b' ' * (-len(texto) % 4)
    while len(pedaco) % 4:
        pedaco.append(0)
    total = 12 + 8 + len(texto) + 8 + len(pedaco)
    with open(caminho, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(texto), 0x4E4F534A) + texto)
        f.write(struct.pack('<II', len(pedaco), 0x004E4942) + bytes(pedaco))


enxugar(SAIDA)
print(json.dumps(resumo, indent=2))
print('gravado', SAIDA, os.path.getsize(SAIDA) // 1024, 'KB')
