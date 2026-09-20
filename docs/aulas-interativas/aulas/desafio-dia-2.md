# Desafio do Primeiro Jogo · Dia 2 · A nave atira

## Resumo

- **Estado de entrada:** exatamente o que o Dia 1 entrega. Projeto com **duas** áreas montadas (Ao
  iniciar e Enquanto estiver rodando), tela 800 por 480, sprite `nave` criado em x 400, y 410,
  tamanho 54 por 62, e o motor com limpar, estrelas velocidade 1, mover com as setas velocidade 7,
  manter dentro da tela e desenhar a nave. A terceira área entra hoje.
- **Vitória do dia:** ela aperta a barra de espaço e sai um tiro da nave, com som, que sobe e some
  lá em cima, de onde quer que a nave esteja.
- **Seções hoje:** 12 · **Seções propostas:** 11
- **Clipes hoje:** 9 · **Clipes propostos:** 8, com uma fusão, uma divisão, dois clipes cortados e um
  clipe novo na entrega
- **Cenas:** 4, todas construídas: 1 que serve como está, 1 já ajustada, 1 herdada do Dia 1 com
  preset próprio, e a `fixed-vs-read`, feita para este dia
- **Título da aula:** passa de "O tiro nasce na nave e sobe" (v6) para **A nave atira**
- **Manifesto:** `aulas/desafio-dia-2.manifesto.json`, 26 blocos e 11 seções. Estado no validador:
  **OK**, sem nenhum aviso de convenção. A `fixed-vs-read` entrou no catálogo, e a fila de
  dependência desta aula está vazia
- **Revisão da entrega, 20/09/2026:** os dois balões da seção saíram porque o Estúdio ocupa a coluna
  da direita sozinho e não existe "depois da ferramenta" na leitura da seção. Gesto e recapitulação
  passaram para o roteiro do `video-teste-e-envio`, que fecha depois do envio

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Grupo de sprites, uma ordem para muitos | Em parte. O grupo não aparece na tela | Não, sozinho | | | A prateleira do grupo aparece dentro da cena `cleanup`, mais adiante na aula, e a ordem única para muitos ela vê no próprio jogo ao disparar cinco tiros seguidos |
| **A terceira área, Quando acontecer** | Sim. Tempo é invisível, e "só quando acontecer" não tem desenho | **Sim** | Experimentação (`once-vs-always`, caso novo do Dia 2) | Antes de montar | A alternativa (pôr Criar tiro em Enquanto estiver rodando e ver a enxurrada) ela nunca pode ver no jogo dela sem quebrar o projeto. É o mesmo argumento do contrafactual da `layers` no Dia 1 |
| A tecla escolhida no menu | Não. É operação | Não | | Dita na hora do campo | Escolher item de menu não é conceito. Mas o erro é silencioso, então a fala diz a posição na lista |
| **Número escrito contra número lido na hora** | Sim. No bloco, os dois ocupam o mesmo buraco e parecem a mesma coisa | **Sim** | Experimentação (cena nova `fixed-vs-read`) | Antes de montar | É o conceito que sustenta o dia inteiro e a primeira pergunta do quiz. Hoje ele é só narração num vídeo de observação |
| O centro x e a posição y são medidas da caixa, não do desenho | Sim, e contraria o que ela vê | **Sim**, dentro da mesma cena | Marcas da caixa em `fixed-vs-read` | Junto | Cena separada repetiria o mesmo palco por uma precisão. E é a correção que o próprio README do v6 pede |
| Raio 5 e a cor do tiro | Não. São campos de escolha | Não | | Ditos na hora do campo | O raio é valor canônico e a cor é dela |
| **O sinal da velocidade para baixo** | Sim, e contraria a intuição: menos sobe | **Sim** | Experimentação (`velocity`, metas `up` e `down`) | Antes de escrever o número | Escrever menos 9 sem sentir o sinal é copiar. E o sinal volta no Dia 3, com os asteroides descendo |
| vx 0, o tiro não anda para os lados | Não | Não | | Dito na hora do campo | Ela lê o valor e vê o tiro subir reto |
| Som no evento, uma vez por disparo | Não neste dia | Não | | Nomeado na montagem | O som mora dentro do mesmo evento que cria o tiro, e hoje não existe um segundo lugar possível para montar a comparação. A cena `jump-sound` existe, mas o foco dela é escolher entre dois gatilhos, e aqui só há um |
| Mover o grupo inteiro com um bloco só | Não | Não | | | Ela dispara cinco tiros e vê os cinco andarem. Testa no jogo dela em dois segundos |
| A ordem dentro do motor: mover, tirar, desenhar | Em parte | Não | | | Camadas já foi concretizada no Dia 1 com a `layers`. Aqui a ordem é dita com âncora nos dois vizinhos e conferida pelos critérios |
| Agora o tiro fica por cima da nave | Já concretizado no Dia 1 | Não | | Uma frase no fim da construção | Volta porque **contraria** o que o Dia 1 afirmou ("a nave é a última coisa desenhada"). Não é conceito novo, é honestidade de continuidade |
| **Sair da tela não é sair do grupo** | Sim. Invisível por definição | **Sim** | Experimentação (`cleanup`) | Depois de ver os tiros voarem, antes de montar a regra | A dor existe e **não aparece** na tela dela. A cena é o instrumento que torna o vazamento visível, no lugar do sermão sobre lentidão |
| Segurar a tecla contra apertar uma vez | Sim, mas fora de escopo | Não | | | A paleta liberada hoje não tem a alternativa (não há "está apertada" nem recarga). Concretizar um conceito que ela não pode montar gasta seção. Fica para o curso que traz a recarga, onde a cena `hold-vs-press` já espera |
| Confirmar um campo e clicar na área do jogo | Não. É operação | Não | | Dentro do teste | A introdução ensina as três ações de testar. O Dia 2 usa e não reensina |

