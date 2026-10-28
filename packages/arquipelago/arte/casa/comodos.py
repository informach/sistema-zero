"""Móveis dos cômodos novos da casa: cozinha, sala e banheiro (um GLB por cômodo, um móvel por nó).

Contrato do quarto (README de community-kids/scripts/room-blender), com o footprint de cada móvel no
README desta pasta:
- móvel de chão: base em z = 0, centrado em x no footprint (largura × fundo em células) e com a
  frente para -Y. Os de encostar na parede ficam com o fundo em y = +0,35: encostam no rodapé de
  dentro das paredes do kit (que vai até 0,36 do meio da célula) sem atravessar;
- peça de parede: centrada na origem (em x e na altura), com o fundo em y = +0,10.

- `casa-cozinha.glb`: `balcao-pia`, `balcao`, `armario-alto`, `mesa-cozinha`, `cadeira-cozinha`,
  `prateleira-potes` (parede). O fogão a lenha e os utensílios são de arte/itens/cozinha.py.
- `casa-sala.glb`: `sofa`, `poltrona`, `mesinha-centro`, `tapete`, `estante-baixa`, `luminaria-pe`
  (a cúpula por dentro e a lâmpada usam `luz`), `planta`, `quadro` (parede).
- `casa-banheiro.glb`: `banheira`, `pia-banheiro`, `espelho` (parede), `vaso-sanitario`,
  `box-chuveiro`, `tapetinho`, `toalheiro` (parede).
"""
import random

from lib_casa import *
from lib_casa import _objeto, _orientar

lib_q.PALETTE.update({
    # cozinha
    'armario': ('#a6dcc7', 0.75, None, 0),
    'armarioPorta': ('#bfe8d6', 0.75, None, 0),
    'armarioSombra': ('#86c2ab', 0.8, None, 0),
    'tampo': ('#e2b985', 0.7, None, 0),
    'azulejoCozinha': ('#fff6e8', 0.45, None, 0),
    'vidroArmario': ('#d6f1fa', 0.08, None, 0),
    'potes': ('#ffffff', 0.4, None, 0),
    'tampaPote': ('#d8a066', 0.7, None, 0),
    'poteVermelho': ('#ef7a6a', 0.45, None, 0),
    'poteAmarelo': ('#f6c95a', 0.45, None, 0),
    'poteAzul': ('#7fb2e6', 0.45, None, 0),
    'poteVerde': ('#8fd3a8', 0.45, None, 0),
    'cadeira': ('#e9776a', 0.7, None, 0),
    'almofadaAmarela': ('#f6d06a', 0.9, None, 0),
    'manjericao': ('#4fae4c', 0.8, None, 0),
    # sala
    'sofa': ('#f0b44c', 0.9, None, 0),
    'sofaSombra': ('#dc9f3a', 0.9, None, 0),
    'poltrona': ('#5fbfb0', 0.9, None, 0),
    'poltronaSombra': ('#4aa898', 0.9, None, 0),
    'almofadaRosa': ('#f49ac1', 0.9, None, 0),
    'almofadaAzul': ('#7fb2e6', 0.9, None, 0),
    'tapete': ('#b7a6e8', 0.95, None, 0),
    'tapeteBorda': ('#fff1dc', 0.95, None, 0),
    'tapeteFaixa': ('#f49a86', 0.95, None, 0),
    'cupula': ('#f2896b', 0.8, None, 0),
    'cesto': ('#d8b57a', 0.95, None, 0),
    'tela': ('#bfe6ff', 0.85, None, 0),
    'mar': ('#5b9fe0', 0.6, None, 0),
    'morro': ('#6cc46a', 0.85, None, 0),
    'sol': ('#ffd84f', 0.6, None, 0),
    'nuvem': ('#ffffff', 0.85, None, 0),
    'farolPintado': ('#e0584f', 0.7, None, 0),
    # banheiro
    'banheiraFora': ('#ffb3c7', 0.5, None, 0),
    'aguaBanho': ('#9edcf2', 0.15, None, 0),
    'espumaBanho': ('#ffffff', 0.7, None, 0),
    'patinho': ('#ffd84f', 0.45, None, 0),
    'bico': ('#f28a2e', 0.5, None, 0),
    'olho': ('#30343a', 0.4, None, 0),
    'espelho': ('#d4eef8', 0.05, None, 0),
    'molduraEspelho': ('#8fd3c8', 0.6, None, 0),
    'tampaVaso': ('#a8d4f0', 0.5, None, 0),
    'cortina': ('#8fd3c8', 0.9, None, 0),
    'cortinaBarra': ('#fff1dc', 0.9, None, 0),
    'toalha': ('#ff9cc2', 0.95, None, 0),
    'toalhaFaixa': ('#fffaf3', 0.95, None, 0),
    'tapeteBanho': ('#8fd3a8', 0.95, None, 0),
    'tapeteBanhoBorda': ('#fffaf3', 0.95, None, 0),
    'sabonete': ('#ff9cc2', 0.5, None, 0),
    'escova': ('#7fb2e6', 0.5, None, 0),
    'frasco': ('#9b6fd0', 0.45, None, 0),
    'frascoB': ('#f6c95a', 0.45, None, 0),
})
# O vidro do armário deixa ver os pratos (alfa do glTF em BLEND, como o vidro do aquário do quarto).
lib_q.ALPHA.update({'vidroArmario': 0.32})

FUNDO = 0.35   # y do fundo dos móveis de encostar


def recentrar_parede(p):
    """Peça de parede: centra em x e na altura (o fundo continua onde está, em y = +0,10)."""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in p if o.type == 'MESH' for c in o.bound_box]
    cx = (min(q.x for q in pts) + max(q.x for q in pts)) / 2
    cz = (min(q.z for q in pts) + max(q.z for q in pts)) / 2
    lib_ilha.place(p, loc=(-cx, 0, -cz))
    return p


def puxador(x, y, z, larg=0.16):
    """Puxador dourado em barrinha, com dois pés."""
    p = [cyl(0.012, larg, (x, y - 0.035, z), 'macaneta', verts=8, rot=(0, R(90), 0))]
    for s in (-1, 1):
        p.append(cyl(0.009, 0.04, (x + s * (larg / 2 - 0.02), y - 0.015, z), 'macaneta', verts=6, rot=(R(90), 0, 0)))
    return p


def bolinha(x, y, z, r=0.028):
    return [cyl(0.014, 0.03, (x, y - 0.015, z), 'macaneta', verts=8, rot=(R(90), 0, 0)),
            uvball(r, (x, y - 0.035, z), 'macaneta', seg=10, ring=6)]


def tampo_com_furo(x0, x1, y0, y1, z0, z1, furos, m):
    """Tampo com furos retangulares [(cx, cy, w, d)] numa malha só (a grade da parede, deitada)."""
    vaos = [(cx, w, -cy - d / 2, -cy + d / 2) for cx, cy, w, d in furos]
    o = parede_grade(x0, x1, z0, z1, -y1, -y0, vaos, m, m, m, m, tampas=True, fundo=True, nome='tampo')
    o.rotation_euler = (R(90), 0, 0)
    return o


def corpo_armario(x0, x1, y0, y1, z0, z1, m='armario'):
    """Corpo de armário com o rodapé recuado (sombra embaixo)."""
    return [caixa(x0, x1, y0, y1, z0 + 0.08, z1, m, bevel=0.02),
            sem_fundo(caixa(x0 + 0.04, x1 - 0.04, y0 + 0.05, y1 - 0.02, 0.0, 0.1, 'armarioSombra'))]


