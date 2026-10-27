"""Peças das pontes para o anel: tábua, poste e corda, feitas para malha instanciada.

Cada nó tem UM material e fica centrado do jeito que o jogo instancia (`src/mundo/anel.tsx`):
- `tabua`: 2,2 × 0,14 × 0,5 centrada na origem (comprimento em x, a ponte anda em z). Material
  `madeiraPonte`: o jogo pinta de cinza enquanto a ponte está quebrada;
- `poste`: base em y = 0, ~1 de altura, com a cabeça arredondada (material `poste`);
- `corda`: cilindro de comprimento 1 deitado em z, de z = 0 a z = 1 (o jogo estica até o poste
  seguinte), material `corda`.
"""
from lib_mundo import *


def tabua():
    o = box((2.2, 0.5, 0.14), (0, 0, 0), 'madeiraPonte', bevel=0.035, segs=1)
    # Pontas levemente gastas: um canto mais baixo e a tábua um pouco torta.
    for v in o.data.vertices:
        if v.co.x > 1.0 and v.co.y > 0.15:
            v.co.z -= 0.025
        v.co.y += 0.02 * math.sin(v.co.x * 1.3)
    return [o]


def poste():
    return [cyl(0.085, 0.95, (0, 0, 0.475), 'poste', verts=8, r2=0.075),
            sphere(0.1, (0, 0, 0.97), 'poste', subdiv=1, scale=(1, 1, 0.75)),
            torus(0.09, 0.025, (0, 0, 0.82), 'poste', seg=10, rseg=4)]


def corda():
    # Comprimento 1 em y do Blender (z do jogo), de 0 a -1 (o glTF vira 0 a +1 em z).
    o = cyl(0.035, 1.0, (0, -0.5, 0), 'corda', verts=6, rot=(R(90), 0, 0))
    return [o]


def main():
    lib_q.reset()
    exportar('ponte', {'tabua': tabua(), 'poste': poste(), 'corda': corda()})


if __name__ == '__main__':
    main()
