# aula-07 — O jogo só corre quando está jogando

Revisão baseada no roteiro original gravado. Demonstração é observação: o clipe e, quando a seção tem, a cena que toca sozinha. Experimentação é uma cena separada do projeto, em que a criança mexe e descobre. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Vamos separar inicio, jogando e fim. Hoje o jogo aprenderá a esperar; a tela com título vem na próxima aula.

**Saída esperada:** Preparação em inicio; movimento, desenho dos personagens e nascimento de cactos protegidos por jogando. A floresta continua visível.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Vamos separar inicio, jogando e fim. Hoje o jogo aprenderá a esperar; a tela com título vem na próxima aula. |
| 2. Diga em qual tela o jogo começa | application | Distinguir o nome do estado de seu desenho. |
| 3. Veja o Se e sua pergunta | demonstration | Separar condição, resposta sim/não e ações do então. |
| 4. Coloque as ações dentro do Se | application | Mover a sequência de jogo para o ramo jogando. |
| 5. Quem ainda está trabalhando no início? | exploration | Observar e impedir atividade fora do estado jogando. |
| 6. Faça o relógio esperar também | application | Proteger a criação na rotina periódica separada. |
| 7. Teste e entregue sua construção | delivery | Preparação em inicio; movimento, desenho dos personagens e nascimento de cactos protegidos por jogando. A floresta continua visível. |
| 8. Veja o que você aprendeu | closing | Preparação em inicio; movimento, desenho dos personagens e nascimento de cactos protegidos por jogando. A floresta continua visível. |
| 9. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Diga em qual tela o jogo começa

**Por que aqui:** Mudar o estado sozinho não muda a lógica; esse limite precisa ficar visível.

**Foco:** Distinguir o nome do estado de seu desenho.

**Fala de ligação / orientação ao aluno:** “Em Ao iniciar, coloque Ir para a tela inicio. Observe que só dar esse nome ainda não faz o jogo esperar.”

**Fonte:** roteiro-aula-07-corre-dino.md → Parte 1. Passo 1: dizer em qual tela o jogo abre.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar a execução ainda acontecendo depois da troca. Não antecipar a tela de menu da aula 8.

**Na tela:** **Na tela:** Jogo 2D › Jogo e telas › Telas e partida, arrastar "Ir para a tela" como último bloco do Ao iniciar, logo abaixo do "Criar grupo de sprites", com "inicio" escolhido na listinha.

**Trecho original selecionado, antes da edição:** O conceito do dia é telas, que os criadores também chamam de cenas. Nos jogos que você joga tem o menu, com o nome do jogo. Tem o jogo acontecendo. E tem a tela de fim, quando você perde. Cada um desses momentos é uma tela. E tem uma regra importante: o jogo fica em uma tela de cada vez, nunca no menu e jogando ao mesmo tempo. O nosso vai ter três: inicio, jogando e fim. Hoje a gente começa a montar as duas primeiras, e começa dizendo em qual tela o jogo abre. Na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela. Clica, segura, arrasta pra dentro do Ao iniciar e encaixa como o último bloco de lá, logo abaixo do Criar grupo de sprites. Ele tem um campo só, e não pede pra você digitar: é uma listinha, e ela já vem com inicio escolhido, que é justo o que a gente quer. Deixa assim. Olha a área do jogo: não mudou nada. É porque o jogo está na tela inicio, mas ninguém contou pra ele que na tela inicio ele deveria fazer coisas diferentes. É isso que a gente vai fazer agora. Passo 1 pronto, o seu jogo já sabe em qual tela ele abre. Bora pro segundo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Abra o jogo na tela inicio.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja o Se e sua pergunta

**Por que aqui:** O formato do valor e a abertura do contêiner são novos e merecem atenção visual.

**Foco:** Separar condição, resposta sim/não e ações do então.

