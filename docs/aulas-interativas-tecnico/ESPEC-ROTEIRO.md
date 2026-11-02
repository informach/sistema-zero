# Especificação do roteiro de gravação

Formato comum desde 21/10/2026. Leia as [diretrizes pedagógicas](DIRETRIZES-PEDAGOGICAS.md) e o [contrato ElevenLabs v4](DIRETRIZES-VOZ-ELEVENLABS.md). A professora grava uma versão contínua para os dois públicos; a edição kids troca somente frases explicitamente marcadas.

## 1. A abertura situa a tarefa e convida à ação

A criança precisa entender a tarefa sem traduzir a intenção de quem narra. Conforme orientação
do usuário em 03/10/2026, toda seção tem um contexto inicial curto e pertinente. Primeiro situar
o jogo, seu estado atual ou a necessidade; depois dizer o que fazer.

- Apresentação (jogo pronto, demonstração com UM exemplo): dizer qual jogo será construído e a situação; mostrar na primeira pessoa um exemplo ("Olha aqui: quando eu toco num esconderijo, aparece quem estava atrás"), sem resolver a partida; só no fim passar a vez ("Agora é a sua vez: jogue até encontrar os três personagens").
- Experiência: explicar o conceito com uma situação concreta e propor uma investigação. A atividade conduz os testes por falas do Zappy determinadas pelo estado; o vídeo não recita os cliques.
- Construção depois de uma experiência: lembrar o que ela mostrou, testar no próprio jogo o que ainda falta e dizer o que será montado. "Lembra da experiência da parte anterior? Cada personagem encontrado somava um em Achados. Agora a gente vai fazer o seu jogo contar do mesmo jeito! Primeiro, toque num esconderijo do seu jogo. Tá vendo? O personagem aparece, mas Achados continua em zero, porque o jogo ainda não sabe que precisa contar. Então a gente vai ensinar o jogo a somar um em Achados toda vez que um esconderijo for tocado." Sem mandar clicar em Anterior.
- Material (o caderno, que a criança conhece como Passo a passo do projeto): "Olha aqui: este é o seu Passo a passo do projeto! Nele estão os passos para montar o seu jogo, com os blocos que você vai usar e o lugar de cada um. Então, se você esquecer algum passo, é só voltar aqui e abrir o mapa. Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser." (fala atual de `aulas/cade-todo-mundo-aula-1.roteiro.md`). Não dizer "não precisa baixar nem imprimir": a criança entende como uma ordem para não baixar.
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

Quando o envio é obrigatório, apresentar diretamente o próximo passo: “Agora, clique em Enviar meu projeto e confirme em Enviar.” Não justificar o envio como uma escolha de mostrar o jogo à equipe. Depois, nomear a confirmação e a saída reais da seção. Ver Diretrizes, seção 6.

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

**Aplicação ao Farol, 06/10/2026:** a personalização ensina o campo exato de cada imagem: sprites em Ao iniciar, cenário em Desenhar o cenário dentro de A cada quadro do jogo e farol aceso em então. As notas de tela e o Passo a passo do projeto conservam os nomes canônicos com hífens; a narração pode pronunciá-los naturalmente. Nome de imagem não substitui nome de sprite. Os pares de faróis precisam corresponder, e cada tipo conserva dimensões e contato. Antes de mudar x/y da chave, demonstrar separadamente os eixos na experiência de posição. A escolha de velocidade foi retirada; a montagem mantém 3.

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
(a comunidade adulta também usa **Próxima parte**).

## 4. Experiências: preparar e acompanhar a investigação

Aplicar [Conceito, investigação e construção](DESCOBERTA-GUIADA.md), direção de 25/10/2026. O vídeo explica o conceito com uma situação concreta, uma analogia curta e a ligação com o jogo. Termina com um convite que diga o que observar. Uma demonstração breve pode ajudar; os testes completos e os nomes dos controles da experiência ficam com a própria atividade.

Nas notas de tela, registrar a ilustração e os elementos que tornam a ideia concreta. Preservar cócegas/risada e futebol no Cadê. Não mostrar a resolução de todas as descobertas nem narrar uma sequência de cliques para a pessoa reproduzir.

Registrar também as falas internas do Zappy, as condições de cada etapa, a ação principal e os retornos. A fonte deve ser compartilhada com o player; texto, gravação e botão precisam corresponder ao mesmo estado. A ponte da página convida à investigação sem duplicar a primeira instrução. Passos obrigatórios permanecem acessíveis sem abrir pistas.

