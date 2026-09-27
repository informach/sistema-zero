# Corre, Dino! · Aula 12 · Duas partidas nunca mais iguais

## Resumo

- **Estado de entrada:** o jogo completo da Aula 11. Dino que corre, pula e faz barulho, cactos
  nascendo a cada 1,4 s em x 560 com vx -5, faxina tirando quem saiu, os três estados do jogo,
  colisão com área de 80%, placar de pontos e tela de fim com a marca. O raio-X da Aula 10 já foi
  retirado.
- **Vitória do dia:** o espaço entre um cacto e outro muda a cada nascimento, e uns cactos vêm um
  pouco mais rápidos que os outros. O jogo dela deixa de ser decorável.
- **Seções hoje:** 9 · **Seções propostas:** 5
- **Clipes hoje:** 6 · **Clipes propostos:** 4, sendo 2 fusões de pares e 1 clipe novo na entrega. A
  contagem não muda com o redesenho da entrega: nenhum clipe entrou nem saiu, o `video-teste-e-envio`
  é que cresceu.
- **Fecho da entrega:** o passo a passo do teste e a recapitulação saíram do balão e foram para o
  roteiro do `video-teste-e-envio`, e só o gancho da Aula 13 continuou balão. Balão depois da
  ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da direita e
  todo o resto na esquerda.
- **Cenas:** 1 (`random`), construída no catálogo, com as metas que faltavam já criadas. Uma
  demonstração de hoje sai.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| O padrão fixo: mesmo lugar, mesma velocidade, mesmo tempo | Não. Está rodando na tela dela, e ela sente isso jogando | Não | | | É dor, não conceito. Pertence ao eixo do Estúdio: roda antes da ferramenta e a seção fecha sozinha |
| Sorteio: dar uma faixa em vez de dar um número | Sim. O ato de sortear é invisível: o jogo escolhe e ela só recebe o resultado | **Sim** | Experimentação (`random`) | Antes de montar | Ela vai encaixar o `um número de a` em dois campos. Sem sentir o que sai de uma faixa, são dois campos preenchidos de cor |
| O sorteio pode repetir | Sim, e contraria a intuição. Quase todo mundo lê "sorteado" como "garantido diferente" | **Sim**, na mesma cena | Experimentação (`random`, meta nova `repeat`, mais o palpite antes de abrir) | Antes de montar | É o erro de leitura mais caro da aula, e é o que a primeira pergunta do quiz cobra |
| A faixa limita o resultado, não obriga ele a mudar | Sim | **Sim**, na pergunta final da mesma cena | Depois de as metas caírem | Já é a pergunta de fábrica da cena, e ela fecha a ideia inteira numa frase |
| -5 menos 1 dá -6, e -6 é mais rápido | Sim. É a conta que engana a cabeça, porque "menos" soa como "menos rápido" | **Sim**, na mesma cena | Experimentação (`random`, meta `velocities`, com a conta escrita embaixo de cada raia) | Antes de montar | A cena já compara as duas raias em 1 segundo. A demonstração que hoje ocupa uma seção inteira repete o que ela viu na Aula 5 |
| Nascer fora da tela: 500 e 560 ficam depois de 480 | Não. Foi ensinado na Aula 5, com a borda em 480 e o x em 560 | Não | | Uma linha na fala de montagem | Gastar cena com valor que ela já usa há sete aulas é o excesso que produziu as 127 seções do v6 |
| Arrastar bloco de valor POR CIMA do número que já está lá | Não é conceito, é operação | Não | | Na fala de montagem, citando a Aula 11 | Ela fez esse gesto exato com o `valor da variável` na aula passada |
| A `Conta matemática` e o sinal de menos | Não. O bloco tem três pedaços e os três estão à vista | Não | | Na fala de montagem | O bloco é novo, o gesto não. Pegar e arrastar por cima ela já sabe |
| O relógio não mudou, e mesmo assim o ritmo mudou | Sim, e é bonito | Não | | Na fala da montagem do x, e ela sente jogando em dez segundos | A régua da cena já mostra que um cacto nasce mais longe que o outro. O resto é o jogo dela contando |
| A palavra imprevisível | Não. É vocabulário | Não | | Dita uma vez, na seção da dor | Nomear uma coisa que acabou de acontecer não precisa de simulação |
| Devolver o vx a -5 e o relógio a 1,4 | Não é conceito, é higiene de continuidade | Não | | Dentro da seção da dor, como conferência | A Aula 13 parte dos dois números. Se algum estiver diferente, a rampa de dificuldade nasce errada e não existe sintoma na tela |

