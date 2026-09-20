# Desafio do Primeiro Jogo · Dia 5 · O jogo ganha começo e fim

## Resumo

- **Estado de entrada:** o jogo do fim do Dia 4. Nave com três vidas, dois grupos, relógio de 40
  quadros criando pedras sorteadas, colisão `tiros × asteroides` somando ponto, colisão `asteroides
  × nave` tirando vida com 45 quadros de proteção, placar e corações desenhados no motor. Tudo roda
  o tempo todo, desde o instante em que a página abre.
- **Vitória do dia:** uma tela de abertura com o nome do jogo, uma partida que só começa quando ela
  aperta Enter, e dois finais de verdade.
- **Seções hoje:** 17 · **Seções propostas:** 10 (8 no desenho didático, mais 2 divisórias
  obrigadas pela regra das duas colunas)
- **Clipes hoje:** 14 · **Clipes propostos:** 10, sendo 3 fusões
- **Cenas:** 2 (1 que já existia no catálogo e nunca tinha sido ligada, 1 existente e já ajustada).
  As duas comparações em HTML do curso desaparecem.
- **Blocos no manifesto:** 33 · **Manifesto:** `aulas/desafio-dia-5.manifesto.json`. Estado no
  validador: **OK**, sem nenhum aviso de convenção
- **Revisão da entrega, 20/09/2026:** os dois balões da seção saíram porque o Estúdio ocupa a coluna
  da direita sozinho e não existe "depois da ferramenta" na leitura da seção. O roteiro de teste e o
  passo a passo do Compartilhar passaram para o `video-ciclo-completo`, na ordem real

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Estados do jogo: o jogo guarda em que momento está | Sim. O estado é um valor que ninguém vê | **Sim**, em parte | Vídeo dos quatro cartões, com uma seta de cada vez | Antes de montar | O percurso das quatro setas é processo no tempo, não tem botão. O vídeo é o formato certo, e é curto |
| Guardar o estado não desenha nada na tela | Sim, e é a armadilha do dia | **Sim**, pela dor real | A tela do jogo dela fica preta quando a partida entra na pergunta | Depois de embrulhar o motor | A dor reproduz de verdade: a gravação original já mostra a tela vazia e diz que é sinal de que funcionou. Os nomes dos blocos ajudam, porque um guarda o estado e o outro mostra a tela |
| Constante contra variável | Não. Ela tem variável desde ontem | Não | | Uma frase ao lado do encaixe | A diferença cabe numa comparação falada: pontos muda o tempo todo, alvo fica em 26 do começo ao fim |
| A condição decide se a ação acontece, e o relógio continua tocando | Sim. Um relógio que toca sem fazer nada é contraintuitivo | **Sim** | Experimentação (`game-state`, que já está no catálogo) | Antes de montar a primeira pergunta | Hoje isso é uma comparação em HTML com dois botões fixos. A cena nativa já existe e foi escrita exatamente para esta relação |
| A proteção não se espalha sozinha: o relógio e o evento precisam da própria pergunta | Sim, e é a lacuna do roteiro original | **Sim**, na mesma cena `game-state` | Experimentação | Idem | A cena mostra o relógio tocando três vezes sem criar nada. É o mesmo argumento aplicado a dois lugares, e não precisa de cena nova para cada um |
| Embrulhar no Se | Não é conceito, é manobra de interface com risco alto | Não | | Demonstrada por inteiro uma vez, depois chamada pelo nome | É o termo canônico do documento de pedagogia, com quatro etapas fixas. A regra de lá é mostrar inteiro uma vez e depois só nomear |
| Duas perguntas no fim da partida | Não. São comparações que ela sabe ler | Não | | Orientação com âncora | pontos maior ou igual a alvo e as vidas do sprite acabaram? são legíveis. O risco aqui é de encaixe, não de entendimento |
| Se vitória e derrota valerem no mesmo quadro, vale a de baixo | Sim, mas é um caso raro | Não | | Uma frase honesta na orientação e no teste | Encenar isso custaria uma cena inteira para um quadro que quase nunca acontece. Vale dizer com todas as letras |
| Os três senão se e o desenho de cada tela | Não. É o mesmo padrão três vezes | Não | | | Repetir um padrão que acabou de ser mostrado é a vitória da seção, não o conteúdo |
| A mesma tecla faz coisas diferentes conforme o estado | Sim, e é o pagamento da ideia do dia | Não | | Teste dirigido, dois toques | Enter no menu começa e Enter no fim reinicia. Ela sente em cinco segundos, no jogo dela |
| Reiniciar roda Ao iniciar de novo e devolve ela para a abertura | Sim. É processo no tempo e contraria a expectativa de quem joga | **Sim** | Experimentação (`restart`, com ajuste) | Depois de montar o Enter | É o ponto de atenção registrado no curso e a pergunta 2 do quiz. A cena mostra o contrafactual: trocar de estado sem reiniciar deixa as pedras da partida anterior na tela |
| Vitrine, entrega e compartilhar | Não. É operação | Não | | Dentro do clipe do ciclo completo | Sequência de gesto que depende do envio já ter acontecido, então só o vídeo mostra na ordem real |

