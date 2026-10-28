"""Os ingredientes das receitas, comprados na ilha: o que vai para o forno, o fogão e a fogueira.

Um nó por arquivo, com o nome do arquivo e a base na origem:
  fuba · leite · ovo · polvilho · queijo · peixe · coco · limao · cacau

Receitas da proposta: bolo de fubá (fubá, leite, ovo), pão de queijo (polvilho, queijo), peixe com
coco (peixe, coco, limão) e chocolate quente (cacau, leite).
"""
import random

from lib_extra import *

lib_q.PALETTE.update({
    'fuba': ('#f6c33a', 0.9, None, 0),
    'fubaClaro': ('#ffe08a', 0.9, None, 0),
    'sacoPano': ('#efe0c2', 0.95, None, 0),
    'sacoPanoEscuro': ('#d9c296', 0.95, None, 0),
    'polvilho': ('#fdfcf8', 0.95, None, 0),
    'papelKraft': ('#d2a46c', 0.9, None, 0),
    'papelKraftEscuro': ('#b8874f', 0.9, None, 0),
    'rotuloAzul': ('#5b8fd6', 0.7, None, 0),
    'mandioca': ('#8a5a33', 0.85, None, 0),
    'leite': ('#fdfdfb', 0.35, None, 0),
    'vidroLeite': ('#d9edf6', 0.15, None, 0),
    'tampaAzul': ('#3f86e0', 0.4, None, 0),
    'rotuloLeite': ('#8fcaf0', 0.6, None, 0),
    'ovoBranco': ('#fff8ee', 0.55, None, 0),
    'ovoCaipira': ('#e9b27e', 0.6, None, 0),
    'caixaOvo': ('#ddd1ba', 0.95, None, 0),
    'caixaOvoEscura': ('#c9b998', 0.95, None, 0),
    'queijo': ('#f9eccb', 0.75, None, 0),
    'queijoCasca': ('#ecd59f', 0.75, None, 0),
    'queijoMiolo': ('#fffbef', 0.7, None, 0),
    'peixeCru': ('#a9c7e0', 0.4, None, 0),
    'peixeCruEscuro': ('#5f86b8', 0.4, None, 0),
    'peixeCruBarriga': ('#f2f6f8', 0.4, None, 0),
    'barbatanaCru': ('#87a9cc', 0.5, None, 0),
    'folhaBananeira': ('#4fae55', 0.7, None, 0),
    'folhaBananeiraClara': ('#79c765', 0.7, None, 0),
    'cocoFibra': ('#94653e', 0.95, None, 0),
    'cocoOlho': ('#3d2516', 0.9, None, 0),
    'limaoEscuro': ('#73b33c', 0.55, None, 0),
    'limaoPolpa': ('#d6ee7e', 0.45, None, 0),
    'limaoBranco': ('#f7fbe2', 0.7, None, 0),
    'cacau': ('#e0702c', 0.6, None, 0),
    'cacauClaro': ('#f39a45', 0.6, None, 0),
    'cacauMiolo': ('#f7c27a', 0.8, None, 0),
    'cacauPolpa': ('#fffaf0', 0.6, None, 0),
    'amendoa': ('#6b3a26', 0.7, None, 0),
    'amendoaClara': ('#8d5236', 0.7, None, 0),
})


def _milho_desenho(pos, s=1.0):
    """Espiguinha de milho em relevo (a marca do saco de fubá)."""
    x, y, z = pos
    p = [esfera(0.016 * s, (x, y, z + 0.004 * s), 'fuba', escala=(0.62, 0.45, 1.3), seg=10, aneis=7)]
    for lado in (-1, 1):
        f = esfera(0.012 * s, (x + lado * 0.009 * s, y + 0.001, z - 0.008 * s), 'cabinho', escala=(0.45, 0.3, 1.25),
                   seg=8, aneis=5)
        f.rotation_euler = (0, R(-26 * lado), 0)
        p.append(f)
    return p


