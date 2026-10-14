from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote
import json
import re

root = Path(__file__).resolve().parents[3]
ig = root / 'docs/marketing/kids/comunidade-dos-criadores/instagram'
out = Path(__file__).resolve().parent
main = ig / '04-postagens-manychat.md'
text = main.read_text(encoding='utf-8')
pieces = re.split(r'(?=<a id="mc\d{2}"></a>)', text)[1:]
assert len(pieces) == 14
expected = ['Db6jsdpDKY8','DbtrxgXgIKj','DbZIywlDxqj','DbHipNcDGQk','DaggcpVEif3','DaWIuqVj1lX','DaA1V70CXoW','DZ0Uq5XD6bb','DZsg6qOD9Rg','DZafI-7jBLE','DZIJ8izKpSa','DY5WLFuxedK','DYzqYmZDmkJ','DcUfSYymXV1']
copydir = out / 'copy-limpa'
copydir.mkdir(exist_ok=True)
keywords, contents, lengths, links = [], [], [], []
slides = 0
reels = 0
def quoted(s):
    return '\n'.join(re.sub(r'^> ?', '', line) for line in s.splitlines() if line.startswith('>'))
for index, piece in enumerate(pieces, 1):
    ident = f'mc{index:02d}'
    assert f'<a id="{ident}"></a>' in piece
    refs = re.findall(r'https://www.instagram.com/p/([^/]+)/', piece)
    assert refs == [expected[index - 1]], (ident, refs)
    word = re.search(r'\*\*Palavra:\*\* ([A-Z]+)', piece).group(1)
    keywords.append(word)
    body, direct = piece.split('### Direct completo', 1)
    public, caption = body.split('### Legenda', 1)
    assert not re.search(r'Farol|Desafio', quoted(body)), ident
    assert f'comente {word.lower()}' in quoted(public).lower(), ident
    assert f'comente {word.lower()}' in quoted(caption).lower(), ident
    if '**Formato:** carrossel' in piece:
        count = len(re.findall(r'^#### [1-6](?: ·.*)?$', public, re.M))
        assert count == 6, (ident, count)
        slides += count
    else:
        reels += 1
        assert public.count('**Fala:**') == 4
        assert public.count('**Sobreposição:**') == 4
    dm1, dm2 = re.split(r'\*\*DM2[^\n]*', direct, maxsplit=1)
    for field, s in [('post', public), ('legenda', caption), ('dm1', dm1), ('dm2', dm2)]:
        clean = quoted(s)
        assert clean.strip(), (ident, field)
        (copydir / f'{ident}-{field}.txt').write_text(clean, encoding='utf-8')
        if field == 'dm2':
            lengths.append({'id':ident, 'dm2_caracteres':len(clean), 'dm2_palavras':len(clean.split())})
    assert '**Botão interno:** Ver o primeiro passo.' in direct
    assert '**Botão de site:** Conhecer o Desafio.' in direct
    urls = re.findall(r'^https://sistemazero.com.br/[^\s]+', direct, re.M)
    assert len(urls) == 1
    parsed = urlparse(urls[0])
    assert parsed.path == '/kids/desafio-primeiro-jogo/oferta'
    params = parse_qs(parsed.query)
    assert params['utm_source'] == ['instagram']
    assert params['utm_medium'] == ['dm']
    assert params['utm_campaign'] == ['instagram_manychat_desafio_14_2026']
    assert params['utm_content'] == [ident + '_' + word.lower()]
    contents.append(params['utm_content'][0])
assert len(set(keywords)) == 14
assert not set(keywords) & {'PASSO','APOIO','IDEIA','TESTE','CRIAR','ROTINA'}
assert len(set(contents)) == 14
assert slides == 60 and reels == 4

files = [main, *sorted((ig / 'campanhas/manychat-desafio').glob('*.md')), ig / 'postagens/06-manychat.md']
for file in files:
    value = file.read_text(encoding='utf-8')
    for href in re.findall(r'\]\(([^)]+)\)', value):
        if href.startswith(('http:', 'https:')):
            continue
        path, _, anchor = href.partition('#')
        target = (file.parent / unquote(path)).resolve() if path else file
        assert target.exists(), (file, href)
        if anchor.startswith('mc'):
            assert f'id="{anchor}"' in target.read_text(encoding='utf-8'), (file, href)
        links.append(href)

for file in [ig / 'postagens/06-manychat.md', ig / 'campanhas/manychat-desafio/fluxo-curto.md']:
    value = file.read_text(encoding='utf-8')
    clean = quoted(value)
    (copydir / f'{file.stem}-mensagens.txt').write_text(clean, encoding='utf-8')
    if file.name == '06-manychat.md':
        openings = re.findall(r'^\| (M0[1-6]) \| (Oi\.[^|]+) \|$', value, re.M)
        assert len(openings) == 6
        for ident, opening in openings:
            (copydir / f'{ident.lower()}-abertura.txt').write_text(opening, encoding='utf-8')

report = {'pecas':len(pieces),'carrosseis':10,'slides':slides,'reels':reels,'legendas':14,'mensagens_novas':28,'palavras_unicas':keywords,'links_locais_conferidos':len(links),'dm2_tamanhos':lengths,'escopo':'Conferência estrutural e editorial local. Não é teste de automação ou de oferta publicada.'}
(out / 'verificacao.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=True))