O Estúdio conserva a montagem completa, no imperativo, com bloco literal, destino, encaixe, campo, valor e teste. O quiz de previsão mostra a cena antes, pede a escolha e apresenta o resultado com correção imediata e nova tentativa. A tentativa completa continua sendo corrigida e registrada no servidor.

## 5. Falar com quem está fazendo

- Usar "você", verbos simples e frases que soem naturais em voz alta. Toda fala conversa com quem faz a aula, como alguém ao lado dela: "o seu Passo a passo do projeto", "o seu jogo", "Sua vez!". Nada de frase impessoal que só descreve.
- Três vozes (Diretrizes, seção 6): "você" para o que é da pessoa, o que ela faz e o que ela conquista, com as ações no imperativo; "a gente" e "vamos" para pensar junto e convidar; "eu" só quando o narrador demonstra. Evitar o "nós" de sala de aula ("Hoje nós vamos aprender…") e dizer "o seu jogo", não "o nosso jogo".
- A fala é uma conversa contínua, não uma lista de frases soltas: cada frase se liga à anterior ("então", "por isso", "mas", "é que", "agora que"; num curso com o bloco Se, "por isso" ou "ou seja" no lugar de "então", que é o nome de uma parte do bloco), todo resultado vem com o porquê ("Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele") e a explicação diz o que é cada coisa no próprio jogo ("O toque é a ação, e a reação que a gente quer é o esconderijo ficar invisível"). Evitar sequências curtas e secas como "Nada acontece. O toque ainda não tem uma reação. Vamos ligar uma." (Diretrizes, seção 6).
- O preparo do cenário, dos personagens e das regras iniciais fica nas notas da equipe. Na fala e no caderno, comemorar a ação da criança e o resultado, sem ressalvas sobre o que veio pronto. Só citar um elemento existente quando orienta a ação, explicando seu papel ("Olha aqui: nessa área já tem o bloco… É ele que percebe quando alguém toca num esconderijo"). Ver Diretrizes, seção 3, ajuste de 10/10/2026.
- Chamar a atenção nos momentos que importam: "Olha aqui:" ao mostrar um lugar, um bloco ou o primeiro gesto da demonstração; "Olha só:" quando aparece um resultado; "Repare:" num detalhe que a pessoa precisa notar; "Tá vendo?" logo depois do teste da retomada. Um chamado por momento importante, variando as expressões; sem repetir "bora", "capricha" ou parabéns a cada gesto (Diretrizes, seção 6).
- O que é opcional vira convite, nunca negação: "Se quiser, você pode ler aqui mesmo. E, se preferir, também pode baixar para guardar." Não dizer o que a pessoa não precisa fazer; uma proibição que evita um erro continua direta ("Não coloque um encontro dentro do outro").
- Evitar perguntas que escondem um pedido. "Teste os dois jeitos" é mais claro que
  "Como será que essa ideia funciona no nosso jardim?".
- Cada "aqui" precisa de um apontamento visível. Cada "isso" precisa de um referente claro.
- Nomear a conquista concreta: o que a pessoa fez e o resultado, sem atribuir a ela passos que não realizou.
- Sem travessões, linguagem comercial ou convite para convencer um responsável.
- Não chamar quem assiste de "criança" ou "aluno". Falar diretamente com "você".
- Termos técnicos entram só quando ajudam a tarefa. Não fazer uma lista de vocabulário no fecho.

## 6. Apontamentos e ações reais

Mostrar a atividade enquanto a fala a apresenta. "Aqui está o jogo pronto" funciona se o
enquadramento realmente o mostra. A ferramenta pode ficar ao lado ou abaixo do vídeo; não gravar
um tour das duas disposições. Conferir o roteiro nos dois tamanhos de tela.

A Pré-visualização do Estúdio acompanha as mudanças automaticamente. Pedir a ação do jogo:
"Toque em um esconderijo", "clique no jogo e segure a seta". Para botões, "clique em"; no jogo,
"toque", "pressione/aperte a tecla" ou "segure a tecla", sempre nomeando a entrada. No teclado de teste, explicar a simulação; esses verbos nunca significam adicionar um bloco (Diretrizes, seção 6). Não inventar um botão de início nem
mandar recarregar a página como passo genérico. Um reinício necessário ao teste deve usar o
controle real e ser conferido antes da gravação.

