"""Ajudantes dos Lumis e do borrão do Cinza (Blender sem tela, `bpy` do PyPI).

Mesmas convenções do Zappy (`arte/zappy/zappy.py`): no Blender z é para cima e a FRENTE olha para
-Y (o exportador converte para o y para cima do three.js e a frente vira +Z). Escala de autor igual
à do Zappy: o jogo reduz os dois com a mesma escala (0,3), então a fila de prévia já mostra o
tamanho certo de um ao lado do outro.

O que todo Lumi tem (o DNA de luz):
- um coraçãozinho de luz na barriga e algum detalhe aceso, no material `luz` (o jogo pulsa o
  `emissiveIntensity` dele e acende mais à noite, como a bunda do Zappy);
- olhos grandes pintados por cima do corpo (`olho` e `pupila` separados, para o jogo poder
  trocar a cor) e bochechas (`bochecha`);
- formas redondas e macias;
- as animações em laço `parado`, `pular`, `andar`, `trabalhar` e `feliz`;
- os raros ganham faíscas girando em volta (`faisca`).

As partes que se mexem são objetos separados presos numa raiz vazia (sem esqueleto): corpo
(estica e encolhe), olhos (piscam), braços, pés e enfeites (folhas, chapéus, rabos, tentáculos).
As animações são calculadas quadro a quadro em Python e viram faixas de NLA com o nome de cada uma.
"""
import json
import math
import os

import bpy  # noqa: I001 (o bmesh só existe depois do bpy)
import bmesh
from mathutils import Euler, Matrix, Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.environ.get('LUMIS_OUT', os.path.join(AQUI, '..', '..', 'src', 'assets', 'lumis'))
FPS = 24

# (cor, rugosidade, emissão, força, alfa). Cada Lumi completa com corpo, corpo2, detalhe e luz.
BASE = {
    'olho': ('#ffffff', 0.3, None, 0, 1),
    'pupila': ('#1d1622', 0.25, None, 0, 1),
    'boca': ('#a8283d', 0.6, None, 0, 1),
    'lingua': ('#ff7d93', 0.7, None, 0, 1),
    'bochecha': ('#ff8fb1', 0.8, None, 0, 1),
    'faisca': ('#fff7d1', 0.3, '#fff1a8', 5.0, 1),
}
PALETA = {}
_MATS = {}


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def comecar(paleta):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()
    PALETA.clear()
    PALETA.update(BASE)
    PALETA.update(paleta)
    bpy.context.scene.render.fps = FPS


def mat(chave):
    if chave in _MATS:
        return _MATS[chave]
    cor, rug, emis, forca, alfa = PALETA[chave]
    m = bpy.data.materials.new(chave)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(cor), 1)
    b.inputs['Roughness'].default_value = rug
    b.inputs['Metallic'].default_value = 0.0
    if emis:
        b.inputs['Emission Color'].default_value = (*srgb(emis), 1)
        b.inputs['Emission Strength'].default_value = forca
    if alfa < 1:
        b.inputs['Alpha'].default_value = alfa
        m.surface_render_method = 'BLENDED'
        m.use_backface_culling = False
    _MATS[chave] = m
    return m


# ---------------------------------------------------------------- malhas

def _malha(nome, bm, material, liso=True):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(material))
    for p in me.polygons:
        p.use_smooth = liso
    return o


def _matriz(pos=(0, 0, 0), rot=(0, 0, 0), escala=(1, 1, 1)):
    r = Euler([math.radians(a) for a in rot]).to_matrix().to_4x4()
    return Matrix.Translation(pos) @ r @ Matrix.Diagonal((*escala, 1))


def bola(material, raio, pos, escala=(1, 1, 1), seg=20, aneis=12, rot=(0, 0, 0), liso=True):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=aneis, radius=raio)
    bmesh.ops.transform(bm, matrix=_matriz(pos, rot, escala), verts=bm.verts)
    return _malha('bola', bm, material, liso)


def icobola(material, raio, pos, escala=(1, 1, 1), sub=2, rot=(0, 0, 0), liso=True):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=raio)
    bmesh.ops.transform(bm, matrix=_matriz(pos, rot, escala), verts=bm.verts)
    return _malha('icobola', bm, material, liso)