def porta_armario(x0, x1, z0, z1, y, m='armarioPorta'):
    """Porta (ou frente de gaveta) 1 cm à frente do corpo, com almofada rebaixada desenhada por um
    filete em relevo."""
    p = [caixa(x0, x1, y - 0.03, y + 0.005, z0, z1, m, bevel=0.012, segs=2)]
    if (x1 - x0) > 0.25 and (z1 - z0) > 0.3:
        p.append(caixa(x0 + 0.06, x1 - 0.06, y - 0.042, y - 0.025, z0 + 0.06, z1 - 0.06, 'armario', bevel=0.008))
    return p


# ---------------------------------------------------------------- cozinha
def balcao_pia():
    """2 × 1: balcão com cuba de inox, torneira de bica alta, portas e gavetas. Tampo em 0,92."""
    p = corpo_armario(-0.97, 0.97, -0.33, FUNDO - 0.01, 0.0, 0.86)
    cx, cy = -0.45, -0.02
    t = tampo_com_furo(-1.0, 1.0, -0.38, FUNDO + 0.005, 0.86, 0.92, [(cx, cy, 0.62, 0.44)], 'tampo')
    lib_ilha.bevel_mod(t, 0.008, segs=1, angle=40)
    p.append(t)
    # Cuba com a borda por cima do tampo (o furo fica 1 cm além da parede de fora dela).
    perfil = [(0.24, 0.69), (0.08, 0.69), (0.05, 0.71), (0.05, 0.92), (0.0, 0.92), (0.0, 0.93), (0.01, 0.938),
              (0.05, 0.938), (0.06, 0.93), (0.065, 0.76), (0.08, 0.735), (0.1, 0.725), (0.24, 0.725)]
    p.append(loft_ret([(i, z) for i, z in perfil], 0.7, 0.52, 0.25, 'metal', seg=5, pos=(cx, cy, 0), base=True,
                      topo=True, nome='cuba'))
    p.append(cyl(0.035, 0.012, (cx, cy, 0.727), 'metalEscuro', verts=12))
    # Torneira: base, bica em gancho e as duas manoplas (quente e fria).
    by = 0.25
    p.append(cyl(0.04, 0.05, (cx, by, 0.945), 'metal', verts=12))
    p.append(tube([(cx, by, 0.95), (cx, by, 1.2), (cx, by - 0.04, 1.29), (cx, by - 0.13, 1.3), (cx, by - 0.2, 1.25),
                   (cx, by - 0.21, 1.19)], [0.022, 0.022, 0.022, 0.022, 0.022, 0.024], 'metal', seg=10))
    for s, cor in ((-1, 'red'), (1, 'blue')):
        p.append(cyl(0.022, 0.06, (cx + s * 0.16, by, 0.95), 'metal', verts=10))
        p.append(uvball(0.035, (cx + s * 0.16, by, 0.995), cor, seg=10, ring=6, scale=(1, 1, 0.75)))
    # Barrado de azulejo atrás, apoiado no tampo.
    p.append(caixa(-1.0, 1.0, FUNDO - 0.025, FUNDO, 0.92, 1.06, 'azulejoCozinha', bevel=0.008))
    # Frente: duas portas sob a cuba e três gavetas.
    yf = -0.33
    p += porta_armario(-0.93, -0.465, 0.14, 0.82, yf)
    p += porta_armario(-0.445, 0.02, 0.14, 0.82, yf)
    p += bolinha(-0.53, yf - 0.03, 0.66) + bolinha(-0.38, yf - 0.03, 0.66)
    for z0, z1 in ((0.62, 0.82), (0.38, 0.6), (0.14, 0.36)):
        p += porta_armario(0.04, 0.93, z0, z1, yf)
        p += puxador(0.485, yf - 0.03, (z0 + z1) / 2 + 0.03)
    return p


def balcao():
    """1 × 1: balcão de gavetas que emenda com o da pia (tampo de 1,0 na mesma altura)."""
    p = corpo_armario(-0.48, 0.48, -0.33, FUNDO - 0.01, 0.0, 0.86)
    p.append(caixa(-0.5, 0.5, -0.38, FUNDO + 0.005, 0.86, 0.92, 'tampo', bevel=0.008))
    p.append(caixa(-0.5, 0.5, FUNDO - 0.025, FUNDO, 0.92, 1.06, 'azulejoCozinha', bevel=0.008))
    yf = -0.33
    p += porta_armario(-0.44, 0.44, 0.62, 0.82, yf)
    p += puxador(0, yf - 0.03, 0.75)
    p += porta_armario(-0.44, 0.44, 0.14, 0.6, yf)
    p += bolinha(0.32, yf - 0.03, 0.52)
    # Um potinho de colheres em cima (o resto do tampo fica livre).
    p.append(torneado([(0, 0.92), (0.06, 0.92), (0.065, 0.93), (0.065, 1.05), (0.058, 1.05), (0.058, 0.935),
                       (0, 0.935)], 'poteAzul', seg=16, pos=(0.3, 0.2, 0)))
    for k, a in enumerate((-12, 4, 16)):
        o = cyl(0.008, 0.26, (0, 0, 0), 'madeiraClara', verts=6)
        o.rotation_euler = (R(a * 0.6), R(a), 0)
        o.location = (0.3 + 0.012 * k - 0.012, 0.2, 1.06)
        p.append(o)
        p.append(esfera(0.028, (0.3 + 0.012 * k - 0.012 + math.sin(R(a)) * 0.13, 0.2 - math.sin(R(a * 0.6)) * 0.13,
                                1.06 + 0.125), 'madeiraClara', escala=(1, 0.6, 1.3), seg=8, aneis=6))
    return p


def prato_em_pe(x, y, z, r, m, inclina=10):
    o = cyl(r, 0.022, (0, 0, 0), m, verts=20, smooth_sides=False)
    o.rotation_euler = (R(90 - inclina), 0, 0)
    o.location = (x, y, z + r)
    return o


def armario_alto():
    """1 × 1, altura 2,36: duas portas embaixo e duas de vidro em cima, com louça na prateleira."""
    p = []
    yf = -0.28
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.46, s * 0.43))
        p.append(caixa(x0, x1, yf, FUNDO - 0.01, 0.0, 2.3, 'armario', bevel=0.008))
    # Fundo e rodapé entram 1,5 cm nas laterais (as pontas não ficam no plano das prateleiras).
    p.append(caixa(-0.445, 0.445, FUNDO - 0.04, FUNDO - 0.015, 0.12, 2.27, 'armarioSombra'))
    p.append(sem_fundo(caixa(-0.445, 0.445, yf + 0.04, FUNDO - 0.05, 0.0, 0.1, 'armarioSombra')))
    for z0, z1 in ((0.1, 0.14), (1.24, 1.28), (1.74, 1.77), (2.24, 2.28)):
        p.append(caixa(-0.43, 0.43, yf + 0.02, FUNDO - 0.04, z0, z1, 'armario'))
    p.append(caixa(-0.5, 0.5, yf - 0.05, FUNDO, 2.28, 2.36, 'armarioSombra', bevel=0.02))
    # Portas de baixo.
    for x0, x1, xb in ((-0.43, -0.006, -0.08), (0.006, 0.43, 0.08)):
        p += porta_armario(x0, x1, 0.16, 1.22, yf)
        p += bolinha(xb, yf - 0.03, 1.05)
    # Portas de cima: moldura com vidro.
    for x0, x1, xb in ((-0.43, -0.006, -0.08), (0.006, 0.43, 0.08)):
        fr = parede_grade(x0, x1, yf - 0.03, yf, 1.3, 2.22, [((x0 + x1) / 2, (x1 - x0) - 0.14, 1.37, 2.15)],
                          'armarioPorta', 'armarioPorta', 'armarioPorta', 'armarioPorta', tampas=True, fundo=True,
                          nome='porta-vidro')
        p.append(fr)
        p.append(caixa(x0 + 0.05, x1 - 0.05, yf - 0.018, yf - 0.012, 1.35, 2.17, 'vidroArmario'))
        p += bolinha(xb, yf - 0.03, 1.45)
    # Louça: pratos em pé e tigelas.
    # Pratos um atrás do outro, cada um mais inclinado (planos diferentes).
    for k, (x, y, m) in enumerate(((-0.2, 0.22, 'loucaBranca'), (-0.17, 0.15, 'loucaAzul'), (-0.14, 0.08, 'loucaBranca'))):
        p.append(prato_em_pe(x, y, 1.77, 0.13 - 0.01 * k, m, inclina=8 + 5 * k))
    for x, m in ((0.14, 'loucaVerde'), (0.3, 'loucaBranca')):
        o, _ = tigela(0.075, 0.06, m, pos=(x, 0.05, 1.77))
        p.append(o)
    for x, m in ((-0.25, 'loucaAzul'), (-0.05, 'loucaBranca'), (0.18, 'loucaVerde')):
        p.append(torneado([(0, 1.28), (0.05, 1.28), (0.055, 1.29), (0.06, 1.39), (0.052, 1.39), (0.048, 1.295),
                           (0, 1.295)], m, seg=14, pos=(x, 0.05, 0)))
    return p


