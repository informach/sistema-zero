# dia-5 — Começo, vitória, derrota e recomeço

**Entrada:** Retomar o Dia 4, com pontuação, três vidas e as duas colisões funcionando.

**Resultado:** Jogo completo com quatro telas, ações limitadas à partida, reinício e entrega pronta para compartilhar.

**Tempo de percurso estimado:** 28–40 minutos, com pausa possível após proteger as ações. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.

A demonstração tem apenas vídeo, com pausa e repetição. O experimento é separado do projeto e tem uma comparação finita. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.

## Percurso

| Seção | O que aparece | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | Assistir | Retomar o Dia 4, com pontuação, três vidas e as duas colisões funcionando. |
| 2. Observe os quatro momentos do jogo | Observar | Distinguir tela atual de desenho da tela e reconhecer a meta fixa. |
| 3. Prepare a meta e a tela inicial | Fazer no Estúdio | Inicializar a constante alvo e escolher inicio. |
| 4. O relógio pode agir agora? | Experimentar | Entender que uma condição controla a ação sem desligar o relógio. |
| 5. Faça a pergunta da partida | Fazer no Estúdio | Encaixar a comparação de tela no Se. |
| 6. Observe a mudança de todos os blocos | Observar | Ver como mover a sequência preservando sua ordem. |
| 7. Leve a partida para dentro da pergunta | Fazer no Estúdio | Limitar o motor da partida à tela jogando. |
| 8. Proteja também o nascimento das pedras | Fazer no Estúdio | Colocar a condição dentro do relógio independente. |
| 9. Deixe o disparo só para a partida | Fazer no Estúdio | Evitar tiros e sons acumulados no menu e depois do fim. |
| 10. Decida quando vencer | Fazer no Estúdio | Comparar pontos e alvo para mudar de tela. |
| 11. Decida quando a partida termina sem vidas | Fazer no Estúdio | Separar a condição de derrota da condição de vitória. |
| 12. Desenhe a abertura e os dois finais | Fazer no Estúdio | Associar um ramo e uma imagem a cada estado. |
| 13. Faça Enter começar e recomeçar | Fazer no Estúdio | Usar a mesma tecla de acordo com o estado atual. |
| 14. Observe como testar o jogo completo | Observar | Conferir início, derrota, reinício e vitória sem alterar a meta. |
| 15. Teste, entregue e compartilhe | Entregar | Jogo completo com quatro telas, ações limitadas à partida, reinício e entrega pronta para compartilhar. |
| 16. Veja o que você construiu | Fechar | Jogo completo com quatro telas, ações limitadas à partida, reinício e entrega pronta para compartilhar. |
| 17. Hora do Desafio | Fechar | Reconhecer duas relações importantes desta aula. |

## Abertura

“Chegou a hora de dar começo e final ao seu jogo. Hoje vamos guardar a partida atrás de uma pergunta: estamos jogando? Depois entram as telas, o Enter e o teste completo. Vamos por partes; seu projeto continua guardado se você precisar de uma pausa.”

## Observe os quatro momentos do jogo

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Distinguir tela atual de desenho da tela e reconhecer a meta fixa.

**Fala revisada / orientação:** “O jogo abre em inicio. Enter leva para jogando. Se os pontos chegam a 26, vai para vitoria; se as vidas acabam, vai para fim. Pontos mudam durante a partida. O alvo fica em 26: ele é uma constante, a meta deste jogo.”

**Imagem:** Quatro cartões de estado, uma seta de cada vez e valores pontos/vidas. De inicio para jogando; uma partida de exemplo termina em fim e outra em vitoria. Não trocar estados por cliques do aluno.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 1. Passo 1: o alvo e a primeira tela.

**Montagem:** Usar a apresentação de telas e da constante. Acrescentar um percurso visual das quatro telas, sem ainda mostrar a reorganização de todos os blocos.

