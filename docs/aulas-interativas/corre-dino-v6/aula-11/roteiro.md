# aula-11 — Pontos que contam a sua partida

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Vamos guardar pontos, mostrar o placar e contar o resultado quando a partida termina.

**Saída esperada:** Pontos começam em zero, aumentam uma vez por segundo somente jogando e aparecem na frase de fim.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Vamos guardar pontos, mostrar o placar e contar o resultado quando a partida termina. |
| 2. Crie a memória dos pontos | application | Criar uma variável com valor inicial. |
| 3. Conecte o placar à memória | application | Usar o valor da variável no desenho do placar. |
| 4. Veja como deixar o número legível | demonstration | Reconhecer contraste suficiente para ler o placar. |
| 5. Em quais momentos os pontos crescem? | exploration | Fazer o relógio pontuar apenas durante a partida. |
| 6. Conte um ponto por segundo | application | Criar uma rotina periódica com condição de estado. |
| 7. Veja o número entrar na frase | demonstration | Compor uma mensagem com texto, valor e texto. |
| 8. Conte o resultado na tela de fim | application | Conectar a composição ao subtítulo do ramo fim. |
| 9. Teste e entregue sua construção | delivery | Pontos começam em zero, aumentam uma vez por segundo somente jogando e aparecem na frase de fim. |
| 10. Veja o que você aprendeu | closing | Pontos começam em zero, aumentam uma vez por segundo somente jogando e aparecem na frase de fim. |
| 11. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Crie a memória dos pontos

**Por que aqui:** A analogia da caixa já está no vídeo; basta montar e reconhecer que ela ainda não aparece.

**Foco:** Criar uma variável com valor inicial.

**Fala de ligação / orientação ao aluno:** “Em Ao iniciar, crie a variável pontos com valor zero. Ainda não aparece número na tela: guardar e mostrar são trabalhos diferentes.”

**Fonte:** roteiro-aula-11-corre-dino.md → Parte 1. Passo 1: criar a caixinha dos pontos.

**Montagem:** Preservar a caixa e o valor inicial. Não acrescentar um laboratório que repita criar versus desenhar da aula 1.

**Na tela:** **Na tela:** Programação › Variáveis, arrastar "Criar variável __ com valor __" para dentro do Ao iniciar, logo ACIMA do "Ir para a tela inicio"; nome "pontos", valor 0.

**Trecho original selecionado, antes da edição:** Pra guardar os pontos, o jogo precisa de um lugar na memória. Na categoria Programação, a laranja, subcategoria Variáveis, pega o bloco Criar variável. Clica nele, segura e arrasta pra dentro do Ao iniciar. E presta atenção em onde dentro dele, porque tem pegadinha. Lá na Aula 7 eu te falei que o Ir para a tela inicio é o último bloco do Ao iniciar. Ele continua sendo o último. Então esse Criar variável entra logo acima do Ir para a tela inicio, e não embaixo dele. A arrumação vem toda primeiro, e o Ir para a tela fecha a fila. O Criar variável tem dois campos. No nome escreve pontos. E no valor deixa o 0 que já veio, porque toda partida começa do zero. Esse lugar que você acabou de criar chama variável, que é uma caixinha com um nome e um número guardado dentro. E essa caixinha não tem nada a ver com a caixa de colisão da aula passada: aquela era um contorno em volta do dino, e esta aqui guarda um número. O nome vem de variar, que é mudar: o número lá dentro pode mudar a qualquer hora. É por isso que ela serve tão bem pros pontos, que vivem mudando. Olha ali na área do jogo. Não mudou nada na tela, né? A caixinha existe, tem um 0 dentro, mas ninguém está vendo. É a mesma história do dino na Aula 1: primeiro a gente cria, depois a gente mostra. Passo 1 feito, a caixinha dos pontos já existe no seu jogo. Bora pro segundo, que é botar esse número na tela.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Crie pontos com valor inicial zero em Ao iniciar.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Conecte o placar à memória

**Por que aqui:** Distinguir um zero digitado de uma leitura que acompanhará a variável.

**Foco:** Usar o valor da variável no desenho do placar.

**Fala de ligação / orientação ao aluno:** “Dentro do Se a tela é jogando, depois de retirar os cactos que saíram, coloque Mostrar placar. Mantenha Pontos:, x 12, y 30 e tamanho 24. No valor, encaixe valor da variável pontos.”

