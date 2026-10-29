"""A ponte, a alavanca, a pedra do sino e o laguinho do Poder "A ponte apressada" (Faísca), com o
acabamento da Ilha do Farol.

- Ponte levadiça (`ponte-baixada.svg` e `ponte-levantada.svg` do 2D): dois postes com a roldana na
  margem, uma tábua fixa de entrada e o tabuleiro de tábuas que gira na dobradiça. Repouso =
  levantada; o clipe `baixar` deita o tabuleiro sobre a água e o `subir` o levanta de novo. O
  tabuleiro e os postinhos do outro lado levam `szSemCaixa`: a área de toque é só a entrada, a
  mesma com a ponte em pé ou deitada.
- Alavanca (`alavanca-cima.svg` e `alavanca-baixo.svg`): caixa de madeira e o braço com a bola na
  ponta. Repouso = para cima (bola vermelha); `puxar` leva o braço para a frente e acende a bola
  verde, `soltar` o devolve.
- Pedra do sino (`pedra-do-sino.svg` e `pedra-do-sino-tocando.svg`): pedra com o topo de areia,
  o pórtico de madeira e o sino de bronze. O clipe `tocar` balança o sino e para.
- Laguinho (`laguinho.svg`): a água rasa com a borda de areia e a espuma, chato no chão.

Convenções da Ilha (`../ilha-do-farol-blender/lib_ilha.py`): z para cima, frente em -Y (vira +Z,
o lado da câmera, no three.js). A ponte atravessa no eixo x do jogo: a margem fica no x maior e o
tabuleiro vai para -x (da margem da direita do laguinho até a pedra).
Cores: as do desenho 2D.
"""
import os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ['ILHA_OUT'] = os.environ.get('PONTE_OUT', os.path.join(HERE, 'out'))
# No FIM da busca: a Ilha tem módulos com nomes comuns (cenario, objetos).
sys.path.append(os.path.join(HERE, '../ilha-do-farol-blender'))
from lib_ilha import *  # noqa: E402,F401,F403
import lib_q  # noqa: E402
from mathutils import Euler  # noqa: E402

lib_q.PALETTE.update({
    'p/madeira': ('#9b7150', 0.8, None, 0),
    'p/madeiraClara': ('#b98a63', 0.8, None, 0),
    'p/madeiraEscura': ('#6a4a31', 0.85, None, 0),
    'p/madeiraFunda': ('#5a3e29', 0.85, None, 0),
    'p/ferro': ('#46536e', 0.5, None, 0),
    'p/ferroEscuro': ('#333c57', 0.55, None, 0),
    'p/vermelho': ('#cf3f36', 0.5, None, 0),
    'p/verde': ('#52c27a', 0.45, '#52c27a', 0.25),
    'p/brilho': ('#f3f6fb', 0.4, None, 0),
    'p/ouro': ('#f3b123', 0.3, '#ffcf55', 0.12),
    'p/bronze': ('#d98c1a', 0.35, None, 0),
    'p/bronzeEscuro': ('#a8650f', 0.4, None, 0),
    'p/pedra': ('#7d8698', 0.85, None, 0),
    'p/pedraTopo': ('#9aa2b2', 0.85, None, 0),
    'p/areia': ('#e9d39a', 0.95, None, 0),
    'p/areiaBorda': ('#c9b37a', 0.95, None, 0),
    'p/espuma': ('#f3f6fb', 0.7, None, 0),
    'p/agua': ('#7fcdf0', 0.3, None, 0),
    'p/aguaFunda': ('#4fa8de', 0.3, None, 0),
    'p/corda': ('#d8b57a', 0.95, None, 0),
})


def _rot_y(o, ang, pivo):
    """Gira a malha de `o` em torno do eixo y passando por `pivo` (a pose de repouso)."""
    o.data.transform(Matrix.Translation(-Vector(pivo)))
    o.data.transform(Matrix.Rotation(ang, 4, 'Y'))
    o.data.transform(Matrix.Translation(Vector(pivo)))


