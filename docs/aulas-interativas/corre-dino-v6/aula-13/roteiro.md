# aula-13 — A dificuldade cresce e sabe parar

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Vamos guardar a velocidade base, aumentá-la aos poucos e colocar um limite. Depois conferiremos o jogo completo.

**Saída esperada:** Base começa em -5, muda a cada 5 s jogando até -9; novos cactos recebem base menos sorteio. Descrição atualizada e projeto entregue.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Vamos guardar a velocidade base, aumentá-la aos poucos e colocar um limite. Depois conferiremos o jogo completo. |
| 2. Crie a memória da velocidade | application | Preparar um valor que pode mudar durante a partida. |
| 3. Quem lê a nova velocidade? | demonstration | Distinguir a base guardada e a velocidade recebida ao nascer. |
| 4. Faça os novos cactos lerem a base | application | Trocar a fonte do valor na entrada correta da conta. |
| 5. Veja quando a base chega ao limite | demonstration | Interpretar velocidade > -9 e incremento -1. |
| 6. Teste a base, o limite e os próximos cactos | exploration | Observar a regra de velocidade atribuída ao nascer sob uma base limitada. |
| 7. Monte o acelerador com limite | application | Combinar relógio, estado e comparação numérica. |
| 8. Conte todos os controles ao jogador | application | Atualizar a descrição de acordo com o jogo final. |
| 9. Teste e entregue sua construção | delivery | Base começa em -5, muda a cada 5 s jogando até -9; novos cactos recebem base menos sorteio. Descrição atualizada e projeto entregue. |
| 10. Veja o que você aprendeu | closing | Base começa em -5, muda a cada 5 s jogando até -9; novos cactos recebem base menos sorteio. Descrição atualizada e projeto entregue. |
| 11. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Crie a memória da velocidade

**Por que aqui:** Reutilizar a variável da aula 11 com uma nova finalidade.

**Foco:** Preparar um valor que pode mudar durante a partida.

**Fala de ligação / orientação ao aluno:** “Em Ao iniciar, crie velocidade com valor -5. Por enquanto, é o mesmo número que o cacto já usava.”

**Fonte:** roteiro-aula-13-corre-dino.md → Parte 1. Passo 1: criar a caixinha da velocidade.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter o valor negativo e o identificador velocidade. Não confundir a base com a velocidade já atribuída a cada cacto.

**Na tela:** **Na tela:** Programação › Variáveis, arrastar "Criar variável __ com valor __" para dentro do Ao iniciar, logo abaixo da variável pontos e logo ACIMA do "Ir para a tela inicio"; nome "velocidade", valor -5.

**Trecho original selecionado, antes da edição:** Primeiro a gente precisa de um lugar pra guardar a velocidade dos cactos. E o bloco que faz isso você já conhece da Aula 11: a variável, a caixinha que guarda um número que muda. Na categoria Programação, subcategoria Variáveis, pega o bloco Criar variável. Clica nele, segura e arrasta pra dentro do Ao iniciar, soltando logo abaixo da variável pontos, que você criou na Aula 11, e logo acima do Ir para a tela inicio. Aquele Ir para a tela continua sendo o último bloco do Ao iniciar, igual desde a Aula 7, então não deixa esse novo cair embaixo dele. Esse bloco tem dois campos. No nome escreve velocidade. E no valor escreve -5. E por que menos 5? Porque esse tem que ser o número que os seus cactos já usam hoje. Dá uma olhadinha no seu bloco de criar cacto: lá no vx, do lado do sorteio, tem que estar menos 5. Se estiver, perfeito, escreve menos 5 na caixinha também. Se estiver outro número, põe menos 5 nos dois lugares agora, pra eles combinarem. Se esses dois não combinarem, o passo seguinte muda a velocidade do jogo sem querer, e você ia estranhar sem saber por quê. Olha ali na área do jogo. E de novo: não mudou nada. A caixinha existe, tem um menos 5 guardado, mas ninguém está usando ela ainda. É o próximo passo. Primeiro passo feito, rapidinho. Bora pro segundo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Crie velocidade com valor -5 em Ao iniciar.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Quem lê a nova velocidade?

