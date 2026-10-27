"""Capi, a capivara veterinária do Bosque dos Bichos.

Cabeça grande e quadradona com o focinho largo, orelhinhas redondas no alto, corpo de barril e
perninhas curtas. Usa a folha de chapéu e carrega a maleta de cuidar dos bichos na mão esquerda.

  /tmp/blender-venv/bin/python arte/personagens/capi.py   # grava src/assets/personagens/capi.glb
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_personagens import Personagem, clipes_chibi  # noqa: E402
from mathutils import Vector  # noqa: E402

PALETA = {
    'pelo': ('#b47a4a', 0.85),
    'barriga': ('#dcae7c', 0.9),
    'escuro': ('#5b3a24', 0.7),
    'nariz': ('#3b261a', 0.45),
    'boca': ('#3b261a', 0.6),
    'bochecha': ('#f29a8e', 0.9),
    'unha': ('#4a3020', 0.5),
    'folha': ('#62b345', 0.6),
    'nervura': ('#3f8a2c', 0.6),
    'maleta': ('#2f8f7d', 0.55),
    'maleta_faixa': ('#f6e7c8', 0.7),
    'metal': ('#e7c35a', 0.3),
    'olho': ('#1b1410', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}


def construir():
    p = Personagem('capi', PALETA)

    # Pernas curtas e pés com dedinhos.
    for s in (1, -1):
        p.capsula(f'perna_{"esq" if s > 0 else "dir"}', 'pelo', (0.15 * s, 0.02, 0.3), (0.16 * s, 0.0, 0.09), 0.09, 0.095)
        osso = f'perna_{"esq" if s > 0 else "dir"}'
        p.esfera(osso, 'pelo', (0.16 * s, -0.05, 0.055), (0.11, 0.14, 0.065), seg=14, aneis=8)
        for k in (-1, 0, 1):
            p.esfera(osso, 'unha', (0.16 * s + 0.045 * k, -0.18, 0.04), (0.025, 0.022, 0.02), seg=6, aneis=4)

    # Corpo de barril, mais largo embaixo, e a barriga clara.
    def pera(v):
        f = 1.0 + 0.1 * max(0.0, -v.z)
        return (v.x * f, v.y * f, v.z)
    p.esfera('tronco', 'pelo', (0, 0.03, 0.53), (0.34, 0.31, 0.36), deformar=pera, seg=20, aneis=11)
    p.esfera('tronco', 'barriga', (0, -0.15, 0.49), (0.235, 0.16, 0.27), seg=16, aneis=9)

    # Braços e mãos.
    for s in (1, -1):
        osso = f'braco_{"esq" if s > 0 else "dir"}'
        p.capsula(osso, 'pelo', (0.29 * s, 0.0, 0.74), (0.37 * s, -0.04, 0.5), 0.075, 0.08)
        p.esfera(osso, 'pelo', (0.38 * s, -0.05, 0.46), (0.085, 0.08, 0.085), seg=14, aneis=8)
        for k in (-1, 0, 1):
            p.esfera(osso, 'unha', (0.38 * s + 0.035 * k, -0.12, 0.42), (0.018, 0.016, 0.018), seg=6, aneis=4)

    # Cabeça quadradona e comprida, com o focinho alto emendado: o desenho de capivara.
    cab = p.esfera('cabeca', 'pelo', (0, -0.02, 1.13), (0.38, 0.4, 0.34), e1=0.7, e2=0.72, seg=26, aneis=14)
    foc = p.esfera('cabeca', 'pelo', (0, -0.3, 1.06), (0.3, 0.3, 0.26), e1=0.62, e2=0.66, seg=18, aneis=9)
    rosto = [cab, foc]
    # Nariz largo e escuro no alto da ponta do focinho, com as narinas.
    p.no_rosto('cabeca', 'nariz', rosto, 0, 1.15, (0.15, 0.05, 0.065), afunda=0.5, seg=16, aneis=8)
    for s in (1, -1):
        p.no_rosto('cabeca', 'escuro', rosto, 0.07 * s, 1.155, (0.022, 0.02, 0.028), afunda=-0.6, seg=8, aneis=5)
    # Boca em "ㅅ": risquinho do nariz para baixo e dois arcos.
    py = p.superficie(rosto, 0, 1.03)[0].y - 0.006
    p.tubo('cabeca', 'boca', [(0, py, 1.1), (0, py, 1.02)], 0.011, seg=6)
    for s in (1, -1):
        p.tubo('cabeca', 'boca', [(0, py, 1.02), (0.045 * s, py + 0.004, 0.995), (0.09 * s, py + 0.012, 1.005)], 0.011, seg=6)
    for s in (1, -1):
        p.no_rosto('cabeca', 'bochecha', rosto, 0.25 * s, 1.0, (0.07, 0.03, 0.042), afunda=0.6, seg=10, aneis=6)
        # Orelhinhas redondas no alto e para trás, mais escuras.
        p.esfera('cabeca', 'escuro', (0.25 * s, 0.12, 1.44), (0.085, 0.05, 0.08), rot=(0, 25 * s, 0), seg=12, aneis=8)
        p.esfera('cabeca', 'pelo', (0.25 * s, 0.1, 1.43), (0.055, 0.03, 0.05), rot=(0, 25 * s, 0), seg=10, aneis=6)
        # Olhos pequenos e calmos, no alto do rosto.
        p.olho_no_rosto(s, rosto, 0.2 * s, 1.27, (0.062, 0.04, 0.076), afunda=0.15)

    # Folha de chapéu: folha larga dobrada por cima da cabeça, a ponta caindo na testa, com a
    # nervura do meio, as nervuras dos lados e o cabinho para cima atrás.
    def forma_de_folha(v):
        ponta = max(0.0, -v.y) ** 1.6
        base = max(0.0, v.y) ** 3
        return (v.x * (1 - 0.6 * ponta - 0.25 * base), v.y, v.z)

    def dobra(q):
        dx, dy = q.x, q.y - 0.02
        return (q.x, q.y, q.z - 1.25 * (dx * dx + 0.8 * dy * dy) - 0.06 * max(0.0, -dy - 0.2))
    p.esfera('cabeca', 'folha', (0, 0.02, 1.575), (0.4, 0.5, 0.022), rot=(0, 0, 0), seg=24, aneis=8,
             deformar=forma_de_folha, depois=dobra)
    meio = [dobra(Vector((0, y, 1.6))) for y in (0.42, 0.25, 0.05, -0.15, -0.34)]
    p.tubo('cabeca', 'nervura', meio, 0.011, seg=6)
    for y0 in (0.2, -0.02, -0.22):
        for s in (1, -1):
            lado = [dobra(Vector((x * s, y0 - x * 0.45, 1.598))) for x in (0.0, 0.11, 0.21)]
            p.tubo('cabeca', 'nervura', lado, 0.007, seg=5)
    p.tubo('cabeca', 'nervura', [dobra(Vector((0, 0.44, 1.6))), (0, 0.5, 1.53), (0.02, 0.57, 1.62)], 0.016, seg=6)

    # Maleta de cuidar dos bichos, pendurada na mão esquerda.
    p.caixa('braco_esq', 'maleta', (0.45, -0.05, 0.25), (0.13, 0.27, 0.19), rot=(0, 0, 0), bisel=0.035)
    p.esfera('braco_esq', 'metal', (0.45, -0.05, 0.345), (0.07, 0.03, 0.018), seg=10, aneis=6)
    p.toro('braco_esq', 'escuro', (0.45, -0.05, 0.355), 0.06, 0.013, rot=(90, 0, 0), seg=16, rseg=6, arco=0.5)
    # Pata clara desenhada do lado de fora da maleta: um coxim e três dedinhos.
    p.esfera('braco_esq', 'maleta_faixa', (0.516, -0.05, 0.225), (0.012, 0.042, 0.032), seg=10, aneis=6)
    for k, (dy, dz) in enumerate(((-0.045, 0.27), (0.0, 0.285), (0.045, 0.27))):
        p.esfera('braco_esq', 'maleta_faixa', (0.516, -0.05 + dy, dz), (0.01, 0.016, 0.018), seg=8, aneis=5)

    p.esqueleto_chibi(
        quadril=0.32, pescoco=0.82, topo=1.6,
        ombro=(0.29, 0.0, 0.74), mao=(0.38, -0.05, 0.46),
        anca=(0.15, 0.02, 0.3), pe=(0.16, -0.02, 0.04),
    )
    p.finalizar()
    clipes_chibi(p, {'ginga': 4, 'passo': 26, 'abre': 4})
    return p


if __name__ == '__main__':
    construir().exportar()
