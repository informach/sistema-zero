# dia-3 — Asteroides chegam e os tiros acertam

**Entrada:** Retomar o Dia 2: nave controlada e tiros que sobem.

**Resultado:** Asteroides nascem em posições sorteadas, caem e podem ser destruídos pelos tiros.

**Tempo de percurso estimado:** 18–27 minutos. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.

A demonstração tem apenas vídeo, com pausa e repetição. O experimento é separado do projeto e tem uma comparação finita. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.

## Percurso

| Seção | O que aparece | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | Assistir | Retomar o Dia 2: nave controlada e tiros que sobem. |
| 2. Prepare o grupo das pedras | Fazer no Estúdio | Separar tiros e asteroides em grupos diferentes. |
| 3. Um relógio mais rápido cria mais? | Experimentar | Relacionar intervalo de nascimento com quantidade no mesmo período. |
| 4. Monte o relógio dos asteroides | Fazer no Estúdio | Criar uma repetição periódica separada do motor principal. |
| 5. Observe posição e velocidade | Observar | Distinguir y negativo de vy positivo e reconhecer o sorteio de x. |
| 6. Crie a pedra no relógio | Fazer no Estúdio | Configurar nascimento e movimento vertical do asteroide. |
| 7. Use o padrão que você já conhece | Fazer no Estúdio | Transferir o ciclo mover, retirar, desenhar para outro grupo. |
| 8. Observe quais dois objetos se encontraram | Observar | Distinguir o grupo inteiro dos dois objetos de uma colisão. |
| 9. Faça a colisão destruir os dois | Fazer no Estúdio | Responder à colisão entre os grupos a cada quadro. |
| 10. Observe um acerto e uma tentativa | Observar | Conferir que a colisão remove somente objetos que se encontram. |
| 11. Teste e envie sua construção | Entregar | Asteroides nascem em posições sorteadas, caem e podem ser destruídos pelos tiros. |
| 12. Veja o que você construiu | Fechar | Asteroides nascem em posições sorteadas, caem e podem ser destruídos pelos tiros. |
| 13. Hora do Desafio | Fechar | Reconhecer duas relações importantes desta aula. |

## Abertura

“Hoje seus tiros vão ter o que acertar. Vamos fazer os asteroides chegarem aos poucos e ensinar o jogo a perceber quando um tiro encontra uma pedra.”

## Prepare o grupo das pedras

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Separar tiros e asteroides em grupos diferentes.

**Fala revisada / orientação:** “Em Jogo 2D, Muitos, coloque outro Criar grupo de sprites no final de Ao iniciar. Deixe o nome asteroides. O grupo tiros continua lá: cada grupo cuida de um tipo de objeto.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 1. Passo 1: criar o grupo dos asteroides.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Lembra do grupo, o saquinho que guarda muitos sprites do mesmo tipo? Ontem a gente criou o dos tiros. Hoje precisamos de mais um, porque asteroide também vem em bando. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Criar grupo de sprites. Arrasta para dentro do Ao iniciar e encaixa logo abaixo do Criar grupo de sprites tiros. E dessa vez nem precisa trocar o nome: o bloco já vem escrito asteroides, que é exatamente o que a gente quer. Passo 1 pronto, esse foi rápido. Agora o segundo, que é montar o relógio da chuva.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Crie o grupo asteroides em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Um relógio mais rápido cria mais?

**Por que aqui:** Separar frequência de velocidade antes da montagem evita interpretar um número maior como chuva mais intensa.

**Foco:** Relacionar intervalo de nascimento com quantidade no mesmo período.

**Fala revisada / orientação:** “Compare nascer a cada 20 quadros e a cada 40 quadros. Nos dois testes, observe 120 quadros. A velocidade de queda fica igual. Conte quantas pedras nasceram em cada situação.”

**Imagem:** Contagem de quadros 0, 40, 80, 120 e fichas dos asteroides que nasceram. As fichas são um registro, não sprites acumulados no jogo.

**Controles:** Nascer a cada 20 quadros ou Nascer a cada 40 quadros; avançar os três passos de cada comparação. Só essas duas situações. Resultado fica guardado; ao terminar, controles se encerram. Não altera o Estúdio.

**Conclusão:** registrar as duas situações e acertar a pergunta externa ao quadro. Estado HTML é participação informada pelo cliente; a resposta é corrigida no servidor, sem alegar auditoria dos comandos.

**Pergunta:** Em 120 quadros, qual relógio cria mais asteroides?

**Resposta:** O de 20 quadros entre os nascimentos.. O intervalo de 20 cabe seis vezes em 120; o de 40 cabe três. Isso muda a frequência, não a velocidade de queda.