**Fonte:** roteiro-aula-11-corre-dino.md → Parte 2. Passo 2: mostrar o placar.

**Montagem:** Reaproveitar o encaixe dentro do Se e a troca para cor escura. Corrigir a referência ao medidor: ele foi retirado na aula 6, não na 7. O próximo clipe retoma a comparação com a imagem já montada.

**Na tela:** **Na tela:** Jogo 2D › Placar e HUD, arrastar "Mostrar placar" para dentro do "Se a tela atual é jogando", lá embaixo de tudo. O texto já nasce "Pontos:". Por cima do valor, arrastar "valor da variável" (Programação › Valores) e escolher pontos. Conferir que o x, o y e o tamanho já vêm em 12, 30 e 24, sem mexer em nenhum. **Rodar e mostrar o placar branco quase sumindo no céu claro**, e só então trocar a cor de branco para azul escuro e rodar de novo. A dor do contraste é o ponto desta parte, então filmar as duas rodadas.

**Trecho original selecionado, antes da edição:** E agora um reencontro: lembra daquele bloco que a gente pegou emprestado na Aula 6, pra ser o medidor de cactos, e aposentou no comecinho da Aula 7? Pois é, ele volta agora. E dessa vez é pra ficar. Na categoria Jogo 2D, subcategoria Placar e HUD, pega o bloco Mostrar placar. Clica, segura e arrasta pra dentro do Se a tela atual é jogando, soltando lá embaixo de tudo, depois do Tirar do grupo cactos quem sair da tela. Ele vai dentro do Se porque o placar é coisa de quem está jogando: não precisa aparecer no menu. Ele tem seis campos. O primeiro é o textinho, e já vem escrito Pontos:, que é o que a gente quer, então deixa como veio. O segundo é o valor. Ele vem com um número solto, mas a gente não quer um número fixo: a gente quer o que está dentro da caixinha. Então, na categoria Programação, subcategoria Valores, pega o bloco valor da variável e arrasta ele por cima do número que já está ali. Não tem buraquinho vazio pra encaixar: é por cima mesmo. Depois escolhe pontos nele. Esse bloco é o espião da caixinha: ele vai lá, olha o que tem dentro, e traz o número. Agora os números de posição, e aqui é fácil: eles já vêm bons. O x vem em 12 e o y em 30, que põem o placar lá no cantinho de cima, do lado esquerdo. E o tamanho já vem em 24. Confere os três e deixa como estão. Clica na área do jogo, começa uma partida e tenta ler o placar. E aí, conseguiu? Eu quase não consigo. Olha lá no cantinho: o Pontos: 0 está escrito, sim, mas ele nasceu branco, e o nosso céu é azul clarinho. Branco em cima de claro quase some. Isso acontece direto quando a gente escreve alguma coisa na tela, e tem conserto fácil: falta o último campo do bloco, que é a cor. Clica no quadradinho de cor e escolhe uma cor escura. Eu vou de azul bem escuro, quase preto. Olha de novo. Agora sim, dá pra ler de longe: Pontos: 0. E lembra disso: não basta o texto estar na tela, ele precisa dar pra ler. Fundo claro pede letra escura, fundo escuro pede letra clara. E olha o nome dessa subcategoria: Placar e HUD. HUD é como os criadores de jogos chamam tudo aquilo que fica desenhado por cima do jogo pra te informar: o placar, a barra de vida, o mapinha. Você acabou de montar o HUD do seu jogo. Passo 2 feito. Agora o terceiro, e nesse quem vai pensar é você.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Dentro de Se jogando, mostre o placar lendo a variável pontos.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja como deixar o número legível

**Por que aqui:** É uma decisão visual simples: observar duas versões basta, sem abrir uma paleta como experiência.

**Foco:** Reconhecer contraste suficiente para ler o placar.

**Fala de ligação / orientação ao aluno:** “No mesmo fundo claro, compare o número branco com um número escuro. O valor é igual; o que mudou foi a facilidade de ler.”

**Fonte:** roteiro-aula-11-corre-dino.md → Parte 2. Passo 2: mostrar o placar.

**Montagem:** Separar a comparação de contraste da montagem. No trecho de construção, orientar a escolher o tom escuro demonstrado.