def cone(material, raio, altura, pos, rot=(0, 0, 0), seg=12, raio2=0.0, liso=True, escala=(1, 1, 1)):
    """Cone (ou tronco com `raio2`) com a base em z = 0 e a ponta para +z, antes de girar."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=seg, radius1=raio,
                          radius2=raio2, depth=altura)
    bmesh.ops.translate(bm, vec=(0, 0, altura / 2), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=_matriz(pos, rot, escala), verts=bm.verts)
    return _malha('cone', bm, material, liso)


def tubo(material, pontos, raios, seg=8, tampa=True, liso=True):
    """Tubo que passa pelos pontos, com um raio para cada ponto (afina nas pontas)."""
    bm = bmesh.new()
    aneis = []
    n = len(pontos)
    if isinstance(raios, (int, float)):
        raios = [raios] * n
    for i, p in enumerate(pontos):
        p = Vector(p)
        d = (Vector(pontos[min(i + 1, n - 1)]) - Vector(pontos[max(i - 1, 0)])).normalized()
        cima = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        a = d.cross(cima).normalized()
        b = d.cross(a).normalized()
        aneis.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * raios[i])
                      for k in range(seg)])
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((aneis[i][k], aneis[i][(k + 1) % seg], aneis[i + 1][(k + 1) % seg], aneis[i + 1][k]))
    if tampa:
        bm.faces.new(list(reversed(aneis[0])))
        bm.faces.new(aneis[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _malha('tubo', bm, material, liso)


def torneado(material, perfil, pos=(0, 0, 0), seg=24, onda=None, rot=(0, 0, 0), liso=True, fechar=True):
    """Peça de torno: gira o perfil [(raio, z), …] em volta do eixo z (domos, copinhos, ovos, chapéus).

    `onda(angulo, z)` multiplica o raio (pregas da forminha, gomos). Raio 0 no começo ou no fim fecha
    a peça num ponto; senão, com `fechar`, a boca ganha uma tampa.
    """
    bm = bmesh.new()
    aneis = []
    for r, z in perfil:
        if r <= 1e-6:
            aneis.append([bm.verts.new((0, 0, z))])
            continue
        anel = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            rr = r * (onda(a, z) if onda else 1)
            anel.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        aneis.append(anel)
    for i in range(len(aneis) - 1):
        a, b = aneis[i], aneis[i + 1]
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for k in range(seg):
                bm.faces.new((a[0], b[(k + 1) % seg], b[k]))
        elif len(b) == 1:
            for k in range(seg):
                bm.faces.new((a[k], a[(k + 1) % seg], b[0]))
        else:
            for k in range(seg):
                bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    if fechar:
        for anel in (aneis[0], aneis[-1]):
            if len(anel) > 1:
                bm.faces.new(anel)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.transform(bm, matrix=_matriz(pos, rot), verts=bm.verts)
    return _malha('torneado', bm, material, liso)


def toro(material, R, r, pos, rot=(0, 0, 0), seg=24, rseg=8, escala=(1, 1, 1)):
    bm = bmesh.new()
    aneis = []
    for i in range(seg):
        u = 2 * math.pi * i / seg
        aneis.append([bm.verts.new(((R + r * math.cos(w)) * math.cos(u), (R + r * math.cos(w)) * math.sin(u), r * math.sin(w)))
                      for w in (2 * math.pi * k / rseg for k in range(rseg))])
    for i in range(seg):
        a, b = aneis[i], aneis[(i + 1) % seg]
        for k in range(rseg):
            bm.faces.new((a[k], b[k], b[(k + 1) % rseg], a[(k + 1) % rseg]))
    bmesh.ops.transform(bm, matrix=_matriz(pos, rot, escala), verts=bm.verts)
    return _malha('toro', bm, material)


def folha(material, comp, larg, pos=(0, 0, 0), rot=(0, 0, 0), curva=0.25, dobra=0.35, n=6,
          esp=0.018, gordura=0.75, ponta=0.0):
    """Folha (ou pétala) que nasce na origem e cresce para +z, com a face para -Y.

    `curva` enrola a ponta para trás (+Y), `dobra` levanta as bordas (nervura no meio), `gordura`
    muda o contorno (menor = mais redonda) e `ponta` desloca a parte mais larga para a ponta.
    """
    verts, faces = [], []
    colunas = (-1, 0, 1)
    for i in range(n):
        t = i / n
        tt = t ** (1 - ponta * 0.6) if ponta else t
        w = larg * math.sin(math.pi * min(1, tt * 0.92 + 0.04)) ** gordura
        for j in colunas:
            x = j * w / 2
            y = dobra * abs(j) * w * 0.5 * -1 + curva * comp * t * t
            verts.append((x, y, comp * t))
    verts.append((0, curva * comp, comp))
    m = len(colunas)
    for i in range(n - 1):
        for j in range(m - 1):
            a = i * m + j
            faces.append((a, a + 1, a + m + 1, a + m))
    topo = len(verts) - 1
    base = (n - 1) * m
    for j in range(m - 1):
        faces.append((base + j, base + j + 1, topo))
    me = bpy.data.meshes.new('folha')
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new('folha', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(material))
    if esp:
        s = o.modifiers.new('esp', 'SOLIDIFY')
        s.thickness = esp
        s.offset = 0
        _aplicar(o, s)
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.transform(_matriz(pos, rot))
    return o


def estrela4(material, raio, pos=(0, 0, 0), rot=(0, 0, 0), esp=0.35, miolo=0.34):
    """Faísca de 4 pontas, gordinha, de frente para -Y."""
    bm = bmesh.new()
    contorno = []
    for k in range(8):
        a = math.pi / 2 * (k / 2)
        r = raio if k % 2 == 0 else raio * miolo
        contorno.append(bm.verts.new((r * math.cos(a), 0, r * math.sin(a))))
    frente = bm.verts.new((0, -raio * esp, 0))
    tras = bm.verts.new((0, raio * esp, 0))
    for k in range(8):
        a, b = contorno[k], contorno[(k + 1) % 8]
        bm.faces.new((a, b, frente))
        bm.faces.new((b, a, tras))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.transform(bm, matrix=_matriz(pos, rot), verts=bm.verts)
    return _malha('faisca', bm, material, liso=False)


def deformar(o, f):
    """Passa cada vértice (em coordenadas do mundo, objeto sem transformação) por `f`."""
    for v in o.data.vertices:
        v.co = f(v.co.copy())
    o.data.update()
    return o


def _aplicar(o, mod):
    with bpy.context.temp_override(object=o, active_object=o):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def fundir(objs, nome, voxel=0.035, tris=900, alisar=4):
    """Junta bolas sobrepostas numa massa só, sem costura (nuvens e névoa): voxel e redução."""
    o = juntar(objs, nome)
    r = o.modifiers.new('voxel', 'REMESH')
    r.mode = 'VOXEL'
    r.voxel_size = voxel
    _aplicar(o, r)
    if alisar:
        s = o.modifiers.new('alisa', 'LAPLACIANSMOOTH')
        s.iterations = alisar
        s.lambda_factor = 0.6
        _aplicar(o, s)
    atual = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if atual > tris:
        d = o.modifiers.new('reduz', 'DECIMATE')
        d.ratio = tris / atual
        _aplicar(o, d)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def juntar(objs, nome, pivo=None):
    """Junta as peças num objeto só. Com `pivo`, a origem vai para esse ponto (é onde gira)."""
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = nome
    o.data.name = nome
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if pivo is not None:
        o.data.transform(Matrix.Translation(-Vector(pivo)))
        o.location = pivo
    return o


# ---------------------------------------------------------------- pintura no corpo (decalques)

def forma_elipse(n=18):
    return [(math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n)) for i in range(n)]


def forma_coracao(n=24):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 16, (z + 2.5) / 15))
    return list(reversed(pts))


def forma_boca(n=18, abertura=1.0):
    """Boca aberta sorrindo: borda de cima levemente curva e a de baixo bem redonda."""
    pts = []
    for i in range(n):
        a = math.pi + math.pi * i / (n - 1)
        pts.append((math.cos(a), math.sin(a) * abertura))
    for i in range(1, 5):
        x = 1 - 2 * i / 5
        pts.append((x, 0.18 * (1 - x * x) ** 0.5 * -1 + 0.12))
    return pts


def forma_lua(n=18, corte=0.35, inclina=0.0):
    """Olho de quem está aprontando: elipse com a pálpebra de cima reta e inclinada."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        x, z = math.cos(a), math.sin(a)
        teto = corte + inclina * x
        pts.append((x * (1 if z <= teto else (1 - teto * teto) ** 0.5 / max(1e-3, (1 - z * z) ** 0.5)), min(z, teto)))
    return pts


