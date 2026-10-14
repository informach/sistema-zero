from pathlib import Path
from collections import Counter
import json,re
w=Path(__file__).parent
b=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
p=json.loads((w/'final-posts-normalizados.json').read_text(encoding='utf-8'))
s=json.loads((w/'final-stories.json').read_text(encoding='utf-8'))
def read(path):return path.read_text(encoding='utf-8')
def write(path,t):path.write_text(t,encoding='utf-8')

f=b/'03-postagens.md';t=read(f)
t=t.replace('A peça desenvolve esse interesse e entrega uma orientação.','A peça desenvolve esse interesse e entrega uma ideia que vale a leitura: reflexão, curiosidade, história, dica ou experiência. Não é obrigatório dar uma tarefa. Se a entrega for uma dica, ela precisa mostrar o que fazer; se for uma reflexão, precisa revelar um detalhe que mude o olhar sobre a situação.')
start=t.index('| Semana | ID e abertura |');end=t.index('\n## Stories de apoio',start)
table='| Semana | ID e abertura | Entrega | Formato | Aspecto trabalhado |\n| --- | --- | --- | --- | --- |\n'
for i,x in enumerate(p[:30]):
    fmt=x['format']+(f", {len(x['slides'])} telas" if x.get('slides') else f", {x['duration']} s" if x.get('scenes') else '')
    table+=f"| {i//3+1} | {x['id']} · {x['title']} | {x['delivery']} | {fmt} | {x['skill']} |\n"
t=t[:start]+table+t[end:]
start=t.index('| Semana | Primeira sequência |');end=t.index('\nSão 60 cartelas',start)
table='| Semana | Primeira sequência | Segunda sequência |\n| --- | --- | --- |\n'
for i in range(10):table+=f'| {i+1} | {s[2*i][0]} · {s[2*i][2]} | {s[2*i+1][0]} · {s[2*i+1][2]} |\n'
t=t[:start]+table+t[end:]
start=t.index('## Extras para quem já começou');end=t.index('## Direct e leitura',start)
t=t[:start]+'## Extras para quem já começou\n\n'+''.join(f"- **{x['id']} · {x['title']}** {x['format']}. {x['cta']}\n" for x in p[30:])+'\n'+t[end:]
note='## Critério desta revisão\n\nA capa apresenta uma cena, uma diferença ou uma curiosidade que interessa ao responsável. O desenvolvimento entrega o que a abertura prometeu, sem trocar uma frase vaga por outra. A imagem precisa mostrar o objeto ou a ação citada. Há dicas para usar, reflexões para reconsiderar uma situação, curiosidades para descobrir e histórias para conhecer. O fechamento não exige um exercício em toda peça.\n\n[Revisão completa e exemplos de antes/depois](pesquisas/revisao-clareza-e-interesse-2026-10-12.md).\n\n'
if '## Critério desta revisão' not in t:t=t.replace('## Entregas completas',note+'## Entregas completas')
write(f,t)

f=b/'README.md';t=read(f).replace('Entrega uma orientação e conduz o raciocínio','Entrega uma reflexão, curiosidade, história ou dica clara e conduz o raciocínio')
write(f,t)
f=b/'postagens/05-direcao-visual-e-producao.md';t=read(f)
t=t.replace('O último slide fecha o assunto e traz o próximo passo.','O último slide fecha a ideia. Pode deixar uma reflexão, um convite de conversa ou uma ação; uma tarefa não é obrigatória.')
t=t.replace('P07 mostra uma orientação cotidiana, P24 mostra uma ideia desenhada','P07 mostra a diferença entre concordar e começar, P24 conta uma história em três desenhos')
t=t.replace('P10, P17, P23 e P24','P04, P10, P17 e P24')
t=t.replace('Três ilustrações editoriais foram geradas pela ferramenta integrada, com personagens fictícios, e combinadas com diagramas próprios e capturas reais.','Duas novas ilustrações editoriais foram geradas pela ferramenta integrada, com os mesmos personagens fictícios da versão anterior. A ponte simples e os apoios correspondem à nova explicação. Diagramas próprios mostram duas falhas diferentes, a correção do apoio e uma direção de movimento num jogo conceitual. Esta versão não usa captura da plataforma.')
t=t.replace('Prompts, fontes e montagem ficam na pasta de produção.','Prompts, fontes e montagem ficam na pasta de produção. A versão anterior está guardada no histórico de revisão.')
if '## Entrega editorial e variação' not in t:
    t+='\n## Entrega editorial e variação\n\nA diversidade também está no que a publicação deixa com o pai. Uma reflexão precisa revelar uma diferença concreta, como o trabalho pronto e as decisões que o filho tomou. Uma curiosidade precisa ser visível, como a mesma frase com dois contrastes. Uma dica precisa estar completa, com ação e exemplo. Um relato preserva a experiência de quem falou, sem virar prova de resultado universal. Não forçar um passo a passo, uma lista ou uma chamada comercial em todas as peças.\n'
