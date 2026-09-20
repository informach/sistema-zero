# Corre, Dino! · Aula 4 · O som que escuta o Dino

## Resumo

- **Estado de entrada:** o Dino corre na floresta e pula quando o jogador manda. O projeto tem duas
  áreas. Em `Ao iniciar`: `Preparar o jogo em tela cheia, tela 480 × 270, fundo azul-claro` e
  `Criar dinossauro dino em x 110 y 150 tamanho 64`. Em
  `Enquanto estiver rodando`, um `A cada quadro do jogo` com cinco blocos: `Limpar a tela`,
  `Desenhar fundo de floresta (velocidade 5)`, `Aplicar a gravidade do mundo ao sprite dino`,
  `Controlar o dinossauro dino, força do pulo 14` e `Desenhar o sprite dino`. O jogo é mudo.
- **Vitória do dia:** o pulo ganha som nos três jeitos de pular, inclusive no toque na tela, que é
  como a família vai jogar no celular. E o som para de sair quando não houve pulo nenhum.
- **Seções hoje:** 8 · **Seções propostas:** 7
- **Clipes hoje:** 5 · **Clipes propostos:** 5. A contagem não muda com o redesenho da entrega:
  nenhum clipe entrou nem saiu, o `video-teste-e-envio` é que cresceu.
- **Fecho da entrega:** o passo a passo do teste e a recapitulação saíram do balão e foram para o
  roteiro do `video-teste-e-envio`, e só o gancho da Aula 5 continuou balão. Balão depois da
  ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da direita e
  todo o resto na esquerda.
- **Cenas:** 2, as duas construídas no catálogo. A `once-vs-always` entra com o preset
  `tres-caixas-som`, que acrescenta a caixa `Quando acontecer`, e a `jump-sound` entra com os três
  ajustes de rótulo e de instrumento já aplicados.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| A terceira área, `Quando acontecer` (o evento) | Sim. As outras duas rodam sozinhas e esta fica parada. Uma área que não faz nada até alguém fazer alguma coisa não tem representação na tela | **Sim** | Experimentação, `once-vs-always` com uma caixa a mais | Antes de montar | É a última das três áreas do projeto, e a partir de hoje o mapa mental do curso está completo. Hoje ela é arrastada e explicada por narração, sem nada para a criança comparar |
| O rótulo `Quando apertar a tecla __` e a escolha de `barra de espaço` | Não. É um bloco com uma listinha | Não | | Dentro da montagem | Operação de interface. A cena da área já mostrou o que a área faz |
| `Tocar efeito __` e a escolha do efeito `pulo` | Não. Ela encaixa e ouve | Não | | Dentro da montagem | Ela testa no jogo dela em dois segundos. O efeito ainda é campo de gosto, entre `quicar`, `zunido` e `pulo` |
| **A dor:** o som só sai pela barra de espaço | Não é conceito, é um defeito do jogo dela | **Roda no jogo dela** | Seção de dor, com os quatro testes | Depois de montar o som na tecla, antes de qualquer conserto | A dor reproduz de verdade, e é forte: dois dos três jeitos de pular ficam mudos e o quarto teste toca som sem pulo nenhum |
| Entrada contra evento real (o seu dedo contra o pulo do Dino) | Sim. As duas coisas acontecem quase junto e parecem a mesma | **Sim** | Experimentação, `jump-sound` | Depois da dor, antes de montar o conserto | É o conceito da aula. Na cena ela move a peça de um evento para o outro e vê a relação mudar, coisa que não dá para fazer no jogo dela sem quebrá-lo |
| Som no ar sem pulo (o quarto teste) | Sim, e é o mesmo conceito | **Sim, dentro da mesma cena** | Experimentação, `jump-sound`. O palco mostra o caso, e quem o cobra é a meta `false-sound`, que é da missão da aula. A meta `quiet-air` desenha o mesmo acontecimento e ficou como meta só de caso, fora desta missão | Junto | Separar repetiria o mesmo palco para a mesma ideia |
| Mover um bloco em vez de copiar | Não é conceito, é operação | Não | | Dentro da montagem do conserto | Regra do Estúdio. Copiar deixaria dois sons ativos, e é isso que a pergunta do quiz cobra |
| Apagar o evento que ficou vazio | Não. Ela já fez na Aula 2 | Não | | Dentro da montagem do conserto | Remissão para trás, com a aula citada. O menu mostra "Apagar este bloco", porque o evento está vazio |
| Um som que se vê, para quem não ouve | Não é conceito da criança | Não | | Requisito de produção | Vira exigência de montagem dos clipes e da cena, não seção |
| Apertar contra segurar (`hold-vs-press`) | Sim, mas **não é conteúdo desta aula** | Não | | | Ver a nota abaixo |

