"""O que a criança acha e guarda: a chave e a carta da chegada, a página do diário, o baú e a moeda.

- `chave`, `carta`, `pagina-diario`: um nó cada, deitados no chão (é assim que aparecem para
  pegar);
- `bau`: nós `bau` (a caixa, com o tesouro dentro) e `tampa` (pivô na dobradiça, atrás em cima);
  clipe `abrir` (0,75 s, toca uma vez: o jogo segura o último quadro);
- `moeda`: nó `moeda` com o pivô no centro; clipe `girar` (1 s, em laço).
"""
from lib_itens import *


def chave():
    p = []
    # Cabeça em trevo: três argolas em volta de um furo.
    for k in range(3):
        a = R(90 + 120 * k)
        p.append(lib_q.torus(0.026, 0.009, (-0.09 + math.cos(a) * 0.022, math.sin(a) * 0.022, 0.009), 'ouro', seg=16,
                             rseg=6))
    p.append(cyl(0.016, 0.018, (-0.09, 0, 0.009), 'ouro', verts=14))
    p.append(cyl(0.008, 0.012, (-0.09, 0, 0.012), 'tesouro', verts=10))
    p.append(cyl(0.01, 0.16, (0.0, 0, 0.009), 'ouro', verts=10, rot=(0, R(90), 0)))
    p.append(lib_q.torus(0.012, 0.004, (-0.05, 0, 0.009), 'ouro', seg=12, rseg=5, rot=(0, R(90), 0)))
    for x, h in ((0.055, 0.04), (0.072, 0.028)):
        p.append(box((0.014, 0.012, h), (x, 0, -h / 2 + 0.006), 'ouro', bevel=0.003, segs=1))
        p[-1].rotation_euler = (R(90), 0, 0)
        p[-1].location = (x, -h / 2 + 0.004, 0.009)
    return {'nos': {'chave': p}, 'grupo': 'colecao'}


def carta():
    p = []
    w, h, e = 0.2, 0.13, 0.008
    p.append(box((w, h, e), (0, 0, e / 2), 'envelope', bevel=0.003, segs=1))
    # Aba de cima, um pouco levantada.
    aba = prism([(-w / 2, 0), (w / 2, 0), (0, -h * 0.55)], 0.004, (0, 0, 0), 'papelSombra')
    aba.rotation_euler = (R(-90 + 4), 0, 0)
    aba.location = (0, h / 2, e + 0.002)
    p.append(aba)
    p.append(cyl(0.022, 0.006, (0, 0.0, e + 0.006), 'lacre', verts=16, bevel=0.002))
    p.append(prism(lib_q.heart_pts(0.012), 0.004, (0, 0, e + 0.01), 'tesouro', rot=(R(90), 0, 0)))
    for k in range(3):
        p.append(box((0.06 - k * 0.012, 0.004, 0.0015), (-0.055, -0.035 - k * 0.012, e + 0.0008), 'tinta', bevel=0))
    return {'nos': {'carta': p}, 'grupo': 'colecao'}


def pagina_diario():
    p = []
    w, h = 0.16, 0.22
    nx, ny = 8, 10
    verts, faces = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x = -w / 2 + w * i / nx
            y = -h / 2 + h * j / ny
            z = 0.004 + 0.018 * (i / nx) ** 2 + 0.012 * max(0.0, (j / ny - 0.7)) / 0.3 * (i / nx)
            if j == ny and i % 2 == 1:
                y -= 0.006  # borda rasgada
            verts.append((x, y, z))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    folha = malha('pagina', verts, faces, 'papel')
    s = folha.modifiers.new('esp', 'SOLIDIFY')
    s.thickness = 0.003
    lib_q._apply(folha, s)
    p.append(folha)
    # Linhas do caderno, a margem e um desenho de estrela (o rascunho da Íris).
    for k in range(7):
        y = -h / 2 + 0.03 + k * 0.024
        p.append(box((w * 0.82, 0.002, 0.001), (0.005, y, 0.0075 + 0.0), 'loucaAzul', bevel=0))
    p.append(box((0.002, h * 0.9, 0.001), (-w / 2 + 0.02, 0, 0.0075), 'lacre', bevel=0))
    p.append(prism(lib_q.star_pts(0.02, 0.009), 0.001, (0.04, 0.06, 0.0085), 'tinta', rot=(R(90), 0, 0)))
    for o in p[1:]:
        # Pousa cada traço na curva da folha.
        bpy.context.view_layer.update()
        deformar(o, lambda v, o=o: Vector((v.x, v.y, v.z + 0.018 * (((o.location.x + v.x) + w / 2) / w) ** 2)))
    return {'nos': {'pagina-diario': p}, 'grupo': 'colecao'}