**Na tela:** Mostrar o mesmo placar sobre o mesmo céu, uma versão clara e outra escura. Incluir a palavra Pontos; não depender apenas de cor para identificar as versões.

**Trecho original selecionado, antes da edição:** E agora um reencontro: lembra daquele bloco que a gente pegou emprestado na Aula 6, pra ser o medidor de cactos, e aposentou no comecinho da Aula 7? Pois é, ele volta agora. E dessa vez é pra ficar. Na categoria Jogo 2D, subcategoria Placar e HUD, pega o bloco Mostrar placar. Clica, segura e arrasta pra dentro do Se a tela atual é jogando, soltando lá embaixo de tudo, depois do Tirar do grupo cactos quem sair da tela. Ele vai dentro do Se porque o placar é coisa de quem está jogando: não precisa aparecer no menu. Ele tem seis campos. O primeiro é o textinho, e já vem escrito Pontos:, que é o que a gente quer, então deixa como veio. O segundo é o valor. Ele vem com um número solto, mas a gente não quer um número fixo: a gente quer o que está dentro da caixinha. Então, na categoria Programação, subcategoria Valores, pega o bloco valor da variável e arrasta ele por cima do número que já está ali. Não tem buraquinho vazio pra encaixar: é por cima mesmo. Depois escolhe pontos nele. Esse bloco é o espião da caixinha: ele vai lá, olha o que tem dentro, e traz o número. Agora os números de posição, e aqui é fácil: eles já vêm bons. O x vem em 12 e o y em 30, que põem o placar lá no cantinho de cima, do lado esquerdo. E o tamanho já vem em 24. Confere os três e deixa como estão. Clica na área do jogo, começa uma partida e tenta ler o placar. E aí, conseguiu? Eu quase não consigo. Olha lá no cantinho: o Pontos: 0 está escrito, sim, mas ele nasceu branco, e o nosso céu é azul clarinho. Branco em cima de claro quase some. Isso acontece direto quando a gente escreve alguma coisa na tela, e tem conserto fácil: falta o último campo do bloco, que é a cor. Clica no quadradinho de cor e escolhe uma cor escura. Eu vou de azul bem escuro, quase preto. Olha de novo. Agora sim, dá pra ler de longe: Pontos: 0. E lembra disso: não basta o texto estar na tela, ele precisa dar pra ler. Fundo claro pede letra escura, fundo escuro pede letra clara. E olha o nome dessa subcategoria: Placar e HUD. HUD é como os criadores de jogos chamam tudo aquilo que fica desenhado por cima do jogo pra te informar: o placar, a barra de vida, o mapinha. Você acabou de montar o HUD do seu jogo. Passo 2 feito. Agora o terceiro, e nesse quem vai pensar é você.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Em quais momentos os pontos crescem?

**Por que aqui:** Retomar estado e tempo antes de montar o novo relógio.

**Foco:** Fazer o relógio pontuar apenas durante a partida.

**Fala de ligação / orientação ao aluno:** “Compare início, jogando e fim. Coloque Somar ponto dentro de Se jogando e confira os três momentos. O resultado precisa ficar guardado no fim.”

**Experiência nativa:** score. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Pontos aumentam jogando; Pontos esperam no início; Valor fica parado no fim.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Conte um ponto por segundo

**Por que aqui:** A criança transfere a regra observada para o projeto contínuo.

**Foco:** Criar uma rotina periódica com condição de estado.

**Fala de ligação / orientação ao aluno:** “Ao lado do relógio dos cactos, coloque A cada 1 segundo. Dentro, Se a tela é jogando; no então, Some 1 em pontos.”

**Fonte:** roteiro-aula-11-corre-dino.md → Parte 3. Passo 3: fazer o número subir.

**Montagem:** Preservar o relógio irmão, não aninhado. Corrigir referências históricas do Se para aula 7. Retirar testes livres com intervalos 0,5 e 3.

**Na tela:** **Na tela:** primeiro a pausa; depois a resolução: Jogo 2D › Tempo e repetição, um "A cada __ segundos" novo no Enquanto estiver rodando, ao lado dos outros, com 1; dentro dele, um "Se" (Programação › Lógica & Se) com a comparação de fábrica retirada e, no lugar dela, "a tela atual é __ ?" (Jogo 2D › Telas e cenas) em "jogando"; dentro do Se, "Somar 1 em variável pontos" (Programação › Variáveis).