Dez coisas, duas concretizações, e as duas reaproveitam cena que já existe. Seis conceitos não
ganham nada, e é essa triagem que tira a aula de 8 para 6 seções.

**Por que `hold-vs-press` fica de fora.** A cena existe e é boa, mas o foco dela é outro: a diferença
entre apertar uma vez e manter apertado. Três motivos para não forçá-la aqui. O primeiro é que o
elenco dela são duas raquetes, vocabulário de outro jogo, e o curso proíbe isso. O segundo é que a
`referencia-blocos-corre-dino.md` registra a distinção evento contra estado de tecla como dívida do
**curso 2, Pong**, justamente porque exige um jogo em que segurar importa. O terceiro é que no Corre,
Dino! o único "segurar" que existe mora dentro do `Controlar o dinossauro`, que abaixa o Dino
enquanto o dedo fica na metade de baixo da área do jogo. A criança nunca monta isso, então não há o
que tornar concreto. O que a Aula 4 ensina é outra coisa: **o pedido contra o acontecimento**, e a
cena dessa ideia é `jump-sound`.

## Diagnóstico do desenho atual

**A dor e a ferramenta moram no mesmo clipe.** A seção *Faça o som acompanhar o pulo* abre com os
quatro testes (espaço toca, seta pra cima é muda, clique na parte de cima é mudo, espaço no ar toca
sem pulo) e emenda o conserto no mesmo clipe, `video-escutar-dino`. É o clipe mais longo da aula e
carrega as duas metades de uma vez. A dor mais bem construída do curso inteiro não chega a fechar
sozinha: a criança nem terminou de contar os quatro resultados e a solução já está sendo arrastada.

**A cena chega antes da dor.** A seção *O dedo e o Dino fazem a mesma coisa?* vem antes da seção que
mostra o defeito rodando. Na ordem de hoje, a criança resolve o caso num palco de laboratório e só
depois descobre que o próprio jogo dela tinha o mesmo problema. Invertido, o laboratório vira a
resposta de uma pergunta que ela acabou de fazer sozinha.

**A terceira área entra como gesto.** A seção *Monte um primeiro evento* é a estreia do
`Quando acontecer`, a última das três áreas do projeto. Ela é arrastada, nomeada e explicada por
narração, e o critério da seção é só a presença do evento da tecla. A ideia que organiza o programa
inteiro do curso passa sem nada para comparar.

**Duas seções são um movimento só.** *Monte um primeiro evento* e *Ligue um som e teste* somam três
encaixes e nenhum conceito novo entre elas. A primeira termina de propósito num evento vazio, que
não faz nada, e a segunda existe só para preencher esse vazio. É uma vitória partida ao meio.

**O fecho ocupa seção inteira para repetir.** *Veja o que você aprendeu* é um clipe de recapitulação
com uma seção só para ele, logo antes de *Confira as ideias de hoje*, que é o quiz. Duas seções para
o mesmo movimento de fechar.

**A aula é sonora e não tem instrumento visível.** A orientação ao professor já pede "não depender
só da audição", mas isso está escrito como nota de produção, não como parte do desenho. Numa aula em
que a dor inteira é ouvir ou não ouvir, quem está sem áudio, num fone quebrado ou numa sala de aula
não tem como acompanhar nada.