**Por que aqui:** Evitar a expectativa de que trocar a variável acelera retroativamente todos os cactos.

**Foco:** Distinguir a base guardada e a velocidade recebida ao nascer.

**Fala de ligação / orientação ao aluno:** “A base é consultada quando um cacto nasce. Este cacto antigo guarda a velocidade que já recebeu; o próximo lê a base nova.”

**Fonte:** roteiro-aula-13-corre-dino.md → Parte 2. Passo 2: fazer o cacto obedecer a caixinha.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Complementar a gravação com placas base/antigo/novo. Primeiro demonstrar a troca -5 literal por variável -5 sem alteração de comportamento.

**Na tela:** Congelar um cacto antigo com sua seta -5. Mudar a placa da base para -6 e criar outro com seta -6. Mesma posição inicial de comparação; não mudar o sorteio nesta explicação.

**Trecho original selecionado, antes da edição:** Vai lá no bloco de criar o cacto e olha o vx. Lembra como ficou na Aula 12? É uma conta: menos 5, menos um número sorteado. Aquele menos 5 ali está escrito direto no bloco. Ele é um número fixo, cravado dentro do bloco. E a gente vai trocar ele pela caixinha. Na categoria Programação, subcategoria Valores, pega o bloco valor da variável. Clica, segura e arrasta ele por cima do menos 5, que é o pedaço da esquerda da conta. Nele, escolhe a velocidade. Agora lê a conta: valor da variável velocidade, menos um número sorteado de 0 a 1. Clica na área do jogo e joga. E... está igualzinho. Nada mudou. E está certo. Porque a variável velocidade guarda menos 5, que é exatamente o número que estava ali antes. O jogo continua fazendo a mesma coisa. Mas alguma coisa importante mudou, e não é na tela: mudou de onde vem a velocidade. Antes ela estava escrita dentro do bloco de criar o cacto. Agora ela mora numa caixinha, e o bloco só vai lá olhar toda vez que cria um cacto. E por que isso é tão importante? Porque agora, se alguém mexer na caixinha, todos os cactos que nascerem daqui pra frente já vêm diferentes. Sem precisar mexer no bloco de criar cacto, sem mexer em nada do resto. Isso tem um nome bonito e é uma das ideias mais fortes da programação: mudar o jogo sem mudar a lógica. A regra continua a mesma, sempre. O que muda é o número que ela lê. Lembra dessa ideia, porque nos próximos cursos você vai ver ela crescer bastante. Passo 2 feito. Agora a mágica: mexer na caixinha.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Faça os novos cactos lerem a base

**Por que aqui:** Pequena mudança estrutural, ainda sem mudar o ritmo do jogo.

**Foco:** Trocar a fonte do valor na entrada correta da conta.

**Fala de ligação / orientação ao aluno:** “Na conta da velocidade do cacto, troque somente o -5 pelo valor da variável velocidade. Preserve menos Sorteio entre 0 e 1.”

**Fonte:** roteiro-aula-13-corre-dino.md → Parte 2. Passo 2: fazer o cacto obedecer a caixinha.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o sorteio e o operador. Destacar o lado A da conta para não trocar o limite do sorteio por engano.

**Na tela:** **Na tela:** no bloco de criar cacto, dentro da conta do vx, arrastar "valor da variável velocidade" (Programação › Valores) por cima do -5. Rodar e mostrar que nada mudou.