Quinze coisas, quatro concretizações. Onze conceitos não ganham cena, e é essa triagem que tira a
aula de 12 para 11 seções. A proposta pedagógica é de 8 movimentos; três deles se partem em duas
seções cada por causa da regra das duas colunas do player, explicado em cada caso abaixo.

## Diagnóstico do desenho atual

**O conceito mais importante do dia não tem dono.** Ler a posição da nave contra escrever um número
é a primeira pergunta do quiz e a razão de existir do dia inteiro, e hoje ele vive na seção 4
(*Observe de onde o tiro sai*), que é um vídeo para assistir. A criança ouve a explicação e nunca
vê o outro lado da comparação.

**Dois clipes contam a mesma coisa, um atrás do outro.** `video-origem` (seção 4) e
`video-criar-tiro` (seção 5) saem os dois da Parte 3 do roteiro gravado, e a narração do segundo
contém a do primeiro inteira, palavra por palavra: "Repara que o campo do x já vem com um número
dentro… pega o bloco o centro x do sprite e arrasta ele pra cima do número do x". A divisão
mecânica do v6 partiu uma Parte em dois clipes e duplicou a fala.

**A terceira área é montada como gesto.** A seção 3 (*Escute a barra de espaço*) tem dois blocos e
nenhuma concretização, embora Quando acontecer seja justamente a área que faz o jogo responder à
criança. É o mesmo defeito que o Dia 1 tinha com as duas primeiras áreas.

**Duas seções seguidas são preparação sem resultado na tela.** *Prepare o grupo dos tiros* e
*Escute a barra de espaço* somam três blocos, e nada muda no jogo dela ao fim das duas.

**A dor da faxina é encenada e não reproduz.** A seção 8 (*Mova, retire e desenhe os tiros*)
carrega da gravação: "Se ninguém tirar ele do jogo, ele continua existindo lá em cima, invisível,
ocupando espaço à toa. Com o tempo, isso deixa o jogo pesado e lento." Neste jogo nascem poucos
tiros, um por aperto, e a lentidão não aparece. A pedagogia oficial é explícita: conferir se a dor
reproduz antes de escrevê-la, porque encenar problema que a gravação não mostra quebra a confiança
da aula.

**Três blocos com naturezas diferentes viraram uma conferência só.** Ainda na seção 8: mover e
desenhar são o par que produz a vitória do dia, e tirar do grupo é a faxina, que é conceito, tem
cena pronta no catálogo (`cleanup`) e ninguém ligou.

**A vitória do dia não tem seção.** O primeiro disparo acontece no meio da seção 8, espremido entre
dois outros encaixes. O momento mais alto da aula não tem lugar próprio.

**Uma seção é um vídeo de alguém usando o jogo dela.** A seção 9 (*Observe o teste de dois
disparos*) mostra alguém andando para a esquerda, atirando, andando para a direita e atirando. Ela
faz isso sozinha em dois segundos, no próprio jogo, na seção de teste.

**O caso preparado da experiência deixa o tiro encostado no canto.** A seção 6 (*Compare o sinal da
velocidade*) roda cinco ações antes de a criança entrar: velocidade 10 para o lado e 5 para baixo
por 3 segundos, depois 10 e 0 por mais 0,6, e depois zero. O palco da `velocity` prende a figura
entre 0 e 540 no eixo do lado e entre menos 60 e 270 no eixo de cima e baixo, então o tiro termina
grudado no canto de baixo, à direita. Duas consequências: o roteiro descreve um começo que não é o
que ela vê ("O tiro está em x 240, y 210"), e a meta `down` não cai se ela experimentar o número
positivo primeiro, porque de lá o tiro não tem para onde descer.

**A promessa da pontinha.** A gravação diz "o tiro nasce na altura da nave, bem na pontinha dela".
A posição y do sprite é a borda de cima da caixa, e não a ponta do desenho do kit. O README do v6
já registrou a correção e ela ainda não entrou na fala.

**As falas param na subcategoria e uma delas usa rótulo que não existe mais.** A paleta atual tem
três gavetas, e as falas revisadas chegam só na segunda: "Em Jogo 2D, Grupos" para um bloco que
está em Jogo 2D › Grupos › **Criar e percorrer**, e "de Jogo 2D, Controles" para um bloco que está
em Jogo 2D › Controles › **Teclado, ações e toque**. Pior: a fala da seção 8 manda colocar
"Atualizar o grupo", e o bloco hoje se chama **Mover os sprites do grupo usando suas velocidades**,
em Jogo 2D › Grupos › Movimento. O molde exige caminho completo e rótulo literal.

**Um idiomatismo na fala gravada.** "a área que fica de ouvido em pé" é expressão figurada sem
marcação, e boa parte da turma lê ao pé da letra. Não é para reaproveitar, é para trocar.

**Quatro seções de fechamento.** Observar o teste, entregar, fechar e responder o quiz ocupam as
seções 9, 10, 11 e 12. No Dia 1 isso virou uma seção só.

## Proposta final

> **Nota de arquitetura.** A regra das duas colunas do player manda só uma coisa para a direita por
> seção: ou a cena, ou o Estúdio embarcado. Três movimentos desta aula pediam as duas coisas juntas,
> então viraram duas seções cada: as seções 2 e 3 (a terceira área, depois a montagem do grupo e do
> evento), as seções 6 e 7 (o sinal da velocidade, depois os dois números e o som) e as seções 9 e 10
> (a pergunta sobre o tiro que some, depois a faxina no motor). A intenção didática não mudou, e cada
> par continua sendo lido como um movimento só.

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** ela precisa ver o disparo acontecendo antes de montar a primeira peça.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "O primeiro disparo da sua nave"). O jogo do fim do Dia 2 rodando: a
     nave andando para os dois lados e atirando, com o som. Fala: "A sua nave já voa. Hoje você vai
     apertar a barra de espaço e ver um tiro sair dela, de onde ela estiver na tela. A gente vai
     ensinar o jogo a criar o tiro, a fazer ele subir e a mostrar ele na tela." Duração alvo: 25 a 35
     segundos.