Onze coisas, quatro concretizações, e **todas as quatro moram na mesma cena**. É essa triagem que
tira a aula de 9 para 5 seções e de 6 para 3 clipes.

## Diagnóstico do desenho atual

**A aula tem duas cenas e as duas ensinam a mesma comparação.** A seção *O que o sorteio pode
mudar?* usa `random`, cuja terceira descoberta é, com estas palavras, "O cacto −6 chegou mais longe
que o −5". Três seções depois, *Veja a conta da velocidade* abre a demonstração `velocity` com duas
partes, "Velocidade −5" e "Velocidade −6", para mostrar que o passo de -6 é um pixel maior. A
criança vê a mesma comparação duas vezes na mesma aula.

**E é a terceira vez no curso.** A seção *Por que a velocidade é negativa?*, da Aula 5, já roda a
mesma cena `velocity` como demonstração, com o cacto no papel de protagonista e três partes
(velocidade -5, 5 e 0). A Aula 12 abre a mesma cena, com o mesmo elenco, para acrescentar um pixel
por quadro. Isso é uma seção e um clipe gastos num reencontro.

**A explicação mais difícil da aula está solta num clipe.** O trecho gravado que ensina que "tirar 1
de menos 5 dá menos 6, que é mais rápido ainda" vive no clipe de *Conecte a conta ao cacto*, e a
orientação de montagem manda "evitar dizer que -6 é maior que -5". Ou seja: a peça mais frágil da
aula depende de uma narração que a própria orientação de edição está tentando desarmar. Isso pede
cena, e a cena já existe.

**O palpite da experiência estava no roteiro e não estava no manifesto, e agora está nos dois.** A
seção *O que o sorteio pode mudar?* especifica, por escrito, o palpite "Sorteando o lugar, dois
cactos podem nascer no mesmo ponto?" com as duas alternativas e o que a tela conta depois. O bloco
`experiencia-sorteio-controlado` do v6 não tinha campo `prediction` nenhum. O bloco desta proposta
tem, com o `revealOn` apontando para `repeat`, e a cena passou a guardar o mesmo palpite como palpite
de fábrica.

**A cena cobrava uma descoberta e o roteiro pede três, e agora ela cobra as três.** No catálogo do
v6, `random` tinha uma meta só, `velocities`. O roteiro da aula lista três descobertas: "Saíram
lugares diferentes", "Um lugar repetiu" e "O cacto −6 chegou mais longe que o −5". A frase de
sucesso da cena, "Cada sorteio saiu dentro dos limites que você deu, e às vezes repetiu!", prometia
uma repetição que nenhuma meta produzia. As três metas existem: `positions`, `repeat` e
`velocities`.

**Duas seções de construção estão separadas da única coisa que explica as duas.** *Sorteie o lugar
de nascimento* e *Conecte a conta ao cacto* são as duas aplicações do mesmo bloco, o `um número de
a`, e entre elas foi enfiada uma seção de demonstração. A criança monta metade, assiste a um vídeo
sobre outra coisa, e volta para montar a outra metade.

**A abertura e a dor são a mesma coisa em duas seções.** *O que vamos fazer hoje* e *Veja por que o
percurso se repete* têm o mesmo conteúdo: o jogo dela repetindo o padrão. A primeira promete e a
segunda mostra. Juntas duram menos de um minuto e meio e contam uma história só.

**O fecho ocupa seção com vídeo para dizer o que o quiz já cobra.** *Veja o que você aprendeu* é um
clipe de recapitulação seguido de *Confira as ideias de hoje*, que é o quiz com as mesmas três
ideias. Duas seções para fechar uma aula de quatro passos.

**Os endereços da paleta que a aula cita não existem mais.** A fala gravada manda ir em "Jogo 2D,
subcategoria Mira e contas" pegar o `um número de tanto a tanto`. Na edição atual
(`jogo-2d-1.0-documento-2`) o bloco se chama `um número de a` e mora em **Jogo 2D › Sorteios ›
Números e posições**. As notas **Na tela** do roteiro já estão corrigidas, a narração gravada não. A
mesma defasagem vale para `A cada segundos`, que a fala chama de "Tempo e repetição" e hoje está em
**Jogo 2D › Tempo › Quadros e intervalos**, e para a pergunta do estado, que a fala chama de "a tela
atual é" e hoje se chama `o estado do jogo é ?`, em **Jogo 2D › Jogo e telas › Telas e partida**.