**Trecho original selecionado, antes da edição:** Vai lá no bloco de criar o cacto e olha o vx. Lembra como ficou na Aula 12? É uma conta: menos 5, menos um número sorteado. Aquele menos 5 ali está escrito direto no bloco. Ele é um número fixo, cravado dentro do bloco. E a gente vai trocar ele pela caixinha. Na categoria Programação, subcategoria Valores, pega o bloco valor da variável. Clica, segura e arrasta ele por cima do menos 5, que é o pedaço da esquerda da conta. Nele, escolhe a velocidade. Agora lê a conta: valor da variável velocidade, menos um número sorteado de 0 a 1. Clica na área do jogo e joga. E... está igualzinho. Nada mudou. E está certo. Porque a variável velocidade guarda menos 5, que é exatamente o número que estava ali antes. O jogo continua fazendo a mesma coisa. Mas alguma coisa importante mudou, e não é na tela: mudou de onde vem a velocidade. Antes ela estava escrita dentro do bloco de criar o cacto. Agora ela mora numa caixinha, e o bloco só vai lá olhar toda vez que cria um cacto. E por que isso é tão importante? Porque agora, se alguém mexer na caixinha, todos os cactos que nascerem daqui pra frente já vêm diferentes. Sem precisar mexer no bloco de criar cacto, sem mexer em nada do resto. Isso tem um nome bonito e é uma das ideias mais fortes da programação: mudar o jogo sem mudar a lógica. A regra continua a mesma, sempre. O que muda é o número que ela lê. Lembra dessa ideia, porque nos próximos cursos você vai ver ela crescer bastante. Passo 2 feito. Agora a mágica: mexer na caixinha.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Crie velocidade com valor -5 em Ao iniciar.
- Use valor de velocidade menos sorteio de 0 a 1 no VX dos novos cactos.
- No x do cacto, conecte Sorteio entre 500 e 560.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja quando a base chega ao limite

**Por que aqui:** É o erro silencioso mais provável: deixar igualdade em vez de maior que.

**Foco:** Interpretar velocidade > -9 e incremento -1.

**Fala de ligação / orientação ao aluno:** “Na régua, -5 é maior que -9. Somar -1 leva para -6, depois -7. Em -9, a pergunta “é maior que -9?” dá não e a base para de mudar.”

**Fonte:** roteiro-aula-13-corre-dino.md → Parte 3. Passo 3: fazer a velocidade acelerar sozinha.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a analogia de temperatura, encurtando para a régua. Substituir “quinto da lista” pelo símbolo > e nome maior que, pois a ordem da interface pode mudar.

**Na tela:** Régua com -9, -8, -7, -6, -5; percorrer uma marca por vez. Mostrar a comparação verdadeira/falsa por texto e ícone. Mostrar = riscado e > escolhido sem depender da posição na lista.