### Seção 2. A área que fica esperando você

- **Intenção:** conceito
- **Por que existe:** Quando acontecer é a área que faz o jogo responder a ela, e hoje é montada
  como gesto.
- **Conclui quando:** as três metas do caso de `once-vs-always` caem e a pergunta é respondida
- **Blocos:**
  1. `video` (`video-terceira-area`, "A campainha do jogo"). O que é a terceira área, sem gesto
     nenhum. Fala: "No Dia 1 você montou duas áreas: a Ao iniciar, que acontece uma vez, e a Enquanto
     estiver rodando, que é o motor e repete sem parar. Hoje entra a terceira, que se chama **Quando
     acontecer**. Ela fica esperando. É como a campainha da sua casa: ela não toca sozinha nem toca o
     tempo todo, ela toca na hora em que alguém aperta. O que você põe dentro dela acontece na hora
     em que a coisa acontece, e isso tem um nome: **evento**." Duração alvo: 30 a 40 segundos.
  2. `interactive`. Cena `once-vs-always`, preset `tres-caixas-tiro` (especificado abaixo). Elenco:
     nave. Cenário: nave. Metas cobradas: `on-event`, `key-fires`, `flood`.

### Seção 3. Monte o grupo dos tiros e a área que espera a tecla

- **Intenção:** construção
- **Por que existe:** o saquinho dos tiros e o ouvinte da tecla são o mesmo movimento, o de preparar
  o lugar onde o disparo vai nascer.
- **Conclui quando:** o projeto tem `Criar grupo de sprites` com o nome tiros no fim de Ao iniciar e
  `Quando apertar a tecla` com a barra de espaço dentro de `Quando acontecer`
- **Blocos:**
  1. `dialogue`. O grupo, com caminho completo e âncora: "Primeiro o saquinho. Em **Jogo 2D › Grupos
     › Criar e percorrer**, pegue **Criar grupo de sprites** e encaixe dentro do Ao iniciar, logo
     abaixo do Criar nave. Ele já vem com o nome **asteroides** escrito: clique nesse nome e troque
     para **tiros**. O grupo começa vazio, e cada disparo vai colocar um tiro nele."
  2. `dialogue`. A área: "Agora a área. Em **Áreas do projeto**, pegue **Quando acontecer** e solte
     ao lado das outras duas, com um espacinho. Dentro dela, encaixe **Quando apertar a tecla**, que
     está em **Jogo 2D › Controles › Teclado, ações e toque**. Ele tem um menu de teclas: abra e
     escolha a barra de espaço."
  3. `video` (`video-montar-grupo-e-evento`, "O grupo dos tiros e a tecla que o jogo escuta"). Os
     gestos das três peças de uma vez, fusão dos dois clipes de hoje. Duração alvo: 55 a 65 segundos.
  4. `studio`. Conferência do grupo e do evento.

**Por que as seções 2 e 3 são duas, e não uma.** No desenho pedagógico elas são um movimento só. No
player, a cena e o Estúdio disputariam a coluna da direita. Separadas, cada uma ocupa a bancada
inteira, que é a leitura certa das duas.

**Por que junta duas seções de hoje.** Criar o saquinho e montar o ouvinte do teclado são um
movimento só. Separados, cada metade é um encaixe sem conceito.

**A posição de "barra de espaço" no menu de teclas é a quinta.** Medida no código em 20/09/2026
(`sz_g2d_on_key`): quatro setas, barra de espaço, Enter, Escape e as letras. O molde exige dizer a
posição quando o erro é silencioso, e escolher a tecla errada é exatamente isso: nada quebra, o jogo
só não responde.

### Seção 4. O número escrito e o número lido

- **Intenção:** conceito
- **Por que existe:** no bloco seguinte ela vai arrastar dois blocos por cima de dois números. Sem
  sentir a diferença antes, ela faz um gesto de encaixe sem saber o que ganhou com ele.
- **Conclui quando:** as três metas de `fixed-vs-read` caem e a pergunta é respondida
- **Blocos:**
  1. `dialogue`. Abertura curta, sem vídeo: "O campo do x do tiro já vem com um número escrito
     dentro. Um número escrito continua o mesmo para sempre. Só que existe outro jeito: em vez de
     escrever, o jogo pode ir perguntar onde a nave está, bem na hora do disparo. Vamos ver os
     dois lado a lado."
  2. `interactive`. Cena `fixed-vs-read`, "O número escrito e o número lido". Cenário: nave, que já
     traz nave e tiro de fábrica nos dois papéis do palco.

**Sem vídeo, de propósito.** O clipe de hoje (`video-origem`) repete inteira a narração do clipe
seguinte, e a cena mostra a comparação que a narração só consegue descrever.

**Esta era a seção que segurava a importação.** A `fixed-vs-read` foi construída e está no catálogo,
com as três metas, as três pistas, o palpite e a pergunta do fim. O manifesto desta aula deixou de
ficar em AGUARDA e passa no validador.

### Seção 5. Faça o tiro nascer na nave

- **Intenção:** construção
- **Por que existe:** é o encaixe mais delicado da aula, o de arrastar um bloco por cima de um
  campo que já tem número.
- **Conclui quando:** dentro de `Quando apertar a tecla` com a barra de espaço existe `Criar tiro
  no grupo` com o grupo tiros, com `o centro x do sprite` da nave no x, `a posição y do sprite` da
  nave no y, e raio 5
