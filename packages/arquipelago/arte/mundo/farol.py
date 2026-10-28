"""O Farol da sua ilha: torre listrada sobre as pedras, com a lanterna que acende na Lenda.

Referencial: o grupo `Farol` do jogo (y = 0 no chão). Cabe no colisor de antes (cilindro de raio
1,6 até y 9) com a base de pedra de raio ~2,2. A porta olha para o meio da ilha (a casa).

Nós (contrato com `src/mundo/farol.tsx`):
- `farol`: pedras, torre, galeria, caixilhos e telhado. Apagado, o jogo puxa as cores para o
  cinza; aceso, mostra as cores de verdade (vermelho e branco do Arquipélago);
- `lampada`: a lâmpada (material `lampadaFarol`, o jogo acende a emissão);
- `vidro`: o vidro da lanterna (material `vidroFarol`, brilha quando acende);
- `facho`: dois fachos opostos com o pivô no centro da lâmpada; o jogo gira em y.
"""
from lib_mundo import *

Y0, Y1 = 1.35, 8.55       # torre: base e topo
R0, R1 = 1.12, 0.74       # raio embaixo e em cima
YL = 9.4                  # centro da lâmpada
# Direção da porta: do farol para o meio da ilha (no jogo).
_dx, _dz = 0 - FAROL[0], -4 - FAROL[1]
ANG_PORTA = math.atan2(-_dz, _dx)  # no chão do Blender (x, -z)


def raio(y):
    return R0 + (R1 - R0) * (y - Y0) / (Y1 - Y0)


def faixa(y0, y1, m, folga=0.0, verts=28):
    return cyl(raio(y0) + folga, y1 - y0, (0, 0, (y0 + y1) / 2), m, verts=verts, r2=raio(y1) + folga)


def no_lado(ang, r, z):
    return (math.cos(ang) * r, math.sin(ang) * r, z)