**Trecho original selecionado, antes da edição:** Agora eu vou fazer diferente. Em vez de eu te mostrar, você vai me dizer. A gente quer que o jogador ganhe 1 ponto por segundo que sobreviver. E o bloco que faz isso chama Somar em variável, que fica na categoria Programação, subcategoria Variáveis. A pergunta é: onde esse bloco tem que ir? E a resposta está na Aula 5, quando a gente tentou criar cacto no lugar errado e virou avalanche. Repara: se a gente encaixasse o Somar 1 direto no A cada quadro do jogo, ia ganhar 60 pontos por segundo, porque o quadro roda 60 vezes por segundo. É a mesma armadilha da avalanche. Então o que a gente precisa é de um relógio. Na categoria Jogo 2D, subcategoria Tempo e repetição, pega o bloco A cada tantos segundos. Clica, segura e solta dentro do Enquanto estiver rodando, ao lado do A cada quadro do jogo e do relógio de 1.4 que já moram lá. Ao lado, e não dentro deles. Agora o seu motor tem dois relógios vizinhos, cada um com o seu ritmo. Nesse novo, põe 1 segundo. E tem mais uma coisa, que você fez três vezes na Aula 7: todo relógio precisa de um Se a tela atual é jogando por dentro, senão o ponto ia subir até no menu, antes de começar. Essa é aquela manobra que a gente batizou lá na Aula 7 de embrulhar no Se, e são sempre os mesmos quatro movimentos. Vamos juntos. O primeiro movimento: na categoria Programação, subcategoria Lógica e Se, pega o bloco Se. No segundo, repara que ele vem com uma comparação de fábrica lá dentro, e hoje ela não serve, então arrasta ela pra fora e joga na lixeira. No terceiro, vai na categoria Jogo 2D, subcategoria Telas e cenas, pega a pergunta a tela atual é e encaixa no lugar que ficou vazio, escolhendo jogando na listinha. E no quarto, solta esse Se dentro do relógio novo, porque é ele que vai embrulhar o que vier agora. Agora o bloco Somar em variável, lá na categoria Programação, subcategoria Variáveis. Encaixa ele dentro do Se. Ele tem dois campos: o número já vem em 1, que é o que a gente quer, então deixa. E na variável escolhe pontos. Clica na área do jogo e joga. Olha o placar subindo, um ponto por segundo! E olha o tamanho do que você acabou de montar: não foi repetir um passo, foi usar uma peça que você aprendeu seis aulas atrás numa situação diferente. É exatamente isso que quem cria jogo faz o dia inteiro. O número já sobe. Agora o quarto passo, que é um capricho na tela de fim.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- A cada 1 s, some 1 em pontos somente se estiver jogando.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja o número entrar na frase

**Por que aqui:** A tomada de subtítulo e o mutador de três espaços precisam ser visualizados antes da montagem.

**Foco:** Compor uma mensagem com texto, valor e texto.

**Fala de ligação / orientação ao aluno:** “Veja três peças: Você fez, o valor de pontos e o restante da frase. Quando o número muda, a mensagem usa o valor novo.”

**Fonte:** roteiro-aula-11-corre-dino.md → Parte 4. Passo 4: contar os pontos na tela de fim.

**Montagem:** Reaproveitar a explicação da peça de texto da aula 8; separar conceito e gesto de montagem.

**Na tela:** Mostrar três cartões alinhados, depois o encaixe no subtítulo. Trocar apenas o número 3 por 7. Destacar espaços antes/depois do número e o botão + usado três vezes.

