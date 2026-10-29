"""Bichos do Recife Coral: três peixes (palhaço, cirurgião-azul e baiacu) e a tartaruguinha.

São bichos de enfeite, pequenos e leves (~1 mil triângulos), que nadam em volta do recife. A
origem fica no meio do corpo (eles boiam: o jogo põe na água e move). Clipes: `nadar` e `parado`.

  /tmp/claude-0/blender-venv/bin/python arte/bichos/recife.py               # os quatro
  /tmp/claude-0/blender-venv/bin/python arte/bichos/recife.py peixe-palhaco
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_bichos import Bicho, clipes_peixe, sen  # noqa: E402
from mathutils import Vector  # noqa: E402
import bpy  # noqa: E402

COMUM = {
    'olho': ('#151216', 0.1),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#ff9fae', 0.9),
    'boca': ('#3b261a', 0.6),
}
# Rotação que deixa uma `placa` em pé no plano YZ (barbatana): x do contorno vai para trás (+Y) e
# y do contorno para cima.
EM_PE = (90, 0, 90)


def olho_lateral(p, alvo, y, z, raios, lado):
    """Olho no lado do corpo (peixe e tartaruga olham de lado): acha a superfície vindo de fora em
    x e vira o olho para a normal."""
    ponto, normal = p.superficie(alvo, y, z, de=(lado, 0, 0))
    rot = Vector((0, -1, 0)).rotation_difference(normal).to_euler()
    rot = tuple(math.degrees(a) for a in rot)
    return p.olho(lado, ponto - normal * raios[1] * 0.25, raios, rot=rot, seg=12, aneis=7)


def boca_de_peixe(p, alvo, z):
    y = p.superficie(alvo, 0, z)[0].y - 0.002
    p.tubo('cabeca', 'boca', [(-0.012, y + 0.004, z + 0.002), (0, y, z - 0.004), (0.012, y + 0.004, z + 0.002)],
           0.0035, seg=5)


# --------------------------------------------------------------------- peixe-palhaço
def peixe_palhaco(pid):
    p = Bicho(pid, {**COMUM, 'corpo': ('#f57a22', 0.55), 'faixa': ('#fbf8f2', 0.6), 'borda': ('#2a1d1a', 0.6),
                     'barbatana': ('#f99a3f', 0.55)}, alvo=1300)
    rx, ry, rz = 0.055, 0.12, 0.068

    def gota(v):
        # Mais gordinho na frente, afinando para a cauda.
        f = 1.0 - 0.32 * max(0.0, v.y)
        return (v.x * f, v.y, v.z * f)
    corpo = p.esfera('corpo', 'corpo', (0, 0, 0), (rx, ry, rz), deformar=gota, seg=16, aneis=10)
    for y0, w, osso in ((-0.055, 0.016, 'cabeca'), (0.01, 0.02, 'corpo'), (0.075, 0.012, 'cauda')):
        for m, folga, larg in (('borda', 0.002, w + 0.006), ('faixa', 0.004, w)):
            p.casca(osso, m, m, (0, 0, 0), (rx, ry, rz), deformar=gota, folga=folga, espessura=0.002, seg=16,
                    aneis=10, cortes=[((0, y0 + larg, 0), (0, 1, 0)), ((0, y0 - larg, 0), (0, -1, 0))])
    rosto = [corpo]
    for lado in (1, -1):
        olho_lateral(p, rosto, -0.075, 0.018, (0.02, 0.012, 0.022), lado)
        p.esfera('nadadeira_esq' if lado > 0 else 'nadadeira_dir', 'barbatana', (0.06 * lado, -0.01, -0.02),
                 (0.03, 0.022, 0.012), rot=(0, 30 * lado, 20 * lado), seg=10, aneis=6)
    boca_de_peixe(p, rosto, -0.008)
    p.no_rosto('cabeca', 'bochecha', rosto, 0.04, -0.02, (0.012, 0.006, 0.008), afunda=0.5, seg=8, aneis=5)
    p.no_rosto('cabeca', 'bochecha', rosto, -0.04, -0.02, (0.012, 0.006, 0.008), afunda=0.5, seg=8, aneis=5)
    # Barbatana de cima, a de baixo e a cauda redonda, com a beirada escura.
    p.placa('corpo', 'barbatana', [(-0.04, 0.0), (0.0, 0.035), (0.05, 0.04), (0.08, 0.0)], 0.008,
            centro=(0, -0.01, rz * 0.82), rot=EM_PE, bisel=0.002)
    p.placa('corpo', 'barbatana', [(0.0, 0.0), (0.03, -0.03), (0.06, 0.0)], 0.008, centro=(0, 0.02, -rz * 0.75),
            rot=EM_PE, bisel=0.002)
    cauda = [(0.0, 0.0), (0.04, 0.045), (0.065, 0.03), (0.07, 0.0), (0.065, -0.03), (0.04, -0.045)]
    p.placa('cauda', 'barbatana', cauda, 0.008, centro=(0, ry * 0.82, 0), rot=EM_PE, bisel=0.002)
    p.esqueleto_peixe(0.24, (0.05, -0.01, -0.02))
    p.finalizar()
    clipes_peixe(p)
    return p


# --------------------------------------------------------------------- cirurgião-azul
def peixe_cirurgiao(pid):
    p = Bicho(pid, {**COMUM, 'corpo': ('#2f6fe0', 0.45), 'escuro': ('#1b1d3d', 0.5), 'amarelo': ('#ffd23a', 0.5),
                     'barbatana': ('#2a5fc4', 0.5)}, alvo=1300)
    rx, ry, rz = 0.04, 0.13, 0.095

    def oval(v):
        f = 1.0 - 0.25 * max(0.0, v.y)
        return (v.x * f, v.y, v.z * f)
    corpo = p.esfera('corpo', 'corpo', (0, 0, 0), (rx, ry, rz), deformar=oval, seg=16, aneis=10)
    # A mancha escura em forma de paleta do cirurgião: um laço que sai de trás do olho, contorna um
    # oval azul no meio do corpo e afina até a cauda. Fitas coladas no corpo, de borda lisa (antes,
    # quatro cortes retos davam um triângulo).
    fita_no_corpo(p, 'corpo', 'escuro', (rx, ry, rz), oval, _laco_da_paleta(), 0.3, fechada=True)
    fita_no_corpo(p, 'corpo', 'escuro', (rx, ry, rz), oval, [(0.5 + 0.4 * t, 0.2 - 0.18 * t) for t in
                                                           (i / 8 for i in range(9))], (0.26, 0.08))
    rosto = [corpo]
    for lado in (1, -1):
        olho_lateral(p, rosto, -0.085, 0.02, (0.02, 0.012, 0.022), lado)
        p.esfera('nadadeira_esq' if lado > 0 else 'nadadeira_dir', 'amarelo', (0.045 * lado, -0.02, -0.02),
                 (0.028, 0.02, 0.01), rot=(0, 30 * lado, 20 * lado), seg=10, aneis=6)
    boca_de_peixe(p, rosto, -0.01)
    p.placa('corpo', 'barbatana', [(-0.08, 0.0), (-0.04, 0.03), (0.06, 0.03), (0.1, 0.0)], 0.007,
            centro=(0, 0.0, rz * 0.85), rot=EM_PE, bisel=0.002)
    p.placa('corpo', 'barbatana', [(-0.02, 0.0), (0.06, -0.028), (0.09, 0.0)], 0.007, centro=(0, 0.0, -rz * 0.85),
            rot=EM_PE, bisel=0.002)
    cauda = [(0.0, 0.0), (0.035, 0.05), (0.07, 0.06), (0.05, 0.0), (0.07, -0.06), (0.035, -0.05)]
    p.placa('cauda', 'amarelo', cauda, 0.008, centro=(0, ry * 0.85, 0), rot=EM_PE, bisel=0.002)
    p.esqueleto_peixe(0.26, (0.035, -0.02, -0.02))
    p.finalizar()
    clipes_peixe(p)
    return p


def _laco_da_paleta(n=28):
    """O laço da paleta no lado do peixe, em (comprimento, altura) da elipse do corpo (de -1 a 1):
    em volta do oval azul, do olho até onde começa a faixa da cauda."""
    return [(0.1 + 0.44 * math.cos(2 * math.pi * i / n), 0.2 + 0.3 * math.sin(2 * math.pi * i / n))
            for i in range(n)]


def fita_no_corpo(p, osso, m, raios, deformar, pontos, largura, fechada=False, folga=0.0025,
                  espessura=0.0015):
    """Uma fita colada nos dois lados de um corpo elipsoide (`raios` e o mesmo `deformar` da
    esfera), seguindo `pontos` em (comprimento, altura) da elipse, de -1 a 1. `largura` é na
    mesma medida da altura (um número, ou o começo e o fim); a borda fica lisa, sem os degraus
    de recortar a malha do corpo."""
    import bmesh
    rx, ry, rz = raios
    n = len(pontos)
    l0, l1 = largura if isinstance(largura, tuple) else (largura, largura)

    def no_corpo(u, w, lado):
        # A esfera unitária deformada e escalada, achada ao contrário pelo (comprimento, altura).
        y = max(-0.98, min(0.98, u))
        f = deformar(Vector((1.0, y, 1.0)))[0]
        z = max(-0.98, min(0.98, w / f))
        x = math.sqrt(max(0.0, 1 - y * y - z * z))
        q = Vector(deformar(Vector((x * lado, y, z))))
        pt = Vector((q.x * rx, q.y * ry, q.z * rz))
        normal = Vector((pt.x / rx ** 2, pt.y / ry ** 2, pt.z / rz ** 2)).normalized()
        return pt + normal * folga

    bm = bmesh.new()
    for lado in (1, -1):
        linhas = []
        for i, (u, w) in enumerate(pontos):
            a = pontos[(i - 1) % n] if fechada or i > 0 else pontos[i]
            b = pontos[(i + 1) % n] if fechada or i < n - 1 else pontos[i]
            tu, tw = (b[0] - a[0]) * ry, (b[1] - a[1]) * rz
            c = math.hypot(tu, tw) or 1.0
            nu, nw = -tw / c / ry, tu / c / rz
            h = (l0 + (l1 - l0) * (i / max(1, n - 1))) / 2 * rz
            linhas.append((bm.verts.new(no_corpo(u + nu * h, w + nw * h, lado)),
                           bm.verts.new(no_corpo(u - nu * h, w - nw * h, lado))))
        for i in range(n if fechada else n - 1):
            a, b = linhas[i], linhas[(i + 1) % n]
            f = bm.faces.new((a[0], b[0], b[1], a[1]))
            f.normal_update()
            if f.normal.x * lado < 0:
                f.normal_flip()
    o = p._objeto(bm, osso, m)
    mod = o.modifiers.new('espessura', 'SOLIDIFY')
    mod.thickness = espessura
    mod.offset = -1.0
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return o


# --------------------------------------------------------------------- baiacu
def baiacu(pid):
    p = Bicho(pid, {**COMUM, 'corpo': ('#f6cf52', 0.6), 'barriga': ('#fff4cf', 0.7), 'pinta': ('#a6713a', 0.7),
                     'espinho': ('#e3a93a', 0.6), 'barbatana': ('#f2b33c', 0.55)}, alvo=1300)
    r = 0.085
    corpo = p.esfera('corpo', 'corpo', (0, 0, 0), (r, r * 1.05, r * 0.95), seg=18, aneis=10)
    p.casca('corpo', 'barriga', 'barriga', (0, 0, 0), (r, r * 1.05, r * 0.95), folga=0.002, espessura=0.002,
            manter=lambda q: q.z < -0.03, seg=18, aneis=10)
    # Pintinhas marrons nas costas e espinhos macios em volta.
    for k in range(9):
        a = k * 2.4
        u = 0.25 + 0.6 * ((k * 0.37) % 1.0)
        d = Vector((math.cos(a) * math.sin(u * math.pi * 0.5), math.sin(a) * math.sin(u * math.pi * 0.5) + 0.1,
                    math.cos(u * math.pi * 0.5))).normalized()
        if d.y < -0.55:
            continue
        p.esfera('corpo', 'pinta', tuple(d * (r * 0.99)), (0.011, 0.011, 0.004),
                 rot=tuple(math.degrees(x) for x in Vector((0, 0, 1)).rotation_difference(d).to_euler()), seg=8,
                 aneis=4)
    for k in range(14):
        a = k * 2.399
        zz = -0.8 + 1.6 * (k + 0.5) / 14
        d = Vector((math.cos(a) * math.sqrt(1 - zz * zz), math.sin(a) * math.sqrt(1 - zz * zz), zz))
        if d.y < -0.6:
            continue
        base = d * r * 0.95
        p.torno('corpo', 'espinho', [(0.008, 0.0), (0.0, 0.022)], de=tuple(base), ate=tuple(base + d), seg=5)
    rosto = [corpo]
    for lado in (1, -1):
        olho_lateral(p, rosto, -0.045, 0.03, (0.024, 0.014, 0.026), lado)
        p.esfera('nadadeira_esq' if lado > 0 else 'nadadeira_dir', 'barbatana', (0.08 * lado, 0.0, -0.01),
                 (0.025, 0.018, 0.01), rot=(0, 30 * lado, 20 * lado), seg=10, aneis=6)
    y = p.superficie(rosto, 0, -0.005)[0].y
    p.toro('cabeca', 'boca', (0, y + 0.002, -0.005), 0.012, 0.004, rot=(90, 0, 0), seg=10, rseg=5)
    for s in (1, -1):
        p.no_rosto('cabeca', 'bochecha', rosto, 0.05 * s, -0.012, (0.014, 0.006, 0.009), afunda=0.5, seg=8, aneis=5)
    cauda = [(0.0, 0.0), (0.03, 0.03), (0.045, 0.0), (0.03, -0.03)]
    p.placa('cauda', 'barbatana', cauda, 0.008, centro=(0, r * 0.98, 0), rot=EM_PE, bisel=0.002)
    p.esqueleto_peixe(0.2, (0.075, 0.0, -0.01))
    p.finalizar()
    clipes_peixe(p, {'cauda': 32, 'corpo': 3})
    return p


# --------------------------------------------------------------------- tartaruguinha
def tartaruguinha(pid):
    p = Bicho(pid, {**COMUM, 'casco': ('#4fa86a', 0.6), 'placa': ('#3a8754', 0.6), 'borda': ('#e7d28a', 0.7),
                     'pele': ('#9fd18a', 0.75), 'barriga': ('#f1e3a6', 0.8)}, alvo=1800)
    # Casco em domo achatado com a borda clara e as placas desenhadas.
    def domo(v):
        return (v.x, v.y, v.z * (1.0 if v.z > 0 else 0.35))
    p.esfera('corpo', 'casco', (0, 0.01, 0.0), (0.11, 0.13, 0.06), deformar=domo, seg=18, aneis=10)
    p.toro('corpo', 'borda', (0, 0.01, -0.002), 0.115, 0.012, escala=(1, 1.15, 1), seg=22, rseg=5)
    for (x, y) in ((0, -0.04), (0, 0.03), (0, 0.095), (0.06, -0.01), (-0.06, -0.01), (0.06, 0.06), (-0.06, 0.06)):
        topo = 0.06 * math.sqrt(max(0.05, 1 - (x / 0.11) ** 2 - ((y - 0.01) / 0.13) ** 2))
        p.esfera('corpo', 'placa', (x, y, topo - 0.004), (0.028, 0.03, 0.008), seg=8, aneis=4)
    p.esfera('corpo', 'barriga', (0, 0.01, -0.012), (0.09, 0.11, 0.022), seg=14, aneis=6)
    cab = p.esfera('cabeca', 'pele', (0, -0.16, 0.012), (0.05, 0.055, 0.045), seg=14, aneis=8)
    p.capsula('cabeca', 'pele', (0, -0.1, 0.0), (0, -0.14, 0.008), 0.03, 0.035, seg=8)
    rosto = [cab]
    for lado in (1, -1):
        p.olho_no_rosto(lado, rosto, 0.025 * lado, 0.025, (0.016, 0.01, 0.019), afunda=0.15, seg=12, aneis=7)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.035 * lado, 0.0, (0.011, 0.005, 0.007), afunda=0.5, seg=8, aneis=5)
    y = p.superficie(rosto, 0, 0.0)[0].y
    p.tubo('cabeca', 'boca', [(-0.012, y + 0.004, 0.002), (0, y, -0.003), (0.012, y + 0.004, 0.002)], 0.003, seg=5)
    # Nadadeiras: as da frente compridas, as de trás curtas.
    for s, lado in ((1, 'e'), (-1, 'd')):
        p.esfera(f'pata_f{lado}', 'pele', (0.13 * s, -0.07, -0.005), (0.07, 0.03, 0.01), rot=(0, 0, -25 * s), seg=10,
                 aneis=6)
        p.esfera(f'pata_t{lado}', 'pele', (0.09 * s, 0.11, -0.008), (0.035, 0.025, 0.009), rot=(0, 0, 30 * s), seg=8,
                 aneis=5)
    p.torno('cauda', 'pele', [(0.012, 0.0), (0.0, 0.03)], de=(0, 0.14, -0.005), ate=(0, 1, -0.005), seg=6)
    esp = lambda q: (-q[0], q[1], q[2])  # noqa: E731
    p.esqueleto([
        ('raiz', (0, 0, 0), (0, 0, 0.05), None),
        ('corpo', (0, 0.1, 0), (0, -0.08, 0), 'raiz'),
        ('cabeca', (0, -0.1, 0.0), (0, -0.2, 0.01), 'corpo'),
        ('pata_fe', (0.07, -0.06, 0.0), (0.2, -0.09, 0.0), 'corpo'),
        ('pata_fd', esp((0.07, -0.06, 0.0)), (-0.2, -0.09, 0.0), 'corpo'),
        ('pata_te', (0.07, 0.1, 0.0), (0.12, 0.13, 0.0), 'corpo'),
        ('pata_td', esp((0.07, 0.1, 0.0)), (-0.12, 0.13, 0.0), 'corpo'),
        ('cauda', (0, 0.13, 0.0), (0, 0.17, 0.0), 'corpo'),
    ])
    p.finalizar()

    def nadar(t):
        # As nadadeiras da frente batem juntas, como asas (o jeito da tartaruga marinha).
        b = 32 * sen(t)
        return {
            'corpo': {'loc': (0, 0, 0.012 * sen(t, 1, 0.3)), 'rot': [('X', 3 * sen(t, 1, 0.3))]},
            'cabeca': {'rot': [('X', -4 * sen(t, 1, 0.4)), ('Z', 4 * sen(t, 1, 0.2))]},
            'pata_fe': {'rot': [('Y', -b), ('Z', 14 * sen(t, 1, 0.25))]},
            'pata_fd': {'rot': [('Y', b), ('Z', -14 * sen(t, 1, 0.25))]},
            'pata_te': {'rot': [('Z', 18 * sen(t, 1, 0.5))]},
            'pata_td': {'rot': [('Z', -18 * sen(t, 1, 0.5))]},
            'cauda': {'rot': [('Z', 10 * sen(t, 2))]},
        }

    def parado(t):
        return {
            'corpo': {'loc': (0, 0, 0.01 * sen(t))},
            'cabeca': {'rot': [('Z', 14 * sen(t, 1, 0.2)), ('X', -3 * sen(t, 2))]},
            'pata_fe': {'rot': [('Y', -8 * sen(t)), ('Z', 6 * sen(t, 1, 0.25))]},
            'pata_fd': {'rot': [('Y', 8 * sen(t)), ('Z', -6 * sen(t, 1, 0.25))]},
            'pata_te': {'rot': [('Z', 8 * sen(t, 1, 0.5))]},
            'pata_td': {'rot': [('Z', -8 * sen(t, 1, 0.5))]},
        }
    p.clipe('nadar', 36, nadar)
    p.clipe('parado', 48, parado)
    return p


BICHOS = {
    'peixe-palhaco': peixe_palhaco,
    'peixe-cirurgiao': peixe_cirurgiao,
    'baiacu': baiacu,
    'tartaruguinha': tartaruguinha,
}

if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        BICHOS[pid](pid).exportar()
