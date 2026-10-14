from pathlib import Path
import json, re, shutil, subprocess

w=Path(__file__).parent
b=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
read=lambda f:f.read_text(encoding='utf-8')
def write(f,t):
    f.parent.mkdir(parents=True,exist_ok=True)
    f.write_text(t,encoding='utf-8')
def dump(f,t):write(f,json.dumps(t,ensure_ascii=False,indent=2)+'\n')

p=json.loads(read(w/'final-posts.json'));s=json.loads(read(w/'final-stories.json'))
by={x['id']:x for x in p}
by['P16']['dm']['cta']='Comente TESTE para receber pelo direct três perguntas para investigar uma tentativa que não funcionou, com um exemplo.'
by['P25']['dm']['cta']='Comente CRIAR para receber pelo direct três convites para conversar sobre o que seu filho gostaria de criar.'
by['P01']['slides'][4][0]='Criar um jogo exige colocar as ideias em ordem.'
by['P04']['slides'][4][0]='No jogo de fazenda, a ordem faz a diferença.'
by['P15']['slides'][4][0]='Quem cria um jogo precisa ouvir quem joga.'
by['P14']['scenes'][-1][3]='A bola precisa aparecer para quem joga.'
by['P08']['scenes'][-1][3]='Primeiro, uma parte que dê para jogar.'
by['P05']['caption']=by['P05']['caption'].replace('As versões de Quebra-blocos do vídeo serão demonstrações da equipe, sem atribuí-las ao Rafael.','As versões de Quebra-blocos são exemplos demonstrados pela equipe.')
by['P17']['caption']=by['P17']['caption'].replace('Criar jogos oferece outra oportunidade de experimentar ideias dessa forma. No Quebra-blocos, a equipe pode preparar duas velocidades da bola. Quem programa observa como isso muda a dificuldade antes de escolher a versão.','Criar jogos permite fazer essa comparação com as próprias ideias. Num jogo de rebater a bola, quem programa testa duas velocidades e observa como muda a dificuldade antes de escolher a versão.')
by['P26']['caption']=by['P26']['caption'].replace('O exemplo visual será Corrida Maluca, do Estúdio, que conta voltas completas.','No exemplo mostrado, cada volta completa soma um ponto.')
s[2][3][2][0]='No jogo de fazenda, a ordem faz a diferença.'
s[9][3][2][0]='Quem cria um jogo precisa ouvir quem joga.'
# As capas e a direção precisam acompanhar o assunto revisado.
by['P02']['scenes'][2][3]='A comparação deixa uma parte da história de fora.'
by['P05']['proof']=by['P05'].get('proof','').replace('Não atribuir seu relato ao Farol','Não atribuir seu relato a um jogo específico')
by['P06']['slides'][4][0]='Na criação de jogos, dá para mostrar onde a ideia parou de funcionar.'
by['P06']['caption']=by['P06']['caption'].replace('A demonstração de Pong será preparada pela equipe; não é relato de aluno.','Exemplo de Pong demonstrado pela equipe.')
by['P16']['slides'][4][0]='Criar jogos permite testar o que precisa mudar.'
by['P18']['slides'][4][2]='Tela real de uma aula existente, seguida de Corrida Maluca em demonstração separada da equipe. Não montar uma tela de aula de Corrida nem sugerir que esse exemplo já tem curso.'
by['P18']['note']='A organização permite chegar à atividade; não afirmar que criar jogos corrige a rotina por si só. Corrida é exemplo do Estúdio, separado da captura de aula existente.'
s[17][3][2][2]='Jogo da Memoria: duas cartas com figuras diferentes voltam a ficar escondidas. Capturar a regra real.'
by['E02']['scenes']=[[a,b_,c,d,e.replace('fiz a porta abrir','fiz o dinossauro pular')]for a,b_,c,d,e in by['E02']['scenes']]
by['E02']['caption']=by['E02']['caption'].replace('fiz a porta abrir','fiz o dinossauro pular')
by['E06']['caption']=by['E06']['caption'].replace('na volta vou testar a porta','na volta vou testar o pulo')
for x in p:
    if x.get('scenes'):x['visual']=' '.join(r[2] for r in x['scenes'])
dump(w/'final-posts.json',p);dump(w/'final-stories.json',s)
subprocess.run(['python',str(w/'aplicar.py')],check=True)
p=json.loads(read(w/'final-posts-normalizados.json'))

