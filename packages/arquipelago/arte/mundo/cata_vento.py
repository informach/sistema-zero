"""O cata-vento da horta (pedido da fase4-08): o lugar de escolher o clima da sua ilha.

Referencial: a base do poste na origem, y = 0 no chão; a hélice olha para a frente do jogo (o −Y
do Blender, o +z do three). O jogo põe o cata-vento ao lado da horta (`CATA_VENTO` em
`src/mundo/medidas.ts`) e gira o nó `helice` em volta do eixo dele (o z do three), mais depressa
com chuva.

Nós (contrato com `src/mundo/cata-vento.tsx`):
- `poste`: o pé de tábuas cruzadas, o poste e a cabeça com a cauda (parados);
- `helice`: o cubo e as seis pás coloridas, com o pivô no meio do cubo;
- `col-cil-poste-cata-vento-1`: o poste (só segura o corpo: o prefixo `poste` deixa a câmera passar).
"""
from lib_mundo import *
from mathutils import Matrix

lib_q.PALETTE.update({
    'paSol': ('#ffc93c', 0.6, None, 0),
    'paLaranja': ('#ff8a3d', 0.6, None, 0),
    'paVermelha': ('#ef5b5b', 0.6, None, 0),
    'paAzul': ('#4aa8ff', 0.6, None, 0),
    'paVerde': ('#5cc36b', 0.6, None, 0),
    'paRoxa': ('#a46ee6', 0.6, None, 0),
})

ALTURA = 2.3          # do chão ao meio do cubo da hélice
RAIO_DAS_PAS = 0.55   # do meio do cubo à ponta de cada pá
PAS = ('paSol', 'paLaranja', 'paVermelha', 'paAzul', 'paVerde', 'paRoxa')


def poste():
    p = []
    # O pé: duas tábuas cruzadas no chão, presas por quatro escoras.
    p.append(box((0.62, 0.12, 0.08), (0, 0, 0.04), 'madeiraCanteiroEscura', bevel=0.015, segs=1))
    p.append(box((0.12, 0.62, 0.08), (0, 0, 0.04), 'madeiraCanteiroEscura', bevel=0.015, segs=1))
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        dx, dy = math.cos(ang), math.sin(ang)
        p.append(tube([(dx * 0.24, dy * 0.24, 0.06), (dx * 0.05, dy * 0.05, 0.55)], [0.022, 0.018], 'madeiraCanteiro',
                      seg=6))
    # O poste, um pouco mais fino em cima.
    p.append(cyl(0.055, ALTURA - 0.1, (0, 0, (ALTURA - 0.1) / 2), 'tronco', verts=10, r2=0.045))
    # A cabeça: a caixinha do eixo e a cauda que aponta para trás (o +Y do Blender).
    p.append(box((0.12, 0.26, 0.12), (0, 0.05, ALTURA), 'madeiraCanteiro', bevel=0.02, segs=1))
    p.append(box((0.04, 0.42, 0.04), (0, 0.38, ALTURA), 'madeiraCanteiroEscura', bevel=0.01, segs=1))
    cauda = [(0.0, 0.55, ALTURA - 0.14), (0.0, 0.86, ALTURA - 0.2), (0.0, 0.92, ALTURA + 0.22), (0.0, 0.6, ALTURA + 0.12)]
    # A cauda é uma placa fina em pé (no plano YZ): o `slab` faz no XY, então gira depois.
    pts = [(y, z - ALTURA) for (_, y, z) in cauda]
    c = slab(pts, -0.012, 0.012, 'paAzul', bevel=0.004, segs=1)
    c.rotation_euler = (math.pi / 2, 0, math.pi / 2)
    c.location = (0, 0, ALTURA)
    p.append(c)
    return p


def helice():
    """O cubo e as seis pás, no plano XZ do Blender (de frente para −Y), com o meio na origem."""
    p = [cyl(0.075, 0.1, (0, 0, 0), 'paSol', verts=12, rot=(math.pi / 2, 0, 0))]
    p.append(cone(0.05, 0.08, (0, -0.09, 0), 'paVermelha', verts=10, rot=(math.pi / 2, 0, 0)))
    for k, m in enumerate(PAS):
        a = 2 * math.pi * k / len(PAS)
        # Cada pá: uma placa que alarga para fora, girada um pouco no próprio eixo (pega o vento).
        comp = RAIO_DAS_PAS - 0.07
        # Feita em pé no meio do cubo (a origem da pá é o cubo: ela gira em volta dele).
        o = box((0.17, 0.018, comp), (0, 0, 0), m, bevel=0.008, segs=1)
        o.data.transform(Matrix.Translation((0, 0, 0.07 + comp / 2)))
        bm = bmesh.new()
        bm.from_mesh(o.data)
        for v in bm.verts:
            t = (v.co.z - 0.07) / comp  # 0 no cubo, 1 na ponta
            v.co.x *= 0.45 + 0.75 * t
        bm.to_mesh(o.data)
        bm.free()
        # A torção da pá (em volta do eixo dela) vai na malha, antes do giro em volta do cubo.
        o.data.transform(Matrix.Rotation(R(18), 4, 'Z'))
        o.rotation_euler = (0, a, 0)
        p.append(o)
    return p


def main():
    lib_q.reset()
    col = [col_cilindro('poste-cata-vento', 0.12, ALTURA, (0, 0, ALTURA / 2))]
    pas = helice()
    for o in pas:
        o.location = Vector(o.location) + Vector((0, -0.12, ALTURA))
    exportar('cata-vento', {
        'poste': poste(),
        'helice': (pas, (0, -0.12, ALTURA)),
    }, colisores=col)


if __name__ == '__main__':
    main()
