# Corre, Dino! · Aula 8 · O jogo abre com o nome que você deu

> Análise de redesenho didático. Formato herdado de `desafio-dia-1.md`.

## Resumo

- **Estado de entrada:** o jogo sabe onde está e não faz nada fora de hora. Ao recarregar a página,
  a área do jogo mostra só a floresta passando. O estado `inicio` existe, e não tem rosto: nenhuma
  letra, nenhum convite, nenhum jeito de sair dele.
- **Vitória do dia:** o jogo abre numa tela com o nome que ela deu, e começa quando o jogador
  manda, de qualquer jeito que ele tentar: tecla, clique ou dedo na tela.
- **Seções hoje:** 9 · **Seções propostas:** 6 no manifesto, a partir dos 5 movimentos desta
  proposta. O movimento do convite abre em duas seções, porque a regra das duas colunas admite uma
  única coisa na direita por seção: a cena vira *O convite para começar* e o conserto no projeto
  vira *Faça o jogo aceitar tecla e toque*.
- **Clipes hoje:** 6 · **Clipes propostos:** 5. A contagem não muda com o redesenho da entrega:
  nenhum clipe entrou nem saiu, o `video-teste-e-envio` é que cresceu.
- **Fecho da entrega:** o passo a passo do teste e a recapitulação saíram do balão e foram para o
  roteiro do `video-teste-e-envio`, e só o gancho da Aula 9 continuou balão. Balão depois da
  ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da direita e
  todo o resto na esquerda.
- **Cenas:** 1 (`controls`), construída no catálogo, com o ajuste de palpite e de rótulo aplicado

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| `senão se`: a pergunta de baixo só é feita quando a de cima deu não | Sim, é fluxo de controle | **Não** | | Explicado no vídeo, com o bloco crescendo na tela | Neste jogo os estados são exclusivos, então dois Se soltos se comportam igual. Uma cena precisaria fabricar uma diferença que o jogo dela não tem, e isso ensinaria algo falso |
| O jogo fica num estado de cada vez, e o bloco passa a mostrar isso | Sim | Não precisa de nada novo | | Na hora do clique no `+ senão se` | É a frase da Aula 7 virando desenho. O andar nascendo embaixo do outro é a concretização, e ela acontece na tela dela em um clique |
| Texto é peça, não campo | Sim, e tem consequência real | **Sim**, pelo próprio Estúdio | Contraste dentro do mesmo bloco: os três textos têm borda própria, a cor do fundo não tem | Na hora do zoom, antes de digitar | O mesmo bloco carrega os dois casos lado a lado. Cena aqui seria construir um palco para mostrar o que já está a dois centímetros de distância |
| Uma tela desenhada é diferente de um estado guardado | Sim | Não | | Dito quando o menu aparece | O estado existe desde a Aula 7 e não desenhava nada. Hoje aparece letra. A diferença se vê sozinha, e a frase só nomeia |
| Se novo com conteúdo novo: só as três primeiras etapas | Não. É operação, mas exige separação explícita | Não | | Seção 3, com o bloco na mão | A Aula 7 ensinou quatro etapas. Aqui não tem o que embrulhar, e a fala gravada já acerta isso. Fica como está |
| Evento estreito contra evento amplo | Sim. "Não é o bloco errado, é o bloco estreito demais" | **Sim** | Experimentação (`controls`) | Depois da dor no jogo dela, antes do conserto | É a ideia do dia, e é a que separa este conserto do conserto da Aula 4. Sem isolar a variável, ela só troca um bloco por outro porque mandaram |
| O clique morto no menu | Não. Ela clica e vê | Não | | Fim da seção 3 | Dor de verdade, no jogo dela, em dois segundos. É a única dor do dia e ela fecha sozinha |
| O texto na tela é uma promessa para quem joga | Sim, e é conteúdo, não etiqueta | Não precisa de cena | | Seção 4, na hora de reescrever a dica | A cena já entrega essa frase na explicação de acerto. Repetir em palco próprio seria moralizar |
| Apagar um bloco que ficou vazio | Não. Operação já ensinada na Aula 2 | Não | | Dentro do vídeo | Botão direito, Apagar este bloco. O bloco está vazio, então o texto do menu é o mesmo de sempre |
| O título, o subtítulo e a cor do fundo são escolha dela | Não | Não | | Na hora de cada campo | Campo de gosto, dito no campo. Não vira tarefa e não vira seção |

