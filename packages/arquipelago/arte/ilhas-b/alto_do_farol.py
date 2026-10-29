"""O alto do Farol (o final): a sala da lanterna por dentro. A escada em caracol chega por um vão
no piso, a lanterna grande gira no meio, a mesa da Íris tem os rascunhos espalhados e as janelas
olham o mar em volta, com a varanda do lado de fora.

Referencial: o centro da sala, y = 0 no piso. Gera `src/assets/ilhas/alto-do-farol.glb` com os
nós `sala` (paredes, janelas, piso, teto, varanda e o pedestal da lanterna), `escada`,
`mesa-da-iris` (a mesa com os rascunhos, o quadro de cortiça e a estante), `vidros` (o vidro das
janelas, material `janelaFarol`, transparente) e `lente` (a lente da lanterna com a lâmpada,
material `luz`, pivô no centro da lâmpada) com o clipe `girar` (4 s, uma volta, em laço). Âncoras
no README (`entrada`, `lanterna`, `mesa`…) e as três que o jogo usa: `chegada` (no piso livre, entre o
vão da escada e a lanterna), `leitura` (de frente para a mesa) e `camera-varanda` (na varanda, de
frente para o mar).

Colisão (formas simples, nenhuma malha de desenho): `col-cil-piso-sala-1` (o piso inteiro, com o vão
da escada tampado), 16 `col-parede-sala-*` (o anel da parede, por dentro em 4,2 m),
`col-cil-grade-escada-1` (a grade em volta do vão: não se cai pela escada), `col-mesa-iris-1` (mesa
e estante juntas; o banquinho fica livre) e `col-cil-base-lente-1` (o pedestal e a lente que gira).
A varanda fica do lado de fora das paredes: só a câmera vai lá, então o guarda-corpo não colide.
"""
from lib_ilhas_b import *

RAIO_SALA = 4.2
PAREDE = 0.35
JANELA = (1.1, 2.9)  # faixa das janelas (altura de baixo e de cima)
VAOS = 8
VAO_DA_PAREDE = 2  # o vão sem janela, onde fica o quadro de cortiça (atrás da mesa)
ESCADA = dict(x=-2.4, z=1.3, r=1.05)
LAMPADA_Y = 1.75
# Onde a criança chega: junto da `entrada`, fora da grade do vão (1,58 m do meio dele) e da lente
# (1,2 m do meio), com folga para o corpo de raio 0,35. Andando reto para a mesa (−z), ela contorna a
# lente pelo lado de fora.
CHEGADA = (-0.9, 0.8)
# O cilindro da lente: o pedestal (0,6) com folga. Na altura da criança (até 1,4 m) os anéis da lente
# não passam de 0,73 m do meio; as lupas grandes giram mais alto (de 1,41 a 2,09 m).
RAIO_DA_LENTE = 0.72


def anel_solido(r_in, r_out, z0, z1, m, n=40, a0=0.0, a1=2 * math.pi):
    """Anel grosso (parede de farol) entre dois raios e duas alturas, inteiro ou só um arco."""
    verts, faces = [], []
    cheio = abs(a1 - a0 - 2 * math.pi) < 1e-6
    passos = n if cheio else max(2, int(n * (a1 - a0) / (2 * math.pi)))
    for i in range(passos + (0 if cheio else 1)):
        a = a0 + (a1 - a0) * i / passos
        c, s = math.cos(a), math.sin(a)
        verts += [(c * r_in, s * r_in, z0), (c * r_out, s * r_out, z0), (c * r_out, s * r_out, z1), (c * r_in, s * r_in, z1)]
    total = passos if cheio else passos
    k = len(verts) // 4
    for i in range(total):
        a, b = 4 * i, 4 * ((i + 1) % k)
        faces += [(a, b, b + 1, a + 1), (a + 1, b + 1, b + 2, a + 2), (a + 2, b + 2, b + 3, a + 3), (a + 3, b + 3, b, a)]
    if not cheio:
        faces += [(0, 1, 2, 3), (4 * (k - 1) + 3, 4 * (k - 1) + 2, 4 * (k - 1) + 1, 4 * (k - 1))]
    o = malha('anel', verts, faces, m, cima=False)
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    for p in o.data.polygons:
        p.use_smooth = abs(p.normal.z) < 0.5
    return o


