# O Jogo do Meu Jeito · Aula 5 · A pedra pega fogo e começa a rolar

## Resumo

- **Estado de entrada:** a pedra em vetor, 64 × 64, arredondada e com as crateras, terminada na
  Aula 4, com espaço livre em cima reservado para o fogo. A animação dela ainda se chama `parado` e
  tem um quadro só. Na galeria também está a nave em pixel art, 32 × 32, com a animação `voando` de
  dois quadros a 8 fps. Esta aula inteira acontece no Pinta, e nenhum bloco do Estúdio é montado.
- **Vitória do dia:** o meteoro dela pegando fogo e rolando na Prévia, com duas artes animadas
  prontas para entrar no jogo.
- **Seções hoje:** 10 · **Seções propostas:** 8
- **Clipes hoje:** 7 · **Clipes propostos:** 7, sendo 1 eliminado, 1 extraído de um corte e 2 bem
  mais curtos
- **Cenas:** 2, as duas no catálogo: `layers`, que já existia, e `motion-amount`, construída para cá
- **Perguntas de múltipla escolha hoje:** 4 · **propostas:** 0 (1 vira experiência, 2 viram
  instrução, 1 some)
- **Blocos de texto corrido:** 0 · **eram:** 4. Por decisão de produto de 20/09/2026, nos cursos
  infantis não existe texto corrido. Os 4 blocos saíram e o conteúdo de cada um entrou nas
  instruções de produção do vídeo da própria seção, para ser executado na tela: a chama de fora foi
  para o `video-chama-externa`, a chama de dentro para o `video-chama-interna`, o segundo quadro
  para o `video-quadro-2`, e a conferência das duas artes mais o envio para o `video-fecho-v6`.
- **Balões do Zappy:** 7 · **eram:** 6. Nasceu 1, o `fala-enviar-as-duas-artes`, com o lembrete
  curto do envio na hora de usar a galeria.
- **Regras de produto de 20/09/2026:** ferramenta de criação e experiência não dividem a mesma seção,
  e toda seção com ferramenta tem vídeo mostrando como se faz. Duas seções desta aula batiam nisso, e
  cada uma se resolveu de um jeito. A `camadas` **virou duas**, porque quem faz a aula precisa mesmo abrir o
  Pinta ali: fica a experiência sozinha e nasce a seção `uma-camada-para-tras`, com o clipe que já
  existia. A `tanto-que-muda` **perdeu o `externalTool`**, porque nela quem faz a aula não mexe no Pinta, só
  na cena. O balão do **Duplicar quadro**, que era o único gesto de ferramenta dessa seção, foi para a
  seção seguinte, onde o clipe já mostra esse mesmo gesto na tela. Nenhum vídeo novo precisou ser
  inventado.

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

**Nesta aula só a regra 1 aparece.** As cinco seções de ferramenta têm `externalTool: "pinta"`,
então o caminho falado é sempre o **Abrir meu Pinta**, e a barra esquerda não é nomeada em lugar
nenhum. O roteiro gravado antigo abre a Parte 1 por "abre o Pinta ali no menu da esquerda", e é esse
trecho que precisa ser regravado.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Ordem das formas: quem é desenhada depois fica por cima | Sim. A ordem não aparece no desenho, só no resultado | **Sim** | Experimentação (`layers`) | **Depois** de a chama nascer cobrindo a pedra | É a única maneira de quem faz a aula entender que nada foi apagado. Hoje a cena vem antes da dor, e resolve um problema que ela ainda não teve |
| Forma nova nasce no topo da pilha | Sim, mas é a mesma regra vista pelo outro lado | **Não**, fica dentro da cena de camadas | | | A cena `layers` já entrega isso na meta `covered`. Segunda cena repetiria o palco |
| Cópia nasce no topo também (a chama de dentro) | Não. É a regra de cima, aplicada de novo | Não | | Dita na hora do gesto | Ela acabou de ver acontecer com a chama de fora. A segunda vez é reconhecimento, não descoberta |
| Contorno em Sem cor antes de traçar | Não. É operação, e o resultado aparece no traço | Não | | Dentro da construção | A forma nasce pronta e não sobra nada para consertar. Cena aqui seria gasto puro |
| Ponta reta e ponta redonda (Ponto suave só na base) | Não. Critério visual que ela vê no próprio traço | Não | | Dentro da construção | Ela arredonda e olha. Dois segundos |
| Cor mais clara por dentro | Não. Escolha visual do jogo, e ela já fez luz e sombra na Aula 2 | Não | | | É aplicação do que ela já sabe. E não é lei física de fogo, é linguagem de desenho |
| Cada quadro guarda as formas dele | Sim, moderadamente. Duplicar sugere que os dois ficam ligados | Não | | Dentro da construção, como gesto | Ela clica no quadradinho 1 e a cratera está lá. O próprio desenho dela responde na hora |
| O tanto que muda entre um quadro e o outro | **Sim, e é o conceito central do dia.** Quanto é pouco, quanto é o suficiente e quanto é demais não tem representação nenhuma na tela | **Sim** | Experimentação (cena `motion-amount`) | Antes de mexer no segundo quadro | Hoje isso é uma seção de demonstração sem bloco de demonstração, e o critério de parada vira uma opinião da narração ("se ficou doido demais, mexe menos"). É a maior lacuna da aula |
| Dois desenhos trocando depressa viram movimento | Sim, mas **já foi concretizado na Aula 3** (cena `frames`) | Não | | | Repetir a cena três aulas depois com outro desenho não ensina nada novo. O que é novo aqui é o tanto, não o efeito |
| Nome da animação (`girando`) e a amarração com o Estúdio | Não. É vocabulário mais um gesto | Não | | Dentro da construção final | Nomear é um campo de texto. O que importa é a consequência, e ela é dita: a Aula 7 vai procurar esse nome numa listinha |
| A miniatura da galeria fica parada, a Prévia toca | Não é conceito, é operação de interface | Não | | Dentro da construção final | Hoje ocupa uma pergunta de múltipla escolha inteira. É uma frase de instrução |