**Decisão de produto de 20/09/2026. O som da aula é o `Tocar efeito`, e só ele.** O bloco antigo do
som, que morava em Jogo 2D › Kits prontos › Dino, **não existe mais no Estúdio**. A aula chegou a
oferecer o `Tocar efeito` como troca opcional no fim; a dona decidiu que quem muda é a aula, não o
Estúdio, e a troca virou o caminho principal. Desde o primeiro encaixe, a aula monta o `Tocar efeito`
em Jogo 2D › Som › Efeitos prontos, com a opção `pulo`, que é o que os critérios cobram e o que a
edição `jogo-2d-1.0-documento-2` traz (`sz_g2d_play_fx`). A menção ao bloco aposentado saiu do
manifesto e deste relatório. A gravação original ainda diz "Kit dino" e o nome antigo do bloco, e a
regravação troca as duas coisas. Para quem for auditar isto daqui a três meses: a ausência do bloco
antigo **não é defeito**, é escolha.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** a criança precisa ouvir, no primeiro minuto, a diferença entre o jogo mudo
  de agora e o jogo com som, e precisa ver que o som vale também para o dedo na tela.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`). O Dino pulando em silêncio, depois o mesmo pulo com som, e o mesmo
     som saindo quando o pulo vem do toque na tela. Fala curta: "O seu Dino já corre e já pula, e
     faz tudo isso sem barulho nenhum. Hoje o pulo ganha som. E não é só quando você aperta o
     espaço: vale também pela seta e pelo dedo na tela, que é como alguém vai jogar no celular."
     Duração alvo: 25 a 35 segundos.

### Seção 2. A área que fica esperando

- **Intenção:** conceito (`exploration`)
- **Por que existe:** a terceira área do projeto estreia hoje, e ela é a única que não roda sozinha.
  A cena põe as três lado a lado, com um contador de disparos por ficha, antes de qualquer encaixe.
- **Conclui quando:** as metas `on-event` e `key-fires` da cena caem e a pergunta final da cena é
  respondida
- **Blocos:**
  1. `dialogue` (`fala-tres-areas`). Abertura curta do Zappy, sem vídeo: "O seu projeto tem duas
     áreas. Uma roda uma vez no começo, a outra repete sem parar. Hoje entra a terceira, e ela é
     diferente das duas: ela fica parada esperando. Vamos ver as três lado a lado antes de montar."
  2. `interactive` (`experiencia-tres-areas`). Cena `once-vs-always` no preset `tres-caixas-som`,
     que acrescenta a caixa **Quando acontecer**, a ficha `Tocar efeito · pulo` e o botão de apertar
     a tecla. Elenco: dino. Cenário: `corre-dino`. Metas cobradas: `on-event` e `key-fires`.

**Por que as duas metas, e não uma.** A consolidação em `cenas/CENAS-NOVAS.md` resolveu a
divergência a favor da divisão do Desafio Dia 2: `on-event` prova que a ficha ficou esperando e
`key-fires` prova que a tecla fez a ação acontecer na hora. Um pedido com as duas provas juntas é
grande demais para a faixa, e um mesmo id não pode significar duas coisas em dois cursos. O critério
desta seção cobra as duas.

### Seção 3. Monte a área e pendure o primeiro som

- **Intenção:** construção (`application`)
- **Por que existe:** montar a área, escolher a tecla e pendurar o som é um movimento só, e o
  resultado dele é o primeiro som do jogo dela. Separado em dois, a primeira metade terminaria num
  evento vazio que não faz nada, e terminar numa peça que não faz nada não é vitória.
- **Conclui quando:** existe um `Quando apertar a tecla` com `barra de espaço` dentro do
  `Quando acontecer`, com um `Tocar efeito` encaixado dentro dele
- **Blocos:**
  1. `dialogue` (`fala-montar-evento`). "Em Áreas do projeto, pega o `Quando acontecer` e solta ao
     lado das outras duas, com um espaço. Ela fica ao lado, nunca dentro delas. Depois, em Jogo 2D,
     Controles, Teclado, ações e toque, pega o `Quando apertar a tecla` e encaixa dentro do
     `Quando acontecer`, que está vazio. Ele tem um campo só, uma listinha de teclas: escolhe
     `barra de espaço`."
  2. `dialogue` (`fala-montar-som`). "Agora, em Jogo 2D, Som, Efeitos prontos, pega o `Tocar efeito`
     e encaixa dentro do `Quando apertar a tecla`. Ele já nasce escrito `moeda`, e a lista tem 27
     efeitos. O do nosso jogo é o `pulo`. Se você quiser outro, o `quicar` e o `zunido` também
     combinam com um dinossauro. Agora clica na área do jogo e aperta o espaço."
  3. `video` (`video-evento-e-som`). O gesto das três peças de uma vez, e o teste com áudio de
     verdade. Junta os dois clipes de hoje. A regravação troca "Kit dino" e o nome antigo do som
     pelo caminho e pelo rótulo atuais. Duração alvo: 60 a 70 segundos.
  4. `studio`. Conferência dos dois encaixes.

**Por que a Seção 2 virou duas seções.** A regra das duas colunas do player só deixa uma coisa na
coluna da direita por seção, e a seção desenhada acima tinha duas: a cena nativa e o Estúdio
embarcado. Empilhadas, as duas brigam pelo mesmo espaço. A divisão não muda o desenho didático:
a bancada continua vindo antes da montagem, e a montagem continua sendo um movimento só.

**Nota de montagem, obrigatória.** O clipe mostra uma marquinha na tela a cada som que toca, além do
áudio. Quem está sem som precisa conseguir contar os sons com os olhos.

**O efeito do pulo não vira critério exato.** A fala convida ao `quicar` e ao `zunido`, e a seção
Continuidade declara o efeito como campo livre. Por isso os critérios desta seção, da Seção 6 e da
Seção 7 cobram o bloco `Tocar efeito`, sem travar a opção `pulo`. O manifesto v6 travava
`FX: jump` nos três lugares e reprovava quem aceitava o convite do vídeo.

### Seção 4. Quatro jeitos de pular, um som só

- **Intenção:** dor
- **Por que existe:** o som que ela acabou de montar está quebrado, e o defeito é grande. Esta seção
  existe para ela contar o estrago com as próprias mãos, e fecha sem nenhuma ferramenta à vista.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-quatro-testes`). Os quatro testes, um de cada vez, com pausa entre eles para
     ela fazer junto, e com a marquinha visual a cada som. Primeiro o espaço: pula e toca. Depois a
     seta para cima: pula e fica mudo. Depois o clique na metade de cima da área do jogo: pula e
     fica mudo, e esse é o jeito do celular. Por último, o espaço apertado cinco vezes com o Dino lá
     no alto: cinco sons e nenhum pulo. Fecha na conta, sem prometer conserto: "Em três jeitos de
     pular, o som sai em um. E ainda sai quando não teve pulo nenhum." Duração alvo: 50 a 60
     segundos. Sai deste clipe toda a segunda metade de hoje, que vira a Seção 5.

