"""As animações do avatar a partir do Mixamo (`src/assets/avatar/locomocao.glb`).

Os arquivos são os FBX baixados do Mixamo com o nosso avatar (`avatar-com-esqueleto.fbx`, o
esqueleto `mixamorig` de 75 ossos), sem "In Place": ficam fora do repositório, numa pasta dada por
`MIXAMO_DIR` (procurados por nome, em qualquer subpasta). Rodar com o bpy da sessão do Blender:

    MIXAMO_DIR=/caminho/dos/fbx python -B arte/avatar/mixamo.py

O que este script faz com cada clipe (`CLIPES` abaixo):

- Passa o movimento para o esqueleto do jogo (o do `Poses.glb` da plataforma) osso a osso, pela
  rotação no mundo em relação à pose de descanso dos dois: o mesmo esqueleto, então nada distorce.
- Tira o deslocamento ("In Place"): o corpo do jogo é quem anda, sobe e cai. Nos ciclos, a reta
  do começo ao fim sai do quadril e vira a `passada` (quanto o corpo anda por ciclo), que a regra
  da locomoção usa para o pé não patinar.
- Encaixa onde o jogo espera: o bumbum no assento do banco (0,53 m) e na sela, as mãos na barra do
  planador, na borda e na corda do cipó, as costas no colchão e o nadador na linha da água.
- Grava cada clipe como uma faixa e enxuga o GLB: só os giros dos ossos e a posição da bacia.

No fim, imprime um resumo (`resumo` em JSON) com as durações, as passadas e onde ficaram as mãos:
os números da regra (`src/sistemas/locomocao.ts`) e do cipó precisam bater com ele.
"""
import glob
import json
import math
import os
import struct
import sys

sys.dont_write_bytecode = True

import bpy  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
PACOTE = os.path.abspath(os.path.join(AQUI, '..', '..'))
RAIZ = os.path.abspath(os.path.join(PACOTE, '..', '..'))
POSES = os.path.join(RAIZ, 'packages/community-kids/public/avatar3d/base/Poses.glb')
SAIDA = os.environ.get('LOCOMOCAO_OUT', os.path.join(PACOTE, 'src/assets/avatar/locomocao.glb'))
MIXAMO = os.environ.get('MIXAMO_DIR')
FPS = 30

# Onde o jogo espera as coisas (em metros, a partir da origem do desenho, que é o pé):
ASSENTO = 0.53          # o assento do banco (`BANCO` em sistemas/descanso.ts); a sela usa o mesmo
BACIA_ATRAS = 0.18      # a bacia sentada fica atrás da origem (`BANCO.baciaAtras`)
CENTRO = 0.95           # do pé ao centro do corpo (`CORPO.doCentroAoPe` + `CORPO.folga`)
MAOS_NA_BARRA = 1.25    # a barra do planador (`BARRA_NO_AVATAR.y`)
MAOS_NA_BORDA = CENTRO + 0.9   # pendurada na quina (`BORDA.maosAcimaDoCentro`)
QUADRIL_NADANDO = 0.58  # o nadador deitado na linha da água (a cintura do modo chão)
QUADRIL_DE_PE = 0.55    # a bacia de pé, parada (o "Idle")
COSTAS = 0.10           # deitada, as costas ficam isto abaixo da origem (`CAMA.costas`)

