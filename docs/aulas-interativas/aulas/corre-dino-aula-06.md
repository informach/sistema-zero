# Corre, Dino! · Aula 6 · O medidor mostra o que ninguém vê

## Resumo

- **Estado de entrada:** o jogo já parece jogo. Em `Ao iniciar`: `Preparar o jogo em tela cheia, tela
  480 × 270, fundo azul-claro`, `Criar dinossauro dino em x 110 y 150 tamanho 64` e
  `Criar grupo de sprites cactos`. Em
  `Quando acontecer`: `Quando o sprite dino pular` com `Tocar efeito` com `pulo`. Em
  `Enquanto estiver rodando`: um `A cada quadro do jogo` com sete blocos e, ao lado dele, um
  `A cada 1.4 segundos fazer` com `No grupo cactos criar obstáculo cacto em x 560 tamanho 44 com
  vx -5`. Os cactos entram, passam e somem pela esquerda.
- **Vitória do dia:** o medidor deixa de subir sem parar e passa a subir e descer, equilibrado. É a
  primeira vez que ela vê um número contando uma coisa que a tela esconde.
- **Seções hoje:** 9 · **Seções propostas:** 6
- **Clipes hoje:** 6 · **Clipes propostos:** 5. A contagem não muda com o redesenho da entrega:
  nenhum clipe entrou nem saiu, o `video-aposentar-medidor` é que cresceu e passou a levar o fim do
  dia inteiro.
- **Fecho da entrega:** a orientação de montagem, o teste e a recapitulação saíram do balão e foram
  para o roteiro do `video-aposentar-medidor`, e só o gancho da Aula 7 continuou balão. Balão depois
  da ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da direita
  e todo o resto na esquerda.
- **Cenas:** 1 (`cleanup`), construída no catálogo, com as duas metas de fábrica que a aula precisa:
  `invisible-stored` e `rule-removes`.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| O medidor: montar um instrumento para ver o invisível | Não é conceito de programação, é método de trabalho | Não | | Dito na hora de montar, e cobrado de volta no fim | O instrumento em si é o que torna concreto todo o resto da aula. A criança entende quando ele entra e quando ele sai, não quando alguém explica |
| Bloco de valor que não mostra nada contra bloco que mostra | Sim, mas testável em dois segundos | Não | | Uma linha na montagem | Ela encaixa o `quantos sprites tem no grupo` no valor e o número aparece na hora. Ver a nota sobre a cena `variable`, abaixo |
| **A dor:** o grupo só cresce | Não é conceito, é um defeito real do jogo dela | **Roda no jogo dela, mas devagar demais** | Seção de dor, com o relógio abaixado de propósito e dito | Depois do medidor, antes da faxina | A dor é verdadeira desde a Aula 5. O que ela não tem é velocidade. A aula acelera o relógio e diz que está acelerando |
| Visível não é a mesma coisa que existente | Sim. É o conceito da aula, e a tela é feita para esconder isso | **Sim** | Experimentação, `cleanup` | Depois da dor, antes de montar a faxina | Sem ver a prateleira dos bastidores, a criança não tem como acreditar que o cacto que sumiu continua lá |
| A faxina (a regra que tira do grupo quem já foi embora) | Sim, e é a outra metade do mesmo conceito | **Sim, dentro da mesma cena** | Segunda meta de `cleanup` | Junto | Sair da tela e ser tirado do grupo são as duas metades de uma ideia só. Partir em duas cenas repetiria o palco |
| A faxina não tira quem está chegando | Sim, e é risco real de confusão | **Sim, dentro da mesma cena** | Ajuste no palco de `cleanup` | Junto | A Aula 5 acabou de ensinar que o cacto nasce em x 560, **fora** da tela. Sem esse cuidado, a criança conclui que a faxina mata o cacto recém-nascido |
| A ordem: limpar antes de medir | Sim, mas mínimo | Não | | Uma linha na montagem e um critério | O critério `medir depois` já cobra. Explicar por que o número mentiria um quadro inteiro é mais caro do que vale |
| A faxina dá conta em qualquer ritmo | Não. Ela compara dois números | Não | | Dentro do clipe da faxina | É a generalização da ferramenta, e cabe em quinze segundos de observação com o medidor aceso |
| O apelido `cacto` e o `fazer` vazio | Não. São dois campos | Não | | Uma linha na montagem | Todo campo recebe uma fala, inclusive o que fica vazio |
| Reciclar sprites em vez de fabricar novos (`pool`) | Sim, mas **não é conteúdo deste curso** | Não | | | A cena `pool` existe e é boa, e o conceito dela é outro: quantos o jogo já fabricou. Este curso descarta e pronto, não recicla. Forçar a cena aqui ensinaria uma peça que a criança nunca vai montar |
| Guardar, mudar e mostrar (`variable`) | Sim, mas **é da Aula 11** | Não | | | Ver a nota abaixo |

