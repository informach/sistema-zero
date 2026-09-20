# Corre, Dino! · Aula 9 · O jogo inteiro

> Análise de redesenho didático. Formato herdado de `desafio-dia-1.md`.
> Esta é a aula em que o jogo fica completo. O desenho dela foi feito para isso aparecer.

## Resumo

- **Estado de entrada:** o jogo abre num menu com o nome que ela deu, começa com tecla, clique ou
  toque, e roda. O dino corre e pula, os cactos nascem, andam e saem do grupo pela faxina. E o dino
  atravessa o cacto como se um dos dois não estivesse ali. A partida não tem fim: só dá para parar
  fechando a página.
- **Vitória do dia:** o jogo inteiro. Menu, partida, batida com explosão, tremida e som, tela de
  fim, e uma partida nova com a pista limpa. No fim desta aula alguém pode jogar o jogo dela do
  começo ao fim sem ela explicar nada.
- **Seções hoje:** 10 · **Seções propostas:** 7
- **Clipes hoje:** 7 · **Clipes propostos:** 6. A contagem não muda com o redesenho da entrega:
  nenhum clipe entrou nem saiu, o `video-teste-e-envio` é que cresceu e passou a levar o fecho do
  módulo.
- **Fecho da entrega:** os dois testes, o fecho do módulo e a ponte para a Aula 10 saíram do balão e
  foram para o roteiro do `video-teste-e-envio`. A ponte foi junto porque ela depende de ter acabado
  de jogar. Balão depois da ferramenta não existe para quem faz a aula, porque o Estúdio fica
  sozinho na coluna da direita e todo o resto na esquerda.
- **Cenas:** 1 (`restart`), construída no catálogo. A terceira meta que a análise pedia existe, com
  o id `clean-track`.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Colisão: o jogo saber que duas coisas se encostaram | Não. É vocabulário em cima de uma dor que ela já viu | Não | | Dito na abertura | Ela já viu o dino atravessar o cacto. Nomear o que ela já sentiu não precisa de palco |
| A colisão é uma pergunta feita em todo quadro, não um aviso que chega | Sim | **Não** | | Explicado no vídeo, na hora da âncora | Uma cena precisaria oferecer a escolha entre a área de eventos e o motor, e essa escolha não existe: o bloco só encaixa no motor. Palco que oferece opção impossível ensina algo falso |
| O apelido: o bloco entrega o cacto que bateu, não o grupo | Sim. É uma referência, e referência não tem botão | **Sim**, por demonstração curta | Uma parada de um quadro dentro do vídeo da construção: três cactos congelados, o que bateu destacado, e uma seta até o campo do apelido | Na hora de preencher o terceiro campo | Não é relação com botão nem processo no tempo. É uma imagem que precisa ser vista uma vez, parada. Seção própria é caro demais para uma imagem |
| O terceiro andar do Se, e o bloco virando o mapa do jogo | Sim, mas já estava montado | **Sim**, pelo próprio bloco | Leitura do Se de cima para baixo, com zoom | Depois de montar o andar | A mecânica invisível da Aula 7 finalmente ganha um retrato. O instrumento é o próprio bloco crescido, e ele é o pagamento atrasado de duas aulas |
| Retorno pro jogador: som, tremida e partícula juntos | Sim, como padrão. Mas cada peça se sente na hora | **Sim**, no jogo dela | Demonstração por extremos conduzida: monta a explosão e bate, acrescenta a tremida e bate, acrescenta o som e bate | Durante a montagem, uma camada por vez | Ela testa em dois segundos no jogo dela. Cena aqui seria redundante, e a montagem em camadas ensina o padrão melhor do que qualquer palco, porque ela sente a diferença de cada acréscimo |
| Trocar de estado não apaga nada | Sim, e é o erro mais caro do dia | **Sim** | Experimentação (`restart`) | Depois de existir o estado `fim`, antes de montar o caminho de volta | É a única coisa do dia que o jogo dela não mostraria sem que ela montasse errado primeiro. E montar errado aqui custaria desmontar depois |
| `Reiniciar o jogo` roda as três áreas de novo | Sim | Não precisa de palco próprio | | Dito na hora do bloco, em cima do que a cena acabou de mostrar | A cena já mostrou a pista limpa. A frase só explica de onde vem a limpeza, e cabe em duas linhas |
| O mesmo evento, três respostas conforme o estado | Sim, e é a ideia mais sofisticada do módulo | **Sim**, no jogo dela | Teste dirigido na entrega: apertar uma tecla no meio da partida e não acontecer nada | Depois de montar | Ela testa em três segundos, e o "não acontece nada" rima com o teste do silêncio da Aula 7. Cena seria palco para o que ela faz com o dedo |
| A dica da tela de fim é a mesma promessa da tela de início | Não | Não | | Na hora do campo | A regra foi assentada na Aula 8. Aqui ela é aplicada, e aplicar é o reforço |
| Os estados prontos: `fim` já está na listinha | Não. Operação | Não | | Na hora da listinha | Não se digita nome de estado em lugar nenhum do curso. Uma frase resolve |
| A explosão morar no Kit espaço | Não | Não | | Na hora do caminho | Bloco bom se reaproveita. Uma frase, sem virar assunto |

