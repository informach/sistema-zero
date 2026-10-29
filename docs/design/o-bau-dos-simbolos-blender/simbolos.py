"""As pedras dos símbolos e a placa da ordem do Poder "O baú dos símbolos" (Faísca), com o
acabamento da Ilha do Farol. O baú é o `bau-do-tesouro` das Moedas (clipe `abrir`).

- Pedra do sol, da lua e da estrela (`pedra-sol.svg` … `pedra-estrela-acesa.svg` do 2D): pedra
  baixa e lapidada com um rosto redondo virado para a câmera e o símbolo gravado nele. Repouso =
  apagada (o símbolo escuro, de pedra); o clipe `acender` faz o símbolo dourado e o halo crescerem
  e brilharem, e o `apagar` os recolhe.
- Placa da ordem (`placa-da-ordem.svg`): a tabuleta de madeira em dois postes com o sol, a lua e a
  estrela em fila, da esquerda para a direita.

Convenções da Ilha (`../ilha-do-farol-blender/lib_ilha.py`): z para cima, frente em -Y (vira +Z,
o lado da câmera, no three.js). Cores: as do desenho 2D.
"""
import os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ['ILHA_OUT'] = os.environ.get('SIMBOLOS_OUT', os.path.join(HERE, 'out'))
# No FIM da busca: a Ilha tem módulos com nomes comuns (cenario, objetos).
sys.path.append(os.path.join(HERE, '../ilha-do-farol-blender'))
from lib_ilha import *  # noqa: E402,F401,F403
import lib_q  # noqa: E402

lib_q.PALETTE.update({
    's/pedra': ('#7d8698', 0.85, None, 0),
    's/pedraEscura': ('#5f6779', 0.85, None, 0),
    's/pedraTopo': ('#9aa3b4', 0.85, None, 0),
    's/rosto': ('#9aa3b4', 0.8, None, 0),
    's/aro': ('#6b7385', 0.75, None, 0),
    's/gravado': ('#4a5266', 0.85, None, 0),
    # O aceso brilha um pouco por conta própria (sem depender do sol da cena).
    's/ouro': ('#f6b51e', 0.35, '#ffcf55', 0.55),
    's/rostoAceso': ('#fff4c2', 0.5, '#fff3a6', 0.35),
    's/halo': ('#fff3a6', 0.6, '#fff3a6', 0.6),
    's/madeira': ('#c9965f', 0.8, None, 0),
    's/madeiraClara': ('#d9ab74', 0.8, None, 0),
    's/madeiraEscura': ('#8a5a36', 0.85, None, 0),
    's/poste': ('#6a4a31', 0.85, None, 0),
    's/seta': ('#3d2a1c', 0.85, None, 0),
})

# O rosto da pedra: centro e raio, de frente para a câmera.
ROSTO_Z = 0.46
ROSTO_Y = -0.34
ROSTO_R = 0.22


def _frente(o, y, z, x=0.0):
    """Leva uma placa desenhada no chão (contorno em x, y; espessura em z) para a frente da pedra:
    o contorno fica de pé, virado para -Y (a câmera), com o centro em (x, y, z)."""
    o.data.transform(Matrix.Rotation(R(90), 4, 'X'))
    o.data.transform(Matrix.Translation(Vector((x, y, z))))
    return o


def _circulo(r, n=32):
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def _estrela(R_, r, pontas=5):
    return [((R_ if i % 2 == 0 else r) * math.cos(math.pi / 2 + i * math.pi / pontas),
             (R_ if i % 2 == 0 else r) * math.sin(math.pi / 2 + i * math.pi / pontas))
            for i in range(2 * pontas)]


def _sol(r):
    """O sol do desenho 2D: o disco e oito raios soltos em volta (a estrela tem cinco pontas
    grudadas; com o disco separado dos raios, os dois não se confundem de longe)."""
    pecas = [_circulo(0.55 * r)]
    for i in range(8):
        a = i * math.pi / 4
        pecas.append([(r * math.cos(a), r * math.sin(a)),
                      (0.68 * r * math.cos(a + 0.2), 0.68 * r * math.sin(a + 0.2)),
                      (0.68 * r * math.cos(a - 0.2), 0.68 * r * math.sin(a - 0.2))])
    return pecas


def _lua(r, n=28):
    """A meia-lua: o arco de fora e o de dentro (o círculo deslocado que a "come"), em pontos."""
    dx, dy, ri = 0.42 * r, 0.22 * r, 0.86 * r
    d = math.hypot(dx, dy)
    a = (r * r - ri * ri + d * d) / (2 * d)
    h = math.sqrt(r * r - a * a)
    ux, uy = dx / d, dy / d
    px, py = a * ux, a * uy
    p1, p2 = (px - h * uy, py + h * ux), (px + h * uy, py - h * ux)
    ang = lambda p, c: math.atan2(p[1] - c[1], p[0] - c[0])
    o1, o2 = ang(p1, (0, 0)), ang(p2, (0, 0))
    # De fora: o lado longe do círculo de dentro.
    if o2 < o1:
        o2 += 2 * math.pi
    mid = (o1 + o2) / 2
    if math.hypot(r * math.cos(mid) - dx, r * math.sin(mid) - dy) < ri:
        o2 -= 2 * math.pi
    fora = [(r * math.cos(o1 + (o2 - o1) * k / n), r * math.sin(o1 + (o2 - o1) * k / n)) for k in range(n + 1)]
    i1, i2 = ang(p2, (dx, dy)), ang(p1, (dx, dy))
    if i2 < i1:
        i2 += 2 * math.pi
    mid = (i1 + i2) / 2
    if math.hypot(dx + ri * math.cos(mid), dy + ri * math.sin(mid)) > r:
        i2 -= 2 * math.pi
    dentro = [(dx + ri * math.cos(i1 + (i2 - i1) * k / n), dy + ri * math.sin(i1 + (i2 - i1) * k / n))
              for k in range(1, n)]
    return fora + dentro


