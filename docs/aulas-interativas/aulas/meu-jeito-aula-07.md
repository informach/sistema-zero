# O Jogo do Meu Jeito · Aula 7 · As suas pedras entram no jogo

## Resumo

- **Estado de entrada:** o jogo com a nave dela já animada, terminado na Aula 6. As pedras que caem
  ainda são as cinzas do Kit espaço. A arte `asteroide` já está no projeto, guardada e sem uso.
- **Vitória do dia:** o jogo inteiro com a cara dela. A nave dela voando, as pedras dela caindo e
  girando, e as regras, o sorteio, o placar, as vidas e o reinício exatamente como estavam. É o marco
  do curso.
- **Seções hoje:** 8 · **Seções propostas:** 6
- **Clipes hoje:** 6 · **Clipes propostos:** 5
- **Blocos no manifesto:** 19, em `aulas/meu-jeito-aula-07.manifesto.json`
- **Cenas:** 1, a `two-clocks`, construída para cá e já no catálogo. A cena usada hoje (`spawn`) sai,
  porque o foco dela não é o conceito da aula.
- **Perguntas de múltipla escolha hoje:** 3 · **propostas:** 0 (1 vira experiência, 1 migra para o
  quiz final, 1 vira frase de conclusão)
- **Blocos de texto corrido:** 0 · **eram:** 6. Por decisão de produto de 20/09/2026, nos cursos
  infantis não existe texto corrido. Os 6 blocos saíram e o conteúdo de cada um entrou nas
  instruções de produção do vídeo da própria seção, para ser executado na tela: a folha das pedras
  foi para o `video-folha-asteroide`, o passo a passo e a conferência do criador novo para o
  `video-novo-criador`, o encaixe e a conferência do animar para o `video-animar-cada`, e a
  conferência do projeto mais o envio para o `video-fecho-v6`. Nas seções 4 e 5, onde havia dois
  textos para o mesmo clipe, os dois entraram juntos, em ordem, sem repetir.
- **Balões do Zappy:** 11 · **eram:** 10. Nasceu 1, o `fala-enviar-o-projeto`, com o lembrete curto
  do envio.
- **Regras de produto de 20/09/2026:** ferramenta de criação e experiência não dividem a mesma seção,
  e toda seção com ferramenta tem vídeo mostrando como se faz. A seção `dois-relogios` batia na
  primeira, e o caso dela é o de **tirar o `externalTool`**, não o de dividir: ali quem faz a aula não cria
  nem muda nada no Estúdio, só localiza um bloco que já existe desde o Desafio e mexe na cena. Sem
  ferramenta, a segunda regra também deixa de valer, e a seção continua sem vídeo, como o redesenho
  já tinha decidido. As seções e os blocos continuam os mesmos: 6 seções, 19 blocos.

## Como a fala manda sair da aula

A regra é a mesma das oito aulas, e a **nota de decisão de plataforma completa está em
`meu-jeito-aula-01.md`**. Em duas linhas, sem condicional:

1. **Ir para uma ferramenta usa o botão da própria seção**, `Abrir meu Estúdio` ou `Abrir meu
   Pinta`, que o player desenha quando a seção declara `externalTool` (`lesson-sections.tsx`). Ele
   abre em **outra aba**, e a fala diz isso, porque a aula fica na aba de trás e é para lá que se
   volta.
2. **Quando o destino não é ferramenta e não tem botão**, a fala manda antes clicar no **Mostrar
   menu**, o botão colado na beirada esquerda, e só então nomeia o item, sempre com os dois degraus
   (**Criar › Estúdio**, **Comunidade › Mural dos Criadores**, **Comunidade › Clube dos Criadores**).

⚠️ **O Mostrar menu some enquanto um projeto está aberto na ferramenta.** A régua é
`navAvailable = onFocus && isTablet && !workspaceActive` (`focus-mode.tsx`), e o Estúdio liga o
`workspaceActive` assim que um projeto abre (`studio-full-editor.tsx`). Então nenhuma fala pode
mandar "clica no Mostrar menu" de dentro de um projeto aberto: de lá se sai primeiro para a lista
**Meus Jogos**, pela marca **Sistema Zero Studio** da barra de cima ou por **Mais opções › Estúdio ›
Meus projetos**, e só ali o botão do menu volta a existir.

