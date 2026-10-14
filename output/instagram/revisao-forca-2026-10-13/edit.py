from pathlib import Path
import re, json, math, hashlib

ROOT = Path(__file__).resolve().parents[3]
IG = ROOT / 'docs/marketing/kids/comunidade-dos-criadores/instagram'
OUT = Path(__file__).resolve().parent
NAMES = ['01-p01-a-p10.md','02-p11-a-p20.md','03-p21-a-p30.md','09-p31-a-p40.md','10-p41-a-p50.md','11-p51-a-p60.md','04-stories.md']
original = {n:(IG/'postagens'/n).read_text(encoding='utf-8') for n in NAMES}
chunks, owners, heads, changes = {}, {}, {}, []
for name, text in original.items():
    split = re.split(r'(?=^<a id="(?:p|st)\d+"></a>)', text, flags=re.M)
    heads[name] = split[0]
    for block in split[1:]:
        ident = re.match(r'<a id="([^"]+)',block).group(1).upper()
        chunks[ident] = block
        owners[ident] = name

def textquote(s):
    return '\n'.join('> '+x if x else '>' for x in s.strip().split('\n'))

def q(ident, section, value):
    b=chunks[ident]
    pattern = rf'(^### {re.escape(section)}(?: ·[^\n]*)?\n)(.*?)(?=^### |\Z)'
    found=re.search(pattern,b,re.M|re.S)
    assert found, (ident,section)
    part=found.group(2)
    part,n=re.subn(r'^>[^\n]*(?:\n>[^\n]*)*',lambda m:textquote(value),part,count=1,flags=re.M)
    assert n == 1, (ident,section)
    chunks[ident]=b[:found.start(2)]+part+b[found.end(2):]
    changes.append([ident,section])

def cap(ident, value): q(ident,'Legenda',value)
def slide(ident,n,value): q(ident,f'Slide {n}',value)
def story(ident,n,value): q(ident,f'Tela {n}',value)
def art(ident,value): q(ident,'Arte',value)

def title(ident,value):
    chunks[ident],n=re.subn(rf'^## {ident} ·[^\n]*',f'## {ident} · {value}',chunks[ident],count=1,flags=re.M)
    assert n==1
    if '**Capa do Reel:**' in chunks[ident]:
        chunks[ident]=re.sub(r'^\*\*Capa do Reel:\*\*[^\n]*',f'**Capa do Reel:** {value}',chunks[ident],flags=re.M)

def rep(ident, old, new):
    assert old in chunks[ident], (ident,old[:80])
    chunks[ident]=chunks[ident].replace(old,new)
    changes.append([ident,'trecho'])

def note(ident,value):
    chunks[ident],n=re.subn(r'^\*\*O que mudou:\*\*[^\n]*',f'**O que mudou nesta revisão:** {value}',chunks[ident],count=1,flags=re.M)
    assert n == 1, ident

def reel(ident,rows):
    lines=['| Tempo | Texto na tela | Fala | Cena |','| --- | --- | --- | --- |']
    sec=0
    for overlay,speech,scene in rows:
        duration=max(4,math.ceil(len(speech.split())/2.6+1.5))
        lines.append(f'| {sec}–{sec+duration} s | {overlay} | {speech} | {scene} |')
        sec+=duration
    chunks[ident],n=re.subn(r'^\| Tempo \| Texto na tela \| Fala \| Cena \|\n(?:\|[^\n]*\n)+',lambda m:'\n'.join(lines)+'\n',chunks[ident],count=1,flags=re.M)
    assert n == 1, ident
    chunks[ident]=re.sub(r'Reel, cerca de \d+ s',f'Reel, cerca de {sec} s',chunks[ident])
    changes.append([ident,'roteiro e tempos'])

def finish():
    snapshot=OUT/'antes.json'
    assert not snapshot.exists(), 'Não sobrescrever a versão anterior da revisão.'
    for name, value in original.items():
        assert (IG/'postagens'/name).read_text(encoding='utf-8') == value, ('Arquivo mudou durante a revisão',name)
    snapshot.write_text(json.dumps(original,ensure_ascii=False,indent=2),encoding='utf-8')
    for name in NAMES:
        text=heads[name]+''.join(b for ident,b in chunks.items() if owners[ident]==name)
        text=text.replace('Copy reescrita pela [régua de copy]', 'Copy refinada em 13/10, preservando a força dos ganchos. Direção na [régua de copy]')
        (IG/'postagens'/name).write_text(text,encoding='utf-8')
    for relative in ['03-postagens.md','postagens/12-mapa-cobertura.md']:
        path=IG/relative
        value=path.read_text(encoding='utf-8')
        for ident,b in chunks.items():
            if ident.startswith('ST'): continue
            newtitle=re.search(rf'^## {ident} · (.*)$',b,re.M).group(1)
            value=re.sub(rf'\[{ident} · [^\]]*\]',lambda m:f'[{ident} · {newtitle}]',value)
        path.write_text(value,encoding='utf-8')
    (OUT/'alteracoes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'posts':len({p for p,s in changes if p.startswith('P')}),'stories':len({p for p,s in changes if p.startswith('ST')}),'ajustes':len(changes)}))