Onze coisas, três concretizações, e as três moram numa cena só. Oito conceitos não ganham nada, e é
essa triagem que tira a aula de 9 para 6 seções.

**Por que a cena `variable` fica de fora.** Ela é ótima e separa três coisas que de fato se confundem:
guardar um número, mudar o número e mostrar o número. Mas dois motivos a barram aqui. O primeiro é que
o `quantos sprites tem no grupo` **não guarda nada**: ele lê o grupo naquele instante, e não tem
memória nenhuma. Usar a cena da caixinha para explicá-lo ensinaria a coisa errada. O segundo é a regra
de imagem única da `referencia-blocos-corre-dino.md`: a **caixinha** é a imagem da variável e estreia
na Aula 11. Trazer a caixinha para a Aula 6 significa a criança carregando duas caixinhas diferentes
na cabeça durante cinco aulas.

## Diagnóstico do desenho atual

**Esta é a aula que mais acerta a ordem, e vale registrar.** *Monte um medidor do que está guardado* e
*Veja o número crescer* são duas seções separadas, na ordem certa: primeiro o instrumento, depois a
dor, e a dor fecha sozinha antes de qualquer ferramenta aparecer. A seção do medidor é o raro caso em
que montar uma peça que não é do jogo se justifica sozinha. As duas ficam.

**A honestidade da provocação está no trecho gravado e sumiu do desenho da seção.** O trecho original
diz, com todas as letras, "a gente vai apressar ele de propósito". A nota de tela da seção *Veja o
número crescer* diz apenas "trocar o relógio de 1.4 para 0.1, com a câmera fixa no número do medidor
subindo sem parar". Quem montar a aula pela nota de tela produz uma dor encenada sem aviso, e é
exatamente isso que o briefing proíbe. Falta ainda um segundo cuidado: **mostrar o número no ritmo
normal antes**, com o relógio em 1.4, subindo devagar. Sem essa leitura de base, a criança pode
concluir que o acúmulo é invenção do 0.1, e não um problema que o jogo dela tem desde a Aula 5.

**A cena `cleanup` parecia ter uma meta só para duas descobertas, e não tem.** O roteiro declara
"Saiu da tela e ficou no grupo" e "A regra tirou do grupo quem saiu". As duas existem na missão de
fábrica, `invisible-stored` e `rule-removes`. O diagnóstico de que a cena fecharia na primeira
metade fica registrado como resolvido.

**A cena não mostra o caso que a Aula 5 acabou de criar.** O palco começa com três cactos na tela e
três no grupo, todos já dentro. No jogo dela, o cacto **nasce fora da tela**, em x 560, e entra
andando. A ficha do bloco é explícita: ele "só tira quem já foi embora de verdade: o que nasce fora da
tela e ainda está vindo continua no jogo". Do jeito que a cena está, a conclusão mais natural para a
criança é que a faxina apaga tudo que está fora da tela, e isso mataria o cacto recém-nascido dela.

