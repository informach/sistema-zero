# O Jogo do Meu Jeito · Aula 4 · A sua pedra, feita de pontos

## Resumo

- **Estado de entrada:** a nave dela na galeria do Pinta, animada, com a animação `voando` de dois
  quadros. O jogo continua guardado no Estúdio e não é aberto hoje.
- **Vitória do dia:** a pedra dela pronta na galeria, arredondada, com crateras, e a descoberta de
  que as duas artes dela são feitas de coisas diferentes.
- **Seções hoje:** 10 · **Seções propostas:** 7
- **Clipes hoje:** 7 · **Clipes propostos:** 7 (dois deles na mesma seção, e um bem mais curto)
- **Cenas:** 2 (as duas já existem, uma serve como está e a outra precisa de ajuste)
- **Testes de múltipla escolha hoje:** 4 no meio da aula, mais 2 no quiz final ·
  **Propostos:** 0 no meio da aula, 2 no quiz final (os dois trocados). Um dos quatro vira
  experiência.
- **Textos corridos:** 0. Os 4 que existiam saíram em 20/09/2026 (ver a nota de decisão abaixo)
- **Manifesto:** `aulas/meu-jeito-aula-04.manifesto.json`, 26 blocos e 7 seções

> **Nota de decisão de produto, 20/09/2026.** Nos cursos infantis não existe texto corrido. Os 4
> blocos de texto desta aula saíram do manifesto, e as quatro seções que os tinham já tinham clipe.
> O conteúdo de cada um virou instrução de produção do clipe da própria seção, para ser executado
> e conferido na tela em vez de lido: `orientacao-novo-vetor` foi para o `video-novo-vetor`,
> `orientacao-crateras` foi para o `video-crateras` e `orientacao-entrega-v6` foi para o
> `video-fecho`. O `orientacao-traco` foi o único repartido entre dois clipes, porque a seção da
> pedra tem dois: a parte do traço e a conferência da forma fechada foram para o `video-traco`, e
> a parte do arredondamento, a chamada para ir fazer e a conferência final foram para o
> `video-curvas`, que é o último da seção. Só um dos quatro deixou balão do Zappy, o
> `fala-qual-desenho`, que diz qual dos dois cartões da galeria é a entrega de hoje. Os outros
> três não geraram balão, porque as falas da seção e a narração do clipe já diziam o mesmo.
> Nenhum desses textos era critério de conclusão, então nenhuma regra de conclusão mudou. A chave
> `orientacao-entrega-v6` passou para `retireBlockKeys`, porque ela existia no rascunho v6.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Vetor: marcar pontos e o Pinta desenhar a linha | Não, no gesto. Ela clica seis vezes e a forma nasce | Não, aqui | | Dito no cartão do assistente | O gesto se explica fazendo. O que é abstrato no vetor é a consequência dele de perto, e isso é a cena do fim da aula |
| Médio no vetor é 64 × 64, e no pixel era 32 × 32 | Não. Os dois números estão escritos dentro dos cartões | Não | | Lido antes do clique | É leitura de tela. A pergunta interessante não é qual é o número, é por que a pedra pode ser maior sem custo, e quem responde isso é a cena `pixel-vector`, no fim |
| Preenchimento e Contorno são duas partes com cor própria | **Sim.** Uma forma com dois lugares de cor é novidade, e nada na tela diz qual é qual até alguém mexer | **Sim** | Experimentação (`fill-stroke`, hoje demonstração) | Antes de escolher a cor e traçar, porque a forma nasce já com o estilo escolhido | Se ela mexer no slot errado, a forma nasce errada e ela não sabe por quê. É a única relação com botão da primeira metade da aula |
| Sem cor deixa transparente, não pinta de branco | Sim, e é a mesma ideia | **Sim**, dentro da mesma cena | Experimentação (`fill-stroke`) | Junto | O fundo quadriculado aparecendo por dentro é a prova, e ela só aparece mexendo |
| A Caneta fecha a forma no primeiro ponto | Não. Ela clica no ponto maior e a forma fecha e enche de cor na frente dela | Não | | Dentro do gesto | A tela responde no clique |
| Ponto suave arredonda os pontos escolhidos | Não. Ela arrasta o retângulo, aperta o botão e vê quais cantos viraram curva | Não | | Dentro do gesto | Idem, e a escolha de quantos pontos pegar é dela |
| A caixa tracejada quer dizer escolhida, e o que você fizer agora acontece com ela | Sim, mas o sinal está na tela: a caixa tracejada é visível | Não | | Dito na hora, ancorado na caixa | O gesto de soltar a seleção antes de trocar de cor evita o erro, e a caixa é a evidência. Vira pergunta do quiz, para aplicar numa situação curta |
| Formas que passam da borda do quadro são cortadas | Sim, porque a consequência só aparece quando o desenho vai para o jogo | Não. Vira instrução e pergunta de quiz | | Dito na conferência do traço | Criar cena para isso seria cena de um uso só. A consequência real chega na Aula 5, quando a chama precisa caber no espaço de cima |
| Círculo, achatar pela alça do meio de baixo, Ctrl+C e Ctrl+V | Não. São gestos com resposta imediata | Não | | Dentro do gesto | |
| A borda de pixel e a borda de vetor, de perto | **Sim.** Duas coisas que parecem iguais de longe e são feitas de matérias diferentes, e isso é a razão de o curso ensinar os dois estilos | **Sim** | Experimentação (`pixel-vector`) | No fim, depois de ela ter desenhado nos dois estilos | É a única hora em que ela reconhece as duas bordas como coisas que ela mesma produziu. Antes disso, seria comparar duas palavras |

