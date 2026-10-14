from pathlib import Path
import json
w=Path('output/instagram/light-copy-2026-10-12');base=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
p=json.loads((w/'final-posts.json').read_text(encoding='utf-8'))
for x in p:
    if x['id']=='P01':
        x['slides'][4][2]='Duas capturas reais mostram o personagem em posições diferentes depois de um movimento. O exemplo visual entra apenas neste ponto da conversa.'
        x['caption']+='\n\nAs cenas de família são ilustrações; o exemplo digital é uma demonstração preparada por nós.'
    if x['id']=='P04':x['caption']=x['caption'].replace(', sem precisar começar por um termo técnico','. A ação aparece antes do nome técnico')
    if x['id']=='P05':x['cover']='Uma ideia começou com “e se”.'
    if x['id']=='P17':x['cover']='Uma pequena mudança pode virar uma descoberta.'
    if x['id']=='P29':x['caption']=x['caption'].replace(', sem precisar terminar um projeto inteiro de uma vez','. O projeto pode ganhar forma ao longo de vários momentos')
    if x['id']=='P16':x['caption']=x['caption'].replace('; isso não significa que toda dificuldade será resolvida sozinha ou rapidamente','. A criança pode receber apoio para localizar a dúvida e continuar')
    if x['id']=='P26':x['caption']=x['caption'].replace(' É uma aplicação de contagem dentro da atividade, sem promessa de melhora automática em matemática.',' A contagem ganha uma função dentro da atividade.')
    if x['id']=='P30':x['caption']=x['caption'].replace('Preparar para o futuro, aqui, significa abrir espaço para essas experiências. Não é escolher uma profissão para a criança.','Aprender a entender e construir com tecnologia é uma possibilidade para explorar desde agora.')
(w/'final-posts.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
s=json.loads((w/'final-stories.json').read_text(encoding='utf-8'))
for x in s:
    if x[0]=='ST10':x[3][0][0]='Uma pergunta específica pode fazer a conversa continuar.'
    if x[0]=='ST17':x[3][0][0]='Vale conhecer o que seu filho gosta de encontrar nos jogos.'
(w/'final-stories.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
f=base/'postagens/06-manychat.md';t=f.read_text(encoding='utf-8').replace('Separei três formas de ajudar sem precisar conhecer a resposta.','Separei três formas de participar da busca por uma resposta.');f.write_text(t,encoding='utf-8')
print('Refinamentos de copy aplicados às fontes.')
