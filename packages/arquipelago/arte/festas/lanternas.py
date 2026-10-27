"""Noite das Lanternas (`src/assets/festas/lanternas.glb`): um arquivo com as peças lado a lado.

Nós (cada um com o pivô no meio da própria base):
- `lanterna-vermelha`, `lanterna-amarela`, `lanterna-azul`: lanternas de papel redondas, com o
  papel nos materiais `lanternaVermelha`, `lanternaAmarela`, `lanternaAzul` (brilham um pouco
  sozinhos) e a chama no material `luz` (emissão 1; o jogo pulsa o brilho, como no Zappy). O vazio
  `gancho-<cor>` marca o ponto de pendurar;
- `lanterna-flutuante`: lanterna de flor de lótus para o lago, com o clipe `flutuar` (4 s, em laço:
  sobe, desce e gira devagar). As pétalas usam `lanternaRosa` e a vela, `luz`;
- `varal-de-luzes`: um trecho de varal de 2 com dez lâmpadas no material `luz`. Os vazios
  `ponta-esq` e `ponta-dir` marcam as pontas do fio para emendar trechos.
"""
from lib_festas import *

H_VARAL = 0.4


def lanterna_papel(papel):
    p = []
    perfil = [(0.0, 0.05), (0.1, 0.06), (0.2, 0.12), (0.25, 0.25), (0.24, 0.38), (0.19, 0.48), (0.1, 0.53), (0.0, 0.54)]
    o = torneado(perfil, papel, seg=16)
    p.append(o)
    # Varetas: aros mais escuros em volta do papel.
    for z, r in ((0.12, 0.2), (0.25, 0.25), (0.38, 0.24), (0.48, 0.19)):
        p.append(lib_q.torus(r + 0.004, 0.006, (0, 0, z), 'madeiraEscura', seg=18, rseg=4))
    p.append(cyl(0.11, 0.04, (0, 0, 0.55), 'ouro', verts=14))
    p.append(cyl(0.11, 0.035, (0, 0, 0.05), 'ouro', verts=14))
    p.append(cyl(0.085, 0.01, (0, 0, 0.03), 'luz', verts=12))
    p.append(lib_q.torus(0.035, 0.008, (0, 0, 0.6), 'ouro', seg=12, rseg=4, rot=(R(90), 0, 0)))
    # Franja embaixo.
    for k in range(8):
        a = 2 * math.pi * k / 8
        p.append(cyl(0.007, 0.06, (math.cos(a) * 0.05, math.sin(a) * 0.05, 0.0), papel, verts=4))
    return p, (0, 0, 0.64)


def lanterna_flutuante():
    p = [cyl(0.24, 0.04, (0, 0, 0.02), 'folhaLotus', verts=20, bevel=0.01)]
    for k in range(8):
        a = 2 * math.pi * k / 8
        p.append(leaf((math.cos(a) * 0.04, math.sin(a) * 0.04, 0.05), a, 0.17, 0.07, 'lanternaRosa', lift=0.16,
                      droop=0.02, fold=0.25, n=6))
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.3
        p.append(leaf((math.cos(a) * 0.03, math.sin(a) * 0.03, 0.06), a, 0.11, 0.05, 'lanternaRosa', lift=0.16,
                      droop=0.0, fold=0.3, n=5))
    p.append(cyl(0.035, 0.08, (0, 0, 0.1), 'papel', verts=10))
    p.append(prism([(0, 0), (0.018, 0.02), (0.012, 0.045), (0, 0.07), (-0.012, 0.045), (-0.018, 0.02)], 0.018,
                   (0, 0, 0.14), 'luz'))
    return p


def varal():
    p = []
    comp, flecha = 2.0, 0.1

    def z(x):
        return H_VARAL - flecha * (1 - (x / (comp / 2)) ** 2)
    pts = [(-comp / 2 + comp * k / 16, 0, z(-comp / 2 + comp * k / 16)) for k in range(17)]
    p.append(tube(pts, [0.006] * len(pts), 'fio', seg=4))
    for k in range(10):
        x = -comp / 2 + comp * (k + 0.5) / 10
        zz = z(x)
        p.append(cyl(0.016, 0.04, (x, 0, zz - 0.022), 'fio', verts=8))
        p.append(esfera(0.03, (x, 0, zz - 0.07), 'luz', escala=(1, 1, 1.25), seg=10, aneis=6))
    return p, {'ponta-esq': (-comp / 2, 0, H_VARAL), 'ponta-dir': (comp / 2, 0, H_VARAL)}


def lanternas():
    pecas, ganchos = [], {}
    for cor, m in (('vermelha', 'lanternaVermelha'), ('amarela', 'lanternaAmarela'), ('azul', 'lanternaAzul')):
        objs, g = lanterna_papel(m)
        pecas.append((f'lanterna-{cor}', objs))
        ganchos[f'gancho-{cor}'] = (f'lanterna-{cor}', g)
    pecas.append(('lanterna-flutuante', lanterna_flutuante()))
    v, pontas = varal()
    pecas.append(('varal-de-luzes', v))
    nos, desl = enfileirar(pecas, vao=0.6, largura_max=3.0)
    vazios = {k: tuple(Vector(p) + desl[n]) for k, (n, p) in ganchos.items()}
    vazios.update({k: tuple(Vector(p) + desl['varal-de-luzes']) for k, p in pontas.items()})
    flutuar = {'lanterna-flutuante': {'location': [(0, (0, 0, 0)), (24, (0, 0, 0.035)), (48, (0, 0, 0)),
                                                   (72, (0, 0, 0.025)), (96, (0, 0, 0))],
                                      'rotation_euler': [(0, (0, 0, 0)), (24, (R(3), 0, R(20))), (48, (0, 0, R(40))),
                                                         (72, (R(-3), 0, R(60))), (96, (0, 0, R(80)))]}}
    return {'nos': nos, 'vazios': vazios, 'clipes': {'flutuar': flutuar}, 'grupo': 'festas'}


PECAS = [('lanternas', lanternas)]

if __name__ == '__main__':
    rodar(PECAS)