Onze coisas, duas concretizações. Nove conceitos não ganham cena, e é essa triagem que tira a aula
de 10 para 8 seções. Sete delas vêm da triagem, e a oitava é a divisão que a regra de produto de
20/09/2026 obrigou na `camadas`, para a experiência e a ferramenta não dividirem a mesma seção.

## Diagnóstico do desenho atual

**A cena chega antes do problema, e o próprio curso proíbe isso.** A seção 2 (*Experimente: a pedra
sumiu ou foi coberta?*) põe a cena `layers` como segunda coisa da aula, antes de quem faz a aula traçar
qualquer chama. A justificativa escrita no roteiro é *"o laboratório mostra a causa de um resultado
normal do vetor, antes de a chama cobrir a própria pedra"*, ou seja, a antecipação é intencional. Ela
contraria a regra da casa, que está na referência do curso com todas as letras: explicação nunca vem
antes da necessidade. Pior: a cena começa com a frase "A chama está cobrindo a pedra", e nesse
momento quem faz a aula não tem chama nenhuma.

**A seção de demonstração não tem demonstração.** A seção 5 (*Observe: uma mudança pequena já
anima*) declara intenção `demonstration` e tem um bloco só, um vídeo. É uma das 32 seções do v6 que
prometem demonstrar e entregam narração. E o conteúdo dela é justamente o mais difícil da aula: o
quanto mudar. A narração tenta resolver com opinião ("se ficou doido demais, volta e mexe menos"),
que é exatamente o tipo de coisa que uma cena resolve e uma fala não.

**A mesma regra é testada duas vezes seguidas.** A pergunta da seção 3 (*Quantas vezes usar Uma
camada para trás?*) e a da seção 4 (*Ao duplicar, a nova chama cobriu a pedra. Por quê?*) cobram a
mesma ideia, com dois minutos de distância, e as duas já estariam respondidas por uma cena que a
aula colocou no lugar errado.

**Duas perguntas testam operação de interface, não conceito.** *A miniatura do asteroide na galeria
está parada. Onde conferir se a animação funciona?* e *Você moveu uma cratera no segundo quadro. O
primeiro também precisa mudar?* são instruções disfarçadas de avaliação. A primeira se resolve
abrindo o desenho, a segunda clicando no quadradinho 1.

**O gesto e a dor moram no mesmo clipe.** O `video-chama-externa` vai do "abre o Pinta" até "a pedra
na frente, a chama atrás". Ele contém, sem divisória, o traço da chama, a surpresa de ela nascer por
cima e o conserto pelos botões de ordem. Com tudo junto, a surpresa não chega a ser surpresa.

