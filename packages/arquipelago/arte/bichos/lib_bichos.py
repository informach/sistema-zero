"""Ajudantes dos bichos do Arquipélago Vagalume (Lote 4; Blender sem tela, `bpy` do PyPI).

Partiu de `arte/personagens/lib_personagens.py` (a mesma montagem dos moradores): formas
arredondadas (torno, superelipsoide, tubo, placa), olhos numa malha separada com as formas `piscar`
e `feliz`, esqueleto próprio com pesos rígidos por peça e as animações em laço gravadas como faixas
de NLA (o exportador vira um clipe por faixa). Aqui entram os esqueletos e clipes de bicho de
quatro patas, de ave (e borboleta), de peixe e de bípede pequeno (pinguim, dinozinho), o teto de
triângulos por bicho e o `soquete` (um vazio preso a um osso, como a `sela` do dino).

Convenções (as mesmas do Zappy, do avatar e dos moradores): z para cima, a FRENTE olha para -Y, o
lado esquerdo do bicho fica em +X, na escala do avatar (~2,2 de altura).

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
ASSETS = os.path.normpath(os.path.join(HERE, '..', '..', 'src', 'assets', 'bichos'))
TAU = 2 * math.pi
# Teto padrão de triângulos de um bicho pequeno (o dino de montaria pede ~6 mil).
ALVO_TRIANGULOS = 2900
# Ossos que mudam de posição nos clipes (os outros só giram).
COM_POSICAO = {'raiz', 'quadril', 'corpo'}


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


class Bicho:
    """Monta um bicho peça a peça; cada peça pertence a um osso."""

    def __init__(self, pid, paleta, alvo=ALVO_TRIANGULOS, escala=1.0):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.render.fps = FPS
        self.pid = pid
        self.paleta = paleta
        self.mats = {}
        self.pecas = {}
        self.olhos = []  # (objeto, lado, centro, raios)
        self.ossos = []
        self.arm = None
        self.animados = None
        self.alvo = alvo
        # O filhote é o mesmo desenho menor: tudo é feito em metros do desenho e `finalizar`
        # encolhe as malhas; o esqueleto, as posições dos clipes e os soquetes seguem a escala.
        self.escala = escala
        self.dims = {}
        self.soquetes = []

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
            eb.head, eb.tail = Vector(cabeca) * self.escala, Vector(cauda) * self.escala
            if pai:
                eb.parent = dados.edit_bones[pai]
                eb.use_connect = False
        bpy.ops.object.mode_set(mode='OBJECT')
        self.arm = arm
        self.ossos = [o[0] for o in ossos]
        return arm

    def esqueleto_chibi(self, quadril, pescoco, topo, ombro, mao, anca, pe, cauda=None, extras=()):
        """Esqueleto de bípede pequeno (pinguim, dinozinho), o mesmo dos moradores. Pontos do lado
        esquerdo (+X); o direito é espelhado."""
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

    def esqueleto_quadrupede(self, hc, anca, ombro, pescoco, topo, cauda=None, orelha=None, pescoco_osso=None):
        """Bicho de quatro patas. `corpo` vai da anca (atrás) ao ombro (na frente) na altura `hc`,
        então girar o corpo gira em volta das ancas (sentar). As patas descem do ombro e da anca do
        lado esquerdo (+X) até o chão; o lado direito é espelhado. `cauda` e `orelha` (esquerda) são
        (de, até). `pescoco_osso` = (de, até) põe um osso de pescoço entre o corpo e a cabeça."""
        esp = lambda q: (-q[0], q[1], q[2])  # noqa: E731
        ossos = [
            ('raiz', (0, 0, 0), (0, 0, 0.1), None),
            ('corpo', (0, anca[1], hc), (0, ombro[1], hc), 'raiz'),
        ]
        pai_cab = 'corpo'
        if pescoco_osso:
            ossos.append(('pescoco', pescoco_osso[0], pescoco_osso[1], 'corpo'))
            pai_cab = 'pescoco'
        ossos += [
            ('cabeca', pescoco, topo, pai_cab),
            ('pata_fe', ombro, (ombro[0], ombro[1], 0.0), 'corpo'),
            ('pata_fd', esp(ombro), (-ombro[0], ombro[1], 0.0), 'corpo'),
            ('pata_te', anca, (anca[0], anca[1], 0.0), 'corpo'),
            ('pata_td', esp(anca), (-anca[0], anca[1], 0.0), 'corpo'),
        ]
        if cauda:
            ossos.append(('cauda', cauda[0], cauda[1], 'corpo'))
        if orelha:
            ossos.append(('orelha_esq', orelha[0], orelha[1], 'cabeca'))
            ossos.append(('orelha_dir', esp(orelha[0]), esp(orelha[1]), 'cabeca'))
        self.dims.update({'hc': hc, 'entre': abs(anca[1] - ombro[1]), 'perna': ombro[2], 'anca': anca[2]})
        return self.esqueleto(ossos)

    def esqueleto_ave(self, corpo, pescoco, topo, ombro, ponta, cauda=None):
        """Ave ou borboleta. `corpo` = (de, até) do rabo para o peito; as asas vão do `ombro` à
        `ponta` (lado esquerdo, +X), abertas no desenho: o clipe `pousado` dobra as asas ao longo
        do corpo e o `voar` bate."""
        esp = lambda q: (-q[0], q[1], q[2])  # noqa: E731
        ossos = [
            ('raiz', (0, 0, 0), (0, 0, 0.1), None),
            ('corpo', corpo[0], corpo[1], 'raiz'),
            ('cabeca', pescoco, topo, 'corpo'),
            ('asa_esq', ombro, ponta, 'corpo'),
            ('asa_dir', esp(ombro), esp(ponta), 'corpo'),
        ]
        if cauda:
            ossos.append(('cauda', cauda[0], cauda[1], 'corpo'))
        return self.esqueleto(ossos)

    def esqueleto_peixe(self, comprimento, nadadeira):
        """Peixe com a origem no meio do corpo (ele boia: o jogo põe na água). `corpo` vai do
        meio para a frente, `cabeca` é a ponta da frente, `cauda` a de trás e as nadadeiras
        saem de `nadadeira` (lado esquerdo)."""
        c = comprimento
        esp = lambda q: (-q[0], q[1], q[2])  # noqa: E731
        ponta = (nadadeira[0] + 0.06, nadadeira[1] + 0.04, nadadeira[2] - 0.01)
        return self.esqueleto([
            ('raiz', (0, 0, 0), (0, 0, 0.05), None),
            ('corpo', (0, 0.1 * c, 0), (0, -0.25 * c, 0), 'raiz'),
            ('cabeca', (0, -0.25 * c, 0), (0, -0.5 * c, 0), 'corpo'),
            ('cauda', (0, 0.15 * c, 0), (0, 0.6 * c, 0), 'corpo'),
            ('nadadeira_esq', nadadeira, ponta, 'corpo'),
            ('nadadeira_dir', esp(nadadeira), esp(ponta), 'corpo'),
        ])

    # ----------------------------------------------------------------- montagem
    def finalizar(self):
        """Junta as peças de cada osso, prende com peso 1 e cria a malha dos olhos com formas."""
        arm = self.arm
        if os.environ.get('BICHO_CONTAR'):
            pecas = [(sum(len(f.vertices) - 2 for f in o.data.polygons), o.data.materials[0].name, osso)
                     for osso, objs in self.pecas.items() for o in objs]
            for n, mat, osso in sorted(pecas, reverse=True)[:25]:
                print(f'  {n:5d} {osso:10s} {mat}')
        self._caber_no_orcamento()
        if self.escala != 1:
            m = Matrix.Scale(self.escala, 4)
            for o in [o for objs in self.pecas.values() for o in objs] + [o for o, *_ in self.olhos]:
                o.data.transform(m)
            self.olhos = [(o, lado, c * self.escala, r * self.escala) for o, lado, c, r in self.olhos]
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
        """Se passar do teto (`self.alvo`), afina só as peças grandes e lisas (corpo, cabeça, casco):
        nelas a diferença não aparece, e os detalhes pequenos (garras, fios, olhos) ficam inteiros."""
        tris = lambda o: sum(len(f.vertices) - 2 for f in o.data.polygons)  # noqa: E731
        pecas = [o for objs in self.pecas.values() for o in objs]
        olhos = sum(tris(o) for o, *_ in self.olhos)
        # A cabeça é o que mais aparece (diálogo, retrato): nada nela afina.
        cabeca = set(self.pecas.get('cabeca', []))
        grandes = [o for o in pecas if tris(o) >= 150 and o not in cabeca]
        total = sum(tris(o) for o in pecas) + olhos
        if total <= self.alvo or not grandes:
            return
        soma_grandes = sum(tris(o) for o in grandes)
        razao = max(0.4, (self.alvo - (total - soma_grandes)) / soma_grandes)
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
        return B.inverted() @ W.inverted() @ Vector(d)

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
                    pb.location = self._loc_local(pb, Vector(spec.get('loc', (0, 0, 0))) * self.escala)
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
        caminho = caminho or os.environ.get('BICHO_OUT') or os.path.join(ASSETS, f'{self.pid}.glb')
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

    def soquete(self, nome, osso, ponto):
        """Vazio preso a um osso (a `sela` do dino de montaria): o jogo acha pelo nome
        (`getObjectByName`) e põe quem monta ali; ele acompanha o osso em todos os clipes.
        `ponto` em metros do desenho (a escala do bicho entra aqui)."""
        vazio = bpy.data.objects.new(nome, None)
        bpy.context.collection.objects.link(vazio)
        vazio.empty_display_size = 0.1
        vazio.parent = self.arm
        vazio.parent_type = 'BONE'
        vazio.parent_bone = osso
        bpy.context.view_layer.update()
        vazio.matrix_world = Matrix.Translation(Vector(ponto) * self.escala)
        self.soquetes.append(vazio)
        return vazio


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


# --------------------------------------------------------------------- clipes de quatro patas
def clipes_quadrupede(p, jeito=None, truque=None, quais=None):
    """Os seis clipes dos bichos de adotar no esqueleto de `esqueleto_quadrupede`: `parado`,
    `andar`, `correr`, `sentar`, `feliz` e o `truque` da espécie (`truque` = (quadros, pose)).
    `jeito`: `passo` e `galope` (amplitude das patas), `cauda` e `orelha` (amplitude), `pulo`
    (altura no feliz), `sentar` (graus que o corpo levanta), `saltitante` (anda aos pulinhos, as
    duas patas de trás juntas, como o coelho) e `cauda_alta` (graus da cauda erguida). `quais` =
    {clipe: nome no arquivo} grava só esses (o dinozinho usa o `feliz` como `pular`)."""
    j = {'passo': 26.0, 'galope': 38.0, 'cauda': 16.0, 'orelha': 6.0, 'pulo': 0.16, 'sentar': 28.0,
         'saltitante': False, 'cauda_alta': 0.0}
    j.update(jeito or {})
    d = p.dims
    ang = j['sentar']
    queda = d['entre'] * math.sin(math.radians(ang))
    # Na pose sentada a anca desce `queda`; a pata de trás dobra para a frente até o pé caber.
    h_anca = max(0.02, d['anca'] - queda)
    dobra = math.degrees(math.acos(max(-1.0, min(1.0, h_anca / max(d['anca'], 1e-6))))) + 6

    def orelhas(a, fase=0.0):
        return {'orelha_esq': {'rot': [('X', a), ('Y', -2 * sen(fase))]},
                'orelha_dir': {'rot': [('X', a), ('Y', 2 * sen(fase))]}}

    def parado(t):
        pose = {
            'corpo': {'loc': (0, 0, 0.004 * sen(t))},
            'cabeca': {'rot': [('X', -2 * sen(t, 1, 0.1)), ('Z', 8 * sen(t, 1, 0.3)), ('Y', 3 * sen(t, 1, 0.6))]},
            'cauda': {'rot': [('X', -j['cauda_alta']), ('Z', j['cauda'] * 0.6 * sen(t, 2))]},
        }
        pose.update(orelhas(j['orelha'] * 0.5 * sen(t, 2), t))
        return pose

    def passo_diagonal(t, a):
        return {
            'pata_fe': {'rot': [('X', -a * sen(t))]},
            'pata_td': {'rot': [('X', -a * sen(t))]},
            'pata_fd': {'rot': [('X', a * sen(t))]},
            'pata_te': {'rot': [('X', a * sen(t))]},
        }

    def pulinho(t, alt, a):
        """Um pulinho de coelho por ciclo: as de trás empurram juntas, as da frente pousam."""
        u = suave(0.1, 0.9, t)
        no_ar = math.sin(math.pi * u)
        return {
            'raiz': {'loc': (0, 0, alt * no_ar)},
            'corpo': {'rot': [('X', -8 * sen(t, 1, 0.05))]},
            'pata_fe': {'rot': [('X', -a * sen(t, 1, 0.2))]},
            'pata_fd': {'rot': [('X', -a * sen(t, 1, 0.2))]},
            'pata_te': {'rot': [('X', a * sen(t, 1, 0.0))]},
            'pata_td': {'rot': [('X', a * sen(t, 1, 0.0))]},
            'cabeca': {'rot': [('X', 4 * sen(t, 1, 0.3))]},
        }

    def andar(t):
        if j['saltitante']:
            pose = pulinho(t, 0.05, j['passo'])
        else:
            pose = passo_diagonal(t, j['passo'])
            pose.update({
                'corpo': {'loc': (0, 0, 0.008 * cos(t, 2)), 'rot': [('Z', 2 * sen(t)), ('Y', 2 * sen(t))]},
                'cabeca': {'rot': [('X', 3 * cos(t, 2)), ('Z', -2 * sen(t))]},
            })
        pose['cauda'] = {'rot': [('X', -j['cauda_alta']), ('Z', j['cauda'] * sen(t, 2))]}
        pose.update(orelhas(j['orelha'] * cos(t, 2), t))
        return pose

    def correr(t):
        a = j['galope']
        if j['saltitante']:
            pose = pulinho(t, 0.11, a)
        else:
            def par(fase):
                return [('X', -a * sen(t, 1, fase))]
            pose = {
                'corpo': {'loc': (0, 0, 0.03 * (0.5 + 0.5 * cos(t))), 'rot': [('X', 7 * sen(t, 1, 0.1))]},
                'cabeca': {'rot': [('X', -5 * sen(t, 1, 0.1))]},
                'pata_fe': {'rot': par(0.0)},
                'pata_fd': {'rot': par(0.08)},
                'pata_te': {'rot': par(0.5)},
                'pata_td': {'rot': par(0.58)},
            }
        pose['cauda'] = {'rot': [('X', -j['cauda_alta'] * 0.5 + 6 * sen(t)), ('Z', j['cauda'] * 0.5 * sen(t, 2))]}
        pose.update(orelhas(j['orelha'] * 2.5 + j['orelha'] * sen(t), t))
        return pose

    def sentado(t, extra=None):
        pose = {
            'corpo': {'loc': (0, 0, -queda + 0.004 * sen(t)), 'rot': [('X', -ang)]},
            'cabeca': {'rot': [('X', ang * 0.75 - 2 * sen(t)), ('Z', 6 * sen(t, 1, 0.3)), ('Y', 6 * sen(t, 1, 0.55))]},
            'pata_fe': {'rot': [('X', ang)]},
            'pata_fd': {'rot': [('X', ang)]},
            'pata_te': {'rot': [('X', ang - dobra)]},
            'pata_td': {'rot': [('X', ang - dobra)]},
            'cauda': {'rot': [('X', ang - j['cauda_alta'] * 0.3), ('Z', j['cauda'] * 0.7 * sen(t, 2))]},
        }
        pose.update(orelhas(j['orelha'] * 0.5 * sen(t, 2), t))
        if extra:
            pose.update(extra)
        return pose

    def feliz(t):
        no_ar = suave(0.12, 0.3, t) * (1 - suave(0.7, 0.88, t))
        u = min(1.0, max(0.0, (t - 0.15) / 0.7))
        alt = j['pulo'] * math.sin(math.pi * u)
        agacha = 1 - no_ar
        pose = {
            'raiz': {'loc': (0, 0, alt)},
            'corpo': {'loc': (0, 0, -0.025 * agacha), 'rot': [('X', -6 * no_ar)]},
            'cabeca': {'rot': [('X', -10 * no_ar), ('Y', 8 * sen(t, 2))]},
            'pata_fe': {'rot': [('X', -24 * no_ar)]},
            'pata_fd': {'rot': [('X', -24 * no_ar)]},
            'pata_te': {'rot': [('X', 22 * no_ar)]},
            'pata_td': {'rot': [('X', 22 * no_ar)]},
            'cauda': {'rot': [('X', -j['cauda_alta'] - 10 * no_ar), ('Z', j['cauda'] * 1.8 * sen(t, 4))]},
        }
        pose.update(orelhas(-j['orelha'] * 2 * no_ar, t))
        return pose

    p.sentado = sentado
    todos = {'parado': (48, parado), 'andar': (24, andar), 'correr': (16, correr), 'sentar': (48, sentado),
             'feliz': (24, feliz)}
    if truque:
        todos['truque'] = truque
    for nome, saida in (quais or {n: n for n in todos}).items():
        quadros, pose = todos[nome]
        p.clipe(saida, quadros, pose)


# --------------------------------------------------------------------- clipes de ave
def clipes_ave(p, jeito=None):
    """`voar` (bate as asas abertas) e `pousado` (asas dobradas ao longo do corpo, olha em volta
    e bica). `jeito`: `bate` (graus), `dobra` (graus que a asa gira para trás no pousado),
    `borboleta` (pousada com as asas fechadas para cima, abrindo devagar)."""
    j = {'bate': 38.0, 'dobra': 78.0, 'borboleta': False, 'voo': 12}
    j.update(jeito or {})

    def voar(t):
        b = j['bate']
        if j['borboleta']:
            return {
                'corpo': {'loc': (0, 0, 0.02 * sen(t, 1, 0.25)), 'rot': [('X', -10 + 4 * sen(t))]},
                'asa_esq': {'rot': [('Y', -b * (0.2 + sen(t)))]},
                'asa_dir': {'rot': [('Y', b * (0.2 + sen(t)))]},
                'cabeca': {'rot': [('X', 3 * sen(t))]},
            }
        return {
            'corpo': {'loc': (0, 0, 0.025 * sen(t, 1, 0.3)), 'rot': [('X', -4 * sen(t, 1, 0.3))]},
            'cabeca': {'rot': [('X', 4 * sen(t, 1, 0.3))]},
            'asa_esq': {'rot': [('Y', -b * sen(t))]},
            'asa_dir': {'rot': [('Y', b * sen(t))]},
            'cauda': {'rot': [('X', 6 * sen(t, 1, 0.4))]},
        }

    def pousado(t):
        if j['borboleta']:
            abre = 0.5 + 0.5 * sen(t)
            return {
                'asa_esq': {'rot': [('Y', -84 + 50 * abre)]},
                'asa_dir': {'rot': [('Y', 84 - 50 * abre)]},
                'cabeca': {'rot': [('Z', 6 * sen(t, 1, 0.3))]},
            }
        bica = suave(0.55, 0.62, t) * (1 - suave(0.68, 0.78, t))
        return {
            'corpo': {'loc': (0, 0, 0.003 * sen(t, 2)), 'rot': [('X', 18 * bica)]},
            'cabeca': {'rot': [('X', 26 * bica), ('Z', 28 * sen(t, 1, 0.1) * (1 - bica))]},
            'asa_esq': {'rot': [('Z', j['dobra']), ('Y', 14 + 2 * sen(t, 2))]},
            'asa_dir': {'rot': [('Z', -j['dobra']), ('Y', -14 - 2 * sen(t, 2))]},
            'cauda': {'rot': [('X', -6 * bica + 3 * sen(t, 2))]},
        }

    p.clipe('voar', j['voo'], voar, passo=1)
    p.clipe('pousado', 48, pousado)


# --------------------------------------------------------------------- clipes de peixe
def clipes_peixe(p, jeito=None):
    """`nadar` (o corpo ondula, a cauda bate e as nadadeiras remam) e `parado` (boiando devagar)."""
    j = {'cauda': 26.0, 'corpo': 6.0}
    j.update(jeito or {})

    def nadar(t):
        return {
            'corpo': {'loc': (0, 0, 0.01 * sen(t, 1, 0.25)), 'rot': [('Z', j['corpo'] * sen(t))]},
            'cabeca': {'rot': [('Z', -j['corpo'] * 0.5 * sen(t))]},
            'cauda': {'rot': [('Z', -j['cauda'] * sen(t, 1, 0.15))]},
            'nadadeira_esq': {'rot': [('Z', 25 * sen(t, 2)), ('Y', -10)]},
            'nadadeira_dir': {'rot': [('Z', -25 * sen(t, 2)), ('Y', 10)]},
        }

    def parado(t):
        return {
            'corpo': {'loc': (0, 0, 0.012 * sen(t)), 'rot': [('Z', 2 * sen(t)), ('X', 2 * sen(t, 1, 0.25))]},
            'cauda': {'rot': [('Z', -8 * sen(t, 2))]},
            'nadadeira_esq': {'rot': [('Z', 18 * sen(t, 2))]},
            'nadadeira_dir': {'rot': [('Z', -18 * sen(t, 2, 0.25))]},
        }

    p.clipe('nadar', 24, nadar)
    p.clipe('parado', 48, parado)


# --------------------------------------------------------------------- passarinho
def corpo_de_passaro(p, crista=None, rabo=None, escala_cab=1.0):
    """O passarinho redondo dos dois pássaros (o das Nuvens e o bem-te-vi do Bosque): corpo, cabeça,
    bico, olhos, bochechas, asas abertas (o `pousado` dobra), rabo em leque e perninhas. Materiais:
    `penas`, `barriga`, `asa`, `bico`, `pe`. Devolve as malhas do rosto para os detalhes da espécie.
    `crista(p, cabeca, centro)` desenha o penacho; `rabo` = contorno do leque."""
    fc = escala_cab
    p.esfera('corpo', 'penas', (0, 0.01, 0.115), (0.075, 0.09, 0.08), seg=16, aneis=10)
    p.esfera('corpo', 'barriga', (0, -0.035, 0.1), (0.06, 0.055, 0.065), seg=14, aneis=8)
    cc = (0, -0.055, 0.21)
    cab = p.esfera('cabeca', 'penas', cc, (0.068 * fc, 0.066 * fc, 0.064 * fc), seg=16, aneis=10)
    rosto = [cab]
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.032 * fc * s, cc[2] + 0.01, (0.017 * fc, 0.011 * fc, 0.02 * fc), afunda=0.2,
                        seg=12, aneis=7)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.045 * fc * s, cc[2] - 0.02, (0.012, 0.005, 0.008), afunda=0.5,
                   seg=8, aneis=5)
    ponta = p.superficie(rosto, 0, cc[2] - 0.012)[0]
    p.torno('cabeca', 'bico', [(0.016 * fc, 0.0), (0.011 * fc, 0.012), (0.0, 0.028 * fc)], de=tuple(ponta),
            ate=(0, ponta.y - 1, ponta.z - 0.15), seg=8, escala=(1.15, 0.8))
    if crista:
        crista(p, cab, cc)
    for s, osso in ((1, 'asa_esq'), (-1, 'asa_dir')):
        def ponta_de_asa(v):
            # Mais larga no ombro e afinando para a ponta, com a beirada de trás em penas.
            k = 1 - 0.45 * max(0.0, v.x * s)
            return (v.x, v.y * k + 0.25 * max(0.0, v.x * s) ** 2, v.z)
        p.esfera(osso, 'asa', (0.13 * s, 0.015, 0.135), (0.085, 0.05, 0.012), deformar=ponta_de_asa, seg=12, aneis=6)
    contorno = rabo or [(-0.03, 0.0), (0.03, 0.0), (0.05, 0.07), (0.02, 0.085), (0.0, 0.07), (-0.02, 0.085),
                        (-0.05, 0.07)]
    p.placa('cauda', 'asa', contorno, 0.012, centro=(0, 0.075, 0.105), rot=(-75, 0, 0), bisel=0.003)
    for s in (1, -1):
        p.capsula('corpo', 'pe', (0.025 * s, 0.01, 0.05), (0.025 * s, 0.0, 0.01), 0.009, 0.008, seg=6, aneis=2)
        for k in (-1, 0, 1):
            p.capsula('corpo', 'pe', (0.025 * s, 0.0, 0.008), (0.025 * s + 0.012 * k, -0.025, 0.006), 0.005,
                      0.004, seg=5, aneis=1)
    p.esqueleto_ave(corpo=((0, 0.08, 0.115), (0, -0.05, 0.115)), pescoco=(0, -0.03, 0.155), topo=(0, -0.06, 0.285),
                    ombro=(0.05, 0.0, 0.135), ponta=(0.21, 0.0, 0.135), cauda=((0, 0.075, 0.105), (0, 0.17, 0.125)))
    return rosto, cc