**A seção *Volte ao ritmo da partida* faz três coisas de naturezas diferentes.** Comparar 0.1 com 0.5
é a prova de que a ferramenta funciona em qualquer ritmo, e pertence à seção da faxina, com o medidor
ainda aceso. Devolver o relógio para 1.4 e aposentar o medidor é arrumar a casa antes de entregar.

**Duas seções para fechar**, o mesmo padrão do curso: *Veja o que você aprendeu* com o clipe de
recapitulação e *Confira as ideias de hoje* com o quiz.

**O fecho promete duas peças de aulas futuras.** O trecho original anuncia o raio-X da Aula 10 e a
volta do `Mostrar placar` na Aula 11. A regra do curso é não prometer peça para depois, porque
promessa cria referência solta: se a aula prometida mudar, a aula que prometeu fica órfã. A frase de
método ("instrumento a gente guarda quando termina de usar") fica, porque é sobre o que ela acabou de
fazer. As duas promessas saem.

**Há uma contradição documental sobre quando o medidor sai, e ela precisa ser resolvida no papel.**
A `referencia-blocos-corre-dino.md` diz duas coisas opostas sobre si mesma: a seção 2.5 e a seção 5
afirmam que o `quantos sprites tem no grupo` entra na Aula 6 e sai na Aula 7, enquanto a tabela da
seção 7, na mesma referência, diz "aposentados no passo 4" da própria Aula 6. O README do v6 já
decidiu: seguir a Parte 4 e o Fecho, com a retirada na Aula 6. Esta análise segue essa decisão, e o
argumento da seção 2.5 ("dois blocos menos para arrastar na manobra mais difícil do curso") continua
valendo dos dois jeitos, porque em qualquer um deles a Aula 7 embrulha seis blocos e não oito. As
seções 2.5 e 5 da referência precisam ser corrigidas.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** a aula inteira é sobre uma coisa que não aparece na tela, e a criança precisa
  saber disso no primeiro minuto, senão ela passa a aula procurando um defeito visível.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`). O jogo dela rodando, bonito, sem defeito nenhum aparente. Fala
     curta: "Olha o seu jogo. Cacto vindo, Dino pulando, tudo funcionando. Só que tem
     uma coisa acontecendo aí dentro, agora, que você não tem como ver. Hoje a gente vai construir
     um medidor para enxergar essa coisa, e depois vai consertar ela." Duração alvo: 25 a 35
     segundos.

### Seção 2. Um medidor para ver o invisível

- **Intenção:** construção
- **Por que existe:** sem o instrumento não existe dor nenhuma para sentir. É a única peça do curso
  que entra sabendo que vai sair, e isso é dito na hora de montar.
- **Conclui quando:** existe um `Mostrar placar` dentro do `A cada quadro do jogo` com o
  `quantos sprites tem no grupo cactos` encaixado no valor
- **Blocos:**
  1. `dialogue`. Orientação de montagem: "Em Jogo 2D, Vida e placar, Indicadores e texto na tela,
     pegue o `Mostrar placar` e encaixe dentro do `A cada quadro do jogo`, logo abaixo do
     `Desenhar o grupo cactos`, que hoje é o último bloco de lá. Ele tem seis campos, e a gente vai
     passar por todos. O primeiro é o texto: apaga o que veio escrito e escreve `Cactos`. O segundo é
     o valor, e é onde entra a peça que conta. Em Jogo 2D, Grupos, Criar e percorrer, pegue o
     `quantos sprites tem no grupo` e arrasta **por cima** do que já está no campo do valor. No
     campinho do grupo dele, escolhe `cactos`. Esse bloco sabe quantos sprites estão dentro do grupo
     agora, e sozinho ele não mostra nada: ele só sabe o número. Por isso a gente emprestou o
     `Mostrar placar`, que é um bloco que sabe mostrar. Depois vêm o x e o y, que são o lugar do
     número na tela: deixa os dois como vieram, porque isso aqui é um medidor, não é o placar do
     jogo. O quinto é a cor, e eu vou botar um azul escuro, porque o céu do jogo é claro e o número
     precisa aparecer. O sexto é o tamanho, e fica como veio. Agora olha a área do jogo, ali do
     lado."
  2. `video` (`video-medidor`). O gesto e os seis campos, um a um, com o encaixe do valor por cima.
     Termina no número apareceu no canto. A fala nomeia o método: "Esse número é o nosso medidor. Ele
     não vai ficar no jogo para sempre: ele é o nosso instrumento, para enxergar o invisível."
     Duração alvo: 60 a 70 segundos.
  3. `studio`. Conferência do medidor com o valor encaixado.

### Seção 3. O número que só sobe

- **Intenção:** dor
- **Por que existe:** o acúmulo é verdadeiro desde a Aula 5 e acontece agora, no jogo dela. O que
  falta é velocidade, e a aula dá essa velocidade dizendo que está dando.
- **Conclui quando:** o medidor continua montado e a criação de cactos está num
  `A cada 0.1 segundos fazer`
- **Blocos:**
  1. `video` (`video-provocar`). Em duas partes, e a primeira é obrigatória. **Parte um, o ritmo
     normal:** o medidor aceso com o relógio ainda em 1.4, e a câmera parada nele por uns segundos,
     mostrando o número subir devagar e não descer nunca. Fala: "No ritmo do nosso jogo, com o
     relógio em 1.4, o problema já está acontecendo. Olha o número: ele sobe e não volta. Só que ele
     sobe tão devagar que você ia ficar um tempão aí olhando até desconfiar." **Parte dois, a
     provocação, dita:** "Então a gente vai apressar o relógio de propósito, só para ver em dez
     segundos uma coisa que levaria minutos. Vai no relógio, aquele `A cada 1.4 segundos fazer`, e
     troca o 1.4 por 0.1. Isso faz nascer cacto quase sem parar. Agora olha o número: vinte,
     cinquenta, cento e vinte, duzentos. E ele nunca desce." Fecha sem conserto: "Cada cacto que sai
     pela esquerda continua existindo. Ele some da sua vista, e o jogo continua cuidando dele:
     movendo, desenhando, tomando conta de um monte de cacto que ninguém vai ver de novo. E isso já
     estava acontecendo desde a Aula 5, no seu jogo, o tempo todo. Você não fazia ideia, e não era
     falta de atenção sua: foi o medidor que contou." Duração alvo: 35 a 45 segundos.
  2. `studio`. Conferência do relógio em 0.1, que é o estado provisório desta seção.

**Sem cena e sem conserto.** A dor fecha na leitura do número. A honestidade fica na fala e não na
nota de tela: a criança sabe que o 0.1 é uma lente de aumento, não o defeito.

**Por que esta seção não tem fala de montagem, e é de propósito.** A ordem importa aqui mais do que
em qualquer outra seção da aula: a leitura de base em 1.4 precisa vir antes de qualquer instrução
para baixar o relógio. Uma `dialogue` com a ordem de trocar 1.4 por 0.1 apareceria na coluna da
esquerda ao lado do vídeo, e uma frase curta se lê antes de um clipe de quarenta segundos. A criança
baixaria o relógio primeiro e nunca veria o número subir devagar. Por isso a instrução do 0.1 mora
dentro do clipe, na parte dois, e a seção fica com um bloco só na esquerda.

### Seção 4. Sair da tela não é ser apagado

- **Intenção:** conceito
- **Por que existe:** o número sobe e a criança não tem como acreditar no motivo, porque a tela
  esconde exatamente o que está sendo contado. A cena abre os bastidores e deixa ela ligar e desligar
  a regra.
- **Conclui quando:** as metas `invisible-stored` e `rule-removes` caem, e a pergunta final da cena é
  respondida
- **Blocos:**
  1. `dialogue`. Abertura curta do Zappy, sem vídeo: "O número diz que os cactos continuam lá. Só que
     a tela não mostra. Aqui do lado dá para olhar os bastidores e ver onde eles estão guardados."
  2. `interactive`. Cena `cleanup`, "Para onde vai o cacto que sai da tela?". Elenco: cacto. Cenário:
     `corre-dino`.

**Não tem vídeo de propósito.** A prateleira dos bastidores ao lado da tela é uma imagem que nenhuma
narração substitui, e é a cena que permite ligar a regra, desligar e comparar.

### Seção 5. A faxina

- **Intenção:** construção
- **Por que existe:** é o conserto, é um bloco só, e a prova de que funciona é o mesmo número que
  denunciou o problema mudando de comportamento na frente dela.
- **Conclui quando:** o `Tirar do grupo cactos quem sair da tela` está dentro do
  `A cada quadro do jogo`, antes do `Mostrar placar`, com o apelido `cacto`
- **Blocos:**
  1. `dialogue`. Orientação de montagem: "Em Jogo 2D, Grupos, Participação e limpeza, pegue o
     `Tirar do grupo quem sair da tela, para cada um (chamado )`, aquele comprido. Encaixa dentro do
     `A cada quadro do jogo`, entre o `Desenhar o grupo cactos` e o `Mostrar placar` do medidor. Ele
     tem dois campos e um espaço de fazer. No campo do grupo, escolhe `cactos`. O apelido vem escrito
     `sprite`: troca por `cacto`, para ficar com a cara do nosso jogo. E o espaço de fazer, por
     dentro, deixa vazio, que hoje a gente não precisa dele. Ele vem antes do medidor de propósito:
     primeiro a gente limpa, depois a gente lê o número. Agora olha o número, ainda com o relógio em
     0.1."
  2. `video` (`video-faxina`). Em duas partes. **Parte um, o conserto:** o gesto, os dois campos, e o
     número subindo e descendo com o relógio em 0.1. Fala: "Ele sobe e desce, e fica equilibrado,
     oscilando numa faixa em vez de crescer sem parar. Porque agora, quando o cacto sai da tela, ele
     é descartado de verdade. Esse número subindo e descendo é a vitória de hoje. Parece pouco, e é o
     retrato de um jogo saudável: nasce, sai, é descartado, e o número fica no lugar. Isso tem nome:
     chama faxina. E a regra vale sempre: todo jogo que faz coisas nascerem sem parar precisa de uma
     faxina para limpar quem já foi embora." **Parte dois, a prova em outro ritmo:** trocar o relógio
     para 0.5, com o medidor aceso, e comparar. Fala: "Com 0.5 nasce muito menos, e o número sobe e
     desce bem mais baixo. Repara no que é igual nos dois: em nenhum deles o número fica só subindo.
     Não importa o ritmo, a faxina dá conta." Duração alvo: 70 a 85 segundos.
  3. `studio`. Conferência dos três critérios: a faxina no laço, o medidor ainda montado, e a faxina
     antes do medidor.

**A comparação de dois ritmos muda de seção.** Hoje ela está no fim da aula, misturada com a arrumação
da casa. Ela é a prova da ferramenta e pertence à ferramenta.

### Seção 6. Devolve o relógio, guarda o medidor e entrega

- **Intenção:** construção, entrega e fechamento
- **Por que existe:** a aula termina com o projeto exatamente como a Aula 7 assume, e com o
  instrumento guardado. A criança fecha o ciclo que ela mesma abriu no começo do dia.
- **Conclui quando:** o relógio está em 1.4, não existe nenhum `Mostrar placar` no projeto, a faxina
  continua no laço, a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-aposentar-medidor`). O clipe passa a levar o fim do dia inteiro, em seis passos
     na tela: a troca do relógio de volta para 1.4, dita como devolução, porque esse é o ritmo que
     vale daqui para frente; a leitura tranquila do medidor nesse ritmo, um número baixo subindo e
     descendo devagar; a apresentação do medidor antes da retirada, o `Mostrar placar` lá embaixo
     com o bloco de contar encaixado dentro dele; o arrasto para a lixeira, com o bloco de contar
     indo junto; uma partida curta depois da faxina, com os cactos entrando pela direita, passando e
     sumindo, e nenhum número cobrindo a partida; os objetivos conferidos e o envio. Fala de método,
     sem promessa de peça futura: "O medidor fez o trabalho dele. Mostrou para você um problema que
     era invisível, você consertou, e ele mostrou que o conserto funcionou. Agora ele sai, porque ele
     nunca foi parte do jogo: era instrumento, e instrumento a gente guarda quando termina de usar.
     Olha o seu `A cada quadro do jogo` agora: ele ficou com oito blocos, do `Limpar a tela` até a
     faxina, e é assim que ele fica no fim de hoje." E o clipe **passou a fechar com a recapitulação
     do dia**, que era balão: hoje é o único dia do curso em que o jogo terminou com a mesma cara de
     quando começou, e mesmo assim ele não é o mesmo, porque agora ele descarta sozinho quem já foi
     embora. Duração alvo: 70 a 85 segundos.
  2. `dialogue`. Gancho da Aula 7, o único balão que fica aqui porque é curto e não depende de ter
     acabado de jogar: "Na Aula 7 o seu jogo vai aprender que ele está sempre num lugar de cada
     vez."
  3. `quiz`. As três perguntas atuais, mantidas como estão.
  4. `studio`. Entrega, com os três critérios do manifesto atual: a faxina no laço, o relógio em 1.4 e
     nenhum `Mostrar placar` sobrando. É o último item de `blockKeys`.