**Trecho original selecionado, antes da edição:** Agora a gente vai fazer a caixinha da velocidade mudar sozinha, de tempo em tempo, enquanto o jogador sobrevive. E você já sabe o que faz coisa acontecer de tempo em tempo, porque montou um na Aula 5 e outro na Aula 11: o relógio. Na categoria Jogo 2D, subcategoria Tempo e repetição, pega mais um bloco A cada tantos segundos. Clica, segura e solta dentro do Enquanto estiver rodando, ao lado dos outros dois relógios. Ao lado, e não dentro deles. Agora são três relógios vizinhos, cada um com o seu trabalho. Nesse novo, põe 5 segundos. E, como sempre, todo relógio precisa de um Se a tela atual é jogando por dentro. Essa é a manobra que a gente batizou lá na Aula 7 de embrulhar no Se, e são sempre os mesmos quatro movimentos. O primeiro movimento: na categoria Programação, subcategoria Lógica e Se, pega o bloco Se. No segundo, ele vem com uma comparação de fábrica lá dentro, e essa não serve, então arrasta ela pra fora e joga na lixeira. No terceiro, vai na categoria Jogo 2D, subcategoria Telas e cenas, pega a pergunta a tela atual é e encaixa no lugar que ficou vazio, escolhendo jogando na listinha. E no quarto, solta esse Se dentro do relógio novo, porque é ele que vai embrulhar tudo que vier agora. Agora, dentro desse Se, vem outro Se. E esse é diferente, presta atenção. Volta na categoria Programação, subcategoria Lógica e Se, pega mais um bloco Se e solta ele dentro do primeiro. Dessa vez a gente aproveita a comparação de fábrica que vem dentro dele, porque a nossa pergunta é justamente uma comparação. Essa aqui não vai pra lixeira. Ela tem três pedaços: o da esquerda, o sinal do meio e o da direita. Do lado esquerdo, na categoria Programação, subcategoria Valores, pega o bloco valor da variável e arrasta ele por cima do número que já está ali. Nele você escolhe a velocidade. Agora o sinal do meio, e esse é o mais importante da aula inteira. Ele vem no igual, e a gente não quer igual, quer maior. Abre a listinha dos sinais e conta comigo: o maior é o quinto da lista, aquele biquinho que aponta pra direita. Clica nele. Confere na tela se ficou o biquinho apontando pra direita mesmo, e não o igual. Repara bem nisso, porque se você esquecer o sinal no igual o jogo não vai dar erro nenhum. Nenhum iconezinho, nenhum aviso. Ele só nunca vai acelerar, e você ia ficar procurando o problema sem achar. Tem erro que grita e tem erro que fica quietinho, e esse é dos quietinhos. E no pedaço da direita, escreve -9. Ficou: 'Se o valor da variável velocidade for maior que menos 9'. E agora a parte que confunde todo mundo no começo: números negativos. Pensa em temperatura. Faz menos 5 graus lá fora. Está frio, né? Agora imagina menos 9 graus. Está ainda mais frio. Então menos 5 é mais quente que menos 9. Ou seja: menos 5 é maior que menos 9. Com a velocidade é igual: menos 5 é mais devagar, menos 9 é mais rápido. Então essa pergunta quer dizer: 'a velocidade ainda não chegou no limite de menos 9?' E se ainda não chegou, o que a gente faz? Deixa ela mais rápida. Dentro desse segundo Se, na categoria Programação, subcategoria Variáveis, põe o bloco Somar em variável. Ele tem dois campos: no número escreve -1, e na variável escolhe a velocidade. Somar menos 1? Isso mesmo: somar um número negativo é o mesmo que tirar. Menos 5 somado com menos 1 dá menos 6, que é mais rápido. E por que esse limite de menos 9? Porque sem ele o jogo ia acelerar pra sempre, e depois de dois minutos os cactos estariam passando tão rápido que ninguém conseguiria nada. Todo acelerador precisa de um freio. O menos 9 é o nosso. Clica na área do jogo e joga uma partida longa, tentando sobreviver bastante. Sentiu? Começou tranquilo e foi apertando. A cada cinco segundos que você aguenta, os cactos ficam um tiquinho mais rápidos, até o limite. O jogo já acelera sozinho. Agora o último passo do curso.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Teste a base, o limite e os próximos cactos

**Por que aqui:** Ver os passos de tempo e os cactos antigos sem exigir que a criança sobreviva muito tempo para comparar.

**Foco:** Observar a regra de velocidade atribuída ao nascer sob uma base limitada.

**Fala de ligação / orientação ao aluno:** “Crie um cacto, avance o relógio e acompanhe a base até -9. Compare com um cacto novo. No limite, descontar 1 ainda pode dar -10; o antigo conserva a velocidade que recebeu.”

**Experiência nativa:** acceleration. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Base chega a −9 e permanece; No limite, sorteio produz −10; Cacto anterior conserva sua velocidade.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Monte o acelerador com limite

**Por que aqui:** A lógica foi vista por partes; agora a criança monta os dois Se aninhados.

**Foco:** Combinar relógio, estado e comparação numérica.