def _eixos(direcao, cima):
    D = Vector(direcao).normalized()
    U = D.cross(Vector(cima)).normalized()
    V = U.cross(D).normalized()
    return D, U, V


def projetar(alvo, u, v, direcao=(0, 1, 0), cima=(0, 0, 1), fundo=0.0):
    """Ponto e normal da superfície de `alvo` atingidos por um raio na direção `direcao`.

    Se o raio passar por fora (desenho maior que a peça), usa o ponto da superfície mais perto,
    na profundidade `fundo` (a do meio do desenho).
    """
    D, U, V = _eixos(direcao, cima)
    inv = alvo.matrix_world.inverted()
    origem = U * u + V * v - D * 20
    ok, loc, nor, _ = alvo.ray_cast(inv @ origem, (inv.to_3x3() @ D).normalized())
    if not ok:
        ok, loc, nor, _ = alvo.closest_point_on_mesh(inv @ (U * u + V * v + D * fundo))
    mw = alvo.matrix_world
    return mw @ loc, (mw.to_3x3() @ nor).normalized()


def decalque(alvo, material, centro, tamanho, forma=None, rot=0.0, alto=0.004, bojo=0.0, aneis=3,
             direcao=(0, 1, 0), cima=(0, 0, 1), nome='pintura'):
    """Desenho colado na superfície de `alvo` (olhos, bochechas, coração, manchas).

    O contorno `forma` (pontos 2D em torno de 0, raio ~1) é escalado por `tamanho`, girado por
    `rot` graus e projetado na direção `direcao`; cada vértice fica `alto` acima da superfície e o
    meio estufa `bojo` (olhos e corações ficam gordinhos).
    """
    forma = forma or forma_elipse()
    # Desenho grande precisa de mais anéis: senão a curva do corpo fura os triângulos retos.
    aneis = max(aneis, int(max(tamanho) / 0.05) + 1)
    D, U, V = _eixos(direcao, cima)
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    cu, cv = centro
    p0, n0 = projetar(alvo, cu, cv, direcao, cima)
    fundo = p0.dot(D)
    bm = bmesh.new()

    def vert(fu, fv, r):
        pu = cu + (fu * c - fv * s) * tamanho[0]
        pv = cv + (fu * s + fv * c) * tamanho[1]
        p, n = projetar(alvo, pu, pv, direcao, cima, fundo)
        return bm.verts.new(p + n * alto + n0 * bojo * (1 - r * r))

    meio = vert(0, 0, 0)
    aneis_v = []
    for k in range(1, aneis + 1):
        r = k / aneis
        aneis_v.append([vert(x * r, z * r, r) for x, z in forma])
    m = len(forma)
    for i in range(m):
        bm.faces.new((meio, aneis_v[0][i], aneis_v[0][(i + 1) % m]))
    for k in range(aneis - 1):
        a, b = aneis_v[k], aneis_v[k + 1]
        for i in range(m):
            bm.faces.new((a[i], b[i], b[(i + 1) % m], a[(i + 1) % m]))
    bm.normal_update()
    fora = sum((f.normal for f in bm.faces), Vector()).dot(n0)
    if fora < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return _malha(nome, bm, material)


