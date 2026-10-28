"""Kit de movimento: cipó, equipamento de mergulho, planador e patins (`src/assets/movimento/`).

- `cipo`: nó `cipo` com o pivô no alto (onde ele se prende no galho) e o clipe `balancar`
  (2 s, em laço). O vazio `pegada` (filho do `cipo`) marca onde a mão segura e acompanha o
  balanço; o vazio `topo` marca o ponto de prender no galho.
- `mergulho`: máscara com snorkel e os dois pés de pato, já na posição em que ficam no corpo do
  avatar (origem nos pés dele). Nós `mascara`, `pe-de-pato-esq` e `pe-de-pato-dir`; vazios
  `cabeca`, `pe-esq` e `pe-dir` no lugar dos ossos `mixamorig:Head`, `LeftFoot` e `RightFoot`.
- `planador`: asa-delta infantil. Nós `planador` (estrutura e barra), `asa-esq` e `asa-dir`;
  vazio `pegada` no meio da barra (filho do `planador`); clipe `planar` (2 s, em laço: a estrutura
  sobe e desce e as asas flexionam).
- `patins`: um par, vestido como o mergulho. Nós `patim-esq` e `patim-dir`; vazios `pe-esq` e
  `pe-dir`. As rodinhas ficam abaixo do pé: o jogo sobe o avatar 0,085 quando ele calça.
"""
from lib_festas import *

# O avatar do jogo tem 1,6 de altura: 0,751 da altura do Armature.glb (2,13).
AV = 0.751
CABECA = (0.0, 0.0, 1.347 * AV)  # mixamorig:Head
PE = {'esq': (0.206 * AV, 0.0, 0.085 * AV), 'dir': (-0.232 * AV, 0.0, 0.085 * AV)}  # LeftFoot / RightFoot


def cipo():
    L = 2.4
    p = []
    pts = [(0.03 * math.sin(k * 1.3), 0.025 * math.cos(k * 0.9), L - L * k / 12 * 0.9) for k in range(13)]
    p.append(tube(pts, [0.036 - 0.004 * k / 12 for k in range(13)], 'cipo', seg=8))
    # Cipó fino enrolado em espiral no grosso.
    esp = []
    for k in range(40):
        t = k / 39
        z = L - t * L * 0.88
        a = t * math.pi * 9
        esp.append((pts[0][0] + 0.04 * math.cos(a), pts[0][1] + 0.04 * math.sin(a), z))
    p.append(tube(esp, [0.012] * len(esp), 'cipoEscuro', seg=5))
    for k, (z, yaw) in enumerate(((2.1, 0.4), (1.7, 2.6), (1.35, 4.4), (0.95, 1.2), (2.3, 3.6))):
        p.append(leaf((0.0, 0.0, z), yaw, 0.2, 0.07, 'folhaCipo', lift=0.04, droop=0.12, n=6))
    # Nó e o pau de segurar.
    zb = L - L * 0.9
    p.append(lib_q.torus(0.06, 0.03, (0, 0, zb), 'cipo', seg=12, rseg=6, rot=(R(90), 0, 0)))
    p.append(cyl(0.032, 0.44, (0, 0, zb - 0.07), 'pegadaCipo', verts=10, rot=(0, R(90), 0), bevel=0.01))
    for s in (-1, 1):
        p.append(cyl(0.036, 0.04, (s * 0.2, 0, zb - 0.07), 'cipoEscuro', verts=10, rot=(0, R(90), 0)))
    balancar = {'cipo': {'rotation_euler': [(0, (0, 0, 0)), (12, (R(22), 0, 0)), (24, (0, 0, 0)),
                                            (36, (R(-22), 0, 0)), (48, (0, 0, 0))]}}
    return {'nos': {'cipo': (p, (0, 0, L))}, 'vazios': {'pegada': (0, 0, zb - 0.07), 'topo': (0, 0, L)},
            'pais': {'pegada': 'cipo'}, 'clipes': {'balancar': balancar}, 'grupo': 'movimento', 'pasta': 'movimento'}


