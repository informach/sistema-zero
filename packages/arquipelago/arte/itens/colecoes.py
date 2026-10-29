"""As coleções de cada ilha: o que a criança acha, pesca e guarda no diário.

Um nó por arquivo, com o nome do arquivo e a base na origem.

- Conchas da praia (a sua ilha): concha-caracol · concha-vieira · concha-tigre · concha-mexilhao ·
  concha-listrada · estrela-do-mar
- Peixes da praia (a sua ilha, de pescar): peixe-sardinha · peixe-robalo · peixe-garoupa ·
  peixe-linguado · peixe-voador
- Notas musicais (Pico Gelado): nota-seminima · nota-colcheia · nota-dupla · nota-clave-de-sol
- Cristais (Pico Gelado): cristal-azul (ponta de gelo) · cristal-rosa (pedra lapidada) ·
  cristal-roxo (ametista na pedra) · cristal-verde (geodo partido com os cristais por dentro)
- Estrelas caídas do céu (Ilha das Nuvens): estrela-cadente · estrela-sorriso · estrela-cintilante ·
  estrela-trio

As notas e as estrelas têm a frente e as costas com o material `luz` (o jogo regula o brilho, como
na lanterna) e o contorno de outra cor, para cada uma ter a sua. Os cristais têm um brilho fraco
na própria cor.
"""
import random

from lib_extra import *

lib_q.PALETTE.update({
    # conchas
    'conchaCreme': ('#fbe8d0', 0.45, None, 0),
    'conchaLaranja': ('#f2a35e', 0.45, None, 0),
    'conchaMarrom': ('#c27a45', 0.45, None, 0),
    'conchaMiolo': ('#ffc9c0', 0.35, None, 0),
    'vieira': ('#ff9e8f', 0.5, None, 0),
    'vieiraClara': ('#ffd0c4', 0.5, None, 0),
    'tigre': ('#f6e6c8', 0.1, None, 0),
    'tigreDorso': ('#d99a52', 0.1, None, 0),
    'tigrePinta': ('#5a3420', 0.1, None, 0),
    'tigrePintaClara': ('#8a5530', 0.1, None, 0),
    'tigreBoca': ('#fff6e6', 0.15, None, 0),
    'tigreFenda': ('#b5875a', 0.3, None, 0),
    'conchaJunta': ('#b77a93', 0.6, None, 0),
    'conchaBico': ('#c9a3e8', 0.45, None, 0),
    'mexilhao': ('#33407e', 0.3, None, 0),
    'mexilhaoClaro': ('#4a5aa2', 0.3, None, 0),
    'nacar': ('#e6e0f7', 0.2, None, 0),
    'listraRosa': ('#ff9fb4', 0.45, None, 0),
    'listraLilas': ('#b9a0ea', 0.45, None, 0),
    'listraBranca': ('#fff7f0', 0.45, None, 0),
    'listraRosaVale': ('#ef7f9b', 0.45, None, 0),
    'listraLilasVale': ('#9b82d6', 0.45, None, 0),
    'listraBrancaVale': ('#ecdcd8', 0.45, None, 0),
    'estrelaMar': ('#f6774a', 0.6, None, 0),
    'estrelaMarPinta': ('#ffd7b0', 0.6, None, 0),
    # peixes
    'prata': ('#eef3f7', 0.35, None, 0),
    'sardinha': ('#9cc0e2', 0.35, None, 0),
    'sardinhaCostas': ('#3b6db5', 0.35, None, 0),
    'sardinhaPinta': ('#28406e', 0.4, None, 0),
    'barbatanaSardinha': ('#7fa8d6', 0.5, None, 0),
    'robalo': ('#c3d2bd', 0.4, None, 0),
    'robaloCostas': ('#5c7d68', 0.4, None, 0),
    'robaloLinha': ('#2f3a36', 0.5, None, 0),
    'barbatanaRobalo': ('#8faa94', 0.5, None, 0),
    'garoupa': ('#e0613f', 0.5, None, 0),
    'garoupaCostas': ('#b5432e', 0.5, None, 0),
    'garoupaPinta': ('#ffe0b8', 0.5, None, 0),
    'garoupaBarriga': ('#ffb08a', 0.5, None, 0),
    'barbatanaGaroupa': ('#f08a52', 0.5, None, 0),
    'linguado': ('#b3b98e', 0.6, None, 0),
    'linguadoPinta': ('#6f7d5a', 0.6, None, 0),
    'linguadoBorda': ('#d9c48a', 0.6, None, 0),
    'linguadoClaro': ('#eef0d6', 0.6, None, 0),
    'linguadoRaio': ('#b9a46a', 0.6, None, 0),
    'voador': ('#79b4ea', 0.35, None, 0),
    'voadorCostas': ('#2c5fb0', 0.35, None, 0),
    'asaVoador': ('#b9e3fa', 0.4, None, 0),
    'asaVoadorRaio': ('#6fb0e6', 0.4, None, 0),
    'boca': ('#3b261a', 0.6, None, 0),
    # notas e estrelas (o miolo é `luz`)
    'notaAzul': ('#6fb8f0', 0.4, '#6fb8f0', 0.35),
    'notaLilas': ('#b69cf0', 0.4, '#b69cf0', 0.35),
    'notaRosa': ('#ff94c2', 0.4, '#ff94c2', 0.35),
    'notaVerde': ('#5fd8bb', 0.4, '#5fd8bb', 0.35),
    'estrelaBorda': ('#ffbf3a', 0.4, '#ffbf3a', 0.4),
    'estrelaBordaRosa': ('#ff9cc4', 0.4, '#ff9cc4', 0.4),
    'estrelaBordaLilas': ('#b9a3ff', 0.4, '#b9a3ff', 0.4),
    'estrelaBordaAzul': ('#7cc8ff', 0.4, '#7cc8ff', 0.4),
    'rastroRosa': ('#ff9cc4', 0.5, '#ff9cc4', 0.3),
    'rastroAmarelo': ('#ffd86a', 0.5, '#ffd86a', 0.3),
    'rastroAzul': ('#8fd0ff', 0.5, '#8fd0ff', 0.3),
    # cristais: a cor e um tom mais claro nas faces de cima, com brilho fraco
    'cristalAzul': ('#6cc9f2', 0.15, '#6cc9f2', 0.25),
    'cristalAzulClaro': ('#bdeeff', 0.15, '#bdeeff', 0.25),
    'cristalRosa': ('#ff86b8', 0.15, '#ff86b8', 0.25),
    'cristalRosaClaro': ('#ffb6d5', 0.15, '#ffb6d5', 0.25),
    'cristalRoxo': ('#9d70de', 0.15, '#9d70de', 0.25),
    'cristalRoxoClaro': ('#d2b6fa', 0.15, '#d2b6fa', 0.25),
    'cristalVerde': ('#45cf9c', 0.15, '#45cf9c', 0.25),
    'cristalVerdeClaro': ('#aef5d8', 0.15, '#aef5d8', 0.25),
    'pedraCinza': ('#9a98a8', 0.85, None, 0),
    'pedraCinzaClara': ('#bab8c6', 0.85, None, 0),
    'pedraEscura': ('#5f5c6e', 0.85, None, 0),
    'geodoCasca': ('#8d8578', 0.95, None, 0),
    'geodoCascaEscura': ('#6f685e', 0.95, None, 0),
    'geodoBorda': ('#e9e4dc', 0.7, None, 0),
    'geodoDentro': ('#3f4a52', 0.8, None, 0),
    'geodoCristal': ('#22c98a', 0.1, '#22c98a', 0.3),
    'geodoCristalClaro': ('#8ef2c6', 0.1, '#8ef2c6', 0.3),
    'neve': ('#f7fbff', 0.8, None, 0),
    'neveSombra': ('#dfe9f5', 0.8, None, 0),
})