**Fala de ligação / orientação ao aluno:** “A pergunta entra no encaixe de condição. Se a resposta for sim, o jogo faz o que está dentro do então.”

**Fonte:** roteiro-aula-07-corre-dino.md → Parte 2. Passo 2: a pergunta da tela "jogando".

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a pergunta da cena; mostrar a retirada da comparação de fábrica. Parar antes de embrulhar os seis comandos.

**Na tela:** Congelar o bloco Se. Destacar primeiro COND, depois THEN. Mostrar inicio dando não e jogando dando sim, sem mudar outras peças. Texto e ícone, além da cor.

**Trecho original selecionado, antes da edição:** Agora entra um bloco novo, e ele é um dos mais importantes que existem em programação: o bloco Se. O Se é um bloco de decisão. Ele faz uma pergunta e, se a resposta for sim, faz o que está guardado dentro dele. Se for não, ele não faz nada e o jogo segue em frente. É igualzinho ao que você faz todo dia: se estiver chovendo, leva o guarda-chuva. Não está chovendo? Então não leva, e pronto. O que começa aqui é a manobra mais trabalhosa do curso inteiro. Ela tem quatro etapas: as três primeiras são este passo, e a quarta é o próximo. No fim eu te dou o nome dela. Etapa um. Na categoria Programação, subcategoria Lógica e Se, pega o bloco Se. Clica, segura, arrasta pra dentro do A cada quadro do jogo e encaixa logo abaixo do Desenhar fundo de floresta. Etapa dois, e aqui presta atenção porque é meio esquisito. O Se não vem vazio: no lugar da pergunta já vem um bloquinho de comparação, com dois números e um sinal no meio. Ele veio de fábrica, e serve pra quando a sua pergunta é comparar duas coisas, tipo perguntar se cinco é maior que três. Você vai usar ele lá na Aula 13. Só que a nossa pergunta de hoje não compara nada: ela quer saber em que tela o jogo está. Então a comparação de fábrica sai. Clica nela, arrasta pra fora e joga na lixeira. Etapa três. Ficou um espaço vazio na pergunta. Na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco a tela atual é e encaixa nesse espaço. Ele tem um campo só, uma listinha de telas: escolhe jogando. Lê junto comigo: 'Se a tela atual é jogando, então...'. E repara na forma desse bloquinho: ele é pontudo nas beiradas, diferente de todos os que você já usou. Esse formato quer dizer que ele é um bloco de pergunta. Ele não faz nada sozinho, só responde sim ou não, e por isso ele só encaixa em lugar de pergunta, como esse buraquinho do Se. Passo 2 pronto. O Se está lá, vazio por dentro. O terceiro passo é a quarta etapa da manobra: encher ele.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Coloque as ações dentro do Se

**Por que aqui:** O gesto de embrulhar uma pilha é a principal dificuldade operacional; a seção fica dedicada a ele.

**Foco:** Mover a sequência de jogo para o ramo jogando.

**Fala de ligação / orientação ao aluno:** “Deixe Limpar a tela e Floresta fora do Se. Da gravidade até a faxina, mova os seis comandos para dentro de Se a tela atual é jogando. Não copie a pilha.”

**Fonte:** roteiro-aula-07-corre-dino.md → Parte 3. Passo 3: mudar o jogo pra dentro.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter os quatro gestos com pausas visuais: abrir espaço, pôr Se, conectar pergunta, mover a pilha. Terminar antes de proteger o relógio. A criança pausa e monta no mesmo Estúdio.

**Na tela:** **Na tela:** arrastar do "Aplicar a gravidade do mundo" para baixo (6 blocos) para dentro do Se; o Limpar a tela e o fundo de floresta ficam FORA. Cartela na tela com o nome da manobra e as 4 etapas do "embrulhar no Se". Depois, repetir a manobra uma vez: envolver o conteúdo do relógio de 1.4 s num "Se a tela atual é jogando". Mostrar o evento do pulo intacto, sem mexer nele, enquanto explica por que ele não precisa. No fim, rodar e ficar só a floresta.