**Sem cena e sem conserto.** A dor roda no jogo dela em quinze segundos e é forte o bastante para
fechar sozinha. Colocar aqui o laboratório ou o bloco novo seria responder antes de ela perguntar.

### Seção 5. O seu dedo e o pulo do Dino não são a mesma coisa

- **Intenção:** conceito
- **Por que existe:** os quatro testes mostraram o **que** acontece. Esta seção mostra o **porquê**,
  e a cena deixa a criança mudar a peça de evento, comparar e voltar, sem tocar no jogo dela.
- **Conclui quando:** as metas `false-sound`, `silent-jump` e `every-jump` caem, e a pergunta final
  da cena é respondida
- **Blocos:**
  1. `dialogue`. Abertura curta do Zappy, sem vídeo: "O bloco que a gente montou não está escutando
     o Dino. Ele está escutando o seu dedo na barra de espaço. São duas coisas diferentes, e aqui
     dá para ver as duas separadas."
  2. `interactive`. Cena `jump-sound`, "O som acompanha o pulo". Elenco: dino. Cenário: `corre-dino`.
     As metas `quiet-air`, `key-sound` e `tap-sound` foram construídas como metas só de caso, então
     ficam fora da missão desta aula. O palco continua mostrando os três acontecimentos, e a faixa
     cobra só as três que a aula pede.