def piso():
    """Piso de tábuas em anéis, com o vão redondo da escada."""
    import bmesh as _bm
    bm = _bm.new()
    aneis, seg = 16, 64
    rr = [RAIO_SALA * i / aneis for i in range(aneis + 1)]
    centro = bm.verts.new((0, 0, 0))
    grade = []
    for i in range(1, aneis + 1):
        grade.append([bm.verts.new((math.cos(2 * math.pi * j / seg) * rr[i], math.sin(2 * math.pi * j / seg) * rr[i], 0))
                      for j in range(seg)])
    for j in range(seg):
        bm.faces.new((centro, grade[0][j], grade[0][(j + 1) % seg]))
    for i in range(aneis - 1):
        for j in range(seg):
            bm.faces.new((grade[i][j], grade[i + 1][j], grade[i + 1][(j + 1) % seg], grade[i][(j + 1) % seg]))
    ex, ey = ESCADA['x'], -ESCADA['z']
    fora = [f for f in bm.faces if math.hypot(f.calc_center_median().x - ex, f.calc_center_median().y - ey) < ESCADA['r'] + 0.12]
    _bm.ops.delete(bm, geom=fora, context='FACES')
    # A beira do vão vira um círculo de verdade: os vértices soltos vão para o raio do vão.
    rv = ESCADA['r'] + 0.12
    for v in bm.verts:
        d = math.hypot(v.co.x - ex, v.co.y - ey)
        if d < rv + RAIO_SALA / aneis and any(e.is_boundary for e in v.link_edges) and math.hypot(v.co.x, v.co.y) < RAIO_SALA - 0.01:
            v.co.x = ex + (v.co.x - ex) / d * rv
            v.co.y = ey + (v.co.y - ey) / d * rv
    me = bpy.data.meshes.new('piso')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('piso', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(lib_q.mat('pisoFarol'))
    o.data.materials.append(lib_q.mat('pisoFarolEscuro'))
    for p in o.data.polygons:
        r = math.hypot(p.center.x, p.center.y)
        p.material_index = int(r / (RAIO_SALA / aneis)) % 2
    sol = o.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.2
    sol.offset = -1
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=sol.name)
    lib_q.flat(o)
    return o


def sala():
    p = [piso()]
    # Parede de baixo, faixa das janelas (montantes e o vão sem janela), parede de cima.
    p.append(anel_solido(RAIO_SALA, RAIO_SALA + PAREDE, 0.0, JANELA[0], 'paredeFarol'))
    p.append(anel_solido(RAIO_SALA - 0.05, RAIO_SALA + PAREDE + 0.05, JANELA[0] - 0.08, JANELA[0], 'ferroFarol'))
    p.append(anel_solido(RAIO_SALA, RAIO_SALA + PAREDE, JANELA[1], 3.5, 'paredeFarolSombra'))
    p.append(anel_solido(RAIO_SALA - 0.05, RAIO_SALA + PAREDE + 0.05, JANELA[1], JANELA[1] + 0.08, 'ferroFarol'))
    passo = 2 * math.pi / VAOS
    for i in range(VAOS):
        a = i * passo
        p.append(box((0.22, PAREDE + 0.1, JANELA[1] - JANELA[0]), (math.cos(a) * (RAIO_SALA + PAREDE / 2),
                     math.sin(a) * (RAIO_SALA + PAREDE / 2), (JANELA[0] + JANELA[1]) / 2), 'ferroFarol', bevel=0.02,
                     segs=1, rot=(0, 0, a + math.pi / 2)))
    a0 = VAO_DA_PAREDE * passo
    p.append(anel_solido(RAIO_SALA, RAIO_SALA + PAREDE, JANELA[0], JANELA[1], 'paredeFarol', a0=a0, a1=a0 + passo))
    # Teto em cone com as vigas, e o respiro no alto.
    p.append(cone(RAIO_SALA + 0.7, 2.2, (0, 0, 3.5 + 1.1), 'farolVermelho', verts=24))
    for i in range(VAOS):
        a = i * passo + passo / 2
        pts = [(math.cos(a) * (RAIO_SALA - 0.1), math.sin(a) * (RAIO_SALA - 0.1), 3.45), (math.cos(a) * 0.3, math.sin(a) * 0.3, 5.3)]
        p.append(tube(pts, [0.07, 0.05], 'ferroFarolEscuro', seg=5))
    p.append(cyl(0.35, 0.5, (0, 0, 5.75), 'ferroFarol', verts=12))
    p.append(uvball(0.25, (0, 0, 6.1), 'ferroFarolEscuro', seg=10, ring=6))
    # Varanda de fora (a galeria do farol) com o guarda-corpo.
    p.append(anel_solido(RAIO_SALA + PAREDE, RAIO_SALA + 1.6, -0.18, 0.0, 'farolPedraClara', n=48))
    for i in range(32):
        a = 2 * math.pi * i / 32
        p.append(cyl(0.035, 1.0, (math.cos(a) * (RAIO_SALA + 1.5), math.sin(a) * (RAIO_SALA + 1.5), 0.5), 'ferroFarol', verts=5))
    p.append(torus(RAIO_SALA + 1.5, 0.05, (0, 0, 1.0), 'ferroFarol', seg=48, rseg=4))
    p.append(torus(RAIO_SALA + 1.5, 0.03, (0, 0, 0.55), 'ferroFarol', seg=48, rseg=3))
    # Tapete redondo debaixo da lanterna.
    p.append(cyl(1.7, 0.03, (0, 0, 0.015), 'tapete', verts=28))
    p.append(cyl(1.35, 0.035, (0, 0, 0.02), 'tapeteClaro', verts=28))
    return p