**Trecho original antes da edição:** Primeiro, o jogo precisa saber quando alguém vence. A nossa regra é destruir 26 asteroides. Esse número não muda nunca durante o jogo, e número que não muda tem um nome especial: constante. É uma caixinha lacrada: você escreve o número uma vez e ele fica firme até o fim. Na categoria Programação, subcategoria Variáveis, pega o bloco Criar constante e encaixa dentro do Ao iniciar, logo abaixo do Dar ao sprite nave 3 de vida. No nome, escreve alvo, e no valor, 26. Agora, uma ideia nova, e é a mais importante de hoje: as telas. Pensa nos jogos que você joga: tem a tela de abertura, a tela do jogo rodando, a tela de você venceu... O jogo troca de tela conforme o que acontece. O nosso vai ter quatro: inicio, jogando, vitoria e fim. E a primeira coisa que precisamos fazer é dizer em qual tela o jogo abre. Na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela e encaixa como o último bloco do Ao iniciar, embaixo do Criar constante. Olha só: ele já vem com a tela inicio escolhida, que é justamente a nossa tela de início. Então é só deixar assim. E quando você clicar naquele menuzinho de telas, vai ver que já tem umas prontas pra escolher, como jogando, vitoria e fim, que a gente vai usar daqui a pouco. Pronto: quando o jogo ligar, ele vai direto pra tela de início. Passo 1 pronto. Agora o segundo, que é montar a pergunta da tela de jogar.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** A tela atual guarda em qual momento estamos. Mostrar tela desenha esse momento para o jogador.

## Prepare a meta e a tela inicial

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Inicializar a constante alvo e escolher inicio.

**Fala revisada / orientação:** “Em Programação, Variáveis, coloque Criar constante no final de Ao iniciar: nome alvo, valor 26. Depois, em Jogo 2D, Telas e cenas, coloque Ir para a tela e escolha inicio. O jogo vai começar nesse estado.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 1. Passo 1: o alvo e a primeira tela.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Primeiro, o jogo precisa saber quando alguém vence. A nossa regra é destruir 26 asteroides. Esse número não muda nunca durante o jogo, e número que não muda tem um nome especial: constante. É uma caixinha lacrada: você escreve o número uma vez e ele fica firme até o fim. Na categoria Programação, subcategoria Variáveis, pega o bloco Criar constante e encaixa dentro do Ao iniciar, logo abaixo do Dar ao sprite nave 3 de vida. No nome, escreve alvo, e no valor, 26. Agora, uma ideia nova, e é a mais importante de hoje: as telas. Pensa nos jogos que você joga: tem a tela de abertura, a tela do jogo rodando, a tela de você venceu... O jogo troca de tela conforme o que acontece. O nosso vai ter quatro: inicio, jogando, vitoria e fim. E a primeira coisa que precisamos fazer é dizer em qual tela o jogo abre. Na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela e encaixa como o último bloco do Ao iniciar, embaixo do Criar constante. Olha só: ele já vem com a tela inicio escolhida, que é justamente a nossa tela de início. Então é só deixar assim. E quando você clicar naquele menuzinho de telas, vai ver que já tem umas prontas pra escolher, como jogando, vitoria e fim, que a gente vai usar daqui a pouco. Pronto: quando o jogo ligar, ele vai direto pra tela de início. Passo 1 pronto. Agora o segundo, que é montar a pergunta da tela de jogar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Crie a constante alvo = 26 em Ao iniciar.
- Vá para inicio em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## O relógio pode agir agora?

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Entender que uma condição controla a ação sem desligar o relógio.

**Fala revisada / orientação:** “O relógio vai tocar três vezes. Compare a tela inicio com jogando. Ele só cria uma pedra se a pergunta a tela atual é jogando tiver resposta sim. Veja a diferença antes de fazer isso no seu projeto.”

**Imagem:** Rótulo do estado, três chamadas do relógio e contagem de nascimentos. Sem escolher outras condições ou inventar fases extras.

**Controles:** Tela: inicio ou Tela: jogando; avançar os três passos de cada comparação. Só essas duas situações. Resultado fica guardado; ao terminar, controles se encerram. Não altera o Estúdio.

**Conclusão:** registrar as duas situações e acertar a pergunta externa ao quadro. Estado HTML é participação informada pelo cliente; a resposta é corrigida no servidor, sem alegar auditoria dos comandos.

**Pergunta:** O relógio tocou na tela inicio, mas tem Se a tela é jogando antes de criar. O que acontece?

