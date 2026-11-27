# Passo a passo do projeto · Patrulha Espacial

Depois de Nave Contra Asteroides, você vai levar a mesma ideia para uma rota com profundidade. Monte os disparos, o surgimento dos asteroides, os limites, os acertos, os pontos, as vidas e as decisões de resultado. As investigações da Ilha vão ajudar a entender as três direções e o contato de verdade. Este guia mostra onde procurar os blocos, onde encaixar e como testar cada conquista. Consulte a parte que precisar e volte ao seu jogo.

## Aula 1. Da tela ao espaço

### Conheça a Patrulha Espacial

Experimentar o jogo completo e reconhecer a nova rota em três dimensões.

1. Clique no jogo e pressione Enter.
2. Use as setas esquerda e direita para mover a nave. Cada aperto de Espaço dispara um laser.
3. Acerte 20 asteroides antes de perder as três vidas. Uma pedra que passa sem bater não tira vida.
4. No resultado, clique em Voltar ao início. Na abertura, Enter começa outra partida.

**Teste no jogo:**

- Experimente a versão completa; não é preciso vencer para seguir.

### Seu passo a passo do projeto

Conhecer o caderno de consulta e os caminhos de ajuda da plataforma.

1. Consulte o Passo a passo do projeto quando precisar de um bloco, de um encaixe ou de um teste.
2. Se quiser guardar o PDF, clique em Baixar.
3. Use os links do Como fazer para dúvidas sobre a plataforma e Preciso de ajuda para pedir orientação sobre o jogo.

### Investigue as três direções

Relacionar x, y e z ao lado, à altura e à profundidade antes de posicionar o laser.

1. Investigue as três direções na Ilha com o Zappy.
2. Compare cada mudança separadamente e pense em qual direção o laser da Patrulha vai viajar.

### Um aperto, um laser

Criar uma cópia do laser ao apertar Espaço, somente durante a partida.

1. Em Quando acontecer, deixe um espaço livre visível. Em Jogo 3D → Controles, pegue Quando apertar a tecla e coloque dentro da área.
2. No campo da tecla, escolha espaço (pular).
3. Dentro de Quando apertar a tecla espaço, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
4. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
5. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
6. Deixe o então do Se visível. Em Jogo 3D → Grupos, encaixe Criar uma cópia de no grupo em x y z nesse então.
7. Escolha moldeTiro e tiros. Deixe X = 0, Y = 1 e Z = -1.6.
8. Deixe o encaixe abaixo da cópia visível. Em Jogo 3D → Som, encaixe Tocar nota abaixo dela. Use frequência 880 Hz e duração 60 ms.

**Teste no jogo:**

- Rodar de novo. Antes de Enter, Espaço não cria laser.
- Depois de Enter, um aperto de Espaço cria um laser parado e toca uma nota curta.
- Mova a nave para o lado; o primeiro laser permanece perto do centro.

### O laser nasce na nave

Usar a posição X atual da nave como origem lateral de cada disparo.

1. Em Quando acontecer, encontre a cópia do moldeTiro no evento Espaço e deixe o campo X visível.
2. Em Jogo 3D → Objetos → Posição, giro e tamanho, pegue posição x do objeto e solte sobre o 0 do X dessa cópia.
3. No bloco de posição, use eixo x e objeto nave. Conserve Y = 1 e Z = -1.6 na cópia.

**Teste no jogo:**

- Rodar de novo → Enter. Mova para a direita, solte e aperte Espaço: o laser nasce no X atual da nave.
- Mova para a esquerda e aperte Espaço outra vez: o novo laser nasce no novo X. Os lasers anteriores não acompanham a nave.

### O laser segue para o fundo

Escolher a velocidade negativa em Z para o grupo de tiros.

1. Em Ao iniciar, encontre Criar variável velocidadeTiros com valor 0.
2. Troque apenas o valor 0 por -22. Conserve o nome velocidadeTiros.

**Teste no jogo:**

- Rodar de novo → Enter. Mova a nave e aperte Espaço: o laser viaja para o fundo, pelo Z negativo.
- Aperte e solte Espaço mais de uma vez. Cada aperto cria um novo laser.

### O laser tem um fim de caminho

