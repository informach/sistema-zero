# dia-3 — Asteroides chegam e os tiros acertam

**Entrada:** Retomar o Dia 2: nave controlada e tiros que sobem.

**Resultado:** Asteroides nascem em posições sorteadas, caem e podem ser destruídos pelos tiros.

**Tempo de percurso estimado:** 18–27 minutos. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.

A demonstração é observação: o vídeo, com pausa e repetição, e às vezes uma cena que toca sozinha. A experimentação fica separada do projeto: uma cena em que a criança mexe e descobre ou, nos Dias 4 e 5, uma comparação curta em HTML. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.

## Percurso

| Seção | O que aparece | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | Assistir | Retomar o Dia 2: nave controlada e tiros que sobem. |
| 2. Prepare o grupo das pedras | Fazer no Estúdio | Separar tiros e asteroides em grupos diferentes. |
| 3. Abra espaço entre os asteroides | Experimentar | Distinguir nascer em cada quadro de nascer no ritmo de um relógio. |
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

**Fala revisada / orientação:** “Em Jogo 2D, Grupos, coloque outro Criar grupo de sprites no final de Ao iniciar. Deixe o nome asteroides. O grupo tiros continua lá: cada grupo cuida de um tipo de objeto.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 1. Passo 1: criar o grupo dos asteroides.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Lembra do grupo, o saquinho que guarda muitos sprites do mesmo tipo? Ontem a gente criou o dos tiros. Hoje precisamos de mais um, porque asteroide também vem em bando. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Criar grupo de sprites. Arrasta para dentro do Ao iniciar e encaixa logo abaixo do Criar grupo de sprites tiros. E dessa vez nem precisa trocar o nome: o bloco já vem escrito asteroides, que é exatamente o que a gente quer. Passo 1 pronto, esse foi rápido. Agora o segundo, que é montar o relógio da chuva.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Crie o grupo asteroides em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Abra espaço entre os asteroides

**Por que aqui:** Ver a parede de asteroides que nasce em todo quadro, antes de montar o relógio, mostra para que ele serve.

**Foco:** Distinguir nascer em cada quadro de nascer no ritmo de um relógio.

**Cena:** `spawn`, “Abra espaço entre os asteroides”. Formato: experimentação (a criança mexe e descobre). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: nave e obstáculo: asteroide.

**O que a criança lê ao abrir:** “Aperte ▶ Tempo e veja quantos asteroides nascem. Depois leve Criar asteroide para dentro do relógio e compare.”

**Como o palco começa:** Ainda não nasceu nenhum asteroide.

**Antes de escolher:** “Nesta experiência, vamos observar de onde os obstáculos surgem enquanto o jogo está rodando.”

**Hoje vamos usar:** O nascimento dos obstáculos.

**Seu palpite, antes de abrir a cena (o de fábrica da cena; não vale nota):** “Criando um asteroide em CADA quadro, como fica a tela?”

- Uma parede de asteroides ✓ (o que acontece de verdade)
- Asteroides bem espaçados (se ela escolher esta, a tela conta depois: “Em um segundo nasceram asteroides colados uns nos outros.”)

O palpite volta à tela quando ela descobre: “Viu a parede de asteroides”.

**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):

1. Pedido: “Com Criar asteroide em A cada quadro, deixe o tempo passar um segundo inteiro.” Ao descobrir: “Viu a parede de asteroides”.
2. Pedido: “Leve Criar asteroide para dentro do relógio e deixe o tempo passar até nascerem dois asteroides.” Ao descobrir: “Com o relógio, sobrou espaço entre os asteroides”.

**Frase de sucesso:** “Com o relógio, nasce um asteroide de cada vez e sobra espaço entre um asteroide e outro!”

**Pistas (uma por vez, no botão Uma pista; as de fábrica da cena):**

1. “Veja quantos asteroides nascem enquanto o tempo passa.”
2. “Compare o mesmo tempo com e sem o relógio.”
3. “Leve Criar asteroide para dentro do relógio e deixe o tempo passar até nascerem dois asteroides.”