**Resposta:** Nenhum asteroide é criado.. A chamada do relógio acontece; a condição falsa impede o bloco de criar.

**Ajuda no mesmo objetivo:** Veja se a pergunta da condição é verdadeira no estado escolhido.

## Faça a pergunta da partida

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Encaixar a comparação de tela no Se.

**Fala revisada / orientação:** “Em Programação, Lógica e Se, coloque Se no topo de A cada quadro do jogo. Retire a comparação que veio na pergunta. No lugar, encaixe a tela atual é, de Jogo 2D, Telas e cenas, e escolha jogando. Ainda vamos levar os blocos para dentro.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 2. Passo 2: fazer a pergunta da tela "jogando".

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Aqui vem a manobra mais legal do desafio inteiro. Hoje, tudo o que está no A cada quadro do jogo roda o tempo todo. Mas a nave, os tiros e os asteroides só deviam funcionar quando a gente estiver de fato jogando, né? Então a gente vai guardar o jogo inteiro dentro de uma pergunta: a tela atual é jogando? Primeiro, o bloco de decisão. Na categoria Programação, subcategoria Lógica e Se, pega o bloco Se e encaixa dentro do A cada quadro do jogo, bem no topo, antes de tudo. Esse bloco laranja é o bloco das decisões: se a resposta da pergunta for sim, ele faz o que está dentro dele. Agora, a pergunta. Repara que o Se já vem com uma comparação de fábrica ali na pergunta, um valor da variável de um lado e um número do outro. A gente não quer ela aqui, então tira ela primeiro: arrasta pra fora e apaga. No lugar dela, na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco a tela atual é e encaixa. Ele vem com inicio, então clica no menuzinho e escolhe jogando na listinha. Ficou: se a tela atual é jogando, então faça o que está dentro. Passo 2 pronto, a pergunta está feita. Agora o terceiro passo, que é mudar o jogo inteiro pra dentro dela.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- No motor, use Se com a pergunta a tela atual é jogando.

**Ajuda no mesmo objetivo:** A pergunta deve dizer jogando; não deixe a comparação de números que veio no Se.

## Observe a mudança de todos os blocos

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Ver como mover a sequência preservando sua ordem.

**Fala revisada / orientação:** “Vou pegar a sequência pelo primeiro bloco, Limpar a tela. Os que estão encaixados abaixo vêm junto. Eu solto a sequência dentro do então do Se. Confira o começo e o fim: Limpar a tela lá em cima e Desenhar as vidas lá embaixo, todos dentro.”

**Imagem:** Realçar a cadeia inteira, arrastar uma vez e mostrar o contorno do Se envolvendo todos os blocos. Alternar visão geral e aproximação, sem cortes que escondam a conexão.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 3. Passo 3: mudar o jogo pra dentro.

**Montagem:** Reaproveitar só o arraste da cadeia. Gravar zoom e pausa no contorno do então. Não incluir ainda o relógio neste clipe.

**Trecho original antes da edição:** Agora, a mudança: arrasta todos os blocos que já estavam no A cada quadro, do Limpar a tela até o Desenhar as vidas, pra dentro desse Se. Uma dica: se você arrastar o Limpar a tela, todos os que estão encaixados embaixo dele vêm junto, de uma vez só. Capricha no encaixe.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Não arraste o Se com a cadeia. Pegue a sequência por Limpar a tela.

## Leve a partida para dentro da pergunta

**Por que aqui:** Separar observar o arraste de executar reduz o risco de soltar metade da cadeia e perder o ponto de partida.

**Foco:** Limitar o motor da partida à tela jogando.

**Fala revisada / orientação:** “No seu Estúdio, arraste a sequência de Limpar a tela até Desenhar as vidas para o então do Se jogando. Preserve a ordem. Enquanto a tela for inicio, essa sequência não roda. A tela pode ficar vazia por enquanto: vamos desenhar a abertura daqui a pouco.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 3. Passo 3: mudar o jogo pra dentro.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Agora, a mudança: arrasta todos os blocos que já estavam no A cada quadro, do Limpar a tela até o Desenhar as vidas, pra dentro desse Se. Uma dica: se você arrastar o Limpar a tela, todos os que estão encaixados embaixo dele vêm junto, de uma vez só. Capricha no encaixe.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Os corações também ficam dentro de Se jogando.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Proteja também o nascimento das pedras

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Colocar a condição dentro do relógio independente.