Retirar do grupo os lasers que ultrapassaram os limites de profundidade.

1. Em Enquanto estiver rodando → A cada quadro da cena → Se estado = jogando, deixe visível o último encaixe do então, depois dos percursos.
2. Em Jogo 3D → Grupos, pegue No grupo inimigos, tirar quem saiu e encaixe no final desse então.
3. Escolha grupo tiros, limites -36 e 3 e eixo Z.

**Teste no jogo:**

- Antes de Enter, Espaço não dispara.
- Depois de Enter, mova e dispare. O laser nasce no X da nave e segue para o fundo.
- Espere pelo menos dois segundos. Verificar projeto também confere que o laser saiu do grupo; ele não apenas ficou fora da imagem.

## Aula 2. Asteroides na rota

### O ritmo dos asteroides

Comparar nascer em todo quadro com nascer a cada intervalo, antes de montar o relógio.

1. Compare quantas pedras nascem com intervalos diferentes.
2. Observe as descobertas com o Zappy e compare o que acontece.

### Um asteroide a cada intervalo

Usar um intervalo para criar asteroides somente durante a partida.

1. Em Enquanto estiver rodando, deixe visível o encaixe depois de A cada quadro da cena, fora do fazer desse bloco.
2. Em Jogo 3D → Tempo e sorteio → Tempo, pegue A cada 2 segundos e encaixe nesse lugar. Troque 2 por 1.5.
3. Dentro de A cada 1.5 segundos, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
4. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
5. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
6. Deixe o então do Se visível. Em Jogo 3D → Grupos, encaixe Criar uma cópia nesse então.
7. Escolha moldeAsteroide e grupo asteroides. Use x = 0, y = 1 e z = -28.

**Teste no jogo:**

- Rodar de novo. Espere dois segundos antes de Enter: não deve surgir asteroide.
- Pressione Enter e espere dois segundos. Aparece uma pedra parada no centro do fundo.
- As cópias seguintes ainda se sobrepõem; isso é esperado nesta etapa.

### Uma faixa para as entradas

Montar a expressão fornecida que sorteia o X dentro da faixa lateral da patrulha.

1. No relógio A cada 1.5 segundos, deixe visível o X da cópia de moldeAsteroide.
2. Em Programação → Matemática, pegue 0 + 0 e solte sobre o 0 do X. Mude + para − e o número direito para 5.2.
3. Deixe visível o 0 à esquerda da subtração. Pegue outro 0 + 0 e solte sobre esse 0.
4. No bloco de dentro, mude + para × e o número direito para 10.4.
5. Deixe visível o 0 à esquerda da multiplicação. Em Programação → Valores, pegue número aleatório (0 a 1) e solte sobre esse 0.
6. Confira X = (número aleatório × 10.4) − 5.2, Y = 1 e Z = -28.

**Teste no jogo:**

- Rodar de novo → Enter. Espere sete segundos para observar algumas entradas.
- Os asteroides surgem parados em lugares diferentes dentro da faixa lateral. Lugares próximos também são possíveis.

### Os asteroides vêm até a nave

Definir a velocidade positiva em Z para aproximar os asteroides.

1. Em Ao iniciar, encontre Criar variável velocidadeAsteroides com valor 0.
2. Troque 0 por 7. Não mude velocidadeTiros, que continua -22.

**Teste no jogo:**

- Rodar de novo → Enter. As pedras aparecem no fundo e se aproximam da nave pelo Z positivo.
- Dispare: o laser e o asteroide viajam em direções opostas.
- Afaste a nave e deixe uma pedra passar. Nesta etapa, ela ainda continua além da rota.

### A pedra sai depois de passar

Retirar asteroides que ultrapassam o fim da rota, conservando o intervalo dos tiros.

1. No final de A cada quadro da cena → Se estado = jogando, encontre o limite do grupo tiros.
2. Deixe o encaixe abaixo dele visível. Em Jogo 3D → Grupos, encaixe outro No grupo inimigos, tirar quem saiu.
3. No novo bloco, escolha grupo asteroides, limites -36 e 6 e eixo Z. Conserve o limite dos tiros em -36 a 3.

**Teste no jogo:**

