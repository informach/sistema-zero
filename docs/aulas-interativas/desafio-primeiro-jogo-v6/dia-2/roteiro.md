# dia-2 — O tiro nasce na nave e sobe

**Entrada:** Retomar a entrega do Dia 1, com nave, estrelas e setas funcionando.

**Resultado:** Tiros saem da posição atual da nave, sobem com som e são retirados ao sair da tela.

**Tempo de percurso estimado:** 16–24 minutos. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.

A demonstração tem apenas vídeo, com pausa e repetição. O experimento é separado do projeto e tem uma comparação finita. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.

## Percurso

| Seção | O que aparece | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | Assistir | Retomar a entrega do Dia 1, com nave, estrelas e setas funcionando. |
| 2. Prepare o grupo dos tiros | Fazer no Estúdio | Usar um grupo para cuidar de vários tiros. |
| 3. Escute a barra de espaço | Fazer no Estúdio | Criar uma resposta a uma tecla específica. |
| 4. Observe de onde o tiro sai | Observar | Distinguir número fixo de leitura da posição atual. |
| 5. Encaixe o endereço da nave no tiro | Fazer no Estúdio | Ler centro x e posição y ao criar o tiro. |
| 6. Compare o sinal da velocidade | Experimentar | Descobrir o que o sinal de vy muda. |
| 7. Configure o disparo e seu som | Fazer no Estúdio | Criar velocidade vertical e som no evento. |
| 8. Mova, retire e desenhe os tiros | Fazer no Estúdio | Aplicar um mesmo ciclo ao grupo inteiro. |
| 9. Observe o teste de dois disparos | Observar | Conferir a origem do tiro em duas posições. |
| 10. Teste e envie sua construção | Entregar | Tiros saem da posição atual da nave, sobem com som e são retirados ao sair da tela. |
| 11. Veja o que você construiu | Fechar | Tiros saem da posição atual da nave, sobem com som e são retirados ao sair da tela. |
| 12. Hora do Desafio | Fechar | Reconhecer duas relações importantes desta aula. |

## Abertura

“Sua nave já voa. Hoje você vai apertar espaço e ver um tiro sair dela, mesmo quando estiver em outro lugar da tela. Vamos ensinar o jogo a criar, mover e mostrar esses tiros.”

## Prepare o grupo dos tiros

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Usar um grupo para cuidar de vários tiros.

**Fala revisada / orientação:** “Em Jogo 2D, Muitos, coloque Criar grupo de sprites no final de Ao iniciar. Troque o nome para tiros. O grupo começa vazio; cada disparo vai colocar um tiro nele.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia2-desafio-primeiro-jogo.md → Parte 1. Passo 1: criar o grupo dos tiros.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Ontem a gente criou a nave, que é uma só. Mas tiro é diferente: você vai disparar um monte deles, um atrás do outro. Pra isso existe o grupo, que é como um saquinho que guarda vários sprites do mesmo tipo juntos. Em vez de mandar uma ordem pra cada tiro, a gente manda uma ordem pro saquinho inteiro. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Criar grupo de sprites. Arrasta ele para dentro do Ao iniciar e encaixa logo abaixo do Criar nave. Repara que o bloco já vem com um nome escrito, asteroides. Clica nesse nome e troca para tiros, porque esse é o grupo dos nossos tiros. Prontinho: o jogo agora tem um saquinho esperando os tiros que você vai disparar. Passo 1 pronto. Agora vamos pro segundo, que é montar a área que escuta o teclado.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Crie o grupo tiros em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Escute a barra de espaço

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Criar uma resposta a uma tecla específica.

**Fala revisada / orientação:** “Em Áreas do projeto, coloque Quando acontecer. Dentro, encaixe Quando apertar a tecla, de Jogo 2D, Controles, e escolha barra de espaço. Esse é o evento que vai responder ao disparo.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia2-desafio-primeiro-jogo.md → Parte 2. Passo 2: a área que escuta o teclado.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Lembra que no primeiro dia a gente montou duas áreas, a Ao iniciar e a Enquanto estiver rodando? Hoje entra a terceira. Ela se chama Quando acontecer, e é a área que fica de ouvido em pé, esperando alguma coisa acontecer no jogo, tipo você apertar uma tecla. Na categoria Áreas do projeto, pega o bloco Quando acontecer, arrasta e solta ao lado das outras duas áreas, com um espacinho. Agora a gente coloca o ouvido dentro dela. Na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla e encaixa dentro da área Quando acontecer. Tá vendo que esse bloco tem um menu de teclas? Clica nele e escolhe a barra de espaço. Isso quer dizer o seguinte: quando o jogador apertar a barra de espaço, o jogo faz tudo o que estiver aqui dentro. E isso tem até nome chique: evento. Uma coisa acontece, e o jogo responde na hora. Todo jogo que você já jogou funciona assim, cheio de eventos esperando a vez deles. Passo 2 pronto. Agora vem o terceiro, o mais esperado de todos, que é fazer o tiro nascer na nave.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Em Quando acontecer, coloque Quando apertar a tecla: barra de espaço.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Observe de onde o tiro sai

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Distinguir número fixo de leitura da posição atual.

