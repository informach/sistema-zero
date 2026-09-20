# Corre, Dino! · Aula 1 · A telinha do jogo e o Dino que ainda não aparece

## Resumo

- **Estado de entrada:** projeto vazio, com a extensão Jogo 2D preparada pelo professor. É o primeiro
  curso da trilha Iniciante 2D e não tem pré-requisito de programação: a criança pode nunca ter
  programado na vida. O curso pressupõe apenas que ela sabe se virar no Estúdio (achar um bloco na
  coluna da esquerda, arrastar, encaixar, trocar um número). A Aula 0, de tour, saiu do curso.
- **Vitória do dia:** a telinha de 480 por 270 aparece dentro da área do jogo, com a borda e a cor
  que ela escolheu. O Dino termina criado e invisível, de propósito, com a pergunta "cadê o Dino"
  aberta para a Aula 2.
- **Seções hoje:** 10 · **Seções propostas:** 8 no manifesto, a partir dos 7 movimentos desta
  proposta. Um movimento abre em duas seções, porque a regra das duas colunas admite uma única
  coisa na direita por seção: a cena da tela e a montagem da borda viram *Descubra onde a telinha
  começa e termina* mais *Mostre o limite no seu jogo*. A ordem e o conteúdo são os mesmos.
- **Clipes hoje:** 6 · **Clipes propostos:** 6 (dois são fusão e dois encolhem bastante). A
  contagem não muda com o redesenho da entrega: nenhum clipe entrou nem saiu, o `video-fecho` é que
  cresceu.
- **Fecho da entrega:** a conferência e a recapitulação saíram do balão e foram para o roteiro do
  `video-fecho`. Balão depois da ferramenta não existe para quem faz a aula, porque o Estúdio fica
  sozinho na coluna da direita e todo o resto na esquerda.
- **Cenas:** 3, todas construídas no catálogo (`stage-size`, `coordinates`, `world`). Os ajustes
  pedidos por esta análise foram feitos: `stage-size` ganhou a meta do meio e a pergunta final, e o
  bloco da `world` passou a obrigatório.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| A área `Ao iniciar`, e o que significa acontecer uma vez | Sim. Tempo é invisível, e "roda uma vez" não tem desenho na tela | **Não, hoje** | | | "Uma vez" só quer dizer alguma coisa contra "sempre", e a segunda área entra na Aula 2. Hoje tudo o que ela monta mora em `Ao iniciar`, então não existe contraste para manipular. A analogia do tabuleiro, que já está gravada e é marcada, segura o dia. A concretização é a cena `once-vs-always`, na Aula 2 |
| O tamanho da tela, e que o limite é uma escolha | Sim, e de um jeito traiçoeiro: a cor do fundo pinta a área do jogo inteira, então 480 e 270 não têm o que medir na tela | **Sim** | Experimentação (`stage-size`) | Depois da dor no projeto dela, antes de encaixar a borda | É o único momento do curso em que ela mexe nos dois números e vê o retângulo obedecer. No projeto ela digita os números uma vez e pronto |
| A borda como instrumento que entra hoje e sai na Aula 2 | Não. É uma moldura que ela liga e desliga | Não | | Dito no momento do bloco, e cobrado na pergunta final de `stage-size` | Instrumento se explica com uma frase honesta ("entra hoje, sai quando a floresta marcar o limite sozinha"). Gastar cena com isso é repetir o palco da cena anterior |
| x e y, e o zero lá no alto | Sim, e contraria a intuição: y cresce para baixo | **Sim** | Experimentação (`coordinates`) | Depois de uma ponte curta falada, antes de preencher x e y no bloco | No bloco seguinte ela escreve 110 e 150 em dois campos. Sem sentir a direção antes, são dois números sem significado |
| A palavra sprite | Não. É vocabulário | Não | | Dito na hora do bloco `Criar dinossauro` | Nomear uma coisa que acabou de existir não precisa de simulação |
| O nome do sprite, e que o vídeo vai dizer "dino" daqui para frente | Não. É combinado de leitura | Não | | Dito no campo do nome | O campo já nasce escrito `dino`. A fala avisa que os blocos seguintes trazem um seletor com a lista, e que ela escolhe o nome dela |
| Criar contra mostrar | Sim. Invisível por definição: o objeto existe sem aparecer | **Sim** | Experimentação (`world`) | Depois de criar o Dino no projeto dela | É o instante em que a tela continua vazia e ela acha que errou. O conceito é a resposta de uma pergunta que ela acabou de fazer sozinha |
| Que y 150 não é a altura da grama | Não é conceito, é um fato que o material já errou uma vez | Não | | Nada é dito hoje | Quem leva o Dino à grama é a gravidade, na Aula 3. Explicar isso hoje criaria referência solta para duas aulas adiante, contra a regra do curso. A Aula 3 aponta o pouso quando ele acontece |
| Escolher a cor do céu, da borda e do Dino | Não. É campo de gosto | Não | | Dito na hora de cada campo, com o critério junto | "O meu vai num azul bem claro, e o seu pode ser a cor que você quiser". Critério da borda: uma cor bem diferente da do céu, senão ela some |
| Confirmar um campo e olhar a área do jogo | Não é conceito, é operação de interface | Não | | Instrução dentro da seção de teste | Hoje isso está espalhado pelas orientações. É instrução, não conteúdo |

