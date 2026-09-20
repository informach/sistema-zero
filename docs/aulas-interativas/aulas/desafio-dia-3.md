# Desafio do Primeiro Jogo · Dia 3 · A chuva de pedras

## Resumo

- **Estado de entrada:** o jogo do fim do Dia 2. Tela 800 × 480, sprite `nave` em x 400, y 410,
  tamanho 54 × 62, motor com limpar, estrelas, mover com as setas, manter dentro da tela e desenhar
  a nave. Grupo `tiros` criado, evento da barra de espaço disparando um tiro do centro x e do topo y
  da nave com vy menos 9 e som de tiro, e o trio mover, faxina e desenhar do grupo `tiros` no motor.
- **Vitória do dia:** pedras caem do alto em lugares sorteados, e o tiro que acerta uma delas faz a
  pedra explodir com barulho.
- **Seções hoje:** 13 · **Seções propostas:** 9 (6 no desenho didático, mais 3 divisórias obrigadas
  pela regra das duas colunas)
- **Clipes hoje:** 10 · **Clipes propostos:** 6, sendo 2 fusões de pares
- **Cenas:** 3, todas construídas (2 que já existiam, já ajustadas e com preset próprio, e a
  `collision-pair`, feita para este dia). Uma cena usada no v6 sai da aula.
- **Blocos no manifesto:** 26 · **Manifesto:** `aulas/desafio-dia-3.manifesto.json`. Estado no
  validador: **OK**, sem nenhum aviso de convenção
- **Revisão da entrega, 20/09/2026:** o balão de teste saiu porque o Estúdio ocupa a coluna da
  direita sozinho e não existe "depois da ferramenta" na leitura da seção. O `video-fecho` passa a
  mostrar o teste e o envio, e só recapitula depois deles

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Um segundo grupo, o das pedras | Não. Grupo foi ensinado no Dia 2 e ela montou o dos tiros | Não | | Dito na hora do encaixe | É o mesmo saquinho de ontem com outro nome. Repetir a explicação gasta uma seção e subestima o que ela já fez |
| Nascer no ritmo de um relógio contra nascer em todo quadro | Sim. Ritmo é invisível, e a avalanche não existe no jogo dela para ser vista | **Sim** | Experimentação (`spawn`) | Antes de montar o relógio | É a dor canônica do nascimento sem relógio, listada na seção 6.1 do documento de pedagogia. A cena mostra a parede de pedras sem precisar montar errado no projeto dela |
| A frequência não muda a velocidade de queda | Sim. A intuição junta as duas coisas num "mais rápido" só | **Sim**, dentro da mesma cena | Experimentação (`spawn`) | Junto com o relógio | O quiz de hoje cobra exatamente isso e nenhuma cena mostra. A queda precisa ficar visivelmente igual nos dois lados da comparação |
| O relógio é vizinho do motor, não filho dele | Não é conceito, é encaixe com risco | Não | | Na própria orientação, com âncora | Errar aqui é possível, e a conferência da etapa já pega. Cena nenhuma resolveria um encaixe |
| Sorteio: cada pedra nasce num x sorteado, e o sorteio pode repetir | Sim. "Aleatório" é uma palavra, e a intuição diz que sorteado é sempre diferente | **Sim** | Experimentação (`random`, com ajuste) | Antes de encaixar o bloco do sorteio | A narração gravada afirma que o jogo sorteia "um lugar novo" a cada vez, o que é falso. A cena corrige isso mostrando marquinhas que às vezes caem no mesmo ponto |
| Nascer fora da tela, em y menos 30 | Sim. O que está fora da tela não se vê, por definição | **Sim**, na mesma cena do sorteio | Experimentação (`random`, com ajuste) | Idem | A régua do nascimento fica acima da borda de cima. Uma cena cobre as duas ideias sem repetir o palco |
| O menos de y não é o menos de vy | Sim, e é uma confusão provável | Não | | Uma frase na orientação, ao lado dos dois campos | O sinal da velocidade já tem cena própria no Dia 2 (*Compare o sinal da velocidade*, cena `velocity`). Repetir a mesma cena é reensinar o que ela já sentiu |
| vy 3 faz a pedra descer | Não. Mesmo caso acima | Não | | | Ela preenche o campo e vê a pedra cair em dois segundos |
| O tamanho 40 é a base do kit, não a medida exata | Não. É informação | Não | | Uma frase na orientação | O kit varia o formato e o tamanho real de cada pedra. Basta não prometer o contrário |
| Mover, faxina e desenhar o grupo | Não. Ela montou igual no Dia 2 | Não | | | Transferir um padrão que ela já domina é a vitória da seção, não o conteúdo dela |
| O tiro atravessa a pedra como se fosse fantasma | É dor, não conceito | **Sim**, no jogo dela | Teste dirigido que fecha a seção de construção | Antes da colisão aparecer | A dor reproduz de verdade: a gravação original já mostra o tiro passando reto. Ela precisa sentir a falta antes de ganhar a ferramenta |
| Colisão entre dois grupos e os apelidos | Sim. São vários tiros e várias pedras, mas o encontro tem só dois participantes | **Sim** | Experimentação (cena nova `collision-pair`) | Antes de montar a colisão | É o conceito mais abstrato do dia e hoje é ensinado por um vídeo de congelamento. Com um botão, ela vê 1 pedra sumir contra 3 sumindo |
| Explosão, som e tremida como retorno pro jogador | Não. Ela vê e ouve no mesmo instante | Não | | Nomeado na hora do encaixe | Vale nomear o padrão, como manda a seção 6.6 do documento de pedagogia, e seguir em frente |
| Confirmar campo e clicar na área do jogo | Não é conceito, é operação | Não | | Dentro do teste | Já resolvido no Dia 1 |