Dez coisas, três concretizações, em duas cenas. É essa triagem que tira a aula de 10 para 7
seções.

## Diagnóstico do desenho atual

**A única relação com botão da primeira metade da aula está travada numa demonstração sem
controles.** A seção 3 (*Observe: a cor de dentro e a linha de fora*) usa a cena `fill-stroke` no
formato "Ver acontecer", que toca as quatro partes de uma vez. A cena tem três metas no motor
(`only-fill`, `only-stroke` e `both`), três pistas em escada e pergunta extra. Nada disso é
cobrado, e quem faz a aula assiste alguém tirar e pôr as duas cores em vez de tirar e pôr ela mesma.

**Quatro perguntas de múltipla escolha para gestos que a ferramenta responde sozinha.** Ler o número
do cartão, clicar no primeiro ponto para fechar, selecionar só os pontos que quer suavizar e
descobrir que a cor foi para a forma selecionada. Nas quatro, a tela mostra o resultado no segundo
seguinte.

**A melhor dessas quatro perguntas está no lugar errado.** *Você trocou a cor para fazer uma cratera
e a pedra inteira mudou. Por quê?* descreve um erro que a aula **impede** dois passos antes, quando
manda clicar num lugar vazio para soltar a seleção. Perguntar sobre um erro que a instrução evitou
é pedir para quem faz a aula imaginar o que não aconteceu. O lugar dela é o quiz final, onde a função
declarada é aplicar a ideia numa situação curta.

**Cinco seções de aplicação em sequência, sem nada entre elas.** Preparar o quadro, traçar,
arredondar, crateras, e só então a cena. As seções 4 e 5 (*Marque os pontos e feche a pedra* e
*Transforme alguns cantos em curvas*) são duas etapas do mesmo objeto, feitas em seguida, com a
mesma ferramenta na mão em metade do caminho.

**Uma coisa que o v6 acerta e precisa ficar registrada: esta aula não tem dor, e não deve ter.** A
referência do curso explica por quê: ela é aula de desenho, e o contraste entre pixel art e vetor é
comparação, não problema. Encenar dor onde não existe quebra a confiança da aula. A proposta abaixo
não inventa nenhuma.

**E outra: a cena `pixel-vector` está no lugar certo, no fim.** A justificativa do v6 é boa e fica:
agora quem faz a aula já desenhou com os dois estilos, e a comparação usa uma silhueta comum para isolar
a representação.

## Proposta final

> **Nota de arquitetura.** A regra das duas colunas do player manda só uma coisa para a direita por
> seção: ou a cena, ou a ferramenta embarcada. **Nenhuma seção desta aula precisou ser dividida.** As
> duas cenas moram em seções próprias, a 3 e a 6, uma em cada, e o trabalho no Pinta acontece sempre
> na ferramenta externa (`externalTool: "pinta"`), nunca num Pinta embarcado. Sem `workspaceKey` em
> nenhuma seção, a coluna da direita nunca fica disputada. Isso também é o que permite a seção 4
> guardar dois clipes: vídeo é conteúdo da esquerda, e dois clipes numa seção não brigam por espaço
> com ninguém.
>
> **Duas consequências no texto das falas.** Primeira: a fala do Zappy tem limite de 400 caracteres,
> então as instruções longas das seções 2, 4 e 5 viraram duas ou três falas seguidas. Elas ficam na
> mesma coluna e na mesma ordem, e são lidas como uma fala só. Segunda: a abertura da seção 6 não
> pode dizer "aproxima as duas pedras aqui embaixo", porque acima de 1080 px de coluna a cena fica ao
> lado, e não embaixo. A fala passa a dizer "da bancada desta seção".

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** quem faz a aula precisa ver a pedra pronta e ouvir que hoje ela desenha de um jeito
  completamente diferente do de ontem.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "A pedra do Júlio, feita de pontos"). A pedra do Júlio pronta, com curvas e crateras, e a fórmula do
     modelo de autoria. Mais o que a aula faz: marcar pontos, arredondar, pôr crateras, e no fim
     comparar a borda desta pedra com a borda da nave de pixel. Duração alvo: 25 a 35 segundos.

### Seção 2. Prepare o quadro do asteroide