write(f,t)

f=b/'postagens/06-manychat.md';t=read(f)
t=t.replace('Roteiro para localizar uma dificuldade e escolher a próxima ação','Três perguntas para ajudar quando o filho trava numa tarefa')
t=t.replace('Você pediu um roteiro para encontrar uma próxima tentativa com seu filho.','Você pediu três perguntas para ajudar seu filho quando ele trava numa tarefa.')
t=t.replace('Receber atividade','Receber material')
t=t.replace('para você receber a atividade','para você receber o material').replace('A atividade chega pelo direct.','O material chega pelo direct.').replace('Se quiser receber a atividade,','Se quiser receber o material,')
t=t.replace('A atividade já está completa para vocês experimentarem.','O material já está completo para vocês usarem.')
start=t.index('### M01 · PASSO');end=t.index('## Continuidade comum',start)
deliveries='''### M01 · PASSO

**Mensagem 1**

> Quando seu filho disser “não consigo”, estas três perguntas podem ajudar:
>
> 1. “Me mostra onde deu errado.”
> 2. “O que você acha que dá para mudar aqui?”
> 3. “Depois dessa mudança, o que aconteceu?”
>
> Olhem uma tentativa de verdade. Se ele ainda não conseguir escolher o que fazer, mostre uma possibilidade e ajude a experimentar. A ideia é deixar uma parte da solução com ele.

**Mensagem 2**

> Exemplo: ele montou uma ponte de papel entre dois apoios. Uma ponta escorregou.
>
> Vocês olham onde caiu e ele tenta aproximar os apoios. Depois, confere se as duas pontas ficaram apoiadas. A ajuda partiu de um problema visível.
>
> Ao criar jogos, acontece algo parecido: o personagem foi para o lado errado. A criança muda a direção e testa. Ela pratica investigar uma dificuldade enquanto faz a própria ideia funcionar.

### M02 · APOIO

**Mensagem 1**

> Três formas de participar quando você não sabe a resposta:
>
> 1. Escutar a ideia: “O que você queria que acontecesse?”.
> 2. Experimentar: tente seguir a explicação e conte onde ficou perdido.
> 3. Procurar junto: localizem o trecho da orientação ou a pessoa que pode explicar aquela dúvida.
>
> Você pode ajudar a criança a mostrar o problema, mesmo sem saber resolver a parte técnica.

**Mensagem 2**

> Imagine um labirinto desenhado por ele. Você segue um caminho e para num canto sem saída. Pode apontar: “Achei que passava por aqui”.
>
> Esse retorno ajuda seu filho a explicar outra rota ou perceber que falta uma passagem. Num jogo que ele criou, você também pode ser a primeira pessoa a jogar e contar suas dúvidas. Para participar, não precisa conhecer todos os comandos.

### M03 · IDEIA

**Mensagem 1**

> Façam uma folha com duas colunas: Agora e Depois.
>
> Peça que seu filho conte as ideias e anote todas. Na coluna Agora, escolham só o necessário para uma primeira versão. O restante vai para Depois.
>
> Para uma história, o Agora pode ter um personagem, um problema e uma saída. As outras ideias continuam guardadas para a próxima versão.

**Mensagem 2**

> Exemplo: um cachorro quer sair do quintal, mas o portão está fechado. Ele encontra uma passagem pela cerca. Já existe uma história para desenhar e contar.
>
> O dragão e a nave ficam em Depois. Quando terminar, seu filho decide se ainda quer usá-los.
>
> Ao criar jogos, também dá para começar com um personagem e um objetivo. Antes de construir dez fases, a criança faz uma versão que consegue jogar e melhorar.

### M04 · TESTE

**Mensagem 1**

> Vamos comparar duas versões de uma brincadeira.
>
> Desenhem cinco casas numeradas de 1 a 5 e coloquem uma tampinha antes da primeira. A cada jogada, avancem uma casa. Contem as jogadas até chegar à quinta.
>
> Voltem ao começo. Agora, a casa 2 dá um avanço extra até a casa 3. Mantenham todo o restante igual e contem de novo. Antes de começar, cada um pode dizer se acha que vai precisar de mais ou menos jogadas.

**Mensagem 2**

> Na primeira versão, são cinco jogadas. Na segunda, são quatro: a primeira leva à casa 1; a segunda, à casa 2 e depois à 3 pelo avanço extra; a terceira leva à 4; a quarta, à 5.
>
> Vocês mudaram uma regra e conseguiram observar o efeito. Ao programar jogos, esse cuidado ajuda a criança a investigar: se mudar uma coisa por vez, fica mais claro qual mudança fez diferença.

### M05 · CRIAR

**Mensagem 1**

> Escolham uma proposta que combine com o interesse do seu filho:
>
> Caminhos: desenhem duas casas e uma estrada entre elas. Coloquem um rio no meio. Ele inventa por onde passar e testa com uma tampinha.
>
> Histórias: desenhem três cenas com um personagem, um problema e uma saída. Depois, ele conta a história seguindo os desenhos.
>
> Regras: coloquem dois alvos de papel no chão, um perto e outro longe. Joguem bolinhas de papel. O perto vale um ponto; o longe, dois. Depois, ele escolhe uma regra para mudar e vocês jogam de novo.

**Mensagem 2**

> Conversem sobre o que ele gostou de inventar: o caminho, a história ou a regra. Ele pode se interessar por mais de uma coisa.
>
> Criar jogos na tela permite continuar algumas dessas ideias. A programação faz o personagem agir, a regra valer e a pontuação mudar. As brincadeiras são convites para explorar, sem medir talento nem exigir que ele goste de tudo.

### M06 · ROTINA

**Mensagem 1**

> Um combinado para preencher juntos:
>
> Quando: escolham um momento real, como sábado depois do café, e confiram se o computador estará livre.
>
> Começo: deixem uma primeira ação, como abrir a aula em que parou e montar o próximo passo.
>
> Pausa: guardem o trabalho e anotem o que ficou para continuar.
>
> Volta: leiam a anotação antes de retomar. Ajustem o combinado se ele não couber na semana.

**Mensagem 2**

> Uma anotação pode ser: “O caminho está desenhado. Na volta, vou testar com a tampinha”. Ela guarda uma decisão que a criança já tomou.
>
> No computador, confiram também o salvamento na ferramenta usada. Na atividade do Estúdio dentro da aula, esperem Guardado na sua conta. A anotação ajuda a lembrar; o salvamento preserva o projeto.
>
> Quando a aula pedir Enviar meu projeto, façam também essa entrega.

'''
t=t[:start]+deliveries+t[end:];write(f,t)

f=b/'producao/postagens/README.md';t=read(f)
t=t.replace('P01 · O “não consigo” pode estar escondendo uma dúvida','P01 · A tarefa é do seu filho. Mas é você que acaba fazendo')
t=re.sub(r'P01 usa três ilustrações geradas, diagramas próprios e capturas reais\.', 'P01 usa duas novas ilustrações geradas e diagramas próprios, com o exemplo da ponte de papel e a investigação de um movimento no jogo. A versão anterior está no histórico.',t)
write(f,t)
print('Calendário, guias e seis entregas do direct sincronizados.')