def linha(alvo, material, pontos_uv, raio, alto=0.0, direcao=(0, 1, 0), cima=(0, 0, 1), seg=6):
    """Traço colado na superfície (sorriso fechado, sobrancelha), com as pontas arredondadas."""
    pts = []
    for u, v in pontos_uv:
        p, n = projetar(alvo, u, v, direcao, cima)
        pts.append(p + n * (alto + raio * 0.35))
    raios = [raio * (0.6 + 0.4 * math.sin(math.pi * i / (len(pts) - 1)) ** 0.5) for i in range(len(pts))]
    t = tubo(material, pts, raios, seg=seg)
    pontas = [bola(material, raios[0], pts[0], seg=8, aneis=6), bola(material, raios[-1], pts[-1], seg=8, aneis=6)]
    return juntar([t, *pontas], 'linha')


def olhos(alvo, x, z, larg, alt, olhar=(0.0, 0.0), pupila=0.8, rot=0.0, forma=None,
          direcao=(0, 1, 0), cima=(0, 0, 1), espelhar=True, brilho=1.0):
    """Par de olhos grandes: branco, pupila e dois brilhos (sempre do mesmo lado, como uma luz)."""
    pecas = []
    for lado in ((-1, 1) if espelhar else (1,)):
        cx = x * lado
        f = forma(lado) if callable(forma) else forma
        branco = decalque(alvo, 'olho', (cx, z), (larg, alt), forma=f, rot=-rot * lado, alto=0.004,
                          bojo=alt * 0.22, aneis=3, direcao=direcao, cima=cima)
        px = cx - olhar[0] * larg * lado
        pz = z + olhar[1] * alt
        pup = decalque(branco, 'pupila', (px, pz), (larg * pupila, alt * pupila), forma=f,
                       rot=-rot * lado, alto=0.003, bojo=alt * 0.04, aneis=2, direcao=direcao, cima=cima)
        b1 = decalque(pup, 'olho', (px + larg * 0.3 * pupila, pz + alt * 0.32 * pupila),
                      (larg * 0.3 * pupila * brilho, alt * 0.27 * pupila * brilho), forma=forma_elipse(12),
                      alto=0.003, bojo=alt * 0.03, aneis=1, direcao=direcao, cima=cima)
        b2 = decalque(pup, 'olho', (px - larg * 0.3 * pupila, pz - alt * 0.36 * pupila),
                      (larg * 0.13 * pupila * brilho, alt * 0.12 * pupila * brilho), forma=forma_elipse(8),
                      alto=0.003, aneis=1, direcao=direcao, cima=cima)
        pecas += [branco, pup, b1, b2]
    return pecas


def rosto(alvo, olho_x, olho_z, olho_larg, olho_alt, boca_z, boca_larg=0.055, boca_alt=0.04,
          bochecha_x=None, bochecha_z=None, bochecha=(0.06, 0.035), olhar=(0.0, 0.0),
          sorriso=False, direcao=(0, 1, 0), cima=(0, 0, 1), forma_olho=None, pupila=0.8, rot=0.0):
    """O rosto padrão dos Lumis: devolve (peças que vão no corpo, peças dos olhos)."""
    olho = olhos(alvo, olho_x, olho_z, olho_larg, olho_alt, olhar=olhar, forma=forma_olho,
                 direcao=direcao, cima=cima, pupila=pupila, rot=rot)
    pecas = []
    if sorriso:
        pts = [(boca_larg * (i / 6 * 2 - 1), boca_z - boca_alt * (1 - (i / 6 * 2 - 1) ** 2)) for i in range(7)]
        pecas.append(linha(alvo, 'boca', pts, 0.011, direcao=direcao, cima=cima))
    else:
        pecas.append(decalque(alvo, 'boca', (0, boca_z), (boca_larg, boca_alt), forma=forma_boca(),
                              alto=0.003, aneis=1, direcao=direcao, cima=cima))
        pecas.append(decalque(alvo, 'lingua', (0, boca_z - boca_alt * 0.55), (boca_larg * 0.5, boca_alt * 0.32),
                              alto=0.0045, aneis=1, direcao=direcao, cima=cima))
    if bochecha_x:
        for lado in (-1, 1):
            pecas.append(decalque(alvo, 'bochecha', (bochecha_x * lado, bochecha_z), bochecha, alto=0.003,
                                  bojo=0.004, aneis=1, direcao=direcao, cima=cima))
    return pecas, olho


