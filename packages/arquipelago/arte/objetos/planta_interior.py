"""A planta de interior em vaso (footprint 1 × 1, frente para -Y): a planta que a casa e as cabanas
podem pôr dentro de um cômodo, para o aconchego (`PLANTAS_DA_OBRA`).

Nós:
- `vaso`: o vaso redondo de cerâmica creme com a faixa terracota e a borda, o pratinho embaixo;
- `terra`: a terra que enche a boca do vaso, um pouco abaulada, com três pedrinhas;
- `folhas`: os talos curvos que saem da terra e as folhas largas (três verdes, a nervura clara
  no meio e as duas folhas novas mais claras).

Cabe numa célula com as folhas (no máximo 0,96 × 0,96) e tem até 1,40 de altura. Sem clipe e sem
luz. As folhas são cascas finas fechadas (espessura de 0,008), para se ver dos dois lados.
"""
from lib_objetos import *

lib_q.PALETTE.update({
    'vasoCeramica': ('#f4e6cf', 0.55, None, 0),
    'vasoFaixa': ('#d9785a', 0.6, None, 0),
    'vasoPrato': ('#c9694b', 0.65, None, 0),
    'terraVaso': ('#6b4a35', 0.95, None, 0),
    'pedrinhaVaso': ('#d8cfc0', 0.8, None, 0),
    'nervuraFolha': ('#9ed98a', 0.75, None, 0),
    'folhaNova': ('#8fdc6a', 0.75, None, 0),
    'talo': ('#4f9a45', 0.8, None, 0),
})
# A face do Pinta na cor do vaso sem pintura.
lib_q.PALETTE['pintaFrente'] = lib_q.PALETTE['vasoCeramica']

# Vaso: o perfil de dentro para fora (raio, altura). A boca fica em Z_BOCA.
Z_PRATO = 0.03
Z_BOCA = 0.46
R_BOCA = 0.2
Z_TERRA = Z_BOCA - 0.035
METADE_MAX = 0.48   # meia célula, com folga para não encostar no vizinho
ALTURA_MAX = 1.4


def vaso():
    p = []
    prato = torneado([(0, 0), (0.2, 0), (0.215, 0.012), (0.218, Z_PRATO), (0.2, Z_PRATO), (0.19, 0.018),
                      (0, 0.018)], 'vasoPrato', seg=28)
    p.append(prato)
    perfil = [(0, Z_PRATO), (0.15, Z_PRATO), (0.158, Z_PRATO + 0.01), (0.175, 0.2), (0.19, 0.36),
              (R_BOCA, 0.41), (0.214, 0.415), (0.218, Z_BOCA - 0.01), (0.212, Z_BOCA), (0.19, Z_BOCA),
              (0.186, Z_TERRA - 0.005), (0, Z_TERRA - 0.005)]
    corpo = torneado(perfil, 'vasoCeramica', seg=28)
    # A faixa terracota no meio do corpo e a borda de cima na mesma cor. O resto da volta do vaso é a
    # face que o Pinta pinta (fase3-11): a imagem dá a volta nele como um rótulo, com a emenda atrás.
    pintar_por(corpo, lambda c, n: 'vasoFaixa' if 0.22 < c.z < 0.29 or c.z > 0.405
               else 'pintaFrente' if abs(n.z) < 0.6 and c.z > Z_PRATO + 0.008 else None)
    uv_em_volta(corpo, 'pintaFrente')
    p.append(corpo)
    return p


def uv_em_volta(o, material):
    """Coordenadas de textura em volta do eixo z: u de 0 a 1 dando a volta (0,5 na frente, −Y; a
    emenda fica atrás) e v de 0 a 1 de baixo para cima, como um rótulo colado no vaso."""
    bpy.context.view_layer.update()
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    uv = me.uv_layers[0].data
    idx = {i for i, m in enumerate(me.materials) if m and m.name == material}
    M = o.matrix_world
    zs = [(M @ me.vertices[v].co).z for p in me.polygons if p.material_index in idx for v in p.vertices]
    z0, z1 = min(zs), max(zs)
    for p in me.polygons:
        if p.material_index not in idx:
            continue
        pts = [M @ me.vertices[me.loops[li].vertex_index].co for li in p.loop_indices]
        us = [0.5 + math.atan2(w.x, -w.y) / (2 * math.pi) for w in pts]
        # Na emenda (atrás) a face não pode ir de 0,96 a 0,04 dando a volta inteira: o lado da emenda
        # em que ela fica (o do meio da face) decide se o ponto da emenda é 0 ou 1.
        if max(us) - min(us) > 0.5:
            meio = math.atan2(sum(w.x for w in pts), -sum(w.y for w in pts))
            if meio < 0:
                us = [u - 1 if u > 0.5 else u for u in us]
            else:
                us = [u + 1 if u < 0.5 else u for u in us]
            us = [min(max(u, 0.0), 1.0) for u in us]
        for li, u, w in zip(p.loop_indices, us, pts):
            uv[li].uv = (u, (w.z - z0) / (z1 - z0))
    return o


def terra():
    p = []
    t = torneado([(0, Z_TERRA + 0.02), (0.12, Z_TERRA + 0.012), (0.188, Z_TERRA), (0.188, Z_TERRA - 0.02),
                  (0, Z_TERRA - 0.02)], 'terraVaso', seg=24)
    p.append(t)
    for (x, y, r) in ((0.11, -0.06, 0.022), (-0.09, -0.1, 0.018), (0.04, 0.12, 0.02)):
        d = math.hypot(x, y)
        z = Z_TERRA + 0.02 - 0.008 * d / 0.12
        p.append(esfera(r, (x, y, z), 'pedrinhaVaso', escala=(1, 1, 0.6), seg=8, aneis=5))
    return p


