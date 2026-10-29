"""Emblema e cabana do Poder "O segredo da cabana" (Faísca), com o acabamento da Ilha do Farol.

- Emblema do farol (`emblema.svg` do 2D): escudo de borda dourada, fundo azul e um farolzinho
  listrado em relevo dos dois lados, de pé e de frente para a câmera.
- Cabana do faroleiro (`cabana-fechada.svg` e `cabana-aberta.svg`): paredes de tábuas, telhado
  vermelho de duas águas, chaminé, janelas e a porta com a fechadura e o encaixe do emblema.
  Repouso = fechada; o clipe `abrir` gira a porta para fora (dobradiça na borda esquerda) e acende
  as janelas e a claraboia.

Convenções da Ilha (`../ilha-do-farol-blender/lib_ilha.py`): z para cima, frente em -Y (vira +Z,
o lado da câmera, no three.js). Cores: as do desenho 2D.
"""
import os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ['ILHA_OUT'] = os.environ.get('CABANA_OUT', os.path.join(HERE, 'out'))
# No FIM da busca: a Ilha tem módulos com nomes comuns (cenario, objetos).
sys.path.append(os.path.join(HERE, '../ilha-do-farol-blender'))
from lib_ilha import *  # noqa: E402,F401,F403
import lib_q  # noqa: E402
from lib_q import _obj  # noqa: E402
from mathutils import Euler  # noqa: E402

lib_q.PALETTE.update({
    'c/ouro': ('#f3b123', 0.3, '#ffcf55', 0.18),
    'c/ouroEscuro': ('#d98c1a', 0.35, '#d98c1a', 0.08),
    'c/azul': ('#3b5dc9', 0.45, None, 0),
    'c/azulClaro': ('#4b6fe0', 0.45, None, 0),
    'c/branco': ('#f3f6fb', 0.6, None, 0),
    'c/vermelho': ('#cf3f36', 0.6, None, 0),
    'c/vermelhoEscuro': ('#a8322b', 0.65, None, 0),
    'c/lampada': ('#ffd774', 0.3, '#ffe39a', 0.6),
    'c/madeira': ('#9b7150', 0.8, None, 0),
    'c/madeiraMeio': ('#835d3f', 0.8, None, 0),
    'c/madeiraEscura': ('#6a4a31', 0.85, None, 0),
    'c/porta': ('#5a3e29', 0.85, None, 0),
    'c/ardosia': ('#46536e', 0.55, None, 0),
    'c/ardosiaEscura': ('#333c57', 0.6, None, 0),
    'c/marinho': ('#0f1a33', 0.5, None, 0),
    'c/luz': ('#ffe39a', 0.4, '#ffd774', 2.0),
    'c/luzForte': ('#fff4c4', 0.3, '#ffe9a0', 2.8),
})


def escudo_pts(w, h, n=14):
    """Contorno de escudo no plano XZ: topo reto com ombros e ponta embaixo (base em z = 0)."""
    topo, ombro = h, h * 0.86
    pts = [(-w / 2, ombro), (0, topo), (w / 2, ombro)]
    # Lado direito: desce reto até a metade e curva para a ponta.
    meio = h * 0.48
    pts.append((w / 2, meio))
    for i in range(1, n):
        t = i / n
        a = t * math.pi / 2
        pts.append((w / 2 * math.cos(a), meio - meio * math.sin(a)))
    pts.append((0, 0))
    for i in range(n - 1, 0, -1):
        t = i / n
        a = t * math.pi / 2
        pts.append((-w / 2 * math.cos(a), meio - meio * math.sin(a)))
    pts.append((-w / 2, meio))
    return pts


def _escala(pts, s, dz=0.0):
    return [(x * s, z * s + dz) for x, z in pts]


# ── Emblema ─────────────────────────────────────────────────────────────────
def emblema_do_farol():
    reset()
    z0 = 0.12            # flutua um pouco acima do chão, como a moeda
    w, h = 0.5, 0.6
    borda = escudo_pts(w, h)
    p = [
        prism(borda, 0.08, (0, 0, z0), 'c/ouroEscuro', bevel=0.012),
        prism(_escala(borda, 0.9, h * 0.05), 0.092, (0, 0, z0), 'c/ouro'),
        prism(_escala(borda, 0.76, h * 0.12), 0.104, (0, 0, z0), 'c/azul'),
    ]
    # O farolzinho: torre que afina, duas faixas vermelhas, lâmpada e chapéu.
    base = z0 + h * 0.2
    torre = [(-0.06, base), (0.06, base), (0.04, base + 0.27), (-0.04, base + 0.27)]
    p.append(prism(torre, 0.13, (0, 0, 0), 'c/branco'))
    for zf, alt in ((base + 0.04, 0.04), (base + 0.15, 0.04)):
        k0 = (zf - base) / 0.27
        k1 = (zf + alt - base) / 0.27
        x0, x1 = 0.062 - 0.022 * k0, 0.062 - 0.022 * k1
        p.append(prism([(-x0, zf), (x0, zf), (x1, zf + alt), (-x1, zf + alt)], 0.136, (0, 0, 0), 'c/vermelho'))
    p.append(prism([(-0.13, base - 0.03), (0.13, base - 0.03), (0.13, base), (-0.13, base)], 0.13, (0, 0, 0), 'c/branco', bevel=0.006))
    p.append(box((0.07, 0.13, 0.055), (0, 0, base + 0.3), 'c/lampada', bevel=0.012))
    p.append(prism([(-0.06, base + 0.327), (0.06, base + 0.327), (0, base + 0.39)], 0.13, (0, 0, 0), 'c/vermelho'))
    exportar_estatico('emblema-do-farol', p)