# Calendário e títulos vêm da mesma copy que será produzida.
f=b/'03-postagens.md';t=read(f)
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
start=t.index('## Critério desta revisão');end=t.index('## Entregas completas',start)
t=t[:start]+'''## Critério desta revisão

A cena deve fazer sentido na vida de uma criança de 9 a 14 anos: um trabalho escolar, uma conversa sobre um filme, um tutorial, um desenho, um vídeo de família, uma partida ou a rotina de casa. Não inventar uma atividade apenas para encaixar a habilidade. O responsável deve conseguir reconhecer a situação sem uma longa explicação.

A ligação com jogos precisa explicar por que criar oferece uma oportunidade de praticar aquela habilidade. Mostrar o que a criança decide, o que programa e como confere o efeito. “Isso também cabe na tela” não explica essa relação. Não afirmar que criar jogos resolve automaticamente a dificuldade escolar apresentada.

Variar a demonstração conforme a ideia. Este ciclo usa 11 exemplos de quatro extensões do Estúdio, além de cursos existentes nos extras. A Chave do Farol fica nos fixados, destaques e conversas de oferta, sem dominar o feed. A galeria de exemplos é fonte de produção, não uma lista de cursos à venda.

[Revisão de situações e conexões](pesquisas/revisao-cotidiano-e-exemplos-2026-10-12.md) · [Mapa de jogos, habilidades e captações](postagens/08-exemplos-do-estudio.md).

'''+t[end:]
t=t.replace('| Produção | [Direção visual]', '| Exemplos | [Jogos, habilidades e fontes no Estúdio](postagens/08-exemplos-do-estudio.md) |\n| Produção | [Direção visual]')
t=t.replace('receber uma atividade complementar','receber um material complementar')
write(f,t)

f=b/'README.md';t=read(f)
t=t.replace('| A Chave do Farol | Projeto do Desafio; exemplo visual quando a conversa do feed chegar à criação |','| A Chave do Farol | Projeto apresentado nos fixados, destaques e conversas de oferta; não é o exemplo recorrente do feed |')
anchor='**Faixa etária:**'
addition='''**Exemplos do feed:** escolher jogos pela habilidade e variar entre cursos e exemplos do Estúdio: memória, perguntas, fazenda, corrida, Cobrinha, aventura, plataformas e mundos em 3D. O [mapa de produção](postagens/08-exemplos-do-estudio.md) registra as fontes, as regras e o que precisa ser preparado. Um exemplo da galeria não equivale a um curso disponível nem comprova acesso da criança a toda a galeria.

**Situação e explicação:** começar por uma cena reconhecível para famílias com filhos de 9 a 14 anos. Depois, explicar por que construir um jogo permite praticar a habilidade: a criança organiza uma regra, faz uma escolha, testa e vê o resultado. Não basta trocar a cena por uma tela. O jogo entra como oportunidade de aprender, sem prometer corrigir a vida escolar por conta própria.

'''
if '**Exemplos do feed:**' not in t:t=t.replace(anchor,addition+anchor)
t=t.replace('| Captação do produto | [Demonstração do Farol]', '| Exemplos do feed | [Mapa de exemplos do Estúdio](postagens/08-exemplos-do-estudio.md) | Jogos variados, regras confirmadas e preparação das cenas |\n| Captação do produto | [Demonstração do Farol]')
write(f,t)