def perna_torneada(x, y, h, r=0.035, m='madeira'):
    return torneado([(0, 0), (r * 0.7, 0), (r * 0.8, 0.03), (r * 0.7, h * 0.35), (r * 1.15, h * 0.55),
                     (r * 0.8, h * 0.7), (r, h * 0.92), (r, h), (0, h)], m, seg=10, pos=(x, y, 0))


def mesa_cozinha():
    """2 × 1: mesa de 1,7 × 0,9 com tampo em 0,81 (a altura do nicho da mesa do quarto)."""
    p = [loft_ret([(0.03, 0.76), (0.0, 0.775), (0.0, 0.795), (0.015, 0.81)], 1.7, 0.9, 0.14, 'madeira', seg=4,
                  base=True, topo=True, nome='tampo')]
    for s in (-1, 1):
        p.append(caixa(-0.72, 0.72, s * 0.34 - 0.02, s * 0.34 + 0.02, 0.64, 0.765, 'madeiraEscura', bevel=0.008))
        p.append(caixa(s * 0.72 - 0.02, s * 0.72 + 0.02, -0.32, 0.32, 0.64, 0.765, 'madeiraEscura', bevel=0.008))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(perna_torneada(sx * 0.72, sy * 0.34, 0.77))
    return p


def cadeira_cozinha():
    """1 × 1: cadeira de encosto de ripas com almofada amarela; assento em 0,5."""
    p = [loft_ret([(0.02, 0.44), (0.0, 0.455), (0.0, 0.47), (0.012, 0.48)], 0.5, 0.46, 0.08, 'cadeira', seg=3,
                  base=True, topo=True, nome='assento')]
    p.append(lib_q.cushion((0.44, 0.4, 0.06), (0, -0.02, 0.5), 'almofadaAmarela', puff=0.35, round_=0.4))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(perna_torneada(sx * 0.2, sy * 0.18, 0.45, r=0.028, m='cadeira'))
    # Encosto: dois montantes, três ripas e a travessa de cima arredondada.
    for sx in (-1, 1):
        p.append(cyl(0.024, 0.62, (sx * 0.2, 0.19, 0.47 + 0.31), 'cadeira', verts=10))
        p.append(uvball(0.03, (sx * 0.2, 0.19, 1.1), 'cadeira', seg=10, ring=6))
    for x in (-0.09, 0.0, 0.09):
        p.append(caixa(x - 0.022, x + 0.022, 0.175, 0.205, 0.5, 0.96, 'cadeira', bevel=0.008))
    o = loft_ret([(0, 0), (0, 0.12)], 0.44, 0.05, 0.025, 'cadeira', seg=3, pos=(0, 0.19, 0.94), base=True, topo=True,
                 nome='travessa')
    p.append(o)
    return p


def pote(x, y, z, r, h, m, tampa='tampaPote'):
    """Pote de mantimento: corpo arredondado, etiqueta clara e tampa de madeira com pegador."""
    p = [torneado([(0, 0), (r * 0.85, 0), (r, h * 0.12), (r, h * 0.85), (r * 0.9, h * 0.95), (r * 0.82, h),
                   (0, h)], m, seg=18, pos=(x, y, z))]
    p.append(torneado([(r + 0.004, h * 0.32), (r + 0.006, h * 0.36), (r + 0.006, h * 0.62), (r + 0.004, h * 0.66),
                       (r - 0.01, h * 0.66), (r - 0.01, h * 0.32), (r + 0.004, h * 0.32)], 'papel', seg=18,
                      pos=(x, y, z)))
    p.append(torneado([(0, h - 0.005), (r * 0.9, h - 0.005), (r * 0.92, h + 0.03), (r * 0.6, h + 0.04),
                       (0, h + 0.04)], tampa, seg=18, pos=(x, y, z)))
    p.append(uvball(r * 0.25, (x, y, z + h + 0.05), tampa, seg=10, ring=6, scale=(1, 1, 0.7)))
    return p


def prateleira_potes():
    """Parede, 1,4 de largura: prateleira com mãos-francesas, quatro potes, um vaso de manjericão e
    três canecas penduradas num varão embaixo."""
    p = []
    zt = 0.0
    p.append(caixa(-0.7, 0.7, -0.2, 0.1, zt - 0.04, zt, 'madeiraClara', bevel=0.01))
    for s in (-1, 1):
        o = prism([(0.1, zt - 0.04), (0.1, zt - 0.3), (-0.14, zt - 0.04)], 0.04, (0, 0, 0), 'madeira')
        o.rotation_euler = (0, 0, R(90))
        o.location.x = s * 0.5
        p.append(o)
    for x, r, h, m in ((-0.55, 0.075, 0.24, 'poteVermelho'), (-0.36, 0.065, 0.18, 'poteAmarelo'),
                       (-0.18, 0.08, 0.28, 'poteAzul'), (0.02, 0.06, 0.16, 'poteVerde')):
        p += pote(x, -0.05, zt, r, h, m)
    # Manjericão no vasinho de barro.
    vx = 0.38
    p.append(torneado([(0, 0), (0.07, 0), (0.09, 0.14), (0.1, 0.14), (0.1, 0.16), (0.085, 0.16), (0.08, 0.14),
                       (0, 0.14)], 'barro', seg=16, pos=(vx, -0.05, zt)))
    for k in range(9):
        a = R(40 * k)
        p.append(uvball(0.05, (vx + 0.05 * math.cos(a), -0.05 + 0.05 * math.sin(a), zt + 0.2 + 0.03 * (k % 3)),
                        'manjericao' if k % 2 else 'copaClara', seg=8, ring=5, scale=(1, 0.8, 0.7)))
    p.append(uvball(0.06, (vx, -0.05, zt + 0.27), 'manjericao', seg=8, ring=5, scale=(1, 1, 0.8)))
    # Varão com canecas.
    zv = zt - 0.12
    p.append(cyl(0.012, 0.92, (0, -0.1, zv), 'metal', verts=8, rot=(0, R(90), 0)))
    for s in (-1, 1):
        p.append(cyl(0.01, 0.19, (s * 0.44, -0.0, zv), 'metal', verts=6, rot=(R(90), 0, 0)))
    for x, m in ((-0.3, 'loucaAzul'), (0.0, 'poteVermelho'), (0.3, 'poteAmarelo')):
        p.append(lib_q.torus(0.025, 0.006, (x, -0.1, zv - 0.03), 'metal', seg=10, rseg=4, rot=(R(90), 0, 0)))
        p.append(torneado([(0, zv - 0.24), (0.045, zv - 0.24), (0.05, zv - 0.23), (0.05, zv - 0.11),
                           (0.043, zv - 0.11), (0.043, zv - 0.225), (0, zv - 0.225)], m, seg=16, pos=(x, -0.1, 0)))
        p.append(lib_q.torus(0.03, 0.009, (x, -0.1 - 0.05, zv - 0.17), m, seg=12, rseg=5, rot=(0, R(90), 0)))
    return recentrar_parede(p)


