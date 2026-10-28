"""Gera as ilhas completas em `src/assets/ilhas/` e confere cada arquivo.

  /tmp/claude-0/blender-venv/bin/python -B arte/ilhas/build_all.py

Cada ilha roda num processo próprio (a cena do Blender começa limpa). Depois, sem o Blender, lê o
JSON de cada GLB e confere: os nós e as âncoras do contrato (README), os clipes, os nós de colisão
`col-*` (os grupos que o jogo espera, sem material), o teto de triângulos e de tamanho, e o
`relatorio.json` terminando em quebra de linha. O corredor da chegada
é conferido dentro de cada script, antes de exportar (`conferir_corredor`).
"""
import json
import os
import struct
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.environ.get('ILHAS_OUT', os.path.join(HERE, '..', '..', 'src', 'assets', 'ilhas'))
ILHAS = ['bosque', 'vila_doce', 'recife']

COMUNS = ['chegada', 'morador', 'lumi-1', 'lumi-2', 'lumi-3', 'lumi-4']
CONTRATO = {
    'bosque': {
        # copa-1…copa-11 (a copa de cada árvore: 4 do percurso, a do galho e 6 de enfeite), tronco-1…5 (os
        # troncos das árvores grandes) e telhado-casa-na-arvore ficam à parte para o jogo esmaecer o que
        # estiver entre a câmera e o personagem.
        'nos': ['terreno', 'agua', 'construcoes', 'vegetacao', 'cipo-1', 'cipo-2', 'cipo-3']
        + [f'copa-{i}' for i in range(1, 12)] + [f'tronco-{i}' for i in range(1, 6)] + ['telhado-casa-na-arvore'],
        'ancoras': COMUNS + ['escada', 'casa-na-arvore', 'cabana', 'cercado', 'lago', 'escorregador-fim',
                             'copas-1', 'copas-2', 'copas-3', 'copas-4']
        + [f'esconderijo-{i}' for i in range(1, 5)] + ['equilibrio-1-a', 'equilibrio-1-b']
        + ['escada-1-base', 'escada-1-topo', 'escada-1-saida'],
        'clipes': [],
        # Grupos de nós de colisão (o nome sem o número do fim): o percurso nas copas inteiro, a casa na
        # árvore, o escorregador, a cabana, o cercadinho, os troncos, o chão e os enfeites que seguram o
        # corpo (moitas, pedras, cogumelos, tocas, floreiras e as pernas do escorregador).
        'colisores': ['col-terreno', 'col-cil-deque', 'col-guarda', 'col-ponte', 'col-ponte-lado', 'col-degrau',
                      'col-casa-na-arvore', 'col-escorregador', 'col-escorregador-lado', 'col-cabana', 'col-varanda',
                      'col-cerca', 'col-cil-tronco', 'col-cil-tora', 'col-cil-toco', 'col-cil-moita',
                      'col-cil-pedra', 'col-cil-pedra-lago', 'col-cil-cogumelo', 'col-cil-toca', 'col-floreira',
                      'col-cil-perna-escorregador', 'col-escada-reta'],
    },
    'vila-doce': {
        'nos': ['terreno', 'fonte', 'construcoes', 'telhados', 'feira', 'enfeites'],
        'ancoras': COMUNS + ['fonte', 'padaria', 'sorveteria', 'telhados-inicio', 'telhados-1', 'telhados-2',
                             'telhados-3', 'telhados-fim'] + [f'barraca-{i}' for i in range(1, 7)],
        'clipes': [],
    },
    'recife': {
        'nos': ['terreno', 'lagoa', 'construcoes', 'corais', 'enfeites', 'caverna'] + [f'alga-{i}' for i in range(1, 11)],
        'ancoras': COMUNS + ['casa-mare', 'mapa', 'lagoa', 'cais', 'barco', 'caverna-entrada', 'caverna',
                             'caverna-tesouro', 'mergulho'],
        'clipes': ['balancar'],
    },
    'bosque-props': {'nos': ['arvore-grande-a', 'arvore-grande-b', 'arvore-grande-c', 'arvore-media', 'moita', 'tora',
                             'toco', 'cogumelo', 'tora-que-boia'], 'ancoras': [], 'clipes': []},
    'vila-doce-props': {'nos': ['casinha-a', 'casinha-b', 'casinha-c', 'barraca', 'pirulito', 'jujuba', 'bengala',
                                'lampiao'], 'ancoras': [], 'clipes': []},
    'recife-props': {'nos': ['coral-galho', 'coral-cerebro', 'coral-leque', 'coral-tubo', 'mapa-aberto', 'mapa-rolo',
                             'alga'], 'ancoras': [], 'clipes': ['balancar']},
    'barco': {'nos': ['barco'], 'ancoras': [], 'clipes': ['balancar']},
}
TETO_ILHA = (40_000, 1536)   # triângulos, KB
TETO_PROPS = (12_000, 320)


