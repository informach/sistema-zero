"""A arte 2D da missão (A Estação de Reciclagem em 2D) tirada dos MESMOS modelos 3D.

Os coletores e as peças são projetados em vetor com as funções da arte espacial
(`../construtor-espaco-blender/svg2d.py`): faces visíveis em tons chapados, oclusão da frente para
trás e o contorno de desenho animado. A vista é a do jogo 2D: de cima, um pouco inclinada para quem
joga, com o fundo do galpão no ALTO da tela (de onde as peças descem).

Os quatro fundos 800 × 480 são os PRÓPRIOS galpões 3D vistos de cima (câmera ortográfica entre o
chão e as luminárias), gravados em WebP por `previa/previa.mjs fundos2d`. A tela cobre x de -5,56 a
5,56 e z de -6,67 a 0 do jogo 3D: 72 px por metro, e as três esteiras ficam centradas em x = 112,
400 e 688 (o coletor encostado numa borda fica embaixo da esteira daquele lado).

Tamanhos de desenho no jogo 2D: coletor 104 × 76, peça 72 × 72 (o viewBox no dobro, para o traço
sair fino). As imagens vão embutidas em cada projeto: `arte2d/orcamento.json` registra o tamanho.

    ESTACAO_OUT=./out /tmp/claude-0/blender-venv/bin/python -B svg2d.py
"""
import base64
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'construtor-espaco-blender'))

import svg2d as espaco  # noqa: E402
from mathutils import Vector  # noqa: E402

espaco.GLB = os.environ.get('ESTACAO_OUT', os.path.join(HERE, 'out'))
DEST = os.path.join(HERE, 'arte2d')

COLETORES = ['coletor-carrinho-azul', 'coletor-robo-laranja', 'coletor-empilhadeira-amarela', 'coletor-aspirador-lilas']
RECICLAVEIS = ['reciclavel-garrafa-pet', 'reciclavel-lata', 'reciclavel-caixa-papelao', 'reciclavel-pote-vidro']
PROIBIDOS = ['proibido-pilha', 'proibido-bateria', 'proibido-lampada', 'proibido-celular']
GALPOES = ['galpao-menta', 'galpao-tijolo', 'galpao-azul', 'galpao-noite']

OLHO = Vector((0.0, -0.5, 0.87))  # de cima, inclinado para quem joga (o -Y do Blender)
CIMA = Vector((0.0, 1.0, 0.0))    # o fundo do galpão (+Y) fica no alto da tela


def vetor(pid, w, h, margem=3):
    faces = espaco.faces_do_modelo(espaco.importar(pid))
    q = espaco.base_da_camera(OLHO, CIMA)
    cams = [q(p) for pts, n, i in faces for p in pts]
    xs, ys = [c.x for c in cams], [c.y for c in cams]
    escala = min((w * 2 - 2 * margem) / (max(xs) - min(xs)), (h * 2 - 2 * margem) / (max(ys) - min(ys)))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    origem = (cx - w / escala, cy + h / escala)
    opacas, transl = espaco.projetar(faces, OLHO, escala, origem, cima=CIMA)
    corpo, _ = espaco.desenhar(opacas, transl)
    return espaco.svg(w, h, corpo)


if __name__ == '__main__':
    os.makedirs(DEST, exist_ok=True)
    medidas = {**{p: (104, 76) for p in COLETORES}, **{p: (72, 72) for p in RECICLAVEIS + PROIBIDOS}}
    pedidas = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(medidas)
    orc_path = os.path.join(DEST, 'orcamento.json')
    orcamento = json.load(open(orc_path)) if os.path.exists(orc_path) else {}
    for pid in pedidas:
        texto = vetor(pid, *medidas[pid])
        with open(os.path.join(DEST, f'{pid}.svg'), 'w') as f:
            f.write(texto)
        orcamento[pid] = len(base64.b64encode(texto.encode()))
        print(pid, len(texto), 'bytes')
    for pid in GALPOES:
        caminho = os.path.join(DEST, f'{pid}.webp')
        if os.path.exists(caminho):
            orcamento[pid] = len(base64.b64encode(open(caminho, 'rb').read()))
    ordem = COLETORES + RECICLAVEIS + PROIBIDOS + GALPOES
    orcamento = {k: orcamento[k] for k in ordem if k in orcamento}
    orcamento['total-base64'] = sum(v for k, v in orcamento.items() if k != 'total-base64')
    with open(orc_path, 'w') as f:
        json.dump(orcamento, f, indent=2)
        f.write('\n')
    print('TOTAL base64', orcamento['total-base64'])