**Junta três seções de hoje.**

**Por que os quatro balões saíram.** Balão depois da ferramenta não existe para quem faz a aula: o
Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do Estúdio" não
é um lugar. E aqui havia um agravante: dois dos balões ensinavam gesto, um arrasto e uma troca de
campo, que é justamente o que o vídeo faz melhor. Nada foi apagado. A orientação de montagem, o
teste e a recapitulação foram para o roteiro do `video-aposentar-medidor`, e só o gancho da Aula 7
continuou balão.

## Experiências e demonstrações desta aula

### 1. `cleanup` · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena é o conceito da aula inteira e a prateleira dos bastidores ao lado da tela é a
  imagem certa. Três coisas precisavam mudar, e a primeira já estava resolvida.
- **Ajuste 1, meta nova `rule-removes`: já existe.** A cena tem duas metas de fábrica, não uma:
  `invisible-stored` e `rule-removes`, esta última com o rótulo "A regra tirou do grupo quem saiu",
  que é palavra por palavra o rótulo pedido aqui. **A aula cobra `rule-removes`.** O Dia 2 do
  Desafio, que pedia o mesmo par, declara `rule-removes` também.
- **Ajuste 2, rótulo da regra.** A cena chama a chave de "Remover do grupo quem saiu da tela". O bloco
  do Estúdio é `Tirar do grupo __ quem sair da tela, para cada um (chamado __ )`, em Jogo 2D › Grupos
  › Participação e limpeza. Alinhar o verbo e o nome da chave com o rótulo do bloco, na instrução, nas
  três pistas, nos pedidos das metas e na frase de sucesso. A criança vai procurar esse nome na coluna
  da esquerda poucos minutos depois de sair da cena.