# ---------------------------------------------------------------- sala
def sofa():
    """3 × 1: sofá de 2,8 × 0,85, braços redondos, três almofadas de assento e de encosto e duas
    almofadinhas. Assento em 0,58."""
    p = []
    y0, y1 = -0.5, FUNDO
    yc = (y0 + y1) / 2
    p.append(lib_q.cushion((2.6, y1 - y0 - 0.06, 0.3), (0, yc, 0.27), 'sofaSombra', puff=0.0, round_=0.18))
    for s in (-1, 1):
        p.append(lib_q.cushion((0.28, y1 - y0, 0.6), (s * 1.26, yc, 0.44), 'sofa', puff=0.1, round_=0.42))
    p.append(lib_q.cushion((2.36, 0.24, 0.6), (0, y1 - 0.14, 0.66), 'sofa', puff=0.1, round_=0.35))
    for k in range(3):
        x = -0.75 + 0.75 * k
        p.append(lib_q.cushion((0.74, 0.62, 0.17), (x, y0 + 0.36, 0.5), 'sofa', puff=0.35, round_=0.45))
        o = lib_q.cushion((0.72, 0.18, 0.44), (0, 0, 0), 'sofa', puff=0.35, round_=0.45)
        o.rotation_euler = (R(-12), 0, 0)
        o.location = (x, y1 - 0.28, 0.79)
        p.append(o)
    for s, m in ((-1, 'almofadaRosa'), (1, 'almofadaAzul')):
        o = lib_q.cushion((0.36, 0.12, 0.34), (0, 0, 0), m, puff=0.6, round_=0.5)
        o.rotation_euler = (R(-16), R(s * 8), R(s * 14))
        o.location = (s * 0.98, y1 - 0.4, 0.78)
        p.append(o)
    for sx in (-1, 1):
        for sy in (y0 + 0.08, y1 - 0.08):
            p.append(cyl(0.035, 0.13, (sx * 1.26, sy, 0.065), 'madeiraEscura', verts=10, r2=0.025))
    return p


def poltrona():
    """1 × 1: poltrona fofa de 0,96 × 0,85, combinando com o sofá na forma."""
    p = []
    y0, y1 = -0.5, FUNDO
    yc = (y0 + y1) / 2
    p.append(lib_q.cushion((0.86, y1 - y0 - 0.06, 0.3), (0, yc, 0.27), 'poltronaSombra', puff=0.0, round_=0.2))
    for s in (-1, 1):
        p.append(lib_q.cushion((0.22, y1 - y0, 0.58), (s * 0.37, yc, 0.43), 'poltrona', puff=0.1, round_=0.45))
    p.append(lib_q.cushion((0.62, 0.22, 0.62), (0, y1 - 0.13, 0.68), 'poltrona', puff=0.12, round_=0.4))
    p.append(lib_q.cushion((0.56, 0.6, 0.17), (0, y0 + 0.37, 0.5), 'poltrona', puff=0.35, round_=0.45))
    o = lib_q.cushion((0.34, 0.12, 0.3), (0, 0, 0), 'almofadaAmarela', puff=0.6, round_=0.5)
    o.rotation_euler = (R(-14), 0, R(6))
    o.location = (0, y1 - 0.33, 0.76)
    p.append(o)
    for sx in (-1, 1):
        for sy in (y0 + 0.08, y1 - 0.08):
            p.append(cyl(0.032, 0.13, (sx * 0.38, sy, 0.065), 'madeiraEscura', verts=10, r2=0.024))
    return p


def mesinha_centro():
    """2 × 1: mesinha oval de 1,3 × 0,7, tampo em 0,44, prateleira embaixo com dois livros."""
    p = [loft_ret([(0.025, 0.4), (0.0, 0.415), (0.0, 0.43), (0.012, 0.44)], 1.3, 0.7, 0.35, 'madeira', seg=6,
                  base=True, topo=True, nome='tampo')]
    p.append(loft_ret([(0.0, 0.11), (0.0, 0.135)], 1.0, 0.46, 0.23, 'madeiraClara', seg=6, base=True, topo=True,
                      nome='prateleira'))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl(0.022, 0.41, (sx * 0.44, sy * 0.19, 0.205), 'madeiraEscura', verts=10, r2=0.032))
    for k, (m, rot) in enumerate((('blue', 4), ('red', -9))):
        o = box((0.3, 0.22, 0.04), (0, 0, 0), m, bevel=0.008)
        o.rotation_euler = (0, 0, R(rot))
        o.location = (0.15, 0.0, 0.155 + 0.04 * k)
        p.append(o)
        o = box((0.29, 0.205, 0.032), (0, 0, 0), 'papel', bevel=0.004)
        o.rotation_euler = (0, 0, R(rot))
        o.location = (0.165, 0.0, 0.155 + 0.04 * k)
        p.append(o)
    return p


def tapete():
    """3 × 2: tapete de 2,8 × 1,85 (2,2 cm de altura), com barra creme e faixas coral sobre lilás.
    As faixas são anéis da MESMA malha (vértices divididos): nada fica por cima de nada."""
    perfil = [(0.0, 0.0), (0.0, 0.012), (0.012, 0.022), (0.16, 0.022), (0.22, 0.022), (0.5, 0.022), (0.56, 0.022),
              (0.8, 0.022)]
    mats = ['tapeteBorda', 'tapeteBorda', 'tapeteBorda', 'tapeteFaixa', 'tapete', 'tapeteFaixa', 'tapete']
    return [loft_ret(perfil, 2.8, 1.85, 0.86, mats, seg=6, topo=True, liso=False, nome='tapete')]


def livro(x, y, z, w, h, d, m, inclina=0.0):
    o = box((w, d, h), (0, 0, 0), m, bevel=0.006)
    o.rotation_euler = (0, R(inclina), 0)
    o.location = (x, y, z + h / 2)
    return o