# =================================================================== conchas
def concha_caracol():
    """Caracol do mar: espiral em cone, com faixas e a boca rosada virada para a frente."""
    n, voltas = 42, 3.0
    fim = R(-150)
    pts, raios = [], []
    for i in range(n + 1):
        t = i / n
        phi = fim - voltas * 2 * math.pi * (1 - t)
        rh = 0.002 + 0.024 * t
        pts.append((rh * math.cos(phi), rh * math.sin(phi), 0.08 * (1 - t ** 1.5)))
        raios.append(0.005 + 0.024 * t)
    seg = 12
    o = tube(pts, raios, 'conchaCreme', seg=seg)
    o.data.materials.append(lib_q.mat('conchaLaranja'))
    o.data.materials.append(lib_q.mat('conchaMarrom'))
    o.data.materials.append(lib_q.mat('conchaMiolo'))
    bpy.context.view_layer.update()
    for pol in o.data.polygons:
        j = pol.index
        if j >= n * seg:
            pol.material_index = 3  # a boca
            pol.use_smooth = False
            continue
        # Faixas que acompanham a espiral, no lado de fora da volta: uma larga laranja e uma fina marrom.
        c, nn = pol.center, pol.normal
        rr = math.hypot(c.x, c.y) or 1.0
        fora = (nn.x * c.x + nn.y * c.y) / rr
        if fora > 0.8:
            pol.material_index = 1
        elif 0.25 < fora < 0.5 and nn.z > 0:
            pol.material_index = 2
    p = [o, esfera(raios[0], pts[0], 'conchaCreme', seg=10, aneis=6)]
    # A beirada da boca.
    a, b = Vector(pts[-2]), Vector(pts[-1])
    d = (b - a).normalized()
    beira = torus(raios[-1] * 0.98, 0.0035, tuple(b), 'conchaCreme', seg=20, rseg=6)
    beira.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
    p.append(beira)
    return p


def concha_vieira():
    """Vieira pequena: leque com gomos, as duas orelhinhas na dobradiça."""
    costelas = 9
    o = leque(0.055, 0.016, 'vieira', cy=0.7, abertura=58, costelas=costelas, costela_h=0.0045, nu=10, nv=36,
              espessura=0.004)
    tm = R(58)
    pintar_por(o, lambda c, n: 'vieiraClara' if n.z > 0 and
               math.cos(costelas * math.atan2(c.x, max(1e-6, c.y)) * math.pi / tm) > 0.35 else None)
    p = [o]
    for s in (-1, 1):
        orelha = prism([(0, 0), (s * 0.022, -0.004), (s * 0.02, 0.012), (0, 0.016)], 0.004, (0, 0, 0), 'vieira',
                       rot=(R(-90), 0, 0), bevel=0.0012)
        orelha.location = (0, 0.002, 0.011)
        orelha.rotation_euler = (R(-90 + 10), R(-s * 8), 0)
        p.append(orelha)
    lib_ilha.place(p, rot_z=math.pi)
    return p


def concha_tigre():
    """Concha-tigre, o cauri que chamam de búzio-tigre (o nome evita confundir com o Lumi Búzio):
    ovo liso e brilhante, abaulado em cima e chato embaixo, creme-dourado com pintas marrons.
    Inclinado para mostrar o dorso; a fenda de dentinhos aparece só na beirada."""
    A, B, C = 0.042, 0.027, 0.031
    o = esfera(1, (0, 0, 0), 'tigre', escala=(A, B, C), seg=22, aneis=12)

    def forma(v):
        t = v.x / A
        k = 1 - 0.2 * t * t
        z = v.z * (0.5 if v.z < 0 else 1.0)
        return Vector((v.x * (1 + 0.12 * t ** 4), v.y * k, z * k))
    deformar(o, forma)
    # Embaixo claro (a base dos dentes) e uma faixa mais clara no meio do dorso.
    # A base clara: o fundo chato, onde fica a fenda.
    # Dorso caramelo com a linha clara no meio, lados creme e o fundo branco (como o cauri de verdade).
    def cores(c, n):
        # Medido nos anéis e meridianos da esfera (antes de afinar as pontas): bordas lisas.
        k = 1 - 0.2 * (c.x / A) ** 2
        lat = c.z / (C * k)
        lon = math.degrees(math.atan2(c.y / (B * k), c.x / A))
        if lat < -0.2 * 0.5:
            return 'tigreBoca' if lat < -0.5 * 0.5 else None
        if lat > 0.12:
            return None if min(abs(lon), abs(abs(lon) - 180)) < 9 and lat > 0.6 else 'tigreDorso'
        return None
    pintar_por(o, cores)
    p = [o]
    rnd = random.Random(14)
    feitos = []
    for k in range(400):
        th = math.acos(rnd.uniform(0.12, 1.0))
        ph = rnd.uniform(0, 2 * math.pi)
        d = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
        grande = rnd.random() < 0.5
        r_ = rnd.uniform(0.0027, 0.0039) if grande else 0.0019
        origem = tuple(Vector((d.x * A, d.y * B, d.z * C)) * 4)
        pt, _ = na_superficie(o, origem, tuple(-d))
        # Cada pinta no seu lugar: nenhuma encosta na outra.
        if pt is None or any((pt - f).length < (r_ + fr) * 1.25 for f, fr in feitos):
            continue
        feitos.append((pt, r_))
        q = pinta(o, origem, tuple(-d), r_, 'tigrePinta' if grande else 'tigrePintaClara', achatar=0.25, seg=7, aneis=4)
        if q:
            p.append(q)
        if len(feitos) >= 46:
            break
    # A fenda embaixo, seguindo a curva da base, com os dentinhos claros dos dois lados.
    fenda = []
    for i in range(13):
        x = -0.034 + 0.068 * i / 12
        pt, _ = na_superficie(o, (x, 0, -0.2), (0, 0, 1))
        fenda.append((x, 0, pt.z - 0.0002))
    p.append(tube(fenda, [0.0012] + [0.0019] * 11 + [0.0012], 'tigreFenda', seg=6))
    for i in range(11):
        x = -0.029 + 0.058 * i / 10
        for s_ in (-1, 1):
            pt, nr = na_superficie(o, (x, s_ * 0.0034, -0.2), (0, 0, 1))
            d = esfera(0.0015, tuple(pt - nr * 0.0002), 'tigreBoca', escala=(0.6, 1.4, 0.5), seg=6, aneis=4)
            d.rotation_euler = Vector((0, 0, 1)).rotation_difference(nr).to_euler()
            p.append(d)
    # Inclinado de lado: o dorso pintado fica de frente e a fenda com os dentinhos espia na beirada de baixo.
    girar(p, (R(-18), R(-18), R(31)))
    return p


