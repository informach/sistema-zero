"""Os quatro cenários da Patrulha Espacial (e os fundos 2D da Nave, pelo `svg2d.py`).

Cada cenário é uma cúpula de raio 88 em volta da cena, pintada por vértice, mais planetas, anéis,
estação e estrelas, tudo SEM LUZ (`KHR_materials_unlit`): a cor que aparece é a pintada aqui, com o
sombreamento dos planetas já calculado. A câmera da Patrulha fica em (0, 8, 12) e mira (0, 1, -12):
ela vê de 46° abaixo a 14° acima do horizonte e uns 46° para cada lado. A faixa onde a nave voa e
os asteroides chegam (embaixo, no meio) fica escura e calma, para as peças se destacarem.

Tudo fica dentro da caixa `cenario` (±90), com o bloco "Criar o objeto … com o modelo … tamanho 180"
e o objeto em (0, 0, 0).

    python cenarios.py
    python cenarios.py cenario-orbita
"""
import math
import random
import sys

from lib_espaco import Vector, _obj, bmesh, exportar, juntar, mat_sem_luz, noise, reset

RAIO_CUPULA = 88.0
CAMERA = Vector((0.0, 8.0, 12.0))  # no jogo


# --- conversões: o jogo tem y para cima e a frente em -z; o Blender, z para cima -----------------
def g2b(p):
    return Vector((p[0], -p[2], p[1]))


def b2g(p):
    return Vector((p[0], p[2], -p[1]))


def direcao(yaw, pitch):
    """Direção no jogo: yaw 0 = em frente (-z), positivo para a direita; pitch positivo para cima."""
    y, p = math.radians(yaw), math.radians(pitch)
    return Vector((math.sin(y) * math.cos(p), math.sin(p), -math.cos(y) * math.cos(p)))


def angulos(d):
    d = d.normalized()
    return math.degrees(math.atan2(d.x, -d.z)), math.degrees(math.asin(max(-1, min(1, d.y))))


