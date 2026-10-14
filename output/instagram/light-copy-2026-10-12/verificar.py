from pathlib import Path
from collections import Counter
from urllib.parse import urlparse,parse_qs,unquote
import json,re,struct,subprocess
b=Path('docs/marketing/kids/comunidade-dos-criadores/instagram');w=Path('output/instagram/light-copy-2026-10-12')
p=json.loads((w/'final-posts-normalizados.json').read_text(encoding='utf-8'));s=json.loads((w/'final-stories.json').read_text(encoding='utf-8'))
issues=[]
def check(ok,msg):
    if not ok:issues.append(msg)
check(len(p)==36 and len({x['id'] for x in p})==36,'36 posts distintos')
check(Counter(x['format'] for x in p[:30])=={'Carrossel':14,'Reel':10,'Imagem única':6},'Mix dos trinta principais')
check(len(s)==20 and sum(len(x[3])for x in s)==60,'60 stories')
docs=[b/'postagens'/x for x in ['01-p01-a-p10.md','02-p11-a-p20.md','03-p21-a-p30.md','07-extras-para-familias.md']]
allcopy='\n'.join(x.read_text(encoding='utf-8')for x in docs)
for x in p:
    check(allcopy.count('## '+x['id']+' · ')==1,'ID sem duplicação '+x['id'])
    check('> '+x['caption'].split('\n')[0] in allcopy,'Legenda '+x['id'])
    if x['format']=='Carrossel':check(all(len(z)>=3 and all(z[:3])for z in x['slides']),'Slides completos '+x['id'])
    if x['format']=='Reel':
        check(all(z[0]<z[1]and all(z[2:])for z in x['scenes']),'Cenas completas '+x['id'])
        check(all(i==0 or z[0]==x['scenes'][i-1][1]for i,z in enumerate(x['scenes'])),'Tempo contínuo '+x['id'])
        check(all(z[4].startswith('[ÁUDIO ORIGINAL]')or len(z[4].split())/(z[1]-z[0])<=2.31 for z in x['scenes']),'Tempo de fala '+x['id'])
for needle in ['Vai criando, vai sendo mais criativo. “Eu quero mudar isso aqui no jogo.”','No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.','Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.','Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.']:
    check(needle in allcopy,'Depoimento preservado: '+needle[:30])
main='\n'.join((w/'copy-limpa'/f'P{i:02d}.txt').read_text(encoding='utf-8')for i in range(1,31))
check(not re.search(r'link da bio|\bcompre\b|pagamento único|30 dias de acesso',main,re.I),'Feed sem oferta direta')
check(not re.search(r'farol|ponte de papel|tampinha|investigação também cabe',main,re.I),'Exemplos públicos variados e situações atuais')
refs=[x['game_reference'] for x in p[:30] if x.get('game_reference')]
check(len(refs)==27 and len({x['key']for x in refs})==11,'27 referências distribuídas em 11 bases')
check(len({x['extension']for x in refs})==4,'Quatro extensões')
for r in refs:check(Path(r['source']).is_file(),'Fonte de exemplo existe: '+r['name'])
cal=(b/'03-postagens.md').read_text(encoding='utf-8')
for x in p[:30]:check(x['id']+' · '+x['title']in cal,'Título do calendário '+x['id'])
dm=(b/'postagens/06-manychat.md').read_text(encoding='utf-8')
for i,x in enumerate([x for x in p if 'dm'in x],1):
    check(f"### M{i:02d} · {x['dm']['word']}"in dm,'Entrega do convite '+x['id'])
    start=dm.index(f"### M{i:02d} · {x['dm']['word']}")
    block=dm[start:].split('\n### M',1)[0].split('\n## Continuidade',1)[0]
    check(block.count('**Mensagem ')==2,'Dois blocos completos de direct '+x['id'])