**Fala de ligação / orientação ao aluno:** “Crie um relógio de 5 segundos ao lado dos outros. Dentro: Se jogando. Dentro dele: Se valor de velocidade > -9. No então de dentro, some -1 em velocidade.”

**Fonte:** roteiro-aula-13-corre-dino.md → Parte 3. Passo 3: fazer a velocidade acelerar sozinha.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar os três relógios irmãos e a troca de = por >. Encurtar a explicação de negativos já demonstrada. A configuração final é 5 s e base mínima -9.

**Na tela:** **Na tela:** Jogo 2D › Tempo › Quadros e intervalos, um novo "A cada __ segundos" no Enquanto estiver rodando, ao lado dos outros dois, com 5; dentro, um "Se" (Programação › Lógica & Se) com a comparação de fábrica retirada e, no lugar dela, "a tela atual é __ ?" (Jogo 2D › Jogo e telas › Telas e partida) em "jogando"; dentro dele, um segundo "Se" (Programação › Lógica & Se) aproveitando a comparação de fábrica: "valor da variável velocidade" > -9, **trocando o sinal de `=` para `>` na listinha** (o `>` é o quinto da lista); e dentro desse, "Somar -1 em variável velocidade".

**Trecho original selecionado, antes da edição:** Agora a gente vai fazer a caixinha da velocidade mudar sozinha, de tempo em tempo, enquanto o jogador sobrevive. E você já sabe o que faz coisa acontecer de tempo em tempo, porque montou um na Aula 5 e outro na Aula 11: o relógio. Na categoria Jogo 2D, subcategoria Tempo e repetição, pega mais um bloco A cada tantos segundos. Clica, segura e solta dentro do Enquanto estiver rodando, ao lado dos outros dois relógios. Ao lado, e não dentro deles. Agora são três relógios vizinhos, cada um com o seu trabalho. Nesse novo, põe 5 segundos. E, como sempre, todo relógio precisa de um Se a tela atual é jogando por dentro. Essa é a manobra que a gente batizou lá na Aula 7 de embrulhar no Se, e são sempre os mesmos quatro movimentos. O primeiro movimento: na categoria Programação, subcategoria Lógica e Se, pega o bloco Se. No segundo, ele vem com uma comparação de fábrica lá dentro, e essa não serve, então arrasta ela pra fora e joga na lixeira. No terceiro, vai na categoria Jogo 2D, subcategoria Telas e cenas, pega a pergunta a tela atual é e encaixa no lugar que ficou vazio, escolhendo jogando na listinha. E no quarto, solta esse Se dentro do relógio novo, porque é ele que vai embrulhar tudo que vier agora. Agora, dentro desse Se, vem outro Se. E esse é diferente, presta atenção. Volta na categoria Programação, subcategoria Lógica e Se, pega mais um bloco Se e solta ele dentro do primeiro. Dessa vez a gente aproveita a comparação de fábrica que vem dentro dele, porque a nossa pergunta é justamente uma comparação. Essa aqui não vai pra lixeira. Ela tem três pedaços: o da esquerda, o sinal do meio e o da direita. Do lado esquerdo, na categoria Programação, subcategoria Valores, pega o bloco valor da variável e arrasta ele por cima do número que já está ali. Nele você escolhe a velocidade. Agora o sinal do meio, e esse é o mais importante da aula inteira. Ele vem no igual, e a gente não quer igual, quer maior. Abre a listinha dos sinais e conta comigo: o maior é o quinto da lista, aquele biquinho que aponta pra direita. Clica nele. Confere na tela se ficou o biquinho apontando pra direita mesmo, e não o igual. Repara bem nisso, porque se você esquecer o sinal no igual o jogo não vai dar erro nenhum. Nenhum iconezinho, nenhum aviso. Ele só nunca vai acelerar, e você ia ficar procurando o problema sem achar. Tem erro que grita e tem erro que fica quietinho, e esse é dos quietinhos. E no pedaço da direita, escreve -9. Ficou: 'Se o valor da variável velocidade for maior que menos 9'. E agora a parte que confunde todo mundo no começo: números negativos. Pensa em temperatura. Faz menos 5 graus lá fora. Está frio, né? Agora imagina menos 9 graus. Está ainda mais frio. Então menos 5 é mais quente que menos 9. Ou seja: menos 5 é maior que menos 9. Com a velocidade é igual: menos 5 é mais devagar, menos 9 é mais rápido. Então essa pergunta quer dizer: 'a velocidade ainda não chegou no limite de menos 9?' E se ainda não chegou, o que a gente faz? Deixa ela mais rápida. Dentro desse segundo Se, na categoria Programação, subcategoria Variáveis, põe o bloco Somar em variável. Ele tem dois campos: no número escreve -1, e na variável escolhe a velocidade. Somar menos 1? Isso mesmo: somar um número negativo é o mesmo que tirar. Menos 5 somado com menos 1 dá menos 6, que é mais rápido. E por que esse limite de menos 9? Porque sem ele o jogo ia acelerar pra sempre, e depois de dois minutos os cactos estariam passando tão rápido que ninguém conseguiria nada. Todo acelerador precisa de um freio. O menos 9 é o nosso. Clica na área do jogo e joga uma partida longa, tentando sobreviver bastante. Sentiu? Começou tranquilo e foi apertando. A cada cinco segundos que você aguenta, os cactos ficam um tiquinho mais rápidos, até o limite. O jogo já acelera sozinho. Agora o último passo do curso.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- A cada 5 s, se jogando e velocidade > -9, some -1 em velocidade.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Conte todos os controles ao jogador

