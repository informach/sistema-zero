"""As constelações escondidas no céu da Ilha das Nuvens e o mirante com a luneta de onde se olha.

Seis figuras do arquipélago, cada uma num nó `constelacao-N` (as linhas, material
`linhaConstelacao`, fino e suave, com o pivô no meio da figura) e cada estrela num nó filho
`constelacao-N-estrela-M` (material `estrela`, que acende): o jogo pode mostrar a figura inteira ou
acender as estrelas uma a uma.

1. a arara (a Iriê de perfil, com a asa aberta e o rabo comprido);
2. o balão;
3. o vagalume (o Zappy, com a cauda que brilha);
4. o peixe;
5. o farol, com o facho;
6. a nota musical (a colcheia, com a cabeça cheia de estrelas e a bandeirinha).

As figuras ficam em volta da ilha, de 16 a 26 m acima do tampo e a uns 30 m do mirante, viradas
para ele (de lá se vê cada uma direito). O mirante é um deque redondo de madeira na beira da ilha,
com a luneta grande de latão num tripé (o tubo é o nó `luneta-tubo`, com o pivô no apoio, para o
jogo girar até a constelação), o quadro com as seis figuras, um banquinho e o lampião.

Referencial: o mesmo do `nuvens.glb` (o centro da ilha, tampo em y = 1; no jogo a ilha fica num
grupo a y = 7). Este arquivo entra no mesmo grupo, sem deslocamento.

Saída: `nuvens-constelacoes.glb` (nós `mirante`, `luneta-tubo`, `constelacao-1` a `-6` com as
estrelas, os `col-*` e as âncoras `luneta` e `quadro-das-estrelas`).
"""
from lib_ilhas_b import *
from mathutils import Matrix  # noqa: E402

lib_q.PALETTE.update({
    'linhaConstelacao': ('#c6dcff', 0.6, '#a9c8ff', 0.6),
    'quadroEstrelas': ('#26395a', 0.6, None, 0),
})
lib_q.ALPHA.update({'linhaConstelacao': 0.7})

MIRANTE = (-6.0, -8.0)          # x, z do jogo
DEQUE = 0.35                    # altura do deque acima do tampo
OLHO = Vector((MIRANTE[0], -MIRANTE[1], TOPO + DEQUE + 1.4))   # onde fica o olho de quem olha (Blender)