- **Intenção:** construção
- **Por que existe:** o assistente é uma ação completa, e é aqui que os quatro valores que o jogo vai
  usar na Aula 7 são escolhidos.
- **Conclui quando:** 90% do clipe assistido, com o desenho `asteroide` aberto em vetor, Personagem,
  64 × 64
- **Blocos:**
  1. `dialogue` (`fala-novo-vetor`). "Clica no botão Abrir meu Pinta desta seção: ele abre o Pinta
     em outra aba. A sua galeria não está mais vazia: o cartão da nave está lá. Clica no Criar novo.
     Hoje as respostas são outras. Em Como você quer desenhar, clica no Vetor. Em O que você quer
     criar, clica em Personagem."
     **A fala abre a ferramenta pelo botão da seção, e não pelo menu da esquerda**, pelo mesmo
     motivo da Aula 2: dentro de uma aula o menu começa recolhido, e o Pinta é filho de Criar. A
     regra inteira está na nota de decisão de plataforma de `meu-jeito-aula-01.md`.
  2. `dialogue` (`fala-tamanho-vetor`). "Em Qual o tamanho, olha os números antes de clicar, porque
     os tamanhos do vetor não são os mesmos do pixel art: aqui o Pequeno é 32 por 32 e o Médio é 64
     por 64. Clica no Médio. Num quadro maior fica mais fácil pegar nos pontinhos com o mouse, e
     daqui a pouco você vai ver por que isso não custa nada."
  3. `dialogue` (`fala-nome-asteroide`). "Em Qual o nome, escreve asteroide, tudo em letra minúscula
     e sem acento. Clica em Começar a desenhar." As três falas são a mesma instrução, partida pelo
     limite de 400 caracteres do balão.
  4. `video` (`video-novo-vetor`, "Os números mudam no vetor"). **Manter o assistente inteiro** e a leitura dos dois números
     antes do clique. **Corrigir** a explicação de que o quadro maior facilita pegar nos pontos: é
     conveniência do exemplo, não garantia de zoom maior na tela. **Manter** a frase de que essas
     quatro respostas o jogo usa depois. Duração alvo: 55 a 70 segundos. **A chamada para pausar
     e ir fazer e a conferência entram dentro do clipe**: vetor, Personagem, 64 × 64, nome
     `asteroide` minúsculo e sem acento, e o cartão da nave intacto na galeria.

**O texto de orientação saiu daqui, e não virou balão.** O `fala-tamanho-vetor` já avisa que os
tamanhos do vetor não são os mesmos do pixel art e que o número se lê antes de clicar. O atalho
**Abrir meu Pinta** continua onde estava: ele é o `externalTool` da seção, não um bloco.

**A promessa do "por que isso não custa nada" é paga na seção 7**, pela cena. É a amarração da aula.

**Autoconferência no fim do clipe `video-novo-vetor`:** "O novo desenho se chama asteroide, usa vetor em 64 por 64, e a nave continua como outro cartão na galeria?"

### Seção 3. A cor de dentro e a linha de fora

- **Intenção:** conceito
- **Por que existe:** dois lugares de cor para uma forma só é novidade, e mexer no slot errado faz a
  forma nascer errada sem que ela saiba por quê.
- **Conclui quando:** as três metas de `fill-stroke` caem e a pergunta final é respondida
- **Blocos:**
  1. `video` (`video-cores-vetor`, "Os dois quadradinhos no pé da caixa"). Só a localização e o gesto: no pé da caixa de ferramentas tem
     dois quadradinhos, e eles são coisas diferentes. O que é uma plaquinha cheia é o Preenchimento,
     a cor de dentro. O que é uma moldura vazada é o Contorno, a cor da linha em volta. Cada um tem
     área de clique própria, e quando está em Sem cor o símbolo fica quadriculado. Mais o caminho
     opcional do botão redondo com o sinal de mais, o Nova cor, que abre a janela Escolher uma cor:
     primeiro a barra colorida, que escolhe qual é a cor, depois o quadrado, que deixa ela mais
     clara, mais escura ou mais forte, e o Adicionar, que já joga a cor no lugar ativo. **Retirar da
     narração a explicação de o que cada parte faz**, que a cena entrega com ela mexendo. Duração
     alvo: 40 a 50 segundos.
  2. `interactive` (`experiencia-cores`). Cena `fill-stroke`, "A cor de dentro e a linha de fora", **promovida de
     demonstração para experimentação**. Cenário: `meu-jeito`. Sem elenco.

**O clipe e a cena ficam na mesma seção**, porque são as duas metades de uma ideia só: o clipe diz
onde os dois quadradinhos estão, a cena diz o que cada um faz.

### Seção 4. A sua pedra: marque os pontos e arredonde os cantos

- **Intenção:** construção
- **Por que existe:** traçar e arredondar são duas etapas do mesmo objeto, feitas em seguida, e a
  vitória é uma só: a pedra dela de pé, com o formato que ela escolheu.
- **Conclui quando:** os dois clipes assistidos, com a forma fechada, pelo menos uma curva
  intencional e o espaço de cima preservado