def fuba():
    """Saco de pano aberto, a boca dobrada para fora, cheio de fubá, com a conchinha de madeira."""
    h, r = 0.13, 0.07

    def dobras(v):
        a = math.atan2(v.y, v.x)
        rr = math.hypot(v.x, v.y)
        if rr < 1e-6:
            return v
        k = 1 + 0.035 * math.sin(7 * a + 0.6) * math.sin(math.pi * min(1.0, v.z / h))
        return Vector((v.x * k, v.y * k, v.z))
    saco = torneado([(0, 0), (0.05, 0), (0.064, 0.008), (0.073, 0.035), (0.074, 0.075), (0.068, 0.105),
                     (0.064, h - 0.006), (0.07, h), (0.078, h + 0.004), (0.074, h + 0.012), (0.064, h + 0.006),
                     (0.058, h - 0.004), (0.056, h - 0.02), (0, h - 0.02)], 'sacoPano', seg=28)
    deformar(saco, dobras)
    pintar_por(saco, lambda c, n: 'sacoPanoEscuro' if c.z > h - 0.008 and math.hypot(c.x, c.y) > 0.062 else None)
    p = [saco]
    # Barbante no pescoço e o laço na frente.
    p.append(torus(0.068, 0.0045, (0, 0, 0.108), 'corda', seg=28, rseg=6))
    laco = []
    for lado in (-1, 1):
        laco.append(torus(0.011, 0.0035, (lado * 0.011, -0.073, 0.104), 'corda', seg=12, rseg=5,
                          rot=(R(80), R(lado * 20), 0)))
        laco.append(tube([(lado * 0.003, -0.074, 0.104), (lado * 0.008, -0.077, 0.09), (lado * 0.012, -0.075, 0.078)],
                         [0.0032, 0.003, 0.0028], 'corda', seg=5))
    laco.append(esfera(0.005, (0, -0.073, 0.106), 'corda', seg=8, aneis=5))
    lib_ilha.place(laco, rot_z=R(-35))
    p += laco
    # O monte de fubá na boca, com uns grãos mais claros.
    monte = torneado([(0.058, h - 0.012), (0.05, h + 0.006), (0.034, h + 0.02), (0.016, h + 0.027), (0, h + 0.029)],
                     'fuba', seg=24)
    rnd = random.Random(8)
    pintar_por(monte, lambda c, n: 'fubaClaro' if rnd.random() < 0.12 else None)
    p.append(monte)
    # Conchinha de madeira enfiada no fubá.
    cabo = tube([(0.012, 0.012, h + 0.012), (0.035, 0.03, h + 0.05), (0.05, 0.042, h + 0.075)], [0.0055, 0.005, 0.0055],
                'madeiraClara', seg=8)
    p.append(cabo)
    p.append(esfera(0.004, (0.05, 0.042, h + 0.077), 'madeiraClara', seg=6, aneis=4))
    # Etiqueta de pano na frente com a espiguinha de milho.
    etq = [lib_q.cushion((0.056, 0.008, 0.048), (0, -0.0745, 0.056), 'papel', puff=0.2, round_=0.3)]
    etq += _milho_desenho((0, -0.081, 0.056), s=1.15)
    lib_ilha.place(etq, rot_z=R(28))
    p += etq
    return p