def estante_baixa():
    """2 × 1: estante de 1,8 × 0,42 × 1,0 com seis nichos: livros, um cesto e uma bola; em cima, um
    vasinho e um porta-retrato."""
    p = []
    y0, y1 = -0.2, 0.22
    yf = y0 + 0.01
    p.append(caixa(-0.9, 0.9, y0 - 0.01, y1, 0.96, 1.0, 'madeiraClara', bevel=0.01))
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.9, s * 0.87))
        p.append(caixa(x0, x1, y0, y1, 0.0, 0.97, 'madeiraClara', bevel=0.008))
    for x in (-0.3, 0.3):
        p.append(caixa(x - 0.015, x + 0.015, yf, y1 - 0.02, 0.08, 0.96, 'madeiraClara', bevel=0.005))
    p.append(caixa(-0.87, 0.87, yf, y1 - 0.02, 0.06, 0.09, 'madeiraClara'))
    p.append(caixa(-0.87, 0.87, yf, y1 - 0.02, 0.495, 0.525, 'madeiraClara'))
    p.append(caixa(-0.885, 0.885, y1 - 0.03, y1 - 0.01, 0.07, 0.96, 'madeira'))
    p.append(sem_fundo(caixa(-0.885, 0.885, yf + 0.03, y1 - 0.04, 0.0, 0.07, 'madeira')))
    cores = ['red', 'blue', 'yellow', 'green', 'purple', 'pink', 'teal', 'orange']
    rnd = random.Random(4)
    # Fila de cima: livros nos três nichos (um deitado no do meio).
    for n0, n1, z in ((-0.85, -0.33, 0.525), (0.33, 0.85, 0.525), (-0.85, -0.33, 0.09)):
        x = n0 + 0.03
        k = 0
        while x < n1 - 0.12:
            w = rnd.uniform(0.05, 0.08)
            h = rnd.uniform(0.28, 0.38)
            # Cada livro afunda um pouco diferente na prateleira: os pés não ficam no mesmo plano.
            p.append(livro(x + w / 2, 0.02, z - 0.004 * (k % 3) - 0.004, w, h, 0.26, cores[(k + int(n0 * 10)) % 8]))
            x += w + 0.005
            k += 1
        o = livro(x + 0.08, 0.02, z, 0.06, 0.32, 0.25, cores[k % 8], inclina=-22)
        o.location.x = n1 - 0.12
        p.append(o)
    for k, m in enumerate(('teal', 'orange', 'pink')):
        p.append(livro(0.0, 0.02, 0.52 + 0.05 * k, 0.4 - 0.03 * k, 0.05, 0.28 - 0.02 * k, m))
    # Cesto e bola embaixo.
    p.append(loft_ret([(0.02, 0.09), (0.0, 0.12), (0.0, 0.33), (0.02, 0.34), (0.04, 0.34), (0.04, 0.12)], 0.46,
                      0.3, 0.06, 'cesto', seg=3, pos=(0.0, 0.02, 0), topo=True, base=True, nome='cesto'))
    p.append(esfera(0.13, (0.6, 0.0, 0.22), 'red', seg=16, aneis=10))
    p.append(lib_q.torus(0.13, 0.012, (0.6, 0.0, 0.22), 'white', seg=24, rseg=5, rot=(R(90), 0, R(30))))
    # Em cima: vasinho com planta e porta-retrato.
    p.append(torneado([(0, 1.0), (0.07, 1.0), (0.09, 1.14), (0.06, 1.14), (0.0, 1.14)], 'terracotta', seg=16,
                      pos=(-0.6, 0.0, 0)))
    for k in range(7):
        a = R(52 * k)
        p.append(lib_ilha.leaf((-0.6, 0.0, 1.13), a, 0.2, 0.06, 'folha' if k % 2 else 'folhaEscura', lift=0.12,
                               droop=0.08, fold=0.3))
    o = box((0.26, 0.03, 0.2), (0, 0, 0), 'madeira', bevel=0.008)
    o.rotation_euler = (R(-12), 0, R(-8))
    o.location = (0.5, 0.05, 1.1)
    p.append(o)
    o = box((0.2, 0.01, 0.14), (0, 0, 0), 'tela', bevel=0.0)
    o.rotation_euler = (R(-12), 0, R(-8))
    o.location = (0.5 - 0.002, 0.05 - 0.02, 1.1 + 0.004)
    p.append(o)
    return p


def luminaria_pe():
    """1 × 1: luminária de pé de 1,9 com cúpula coral; a cúpula por dentro e a lâmpada usam `luz`
    (o jogo acende à noite)."""
    p = [torneado([(0, 0), (0.2, 0), (0.22, 0.015), (0.2, 0.05), (0.06, 0.07), (0, 0.07)], 'metalEscuro', seg=24)]
    p.append(cyl(0.022, 1.52, (0, 0, 0.07 + 0.76), 'metalEscuro', verts=10))
    p.append(cyl(0.035, 0.08, (0, 0, 1.58), 'metalEscuro', verts=10))
    cup = torneado([(0.3, 1.5), (0.19, 1.88), (0.18, 1.88), (0.285, 1.5), (0.3, 1.5)], 'cupula', seg=28, liso=False)
    pintar_por(cup, lambda c, n: 'luz' if (n.x * c.x + n.y * c.y) < 0 else None)
    p.append(cup)
    p.append(lib_q.torus(0.295, 0.012, (0, 0, 1.5), 'tapeteBorda', seg=28, rseg=5))
    p.append(lib_q.torus(0.188, 0.01, (0, 0, 1.88), 'tapeteBorda', seg=28, rseg=5))
    p.append(uvball(0.075, (0, 0, 1.68), 'luz', seg=14, ring=8, scale=(1, 1, 1.15)))
    # Cordinha de puxar.
    p.append(cyl(0.004, 0.2, (0.12, 0, 1.5), 'metalEscuro', verts=4))
    p.append(uvball(0.018, (0.12, 0, 1.39), 'macaneta', seg=8, ring=5))
    return p


def planta():
    """1 × 1: costela-de-adão num vaso de barro com faixa, altura 1,35."""
    p = [torneado([(0, 0), (0.15, 0), (0.2, 0.36), (0.24, 0.37), (0.24, 0.43), (0.21, 0.43), (0.205, 0.4),
                   (0, 0.4)], 'terracotta', seg=24)]
    pintar_por(p[0], lambda c, n: 'terra' if n.z > 0.9 and abs(c.z - 0.4) < 0.01 else None)
    p.append(torneado([(0.172, 0.12), (0.18, 0.12), (0.19, 0.2), (0.182, 0.2), (0.172, 0.12)], 'tapeteBorda', seg=24))
    rnd = random.Random(7)
    # Onze folhas em espiral, as de cima menores; todas cabem na célula (raio até 0,47).
    for k in range(11):
        a = R(137.5 * k + rnd.uniform(-8, 8))
        t = k / 10
        h = 0.95 - 0.5 * t + rnd.uniform(-0.04, 0.04)
        rr = 0.08 + 0.1 * t
        b = (0.05 * math.cos(a), 0.05 * math.sin(a), 0.4)
        topo = (rr * math.cos(a), rr * math.sin(a), h + 0.4)
        comp = 0.36 - 0.12 * (1 - t)
        p.append(tube([b, ((b[0] + topo[0]) / 2, (b[1] + topo[1]) / 2, (b[2] + topo[2]) / 2 + 0.05), topo],
                      [0.012, 0.011, 0.01], 'folhaEscura', seg=5))
        p.append(lib_ilha.leaf(topo, a, comp, 0.11 + 0.08 * t + 0.05, 'folha' if k % 2 else 'folhaEscura', lift=0.12,
                               droop=0.22 + 0.1 * t, fold=0.25, teeth=4))
    return p


