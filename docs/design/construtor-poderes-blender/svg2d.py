"""A arte 2D dos Poderes (sobre a Nave Contra Asteroides) tirada dos MESMOS modelos 3D.

Projeção em vetor com as funções da arte espacial (`../construtor-espaco-blender/svg2d.py`): faces
visíveis em tons chapados, oclusão da frente para trás e o contorno de desenho animado. A vista é a
do jogo 2D, de cima, com o fundo do espaço no ALTO da tela: a nave inimiga e o chefão apontam para
baixo (para a nave da criança), os tiros inimigos descem e o plasma sobe. Os itens são vistos de
frente, como uma moeda.

Tamanhos de desenho no jogo 2D (o viewBox no dobro, para o traço sair fino): item 44 × 44, nave
inimiga 56 × 52, tiro inimigo 10 × 26, chefão 200 × 130 e plasma 24 × 32. As imagens vão embutidas
em cada projeto: `arte2d/orcamento.json` registra o tamanho em base64.

    PODERES_OUT=./out /tmp/claude-0/blender-venv/bin/python -B svg2d.py
    PODERES_OUT=./out /tmp/claude-0/blender-venv/bin/python -B svg2d.py -- chefao-cruzador
"""
import base64
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'construtor-espaco-blender'))

import svg2d as espaco  # noqa: E402
from mathutils import Vector  # noqa: E402

espaco.GLB = os.environ.get('PODERES_OUT', os.path.join(HERE, 'out'))
DEST = os.path.join(HERE, 'arte2d')

FORMAS = ['redondo', 'hexagono', 'losango', 'octogono']
ITENS = [f'item-{p}-{f}' for p in ('escudo', 'triplo', 'plasma') for f in FORMAS]
INIMIGAS = ['inimiga-garra-vermelha', 'inimiga-disco-roxo', 'inimiga-vespa-amarela', 'inimiga-tridente-cinza']
LASERS = ['laser-inimigo-vermelho', 'laser-inimigo-laranja', 'laser-inimigo-rosa', 'laser-inimigo-amarelo']
CHEFOES = ['chefao-cruzador', 'chefao-disco-mae', 'chefao-escorpiao', 'chefao-fortaleza']
PLASMAS = ['plasma-roxo', 'plasma-verde', 'plasma-laranja', 'plasma-azul']

DE_CIMA = Vector((0.0, 0.0, 1.0))
FUNDO = Vector((0.0, 1.0, 0.0))  # o +Y do Blender (o fundo do jogo) fica no alto da tela
INCLINACAO_DO_ITEM = math.radians(50)  # a do `de_pe` em lib_poderes.py
DE_FRENTE = Vector((0.0, -math.sin(INCLINACAO_DO_ITEM), math.cos(INCLINACAO_DO_ITEM)))

#  peça: (largura, altura, olho, contorno, degraus)
MEDIDAS = {
    **{p: (44, 44, DE_FRENTE, True, 4) for p in ITENS},
    **{p: (56, 52, DE_CIMA, True, 4) for p in INIMIGAS},
    **{p: (10, 26, DE_CIMA, False, 3) for p in LASERS},
    **{p: (200, 130, DE_CIMA, True, 4) for p in CHEFOES},
    **{p: (24, 32, DE_CIMA, False, 3) for p in PLASMAS},
}


def vetor(pid, w, h, olho, contorno, degraus, margem=3):
    faces = espaco.faces_do_modelo(espaco.importar(pid))
    q = espaco.base_da_camera(olho, FUNDO)
    cams = [q(p) for pts, n, i in faces for p in pts]
    xs, ys = [c.x for c in cams], [c.y for c in cams]
    escala = min((w * 2 - 2 * margem) / (max(xs) - min(xs)), (h * 2 - 2 * margem) / (max(ys) - min(ys)))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    origem = (cx - w / escala, cy + h / escala)
    opacas, transl = espaco.projetar(faces, olho, escala, origem, degraus=degraus, cima=FUNDO)
    corpo, _ = espaco.desenhar(opacas, transl, **({} if contorno else {'contorno': None}))
    return espaco.svg(w, h, corpo)


if __name__ == '__main__':
    os.makedirs(DEST, exist_ok=True)
    pedidas = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(MEDIDAS)
    orc_path = os.path.join(DEST, 'orcamento.json')
    orcamento = json.load(open(orc_path)) if os.path.exists(orc_path) else {}
    for pid in pedidas:
        texto = vetor(pid, *MEDIDAS[pid])
        with open(os.path.join(DEST, f'{pid}.svg'), 'w') as f:
            f.write(texto)
        orcamento[pid] = len(base64.b64encode(texto.encode()))
        print(pid, len(texto), 'bytes')
    orcamento = {k: orcamento[k] for k in MEDIDAS if k in orcamento}
    orcamento['total-base64'] = sum(v for k, v in orcamento.items() if k != 'total-base64')
    with open(orc_path, 'w') as f:
        json.dump(orcamento, f, indent=2)
        f.write('\n')
    print('TOTAL base64', orcamento['total-base64'])