def polvilho():
    """Saquinho de papel aberto com o polvilho branco, a etiqueta azul e um pouco derramado."""
    h, rb = 0.14, 0.064
    perfil = [(0, 0), (rb, 0), (rb * 1.03, 0.06), (rb, h - 0.022), (rb * 1.0, h - 0.016), (rb * 1.08, h),
              (rb * 1.06, h + 0.006), (rb * 0.95, h - 0.004), (rb * 0.93, h - 0.03), (0, h - 0.03)]
    saco = torneado(perfil, 'papelKraft', seg=4, liso=False)
    saco.rotation_euler = (0, 0, R(45))
    saco.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    saco.select_set(True)
    bpy.context.view_layer.objects.active = saco
    bpy.ops.object.transform_apply(rotation=True)
    deformar(saco, lambda v: Vector((v.x * 1.28, v.y, v.z)))
    bevel_mod(saco, 0.006, 2, angle=60)
    lib_q.flat(saco)
    pintar_por(saco, lambda c, n: 'papelKraftEscuro' if c.z > h - 0.02 else None)
    p = [saco]
    meia = rb / math.sqrt(2)
    # O polvilho: um monte branco e fofo que enche a boca do saco.
    monte = superellipsoid((meia * 2 * 1.28 * 0.9, meia * 2 * 0.9, 0.06), (0, 0, h - 0.03), 'polvilho', e1=0.7, e2=0.3,
                           seg=20, ring=10, flat_bottom=0.5)
    p.append(monte)
    # Etiqueta azul com a mandioca desenhada.
    yf = -meia * 1.03
    p.append(lib_q.cushion((0.07, 0.008, 0.05), (0, yf - 0.001, 0.062), 'rotuloAzul', puff=0.15, round_=0.25))
    raiz = esfera(1, (0, 0, 0), 'mandioca', escala=(0.022, 0.006, 0.0075), seg=10, aneis=6)
    deformar(raiz, lambda v: Vector((v.x, v.y, v.z * (1 - 0.6 * max(0.0, v.x / 0.022)))))
    raiz.rotation_euler = (0, R(-20), 0)
    raiz.location = (0.002, yf - 0.008, 0.064)
    p.append(raiz)
    p.append(esfera(0.0068, (-0.019, yf - 0.009, 0.0565), 'polvilho', escala=(0.5, 0.7, 1), seg=8, aneis=5))
    for k in range(3):
        f = esfera(0.007, (-0.022 + k * 0.006, yf - 0.007, 0.054 + 0.012 + k * 0.002), 'cabinho',
                   escala=(0.4, 0.4, 1.2), seg=6, aneis=4)
        f.rotation_euler = (0, R(-30 + k * 30), 0)
        p.append(f)
    # Um pouquinho derramado na frente.
    p.append(rock((0.03, -meia - 0.04, 0), (0.05, 0.03, 0.014), 'polvilho', seed=3, subdiv=2, rough=0.12))
    p.append(rock((-0.005, -meia - 0.05, 0), (0.022, 0.018, 0.008), 'polvilho', seed=5, subdiv=1, rough=0.12))
    return p


def leite():
    """Garrafinha de vidro de leite com a tampa azul pregueada e a etiqueta com a gota."""
    corpo = torneado([(0, 0), (0.04, 0), (0.046, 0.006), (0.047, 0.03), (0.047, 0.1), (0.044, 0.118),
                      (0.034, 0.138), (0.025, 0.158), (0.024, 0.172), (0.027, 0.176), (0.027, 0.182), (0, 0.182)],
                     'leite', seg=28)
    pintar_por(corpo, lambda c, n: 'vidroLeite' if c.z > 0.142 else None)
    p = [corpo]
    p.append(cyl(0.0505, 0.05, (0, 0, 0.063), 'rotuloLeite', verts=28))
    # Gota de leite em relevo na etiqueta (de frente para a câmera).
    gota = []
    for i in range(24):
        t = 2 * math.pi * i / 24
        x = 0.011 * math.sin(t) * (1 - 0.0 * math.cos(t))
        z = -0.012 * math.cos(t)
        if t < math.pi * 0.45 or t > math.pi * 1.55:
            pass
        x = 0.012 * math.sin(t) * (0.5 - 0.5 * math.cos(t)) ** 0.6
        z = -0.013 * math.cos(t) + 0.004
        gota.append((x, z))
    g = prism(gota, 0.008, (0, 0, 0), 'leite', bevel=0.0015)
    g.rotation_euler = (0, 0, R(-35))
    g.location = (0.031 * math.sin(R(35)), -0.0505 * math.cos(R(35)) - 0.0005, 0.06)
    g.location = (math.cos(R(-58)) * 0.052, math.sin(R(-58)) * 0.052, 0.06)
    g.rotation_euler = (0, 0, R(-58 + 90))
    p.append(g)
    # Tampa pregueada.
    tampa = torneado([(0, 0.176), (0.03, 0.176), (0.031, 0.19), (0.028, 0.196), (0, 0.197)], 'tampaAzul', seg=24)
    deformar(tampa, lambda v: Vector((v.x * (1 + 0.06 * math.cos(12 * math.atan2(v.y, v.x)) * (v.z < 0.192)),
                                      v.y * (1 + 0.06 * math.cos(12 * math.atan2(v.y, v.x)) * (v.z < 0.192)), v.z)))
    p.append(tampa)
    return p