def ler_glb(caminho):
    with open(caminho, 'rb') as f:
        dados = f.read()
    n = struct.unpack('<I', dados[12:16])[0]
    return json.loads(dados[20:20 + n])


def main():
    rel = os.path.join(HERE, 'relatorio.json')
    if os.path.exists(rel):
        os.remove(rel)
    for ilha in ILHAS:
        r = subprocess.run([sys.executable, '-B', os.path.join(HERE, f'{ilha}.py')], cwd=HERE, capture_output=True,
                           text=True, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
        linhas = [l for l in r.stdout.splitlines() if l.startswith('EXPORTADO')]
        if r.returncode != 0 or not linhas:
            print(r.stdout[-2000:], r.stderr[-4000:])
            sys.exit(f'falhou: {ilha}')
        for l in linhas:
            print(l[:140])
    with open(rel) as f:
        texto = f.read()
    erros = []
    if not texto.endswith('\n'):
        erros.append('relatorio.json sem quebra de linha no fim')
    dados = json.loads(texto)
    for pid, c in CONTRATO.items():
        caminho = os.path.join(SAIDA, f'{pid}.glb')
        if not os.path.exists(caminho):
            erros.append(f'{pid}: arquivo ausente')
            continue
        doc = ler_glb(caminho)
        nomes = {n.get('name') for n in doc.get('nodes', [])}
        vazios = {n.get('name') for n in doc.get('nodes', []) if 'mesh' not in n}
        for no in c['nos']:
            if no not in nomes:
                erros.append(f'{pid}: falta o nó {no}')
        for a in c['ancoras']:
            if a not in vazios:
                erros.append(f'{pid}: falta a âncora {a}')
        grupos = set()
        for n in doc.get('nodes', []):
            nome = n.get('name', '')
            if not nome.startswith('col-'):
                continue
            grupos.add(nome.rsplit('-', 1)[0] if nome.rsplit('-', 1)[-1].isdigit() else nome)
            prims = doc['meshes'][n['mesh']]['primitives'] if 'mesh' in n else []
            if not prims:
                erros.append(f'{pid}: {nome} sem malha')
            elif any('material' in pr for pr in prims):
                erros.append(f'{pid}: {nome} tem material (colisão não desenha)')
        for g in c.get('colisores', []):
            if g not in grupos:
                erros.append(f'{pid}: falta o colisor {g}')
        clipes = sorted(a.get('name') for a in doc.get('animations', []))
        if clipes != sorted(c['clipes']):
            erros.append(f'{pid}: clipes {clipes}, esperado {c["clipes"]}')
        tris, kb = dados[pid]['triangulos'], os.path.getsize(caminho) / 1024
        teto = TETO_PROPS if pid.endswith('props') or pid == 'barco' else TETO_ILHA
        if tris > teto[0] or kb > teto[1]:
            erros.append(f'{pid}: {tris} triângulos / {kb:.0f} KB passa do teto {teto}')
    tris = sum(d['triangulos'] for d in dados.values())
    kb = sum(d['kb'] for d in dados.values())
    print(f'TOTAL: {len(dados)} arquivos, {tris} triângulos, {kb / 1024:.2f} MB')
    if erros:
        sys.exit('ERROS:\n  ' + '\n  '.join(erros))
    print('CONFERIDO: nós, âncoras, colisores, clipes, tetos e relatório')


if __name__ == '__main__':
    main()
