# dia-4 — Pontos, vidas e tempo para escapar

**Entrada:** Retomar a chuva de asteroides e a colisão com os tiros do Dia 3.

**Resultado:** Cada acerto soma um ponto; a nave tem três vidas, perde vida ao bater e ganha proteção temporária.

**Tempo de percurso estimado:** 18–26 minutos. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.

A demonstração tem apenas vídeo, com pausa e repetição. O experimento é separado do projeto e tem uma comparação finita. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.

## Percurso

| Seção | O que aparece | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | Assistir | Retomar a chuva de asteroides e a colisão com os tiros do Dia 3. |
| 2. Observe o número e o placar | Observar | Separar guardar, alterar e mostrar um valor. |
| 3. Crie a memória dos pontos | Fazer no Estúdio | Preparar uma variável uma vez. |
| 4. Faça o acerto valer um ponto | Fazer no Estúdio | Somar por acerto dentro da colisão certa. |
| 5. Mostre o que está guardado | Fazer no Estúdio | Ler a variável no HUD a cada quadro. |
| 6. Dê três vidas à nave | Fazer no Estúdio | Preparar vida atual e máxima na inicialização. |
| 7. Compare três batidas bem próximas | Experimentar | Compreender a proteção temporária contra novos danos. |
| 8. Faça a nave sentir a batida | Fazer no Estúdio | Responder à colisão nave × asteroides com remoção e dano protegido. |
| 9. Mostre as vidas que restam | Fazer no Estúdio | Ler a vida da nave no desenho dos corações. |
| 10. Observe ponto e vida mudarem | Observar | Associar cada mudança à sua causa. |
| 11. Teste e envie sua construção | Entregar | Cada acerto soma um ponto; a nave tem três vidas, perde vida ao bater e ganha proteção temporária. |
| 12. Veja o que você construiu | Fechar | Cada acerto soma um ponto; a nave tem três vidas, perde vida ao bater e ganha proteção temporária. |
| 13. Hora do Desafio | Fechar | Reconhecer duas relações importantes desta aula. |

## Abertura

“Hoje o jogo vai lembrar seus acertos e mostrar quantas vidas a nave ainda tem. Você vai ver um placar subir e descobrir por que uma nave precisa de um respiro depois de levar uma batida.”

## Observe o número e o placar

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Separar guardar, alterar e mostrar um valor.

**Fala revisada / orientação:** “Pontos é uma caixinha com um número. Ela começa em zero. Um acerto soma um. O placar só lê o número que está guardado e mostra na tela. Mostrar o placar muitas vezes não deve somar mais pontos.”

**Imagem:** Caixa pontos e placar lado a lado. Uma colisão muda 0 para 1; dois quadros seguintes mostram 1. Não ensinar por um contador abstrato desconectado da colisão.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 1. Passo 1: criar e somar os pontos.

**Montagem:** Reaproveitar a analogia da caixinha. Acrescentar três imagens: guardar 0, acertar e guardar 1, desenhar 1 novamente sem somar.

**Trecho original antes da edição:** Hoje tem novidade grande: pela primeira vez a gente sai da categoria Jogo 2D. Pra guardar os pontos, o jogo precisa de uma memória, um lugarzinho que guarda um número. Isso se chama variável: uma caixinha com um nome e um número dentro, e esse número pode mudar o tempo todo.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Veja qual ação muda o número e qual apenas mostra o mesmo número.

## Crie a memória dos pontos

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Preparar uma variável uma vez.

**Fala revisada / orientação:** “Em Programação, Variáveis, coloque Criar variável no final de Ao iniciar. Nome pontos, valor 0. Este jogo começa com zero ponto; durante a partida, esse número vai mudar.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 1. Passo 1: criar e somar os pontos.

**Montagem:** Usar o gesto; trocar “todo jogo começa” por “este jogo começa”. Variáveis podem ter outros valores iniciais em outros projetos.

