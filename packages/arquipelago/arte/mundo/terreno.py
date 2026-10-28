"""O chão da ilha central: gramado, praia, areia molhada, espuma e os enfeites do chão.

Referencial: o do mundo (a ilha central fica na origem do jogo). A altura de cada vértice sai de
`altura()`, cópia exata de `alturaDaIlha` em `src/mundo/medidas.ts`, então o desenho cai em cima da
colisão (que continua sendo calculada no código).

A malha é polar no "raio efetivo" (a borda irregular da ilha), com um anel exatamente na borda do
gramado (23,5) e outro na linha da areia molhada: as divisas ficam limpas, sem degraus de grade.
As cores variam de leve por vértice (manchas de grama, areia secando).

Nós: `chao` (o terreno), `enfeites` (capim, flores, moitas, pedras, pedras do caminho, estrelas
do mar) e `espuma` (o anel branco na linha d'água; o jogo pode balançar).

Colisão: cada moita e cada pedra ganha um nó `col-cil-moita-*` ou `col-cil-pedra-*` (cilindro em
pé, sem material) do lado do desenho; o jogo lê com `lerColisores`. Capim, flores, pedras do
caminho e estrelas do mar não colidem: o personagem passa por cima.
"""
from lib_mundo import *

TOM = {
    'grama': '#7dbb5a', 'gramaEscura': '#6aa84a', 'gramaClara': '#8fc764',
    'gramaBorda': '#9cc36a',
    'areia': '#e8d6a3', 'areiaClara': '#f0e2b6', 'areiaMolhada': '#c9b37c', 'areiaFunda': '#a8915e',
}
BORDA_DO_GRAMADO = 23.5
# Onde a altura cruza 0,05 (o jogo chama de areia molhada daí para fora) e onde cruza o mar.
LINHA_MOLHADA = 29.96
LINHA_DAGUA = 30.08
ANGULOS_DAS_PONTES = [20, -40, -100, -160, 140, 80]


def mistura(a, b, t):
    ca, cb = srgb(TOM[a]), srgb(TOM[b])
    t = max(0.0, min(1.0, t))
    return tuple(ca[i] + (cb[i] - ca[i]) * t for i in range(3))


def mancha(x, z):
    """Ruído suave e determinístico (0..1) para as manchas de grama."""
    v = (math.sin(x * 0.31 + 1.3) * math.cos(z * 0.27 - 0.4) * 0.55
         + math.sin((x + z) * 0.13 + 0.7) * 0.3 + math.sin(x * 0.71 - z * 0.53) * 0.15)
    return 0.5 + 0.5 * v


def cor_do_chao(x, z, zona):
    r = raio_efetivo(x, z)
    if zona == 'grama':
        m = mancha(x, z)
        c = mistura('gramaEscura', 'gramaClara', m)
        # Perto da praia o gramado clareia (sol e areia).
        k = suave(BORDA_DO_GRAMADO - 2.5, BORDA_DO_GRAMADO, r) * 0.45
        borda = srgb(TOM['gramaBorda'])
        return tuple(c[i] + (borda[i] - c[i]) * k for i in range(3))
    if zona == 'areia':
        return mistura('areiaClara', 'areia', 0.35 + 0.65 * suave(BORDA_DO_GRAMADO, LINHA_MOLHADA, r))
    return mistura('areiaMolhada', 'areiaFunda', suave(LINHA_MOLHADA, 35, r))


def ponto(r_ef, a):
    """Vértice no raio efetivo `r_ef` e ângulo `a` (jogo), já na altura do chão (Blender)."""
    rr = r_ef * irregularidade(a)
    x, z = rr * math.cos(a), rr * math.sin(a)
    return (x, -z, altura(x, z)), (x, z)


def anel_de_faixas(raios, seg, zona, nome):
    """Faixa polar entre os raios dados (todos com `seg` divisões)."""
    verts, cores, faces = [], [], []
    for r in raios:
        for i in range(seg):
            a = 2 * math.pi * i / seg
            v, (x, z) = ponto(r, a)
            verts.append(v)
            cores.append(cor_do_chao(x, z, zona))
    for j in range(len(raios) - 1):
        for i in range(seg):
            a0, a1 = j * seg + i, j * seg + (i + 1) % seg
            b0, b1 = (j + 1) * seg + i, (j + 1) * seg + (i + 1) % seg
            faces.append((a0, b0, b1, a1))
    return verts, cores, faces