**Nesta aula só a regra 1 aparece.** As quatro seções de ferramenta têm `externalTool: "estudio"`,
então o caminho falado é sempre o **Abrir meu Estúdio**, e a barra esquerda não é nomeada em lugar
nenhum. O roteiro gravado antigo abre a Parte 1 por "menu da esquerda, Estúdio", e é esse trecho que
precisa ser regravado.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Cada folha tem o tamanho dela, e ele vem do Pinta | Sim, **mas já concretizado na Aula 6** (`sheet-vs-sprite`) | Não | | | Aqui é a segunda vez, com outro número. A cena da Aula 6 já entregou a distinção entre o quadro da folha e o tamanho no jogo. Repetir o palco não ensina nada. A ideia volta como pergunta do quiz final, que é onde revisão tem função declarada |
| Uma folha por desenho, e as duas convivem | Não. Ela vê os dois blocos ali, com nomes diferentes | Não | | Dentro da construção | É o corolário direto da regra de nomes da Aula 6, e ela acabou de ver |
| **O quadro do relógio e o quadro da animação são duas coisas com o mesmo nome** | **Sim, e é o conceito mais difícil do curso.** Dois tempos rodando ao mesmo tempo, independentes, e nenhum dos dois aparece como número na tela dela | **Sim** | Experimentação (cena `two-clocks`) | Antes de montar o criador novo | Hoje é uma frase de vinte segundos dentro de um clipe, seguida de uma cena que trata de outro assunto. É a maior lacuna da aula |
| **Cada pedra começa a animação quando nasce** | **Sim.** É o que decide onde o bloco de animar mora, e é invisível | **Sim**, dentro da mesma cena | Experimentação (`two-clocks`, meta `each-one`) | Antes de montar | Separar em duas cenas repetiria o palco. As duas ideias são o mesmo relógio olhado de dois lugares |
| O bloco do Kit espaço não tem campo de imagem | Não. É uma ausência que se vê olhando os campos | Não | | Dentro da construção, em quinze segundos | Ela olha os sete campos e não acha imagem. A honestidade é dizer que nunca teve e que não é erro dela |
| Aqui monta antes de apagar, ao contrário da Aula 6 | Sim, **mas já concretizado na Aula 6** (`unique-names`) | Não | | Dito na hora, em duas frases | A regra é a mesma: o bloco velho da nave criava o nome `nave`, e este não cria nome nenhum. A cena da Aula 6 se paga aqui |
| Arrastar a pecinha do sorteio, e o buraco que ela deixa | Não é conceito, é gesto com efeito colateral visível | Não | | Dentro da construção, avisado | O soquete vazio vira zero e as pedras cinzas passam a nascer todas no mesmo ponto. Sem aviso, ela acha que quebrou o jogo. Dizer é obrigação de honestidade, não conteúdo novo |
| A caixa de colisão passa a seguir o desenho dela | Sim, e é invisível | Não | | Duas frases no fecho, com a ressalva | A aula já tem vitória visível de sobra. E a ressalva importa mais do que a cena: os limites são do conteúdo opaco, e isso não é promessa de colisão pixel a pixel |
| Editar desenho: mexer no Pinta e o jogo acompanhar | Não. É caminho de ajuda | Não | | Uma linha na entrega | Abrir uma tarefa nova no fim da aula do marco seria roubar o momento dela |

Nove coisas, uma concretização com duas faces. Sete conceitos não ganham cena, e cinco deles porque
as cenas das Aulas 5 e 6 já os cobriram.

## Diagnóstico do desenho atual

**A cena da aula é sobre outro assunto.** A seção 3 (*Observe: uma nave, muitos nascimentos*) roda
`spawn`, "Abra espaço entre os cactos", cujo conteúdo é o intervalo do relógio de nascimento: sem
relógio vira parede, com relógio nasce um de cada vez. Nesta aula ninguém **toca no relógio**.
O `A cada 40 quadros` já está montado desde o Desafio, ela não muda o intervalo e não vai mudar. A
cena responde uma pergunta que a aula não faz, e deixa sem resposta a que ela faz: como o relógio que
cria as pedras e o relógio que troca os desenhos de cada pedra convivem sem se atropelar.

**O conceito difícil cabe em uma frase de clipe.** A desambiguação da palavra quadro está no
`video-tempo-demo`, assim: *"O quadro desse nome conta o tempo do jogo, ele não é o desenho da sua
animação: são duas coisas diferentes com o mesmo nome."* É uma frase correta e boa, e é tudo. Depois
dela quem faz a aula precisa decidir, sozinha, onde encaixar o bloco de animar, e a aula resolve isso
mandando encaixar e depois cobrando numa pergunta de múltipla escolha por que foi ali.

**A seção 2 é um encaixe sozinho.** *Prepare a folha de 64 por 64* tem um bloco, quatro campos, e
termina com a tela não mudando. Ela é curta e correta, mas hoje carrega uma pergunta de múltipla
escolha que revisa a Aula 6 no meio da montagem, quando o lugar dela é o quiz final.

**Uma pergunta cobra depuração de um estado que a própria aula criou.** *Estão caindo pedras suas e
pedras cinzas. O que conferir primeiro?* é um teste sobre uma coexistência que a aula montou de
propósito e resolve no gesto seguinte. A resposta certa já está no roteiro como instrução.

**O caminho de paleta do bloco central manda abrir uma gaveta que não existe.** A narração manda ir
em "Jogo 2D" e clicar na subcategoria **Muitos**, e **Muitos saiu da paleta**. Na edição atual
(`jogo-2d-1.0-documento-2`), o `No grupo criar um
sprite chamado ... com imagem vx vy` está em **Jogo 2D › Grupos › Criar e percorrer**, e é a própria
tabela de blocos deste roteiro que registra esse caminho. A fala e a tela discordam.