# Cada símbolo é uma lista de contornos (o sol tem o disco e os raios).
FORMAS = {'sol': lambda s: _sol(0.16 * s), 'lua': lambda s: [_lua(0.14 * s)],
          'estrela': lambda s: [_estrela(0.16 * s, 0.07 * s)]}


def _simbolo(simbolo, escala, espessura, m, y, z, x=0.0):
    pecas = [_frente(slab(c, 0, espessura, m, name=simbolo), y, z, x) for c in FORMAS[simbolo](escala)]
    return pecas[0] if len(pecas) == 1 else join(pecas, simbolo)


def pedra(simbolo, seed):
    reset()
    corpo = [rock((0, 0, 0), (0.95, 0.7, 0.8), 's/pedra', seed=seed, flat_top=0.35, top_m='s/pedraTopo')]
    # O rosto redondo, com o aro, de frente para a câmera.
    corpo.append(_frente(slab(_circulo(ROSTO_R + 0.03), 0, 0.07, 's/aro', bevel=0.015, name='aro'), ROSTO_Y + 0.01, ROSTO_Z))
    corpo.append(_frente(slab(_circulo(ROSTO_R), 0, 0.08, 's/rosto', bevel=0.012, name='rosto'), ROSTO_Y, ROSTO_Z))
    corpo.append(_simbolo(simbolo, 1.0, 0.025, 's/gravado', ROSTO_Y - 0.08, ROSTO_Z))
    base = join(corpo, 'pedra')

    # O aceso: o rosto claro, o símbolo dourado e o halo, numa peça só com a origem no centro do
    # rosto (o clipe a faz crescer do meio).
    ac = [_frente(slab(_circulo(ROSTO_R - 0.005), 0, 0.012, 's/rostoAceso', name='rosto-aceso'), 0.0, 0.0)]
    ac.append(_simbolo(simbolo, 1.08, 0.03, 's/ouro', -0.012, 0.0))
    # O halo é um anel fino em volta do rosto (um disco inteiro tampava a pedra).
    ac.append(_frente(torus(ROSTO_R + 0.035, 0.02, (0, 0, 0), 's/halo', seg=36, rseg=8), 0.0, 0.0))
    aceso = join(ac, 'aceso')
    centro = Vector((0, ROSTO_Y - 0.085, ROSTO_Z))
    aceso.location = centro
    chaves = {
        'acender': {aceso: {'scale': [(0, Vector((0, 0, 0))), (6, Vector((1.12, 1.12, 1.12))), (10, Vector((1, 1, 1)))]}},
        'apagar': {aceso: {'scale': [(0, Vector((1, 1, 1))), (6, Vector((0, 0, 0)))]}},
    }
    clipes(chaves, fps=24)
    aceso.scale = Vector((0, 0, 0))
    aceso.location = centro
    exportar_animado(f'pedra-{simbolo}', [base, aceso])


def pedra_sol():
    pedra('sol', 21)


def pedra_lua():
    pedra('lua', 22)


def pedra_estrela():
    pedra('estrela', 23)


def placa_da_ordem():
    reset()
    p = []
    for sx in (-1, 1):
        p.append(box((0.09, 0.09, 1.0), (sx * 0.5, 0.04, 0.5), 's/poste', bevel=0.015))
    p.append(box((1.5, 0.1, 0.62), (0, 0, 1.05), 's/madeiraEscura', bevel=0.04))
    p.append(box((1.38, 0.04, 0.5), (0, -0.05, 1.05), 's/madeira', bevel=0.02))
    p.append(box((1.38, 0.045, 0.1), (0, -0.055, 1.25), 's/madeiraClara', bevel=0.015))
    for x, s in ((-0.45, 'sol'), (0.0, 'lua'), (0.45, 'estrela')):
        p.append(_simbolo(s, 0.95, 0.03, 's/ouro', -0.075, 1.02, x))
    for x in (-0.225, 0.225):
        p.append(box((0.13, 0.03, 0.04), (x - 0.02, -0.08, 1.02), 's/seta', bevel=0.0))
        p.append(_frente(slab([(0.0, 0.065), (0.08, 0.0), (0.0, -0.065)], 0, 0.03, 's/seta', name='ponta'),
                         -0.075, 1.02, x + 0.045))
    exportar_estatico('placa-da-ordem', p)


TODOS = ['pedra-sol', 'pedra-lua', 'pedra-estrela', 'placa-da-ordem']

if __name__ == '__main__':
    pedidas = set(sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else set()
    for pid in TODOS:
        if not pedidas or pid in pedidas:
            globals()[pid.replace('-', '_')]()