def corpo():
    p = []
    # Pedras do pé: um monte de pedras chapadas, mais alto atrás.
    for i, (a, d, s, h) in enumerate([(0.75, 1.45, 2.0, 1.25), (1.6, 1.55, 1.8, 1.05), (2.6, 1.45, 2.2, 1.45),
                                      (3.6, 1.5, 2.1, 1.6), (4.6, 1.5, 1.9, 1.25), (5.5, 1.45, 1.8, 1.0),
                                      (0.0, 1.95, 1.0, 0.55), (3.1, 2.2, 1.2, 0.7)]):
        aa = ANG_PORTA + a
        p.append(rock((math.cos(aa) * d, math.sin(aa) * d, -0.15), (s, s * 0.9, h), 'farolPedra', seed=20 + i,
                      subdiv=1, rough=0.16, flat_top=0.25, top_m='musgo' if i % 2 else 'farolPedraClara'))
    # Degraus de pedra até a porta.
    for k in range(3):
        c = no_lado(ANG_PORTA, R0 + 0.95 - k * 0.32, 0.12 + k * 0.28)
        o = box((0.62, 1.2, 0.26), c, 'farolPedraClara', bevel=0.05, segs=1, rot=(0, 0, ANG_PORTA))
        p.append(o)
    # Alicerce redondo de pedra com friso.
    p.append(cyl(R0 + 0.22, 0.6, (0, 0, Y0 - 0.25), 'farolPedraClara', verts=28, bevel=0.05))
    p.append(cyl(R0 + 0.26, 0.1, (0, 0, Y0 + 0.02), 'farolBranco', verts=28, bevel=0.03))
    # Torre: faixas vermelhas e brancas alternadas (como o farol de antes, com mais acabamento).
    cortes = [Y0, 2.85, 4.3, 5.75, 7.2, Y1]
    for i in range(5):
        p.append(faixa(cortes[i], cortes[i + 1], 'farolVermelho' if i % 2 == 0 else 'farolBranco'))
    for y in cortes[1:-1]:
        p.append(faixa(y - 0.04, y + 0.04, 'farolMarinho', folga=0.015))
    # Porta em arco com batente, e janelinhas subindo em espiral.
    pa = ANG_PORTA
    c = no_lado(pa, raio(Y0 + 0.9) - 0.02, Y0 + 0.95)
    p.append(box((0.22, 0.85, 1.5), c, 'farolMarinho', bevel=0.04, segs=1, rot=(0, 0, pa)))
    p.append(cyl(0.425, 0.22, no_lado(pa, raio(Y0 + 1.7) - 0.02, Y0 + 1.7), 'farolMarinho', verts=14,
                 rot=(0, R(90), pa)))
    c2 = no_lado(pa, raio(Y0 + 0.95) + 0.03, Y0 + 0.95)
    p.append(box((0.08, 1.05, 1.62), c2, 'farolBranco', bevel=0.03, segs=1, rot=(0, 0, pa)))
    p.append(box((0.1, 0.72, 1.42), no_lado(pa, raio(Y0 + 0.9) + 0.06, Y0 + 0.88), 'batente', bevel=0.03, segs=1,
                 rot=(0, 0, pa)))
    p.append(sphere(0.06, no_lado(pa + 0.18, raio(Y0 + 0.9) + 0.14, Y0 + 0.85), 'macaneta', subdiv=1))
    for k, y in enumerate((3.55, 5.0, 6.45)):
        a = pa + 1.9 + k * 2.1
        r = raio(y)
        p.append(box((0.12, 0.52, 0.72), no_lado(a, r, y), 'farolBranco', bevel=0.03, segs=1, rot=(0, 0, a)))
        p.append(box((0.1, 0.36, 0.56), no_lado(a, r + 0.03, y), 'vidroJanela', bevel=0.0, rot=(0, 0, a)))
    # Galeria: mãos-francesas, piso largo e gradil.
    p.append(cyl(R1 + 0.02, 0.28, (0, 0, Y1 - 0.08), 'farolMarinho', verts=28, r2=1.32))
    p.append(cyl(1.42, 0.14, (0, 0, Y1 + 0.13), 'farolMarinho', verts=32, bevel=0.03))
    for i in range(16):
        a = 2 * math.pi * i / 16
        p.append(cyl(0.025, 0.55, no_lado(a, 1.33, Y1 + 0.47), 'farolBranco', verts=5, smooth_sides=False))
    p.append(torus(1.33, 0.04, (0, 0, Y1 + 0.75), 'farolBranco', seg=32, rseg=5))
    p.append(torus(1.33, 0.025, (0, 0, Y1 + 0.47), 'farolBranco', seg=32, rseg=4))
    # Lanterna: aro de baixo, caixilhos e aro de cima (o vidro é outro nó).
    yl0, yl1 = Y1 + 0.2, YL + 0.75
    p.append(cyl(0.86, 0.3, (0, 0, yl0 + 0.15), 'farolVermelho', verts=28, bevel=0.03))
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        p.append(box((0.08, 0.08, yl1 - yl0 - 0.3), no_lado(a, 0.79, (yl0 + 0.3 + yl1) / 2), 'farolBranco',
                     bevel=0.0, rot=(0, 0, a)))
    p.append(torus(0.8, 0.05, (0, 0, yl1), 'farolBranco', seg=32, rseg=6))
    # Telhado: aba, cúpula vermelha em gomos, bolinha e cata-vento.
    p.append(cyl(1.0, 0.12, (0, 0, yl1 + 0.08), 'farolMarinho', verts=32, bevel=0.03))
    p.append(cyl(0.95, 0.9, (0, 0, yl1 + 0.6), 'farolVermelho', verts=24, r2=0.12))
    for i in range(8):
        a = 2 * math.pi * i / 8
        p.append(tube([no_lado(a, 0.14, yl1 + 1.03), no_lado(a, 0.96, yl1 + 0.16)], [0.03, 0.04], 'farolMarinho', seg=5))
    p.append(sphere(0.17, (0, 0, yl1 + 1.12), 'macaneta', subdiv=2))
    p.append(cyl(0.025, 0.55, (0, 0, yl1 + 1.45), 'farolMarinho', verts=6))
    p.append(prism([(0, 0.07), (0.42, 0), (0, -0.07)], 0.03, (0.02, 0, yl1 + 1.6), 'farolVermelho'))
    p.append(prism([(0, 0.11), (-0.22, 0.0), (0, -0.11)], 0.03, (0.0, 0, yl1 + 1.6), 'farolMarinho'))
    return p


def vidro():
    yl0, yl1 = Y1 + 0.2, YL + 0.75
    return [cyl(0.76, yl1 - yl0 - 0.3, (0, 0, (yl0 + 0.3 + yl1) / 2), 'vidroFarol', verts=28)]


def lampada():
    p = [sphere(0.42, (0, 0, YL), 'lampadaFarol', subdiv=2)]
    # Lente em anéis (a "lente de Fresnel" do farol de verdade, simplificada).
    for k, dz in enumerate((-0.28, 0.28)):
        p.append(torus(0.36, 0.05, (0, 0, YL + dz), 'lampadaFarol', seg=20, rseg=5))
    p.append(cyl(0.18, 0.4, (0, 0, YL - 0.62), 'farolMarinho', verts=10))
    return p


def cone_aberto(comp, r0, r1, m, seg=20, sentido=1):
    """Facho: cone sem tampa, deitado em x, do centro da lâmpada para fora."""
    verts, faces = [], []
    for k, (x, r) in enumerate(((0.3 * sentido, r0), (comp * sentido, r1))):
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append((x, math.cos(a) * r, YL + math.sin(a) * r))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((i, j, seg + j, seg + i))
    o = malha('facho', verts, faces, m, liso=True, cima=False)
    return o


def facho():
    return [cone_aberto(26, 0.35, 3.2, 'fachoFarol', sentido=1), cone_aberto(26, 0.35, 3.2, 'fachoFarol', sentido=-1)]


def main():
    lib_q.reset()
    exportar('farol', {
        'farol': corpo(),
        'vidro': vidro(),
        'lampada': lampada(),
        'facho': (facho(), (0, 0, YL)),
    })


if __name__ == '__main__':
    main()