- **Ajuste 3, um cacto chegando no palco.** Hoje o palco começa com 3 cactos na tela e 3 no grupo,
  todos já dentro. Acrescentar um quarto cacto **fora da tela, à direita, ainda entrando**, com o
  mesmo sentido do jogo dela. Com a regra ligada, esse cacto **não** é tirado do grupo, e a criança vê
  isso acontecer. Motivo: a Aula 5 acabou de ensinar que o cacto nasce em x 560, fora da tela, e sem
  esse caso no palco a conclusão natural é que a faxina apaga tudo que está fora da tela. A ficha do
  próprio bloco já afirma o comportamento, e a cena é o lugar de mostrá-lo.
  - Acrescentar à `pergunta_extra` da cena: "E o cacto que ainda está chegando, lá na direita? A
    regra tira ele também?"
- **Elenco/cenário:** cacto / `corre-dino`. Já é assim, sem elenco novo.
- **Metas cobradas nesta aula:** `invisible-stored` e `rule-removes`, que são as duas da missão de
  fábrica, e a cena não tem meta só de caso. O bloco **não declara `setup.goals`** de propósito: sem
  lista, a cena cobra as duas.
- **Onde mais serve:** todo curso em que alguma coisa nasce sem parar e some pela borda. É a cena da
  faxina, e a faxina é irmã do relógio da Aula 5: quem ensina um precisa do outro.