def _mexilhao(L=0.056, w=0.026, h=0.017):
    """Um mexilhão fechado, montado no torno em pé e depois deitado: as faixas de crescimento
    seguem os anéis e a beirada de nácar fica onde as duas valvas se encontram."""
    perfil = [(0, 0)]
    for i in range(1, 16):
        t = i / 16
        # Bico fino numa ponta e a outra larga e redonda (o desenho de D do mexilhão).
        r = 0.5 * (t / 0.62) ** 0.75 if t < 0.62 else 0.5 * math.sqrt(max(0.0, 1 - ((t - 0.62) / 0.38) ** 2))
        perfil.append((r, L * t))
    perfil.append((0, L))
    o = torneado(perfil, 'mexilhao', seg=22)
    deformar(o, lambda v: Vector((v.x * h, v.y * w + 0.007 * math.sin(math.pi * v.z / L), v.z)))

    def cores(c, n):
        ang = math.degrees(math.atan2(c.y / w, c.x / h))
        if abs(abs(ang) - 90) < 9 and 0.04 < c.z / L < 0.97:
            return 'nacar'
        t = c.z / L
        return 'mexilhaoClaro' if int(t * 16) % 4 == 1 and t > 0.25 else None
    pintar_por(o, cores)
    o.rotation_euler = (0, R(90), 0)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(rotation=True)
    deformar(o, lambda v: Vector((v.x - L / 2, v.y, v.z)))
    return o


def concha_mexilhao():
    """Dois mexilhões fechados, azul-escuro com as faixas de crescimento e a beirada de nácar."""
    # Lado a lado, os bicos juntinhos atrás e as pontas largas viradas para a frente.
    a = _mexilhao()
    a.rotation_euler = (R(-6), 0, R(-76))
    a.location = (0.017, 0.0, 0.0)
    b = _mexilhao(0.05, 0.024, 0.016)
    b.rotation_euler = (R(6), 0, R(-106))
    b.location = (-0.016, 0.002, 0.0)
    return [a, b]