**Por que aqui:** Fecha a promessa de acessibilidade iniciada na aula 1 e a relação texto/comportamento da aula 8.

**Foco:** Atualizar a descrição de acordo com o jogo final.

**Fala de ligação / orientação ao aluno:** “Na descrição, escreva: Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela”

**Fonte:** roteiro-aula-13-corre-dino.md → Parte 4. Passo 4: testar e ajustar o seu jogo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Selecionar o trecho final sobre descrição. Tirar os testes livres -7/-14 e 2/10 da tarefa obrigatória. A revisão do jogo é a entrega seguinte.

**Na tela:** **Na tela:** jogar partidas longas; depois a pausa, mexendo no limite (-7 e -14) e no ritmo do relógio (2 e 10).

**Trecho original selecionado, antes da edição:** Agora vamos mexer nos dois números que mandam na aceleração, e esses dois são os últimos campos do curso que ficam sendo seus. Primeiro o limite. Troca o menos 9 por menos 7 e joga: o jogo acelera pouquinho e fica tranquilo até o fim. Agora põe menos 14 e joga: ele fica insano lá pra frente, quase impossível, e aí só quem for muito bom passa disso. Agora o ritmo. Troca o relógio de 5 segundos por 2 e joga: ele acelera rápido demais, o jogo endurece logo. Agora põe 10. Demora tanto que a partida fica sem graça de novo. Repara no que a gente está fazendo: escolhendo o quão difícil o jogo fica e com que rapidez. Isso tem nome nos estúdios de verdade: chama balanceamento, e é um trabalho inteiro, que gente faz por semanas antes de lançar um jogo. Escolhe os números que deixaram o seu jogo mais gostoso. Não existe resposta certa, existe o seu jogo. Os meus ficaram em menos 9 e 5 segundos. E agora uma coisa que eu te prometi lá na Aula 9. Lembra que eu pedi pra você jogar três partidas e guardar quantos cactos conseguiu pular em cada uma? Vai buscar esses números. Joga três partidas agora, com o jogo já acelerando, e conta os cactos de novo. Compara com os de lá. Provavelmente os de agora estão menores, e isso é ótimo: quer dizer que o seu jogo ficou mais difícil de verdade, não só na sua impressão. E olha o que aconteceu no meio: você virou uma pessoa que mede o próprio jogo em vez de só achar. Foi o mesmo jeito de pensar do medidor de cactos da Aula 6, agora com você medindo a diversão. E antes da gente terminar, faz uma última coisinha por mim: volta lá no comecinho, naquele bloco Descrever o jogo para leitor de tela, da Aula 1. Lê o que está escrito lá: 'Corra com o dino e pule os cactos apertando espaço'. O seu dino ganhou jeitos novos de pular no meio do curso: ele pula com o espaço, e com a seta pra cima, e quando alguém toca na tela. E quem lê essa frase é justamente quem não está vendo o seu jogo. Ela vai acreditar no que está escrito ali. Se estiver faltando coisa, a pessoa pode achar que não consegue jogar. Então deixa ela contando tudo que dá pra fazer. A minha ficou assim: Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela. Escreve a sua do jeito que fizer sentido pra você.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Atualize a descrição com espaço, seta para cima e toque.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Confira início, salto, colisão, pontos e reinício por teclado e toque. Observe a aceleração; se terminar a partida cedo, use a revisão das peças e o exemplo do laboratório para conferir o limite. Não é preciso bater recorde para concluir.