def _ovo(pos, m, h=0.066):
    o = esfera(1, (0, 0, 0), m, escala=(0.026, 0.026, h / 2), seg=14, aneis=8)
    deformar(o, lambda v: Vector((v.x * (1 - 0.18 * max(0.0, v.z / (h / 2))), v.y * (1 - 0.18 * max(0.0, v.z / (h / 2))),
                                  v.z)))
    o.location = (pos[0], pos[1], pos[2] + h / 2)
    return o


def ovo():
    """Caixinha de meia dúzia aberta: ovos caipiras e brancos nos furinhos, a tampa levantada atrás."""
    L, F, A = 0.2, 0.135, 0.036
    base = lib_q.cushion((L, F, A), (0, 0, A / 2), 'caixaOvo', puff=0.0, round_=0.18)
    p = [base]
    # Os bojinhos da cartela na frente e nos lados.
    for i in range(3):
        x = -L / 3 + i * L / 3
        p.append(esfera(0.03, (x, -F / 2 + 0.012, A * 0.55), 'caixaOvo', escala=(1, 0.6, 0.75), seg=12, aneis=7))
    # Pontinhas entre os ovos (a divisória de papelão).
    for i in range(2):
        x = -L / 6 + i * L / 3
        p.append(cyl(0.012, 0.03, (x, 0, A + 0.01), 'caixaOvoEscura', verts=10, r2=0.004))
    cores = ['ovoCaipira', 'ovoBranco', 'ovoCaipira', 'ovoBranco', 'ovoCaipira', 'ovoCaipira']
    k = 0
    for j, y in enumerate((-F / 4 + 0.002, F / 4 - 0.002)):
        for i in range(3):
            x = -L / 3 + i * L / 3
            o = _ovo((x, y, A - 0.022), cores[k], h=0.066 if k % 2 else 0.07)
            o.rotation_euler = (R(4 * (i - 1)), R(5 * (j - 0.5)), 0)
            p.append(o)
            k += 1
    # Tampa aberta para trás, com os bojinhos de dentro e a etiqueta.
    tampa = lib_q.cushion((L, 0.026, F * 0.9), (0, 0, 0), 'caixaOvoEscura', puff=0.0, round_=0.2)
    tampa.rotation_euler = (R(-14), 0, 0)
    tampa.location = (0, F / 2 + 0.018, A + F * 0.4)
    p.append(tampa)
    # Etiqueta da granja no lado de dentro da tampa: um ovo branco e um caipira.
    etq = [lib_q.cushion((0.08, 0.008, 0.05), (0, 0, 0), 'guardanapo', puff=0.2, round_=0.3)]
    etq.append(esfera(0.014, (-0.012, -0.006, 0.0), 'ovoBranco', escala=(0.8, 0.4, 1.0), seg=10, aneis=6))
    etq.append(esfera(0.012, (0.014, -0.006, -0.002), 'ovoCaipira', escala=(0.8, 0.4, 1.0), seg=10, aneis=6))
    for o in etq:
        o.location.y -= 0.0
    girar(etq, (R(-14), 0, 0), mover=(0, F / 2 + 0.018 - 0.016, A + F * 0.42))
    p += etq
    return p