**Um conflito de decisão que precisa ser resolvido antes de gravar.** A tabela de campos livres da
referência do curso lista "Faixa do sorteio do x, Aula 12, canônico 500 a 560, faixa que a aula
oferece 500-700 e 550-560". A orientação de edição do roteiro v6 manda o contrário: "retirar o
alargamento livre da faixa para 500–700, fechar nos limites 500–560 e variação 0–1". O critério de
entrega exige 500 e 560 exatos. **O v6 está certo e a linha da tabela de campos livres deve ser
aposentada:** a Aula 13 não parte da faixa, mas um campo anunciado como livre e cobrado como fixo é
a pior combinação possível para quem lê ao pé da letra.

## Proposta final

### Seção 1. Dá para decorar o seu jogo

- **Intenção:** dor (absorve a apresentação)
- **Por que existe:** o jogo dela já faz a coisa errada, sozinho, com os números que ela mesma
  escolheu. Antes de sortear qualquer coisa, ela precisa ver de onde vem a previsibilidade, e
  precisa conferir dois números dos quais a última aula do curso vai partir.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-padrao-fixo`): ela joga cinco ou seis partidas seguidas e o percurso é sempre o
     mesmo. Depois o clipe abre o bloco `No grupo criar obstáculo em x tamanho com vx`, que mora
     dentro do `A cada segundos` de 1,4, e aponta um número de cada vez: o x em 560, sempre 560. O
     vx em -5, sempre -5. O relógio em 1,4, sempre 1,4. A fala fecha a conta: mesmo lugar, mesma
     velocidade, mesmo tempo, e aí é impossível ficar diferente. O jogo está fazendo certinho o que
     ela mandou, e o que ela mandou é sempre a mesma coisa. Dentro deste mesmo clipe entra a
     conferência dos dois números canônicos, com a fala de conferir e não de afirmar: "olha o vx do
     seu bloco de criar cacto. Se estiver em menos 5, está certo. Se estiver em outro número, põe
     menos 5 agora. E olha o relógio: ele tem que estar em 1,4". Termina com a pergunta que abre o
     dia, em afirmação: o computador faz exatamente o que a gente manda, então a gente vai mandar
     ele sortear. Duração alvo: 60 a 75 segundos.

**Junta duas seções de hoje.** *O que vamos fazer hoje* prometia o que *Veja por que o percurso se
repete* mostrava. A dor é a apresentação desta aula, e ela fecha sozinha: a ferramenta só aparece na
seção seguinte.

**A conferência dos dois números mora aqui de propósito.** A regra do valor canônico manda devolver
o vx e o relógio antes de a Aula 13 partir deles, e a dor é o único momento em que olhar para esses
dois números é natural, porque eles são a causa do problema.

### Seção 2. O sorteio tira o número na hora

- **Intenção:** conceito
- **Por que existe:** sortear é um ato invisível. O jogo escolhe e a criança só vê o resultado. Sem
  sentir o que sai de uma faixa, o `um número de a` vira um bloco com dois campos para preencher.
- **Conclui quando:** as três metas de `random` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: a analogia canônica, dita uma vez só e marcada como comparação. "Em vez de dar um
     número pronto pro jogo, a gente dá uma faixa e deixa ele tirar um número de dentro dela, na
     hora. É parecido com um saquinho de papelzinho: você escreve os números, põe todos lá dentro e
     tira um sem olhar. Isso tem nome: sorteio."
  2. `interactive`: cena `random`, "Cada cacto pode nascer diferente", com o palpite antes de abrir.
     Elenco: cacto no papel do obstáculo. Cenário: `corre-dino`. Metas cobradas: `positions`,
     `repeat` e `velocities`.

**Sem vídeo, de propósito.** A cena sorteia de verdade, uma coisa por vez, e mostra a régua com a
borda 480 marcada. Nenhuma narração mostra um sorteio acontecendo melhor do que um sorteio
acontecendo.

**As três coisas que a aula precisa estão nesta seção só.** Que o sorteio cai dentro da faixa, que
ele pode repetir, e que o cacto de -6 chega mais longe que o de -5. Esta última é a que hoje ocupa
uma seção e um clipe próprios, três seções adiante.

### Seção 3. Cada cacto nasce num lugar diferente

- **Intenção:** construção
- **Por que existe:** é a primeira aplicação, e ela muda um campo só. A vitória é imediata e é
  sentida jogando: o espaço entre os cactos deixa de ser sempre o mesmo.
- **Conclui quando:** no campo x do `No grupo criar obstáculo em x tamanho com vx` está encaixado um
  `um número de a` com 500 e 560, o relógio continua em 1,4 s com o nascimento dentro do
  `o estado do jogo é jogando`, e existe um único bloco de criar obstáculo no projeto
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Sorteios, Números e posições, pega o bloco `um número de a`. Ele é um
     bloco de valor, então você arrasta ele **por cima** do número que já está lá, igual você fez com
     o `valor da variável` na Aula 11. Arrasta por cima do 560, que é o campo x do bloco
     `No grupo criar obstáculo em x tamanho com vx`, lá dentro do relógio de 1,4. Ele tem dois
     campos, e vêm com 1 e 6, que é a faixa de um dado. Troca por 500 e 560. Os dois são maiores que
     480, que é onde a tela acaba, então todo cacto continua nascendo fora da tela, como desde a
     Aula 5. O relógio fica em 1,4, sem tocar nele."
  2. `video` (`video-sortear-lugar`): o gesto de arrastar por cima e trocar os dois números, depois
     a partida rodando com os espaços variando. A fala guarda a observação boa do trecho gravado, e
     ela é o conteúdo desta seção: o relógio continua batendo no mesmo compasso, mas como o cacto
     nasce mais longe ou mais perto, ele demora mais ou menos para chegar no dino. Um número
     sorteado, e o ritmo inteiro do jogo mudou. Duração alvo: 55 a 65 segundos.
  3. `studio`: conferência dos três critérios acima.

**Sem cena.** O efeito aparece na partida dela em dez segundos, e a régua da cena anterior já mostrou
que um cacto pode nascer mais longe que o outro.

### Seção 4. Cada cacto ganha a sua velocidade

- **Intenção:** construção
- **Por que existe:** é a segunda aplicação do mesmo bloco, agora dentro de uma conta, e é onde
  estreia a `Conta matemática` do curso. A vitória é a segunda coisa que ela não consegue decorar.
- **Conclui quando:** no campo vx do `No grupo criar obstáculo em x tamanho com vx` está encaixada
  uma `Conta matemática` com o sinal de menos, -5 do lado esquerdo e um `um número de a` de 0 a 1 do
  lado direito, o sorteio do x continua ligado, e continua existindo um único bloco de criar
  obstáculo
- **Blocos:**
  1. `dialogue`: "Agora a velocidade. Em Programação, Matemática, pega o bloco `Conta matemática`.
     Ele é novo. Arrasta ele por cima do -5, que é o campo vx do mesmo bloco de criar cacto. Esse
     bloco tem três pedaços: o espaço da esquerda, o sinal do meio e o espaço da direita. O sinal vem
     no mais, e hoje não é o mais: abre a listinha e escolhe o menos. No espaço da esquerda escreve
     -5 por cima do número que já está lá. No espaço da direita arrasta outro `um número de a`, e
     nele põe 0 e 1."
  2. `video` (`video-sortear-velocidade`): o gesto das três peças e a leitura da conta em voz alta,
     que é o que a criança precisa levar: menos 5, menos um número sorteado entre 0 e 1. Se sair 0, o
     cacto anda a -5. Se sair 1, ele anda a -6. Aqui entra a única remissão da seção, e ela é para
     trás e para dentro da própria aula: "o de -6 é aquele que chegou mais longe na experiência de
     hoje". **Cortar da gravação original a explicação de negativos**, que agora é conteúdo da cena e
     não da narração. Termina com a partida rodando: agora nem o ritmo nem a velocidade dão para
     decorar. Duração alvo: 60 a 75 segundos.
  3. `studio`: conferência dos três critérios acima.

**Junta a demonstração de hoje na construção.** *Veja a conta da velocidade* existia para mostrar o
passo de -6 contra o de -5. Isso passou para a cena da Seção 2, e o que sobrava, a leitura da conta,
mora aqui, com o bloco na mão.

### Seção 5. Teste, entregue e guarde as duas ideias

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com o jogo rodando diferente a cada partida e guarda as duas ideias
  que a Aula 13 vai usar.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): três partidas seguidas com a borda direita enquadrada, o lugar
     e a velocidade mudando de uma para a outra, um lugar repetido deixado de propósito, os
     objetivos conferidos e o gesto de enviar na tela. O clipe **passou a fechar com a recapitulação
     do dia**, que era balão: o jogo tem duas coisas sorteadas agora, o lugar onde cada cacto nasce
     e a velocidade que ele recebe, e isso acontece porque você deu uma faixa em vez de um número e
     o jogo tira o número na hora. **Entrou pela regra de que toda seção com o Estúdio embarcado tem
     um vídeo mostrando como se faz.** Duração alvo: 55 a 70 segundos.
  2. `dialogue`: gancho da Aula 13, o único balão que fica aqui porque é curto e não depende de ter
     acabado de jogar: "Na Aula 13, a última, essa velocidade vai virar um número que muda sozinho
     enquanto você joga."
  3. `quiz`: as três perguntas atuais, mantidas. Elas cobrem exatamente as três descobertas da cena e
     a leitura da conta.
  4. `studio`: entrega, com os quatro critérios do manifesto atual (sorteio no x entre 500 e 560,
     conta no vx, relógio de 1,4 s protegido pelo estado jogando, um único bloco de criar
     obstáculo). É o último item de `blockKeys`.

**Junta três seções de hoje.** *Teste e entregue sua construção*, *Veja o que você aprendeu* e
*Confira as ideias de hoje* viram uma. O clipe de fecho antigo sai, e o clipe que fica na seção é o
de teste e envio, que leva também a recapitulação.

**Por que os dois balões saíram.** Balão depois da ferramenta não existe para quem faz a aula: o
Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do Estúdio" não
é um lugar. Nada foi apagado. O passo a passo do teste, com as três coisas que se observa e o aviso
de que um lugar repetido não é erro, e a recapitulação foram para o roteiro do `video-teste-e-envio`,
e só o gancho da Aula 13 continuou balão.

## Experiências e demonstrações desta aula

### 1. `random` (Cada cacto pode nascer diferente) · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena certa, no lugar certo, com o elenco certo, e agora ela cobra o que a aula diz
  que ela cobra.
- **Elenco:** cacto no papel do obstáculo, declarado no bloco. **Cenário:** `corre-dino`.
- **Metas cobradas nesta aula:** `positions`, `repeat`, `velocities`, que são as três da missão de
  fábrica. O bloco **não declara `setup.goals`** de propósito: sem lista, a cena cobra as três e
  deixa de fora a única meta só de caso, `above`, que é a do Dia 3 do Desafio, onde a pedra nasce
  acima da tela.

**Ajuste 1: faltavam duas metas, e elas existem.** O catálogo tinha uma meta só, `velocities`. O
roteiro da aula pede três. Ficaram assim:

| id | rótulo ao cair | pedido na faixa |
|---|---|---|
| `positions` | "Saíram lugares diferentes" | "Aperte Sortear lugar até sair um lugar diferente." |
| `repeat` | "Um lugar repetiu" | "Aperte Sortear lugar mais oito vezes." |

A meta `repeat` é a razão de ser da cena: é ela que desmente a ideia de que sorteio garante
diferente. Sem ela, a frase de sucesso prometeria uma repetição que a cena nunca cobrou.

O id da primeira é `positions`, na missão de fábrica. O Dia 3 do Desafio, que pede a mesma meta,
também declara `positions`.

**Ajuste 2: a meta `repeat` não promete o que o sorteio não garante.** Oito sorteios numa faixa
de 61 valores podem não repetir. O pedido é "mais oito vezes", a meta cai quando a repetição
acontecer, e o botão Conferir, enquanto ela não cair, responde "ainda não repetiu, aperta mais
algumas vezes". Nunca contar quantas vezes falta, porque não dá para saber.

**Ajuste 3: escrever a conta embaixo de cada raia da velocidade.** Hoje as raias mostram quanto cada
cacto andou em 1 segundo. Acrescentar, embaixo de cada uma, a conta que produziu aquele número:
`-5 - 0 = -5` e `-5 - 1 = -6`. É o que transforma a cena na concretização da conta, e não só da
velocidade. A criança encontra na Seção 4 exatamente a mesma conta, com os mesmos três pedaços que
ela vai montar no bloco. É este ajuste que permite tirar a demonstração `velocity` da aula.

**Ajuste 4: marcar a borda 480 na régua.** A primeira pista já diz "a régua mostra onde um cacto pode
nascer, depois da borda da tela". Desenhar a linha do 480 na régua, com legenda, e deixar a faixa de
500 a 560 do lado de fora dela. Isso dispensa a explicação falada de por que os dois limites são
maiores que 480, e é o que a segunda pergunta do quiz cobra.

**Ajuste 5, no manifesto e na cena: o palpite existe nos dois.** O bloco desta aula declara o
palpite, e a cena passou a guardar um igual como palpite de fábrica. O do bloco prevalece, e os dois
dizem a mesma coisa:

- **Pergunta:** "Sorteando o lugar, dois cactos podem nascer no mesmo ponto?"
  - Nunca, o sorteio evita repetir (se ela escolher esta, a tela conta depois: "Um lugar saiu de
    novo, e a marquinha dele ganhou 2×.")
  - Podem sim ✓
- O palpite volta à tela no instante em que a meta `repeat` cai, e é isso que o campo `revealOn` do
  bloco declara.

**Pergunta depois de descobrir (conta para concluir), que a aula especifica e o catálogo agora
guarda como pergunta de fábrica da cena:** "O que o sorteio garante?"

- Um valor diferente do anterior.
- Um valor dentro dos limites que você escolheu. ✓

**Explicação ao acertar:** "Sortear é tirar um número de dentro da faixa, e a faixa é sua. Repetir é
possível, e é por isso que o percurso parece novo sem ser controlado."

**Onde mais serve:** qualquer aula que sorteie posição, tempo ou dano. Meu Jeito a7 (nascimento das
naves), e os cursos da trilha em que um inimigo nasce em lugar variável. Com o ajuste 3, ela também
passa a servir como a cena da conta com negativos, que é o que o curso 2 (Pong) vai precisar quando
a bola trocar de sentido.

### 2. `velocity` (O que move o cacto a cada quadro) · **SAI DESTA AULA**

- **Situação hoje:** demonstração guiada de duas partes, "Velocidade −5" e "Velocidade −6", na seção
  *Veja a conta da velocidade*, com um caso preparado de cinco ações antes de a criança entrar.
- **Por que sai:** a mesma cena, com o mesmo elenco (o cacto no papel de protagonista) e no mesmo
  formato de demonstração, já rodou na Aula 5, na seção *Por que a velocidade é negativa?*, com três
  partes. A versão da Aula 12 acrescenta um pixel por quadro a uma comparação que a criança viu sete
  aulas atrás, e a mesma comparação está dentro da cena `random`, na meta `velocities`, que é
  cobrada nesta aula.
- **O que não se perde:** a leitura da conta em voz alta continua, na fala de montagem da Seção 4, e
  a comparação visual continua, na cena da Seção 2 com o ajuste 3.
- **Se a decisão for mantê-la assim mesmo:** então ela precisa sair da seção própria e virar o
  segundo bloco da Seção 4, depois do vídeo do gesto, e o ajuste 3 de `random` deixa de fazer
  sentido. Uma das duas, nunca as duas.
- **Um problema do caso preparado, que vale registrar mesmo com a cena saindo:** as cinco ações de
  preparo movem o cacto para a direita e para baixo (`vx 10, vy 5`, depois `vx 10, vy 0`) antes de a
  demonstração começar. No Corre Dino o cacto nunca sobe, nunca desce e nunca vai para a direita. Se
  a cena for mantida em qualquer aula, o preparo precisa colocar o cacto encostado na borda direita,
  no chão, e o `vy` precisa ficar em 0 do começo ao fim.

### 3. `once-vs-always` · **NÃO SERVE AQUI**

A cena `once-vs-always`, construída a partir da proposta do Dia 1 do Desafio, separa o que roda uma
vez, no `⚙️ Ao iniciar`, do que
roda de novo a cada quadro, no `🔁 Enquanto estiver rodando`. No Corre Dino essa distinção foi
resolvida nas Aulas 1 e 2, e a Aula 12 não cria área nenhuma: ela troca dois campos dentro de um
bloco que já mora num relógio montado na Aula 5. Forçar a cena aqui violaria o terceiro princípio de
julgamento, o de nunca usar uma cena cujo foco não bate com o conceito da seção.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-padrao-fixo` | Dá para decorar o seu jogo | as partidas repetidas, os três números fixos no bloco de criar cacto, e a conferência do vx -5 e do relógio 1,4 | `video-abertura-editorial` + `video-padrao-fixo` | 60 a 75 s | funde dois clipes. Fala sim, tela não: regravar na edição `jogo-2d-1.0-documento-2` |
| `video-sortear-lugar` | Um número sorteado, e o ritmo inteiro muda | arrastar o `um número de a` por cima do x e trocar para 500 e 560, e o ritmo variando na partida | `video-sortear-posicao` | 55 a 65 s | fala sim, com a correção do endereço da paleta (Sorteios, não Mira e contas) |
| `video-sortear-velocidade` | Menos 5, menos um pouquinho | a `Conta matemática` por cima do vx, o sinal de menos, o -5 à esquerda e o segundo `um número de a` com 0 e 1 | `video-sortear-velocidade` + `video-menos-corre-mais` | 60 a 75 s | funde dois clipes e **corta a explicação de negativos**, que passou para a cena |
| `video-teste-e-envio` | Dois sorteios em partidas diferentes | três partidas seguidas, o lugar e a velocidade mudando, um lugar repetido de propósito, o gesto de enviar e a recapitulação do dia | novo | 55 a 70 s | não, gravação nova |

