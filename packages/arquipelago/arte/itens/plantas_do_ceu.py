"""As plantas do céu, para o jardim do céu das Nuvens: flor de nuvem, estrela trepadeira e arco-íris
de pétala.

Grava em `src/assets/itens/`:

- `plantas-do-ceu.glb`: os estágios, do jeito da horta (`arte/mundo/horta.py` e
  `noDaPlanta` em `src/mundo/horta.tsx`): os nós `<planta>-broto`, `<planta>-crescendo` e
  `<planta>-maduro`, UMA planta em cada, com a base na origem (todos no mesmo lugar; o jogo copia
  o nó do estágio e põe em cada cova). Só a flor aberta (`-maduro`) brilha: as pétalas usam
  materiais de emissão suave (força 0,2 a 0,4), como os cristais;
- `<planta>.glb`: a flor colhida (a colheita da mochila, um nó com o nome do arquivo);
- `semente-<planta>.glb`: o pacotinho de semente, o mesmo de `sementes.py`, com a flor colhida
  em miniatura na etiqueta.

Os ícones são das sementes e das flores colhidas (`render.py` pula o `plantas-do-ceu.glb`).

  /tmp/claude-0/blender-venv/bin/python -B arte/itens/plantas_do_ceu.py
"""
from lib_itens import *
import colheita
import sementes

PLANTAS = ('flor-de-nuvem', 'estrela-trepadeira', 'arco-iris-de-petala')
ESTAGIOS = ('broto', 'crescendo', 'maduro')
CORES_DO_ARCO = ('petalaVermelha', 'petalaLaranja', 'petalaAmarela', 'petalaVerde', 'petalaAzul', 'petalaRoxa')

lib_q.PALETTE.update({
    'folhaCeu': ('#7fd6b8', 0.75, None, 0),
    'folhaCeuEscura': ('#4fb59a', 0.75, None, 0),
    'cauleCeu': ('#5fae8f', 0.8, None, 0),
    'estacaCeu': ('#eef2fb', 0.8, None, 0),
    # os botões (ainda fechados, sem brilho)
    'botaoNuvem': ('#e9eef9', 0.85, None, 0),
    'botaoEstrela': ('#e8cf6a', 0.6, None, 0),
    'botaoArco': ('#f2c9ef', 0.7, None, 0),
    # a flor aberta: brilho leve
    'florNuvem': ('#f7faff', 0.8, '#dfeaff', 0.3),
    'florNuvemSombra': ('#dce7fb', 0.85, '#c9d9ff', 0.2),
    'florNuvemMiolo': ('#ffe9a8', 0.6, '#ffd97a', 0.4),
    'florEstrela': ('#ffd84f', 0.5, '#ffd84f', 0.35),
    'florEstrelaMiolo': ('#fff3c4', 0.5, '#ffe9a0', 0.4),
    'petalaVermelha': ('#ff6b6b', 0.6, '#ff6b6b', 0.25),
    'petalaLaranja': ('#ffa04f', 0.6, '#ffa04f', 0.25),
    'petalaAmarela': ('#ffd84f', 0.6, '#ffd84f', 0.25),
    'petalaVerde': ('#6cd06a', 0.6, '#6cd06a', 0.25),
    'petalaAzul': ('#5aa9ff', 0.6, '#5aa9ff', 0.25),
    'petalaRoxa': ('#b07cff', 0.6, '#b07cff', 0.25),
    'arcoMiolo': ('#ffffff', 0.5, '#fff6d8', 0.4),
    # os pacotinhos de semente
    'pacoteFlorDeNuvem': ('#a9c8ff', 0.85, None, 0),
    'pacoteEstrelaTrepadeira': ('#8a7fe0', 0.85, None, 0),
    'pacoteArcoIris': ('#ff9fc8', 0.85, None, 0),
})


# ---------------------------------------------------------------- partes comuns
def caule(altura, curva=0.02, raio=0.012):
    return tube([(0, 0, 0), (curva, 0, altura * 0.5), (0, curva * 0.5, altura)], [raio, raio * 0.85, raio * 0.7], 'cauleCeu',
                seg=6)


def folhas(z, n, comp, larg, giro0=0.3, cores=('folhaCeu', 'folhaCeuEscura')):
    return [leaf((0, 0, z + 0.03 * (k % 2)), giro0 + 2 * math.pi * k / n, comp, larg, cores[k % 2], lift=comp * 0.35,
                 droop=comp * 0.25, fold=0.25, n=5) for k in range(n)]


def broto(cor='folhaCeu', bolinha=None):
    """O broto de toda planta do céu: um caule curto, duas folhinhas e, se tiver, a bolinha do botão."""
    p = [caule(0.11, curva=0.01, raio=0.011)]
    for s in (0, math.pi):
        p.append(leaf((0, 0, 0.1), s + 0.3, 0.08, 0.04, cor, lift=0.03, droop=0.01, fold=0.25, n=5))
    if bolinha:
        p.append(uvball(0.022, (0, 0.005, 0.12), bolinha, seg=8, ring=5))
    return p