def quadro():
    """Parede, 1,0 × 0,75: quadro com a ilha, o farol, o sol e o mar em relevo (camadas de 1 cm)."""
    p = [caixa(-0.45, 0.45, 0.06, 0.09, -0.32, 0.32, 'tela')]
    perfil = [(-0.03, 0.035), (0.05, 0.035), (0.065, 0.05), (0.065, 0.1), (-0.03, 0.1)]
    p.append(varrer([(-0.45, -0.32), (0.45, -0.32), (0.45, 0.32), (-0.45, 0.32)], True, perfil, 'madeira'))

    def camada(pts, y0, y1, m):
        return prism(pts, y1 - y0, (0, (y0 + y1) / 2, 0), m)

    mar = [(-0.43, -0.3), (0.43, -0.3), (0.43, -0.1)] + [(0.43 - 0.86 * k / 8, -0.1 + 0.015 * math.sin(k * 1.6))
                                                         for k in range(1, 8)] + [(-0.43, -0.1)]
    p.append(camada(mar, 0.05, 0.06, 'mar'))
    morro = [(-0.36, -0.14)] + [(-0.36 + 0.5 * k / 10, -0.14 + 0.2 * math.sin(math.pi * k / 10)) for k in range(1, 10)] + \
        [(0.14, -0.14)]
    p.append(camada(morro, 0.04, 0.05, 'morro'))
    farol = [(-0.04, -0.02), (0.02, -0.02), (0.01, 0.17), (-0.03, 0.17)]
    p.append(camada(farol, 0.03, 0.04, 'nuvem'))
    for z0, z1 in ((0.02, 0.06), (0.1, 0.14)):
        f0 = -0.04 + 0.01 * (z0 + 0.02) / 0.19
        p.append(camada([(f0 - 0.004, z0), (0.024 - 0.01 * (z0 + 0.02) / 0.19, z0),
                         (0.024 - 0.01 * (z1 + 0.02) / 0.19, z1), (f0 + 0.01 * (z1 - z0) / 0.19 - 0.004, z1)],
                        0.02, 0.03, 'farolPintado'))
    p.append(camada([(-0.05, 0.17), (0.03, 0.17), (-0.01, 0.23)], 0.02, 0.03, 'farolPintado'))
    sol = [(0.27 + 0.09 * math.cos(R(a)), 0.18 + 0.09 * math.sin(R(a))) for a in range(0, 360, 20)]
    p.append(camada(sol, 0.05, 0.06, 'sol'))
    for cx, cz, s in ((-0.25, 0.2, 1.0), (0.05, 0.25, 0.7)):
        nuvem = [(cx + s * 0.1 * math.cos(R(a)) * (1.4 if math.sin(R(a)) < 0 else 1.0),
                  cz + s * 0.045 * math.sin(R(a)) * (0.4 if math.sin(R(a)) < 0 else 1.0)) for a in range(0, 360, 24)]
        p.append(camada(nuvem, 0.05, 0.06, 'nuvem'))
    # O quadro fica 2 cm à frente do prego: o fundo vai até y = +0,10.
    return recentrar_parede(p)


# ---------------------------------------------------------------- banheiro
def patinho(x, y, z, giro=0.0):
    p = [esfera(0.07, (0, 0, 0.045), 'patinho', escala=(1.25, 0.95, 0.75), seg=14, aneis=8)]
    p.append(esfera(0.045, (0.06, 0, 0.12), 'patinho', seg=12, aneis=8))
    p.append(esfera(0.025, (0.105, 0, 0.11), 'bico', escala=(1.2, 1, 0.5), seg=8, aneis=5))
    for s in (-1, 1):
        p.append(esfera(0.009, (0.085, s * 0.03, 0.135), 'olho', seg=6, aneis=4))
    p.append(cone(0.03, 0.05, (-0.09, 0, 0.08), 'patinho', verts=8))
    p[-1].rotation_euler = (0, R(-60), 0)
    lib_ilha.place(p, loc=(x, y, z), rot_z=giro)
    return p


def banheira():
    """2 × 1: banheira de pés dourados, rosa por fora, com água, espuma e um patinho."""
    p = []
    w, d, r = 1.7, 0.8, 0.38
    yc = FUNDO - d / 2
    perfil = [(0.06, 0.13), (0.02, 0.2), (0.0, 0.35), (0.0, 0.56), (0.008, 0.6), (0.03, 0.615), (0.06, 0.61),
              (0.075, 0.58), (0.085, 0.35), (0.12, 0.22), (0.2, 0.19), (0.3, 0.19)]
    mats = ['banheiraFora', 'banheiraFora', 'banheiraFora', 'loucaBranca', 'loucaBranca', 'loucaBranca',
            'loucaBranca', 'loucaBranca', 'loucaBranca', 'loucaBranca', 'loucaBranca']
    p.append(loft_ret(perfil, w, d, r, mats, seg=5, pos=(0, yc, 0), base=True, topo=True, nome='banheira'))
    za = 0.47
    rec = 0.075 + (0.085 - 0.075) * (0.58 - za) / (0.58 - 0.35) - 0.004
    p.append(loft_ret([(rec, za - 0.01), (rec, za)], w, d, r, 'aguaBanho', seg=5, pos=(0, yc, 0), topo=True,
                      nome='agua'))
    rnd = random.Random(2)
    for k in range(14):
        x = -0.55 + rnd.uniform(-0.14, 0.2)
        y = yc + rnd.uniform(-0.2, 0.2)
        rr = rnd.uniform(0.05, 0.09)
        p.append(esfera(rr, (x, y, za + rr * 0.15), 'espumaBanho', escala=(1, 1, 0.7), seg=10, aneis=6))
    p += patinho(0.25, yc - 0.05, za - 0.02, giro=R(200))
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * 0.62, yc + sy * 0.26
            p.append(torneado([(0, 0), (0.05, 0), (0.055, 0.02), (0.035, 0.06), (0.04, 0.12), (0.06, 0.16),
                               (0, 0.18)], 'macaneta', seg=12, pos=(x, y, 0)))
    # Torneira na ponta direita, sobre a borda.
    tx = w / 2 - 0.03
    p.append(cyl(0.03, 0.04, (tx, yc, 0.63), 'macaneta', verts=12))
    p.append(tube([(tx, yc, 0.64), (tx, yc, 0.78), (tx - 0.05, yc, 0.83), (tx - 0.14, yc, 0.8), (tx - 0.16, yc, 0.74)],
                  [0.02] * 5, 'macaneta', seg=10))
    for s in (-1, 1):
        p.append(cyl(0.018, 0.06, (tx, yc + s * 0.12, 0.64), 'macaneta', verts=8))
        p.append(uvball(0.03, (tx, yc + s * 0.12, 0.68), 'red' if s < 0 else 'blue', seg=10, ring=6))
    return p


def pia_banheiro():
    """1 × 1: pia de coluna com cuba oval, torneira dourada, sabonete e copo com escovas. Borda em 0,86."""
    p = []
    yc = FUNDO - 0.24
    p.append(torneado([(0, 0), (0.17, 0), (0.17, 0.03), (0.12, 0.08), (0.09, 0.3), (0.085, 0.62), (0.1, 0.68),
                       (0, 0.68)], 'loucaBranca', seg=20, pos=(0, yc + 0.04, 0)))
    perfil = [(0.1, 0.62), (0.03, 0.68), (0.0, 0.78), (0.0, 0.84), (0.012, 0.86), (0.04, 0.862), (0.055, 0.85),
              (0.07, 0.79), (0.11, 0.74), (0.16, 0.73), (0.2, 0.73)]
    p.append(loft_ret(perfil, 0.62, 0.48, 0.235, 'loucaBranca', seg=5, pos=(0, yc, 0), base=True, topo=True,
                      nome='cuba'))
    p.append(cyl(0.025, 0.01, (0, yc + 0.02, 0.731), 'metal', verts=12))
    # Torneira atrás, sobre a borda.
    ty = yc + 0.205
    p.append(cyl(0.025, 0.04, (0, ty, 0.87), 'macaneta', verts=12))
    p.append(tube([(0, ty, 0.88), (0, ty, 0.97), (0, ty - 0.05, 1.0), (0, ty - 0.12, 0.98)], [0.016] * 4, 'macaneta',
                  seg=10))
    for s in (-1, 1):
        p.append(cyl(0.015, 0.04, (s * 0.1, ty, 0.875), 'macaneta', verts=8))
        p.append(uvball(0.024, (s * 0.1, ty, 0.9), 'red' if s < 0 else 'blue', seg=10, ring=6))
    p.append(box((0.09, 0.055, 0.03), (0.2, yc + 0.05, 0.876), 'sabonete', bevel=0.012, segs=2))
    p.append(torneado([(0, 0.862), (0.032, 0.862), (0.036, 0.96), (0.03, 0.96), (0.028, 0.87), (0, 0.87)], 'poteAzul',
                      seg=14, pos=(-0.2, yc + 0.12, 0)))
    for k, (m, a) in enumerate((('escova', 10), ('almofadaRosa', -12))):
        o = cyl(0.008, 0.2, (0, 0, 0), m, verts=6)
        o.rotation_euler = (0, R(a), 0)
        o.location = (-0.2 + 0.008 * (k * 2 - 1), yc + 0.12, 0.95)
        p.append(o)
        p.append(box((0.016, 0.022, 0.04), (-0.2 + 0.008 * (k * 2 - 1) + math.sin(R(a)) * 0.1, yc + 0.11,
                                             0.95 + 0.09), 'white', bevel=0.004))
    return p


