"""Gera todos os itens em `src/assets/itens/`, confere o contrato e, com ICONES=1, refaz os ícones.

  /tmp/claude-0/blender-venv/bin/python -B arte/itens/build_all.py
  ICONES=1 /tmp/claude-0/blender-venv/bin/python -B arte/itens/build_all.py   # + ícones (Cycles)

Cada grupo roda num processo próprio. As conferências (nós, clipes, materiais, tetos de tamanho)
leem o `relatorio.json` que cada exportação grava; os ícones são conferidos no fim.
"""
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
GRUPOS = ['colheita', 'sementes', 'comidas', 'ferramentas', 'colecao', 'lugares', 'cozinha', 'ingredientes', 'iscas',
          'colecoes', 'fosseis', 'pegadas', 'plantas_do_ceu']
ITENS = os.path.join(AQUI, '..', '..', 'src', 'assets', 'itens')
ICONES = os.path.join(AQUI, '..', '..', 'src', 'assets', 'icones')
TETO_TRIS, TETO_KB, TETO_ICONE_KB = 4000, 300, 20

# O que o jogo vai procurar em cada arquivo (README).
CONTRATO = {
    'lanterna': {'vazios': ['mao'], 'materiais': ['luz']},
    'regador': {'vazios': ['mao']},
    'pa': {'vazios': ['mao']},
    'rede': {'vazios': ['mao']},
    'vara-de-pescar': {'vazios': ['mao']},
    'bau': {'nos': ['bau', 'tampa'], 'clipes': ['abrir']},
    'moeda': {'nos': ['moeda'], 'clipes': ['girar']},
    'luneta': {'nos': ['luneta', 'tubo']},
    'quadro-das-cores': {'nos': ['quadro'] + [f'cor-{i}' for i in range(1, 7)],
                         'materiais': [f'cor-{i}' for i in range(1, 7)]},
    'placa-seta': {'nos': ['placa', 'texto'], 'materiais': ['placaFace']},
    'placa-quadro': {'nos': ['placa', 'texto'], 'materiais': ['placaFace']},
    'placa-tabuleta': {'nos': ['placa', 'texto'], 'materiais': ['placaFace']},
    'fogao': {'nos': ['fogao', 'fogo'], 'materiais': ['fogo', 'brasa']},
}
# As notas musicais e as estrelas caídas brilham com o material `luz`.
for _pid in ('nota-seminima', 'nota-colcheia', 'nota-dupla', 'nota-clave-de-sol', 'estrela-cadente', 'estrela-sorriso',
             'estrela-cintilante', 'estrela-trio'):
    CONTRATO[_pid] = {'materiais': ['luz']}

# Os estágios das plantas do céu (`plantas-do-ceu.glb`, nove nós no padrão da horta), com a flor
# aberta brilhando; as pegadas, com a marca afundada no barro.
CONTRATO['plantas-do-ceu'] = {'nos': [f'{p}-{e}' for p in ('flor-de-nuvem', 'estrela-trepadeira', 'arco-iris-de-petala')
                                      for e in ('broto', 'crescendo', 'maduro')],
                              'materiais': ['florNuvem', 'florEstrela', 'petalaVermelha']}
for _pid in ('pegada-rex', 'pegada-triceratopo', 'pegada-passaro', 'pegada-capivara'):
    CONTRATO[_pid] = {'materiais': ['barroPegada', 'barroFundo']}
# GLBs que não são item da mochila e não têm ícone (o mesmo conjunto do `render.py`).
SEM_ICONE = {'plantas-do-ceu'}

rel = os.path.join(AQUI, 'relatorio.json')
if os.path.exists(rel):
    os.remove(rel)
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
env.pop('ITEM', None)
for grupo in GRUPOS:
    r = subprocess.run([sys.executable, '-B', os.path.join(AQUI, f'{grupo}.py')], cwd=AQUI, capture_output=True,
                       text=True, env=env)
    linhas = [l for l in r.stdout.splitlines() if l.startswith('EXPORTADO')]
    if r.returncode != 0 or not linhas:
        print(r.stdout[-2000:], r.stderr[-4000:])
        sys.exit(f'falhou: {grupo}')
    print(f'{grupo}: {len(linhas)} itens')

with open(rel) as f:
    dados = json.load(f)
erros = []
for pid, d in dados.items():
    if d['triangulos'] > TETO_TRIS:
        erros.append(f'{pid}: {d["triangulos"]} triângulos (teto {TETO_TRIS})')
    if d['kb'] > TETO_KB:
        erros.append(f'{pid}: {d["kb"]} KB (teto {TETO_KB})')
    for chave, lista in CONTRATO.get(pid, {}).items():
        tem = d['nos'] if chave == 'nos' else d[chave]
        falta = [x for x in lista if x not in tem]
        if falta:
            erros.append(f'{pid}: falta {chave} {falta}')
    if not os.path.exists(os.path.join(ITENS, f'{pid}.glb')):
        erros.append(f'{pid}: GLB não gravado')

if os.environ.get('ICONES'):
    r = subprocess.run([sys.executable, '-B', os.path.join(AQUI, 'render.py'), 'icones'], cwd=AQUI, env=env,
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-3000:])
        sys.exit('falhou: ícones')
    # A paleta usa o Pillow do Python do sistema.
    subprocess.run(['python3', '-I', os.path.join(AQUI, 'icones_paleta.py')], check=True)
for pid in dados:
    if pid in SEM_ICONE:
        continue
    p = os.path.join(ICONES, f'{pid}.png')
    if not os.path.exists(p):
        erros.append(f'{pid}: sem ícone')
    elif os.path.getsize(p) > TETO_ICONE_KB * 1024:
        erros.append(f'{pid}: ícone com {os.path.getsize(p) // 1024} KB (teto {TETO_ICONE_KB})')

tris = sum(d['triangulos'] for d in dados.values())
kb = sum(d['kb'] for d in dados.values())
print(f'TOTAL: {len(dados)} itens, {tris} triângulos, {kb / 1024:.2f} MB')
if erros:
    print('\n'.join(erros))
    sys.exit(1)
print('conferência: ok')