Doze coisas, quatro concretizações em duas cenas e uma dor real. Sete conceitos não ganham nada, e é
essa triagem que tira a aula mais pesada do curso de 17 para 8 blocos de conteúdo. Com as duas
divisórias que a regra das duas colunas obriga, o manifesto fica em 10 seções.

## Diagnóstico do desenho atual

**Os rótulos dos blocos mudaram e as falas não.** A fala revisada da seção 3 (*Prepare a meta e a
tela inicial*) manda pegar "Ir para a tela", e o bloco hoje se chama `Mudar o estado do jogo para`.
A seção 5 (*Faça a pergunta da partida*) manda encaixar "a tela atual é", e o bloco hoje se chama
`o estado do jogo é ?`. A subcategoria "Telas e cenas" virou Jogo 2D › Jogo e telas › Telas e
partida. São seis seções falando de peças com nome antigo, e a regra do projeto é rótulo literal.

**E a troca de nome resolveu justamente a confusão do dia.** "Ir para a tela" fazia parecer que o
bloco desenhava alguma coisa. `Mudar o estado do jogo para` diz o que ele faz, e `Mostrar tela com
título subtítulo dica fundo` diz o que desenha. A aula precisa usar essa diferença, em vez de
continuar chamando o estado de tela.

**Uma seção para observar um arraste e outra para fazer o mesmo arraste.** A seção 6 (*Observe a
mudança de todos os blocos*) mostra a cadeia sendo arrastada, e a seção 7 (*Leve a partida para
dentro da pergunta*) pede o mesmo arraste. É o formato normal de toda construção do curso, vídeo e
depois Estúdio, transformado em duas seções.

**A manobra do dia está partida em três pedaços.** Embrulhar no Se tem quatro etapas fixas: pegar o
Se, tirar a comparação de fábrica, encaixar a pergunta e envolver o que já existia. Hoje a etapa 1
a 3 estão na seção 5, a etapa 4 está nas seções 6 e 7, e a manobra nunca é vista inteira, do começo
ao fim, uma vez só.

**A comparação em HTML duplica uma cena que já existe.** A seção 4 (*O relógio pode agir agora?*) é
um HTML com dois botões, Tela: inicio e Tela: jogando. O catálogo tem a cena `game-state`, "O
relógio na tela de início", com três metas (`outside`, `waiting`, `playing`), a mesma comparação e
controles de verdade. Ela nunca foi ligada a esta aula.

**Três seções de proteção que são a mesma frase.** As seções 7, 8 e 9 (*Leve a partida para dentro
da pergunta*, *Proteja também o nascimento das pedras*, *Deixe o disparo só para a partida*) aplicam
a mesma pergunta em três lugares. O gesto do primeiro é pesado e merece cuidado. Os outros dois são
o mesmo gesto repetido, com o nome da manobra já aprendido.

**Duas seções para as duas perguntas do fim.** As seções 10 e 11 (*Decida quando vencer*, *Decida
quando a partida termina sem vidas*) montam dois blocos gêmeos, encostados um no outro, no mesmo
lugar. A relação entre elas, que é a ordem, só aparece se as duas estiverem à vista ao mesmo tempo.

**Uma seção inteira de observação para o teste final.** A seção 14 (*Observe como testar o jogo
completo*) é um clipe do percurso que a entrega pede na seção seguinte.

**A carga está mal distribuída.** As quatro seções mais pesadas do dia (mover a cadeia, os três
ramos com todos os campos de texto, o Enter com três ramos, e o teste completo) estão espalhadas
entre seções de um encaixe só. O próprio roteiro pede uma pausa possível depois das três proteções,
e o desenho atual não marca esse ponto em lugar nenhum.

**O quiz cobra uma coisa que o roteiro original não ensinava.** A pergunta 1 é sobre o evento da
barra de espaço sem a pergunta jogando, e essa proteção é um complemento novo, escrito depois da
gravação. Ela precisa existir como construção antes de virar pergunta.

## Proposta final

> **Regra das duas colunas.** Das oito seções do desenho, duas acumulavam uma cena nativa e o
> Estúdio embarcado, e os dois vão para a coluna da direita do player. Cada uma virou duas, e o
> manifesto fica com dez seções. As outras seis passam limpas: cinco têm só o Estúdio à direita e a
> abertura não tem nada, que é o comportamento certo.

### Seção 1. O que a gente vai fazer hoje

- **Chave:** `abertura` · **Intenção:** apresentação
- **Por que existe:** é o último dia, e ela precisa ver o jogo completo, com abertura e finais,
  antes de reorganizar o que já construiu.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "O jogo ganha começo e fim"): o jogo pronto, com a tela de abertura,
     uma partida, a tela de derrota e a de vitória. Fala curta: "Hoje o seu jogo ganha começo e fim.
     A gente vai guardar a partida inteira atrás de uma pergunta, montar as telas, e ensinar o Enter
     a comandar tudo. É a aula mais longa das cinco, e o seu projeto fica guardado se você precisar
     parar no meio." Duração alvo: 30 a 40 segundos.

