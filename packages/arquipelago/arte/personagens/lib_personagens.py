"""Ajudantes dos personagens do Arquipélago Vagalume (Blender sem tela, `bpy` do PyPI).

Cada morador nasce aqui: formas arredondadas (torno, superelipsoide, tubo, placa), olhos numa malha
separada com as formas `piscar` e `feliz`, esqueleto próprio com pesos rígidos por peça e as
animações em laço gravadas como faixas de NLA (o exportador vira um clipe por faixa).

Convenções (as mesmas do Zappy e do avatar): z para cima, a FRENTE olha para -Y, o lado esquerdo
do personagem fica em +X. Os moradores medem ~1,6 de altura, na escala do avatar (~2,2): o jogo
aplica a mesma escala nos dois.

Rotações das poses: cada osso recebe uma lista de giros `(eixo, graus)` nos eixos do mundo, contados
a partir da pose de descanso e aplicados em ordem. `_rot_local` converte para o espaço do osso, e
o giro do pai carrega o do filho (cinemática direta).

- `X` positivo leva para trás o que aponta para baixo (perna, braço caído) e inclina para a frente
  o que aponta para cima (cabeça, tronco).
- `Y` positivo leva o que aponta para baixo na direção de -X (o braço direito sobe pelo lado) e
  inclina a cabeça para a esquerda do personagem.
- `Z` positivo gira para a esquerda (visto de cima, anti-horário).
"""
import math
import os

import bpy  # noqa: I001 (o bpy carrega o bmesh)
import bmesh
from mathutils import Matrix, Vector

FPS = 24
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', '..', 'src', 'assets', 'personagens'))
TAU = 2 * math.pi
# Teto de triângulos de cada morador (o pedido é ~6 mil para caber vários na tela do celular).
ALVO_TRIANGULOS = 5800
# Ossos que mudam de posição nos clipes (os outros só giram).
COM_POSICAO = {'raiz', 'quadril', 'mixamorig:Hips'}


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def sen(t, freq=1, fase=0.0):
    """Seno em laço: `t` vai de 0 a 1 no clipe e `freq` é inteiro, então o fim encosta no começo."""
    return math.sin(TAU * (freq * t + fase))


def cos(t, freq=1, fase=0.0):
    return math.cos(TAU * (freq * t + fase))


def suave(a, b, x):
    if b == a:
        return 1.0 if x >= b else 0.0
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _matriz(centro=(0, 0, 0), rot=(0, 0, 0), escala=(1, 1, 1)):
    rx, ry, rz = (math.radians(a) for a in rot)
    r = Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')
    return Matrix.Translation(Vector(centro)) @ r @ Matrix.Diagonal((*escala, 1))


def orientar(de, ate, frente=(0, -1, 0)):
    """Giro (graus) que leva o z local para a direção de `de` a `ate` e o y local para o lado
    mais perto de `frente`: assim uma forma achatada em y (nadadeira, asa) fica de frente."""
    z = (Vector(ate) - Vector(de)).normalized()
    f = Vector(frente)
    x = f.cross(z)
    if x.length < 1e-6:
        x = Vector((1, 0, 0)).cross(z)
    x.normalize()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed()
    return tuple(math.degrees(a) for a in m.to_euler('XYZ'))


def _alinhar(de, ate):
    """Matriz que leva o eixo z local para a direção de `de` a `ate`, com a origem em `de`."""
    de, ate = Vector(de), Vector(ate)
    d = ate - de
    q = Vector((0, 0, 1)).rotation_difference(d.normalized()) if d.length > 1e-9 else None
    r = q.to_matrix().to_4x4() if q else Matrix.Identity(4)
    return Matrix.Translation(de) @ r, d.length


