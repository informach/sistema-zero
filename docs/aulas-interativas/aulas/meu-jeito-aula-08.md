# O Jogo do Meu Jeito · Aula 8 · O seu jogo no Mural

## Resumo

- **Estado de entrada:** o jogo completo com as duas artes dela, terminado e testado na Aula 7. Nada
  mais precisa ser montado.
- **Vitória do dia:** o jogo dela no Mural dos Criadores, com título, capa e resumo escritos por ela,
  aberto e jogado pelo endereço da publicação, do lado dos jogos dos outros criadores.
- **Seções hoje:** 8 · **Seções propostas:** 6
- **Clipes hoje:** 6 · **Clipes propostos:** 4
- **Blocos no manifesto:** 17, em `aulas/meu-jeito-aula-08.manifesto.json`
- **Cenas:** 2, as duas construídas para cá e já no catálogo: `published-copy` e
  `same-rules-new-skin`. Hoje a aula tem zero blocos de cena e três seções seguidas que declaram
  demonstração e entregam só narração.
- **Perguntas de múltipla escolha hoje:** 1 · **propostas:** 0 (ela vira experiência)
- **Blocos de texto corrido:** 0 · **eram:** 2. Por decisão de produto de 20/09/2026, nos cursos
  infantis não existe texto corrido. Os 2 blocos saíram e o conteúdo de cada um entrou nas
  instruções de produção do vídeo da própria seção, para ser executado na tela: o caminho da
  publicação foi para o `video-publicar`, e a conferência da entrega mais o envio para o
  `video-fecho-v6`.
- **Balões do Zappy:** 9, sem mudança. Nenhum balão novo nasceu aqui, porque o
  `fala-cole-o-endereco` já era o lembrete curto do envio e um segundo seria eco.

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

**Esta é a única aula do curso em que as duas regras aparecem.**

- **Seção 2, publicar: regra 1, duas vezes.** O **Abrir meu Estúdio** leva à ferramenta, e o **Ver
  no Mural** do **Publicado! 🎉** leva ao Mural dos Criadores. O roteiro gravado antigo fazia o
  contrário: fechava a janela no **Fechar** e ia ao Mural pelo menu da esquerda, justamente para não
  usar o **Ver no Mural**, que abre outra aba. Essa escolha não se sustenta. Naquele momento o
  projeto está aberto no Estúdio, então o **Mostrar menu** nem existe na tela, e o menu não é um
  caminho possível. A aba nova também é o regime normal deste curso, porque o **Abrir meu Estúdio**
  já abre assim. Fica o **Ver no Mural**, com uma frase só sobre fechar a janela de compartilhar
  quando ela voltar à aba do Estúdio.
- **Seção 5, onde buscar ideia: regra 2.** Nenhum dos quatro destinos é ferramenta com botão, então
  a gravação clica em **Mostrar menu** e nomeia os caminhos com os dois degraus. É o único clipe do
  curso que passa pelo menu, e ele é uma demonstração numa conta de demonstração, sem clique pedido
  de quem assiste. ⚠️ **Um cuidado de ordem dentro desse clipe:** depois de abrir o `Meu jogo novo`
  no Estúdio, o projeto fica aberto e o **Mostrar menu** some. Para seguir para o Mural, a gravação
  volta antes à lista **Meus Jogos** pela marca **Sistema Zero Studio**, e só então o menu volta.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Como publicar: Compartilhar, Título, Resumo, Capa, Publicar | Não. É um caminho de tela, com cada campo à vista | Não | | Dentro da construção | A modal é uma tela só e diz o que ela precisa. Cena aqui seria um segundo tour |
| **A versão publicada e o projeto editável são duas cópias separadas** | **Sim.** Duas coisas com a mesma cara, uma delas parada no tempo, e nenhuma das duas mostra na tela que a outra existe | **Sim** | Experimentação (cena `published-copy`) | Depois de publicar, com a publicação dela já aberta | É o único conceito real da aula, é a confusão mais comum depois do curso, e hoje ele é uma pergunta de múltipla escolha. Quem faz a aula sai sabendo repetir a frase e sem saber o que fazer quando quiser atualizar |
| Conferir a publicação abrindo e jogando | Não. É um gesto, e é o gesto que prova | Não | | Dentro da construção | Abrir o cartão e jogar já é a prova. É por isso que ela vem antes de qualquer conversa sobre ideias |
| O quadradinho do Desafio do mês | Não. É um campo que está na tela e precisa ser explicado ali | Não | | Dito na hora do campo, uma vez | Ele aparece na modal, então calar sobre ele deixaria ela com uma dúvida no meio de um formulário. Fica em três frases, sem virar assunto |
| **Mesma mecânica, outro tema** | **Sim.** Separar o que o jogo faz do que o jogo parece é uma abstração de verdade, e é o que a rotina das versões carrega | **Sim** | Experimentação (cena `same-rules-new-skin`) | Depois de publicar | Hoje é um vídeo comparando dois jogos que ainda nem foram preparados, e sem contraexemplo. Sem o contraexemplo, ela sai achando que qualquer mudança é só tema |
| A rotina das duas versões depois de cada curso | Não. É uma recomendação, e ela vale por ser dita com clareza | Não | | Dito depois da cena | É prática futura, não tarefa. Concretizar uma recomendação não faz sentido |
| Onde buscar ideia: tema do mês, `Meu jogo novo`, Fazer a minha versão | Não. São três lugares na tela | Não | | Dentro da orientação | São caminhos, e caminho se mostra |
| Como pedir uma ajuda que funciona (queria, tentei, aconteceu) | Não é conceito, é uma fórmula de três partes | Não | | Dentro da mesma orientação | É uma frase-modelo. Ela funciona melhor colada ao momento em que a pessoa trava do que numa seção própria |

