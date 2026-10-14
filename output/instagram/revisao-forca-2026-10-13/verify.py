from pathlib import Path
import sys,re,json,subprocess
if '--disk' not in sys.argv:
    import lote01,lote02,lote03,lote04,lote05,lote06,stories,polish
from edit import *

clean=OUT/'copy-limpa'
clean.mkdir(exist_ok=True)
files=[]
issues=[]
stats={'carrosseis':0,'reels':0,'imagens':0,'sequencias':0,'telas':0}
reels=[]
long_screens=[]
for ident,b in chunks.items():
    captions=re.findall(r'^>[^\n]*(?:\n>[^\n]*)*',b,re.M)
    for idx,part in enumerate(captions):
        value=re.sub(r'^> ?', '',part,flags=re.M)
        f=clean/f'{ident}-{idx+1:02}.txt'
        f.write_text(value,encoding='utf-8')
        files.append(str(f))
        if idx<len(captions)-1 or ident.startswith('ST'):
            if len(value.split())>42:long_screens.append([ident,idx+1,len(value.split())])
    if ident.startswith('ST'):
        stats['sequencias']+=1
        stats['telas']+=len(re.findall(r'^### Tela \d+',b,re.M))
        if len(captions)!=4:issues.append(f'{ident}: telas incompletas')
        if any('@criecomhelenaejulio' in c for c in captions):issues.append(f'{ident}: CTA seguir indevido')
    else:
        assert re.search(rf'\*\*Necessidade:\*\* {"D" if int(ident[1:])<=30 else "W"}{int(ident[1:]) if int(ident[1:])<=30 else int(ident[1:])-30:02}',b),ident
        count=len(re.findall(r'^### Slide \d+',b,re.M))
        if count:
            stats['carrosseis']+=1
            declared=int(re.search(r'Carrossel, (\d+) slides',b)[1])
            if count!=declared:issues.append(f'{ident}: {count} slides; declarado {declared}')
        elif '**Capa do Reel:**' in b:
            stats['reels']+=1
            rows=[x.split('|')[1:-1] for x in b.splitlines() if re.match(r'^\| \d',x)]
            speech='\n\n'.join(x[2].strip() for x in rows)
            f=clean/f'{ident}-fala.txt';f.write_text(speech,encoding='utf-8');files.append(str(f))
            overlay='\n\n'.join(x[1].strip() for x in rows)
            f=clean/f'{ident}-tela.txt';f.write_text(overlay,encoding='utf-8');files.append(str(f))
            end=int(re.search(r'–(\d+) s',rows[-1][0])[1])
            reels.append({'id':ident,'palavras':len(speech.split()),'segundos':end,'ppm':round(len(speech.split())/end*60)})
            if end<30 or len(speech.split())/end>2.7:issues.append(f'{ident}: ritmo muito rápido ou estimativa curta')
        else:stats['imagens']+=1
        last=re.sub(r'^> ?', '',captions[-1],flags=re.M).strip().splitlines()[-1]
        if not last.startswith('Siga @criecomhelenaejulio'):issues.append(f'{ident}: CTA final legenda')
        if count and '@criecomhelenaejulio' not in captions[-2]:issues.append(f'{ident}: CTA final carrossel')
        if any(re.search(r'Farol|link da bio|comente [“\"]?[A-Z]{4}',x) for x in captions):issues.append(f'{ident}: possível desvio de categoria')

reports=[]
for start in range(0,len(files),60):
    r=subprocess.run(['bun',str(ROOT/'.agents/skills/revisao-copy/scripts/check-copy.ts'),*files[start:start+60]],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
    if r.returncode not in (0,1):raise RuntimeError(r.stderr or r.stdout)
    reports.extend(json.loads(r.stdout))
lint=[{'file':Path(x['file']).name,'issues':x['issues']} for x in reports if x.get('issues')]
report={'estrutura':stats,'problemas':issues,'lint':lint,'telas_acima_42_palavras':long_screens,'reels':reels,'unidades_publicas_verificadas':len(files)}
(OUT/('verificacao-final.json' if '--disk' in sys.argv else 'verificacao-previa.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'estrutura':stats,'problemas':issues,'ocorrencias_linter':len(lint),'telas_acima_42_palavras':long_screens,'reels':{'min_segundos':min(x['segundos'] for x in reels),'max_segundos':max(x['segundos'] for x in reels),'min_palavras':min(x['palavras'] for x in reels),'max_palavras':max(x['palavras'] for x in reels)},'unidades_publicas_verificadas':len(files)},ensure_ascii=False,indent=2))