**Trecho original selecionado, antes da edição:** Agora um capricho que muda tudo. Hoje, quando você perde, a tela de fim fala sempre a mesma coisa. Mas ela podia te contar quantos pontos você fez. O problema é que o subtítulo é um texto, e os pontos são um número. Como junta os dois? E aqui a Aula 8 vem te ajudar. Lembra que eu te mostrei que o título, o subtítulo e a dica não são campos do bloco, e que cada um é uma pecinha texto encaixada num espacinho? E que eu falei que isso ia servir pra uma coisa muito legal aqui na Aula 11? Chegou a hora. Como o subtítulo é um espacinho com uma peça dentro, a gente pode tirar aquela peça e colocar outra coisa no lugar. Se fosse um campo de digitar, dava só pra escrever letras ali, e a gente estaria travado. Vai lá no Mostrar tela da tela fim, no subtítulo. A gente vai montar ele com três pedacinhos, um texto, o número, e outro texto. Na categoria Programação, subcategoria Valores, pega o bloco juntar texto. O nome dele já diz o serviço: ele pega vários pedaços e gruda tudo num texto só. Arrasta ele por cima do subtítulo. Olha ele agora: está vazio, sem espaço nenhum pra encaixar. Isso é de propósito, porque ele não sabe quantos pedaços você vai querer. Quem decide é você. Na beirada dele tem um mais, igualzinho ao que você usou na Aula 8 pra abrir o senão se. Clica três vezes, uma pra cada pedaço. Repare que cada espaço que nasce já vem com um zero dentro: é só um enchimento, e ele some quando você arrastar alguma coisa por cima. No primeiro espaço, ainda em Valores, pega um bloco texto e arrasta por cima do zero. Nele você escreve: Você fez. E depois do "fez" você deixa um espacinho, senão o número gruda na palavra. No segundo, o bloco valor da variável, que também está em Valores, escolhendo pontos. E no terceiro, mais um bloco texto, com: pontos. Tente bater essa marca! Aqui o espacinho vai no começo, antes da palavra "pontos", senão ela gruda no número. Olha como ficou: os três lado a lado, na ordem em que vão aparecer na tela. Lê junto: 'Você fez', o número de pontos, 'pontos, tente bater essa marca'. E repara numa coisa: no meio dos três tem um número, não um texto. O juntar texto não liga: ele vira tudo texto na hora de grudar. É pra isso que ele existe separado do bloco de conta, que você vai conhecer na próxima aula. A conta é pra fazer conta. O juntar texto é pra escrever. Clica na área do jogo, joga e perde de propósito. Olha lá: Você fez 12 pontos. Tente bater essa marca! Agora a tela de fim conversa com você. Confere o seu comigo, da esquerda pra direita: o texto Você fez, depois o valor da variável pontos, depois o texto pontos. Tente bater essa marca! Três espaços, três peças, tudo na mesma fileira. Se sobrou um espaço com o zero ainda dentro, é porque você clicou no mais uma vez a mais. Clica no menos, do lado do mais, que ele fecha o último. E se aparecer o iconezinho de alerta, é sinal de que ficou um espacinho sem nada. Clica nele pra ele te dizer onde. Quarto passo no lugar. Agora é hora de testar tudo.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Conte o resultado na tela de fim

**Por que aqui:** A montagem ocorre com uma imagem clara da estrutura e com checagem da entrada certa.

**Foco:** Conectar a composição ao subtítulo do ramo fim.

**Fala de ligação / orientação ao aluno:** “No subtítulo da tela fim, use juntar texto com três peças: “Você fez ”, valor de pontos e “ pontos. Tente bater essa marca!”. Repare nos espaços junto do número.”

**Fonte:** roteiro-aula-11-corre-dino.md → Parte 4. Passo 4: contar os pontos na tela de fim.

**Montagem:** Manter os três cliques em +, a substituição dos zeros, os espaços e o uso de − para retirar um encaixe extra. Não exigir um resultado de 12 pontos: esse é só o exemplo gravado.

**Na tela:** **Na tela:** no "Mostrar tela" da tela fim: arrastar o "juntar texto" (Programação › Valores) por cima do subtítulo; dar zoom no bloco vazio e clicar três vezes no "+", mostrando os espaços nascendo com o "0" de sombra; encaixar, em ordem, "texto Você fez", "valor da variável pontos" e "texto pontos. Tente bater essa marca!".

