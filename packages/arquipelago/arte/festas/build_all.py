"""Gera o Lote 7 em `src/assets/movimento/` e `src/assets/festas/` e confere o contrato.

  /tmp/claude-0/blender-venv/bin/python -B arte/festas/build_all.py

Cada grupo roda num processo próprio. As conferências (nós, vazios, clipes, materiais e tetos de
tamanho) leem o `relatorio.json` que cada exportação grava.
"""
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
GRUPOS = ['movimento', 'veiculos', 'carnaval', 'junina', 'lanternas', 'fim_de_ano']
ASSETS = os.path.join(AQUI, '..', '..', 'src', 'assets')
TETO_PECA, TETO_FESTA, TETO_KB = 4000, 15000, 500

# O que o jogo vai procurar em cada arquivo (README).
CONTRATO = {
    'cipo': {'nos': ['cipo'], 'vazios': ['pegada', 'topo'], 'clipes': ['balancar']},
    'mergulho': {'nos': ['mascara', 'pe-de-pato-esq', 'pe-de-pato-dir'], 'vazios': ['cabeca', 'pe-esq', 'pe-dir']},
    'planador': {'nos': ['planador', 'asa-esq', 'asa-dir'], 'vazios': ['pegada'], 'clipes': ['planar']},
    'patins': {'nos': ['patim-esq', 'patim-dir'], 'vazios': ['pe-esq', 'pe-dir']},
    'barquinho': {'nos': ['barquinho', 'remo-esq', 'remo-dir'], 'vazios': ['assento'], 'clipes': ['remar'],
                  'materiais': ['luz']},
    'barco': {'nos': ['barco'], 'vazios': ['assento'], 'clipes': ['balancar']},
    'carnaval': {'nos': ['confetes', 'serpentinas', 'mascaras', 'carro-alegorico', 'sol-do-carro', 'faixas'],
                 'clipes': ['girar']},
    'junina': {'nos': ['bandeirinhas', 'fogueira', 'fogo', 'barraca-pescaria', 'barraca-milho', 'barraca-suco',
                       'balao'],
               'vazios': ['ponta-esq', 'ponta-dir'], 'clipes': ['crepitar'], 'materiais': ['fogo', 'brasa', 'placaFace']},
    'lanternas': {'nos': ['lanterna-vermelha', 'lanterna-amarela', 'lanterna-azul', 'lanterna-flutuante',
                          'varal-de-luzes'],
                  'vazios': ['gancho-vermelha', 'gancho-amarela', 'gancho-azul', 'ponta-esq', 'ponta-dir'],
                  'clipes': ['flutuar'], 'materiais': ['luz']},
    'fim-de-ano': {'nos': ['palmeira-enfeitada', 'fogos', 'foguete', 'estouro', 'mesa-da-ceia'],
                   'clipes': ['estourar'], 'materiais': ['luz', 'estrela']},
}

rel = os.path.join(AQUI, 'relatorio.json')
if os.path.exists(rel):
    os.remove(rel)
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
env.pop('PECA', None)
for grupo in GRUPOS:
    r = subprocess.run([sys.executable, '-B', os.path.join(AQUI, f'{grupo}.py')], cwd=AQUI, capture_output=True,
                       text=True, env=env)
    linhas = [l for l in r.stdout.splitlines() if l.startswith('EXPORTADO')]
    if r.returncode != 0 or not linhas:
        print(r.stdout[-2000:], r.stderr[-4000:])
        sys.exit(f'falhou: {grupo}')
    print(f'{grupo}: {len(linhas)} arquivo(s)')

with open(rel) as f:
    dados = json.load(f)
erros = []
for pid, d in dados.items():
    festa = d['pasta'] == 'festas'
    if d['triangulos'] > (TETO_FESTA if festa else TETO_PECA):
        erros.append(f'{pid}: {d["triangulos"]} triângulos')
    for no, t in d['nos'].items():
        if t > TETO_PECA:
            erros.append(f'{pid}/{no}: {t} triângulos (teto {TETO_PECA} por peça)')
    if d['kb'] > TETO_KB:
        erros.append(f'{pid}: {d["kb"]} KB (teto {TETO_KB})')
    for chave, lista in CONTRATO.get(pid, {}).items():
        tem = d['nos'] if chave == 'nos' else d[chave]
        falta = [x for x in lista if x not in tem]
        if falta:
            erros.append(f'{pid}: falta {chave} {falta}')
    if not os.path.exists(os.path.join(ASSETS, d['pasta'], f'{pid}.glb')):
        erros.append(f'{pid}: GLB não gravado')
falta = sorted(set(CONTRATO) - set(dados))
if falta:
    erros.append(f'sem exportar: {falta}')

tris = sum(d['triangulos'] for d in dados.values())
kb = sum(d['kb'] for d in dados.values())
print(f'TOTAL: {len(dados)} arquivos, {tris} triângulos, {kb / 1024:.2f} MB')
if erros:
    print('\n'.join(erros))
    sys.exit(1)
print('conferência: ok')