Dez coisas, três concretizações. Sete conceitos não ganham cena nenhuma, e é essa triagem que
deixa a aula caber em 7 movimentos, que viram 8 seções no manifesto.

## Decisão de produto de 20/09/2026. A acessibilidade sai deste curso

**A dona decidiu, e a decisão desfaz uma correção deste próprio redesenho.** O passo de
acessibilidade do `Ao iniciar` **não faz parte do Corre, Dino!**. O conceito é complexo demais para
o primeiro curso da trilha, e o resultado dele não muda nada na tela de quem está aprendendo: nos
primeiros cursos a pessoa precisa ver a criação tomar forma. Acessibilidade pode virar um curso
bônus mais para a frente, e neste curso não se fala disso.

**O que este relatório afirmava antes, e por que estava errado.** A análise tinha encontrado uma
inconsistência real: a Aula 2 cobrava esse bloco na entrega, e nenhuma seção da Aula 1 mandava
colocar a peça. As provas eram boas (o fecho recapitulando quatro passos contra uma abertura que
manda gravar três, o clipe `video-tela-v7` terminando em "O terceiro é rapidinho.", a Aula 2
falando em três blocos ao arrastar a borda). O erro foi a conclusão: o redesenho **restaurou** o
passo e a cena que o v6 tinha aposentado. **O conserto é o inverso.** A inconsistência se resolve
tirando a cobrança da Aula 2, não devolvendo o passo à Aula 1.

**O que saiu daqui, em 20/09/2026:** o bloco de acessibilidade, a seção que o montava, a seção de
conceito com a cena de acessibilidade, o clipe que ensinava o gesto, os dois critérios de projeto
que o cobravam e as metas declaradas. O `retireBlockKeys` continua aposentando
`video-descricao-demo-v7`, `orientacao-descricao-v7` e `video-descricao-criar-v7`, que é o que o v6
já fazia e continua certo.

**Para quem for auditar esta aula daqui a três meses:** a ausência do passo **não é defeito**. É
escolha, e não deve ser "consertada" de volta. O vocabulário do tema saiu de propósito das 13
aulas, para que uma busca por ele volte vazia e ninguém o reintroduza por engano.

## Diagnóstico do desenho atual

**A descoberta do limite chega antes de existir a confusão.** A seção 3 (*Descubra o limite da
tela*) roda antes da seção 4 (*Prepare a tela no seu projeto*). Quer dizer: a criança descobre para
que serve a borda antes de ter passado pelo problema que a borda resolve. A confusão real (a cor do
`Preparar o jogo em tela cheia` pinta a telinha e o espaço em volta, e aí os números 480 e 270 não
têm o que medir na tela) só existe depois que ela monta. Do jeito de hoje, a cena entra como
curiosidade e a borda entra como item de lista.

**A dor e a ferramenta estão na mesma seção.** A seção 4 pede, de uma vez, preparar a tela de
480 × 270 e colocar a borda com espessura 4. Junto assim, a criança nunca chega a olhar para uma
tela em que não dá para saber onde o jogo termina, que é justamente o motivo de existir o bloco
seguinte.