**Trecho original selecionado, antes da edição:** Agora um capricho que muda tudo. Hoje, quando você perde, a tela de fim fala sempre a mesma coisa. Mas ela podia te contar quantos pontos você fez. O problema é que o subtítulo é um texto, e os pontos são um número. Como junta os dois? E aqui a Aula 8 vem te ajudar. Lembra que eu te mostrei que o título, o subtítulo e a dica não são campos do bloco, e que cada um é uma pecinha texto encaixada num espacinho? E que eu falei que isso ia servir pra uma coisa muito legal aqui na Aula 11? Chegou a hora. Como o subtítulo é um espacinho com uma peça dentro, a gente pode tirar aquela peça e colocar outra coisa no lugar. Se fosse um campo de digitar, dava só pra escrever letras ali, e a gente estaria travado. Vai lá no Mostrar tela da tela fim, no subtítulo. A gente vai montar ele com três pedacinhos, um texto, o número, e outro texto. Na categoria Programação, subcategoria Valores, pega o bloco juntar texto. O nome dele já diz o serviço: ele pega vários pedaços e gruda tudo num texto só. Arrasta ele por cima do subtítulo. Olha ele agora: está vazio, sem espaço nenhum pra encaixar. Isso é de propósito, porque ele não sabe quantos pedaços você vai querer. Quem decide é você. Na beirada dele tem um mais, igualzinho ao que você usou na Aula 8 pra abrir o senão se. Clica três vezes, uma pra cada pedaço. Repare que cada espaço que nasce já vem com um zero dentro: é só um enchimento, e ele some quando você arrastar alguma coisa por cima. No primeiro espaço, ainda em Valores, pega um bloco texto e arrasta por cima do zero. Nele você escreve: Você fez. E depois do "fez" você deixa um espacinho, senão o número gruda na palavra. No segundo, o bloco valor da variável, que também está em Valores, escolhendo pontos. E no terceiro, mais um bloco texto, com: pontos. Tente bater essa marca! Aqui o espacinho vai no começo, antes da palavra "pontos", senão ela gruda no número. Olha como ficou: os três lado a lado, na ordem em que vão aparecer na tela. Lê junto: 'Você fez', o número de pontos, 'pontos, tente bater essa marca'. E repara numa coisa: no meio dos três tem um número, não um texto. O juntar texto não liga: ele vira tudo texto na hora de grudar. É pra isso que ele existe separado do bloco de conta, que você vai conhecer na próxima aula. A conta é pra fazer conta. O juntar texto é pra escrever. Clica na área do jogo, joga e perde de propósito. Olha lá: Você fez 12 pontos. Tente bater essa marca! Agora a tela de fim conversa com você. Confere o seu comigo, da esquerda pra direita: o texto Você fez, depois o valor da variável pontos, depois o texto pontos. Tente bater essa marca! Três espaços, três peças, tudo na mesma fileira. Se sobrou um espaço com o zero ainda dentro, é porque você clicou no mais uma vez a mais. Clica no menos, do lado do mais, que ele fecha o último. E se aparecer o iconezinho de alerta, é sinal de que ficou um espacinho sem nada. Clica nele pra ele te dizer onde. Quarto passo no lugar. Agora é hora de testar tudo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No subtítulo do fim, junte texto, valor de pontos e texto nessa ordem.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Espere no menu: pontos não crescem. Comece e acompanhe dois incrementos. Termine a partida: a frase deve mostrar o valor final parado. Reinicie e confira zero. Leia o placar no fundo real.

**Critérios da entrega:**

- Crie pontos com valor inicial zero em Ao iniciar.
- Dentro de Se jogando, mostre o placar lendo a variável pontos.
- A cada 1 s, some 1 em pontos somente se estiver jogando.
- No subtítulo do fim, junte texto, valor de pontos e texto nessa ordem.
- Use um único incremento da variável pontos.

**Qual peça faz o placar acompanhar a memória?**

- Valor da variável pontos. (correta)
- Um número zero digitado no placar.

O valor conectado é lido novamente quando o jogo desenha.

**Quando o relógio deve somar pontos?**

- Somente enquanto a tela é jogando. (correta)
- Também no menu e no fim.

A condição protege o incremento; o resultado fica guardado.

**Para que serve juntar texto?**

- Para formar uma mensagem com os pedaços em ordem. (correta)
- Para somar matematicamente todas as palavras.

A conta matemática e a composição de texto têm funções diferentes.

## Orientação ao professor e à edição

- Revisar referências antigas: medidor retirado na aula 6; Se ensinado na aula 7; dois grupos protegidos naquela aula.
- A checagem confere a conexão da variável e a frase; o professor também confere contraste e posicionamento no jogo.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: b30f94be234e9fb0da4db2fd54da6d3d070b01e51b7b5c0569f6db7568006c6e. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).