Onze coisas, uma cena só, uma demonstração curta dentro de um vídeo e uma montagem em camadas. É o
dia com mais peças novas do curso e mesmo assim o de menor necessidade de palco, porque quase tudo
aqui acontece na tela dela e se sente no dedo.

**Cena considerada e recusada, 1:** `once-vs-always`. O `Reiniciar o jogo` roda as três áreas do
projeto de novo, então o "uma vez" acontece outra vez, e isso é exatamente o que a cena mostra. Só
que a criança acaba de ver a pista limpa na cena `restart`, e o que falta é uma frase de explicação,
não um segundo palco. Reaproveitar aqui encheria de conteúdo a aula que mais precisa de espaço para
respirar.

**Cena considerada e recusada, 2:** `group-loop`, "Qual deles está mais perto?". A tentação é usá-la
para o percurso do grupo. Ela foi recusada por duas razões: o elenco é uma torre que não existe
neste jogo, e o conceito dela é o laço solto sobre o grupo inteiro, que é dívida registrada para o
curso 5. O bloco de hoje é outro, já traz a pergunta da colisão dentro, e o apelido dele serve só
para o jogo dizer qual cacto bateu.

**Cena considerada e recusada, 3:** `contact`, "Encostando, ou começou a encostar?". A distinção
entre a pergunta contínua e o instante da batida é real e bonita, mas ela só importa quando o jogo
tem vida que escorre. Este jogo acaba na primeira batida. Além disso o palco de `contact` é feito de
corações, e corações não existem no Corre, Dino!.

## Diagnóstico do desenho atual

**A maior conquista do curso passa como mais um passo.** Nenhuma das dez seções nomeia o marco. Ao
fim desta aula o jogo está completo e jogável de ponta a ponta, e o material trata o dia como o nono
de treze. O fecho fala em "responda três perguntas curtas sobre o que mudou hoje".

**Duas seções são o mesmo clipe descrito duas vezes.** A seção 2 (*Qual cacto participou da
batida?*) e a seção 3 (*Faça a batida encerrar a partida*) carregam o mesmo "Trecho original
selecionado" na íntegra, a mesma fonte e a mesma Parte 1. A primeira declara demonstração e entrega
um clipe; a segunda entrega o mesmo clipe com outro nome.

**A boa ideia da seção 2 está presa no lugar errado.** A nota de tela dela é excelente: "Congelar
três cactos. Destacar o que colidiu e uma seta até o nome cacto no bloco." Isso é uma imagem de dez
segundos, e ela vale exatamente no instante em que a criança está com o cursor no terceiro campo do
bloco. Como seção separada, ela chega antes de o campo existir.

**A cena `restart` tinha três descobertas no roteiro e duas metas no catálogo, e agora tem três.** A
terceira, "Reiniciar começou com a pista limpa", é justamente a que a frase de sucesso da cena
celebra, e ela ganhou o id `clean-track`. Com ela, a cena só conclui depois de a criança chegar na
parte que dá nome ao dia, e o motor ainda exige que ela veja o problema antes da solução.

