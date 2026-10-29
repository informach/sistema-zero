"""A lareira de tijolinho (footprint 2 × 1, frente para -Y): o pedido do Pico Gelado.

Nós:
- `lareira`: o corpo de tijolinhos com a boca em arco, a soleira de pedra, a prateleira de madeira
  em cima com velas, um vaso de planta e um porta-retrato, a lenha na grelha e a pilha de lenha
  do lado;
- `fogo`: as brasas debaixo da lenha (material `brasa`);
- `chama-1` a `chama-3`: as chamas (material `fogo` por fora e `brasa` no miolo), com o pivô na
  base de cada uma.

Clipe `crepitar` (2 s, em laço): as chamas esticam, encolhem e balançam, cada uma num ritmo, e as
brasas pulsam. Para apagar a lareira, o jogo esconde `fogo` e as três `chama-*`. Os materiais
`fogo`, `brasa` e `chama` (as velas) saem com emissão 1, como no fogão.
"""
import random

from lib_objetos import *

L, F = 1.5, 0.5
Y_FRENTE = -0.08
Y_FUNDO = Y_FRENTE + F
Z_BASE = 0.08            # o corpo começa em cima da soleira
Z_TOPO = 1.15            # embaixo da prateleira
BOCA_L = 0.76            # largura da boca
BOCA_RETO = 0.42         # altura das laterais retas da boca
BOCA_FUNDO = 0.34
QUADROS = 48             # 2 s


def contorno_boca(folga=0.0, n=14):
    r = BOCA_L / 2 + folga
    pts = [(-r, -0.2), (r, -0.2), (r, BOCA_RETO)]
    for k in range(1, n):
        a = math.pi * k / n
        pts.append((r * math.cos(a), BOCA_RETO + r * math.sin(a)))
    pts.append((-r, BOCA_RETO))
    return pts


def dentro_da_boca(x, z, folga):
    r = BOCA_L / 2 + folga
    zz = z - Z_BASE
    if abs(x) > r or zz < -folga:
        return False
    return zz <= BOCA_RETO or x * x + (zz - BOCA_RETO) ** 2 <= r * r