def miolo(raios_dentro, seg_dentro, raio_emenda, seg_fora):
    """O meio do gramado: leque no centro, anéis com `seg_dentro` e uma emenda até `seg_fora`."""
    verts, cores, faces = [], [], []

    def add(r, a):
        v, (x, z) = ponto(r, a)
        verts.append(v)
        cores.append(cor_do_chao(x, z, 'grama'))
        return len(verts) - 1

    centro = add(0, 0)
    aneis = [[add(r, 2 * math.pi * i / seg_dentro) for i in range(seg_dentro)] for r in raios_dentro]
    for i in range(seg_dentro):
        faces.append((centro, aneis[0][i], aneis[0][(i + 1) % seg_dentro]))
    for j in range(len(aneis) - 1):
        a, b = aneis[j], aneis[j + 1]
        for i in range(seg_dentro):
            faces.append((a[i], b[i], b[(i + 1) % seg_dentro], a[(i + 1) % seg_dentro]))
    fora = [add(raio_emenda, 2 * math.pi * i / seg_fora) for i in range(seg_fora)]
    k = seg_fora // seg_dentro
    ult = aneis[-1]
    for i in range(seg_dentro):
        for s in range(k):
            o0, o1 = fora[i * k + s], fora[(i * k + s + 1) % seg_fora]
            faces.append((ult[i], o0, o1) if s < k - 1 else (ult[i], o0, o1, ult[(i + 1) % seg_dentro]))
    return verts, cores, faces, fora


def objeto_colorido(nome, verts, cores, faces):
    o = malha(nome, verts, faces, 'chao', liso=True)
    attr = o.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for p in o.data.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            c = cores[vi]
            attr.data[li].color = (c[0], c[1], c[2], 1)
    return o


def material_do_chao():
    """'chao': branco que multiplica a cor de cada vértice (o glTF leva como COLOR_0)."""
    m = bpy.data.materials.new('chao')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.95
    at = nt.nodes.new('ShaderNodeVertexColor')
    at.layer_name = 'Col'
    nt.links.new(at.outputs['Color'], b.inputs['Base Color'])
    lib_q._MATS['chao'] = m


def chao():
    material_do_chao()
    SEG = 120
    # Gramado: miolo de 60 divisões até r 11, depois anéis de 120 até a borda.
    v, c, f, _ = miolo([1.4 * k for k in range(1, 8)], 60, 11.0, SEG)
    raios = [11.0 + (BORDA_DO_GRAMADO - 11.0) * k / 11 for k in range(12)]
    v2, c2, f2 = anel_de_faixas(raios, SEG, 'grama', 'g')
    base = len(v)
    # O primeiro anel de v2 repete o anel de emenda do miolo: liga direto.
    emenda = list(range(base - SEG, base))
    remap = {i: emenda[i] for i in range(SEG)}
    for i in range(SEG, len(v2)):
        remap[i] = base + i - SEG
    v += v2[SEG:]
    c += c2[SEG:]
    f += [tuple(remap[i] for i in face) for face in f2]
    grama = objeto_colorido('grama', v, c, f)
    # Praia: da borda do gramado até a linha molhada.
    rp = [BORDA_DO_GRAMADO, 24.2, 25.0, 25.9, 26.8, 27.6, 28.3, 28.9, 29.45, LINHA_MOLHADA]
    areia = objeto_colorido('areia', *anel_de_faixas(rp, SEG, 'areia', 'a'))
    rm = [LINHA_MOLHADA, 30.5, 31.2, 32.1, 33.2, 34.5, 36.0, 38.5, 42.0]
    molhada = objeto_colorido('molhada', *anel_de_faixas(rm, SEG, 'molhada', 'm'))
    return [grama, areia, molhada]