def nuvenzinha(z, r, materiais, miolo=None, n=5, seg=8, aneis=5):
    """Um tufo de nuvem: bolinhas em roda e uma no meio, mais alta."""
    p = []
    for k in range(n):
        a = 2 * math.pi * k / n
        p.append(uvball(r, (math.cos(a) * r * 1.1, math.sin(a) * r * 1.1, z), materiais[k % len(materiais)], seg=seg,
                        ring=aneis))
    p.append(uvball(r * 1.15, (0, 0, z + r * 0.55), materiais[0], seg=seg, ring=aneis))
    if miolo:
        p.append(uvball(r * 0.45, (0, -r * 0.55, z + r * 1.2), miolo, seg=seg, ring=aneis))
    return p


def estrela(r, loc, giro, m='florEstrela', miolo='florEstrelaMiolo', inclina=15):
    """Flor de estrela: placa de cinco pontas virada para fora (`giro`), com o miolo na frente."""
    o = prism(lib_q.star_pts(r, r * 0.45, n=5), r * 0.22, (0, 0, 0), m, rot=(R(90 - inclina), 0, 0))
    mi = uvball(r * 0.32, (0, -r * 0.16, 0), miolo, seg=8, ring=5, scale=(1, 0.6, 1))
    mi.rotation_euler = (R(-inclina), 0, 0)
    peca = [o, mi]
    lib_ilha.place(peca, loc=loc, rot_z=giro)
    return peca


def helice(altura, raio, voltas, z0=0.0):
    """A trepadeira enrolada na estaca."""
    pts = []
    n = int(voltas * 8) + 1
    for i in range(n):
        t = i / (n - 1)
        a = 2 * math.pi * voltas * t
        pts.append((math.cos(a) * raio, math.sin(a) * raio, z0 + altura * t))
    return tube(pts, [0.007] * n, 'cauleCeu', seg=5, cap=True), pts


def flor_do_arco(z, r, botao=False):
    """Seis pétalas, uma de cada cor do arco-íris, em taça, e o miolo branco."""
    p = []
    for k, cor in enumerate(CORES_DO_ARCO):
        a = 2 * math.pi * k / 6
        p.append(leaf((0, 0, z), a, r, r * 0.55, cor, lift=r * 0.55, droop=r * 0.1, fold=0.3, n=5))
    p.append(uvball(r * 0.28, (0, 0, z + r * 0.12), 'arcoMiolo', seg=8, ring=5))
    return p


# ---------------------------------------------------------------- flor de nuvem
def nuvem_broto():
    return broto('folhaCeu', 'botaoNuvem')


def nuvem_crescendo():
    p = [caule(0.27)]
    p += folhas(0.07, 4, 0.12, 0.055)
    p += nuvenzinha(0.29, 0.028, ['botaoNuvem'], n=3, seg=8, aneis=5)
    return p


def nuvem_maduro():
    p = [caule(0.4, raio=0.014)]
    p += folhas(0.08, 4, 0.15, 0.065)
    p += folhas(0.22, 2, 0.11, 0.05, giro0=1.1)
    p += nuvenzinha(0.43, 0.055, ['florNuvem', 'florNuvemSombra'], miolo='florNuvemMiolo', n=6)
    return p


def nuvem_colhida():
    p = [caule(0.09, curva=0.01, raio=0.011)]
    p.append(leaf((0, 0, 0.04), 0.4, 0.07, 0.035, 'folhaCeu', lift=0.02, droop=0.01, fold=0.25, n=5))
    p += nuvenzinha(0.12, 0.04, ['florNuvem', 'florNuvemSombra'], miolo='florNuvemMiolo', n=6)
    return p


# ---------------------------------------------------------------- estrela trepadeira
def estrela_broto():
    p = broto('folhaCeuEscura')
    # A gavinha enrolada que vai procurar onde subir.
    pts = [(0, 0, 0.1)] + [(0.03 * math.cos(a) + 0.03, 0.03 * math.sin(a), 0.12 + 0.012 * a) for a in
                           (0.0, 1.2, 2.4, 3.6, 4.8)]
    p.append(tube(pts, [0.006, 0.006, 0.005, 0.004, 0.004, 0.003], 'cauleCeu', seg=5))
    return p


