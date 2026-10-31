"""O chão da ilha central: gramado, praia, areia molhada, espuma e os enfeites do chão.

Referencial: o do mundo (a ilha central fica na origem do jogo). A altura de cada vértice sai de
`altura()`, cópia exata de `alturaDaIlha` em `src/mundo/medidas.ts`, então o desenho cai em cima da
colisão (que continua sendo calculada no código).

O retângulo do lote grande da casa (x -17 a 16, z -15 a 12, `LOTE_DA_CASA_GRANDE`) é uma malha
própria, `chao-do-lote`, numa grade de 1 m (a célula do Construir): o jogo pode trocar só ela pela
grade de alturas da criança. O resto do chão é polar no "raio efetivo" (a borda irregular da ilha),
com os ângulos dos 120 pontos da borda do lote vistos do centro (os quatro cantos entre eles): o
primeiro anel é a própria borda do lote, vértice por vértice (sem fresta nem emenda em T). Há um
anel na borda do gramado (23,5) e outro na linha da areia molhada: as divisas ficam limpas. As
cores variam de leve por vértice (manchas de grama, areia secando), com a mesma conta nas duas
malhas.

Nós: `chao` (o terreno, com o filho `chao-do-lote`: quem copia o `chao` leva os dois), `enfeites`
(capim, flores, moitas, pedras, pedras do caminho, estrelas do mar, todos fora do lote grande) e
`espuma` (o anel branco na linha d'água; o jogo pode balançar).

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
# O retângulo do lote grande da casa (`LOTE_DA_CASA_GRANDE` em `src/sistemas/construcao/lote.ts`):
# fica só grama, para a criança crescer a casa para qualquer lado.
LOTE_GRANDE = (-17, -15, 16, 12)
CATA_VENTO = (6.8, 15)


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


def perimetro_do_lote():
    """Os pontos inteiros (1 m) da borda do lote grande, em volta, do canto (x0, z0) para +x: são os
    vértices da borda do `chao-do-lote` e os do primeiro anel do resto do chão (a emenda)."""
    x0, z0, x1, z1 = LOTE_GRANDE
    pts = [(x, z0) for x in range(x0, x1)] + [(x1, z) for z in range(z0, z1)]
    pts += [(x, z1) for x in range(x1, x0, -1)] + [(x0, z) for z in range(z1, z0, -1)]
    return sorted(pts, key=lambda p: math.atan2(p[1], p[0]))


def lote():
    """`chao-do-lote`: o retângulo do lote grande numa grade de 1 m (a célula do Construir), com a
    altura de `altura()` em cada vértice e a mesma cor da grama em volta."""
    x0, z0, x1, z1 = LOTE_GRANDE
    nx, nz = x1 - x0 + 1, z1 - z0 + 1
    verts, cores, faces = [], [], []
    for j in range(nz):
        for i in range(nx):
            x, z = x0 + i, z0 + j
            verts.append((x, -z, altura(x, z)))
            cores.append(cor_do_chao(x, z, 'grama'))
    for j in range(nz - 1):
        for i in range(nx - 1):
            a = j * nx + i
            faces.append((a, a + 1, a + nx + 1, a + nx))
    return objeto_colorido('chao-do-lote', verts, cores, faces)


def faixas(angulos, raios_por_angulo, zona, primeiro=None):
    """Faixa polar com um vértice por ângulo em cada anel. `raios_por_angulo[k][i]` é o raio efetivo
    do anel k no ângulo i; `primeiro` (opcional) troca o anel 0 por pontos dados (x, z) do jogo."""
    seg = len(angulos)
    verts, cores, faces = [], [], []
    for k, raios in enumerate(raios_por_angulo):
        for i, a in enumerate(angulos):
            if k == 0 and primeiro is not None:
                x, z = primeiro[i]
                v = (x, -z, altura(x, z))
            else:
                v, (x, z) = ponto(raios[i], a)
            verts.append(v)
            cores.append(cor_do_chao(x, z, zona))
    for j in range(len(raios_por_angulo) - 1):
        for i in range(seg):
            a0, a1 = j * seg + i, j * seg + (i + 1) % seg
            b0, b1 = (j + 1) * seg + i, (j + 1) * seg + (i + 1) % seg
            faces.append((a0, b0, b1, a1))
    return verts, cores, faces


def chao():
    """O chão em duas malhas: o `chao-do-lote` (grade do retângulo do lote grande) e o resto (`chao`),
    polar no raio efetivo. Os ângulos do resto são os dos pontos da borda do lote vistos do centro
    (cantos incluídos), então o primeiro anel do resto É a borda do lote, vértice por vértice."""
    material_do_chao()
    borda = perimetro_do_lote()
    angulos = [math.atan2(z, x) for x, z in borda]
    rb = [raio_efetivo(x, z) for x, z in borda]
    # A divisa da grama com a areia: 23,5, ou um pouco mais longe onde o canto do lote chega perto
    # dela (sem faixa fina demais entre o lote e a praia).
    fora = [max(BORDA_DO_GRAMADO, r + 0.6) for r in rb]
    K = 9
    raios = [[rb[i] + (fora[i] - rb[i]) * k / K for i in range(len(angulos))] for k in range(K + 1)]
    grama = objeto_colorido('grama', *faixas(angulos, raios, 'grama', primeiro=borda))
    rp = [24.2, 25.0, 25.9, 26.8, 27.6, 28.3, 28.9, 29.45, LINHA_MOLHADA]
    areia = objeto_colorido('areia', *faixas(angulos, [fora] + [[r] * len(angulos) for r in rp], 'areia'))
    rm = [LINHA_MOLHADA, 30.5, 31.2, 32.1, 33.2, 34.5, 36.0, 38.5, 42.0]
    molhada = objeto_colorido('molhada', *faixas(angulos, [[r] * len(angulos) for r in rm], 'molhada'))
    return [grama, areia, molhada], [lote()]


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
    """Lugar onde dá para enfeitar (fora do lote da casa, longe da horta, da bancada, do cata-vento,
    do farol, do píer e das pontes)."""
    x0, z0, x1, z1 = LOTE_GRANDE
    if x0 - folga < x < x1 + folga and z0 - folga < z < z1 + folga:
        return False
    if math.hypot(x - CATA_VENTO[0], z - CATA_VENTO[1]) < 1.6 + folga:
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


MOITAS = [(-20, 6, 1.0), (-19.5, -10.5, 1.1), (20, 0.5, 1.1), (-9.5, -17.5, 1.0), (-1, -17, 1.0),
          (17.5, 1.5, 0.9), (-6, 20, 1.0), (8, -18, 1.1), (21, -8, 0.9), (10.5, -17.2, 0.9)]
TRILHA_DO_PIER = [(-0.5, 12.8), (-2, 15), (-4, 18), (-5, 24.5)]
TRILHA_DA_HORTA = [(-0.5, 12.8), (3, 13.3), (5.4, 13.4)]


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
        # Folga de meio metro: as lâminas do tufo não passam para dentro do lote.
        if not livre(x, z, 0.5) or perto_de_arvore(x, z, 0.5):
            continue
        if r < 12 and rnd.random() < 0.5:
            continue
        p.append(tufo(no_chao(x, z), 0.36 + 0.16 * rnd.random(), seed=n, m='tufo' if n % 3 else 'tufoClaro'))
        n += 1
    # Flores em canteirinhos (grupos de 4 a 6 da mesma cor).
    cores = ['petalaBranca', 'petalaRosa', 'petalaAmarela', 'petalaLilas']
    grupos = [(-6, 17.5), (-17, 1), (-2, 18), (6, -17), (18, -4), (14, -14), (-8, -19), (-18, -11), (2, 21),
              (-13, 19)]
    for gi, (gx, gz) in enumerate(grupos):
        for k in range(5):
            x, z = gx + rnd.uniform(-1.1, 1.1), gz + rnd.uniform(-1.1, 1.1)
            if not livre(x, z, 0.5) or perto_de_arvore(x, z, 0.6) or raio_efetivo(x, z) > BORDA_DO_GRAMADO - 0.6:
                continue
            p += flor(no_chao(x, z), cores[gi % 4], seed=gi * 10 + k, r=0.15 + 0.04 * rnd.random())
    # Moitas: soltas pela ilha, fora do lote da casa (o lugar de construir fica livre).
    for i, (x, z, s) in enumerate(MOITAS):
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
    # Caminho de pedras: da beira do lote até o píer, e da beira do lote até o cata-vento e a horta.
    # Dentro do lote não há pedra: o chão fica para a obra.
    p += caminho(TRILHA_DO_PIER, seed=1)
    p += caminho(TRILHA_DA_HORTA, seed=2)
    # Estrelas do mar na areia.
    for i, (x, z) in enumerate([(-12, 26.5), (22, 15), (24, -12.5), (-26.4, -6)]):
        if livre(x, z):
            p.append(estrela_do_mar(x, z, rnd.uniform(0, 72), 'coral' if i % 2 else 'petalaAmarela'))
    return p


def main():
    lib_q.reset()
    col = []
    resto, do_lote = chao()
    nos = {'chao': resto, 'chao-do-lote': do_lote, 'enfeites': enfeites(col), 'espuma': espuma()}
    # O `chao-do-lote` é filho do `chao`: o jogo, que copia o nó `chao`, desenha os dois juntos, e
    # pode achar o do lote pelo nome para trocar só ele pela grade de alturas da criança.
    exportar('terreno', nos, colisores=col, filhos={'chao-do-lote': 'chao'})


if __name__ == '__main__':
    main()