# Materiais de direct coerentes com as promessas de cada postagem.
f=b/'postagens/06-manychat.md';t=read(f)
t=t.replace('Brincadeira de comparar uma tentativa antes e depois','Três perguntas para investigar uma tentativa que não funcionou')
t=t.replace('Três propostas de criação para experimentar em família','Três convites para conversar sobre o que o filho gostaria de criar')
t=t.replace('Você vai receber uma brincadeira para comparar tentativas com seu filho.','Você vai receber três perguntas para investigar uma tentativa que não funcionou, com um exemplo.')
t=t.replace('Tenho três propostas simples para experimentar criação em família.','Tenho três convites para conversar sobre o que seu filho gostaria de criar.')
start=t.index('### M01 · PASSO');end=t.index('## Continuidade comum',start)
t=t[:start]+'''### M01 · PASSO

**Mensagem 1**

> Quando seu filho disser “não consigo”, vocês podem começar por estas perguntas:
>
> 1. “O que a tarefa está pedindo?”
> 2. “Me conta o que você já entendeu.”
> 3. “Qual parte você consegue começar com isso?”
>
> Ouça a resposta antes de sugerir um caminho. Se ele não souber o que foi pedido, releiam a orientação. Se precisar de uma explicação, ajude nessa parte e deixe que tente continuar.

**Mensagem 2**

> Por exemplo: a tarefa pede um resumo de uma história. Seu filho consegue contar o que leu, mas não sabe o que escrever primeiro.
>
> Vocês podem escolher o principal problema da história e como ela terminou. Ele anota essas ideias, tenta uma frase e vocês leem juntos. Se ainda não compreendeu o texto, voltem à leitura.
>
> Criar jogos oferece outra oportunidade de organizar ideias. Para fazer um jogo da memória, a criança transforma a brincadeira em regras e testa a ordem em que elas acontecem. A prática complementa o apoio na tarefa escolar.

### M02 · APOIO

**Mensagem 1**

> Três formas de participar quando você não sabe a resposta:
>
> 1. Pedir uma explicação: “Me mostra o que você já fez”.
> 2. Consultar uma referência: “Tem um exemplo na aula que podemos olhar?”.
> 3. Ajudar a formular a dúvida: “Em qual passo você deixou de entender?”.
>
> Se a dúvida continuar, anotem esse ponto para perguntar a quem pode explicar. Você pode ajudar a procurar sem inventar uma resposta.

**Mensagem 2**

> Na conta de matemática, o método do caderno pode ser diferente daquele que você aprendeu. Comecem por um exemplo feito na aula. Peça que seu filho mostre até onde acompanhou e marquem o ponto que falta entender.
>
> Ao criar jogos, ele também precisa explicar uma dificuldade: “A bola deveria voltar, mas atravessou a raquete”. Mostrar o resultado ajuda a localizar o comando que precisa ser revisto ou a pedir ajuda com uma dúvida específica.

### M03 · IDEIA

**Mensagem 1**

> Para organizar um trabalho com muitas ideias, façam duas listas: Precisa entrar e Pode ficar para depois.
>
> Leiam o pedido da escola. Na primeira, anotem o que precisa ser explicado. Na segunda, coloquem as ideias extras de efeitos, imagens e curiosidades.
>
> Escolham uma parte da primeira lista para começar. As outras ideias ficam guardadas, sem disputar a atenção com o que precisa ser entregue.

**Mensagem 2**

> Se o trabalho pede apresentar um animal, a lista pode ter: onde vive, o que come e como se desloca. Primeiro, seu filho procura essas informações e organiza a explicação. Depois escolhe imagens que ajudem a entendê-la.
>
> Criar um jogo também exige escolher uma primeira parte. Antes de inventar várias fases, ele pode fazer um personagem andar e pular. Testar essa versão mostra o que já funciona e o que precisa de ajuste antes de continuar.

### M04 · TESTE

**Mensagem 1**

> Quando repetir não estiver ajudando, estas perguntas dão um rumo à próxima tentativa:
>
> 1. “O que você esperava que acontecesse?”
> 2. “Em qual passo aconteceu algo diferente?”
> 3. “O que dá para conferir ou mudar primeiro?”
>
> Olhem o que foi feito antes de apagar tudo. Se estiver difícil continuar, uma pausa pode vir antes da investigação. E, se não souberem a resposta, registrem a dúvida para pedir ajuda.

**Mensagem 2**

> Numa conta, seu filho pode ter copiado um sinal diferente. Comparar o enunciado e olhar as linhas da resolução ajuda a encontrar esse ponto. Se o sinal estiver certo, ele ainda pode precisar de explicação sobre uma etapa.
>
> Criar jogos dá uma oportunidade de testar mudanças e ver o efeito. Se o personagem não alcança uma plataforma, quem programa pode ajustar o pulo e jogar de novo. Mantendo o restante igual, fica mais claro o que aquela mudança fez.
>
> O objetivo é investigar antes de repetir, sem transformar cada erro em cobrança.

### M05 · CRIAR

**Mensagem 1**

> Escolha um convite que combine com um interesse que seu filho já mostrou:
>
> Histórias: depois de um filme, pergunte “Que outro final você inventaria?”. Ouça o que ele mudaria e por quê.
>
> Lugares: quando ele mostrar uma construção num jogo, pergunte “Como seria um lugar criado por você?”. Ele pode contar ou desenhar a ideia, se quiser.
>
> Desafios: depois de uma partida, pergunte “Que regra você mudaria para deixar o jogo mais interessante?”. Conversem sobre como isso mudaria a partida.

**Mensagem 2**

> Não precisa fazer as três conversas nem avaliar as respostas. A ideia é descobrir o que ele gostaria de inventar.
>
> A criação de jogos permite experimentar algumas dessas escolhas. Ele pode construir um cenário, definir um objetivo e programar uma regra para alguém jogar.
>
> Num jogo de travessia, por exemplo, quem cria decide onde ficam os obstáculos e testa se há passagem. A ideia ganha uma forma que dá para experimentar e mudar.

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

> Num trabalho da escola, a anotação pode ser: “Já escrevi onde o animal vive. Falta escolher uma imagem para mostrar como se desloca”. A volta já tem uma tarefa para começar.
>
> No computador, confiram também o salvamento na ferramenta usada. Na atividade do Estúdio dentro da aula, esperem Guardado na sua conta. A anotação ajuda a lembrar; o salvamento preserva o projeto.
>
> Quando a aula pedir Enviar meu projeto, façam também essa entrega.

'''+t[end:]
t=t.replace('**Só a atividade**','**Só o material**').replace('A atividade fica aqui para vocês consultarem','O material fica aqui para vocês consultarem').replace('Você pode experimentar a atividade que recebeu e mostrar sua ideia a um responsável.','Você pode conversar sobre o material que recebeu com um responsável.').replace('Reentrega de atividade por pedido explícito','Reentrega de material por pedido explícito')
write(f,t)