**Fala revisada / orientação:** “Veja a nave primeiro à esquerda e depois à direita. Se eu guardar um x fixo para o tiro, ele nasce no mesmo lugar. Se eu ler o centro x da nave na hora do disparo, ele acompanha a nave. A posição y diz a altura de onde ele sai.”

**Imagem:** Dois disparos com nave em posições diferentes. Mostrar marcador centro x e topo y da caixa. A posição é consultada em cada evento, sem atualizar tiros já disparados.

**Fonte:** roteiro-aula-dia2-desafio-primeiro-jogo.md → Parte 3. Passo 3: fazer o tiro nascer na nave.

**Montagem:** Reaproveitar a explicação de ler a nave e acrescentar duas posições. Trocar a promessa de sair exatamente da pontinha visual por “alinhado com o centro e na altura de cima da caixa”.

**Trecho original antes da edição:** Agora vamos dizer onde o tiro nasce. Ele tem que sair da nave, né? Repara que o campo do x já vem com um número dentro. A gente vai trocar esse número por um bloco mais esperto. Na categoria Jogo 2D, subcategoria Posição e tamanho, pega o bloco o centro x do sprite e arrasta ele pra cima do número do x, até dar aquele clique de encaixe. E seleciona a nave nele. Isso quer dizer: o tiro nasce alinhado com o meio da nave, não importa onde ela esteja. No y, mesma coisa. Na categoria Jogo 2D, subcategoria Posição e tamanho, pega o bloco a posição y do sprite e arrasta pra cima do número do y, e seleciona a nave. Assim o tiro nasce na altura da nave, bem na pontinha dela.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** O tiro novo acompanha a origem da nave; o que já saiu segue seu próprio caminho.

## Encaixe o endereço da nave no tiro

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Ler centro x e posição y ao criar o tiro.

**Fala revisada / orientação:** “Dentro do evento de espaço, encaixe Criar tiro no grupo, de Jogo 2D, Muitos, e escolha tiros. Em Posição e tamanho, pegue o centro x do sprite e a posição y do sprite. Encaixe no x e no y do tiro e escolha nave nos dois. Raio 5; escolha uma cor visível.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia2-desafio-primeiro-jogo.md → Parte 3. Passo 3: fazer o tiro nascer na nave.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Criar tiro no grupo e encaixa dentro do Quando apertar a tecla. Confere se o grupo escolhido é o tiros. Agora vamos dizer onde o tiro nasce. Ele tem que sair da nave, né? Repara que o campo do x já vem com um número dentro. A gente vai trocar esse número por um bloco mais esperto. Na categoria Jogo 2D, subcategoria Posição e tamanho, pega o bloco o centro x do sprite e arrasta ele pra cima do número do x, até dar aquele clique de encaixe. E seleciona a nave nele. Isso quer dizer: o tiro nasce alinhado com o meio da nave, não importa onde ela esteja. No y, mesma coisa. Na categoria Jogo 2D, subcategoria Posição e tamanho, pega o bloco a posição y do sprite e arrasta pra cima do número do y, e seleciona a nave. Assim o tiro nasce na altura da nave, bem na pontinha dela. Agora mais dois números do Criar tiro. O raio é o tamanho da bolinha do tiro: deixa 5. E a cor você escolhe, capricha. Passo 3 pronto, o tiro já sabe onde nascer. Agora o quarto passo, que é dar velocidade e som pra ele.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Dentro de Espaço, crie o tiro usando centro x e posição y da nave.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Compare o sinal da velocidade

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Descobrir o que o sinal de vy muda.

**Fala revisada / orientação:** “Os dois tiros começam no mesmo lugar. Compare vy menos 9 e vy mais 9. Avance os passos e observe o número y e a direção. Só o sinal mudou; o vx continua zero.”

**Imagem:** Dois percursos verticais, origem marcada e leituras de y; sequência manual ampliada de 10 quadros por passo.

**Controles:** vy = −9 ou vy = +9; avançar os três passos de cada comparação. Só essas duas situações. Resultado fica guardado; ao terminar, controles se encerram. Não altera o Estúdio.