def queijo():
    """Queijo minas na tábua redonda, sem uma fatia; a fatia cortada fica na frente."""
    r, h = 0.1, 0.062
    perfil = [(0, 0), (0.09, 0), (0.099, 0.006), (0.102, 0.028), (0.1, 0.052), (0.092, 0.06), (0.07, h),
              (0.045, h + 0.001), (0.02, h + 0.0015), (0, h + 0.0015)]
    meio = R(-62)
    abre = R(26)
    tabua = cyl(0.145, 0.018, (0, 0.0, 0.009), 'tabua', verts=32, bevel=0.004)
    p = [tabua]
    roda = setor_torneado(perfil, meio + abre, meio - abre + 2 * math.pi, 'queijo', 'queijoMiolo', seg=30,
                          pos=(0.012, 0.02, 0.018))

    def tramado(c, n):
        # A marca da forma de cesto no tampo do queijo minas.
        if n.z > 0.9 and c.z > 0.018 + h - 0.004:
            a = math.atan2(c.y - 0.02, c.x - 0.012)
            rr = math.hypot(c.x - 0.012, c.y - 0.02)
            return 'queijoCasca' if (int(a / R(12)) + int(rr / 0.024)) % 2 else None
        return None
    pintar_por(roda, tramado)
    p.append(roda)
    fatia = setor_torneado(perfil, meio - abre * 0.8, meio + abre * 0.8, 'queijo', 'queijoMiolo', seg=8)
    pintar_por(fatia, lambda c, n: 'queijoCasca' if n.z > 0.9 and c.z > h - 0.004 and
               (int(math.atan2(c.y, c.x) / R(12)) + int(math.hypot(c.x, c.y) / 0.024)) % 2 else None)
    # A fatia puxada para fora do vão, um pouco virada: dá para ver o corte da roda atrás dela.
    fatia.rotation_euler = (0, 0, R(16))
    fatia.location = (0.012 + math.cos(meio) * 0.05 + 0.012, 0.02 + math.sin(meio) * 0.05, 0.018)
    p.append(fatia)
    # Furinhos rasos no miolo da roda (bolinhas mais escuras encostadas no corte).
    return p


def peixe():
    """O peixe cru inteiro, deitado de lado numa folha de bananeira."""
    a, b, c = 0.11, 0.042, 0.022

    def fusiforme(v):
        t = v.x / a
        k = 1 - 0.55 * max(0.0, t) ** 1.4
        return Vector((v.x, v.y * k + 0.006 * (1 - t * t), v.z * (1 - 0.4 * max(0.0, t) ** 1.2)))
    corpo = esfera(1, (0, 0, 0), 'peixeCru', escala=(a, b, c), seg=20, aneis=12)
    deformar(corpo, fusiforme)

    def cores(cc, n):
        if cc.y > 0.016:
            return 'peixeCruEscuro'
        if cc.y < -0.014:
            return 'peixeCruBarriga'
        return None
    pintar_por(corpo, cores)
    corpo.location = (0, 0, c + 0.006)
    p = [corpo]
    z0 = c + 0.006
    # Cauda, barbatana de cima e a de baixo, deitadas.
    cauda = [(0, 0.008), (0.05, 0.04), (0.04, 0.0), (0.05, -0.04), (0, -0.008)]
    p.append(prism(cauda, 0.008, (a - 0.014, 0, z0), 'barbatanaCru', rot=(R(90), 0, 0), bevel=0.002))
    p.append(prism([(-0.03, 0), (-0.005, 0.026), (0.03, 0.018), (0.045, 0)], 0.006, (0, 0.034, z0), 'barbatanaCru',
                   rot=(R(-90), 0, 0), bevel=0.0015))
    p.append(prism([(0.0, 0), (0.025, -0.016), (0.04, 0)], 0.006, (0.02, -0.03, z0), 'barbatanaCru',
                   rot=(R(-90), 0, 0), bevel=0.0015))
    # Barbatana do peito e a linha da guelra, por cima.
    nad = esfera(0.02, (-0.045, -0.006, z0 + c * 0.82), 'barbatanaCru', escala=(1, 0.45, 0.25), seg=10, aneis=5)
    nad.rotation_euler = (0, 0, R(-25))
    p.append(nad)
    p.append(torus(0.03, 0.0022, (-0.088, 0.0, z0 + 0.008), 'peixeCruEscuro', seg=12, rseg=4, arc=80,
                   rot=(R(-10), 0, R(-40))))
    p += olho_fofo((-0.08, 0.008, z0 + c * 0.85), (-0.25, 0.1, 1), 0.011, achatar=0.5)
    lib_ilha.place(p, scale=1.3)
    # A folha de bananeira por baixo.
    p.append(leaf((-0.19, 0.0, 0.004), R(0), 0.38, 0.105, 'folhaBananeira', lift=0.0, droop=0.0, fold=0.06, n=10))
    p.append(tube([(-0.19, 0, 0.004), (0.2, 0, 0.005)], [0.0035, 0.002], 'folhaBananeiraClara', seg=5))
    return p


