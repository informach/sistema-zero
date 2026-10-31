"""Cenas de conferência: monta as peças do kit e os móveis como o modo construir faria, grava a cena num
GLB temporário (para o `faces-coplanares.ts` sem `--separados` conferir as emendas entre vizinhas) e
renderiza prévias em Cycles. Nada daqui vai para o jogo.

  python -B cenas.py kit [cozinha sala banheiro moveis andar cafe-festas]      # as cenas pedidas

Variáveis: DIR_PREVIAS (pasta das imagens e dos GLBs temporários; padrão: `arte-casa` no diretório
temporário), RES (padrão 560), AMOSTRAS (padrão 28),
SO_GLB=1 (só monta e grava o GLB, sem renderizar).
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
CASA = os.path.join(AQUI, '..', '..', 'src', 'assets', 'casa')
env = os.environ.get
SAIDA = env('DIR_PREVIAS') or os.path.join(__import__('tempfile').gettempdir(), 'arte-casa')


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


class Cena:
    """Importa os GLBs da casa uma vez e põe cópias dos nós com posição e giro (em graus, em z)."""

    def __init__(self, arquivos):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.fonte = {}
        for arq in arquivos:
            antes = set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=arq if os.path.isabs(arq) else os.path.join(CASA, arq))
            for o in set(bpy.data.objects) - antes:
                if o.parent is None:
                    self.fonte[o.name.split('.')[0]] = o
        self.col = bpy.data.collections.new('cena')
        bpy.context.scene.collection.children.link(self.col)
        for o in self.fonte.values():
            for c in [o] + list(o.children_recursive):
                for uc in list(c.users_collection):
                    uc.objects.unlink(c)
        bpy.context.view_layer.update()

    def por(self, nome, x, y, z=0.0, giro=0.0, extra=None):
        src = self.fonte[nome]
        m = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(giro), 4, 'Z')
        if extra is not None:
            m = m @ extra
        novos = {}
        for c in [src] + list(src.children_recursive):
            n = c.copy()
            n.animation_data_clear()
            self.col.objects.link(n)
            novos[c] = n
        for c, n in novos.items():
            if c.parent in novos:
                n.parent = novos[c.parent]
        novos[src].matrix_world = m @ src.matrix_world
        return novos[src]

    def corrida(self, eixo, fixo, inicio, pecas, dentro):
        """Parede ao longo de um eixo ('x' ou 'y'), na linha `fixo`, a partir de `inicio`, com
        [(nó, células)]. `dentro` é o lado de dentro (+1 ou -1 no outro eixo): o verso (+Y local)
        das peças fica virado para ele."""
        pos = inicio
        if eixo == 'x':
            giro = 0 if dentro > 0 else 180
        else:
            giro = -90 if dentro > 0 else 90
        out = []
        for nome, larg in pecas:
            c = pos + larg / 2
            x, y = (c, fixo) if eixo == 'x' else (fixo, c)
            out.append((nome, x, y, giro))
            self.por(nome, x, y, 0, giro)
            pos += larg
        return out

    def piso(self, nome, x0, y0, w, d):
        for i in range(w):
            for j in range(d):
                self.por(nome, x0 + i + 0.5, y0 + j + 0.5)

    def telhado(self, x0, y0, w, d, h=4.0, vigia=True):
        """Telhado de duas águas sobre o retângulo (cumeeira ao longo de x). `d` par ou ímpar."""
        meia = d / 2
        inteiras = int(meia)
        sobra = meia - inteiras > 0.25
        for lado, y_beira, giro in ((1, y0, 0), (-1, y0 + d, 180)):
            for i in range(w):
                x = x0 + i + 0.5
                fim = 'esq' if i == 0 else 'dir' if i == w - 1 else None
                if giro == 180 and fim:
                    fim = 'dir' if fim == 'esq' else 'esq'
                self.por('beiral', x, y_beira, h, giro)
                if fim:
                    self.por(f'testeira-beiral-{fim}', x, y_beira, h, giro)
                for k in range(inteiras):
                    yy = y_beira + lado * k
                    self.por('agua', x, yy, h + 0.5 * k, giro)
                    if fim:
                        self.por(f'testeira-{fim}', x, yy, h + 0.5 * k, giro)
                if sobra:
                    yy = y_beira + lado * inteiras
                    self.por('agua-meia', x, yy, h + 0.5 * inteiras, giro)
                    if fim:
                        self.por(f'testeira-meia-{fim}', x, yy, h + 0.5 * inteiras, giro)
        hc = h + 0.5 * meia
        for i in range(w):
            self.por('cumeeira', x0 + i + 0.5, y0 + meia, hc)
        self.por('cumeeira-ponta', x0 + 0.5, y0 + meia, hc)
        self.por('cumeeira-ponta', x0 + w - 0.5, y0 + meia, hc, 180)
        # Oitões nas duas pontas: coluna c (a partir da beira) com c faixas e um triângulo.
        for xg, giro in ((x0, -90), (x0 + w, 90)):
            # giro -90: x local aponta para -y do mundo; +90: para +y.
            for lado in (1, -1):
                cols = [(k, 1.0) for k in range(inteiras)] + ([(inteiras, 0.5)] if sobra else [])
                for c, larg in cols:
                    centro = (y0 + c + larg / 2) if lado > 0 else (y0 + d - c - larg / 2)
                    sufixo = '-meia' if larg < 0.75 else ''
                    for r in range(c):
                        self.por(f'oitao-faixa{sufixo}', xg, centro, h + 0.5 * r, giro)
                    # O cume fica para dentro (+lado em y): no giro -90 o +x local é -y.
                    alto_em_mais_x = (lado < 0) if giro == -90 else (lado > 0)
                    self.por(f'oitao{sufixo}-{"dir" if alto_em_mais_x else "esq"}', xg, centro, h + 0.5 * c, giro)
            if vigia:
                self.por('vigia', xg, y0 + meia, h + max(0.5 * meia - 0.55, 0.35), giro)

    def gravar_glb(self, caminho):
        bpy.ops.object.select_all(action='DESELECT')
        for o in self.col.objects:
            o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=caminho, export_format='GLB', use_selection=True, export_apply=True,
                                  export_yup=True, export_texcoords=False, export_animations=False)


def pintar(nome_material, cor):
    m = bpy.data.materials.get(nome_material)
    if m and m.node_tree:
        b = m.node_tree.nodes.get('Principled BSDF')
        if b:
            b.inputs['Base Color'].default_value = (*srgb(cor), 1)


def dia():
    """De dia o jogo deixa os vidros apagados: a prévia também (no GLB a força fica 1)."""
    for nome in ('vidroJanela', 'luz'):
        m = bpy.data.materials.get(nome)
        if m and m.node_tree:
            b = m.node_tree.nodes.get('Principled BSDF')
            if b:
                b.inputs['Emission Strength'].default_value = 0.08


def renderizar(saida, alvo, direcao, escala, chao='#8cc46a', res=None, perspectiva=False, dist=30):
    sc = bpy.context.scene
    if chao:
        bpy.ops.mesh.primitive_plane_add(size=80, location=(alvo[0], alvo[1], -0.035))
        p = bpy.context.active_object
        m = bpy.data.materials.new('chaoPrevia')
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb(chao), 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
        p.data.materials.append(m)
    d = Vector(direcao).normalized()
    cam_d = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_d)
    sc.collection.objects.link(cam)
    if perspectiva:
        cam_d.lens = 40
        cam.location = Vector(alvo) + d * dist
    else:
        cam_d.type = 'ORTHO'
        cam_d.ortho_scale = escala
        cam.location = Vector(alvo) + d * 40
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cam_d.clip_end = 200
    sc.camera = cam
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
    sol.data.energy = 3.4
    sol.data.angle = math.radians(10)
    sol.rotation_euler = (math.radians(42), math.radians(-18), math.radians(-35))
    sc.collection.objects.link(sol)
    contra = bpy.data.objects.new('contra', bpy.data.lights.new('contra', 'SUN'))
    contra.data.energy = 0.8
    contra.rotation_euler = (math.radians(-55), math.radians(10), math.radians(150))
    sc.collection.objects.link(contra)
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb('#e9f1ff'), 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    sc.world = w
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = int(env('AMOSTRAS') or 28)
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = 3
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.resolution_x = int(res or env('RES') or 560)
    sc.render.resolution_y = int((res or int(env('RES') or 560)) * 0.75)
    sc.render.resolution_percentage = 100
    sc.render.filepath = saida
    bpy.ops.render.render(write_still=True)
    print('PREVIA', saida)


# ---------------------------------------------------------------- cenas
def casinha(c, x0=0.0, y0=0.0):
    """Casinha 5 × 4 de lambri com porta, as três janelas, quinas, piso de tábua e telhado."""
    c.piso('piso-tabua', x0, y0, 5, 4)
    c.corrida('x', y0, x0, [('parede-lambri', 1), ('parede-porta-lambri', 3), ('parede-lambri', 1)], +1)
    c.corrida('y', x0 + 5, y0, [('parede-janela-arco-lambri', 2), ('parede-lambri', 1),
                                ('parede-janela-redonda-lambri', 1)], -1)
    c.corrida('x', y0 + 4, x0, [('parede-lambri', 1), ('parede-lambri', 1), ('parede-janela-grande-lambri', 3)], -1)
    c.corrida('y', x0, y0, [('parede-janela-grande-lambri', 3), ('parede-lambri', 1)], +1)
    for x, y in ((x0, y0), (x0 + 5, y0), (x0, y0 + 4), (x0 + 5, y0 + 4)):
        c.por('quina-lambri', x, y)
    porta = c.por('porta', x0 + 2.5, y0, 0, 0)
    # Entreaberta, girando na dobradiça como o clipe `abrir`.
    piv = porta.matrix_world.translation.copy()
    porta.matrix_world = Matrix.Translation(piv) @ Matrix.Rotation(math.radians(-55), 4, 'Z') @ \
        Matrix.Translation(-piv) @ porta.matrix_world


def comodo_cortado(c, x0, y0, w, d, piso, porta_frente=True, interna_direita=True):
    """Cômodo w × d com as paredes do fundo em pé e as da frente cortadas (o corte para ver dentro)."""
    c.piso(piso, x0, y0, w, d)
    meio = (w - 3) // 2
    frente = [('parede-lambri-baixa', 1)] * meio + [('parede-porta-lambri-baixa', 3)] + \
        [('parede-lambri-baixa', 1)] * (w - 3 - meio)
    c.corrida('x', y0, x0, frente if porta_frente else [('parede-lambri-baixa', 1)] * w, +1)
    return frente


def cena_kit(nome='kit'):
    c = Cena(['casa-paredes.glb', 'casa-portas.glb', 'casa-pisos.glb', 'casa-telhado.glb'])
    casinha(c)
    c.telhado(0, 0, 5, 4)
    # Quintal na frente: grama e caminho de pedras até a porta.
    for i in range(-1, 7):
        for j in range(-3, 0):
            c.por('piso-pedra' if (i in (2,) and j > -3) else 'piso-grama', i + 0.5, j + 0.5)
    # Ao lado, um cômodo 3 × 3 cortado (paredes baixas), com azulejo, parede lisa e porta interna.
    x0, y0 = 7.0, 0.0
    c.piso('piso-azulejo', x0, y0, 3, 3)
    c.corrida('x', y0, x0, [('parede-lambri-baixa', 1), ('parede-lambri-baixa', 1), ('parede-lambri-baixa', 1)], +1)
    c.corrida('y', x0, y0, [('parede-porta-lisa-baixa', 3)], +1)
    c.corrida('x', y0 + 3, x0, [('parede-lambri', 1), ('parede-janela-redonda-lambri', 1), ('parede-lambri', 1)], -1)
    c.corrida('y', x0 + 3, y0, [('parede-lambri-baixa', 1), ('parede-lambri-baixa', 1), ('parede-lambri', 1)], -1)
    # Onde a parede cortada encontra uma em pé na mesma linha também vai uma quina (em pé).
    for x, y, q in ((x0, y0, 'quina-lambri-baixa'), (x0 + 3, y0, 'quina-lambri-baixa'), (x0, y0 + 3, 'quina-lambri'),
                    (x0 + 3, y0 + 3, 'quina-lambri'), (x0 + 3, y0 + 2, 'quina-lambri')):
        c.por(q, x, y)
    # Um pedaço de 3 × 3 de ladrilho sozinho e uma parede lisa de 3 com a janela em arco.
    c.piso('piso-ladrilho', 11.5, 0.0, 3, 3)
    c.corrida('x', 3.0, 11.5, [('parede-lisa', 1), ('parede-janela-arco-lisa', 2)], -1)
    c.por('quina-lisa', 11.5, 3.0)
    c.por('quina-lisa', 14.5, 3.0)
    return c


KIT = ['casa-paredes.glb', 'casa-portas.glb', 'casa-pisos.glb']


def sala_de(c, w, d, piso, fundo, esquerda, frente, direita):
    """Cômodo w × d na origem: fundo (y = d) e esquerda (x = 0) em pé, frente e direita cortadas."""
    c.piso(piso, 0, 0, w, d)
    c.corrida('x', d, 0, fundo, -1)
    c.corrida('y', 0, 0, esquerda, +1)
    c.corrida('x', 0, 0, frente, +1)
    c.corrida('y', w, 0, direita, -1)
    c.por('quina-lambri', 0, d)
    c.por('quina-lambri', w, d)
    c.por('quina-lambri', 0, 0)
    c.por('quina-lambri-baixa', w, 0)


def parede_de(c, nome, x, y, z, giro):
    """Peça de parede encostada na face da parede do kit (a 0,10 da linha da grade)."""
    c.por(nome, x, y, z, giro)


def cena_cozinha():
    itens = os.path.join(AQUI, '..', '..', 'src', 'assets', 'itens')
    c = Cena(KIT + ['casa-cozinha.glb', os.path.join(itens, 'fogao.glb'), os.path.join(itens, 'panela.glb')])
    B, P = 'parede-lambri-baixa', 'parede-lambri'
    sala_de(c, 6, 4, 'piso-ladrilho',
            [(P, 1), ('parede-janela-grande-lambri', 3), (P, 1), (P, 1)],
            [(P, 1), (P, 1), ('parede-janela-redonda-lambri', 1), (P, 1)],
            [(B, 1), ('parede-porta-lambri-baixa', 3), (B, 1), (B, 1)],
            [('parede-lisa-baixa', 1), ('parede-porta-lisa-baixa', 3)])
    c.por('armario-alto', 0.5, 3.5)
    c.por('balcao-pia', 2.0, 3.5)
    c.por('balcao', 3.5, 3.5)
    c.por('fogao', 4.75, 3.5)
    c.por('fogo', 4.75, 3.5)
    c.por('panela', 3.3, 3.45, 0.92)
    c.por('mesa-cozinha', 3.0, 1.5)
    for x, y, g in ((2.5, 0.5, 180), (3.5, 0.5, 180), (2.5, 2.5, 0), (3.5, 2.5, 0)):
        c.por('cadeira-cozinha', x, y, 0, g)
    parede_de(c, 'prateleira-potes', 0.2, 1.0, 1.85, 90)
    return c


def cena_sala():
    c = Cena(KIT + ['casa-sala.glb'])
    B, P = 'parede-lambri-baixa', 'parede-lambri'
    sala_de(c, 6, 4, 'piso-tabua',
            [(P, 1), ('parede-janela-arco-lambri', 2), (P, 1), ('parede-janela-arco-lambri', 2)],
            [(P, 1), (P, 1), (P, 1), (P, 1)],
            [(B, 1), ('parede-porta-lambri-baixa', 3), (B, 1), (B, 1)],
            [('parede-lisa-baixa', 1), ('parede-porta-lisa-baixa', 3)])
    c.por('tapete', 3.5, 2.0)
    c.por('sofa', 3.5, 3.5)
    c.por('mesinha-centro', 3.0, 2.0)
    c.por('poltrona', 5.5, 1.5, 0, -90)
    c.por('luminaria-pe', 5.5, 3.5)
    c.por('estante-baixa', 0.5, 2.0, 0, 90)
    c.por('planta', 0.5, 3.5)
    parede_de(c, 'quadro', 0.2, 2.0, 2.05, 90)
    return c


def cena_banheiro():
    c = Cena(KIT + ['casa-banheiro.glb'])
    B, P = 'parede-lambri-baixa', 'parede-lambri'
    sala_de(c, 4, 4, 'piso-azulejo',
            [(P, 1), (P, 1), ('parede-janela-redonda-lambri', 1), (P, 1)],
            [(P, 1), (P, 1), (P, 1), (P, 1)],
            [(B, 1), (B, 1), (B, 1), (B, 1)],
            [('parede-porta-lisa-baixa', 3), ('parede-lisa-baixa', 1)])
    # O box tem as paredes atrás e à direita: girado 90°, fica no canto do fundo à esquerda.
    c.por('box-chuveiro', 0.5, 3.5, 0, 90)
    c.por('banheira', 2.0, 3.5)
    c.por('pia-banheiro', 3.5, 3.5)
    parede_de(c, 'espelho', 3.5, 3.8, 1.5, 0)
    c.por('vaso-sanitario', 0.5, 1.5, 0, 90)
    parede_de(c, 'toalheiro', 0.2, 2.45, 1.2, 90)
    c.por('tapetinho', 2.5, 2.5)
    return c


def cena_moveis():
    """Vitrine: todos os móveis lado a lado no piso de tábua, com as peças de parede numa parede lisa."""
    c = Cena(KIT + ['casa-cozinha.glb', 'casa-sala.glb', 'casa-banheiro.glb'])
    c.piso('piso-tabua', 0, 0, 12, 4)
    c.corrida('x', 4, 0, [('parede-lisa', 1)] * 12, -1)
    c.por('quina-lisa', 0, 4)
    c.por('quina-lisa', 12, 4)
    # Fila do fundo (encostada na parede).
    for nome, x in (('armario-alto', 0.5), ('balcao-pia', 2.0), ('balcao', 3.5), ('estante-baixa', 5.0),
                    ('sofa', 7.5), ('banheira', 10.0), ('pia-banheiro', 11.5)):
        c.por(nome, x, 3.5)
    for nome, x, z in (('prateleira-potes', 2.0, 1.75), ('quadro', 5.0, 1.75), ('espelho', 11.5, 1.5),
                       ('toalheiro', 9.0, 1.4)):
        c.por(nome, x, 3.8, z)
    # Fila da frente.
    for nome, x, y, g in (('mesa-cozinha', 1.0, 1.5, 0), ('cadeira-cozinha', 2.5, 1.5, 0), ('poltrona', 3.5, 1.5, 0),
                          ('mesinha-centro', 5.0, 1.5, 0), ('luminaria-pe', 6.5, 1.5, 0), ('planta', 7.5, 1.5, 0),
                          ('vaso-sanitario', 8.5, 1.5, 0), ('box-chuveiro', 9.5, 1.5, 0), ('tapetinho', 10.5, 1.5, 0),
                          ('tapete', 10.5, 0.0, 0)):
        c.por(nome, x, y, 0, g)
    return c


def cena_andar():
    """Segundo andar (31/10/2026): sala 4 × 6 com a escada no meio da coluna x = 1..2 (pé em y = 1,
    chegada em y = 5), o piso de cima de tábua em volta do vão, o pé-direito duplo na coluna
    x = 3..4 com o guarda-corpo na beira (linha x = 3) e as paredes de lambri dos dois andares."""
    c = Cena(['casa-paredes.glb', 'casa-pisos.glb', 'casa-andar.glb'])
    w, d, h = 4, 6, 4.1
    c.piso('piso-tabua', 0, 0, w, d)
    # O fundo e a esquerda em pé; a frente e a direita cortadas (o corte para ver dentro), nos dois
    # andares, com as quinas do `sala_de`.
    for z in (0.0, h):
        for i in range(w):
            c.por('parede-lambri-baixa', i + 0.5, 0, z, 0)
            c.por('parede-lambri', i + 0.5, d, z, 180)
        for j in range(d):
            c.por('parede-lambri', 0, j + 0.5, z, -90)
            c.por('parede-lambri-baixa', w, j + 0.5, z, 90)
        for x, y, q in ((0, 0, 'quina-lambri'), (w, 0, 'quina-lambri-baixa'), (0, d, 'quina-lambri'),
                        (w, d, 'quina-lambri')):
            c.por(q, x, y, z)
    for i in range(3):
        for j in range(d):
            if i == 1 and 1 <= j < 5:
                continue
            c.por('piso-andar-tabua', i + 0.5, j + 0.5)
    c.por('escada-interna', 1.5, 1.0)
    c.por('piso-andar-vao', 1.5, 1.0)
    # O guarda-corpo na beira do piso de cima (o piso fica em -x: giro +90).
    for j in range(d):
        c.por('guarda-corpo-andar', 3.0, j + 0.5, 0, 90)
    return c


def cena_cafe_festas():
    """Vitrine do café e das festas: as peças de chão no piso de tábua e as de parede numa parede
    lisa (a 0,20 da linha, como a prateleira), as que se emendam lado a lado."""
    c = Cena(KIT + ['casa-cafe.glb', 'casa-festas.glb'])
    c.piso('piso-tabua', 0, 0, 12, 4)
    c.corrida('x', 4, 0, [('parede-lisa', 1)] * 12, -1)
    c.por('quina-lisa', 0, 4)
    c.por('quina-lisa', 12, 4)
    for nome, x in (('cafe-vitrine-doces', 0.5), ('cafe-balcao', 2.0), ('cafe-banca-feira', 4.0),
                    ('festa-fim-de-ano-arvore', 5.5), ('festa-lanternas-lanterna-chao', 6.5)):
        c.por(nome, x, 3.5)
    for nome, x, z in (('cafe-lousa-cardapio', 1.0, 1.7), ('festa-junina-lanterna-papel', 6.0, 2.0),
                       ('festa-carnaval-mascara', 7.5, 1.6), ('festa-fim-de-ano-guirlanda', 8.5, 1.6),
                       ('festa-fim-de-ano-estrela-janela', 11.0, 1.8)):
        c.por(nome, x, 3.8, z)
    # As que se emendam: dois trechos de cada, ponta com ponta (longe do canto: na célula do canto a
    # quina passa na frente da ponta do fio).
    for nome, z in (('festa-junina-bandeirinhas', 3.2), ('festa-lanternas-varal-de-luz', 2.7),
                    ('festa-carnaval-serpentina', 2.3)):
        for x in (9.5, 10.5):
            c.por(nome, x, 3.8, z)
    for nome, x, y in (('cafe-mesa-redonda', 1.5, 1.5), ('cafe-cadeira', 0.5, 1.5), ('cafe-caixote', 3.5, 1.5),
                       ('festa-junina-fogueira', 5.5, 1.5), ('festa-carnaval-confete', 7.5, 1.5)):
        c.por(nome, x, y)
    # Dois caixotes empilhados (0,32 um do outro).
    c.por('cafe-caixote', 3.5, 0.5)
    c.por('cafe-caixote', 3.5, 0.5, 0.32)
    return c


CENAS = {'moveis': cena_moveis, 'kit': cena_kit, 'cozinha': cena_cozinha, 'sala': cena_sala, 'banheiro': cena_banheiro,
         'andar': cena_andar, 'cafe-festas': cena_cafe_festas}


def main():
    pedidas = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    os.makedirs(SAIDA, exist_ok=True)
    for nome in pedidas or list(CENAS):
        fn = CENAS[nome]
        c = fn()
        glb = os.path.join(SAIDA, f'cena-{nome}.glb')
        c.gravar_glb(glb)
        print('CENA', glb)
        if env('SO_GLB'):
            continue
        vistas = VISTAS[nome]
        if env('VISTA'):
            # VISTA="x,y,z;dx,dy,dz;escala|..." troca as vistas (para olhar de perto)
            vistas = [tuple(tuple(float(n) for n in parte.split(',')) if ',' in parte else float(parte)
                            for parte in v.split(';')) for v in env('VISTA').split('|')]
        for k, (alvo, direcao, escala) in enumerate(vistas):
            # Cada vista numa cena nova (o chão e a câmera de uma não sujam a outra).
            c = fn()
            for mat, cor in PINTURA.get(nome, {}).items():
                pintar(mat, cor)
            dia()
            renderizar(os.path.join(SAIDA, f'{nome}{env("SUFIXO") or ""}-{k + 1}.png'), alvo, direcao, escala)


VISTAS = {
    'kit': [((7.0, 1.0, 1.6), (0.75, -1.0, 0.7), 19.0), ((5.0, 3.0, 1.8), (-0.9, 1.1, 0.75), 17.0)],
    'cozinha': [((3.0, 2.0, 1.0), (0.75, -1.0, 0.95), 9.5), ((3.0, 2.2, 0.9), (0.12, -1.0, 0.62), 8.6)],
    'sala': [((3.0, 2.0, 1.0), (0.75, -1.0, 0.95), 9.5), ((3.0, 2.2, 0.9), (0.12, -1.0, 0.62), 8.6)],
    'banheiro': [((2.0, 2.0, 1.0), (0.75, -1.0, 0.95), 7.6), ((2.0, 2.2, 0.9), (0.12, -1.0, 0.62), 6.8)],
    'moveis': [((6.0, 2.2, 0.9), (0.35, -1.0, 0.55), 12.5), ((3.0, 2.4, 0.9), (0.2, -1.0, 0.5), 6.2),
               ((9.5, 2.4, 0.9), (-0.2, -1.0, 0.5), 6.2)],
    'andar': [((2.0, 3.0, 3.5), (0.7, -1.0, 0.9), 11.0), ((1.6, 3.0, 2.6), (0.9, -0.35, 0.45), 7.0)],
    'cafe-festas': [((6.0, 2.2, 1.0), (0.35, -1.0, 0.55), 12.5), ((2.5, 2.4, 1.0), (0.2, -1.0, 0.5), 5.5),
                    ((9.5, 2.6, 1.6), (-0.2, -1.0, 0.4), 5.5)],
}
# Na prévia, cada cômodo ganha a cor de parede que o jogo daria (no GLB a `paredeDentro` é creme).
PINTURA = {
    'cozinha': {'paredeDentro': '#fff1cf', 'paredeVerso': '#fff1cf'},
    'sala': {'paredeDentro': '#ffe2d4', 'paredeVerso': '#ffe2d4'},
    'banheiro': {'paredeDentro': '#dcf2f4', 'paredeVerso': '#dcf2f4'},
}

if __name__ == '__main__':
    main()