**Fala revisada / orientação:** “Dentro de A cada 40 quadros, coloque outro Se com a pergunta a tela atual é jogando. Leve Criar asteroide para o então desse Se. Proteger o motor principal não protege automaticamente este outro relógio.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 3. Passo 3: mudar o jogo pra dentro.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Ah, e tem um lugarzinho a mais: o relógio dos asteroides. Vai no A cada 40 quadros e faz igualzinho: pega mais um Se na categoria Programação, subcategoria Lógica e Se, encaixa dentro do bloco, tira a comparação de fábrica dele também e põe no lugar a pergunta a tela atual é, de Telas e cenas, escolhendo jogando na listinha, e arrasta o bloco de criar asteroide pra dentro desse Se. Senão os asteroides iam continuar chovendo até na tela de início. Olha a tela do jogo agora: tudo sumiu! Calma, é sinal de que funcionou. O jogo está na tela inicio, e a gente ainda não desenhou nada nela. Já já ela ganha vida. Passo 3 pronto. Agora o quarto, que é criar a vitória e a derrota.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Dentro do relógio de 40 quadros, crie asteroide só se a tela é jogando.
- Não deixe outro criador de asteroides fora da condição.

**Ajuda no mesmo objetivo:** Deixe só um Criar asteroide: ele deve estar dentro da condição que está dentro do relógio.

## Deixe o disparo só para a partida

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Evitar tiros e sons acumulados no menu e depois do fim.

**Fala revisada / orientação:** “Agora veja o evento da barra de espaço. Dentro dele, coloque Se a tela atual é jogando. Leve Criar tiro e Tocar som de tiro para o então. Fora da partida, espaço não dispara. O evento continua ouvindo; a pergunta decide se ele age.”

**Imagem:** Evento Espaço já existente, pergunta jogando e os dois comandos transferidos para dentro; teste curto no menu sem tiro e sem som.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 6. Passo 6: o Enter comanda o jogo.

**Montagem:** Complemento novo: o roteiro original protege motor e asteroides, mas deixa o evento de tiro sem condição. A Parte 6 localiza a área de eventos; regravar este gesto sobre o evento Espaço antes de criar o Enter.

**Trecho original antes da edição:** A tela de início diz aperte Enter, mas o Enter ainda não faz nada. Bora dar poder pra ele. Na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla e encaixa dentro da área Quando acontecer, embaixo do bloco da barra de espaço. No menu de teclas, escolhe o Enter. Agora, dentro dele, as decisões. Na categoria Programação, subcategoria Lógica e Se, pega um Se. Ele vem com a comparação de fábrica. Tira ela e, para a pergunta, vai na subcategoria Telas e cenas e encaixa um a tela atual é, escolhendo inicio na listinha. E dentro, vai novamente na subcategoria Telas e cenas e pega o bloco Ir para a tela, escolhendo jogando na listinha. Ou seja: se estou na tela de início e apertei Enter, o jogo começa! Agora clica no mais senão se desse Se. Ele vem com a comparação de fábrica de novo. Tira ela e vai na categoria Telas e cenas e pega o bloco a tela atual é, e escolhe fim. E dentro vai um bloco novo e poderoso: na categoria Jogo 2D, subcategoria Telas e cenas, pega o Reiniciar o jogo e encaixa aí. Ele zera tudo: pontos, vidas, asteroides, e recomeça do comecinho. E mais um clique no mais senão se: Ele vem com a comparação de fábrica de novo. Tira ela e vai na categoria Telas e cenas e pega o bloco a tela atual é, e escolhe vitoria. E dentro vai novamente na subcategoria Telas e cenas, pega outro Reiniciar o jogo e encaixa aí dentro. Passo 6 pronto. E agora sim, o momento da verdade: o sétimo e último passo, que é testar do começo ao fim e publicar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.

**Ajuda no mesmo objetivo:** Não crie um segundo evento Espaço. Envolva os comandos do evento que já existe.

## Decida quando vencer

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Comparar pontos e alvo para mudar de tela.

