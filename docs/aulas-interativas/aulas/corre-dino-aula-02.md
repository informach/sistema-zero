# Corre, Dino! · Aula 2 · O Dino aparece e a floresta passa

## Resumo

- **Estado de entrada:** a área `Ao iniciar` com três blocos, nesta ordem: `Preparar o jogo em
  tela cheia, tela 480 × 270, fundo` · `Mostrar a borda da tela, cor, espessura 4` · `Criar
  dinossauro dino em x 110 y 150 tamanho 64 cor`. O Dino está criado e invisível, e a pergunta
  "cadê o Dino" ficou aberta no fim da Aula 1.
- **Vitória do dia:** o Dino aparece e corre no lugar, na frente de uma floresta que passa. É o
  primeiro quadro desenhado do jogo dela, e é a resposta da pergunta que ficou de ontem.
- **Seções hoje:** 12 · **Seções propostas:** 9 no manifesto, a partir dos 8 movimentos desta
  proposta. O movimento das camadas abre em duas seções, porque a regra das duas colunas admite uma
  única coisa na direita por seção: a cena vira *Quem fica na frente?* e o conserto no projeto vira
  *Quem é desenhado depois fica por cima*.
- **Clipes hoje:** 9 · **Clipes propostos:** 8, sendo um deles fusão de dois e três bem mais curtos.
  A contagem não muda com o redesenho da entrega: nenhum clipe entrou nem saiu, o `video-fecho` é
  que cresceu.
- **Fecho da entrega:** a conferência e o envio saíram do balão e foram para o roteiro do
  `video-fecho`. Balão depois da ferramenta não existe para quem faz a aula, porque o Estúdio fica
  sozinho na coluna da direita e todo o resto na esquerda.
- **Cenas:** 3, todas construídas no catálogo (`draw-loop`, `once-vs-always`, `layers`). A
  `once-vs-always` é a mesma cena do Desafio Dia 1, com o preset de duas caixas deste curso.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| O quadro, e que o jogo é um filme desenhado na hora | Sim. É o conceito raiz do curso inteiro | **Sim** | Experimentação (`draw-loop`) | Depois do clipe do livrinho, antes de montar o motor | Montar o `A cada quadro do jogo` sem saber o que é um quadro é copiar gesto. A cena avança um quadro por vez com o x do Dino à mostra, e ensina isso melhor do que qualquer narração |
| Limpar antes de desenhar | Sim, e tem sintoma, mas um sintoma sutil | **Sim**, dentro da mesma cena do quadro | Experimentação (`draw-loop`, meta `trail`) | Junto com o quadro | As duas ideias são o mesmo ciclo, e separá-las em duas cenas repetiria o palco. No projeto dela o rastro aparece de leve nas perninhas, e isso é confirmação, não descoberta |
| A área `Enquanto estiver rodando`, e o nome "o loop" | Sim. Repetição não tem desenho na tela | **Sim** | Experimentação (`once-vs-always`) | Depois de montar o motor e ver o Dino aparecer | É a primeira vez que a criança tem uma ação em cada área do projeto: `Criar dinossauro` no `Ao iniciar` e `Desenhar o sprite` no motor. Antes disso não existe contraste para manipular |
| Criar é uma vez, desenhar é sempre, e é o mesmo Dino | Sim, e é o engano clássico: "então o jogo cria um Dino novo a cada quadro?" | **Sim**, na mesma cena | Experimentação (`once-vs-always`, meta `both`) | Idem | O quiz de hoje já cobra isso, e hoje nada na aula concretiza. O contador de disparos por ficha responde de uma vez: o criar disparou uma vez, o mover disparou cinco |
| Camadas, a ordem de desenho | Sim. Ordem não se vê nos blocos, só no resultado | **Sim** | Experimentação (`layers`) | Depois da dor no projeto dela, antes do conserto | É a dor real desta aula, e a cena prova o contrafactual (esconder de novo só trocando a ordem) sem estragar o jogo dela |
| O seletor que nasce escrito `jogador` | Não é conceito, é operação | Não | | Dito no campo, uma vez | O `Desenhar o sprite` nasce com um nome de fábrica. A fala avisa que ela abre a listinha e escolhe o nome dela. É o segundo e último lembrete do curso sobre isso |
| A velocidade da floresta | Não. É campo de gosto | Não | | Dita na hora do campo | O bloco nasce 4 e o jogo usa 5, com faixa livre de 2 a 9. Nenhuma aula posterior cita esse número |
| Arrastar leva os blocos de baixo junto | Não é conceito abstrato, é comportamento do Estúdio com sintoma imediato | Não ganha cena, **ganha seção** | Gesto no próprio Estúdio, com vídeo | Na hora de tirar a borda | Ela vê dois blocos irem para a lixeira juntos. Isso não é simulação, é o Estúdio dela. Cena aqui seria redundante |
| O `Ctrl+Z` e o `Apagar este bloco` | Não. São duas ferramentas | Não | | Na mesma seção, na ordem em que salvam alguma coisa | A criança conhece o desfazer no momento em que ele salva o projeto dela, e não como item de lista |
| Olhar a área do jogo e clicar nela | Não é conceito, é operação de interface | Não | | Instrução dentro das seções em que ela precisa | Hoje está espalhado. É instrução, não conteúdo |