def concha_listrada():
    """Conchinha listrada: uma valva de berbigão, com o bico (umbo) embaixo, as costelas abrindo em
    leque e a borda de cima ondulada. Cada costela tem uma cor (rosa, creme e lilás, alternando) e o
    lado de dentro, cor de nácar, espia na beirada. Fica deitada e levantada para a câmera."""
    raio, h, larg, costelas, esp = 0.04, 0.015, 1.12, 18, 0.003
    nr, por = 12, 4
    na = costelas * por
    U = Vector((0, -0.72 * raio))
    cores = ['listraRosa', 'listraBranca', 'listraLilas']

    def alcance(d):
        b = 2 * U.dot(d)
        c = U.dot(U) - raio * raio
        return (-b + math.sqrt(b * b - 4 * c)) / 2
    passo = 2 * math.pi / costelas
    verts, faces = [(U.x, U.y, h * 0.7)], []
    for k in range(1, nr + 1):
        u = 0.06 + 0.94 * (k - 1) / (nr - 1)
        for i in range(na):
            # As colunas começam num vale: cada costela fica inteira entre duas colunas de vale.
            ang = 2 * math.pi * i / na + passo / 2
            onda = math.cos(costelas * ang)
            # Costela de crista redonda e vale vincado.
            d = Vector((math.sin(ang), math.cos(ang)))
            # As costelas somem perto da dobradiça (embaixo do bico), que fica lisa.
            crista = math.sqrt(max(0.0, 0.5 + 0.5 * onda)) * min(1.0, max(0.0, (d.y + 0.35) / 0.45))
            q = U + d * alcance(d) * u * (1 + 0.025 * crista * u ** 3)
            if q.y < U.y:
                # Embaixo do bico a borda fica quase reta (a linha da dobradiça): contorno de leque.
                q = Vector((q.x, U.y + (q.y - U.y) * 0.3))
            z = h * (1 - u * u) ** 0.5 * (0.7 + 0.3 * min(1.0, u / 0.35)) + 0.0055 * u ** 0.6 * crista
            verts.append((q.x * larg, q.y, z))
    for i in range(na):
        faces.append((0, 1 + i, 1 + (i + 1) % na))
    for k in range(nr - 1):
        a0, a1 = 1 + k * na, 1 + (k + 1) * na
        for i in range(na):
            faces.append((a0 + i, a1 + i, a1 + (i + 1) % na, a0 + (i + 1) % na))
    o = malha('valva', verts, faces, cores[0])
    for m in cores[1:] + ['nacar']:
        o.data.materials.append(lib_q.mat(m))
    for pol in o.data.polygons:
        i = min(pol.vertices) if min(pol.vertices) > 0 else max(pol.vertices)
        col = (i - 1) % na
        pol.material_index = (col // por) % 3
    sol = o.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = esp
    sol.offset = -1
    lib_q._apply(o, sol)
    # Liso nas costelas (sem degraus de facetas), quina só na beirada.
    lib_q.smooth(o)
    o.data.set_sharp_from_angle(angle=R(38))
    # O lado de dentro (côncavo) e a beirada em nácar claro.
    pintar_por(o, lambda c, n: 'nacar' if n.z < -0.2 or (abs(n.z) < 0.35 and c.z < 0.004) else None)
    p = [o]
    p.append(esfera(0.0085, (0, U.y + 0.001, h * 0.7 + 0.001), 'conchaBico', escala=(1.15, 1.2, 0.75), seg=12, aneis=7))
    # Deitada com a borda de cima levantada, de frente para a câmera e o bico para baixo.
    girar(p, (R(42), 0, 0))
    girar(p, (0, 0, R(31)))
    return p


def estrela_do_mar():
    """Estrela-do-mar gorducha, com as pontas um pouco levantadas e as bolinhas claras."""
    pts = pts_estrela(0.065, 0.028, n=5, voltas=3)
    o = almofada(pts, 0.017, 'estrelaMar', tras=0.004, aneis=4, perfil=0.6)
    o.rotation_euler = (R(-90), 0, 0)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(rotation=True)
    deformar(o, lambda v: Vector((v.x, v.y, v.z + 0.12 * max(0.0, math.hypot(v.x, v.y) - 0.025) ** 1.6 * 4)))
    p = [o]
    for k in range(5):
        a = R(90 + 72 * k)
        for i, rr in enumerate((0.0, 0.016, 0.03, 0.043)):
            if i == 0 and k:
                continue
            x, y = math.cos(a) * rr, math.sin(a) * rr
            pt, nr = na_superficie(o, (x, y, 0.2), (0, 0, -1))
            if pt is None:
                continue
            raio = 0.0042 if i < 3 else 0.0032
            b = esfera(raio, tuple(pt), 'estrelaMarPinta', escala=(1, 1, 0.7), seg=8, aneis=5)
            b.rotation_euler = Vector((0, 0, 1)).rotation_difference(nr).to_euler()
            p.append(b)
    return p


# =================================================================== peixes
def _corpo(L, H, W, m, afina=0.55, cabeca=0.15):
    """Corpo de peixe em pé, ao longo de x, a cabeça para −x, centrado na origem."""
    o = esfera(1, (0, 0, 0), m, escala=(L / 2, W / 2, H / 2), seg=20, aneis=12)

    def forma(v):
        t = v.x / (L / 2)
        k = (1 - afina * max(0.0, t) ** 1.5) * (1 - cabeca * max(0.0, -t) ** 3)
        return Vector((v.x, v.y * k, v.z * k + H * 0.04 * (1 - t * t)))
    deformar(o, forma)
    return o


def _y_da_pele(L, H, W, x, z, afina=0.55, cabeca=0.15):
    t = x / (L / 2)
    k = (1 - afina * max(0.0, t) ** 1.5) * (1 - cabeca * max(0.0, -t) ** 3)
    zz = (z - H * 0.04 * (1 - t * t)) / (H / 2 * k)
    return W / 2 * k * math.sqrt(max(0.0, 1 - t * t - zz * zz))


def _rosto(p, L, H, W, olho=0.012, afina=0.55, cabeca=0.15, boca_z=-0.1, bochecha=True, olho_x=-0.6):
    """Olhos, boquinha e bochechas dos dois lados (o jeito dos bichos do recife)."""
    xo, zo = L / 2 * olho_x, H * 0.12
    for s in (-1, 1):
        y = _y_da_pele(L, H, W, xo, zo, afina, cabeca)
        p += olho_fofo((xo, s * (y - olho * 0.15), zo), (-0.25, s, 0.12), olho, achatar=0.5)
        if bochecha:
            xb, zb = xo + olho * 0.6, zo - olho * 1.55
            yb = _y_da_pele(L, H, W, xb, zb, afina, cabeca)
            b = esfera(olho * 0.55, (xb, s * (yb - 0.001), zb), 'bochechaRosa', escala=(1, 1, 0.4), seg=8, aneis=5)
            b.rotation_euler = Vector((0, 0, 1)).rotation_difference(Vector((-0.2, s, -0.1))).to_euler()
            p.append(b)
    ponta = -L / 2 * (1 - cabeca * 0.6)
    zb = H * boca_z
    boca = [(ponta + 0.006, -W * 0.16, zb + 0.002), (ponta + 0.0005, 0, zb - 0.0015), (ponta + 0.006, W * 0.16, zb + 0.002)]
    p.append(tube(boca, [0.0022] * 3, 'boca', seg=5))


def _barbatana(contorno, espessura, pos, m, rot=(0, 0, 0)):
    return prism(contorno, espessura, pos, m, rot=rot, bevel=min(0.002, espessura * 0.3))


def _pintas(corpo, pontos, r, m):
    """Pintas redondas dos dois lados do peixe, nos pontos (x, z)."""
    p = []
    for x, z in pontos:
        for s in (-1, 1):
            q = pinta(corpo, (x, s * 0.3, z), (0, -s, 0), r, m, achatar=0.3)
            if q:
                p.append(q)
    return p


def _peixe(L, H, W, cores, rabo, dorsal, anal, peito, regra=None, afina=0.55, cabeca=0.15, olho=0.012,
           boca_z=-0.1):
    """Peixe de coleção em pé. `cores` = (lado, costas, barriga, barbatana); `regra` pinta o resto."""
    lado, costas, barriga, barb = cores
    corpo = _corpo(L, H, W, lado, afina, cabeca)

    def pintura(c, n):
        if regra:
            r = regra(c, n)
            if r:
                return r
        if c.z > H * 0.2:
            return costas
        if c.z < -H * 0.16:
            return barriga
        return None
    pintar_por(corpo, pintura)
    p = [corpo]
    p.append(_barbatana(rabo, 0.006, (L / 2 * 0.86, 0, H * 0.02), barb))
    for d in (dorsal if isinstance(dorsal[0][0], tuple) else [dorsal]):
        p.append(_barbatana(d, 0.005, (0, 0, 0), barb))
    p.append(_barbatana(anal, 0.005, (0, 0, 0), barb))
    for s in (-1, 1):
        px, pz = peito
        y = _y_da_pele(L, H, W, px, pz, afina, cabeca)
        nad = esfera(1, (px + 0.012, s * (y + 0.002), pz), barb, escala=(0.018, 0.004, 0.009), seg=10, aneis=6)
        nad.rotation_euler = (R(s * 18), 0, R(s * -28))
        p.append(nad)
    _rosto(p, L, H, W, olho=olho, afina=afina, cabeca=cabeca, boca_z=boca_z)
    return p


def peixe_sardinha():
    L, H, W = 0.15, 0.042, 0.026

    rabo = [(0, 0.004), (0.028, 0.026), (0.024, 0.0), (0.028, -0.026), (0, -0.004)]
    dorsal = [(-0.012, H * 0.42), (0.004, H * 0.42 + 0.018), (0.014, H * 0.42 + 0.012), (0.018, H * 0.4)]
    anal = [(0.014, -H * 0.36), (0.026, -H * 0.36 - 0.01), (0.034, -H * 0.3)]
    p = _peixe(L, H, W, ('sardinha', 'sardinhaCostas', 'prata', 'barbatanaSardinha'), rabo, dorsal, anal,
               (-0.035, -0.006), afina=0.6, cabeca=0.1, olho=0.0085, boca_z=-0.06)
    p += _pintas(p[0], [(-0.022 + 0.012 * i, H * 0.1) for i in range(5)], 0.0032, 'sardinhaPinta')
    return p


def peixe_robalo():
    L, H, W = 0.24, 0.066, 0.038

    rabo = [(0, 0.006), (0.04, 0.04), (0.046, 0.016), (0.04, 0.0), (0.046, -0.016), (0.04, -0.04), (0, -0.006)]
    dorsal = [[(-0.045, H * 0.4), (-0.034, H * 0.42 + 0.026), (-0.006, H * 0.42 + 0.02), (0.0, H * 0.41)],
              [(0.008, H * 0.42), (0.016, H * 0.43 + 0.018), (0.044, H * 0.41 + 0.012), (0.052, H * 0.34)]]
    anal = [(0.02, -H * 0.38), (0.035, -H * 0.38 - 0.016), (0.055, -H * 0.3)]
    p = _peixe(L, H, W, ('robalo', 'robaloCostas', 'prata', 'barbatanaRobalo'), rabo, dorsal, anal,
               (-0.06, -0.01), afina=0.6, cabeca=0.2, olho=0.0115, boca_z=-0.05)
    # A linha preta do lado, da guelra até o rabo.
    for s in (-1, 1):
        pts = []
        for i in range(9):
            x = -0.07 + 0.17 * i / 8
            z = H * 0.06 + 0.004 * math.sin(i / 8 * math.pi)
            pts.append((x, s * (_y_da_pele(L, H, W, x, z, 0.6, 0.2) + 0.0005), z))
        p.append(tube(pts, [0.0022] * 8 + [0.0012], 'robaloLinha', seg=5))
    return p


def peixe_garoupa():
    L, H, W = 0.25, 0.105, 0.066
    rabo = [(0, 0.012), (0.03, 0.04), (0.048, 0.03), (0.052, 0.0), (0.048, -0.03), (0.03, -0.04), (0, -0.012)]
    dorsal = [(-0.06, H * 0.4), (-0.045, H * 0.4 + 0.022), (0.0, H * 0.44 + 0.026), (0.045, H * 0.36 + 0.03),
              (0.065, H * 0.28)]
    anal = [(0.01, -H * 0.38), (0.035, -H * 0.38 - 0.024), (0.06, -H * 0.26)]
    p = _peixe(L, H, W, ('garoupa', 'garoupaCostas', 'garoupaBarriga', 'barbatanaGaroupa'), rabo, dorsal, anal,
               (-0.05, -0.02), afina=0.5, cabeca=0.05, olho=0.015, boca_z=-0.14)
    rnd = random.Random(12)
    pontos = []
    for i in range(16):
        x = -0.045 + 0.13 * rnd.random()
        z = -H * 0.1 + H * 0.45 * rnd.random() * (1 - 0.5 * max(0.0, x / 0.1))
        if all(math.hypot(x - a, z - b) > 0.017 for a, b in pontos):
            pontos.append((x, z))
    p += _pintas(p[0], pontos, 0.0052, 'garoupaPinta')
    return p


def peixe_linguado():
    """Linguado: chato, deitado na areia, com os dois olhos do mesmo lado (em cima)."""
    p = []
    corpo = esfera(1, (0, 0, 0), 'linguado', escala=(0.092, 0.056, 0.014), seg=22, aneis=10)
    deformar(corpo, lambda v: Vector((v.x, v.y * (1 - 0.4 * max(0.0, v.x / 0.092) ** 2) * (1 - 0.15 * max(0.0, -v.x / 0.092) ** 3),
                                      v.z)))
    corpo.location = (0, 0, 0.016)
    p.append(corpo)
    for x, y, r in ((-0.008, -0.024, 0.0085), (0.03, 0.02, 0.008), (0.045, -0.016, 0.007), (0.0, 0.026, 0.007)):
        q = pinta(corpo, (x, y, 0.2), (0, 0, -1), r, 'linguadoPinta', achatar=0.25)
        p.append(q)
        q = pinta(corpo, (x, y, 0.2), (0, 0, -1), r * 0.5, 'linguadoClaro', achatar=0.35, afunda=0.0)
        p.append(q)
    borda = esfera(1, (0, 0, 0), 'linguadoBorda', escala=(0.096, 0.07, 0.005), seg=22, aneis=6)
    deformar(borda, lambda v: Vector((v.x, v.y * (1 - 0.45 * max(0.0, v.x / 0.096) ** 2) *
                                      (1 + 0.04 * math.sin(math.atan2(v.y, v.x) * 22)), v.z)))
    pintar_por(borda, lambda c, n: 'linguadoRaio' if int((math.atan2(c.y, c.x) + math.pi) / R(7)) % 2 else None)
    borda.location = (0.004, 0, 0.0135)
    p.append(borda)
    rabo = prism([(0, 0.008), (0.04, 0.036), (0.048, 0.0), (0.04, -0.036), (0, -0.008)], 0.005, (0.084, 0, 0.012),
                 'linguadoBorda', rot=(R(-90), 0, 0), bevel=0.0015)
    p.append(rabo)
    # Os dois olhos em cima, saltadinhos, perto da cabeça.
    for k, (x, y) in enumerate(((-0.052, -0.016), (-0.04, 0.012))):
        p.append(esfera(0.009, (x, y, 0.028), 'linguado', escala=(1, 1, 0.8), seg=10, aneis=6))
        p += olho_fofo((x, y, 0.033), (-0.1, -0.15, 1), 0.0085, achatar=0.55)
    p.append(tube([(-0.083, -0.012, 0.018), (-0.087, -0.002, 0.016), (-0.084, 0.008, 0.018)], [0.0022] * 3, 'boca',
                  seg=5))
    for s in (-1,):
        p.append(esfera(0.005, (-0.06, -0.03, 0.026), 'bochechaRosa', escala=(1, 1, 0.4), seg=8, aneis=4))
    return p


def peixe_voador():
    """Peixe-voador: azul, com as nadadeiras do peito grandes como asas abertas."""
    L, H, W = 0.2, 0.042, 0.034
    rabo = [(0, 0.004), (0.03, 0.03), (0.026, 0.002), (0.05, -0.04), (0, -0.006)]
    dorsal = [(0.02, H * 0.42), (0.035, H * 0.42 + 0.012), (0.05, H * 0.38)]
    anal = [(0.02, -H * 0.38), (0.035, -H * 0.38 - 0.012), (0.05, -H * 0.32)]
    p = _peixe(L, H, W, ('voador', 'voadorCostas', 'prata', 'asaVoador'), rabo, dorsal, anal, (-0.04, -0.004),
               afina=0.6, cabeca=0.12, olho=0.011, boca_z=-0.05)
    # Asa: leque de triângulos a partir da base, com faixas alternadas (os raios da nadadeira).
    contorno = suavizar([(0.012, 0.035), (0.04, 0.085), (0.075, 0.095), (0.1, 0.07), (0.09, 0.03), (0.05, 0.004)], 3)
    for s in (-1, 1):
        verts = [(0, 0, 0)] + [(x, 0, z) for x, z in contorno]
        faces = [(0, i, i + 1) for i in range(1, len(contorno))]
        asa = malha('asa', verts, faces, 'asaVoador', liso=False)
        sol = asa.modifiers.new('esp', 'SOLIDIFY')
        sol.thickness = 0.004
        sol.offset = 0
        lib_q._apply(asa, sol)
        lib_q.flat(asa)
        pintar_por(asa, lambda c, n: 'asaVoadorRaio' if int(math.atan2(c.z, c.x) / R(8)) % 2 and math.hypot(c.x, c.z) > 0.012
                   else None)
        # A asa fica deitada para o lado e levantada, a base encostada no corpo atrás do olho.
        girar([asa], (R(-90 * s + s * 14), 0, R(s * 8)), mover=(-0.045, s * W * 0.42, -0.004))
        p.append(asa)
    return p


# =================================================================== notas musicais
def _cabeca_nota(x, z, m_borda, r=0.028):
    # Polos no eixo y: os anéis correm em volta do contorno e a faixa colorida fica na beirada.
    o = esfera(1, (0, 0, 0), 'luz', escala=(r * 1.22, r * 0.92, r * 0.62), seg=18, aneis=12)
    o.rotation_euler = (R(90), 0, 0)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(rotation=True)
    pintar_por(o, lambda c, n: m_borda if abs(c.y) < r * 0.62 * 0.5 else None)
    o.rotation_euler = (0, R(-22), 0)
    o.location = (x, 0, z)
    return o


def _haste(pts, r, m_borda):
    t = tubo_plano(pts, [r] * len(pts), 'luz', seg=12)
    borda_colorida(t, m_borda, 0.62)
    pecas = [t]
    for q in (pts[-1],):
        b = esfera(r, q, 'luz', seg=12, aneis=8)
        borda_colorida(b, m_borda)
        pecas.append(b)
    return pecas


def _traco(pts, raios, m_borda, n=4, bola_fim=True, bola_ini=True):
    """Traço macio de `luz` ao longo de um caminho suavizado, com o contorno colorido."""
    sv = suavizar(pts, n)
    if len(raios) == 2:
        rs = [raios[0] + (raios[-1] - raios[0]) * i / (len(sv) - 1) for i in range(len(sv))]
    else:
        rs = []
        for i in range(len(sv)):
            f = i / n
            a = min(len(raios) - 1, int(f))
            b = min(len(raios) - 1, a + 1)
            rs.append(raios[a] + (raios[b] - raios[a]) * (f - int(f)))
    t = tubo_plano(sv, rs, 'luz', seg=12)
    borda_colorida(t, m_borda, 0.62)
    pecas = [t]
    if bola_ini:
        pecas.append(esfera(rs[0], sv[0], 'luz', seg=12, aneis=8))
    if bola_fim:
        pecas.append(esfera(rs[-1], sv[-1], 'luz', seg=12, aneis=8))
    for b in pecas[1:]:
        borda_colorida(b, m_borda)
    return pecas


def nota_seminima():
    m = 'notaAzul'
    p = [_cabeca_nota(0, 0.026, m)]
    p += _haste([(0.029, 0, 0.03), (0.029, 0, 0.155)], 0.0068, m)
    return p


def nota_colcheia():
    m = 'notaRosa'
    p = [_cabeca_nota(0, 0.026, m)]
    p += _haste([(0.029, 0, 0.03), (0.029, 0, 0.152)], 0.0068, m)
    p += _traco([(0.029, 0, 0.152), (0.045, 0, 0.135), (0.066, 0, 0.11), (0.07, 0, 0.085), (0.06, 0, 0.065)],
                [0.0095, 0.0055], m, bola_ini=False)
    return p


def nota_dupla():
    """Duas colcheias ligadas pela barra."""
    m = 'notaVerde'
    p = [_cabeca_nota(0, 0.026, m, r=0.025), _cabeca_nota(0.085, 0.04, m, r=0.025)]
    p += _haste([(0.026, 0, 0.03), (0.026, 0, 0.15)], 0.0062, m)
    p += _haste([(0.111, 0, 0.044), (0.111, 0, 0.164)], 0.0062, m)
    barra = lib_q.cushion((0.1, 0.016, 0.018), (0, 0, 0), 'luz', puff=0.0, round_=0.45)
    borda_colorida(barra, m)
    barra.rotation_euler = (0, -math.atan2(0.014, 0.085), 0)
    barra.location = (0.0685, 0, 0.155)
    p.append(barra)
    return p


def nota_clave_de_sol():
    m = 'notaLilas'
    # O traço da clave: a espiral em volta da linha do sol (de dentro para fora), sobe pela direita,
    # cruza para a esquerda, faz a laçada de cima, desce reto e termina no gancho com a bolinha.
    desenho = [(0.05, 0.02), (0.01, 0.07), (-0.06, 0.055), (-0.1, -0.02), (-0.07, -0.11), (0.02, -0.15), (0.11, -0.11),
               (0.155, -0.02), (0.13, 0.09), (0.05, 0.19), (-0.04, 0.29), (-0.095, 0.4), (-0.085, 0.53), (-0.02, 0.65),
               (0.045, 0.73), (0.075, 0.69), (0.07, 0.58), (0.04, 0.45), (0.02, 0.3), (0.018, 0.12), (0.025, -0.05),
               (0.03, -0.18), (0.02, -0.27), (-0.02, -0.32), (-0.065, -0.3), (-0.08, -0.255)]
    esc = 0.21
    caminho = [(x * esc, 0, z * esc) for x, z in desenho]
    raios = []
    for i in range(len(caminho)):
        t = i / (len(caminho) - 1)
        if t < 0.35:
            raios.append(0.0058 + 0.0034 * math.sin(math.pi * t / 0.35))
        elif t < 0.6:
            raios.append(0.0062 - 0.0022 * math.sin(math.pi * (t - 0.35) / 0.25))
        else:
            raios.append(0.0062)
    p = _traco(caminho, raios, m, n=4, bola_fim=False)
    b = esfera(0.0115, (-0.078 * esc, 0, -0.25 * esc), 'luz', escala=(1, 0.75, 1), seg=12, aneis=8)
    borda_colorida(b, m, 0.55)
    p.append(b)
    return p


# =================================================================== cristais
def _ponta(r, h, ponta, m, m_claro, seg=6, base=0.0, afina=0.92):
    """Ponta de cristal: prisma de seis lados com a pirâmide em cima, faces chapadas e duas cores."""
    o = torneado([(0, base), (r, base), (r * afina, h), (0, h + ponta)], m, seg=seg, liso=False)
    pintar_por(o, lambda c, n: m_claro if n.z > 0.35 or (n.z > -0.3 and (math.atan2(n.y, n.x) % R(120)) < R(60))
               else None)
    return o


def _pedra(loc, tam, m, seed, topo=None):
    return rock(loc, tam, m, seed=seed, subdiv=2, rough=0.18, flat_top=0.2, top_m=topo)


def cristal_azul():
    """Ponta de gelo azul, alta, com duas pontinhas ao pé, num montinho de neve."""
    p = [_pedra((0, 0, 0), (0.1, 0.085, 0.03), 'neve', 2, topo='neveSombra')]
    o = _ponta(0.022, 0.1, 0.035, 'cristalAzul', 'cristalAzulClaro', base=0.0)
    o.rotation_euler = (R(-6), R(6), R(15))
    o.location = (0, 0, 0.012)
    p.append(o)
    for k, (x, y, rx, ry, s) in enumerate(((0.026, -0.012, 10, 34, 0.55), (-0.024, -0.008, 8, -30, 0.45))):
        q = _ponta(0.022 * s, 0.1 * s, 0.035 * s, 'cristalAzul', 'cristalAzulClaro')
        q.rotation_euler = (R(rx), R(ry), R(10 * k))
        q.location = (x, y, 0.01)
        p.append(q)
    return p


def cristal_rosa():
    """Pedra preciosa rosa lapidada (o corte redondo): a mesa em cima, a coroa e a ponta embaixo."""
    r, seg = 0.046, 10
    o = torneado([(0, 0), (r, 0.046), (r, 0.052), (r * 0.62, 0.07), (0, 0.07)], 'cristalRosa', seg=seg, liso=False)
    passo = 2 * math.pi / seg

    def facetas(c, n):
        if n.z > 0.95:
            return 'cristalRosaClaro'
        k = int((math.atan2(c.y, c.x) + math.pi) / passo) % 2
        if c.z > 0.049:
            return 'cristalRosaClaro' if k == 0 else None
        if c.z < 0.045:
            return 'cristalRosaClaro' if k == 1 else None
        return None
    pintar_por(o, facetas)
    o.rotation_euler = (R(-32), 0, R(-8))
    return [o]


def cristal_roxo():
    """Ametista em drusa: um cacho de pontas roxas saindo de uma pedra cinza."""
    p = [_pedra((0, 0, 0), (0.11, 0.09, 0.05), 'pedraCinza', 7, topo='pedraCinzaClara')]
    pontas = [(0, 0.004, 0, 0, 1.0), (0.028, -0.01, 18, 26, 0.75), (-0.03, -0.004, 12, -28, 0.7),
              (0.006, 0.026, -30, 8, 0.68), (-0.012, -0.026, 32, -10, 0.6), (0.032, 0.018, -18, 30, 0.5)]
    for k, (x, y, rx, ry, s) in enumerate(pontas):
        q = _ponta(0.018 * s + 0.004, 0.075 * s, 0.028 * s, 'cristalRoxo', 'cristalRoxoClaro')
        q.rotation_euler = (R(rx), R(ry), R(k * 23))
        q.location = (x, y, 0.03)
        p.append(q)
    return p


def cristal_verde():
    """Geodo: pedra rústica partida ao meio, com a borda clara e cheia de cristais verdes brilhantes."""
    rnd = random.Random(21)
    casca = torneado([(0, 0), (0.03, 0.002), (0.05, 0.012), (0.062, 0.028), (0.064, 0.042), (0.06, 0.05),
                      (0.054, 0.053), (0.048, 0.051), (0.044, 0.038), (0.034, 0.024), (0.016, 0.018), (0, 0.017)],
                     'geodoCasca', seg=20, liso=False)
    lombos = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 0.4))).normalized(),
               rnd.uniform(0.04, 0.12)) for _ in range(9)]

    def rustica(v):
        rr = math.hypot(v.x, v.y)
        if rr < 1e-6 or v.z > 0.049:
            return v
        d = Vector((v.x, v.y, v.z - 0.025)).normalized()
        k = 1 + sum(a_ * max(0.0, d.dot(c_)) ** 4 for c_, a_ in lombos) + rnd.uniform(-0.025, 0.025)
        fora = rr > 0.05 or v.z < 0.03
        return Vector((v.x * k, v.y * k, v.z)) if fora else v
    deformar(casca, rustica)
    rnd2 = random.Random(5)

    def cores(c, n):
        rr = math.hypot(c.x, c.y)
        if c.z > 0.047 and n.z > 0.4:
            return 'geodoBorda'
        if rr < 0.05 and c.z > 0.016 and n.z > -0.3 and c.z < 0.05:
            return 'geodoDentro'
        return 'geodoCascaEscura' if rnd2.random() < 0.35 else None
    pintar_por(casca, cores)
    p = [casca]
    # Cristais grandes, de seis lados, saindo da parede de dentro para o meio e para cima.
    lugares = [(0.0, 0.0)] + [(2 * math.pi * k / 6 + 0.3, 0.45) for k in range(6)] + \
              [(2 * math.pi * k / 10 + 0.1, 0.85) for k in range(10)]
    for a_, f in lugares:
        rr = 0.004 + 0.038 * f
        z = 0.018 + 0.026 * f ** 2
        base = Vector((math.cos(a_) * rr, math.sin(a_) * rr, z))
        d = (Vector((0, 0, 0.075)) - base).normalized()
        tam = rnd.uniform(0.85, 1.05) * (1.25 - 0.35 * f)
        q = _ponta(0.0125 * tam, 0.012 * tam, 0.016 * tam, 'geodoCristal', 'geodoCristalClaro', base=-0.008)
        q.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
        q.location = tuple(base)
        p.append(q)
    girar(p, (R(30), 0, R(-25)))
    return p


