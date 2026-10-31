"""Bichinhos do quarto, com animação em laço gravada no próprio GLB.

O quarto move o bichinho pelo chão (`pet-3d.tsx`); aqui moram o corpo e o movimento de dentro:
rabo que balança, passinho do corpo e asas batendo. Cada parte que mexe é um objeto com o pivô no
ponto da junta (sem esqueleto: o glTF anima o objeto). Frente para -Y, base em z = 0.

Gato e cachorro (31/10/2026) também têm os clipes `andar` e `correr`, para quando acompanham a
criança no Arquipélago (`pet-que-acompanha.tsx`, desenhados em escala 1: 1 unidade = 1 m). O parado
continua nos clipes `corpo`, `cabeca` e `rabo` (um por parte, os nomes de sempre). As pernas e as
patas viraram partes próprias (`perna-fe`, `pata-fe`…: f/t = frente/trás, e/d = esquerda/direita
do bicho), filhas do corpo e paradas no parado, então o parado fica igual ao de antes.

Pés sem escorregar: o clipe é feito no lugar (o jogo empurra o bicho para a frente, +Z no glTF), e
cada pata, enquanto toca o chão, anda para trás no corpo exatamente na velocidade do avanço, então
fica parada no mundo. A passada é velocidade × ciclo. A pata é o alvo e a perna é um cilindro do
quadril até ela (gira no quadril e estica ou encolhe no comprimento: no chão só entre 0,88 e 1,08 do
tamanho de descanso, no ar ela encolhe como um joelho dobrado). Com pernas de 0,18 a 0,20 m, o
pedaço de chão que uma pata cobre por apoio é bem menor que a passada, então os dois clipes têm
fase no ar: `andar` é um trote saltado (diagonais juntas) e `correr` um galope (trás, frente, voo).
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_q import *
from bpy_extras.anim_utils import action_get_channelbag_for_slot

FRAMES = 24  # 1 s a 24 quadros por segundo
# Gato e cachorro rodam a 120 qps: o parado mantém as chaves nas mesmas horas (quadro 5k = k/24 s) e
# os ciclos de andar (0,6 s = 72 quadros) e correr (0,4 s = 48 quadros) caem em quadros inteiros.
FPS = 120
PASSO = FPS // 24
_PARADO = {}  # nome da parte -> caminho animado pelo `loop` (para refazer o parado a 120 qps)


def setup_scene():
    _PARADO.clear()
    sc = bpy.context.scene
    sc.frame_start = 1
    sc.frame_end = FRAMES
    sc.render.fps = 24


def part(objs, name, pivot):
    """Junta as peças numa parte só, com a origem no pivô (onde ela gira)."""
    o = join(objs, name)
    pv = Vector(pivot)
    o.data.transform(Matrix.Translation(-pv))
    o.location = pv
    return o


def parent(child, par):
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()


def loop(obj, path, values, axis=None):
    """Chaves em laço: `values` espalhados no ciclo, e o último quadro repete o primeiro."""
    n = len(values)
    _PARADO[obj.name] = path
    for i, v in enumerate(values + [values[0]]):
        f = 1 + round(i * (FRAMES - 1) / n)
        if path == 'rotation_euler':
            obj.rotation_euler = v
        else:
            obj.location = v
        obj.keyframe_insert(data_path=path, frame=f)


# ------------------------------------------------------------ andar e correr (gato e cachorro)

def clipe(obj, nome, chaves):
    """Grava `chaves` [(quadro, {caminho: valor})] numa ação nova, com chaves lineares, e guarda a
    ação numa faixa do NLA chamada `nome`. O exportador junta as faixas de mesmo nome de todas as
    partes num clipe só do glTF (`export(..., clipes=True)`)."""
    ad = obj.animation_data or obj.animation_data_create()
    act = bpy.data.actions.new(f'{obj.name}-{nome}')
    ad.action = act
    for f, vals in chaves:
        for path, v in vals.items():
            setattr(obj, path, v)
            obj.keyframe_insert(data_path=path, frame=f)
    for fc in action_get_channelbag_for_slot(act, ad.action_slot).fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    ad.action = None
    tr = ad.nla_tracks.new()
    tr.name = nome
    tr.strips.new(nome, int(chaves[0][0]), act)


def parado_em_clipes(objs):
    """O parado feito pelo `loop` (24 qps) vira um clipe por parte, com o nome da parte (`corpo`,
    `cabeca`, `rabo`), como o exportador antigo fazia. Os valores são os mesmos que ele gravava (um
    por quadro de 1/24 s, lidos da curva), agora no quadro 5k a 120 qps, e linear entre eles: as
    mesmas horas e a mesma curva de antes."""
    sc = bpy.context.scene
    vals = {o.name: [] for o in objs}
    for f in range(1, FRAMES + 1):
        sc.frame_set(f)
        for o in objs:
            vals[o.name].append(tuple(getattr(o, _PARADO[o.name])))
    for o in objs:
        path = _PARADO[o.name]
        act = o.animation_data.action
        o.animation_data.action = None
        bpy.data.actions.remove(act)
        clipe(o, o.name, [(PASSO * (i + 1), {path: v}) for i, v in enumerate(vals[o.name])])
    sc.render.fps = FPS
    sc.frame_set(0)
    # A pose de descanso de antes era o primeiro quadro do parado (o rabo de lado, por exemplo).
    return {o.name: (_PARADO[o.name], vals[o.name][0]) for o in objs}


ESTICA = 1.08   # no chão a perna vai até 1,08 do comprimento de descanso (pata na ponta do apoio)
ENCOLHE = 0.88  # e até 0,88 (pata embaixo do quadril): o quadril desce um pouco no apoio
BICO = 8        # a pata sobe e desce rápido no começo e no fim do passo no ar (1 - |1 - 2w|^8)

# Andar: trote saltado, as diagonais juntas. Correr: galope rotativo (trás, frente, voo).
# `solta`: segundos em que a pata ainda acompanha o chão logo depois de sair (e logo antes de pousar),
# enquanto sobe o primeiro centímetro; `ergue`: altura do passo no ar; `pulo`: quanto o quadril sobe
# quando a cintura está sem pata no chão.
ANDAR = dict(nome='andar', ciclo=0.6, vel=1.5, fases={'fe': 0.0, 'td': 0.0, 'fd': 0.5, 'te': 0.5},
             pulo=0.035, ergue=0.05, solta=0.02)
CORRER = dict(nome='correr', ciclo=0.4, vel=3.5, fases={'te': 0.0, 'td': 0.08, 'fd': 0.3, 'fe': 0.38},
              pulo=0.04, ergue=0.07, solta=0.01)


def _psi(x):
    """Sai com inclinação 1 e chega em x = 1 com inclinação 0 (a pata acompanhando o chão)."""
    x = min(max(x, 0.0), 1.0)
    return x - 2 * x ** 3 / 3 + x ** 5 / 5


PSI1 = 8 / 15


def _suave(w):
    return w * w * w * (w * (6 * w - 15) + 10)


def _vaos(inicios, dur, T):
    """Intervalos sem pata no chão de uma cintura (no círculo do ciclo)."""
    iv = sorted(((s % T), (s % T) + dur) for s in inicios)
    junto = [list(iv[0])]
    for a, b in iv[1:]:
        if a <= junto[-1][1]:
            junto[-1][1] = max(junto[-1][1], b)
        else:
            junto.append([a, b])
    vaos = [(junto[i][1], junto[i + 1][0]) for i in range(len(junto) - 1)]
    vaos.append((junto[-1][1], junto[0][0] + T))
    return [(a, b) for a, b in vaos if b > a]


def _altura(vaos, t, T, base, pulo):
    for a, b in vaos:
        for tt in (t, t + T):
            if a <= tt <= b:
                return base + pulo * math.sin(math.pi * (tt - a) / (b - a)) ** 2
    return base


def passos(nome, pernas, zq, cabeca, rabo, g):
    """Grava o clipe `g` (ANDAR ou CORRER) em todas as partes. `pernas`: {chave: (perna, pata)}.
    Devolve os números da passada para o registro."""
    T, V = g['ciclo'], g['vel']
    L0 = zq
    a = L0 * math.sqrt(ESTICA ** 2 - ENCOLHE ** 2)   # meia passada de apoio
    Tst = 2 * a / V
    Tsw = T - Tst
    tau = g['solta'] / Tsw
    body = pernas['fe'][0].parent
    yq = {k: p.location.y for k, (p, _) in pernas.items()}
    xq = {k: p.location.x for k, (p, _) in pernas.items()}
    yF, yH = yq['fe'], yq['te']
    yc = (yF + yH) / 2
    C = Vector((0, yc, zq))
    vaosF = _vaos([g['fases'][k] * T for k in ('fe', 'fd')], Tst, T)
    vaosH = _vaos([g['fases'][k] * T for k in ('te', 'td')], Tst, T)
    base = ENCOLHE * L0
    n = round(T * FPS)
    chaves = {o.name: [] for o in [body, cabeca, rabo] + [x for pr in pernas.values() for x in pr]}
    medidas = {'apoio': [], 'ar': []}
    no_ar = 0
    for f in range(n + 1):
        t = f / FPS
        hF = _altura(vaosF, t, T, base, g['pulo'])
        hH = _altura(vaosH, t, T, base, g['pulo'])
        sp = (hF - hH) / (yF - yH)
        p = math.asin(sp)
        dz = hF - zq - sp * (yF - yc)
        R = Matrix.Rotation(p, 3, 'X')
        loc = C + Vector((0, 0, dz)) - R @ C
        chaves[body.name].append((f, {'location': loc.copy(), 'rotation_euler': (p, 0, 0)}))
        Ri = R.transposed()
        tocando = 0
        for k, (perna, pata) in pernas.items():
            tau_k = ((t / T - g['fases'][k]) % 1.0) * T
            if tau_k < Tst - 1e-9:
                u = tau_k / Tst
                fwd, z, curva = a - 2 * a * u, 0.0, 0.0
                tocando += 1
            else:
                w = (tau_k - Tst) / Tsw
                k_w = tau * (_psi(w / tau) - _psi((1 - w) / tau) + PSI1 * (1 - 2 * _suave(w)))
                fwd = -a + 2 * a * _suave(w) - V * Tsw * k_w
                z = g['ergue'] * (1 - abs(1 - 2 * w) ** BICO)
                curva = 0.5 * math.sin(math.pi * w)
            F = Vector((xq[k], yq[k] - fwd, z))           # a pata no quadro do clipe (frente = -Y)
            P = Ri @ (F - loc)                             # a pata no espaço do corpo
            d = P - Vector((xq[k], yq[k], zq))
            comp = d.length
            medidas['apoio' if z == 0.0 else 'ar'].append(comp / L0)
            chaves[perna.name].append((f, {'rotation_euler': (math.atan2(d.y, -d.z), 0, 0),
                                           'scale': (1, 1, comp / L0)}))
            chaves[pata.name].append((f, {'location': P, 'rotation_euler': (-p + curva, 0, 0)}))
        if tocando == 0 and f < n:
            no_ar += 1
        fase = 2 * math.pi * t / T
        cab, rab = g['cabeca'], g['rabo']
        chaves[cabeca.name].append((f, {'rotation_euler': cab(p, fase)}))
        chaves[rabo.name].append((f, {'rotation_euler': rab(fase)}))
    for o in [body, cabeca, rabo] + [x for pr in pernas.values() for x in pr]:
        clipe(o, nome, chaves[o.name])
    info = dict(clipe=nome, ciclo=T, vel=V, passada=V * T, apoio=2 * a, t_apoio=Tst,
                fator_apoio=Tst / T, no_ar=no_ar / n,
                perna_no_chao=(min(medidas['apoio']), max(medidas['apoio'])),
                perna_no_ar=(min(medidas['ar']), max(medidas['ar'])))
    print('PASSADA', ' '.join(f'{k}={v:.3f}' if isinstance(v, float) else f'{k}={v}' for k, v in info.items()
                              if not isinstance(v, tuple)),
          'perna_no_chao=%.3f..%.3f perna_no_ar=%.3f..%.3f' % (*info['perna_no_chao'], *info['perna_no_ar']))
    return info


def pernas_separadas(body, defs, cor, cor_pata, r, h, r_pata, esc_pata, zq, z_pata, dy_pata):
    """Pernas (cilindro, pivô no quadril a `zq`) e patas (pivô no pé da perna, no chão), filhas do
    corpo, nos mesmos lugares de antes (o parado fica igual)."""
    out = {}
    for k, (x, y) in defs.items():
        perna = part([cyl(r, h, (x, y, h / 2), cor, verts=10)], f'perna-{k}', (x, y, zq))
        pata = part([sphere(r_pata, (x, y - dy_pata, z_pata), cor_pata, scale=esc_pata, subdiv=2)],
                    f'pata-{k}', (x, y, 0))
        parent(perna, body)
        parent(pata, body)
        out[k] = (perna, pata)
    return out


def descanso(objs, pivos, inicio):
    """Faixas caladas e as partes na pose de descanso: o nó do glTF leva a pose que a cena mostra na
    hora de exportar (o exportador liga uma faixa de cada vez para gravar os clipes). Quem tem
    parado descansa no primeiro quadro dele, como no arquivo de antes (é a pose que o quarto mostra
    com o movimento desligado e a da miniatura)."""
    for o in objs:
        for tr in o.animation_data.nla_tracks if o.animation_data else ():
            tr.mute = True
    bpy.context.view_layer.update()
    for o in objs:
        o.location = pivos[o.name]
        o.rotation_euler = (0, 0, 0)
        o.scale = (1, 1, 1)
        if o.name in inicio:
            setattr(o, *inicio[o.name])
    bpy.context.view_layer.update()


def pet_gato():
    reset()
    setup_scene()
    corpo = [sphere(0.2, (0, 0.05, 0.26), 'furDark', scale=(0.9, 1.45, 0.85), subdiv=3)]
    corpo.append(sphere(0.12, (0, -0.2, 0.25), 'white', scale=(1, 0.6, 1.1), subdiv=2))
    body = part(corpo, 'corpo', (0, 0, 0))
    pernas = pernas_separadas(body, {'fe': (0.1, -0.16), 'fd': (-0.1, -0.16), 'te': (0.1, 0.24), 'td': (-0.1, 0.24)},
                              'furDark', 'white', 0.05, 0.2, 0.055, (1, 1.2, 0.6), zq=0.18, z_pata=0.02, dy_pata=0.02)
    cab = [sphere(0.17, (0, -0.32, 0.46), 'furDark', scale=(1.1, 0.95, 0.9), subdiv=3)]
    cab.append(sphere(0.08, (0, -0.45, 0.42), 'white', scale=(1.1, 0.6, 0.75), subdiv=2))
    cab.append(sphere(0.022, (0, -0.5, 0.44), 'pink', subdiv=1))
    for s in (-1, 1):
        cab.append(cone(0.07, 0.14, (s * 0.1, -0.3, 0.6), 'furDark', verts=4, rot=(math.radians(-8), math.radians(s * 14), math.radians(45))))
        cab.append(cone(0.04, 0.08, (s * 0.1, -0.33, 0.6), 'pink', verts=4, rot=(math.radians(-8), math.radians(s * 14), math.radians(45))))
        cab.append(sphere(0.035, (s * 0.07, -0.47, 0.5), 'yellow', scale=(1, 0.5, 1.1), subdiv=2))
        cab.append(sphere(0.016, (s * 0.07, -0.49, 0.5), 'black', scale=(0.6, 0.5, 1.3), subdiv=1))
        for k in (-1, 1):
            cab.append(cyl(0.004, 0.16, (s * 0.12, -0.47, 0.42 + 0.02 * k), 'white', verts=4, rot=(0, math.radians(90 + 10 * k * s), 0)))
    head = part(cab, 'cabeca', (0, -0.28, 0.4))
    rabo = tube([(0, 0.32, 0.3), (0, 0.42, 0.36), (0.02, 0.48, 0.5), (0.06, 0.46, 0.64), (0.1, 0.4, 0.7)], [0.045, 0.042, 0.04, 0.037, 0.03], 'furDark', seg=8)
    tail = part([rabo], 'rabo', (0, 0.32, 0.3))
    parent(head, body)
    parent(tail, body)
    loop(tail, 'rotation_euler', [(0, 0, math.radians(a)) for a in (-22, 0, 22, 0)])
    loop(body, 'location', [(0, 0, h) for h in (0, 0.025, 0, 0.025)])
    loop(head, 'rotation_euler', [(math.radians(a), 0, 0) for a in (0, -4, 0, 4)])
    partes = [body, head, tail] + [x for pr in pernas.values() for x in pr]
    pivos = {o.name: o.location.copy() for o in partes}
    inicio = parado_em_clipes([body, head, tail])
    passos('andar', pernas, 0.18, head, tail, dict(
        ANDAR, cabeca=lambda p, f: (-p + 0.04 * math.sin(2 * f), 0, 0.05 * math.sin(f)),
        rabo=lambda f: (0, 0, 0.3 * math.sin(f))))
    passos('correr', pernas, 0.18, head, tail, dict(
        CORRER, cabeca=lambda p, f: (-p + 0.03 * math.sin(f), 0, 0),
        rabo=lambda f: (-0.5, 0, 0.12 * math.sin(f))))
    descanso(partes, pivos, inicio)
    export('pet-gato', partes, animated=True, clipes=True)


def pet_cachorro():
    reset()
    setup_scene()
    corpo = [sphere(0.22, (0, 0.05, 0.3), 'fur', scale=(0.95, 1.45, 0.85), subdiv=3)]
    corpo.append(sphere(0.12, (0.06, 0.12, 0.42), 'furLight', scale=(1.2, 1.6, 0.5), subdiv=2))
    corpo.append(torus(0.1, 0.022, (0, -0.2, 0.42), 'red', seg=16, rseg=6, rot=(math.radians(70), 0, 0)))
    corpo.append(sphere(0.03, (0, -0.28, 0.36), 'yellow', subdiv=1))
    body = part(corpo, 'corpo', (0, 0, 0))
    pernas = pernas_separadas(body, {'fe': (0.11, -0.18), 'fd': (-0.11, -0.18), 'te': (0.11, 0.26), 'td': (-0.11, 0.26)},
                              'fur', 'furLight', 0.06, 0.22, 0.065, (1, 1.25, 0.6), zq=0.2, z_pata=0.03, dy_pata=0.03)
    cab = [sphere(0.18, (0, -0.33, 0.52), 'fur', scale=(1, 0.95, 0.92), subdiv=3)]
    cab.append(sphere(0.1, (0, -0.48, 0.47), 'furLight', scale=(0.9, 1.1, 0.7), subdiv=2))
    cab.append(sphere(0.04, (0, -0.58, 0.5), 'black', scale=(1.2, 0.8, 0.9), subdiv=1))
    cab.append(sphere(0.045, (0, -0.52, 0.41), 'pink', scale=(1, 0.6, 0.4), subdiv=1))
    for s in (-1, 1):
        cab.append(sphere(0.03, (s * 0.075, -0.47, 0.58), 'black', subdiv=1))
        cab.append(sphere(0.012, (s * 0.07, -0.49, 0.595), 'white', subdiv=1))
        orelha = sphere(0.09, (s * 0.17, -0.3, 0.5), 'furDark', scale=(0.45, 0.8, 1.4), subdiv=2)
        orelha.rotation_euler = (0, math.radians(s * 18), 0)
        cab.append(orelha)
    head = part(cab, 'cabeca', (0, -0.3, 0.46))
    rabo = tube([(0, 0.34, 0.36), (0, 0.42, 0.44), (0, 0.46, 0.54)], [0.04, 0.035, 0.025], 'fur', seg=8)
    tail = part([rabo], 'rabo', (0, 0.34, 0.36))
    parent(head, body)
    parent(tail, body)
    loop(tail, 'rotation_euler', [(0, math.radians(a), 0) for a in (-35, 35, -35, 35)])
    loop(body, 'location', [(0, 0, h) for h in (0, 0.03, 0, 0.03)])
    loop(head, 'rotation_euler', [(0, 0, math.radians(a)) for a in (0, 6, 0, -6)])
    partes = [body, head, tail] + [x for pr in pernas.values() for x in pr]
    pivos = {o.name: o.location.copy() for o in partes}
    inicio = parado_em_clipes([body, head, tail])
    passos('andar', pernas, 0.2, head, tail, dict(
        ANDAR, cabeca=lambda p, f: (-p + 0.04 * math.sin(2 * f), 0, 0.06 * math.sin(f)),
        rabo=lambda f: (0, 0.45 * math.sin(2 * f), 0)))
    passos('correr', pernas, 0.2, head, tail, dict(
        CORRER, cabeca=lambda p, f: (-p + 0.03 * math.sin(f), 0, 0),
        rabo=lambda f: (-0.45, 0.2 * math.sin(f), 0)))
    descanso(partes, pivos, inicio)
    export('pet-cachorro', partes, animated=True, clipes=True)


def pet_passaro():
    reset()
    setup_scene()
    corpo = [sphere(0.16, (0, 0.02, 0.2), 'yellow', scale=(0.95, 1.2, 1.0), subdiv=3)]
    corpo.append(sphere(0.12, (0, -0.06, 0.18), 'cream', scale=(0.9, 0.7, 0.85), subdiv=2))
    corpo.append(sphere(0.11, (0, -0.12, 0.34), 'yellow', subdiv=3))
    corpo.append(cone(0.045, 0.11, (0, -0.24, 0.33), 'orange', verts=8, rot=(math.radians(90), 0, 0)))
    for s in (-1, 1):
        corpo.append(sphere(0.025, (s * 0.06, -0.2, 0.38), 'black', subdiv=1))
        corpo.append(sphere(0.008, (s * 0.058, -0.22, 0.39), 'white', subdiv=1))
        corpo.append(sphere(0.03, (s * 0.08, -0.17, 0.3), 'pink', scale=(1, 0.4, 0.7), subdiv=1))
        corpo.append(cyl(0.012, 0.08, (s * 0.05, 0.02, 0.04), 'orange', verts=6))
    corpo.append(prism([(-0.07, 0), (0.07, 0), (0.1, -0.16), (0, -0.12), (-0.1, -0.16)], 0.03, (0, 0.18, 0.2), 'orange', rot=(math.radians(110), 0, 0)))
    corpo.append(sphere(0.04, (0, -0.1, 0.46), 'orange', scale=(0.5, 1, 1.3), subdiv=1))
    body = part(corpo, 'corpo', (0, 0, 0))
    asas = []
    for s in (-1, 1):
        a = sphere(0.11, (s * 0.15, 0.05, 0.22), 'orange', scale=(0.28, 0.95, 0.62), subdiv=2)
        a.rotation_euler = (math.radians(-12), 0, 0)
        wing = part([a], f'asa{s}', (s * 0.11, -0.02, 0.28))
        parent(wing, body)
        loop(wing, 'rotation_euler', [(0, math.radians(s * v), 0) for v in (-10, 45, -10, 45)])
        asas.append(wing)
    loop(body, 'location', [(0, 0, h) for h in (0, 0.03, 0, 0.03)])
    export('pet-passaro', [body] + asas, animated=True)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name.replace('-', '_')]()