# ── Ponte levadiça ──────────────────────────────────────────────────────────
L = 2.0            # comprimento do tabuleiro
LARG = 0.9         # largura
Z_TAB = 0.2        # altura do tabuleiro deitado
# A ponte sai da margem e vai para -x (no jogo, da margem da direita do laguinho até a pedra).
S = -1
LEVANTA = S * R(-78)   # a pose em pé (o tabuleiro sobe girando em y)


def ponte_levadica():
    reset()
    fixa = []
    # A tábua fixa de entrada, na margem (é a área de toque).
    fixa.append(box((0.62, LARG + 0.1, 0.1), (S * -0.33, 0, Z_TAB - 0.02), 'p/madeiraEscura', bevel=0.02))
    for k in range(3):
        fixa.append(box((0.16, LARG, 0.03), (S * (-0.52 + k * 0.19), 0, Z_TAB + 0.04), 'p/madeira', bevel=0.008))
    # Os dois postes da margem, com a travessa e a roldana.
    for sy in (-1, 1):
        fixa.append(box((0.14, 0.14, 1.45), (S * -0.08, sy * (LARG / 2 + 0.1), 0.72), 'p/madeiraEscura', bevel=0.025))
        fixa.append(box((0.18, 0.18, 0.08), (S * -0.08, sy * (LARG / 2 + 0.1), 1.46), 'p/madeiraFunda', bevel=0.02))
    fixa.append(box((0.12, LARG + 0.36, 0.12), (S * -0.08, 0, 1.36), 'p/madeiraFunda', bevel=0.02))
    for sy in (-1, 1):
        fixa.append(cyl(0.1, 0.05, (0.0, sy * 0.3, 1.36), 'p/ferro', verts=16, rot=(R(90), 0, 0)))
    base = join(fixa, 'margem')

    # Os postinhos do outro lado (onde o tabuleiro pousa): sem caixa, como o tabuleiro.
    outro = []
    for sy in (-1, 1):
        outro.append(box((0.12, 0.12, 0.5), (S * (L + 0.08), sy * (LARG / 2 + 0.06), 0.2), 'p/madeiraEscura', bevel=0.02))
    outro.append(box((0.16, LARG + 0.2, 0.08), (S * (L + 0.08), 0, Z_TAB - 0.04), 'p/madeiraFunda', bevel=0.015))
    pouso = join(outro, 'pouso')
    pouso['szSemCaixa'] = True

    # O tabuleiro: tábuas com frestas e duas vigas por baixo, com a origem na dobradiça.
    tab = []
    n = 9
    passo = L / n
    for k in range(n):
        tab.append(box((passo - 0.03, LARG, 0.06), (S * passo * (k + 0.5), 0, 0.0), 'p/madeira' if k % 2 else 'p/madeiraClara', bevel=0.01))
    for sy in (-1, 1):
        tab.append(box((L, 0.08, 0.06), (S * L / 2, sy * (LARG / 2 - 0.08), -0.05), 'p/madeiraEscura', bevel=0.01))
        tab.append(box((L - 0.1, 0.04, 0.04), (S * (L / 2 + 0.03), sy * (LARG / 2 - 0.01), 0.17), 'p/madeiraEscura', bevel=0.008))
        for x in (0.25, L / 2, L - 0.2):
            tab.append(box((0.04, 0.04, 0.16), (S * x, sy * (LARG / 2 - 0.01), 0.08), 'p/madeiraEscura', bevel=0.006))
    # O anel de ferro na ponta, por onde a corrente puxaria.
    tab.append(box((0.06, LARG * 0.5, 0.05), (S * (L - 0.06), 0, 0.05), 'p/ferro', bevel=0.01))
    tabuleiro = join(tab, 'tabuleiro')
    tabuleiro['szSemCaixa'] = True
    tabuleiro.location = Vector((0.0, 0.0, Z_TAB))
    # Repouso = em pé: a malha já sai girada na dobradiça.
    _rot_y(tabuleiro, LEVANTA, (0, 0, 0))

    # `baixar` (24 qps, ~1,2 s): começa devagar, deita, quica um pouco e assenta.
    # `subir`: dá um tranco e levanta, passando um pouquinho e voltando.
    deita = -LEVANTA
    k = S
    chaves = {
        'baixar': {tabuleiro: {'rotation_euler': [
            (0, Euler((0, 0, 0))), (4, Euler((0, k * R(4), 0))), (20, Euler((0, deita + k * R(2), 0))),
            (24, Euler((0, deita - k * R(3), 0))), (29, Euler((0, deita, 0)))]}},
        'subir': {tabuleiro: {'rotation_euler': [
            (0, Euler((0, deita, 0))), (3, Euler((0, deita + k * R(1.5), 0))), (22, Euler((0, k * R(-3), 0))),
            (28, Euler((0, 0, 0)))]}},
    }
    clipes(chaves, fps=24)
    tabuleiro.rotation_euler = Euler((0, 0, 0))
    tabuleiro.location = Vector((0.0, 0.0, Z_TAB))
    exportar_animado('ponte-levadica', [base, pouso, tabuleiro])