**Não tem vídeo de propósito.** A cena mostra o contador de pulos e o contador de sons lado a lado,
e deixa a peça de som trocar de evento na frente dela. Nenhuma narração faz isso melhor. O que
sobrou do clipe de hoje virou a Seção 4 e a Seção 6.

### Seção 6. Um som que escuta o Dino

- **Intenção:** construção
- **Por que existe:** é o conserto, e é um bloco novo mais um gesto de mover. A criança já sabe
  exatamente por que está fazendo isso.
- **Conclui quando:** o `Tocar efeito` com `pulo` está dentro do `Quando o sprite dino pular`, existe
  um `Tocar efeito` com `pulo` no projeto e nenhum `Quando apertar a tecla`
- **Blocos:**
  1. `dialogue`. Orientação de montagem: "Em Jogo 2D, Controles, Teclado, ações e toque, do lado
     daquele `Quando apertar a tecla`, está o `Quando o sprite pular`. Pegue ele e solte dentro do
     `Quando acontecer`, logo abaixo do evento da tecla que já está lá. Ele tem um campo, o nome do
     sprite, e já nasce escrito `jogador`: clica e troca para `dino`. Agora o gesto principal.
     Pegue o `Tocar efeito`, que está lá dentro do evento da tecla, arraste e solte dentro do
     `Quando o sprite dino pular`. É o mesmo bloco, arrastado, não copiado: copiar deixaria dois
     sons tocando ao mesmo tempo. O evento da tecla ficou vazio. Clica nele com o botão direito e
     escolhe `Apagar este bloco`, igual você fez na Aula 2 com a borda da tela."
  2. `video` (`video-som-no-pulo`). A segunda metade do clipe de hoje: o bloco novo, a troca do
     nome, o arrasto do som e o apagar. Depois, os quatro testes refeitos, com a marquinha visual:
     espaço com som, seta com som, toque com som, e cinco apertos no ar em silêncio. Duração alvo:
     45 a 55 segundos.
  3. `studio`. Conferência dos três critérios: o som dentro do evento de pulo, um único
     `Tocar efeito` no projeto, e nenhum `Quando apertar a tecla` sobrando.

**A explicação do porquê já foi dada na Seção 5**, então o clipe aqui é gesto e teste. É a maior
economia de minutagem da aula.

### Seção 7. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo soando certo e guarda a ideia do dia em uma frase.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): os três jeitos de pular testados um de cada vez, com a
     marquinha visual a cada som, o quinto teste em silêncio com o Dino no alto, os objetivos
     conferidos um por um e o gesto de enviar na tela. O clipe **passou a fechar com a
     recapitulação do dia**, que era balão: hoje o jogo ganhou uma coisa que não dá para ver, só
     para ouvir, e quem manda tocar o som passou a ser o próprio Dino, na hora exata em que ele sai
     do chão, e é por isso que funciona nos três jeitos de pular. **Entrou pela regra de que toda
     seção com o Estúdio embarcado tem um vídeo mostrando como se faz.** Duração alvo: 50 a 60
     segundos.
  2. `dialogue`. Gancho da Aula 5, o único balão que fica aqui porque é curto e não depende de ter
     acabado de jogar: "Na Aula 5 os cactos começam a vir na sua direção."
  3. `quiz`. As três perguntas atuais, mantidas como estão.
  4. `studio`. Entrega, com os cinco critérios do manifesto atual, **com duas correções**: som
     dentro do `Quando o sprite dino pular`, um único `Tocar efeito` no projeto, nenhum
     `Quando apertar a tecla`, gravidade antes do controle, e o controle antes do desenho.
     A primeira correção é o efeito, que deixa de ser valor exato porque a aula o declara livre.
     A segunda é a força do pulo: o manifesto atual cobra `JUMP: 14`, e a Aula 3 declarou esse campo
     livre numa faixa de 12 a 18. Quem escolheu 16 lá reprovava aqui. O critério passa a cobrar só
     a ordem, gravidade antes do controle e controle antes do desenho. É o último item de
     `blockKeys`.

