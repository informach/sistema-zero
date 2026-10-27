"""Gera todos os GLBs do mundo em `src/assets/mundo/` e o `relatorio.json` (triângulos e tamanho).

  /tmp/claude-0/blender-venv/bin/python arte/mundo/build_all.py

Cada peça roda num processo próprio (a cena do Blender começa limpa em cada uma).
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PECAS = ['terreno', 'vegetacao', 'casa', 'horta', 'bancada', 'farol', 'pier', 'ponte', 'ilhas_anel']

rel = os.path.join(HERE, 'relatorio.json')
if os.path.exists(rel):
    os.remove(rel)
for peca in PECAS:
    r = subprocess.run([sys.executable, '-B', os.path.join(HERE, f'{peca}.py')], cwd=HERE, capture_output=True, text=True)
    linhas = [l for l in r.stdout.splitlines() if l.startswith('EXPORTADO')]
    if r.returncode != 0 or not linhas:
        print(r.stdout[-2000:], r.stderr[-4000:])
        sys.exit(f'falhou: {peca}')
    print(linhas[-1])
with open(rel) as f:
    dados = json.load(f)
tris = sum(d['triangulos'] for d in dados.values())
kb = sum(d['kb'] for d in dados.values())
print(f'TOTAL: {len(dados)} arquivos, {tris} triângulos, {kb / 1024:.2f} MB')