Dez coisas, uma cena só. Três delas se tornam concretas dentro do próprio Estúdio, sem palco
separado, e é essa triagem que tira a aula de 9 para 5 seções.

**Cena considerada e recusada:** uma cena nova para o `senão se`. A tentação é grande, porque
encadeamento de condições é conceito de peso. Só que a única diferença observável entre dois `Se`
soltos e um `Se` de dois andares aparece quando as duas condições podem dar sim ao mesmo tempo, e
isso não acontece com estados de jogo. Uma cena que fabricasse esse caso contradiria, no mesmo dia,
a frase que a Aula 7 assentou.

## Diagnóstico do desenho atual

**Quatro seções de conteúdo se apoiam em dois trechos de fala, cada um narrado duas vezes.** A seção
2 (*Veja como escolher uma tela por vez*) e a seção 3 (*Monte sua tela de início*) carregam o mesmo
"Trecho original selecionado" na íntegra. A seção 4 (*Faça o Enter começar a partida*) e a seção 6
(*Atenda aos dois jeitos de começar*) também. A aula parece ter o dobro do conteúdo que tem.

**A dor e o conserto estão separados pela cena que repete a dor.** A seção 4 termina com a criança
clicando no menu e nada acontecendo. A seção 5 (*O menu funciona com toque?*) abre com a cena
`controls`, cuja primeira meta é justamente "Tocou e nada aconteceu". E o conserto só vem na seção
6. A criança recebe a mesma informação três vezes, e a terceira é a que resolve.

**O palpite da cena chega gasto.** "Você toca na tela de início. O que acontece?" já foi respondido
pelo jogo dela, com o dedo dela, na seção anterior. Um palpite que a criança acabou de viver não é
palpite, é confirmação, e queima o melhor momento da cena.

**A narração promete a Aula 11.** "Lembra dessa pecinha texto, porque ela é a razão de uma coisa
muito legal que a gente vai fazer na Aula 11." O curso tem regra própria de remissão só para trás, e
por bom motivo: se a Aula 11 mudar, a promessa fica órfã. O conceito da pecinha fica, a promessa sai.

**Uma afirmação absoluta sobre celular sobreviveu ao próprio corte.** O trecho diz "no celular não
existe tecla Enter. Não existe teclado nenhum". A nota de montagem da mesma seção manda retirar
exatamente isso, e o material entregue manteve a fala. O que vale dizer é o que é verdade e é
suficiente: jogar por toque precisa funcionar.

**Os rótulos seguem os da edição antiga.** `Ir para a tela`, `a tela atual é` e "Telas e cenas" não
existem mais. Na edição `jogo-2d-1.0-documento-2` são `Mudar o estado do jogo para`,
`o estado do jogo é __ ?` e **Jogo 2D › Jogo e telas › Telas e partida**. O `Mostrar tela` é o único
bloco novo do dia cujo rótulo a narração acerta.

**O que a aula já faz certo e precisa ser preservado.** A seção 4 separa, com todas as letras, o
`Se` novo da manobra da Aula 7: "Sem nada pra embrulhar de novo, então são as três primeiras
etapas." Essa frase é curta, exata e faz um trabalho grande, porque a Aula 7 ensinou quatro etapas
como se fossem indivisíveis. Ela fica como está.

**Três seções são molde.** *Teste e entregue sua construção*, *Veja o que você aprendeu* e *Confira
as ideias de hoje* são um fechamento só.

## Proposta final

### Seção 1. Hoje o jogo abre com o nome que você deu