**Critérios da entrega:**

- Crie velocidade com valor -5 em Ao iniciar.
- Use um único bloco para criar o cacto com posição e velocidade sorteadas.
- Use valor de velocidade menos sorteio de 0 a 1 no VX dos novos cactos.
- A cada 5 s, se jogando e velocidade > -9, some -1 em velocidade.
- No x do cacto, conecte Sorteio entre 500 e 560.
- Preserve o relógio de 1,4 s com criação protegida por jogando.
- Atualize a descrição com espaço, seta para cima e toque.
- Crie pontos com valor inicial zero em Ao iniciar.
- A cada 1 s, some 1 em pontos somente se estiver jogando.
- Retire o desenho provisório da área de colisão.
- Use um único incremento da variável velocidade.

**Quando a base é -9 e o sorteio desconta 1, o novo cacto recebe quanto?**

- -10. (correta)
- -9 obrigatoriamente.

O limite protege a base; a variação é aplicada depois.

**Qual pergunta permite acelerar até a base -9?**

- Velocidade > -9. (correta)
- Velocidade = -9.

Começando em -5, a igualdade com -9 seria falsa e impediria a primeira mudança.

**Mudar a base troca a velocidade dos cactos antigos?**

- Não; os novos consultam a base ao nascer. (correta)
- Sim; todos passam a usar o valor novo imediatamente.

Cada cacto mantém a velocidade atribuída na criação.

## Orientação ao professor e à edição