- **Blocos:**
  1. `dialogue`. "Em **Jogo 2D › Grupos › Criar e percorrer**, pegue **Criar tiro no grupo** e
     encaixe dentro do Quando apertar a tecla. Confira se o grupo escolhido é **tiros**. Agora os
     dois blocos de leitura. Em **Jogo 2D › Movimento › Posição e tamanho**, pegue **o centro x do
     sprite** e arraste **por cima** do número que está no x, até dar o clique de encaixe, e
     escolha **nave** nele."
  2. `dialogue`. "Na mesma gaveta, pegue **a posição y do sprite**, arraste por cima do número do y,
     e escolha **nave** também. Faltam dois campos: o **raio** é o tamanho da bolinha, deixe 5. E a
     **cor** é sua, capricha."
  3. `video` (`video-criar-tiro`, "O tiro nasce na nave"). O gesto, com aproximação no momento de
     arrastar o bloco por cima do número. **Trocar a promessa da pontinha:** onde a gravação diz "o
     tiro nasce na altura da nave, bem na pontinha dela", a fala nova diz "o tiro nasce no meio da
     nave e na altura da borda de cima dela". Duração alvo: 55 a 65 segundos.
  4. `studio`. Conferência dos dois blocos de leitura apontando para nave.

**A fala virou duas.** O balão do Zappy tem limite de 400 caracteres, e a orientação inteira passava
disso. O corte é natural: primeiro o encaixe do x, depois o do y com os dois campos que sobram.

### Seção 6. O menos que manda para cima

- **Intenção:** conceito
- **Por que existe:** o sinal do número decide o lado, e o lado que o menos escolhe é o contrário
  do que qualquer um chutaria.
- **Conclui quando:** as duas metas do caso de `velocity` caem e a pergunta é respondida
- **Blocos:**
  1. `dialogue`. "Faltam dois números no Criar tiro, e eles são a velocidade: o **vx** é para os
     lados e o **vy** é para cima e para baixo. Quem decide o lado é o sinal, e o sinal aqui é uma
     surpresa. Olha."
  2. `interactive`. Cena `velocity`, caso do Dia 2, com o palco consertado. Elenco: tiro. Cenário:
     nave. Metas cobradas: `up` e `down`.

### Seção 7. Escreva a velocidade e ponha o som

- **Intenção:** construção
- **Por que existe:** depois de sentir o sinal, escrever menos 9 é um gesto de dois segundos, e o
  som mora dentro do mesmo evento.
- **Conclui quando:** o Criar tiro está com vx 0 e vy menos 9, com `Tocar efeito` logo abaixo,
  dentro do mesmo evento
- **Blocos:**
  1. `dialogue`. "Agora os números. No Criar tiro, deixe o **vx** em 0, porque o tiro não anda
     para os lados. No **vy**, escreva menos 9. Depois o som: em **Jogo 2D › Som › Efeitos
     prontos**, pegue **Tocar efeito** e encaixe logo abaixo do Criar tiro, ainda dentro do Quando
     apertar a tecla. No menu do efeito, escolha **tiro**. Como ele está dentro do evento, o som
     toca uma vez em cada disparo."
  2. `video` (`video-velocidade-som`, "A velocidade e o som do tiro"). Os dois campos e o bloco de
     som. **Cortar a explicação do sinal**, que agora é da cena. Duração alvo: 40 a 50 segundos.
  3. `studio`. Conferência do vy, do vx e da ordem do som.

**A cena vem antes do vídeo aqui**, ao contrário das seções 2 e 3, porque o conceito é o sinal e o
gesto é só escrever dois números num bloco que já está montado.

### Seção 8. Os tiros voam

- **Intenção:** construção
- **Por que existe:** é a vitória do dia, e ela merece uma seção só. Dois blocos no motor e a barra
  de espaço passa a valer.
- **Conclui quando:** dentro do `A cada quadro do jogo` existem `Mover os sprites do grupo usando
  suas velocidades` e `Desenhar o grupo`, os dois com o grupo tiros
- **Blocos:**
  1. `dialogue`. "Volta no motor, o **A cada quadro do jogo**. Em **Jogo 2D › Grupos ›
     Movimento**, pegue **Mover os sprites do grupo usando suas velocidades** e encaixe dentro do
     motor, logo abaixo do Desenhar o sprite da nave. Escolha o grupo **tiros**. É ele que empurra
     cada tiro para cima, usando a velocidade que você escreveu."
  2. `dialogue`. "Depois, em **Jogo 2D › Grupos › Desenho e ordem**, pegue **Desenhar o grupo**,
     encaixe logo abaixo desse, e escolha **tiros** também. Agora clica na área do jogo e aperta a
     barra de espaço."
  3. `video` (`video-tiros-voam`, "Mover e desenhar o grupo"). Os dois blocos e o primeiro disparo,
     com o som. Duração alvo: 45 a 55 segundos.
  4. `studio`. Conferência dos dois blocos do grupo.
  5. `dialogue`. A nota de camadas, que é continuidade e não conceito novo: "Uma coisa mudou desde
     ontem. No Dia 1 a nave era a última coisa desenhada em cada quadro. Agora tem uma coisa
     desenhada depois dela, que é o grupo dos tiros, e é por isso que o tiro aparece por cima da
     nave no instante em que nasce. Quem é desenhado depois fica na frente, igualzinho ao que você
     viu ontem."

**Sem cena.** Ela aperta a tecla e vê. Concretizar aqui seria redundante.