# As frações da largura nas colunas da folha: a faixa fininha do meio é a nervura.
COLUNAS = (-1.0, -0.55, -0.07, 0.0, 0.07, 0.55, 1.0)
LINHAS = 8


def largura_em(t):
    """Meia largura relativa ao longo da folha (0 na base, 1 na ponta): coração na base, ponta fina."""
    if t <= 0:
        return 0.18
    return max(0.0, math.sin(math.pi * min(1.0, t) ** 0.85)) * (1 - 0.15 * t) + 0.18 * (1 - t) ** 3


def folha(base, guinada, inclinacao, comp, larg, m):
    """Uma folha larga com a base no ponto `base`, apontando para fora (guinada em graus, em volta
    do z) e subindo `inclinacao` graus. A nervura afunda um pouco e a ponta cai."""
    verts, faces = [], []
    for j in range(LINHAS + 1):
        t = j / LINHAS
        w = larg / 2 * largura_em(t)
        for f in COLUNAS:
            x = f * w
            y = comp * t
            # Vinco: as bordas sobem; a ponta cai (peso) e a base sobe um pouco.
            z = 0.22 * abs(x) - 0.28 * comp * t * t
            verts.append((x, y, z))
    nc = len(COLUNAS)
    for j in range(LINHAS):
        for i in range(nc - 1):
            a = j * nc + i
            faces.append((a, a + 1, a + nc + 1, a + nc))
    o = malha('folha', verts, faces, m, liso=True)
    # Nervura clara: as duas colunas finas do meio.
    meio = {COLUNAS.index(-0.07), COLUNAS.index(0.0)}
    for poly in o.data.polygons:
        if poly.vertices[0] % nc in meio:
            poly.material_index = _indice(o, 'nervuraFolha')
    s = o.modifiers.new('esp', 'SOLIDIFY')
    s.thickness = 0.008
    s.offset = 0
    lib_q._apply(o, s)
    o.rotation_euler = (R(inclinacao), 0, R(guinada - 90))
    o.location = base
    bpy.context.view_layer.update()
    _aplicar(o)
    return o


def _indice(o, nome):
    mats = [m.name for m in o.data.materials]
    if nome not in mats:
        o.data.materials.append(lib_q.mat(nome))
        mats.append(nome)
    return mats.index(nome)


def _aplicar(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def ponto_no_talo(guinada, alcance, altura):
    a = R(guinada)
    return Vector((math.cos(a) * alcance, math.sin(a) * alcance, altura))


# Cada folha: guinada (graus), alcance do fim do talo, altura do fim do talo, inclinação da folha,
# comprimento, largura e material. Ângulo de ouro entre as folhas, as de cima mais em pé.
FOLHAS = [
    (-90, 0.12, 0.68, 20, 0.32, 0.28, 'folha'),
    (30, 0.13, 0.7, 18, 0.32, 0.28, 'folhaEscura'),
    (150, 0.12, 0.72, 20, 0.31, 0.27, 'folha'),
    (-150, 0.12, 0.8, 26, 0.3, 0.26, 'folhaEscura'),
    (-30, 0.12, 0.82, 26, 0.3, 0.26, 'folha'),
    (90, 0.12, 0.84, 28, 0.3, 0.26, 'folhaEscura'),
    (-60, 0.09, 0.94, 38, 0.28, 0.24, 'folha'),
    (60, 0.09, 0.97, 40, 0.28, 0.24, 'folha'),
    (180, 0.09, 0.99, 38, 0.27, 0.23, 'folhaEscura'),
    (14, 0.06, 1.08, 52, 0.25, 0.2, 'folhaNova'),
    (151, 0.05, 1.1, 54, 0.23, 0.18, 'folhaNova'),
    (-120, 0.04, 1.13, 60, 0.2, 0.16, 'folhaNova'),
]


def folhas():
    p = []
    for (g, alc, alt, inc, comp, larg, m) in FOLHAS:
        a = R(g)
        saida = Vector((math.cos(a) * 0.07, math.sin(a) * 0.07, Z_TERRA + 0.01))
        fim = ponto_no_talo(g, alc, alt)
        meio = saida.lerp(fim, 0.45)
        meio.z = saida.z + (fim.z - saida.z) * 0.75   # o talo sobe e depois abre
        p.append(tube([tuple(saida), tuple(meio), tuple(fim)], [0.012, 0.01, 0.008], 'talo', seg=6))
        p.append(folha(tuple(fim), g, inc, comp, larg, m))
    return p


def conferir(nos):
    todos = [o for objs in nos.values() for o in objs]
    bpy.context.view_layer.update()
    xs, ys, zs = [], [], []
    for o in todos:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            xs.append(w.x)
            ys.append(w.y)
            zs.append(w.z)
    assert min(zs) >= -1e-4, f'passou do chão: {min(zs):.3f}'
    assert max(zs) <= ALTURA_MAX, f'alta demais: {max(zs):.3f}'
    for nome, eixo in (('x', xs), ('y', ys)):
        assert max(abs(min(eixo)), abs(max(eixo))) <= METADE_MAX, f'passa da célula em {nome}: {min(eixo):.3f} {max(eixo):.3f}'
    print(f'MEDIDAS planta-interior: {max(xs) - min(xs):.2f} × {max(ys) - min(ys):.2f} × {max(zs):.2f}')


def planta_interior():
    nos = {'vaso': vaso(), 'terra': terra(), 'folhas': folhas()}
    conferir(nos)
    return {'nos': nos, 'grupo': 'planta', 'uv': True}


ITENS = [('planta-interior', planta_interior)]

if __name__ == '__main__':
    rodar(ITENS)
