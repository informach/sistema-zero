"""Miniaturas das escolhas do Construir (Cycles na CPU, sem tela), feitas dos próprios modelos do
jogo, para a criança reconhecer cada peça pelo desenho: os pisos e os caminhos (uma grade de 3 × 3
células), as janelas (no meio de uma parede de lambri, de fora) e os objetos da casa.

  /tmp/claude-0/blender-venv/bin/python -B arte/casa/miniaturas.py           # todas
  ITEM=piso-tabua,janela-arco /tmp/claude-0/blender-venv/bin/python -B arte/casa/miniaturas.py
  PASTA=src/assets/casa/miniaturas python3 -I arte/itens/icones_paleta.py    # paleta de 128 cores

Saem em `src/assets/casa/miniaturas/<id>.png`, 160 px com fundo transparente. O enquadramento e a
luz são os dos ícones dos itens (`arte/itens/render.py`). Os móveis dos cômodos, do café e as
decorações de festa saem como `movel-<nó>.png`.
"""
import os
import sys

import bpy
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'itens'))
from render import cena, gravar  # noqa: E402

ASSETS = os.path.join(AQUI, '..', '..', 'src', 'assets')
CASA = os.path.join(ASSETS, 'casa')
SAIDA = os.path.join(CASA, 'miniaturas')
env = os.environ.get

# De onde a câmera olha (no Blender: y negativo é a frente das paredes, z para cima).
DE_CIMA = (0.55, -0.9, 1.5)
DE_FRENTE = (0.3, -1, 0.22)
DO_OBJETO = (0.75, -1.25, 0.85)


def so(*nomes):
    """Esconde tudo menos os nós `nomes` (e os filhos deles)."""
    manter = set()
    for n in nomes:
        o = bpy.data.objects[n]
        manter |= {o, *o.children_recursive}
    for o in bpy.data.objects:
        if o not in manter:
            o.hide_render = True
    return [bpy.data.objects[n] for n in nomes]


def copiar(o, dx, dy=0.0):
    c = o.copy()
    c.data = o.data
    c.location = o.location + Vector((dx, dy, 0))
    bpy.context.scene.collection.objects.link(c)
    return c


def grade_de_piso(no, n=3):
    """O piso numa grade de n × n células (a tábua continua de uma célula para a outra em x)."""

    def preparar():
        (piso,) = so(no)
        for i in range(n):
            for j in range(n):
                if i or j:
                    copiar(piso, i, j)
        return None

    return preparar


def vidro_sem_luz():
    """O vidro das janelas acende à noite no jogo; na miniatura fica azul-claro, sem luz própria."""
    m = bpy.data.materials.get('vidroJanela')
    b = m.node_tree.nodes.get('Principled BSDF') if m and m.use_nodes else None
    if b:
        b.inputs['Emission Strength'].default_value = 0
        b.inputs['Base Color'].default_value = (0.55, 0.78, 0.95, 1)
        b.inputs['Roughness'].default_value = 0.15


def janela_na_parede(no, largura):
    """A janela entre paredes de lambri, enquadrada num quadrado em volta do vidro."""

    def preparar():
        janela, parede = so(no, 'parede-lambri')
        parede.hide_render = True
        for lado in (-1, 1):
            for k in range(3):
                c = copiar(parede, lado * (largura / 2 + 0.5 + k))
                c.hide_render = False
        vidro_sem_luz()
        # O quadrado em volta do vidro, com folga para a moldura, as venezianas e a floreira.
        idx = [i for i, m in enumerate(janela.data.materials) if m and m.name == 'vidroJanela']
        vs = {v for p in janela.data.polygons if p.material_index in idx for v in p.vertices}
        pts = [janela.matrix_world @ janela.data.vertices[v].co for v in vs]
        x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
        z0, z1 = min(p.z for p in pts), max(p.z for p in pts)
        lado = max(x1 - x0, z1 - z0) * 1.6 + 0.3
        zm = (z0 + z1) / 2 - 0.1
        return [
            Vector((x, y, z))
            for x in (-lado / 2, lado / 2)
            for y in (-0.3, 0.2)
            for z in (zm - lado / 2, zm + lado / 2)
        ]

    return preparar