class Personagem:
    """Monta um personagem peça a peça; cada peça pertence a um osso."""

    def __init__(self, pid, paleta):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.render.fps = FPS
        self.pid = pid
        self.paleta = paleta
        self.mats = {}
        self.pecas = {}
        self.olhos = []  # (objeto, lado, centro, raios)
        self.ossos = []
        self.arm = None
        self.escala_arm = 1.0
        self.animados = None

    # ----------------------------------------------------------------- materiais
    def mat(self, chave):
        if chave in self.mats:
            return self.mats[chave]
        cor, rug, emis, forca = (list(self.paleta[chave]) + [None, 0])[:4]
        m = bpy.data.materials.new(chave)
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*srgb(cor), 1)
        b.inputs['Roughness'].default_value = rug
        b.inputs['Metallic'].default_value = 0.0
        if emis:
            b.inputs['Emission Color'].default_value = (*srgb(emis), 1)
            b.inputs['Emission Strength'].default_value = forca
        self.mats[chave] = m
        return m

    # ----------------------------------------------------------------- malhas
    def _objeto(self, bm, osso, m, angulo=None):
        me = bpy.data.meshes.new(f'{self.pid}-{osso}')
        bm.normal_update()
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(me.name, me)
        bpy.context.collection.objects.link(o)
        o.data.materials.append(self.mat(m))
        suavizar(o, angulo)
        if osso == 'olhos':
            return o
        self.pecas.setdefault(osso, []).append(o)
        return o

    def esfera(self, osso, m, centro, raios, rot=(0, 0, 0), seg=18, aneis=10, e1=1.0, e2=1.0,
               deformar=None, angulo=None, depois=None):
        """Elipsoide (ou superelipsoide com e1/e2 < 1, mais quadrado). `deformar(v)` mexe no
        vértice da esfera unitária antes de escalar e posicionar; `depois(p)` mexe no ponto já no
        lugar (curvar uma folha por cima da cabeça)."""
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=aneis, radius=1)
        mat = _matriz(centro, rot, raios)
        for v in bm.verts:
            p = v.co.copy()
            if e1 != 1 or e2 != 1:
                lat = math.asin(max(-1, min(1, p.z)))
                lon = math.atan2(p.y, p.x)
                pw = lambda c, e: math.copysign(abs(c) ** e, c)  # noqa: E731
                p = Vector((pw(math.cos(lat), e1) * pw(math.cos(lon), e2),
                            pw(math.cos(lat), e1) * pw(math.sin(lon), e2),
                            pw(math.sin(lat), e1)))
            if deformar:
                p = Vector(deformar(p))
            v.co = mat @ p
            if depois:
                v.co = Vector(depois(v.co))
        return self._objeto(bm, osso, m, angulo)

    def torno(self, osso, m, perfil, de=(0, 0, 0), ate=None, seg=18, escala=(1, 1), rot=None,
              centro=None, angulo=None, giro=0.0, onda=None):
        """Sólido de revolução: `perfil` = [(raio, altura)], de baixo para cima no eixo local z.
        Raio 0 na ponta fecha num polo. Posição: `de`→`ate` (o eixo z aponta para `ate`, altura
        em unidades do perfil) ou `centro` + `rot` em graus. `onda(i, a)` multiplica o raio do
        anel i no ângulo a (pregas do chapéu de cozinheiro, babados)."""
        bm = bmesh.new()
        aneis = []
        for r, z in perfil:
            if r <= 1e-6:
                aneis.append([bm.verts.new((0, 0, z))])
                continue
            anel = []
            i = len(aneis)
            for k in range(seg):
                a = TAU * k / seg + math.radians(giro)
                rr = r * (onda(i, a) if onda else 1.0)
                anel.append(bm.verts.new((rr * math.cos(a) * escala[0], rr * math.sin(a) * escala[1], z)))
            aneis.append(anel)
        for a, b in zip(aneis, aneis[1:]):
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                for k in range(seg):
                    bm.faces.new((a[0], b[k], b[(k + 1) % seg]))
            elif len(b) == 1:
                for k in range(seg):
                    bm.faces.new((a[(k + 1) % seg], a[k], b[0]))
            else:
                for k in range(seg):
                    bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
        if len(aneis[0]) > 1:
            bm.faces.new(list(reversed(aneis[0])))
        if len(aneis[-1]) > 1:
            bm.faces.new(aneis[-1])
        if ate is not None:
            mat, _ = _alinhar(de, ate)
        else:
            mat = _matriz(centro or de, rot or (0, 0, 0))
        for v in bm.verts:
            v.co = mat @ v.co
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self._objeto(bm, osso, m, angulo)

    def capsula(self, osso, m, de, ate, r1, r2=None, seg=10, aneis=3):
        """Cápsula de `de` a `ate` com raios r1 (início) e r2 (fim) e pontas redondas."""
        r2 = r1 if r2 is None else r2
        comp = (Vector(ate) - Vector(de)).length
        perfil = []
        for i in range(aneis + 1):
            a = -math.pi / 2 + (math.pi / 2) * i / aneis
            perfil.append((r1 * math.cos(a), r1 * math.sin(a)))
        for i in range(aneis + 1):
            a = (math.pi / 2) * i / aneis
            perfil.append((r2 * math.cos(a), comp + r2 * math.sin(a)))
        return self.torno(osso, m, perfil, de, ate, seg=seg)

    def tubo(self, osso, m, pontos, raios, seg=10, tampa=True, angulo=None):
        """Tubo por uma lista de pontos com raio variável."""
        bm = bmesh.new()
        aneis = []
        n = len(pontos)
        if not isinstance(raios, (list, tuple)):
            raios = [raios] * n
        for i, p in enumerate(pontos):
            p = Vector(p)
            d = (Vector(pontos[min(i + 1, n - 1)]) - Vector(pontos[max(i - 1, 0)])).normalized()
            up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
            a = d.cross(up).normalized()
            b = d.cross(a).normalized()
            aneis.append([bm.verts.new(p + (a * math.cos(TAU * k / seg) + b * math.sin(TAU * k / seg)) * raios[i])
                          for k in range(seg)])
        for i in range(n - 1):
            for k in range(seg):
                bm.faces.new((aneis[i][k], aneis[i][(k + 1) % seg], aneis[i + 1][(k + 1) % seg], aneis[i + 1][k]))
        if tampa:
            bm.faces.new(list(reversed(aneis[0])))
            bm.faces.new(aneis[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self._objeto(bm, osso, m, angulo)

    def toro(self, osso, m, centro, R, r, rot=(0, 0, 0), seg=24, rseg=8, escala=(1, 1, 1), arco=1.0):
        bm = bmesh.new()
        n = seg if arco >= 1 else seg + 1
        aneis = []
        for i in range(n):
            u = TAU * arco * i / seg
            aneis.append([bm.verts.new(((R + r * math.cos(TAU * k / rseg)) * math.cos(u),
                                        (R + r * math.cos(TAU * k / rseg)) * math.sin(u),
                                        r * math.sin(TAU * k / rseg))) for k in range(rseg)])
        pares = list(zip(aneis, aneis[1:])) + ([(aneis[-1], aneis[0])] if arco >= 1 else [])
        for a, b in pares:
            for k in range(rseg):
                bm.faces.new((a[k], b[k], b[(k + 1) % rseg], a[(k + 1) % rseg]))
        if arco < 1:
            bm.faces.new(list(reversed(aneis[0])))
            bm.faces.new(aneis[-1])
        mat = _matriz(centro, rot, escala)
        for v in bm.verts:
            v.co = mat @ v.co
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self._objeto(bm, osso, m)

    def placa(self, osso, m, contorno, espessura, centro=(0, 0, 0), rot=(0, 0, 0), curvar=None,
              bisel=0.0, angulo=40):
        """Forma achatada pelo contorno 2D (x, y), com espessura em z. `curvar(x, y)` sobe o vértice
        em z (folhas e abas curvas)."""
        bm = bmesh.new()
        h = espessura / 2
        f = curvar or (lambda x, y: 0.0)
        cima = [bm.verts.new((x, y, h + f(x, y))) for x, y in contorno]
        baixo = [bm.verts.new((x, y, -h + f(x, y))) for x, y in contorno]
        n = len(contorno)
        bm.faces.new(cima)
        bm.faces.new(list(reversed(baixo)))
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((baixo[i], baixo[j], cima[j], cima[i]))
        bmesh.ops.triangulate(bm, faces=[fc for fc in bm.faces if len(fc.verts) > 4])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        if bisel:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bisel, segments=1, affect='EDGES',
                            clamp_overlap=True)
        mat = _matriz(centro, rot)
        for v in bm.verts:
            v.co = mat @ v.co
        return self._objeto(bm, osso, m, angulo)

    def caixa(self, osso, m, centro, tamanho, rot=(0, 0, 0), bisel=0.01, seg=12, aneis=6):
        """Caixa de cantos redondos (superelipsoide): quanto maior o `bisel`, mais redonda."""
        e = max(0.08, min(0.8, 2 * bisel / max(min(tamanho), 1e-6)))
        meio = tuple(t / 2 for t in tamanho)
        return self.esfera(osso, m, centro, meio, rot, seg, aneis, e1=e, e2=e)

    def casca(self, osso, m, borda, centro, raios, manter=None, espessura=0.012, folga=0.01, rot=(0, 0, 0),
              seg=24, aneis=14, e1=1.0, e2=1.0, deformar=None, cortes=()):
        """Pedaço de roupa ou de pelagem por cima de um corpo elipsoide: a mesma forma um pouco
        maior (`folga`), só a parte onde `manter(p)` é verdade, com espessura e a beirada no
        material `borda` (avental com debrum, faixa do tamanduá, casco). `cortes` = [(ponto,
        normal)] corta reto por planos e fica do lado contrário à normal (beirada limpa); `manter`
        apaga os vértices de fora (beirada que segue a malha)."""
        o = self.esfera(osso, m, centro, tuple(r + folga for r in raios), rot, seg, aneis, e1, e2, deformar)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        for ponto, normal in cortes:
            geo = bm.verts[:] + bm.edges[:] + bm.faces[:]
            bmesh.ops.bisect_plane(bm, geom=geo, plane_co=Vector(ponto), plane_no=Vector(normal).normalized(),
                                   clear_outer=True, dist=1e-5)
        if manter:
            fora = [v for v in bm.verts if not manter(v.co)]
            bmesh.ops.delete(bm, geom=fora, context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
        o.data.materials.append(self.mat(borda))
        mod = o.modifiers.new('espessura', 'SOLIDIFY')
        mod.thickness = espessura
        mod.offset = 1.0
        mod.use_rim = True
        mod.material_offset_rim = 1
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        suavizar(o, 50)
        return o

    def superficie(self, alvo, x, z, de=(0, -1, 0)):
        """Ponto e normal da superfície de `alvo` vista de fora na direção `de` (por padrão de
        frente), na altura z e no x pedidos. Serve para encostar olhos, nariz e bochechas no
        rosto em vez de adivinhar a profundidade."""
        d = Vector(de).normalized()
        base = Vector((x, 0, z)) if abs(d.y) >= max(abs(d.x), abs(d.z)) else (
            Vector((0, x, z)) if abs(d.x) >= abs(d.z) else Vector((x, z, 0)))
        origem = base + d * 5
        melhor = None
        for o in (alvo if isinstance(alvo, (list, tuple)) else [alvo]):
            ok, ponto, normal, _ = o.ray_cast(origem, -d)
            if ok and (melhor is None or (ponto - origem).length < (melhor[0] - origem).length):
                melhor = (ponto, normal)
        if melhor is None:
            raise ValueError(f'{self.pid}: nada em x={x} z={z}')
        return melhor

    def olho_no_rosto(self, lado, alvo, x, z, raios, afunda=0.45, **kw):
        """Olho encostado no rosto: acha a superfície em (x, z), vira o olho para a normal e afunda
        uma parte da espessura para ele não flutuar."""
        ponto, normal = self.superficie(alvo, x, z)
        rot = Vector((0, -1, 0)).rotation_difference(normal).to_euler()
        rot = tuple(math.degrees(a) for a in rot)
        centro = ponto - normal * raios[1] * afunda
        return self.olho(lado, centro, raios, rot=rot, **kw)

    def no_rosto(self, osso, m, alvo, x, z, raios, afunda=0.4, seg=12, aneis=8, de=(0, -1, 0)):
        """Uma bolinha (nariz, bochecha, pinta) encostada na superfície de `alvo`."""
        ponto, normal = self.superficie(alvo, x, z, de)
        rot = Vector((0, -1, 0)).rotation_difference(normal).to_euler()
        rot = tuple(math.degrees(a) for a in rot)
        return self.esfera(osso, m, ponto - normal * raios[1] * afunda, raios, rot=rot, seg=seg, aneis=aneis)

    def olho(self, lado, centro, raios, rot=(0, 0, 0), brilhos=((0.35, 0.4, 0.42), (-0.3, -0.35, 0.2)),
             iris=None, pupila=None, seg=14, aneis=8):
        """Olho brilhante de bichinho: bola escura e brilhos brancos na frente. `iris` = (chave do
        material, fração do raio) para olhos com íris colorida (a coruja). Os brilhos ficam em
        (x, z, tamanho) proporcionais ao raio."""
        c = Vector(centro)
        r = Vector(raios)
        mat_rot = _matriz((0, 0, 0), rot).to_3x3()
        frente = mat_rot @ Vector((0, -1, 0))
        pecas = []
        if iris:
            chave, fr = iris
            pecas.append(self.esfera('olhos', chave, c, raios, rot, seg, aneis))
            pr = pupila or 0.55
            pecas.append(self.esfera('olhos', 'olho', c + frente * r.y * 0.35,
                                     (r.x * fr * pr, r.y * 0.7, r.z * fr * pr), rot, 14, 8))
        else:
            pecas.append(self.esfera('olhos', 'olho', c, raios, rot, seg, aneis))
        for bx, bz, bt in brilhos:
            lx = Vector((bx * r.x, 0, bz * r.z))
            p = c + mat_rot @ lx + frente * r.y * 0.92
            pecas.append(self.esfera('olhos', 'brilho', p, (r.x * bt * 0.6, r.y * 0.18, r.z * bt * 0.6),
                                     rot, 6, 4))
        for o in pecas:
            self.olhos.append((o, lado, c.copy(), r.copy()))
        return pecas

    # ----------------------------------------------------------------- esqueleto
    def esqueleto(self, ossos):
        """`ossos` = [(nome, cabeça, cauda, pai)] em metros."""
        dados = bpy.data.armatures.new(self.pid)
        arm = bpy.data.objects.new(self.pid, dados)
        bpy.context.collection.objects.link(arm)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode='EDIT')
        for nome, cabeca, cauda, pai in ossos:
            eb = dados.edit_bones.new(nome)
            eb.head, eb.tail = Vector(cabeca), Vector(cauda)
            if pai:
                eb.parent = dados.edit_bones[pai]
                eb.use_connect = False
        bpy.ops.object.mode_set(mode='OBJECT')
        self.arm = arm
        self.ossos = [o[0] for o in ossos]
        return arm

    def esqueleto_chibi(self, quadril, pescoco, topo, ombro, mao, anca, pe, cauda=None, extras=()):
        """Esqueleto padrão dos moradores. Pontos do lado esquerdo (+X); o direito é espelhado."""
        esp = lambda p: (-p[0], p[1], p[2])  # noqa: E731
        ossos = [
            ('raiz', (0, 0, 0), (0, 0, 0.15), None),
            ('quadril', (0, 0, quadril), (0, 0, quadril + 0.12), 'raiz'),
            ('tronco', (0, 0, quadril), (0, 0, pescoco), 'quadril'),
            ('cabeca', (0, 0, pescoco), (0, 0, topo), 'tronco'),
            ('braco_esq', ombro, mao, 'tronco'),
            ('braco_dir', esp(ombro), esp(mao), 'tronco'),
            ('perna_esq', anca, pe, 'quadril'),
            ('perna_dir', esp(anca), esp(pe), 'quadril'),
        ]
        if cauda:
            ossos.append(('cauda', cauda[0], cauda[1], 'quadril'))
        ossos.extend(extras)
        return self.esqueleto(ossos)

    # ----------------------------------------------------------------- montagem
    def finalizar(self):
        """Junta as peças de cada osso, prende com peso 1 e cria a malha dos olhos com formas."""
        arm = self.arm
        if os.environ.get('PERSONAGEM_CONTAR'):
            pecas = [(sum(len(f.vertices) - 2 for f in o.data.polygons), o.data.materials[0].name, osso)
                     for osso, objs in self.pecas.items() for o in objs]
            for n, mat, osso in sorted(pecas, reverse=True)[:25]:
                print(f'  {n:5d} {osso:10s} {mat}')
        self._caber_no_orcamento()
        juntas = []
        for osso, objs in self.pecas.items():
            o = juntar(objs, f'{self.pid}-{osso}')
            g = o.vertex_groups.new(name=osso)
            g.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
            juntas.append(o)
        corpo = juntar(juntas, self.pid + '-corpo')
        _prender(corpo, arm)
        if self.olhos:
            olhos = self._malha_dos_olhos()
            _prender(olhos, arm)
        return corpo

    def _caber_no_orcamento(self):
        """Se passar de ALVO_TRIANGULOS, afina só as peças grandes e lisas (corpo, cabeça, casco):
        nelas a diferença não aparece, e os detalhes pequenos (garras, fios, olhos) ficam inteiros."""
        tris = lambda o: sum(len(f.vertices) - 2 for f in o.data.polygons)  # noqa: E731
        pecas = [o for objs in self.pecas.values() for o in objs]
        olhos = sum(tris(o) for o, *_ in self.olhos)
        # A cabeça é o que mais aparece (diálogo, retrato): nada nela afina.
        cabeca = set(self.pecas.get('cabeca', []))
        grandes = [o for o in pecas if tris(o) >= 200 and o not in cabeca]
        total = sum(tris(o) for o in pecas) + olhos
        if total <= ALVO_TRIANGULOS or not grandes:
            return
        soma_grandes = sum(tris(o) for o in grandes)
        razao = max(0.5, (ALVO_TRIANGULOS - (total - soma_grandes)) / soma_grandes)
        for o in grandes:
            mod = o.modifiers.new('afinar', 'DECIMATE')
            mod.ratio = razao
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=mod.name)

    def _malha_dos_olhos(self):
        lados = {}
        for o, lado, c, r in self.olhos:
            lados.setdefault(lado, (c, r))
        objs = [o for o, *_ in self.olhos]
        olhos = juntar(objs, self.pid + '-olhos')
        g = olhos.vertex_groups.new(name='cabeca')
        g.add([v.index for v in olhos.data.vertices], 1.0, 'REPLACE')
        formas_dos_olhos(olhos, lambda co: lados[1 if co.x >= 0 else -1])
        return olhos

    # ----------------------------------------------------------------- animação
    def _rot_local(self, pb, giros):
        R = Matrix.Identity(3)
        for eixo, graus in giros:
            R = Matrix.Rotation(math.radians(graus), 3, eixo) @ R
        # Os giros vêm nos eixos do mundo; o espaço do esqueleto pode estar girado (o do avatar
        # vem do glTF com y para cima e um giro de 90 graus no objeto).
        W = self.arm.matrix_world.to_3x3().normalized()
        R = W.inverted() @ R @ W
        B = pb.bone.matrix_local.to_3x3().normalized()
        return (B.inverted() @ R @ B).to_quaternion()

    def _loc_local(self, pb, d):
        W = self.arm.matrix_world.to_3x3().normalized()
        B = pb.bone.matrix_local.to_3x3().normalized()
        return B.inverted() @ W.inverted() @ (Vector(d) / self.escala_arm)

    def clipe(self, nome, quadros, pose, passo=2, animados=None):
        """Grava um clipe em laço. `pose(t)` devolve {osso: {'rot': [(eixo, graus)], 'loc': (x,y,z)}}
        com t de 0 a 1. Todo clipe chave os MESMOS ossos, para a troca de clipe no jogo não deixar
        um osso preso na pose do clipe anterior. Só os ossos de `COM_POSICAO` andam (sobem no
        pulo, balançam no passo); os outros só giram."""
        arm = self.arm
        nomes = animados or self.animados or self.ossos
        self.animados = nomes
        arm.animation_data_create()
        anterior = {}
        for f in list(range(0, quadros, passo)) + [quadros]:
            t = f / quadros
            p = pose(t)
            for n in nomes:
                pb = arm.pose.bones[n]
                pb.rotation_mode = 'QUATERNION'
                spec = p.get(n, {})
                q = self._rot_local(pb, spec.get('rot', []))
                if n in anterior:
                    q.make_compatible(anterior[n])
                anterior[n] = q
                pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=f)
                if n in COM_POSICAO:
                    pb.location = self._loc_local(pb, spec.get('loc', (0, 0, 0)))
                    pb.keyframe_insert('location', frame=f)
        ad = arm.animation_data
        acao = ad.action
        acao.name = nome
        for fc in fcurves(acao):
            for k in fc.keyframe_points:
                k.interpolation = 'BEZIER'
                k.handle_left_type = k.handle_right_type = 'AUTO_CLAMPED'
        faixa = ad.nla_tracks.new()
        faixa.name = nome
        faixa.strips.new(nome, 0, acao)
        ad.action = None
        for pb in arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)

    # ----------------------------------------------------------------- saída
    def exportar(self, caminho=None):
        caminho = caminho or os.environ.get('PERSONAGEM_OUT') or os.path.join(ASSETS, f'{self.pid}.glb')
        os.makedirs(os.path.dirname(os.path.abspath(caminho)), exist_ok=True)
        bpy.context.scene.frame_start = 0
        bpy.ops.export_scene.gltf(
            filepath=caminho,
            export_format='GLB',
            export_animations=True,
            # ACTIONS (um clipe por ação): no modo NLA_TRACKS o exportador não sabe quais ossos têm
            # curva e apaga os canais constantes (o antebraço parado no `parado`), e no jogo o osso
            # voltaria para a pose em T. Assim o canal constante fica com duas chaves.
            export_animation_mode='ACTIONS',
            export_apply=True,
            export_yup=True,
            export_texcoords=False,
            export_normals=True,
            export_morph=True,
            export_morph_normal=False,
            export_try_sparse_sk=True,
            export_optimize_animation_size=True,
            export_frame_step=2,  # 12 amostras por segundo: o jogo interpola entre elas
            export_optimize_animation_keep_anim_armature=False,
            export_draco_mesh_compression_enable=False,
        )
        tris = contar_triangulos()
        tam = os.path.getsize(caminho)
        print(f'{self.pid}: {tris} triângulos, {tam / 1024:.0f} KB em {os.path.abspath(caminho)}')
        return tris, tam


