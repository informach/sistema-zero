"""Gera os GLBs do Pico Gelado, do Vale dos Dinos, da Ilha das Nuvens, do alto do Farol e dos lugares de
exploração (a caverna de cristal do Pico e as constelações das Nuvens) em
`src/assets/ilhas/` e o `relatorio.json` (triângulos, tamanho, nós, âncoras e clipes), e confere
o contrato com o jogo.

  /tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/build_all.py

Cada script roda num processo próprio (a cena do Blender começa limpa em cada um). No fim, se o
`bunx` existir, o `relatorio.json` passa pelo formatador do biome (o lint do repositório confere).
"""
import json
import os
import shutil
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..', '..'))
SCRIPTS = ['pico', 'vale', 'nuvens', 'alto_do_farol', 'pico_caverna', 'nuvens_constelacoes', 'argola_nuvem']
ILHA = ('chegada', 'morador', 'lumi-1', 'lumi-2', 'lumi-3', 'lumi-4')
ESPERADO = {
    'pico': {'nos': ('chao', 'montanha', 'cenario', 'telhado-iglu'),
             'ancoras': ILHA + ('palco', 'iglu', 'cume', 'parede-de-gelo', 'iglu-dentro', 'fogareiro')
             + tuple(f'{p}-{i}' for p in ('instrumento', 'banda', 'musico') for i in ('xilofone', 'violao', 'bateria'))},
    'pico-props': {'nos': ('pinheiro-nevado-a', 'pinheiro-nevado-b', 'bloco-de-gelo', 'boneco-de-neve', 'painel-de-gelo')},
    'pico-treno': {'nos': ('treno',)},
    'vale-dos-dinos': {'nos': ('chao', 'vulcao', 'lava', 'cenario'),
                       'ancoras': ILHA + ('observatorio', 'escavacao', 'ninho-1', 'cratera')},
    'vale-dos-dinos-props': {'nos': ('samambaia-gigante', 'cavalinha', 'ninho', 'ovo-dino', 'osso', 'cranio-fossil')},
    'nuvens': {'nos': ('chao', 'cenario') + tuple(f'fio-{k}' for k in range(1, 7)) + tuple(f'plataforma-{k}' for k in range(1, 5)),
               'ancoras': ILHA + ('tear', 'ninho', 'balao', 'topo-plataforma-4')},
    'nuvens-balao': {'nos': ('balao',), 'clipes': ('flutuar',)},
    'alto-do-farol': {'nos': ('sala', 'escada', 'mesa-da-iris', 'vidros', 'lente'),
                      'ancoras': ('entrada', 'lanterna', 'mesa', 'chegada', 'leitura', 'camera-varanda'),
                      'colisores': ('col-cil-piso-sala', 'col-parede-sala', 'col-cil-grade-escada', 'col-mesa-iris',
                                    'col-cil-base-lente'),
                      'clipes': ('girar',)},
    'nuvens-argola': {'nos': ('nuvem', 'faixa')},
    # Lugares de exploração (cada um com os seus col-*; o referencial de cada um está no README).
    'pico-caverna': {'nos': ('rocha', 'chao', 'cristais', 'cristais-luz', 'gelo', 'percurso', 'joia'),
                     'ancoras': ('entrada', 'galeria', 'laguinho', 'cristal-raro') + tuple(f'degrau-{k}' for k in range(1, 5)),
                     'colisores': ('col-parede', 'col-cil-teto', 'col-cil-chao', 'col-rampa', 'col-boca', 'col-cil-coluna',
                                   'col-cil-laje', 'col-cil-cristal', 'col-cil-poste')},
    'nuvens-constelacoes': {'nos': ('mirante', 'luneta-tubo') + tuple(f'constelacao-{k}' for k in range(1, 7))
                            + tuple(f'constelacao-{k}-estrela-1' for k in range(1, 7)),
                            'ancoras': ('luneta', 'quadro-das-estrelas'),
                            'colisores': ('col-cil-deque', 'col-degrau', 'col-guarda', 'col-cil-tripe', 'col-quadro',
                                          'col-cil-banco', 'col-cil-poste')},
}
TETO_ILHA = dict(triangulos=40_000, kb=1_536)
TETO_PECA = dict(triangulos=8_000, kb=300)
TETO_LUGAR = dict(triangulos=12_000, kb=512)   # caverna e constelações

rel = os.path.join(AQUI, 'relatorio.json')
if os.path.exists(rel):
    os.remove(rel)
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
for s in SCRIPTS:
    r = subprocess.run([sys.executable, '-B', os.path.join(AQUI, f'{s}.py')], cwd=AQUI, capture_output=True, text=True,
                       env=env)
    linhas = [l for l in r.stdout.splitlines() if l.startswith('EXPORTADO')]
    if r.returncode != 0 or not linhas:
        print(r.stdout[-2000:], r.stderr[-4000:])
        sys.exit(f'falhou: {s}')
    for l in linhas:
        print(l[:160])

with open(rel) as f:
    dados = json.load(f)
erros = []
for pid, esp in ESPERADO.items():
    d = dados.get(pid)
    if not d:
        erros.append(f'{pid}: não foi gerado')
        continue
    teto = (TETO_ILHA if pid in ('pico', 'vale-dos-dinos', 'nuvens', 'alto-do-farol') else
            TETO_LUGAR if pid in ('pico-caverna', 'nuvens-constelacoes') else TETO_PECA)
    if d['triangulos'] > teto['triangulos'] or d['kb'] > teto['kb']:
        erros.append(f"{pid}: {d['triangulos']} triângulos, {d['kb']} KB (teto {teto})")
    for n in esp.get('nos', ()):
        if n not in d['nos']:
            erros.append(f'{pid}: falta o nó {n}')
    for a in esp.get('ancoras', ()):
        if a not in d['ancoras']:
            erros.append(f'{pid}: falta a âncora {a}')
    for c in esp.get('clipes', ()):
        if c not in d['clipes']:
            erros.append(f'{pid}: falta o clipe {c}')
    for c in esp.get('colisores', ()):
        if c not in d.get('colisores', {}):
            erros.append(f'{pid}: falta o colisor {c}')
    if not os.path.exists(os.path.join(RAIZ, 'packages/arquipelago/src/assets/ilhas', f'{pid}.glb')):
        erros.append(f'{pid}: arquivo ausente')
# Nó com o mesmo nome de uma âncora vira "nome001" no three.js: proibido.
for pid, d in dados.items():
    for n in set(d['nos']) & set(d['ancoras']):
        erros.append(f'{pid}: nó e âncora com o mesmo nome ({n})')
if erros:
    sys.exit('CONFERÊNCIA FALHOU:\n' + '\n'.join(erros))

tris = sum(d['triangulos'] for d in dados.values())
kb = sum(d['kb'] for d in dados.values())
print(f'TOTAL: {len(dados)} arquivos, {tris} triângulos, {kb / 1024:.2f} MB. Conferência ok.')
bunx = shutil.which('bunx')
if bunx:
    subprocess.run([bunx, 'biome', 'format', '--write', rel], cwd=RAIZ, capture_output=True)