### Seção 2. Os quatro momentos do jogo

- **Chave:** `momentos` · **Intenção:** construção
- **Por que existe:** antes de escrever a palavra jogando dentro de uma pergunta, ela precisa saber
  quais são os quatro momentos e que o jogo guarda um deles por vez.
- **Conclui quando:** 90% do clipe assistido, a constante `alvo` está criada com 26 em Ao iniciar e
  o `Mudar o estado do jogo para` está no fim de Ao iniciar com inicio
- **Blocos:**
  1. `video` (`video-telas`, "Os quatro momentos do jogo"): os quatro cartões, com uma seta de cada
     vez. De inicio para jogando pelo Enter; de jogando para vitoria quando os pontos chegam a 26;
     de jogando para fim quando as vidas acabam. Fala: "O seu jogo vai ter quatro momentos, e ele
     guarda um de cada vez. O momento que está guardado é que decide o que o jogo faz agora."
     Duração alvo: 40 a 50 segundos.
  2. `dialogue` (`fala-constante`): a diferença entre as duas caixas. "Para saber quando alguém
     ganhou, o jogo precisa de uma meta: 26 pedras destruídas. A caixa dos pontos muda o tempo todo
     durante a partida. Essa aqui não muda nunca, e caixa que não muda tem nome próprio: constante."
  3. `dialogue` (`fala-alvo`): orientação de montagem da constante e do momento inicial.
  4. `video` (`video-alvo`, "A meta e o primeiro momento"): o gesto dos dois blocos. **Trocar todas
     as menções a "Ir para a tela" e a "Telas e cenas"** pelos nomes atuais. Manter a comparação da
     caixinha lacrada, que é boa. Duração alvo: 45 a 55 segundos.
  5. `studio`: conferência da constante e do estado inicial.
  6. `dialogue` (`fala-guardar-nao-desenha`): aviso honesto. "Olha o seu jogo: continua
     tudo igual, com as pedras caindo. Guardar o momento não muda nada sozinho, e é por isso que a
     próxima peça é uma pergunta."

### Seção 3. O relógio pode agir agora?

- **Chave:** `estado-do-jogo` · **Intenção:** exploração
- **Por que existe:** um relógio que toca sem fazer nada é contraintuitivo, e essa é a relação que
  ela vai repetir em três lugares do projeto dez minutos depois.