**Saldo:** de 6 clipes para 4, sendo 2 fusões de pares e 1 clipe novo na entrega, que entrou pela
regra de que toda seção com o Estúdio embarcado tem um vídeo mostrando como se faz. Sai inteiro o
clipe de fecho (`video-fecho-editorial`), com a recapitulação passando a ser o fim do clipe da
entrega, e sai a metade explicativa de `video-menos-corre-mais`. Em
minutagem a queda é maior que a contagem sugere, porque a explicação mais longa da aula, a dos
números negativos, deixou de ser narração.

## Continuidade

- **O que esta aula assume da anterior (Aula 11):** variável `pontos` criada com 0 no `⚙️ Ao
  iniciar`; relógio de 1 s somando 1 em pontos dentro do estado jogando; `Mostrar placar` com o valor
  ligado à variável, em x 12, y 30, tamanho 24, cor azul escuro; `juntar texto` no subtítulo da tela
  de fim; `Mostrar a caixa de colisão do sprite` já retirado na Aula 10. A criança já arrastou um
  bloco de valor por cima de um número, e a aula cita esse gesto pelo nome da aula.
- **O que esta aula entrega para a Aula 13:** o campo x do `No grupo criar obstáculo em x tamanho com
  vx` com `um número de a` de 500 a 560; o campo vx com uma `Conta matemática` de sinal menos, tendo
  -5 do lado esquerdo e `um número de a` de 0 a 1 do lado direito; o relógio de 1,4 s intacto e
  protegido pelo `o estado do jogo é jogando`; um único bloco de criar obstáculo no projeto.
- **Valores canônicos que saem daqui:** 500 e 560 na faixa do x · 0 e 1 na faixa da velocidade · -5
  no lado esquerdo da conta · 1,4 s no relógio dos cactos.
- **Os dois números que a Aula 13 substitui:** o -5 do lado esquerdo da conta vira o `valor da
  variável velocidade`, e o relógio de 1,4 ganha um irmão de 5 s. Por isso a conferência dos dois
  números acontece na Seção 1 desta aula, com fala de conferir, e não de afirmar.
- **Campos livres:** nenhum. Recomendação de aposentar a linha "Faixa do sorteio do x" da tabela de
  campos livres da referência do curso, porque o v6 fechou a faixa em 500 a 560 e o critério de
  entrega cobra os dois números exatos.
- **Nenhum critério precisou ser afrouxado nesta aula.** Como não há campo livre, os quatro critérios
  do v6 entram inteiros, com os valores exatos, e os rótulos reescritos para os nomes de bloco atuais.
