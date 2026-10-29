"""Prévias das ilhas desta pasta (Cycles na CPU, sem tela), com o `render.py` do mundo e uma
câmera pronta para cada ilha. Não faz parte do jogo, só da conferência.

  /tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/render.py PASTA_DE_SAIDA [pico vale nuvens alto balao]
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.join(AQUI, '..', 'mundo', 'render.py')
ASSETS = os.path.join(AQUI, '..', '..', 'src', 'assets', 'ilhas')

VISTAS = {
    'pico': ('pico.glb', dict(ALVO='0,3,0', DIR='1,0.85,0.7', DIST='38', AGUA='1', RES='1200,800')),
    # A caverna de cristal atrás da montanha e o trenó no platô (fase3-07).
    'pico-caverna': ('pico.glb', dict(ALVO='-15,1.5,-0.5', DIR='0.25,1,0.45', DIST='42', AGUA='1', RES='1200,800')),
    'pico-boca': ('pico.glb', dict(ALVO='-13.6,1.8,-0.5', DIR='0.55,0.45,1', DIST='11', AGUA='1', RES='1200,800')),
    'pico-cume': ('pico.glb', dict(ALVO='-4.5,9.8,-1.2', DIR='0.6,0.9,1', DIST='9', AGUA='1', RES='1200,800')),
    'vale': ('vale-dos-dinos.glb', dict(ALVO='0,3,0', DIR='1,0.85,0.75', DIST='38', AGUA='1', RES='1200,800')),
    'nuvens': ('nuvens.glb', dict(ALVO='-2,9,0', DIR='1,0.7,0.75', DIST='46', AGUA='1', RES='1200,800',
                                  POS=f"{os.path.join(ASSETS, 'nuvens.glb')}=0,7,0")),
    'alto': ('alto-do-farol.glb', dict(ALVO='0.5,1.3,-1.2', DIR='-0.55,0.25,1', DIST='3.7', LENTE='20', RES='1200,800')),
    'alto-escada': ('alto-do-farol.glb', dict(ALVO='-2.4,-0.2,1.3', DIR='0.4,0.75,-1', DIST='4', LENTE='18', RES='1200,800')),
    'balao': ('nuvens-balao.glb', dict(ALVO='0,3.2,0', DIR='1,0.4,0.8', DIST='13', CHAO='#9fd07a', RES='700,800')),
}

saida = sys.argv[1]
os.makedirs(saida, exist_ok=True)
for nome in sys.argv[2:] or list(VISTAS):
    arq, vars_ = VISTAS[nome]
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', **vars_)
    destino = os.path.join(saida, f'{nome}.png')
    subprocess.run([sys.executable, '-B', RENDER, destino, os.path.join(ASSETS, arq)], env=env, check=True,
                   capture_output=True)
    print(destino)