def mergulho():
    # Máscara: armação arredondada na frente dos olhos, vidro, alça em volta da cabeça e snorkel.
    zc, yf = 1.25, -0.335
    m = [superellipsoid((0.46, 0.09, 0.2), (0, yf, zc), 'mascaraBorracha', e1=0.35, e2=0.35, seg=18, ring=8)]
    m.append(superellipsoid((0.38, 0.03, 0.14), (0, yf - 0.035, zc + 0.005), 'mascaraVidro', e1=0.3, e2=0.3,
                            seg=16, ring=6))
    m.append(box((0.05, 0.05, 0.05), (0, yf - 0.04, zc - 0.075), 'mascaraBorracha', bevel=0.015, segs=1))
    alca = lib_q.torus(1.0, 0.022, (0, -0.01, zc + 0.02), 'mascaraBorracha', seg=28, rseg=6)
    alca.scale = (0.385, 0.335, 1)
    m.append(alca)
    sn = [(-0.08, yf - 0.06, 1.1), (-0.25, yf - 0.02, 1.13), (-0.37, -0.2, 1.24), (-0.39, -0.08, 1.48),
          (-0.36, -0.02, 1.7)]
    m.append(tube(sn, [0.022] * len(sn), 'snorkel', seg=8))
    m.append(cyl(0.032, 0.06, (-0.36, -0.02, 1.73), 'pePato', verts=10))
    m.append(box((0.08, 0.04, 0.04), (-0.07, yf - 0.07, 1.1), 'mascaraBorracha', bevel=0.012, segs=1))
    nos = {'mascara': (m, CABECA)}
    vazios = {'cabeca': CABECA}
    for lado, s in (('esq', 1), ('dir', -1)):
        x = PE[lado][0]
        pe = [superellipsoid((0.21, 0.29, 0.13), (x, -0.02, 0.07), 'pePato', e1=0.45, e2=0.5, seg=14, ring=8)]
        pe.append(box((0.22, 0.05, 0.03), (x, 0.1, 0.12), 'pePatoEscuro', bevel=0.012, segs=1))
        # Lâmina larga para a frente, um pouco curvada para cima na ponta.
        lam = malha('lamina', [(x - 0.09, -0.12, 0.012), (x + 0.09, -0.12, 0.012), (x + 0.16, -0.56, 0.05),
                               (x - 0.16, -0.56, 0.05), (x, -0.5, 0.035)],
                    [(0, 1, 2, 4), (0, 4, 3)], 'pePato', liso=False)
        sol = lam.modifiers.new('esp', 'SOLIDIFY')
        sol.thickness = 0.018
        lib_q._apply(lam, sol)
        pe.append(lam)
        for k in (-1, 0, 1):
            pe.append(tube([(x + k * 0.06, -0.16, 0.03), (x + k * 0.11, -0.52, 0.065)], [0.012, 0.009],
                           'pePatoEscuro', seg=5))
        nos[f'pe-de-pato-{lado}'] = (pe, PE[lado])
        vazios[f'pe-{lado}'] = PE[lado]
    return {'nos': nos, 'vazios': vazios, 'centrar': False, 'grupo': 'movimento', 'pasta': 'movimento'}


def _metade_asa(s):
    """Uma metade da vela (s = 1 esquerda, -1 direita), em listras de três cores."""
    nariz, ponta, cauda = Vector((0, -0.85, 2.05)), Vector((s * 1.3, 0.35, 1.97)), Vector((0, 0.5, 2.02))
    nu, nv = 6, 4
    verts, faces = [], []
    for i in range(nu + 1):
        u = i / nu
        borda = nariz.lerp(ponta, u)
        tras = cauda.lerp(ponta, u)
        for j in range(nv + 1):
            v = j / nv
            q = borda.lerp(tras, v)
            q.z += 0.06 * math.sin(math.pi * v) * (1 - u) + 0.04 * math.sin(math.pi * u)  # barriga da vela
            verts.append(tuple(q))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            faces.append((a, a + nv + 1, a + nv + 2, a + 1) if s > 0 else (a, a + 1, a + nv + 2, a + nv + 1))
    o = malha('vela', verts, faces, 'velaPlanador')
    sol = o.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.012
    lib_q._apply(o, sol)
    pintar_por(o, lambda c, n: ['velaPlanador', 'velaPlanador2', 'velaPlanador3'][int(abs(c.x) / 0.44) % 3])
    tubo = tube([tuple(nariz), tuple(ponta)], [0.022, 0.018], 'tuboPlanador', seg=6)
    return [o, tubo]


