from pathlib import Path
import json, math

root=Path.cwd()
base=root/'docs/marketing/kids/comunidade-dos-criadores/instagram'
work=root/'output/instagram/light-copy-2026-10-12'
posts=json.loads((work/'final-posts.json').read_text(encoding='utf-8'))
stories=json.loads((work/'final-stories.json').read_text(encoding='utf-8'))
def q(text): return '\n'.join('> '+line if line else '>' for line in text.split('\n'))+'\n\n'
def write(path,text):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')
def metric(p): return 'Retenção e compartilhamentos/alcance' if p['format']=='Reel' else 'Salvamentos e compartilhamentos/alcance'
def render(p):
    t=f"## {p['id']} · {p['title']}\n\n**Formato:** {p['format']}. **Entrada:** {p['pillar']}. **Entrega da peça:** {p.get('delivery','')}. **Aspecto trabalhado:** {p['skill']} **Intenção ao terminar:** {p['cta']} **Leitura:** {metric(p)}.\n\n"
    if p.get('proof'): t+=f"**Fonte/conferência:** {p['proof']}\n\n"
    if p.get('game_reference'):
        g=p['game_reference']
        t+=f"**Referência para produção:** {g['name']} · {g['extension']}. {g['kind']}. {g['rule']} Ver [mapa de exemplos e limites](08-exemplos-do-estudio.md).\n\n"
    if p.get('slides'):
        t+=f"**Extensão:** {len(p['slides'])} slides.\n\n"
        for i,s in enumerate(p['slides'],1):
            t+=f'### Slide {i}\n\n'+q(s[0]+'\n\n'+s[1])+f'**Visual/alt:** {s[2]}\n\n'
    elif p.get('scenes'):
        t+='**Capa:** '+p['cover']+'\n\n| Tempo | Cena / direção | Sobreposição | Fala completa |\n| --- | --- | --- | --- |\n'
        cursor=0
        for s in p['scenes']:
            secs=s[1]-s[0]
            if not s[4].startswith('[ÁUDIO ORIGINAL]'):
                secs=max(secs,math.ceil(len(s[4].split())/2.3))
            s[0],s[1]=cursor,cursor+secs
            cursor+=secs
            t+=f'| {s[0]}–{s[1]} s | {s[2]} | {s[3]} | {s[4]} |\n'
        p['duration']=cursor
        t+=f"\n**Duração de referência:** {cursor} s. Legendar literalmente as falas; preservar o ritmo dos áudios originais.\n\n**Descrição visual:** {p['visual']}\n\n"
    else:
        t+='### Texto integral da arte\n\n'+q('\n\n'.join(p['text']))+f"**Visual/alt:** {p['visual']}\n\n"
    t+='### Legenda completa\n\n'+q(p['caption'])
    if p.get('dm'):
        t+='### Convite opcional pelo ManyChat\n\nSomente após configurar e testar o fluxo correspondente em [ManyChat](06-manychat.md). A legenda acima é completa e pode ser publicada sem automação. Com o fluxo ativo, acrescentar este parágrafo ao final da legenda:\n\n'+q(p['dm']['cta'])
    if p.get('note'):t+='**Nota interna de produção:** '+p['note']+'\n\n'
    return t

header='Abertura no interesse da família → desenvolvimento de uma ideia → conexão concreta com programação e criação de jogos. A entrega pode ser uma reflexão, curiosidade, história, dica ou experiência; não precisa virar uma tarefa. Quando houver uma dica, ela deve dizer o que fazer e mostrar um exemplo. A apresentação comercial fica nos destaques, fixados e na conversa voluntária pelo direct. As notas são internas; apenas os textos em citação e as falas vão para a publicação.\n\nCarrosséis e imagens: 1080 × 1350. Reels: 1080 × 1920. Cada Visual/alt deve acompanhar a transcrição do texto da arte no texto alternativo final. Cenas encenadas não são prova de resultado de aluno.\n\n'
for i,name in enumerate(['01-p01-a-p10.md','02-p11-a-p20.md','03-p21-a-p30.md']):
    write(base/'postagens'/name,f'# P{i*10+1:02d} a P{i*10+10:02d}: copy e direção completas\n\nRevisão: 12/10/2026. [Calendário e estratégia](../03-postagens.md).\n\n'+header+''.join(render(p) for p in posts[i*10:i*10+10]))
write(base/'postagens/07-extras-para-familias.md','# Seis extras para famílias que já começaram\n\nEstas pautas ficam além dos trinta posts de atração. Respondem a situações de uso das aulas, sem convite de compra. Produzir conforme dúvidas reais da comunidade e capacidade da equipe.\n\n'+header+''.join(render(p) for p in posts[30:]))
t='# Stories: 20 sequências, 60 telas\n\nRevisão: 12/10/2026. Todos são cartelas 1080 × 1920 com texto completo e visual próprio. Não dependem de fala, enquete, resposta automática ou sticker comercial. Se usar vídeo de apoio, manter toda a informação no texto e nenhuma fala adicional. A primeira tela parte da família; a criação aparece como continuação do raciocínio.\n\n'
for sid,pid,title,screens in stories:
    related=next(p for p in posts if p['id']==pid)
    t+=f'## {sid} · {title}\n\n**Conversa relacionada:** {pid}. **Formato:** três cartelas. **Entrega:** {related.get("delivery","")}. **Intenção:** {related["cta"]}\n\n'
    for i,s in enumerate(screens,1):t+=f'### Tela {i}\n\n'+q(s[0]+'\n\n'+s[1])+f'**Visual/alt:** {s[2]}\n\n'
write(base/'postagens/04-stories.md',t)
write(work/'final-posts-normalizados.json',json.dumps(posts,ensure_ascii=False,indent=2)+'\n')
for p in posts:
    public=[]
    if p.get('slides'): public.extend(s[0]+'\n'+s[1] for s in p['slides'])
    elif p.get('scenes'): public.extend([p['cover']]+[s[3]+'\n'+s[4] for s in p['scenes']])
    else:public.extend(p['text'])
    public.append(p['caption'])
    if p.get('dm'):public.append(p['dm']['cta'])
    write(work/'copy-limpa'/f"{p['id']}.txt",'\n\n'.join(public)+'\n')
for sid,_,_,screens in stories:
    write(work/'copy-limpa'/f'{sid}.txt','\n\n'.join(s[0]+'\n'+s[1] for s in screens)+'\n')
print(json.dumps({'posts':len(posts),'principais':30,'extras':6,'stories':len(stories)*3,'reels':{p['id']:p['duration'] for p in posts if 'duration'in p}},ensure_ascii=False))
