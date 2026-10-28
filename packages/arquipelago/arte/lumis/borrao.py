"""O borrão de névoa do Cinza: a nuvenzinha cinza que aparece à noite e desbota o que está fora.

Fofo e um pouco travesso (tensão boa, sem dano). Um miolo cinza macio com um rabinho de fumaça,
camadas de névoa translúcida em volta, dois olhinhos de quem está aprontando e um sorriso de lado.

Animações:
- `flutuar` (2 s, em laço): sobe e desce, respira, a névoa gira devagar e ele espia de lado;
- `fugir` (1 s, em laço): inclina para a frente, estica e a névoa fica para trás;
- `preso` (1 s, em laço): preso na luz da lanterna, chacoalha e aperta os olhos;
- `virar` (1,5 s, uma vez só): encolhe, incha e se desfaz em faíscas de luz. No fim não sobra nada
  visível: o jogo troca pelo Lumi da família da ilha.

  /tmp/claude-0/blender-venv/bin/python arte/lumis/borrao.py   # grava src/assets/lumis/borrao.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import lib_lumis as L  # noqa: E402

PALETA = {
    'nevoa': ('#9a9dab', 0.9, None, 0, 1),
    'nevoa-clara': ('#d6d8e0', 0.85, '#d0d3e0', 0.22, 0.4),
    'pupila': ('#2b2d3a', 0.3, None, 0, 1),
    'boca': ('#3c3e4c', 0.6, None, 0, 1),
    'bochecha': ('#b4a6c8', 0.8, None, 0, 1),
    'faisca': ('#fff7d1', 0.3, '#fff1a8', 6.0, 1),
}
CENTRO = (0, 0, 0.66)

# Bolinhas de névoa em volta do miolo, na borda (para o contorno ficar enevoado) e atrás:
# (ângulo no plano da frente, em graus a partir de +X, distância, raio, profundidade, fase).
NEVOA = [
    (5, 0.44, 0.19, 0.06, 0.0),
    (42, 0.45, 0.2, 0.08, 0.13),
    (78, 0.47, 0.18, 0.1, 0.27),
    (112, 0.46, 0.2, 0.08, 0.4),
    (150, 0.45, 0.19, 0.06, 0.55),
    (192, 0.42, 0.17, 0.05, 0.68),
    (228, 0.36, 0.15, 0.1, 0.8),
    (322, 0.38, 0.16, 0.1, 0.9),
    (60, 0.22, 0.24, 0.3, 0.35),
]


class Borrao(L.Animado):
    def __init__(self):
        self.raiz = bpy.data.objects.new('borrao', None)
        bpy.context.scene.collection.objects.link(self.raiz)

        bolas = [L.bola('nevoa', 0.42, CENTRO, (1.05, 1, 0.95), seg=24, aneis=14)]
        for p, r in (((-0.22, 0.02, 0.98), 0.21), ((0.16, 0.04, 1.03), 0.23), ((0.36, 0.03, 0.82), 0.17),
                     ((-0.38, 0.03, 0.7), 0.17), ((0.05, 0.08, 0.3), 0.2), ((0.15, 0.12, 0.15), 0.13),
                     ((0.27, 0.13, 0.07), 0.085), ((0.34, 0.1, 0.06), 0.06)):
            bolas.append(L.bola('nevoa', r, p, seg=16, aneis=10))
        miolo = L.fundir(bolas, 'miolo', voxel=0.028, tris=870, alisar=6)

        olhos = []
        for lado in (-1, 1):
            # Olhinhos de lua: pálpebra reta e inclinada para dentro, de quem está aprontando.
            f = L.forma_lua(corte=0.32, inclina=0.32 * lado)
            o = L.decalque(miolo, 'pupila', (0.15 * lado, 0.74), (0.075, 0.095), forma=f, alto=0.004,
                           bojo=0.015, aneis=2)
            b = L.decalque(o, 'olho', (0.15 * lado + 0.025, 0.73), (0.022, 0.022), forma=L.forma_elipse(10),
                           alto=0.003, bojo=0.004, aneis=1)
            olhos += [o, b]
        self.olhos = L.juntar(olhos, 'olhos', pivo=(0, -0.4, 0.74))
        boca = L.linha(miolo, 'boca', [(-0.07, 0.6), (-0.03, 0.585), (0.02, 0.585), (0.06, 0.6), (0.085, 0.625)], 0.012)
        bochechas = [L.decalque(miolo, 'bochecha', (0.25 * lado, 0.6), (0.05, 0.03), alto=0.003, aneis=1)
                     for lado in (-1, 1)]
        self.miolo = L.juntar([miolo, boca, *bochechas], 'miolo', pivo=CENTRO)

        self.nevoa = []
        for i, (ang, dist, r, y, fase) in enumerate(NEVOA):
            a = math.radians(ang)
            p = (CENTRO[0] + dist * math.cos(a), y, CENTRO[2] + dist * math.sin(a))
            b = L.bola('nevoa-clara', r, p, seg=12, aneis=8)
            self.nevoa.append((L.juntar([b], f'nevoa-{i + 1}', pivo=p), fase))

        self.faiscas = []
        for i in range(8):
            a = 2 * math.pi * i / 8
            f = L.estrela4('faisca', 0.075 if i % 2 else 0.055, CENTRO, rot=(0, math.degrees(a), 0))
            f = L.juntar([f], f'faisca-{i + 1}', pivo=CENTRO)
            f.scale = (0.001, 0.001, 0.001)
            self.faiscas.append((f, a))

        L.prender(self.miolo, self.raiz)
        L.prender(self.olhos, self.miolo)
        for o, _ in self.nevoa + self.faiscas:
            L.prender(o, self.raiz)
        self.registrar()


def _nevoa(B, poses, t, voltas=1, raio=0.035, puxa=0.0, atras=0.0, pulso=0.12, escala=1.0):
    for o, fase in B.nevoa:
        w = 2 * math.pi * (voltas * t + fase)
        base = B.repouso[o][0] - L.Vector(CENTRO)
        dl = (raio * math.cos(w) - base.x * puxa, raio * math.sin(w) + atras - base.y * puxa,
              raio * 0.7 * math.sin(w + 1.2) - base.z * puxa)
        e = escala * (1 + pulso * math.sin(w))
        poses[o] = (dl, (0, 0, 0), (e, e, e))


def flutuar(B, t):
    w = 2 * math.pi * t
    poses = {
        B.raiz: ((0, 0, 0.07 * math.sin(w)), (3 * math.sin(w + 0.6), 0, 6 * math.sin(w)), (1, 1, 1)),
        B.miolo: ((0, 0, 0), (0, 0, 0), (1 + 0.035 * math.sin(2 * w), 1 + 0.035 * math.sin(2 * w), 1 - 0.04 * math.sin(2 * w))),
        B.olhos: ((0.018 * math.sin(w), 0, 0), (0, 0, 0), (1, 1, 1 - 0.9 * L._sino(t, 0.55, 0.04))),
    }
    _nevoa(B, poses, t)
    return poses


def fugir(B, t):
    w = 2 * math.pi * t
    poses = {
        B.raiz: ((0, 0, 0.05 * math.sin(2 * w)), (16 + 4 * math.sin(2 * w), 5 * math.sin(w), 8 * math.sin(w)), (1, 1, 1)),
        B.miolo: ((0, 0, 0), (0, 0, 0), (1 - 0.06 * math.sin(2 * w), 1 + 0.12 + 0.06 * math.sin(2 * w), 1 - 0.05)),
        B.olhos: ((0, 0, 0), (0, 0, 0), (1, 1, 0.8)),
    }
    _nevoa(B, poses, t, voltas=2, raio=0.05, atras=0.12, pulso=0.18)
    return poses


def preso(B, t):
    w = 2 * math.pi * t
    tremor = math.sin(6 * w)
    poses = {
        B.raiz: ((0.015 * math.sin(10 * w), 0, 0.08 + 0.02 * math.sin(4 * w)),
                 (4 * math.sin(4 * w + 1), 10 * tremor, 6 * math.sin(2 * w)), (1, 1, 1)),
        B.miolo: ((0, 0, 0), (0, 0, 0), (1 + 0.09 * tremor, 1 + 0.04 * tremor, 1 - 0.09 * tremor)),
        B.olhos: ((0, 0, 0), (0, 0, 0), (1.05, 1, 0.55 + 0.35 * abs(math.sin(3 * w)))),
    }
    _nevoa(B, poses, t, voltas=3, raio=0.03, puxa=0.3, pulso=0.2, escala=0.85)
    return poses


def virar(B, t):
    tremor = math.sin(2 * math.pi * 10 * t)
    if t < 0.35:
        u = t / 0.35
        e = 1 - 0.25 * L._suave(u)
        balanco = 6 + 10 * u
    elif t < 0.47:
        u = (t - 0.35) / 0.12
        e = 0.75 + 0.55 * L._suave(u)
        balanco = 16 * (1 - u)
    else:
        u = (t - 0.47) / 0.1
        e = max(0.001, 1.3 * (1 - L._suave(u)))
        balanco = 0
    poses = {
        B.raiz: ((0, 0, 0.1 * L._suave(t / 0.47)), (0, balanco * tremor * 0.6, balanco * tremor), (1, 1, 1)),
        B.miolo: ((0, 0, 0), (0, 0, 0), (e * (1 + 0.06 * tremor), e, e * (1 - 0.06 * tremor))),
        B.olhos: ((0, 0, 0), (0, 0, 0), (1, 1, 0.15 if 0.35 <= t < 0.47 else 0.6)),
    }
    puxa = L._suave(t / 0.47)
    some = 1 - L._suave((t - 0.38) / 0.12)
    _nevoa(B, poses, t, voltas=2, raio=0.03, puxa=0.7 * puxa, escala=max(0.001, some))
    for i, (o, a) in enumerate(B.faiscas):
        u = max(0.0, (t - 0.45 - 0.02 * (i % 3)) / 0.5)
        if u <= 0:
            poses[o] = ((0, 0, 0), (0, 0, 0), (0.001, 0.001, 0.001))
            continue
        voo = 1 - (1 - min(1.0, u)) ** 2.5
        r = 0.75 * voo
        cresce = min(1.0, u / 0.25) * (1 - L._suave((u - 0.55) / 0.45))
        e = max(0.001, 1000 * 1.4 * cresce)  # a escala de repouso é 0,001
        poses[o] = ((r * math.cos(a), -0.15 * voo, r * math.sin(a) * 0.85 + 0.25 * voo),
                    (0, 180 * u, 0), (e, e, e))
    return poses


def main():
    L.comecar(PALETA)
    b = Borrao()
    b.gravar('flutuar', 48, flutuar)
    b.gravar('fugir', 24, fugir)
    b.gravar('preso', 24, preso)
    b.gravar('virar', 36, virar, laco=False)
    L.exportar('borrao', {'tipo': 'borrão do Cinza'})


if __name__ == '__main__':
    main()