def coco():
    """Coco seco inteiro, com os três olhinhos e um furado para a água, e a metade partida na frente."""
    # O eixo do coco (dos olhos para a outra ponta) fica em z enquanto se monta: as fibras seguem os meridianos.
    inteiro = esfera(1, (0, 0, 0), 'coco', escala=(0.06, 0.06, 0.068), seg=24, aneis=12)
    rnd = random.Random(11)
    # Três quinas suaves ao longo do coco e a ponta dos olhos um pouco mais fina.
    deformar(inteiro, lambda v: Vector((v.x * (1 + 0.04 * math.cos(3 * math.atan2(v.y, v.x))) *
                                        (1 - 0.12 * max(0.0, v.z / 0.068) ** 2),
                                        v.y * (1 + 0.04 * math.cos(3 * math.atan2(v.y, v.x))) *
                                        (1 - 0.12 * max(0.0, v.z / 0.068) ** 2), v.z)))
    # As fibras: faixas mais claras ao longo do comprimento, de ponta a ponta.
    pintar_por(inteiro, lambda c, n: 'cocoFibra' if int((math.atan2(c.y, c.x) + math.pi) / (2 * math.pi) * 24) % 3 == 0
               else None)
    olhos = []
    for k in range(3):
        ang = 2 * math.pi * k / 3 + R(90)
        x, y = math.cos(ang) * 0.016, math.sin(ang) * 0.016
        z = 0.068 * math.sqrt(max(0.0, 1 - (x / 0.053) ** 2 - (y / 0.053) ** 2)) - 0.001
        nrm = Vector((x / 0.053 ** 2, y / 0.053 ** 2, z / 0.068 ** 2)).normalized()
        rot = Vector((0, 0, 1)).rotation_difference(nrm).to_euler()
        if k == 0:
            o = esfera(0.008, tuple(Vector((x, y, z)) + nrm * 0.0005), 'cocoOlho', escala=(1, 1, 0.5), seg=10, aneis=6)
            o.rotation_euler = rot
            olhos.append(o)
            o = torus(0.0085, 0.0028, tuple(Vector((x, y, z)) + nrm * 0.0015), 'cocoFibra', seg=12, rseg=4)
            o.rotation_euler = rot
            olhos.append(o)
        else:
            o = esfera(0.0062, tuple(Vector((x, y, z)) + nrm * 0.0005), 'cocoOlho', escala=(1, 1, 0.45), seg=8, aneis=5)
            o.rotation_euler = rot
            olhos.append(o)
    olhar = Vector((0.45, -0.75, 0.55)).normalized()
    p = [inteiro] + olhos
    girar(p, Vector((0, 0, 1)).rotation_difference(olhar).to_euler(), mover=(0.03, 0.04, 0.06))
    # A metade partida, com a casca, a carne branca e o oco.
    casca = torneado([(0, 0), (0.03, 0.002), (0.05, 0.016), (0.058, 0.034), (0.06, 0.048), (0.057, 0.05),
                      (0.052, 0.05), (0.047, 0.046), (0.045, 0.034), (0.034, 0.02), (0.016, 0.013), (0, 0.012)],
                     'coco', seg=24)
    pintar_por(casca, lambda c, n: 'cocoBranco' if math.hypot(c.x, c.y) < 0.055 and c.z > 0.008 and n.z > -0.2 else
               ('cocoFibra' if c.z < 0.03 and rnd.random() < 0.3 else None))
    casca.rotation_euler = (R(28), R(-6), 0)
    casca.location = (-0.03, -0.055, 0.016)
    p.append(casca)
    return p