- **Blocos:**
  1. `dialogue` (`fala-cor-da-pedra`). "Escolhe o Preenchimento e clica na cor da sua pedra. Se você
     quiser a pedra sem linha em volta, clica no Contorno e pega a primeira casinha do painel, a
     quadriculada, que chama Sem cor."
  2. `dialogue` (`fala-caneta`). "Com a cor pronta, pega a Caneta na caixa de ferramentas, aquela que
     diz clique para marcar os pontos. Cada clique marca um ponto e a Caneta liga um no outro com uma
     linha reta, sem precisar arrastar. Para fechar, clica em cima do primeiro ponto, que fica maior
     que os outros."
  3. `dialogue` (`fala-espaco-de-cima`). "E deixa um espaço vazio acima da pedra, dentro do quadro: é
     ali que o fogo dela vai entrar na próxima aula. O que passar da borda do quadro é cortado quando
     o desenho for para o jogo." As três falas são a mesma instrução, partida pelo limite de 400
     caracteres do balão.
  4. `video` (`video-traco`, "Seis cliques e a pedra fecha"). **Preservar** o clique sem arrastar e o fechamento no primeiro ponto.
     **Acrescentar** a reserva visual de cima, que faltava no original, com a referência de pedra
     ocupando a região de baixo e do meio. **Não dizer** que pedra de verdade nunca tem canto.
     **Cuidado obrigatório de imagem:** desde a decisão de apagar a linha antes de traçar, nenhuma
     imagem pode mostrar a forma recém-fechada com linha escura em volta. Duração alvo: 55 a 70
     segundos.
  5. `dialogue` (`fala-curvas`). "Agora o arredondamento. Vai na caixa de ferramentas e clica no
     Editar os pontos. Apareceram todos os seus pontos. Clica num lugar vazio, segura e arrasta um
     retângulo em volta dos pontos que você quer arredondar. Com os pontos pegos, olha a fileira de
     botões que apareceu embaixo da barra com o nome do desenho, e clica no Ponto suave."
  6. `dialogue` (`fala-cantos-de-proposito`). "Dá para arredondar a pedra inteira ou deixar dois ou
     três cantos afiados de propósito. No fim, olha a sua pedra inteira com calma e vê se sobrou
     algum canto que você não quis, que os pontos ainda estão à vista."
  7. `video` (`video-curvas`, "O retângulo e o Ponto suave"). **Manter** a seleção por retângulo e o Ponto suave. **Chamar de
     retângulo, nunca de laço**, que saiu do curso inteiro em 2026-08-22. **Retirar** a
     generalização de que toda pedra deve ficar completamente arredondada. Duração alvo: 45 a 55
     segundos. **A chamada para pausar e ir fazer e a conferência final entram no fim deste
     clipe**, que é o último da seção: forma fechada e preenchida, pelo menos uma curva feita de
     propósito, e espaço livre acima da pedra dentro do quadro.

**O texto de orientação saiu daqui, e ele foi o único repartido.** Esta seção tem dois clipes,
então a parte do traço foi para o `video-traco` e a parte do arredondamento, mais a chamada para
ir fazer e a conferência final, foi para o `video-curvas`. Não virou balão: o `fala-espaco-de-cima`
e o `fala-cantos-de-proposito` já dizem o compromisso e a liberdade do dia.

**Junta duas seções de hoje e mantém os dois clipes.** O corte entre traçar e arredondar não separa
dois conceitos, separa dois gestos sobre a mesma pedra. Os dois clipes dentro de uma seção preservam
o ritmo, com o "olha o que aconteceu" de cada etapa, sem gastar uma divisória no meio de um objeto
que ainda está nascendo.

**Autoconferência no fim do clipe `video-curvas`:** "A sua pedra é uma forma fechada com pelo menos uma curva e ainda sobra espaço acima dela para a chama? O contorno é escolha sua."

### Seção 5. Crie uma cratera e aproveite a cópia

- **Intenção:** construção
- **Por que existe:** é a etapa que dá personalidade à pedra, e é onde entra a cópia, que ela vai
  usar de novo na Aula 5.
- **Conclui quando:** 90% do clipe assistido, com duas ou mais crateras distinguíveis e dentro da
  pedra