**Trecho original selecionado, antes da edição:** Agora o trabalho do dia. E que bom que ele está vindo agora, porque o seu jogo ainda é pequeno. Se deixasse pro fim do curso, ia ser um caminhão de bloco pra mover. A ideia é: tudo que é jogo acontecendo vai pra dentro do Se. Assim, quando a tela não for jogando, nada disso roda. Mas tem duas exceções, e são importantes. O Limpar a tela e o Desenhar fundo de floresta ficam fora, lá no topo, porque a floresta tem que aparecer em todas as telas, inclusive no menu. Ia ficar feio um menu com fundo preto, né? Então: todo o resto, a partir do Aplicar a gravidade do mundo pra baixo, vai pra dentro do Se. São seis blocos: a gravidade, o Controlar o dinossauro, o Desenhar o sprite, o Atualizar o grupo, o Desenhar o grupo e a faxina. Seis, nem mais nem menos. Se o seu tiver sete, é porque o medidor da Aula 6 ainda está aí, e aí é só mandar ele pra lixeira antes de continuar. E aqui tem um jeito certo e um jeito que dá errado, então presta atenção. Você vai arrastar os blocos, nunca copiar. Se copiar e colar, o computador faz uma cópia e os seis originais continuam lá fora. Aí você fica com dois jogos rodando ao mesmo tempo: o cacto andando no dobro da velocidade e o dino sendo desenhado duas vezes. Então clica no Aplicar a gravidade do mundo, segura e arrasta. Os cinco que estão embaixo vêm junto, grudados, porque bloco encaixado anda em bloco. Repara que hoje isso é exatamente o que a gente quer, então nada de Ctrl aqui: o Ctrl serve pra quando você quer levar um bloco sozinho, e agora você quer levar os cinco. Leva os seis pra dentro do Se e solta com calma, esperando o encaixe acender. Você acabou de fazer a coisa mais difícil do curso, e ela merece um nome. Esse nome é embrulhar no Se, porque é isso mesmo que você fez: pegou um monte de bloco que já existia e embrulhou tudo dentro de um Se. São sempre quatro etapas, e elas nunca mudam. A primeira é pegar o Se, em Programação, Lógica e Se. Na segunda, você tira a comparação de fábrica de dentro dele e joga fora. Na terceira, coloca no lugar dela a pergunta a tela atual é e escolhe a tela. E na quarta, envolve com ele os blocos que já estavam ali. Lembra desse nome, porque daqui pra frente eu vou dizer só 'embrulha no Se' e você já vai saber as quatro etapas de cabeça. E a primeira vez é agora mesmo, porque falta mais um lugar, e esse é fácil de esquecer. Ele é o relógio, aquele A cada 1.4 segundos que mora ao lado do A cada quadro. Ele não está dentro do loop, então não foi junto. Embrulha no Se o que tem dentro dele: pega um Se novo, tira a comparação de fábrica, põe no lugar a pergunta a tela atual é com jogando, e envolve com ele o bloco de criar o cacto. Aqui também é arrastar o bloco pra dentro, nunca copiar. Se não fizer isso, vai nascer cacto enquanto você ainda está no menu, sem ter começado. E o som do pulo, você deve estar pensando? Ele não precisa de embrulho nenhum, e o motivo é bonito. Lembra que na Aula 4 a gente tirou o evento da tecla e pôs no lugar o Quando o sprite dino pular? Pois então. Pra esse evento disparar, o dino tem que pular de verdade. E quem faz o dino pular é o Controlar o dinossauro, que acabou de entrar pra dentro do Se. Fora da tela de jogar, o Controlar o dinossauro nem roda. O dino não pula. O som não toca. Ou seja: o som se protege sozinho, porque ele escuta o dino, e o dino só se mexe enquanto o jogo está acontecendo. Se ele ainda estivesse escutando a barra de espaço, você ia ter que embrulhar ele agora, com Se e tudo. Esse trabalho a mais foi você que economizou, lá na Aula 4. Olha ali na área do jogo. A tela vai ficar só com a floresta passando e mais nada. E isso é sinal de que deu certo! O jogo está na tela inicio, e a tela inicio ainda não tem nada desenhado. Ela é o assunto da próxima aula. Comemorar uma tela vazia é meio estranho, então repara no que aconteceu de verdade: o dino sumiu, o cacto parou de nascer, e o pulo parou de fazer barulho junto com o dino. E nada disso quebrou: está tudo guardado, esperando a tela virar jogando pra voltar. Você não tirou coisas do seu jogo, você ensinou ele a escolher a hora de fazer cada uma delas. Às vezes o sinal de que você acertou não é uma coisa nova aparecendo na tela, é uma coisa parando de acontecer na hora errada. E o que você montou hoje tem nome, um nome que os criadores usam: são os estados do jogo. O jogo está sempre em um estado de cada vez, e cada estado sabe o que fazer. Todo jogo grande do mundo funciona assim, com um monte de estados: menu, jogando, pausado, fim. Agora a conferida, e ela é diferente de tudo que você já fez neste curso, porque a gente vai testar uma coisa que não pode mais acontecer. Com o jogo rodando, clica na área dele e aperta a barra de espaço umas cinco vezes. Depois fica uns dez segundos só olhando a tela, sem apertar nada. O que tem que acontecer é nada. Nenhum somzinho quando você apertou o espaço, e nenhum cacto entrando pela direita nesses dez segundos. Só a floresta passando. Se foi isso, os seus dois embrulhos estão certos, o do loop e o do relógio, e o som está se comportando sozinho. E se tocou um som quando você apertou o espaço, o culpado não é o som. Quer dizer que o Controlar o dinossauro ficou por fora do Se lá no loop, então o dino ainda está pulando escondido. Volta no embrulho do loop e confere se ele está lá dentro, junto com os outros quatro. Se apareceu cacto, volta no relógio de 1.4 segundos, que é um Se separado. Nos dois casos é a mesma coisa: ou ficou bloco por fora do Se, ou a listinha da pergunta ficou numa tela errada. Confere se está escrito jogando nos dois. Passo 3 feito, e o mais trabalhoso do curso já passou.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Aplicar gravidade deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Controlar o dinossauro deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Desenhar o Dino deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Atualizar cactos deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Desenhar cactos deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Remover cactos fora da tela deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Limpeza da tela deve continuar fora do Se, diretamente no quadro.
- Floresta deve continuar fora do Se, diretamente no quadro.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Quem ainda está trabalhando no início?

