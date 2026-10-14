from pathlib import Path
import json, re, math, unicodedata

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'docs/marketing/kids/comunidade-dos-criadores/instagram'
WORK = Path(__file__).resolve().parent
posts = json.loads((WORK / 'conteudo.json').read_text(encoding='utf-8'))
files = ['01-p01-a-p10.md', '02-p11-a-p20.md', '03-p21-a-p30.md', '09-p31-a-p40.md', '10-p41-a-p50.md', '11-p51-a-p60.md']
ctas = {
 'IDEIA': 'Comente IDEIA para receber um roteiro curto para ajudar seu filho a escolher o primeiro pedaço de uma criação.',
 'TESTE': 'Comente TESTE para receber três perguntas para investigar uma tentativa que não funcionou.',
 'PASSO': 'Comente PASSO para receber três perguntas para ajudar seu filho a começar uma tarefa.',
 'APOIO': 'Comente APOIO para receber três formas de acompanhar uma dúvida de programação.',
 'ROTINA': 'Comente ROTINA para receber um combinado de começo, pausa e retomada.',
 'CRIAR': 'Comente CRIAR para receber três convites para descobrir o que seu filho gostaria de criar.'
}

def write(path, text):
 path.parent.mkdir(parents=True, exist_ok=True)
 path.write_text(text.rstrip()+'\n', encoding='utf-8')

def quote(text):
 return '\n'.join('> '+line if line else '>' for line in text.split('\n'))+'\n\n'

def cover(p, text):
 norm=lambda s: ' '.join(s.split())
 return text if p.get('artUsesTitle') is False or norm(text).startswith(norm(p['title'])) else p['title']+'\n\n'+text

def anchor(p): return f'p{p["n"]:02d}'
def link(p): return f'postagens/{files[(p["n"]-1)//10]}#{anchor(p)}'
def need(p): return f'D{p["n"]:02d}' if p['n'] <= 30 else f'W{p["n"]-30:02d}'

research={}
for line in (BASE/'pesquisas/30-dores-e-30-desejos-2026-10-12.md').read_text(encoding='utf-8').splitlines():
 if re.match(r'\| [DW]\d{2} \|',line):
  fields=[v.strip() for v in line.strip('|').split('|')]
  research[fields[0]]=fields[1:]

for batch, filename in enumerate(files):
 selected=posts[batch*10:(batch+1)*10]
 text=f'# P{selected[0]["n"]:02d} a P{selected[-1]["n"]:02d}: copies completas\n\n'
 text+='**Revisão: 12/10/2026.** Uma peça principal por necessidade. [Calendário](../03-postagens.md) · [Cobertura das 60 necessidades](12-mapa-cobertura.md) · [Direção visual](05-direcao-visual-e-producao.md) · [Bases dos jogos](08-exemplos-do-estudio.md).\n\n'
 text+='Os textos em citação e as falas são a copy pública. Metadados e direções são internos. Carrosséis e imagens: 1080 × 1350, 4:5. Reels: 1080 × 1920. As cenas familiares propostas são situações encenadas; os cinco depoimentos identificados usam os registros reais. A mídia ainda será produzida.\n\n'
 for p in selected:
  nid=need(p); r=research[nid]; evidence=r[2]
  text+=f'<a id="{anchor(p)}"></a>\n\n## P{p["n"]:02d} · {p["title"]}\n\n'
  text+=f'**Necessidade principal:** {nid} · {r[0]}\n\n**Base da pesquisa:** {evidence}\n\n'
  text+=f'**Formato:** {p["format"]}. **Entrega:** {p["kind"]}. **Intenção ao terminar:** {p["goal"]}\n\n'
  text+=f'**Exemplo ou fonte visual:** {p["game"]}. **Destino principal:** a própria peça; não exige abrir a oferta para compreender a ideia.\n\n'
  public=[p['title']]
  if p['format']=='Carrossel':
   text+=f'**Extensão:** {len(p["units"])} slides.\n\n'
   for i,unit in enumerate(p['units'],1):
    body=cover(p,unit[0]) if i==1 else unit[0]
    text+=f'### Slide {i}\n\n'+quote(body)+f'**Visual/alt:** {unit[1]}\n\n'
    public.append(body)
  elif p['format']=='Imagem única':
   body=cover(p,p['units'][0][0])
   text+='### Texto integral da arte\n\n'+quote(body)+f'**Visual/alt:** {p["units"][0][1]}\n\n'
   public.append(body)
  else:
   text+='**Capa:** '+p['title']+'\n\n| Tempo de referência | Cena / direção | Texto sobreposto | Fala completa |\n| --- | --- | --- | --- |\n'
   elapsed=0
   for i,unit in enumerate(p['units']):
    secs=max(5,math.ceil(len(unit[0].split())/2.25)+1)
    if p['n']==32 and i==1: secs=9
    if p['n']==41 and i==1: secs=7
    overlay=unit[2] if len(unit)>2 else ''
    row=[f'{elapsed}–{elapsed+secs} s',unit[1],overlay,unit[0]]
    text+='| '+' | '.join(v.replace('|','/').replace('\n','<br>') for v in row)+' |\n'
    elapsed+=secs
    public += [overlay,unit[0]]
   text+=f'\n**Duração de referência:** {elapsed} s. Ajustar à leitura natural; preservar os áudios originais dos relatos. Legendar todas as falas.\n\n'
   text+='**Descrição visual:** '+' '.join(u[1] for u in p['units'])+'\n\n'
  text+='### Legenda completa\n\n'+quote(p['caption'])
  public.append(p['caption'])
  if p.get('cta'):
   text+='### Convite opcional pelo ManyChat\n\nAcrescentar ao final da legenda apenas depois de configurar e testar a entrada correspondente. A legenda principal funciona sozinha.\n\n'+quote(ctas[p['cta']])
   public.append(ctas[p['cta']])
  text+='**Nota interna de produção:** '+p['note']+'\n\n'
  text+='**Acessibilidade:** na arte final, transcrever o texto e descrever a cena efetivamente produzida. A indicação Visual/alt orienta a produção; conferir o texto alternativo depois da composição.\n\n---\n\n'
  write(WORK/'copy-limpa'/f'P{p["n"]:02d}.txt','\n\n'.join(public))
 write(BASE/'postagens'/filename,text)