def estrela_crescendo():
    p = [cyl(0.012, 0.42, (0, 0, 0.21), 'estacaCeu', verts=8)]
    h, pts = helice(0.36, 0.028, 2.5)
    p.append(h)
    for i in (5, 10, 15):
        x, y, z = pts[i]
        a = math.atan2(y, x)
        p.append(leaf((x, y, z), a, 0.07, 0.035, 'folhaCeu' if i % 2 else 'folhaCeuEscura', lift=0.02, droop=0.03,
                      fold=0.25, n=5))
    for i, a in ((12, 0.4), (19, 2.6)):
        x, y, z = pts[i]
        p.append(cone(0.018, 0.04, (x * 1.5, y * 1.5, z + 0.02), 'botaoEstrela', verts=5))
    return p


def estrela_maduro():
    p = [cyl(0.013, 0.6, (0, 0, 0.3), 'estacaCeu', verts=8)]
    h, pts = helice(0.54, 0.03, 3.5)
    p.append(h)
    for i in (4, 9, 14, 19, 24):
        x, y, z = pts[i]
        a = math.atan2(y, x)
        p.append(leaf((x, y, z), a, 0.08, 0.04, 'folhaCeu' if i % 2 else 'folhaCeuEscura', lift=0.02, droop=0.03,
                      fold=0.25, n=5))
    for i, r in ((11, 0.05), (17, 0.055), (27, 0.06)):
        x, y, z = pts[i]
        a = math.atan2(y, x)
        p += estrela(r, (math.cos(a) * 0.075, math.sin(a) * 0.075, z + 0.02), a - math.pi / 2)
    return p


def estrela_colhida():
    p = [tube([(0, 0, 0), (0.012, 0, 0.05), (0, 0.004, 0.1)], [0.007, 0.006, 0.005], 'cauleCeu', seg=5)]
    p.append(leaf((0, 0, 0.04), 0.5, 0.07, 0.035, 'folhaCeuEscura', lift=0.02, droop=0.02, fold=0.25, n=5))
    p += estrela(0.065, (0, -0.01, 0.13), 0.0, inclina=0)
    return p


# ---------------------------------------------------------------- arco-íris de pétala
def arco_broto():
    return broto('folhaCeuEscura', 'botaoArco')


def arco_crescendo():
    p = [caule(0.25)]
    p += folhas(0.06, 4, 0.11, 0.05, cores=('folhaCeuEscura', 'folhaCeu'))
    p.append(uvball(0.03, (0, 0, 0.285), 'botaoArco', seg=8, ring=6, scale=(1, 1, 1.5)))
    for k in range(3):
        a = 2 * math.pi * k / 3
        p.append(leaf((0, 0, 0.255), a, 0.035, 0.018, 'cauleCeu', lift=0.025, droop=0.0, fold=0.3, n=4))
    return p


def arco_maduro():
    p = [caule(0.38, raio=0.013)]
    p += folhas(0.07, 4, 0.14, 0.06, cores=('folhaCeuEscura', 'folhaCeu'))
    p += folhas(0.2, 2, 0.1, 0.045, giro0=1.0, cores=('folhaCeu', 'folhaCeuEscura'))
    p += flor_do_arco(0.38, 0.1)
    return p


def arco_colhida():
    p = [caule(0.08, curva=0.008, raio=0.01)]
    p.append(leaf((0, 0, 0.035), 0.4, 0.06, 0.03, 'folhaCeuEscura', lift=0.02, droop=0.01, fold=0.25, n=5))
    p += flor_do_arco(0.08, 0.085)
    return p


DESENHOS = {
    'flor-de-nuvem': (nuvem_broto, nuvem_crescendo, nuvem_maduro, nuvem_colhida),
    'estrela-trepadeira': (estrela_broto, estrela_crescendo, estrela_maduro, estrela_colhida),
    'arco-iris-de-petala': (arco_broto, arco_crescendo, arco_maduro, arco_colhida),
}

# A flor colhida também desenha o pacotinho de semente (`sementes.pacote` lê `colheita.FORMAS`).
colheita.FORMAS.update({pl: DESENHOS[pl][3] for pl in PLANTAS})
sementes.PACOTES.update({
    'flor-de-nuvem': ('pacoteFlorDeNuvem', 1.0),
    'estrela-trepadeira': ('pacoteEstrelaTrepadeira', 1.0),
    'arco-iris-de-petala': ('pacoteArcoIris', 1.0),
})


def estagios():
    return {'nos': {f'{pl}-{est}': DESENHOS[pl][i]() for pl in PLANTAS for i, est in enumerate(ESTAGIOS)},
            'grupo': 'plantas-do-ceu', 'centrar': False}


ITENS = ([('plantas-do-ceu', estagios)]
         + [(pl, (lambda pl=pl: {'nos': {pl: DESENHOS[pl][3]()}, 'grupo': 'plantas-do-ceu'})) for pl in PLANTAS]
         + [(f'semente-{pl}', (lambda pl=pl: {'nos': {f'semente-{pl}': sementes.pacote(pl)}, 'grupo': 'plantas-do-ceu'}))
            for pl in PLANTAS])

if __name__ == '__main__':
    rodar(ITENS)