def espuma():
    """Anel de espuma na linha d'água, com a borda de dentro recortada em ondinhas."""
    seg = 180
    verts, faces = [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        onda = 0.18 * math.sin(a * 23) + 0.1 * math.sin(a * 41 + 1)
        for dr in (-0.25 + onda, 0.05, 0.42 + onda * 0.5):
            rr = (LINHA_DAGUA + dr) * irregularidade(a)
            verts.append((rr * math.cos(a), -rr * math.sin(a), 0.035))
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(2):
            faces.append((i * 3 + k, j * 3 + k, j * 3 + k + 1, i * 3 + k + 1))
    return [malha('espuma', verts, faces, 'espuma')]


# ------------------------------------------------------------------ enfeites
def livre(x, z, folga=0.0):
    """Lugar onde dá para enfeitar (longe da casa, da horta, da bancada, do farol, do píer e das
    pontes)."""
    if -7.6 - folga < x < 7.6 + folga and -9.6 - folga < z < 3.2 + folga:
        return False
    if math.hypot(x - HORTA['x'], z - HORTA['z']) < 3.6 + folga:
        return False
    if math.hypot(x - BANCADA[0], z - BANCADA[1]) < 2.4 + folga:
        return False
    if math.hypot(x - FAROL[0], z - FAROL[1]) < 3.0 + folga:
        return False
    if -7 < x < -3 and z > 22:
        return False
    for ang in ANGULOS_DAS_PONTES:
        a = math.radians(ang)
        ax, az = math.cos(a), math.sin(a)
        ao_longo = x * ax + z * az
        de_lado = abs(-x * az + z * ax)
        if ao_longo > 18 and de_lado < 2.2 + folga:
            return False
    return True


def perto_de_arvore(x, z, d=1.1):
    return any(math.hypot(x - ax, z - az) < d * s for ax, az, s in ARVORES)


def caminho(pontos, passo=1.15, seed=0):
    """Pedras chatas de caminho ao longo da poligonal (jogo)."""
    rnd = random.Random(seed)
    out = []
    for (x0, z0), (x1, z1) in zip(pontos, pontos[1:]):
        L = math.hypot(x1 - x0, z1 - z0)
        n = max(1, int(L / passo))
        for k in range(n):
            t = (k + 0.5) / n
            x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
            nx, nz = -(z1 - z0) / L, (x1 - x0) / L
            lado = rnd.uniform(-0.22, 0.22)
            x, z = x + nx * lado, z + nz * lado
            s = rnd.uniform(0.42, 0.58)
            o = cyl(s, 0.08, no_chao(x, z, 0.0), 'pedraCaminho' if k % 3 else 'pedraCaminhoEscura', verts=7,
                    smooth_sides=False)
            o.scale = (1, rnd.uniform(0.7, 0.95), 1)
            o.rotation_euler = (0, 0, rnd.uniform(0, math.pi))
            out.append(o)
    return out


def moita(x, z, s, seed):
    rnd = random.Random(seed)
    p = []
    cores = ['copa', 'copaEscura', 'copaClara']
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.4, 0.4)
        d = 0.32 * s
        r = s * rnd.uniform(0.42, 0.55)
        bx, by, bz = no_chao(x + math.cos(a) * d, z + math.sin(a) * d, 0)
        p.append(superellipsoid((2 * r, 2 * r, 1.6 * r), (bx, by, bz + r * 0.55), cores[(k + seed) % 3],
                                e1=0.8, e2=0.9, seg=8, ring=5))
    if seed % 2 == 0:
        # Moita florida: bolinhas de flor por cima.
        for k in range(4):
            a = rnd.uniform(0, 2 * math.pi)
            bx, by, bz = no_chao(x + math.cos(a) * 0.35 * s, z + math.sin(a) * 0.35 * s, 0)
            p.append(sphere(0.07 * s + 0.02, (bx, by, bz + 0.85 * s), 'petalaRosa' if seed % 4 else 'petalaAmarela',
                            subdiv=1, smooth_it=False))
    return p


def estrela_do_mar(x, z, rot, m):
    o = prism(star_pts(0.28, 0.12, 5, rot), 0.05, (0, 0, 0), m, rot=(R(90), 0, 0), bevel=0.0)
    bx, by, bz = no_chao(x, z, 0.03)
    o.location = (bx, by, bz)
    return o


# Colisão das moitas: um pouco menor que a folhagem (o corpo encosta nas folhas, mas não entra) e
# no mínimo 0,7 de alto (o personagem sobe sozinho até uns 0,58: degrau mais a curva do pé).
MOITA_RAIO = 0.68
MOITA_ALTO = 0.7
MOITA_ALTO_MINIMO = 0.7
# Colisão das pedras: entre os dois raios da pedra (1,3 e 1,1 por escala) e um pouco abaixo do
# topo (a pedra é arredondada). As pequenas ficam abaixo do que ele sobe: ele sobe nelas.
PEDRA_RAIO = 0.58
PEDRA_ALTO = 0.62


