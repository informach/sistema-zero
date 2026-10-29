"""Maré, a tartaruga-marinha cartógrafa do Recife Coral.

Cabeça redonda com o bico sorridente e as manchinhas, casco nas costas com as placas e a beirada
clara, o peito amarelo em gomos e nadadeiras no lugar dos braços. De cartógrafa: óculos redondos
dourados, a bússola no pescoço e o mapa enrolado com fita vermelha na nadadeira esquerda.

  /tmp/claude-0/blender-venv/bin/python arte/personagens/mare.py   # grava src/assets/personagens/mare.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_personagens import Personagem, clipes_chibi, orientar  # noqa: E402
from mathutils import Vector  # noqa: E402

PALETA = {
    'pele': ('#7fcaa6', 0.8),
    'mancha': ('#5ea886', 0.8),
    'peito': ('#f3e3a2', 0.85),
    'gomo': ('#d9c27a', 0.8),
    'casco': ('#8b6b3e', 0.65),
    'placa': ('#a9864f', 0.6),
    'casco_borda': ('#e9d08c', 0.7),
    'boca': ('#2f4a3e', 0.6),
    'bochecha': ('#f6a39a', 0.9),
    'ouro': ('#e8b93f', 0.3),
    'mapa': ('#f6e7c4', 0.85),
    'mapa_ponta': ('#e2cc9c', 0.85),
    'fita': ('#e2484a', 0.6),
    'agulha': ('#e2484a', 0.5),
    'mostrador': ('#fffaf0', 0.5),
    'olho': ('#1b1410', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}

CORPO = ((0, 0.02, 0.53), (0.33, 0.29, 0.35))


def construir():
    p = Personagem('mare', PALETA)
    centro, raios = CORPO

    # Pernas curtas com pés de remo achatados.
    for s in (1, -1):
        osso = f'perna_{"esq" if s > 0 else "dir"}'
        p.capsula(osso, 'pele', (0.15 * s, 0.03, 0.3), (0.16 * s, 0.0, 0.09), 0.085, 0.085)
        p.esfera(osso, 'pele', (0.17 * s, -0.06, 0.045), (0.11, 0.16, 0.05), rot=(0, 0, -12 * s), seg=14, aneis=8)
        p.esfera(osso, 'mancha', (0.17 * s, -0.08, 0.085), (0.04, 0.05, 0.012), seg=6, aneis=3)

    # Corpo, peito amarelo em gomos e o casco nas costas.
    p.esfera('tronco', 'pele', centro, raios, seg=20, aneis=11)
    peito = p.casca('tronco', 'peito', 'gomo', centro, raios, espessura=0.02, folga=0.012, seg=22, aneis=12,
            cortes=[((0, -0.08, 0), (0, 1, 0)), ((0, 0, 0.8), (0, 0, 1)), ((0, 0, 0.22), (0, 0, -1))])
    for z in (0.36, 0.5, 0.64):
        largura = 0.22 * math.sqrt(max(0.0, 1 - ((z - 0.53) / 0.36) ** 2))
        pts = [p.superficie(peito, x, z)[0] for x in (-largura, -largura / 2, 0, largura / 2, largura)]
        p.tubo('tronco', 'gomo', [tuple(q + Vector((0, -0.004, 0))) for q in pts], 0.008, seg=5)
    linha = [p.superficie(peito, 0, z)[0] for z in (0.28, 0.45, 0.62, 0.76)]
    p.tubo('tronco', 'gomo', [tuple(q + Vector((0, -0.004, 0))) for q in linha], 0.008, seg=5)

    casco_c, casco_r = (0, 0.1, 0.56), (0.38, 0.32, 0.42)
    casco = p.casca('tronco', 'casco', 'casco_borda', casco_c, casco_r, espessura=0.05, folga=0.0,
                    seg=26, aneis=14, cortes=[((0, 0.12, 0), (0, -1, 0))])
    # Placas do casco: hexágonos claros encostados por trás.
    for x, z, t in ((0, 0.74, 0.12), (0, 0.55, 0.13), (0, 0.36, 0.11),
                    (0.2, 0.66, 0.1), (-0.2, 0.66, 0.1), (0.2, 0.44, 0.1), (-0.2, 0.44, 0.1)):
        ponto, normal = _atras(p, casco, x, z)
        rot = Vector((0, -1, 0)).rotation_difference(normal).to_euler()
        p.esfera('tronco', 'placa', ponto + normal * 0.002, (t, 0.018, t * 0.95),
                 rot=tuple(math.degrees(a) for a in rot), seg=6, aneis=4)

    # Nadadeiras no lugar dos braços: largas no meio, achatadas de frente.
    for s in (1, -1):
        osso = f'braco_{"esq" if s > 0 else "dir"}'
        ombro, ponta = (0.27 * s, -0.02, 0.74), (0.43 * s, -0.06, 0.4)
        meio = tuple((a + b) / 2 for a, b in zip(ombro, ponta))
        rot = orientar(ombro, ponta)

        def nadadeira(v):
            f = 1 - 0.45 * max(0.0, v.z) ** 2
            return (v.x * f * (1 + 0.25 * max(0.0, -v.z)), v.y, v.z)
        p.esfera(osso, 'pele', meio, (0.1, 0.04, 0.2), rot=rot, seg=16, aneis=10, deformar=nadadeira)
        p.esfera(osso, 'mancha', tuple(m + d for m, d in zip(meio, (0.0, -0.035, 0.03))), (0.035, 0.01, 0.045),
                 rot=rot, seg=6, aneis=3)

    # Cabeça redonda, focinho com bico sorridente, narinas e manchas.
    cab = p.esfera('cabeca', 'pele', (0, -0.04, 1.12), (0.37, 0.37, 0.33), seg=22, aneis=12)
    foc = p.esfera('cabeca', 'pele', (0, -0.27, 1.03), (0.24, 0.17, 0.17), seg=18, aneis=9)
    rosto = [cab, foc]
    py = p.superficie(rosto, 0, 0.99)[0].y - 0.004
    p.tubo('cabeca', 'boca', [(-0.13, py + 0.05, 1.01), (-0.06, py + 0.012, 0.985), (0, py, 0.98),
                              (0.06, py + 0.012, 0.985), (0.13, py + 0.05, 1.01)], 0.011, seg=6)
    for s in (1, -1):
        p.no_rosto('cabeca', 'boca', rosto, 0.05 * s, 1.09, (0.016, 0.012, 0.012), afunda=0.2, seg=6, aneis=4)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.24 * s, 1.0, (0.06, 0.03, 0.038), afunda=0.6, seg=10, aneis=6)
    for x, z, t in ((0.28, 1.28, 0.05), (-0.3, 1.24, 0.04), (0.12, 1.4, 0.045), (-0.14, 1.42, 0.035),
                    (0.33, 1.1, 0.03), (-0.34, 1.08, 0.035), (0.0, 1.44, 0.04)):
        p.no_rosto('cabeca', 'mancha', cab, x, z, (t, 0.012, t * 0.85), afunda=0.5, seg=6, aneis=4)

    # Olhos grandes e os óculos redondos dourados por cima.
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.17 * s, 1.21, (0.07, 0.042, 0.082), afunda=0.2)
        ponto, normal = p.superficie(rosto, 0.17 * s, 1.21)
        rot = Vector((0, 0, 1)).rotation_difference(normal).to_euler()
        p.toro('cabeca', 'ouro', ponto + normal * 0.03, 0.11, 0.013, rot=tuple(math.degrees(a) for a in rot),
               seg=22, rseg=6)
        # Haste até a orelha.
        p.tubo('cabeca', 'ouro', [tuple(ponto + normal * 0.03 + Vector((0.1 * s, 0.0, 0.0))),
                                  (0.35 * s, -0.12, 1.22), (0.37 * s, 0.05, 1.2)], 0.01, seg=5)
    ponte = [tuple(p.superficie(rosto, x, 1.24)[0] + Vector((0, -0.03, 0))) for x in (-0.06, 0, 0.06)]
    p.tubo('cabeca', 'ouro', ponte, 0.01, seg=5)

    # Bússola no pescoço: cordão, mostrador e a agulha vermelha.
    p.toro('tronco', 'ouro', (0, 0.0, 0.83), 0.2, 0.008, rot=(10, 0, 0), seg=20, rseg=4)
    bus = p.superficie(peito, 0, 0.7)[0] + Vector((0, -0.03, 0))
    p.torno('tronco', 'ouro', [(0, -0.012), (0.06, -0.012), (0.065, 0.0), (0.06, 0.014), (0, 0.014)],
            centro=tuple(bus), rot=(90 - 15, 0, 0), seg=16)
    p.torno('tronco', 'mostrador', [(0, 0.0), (0.048, 0.0), (0.048, 0.004), (0, 0.004)],
            centro=tuple(bus + Vector((0, -0.012, 0.003))), rot=(90 - 15, 0, 0), seg=16)
    p.esfera('tronco', 'agulha', tuple(bus + Vector((0, -0.018, 0.018))), (0.008, 0.004, 0.028), rot=(-15, 0, 0),
             seg=6, aneis=4)

    # Mapa enrolado com fita vermelha na nadadeira esquerda.
    a, b = Vector((0.4, -0.2, 0.32)), Vector((0.47, 0.12, 0.6))
    p.torno('braco_esq', 'mapa', [(0, 0), (0.05, 0), (0.055, 0.01), (0.055, (b - a).length - 0.01),
                                  (0.05, (b - a).length), (0, (b - a).length)], de=tuple(a), ate=tuple(b), seg=14)
    for t in (0.0, 1.0):
        c = a + (b - a) * t
        p.toro('braco_esq', 'mapa_ponta', tuple(c), 0.03, 0.006,
               rot=tuple(math.degrees(x) for x in Vector((0, 0, 1)).rotation_difference(b - a).to_euler()),
               seg=12, rseg=4)
    meio = a + (b - a) * 0.5
    p.toro('braco_esq', 'fita', tuple(meio), 0.058, 0.012,
           rot=tuple(math.degrees(x) for x in Vector((0, 0, 1)).rotation_difference(b - a).to_euler()),
           seg=16, rseg=5)
    for s in (1, -1):
        p.esfera('braco_esq', 'fita', tuple(meio + Vector((0.03 * s, -0.05, 0.0))), (0.03, 0.012, 0.02),
                 rot=(0, 0, 30 * s), seg=8, aneis=5)

    p.esqueleto_chibi(
        quadril=0.32, pescoco=0.82, topo=1.6,
        ombro=(0.27, -0.02, 0.74), mao=(0.43, -0.06, 0.4),
        anca=(0.15, 0.03, 0.3), pe=(0.16, -0.02, 0.04),
    )
    p.finalizar()
    clipes_chibi(p, {'ginga': 8, 'passo': 18, 'braco': 26, 'abre': 6, 'asa': True})
    return p


def _atras(p, casco, x, z):
    """Ponto do casco visto de trás (o raio vem de +Y)."""
    origem = Vector((x, 5, z))
    ok, ponto, normal, _ = casco.ray_cast(origem, Vector((0, -1, 0)))
    if not ok:
        raise ValueError(f'mare: casco sem ponto em x={x} z={z}')
    return ponto, normal


if __name__ == '__main__':
    construir().exportar()