**Por que aqui:** Depois do primeiro Se, revelar que outra rotina também precisa obedecer ao estado.

**Foco:** Observar e impedir atividade fora do estado jogando.

**Cena:** `game-state`, “O relógio no início”. Formato: experimentação (a criança mexe e descobre). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: Dino (o de fábrica) e obstáculo: cacto (o de fábrica).

**O que a criança lê ao abrir:** “Aperte ▶ Tempo na tela de início e veja se nascem cactos. Depois leve Criar cacto para dentro de Se o estado do jogo é jogando. Compare o início e a partida.”

**Como o palco começa:** Na tela de início. 0 cactos criados até agora.

**Antes de escolher:** “Nesta experiência, vamos observar o que o jogo deixa acontecer antes e depois de a partida começar.”

**Hoje vamos usar:** O estado do jogo.

**Seu palpite, antes de abrir a cena (escrito na aula; não vale nota):** “Na tela de início, antes de começar, nascem cactos?”

- Sim, já nascem ✓ (o que acontece de verdade)
- Não, só depois de começar (se ela escolher esta, a tela conta depois: “Os cactos nasceram na tela de início, antes de começar.”)

O palpite volta à tela quando ela descobre: “Nasceram cactos antes de começar”.

**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):

1. Pedido: “No início, com Criar cacto fora do Se, deixe o tempo passar.” Ao descobrir: “Nasceram cactos antes de começar”.
2. Pedido: “Leve Criar cacto para dentro de Se o estado do jogo é jogando e deixe o tempo passar 2 segundos no início.” Ao descobrir: “No início, nada nasceu por 2 segundos”.
3. Pedido: “Com Criar cacto dentro do Se, comece a partida e deixe o tempo passar.” Ao descobrir: “Jogando, voltou a nascer”.