**Conclusão:** registrar as duas situações e acertar a pergunta externa ao quadro. Estado HTML é participação informada pelo cliente; a resposta é corrigida no servidor, sem alegar auditoria dos comandos.

**Pergunta:** Qual vy faz o tiro subir?

**Resposta:** vy = −9.. Subir diminui o y. A velocidade negativa produz essa diminuição.

**Ajuda no mesmo objetivo:** O topo da tela tem valores menores de y. Veja em qual teste o y diminui.

## Configure o disparo e seu som

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Criar velocidade vertical e som no evento.

**Fala revisada / orientação:** “No Criar tiro, deixe vx 0 e vy menos 9. Em Jogo 2D, Kit espaço, pegue Tocar som de tiro e coloque logo abaixo, dentro do evento. Assim o som acontece quando você dispara, e não a cada quadro.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia2-desafio-primeiro-jogo.md → Parte 4. Passo 4: a velocidade e o som do tiro.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Faltam dois números no Criar tiro, e eles são novidade: o vx e o vy. Eles são a velocidade do tiro. O vx é a velocidade pros lados, e o vy é a velocidade pra cima e pra baixo. O nosso tiro não anda pros lados, então deixa o vx em 0. E no vy, escreve menos 9. Opa, número negativo? É um truque dos jogos: na tela, o menos manda pra cima e o mais manda pra baixo. Como o tiro sobe, ele leva o menos 9. Lembra desse truque, que a gente ainda vai usar ele de novo. E pra fechar com estilo, o som. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Tocar som de tiro e encaixa logo abaixo do Criar tiro, ainda dentro do Quando apertar a tecla. Agora cada disparo vai ter aquele som de nave espacial. Passo 4 pronto. Mas se você apertar espaço agora, ainda não vai ver nada, porque o jogo ainda não desenha os tiros. Bora resolver isso no quinto passo, que é colocar o motor pra fazer os tiros voarem.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- No evento Espaço: tiro com vx 0, vy −9 e depois som de tiro.
- Mantenha apenas um comando de criar tiro.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Mova, retire e desenhe os tiros

**Por que aqui:** Os três comandos formam um único padrão: mover, retirar, desenhar. Reunir evita três conferências pequenas sem uma observação nova.

**Foco:** Aplicar um mesmo ciclo ao grupo inteiro.

**Fala revisada / orientação:** “No motor, abaixo de Desenhar nave, coloque três blocos de Jogo 2D, Muitos: Atualizar o grupo, Tirar do grupo quem sair da tela e Desenhar o grupo. Escolha tiros nos três. O fazer da limpeza fica vazio hoje.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia2-desafio-primeiro-jogo.md → Parte 5. Passo 5: fazer os tiros voarem pela tela.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Lembra do nosso motor, o A cada quadro do jogo? É ele que dá vida pra tudo. Agora a gente ensina ele a cuidar dos tiros também. Vão ser três blocos, um atrás do outro, encaixados embaixo do Desenhar o sprite nave. O primeiro faz os tiros andarem. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Atualizar (mover) o grupo e encaixa embaixo do Desenhar o sprite nave. Escolhe o grupo tiros. É ele que empurra cada tiro pra cima, usando aquela velocidade que a gente configurou. O segundo é uma faxina. Pensa comigo: o tiro sobe, sai da tela... e aí? Se ninguém tirar ele do jogo, ele continua existindo lá em cima, invisível, ocupando espaço à toa. Com o tempo, isso deixa o jogo pesado e lento. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Tirar do grupo quem sair da tela e encaixa logo abaixo do Atualizar. Escolhe o grupo tiros. Ele joga fora, sozinho, todo tiro que escapar da tela. O espacinho de fazer que vem nele pode ficar vazio, a gente não precisa dele hoje. E o terceiro mostra os tiros na tela. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Desenhar o grupo, encaixa abaixo do Tirar do grupo, e escolhe o grupo tiros. Passo 5 pronto, o motor agora cuida dos tiros. E chegou a hora da verdade, o sexto passo, que é testar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Mova tiros antes de limpar o grupo.
- Retire os tiros que saem e depois desenhe esse grupo.
- Desenhe o grupo tiros a cada quadro.

**Ajuda no mesmo objetivo:** Se houver tiros no grupo mas nada aparecer, confira Desenhar o grupo. Se ficarem parados, confira Atualizar.

## Observe o teste de dois disparos

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Conferir a origem do tiro em duas posições.