# Mapa verificável das bases, sem confundir exemplo, adaptação e curso.
refs=json.loads(read(w/'exemplos-editoriais.json'))
notes={
'memoria':('Organizar regras e explicar o que acontece em cada situação.','Captar duas cartas diferentes voltando e duas iguais permanecendo. São três pares na base; nova quantidade é adaptação.'),
'quiz':('Escrever instruções claras e considerar a dúvida de quem lê.','A base é um quiz de números com três alternativas. Texto de outro tema precisa ser preparado e conferido; não anunciar um curso novo.'),
'mundo':('Fazer escolhas próprias sobre um espaço e explicar seus motivos.','Captar objetos e caminho em 3D. Separar a base do cenário personalizado pela equipe.'),
'fazenda':('Organizar etapas e retomar uma construção.','Usar a versão básica: plantar, crescimento por tempo e colher. Não acrescentar rega, loja ou inventário que não pertencem a esta base.'),
'quebra':('Comparar o efeito de uma escolha e considerar quem vai jogar.','Preparar duas velocidades ou dois contrastes e manter o restante igual. Não inventar um botão para mudar a velocidade.'),
'pong':('Mostrar uma dificuldade, explicar controles e testar uma reação.','Registrar a base funcionando. Em P06, criar separadamente uma versão sem a reação esperada da bola; não apresentar o exemplo original como defeituoso. A partida vai até cinco pontos.'),
'plataforma':('Construir uma primeira parte e investigar uma mudança.','A base demonstra movimento e pulo com gravidade. Para P16, preparar a plataforma de destino e o ajuste mostrado; não fingir que toda essa cena já vem no exemplo.'),
'aventura':('Transformar uma ideia de história em objetivo e ações.','O projeto existente tem exploração, corte de mato e guardiões. Outro enredo ou final é adaptação a construir, não recurso já conferido nem curso anunciado.'),
'cobrinha':('Adaptar regras conhecidas e entender decisões por trás de um jogo.','Captar maçã, crescimento e fim ao tocar parede ou corpo. Mudanças de velocidade ou área precisam de duas versões preparadas.'),
'corrida':('Dar instruções precisas e usar números para representar o que aconteceu.','Mostrar aceleração, freio e voltas completas. Não tratar a pontuação como contagem de qualquer objeto. Em P18, separar demonstração do exemplo e tela de aula existente.'),
'travessia':('Criar obstáculos pensando nas possibilidades de quem joga.','Captar deslocamento na grade e carros/caminhões. Novas posições ou ritmos são adaptações a testar para preservar uma passagem possível.')}
t='''# Exemplos do Estúdio para o calendário

**12/10/2026.** A seleção parte da habilidade e da situação da família. São 11 bases de quatro extensões, distribuídas por 27 posts. P11, P12 e P28 preservam a história e os relatos reais sem atribuir a essas pessoas um projeto de exemplo. Os extras podem usar cursos existentes; E03 usa Corre Dino.

A copy pública continua nas fichas. Este mapa serve à equipe que prepara as demonstrações. Os exemplos ilustram possibilidades de criação; não são anunciados como cursos disponíveis. A Chave do Farol permanece nos conteúdos que explicam ou oferecem o Desafio.

## Catálogo e finalidade

| Exemplo | Extensão | Posts | Habilidade mostrada |
| --- | --- | --- | --- |
'''
for key,(name,ext,src,rule) in refs['games'].items():
    ids=', '.join(pid for pid,k in refs['mapping'].items() if k==key)
    t+=f'| {name} | {ext} | {ids} | {notes[key][0]} |\n'
