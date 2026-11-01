"""Gera todos os bichos do Lote 4 e confere o que o jogo pede de cada arquivo.

  /tmp/claude-0/blender-venv/bin/python arte/bichos/build_all.py            # todos
  /tmp/claude-0/blender-venv/bin/python arte/bichos/build_all.py vale pico  # só esses grupos

Cada grupo roda num processo próprio do Blender. No fim confere, por bicho: os clipes pedidos, a
malha dos olhos com `piscar` e `feliz` desligadas, o tamanho (abaixo de 400 KB), o teto de
triângulos do tipo de bicho e, no dino de montaria, o vazio `sela`. Grava `relatorio.json`.
"""
import json
import os
import struct
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(AQUI, '..', '..', 'src', 'assets', 'bichos'))
LIMITE_KB = 400

ADOTAR = ['parado', 'andar', 'correr', 'sentar', 'feliz', 'truque']
GRUPOS = {
    'adotar': {
        'teto': 3000,
        'bichos': {f'{e}{f}': ADOTAR for e in ('cachorro', 'gato', 'coelho', 'porquinho') for f in ('', '-filhote')},
    },
    'recife': {
        'teto': 2500,
        'bichos': {b: ['nadar', 'parado'] for b in ('peixe-palhaco', 'peixe-cirurgiao', 'baiacu', 'tartaruguinha')},
    },
    'pico': {'teto': 2500, 'bichos': {b: ['parado', 'andar', 'deslizar'] for b in ('pinguim', 'pinguim-filhote')}},
    'vale': {'teto': 4000, 'bichos': {b: ['parado', 'andar', 'pular'] for b in ('rex-filhote', 'triceratops-filhote')}},
    'nuvens': {'teto': 2500, 'bichos': {'passaro-das-nuvens': ['voar', 'pousado']}},
    'bosque': {'teto': 2500, 'bichos': {b: ['voar', 'pousado'] for b in ('bem-te-vi', 'borboleta')}},
    'montaria': {'teto': 6500, 'bichos': {'dino-montaria': ['parado', 'andar', 'correr', 'pular']}, 'soquete': 'sela'},
    # A ovelhinha de algodão-doce da Vila (a luneta, 01/11/2026): a lã em tufos gasta mais.
    'vila': {'teto': 4000, 'bichos': {'ovelhinha': ['parado', 'andar', 'correr', 'feliz']}},
}
ARQUIVO = {'adotar': 'adotar.py', 'recife': 'recife.py', 'pico': 'pico.py', 'vale': 'vale.py', 'nuvens': 'nuvens.py',
           'bosque': 'bosque.py', 'montaria': 'montaria.py', 'vila': 'vila.py'}


def ler_glb(caminho):
    dados = open(caminho, 'rb').read()
    tamanho = struct.unpack('<I', dados[12:16])[0]
    return json.loads(dados[20:20 + tamanho])


def conferir(bid, clipes, teto, soquete):
    caminho = os.path.join(ASSETS, f'{bid}.glb')
    gltf = ler_glb(caminho)
    problemas = []
    tem = sorted(a['name'] for a in gltf.get('animations', []))
    if set(tem) != set(clipes):
        problemas.append(f'clipes {tem}, esperados {sorted(clipes)}')
    olhos = next((m for m in gltf['meshes'] if m['name'].endswith('-olhos')), None)
    nomes = (olhos or {}).get('extras', {}).get('targetNames', [])
    if not olhos or not {'piscar', 'feliz'} <= set(nomes):
        problemas.append('olhos sem as formas piscar e feliz')
    if any(w != 0 for w in (olhos or {}).get('weights', [])):
        problemas.append('formas dos olhos ligadas no arquivo')
    kb = os.path.getsize(caminho) / 1024
    if kb > LIMITE_KB:
        problemas.append(f'{kb:.0f} KB (limite {LIMITE_KB})')
    tris = sum(gltf['accessors'][p['indices']]['count'] // 3 for m in gltf['meshes'] for p in m['primitives'])
    if tris > teto:
        problemas.append(f'{tris} triângulos (teto {teto})')
    if soquete and not any(n.get('name') == soquete for n in gltf['nodes']):
        problemas.append(f'sem o vazio {soquete}')
    materiais = sorted(m['name'] for m in gltf.get('materials', []))
    return {'triangulos': tris, 'kb': round(kb, 1), 'clipes': tem, 'materiais': materiais}, problemas


def main():
    pedidos = sys.argv[1:] or list(GRUPOS)
    caminho_rel = os.path.join(AQUI, 'relatorio.json')
    relatorio = json.load(open(caminho_rel)) if os.path.exists(caminho_rel) else {}
    falhas = 0
    for grupo in pedidos:
        r = subprocess.run([sys.executable, os.path.join(AQUI, ARQUIVO[grupo])], capture_output=True, text=True,
                           env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
        if r.returncode != 0:
            print(f'{grupo}: ERRO\n{r.stderr[-3000:]}')
            falhas += 1
            continue
        g = GRUPOS[grupo]
        for bid, clipes in g['bichos'].items():
            dados, problemas = conferir(bid, clipes, g['teto'], g.get('soquete'))
            relatorio[bid] = {'grupo': grupo, **dados}
            estado = 'ok' if not problemas else '; '.join(problemas)
            print(f'{bid:20s} {dados["triangulos"]:5d} triângulos {dados["kb"]:6.1f} KB  {estado}')
            falhas += bool(problemas)
    with open(caminho_rel, 'w') as f:
        json.dump(dict(sorted(relatorio.items())), f, ensure_ascii=False, indent=2)
        f.write('\n')
    # O biome do repositório formata o JSON (listas curtas numa linha); sem bun, fica como saiu.
    try:
        subprocess.run(['bunx', 'biome', 'format', '--write', caminho_rel], capture_output=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        pass
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