**Frase de sucesso:** “Dentro do Se, Criar cacto espera no início e volta a criar na partida!”

**Pistas (uma por vez, no botão Uma pista; escritas na aula):**

1. “Aperte ▶ na tela de início e conte os cactos que aparecem.”
2. “O que fica dentro de Se o estado do jogo é jogando só acontece durante a partida.”
3. “Leve Criar cacto para dentro de Se o estado do jogo é jogando. Espere no início e depois comece a partida.”

**Pergunta depois de descobrir (a de fábrica da cena; conta para concluir):** “O que faz Criar cacto esperar no início?”

- O botão de começar, que liga o relógio.
- Uma condição: só criar cactos enquanto estiver jogando. ✓ (correta)

**Explicação que ela lê ao acertar:** “O relógio está sempre lá. A condição é um guarda na porta: ela deixa passar só quando a partida está acontecendo.”

**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.

### Faça o relógio esperar também

**Por que aqui:** O relógio é irmão do quadro, portanto não recebeu automaticamente o primeiro Se.

**Foco:** Proteger a criação na rotina periódica separada.

**Fala de ligação / orientação ao aluno:** “No relógio de 1,4 segundo, coloque outro Se a tela atual é jogando e mova a criação do cacto para dentro dele.”

**Fonte:** roteiro-aula-07-corre-dino.md → Parte 3. Passo 3: mudar o jogo pra dentro.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Selecionar apenas o trecho final da Parte 3 sobre o relógio. Não repetir o tutorial inteiro de embrulhar.

**Na tela:** **Na tela:** arrastar do "Aplicar a gravidade do mundo" para baixo (6 blocos) para dentro do Se; o Limpar a tela e o fundo de floresta ficam FORA. Cartela na tela com o nome da manobra e as 4 etapas do "embrulhar no Se". Depois, repetir a manobra uma vez: envolver o conteúdo do relógio de 1.4 s num "Se a tela atual é jogando". Mostrar o evento do pulo intacto, sem mexer nele, enquanto explica por que ele não precisa. No fim, rodar e ficar só a floresta.