**Trecho original antes da edição:** Na categoria Programação, subcategoria Variáveis, pega o bloco Criar variável e encaixa dentro do Ao iniciar, logo abaixo do Criar grupo de sprites asteroides. Olha a cor dele: laranja! Os blocos de Programação são laranjas, e os de Jogo 2D são rosas. No nome da variável, escreve pontos. No valor, deixa 0, porque todo jogo começa com zero ponto.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Crie a variável pontos com 0 em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Faça o acerto valer um ponto

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Somar por acerto dentro da colisão certa.

**Fala revisada / orientação:** “Na colisão entre tiros e asteroides, coloque Somar em variável, de Programação, Variáveis, depois do som de explosão. Escolha pontos e deixe 1. A soma fica dentro dessa colisão, não solta no motor.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 1. Passo 1: criar e somar os pontos.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Agora vamos fazer essa caixinha crescer. Quando é que você marca ponto? Quando um tiro explode um asteroide. E onde isso acontece? Dentro daquele bloco de colisão de ontem. Vai até ele. Na categoria Programação, subcategoria Variáveis, pega o bloco Somar em variável e encaixa dentro do Para cada colisão, lá no finalzinho dele, logo depois do Tocar som de explosão. Onde está contador, selecione pontos. Pronto: cada asteroide destruído põe mais 1 na caixinha. Passo 1 pronto. Agora o segundo, que é mostrar o placar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Some 1 em pontos dentro da colisão tiros × asteroides.
- Mantenha um único Somar 1 em pontos.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Mostre o que está guardado

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Ler a variável no HUD a cada quadro.

**Fala revisada / orientação:** “Em Jogo 2D, Placar e HUD, coloque Mostrar placar abaixo da colisão. Texto Pontos:. No valor, encaixe valor da variável, de Programação, Valores, escolhendo pontos. Use x 12, y 30, tamanho 24 e uma cor clara para aparecer no fundo.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 2. Passo 2: mostrar o placar.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Os pontos já estão sendo contados, mas em segredo, dentro da caixinha. O jogador precisa ver o placar. Na categoria Jogo 2D, subcategoria Placar e HUD, pega o bloco Mostrar placar e encaixa dentro do A cada quadro do jogo, logo abaixo do bloco da colisão. Ah, e esse nome HUD que aparece na subcategoria é o jeito que os criadores de jogos chamam tudo o que fica desenhado por cima do jogo: o placar, os corações, os avisos. Você está montando o seu primeiro HUD. Agora configura ele. No textinho, deixa escrito Pontos:, que é o que aparece antes do número. O campo do valor já vem com um número, mas a gente não quer um número fixo: a gente quer mostrar o que está guardado dentro da caixinha dos pontos. Tem um bloco pra isso. Na categoria Programação, subcategoria Valores, pega o bloco valor da variável e arrasta ele pra cima do número do valor, até encaixar. E escolhe a variável pontos. Nos números do lugar, pode deixar x 12 e y 30, que é o cantinho de cima, à esquerda. A cor, escolhe uma que apareça bem com o fundo escuro, tipo branco. E no tamanho, deixa 24. Olha a tela! O placar apareceu: Pontos: 0. Clica na área do jogo e explode um asteroide... subiu pra 1! A caixinha e o placar estão conversando. Passo 2 pronto. Agora vamos pro terceiro, que é dar vidas pra nave e fazer a batida machucar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Mostre Pontos: lendo a variável pontos, em x 12, y 30, tamanho 24.

**Ajuda no mesmo objetivo:** Se o placar ficar sempre em zero, confira se o campo valor tem a leitura de pontos, em vez de um número 0.

## Dê três vidas à nave

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Preparar vida atual e máxima na inicialização.