**Pergunta depois de descobrir (escrita na aula; conta para concluir):** “Por que virou uma parede de asteroides sem o relógio?”

- Porque os asteroides ficaram lentos e se amontoaram.
- Porque o pedido de criar acontece em todo quadro. ✓ (correta)

**Explicação que ela lê ao acertar:** “Sem um relógio para segurar, o pedido de criar acontece em todo quadro, e os asteroides nascem colados.”

**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.

## Monte o relógio dos asteroides

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Criar uma repetição periódica separada do motor principal.

**Fala revisada / orientação:** “Em Jogo 2D, Tempo › Quadros e intervalos, pegue A cada quadros e coloque 40. Ele fica em Enquanto estiver rodando, como vizinho do A cada quadro do jogo. Não encaixe um relógio dentro do outro.”

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

**Imagem:** Faixa superior externa ao retângulo da tela, y −30 marcado, seta de velocidade para baixo e dois sorteios possíveis de x. No clipe, a passagem é observada sem controles; a cena da seção vem depois.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 3. Passo 3: criar o asteroide surpresa.

**Montagem:** Recortar a explicação do x sorteado, y e vy. Substituir “lugar novo” por “posição sorteada”, pois resultados podem repetir. Mostrar caixa completa fora da área antes de entrar.

**Trecho original antes da edição:** Agora, o asteroide. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco No grupo criar um asteroide e encaixa dentro do A cada 40 quadros. Confere se o grupo é o asteroides. E onde ele nasce? Aqui vem um truque novo. Se todo asteroide nascesse no mesmo lugar, o jogo ficava fácil demais: era só ficar longe daquele ponto. Mas a gente quer surpresa. Na categoria Jogo 2D, subcategoria Mira e contas, pega o bloco um x aleatório na tela e arrasta ele pra cima do número que já vem no x, até encaixar. Aleatório quer dizer sorteado: cada vez, o jogo sorteia um lugar novo, e nem eu nem você sabemos onde a próxima pedra vai cair. No y, escreve menos 30. E olha que interessante: aqui o menos não é velocidade, é posição. Menos 30 é um pouquinho acima da tela, do lado de fora. O asteroide nasce escondidinho lá em cima e entra na tela caindo, bem natural. O tamanho, deixa 40. A cor, escolhe uma com cara de pedra, tipo um cinza. O vx deixa 0, porque ele não anda pros lados. E no vy, escreve 3. Positivo, sem o menos, porque o asteroide desce. Olha o truque de ontem aí: menos sobe, mais desce. Passo 3 pronto. Agora o quarto, que é fazer os asteroides caírem e sumirem.

**Conclusão:** o clipe tem pausa e repetição. Depois dele, na mesma seção, vem a cena abaixo, e é ela que conclui a seção.


**Ajuda no mesmo objetivo:** y responde “onde está?”; vy responde “como muda de altura?”.

### A cena depois do clipe

**Cena:** `velocity`, “O que move a pedra a cada quadro”. Formato: demonstração guiada (uma parte de cada vez, no ritmo da criança). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: pedra.

**O que a criança lê ao abrir:** “São dois números diferentes: o y diz ONDE a pedra está agora, e a velocidade diz quanto a pedra anda em cada quadro.”

**Como o palco começa:** A pedra está em x 240, y −30, com velocidade 0 para o lado e 0 para baixo.

**Caso preparado na aula:** a cena não parte do começo de fábrica: 5 ações preparam o palco antes de a criança entrar, e a frase acima já mostra o resultado.

**Antes de escolher:** “Nesta demonstração, vamos acompanhar como a velocidade para baixo muda o número y de uma pedra.”

**Hoje vamos usar:** A velocidade para baixo.

**Seu palpite, antes de abrir a cena (escrito na aula; não vale nota):** “Com a velocidade para baixo em 3, o que acontece com o y da pedra a cada quadro?”

- O y aumenta ✓ (o que acontece de verdade)
- O y diminui (se ela escolher esta, a tela conta depois: “Com a velocidade para baixo em 3, o número do y ficou maior.”)