**Ajuda no mesmo objetivo:** Conte os nascimentos no mesmo total de quadros. Um intervalo menor se repete mais vezes.

## Monte o relógio dos asteroides

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Criar uma repetição periódica separada do motor principal.

**Fala revisada / orientação:** “Em Jogo 2D, Tempo e repetição, pegue A cada quadros e coloque 40. Ele fica em Enquanto estiver rodando, como vizinho do A cada quadro do jogo. Não encaixe um relógio dentro do outro.”

**Imagem:** Área Enquanto estiver rodando com dois contornos destacados: o motor principal e o relógio de 40 quadros. Mostrar a conexão de vizinhos e o espaço BODY do novo relógio.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 2. Passo 2: montar o relógio da chuva.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Agora pensa comigo: se nascesse um asteroide a cada quadro, ia ser uma avalanche, o céu ia entupir de pedra. A gente quer um de vez em quando. E existe um bloco pra isso. Na categoria Jogo 2D, subcategoria Tempo e repetição, pega o bloco A cada tantos quadros, aquele que tem um número no meio. Arrasta para dentro da área Enquanto estiver rodando e solta embaixo do A cada quadro do jogo. Atenção aqui: ele fica embaixo, não dentro, eles são como vizinhos. O motor do jogo pode ter vários relógios, e esse é um relógio mais lento. Escreve 40 no número dele. Isso quer dizer que a cada 40 quadros, o jogo faz o que estiver aqui dentro. Depois você vai poder mudar esse número: menor, chove mais. Maior, chove menos. Passo 2 pronto, o relógio está batendo. Agora o terceiro passo, que é criar o asteroide surpresa.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Use A cada 40 quadros como vizinho de A cada quadro do jogo.
- Os dois relógios são vizinhos em Enquanto estiver rodando.

**Ajuda no mesmo objetivo:** O motor não deve contornar o relógio de 40 quadros. Os dois pertencem diretamente à área de repetição.

## Observe posição e velocidade

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Distinguir y negativo de vy positivo e reconhecer o sorteio de x.

**Fala revisada / orientação:** “Este menos 30 é o lugar onde a pedra nasce: acima da tela. Já o vy 3 é a velocidade: faz a pedra descer. O x é sorteado quando ela nasce; não troca de lugar a cada quadro. Um sorteio também pode cair perto de outro.”

**Imagem:** Faixa superior externa ao retângulo da tela, y −30 marcado, seta de velocidade para baixo e dois sorteios possíveis de x. A passagem é observada sem controles.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 3. Passo 3: criar o asteroide surpresa.

**Montagem:** Recortar a explicação do x sorteado, y e vy. Substituir “lugar novo” por “posição sorteada”, pois resultados podem repetir. Mostrar caixa completa fora da área antes de entrar.

**Trecho original antes da edição:** Agora, o asteroide. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco No grupo criar um asteroide e encaixa dentro do A cada 40 quadros. Confere se o grupo é o asteroides. E onde ele nasce? Aqui vem um truque novo. Se todo asteroide nascesse no mesmo lugar, o jogo ficava fácil demais: era só ficar longe daquele ponto. Mas a gente quer surpresa. Na categoria Jogo 2D, subcategoria Mira e contas, pega o bloco um x aleatório na tela e arrasta ele pra cima do número que já vem no x, até encaixar. Aleatório quer dizer sorteado: cada vez, o jogo sorteia um lugar novo, e nem eu nem você sabemos onde a próxima pedra vai cair. No y, escreve menos 30. E olha que interessante: aqui o menos não é velocidade, é posição. Menos 30 é um pouquinho acima da tela, do lado de fora. O asteroide nasce escondidinho lá em cima e entra na tela caindo, bem natural. O tamanho, deixa 40. A cor, escolhe uma com cara de pedra, tipo um cinza. O vx deixa 0, porque ele não anda pros lados. E no vy, escreve 3. Positivo, sem o menos, porque o asteroide desce. Olha o truque de ontem aí: menos sobe, mais desce. Passo 3 pronto. Agora o quarto, que é fazer os asteroides caírem e sumirem.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** y responde “onde está?”; vy responde “como muda de altura?”.

## Crie a pedra no relógio

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Configurar nascimento e movimento vertical do asteroide.

**Fala revisada / orientação:** “Dentro do relógio, encaixe No grupo criar um asteroide, de Jogo 2D, Kit espaço. Grupo asteroides; no x, encaixe um x aleatório na tela, de Mira e contas. Use y menos 30, tamanho 40, vx 0 e vy 3. Escolha uma cor visível.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 3. Passo 3: criar o asteroide surpresa.