**Sobre o critério desta seção.** O manifesto v6 confere o bloco que move o grupo com uma ordem
amarrada à faxina (`Mova tiros antes de limpar o grupo`), e a faxina só entra na seção 10. Aqui a
mesma regra é cobrada sem essa ordem, porque o bloco da faxina ainda não existe no projeto dela. A
ordem completa dos três blocos volta inteira, como está no v6, na seção 10 e na entrega.

### Seção 9. Para onde vai o tiro que sai da tela

- **Intenção:** conceito
- **Por que existe:** o tiro que sai por cima continua no grupo, e isso não aparece em lugar nenhum
  da tela dela. A cena é o instrumento que torna o vazamento visível.
- **Conclui quando:** as duas metas de `cleanup` caem e a pergunta é respondida
- **Blocos:**
  1. `dialogue`. "Aperta a barra de espaço umas cinco vezes e olha o seu jogo. Os tiros somem lá
     em cima, né? Agora a pergunta: eles sumiram **do jogo**, ou sumiram só **da tela**? Dá para
     olhar por dentro."
  2. `interactive`. Cena `cleanup` com o elenco do Desafio. Elenco: tiro no papel do obstáculo.
     Cenário: nave.

**Por que a dor vem depois da vitória.** A ordem é: os tiros voam (Seção 8), e só então a pergunta
sobre o que acontece com eles. Ao contrário, ela olharia a prateleira de um grupo que ainda não
tem nada dentro.

### Seção 10. Ponha a faxina entre os dois blocos

- **Intenção:** construção
- **Por que existe:** depois de ver o vazamento, a regra ganha sentido, e o encaixe no meio é o
  primeiro da aula.
- **Conclui quando:** `Tirar do grupo quem sair da tela` está entre o `Mover os sprites do grupo` e
  o `Desenhar o grupo`, com o grupo tiros
- **Blocos:**
  1. `dialogue`. "Isso tem um nome: **faxina**. Em **Jogo 2D › Grupos › Participação e limpeza**,
     pegue **Tirar do grupo quem sair da tela, para cada um**, e encaixe **entre** o Mover os
     sprites do grupo e o Desenhar o grupo. Escolha o grupo **tiros**. Esse bloco tem um espaço de
     fazer dentro dele, que serve para mandar alguma coisa acontecer quando alguém sai. Hoje ele
     fica vazio."
  2. `video` (`video-faxina`, "A peça que entra no meio"). O encaixe entre dois blocos que já
     existem, com aproximação no momento em que a peça abre espaço no meio. Duração alvo: 35 a 45
     segundos.
  3. `studio`. Conferência da ordem dos três blocos do grupo.

**Por que as seções 9 e 10 são duas, e não uma.** Pela regra das colunas: a cena `cleanup` e a
conferência do Estúdio disputariam a direita. A separação também deixa a pergunta da seção 9 sem
resposta pronta ao lado, que é o que faz a cena valer.

**A honestidade destas duas seções.** A gravação promete que sem a faxina "o jogo fica pesado e
lento". Neste jogo isso não acontece: nasce um tiro por aperto e nenhuma criança vai ver o jogo
engasgar. Essa promessa sai. O que fica é o que a cena mostra de verdade, que os tiros continuam
guardados no grupo depois de sumir da tela, mais a frase honesta de que a faxina existe para o jogo
não carregar o que já foi embora.

**Sobre o encaixe no meio.** É o primeiro da aula, e o molde manda nomear os dois vizinhos, que é o
que a fala faz. O vídeo precisa mostrar a peça abrindo espaço entre os dois blocos, porque o
instinto é soltar no fim.

### Seção 11. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo rodando e guarda as duas ideias do dia.
- **Conclui quando:** a entrega é enviada e as duas perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): o clique na área do jogo, os dois disparos de lugares
     diferentes com a marquinha visual a cada som, os três números conferidos campo a campo, o
     gesto de enviar na tela e, depois do envio, o fecho do dia. **Entrou pela regra de que toda
     seção com o Estúdio embarcado tem um vídeo mostrando como se faz.** Duração alvo: 50 a 60
     segundos.
  2. `quiz`. As duas perguntas atuais, mantidas. A primeira cobra a leitura da posição e a segunda
     cobra a faxina, e as duas agora têm cena por trás.
  3. `studio`. Entrega, com os oito critérios de estrutura já definidos no manifesto atual.

**Junta quatro seções de hoje**, e a entrega fica sem nenhum balão do Zappy.

**Por que nenhum balão sobrou aqui.** O Estúdio ocupa a coluna da direita sozinho, e tudo o que não
é ferramenta cai na esquerda, de cima para baixo. Não existe "depois do Estúdio", então qualquer
coisa escrita nesta seção é lida antes do envio. Os dois balões foram para o clipe:

- O teste (`fala-teste`) era passo a passo de gesto, que se mostra na tela. Ele já estava inteiro no
  roteiro do clipe, inclusive a conferência dos três números.
- O fecho (`fala-fecho`) era a recapitulação do dia com a ponte para o Dia 3. Virou a fala final do
  clipe, depois do envio já ter acontecido na tela. A ponte foi junto, pelo mesmo motivo do Dia 1:
  num balão antes do vídeo ela anunciaria o Dia 3 antes de o Dia 2 estar fechado.

## Experiências e demonstrações desta aula

### 1. `once-vs-always` · Uma vez, sempre, e agora "quando acontecer" · **JÁ CONSTRUÍDA, PRESET `tres-caixas-tiro`**

- **Situação:** a cena foi proposta no Dia 1 e **já foi construída**, com suporte a preset. O Dia 2
  **não pede uma cena nova**: pede o preset de três caixas, que acrescenta a caixa `Quando
  acontecer`, a ficha `Criar um tiro` e o botão de apertar a tecla, no mesmo palco. O manifesto desta
  aula declara o preset `tres-caixas-tiro` e cobra `on-event`, `key-fires` e `flood`.