**O gêmeo colorido não é nomeado, e ele está na gaveta.** Na mesma seção **Criar e percorrer** existe
o `No grupo criar um sprite chamado ... cor ... com vx vy`, quase igual, com **cor** no lugar de
**imagem**. A ordem de tela, medida em `official-extensions/game-2d/palette.ts` em 20/09/2026, é:
`Criar grupo de sprites`, o irmão de **cor**, o de **texto**, o de **com imagem**, `Criar tiro no
grupo`, `Para cada sprite do grupo` e `quantos sprites tem no grupo`. Ou seja, o que a aula usa é o
**quarto**, e o irmão que engana é o **segundo**: eles não ficam lado a lado, e há um terceiro "No
grupo criar" entre os dois. A narração diz "o mais comprido de todos", que é um critério frágil com
três blocos parecidos na mesma lista. O critério bom é o fim do rótulo.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** é o dia em que o jogo fica inteiro com a cara dela, e ela precisa ver isso antes
  de começar.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`) · o jogo rodando com a nave dela e as pedras dela caindo e girando.
     Fala curta: "A sua nave já está no jogo. Hoje entram as suas pedras. A nave foi criada uma vez, no
     começo, e as pedras vão nascendo durante a partida inteira, uma atrás da outra. Por isso hoje tem
     um jeito diferente de fazer, e ele começa por entender dois relógios que rodam ao mesmo tempo."
     Duração alvo: 25 a 35 segundos.

### Seção 2. Prepare a folha das pedras

- **Intenção:** construção
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** é um encaixe curto que precisa estar pronto antes, e ele mostra as duas folhas
  convivendo com nomes próprios.
- **Conclui quando:** `Carregar folha de quadros folha-asteroide da imagem asteroide com quadros de
  64 x 64 px` está no **Ao iniciar**, logo abaixo do `Animar sprite` da nave e acima do `Criar grupo
  de sprites tiros`
- **Blocos:**
  1. `video` (`video-folha-asteroide`) · o caminho, o encaixe e os quatro campos executados na tela.
     Abrir o mesmo jogo, pegar em **Jogo 2D › Sprites › Animação** o `Carregar folha de quadros da
     imagem com quadros de x px`, que é o mesmo bloco da aula passada, e encaixar entre o `Animar
     sprite` da nave e o `Criar grupo de sprites tiros`. Depois `folha-asteroide` no nome, pela mesma
     regra da aula passada, `asteroide` na imagem, e os dois campos de tamanho, que vêm com 32,
     trocados por 64 um a um, com as duas folhas aparecendo na lista, uma de 32 e outra de 64. A
     razão do número: "na nave era 32 e aqui é 64, porque no Pinta você desenhou o asteroide num
     quadro maior, no Médio do vetor. Cada folha tem o tamanho que ela tem, e o bloco precisa saber o
     tamanho certo de cada uma." Fecha com a conferência junto e o pedido de pausa. **Não usar o 40
     do tamanho visível como se fosse tamanho de quadro.** Duração alvo: 60 a 75 segundos.
  2. `dialogue` · fecho curto: "Olhe a área do jogo. Não mudou nada, e é isso mesmo. Esse bloco só
     deixou a folha do asteroide pronta para ser usada, e quem vai usar ela é um bloco do fim da aula.
     As pedras que estão caindo aí continuam sendo as cinzas."

**Autoconferência no fim do clipe `video-folha-asteroide`:** "No Ao iniciar há uma folha nova de 64 por 64 para o asteroide, enquanto a folha de 32 por 32 da nave continua? As pedras ainda cinzas são esperadas por enquanto."

### Seção 3. Dois relógios ao mesmo tempo

- **Intenção:** conceito
- **Sem ferramenta:** `externalTool: null`
- **Por que existe:** é o conceito mais difícil do curso, e é ele que decide onde os dois blocos das
  próximas seções vão morar.
- **Conclui quando:** as três metas de `two-clocks` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` · a localização, com âncora completa, e a desambiguação: "Desça até a área **Enquanto
     estiver rodando** e ache o `A cada 40 quadros`, aquele que fica do lado do `A cada quadro do
     jogo`. O quadro desse nome conta o tempo do jogo, ele não é o desenho da sua animação: são duas
     coisas diferentes com o mesmo nome. Dentro dele tem um `Se` com a pergunta `o estado do jogo é
     jogando ?`, e dentro desse tem um bloco só, o que começa com `No grupo asteroides criar um
     asteroide`. É ele que faz uma pedra nova nascer lá em cima de tempos em tempos."
  2. `interactive` · cena `two-clocks`, "Dois relógios ao mesmo tempo", já construída e descrita
     abaixo. Elenco: personagem `nave`, obstáculo `asteroide`. Cenário do palco: `meu-jeito`. Metas
     declaradas: `more-rocks`, `faster-spin`, `each-one`.

**Não tem vídeo, de propósito.** O clipe de hoje é uma navegação (descer, achar, abrir) mais uma
frase de conceito. A navegação cabe no `dialogue` com âncora, e a frase de conceito é justamente o que
a cena substitui com vantagem.

**E não tem ferramenta, pela mesma razão.** Pela regra de produto de 20/09/2026, ferramenta de
criação e experiência não dividem a mesma seção, e a conferência tinha que ser feita também para o
`externalTool`, que mora na coluna da esquerda e escapa da regra de coluna. Aqui o caminho é tirar,
não dividir: quem faz a aula não cria bloco, não muda campo e não apaga nada nesta seção. O `A cada 40
quadros` já está montado desde o Desafio, e os dois balões só mandam olhar o que já existe. Sem gesto
de ferramenta não há "como se faz" a mostrar, então a segunda regra do dia também não cobra vídeo
nenhum. O Estúdio continua aberto na outra aba, da seção 2, e volta a ter atalho na seção 4, que é
onde ela monta o bloco novo.