**Trecho original selecionado, antes da edição:** Agora o trabalho do dia. E que bom que ele está vindo agora, porque o seu jogo ainda é pequeno. Se deixasse pro fim do curso, ia ser um caminhão de bloco pra mover. A ideia é: tudo que é jogo acontecendo vai pra dentro do Se. Assim, quando a tela não for jogando, nada disso roda. Mas tem duas exceções, e são importantes. O Limpar a tela e o Desenhar fundo de floresta ficam fora, lá no topo, porque a floresta tem que aparecer em todas as telas, inclusive no menu. Ia ficar feio um menu com fundo preto, né? Então: todo o resto, a partir do Aplicar a gravidade do mundo pra baixo, vai pra dentro do Se. São seis blocos: a gravidade, o Controlar o dinossauro, o Desenhar o sprite, o Atualizar o grupo, o Desenhar o grupo e a faxina. Seis, nem mais nem menos. Se o seu tiver sete, é porque o medidor da Aula 6 ainda está aí, e aí é só mandar ele pra lixeira antes de continuar. E aqui tem um jeito certo e um jeito que dá errado, então presta atenção. Você vai arrastar os blocos, nunca copiar. Se copiar e colar, o computador faz uma cópia e os seis originais continuam lá fora. Aí você fica com dois jogos rodando ao mesmo tempo: o cacto andando no dobro da velocidade e o dino sendo desenhado duas vezes. Então clica no Aplicar a gravidade do mundo, segura e arrasta. Os cinco que estão embaixo vêm junto, grudados, porque bloco encaixado anda em bloco. Repara que hoje isso é exatamente o que a gente quer, então nada de Ctrl aqui: o Ctrl serve pra quando você quer levar um bloco sozinho, e agora você quer levar os cinco. Leva os seis pra dentro do Se e solta com calma, esperando o encaixe acender. Você acabou de fazer a coisa mais difícil do curso, e ela merece um nome. Esse nome é embrulhar no Se, porque é isso mesmo que você fez: pegou um monte de bloco que já existia e embrulhou tudo dentro de um Se. São sempre quatro etapas, e elas nunca mudam. A primeira é pegar o Se, em Programação, Lógica e Se. Na segunda, você tira a comparação de fábrica de dentro dele e joga fora. Na terceira, coloca no lugar dela a pergunta a tela atual é e escolhe a tela. E na quarta, envolve com ele os blocos que já estavam ali. Lembra desse nome, porque daqui pra frente eu vou dizer só 'embrulha no Se' e você já vai saber as quatro etapas de cabeça. E a primeira vez é agora mesmo, porque falta mais um lugar, e esse é fácil de esquecer. Ele é o relógio, aquele A cada 1.4 segundos que mora ao lado do A cada quadro. Ele não está dentro do loop, então não foi junto. Embrulha no Se o que tem dentro dele: pega um Se novo, tira a comparação de fábrica, põe no lugar a pergunta a tela atual é com jogando, e envolve com ele o bloco de criar o cacto. Aqui também é arrastar o bloco pra dentro, nunca copiar. Se não fizer isso, vai nascer cacto enquanto você ainda está no menu, sem ter começado. E o som do pulo, você deve estar pensando? Ele não precisa de embrulho nenhum, e o motivo é bonito. Lembra que na Aula 4 a gente tirou o evento da tecla e pôs no lugar o Quando o sprite dino pular? Pois então. Pra esse evento disparar, o dino tem que pular de verdade. E quem faz o dino pular é o Controlar o dinossauro, que acabou de entrar pra dentro do Se. Fora da tela de jogar, o Controlar o dinossauro nem roda. O dino não pula. O som não toca. Ou seja: o som se protege sozinho, porque ele escuta o dino, e o dino só se mexe enquanto o jogo está acontecendo. Se ele ainda estivesse escutando a barra de espaço, você ia ter que embrulhar ele agora, com Se e tudo. Esse trabalho a mais foi você que economizou, lá na Aula 4. Olha ali na área do jogo. A tela vai ficar só com a floresta passando e mais nada. E isso é sinal de que deu certo! O jogo está na tela inicio, e a tela inicio ainda não tem nada desenhado. Ela é o assunto da próxima aula. Comemorar uma tela vazia é meio estranho, então repara no que aconteceu de verdade: o dino sumiu, o cacto parou de nascer, e o pulo parou de fazer barulho junto com o dino. E nada disso quebrou: está tudo guardado, esperando a tela virar jogando pra voltar. Você não tirou coisas do seu jogo, você ensinou ele a escolher a hora de fazer cada uma delas. Às vezes o sinal de que você acertou não é uma coisa nova aparecendo na tela, é uma coisa parando de acontecer na hora errada. E o que você montou hoje tem nome, um nome que os criadores usam: são os estados do jogo. O jogo está sempre em um estado de cada vez, e cada estado sabe o que fazer. Todo jogo grande do mundo funciona assim, com um monte de estados: menu, jogando, pausado, fim. Agora a conferida, e ela é diferente de tudo que você já fez neste curso, porque a gente vai testar uma coisa que não pode mais acontecer. Com o jogo rodando, clica na área dele e aperta a barra de espaço umas cinco vezes. Depois fica uns dez segundos só olhando a tela, sem apertar nada. O que tem que acontecer é nada. Nenhum somzinho quando você apertou o espaço, e nenhum cacto entrando pela direita nesses dez segundos. Só a floresta passando. Se foi isso, os seus dois embrulhos estão certos, o do loop e o do relógio, e o som está se comportando sozinho. E se tocou um som quando você apertou o espaço, o culpado não é o som. Quer dizer que o Controlar o dinossauro ficou por fora do Se lá no loop, então o dino ainda está pulando escondido. Volta no embrulho do loop e confere se ele está lá dentro, junto com os outros quatro. Se apareceu cacto, volta no relógio de 1.4 segundos, que é um Se separado. Nos dois casos é a mesma coisa: ou ficou bloco por fora do Se, ou a listinha da pergunta ficou numa tela errada. Confere se está escrito jogando nos dois. Passo 3 feito, e o mais trabalhoso do curso já passou.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No relógio de 1,4 s, crie cactos somente se a tela for jogando.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Clipes de abertura e fecho

