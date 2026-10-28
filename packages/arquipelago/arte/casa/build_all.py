"""Gera o kit de construir e os móveis em `src/assets/casa/`, confere o contrato e as faces coplanares.

  /tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py
  CENAS=1 /tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py   # + cenas de conferência

Cada script roda num processo próprio e grava no `relatorio.json` desta pasta. As conferências leem
o relatório: nós e materiais que o jogo procura, clipes da porta, móveis de chão com a base em z = 0
dentro do footprint, peças de parede centradas com o fundo em y = +0,10. No fim roda o
`scripts/faces-coplanares.ts --separados` em cada GLB (precisa do bun) e, com CENAS=1, monta as
cenas de `cenas.py` e roda a mesma busca SEM `--separados` nos GLBs das cenas (as emendas entre
peças vizinhas). As cenas e as prévias vão para DIR_PREVIAS (padrão: `arte-casa` no diretório
temporário), nunca para o repositório.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
PACOTE = os.path.abspath(os.path.join(AQUI, '..', '..'))
CASA = os.path.join(PACOTE, 'src', 'assets', 'casa')
REL = os.path.join(AQUI, 'relatorio.json')
TETO_TRIS_PECA, TETO_KB_GLB = 6000, 600

PAREDES = [f'{t}-{f}' for f in ('lambri', 'lisa') for t in (
    'parede', 'parede-porta', 'parede-janela-grande', 'parede-janela-arco', 'parede-janela-redonda', 'quina')]
PAREDES += [f'{t}-{f}-baixa' for f in ('lambri', 'lisa') for t in ('parede', 'parede-porta', 'quina')]
CONTRATO = {
    'casa-paredes': {'nos': PAREDES, 'materiais': ['vidroJanela', 'parede', 'paredeDentro', 'paredeVerso',
                                                   'paredeTopo']},
    'casa-portas': {'nos': ['porta', 'porta-interna'], 'clipes': ['abrir', 'abrir-interna'],
                    'materiais': ['vidroJanela']},
    'casa-pisos': {'nos': ['piso-tabua', 'piso-ladrilho', 'piso-azulejo', 'piso-grama', 'piso-pedra']},
    'casa-telhado': {'nos': ['agua', 'agua-meia', 'beiral', 'cumeeira', 'cumeeira-ponta', 'testeira-esq',
                             'testeira-dir', 'testeira-meia-esq', 'testeira-meia-dir', 'testeira-beiral-esq',
                             'testeira-beiral-dir', 'oitao-esq', 'oitao-dir', 'oitao-meia-esq', 'oitao-meia-dir',
                             'oitao-faixa', 'oitao-faixa-meia', 'vigia'], 'materiais': ['vidroJanela']},
    'casa-cozinha': {'nos': ['balcao-pia', 'balcao', 'armario-alto', 'mesa-cozinha', 'cadeira-cozinha',
                             'prateleira-potes']},
    'casa-sala': {'nos': ['sofa', 'poltrona', 'mesinha-centro', 'tapete', 'estante-baixa', 'luminaria-pe', 'planta',
                          'quadro'], 'materiais': ['luz']},
    'casa-banheiro': {'nos': ['banheira', 'pia-banheiro', 'espelho', 'vaso-sanitario', 'box-chuveiro', 'tapetinho',
                              'toalheiro']},
}


def footprint(nota):
    """'2 × 1' -> (2, 1); peça de parede -> None."""
    if nota.startswith('parede'):
        return None
    w, d = nota.split('×')
    return float(w), float(d)


if os.path.exists(REL):
    os.remove(REL)
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
env.pop('GLB', None)
for script in ('kit.py', 'comodos.py'):
    r = subprocess.run([sys.executable, '-B', os.path.join(AQUI, script)], cwd=AQUI, capture_output=True, text=True,
                       env=env)
    linhas = [ln for ln in r.stdout.splitlines() if ln.startswith('EXPORTADO')]
    if r.returncode != 0 or not linhas:
        print(r.stdout[-2000:], r.stderr[-4000:])
        sys.exit(f'falhou: {script}')
    for ln in linhas:
        print(ln.split(', nós')[0])

with open(REL) as f:
    dados = json.load(f)
erros = []
for pid, regra in CONTRATO.items():
    d = dados.get(pid)
    if not d:
        erros.append(f'{pid}: não exportado')
        continue
    if d['kb'] > TETO_KB_GLB:
        erros.append(f'{pid}: {d["kb"]} KB (teto {TETO_KB_GLB})')
    for chave, lista in regra.items():
        tem = d['nos'] if chave == 'nos' else d[chave]
        falta = [x for x in lista if x not in tem]
        if falta:
            erros.append(f'{pid}: falta {chave} {falta}')
    for nome, p in d.get('pecas', {}).items():
        if p['triangulos'] > TETO_TRIS_PECA:
            erros.append(f'{pid}/{nome}: {p["triangulos"]} triângulos (teto {TETO_TRIS_PECA})')
        if d['grupo'] != 'comodos':
            continue
        (x0, y0, z0), (x1, y1, z1) = p['caixa']
        fp = footprint(p['nota'])
        if fp is None:
            if abs(y1 - 0.10) > 1e-3 or abs(x0 + x1) > 2e-3 or abs(z0 + z1) > 2e-3:
                erros.append(f'{pid}/{nome}: peça de parede fora do contrato (caixa {p["caixa"]})')
        else:
            w, dd = fp
            if abs(z0) > 1e-3 or x0 < -w / 2 - 1e-3 or x1 > w / 2 + 1e-3 or y0 < -dd / 2 - 1e-3 or y1 > dd / 2 - 0.05:
                erros.append(f'{pid}/{nome}: fora do footprint {p["nota"]} (caixa {p["caixa"]})')

bun = shutil.which('bun')
if bun:
    for pid in CONTRATO:
        r = subprocess.run([bun, 'scripts/faces-coplanares.ts', '--separados', os.path.join(CASA, f'{pid}.glb')],
                           cwd=PACOTE, capture_output=True, text=True)
        cab = (r.stdout.strip().splitlines() or ['?'])[0]
        if ': 0 sobreposições, 0 emendas abertas' not in cab:
            erros.append(r.stdout.strip())
else:
    print('aviso: sem bun, faces coplanares não conferidas')

if os.environ.get('CENAS'):
    pasta = os.environ.get('DIR_PREVIAS') or os.path.join(tempfile.gettempdir(), 'arte-casa')
    r = subprocess.run([sys.executable, '-B', os.path.join(AQUI, 'cenas.py'), 'kit', 'cozinha', 'sala', 'banheiro',
                        'moveis'], cwd=AQUI, capture_output=True, text=True,
                       env=dict(env, DIR_PREVIAS=pasta, SO_GLB=os.environ.get('SO_GLB', '1')))
    if r.returncode != 0:
        print(r.stderr[-3000:])
        sys.exit('falhou: cenas')
    if bun:
        for nome in ('kit', 'cozinha', 'sala', 'banheiro', 'moveis'):
            r = subprocess.run([bun, 'scripts/faces-coplanares.ts', os.path.join(pasta, f'cena-{nome}.glb')],
                               cwd=PACOTE, capture_output=True, text=True)
            # O fogão a lenha da cena da cozinha vem de arte/itens: os pares só dele não contam aqui.
            ruins = [ln for ln in r.stdout.splitlines()[1:] if 'fogao' not in ln and 'fogo0' not in ln]
            print(r.stdout.splitlines()[0] if r.stdout else '?')
            if ruins:
                erros.append('\n'.join(ruins))

tris = sum(d['triangulos'] for d in dados.values())
kb = sum(d['kb'] for d in dados.values())
print(f'TOTAL: {len(dados)} arquivos, {tris} triângulos, {kb / 1024:.2f} MB')
if erros:
    print('\n'.join(erros))
    sys.exit(1)
print('conferência: ok')