A ação de saída precisa corresponder à seção: **Próxima parte** entre as partes da fase,
**Concluir aula** na última parte. Se há envio, incluir **Enviar meu projeto** (no Pinta da fase,
**Enviar meu desenho**) e a confirmação **Enviar**; na galeria, **Enviar (1)** e **Recebido!**. Se há certificado, nomear **Baixar meu certificado**. Tours, estados alternativos e
solução de problemas desses fluxos ficam na biblioteca de ajuda.

Encerrar a narração na ação de saída da seção atual. Não acrescentar uma instrução para a
próxima seção ou aula depois de Próxima parte ou Concluir aula. O comando Baixar meu certificado
pertence à seção do certificado. Na publicação pelo Estúdio da aula, esperar **Seu jogo está no
Mural!**, comemorar, copiar com **Copiar link de jogar**, usar **Fechar** e só então orientar
**Concluir aula**. Pelo Estúdio completo, esperar **Publicado! 🎉**, usar **Copiar link** e depois
**Fechar**.

## 7. Formato para gravação

Cada `{slug}.roteiro.md` é o roteiro de produção. Os cabeçalhos `## Parte N. Título` acompanham as partes do manifesto. Cada vídeo tem **Clipe:** com a chave literal, **Na tela:** com o que aparece e os gestos da gravação, escritos a partir da fala (seção 9), e **Fala para ElevenLabs:** com um bloco de texto cercado por três crases. Esse bloco contém apenas a fala integral da professora, com tags de áudio e pausas.

Após o bloco, quando houver substituição kids, a tabela registra ID, personagem, ocorrência, âncora anterior, frase exata substituída, âncora posterior e tags. Notas e recados da página ficam fora do bloco de fala. Uma parte sem vídeo não ganha locução.

O exportador reúne todos os clipes em `{slug}.elevenlabs.txt`, com `[long pause]` entre partes, e produz TXT separado para cada personagem presente e `{slug}.edicao.json`. Copie o TXT integral para o ElevenLabs. Não copie a tabela ou as notas de produção. Confira o limite do modelo escolhido sem descartar falas.

Toda frase tem direção aplicável, com tags antes dos segmentos; mudanças de intenção e palavras que precisem de destaque recebem ajustes locais. Não taguear cada palavra mecanicamente. Não usar SSML `<break>`. A pausa longa tem alvo de aproximadamente três segundos para corte, conferidos na edição: a tag não garante duração.

O master conserva a pergunta ou pensamento que será substituído. A edição kids silencia somente a frase correspondente da professora e coloca a mesma fala do personagem. A retomada precisa funcionar naturalmente nos dois cortes. Os IDs e âncoras vêm da fonte, não de tempos inventados.

Estimar o tempo pela fala sem tags, incluindo os gestos. Não acelerar demonstrações nem adicionar teoria para atingir uma duração mínima. Validar a pronúncia e o ritmo na voz selecionada antes da produção em lote.

A tela da gravação precisa ser a tela que a criança vai ver. Lições da gravação do Cadê
(10 e 11/10/2026), para registrar no cabeçalho de produção de cada roteiro:

- abrir a fase numa aba nova depois do último deploy; uma aba aberta antes pode recarregar a
  página no meio da tomada ou mostrar um segundo **Atualizar** no cabeçalho do Estúdio;
- gravar cada experiência numa sessão sem progresso naquele bloco: quem já fez abre a revisita,
  em "Você descobriu", e um controle deixado ligado no ensaio volta ligado;
- gravar o envio numa sessão sem envio anterior na fase, confirmando em **Enviar** sem preencher
  o **Recado (opcional)**. Depois do primeiro envio, a tela mostra **Enviar de novo** e
  **Reenviar**, e o **Recomeçar** do Estúdio não apaga o envio: para repetir a tomada, usar outro
  perfil de ensaio. O mesmo vale para publicar no Mural, que trava o **Compartilhar** naquele
  navegador;
- quando a fala diz que o Estúdio guarda o jogo sozinho, mostrar o selo **Salvo na sua conta**
  só depois de ele aparecer de verdade, sem simular na edição;
- numa parte sem Estúdio, dizer de onde vem a imagem do jogo, ou gravar só a cena da própria
  parte.

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
- As notas de tela e narrações estão pareadas e a leitura soa natural? Cada frase do Na tela cita a fala atual da parte e tem os gestos que ela pede (seção 9)?
- O master funciona sozinho? A substituição kids conserva a frase exata e a continuidade, sem voz dupla? Zappy está separado como fala da página?
- Quando um bloco chega com um nome de outro jogo, a fala diz a palavra da tela e onde clicar?
- O estado da conta de gravação (sem progresso nas experiências, sem envio na fase, aba aberta depois do deploy) bate com o que a criança vai ver?
- Proposta, gerador, manifesto, roteiro e falas do Zappy concordam?
- Os tutoriais retirados têm destino no Como Fazer?