### Abertura

**Ponte nova:** “Vamos separar inicio, jogando e fim. Hoje o jogo aprenderá a esperar; a tela com título vem na próxima aula.”

**Fonte:** roteiro-aula-07-corre-dino.md → Abertura.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a retomada e o resultado de hoje. Trocar convites a exploração livre pela missão delimitada abaixo.

### Fecho

**Ponte nova:** “Sua construção está guardada. Agora responda três perguntas curtas sobre o que mudou hoje.”

**Fonte:** roteiro-aula-07-corre-dino.md → Fecho.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter a recapitulação. Não inventar um botão de começar nesta aula; ele pertence à aula 8. São dois grupos protegidos nesta aula: quadro e relógio. Evitar referências futuras a três embrulhos. Terminar indicando o quiz, sem abrir desafios extras.

## Conferência final e quiz

Reinicie a prévia em inicio: a floresta aparece, mas o Dino e os cactos não correm. Nesta aula a tela sem título é esperada. Revise os dois Se antes de entregar.

**Critérios da entrega:**

- Abra o jogo na tela inicio.
- Aplicar gravidade deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Controlar o dinossauro deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Desenhar o Dino deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Atualizar cactos deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Desenhar cactos deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Remover cactos fora da tela deve ficar no então de Se a tela é jogando, na ordem da montagem.
- Mantenha uma única ação Aplicar gravidade.
- Mantenha uma única ação Controlar o dinossauro.
- Mantenha uma única ação Desenhar o Dino.
- Mantenha uma única ação Atualizar cactos.
- Mantenha uma única ação Desenhar cactos.
- Mantenha uma única ação Remover cactos fora da tela.
- Limpeza da tela deve continuar fora do Se, diretamente no quadro.
- Floresta deve continuar fora do Se, diretamente no quadro.
- No relógio de 1,4 s, crie cactos somente se a tela for jogando.
- Mantenha um único criador de cactos.

**Ir para a tela inicio já faz todas as ações pararem?**

- Não, as ações precisam consultar o estado. (correta)
- Sim, o nome da tela apaga todos os blocos.

O estado é informação usada pelas condições.

**Por que o relógio precisa de outro Se?**

- Porque roda em uma rotina separada do quadro. (correta)
- Porque a floresta precisa nascer duas vezes.

Uma condição só protege o que está dentro dela.

**O que deve ficar fora do Se jogando?**

- Limpar a tela e desenhar a floresta. (correta)
- Criar cactos sem parar.

O fundo continua aparecendo enquanto o jogo espera.

## Orientação ao professor e à edição