def limao():
    """Limão inteiro com a folhinha e a metade cortada mostrando os gomos."""
    inteiro = esfera(1, (0, 0, 0), 'limao', escala=(0.05, 0.042, 0.042), seg=18, aneis=12)
    deformar(inteiro, lambda v: Vector((v.x * (1 + 0.12 * max(0.0, abs(v.x) / 0.05 - 0.75) * 4), v.y, v.z)))
    inteiro.rotation_euler = (0, 0, R(25))
    inteiro.location = (0.03, 0.045, 0.042)
    p = [inteiro]
    bpy.context.view_layer.update()
    for s in (-1, 1):
        ponta = inteiro.matrix_world @ Vector((s * 0.055, 0, 0))
        p.append(esfera(0.007, tuple(ponta), 'limaoEscuro', seg=8, aneis=5))
    cab = inteiro.matrix_world @ Vector((-0.058, 0, 0.004))
    p.append(tube([tuple(cab), tuple(cab + Vector((-0.012, -0.004, 0.01)))], [0.003, 0.0025], 'cabinho', seg=5))
    p.append(leaf(tuple(cab + Vector((-0.012, -0.004, 0.01))), R(140), 0.06, 0.022, 'folha', lift=0.02, droop=0.02,
                  fold=0.3, n=6))
    # A metade cortada: casca, a parte branca e oito gomos em relevo.
    r, hz = 0.044, 0.034
    meia = torneado([(0, 0), (0.024, 0.002), (0.038, 0.012), (r, 0.026), (r, hz - 0.003), (r - 0.002, hz), (0, hz)],
                    'limao', seg=24)
    pintar_por(meia, lambda c, n: 'limaoBranco' if n.z > 0.8 and c.z > hz - 0.002 else None)
    pecas = [meia]
    for k in range(8):
        a0 = 2 * math.pi * k / 8
        g = setor_torneado([(0, hz - 0.003), (0.032, hz - 0.003), (0.0335, hz + 0.0015), (0.03, hz + 0.0045),
                            (0.015, hz + 0.006), (0, hz + 0.0055)], a0 + 0.07, a0 + 2 * math.pi / 8 - 0.07,
                           'limaoPolpa', None, seg=5)
        meio = a0 + math.pi / 8
        g.location = (math.cos(meio) * 0.0035, math.sin(meio) * 0.0035, 0)
        pecas.append(g)
    pecas.append(esfera(0.0035, (0, 0, hz + 0.004), 'limaoBranco', escala=(1, 1, 0.6), seg=8, aneis=4))
    girar(pecas, (R(22), 0, 0), mover=(-0.035, -0.04, 0.012))
    p += pecas
    return p