def espelho():
    """Parede, 0,64 × 0,84: espelho oval com moldura verde-água e uma prateleirinha."""
    a, b = 0.27, 0.37
    elipse = [(a * math.cos(R(t)), b * math.sin(R(t))) for t in range(0, 360, 12)]
    perfil = [(-0.025, 0.05), (0.03, 0.045), (0.05, 0.06), (0.05, 0.1), (-0.025, 0.1)]
    p = [varrer(elipse, True, perfil, 'molduraEspelho', nome='moldura')]
    p.append(prism([(x * 1.05, z * 1.04) for x, z in elipse], 0.02, (0, 0.075, 0), 'espelho'))
    # Brilho do espelho: duas faixas claras 1 cm à frente do vidro.
    for dx, larg in ((-0.08, 0.035), (-0.02, 0.018)):
        p.append(prism([(dx - 0.12, -0.05), (dx - 0.12 + larg, -0.05), (dx + 0.06 + larg, 0.18), (dx + 0.06, 0.18)],
                       0.01, (0, 0.06, 0), 'white'))
    p.append(caixa(-0.2, 0.2, -0.02, 0.1, -b - 0.12, -b - 0.09, 'molduraEspelho', bevel=0.01))
    return recentrar_parede(p)


def vaso_sanitario():
    """1 × 1: vaso com caixa acoplada, assento e tampa azul fechada (altura do assento 0,45)."""
    p = []
    yc = -0.08
    perfil = [(0.1, 0.0), (0.09, 0.02), (0.1, 0.12), (0.06, 0.26), (0.012, 0.36), (0.0, 0.4), (0.0, 0.42)]
    p.append(loft_ret(perfil, 0.42, 0.54, 0.21, 'loucaBranca', seg=5, pos=(0, yc, 0), base=True, topo=True,
                      nome='bacia'))
    anel = [(0.0, 0.42), (0.0, 0.43), (0.012, 0.442), (0.1, 0.442), (0.11, 0.43), (0.11, 0.42), (0.0, 0.42)]
    p.append(loft_ret(anel, 0.42, 0.54, 0.21, 'loucaBranca', seg=5, pos=(0, yc, 0), nome='assento'))
    p.append(loft_ret([(0.005, 0.442), (0.0, 0.452), (0.0, 0.462), (0.015, 0.478), (0.06, 0.482)], 0.42, 0.54, 0.21,
                      'tampaVaso', seg=5, pos=(0, yc, 0), topo=True, base=True, nome='tampa'))
    p.append(caixa(-0.2, 0.2, 0.15, 0.33, 0.33, 0.8, 'loucaBranca', bevel=0.05, segs=2))
    p.append(caixa(-0.215, 0.215, 0.135, 0.345, 0.8, 0.85, 'loucaBranca', bevel=0.02, segs=2))
    p.append(cyl(0.035, 0.02, (0, 0.24, 0.855), 'macaneta', verts=14))
    # Pé de ligação entre bacia e caixa.
    p.append(caixa(-0.1, 0.1, 0.1, 0.2, 0.0, 0.4, 'loucaBranca', bevel=0.03))
    return p


def box_chuveiro():
    """1 × 1: box de canto: base com ralo, chuveiro redondo, cortina de bolinhas no varão em L e dois
    frascos. O canto das paredes fica atrás e à direita (+x, +y)."""
    p = []
    L = 0.84
    cx, cy = 0.5 - 0.15 - L / 2, FUNDO - L / 2
    p.append(loft_ret([(0.0, 0.0), (0.0, 0.06), (0.015, 0.075), (0.05, 0.075), (0.06, 0.06), (0.07, 0.045)], L, L,
                      0.08, ['loucaBranca'] * 5, seg=3, pos=(cx, cy, 0), topo=True, nome='base'))
    p.append(cyl(0.05, 0.01, (cx, cy, 0.047), 'metal', verts=14))
    # Cano, registro e chuveiro.
    # O cano corre junto da parede do fundo (face a 0,40 do meio da célula).
    px, py = cx, 0.375
    p.append(cyl(0.018, 1.9, (px, py, 0.07 + 0.95), 'metal', verts=10))
    p.append(cyl(0.05, 0.03, (px, py - 0.02, 1.05), 'metal', verts=14, rot=(R(90), 0, 0)))
    p.append(uvball(0.035, (px, py - 0.05, 1.05), 'blue', seg=10, ring=6))
    p.append(tube([(px, py, 1.95), (px, py - 0.15, 2.0), (px, py - 0.28, 1.98)], [0.016] * 3, 'metal', seg=8))
    p.append(torneado([(0, 1.9), (0.13, 1.9), (0.14, 1.92), (0.05, 1.98), (0, 1.99)], 'metal', seg=20,
                      pos=(px, py - 0.3, 0)))
    p.append(disco(0.11, 1.898, 'metalEscuro', seg=20, pos=(px, py - 0.3, 0)))
    # Varão em L: da parede da direita pela frente e pela esquerda até a parede do fundo.
    zv = 2.05
    x0, x1 = cx - L / 2 + 0.045, 0.38
    y0, y1 = cy - L / 2 + 0.03, 0.38
    p.append(tube([(x1, y0, zv), (x0 + 0.04, y0, zv), (x0, y0 + 0.04, zv), (x0, y1, zv)], [0.015] * 4, 'metal', seg=8))
    # As canoplas do varão encostam na face das paredes (0,40).
    p.append(cyl(0.035, 0.02, (0.39, y0, zv), 'metal', verts=12, rot=(0, R(90), 0)))
    p.append(cyl(0.035, 0.02, (x0, 0.39, zv), 'metal', verts=12, rot=(R(90), 0, 0)))
    # Cortina franzida no lado esquerdo e meio aberta na frente (onda de 0,1).
    caminho = [(x0 + 0.42, y0)] + [(x0 + 0.42 - 0.42 * k / 6, y0) for k in range(1, 7)] + \
        [(x0, y0 + (y1 - y0 - 0.02) * k / 8) for k in range(1, 9)]
    p.append(cortina(caminho, 0.28, zv - 0.06))
    for (x, y) in caminho[::2]:
        p.append(lib_q.torus(0.022, 0.005, (x, y, zv), 'metal', seg=10, rseg=4, rot=(0, R(90), 0)))
    # Frascos no canto da base.
    for k, (m, h) in enumerate((('frasco', 0.2), ('frascoB', 0.15))):
        x, y = cx + L / 2 - 0.12 - 0.11 * k, cy + L / 2 - 0.1
        p.append(torneado([(0, 0.045), (0.04, 0.045), (0.045, 0.06), (0.045, h), (0.03, h + 0.03), (0, h + 0.03)], m,
                          seg=14, pos=(x, y, 0)))
        p.append(cyl(0.022, 0.04, (x, y, h + 0.05), 'white', verts=10))
    return p