**Montagem:** Aproveitar a montagem dos campos; encurtar a explicação já demonstrada. O tamanho 40 é a base do kit: não prometer que toda pedra tem exatamente a mesma largura.

**Trecho original antes da edição:** Agora, o asteroide. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco No grupo criar um asteroide e encaixa dentro do A cada 40 quadros. Confere se o grupo é o asteroides. E onde ele nasce? Aqui vem um truque novo. Se todo asteroide nascesse no mesmo lugar, o jogo ficava fácil demais: era só ficar longe daquele ponto. Mas a gente quer surpresa. Na categoria Jogo 2D, subcategoria Mira e contas, pega o bloco um x aleatório na tela e arrasta ele pra cima do número que já vem no x, até encaixar. Aleatório quer dizer sorteado: cada vez, o jogo sorteia um lugar novo, e nem eu nem você sabemos onde a próxima pedra vai cair. No y, escreve menos 30. E olha que interessante: aqui o menos não é velocidade, é posição. Menos 30 é um pouquinho acima da tela, do lado de fora. O asteroide nasce escondidinho lá em cima e entra na tela caindo, bem natural. O tamanho, deixa 40. A cor, escolhe uma com cara de pedra, tipo um cinza. O vx deixa 0, porque ele não anda pros lados. E no vy, escreve 3. Positivo, sem o menos, porque o asteroide desce. Olha o truque de ontem aí: menos sobe, mais desce. Passo 3 pronto. Agora o quarto, que é fazer os asteroides caírem e sumirem.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- No relógio, crie asteroide com x sorteado, y −30, tamanho 40, vx 0 e vy 3.
- Mantenha um único comando de criar asteroide.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Use o padrão que você já conhece

**Por que aqui:** Reutilizar um padrão já dominado dá fluidez; não fragmentar em três vídeos para repetir o mesmo gesto.

**Foco:** Transferir o ciclo mover, retirar, desenhar para outro grupo.

**Fala revisada / orientação:** “No A cada quadro do jogo, abaixo do Desenhar grupo tiros, coloque Atualizar o grupo, Tirar do grupo quem sair da tela e Desenhar o grupo. Agora escolha asteroides nos três. Deixe o fazer da limpeza vazio. O padrão é o mesmo dos tiros.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 4. Passo 4: fazer os asteroides caírem e sumirem.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Essa parte você já conhece, porque é igualzinha à dos tiros. O motor precisa cuidar dos asteroides também: mover, fazer a faxina e desenhar. Dentro do A cada quadro do jogo, logo abaixo do Desenhar o grupo tiros, encaixa três blocos da subcategoria Muitos, igual a gente fez com os tiros, mas agora escolhendo o grupo asteroides em todos. Primeiro o Atualizar (mover) o grupo. Depois o Tirar do grupo quem sair da tela, com o espacinho de fazer vazio de novo. E por último o Desenhar o grupo. Viu como foi rápido? Quando a gente aprende um padrão, montar de novo é moleza. Isso é coisa de criador de verdade: usar o que já sabe pra construir mais rápido. E olha a tela do jogo: os asteroides já estão caindo do céu! Mas experimenta atirar num deles... o tiro atravessa direto, como um fantasma. O jogo ainda não sabe que os dois podem se bater. É isso que a gente resolve no quinto passo, que é explodir asteroide com tiro.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Mova asteroides antes de limpar o grupo.
- Retire os asteroides que saem e depois desenhe esse grupo.
- Desenhe o grupo asteroides a cada quadro.

**Ajuda no mesmo objetivo:** Se os tiros mudaram e as pedras não, confira qual grupo foi escolhido em cada bloco.

## Observe quais dois objetos se encontraram

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Distinguir o grupo inteiro dos dois objetos de uma colisão.

**Fala revisada / orientação:** “Há vários tiros e várias pedras, mas esta colisão tem dois participantes. Aqui dentro, tiro é o tiro que acertou, e asteroide é a pedra atingida. São esses dois que vamos retirar. Os outros continuam no jogo.”

**Imagem:** Congelar três tiros e três pedras, destacar um par, ligar às etiquetas tiro/asteroide e remover só esse par. Voltar ao jogo com os demais presentes.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 5. Passo 5: explodir asteroide com tiro.

**Montagem:** Aproveitar a explicação dos apelidos. Acrescentar congelamento de uma colisão com outros objetos ao redor. Não mover a colisão para Quando acontecer: este bloco verifica encontros em cada quadro.