# =================================================================== estrelas
def _estrela(r_fora, r_dentro, frente, m_borda, n=5, rot=90, voltas=3, aneis=3, perfil=0.7):
    o = almofada(pts_estrela(r_fora, r_dentro, n=n, rot=rot, voltas=voltas), frente, 'luz', aneis=aneis,
                 perfil=perfil)
    borda_colorida(o, m_borda, 0.5)
    return o


def estrela_cadente():
    """Estrela gorducha caindo, com o rastro de três fitas coloridas."""
    p = []
    e = _estrela(0.06, 0.03, 0.02, 'estrelaBorda')
    e.rotation_euler = (0, R(-12), 0)
    e.location = (0.035, 0, 0.075)
    p.append(e)
    for k, (m, dz, comp) in enumerate((('rastroRosa', 0.02, 0.11), ('rastroAmarelo', 0.0, 0.13),
                                       ('rastroAzul', -0.02, 0.1))):
        pts = []
        for i in range(7):
            t = i / 6
            pts.append((0.03 - comp * t, 0.012 + 0.004 * k, 0.07 + dz * (1 - 0.3 * t) - 0.06 * t - 0.012 * math.sin(t * 3)))
        raios = [0.011 - 0.007 * i / 6 for i in range(7)]
        f = tube(pts, raios, m, seg=10)
        deformar(f, lambda v: Vector((v.x, 0.012 + 0.004 * k + (v.y - 0.012 - 0.004 * k) * 0.5, v.z)))
        p.append(f)
        p.append(esfera(raios[-1], pts[-1], m, escala=(1, 0.5, 1), seg=8, aneis=5))
    return p


