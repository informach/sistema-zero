"""O regador, a flor da missão (com o clipe `florescer`) e a pedra do quiz.

Medidas: as do jogo de antes, para o projeto, o quiz e as regras continuarem iguais. O regador
tem ~1,9 de comprimento (do cabo ao chuveiro, em x), ~1,05 de altura e o bico para a direita,
como no desenho 2D; a flor fica de pé com a base no chão, ~1,4 de altura com o botão fechado.

A flor: em repouso é um botão fechado. `florescer` (1,5 s, "uma vez") incha o botão, abre as dez
pétalas em duas camadas com um pequeno passo além do ponto (e volta), cresce o miolo e solta
cinco brilhos que sobem e somem; a pose final fica aberta. As pétalas, o miolo e os brilhos levam
`szSemCaixa`: a área de toque é a do caule e das folhas, a mesma aberta ou fechada.
"""
from jardim_lib import *
from mathutils import Quaternion


# ---------------------------------------------------------------- regador

def _torno(perfil, m, seg=36, oval=1.0, nome='torno'):
    """Sólido de revolução em volta do eixo z pelo `perfil` [(raio, z), ...] de baixo para cima;
    `oval` achata em y. Fecha embaixo e em cima quando o raio da ponta é 0."""
    bm = bmesh.new()
    aneis = []
    for r, z in perfil:
        if r <= 1e-6:
            aneis.append([bm.verts.new((0, 0, z))])
            continue
        aneis.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), oval * r * math.sin(2 * math.pi * i / seg), z))
                      for i in range(seg)])
    for a, b in zip(aneis, aneis[1:]):
        if len(a) == 1:
            for i in range(seg):
                bm.faces.new((a[0], b[(i + 1) % seg], b[i]))
        elif len(b) == 1:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[0]))
        else:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_de(nome, bm, m if not isinstance(m, str) else mat(m))


def _cor_regador(p, n):
    """O azul do regador: mais escuro embaixo e na sombra, mais claro no ombro."""
    base, meio, claro = hexlin('#2f8ca6'), hexlin('#4fb2c8'), hexlin('#7ccfdd')
    t = suave(0.02, 0.85, p.z)
    c = mistura(base, meio, suave(0.0, 0.45, t))
    c = mistura(c, claro, suave(0.55, 1.0, t) * (0.5 + 0.5 * max(0.0, n.z)))
    return c