def hex_rgb(h):
    h = h.lstrip('#')
    return Vector([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def mistura(a, b, t):
    t = max(0.0, min(1.0, t))
    return a.lerp(b, t)


def suave(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def gradiente(paradas, t):
    """paradas = [(t, cor_hex), ...] crescente."""
    if t <= paradas[0][0]:
        return hex_rgb(paradas[0][1])
    for (t0, c0), (t1, c1) in zip(paradas, paradas[1:]):
        if t <= t1:
            return mistura(hex_rgb(c0), hex_rgb(c1), (t - t0) / (t1 - t0))
    return hex_rgb(paradas[-1][1])


def fbm(p, oitavas=4):
    return noise.fractal(p, 0.55, 2.0, oitavas)


# --- malhas com cor por vértice -----------------------------------------------------------------
def _pintar(o, cor_de):
    """`cor_de(ponto_no_jogo)` -> Vector rgb (sRGB 0..1), por vértice."""
    me = o.data
    attr = me.color_attributes.new('Cor', 'BYTE_COLOR', 'POINT')
    for v, d in zip(me.vertices, attr.data):
        c = cor_de(b2g(o.matrix_world @ v.co))
        d.color_srgb = (min(1, max(0, c[0])), min(1, max(0, c[1])), min(1, max(0, c[2])), 1.0)
    return o


def esfera(centro_jogo, raio, seg, ring, nome):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=raio)
    o = _obj(nome, bm, mat_sem_luz('ceu'))
    o.location = g2b(centro_jogo)
    import bpy
    bpy.context.view_layer.update()
    return o


def cupula(cor_de, seg=160, ring=80):
    o = esfera((0, 0, 0), RAIO_CUPULA, seg, ring, 'cupula')
    return _pintar(o, lambda p: cor_de(p.normalized()))


def recortar_na_cupula(o, limite=RAIO_CUPULA - 1.0):
    """Tira as faces que ficariam além da cúpula: atrás dela nada aparece, então a imagem não
    muda, e a peça cabe na caixa do cenário."""
    import bpy
    bpy.context.view_layer.update()
    bm = bmesh.new()
    bm.from_mesh(o.data)
    mw = o.matrix_world
    fora = [f for f in bm.faces if any((mw @ v.co).length > limite for v in f.verts)]
    bmesh.ops.delete(bm, geom=fora, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    return o


def planeta(centro, raio, albedo, sol, atmosfera=None, forca_atmo=0.7, noite=0.16, seg=72, ring=36):
    """Planeta sem luz com o dia e a noite já pintados. `albedo(n_local) -> rgb` (n em jogo)."""
    centro = Vector(centro)
    sol = Vector(sol).normalized()
    o = esfera(centro, raio, seg, ring, 'planeta')

    def cor(p):
        n = (p - centro).normalized()
        luz = max(0.0, n.dot(sol))
        termo = suave(-0.08, 0.35, n.dot(sol))
        c = albedo(n) * (noite + (1 - noite) * (0.35 + 0.65 * luz) * termo + noite * (1 - termo) * 0)
        if atmosfera is not None:
            v = (CAMERA - p).normalized()
            borda = (1 - abs(n.dot(v))) ** 3
            c = c + hex_rgb(atmosfera) * borda * forca_atmo * (0.35 + 0.65 * suave(-0.4, 0.5, n.dot(sol)))
        return c
    return recortar_na_cupula(_pintar(o, cor))


def aneis(centro, normal, r_in, r_out, cor_de_raio, sol, seg=160, faixas=24, sombra_do_planeta=None):
    """Anel achatado em volta de `centro`, no plano de `normal` (jogo)."""
    centro, normal = Vector(centro), Vector(normal).normalized()
    a = normal.orthogonal().normalized()
    b = normal.cross(a).normalized()
    bm = bmesh.new()
    rings = []
    for j in range(faixas + 1):
        r = r_in + (r_out - r_in) * j / faixas
        rings.append([bm.verts.new(g2b(centro + (a * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r))
                      for k in range(seg)])
    for j in range(faixas):
        for k in range(seg):
            bm.faces.new((rings[j][k], rings[j][(k + 1) % seg], rings[j + 1][(k + 1) % seg], rings[j + 1][k]))
    o = _obj('aneis', bm, mat_sem_luz('ceu'))

    def cor(p):
        rel = p - centro
        r = rel.length
        c = cor_de_raio((r - r_in) / (r_out - r_in))
        if sombra_do_planeta:
            raio_p = sombra_do_planeta
            # a sombra do planeta no anel: pontos atrás do planeta em relação ao sol
            s = Vector(sol).normalized()
            atras = rel.dot(s) < 0 and (rel - s * rel.dot(s)).length < raio_p
            if atras:
                c = c * 0.35
        return c
    return _pintar(o, cor)


def estrelas(rnd, quantas, raio=85.0, tamanho=(0.12, 0.34), cores=('#ffffff', '#cfe3ff', '#fff1c9', '#ffd6f0'),
             peso=None, brilho=1.0):
    """Estrelinhas: quadrados virados para o centro, espalhados na cúpula."""
    bm = bmesh.new()
    cores_v = []
    feitas = 0
    tentativas = 0
    while feitas < quantas and tentativas < quantas * 20:
        tentativas += 1
        d = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), rnd.gauss(0, 1))).normalized()
        if peso and rnd.random() > peso(d):
            continue
        s = rnd.uniform(*tamanho) * (1.8 if rnd.random() < 0.06 else 1.0)
        a = d.orthogonal().normalized()
        b = d.cross(a).normalized()
        c = d * raio
        vs = [bm.verts.new(g2b(c + (a * x + b * y) * s)) for x, y in ((-1, 0), (0, -1), (1, 0), (0, 1))]
        bm.faces.new(vs)
        cores_v.append(hex_rgb(rnd.choice(cores)) * (brilho * rnd.uniform(0.6, 1.0)))
        feitas += 1
    o = _obj('estrelas', bm, mat_sem_luz('ceu'))
    me = o.data
    attr = me.color_attributes.new('Cor', 'BYTE_COLOR', 'POINT')
    for i, poly in enumerate(me.polygons):
        c = cores_v[i]
        for vi in poly.vertices:
            attr.data[vi].color_srgb = (min(1, c[0]), min(1, c[1]), min(1, c[2]), 1.0)
    return o


def cintilantes(rnd, quantas, raio=84.0, tamanho=(0.7, 1.5), cor='#ffffff', peso=None):
    """Estrelas grandes de quatro pontas (duas lâminas finas em cruz)."""
    bm = bmesh.new()
    feitas = 0
    while feitas < quantas:
        d = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), rnd.gauss(0, 1))).normalized()
        if peso and rnd.random() > peso(d):
            continue
        s = rnd.uniform(*tamanho)
        a = d.orthogonal().normalized()
        b = d.cross(a).normalized()
        c = d * raio
        for u, w in ((a, b), (b, a)):
            pts = [c + u * s, c + w * s * 0.12, c - u * s, c - w * s * 0.12]
            bm.faces.new([bm.verts.new(g2b(p)) for p in pts])
        feitas += 1
    o = _obj('cintilantes', bm, mat_sem_luz('ceu'))
    return _pintar(o, lambda p: hex_rgb(cor))


