from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs
import re, struct, json
root=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
files=[root/'README.md',root/'02-fixados.md',root/'03-postagens.md',root/'apoio/links-e-publicacao.md',root/'pesquisas/revisao-calendario-30-postagens-2026-10-11.md',*sorted((root/'postagens').glob('*.md')),root/'producao/postagens/README.md']
broken=[]
for p in files:
    text=p.read_text(encoding='utf-8')
    for dest in re.findall(r'\]\(([^)]+)\)',text):
        if dest.startswith(('http','#','mailto')):continue
        link=dest.split('#')[0]
        if link and not (p.parent/unquote(link)).exists():broken.append([str(p),dest])
assert not broken,broken
story=(root/'postagens/04-stories.md').read_text(encoding='utf-8')
links=re.findall(r'\]\((https://sistemazero\.com\.br/[^)]+)\)',story)
support=(root/'apoio/links-e-publicacao.md').read_text(encoding='utf-8')
assert len(links)==11 and len(set(links))==11
for link in links:
    assert link in support
    q=parse_qs(urlparse(link).query)
    assert q['utm_campaign']==['instagram_editorial_30_2026']
    assert q['utm_source']==['instagram'] and q['utm_medium']==['organic_social']
source=(root/'producao/destaques/avaliacoes/fontes-dos-relatos.txt').read_text(encoding='utf-8')
for phrase in ['Vai criando, vai sendo mais criativo.', 'Eu quero mudar isso aqui no jogo.', 'No início eu acompanhei mais, agora eu acompanho menos.', 'Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.', 'Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.']:
    assert phrase in source,phrase
folder=root/'producao/postagens/p01-mudar-a-chave-muda-o-caminho'
pngs=sorted(folder.glob('[0-9][0-9]-p01.png'))
assert len(pngs)==6
for p in pngs:
    head=p.read_bytes()[:24];assert head[:8]==b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II',head[16:24])==(1080,1350)
layout=json.loads((folder/'apoio/verificacao-layout.json').read_text(encoding='utf-8'))
assert len(layout)==6 and all(s['passed'] for s in layout)
paths=json.loads((folder/'apoio/verificacao-percursos.json').read_text(encoding='utf-8'))
assert all(p['final']['hasKey'] and p['final']['won'] for p in paths)
# Keep the editorial files in the repository's LF convention.
for p in files:p.write_text(p.read_text(encoding='utf-8'),encoding='utf-8',newline='\n')
print(json.dumps({'local_links':'ok','story_links':len(links),'quoted_sources':'ok','PNGs':len(pngs),'format':'1080x1350','layout':'6/6','playable_routes':'2/2'},ensure_ascii=False))
