import json
from pathlib import Path

work=Path(__file__).resolve().parent
archive=work/'historico/antes-beneficios'
archive.mkdir(parents=True,exist_ok=True)
for name in ['novos-relatos.json','manifesto.json','montar-stories.mjs','ampliar-avaliacoes.py','publicacao.txt','fontes-dos-relatos.txt','README.md']:
    source=work/name
    if source.exists() and not (archive/name).exists():
        (archive/name).write_bytes(source.read_bytes())
items=json.loads((archive/'novos-relatos.json').read_text(encoding='utf-8'))
by_id={s['id']:s for s in items}

daniel=by_id['AV08']
daniel.update(context='Organizar as ideias.',slug='daniel-organizacao',sourceStart=1.92,sourceEnd=13.54,sourceTranscript='daniel-beneficios-conferidos.json',quote='Foi um curso que trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na matemática.')

harle=by_id['AV09']
harle.update(context='Mais responsabilidade.',slug='harle-responsabilidade',sourceStart=69.48,sourceEnd=83.24,sourceTranscript='harle-trecho-conferido.json',quoteParts=[
    dict(text='Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer.',start=69.48,end=77.28),
    dict(text='Ele ficou mais',start=78.02,end=78.66),
    dict(text='responsável com as coisas dele.',start=81.52,end=83.24),
])

flavia=by_id['AV10']
flavia.update(context='Fazer por conta própria.',slug='flavia-autonomia',sourceTranscript='flavia-trecho-conferido.json')

items.append(dict(id='AV11',name='Daniel',role='Pai do Rafael',photo='daniel',slug='daniel-criatividade',type='quote',context='Ter ideias para o jogo.',sourceFile=daniel['sourceFile'],sourceStart=25.26,sourceEnd=30.22,sourceTranscript='daniel-beneficios-conferidos.json',quoteParts=[
    dict(text='Vai criando, vai sendo mais criativo.',start=25.26,end=27.92),
    dict(text='‘Eu quero mudar isso aqui no jogo.’',start=28.58,end=30.22),
]))
items.append(dict(id='AV12',name='Flávia',role='Mãe do Fernando',photo='flavia',slug='flavia-criar',type='quote',context='Usar a tela para criar.',sourceFile=flavia['sourceFile'],sourceStart=1.06,sourceEnd=20.14,sourceTranscript='flavia-beneficios-conferidos.json',quoteParts=[
    dict(text='O Fernando passava muito tempo nas telas, mas ele mais assistia, não desenvolvia nada.',start=1.06,end=7.68),
    dict(text='O curso incentivou ele a desenvolver, a programar, não a jogar.',start=15.00,end=20.14),
]))

for s in items:
    if s.get('quoteParts'):
        s['quote']=' '.join(p['text'] for p in s['quoteParts'])
        if s['id']=='AV09':
            a,b,c=s['quoteParts']
            s['quoteMarkup']=a['text']+'<br><br>'+b['text']+' '+c['text']
        else:
            s['quoteMarkup']='<br><br>'.join(p['text'] for p in s['quoteParts'])
    else:
        s['quoteMarkup']=s['quote']
(work/'novos-relatos.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'id':s['id'],'quote':s['quote']} for s in items if s['id'] not in ['AV06','AV07']],ensure_ascii=False))