def exportar_cenario(pid, pecas):
    o = juntar(pecas, pid)
    return exportar(pid, [o], 'cenario', sem_caixa=True, normais=False)


# ---------------------------------------------------------------------------------------------
def orbita():
    """Órbita do planeta anelado: céu azul-violeta, gigante de faixas cor de areia com anéis, duas
    luas e a Via Láctea passando em diagonal."""
    reset()
    rnd = random.Random('orbita')
    sol = direcao(-125, 30)

    def ceu(d):
        yaw, pitch = angulos(d)
        c = gradiente([(-90, '#05061a'), (-25, '#0b0d2c'), (0, '#1a1650'), (20, '#130f3c'), (90, '#070826')], pitch)
        via = math.exp(-((d.dot(Vector((0.45, 0.8, 0.4)).normalized())) / 0.22) ** 2)
        via *= 0.6 + 0.6 * fbm(d * 3.0)
        c = c + hex_rgb('#6d5bd0') * max(0, via) * 0.35 + hex_rgb('#c08bff') * max(0, via) ** 3 * 0.25
        neb = max(0.0, fbm(d * 1.6 + Vector((3, 1, 7)))) * suave(-30, 10, pitch)
        return c + hex_rgb('#3b2a8f') * neb * 0.35
    pecas = [cupula(ceu)]
    centro = direcao(30, -4) * 50

    def gigante(n):
        lat = math.asin(max(-1, min(1, n.y)))
        t = lat * 6.5 + fbm(n * 2.2) * 0.9
        b = 0.5 + 0.5 * math.sin(t)
        c = gradiente([(0, '#b8673f'), (0.35, '#d99060'), (0.6, '#f2cf96'), (0.85, '#fff0cc'), (1.0, '#e8b77a')], b)
        mancha = math.exp(-((n - Vector((0.55, -0.25, 0.8)).normalized()).length / 0.18) ** 2)
        return mistura(c, hex_rgb('#c4563a'), mancha * 0.8)
    pecas.append(planeta(centro, 15, gigante, sol, atmosfera='#ffd9a0', forca_atmo=0.5))
    normal_anel = Vector((0.18, 1.0, 0.32)).normalized()

    def cor_anel(t):
        faixa = 0.55 + 0.45 * math.sin(t * 38) * math.sin(t * 7 + 1)
        base = gradiente([(0, '#7a6450'), (0.25, '#e6cfa4'), (0.5, '#cfae7e'), (0.62, '#3a2e3e'),
                          (0.68, '#d8bd90'), (1.0, '#8f7a63')], t)
        return base * (0.6 + 0.4 * faixa)
    pecas.append(aneis(centro, normal_anel, 15 * 1.35, 15 * 2.05, cor_anel, sol, sombra_do_planeta=15))
    pecas.append(planeta(direcao(-34, 9) * 70, 2.6, lambda n: gradiente([(0, '#8d93a6'), (1, '#d8dce6')], 0.5 + 0.5 * fbm(n * 4)),
                         sol, atmosfera=None))
    pecas.append(planeta(direcao(47, 13) * 72, 1.4, lambda n: hex_rgb('#7fd6c9'), sol, atmosfera='#bff7ee', forca_atmo=0.4))
    pecas.append(estrelas(rnd, 1300))
    pecas.append(cintilantes(rnd, 26, peso=lambda d: 1.0 if d.y > -0.2 else 0.25))
    return exportar_cenario('cenario-orbita', pecas)


