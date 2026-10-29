"""Gera todos os personagens (Lote 2) de uma vez e confere os limites.

  /tmp/claude-0/blender-venv/bin/python arte/personagens/build_all.py          # todos
  /tmp/claude-0/blender-venv/bin/python arte/personagens/build_all.py capi iris

Cada script roda num processo próprio (o Blender começa limpo em cada um). No fim confere o que o
jogo pede de cada arquivo: os cinco clipes, a malha dos olhos com `piscar` e `feliz` e o tamanho
abaixo de 600 KB; os moradores ainda ficam perto de 6 mil triângulos.
"""
import json
import os
import struct
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', '..', 'src', 'assets', 'personagens'))
TODOS = ['iris', 'capi', 'bento', 'mare', 'floco', 'jade', 'irie', 'nico']
CLIPES = {'parado', 'andar', 'falar', 'acenar', 'feliz'}
LIMITE_KB = 600
LIMITE_TRIANGULOS_MORADOR = 6500


def ler_glb(caminho):
    dados = open(caminho, 'rb').read()
    tamanho = struct.unpack('<I', dados[12:16])[0]
    return json.loads(dados[20:20 + tamanho])


def conferir(pid):
    caminho = os.path.join(ASSETS, f'{pid}.glb')
    gltf = ler_glb(caminho)
    problemas = []
    clipes = {a['name'] for a in gltf.get('animations', [])}
    if not CLIPES <= clipes:
        problemas.append(f'faltam clipes: {sorted(CLIPES - clipes)}')
    olhos = next((m for m in gltf['meshes'] if m['name'].endswith('-olhos')), None)
    nomes = (olhos or {}).get('extras', {}).get('targetNames', [])
    if not olhos or not {'piscar', 'feliz'} <= set(nomes):
        problemas.append('olhos sem as formas piscar e feliz')
    if any(w != 0 for w in (olhos or {}).get('weights', [])):
        problemas.append('formas dos olhos ligadas no arquivo')
    kb = os.path.getsize(caminho) / 1024
    if kb > LIMITE_KB:
        problemas.append(f'{kb:.0f} KB (limite {LIMITE_KB})')
    tris = 0
    for m in gltf['meshes']:
        for p in m['primitives']:
            tris += gltf['accessors'][p['indices']]['count'] // 3
    if pid != 'iris' and tris > LIMITE_TRIANGULOS_MORADOR:
        problemas.append(f'{tris} triângulos (limite {LIMITE_TRIANGULOS_MORADOR})')
    return tris, kb, problemas


def main():
    pedidos = sys.argv[1:] or TODOS
    falhas = 0
    for pid in pedidos:
        r = subprocess.run([sys.executable, os.path.join(HERE, f'{pid}.py')], capture_output=True, text=True)
        if r.returncode != 0:
            print(f'{pid}: ERRO\n{r.stderr[-2000:]}')
            falhas += 1
            continue
        tris, kb, problemas = conferir(pid)
        estado = 'ok' if not problemas else '; '.join(problemas)
        print(f'{pid:6s} {tris:6d} triângulos {kb:5.0f} KB  {estado}')
        falhas += bool(problemas)
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
