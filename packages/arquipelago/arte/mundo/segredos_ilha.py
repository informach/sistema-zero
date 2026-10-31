"""O segredo do cipó da sua ilha: uma árvore alta na beira leste do gramado, com um galho comprido e
um cipó, e um deque alto na praia que SÓ o balanço do cipó alcança.

Referencial: o do mundo (a ilha central na origem), como o `terreno.glb`; y do chão pela `altura()`.
O arquivo é novo e o jogo ainda não o carrega (quem liga o cipó é o código, depois): assim os
colisores daqui não existem no jogo antes do desenho.

Nós (no padrão do cipó do Bosque, `arte/ilhas/bosque.py` e `src/mundo/bosque-vivo.tsx`):
- `cipo-1`: a corda verde com folhinhas e a alça no fim, com o PIVÔ (a posição do nó) no galho. O
  Bosque lê a corda do pivô até o ponto mais baixo do nó, e a pegada por `comprimentoDaPegada`;
- `arvore-do-cipo`: o tronco e o galho; `copa-cipo`: as folhas (à parte, para o jogo poder
  esmaecer como as copas das ilhas completas);
- `deque-do-cipo`: o deque alto em quatro postes, com uma bandeirinha;
- âncora `segredo-cipo`: no meio do tampo do deque.
Colisores: `col-cil-tronco-cipo-1` (o tronco, até o galho), `col-deque-segredo-1` (o tampo) e
`col-cil-poste-segredo-*` (os postes, debaixo do tampo).

Por que só o cipó: o tampo fica a mais de 1,5 m (o pulo) acima de qualquer chão ou apoio a menos de
4,24 m dele (o vão dos patins), sem escada, sem quina marcada e sem tronco de escalar; o balanço do
cipó (pegada de 4,75 m, até 63°) solta a pessoa por cima dele. O Farol fica a 38 m: do alto da
corrente de ar da subida (11,5 m no mundo) o planador desce 1,8 m/s e anda 5,5 m/s, então chega a
uns 24 m antes de descer à altura do tampo. O teste `tests/segredos-da-ilha.test.ts` confere tudo.
"""
from lib_mundo import *

TRONCO = (23.4, 1.5)          # x, z do jogo (no gramado, a 3,5 m da moita mais perto)
PIVO = (25.0, 1.5)            # onde o cipó se pendura (o galho passa por cima)
ALTURA_DO_PIVO = 6.3          # acima do chão do pivô
CORDA = 4.8
DEQUE = dict(x=25.0, z=-4.3, lx=2.2, lz=2.4, topo=3.5)   # topo: y do mundo


def G(x, y, z):
    return (x, -z, y)


def arvore(col):
    tx, tz = TRONCO
    chao_t = altura(tx, tz)
    px, pz = PIVO
    yp = altura(px, pz) + ALTURA_DO_PIVO
    p = [tube([G(tx, chao_t - 0.3, tz), G(tx + 0.1, chao_t + 2.5, tz), G(tx + 0.05, yp + 0.6, tz - 0.1),
               G(tx - 0.1, yp + 2.2, tz)], [0.55, 0.45, 0.38, 0.25], 'troncoGrande', seg=10)]
    # Raízes.
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.4
        p.append(tube([G(tx + math.cos(a) * 0.3, chao_t + 0.4, tz + math.sin(a) * 0.3),
                       G(tx + math.cos(a) * 0.9, chao_t - 0.1, tz + math.sin(a) * 0.9)], [0.2, 0.08], 'troncoGrande',
                      seg=6))
    # O galho comprido até passar do pivô.
    galho = [G(tx + 0.2, yp - 0.5, tz), G(tx + 0.9, yp + 0.1, tz), G(px, yp + 0.12, pz), G(px + 0.7, yp + 0.25, pz)]
    p.append(tube(galho, [0.3, 0.22, 0.15, 0.08], 'troncoGrande', seg=8))
    col.append(col_cilindro('tronco-cipo', 0.5, yp - chao_t + 0.3, G(tx, (chao_t - 0.3 + yp) / 2, tz)))
    copa = []
    rnd = random.Random(11)
    for k, (dx, dz, dy, r) in enumerate(((0, 0, 2.6, 2.2), (1.3, 0.6, 1.9, 1.5), (-1.2, -0.5, 1.8, 1.6),
                                         (0.3, -1.3, 2.0, 1.4), (-0.4, 1.3, 2.2, 1.4), (1.6, -0.2, 0.9, 1.0))):
        copa.append(superellipsoid((2 * r, 1.8 * r, 1.5 * r), G(tx + dx, yp + dy, tz + dz),
                                   ['copa', 'copaEscura', 'copaClara'][k % 3], e1=0.8, e2=0.9, seg=10, ring=6))
    # Folhagem no galho, por cima do cipó.
    copa.append(superellipsoid((1.5, 1.3, 0.8), G(px + 0.2, yp + 0.6, pz), 'copaEscura', e1=0.8, e2=0.9, seg=8,
                               ring=5))
    return p, copa


