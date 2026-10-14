from pathlib import Path
from collections import Counter
from urllib.parse import unquote, urlsplit, parse_qs
import json, re, unicodedata
ROOT=Path(__file__).resolve().parents[3]
BASE=ROOT/'docs/marketing/kids/comunidade-dos-criadores/instagram'
WORK=Path(__file__).resolve().parent
posts=json.loads((WORK/'conteudo.json').read_text(encoding='utf-8'))
data=json.loads((WORK/'calendario-stories.json').read_text(encoding='utf-8'))
errors=[]
def check(condition,message):
 if not condition: errors.append(message)
def read(p):return p.read_text(encoding='utf-8-sig')
files=[BASE/'README.md',BASE/'03-postagens.md',BASE/'apoio/links-e-publicacao.md',BASE/'producao/postagens/README.md',BASE/'pesquisas/revisao-60-dores-desejos-2026-10-12.md',*sorted((BASE/'postagens').glob('*.md'))]
allposts='\n'.join(read(p) for p in (BASE/'postagens').glob('*-p*-a-p*.md'))
post_ids=re.findall(r'^## (P\d{2}) ·',allposts,re.M)
needs=re.findall(r'^\*\*Necessidade principal:\*\* ([DW]\d{2})',allposts,re.M)
check(sorted(post_ids)==[f'P{n:02d}' for n in range(1,61)],'IDs principais ausentes ou duplicados')
check(sorted(needs)==[f'D{n:02d}' for n in range(1,31)]+[f'W{n:02d}' for n in range(1,31)],'Cobertura incompleta ou duplicada')
formats=Counter(p['format'] for p in posts)
check(formats=={'Carrossel':30,'Reel':18,'Imagem única':12},'Contagem de formatos incorreta')
calendar=read(BASE/'03-postagens.md')
schedule=calendar.split('## Vinte semanas sugeridas')[1].split('## Seis extras')[0]
scheduled=re.findall(r'\[P(\d{2}) ·',schedule)
check(sorted(map(int,scheduled))==list(range(1,61)),'Calendário omite ou repete post')
check(sorted(n for w in data['weeks'] for n in w)==list(range(1,61)),'Dados do calendário inválidos')
stories=read(BASE/'postagens/04-stories.md')
check(len(re.findall(r'^## ST\d{2} ·',stories,re.M))==20,'Número de sequências incorreto')
check(len(re.findall(r'^### Tela [123]$',stories,re.M))==60,'Número de telas incorreto')
extras=read(BASE/'postagens/07-extras-para-familias.md')
check(len(re.findall(r'^## E\d{2} ·',extras,re.M))==6,'Número de extras incorreto')
matrix=read(BASE/'postagens/12-mapa-cobertura.md')
check(len(re.findall(r'^\| \*\*[DW]\d{2} ·',matrix,re.M))==60,'Matriz incompleta')
status=Counter(re.findall(r'^\| \*\*[DW]\d{2} · ([RIH])',matrix,re.M))
check(status=={'R':22,'I':30,'H':8},'Níveis da pesquisa mudaram')
for p in posts:
 check(bool(p['title'] and p['caption'] and p['units'] and p['note']),f'Ficha incompleta P{p["n"]:02d}')
 for u in p['units']:
  check(bool(u[0] and u[1]),f'Copy ou cena ausente P{p["n"]:02d}')
  if p['format']=='Reel': check(len(u)==3 and bool(u[2]),f'Sobreposição ausente P{p["n"]:02d}')
check(all('Farol' not in p['caption'] and 'Farol' not in '\n'.join(u[0] for u in p['units']) for p in posts),'Farol voltou a dominar exemplo principal')

# Falas fornecidas, preservadas literalmente, com a pontuação já registrada.
quotes={32:'Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.',33:'Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.',34:'Eu quero mudar isso aqui no jogo.',35:'Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.',41:'No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.'}
sources=read(BASE/'producao/destaques/avaliacoes/fontes-dos-relatos.txt')
for n,quote in quotes.items():
 check(quote in sources,f'Fonte não contém fala P{n:02d}')
 check(quote in '\n'.join(u[0] for u in posts[n-1]['units']),f'Fala alterada P{n:02d}')