- Não inventar um botão de começar nesta aula; ele pertence à aula 8.
- São dois grupos protegidos nesta aula: quadro e relógio. Evitar referências futuras a três embrulhos.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 7f3962d0ac9c56eae11ecd55631ff082d2ff03e8de476014f204f07b47ba9db5. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).

## Blocos e gravação no Estúdio atual

Edição: jogo-2d-1.0-documento-2.

Use os endereços abaixo ao gravar os gestos e a narração. As falas e âncoras identificadas como originais documentam a gravação anterior. Capture a paleta atual e substitua as indicações de localização antigas antes de publicar a aula.

No seletor Tocar efeito, escolha pulo, tiro, explosão ou derrota conforme a ação. O som fica no evento ou na colisão que o dispara. Preparar o jogo continua em Ao iniciar; seus eventos e relógios ficam nas áreas indicadas no passo a passo.

Confira com o perfil de aluno: abrir a aula, encontrar cada peça, montar, testar, conferir os critérios, guardar, reabrir e continuar na aula seguinte. Nas aulas de publicação, teste também Fazer minha versão e a edição da cópia.

| Bloco | Onde encontrar | O que faz |
| --- | --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto | Roda quando alguma coisa acontece. |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto | Repete enquanto o projeto estiver rodando. |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto | Roda ao abrir ou a cada nova partida. |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D › Movimento › Velocidade e gravidade | Soma a gravidade do mundo à velocidade vertical do sprite neste quadro. Sem definir outro valor, usa 0,6. Encaixe logo ANTES do bloco que movimenta o sprite. |
| Limpar a tela | Jogo 2D › Desenho e efeitos › Efeitos | Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo. |
| Controlar o dinossauro , força do pulo | Jogo 2D › Kits prontos › Dino | Pula com ↑/Espaço ou toque na metade de cima da tela; abaixa com ↓ ou segurando o dedo embaixo. Já vem com chão e poeira. Para o dino cair, encaixe o "Aplicar a gravidade do mundo" logo acima. Use dentro do "a cada quadro". |
| Criar dinossauro em x y tamanho cor | Jogo 2D › Kits prontos › Dino | Cria um dinossauro desenhado (com perninhas que correm sozinhas). A pose muda quando ele pula ou abaixa. |
| Criar grupo de sprites | Jogo 2D › Grupos › Criar e percorrer | Cria um grupo vazio para guardar MUITOS sprites do mesmo tipo (tiros, inimigos, estrelas). |
| Desenhar o grupo | Jogo 2D › Grupos › Desenho e ordem | Desenha todos os sprites do grupo. Use a cada quadro, depois de mover. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| A cada segundos | Jogo 2D › Tempo › Quadros e intervalos | Roda o “fazer” a cada N segundos. É uma raiz de “🔁 Enquanto estiver rodando”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”. |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama. |
| Quando o sprite pular | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro. |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| o estado do jogo é ? | Jogo 2D › Jogo e telas › Telas e partida | Verdadeiro se o jogo está naquela tela. Use dentro de um "se". |
| Mudar o estado do jogo para | Jogo 2D › Jogo e telas › Telas e partida | Guarda o estado atual, como início, jogando ou vitória. Use a pergunta sobre o estado para escolher o que desenhar e mover. A mudança não pausa o motor nem desenha uma tela. |
| Descrever o jogo para leitor de tela | Jogo 2D › Jogo e telas › Telas e partida | Explica o objetivo e os controles para quem não vê o canvas. Coloque em “Ao iniciar”. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D › Kits prontos › Dino | Cria um obstáculo desenhado e coloca no grupo. Cacto e pedra nascem no chão (pule por cima); o pássaro vem no alto (abaixe por baixo). Ligue o x na borda direita e um vx negativo para ele vir vindo. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Condição se, senão se e senão | Programação › ❓ Lógica & Se | Executa o "então" quando a condição for verdadeira. Use + para juntar "senão se" e "senão". |
| Número | Programação › 🔣 Valores | Um valor numérico. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