Oito coisas, duas concretizações. Seis não ganham cena.

## Diagnóstico do desenho atual

**Três seções seguidas de vídeo puro fecham o curso.** As seções 3, 4 e 5 chamam-se *Observe: a mesma
regra com outra aparência*, *Observe: onde procurar uma próxima ideia* e *Observe: como pedir uma
ajuda que funciona*. As três declaram intenção `demonstration`, as três têm um bloco só, e esse bloco
é um vídeo. Depois de publicar o próprio jogo, que é o pico do curso inteiro, quem faz a aula assiste a três
vídeos em fila e responde duas perguntas. Não existe pior lugar no curso para um anticlímax.

**A aula tem um conceito e três orientações, e trata os quatro igual.** Cópia publicada contra
projeto editável é conceito. Tema do mês, remix e Clube são caminhos de tela. Cada um ganhou uma seção
do mesmo tamanho, e o conceito é o único que não ganhou nada além de uma pergunta de múltipla escolha.

**O único conceito da aula é ensinado por decreto e testado por memória.** A narração manda olhar o
aviso da modal, que diz que a versão publicada fica salva do jeito que está, e em seguida a pergunta
*Você mudou o projeto depois de publicar. O jogo daquela publicação mudou sozinho?* cobra se ela
lembra. E a pergunta que ela vai fazer na vida real, que é "e como eu atualizo o que está lá?", não é
respondida em lugar nenhum da aula.

**A comparação de temas depende de material que ainda não existe.** Os próprios ajustes de produção
registram que os jogos de comparação precisam ser preparados antes da edição e que não estão
implementados neste pacote. Ou seja, a seção 3 promete dois jogos jogáveis que alguém ainda vai ter
que construir, gravar e editar, para entregar uma comparação sem contraexemplo.

**O alerta de honestidade da própria aula não tem como ser cumprido em vídeo.** Os ajustes mandam não
afirmar "mesmos blocos" se o exemplo de carrinho tirou tiro, vidas ou vitória. Cumprir isso numa
narração exige uma ressalva falada, que é justamente o tipo de coisa que quem faz a aula não escuta. Num
contraexemplo com a mão dela, ela não tem como não ver.