- **Blocos:**
  1. `dialogue` (`fala-soltar-selecao`). "Antes da cor, olha a sua pedra: ela ainda está com a caixa
     tracejada em volta, e isso quer dizer que ela está escolhida. Tudo que você fizer agora acontece
     com ela. Então vai na caixa de ferramentas, clica no Selecionar e dá um clique num lugar vazio,
     fora da pedra. A caixa sumiu."
  2. `dialogue` (`fala-primeira-cratera`). "Agora sim, clica no Preenchimento e escolhe uma cor mais
     escura que a da sua pedra. Pega o Círculo, clica em cima da pedra, segura e arrasta um
     pouquinho. Para achatar, volta no Selecionar, clica na sua cratera e puxa o quadradinho do meio
     de baixo para cima."
  3. `dialogue` (`fala-copiar-cratera`). "Com a cratera escolhida, aperta Control e C e depois
     Control e V, ou usa o Duplicar a seleção na fileira de botões de cima. A cópia nasce um
     pouquinho deslocada e já vem escolhida: arrasta ela para outro lugar e muda o tamanho puxando um
     quadradinho do canto." As três falas são a mesma instrução, partida pelo limite de 400
     caracteres do balão.
  4. `video` (`video-crateras`, "Crateras, e a cópia que você move"). **Preservar** a desseleção antes de trocar a cor, o círculo, as
     alças e a duplicação. **Substituir** "buraco é sempre mais escuro" por escolha de contraste
     desta ilustração. **Não exigir** quatro crateras: o número é o que o Júlio fez na dele.
     **Manter** o critério de ofício, que é o conteúdo real do passo: uma maior, uma menor, uma mais
     para a beirada, porque o que faz parecer natural é ser desigual. Duração alvo: 75 a 90
     segundos. **A chamada para pausar e ir fazer e a conferência entram dentro do clipe**:
     crateras distinguíveis do corpo da pedra, com tamanhos ou lugares diferentes, sem passar da
     borda dela, e a cor original da pedra preservada.

**O texto de orientação saiu daqui, e não virou balão.** O critério de ofício, que o natural é ser
desigual, já está na narração do clipe, e as três falas da seção dão o passo a passo.

**Autoconferência no fim do clipe `video-crateras`:** "As crateras aparecem dentro da pedra, com tamanhos ou lugares diferentes, sem mudar a cor do corpo por acidente?"

### Seção 6. De perto, a borda conta

- **Intenção:** conceito
- **Por que existe:** é a razão de o curso mandar desenhar nos dois estilos, e é a única hora em que
  ela reconhece as duas bordas como coisas que ela mesma produziu.
