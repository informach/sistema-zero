"""Farol da ilha: o farol listrado (vermelho e branco), UM modelo com a luz animada.

Referencial do projeto do Molda que ele substitui: base no chão (z = 0), torre centrada na origem
e a PORTA virada para a câmera (-Y no Blender, +Z no jogo). O pé do farol mede ~1,8 de lado, como
o atual, porque a caixa do modelo é a área que o personagem toca para abrir a porta.

O desenho segue `farol-listrado-{apagado,aceso}.svg`: base vermelha com tampo laranja, torre
branca afunilada com três faixas vermelhas, lanterna de vidro escuro com caixilhos brancos, telhado
cônico vermelho com bolinha na ponta.

A luz segue a referência da autora (`referencias/farol-aceso.glb`): feixes âmbar transparentes,
fortes junto ao vidro e sumindo na ponta, só com a face de fora. Ela é animada no PRÓPRIO modelo
(decisão de 27/10/2026, no lugar de dois modelos trocados por mostrar/esconder):

- em repouso o farol está APAGADO: lâmpada, vidro aceso e feixes com tamanho ~0 (a caixa do
  modelo, que é a área de toque da porta, não muda);
- `acender` (tocar uma vez): a lâmpada acende, o vidro enche de luz de baixo para cima e os
  feixes crescem; termina aceso e parado (o Jogo 3D segura o último quadro);
- `aceso` (repetindo): os feixes giram em volta da lanterna, a lâmpada pulsa de leve. Começa
  exatamente onde o `acender` termina.
"""
from lib_ilha import *

BASE_H = 0.3          # pedestal
TORRE_H = 3.05        # do pedestal até a galeria
R0, R1 = 0.66, 0.5    # raio da torre embaixo e em cima


def _raio(z):
    t = (z - BASE_H) / TORRE_H
    return R0 + (R1 - R0) * t


def _faixa(z0, z1, m, folga=0.012):
    r0, r1 = _raio(z0) + folga, _raio(z1) + folga
    o = cyl(r0, z1 - z0, (0, 0, (z0 + z1) / 2), m, verts=28, r2=r1)
    return o


def _corpo():
    p = []
    # Pedestal: cilindro vermelho com tampo laranja chanfrado (o "prato" do desenho).
    p.append(cyl(0.86, BASE_H - 0.06, (0, 0, (BASE_H - 0.06) / 2), 'farolVermelho', verts=28, bevel=0.03))
    p.append(cyl(0.88, 0.07, (0, 0, BASE_H - 0.035), 'farolLaranja', verts=28, bevel=0.025))
    # Torre branca afunilada e três faixas vermelhas (a de cima encosta na galeria, como no 2D).
    p.append(cyl(R0, TORRE_H, (0, 0, BASE_H + TORRE_H / 2), 'farolBranco', verts=28, r2=R1))
    topo = BASE_H + TORRE_H
    for z0, z1 in ((1.02, 1.48), (1.92, 2.38), (2.82, BASE_H + TORRE_H)):
        p.append(_faixa(z0, z1, 'farolVermelho'))
    p.append(_faixa(BASE_H, BASE_H + 0.1, 'farolVermelho', folga=0.02))
    # Galeria: piso escuro mais largo, com mãos-francesas embaixo e gradil branco em volta.
    p.append(cyl(0.74, 0.1, (0, 0, topo + 0.05), 'marinho', verts=28, bevel=0.025))
    p.append(cyl(R1 + 0.02, 0.14, (0, 0, topo - 0.06), 'marinho', verts=28, r2=0.68))
    for i in range(12):
        a = 2 * math.pi * i / 12
        p.append(cyl(0.014, 0.24, (0.7 * math.cos(a), 0.7 * math.sin(a), topo + 0.22), 'farolBranco',
                     verts=6, smooth_sides=False))
    p.append(torus(0.7, 0.018, (0, 0, topo + 0.34), 'farolBranco', seg=32, rseg=5))
    p.append(torus(0.7, 0.012, (0, 0, topo + 0.21), 'farolBranco', seg=32, rseg=4))
    # Lanterna: vidro cilíndrico com oito caixilhos brancos, aro de baixo e de cima.
    zl0, zl1 = topo + 0.1, topo + 0.86
    p.append(cyl(0.47, zl1 - zl0, (0, 0, (zl0 + zl1) / 2), 'vidroApagado', verts=32))
    p.append(cyl(0.53, 0.08, (0, 0, zl0 + 0.04), 'farolVermelho', verts=28, bevel=0.02))
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        p.append(box((0.05, 0.05, zl1 - zl0), (0.48 * math.cos(a), 0.48 * math.sin(a), (zl0 + zl1) / 2),
                     'farolBranco', bevel=0.0, rot=(0, 0, a)))
    p.append(torus(0.475, 0.025, (0, 0, (zl0 + zl1) / 2 + 0.1), 'farolBranco', seg=28, rseg=5))
    # A lente escura no centro (aceso, a lâmpada animada cresce por cima dela).
    p.append(cyl(0.12, 0.34, (0, 0, (zl0 + zl1) / 2), 'marinho', verts=16))
    # Telhado: aba marinho, cone vermelho com gomos e bolinha na ponta.
    p.append(cyl(0.6, 0.07, (0, 0, zl1 + 0.035), 'marinho', verts=28, bevel=0.02))
    roof = cyl(0.63, 0.72, (0, 0, zl1 + 0.07 + 0.36), 'farolVermelho', verts=28, r2=0.05)
    p.append(roof)
    for i in range(8):
        a = 2 * math.pi * i / 8
        # Gomos do telhado: frisos finos que descem da ponta até a aba.
        p.append(tube([(0.07 * math.cos(a), 0.07 * math.sin(a), zl1 + 0.78),
                       (0.63 * math.cos(a), 0.63 * math.sin(a), zl1 + 0.08)], [0.016, 0.022], 'farolLaranja', seg=5))
    p.append(cyl(0.04, 0.12, (0, 0, zl1 + 0.86), 'farolVermelho', verts=10))
    p.append(sphere(0.085, (0, 0, zl1 + 0.98), 'farolVermelho', subdiv=2))
    # Porta em arco virada para a câmera, com batente branco, frisos e maçanetas.
    rd = _raio(0.6)
    arco = [(0.2 * math.cos(math.pi * i / 12), 0.42 + 0.2 * math.sin(math.pi * i / 12)) for i in range(13)]
    porta = [(0.2, 0.0)] + arco + [(-0.2, 0.0)]
    batente = [(x * 1.32, z * 1.12) for x, z in porta]
    p.append(prism(batente, 0.08, (0, -rd + 0.02, BASE_H + 0.0), 'farolBranco', bevel=0.012))
    p.append(prism(porta, 0.1, (0, -rd - 0.005, BASE_H + 0.0), 'ardosia', bevel=0.012))
    p.append(box((0.014, 0.02, 0.56), (0, -rd - 0.06, BASE_H + 0.29), 'marinho', bevel=0.004))
    for s in (-1, 1):
        p.append(sphere(0.026, (s * 0.06, -rd - 0.07, BASE_H + 0.32), 'ouro', subdiv=1))
    return p, zl0, zl1