Quatorze coisas, quatro concretizações em três cenas. Dez conceitos não ganham nada, e é essa
triagem que tira a aula de 13 para 6 blocos de conteúdo. Com as três divisórias que a regra das duas
colunas obriga, o manifesto fica em 9 seções.

## Diagnóstico do desenho atual

**A cena principal do dia ensina outra coisa.** A seção 5 (*Observe posição e velocidade*) tenta
carregar três ideias num clipe só (y negativo, vy positivo e sorteio de x) e entrega a
concretização para a cena `velocity`, que trata da relação entre velocidade e posição. O sorteio,
que é o conceito realmente novo, fica sem concretização nenhuma.

**A cena `velocity` já foi usada no Dia 2.** A seção 6 do Dia 2 se chama *Compare o sinal da
velocidade* e usa exatamente essa cena, com o tiro. O Dia 3 a repete com elenco trocado para
pedra, para ensinar de novo que o sinal manda na direção. É a mesma cena, duas aulas seguidas, para
a mesma relação.

**As metas cobradas pelo Dia 3 não existiam na cena.** O bloco `demonstracao-nascer-fora` espera
`waitFor: "down"` no passo 2 e `waitFor: "stopped"` no passo 3, e a `velocity` do catálogo tinha só
`moves` e `left`. Do jeito que estava, a demonstração não fechava. **Resolvido por duas vias:** o
bloco sai desta aula (a `velocity` fica no Dia 2) e a cena ganhou `up`, `down` e `still`.

**A cena `spawn` prometia duas descobertas e tinha uma.** O roteiro da seção 3 (*Abra espaço entre
os asteroides*) lista o segundo pedido, "Leve Criar asteroide para dentro do relógio e deixe o tempo
passar até nascerem dois asteroides", com o rótulo "Com o relógio, sobrou espaço", e no catálogo a
cena tinha só `every-frame`. **Resolvido:** a `spawn` hoje tem três metas, entre elas `with-timer`
e `same-fall`, as duas que faltavam para este dia.

**A cena falava em segundos e o Estúdio fala em quadros.** O quiz pergunta o que muda ao trocar dois
segundos por meio segundo, enquanto o campo que ela preenche no bloco é 40 quadros. O documento de
pedagogia é explícito: no 2D a criança pensa em quadros, e isso está certo. **Resolvido pelo preset
`pedra-quadros`**, que põe o controle do relógio em quadros, com 20, 40 e 80.

**O quiz cobra uma relação que nenhuma cena mostrou.** A pergunta 1 separa frequência de velocidade
de queda. Nada na aula mostra as duas coisas lado a lado com a queda igual.

**A mesma ideia da colisão ocupa duas seções.** A seção 8 (*Observe quais dois objetos se
encontraram*) explica os apelidos com um congelamento de três tiros e três pedras, e a seção 9
(*Faça a colisão destruir os dois*) monta. A explicação é boa e a partição é o problema: uma ideia,
duas divisórias. E o congelamento pede justamente o que uma cena faria melhor, porque ali a criança
poderia trocar o alvo do comando e ver a diferença acontecer.

**Uma seção inteira para um teste de dez segundos.** A seção 10 (*Observe um acerto e uma
tentativa*) é um clipe mostrando um tiro que erra e um que acerta. Ela faz isso sozinha no próprio
jogo, no mesmo tempo que levaria assistindo.

**Duas seções são encaixe puro.** *Prepare o grupo das pedras* tem um bloco. *Monte o relógio dos
asteroides* tem um bloco. Nenhuma das duas tem conceito próprio depois que a cena `spawn` explica
o relógio.

**A dor do dia está escondida no meio de um clipe.** O tiro que atravessa a pedra aparece como
comentário final do vídeo da seção 7 (*Use o padrão que você já conhece*), junto com a chamada para
o passo seguinte. É a melhor dor da aula, é real, e está enterrada.

