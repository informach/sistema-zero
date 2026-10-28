"""As iscas de pesca, compradas na ilha e levadas no bolso para a vara de pescar.

Um nó por arquivo, com o nome do arquivo e a base na origem:
  isca-minhoca (latinha aberta com terra e três minhocas simpáticas)
  isca-pena (isca colorida de penas, com a argola da linha e o anzol de ponta redonda)
"""
from lib_extra import *

lib_q.PALETTE.update({
    'lata': ('#c9d1d8', 0.35, None, 0),
    'lataEscura': ('#9aa5b0', 0.4, None, 0),
    'rotuloLata': ('#58b05a', 0.7, None, 0),
    'rotuloLataClaro': ('#fff2c4', 0.7, None, 0),
    'terra': ('#6b4a33', 0.95, None, 0),
    'terraClara': ('#8a6446', 0.95, None, 0),
    'minhoca': ('#f58fa6', 0.6, None, 0),
    'minhocaAnel': ('#e9708e', 0.6, None, 0),
    'iscaCabeca': ('#e0584f', 0.35, None, 0),
    'iscaCorpo': ('#f6c33a', 0.4, None, 0),
    'penaAzul': ('#4fa3e8', 0.8, None, 0),
    'penaVerde': ('#5cc97a', 0.8, None, 0),
    'penaRosa': ('#ff7fae', 0.8, None, 0),
    'penaLaranja': ('#ff9a3d', 0.8, None, 0),
    'penaRoxa': ('#9b6fd0', 0.8, None, 0),
    'olhoAmarelo': ('#ffe14f', 0.4, None, 0),
})


def _minhoca(pts, r=0.0075, rosto=True, anel_em=0.35):
    """Minhoca: tubo macio com a ponta redonda, o anel mais escuro e, na cabeça, olhinhos e sorriso."""
    p = [tube(pts, [r] * len(pts), 'minhoca', seg=10)]
    p.append(esfera(r, pts[-1], 'minhoca', seg=10, aneis=6))
    # O anel (clitelo) um pouco mais grosso e mais escuro.
    i = max(1, int(len(pts) * anel_em))
    a, b = Vector(pts[i - 1]), Vector(pts[i])
    d = (b - a).normalized()
    anel = torus(r * 0.85, r * 0.45, tuple((a + b) / 2), 'minhocaAnel', seg=12, rseg=6)
    anel.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
    p.append(anel)
    if rosto:
        ponta = Vector(pts[-1])
        ant = Vector(pts[-2])
        d = (ponta - ant).normalized()
        frente = Vector((0, -1, 0))
        frente = (frente - d * frente.dot(d)).normalized()
        lado = d.cross(frente).normalized()
        for s in (-1, 1):
            q = ponta + frente * r * 0.82 + lado * s * r * 0.42 + d * r * 0.2
            p += olho_fofo(tuple(q), tuple(frente + d * 0.2), r * 0.3, m_branco=None, achatar=0.6, seg=8)
        boca = [tuple(ponta + frente * r * 0.9 - d * r * 0.35 + lado * s * r * 0.3 - d * r * 0.12 * (1 - abs(s)))
                for s in (-1, 0, 1)]
        p.append(tube(boca, [r * 0.12] * 3, 'olhoPreto', seg=4))
        for s in (-1, 1):
            q = ponta + frente * r * 0.7 + lado * s * r * 0.75 - d * r * 0.15
            b_ = esfera(r * 0.22, tuple(q), 'bochechaRosa', escala=(1, 1, 0.5), seg=6, aneis=4)
            b_.rotation_euler = Vector((0, 0, 1)).rotation_difference(frente + lado * s * 0.6).to_euler()
            p.append(b_)
    return p