def enfeites(col):
    """Os enfeites do chão. Moitas e pedras põem a colisão delas em `col`."""
    rnd = random.Random(7)
    p = []
    # Capim: espalhado pelo gramado, mais junto da borda e das árvores.
    n = 0
    tent = 0
    while n < 100 and tent < 4000:
        tent += 1
        a = rnd.uniform(0, 2 * math.pi)
        r = BORDA_DO_GRAMADO * math.sqrt(rnd.uniform(0.04, 0.97))
        x, z = r * math.cos(a) * irregularidade(a), r * math.sin(a) * irregularidade(a)
        if not livre(x, z) or perto_de_arvore(x, z, 0.5):
            continue
        if r < 12 and rnd.random() < 0.5:
            continue
        p.append(tufo(no_chao(x, z), 0.36 + 0.16 * rnd.random(), seed=n, m='tufo' if n % 3 else 'tufoClaro'))
        n += 1
    # Flores em canteirinhos (grupos de 4 a 6 da mesma cor).
    cores = ['petalaBranca', 'petalaRosa', 'petalaAmarela', 'petalaLilas']
    grupos = [(-11, 9), (-17, 1), (-2, 18), (9, 12), (18, -4), (14, -14), (-8, -19), (-18, -11), (2, 21),
              (-13, 19)]
    for gi, (gx, gz) in enumerate(grupos):
        for k in range(5):
            x, z = gx + rnd.uniform(-1.1, 1.1), gz + rnd.uniform(-1.1, 1.1)
            if not livre(x, z) or perto_de_arvore(x, z, 0.6) or raio_efetivo(x, z) > BORDA_DO_GRAMADO - 0.6:
                continue
            p += flor(no_chao(x, z), cores[gi % 4], seed=gi * 10 + k, r=0.15 + 0.04 * rnd.random())
    # Moitas: perto da casa (sem tapar a porta) e soltas pela ilha.
    for i, (x, z, s) in enumerate([(-8.4, -1.5, 1.0), (-8.6, -6.5, 1.1), (8.5, -9.6, 0.9), (-3.5, -10.6, 1.0),
                                   (3.8, -10.7, 0.85), (-20, 3, 1.2), (19, 3, 1.1), (-6, 20, 1.0),
                                   (8, -18, 1.1), (21, -8, 0.9)]):
        p += moita(x, z, s, i)
        col.append(col_no_chao('moita', x, z, MOITA_RAIO * s, max(MOITA_ALTO * s, MOITA_ALTO_MINIMO)))
    # Pedras: grupinhos no gramado e na praia.
    for i, (x, z, s) in enumerate([(-15, 12, 1.0), (-14.2, 12.8, 0.55), (13, -17, 0.9), (13.8, -16.2, 0.5),
                                   (20.5, 8, 0.8), (-21, -2, 0.9), (-20.4, -2.9, 0.5),
                                   (25.5, -8, 1.1), (26.2, -7, 0.6), (-26, 8, 1.2), (-25.3, 9.1, 0.6),
                                   (-24, -15, 1.0), (16, 22, 1.0), (16.9, 21.4, 0.55), (-15, -22, 0.9)]):
        if not livre(x, z, 0.3):
            continue
        bx, by, bz = no_chao(x, z, -0.08 * s)
        p.append(rock((bx, by, bz), (1.3 * s, 1.1 * s, 0.8 * s), 'pedra', seed=i, subdiv=1, rough=0.2,
                      top_m='musgo' if raio_efetivo(x, z) < BORDA_DO_GRAMADO else 'pedraClara'))
        col.append(col_no_chao('pedra', x, z, PEDRA_RAIO * s, PEDRA_ALTO * s))
    # Caminho de pedras: da porta até o píer, e da porta até a horta e a bancada.
    p += caminho([(2.5, 1.6), (1.5, 6), (-1.5, 12), (-4, 18), (-5, 24.5)], seed=1)
    p += caminho([(4.5, 1.4), (7.4, 1.2)], seed=2)
    p += caminho([(8.2, -1.2), (9.6, -4.4)], seed=3)
    # Estrelas do mar na areia.
    for i, (x, z) in enumerate([(-12, 26.5), (22, 15), (24, -12.5), (-26.4, -6)]):
        if livre(x, z):
            p.append(estrela_do_mar(x, z, rnd.uniform(0, 72), 'coral' if i % 2 else 'petalaAmarela'))
    return p


def main():
    lib_q.reset()
    col = []
    nos = {'chao': chao(), 'enfeites': enfeites(col), 'espuma': espuma()}
    exportar('terreno', nos, colisores=col)


if __name__ == '__main__':
    main()