**Três seções de construção não concluem nada.** No manifesto, `iniciar-v7`, `tela-criar-v8` e
`dino-v7` têm a lista de conclusão vazia, e nenhuma delas carrega um bloco de Estúdio. Os
"Critérios da construção" estão escritos no roteiro e não estão ligados em lugar nenhum: só a
entrega confere, lá no fim. A criança monta três vezes sem receber uma única confirmação.

**A cena que responde a pergunta do dia é opcional.** O bloco `descoberta`, que é a cena `world`,
está com `required: false` e ao mesmo tempo é o único critério de conclusão da seção 7 (*Criar e
mostrar são duas coisas diferentes*). As duas coisas não podem valer juntas.

**Uma seção inteira é um encaixe só.** A seção 2 (*Um lugar para começar*) coloca um bloco vazio e
tem clipe próprio. O argumento registrado é dar uma confirmação cedo para a criança, e ele é bom,
mas a confirmação cabe dentro da seção seguinte sem virar seção.

**O clipe das coordenadas ainda descreve a demonstração antiga.** O próprio roteiro marca isso com
"⚠️ Mostra a cena anterior" e escreve a ação: "cortar". A instrução de montagem continua mandando
animar um marcador sobre uma cartela e ainda afirma que "não há arraste nem parâmetros para a
criança", o que hoje é falso: quem arrasta é ela, na cena.

**Uma alternativa do quiz cita um bloco que não existe no curso ainda.** A pergunta "Onde ficam os
blocos que preparam a partida?" tem como alternativa errada "Só dentro do evento de pulo". A área
`Quando acontecer` estreia na Aula 4, e o evento de pulo na Aula 4 também. Isso quebra a regra de
só falar do que já está sendo usado.

**Os caminhos de paleta divergem entre os dois documentos.** O roteiro v6 e o `blocos-por-aula.json`
usam a paleta atual (`Jogo 2D › Jogo e telas › Preparar a área do jogo`, `Jogo 2D › Kits prontos ›
Dino`), e a referência do curso ainda guarda a nomenclatura antiga (`Jogo 2D › Aparência`,
`Jogo 2D › Kit dino`). Quem gravar precisa usar a paleta atual e atualizar a seção 4 da referência.

## Proposta final

### Seção 1. Conheça o jogo que você vai fazer

