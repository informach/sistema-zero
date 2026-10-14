from pathlib import Path
from urllib.parse import urlsplit, parse_qs, unquote
import json
import re

root = Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
out = Path('output/instagram/revisao-manychat-2026-10-13')
before = json.loads((out / 'antes.json').read_text(encoding='utf-8'))
text = (root / '04-postagens-manychat.md').read_text(encoding='utf-8')
blocks = re.split(r'(?=^<a id=)', text, flags=re.M)[1:]
old_blocks = re.split(r'(?=^<a id=)', before['04-postagens-manychat.md'], flags=re.M)[1:]
clean = out / 'copy-limpa'
clean.mkdir(exist_ok=True)
expected = ['JEITO', 'MAESTRO', 'RITMO', 'CRIADOR', 'AUTONOMIA', 'SINAIS', 'FERIAS', 'PRIMEIRO', 'MUNDO', 'PERSONAGEM', 'TELA', 'FUTURO', 'APRENDER', 'TENTATIVA']
errors = []
rows = []
refs = []
quotes = []

def quoted(s):
    return '\n'.join(line[1:].lstrip() for line in s.splitlines() if line.startswith('>'))

def dm(b, n):
    return quoted(re.search(r'\*\*DM' + str(n) + r'[^\n]*\n(.*?)\*\*Bot', b, re.S)[1])

def save(name, s):
    (clean / (name + '.txt')).write_text(s, encoding='utf-8')

assert len(blocks) == 14
for i, (b, old) in enumerate(zip(blocks, old_blocks), 1):
    key = f'mc{i:02}'
    assert b.startswith(f'<a id="{key}"></a>')
    word = re.search(r'\*\*Palavra:\*\* ([A-Z]+)', b)[1]
    assert word == expected[i-1]
    ref = re.search(r'\*\*Referência:\*\* \[.*?\]\((.*?)\)', b)[1]
    assert ref == re.search(r'\*\*Referência:\*\* \[.*?\]\((.*?)\)', old)[1]
    refs.append(ref)
    url = re.search(r'^https://sistemazero.com.br/[^\n]+', b, re.M)[0]
    assert url == re.search(r'^https://sistemazero.com.br/[^\n]+', old, re.M)[0]
    parsed = urlsplit(url)
    assert parsed.path == '/kids/desafio-primeiro-jogo/oferta'
    assert parse_qs(parsed.query)['utm_content'] == [key + '_' + word.lower()]
    pub, rest = b.split('### Legenda', 1)
    caption = quoted(rest.split('### Direct')[0])
    public = quoted(pub)
    reel = []
    for line in pub.splitlines():
        if not re.match(r'\| \d', line): continue
        cells = [c.strip() for c in line.split('|')[1:-1]]
        nums = re.findall(r'\d+', cells[0])
        begin, end = map(int, nums)
        count = len(cells[2].split())
        reel.append({'inicio':begin, 'fim':end, 'palavras':count, 'ppm':round(count/(end-begin)*60,1)})
    if reel:
        assert reel[0]['inicio'] == 0
        assert all(a['fim'] == b['inicio'] for a,b in zip(reel,reel[1:]))
        assert max(r['ppm'] for r in reel) <= 160
        spoken = '\n\n'.join([c.strip() for c in line.split('|')[1:-1]][2] for line in pub.splitlines() if re.match(r'\| \d',line))
        overlays = '\n\n'.join([c.strip() for c in line.split('|')[1:-1]][1] for line in pub.splitlines() if re.match(r'\| \d',line))
        save(key + '-fala', spoken)
        save(key + '-sobreposicoes', overlays)
        save(key + '-capa', re.search(r'\*\*Capa do Reel:\*\* (.*)', pub)[1])
        public = spoken
    else:
        slides = re.findall(r'^### Slide (\d+)', pub, re.M)
        assert list(map(int,slides)) == list(range(1,len(slides)+1))
        assert int(re.search(r'(\d+) slides',pub)[1]) == len(slides)
        save(key + '-carrossel', public)
    assert 'A Chave do Farol' not in public + caption
    assert 'Comente ' + word in public and 'Comente ' + word in caption
    save(key + '-legenda', caption)
    for n in [1,2]: save(key + f'-dm{n}', dm(b,n))
    assert 'resposta automática' in dm(b,1)
    for term in ['Desafio do Primeiro Jogo','A Chave do Farol','9 a 14 anos','computador','gravadas','Pagamento único','30 dias','aprovação do pagamento','7 dias','compra']:
        if term not in dm(b,2): errors.append(f'{key}: falta {term}')
    for label in ['**Botão interno:** Ver o primeiro passo','**Botão de site:** Conhecer o Desafio']:
        assert label in b
    rows.append({'id':key,'palavra':word,'dm1_antes':len(dm(old,1).split()),'dm1_depois':len(dm(b,1).split()),'dm2_antes':len(dm(old,2).split()),'dm2_depois':len(dm(b,2).split()),'reel':reel})

assert len(set(refs)) == 14
links = 0
for name in before:
    p = root / name
    s = p.read_text(encoding='utf-8')
    assert '\ufffd' not in s
    for dest in re.findall(r'\[[^\]]*\]\(([^)]+)\)',s):
        if dest.startswith(('http:', 'https:', 'mailto:', '#')):continue
        file = unquote(dest.split('#')[0])
        links += 1
        if not (p.parent / file).resolve().exists(): errors.append(f'{name}: link inexistente {dest}')

# Falas reais são preservadas literalmente: slide e legenda podem usar trechos diferentes.
for phrase in ['Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer. Ele ficou mais responsável com as coisas dele.',
               'Vai criando, vai sendo mais criativo. ‘Eu quero mudar isso aqui no jogo.’',
               'No início eu acompanhei mais, agora eu acompanho menos.',
               'Ele faz o curso com total independência no momento.',
               'No último dia chamei a minha mãe pra ver o meu jogo.',
               'Eu já jogava um monte, agora eu faço os meus jogos.']:
    assert phrase in before['04-postagens-manychat.md'] and phrase in text
    quotes.append(phrase)

report = {'pecas':14,'carrosseis':sum(not x['reel'] for x in rows),'reels':sum(bool(x['reel']) for x in rows),
          'slides':len(re.findall(r'^### Slide ',text,re.M)),'links_locais':links,'referencias_preservadas':len(refs),
          'falas_literais_preservadas':len(quotes),'copy_units':len(list(clean.glob('*.txt'))),'medidas':rows,'erros':errors}
(out / 'verificacao.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
if errors: raise SystemExit(1)