**Trecho original antes da edição:** Quando dois objetos se encostam no jogo, isso tem nome: colisão. E existe um bloco que percebe todas as colisões entre dois grupos. Na categoria Jogo 2D, subcategoria Colisões, pega o bloco Para cada colisão entre os grupos e encaixa dentro do A cada quadro do jogo, logo abaixo do Desenhar o grupo asteroides. Agora configura ele: o primeiro grupo é o tiros, e o segundo é o asteroides. E repara numa coisa esperta: o bloco dá um apelido pra cada um que se bateu. O do grupo tiros ele chama de tiro, e o do grupo asteroides ele chama de asteroide. É como se ele dissesse: nessa trombada, o tiro foi esse aqui e o asteroide foi aquele ali. Assim, aqui dentro, a gente consegue mandar ordens certinhas pros dois que se bateram.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** tiros é o grupo; tiro é um participante daquele encontro.

## Faça a colisão destruir os dois

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Responder à colisão entre os grupos a cada quadro.

**Fala revisada / orientação:** “Em Jogo 2D, Colisões, coloque Para cada colisão entre os grupos no motor, depois de desenhar asteroides. Escolha tiros e asteroides, com apelidos tiro e asteroide. Dentro: retire tiro de tiros; retire asteroide de asteroides; solte explosão em asteroide; toque som de explosão.”

**Imagem:** Mostrar primeiro grupos e apelidos, depois os quatro encaixes no mesmo BODY. Destacar que a explosão usa a referência do asteroide atingido, mesmo depois de removido do grupo.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 5. Passo 5: explodir asteroide com tiro.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Quando dois objetos se encostam no jogo, isso tem nome: colisão. E existe um bloco que percebe todas as colisões entre dois grupos. Na categoria Jogo 2D, subcategoria Colisões, pega o bloco Para cada colisão entre os grupos e encaixa dentro do A cada quadro do jogo, logo abaixo do Desenhar o grupo asteroides. Agora configura ele: o primeiro grupo é o tiros, e o segundo é o asteroides. E repara numa coisa esperta: o bloco dá um apelido pra cada um que se bateu. O do grupo tiros ele chama de tiro, e o do grupo asteroides ele chama de asteroide. É como se ele dissesse: nessa trombada, o tiro foi esse aqui e o asteroide foi aquele ali. Assim, aqui dentro, a gente consegue mandar ordens certinhas pros dois que se bateram. E o que acontece quando o tiro acerta o asteroide? Quatro coisas, nessa ordem. Primeiro, o tiro some. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Tirar o sprite do grupo e encaixa dentro do Para cada colisão. Escolhe tiro no lugar do sprite e escolhe tiros no lugar do grupo. Depois, o asteroide some também. Pega mais um Tirar o sprite do grupo, na mesma subcategoria Muitos, e encaixa logo abaixo. Nesse, escolhe o sprite asteroide e o grupo asteroides. Agora a melhor parte: a explosão. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Soltar explosão no sprite e encaixa abaixo. Escolhe o sprite asteroide, que é onde a explosão acontece, e uma cor de fogo, tipo laranja. E pra fechar, o barulho. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Tocar som de explosão e encaixa por último. Passo 5 pronto. Agora o sexto passo, que é testar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Na colisão tiros × asteroides, remova o tiro do grupo tiros.
- Na mesma colisão, remova o asteroide e então solte a explosão.
- Exploda o asteroide atingido e toque o som de explosão dentro da colisão.

**Ajuda no mesmo objetivo:** Se todas as pedras somem, confira se usou Tirar o sprite do grupo, apontando para o apelido daquela colisão.

## Observe um acerto e uma tentativa

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Conferir que a colisão remove somente objetos que se encontram.

**Fala revisada / orientação:** “Um tiro que passa longe continua subindo. Um tiro que encontra um asteroide tira os dois e solta a explosão. Nesta aula, a nave ainda não perde vida quando uma pedra encosta nela. Isso vem no Dia 4.”

**Imagem:** Um disparo sem colisão e outro com colisão; contagem visual dos objetos retirados.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 6. Passo 6: hora de explodir.

**Montagem:** Usar os acertos do início; acrescentar um tiro que erra. Retirar novos testes com 20 e 80, já substituídos pela comparação isolada.

**Trecho original antes da edição:** Clica na área do jogo. Olha essa chuva de pedras! Agora mira num asteroide e aperta a barra de espaço. Bum! Explodiu de verdade, com barulho e tudo. Atira em mais alguns. Desvia dos que vêm na sua direção, acerta os que estão longe. Sente como o seu jogo já parece um jogo de verdade.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Se atravessar a pedra, confira a colisão dentro do motor, os dois grupos e o bloco que tira cada participante.