def isca_minhoca():
    """Latinha aberta, a tampa dobrada para trás, cheia de terra, com três minhocas espiando."""
    r, h = 0.045, 0.07
    lata = torneado([(0, 0), (r - 0.003, 0), (r, 0.003), (r, 0.012), (r + 0.002, 0.015), (r, 0.018), (r, h - 0.012),
                     (r + 0.002, h - 0.009), (r, h - 0.006), (r, h), (r - 0.003, h), (r - 0.003, h - 0.01),
                     (0, h - 0.01)], 'lata', seg=28)
    p = [lata]
    p.append(torus(r, 0.0036, (0, 0, h), 'lataEscura', seg=28, rseg=6))
    # Rótulo verde com uma faixa creme e uma minhoca desenhada.
    p.append(cyl(r + 0.0035, 0.032, (0, 0, 0.036), 'rotuloLata', verts=28))
    p.append(cyl(r + 0.0068, 0.009, (0, 0, 0.036), 'rotuloLataClaro', verts=28))
    desenho = []
    for i in range(7):
        t = i / 6
        desenho.append((-0.014 + 0.028 * t, 0.0, 0.004 * math.sin(t * 2 * math.pi)))
    frente = R(-58)
    d = tube(desenho, [0.0026] * 7, 'minhoca', seg=6)
    d.rotation_euler = (0, 0, frente + R(90))
    d.location = (math.cos(frente) * (r + 0.0094), math.sin(frente) * (r + 0.0094), 0.036)
    p.append(d)
    # A terra fofa por cima, com uns torrões.
    p.append(torneado([(0, h - 0.006), (r - 0.004, h - 0.006), (r - 0.012, h + 0.004), (0, h + 0.009)], 'terra',
                      seg=24))
    for k, (a, rr) in enumerate(((0.4, 0.02), (2.2, 0.026), (3.6, 0.018), (5.0, 0.028))):
        p.append(rock((math.cos(a) * rr, math.sin(a) * rr, h + 0.002), (0.012, 0.01, 0.007), 'terraClara', seed=k,
                      subdiv=1, rough=0.2))
    # A tampa aberta, dobrada para trás.
    tampa = cyl(r - 0.001, 0.003, (0, 0, 0), 'lataEscura', verts=28)
    tampa.location = (0, r - 0.001, 0)
    pecas = [tampa]
    girar(pecas, (R(-75), 0, 0), centro=(0, 0, 0), mover=(0, r + 0.001, h + 0.002))
    p += pecas
    # As minhocas: uma de pé acenando, uma deitada na borda, uma pequena espiando.
    a = []
    for i in range(8):
        t = i / 7
        a.append((-0.006 + 0.01 * math.sin(t * 2.6), -0.004 - 0.008 * t, h + 0.004 + t * 0.07))
    p += _minhoca(a, r=0.0078)
    b = []
    for i in range(9):
        t = i / 8
        ang = R(-20) - t * R(70)
        rr = 0.02 + t * 0.04
        b.append((math.cos(ang) * rr * 0.8 + 0.01, math.sin(ang) * rr - 0.004, h + 0.008 + 0.012 * math.sin(t * math.pi)
                  - max(0.0, t - 0.7) * 0.08))
    p += _minhoca(b, r=0.0072)
    c = []
    for i in range(5):
        t = i / 4
        c.append((-0.024 + 0.004 * t, 0.012 - 0.006 * t, h + 0.004 + t * 0.03))
    p += _minhoca(c, r=0.0068)
    return p