**Três endereços de paleta na gravação estão vencidos.** O original manda pegar `Soltar explosão no
sprite cor` em "Kit espaço", e na paleta atual ela está em Jogo 2D › Desenho e efeitos ›
Partículas. "Muitos" virou Jogo 2D › Grupos › Participação e limpeza, e "Mira e contas" virou
Jogo 2D › Sorteios › Números e posições.

## Proposta final

> **Regra das duas colunas.** Três seções desta proposta acumulavam uma cena nativa e o Estúdio
> embarcado, e os dois vão para a coluna da direita do player. Cada uma virou duas: a cena fica
> sozinha na seção de conceito e o Estúdio fica sozinho na seção de construção que vem logo depois.
> São os pares 2 e 3, 4 e 5, e 7 e 8. O conteúdo e a ordem são os mesmos. A divisória a mais é o
> preço de os dois lados caberem na tela ao mesmo tempo.

### Seção 1. O que a gente vai fazer hoje

- **Chave:** `abertura` · **Intenção:** apresentação
- **Por que existe:** ela precisa ver a chuva de pedras e a primeira explosão antes de encaixar
  qualquer coisa.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "A chuva de pedras chega"): o jogo do fim do Dia 3 rodando, com
     pedras caindo em lugares diferentes e um tiro explodindo uma delas. Fala curta: "Hoje seus
     tiros vão ter o que acertar. As pedras vão começar a chegar do alto, uma de cada vez, e o jogo
     vai aprender a perceber quando um tiro encontra uma pedra." Cortar a enumeração dos seis
     passos. Duração alvo: 25 a 35 segundos.

### Seção 2. Uma pedra de cada vez

- **Chave:** `avalanche` · **Intenção:** exploração
- **Por que existe:** o relógio é a peça que ela vai levar para todo jogo que fizer. Sem ver a
  avalanche primeiro, ela encaixa um bloco com um número dentro sem saber o que o número segura.
- **Conclui quando:** as três metas de `spawn` cobradas aqui caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-avalanche`): abertura curta, sem vídeo. "As pedras vão nascer sozinhas, o
     jogo inteiro. Antes de montar isso, olha o que acontece quando o jogo cria uma pedra a cada
     quadro."
  2. `interactive` (`experiencia-relogio`): cena `spawn`, preset `pedra-quadros`, "Abra espaço entre
     as pedras". Elenco: nave e asteroide. Cenário: nave. Metas cobradas: `every-frame`,
     `with-timer`, `same-fall`.

**Por que a dor não vai para o projeto dela.** A avalanche de nascimentos é uma dor canônica, mas
provocá-la no Estúdio custaria montar errado de propósito e depois desmontar. A cena mostra a
parede sem tocar no jogo dela, e é por isso que ela vem antes do relógio, e não depois.

### Seção 3. O grupo e o relógio da chuva

- **Chave:** `relogio` · **Intenção:** construção
- **Por que existe:** criar o segundo grupo e pendurar o relógio são dois encaixes de um movimento
  só, e o conceito dos dois já caiu na cena da seção anterior.
- **Conclui quando:** o grupo `asteroides` está em Ao iniciar e o `A cada quadros` com 40 está em
  Enquanto estiver rodando, como vizinho do `A cada quadro do jogo`
- **Blocos:**
  1. `dialogue` (`fala-grupo-asteroides`): o segundo grupo, em Grupos › Criar e percorrer.
  2. `dialogue` (`fala-relogio`): o relógio vizinho, em Tempo › Quadros e intervalos, com 40.
  3. `video` (`video-grupo-e-relogio`, "O saquinho das pedras e o relógio vizinho"): funde os dois
     clipes de hoje. Manter a fala do saquinho e a do relógio mais lento, que são boas. Cortar a
     contagem de passos e a promessa de que o número será mudado depois. Duração alvo: 55 a 65
     segundos.
  4. `studio`: conferência do grupo `asteroides` e da vizinhança dos dois relógios.
  5. `dialogue` (`fala-relogio-vazio`): fecho honesto da seção. "Por enquanto o seu relógio está
     vazio, e é assim mesmo. A pedra entra nele na próxima seção."

**Por que junta o que hoje são duas seções.** Criar o segundo grupo e pendurar o relógio são dois
encaixes sem conceito próprio. Separados, viram duas seções de um bloco cada.

### Seção 4. De onde vem a próxima pedra

- **Chave:** `sorteio` · **Intenção:** exploração
- **Por que existe:** dois campos do bloco que ela vai preencher escondem as duas ideias novas do
  dia. O x guarda o sorteio, e o y guarda o nascimento fora da tela.
- **Conclui quando:** as metas de `random` cobradas aqui caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-sorteio`): abertura curta. "A pedra não nasce dentro da tela. Ela nasce um
     pouquinho acima dela, do lado de fora, e entra caindo. E o lugar dela é sorteado: nem eu nem
     você sabemos onde a próxima vai aparecer."
  2. `interactive` (`experiencia-sorteio`): cena `random`, preset `pedra-acima`, "De onde vem a
     próxima pedra". Elenco: asteroide. Cenário: nave. Metas cobradas: `positions`, `repeat`,
     `above`.