**Junta três seções de hoje.** A recapitulação volta para o clipe, que é o único lugar onde ela
pode vir depois do teste e do envio.

**Por que a recapitulação saiu do balão.** Balão depois da ferramenta não existe para quem faz a
aula: o Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do
Estúdio" não é um lugar. Nada foi apagado. O passo a passo do teste e a recapitulação foram para o
roteiro do `video-teste-e-envio`, e só o gancho da Aula 5 continuou balão.

## Experiências e demonstrações desta aula

### 1. `once-vs-always` (a caixa `Quando acontecer`) · **CONSTRUÍDA, COM PRESET**

- **Situação:** a cena está no catálogo com parametrização por preset, e o preset desta aula se
  chama **`tres-caixas-som`**: três caixas (`Ao iniciar`, `Enquanto estiver rodando`,
  `Quando acontecer`), quatro fichas (Pintar o fundo, Criar o Dino, Mover o Dino um pouquinho e
  `Tocar efeito · pulo`) e o botão de apertar a tecla. O manifesto declara o preset por extenso.
  Este é o único bloco de cena do Corre, Dino! que precisava de preset próprio, porque as três
  caixas não são o palco de fábrica.
- **O que a criança manipula, a mais que na Aula 2:** o botão **Apertar a tecla** no palco e a
  quarta ficha, `Tocar efeito · pulo`. As três caixas ficam lado a lado, e as fichas podem ir para
  qualquer uma delas.
- **Como o palco começa:** as três caixas vazias, as fichas de lado, o contador de quadros em 0 e um
  contador de disparos por ficha.
- **A prova é duas, e não uma.** O `on-event` único que esta análise propôs, com o pedido "avance
  três quadros sem apertar nada, e só depois aperte a tecla", era duas provas dentro de um pedido. A
  consolidação em `cenas/CENAS-NOVAS.md` dividiu em duas, e é o que o código tem:
  - `on-event`, rótulo "Em `Quando acontecer`, a ação ficou esperando", pedido "Ponha a ficha do
    evento em `Quando acontecer` e avance três quadros sem apertar a tecla."
  - `key-fires`, rótulo "A tecla fez a ação acontecer na hora", pedido "Com a ficha do evento em
    `Quando acontecer`, aperte a tecla."
- **Palpite antes de abrir:** "Você põe `Tocar efeito` com `pulo` dentro de `Quando acontecer` e
  deixa passar cinco quadros sem encostar no teclado. Quantas vezes o som toca?"
  - Nenhuma ✓
  - Cinco, uma por quadro
- **Pergunta depois de descobrir:** "O jogo precisa arrumar a tela uma vez no começo, desenhar sem
  parar, e tocar um som quando alguém aperta uma tecla. Onde vai cada uma dessas três coisas?"
  - Arrumar em `Ao iniciar`, desenhar em `Enquanto estiver rodando`, tocar em `Quando acontecer` ✓
  - As três em `Enquanto estiver rodando`
