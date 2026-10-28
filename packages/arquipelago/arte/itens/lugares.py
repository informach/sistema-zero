"""Peças de lugar: a luneta do píer, o Quadro das Cores e as placas.

- `luneta`: nós `luneta` (o pé de três pernas) e `tubo` (pivô no encaixe: o jogo gira para mirar);
- `quadro-das-cores`: nó `quadro` (cavalete, moldura e tela) e os seis espaços de cor `cor-1` a
  `cor-6`, cada um com o seu material de mesmo nome (a cor de verdade): o jogo deixa cinza e acende
  um por um, como as ilhas do anel;
- `placa-seta`, `placa-quadro`, `placa-tabuleta`: nó `placa` e nó `texto` (a face lisa, material
  `placaFace`, onde o jogo escreve ou desenha).
"""
from lib_itens import *


def luneta():
    pe = [cyl(0.05, 0.08, (0, 0, 0.9), 'lunetaEscura', verts=14)]
    for k in range(3):
        a = R(90 + 120 * k)
        pe.append(tube([(0, 0, 0.88), (math.cos(a) * 0.32, math.sin(a) * 0.32, 0.0)], [0.022, 0.02], 'madeira', seg=8))
        pe.append(cyl(0.03, 0.02, (math.cos(a) * 0.32, math.sin(a) * 0.32, 0.01), 'madeiraEscura', verts=10))
    pe.append(cyl(0.02, 0.1, (0, 0, 0.98), 'lunetaEscura', verts=10))
    alto = 1.04
    inc = R(18)
    tubo = []
    # Três tubos encaixados, do mais grosso (lente) ao mais fino (ocular), mirando para a frente (−Y).
    for k, (y0, y1, r, cor) in enumerate(((-0.45, -0.12, 0.06, 'luneta'), (-0.12, 0.12, 0.048, 'lunetaEscura'),
                                          (0.12, 0.3, 0.036, 'luneta'))):
        t = cyl(r, y1 - y0, (0, (y0 + y1) / 2, 0), cor, verts=18, rot=(R(90), 0, 0), bevel=0.004)
        tubo.append(t)
        tubo.append(lib_q.torus(r + 0.003, 0.007, (0, y0 + 0.01, 0), 'lunetaEscura' if cor == 'luneta' else 'luneta',
                                seg=18, rseg=5, rot=(R(90), 0, 0)))
    tubo.append(cyl(0.052, 0.006, (0, -0.455, 0), 'vidroLente', verts=18, rot=(R(90), 0, 0)))
    tubo.append(cyl(0.02, 0.04, (0, 0.32, 0), 'ferro', verts=12, rot=(R(90), 0, 0)))
    for o in tubo:
        o.location = Vector(o.location)
    lib_ilha.place(tubo, loc=(0, 0, 0))
    bpy.context.view_layer.update()
    for o in tubo:
        o.matrix_world = Matrix.Translation((0, 0, alto)) @ Matrix.Rotation(-inc, 4, 'X') @ o.matrix_world
    return {'nos': {'luneta': pe, 'tubo': (tubo, (0, 0, alto))}, 'grupo': 'lugares'}


def quadro_das_cores():
    W, H, base = 1.2, 0.85, 0.55
    q = []
    # Cavalete: duas pernas da frente, uma de trás e a travessa.
    for s in (-1, 1):
        q.append(tube([(s * 0.42, -0.06, 0.0), (s * 0.3, 0.0, base + H + 0.12)], [0.03, 0.026], 'madeira', seg=8))
    q.append(tube([(0, 0.35, 0.0), (0, 0.04, base + H)], [0.026, 0.022], 'madeiraEscura', seg=8))
    q.append(box((W + 0.1, 0.08, 0.05), (0, -0.05, base - 0.02), 'madeiraEscura', bevel=0.012))
    q.append(box((W + 0.08, 0.06, H + 0.08), (0, 0.0, base + H / 2), 'madeira', bevel=0.02))
    q.append(box((W, 0.02, H), (0, -0.035, base + H / 2), 'quadro', bevel=0.006, segs=1))
    q.append(box((W * 0.6, 0.012, 0.09), (0, -0.05, base + H - 0.09), 'papelSombra', bevel=0.005, segs=1))
    nos = {'quadro': q}
    # Seis manchas de tinta (2 linhas x 3), cada uma um nó com o seu material.
    for i in range(6):
        col, lin = i % 3, i // 3
        x = (col - 1) * 0.34
        z = base + H * 0.52 - lin * 0.27
        pts = lib_ilha.blob(0, 0, 0.11, 0.095, seed=i + 3, n=24, wob=0.08)
        o = prism([(px, py) for px, py in pts], 0.012, (x, -0.05, z), f'cor-{i + 1}', bevel=0.004)
        nos[f'cor-{i + 1}'] = [o]
    return {'nos': nos, 'grupo': 'lugares'}


def _poste(x, alto, m='madeiraEscura'):
    return [box((0.08, 0.08, alto), (x, 0, alto / 2), m, bevel=0.012, segs=1),
            cone(0.06, 0.05, (x, 0, alto + 0.025), m, verts=4, rot=(0, 0, R(45)))]


def placa_seta():
    p = _poste(0, 1.15)
    seta = [(-0.3, -0.1), (0.2, -0.1), (0.2, -0.16), (0.36, 0.0), (0.2, 0.16), (0.2, 0.1), (-0.3, 0.1)]
    p.append(prism(seta, 0.05, (0.06, -0.05, 0.92), 'placa', bevel=0.012))
    face = [(x * 0.86, z * 0.72) for x, z in seta]
    texto = [prism(face, 0.004, (0.07, -0.078, 0.92), 'placaFace')]
    return {'nos': {'placa': p, 'texto': texto}, 'grupo': 'lugares'}


def placa_quadro():
    p = _poste(-0.42, 1.0) + _poste(0.42, 1.0)
    p.append(box((1.0, 0.06, 0.5), (0, -0.07, 0.72), 'placa', bevel=0.02))
    p.append(box((0.08, 0.07, 0.05), (-0.42, -0.07, 0.5), 'madeiraEscura', bevel=0.01, segs=1))
    texto = [box((0.88, 0.006, 0.4), (0, -0.103, 0.72), 'placaFace', bevel=0.004, segs=1)]
    return {'nos': {'placa': p, 'texto': texto}, 'grupo': 'lugares'}


def placa_tabuleta():
    p = _poste(-0.25, 1.3)
    p.append(box((0.6, 0.07, 0.07), (0.02, 0, 1.18), 'madeiraEscura', bevel=0.012, segs=1))
    p.append(tube([(-0.21, 0, 1.08), (-0.09, 0, 1.18)], [0.018, 0.018], 'madeiraEscura', seg=6))
    for x in (0.08, 0.26):
        p.append(tube([(x, 0, 1.15), (x, 0, 1.0)], [0.006, 0.006], 'corda', seg=5))
    p.append(box((0.32, 0.04, 0.22), (0.17, 0, 0.9), 'placa', bevel=0.015))
    texto = [box((0.27, 0.004, 0.17), (0.17, -0.022, 0.9), 'placaFace', bevel=0.003, segs=1)]
    return {'nos': {'placa': p, 'texto': texto}, 'grupo': 'lugares'}


ITENS = [('luneta', luneta), ('quadro-das-cores', quadro_das_cores), ('placa-seta', placa_seta),
         ('placa-quadro', placa_quadro), ('placa-tabuleta', placa_tabuleta)]

if __name__ == '__main__':
    rodar(ITENS)