### Seção 4. Troque a peça que cria as pedras

- **Intenção:** construção
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** é a troca central do dia, e ela tem uma ordem própria, oposta à da Aula 6, com
  uma razão que quem faz a aula já entende.
- **Conclui quando:** só existe um criador de asteroides, o `No grupo asteroides criar um sprite
  chamado asteroide em x (um x aleatório na tela) y -30 largura 40 altura 40 com imagem asteroide
  vx 0 vy 3`, dentro do `Se` do `A cada 40 quadros`, e o criador do kit saiu
- **Blocos:**
  1. `dialogue` · a ausência e a ordem: "Olhe os campos do bloco que cria as pedras hoje: grupo, x, y,
     tamanho, cor, vx e vy. Não tem campo de imagem. Nenhum. Ele veio do Kit espaço, o mesmo kit de
     onde veio a nave que você apagou, e ele desenha a pedra cinza dele sozinho. Ele nunca teve onde
     pôr um desenho. Então a gente troca ele por outro, igual você fez com a nave. Só que aqui a ordem
     é ao contrário: primeiro monta o novo, depois apaga o velho. O bloco velho da nave criava o nome
     `nave`, e por isso os dois não podiam ficar juntos. Este aqui não cria nome nenhum, então os dois
     convivem um pouquinho, e dentro dele tem uma peça que você vai aproveitar."
  2. `video` (`video-novo-criador`) · o caminho, os nove campos e o apagar, todos executados na
     tela. Começa em **Jogo 2D › Grupos › Criar e percorrer**, descendo até o `No grupo criar um
     sprite chamado em x y largura altura com imagem vx vy`, com o vizinho de **cor** apontado do
     lado e o critério certo de reconhecimento, que é o fim do rótulo, **com imagem**. Encaixa dentro
     do `Se`, logo abaixo do bloco velho, dizendo que os dois vão conviver ali por um tempinho, de
     propósito. Depois os nove campos, um a um, com o gesto do arrasto da pecinha no meio: grupo
     `asteroides`; nome `asteroide`; no x, **arrastar** (não copiar) a pecinha `um x aleatório na
     tela` de dentro do bloco velho para dentro do novo; y menos 30, para a pedra nascer um pouco
     acima da tela e entrar caindo; largura 40 e altura 40; imagem `asteroide`; vx 0 e vy 3.
     **Manter o aviso do efeito colateral, que é obrigação de honestidade:** o x do bloco velho ficou
     sem a pecinha, e soquete vazio vale zero, então as pedras cinzas passam a nascer todas no mesmo
     ponto, empilhadas num canto. Fica assim mesmo, porque o bloco velho já vai embora. Pausa falada
     aqui, para ela montar o dela. O clipe fecha com o botão direito no bloco velho, o texto do menu
     lido antes de clicar, o **Apagar este bloco** e a conferência junto do estado final. Duração
     alvo: 150 a 175 segundos.
  3. `dialogue` · a conferência que hoje é pergunta de múltipla escolha, transformada em instrução:
     "Olhe a área do jogo. Estão caindo pedras suas, espalhadas, e pedras cinzas, todas amontoadas no
     mesmo ponto. É assim mesmo por enquanto: são dois criadores montados ao mesmo tempo, cada um
     criando o dele. E se você reparou que as suas ainda não giram, é isso mesmo: girar é o último
     passo."
  4. `dialogue` · o apagar: "Agora clique no bloco velho com o botão direito e escolha **Apagar este
     bloco**, lendo o texto antes de clicar, do mesmo jeito que você fez na aula passada. Olhe a área
     do jogo de novo: só as suas."

**Autoconferência no fim do clipe `video-novo-criador`:** "Ao jogar, caem só as suas pedras em posições diferentes pela largura da tela? Se ainda cair a pedra cinza, confira o criador antigo."

### Seção 5. Faça cada pedra nova já girar

- **Intenção:** construção
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** é a vitória do dia e o marco do curso. E é a aplicação direta da terceira
  descoberta da cena da seção 3.
- **Conclui quando:** `Animar sprite asteroide com a folha folha-asteroide na animação girando, do
  quadro 0 ao 1 a 8 fps` está logo abaixo do criador novo, dentro do mesmo `Se` e do mesmo relógio, e
  uma partida inteira roda com tiro, placar, vidas e reinício
