from pathlib import Path
import re, json, math

root=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
work=Path('output/instagram/calendario-30-2026-10-11')
ids=[]; formats={}; reels=[]; public=[]
calendar=(root/'03-postagens.md').read_text(encoding='utf-8')
for p in sorted((root/'postagens').glob('0[1-3]-*.md')):
    parts=re.split(r'(?m)(?=^## P\d\d)',p.read_text(encoding='utf-8'))
    for i,b in enumerate(parts[1:],1):
        pid=re.search(r'^## (P\d\d)',b).group(1); ids.append(pid)
        fmt=re.search(r'\*\*Formato:\*\* ([^.,]+)',b).group(1).lower()
        formats[pid]=fmt
        assert 'Legenda completa' in b and ('Visual/alt' in b or 'Descrição visual' in b), pid
        if fmt=='reel':
            end=0; words=0; timings=[]
            def scene(m):
                global end, words
                line=m.group(0); cols=line.split('|'); speech=re.sub(r'^(Helena|Júlio|Flávia|Daniel):\s*','',cols[-2].strip())
                n=len(re.findall(r'\b[\wÀ-ÿ]+\b',speech)); words+=n
                duration=math.ceil(n/2.5)+1
                if pid=='P05' and end==0: duration=7
                if pid=='P20' and end==0: duration=8
                start=end;end+=duration;cols[1]=f' {start}–{end} s '
                timings.append({'start':start,'end':end,'words':n})
                return '|'.join(cols)
            b=re.sub(r'^\| \d+–\d+ s \|.*$',scene,b,flags=re.M)
            high=math.ceil(end/5)*5+5;low=high-10
            b=re.sub(r'\*\*Formato:\*\* Reel, \d+–\d+ s\.',f'**Formato:** Reel, {low}–{high} s.',b)
            calendar=re.sub(rf'(\| [^\n]+\| {pid} [^\n]+\| Reel, )\d+–\d+ s',rf'\g<1>{low}–{high} s',calendar)
            reels.append({'id':pid,'words':words,'duration':[low,high],'scenes':timings})
            parts[i]=b
        else:
            count=len(re.findall(r'^### Slide \d+$',b,re.M))
            if fmt=='carrossel': assert count in (5,6),(pid,count)
        for line in b.splitlines():
            if line.startswith('> '):public.append(line[2:])
            elif re.match(r'^\| \d+–',line):public.extend(c.strip() for c in line.split('|')[3:-1])
        cover=re.search(r'\*\*Capa:\*\* (.+)',b)
        if cover:public.append(cover.group(1))
    p.write_text(''.join(parts),encoding='utf-8')
(root/'03-postagens.md').write_text(calendar,encoding='utf-8')
story=(root/'postagens/04-stories.md').read_text(encoding='utf-8')
sts=re.findall(r'^## (ST\d\d)',story,re.M)
screens=re.findall(r'^\| [123] \|',story,re.M)
for b in re.split(r'(?m)(?=^## ST\d\d)',story)[1:]:
    assert len(re.findall(r'^\| [123] \|',b,re.M))==3
    for l in b.splitlines():
        if re.match(r'^\| [123] \|',l):
            cols=l.split('|');public.append(cols[2].strip())
            for sticker in re.findall(r'(?:Enquete|Caixa de perguntas|Opções|Sticker): ([^|]+)',cols[3]):public.append(sticker)
assert ids==[f'P{n:02}' for n in range(1,31)]
assert sts==[f'ST{n:02}' for n in range(1,21)] and len(screens)==60
totals={f:list(formats.values()).count(f) for f in set(formats.values())}
assert totals=={'carrossel':14,'reel':10,'imagem única':6},totals
(work/'copy-publica.txt').write_text('\n\n'.join(public),encoding='utf-8')
report={'posts':30,'formats':totals,'story_sequences':20,'story_screens':60,'reels':reels}
(work/'verificacao-editorial.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'posts':30,'formats':totals,'story_screens':60,'reels':[{'id':r['id'],'words':r['words'],'duration':r['duration']} for r in reels]},ensure_ascii=False))