- **Conclui quando:** as três metas de `game-state` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-tudo-roda`): abertura curta. "Hoje tudo o que está no motor acontece o tempo
     todo, desde o segundo em que a página abre. A nave anda, as pedras nascem e os tiros saem antes
     de alguém mandar começar. Olha o que acontece quando uma pergunta entra na frente de uma ação."
  2. `interactive` (`experiencia-estado`): cena `game-state`, "O relógio pode agir agora?". Elenco:
     nave e asteroide. Cenário: nave.

**A comparação em HTML desaparece.** A cena nativa faz o mesmo argumento com o gesto certo: mover a
peça de criar para dentro da condição, que é o que ela vai repetir no Estúdio logo em seguida.

### Seção 4. Embrulhe a partida numa pergunta

- **Chave:** `embrulhar` · **Intenção:** construção e dor
- **Por que existe:** é a manobra central do dia e do curso. Precisa ser vista inteira, uma vez, do
  começo ao fim, e ganhar nome para poder ser repetida depois.
- **Conclui quando:** a cadeia do `Limpar a tela` até o `Desenhar as vidas do sprite como em x y
  tamanho cor` está dentro do então de um `Condição se, senão se e senão` com a pergunta `o estado
  do jogo é ?` em jogando, no topo do `A cada quadro do jogo`
- **Blocos:**
  1. `dialogue` (`fala-embrulhar`): a manobra nomeada, etapas 1 e 2.
  2. `dialogue` (`fala-embrulhar-cadeia`): etapas 3 e 4, com a nota de que arrastar o primeiro bloco
     leva junto tudo o que está encaixado embaixo.
  3. `video` (`video-embrulhar`, "Embrulhar no Se, do começo ao fim"): funde os três clipes de hoje.
     Mostrar as quatro etapas seguidas, com zoom e pausa no contorno do então, e conferir o começo e
     o fim da cadeia. **Trocar "a tela atual é" pelo rótulo atual.** Duração alvo: 95 a 115
     segundos.
  4. `studio`: conferência da pergunta e da cadeia inteira dentro do então.
  5. `dialogue` (`fala-tela-preta`): a dor, fechando a seção. "Agora olha o seu jogo: ficou tudo
     preto. Calma, isso é sinal de que funcionou. O jogo está guardando o momento inicio, a partida
     está trancada dentro da pergunta, e ninguém desenhou a tela de abertura ainda. Guardar um
     momento não desenha nada, e é a gente que vai desenhar daqui a pouco."

**Por que junta o que hoje são três seções.** A manobra tem quatro etapas fixas e vale como uma
coisa só. Partida ao meio, a criança atravessa uma divisória com metade de um Se montado e uma
cadeia solta, que é exatamente o estado em que o projeto quebra.

**Onde a dor aparece.** A tela preta é uma dor real e reproduz sempre. Ela fecha esta seção sozinha,
e a ferramenta que a resolve, o `Mostrar tela com título subtítulo dica fundo`, só chega na seção 7.
Entre as duas, ela trabalha sabendo por que a tela está assim.

### Seção 5. O relógio e a barra de espaço também perguntam

- **Chave:** `relogio-e-tiro` · **Intenção:** construção
- **Por que existe:** proteger o motor não protege nada além do motor, e os outros dois lugares onde
  o jogo age têm vida própria.
- **Conclui quando:** o `No grupo criar um asteroide` está dentro de um `Condição se, senão se e
  senão` com a pergunta em jogando, dentro do `A cada quadros` de 40; e o `Criar tiro no grupo` e o
  `Tocar efeito` estão dentro de outro, dentro do evento da barra de espaço
- **Blocos:**
  1. `dialogue` (`fala-relogio-e-tiro`): a manobra chamada pelo nome, aplicada ao relógio.
  2. `dialogue` (`fala-embrulhar-tiro`): a mesma manobra no evento da barra de espaço.
  3. `video` (`video-relogio-e-tiro`, "A mesma manobra em mais dois lugares"): funde os dois clipes
     de hoje. Mostrar as etapas rápido, já que a manobra foi vista inteira na seção anterior, e
     terminar com o teste do menu. Depois, mostrar **Salvo** no Estúdio embutido e dizer que,
     após concluir a seção, ela pode parar e retomar na seção 6 pelo mesmo aparelho. Duração alvo:
     95 a 110 segundos.
  4. `studio`: conferência dos dois embrulhos, e do fato de existir um único criador de pedra e um
     único criador de tiro.
  5. `dialogue` (`fala-teste-menu`): teste do menu. "Clica na área do jogo e aperta a barra de
     espaço várias vezes. Nada sai, e nenhuma pedra nasce. O relógio continua batendo, como você
     viu na cena, mas a resposta da pergunta é não, e ninguém age."

**Por que junta duas seções.** É o mesmo gesto, com o mesmo nome, em dois lugares. A justificativa
para separar valia quando a manobra era nova, e ela deixou de ser nova na seção anterior.

### Seção 6. O jogo decide quando acaba

- **Chave:** `finais` · **Intenção:** construção
- **Por que existe:** as duas perguntas são gêmeas, moram encostadas uma na outra e a ordem entre
  elas é uma regra que precisa ser dita. Separadas, a ordem vira um detalhe invisível.
- **Conclui quando:** dentro do então de jogando, depois do `Desenhar as vidas do sprite`, existem
  dois `Condição se, senão se e senão`, o primeiro comparando pontos com alvo e mudando o estado
  para vitoria, e o segundo perguntando se as vidas da nave acabaram e mudando o estado para fim
- **Blocos:**
  1. `dialogue` (`fala-vitoria`): a primeira pergunta, com a comparação de fábrica aproveitada.
  2. `dialogue` (`fala-derrota`): a segunda, com `as vidas do sprite acabaram?` no lugar da
     comparação.
  3. `video` (`video-finais`, "A vitória pergunta primeiro"): funde os dois clipes de hoje. As duas
     perguntas montadas em sequência, com uma volta no fim mostrando as duas encostadas e a ordem
     entre elas. Abrir com uma frase que relembra os três lugares protegidos e aponta as perguntas
     do fim. Duração alvo: 95 a 110 segundos.
  4. `studio`: conferência das duas perguntas e da ordem.
  5. `dialogue` (`fala-ordem-dos-finais`): a regra honesta. "Repara na ordem: a vitória pergunta
     primeiro e a derrota pergunta depois. Se acontecer de você chegar nos 26 pontos no mesmo quadro
     em que perde a última vida, a pergunta de baixo é a última a ser respondida, e o jogo vai para
     o fim. É raro, e agora você sabe por quê."

### Seção 7. Desenhe as três telas

- **Chave:** `telas` · **Intenção:** construção
- **Por que existe:** é a vitória do dia. A tela preta da seção 4 vira a abertura do jogo dela, com
  o nome que ela escolher.
- **Conclui quando:** o `Condição se, senão se e senão` grande tem três senão se, com as perguntas
  inicio, vitoria e fim, cada um com um `Mostrar tela com título subtítulo dica fundo` dentro, com
  as dicas corretas
- **Blocos:**
  1. `dialogue` (`fala-tres-telas`): os três senão se e o primeiro ramo.
  2. `dialogue` (`fala-telas-finais`): os textos dos três ramos, com as duas dicas corrigidas.
  3. `video` (`video-mostrar-telas`, "As três telas ganham texto"): o primeiro ramo inteiro, com
     todos os campos, e depois só o que muda nos outros dois, com pausa em cada um. **Corrigir as
     duas dicas dos finais**, que na gravação dizem "para jogar novamente" e "para tentar
     novamente": o Enter ali volta para a abertura, e é preciso apertar de novo para jogar. Duração
     alvo: 85 a 100 segundos.
  4. `studio`: conferência dos três ramos e das dicas.
  5. `dialogue` (`fala-abertura-apareceu`): a vitória. "Olha o seu jogo agora: a tela de abertura
     apareceu, com o nome que você escolheu. Ele ainda não começa quando você aperta Enter, porque o
     Enter ainda não faz nada. É a última peça."

**Seis encaixes, uma vitória.** Os três ramos são o mesmo padrão repetido, e o que os separa é só o
texto que ela escreve. Três seções aqui seriam três vezes a mesma explicação.

### Seção 8. O Enter comanda o jogo

- **Chave:** `enter` · **Intenção:** construção
- **Por que existe:** é onde a ideia do dia se paga. A mesma tecla faz três coisas diferentes,
  porque o jogo sabe em que momento está.
- **Conclui quando:** o evento `Quando apertar a tecla` com Enter tem um `Condição se, senão se e
  senão` de três ramos: inicio muda o estado para jogando, fim reinicia e vitoria reinicia
- **Blocos:**
  1. `dialogue` (`fala-enter`): o evento novo e o primeiro ramo.
  2. `dialogue` (`fala-enter-ramos`): os dois ramos do fim, com o `Reiniciar o jogo`.
  3. `video` (`video-enter`, "A mesma tecla, três respostas"): o evento e os três ramos. Manter a
     montagem gravada, que é boa. **Trocar os rótulos antigos** e **cortar a frase que diz que o
     Enter recomeça zeradinho a partida**, porque ele volta para a abertura. Duração alvo: 80 a 95
     segundos.
  4. `studio`: conferência dos três ramos do Enter.

### Seção 9. Jogue outra vez

- **Chave:** `reiniciar` · **Intenção:** exploração
- **Por que existe:** reiniciar volta ao estado inicial e cai na abertura, o que contraria a
  expectativa de quem joga. É o ponto de atenção registrado no curso e a pergunta 2 do quiz.
- **Conclui quando:** as duas metas de `restart` cobradas aqui caem e a pergunta final é respondida
- **Blocos:**
  1. `interactive` (`experiencia-reiniciar`): cena `restart`, "Jogue outra vez". Elenco: nave e
     asteroide. Cenário: nave. **Vem depois da montagem**, para mostrar o contrafactual sem estragar
     o jogo dela.
  2. `dialogue` (`fala-reiniciar`): o que ela acabou de ver. "O `Reiniciar o jogo` não muda só o
     momento guardado: ele roda o seu Ao iniciar de novo, inteiro. Os pontos voltam para zero, a
     nave ganha as três vidas, os grupos ficam vazios, e o último bloco de lá guarda o momento
     inicio. Por isso você cai na tela de abertura, e aperta Enter mais uma vez para começar de
     verdade."

**Por que a divisória cai aqui.** A cena é contrafactual e precisa vir depois do Estúdio. Com a
divisória entre os dois, a ordem do desenho didático fica intacta.

### Seção 10. Teste, entregue e mostre para o mundo

- **Chave:** `entrega` · **Intenção:** entrega e fechamento
- **Por que existe:** é o fim do jogo e o fim do curso. Aqui o percurso completo é testado uma vez,
  do menu ao recomeço, e o jogo ganha um link.
- **Conclui quando:** a entrega é enviada e as duas perguntas são respondidas
- **Blocos:**
  1. `video` (`video-ciclo-completo`, "Do menu ao recomeço"): o roteiro de teste nos cinco passos, o
     percurso acelerado, o gesto de enviar e, só depois do envio, o botão Compartilhar liberando e
     sendo clicado. Cortar o tempo repetido de jogo. **Corrigir o ciclo dos dois Enter.** Não
     prometer geração de capa nem campos de publicação que não estiverem na janela atual. Duração
     alvo: 100 a 120 segundos.
  2. `quiz`: as duas perguntas atuais, mantidas. As duas passam a ter apoio: a primeira foi montada
     na seção 5 e aparece na cena `game-state`, e a segunda é a meta nova de `restart`.
  3. `video` (`video-fecho`, "O seu primeiro jogo está pronto"): o fecho do curso, último bloco da
     coluna da esquerda. Reaproveitar a conquista da gravação, que é sincera e boa. Substituir o
     resumo numerado dos sete passos por uma frase sobre o que ela sabe fazer agora. Duração alvo:
     35 a 45 segundos.
  4. `studio`: entrega, com os vinte critérios de estrutura já definidos no manifesto atual.

**Junta quatro seções de hoje**, e a entrega fica sem nenhum balão do Zappy.

**Por que os dois balões saíram.** O Estúdio ocupa a coluna da direita sozinho, e tudo o que não é
ferramenta cai na esquerda, de cima para baixo. Os dois eram sequência de gesto:

- O `fala-teste-completo` era um roteiro numerado de cinco passos. Ele já estava no percurso do
  clipe, e ali cada passo aparece em vez de ser descrito.
- O `fala-compartilhar` era o passo a passo da publicação, e é o mais delicado do curso, porque
  depende de o envio já ter acontecido. Por escrito, num bloco que se lê antes do envio, ele pedia
  um clique num botão que ainda estava travado. No clipe a ordem real aparece: enviar, o botão
  liberando, o clique. A narração diz que o jogo ganha um link só dele, que quem abrir consegue
  jogar e que não é preciso deixar o perfil público, e **não** descreve nem promete nenhum campo da
  janela, porque o que ela pede é configuração do professor e pode mudar.

**A vitrine cabe nesta seção**, agora inteira dentro do `video-ciclo-completo`. O que fica fora do
manifesto é a preparação do professor: `showcase.enabled` é configuração do bloco de Estúdio, não
campo de manifesto.

**O fecho do curso vai depois do quiz.** É o último bloco da coluna da esquerda, e nenhum bloco vem
depois da ferramenta.

## Experiências e demonstrações desta aula

### 1. `game-state` · O relógio pode agir agora? · **EXISTE NO CATÁLOGO, E AGORA ESTÁ LIGADA**

- **Situação:** esta é a resposta para a pergunta sobre a comparação em HTML da seção 4. A cena
  existe, se chama "O relógio na tela de início", tem três metas (`outside`, `waiting`, `playing`) e
  foi escrita exatamente para esta relação: a peça de criar dentro da caixa Se jogando, o relógio
  tocando e o começo da partida. O HTML `telas.html` refaz isso com dois botões fixos e três passos.
- **Por que a cena nativa ganha:** no HTML, a criança escolhe entre duas situações prontas e avança;
  ela nunca move a peça de criar para dentro da condição, que é o gesto que ela vai repetir três
  vezes no Estúdio dez minutos depois. Na cena, mover a peça é o controle. Além disso, as metas da
  cena nativa caem por ação registrada, e o estado do HTML é participação informada pelo cliente, o
  que a própria documentação do curso diz que não equivale.
- **Ajuste 1, elenco e vocabulário:** nave e asteroide no lugar de dino e cacto. A peça passa a ser
  Criar pedra, a caixa passa a ser `Se o estado do jogo é jogando`, e o relógio do palco é de 40
  quadros, o mesmo número que ela escreveu no Dia 3.
- **Ajuste 2, o contador que o HTML acertou:** o HTML mostra "3 toques do relógio, 0 nascimentos,
  condição falsa". Essa leitura é a melhor coisa dele e precisa ir para a cena, porque é ela que
  mostra que o relógio continua tocando. A faixa da cena passa a mostrar toques do relógio,
  nascimentos e a resposta da pergunta.
- **Ajuste 3, rótulos das metas:** `outside` vira "Sem a pergunta, as pedras nasceram antes de
  começar". `waiting` vira "Com a pergunta, o relógio tocou três vezes e nenhuma pedra nasceu".
  `playing` vira "Começando a partida, as pedras voltaram a nascer".
- **Pergunta depois de descobrir:** manter a que já está na aula, que é boa. "O relógio tocou no
  momento inicio, mas tem a pergunta antes de criar. O que acontece?" As alternativas: "Cria uma
  pedra porque o relógio tocou" e "Nenhuma pedra é criada" (correta). Explicação: "A chamada do
  relógio acontece do mesmo jeito. É a resposta da pergunta que decide se o bloco de dentro age."
- **Elenco:** nave e asteroide. **Cenário:** nave.
- **Metas cobradas nesta aula:** `outside`, `waiting`, `playing`.

### 2. `restart` · Jogue outra vez · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena foi escrita para o Corre Dino e compara duas opções para o que a ação do fim
  faz: voltar para o início contra reiniciar o jogo. As metas de fábrica eram `ended` e
  `screen-only`, e a imagem forte dela é a pista suja com os cactos da partida anterior.
- **Ajuste 1, elenco e ação:** nave e pedras no lugar de dino e cactos. A ação do fim passa a ser o
  Enter, e a escolha passa a ser entre `Mudar o estado do jogo para inicio` e `Reiniciar o jogo`,
  que são os dois blocos reais desta aula.
- **Ajuste 2, o que `screen-only` mostra:** com `Mudar o estado do jogo para inicio`, a partida
  seguinte começa com as pedras da anterior ainda caindo, o placar no número antigo e as vidas no
  que sobrou. É o contrafactual exato do jogo dela.
- **Ajuste 3, meta nova, criada:** `back-to-menu`, com o rótulo "Reiniciar levou para a abertura, e
  foi preciso outro Enter para jogar". É o ponto de atenção registrado no curso e a pergunta 2 do
  quiz, e nada na aula mostrava isso acontecendo. O pedido ficou "Escolha Reiniciar o jogo, aperte
  Enter no fim e depois aperte Enter de novo para jogar", uma linha mais literal que a desta
  análise; o bloco reescreve esse pedido por `goalCopy` para "olhe em que momento o jogo ficou".
- **Ajuste 4, pergunta final:** "Depois da derrota você aperta Enter e o jogo reinicia. Para onde
  ele vai?" As alternativas: "Para a abertura, e outro Enter começa a partida" (correta) e "Direto
  para uma partida nova". Explicação: "Reiniciar roda o Ao iniciar inteiro de novo, e o último bloco
  de lá guarda o momento inicio."
- **Tipo:** experimentação. A relação tem botão, porque ela escolhe qual bloco fica no ramo do fim e
  vê a diferença na partida seguinte.
- **Elenco:** nave e asteroide. **Cenário:** nave.
- **Metas cobradas nesta aula:** `screen-only`, `back-to-menu`, declaradas no bloco, com rótulo e
  pedido reescritos por `goalCopy`. A cena tem quatro metas no catálogo: `ended`, `screen-only` e
  `clean-track` na missão de fábrica, e `back-to-menu` como meta de caso.

### 3. Cenas avaliadas e recusadas

- **`score`, "Quando o placar cresce?".** Compara o Somar ponto solto contra o Somar ponto dentro de
  Se jogando, nas três telas. É o mesmo argumento de `game-state`, aplicado ao placar em vez do
  relógio. Neste jogo, quem tem vida própria é o relógio das pedras e o evento da barra de espaço, e
  não a soma, que já mora dentro de uma colisão. Usar as duas cenas seria mostrar a mesma relação
  duas vezes na mesma aula. Ela continua servindo ao Corre Dino, onde o placar é a peça que se move.
- **`controls`, "O convite para começar".** Trata de qual evento escuta o começo da partida, com
  Enter contra toque na tela. O Desafio só usa Enter, e o bloco de toque não está liberado para este
  nível. A cena ensinaria uma peça que ela não tem.
- **`lives`, "O que a batida muda?".** Foi retirada do Dia 4 porque a meta `over` não era verdadeira
  lá. A partir de hoje ela passa a ser verdadeira, e a cena poderia entrar na construção da derrota.
  Fica de fora mesmo assim: esta é a aula mais carregada do curso, a relação entre vidas e fim da
  partida aparece no teste completo da seção 8, e cada cena a mais empurra a pausa para mais longe.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O jogo ganha começo e fim | o jogo completo, com abertura e os dois finais | `video-abertura-v6` | 30 a 40 s | fala parcial, tela regravada |
| `video-telas` | Os quatro momentos do jogo | os quatro momentos e as setas entre eles | `video-telas-observar` | 40 a 50 s | fala sim, imagem nova |
| `video-alvo` | A meta e o primeiro momento | a constante e o momento inicial | `video-alvo` | 45 a 55 s | fala sim, com troca de rótulos |
| `video-embrulhar` | Embrulhar no Se, do começo ao fim | as quatro etapas de embrulhar no Se, inteiras | `video-pergunta` + `video-mover-cadeia` + `video-guardar-jogo` | 95 a 115 s | funde três clipes, com troca de rótulos |
| `video-relogio-e-tiro` | A mesma manobra em mais dois lugares | a mesma manobra no relógio e no evento, com pausa após concluir | `video-guardar-relogio` + `video-guardar-tiro` | 95 a 110 s | funde dois clipes, o segundo é gravação nova |
| `video-finais` | A vitória pergunta primeiro | breve retomada, perguntas do fim e ordem entre elas | `video-vitoria` + `video-derrota` | 95 a 110 s | funde dois clipes |
| `video-mostrar-telas` | As três telas ganham texto | o primeiro ramo inteiro e o que muda nos outros | `video-mostrar-telas` | 85 a 100 s | fala sim, com correção das dicas |
| `video-enter` | A mesma tecla, três respostas | o evento Enter e os três ramos | `video-enter` | 80 a 95 s | fala sim, com dois cortes |
| `video-ciclo-completo` | Do menu ao recomeço | o teste em cinco passos, o percurso do menu ao recomeço, o envio, e o Compartilhar liberando depois dele | `video-ciclo-completo` | 100 a 120 s | fala parcial, com correção dos dois Enter e o envio gravado novo |
| `video-fecho` | O seu primeiro jogo está pronto | o fecho do curso | `video-fecho-v6` | 35 a 45 s | fala parcial |

**Saldo:** de 14 clipes para 10 blocos de vídeo, sendo 3 fusões. A queda é menor do que nas outras
aulas, e de propósito: o Dia 5 é quase todo construção, e construção no Estúdio nunca deixa a
criança procurar peça sozinha. O que encolhe aqui é a minutagem, não a contagem, porque as duas
seções de observação entram no `video-ciclo-completo` como o teste e a vitrine da própria entrega.

**O clipe que é gravação nova:** a proteção do evento da barra de espaço não existe no roteiro
original. É o complemento registrado no mapa de montagem, e precisa ser gravado sobre o evento que
já existe, antes do Enter.

## Continuidade

- **Assume do Dia 4:** placar lendo a variável `pontos`, três vidas na nave, as duas colisões, os
  corações desenhados, e a cadeia do motor terminando no `Desenhar as vidas do sprite como em x y
  tamanho cor`. Essa última é a condição sem a qual a instrução "arraste do `Limpar a tela` até o
  `Desenhar as vidas`" não faz sentido.
- **Entrega para O jogo do meu jeito:** o projeto completo. Ao iniciar com preparar o jogo, criar a
  nave, os dois grupos, a variável `pontos`, as três vidas, a constante `alvo` e o momento inicio.
  Enquanto estiver rodando com o `A cada quadro do jogo`, contendo um `Condição se, senão se e
  senão` de quatro ramos (jogando com a partida inteira e as duas perguntas do fim, inicio, vitoria
  e fim com o `Mostrar tela`), mais o relógio de 40 quadros com o nascimento protegido. Quando
  acontecer com dois eventos: a barra de espaço, com o disparo protegido, e o Enter, com os três
  ramos.
- **Valores canônicos que saem daqui:** alvo 26 · nomes dos momentos `inicio`, `jogando`, `vitoria`
  e `fim` · dica da abertura "Aperte Enter para começar" · dica dos dois finais "Aperte Enter para
  voltar ao início" · título "Nave contra Asteroides" na vitrine.
- **Campos livres:** título, subtítulo e cor de fundo de cada uma das três telas, além das cores já
  livres dos dias anteriores.
- **O que o professor precisa preparar só aqui:** `showcase.enabled` ligado no Estúdio do Dia 5, e a
  conferência do link publicado quando ela optar por compartilhar.

## Manifesto

Arquivo: `aulas/desafio-dia-5.manifesto.json`. Versão 4, `lessonSlug` `dia-5`, título
"O jogo ganha começo e fim". **33 blocos em 10 seções**, com 10 vídeos planejados, 2 cenas, 1 quiz e
o Estúdio da aula.

**O Estúdio** aparece uma vez em `blockKeys`, na seção `entrega`, e é referenciado por
`workspaceKey` nas seções `momentos`, `embrulhar`, `relogio-e-tiro`, `finais`, `telas`, `enter` e
`entrega`.

**Seções divididas pela regra das duas colunas.**

| Seção do desenho | Virou | Motivo |
|---|---|---|
| Embrulhe a partida numa pergunta | `estado-do-jogo` (cena `game-state`) + `embrulhar` (Estúdio) | cena e Estúdio na mesma seção, e a cena vem antes |
| O Enter comanda o jogo | `enter` (Estúdio) + `reiniciar` (cena `restart`) | cena e Estúdio na mesma seção, e a cena é contrafactual, então fica depois |

As outras seis passam sem divisão: `momentos`, `relogio-e-tiro`, `finais`, `telas` e `entrega` têm
só o Estúdio na coluna da direita, e `abertura` não tem nada lá.

**Estado no validador:** `OK`, sem nenhum aviso de convenção. Com as 11 cenas novas construídas, os
seis manifestos do Desafio passam, e nenhum deles fica em AGUARDA.

**Ajustes de cena que o manifesto já declara:**

1. **`game-state`.** O bloco `experiencia-estado` traz o elenco nave e asteroide e cobra `outside`,
   `waiting` e `playing`, com os três rótulos reescritos por `goalCopy`, como pede o ajuste 3. A
   pergunta do fim é a que já está na aula.
2. **`restart`.** O bloco `experiencia-reiniciar` cobra `screen-only` e `back-to-menu`, com os dois
   rótulos e pedidos reescritos por `goalCopy`. As metas de fábrica `ended` e `clean-track` ficam de
   fora, porque a lista declarada substitui a missão padrão.
3. **O que ainda depende de código:** o vocabulário do palco das duas cenas (nave e pedra no lugar
   de dino e cacto, `Se o estado do jogo é jogando` no lugar de "a tela atual é", e o relógio de 40
   quadros) e a faixa de leitura com toques do relógio, nascimentos e a resposta da pergunta. Nada
   disso é campo de manifesto.

**Vitrine e compartilhamento.** Ficam na seção `entrega`, inteiros dentro do clipe
`video-ciclo-completo`: ele mostra o envio, o botão Compartilhar liberando depois dele e o clique.
O passo a passo era a fala `fala-compartilhar`, que saiu, porque na esquerda ela seria lida antes do
envio e mandaria clicar num botão ainda travado. `showcase.enabled` é configuração do bloco de
Estúdio do Dia 5, e não existe campo de manifesto para ela.

**Critérios de estrutura.** Todos os `projectChecks` e `blockType` do Estúdio foram copiados do
manifesto v6 desta mesma aula, sem nenhum tipo de bloco inventado. A entrega repete os vinte
critérios do v6.

**Campos livres.** Título, subtítulo e cor de fundo de cada uma das três telas não têm critério de
valor. Os únicos textos cobrados nas telas são as duas dicas, "Aperte Enter para começar" e "Aperte
Enter para voltar ao início", que são valores canônicos do curso e não escolha dela.