Depois, fazer um ensaio com uma criança sem completar as instruções por fora do vídeo.
Na abertura, ela deve conseguir dizer qual jogo vai construir e começar a jogar a versão
pronta. Ao terminar, deve saber como seguir. Os validadores conferem a estrutura; o ensaio
confere se a fala funciona.

## Revisão de 26/10/2026: propósito, escolha e linguagem

Na experiência, registrar o que observar e comparar, mantendo a ordem de exploração livre. Não narrar uma lista de cliques que a pessoa apenas reproduz. Zappy pode sugerir uma comparação conforme o que falta observar, enquanto os demais controles continuam disponíveis. A montagem do Estúdio preserva todos os passos operacionais.

Conferir, frase por frase, a diferença entre adicionar/retirar um comando, pressionar/soltar uma tecla e avançar/executar o teste. O texto precisa corresponder ao efeito real do controle. Registrar separadamente as regras atuais e o resultado anterior. Os reinícios de tentativa conservam as descobertas; o reinício da experiência limpa o percurso. Atualizar o caderno e os derivados junto com o roteiro e os manifestos.

## 9. O Na tela e a gravação automática (01/11/2026)

O **Na tela** de cada parte é lido por duas pessoas: quem grava à mão e o robô de gravação do
EdiAula. Para quem grava, é a descrição do que aparece. Para o robô, são os gestos entre
colchetes, cada um preso a uma frase da fala. O padrão de referência é o Cadê Todo Mundo
(`docs/aulas-interativas/faisca/cade-todo-mundo/`, Aula 1, Aula 2 e certificado).

### 9.1 A fala manda

A fala da professora é a fonte. O **Na tela** é escrito depois dela, frase por frase, e diz só o
que a fala pede para ver. Quando a fala muda, o **Na tela** é refeito a partir da fala nova:
descrição antiga que a fala não sustenta sai. Nunca mudar a fala para caber um gesto.

Toda frase da fala que diz "olha aqui", "repare", "clique", "abra", "arraste" ou "toque" tem um
gesto no **Na tela**. Toda ação que a fala pede para a criança fazer (Próxima parte, Verificar
projeto, Enviar, Concluir aula) é feita na tela no mesmo momento.

### 9.2 Como o robô usa o Na tela

1. A voz gerada no ElevenLabs entra no EdiAula, que a transcreve sozinho.
2. Em **Gerar plano do roteiro**, o EdiAula procura na voz cada frase citada no **Na tela** e
   coloca os colchetes daquela frase no segundo em que a professora a diz.
3. Em **Verificar plano**, com o palco de gravação aberto, ele confere cada gesto na página sem
   gravar.
4. Na gravação, o robô move o mouse como uma criança, faz os gestos nos tempos da voz e acelera
   as esperas do servidor (time-lapse). Os trechos `[na edição: ...]` viram lembretes na linha do
   tempo.

O tempo vem sempre da voz gravada. Se a voz for gerada de novo, gerar o plano de novo. As trocas
kids não mudam o plano: ele usa a voz da professora, que tem a fala inteira.

A gravação acontece no palco de gravação do staging (`packages/palco-gravacao`), que mostra a
aula como a criança vê e não salva nada (progresso, envio, Mural).

Cada parte é gravada à parte. O palco leva o projeto do Estúdio de uma parte para a seguinte: a
parte abre com o que a parte de antes montou na gravação mais recente dela, ou, sem ela, com o
projeto de entrada da parte nos exemplos da aula. Por isso, grave as partes em ordem: a última
parte (a do Compartilhar) mostra o jogo com tudo o que foi montado. Se o projeto que veio da parte
de antes tiver blocos um por cima do outro, `[organizar blocos]` arruma pelo botão direito; ponha
num trecho que a edição troca por outra imagem. O envio não passa de uma
parte para a outra: a parte que vem depois do envio do projeto (a do Compartilhar, que só libera
depois dele) começa com "A parte começa com o projeto já enviado na Parte N", e o endereço dela
no palco leva `&enviado=1`.

### 9.3 A frase do Na tela

Cada frase do **Na tela** começa com a citação da fala que ela espera:

```
No "Olha aqui", tocar num esconderijo [achar arbusto]: ele some e aparece quem estava atrás dele.
```

- **A citação** é um trecho da fala **desta mesma parte**, entre aspas, no começo da frase do
  **Na tela** (`No "..."` ou, para um trecho de edição, `Do "..." até o "..."`). Só a primeira
  citação fora dos colchetes vale como âncora; uma citação no meio da frase não marca tempo.
- O trecho pode ignorar maiúsculas, acentos, pontuação e as tags de voz, mas as palavras têm de
  ser as da fala, inteiras e na mesma ordem. Duas a seis palavras bastam. Prefira um trecho que
  apareça uma vez só na parte; se ele se repete, a ordem das citações no **Na tela** desfaz a
  dúvida.
- **Cada frase do Na tela termina com ponto** e a seguinte começa com maiúscula: é assim que o
  EdiAula separa as frases. Um ponto no meio da frase seguido de maiúscula (uma abreviação)
  também corta a frase; evite.
- **Os colchetes** são os gestos, na ordem em que acontecem. O texto fora deles continua sendo a
  orientação de quem grava à mão.
- **Aspas dentro de colchetes** nomeiam um botão, um bloco ou um campo, nunca uma frase a
  esperar: `[apontar "Ligar a reação ao toque"]`.
- **Frase sem citação** (uma observação, um cuidado) se junta à frase anterior e seus colchetes
  vêm depois dos dela. No começo do **Na tela**, antes de qualquer citação, ela vale do começo da
  fala da parte: é o lugar do `[expandir estúdio]` de uma parte que já começa no Estúdio.

### 9.4 O tempo dos gestos

- A mão chega ao alvo quando a voz começa a frase citada, e o primeiro colchete acontece quando
  a voz termina de dizê-la. O tamanho da citação decide o momento: em
  `No "Agora clique em Próxima parte"`, o clique vem depois de "parte"; em `No "Agora"`, logo
  depois de "Agora". Cite até a palavra depois da qual a ação deve aparecer.
- **O clique só depois da palavra do clique.** A mão pode ir até o alvo antes, mas clicar, tocar
  ou arrastar só acontece depois que a voz diz a palavra da ação. Comece a citação onde a mão deve
  sair e termine nela: `No "Agora vamos testar no seu jogo, toque num esconderijo"` leva a mão no
  "Agora" e toca depois de "esconderijo". Citar só `No "Agora vamos testar no seu jogo"` toca antes
  do "toque".