**Uma cena para duas ideias.** A régua do sorteio fica acima da borda de cima da tela, e é a mesma
imagem que mostra o nascimento do lado de fora. Duas cenas aqui repetiriam o palco.

### Seção 5. A pedra que nasce fora da tela

- **Chave:** `asteroide` · **Intenção:** construção
- **Por que existe:** é onde os dois conceitos da cena anterior viram campos preenchidos no projeto
  dela.
- **Conclui quando:** o `No grupo criar um asteroide em x y tamanho cor com vx vy` está dentro do
  relógio de 40 quadros, com x sorteado, y menos 30, tamanho 40, vx 0 e vy 3
- **Blocos:**
  1. `dialogue` (`fala-asteroide`): onde achar o bloco e onde encaixar.
  2. `dialogue` (`fala-campos-da-pedra`): os cinco campos, com a frase que separa o menos de lugar
     do menos de velocidade.
  3. `video` (`video-asteroide`, "A pedra que nasce fora da tela"): o gesto de pegar o bloco,
     encaixar o sorteio em cima do número e preencher os campos. **Cortar a explicação do sorteio e
     a do menos de y**, que agora estão na cena. **Cortar a frase "cada vez, o jogo sorteia um lugar
     novo"**, que promete o que o sorteio não garante. Duração alvo: 50 a 60 segundos.
  4. `studio`: conferência dos campos e do sorteio encaixado no x.
  5. `dialogue` (`fala-kit`): nota honesta sobre o kit. "Cada pedra nasce com um formato próprio, e
     o 40 é a medida de base. Elas não saem todas do mesmo tamanho, e é isso que deixa o céu
     bonito."

### Seção 6. As pedras caem, e o tiro passa reto

- **Chave:** `ciclo-asteroides` · **Intenção:** construção e dor
- **Por que existe:** o padrão mover, faxina e desenhar é o mesmo do Dia 2, e ela ganha a chuva de
  pedras num gesto só. A seção termina na falta que abre a seção seguinte.
- **Conclui quando:** `Mover os sprites do grupo usando suas velocidades`, `Tirar do grupo quem sair
  da tela, para cada um (chamado )` e `Desenhar o grupo` estão dentro do `A cada quadro do jogo`,
  nessa ordem, os três apontando para asteroides
- **Blocos:**
  1. `dialogue` (`fala-ciclo-asteroides`): o primeiro dos três blocos, com a âncora do Dia 2.
  2. `dialogue` (`fala-ciclo-limpeza`): os outros dois, e o grupo escolhido nos três.
  3. `video` (`video-ciclo-asteroides`, "O mesmo padrão, agora com as pedras"): o gesto dos três
     blocos. Manter a fala sobre reconhecer um padrão e montar mais rápido, que é boa e verdadeira.
     Cortar a chamada para o passo 5. Duração alvo: 45 a 55 segundos.
  4. `studio`: conferência dos três blocos apontando para asteroides, na ordem.
  5. `dialogue` (`fala-tiro-fantasma`): a dor, sozinha, fechando a seção. "Olha o seu jogo aí
     embaixo: as pedras já estão caindo, cada uma num lugar. Agora clica na área do jogo e aperta a
     barra de espaço mirando numa pedra. O tiro passa por dentro dela e continua subindo, como se a
     pedra não estivesse ali. O jogo ainda não sabe que esses dois podem se encontrar."

**A dor é real e está na gravação.** O trecho original diz "experimenta atirar num deles, o tiro
atravessa direto, como um fantasma". Ela só precisa sair de dentro do clipe do padrão e virar o
fecho da seção, sem a chamada para o passo seguinte.

### Seção 7. Quem some na trombada

- **Chave:** `trombada` · **Intenção:** exploração
- **Por que existe:** o bloco da colisão dá um apelido para cada participante, e escolher entre o
  apelido e o grupo inteiro é a diferença entre explodir uma pedra e apagar todas de uma vez.