**Fala revisada / orientação:** “Em Jogo 2D, Vida, coloque Dar ao sprite de vida em Ao iniciar, depois dos pontos. Escolha nave e 3. As vidas ficam preparadas uma vez; não coloque esse bloco no motor, ou ele devolveria as vidas o tempo todo.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 3. Passo 3: dar vidas à nave.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Até agora, os asteroides passam direto pela nave, sem machucar. Jogo sem perigo não tem emoção, né? Vamos resolver em duas partes: primeiro as vidas, depois a batida. Na categoria Jogo 2D, subcategoria Vida, pega o bloco Dar ao sprite de vida e encaixa dentro do Ao iniciar, logo abaixo do Criar variável pontos. Confere se o sprite é a nave, e deixa o número 3. Três vidas, como nos jogos clássicos. Passo 3 feito, a nave tem três vidas guardadas. Agora o quarto passo, que é fazer a batida machucar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Dê 3 vidas à nave em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Compare três batidas bem próximas

**Por que aqui:** A comparação isola novos danos sem exigir que a criança provoque três colisões rápidas no próprio jogo.

**Foco:** Compreender a proteção temporária contra novos danos.

**Fala revisada / orientação:** “Três pedras diferentes vão bater uma depois da outra. Compare a nave sem proteção e com 45 quadros de proteção. Cada pedra é retirada ao bater. Observe quantas vidas sobraram em cada teste.”

**Imagem:** Nave com três símbolos de coração e três batidas numeradas nos quadros 1, 6 e 11. Sem piscar ou tremer na atividade; número de vidas e rótulos comunicam o resultado.

**Controles:** Proteção de 0 quadros ou Proteção de 45 quadros; avançar os três passos de cada comparação. Só essas duas situações. Resultado fica guardado; ao terminar, controles se encerram. Não altera o Estúdio.

**Conclusão:** registrar as duas situações e acertar a pergunta externa ao quadro. Estado HTML é participação informada pelo cliente; a resposta é corrigida no servidor, sem alegar auditoria dos comandos.

**Pergunta:** Por que só a primeira batida tira vida durante a proteção?

**Resposta:** As próximas tentativas de dano são ignoradas por um tempo.. A proteção dura 45 quadros após o dano aceito. Depois desse tempo, outra batida pode tirar vida.

**Ajuda no mesmo objetivo:** As três pedras desaparecem nos dois testes. Compare somente a perda de vidas.

## Faça a nave sentir a batida

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Responder à colisão nave × asteroides com remoção e dano protegido.

**Fala revisada / orientação:** “Em Jogo 2D, Colisões, encaixe Para cada sprite do grupo que colidir com o sprite no motor, depois do placar. Grupo asteroides, sprite nave, apelido inimigo. Dentro: retire inimigo de asteroides; exploda inimigo; machuque nave em 1 com 45 quadros de proteção; trema a tela com intensidade 8.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 4. Passo 4: fazer a batida machucar.

**Montagem:** Manter a montagem. Corrigir a explicação da invencibilidade: o mesmo asteroide já foi removido, então o respiro protege de outras pedras que chegam logo depois. Manter a tremida breve da gravação, sem repetição automática.

**Trecho original antes da edição:** Agora, a batida. Lembra do bloco de ontem, que vigiava a colisão entre dois grupos? Hoje tem um parecido, que vigia um grupo e um sprite, que são os asteroides e a sua nave. Na categoria Jogo 2D, subcategoria Colisões, pega o bloco Para cada sprite do grupo que colidir com o sprite e encaixa dentro do A cada quadro do jogo, logo abaixo do Mostrar placar. Configura: o grupo é o asteroides, o sprite é a nave. E o apelido do encrenqueiro ele já dá: inimigo. E o que acontece na batida? Quatro coisas, na ordem. Primeiro, o asteroide que bateu some. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Tirar o sprite do grupo e encaixa dentro. Escolhe o sprite inimigo e o grupo asteroides. Depois, a explosão. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Soltar explosão no sprite, encaixa abaixo, e escolhe o sprite inimigo. Agora o machucado. Na categoria Jogo 2D, subcategoria Vida, pega o bloco Machucar o sprite e encaixa abaixo. Escolhe a nave e deixa o 1, que é quanto de vida a batida tira. E olha que legal o final desse bloco: e deixá-lo invencível por 45 quadros. Sabe quando o personagem leva um golpe e fica um tempinho piscando, sem poder ser machucado de novo? É isso. Sem essa invencibilidade, uma batida só podia tirar as 3 vidas de uma vez, porque a colisão acontece em vários quadros seguidos. Os 45 quadros são o respiro pra nave escapar. Deixa 45 mesmo. E pra fechar, o susto. Na categoria Jogo 2D, subcategoria Aparência, pega o bloco Tremer a tela com intensidade e encaixa por último. Deixa 8. Quando a nave bater, a tela treme inteira, e você sente a pancada. Passo 4 pronto. Agora o quinto, que é mostrar os corações.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Na colisão nave × asteroides, remova inimigo antes da explosão.
- Nessa colisão, tire 1 vida da nave, proteja por 45 quadros e trema a tela.
- A explosão da batida usa inimigo, antes de machucar a nave.