**A seção 7 mistura três assuntos.** *Dê o nome e confira as duas artes* renomeia a animação, volta
para a galeria, confere dois cartões e ainda explica por que a miniatura não se mexe. São três
movimentos que fecham o mesmo trabalho, e a entrega vem numa seção separada logo em seguida.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** ela precisa ver o meteoro pegando fogo e rolando antes de traçar a primeira
  linha, senão desenha uma forma solta sem destino.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`) · a Prévia do asteroide do Júlio, com as chamas atrás da pedra e a
     pedra rolando. Fala curta, no formato da casa: "No fim da aula você vai ter um meteoro parecido
     com esse aqui. Esse é o do Júlio. O seu vai ter as cores que você escolher e as pontas de fogo
     do jeito que você fizer. Hoje o fogo entra atrás da pedra e a pedra começa a rolar."
     Duração alvo: 25 a 35 segundos.

### Seção 2. Desenhe a chama do lado de onde a pedra veio

- **Intenção:** construção, e termina em dor
- **Ferramenta:** Pinta, por `externalTool`
- **Por que existe:** é a forma nova do dia, e ela nasce por cima da pedra. Essa surpresa é o
  conteúdo da seção seguinte, e precisa fechar aqui, sozinha.
- **Conclui quando:** existe uma forma fechada de fogo, dentro do quadro de 64 × 64, acima da pedra
- **Blocos:**
  1. `video` (`video-chama-externa`) · o passo a passo inteiro executado na tela, do Pinta aberto
     pelo **Abrir meu Pinta** desta seção até o traço pronto: soltar a seleção, a cor de fora no **Preenchimento**, o **Contorno** na casinha
     quadriculada do **Sem cor**, o traço da **Caneta** em cima da pedra sem passar da borda do
     quadro, e o arredondamento só da base com **Editar os pontos** e **Ponto suave**, com as pontas
     ficando retas e desiguais. Fecha com o professor conferindo junto, na frase "olha comigo se
     ficou assim", e com o pedido de pausa para abrir o Pinta. O clipe **termina na chama cobrindo a
     pedra**, sem conserto. **Cortar fora todo o trecho da fileira de botões e do Uma camada para
     trás**, que passa para a seção 3. **Retirar a explicação de meteoro pegando fogo por causa da
     velocidade no espaço**: é desenho estilizado do jogo. Duração alvo: 80 a 95 segundos.
  2. `dialogue` · o fecho da dor, curto e sem conserto: "Olhe o seu desenho. A chama ficou na frente
     da pedra e tapou boa parte dela. Isso acontece com todo mundo, e não é erro seu. Na próxima
     seção você descobre por quê."

**Por que a dor fecha aqui.** A chama nascer por cima é a regra do vetor e reproduz sempre, em
qualquer desenho, em qualquer ordem de traço. Não precisa ser encenada e não pode ser consertada no
mesmo fôlego, senão vira um detalhe de um clipe longo.

**Autoconferência no fim do clipe `video-chama-externa`:** "A primeira chama cabe inteira acima da pedra e está na frente dela neste momento? Essa sobreposição é a surpresa que vamos resolver em seguida."

### Seção 3. Quem é desenhada depois fica por cima

- **Intenção:** conceito
- **Sem ferramenta:** `externalTool: null`
- **Por que existe:** a pedra sumiu da vista e quem faz a aula acha que apagou alguma coisa. O conceito é
  a resposta para uma pergunta que ela acabou de fazer sozinha.
- **Conclui quando:** as três metas de `layers` caem e a pergunta final é respondida
- **Blocos:**
  1. `interactive` · cena `layers`, "Quem fica na frente?", em modo experimentação, com a lista no
     modo do painel **Camadas** do Pinta (a de cima é a que aparece na frente). Elenco: personagem
     `pedra`, cenário `chama`. Cenário do palco: `meu-jeito`.

**Por que a seção ficou só com a cena.** Pela regra de produto de 20/09/2026, ferramenta de criação e
experiência não dividem a mesma seção. Aqui quem faz a aula precisa **mesmo** abrir o Pinta, porque o
conserto acontece no desenho dela, então o caminho foi dividir, e não tirar o `externalTool`. Fica a
experiência sozinha, e o gesto passa para a seção 4, que leva o `externalTool: "pinta"` e o clipe que
já existia.

### Seção 4. Traga a pedra de volta para a frente

- **Intenção:** construção
- **Ferramenta:** Pinta, por `externalTool`
- **Por que existe:** a cena acabou de mostrar que nada foi apagado, só reordenado, e é isso que
  autoriza quem faz a aula a apertar um botão que faz a chama "sumir" sem medo. Agora ela faz no desenho
  dela.
- **Conclui quando:** 90% do clipe assistido, com a pedra aparecendo inteira na frente da chama no
  desenho dela
- **Blocos:**
  1. `video` (`video-uma-camada-para-tras`) · o gesto, extraído da cauda do clipe de hoje: a fileira
     de botões que aparece embaixo da barra com o nome do desenho quando há forma escolhida, o
     terceiro botão dela, o **Uma camada para trás**, e o critério de parada. **Substituir a
     contagem de cliques por critério visual:** "clique e olhe a pedra. Continue clicando até ela
     aparecer inteira na frente. O número de cliques depende de quantas formas você já tem no
     desenho, então quem manda parar é a pedra, não a conta." Se a fileira sumir, clicar na chama com
     a ferramenta **Selecionar** traz ela de volta. Duração alvo: 30 a 40 segundos.

**A experiência vem antes, a ferramenta depois.** O conceito prepara o gesto: ela entende a ordem das
formas e só então mexe nela. E a seção da ferramenta já vem com o vídeo que a segunda regra do dia
exige, sem precisar gravar nada novo.

**Pausa antes da conferência:** abrir o Pinta pelo botão da seção, fazer o gesto na aba da ferramenta e voltar à aula.

**Autoconferência no fim do clipe `video-uma-camada-para-tras`:** "Agora a pedra aparece inteira na frente da chama, e a chama continua visível atrás? Pare de clicar quando a imagem ficar assim."

### Seção 5. Faça o fogo em camadas de cor

- **Intenção:** construção
- **Ferramenta:** Pinta, por `externalTool`
- **Por que existe:** é a aplicação imediata da regra que ela acabou de entender, com um gesto novo
  (duplicar) e um resultado bonito. Duas chamas fecham o trabalho.
- **Conclui quando:** existe uma segunda chama, menor e mais clara, por dentro da primeira, com a
  pedra na frente das duas
- **Blocos:**
  1. `video` (`video-chama-interna`) · o gesto inteiro do Júlio, agora com cada passo executado na
     tela: clicar na chama com o **Selecionar**, duplicar por Control e C mais Control e V ou pelo
     **Duplicar a seleção**, ver a cópia nascer um pouco para baixo e para a direita já escolhida,
     clarear no **Preenchimento**, encolher pelo quadradinho do canto, encaixar em cima da primeira
     encostada na pedra e mandar para trás até a pedra reaparecer. Fecha com a conferência junto, o
     socorro do Control e Z para quando a chama de dentro some atrás da de fora, e o pedido de pausa.
     **Encurtar:** a explicação de por que a cópia nasce no topo sai, porque a seção 3 já resolveu.
     Fica a frase de reconhecimento: "e ela nasceu na frente de tudo, igual à primeira. Você já sabe
     o que fazer." A terceira chama do Júlio entra como variação de 5 segundos, sem virar tarefa.
     Duração alvo: 75 a 90 segundos.
  2. `dialogue` · critério de conferência, com a ressalva de gosto: "Duas chamas já deixam o fogo
     bonito. O Júlio fez três no dele, e o seu pode ter duas ou três. O que não muda é a ordem das
     cores: a mais escura por fora, a mais clara por dentro. Antes de seguir, confira se a pedra está
     na frente de todas as chamas e se elas estão encostadas umas nas outras, sem buraco no meio."

**Autoconferência no fim do clipe `video-chama-interna`:** "A chama de dentro é menor e mais clara, a borda da de fora aparece e a pedra continua na frente das duas?"

### Seção 6. Dois quadros, e o tanto que muda

- **Intenção:** conceito
- **Sem ferramenta:** `externalTool: null`
- **Por que existe:** é o conceito central do dia e hoje não tem dono. Sem ele, quem faz a aula ou mexe de
  menos e a pedra fica parada, ou mexe de mais e a pedra pula.
- **Conclui quando:** as três metas de `motion-amount` caem e a pergunta final é respondida
- **Blocos:**
  1. `interactive` · cena `motion-amount`, "O tanto que muda", já construída e descrita abaixo.
     Elenco: personagem `pedra`. Cenário do palco: `meu-jeito`. Metas declaradas: `no-change`,
     `local-move`, `too-much`.

**Não tem vídeo, de propósito.** O clipe de hoje (`video-mudanca-demo`) narra um critério que só
funciona vendo: a cena mostra os dois quadros parados, a Prévia rodando ao lado e o efeito de cada
valor em tempo real. A parte do clipe que é gesto (mover uma cratera, editar uma ponta) passa para a
seção 7, onde ela é usada.

**Por que o `externalTool` saiu, em vez de a seção ser dividida.** A cena tem o palco dela: dois
quadros próprios, a Prévia própria e dois controles. Nada aqui acontece no desenho dela. O único
gesto de ferramenta que morava nesta seção era o balão do **Duplicar quadro**, e ele foi para a seção
7, onde o `video-quadro-2` já mostra esse clique na tela. Dividir criaria uma seção de ferramenta com
um clique só, que pediria um clipe novo para repetir o começo do clipe seguinte.

### Seção 7. Duplique o quadro e mude as crateras e as pontas do fogo

- **Intenção:** construção
- **Ferramenta:** Pinta, por `externalTool`
- **Por que existe:** é a vitória do dia. A pedra dela começa a rolar, e ela já sabe quanto mexer.
- **Conclui quando:** o segundo quadro tem alterações locais intencionais, o corpo da pedra continua
  no mesmo lugar, e a Prévia mostra a pedra rolando
- **Blocos:**
  1. `dialogue` (`fala-duplicar-quadro`) · o gesto que cria o segundo quadro, em três frases, vindo
     da seção 5 de hoje: "Olhe a faixa no rodapé do editor, onde aparece o seu meteoro e, embaixo do
     nome, o **1 quadro**. Na ponta direita dessa linha tem a fileira de botõezinhos, a mesma da Aula
     3. Clique no **Duplicar quadro**. Nasceu o segundo, igualzinho, com a pedra, as crateras e as
     chamas, e o Pinta já levou você para ele: o quadradinho aceso é o da direita."
  2. `video` (`video-quadro-2`) · funde o gesto que estava em `video-mudanca-demo` com o
     `video-animar-pedra`. As três mudanças possíveis passam a ser executadas na tela, uma a uma,
     com a fala deixando claro que duas já bastam e que quem escolhe é ela: mover uma cratera com o
     **Selecionar**, apagar uma cratera pelo **Apagar a seleção** (dizendo a razão, que é a cratera
     que passa para trás quando a pedra rola de verdade) e mexer no fogo pelo **Editar os pontos**,
     com a Prévia ao lado. Fecha com a conferência junto dos dois quadros e o pedido de pausa.
     **Retirar a fala do critério de parada** ("se ficou doido demais, volta e mexe menos"), que a
     cena da seção 6 já resolveu com a mão dela. **Avisar o efeito real:** trocar de quadro solta a
     seleção, então escolher a cratera ou a chama de novo faz parte do gesto.
     Duração alvo: 85 a 100 segundos.
  3. `dialogue` · a conferência que hoje é pergunta de múltipla escolha, transformada em gesto:
     "Clique no primeiro quadradinho e depois no segundo, olhando os dois com calma. A cratera que
     você apagou continua lá no primeiro, inteirinha, porque cada quadro guarda as formas dele. O que
     tem que estar diferente é só o que você quis mudar. Arrume o que mudou sem querer com o
     **Desfazer**, Control e Z."

**Autoconferência no fim do clipe `video-quadro-2`:** "Na Prévia, a pedra e o fogo mudam entre dois quadros sem o corpo da pedra saltar de lugar ou sair da borda?"

### Seção 8. Batize a animação, confira as duas artes e envie

- **Intenção:** construção, entrega e fechamento
- **Ferramenta:** Pinta, por `externalTool`
- **Por que existe:** fecha o trabalho das quatro aulas de desenho e prepara o nome que a Aula 7 vai
  procurar numa listinha do Estúdio.
- **Conclui quando:** a animação se chama `girando`, os dois desenhos são enviados e as duas
  perguntas do quiz são respondidas
- **Blocos:**
  1. `dialogue` · "Na mesma fileira de botõezinhos, depois de um risquinho, tem o **Renomear
     animação**. Clique nele, apague o `parado`, escreva `girando`, tudo em letra minúscula, e clique
     no botão **Renomear**. O nome novo aparece na linha da faixa e embaixo da Prévia. Guarde este
     nome: daqui a duas aulas, quando o seu asteroide entrar no jogo, vai aparecer uma listinha no
     Estúdio com o nome das suas animações. Uma vai estar escrita `voando`, que é a da nave. A outra
     vai estar escrita `girando`, que é a desta pedra."
  2. `video` (`video-nome-girando`) · o gesto de renomear e a volta para a galeria pela seta apontando
     para a esquerda, na ponta esquerda da barra de cima. **Manter a amarração com o Estúdio**, que é
     o melhor momento do curso inteiro. Duração alvo: 30 a 40 segundos.
  3. `dialogue` · a conferência que hoje é pergunta de múltipla escolha, transformada em instrução:
     "Na galeria estão os seus dois cartões, a nave e o asteroide. O cartão mostra um quadro parado.
     Para ver a animação, abra o desenho e olhe a **Prévia**, na coluna da direita: ela já está
     rodando. Confira os dois: a nave com a animação `voando`, dois quadros, e o asteroide com a
     animação `girando`, dois quadros."
  4. `dialogue` (`fala-enviar-as-duas-artes`) · o lembrete curto do envio, na hora de usar a
     galeria: "Escolha a nave e o asteroide na galeria do Pinta e envie os dois juntos. Espere
     aparecer **Guardado na sua conta**, escolha a criação na lista e envie ao professor. Se ela
     ainda não estiver na lista, confira o salvamento e carregue a lista de novo."
  5. `studio` · entrega pela galeria do Pinta, mínimo e máximo 2 desenhos, nave e asteroide, com os
     critérios de revisão do professor já definidos no roteiro atual.
  6. `video` (`video-fecho-v6`) · agora em três partes. Abre com a conferência junto das duas artes,
     cartão por cartão (nave 32 × 32 com `voando`, asteroide 64 × 64 com `girando`, pedra e crateras
     na frente das chamas nos dois quadros, mudanças locais no segundo quadro), segue com o envio
     executado na tela e só então vem o fecho: "Agora você tem duas artes animadas: a nave em pixel
     art e o asteroide em vetor. No vetor você mexeu em formas e em pontos. Na nave você mexeu em
     quadradinhos. A pedra ficou na frente das chamas porque você cuidou da ordem, e ela rola porque
     você mexeu pouco, no lugar certo. Na próxima aula as duas artes saem do Pinta e entram no jogo."
     Duração alvo: 60 a 75 segundos.
  7. `quiz` · as duas perguntas atuais, mantidas. As duas são aplicação em situação nova, não
     repetição do que já foi conferido.

**Junta três seções de hoje.** Renomear, conferir a galeria e enviar formam um movimento só, o de
fechar a arte e mandar. A pergunta sobre a miniatura vira a instrução do bloco 3.

## Experiências e demonstrações desta aula

### 1. `layers` · Quem fica na frente? · **EXISTE, PRECISA DE AJUSTE**

- **Situação:** a cena é exatamente a certa para o conceito, e o elenco já está configurado (`hero`
  vira `pedra`, `scenery` vira `chama`, cenário `meu-jeito`), com a lista no modo `camadas`, que troca
  a ordem de leitura para a do painel **Camadas** do Pinta. O problema não é a cena, é onde ela está.
- **Ajuste 1, de posição:** sai da seção 2 e vai para a seção 3, **depois** de a chama nascer cobrindo
  a pedra. A instrução de abertura ("A chama está cobrindo a pedra") passa a ser verdade no desenho
  dela na hora em que ela lê.
- **Ajuste 2, de rótulo. Conferido no código, e a resposta é metade e metade.** Com `pilha:
  "camadas"` o motor troca sozinho os **pedidos** das três metas e a **escada de pistas**, e os
  textos que ele usa já falam "uma camada para trás" e "uma camada para a frente", como os botões do
  Pinta. O que ele **não** troca é o **rótulo**: a `back-in-front` continuava dizendo "No jogo, quem
  é desenhado por último fica na frente", e esta aula acontece no Pinta, sem jogo nenhum na tela.
  Como o motor aceita `setup.goalCopy` justamente para isso, o bloco passa a declarar o rótulo dela:
  "A de cima na lista Camadas é a que aparece na frente". Os outros dois rótulos ficam como estão,
  porque o elenco já os veste de pedra e chama.
- **Elenco:** personagem `pedra` (f), cenário `chama` (f). **Cenário do palco:** `meu-jeito`.
- **Metas declaradas no manifesto:** `front`, `covered`, `back-in-front`, as três de fábrica.

### 2. `motion-amount` · O tanto que muda · **CONSTRUÍDA**

- **Id no catálogo:** `motion-amount` · **grupo:** `art`
- **Título visível:** O tanto que muda
- **O conceito abstrato:** entre dois quadros, o quanto um detalhe se desloca decide se o olho vê
  parado, movimento ou tremedeira, e quem tem que ficar no lugar é o corpo.
- **Tipo:** experimentação. A relação tem botão e dá para escrever a frase inteira: quando eu aumento
  o quanto a cratera anda, o desenho passa de parado para rolando; quando eu aumento o quanto a pedra
  inteira anda, ele passa de rolando para pulando.
- **O que quem faz a aula manipula:**
  - **O tanto que a cratera anda:** 0 a 12, de 1 em 1.
  - **O tanto que a pedra inteira anda:** 0 a 12, de 1 em 1.
  - A **Prévia**, que toca sozinha a 8 por segundo ao lado dos dois quadros parados, com um botão de
    parar e voltar a tocar.
- **Como o palco começa:** os dois quadros lado a lado, iguais, com a pedra, três crateras e uma
  chama. A Prévia tocando e parecendo uma imagem parada. Os dois controles em 0.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `no-change` | "Os dois quadros iguais deixam a Prévia parada" | "Deixe os dois controles em 0 e olhe a Prévia." |
  | `local-move` | "A cratera andando um pouco já faz a pedra parecer que rola" | "Deixe o tanto da pedra inteira em 0 e ponha o da cratera entre 3 e 6." |
  | `too-much` | "Com a pedra inteira andando muito, o desenho pula em vez de rolar" | "Ponha o tanto que a pedra inteira anda em 10 ou mais." |
- **Pistas:**
  1. "Os dois quadros estão iguais. Olhe a Prévia e depois mexa em um controle só."
  2. "Deixe a pedra inteira parada e mexa só na cratera. Comece em 3."
  3. "Agora mexa no tanto que a pedra inteira anda e olhe a Prévia de novo."
- **Palpite antes de abrir:** "Os dois quadros são iguais. O que a Prévia mostra?"
  - Uma pedra parada ✓
  - Uma pedra girando
- **Pergunta depois de descobrir (conta para concluir):** "Você quer que a sua pedra pareça rolando.
  O que muda no segundo quadro?"
  - Uma cratera e uma ponta do fogo, um pouquinho ✓
  - A pedra inteira, para um canto bem diferente
- **Explicação ao acertar:** "O olho lê rolagem quando o corpo fica no lugar e os detalhes andam um
  pouco. Quando o corpo inteiro muda de lugar, o olho lê um pulo."
- **Frase de sucesso:** "O corpo fica parado e os detalhes andam um pouco. É esse o tanto que faz a
  pedra rolar."
- **Onde mais serve:** Corre Dino, na animação de correr, que também é de dois quadros com o corpo
  parado e as pernas trocando. Desafio do Primeiro Jogo, no fogo da nave entre pequeno e grande. Meu
  Jeito Aula 3, onde a mesma relação aparece pela primeira vez e hoje só tem a cena `frames`, que
  mostra o efeito e não o tanto. É a cena que fecha o buraco de animação em três cursos.
- **Por que não serve nenhuma das cenas de `art` que já existem:**
  - `frames` manipula qual quadro aparece, a prévia tocando e a velocidade dela. Ela responde "dois
    desenhos viram movimento", que é a pergunta da Aula 3, e não tem nenhum controle de deslocamento.
  - `onion-skin` chega perto, porque manipula o tamanho do fogo no quadro 2 comparando com o quadro
    1. Mas o foco dela é o fantasma como guia de alinhamento, e este curso liga o fantasma na Aula 3.
    Trazer ela para cá repetiria o palco da Aula 3 com o foco errado.
  - `symmetry` e `pixel-vector` são de outro assunto.
- **Ações no motor, conferidas no código:** o controle de deslocamento por peça saiu como `nudge`,
  com `piece` em `crater` ou `body` e `amount` de 0 a 12, que é a faixa que esta especificação
  pedia. A prévia de dois quadros com velocidade já existia (`play` e `rate`, de `frames`).
- **O que o catálogo traz, comparado com esta especificação:** título, instrução, o que quem faz a aula
  manipula, frase de sucesso, pergunta extra, as três metas com rótulo e pedido e as três pistas
  entraram palavra por palavra. Nenhuma divergência.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|
| `video-abertura` | o meteoro do Júlio pegando fogo e rolando na Prévia | `video-abertura-v6` | 25 a 35 s | fala sim, com a fórmula "o seu vai ser o seu" |
| `video-chama-externa` | abrir o Pinta, soltar a seleção, a cor, Sem cor no Contorno, o traço da Caneta, o Ponto suave só na base, a chama nascendo por cima e a conferência junto | `video-chama-externa`, cortado antes da fileira de botões | 80 a 95 s | fala sim, com dois cortes e o passo a passo executado na tela |
| `video-uma-camada-para-tras` | a fileira de botões da seleção e o Uma camada para trás, com critério visual de parada | cauda do `video-chama-externa` | 70 a 85 s | fala parcial, o número de cliques precisa sair |
| `video-chama-interna` | selecionar, duplicar por Ctrl+C e Ctrl+V ou pelo Duplicar a seleção, clarear, encolher, encaixar, mandar para trás, a conferência junto e o socorro do Ctrl+Z | `video-chama-interna` | 75 a 90 s | fala sim, com a explicação da pilha cortada |
| `video-quadro-2` | Duplicar quadro e as três mudanças possíveis executadas na tela (mover cratera, apagar cratera, editar pontas), com a Prévia ao lado e a conferência junto dos dois quadros | `video-animar-pedra` + `video-mudanca-demo` | 85 a 100 s | funde dois clipes, com o critério de parada cortado |
| `video-nome-girando` | Renomear animação para `girando` e a volta para a galeria | `video-nome-girando` | 30 a 40 s | fala sim, mantendo a amarração com o Estúdio |
| `video-fecho-v6` | a conferência junto das duas artes, o envio executado na tela e o fecho da aula | `video-fecho-v6` | 60 a 75 s | fala nova, com o trecho de entrega novo na frente |

**Saldo:** 7 clipes continuam 7, mas o `video-mudanca-demo` deixa de existir como bloco próprio (o
gesto dele foi para dentro do `video-quadro-2` e o critério dele virou cena) e um clipe curto nasce
do corte do `video-chama-externa`. Os cortes de fala continuam valendo, porque saíram a contagem de cliques,
a explicação repetida da pilha e o critério de parada narrado. Em minutagem, porém, os clipes
crescem: com o fim do texto corrido, o passo a passo e a conferência de cada seção passaram a ser
executados na tela, e o `video-fecho-v6` ganhou na frente a conferência das duas artes e o envio.

**Onde cada clipe mora, depois da divisão da `camadas`:** `video-abertura` na seção 1,
`video-chama-externa` na 2, `video-uma-camada-para-tras` na 4 (era a 3, junto com a cena),
`video-chama-interna` na 5, `video-quadro-2` na 7, e `video-nome-girando` mais `video-fecho-v6` na 8.
As seções 3 e 6 são as duas de conceito e não têm clipe, porque também não têm ferramenta.

## Estado da importação

O manifesto `aulas/meu-jeito-aula-05.manifesto.json` passa no validador, com zero avisos. As duas
cenas estão no catálogo, então nada aqui fica esperando construção de cena.

### Seções e critério de conclusão

| # | Chave | Título | Intenção | Ferramenta | Blocos | Conclui com |
|---|---|---|---|---|---|---|
| 1 | `abertura` | O que a gente vai fazer hoje | `presentation` | nenhuma | 1 | `video-abertura` |
| 2 | `chama-externa` | Desenhe a chama do lado de onde a pedra veio | `application` | Pinta | 2 | `video-chama-externa` |
| 3 | `camadas` | Quem é desenhada depois fica por cima | `exploration` | nenhuma | 1 | `experimento-camadas` |
| 4 | `uma-camada-para-tras` | Traga a pedra de volta para a frente | `application` | Pinta | 1 | `video-uma-camada-para-tras` |
| 5 | `chama-interna` | Faça o fogo em camadas de cor | `application` | Pinta | 2 | `video-chama-interna` |
| 6 | `tanto-que-muda` | Dois quadros, e o tanto que muda | `exploration` | nenhuma | 1 | `experimento-tanto-que-muda` |
| 7 | `quadro-2` | Duplique o quadro e mude as crateras e as pontas do fogo | `application` | Pinta | 3 | `video-quadro-2` |
| 8 | `nome-e-entrega` | Batize a animação, confira as duas artes e envie | `delivery` | Pinta | 7 | `entrega-galeria-v6` e `quiz-v6` |

### Regra das duas colunas e as duas regras de produto de 20/09/2026

Duas seções tinham ferramenta e experiência juntas, e cada uma se resolveu de um jeito diferente.

- **`camadas`: dividida.** O conserto acontece no desenho dela, então quem faz a aula precisa mesmo abrir o
  Pinta. A experiência ficou sozinha na seção 3, sem `externalTool`, e o gesto virou a seção 4, com
  `externalTool: "pinta"` e o `video-uma-camada-para-tras`, que já existia. A experiência vem antes,
  a ferramenta depois.
- **`tanto-que-muda`: `externalTool` retirado.** A cena tem palco próprio, com dois quadros, Prévia e
  dois controles. Nada ali acontece no desenho dela. O único gesto de ferramenta da seção era o balão
  do **Duplicar quadro**, que foi para a seção 7, onde o `video-quadro-2` mostra esse clique na tela.

Todas as cinco seções que ficaram com `externalTool` têm vídeo: `video-chama-externa`,
`video-uma-camada-para-tras`, `video-chama-interna`, `video-quadro-2` e, na entrega, o
`video-nome-girando` mais o `video-fecho-v6`. Nenhum clipe novo precisou ser criado.

### Cenas

- `experimento-camadas` declara `front`, `covered` e `back-in-front`, mais o `goalCopy` que troca o
  rótulo da terceira para o vocabulário do painel Camadas. O palpite aponta para `front`.
- `experimento-tanto-que-muda` declara `no-change`, `local-move` e `too-much`, e o palpite aponta
  para `no-change`, que é a meta que desmente o palpite errado.
- Os dois blocos deixaram de escrever pistas próprias e passaram a herdar a escada da cena, que é
  melhor que uma lista copiada: ela pula o degrau cuja meta já caiu, e na `layers` em modo `camadas`
  ela já vem no vocabulário do Pinta.

## Continuidade

- **O que esta aula assume da Aula 4:** o asteroide em vetor, 64 × 64, com a pedra arredondada, as
  crateras copiadas e o espaço de cima livre. E as ferramentas do vetor já conhecidas: Selecionar,
  Editar os pontos, Caneta, Preenchimento, Contorno, Sem cor, Ponto suave, Ctrl+C e Ctrl+V.
- **O que esta aula assume da Aula 3:** a faixa de quadros no rodapé, o Duplicar quadro, a Prévia e o
  Renomear animação. A nave já está com a animação `voando`.
- **O que entrega para a Aula 6:** dois desenhos na galeria do Pinta, cada um com uma animação de
  dois quadros a 8 fps. `nave`, pixel art, 32 × 32, animação `voando`. `asteroide`, vetor, 64 × 64,
  animação `girando`.
- **Valores canônicos que saem daqui:** nome do desenho `asteroide` · nome da animação `girando` ·
  2 quadros · 8 fps · quadro de 64 no vetor, que é o Médio · a pedra e as crateras à frente de todas
  as chamas, nos dois quadros · uma cratera a menos no quadro 2.
- **Campos livres:** as cores do fogo · o formato e a direção das pontas · duas ou três chamas ·
  quantas crateras se movem · quantas pontas mudam. Nenhuma aula posterior cita nada disso como fato.
- **Ponto a conferir antes de gravar:** a animação `voando` da nave precisa estar em 8 fps, e não em
  16. Basta uma passada no controle de velocidade da janela de detalhes para o número da Aula 6 e da
  Aula 7 deixar de bater com a tela.