- **Conclui quando:** as três metas de `collision-pair` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-trombada`): abertura curta. "Quando dois objetos se encostam no jogo, isso
     tem um nome: colisão. Existe um bloco que percebe todas as colisões entre dois grupos, e ele
     faz uma coisa esperta: dá um apelido para cada um dos dois que se bateram."
  2. `interactive` (`experiencia-trombada`): cena nova `collision-pair`, "Quem some na trombada?"
     (especificada abaixo). Elenco: nave e asteroide. Cenário: nave.

### Seção 8. Faça o acerto acontecer

- **Chave:** `colisao` · **Intenção:** construção
- **Por que existe:** a colisão e os quatro comandos dentro dela são um movimento só, o de fazer o
  acerto acontecer.
- **Conclui quando:** o `Para cada colisão entre os grupos e` está no motor com os quatro comandos
  dentro
- **Blocos:**
  1. `dialogue` (`fala-colisao`): o bloco da colisão, os dois grupos e os dois apelidos.
  2. `dialogue` (`fala-quatro-comandos`): os quatro comandos de dentro, na ordem, com o endereço
     corrigido da explosão.
  3. `video` (`video-colisao`, "Os dois que se bateram"): funde os dois clipes de hoje. Aproveitar
     inteira a explicação dos apelidos, que é a melhor fala da aula. Cortar o congelamento de três
     pares, que agora é a cena. **Corrigir o endereço da explosão**, que na gravação está em "Kit
     espaço". Duração alvo: 70 a 80 segundos.
  4. `studio`: conferência dos grupos, dos apelidos e dos quatro blocos no mesmo fazer.
  5. `dialogue` (`fala-retorno`): nomeia o padrão. "Explosão, barulho e, a partir de amanhã,
     tremida. Junto, isso tem nome de criador de jogo: é o retorno pro jogador. Custa pouco e faz o
     acerto parecer grande."

**Cinco encaixes, uma vitória.** Partir isso ao meio criaria uma seção que termina com um bloco
vazio.

### Seção 9. Teste, envie e fecha

- **Chave:** `entrega` · **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo rodando e guarda as duas ideias do dia.
- **Conclui quando:** a entrega é enviada e as duas perguntas são respondidas
- **Blocos:**
  1. `video` (`video-fecho`, "A sua chuva de pedras está pronta"): o teste do tiro que acerta e do
     tiro que erra, a conferência dos dois números, o gesto de enviar e, depois do envio, a conquista
     do dia com a ponte para o Dia 4. Duração alvo: 55 a 70 segundos.
  2. `quiz`: duas perguntas. A primeira corrige o relógio: onde hoje se lê "o relógio esperava
     2 segundos entre um asteroide e outro. Você troca para meio segundo", passa a ler "o seu
     relógio espera 40 quadros entre uma pedra e outra. Você troca para 20". A segunda aplica a
     descoberta dos apelidos a três pedras na tela: o tiro e só a pedra atingida desaparecem. Ela
     substitui a pergunta que repetia quase palavra por palavra o checkpoint da cena. A explicação
     reforça que as outras pedras continuam no jogo.
  3. `studio`: entrega, com os quinze critérios de estrutura já definidos no manifesto atual.

**Junta três seções de hoje**, e a entrega fica sem nenhum balão do Zappy.

**Por que o balão de teste saiu.** O Estúdio ocupa a coluna da direita sozinho, e tudo o que não é
ferramenta cai na esquerda, de cima para baixo. O `fala-teste` era passo a passo de gesto, que se
mostra na tela e não se descreve, então ele passou para o roteiro do clipe. Isso arrastou uma
segunda correção junto: o `video-fecho` não mostrava nem o teste nem o envio, e a regra manda que
toda seção com ferramenta tenha vídeo mostrando como se faz. Ele passa a ser teste, envio e fecho,
nessa ordem, e a recapitulação só chega depois do envio ter acontecido na tela.

## Experiências e demonstrações desta aula

### 1. `spawn` · Abra espaço entre as pedras · **EXISTE E JÁ AJUSTADA, PRESET `pedra-quadros`**

- **Situação:** a cena é exatamente a relação certa. Ela estava incompleta em relação ao que o
  próprio roteiro prometia, e a unidade de tempo dela brigava com o Estúdio. Os quatro ajustes foram
  feitos.
- **Ajuste 1, meta que faltava:** a cena tinha só `every-frame`. A meta do espaço foi criada com o
  id **`with-timer`**, rótulo "Com o relógio, sobrou espaço entre os cactos" (o nome do objeto vem
  do elenco) e pedido "Leve Criar cacto para dentro do relógio e deixe o tempo passar até nascerem
  dois cactos".
- **Ajuste 2, quadros no lugar de segundos:** feito pelo preset `pedra-quadros`, com `unit:
  "frames"` e os intervalos 20, 40 e 80, no lugar dos segundos do Corre Dino. É o número que ela
  escreve no bloco, e o documento de pedagogia trava essa escolha para o 2D. O preset entrou no
  manifesto nesta revisão: sem ele o bloco abria o relógio em segundos.
- **Ajuste 3, a queda fica igual dos dois lados:** a meta `same-fall` foi criada, com o rótulo "Com
  mais pedras nascendo, cada pedra desce na mesma velocidade" e o pedido "Troque o relógio de 40
  para 20 e compare quanto cada pedra desceu em 60 quadros". É o que o quiz cobra e o que nada na
  aula mostrava.
- **Ajuste 4, pergunta final:** mantida "Por que virou uma parede de pedras sem o relógio?", e a
  explicação do bloco já traz que o relógio decide de quanto em quanto tempo nasce uma pedra, e que
  quem faz cada uma descer é o vy.
- **Elenco:** nave e asteroide. **Cenário:** nave.
- **Metas cobradas nesta aula:** `every-frame`, `with-timer`, `same-fall`. As duas primeiras são a
  missão de fábrica da cena, e a `same-fall` é meta de caso, por isso o bloco declara as três.

### 2. `random` · De onde vem a próxima pedra · **EXISTE E JÁ AJUSTADA, PRESET `pedra-acima`**

- **Situação:** a cena foi escrita para o Corre Dino, onde o cacto nasce à direita da tela e tanto o
  lugar quanto a velocidade são sorteados. No Desafio só o x é sorteado, e o nascimento é em cima.
  A frase de sucesso dela é a melhor coisa que existe no catálogo para este conceito: "Cada
  sorteio saiu dentro dos limites que você deu, e às vezes repetiu".
- **Ajuste 1, girar o palco:** feito pelo preset `pedra-acima`, com `axis: "above"`. A régua do
  nascimento fica acima da borda de cima da tela, na faixa de y menos 30, com as marquinhas ao longo
  dela, e a pedra entra na tela pela borda de cima. O preset entrou no manifesto nesta revisão: sem
  ele o bloco abria a régua à direita, como no Corre Dino.
- **Ajuste 2, esconder o sorteio de velocidade:** feito pelo mesmo preset, com `speedModule: false`.
  As raias e a meta `velocities` não aparecem no Desafio. Neste jogo o vy é fixo em 3, e mostrar
  velocidade sorteada ensinaria uma coisa que o jogo dela não faz.
- **Ajuste 3, metas novas:** a `place-samples` que esta análise pediu **não foi criada**, e no lugar
  dela ficaram duas metas granulares, `positions` ("Saíram lugares diferentes") e `repeat`
  ("Um lugar repetiu"), porque são dois fatos diferentes e a frase de sucesso promete os dois
  separadamente. A `above` foi criada como pedida, com o rótulo "A régua fica acima da tela: a pedra
  nasce do lado de fora e entra caindo" e o pedido "Deixe o tempo passar até a primeira pedra entrar
  na tela".
- **Ajuste 4, pergunta final:** "Duas pedras seguidas nasceram quase no mesmo lugar. O que aconteceu
  com o sorteio?" As alternativas: "O sorteio quebrou e repetiu por engano" e "O sorteio não tem
  memória, e um lugar pode sair de novo" (correta). Explicação: "Sortear é escolher na hora, dentro
  dos limites. Nada impede que o mesmo lugar saia duas vezes seguidas." Está no bloco.
- **Elenco:** asteroide. **Cenário:** nave.
- **Metas cobradas nesta aula:** `positions`, `repeat`, `above`. São três, e não duas, porque a
  `place-samples` virou duas. As duas primeiras são da missão de fábrica, e a `above` é meta de
  caso, por isso o bloco declara as três.

### 3. `collision-pair` · Quem some na trombada? · **JÁ CONSTRUÍDA**

- **Id sugerido:** `collision-pair`
- **Título:** Quem some na trombada?
- **O conceito abstrato:** dentro de uma colisão entre dois grupos, cada apelido aponta para um
  participante daquele encontro, e não para o grupo inteiro.
- **Tipo:** experimentação. A relação tem botão, porque a criança escolhe o alvo de cada comando, o
  apelido ou o grupo, e vê quantos objetos somem.
- **O que a criança manipula:** dois seletores e dois botões. O seletor **o tiro que sai** alterna
  entre "tiro (o apelido)" e "tiros (o grupo inteiro)". O seletor **a pedra que sai** alterna entre
  "asteroide (o apelido)" e "asteroides (o grupo inteiro)". Os botões são **Deixar a trombada
  acontecer** e **Voltar ao começo**.
- **Como o palco começa:** três pedras caindo em três colunas e três tiros subindo, com só um tiro
  alinhado com a pedra do meio. Dois contadores à vista: "pedras no grupo: 3" e "tiros no grupo: 3".
  Os dois seletores começam no grupo inteiro.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `whole-group` | "Escolhendo o grupo, sumiu todo mundo" | "Deixe os dois seletores no grupo inteiro e deixe a trombada acontecer." |
  | `just-the-pair` | "Escolhendo os apelidos, sumiram só os dois que se bateram" | "Troque os dois seletores para os apelidos, volte ao começo e deixe a trombada acontecer." |
  | `others-stay` | "As outras pedras continuaram o caminho delas" | "Com os apelidos escolhidos, deixe o tempo passar até as outras duas pedras saírem pela borda de baixo." |
- **Pistas:**
  1. "Olhe os dois contadores antes e depois da trombada."
  2. "Só um tiro encostou numa pedra. Quantos sumiram?"
  3. "Troque o alvo dos dois comandos para os apelidos, tiro e asteroide, e faça de novo."
- **Palpite antes de abrir:** "Três tiros e três pedras estão no jogo. Um tiro encosta numa pedra, e
  o comando manda tirar o grupo asteroides. O que some?"
  - Só a pedra que foi atingida
  - Todas as pedras do jogo ✓
- **Pergunta depois de descobrir (conta para concluir):** "Dentro dessa colisão, quem é asteroide?"
  - A pedra que participou daquele encontro ✓
  - Todas as pedras do grupo ao mesmo tempo
- **Explicação ao acertar:** "O bloco dá um apelido para cada um dos dois que se encostaram. O
  apelido vale só dentro daquela trombada, e é por isso que as outras pedras continuam no jogo."
- **Frase de sucesso:** "O apelido aponta para um. O grupo aponta para todos."
- **Pergunta extra, do modelo:** "E se só um dos dois comandos usar o apelido?" Nasceu na construção
  e é o caso do meio, que a cena não cobra mas deixa a criança experimentar.
- **Onde mais serve:** Corre Dino, na colisão do dino com o grupo de cactos. O Jogo do Meu Jeito, na
  colisão da nave com o grupo. E no Dia 4 deste mesmo curso, onde o apelido `inimigo` repete a
  ideia com o bloco irmão, `Para cada sprite do grupo que colidir com o sprite`. É o conceito de
  apelido do vocabulário canônico, então serve a qualquer curso que use um laço de grupo.
- **Ações do motor:** a cena precisava de uma ação de alvo de comando (`target`, com os valores
  apelido e grupo) e de contadores por grupo. O avanço no tempo (`advance`) e o encontro (`collide`)
  já existiam, usados em `lives` e em `score`. Tudo construído.
- **Conferido contra o código:** metas, rótulos, pedidos, as três pistas, o palpite, a pergunta do
  fim, a explicação e a frase de sucesso saíram idênticos ao que esta análise pediu. A única coisa
  que a cena traz a mais é a pergunta extra acima.

### 4. `velocity` · O que move o Dino a cada quadro · **SAI DESTA AULA**

- **Situação:** a cena é boa e está no lugar certo, que é o Dia 2. A seção *Compare o sinal da
  velocidade* já usa essa cena para ensinar que o sinal manda na direção vertical, com o tiro.
- **Decisão:** retirar do Dia 3. O que é novo hoje não é o sinal da velocidade, é o sorteio e o
  nascimento fora da tela, e isso cabe em `random`. A confusão que sobra, o menos de y contra o
  menos de vy, é resolvida por uma frase na orientação, ao lado dos dois campos: "aqui o menos é
  lugar, não velocidade. Menos 30 quer dizer um pouquinho acima da tela".
- **Efeito colateral bom:** some o problema das metas inexistentes (`down` e `stopped`), porque o
  bloco que as pedia deixa de existir.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | A chuva de pedras chega | o jogo do fim do dia, com a chuva e uma explosão | `video-abertura-v6` | 25 a 35 s | fala parcial, tela regravada |
| `video-grupo-e-relogio` | O saquinho das pedras e o relógio vizinho | o segundo grupo e o relógio vizinho | `video-grupo-asteroides` + `video-relogio` | 55 a 65 s | funde dois clipes, tela regravada |
| `video-asteroide` | A pedra que nasce fora da tela | o bloco da pedra e seus campos | `video-asteroide` | 50 a 60 s | fala parcial, com dois cortes obrigatórios |
| `video-ciclo-asteroides` | O mesmo padrão, agora com as pedras | mover, faxina e desenhar do grupo novo | `video-ciclo-asteroides` | 45 a 55 s | fala sim, sem o fecho antigo |
| `video-colisao` | Os dois que se bateram | os apelidos e os quatro comandos | `video-encontro` + `video-colisao` | 70 a 80 s | funde dois clipes, com correção de endereço |
| `video-fecho` | A sua chuva de pedras está pronta | o teste do tiro que acerta e do que erra, os dois números conferidos, o envio, e a conquista do dia com a ponte para o Dia 4 | `video-fecho-v6` | 55 a 70 s | fala parcial, com teste e envio gravados novos |

**Saem da aula:** `video-nascer-fora`, porque a cena `random` faz o trabalho dele melhor, e
`video-teste-colisao`, porque o teste passa a ser a primeira metade do `video-fecho`.

**Saldo:** de 10 clipes para 6 blocos de vídeo, sendo 2 fusões de pares. Em minutagem a queda é
maior do que a contagem sugere, porque as três explicações conceituais (relógio, sorteio e apelido)
saíram da narração e foram para as cenas.

## Continuidade

- **Assume do Dia 2:** nave criada e controlada, grupo `tiros`, evento da barra de espaço com o tiro
  saindo do centro x e do topo y da nave, vy menos 9, som de tiro, e o trio mover, faxina e desenhar
  do grupo `tiros` dentro do `A cada quadro do jogo`. Assume também que o sinal da velocidade já foi
  concretizado ali.
- **Entrega para o Dia 4:** grupo `asteroides` em Ao iniciar. Relógio `A cada quadros` com 40,
  vizinho do `A cada quadro do jogo` dentro de Enquanto estiver rodando, com `No grupo criar um
  asteroide` dentro, usando x sorteado, y menos 30, tamanho 40, vx 0 e vy 3. No motor, depois do
  `Desenhar o grupo` dos tiros, o trio mover, faxina e desenhar do grupo `asteroides`. E, logo
  abaixo, `Para cada colisão entre os grupos e` com tiros e asteroides, apelidos tiro e asteroide, e
  quatro comandos dentro: tirar o tiro, tirar a pedra, soltar a explosão na pedra e tocar o efeito
  de explosão.
- **Valores canônicos que saem daqui:** intervalo 40 quadros · y de nascimento menos 30 · tamanho
  base 40 · vx 0 · vy 3 · nomes de grupo `tiros` e `asteroides` · apelidos `tiro` e `asteroide`.
- **Campos livres:** cor da pedra e cor da explosão. Nenhuma aula posterior cita essas cores como
  fato.
- **Aviso para o Dia 5:** o último bloco do motor, hoje, é o `Para cada colisão entre os grupos e`.
  O Dia 4 acrescenta mais três blocos depois dele, e é o último deles que o Dia 5 usa como fim da
  cadeia a ser embrulhada.

## Manifesto

Arquivo: `aulas/desafio-dia-3.manifesto.json`. Versão 4, `lessonSlug` `dia-3`, título
"A chuva de pedras". **26 blocos em 9 seções**, com 6 vídeos planejados, 3 cenas, 1 quiz e o
Estúdio da aula.

**O Estúdio** aparece uma vez em `blockKeys`, na seção `entrega`, e é referenciado por
`workspaceKey` nas seções `relogio`, `asteroide`, `ciclo-asteroides`, `colisao` e `entrega`.

**Seções divididas pela regra das duas colunas.** Três pares nasceram de uma seção só do desenho
didático, porque a cena nativa e o Estúdio embarcado disputam a coluna da direita:

| Seção do desenho | Virou | Motivo |
|---|---|---|
| Uma pedra de cada vez | `avalanche` (cena `spawn`) + `relogio` (Estúdio) | cena e Estúdio na mesma seção |
| De onde vem a próxima pedra | `sorteio` (cena `random`) + `asteroide` (Estúdio) | cena e Estúdio na mesma seção |
| Quem some na trombada | `trombada` (cena `collision-pair`) + `colisao` (Estúdio) | cena e Estúdio na mesma seção |

**Estado no validador:** `OK`, sem nenhum aviso de convenção. As três cenas existem no catálogo e a
fila de dependência desta aula está vazia.

**Cenas e metas, como o manifesto as declara hoje:**

1. **`collision-pair`, construída.** O bloco `experiencia-trombada` cobra `whole-group`,
   `just-the-pair` e `others-stay`, e o palpite de abertura revela em `whole-group`.
2. **`spawn`, com preset.** O bloco `experiencia-relogio` passou a declarar o preset `pedra-quadros`
   (relógio em quadros, intervalos 20, 40 e 80, pedra caindo) e a lista `every-frame`, `with-timer`
   e `same-fall`. Antes ele não declarava nada e herdava só a missão de fábrica, `every-frame` e
   `with-timer`: a seção fechava sem a comparação de 40 para 20 quadros que as instruções do bloco
   pedem, e sem o relógio em quadros.
3. **`random`, com preset.** O bloco `experiencia-sorteio` passou a declarar o preset `pedra-acima`
   (régua acima da tela, sem módulo de velocidade) e a lista `positions`, `repeat` e `above`. Antes
   ele declarava só `positions` e `repeat`, sem a `above`, e o palco abria com a régua à direita, do
   Corre Dino.

**Critérios de estrutura.** Todos os `projectChecks` e `blockType` do Estúdio foram copiados do
manifesto v6 desta mesma aula, sem nenhum tipo de bloco inventado. A entrega repete os quinze
critérios do v6.

**Campos livres.** Cor da pedra e cor da explosão não têm critério de valor, nem exato nem em faixa.