def vidros():
    p = []
    passo = 2 * math.pi / VAOS
    for i in range(VAOS):
        if i == VAO_DA_PAREDE:
            continue
        a = i * passo + passo / 2
        w = 2 * math.sin(passo / 2) * (RAIO_SALA + PAREDE / 2) - 0.25
        p.append(box((w, 0.04, JANELA[1] - JANELA[0] - 0.06), (math.cos(a) * (RAIO_SALA + PAREDE / 2),
                     math.sin(a) * (RAIO_SALA + PAREDE / 2), (JANELA[0] + JANELA[1]) / 2), 'janelaFarol', bevel=0.0,
                     rot=(0, 0, a + math.pi / 2)))
    return p


def escada():
    """Escada em caracol que sobe pelo vão: mastro, degraus em leque, corrimão e a grade em volta
    do vão no piso (aberta do lado em que se chega)."""
    ex, ey = ESCADA['x'], -ESCADA['z']
    p = [cyl(0.1, 3.4, (ex, ey, -1.6), 'ferroFarolEscuro', verts=10)]
    corrimao = []
    for k in range(12):
        z = -2.9 + k * 0.245
        a = -k * R(30) + R(200)
        cx, cy = ex + math.cos(a) * 0.5, ey + math.sin(a) * 0.5
        p.append(box((0.95, 0.42, 0.07), (cx, cy, z), 'pisoFarol', bevel=0.02, segs=1, rot=(0, 0, a)))
        fx, fy = ex + math.cos(a) * 0.95, ey + math.sin(a) * 0.95
        p.append(cyl(0.025, 0.8, (fx, fy, z + 0.4), 'ferroFarol', verts=5))
        corrimao.append((fx, fy, z + 0.8))
    p.append(tube(corrimao, [0.03] * len(corrimao), 'latao', seg=5))
    # O poço da escada (a parede que desce) e o andar de baixo.
    poco = anel_solido(ESCADA['r'] + 0.12, ESCADA['r'] + 0.3, -3.2, -0.2, 'paredeFarolSombra', n=24)
    poco.location = (ex, ey, 0)
    p.append(poco)
    p.append(cyl(ESCADA['r'] + 0.3, 0.1, (ex, ey, -3.2), 'pisoFarolEscuro', verts=24))
    # Grade em volta do vão, aberta de frente para o meio da sala (onde a escada termina).
    saida = math.atan2(-ey, -ex)
    pts = []
    for k in range(17):
        a = saida + R(30) + k * R(300) / 16
        x, y = ex + math.cos(a) * (ESCADA['r'] + 0.1), ey + math.sin(a) * (ESCADA['r'] + 0.1)
        if k % 2 == 0:
            p.append(cyl(0.03, 0.95, (x, y, 0.47), 'ferroFarol', verts=5))
        pts.append((x, y, 0.95))
    p.append(tube(pts, [0.035] * len(pts), 'latao', seg=5))
    return p