- **Por que reaproveitar e não criar:** o conceito é o mesmo, e o que a criança manipula é o mesmo,
  o **onde**. O Dia 1 ensina que o onde decide se a ação acontece uma vez ou sempre. O Dia 2
  acrescenta o terceiro onde, que é "na hora em que a coisa acontece". Uma cena nova repetiria o
  palco inteiro para acrescentar uma caixa.
- **O que o preset acrescenta ao palco:**
  - Uma terceira caixa, **Quando acontecer**.
  - Uma quarta ficha de ação, **Criar um tiro**.
  - Um botão **Apertar a tecla**, que dispara o evento.
- **Metas novas, cobradas só neste caso**, com o texto como a cena construída o traz:
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `on-event` | "Em Quando acontecer, a ação ficou esperando" | "Ponha a ficha do evento em Quando acontecer e avance três quadros sem apertar a tecla." |
  | `key-fires` | "A tecla fez a ação acontecer na hora" | "Com a ficha do evento em Quando acontecer, aperte a tecla." |
  | `flood` | "Em Enquanto estiver rodando, nasceu um tiro em cada quadro" | "Ponha Criar um tiro em Enquanto estiver rodando e avance cinco quadros." |

  **Divergência de texto, e o código vence.** Esta análise escreveu os dois primeiros pedidos com o
  nome literal da ficha ("Ponha Criar um tiro em..."). A cena ficou com "a ficha do evento", que é a
  forma parametrizada, porque a mesma meta serve ao preset `tres-caixas-som` do Corre, Dino!, onde a
  ficha é `Tocar efeito`. O `flood` é a exceção e ficou com o texto literal do tiro.
- **As três metas do Dia 1** (`once`, `always`, `both`) não são cobradas de novo. Na revisita a
  faixa já mostra "✓ Você já descobriu isto", que é o comportamento que a cena tem.
- **Pistas do caso:**
  1. "Ponha Criar um tiro em Quando acontecer e avance os quadros sem encostar na tecla."
  2. "Agora aperte a tecla e olhe o contador de quadros: em qual deles o tiro nasceu?"
  3. "Arraste a mesma ficha para Enquanto estiver rodando e avance cinco quadros."
- **Palpite antes de abrir:** "Você quer que o tiro saia só quando o jogador apertar a tecla. Se
  você puser Criar um tiro em Enquanto estiver rodando, o que acontece?"
  - Nasce um tiro em cada quadro, sem parar ✓
  - Nasce um tiro só, quando você apertar
- **Pergunta depois de descobrir:** "Onde vai a ação de criar o tiro?"
  - Em Quando acontecer, na tecla ✓
  - Em Enquanto estiver rodando
- **Explicação ao acertar:** "Quando acontecer é a área que fica esperando. O que está dentro dela
  não acontece sozinho e não acontece sempre: acontece na hora em que a coisa que ela espera
  acontece."
- **Frase de sucesso do caso:** "Ao iniciar é uma vez. Enquanto estiver rodando é sempre. Quando
  acontecer é na hora."
- **Onde mais serve:** em todo curso da grade que tenha uma tecla, um clique ou uma colisão, o que
  é praticamente todos. A meta `flood` ainda planta a dor do Dia 3, quando a criação de asteroides
  vai precisar do relógio.

### 2. `fixed-vs-read` · O número escrito e o número lido · **JÁ CONSTRUÍDA**

- **Conceito:** um número escrito no campo continua o mesmo para sempre. Um bloco de leitura vai
  perguntar onde a nave está, bem na hora em que a ação acontece, e responde com o número daquele
  instante.
- **Tipo:** experimentação. A relação tem botão, e são dois: onde a nave está, e de onde vem o x do
  tiro. Dá para escrever "quando eu movo a nave, o tiro nasce em X", e a resposta muda conforme a
  chave.
- **O que a criança manipula:**
  - **Onde a nave está**, um controle deslizante de x, de 0 a 800.
  - **De onde vem o x do tiro**, uma chave de duas posições: **o número 400** ou **o centro x da
    nave**.
  - **Atirar**, um botão que cria um tiro e deixa uma marquinha no lugar onde ele nasceu.
  - **Mostrar as marcas da caixa da nave**, um interruptor que desenha duas linhas: o centro x e a
    borda de cima.
  - **Limpar as marcas**, um botão.
- **Como o palco começa:** a nave no meio, x 400. A chave em **o número 400**. Nenhuma marquinha na
  tela. As marcas da caixa desligadas.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `same-spot` | "Com o número escrito, os dois tiros nasceram no mesmo lugar" | "Com o x em o número 400, atire, leve a nave para outro lugar e atire de novo." |
  | `follows` | "Com a leitura, o tiro nasceu onde a nave estava" | "Troque para o centro x da nave, leve a nave para outro lugar e atire." |
  | `box-marks` | "O tiro sai do meio da caixa e da borda de cima dela" | "Ligue as marcas da caixa da nave e atire com o centro x da nave." |
- **Pistas:**
  1. "Atire, depois arraste a nave para longe e atire de novo. Olhe as duas marquinhas."
  2. "Troque de onde vem o x do tiro e repita: atire, arraste a nave, atire."
  3. "Ligue as marcas da caixa e olhe por onde o tiro sai."
- **Palpite antes de abrir:** "O x do tiro está com o número 400 escrito. Você leva a nave para a
  beirada da direita e atira. De onde sai o tiro?"
  - Do meio da tela, onde está o 400 ✓
  - De perto da nave
- **Pergunta depois de descobrir:** "A nave anda o tempo todo. O que faz o tiro novo nascer sempre
  nela?"
  - Ler o centro x da nave na hora do disparo ✓
  - Escrever o número 400 no x do tiro
