"""A argola da corrida de balão das Nuvens (fase4-07): um anel de nuvem fofa com a faixa colorida por
dentro, no lugar do toro liso do código.

Referencial: o meio da argola na origem, de pé, de frente para o +z do three (o −Y do Blender), como
o `TorusGeometry` que ela substitui. Gera `src/assets/ilhas/nuvens-argola.glb` com os nós:
- `nuvem`: os tufos brancos em volta (iguais nas seis argolas);
- `faixa`: a faixa por dentro, no raio do `ARGOLAS.raio` (4,2 m) do jogo. O material `argolaFaixa`
  é trocado no jogo pela cor de cada argola, que acende quando é a próxima.
O vão livre por dentro continua o de antes (4,2 − 0,22 m): os tufos ficam por fora da faixa.
"""
from lib_ilhas_b import *

lib_q.PALETTE.update({'argolaFaixa': ('#ffffff', 0.6, None, 0)})

RAIO = 4.2      # o meio da faixa (ARGOLAS.raio do jogo)
FAIXA = 0.14    # meia-espessura da faixa
TUFOS = 32


def nuvem():
    rnd = random.Random(7)
    p = []
    for k in range(TUFOS):
        a = 2 * math.pi * (k + rnd.uniform(-0.2, 0.2)) / TUFOS
        r = rnd.uniform(0.42, 0.6)
        # Por fora da faixa: o lado de dentro do tufo não passa de RAIO − 0,22.
        d = RAIO + r - 0.18 + rnd.uniform(0.0, 0.12)
        y = rnd.uniform(-0.12, 0.12)
        p.append(uvball(r, (math.cos(a) * d, y, math.sin(a) * d), 'nuvem', seg=8, ring=5))
        # Um tufinho menor por cima de cada dois, para a borda não ficar lisa.
        if k % 2 == 0:
            r2 = r * 0.6
            d2 = d + r * 0.55
            p.append(uvball(r2, (math.cos(a + 0.08) * d2, y + rnd.choice((-1, 1)) * r * 0.35, math.sin(a + 0.08) * d2),
                            'nuvem', seg=6, ring=4))
    return p


def faixa():
    return [torus(RAIO, FAIXA, (0, 0, 0), 'argolaFaixa', seg=48, rseg=6, rot=(math.pi / 2, 0, 0))]


def main():
    lib_q.reset()
    exportar('nuvens-argola', {'nuvem': nuvem(), 'faixa': faixa()})


if __name__ == '__main__':
    main()