def lanterna():
    """A lanterna grande: pedestal, a lente de anéis de vidro em volta da lâmpada e a moldura de
    latão. Devolve (pedestal, lente que gira)."""
    pedestal = [cyl(0.55, 0.25, (0, 0, 0.13), 'ferroFarolEscuro', verts=16, bevel=0.04),
                cyl(0.28, 0.75, (0, 0, 0.62), 'ferroFarol', verts=12),
                cyl(0.6, 0.12, (0, 0, 1.03), 'latao', verts=16, bevel=0.03)]
    lente = [uvball(0.36, (0, 0, LAMPADA_Y), 'luz', seg=14, ring=9)]
    for k, (dz, r) in enumerate(((-0.6, 0.55), (-0.42, 0.66), (-0.22, 0.72), (0.0, 0.74), (0.22, 0.72), (0.42, 0.66),
                                 (0.6, 0.55))):
        lente.append(torus(r, 0.07, (0, 0, LAMPADA_Y + dz), 'lenteFarol', seg=24, rseg=5))
    for i in range(4):
        a = i * math.pi / 2
        pts = [(math.cos(a) * 0.6, math.sin(a) * 0.6, LAMPADA_Y - 0.72), (math.cos(a) * 0.8, math.sin(a) * 0.8, LAMPADA_Y),
               (math.cos(a) * 0.6, math.sin(a) * 0.6, LAMPADA_Y + 0.72)]
        lente.append(tube(pts, [0.035] * 3, 'latao', seg=5))
        # As lupas grandes (os "olhos" que fazem o facho), uma de cada lado.
        lente.append(cyl(0.34, 0.05, (math.cos(a) * 0.82, math.sin(a) * 0.82, LAMPADA_Y), 'lenteFarol', verts=16,
                         rot=(0, R(90), a)))
        lente.append(torus(0.34, 0.03, (math.cos(a) * 0.84, math.sin(a) * 0.84, LAMPADA_Y), 'latao', seg=16, rseg=3,
                           rot=(0, R(90), a)))
    lente.append(cyl(0.6, 0.08, (0, 0, LAMPADA_Y + 0.78), 'latao', verts=16))
    lente.append(cone(0.45, 0.4, (0, 0, LAMPADA_Y + 1.02), 'ferroFarol', verts=16))
    lente.append(uvball(0.1, (0, 0, LAMPADA_Y + 1.27), 'latao', seg=8, ring=5))
    return pedestal, lente