t+='''
## Regras e cenas a preparar

As fontes abaixo foram lidas no catálogo e nos projetos locais. Essa conferência confirma a base escolhida; não substitui executar e gravar a cena antes de produzir as outras mídias.

'''
for key,(name,ext,src,rule) in refs['games'].items():
    rel='../../../../../../packages/studio/src/official-extensions/'+src
    t+=f'### {name}\n\n- **Fonte:** [{src}]({rel}).\n- **Regra conferida:** {rule}\n- **Preparação:** {notes[key][1]}\n\n'
t+='''## Acesso, autoria e uso na copy

O catálogo de exemplos não é liberado de forma geral para crianças por padrão. A [regra de visibilidade](../../../../../../packages/studio/src/studio/examples-visibility.ts) prevê contextos como playground e administração. Não instruir a família a abrir a galeria completa nem prometer acesso a todos esses projetos. A demonstração editorial usa o ambiente de produção da equipe.

Uma captura de exemplo, uma adaptação feita pela equipe e um projeto de aluno são fontes diferentes. Não usar um exemplo como comprovação do que Rafael, Jeffrey, André, Débora ou Fernando construiu. Relatos permanecem ligados aos registros autorizados.

Quando for necessário mudar um jogo para explicar uma ideia, preparar a variação, executar, observar e só então captar. A ficha indica o que muda; não redesenhar uma interface inexistente nem gerar uma captura fictícia. Diagramas editoriais podem explicar uma regra e devem ter aparência de diagrama, como as cartas do P01.

## Relação entre situação, habilidade e jogo

- **P01:** o filho precisa organizar um resumo. Criar um jogo da memória também exige organizar ideias, agora em regras que o computador precisa seguir. O teste mostra se a sequência funciona. Não afirmar que a programação substitui ajuda em leitura e escrita.
- **P04:** arrumar a mochila envolve etapas. Numa fazenda, quem cria precisa fazer o plantio acontecer antes do crescimento e da colheita. A ordem tem um efeito visível.
- **P14:** um slide bonito pode ser difícil de ler. No Quebra-blocos, a bola precisa se destacar para que outra pessoa acompanhe a partida. A escolha visual considera quem usa.
- **P22:** depois de aprender por um tutorial, a criança quer mudar a criação. Na Cobrinha, alterar uma regra permite experimentar o efeito da própria escolha.
- **P26:** uma contagem tem significado quando representa algo. Na corrida, uma volta completa aumenta o placar; quem programa precisa definir quando essa soma acontece.

Não usar uma transição genérica como “isso também cabe na tela”. Mostrar qual ação de criação permite praticar a habilidade e o que o resultado permite observar. Variar o jogo quando houver uma razão editorial, sem trocar apenas o cenário de um argumento repetido.
'''
write(b/'postagens/08-exemplos-do-estudio.md',t)