- **Explicação ao acertar:** "O número escrito fica igual para sempre. O bloco de leitura pergunta
  onde a nave está bem na hora do disparo, e responde com o número daquele instante. Por isso o
  tiro acompanha a nave, e o tiro que já saiu segue o caminho dele."
- **Frase de sucesso:** "Número escrito é sempre o mesmo. Número lido é o de agora."
- **Pergunta extra, do modelo:** "E se a nave andar depois do disparo? O tiro que já saiu muda de
  caminho?" Ela nasceu na construção e responde exatamente a dúvida que a explicação do fim deixa.
- **Papéis do palco:** `hero` (a nave) e `scenery` (o tiro). No cenário `nave`, esses dois papéis
  já trazem de fábrica as figuras certas, nave e tiro, então a cena nasce sem elenco declarado, e o
  bloco `experiencia-escrito-e-lido` de fato não declara nenhum.
- **Onde mais serve:** em todo curso em que alguma coisa nasce em cima de outra. Corre, Dino! e O
  Jogo do Meu Jeito usam o mesmo par de blocos de leitura, e a grade inteira do Iniciante 2D tem
  disparo, moeda que nasce sobre um sprite ou efeito que aparece onde o personagem está. A cena
  também é a antessala da `aim`, que é a mesma ideia com direção em vez de posição.
- **Achado de vizinhança, já resolvido:** o cenário `nave` define de fábrica `scenery: tiro`. O
  Dia 1 pedia a `layers` com a nave e o **fundo de estrelas** nesse mesmo papel, o que exigia figura
  declarada. Os dois foram resolvidos no mesmo lote: a figura `estrelas` entrou em `SCENE_FIGURES` e
  o bloco do Dia 1 a declara.
- **Divergência entre o especificado e o construído, e o código vence:** o pedido da meta
  `box-marks` foi escrito aqui como "Ligue as marcas da caixa da nave e atire", e a cena construída
  pede "Ligue as marcas da caixa da nave e **atire com o centro x da nave**". A versão do código é
  mais precisa, porque com o número escrito a marca não sai do meio da caixa, e a tabela acima já
  foi atualizada para ela. Nada mais diverge: metas, pistas, palpite, pergunta do fim, explicação e
  frase de sucesso saíram idênticos ao que esta análise pediu.

### 3. `velocity` · O que move o tiro a cada quadro · **EXISTE E SERVE, CASO JÁ CONSERTADO**

- **Situação:** serve. As metas `up` ("Velocidade negativa levou para cima") e `down`
  ("Velocidade positiva levou para baixo") foram criadas exatamente para este dia e estão no
  catálogo como metas de caso. A instrução, as pistas e a pergunta que a aula escreve por cima já
  falam do eixo de cima e baixo, que é o certo, porque a missão de fábrica da cena é a do eixo do
  lado.
- **Conserto aplicado, e é no caso, não na cena:** as cinco ações que preparavam o palco no v6
  (velocidade 10 e 5, avança 3 segundos, velocidade 10 e 0, avança 0,6, velocidade 0 e 0) levavam o
  tiro até os dois limites do palco e o deixavam encostado no canto de baixo, à direita. De lá, o
  número positivo não tem para onde descer, e a meta `down` não cairia se ela experimentasse o
  positivo primeiro. O bloco `experiencia-direcao` traz as três ações novas: velocidade 5 para o
  lado e 0 para baixo, avança 1,5 segundo, velocidade 0 e 0. O tiro fica com espaço para subir e
  para descer.
- **Conserto de texto:** a instrução do bloco descreve o palco depois do caso, "O tiro está parado
  no meio da tela", e não mais o palco de fábrica.
- **Elenco:** tiro no papel do herói. **Cenário:** nave.
- **Metas cobradas nesta aula:** `up` e `down`, declaradas no bloco. As de fábrica (`moves`, `left`,
  `stopped`) ficam de fora, porque a lista declarada substitui a missão padrão.

### 4. `cleanup` · Para onde vai o tiro que sai da tela · **EXISTE E JÁ AJUSTADA, PRESET `tiro-cima`**

- **Situação:** a cena é exatamente o conceito da faxina, e tem as duas metades: `invisible-stored`
  ("Saiu da tela e ficou no grupo") é a dor, e a segunda meta ("A regra tirou do grupo quem saiu") é
  a ferramenta. O palco mostra a tela do jogo e os bastidores lado a lado, com a prateleira
  enchendo. É o instrumento que faltava para a faxina do Dia 2 parar de depender de uma lentidão que
  não acontece.
- **Ajustes, e o que aconteceu com cada um:**
  1. **O elenco é o do papel `obstacle`, e não o do herói.** O palco desta cena desenha só o
     obstáculo. O bloco `experiencia-faxina` declara `obstacle` com o nome tiro, no cenário `nave`.
     Declarar em `hero` deixaria o palco vazio. Feito.
  2. **As palavras "cacto" e "cactos" no palco e na nota da chave** passam pelo elenco, como no
     resto das cenas. É item de código, não de manifesto.
  3. **O rótulo da chave se alinhou ao bloco do Estúdio**, "Tirar do grupo quem sair da tela, para
     cada um". A instrução e as três pistas do bloco já usam esse nome.
  4. **A saída virou parâmetro do caso**, e é o que o preset `tiro-cima` faz: `exit: "top"` e
     `incoming: false`, ou seja, os tiros saem pela borda de cima e não há o quarto sprite chegando,
     que é só do Corre Dino. Sem o preset, o bloco abria o palco do Corre Dino, com a saída pela
     esquerda, contradizendo o jogo dela. O preset entrou no manifesto nesta revisão.
- **Elenco:** tiro no papel do obstáculo. **Cenário:** nave (fundo de estrelas, sem chão, e as
  figuras flutuam, que é o certo para este jogo).