- **Conclui quando:** as três metas de `pixel-vector` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-bordas`). "Você já desenhou dos dois jeitos: a nave quadradinho por
     quadradinho e a pedra com pontos e formas. De longe as duas parecem a mesma coisa. Aproxima as
     duas pedras da bancada desta seção e olha a borda de cada uma."
  2. `dialogue` (`fala-por-que-64`). Aqui a promessa da seção 2 é paga: "o vetor guarda a forma e
     refaz a curva em qualquer tamanho, então a sua pedra pode nascer em 64 por 64 e encolher no jogo
     sem custo nenhum. Com a nave de pixel o raciocínio não vale, porque ela guarda quadradinhos."
  3. `interactive` (`experimento-bordas`). Cena `pixel-vector`, "De perto, a borda conta". Cenário:
     `meu-jeito`. Sem elenco.

**Sem vídeo, de propósito.** A cena tem uma lupa com quatro paradas e duas bordas lado a lado, e
mostra a diferença melhor do que qualquer narração conseguiria. É também aqui que a promessa da
seção 2 se paga: o vetor guarda a forma e refaz a curva em qualquer tamanho, então a pedra pode
nascer em 64 e encolher no jogo sem custo, e o mesmo raciocínio não valeria para a nave de pixel.

### Seção 7. Confira, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com a pedra pronta e prepara a chama da Aula 5.
- **Conclui quando:** a entrega é enviada, o clipe de fecho é assistido e as duas perguntas do quiz
  são respondidas
- **Blocos:**
  1. `dialogue` (`fala-fecho`). "Antes de enviar, olha a pedra inteira mais uma vez e confere se o
     espaço de cima continua livre dentro do quadro. A nave continua no cartão dela, sem mudança
     nenhuma, e a animação da pedra ainda se chama parado, com um quadro. O movimento dela vem na
     próxima aula."
  2. `dialogue` (`fala-qual-desenho`). "Hoje você envia o cartão do asteroide. A nave fica na
     galeria do jeito que está, sem mudança nenhuma."
  3. `studio` (`entrega-galeria-v6`). Entrega pela galeria do Pinta, uma criação.
  4. `video` (`video-fecho`, "A pedra pronta na sua galeria"). Retoma a pedra pronta e anuncia a
     chama e a animação da Aula 5. Duração alvo: 50 a 65 segundos. **O gesto de entregar acontece
     dentro do clipe**, antes do corte final: esperar o Guardado na sua conta, escolher o cartão do
     asteroide, enviar, e conferir na tela os critérios que antes estavam escritos.
  5. `quiz` (`quiz-v6`). Duas perguntas, as duas trocadas (ver abaixo).

**Junta as duas seções de fechamento de hoje com a entrega.** A recapitulação encosta no quiz
em vez de ocupar seção própria.

**O texto de entrega saiu daqui.** Os critérios viraram parte do `video-fecho`, e a nota de que o
que se avalia é legibilidade e uso das ferramentas ficou lá marcada como instrução para o
professor, fora da narração. O balão ficou com a única coisa que nenhum outro bloco dizia: a
galeria agora tem dois cartões, e só um deles é a entrega de hoje.

## Destino de cada pergunta de múltipla escolha

### No meio da aula (`activity.type: 'question'`)

| Pergunta | Seção de hoje | Destino | Por quê |
|---|---|---|---|
| "Médio sempre significa 32 × 32?" (`conferir-novo-vetor`) | 2. Prepare o quadro do asteroide | **Some** | É leitura de tela, e a instrução já manda ler os dois números antes do clique, com o texto de ajuda pronto para quem repetiu o Médio por memória. A pergunta que vale a pena aqui não é qual é o número, é por que a pedra pode ser maior sem custo, e quem responde isso é a cena `pixel-vector`, na seção 6 |
| "Como fechar a forma com a Caneta?" (`conferir-traco`) | 4. Marque os pontos e feche a pedra | **Some** | É operação de ferramenta com resposta imediata: ela clica no primeiro ponto e a forma fecha e enche de cor na frente dela. A ajuda no ponto da dificuldade já cobre quem não achou o ponto maior |
| "Só alguns cantos devem virar curvas. O que selecionar?" (`conferir-curvas`) | 5. Transforme alguns cantos em curvas | **Some** | Idem. Ela arrasta o retângulo em volta dos pontos que quer e aperta Ponto suave, e vê na hora quais viraram curva. A alternativa errada, "todas as formas da galeria", nem é uma coisa que a tela permita |
| "Você trocou a cor para fazer uma cratera e a pedra inteira mudou. Por quê?" (`conferir-crateras`) | 6. Crie uma cratera e aproveite a cópia | **Vira pergunta do quiz final** | É a melhor das quatro e está no lugar errado: a aula impede esse erro dois passos antes, mandando soltar a seleção. Perguntar sobre um erro que a instrução evitou é pedir para ela imaginar o que não aconteceu. No quiz vira aplicação numa situação curta, que é a função do quiz. E o sinal que sustenta a resposta continua na tela durante a aula: a caixa tracejada |

**Um teste vira pergunta de quiz, três somem.** Nenhum vira experiência, e o motivo é o mesmo nos
quatro: são operações de ferramenta com resposta imediata na tela dela. **Onde esta aula ganha
experiência é na promoção da `fill-stroke`**, que hoje é demonstração sem controle.

**O que substitui a pergunta como critério de conclusão.** O clipe do gesto em 90% mais a lista de
conferência que se lê antes de voltar à aba da aula. A verificação do desenho continua sendo
a entrega da galeria revisada pelo professor, que é o que o manifesto já declara: cor, contorno e
número de crateras são escolhas, e o que se avalia é legibilidade e uso das ferramentas.

### No quiz final

| Pergunta | Destino | Por quê |
|---|---|---|
| "Sem cor no Contorno faz o quê?" | **Trocada** | Passa a ser a meta `only-fill` da cena `fill-stroke`, promovida a experimentação na seção 3, com pergunta própria corrigida no servidor. Repetir no fim é eco |
| "Você copiou uma cratera para outra região. Precisa ficar idêntica à primeira?" | **Trocada** | A alternativa errada, "copiar impede qualquer mudança na nova forma", é falsa de um jeito que ninguém acreditaria: quem faz a aula acabou de arrastar e redimensionar a cópia na frente dela. Distrator que ninguém marca não mede nada |

**Pergunta nova no lugar da primeira:** "Você vai fazer a cratera numa cor mais escura, e a sua
pedra ainda está com a caixa tracejada em volta. O que acontece se você escolher a cor agora?"

- A pedra inteira muda de cor. (correta)
- Nasce uma cratera escura em cima da pedra.

**Devolutiva:** "A caixa tracejada quer dizer que a forma está escolhida, e a cor vai para ela.
Solta a seleção antes de preparar a cor da próxima forma."

**Pergunta nova no lugar da segunda:** "Uma ponta da sua pedra passou da borda de cima do quadro. O
que acontece com ela quando o desenho for para o jogo?"

- O pedaço que passou da borda é cortado. (correta)
- O quadro cresce sozinho para a pedra caber inteira.

**Devolutiva:** "O quadro é o tamanho que você escolheu no começo. É por isso que o espaço de cima
precisa ficar livre, para o fogo da próxima aula caber nele."

A segunda protege, na hora certa, o valor canônico que a Aula 5 depende: o espaço superior.

## Experiências e demonstrações desta aula

### 1. `fill-stroke`. A cor de dentro e a linha de fora · **AJUSTADA NO CATÁLOGO**

- **Situação:** a cena existe inteira, com três pistas em escada, frase de sucesso e pergunta extra.
  **Estado do catálogo em 19/09/2026, depois da construção:** as **três** metas estão lá, na ordem
  `only-fill`, `only-stroke` e `both`. A `only-fill`, que faltava, entrou em primeiro lugar, que é a
  ordem certa, porque a instrução de abertura já manda começar pelo contorno. No v6 a aula usava a
  cena como **demonstração
  no meio do texto**, com um botão Ver acontecer que toca as quatro partes de uma vez, e nenhuma das
  três metas era cobrada.
- **Ajuste 1, e é o principal desta aula:** promover a cena a **experimentação**. Pelo critério do
  briefing, a relação tem botão e a frase se escreve inteira: "quando eu deixo o contorno em Sem
  cor, sobra o preenchimento; quando eu deixo o preenchimento em Sem cor, sobra a linha e dá para
  ver o fundo por dentro". Não há processo no tempo a acompanhar, há duas chaves para virar e um
  estado de volta.
- **Ajuste 2:** a pergunta que conta para concluir passa a ser a que hoje está no quiz final:
  "Deixar o Contorno em Sem cor faz o quê?", com "Tira a linha de fora e mantém o preenchimento"
  (correta) e "Apaga todas as formas do desenho". Assim a ideia é cobrada uma vez só, no lugar onde
  quem faz a aula acabou de sentir.
- **Ajuste 3, de texto:** a instrução de abertura fala em "pedra", e nesta aula quem faz a aula ainda não
  traçou a dela. Trocar por "a pedra desta bancada" ou manter, mas a fala do `dialogue` da seção
  precisa deixar claro que a pedra da cena não é a dela e que nada do que ela fizer ali muda o
  desenho.
- **Elenco e cenário:** cenário `meu-jeito`. Esta cena não desenha personagem do elenco: ela desenha
  a pedra da bancada, com fundo quadriculado atrás para o Sem cor não parecer branco.
- **Metas declaradas no manifesto:** `only-fill`, `only-stroke`, `both`, as três de fábrica.
- **Onde mais serve:** a Aula 5 deste curso, quando a chama externa e a interna recebem cores
  próprias, e qualquer curso futuro de vetor no Pinta. Também vale para o Estúdio, em blocos de
  desenho que separam cor de preenchimento de cor de linha.

### 2. `pixel-vector`. De perto, a borda conta · **AJUSTADA NO CATÁLOGO**

- **Situação:** o formato já é experimentação, com palpite escrito na aula, pergunta final e
  explicação precisa. Nisso é o outro acerto do v6 neste curso, junto com o uso da `symmetry` na
  Aula 2.
- **Estado do catálogo em 19/09/2026, depois da construção:** as **três** metas estão lá, na ordem
  `stairs`, `smooth` e `alike`. As duas primeiras são o que ela vê de perto, com critério em faixa
  (`stairs` em 4 vezes ou mais, `smooth` em 6 ou mais), e `alike` é a conclusão, que só faz sentido
  depois de voltar para longe.
- **Sem ajuste de palco nem de texto.** As outras mudanças são de posição de fala: o "por que 64 na
  pedra" prometido na seção 2 passa a ser respondido aqui, no `dialogue` de abertura da seção, em vez
  de ficar solto. E o `revealOn` do palpite **voltou a apontar para `stairs`**, agora que a meta
  existe: o palpite volta à tela no instante em que a borda de pixel vira degraus, que é o momento em
  que ele tem sentido.
- **Elenco e cenário:** cenário `meu-jeito`. Esta cena não desenha personagem do elenco: ela desenha
  duas pedras com a mesma silhueta, uma de pixel e uma de vetor, sob uma lupa só.
- **Metas declaradas no manifesto:** `stairs`, `smooth`, `alike`, as três de fábrica.
- **Onde mais serve:** a Aula 6, quando a folha da nave é rasterizada e o desenho vira imagem no
  jogo, e qualquer curso que precise justificar a escolha de um estilo.

### Cenas que foram consideradas e não entram

- **`layers`.** A ordem das formas é conceito de vetor e existe nesta aula de forma discreta: cada
  cratera nova nasce por cima da pedra. Mas ninguém precisa mudar a ordem aqui, e o conserto disso é
  um problema que a aula não cria. O lugar dela é a Aula 5, onde a chama precisa ir para trás da
  pedra e se usa o botão Uma camada para trás. Trazer para cá seria explicar antes da
  necessidade.
- **`sheet-vs-sprite`.** É da Aula 6, quando a folha de quadros existe. Citar folha hoje seria
  vocabulário sem uso.
- **`frames` e `onion-skin`.** São da Aula 3 e voltam na Aula 5, quando a pedra ganhar os dois
  quadros. Hoje o asteroide tem um quadro e a animação continua chamada `parado`.
- **`shading`.** A pedra desta aula recebe crateras mais escuras, que é contraste de forma, não
  modelagem de volume por tons. Usar a cena aqui forçaria um foco que não é o da seção.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem (chave v6) | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | A pedra do Júlio, feita de pontos | a pedra pronta e o que a aula faz | `video-abertura-v6` | 25 a 35 s | fala sim, com a fórmula do modelo de autoria |
| `video-novo-vetor` | Os números mudam no vetor | o assistente, com os dois números lidos antes do clique, a pausa para ir fazer e a conferência ao retomar | `video-novo-vetor` mais o texto de orientação | 55 a 70 s | fala sim, com a correção do motivo do 64 |
| `video-cores-vetor` | Os dois quadradinhos no pé da caixa | os dois quadradinhos no pé da caixa e a janela Escolher uma cor | `video-cores-vetor` | 40 a 50 s | fala parcial, bem encurtada |
| `video-traco` | Seis cliques e a pedra fecha | Caneta, cliques, fechamento no primeiro ponto, a reserva de cima e a conferência da forma fechada | `video-traco` mais a primeira metade do texto de orientação | 55 a 70 s | fala sim, com a reserva acrescentada |
| `video-curvas` | O retângulo e o Ponto suave | Editar os pontos, o retângulo, o Ponto suave, a pausa para ir fazer e a conferência que fecha a seção | `video-curvas` mais a segunda metade do texto de orientação | 45 a 55 s | fala sim, sem a generalização |
| `video-crateras` | Crateras, e a cópia que você move | soltar a seleção, Círculo, achatar, Ctrl+C e Ctrl+V, a pausa para ir fazer e a conferência ao retomar | `video-crateras` mais o texto de orientação | 75 a 90 s | fala sim, com a regra do buraco escuro suavizada |
| `video-fecho` | A pedra pronta na sua galeria | o gesto de entregar na tela com a conferência dos critérios, a pedra pronta e o anúncio da chama | `video-fecho-v6` mais o texto de entrega | 50 a 65 s | fala sim |

**Saldo:** os sete clipes continuam sete, mas dois deles passam a viver na mesma seção e o
`video-cores-vetor` encolhe de passo inteiro para localização de botão, porque a explicação do que
cada slot faz foi para a cena. A economia real desta aula é de seções, não de clipes. **Nenhum
clipe novo entrou com a saída do texto corrido:** as quatro seções que tinham texto já tinham
clipe, e a seção da pedra tinha dois, o que permitiu repartir o texto dela entre os dois em vez de
criar um terceiro. A minutagem de cada um pode subir um pouco por causa disso, e as faixas de
duração continuam valendo.

> A primeira linha de cada `plannedVideo` no manifesto é `Título: <nome do vídeo>`, e é a coluna
> "Título do vídeo" desta tabela que manda nela.

## Estado da importação

O manifesto `aulas/meu-jeito-aula-04.manifesto.json` passa no validador, com zero avisos. As duas
cenas existem no catálogo, então nada aqui fica esperando construção de cena.

**As duas cenas foram ajustadas no catálogo, e isso resolve os dois pontos que este relatório
segurava.**

1. A `fill-stroke` tem as **três** metas, `only-fill`, `only-stroke` e `both`. A `only-fill`, que
   faltava, entrou em primeiro lugar, e com ela o rastro sumiu: o roteiro da cena não pula mais do
   passo 1 para o passo 3.
2. A `pixel-vector` tem as **três** metas, `stairs`, `smooth` e `alike`. A frase "serve exatamente
   como está" agora vale também para a lista de metas.

**Duas consequências no manifesto.** Primeira: os dois blocos passam a declarar `setup.goals`, com
as três metas de cada cena. Segunda: o palpite do `experimento-bordas` **recuperou o campo
`revealOn: "stairs"`**, que tinha saído só porque a meta não existia. O palpite volta à tela no
instante em que a borda de pixel vira degraus, e não mais só na conclusão.

Nenhum dos dois blocos escreve pistas próprias: os dois herdam a escada da cena.

## Continuidade

- **O que esta aula assume da anterior:** o desenho `nave` na galeria, com a animação `voando` de
  dois quadros. Ela sabe abrir a galeria, criar um desenho pelo assistente de quatro perguntas, usar
  o desfazer e voltar pela setinha. Ela sabe que os tamanhos aparecem escritos dentro dos cartões,
  porque já leu o 32 × 32 na Aula 2.
- **O que esta aula entrega para a seguinte:** o desenho `asteroide` na galeria, vetor, Personagem,
  64 × 64, com forma fechada, pelo menos uma curva intencional, duas ou mais crateras dentro da
  pedra, e espaço livre acima dela dentro do quadro. A animação dele ainda se chama `parado` e tem
  um quadro. A nave continua exatamente como ficou na Aula 3.
- **Valores canônicos que saem daqui:** estilo vetor · tipo Personagem · tamanho 64 × 64, que é o
  Médio no vetor e precisa de clique porque o primeiro cartão vem marcado · nome do desenho
  `asteroide`, minúsculo e sem acento · espaço reservado acima da pedra, dentro do quadro · formas
  que passam da borda são cortadas na exportação.
- **Campos livres:** a cor da pedra, se ela tem contorno ou não, quantos pontos, quanto de
  arredondamento, quantas crateras e de que tamanho. A Aula 5 não cita nenhum desses como fato, e o
  único compromisso que ela cobra é o espaço de cima.