# ── Cabana ──────────────────────────────────────────────────────────────────
W, D, H = 2.0, 1.6, 1.3          # largura (x), fundo (y), altura das paredes (z)
TOPO = 2.25                      # cumeeira
FRENTE_Y = -D / 2
PORTA_W, PORTA_H = 0.52, 0.98
DOBRA = Vector((-PORTA_W / 2, FRENTE_Y - 0.035, 0.08))


def _triangulo(x0, x1, z0, zt):
    return [(x0, z0), (x1, z0), (0, zt)]


def cabana_do_faroleiro():
    reset()
    corpo = []
    # Piso e base de madeira escura, um pouco mais larga.
    corpo.append(box((W + 0.16, D + 0.16, 0.08), (0, 0, 0.04), 'c/madeiraEscura', bevel=0.02))
    # Paredes: um bloco de tábuas claras, com sulcos escuros na frente e nos lados.
    corpo.append(box((W, D, H), (0, 0, 0.08 + H / 2), 'c/madeira', bevel=0.0))
    for z in (0.42, 0.72, 1.02):
        corpo.append(box((W + 0.006, D + 0.006, 0.025), (0, 0, z), 'c/madeiraMeio', bevel=0.0))
    # Postes nos quatro cantos.
    for sx in (-1, 1):
        for sy in (-1, 1):
            corpo.append(box((0.12, 0.12, H + 0.04), (sx * (W / 2 + 0.01), sy * (D / 2 + 0.01), 0.08 + H / 2), 'c/madeiraEscura', bevel=0.02))
    # A empena (o triângulo de madeira sob o telhado), na frente e atrás.
    corpo.append(prism(_triangulo(-W / 2, W / 2, 0, TOPO - H - 0.08), D, (0, 0, 0.08 + H), 'c/madeira'))
    # O telhado: duas águas com beiral, como um "V" invertido grosso, e a cumeeira escura.
    ov, esp = 0.2, 0.12
    z0 = 0.08 + H - 0.08
    zt = TOPO
    corpo.append(prism([(-W / 2 - ov, z0), (0, zt + esp), (W / 2 + ov, z0), (W / 2 + ov - 0.07, z0 - esp + 0.02),
                        (0, zt - 0.02), (-W / 2 - ov + 0.07, z0 - esp + 0.02)], D + 2 * ov, (0, 0, 0), 'c/vermelho', bevel=0.02))
    # A água da esquerda, mais escura (sombra), por cima da outra metade.
    corpo.append(prism([(-W / 2 - ov - 0.002, z0 + 0.002), (0.002, zt + esp + 0.002), (0.002, zt + esp - 0.06), (-W / 2 - ov + 0.05, z0 - 0.04)],
                       D + 2 * ov + 0.006, (0, 0, 0), 'c/vermelhoEscuro'))
    corpo.append(box((0.1, D + 2 * ov + 0.02, 0.08), (0, 0, zt + esp - 0.01), 'c/vermelhoEscuro', bevel=0.02))
    # Chaminé de ardósia, atrás à direita.
    corpo.append(box((0.24, 0.24, 0.7), (0.55, 0.25, zt - 0.05), 'c/ardosia', bevel=0.02))
    corpo.append(box((0.32, 0.32, 0.08), (0.55, 0.25, zt + 0.32), 'c/ardosiaEscura', bevel=0.02))
    # Claraboia redonda na empena da frente (moldura branca, vidro apagado).
    zc = 0.08 + H + 0.42
    corpo.append(cyl(0.15, 0.04, (0, FRENTE_Y - 0.01, zc), 'c/branco', verts=24, rot=(R(90), 0, 0)))
    corpo.append(cyl(0.1, 0.05, (0, FRENTE_Y - 0.012, zc), 'c/ardosia', verts=24, rot=(R(90), 0, 0)))
    # Janelas na frente: moldura escura, vidro apagado, cruz.
    zj = 0.08 + 0.72
    for sx in (-1, 1):
        x = sx * 0.66
        corpo.append(box((0.36, 0.05, 0.36), (x, FRENTE_Y - 0.01, zj), 'c/madeiraEscura', bevel=0.015))
        corpo.append(box((0.26, 0.06, 0.26), (x, FRENTE_Y - 0.012, zj), 'c/ardosia', bevel=0.0))
        # A cruz fica à frente do vidro aceso (que entra por cima do apagado).
        corpo.append(box((0.03, 0.09, 0.26), (x, FRENTE_Y - 0.02, zj), 'c/madeiraEscura', bevel=0.0))
        corpo.append(box((0.26, 0.09, 0.03), (x, FRENTE_Y - 0.02, zj), 'c/madeiraEscura', bevel=0.0))
    # O vão da porta: luz quente de dentro, que a porta fechada esconde.
    corpo.append(box((PORTA_W + 0.04, 0.03, PORTA_H + 0.02), (0, FRENTE_Y - 0.012, 0.08 + PORTA_H / 2), 'c/luz', bevel=0.0))
    corpo.append(box((PORTA_W + 0.14, 0.05, 0.08), (0, FRENTE_Y - 0.02, 0.08 + PORTA_H + 0.04), 'c/madeiraEscura', bevel=0.015))
    # O encaixe do emblema, em cima da porta: um escudinho azul de borda dourada.
    esc = escudo_pts(0.2, 0.24)
    corpo.append(prism(esc, 0.04, (0, FRENTE_Y - 0.03, 0.08 + PORTA_H + 0.12), 'c/ouro'))
    corpo.append(prism(_escala(esc, 0.75, 0.03), 0.05, (0, FRENTE_Y - 0.032, 0.08 + PORTA_H + 0.12), 'c/azul'))
    # Degrau de pedra na frente da porta.
    corpo.append(box((PORTA_W + 0.3, 0.3, 0.08), (0, FRENTE_Y - 0.2, 0.04), 'c/ardosia', bevel=0.02))
    base = join(corpo, 'corpo')

    # A porta, com a origem na dobradiça (borda esquerda), dois painéis e a fechadura dourada.
    pt = [box((PORTA_W, 0.06, PORTA_H), (0, 0, PORTA_H / 2), 'c/madeiraEscura', bevel=0.02)]
    for zp in (0.27, 0.71):
        pt.append(box((PORTA_W - 0.12, 0.07, 0.34), (0, -0.002, zp), 'c/porta', bevel=0.012))
    pt.append(box((0.14, 0.08, 0.2), (0.12, -0.006, 0.5), 'c/ouro', bevel=0.02))
    pt.append(cyl(0.022, 0.03, (0.12, -0.05, 0.53), 'c/marinho', verts=12, rot=(R(90), 0, 0)))
    pt.append(box((0.022, 0.03, 0.05), (0.12, -0.05, 0.495), 'c/marinho', bevel=0.004))
    porta = join(pt, 'porta')
    # Põe a dobradiça na origem e leva a porta até o vão.
    porta.data.transform(Matrix.Translation(Vector((PORTA_W / 2, 0, 0))))
    porta.location = DOBRA

    # As luzes que acendem: o vidro das duas janelas, a claraboia e um brilho no encaixe do emblema.
    luzes = []
    for sx in (-1, 1):
        o = box((0.25, 0.02, 0.25), (sx * 0.66, FRENTE_Y - 0.044, zj), 'c/luz', bevel=0.0)
        o.name = f'janela-{"esq" if sx < 0 else "dir"}'
        luzes.append(o)
    o = cyl(0.098, 0.02, (0, FRENTE_Y - 0.04, zc), 'c/luzForte', verts=24, rot=(R(90), 0, 0))
    o.name = 'claraboia'
    luzes.append(o)
    farolzinho = prism([(-0.02, 0.0), (0.02, 0.0), (0.014, 0.12), (-0.014, 0.12)], 0.02,
                       (0, FRENTE_Y - 0.06, 0.08 + PORTA_H + 0.165), 'c/branco')
    farolzinho.name = 'emblema-encaixado'
    luzes.append(farolzinho)

    # O clipe `abrir` (24 quadros por segundo): a porta dá um tranco, abre além e assenta.
    chaves = {
        porta: {'rotation_euler': [(0, Euler((0, 0, 0))), (4, Euler((0, 0, R(-4)))), (7, Euler((0, 0, R(-1)))),
                                   (20, Euler((0, 0, R(-112)))), (26, Euler((0, 0, R(-98)))), (32, Euler((0, 0, R(-104))))]},
    }
    for k, o in enumerate(luzes):
        ini = 10 + k * 2
        chaves[o] = {'scale': [(0, Vector((0, 0, 0))), (ini, Vector((0, 0, 0))), (ini + 4, Vector((1.15, 1.15, 1.15))),
                               (ini + 8, Vector((1, 1, 1))), (40, Vector((1, 1, 1)))]}
    repouso = {porta: (porta.location.copy(), porta.scale.copy())}
    for o in luzes:
        repouso[o] = (o.location.copy(), Vector((0, 0, 0)))
    clipes({'abrir': chaves}, fps=24)
    # Só a porta gira: a claraboia guarda a rotação que a põe de pé na parede.
    for o, (l, s) in repouso.items():
        o.location, o.scale = l, s
    porta.rotation_euler = Euler((0, 0, 0))
    exportar_animado('cabana-do-faroleiro', [base, porta] + luzes)


TODOS = ['emblema-do-farol', 'cabana-do-faroleiro']

if __name__ == '__main__':
    pedidas = set(sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else set()
    for pid in TODOS:
        if not pedidas or pid in pedidas:
            globals()[pid.replace('-', '_')]()