# Cada clipe: o arquivo do Mixamo e o que fazer. `trecho` em quadros do arquivo (inclusive);
# `laco` fecha o ciclo (o último quadro repete o primeiro); `vaivem` vai e volta (pose quase
# parada que respira); `plano`: 'xy' tira a reta no chão (a passada), 'xyz' também a subida, 'xy0'
# prende o quadril no chão onde começa; `chato`: a bacia parada nesta altura; `altura`: o quadril
# nesta altura média; `maos`: as mãos nesta altura média; `sentar`: o bumbum na altura dada com a
# bacia atrás da origem; `deitar`: as costas no colchão; `bracos`: os braços (e mãos) vindos de
# outro arquivo, num quadro.
CLIPES = [
    dict(nome='Parado', arquivo='Idle', laco=True, plano='xy0'),
    # Andar e correr começam no pé esquerdo pisando: o jogo toca os dois pela mesma fase.
    dict(nome='Andar', arquivo='Walking', laco=True, plano='xy', comeca_no_pe='Left'),
    dict(nome='Correr', arquivo='Running', laco=True, plano='xy', comeca_no_pe='Left'),
    # O pulo: o empurrão do "Jumping" (quadros 17 a 23, o corpo ainda em pé, braços abrindo). No ar
    # o corpo é levado pela física, então a bacia fica na altura de pé e só as pernas encolhem.
    dict(nome='Pulo', arquivo='Jumping', trecho=(17, 23), plano='xy0', chato=QUADRIL_DE_PE),
    # A queda: a descida do mesmo pulo (braços abertos, pernas indo para o chão), indo e voltando.
    dict(nome='Queda', arquivo='Jumping', trecho=(29, 34), vaivem=True, plano='xy0',
         chato=QUADRIL_DE_PE),
    # A aterrissagem: do toque no chão (35) até ficar de pé (52).
    dict(nome='Aterrissagem', arquivo='Jumping', trecho=(35, 52), plano='xy0'),
    dict(nome='Nado', arquivo='Swimming', laco=True, plano='xy', altura=QUADRIL_NADANDO),
    dict(nome='NadoParado', arquivo='Treading Water', laco=True, plano='xy0'),
    # No cipó: o começo do "Climbing A Rope" (agarrada na corda, pernas juntas), indo e voltando.
    # O jogo ainda fecha as mãos na corda (`personagem/bracos.ts`).
    dict(nome='Corda', arquivo='Climbing A Rope', trecho=(1, 12), vaivem=True, plano='xy0',
         altura=QUADRIL_DE_PE, cabeca=('Idle', 1)),
    # No planador: o corpo pendurado do "Hanging Idle" com os braços para a frente do "Driving"
    # (as mãos fechadas na barra, na frente do peito).
    dict(nome='Planar', arquivo='Hanging Idle', laco=True, plano='xy0', bracos=('Driving', 60),
         maos=MAOS_NA_BARRA),
    # Subir no tronco e na escada: a subida sai (o modo leva o corpo) e a bacia fica na altura de
    # pé, com os pés nos apoios logo acima da origem.
    dict(nome='Escalar', arquivo='Climbing', laco=True, plano='xyz', altura=QUADRIL_DE_PE + 0.15),
    # O "Climbing Ladder" do Mixamo sobe de costas para a frente dele: meia volta.
    dict(nome='SubirEscada', arquivo='Climbing Ladder', laco=True, plano='xyz',
         altura=QUADRIL_DE_PE + 0.15, meia_volta=True),
    # No tronco caído: o "Teeter" (quem se equilibra na beira), com os pés na origem.
    dict(nome='Equilibrar', arquivo='Teeter', laco=True, plano='xy0', altura=QUADRIL_DE_PE),
    # Pendurada na borda: o fim do "Braced Hang" (os pés na parede), indo e voltando.
    dict(nome='PendurarBorda', arquivo='Braced Hang', trecho=(25, 39), vaivem=True, plano='xy0',
         maos=MAOS_NA_BORDA),
    # Subir a borda: o começo do "Braced Hang Hop Up" (da quina, o corpo sobe e estica as pernas),
    # sem o deslocamento (o modo leva o corpo do pendurado até em cima).
    dict(nome='SubirBorda', arquivo='Braced Hang Hop Up', trecho=(1, 18), plano='xyz'),
    # Sentada no escorregador e no trenó: o bumbum na pista (a origem fica nela).
    dict(nome='Escorregar', arquivo='Sitting', laco=True, sentar=(0.0, BACIA_ATRAS)),
    dict(nome='Sentar', arquivo='Sitting', laco=True, sentar=(ASSENTO, BACIA_ATRAS)),
    # Montada no dino: sentada na sela com as pernas abertas dos lados do corpo dele, as mãos na
    # frente como quem segura as rédeas.
    dict(nome='Montar', arquivo='Driving', laco=True, sentar=(ASSENTO, BACIA_ATRAS), abrir_pernas=28),
    # Deitada de costas: o fim do "Lying Down", indo e voltando.
    dict(nome='Deitar', arquivo='Lying Down', trecho=(150, 173), vaivem=True, deitar=True),
]

PERNAS = ('UpLeg', 'Leg', 'Foot', 'ToeBase')


def eh_da_perna(nome, lado):
    n = nome.replace('mixamorig:' + lado, '')
    return nome.startswith('mixamorig:' + lado) and n.startswith(PERNAS)


BRACOS = ('Shoulder', 'Arm', 'ForeArm', 'Hand')


