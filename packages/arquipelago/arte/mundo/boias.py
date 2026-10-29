"""As boias que marcam até onde se nada: depois delas, a correnteza mansa leva de volta para a praia.

Referencial: cada nó tem o pivô na linha d'água (y = 0 no nível do mar). O jogo copia as peças em
volta de cada ilha (`mundo/boias.tsx`) e as faz boiar no código.

Nós:
- `boia`: a boia de marcar, gorda e listrada de vermelho e branco, com o mastrinho e a bola amarela
  no alto. Metade fica embaixo d'água.
- `corda`: um pedaço de corda de 1 de comprimento, deitado em +x a partir do pivô. O jogo estica em
  x para ligar uma boia na outra.
- `flutuador`: a boinha da corda, que o jogo põe a cada pedaço da corda.

Nada colide: a correnteza é uma regra do movimento (`sistemas/correnteza.ts`), não uma parede.
"""
from lib_mundo import *

R_BOIA = 0.36


def boia():
    p = []
    # O corpo: uma bola achatada, com três faixas (vermelho, branco, vermelho) de baixo para cima.
    faixas = [(-0.36, -0.08, 'red'), (-0.08, 0.1, 'white'), (0.1, 0.36, 'red')]
    for z0, z1, m in faixas:
        perfil = []
        for k in range(7):
            z = z0 + (z1 - z0) * k / 6
            r = R_BOIA * math.sqrt(max(0.0, 1 - (z / 0.36) ** 2)) ** 0.85
            perfil.append((max(r, 0.02), z))
        p.append(torneado(perfil, m, seg=20))
    # Tampas lisas em cima e embaixo (o vermelho fecha a bola).
    p.append(sphere(0.07, (0, 0, 0.355), 'red', subdiv=1, scale=(1, 1, 0.4)))
    p.append(sphere(0.07, (0, 0, -0.355), 'red', subdiv=1, scale=(1, 1, 0.4)))
    # O mastrinho e a bola amarela no alto, que se vê de longe.
    p.append(cyl(0.025, 0.42, (0, 0, 0.55), 'white', verts=8))
    p.append(sphere(0.09, (0, 0, 0.8), 'yellow', subdiv=2))
    # A argola onde a corda amarra, dos dois lados.
    for s in (-1, 1):
        p.append(torus(0.06, 0.018, (s * (R_BOIA - 0.02), 0, 0.02), 'metalEscuro', seg=12, rseg=5,
                       rot=(R(90), 0, 0)))
    return p


def torneado(perfil, m, seg=20):
    """Peça de torno a partir do perfil [(raio, z), …], aberta nas pontas."""
    bm = bmesh.new()
    aneis = [[bm.verts.new((r * math.cos(2 * math.pi * k / seg), r * math.sin(2 * math.pi * k / seg), z))
              for k in range(seg)] for r, z in perfil]
    for a, b in zip(aneis, aneis[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('torno', bm, m)
    for f in o.data.polygons:
        f.use_smooth = True
    return o


def corda():
    """Um metro de corda em +x, rente à água."""
    return [cyl(0.028, 1.0, (0.5, 0, 0.02), 'corda', verts=6, rot=(0, R(90), 0))]


def flutuador():
    """A boinha da corda: um ovinho amarelo deitado ao longo da corda."""
    return [sphere(0.085, (0, 0, 0.02), 'yellow', subdiv=2, scale=(1.5, 1, 0.9))]


def main():
    lib_q.reset()
    exportar('boias', {'boia': boia(), 'corda': corda(), 'flutuador': flutuador()})


if __name__ == '__main__':
    main()