**Fala revisada / orientação:** “Clique no jogo. Vá para a esquerda e atire. Depois vá para a direita e atire de novo. Os dois tiros nascem na nave e sobem. Deixe vy menos 9 para a próxima aula.”

**Imagem:** A mesma nave em dois pontos da tela; um disparo por posição; observar a saída por cima.

**Fonte:** roteiro-aula-dia2-desafio-primeiro-jogo.md → Parte 6. Passo 6: hora de atirar.

**Montagem:** Usar o primeiro teste de posições. Retirar alterações para −15 e convites de brincar com valores.

**Trecho original antes da edição:** Clica na área do jogo e aperta a barra de espaço. Olha isso! O tiro saiu da nave, subiu e ainda fez barulho. Aperta mais vezes. Anda com as setas pra um lado, atira, anda pro outro, atira de novo. Viu como o tiro sempre nasce certinho no bico da nave? É o bloco do centro x trabalhando: onde a nave estiver, é de lá que o tiro sai.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** O evento precisa apontar para Espaço; o grupo dos três comandos precisa ser tiros.

## Teste final e acompanhamento

No seu projeto, faça um disparo à esquerda e outro à direita. Confira origem, subida, som e desaparecimento dos tiros fora da tela. Mantenha raio 5, vx 0 e vy −9. Envie a construção; ela será o começo do Dia 3.

- Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.
- Crie o grupo tiros em Ao iniciar.
- No evento Espaço: tiro com vx 0, vy −9 e depois som de tiro.
- Mantenha apenas um comando de criar tiro.
- Mova tiros antes de limpar o grupo.
- Retire os tiros que saem e depois desenhe esse grupo.
- Desenhe o grupo tiros a cada quadro.

Os critérios verificam estrutura, valores e relações indicados; o professor confere o jogo rodando, legibilidade, som e resultado. Não prometer avaliação automática de toda a jogabilidade.

## Fecho e quiz

“Agora cada disparo nasce na sua nave. O evento cria; o motor move, faz a limpeza e desenha o grupo. No Dia 3, chegam os asteroides para você acertar.”

**A nave mudou de lugar. O que mantém o tiro novo alinhado com ela?**

- Ler o centro x da nave na hora do disparo. (correta)
- Usar sempre o número 400 no x do tiro.

Ler o sprite acompanha sua posição atual; um número fixo continua igual.

**O tiro saiu por cima. Por que retirá-lo do grupo?**

- Para não continuar atualizando um objeto que já foi embora. (correta)
- Para apagar a nave também.

A limpeza cuida dos tiros que saíram, sem apagar a nave nem os tiros que ainda estão visíveis.

## Decisões para edição e professor

- A posição y do sprite é o topo da caixa. Não prometer coincidência exata com a ponta da arte do kit.
- Criar tiros usa a posição atual da nave a cada evento. Isso não faz um tiro já criado perseguir a nave.
- O som é testado após uma interação do jogador; a qualidade e audibilidade continuam na revisão do professor.
- Não transformar a comparação de sinal em menu livre de velocidade, cor e quantidade. A cor pode ser escolhida durante a construção.

## Destino de todo o roteiro original

- **Especificações:** Referência de formato e ritmo; a duração interativa é estimada separadamente. 
- **Abertura:** Recortar com as substituições e imagens indicadas. Clipes: video-abertura-v6.
- **Parte 1. Passo 1: criar o grupo dos tiros:** Recortar com as substituições e imagens indicadas. Clipes: video-grupo-tiros.
- **Parte 2. Passo 2: a área que escuta o teclado:** Recortar com as substituições e imagens indicadas. Clipes: video-espaco.
- **Parte 3. Passo 3: fazer o tiro nascer na nave:** Recortar com as substituições e imagens indicadas. Clipes: video-origem, video-criar-tiro.
- **Parte 4. Passo 4: a velocidade e o som do tiro:** Recortar com as substituições e imagens indicadas. Clipes: video-velocidade-som.
- **Parte 5. Passo 5: fazer os tiros voarem pela tela:** Recortar com as substituições e imagens indicadas. Clipes: video-ciclo-tiros.
- **Parte 6. Passo 6: hora de atirar:** Recortar com as substituições e imagens indicadas. Clipes: video-testar.
- **Fecho:** Recortar com as substituições e imagens indicadas. Clipes: video-fecho-v6.

Fonte preservada, SHA-256: f86024679543a69d6ac450ee09f6985e2275921c0bf72eb876eec1220036f5e9. [Mapa de montagem](montagem.json) com âncoras textuais, falas novas e imagens. Os tempos ficam nulos até conferir a gravação. Cortes substituem falas; não concatenar toda a narração original com todos os complementos.