- O limite -9 vale para a base; um novo cacto ainda pode receber -10 depois do sorteio. Os antigos mantêm a velocidade recebida.
- Não exigir três partidas nem prometer que uma comparação pequena mede cientificamente a diversão.
- Fecho: substituir a exigência de publicação e mural por entrega do projeto e quiz. Publicar/compartilhar é uma escolha posterior, sem bloquear conclusão. Não prometer números de XP não conferidos.
- O trecho de Ponte pode entrar como curiosidade breve do fechamento, sem exigir mudança de modo nem nova atividade.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 05eb185cda62071bb736bbdf7461cdfbc0e03e694f8dad6609cf73972550660e. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).

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
| Mostrar a caixa de colisão do sprite | Jogo 2D › Colisões › Área de contato | Desenha um contorno rosa na área de colisão do sprite (para depurar colisões). |
| Mostrar placar valor em x y cor tamanho | Jogo 2D › Vida e placar › Indicadores e texto na tela | Escreve "rótulo valor" (ex.: Pontos: 5) na tela. Ligue o valor à variável do placar. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| A cada segundos | Jogo 2D › Tempo › Quadros e intervalos | Roda o “fazer” a cada N segundos. É uma raiz de “🔁 Enquanto estiver rodando”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”. |
| Soltar explosão no sprite cor | Jogo 2D › Desenho e efeitos › Partículas | Solta um jato de partículas (da cor escolhida + estilhaços cinza) no centro do sprite. |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama. |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro quando a criança aperta qualquer tecla ou toca na tela. É o "aperte qualquer coisa para começar" das telas de início. Segurar a tecla dispara uma vez só. |
| Quando o sprite pular | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro. |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D › Colisões › Encostar e bloquear | Para cada sprite do grupo que encostar no seu sprite (ex.: a nave), roda o "fazer" com aquele sprite. Use dentro do "a cada quadro". |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| um número de a | Jogo 2D › Sorteios › Números e posições | Sorteia um número inteiro entre os dois valores (incluindo as pontas). Limites com vírgula são ajustados para os inteiros internos; se o intervalo não tiver nenhum inteiro, usa o mais próximo do meio. |
| Reiniciar o jogo | Jogo 2D › Jogo e telas › Telas e partida | Use dentro de um evento, laço ou função. Limpa a partida e executa novamente as três áreas do projeto. |
| o estado do jogo é ? | Jogo 2D › Jogo e telas › Telas e partida | Verdadeiro se o jogo está naquela tela. Use dentro de um "se". |
| Usar área de colisão de % do tamanho para o sprite | Jogo 2D › Colisões › Área de contato | Muda o tamanho da área de colisão do sprite: menor que 100% = colisão mais justa para DANO; maior = mais fácil de PEGAR (moedas). Vale para as perguntas de encostar; "impedir de atravessar" continua usando o tamanho cheio. Veja a área real com "Mostrar a caixa de colisão". |
| Mudar o estado do jogo para | Jogo 2D › Jogo e telas › Telas e partida | Guarda o estado atual, como início, jogando ou vitória. Use a pergunta sobre o estado para escolher o que desenhar e mover. A mudança não pausa o motor nem desenha uma tela. |
| Descrever o jogo para leitor de tela | Jogo 2D › Jogo e telas › Telas e partida | Explica o objetivo e os controles para quem não vê o canvas. Coloque em “Ao iniciar”. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Tremer a tela com intensidade | Jogo 2D › Desenho e efeitos › Efeitos | Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão. |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D › Jogo e telas › Telas e partida | Cobre a tela com um aviso central (título + subtítulo + dica). Ótimo para as telas de início, vitória e derrota. |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D › Kits prontos › Dino | Cria um obstáculo desenhado e coloca no grupo. Cacto e pedra nascem no chão (pule por cima); o pássaro vem no alto (abaixe por baixo). Ligue o x na borda direita e um vx negativo para ele vir vindo. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Condição se, senão se e senão | Programação › ❓ Lógica & Se | Executa o "então" quando a condição for verdadeira. Use + para juntar "senão se" e "senão". |
| Criar variável com valor | Programação › 🏷️ Variáveis | Cria uma variável e guarda nela um valor: número, conta, aleatório, etc. |
| Somar em variável | Programação › 🏷️ Variáveis | Soma ou tira uma quantidade do valor atual de uma variável. |
| Conta matemática | Programação › 🔢 Matemática | Faz uma conta entre dois valores (somar, subtrair, multiplicar, dividir, resto, potência). |
| Comparar dois valores | Programação › ❓ Lógica & Se | Compara dois valores e devolve verdadeiro ou falso. |
| juntar texto | Programação › 🔣 Valores | Junta vários pedaços (texto fixo e valores) num só texto. Use + para adicionar pedaços. |
| Número | Programação › 🔣 Valores | Um valor numérico. |
| texto | Programação › 🔣 Valores | Um valor de texto. |
| valor da variável | Programação › 🔣 Valores | Usa o conteúdo de uma variável já criada como valor. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