**Ajuda no mesmo objetivo:** inimigo é a pedra desta batida; nave é quem perde vida. Os blocos não devem trocar esses nomes.

## Mostre as vidas que restam

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Ler a vida da nave no desenho dos corações.

**Fala revisada / orientação:** “Em Jogo 2D, Vida, coloque Desenhar as vidas do sprite depois da batida, no motor. Escolha nave e corações. Use x 12, y 48 e tamanho 22. Deixe uma cor que apareça bem no fundo.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 5. Passo 5: mostrar os corações.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** As vidas existem, mas o jogador precisa ver quantas sobraram. E jogo mostra vida de um jeito clássico: coraçõezinhos. Na categoria Jogo 2D, subcategoria Vida, pega o bloco Desenhar as vidas do sprite e encaixa dentro do A cada quadro do jogo, logo abaixo do bloco da batida. Escolhe o sprite nave. No menuzinho do jeito de mostrar, deixa corações. No x, escreve 12, e no y, 48, pra ficar bem embaixo do placar. No tamanho, deixa 22. E a cor... vermelho de coração, né? Passo 5 pronto. Agora o melhor, o sexto passo, que é testar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Desenhe corações da nave em x 12, y 48, tamanho 22.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Observe ponto e vida mudarem

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Associar cada mudança à sua causa.

**Fala revisada / orientação:** “Acertou uma pedra com tiro: mais um ponto. Uma pedra bateu na nave: de três vidas para duas. Espere a proteção acabar; outra batida deixa uma vida. Quando as vidas chegam a zero, ainda falta ensinar o jogo a terminar. Vamos fazer isso no próximo dia.”

**Imagem:** Placar 0 → 1; corações 3 → 2; após proteção, 2 → 1. Cada mudança acompanhada de rótulo, sem depender apenas do som ou do vermelho.

**Fonte:** roteiro-aula-dia4-desafio-primeiro-jogo.md → Parte 6. Passo 6: hora de testar.

**Montagem:** Reaproveitar um acerto e uma batida. Corrigir a contagem: depois da segunda perda, sobra 1, não 2. Mostrar a espera antes da próxima batida.

**Trecho original antes da edição:** Clica na área do jogo. Olha o seu placar lá em cima e os três coraçõezinhos embaixo dele! Agora explode uns asteroides e vê os pontos subirem. E aí, faz uma coisa que quase nunca se pede num jogo: deixa um asteroide te acertar de propósito. Sentiu? Explosão, a tela tremeu, a nave ficou piscando invencível e um coração apagou. Leva mais uma batida... dois corações. O seu jogo agora tem o que ganhar e o que perder. Só falta uma coisa: quando os corações acabarem, nada acontece ainda. E quando os pontos chegarem lá no alto, também nada. Isso é assunto pra amanhã.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Se a segunda batida muito próxima não tira vida, pode ser a proteção funcionando.

## Teste final e acompanhamento

Destrua um asteroide e veja o placar subir uma vez. Deixe outra pedra bater na nave: devem sobrar duas vidas. Espere a proteção passar e observe outra perda. Confira contraste do placar e dos corações. Envie ao professor; a tela de derrota ainda não faz parte deste dia.