**Fala revisada / orientação:** “No fim do então de Se jogando, depois dos corações, coloque outro Se. Na comparação, leia pontos à esquerda, escolha maior ou igual e leia alvo à direita. Dentro dele, coloque Ir para a tela vitoria.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 4. Passo 4: criar a vitória e a derrota.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** O jogo precisa perceber sozinho a hora de ganhar e a hora de perder. São duas perguntas novas, e as duas moram no finalzinho do Se a tela atual é jogando, depois do Desenhar as vidas. Primeiro, a vitória. Na categoria Programação, subcategoria Lógica e Se, pega mais um bloco Se e encaixa lá no final, dentro do Se grande. E aqui vem uma sorte boa: a comparação que já vem de fábrica dentro do Se é justamente o que a gente precisa, então dessa vez não tira nada, só ajusta. Do lado esquerdo já tem um valor da variável. Clica nele e troca o nome pra pontos. No sinalzinho do meio, escolhe o maior ou igual. E do lado direito tem um número. Esse a gente troca: na categoria Programação, subcategoria Valores, pega outro valor da variável, arrasta por cima do número e escolhe alvo. A pergunta ficou: os pontos chegaram no alvo? E se a resposta for sim: na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela, encaixa dentro desse Se e escolhe vitoria na listinha.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- No final da partida, se pontos ≥ alvo, vá para vitoria.

**Ajuda no mesmo objetivo:** O lado direito lê a constante alvo. Não substitua por um número diferente só para passar de seção.

## Decida quando a partida termina sem vidas

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Separar a condição de derrota da condição de vitória.

**Fala revisada / orientação:** “Logo abaixo da pergunta de vitória, ainda dentro de jogando, coloque outro Se. Troque a comparação por as vidas do sprite acabaram?, de Jogo 2D, Vida, escolhendo nave. Dentro, coloque Ir para a tela fim.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 4. Passo 4: criar a vitória e a derrota.

**Montagem:** Manter a ordem original. O professor deve saber: se meta e zero vidas acontecerem no mesmo quadro, a segunda condição leva a fim. Não prometer prioridade de vitória.

**Trecho original antes da edição:** Agora, a derrota. Pega mais um Se, na categoria Programação, subcategoria Lógica e Se, e encaixa logo abaixo. Esse Se também vem com aquela comparação de fábrica. Tira ela e, no lugar, na categoria Jogo 2D, subcategoria Vida, pega o bloco as vidas do sprite acabaram? e encaixa. Escolhe a nave. E dentro, mais um Ir para a tela, de Telas e cenas, escolhendo fim na listinha. Passo 4 pronto. Agora o quinto, que é montar as telas.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Na partida, coloque a pergunta de vitória antes da pergunta de derrota.
- Se acabaram as vidas da nave, vá para fim, após a pergunta de vitória.

**Ajuda no mesmo objetivo:** As vidas decidem fim; os pontos decidem vitoria. As duas perguntas ficam no então da partida.

## Desenhe a abertura e os dois finais

**Por que aqui:** Os três ramos repetem o mesmo padrão e são construídos juntos; o vídeo faz uma abertura e depois mostra apenas o que muda nos finais.

**Foco:** Associar um ramo e uma imagem a cada estado.

**Fala revisada / orientação:** “No Se grande, use + senão se três vezes: inicio, vitoria e fim. Cada pergunta usa a tela atual é. Em cada ramo, encaixe Mostrar tela. Na abertura: Nave contra Asteroides e dica Aperte Enter para começar. Nos dois finais, use a dica Aperte Enter para voltar ao início. Escolha títulos e fundos legíveis.”

**Imagem:** Construir inicio com todos os campos; repetir vitoria/fim destacando só o nome do estado, título e dica. Pausa em cada ramo.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 5. Passo 5: montar as telas de início, de vitória e de derrota.

**Montagem:** Reaproveitar a criação dos ramos e telas. Nos finais, trocar a dica por “Aperte Enter para voltar ao início”: o reinício executa Ao iniciar e volta ao menu, não entra imediatamente em jogando.

