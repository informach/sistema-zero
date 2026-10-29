"""Moeda e baú do Poder "Moedas no caminho" (Faísca), com o acabamento da Ilha do Farol.

- Moeda de ouro (`moeda.svg` do 2D): disco de borda escura, face dourada e estrela clara em
  relevo dos dois lados, de pé e de frente para a câmera. O jogo a faz girar (bloco "Girar").
- Baú do tesouro (`bau-fechado.svg` e `bau-aberto.svg`): caixa de madeira com faixas e fechadura
  de ouro e tampa arredondada. Repouso = fechado; o clipe `abrir` levanta a tampa (dobradiça na
  borda de trás), o tesouro dá um pulinho e quatro brilhos sobem.

Convenções da Ilha (`../ilha-do-farol-blender/lib_ilha.py`): z para cima, frente em -Y (vira +Z,
o lado da câmera, no three.js). Cores: as do desenho 2D.
"""
import os, sys, math, random

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ['ILHA_OUT'] = os.environ.get('MOEDAS_OUT', os.path.join(HERE, 'out'))
# No FIM da busca: a Ilha tem módulos com nomes comuns (cenario, objetos).
sys.path.append(os.path.join(HERE, '../ilha-do-farol-blender'))
from lib_ilha import *  # noqa: E402,F401,F403
import lib_q  # noqa: E402
from lib_q import _obj  # noqa: E402
from mathutils import Euler  # noqa: E402

lib_q.PALETTE.update({
    'm/ouro': ('#f3b123', 0.3, '#ffcf55', 0.2),
    'm/ouroEscuro': ('#d98c1a', 0.35, '#d98c1a', 0.08),
    'm/ouroClaro': ('#ffd774', 0.3, '#ffe39a', 0.25),
    'm/madeira': ('#835d3f', 0.8, None, 0),
    'm/madeiraClara': ('#9b7150', 0.8, None, 0),
    'm/madeiraEscura': ('#6a4a31', 0.85, None, 0),
    'm/madeiraFundo': ('#4f3624', 0.9, None, 0),
    'm/marinho': ('#0f1a33', 0.5, None, 0),
    'm/rubi': ('#cf3f36', 0.25, '#cf3f36', 0.15),
    'm/safira': ('#3b8fd9', 0.25, '#3b8fd9', 0.15),
    'm/brilho': ('#ffffff', 0.4, '#fff4c4', 2.2),
})

FRENTE = (R(90), 0, 0)  # gira o eixo do cilindro (z) para olhar a câmera (-Y)


# ── Moeda ────────────────────────────────────────────────────────────────────
def moeda_de_ouro():
    reset()
    cz = 0.42
    p = [
        cyl(0.34, 0.1, (0, 0, cz), 'm/ouroEscuro', verts=48, bevel=0.028, rot=FRENTE),
        cyl(0.265, 0.104, (0, 0, cz), 'm/ouro', verts=48, rot=FRENTE),
        prism(star_pts(0.175, 0.078), 0.124, (0, 0, cz + 0.008), 'm/ouroClaro', bevel=0.012),
    ]
    exportar_estatico('moeda-de-ouro', p)


# ── Baú ──────────────────────────────────────────────────────────────────────
W, D, H = 1.1, 0.72, 0.56      # largura (x), fundo (y), altura do corpo (z)
RT = D / 2                     # raio da tampa arredondada
DOBRA = Vector((0, RT, H))     # dobradiça: borda de trás, em cima do corpo