**A entrega não testa o caso mais elegante do dia.** A conferência final pede a rodada completa, mas
não pede o teste que prova o `senão se` do evento: apertar uma tecla no meio da partida e não
acontecer nada. Esse teste custa três segundos, fecha o arco que começou na Aula 7 com o teste do
silêncio, e hoje não está em lugar nenhum.

**Os rótulos seguem os da edição antiga.** `Ir para a tela` e `a tela atual é` não existem mais. Na
edição `jogo-2d-1.0-documento-2` são `Mudar o estado do jogo para` e `o estado do jogo é __ ?`, em
**Jogo 2D › Jogo e telas › Telas e partida**. O bloco da colisão, o `Soltar explosão no sprite`, o
`Tremer a tela com intensidade` e o `Reiniciar o jogo` a narração acerta, com uma ressalva: a
explosão está hoje em **Jogo 2D › Desenho e efeitos › Partículas**, e a fala manda procurar no Kit
espaço.

**Os três efeitos entram de uma vez só.** A seção 5 (*Mostre e sinalize a batida*) monta explosão,
tremida e som em sequência e só testa no fim. A criança recebe os três juntos e não sente o que cada
um acrescenta, que é justamente o conteúdo do padrão que a seção nomeia.

**O que a aula já faz certo e precisa ser preservado.** A leitura do Se de cima para baixo, na seção
4: "se a tela é jogando, joga; senão se é inicio, mostra o menu; senão se é fim, mostra a tela de
fim. Três andares, três telas, um bloco só." E a leitura do evento, na seção 7: "O mesmo aperto,
três respostas diferentes, dependendo de onde o jogo está." As duas ficam, com os rótulos trocados.

**Três seções são molde.** *Teste e entregue sua construção*, *Veja o que você aprendeu* e *Confira
as ideias de hoje* são um fechamento só, e hoje esse fechamento tem um trabalho extra: fechar o
módulo.

## Proposta final

### Seção 1. Hoje o seu jogo fica inteiro