def cortina(caminho, z0, z1, amp=0.035, esp=0.012):
    """Cortina franzida: faixa ondulada ao longo do caminho (de cima), da barra (z0) ao varão (z1), com
    a barra clara na mesma malha (vértices divididos)."""
    pts = []
    for k, (x, y) in enumerate(caminho):
        pts.append(Vector((x, y)))
    # Reamostra em passos curtos e põe a onda para os lados.
    linha = []
    for a, b in zip(pts, pts[1:]):
        n = max(2, int((b - a).length / 0.025))
        for i in range(n):
            linha.append(a.lerp(b, i / n))
    linha.append(pts[-1])
    s = 0.0
    onda = []
    for i, q in enumerate(linha):
        if i:
            s += (q - linha[i - 1]).length
        d = (linha[min(i + 1, len(linha) - 1)] - linha[max(i - 1, 0)]).normalized()
        nrm = Vector((-d.y, d.x))
        onda.append((q + nrm * amp * math.sin(s / 0.05 * math.pi), nrm))
    zs = [z0, z0 + 0.12, z1]
    bm = bmesh.new()
    lados = []
    for lado in (-1, 1):
        lados.append([[bm.verts.new((q.x + n.x * lado * esp / 2, q.y + n.y * lado * esp / 2, z)) for z in zs]
                      for q, n in onda])
    nomes = ['cortinaBarra', 'cortina']
    A, B = lados
    for i in range(len(onda) - 1):
        for j in range(len(zs) - 1):
            for L in (A, B):
                f = bm.faces.new((L[i][j], L[i + 1][j], L[i + 1][j + 1], L[i][j + 1]))
                f.material_index = 0 if j == 0 else 1
        f = bm.faces.new((A[i][0], A[i + 1][0], B[i + 1][0], B[i][0]))
        f.material_index = 0
        f = bm.faces.new((A[i][-1], A[i + 1][-1], B[i + 1][-1], B[i][-1]))
        f.material_index = 1
    for i in (0, len(onda) - 1):
        for j in range(len(zs) - 1):
            f = bm.faces.new((A[i][j], A[i][j + 1], B[i][j + 1], B[i][j]))
            f.material_index = 0 if j == 0 else 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _objeto('cortina', bm, nomes)
    for pf in o.data.polygons:
        pf.use_smooth = True
    return o


def tapetinho():
    """1 × 1: tapete oval de banheiro, 0,8 × 0,52, com barra clara."""
    perfil = [(0.0, 0.0), (0.0, 0.012), (0.014, 0.024), (0.06, 0.024), (0.24, 0.024)]
    return [loft_ret(perfil, 0.8, 0.52, 0.26, ['tapeteBanhoBorda', 'tapeteBanhoBorda', 'tapeteBanhoBorda',
                                               'tapeteBanho'], seg=6, topo=True, liso=False, nome='tapetinho')]


def toalheiro():
    """Parede, 0,6 de largura: barra dourada com uma toalha rosa dobrada, de faixas claras."""
    p = []
    yb, zb = 0.0, 0.0
    p.append(cyl(0.015, 0.64, (0, yb, zb), 'macaneta', verts=10, rot=(0, R(90), 0)))
    for s in (-1, 1):
        p.append(cyl(0.012, 0.1, (s * 0.3, 0.05, zb), 'macaneta', verts=8, rot=(R(90), 0, 0)))
        p.append(cyl(0.03, 0.015, (s * 0.3, 0.0925, zb), 'macaneta', verts=12, rot=(R(90), 0, 0)))
        p.append(uvball(0.02, (s * 0.33, yb, zb), 'macaneta', seg=8, ring=5))
    # Toalha: perfil (y, z) dobrado por cima da barra, puxado em x (0,5 de largura).
    rf, e = 0.026, 0.012
    arco_fora = [(yb + (rf + e) * math.cos(R(a)), zb + (rf + e) * math.sin(R(a))) for a in range(0, 181, 20)]
    arco_dentro = [(yb + rf * math.cos(R(a)), zb + rf * math.sin(R(a))) for a in range(180, -1, -20)]
    # Pontos da frente um pouco fora da reta (pontos alinhados dão triângulos de área zero na tampa).
    frente_fora = [(yb - rf - e, zb - 0.05), (yb - rf - e - 0.005, zb - 0.38), (yb - rf - e - 0.0068, zb - 0.41),
                   (yb - rf - e - 0.0072, zb - 0.44), (yb - rf - e - 0.01, zb - 0.47)]
    frente_dentro = [(yb - rf - 0.008, zb - 0.47), (yb - rf, zb - 0.05)]
    pts = [(yb + rf + e + 0.004, zb - 0.36)] + arco_fora + frente_fora + frente_dentro + arco_dentro[1:-1] + \
        [(yb + rf + 0.004, zb - 0.02), (yb + rf + 0.004, zb - 0.36)]
    n = len(pts)
    mats = ['toalha'] * n
    i0 = 1 + len(arco_fora)  # começo da frente de fora
    mats[i0 + 1] = 'toalhaFaixa'
    mats[i0 + 3] = 'toalhaFaixa'
    p.append(extrudar(pts, -0.25, 0.25, mats, tampas=(True, True), nome='toalha'))
    return recentrar_parede(p)


COZINHA = {'balcao-pia': balcao_pia, 'balcao': balcao, 'armario-alto': armario_alto, 'mesa-cozinha': mesa_cozinha,
           'cadeira-cozinha': cadeira_cozinha, 'prateleira-potes': prateleira_potes}
SALA = {'sofa': sofa, 'poltrona': poltrona, 'mesinha-centro': mesinha_centro, 'tapete': tapete,
        'estante-baixa': estante_baixa, 'luminaria-pe': luminaria_pe, 'planta': planta, 'quadro': quadro}
BANHEIRO = {'banheira': banheira, 'pia-banheiro': pia_banheiro, 'espelho': espelho, 'vaso-sanitario': vaso_sanitario,
            'box-chuveiro': box_chuveiro, 'tapetinho': tapetinho, 'toalheiro': toalheiro}

# Footprint (largura × fundo, em células) e se é peça de parede: vai para o relatório e o README.
FOOTPRINT = {
    'balcao-pia': '2 × 1', 'balcao': '1 × 1', 'armario-alto': '1 × 1', 'mesa-cozinha': '2 × 1',
    'cadeira-cozinha': '1 × 1', 'prateleira-potes': 'parede, 1,4 de largura',
    'sofa': '3 × 1', 'poltrona': '1 × 1', 'mesinha-centro': '2 × 1', 'tapete': '3 × 2', 'estante-baixa': '2 × 1',
    'luminaria-pe': '1 × 1', 'planta': '1 × 1', 'quadro': 'parede, 1,0 de largura',
    'banheira': '2 × 1', 'pia-banheiro': '1 × 1', 'espelho': 'parede, 0,64 de largura', 'vaso-sanitario': '1 × 1',
    'box-chuveiro': '1 × 1', 'tapetinho': '1 × 1', 'toalheiro': 'parede, 0,66 de largura',
}


def exportar_comodo(pid, pecas):
    novo()
    nos = {nome: fn() for nome, fn in pecas.items()}
    exportar_casa(pid, nos, grupo='comodos', notas=FOOTPRINT)


def main():
    so = os.environ.get('GLB')
    for pid, pecas in (('casa-cozinha', COZINHA), ('casa-sala', SALA), ('casa-banheiro', BANHEIRO)):
        if so and pid.split('-')[1] not in so:
            continue
        exportar_comodo(pid, pecas)


if __name__ == '__main__':
    main()