matrix='# Mapa de cobertura: 30 dores e 30 desejos\n\n**Revisão: 12/10/2026.** Cada necessidade tem uma publicação principal exclusiva. São 60 peças, sem contar os fixados, destaques, seis extras ou stories. O número do post é um identificador; a ordem de publicação está no [calendário](../03-postagens.md).\n\n'
matrix+='[Pesquisa original](../pesquisas/30-dores-e-30-desejos-2026-10-12.md) · [Fontes e limites](../pesquisas/fontes-mercado-avatar-2026-10-12.md). R identifica relato ou necessidade registrada; I, interpretação; H, hipótese a validar. Esses níveis descrevem a base da necessidade, não a eficácia da programação como resposta. Não representam frequência na população.\n\n'
for label, subset in [('Dores', posts[:30]),('Desejos',posts[30:])]:
 matrix+=f'## {label}\n\n| Necessidade | Publicação e abertura | Formato e entrega | O que a peça acrescenta |\n| --- | --- | --- | --- |\n'
 for p in subset:
  r=research[need(p)]; status=re.search(r'\*\*([RIH])',r[2]).group(1)
  matrix+=f'| **{need(p)} · {status}** · {r[0]} | [P{p["n"]:02d} · {p["title"]}]({files[(p["n"]-1)//10]}#{anchor(p)}) | {p["format"]} · {p["kind"]} | {p["goal"]} |\n'
 matrix+='\n'
matrix+='## Necessidades próximas, argumentos diferentes\n\n'
matrix+='- **D01 / W01:** P01 abre espaço para a criação no uso da tela; P31 mostra como reconhecer uma escolha própria.\n- **D06 / W02:** P06 torna o começo mais claro; P32 apresenta a iniciativa observada por Harle, sem prometer o mesmo resultado a todas as famílias.\n- **D11 / W07:** P11 reduz o tamanho da primeira construção; P37 ajuda a representar a sequência de uma ideia.\n- **D12 / W06:** P12 orienta o adulto diante do pedido de socorro; P36 mostra como comparar duas tentativas.\n- **D18 / W28:** P18 ajuda a dimensionar o acompanhamento; P58 dá ao responsável uma forma de participar mantendo a criação nas mãos da criança.\n- **D24 / W26:** P24 organiza horário e equipamento; P56 prepara a retomada depois de uma pausa.\n- **D25 / W25:** P25 trata do risco de assumir meses de contrato; P55 oferece critérios para observar uma primeira experiência.\n- **D26 / W23:** P26 ajuda a investigar o que a criança entendeu; P53 dá espaço à conquista que ela quer compartilhar.\n\n'
matrix+='## Hipóteses e leitura editorial\n\nD08/P08, D09/P09, D10/P10, D13/P13, D15/P15, W08/P38, W15/P45 e W18/P48 são hipóteses da pesquisa. As peças abordam situações possíveis e convites de conversa; não afirmam que essas características definem todas as crianças ou que criar jogos corrige atenção, autoestima ou desempenho escolar. Observar se responsáveis reconhecem espontaneamente a situação e o que acrescentam. Curtidas não validam prevalência nem efeito pedagógico.\n'
write(BASE/'postagens/12-mapa-cobertura.md',matrix)
print(json.dumps({'posts':len(posts),'copy_files':files,'coverage':len(research)},ensure_ascii=False))