- **Intenção:** apresentação
- **Por que existe:** a criança precisa ver a rodada completa antes de montar a primeira peça, e
  precisa ver a dor que sustenta o dia.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`): primeiro a dor, dez segundos: o dino chegando no cacto e passando
     por dentro dele, sem nada acontecer. Depois a rodada do fim do dia, em velocidade normal: menu,
     começar, correr, bater, explosão e tremida, tela de fim, tocar na tela, partida nova com a pista
     vazia. Fala curta: "Olha o que acontece quando o dino chega no cacto. Ele passa por dentro. Os
     dois estão ali e nenhum dos dois sabe do outro. Hoje isso acaba, e junto com isso o seu jogo
     ganha um fim e um jeito de jogar de novo. Quando esta aula terminar, o seu jogo vai ter começo,
     meio e fim." Duração alvo: 35 a 45 segundos.

### Seção 2. A batida acaba a partida

- **Intenção:** construção
- **Por que existe:** é o bloco central do dia, e ele traz junto o apelido, que é a ideia que a
  criança mais erra depois.
- **Conclui quando:** dentro do então de `Se o estado do jogo é jogando`, entre `Desenhar o grupo` e
  a faxina, existe um `Para cada sprite do grupo que colidir com o sprite` com grupo `cactos`,
  sprite `dino` e apelido `cacto`, e com `Mudar o estado do jogo para fim` dentro do fazer
- **Blocos:**
  1. `dialogue`: "A palavra de hoje é colisão, e ela quer dizer só isso: dois objetos do jogo se
     encostaram. No Estúdio o bloco fala colidir. Quando você ler que colidir com o sprite dino, lê
     na sua cabeça que encostar no dino."
  2. `video` (`video-colisao`): em Jogo 2D, Colisões, Encostar e bloquear, pegar o
     `Para cada sprite do grupo que colidir com o sprite`, que é o maior da lista. Arrastar para
     dentro do `Se o estado do jogo é jogando` e encaixar **entre** o `Desenhar o grupo` e o
     `Tirar do grupo quem sair da tela`, nomeando os dois. A fala da âncora explica o lugar: "ele
     mora aqui dentro do motor, junto com o resto do jogo acontecendo, porque isso não é um aviso
     que chega quando bate. É uma pergunta que o jogo faz em todo quadro: algum cacto está encostado
     no dino agora?" Os três campos, um a um: grupo `cactos`, sprite `dino`, e o terceiro, o do
     apelido, com `cacto` escrito. **Aqui entra a parada congelada:** o vídeo para num quadro com
     três cactos na pista, destaca só o que encostou, e desenha uma seta dele até o campo do
     apelido. Fala em cima da imagem parada: "são vários cactos no grupo. Quando um deles bate, o
     jogo precisa de um jeito de falar esse aqui, o que bateu agora, não os outros. Esse nome é um
     apelido, e daqui pra frente, dentro desse bloco, quando você falar cacto, o jogo entende que é
     o cacto que acabou de bater." Depois o vídeo volta a correr: no fazer, um só bloco, o
     `Mudar o estado do jogo para`, com `fim` escolhido na listinha, que já vem pronta. E o teste:
     clica na área do jogo, começa, e deixa o dino bater de propósito. Duração alvo: 90 a 110
     segundos.
  3. `studio`: conferência do bloco de colisão no lugar certo, com os três campos.
  4. `dialogue`: a leitura do que acabou de acontecer, com a memória da Aula 7. "O jogo parou e
     ficou só a floresta passando. Essa tela você já viu, na Aula 7, e pelo mesmo motivo: o jogo
     saiu do estado jogando e foi pro estado fim, e o estado fim ainda não desenha nada. A gente
     resolve isso agora."

**Junta o que hoje são duas seções.** A demonstração do apelido vira dez segundos de imagem parada
dentro do vídeo que precisa dela, no instante em que o campo está na tela.

### Seção 3. O bloco vira o mapa do seu jogo

- **Intenção:** construção
- **Por que existe:** o estado `fim` precisa de rosto, e montar o terceiro andar transforma o `Se`
  no retrato do jogo inteiro. É a vitória visível do meio da aula.
- **Conclui quando:** o `Se` do `A cada quadro do jogo` tem um segundo `senão se` com
  `o estado do jogo é fim`, e dentro dele um `Mostrar tela` com título, subtítulo e dica
- **Blocos:**
  1. `dialogue`: "Essa parte você já sabe fazer, porque é igual à tela de início que você montou na
     Aula 8. Vai naquele mesmo Se do A cada quadro do jogo, o que já tem dois andares, e clica de
     novo no mais senão se."
  2. `video` (`video-tela-fim`): o terceiro andar nascendo embaixo do `senão se o estado do jogo é
     inicio`, a pergunta `o estado do jogo é __ ?` encaixada com `fim`, e dentro o `Mostrar tela com
     título subtítulo dica fundo`. Os três textos, um a um: no título, uma frase de fim; no
     subtítulo, alguma coisa que dê vontade de tentar de novo; e na dica, "Aperte qualquer tecla ou
     toque na tela para jogar de novo". A fala amarra a dica na regra da aula passada: "é a mesma
     promessa da tela de início, e ela vale aqui pelo mesmo motivo: quem está no celular tem que
     conseguir tentar de novo." O fundo escuro fica como nasce. **E aí o momento do dia até agora:**
     zoom no bloco inteiro, os três andares lidos de cima para baixo, devagar. "Se o estado do jogo
     é jogando, joga. Senão se é inicio, mostra o menu. Senão se é fim, mostra a tela de fim. Três
     andares, três estados, um bloco só. Lembra da Aula 7, quando eu disse que o jogo fica num
     estado de cada vez e você não viu nada mudar na tela? Está aqui. É este bloco." Duração alvo:
     50 a 65 segundos.
  3. `studio`: conferência dos três andares, na ordem, com o desenho de cada estado no ramo certo.

**Esta é a seção que paga a Aula 7.** A mecânica invisível ganha um retrato, e o retrato é o próprio
bloco. Vale um beat inteiro de vídeo parado em cima dele.

### Seção 4. Faça a batida ser sentida

- **Intenção:** construção
- **Por que existe:** três blocos que entram um por vez, com um teste entre cada um, para ela sentir
  o que cada camada acrescenta. É o pico de encantamento do dia.
- **Conclui quando:** no fazer do bloco de colisão, antes do `Mudar o estado do jogo para fim`,
  estão `Soltar explosão no sprite` com o apelido `cacto`, `Tremer a tela com intensidade` em 8 e
  `Tocar efeito` em `derrota`, nessa ordem
- **Blocos:**
  1. `dialogue`: "A batida está meio sem graça, né. O jogo só troca de tela e pronto. São três
     blocos pra resolver isso, e a gente vai botar um de cada vez, batendo entre um e outro, pra
     você sentir o que cada um faz."
  2. `video` (`video-retorno`): a montagem em três camadas, cada uma seguida de uma batida de
     propósito.
     - Camada 1: em Jogo 2D, Desenho e efeitos, Partículas, o `Soltar explosão no sprite`, encaixado
       como o primeiro bloco do fazer, logo acima do `Mudar o estado do jogo para`. No campo do
       sprite, `cacto`, que é o apelido que você escreveu no bloco de colisão. No da cor, uma bem
       viva. Bate. "Explodiu."
     - Camada 2: em Desenho e efeitos, Efeitos, o `Tremer a tela com intensidade`, logo abaixo da
       explosão. Ele já vem com 8, deixa assim. Bate. "Agora explodiu e a tela sacudiu junto."
     - Camada 3: em Jogo 2D, Som, Efeitos prontos, o `Tocar efeito`, aquele mesmo do pulo, encaixado
       entre o `Tremer a tela` e o `Mudar o estado do jogo para`. Na listinha, `derrota`. Bate.
     - E o nome, depois das três: "Isso tem nome, e o nome é retorno pro jogador. É tudo aquilo que
       o jogo faz pra você sentir o que aconteceu. Repara nos jogos que você joga: quando você
       acerta ou apanha, sempre tem um monte de coisinha junto. Som, tremida, luz, faísca voando.
       Nunca é uma coisa só. E foi uma batida só que disparou tudo isso."
     Duração alvo: 60 a 75 segundos.
  3. `studio`: conferência da ordem dos quatro blocos dentro do fazer.

**A montagem em camadas é conteúdo, não exercício.** Quem conduz é a narração, e cada teste vem
logo depois da troca. É a mesma demonstração por extremos que o curso usa com números, aplicada a
blocos.

### Seção 5. Jogar de novo não é só trocar de estado

- **Intenção:** exploração
- **Por que existe:** é a única coisa do dia que o jogo dela não mostraria sem que ela montasse
  errado primeiro, e montar errado aqui custaria desmontar depois.
- **Conclui quando:** as três metas de `restart` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: "Perder e não poder tentar de novo é ruim. Antes de montar a volta, vamos ver uma
     coisa que quase todo mundo erra na primeira vez."
  2. `interactive`: cena `restart`, "Jogue outra vez". Elenco: personagem Dino, obstáculo cacto.
     Cenário: `corre-dino`. As três metas: a batida leva para o fim, só trocar de estado deixa os
     cactos na pista, e reiniciar começa com a pista limpa. Com o palpite antes de abrir: "quando a
     partida recomeçar pelo estado inicio, como a pista vai estar?"

**Dividida pela regra das duas colunas.** No desenho original a cena e a conferência do Estúdio
moravam na mesma seção, e as duas vão para a coluna da direita. Empilhadas, elas brigam pelo espaço
da bancada. A cena fica aqui, sozinha à direita, e a montagem do caminho de volta passa a ser a
seção seguinte. A ordem didática não muda: a cena continua vindo antes da montagem.

### Seção 6. Monte o caminho de volta

- **Intenção:** construção
- **Por que existe:** é onde o erro que a cena acabou de mostrar é evitado no jogo dela, e é onde o
  evento de entrada ganha a leitura completa.
- **Conclui quando:** o evento de entrada tem um `senão se o estado do jogo é fim` com
  `Reiniciar o jogo` dentro, e continua existindo um único evento de tecla ou toque
- **Blocos:**
  1. `video` (`video-caminho-de-volta`): no `Quando apertar qualquer tecla ou tocar na tela`, clicar
     no `+ senão se` do `Se o estado do jogo é inicio` que já está lá, encaixar no andar novo a
     pergunta `o estado do jogo é __ ?` com `fim`, e dentro dele o `Reiniciar o jogo`, em Jogo 2D,
     Jogo e telas, Telas e partida. Ele não tem campo nenhum. A fala explica de onde vem a pista
     limpa, em cima do que a cena acabou de mostrar: "o Reiniciar o jogo limpa a partida e roda as
     três áreas do projeto de novo, do começo, como se você tivesse acabado de abrir o jogo. Por
     isso a pista volta vazia: o grupo de cactos é criado outra vez, do zero." E depois a leitura do
     evento inteiro: "Se está no inicio, ele começa o jogo. Se está no fim, ele reinicia. E se está
     jogando, ele não faz nada, porque nenhuma das duas perguntas dá sim. O mesmo aperto, três
     respostas diferentes, dependendo de onde o jogo está. E você montou isso uma vez só."
     Duração alvo: 45 a 60 segundos.
  2. `studio`: conferência do `Reiniciar o jogo` no ramo `fim` e do evento único.

**A cena vem antes da montagem.** O erro que ela previne é caro: se a criança montasse
`Mudar o estado do jogo para inicio` no lugar do `Reiniciar o jogo`, o jogo funcionaria o bastante
para parecer certo, e a partida seguinte começaria com os cactos da anterior. Cena de três minutos
contra um bug silencioso.

### Seção 7. A volta completa, e o jogo fica de pé

- **Intenção:** entrega e fechamento
- **Por que existe:** é onde o jogo inteiro roda pela primeira vez, do começo ao fim, e é onde o
  módulo fecha.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): a volta inteira sem corte no meio, do recarregar ao recomeço,
     com a tecla apertada no meio da partida sem nada acontecer, os objetivos conferidos e o gesto
     de enviar na tela. A conferência ganhou a frase que era balão: se não aconteceu nada, os dois
     andares do `Se` estão certos, e é a mesma conferida da Aula 7, em que dar certo é uma coisa não
     acontecer. O clipe **passou a fechar com o fecho do módulo**, que era balão: olha o que você
     tem agora, o jogo abre com o nome que você deu, quem chega aperta qualquer coisa e joga, o dino
     corre, pula, os cactos vêm vindo, quando ele bate dá para sentir, e de lá dá para tentar de
     novo com a pista limpa. Começo, jogo e fim. **E o último respiro do clipe é a ponte para a Aula
     10**, que também era balão e veio para cá porque ela depende de ter acabado de jogar: talvez
     você já tenha sentido uma coisa hoje, que às vezes você perde sem ter encostado no cacto.
     **Entrou pela regra de que toda seção com o Estúdio embarcado tem um vídeo mostrando como se
     faz.** Duração alvo: 70 a 85 segundos.
  2. `quiz`: as três perguntas atuais, com os rótulos corrigidos.
  3. `studio`: entrega, com os critérios do manifesto atual traduzidos para os rótulos da edição
     atual. É o último item de `blockKeys`.

**Junta três seções de hoje e ganha um trabalho a mais.** Além de fechar a aula, esta seção fecha o
módulo: daqui em diante o jogo não ganha peças para funcionar, ganha peças para ficar bom.

**O fechamento continua tendo três pontos, e eles não se misturam.** A volta completa dirigida, o
teste do silêncio que prova o `senão se` do evento, e o fecho do módulo com a ponte. A ordem é a
mesma de antes, primeiro se joga, depois se confere, e só então se olha para trás, mas os três
passaram a morar no clipe, um atrás do outro.

**Por que os quatro balões saíram, e por que aqui não sobrou nenhum.** Balão depois da ferramenta
não existe para quem faz a aula: o Estúdio fica sozinho na coluna da direita e todo o resto na
esquerda, então "depois do Estúdio" não é um lugar. Os dois primeiros balões eram passo a passo, e
passo a passo pertence à tela. O fecho do módulo era recapitulação. E a ponte para a Aula 10, que
podia ter continuado balão por ser curta, é o caso que a regra manda avaliar: ela abre com "talvez
você já tenha sentido uma coisa hoje", então ela depende de ter acabado de jogar, e lida antes do
Estúdio ela não teria como funcionar. Por isso ela fecha o clipe. Nada foi apagado.

## Experiências e demonstrações desta aula

### 1. `restart` · Jogue outra vez · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena é a certa e o palco está certo. O que faltava era a terceira meta, que é
  justamente a que dá nome ao dia, e ela existe.
- **Ajuste 1, a meta que faltava: feito.** A terceira descoberta existe e se chama
  **`clean-track`**, com o rótulo "Reiniciar começou com a pista limpa" e o pedido "Depois de jogar
  de novo com Mudar o estado do jogo para inicio, escolha Reiniciar o jogo e, no fim, toque na tela
  duas vezes", que são palavra por palavra os que esta análise pediu. O motor ainda cobra a
  comparação: `clean-track` só é dada depois de `screen-only`, então ninguém chega na solução sem
  ter visto o problema.
- **Ajuste 2, vocabulário: feito.** A escolha que a cena oferece se chama "Mudar o estado do jogo
  para inicio", contra "Reiniciar o jogo". A comparação é entre dois blocos que existem na paleta
  dela, com o nome que ela vai ler lá.
- **Ajuste 3, a prova precisa ficar à vista:** os cactos da partida anterior continuam desenhados na
  pista quando a cena volta ao início, e de preferência contados. É a prova inteira da cena, e sem
  isso ela dependeria de a criança reparar sozinha num punhado de cactos.
- **Elenco/cenário:** personagem Dino, obstáculo cacto. Cenário: `corre-dino`.
- **Metas cobradas nesta aula:** `ended`, `screen-only`, `clean-track`, que são as três da missão de
  fábrica, mais a pergunta final de fábrica ("O que Reiniciar o jogo faz que Ir para o início não
  faz?"), com o enunciado ajustado para o rótulo novo. O bloco **não declara `setup.goals`** de
  propósito: sem lista, a cena cobra as três e deixa de fora a única meta só de caso,
  `back-to-menu`, que é a que o Dia 5 do Desafio cobra, e lá ela é declarada.
- **Onde mais serve:** em qualquer curso da trilha na aula em que a partida ganha um fim e um
  recomeço, que é praticamente todo curso com tela de derrota. O palco é uma pista, um obstáculo e
  duas opções de volta, e nada nele é específico do Dino.

### 2. O apelido · **DEMONSTRAÇÃO CURTA, DENTRO DO VÍDEO**

- **Situação:** não é cena e não precisa ser. A nota de tela que o material já tem é a coisa certa
  no lugar errado.
- **O que é:** dez segundos de imagem parada dentro do `video-colisao`, no instante em que o cursor
  está no terceiro campo do bloco. Três cactos congelados na pista, o que encostou destacado com
  contorno e legenda, os outros dois sem destaque, e uma seta ligando o destacado ao campo do
  apelido no bloco.
- **Por que não é cena:** não é relação com botão, porque não há o que ajustar, e não é processo no
  tempo, porque não há sequência a acompanhar. É uma referência, e referência se mostra parada, uma
  vez.
- **Acessibilidade:** o destaque não pode ser só cor. Contorno mais legenda, conforme a orientação
  de imagem da própria pasta.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | Hoje o seu jogo fica inteiro | o dino atravessando o cacto, e a rodada completa do fim do dia | `video-abertura-editorial` | 35 a 45 s | fala parcial, tela regravada |
| `video-colisao` | A pergunta que o jogo faz em todo quadro | o bloco da colisão, os três campos, a parada do apelido, e a primeira batida | `video-qual-cacto` + `video-colisao-fim` | 90 a 110 s | funde dois clipes que hoje usam o mesmo trecho |
| `video-tela-fim` | Três andares, três estados, um bloco só | o terceiro andar, o `Mostrar tela`, e o Se lido de cima para baixo | `video-desenhar-fim` | 50 a 65 s | fala sim, com rótulos trocados |
| `video-retorno` | Uma camada de cada vez | os três efeitos em camadas, com uma batida entre cada um | `video-efeitos-batida` | 60 a 75 s | fala parcial: a montagem passa a ser intercalada com testes |
| `video-caminho-de-volta` | O mesmo aperto, três respostas | o `senão se fim` no evento, o `Reiniciar o jogo`, e o evento lido inteiro | `video-jogar-novamente` | 45 a 60 s | fala sim, com rótulos trocados |
| `video-teste-e-envio` | A volta inteira antes de enviar | a volta do menu ao recomeço sem corte, a tecla muda no meio da partida, o gesto de enviar, o fecho do módulo e a ponte para a Aula 10 | novo | 70 a 85 s | não, gravação nova |

**Saldo:** de 7 clipes para 6. A fusão elimina uma narração duplicada por inteiro, e o
`video-fecho-editorial` some: o fecho de módulo passa a ser o fim do clipe da entrega, dito por cima
da volta que acabou de rodar na tela, que é o único lugar onde ele pode vir depois do teste e do
envio. A entrega ganha o clipe novo pela regra de que toda seção com o Estúdio embarcado tem um
vídeo mostrando como se faz.

**Correção de endereço obrigatória:** a fala manda procurar a explosão no Kit espaço. Na edição
`jogo-2d-1.0-documento-2` o `Soltar explosão no sprite` está em **Jogo 2D › Desenho e efeitos ›
Partículas**. A frase sobre reaproveitar bloco bom de outro kit perde o sentido com o endereço novo
e sai.

**Correção de montagem obrigatória:** o bloco de colisão é conferido **dentro** de
`Se o estado do jogo é jogando`, no `A cada quadro do jogo`, entre o `Desenhar o grupo` e a faxina.
Ele não é registro de evento e não vai para a área `⚡ Quando acontecer`. A nota já está na
orientação da pasta e precisa aparecer na direção de gravação de cada tomada do `video-colisao`.

## Continuidade

- **Assume da Aula 8:** o `Se` do `A cada quadro do jogo` com dois andares, `jogando` e
  `senão se inicio`, com o menu desenhado no segundo. Um evento único
  `Quando apertar qualquer tecla ou tocar na tela`, com `Se o estado do jogo é inicio` e
  `Mudar o estado do jogo para jogando` dentro. O evento do Enter apagado. O segundo
  `Se o estado do jogo é jogando` dentro do `A cada 1,4 segundos`.
- **Entrega para a Aula 10:** o jogo completo. `Se` de três andares no quadro, com o bloco de
  colisão entre `Desenhar o grupo` e a faxina, e com explosão, tremida 8, `Tocar efeito derrota` e
  `Mudar o estado do jogo para fim` dentro do fazer, nessa ordem. Evento de entrada com dois
  andares, `inicio` começando e `fim` reiniciando. Estado `fim` com desenho próprio.
- **Valores canônicos que saem daqui:** estado `fim` · apelido `cacto` no bloco de colisão · tremida
  8 · efeito `derrota` · ordem dos quatro blocos dentro do fazer da colisão · dica da tela de fim
  "Aperte qualquer tecla ou toque na tela para jogar de novo".
- **Campos livres:** título, subtítulo e cor do fundo da tela de fim, e a cor da explosão. Nenhuma
  aula posterior cita esses valores como fato. A dica não é livre.
- **O que esta aula deixa de propósito para a Aula 10:** a área de colisão continua em 100% do
  tamanho, então a criança vai perder algumas vezes sem ter encostado. Isso é a dor da aula
  seguinte, e ela precisa acontecer hoje. Nada nesta aula calibra a colisão, e o fecho aponta o
  sintoma sem consertar.
- **O que esta aula deixa de propósito para a Aula 11:** não existe placar nem contagem. A tela de
  fim diz que acabou, e não diz quanto. O subtítulo montado hoje é um texto simples, e é ele que a
  Aula 11 troca pela peça que junta texto com número.
- **Linha de diagnóstico para o professor:** se a partida nova começar com cactos na pista, o
  `Reiniciar o jogo` está no ramo errado ou foi trocado por uma mudança de estado. Se a tela de fim
  não aparecer, o terceiro andar está com o estado errado na listinha. Se a batida não acontecer, o
  bloco de colisão saiu de dentro do `Se o estado do jogo é jogando`.