QUASE_ZERO = 1e-4


def farol_listrado():
    reset()
    corpo, zl0, zl1 = _corpo()
    zc = (zl0 + zl1) / 2
    farol = join(corpo, 'Farol')
    # Feixes: dois troncos de cone abertos saindo do centro da lanterna, um para cada lado.
    m_feixe = mat_gradiente('feixeGradiente', '#ffb01f', [0.8, 0.66, 0.42, 0.18, 0.0],
                            emissao='#ffa915', forca=0.7)
    lados = [tubo_aberto(0.11, 0.85, 3.1, m_feixe, seg=28, anel=8, sentido=s) for s in (1, -1)]
    feixe = join(lados, 'Feixe')
    feixe.location = (0, 0, zc)
    # Vidro aceso: um anel de luz por fora do vidro escuro, mais forte embaixo.
    m_vidro = mat_gradiente('vidroLuz', '#ffbf3a', [0.95, 0.85, 0.7], emissao='#ffb52a', forca=1.2)
    vidro = tubo_aberto(0.488, 0.488, zl1 - zl0, m_vidro, seg=32, anel=3, eixo='Z')
    vidro.name = 'VidroAceso'
    vidro.location = (0, 0, zl0)
    lamp = sphere(0.2, (0, 0, 0), 'lampada', subdiv=2)
    lamp.name = 'Lampada'
    lamp.location = (0, 0, zc)
    z, um = (QUASE_ZERO,) * 3, (1.0, 1.0, 1.0)
    clipes({
        # 30 quadros a 24 por segundo = 1,25 s.
        'acender': {
            lamp: {'scale': [(0, z), (6, (1.3,) * 3), (10, um), (30, um)]},
            vidro: {'scale': [(0, (1, 1, QUASE_ZERO)), (4, (1, 1, QUASE_ZERO)), (14, um), (30, um)]},
            feixe: {'scale': [(0, z), (10, z), (24, (1.06,) * 3), (30, um)],
                    'rotation_euler': [(0, (0, 0, R(-40))), (30, (0, 0, 0))]},
        },
        # 6 s por volta, em laço: começa onde o acender terminou.
        'aceso': {
            lamp: {'scale': [(0, um), (72, (1.08,) * 3), (144, um)], '_linear': True},
            # Respiro leve no vidro e no feixe. Além do efeito, garante que os canais de escala
            # existam neste clipe: o exportador descarta canal constante, e sem eles o three.js
            # devolveria a escala de repouso (~0) ao trocar do acender para o aceso.
            vidro: {'scale': [(0, um), (72, (1.0, 1.0, 1.015)), (144, um)], '_linear': True},
            feixe: {'scale': [(0, um), (36, (1.0, 1.04, 1.04)), (72, um), (108, (1.0, 1.04, 1.04)), (144, um)],
                    'rotation_euler': [(0, (0, 0, 0)), (144, (0, 0, 2 * math.pi))], '_linear': True},
        },
    })
    # Repouso = apagado. Nenhuma faixa do NLA age fora do próprio trecho.
    for o in (lamp, feixe):
        o.scale = z
    vidro.scale = (1, 1, QUASE_ZERO)
    feixe.rotation_euler = (0, 0, 0)
    for o in (lamp, vidro, feixe):
        for t in o.animation_data.nla_tracks:
            for st in t.strips:
                st.extrapolation = 'NOTHING'
    bpy.context.scene.frame_current = -50
    exportar_animado('farol-listrado', [farol, feixe, vidro, lamp],
                     {'Feixe': z, 'Lampada': z, 'VidroAceso': (1, QUASE_ZERO, 1)})


def exportar_animado(pid, objs, repouso):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    path = os.path.join(lib_q.OUT, f'{pid}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_anim_slide_to_zero=True,
                              export_force_sampling=True, export_optimize_animation_size=False)
    repouso_no_glb(path, repouso)
    tris = sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
    print('EXPORTADO', pid, tris, 'triângulos', os.path.getsize(path) // 1024, 'KB')


TODOS = ['farol-listrado']