def bau():
    L, F, A = 0.6, 0.4, 0.3
    caixa = [box((L, F, A), (0, 0, A / 2), 'bauMadeira', bevel=0.02, segs=2)]
    caixa.append(box((L - 0.05, F - 0.05, 0.02), (0, 0, A - 0.012), 'bauMiolo', bevel=0.0))
    for x in (-L / 2 + 0.06, L / 2 - 0.06):
        caixa.append(box((0.05, F + 0.012, A + 0.006), (x, 0, A / 2), 'bauFaixa', bevel=0.008, segs=1))
    caixa.append(box((0.07, 0.02, 0.08), (0, -F / 2 - 0.006, A - 0.05), 'bauFaixa', bevel=0.008, segs=1))
    caixa.append(cyl(0.012, 0.01, (0, -F / 2 - 0.018, A - 0.055), 'ferro', verts=10, rot=(R(90), 0, 0)))
    # Tesouro: moedas empilhadas dentro (aparecem quando a tampa abre).
    for k in range(9):
        a = k * 2.2
        caixa.append(cyl(0.035, 0.01, (math.cos(a) * 0.12, math.sin(a) * 0.06, A - 0.006 + 0.004 * (k % 3)), 'tesouro',
                         verts=12, rot=(R(10 * (k % 3)), R(8 * (k % 2)), 0)))
    # Tampa abaulada: meio cilindro deitado em x, um pouco achatado.
    tampa = [meio_cilindro(L, F / 2, A, 'bauMadeiraClara', seg=14, achatado=0.7)]
    for x in (-L / 2 + 0.06, L / 2 - 0.06):
        raio = F / 2 + 0.006
        arco = [(x, raio * math.cos(math.pi * k / 12), A + raio * 0.7 * math.sin(math.pi * k / 12)) for k in range(13)]
        tampa.append(tube(arco, [0.012] * 13, 'bauFaixa', seg=6))
    tampa.append(box((0.06, 0.02, 0.05), (0, -F / 2 - 0.006, A + 0.01), 'bauFaixa', bevel=0.006, segs=1))
    pivo = (0, F / 2, A)
    abrir = {'tampa': {'rotation_euler': [(0, (0, 0, 0)), (6, (R(-40), 0, 0)), (14, (R(-112), 0, 0)),
                                          (18, (R(-104), 0, 0))]}}
    return {'nos': {'bau': caixa, 'tampa': (tampa, pivo)}, 'clipes': {'abrir': abrir}, 'grupo': 'colecao'}


def moeda():
    r, e = 0.06, 0.014
    p = [cyl(r, e, (0, 0, 0), 'ouro', verts=28, rot=(R(90), 0, 0), bevel=0.003)]
    p.append(lib_q.torus(r - 0.004, 0.004, (0, 0, 0), 'tesouro', seg=28, rseg=5, rot=(R(90), 0, 0)))
    for s in (-1, 1):
        p.append(prism(lib_q.star_pts(0.032, 0.014), 0.006, (0, s * (e / 2), 0), 'tesouro'))
    pivo = (0, 0, 0)
    lib_ilha.place(p, loc=(0, 0, r))
    girar = {'moeda': {'rotation_euler': [(0, (0, 0, 0)), (12, (0, 0, math.pi)), (24, (0, 0, 2 * math.pi))],
                       '_linear': True}}
    return {'nos': {'moeda': (p, (0, 0, r))}, 'clipes': {'girar': girar}, 'grupo': 'colecao'}


ITENS = [('chave', chave), ('carta', carta), ('pagina-diario', pagina_diario), ('bau', bau), ('moeda', moeda)]

if __name__ == '__main__':
    rodar(ITENS)