**Trecho original antes da edição:** O jogo já troca de tela, mas as telas estão vazias. Bora desenhar elas. E tem um jeito esperto: o nosso Se grande pode ganhar irmãos. Olha na parte de baixo dele: tem um botãozinho escrito mais senão se. Clica nele. Apareceu um espaço novo, o senão se, com mais um buraquinho de pergunta. Quer dizer: se não for a tela jogando, será que é outra? Esse senão se também nasce com uma comparação de fábrica na pergunta. Tira ela e, no lugar, encaixa um a tela atual é, da categoria Jogo 2D, subcategoria Telas e cenas, escrito inicio. E dentro dele vai o bloco que desenha a tela inteira. Na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Mostrar tela e encaixa dentro. Ele tem espacinho pra tudo: no título, escreve o nome do seu jogo, Nave contra Asteroides. No subtítulo, Destrua os asteroides. Na dica, Aperte Enter para começar. E escolhe uma cor de fundo bonita. Agora repete a receita mais duas vezes. Mais um clique no mais senão se, depois Na subcategoria Telas e cenas pega o bloco a tela atual é, encaixa e escolhe a tela vitoria. E dentro, da subcategoria Telas e Cenas, pegue o blocoMostrar tela e coloque o título Você Ganhou e a dica Aperte Enter para jogar novamente. O subtítulo pode deixar em branco. E mais um clique no mais senão se, depois Na subcategoria Telas e cenas pega o bloco a tela atual é, encaixa e escolhe a tela fim. E dentro, da subcategoria Telas e Cenas, pegue o bloco Mostrar tela e coloque o título Você Perdeu e a dica Aperte Enter para tentar novamente. O subtítulo também pode deixar em branco. Olha a tela do jogo! A tela de início apareceu, com o nome do seu jogo brilhando. Que orgulho, hein? Passo 5 pronto. Agora o sexto, que é fazer o Enter comandar tudo.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- No senão se inicio, encaixe Mostrar tela com a dica de Enter.
- No senão se vitoria, encaixe Mostrar tela com a dica de Enter.
- No senão se fim, encaixe Mostrar tela com a dica de Enter.

**Ajuda no mesmo objetivo:** Os senão se pertencem ao Se grande. Não os coloque dentro da pergunta de vitória ou da pergunta de derrota.

## Faça Enter começar e recomeçar

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Usar a mesma tecla de acordo com o estado atual.

**Fala revisada / orientação:** “Em Quando acontecer, adicione Quando apertar a tecla Enter. Dentro: Se a tela é inicio, vá para jogando. No senão se fim, use Reiniciar o jogo. No senão se vitoria, também Reiniciar o jogo. Depois de reiniciar, você volta à abertura; Enter mais uma vez começa outra partida.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 6. Passo 6: o Enter comanda o jogo.

**Montagem:** Reaproveitar montagem de Enter e seus ramos. Complementar o retorno ao menu e o segundo Enter. Não dizer que o primeiro Enter após derrota já começa a partida.

**Trecho original antes da edição:** A tela de início diz aperte Enter, mas o Enter ainda não faz nada. Bora dar poder pra ele. Na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla e encaixa dentro da área Quando acontecer, embaixo do bloco da barra de espaço. No menu de teclas, escolhe o Enter. Agora, dentro dele, as decisões. Na categoria Programação, subcategoria Lógica e Se, pega um Se. Ele vem com a comparação de fábrica. Tira ela e, para a pergunta, vai na subcategoria Telas e cenas e encaixa um a tela atual é, escolhendo inicio na listinha. E dentro, vai novamente na subcategoria Telas e cenas e pega o bloco Ir para a tela, escolhendo jogando na listinha. Ou seja: se estou na tela de início e apertei Enter, o jogo começa! Agora clica no mais senão se desse Se. Ele vem com a comparação de fábrica de novo. Tira ela e vai na categoria Telas e cenas e pega o bloco a tela atual é, e escolhe fim. E dentro vai um bloco novo e poderoso: na categoria Jogo 2D, subcategoria Telas e cenas, pega o Reiniciar o jogo e encaixa aí. Ele zera tudo: pontos, vidas, asteroides, e recomeça do comecinho. E mais um clique no mais senão se: Ele vem com a comparação de fábrica de novo. Tira ela e vai na categoria Telas e cenas e pega o bloco a tela atual é, e escolhe vitoria. E dentro vai novamente na subcategoria Telas e cenas, pega outro Reiniciar o jogo e encaixa aí dentro. Passo 6 pronto. E agora sim, o momento da verdade: o sétimo e último passo, que é testar do começo ao fim e publicar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Enter: inicio vai para jogando; fim e vitoria reiniciam e voltam ao início.