# Figuras: estrelas (u, v, tamanho) em metros, com o tamanho 0 (pequena), 1 (média) ou 2 (grande,
# as principais), e as linhas (pares de estrelas).
FIGURAS = [
    # A arara de perfil, olhando para a esquerda: bico curvo, cabeça, a asa aberta para cima e o rabo
    # comprido de duas penas.
    ('arara', [(-2.1, 2.9, 0), (-1.4, 3.5, 1), (-0.8, 4.1, 2), (-0.1, 3.4, 0), (-1.1, 2.1, 1), (0.4, 2.6, 0),
               (2.5, 4.9, 2), (2.4, 2.8, 1), (-0.2, 0.7, 1), (0.7, 0.0, 0), (2.8, -3.6, 2), (1.5, -3.2, 0)],
     [(0, 1), (1, 2), (2, 3), (1, 4), (3, 5), (5, 6), (6, 7), (7, 9), (4, 8), (8, 9), (9, 10), (9, 11)]),
    ('balao', [(0.0, 4.4, 1), (-2.0, 3.6, 0), (-2.5, 1.9, 2), (-1.3, 0.2, 1), (1.3, 0.2, 1), (2.5, 1.9, 2), (2.0, 3.6, 0),
               (-0.6, -1.6, 0), (0.6, -1.6, 1)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 0), (3, 7), (4, 8), (7, 8)]),
    ('vagalume', [(0.0, 2.6, 1), (0.0, 1.3, 0), (0.0, -1.8, 2), (-2.4, 2.6, 1), (2.4, 2.6, 1), (-1.7, 0.5, 0),
                  (1.7, 0.5, 0), (-0.8, 3.8, 0), (0.8, 3.8, 0)],
     [(7, 0), (8, 0), (0, 1), (1, 2), (1, 3), (3, 5), (5, 1), (1, 4), (4, 6), (6, 1)]),
    ('peixe', [(-3.0, 0.0, 2), (-0.6, 1.5, 1), (1.6, 0.0, 0), (-0.6, -1.5, 1), (3.0, 1.3, 1), (3.0, -1.3, 0),
               (-2.0, 0.4, 0)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (2, 4), (4, 5), (5, 2)]),
    ('farol', [(-1.1, -3.4, 1), (1.1, -3.4, 1), (-0.6, 1.4, 0), (0.6, 1.4, 0), (0.0, 2.3, 2), (0.0, 3.4, 0), (2.4, 2.7, 0),
               (3.8, 3.0, 1)],
     [(0, 1), (0, 2), (1, 3), (2, 3), (2, 4), (3, 4), (4, 5), (4, 6), (6, 7)]),
    # A colcheia: a cabeça é uma roda de estrelas em volta de uma grande, a haste sobe do lado direito e
    # a bandeirinha desce em curva.
    ('nota', [(-0.1, 0.0, 2), (-1.35, 0.05, 1), (-0.7, 0.9, 0), (0.6, 0.8, 1), (1.2, -0.05, 0), (0.4, -0.85, 1),
              (-0.75, -0.8, 0), (1.25, 2.4, 0), (1.25, 4.8, 2), (2.5, 3.9, 1), (2.8, 2.7, 0), (2.2, 1.8, 1)],
     [(1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 1), (4, 7), (7, 8), (8, 9), (9, 10), (10, 11)]),
]
RAIO_ESTRELA = (0.36, 0.5, 0.7)
# Onde fica cada figura: rumo (graus, no chão do jogo, de +x para +z), distância no chão e altura
# acima do tampo, contados do mirante; e o tamanho.
LUGARES = [(200, 30, 22, 1.6), (262, 28, 18, 1.5), (322, 30, 24, 1.5), (22, 32, 16, 1.6), (82, 30, 20, 1.5),
           (142, 28, 26, 1.7)]


def estrela(r, m='estrela'):
    """Estrela gordinha de cinco pontas: frente e costas em ponta (40 triângulos), na origem,
    deitada no plano XZ do Blender (a frente olha para −Y)."""
    verts = [(0, -r * 0.42, 0), (0, r * 0.42, 0)]
    for k in range(10):
        a = math.pi / 2 + math.pi * k / 5
        rr = r if k % 2 == 0 else r * 0.45
        verts.append((math.cos(a) * rr, 0, math.sin(a) * rr))
    faces = []
    for k in range(10):
        a, b = 2 + k, 2 + (k + 1) % 10
        faces.append((0, b, a))
        faces.append((1, a, b))
    o = malha('estrela', verts, faces, m, liso=False, cima=False)
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    return o


def constelacao(n, figura, lugar):
    nome, pts, linhas = figura
    rumo, dist, alto, s = lugar
    a = R(rumo)
    cx, cz = MIRANTE[0] + math.cos(a) * dist, MIRANTE[1] + math.sin(a) * dist
    centro = Vector((cx, -cz, TOPO + alto))
    # Base da figura: "frente" para o mirante, "cima" o mais perto do céu possível.
    frente = (OLHO - centro).normalized()
    direita = Vector((0, 0, 1)).cross(frente).normalized()
    cima = frente.cross(direita).normalized()
    giro = Matrix((direita, frente * -1, cima)).transposed()   # colunas: x da figura, −y (frente), z
    onde = []
    estrelas = []
    for m, (u, v, tam) in enumerate(pts):
        q = centro + direita * (u * s) + cima * (v * s)
        onde.append(q)
        r = RAIO_ESTRELA[tam]
        e = estrela(r)
        e.matrix_world = Matrix.Translation(q) @ giro.to_4x4() @ Matrix.Rotation(R(8 * m), 4, 'Y')
        estrelas.append((f'constelacao-{n}-estrela-{m + 1}', e, q))
    tubos_ = []
    for i, j in linhas:
        a_, b_ = onde[i], onde[j]
        d = (b_ - a_).normalized()
        ri = RAIO_ESTRELA[pts[i][2]]
        rj = RAIO_ESTRELA[pts[j][2]]
        # A linha para antes de cada estrela (não fura a estrela) e fica um pouco atrás dela.
        p0 = a_ + d * (ri * 0.8) - frente * 0.1
        p1 = b_ - d * (rj * 0.8) - frente * 0.1
        tubos_.append(tube([p0, p1], [0.055, 0.055], 'linhaConstelacao', seg=5, cap=True))
    return tubos_, estrelas, centro