O palpite volta à tela quando ela descobre: “Velocidade positiva levou para baixo”.

**Partes da demonstração (roteiro escrito na aula):**

1. “A pedra nasce em y −30, na faixa fora da tela. Quem joga ainda não vê a pedra.”
2. “Velocidade para baixo 3: a cada quadro o y aumenta 3, até a pedra chegar na borda da tela.” A parte espera acontecer: “Velocidade positiva levou para baixo”.
3. “Velocidade 0: a pedra para onde chegou.” A parte espera acontecer: “Com velocidade zero, a pedra fica parada”.

**No fim:** aparece “✓ Você viu tudo!” e o botão “Agora é sua vez”, que abre a bancada da cena a partir de onde a demonstração parou. É um rascunho local: o que a criança mexe ali não é guardado e não conta nota. A seção conclui quando a demonstração é vista até o fim.

## Crie a pedra no relógio

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Configurar nascimento e movimento vertical do asteroide.

**Fala revisada / orientação:** “Dentro do relógio, encaixe No grupo criar um asteroide, de Jogo 2D, Kits prontos › Espaço. Grupo asteroides; no x, encaixe um x aleatório na tela, de Sorteios. Use y menos 30, tamanho 40, vx 0 e vy 3. Escolha uma cor visível.”

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

**Fala revisada / orientação:** “Em Jogo 2D, Colisões, coloque Para cada colisão entre os grupos no motor, depois de desenhar asteroides. Escolha tiros e asteroides, com apelidos tiro e asteroide. Dentro: retire tiro de tiros; retire asteroide de asteroides; solte explosão em asteroide; use Tocar efeito, na família Som, e escolha explosão.”

**Imagem:** Mostrar primeiro grupos e apelidos, depois os quatro encaixes no mesmo BODY. Destacar que a explosão usa a referência do asteroide atingido, mesmo depois de removido do grupo.

**Fonte:** roteiro-aula-dia3-desafio-primeiro-jogo.md → Parte 5. Passo 5: explodir asteroide com tiro.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Quando dois objetos se encostam no jogo, isso tem nome: colisão. E existe um bloco que percebe todas as colisões entre dois grupos. Na categoria Jogo 2D, subcategoria Colisões, pega o bloco Para cada colisão entre os grupos e encaixa dentro do A cada quadro do jogo, logo abaixo do Desenhar o grupo asteroides. Agora configura ele: o primeiro grupo é o tiros, e o segundo é o asteroides. E repara numa coisa esperta: o bloco dá um apelido pra cada um que se bateu. O do grupo tiros ele chama de tiro, e o do grupo asteroides ele chama de asteroide. É como se ele dissesse: nessa trombada, o tiro foi esse aqui e o asteroide foi aquele ali. Assim, aqui dentro, a gente consegue mandar ordens certinhas pros dois que se bateram. E o que acontece quando o tiro acerta o asteroide? Quatro coisas, nessa ordem. Primeiro, o tiro some. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Tirar o sprite do grupo e encaixa dentro do Para cada colisão. Escolhe tiro no lugar do sprite e escolhe tiros no lugar do grupo. Depois, o asteroide some também. Pega mais um Tirar o sprite do grupo, na mesma subcategoria Muitos, e encaixa logo abaixo. Nesse, escolhe o sprite asteroide e o grupo asteroides. Agora a melhor parte: a explosão. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Soltar explosão no sprite e encaixa abaixo. Escolhe o sprite asteroide, que é onde a explosão acontece, e uma cor de fogo, tipo laranja. E pra fechar, o barulho. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Tocar som de explosão e encaixa por último. Passo 5 pronto. Agora o sexto passo, que é testar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Na colisão entre tiros e asteroides, escolha explosão em Tocar efeito.
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

**⚠️ Mostra a cena anterior:** A orientação de edição corta os testes com 20 e 80 quadros porque a comparação isolada já mostraria intervalos diferentes. Essa comparação em HTML virou a cena spawn, que compara nascer em todo quadro com nascer no relógio e deixa escolher o tempo do relógio em segundos, não em quadros. Ação: conferir.