f=b/'postagens/05-direcao-visual-e-producao.md';t=read(f)
t=t.replace('P07 mostra a diferença entre concordar e começar, P24 conta uma história em três desenhos','P07 mostra a diferença entre dizer que entendeu e saber o que entregar, P24 organiza uma apresentação escolar')
t=t.replace('| Farol, coleta, porta, personalização | Capturas em `output/instagram/como-funciona/2026-10-09/capturas/` e `output/instagram/projetos/2026-10-09/capturas/`; recapturar os estados pedidos em cada fechamento | Capturas do produto, sem atribuição a aluno. Verificar se a interface ainda corresponde à aula |','| Exemplos variados do Estúdio | [Mapa de 11 bases, fontes e cenas](08-exemplos-do-estudio.md) | Executar e captar o exemplo escolhido; preparar as variações indicadas. Não apresentar a galeria como catálogo de cursos |')
t=t.replace('| Atividades de papel | Desenhos e brincadeiras originais de P04, P10, P17 e P24 | Não são capturas do curso nem novos produtos prometidos |','| Cotidiano de 9 a 14 anos | Resumo, pesquisa, apresentação escolar, desenho, vídeo caseiro, rotina e conversa em família | Objetos e ações coerentes com cada ficha. Não montar uma atividade artificial só para representar uma habilidade |')
start=t.index('## P01: origem visual');end=t.index('## Entrega editorial',start)
t=t[:start]+'''## P01: origem visual da versão vigente

Duas ilustrações editoriais mostram os mesmos personagens fictícios numa tarefa escolar: o filho conta uma história que leu e depois começa a escrever o resumo; a mãe acompanha. Diagramas próprios mostram o caderno, duas perguntas para organizar as ideias e uma regra do jogo da memória. Não são fotografias de alunos nem capturas da plataforma.

A versão com ponte de papel foi substituída. As mídias anteriores ficam no histórico, fora da fila de publicação. Prompts, legenda, texto alternativo, montagem e verificação de layout ficam junto dos seis PNGs vigentes. Nenhuma fotografia da Kodland foi reutilizada.

'''+t[end:]
write(f,t)

# Guardar a revisão anterior como documento datado, sem fazê-la prevalecer sobre a nova.
f=b/'pesquisas/revisao-clareza-e-interesse-2026-10-12.md';t=read(f)
mark='> **Registro de uma etapa anterior.** Os exemplos de ponte de papel e algumas conexões descritas abaixo foram substituídos na [revisão de cotidiano e exemplos](revisao-cotidiano-e-exemplos-2026-10-12.md). Para produzir, usar o calendário e as fichas vigentes.\n\n'
if not t.startswith('> **Registro'):write(f,mark+t)
write(b/'pesquisas/revisao-cotidiano-e-exemplos-2026-10-12.md','''# Revisão de cotidiano, argumento e variedade de jogos

**12/10/2026.** Aplicada aos documentos das 30 postagens principais, seis extras e 60 telas de stories, com atualização das seis entregas do direct e do P01 produzido. Os fixados permanecem fora da contagem.

## O que mudou e por quê

| Problema | Mudança |
| --- | --- |
| Atividades montadas apenas para explicar uma habilidade tinham pouca relação com o cotidiano esperado | P01 agora acompanha um resumo escolar; P17 compara um corte num vídeo caseiro. Outros exemplos usam pesquisa, ensaio de apresentação, conta, rotina e conversa sobre filme |
| A passagem para programação era uma associação solta | Cada fechamento mostra uma ação de quem cria: ordenar etapas, definir uma regra, testar uma mudança ou ouvir quem joga. A relação com a habilidade vem dessa ação |
| O Farol concentrava exemplos e fazia o feed parecer a apresentação de um curso | Foram escolhidas 11 bases do Estúdio em quatro extensões. A seleção e as regras estão no mapa de produção. Farol fica nos conteúdos de apresentação e oferta |
| A entrega por direct ainda trazia brincadeiras que já não correspondiam ao post | PASSO trabalha a ajuda numa tarefa; APOIO, a busca por uma explicação; IDEIA, a organização do trabalho; TESTE, a investigação de uma tentativa; CRIAR, os interesses do filho; ROTINA, começo e retomada |
| A arte pronta mantinha o exemplo rejeitado | P01 recebeu ilustrações de leitura e escrita, caderno e cartas em diagrama. A versão anterior foi preservada fora da fila de publicação |

Uma atividade pode existir numa fonte pedagógica e ainda ser uma escolha ruim para a conversa pretendida com os pais. A revisão não afirma que pontes de papel são impossíveis; reconhece que esse exemplo não atendia ao contexto pedido pelo usuário.

## Exemplo de argumento completo

O responsável quer que o filho consiga organizar o que vai fazer. Arrumar a mochila envolve conferir as aulas, separar os cadernos e verificar o estojo. Criar um jogo de fazenda oferece outra oportunidade de praticar a ordem: o plantio precisa vir antes do crescimento e da colheita. Quem programa monta essa sequência e joga para conferir o efeito.

Esse raciocínio explica por que a criação pode ser uma atividade relevante. Não afirma que fazer o jogo fará a criança arrumar a mochila ou melhorar as notas automaticamente.

## Fontes e limites

O [mapa de exemplos](../postagens/08-exemplos-do-estudio.md) liga os jogos às fontes locais e registra as adaptações necessárias. Foram consultados o catálogo, os projetos e a regra de visibilidade da galeria. Não foi concluída uma sessão de teste de todos os jogos em execução; cada captura futura precisa confirmar a ação prevista. Os projetos da galeria não foram anunciados como novos cursos.

A [análise anterior de 50 publicações da Kodland](kodland-50-publicacoes-2026-10-12.md) continua documentada com seus limites. Esta revisão não é uma nova análise de cinquenta posts nem um teste de desempenho do calendário.

As falas autorizadas de Daniel, Flávia, Jeffrey e Fernando foram preservadas. Não foram atribuídos novos projetos a esses alunos. A história de André mantém o que foi informado pela família. As cenas fictícias são propostas editoriais, sem pretensão de comprovar uma experiência real.

O salvamento continua descrito pelo indicador Guardado na sua conta dentro da atividade, separado do envio solicitado pela aula. Não houve alteração no funcionamento do produto.

## Conferência e estado

As verificações locais cobrem as contagens, os textos por formato, os relatos literais, os links, a correspondência entre materiais do direct e convites, as fontes dos jogos e a ausência do Farol na copy dos 30 principais. Para P01, incluem texto da legenda, seis PNGs 1080 × 1350, layout e inspeção da prévia. O resultado fica em `output/instagram/light-copy-2026-10-12/verificacao-final.json`.

As demais mídias ainda precisam ser produzidas. A configuração do ManyChat e seus testes continuam pendentes. Nenhum post ou mensagem foi publicado, nem houve commit, push ou deploy neste trabalho.
''')