# --------------------------------------------------------------------- funções soltas
def suavizar(o, angulo=None):
    """Sombreado liso; com `angulo`, as arestas mais vivas que isso ficam marcadas (sem borrar)."""
    for p in o.data.polygons:
        p.use_smooth = True
    if angulo is None:
        return
    bm = bmesh.new()
    bm.from_mesh(o.data)
    lim = math.radians(angulo)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
            e.smooth = False
    bm.to_mesh(o.data)
    bm.free()


def juntar(objs, nome):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = nome
    o.data.name = nome
    return o


def _prender(o, arm):
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    mod = o.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm


def formas_dos_olhos(olhos, centro_de):
    """Formas `piscar` (olho fechado numa linha) e `feliz` (olho em arco, ^ ^) na malha dos olhos.
    `centro_de(co)` devolve (centro, raios) do olho daquele vértice."""
    olhos.shape_key_add(name='Basis', from_mix=False)
    piscar = olhos.shape_key_add(name='piscar', from_mix=False)
    feliz = olhos.shape_key_add(name='feliz', from_mix=False)
    for i, v in enumerate(olhos.data.vertices):
        c, r = centro_de(v.co)
        dz = v.co.z - c.z
        dx = (v.co.x - c.x) / max(r.x, 1e-6)
        z_fechado = c.z - r.z * 0.25 + dz * 0.1
        piscar.data[i].co = Vector((v.co.x, v.co.y, z_fechado))
        arco = r.z * 0.55 * max(0.0, 1 - dx * dx)
        feliz.data[i].co = Vector((v.co.x, v.co.y, c.z - r.z * 0.3 + dz * 0.18 + arco))
    # As formas começam desligadas (o exportador grava o valor atual como peso inicial).
    piscar.value = 0.0
    feliz.value = 0.0