# ── Alavanca ────────────────────────────────────────────────────────────────
INCLINA = R(-34)   # braço para cima e para trás (repouso)


def alavanca():
    reset()
    cx = []
    cx.append(box((0.62, 0.42, 0.3), (0, 0, 0.15), 'p/madeiraEscura', bevel=0.03))
    cx.append(box((0.64, 0.44, 0.08), (0, 0, 0.3), 'p/madeira', bevel=0.02))
    cx.append(box((0.5, 0.012, 0.03), (0, -0.215, 0.13), 'p/madeiraFunda', bevel=0.0))
    for sx in (-1, 1):
        cx.append(cyl(0.035, 0.02, (sx * 0.24, -0.215, 0.12), 'p/ouro', verts=12, rot=(R(90), 0, 0)))
    # O trilho por onde o braço corre e o eixo.
    cx.append(box((0.42, 0.1, 0.03), (0, 0, 0.35), 'p/ferroEscuro', bevel=0.01))
    cx.append(cyl(0.07, 0.16, (0, 0, 0.36), 'p/ferroEscuro', verts=16, rot=(R(90), 0, 0)))
    caixa = join(cx, 'caixa')

    br = [cyl(0.035, 0.62, (0, 0, 0.31), 'p/ferro', verts=12)]
    br.append(uvball(0.1, (0, 0, 0.66), 'p/vermelho', seg=16, ring=10))
    br.append(uvball(0.03, (-0.035, -0.06, 0.7), 'p/brilho', seg=10, ring=6))
    braco = join(br, 'braco')
    # A bola verde acende quando a alavanca está puxada (escala 0 no repouso).
    verde = join([uvball(0.104, (0, 0, 0.66), 'p/verde', seg=16, ring=10)], 'bola-verde')
    piv = Vector((0, 0, 0.36))
    for o in (braco, verde):
        o.data.transform(Matrix.Rotation(INCLINA, 4, 'Y'))
        o.location = piv
    puxa = -2 * INCLINA
    chaves = {
        'puxar': {
            braco: {'rotation_euler': [(0, Euler((0, 0, 0))), (8, Euler((0, puxa + R(6), 0))), (12, Euler((0, puxa, 0)))]},
            verde: {'rotation_euler': [(0, Euler((0, 0, 0))), (8, Euler((0, puxa + R(6), 0))), (12, Euler((0, puxa, 0)))],
                    'scale': [(0, Vector((0, 0, 0))), (8, Vector((0, 0, 0))), (10, Vector((1.1, 1.1, 1.1))), (12, Vector((1, 1, 1)))]},
        },
        'soltar': {
            braco: {'rotation_euler': [(0, Euler((0, puxa, 0))), (8, Euler((0, R(-5), 0))), (12, Euler((0, 0, 0)))]},
            verde: {'rotation_euler': [(0, Euler((0, puxa, 0))), (8, Euler((0, R(-5), 0))), (12, Euler((0, 0, 0)))],
                    'scale': [(0, Vector((1, 1, 1))), (2, Vector((0, 0, 0))), (12, Vector((0, 0, 0)))]},
        },
    }
    clipes(chaves, fps=24)
    for o in (braco, verde):
        o.rotation_euler = Euler((0, 0, 0))
        o.location = piv
    verde.scale = Vector((0, 0, 0))
    braco.scale = Vector((1, 1, 1))
    exportar_animado('alavanca', [caixa, braco, verde])