# A cópia de segurança vem antes da troca da mídia.
art=b/'producao/postagens/p01-nao-consigo'
archive=b/'historico/2026-10-12-antes-revisao-cotidiano/p01-nao-consigo'
if not archive.exists():shutil.copytree(art,archive)
write(archive.parent/'LEIA-ME.md','Versão anterior do P01, com a ponte de papel. Substituída pela revisão de cotidiano de 12/10/2026. Não publicar. A versão vigente fica em producao/postagens/p01-nao-consigo.\n')
f=b/'producao/postagens/README.md';t=read(f)
t=t.replace('com o exemplo da ponte de papel e a investigação de um movimento no jogo','com uma tarefa de resumo escolar e a organização das regras de um jogo da memória')
t=t.replace('A versão anterior está no histórico.','A versão com ponte de papel está em `historico/2026-10-12-antes-revisao-cotidiano/`, fora da fila de publicação.')
write(f,t)

f=w/'README.md';t=read(f)
t=t.replace('`montar-p01-revisado.mjs`: gera o P01 vigente após a revisão de clareza','`montar-p01-cotidiano.mjs`: gera o P01 vigente após a revisão de cotidiano')
t=t.replace('apoio/prompts-revisao.txt','apoio/prompts-cotidiano.txt')
t+='''
## Última revisão: situações reconhecíveis e exemplos variados

`revisao-cotidiano.py` e `revisao-cotidiano-complementos.py` registram a reescrita aplicada. `sincronizar-cotidiano.py` fez o ajuste final e sincronizou os documentos. São registros da operação; não executar sobre futuras alterações manuais.

`exemplos-editoriais.json` guarda o mapa de 11 bases do Estúdio. `antes-revisao-cotidiano/` preserva o texto anterior. O histórico de imagens está dentro da pasta Instagram. `montar-p01-revisado.mjs` e os scripts anteriores de sincronização não correspondem à produção atual.

Para gerar a partir da fonte atual: executar `aplicar.py`, atualizar o calendário se títulos ou durações mudarem, executar `montar-p01-cotidiano.mjs` e depois `verificar.py`. Não rodar as ferramentas anteriores de reescrita para reproduzir a entrega.
'''
write(f,t)
print('Fontes, calendário, 60 stories, seis materiais de direct, guias e mapa de jogos sincronizados; mídia anterior preservada.')
