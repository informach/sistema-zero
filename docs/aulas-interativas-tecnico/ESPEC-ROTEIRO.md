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

Cada `{slug}.roteiro.md` é o roteiro de produção. Os cabeçalhos `## Parte N. Título` acompanham as partes do manifesto. Cada vídeo tem **Clipe:** com a chave literal, **Na tela:** com uma nota curta, e **Fala para ElevenLabs:** com um bloco de texto cercado por três crases. Esse bloco contém apenas a fala integral da professora, com tags de áudio e pausas.

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
- As notas de tela e narrações estão pareadas e a leitura soa natural?
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

## 9. Ações da gravação automática (01/11/2026)

O **Na tela** pode dizer, entre colchetes, o que o robô de gravação do EdiAula faz, junto da
frase citada que ele espera:

```
No "Olha aqui", tocar em UM esconderijo [achar arbusto] e deixar ver o personagem aparecer.
```

- Cada colchete é um gesto, no segundo em que a voz diz a frase citada antes dele. Um segundo
  colchete da mesma frase vem depois do tempo que a mão leva. Um colchete numa frase sem citação
  vale do começo da fala seguinte (o `[próxima parte]` no começo de cada parte).
- Aspas dentro do colchete nomeiam um botão, nunca uma frase a esperar.
- O texto do **Na tela** continua sendo a orientação de quem grava à mão: os colchetes só
  acrescentam o gesto. O `validar-roteiros.py` confere só a fala e aceita os colchetes.
- A gravação acontece no palco de gravação do staging (`packages/palco-gravacao`), que mostra a
  aula como a criança vê e não salva nada.

Verbos do EdiAula, para qualquer página: `clicar "Texto"`, `apontar "Texto"`,
`passar o mouse "Texto"`, `rolar até "Texto"`, `esperar "Texto"`, `digitar "texto" em "Campo"`,
`tecla Ctrl+Z` e `arrastar "A" para "B"`.

Verbos do palco (`packages/palco-gravacao/src/lib/verbos.ts`):

| Verbo | O que faz |
| --- | --- |
| `próxima parte`, `concluir aula` | os botões da aula |
| `ampliar jogo`, `ampliar experiência`, `voltar à aula` | a ampliação do bloco da parte |
| `expandir estúdio`, `reduzir estúdio` | o Estúdio em tela cheia e de volta |
| `achar <alvo>` | toca no alvo do jogo pronto, pelo id ou pelo nome (`achar arbusto`) |
| `apontar jogo [x y]` | aponta um ponto do jogo pronto, em pixels do palco do jogo (sem números: o meio) |
| `jogar de novo` | recomeça o jogo pronto |
| `livro próxima`, `livro anterior`, `livro tela cheia`, `livro sair da tela cheia` | o livro 3D |
| `apontar baixar`, `baixar` | o Baixar do material |
| `tocar "<nome>"` | um controle da experiência pelo nome |
| `categoria A > B > C` | abre as categorias da paleta do Estúdio |
| `arrastar "<bloco>" para "<bloco>"` | da paleta para baixo de um bloco da área de trabalho |
| `verificar projeto` | clica e espera a resposta do servidor, acelerada sob a fala |
| `enviar projeto` | clica em Enviar meu projeto: no palco nada é enviado |

Ainda não há verbo para trocar um campo ou um número de um bloco, nem para encaixar dentro de um
bloco (o espaço ao lado de **fazer**): esses gestos continuam sendo marcados à mão no EdiAula.