**Trecho original antes da edição:** Clica na área do jogo. Olha essa chuva de pedras! Agora mira num asteroide e aperta a barra de espaço. Bum! Explodiu de verdade, com barulho e tudo. Atira em mais alguns. Desvia dos que vêm na sua direção, acerta os que estão longe. Sente como o seu jogo já parece um jogo de verdade.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Se atravessar a pedra, confira a colisão dentro do motor, os dois grupos e o bloco que tira cada participante.

## Teste final e acompanhamento

Teste um tiro que erra e outro que acerta. No acerto, confira se só o tiro e a pedra envolvidos saem. Observe outras pedras chegando e saindo por baixo. Mantenha intervalo 40 e vy 3. Envie o projeto; ainda não é necessário desviar para preservar vidas.

- No evento Espaço, use Tocar efeito e escolha tiro.
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
- Na colisão entre tiros e asteroides, escolha explosão em Tocar efeito.
- Na colisão tiros × asteroides, remova o tiro do grupo tiros.
- Na mesma colisão, remova o asteroide e então solte a explosão.
- Exploda o asteroide atingido e toque o som de explosão dentro da colisão.

Os critérios verificam estrutura, valores e relações indicados; o professor confere o jogo rodando, legibilidade, som e resultado. Não prometer avaliação automática de toda a jogabilidade.

## Fecho e quiz

“A chuva de asteroides já funciona, e os tiros conseguem destruí-los. Você usou um relógio para criar e uma colisão para responder ao encontro de dois objetos. Amanhã, cada acerto vai valer ponto.”

**Na cena, o relógio esperava 2 segundos entre um asteroide e outro. Você troca para meio segundo. O que muda?**

- Nascem mais asteroides no mesmo tempo. (correta)
- Cada asteroide passa a cair mais rápido.

O relógio só decide de quanto em quanto tempo nasce um asteroide: esperando menos, nascem mais no mesmo tempo. Quem faz cada um descer é o vy.

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
| Desenhar o grupo | Jogo 2D › Grupos › Desenho e ordem | Desenha todos os sprites do grupo. Use a cada quadro, depois de mover. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| A cada quadros | Jogo 2D › Tempo › Quadros e intervalos | Roda o “fazer” de tempos em tempos, a cada N quadros. É uma raiz de “🔁 Enquanto estiver rodando”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”. |
| Soltar explosão no sprite cor | Jogo 2D › Desenho e efeitos › Partículas | Solta um jato de partículas (da cor escolhida + estilhaços cinza) no centro do sprite. |
| Para cada colisão entre os grupos e | Jogo 2D › Colisões › Encostar e bloquear | Para cada par de sprites (um de cada grupo) que se encostam, roda o "fazer" com os dois sprites. Use dentro do "a cada quadro". |
| Quando apertar a tecla | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que a tecla é apertada (ex.: pular, atirar). |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| um x aleatório na tela | Jogo 2D › Sorteios › Números e posições | Sorteia uma posição x em qualquer lugar da largura da tela. Ótimo para um sprite nascer num x aleatório (asteroides, estrelas…). |
| Tirar o sprite do grupo | Jogo 2D › Grupos › Participação e limpeza | Tira um sprite do grupo (ex.: o asteroide que foi atingido). Use o nome do sprite da vez. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D › Kits prontos › Espaço | Cria um asteroide já desenhado (pedra irregular que gira, com crateras) e coloca no grupo. Cada um nasce com um formato único. |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D › Grupos › Criar e percorrer | Cria um tiro (bolinha brilhante) no grupo, no ponto x/y, indo na velocidade vx/vy (vy negativo = sobe). |
| a posição y do sprite | Jogo 2D › Movimento › Posição e tamanho | A posição y (borda de cima) do sprite. Use numa conta ou pra posicionar outra coisa. |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu de estrelas que rola para baixo (fundo de jogo espacial). Use no começo do "a cada quadro", depois de limpar a tela. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Número | Programação › 🔣 Valores | Um valor numérico. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