**O quiz repete o vídeo.** *Trocar a nave por um submarino, conservando controles e regras, muda
principalmente o quê?* é a mesma pergunta que o vídeo da seção 3 acabou de responder, com as mesmas
palavras.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** é a última aula, e ela precisa ver desde o começo que o dia acaba com o jogo
  dela numa prateleira pública.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`) · o Mural dos Criadores, com o cartão do jogo da nave no meio dos
     outros, e o jogo abrindo pelo cartão e sendo jogado. Fala curta: "O seu jogo está pronto. Hoje
     ele sai do seu computador e vai para o Mural, onde qualquer pessoa da Comunidade pode abrir e
     jogar. Essa é a primeira coisa que a gente faz. Depois eu te mostro onde procurar a próxima
     ideia, para quando você quiser criar de novo. Você não precisa fazer outro jogo para terminar
     este curso." Duração alvo: 25 a 35 segundos.

### Seção 2. Ponha o seu jogo no Mural

- **Intenção:** construção
- **Por que existe:** é a vitória do dia e do curso, e ela vem primeiro, antes de qualquer conversa
  sobre o que fazer depois.
- **Conclui quando:** o jogo está publicado, o cartão dela aparece no Mural com o título, a capa e o
  resumo dela, e ela abriu e jogou a versão publicada
- **Blocos:**
  1. `video` (`video-publicar`) · o caminho inteiro executado na tela, do Estúdio aberto pelo
     **Abrir meu Estúdio** desta seção até o jogo rodando pelo cartão. Abre jogando uma partida, para
     conferir que está tudo como ela quer, mostra
     que o **Compartilhar** fica solto na barra de cima, do lado de fora dos três pontinhos, e que a
     janela **Compartilhar no Mural dos Criadores** é uma tela só. Depois os três campos preenchidos
     enquanto explica: o **Título**, que é o nome que os outros criadores vão ver; o **Resumo do
     projeto**, com duas ou três linhas sobre o que o jogo faz e o que ela mudou nele, e o **Gerar
     resumo com a IA** ao lado, que ajuda a montar o texto quando ela travar; e a **Capa do
     projeto**, com o **Gerar capa**,
     que tira uma foto do jogo do jeito que ele está naquela hora, e o **Enviar uma imagem**. Segue
     com o aviso de baixo lido em voz alta com o texto que está lá (*"A versão publicada fica salva no
     Mural do jeito que está agora. Se você mudar o projeto aqui depois, a do Mural não muda"*), o
     **Publicar**, o **Publicado! 🎉** com os três botões (**Ver no Mural**, **Abrir o jogo** e
     **Copiar link**), o **Ver no Mural** abrindo o Mural dos Criadores em outra aba,
     o cartão dela aparecendo e o jogo abrindo pelo cartão. Fecha com a conferência junto e o pedido
     de pausa. **Cortar a explicação longa do Desafio do mês**, que agora está nos dois balões abaixo.
     **Não prometer selo, prêmio, ranking nem liberação.** Duração alvo: 125 a 145 segundos.
  2. `dialogue` · o quadradinho do desafio, em três frases, sem virar assunto: "Mais embaixo tem um
     quadradinho com um troféu, e nele está escrito **Participar do Desafio do mês**, com dois pontos
     e o nome do tema logo em seguida. Esse tema também fica no **Início** da Comunidade, no cartão do
     troféu. Quem faz um jogo com aquele
     tema marca esse quadradinho na hora de compartilhar, e o jogo dele entra numa prateleira só dos
     participantes, no topo do **Mural dos Criadores**. O seu jogo de hoje é o da nave, e ele não foi
     feito para o tema deste mês, então deixe o quadradinho em branco. Ele aparece nessa janela
     sempre que tiver um tema valendo, e é assim que você entra num desafio quando quiser."
  3. `dialogue` · a conferência, que é o gesto que prova: "Jogue a versão que está no Mural. Mova com
     as setas, atire, deixe uma pedra bater, e comece de novo. É o seu jogo, com as suas artes,
     rodando fora do seu projeto."

> **Fechado em 20/09/2026: o quadradinho do troféu sempre existe para quem assiste esta aula.** A
> régua do código pede três coisas para ele aparecer na janela de compartilhar: posse do Clube dos
> Criadores, posse do Estúdio Completo e um tema definido naquele mês. As duas primeiras nunca
> faltam aqui, porque **O Jogo do Meu Jeito não é vendido separado**: só chega a ele quem comprou a
> Comunidade dos Criadores, e a Comunidade dá as duas posses. O único curso que se compra sozinho é
> o Desafio do Primeiro Jogo. Sobra a terceira condição, o tema do mês, e é exatamente o que a fala
> já diz: "sempre que tiver um tema valendo". Nada a mudar, e nada a reabrir.

**A ordem mudou dentro da seção.** Com o texto corrido fora, quem apresenta a janela de compartilhar
é o clipe, então ele passa a abrir a seção. As duas falas do quadradinho do troféu vêm depois, como
aviso para a hora em que ela mesma publica, e antes disso não teriam a que se referir.

**Publicar continua sendo o passo 1**, como já está decidido, e a aula não segura a vitória atrás de
sugestões de outros projetos.

**Autoconferência no fim do clipe `video-publicar`:** "No Mural, o cartão mostra o título e a capa que você escolheu e abre uma partida com suas duas artes, tiro e reinício?"

### Seção 3. A cópia que foi para o Mural

- **Intenção:** conceito
- **Por que existe:** a partir de hoje ela tem duas coisas parecidas com o mesmo nome, e vai mexer
  numa delas achando que mexeu nas duas. É a dúvida número um de quem termina o curso.
- **Conclui quando:** as três metas de `published-copy` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` · abertura curta do Zappy, sem vídeo: "Você leu um aviso antes de publicar, e ele
     falava de duas cópias. Agora que o seu jogo está lá, vale entender direito o que são essas duas,
     porque você vai continuar mexendo no seu projeto."
  2. `interactive` · cena `published-copy`, "A cópia que foi para o Mural", já construída e descrita
     abaixo. Elenco: personagem `nave`. Cenário do palco: `meu-jeito`. Metas declaradas:
     `first-publish`, `only-project`, `republish`.

### Seção 4. As mesmas regras, outra história

- **Intenção:** conceito
- **Por que existe:** é a ideia que a rotina das versões carrega. Sem separar regra de aparência, "faz
  outra versão" vira um conselho vago.
- **Conclui quando:** as três metas de `same-rules-new-skin` caem e a pergunta final é respondida
- **Blocos:**
  1. `interactive` · cena `same-rules-new-skin`, "As mesmas regras, outra história", já construída e
     descrita abaixo. Elenco: três conjuntos de desenhos para o mesmo jogo. Cenário do palco:
     `meu-jeito`. Metas declaradas: `skin-only`, `three-skins`, `rule-off`.
  2. `dialogue` · a rotina, dita depois de quem faz a aula ter sentido a diferença: "Isso tem nome:
     **mesma mecânica, outro tema**. Mecânica é o que o jogo faz, as regras dele. Tema é a história
     que você conta por cima. E daí sai uma rotina que eu quero te deixar. Cada curso que você fizer
     aqui vai te ensinar coisas novas. Quando terminar um, faça duas versões. Uma é o mesmo jogo do
     curso com os seus desenhos no lugar dos que vieram prontos, que é exatamente o que você acabou de
     fazer neste. A outra é a mesma mecânica com outro tema. Duas versões depois de cada curso. É
     pouca coisa, e faz diferença: quem faz fica bom."