MINIATURAS = {
    'piso-tabua': ('casa/casa-pisos.glb', grade_de_piso('piso-tabua'), DE_CIMA),
    'piso-ladrilho': ('casa/casa-pisos.glb', grade_de_piso('piso-ladrilho'), DE_CIMA),
    'piso-azulejo': ('casa/casa-pisos.glb', grade_de_piso('piso-azulejo'), DE_CIMA),
    'caminho-pedra': ('casa/casa-pisos.glb', grade_de_piso('piso-pedra', 2), DE_CIMA),
    'caminho-grama': ('casa/casa-pisos.glb', grade_de_piso('piso-grama', 2), DE_CIMA),
    'janela-grande': (
        'casa/casa-paredes.glb',
        janela_na_parede('parede-janela-grande-lambri', 3),
        DE_FRENTE,
    ),
    'janela-arco': ('casa/casa-paredes.glb', janela_na_parede('parede-janela-arco-lambri', 2), DE_FRENTE),
    'janela-redonda': (
        'casa/casa-paredes.glb',
        janela_na_parede('parede-janela-redonda-lambri', 1),
        DE_FRENTE,
    ),
}
# Os móveis dos cômodos (`comodos.py`), cada um sozinho, como os objetos da casa.
MOVEIS = {
    'cozinha': ['balcao-pia', 'balcao', 'armario-alto', 'mesa-cozinha', 'cadeira-cozinha', 'prateleira-potes'],
    'sala': ['sofa', 'poltrona', 'mesinha-centro', 'tapete', 'estante-baixa', 'luminaria-pe', 'planta', 'quadro'],
    'banheiro': ['banheira', 'pia-banheiro', 'espelho', 'vaso-sanitario', 'box-chuveiro', 'tapetinho', 'toalheiro'],
    # Café e banca de feira (`cafe.py`) e decoração de festa (`festas.py`), 31/10/2026.
    'cafe': ['cafe-mesa-redonda', 'cafe-cadeira', 'cafe-balcao', 'cafe-vitrine-doces', 'cafe-lousa-cardapio',
             'cafe-banca-feira', 'cafe-caixote'],
    'festas': ['festa-junina-bandeirinhas', 'festa-junina-lanterna-papel', 'festa-junina-fogueira',
               'festa-carnaval-serpentina', 'festa-carnaval-mascara', 'festa-carnaval-confete',
               'festa-fim-de-ano-arvore', 'festa-fim-de-ano-guirlanda', 'festa-fim-de-ano-estrela-janela',
               'festa-lanternas-lanterna-chao', 'festa-lanternas-varal-de-luz'],
}


def so_o_movel(no):
    def preparar():
        so(no)
        if no == 'cafe-vitrine-doces':
            vidro_mais_claro()
        return None

    return preparar


def vidro_mais_claro():
    """Na miniatura da vitrine, o vidro deixa ver melhor os doces (no jogo ele fica com o alfa de sempre)."""
    m = bpy.data.materials.get('vidroArmario')
    b = m.node_tree.nodes.get('Principled BSDF') if m and m.use_nodes else None
    if b:
        b.inputs['Alpha'].default_value = 0.12


for comodo, nos in MOVEIS.items():
    for no in nos:
        MINIATURAS[f'movel-{no}'] = (f'casa/casa-{comodo}.glb', so_o_movel(no), DO_OBJETO)
for nome in sorted(os.listdir(os.path.join(ASSETS, 'objetos'))):
    if nome.endswith('.glb') and 'holograma' not in nome:
        MINIATURAS[f'objeto-{nome[:-4]}'] = (f'objetos/{nome}', None, DO_OBJETO)

if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    escolhidos = set((env('ITEM') or '').split(',')) - {''}
    for id_, (glb, preparar, direcao) in MINIATURAS.items():
        if escolhidos and id_ not in escolhidos:
            continue
        sc = cena(os.path.join(ASSETS, glb), None, preparar, direcao)
        gravar(sc, os.path.join(SAIDA, f'{id_}.png'), int(env('RES') or 160))
        print('MINIATURA', id_)