def mesa_da_iris():
    """Mesa da Íris de frente para −Y (encostada no vão sem janela): tampo com os rascunhos, a
    luminária, a caneca, o tinteiro, um farolzinho de papel, os rolos de desenho, o banquinho, o
    quadro de cortiça com o mapa do arquipélago e a estante baixa."""
    p = [box((2.0, 0.9, 0.08), (0, 0, 0.9), 'mesaFarol', bevel=0.03, segs=1)]
    for x in (-0.9, 0.9):
        for y in (-0.38, 0.38):
            p.append(box((0.08, 0.08, 0.88), (x, y, 0.44), 'mesaFarol', bevel=0.01, segs=1))
    p.append(box((1.8, 0.05, 0.4), (0, 0.38, 0.55), 'mesaFarol', bevel=0.01, segs=1))
    rnd = random.Random(9)
    for k in range(7):
        x, y = rnd.uniform(-0.8, 0.7), rnd.uniform(-0.3, 0.25)
        giro = rnd.uniform(-0.5, 0.5)
        m = 'papel' if k % 2 else 'papelVelho'
        p.append(box((0.42, 0.3, 0.005), (x, y, 0.945 + k * 0.004), m, bevel=0.0, rot=(0, 0, giro)))
        for j in range(3):
            c, s = math.cos(giro), math.sin(giro)
            dy = -0.08 + j * 0.07
            p.append(box((0.28, 0.015, 0.003), (x - s * dy, y + c * dy, 0.95 + k * 0.004), 'rabisco' if j else 'rabiscoVermelho',
                         bevel=0.0, rot=(0, 0, giro)))
    for k, (x, y) in enumerate(((0.75, 0.25), (0.62, 0.32))):
        p.append(cyl(0.05, 0.6, (x, y, 0.99), 'papelVelho', verts=8, rot=(0, R(90), R(15 * k))))
        p.append(torus(0.052, 0.012, (x, y, 0.99), 'fitaMapa' if 'fitaMapa' in lib_q.PALETTE else 'cachecol', seg=8, rseg=3,
                       rot=(0, R(90), R(15 * k))))
    p.append(cyl(0.07, 0.14, (-0.75, 0.22, 1.01), 'caneca', verts=10))
    p.append(torus(0.045, 0.012, (-0.68, 0.22, 1.02), 'caneca', seg=8, rseg=3, rot=(R(90), 0, 0)))
    p.append(cyl(0.05, 0.08, (0.35, 0.28, 0.98), 'black', verts=8))
    p.append(tube([(0.36, 0.28, 0.98), (0.42, 0.3, 1.18)], [0.006, 0.004], 'papel', seg=4))
    # Luminária de mesa (acende à noite) e o farolzinho de papel que a Íris montou.
    p += [cyl(0.1, 0.03, (-0.2, 0.3, 0.955), 'ferroFarol', verts=10),
          tube([(-0.2, 0.3, 0.97), (-0.25, 0.3, 1.35), (-0.05, 0.25, 1.45)], [0.015] * 3, 'ferroFarol', seg=5),
          cone(0.12, 0.14, (-0.02, 0.24, 1.43), 'ferroFarol', verts=10, rot=(R(160), 0, 0)),
          uvball(0.05, (-0.02, 0.24, 1.38), 'lanterna', seg=8, ring=5)]
    p += [cyl(0.06, 0.3, (0.25, -0.05, 1.09), 'papel', verts=8, r2=0.045),
          cyl(0.065, 0.02, (0.25, -0.05, 1.12), 'rabiscoVermelho', verts=8),
          cyl(0.065, 0.02, (0.25, -0.05, 1.04), 'rabiscoVermelho', verts=8),
          cone(0.06, 0.08, (0.25, -0.05, 1.29), 'rabiscoVermelho', verts=8)]
    # Banquinho.
    p.append(cyl(0.28, 0.06, (0.0, -0.75, 0.55), 'mesaFarol', verts=12))
    for i in range(3):
        a = i * 2 * math.pi / 3
        p.append(cyl(0.025, 0.55, (math.cos(a) * 0.18, -0.75 + math.sin(a) * 0.18, 0.27), 'mesaFarol', verts=5))
    # Quadro de cortiça na parede (atrás da mesa): rascunhos presos e o mapa do arquipélago.
    p.append(box((1.8, 0.05, 1.1), (0, 0.62, 1.95), 'cortica', bevel=0.02, segs=1))
    p.append(box((1.86, 0.06, 0.06), (0, 0.61, 2.52), 'mesaFarol', bevel=0.0))
    p.append(box((1.86, 0.06, 0.06), (0, 0.61, 1.38), 'mesaFarol', bevel=0.0))
    p.append(box((0.8, 0.01, 0.6), (-0.4, 0.59, 1.98), 'papelVelho', bevel=0.0))
    cores_ilhas = ['copa', 'cupulaRosa', 'lagoa', 'neve', 'rochaVulcao', 'nuvem']
    p.append(cyl(0.08, 0.01, (-0.4, 0.58, 1.98), 'farolVermelho', verts=10, rot=(R(90), 0, 0)))
    for k, m in enumerate(cores_ilhas):
        a = k * math.pi / 3
        p.append(cyl(0.06, 0.01, (-0.4 + math.cos(a) * 0.22, 0.58, 1.98 + math.sin(a) * 0.2), m, verts=10, rot=(R(90), 0, 0)))
    for k, (x, z, giro) in enumerate(((0.35, 2.2, 0.1), (0.62, 1.85, -0.12), (0.3, 1.65, 0.05))):
        p.append(box((0.3, 0.01, 0.36), (x, 0.59, z), 'papel', bevel=0.0, rot=(0, giro, 0)))
        p.append(box((0.2, 0.012, 0.02), (x, 0.585, z + 0.05), 'rabisco', bevel=0.0, rot=(0, giro, 0)))
        p.append(uvball(0.025, (x, 0.57, z + 0.16), 'rabiscoVermelho', seg=6, ring=4))
    # Estante baixa ao lado, com livros.
    p.append(box((0.9, 0.4, 0.9), (1.55, 0.25, 0.45), 'mesaFarol', bevel=0.02, segs=1))
    for k in range(5):
        p.append(box((0.12, 0.3, 0.32 + 0.04 * (k % 2)), (1.25 + k * 0.14, 0.22, 1.08), ('livro1', 'livro2', 'livro3')[k % 3],
                     bevel=0.01, segs=1))
    return p


