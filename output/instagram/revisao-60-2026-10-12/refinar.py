from pathlib import Path
import json, re
ROOT=Path(__file__).resolve().parents[3]
BASE=ROOT/'docs/marketing/kids/comunidade-dos-criadores/instagram'
WORK=Path(__file__).resolve().parent
posts=json.loads((WORK/'conteudo.json').read_text(encoding='utf-8'))
changes={
 15:'Ele pede um modelo. A atividade permite inventar.',
 17:'Ele quer começar hoje. Você ainda está terminando o trabalho.',
 43:'Depois do “foi legal”, peça para ver uma descoberta.',
 45:'Ele mudou uma parte e já quer descobrir o resultado.'
}
replacements={}
for n,new in changes.items():
 p=posts[n-1]; old=p['title']; replacements[old]=new; p['title']=new
 p['units']=[[v.replace(old,new) for v in u] for u in p['units']]
posts[44]['units'][0][0]='Ele mudou uma parte e já quer descobrir o resultado.\n\nA curiosidade pode ganhar espaço para virar uma criação.'
# Alinhar a demonstração ao mundo explorável existente.
storypath=WORK/'calendario-stories.json'
stories=json.loads(storypath.read_text(encoding='utf-8'))
stories['stories'][3][2][2][0]='Um jogo pode dar movimento à ideia: quem cria decide o caminho e o que alguém encontra ao explorar aquele lugar.'
storypath.write_text(json.dumps(stories,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for file in [BASE/'03-postagens.md',BASE/'postagens/04-stories.md']:
 text=file.read_text(encoding='utf-8')
 for old,new in replacements.items():text=text.replace(old,new)
 text=text.replace('Um jogo pode dar movimento à ideia: quem cria decide o caminho e o que acontece quando alguém passa por ele.',stories['stories'][3][2][2][0])
 file.write_text(text,encoding='utf-8')
(WORK/'conteudo.json').write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
import renderizar
clean=WORK/'copy-limpa/ST04.txt'
clean.write_text('\n\n'.join([stories['stories'][3][0]]+[u[0] for u in stories['stories'][3][2]])+'\n',encoding='utf-8')
print('Quatro aberturas revisadas; pergunta interna preservada quando útil.')