# ── Pedra do sino ───────────────────────────────────────────────────────────
def pedra_do_sino():
    reset()
    corpo = [rock((0, 0, 0), (1.5, 1.2, 0.62), 'p/pedra', seed=11, flat_top=0.45, top_m='p/pedraTopo')]
    corpo.append(slab(blob(0, 0, 0.56, 0.42, seed=4, n=40, wob=0.06), 0.5, 0.56, 'p/areia', bevel=0.02, name='areia'))
    # O pórtico: dois postes e a travessa, de frente para a câmera.
    for sx in (-1, 1):
        corpo.append(box((0.08, 0.08, 1.0), (sx * 0.34, 0.05, 1.02), 'p/madeiraEscura', bevel=0.015))
    corpo.append(box((0.86, 0.1, 0.1), (0, 0.05, 1.54), 'p/madeiraFunda', bevel=0.02))
    corpo.append(box((0.05, 0.05, 0.06), (0, 0.05, 1.47), 'p/ferroEscuro', bevel=0.0))
    base = join(corpo, 'pedra')

    # O sino: um tronco de cone com a boca larga, a aba e o badalo; origem no gancho.
    s = []
    s.append(cyl(0.11, 0.16, (0, 0, -0.1), 'p/bronze', verts=20, r2=0.07))
    s.append(cyl(0.2, 0.22, (0, 0, -0.29), 'p/bronze', verts=24, r2=0.11))
    s.append(torus(0.2, 0.025, (0, 0, -0.4), 'p/bronzeEscuro', seg=24, rseg=8))
    s.append(uvball(0.05, (0, 0, -0.45), 'p/bronzeEscuro', seg=12, ring=8))
    s.append(box((0.03, 0.12, 0.2), (-0.1, -0.15, -0.26), 'p/ouro', bevel=0.01))
    sino = join(s, 'sino')
    sino.location = Vector((0, 0.05, 1.44))
    chaves = {'tocar': {sino: {'rotation_euler': [
        (0, Euler((0, 0, 0))), (4, Euler((0, R(28), 0))), (10, Euler((0, R(-24), 0))), (16, Euler((0, R(18), 0))),
        (22, Euler((0, R(-12), 0))), (28, Euler((0, R(6), 0))), (34, Euler((0, R(-2), 0))), (38, Euler((0, 0, 0)))]}}}
    clipes(chaves, fps=24)
    sino.rotation_euler = Euler((0, 0, 0))
    sino.location = Vector((0, 0.05, 1.44))
    exportar_animado('pedra-do-sino', [base, sino])


# ── Laguinho ────────────────────────────────────────────────────────────────
def laguinho():
    reset()
    rx, ry = 1.75, 1.3
    p = [slab(blob(0, 0, rx + 0.2, ry + 0.2, seed=3, n=72, wob=0.04), 0.0, 0.05, 'p/areiaBorda', bevel=0.02, name='borda')]
    p.append(slab(blob(0, 0, rx + 0.06, ry + 0.06, seed=3, n=72, wob=0.04), 0.0, 0.058, 'p/espuma', name='espuma'))
    p.append(slab(blob(0, 0, rx, ry, seed=3, n=72, wob=0.04), 0.0, 0.062, 'p/agua', name='agua'))
    p.append(slab(blob(0.15, 0.05, rx * 0.66, ry * 0.6, seed=8, n=56, wob=0.05), 0.0, 0.066, 'p/aguaFunda', name='fundo'))
    exportar_estatico('laguinho', p)


TODOS = ['ponte-levadica', 'alavanca', 'pedra-do-sino', 'laguinho']

if __name__ == '__main__':
    pedidas = set(sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else set()
    for pid in TODOS:
        if not pedidas or pid in pedidas:
            globals()[pid.replace('-', '_')]()