def colisores(mesa_x, mesa_z, giro_mesa):
    """As formas de colisão da sala (veja o topo). `mesa_*` é o meio da mesa no jogo."""
    c = [col_cilindro('piso-sala', RAIO_SALA + 0.15, 0.2, (0, 0, -0.1))]
    for i in range(16):
        a = i * math.pi / 8
        r = RAIO_SALA + 0.15
        c.append(col_caixa('parede-sala', (1.8, 0.3, 3.5), (math.cos(a) * r, math.sin(a) * r, 1.75), rot=(0, 0, a + math.pi / 2)))
    ex, ey = ESCADA['x'], -ESCADA['z']
    c.append(col_cilindro('grade-escada', ESCADA['r'] + 0.12, 1.0, (ex, ey, 0.5)))
    # A mesa (2 m) e a estante ao lado (até 2,05 m do meio da mesa), com os livros por cima.
    dx = 0.5
    cg, sg = math.cos(giro_mesa), math.sin(giro_mesa)
    c.append(col_caixa('mesa-iris', (3.1, 1.0, 1.3), (mesa_x + dx * cg, -mesa_z + dx * sg, 0.65), rot=(0, 0, giro_mesa)))
    altura_da_lente = LAMPADA_Y + 1.3
    c.append(col_cilindro('base-lente', RAIO_DA_LENTE, altura_da_lente, (0, 0, altura_da_lente / 2)))
    return c


def ilha():
    lib_q.reset()
    s = sala()
    v = vidros()
    e = escada()
    pedestal, lente = lanterna()
    m = mesa_da_iris()
    # A mesa encosta no vão sem janela.
    a = VAO_DA_PAREDE * 2 * math.pi / VAOS + math.pi / VAOS
    r = RAIO_SALA - 0.95
    colocar(m, math.cos(a) * r, -math.sin(a) * r, a - math.pi / 2)
    ancoras = [ancora('entrada', ESCADA['x'] + 1.45, ESCADA['z'] - 0.45, 0.0),
               ancora('lanterna', 0.0, 0.0, LAMPADA_Y),
               ancora('mesa', math.cos(a) * (r - 1.1), -math.sin(a) * (r - 1.1), 0.0),
               ancora('rascunhos', math.cos(a) * r, -math.sin(a) * r, 0.95),
               ancora('quadro', math.cos(a) * (RAIO_SALA - 0.35), -math.sin(a) * (RAIO_SALA - 0.35), 1.95),
               ancora('janela', math.cos(R(-22.5)) * (RAIO_SALA - 0.6), -math.sin(R(-22.5)) * (RAIO_SALA - 0.6), 0.0),
               ancora('varanda', RAIO_SALA + 1.0, 0.0, 0.0),
               ancora('chegada', CHEGADA[0], CHEGADA[1], 0.0),
               ancora('leitura', math.cos(a) * (r - 1.1), -math.sin(a) * (r - 1.1), 0.0)]
    # De frente para o mar (o +z do three, o −Y do Blender, virado para o +x).
    camera = ancora('camera-varanda', RAIO_SALA + 1.0, 0.0, 0.0)
    camera.rotation_euler = (0, 0, math.pi / 2)
    ancoras.append(camera)
    col = colisores(math.cos(a) * r, -math.sin(a) * r, a - math.pi / 2)

    def clipes(juntos):
        o = juntos['lente']
        return {'girar': {o: {'rotation_euler': [(1, (0, 0, 0)), (97, (0, 0, 2 * math.pi))], '_linear': True}}}

    # Nós e âncoras com nomes diferentes (o three.js renomeia nomes repetidos).
    exportar('alto-do-farol', {'sala': s + pedestal, 'escada': e, 'mesa-da-iris': m, 'vidros': v,
                               'lente': (lente, (0, 0, LAMPADA_Y))}, ancoras, clipes_=clipes, colisores=col)


if __name__ == '__main__':
    ilha()
