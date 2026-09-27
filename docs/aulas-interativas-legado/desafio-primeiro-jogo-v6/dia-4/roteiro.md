# dia-4 — Pontos, vidas e tempo para escapar

**Entrada:** Retomar a chuva de asteroides e a colisão com os tiros do Dia 3.

**Resultado:** Cada acerto soma um ponto; a nave tem três vidas, perde vida ao bater e ganha proteção temporária.

**Tempo de percurso estimado:** 18–26 minutos. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.

A demonstração é observação: o vídeo, com pausa e repetição, e às vezes uma cena que toca sozinha. A experimentação fica separada do projeto: uma cena em que a criança mexe e descobre ou, nos Dias 4 e 5, uma comparação curta em HTML. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.

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

**Conclusão:** o clipe tem pausa e repetição. Depois dele, na mesma seção, vem a cena abaixo, e é ela que conclui a seção.


**Ajuda no mesmo objetivo:** Veja qual ação muda o número e qual apenas mostra o mesmo número.

### A cena depois do clipe

**Cena:** `variable`, “Guardar, mudar e mostrar”. Formato: demonstração guiada (uma parte de cada vez, no ritmo da criança). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: nave e obstáculo: asteroide.

**O que a criança lê ao abrir:** “Veja o número mudar dentro da caixa antes de aparecer na tela.”

**Como o palco começa:** A caixa pontos ainda não existe.

**Antes de escolher:** “Nesta experiência, vamos observar uma caixa que guarda um número e muda durante o jogo.”

**Hoje vamos usar:** A caixa que guarda um número.

**Seu palpite, antes de abrir a cena (o de fábrica da cena; não vale nota):** “Imagine: a caixa pontos guarda 0. Um acerto soma 1, com Mostrar placar desligado. Quanto a caixa guarda?”

- 0, porque ninguém viu (se ela escolher esta, a tela conta depois: “O número da caixa mudou, mesmo sem aparecer na tela.”)
- 1 ✓ (o que acontece de verdade)

O palpite volta à tela quando ela descobre: “Mudou o valor sem estar na tela”.

**Partes da demonstração (o roteiro de fábrica da cena):**

1. “O jogo cria a caixa pontos e guarda 0.”
2. “Três acertos: a caixa vai para 3. A tela ainda não mostra nada.”
3. “Mostrar placar copia o 3 para a tela. A caixa continua 3.”

**No fim:** aparece “✓ Você viu tudo!” e o botão “Agora é sua vez”, que abre a bancada da cena a partir de onde a demonstração parou. É um rascunho local: o que a criança mexe ali não é guardado e não conta nota. A seção conclui quando a demonstração é vista até o fim.

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

**Fala revisada / orientação:** “Em Jogo 2D, Vida e placar, coloque Mostrar placar abaixo da colisão. Texto Pontos:. No valor, encaixe valor da variável, de Programação, Valores, escolhendo pontos. Use x 12, y 30, tamanho 24 e uma cor clara para aparecer no fundo.”

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

**Fala revisada / orientação:** “Em Jogo 2D, Vida e placar, coloque Dar ao sprite de vida em Ao iniciar, depois dos pontos. Escolha nave e 3. As vidas ficam preparadas uma vez; não coloque esse bloco no motor, ou ele devolveria as vidas o tempo todo.”

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

**Fala revisada / orientação:** “Em Jogo 2D, Vida e placar, coloque Desenhar as vidas do sprite depois da batida, no motor. Escolha nave e corações. Use x 12, y 48 e tamanho 22. Deixe uma cor que apareça bem no fundo.”

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

**Conclusão:** o clipe tem pausa e repetição. Depois dele, na mesma seção, vem a cena abaixo, e é ela que conclui a seção.


**Ajuda no mesmo objetivo:** Se a segunda batida muito próxima não tira vida, pode ser a proteção funcionando.

### A cena depois do clipe

**Cena:** `lives`, “O que a batida muda?”. Formato: demonstração guiada (uma parte de cada vez, no ritmo da criança). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: nave e obstáculo: asteroide.

**O que a criança lê ao abrir:** “Veja o que o acerto muda e o que a batida muda.”

**Como o palco começa:** 3 vidas e 0 pontos no placar.

**Antes de escolher:** “Nesta demonstração, vamos observar o que muda nas vidas e no placar quando a nave encosta em um asteroide.”

**Hoje vamos usar:** Vidas e placar.

**Seu palpite, antes de abrir a cena (escrito na aula; não vale nota):** “Imagine: a nave já tem 1 ponto e bate num asteroide. O que muda?”

- Só o coração ✓ (o que acontece de verdade)
- O placar e o coração (se ela escolher esta, a tela conta depois: “A batida não tirou nenhum ponto do placar.”)

O palpite volta à tela quando ela descobre: “Os pontos ficaram, mesmo perdendo vida”.

**Partes da demonstração (roteiro escrito na aula):**

1. “O tiro acertou um asteroide: o placar ganhou 1. Os corações não mudaram.”
2. “Um asteroide bateu na nave: saiu um coração. O placar continua 1.”
3. “Mais duas batidas: acabaram os corações e a partida. O placar guardou o 1.”