def eh_do_braco(nome):
    n = nome.replace('mixamorig:', '')
    return n.startswith(('Left', 'Right')) and any(
        p in n for p in BRACOS + ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'))


# ── O esqueleto do jogo ──────────────────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=POSES)
cena = bpy.context.scene
cena.render.fps = FPS
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
arm.name = 'alvo'
for o in list(bpy.data.objects):
    if o is not arm:
        bpy.data.objects.remove(o, do_unlink=True)
arm.animation_data_create()
arm.animation_data.action = None
for trilha in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(trilha)
for acao in list(bpy.data.actions):
    bpy.data.actions.remove(acao)


def profundidade(b):
    n = 0
    while b.parent:
        b = b.parent
        n += 1
    return n


OSSOS = sorted(arm.data.bones, key=profundidade)
CHAVEADOS = [b for b in OSSOS if not b.name.endswith('_end_end')]
_, ROT_ARM, _ = arm.matrix_world.decompose()
ROT_ARM_INV = ROT_ARM.inverted()
REPOUSO_ALVO = {b.name: (arm.matrix_world @ b.matrix_local).decompose()[1] for b in OSSOS}
REPOUSO_LOCAL = {}
for b in OSSOS:
    m = b.matrix_local if b.parent is None else b.parent.matrix_local.inverted() @ b.matrix_local
    REPOUSO_LOCAL[b.name] = m.decompose()[1]


# ── Os arquivos do Mixamo ────────────────────────────────────────────────────────────────────────
def achar(nome):
    if not MIXAMO:
        raise SystemExit('Diga onde estão os FBX do Mixamo em MIXAMO_DIR.')
    achados = glob.glob(os.path.join(MIXAMO, '**', nome + '.fbx'), recursive=True)
    if not achados:
        raise SystemExit(f'Faltou o arquivo do Mixamo: {nome}.fbx')
    return achados[0]


_carregados = {}


def carregar(nome):
    """O esqueleto e as malhas de um FBX (uma vez por arquivo)."""
    if nome in _carregados:
        return _carregados[nome]
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=achar(nome))
    novos = [o for o in bpy.data.objects if o not in antes]
    fonte = next(o for o in novos if o.type == 'ARMATURE')
    malhas = [o for o in novos if o.type == 'MESH']
    acao = fonte.animation_data.action
    repouso = {b.name: (fonte.matrix_world @ b.matrix_local).decompose()[1] for b in fonte.data.bones}
    _carregados[nome] = (fonte, malhas, acao, repouso)
    return _carregados[nome]


def ler_quadro(nome, q):
    """No quadro `q` do arquivo: a rotação e a posição de cada osso no mundo."""
    fonte, _, _, _ = carregar(nome)
    cena.frame_set(q)
    bpy.context.view_layer.update()
    pose = {}
    for pb in fonte.pose.bones:
        loc, rot, _ = (fonte.matrix_world @ pb.matrix).decompose()
        pose[pb.name] = (rot, loc)
    return pose


def menor_z_da_malha(nome, parte, perto_de=None, raio=0.25):
    """O ponto mais baixo de uma peça (`parte` no nome da malha), no quadro atual."""
    _, malhas, _, _ = carregar(nome)
    dg = bpy.context.evaluated_depsgraph_get()
    menor = math.inf
    for o in malhas:
        if parte not in o.name:
            continue
        e = o.evaluated_get(dg)
        me = e.to_mesh()
        for v in me.vertices:
            p = o.matrix_world @ v.co
            if perto_de is not None and math.hypot(p.x - perto_de.x, p.y - perto_de.y) > raio:
                continue
            menor = min(menor, p.z)
        e.to_mesh_clear()
    return menor


def extremos_da_malha(nome):
    """Os limites (mín e máx em x, y, z) de todas as peças, no quadro atual."""
    _, malhas, _, _ = carregar(nome)
    dg = bpy.context.evaluated_depsgraph_get()
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    for o in malhas:
        e = o.evaluated_get(dg)
        me = e.to_mesh()
        for v in me.vertices:
            p = o.matrix_world @ v.co
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
        e.to_mesh_clear()
    return lo, hi