**Ajuda no mesmo objetivo:** O evento Espaço continua separado. O Enter tem três ramos, com perguntas de tela diferentes.

## Observe como testar o jogo completo

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Conferir início, derrota, reinício e vitória sem alterar a meta.

**Fala revisada / orientação:** “Teste primeiro o menu: espaço não dispara e as pedras não nascem. Enter começa. Depois de perder, Enter volta ao início, com zero ponto e três vidas; outro Enter começa. Faça também o caminho até 26 pontos e veja a vitória. Na entrega, envie ao professor e use Compartilhar quando estiver disponível.”

**Imagem:** Menu imóvel, espaço sem efeito; partida; derrota; Enter no menu; Enter na partida; montagem acelerada até 26 pontos e vitória. Gravação atual do botão Compartilhar depois do envio.

**Fonte:** roteiro-aula-dia5-desafio-primeiro-jogo.md → Parte 7. Passo 7: testar do começo ao fim e publicar.

**Montagem:** Reaproveitar os testes e o Compartilhar, com corte do tempo repetido de jogo. Corrigir o ciclo de dois Enter. Conferir campos atuais de publicação, sem prometer edição ou geração de capa que não esteja presente.

**Trecho original antes da edição:** Clica na área do jogo. A tela de início está lá. Aperta Enter... o jogo começou! Joga de verdade agora: explode asteroides, vê o placar subir. Deixa bater umas vezes e perde de propósito, só pra ver a tela de Você Perdeu aparecer. Aperta Enter e olha: recomeçou zeradinho. Agora joga pra valer e alcança os 26 pontos... Você Ganhou! O seu jogo tem começo, meio, fim e recomeço. Ele está completo. E agora, o momento mais especial do desafio. Primeiro clica em Enviar para o professor, pra eu receber o seu jogo. Aí o botão Compartilhar libera: clica nele, escreve um resuminho do seu jogo, gera uma capa e publica. Pronto! O seu jogo ganhou um link só dele. Manda pros seus amigos, pra sua família, pra quem você quiser. Todo mundo vai poder jogar o jogo que você criou, do zero, bloquinho por bloquinho.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Se tiros ou asteroides já estiverem esperando ao começar, reveja as condições dos eventos e relógios.

## Teste final e acompanhamento

Teste o menu sem atirar nem gerar pedras. Comece com Enter. Confira derrota, Enter de volta ao início, zero ponto, três vidas e grupos vazios. Comece novamente e teste a vitória em 26 pontos. Se perder a última vida no mesmo quadro da meta, esta montagem termina em fim.

Quando estiver pronto, envie ao professor. Depois use Compartilhar, confira o que a janela pedir e publique quando desejar mostrar sua criação. Abra o link e teste se o jogo inicia. A entrega é registrada pela plataforma; publicação e qualidade do jogo são conferidas pelo professor. Não é necessário tornar seu perfil pessoal público. O projeto do Dia 5 será a base de O jogo do meu jeito.

- Crie a constante alvo = 26 em Ao iniciar.
- Vá para inicio em Ao iniciar.
- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Os corações também ficam dentro de Se jogando.
- Dentro do relógio de 40 quadros, crie asteroide só se a tela é jogando.
- Não deixe outro criador de asteroides fora da condição.
- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.
- No final da partida, se pontos ≥ alvo, vá para vitoria.
- Na partida, coloque a pergunta de vitória antes da pergunta de derrota.
- Se acabaram as vidas da nave, vá para fim, após a pergunta de vitória.
- No senão se inicio, encaixe Mostrar tela com a dica de Enter.
- No senão se vitoria, encaixe Mostrar tela com a dica de Enter.
- No senão se fim, encaixe Mostrar tela com a dica de Enter.
- Enter: inicio vai para jogando; fim e vitoria reiniciam e voltam ao início.
- O placar da variável fica na partida.
- A colisão que soma pontos fica na partida.
- A colisão que tira vida fica na partida.
- Dê 3 vidas à nave em Ao iniciar.