def coracao(alvo, z, tamanho, x=0.0, direcao=(0, 1, 0), cima=(0, 0, 1)):
    """O coraçãozinho de luz da barriga, o sinal de todo Lumi."""
    return decalque(alvo, 'luz', (x, z), (tamanho, tamanho), forma=forma_coracao(), alto=0.004,
                    bojo=tamanho * 0.25, aneis=2, direcao=direcao, cima=cima, nome='coracao')


def faiscas(raio, altura, tamanhos=(0.085, 0.065, 0.075)):
    """Três faíscas em roda acima da cabeça (só os raros). O pivô é o centro da roda."""
    pecas = []
    for i, t in enumerate(tamanhos):
        a = 2 * math.pi * i / len(tamanhos) + math.pi / 6
        p = (raio * math.cos(a), raio * math.sin(a), altura + 0.05 * math.sin(3 * a))
        pecas.append(estrela4('faisca', t, p, rot=(0, 0, math.degrees(a) + 90)))
    return juntar(pecas, 'faiscas', pivo=(0, 0, altura))


# ---------------------------------------------------------------- partes comuns

def bracinhos(material, ombro_x, ombro_z, tam=(0.065, 0.065, 0.11), abre=28, y=-0.02):
    """Bracinhos de toco, pendurados no ombro (o pivô)."""
    bracos = []
    for lado in (1, -1):
        b = bola(material, 1, (lado * (ombro_x + 0.045), y - 0.01, ombro_z - 0.08), tam, seg=10, aneis=6,
                   rot=(0, lado * abre, 0))
        bracos.append((juntar([b], f'braco-{"e" if lado > 0 else "d"}', pivo=(lado * ombro_x, y, ombro_z)), lado))
    return bracos


def pezinhos(material, x, y=-0.05, z=0.055, tam=(0.11, 0.14, 0.07)):
    pes = []
    for lado, fase in ((1, 0.0), (-1, 0.5)):
        p = bola(material, 1, (lado * x, y, z), tam, seg=12, aneis=6)
        pes.append((juntar([p], f'pe-{"e" if lado > 0 else "d"}', pivo=(lado * x, y, z)), lado, fase))
    return pes


# ---------------------------------------------------------------- montagem e animação

def pos_mundo(o):
    p = o.location.copy()
    q = o.parent
    while q:
        p += q.location
        q = q.parent
    return p


def prender(filho, pai):
    """Prende `filho` em `pai` mantendo o lugar (as peças paradas não giram nem escalam)."""
    w = pos_mundo(filho)
    filho.parent = pai
    filho.location = w - pos_mundo(pai)


class Animado:
    """Uma raiz vazia com partes presas, gravando animações calculadas quadro a quadro."""

    def registrar(self):
        self.objs = [o for o in bpy.data.objects if o.parent is not None or o == self.raiz]
        self.repouso = {o: (o.location.copy(), o.rotation_euler.copy(), o.scale.copy()) for o in self.objs}

    def gravar(self, nome, quadros, funcao, laco=True):
        """`funcao(self, t)` devolve {objeto: (deslocamento, giro em graus, escala)} em t de 0 a 1.

        Em laço o último quadro repete o primeiro; sem laço (`virar` do borrão) vai até t = 1.
        """
        for q in range(quadros + 1):
            t = (q % quadros) / quadros if laco else q / quadros
            poses = funcao(self, t)
            for o in self.objs:
                dl, dr, es = poses.get(o, ((0, 0, 0), (0, 0, 0), (1, 1, 1)))
                l, r, s = self.repouso[o]
                o.location = l + Vector(dl)
                o.rotation_euler = Euler([r[i] + math.radians(dr[i]) for i in range(3)])
                o.scale = Vector([s[i] * es[i] for i in range(3)])
                for caminho in ('location', 'rotation_euler', 'scale'):
                    o.keyframe_insert(data_path=caminho, frame=q)
        for o in self.objs:
            _empurrar(o, nome)
            l, r, s = self.repouso[o]
            o.location, o.rotation_euler, o.scale = l, r, s