- **Cada gesto na sua palavra.** Quando a fala nomeia dois cliques ("clique em jogador, desça até
  o fim da lista e clique em escolhido"), são duas citações: `No "Então clique em jogador"`
  [abrir campo "jogador" em "Deixar o sprite"] e `No "desça até o fim da lista que abre e clique em
  escolhido"` [escolher "escolhido" em "Deixar o sprite"]. O mesmo para o número: `No "Clique no
  50"` [abrir campo "50" em …] e `No "e troque por 0"` [escolher "0" em …]. Dois colchetes numa
  só citação ficam 2 segundos um depois do outro, depois do fim dela.
- **A saída da parte em duas citações.** Voltar ao tamanho da aula e clicar em **Próxima parte**
  numa só citação deixa o clique 2 segundos depois da fala. O voltar vai numa frase anterior
  (`No "Agora é a sua vez"`, `No "Quando terminar"`) e o clique na sua:
  `No "Quando terminar, clique em Próxima"`.
- **A citação é procurada no que a voz disse.** A transcrição às vezes ouve diferente: um nome
  ("Zappy" vira "Zap"), "num" vira "no", "zero" vira "0". Números escritos de um jeito ou de outro
  valem igual, e numa citação de quatro palavras ou mais uma em cada quatro pode ter sido ouvida
  diferente, menos a última. Evite citar só um nome próprio; cite as palavras comuns em volta
  (`No "ajuda a observar"`). A citação que a voz não tem é avisada no **Gerar plano do roteiro**, e
  o gesto dela vem logo depois do anterior.
- Cada gesto de mão (apontar, clicar, tocar, arrastar) leva cerca de 2 segundos: o mouse viaja,
  para em cima do alvo e age. O segundo colchete da mesma frase vem 2 segundos depois do primeiro,
  e assim por diante.
- Os gestos de uma frase têm de caber antes da próxima frase citada. Conte 2 segundos por gesto e
  pouco mais de duas palavras por segundo de fala. O que não couber acontece em seguida, na
  ordem do roteiro, e entra acelerado na edição.
- Para agir depois de uma frase inteira, cite a frase inteira, ou o começo da frase seguinte. O
  ampliar que vem depois de "vamos ver como ele funciona" vai no `No "Neste jardim"`.
- Uma espera do servidor (o **Verificar projeto**, a capa do **Gerar capa**) entra acelerada
  sob a fala, sem esticar o vídeo.
- Todos os gestos aparecem. O que cairia depois do fim da voz vai logo depois dela, acelerado se
  não couber. Mesmo assim, cite a ação de saída na última frase, para o clique cair na fala.

### 9.5 As tags

Todos os gestos que o EdiAula entende no palco do Sistema Zero. A lista viva fica em
`packages/palco-gravacao/src/lib/verbos.ts`; um verbo novo entra lá e aqui.

**Aula e blocos**

| Tag | O que faz | Quando usar |
| --- | --- | --- |
| `[próxima parte]` | clica em **Próxima parte** | na frase que pede Próxima parte, depois de voltar o bloco ao tamanho da aula |
| `[concluir aula]` | clica em **Concluir aula** | na frase que pede Concluir aula, na última parte |
| `[ampliar jogo]` | amplia o jogo pronto | antes de mostrar o jogo pronto |
| `[ampliar experiência]` | amplia a experiência | antes de mostrar a experiência |
| `[voltar à aula]` | volta o jogo ou a experiência ao tamanho da aula | antes de Próxima parte ou Concluir aula |
| `[expandir estúdio]` | coloca o Estúdio em tela cheia | no começo de uma parte de montagem |
| `[reduzir estúdio]` | volta o Estúdio ao tamanho da aula | antes de Próxima parte ou Concluir aula |

**Jogo pronto**

| Tag | O que faz |
| --- | --- |
| `[achar arbusto]` | toca num alvo do jogo pronto, pelo nome ou pelo id do alvo no manifesto |
| `[apontar jogo]`, `[apontar jogo 75 26]` | aponta o meio do jogo ou um ponto, em pixels do palco do jogo (o placar, uma mensagem) |
| `[jogar de novo]` | recomeça o jogo pronto |

**Material da aula (Passo a passo do projeto)**

| Tag | O que faz |
| --- | --- |
| `[apontar livro]` | aponta o livro 3D |
| `[livro tela cheia]`, `[livro sair da tela cheia]` | coloca o livro em tela cheia e tira |
| `[livro próxima]`, `[livro anterior]` | vira uma página |
| `[apontar baixar]` | aponta o botão **Baixar**, sem clicar |
| `[baixar]` | clica em **Baixar** (no palco o arquivo não é salvo) |

**Experiência**

| Tag | O que faz |
| --- | --- |
| `[tocar "Tocar no arbusto"]` | toca num controle da experiência pelo nome dele |
| `[apontar zappy]` | aponta o Zappy, ao lado da fala dele |
| `[apontar "Valor atual de achados"]` | aponta qualquer coisa da página pelo nome (verbo do EdiAula, abaixo) |

**Estúdio**

| Tag | O que faz |
| --- | --- |
| `[apontar paleta]` | aponta a paleta de comandos |
| `[categoria Jogo 2D > Sprites > Aparência]` | abre as categorias da paleta, uma depois da outra |
| `[categoria Jogo 2D]` com a categoria aberta | recolhe a categoria (clicar de novo numa subcategoria aberta também a recolhe) |
| `[arrastar até "Quando acontecer"]` | arrasta um espaço vazio da área de trabalho até o bloco ou a área aparecer |
| `[apontar bloco "Quando clicar ou tocar"]` | aponta um bloco da área de trabalho pelo texto dele |
| `[apontar encaixe em "Quando clicar ou tocar"]` | aponta o espaço ao lado de **fazer** do bloco |
| `[apontar abaixo de "Deixar o sprite"]` | aponta o lugar logo abaixo de um bloco, onde o próximo vai entrar |
| `[encaixar "Deixar o sprite" em "Quando clicar ou tocar"]` | leva um bloco da paleta para o espaço ao lado de **fazer**, o único lugar onde ele encaixa |
| `[encaixar "Somar 1" abaixo de "Deixar o sprite"]` | leva um bloco da paleta para logo abaixo de um bloco da área de trabalho |
| `[trocar "jogador" por "escolhido" em "Deixar o sprite"]` | troca um campo de bloco: escolhe no menu ou reescreve o número ou o texto; `em "<bloco>"` diz qual bloco quando há mais de um |
| `[tocar prévia arbusto]`, `[tocar prévia 137 209]` | toca no jogo da pré-visualização, por um alvo do jogo pronto ou por um ponto em pixels do jogo |
| `[apontar prévia 75 26]` | aponta um ponto do jogo da pré-visualização |
| `[verificar projeto]` | clica em **Verificar projeto** e espera a resposta, acelerada |
| `[enviar projeto]` | clica em **Enviar meu projeto** (ou **Enviar de novo**) e confirma em **Enviar**; no palco nada é enviado |
| `[compartilhar]` | abre o **Compartilhar** do Estúdio; no palco nada vai para o Mural |

**Verbos do EdiAula, para qualquer página.** Servem para um botão ou campo que não tem tag
própria; o nome é o que a pessoa lê na tela ou o nome acessível do botão:

| Tag | O que faz |
| --- | --- |
| `[clicar "Gerar capa"]` | clica no botão ou link com esse nome |
| `[apontar "Resumo do projeto"]` | aponta, sem clicar |
| `[passar o mouse "Texto"]` | para o mouse em cima, para mostrar uma dica |
| `[clique duplo "Texto"]`, `[clique direito "Texto"]` | os outros cliques |
| `[digitar "Achei!" em "Recado"]` | escreve num campo |
| `[tecla Escape]`, `[tecla Ctrl+Z]` | aperta uma tecla ou atalho |
| `[esperar "Objetivo cumprido"]`, `[esperar "Carregando" sumir]` | espera um texto aparecer ou sumir |
| `[rolar até "Texto"]`, `[rolar para baixo]` | rola a **página** (não a área de blocos do Estúdio) |
| `[arrastar "A" para "B"]` | arrasta numa página comum (no Estúdio, usar `encaixar`) |

**Trecho da edição**

| Tag | O que faz |
| --- | --- |
| `[na edição: o que entra]` | o robô fica parado e o EdiAula deixa um lembrete com esse texto na linha do tempo, para a edição trocar aquele pedaço da tela |

### 9.6 Ampliar e voltar

Toda demonstração num bloco interativo acontece com o bloco ampliado, e ele volta ao tamanho da
aula só antes de **Próxima parte** ou **Concluir aula**:

| Bloco | Ampliar | Voltar |
| --- | --- | --- |
| Jogo pronto | `[ampliar jogo]` | `[voltar à aula]` |
| Experiência | `[ampliar experiência]` | `[voltar à aula]` |
| Estúdio | `[expandir estúdio]` | `[reduzir estúdio]` |

- O **Verificar projeto**, o envio e o **Compartilhar** aparecem dentro do Estúdio expandido: não
  reduzir antes deles.
- O livro do material não tem ampliar: ele usa `[livro tela cheia]` e sai com
  `[livro sair da tela cheia]` antes de apontar o **Baixar**.
- A frase que pede a saída leva os dois gestos juntos:
  `No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte].`
- A parte seguinte já começa na tela certa: não repetir `[próxima parte]` no começo dela. A
  exceção é a parte que vem depois de uma parte sem vídeo (um quiz): ela começa com
  `[próxima parte]`, numa frase sem citação.

### 9.7 Tela que entra na edição

Quando um trecho vai mostrar outra coisa (outro fundo, uma animação, um vídeo do jogo sendo
jogado, uma imagem do material), o **Na tela** diz de onde até onde e o que entra:

```
Do "Nesta parte" até o "ligada ao toque para acontecer", a tela fica parada, e a edição troca esse trecho pela explicação de ação e reação, com as cócegas e a risada [na edição: ação e reação, com as cócegas e a risada].
```

- A âncora é a primeira citação (`Do "..."`); a segunda (`até o "..."`) diz a quem edita onde o
  trecho termina.
- O texto do colchete é o que aparece no lembrete: curto e concreto.
- Nesse trecho não vão outros gestos. O próximo gesto vem na frase seguinte, que cita a fala onde
  a tela real volta.

### 9.8 Receitas

**Abertura com jogo pronto**

```
Do "Oi" até o "funciona", a tela fica parada, e a edição troca esse trecho por outro fundo [na edição: outro fundo na abertura]. No "Neste jardim", ampliar o jogo pronto [ampliar jogo]. No "Olha aqui", tocar num esconderijo [achar arbusto]. No "repare no número Achados", apontar o número [apontar jogo 75 26]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte].
```

**Material da aula**

```
No "Aqui você encontra os passos", colocar o livro em tela cheia [livro tela cheia] e passar as páginas [livro próxima] [livro próxima]. No "Se quiser, você pode ler aqui mesmo", sair da tela cheia [livro sair da tela cheia] e mostrar o livro [apontar livro]. No "clicar em Baixar", clicar em **Baixar** [baixar]. No "Agora clique em Próxima parte", clicar em **Próxima parte** [próxima parte].
```

**Experiência**

```
No "Agora é a sua vez de investigar", ampliar a experiência [ampliar experiência]. No "Compare o que acontece", mostrar onde a reação liga e desliga [apontar "Ligar a reação ao toque"]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte].
```

Na experiência, mostrar onde estão os controles e o Zappy, sem fazer a investigação no lugar da
criança.

**Montagem no Estúdio**

```
A parte começa com o Estúdio expandido [expandir estúdio]. No "encontre a área Quando acontecer", arrastar até a área aparecer [arrastar até "Quando acontecer"]. No "Agora sim, abra Jogo 2D", abrir as categorias [categoria Jogo 2D > Sprites > Aparência]. No "Arraste esse bloco", levar o bloco até o espaço ao lado de **fazer** [encaixar "Deixar o sprite" em "Quando clicar ou tocar"]. No "clique em jogador", trocar o campo [trocar "jogador" por "escolhido" em "Deixar o sprite"]. No "Agora vamos testar", tocar na pré-visualização [tocar prévia arbusto]. No "Clique em Verificar projeto", [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando o envio terminar", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula].
```

- Abrir a categoria antes do `encaixar`: o bloco sai da paleta aberta.
- Para mostrar a paleta sem pegar bloco, abrir e recolher a mesma categoria:
  `[categoria Jogo 2D]` e de novo `[categoria Jogo 2D]`.
- Um bloco de evento recebe a reação só no espaço ao lado de **fazer** (`encaixar ... em`); um
  bloco seguinte entra logo abaixo de outro (`encaixar ... abaixo de`).
- Numa aula sem jogo pronto, os toques na pré-visualização vão por ponto
  (`[tocar prévia 137 209]`), em pixels do jogo.

**Compartilhar no Mural**

```
No "clique em Compartilhar", abrir o Compartilhar [compartilhar]. No "o resumo do projeto já vem preenchido", mostrar o resumo [apontar "Resumo do projeto"]. No "clique em Gerar capa", [clicar "Gerar capa"]. No "clique em Publicar", [clicar "Publicar"]. No "Clique em Copiar link de jogar", [clicar "Copiar link de jogar"]. No "clique em Fechar", [clicar "Fechar"], voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula].
```

**Certificado**

```
No "Agora clique em Baixar meu certificado", clicar em **Baixar meu certificado** [clicar "Baixar meu certificado"]. No "Quando o certificado baixar", clicar em **Concluir aula** [concluir aula].
```

### 9.9 Erros comuns

- Citar uma frase que não está na fala da parte (de uma versão antiga, de outra parte ou de uma
  fala do Zappy): a frase não marca tempo e os gestos dela vão parar na frase anterior.
- Pôr a citação no meio da frase do **Na tela** (`mostrar, no "Olha aqui", ...`).
- Reduzir o Estúdio antes do **Verificar projeto** ou do envio.
- Esquecer o `[voltar à aula]` ou o `[reduzir estúdio]` antes de **Próxima parte**.
- Usar `[rolar até]` ou `[arrastar "A" para "B"]` dentro do Estúdio: lá valem `[arrastar até]`
  e `[encaixar]`.
- Apontar o **Baixar** quando a fala pede o clique: `[baixar]` clica, `[apontar baixar]` só
  aponta.
- Juntar gestos demais numa frase curta. Se não cabem, escolha os que a fala nomeia.
- Inventar uma tag. Verbo que o palco não conhece aparece como erro no **Verificar plano**.

### 9.10 Conferência

- `python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py` confere a fala e também
  as citações do **Na tela**: cada `No "..."`, `Do "..."` e `até o "..."` precisa estar na fala
  da mesma parte.
- No EdiAula, **Gerar plano do roteiro** informa quantos gestos ficaram de fora porque a voz não
  diz a frase deles, e **Verificar plano** confere cada gesto no palco. Os dois precisam terminar
  sem nada de fora antes de gravar.
- Lida em voz alta junto com a fala, cada frase do **Na tela** precisa cair no momento em que a
  professora fala daquilo.