- Rodar de novo → Enter. As pedras surgem na faixa, aproximam-se e saem depois de passar pela nave.
- Dispare; os lasers seguem no sentido contrário e também terminam o caminho.
- Um laser ainda pode atravessar a pedra sem removê-la. O contato será construído na aula seguinte.

## Aula 3. Acertar no espaço

### Parecer junto ou encostar?

Distinguir sobreposição da imagem e contato real entre objetos em três dimensões.

1. Investigue o encontro da chave e do personagem com o Zappy.
2. Compare a altura e a separação dos objetos antes de concluir que encostaram.

### Um encontro que acerta

Responder ao contato entre um tiro e um asteroide, retirando os dois e consumindo o alvo.

1. Em A cada quadro da cena → Se estado = jogando, encontre Para cada asteroide → Para cada tiro → Se valor da variável alvoAtivo. Deixe o então desse último Se visível.
2. Em Programação → Lógica & Se, encaixe um novo Se nesse então. Retire a pergunta x > 0 pela lixeira.
3. Deixe o lugar da pergunta visível. Em Jogo 3D → Encostar → Encostar, encaixe o objeto jogador está encostando em. Escolha tiro no primeiro objeto e asteroide no segundo.
4. No então do contato, encaixe Jogo 3D → Grupos → Tirar o objeto inimigo do grupo. Escolha objeto asteroide e grupo asteroides.
5. Logo abaixo, encaixe outro Tirar o objeto inimigo do grupo. Escolha objeto tiro e grupo tiros.
6. Abaixo da retirada do tiro, encaixe Programação → Variáveis → Alterar variável contador para. Escolha alvoAtivo.
7. Troque o 1 por Programação → Lógica & Se → verdadeiro/falso e escolha falso.
8. Abaixo de Alterar variável alvoAtivo, encaixe Jogo 3D → Som → Tocar o som pronto. Conserve moeda.

**Teste no jogo:**

- Rodar de novo → Enter. Alinhe a nave com uma pedra e dispare. No contato real, só esse tiro e essa pedra saem dos grupos.
- Dispare numa faixa vazia. Sem contato, o laser continua o caminho.
- Ainda não existe placar; o som e o desaparecimento do par são o resultado visível desta parte.

### Um lugar para guardar os pontos

Criar o contador pontos com valor zero no início de cada jogo.

1. Em Ao iniciar, deixe visível o encaixe abaixo de Criar variável velocidadeAsteroides e antes de estado.
2. Em Programação → Variáveis, pegue Criar variável contador com valor e encaixe nesse lugar.
3. Troque o nome contador por pontos e conserve o valor 0.

**Teste no jogo:**

- Confira o nome pontos e o valor 0 em Ao iniciar.
- Nenhum placar novo aparece nesta etapa. O efeito é preparar a variável.

### Cada acerto soma um

Somar um ponto dentro da mesma resposta que consome o par acertado.

1. No então do contato tiro–asteroide, deixe visível o encaixe depois de Tirar o objeto tiro do grupo tiros e antes de Alterar variável alvoAtivo.
2. Em Programação → Variáveis, encaixe Somar 1 em variável nesse lugar.
3. Conserve a quantidade 1 e escolha a variável pontos.

**Teste no jogo:**

- Confira a soma dentro do então do contato, entre a retirada do tiro e alvoAtivo = falso.
- Não espere um placar visível ainda: esta etapa muda o valor guardado.

### Veja a contagem na tela

Mostrar o zero inicial e atualizar o placar com a variável pontos em cada acerto.

1. Em Ao iniciar, deixe visível o encaixe abaixo do título em cima, no meio. Em Jogo 3D → Placar, vida e telas → Na tela, encaixe Escrever na tela.
2. Escolha em cima, à direita e escreva o texto Acertos: 0 / 20.
3. No então do contato tiro–asteroide, deixe visível o encaixe depois de Tocar o som pronto moeda. Encaixe outro Escrever na tela e escolha em cima, à direita.
4. Deixe o texto do segundo aviso visível. Em Programação → Matemática, solte 0 + 0 sobre esse texto.
5. No 0 da esquerda, encaixe outro 0 + 0.
6. No 0 à esquerda do mais interno, encaixe Programação → Valores → texto. Escreva Acertos: com um espaço no fim.
7. No 0 à direita do mais interno, encaixe valor da variável e escolha pontos.
8. No 0 à direita do mais externo, encaixe outro texto. Escreva espaço, /, espaço, 20. A expressão fica ("Acertos: " + pontos) + " / 20".