class Lumi(Animado):
    """As partes de um Lumi e o jeito de cada uma se mexer.

    - `corpo`: estica e encolhe a partir do pivô (a base do corpo);
    - `cabeca` (opcional, quadrúpedes): balança o "sim";
    - `olhos`: piscam (escala em z a partir do meio dos olhos);
    - `bracos`: [(objeto, lado)], lado +1 no +X; o braço pendurado gira no ombro;
    - `pes`: [(objeto, lado, fase)], fase em voltas (0 e 0,5 alternam);
    - `enfeites`: [(objeto, amplitude em graus, atraso em voltas)] balançam atrasados;
    - `faiscas`: roda de faíscas dos raros;
    - `flutua`: anda flutuando (sem pés); `asas`: os braços batem como asas.
    """

    def __init__(self, nome, corpo, olhos=None, bracos=(), pes=(), enfeites=(), faiscas=None,
                 cabeca=None, flutua=False, asas=False, quadrupede=False, pulo=0.3, passo=0.07,
                 peso=1.0):
        self.nome = nome
        self.raiz = bpy.data.objects.new(f'lumi-{nome}', None)
        bpy.context.scene.collection.objects.link(self.raiz)
        self.corpo, self.cabeca, self.olhos = corpo, cabeca, olhos
        self.bracos, self.pes, self.enfeites, self.faiscas = list(bracos), list(pes), list(enfeites), faiscas
        self.flutua, self.asas, self.quadrupede = flutua, asas, quadrupede
        self.pulo, self.passo, self.peso = pulo, passo, peso
        prender(corpo, self.raiz)
        if cabeca:
            prender(cabeca, corpo)
        if olhos:
            prender(olhos, cabeca or corpo)
        for o, _ in self.bracos:
            prender(o, corpo)
        for o, _, _ in self.pes:
            prender(o, self.raiz)
        for o, _, _ in self.enfeites:
            if o.parent is None:
                prender(o, cabeca or corpo)
        if faiscas:
            prender(faiscas, self.raiz)
        self.registrar()

    def animar(self):
        self.gravar('parado', 48, clip_parado)
        self.gravar('andar', 24, clip_andar)
        self.gravar('pular', 24, clip_pular)
        self.gravar('trabalhar', 24, clip_trabalhar)
        self.gravar('feliz', 24, clip_feliz)


def _empurrar(o, nome):
    ad = o.animation_data
    acao = ad.action
    acao.name = f'{nome}-{o.name}'
    for fc in _fcurves(acao):
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'
    faixa = ad.nla_tracks.new()
    faixa.name = nome
    faixa.strips.new(nome, 0, acao)
    ad.action = None


def _fcurves(acao):
    if hasattr(acao, 'fcurves') and len(getattr(acao, 'fcurves', [])) > 0:
        return list(acao.fcurves)
    curvas = []
    for camada in getattr(acao, 'layers', []):
        for faixa in camada.strips:
            for cb in faixa.channelbags:
                curvas.extend(cb.fcurves)
    return curvas


def _suave(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def _sino(t, c, largura):
    """Uma lombada suave em volta de `c` (0 fora dela, 1 no meio)."""
    d = abs(t - c) / largura
    return 0.0 if d >= 1 else 0.5 + 0.5 * math.cos(math.pi * d)


def _piscar(t, quando):
    return 1 - 0.92 * _sino(t, quando, 0.045)


def _faiscas(L, poses, t, voltas=1, pulso=0.12):
    if L.faiscas:
        e = 1 + pulso * math.sin(4 * math.pi * t)
        poses[L.faiscas] = ((0, 0, 0.02 * math.sin(2 * math.pi * t)), (0, 0, 120 * voltas * t), (e, e, e))


def _enfeites(L, poses, t, forca=1.0, voltas=1, extra=None):
    for o, amp, atraso in L.enfeites:
        w = 2 * math.pi * (voltas * t - atraso)
        rx = amp * forca * math.sin(w)
        ry = amp * forca * 0.45 * math.cos(w)
        if extra:
            rx += extra
        poses[o] = ((0, 0, 0), (rx, ry, 0), (1, 1, 1))


def _esticar(k):
    """k > 0 achata, k < 0 estica (sem mudar muito o volume)."""
    return (1 + 0.5 * k, 1 + 0.5 * k, 1 - k)


def clip_parado(L, t):
    w = 2 * math.pi * t
    b = math.sin(w)
    poses = {}
    if L.flutua:
        poses[L.raiz] = ((0, 0, 0.05 * math.sin(2 * w)), (2 * math.sin(w), 3 * math.sin(w + 0.7), 3 * math.sin(w)), (1, 1, 1))
    else:
        poses[L.raiz] = ((0, 0, 0), (0, 2 * math.sin(w), 3 * math.sin(w)), (1, 1, 1))
    poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(0.03 * b))
    if L.cabeca:
        poses[L.cabeca] = ((0, 0, 0), (4 * math.sin(w + 0.5), 0, 6 * math.sin(w)), (1, 1, 1))
    if L.olhos:
        poses[L.olhos] = ((0, 0, 0), (0, 0, 0), (1, 1, _piscar(t, 0.66)))
    for o, lado in L.bracos:
        amp = 18 if L.asas else 5
        f = 2 if L.asas else 1
        poses[o] = ((0, 0, 0), (0, -lado * (amp * (0.5 + 0.5 * math.sin(f * w))), 0), (1, 1, 1))
    _enfeites(L, poses, t, 0.6)
    _faiscas(L, poses, t)
    return poses