def aurora():
    """Aurora sobre o planeta gelado: a noite de um planeta de gelo embaixo, cortinas verdes e
    azuis dançando no horizonte e uma lua clara."""
    reset()
    rnd = random.Random('aurora')
    sol = direcao(120, 10)  # o sol está atrás: o planeta embaixo fica na noite

    def ceu(d):
        yaw, pitch = angulos(d)
        c = gradiente([(-90, '#020812'), (-10, '#05202c'), (0, '#0b3442'), (15, '#071a2b'), (90, '#030a16')], pitch)
        faixa = math.exp(-((pitch - 9) / 9.0) ** 2)
        cortina = 0.5 + 0.5 * math.sin(math.radians(yaw) * 9 + fbm(d * 2.0) * 3.0)
        fio = 0.6 + 0.4 * math.sin(math.radians(yaw) * 21 + fbm(d * 2.5) * 2.0)
        intensidade = faixa * cortina * fio * (0.7 + 0.5 * fbm(d * 1.3 + Vector((5, 2, 1))))
        alto = suave(5, 22, pitch)
        tom = mistura(hex_rgb('#3dffa0'), hex_rgb('#3be0ff'), 0.5 + 0.5 * math.sin(math.radians(yaw) * 2.0))
        tom = mistura(tom, hex_rgb('#c06cff'), alto * 0.8)
        return c + tom * max(0.0, intensidade) * 0.95
    pecas = [cupula(ceu, seg=192, ring=96)]
    # o planeta: uma esfera grande embaixo, com o topo um pouco abaixo da altura da cena
    centro = Vector((0, -82, -30))

    def gelo(n):
        manchas = fbm(n * 3.2)
        c = gradiente([(-1, '#0c2340'), (-0.1, '#143656'), (0.3, '#24527c'), (1, '#7fb2dc')], manchas)
        fendas = abs(noise.noise(n * 6.0)) < 0.035
        return c * (0.55 if fendas else 1.0)
    pecas.append(planeta(centro, 80, gelo, sol, atmosfera='#5ff0ff', forca_atmo=1.0, noite=0.42, seg=176, ring=88))
    pecas.append(planeta(direcao(-30, 20) * 72, 3.2, lambda n: gradiente([(0, '#c9d6ea'), (1, '#f7fbff')], 0.5 + 0.5 * fbm(n * 3)),
                         direcao(-130, 35), atmosfera='#e6f3ff', forca_atmo=0.5))
    pecas.append(estrelas(rnd, 1100, peso=lambda d: 1.0 if d.y > -0.05 else 0.0))
    pecas.append(cintilantes(rnd, 22, cor='#e9fbff', peso=lambda d: 1.0 if d.y > 0.12 else 0.0))
    return exportar_cenario('cenario-aurora', pecas)


def nebulosa():
    """Nebulosa colorida: nuvens rosa, violeta e azuis, aglomerados de estrelas e um planetinha."""
    reset()
    rnd = random.Random('nebulosa')

    def nuvem(d):
        return max(0.0, fbm(d * 1.4 + Vector((1, 7, 3)), 5) + 0.12)

    def ceu(d):
        yaw, pitch = angulos(d)
        c = gradiente([(-90, '#06041a'), (-30, '#0c0828'), (0, '#1a0f3d'), (90, '#0a0626')], pitch)
        sobe = 0.35 + 0.65 * suave(-35, 25, pitch)
        n1 = nuvem(d) * sobe
        n2 = max(0.0, fbm(d * 1.8 + Vector((9, 2, 5)), 4) + 0.05) * sobe
        n3 = max(0.0, fbm(d * 2.4 + Vector((4, 4, 8)), 3)) * sobe
        c = c + hex_rgb('#8b3bd9') * n1 * 0.85
        c = c + hex_rgb('#ff4fa3') * (n2 ** 1.4) * 1.1
        c = c + hex_rgb('#2fb4ff') * max(0, n3 - 0.15) * 0.9
        c = c + hex_rgb('#ffe1f2') * max(0, n1 * n2 - 0.08) * 1.4
        return c
    pecas = [cupula(ceu, seg=192, ring=96)]
    pecas.append(planeta(direcao(-36, 11) * 66, 4.2, lambda n: gradiente([(0, '#1f8f8a'), (0.6, '#44d4c0'), (1, '#c9fff4')],
                                                                        0.5 + 0.5 * math.sin(n.y * 8 + fbm(n * 3))),
                         direcao(30, 20), atmosfera='#9effea', forca_atmo=0.8))
    pecas.append(estrelas(rnd, 1400, peso=lambda d: 0.35 + 0.65 * min(1.0, nuvem(d) * 2.2)))
    pecas.append(cintilantes(rnd, 30, cor='#fff0fb', peso=lambda d: min(1.0, nuvem(d) * 3)))
    return exportar_cenario('cenario-nebulosa', pecas)