# ── Passar uma pose para o esqueleto do jogo ─────────────────────────────────────────────────────
def aplicar(pose, repouso_fonte, quadril_mundo):
    """Põe `pose` (rotações no mundo da fonte) no esqueleto do jogo, com a bacia em
    `quadril_mundo`, e devolve os `matrix_basis` (rotação de cada osso e posição da bacia)."""
    rot_arm = {}
    base = {}
    for b in OSSOS:
        if b.name in pose and b.name in repouso_fonte:
            delta = pose[b.name][0] @ repouso_fonte[b.name].inverted()
            r_mundo = delta @ REPOUSO_ALVO[b.name]
            r = ROT_ARM_INV @ r_mundo
        else:
            # Osso que a fonte não tem: segue o pai como no descanso.
            r = (rot_arm[b.parent.name] if b.parent else Quaternion()) @ REPOUSO_LOCAL[b.name]
        rot_arm[b.name] = r
        if b.parent is None:
            pos_arm = arm.matrix_world.inverted() @ quadril_mundo
            m = Matrix.Translation(pos_arm) @ r.to_matrix().to_4x4()
            bas = b.matrix_local.inverted() @ m
            loc, rb, _ = bas.decompose()
            base[b.name] = (rb, loc)
        else:
            rb = REPOUSO_LOCAL[b.name].inverted() @ rot_arm[b.parent.name].inverted() @ r
            base[b.name] = (rb, None)
    return base


PONTAS = ('LeftHand', 'RightHand', 'Hips', 'LeftToeBase', 'RightToeBase', 'Head')


def medir(base):
    """Põe os `matrix_basis` no esqueleto do jogo e devolve onde ficaram as mãos, a bacia, os pés
    e a cabeça (no mundo): a conta de verdade, depois de trocar braços ou mexer na bacia."""
    for b in CHAVEADOS:
        pb = arm.pose.bones[b.name]
        rb, loc = base[b.name]
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = rb
        if loc is not None:
            pb.location = loc
    bpy.context.view_layer.update()
    return {n: arm.matrix_world @ arm.pose.bones['mixamorig:' + n].head for n in PONTAS}


def girar_pose(pose, giro, pivo):
    """A pose inteira girada por `giro` em volta de `pivo` (no mundo)."""
    return {n: (giro @ r, giro @ (p - pivo) + pivo) for n, (r, p) in pose.items()}


# ── Um clipe ─────────────────────────────────────────────────────────────────────────────────────
def quadros_do(c):
    _, _, acao, _ = carregar(c['arquivo'])
    q0, q1 = c.get('trecho', tuple(map(int, acao.frame_range)))
    lista = list(range(q0, q1 + 1))
    if c.get('vaivem'):
        lista = lista + lista[-2:0:-1] + [lista[0]]
    return lista