def clip_andar(L, t):
    w = 2 * math.pi * t
    poses = {}
    if L.flutua:
        poses[L.raiz] = ((0, 0, 0.06 * math.sin(2 * w)), (10 + 3 * math.sin(2 * w), 4 * math.sin(w), 0), (1, 1, 1))
        poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(-0.04 * math.sin(2 * w)))
        for o, lado in L.bracos:
            if L.asas:
                poses[o] = ((0, 0, 0), (0, -lado * (25 + 40 * math.sin(4 * w)), 0), (1, 1, 1))
            else:
                poses[o] = ((0, 0, 0), (25 * math.sin(w + (0 if lado > 0 else math.pi)), -lado * 15, 0), (1, 1, 1))
        for o, lado, fase in L.pes:
            poses[o] = ((0, 0, 0), (20 + 15 * math.sin(w + 2 * math.pi * fase), 0, 0), (1, 1, 1))
        _enfeites(L, poses, t, 1.2, voltas=2, extra=-8)
    else:
        sobe = 0.045 * L.peso * (1 - math.cos(2 * w)) / 2
        poses[L.raiz] = ((0, 0, sobe), (4, 6 * math.sin(w) / L.peso, 3 * math.sin(w)), (1, 1, 1))
        poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(0.05 * math.cos(2 * w)))
        if L.cabeca:
            poses[L.cabeca] = ((0, 0, 0), (5 * math.sin(2 * w), 0, 4 * math.sin(w)), (1, 1, 1))
        for o, lado, fase in L.pes:
            a = w + 2 * math.pi * fase
            ergue = max(0.0, math.cos(a))
            poses[o] = ((0, -L.passo * math.sin(a), 0.06 * ergue * L.peso - sobe * 0.6),
                        (-20 * ergue, 0, 0), (1, 1, 1))
        for o, lado in L.bracos:
            fase = 0 if lado > 0 else 0.5
            poses[o] = ((0, 0, 0), (25 * math.sin(w + 2 * math.pi * fase), -lado * 8, 0), (1, 1, 1))
        _enfeites(L, poses, t, 1.0, voltas=2)
    if L.olhos:
        poses[L.olhos] = ((0, 0, 0), (0, 0, 0), (1, 1, _piscar(t, 0.8)))
    _faiscas(L, poses, t)
    return poses


def _pulo(t):
    """Curva do pulo: (altura 0..1, achatado k) com preparo, impulso, voo e pouso."""
    if t < 0.16:
        return 0.0, 0.22 * _suave(t / 0.16)
    if t < 0.24:
        u = (t - 0.16) / 0.08
        return 0.0 if t < 0.2 else ((t - 0.2) / 0.52) * 4 * (1 - (t - 0.2) / 0.52), 0.22 - 0.42 * _suave(u)
    if t < 0.72:
        u = (t - 0.2) / 0.52
        k = -0.2 * (1 - _suave((t - 0.24) / 0.14))
        return 4 * u * (1 - u), k
    u = (t - 0.72) / 0.28
    return 0.0, 0.2 * math.sin(math.pi * min(1, u * 1.6)) * (1 - u) + 0.03 * math.sin(math.pi * u * 2.5) * (1 - u)


def clip_pular(L, t):
    poses = {}
    h, k = _pulo(t)
    ar = _suave(min(1, h * 2.5))
    if L.flutua:
        sobe = 0.35 * math.sin(math.pi * _suave(t))
        poses[L.raiz] = ((0, 0, sobe), (0, 0, 360 * _suave((t - 0.1) / 0.75)), (1, 1, 1))
        poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(-0.12 * math.sin(math.pi * _suave(t))))
        for o, lado in L.bracos:
            poses[o] = ((0, 0, 0), (0, -lado * (60 + (30 * math.sin(6 * math.pi * t) if L.asas else 0)), 0), (1, 1, 1))
        for o, lado, fase in L.pes:
            poses[o] = ((0, 0, 0), (30 * math.sin(math.pi * t), 0, 0), (1, 1, 1))
    else:
        poses[L.raiz] = ((0, 0, L.pulo * h), (-6 * ar, 0, 0), (1, 1, 1))
        poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(k * L.peso))
        if L.cabeca:
            poses[L.cabeca] = ((0, 0, 0), (-12 * ar + 8 * max(0, k) * 4, 0, 0), (1, 1, 1))
        for o, lado in L.bracos:
            poses[o] = ((0, 0, 0), (-20 * ar, -lado * (15 + 75 * ar), 0), (1, 1, 1))
        for o, lado, fase in L.pes:
            poses[o] = ((0, 0.02 * ar, 0.04 * ar), (25 * ar, 0, 0), (1, 1, 1))
    if L.olhos:
        poses[L.olhos] = ((0, 0, 0), (0, 0, 0), (1, 1, 1 - 0.55 * max(0, k) / 0.22))
    for o, amp, atraso in L.enfeites:
        v = math.cos(math.pi * 2 * (t - 0.2 - atraso * 0.3))
        poses[o] = ((0, 0, 0), (amp * 0.9 * v * (0.3 + ar), 0, 0), (1, 1, 1))
    _faiscas(L, poses, t, pulso=0.3)
    return poses