**A cena substitui uma produção que ainda não existe.** Hoje esta ideia depende de dois jogos jogáveis
preparados, gravados e editados, e mesmo assim entregaria a comparação sem contraexemplo. A cena
entrega as duas metades, e serve ao fecho dos outros cursos também.

### Seção 5. Onde buscar a próxima ideia

- **Intenção:** fechamento
- **Por que existe:** os dois travamentos reais de quem vai criar sozinho são "não vem ideia" e
  "empaquei no meio". As duas saídas moram na mesma tela, e a aula pode dar as duas juntas.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-ideias-e-clube`) · funde os dois clipes de hoje. Três lugares para ideia e um
     lugar para ajuda, sem pedir clique nenhum de quem assiste, com o professor demonstrando numa conta de
     demonstração. **É o único clipe do curso em que a navegação passa pelo menu**, porque nenhum dos
     quatro destinos tem botão na seção: a gravação abre clicando em **Mostrar menu**, uma vez só, no
     primeiro quadro, e daí em diante a barra esquerda fica aberta e os caminhos saem com os dois
     degraus.
     - O **tema do mês**, no **Início** da Comunidade, no cartão com o troféu. **A narração nunca
       diz qual é o tema**, porque ele muda todo mês e o vídeo fica no ar: ela mostra onde ver.
     - O **Meu jogo novo**, aquele projeto vazio que ela criou na Aula 1 e que ficou guardado esse
       tempo todo, já com a extensão Jogo 2D instalada. Chega-se nele por **Criar › Estúdio**. É o
       lugar de começar do zero quando o tema é
       outro. Mostrar que ali dentro tem a tela vazia e a coluna da esquerda cheia de bloquinhos, e
       apontar o `Criar sprite ... com imagem`, que ela já sabe montar. Sem passeio de tela.
     - O **Mural dos Criadores**, em **Comunidade › Mural dos Criadores**, e no cartão de um jogo que
       ela gostou, o **Fazer a minha versão**, que cria um
       projeto novo na lista dela com o nome começando em `Remix de`, com os blocos e tudo. **Corrigir
       a afirmação de que outro tema quase sempre exige começar do zero:** às vezes cabe adaptar as
       mesmas regras, e ela acabou de ver isso na cena.
     - O **Clube dos Criadores**, em **Comunidade › Clube dos Criadores**, com a fórmula de três
       partes numa tela
       preparada: **o que você queria**, **o que você tentou** e **o que aconteceu**. O exemplo:
       "queria que o fogo pulsasse, dupliquei o quadro, mas os dois desenhos ficaram iguais." **Tirar
       a obrigação de postar, a promessa de resposta pessoal e a frase absoluta sobre ninguém aprender
       sozinho.** Duração alvo: 90 a 105 segundos.
  2. `dialogue` · fecho da seção: "Nada disso é tarefa. É onde procurar no dia em que você quiser
     criar de novo, e no dia em que você empacar no meio."

**Junta duas seções de hoje**, e a junção tem razão didática, não só economia: as duas respondem à
mesma pergunta, que é o que fazer quando você trava. Travou por falta de ideia, os três lugares.
Travou no meio de uma coisa, o Clube, com a fórmula.

### Seção 6. Envie, e o que você leva daqui

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o curso com o que ela tem na mão, sem promessa nenhuma.
- **Conclui quando:** o projeto é enviado com o endereço da publicação na mensagem e as duas perguntas
  do quiz são respondidas
- **Blocos:**
  1. `dialogue` · a entrega, com o gesto do link: "Envie o mesmo projeto que você acabou de publicar.
     E, na mensagem da entrega, cole o endereço da publicação, que você copia no **Copiar link** da
     janela de compartilhar ou na barra do navegador com o jogo aberto. É por esse endereço que eu
     abro o seu jogo e jogo ele."
  2. `studio` · entrega pela galeria do Estúdio, uma criação, com os critérios de revisão do professor
     já definidos no roteiro atual. **A entrega é conferida pela plataforma, e a publicação é conferida
     pelo professor abrindo o endereço.** Nenhuma pergunta prova que alguém publicou.
  3. `video` (`video-fecho-v6`) · agora em três partes. Abre com a conferência junto da entrega (o
     projeto é o da aula passada, com as duas artes; o endereço da publicação está na mensagem e abre
     o jogo no Mural; e nada de Clube, tema do mês, remix ou versão extra é exigido para concluir),
     segue com o envio executado na tela, pela galeria do Estúdio e com o endereço colado na mensagem,
     e só então vem o fecho do curso, com a fala nova abaixo. O que passa na tela nessa parte: a nave
     em pixel art da Aula 2, o motor da Aula 3, a pedra da Aula 4, o fogo da Aula 5, o jogo mudando de
     cinza para a arte dela nas Aulas 6 e 7, e o cartão dela no Mural. Duração alvo: 80 a 95 segundos.
     Fala:
     > "Olha o que você tem agora. Duas artes desenhadas por você, uma em quadradinhos e uma em
     > formas, as duas animadas, guardadas na sua galeria e prontas para entrar em qualquer jogo que
     > você fizer daqui para a frente. Um jogo com a sua cara, no Mural, que qualquer pessoa da
     > Comunidade abre e joga. E uma coisa que você aprendeu sem eu ter falado o nome dela: em todo
     > lugar tem alguém que prepara e alguém que usa. Trazer o desenho para o projeto não usou ele.
     > Criar o sprite não mostrou o desenho certo. Carregar a folha não animou nada. Publicar não
     > trancou o seu projeto. São sempre duas coisas, e saber qual é qual é metade de fazer um jogo
     > funcionar. Da próxima vez que alguma coisa não aparecer na tela, essa é a primeira pergunta:
     > eu preparei, ou eu usei? Nos vemos no Clube."
  4. `quiz` · duas perguntas. A primeira é nova e cobra a única coisa da seção 5 que nada verificava,
     aplicando a ideia de cópia numa situação nova, o jogo de outra pessoa:
     - *Você gostou de um jogo do Mural e apertou o Fazer a minha versão. O que acontece?* · **Nasce
       um projeto novo na sua lista, começando em Remix de, para você mexer** (correta) · Você passa
       a mexer no jogo da outra pessoa, e ele muda para ela também. Devolutiva: o Fazer a minha
       versão tira uma cópia daquele jogo e põe um projeto novo na sua lista. O jogo da outra pessoa
       fica como estava, do mesmo jeito que a sua publicação fica como estava quando você mexe no seu
       projeto.
     - A segunda é a atual, mantida: *Para pedir ajuda sobre uma animação parada, qual mensagem ajuda
       mais?* O contraste entre "não ficou bom" e a mensagem em três partes é honesto e ensina na
       leitura.
     - **A pergunta do submarino sai**, porque ela repete a cena com as mesmas palavras.
     - **A pergunta do carrinho sem tiro também não entra no quiz**, pelo mesmo motivo: ela é, palavra
       por palavra, a pergunta de fim da cena `same-rules-new-skin`, que fecha a seção 4. Duas seções
       antes do quiz, a mesma pergunta duas vezes seguidas não mede nada que a cena já não tenha
       medido, e o lugar certo dela é a cena, onde quem faz a aula acabou de desligar a regra com a mão.

## Experiências e demonstrações desta aula

### 1. `published-copy` · A cópia que foi para o Mural · **CONSTRUÍDA**

- **Id no catálogo:** `published-copy` · **grupo:** `world`
- **Título visível:** A cópia que foi para o Mural
- **O conceito abstrato:** publicar tira uma cópia do jogo do jeito que ele está naquela hora. O
  projeto continua sendo dela para mexer, e a cópia do Mural fica como estava.
- **Tipo:** experimentação. A relação tem botão: quando ela muda uma coisa no projeto, a tela do
  Mural não muda, e quando ela publica de novo, muda. As duas metades são o conceito, e a segunda é a
  que a aula de hoje nem menciona.
- **O que quem faz a aula manipula:**
  - **A cor da nave no projeto**, com três cores.
  - O botão **Publicar**.
  - O botão **Abrir a versão do Mural**.
- **Como o palco começa:** duas telas lado a lado, **O seu projeto** à esquerda, com a nave rodando, e
  **A versão no Mural** à direita, vazia, com o dizer "nada publicado ainda".
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `first-publish` | "Depois de publicar, as duas telas mostram a mesma nave" | "Aperte Publicar e olhe as duas telas." |
  | `only-project` | "Mudando a cor no projeto, só a tela da esquerda mudou" | "Depois de publicar, troque a cor da nave e olhe as duas telas." |
  | `republish` | "O Mural ganhou uma publicação nova com a cor nova" | "Com a cor trocada, aperte Publicar de novo." |
- **Pistas:**
  1. "A tela da direita está vazia. Aperte Publicar."
  2. "Agora troque a cor da nave e compare as duas telas."
  3. "Aperte Publicar de novo e olhe os dois cartões do Mural."
- **Palpite antes de abrir:** "Depois de publicar, você troca a cor da nave no seu projeto. O que
  acontece com a do Mural?"
  - Ela continua com a cor de antes ✓
  - Ela troca de cor junto
- **Pergunta depois de descobrir (conta para concluir):** "Uma semana depois de publicar, você melhora
  o seu jogo. Como o Mural passa a mostrar a versão nova?"
  - Publicando de novo ✓
  - Sozinho, assim que você salva
- **Explicação ao acertar:** "Publicar tira uma cópia do jogo do jeito que ele está naquela hora. O
  seu projeto continua seu para mexer, e cada vez que você publica entra uma publicação nova no
  Mural, com a versão daquele momento. A de antes continua lá, do jeito que ela foi."
- **Frase de sucesso:** "São cópias: o projeto continua seu para mexer; cada publicação guarda a
  versão daquele momento."
- **A pendência que segurava a terceira meta foi decidida, e o comportamento é criar outra.** O
  documento de design da plataforma (`sistema-zero/docs/plans/2026-09-19-cenas-presets-design.md`)
  registra: o serviço do Mural cria outro post quando recebe uma nova chave de publicação, e a mesma
  chave apenas evita duplicar o mesmo envio. Ou seja, **republicar não atualiza o cartão: ele põe uma
  publicação nova no Mural**. A meta `republish` foi construída com esse rótulo, a terceira pista
  manda olhar os dois cartões, e a explicação da pergunta de fim passou a dizer isso com todas as
  letras, em vez da frase de meio-termo que servia aos dois casos.
- **Onde mais serve:** Desafio do Primeiro Jogo, no dia de publicar, e o fecho do Corre Dino. É a cena
  de fechamento padrão de qualquer curso Kids que termine no Mural, e hoje esse conceito não existe em
  nenhum dos três cursos.
- **Por que nenhuma cena existente servia:** as cenas anteriores tratavam de palco, arte, mundo,
  movimento, eventos, população, velocidade e colisão. Nenhuma tocava em publicação nem em duas
  cópias do mesmo projeto.
- **Ações no motor, conferidas no código:** `publish` e `open-mural`, as duas exclusivas desta cena,
  mais `recolor` com `side: "project"`, restrito ao painel da esquerda e a três cores, que é o que
  esta especificação pedia. O "Voltar ao começo" reusa o `reset` que já existe, e não virou ação
  própria.
- **O que o catálogo traz, comparado com esta especificação:** as duas primeiras metas e as duas
  primeiras pistas entraram como estavam. A terceira meta, a terceira pista e a frase de sucesso
  foram reescritas pela decisão da republicação, e é a versão do catálogo que vale.

### 2. `same-rules-new-skin` · As mesmas regras, outra história · **CONSTRUÍDA**

- **Id no catálogo:** `same-rules-new-skin` · **grupo:** `world`
- **Título visível:** As mesmas regras, outra história
- **O conceito abstrato:** a mecânica é o que o jogo faz, as regras. O tema é a história desenhada por
  cima. Trocar desenho não muda regra, e tirar uma regra muda o jogo de verdade.
- **Tipo:** experimentação. A relação tem dois botões, e o segundo é o que faz a cena valer: quando eu
  troco o tema, a lista de regras continua acesa igual; quando eu desligo uma regra, a lista muda e o
  jogo muda junto. A segunda metade é o contraexemplo, e ela é obrigatória pela regra de honestidade
  que a própria aula já registra, que proíbe dizer "mesmos blocos" quando um exemplo tirou o tiro.
- **O que quem faz a aula manipula:**
  - **O tema:** nave no espaço · carrinho na estrada · submarino no fundo do mar.
  - **A regra de atirar:** ligada ou desligada.
  - O jogo, que roda ao lado e pode ser jogado com as setas e a tecla de tiro.
- **Como o palco começa:** o jogo da nave rodando, o tema em nave, e ao lado uma lista com quatro
  regras acesas: "as setas movem", "a tecla atira", "o obstáculo vem", "encostou, perde uma vida".
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `skin-only` | "Trocou o tema e as quatro regras continuaram acesas" | "Troque o tema para carrinho e olhe a lista de regras." |
  | `three-skins` | "Três histórias diferentes, o mesmo jogo" | "Passe pelos três temas." |
  | `rule-off` | "Desligando a regra de atirar, a lista mudou e o jogo mudou junto" | "Desligue a regra de atirar e jogue um pouco." |
- **Pistas:**
  1. "Troque o tema e olhe a lista de regras do lado."
  2. "Passe pelos três temas e veja se alguma regra apagou."
  3. "Agora desligue a regra de atirar e jogue um pouco."
- **Palpite antes de abrir:** "Trocando a nave por um carrinho, o que muda no jogo?"
  - O desenho, e as regras continuam ✓
  - As regras também, porque é outro jogo
- **Pergunta depois de descobrir (conta para concluir):** "Um criador trocou a nave por um carrinho e
  tirou o tiro. O que ele mudou?"
  - O tema e também a mecânica, porque uma regra saiu ✓
  - Só o tema, porque ele só trocou desenho
- **Explicação ao acertar:** "Trocar desenho muda o tema. Tirar, pôr ou mudar uma regra muda a
  mecânica. Dá para fazer uma sem a outra, e dá para fazer as duas."
- **Frase de sucesso:** "As regras são a mecânica. Os desenhos são o tema. Você escolhe o que troca."
- **Cuidado de produção:** os três temas precisam ser o **mesmo jogo** com três conjuntos de desenhos,
  e não três jogos parecidos. Se um deles for construído com regra diferente, a cena passa a ensinar o
  contrário do que promete. O obstáculo vem de cima nos três, inclusive na estrada.
- **Onde mais serve:** fecho do Corre Dino e do Desafio do Primeiro Jogo, e qualquer aula que fale de
  versões, de remix ou do tema do mês. Ela também **substitui a produção de dois jogos jogáveis para
  gravação**, que hoje está registrada em aberto nos ajustes de produção desta aula, então o custo
  dela é menor do que parece.
- **Por que nenhuma cena existente servia:** nenhuma das anteriores tinha troca de aparência sem
  troca de regra. A mais próxima em espírito é `enemy-type`, que mostra o que muda quando se mexe
  numa ficha, e o conteúdo dela é ficha compartilhada contra cópia ao nascer, que é outro assunto.
- **Ações no motor, conferidas no código:** `skin`, com `theme` em `space`, `road` ou `sea`, que são
  os três temas desta especificação; `rule-toggle`, para ligar e desligar a regra; e `play-move` e
  `play-shoot`, que dão a quem faz a aula as setas e a tecla de tiro dentro do palco. Esta é a única cena do
  catálogo com jogo jogável, como a especificação previa.
- **O que o catálogo traz, comparado com esta especificação:** título, instrução, o que quem faz a aula
  manipula, frase de sucesso, pergunta extra, as três metas com rótulo e pedido e as três pistas
  entraram palavra por palavra. Nenhuma divergência.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O seu jogo do lado dos outros | o Mural com o cartão dela, e o jogo abrindo pelo cartão | `video-abertura-v6` | 25 a 35 s | fala sim, tela a regravar |
| `video-publicar` | Do seu computador para a prateleira da turma | a partida de conferência, o Compartilhar, os três campos explicados enquanto preenche, Gerar capa, o aviso das duas cópias, Publicar, Fechar, Mural, o cartão e a conferência junto | `video-publicar` | 125 a 145 s | fala sim, com a explicação longa do Desafio do mês cortada |
| `video-ideias-e-clube` | Onde procurar quando você travar | tema do mês, `Meu jogo novo`, Fazer a minha versão, e a fórmula de três partes no Clube | `video-ideias` + `video-clube` | 90 a 105 s | funde dois clipes, com três correções de fala |
| `video-fecho-v6` | Alguém prepara e alguém usa | a conferência junto da entrega, o envio executado na tela, a linha do tempo das oito aulas e o fecho do curso | `video-fecho-v6` | 80 a 95 s | fala nova inteira, com o trecho de entrega novo na frente |

**Saldo:** de 6 clipes para 4. O `video-versoes` sai inteiro, e com ele sai a obrigação de construir,
gravar e editar dois jogos jogáveis de comparação. Os dois clipes de orientação viram um. O fecho
ganha tempo, que é onde ele deve ganhar. E os dois clipes que receberam o texto corrido crescem,
porque o caminho da publicação e a conferência da entrega passaram a ser executados na tela.

## Continuidade

- **O que esta aula assume da Aula 7:** o jogo completo com as duas artes dela, testado, com o
  criador do kit já fora, e o projeto na lista **Meus Jogos**.
- **O que esta aula assume da Aula 1:** o projeto `Meu jogo novo`, vazio, com a extensão Jogo 2D
  instalada, ainda guardado na lista. Ele é citado na seção 5 e não é aberto.
- **O que entrega:** o jogo publicado no Mural, o projeto enviado ao professor e o endereço da
  publicação na mensagem da entrega. Nada é montado nesta aula, e isso é de propósito.
- **Valores canônicos que saem daqui:** nenhum número novo. Título, Resumo e Capa são escolha dela.
  O que passa a ser fato do curso é o comportamento da republicação: publicar de novo **põe uma
  publicação nova no Mural**, e não troca a que já estava lá.
- **O que esta aula não promete, e a razão:** o `Compartilhar` do Estúdio Completo leva o jogo para o
  Mural e dá o XP de publicação, e isso é o que a aula diz. Ele **não credita curso** e **não libera
  bloco**. A aula não fala de desbloqueio, de prêmio, de ranking nem de selo que não tenha sido
  conferido na configuração atual. E, pela regra da casa, ela também **não nega** nada disso: negar um
  prêmio que ninguém pediu inventa a falta. A fala diz o que ela ganha, e o que ela ganha é concreto: o
  jogo dela numa prateleira que a turma inteira abre.
- **Pontos a conferir antes de gravar:**
  1. Os rótulos da modal, que já mudaram uma vez. A palavra "congelada" não existe nessa tela, e o
     material usou ela por um tempo mandando quem faz a aula procurar algo que não está lá.
  3. O tema do mês na tela de gravação. A narração mostra onde ver, e nunca diz qual é.

## Manifesto

Arquivo: `aulas/meu-jeito-aula-08.manifesto.json`. Versão 4, 6 seções, 17 blocos, 4 clipes.

### Seções e critério de conclusão

| # | Chave | Título | Intenção | Blocos | Conclui com |
|---|---|---|---|---|---|
| 1 | `abertura` | O que a gente vai fazer hoje | `presentation` | 1 | `video-abertura` |
| 2 | `publicar` | Ponha o seu jogo no Mural | `application` | 4 | `video-publicar` |
| 3 | `copia-do-mural` | A cópia que foi para o Mural | `exploration` | 2 | `experimento-copia-publicada` |
| 4 | `mesma-mecanica` | As mesmas regras, outra história | `exploration` | 4 | `experimento-tema-e-regra` |
| 5 | `proxima-ideia` | Onde buscar a próxima ideia | `closing` | 2 | `video-ideias-e-clube` |
| 6 | `entrega-e-fecho` | Envie, e o que você leva daqui | `delivery` | 4 | `entrega-galeria-v6` e `quiz-v6` |

Nenhuma seção fica sem critério. A seção 2 conclui pelo clipe, e não por pergunta: como a própria
proposta registra, nenhuma pergunta prova que alguém publicou. A entrega é conferida pela
plataforma e a publicação é conferida pelo professor, abrindo o endereço que vem na mensagem.
O v6 desta aula não traz `projectChecks` nenhum, e nada foi inventado.

### Regra das duas colunas

Nenhuma seção precisou ser dividida, e a proposta já tinha deixado isso resolvido ao separar as
duas cenas em duas seções. Cada uma das seções 3 e 4 tem uma cena só na direita, e nenhuma delas
tem Estúdio embarcado. As seções que trabalham na ferramenta usam `externalTool: "estudio"`, que
não disputa a coluna da direita.

### Destino da pergunta de múltipla escolha de hoje

| Pergunta do v6 | Destino | Onde |
|---|---|---|
| "Você mudou o projeto depois de publicar. O jogo daquela publicação mudou sozinho?" | vira experiência | `experimento-copia-publicada`, como palpite de abertura e metas `first-publish` e `only-project` |

A pergunta do submarino sai do quiz, como a proposta decidiu.

**A duplicação apontada na revisão foi resolvida.** Por um tempo a primeira pergunta do quiz foi a
do carrinho sem tiro, que é palavra por palavra a pergunta de fim da cena `same-rules-new-skin`,
duas seções antes. Perguntar a mesma coisa duas vezes seguidas não mede nada de novo, e o lugar
dela é a cena, onde quem faz a aula acabou de desligar a regra com a mão. No quiz entrou uma pergunta
sobre o **Fazer a minha versão**, que cobre outro aspecto da aula: ela aplica a ideia de cópia à
seção 5, que hoje é a única seção do dia sem nenhuma verificação, e faz isso numa situação nova, o
jogo de outra pessoa. O quiz continua com duas perguntas.

### Falas longas partidas em duas

O balão do Zappy tem limite de 400 caracteres. Duas falas da proposta foram partidas:

- a do quadradinho do Desafio do mês virou duas, `fala-desafio-do-mes` (o que é) e
  `fala-desafio-em-branco` (o que fazer hoje);
- a da seção 4 virou três, `fala-mesma-mecanica` (o nome da ideia), `fala-rotina-das-versoes` (a
  primeira versão) e `fala-duas-versoes` (a segunda versão e o fecho da rotina).

A fala de fecho do curso vive no `video-fecho-v6`, não num balão, pelo mesmo limite. E o caminho
completo da janela de compartilhar não virou balão nem texto: ele é executado na tela, dentro do
`video-publicar`, como nas aulas anteriores.

### Cenas

- `published-copy` entra **com as três metas**, `first-publish`, `only-project` e `republish`, com
  palpite (`revealOn: only-project`) e pergunta de fim.
- `same-rules-new-skin` entra com as três metas de fábrica, `skin-only`, `three-skins` e
  `rule-off`, com palpite (`revealOn: skin-only`) e pergunta de fim.
- As duas **estão no catálogo**, e o manifesto passa no validador com zero avisos.
- Os dois blocos deixaram de escrever pistas próprias e passaram a herdar a escada da cena. Foi isso
  que devolveu, sozinho, a terceira pista da `published-copy`, que tinha sido cortada junto com a
  meta.

**A pendência bloqueante foi fechada, e a resposta é que republicar cria outra publicação.** O
documento de design da plataforma (`sistema-zero/docs/plans/2026-09-19-cenas-presets-design.md`) diz
que o serviço do Mural cria outro post quando recebe uma nova chave de publicação, e que a mesma
chave apenas evita duplicar o mesmo envio. Com isso:

1. a meta `republish` passa a ser cobrada, com o rótulo "O Mural ganhou uma publicação nova com a cor
   nova";
2. a instrução do bloco ganhou o terceiro gesto, publicar de novo e olhar os dois cartões;
3. a explicação da pergunta de fim deixou de ser a frase de meio-termo que servia aos dois casos e
   passou a dizer o que acontece: cada publicação entra nova no Mural, com a versão daquele momento,
   e a de antes continua lá;
4. o `video-publicar` continua lendo o aviso da modal com as palavras que estão na tela. O que mudou
   é que agora a aula **pode** responder "e como eu atualizo o que está lá?", que era a pergunta que
   ela deixava sem resposta.

### Blocos aposentados

`retireBlockKeys`: `video-abertura-v6`, `conferir-publicar`, `video-versoes`, `video-ideias`,
`video-clube`. Nenhuma dessas chaves aparece em `blocks`. Com o `video-versoes` sai também a
obrigação de construir, gravar e editar dois jogos jogáveis de comparação.