def _lamina(base, yaw, comprimento, largura, m, lift, n=8):
    """Lâmina de pena em gota (a ponta redonda), dobrada de leve na haste."""
    bm = bmesh.new()
    cy, sy = math.cos(yaw), math.sin(yaw)
    linhas = []
    for i in range(n + 1):
        t = i / n
        w = largura * math.sin(math.pi * (0.12 + 0.88 * t) ** 0.8) ** 0.7 * (0.35 + 0.65 * t ** 0.5)
        if i == n:
            w = 0.0
        cx, cyy = base[0] + cy * comprimento * t, base[1] + sy * comprimento * t
        z = base[2] + lift * t
        linhas.append([bm.verts.new((cx - sy * w, cyy + cy * w, z - w * 0.25)), bm.verts.new((cx, cyy, z)),
                       bm.verts.new((cx + sy * w, cyy - cy * w, z - w * 0.25))])
    for a, b in zip(linhas, linhas[1:]):
        bm.faces.new((a[0], b[0], b[1], a[1]))
        bm.faces.new((a[1], b[1], b[2], a[2]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('pena', bm, m)
    lib_q.smooth(o)
    return o


def _pena(base, yaw, comprimento, largura, m, lift=0.01, inclina=0.0):
    """Pena: lâmina macia em gota com a haste branca no meio."""
    f = _lamina(base, yaw, comprimento, largura, m, lift)
    ponta = (base[0] + math.cos(yaw) * comprimento * 0.9, base[1] + math.sin(yaw) * comprimento * 0.9,
             base[2] + lift * 0.9 + inclina * comprimento * 0.9 - 0.004 * 0.81)
    meio = ((base[0] + ponta[0]) / 2, (base[1] + ponta[1]) / 2, (base[2] + ponta[2]) / 2 + 0.0015)
    haste = tube([base, meio, ponta], [0.0016, 0.0013, 0.0008], 'linha', seg=4)
    return [f, haste]


def isca_pena():
    """Isca de penas: cabeça vermelha com olho grande, corpinho amarelo e um leque de penas coloridas."""
    p = []
    z = 0.024
    # Cabeça e corpo ao longo de x (a cabeça para −x).
    cab = esfera(0.02, (-0.045, 0, z), 'iscaCabeca', escala=(1.05, 0.95, 0.95), seg=16, aneis=10)
    p.append(cab)
    corpo = torneado([(0, 0), (0.016, 0.004), (0.017, 0.02), (0.012, 0.04), (0.008, 0.05), (0, 0.052)], 'iscaCorpo',
                     seg=16)
    corpo.rotation_euler = (0, R(90), 0)
    corpo.location = (-0.04, 0, z)
    p.append(corpo)
    # Listras no corpo.
    for k, x in enumerate((-0.022, -0.008)):
        anel = torus(0.0155 - 0.002 * k, 0.0026, (x, 0, z), 'iscaCabeca', seg=16, rseg=5, rot=(0, R(90), 0))
        p.append(anel)
    # Olho grande dos dois lados (amarelo com pupila).
    for s in (-1, 1):
        n = Vector((-0.35, s * 1, 0.25)).normalized()
        c = Vector((-0.045, 0, z)) + Vector((n.x * 0.021, n.y * 0.019, n.z * 0.019))
        p += olho_fofo(tuple(c), tuple(n), 0.0085, m_branco='olhoAmarelo', pupila=0.55, achatar=0.5, seg=10)
    # Argola da linha no nariz.
    p.append(torus(0.007, 0.0018, (-0.07, 0, z + 0.002), 'metal', seg=12, rseg=5, rot=(R(90), 0, 0)))
    # O leque de penas saindo de trás, em camadas.
    cores = ['penaAzul', 'penaVerde', 'penaRosa', 'penaLaranja', 'penaRoxa']
    for k, m in enumerate(cores):
        yaw = R(-48 + 24 * k)
        p += _pena((0.002, 0, z + 0.001 + 0.0015 * (k % 2)), yaw, 0.08 - 0.008 * abs(k - 2), 0.024, m, lift=0.01)
    for k, m in enumerate(('penaRosa', 'penaAzul', 'penaLaranja')):
        yaw = R(-22 + 22 * k)
        p += _pena((0.004, 0, z + 0.008), yaw, 0.058, 0.018, m, lift=0.02)
    # Anzol de ponta redonda (é de brinquedo), deitado ao lado do corpo.
    gancho = [(-0.01, 0.0, z - 0.012)]
    for i in range(1, 10):
        t = i / 9
        a = math.pi * t * 1.15
        gancho.append((-0.01 + 0.03 * t, -0.012 - 0.012 * math.sin(a), z - 0.012 - 0.01 * math.sin(a * 0.5)))
    p.append(tube(gancho, [0.0022] * len(gancho), 'metal', seg=6))
    p.append(esfera(0.0035, gancho[-1], 'metal', seg=8, aneis=5))
    return p


ITENS = [('isca-minhoca', lambda: {'nos': {'isca-minhoca': isca_minhoca()}, 'grupo': 'iscas'}),
         ('isca-pena', lambda: {'nos': {'isca-pena': isca_pena()}, 'grupo': 'iscas'})]

if __name__ == '__main__':
    rodar(ITENS)