- **Blocos:**
  1. `dialogue` · a razão que a cena já provou, e que vem antes do clipe: "O bloco de animar fica
     logo embaixo do que cria a pedra, porque cada vez que uma pedra nova nasce ele manda ela girar.
     É para isso que serve o nome que você escreveu no segundo campo do bloco de cima: o bloco de
     animar precisa de um nome para saber em quem mandar."
  2. `video` (`video-animar-cada`) · o caminho e o encaixe executados na tela. Voltar em **Jogo 2D ›
     Sprites › Animação**, pegar de novo o `Animar sprite com a folha na animação` e arrastar para
     dentro do mesmo `Se`, logo abaixo do bloco que cria o asteroide. Depois os três seletores,
     `asteroide`, a `folha-asteroide` escolhida entre as duas folhas que hoje aparecem na listinha e
     a `girando`, e os três números se preenchendo sozinhos, do quadro 0 ao 1 a 8 fps, que são os
     dois desenhos da pedra rolando e pegando fogo. E o teste: "Clique na área do jogo, aperte Enter
     e jogue um pouco." Fecha com a conferência junto, com o socorro de quando só a primeira pedra
     gira, e com o pedido de pausa. **Manter o pico da fala**, que é o melhor momento do curso: essa
     é a sua nave, com o seu motor, e essas são as suas pedras, girando. Duração alvo: 85 a 100
     segundos.
  3. `dialogue` · o teste completo: "Jogue uma partida inteira. Confira três coisas: que pelo menos
     três pedras seguidas nascem girando, que o tiro acerta e o placar sobe, e que quando as vidas
     acabam a partida termina e dá para começar de novo. O jogo é o mesmo do Desafio, com os mesmos
     blocos, e agora ele é seu de verdade."

**Autoconferência no fim do clipe `video-animar-cada`:** "Ao jogar, pelo menos três pedras seguidas já nascem girando, enquanto nave, tiros e placar continuam?"

### Seção 6. Envie, e o que mudou sem você pedir

- **Intenção:** entrega e fechamento
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** guarda o marco do curso e conta um ganho invisível que quem faz a aula merece saber
  que existe, com a ressalva honesta.
- **Conclui quando:** a entrega é enviada e as duas perguntas do quiz são respondidas
- **Blocos:**
  1. `dialogue` (`fala-enviar-o-projeto`) · o lembrete curto do envio: "Jogue uma partida inteira,
     perca ou vença, reinicie e confira a partida nova. Só então envie. Espere aparecer **Guardado na
     sua conta**, escolha a criação na lista e envie ao professor. O envio guarda uma cópia deste
     momento, e você continua criando no Estúdio."
  2. `studio` · entrega pela galeria do Estúdio, uma criação, com os critérios de revisão do professor
     já definidos no roteiro atual.
  3. `dialogue` · caminho de ajuda, em duas linhas, sem virar tarefa: "Se você quiser melhorar um
     desenho depois, o caminho é o mesmo de sempre: **Mais opções**, **Materiais**, **Imagens**, e no
     cartão do desenho o **✏️ Editar**, que abre o Pinta naquele desenho. Quando você mexer lá e
     voltar, o jogo acompanha."
  4. `video` (`video-fecho-v6`) · agora em três partes. Abre com a conferência junto do projeto (a
     `folha-asteroide` de 64 no **Ao iniciar** com nome diferente do sprite, o criador único com os
     nove valores dentro do relógio e da condição, o animar logo depois dele no mesmo ramo, o jogo do
     Desafio inteiro ainda funcionando e a colisão real conferida com a arte enviada), segue com o
     envio executado na tela e só então vem o fecho com o ganho invisível e a ressalva. A fala é
     esta, e ela vive no clipe, não numa fala do Zappy, porque passa de 400 caracteres: "Tem uma
     coisa que melhorou hoje sem você
     pedir. Antes, a pedra cinza e a nave cinza eram atingidas dentro de um retângulo inteiro, com
     espaço vazio e tudo. Agora que o desenho é seu, o jogo mede pelo que está pintado, então o vazio
     em volta da sua nave não conta mais como batida. Isso não é perfeito e não segue cada pontinha do
     desenho, mas ficou bem mais justo do que era. E o que você fez hoje é o que fecha o curso: o jogo
     é inteiro seu. Na próxima aula ele vai para o Mural." Duração alvo: 60 a 75 segundos.
  5. `quiz` · duas perguntas. A primeira **migra da seção 2 de hoje**, porque revisa a Aula 6 e o quiz
     é o lugar declarado da revisão:
     - *O seu asteroide aparece com 40 por 40 no jogo. Que tamanho você escreve nos dois campos da
       folha?* · **64 por 64, o tamanho de cada quadro na folha** (correta) · 40 por 40, copiando o
       tamanho que ele tem no jogo. Devolutiva: o recorte da folha e o tamanho de exibição são duas
       escolhas com funções diferentes.
     - A segunda é a atual, mantida: *Mudar a arte exige remontar o placar?* Ela é a tese da aula e a
       ponte para a Aula 8.
     - **A pergunta do y menos 30 sai.** Ela cobra um número que a aula mandou digitar, e a alternativa
       errada ("escolher o quadro menos 30 da animação") não é um engano que alguém cometa.

## Experiências e demonstrações desta aula

### 1. `two-clocks` · Dois relógios ao mesmo tempo · **CONSTRUÍDA**

- **Id no catálogo:** `two-clocks` · **grupo:** `population`
- **Título visível:** Dois relógios ao mesmo tempo
- **O conceito abstrato:** o relógio que faz nascer uma pedra e o relógio que troca os desenhos de
  cada pedra são dois relógios diferentes, e cada pedra começa o seu próprio giro no instante em que
  nasce.