expected={11:'IDEIA',12:'TESTE',13:'PASSO',16:'APOIO',24:'ROTINA',30:'CRIAR'}
check({p['n']:p['cta'] for p in posts if p.get('cta')}==expected,'Entradas de direct incorretas')
many=read(BASE/'postagens/06-manychat.md'); links=read(BASE/'apoio/links-e-publicacao.md')
for n,word in expected.items():
 check(f'| P{n:02d} | {word} |' in many,f'Entrada ManyChat incorreta P{n:02d}')
 check(f'| P{n:02d} / {word} |' in links,f'Entrada Links incorreta P{n:02d}')
 for product in ['desafio','comunidade']:
  check(f'utm_content=p{n:02d}_{word.lower()}_{product}' in links,f'UTM ausente P{n:02d}/{product}')
check('instagram_editorial_30_2026' not in links,'Campanha antiga nos links')

def heading_slug(value):
 value=re.sub(r'<[^>]+>','',value).lower()
 value=re.sub(r'[^\w\- ]','',value,flags=re.U)
 return value.replace(' ','-')
link_count=0
for file in files:
 text=read(file)
 for target in re.findall(r'\]\(([^)]+)\)',text):
  if target.startswith(('https://','http://','mailto:')):continue
  target=unquote(target.strip('<>'))
  part,_,anchor=target.partition('#')
  path=(file.parent/part).resolve() if part else file
  link_count+=1
  if not path.exists():errors.append(f'Link ausente: {file.name} -> {target}');continue
  if anchor and path.suffix=='.md':
   target_text=read(path)
   anchors=set(re.findall(r'<a id="([^"]+)"',target_text))
   anchors.update(heading_slug(h) for h in re.findall(r'^#+ (.+)$',target_text,re.M))
   if anchor not in anchors:errors.append(f'Âncora ausente: {file.name} -> {target}')
 for old in ['instagram_editorial_30_2026','36 posts','P01–P30: 14','ciclo de dez semanas']:
  if old in text:errors.append(f'Referência antiga: {file.name}: {old}')

# Extrair também as seis peças extras e os seis materiais novos para revisão mecânica.
for section in re.split(r'(?=^## E\d{2} ·)',extras,flags=re.M)[1:]:
 title=section.splitlines()[0][3:]; clean=[title]
 for line in section.splitlines()[1:]:
  if line.startswith('>'):clean.append(line.lstrip('> '))
  if re.match(r'^\| \d',line):
   cells=[c.strip() for c in line.strip('|').split('|')]; clean+=cells[-2:]
 (WORK/'copy-limpa'/f'{title[:3]}.txt').write_text('\n'.join(clean)+'\n',encoding='utf-8')
for section in re.split(r'(?=^### M0[1-6] ·)',many,flags=re.M)[1:]:
 section=section.split('## Continuidade comum')[0]
 title=section.splitlines()[0][4:]
 clean=[line.lstrip('> ') for line in section.splitlines() if line.startswith('>')]
 (WORK/'copy-limpa'/f'{title[:3]}.txt').write_text('\n'.join(clean)+'\n',encoding='utf-8')

long_covers=[]
for p in posts:
 if p['format']=='Reel':continue
 first=p['units'][0][0]
 if not ' '.join(first.split()).startswith(' '.join(p['title'].split())) and p.get('artUsesTitle') is not False:first=p['title']+' '+first
 if len(first.split())>40:long_covers.append({'post':p['n'],'words':len(first.split())})
result={'posts':len(post_ids),'needs':len(needs),'evidence':dict(status),'formats':dict(formats),'weeks':len(data['weeks']),'story_sequences':20,'story_screens':60,'extras':6,'quotes_verified':len(quotes),'dm_entries':len(expected),'local_links_checked':link_count,'covers_above_40_words':long_covers,'errors':errors}
(WORK/'verificacao.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