**Teste no jogo:**

- Rodar de novo: o placar começa em Acertos: 0 / 20.
- Depois de Enter, acerte uma pedra: o placar soma exatamente um.
- Um disparo no vazio e uma pedra que passa não alteram o placar.
- Acerte outra pedra e confirme a próxima soma.

### O que faz o ponto valer?

Explicar as regras usando os testes do próprio jogo.



## Aula 4. Três chances na patrulha

### Três chances para a nave

Dar três vidas à nave no começo e observar os corações nativos.

1. Em Ao iniciar, deixe visível o encaixe depois de Criar variável estado e antes dos textos das telas finais.
2. Em Jogo 3D → Placar, vida e telas → Vida, pegue Dar 3 de vida a e encaixe nesse lugar.
3. Conserve a quantidade 3 e escolha o objeto nave.

**Teste no jogo:**

- Rodar de novo: aparecem três corações no alto, à esquerda.
- Enter começa a partida. O jogo ainda não desconta vida no contato; essa regra vem na próxima parte.

### Um respiro depois da batida

Observar a proteção curta depois de um dano, antes de programar a batida na patrulha.

1. Compare uma batida com e sem o respiro de proteção.
2. Observe as descobertas com o Zappy e compare o que acontece.

### A batida tira uma vida

Usar o encontro da nave com um grupo para descontar uma vida durante a partida.

1. Em Quando acontecer, deixe visível o encaixe depois de Quando apertar a tecla espaço, fora do fazer dele.
2. Em Jogo 3D → Encostar → Encostar, encaixe Quando heroi encostar em algum do grupo nesse lugar.
3. Escolha objeto nave e grupo asteroides. No campo chamando de, escreva asteroideQueBateu, com Q e B maiúsculos.
4. Dentro de Quando nave encostar em algum do grupo asteroides, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
5. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
6. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
7. Deixe o então da guarda visível. Em Jogo 3D → Placar, vida e telas → Vida, encaixe Machucar heroi tirando 1 de vida. Escolha nave e conserve a quantidade 1.
8. Deixe o encaixe abaixo de Machucar visível. Em Jogo 3D → Som, encaixe Tocar o som pronto e escolha acerto.

**Teste no jogo:**

- Rodar de novo → Enter. Sem disparar, alinhe a nave com uma pedra que se aproxima.
- No contato, a vida cai de três para dois e a nave pisca brevemente.
- A pedra ainda segue o caminho nesta etapa. A proteção nativa evita novo desconto durante um segundo.

### Só a pedra da batida sai

Consumir o asteroide identificado pelo encontro antes de descontar a vida.

1. No encontro da nave com o grupo asteroides, deixe visível o começo do então de Se estado = jogando.
2. Em Jogo 3D → Grupos, encaixe Tirar o objeto inimigo do grupo antes de Machucar nave.
3. Escolha objeto asteroideQueBateu e grupo asteroides. Conserve Machucar nave tirando 1 de vida e Tocar o som pronto acerto logo abaixo.

**Teste no jogo:**

- Rodar de novo → Enter. Uma batida retira a pedra envolvida e desconta uma vida.
- Desvie de outra pedra e deixe-a passar: ela não tira vida.
- Acerte uma pedra com um laser: o ponto sobe e a vida permanece igual.
- Se chegar a zero, esta versão ainda não mostra derrota; a regra será construída na aula seguinte.

## Aula 5. Uma patrulha completa

### Quando as vidas acabam

Conferir vida zero no começo do quadro e acionar estado de derrota e fim de jogo.