# ------------------------------------------------------------------ mirante e luneta
def mirante(col):
    bx, by = MIRANTE[0], -MIRANTE[1]
    p = []
    z = TOPO + DEQUE
    # O deque de tábuas.
    p.append(cyl(1.75, 0.16, (bx, by, z - 0.08), 'madeiraTear', verts=18, bevel=0.03))
    for k in range(5):
        a = math.pi * k / 5
        p.append(box((3.3, 0.05, 0.02), (bx, by, z + 0.006 + 0.004 * k), 'madeiraTearEscura', bevel=0.0, rot=(0, 0, a)))
    col.append(col_cilindro('deque', 1.75, DEQUE + 0.2, (bx, by, TOPO + (DEQUE - 0.2) / 2)))
    # Degrau de entrada (virado para o meio da ilha).
    para_meio = math.atan2(by, -bx) + math.pi
    dx, dy = math.cos(para_meio), math.sin(para_meio)
    # Nuvenzinhas saindo por baixo da beira do deque (menos do lado do degrau).
    for k in range(9):
        a = para_meio + R(35) + k * R(290) / 8
        r = 0.42 + 0.08 * (k % 3)
        p.append(uvball(r, (bx + math.cos(a) * 1.72, by + math.sin(a) * 1.72, TOPO + 0.05 + 0.03 * (k % 2)),
                        'nuvem' if k % 2 else 'nuvemAzulada', seg=8, ring=5, scale=(1, 1, 0.62)))
    p.append(box((0.6, 1.0, 0.17), (bx + dx * 2.0, by + dy * 2.0, TOPO + 0.085), 'madeiraTear', bevel=0.03, segs=1,
                 rot=(0, 0, para_meio)))
    col.append(col_caixa('degrau', (0.6, 1.0, 0.17), (bx + dx * 2.0, by + dy * 2.0, TOPO + 0.085), (0, 0, para_meio)))
    # Guarda-corpo de postes e corda, aberto do lado do degrau.
    pts = []
    for k in range(11):
        a = para_meio + R(40) + k * R(280) / 10
        q = (bx + math.cos(a) * 1.6, by + math.sin(a) * 1.6)
        p.append(cyl(0.05, 0.9, (q[0], q[1], z + 0.45), 'madeiraTearEscura', verts=6))
        p.append(uvball(0.07, (q[0], q[1], z + 0.92), 'fio3', seg=6, ring=4))
        pts.append((q[0], q[1], z + 0.82))
        if k < 10:
            a2 = para_meio + R(40) + (k + 0.5) * R(280) / 10
            col.append(col_caixa('guarda', (0.55, 0.1, 0.9), (bx + math.cos(a2) * 1.6, by + math.sin(a2) * 1.6, z + 0.45),
                                 (0, 0, a2 + math.pi / 2)))
    for i in range(10):
        a, b = Vector(pts[i]), Vector(pts[i + 1])
        meio = (a + b) / 2 - Vector((0, 0, 0.08))
        p.append(tube([a, meio, b], [0.025] * 3, 'corda', seg=4, cap=False))
    # Tripé da luneta (o tubo é outro nó).
    apoio = Vector((bx, by, z + 1.25))
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.3
        p.append(tube([tuple(apoio - Vector((0, 0, 0.05))), (bx + math.cos(a) * 0.55, by + math.sin(a) * 0.55, z)], [0.04, 0.035],
                      'madeiraTearEscura', seg=5))
    p.append(cyl(0.09, 0.14, tuple(apoio - Vector((0, 0, 0.02))), 'lunetaLatao', verts=10))
    col.append(col_cilindro('tripe', 0.3, 1.2, (bx, by, z + 0.6)))
    # Quadro das estrelas: uma lousa azul com as seis figuras em pontinhos, num cavalete.
    qx, qy = bx + math.cos(para_meio + R(150)) * 1.05, by + math.sin(para_meio + R(150)) * 1.05
    # A frente do quadro olha para o degrau (quem sobe vê as figuras).
    gq = math.atan2(by + dy * 2.0 - qy, bx + dx * 2.0 - qx)
    p.append(box((0.9, 0.06, 0.7), (qx, qy, z + 1.05), 'quadroEstrelas', bevel=0.02, segs=1, rot=(R(-15), 0, gq + math.pi / 2)))
    p.append(box((0.98, 0.05, 0.78), (qx - math.cos(gq) * 0.025, qy - math.sin(gq) * 0.025, z + 1.05), 'madeiraTearEscura',
                 bevel=0.02, segs=1, rot=(R(-15), 0, gq + math.pi / 2)))
    for k in range(6):
        u = -0.3 + 0.3 * (k % 3)
        v = 0.15 if k < 3 else -0.15
        lx, ly = math.cos(gq + math.pi / 2) * u, math.sin(gq + math.pi / 2) * u
        p.append(cyl(0.05, 0.02, (qx + lx + math.cos(gq) * 0.045, qy + ly + math.sin(gq) * 0.045, z + 1.05 + v),
                     'estrela', verts=5, rot=(R(90 - 15), 0, gq + math.pi / 2)))
    for s_ in (-1, 1):
        lx, ly = math.cos(gq + math.pi / 2) * 0.35 * s_, math.sin(gq + math.pi / 2) * 0.35 * s_
        p.append(cyl(0.035, 1.0, (qx + lx, qy + ly, z + 0.5), 'madeiraTearEscura', verts=5))
    col.append(col_caixa('quadro', (0.9, 0.2, 1.4), (qx, qy, z + 0.7), (0, 0, gq + math.pi / 2)))
    # Banquinho e lampião.
    ox, oy = bx + math.cos(para_meio - R(120)) * 1.0, by + math.sin(para_meio - R(120)) * 1.0
    p.append(cyl(0.28, 0.08, (ox, oy, z + 0.45), 'madeiraTear', verts=10))
    for k in range(3):
        a = 2 * math.pi * k / 3
        p.append(cyl(0.03, 0.45, (ox + math.cos(a) * 0.18, oy + math.sin(a) * 0.18, z + 0.22), 'madeiraTearEscura', verts=5))
    col.append(col_cilindro('banco', 0.25, 0.5, (ox, oy, z + 0.25)))
    lx, ly = bx + math.cos(para_meio - R(60)) * 1.45, by + math.sin(para_meio - R(60)) * 1.45
    p += poste_lampiao(lx, -ly, y=z, h=1.6)
    col.append(col_cilindro('poste', 0.1, 1.6, (lx, ly, z + 0.8)))
    return p, apoio, (qx, qy, z), para_meio