- **Explicação ao acertar:** "`Ao iniciar` é a arrumação, e acontece uma vez. `Enquanto estiver
  rodando` é o motor, e acontece a cada quadro. `Quando acontecer` fica parada esperando, e só faz
  alguma coisa quando alguma coisa acontece."
- **Frase de sucesso:** a curta, "`Ao iniciar` é uma vez. `Enquanto estiver rodando` é sempre.
  `Quando acontecer` é na hora." A versão proposta aqui ("uma vez a cada vez que acontece") saiu,
  porque lida ao pé da letra se contradiz. O código guarda a frase das três caixas como a frase
  padrão da cena, e é ela que esta aula recebe.
- **Rótulo da ficha:** `Tocar efeito · pulo`, e não "Tocar o som do pulo", porque é o nome que ela
  vai procurar na coluna da esquerda cinco minutos depois. A mesma troca foi feita na `jump-sound`.
- **Elenco/cenário:** dino / `corre-dino`.
- **Metas cobradas nesta aula:** `on-event` e `key-fires`, **declaradas em `setup.goals`**. A
  declaração é obrigatória aqui: as duas são metas só de caso (`soNoCaso`) e ficam fora da missão de
  fábrica, então sem a lista elas nunca cairiam e a aula cobraria de novo o `once` e o `always` que
  a criança já derrubou na Aula 2. Com a lista, aquelas duas chegam com "✓ Você já descobriu isto" e
  a faixa só pede as novas.
- **Onde mais serve:** toda aula que estreia a terceira área, em qualquer curso da trilha. Com a
  caixa nova, a cena passa a cobrir o programa inteiro do Estúdio, e não só metade dele.

### 2. `jump-sound` · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena é exatamente o conceito da aula e tem seis metas bem escritas. O problema é
  de rótulo: ela fala de uma peça chamada "Tocar som", e a peça do Estúdio se chama `Tocar efeito`,
  em Jogo 2D › Som › Efeitos prontos, com a opção `pulo`. A criança vai procurar esse nome na coluna
  da esquerda cinco minutos depois de sair da cena.
- **Ajuste 1, rótulo: feito.** A cena diz `Tocar efeito` na instrução, no campo do que ela manipula,
  nos pedidos das seis metas, nas três pistas, na frase de sucesso e na pergunta final. Mesma troca
  na fala dos dois passos do roteiro de demonstração.
- **Ajuste 2, instrumento visível: feito.** A cena conta os sons com ♪ e tem o contador de pulos ao
  lado, com a mesma marca. A dor desta aula é inteiramente sonora, e sem os dois contadores lado a
  lado quem está sem áudio não conseguiria fazer a cena.
- **Ajuste 3, pergunta extra: feita.** A pergunta antiga repetia a meta `quiet-air`, que a criança
  acabava de derrubar. A de agora usa o argumento mais forte da aula: "E se alguém abrir o seu jogo
  no celular e pular tocando na tela? Qual dos dois eventos toca o som?"
- **Elenco/cenário:** dino / `corre-dino`. A cena já é de Dino e não precisa de elenco novo.
- **Metas cobradas nesta aula:** `false-sound`, `silent-jump`, `every-jump`, que são exatamente as
  três da missão de fábrica. O bloco **não declara `setup.goals`** de propósito, e aqui isso é
  desenho e não esquecimento: as outras três metas da cena (`quiet-air`, `key-sound` e `tap-sound`)
  foram construídas como metas só de caso, justamente para ficarem fora da missão desta aula e
  continuarem disponíveis para outro uso.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O pulo ganha som | o jogo mudo, o jogo com som, e o som pelo toque | `video-abertura-editorial` | 25 a 35 s | fala parcial, tela regravada |
| `video-evento-e-som` | A área nova, a tecla e o som | a área nova, a tecla e o efeito, em um movimento | `video-evento-espaco` + `video-primeiro-som` | 60 a 70 s | funde dois clipes, com troca obrigatória de "Kit dino" e do nome antigo do som pelo caminho e pelo rótulo atuais |
| `video-quatro-testes` | Três jeitos de pular, um som só | os quatro testes, com marca visual a cada som | primeira metade de `video-escutar-dino` | 50 a 60 s | fala sim, tela regravada, sem o conserto |
| `video-som-no-pulo` | Agora quem avisa é o Dino | o bloco novo, o arrasto do som, o apagar e os quatro testes refeitos | segunda metade de `video-escutar-dino` | 45 a 55 s | fala sim, com a explicação do porquê encurtada |
| `video-teste-e-envio` | Ouvir os três pulos e enviar | os três jeitos de pular com som, o quinto teste em silêncio, o gesto de enviar e a recapitulação do dia | novo | 50 a 60 s | não, gravação nova |

**Saldo:** de 5 clipes para 5, com um par fundido, um clipe partido em dois e um clipe novo na
entrega. O clipe de fecho antigo sai, e o fecho passa a ser o fim do clipe da entrega, depois do
teste e do envio. A explicação de por que o som errava saiu da narração e foi para a cena, e a
entrega ganha vídeo pela regra de que toda seção com o Estúdio embarcado tem um vídeo mostrando como
se faz.

## Continuidade

- **Assume da Aula 3:** o Dino criado e desenhado, a gravidade aplicada antes do
  `Controlar o dinossauro dino, força do pulo 14`, e o laço com cinco blocos. Assume também que ela
  já apagou um bloco com o botão direito, na Aula 2, e é essa aula que a narração cita.
- **Entrega para a Aula 5:** as três áreas do projeto montadas. Em `Quando acontecer`, um
  `Quando o sprite dino pular` com um `Tocar efeito` com `pulo` dentro. Nenhum
  `Quando apertar a tecla` no projeto. O laço continua com os mesmos cinco blocos, sem alteração
  nenhuma.
- **Valores canônicos que saem daqui:** efeito do pulo `pulo` · o sprite continua `dino` · o laço
  com cinco blocos.
- **Campos livres:** o efeito do pulo, entre `quicar`, `zunido` e `pulo`. Nenhuma aula posterior cita
  esse efeito por nome.
- **Correção a fazer fora desta aula:** a `referencia-blocos-corre-dino.md` ainda descreve o som
  desta aula pelo nome antigo do bloco, em Kits prontos › Dino, com o `Tocar efeito` como troca
  opcional no fim. A seção 5, a seção 6 (montagem final, no ramo `Quando o sprite dino pular`) e a
  linha da Aula 4 na tabela da seção 7 precisam passar para `Tocar efeito`, em Jogo 2D › Som ›
  Efeitos prontos, que é o que a edição `jogo-2d-1.0-documento-2` já traz.

## Manifesto

Arquivo: `corre-dino-aula-04.manifesto.json`. **7 seções, 17 blocos.** Validado contra o validador
real do core: `OK`, sem avisos.

| Seção | Chave | Intenção | Coluna da direita |
|---|---|---|---|
| 1. O que a gente vai fazer hoje | `abertura` | `presentation` | nenhuma |
| 2. A área que fica esperando | `area-que-espera` | `exploration` | cena `once-vs-always` |
| 3. Monte a área e pendure o primeiro som | `evento-e-som` | `application` | Estúdio |
| 4. Quatro jeitos de pular, um som só | `quatro-testes` | `presentation` | nenhuma |
| 5. O seu dedo e o pulo do Dino não são a mesma coisa | `dedo-e-pulo` | `exploration` | cena `jump-sound` |
| 6. Um som que escuta o Dino | `som-no-pulo` | `application` | Estúdio |
| 7. Teste, envie e fecha | `entrega` | `delivery` | Estúdio |

**Divisão pela regra das duas colunas:** uma, a Seção 2 original, que acumulava a cena
`once-vs-always` e o Estúdio embarcado. Virou as Seções 2 e 3. Nenhuma outra seção acumula.

**Decisões registradas no manifesto:**

- O preset `tres-caixas-som` vai declarado por extenso no bloco da cena, com as metas `on-event` e
  `key-fires`. Sem ele, a cena abriria no preset de fábrica, que é de duas caixas e de nave.
- Os dois campos que a aula declara livres saem dos critérios exatos: o efeito do `Tocar efeito`
  (a fala convida ao `quicar` e ao `zunido`) e a força do pulo herdada da Aula 3 (faixa de 12 a 18).
  O manifesto v6 travava `FX: jump` em três critérios e `JUMP: 14` na entrega.
- A cena `jump-sound` entra com `required: true`. No v6 ela era o único critério da seção e estava
  como opcional.