def cipo():
    """A corda (pivô no galho): verde, com folhinhas, e a alça no fim (como o `cipo` do Bosque)."""
    px, pz = PIVO
    topo = Vector(G(px, altura(px, pz) + ALTURA_DO_PIVO, pz))
    rnd = random.Random(70)
    pts = []
    for k in range(9):
        t = k / 8
        pts.append((topo.x + math.sin(t * 5) * 0.06, topo.y + math.cos(t * 4) * 0.06, topo.z - CORDA * t))
    p = [tube(pts, [0.06] * 9, 'cipo', seg=6)]
    for k in range(7):
        t = 0.08 + k * 0.12
        c = (topo.x, topo.y, topo.z - CORDA * t)
        p.append(leaf(c, rnd.uniform(0, 2 * math.pi), 0.35, 0.12, 'folhaCipo', lift=0.05, droop=0.12, fold=0.2, n=4))
    p.append(torus(0.16, 0.05, (topo.x, topo.y, topo.z - CORDA - 0.1), 'cipo', seg=10, rseg=4, rot=(R(90), 0, 0)))
    return p, tuple(topo)


def deque(col):
    d = DEQUE
    e = 0.22
    p = [box((d['lx'], d['lz'], e), G(d['x'], d['topo'] - e / 2, d['z']), 'deque', bevel=0.03, segs=1)]
    col.append(col_caixa('deque-segredo', (d['lx'], d['lz'], e), G(d['x'], d['topo'] - e / 2, d['z'])))
    for sx in (-1, 1):
        for sz in (-1, 1):
            x = d['x'] + sx * (d['lx'] / 2 - 0.2)
            z = d['z'] + sz * (d['lz'] / 2 - 0.2)
            b = altura(x, z) - 0.25
            topo = d['topo'] - 0.04
            p.append(cyl(0.11, topo - b, G(x, (topo + b) / 2, z), 'dequeEscuro', verts=8))
            col.append(col_cilindro('poste-segredo', 0.12, d['topo'] - e - b, G(x, (b + d['topo'] - e) / 2, z)))
    # Vigas de travar embaixo do tampo (para dentro da borda: fora do plano dele).
    for sz in (-1, 1):
        z = d['z'] + sz * (d['lz'] / 2 - 0.2)
        p.append(box((d['lx'] - 0.3, 0.12, 0.12), G(d['x'], d['topo'] - e - 0.07, z), 'dequeEscuro', bevel=0.02,
                     segs=1))
    # Bandeirinha num canto, pequena (enfeite do segredo).
    fx, fz = d['x'] + d['lx'] / 2 - 0.15, d['z'] - d['lz'] / 2 + 0.15
    p.append(cyl(0.025, 1.1, G(fx, d['topo'] + 0.5, fz), 'poste', verts=6))
    p.append(prism([(0, 0.0), (0.45, -0.12), (0, -0.24)], 0.02, G(fx + 0.02, d['topo'] + 1.0, fz), 'petalaAmarela',
                   rot=(R(90), 0, 0)))
    return p


def ancoras():
    o = bpy.data.objects.new('segredo-cipo', None)
    o.location = G(DEQUE['x'], DEQUE['topo'], DEQUE['z'])
    o.empty_display_type = 'PLAIN_AXES'
    bpy.context.collection.objects.link(o)
    return [o]


def main():
    lib_q.reset()
    col = []
    tronco, copa = arvore(col)
    corda, pivo = cipo()
    exportar('segredos-da-ilha', {
        'arvore-do-cipo': tronco,
        'copa-cipo': copa,
        'cipo-1': (corda, pivo),
        'deque-do-cipo': deque(col),
    }, colisores=col, ancoras=ancoras())


if __name__ == '__main__':
    main()