### 2. Cenas consideradas e recusadas

- **`pool`, "Quantos cactos o jogo já fabricou?".** Bonita e bem construída, e o conceito dela é a
  reciclagem: em vez de fabricar um cacto novo, o jogo reaproveita o que saiu. Este curso não recicla,
  ele descarta. A cena ensinaria uma peça que a criança não vai montar em nenhuma das 13 aulas, e o
  número de fabricados competiria com o número do medidor na cabeça dela no mesmo dia.
- **`variable`, "Guardar, mudar e mostrar".** Recusada pelos dois motivos da triagem: o
  `quantos sprites tem no grupo` não guarda nada, e a imagem da caixinha pertence à Aula 11 pela regra
  de imagem única do curso.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | Tem uma coisa acontecendo que você não vê | o jogo funcionando, com o aviso de que tem algo invisível | `video-abertura-editorial` | 25 a 35 s | fala parcial, tela regravada |
| `video-medidor` | Um medidor para o invisível | os seis campos do placar e o encaixe do valor por cima | `video-medidor` | 60 a 70 s | fala sim, tela regravada |
| `video-provocar` | O número que só sobe | o número em 1.4 subindo devagar, e depois em 0.1 | `video-provocar` | 35 a 45 s | fala sim, com a leitura de base em 1.4 acrescentada antes da provocação |
| `video-faxina` | O número sobe e desce | o bloco da faxina, o número equilibrando, e a prova em 0.5 | `video-faxina` + primeira metade de `video-aposentar-medidor` | 70 a 85 s | funde o conserto com a comparação de ritmos |
| `video-aposentar-medidor` | O instrumento a gente guarda | o relógio de volta em 1.4, a lixeira, a pilha de oito blocos, o teste, o envio e a recapitulação do dia | segunda metade de `video-aposentar-medidor` | 70 a 85 s | fala sim, sem as duas promessas de aulas futuras. Absorve os quatro balões de gesto e de fecho da entrega |

