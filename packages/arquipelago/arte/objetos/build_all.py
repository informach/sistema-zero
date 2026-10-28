"""Gera todos os objetos com função da casa em `src/assets/objetos/` e confere o contrato.

  /tmp/claude-0/blender-venv/bin/python -B arte/objetos/build_all.py

Cada grupo roda num processo próprio. As conferências leem o `relatorio.json` que cada exportação
grava (nós, clipes, materiais, triângulos, tamanho) e o próprio GLB (duração dos clipes e as
coordenadas de textura das faces que recebem imagem). Com o `bun` no caminho, roda também o
`scripts/faces-coplanares.ts` em cada arquivo (nenhuma sobreposição nem emenda em T).
"""
import json
import os
import shutil
import struct
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
PACOTE = os.path.abspath(os.path.join(AQUI, '..', '..'))
GRUPOS = ['geladeira', 'forno', 'aquario', 'lareira', 'banda', 'fliperama', 'museu', 'casinha']
SAIDA = os.path.join(PACOTE, 'src', 'assets', 'objetos')
TETO_TRIS, TETO_KB = 10000, 450
# Arquivos em que cada nó é uma peça solta (a busca de faces compara só dentro do mesmo nó).
SEPARADOS = {'banda', 'museu'}

# O que o jogo vai procurar em cada arquivo (README). Clipes: nome -> (duração em s, laço).
CONTRATO = {
    'geladeira': {'nos': ['geladeira', 'porta'], 'clipes': {'abrir': (0.75, False)},
                  'materiais': ['pintaFrente', 'pintaLadoEsq', 'pintaLadoDir', 'pintaTopo', 'luz'],
                  'uv': ['pintaFrente', 'pintaLadoEsq', 'pintaLadoDir', 'pintaTopo']},
    'geladeira-holograma': {'nos': ['projetor', 'geladeira', 'porta'], 'clipes': {'abrir': (0.75, False)},
                            'materiais': ['projetoAzul', 'projetoAzulLinha']},
    'forno': {'nos': ['forno', 'porta'], 'clipes': {'abrir': (0.75, False)}, 'materiais': ['luz']},
    'aquario': {'nos': ['aquario'] + [f'peixe-{i}' for i in range(1, 5)] + [f'bolha-{i}' for i in range(1, 7)],
                'clipes': {'nadar': (6.0, True)}, 'materiais': ['agua', 'vidro', 'luz']},
    'lareira': {'nos': ['lareira', 'fogo', 'chama-1', 'chama-2', 'chama-3'], 'clipes': {'crepitar': (2.0, True)},
                'materiais': ['fogo', 'brasa']},
    'banda': {'nos': ['bateria', 'teclado', 'violao', 'xilofone', 'microfone']},
    'fliperama': {'nos': ['fliperama', 'tela'], 'materiais': ['tela', 'luz'], 'uv': ['tela']},
    'museu': {'nos': ['redoma', 'vitrine', 'cranio', 'pegada', 'placa', 'texto'], 'materiais': ['placaFace']},
    'casinha': {'nos': ['casinha', 'placa', 'texto'], 'materiais': ['placaFace']},
}


def ler_glb(caminho):
    with open(caminho, 'rb') as f:
        dados = f.read()
    n = struct.unpack('<I', dados[12:16])[0]
    return json.loads(dados[20:20 + n])


def conferir_glb(pid, regra, erros):
    doc = ler_glb(os.path.join(SAIDA, f'{pid}.glb'))
    for nome, (dur, _laco) in regra.get('clipes', {}).items():
        anim = [a for a in doc.get('animations', []) if a['name'] == nome]
        if not anim:
            erros.append(f'{pid}: clipe {nome} ausente no GLB')
            continue
        fim = max(doc['accessors'][s['input']]['max'][0] for s in anim[0]['samplers'])
        if abs(fim - dur) > 0.05:
            erros.append(f'{pid}: clipe {nome} dura {fim:.2f} s (esperado {dur} s)')
    mats = [m['name'] for m in doc.get('materials', [])]
    com_uv = {mats[p['material']] for m in doc['meshes'] for p in m['primitives'] if 'TEXCOORD_0' in p['attributes']}
    for nome in regra.get('uv', []):
        if nome not in com_uv:
            erros.append(f'{pid}: o material {nome} está sem coordenadas de textura')


def faces_coplanares(pid, erros):
    bun = shutil.which('bun')
    if not bun:
        print('bun não encontrado: a busca de faces coplanares ficou de fora')
        return
    args = [bun, 'scripts/faces-coplanares.ts'] + (['--separados'] if pid in SEPARADOS else [])
    r = subprocess.run(args + [os.path.join(SAIDA, f'{pid}.glb')], cwd=PACOTE, capture_output=True, text=True)
    linha = (r.stdout.strip().splitlines() or [''])[0]
    if r.returncode != 0 or '0 sobreposições, 0 emendas abertas' not in linha:
        erros.append(f'{pid}: faces coplanares\n{r.stdout}{r.stderr[-800:]}')


def main():
    rel = os.path.join(AQUI, 'relatorio.json')
    if os.path.exists(rel):
        os.remove(rel)
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
    env.pop('ITEM', None)
    env.pop('POSE', None)
    for grupo in GRUPOS:
        r = subprocess.run([sys.executable, '-B', os.path.join(AQUI, f'{grupo}.py')], cwd=AQUI, capture_output=True,
                           text=True, env=env)
        linhas = [l for l in r.stdout.splitlines() if l.startswith('EXPORTADO')]
        if r.returncode != 0 or not linhas:
            print(r.stdout[-2000:], r.stderr[-4000:])
            sys.exit(f'falhou: {grupo}')
        for l in linhas:
            print(l)

    with open(rel) as f:
        dados = json.load(f)
    erros = []
    for pid, d in dados.items():
        if d['triangulos'] > TETO_TRIS:
            erros.append(f'{pid}: {d["triangulos"]} triângulos (teto {TETO_TRIS})')
        if d['kb'] > TETO_KB:
            erros.append(f'{pid}: {d["kb"]} KB (teto {TETO_KB})')
        regra = CONTRATO.get(pid, {})
        for chave in ('nos', 'materiais'):
            falta = [x for x in regra.get(chave, []) if x not in d[chave]]
            if falta:
                erros.append(f'{pid}: falta {chave} {falta}')
        falta = [c for c in regra.get('clipes', {}) if c not in d['clipes']]
        if falta:
            erros.append(f'{pid}: falta clipes {falta}')
        if not os.path.exists(os.path.join(SAIDA, f'{pid}.glb')):
            erros.append(f'{pid}: GLB não gravado')
            continue
        conferir_glb(pid, regra, erros)
        faces_coplanares(pid, erros)
    for pid in CONTRATO:
        if pid not in dados:
            erros.append(f'{pid}: não foi exportado')

    tris = sum(d['triangulos'] for d in dados.values())
    kb = sum(d['kb'] for d in dados.values())
    print(f'TOTAL: {len(dados)} objetos, {tris} triângulos, {kb / 1024:.2f} MB')
    if erros:
        print('\n'.join(erros))
        sys.exit(1)
    print('conferência: ok')


if __name__ == '__main__':
    main()
