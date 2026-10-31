"""Ajustes em peças do pacote (Quaternius) que já estão em `public/avatar3d/parts/`.

Cada função importa o GLB ATUAL da peça, mexe só na posição dos vértices (no referencial do osso
da cabeça, na pose de descanso) e exporta de novo pelo caminho de sempre (`export`, que passa pelo
`reordenar.py`). Nós, malha, material (nome, cor, textura), UV e pesos ficam como vieram. Nunca se
edita o GLB à mão: para refazer, rode a função de novo sobre a cópia original da peça.

cartola (hat-04, 31/10/2026, pedido da dona): a cartola preta afunda na cabeça como a cartolinha
`hat-08` (aba no alto da testa, sem tapar olhos nem orelhas, copa envolvendo o alto do crânio). Para
não atravessar as cabeças `head-01` a `head-06`, a boca da copa se abre na planta oval do crânio
(`Q_OVAL`, `P_OVAL` de festas.py), centrada no meio do crânio, e a copa sobe reta; `menor_boca_malha`
acha a menor abertura em que a peça não cruza nenhuma cabeça e fica a pelo menos `FOLGA` dela.

Uso: python ajustes.py -- cartola
A função recusa uma peça que já foi ajustada (afundar duas vezes): para refazer, aponte
`AJUSTE_ORIGEM` para a cópia original do pacote, que está no git (commit 9968ca967).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import numpy as np
from mathutils.bvhtree import BVHTree
from festas import C, CABECAS, Q_OVAL, P_OVAL

FOLGA = 0.008
# Quanto a cartola desce no eixo dela: a aba sai de z 2.13 na testa (empoleirada no cocuruto) para a
# altura da aba da cartolinha hat-08.
AFUNDA_HAT04 = 0.11
# Medidas da cartola do pacote no eixo dela, a partir de baixo da aba: a copa tem raio 0.24 na base;
# o anel de baixo da aba (raio 0.19, a até 5 cm da base) estreitava a boca; a aba começa em 0.30.
R_COPA, R_ABA_DENTRO, H_ANEL, LABIO = 0.24, 0.30, 0.05, 0.012
# A copa do pacote alarga para cima (0.24 na aba, 0.27 no alto); abrindo metade no alto ela fica reta.
ABRE_NO_ALTO = 0.5
Z_HAT04_ORIGINAL = 2.029  # ponto mais baixo da cartola do pacote: a guarda contra afundar duas vezes


def malhas_mundo(ids):
    """Triângulos (mundo, pose de descanso) de cada peça, para conferir cruzamentos."""
    out = []
    for pid in ids:
        reset()
        bpy.ops.import_scene.gltf(filepath=f'{BASE}/parts/{pid}.glb')
        V, F = [], []
        for o in bpy.data.objects:
            if o.type != 'MESH' or not o.vertex_groups:
                continue
            o.data.calc_loop_triangles()
            b = len(V)
            V += [o.matrix_world @ v.co for v in o.data.vertices]
            F += [tuple(b + i for i in t.vertices) for t in o.data.loop_triangles]
        out.append(BVHTree.FromPolygons(V, F))
    return out


def eixo_da_copa(P):
    """Eixo da copa (o maior eixo da peça, para cima), um ponto nele e as direções de lado e de
    trás no plano da aba."""
    c = P.mean(0)
    _, _, Vt = np.linalg.svd(P - c)
    a = Vt[0] if Vt[0][2] > 0 else -Vt[0]
    ex = np.array([1.0, 0, 0]) - a[0] * a
    ex /= np.linalg.norm(ex)
    ey = np.cross(a, ex)
    return c, a, ex, ey


def deformar(P, base, a, ex, ey, afunda, b, altura, desloca=(0, 0, 0)):
    """Afunda `afunda` no eixo, avança `desloca` e abre a boca da copa na planta oval do crânio, b
    vezes maior na aba e abrindo só `ABRE_NO_ALTO` disso na `altura` (o alto da copa), em linha reta:
    a copa fica reta, sem virar cone nem balde. A copa (e a tampa)
    abre junto; o anel de baixo da aba, que fazia a boca estreita, encosta por dentro da copa; a aba
    acompanha a copa sem alargar (a mesma largura para fora)."""
    d = P - base
    h = d @ a
    x, y = d @ ex, d @ ey
    r = np.hypot(x, y)
    u = np.arctan2(y, x)
    n = (np.abs(np.cos(u)) ** P_OVAL + np.abs(np.sin(u) / Q_OVAL) ** P_OVAL) ** (1 / P_OVAL)
    w = 1 - (1 - ABRE_NO_ALTO) * np.clip(h / altura, 0, 1)
    g = 1 + (b / n - 1) * w                      # quanto a copa abre nessa altura e direção
    copa = (r < R_ABA_DENTRO) & (h > H_ANEL)
    anel = (r < R_ABA_DENTRO) & (h <= H_ANEL)
    novo = np.where(copa, r * g, np.where(anel, R_COPA * g - LABIO, r + R_COPA * (g - 1)))
    f = np.where(r > 1e-9, novo / np.maximum(r, 1e-9), 1.0)
    return base + np.asarray(desloca) + np.outer(h - afunda, a) + np.outer(x * f, ex) + np.outer(y * f, ey)


def cruza(P, F, cabecas):
    """A peça cruza alguma cabeça (triângulos que se cortam) ou chega a menos de FOLGA dela?"""
    V = [Vector(p) for p in P]
    hb = BVHTree.FromPolygons(V, F)
    for cb in cabecas:
        if hb.overlap(cb):
            return True
        if min(cb.find_nearest(v)[3] for v in V) < FOLGA:
            return True
    return False


def menor_boca_malha(P, F, cabecas, base, a, ex, ey, afunda, altura, desloca, b1=1.8):
    """Menor abertura b da boca em que a peça afundada não cruza nem encosta nas cabeças."""
    def com(b):
        return deformar(P, base, a, ex, ey, afunda, b, altura, desloca)
    lo, hi = 1.0, b1
    if cruza(com(hi), F, cabecas):
        raise SystemExit('a boca não abre o bastante: afunde menos')
    for _ in range(20):
        mid = (lo + hi) / 2
        if cruza(com(mid), F, cabecas):
            lo = mid
        else:
            hi = mid
    return hi


def cartola():
    cabecas = malhas_mundo(CABECAS)
    reset()
    origem = os.environ.get('AJUSTE_ORIGEM')
    if origem:  # a cópia original da peça (o GLB de parts/ já ajustado não serve de ponto de partida)
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=origem)
        new = [o for o in bpy.data.objects if o not in before]
        arm = next(o for o in new if o.type == 'ARMATURE')
        hat = next(o for o in new if o.type == 'MESH' and o.vertex_groups)
        for o in new:
            if o.type == 'MESH' and not o.vertex_groups:
                bpy.data.objects.remove(o)  # a forma de osso que o importador cria
    else:
        arm, hat = load('hat-04')
    mw = hat.matrix_world
    P = np.array([tuple(mw @ v.co) for v in hat.data.vertices])
    if P[:, 2].min() < Z_HAT04_ORIGINAL - 0.01:
        raise SystemExit('hat-04 já está afundada: rode com AJUSTE_ORIGEM=<cópia original do pacote> '
                         '(por exemplo `git show 9968ca967:packages/community-kids/public/avatar3d/parts/hat-04.glb`)')
    hat.data.calc_loop_triangles()
    F = [tuple(t.vertices) for t in hat.data.loop_triangles]
    c, a, ex, ey = eixo_da_copa(P)
    h = (P - c) @ a
    base = c + h.min() * a          # o eixo na altura de baixo da aba
    altura = h.max() - h.min()      # da aba ao alto da copa
    # A copa do pacote fica 6 cm atrás do meio do crânio: a boca é centrada nele (y = C.y) antes de
    # afundar, senão teria de abrir até a testa.
    desloca = np.array([0.0, C.y - base[1], 0.0])
    b = menor_boca_malha(P, F, cabecas, base, a, ex, ey, AFUNDA_HAT04, altura, desloca)
    print('cartola: afunda', AFUNDA_HAT04, 'avança', round(float(-desloca[1]), 3), 'boca', round(b, 3))
    Q = deformar(P, base, a, ex, ey, AFUNDA_HAT04, b, altura, desloca)
    inv = mw.inverted()
    for v, q in zip(hat.data.vertices, Q):
        v.co = inv @ Vector(q)
    hat.data.update()
    export(arm, [hat], 'hat-04')


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name]()
