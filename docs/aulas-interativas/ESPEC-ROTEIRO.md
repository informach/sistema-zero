# Especificação do roteiro de gravação

Direção revisada em 27/09/2026 depois do teste de Cadê Todo Mundo? com duas crianças e atualizada em 06/10/2026 (experiência e jogo pronto como demonstração, publicação com comemoração, falas que chamam a atenção de quem faz a aula, o opcional como convite e o vocabulário da aventura nos rótulos e nas falas de exemplo).
Esta especificação é da equipe: aqui "curso", "aula", "seção" e "caderno" continuam como nomes internos. O que a criança vê ou ouve usa o vocabulário da aventura (Diretrizes, seção 6): os botões e as falas de exemplo abaixo já estão assim.
As [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md) são a referência única das regras. Esta especificação fornece exemplos e formato de execução para a gravação. Roteiros e moldes antigos não prevalecem sobre as Diretrizes.

## 1. A abertura situa a tarefa e convida à ação

A criança precisa entender a tarefa sem traduzir a intenção de quem narra. Conforme orientação
do usuário em 03/10/2026, toda seção tem um contexto inicial curto e pertinente. Primeiro situar
o jogo, seu estado atual ou a necessidade; depois dizer o que fazer.

- Apresentação (jogo pronto, demonstração com UM exemplo): dizer qual jogo será construído e a situação; mostrar na primeira pessoa um exemplo ("Olha aqui: quando eu toco num esconderijo, aparece quem estava atrás"), sem resolver a partida; só no fim passar a vez ("Agora é a sua vez: jogue até encontrar os três personagens").
- Experiência (demonstração na primeira pessoa, como numa conversa): "Esta é uma experiência para a gente entender como funciona a ação e a reação. Olha aqui: quando eu toco no arbusto, nada acontece. Tá vendo? É que o jogo ainda não sabe o que fazer quando alguém toca no arbusto. Então a gente precisa dizer isso para ele… Agora é a sua vez: faça esses mesmos testes na experiência."
- Construção depois de uma experiência: lembrar o que ela mostrou, testar no próprio jogo o que ainda falta e dizer o que será montado. "Lembra da experiência da parte anterior? Cada personagem encontrado somava um em Achados. Agora a gente vai fazer o seu jogo contar do mesmo jeito! Primeiro, toque num esconderijo do seu jogo. Tá vendo? O personagem aparece, mas Achados continua em zero, porque o jogo ainda não sabe que precisa contar. Então a gente vai ensinar o jogo a somar um em Achados toda vez que um esconderijo for tocado." Sem mandar clicar em Anterior.
- Material (o caderno, que a criança conhece como Mapa da Aventura): "Olha aqui: este é o seu Mapa da Aventura! Nele estão os passos para montar o seu jogo, com os blocos que você vai usar e o lugar de cada um. Então, se você esquecer algum passo, é só voltar aqui e abrir o mapa. Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser." (fala atual de `aulas/cade-todo-mundo-aula-1.roteiro.md`). Não dizer "não precisa baixar nem imprimir": a criança entende como uma ordem para não baixar.
- Encerramento: nomear o resultado e dar a próxima ação.

Não começar por uma lista do que será aprendido, a importância do conceito ou uma promessa da
próxima aula. O contexto precisa ajudar a entender ou executar a tarefa atual, sem virar tour
ou recapitulação longa. Não começar com uma ordem solta. A intenção
pedagógica e a justificativa ficam na proposta da aula, para o adulto que a prepara.

## 2. Instruções completas, com palavras simples

Encurtar a fala não permite omitir passos. Na montagem, conduzir a criança até o resultado:

1. Dizer o que ela vai fazer no jogo.
2. Mostrar primeiro onde o bloco vai entrar e pedir que esse lugar fique à vista: a área, o bloco vizinho ou o espaço vazio de destino. Se ele puder estar fora da tela, ensinar a arrastar um espaço vazio entre os blocos.
3. Só então dar o caminho completo da categoria, subcategoria e seção que existem.
4. Nomear o bloco como aparece na paleta.
5. Pedir para arrastar até o lugar já visível e soltar quando aparecer o encaixe.
6. Dizer qual campo mudar, o valor e o que manter.
7. Pedir o teste concreto logo depois de montar e dizer o resultado esperado da construção. Não listar os blocos antes do teste: quando o resultado aparece, o teste já conferiu.
8. Só depois do teste, e uma vez só, a conferência como caminho da correção, com gatilho genérico: "Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: … Depois de corrigir, teste de novo." Não acrescentar um caso de erro que repete um item da lista; um aviso a mais só entra quando diz o que a lista não cobre. Sem teste visível (uma variável sem mostrador), "Confira se ficou assim:" vem logo depois da montagem, porque é a única conferência.
9. Dizer como terminar, incluindo confirmação de envio quando necessária.