1. Em Enquanto estiver rodando → A cada quadro da cena, deixe visível o começo do fazer, antes do Se que movimenta o jogo.
2. Dentro de A cada quadro da cena, antes do Se de movimento, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
3. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
4. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
5. Confira que o Se de movimento continua depois do novo, fora do então. Deixe o então do novo Se estado = jogando visível.
6. Em Programação → Lógica & Se, encaixe outro Se nesse então.
7. No x da pergunta nova, encaixe Jogo 3D → Placar, vida e telas → Vida → a vida de. Escolha nave, use ≤ e conserve 0 à direita.
8. No então da vida, encaixe Programação → Variáveis → Alterar variável contador para. Escolha estado.
9. Deixe o valor 1 visível. Em Programação → Valores, solte texto sobre ele e escreva derrota.
10. Abaixo da mudança de estado, encaixe Jogo 3D → Placar, vida e telas → Na tela → Escrever na tela. Escolha embaixo, no meio e deixe o texto vazio.
11. Abaixo do aviso vazio, encaixe Jogo 3D → Placar, vida e telas → Telas e fim → Fim de jogo. Conserve você perdeu.

**Teste no jogo:**

- Rodar de novo → Enter. Deixe acontecerem três batidas válidas, com tempo para acabar a proteção entre elas.
- Quando a vida chega a zero, a tela de derrota aparece e a partida para.
- Clique em Voltar ao início. Confira abertura, pontos zero e três vidas. Enter inicia uma nova partida.

### Vinte acertos abrem a rota

Conferir a meta no senão da derrota e acionar a vitória uma única vez.

1. No primeiro Se de jogando de A cada quadro, encontre Se a vida de nave ≤ 0. Clique no segundo +, imediatamente antes de senão, para abrir esse ramo.
2. Deixe o senão visível. Em Programação → Lógica & Se, encaixe um Se nesse ramo.
3. Na pergunta nova, use pontos no lugar de x, ≥ no lugar de > e 20 no lugar de 0.
4. No então dos pontos, encaixe Programação → Variáveis → Alterar variável contador para. Escolha estado.
5. No valor, troque 1 por Programação → Valores → texto e escreva vitoria, sem acento.
6. Abaixo, encaixe Jogo 3D → Placar, vida e telas → Na tela → Escrever na tela. Use embaixo, no meio e texto vazio.
7. Abaixo do aviso, encaixe Jogo 3D → Som → Tocar o som pronto e conserve moeda.
8. Abaixo do som, encaixe Jogo 3D → Placar, vida e telas → Telas e fim → Fim de jogo. Escolha você ganhou.

**Teste no jogo:**

- Rodar de novo → Enter. Alcance vinte pontos mantendo alguma vida: aparece a vitória.
- Depois do resultado, movimento e disparos não continuam.
- Voltar ao início restaura a abertura, zero pontos e três vidas.
- Confira nos blocos: a vitória está no senão da vida zero, nunca em uma conferência independente.

### Confira a patrulha completa

Testar o ciclo de partida completo e enviar a patrulha pronta.

1. Clique em Rodar de novo e confira a abertura: nave no centro, três corações e zero acertos.
2. Antes de Enter, toque em Espaço: não sai laser.
3. Depois de Enter, teste um acerto, uma batida e uma pedra que passa sem bater.
4. Em partidas diferentes, teste a derrota e a vitória. Depois de cada resultado, clique em Voltar ao início.

**Teste no jogo:**

- Rodar de novo: nave no centro, grupos vazios, pontos zero e três vidas. Espaço antes de Enter não dispara.
- Depois de Enter, movimento, disparos e relógio funcionam.
- Um acerto soma um ponto; uma batida válida tira uma vida; uma pedra que passa sem bater não altera pontos ou vida.
- Em partidas distintas, teste a derrota por vida zero e a vitória por vinte pontos com vida restante.
- Depois de cada resultado, Voltar ao início restaura a abertura e o começo completo. Enter permite jogar de novo.

### Por que o jogo termina?

Explicar as regras usando os testes do próprio jogo.



### Sua patrulha está pronta

Reconhecer a construção concluída e conhecer a publicação opcional no Mural.

1. Você pode concluir a aula sem publicar.
2. Se quiser publicar: Compartilhar → Gerar capa → conferir a capa → Publicar.
3. Depois de Seu jogo está no Mural!, use Copiar link de jogar. Feche a janela e clique em Concluir aula.