def _meio_anel(r_in, r_out, x0, x1, m, seg=24, cy=0.0, cz=H):
    """Faixa em meia-lua (tampa) entre os raios, de x0 a x1, no plano YZ."""
    bm = bmesh.new()
    an = []
    for i in range(seg + 1):
        a = math.pi * i / seg
        y, z = -math.cos(a), math.sin(a)
        an.append([bm.verts.new((x, cy + r * y, cz + r * z)) for x in (x0, x1) for r in (r_in, r_out)])
    for i in range(seg):
        a, b = an[i], an[i + 1]
        for (p, q) in ((0, 1), (1, 3), (3, 2), (2, 0)):
            bm.faces.new((a[p], a[q], b[q], b[p]))
    for v in (an[0], an[-1]):
        bm.faces.new((v[0], v[1], v[3], v[2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(_obj('faixa', bm, m))


def _tampa_cheia(r, x0, x1, m, seg=28):
    """Meio cilindro maciço (a tampa), base em z = H."""
    bm = bmesh.new()
    ext = []
    for x in (x0, x1):
        ext.append([bm.verts.new((x, -r * math.cos(math.pi * i / seg), H + r * math.sin(math.pi * i / seg))) for i in range(seg + 1)])
    a, b = ext
    for i in range(seg):
        bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    bm.faces.new(list(reversed(a)))
    bm.faces.new(b)
    bm.faces.new((a[0], b[0], b[-1], a[-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('tampa', bm, m)
    for f in o.data.polygons:
        f.use_smooth = abs(f.normal.x) < 0.7 and f.normal.z > -0.7
    return o


def _brilho(nome, loc, r):
    pts = star_pts(r, r * 0.3, n=4)
    o = prism(pts, 0.01, loc, 'm/brilho')
    o.name = nome
    o['szSemCaixa'] = True
    return o


def bau_do_tesouro():
    reset()
    rnd = random.Random(7)
    corpo = []
    # Caixa oca: fundo, quatro paredes, e um rodapé um pouco mais largo.
    e = 0.07
    corpo.append(box((W, D, 0.1), (0, 0, 0.05), 'm/madeiraEscura', bevel=0.02))
    # Maciço até o fundo de dentro; dali para cima, quatro paredes (o tesouro fica no vão).
    FUNDO = H - 0.15
    corpo.append(box((W - 0.02, D - 0.02, FUNDO - 0.08), (0, 0, 0.08 + (FUNDO - 0.08) / 2), 'm/madeira', bevel=0.0))
    hp = H - FUNDO
    for sy in (-1, 1):
        corpo.append(box((W - 0.02, e, hp), (0, sy * (D / 2 - 0.01 - e / 2), FUNDO + hp / 2), 'm/madeira', bevel=0.0))
    for sx in (-1, 1):
        corpo.append(box((e, D - 0.02, hp), (sx * (W / 2 - 0.01 - e / 2), 0, FUNDO + hp / 2), 'm/madeira', bevel=0.0))
    # A frente e os lados em tábuas: dois sulcos escuros.
    for z in (0.26, 0.42):
        corpo.append(box((W + 0.004, D + 0.004, 0.022), (0, 0, z), 'm/madeiraEscura', bevel=0.0))
    # Borda de cima (onde a tampa assenta), mais clara: um aro, para não tampar o vão.
    for sy in (-1, 1):
        corpo.append(box((W + 0.02, e + 0.02, 0.06), (0, sy * (D / 2 - e / 2), H - 0.03), 'm/madeiraClara', bevel=0.015))
    for sx in (-1, 1):
        corpo.append(box((e + 0.02, D + 0.02, 0.06), (sx * (W / 2 - e / 2), 0, H - 0.03), 'm/madeiraClara', bevel=0.015))
    # O fundo de dentro, escuro.
    corpo.append(box((W - 2 * e, D - 2 * e, 0.02), (0, 0, FUNDO), 'm/madeiraFundo', bevel=0.0))
    # Faixas de ouro: em volta do corpo, nas duas laterais e embaixo.
    # Só por fora (na frente e atrás), para não cruzar o vão do tesouro.
    for x in (-0.36, 0.36):
        for sy in (-1, 1):
            corpo.append(box((0.11, 0.03, H + 0.005), (x, sy * (D / 2 + 0.003), H / 2), 'm/ouroEscuro', bevel=0.01))
            corpo.append(box((0.11, e + 0.045, 0.065), (x, sy * (D / 2 - e / 2 + 0.005), H - 0.03), 'm/ouro', bevel=0.012))
    # Cantoneiras.
    for sx in (-1, 1):
        for sy in (-1, 1):
            corpo.append(box((0.09, 0.09, 0.12), (sx * (W / 2 - 0.035), sy * (D / 2 - 0.035), 0.07), 'm/ouro', bevel=0.02))
    # Fechadura na frente, com o buraco da chave.
    corpo.append(box((0.22, 0.05, 0.24), (0, -D / 2 - 0.01, H - 0.13), 'm/ouro', bevel=0.03))
    corpo.append(box((0.22, 0.052, 0.07), (0, -D / 2 - 0.012, H - 0.22), 'm/ouroEscuro', bevel=0.02))
    corpo.append(cyl(0.032, 0.02, (0, -D / 2 - 0.04, H - 0.1), 'm/marinho', verts=16, rot=FRENTE))
    corpo.append(box((0.03, 0.02, 0.06), (0, -D / 2 - 0.04, H - 0.14), 'm/marinho', bevel=0.004))
    base = join(corpo, 'corpo')

    # Tesouro: um monte de moedinhas e duas pedras preciosas, que aparece com a tampa aberta.
    tes = []
    for i in range(64):
        a = rnd.uniform(0, 2 * math.pi)
        rr = math.sqrt(rnd.random())
        x = math.cos(a) * rr * (W / 2 - 0.14)
        y = math.sin(a) * rr * (D / 2 - 0.14)
        z = H - 0.13 + 0.19 * (1 - rr * rr) + rnd.uniform(0, 0.03)
        c = cyl(0.062, 0.02, (x, y, z), ('m/ouro', 'm/ouroClaro')[i % 2], verts=10,
                rot=(rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), 0))
        tes.append(c)
    tes.append(ellipsoid((-0.18, -0.06, H + 0.07), (0.07, 0.07, 0.06), 'm/rubi', seg=8, ring=5))
    tes.append(ellipsoid((0.2, 0.02, H + 0.06), (0.06, 0.06, 0.06), 'm/safira', seg=8, ring=5))
    for o in tes[-2:]:
        flat(o)
    tesouro = join(tes, 'tesouro')
    # Origem do tesouro no centro do monte, para o pulinho crescer no lugar.
    centro = Vector((0, 0, H - 0.05))
    tesouro.data.transform(Matrix.Translation(-centro))
    tesouro.location = centro

    # Tampa: meio cilindro de madeira, faixas e trinco, com a origem na dobradiça.
    tp = [_tampa_cheia(RT, -W / 2, W / 2, 'm/madeiraClara')]
    tp.append(box((W - 0.06, D - 0.06, 0.012), (0, 0, H + 0.004), 'm/madeiraFundo', bevel=0.0))
    for x in (-0.36, 0.36):
        tp.append(_meio_anel(RT - 0.005, RT + 0.022, x - 0.055, x + 0.055, 'm/ouro'))
    tp.append(_meio_anel(RT - 0.01, RT + 0.008, -W / 2 - 0.006, -W / 2 + 0.05, 'm/madeiraEscura'))
    tp.append(_meio_anel(RT - 0.01, RT + 0.008, W / 2 - 0.05, W / 2 + 0.006, 'm/madeiraEscura'))
    tp.append(box((0.13, 0.05, 0.12), (0, -D / 2 - 0.01, H + 0.06), 'm/ouro', bevel=0.025))
    tampa = join(tp, 'tampa')
    tampa.data.transform(Matrix.Translation(-DOBRA))
    tampa.location = DOBRA

    brilhos = [
        _brilho('brilho-0', (-0.3, -0.25, H + 0.25), 0.08),
        _brilho('brilho-1', (0.05, -0.3, H + 0.38), 0.11),
        _brilho('brilho-2', (0.33, -0.22, H + 0.27), 0.07),
        _brilho('brilho-3', (-0.05, -0.2, H + 0.18), 0.06),
    ]

    # O clipe `abrir` (24 quadros por segundo): a tampa dá um tranco, abre além e assenta.
    chaves = {
        tampa: {'rotation_euler': [(0, Euler((0, 0, 0))), (4, Euler((R(-6), 0, 0))), (7, Euler((R(-2), 0, 0))),
                                   (18, Euler((R(-116), 0, 0))), (24, Euler((R(-100), 0, 0))), (30, Euler((R(-106), 0, 0)))]},
        tesouro: {'scale': [(0, Vector((1, 1, 1))), (14, Vector((1, 1, 1))), (20, Vector((1.1, 1.1, 1.12))), (26, Vector((0.98, 0.98, 0.98))), (30, Vector((1, 1, 1)))]},
    }
    for k, o in enumerate(brilhos):
        ini = 14 + k * 2
        l0 = o.location.copy()
        chaves[o] = {
            'scale': [(0, Vector((0, 0, 0))), (ini, Vector((0, 0, 0))), (ini + 4, Vector((1.2, 1.2, 1.2))), (ini + 12, Vector((0, 0, 0))), (40, Vector((0, 0, 0)))],
            'location': [(0, l0), (ini, l0), (ini + 12, l0 + Vector((0, 0, 0.3))), (40, l0 + Vector((0, 0, 0.3)))],
        }
    repouso = {o: (o.location.copy(), o.scale.copy()) for o in chaves}
    for o in brilhos:
        repouso[o] = (o.location.copy(), Vector((0, 0, 0)))
    clipes({'abrir': chaves}, fps=24)
    for o, (l, s) in repouso.items():
        o.location, o.scale = l, s
        o.rotation_euler = Euler((0, 0, 0))
    exportar_animado('bau-do-tesouro', [base, tesouro, tampa] + brilhos)


TODOS = ['moeda-de-ouro', 'bau-do-tesouro']

if __name__ == '__main__':
    pedidas = set(sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else set()
    for pid in TODOS:
        if not pedidas or pid in pedidas:
            globals()[pid.replace('-', '_')]()
