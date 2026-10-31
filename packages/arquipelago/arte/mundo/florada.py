"""A florada da sua ilha: flores e moitinhas que nascem no gramado em três níveis, e os 24 lugares
onde podem nascer.

Referencial: cada nível (`florada-1`, `-2`, `-3`) é um canteirinho com o meio na origem e y = 0 no
chão, para o jogo pôr uma cópia em cada ponto (instanciar). Os pontos (`ponto-florada-1` a `-24`,
Empty) ficam no referencial do mundo (ilha central na origem), já na altura do chão (`altura()`).

Os níveis (um de cada vez num ponto, o maior é o mais florido):
- `florada-1`: brotos e cinco florzinhas baixas;
- `florada-2`: dez flores e duas moitinhas;
- `florada-3`: dezesseis flores e duas moitinhas floridas.
Tudo cabe num círculo de 0,9 m de raio e não passa de 0,42 m de altura: é miúdo do chão (abaixo do
degrau de 0,45 que o corpo sobe sozinho), então não colide, como as flores do `terreno.glb`.

Os pontos ficam no gramado, fora da casa e do lote grande, da horta, da bancada, do cata-vento, do
píer, do Farol e da subida dele, das trilhas, das pontes, das árvores, das moitas e pedras do
terreno, das chaves, do segredo, dos quadros e do segredo do cipó (`segredos_ilha.py`). O teste
`tests/florada.test.ts` confere as distâncias.
"""
from lib_mundo import *

RAIO_DO_CANTEIRO = 0.9
ALTURA_MAXIMA = 0.42
# Os lugares (x, z do jogo), escolhidos por uma busca do lugar mais livre (cada um a pelo menos
# 2,6 m dos outros); o teste confere cada distância.
PONTOS = [(-8.5, -20.5), (-9.0, 19.5), (18.0, -6.0), (17.5, -1.0), (0.0, -21.5), (-2.0, 21.5), (22.0, 4.0),
          (22.0, -1.0), (-18.5, -2.0), (5.0, -16.5), (-20.5, 8.5), (-7.0, -18.0), (0.5, 15.0), (-3.5, 13.5),
          (-6.5, 18.0), (9.0, -16.4), (-18.0, 7.0), (18.0, 12.5), (-20.0, 11.5), (4.5, -20.0), (0.5, -16.0),
          (-10.0, 13.0), (9.5, -19.0), (6.5, 17.5)]
CORES = ['petalaBranca', 'petalaRosa', 'petalaAmarela', 'petalaLilas']


def lugares(n, seed, raio, minimo):
    """`n` lugares no canteiro (x, y do Blender), afastados `minimo` um do outro (as pétalas de duas
    flores nunca se cruzam no mesmo plano)."""
    rnd = random.Random(seed)
    out = []
    tent = 0
    while len(out) < n and tent < 5000:
        tent += 1
        a = rnd.uniform(0, 2 * math.pi)
        r = raio * math.sqrt(rnd.uniform(0, 1))
        x, y = math.cos(a) * r, math.sin(a) * r
        if all(math.hypot(x - u, y - v) >= minimo for u, v in out):
            out.append((x, y))
    return out


def folhinhas(x, y, seed, n=3, comp=0.16):
    rnd = random.Random(seed)
    return [leaf((x, y, -0.01), rnd.uniform(0, 2 * math.pi), comp, 0.06, 'broto' if k % 2 else 'folhaAlface',
                 lift=0.25, droop=0.08, fold=0.2, n=4) for k in range(n)]


def moitinha(x, y, s, seed, florida):
    rnd = random.Random(seed)
    p = [superellipsoid((0.5 * s, 0.46 * s, 0.34 * s), (x, y, 0.12 * s), 'copaClara' if seed % 2 else 'copa',
                        e1=0.8, e2=0.9, seg=8, ring=5)]
    if florida:
        for k in range(4):
            a = rnd.uniform(0, 2 * math.pi)
            p.append(sphere(0.045 * s, (x + math.cos(a) * 0.14 * s, y + math.sin(a) * 0.14 * s, 0.27 * s),
                            CORES[(seed + k) % 4], subdiv=1, smooth_it=False))
    return p


def nivel(n_flores, moitinhas, broto, seed):
    p = []
    rnd = random.Random(seed)
    # As moitinhas primeiro (no meio), as flores em volta, sem encostar nelas.
    ms = lugares(moitinhas, seed + 1, RAIO_DO_CANTEIRO - 0.35, 0.6) if moitinhas else []
    for k, (x, y) in enumerate(ms):
        p += moitinha(x, y, 0.9 + 0.2 * rnd.random(), seed + k, florida=n_flores > 10)
    pos = [q for q in lugares(n_flores + 30, seed + 2, RAIO_DO_CANTEIRO - 0.12, 0.25)
           if all(math.hypot(q[0] - u, q[1] - v) > 0.36 for u, v in ms)][:n_flores]
    for k, (x, y) in enumerate(pos):
        haste = 0.12 + 0.16 * rnd.random()
        p += flor((x, y, 0.0), CORES[(k + seed) % 4], seed=seed * 10 + k, r=0.08 + 0.035 * rnd.random(), haste=haste)
        if broto:
            p += folhinhas(x, y, seed * 10 + k, n=2)
    if broto:
        for k, (x, y) in enumerate(lugares(4, seed + 3, RAIO_DO_CANTEIRO - 0.1, 0.3)):
            if all(math.hypot(x - u, y - v) > 0.25 for u, v in pos):
                p += folhinhas(x, y, seed + 50 + k, n=3, comp=0.12)
    return p


def pontos():
    out = []
    for i, (x, z) in enumerate(PONTOS):
        o = bpy.data.objects.new(f'ponto-florada-{i + 1}', None)
        o.location = no_chao(x, z)
        o.empty_display_type = 'PLAIN_AXES'
        bpy.context.collection.objects.link(o)
        out.append(o)
    return out


def main():
    lib_q.reset()
    nos = {
        'florada-1': nivel(5, 0, True, 1),
        'florada-2': nivel(10, 2, False, 2),
        'florada-3': nivel(16, 2, False, 14),
    }
    exportar('florada', nos, ancoras=pontos())


if __name__ == '__main__':
    main()
