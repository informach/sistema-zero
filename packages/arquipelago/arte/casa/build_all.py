"""Gera o kit de construir e os móveis em `src/assets/casa/`, confere o contrato e as faces coplanares.

  /tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py
  CENAS=1 /tmp/claude-0/blender-venv/bin/python -B arte/casa/build_all.py   # + cenas de conferência

Cada script roda num processo próprio e grava no `relatorio.json` desta pasta. As conferências leem
o relatório: nós e materiais que o jogo procura, clipes da porta, móveis de chão com a base em z = 0
dentro do footprint, peças de parede centradas com o fundo em y = +0,10 (também os do café e das
festas), os colisores e as âncoras do segundo andar e os tetos de cada arquivo. No fim roda o
`scripts/faces-coplanares.ts --separados` em cada GLB (precisa do bun) e, com CENAS=1, monta as
cenas de `cenas.py` e roda a mesma busca SEM `--separados` nos GLBs das cenas (as emendas entre
peças vizinhas). As cenas e as prévias vão para DIR_PREVIAS (padrão: `arte-casa` no diretório
temporário), nunca para o repositório.

⚠️ Os scripts regravam TODOS os GLBs da pasta; o Blender não sai byte a byte igual (o conteúdo é o
mesmo). Ao mexer só em um grupo, rode só aquele script (GLB=... ou o script dele) ou volte os
arquivos que não mudaram com `git checkout`.
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
# Os arquivos de 31/10/2026 (segundo andar, café e festas) seguem os tetos do pedido: até 10 mil
# triângulos por peça e 450 KB por arquivo; nas festas, 1.500 por peça (3 mil na árvore).
TETO_KB_NOVOS = 450
TETO_TRIS_FESTA = {'festa-fim-de-ano-arvore': 3000}
TETO_TRIS_FESTA_PADRAO = 1500

PAREDES = [f'{t}-{f}' for f in ('lambri', 'lisa') for t in (
    'parede', 'parede-porta', 'parede-janela-grande', 'parede-janela-arco', 'parede-janela-redonda', 'quina')]
PAREDES += [f'{t}-{f}-baixa' for f in ('lambri', 'lisa') for t in ('parede', 'parede-porta', 'quina')]
# As janelas na parede cortada (31/10/2026): no Construir a janela vira a janela baixa da família.
PAREDES += [f'parede-janela-{t}-{f}-baixa' for f in ('lambri', 'lisa') for t in ('grande', 'arco', 'redonda')]
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
    'casa-andar': {'nos': ['piso-andar-tabua', 'piso-andar-ladrilho', 'piso-andar-azulejo', 'escada-interna',
                           'piso-andar-vao', 'guarda-corpo-andar', 'piso-andar-vao-parede'],
                   'vazios': ['escada-1-base', 'escada-1-topo', 'escada-1-saida'],
                   'materiais': ['telhadoForro']},
    'casa-paredes-andar': {'nos': [f'{t}-{f}-andar' for f in ('lambri', 'lisa') for t in (
        'parede', 'parede-janela-grande', 'parede-janela-arco', 'parede-janela-redonda', 'quina')]
        + [f'{t}-{f}-baixa-andar' for f in ('lambri', 'lisa') for t in ('parede', 'quina')]
        + ['parede-porta-lisa-andar', 'parede-porta-lisa-baixa-andar'],
        'materiais': ['vidroJanela', 'parede', 'paredeDentro', 'paredeVerso', 'paredeTopo']},
    'casa-cafe': {'nos': ['cafe-mesa-redonda', 'cafe-cadeira', 'cafe-balcao', 'cafe-vitrine-doces',
                          'cafe-lousa-cardapio', 'cafe-banca-feira', 'cafe-caixote'],
                  'materiais': ['vidroArmario', 'placaFace']},
    'casa-festas': {'nos': ['festa-junina-bandeirinhas', 'festa-junina-lanterna-papel', 'festa-junina-fogueira',
                            'festa-carnaval-serpentina', 'festa-carnaval-mascara', 'festa-carnaval-confete',
                            'festa-fim-de-ano-arvore', 'festa-fim-de-ano-guirlanda',
                            'festa-fim-de-ano-estrela-janela', 'festa-lanternas-lanterna-chao',
                            'festa-lanternas-varal-de-luz'],
                    'materiais': ['luz', 'fogo', 'brasa', 'estrela', 'lanternaAmarela', 'lanternaRosa']},
}
NOVOS = ('casa-andar', 'casa-paredes-andar', 'casa-cafe', 'casa-festas')
# Os colisores do segundo andar (nós `col-*` de primeiro nível, no referencial da peça).
COLISORES = {'casa-andar': {'col-escada-reta': 15, 'col-guarda-vao': 3, 'col-guarda-andar': 1,
                            'col-guarda-vao-parede': 2}}


def footprint(nota):
    """'2 × 1' -> (2, 1) (o que vem depois de ';' é observação); peça de parede -> None."""
    if nota.startswith('parede'):
        return None
    w, d = nota.split(';')[0].split('×')
    return float(w), float(d)


if os.path.exists(REL):
    os.remove(REL)
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
env.pop('GLB', None)
for script in ('kit.py', 'comodos.py', 'cafe.py', 'festas.py'):
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
    teto_kb = TETO_KB_NOVOS if pid in NOVOS else TETO_KB_GLB
    if d['kb'] > teto_kb:
        erros.append(f'{pid}: {d["kb"]} KB (teto {teto_kb})')
    if pid in COLISORES and d.get('colisores') != COLISORES[pid]:
        erros.append(f'{pid}: colisores {d.get("colisores")} (esperado {COLISORES[pid]})')
    for chave, lista in regra.items():
        tem = d['nos'] if chave == 'nos' else d[chave]
        falta = [x for x in lista if x not in tem]
        if falta:
            erros.append(f'{pid}: falta {chave} {falta}')
    for nome, p in d.get('pecas', {}).items():
        teto = TETO_TRIS_FESTA.get(nome, TETO_TRIS_FESTA_PADRAO) if d['grupo'] == 'festas' else TETO_TRIS_PECA
        if p['triangulos'] > teto:
            erros.append(f'{pid}/{nome}: {p["triangulos"]} triângulos (teto {teto})')
        if d['grupo'] not in ('comodos', 'cafe', 'festas'):
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
                        'moveis', 'andar', 'andar-parede', 'cafe-festas', 'janela-baixa'], cwd=AQUI,
                       capture_output=True, text=True,
                       env=dict(env, DIR_PREVIAS=pasta, SO_GLB=os.environ.get('SO_GLB', '1')))
    if r.returncode != 0:
        print(r.stderr[-3000:])
        sys.exit('falhou: cenas')
    if bun:
        for nome in ('kit', 'cozinha', 'sala', 'banheiro', 'moveis', 'andar', 'andar-parede', 'cafe-festas',
                     'janela-baixa'):
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