def estrela_sorriso():
    """Estrela gorducha de carinha feliz: olhos, bochechas e o sorriso."""
    e = _estrela(0.066, 0.036, 0.026, 'estrelaBordaRosa', perfil=0.55)
    p = [e]
    for s in (-1, 1):
        pt, nr = na_superficie(e, (s * 0.017, -0.2, 0.008), (0, 1, 0))
        p += olho_fofo(tuple(pt), tuple(nr), 0.0075, m_branco=None, achatar=0.6, seg=10)
        pt, nr = na_superficie(e, (s * 0.03, -0.2, -0.006), (0, 1, 0))
        b = esfera(0.0075, tuple(pt), 'bochechaRosa', escala=(1, 1, 0.35), seg=8, aneis=5)
        b.rotation_euler = Vector((0, 0, 1)).rotation_difference(nr).to_euler()
        p.append(b)
    boca = []
    for i in range(5):
        t = i / 4
        x = -0.011 + 0.022 * t
        z = -0.006 - 0.006 * math.sin(math.pi * t)
        pt, nr = na_superficie(e, (x, -0.2, z), (0, 1, 0))
        boca.append(tuple(pt - nr * 0.0005))
    p.append(tube(boca, [0.0022] * 5, 'olhoPreto', seg=5))
    return p