def regador_azul():
    reset()
    corpo_m = mat_vc('regador-corpo', 0.32)
    p = []
    # Corpo: um balde arredondado, a base com um friso e o ombro que fecha no gargalo.
    perfil = [(0.0, 0.0), (0.33, 0.0), (0.385, 0.012), (0.405, 0.04), (0.402, 0.075), (0.395, 0.09),
              (0.41, 0.11), (0.44, 0.2), (0.455, 0.33), (0.45, 0.47), (0.43, 0.6), (0.395, 0.69),
              (0.34, 0.76), (0.275, 0.805), (0.215, 0.83), (0.19, 0.845), (0.19, 0.865)]
    corpo = _torno(perfil, corpo_m, seg=40, oval=0.88, nome='corpo')
    pintar(corpo, _cor_regador)
    p.append(corpo)
    # A boca: aro claro e o fundo escuro lá dentro.
    aro = torus(0.192, 0.026, (0, 0, 0.866), 'j/regadorClaro', seg=32, rseg=10)
    aro.scale.y = 0.88
    p.append(aro)
    boca = cyl(0.178, 0.01, (0, 0, 0.84), 'j/regadorMiolo', verts=28)
    boca.scale.y = 0.88
    p.append(boca)
    # Friso claro no pé e uma faixa no meio do corpo (como no 2D).
    for z, rr, t in ((0.092, 0.398, 0.016), (0.205, 0.443, 0.012)):
        o = torus(rr, t, (0, 0, z), 'j/regadorFaixa' if z > 0.15 else 'j/regadorClaro', seg=40, rseg=6)
        o.scale.y = 0.88
        p.append(o)
    # Cabo de trás, em alça, e o cabo de cima, por cima da boca.
    tras = [(-0.36, 0, 0.66), (-0.56, 0, 0.76), (-0.72, 0, 0.62), (-0.74, 0, 0.42), (-0.62, 0, 0.26), (-0.42, 0, 0.21)]
    p.append(tubo_suave(tras, [0.05, 0.047, 0.045, 0.045, 0.047, 0.05], 'j/regadorEscuro', seg=14))
    cima = [(-0.3, 0, 0.74), (-0.24, 0, 0.93), (-0.06, 0, 1.02), (0.12, 0, 0.99), (0.24, 0, 0.84)]
    p.append(tubo_suave(cima, [0.038, 0.034, 0.032, 0.034, 0.038], 'j/regadorEscuro', seg=12))
    # O bico: sai de baixo, na frente, e sobe; o chuveiro abre na ponta, com os furinhos.
    bico = [(0.3, 0, 0.2), (0.5, 0, 0.3), (0.68, 0, 0.45), (0.84, 0, 0.62), (0.95, 0, 0.75)]
    p.append(trocar_mat(tubo_suave(bico, [0.085, 0.07, 0.06, 0.054, 0.05], 'j/regadorEscuro', seg=16), corpo_m))
    pintar(p[-1], _cor_regador)
    p.append(tubo_suave([(0.36, 0, 0.62), (0.52, 0, 0.56), (0.66, 0, 0.47)], [0.022, 0.02, 0.022], 'j/regadorEscuro', seg=8))
    d = Vector((0.95 - 0.84, 0, 0.75 - 0.62)).normalized()
    chuveiro = _torno([(0.0, 0.0), (0.06, 0.0), (0.075, 0.04), (0.13, 0.1), (0.165, 0.135), (0.17, 0.15), (0.0, 0.155)],
                      'j/regadorEscuro', seg=24, nome='chuveiro')
    rosto = cyl(0.152, 0.012, (0, 0, 0), 'j/regadorClaro', verts=24)
    rosto.data.transform(Matrix.Translation((0, 0, 0.157)))
    furos = []
    bm = bmesh.new()
    for anel_, k in ((0.0, 1), (0.055, 6), (0.105, 11)):
        for i in range(k):
            a = 2 * math.pi * i / k
            bmesh.ops.create_circle(bm, cap_ends=True, segments=6, radius=0.012,
                                    matrix=Matrix.Translation((anel_ * math.cos(a), anel_ * math.sin(a), 0.1645)))
    furo = obj_de('furos', bm, mat('j/regadorFuro'), liso=False)
    for o in (chuveiro, rosto, furo):
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
        o.location = Vector((0.93, 0, 0.725))
        p.append(o)
    # O enfeite na frente (o lado da câmera): uma florzinha pintada, como num regador de lata,
    # colada na curva do corpo.
    bm = bmesh.new()
    florzinha(bm, (0.03, -0.4, 0.4), (0, -1, 0), 0.12, giro=0.3, copa=0.0, res=10)

    def raio_em(z):
        for (r0, z0), (r1, z1) in zip(perfil, perfil[1:]):
            if z0 <= z <= z1 and z1 > z0:
                return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
        return perfil[-1][0]
    for v in bm.verts:
        r = raio_em(v.co.z)
        ry = 0.88 * r
        x = v.co.x
        extra = -0.4 - v.co.y  # o quanto o vértice estava à frente do plano (o miolo é mais alto)
        v.co.y = -(ry * math.sqrt(max(0.0, 1 - (x / r) ** 2)) + 0.004 + max(0.0, extra) * 0.5)
    fl = obj_de('enfeite', bm, mat('j/branca'))
    fl.data.materials.append(mat('j/amarela'))
    for i, poly in enumerate(fl.data.polygons):
        if i >= 50:
            poly.material_index = 1
    p.append(fl)
    # Dois materiais: o corpo brilhante (a lata pintada) e o resto, fosco; cor nos vértices.
    assar_cores([o for o in p if corpo_m not in list(o.data.materials)], mat_vc('regador-cor', 0.45, dupla=True))
    exportar_estatico('regador-azul', p)


# ---------------------------------------------------------------- flor

FLOR_CORES = dict(base=hexlin('#f9d9a8'), meio=hexlin('#ec8ea2'), ponta=hexlin('#df5f82'),
                  dentroBase=hexlin('#fde6b8'), dentroMeio=hexlin('#f3a7b6'), dentroPonta=hexlin('#e77591'))


