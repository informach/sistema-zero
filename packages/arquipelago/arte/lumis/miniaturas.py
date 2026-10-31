"""Miniaturas dos 14 Lumis para o álbum e a rotina (Cycles na CPU, sem tela), feitas dos próprios
modelos do jogo, de frente e um pouco de lado, para a criança reconhecer cada espécie pelo desenho.

  /tmp/claude-0/blender-venv/bin/python -B arte/lumis/miniaturas.py           # todas
  ITEM=pitanga,ipe /tmp/claude-0/blender-venv/bin/python -B arte/lumis/miniaturas.py
  PASTA=src/assets/lumis/miniaturas python3 -I arte/itens/icones_paleta.py   # paleta de 128 cores

Saem em `src/assets/lumis/miniaturas/<id>.png`, 160 px com fundo transparente. O enquadramento e
a luz são os dos ícones dos itens (`arte/itens/render.py`).
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'itens'))
from render import cena, gravar  # noqa: E402

LUMIS = os.path.join(AQUI, '..', '..', 'src', 'assets', 'lumis')
SAIDA = os.path.join(LUMIS, 'miniaturas')
# Os mesmos de `LUMIS` (arquipelago-contracts): o borrão não é espécie do álbum.
ESPECIES = ('estrelinha', 'buzio', 'pitanga', 'ipe', 'quindim', 'brigadeiro', 'bolha', 'perola', 'gelinho',
            'cristal', 'ovinho', 'brotinho', 'algodao', 'pluma')
# De onde a câmera olha (no Blender: a frente do Lumi é o −Y).
DE_FRENTE = (0.45, -1, 0.35)

if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    so = set((os.environ.get('ITEM') or '').split(',')) - {''}
    for id_ in ESPECIES:
        if so and id_ not in so:
            continue
        sc = cena(os.path.join(LUMIS, f'{id_}.glb'), None, None, DE_FRENTE)
        gravar(sc, os.path.join(SAIDA, f'{id_}.png'), int(os.environ.get('RES') or 160))
        print('MINIATURA', id_)