def estrela_cintilante():
    """Brilho de quatro pontas, fino e gorducho, com dois brilhinhos em volta."""
    p = [_estrela(0.072, 0.02, 0.02, 'estrelaBordaAzul', n=4, voltas=3, perfil=0.6)]
    for k, (x, z, r) in enumerate(((0.06, 0.055, 0.02), (-0.058, -0.05, 0.016))):
        o = _estrela(r, r * 0.3, r * 0.3, 'estrelaBordaAzul', n=4, voltas=2, aneis=2)
        o.location = (x, 0, z)
        p.append(o)
    return p


def estrela_trio():
    """Três estrelinhas presas por fios de luz: uma constelação pequena."""
    lugares = [(-0.05, -0.03, 0.03, 'estrelaBordaLilas'), (0.005, 0.04, 0.036, 'estrelaBorda'),
               (0.06, -0.012, 0.026, 'estrelaBordaRosa')]
    p = []
    for k, (x, z, r, m) in enumerate(lugares):
        o = _estrela(r, r * 0.5, r * 0.36, m)
        o.rotation_euler = (0, R(12 * (k - 1)), 0)
        o.location = (x, 0, z)
        p.append(o)
    for (x0, z0, _, _), (x1, z1, _, _) in zip(lugares, lugares[1:]):
        f = tube([(x0, 0.002, z0), (x1, 0.002, z1)], [0.0028, 0.0028], 'luz', seg=8)
        p.append(f)
    return p