def _petala(nome, yaw, inclina, comp, larg, copa, m, cores, giro_base=0.06, n=14, k=8):
    """Pétala em concha (o lado côncavo virado para o meio da flor), com a base no miolo.

    A malha já sai na pose FECHADA (girada para fora do eixo pelo `yaw` e inclinada `inclina`
    para dentro), com a origem do objeto na base: o clipe só gira o objeto em volta da tangente."""
    bm = bmesh.new()
    rows = []
    for i in range(n):
        t = i / n
        # Largura: estreita na base, mais larga depois do meio e arredondada na ponta.
        if t < 0.6:
            w = larg * (0.22 + 0.78 * math.sin(math.pi / 2 * t / 0.6) ** 0.9)
        else:
            w = larg * math.sqrt(max(0.0, 1 - ((t - 0.6) / 0.42) ** 2))
        w = max(w, larg * 0.08)
        row = []
        for j in range(k + 1):
            u = -1 + 2 * j / k
            # Concha: as beiras se curvam para o meio da flor (-y local) e a ponta para fora (+y).
            y = -copa * (u * u) * w / larg + 0.16 * comp * t * t
            row.append(bm.verts.new((u * w, y, comp * t)))
        rows.append(row)
    ponta = bm.verts.new((0, 0.16 * comp, comp))
    for i in range(n - 1):
        for j in range(k):
            bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
    for j in range(k):
        bm.faces.new((rows[-1][j], rows[-1][j + 1], ponta))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    # Pose fechada: inclina para dentro (em volta do x local) e gira para o yaw.
    M = Matrix.Rotation(yaw - math.pi / 2, 4, 'Z') @ Matrix.Rotation(inclina, 4, 'X')
    for v in bm.verts:
        v.co = M @ v.co
    o = obj_de(nome, bm, m)
    # Cor: clara na base, rosa no meio e mais funda na ponta.
    def cor_(p, nn):
        t = suave(0.0, comp, p.length)
        c = mistura(cores[0], cores[1], suave(0.02, 0.32, t))
        return mistura(c, cores[2], suave(0.55, 1.0, t))
    pintar(o, cor_)
    return o


def _abre(yaw, ang):
    """Quaternion que abre a pétala `ang` radianos para fora, em volta da tangente do yaw."""
    return Quaternion((-math.sin(yaw), math.cos(yaw), 0), ang)