- **Metas cobradas nesta aula:** `invisible-stored` e `rule-removes`, que são as duas da missão de
  fábrica da cena. O bloco desta aula declara as duas.
- **Onde mais serve:** Corre, Dino! já usa, com o preset `cacto-esquerda`. Com o elenco e a saída
  resolvidos, passa a servir todo curso com grupo e nascimento contínuo, que é a regra "todo exemplo
  com spawn contínuo tem faxina".

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem (chave v6) | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O primeiro disparo da sua nave | o jogo do fim do dia: a nave anda e atira | `video-abertura-v6` | 25 a 35 s | fala parcial, tela regravada |
| `video-terceira-area` | A campainha do jogo | o que é a área Quando acontecer | `video-espaco`, parte conceitual | 30 a 40 s | fala parcial, o idiomatismo sai |
| `video-montar-grupo-e-evento` | O grupo dos tiros e a tecla que o jogo escuta | os gestos das três peças | `video-grupo-tiros` + `video-espaco` | 55 a 65 s | funde dois clipes, tela regravada |
| `video-criar-tiro` | O tiro nasce na nave | encaixar os dois blocos por cima dos números, raio e cor | `video-criar-tiro` | 55 a 65 s | fala sim, com a correção da borda de cima |
| `video-velocidade-som` | A velocidade e o som do tiro | os dois números e o som dentro do evento | `video-velocidade-som` | 40 a 50 s | fala parcial, o sinal sai para a cena |
| `video-tiros-voam` | Mover e desenhar o grupo | mover e desenhar o grupo, e o primeiro disparo | `video-ciclo-tiros`, dois primeiros terços | 45 a 55 s | fala parcial |
| `video-faxina` | A peça que entra no meio | encaixar entre dois blocos que já existem | `video-ciclo-tiros`, último terço | 35 a 45 s | fala parcial, a lentidão sai |
| `video-teste-e-envio` | Dois tiros de dois lugares e o envio | os dois disparos de posições diferentes, os três números conferidos, o gesto de enviar, e o fecho do dia depois do envio | novo, com `video-testar` do v6 como referência de tela | 50 a 60 s | não, gravação nova |

**Saldo:** de 9 clipes para 8. Saem `video-origem` (a cena faz melhor e o clipe era repetido) e
`video-fecho-v6` como clipe próprio, com a recapitulação dele virando a fala final do
`video-teste-e-envio`, depois do envio, como no Dia 1. `video-grupo-tiros` e `video-espaco` se fundem
num clipe de gesto, e a parte conceitual do `video-espaco` vira um clipe curto próprio.
`video-ciclo-tiros` se divide em dois, porque metade dele é a vitória e a outra metade é a faxina. O
teste volta a ter clipe, agora com o envio dentro dele, pela regra de que toda seção com o Estúdio
embarcado tem um vídeo mostrando como se faz.

> A primeira linha de cada `plannedVideo` no manifesto é `Título: <nome do vídeo>`, e é a coluna
> "Título do vídeo" desta tabela que manda nela.

**Toda a tela é regravação.** O mapa de montagem já marca os nove clipes como
`regravar-estudio-atual`, e a paleta mudou de nome em pelo menos três lugares que aparecem na
narração antiga: "subcategoria Muitos" virou Grupos, "Kit espaço" virou Som › Efeitos prontos, e
"Atualizar (mover) o grupo" virou Mover os sprites do grupo usando suas velocidades.

## Continuidade

- **Assume do Dia 1:** as duas áreas montadas, a tela 800 por 480, o sprite `nave` em x 400, y 410,
  54 por 62, e o motor com limpar, estrelas velocidade 1, mover com as setas velocidade 7, manter
  dentro da tela e desenhar a nave. E assume as três ações de testar, que a introdução ensina.
- **Entrega para o Dia 3:** tudo do Dia 1, mais o grupo `tiros` criado no fim de Ao iniciar, a área
  Quando acontecer com `Quando apertar a tecla` na barra de espaço, dentro dela o `Criar tiro no
  grupo` lendo o centro x e a posição y da nave com raio 5, vx 0 e vy menos 9, seguido do `Tocar
  efeito` com o som de tiro, e no motor, abaixo do desenho da nave, os três blocos do grupo na
  ordem mover, tirar e desenhar.
- **Valores canônicos que saem daqui:** grupo `tiros` · raio 5 · vx 0 · vy menos 9 · efeito de som
  `tiro` · a ordem do motor: limpar, estrelas, mover a nave com as setas, manter dentro da tela,
  desenhar a nave, mover o grupo tiros, tirar do grupo quem saiu, desenhar o grupo tiros.
- **Campos livres:** a cor do tiro. Nenhuma aula posterior cita essa cor como fato.
- **O que o Dia 2 devolve ao canônico:** a gravação antiga convidava a trocar o vy por menos 15 e a
  brincar com valores. Isso sai, porque o Dia 3 fala do vy menos 9 como fato. A instrução de teste
  da Seção 8 confere os três números antes da entrega, em vez de afirmá-los.
- **Um acerto já feito com o Dia 1, e é de rótulo.** A proposta do Dia 1 chamava o bloco de
  "Desenhar o sprite por último", e o manifesto dele já corrigiu isso. Na paleta atual ele se chama **Desenhar o sprite**, em Jogo 2D ›
  Sprites › Criar e trocar aparência, e "por último" é a posição no motor, não o nome da peça.
  Importa aqui porque o Dia 2 encaixa três blocos **depois** dele, e uma criança que decorou o nome
  "por último" vai achar que está fazendo errado. A Seção 6 trata isso com uma frase, mas o ideal é
  o Dia 1 já dizer o rótulo certo e chamar a posição de posição.