- Crie a variável pontos com 0 em Ao iniciar.
- Some 1 em pontos dentro da colisão tiros × asteroides.
- Mantenha um único Somar 1 em pontos.
- Mostre Pontos: lendo a variável pontos, em x 12, y 30, tamanho 24.
- Dê 3 vidas à nave em Ao iniciar.
- Na colisão nave × asteroides, remova inimigo antes da explosão.
- Nessa colisão, tire 1 vida da nave, proteja por 45 quadros e trema a tela.
- A explosão da batida usa inimigo, antes de machucar a nave.
- Desenhe corações da nave em x 12, y 48, tamanho 22.
- Na colisão tiros × asteroides, remova o tiro do grupo tiros.
- Na mesma colisão, remova o asteroide e então solte a explosão.
- Exploda o asteroide atingido e toque o som de explosão dentro da colisão.

Os critérios verificam estrutura, valores e relações indicados; o professor confere o jogo rodando, legibilidade, som e resultado. Não prometer avaliação automática de toda a jogabilidade.

## Fecho e quiz

“Agora os acertos ficam guardados nos pontos, e as batidas mudam as vidas. O placar e os corações mostram essas informações. No Dia 5, vamos usar esses valores para decidir vitória e derrota.”

**O placar foi redesenhado três vezes sem nenhum novo acerto. O que deve acontecer?**

- Continuar mostrando o mesmo número de pontos. (correta)
- Somar três pontos por ter sido desenhado três vezes.

Desenhar lê a variável; a colisão é que soma.

**Onde dar as três vidas iniciais à nave?**

- Em Ao iniciar. (correta)
- No motor, a cada quadro.

Preparar uma vez permite que as vidas diminuam durante a partida.

## Decisões para edição e professor

- Corrigir a contagem falada do teste original: 3 → 2 → 1, respeitando o intervalo de proteção.
- O asteroide da batida é retirado antes do dano; a proteção atende novos contatos, não a permanência daquela mesma pedra.
- Evitar “jogo sem perigo não tem emoção”: apresentar as vidas como regra escolhida para este jogo.
- A experiência não força animações de tremor ou piscar; o efeito breve no Estúdio é apenas um reforço. Vidas e resultados precisam ser legíveis sem ele.
- O professor deve distinguir somar por colisão de somar a cada quadro, e inicializar vida de restaurar vida continuamente.

## Destino de todo o roteiro original

- **Especificações:** Referência de formato e ritmo; a duração interativa é estimada separadamente. 
- **Abertura:** Recortar com as substituições e imagens indicadas. Clipes: video-abertura-v6.
- **Parte 1. Passo 1: criar e somar os pontos:** Recortar com as substituições e imagens indicadas. Clipes: video-memoria, video-pontos, video-somar.
- **Parte 2. Passo 2: mostrar o placar:** Recortar com as substituições e imagens indicadas. Clipes: video-placar.
- **Parte 3. Passo 3: dar vidas à nave:** Recortar com as substituições e imagens indicadas. Clipes: video-vida.
- **Parte 4. Passo 4: fazer a batida machucar:** Recortar com as substituições e imagens indicadas. Clipes: video-batida.
- **Parte 5. Passo 5: mostrar os corações:** Recortar com as substituições e imagens indicadas. Clipes: video-coracoes.
- **Parte 6. Passo 6: hora de testar:** Recortar com as substituições e imagens indicadas. Clipes: video-teste-vidas.
- **Fecho:** Recortar com as substituições e imagens indicadas. Clipes: video-fecho-v6.

Fonte preservada, SHA-256: 5920b27b0007ee632bd60f587f59ed06e48fa2167acd5115f5c385d30fc0db1a. [Mapa de montagem](montagem.json) com âncoras textuais, falas novas e imagens. Os tempos ficam nulos até conferir a gravação. Cortes substituem falas; não concatenar toda a narração original com todos os complementos.