def fcurves(acao):
    if hasattr(acao, 'fcurves') and len(getattr(acao, 'fcurves', [])) > 0:
        return list(acao.fcurves)
    curvas = []
    for camada in getattr(acao, 'layers', []):
        for faixa in camada.strips:
            for cb in faixa.channelbags:
                curvas.extend(cb.fcurves)
    return curvas


def contar_triangulos():
    return sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)


# --------------------------------------------------------------------- clipes dos moradores
def clipes_chibi(p, jeito=None):
    """Os cinco clipes dos moradores (`parado`, `andar`, `falar`, `acenar`, `feliz`) no esqueleto
    de `esqueleto_chibi`. `jeito` ajusta o estilo de cada bicho:
    - `ginga`: quanto o corpo balança de lado ao andar (o pinguim e a tartaruga gingam mais);
    - `passo`: amplitude das pernas; `braco`: dos braços; `asa`: braço que bate como asa no feliz;
    - `abre`: quanto os braços abrem para os lados em descanso (graus);
    - `pulo`: altura do pulo no feliz; `cauda`: amplitude da cauda."""
    j = {'ginga': 3.0, 'passo': 30.0, 'braco': 22.0, 'asa': False, 'abre': 0.0, 'pulo': 0.16,
         'cauda': 10.0}
    j.update(jeito or {})
    abre = j['abre']

    def braco(lado, frente=0.0, sobe=0.0):
        """Braço: `frente` positivo leva a mão para a frente; `sobe` abre pelo lado e sobe."""
        s = 1 if lado == 'esq' else -1
        return {'rot': [('Y', -s * (abre + sobe)), ('X', -frente)]}

    def parado(t):
        return {
            'quadril': {'loc': (0, 0, 0.008 * sen(t))},
            'tronco': {'rot': [('X', 1.5 * sen(t)), ('Y', 1.2 * sen(t, 1, 0.25))]},
            'cabeca': {'rot': [('X', -1.5 * sen(t, 1, 0.1)), ('Y', 3 * sen(t, 1, 0.3)), ('Z', 2 * sen(t, 1, 0.6))]},
            'braco_esq': braco('esq', 3 * sen(t, 1, 0.5), 2 + 2 * sen(t)),
            'braco_dir': braco('dir', 3 * sen(t), 2 + 2 * sen(t)),
            'cauda': {'rot': [('Z', j['cauda'] * sen(t)), ('X', 3 * sen(t, 2))]},
        }

    def andar(t):
        a, b, g = j['passo'], j['braco'], j['ginga']
        return {
            'raiz': {},
            'quadril': {'loc': (0, 0, 0.03 * (0.5 + 0.5 * cos(t, 2))), 'rot': [('Z', 4 * sen(t)), ('Y', g * sen(t))]},
            'tronco': {'rot': [('X', 4), ('Y', -0.6 * g * sen(t)), ('Z', -3 * sen(t))]},
            'cabeca': {'rot': [('X', -3 + 2 * cos(t, 2)), ('Y', -0.4 * g * sen(t)), ('Z', -2 * sen(t))]},
            'perna_esq': {'rot': [('X', -a * sen(t))]},
            'perna_dir': {'rot': [('X', a * sen(t))]},
            'braco_esq': braco('esq', b * sen(t), 4),
            'braco_dir': braco('dir', -b * sen(t), 4),
            'cauda': {'rot': [('Z', j['cauda'] * sen(t, 1, 0.5)), ('X', 4 * cos(t, 2))]},
        }

    def falar(t):
        return {
            'quadril': {'loc': (0, 0, 0.006 * sen(t, 2))},
            'tronco': {'rot': [('X', 2 * sen(t, 2)), ('Z', 4 * sen(t))]},
            'cabeca': {'rot': [('X', 4 * sen(t, 4) + 2), ('Y', 6 * sen(t)), ('Z', -3 * sen(t))]},
            'braco_esq': braco('esq', 8 + 4 * sen(t, 2), 6),
            'braco_dir': braco('dir', 45 + 14 * sen(t, 2), 22 + 8 * sen(t, 1, 0.25)),
            'cauda': {'rot': [('Z', j['cauda'] * 0.6 * sen(t, 2))]},
        }

    def acenar(t):
        return {
            'quadril': {'loc': (0, 0, 0.006 * sen(t, 3))},
            'tronco': {'rot': [('Y', 5 + 2 * sen(t, 3))]},
            'cabeca': {'rot': [('Y', 8 + 3 * sen(t, 3)), ('X', -4)]},
            'braco_esq': braco('esq', 3, 4),
            'braco_dir': {'rot': [('Y', 128 + 18 * sen(t, 3)), ('X', -22)]},
            'cauda': {'rot': [('Z', j['cauda'] * 1.4 * sen(t, 3))]},
        }

    def feliz(t):
        # Um pulinho por segundo: agacha, sobe com os braços para cima, cai e amortece.
        no_ar = suave(0.12, 0.3, t) * (1 - suave(0.7, 0.88, t))
        u = min(1.0, max(0.0, (t - 0.15) / 0.7))
        alt = j['pulo'] * math.sin(math.pi * u)
        agacha = 1 - no_ar
        bate = 18 * sen(t, 4) if j['asa'] else 8 * sen(t, 2)
        return {
            'raiz': {'loc': (0, 0, alt)},
            'quadril': {'loc': (0, 0, -0.04 * agacha)},
            'tronco': {'rot': [('X', 6 * agacha - 4 * no_ar)]},
            'cabeca': {'rot': [('X', -10 * no_ar), ('Y', 6 * sen(t))]},
            'perna_esq': {'rot': [('X', -14 * no_ar)]},
            'perna_dir': {'rot': [('X', -14 * no_ar)]},
            'braco_esq': braco('esq', 18, 30 + 85 * no_ar + bate),
            'braco_dir': braco('dir', 18, 30 + 85 * no_ar + bate),
            'cauda': {'rot': [('Z', j['cauda'] * 2 * sen(t, 4)), ('X', -10 * no_ar)]},
        }

    p.clipe('parado', 48, parado)
    p.clipe('andar', 24, andar)
    p.clipe('falar', 48, falar)
    p.clipe('acenar', 48, acenar)
    p.clipe('feliz', 24, feliz)