def tijolo(cx, cy, cz, w, h, normal, m, saliencia=0.014, chanfro=0.008):
    """Tijolo de frente chanfrada sobre uma face (normal -Y, -X ou +X), sem a face de trás."""
    bm = bmesh.new()
    d = 0.01
    tras = [(-w / 2, d, -h / 2), (w / 2, d, -h / 2), (w / 2, d, h / 2), (-w / 2, d, h / 2)]
    c = min(chanfro, w * 0.3, h * 0.3)
    frente = [(-w / 2 + c, -saliencia, -h / 2 + c), (w / 2 - c, -saliencia, -h / 2 + c),
              (w / 2 - c, -saliencia, h / 2 - c), (-w / 2 + c, -saliencia, h / 2 - c)]
    vt = [bm.verts.new(v) for v in tras]
    vf = [bm.verts.new(v) for v in frente]
    bm.faces.new(vf)
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vt[i], vt[j], vf[j], vf[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('tijolo', bm, m)
    for f in o.data.polygons:
        if f.normal.y > 0.1:
            f.flip()
    o.data.update()
    lib_q.flat(o)
    o.rotation_euler = (0, 0, {'-Y': 0, '-X': R(-90), '+X': R(90)}[normal])
    o.location = (cx, cy, cz)
    return o


def corpo():
    zc = (Z_BASE + Z_TOPO) / 2
    c = caixa_redonda((L, F, Z_TOPO - Z_BASE), (0, (Y_FRENTE + Y_FUNDO) / 2, zc), 'rejunte', raio=0.02, segs=2)
    corte = prism(contorno_boca(), 0.2 + BOCA_FUNDO * 2, (0, Y_FRENTE, Z_BASE), 'fuligem')
    booleana(c, corte)
    pintar_por(c, lambda ct, n: 'fuligem' if ct.y > Y_FRENTE + 0.002 and dentro_da_boca(ct.x, ct.z, 0.002) else None)
    p = [c]
    rnd = random.Random(11)
    cores = ['tijolo', 'tijolo', 'tijoloClaro', 'tijoloEscuro']
    hb, wb, junta = 0.085, 0.2, 0.016
    passo_z = hb + junta
    linhas = int((Z_TOPO - Z_BASE - 0.02) / passo_z)
    # Frente: fiadas desencontradas, sem cobrir a boca nem o arco de tijolos em pé.
    for j in range(linhas):
        z = Z_BASE + 0.012 + passo_z * j + hb / 2
        x = -L / 2 + 0.008 + (0 if j % 2 == 0 else -(wb + junta) / 2)
        while x < L / 2 - 0.008:
            x0, x1 = max(x, -L / 2 + 0.008), min(x + wb, L / 2 - 0.008)
            x += wb + junta
            if x1 - x0 < 0.05:
                continue
            cx = (x0 + x1) / 2
            if any(dentro_da_boca(xx, zz, 0.11) for xx in (x0, cx, x1) for zz in (z - hb / 2, z + hb / 2)):
                continue
            p.append(tijolo(cx, Y_FRENTE, z, x1 - x0, hb, '-Y', rnd.choice(cores)))
        # Laterais.
        for s, nome in ((-1, '-X'), (1, '+X')):
            y = Y_FRENTE + 0.008 + (0 if j % 2 else -(wb + junta) / 2)
            while y < Y_FUNDO - 0.008:
                y0, y1 = max(y, Y_FRENTE + 0.008), min(y + wb, Y_FUNDO - 0.008)
                y += wb + junta
                if y1 - y0 < 0.05:
                    continue
                p.append(tijolo(s * L / 2, (y0 + y1) / 2, z, y1 - y0, hb, nome, rnd.choice(cores)))
    # Arco de tijolos em pé em volta da boca, um pouco mais escuro.
    r0, r1 = BOCA_L / 2 + 0.012, BOCA_L / 2 + 0.1
    n = 11
    for k in range(n):
        a = math.pi * (k + 0.5) / n
        rm = (r0 + r1) / 2
        t = tijolo(0, 0, 0, (r1 - r0), math.pi * rm / n - junta, '-Y', 'tijoloEscuro' if k % 2 else 'tijolo')
        t.rotation_euler = (0, -a, 0)
        t.location = (rm * math.cos(a), Y_FRENTE, Z_BASE + BOCA_RETO + rm * math.sin(a))
        p.append(t)
    for s in (-1, 1):
        for j in range(4):
            z = Z_BASE + 0.012 + j * (BOCA_RETO - 0.012) / 4
            hh = (BOCA_RETO - 0.012) / 4 - junta
            p.append(tijolo(s * (r0 + r1) / 2, Y_FRENTE, z + hh / 2, r1 - r0, hh, '-Y',
                            'tijoloEscuro' if j % 2 else 'tijolo'))
    return p


def soleira_e_prateleira():
    p = []
    # Soleira de pedra: uma laje embaixo de tudo, saindo na frente.
    p.append(caixa_redonda((L + 0.1, F + 0.38, Z_BASE), (0, Y_FUNDO - (F + 0.38) / 2, Z_BASE / 2), 'pedraLareira',
                           raio=0.025, segs=2))
    # Prateleira de madeira com mãos-francesas.
    zp = Z_TOPO
    p.append(caixa_redonda((L + 0.2, F + 0.1, 0.07), (0, Y_FUNDO - (F + 0.1) / 2, zp + 0.035), 'madeira', raio=0.02,
                           segs=2))
    for s in (-1, 1):
        mao = prism([(0, 0), (0.0, -0.16), (0.03, -0.16), (0.09, -0.03), (0.09, 0)], 0.08,
                    (0, 0, 0), 'madeiraEscura', bevel=0.008)
        mao.rotation_euler = (0, 0, R(-90))
        mao.location = (s * (L / 2 - 0.12), Y_FRENTE + 0.0, zp)
        p.append(mao)
    return p


def enfeites():
    p = []
    z = Z_TOPO + 0.07
    yc = Y_FRENTE + 0.12
    # Duas velas de alturas diferentes num pratinho.
    p.append(cyl(0.09, 0.014, (-0.52, yc, z + 0.007), 'loucaBranca', verts=18))
    for dx, h in ((-0.035, 0.16), (0.04, 0.11)):
        x = -0.52 + dx
        p.append(cyl(0.028, h, (x, yc, z + 0.014 + h / 2), 'vela', verts=12))
        p.append(cyl(0.003, 0.02, (x, yc, z + 0.014 + h + 0.01), 'tinta', verts=4))
        ch = torneado([(0, 0), (0.012, 0.01), (0.014, 0.025), (0.007, 0.045), (0, 0.06)], 'chama', seg=8)
        ch.location = (x, yc, z + 0.014 + h + 0.012)
        p.append(ch)
    # Vaso com planta no meio-direito.
    vaso = torneado([(0, 0), (0.06, 0), (0.075, 0.05), (0.08, 0.12), (0.088, 0.13), (0.082, 0.14), (0.07, 0.13),
                     (0, 0.12)], 'vaso', seg=16)
    vaso.location = (0.5, yc + 0.04, z)
    p.append(vaso)
    for k in range(7):
        a = 2 * math.pi * k / 7
        p.append(lib_ilha.leaf((0.5, yc + 0.04, z + 0.12), a, 0.17, 0.045, 'folha' if k % 2 else 'folhaEscura',
                               lift=0.1, droop=0.16, fold=0.3, pitch=0.6, n=7))
    # Porta-retrato com uma foto de montanha nevada.
    fx, fy = 0.05, Y_FUNDO - 0.12
    quadro = box((0.3, 0.03, 0.24), (0, 0, 0), 'moldura', bevel=0.01, segs=2)
    foto = box((0.24, 0.01, 0.18), (0, -0.014, 0), 'foto', bevel=0.0)
    monte = prism([(-0.1, -0.08), (-0.02, 0.05), (0.03, -0.01), (0.07, 0.04), (0.11, -0.08)], 0.01, (0, -0.022, -0.005),
                  'branco')
    pe = box((0.04, 0.12, 0.012), (0, 0.06, -0.11), 'moldura', bevel=0.004, segs=1)
    grupo = [quadro, foto, monte, pe]
    for (a, b) in (((-0.135, -0.105), (0.135, -0.105)), ((-0.135, 0.105), (0.135, 0.105)),
                   ((-0.135, -0.105), (-0.135, 0.105)), ((0.135, -0.105), (0.135, 0.105))):
        grupo.append(barra((a[0], -0.026, a[1]), (b[0], -0.026, b[1]), 'moldura', r=0.016, verts=4))
    for o in grupo:
        bpy.context.view_layer.update()
    lib_ilha.place(grupo, loc=(0, 0, 0))
    for o in grupo:
        o.matrix_world = (Matrix.Translation((fx, fy, z + 0.13)) @ Matrix.Rotation(R(-12), 4, 'X')) @ o.matrix_world
    p += grupo
    return p


def lenha_e_grelha():
    p = []
    zb = Z_BASE
    yc = Y_FRENTE + 0.17
    # Grelha (dois cavaletes e duas barras).
    for s in (-1, 1):
        x = s * 0.22
        p.append(barra((x, yc - 0.12, zb + 0.06), (x, yc + 0.12, zb + 0.06), 'ferro', r=0.012, verts=6))
        for dy in (-0.11, 0.11):
            p.append(barra((x, yc + dy, zb), (x, yc + dy, zb + 0.065), 'ferro', r=0.01, verts=6))
        p.append(lib_q.sphere(0.022, (x, yc - 0.13, zb + 0.08), 'ferro', subdiv=1))
    # Lenha cruzada.
    for (a, b, r) in (((-0.3, yc - 0.04, zb + 0.09), (0.28, yc + 0.03, zb + 0.09), 0.048),
                      ((-0.26, yc + 0.09, zb + 0.1), (0.3, yc + 0.06, zb + 0.095), 0.045),
                      ((-0.1, yc - 0.12, zb + 0.13), (0.14, yc + 0.12, zb + 0.18), 0.04)):
        t = barra(a, b, 'lenha', r=r, verts=8)
        p.append(t)
        for pt in (a, b):
            d = (Vector(b) - Vector(a)).normalized()
            q = Vector(pt) + d * (0.002 if pt is b else -0.002)
            anel = cyl(r * 0.85, 0.004, tuple(q), 'madeiraClara', verts=8)
            anel.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
            p.append(anel)
    return p


def pilha_de_lenha():
    """Três toras empilhadas no chão, do lado esquerdo da soleira."""
    p = []
    x0, y0, r = -0.905, 0.04, 0.045
    for (dx, z) in ((-0.046, r), (0.046, r), (0.0, r + 2 * r * 0.87)):
        x = x0 + dx
        p.append(cyl(r, 0.36, (x, y0, z), 'lenha', verts=8, rot=(R(90), 0, 0)))
        for s in (-1, 1):
            p.append(cyl(r * 0.85, 0.004, (x, y0 + s * 0.1825, z), 'madeiraClara', verts=8, rot=(R(90), 0, 0)))
    return p


def chama(h, r):
    o = torneado([(0, 0), (r * 0.75, h * 0.06), (r, h * 0.22), (r * 0.9, h * 0.45), (r * 0.55, h * 0.7),
                  (r * 0.2, h * 0.9), (0, h)], 'fogo', seg=10)
    deformar(o, lambda v: Vector((v.x + 0.18 * r * math.sin(v.z / h * 4.0) * (v.z / h), v.y, v.z)))
    miolo = torneado([(0, 0), (r * 0.5, h * 0.05), (r * 0.6, h * 0.2), (r * 0.4, h * 0.42), (0, h * 0.6)], 'brasa',
                     seg=8)
    miolo.location = (0, -r * 0.5, 0)
    return [o, miolo]


def brasas():
    p = []
    yc = Y_FRENTE + 0.17
    rnd = random.Random(3)
    for k in range(9):
        x = rnd.uniform(-0.26, 0.26)
        y = yc + rnd.uniform(-0.09, 0.09)
        p.append(lib_ilha.rock((x, y, Z_BASE + 0.002), (0.07, 0.06, 0.035), 'brasa', seed=k, subdiv=1, rough=0.15))
    return p


def onda(t, ciclos, fase):
    return math.sin(2 * math.pi * (ciclos * t) + fase)


def lareira():
    yc = Y_FRENTE + 0.17
    nos = {'lareira': corpo() + soleira_e_prateleira() + enfeites() + lenha_e_grelha() + pilha_de_lenha()}
    fogo = brasas()
    pivo_fogo = (0, yc, Z_BASE)
    nos['fogo'] = (fogo, pivo_fogo)
    clipe = {'fogo': {'scale': [], '_linear': True}}
    chamas = [((-0.12, yc + 0.02, Z_BASE + 0.06), 0.34, 0.075), ((0.06, yc - 0.01, Z_BASE + 0.06), 0.44, 0.09),
              ((0.2, yc + 0.03, Z_BASE + 0.06), 0.28, 0.065)]
    for i, (pos, h, r) in enumerate(chamas):
        objs = chama(h, r)
        mover(objs, pos)
        nome = f'chama-{i + 1}'
        nos[nome] = (objs, pos)
        esc, rot = [], []
        for q in range(0, QUADROS + 1, 2):
            t = q / QUADROS
            sz = 1 + 0.16 * onda(t, 3 + i, i) + 0.07 * onda(t, 7, 2 * i + 1)
            sx = 1 - 0.07 * onda(t, 3 + i, i) + 0.04 * onda(t, 5, i)
            esc.append((q, (sx, sx, sz)))
            rot.append((q, (0.06 * onda(t, 2, i + 0.5), 0.1 * onda(t, 3, i * 2.0), 0.3 * onda(t, 1, i))))
        clipe[nome] = {'scale': esc, 'rotation_euler': rot, '_linear': True}
    for q in range(0, QUADROS + 1, 4):
        s = 1 + 0.05 * onda(q / QUADROS, 4, 0.3)
        clipe['fogo']['scale'].append((q, (1, 1, s)))
    return {'nos': nos, 'clipes': {'crepitar': clipe}, 'grupo': 'lareira'}


ITENS = [('lareira', lareira)]

if __name__ == '__main__':
    rodar(ITENS)