FUNCOES = {
    'concha-caracol': concha_caracol, 'concha-vieira': concha_vieira, 'concha-tigre': concha_tigre,
    'concha-mexilhao': concha_mexilhao, 'concha-listrada': concha_listrada, 'estrela-do-mar': estrela_do_mar,
    'peixe-sardinha': peixe_sardinha, 'peixe-robalo': peixe_robalo, 'peixe-garoupa': peixe_garoupa,
    'peixe-linguado': peixe_linguado, 'peixe-voador': peixe_voador,
    'nota-seminima': nota_seminima, 'nota-colcheia': nota_colcheia, 'nota-dupla': nota_dupla,
    'nota-clave-de-sol': nota_clave_de_sol,
    'cristal-azul': cristal_azul, 'cristal-rosa': cristal_rosa, 'cristal-roxo': cristal_roxo,
    'cristal-verde': cristal_verde,
    'estrela-cadente': estrela_cadente, 'estrela-sorriso': estrela_sorriso, 'estrela-cintilante': estrela_cintilante,
    'estrela-trio': estrela_trio,
}
ITENS = [(pid, (lambda pid=pid: {'nos': {pid: FUNCOES[pid]()}, 'grupo': 'colecoes'})) for pid in FUNCOES]

if __name__ == '__main__':
    rodar(ITENS)