Nove coisas, quatro concretizações em três cenas. Cinco não ganham cena nenhuma, e é isso que
permite tirar a aula de 12 para 8 seções sem perder nada.

## Diagnóstico do desenho atual

**Uma seção é um encaixe puro, e é justamente a que deveria carregar o conceito.** A seção 3
(*Monte o motor do jogo*) coloca a área `Enquanto estiver rodando` e um `A cada quadro do jogo`
ainda vazio. Dois gestos, clipe próprio, nenhum conceito concretizado. E o conceito que ela deveria
carregar, o de que uma área roda uma vez e a outra repete sem parar, existe só como frase de
narração.

**Três seções de construção seguidas montam uma pilha só.** As seções 3 (*Monte o motor do jogo*),
4 (*Faça o Dino aparecer*) e 5 (*Limpe antes de desenhar*) são três divisórias no meio de um
movimento contínuo, e **nenhuma das três conclui nada**: no manifesto, `motor`, `primeiro-desenho`
e `limpeza` estão com a lista de conclusão vazia e nenhuma carrega bloco de Estúdio. Os critérios
estão escritos no roteiro e não estão ligados a nada. O mesmo vale para `ordem-certa` e
`retirar-borda`: cinco seções de construção, zero conferências.

**Uma seção declara demonstração e não tem demonstração.** A seção 6 (*O que aconteceu com o
Dino?*) tem intenção `demonstration` e um único bloco, que é um vídeo. Ela conclui com 90% do clipe
assistido. É exatamente o defeito de molde que o projeto está corrigindo.

**A dor foi tirada das mãos da criança.** A mesma seção 6 decidiu que a criança não monta a ordem
errada e só assiste ao exemplo. Isso contraria a regra número 1 do curso, que é montar errado e ver
quebrar, e a própria referência lista essa como a dor modelo da Aula 2. Além do mais, encaixar por
último é o que ela faria por instinto, porque o Estúdio insere no ponto onde ela soltou. O erro
proposital aqui não precisa nem ser difícil de provocar.

**A cena que carrega a dor é opcional.** O bloco `experiencia-camadas`, que é a cena `layers`, está
com `required: false` e é o único critério de conclusão da seção 7 (*Quem fica na frente?*). As
duas coisas não podem valer juntas.

**Conceito e conserto estão em seções diferentes.** A seção 7 descobre a ordem e a seção 8
(*Organize as camadas do seu jogo*) aplica no projeto. É uma ideia só, partida ao meio.

**Decisão de produto de 20/09/2026. A cobrança de acessibilidade saiu desta aula.** A entrega
cobrava um bloco de acessibilidade no `Ao iniciar` que nenhuma seção de nenhuma aula mandava
colocar. A inconsistência era real, e o redesenho tinha resolvido pelo lado errado: devolvendo o
passo à Aula 1. A dona decidiu o contrário. O tema é complexo demais para o primeiro curso da
trilha e não muda nada na tela de quem está aprendendo, então ele sai do curso inteiro e pode virar
um curso bônus depois. **O que saiu daqui:** o critério de projeto na seção de retirar a borda e o
mesmo critério na entrega.