- **Tipo:** experimentação. A relação tem dois botões e o conteúdo é a independência entre eles:
  quando eu aumento o ritmo de nascer, vem mais pedra e o giro de cada uma continua igual; quando eu
  aumento a velocidade do giro, elas giram mais rápido e continua nascendo na mesma hora. Uma
  independência só se sente mexendo em um e vendo o outro parado, e nenhuma demonstração faz isso.
- **O que quem faz a aula manipula:**
  - **A cada quantos quadros nasce uma pedra:** 20, 40 ou 80.
  - **Quantos desenhos por segundo cada pedra troca:** 2, 8 ou 16.
  - **▶ Tempo**, que deixa o tempo correr, e **Voltar ao começo**.
- **Como o palco começa:** a tela vazia, o relógio de nascer em 40, a animação em 8, o tempo parado.
  Duas coisas contadas à vista: uma faixa embaixo com **pedras que nasceram**, e, em cima de cada
  pedra na tela, o número do quadro que ela está mostrando agora, 0 ou 1.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `more-rocks` | "Mudando só o relógio de nascer, veio mais pedra, e cada uma continuou girando no mesmo ritmo" | "Deixe a animação em 8, ponha o relógio em 20 e deixe o tempo passar." |
  | `faster-spin` | "Mudando só a animação, as pedras giraram mais rápido, e continuou nascendo na mesma hora" | "Deixe o relógio em 40, ponha a animação em 16 e deixe o tempo passar." |
  | `each-one` | "Cada pedra começou no quadro 0, na hora em que ela nasceu" | "Deixe o tempo passar até nascerem três pedras e olhe o número em cima de cada uma na hora em que ela entra." |
- **Pistas:**
  1. "São dois números que andam sozinhos: quantas pedras já nasceram e qual desenho cada pedra está
     mostrando agora."
  2. "Mexa num controle de cada vez. Primeiro no de nascer, depois no do giro."
  3. "Deixe nascer três pedras e olhe o número em cima de cada uma no instante em que ela aparece."
- **Palpite antes de abrir:** "Se as pedras nascerem mais juntas, o giro de cada uma fica mais
  rápido?"
  - Não, o giro continua igual ✓
  - Fica, porque é o mesmo relógio
- **Pergunta depois de descobrir (conta para concluir):** "Onde encaixar o bloco que manda a pedra
  girar?"
  - Logo depois do bloco que cria a pedra, dentro do mesmo relógio ✓
  - Uma vez só, no Ao iniciar
- **Explicação ao acertar:** "A pedra só existe depois de nascer. O bloco de animar precisa estar logo
  depois do de criar, dentro do mesmo relógio, para alcançar cada pedra nova. No Ao iniciar ele
  rodaria uma vez, quando ainda não existe pedra nenhuma."
- **Frase de sucesso:** "São dois relógios: um faz nascer, o outro troca os desenhos. E cada pedra
  começa o giro dela quando nasce."
- **Onde mais serve:** Corre Dino, onde os cactos nascem em série e podem animar. Desafio do Primeiro
  Jogo, no dia dos asteroides, onde a palavra quadro aparece pela primeira vez com dois sentidos. E
  qualquer curso com inimigo animado que nasce ao longo da partida. Ela também é a única cena do
  catálogo que desambigua a palavra quadro, que é um problema de vocabulário de todos os cursos de
  jogo.
- **Por que nenhuma cena existente serve:**
  - `spawn`, que a aula usa hoje, manipula o intervalo do relógio de nascimento e ensina que sem
    relógio vira parede. Nesta aula ninguém toca no relógio, e a cena não tem animação nenhuma
    nos sprites, então ela não pode mostrar dois relógios.
  - `frames` manipula a velocidade da animação, e não tem nascimento.
  - `pool` e `cleanup` são sobre o que acontece com quem sai da tela.
  - `enemy-type` chega perto no formato (vários nascem de uma ficha só), mas o conteúdo dela é ficha
    compartilhada contra cópia ao nascer, que este curso não ensina.
- **Ações no motor, conferidas no código:** o relógio de nascimento saiu como `birth-every`, com
  `frames` em 20, 40 ou 80, que são exatamente os três valores desta especificação. A cena reaproveita
  `advance` e `connect`, de `spawn`, e o `rate` do controle de fps, de `frames`. O rótulo de quadro em
  cima de cada sprite vivo, que é a peça que faz a `each-one` ser observável, é a única coisa
  realmente nova do palco.
- **O que o catálogo traz, comparado com esta especificação:** título, instrução, o que quem faz a aula
  manipula, frase de sucesso, pergunta extra, as três metas com rótulo e pedido e as três pistas
  entraram palavra por palavra. Nenhuma divergência.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | A sua nave já está lá, agora entram as suas pedras | o jogo com as duas artes dela, nave e pedras girando | `video-abertura-v6` | 25 a 35 s | fala sim, tela a regravar |