**Saldo:** de 6 clipes para 5. O clipe de fecho antigo sai, e o fecho passa a ser o fim do clipe da
entrega, depois do teste e do envio. O clipe da provocação ganha a leitura de base que faltava, e o
clipe da retirada do medidor é partido, com a comparação de ritmos migrando para a seção da
ferramenta.

## Continuidade

- **Assume da Aula 5:** o `Criar grupo de sprites cactos` em `Ao iniciar`, o relógio de 1.4 ao lado do
  `A cada quadro do jogo` com o `No grupo cactos criar obstáculo cacto em x 560 tamanho 44 com vx -5`
  dentro, e o laço com sete blocos, terminando no `Desenhar o grupo cactos`. Assume também que ela já
  arrastou um bloco para a lixeira e já apagou um bloco pelo botão direito, nas Aulas 2 e 4.
- **Entrega para a Aula 7:** o `A cada quadro do jogo` com **oito blocos**, nesta ordem:
  `Limpar a tela`, `Desenhar fundo de floresta (velocidade 5)`,
  `Aplicar a gravidade do mundo ao sprite dino`, `Controlar o dinossauro dino, força do pulo 14`,
  `Desenhar o sprite dino`, `Mover os sprites do grupo cactos usando suas velocidades`,
  `Desenhar o grupo cactos` e `Tirar do grupo cactos quem sair da tela, para cada um (chamado
  cacto)`. O relógio em 1.4. Nenhum `Mostrar placar` e nenhum `quantos sprites tem no grupo` no
  projeto.