def estacao():
    """Estação espacial sobre um planeta azul: o planeta com mares, terras e nuvens embaixo à
    esquerda, e a estação de anel girando no alto à direita."""
    reset()
    rnd = random.Random('estacao')
    sol = direcao(70, 18)

    def ceu(d):
        yaw, pitch = angulos(d)
        return gradiente([(-90, '#02040d'), (-20, '#050a1d'), (0, '#0b1636'), (25, '#070d26'), (90, '#03050f')], pitch)
    pecas = [cupula(ceu)]

    def terra(n):
        relevo = fbm(n * 1.6 + Vector((2, 9, 4)), 4)
        if relevo > 0.12:
            c = gradiente([(0.12, '#c9b56d'), (0.2, '#4caf50'), (0.45, '#2e7d32'), (0.7, '#8d6e4f')], relevo)
        else:
            c = gradiente([(-0.6, '#0d3d91'), (-0.1, '#1a5fd0'), (0.12, '#3d8ee8')], relevo)
        polo = suave(0.82, 0.9, abs(n.y))
        c = mistura(c, hex_rgb('#f2f7ff'), polo)
        nuvem = fbm(n * 2.4 + Vector((7, 1, 3)), 4)
        return mistura(c, hex_rgb('#ffffff'), suave(0.18, 0.42, nuvem) * 0.9)
    pecas.append(planeta(direcao(-38, -22) * 54, 29, terra, sol, atmosfera='#6cc6ff', forca_atmo=1.1, noite=0.1,
                         seg=160, ring=80))
    pecas += estacao_espacial(direcao(32, 13) * 60, sol)
    pecas.append(estrelas(rnd, 1200))
    pecas.append(cintilantes(rnd, 20, peso=lambda d: 1.0 if d.y > 0 else 0.2))
    return exportar_cenario('cenario-estacao', pecas)


def estacao_espacial(centro, sol):
    """Estação de anel: cubo central, raios, anel com janelas e dois painéis solares. Sem luz,
    com o sombreamento chapado de cada face já pintado (face virada para o sol mais clara)."""
    import bpy
    from lib_espaco import box, cyl, torus
    centro = Vector(centro)
    k = 1.0
    pecas = []
    eixo = Vector((0.2, 0.9, 0.35)).normalized()
    m = mat_sem_luz('ceu')

    def peca(o, base):
        o.data.materials.clear()
        o.data.materials.append(m)
        o.data.update()
        bpy.context.view_layer.update()
        me = o.data
        attr = me.color_attributes.new('Cor', 'BYTE_COLOR', 'CORNER')
        mw = o.matrix_world.to_3x3()
        for poly in me.polygons:
            n = b2g(mw @ poly.normal).normalized()
            luz = 0.42 + 0.58 * max(0.0, n.dot(sol.normalized()))
            c = hex_rgb(base) * luz
            for li in poly.loop_indices:
                attr.data[li].color_srgb = (min(1, c[0]), min(1, c[1]), min(1, c[2]), 1.0)
        return o
    rot = eixo.to_track_quat('Z', 'Y').to_euler()
    anel = torus(7.0 * k, 0.75 * k, g2b(centro), None, seg=48, rseg=10)
    hub = cyl(1.4 * k, 3.4 * k, g2b(centro), None, verts=16)
    pecas += [peca(anel, '#d9dee8'), peca(hub, '#eef1f6')]
    for i in range(4):
        a = i * math.pi / 2
        raio = cyl(0.25 * k, 6.0 * k, (0, 0, 0), None, verts=8)
        raio.rotation_euler = (math.pi / 2, 0, a)
        raio.location = g2b(centro)
        pecas.append(peca(raio, '#aab3c4'))
    for s in (-1, 1):
        painel = box((5.5 * k, 0.12, 2.4 * k), (0, 0, s * 4.6 * k), None, bevel=0.05)
        painel.location = g2b(centro) + Vector((0, 0, s * 4.6 * k))
        pecas.append(peca(painel, '#2f5fd8'))
    luzes = []
    for i in range(10):
        a = 2 * math.pi * i / 10
        o = box((0.5, 0.5, 0.5), g2b(centro) + Vector((math.cos(a) * 7.0, math.sin(a) * 7.0, 0.6)), None, bevel=0.1)
        luzes.append(peca(o, '#ffe08a'))
    pecas += luzes
    grupo = juntar(pecas, 'estacao')
    # gira a estação inteira em volta do próprio centro
    c = g2b(centro)
    grupo.location = (0, 0, 0)
    bpy.context.view_layer.update()
    for v in grupo.data.vertices:
        p = Vector(v.co) - c
        p.rotate(rot)
        v.co = p + c
    grupo.data.update()
    return [grupo]


CENARIOS = {
    'cenario-aurora': aurora,
    'cenario-orbita': orbita,
    'cenario-nebulosa': nebulosa,
    'cenario-estacao': estacao,
}

if __name__ == '__main__':
    pedidas = [a for a in sys.argv[1:] if not a.startswith('-')] or list(CENARIOS)
    for pid in pedidas:
        CENARIOS[pid]()