def tubo_da_luneta(apoio, alvo):
    """Luneta de latão, três tubos encaixados, mirando o `alvo` (pivô no apoio)."""
    d = (alvo - apoio).normalized()
    rot = d.to_track_quat('Z', 'Y').to_euler()
    p = []
    for (t0, t1, r, m) in ((-0.55, 0.25, 0.13, 'lunetaLatao'), (0.25, 0.85, 0.11, 'cupulaObservatorio'),
                           (0.85, 1.25, 0.15, 'lunetaLatao')):
        c = apoio + d * ((t0 + t1) / 2)
        p.append(cyl(r, t1 - t0, tuple(c), m, verts=12, rot=rot))
    p.append(torus(0.155, 0.03, tuple(apoio + d * 0.25), 'cupulaObservatorio', seg=12, rseg=4, rot=rot))
    p.append(cyl(0.12, 0.02, tuple(apoio + d * 1.26), 'lenteFarol', verts=12, rot=rot))
    p.append(cyl(0.05, 0.16, tuple(apoio - d * 0.62), 'cupulaObservatorio', verts=8, rot=rot))
    p.append(torus(0.135, 0.025, tuple(apoio - d * 0.55), 'cupulaObservatorio', seg=12, rseg=4, rot=rot))
    return p


# ------------------------------------------------------------------ exportação (com filhos e col-*)
def exportar_tudo(pid, nos, filhos, ancoras, colisores):
    """Grava o GLB: os nós de cima, as estrelas como filhas de cada constelação, as âncoras e os
    `col-*`. O relatório lista todos os nós de malha (as estrelas também)."""
    juntos = {}
    for nome, (objs, pivo) in nos.items():
        juntos[nome] = lib_mundo._juntar([o for o in objs if o is not None], nome, pivo)
    for pai, lista in filhos.items():
        dono = juntos[pai]
        for nome, objs, pivo in lista:
            f = lib_mundo._juntar(objs, nome, pivo)
            juntos[nome] = f
            bpy.context.view_layer.update()
            f.parent = dono
            f.matrix_parent_inverse = dono.matrix_world.inverted()
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(juntos.values()) + list(ancoras) + list(colisores):
        o.select_set(True)
    path = os.path.join(SAIDA_ILHAS, f'{pid}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_texcoords=False, export_extras=False, export_animations=False)
    por_no = {n: contar(o) for n, o in juntos.items()}
    tris = sum(por_no.values())
    kb = os.path.getsize(path) / 1024
    anc = {e.name: [round(e.location.x, 2), round(e.location.z, 2), round(-e.location.y, 2)] for e in ancoras}
    grupos = grupos_col(colisores)
    print(f'EXPORTADO {pid}: {tris} triângulos, {kb:.0f} KB, {len(por_no)} nós, {len(anc)} âncoras, {len(colisores)} colisores')
    try:
        with open(RELATORIO_B) as f:
            rel = json.load(f)
    except (OSError, ValueError):
        rel = {}
    rel[pid] = {'triangulos': tris, 'kb': round(kb, 1), 'nos': por_no, 'ancoras': anc, 'clipes': [], 'colisores': grupos}
    with open(RELATORIO_B, 'w') as f:
        json.dump(rel, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write('\n')
    return path


def construir():
    lib_q.reset()
    col = []
    deque, apoio, quadro, para_meio = mirante(col)
    nos, filhos = {'mirante': (deque, None)}, {}
    centros = []
    for n, (fig, lugar) in enumerate(zip(FIGURAS, LUGARES), 1):
        linhas, estrelas, centro = constelacao(n, fig, lugar)
        nos[f'constelacao-{n}'] = (linhas, tuple(centro))
        filhos[f'constelacao-{n}'] = [(nome, [e], tuple(q)) for nome, e, q in estrelas]
        centros.append(centro)
    # A luneta começa mirando a primeira constelação (a arara).
    nos['luneta-tubo'] = (tubo_da_luneta(apoio, centros[0]), tuple(apoio))
    bx, by = MIRANTE[0], -MIRANTE[1]
    pe = Vector((bx, by, 0)) - (centros[0] - Vector((bx, by, centros[0].z))).normalized() * 0.75
    anc = [ancora('luneta', pe.x, -pe.y, TOPO + DEQUE), ancora('quadro-das-estrelas', quadro[0], -quadro[1], quadro[2])]
    exportar_tudo('nuvens-constelacoes', nos, filhos, anc, col)


if __name__ == '__main__':
    construir()