- **Valores canônicos que saem daqui:** relógio devolvido em 1.4 · apelido `cacto` no bloco da faxina
  · corpo do `fazer` da faxina vazio · a faxina depois do `Desenhar o grupo cactos`.
- **Campos livres:** nenhum. A cor do medidor não conta, porque o medidor não sobrevive ao fim da
  aula.
- **Correção a fazer fora desta aula, 1.** A `referencia-blocos-corre-dino.md` se contradiz sobre
  quando o medidor sai: as seções 2.5 e 5 dizem Aula 7, e a tabela da seção 7 diz passo 4 da Aula 6. O
  README do v6 já decidiu pela Aula 6, e é o que esta análise segue. Corrigir as seções 2.5 e 5.
- **Correção a fazer fora desta aula, 2, e é de didática.** A `referencia-blocos-corre-dino.md`
  registra como micro-dor da Aula 11 o placar que nasce branco e não se lê no céu claro. A Aula 6
  empresta o mesmo `Mostrar placar` e já resolve a cor, então essa descoberta deixa de ser nova.
  Como o medidor é retirado hoje, o bloco da Aula 11 volta a nascer branco e o sintoma reproduz de
  novo, mas a criança já sabe a resposta. A Aula 11 precisa tratar isso como remissão para trás, no
  estilo que o curso já usa ("você já fez isso na Aula 6"), e não como descoberta. Fica registrado
  aqui para quem redesenhar aquela aula.

## Manifesto

Arquivo: `corre-dino-aula-06.manifesto.json`. **6 seções, 21 blocos.** Validado contra o validador
real do core: `OK`, sem avisos.

| Seção | Chave | Intenção | Coluna da direita |
|---|---|---|---|
| 1. O que a gente vai fazer hoje | `abertura` | `presentation` | nenhuma |
| 2. Um medidor para ver o invisível | `medidor` | `application` | Estúdio |
| 3. O número que só sobe | `numero-que-so-sobe` | `application` | Estúdio |
| 4. Sair da tela não é ser apagado | `visivel-guardado` | `exploration` | cena `cleanup` |
| 5. A faxina | `faxina` | `application` | Estúdio |
| 6. Devolve o relógio, guarda o medidor e entrega | `devolver-e-entregar` | `delivery` | Estúdio |

**Divisão pela regra das duas colunas:** nenhuma. As seis seções do desenho já respeitam o limite de
uma coisa por coluna da direita, porque a única cena da aula mora sozinha na Seção 4, sem Estúdio.

**Decisões registradas no manifesto:**

- **A ordem dos blocos da Seção 3 é o próprio conteúdo dela.** A seção tem um bloco só na coluna da
  esquerda, o `video-provocar`, com a leitura de base em 1.4 na parte um e a provocação para 0.1 na
  parte dois. O motivo de não haver fala de montagem está escrito na própria Seção 3, acima.
- O critério da Seção 3 cobra o relógio em 0.1, que é o estado provisório do dia, e a Seção 6 cobra
  o mesmo relógio de volta em 1.4. São dois estados do mesmo projeto em momentos diferentes da aula,
  e é o padrão que o próprio v6 já usava aqui.
- **O apelido `cacto` no bloco da faxina fica só na fala, sem critério.** O `projectCheck` do v6
  confere apenas o grupo, e o nome do campo do apelido não está declarado em lugar nenhum do
  manifesto v6. Inventar uma chave de campo para cobrar o apelido seria adivinhar.
- A cena `cleanup` entra com `required: true`. No v6 ela era o único critério da seção e estava como
  opcional.