def gravar_clipe(c):
    nome, arq = c['nome'], c['arquivo']
    _, _, _, repouso = carregar(arq)
    lista = quadros_do(c)
    poses = [ler_quadro(arq, q) for q in lista]
    if c.get('meia_volta'):
        pivo = poses[0]['mixamorig:Hips'][1].copy()
        poses = [girar_pose(p, Quaternion(Vector((0, 0, 1)), math.pi), pivo) for p in poses]
    n = len(poses)
    info = {'arquivo': arq, 'quadros': n, 'duracao': (n - 1) / FPS}

    # Os braços de outro arquivo (o planador).
    if c.get('bracos'):
        outro, q = c['bracos']
        _, _, _, rep2 = carregar(outro)
        braco = ler_quadro(outro, q)
        for p in poses:
            for osso, (r, loc) in braco.items():
                if eh_do_braco(osso):
                    # A rotação relativa ao descanso do outro arquivo, no mesmo esqueleto.
                    p[osso] = ((r @ rep2[osso].inverted()) @ repouso[osso], loc)

    # A cabeça de outro arquivo (o "Climbing A Rope" olha para o alto da corda): o pescoço e a
    # cabeça ficam, em relação ao peito, como no quadro dado.
    if c.get('cabeca'):
        outro, q = c['cabeca']
        _, _, _, rep2 = carregar(outro)
        ref = ler_quadro(outro, q)
        peito = 'mixamorig:Spine2'
        for p in poses:
            for osso in ('mixamorig:Neck', 'mixamorig:Head'):
                # O giro do osso relativo ao peito, no descanso de cada arquivo.
                rel = (rep2[peito] @ ref[peito][0].inverted() @ ref[osso][0]
                       @ rep2[osso].inverted())
                agora = p[peito][0] @ repouso[peito].inverted() @ rel @ repouso[osso]
                p[osso] = (agora, p[osso][1])

    # Abrir as pernas (a sela): sentada, as coxas vão para a frente, então cada perna inteira gira
    # para fora em volta do eixo de pé (a esquerda dela é +x).
    if c.get('abrir_pernas'):
        for lado, sinal in (('Left', 1), ('Right', -1)):
            giro = Quaternion(Vector((0, 0, 1)), sinal * math.radians(c['abrir_pernas']))
            for p in poses:
                for osso in list(p):
                    if eh_da_perna(osso, lado):
                        r, loc = p[osso]
                        p[osso] = (giro @ r, loc)

    # Deitar: as costas no colchão, deitada para trás da origem (a cabeça no travesseiro).
    deslocar = Vector((0, 0, 0))
    if c.get('deitar'):
        cena.frame_set(lista[0])
        bpy.context.view_layer.update()
        lo, hi = extremos_da_malha(arq)
        # O pé mais à frente na origem (frente é −y) e as costas `COSTAS` abaixo dela.
        deslocar = Vector((-(lo.x + hi.x) / 2, -lo.y, -COSTAS - lo.z))
        info['deitada'] = {'comprimento': round(hi.y - lo.y, 3), 'grossura': round(hi.z - lo.z, 3)}

    # Sentar: o bumbum na altura do assento, a bacia `atras` da origem.
    if c.get('sentar'):
        altura, atras = c['sentar']
        cena.frame_set(lista[0])
        bpy.context.view_layer.update()
        quadril = poses[0]['mixamorig:Hips'][1]
        bumbum = menor_z_da_malha(arq, 'bottom', perto_de=quadril, raio=0.2)
        deslocar = Vector((-quadril.x, atras - quadril.y, altura - bumbum))
        info['bumbum_abaixo_da_bacia'] = round(quadril.z - bumbum, 3)

    quadris = [p['mixamorig:Hips'][1].copy() for p in poses]
    plano = c.get('plano')
    if plano in ('xy', 'xyz'):
        passo = quadris[-1] - quadris[0]
        if plano == 'xy':
            passo.z = 0
        info['passada'] = round(passo.length, 4)
        for i, q in enumerate(quadris):
            q -= passo * (i / (n - 1))
    if c.get('comeca_no_pe'):
        # O ciclo recomeça no quadro em que o pé pedido está mais à frente (frente é −y): o toque
        # do calcanhar. Sem a passada, a bacia já é periódica e o ciclo pode girar.
        pe = 'mixamorig:' + c['comeca_no_pe'] + 'Foot'
        k = min(range(n - 1), key=lambda i: poses[i][pe][1].y - poses[i]['mixamorig:Hips'][1].y)
        poses = poses[k:n - 1] + poses[:k] + [poses[k]]
        quadris = [q.copy() for q in quadris[k:n - 1] + quadris[:k] + [quadris[k]]]
        info['comeca_em'] = lista[k]
    if plano in ('xy', 'xyz', 'xy0'):
        x0, y0 = quadris[0].x, quadris[0].y
        for q in quadris:
            q.x -= x0
            q.y -= y0
    for q in quadris:
        q += deslocar
    if c.get('chato') is not None:
        # No ar: a bacia parada nesta altura (a física leva o corpo; só as pernas e os braços mexem).
        for q in quadris:
            q.z = c['chato']
    if c.get('altura') is not None:
        media = sum(q.z for q in quadris) / n
        for q in quadris:
            q.z += c['altura'] - media
    amostra = range(0, n, max(1, n // 12))
    if c.get('maos') is not None:
        # As mãos medidas no esqueleto do jogo (com os braços trocados, se for o caso).
        def mao(i):
            m = medir(aplicar(poses[i], repouso, quadris[i]))
            return (m['LeftHand'].z + m['RightHand'].z) / 2
        media = sum(mao(i) for i in amostra) / len(amostra)
        for q in quadris:
            q.z += c['maos'] - media

    # As mãos, a bacia, os pés e a cabeça no desenho do jogo, na média dos quadros (para os números
    # do cipó, da barra e da borda).
    medidas = [medir(aplicar(poses[i], repouso, quadris[i])) for i in amostra]
    for ponta in PONTAS:
        m = sum((x[ponta] for x in medidas), Vector()) / len(medidas)
        info[ponta] = [round(v, 3) for v in m]

    acao = bpy.data.actions.new(nome)
    arm.animation_data.action = acao
    for i, (p, q) in enumerate(zip(poses, quadris)):
        if c.get('laco') and i == n - 1:
            p, q = poses[0], quadris[0]
        base = aplicar(p, repouso, q)
        for b in CHAVEADOS:
            pb = arm.pose.bones[b.name]
            rb, loc = base[b.name]
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = rb
            pb.keyframe_insert('rotation_quaternion', frame=i)
            if loc is not None:
                pb.location = loc
                pb.keyframe_insert('location', frame=i)
    acao.use_fake_user = True
    trilha = arm.animation_data.nla_tracks.new()
    trilha.name = nome
    trilha.strips.new(nome, 0, acao)
    arm.animation_data.action = None
    return info


resumo = {}
for c in CLIPES:
    resumo[c['nome']] = gravar_clipe(c)
    print(c['nome'], json.dumps(resumo[c['nome']], ensure_ascii=False))

# Só o esqueleto do jogo vai para o arquivo.
for o in list(bpy.data.objects):
    if o is not arm:
        bpy.data.objects.remove(o, do_unlink=True)
for pb in arm.pose.bones:
    pb.matrix_basis = Matrix()
os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
if os.environ.get('MIXAMO_BLEND'):
    # Para conferir as poses (fotos de cada clipe com o avatar vestido): a cena antes de exportar.
    bpy.ops.wm.save_as_mainfile(filepath=os.environ['MIXAMO_BLEND'], copy=True)
bpy.ops.export_scene.gltf(
    filepath=SAIDA,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_force_sampling=True,
    export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True,
    export_anim_slide_to_zero=True,
    export_skins=True,
    export_morph=False,
    export_materials='NONE',
)


def enxugar(caminho):
    """Tira do GLB o que não muda e o que o avatar não tem: a escala de todos os ossos, a posição
    de todos menos a bacia e as pontas `_end_end`. Reescreve o binário só com o que sobrou."""
    with open(caminho, 'rb') as f:
        dados = f.read()
    n = struct.unpack_from('<I', dados, 12)[0]
    gltf = json.loads(dados[20:20 + n])
    binario = dados[20 + n + 8:]
    nomes = [no.get('name', '') for no in gltf['nodes']]

    def fica(canal):
        alvo = canal['target']
        nome = nomes[alvo['node']]
        if nome.endswith('_end_end') or alvo['path'] == 'scale':
            return False
        return alvo['path'] != 'translation' or nome == 'mixamorig:Hips'

    usados = []
    for anim in gltf['animations']:
        canais = [c for c in anim['channels'] if fica(c)]
        amostras = sorted({c['sampler'] for c in canais})
        nova = {old: i for i, old in enumerate(amostras)}
        anim['samplers'] = [anim['samplers'][i] for i in amostras]
        for c in canais:
            c['sampler'] = nova[c['sampler']]
        anim['channels'] = canais
        for s_ in anim['samplers']:
            usados += [s_['input'], s_['output']]
    novos_acessores, vistas, pedaco = [], [], bytearray()
    mapa = {}
    for i in sorted(set(usados)):
        a = dict(gltf['accessors'][i])
        v = gltf['bufferViews'][a['bufferView']]
        tam = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']] * 4 * a['count']
        ini = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        while len(pedaco) % 4:
            pedaco.append(0)
        vistas.append({'buffer': 0, 'byteOffset': len(pedaco), 'byteLength': tam})
        pedaco += binario[ini:ini + tam]
        a['bufferView'] = len(vistas) - 1
        a.pop('byteOffset', None)
        mapa[i] = len(novos_acessores)
        novos_acessores.append(a)
    for anim in gltf['animations']:
        for s_ in anim['samplers']:
            s_['input'], s_['output'] = mapa[s_['input']], mapa[s_['output']]
    gltf['accessors'], gltf['bufferViews'] = novos_acessores, vistas
    gltf['buffers'] = [{'byteLength': len(pedaco)}]
    # O esqueleto sem a pele (as matrizes de ligação saem: o avatar da plataforma já tem a dele).
    gltf.pop('skins', None)
    for no in gltf['nodes']:
        no.pop('skin', None)
    texto = json.dumps(gltf, separators=(',', ':')).encode()
    texto += b' ' * (-len(texto) % 4)
    while len(pedaco) % 4:
        pedaco.append(0)
    total = 12 + 8 + len(texto) + 8 + len(pedaco)
    with open(caminho, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(texto), 0x4E4F534A) + texto)
        f.write(struct.pack('<II', len(pedaco), 0x004E4942) + bytes(pedaco))


enxugar(SAIDA)
print('RESUMO ' + json.dumps(resumo, ensure_ascii=False))
print('gravado', SAIDA, os.path.getsize(SAIDA) // 1024, 'KB')