**A fala dos blocos arrastados acompanhou a conta.** A gravação diz "Foram três blocos", o que
valia com a pilha de quatro da Aula 1 restaurada. Com a pilha de três que a Aula 1 entrega agora,
arrastar a borda leva a borda mais o `Criar dinossauro`: **são dois**, e o roteiro do
`video-retirar-borda` foi acertado para dois. Quem for auditar isto daqui a três meses: a contagem
menor **não é defeito**, é consequência da decisão acima.

**Três seções para fechar o dia.** As seções 10, 11 e 12 (*Teste e entregue sua construção*, *Veja
o que você aprendeu* e *Confira as ideias de hoje*) viram uma.

**Uma frase de posição antiga continua espalhada.** A relação entre vídeo e Estúdio muda com a
largura da aula. Por isso, a instrução deve ser sempre "olha a área do jogo", sem "aí embaixo" nem
"ali do lado". A referência do curso registra as versões antigas e precisa ser unificada.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** retoma a pergunta que ficou de ontem e mostra onde a aula chega.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`): abre no projeto dela como ficou ontem, com a telinha e o Dino
     invisível. "Ontem o seu dinossauro foi criado e não apareceu. Hoje ele aparece, começa a
     correr, e ganha uma floresta passando atrás dele." Duração alvo: 20 a 30 segundos.

### Seção 2. O jogo é um filme desenhado na hora

- **Intenção:** conceito
- **Por que existe:** é o conceito raiz do curso inteiro, e ele precisa estar entendido antes de a
  criança encaixar o bloco que faz o ciclo acontecer.
- **Conclui quando:** as três metas de `draw-loop` caem e a pergunta final é respondida
- **Blocos:**
  1. `video` (`video-livrinho`): a analogia do livrinho de folhear, já gravada e excelente. "Cada
     página é um desenho um tiquinho diferente da anterior. Um jogo é um filme que vai sendo
     desenhado na hora, uma página de cada vez. E cada uma dessas páginas tem um nome: quadro."
     **Encurtar o final**, que hoje repete o mesmo conceito em três frases, porque a cena continua
     dali. Duração alvo: 35 a 45 segundos.
  2. `interactive`: cena `draw-loop`, "Por que o desenho se repete". Elenco: Dino. Cenário:
     `corre-dino`. As três metas: sem desenhar de novo a tela não muda, sem limpar os desenhos
     velhos ficam, limpando e desenhando o Dino anda.

### Seção 3. Ligue o motor e faça o Dino aparecer

- **Intenção:** construção
- **Por que existe:** quatro gestos que produzem uma vitória só, e ela é grande: o Dino aparece.
  É a resposta da pergunta da Aula 1, e ela chega cedo na aula, de propósito.
- **Conclui quando:** `A cada quadro do jogo` está dentro de `Enquanto estiver rodando`, com
  `Limpar a tela` e `Desenhar o sprite dino` lá dentro, nessa ordem
- **Blocos:**
  1. `dialogue`: "Em Áreas do projeto, pega o `Enquanto estiver rodando` e solta ao lado do `Ao
     iniciar`, com um espacinho entre os dois. Elas ficam lado a lado, nunca uma dentro da outra.
     Depois, em Jogo 2D, Tempo, Quadros e intervalos, pega o `A cada quadro do jogo` e arrasta para
     dentro do `Enquanto estiver rodando`, que está vazio. Ele vai ser o único bloco lá dentro.
     Agora, em Jogo 2D, Sprites, Criar e trocar aparência, pega o `Desenhar o sprite __` e encaixa
     dentro do `A cada quadro do jogo`, que está vazio. O campo nasce escrito jogador: clica nele,
     abre a listinha com os sprites que existem no seu jogo, e escolhe o dino."
  2. `video` (`video-motor-e-dino`): funde os dois clipes de hoje. O gesto das duas áreas lado a
     lado, o encaixe do `A cada quadro do jogo` e o nome "o loop" dito ali. Depois o
     `Desenhar o sprite`, o seletor aberto, e o Dino aparecendo na área do jogo. Retomar a pergunta
     do fim da Aula 1 na hora em que ele aparece. Duração alvo: 75 a 90 segundos.
  3. `dialogue`: "Chega perto da área do jogo e olha as perninhas dele correndo. Sobra um
     rastrinho, como se ficasse um restinho da perna de antes. É porque ninguém está apagando o
     desenho do quadro anterior. Em Jogo 2D, Desenho e efeitos, Efeitos, pega o `Limpar a tela` e
     encaixa dentro do `A cada quadro do jogo`, logo acima do `Desenhar o sprite dino`. Ele não tem
     campo nenhum."
  4. `video` (`video-limpar-a-tela`): o zoom nas perninhas antes e depois. **Manter o rastro sutil
     e não fabricar um borrão**, porque neste jogo o borrão clássico não acontece. Manter a
     explicação honesta que já está gravada: daqui a pouco a floresta entra e pinta a tela inteira a
     cada quadro, então o `Limpar a tela` quase não vai fazer diferença neste jogo, e ele fica
     mesmo assim, porque nem todo jogo tem um fundo que pinta a tela toda. Duração alvo: 45 a 55
     segundos.
  5. `studio`: conferência dos três blocos e da ordem dentro do quadro.

**Junta três seções de hoje.** As três montavam a mesma pilha, e nenhuma delas concluía nada.
Agora são quatro gestos, uma vitória e uma conferência.

### Seção 4. Criar foi uma vez. Desenhar é sempre.

- **Intenção:** conceito
- **Por que existe:** é a primeira vez que a criança tem uma ação em cada área do projeto, e é aqui
  que nasce o engano de que desenhar a cada quadro estaria criando um Dino novo a cada quadro. O
  quiz de hoje cobra exatamente isso, e nada na aula concretiza.
- **Conclui quando:** as três metas de `once-vs-always` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: "Olha o seu projeto inteiro agora. O `Criar dinossauro` está no `Ao iniciar`, e o
     `Desenhar o sprite dino` está no motor. Quer dizer que o jogo está fazendo um dinossauro novo
     sessenta vezes por segundo? Vem ver."
  2. `interactive`: cena `once-vs-always`, "Uma vez e sempre". Elenco: Dino. Cenário: `corre-dino`.
     Especificação de reuso mais abaixo.

**A cena vem depois da montagem, e a inversão é o conteúdo.** Ela já tem o arranjo certo montado, e
a cena mostra o que aconteceria em cada uma das outras combinações, sem mexer no jogo dela.

### Seção 5. O Dino sumiu

- **Intenção:** dor
- **Por que existe:** a dor da aula é camadas, e ela precisa acontecer no jogo dela, não no
  exemplo do vídeo. Encaixar por último é o que ela faria sozinha, porque o Estúdio insere no ponto
  em que ela soltou.
- **Conclui quando:** `Desenhar fundo de floresta (velocidade 5)` está dentro do `A cada quadro do
  jogo` (a posição ainda não é cobrada, porque ela muda na seção seguinte)
- **Blocos:**
  1. `dialogue`: "Falta a floresta. Em Jogo 2D, Cenários, Fundos, pega o `Desenhar fundo de
     floresta (velocidade __)` e encaixa dentro do `A cada quadro do jogo`, logo abaixo do
     `Desenhar o sprite dino`. Eu vou te pedir para encaixar bem aí, de propósito. A velocidade
     nasce 4, troca por 5. Agora olha a área do jogo."
  2. `video` (`video-floresta-cobre`): o encaixe, a troca do número e o Dino sumindo. **Parar antes
     da explicação e antes do conserto**, como o roteiro de hoje já manda. Terminar na pergunta:
     "Cadê o dino? Ele estava aí agorinha." Duração alvo: 30 a 40 segundos.
  3. `studio`: conferência de que a floresta está no quadro com velocidade 5, marcada como estado
     de agora, não como estado final.

### Seção 6. Quem fica na frente?

- **Intenção:** conceito
- **Por que existe:** a criança acabou de ver o Dino sumir no jogo dela e agora testa a causa, sem
  risco.
- **Conclui quando:** as três metas de `layers` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: a ponte curta que abre a cena, retomando o "cadê o dino" da seção anterior.
  2. `interactive`: cena `layers`, "Quem fica na frente?". Elenco: Dino e floresta. Cenário:
     `corre-dino`. Obrigatória.

### Seção 7. Quem é desenhado depois fica por cima

- **Intenção:** construção
- **Por que existe:** depois de provar o contrafactual na cena, ela arruma a ordem no jogo dela e o
  nome "camadas" entra.
- **Conclui quando:** a ordem dentro do `A cada quadro do jogo` é `Limpar a tela`,
  `Desenhar fundo de floresta`, `Desenhar o sprite dino`
- **Blocos:**
  1. `dialogue`: "Agora arruma a ordem no seu jogo. Arrasta a floresta para o meio, entre o `Limpar
     a tela` e o `Desenhar o sprite dino`. Arrasta mesmo, não copia: copiar deixa duas florestas
     rodando ao mesmo tempo. E isso que você acabou de arrumar tem um nome que quem faz jogo usa:
     camadas. Quem é desenhado depois fica por cima."
  2. `video` (`video-ordem-certa`): o gesto do arraste e a ordem final. Manter a observação de que
     a floresta pinta só o que está dentro da borda e para certinho onde a telinha termina, porque
     é ela que prepara a seção seguinte. Duração alvo: 30 a 40 segundos.
  3. `studio`: conferência da ordem dos três blocos e de que existe uma única floresta.

**Junta duas seções de hoje, e a regra das colunas parte o resultado em duas.** O conceito e o
conserto eram uma ideia só, partida ao meio no v6. Aqui eles voltam a ser um movimento, e o
manifesto os apresenta em duas seções porque a cena e o Estúdio não cabem juntos na coluna da
direita.

### Seção 8. Tire a borda sem derrubar o resto

- **Intenção:** construção
- **Por que existe:** a floresta passou a marcar o limite sozinha, então o instrumento sai. E o
  gesto de tirar ensina duas ferramentas do Estúdio que valem o curso inteiro, no momento em que
  elas salvam o projeto dela.
- **Conclui quando:** `Mostrar a borda da tela` não está mais no projeto, e o `Criar dinossauro
  dino` continua no `Ao iniciar`
- **Blocos:**
  1. `dialogue`: "A borda já fez o trabalho dela: agora é a própria floresta que mostra onde a
     telinha começa e termina. Vamos tirar ela, e no caminho você aprende duas coisas do Estúdio."
  2. `video` (`video-retirar-borda`): arrastar a borda para a lixeira do jeito normal e mostrar os
     dois blocos indo junto, porque quando você arrasta um bloco todos os que estão embaixo dele vêm
     junto. Depois `Ctrl+Z`, e os dois voltam. Depois o botão direito no `Mostrar a borda da tela`,
     o menu aberto, e `Apagar este bloco`: só ele sai e a pilha se fecha sozinha. **O rótulo do menu
     é exatamente "Apagar este bloco"**, e neste curso é sempre esse texto, porque o bloco está
     sozinho. Complementar com a forma de abrir o menu em tela de toque. Duração alvo: 55 a 65
     segundos.
  3. `studio`: conferência da borda retirada e da criação do Dino preservada.

### Seção 9. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com o jogo rodando e guarda as duas ideias grandes de hoje.
- **Conclui quando:** a entrega é enviada e as três perguntas do quiz são respondidas
- **Blocos:**
  1. `video` (`video-fecho`): o clipe passa a levar o fecho inteiro. Abre com o teste e o envio, que
     eram balão: a área do jogo enquadrada com o Dino na frente da floresta e as perninhas correndo,
     a conferência de que ele fica no mesmo lugar e quem passa é a floresta, os objetivos conferidos
     um por um e o envio. Só então a recapitulação de hoje e o gancho da Aula 3. Manter a ilusão de
     movimento no fechamento. **Retirar o convite a brincar com as velocidades 2 e 9** e manter o 5,
     como a orientação de edição já pede. Duração alvo: 45 a 60 segundos.
  2. `quiz`: as três perguntas de hoje, mantidas. Elas já estão boas, e a segunda ("Por que repetir
     o desenho a cada quadro?", com a alternativa errada "Para criar outro Dino a cada quadro")
     passa a ter a cena da seção 4 por trás.
  3. `studio`: entrega, com os seis critérios de hoje: `Desenhar o sprite dino` dentro do `A cada
     quadro do jogo`; `Limpar a tela` antes da floresta; `Desenhar fundo de floresta` com
     velocidade 5 antes do Dino; uma única floresta; a borda retirada; a criação do Dino preservada
     no `Ao iniciar`. É o último item de `blockKeys`.

**Junta três seções de hoje.**

**Por que o balão de conferência saiu.** Balão depois da ferramenta não existe para quem faz a
aula: o Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do
Estúdio" não é um lugar. Nada foi apagado. A conferência e o envio foram para o roteiro do
`video-fecho`, que já levava a recapitulação.

## Experiências e demonstrações desta aula

### 1. `draw-loop` · Por que o desenho se repete · **CONSTRUÍDA, AJUSTE APLICADO**

- **Situação:** a cena é a melhor do catálogo para este conceito e já está marcada como
  obrigatória. Ela entrega o ciclo inteiro: sem redesenhar a tela não muda, sem limpar sobra
  rastro, limpando e desenhando o Dino anda.
- **Ajuste, de metas: feito.** A meta que separa "desenhar" de "desenhar de novo" existe, com o id
  e o texto pedidos:
  - `frozen`, rótulo "Sem desenhar de novo, a tela não muda", pedido "Com o Dino na tela, desenhe só
    no começo, sem limpar a tela, e aperte Avançar 1 quadro."
  - É a mesma meta que o Desafio Dia 1 cobra, então o ajuste serviu aos dois cursos.
- **Elenco/cenário:** Dino, cenário `corre-dino`.
- **Metas cobradas nesta aula:** `frozen`, `trail`, `moving`, que são as três da missão de fábrica.
  O bloco **não declara `setup.goals`** de propósito: sem lista, a cena cobra as três.

### 2. `once-vs-always` · Uma vez e sempre · **CONSTRUÍDA, COM O PRESET DESTE CURSO**

A cena foi especificada na análise do Desafio do Primeiro Jogo, Dia 1, e está no catálogo com
parametrização por preset. Ela **não precisa ser especificada de novo**: o motor, as metas, as
pistas e o formato são os mesmos. O que muda aqui é o elenco e o texto das fichas.

- **Conceito:** o que está em `Ao iniciar` acontece uma vez, no começo. O que está em `Enquanto
  estiver rodando` acontece de novo a cada quadro, sem parar.
- **Tipo:** experimentação. A relação tem botão, porque a variável é **onde** a ação é colocada.
- **Delta para o Corre, Dino!:**
  - As três fichas passam a ser **Pintar o fundo**, **Criar o Dino** e **Mover o Dino um
    pouquinho**.
  - O palpite antes de abrir vira: "Se você põe Mover o Dino em Ao iniciar, o que acontece quando o
    jogo roda?" · "Ele se mexe uma vez e para" ✓ · "Ele se mexe sem parar".
  - A pergunta final vira: "Você quer que o Dino seja criado só no começo e ande o tempo todo. Onde
    vai cada ação?" · "Criar em Ao iniciar, mover em Enquanto estiver rodando" ✓ · "As duas em
    Enquanto estiver rodando".
  - A explicação ao acertar vira: "Ao iniciar é a arrumação: acontece uma vez, no começo. Enquanto
    estiver rodando é o motor: acontece de novo a cada quadro, sem parar. O Dino foi criado uma vez
    e é o mesmo Dino que aparece em todos os quadros."
- **Por que ela cai tão bem aqui:** o contador de disparos por ficha responde sozinho ao engano que
  o quiz de hoje cobra. Com cinco quadros passados, a ficha de criar marca um disparo e a de mover
  marca cinco. A criança vê que existe um Dino só.
- **Elenco/cenário:** Dino, cenário `corre-dino`.
- **Metas cobradas nesta aula:** `once`, `always`, `both`. O bloco **declara só o preset**
  `duas-caixas-dino`, sem lista de metas. O preset já seleciona essas três (`ONCE_GOALS_BY_PRESET`
  em `packages/core/src/learning/scene/presets.ts`) e já produz a frase de sucesso das duas caixas,
  conferido no motor. Declarar a lista seria repetir o que o preset garante.
- **Por que ela não entrou na Aula 1:** o curso tem uma regra dura de só explicar o que vai ser
  usado agora, e a Aula 1 usa uma área só. A cena compara as duas, então na Aula 1 ela apresentaria
  o `Enquanto estiver rodando` uma aula inteira antes de ele existir no projeto, e a criança não
  teria nada no jogo dela para ancorar o contraste. Aqui ela tem: uma ação em cada área.
- **Onde mais serve:** é a cena com maior reuso do catálogo. Ela abre o Dia 1 do Desafio do Primeiro
  Jogo e serve a todo curso base de nível novo. Dentro deste curso, a **Aula 4** amplia a mesma cena
  com uma terceira caixa, o `Quando acontecer`, e duas metas só de caso (`on-event` e `key-fires`),
  no dia em que a terceira área do projeto estreia. Quer dizer: a cena é construída uma vez, entra
  aqui com duas caixas e volta duas aulas depois com três.

### 3. `layers` · Quem fica na frente? · **CONSTRUÍDA, AJUSTE APLICADO**

- **Situação:** a cena nasceu com o elenco deste curso (Dino e floresta) e serve exatamente como
  está. Três metas, pergunta final boa, explicação precisa.
- **Ajuste: feito.** O bloco estava com `required: false` sendo o único critério de conclusão da
  seção, e passou para obrigatório.
- **Elenco/cenário:** Dino e floresta, cenário `corre-dino`.
- **Metas cobradas nesta aula:** `front`, `covered`, `back-in-front`, que são as três de fábrica.
  Sem `setup.goals` no bloco, de propósito.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|
| `video-abertura` | o projeto como ficou ontem e o resultado de hoje | `video-abertura-editorial` | 20 a 30 s | ponte nova, tela regravada |
| `video-livrinho` | a analogia do livrinho e a palavra quadro | `video-quadros` | 35 a 45 s | fala sim, com corte no final repetitivo |
| `video-motor-e-dino` | as duas áreas lado a lado, o loop e o Dino aparecendo | `video-motor` mais `video-primeiro-desenho` | 75 a 90 s | funde dois clipes, tela regravada. Cortar o parágrafo sobre nomes diferentes, porque a trilha usa `dino` |
| `video-limpar-a-tela` | o rastro sutil nas perninhas e a lousa mágica | `video-limpeza` | 45 a 55 s | fala sim, encurtada. Manter a explicação honesta de por que o bloco fica |
| `video-floresta-cobre` | a floresta encaixada por último e o Dino sumindo | `video-floresta-cobre` | 30 a 40 s | fala sim. Parar antes da explicação e do conserto |
| `video-ordem-certa` | o arraste da floresta para o meio e a ordem final | `video-ordem-certa` | 30 a 40 s | fala sim |
| `video-retirar-borda` | a lixeira levando dois blocos, o `Ctrl+Z` e o `Apagar este bloco` | `video-retirar-borda` | 55 a 65 s | fala sim, tela regravada com o rótulo atual do menu |
| `video-fecho` | o teste e o envio, e então a recapitulação e o gancho da Aula 3 | `video-fecho-editorial` mais o teste e o envio regravados | 45 a 60 s | fala sim, sem o convite às velocidades 2 e 9. Absorve o balão de conferência da entrega |

**Saldo:** de 9 clipes para 8, com uma fusão e três encurtamentos. A seção do `once-vs-always` não
tem vídeo nenhum, porque a cena ensina melhor do que a narração conseguiria.

## Continuidade

- **O que esta aula assume da anterior:** a área `Ao iniciar` com os três blocos na ordem oficial,
  a borda no meio da pilha (é disso que depende a seção 7), o Dino criado com o identificador
  `dino` e a pergunta "cadê o Dino" aberta. Assume também que a criança sabe que x cresce para a
  direita e y cresce para baixo.
- **O que esta aula entrega para a Aula 3:**
  - `Ao iniciar`: `Preparar o jogo em tela cheia, tela 480 × 270, fundo` · `Criar dinossauro dino
    em x 110 y 150 tamanho 64 cor`. A borda saiu.
  - `Enquanto estiver rodando`: `A cada quadro do jogo` com `Limpar a tela` ·
    `Desenhar fundo de floresta (velocidade 5)` · `Desenhar o sprite dino`.
  - Na tela: o Dino corre no lugar, na frente da floresta que passa.
- **Valores canônicos que saem daqui:** velocidade da floresta 5 · a ordem limpar, floresta, Dino ·
  o nome "o loop" e o nome "camadas", os dois já ditos.
- **Campos livres:** a velocidade da floresta, com faixa dita de 2 a 9. Nenhuma aula posterior cita
  esse número.
- **O que a Aula 3 encaixa nesta pilha:** o `Controlar o dinossauro` entre a floresta e o
  `Desenhar o sprite dino`, e depois o `Aplicar a gravidade do mundo` logo acima do controle.