- **Intenção:** apresentação
- **Por que existe:** a criança precisa ver o jogo pronto rodando antes de encaixar a primeira peça.
  Sem isso ela monta blocos sem destino, e este é o primeiro contato dela com o curso.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`): o Corre, Dino! pronto rodando. A tela de início com o nome do jogo,
     o Dino saindo na corrida, os cactos chegando, o pulo, o placar subindo e a batida. Fecha
     dizendo o que fica pronto hoje: a telinha do jogo com a cor dela e o Dino criado. Manter a
     enumeração dos passos da gravação antiga, que diz três e volta a bater com a aula. Tom de
     boas-vindas de primeira vez, nunca de reencontro. Duração alvo: 45 a 60 segundos.

### Seção 2. Abra o lugar onde o jogo se arruma

- **Intenção:** construção
- **Por que existe:** dois gestos que formam um movimento só, o de abrir o palco. E o segundo deles
  produz a confusão que motiva a seção seguinte.
- **Conclui quando:** a área `Ao iniciar` está no projeto com `Preparar o jogo em tela cheia,
  tela 480 × 270, fundo` como primeiro bloco lá dentro
- **Blocos:**
  1. `dialogue`: "Na coluna da esquerda, onde ficam os bloquinhos, abre a categoria Áreas do
     projeto e pega o `Ao iniciar`. Arrasta até a área de montar, no meio, e solta. Depois, em
     Jogo 2D, Jogo e telas, Preparar a área do jogo, pega o `Preparar o jogo em tela cheia, tela __
     × __ , fundo __` e encaixa dentro do `Ao iniciar`, que está vazio: ele fica sendo o primeiro
     bloco lá dentro. A largura vem 800 e a altura vem 480. Troca por 480 e 270. A cor do fundo é
     sua."
  2. `video` (`video-area-e-tela`): funde os dois clipes de hoje. Mantém o gesto completo da área
     e a analogia do tabuleiro, que é marcada e boa ("é tipo montar um jogo de tabuleiro: você abre
     o tabuleiro, separa as peças, dá as cartas. Uma vez só, no começo"). Mantém o critério da cor
     dita na hora do campo. **Termina na confusão, sem resolver:** a cor pintou a área do jogo
     inteira, e não dá para saber onde fica a telinha de 480 por 270. Duração alvo: 70 a 85 segundos.
  3. `studio`: o projeto da aula, conferindo a área e os dois números.
  4. `dialogue`: fecha a seção com a pergunta em aberto. "Você escreveu 480 e 270 ali. Só que olha a
     área do jogo: a cor pintou tudo, do mesmo jeito. Cadê a telinha de 480 por 270?"

**Junta as duas primeiras seções de hoje.** *Um lugar para começar* sozinha é um encaixe com vídeo
próprio, e a confirmação cedo continua existindo: ela vem no bloco de Estúdio desta mesma seção.

### Seção 3. Descubra onde a telinha começa e termina

- **Intenção:** conceito
- **Por que existe:** a pergunta da seção anterior ficou aberta, e a cena entrega o que o projeto
  não consegue entregar: mexer nos dois números e ver o retângulo obedecer.
- **Conclui quando:** as três metas de `stage-size` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: a ponte curta que abre a cena, retomando o "cadê a telinha" da seção anterior.
  2. `interactive`: cena `stage-size`, "A tela e o limite dela". Cenário: `corre-dino`. Sem
     personagem do elenco. O palco abre em 800 por 480 com a borda escondida, que é exatamente o
     estado em que ela acabou de deixar o jogo dela.

### Seção 4. Mostre o limite no seu jogo

- **Intenção:** construção
- **Por que existe:** a cena mostrou o instrumento, e agora ele entra no projeto dela.
- **Conclui quando:** `Mostrar a borda da tela, cor, espessura 4` está no `Ao iniciar`, logo abaixo
  do `Preparar o jogo em tela cheia`
- **Blocos:**
  1. `dialogue`: "Foi a borda que mostrou o limite. Agora põe uma no seu jogo. Em Jogo 2D, Jogo e
     telas, Preparar a área do jogo, pega o `Mostrar a borda da tela, cor __ espessura __` e
     encaixa dentro do `Ao iniciar`, logo abaixo do `Preparar o jogo em tela cheia`. A espessura já
     vem 4, deixa assim. Para a cor, o bom é escolher uma bem diferente da que você pôs no céu,
     senão ela some no fundo. O meu vai num cinza bem escuro."
  2. `video` (`video-borda`): a segunda metade do clipe da tela de hoje. O encaixe da borda e o
     retângulo aparecendo. Apontar o retângulo e dizer que é ele que tem 480 por 270. Dizer também,
     em uma frase, que a borda entra hoje e sai na próxima aula, quando a floresta passar a marcar
     o limite sozinha. Duração alvo: 55 a 65 segundos.
  3. `studio`: conferência da borda com espessura 4, logo abaixo do `Preparar o jogo em tela cheia`.

**A cena vem antes da montagem, e a dor veio antes das duas.** Esta é a ordem que o desenho de hoje
não tem: hoje a cena roda antes de a criança ter qualquer motivo para querer uma borda.

**Por que são duas seções e não uma.** A regra das duas colunas admite uma única coisa na coluna da
direita por seção, e a cena e o Estúdio brigariam pelo mesmo espaço. Separadas, a cena abre inteira
e a montagem fica ao lado do projeto dela.

### Seção 5. Onde o Dino vai ficar na tela

- **Intenção:** conceito
- **Por que existe:** no bloco seguinte ela vai escrever 110 e 150 em dois campos. Sem sentir a
  direção antes, são dois números sem significado, e o y contraria a intuição dela.
- **Conclui quando:** as três metas de `coordinates` caem e a pergunta final é respondida
- **Blocos:**
  1. `video` (`video-coordenadas`): ponte curta, com a narração já gravada sobre x e y. "O x diz se
     ele fica mais para a esquerda ou mais para a direita. O y diz se fica mais para cima ou mais
     para baixo. E tem uma coisa do y que pega todo mundo de surpresa: o y cresce para baixo."
     **Cortar o marcador animado sobre a cartela e a frase de que não há arraste nem parâmetros
     para a criança**, conforme o aviso que o próprio roteiro já traz. Duração alvo: 20 a 30
     segundos.
  2. `interactive`: cena `coordinates`, "O endereço na tela". Elenco: Dino. Cenário: `corre-dino`.
     O palco abre em x 110, y 150, os mesmos números do bloco que vem a seguir.

### Seção 6. Crie o seu dinossauro

- **Intenção:** construção
- **Por que existe:** é o primeiro personagem do jogo dela, e a seção termina numa surpresa de
  propósito.
- **Conclui quando:** `Criar dinossauro dino em x 110 y 150 tamanho 64 cor` está no `Ao iniciar`,
  logo abaixo do `Mostrar a borda da tela`
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Kits prontos, Dino, pega o `Criar dinossauro __ em x __ y __ tamanho
     __ cor __` e encaixa dentro do `Ao iniciar`, logo abaixo do `Mostrar a borda da tela`. O nome
     já nasce escrito dino, e pode ficar assim. O x vem 120, troca por 110. O y já
     está em 150, deixa. O tamanho já vem 64, deixa também. A cor é sua."
  2. `video` (`video-criar-dino`): a criação, a palavra sprite nomeada na hora, a escolha da cor e
     o aviso de leitura: daqui para frente o vídeo vai dizer "dino", e ela lê isso como o nome que
     ela deu. **Retirar o trecho de coordenadas**, que agora é a seção anterior, retomando em "O y
     já está em 150". **Não dizer que 150 é a altura da grama**, porque não é: quem leva o Dino à
     grama é a gravidade, na Aula 3. **Manter a surpresa de o Dino não aparecer, sem dizer que
     houve erro.** Duração alvo: 50 a 60 segundos.
  3. `studio`: conferência dos quatro campos e da posição na pilha.
  4. `dialogue`: "Olha a área do jogo. O Dino não apareceu."

### Seção 7. Criar e mostrar são duas coisas diferentes

- **Intenção:** conceito
- **Por que existe:** a tela continua vazia e, nesse instante, a criança acha que errou. O conceito
  é a resposta de uma pergunta que ela acabou de fazer sozinha.
- **Conclui quando:** as duas metas de `world` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: "Você não errou nada. Criar o Dino e mostrar o Dino são duas coisas diferentes, e
     hoje você fez só a primeira. Olha isto aqui."
  2. `interactive`: cena `world`, "Criar e mostrar são duas coisas diferentes". Elenco: Dino.
     Cenário: `corre-dino`. **Passar para obrigatória**: hoje ela conclui a seção estando marcada
     como opcional.

**Sem mudança de estrutura.** O par dor mais conceito desta seção já está certo no v6 e serve de
modelo para as outras.

### Seção 8. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com o projeto conferido e guarda as ideias, deixando a pergunta
  do Dino invisível aberta para a Aula 2.
- **Conclui quando:** a entrega é enviada e as três perguntas do quiz são respondidas
- **Blocos:**
  1. `video` (`video-fecho`): o clipe passa a levar o fecho inteiro. Abre com o teste e o envio, que
     eram balão: confirmar o número saindo do campo, olhar a área do jogo com a telinha, a borda em
     volta e o painel na cor escolhida, ouvir que o Dino continua invisível e que hoje é para ser
     assim mesmo, conferir os objetivos e enviar. Só então a recapitulação dos três passos, que
     volta a bater com o que a aula fez, e o gancho da Aula 2: "Na próxima aula o seu dino aparece
     na tela, correndo, com a floresta se mexendo atrás dele. E é lá que eu vou te contar uma coisa
     que está dentro de quase todo jogo." **Trocar "TODOS os jogos do mundo" por "quase todo
     jogo"**, conforme a regra de escopo honesto do curso. Duração alvo: 50 a 65 segundos.
  2. `quiz`: as três perguntas de hoje, com uma correção. Na pergunta "Onde ficam os blocos que
     preparam a partida?", **trocar a alternativa errada "Só dentro do evento de pulo"**, que cita
     uma área que estreia na Aula 4, por "Em qualquer lugar da área de montar, solto".
  3. `studio`: entrega, com os quatro critérios de montagem: `Ao iniciar` no projeto; `Preparar o
     jogo em tela cheia, tela 480 × 270`; `Mostrar a borda da tela` com espessura 4, logo abaixo;
     `Criar dinossauro dino em x 110 y 150 tamanho 64`, por último. A ordem da pilha entra como
     critério. É o último item de `blockKeys`.

**Junta três seções de hoje.** A entrega, o fecho e o quiz viram uma seção só, como no padrão do
projeto.

**Por que o balão de conferência saiu.** Balão depois da ferramenta não existe para quem faz a
aula: o Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do
Estúdio" não é um lugar. Nada foi apagado. A conferência, o envio e a recapitulação moraram sempre
no mesmo minuto da aula, e agora moram no roteiro do `video-fecho`.

## Experiências e demonstrações desta aula

### 1. `stage-size` · A tela e o limite dela · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena é exatamente o que a aula precisa, e o palco já abre em 800 por 480 com a
  borda escondida, que é o estado de fábrica do bloco. Os três ajustes desta análise foram feitos.
- **Ajuste 1, de percurso: feito.** Ela roda depois de a criança preparar a tela, quando a confusão
  já existe no projeto dela.
- **Ajuste 2, de metas: feito, com um id diferente do proposto.** A meta do meio existe e se chama
  **`resized`**, com o rótulo "A borda acompanha os números" e o pedido "Com a borda à vista, mude
  a largura ou a altura", que são palavra por palavra os que esta análise pediu. O motor confere a
  borda à vista: sem ela a meta não cai, e a bancada mantém os números fechados. O id `follows`
  também foi criado, como meta só de caso (`soNoCaso`), e por isso fica fora da missão de fábrica.
  **Vale o id do código: a aula cobra `resized`.**
- **Ajuste 3, pergunta final: feita.** O `semPerguntaFinal` saiu, e a pergunta é a que planta a
  retirada da borda na Aula 2:
  - Pergunta: "Se a borda for apagada, o que muda no jogo?"
  - "Nada no jogo. Só sai o desenho que mostrava o limite." ✓
  - "A tela do jogo fica maior."
  - Explicação ao acertar: "A borda é um instrumento. Ela desenha uma moldura para você enxergar
    onde a telinha começa e termina. O tamanho continua sendo os dois números que você escreveu."
- **Elenco/cenário:** cenário `corre-dino`, sem personagem do elenco.
- **Metas cobradas nesta aula:** `border-on`, `resized`, `target`, que são exatamente as três da
  missão de fábrica. O bloco **não declara `setup.goals`** de propósito: sem lista, a cena cobra
  todas as metas dela que não são só de caso, e essas três são as da aula.

### 2. `coordinates` · O endereço na tela · **CONSTRUÍDA, SERVE COMO ESTÁ**

- **Situação:** serve como está. Três metas, pistas boas, pergunta final correta e o palco abrindo
  em x 110, y 150, os mesmos números do bloco seguinte. Já está marcada como obrigatória.
- **Elenco/cenário:** Dino, cenário `corre-dino`.
- **Metas cobradas nesta aula:** `right`, `down`, `origin`, que são as três de fábrica. Sem
  `setup.goals` no bloco, de propósito.

### 3. `world` · Criar e mostrar são duas coisas diferentes · **CONSTRUÍDA, AJUSTE APLICADO**

- **Situação:** a cena serve exatamente como está, com as duas metas, a pergunta final e a
  explicação. O problema era só de configuração, e foi resolvido.
- **Ajuste: feito.** O bloco estava com `required: false` sendo o único critério de conclusão da
  seção, e passou para obrigatório.
- **Elenco/cenário:** Dino, cenário `corre-dino`.
- **Metas cobradas nesta aula:** `hidden`, `visible`, que são as duas de fábrica. Sem `setup.goals`
  no bloco, de propósito.

### Cenas que a aula não recebe, e por quê

A cena de acessibilidade **saiu da Aula 1 em 20/09/2026**, junto com o passo que ela preparava, por
decisão de produto. Ela continua existindo no catálogo e serve a quem quiser usá-la em outro curso.
Não volta para cá.

`once-vs-always`, a cena das duas áreas do projeto, **não entra na Aula 1**. O motivo é uma regra
dura do curso: só se explica o que vai ser usado agora, e a Aula 1 usa uma área só. A cena compara
`Ao iniciar` com `Enquanto estiver rodando`, então usá-la hoje apresentaria a segunda área uma aula
inteira antes de ela existir no projeto, e a criança não teria nada no jogo dela para ancorar o
contraste. Ela entra na **Aula 2**, na seção em que a criança passa a ter uma ação em cada área:
`Criar dinossauro` no `Ao iniciar` e `Desenhar o sprite` no motor.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|
| `video-abertura` | o jogo pronto rodando e o resultado de hoje | `video-abertura-v7` | 45 a 60 s | fala quase toda, tela não (regravar no Estúdio atual). Manter a enumeração dos três passos |
| `video-area-e-tela` | a área `Ao iniciar`, o tabuleiro, a tela 480 × 270 e a cor pintando tudo | `video-iniciar-v7` mais a primeira metade de `video-tela-v7` | 70 a 85 s | funde dois clipes, tela regravada. Termina na confusão, sem resolver |
| `video-borda` | o encaixe da borda e o retângulo aparecendo | segunda metade de `video-tela-v7` | 55 a 65 s | fala sim, tela não |
| `video-coordenadas` | ponte curta sobre x e y, sem marcador animado | `video-coordenadas-demo-v7` | 20 a 30 s | fala parcial. Cortar tudo o que descreve a demonstração antiga |
| `video-criar-dino` | pegar, configurar e pintar o Dino, e ele não aparecer | `video-dino-v7` | 50 a 60 s | fala sim, com dois cortes (coordenadas e a frase da grama) |
| `video-fecho` | o teste e o envio, e então a recapitulação dos três passos e o gancho da Aula 2 | `video-fecho-v7` mais o teste e o envio regravados | 50 a 65 s | fala sim, com a substituição do escopo absoluto. Absorve o balão de conferência da entrega |

**Saldo:** de 6 clipes para 6. Em minutagem a conta cai, porque o clipe das coordenadas perde o
marcador animado (a cena faz melhor), o clipe do Dino perde o trecho dos eixos, e dois clipes viram
um só.

## Continuidade

- **O que esta aula assume da anterior:** nada de programação. Não existe Aula 0, e o curso começa
  direto no jogo. Assume só que a criança acha um bloco na coluna da esquerda, arrasta, encaixa e
  troca um número.
- **O que esta aula entrega para a Aula 2:** a área `Ao iniciar` com três blocos, nesta ordem
  exata, que é a ordem oficial do curso:
  1. `Preparar o jogo em tela cheia, tela 480 × 270, fundo` (cor à escolha)
  2. `Mostrar a borda da tela, cor, espessura 4` (cor à escolha, com contraste sobre o céu)
  3. `Criar dinossauro dino em x 110 y 150 tamanho 64 cor` (cor à escolha)

  O Dino fica criado e invisível. A pergunta "cadê o Dino" é o gancho que a Aula 2 responde no
  primeiro desenho. A borda está no meio da pilha, com a criação do Dino abaixo dela, e é disso que
  a Aula 2 depende para ensinar o `Apagar este bloco`: arrastar a borda leva **dois** blocos junto.
- **Valores canônicos que saem daqui:** tela 480 × 270 · espessura da borda 4 · identificador do
  sprite `dino` · Dino em x 110, y 150, tamanho 64.
- **Campos livres:** cor do céu, cor da borda, cor do Dino e o nome do sprite. Nenhuma aula
  posterior cita essas cores como fato, e todo bloco que usa o sprite depois traz um seletor com a
  lista, então o nome escolhido não precisa ser redigitado nunca mais.