check('brincadeira de comparar tentativas'not in main.lower(),'Promessa TESTE atualizada')
check(not re.search(r'ponte de papel|tampinha|labirinto desenhado',dm,re.I),'Direct sem as atividades substituídas')
check(sum('dm'in x for x in p)==6,'Seis entradas de direct')
storydoc=(b/'postagens/04-stories.md').read_text(encoding='utf-8')
check(len(re.findall(r'^### Tela ',storydoc,re.M))==60,'60 telas nos documentos')
check(not re.search(r'farol|ponte de papel|tampinha',storydoc,re.I),'Stories sem repetição dos exemplos substituídos')
links=(b/'apoio/links-e-publicacao.md').read_text(encoding='utf-8')
dmurls=re.findall(r'`(https://[^`]+utm_medium=dm[^`]+)`',links)
check(len(dmurls)==12 and len(set(dmurls))==12,'12 URLs de direct distintas')
for u in dmurls:
    query=parse_qs(urlparse(u).query)
    check(all(query.get(k) for k in ['utm_source','utm_medium','utm_campaign','utm_content']),'UTM completa')
    check('/oferta'in urlparse(u).path,'Oferta direta')
research=(b/'pesquisas/kodland-50-publicacoes-2026-10-12.md').read_text(encoding='utf-8')
urls=re.findall(r'\[Publicação original\]\((https://www.instagram.com/[^)]+)\)',research)
check(len(urls)==50 and len(set(urls))==50,'50 publicações originais distintas')
check(len(re.findall(r'^### K\d\d ',research,re.M))==50,'50 fichas individuais')
art=b/'producao/postagens/p01-nao-consigo'
check((art/'legenda.txt').read_text(encoding='utf-8').strip()==p[0]['caption'],'Legenda P01 sincronizada')
for i in range(1,7):
    data=(art/f'{i:02d}-p01.png').read_bytes();size=struct.unpack('>II',data[16:24]);check(size==(1080,1350),'PNG 4:5 '+str(i))
layout=json.loads((art/'apoio/verificacao-layout.json').read_text(encoding='utf-8'));check(len(layout)==6 and all(x['passed']for x in layout),'Layout dos seis slides')
# Links locais apenas do conjunto vigente; fontes externas têm conferência no relatório.
active=[b/'README.md',b/'03-postagens.md',b/'apoio/links-e-publicacao.md',b/'producao/postagens/README.md',*list((b/'postagens').glob('*.md')),b/'pesquisas/kodland-50-publicacoes-2026-10-12.md',b/'pesquisas/light-copy-valor-e-persuasao-2026-10-12.md']
for f in active:
    for link in re.findall(r'\[[^\]]+\]\(([^)]+)\)',f.read_text(encoding='utf-8')):
        if '://'in link or link.startswith('#'):continue
        target=unquote(link.split('#')[0]);check((f.parent/target).exists(),f'Link local ausente {f.name}: {link}')
files=sorted((w/'copy-limpa').glob('*.txt'))
lint=subprocess.run(['bun','.agents/skills/revisao-copy/scripts/check-copy.ts',*[str(f)for f in files]],capture_output=True,text=True,encoding='utf-8')
write=lambda f,t:f.write_text(t,encoding='utf-8')
write(w/'lint.json',lint.stdout)
check(lint.returncode==0,'Lint da copy')
report={'posts_principais':30,'extras':6,'mix_principais':dict(Counter(x['format']for x in p[:30])),'stories':60,'exemplos_distintos':len({x['key']for x in refs}),'extensoes':len({x['extension']for x in refs}),'posts_com_referencia':len(refs),'kodland_urls_distintas':len(set(urls)),'entradas_manychat':6,'urls_oferta_direct':len(dmurls),'pngs_4_5':6,'lint_pecas':len(files),'issues':issues,'limits':['Pesquisa de Reels por legenda e três quadros; áudio não transcrito integralmente.','Mídias P02–P30, E01–E06 e ST01–ST20 ainda não produzidas.','Exemplos do Estúdio conferidos no catálogo e código; execução e captação de cada variante ainda pendentes.','ManyChat só planejado; nenhum envio, integração ou teste remoto realizado.','Nenhuma publicação, commit, push ou deploy.']}
write(w/'verificacao-final.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(issues))