A ordem dos passos 2 a 5 não é opcional. Com o bloco preso no mouse, a criança não consegue mover o espaço dos blocos para procurar o destino.

Exemplo: "Encontre Quando clicar ou tocar e deixe à vista o bloco de visibilidade que está
dentro dele. Abra Programação e depois Variáveis. Pegue Somar 1 em variável. Arraste e solte logo
abaixo do bloco de visibilidade. Deixe o número em 1 e escolha achados. Toque em um esconderijo e
confira se Achados virou 1."

Na montagem, nunca trocar essa sequência por "faça como eu fiz", "monte a regra" ou "agora é sua vez" sem
ensinar a montagem. Mostrar cada gesto com tempo para acompanhar; cortar enrolação não é acelerar
o arrasto. Repetir o caminho ao pegar outra peça quando isso ajuda a criança a se localizar.

Conferir rótulos, campos, valores e opções no código da versão usada na gravação. A referência
REFERENCIA-BLOCOS-JOGO-2D.json é apoio, não substitui o código. O menu de nomes pode mudar com o
projeto; pedir o nome certo, sem inventar uma posição fixa. Se o campo já está correto, dizer para
mantê-lo. Bloco de valor substitui o valor já encaixado, não ocupa um buraco imaginário.

**Aplicação ao Farol, 06/10/2026:** a personalização ensina o campo exato de cada imagem: sprites em Ao iniciar, cenário em Desenhar o cenário dentro de A cada quadro do jogo e farol aceso em então. As notas de tela e o Mapa da Aventura conservam os nomes canônicos com hífens; a narração pode pronunciá-los naturalmente. Nome de imagem não substitui nome de sprite. Os pares de faróis precisam corresponder, e cada tipo conserva dimensões e contato. Antes de mudar x/y da chave, demonstrar separadamente os eixos na experiência de posição. A escolha de velocidade foi retirada; a montagem mantém 3.

## 3. O que vai para o Como Fazer

A aula ensina a criar o jogo. A biblioteca ensina a usar a plataforma.

| Conteúdo | Destino |
| --- | --- |
| Pausar o vídeo, voltar um trecho, ampliar e sair da tela cheia | Como Fazer |
| Arrastar divisória, alternar abas, mostrar a Pré-visualização | Como Fazer |
| Folhear o caderno, trocar a leitura e o passo a passo de baixar e imprimir | Como Fazer (a fala do caderno só convida e aponta **Baixar**) |
| Caminho mínimo para publicar, quando publicar é a tarefa da seção | Roteiro da aula: Compartilhar, título e resumo, Gerar capa, conferir, Publicar, confirmação, comemoração, copiar o link de jogar e convidar a mandar para a família e os amigos, Fechar |
| Personalizar a publicação, enviar outra capa e resolver problemas | Como Fazer |
| Escolher um bloco, encaixar, preencher valores e testar a regra | Roteiro da aula |
| Acionar um controle necessário à experiência | Comando da atividade, sem tour |
| Enviar a atividade, confirmar o envio, avançar ou concluir | Encaminhamento curto no roteiro |

Não retirar a única instrução de que a criança precisa. Quando a dúvida for de interface,
usar um tutorial com título claro, conferido no código e disponível para aquele perfil.
Não exigir que a criança leia todos os tutoriais antes de começar.
Na primeira referência ao Como fazer, apresentá-lo como área de ajuda e oferecer um link
direto ao tutorial, junto à atividade. A ajuda escrita não acrescenta outra tarefa à fala.

Na fala, "clique em Próxima parte" basta. Não explicar o que é uma parte, todos os botões
vizinhos e as diferenças entre celular e computador. No Kids, o rótulo é **Próxima parte**
(a comunidade adulta continua com **Próxima seção**).

## 4. Experiências: explicar enquanto faz

A experiência e a explicação andam juntas (Diretrizes, seção 2), e o vídeo é uma
**demonstração**: o narrador faz os testes e explica na primeira pessoa. Ele não dá ordens à
criança antes da vez dela. O vídeo segue esta ordem:

