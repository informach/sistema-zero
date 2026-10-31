"""As pegadas marcadas no barro: rex, tricerátopo, pássaro e capivara.

Cada pegada é uma placa de barro com a marca afundada (um corte booleano: o fundo e as paredes
da marca ficam no material `barroFundo`, o resto em `barroPegada`). Servem para os ícones do
diário (`src/assets/icones/pegada-<bicho>.png`, vistas mais de cima: `DIRECAO_NO_ICONE` em
`render.py`) e ficam também como item em `src/assets/itens/pegada-<bicho>.glb`, um nó com o nome
do arquivo. As formas seguem o bicho: rex de três dedos grandes com garra, tricerátopo redonda com
dedos curtos, pássaro de três dedos finos para a frente e um para trás, capivara de quatro dedos.
O dedo do meio aponta para +Y (para longe de quem olha). Tamanho de verdade, em metros.

  /tmp/claude-0/blender-venv/bin/python -B arte/itens/pegadas.py
"""
from lib_itens import *

lib_q.PALETTE.update({
    'barroPegada': ('#9a7350', 0.95, None, 0),
    'barroFundo': ('#5f4330', 0.95, None, 0),
})


def placa(rx, ry, alto, seed):
    """A placa de barro (contorno orgânico), com o tampo em z = `alto`."""
    return lib_ilha.slab(blob(0, 0, rx, ry, seed=seed, n=32, wob=0.06), 0, alto, 'barroPegada', bevel=alto * 0.4,
                         segs=2, name='barro')


def marca(x, y, rx, ry, fundo, giro=0.0, alto=0.0, seg=16):
    """Um cortador da marca: elipsoide com o meio no tampo, afunda `fundo` no barro."""
    o = uvball(1, (x, y, alto), 'barroFundo', seg=seg, ring=8, scale=(rx, ry, fundo))
    o.rotation_euler = (0, 0, giro)
    return o


def cavar(base, cortadores, alto):
    """Corta as marcas na placa e pinta o fundo; apaga os cortadores."""
    bpy.context.view_layer.update()
    for c in cortadores:
        m = base.modifiers.new('cava', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.solver = 'EXACT'
        m.object = c
        lib_q._apply(base, m)
    for c in cortadores:
        bpy.data.objects.remove(c, do_unlink=True)
    costurar(base)
    pintar_por(base, lambda c, n: 'barroFundo' if c.z < alto - 0.002 else None)
    lib_q.flat(base)
    return base


def costurar(o, perto=1e-4):
    """Fecha as emendas em T que o corte deixa (um vértice no meio da aresta da face vizinha piscaria
    na tela): parte a aresta nesse ponto e solda os dois vértices."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    # Em triângulos já aqui: a diagonal que o exportador escolheria também pode passar por um vértice.
    bmesh.ops.triangulate(bm, faces=bm.faces)
    for _ in range(6):
        mudou = False
        for e in list(bm.edges):
            if not e.is_valid:
                continue
            a, b = e.verts[0].co.copy(), e.verts[1].co.copy()
            ab = b - a
            l2 = ab.length_squared
            if l2 < 1e-12:
                continue
            for v in bm.verts:
                if v in e.verts:
                    continue
                t = (v.co - a).dot(ab) / l2
                if 0 < t < 1 and (v.co - a).length > perto and (v.co - b).length > perto and (a + ab * t - v.co).length < perto:
                    _, nv = bmesh.utils.edge_split(e, e.verts[0], t)
                    nv.co = v.co.copy()
                    mudou = True
                    break
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        if not mudou:
            break
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    return o


def dedos(base_xy, angulos, comp, larg, fundo, alto, ponta=0.0):
    """Dedos que saem de `base_xy` para os ângulos (graus, 0 = +Y), com a garra na ponta."""
    cs = []
    bx, by = base_xy
    for a in angulos:
        t = R(a)
        dx, dy = math.sin(t), math.cos(t)
        cs.append(marca(bx + dx * comp * 0.55, by + dy * comp * 0.55, larg, comp * 0.5, fundo, giro=-t, alto=alto))
        if ponta:
            cs.append(marca(bx + dx * (comp * 1.02 + ponta * 0.3), by + dy * (comp * 1.02 + ponta * 0.3), larg * 0.45,
                            ponta, fundo * 0.8, giro=-t, alto=alto, seg=10))
    return cs


def pegada_rex():
    alto = 0.05
    p = placa(0.42, 0.46, alto, seed=3)
    cs = [marca(0, -0.17, 0.13, 0.11, 0.045, alto=alto)]
    cs += dedos((0, -0.12), (-28, 0, 28), 0.32, 0.065, 0.045, alto, ponta=0.05)
    return [cavar(p, cs, alto)]


def pegada_triceratopo():
    alto = 0.05
    p = placa(0.36, 0.36, alto, seed=8)
    cs = [marca(0, -0.04, 0.19, 0.17, 0.04, alto=alto, seg=20)]
    for a in (-62, -28, 6, 40):
        t = R(a + 11)
        cs.append(marca(math.sin(t) * 0.215, -0.04 + math.cos(t) * 0.2, 0.05, 0.045, 0.035, giro=-t, alto=alto, seg=12))
    return [cavar(p, cs, alto)]


def pegada_passaro():
    alto = 0.02
    p = placa(0.12, 0.13, alto, seed=5)
    cs = [marca(0, -0.012, 0.016, 0.017, 0.012, alto=alto, seg=12)]
    cs += dedos((0, -0.012), (-38, 0, 38), 0.1, 0.0085, 0.011, alto)
    cs += dedos((0, -0.012), (180,), 0.055, 0.008, 0.0105, alto)
    return [cavar(p, cs, alto)]


def pegada_capivara():
    alto = 0.02
    p = placa(0.1, 0.11, alto, seed=9)
    cs = [marca(0, -0.025, 0.034, 0.028, 0.012, alto=alto, seg=14)]
    for a in (-45, -15, 15, 45):
        t = R(a)
        x, y = math.sin(t) * 0.045, -0.02 + math.cos(t) * 0.048
        cs.append(marca(x, y, 0.012, 0.018, 0.011, giro=-t, alto=alto, seg=12))
        cs.append(marca(x + math.sin(t) * 0.024, y + math.cos(t) * 0.024, 0.005, 0.007, 0.008, giro=-t, alto=alto, seg=8))
    return [cavar(p, cs, alto)]


FORMAS = {
    'pegada-rex': pegada_rex,
    'pegada-triceratopo': pegada_triceratopo,
    'pegada-passaro': pegada_passaro,
    'pegada-capivara': pegada_capivara,
}

ITENS = [(pid, (lambda pid=pid: {'nos': {pid: FORMAS[pid]()}, 'grupo': 'pegadas'})) for pid in FORMAS]

if __name__ == '__main__':
    rodar(ITENS)