def flor_do_jardim():
    reset()
    p, animados = [], []
    caule_m = mat_vc('flor-verde', 0.75)
    verde_esc, verde, verde_cl = hexlin('#3f7a4d'), hexlin('#5c9d60'), hexlin('#8cc27a')

    def cor_verde(pp, n):
        t = suave(0.0, 1.05, pp.z)
        c = mistura(verde_esc, verde, suave(0.0, 0.6, t))
        return mistura(c, verde_cl, 0.45 * max(0.0, n.z) * suave(0.2, 1.0, t))
    TOPO = 1.03
    # Caule com uma curva suave, as folhas do pé (roseta) e duas folhas no caule.
    caule = trocar_mat(tubo_suave([(0, 0, -0.02), (0.025, 0, 0.3), (-0.02, 0, 0.62), (0.0, 0, 0.88), (0, 0, TOPO)],
                 [0.05, 0.045, 0.04, 0.037, 0.035], 'j/sepala', seg=10, por_trecho=5), caule_m)
    pintar(caule, cor_verde)
    p.append(caule)
    folha_m = mat_vc('flor-folha', 0.75, dupla=True)
    for k, (yaw, L, W, z) in enumerate(((R(25), 0.4, 0.13, 0.01), (R(145), 0.36, 0.12, 0.01), (R(260), 0.38, 0.12, 0.01),
                                        (R(0), 0.44, 0.15, 0.33), (R(180), 0.4, 0.14, 0.56))):
        o = leaf((0.0, 0.0, z), yaw, L, W, 'j/sepala', lift=0.16 if z > 0.1 else 0.07, droop=0.2 if z > 0.1 else 0.12, fold=0.45, n=12)
        o.data.materials.clear()
        o.data.materials.append(folha_m)
        pintar(o, lambda pp, n, z=z: mistura(verde, verde_cl, 0.25 + 0.5 * suave(0.0, 0.4, math.hypot(pp.x, pp.y))))
        p.append(o)
    # O receptáculo e as sépalas (paradas: entram na área de toque).
    p.append(sphere(0.075, (0, 0, TOPO), 'j/sepala', scale=(1, 1, 0.75), subdiv=2))
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.3
        o = leaf((math.cos(a) * 0.04, math.sin(a) * 0.04, TOPO - 0.01), a, 0.14, 0.05, 'j/sepala', lift=0.02, droop=0.06, fold=0.3, n=6)
        p.append(o)
    # Pétalas: cinco de fora e cinco de dentro, desencontradas.
    pet_m = mat_vc('flor-petala', 0.6, dupla=True)
    fora = (FLOR_CORES['base'], FLOR_CORES['meio'], FLOR_CORES['ponta'])
    dentro = (FLOR_CORES['dentroBase'], FLOR_CORES['dentroMeio'], FLOR_CORES['dentroPonta'])
    petalas = []
    for camada, (nq, comp, larg, inc, abre, r0, cores) in enumerate(((5, 0.37, 0.23, R(14), R(96), 0.05, fora),
                                                                       (5, 0.3, 0.19, R(22), R(58), 0.03, dentro))):
        for k in range(nq):
            yaw = 2 * math.pi * k / nq + (math.pi / nq if camada else 0.0)
            o = _petala(f'petala-{camada}-{k}', yaw, inc, comp, larg, 0.11 if camada == 0 else 0.09, pet_m, cores)
            o.location = (math.cos(yaw) * r0, math.sin(yaw) * r0, TOPO + 0.02 + 0.01 * camada)
            o.rotation_mode = 'QUATERNION'
            o['szSemCaixa'] = True
            petalas.append((o, yaw, abre, camada))
            p.append(o)
    # Miolo: domo amarelo com estames laranja; escondido no botão, cresce quando abre.
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * 0.12, v.co.y * 0.12, max(v.co.z, -0.2) * 0.06))
    mio = obj_de('miolo', bm, mat('j/miolo'))
    bm = bmesh.new()
    for i in range(12):
        a = 2 * math.pi * i / 12
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.018,
                                   matrix=Matrix.Translation((math.cos(a) * 0.085, math.sin(a) * 0.085, 0.035)))
    est = obj_de('estames', bm, mat('j/mioloLaranja'))
    miolo = join([mio, est], 'miolo')
    miolo.location = (0, 0, TOPO + 0.05)
    miolo.scale = (0.3, 0.3, 0.3)
    miolo['szSemCaixa'] = True
    p.append(miolo)
    # Brilhos: estrelinhas de quatro pontas que sobem e somem quando a flor abre.
    brilhos = []
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.4
        bm = bmesh.new()
        c = bm.verts.new((0, 0, 0))
        pts = []
        for i in range(8):
            ang = 2 * math.pi * i / 8
            r = 0.06 if i % 2 == 0 else 0.018
            pts.append(bm.verts.new((r * math.cos(ang), 0, r * math.sin(ang))))
        for i in range(8):
            bm.faces.new((c, pts[i], pts[(i + 1) % 8]))
        o = obj_de(f'brilho-{k}', bm, mat('j/brilho'), liso=False)
        o.data.materials[0].use_backface_culling = False
        o.location = (math.cos(a) * 0.32, math.sin(a) * 0.32, TOPO + 0.15)
        o.scale = (0.0, 0.0, 0.0)
        o['szSemCaixa'] = True
        brilhos.append((o, a, k))
        p.append(o)
    # As partes paradas viram uma malha só (o caule com as folhas e as sépalas).
    paradas = [o for o in p if o not in [x for x, *_ in petalas] and o is not miolo and o not in [b for b, *_ in brilhos]]
    base = join(paradas, 'caule')
    # 20% maior que o desenho: na prévia estreita a flor precisa ler de longe. Escala na malha e
    # na posição (a rotação das pétalas não muda), antes de gravar as chaves.
    K = 1.2
    for o in [base, miolo] + [x for x, *_ in petalas] + [b for b, *_ in brilhos]:
        o.data.transform(Matrix.Scale(K, 4))
        o.location = o.location * K
    # O clipe (24 quadros por segundo): incha (0-6), abre além do ponto (6-24), volta (24-32).
    fps = 24
    chaves = {}
    for o, yaw, abre, camada in petalas:
        atraso = 2 if camada else 0
        q0 = Quaternion()
        chaves[o] = {
            'rotation_quaternion': [(0, q0), (5 + atraso, _abre(yaw, R(-4))), (22 + atraso, _abre(yaw, abre * 1.09)),
                                    (30 + atraso, _abre(yaw, abre * 0.97)), (36, _abre(yaw, abre))],
            # Cresce ao abrir: o botão fica pequeno e a flor aberta bem mais larga.
            'scale': [(0, Vector((1, 1, 1))), (5, Vector((1.05, 1.05, 1.05))), (22, Vector((1.2, 1.2, 1.2))), (36, Vector((1.16, 1.16, 1.16)))],
        }
    chaves[miolo] = {'scale': [(0, Vector((0.3, 0.3, 0.3))), (10, Vector((0.3, 0.3, 0.3))), (24, Vector((1.1, 1.1, 1.1))), (32, Vector((1, 1, 1))), (36, Vector((1, 1, 1)))]}
    for o, a, k in brilhos:
        ini = 14 + k * 2
        x0, y0, z0 = o.location
        chaves[o] = {
            'scale': [(0, Vector((0, 0, 0))), (ini, Vector((0, 0, 0))), (ini + 5, Vector((1.2, 1.2, 1.2))), (ini + 14, Vector((0, 0, 0))), (36, Vector((0, 0, 0)))],
            'location': [(0, Vector((x0, y0, z0))), (ini, Vector((x0, y0, z0))), (ini + 14, Vector((x0 * 1.35, y0 * 1.35, z0 + 0.45))), (36, Vector((x0 * 1.35, y0 * 1.35, z0 + 0.45)))],
        }
    # A pose de repouso tem de ser a do botão fechado: volta tudo para o quadro 0 antes de exportar.
    repouso = {o: (o.location.copy(), o.scale.copy()) for o in chaves}
    clipes({'florescer': chaves}, fps=fps)
    for o, (l, s) in repouso.items():
        o.location, o.scale = l, s
        o.rotation_quaternion = Quaternion()
    # Brilhos e miolo: a posição de repouso dos brilhos é a do início (escondidos, escala 0).
    # Um material para as partes verdes e o miolo, o das pétalas e o do brilho (que tem emissão).
    assar_cores([base, miolo], mat_vc('flor-cor', 0.75, dupla=True))
    exportar_animado('flor-do-jardim', [base, miolo] + [o for o, *_ in petalas] + [o for o, *_ in brilhos])