| `video-folha-asteroide` | A segunda folha, e o número que muda | a gaveta, o encaixe do segundo `Carregar folha de quadros`, os quatro campos, os dois 64 e a conferência junto | `video-folha-asteroide` | 95 a 110 s | fala sim, com o caminho de paleta regravado |
| `video-novo-criador` | Nove campos, e uma pecinha que muda de lugar | a gaveta e o vizinho de cor, os nove campos, o arrasto da pecinha do sorteio, o aviso do buraco que ela deixa, o apagar do bloco velho e a conferência junto | `video-novo-criador` | 150 a 175 s | fala sim, com o caminho de paleta corrigido e o critério do "com imagem" no lugar de "o mais comprido" |
| `video-animar-cada` | A pedra rolando e pegando fogo | a gaveta e o encaixe, os três seletores, os números se preenchendo, a partida rodando e a conferência junto | `video-animar-cada` | 85 a 100 s | fala sim, mantendo o pico |
| `video-fecho-v6` | O jogo inteiro com a sua cara | a conferência junto do projeto, o envio executado na tela e o fecho da aula, com o ganho da colisão e a ressalva | `video-fecho-v6` | 60 a 75 s | fala nova, com o trecho de entrega novo na frente |

**Saldo:** de 6 clipes para 5. O `video-tempo-demo` sai inteiro: a navegação dele vira âncora falada
e a frase de conceito dele vira a cena. Em minutagem os clipes crescem, porque com o fim do texto
corrido o passo a passo e a conferência de cada seção passaram a ser executados na tela, e o
`video-fecho-v6` ganhou na frente a conferência do projeto e o envio. O `video-novo-criador` continua
sendo o clipe mais longo do curso, e deve continuar: são nove campos, um arrasto, um efeito colateral
que precisa ser avisado e o apagar do bloco velho.

**Onde cada clipe mora:** `video-abertura` na seção 1, `video-folha-asteroide` na 2,
`video-novo-criador` na 4, `video-animar-cada` na 5 e `video-fecho-v6` na 6. A seção 3 é a única de
conceito e não tem clipe, porque também não tem ferramenta. As quatro seções com `externalTool` têm
vídeo, como a regra de produto de 20/09/2026 exige.

## Continuidade

- **O que esta aula assume da Aula 6:** no **Ao iniciar**, `Preparar o jogo em tela cheia`, `Criar
  sprite nave ... com imagem nave`, `Carregar folha de quadros folha-nave ... 32 x 32`, `Animar sprite
  nave ... voando, 0 ao 1, 8 fps`, e o resto do jogo do Desafio intocado. A arte `asteroide` já está
  no projeto. E a regra de nomes, concretizada pela cena `unique-names`, que aqui é usada ao contrário.
- **O que entrega para a Aula 8:** o jogo completo com as duas artes dela. No **Ao iniciar**, mais um
  bloco: `Carregar folha de quadros folha-asteroide da imagem asteroide com quadros de 64 x 64 px`,
  entre o `Animar sprite` da nave e o `Criar grupo de sprites tiros`. No **Enquanto estiver rodando**,
  dentro do `A cada 40 quadros` e do `Se` com `o estado do jogo é jogando ?`: `No grupo asteroides criar um sprite chamado
  asteroide em x (um x aleatório na tela) y -30 largura 40 altura 40 com imagem asteroide vx 0 vy 3` e,
  logo abaixo, `Animar sprite asteroide com a folha folha-asteroide na animação girando, do quadro 0 ao
  1 a 8 fps`. Nenhum bloco do Kit espaço sobrou.
- **Valores canônicos que saem daqui:** nome da folha `folha-asteroide` · quadro de 64 × 64 · nome do
  sprite `asteroide` · y menos 30 · largura 40 · altura 40 · vx 0 · vy 3 · animação `girando` · do
  quadro 0 ao 1 · 8 fps · relógio de 40 quadros, que continua como veio do Desafio.
- **Campos livres:** nenhum. A Aula 8 publica exatamente este jogo.
- **Pontos a conferir antes de gravar:**
  1. ✅ **Resolvido em 20/09/2026, medido no código.** O caminho do bloco central é **Jogo 2D ›
     Grupos › Criar e percorrer**. A subcategoria **Muitos**, que a narração antiga manda abrir,
     **não existe mais**. O trecho precisa ser regravado, não relegendado.
  2. ✅ **Resolvido em 20/09/2026, medido no código.** O bloco de pergunta dentro do `Se` é
     `o estado do jogo é __ ?` (`sz_g2d_scene_is`, em **Jogo 2D › Jogo e telas › Telas e partida**).
     "Se a tela atual é jogando" é o rótulo antigo, e ele sai de toda fala desta aula.
  3. O efeito colateral do soquete vazio. Ele é a diferença entre uma aula honesta e alguém
     achando que quebrou o jogo, e precisa aparecer na gravação, não só na fala.

## Manifesto

Arquivo: `aulas/meu-jeito-aula-07.manifesto.json`. Versão 4, 6 seções, 19 blocos, 5 clipes.

### Seções e critério de conclusão

| # | Chave | Título | Intenção | Ferramenta | Blocos | Conclui com |
|---|---|---|---|---|---|---|
| 1 | `abertura` | O que a gente vai fazer hoje | `presentation` | nenhuma | 1 | `video-abertura` |
| 2 | `folha-asteroide` | Prepare a folha das pedras | `application` | Estúdio | 2 | `video-folha-asteroide` |
| 3 | `dois-relogios` | Dois relógios ao mesmo tempo | `exploration` | nenhuma | 3 | `experimento-dois-relogios` |
| 4 | `novo-criador` | Troque a peça que cria as pedras | `application` | Estúdio | 5 | `video-novo-criador` |
| 5 | `animar-cada` | Faça cada pedra nova já girar | `application` | Estúdio | 3 | `video-animar-cada` |
| 6 | `entrega-e-fecho` | Envie, e o que mudou sem você pedir | `delivery` | Estúdio | 5 | `entrega-galeria-v6` e `quiz-v6` |