def _vagem(L=0.11, r=0.048):
    """O fruto do cacau deitado em x: cinco gomos fundos ao longo do comprimento, as pontas finas."""
    o = esfera(1, (0, 0, 0), 'cacau', escala=(L, r, r), seg=30, aneis=14)

    def forma(v):
        t = v.x / L
        a = math.atan2(v.z, v.y)
        afina = 1 - 0.22 * max(0.0, t) ** 2 - 0.1 * max(0.0, -t) ** 2
        k = afina * (1 + 0.075 * math.cos(5 * a) + 0.02 * math.cos(10 * a))
        x = v.x * (1 + 0.15 * max(0.0, t) ** 3)
        return Vector((x, v.y * k, v.z * k))
    deformar(o, forma)
    return o


def cacau():
    """O fruto do cacau inteiro e a outra metade aberta, com as sementes na polpa branca."""
    inteiro = _vagem()
    inteiro.rotation_euler = (R(15), 0, R(20))
    inteiro.location = (0.03, 0.06, 0.047)
    p = [inteiro]
    bpy.context.view_layer.update()
    cab = inteiro.matrix_world @ Vector((-0.112, 0, 0))
    p.append(tube([tuple(cab), tuple(cab + Vector((-0.02, -0.006, 0.006)))], [0.007, 0.006], 'casulo', seg=7))
    # A metade aberta: corta a vagem ao meio e fecha o corte com o miolo claro.
    meia = _vagem()
    bm = bmesh.new()
    bm.from_mesh(meia.data)
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0.006),
                                 plane_no=(0, 0, 1), clear_outer=True)
    borda = [e for e in bm.edges if e.is_boundary]
    novas = bmesh.ops.holes_fill(bm, edges=borda, sides=0)['faces']
    for f in novas:
        f.material_index = len(meia.data.materials)
    bm.to_mesh(meia.data)
    bm.free()
    meia.data.materials.append(lib_q.mat('cacauMiolo'))
    meia.data.update()
    for pol in meia.data.polygons:
        if pol.normal.z > 0.99 and pol.center.z > 0.004:
            pol.use_smooth = False
            pol.material_index = len(meia.data.materials) - 1
    meia.data.set_sharp_from_angle(angle=R(50))
    pecas = [meia]
    # Sementes envoltas na polpa branca, em três fileiras, e duas amêndoas à mostra.
    rnd = random.Random(6)
    for fila, (y, n) in enumerate(((-0.022, 5), (0.0, 6), (0.022, 5))):
        for i in range(n):
            x = -0.07 + 0.14 * (i + 0.5 * (fila % 2 == 0) + 0.25) / n
            sx = 1 - 0.3 * (abs(x) / 0.08) ** 2
            o = esfera(0.0128, (x, y * sx, 0.011), 'cacauPolpa', escala=(1.2, 0.85, 0.8), seg=10, aneis=6)
            o.rotation_euler = (0, 0, R(rnd.uniform(-20, 20)))
            pecas.append(o)
    for x, y in ((0.012, -0.01), (-0.03, 0.012)):
        o = esfera(0.0115, (x, y, 0.019), 'amendoaClara', escala=(1.25, 0.8, 0.6), seg=10, aneis=6)
        o.rotation_euler = (0, 0, R(30))
        pecas.append(o)
    girar(pecas, (R(12), 0, 0), mover=(-0.025, -0.06, 0.04))
    # Duas amêndoas soltas na frente.
    for k, (x, y) in enumerate(((0.085, -0.075), (0.105, -0.05))):
        o = esfera(0.012, (x, y, 0.007), 'amendoa' if k else 'amendoaClara', escala=(1.3, 0.85, 0.6), seg=10, aneis=6)
        o.rotation_euler = (0, 0, R(40 + 50 * k))
        p.append(o)
    p += pecas
    return p


FUNCOES = {'fuba': fuba, 'leite': leite, 'ovo': ovo, 'polvilho': polvilho, 'queijo': queijo, 'peixe': peixe,
           'coco': coco, 'limao': limao, 'cacau': cacau}
ITENS = [(pid, (lambda pid=pid: {'nos': {pid: FUNCOES[pid]()}, 'grupo': 'ingredientes'})) for pid in FUNCOES]

if __name__ == '__main__':
    rodar(ITENS)