# ---------------------------------------------------------------- pedra do quiz

def pedra_do_jardim():
    """A pedra que esconde parte do regador na pergunta do ponto de vista (o quiz a põe na frente
    dele): um bloco lapidado, duas pedrinhas no pé, musgo no tampo e tufos de capim."""
    reset()
    p = []
    p.append(rock((0, 0, -0.05), (2.5, 1.45, 1.55), 'j/pedra', seed=12, subdiv=2, rough=0.16, flat_top=0.18, top_m='j/pedraTopo'))
    p.append(rock((1.05, -0.45, -0.03), (0.7, 0.55, 0.45), 'j/pedraClara', seed=13, subdiv=1, rough=0.2, top_m='j/pedraTopo'))
    p.append(rock((-1.1, -0.35, -0.03), (0.55, 0.45, 0.35), 'j/pedra', seed=14, subdiv=1, rough=0.2, top_m='j/pedraTopo'))
    bm = bmesh.new()
    bolota(bm, (-0.35, 0.05, 1.32), 0.32, (1.5, 1.0, 0.35), 15, amp=0.1)
    o = obj_de('musgo', bm, mat_vc('jardim-folhagem', 0.86))
    pintar(o, lambda pp, n: mistura(hexlin('#5d955a'), hexlin('#93c378'), max(0.0, n.z)))
    p.append(o)
    rnd = random.Random(16)
    for x, y in ((-1.25, -0.6), (0.7, -0.75), (1.45, -0.1), (-0.2, -0.78)):
        for i in range(5):
            yaw = rnd.uniform(0, 2 * math.pi)
            p.append(leaf((x + rnd.uniform(-0.05, 0.05), y, 0.0), yaw, rnd.uniform(0.14, 0.22), 0.04, ('j/tufo', 'j/tufoClaro')[i % 2],
                          lift=rnd.uniform(0.24, 0.34), droop=0.08, fold=0.25, n=5))
    assar_cores(p, mat_vc('pedra-cor', 0.88, dupla=True))
    exportar_estatico('pedra-do-jardim', p)


lib_q.PALETTE.update({'j/tufo': ('#7fb36a', 0.9, None, 0), 'j/tufoClaro': ('#9cc97f', 0.9, None, 0)})

TODOS = ['regador-azul', 'flor-do-jardim', 'pedra-do-jardim']