def clip_trabalhar(L, t):
    """Duas marteladas por volta (mexer a panela, bater, cavar): braços sobem e descem juntos."""
    poses = {}
    p = (2 * t) % 1
    if p < 0.55:
        ergue = _suave(p / 0.55)
    elif p < 0.68:
        ergue = 1 - _suave((p - 0.55) / 0.13)
    else:
        ergue = 0.0
    batida = _sino(p, 0.72, 0.1)
    if L.quadrupede:
        w = 2 * math.pi * t
        poses[L.raiz] = ((0, 0, 0.03 * abs(math.sin(2 * w))), (7, 3 * math.sin(2 * w), 0), (1, 1, 1))
        poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(0.06 * math.cos(4 * w)))
        if L.cabeca:
            poses[L.cabeca] = ((0, 0, 0), (12 * ergue - 6 * batida, 0, 0), (1, 1, 1))
        for o, lado, fase in L.pes:
            a = 2 * w + 2 * math.pi * fase
            ergue_pe = max(0.0, math.cos(a))
            poses[o] = ((0, -L.passo * 0.6 * math.sin(a), 0.05 * ergue_pe), (-15 * ergue_pe, 0, 0), (1, 1, 1))
    else:
        base_z = 0.04 * math.sin(4 * math.pi * t) if L.flutua else 0.0
        poses[L.raiz] = ((0, 0, base_z + 0.03 * ergue), (-4 * ergue + 10 * batida, 0, 0), (1, 1, 1))
        poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(-0.05 * ergue + 0.12 * batida))
        for o, lado in L.bracos:
            if L.asas:
                poses[o] = ((0, 0, 0), (0, -lado * (10 + 70 * ergue), 0), (1, 1, 1))
            else:
                poses[o] = ((0, 0, 0), (-120 * ergue - 10 * batida, -lado * 12, 0), (1, 1, 1))
        for o, lado, fase in L.pes:
            poses[o] = ((0, 0, 0), (0, 0, 0), (1, 1, 1))
    if L.olhos:
        poses[L.olhos] = ((0, 0, 0), (0, 0, 0), (1, 1, 0.82 - 0.2 * batida))
    for o, amp, atraso in L.enfeites:
        v = _sino((p - atraso * 0.2) % 1, 0.76, 0.18)
        poses[o] = ((0, 0, 0), (amp * (1.1 * v - 0.3 * ergue), 0, 0), (1, 1, 1))
    _faiscas(L, poses, t)
    return poses


def clip_feliz(L, t):
    """Dois pulinhos com os braços para cima e os olhos fechadinhos de alegria."""
    poses = {}
    p = (2 * t) % 1
    h = max(0.0, math.sin(math.pi * min(1, p / 0.7)))
    k = 0.12 * _sino(p, 0.85, 0.15) + 0.06 * _sino(p, 0.0, 0.1) + 0.06 * _sino(p, 1.0, 0.1) - 0.08 * h
    lado_t = math.sin(2 * math.pi * t)
    if L.flutua:
        poses[L.raiz] = ((0, 0, 0.14 * h), (0, 10 * lado_t, 360 * _suave(t)), (1, 1, 1))
    else:
        poses[L.raiz] = ((0, 0, L.pulo * 0.45 * h), (0, 10 * lado_t, 25 * lado_t), (1, 1, 1))
    poses[L.corpo] = ((0, 0, 0), (0, 0, 0), _esticar(k * L.peso))
    if L.cabeca:
        poses[L.cabeca] = ((0, 0, 0), (-10 - 6 * h, 0, 12 * lado_t), (1, 1, 1))
    for o, lado in L.bracos:
        acena = math.sin(8 * math.pi * t + (0 if lado > 0 else math.pi))
        poses[o] = ((0, 0, 0), (-10, -lado * (125 + 20 * acena), 0), (1, 1, 1))
    for o, lado, fase in L.pes:
        poses[o] = ((0, 0.015 * h, 0.03 * h), (20 * h, 0, 0), (1, 1, 1))
    if L.olhos:
        poses[L.olhos] = ((0, 0, 0), (0, 0, 0), (1.04, 1, 0.32))
    _enfeites(L, poses, t, 1.3, voltas=2)
    _faiscas(L, poses, t, voltas=2, pulso=0.3)
    return poses


# ---------------------------------------------------------------- saída

def triangulos():
    return sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)


def exportar(nome, info):
    caminho = os.path.join(SAIDA, f'{nome}.glb')
    os.makedirs(SAIDA, exist_ok=True)
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 0, 48
    bpy.ops.export_scene.gltf(
        filepath=caminho,
        export_format='GLB',
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_draco_mesh_compression_enable=False,
        export_optimize_animation_keep_anim_object=True,
    )
    tris = triangulos()
    tam = os.path.getsize(caminho)
    mats = sorted({m.name for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials})
    clips = sorted({t.name for o in bpy.data.objects if o.animation_data for t in o.animation_data.nla_tracks})
    print(f'{nome}: {tris} triângulos, {tam / 1024:.0f} KB, clipes {clips}')
    if os.environ.get('LUMIS_DETALHE'):
        for o in bpy.data.objects:
            if o.type == 'MESH':
                print('  ', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
    _relatar(nome, {**info, 'triangulos': tris, 'kb': round(tam / 1024, 1), 'clipes': clips, 'materiais': mats})


def _relatar(nome, dados):
    arq = os.path.join(AQUI, 'relatorio.json')
    tudo = {}
    if os.path.exists(arq):
        with open(arq) as f:
            tudo = json.load(f)
    tudo[nome] = dados
    with open(arq, 'w') as f:
        json.dump(dict(sorted(tudo.items())), f, ensure_ascii=False, indent=1)
        f.write('\n')