- **Intenção:** apresentação
- **Por que existe:** a Aula 7 terminou numa tela quase vazia, de propósito. A criança precisa ver
  o rosto que essa tela vai ganhar antes de montar a primeira peça.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`): o menu do fim do dia na tela, com o nome do jogo grande, e alguém
     tocando na tela para começar. Fala curta: "Na aula passada o seu jogo aprendeu a esperar, e
     ficou esperando numa tela sem nada escrito. Hoje ele ganha a cara dele: o nome do jogo, uma
     frase pra explicar o que fazer, e um jeito de começar que funciona no computador e no celular."
     Duração alvo: 25 a 35 segundos.

### Seção 2. O estado inicio ganha uma tela

- **Intenção:** construção
- **Por que existe:** abrir o andar novo, escrever os três textos e ver o menu aparecer é um
  movimento só, e ele termina na primeira vitória visível do dia.
- **Conclui quando:** o `Se` do `A cada quadro do jogo` tem um `senão se` com `o estado do jogo é
  inicio`, e dentro dele um `Mostrar tela` com título, subtítulo e a dica combinada
- **Blocos:**
  1. `dialogue`: "Olha o Se que você montou na aula passada, aquele que pergunta se o estado do jogo
     é jogando. Chega perto da beiradinha de baixo, do lado esquerdo. Tem dois botõezinhos com um
     mais: mais senão se e mais senão. Eles estavam ali desde ontem. Clica no mais senão se."
  2. `video` (`video-menu`): o clique, o andar nascendo com o buraquinho de pergunta vazio, e a
     explicação curta do `senão se` em cima do bloco já crescido: "senão se quer dizer o que está
     escrito. Se a pergunta de cima deu não, aí sim ele faz a de baixo. E se a de cima deu sim, ele
     nem olha a de baixo, porque já resolveu. É a mesma coisa que você aprendeu na Aula 7: o jogo
     fica num estado de cada vez. Agora o bloco também diz isso." Depois, encaixar o
     `o estado do jogo é __ ?` no espaço vazio e escolher `inicio`, sem precisar tirar comparação
     nenhuma, porque o andar já nasce vazio. Dentro dele, o `Mostrar tela com título subtítulo dica
     fundo`, em Jogo 2D, Jogo e telas, Telas e partida. Aí o zoom nos três textos, com a bordinha de
     cada um, e o contraste com o quadradinho da cor: "os três primeiros não estão escritos no
     Mostrar tela. Cada um tem uma bordinha em volta, porque cada texto é uma pecinha separada,
     encaixada num espacinho. Essa pecinha se chama texto, e ela mora em Programação, Valores. O
     quarto campo, o da cor do fundo, esse não é pecinha: é campo do próprio bloco, e ele já nasce
     escuro, que fica bom por cima da floresta." Os três textos preenchidos ao vivo: o nome do jogo
     no título, uma frase sobre pular cactos no subtítulo, e "Aperte Enter para começar" na dica.
     Duração alvo: 80 a 95 segundos.
  3. `studio`: conferência do ramo `inicio` com o `Mostrar tela` e a dica combinada.
  4. `dialogue`: a leitura da vitória e a ponte. "Olha a área do jogo. Apareceu a tela de início do
     seu jogo, com o nome que você deu, por cima da floresta. Na aula passada o estado inicio já
     existia e não desenhava nada. Agora ele tem um rosto. Só que, se você apertar Enter agora, não
     acontece nada, porque ninguém ensinou o Enter a fazer nada ainda."

**Junta o que hoje são duas seções.** A explicação do `senão se` e da pecinha vive dentro do gesto
que a usa, e não num clipe que antecede outro clipe com a mesma fala.

**A dica sai provisória de propósito.** "Aperte Enter para começar" é exata para o teste da seção 4,
e é ela que vai ser corrigida na seção 5. O desenho desse estado no caderno leva a marca de "por
enquanto".

### Seção 3. Faça o Enter começar a partida

- **Intenção:** construção e dor
- **Por que existe:** o Enter funciona, e o clique não. A dor é o clique morto, e ela precisa fechar
  sozinha antes de a ferramenta aparecer.
- **Conclui quando:** dentro do `⚡ Quando acontecer` existe um `Quando apertar a tecla` com `Enter`,
  e dentro dele um `Se o estado do jogo é inicio` com `Mudar o estado do jogo para jogando`
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Controles, Teclado, ações e toque, pega o bloco Quando apertar a
     tecla. Arrasta pra dentro da área Quando acontecer e solta ao lado do evento do pulo, que já
     está lá. Ele tem um campo só, a listinha das teclas: escolhe Enter."
  2. `video` (`video-enter`): o gesto, e dentro dele o `Se` novo. A fala precisa manter a separação
     que a gravação já acerta: "Agora um Se, lá de Programação, Lógica e Se. Só que hoje não tem o
     que embrulhar, porque o Se vai nascer vazio e você vai encher ele com bloco novo. Então são as
     três primeiras etapas daquelas quatro da Aula 7, sem a quarta: tira a comparação de fábrica,
     põe no lugar a pergunta o estado do jogo é, e escolhe inicio." Dentro do Se, o
     `Mudar o estado do jogo para` com `jogando`. Depois a leitura em voz alta e o teste que
     funciona: recarrega, clica na área do jogo, aperta Enter, começou. E aí o teste que não
     funciona: recarrega de novo e clica bem no meio da tela, em cima do nome do jogo. Nada. Clica
     mais três vezes. Nada. "E olha que clicar na tela é a primeira coisa que qualquer pessoa faz.
     Antes de procurar tecla, a gente clica. E tem o celular: lá quem joga usa o dedo, e o seu jogo
     precisa funcionar assim também." Duração alvo: 55 a 70 segundos.
  3. `studio`: conferência do evento do Enter com o `Se inicio` dentro.

**A dor fecha aqui, sem conserto.** O clique morto é o único problema real do dia e ele reproduz
sempre. A seção termina nele.

### Seção 4. O convite para começar

- **Intenção:** conceito
- **Por que existe:** a criança precisa entender que o bloco não estava errado, estava estreito. É a
  ideia do dia, e é ela que separa este conserto do conserto da Aula 4.
- **Conclui quando:** as três metas de `controls` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: a ponte curta que abre a cena, retomando o clique morto da seção anterior.
  2. `interactive`: cena `controls`, "O convite para começar". Elenco: personagem Dino. Cenário:
     `corre-dino`. As três metas: tocar com o Começar na tecla e nada acontecer, levar o Começar para
     o bloco amplo e começar tocando, e começar com Enter no mesmo arranjo.

**A cena vem antes do conserto.** Não existe surpresa a preservar, porque a dor já aconteceu no jogo
dela na seção anterior. O que a cena acrescenta é isolar a variável: uma ficha muda de caixa, e o
convite e o comportamento passam a dizer a mesma coisa.

### Seção 5. Faça o jogo aceitar tecla e toque

- **Intenção:** construção
- **Por que existe:** depois de ver a troca na cena, ela faz a mesma troca no jogo dela e acerta o
  texto que promete.
- **Conclui quando:** o `Quando apertar qualquer tecla ou tocar na tela` é o único evento de
  entrada, e a dica do menu descreve os dois jeitos
- **Blocos:**
  1. `dialogue`: a diferença com a Aula 4, dita depois da cena e em cima dela. "Isso aqui não é o
     mesmo problema da Aula 4. Lá a gente estava escutando o seu dedo quando devia escutar o dino: o
     bloco era o errado pro trabalho. Hoje escutar o jogador é o certo mesmo, porque quem começa o
     jogo é ele. O problema é que a gente escolheu uma tecla só. Não é o bloco errado, é o bloco
     estreito demais."
  2. `video` (`video-entrada-ampla`): o conserto inteiro em um movimento. Na mesma subcategoria
     Teclado, ações e toque, pegar o `Quando apertar qualquer tecla ou tocar na tela`, que não tem
     campo nenhum, e soltar dentro do `⚡ Quando acontecer`. Arrastar o `Se o estado do jogo é
     inicio`, com o `Mudar o estado do jogo para` junto, de dentro do evento do Enter para dentro do
     novo. Apagar o evento do Enter, que ficou vazio, com o botão direito e Apagar este bloco.
     Testar de tudo, recarregando entre um teste e outro: clique no meio da tela, Enter, barra de
     espaço, uma letra qualquer. Por último, voltar no `Mostrar tela` e trocar o texto da pecinha da
     dica por "Aperte qualquer tecla ou toque na tela para começar". Duração alvo: 60 a 75 segundos.
  3. `dialogue`: a promessa escrita, nomeada. "O que está escrito na tela é uma promessa que você faz
     pra quem joga. Se a tela diz Enter e o jogo aceita qualquer coisa, a promessa está menor do que
     o jogo. E se fosse ao contrário seria pior: quem está no celular procuraria um Enter que não
     existe e desistiria. Toda vez que você mudar o que o seu jogo faz, olha se tem algum texto na
     tela falando dele."
  4. `studio`: conferência do evento único e da dica corrigida.

**Por que são duas seções e não uma.** A regra das duas colunas admite uma única coisa na coluna da
direita por seção, e a cena e o Estúdio brigariam pelo mesmo espaço. Separadas, a cena abre inteira
e o conserto fica ao lado do projeto dela.

### Seção 6. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o menu funcionando pelos dois caminhos e guarda as duas
  ideias do dia.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): a página recarregando, os dez segundos de menu sem cacto
     nenhum, a dica lida na tela, o toque no meio da tela de início e a tecla qualquer depois de
     outro recarregar, os objetivos conferidos e o gesto de enviar na tela. O clipe **passou a
     fechar com a recapitulação do dia**, que era balão: agora o jogo tem uma porta de entrada, abre
     com o nome que você deu, espera, e começa do jeito que a pessoa quiser tentar, e o `Se` ganhou
     um andar, que é o desenho do que a Aula 7 ensinou, um estado de cada vez. **Entrou pela regra
     de que toda seção com o Estúdio embarcado tem um vídeo mostrando como se faz.** Duração alvo:
     55 a 70 segundos.
  2. `dialogue`: gancho da Aula 9, o único balão que fica aqui porque é curto e não depende de ter
     acabado de jogar: "Na próxima aula o dino para de atravessar o cacto."
  3. `quiz`: as três perguntas atuais, com os rótulos corrigidos.
  4. `studio`: entrega, com os critérios do manifesto atual traduzidos para os rótulos da edição
     atual. É o último item de `blockKeys`.

**Por que os dois balões saíram.** Balão depois da ferramenta não existe para quem faz a aula: o
Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do Estúdio" não
é um lugar. Nada foi apagado. O passo a passo do teste e a recapitulação foram para o roteiro do
`video-teste-e-envio`, e só o gancho da Aula 9 continuou balão.

## Experiências e demonstrações desta aula

### 1. `controls` · O convite para começar · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena é a certa e as três metas cobrem exatamente o percurso do dia. O que não
  servia era o palpite, porque nesta aula ele chegava depois de a criança já ter vivido a resposta
  no próprio jogo.
- **Ajuste 1, o palpite:** o palpite do bloco substitui "Você toca na tela de início. O que
  acontece?" por uma pergunta que ela ainda não respondeu, aproveitando a pergunta extra que a cena
  já tem guardada. Fica assim: "O jogo já começa com o Enter. Se você levar o Começar para o bloco
  que escuta qualquer tecla ou o toque, o Enter para de funcionar?"
  - Sim, ele troca um jeito pelo outro
  - Não, os dois passam a funcionar ✓ (o que acontece de verdade)
  - O palpite volta à tela quando a meta `start-key` cai.
  - **Por quê:** é o erro de raciocínio real. A criança lê "qualquer tecla ou toque" como uma opção
    diferente de "a tecla Enter", em vez de uma que contém a outra. O palpite de fábrica não toca
    nisso, e o novo prepara a meta 3.
- **Ajuste 2, a meta 1 vira confirmação: feito.** A primeira meta cai em segundos, porque ela já
  sabe. Isso é bom, mas a faixa não deve celebrar como descoberta o que ela já traz de casa. O
  rótulo ao cair é "É o mesmo que aconteceu no seu jogo: tocou e nada aconteceu".
- **Ajuste 3, vocabulário: feito.** Aqui "tela de início" está certo e fica, porque nesta aula a
  tela é desenhada de verdade. Os pedidos das metas nomeiam as caixas de evento com os rótulos da
  edição atual: `Quando apertar a tecla` e `Quando apertar qualquer tecla ou tocar na tela`.
- **Elenco/cenário:** personagem Dino. Cenário: `corre-dino`.
- **Metas cobradas nesta aula:** `missing-touch`, `start-tap`, `start-key`, que são as três da
  missão de fábrica, mais a pergunta final de fábrica ("Por que tocar não começava a partida?"). O
  bloco **não declara `setup.goals`** de propósito: a cena não tem meta só de caso, e sem lista ela
  cobra exatamente estas três.
- **Onde mais serve:** em qualquer curso da trilha na aula em que o menu ganha um jeito de começar.
  O palco é uma tela com um convite escrito e duas caixas de evento, e nada nele é específico do
  Dino. Trocando o elenco, serve sem tocar no motor.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | A cara do seu jogo | o menu do fim do dia, e alguém começando por toque | `video-abertura-editorial` | 25 a 35 s | fala parcial, tela regravada |
| `video-menu` | O andar novo do Se e as pecinhas de texto | o `+ senão se`, a pergunta, o `Mostrar tela` e as três pecinhas | `video-senao-se` + `video-menu` | 80 a 95 s | funde dois clipes que hoje usam o mesmo trecho; corta a promessa da Aula 11 |
| `video-enter` | O Enter funciona, o clique não | o evento do Enter, o Se de três etapas, e o clique morto | `video-enter` | 55 a 70 s | fala sim, com a correção sobre celular; tela regravada |
| `video-entrada-ampla` | Um convite que vale para os dois jeitos | a troca do evento, o apagar, e a dica reescrita | `video-entrada-completa` | 60 a 75 s | recorta só a segunda metade da Parte 2 |
| `video-teste-e-envio` | Entrar pelos dois caminhos e enviar | o menu esperando dez segundos, a dica lida, os dois jeitos de começar, o gesto de enviar e a recapitulação do dia | novo | 55 a 70 s | não, gravação nova |

**Saldo:** de 6 clipes para 5, e as duas fusões eliminam duas narrações duplicadas por inteiro. O
`video-fecho-editorial` some, e a recapitulação passa a ser o fim do clipe da entrega, depois do
teste e do envio. A entrega ganha o clipe novo pela regra de que toda seção com o Estúdio embarcado
tem um vídeo mostrando como se faz.

**Duas correções obrigatórias de fala, além dos rótulos:** sai a promessa à Aula 11 no
`video-menu`, e sai a afirmação absoluta sobre celular no `video-enter`, substituída por "no celular
quem joga usa o dedo, e o seu jogo precisa funcionar assim também".

## Continuidade

- **Assume da Aula 7:** `Mudar o estado do jogo para inicio` no fim do `Ao iniciar`. Um
  `Se o estado do jogo é jogando` dentro do `A cada quadro do jogo`, com seis comandos dentro e com
  `Limpar a tela` e `Desenhar fundo de floresta` fora. Um segundo `Se o estado do jogo é jogando`
  dentro do `A cada 1,4 segundos`. A área do jogo mostra só a floresta.
- **Entrega para a Aula 9:** o `Se` do quadro com dois andares, `jogando` e `senão se inicio`, com o
  menu desenhado no segundo. Um evento único `Quando apertar qualquer tecla ou tocar na tela`, com
  `Se o estado do jogo é inicio` e `Mudar o estado do jogo para jogando` dentro. O evento do Enter
  apagado. A dica do menu descrevendo os dois controles.
- **Valores canônicos que saem daqui:** estado `inicio` com desenho próprio · dica do menu "Aperte
  qualquer tecla ou toque na tela para começar" · um único evento de entrada.
- **Campos livres:** título, subtítulo e cor do fundo da tela de início. Nenhuma aula posterior cita
  esses textos como fato. A dica não é livre, porque a Aula 9 monta a dica da tela de fim com a
  mesma promessa.
- **Linha de diagnóstico para o professor:** se a criança sair do menu depois de vinte segundos
  parada e a partida abrir com uma parede de cactos, o relógio da Aula 7 ficou sem o `Se`. Esse é o
  primeiro dia em que aquele erro tem sintoma visível, e a causa não está na aula de hoje.