Os critérios verificam estrutura, valores e relações indicados; o professor confere o jogo rodando, legibilidade, som e resultado. Não prometer avaliação automática de toda a jogabilidade.

## Fecho e quiz

“Seu jogo agora tem começo, partida e dois finais. O Enter também permite voltar ao início e jogar outra vez. Confira a entrega e o Compartilhar quando estiver pronto. Você terminou a construção do seu primeiro jogo; faltam só duas ideias para guardar no quiz.”

**Você protegeu o desenho, mas os tiros nascem no menu. Onde falta a pergunta jogando?**

- Dentro do evento da barra de espaço, antes de criar o tiro. (correta)
- Na cor do título da tela de início.

O evento é independente do motor; sua ação também precisa da condição.

**Depois da derrota, Reiniciar executa Ao iniciar, que escolhe inicio. Para onde o jogo volta?**

- Para a abertura; Enter começa uma nova partida. (correta)
- Direto para uma partida com os pontos antigos.

Reiniciar refaz a preparação: zero ponto, três vidas, grupos novos e tela inicio.

## Decisões para edição e professor

- O Dia 5 tem carga maior. Separar pergunta, mudança da cadeia, guarda do relógio e guarda do disparo. Oferecer pausa após essas três proteções, retomando o mesmo rascunho.
- Incluir o Se jogando também no evento Espaço. Esta lacuna do original permite criar tiros e sons fora da partida.
- O Reiniciar roda Ao iniciar novamente. Como o último bloco escolhe inicio, há um retorno ao menu e depois outro Enter para jogar.
- Conservar a ordem vitória depois derrota no fim do motor: se ambas forem verdadeiras no mesmo quadro, fim prevalece. O roteiro e os testes explicitam essa regra.
- Constante significa que o valor não é alterado durante esta execução. O criador pode editar a meta em uma versão futura; essa edição não é tarefa deste dia.
- Configurar showcase.enabled apenas no Estúdio do Dia 5. O manifesto preserva a configuração do bloco existente; não inventa um novo comando de publicação.
- Não afirmar que o curso está publicado ou que vídeos estão editados. Os arquivos são autoria importável e mapa de produção.

## Destino de todo o roteiro original

- **Especificações:** Referência de formato e ritmo; a duração interativa é estimada separadamente. 
- **Abertura:** Recortar com as substituições e imagens indicadas. Clipes: video-abertura-v6.
- **Parte 1. Passo 1: o alvo e a primeira tela:** Recortar com as substituições e imagens indicadas. Clipes: video-telas-observar, video-alvo.
- **Parte 2. Passo 2: fazer a pergunta da tela "jogando":** Recortar com as substituições e imagens indicadas. Clipes: video-pergunta.
- **Parte 3. Passo 3: mudar o jogo pra dentro:** Recortar com as substituições e imagens indicadas. Clipes: video-mover-cadeia, video-guardar-jogo, video-guardar-relogio.
- **Parte 4. Passo 4: criar a vitória e a derrota:** Recortar com as substituições e imagens indicadas. Clipes: video-vitoria, video-derrota.
- **Parte 5. Passo 5: montar as telas de início, de vitória e de derrota:** Recortar com as substituições e imagens indicadas. Clipes: video-mostrar-telas.
- **Parte 6. Passo 6: o Enter comanda o jogo:** Recortar com as substituições e imagens indicadas. Clipes: video-guardar-tiro, video-enter.
- **Parte 7. Passo 7: testar do começo ao fim e publicar:** Recortar com as substituições e imagens indicadas. Clipes: video-ciclo-completo.
- **Fecho:** Recortar com as substituições e imagens indicadas. Clipes: video-fecho-v6.

Fonte preservada, SHA-256: 4752ff35745d17cd7df1473ed1da40f115a8437a87f3d1b455ecd2c27a1ceb7c. [Mapa de montagem](montagem.json) com âncoras textuais, falas novas e imagens. Os tempos ficam nulos até conferir a gravação. Cortes substituem falas; não concatenar toda a narração original com todos os complementos.
