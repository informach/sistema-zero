from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[3]
BASE=ROOT/'docs/marketing/kids/comunidade-dos-criadores/instagram'
WORK=Path(__file__).resolve().parent
path=WORK/'conteudo.json'
posts=json.loads(path.read_text(encoding='utf-8'))
new_titles={22:'Duas crianças de 12 anos podem precisar de começos diferentes.',41:'Ele passou a seguir as aulas com menos ajuda da mãe.',46:'Hoje ele aprende uma ferramenta. Amanhã vai encontrar outras.',57:'Seu filho travou. Saber onde pedir ajuda faz diferença.'}
calendar=(BASE/'03-postagens.md').read_text(encoding='utf-8')
for n,title in new_titles.items():
 p=posts[n-1]; old=p['title']; p['title']=title
 p['units']=[[v.replace(old,title) for v in u] for u in p['units']]
 calendar=calendar.replace(old,title)
posts[24]['units']=[
 ['A empolgação do primeiro dia ainda não conta os próximos meses.','Criança conta algo de que gostou; adulto olha o período de contratação, sem expressão de medo.'],
 ['Se o acesso dura vários meses, confira o compromisso inteiro: valor total, prazo e como encerrar. Uma parcela pequena pode fazer parte de um contrato longo.','Comparação editorial entre valor da parcela e período contratado, sem preços inventados.'],
 ['A conversa com seu filho também pode ir além do “gostou?”. Peça que conte o que quer tentar na próxima vez.','Adulto escuta; criança aponta uma ideia para continuar.'],
 ['Criar jogos dá um motivo concreto para voltar quando existe uma ideia em andamento: ele quer mudar a velocidade da bola e conferir a diferença.','Quebra-blocos: anotação de próxima mudança e versões de velocidade preparadas pela equipe.'],
 ['Essa vontade é uma pista para acompanhar. Não é garantia de interesse por meses.','Rascunho de ideia, sem calendário cheio de presenças fictícias.'],
 ['Escolha um compromisso que faça sentido para vocês hoje. A vontade de continuar e as condições do acesso entram na mesma decisão.','Família conversa sobre agenda e contratação, sem CTA de compra.']
]
posts[24]['caption']='A animação da primeira experiência ajuda a conhecer o interesse da criança. O período contratado merece uma conversa própria.\n\nConfira o total, a duração do acesso e as regras de continuidade. Uma cobrança em parcelas pode estar ligada a um compromisso pelo período inteiro.\n\nNa criação de jogos, observe também se seu filho tem uma ideia que quer continuar construindo. Essa vontade é uma pista para considerar junto da rotina e das condições da contratação.'
posts[28]['units'][0][0]='Seu filho pode aprender tecnologia antes de escolher uma profissão.\n\nMontar uma regra. Testar uma ideia. Descobrir o que mudar.'
posts[33]['units'][0][0]='“Eu quero mudar isso aqui no jogo.” A ideia veio dele.\n\nDaniel, pai do Rafael, contando uma fala do filho.'
posts[34]['units'][1][0]='“Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.”\n\nJeffrey · Aluno'
posts[34]['units'][3][0]='As regras fazem a ideia acontecer. Numa aventura, o personagem pode cortar o mato para abrir passagem. Quem cria precisa programar essa reação.'
posts[34]['units'][4][0]='Quem joga conhece uma parte daquilo que ela imaginou. Você pode começar pedindo que conte a história por trás de uma escolha.'
posts[35]['units'][0][0]='O texto do cartaz ficou difícil de ler. Seu filho muda a cor, o tamanho e a posição. Melhorou, mas qual mudança ajudou?'
posts[35]['units'][0][1]='Júlio mostra cartaz de apresentação escolar feito para a peça, com três alterações simultâneas no título.'
posts[59]['caption']=posts[59]['caption'].replace('O valor precisa aparecer na vida que vocês conseguem viver.', 'A atividade precisa caber na rotina e no interesse do seu filho.')
path.write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(BASE/'03-postagens.md').write_text(calendar,encoding='utf-8')
import renderizar
print('Argumentos e identificação das falas revisados.')