**No fim:** aparece “✓ Você viu tudo!” e o botão “Agora é sua vez”, que abre a bancada da cena a partir de onde a demonstração parou. É um rascunho local: o que a criança mexe ali não é guardado e não conta nota. A seção conclui quando a demonstração é vista até o fim.

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
- Na colisão entre tiros e asteroides, escolha explosão em Tocar efeito.
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
| Mover o sprite com as setas <- -> (velocidade ) | Jogo 2D › Movimento › Movimentos prontos | Move o sprite só na horizontal com as setas esquerda/direita. Combine com "prender o sprite na tela". |
| o centro x do sprite | Jogo 2D › Movimento › Posição e tamanho | O x do MEIO do sprite (já soma metade da largura). Ótimo pra atirar/mirar do centro da nave. |
| Manter o sprite dentro da tela | Jogo 2D › Movimento › Bordas e rebatidas | Impede o sprite de sair pelas bordas da tela (gruda na borda em vez de sumir). |
| Limpar a tela | Jogo 2D › Desenho e efeitos › Efeitos | Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo. |
| Criar grupo de sprites | Jogo 2D › Grupos › Criar e percorrer | Cria um grupo vazio para guardar MUITOS sprites do mesmo tipo (tiros, inimigos, estrelas). |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D › Kits prontos › Espaço | Cria uma nave desenhada (corpo + asas com as cores que você escolher, cabine e foguinho que pulsa sozinho). O foguinho já vem animado. |
| Machucar o sprite em e deixá-lo invencível por quadros | Jogo 2D › Vida e placar › Vida | Tira vida uma vez e ignora novos danos enquanto o sprite pisca. Evita perder todas as vidas num contato contínuo. |
| Desenhar o grupo | Jogo 2D › Grupos › Desenho e ordem | Desenha todos os sprites do grupo. Use a cada quadro, depois de mover. |
| Mostrar placar valor em x y cor tamanho | Jogo 2D › Vida e placar › Indicadores e texto na tela | Escreve "rótulo valor" (ex.: Pontos: 5) na tela. Ligue o valor à variável do placar. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| Desenhar as vidas do sprite como em x y tamanho cor | Jogo 2D › Vida e placar › Vida | Lê a vida do sprite automaticamente. Em corações, tamanho é o diâmetro; em barra, é a largura. |
| A cada quadros | Jogo 2D › Tempo › Quadros e intervalos | Roda o “fazer” de tempos em tempos, a cada N quadros. É uma raiz de “🔁 Enquanto estiver rodando”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”. |
| Soltar explosão no sprite cor | Jogo 2D › Desenho e efeitos › Partículas | Solta um jato de partículas (da cor escolhida + estilhaços cinza) no centro do sprite. |
| Para cada colisão entre os grupos e | Jogo 2D › Colisões › Encostar e bloquear | Para cada par de sprites (um de cada grupo) que se encostam, roda o "fazer" com os dois sprites. Use dentro do "a cada quadro". |
| Quando apertar a tecla | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que a tecla é apertada (ex.: pular, atirar). |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D › Colisões › Encostar e bloquear | Para cada sprite do grupo que encostar no seu sprite (ex.: a nave), roda o "fazer" com aquele sprite. Use dentro do "a cada quadro". |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| um x aleatório na tela | Jogo 2D › Sorteios › Números e posições | Sorteia uma posição x em qualquer lugar da largura da tela. Ótimo para um sprite nascer num x aleatório (asteroides, estrelas…). |
| Tirar o sprite do grupo | Jogo 2D › Grupos › Participação e limpeza | Tira um sprite do grupo (ex.: o asteroide que foi atingido). Use o nome do sprite da vez. |
| Dar ao sprite de vida | Jogo 2D › Vida e placar › Vida | Define a vida atual e a vida máxima do sprite. Coloque em “Ao iniciar” para não restaurar a vida a cada quadro. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Tremer a tela com intensidade | Jogo 2D › Desenho e efeitos › Efeitos | Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão. |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D › Kits prontos › Espaço | Cria um asteroide já desenhado (pedra irregular que gira, com crateras) e coloca no grupo. Cada um nasce com um formato único. |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D › Grupos › Criar e percorrer | Cria um tiro (bolinha brilhante) no grupo, no ponto x/y, indo na velocidade vx/vy (vy negativo = sobe). |
| a posição y do sprite | Jogo 2D › Movimento › Posição e tamanho | A posição y (borda de cima) do sprite. Use numa conta ou pra posicionar outra coisa. |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu de estrelas que rola para baixo (fundo de jogo espacial). Use no começo do "a cada quadro", depois de limpar a tela. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Criar variável com valor | Programação › 🏷️ Variáveis | Cria uma variável e guarda nela um valor: número, conta, aleatório, etc. |
| Somar em variável | Programação › 🏷️ Variáveis | Soma ou tira uma quantidade do valor atual de uma variável. |
| Número | Programação › 🔣 Valores | Um valor numérico. |
| valor da variável | Programação › 🔣 Valores | Usa o conteúdo de uma variável já criada como valor. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
