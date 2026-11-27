"""Gera as 16 peças da Estação de Reciclagem e confere o contrato com o Jogo 3D.

    ESTACAO_OUT=./out /tmp/claude-0/blender-venv/bin/python -B build_all.py
    ESTACAO_OUT=./out /tmp/claude-0/blender-venv/bin/python -B build_all.py -- galpao-noite

Confere em cada peça a caixa da categoria (no `exportar`) e os tetos do carregador de modelos do
Estúdio (`three3dModelsRuntime.ts`: 64 materiais, 500 mil triângulos) e grava `relatorio.json`.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import coletores  # noqa: E402
import galpoes  # noqa: E402
import pecas  # noqa: E402

PECAS = {**coletores.COLETORES, **pecas.RECICLAVEIS, **pecas.PROIBIDOS, **galpoes.GALPOES}
ORDEM = list(PECAS)
TETOS = {'materiais': 64, 'triangulos': 500_000}

if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    pedidas = args or ORDEM
    relatorio_path = os.path.join(HERE, 'relatorio.json')
    relatorio = json.load(open(relatorio_path)) if os.path.exists(relatorio_path) else {}
    problemas = []
    for pid in pedidas:
        info = PECAS[pid]()
        if len(info['materiais']) > TETOS['materiais']:
            problemas.append(f'{pid}: {len(info["materiais"])} materiais')
        if info['triangulos'] > TETOS['triangulos']:
            problemas.append(f'{pid}: {info["triangulos"]} triângulos')
        relatorio[pid] = {k: v for k, v in info.items() if k != 'pid'}
    relatorio = {k: relatorio[k] for k in ORDEM if k in relatorio}
    with open(relatorio_path, 'w') as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)
        f.write('\n')
    if problemas:
        raise SystemExit('Fora dos tetos: ' + '; '.join(problemas))
    print('OK', len(pedidas), 'peças')