1. Diz qual ideia a experiência ensina, com o nome dela ("Esta é uma experiência para a gente
   entender…").
2. Puxa a atenção ("Olha aqui:"), faz cada gesto no ritmo da fala e mostra o resultado real.
3. Diz por que aquilo aconteceu, ligado à regra que a criança vai montar, com uma comparação curta
   do dia a dia quando ajudar.
4. Muda a regra e explica a diferença.
5. Termina em "Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique
   em Próxima parte."

Exemplo do toque, como numa conversa: "Esta é uma experiência para a gente entender como funciona
a ação e a reação. Olha aqui: quando eu toco no arbusto, nada acontece. Tá vendo? É que o jogo ainda
não sabe o que fazer quando alguém toca no arbusto. Então a gente precisa dizer isso para ele. Na
vida é assim também: toda ação tem uma reação. Por exemplo, se alguém faz cócegas em você, você ri.
A cócega é a ação, e a risada é a reação. No seu jogo, o toque é a ação. E a reação que a gente
quer é o arbusto ficar invisível, para aparecer quem está escondido atrás dele. Mas, para o jogo ter
essa reação, a gente precisa ligar a reação ao toque. Por isso, eu clico em Ligar a reação ao toque
e toco no arbusto de novo. Olha só: agora sim ele fica invisível, e dá para ver o coelho que estava
atrás! Então essa é a reação que eu liguei ao toque: o arbusto ficar invisível."

Os passos para a criança ficam nas instruções da experiência, no imperativo. A ponte do Zappy liga o vídeo à experiência numa frase curta, sem repetir os passos.
As montagens seguem no imperativo: ali a criança faz junto com o vídeo.

A comparação parte de uma regra que a criança já vive e chega ao passo concreto, com a palavra do
botão ou do bloco. Evitar frases abstratas como "na programação, nada é automático".

Na frase da comparação, a nota de tela descreve um **meme ilustrado** (regra completa nas Diretrizes, seção 2).

A experiência continua cobrando as metas da própria pessoa; ver o vídeo não basta. Não esconder
um passo obrigatório nas pistas. "Explore e descubra" sozinho não orienta. Não acrescentar
questionários ou mudar as experiências só para encurtar a fala.

## 5. Falar com quem está fazendo

- Usar "você", verbos simples e frases que soem naturais em voz alta. Toda fala conversa com quem faz a aula, como alguém ao lado dela: "o seu Mapa da Aventura", "o seu jogo", "Sua vez!". Nada de frase impessoal que só descreve.
- Três vozes (Diretrizes, seção 6): "você" para o que é da pessoa, o que ela faz e o que ela conquista, com as ações no imperativo; "a gente" e "vamos" para pensar junto e convidar; "eu" só quando o narrador demonstra. Evitar o "nós" de sala de aula ("Hoje nós vamos aprender…") e dizer "o seu jogo", não "o nosso jogo".
- A fala é uma conversa contínua, não uma lista de frases soltas: cada frase se liga à anterior ("então", "por isso", "mas", "é que", "agora que"; num curso com o bloco Se, "por isso" ou "ou seja" no lugar de "então", que é o nome de uma parte do bloco), todo resultado vem com o porquê ("Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele") e a explicação diz o que é cada coisa no próprio jogo ("O toque é a ação, e a reação que a gente quer é o esconderijo ficar invisível"). Evitar sequências curtas e secas como "Nada acontece. O toque ainda não tem uma reação. Vamos ligar uma." (Diretrizes, seção 6).
- O que já vem pronto não vira frase solta na montagem ("O jardim e os personagens já estão preparados"): a criança vê o que já está no projeto. Só citar o que vem pronto quando ajuda a ação, com o papel que tem ali ("Olha aqui: nessa área já tem o bloco… É ele que percebe quando alguém toca num esconderijo"). O reconhecimento do que veio pronto fica na comemoração (Diretrizes, seção 3).
- Chamar a atenção nos momentos que importam: "Olha aqui:" ao mostrar um lugar, um bloco ou o primeiro gesto da demonstração; "Olha só:" quando aparece um resultado; "Repare:" num detalhe que a pessoa precisa notar; "Tá vendo?" logo depois do teste da retomada. Um chamado por momento importante, variando as expressões; sem repetir "bora", "capricha" ou parabéns a cada gesto (Diretrizes, seção 6).
- O que é opcional vira convite, nunca negação: "Se quiser, você pode ler aqui mesmo. E, se preferir, também pode baixar para guardar." Não dizer o que a pessoa não precisa fazer; uma proibição que evita um erro continua direta ("Não coloque um encontro dentro do outro").
- Evitar perguntas que escondem um pedido. "Teste os dois jeitos" é mais claro que
  "Como será que essa ideia funciona no nosso jardim?".
- Cada "aqui" precisa de um apontamento visível. Cada "isso" precisa de um referente claro.
- Nomear a conquista concreta, com honestidade sobre o que veio preparado.
- Sem travessões, linguagem comercial ou convite para convencer um responsável.
- Não chamar quem assiste de "criança" ou "aluno". Falar diretamente com "você".
- Termos técnicos entram só quando ajudam a tarefa. Não fazer uma lista de vocabulário no fecho.

## 6. Apontamentos e ações reais

Mostrar a atividade enquanto a fala a apresenta. "Aqui está o jogo pronto" funciona se o
enquadramento realmente o mostra. A ferramenta pode ficar ao lado ou abaixo do vídeo; não gravar
um tour das duas disposições. Conferir o roteiro nos dois tamanhos de tela.

A Pré-visualização do Estúdio acompanha as mudanças automaticamente. Pedir a ação do jogo:
"Toque em um esconderijo", "clique no jogo e segure a seta". Para botões, "clique em"; no jogo,
"toque" ou "segure"; não usar "aperte" (Diretrizes, seção 6). Não inventar um botão de início nem
mandar recarregar a página como passo genérico. Um reinício necessário ao teste deve usar o
controle real e ser conferido antes da gravação.

A ação de saída precisa corresponder à seção: **Próxima parte** entre as partes da fase,
**Concluir fase** na última parte. Se há envio, incluir **Enviar meu projeto** (no Pinta da fase,
**Enviar meu desenho**) e a confirmação **Enviar**; na galeria, **Enviar (1)** e **Recebido!**. Se há certificado, nomear **Pegar meu certificado**. Tours, estados alternativos e
solução de problemas desses fluxos ficam na biblioteca de ajuda.

Encerrar a narração na ação de saída da seção atual. Não acrescentar uma instrução para a
próxima seção ou aula depois de Próxima parte ou Concluir fase. O comando Pegar meu certificado
pertence à seção do certificado. Na publicação pelo Estúdio da aula, esperar **Seu jogo está no
Mural!**, comemorar, copiar com **Copiar link de jogar**, usar **Fechar** e só então orientar
**Concluir fase**. Pelo Estúdio completo, esperar **Publicado! 🎉**, usar **Copiar link** e depois
**Fechar**.

## 7. Formato para gravação

Cada aula tem proposta, manifesto e roteiro na pasta aulas/. A proposta explica as escolhas
para quem prepara a aula; o manifesto define o conteúdo importável; o roteiro contém a fala
literal. Os três precisam concordar. Se houver gerador do manifesto, atualizar também o gerador.

Registrar também a **ponte do Zappy na página (não gravar)** depois de cada vídeo. Ela liga
o vídeo à tarefa seguinte e deve coincidir com o diálogo do manifesto. Zappy não tem fala dentro
do vídeo: sua presença no meme ou na interface é visual. O recurso Ouvir da página continua
independente da gravação. Nas seções de contexto ou consulta, encaminhar a continuação sem
inventar uma atividade obrigatória.

No início do roteiro, registrar quem conduz, qual avatar participa e o estado da produção
(planejado, gravação informada ou edição conferida). Usar **Professora:** ou **Professor:** para
a condução e **Debinha (avatar):** ou **Dedé (avatar):** para a criança. Manter a mesma criança nas
partes de uma aula e alternar na próxima; não é obrigatório ter participação em cada vídeo.
O rótulo **Narração:** continua aceito nos roteiros antigos com uma só voz, mas não deve misturar
falantes. As escolhas de linguagem “você”, “a gente” e “eu” valem para a conversa; não são nomes
dos personagens.

Separar sempre a nota de produção da fala, com uma linha em branco:

```markdown
**Na tela:** mostrar o jogo pronto. No "Olha aqui", tocar em UM esconderijo só; não revelar os outros.

**Professora:**

> “Você vai construir um jogo chamado Cadê Todo Mundo. Esta é a versão pronta, para você ver como
> o jogo funciona antes de montar o seu. Olha aqui: quando eu toco num esconderijo, ele some e
> aparece quem estava atrás. E o número de Achados mudou para 1, porque eu encontrei um personagem.”

**Na tela:** Debinha entra sem cobrir os dois esconderijos que faltam. Não revelar quem está atrás deles.

**Debinha (avatar):**

> “E os outros dois?”

**Na tela:** Debinha sai antes da resposta. Manter os dois esconderijos fechados.

**Professora:**

> “Esses eu deixo para você descobrir.”
```

Cada nota de tela tem sua fala correspondente, com o nome de quem fala. Um vídeo pode conter
vários pares; marcar a entrada do avatar antes da fala dele e a saída antes da retomada da
professora. Não sobrepor vozes, cobrir controles ou antecipar o gesto que responde à pergunta.
Instruções para quem grava não são falas da aula. Não usar o campo plannedVideo do manifesto
como substituto do roteiro completo.

Quando os vídeos já estiverem gravados, registrar as âncoras literais de edição, preservando a
fala existente. Uma pergunta transferida para o avatar sai da fala da professora. Não presumir
edição ou publicação concluída pelo fato de o roteiro estar atualizado. Os exemplos para próximas
aulas e as inserções confirmadas ficam em [Avatares nos vídeos](AVATARES-NOS-VIDEOS.md).

Registrar também as seções sem vídeo: no quiz, escrever **Zappy na página (não gravar)** e a fala literal antes das perguntas, sem notas de cena ou narração de um vídeo inexistente.

Manter os títulos de seção iguais aos do manifesto. Cadê Todo Mundo? usa um cabeçalho
"## 1. Título" por vídeo e "## Comemore sua criação" no certificado. Os demais cursos mantêm os
cabeçalhos "## Seção N. Título" e "### Clipe `chave`" exigidos pelo validador.

Estimar o tempo pela fala em voz alta, incluindo os gestos, sem acrescentar teoria para atingir
uma duração mínima. A demonstração do jogo pronto pode durar 30 a 40 segundos; uma montagem precisa de tempo
para cada encaixe. Incluir as participações dos avatares na medição final e identificar os alvos
anteriores quando a inserção for feita depois da gravação. Não acelerar a demonstração para caber
numa duração arbitrária.

Nas seções com ferramenta externa, manter a autoconferência visual: pedir que a pessoa compare
um resultado funcional ou legível. O vídeo assistido não prova sozinho que o trabalho está
correto. A liberdade de cor e detalhes continua livre.

## 8. Conferência antes de gravar

- Nas primeiras frases, fica claro o que fazer, em qual atividade e como começar?
- Cada fala conversa com a pessoa e chama a atenção dela para o que aparece na tela nos momentos que importam? O que é opcional aparece como convite, sem "não precisa"?
- As três vozes estão no lugar: "você" no que é dela e nas ações, "a gente" no raciocínio e no convite, "eu" só na demonstração? Sobrou algum "nós vamos" ou "o nosso jogo"?
- Lida em voz alta, a fala soa como conversa contínua, com o porquê de cada resultado, ou como frases soltas lidas de um texto? Alguma frase sobre o que já vem pronto ficou solta no meio da montagem?
- Todos os passos necessários aparecem, incluindo confirmação e saída?
- Quem ouve consegue executar sem adivinhar uma peça, valor ou encaixe?
- O vídeo evita tours, agendas, recapitulações longas e teoria sem uso imediato?
- A explicação da palavra nova cabe na tarefa atual?
- A experiência permite observar, sem esconder ações obrigatórias?
- A fala corresponde ao projeto, aos controles e aos critérios de conclusão reais?
- As notas de tela e narrações estão pareadas e a leitura soa natural?
- Quem fala está identificado? A entrada do avatar contribui para a conversa e a professora responde antes de seguir? Zappy está separado como fala da página?
- Proposta, gerador, manifesto, roteiro e falas do Zappy concordam?
- Os tutoriais retirados têm destino no Como Fazer?

Depois, fazer um ensaio com uma criança sem completar as instruções por fora do vídeo.
Na abertura, ela deve conseguir dizer qual jogo vai construir e começar a jogar a versão
pronta. Ao terminar, deve saber como seguir. Os validadores conferem a estrutura; o ensaio
confere se a fala funciona.