def planador():
    est = [tube([(0, -0.88, 2.05), (0, 0.55, 2.02)], [0.024, 0.02], 'tuboPlanador', seg=8)]
    est.append(tube([(-0.62, -0.12, 2.0), (0.62, -0.12, 2.0)], [0.018, 0.018], 'tuboPlanador', seg=6))
    # Triângulo de controle (o "A"): dois tubos descendo e a barra de segurar.
    topo, bar = (0, -0.1, 2.0), 1.22
    for s in (-1, 1):
        est.append(tube([topo, (s * 0.38, -0.32, bar)], [0.018, 0.018], 'tuboPlanador', seg=6))
        est.append(cyl(0.028, 0.1, (s * 0.22, -0.32, bar), 'mascaraBorracha', verts=10, rot=(0, R(90), 0)))
    est.append(tube([(-0.4, -0.32, bar), (0.4, -0.32, bar)], [0.02, 0.02], 'tuboPlanador', seg=8))
    est.append(cone(0.05, 0.12, (0, -0.94, 2.05), 'velaPlanador', verts=10, rot=(R(90), 0, 0), smooth_it=True))
    est.append(box((0.1, 0.18, 0.02), (0, 0.6, 2.06), 'velaPlanador2', bevel=0.008, segs=1))
    nos = {'planador': (est, (0, -0.1, 2.0))}
    for lado, s in (('esq', 1), ('dir', -1)):
        nos[f'asa-{lado}'] = (_metade_asa(s), (0, -0.1, 2.02))
    sobe = [(0, (0, 0, 0)), (24, (0, 0, 0.05)), (48, (0, 0, 0))]
    planar = {'planador': {'location': sobe, 'rotation_euler': [(0, (0, 0, 0)), (24, (R(2), 0, 0)), (48, (0, 0, 0))]}}
    for lado, s in (('esq', 1), ('dir', -1)):
        planar[f'asa-{lado}'] = {'location': sobe, 'rotation_euler': [(0, (0, 0, 0)), (12, (0, s * R(-4), 0)),
                                                                       (24, (0, 0, 0)), (36, (0, s * R(3), 0)),
                                                                       (48, (0, 0, 0))]}
    return {'nos': nos, 'vazios': {'pegada': (0, -0.32, bar)}, 'pais': {'pegada': 'planador'},
            'clipes': {'planar': planar}, 'grupo': 'movimento', 'pasta': 'movimento'}


def patins():
    nos, vazios = {}, {}
    for lado in ('esq', 'dir'):
        x = PE[lado][0]
        p = [superellipsoid((0.2, 0.32, 0.17), (x, -0.02, 0.085), 'patim', e1=0.5, e2=0.55, seg=14, ring=8)]
        p.append(cyl(0.1, 0.11, (x, 0.04, 0.21), 'patim', verts=16))
        p.append(lib_q.torus(0.1, 0.022, (x, 0.04, 0.27), 'patimClaro', seg=16, rseg=6))
        p.append(superellipsoid((0.17, 0.12, 0.1), (x, -0.13, 0.07), 'patimClaro', e1=0.5, e2=0.5, seg=12, ring=6))
        for k in range(3):
            p.append(box((0.12, 0.012, 0.012), (x, -0.06 + k * 0.045, 0.17 + k * 0.012), 'cadarco', bevel=0.004,
                         segs=1, rot=(R(-30), 0, 0)))
        p.append(box((0.16, 0.34, 0.025), (x, -0.02, -0.005), 'metalEscuro', bevel=0.008, segs=1))
        for y in (-0.12, 0.1):
            for s in (-1, 1):
                p.append(cyl(0.04, 0.035, (x + s * 0.06, y, -0.045), 'roda', verts=14, rot=(0, R(90), 0), bevel=0.006))
        p.append(cyl(0.03, 0.04, (x, -0.2, -0.04), 'cascoVermelho', verts=10, rot=(R(70), 0, 0), bevel=0.006))
        nos[f'patim-{lado}'] = (p, PE[lado])
        vazios[f'pe-{lado}'] = PE[lado]
    return {'nos': nos, 'vazios': vazios, 'centrar': False, 'grupo': 'movimento', 'pasta': 'movimento'}


PECAS = [('cipo', cipo), ('mergulho', mergulho), ('planador', planador), ('patins', patins)]

if __name__ == '__main__':
    rodar(PECAS)