## Teste final e acompanhamento

Teste um tiro que erra e outro que acerta. No acerto, confira se só o tiro e a pedra envolvidos saem. Observe outras pedras chegando e saindo por baixo. Mantenha intervalo 40 e vy 3. Envie o projeto; ainda não é necessário desviar para preservar vidas.

- No evento Espaço: tiro com vx 0, vy −9 e depois som de tiro.
- Mantenha apenas um comando de criar tiro.
- Crie o grupo asteroides em Ao iniciar.
- Use A cada 40 quadros como vizinho de A cada quadro do jogo.
- Os dois relógios são vizinhos em Enquanto estiver rodando.
- No relógio, crie asteroide com x sorteado, y −30, tamanho 40, vx 0 e vy 3.
- Mantenha um único comando de criar asteroide.
- Mova asteroides antes de limpar o grupo.
- Retire os asteroides que saem e depois desenhe esse grupo.
- Desenhe o grupo asteroides a cada quadro.
- Na colisão tiros × asteroides, remova o tiro do grupo tiros.
- Na mesma colisão, remova o asteroide e então solte a explosão.
- Exploda o asteroide atingido e toque o som de explosão dentro da colisão.

Os critérios verificam estrutura, valores e relações indicados; o professor confere o jogo rodando, legibilidade, som e resultado. Não prometer avaliação automática de toda a jogabilidade.

## Fecho e quiz

“A chuva de asteroides já funciona, e os tiros conseguem destruí-los. Você usou um relógio para criar e uma colisão para responder ao encontro de dois objetos. Amanhã, cada acerto vai valer ponto.”

**O que muda quando o intervalo cai de 40 para 20 quadros?**

- Nascem mais asteroides no mesmo tempo. (correta)
- Cada asteroide passa a cair duas vezes mais rápido.

Intervalo controla nascimento; vy controla a queda.

**Dentro da colisão, quem é asteroide?**

- A pedra que participou daquele encontro. (correta)
- Todas as pedras do grupo ao mesmo tempo.

O apelido permite agir sobre o participante, preservando os outros.

## Decisões para edição e professor

- Não exigir que cada sorteio de x seja diferente. O runtime sorteia posição sem memória de resultados anteriores.
- O kit varia o tamanho real em torno da base 40. Não usar essa base como prova de largura idêntica de todos os asteroides.
- A limpeza não deve tirar asteroides que nasceram fora e ainda estão entrando. Isso será validado com o runtime real.
- A nave ainda não tem dano: retirar a sugestão de que desviar já é uma regra de sobrevivência. Pode mover para mirar.
- As colisões são comandos do motor, apesar de a fala usar “quando”. A categoria e o comportamento do bloco prevalecem sobre essa ambiguidade.

## Destino de todo o roteiro original

- **Especificações:** Referência de formato e ritmo; a duração interativa é estimada separadamente. 
- **Abertura:** Recortar com as substituições e imagens indicadas. Clipes: video-abertura-v6.
- **Parte 1. Passo 1: criar o grupo dos asteroides:** Recortar com as substituições e imagens indicadas. Clipes: video-grupo-asteroides.
- **Parte 2. Passo 2: montar o relógio da chuva:** Recortar com as substituições e imagens indicadas. Clipes: video-relogio.
- **Parte 3. Passo 3: criar o asteroide surpresa:** Recortar com as substituições e imagens indicadas. Clipes: video-nascer-fora, video-asteroide.
- **Parte 4. Passo 4: fazer os asteroides caírem e sumirem:** Recortar com as substituições e imagens indicadas. Clipes: video-ciclo-asteroides.
- **Parte 5. Passo 5: explodir asteroide com tiro:** Recortar com as substituições e imagens indicadas. Clipes: video-encontro, video-colisao.
- **Parte 6. Passo 6: hora de explodir:** Recortar com as substituições e imagens indicadas. Clipes: video-teste-colisao.
- **Fecho:** Recortar com as substituições e imagens indicadas. Clipes: video-fecho-v6.

Fonte preservada, SHA-256: 42f032a7ead97c237bcb82ed1b6a97405484801d4de4dc6e9d6598bc41446b55. [Mapa de montagem](montagem.json) com âncoras textuais, falas novas e imagens. Os tempos ficam nulos até conferir a gravação. Cortes substituem falas; não concatenar toda a narração original com todos os complementos.