Nenhuma seção fica sem critério. As seções 2, 4 e 5 concluem pelo clipe de construção, como nas
Aulas 5 e 6, porque a aula trabalha no Estúdio por `externalTool` e o v6 desta aula não traz
`projectChecks` nenhum para copiar. Os itens de conferência do projeto são conferidos junto, dentro
do clipe de cada seção.

### Regra das duas colunas e as duas regras de produto de 20/09/2026

**Correção ao que este relatório dizia.** A versão anterior concluía que nenhuma seção precisava ser
dividida, com o argumento de que `externalTool: "estudio"` não disputa a coluna da direita. Isso é
verdade para a coluna e é justamente a brecha que a regra de produto de 20/09/2026 fechou: ferramenta
de criação e experiência não dividem a mesma seção, **embarcadas ou externas**. A conferência passou
a olhar `workspaceKey` **e** `externalTool`, e a seção 3 caiu nela.

**A seção 3 perdeu o `externalTool`, e não foi dividida.** Aqui não há trabalho na ferramenta: a
quem faz a aula não cria bloco, não muda campo e não apaga nada. O `A cada 40 quadros` já vem montado do
Desafio, o `fala-relogio-das-pedras` só manda descer e achar, e o `fala-dois-sentidos-de-quadro` é
conceito. Como não há gesto a mostrar, a segunda regra também não cobra vídeo, e a seção segue
concluindo pela cena. Dividir criaria uma seção de ferramenta sem nada para fazer nela.

A aula continua com uma cena só, na seção 3, e nenhum Estúdio embarcado. As quatro seções que
trabalham no Estúdio, a 2, a 4, a 5 e a 6, ficaram com o `externalTool` e todas têm vídeo:
`video-folha-asteroide`, `video-novo-criador`, `video-animar-cada` e `video-fecho-v6`. Nas seções 4 e
5 a conferência que a proposta chamava de `studio` virou o trecho do clipe em que o professor confere
junto, do mesmo jeito das Aulas 5 e 6.

### Destino das três perguntas de múltipla escolha de hoje

| Pergunta do v6 | Destino | Onde |
|---|---|---|
| "O asteroide vai aparecer com 40 × 40 no jogo. Qual tamanho colocar na folha?" | migra para o quiz final | `quiz-v6`, primeira pergunta |
| "Estão caindo pedras suas e pedras cinzas. O que conferir primeiro?" | vira instrução | `fala-duas-familias`, na seção 4 |
| "Por que Animar sprite fica logo depois do criador dentro do relógio?" | vira a pergunta de fim da cena | `experimento-dois-relogios`, campo `checkpoint` |

A pergunta do `y menos 30` sai do quiz, como a proposta decidiu, e não reaparece em lugar nenhum.

### Falas longas partidas em duas

O balão do Zappy tem limite de 400 caracteres. Duas falas da proposta viraram duas cada uma:

- a da seção 3 virou `fala-relogio-das-pedras` (onde achar o relógio) e
  `fala-dois-sentidos-de-quadro` (os dois sentidos da palavra quadro);
- a de abertura da seção 4 virou `fala-sem-campo-de-imagem` (a ausência) e
  `fala-monta-antes-de-apagar` (a ordem ao contrário).

As instruções de caminho e de campo, que são longas por natureza, não viram balão nem texto: elas
são executadas na tela, dentro do clipe da própria seção, como nas Aulas 5 e 6. Nasceu um balão novo
nesta rodada, o `fala-enviar-o-projeto`, com o lembrete curto do envio na seção 6.

### Cenas

- `two-clocks` entra com as três metas de fábrica, `more-rocks`, `faster-spin` e `each-one`, com
  palpite (`revealOn: more-rocks`) e pergunta de fim. Ela **está no catálogo**, e o manifesto passa
  no validador com zero avisos.
- O bloco deixou de escrever pistas próprias e passou a herdar a escada da cena, que é a mesma lista,
  e com a vantagem de pular o degrau cuja meta já caiu.
- `spawn` sai da aula, como a proposta decidiu, e entra em `retireBlockKeys` junto com o
  `video-tempo-demo`.
- `unique-names` **não vira bloco aqui**. Ela é remissão falada, em `fala-monta-antes-de-apagar`,
  exatamente como a ficha da cena registra para esta aula.
- Esta aula **não toca** em `sheet-vs-sprite`. Correção ao que estava escrito aqui: a `size-apart`
  daquela cena **existe** no catálogo. A Aula 6 declara `squeezed`, `crop-half` e `crop-whole`, e
  deixa a quarta de fora por escolha.

### Blocos aposentados

`retireBlockKeys`: `video-abertura-v6`, `conferir-folha-asteroide`, `video-tempo-demo`,
`demonstracao-nascimento`, `conferir-novo-criador`, `conferir-animar-cada`. Nenhuma dessas chaves
aparece em `blocks`.
