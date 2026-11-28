# Passo a passo do projeto: Tiro triplo

Poder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.

## A experiência: o leque de tiros

**A ideia:** Cada laser tem uma velocidade para cima e outra para o lado. Com o tiro triplo, um aperto cria três lasers. Se os três têm a mesma velocidade para o lado, eles seguem juntos e parecem um só; com desvios diferentes, cada um segue o seu caminho.

**O que investigar:**

- Com o tiro triplo desligado, dispare e veja quantos lasers saem.
- Ligue o tiro triplo com desvio 0 e dispare.
- Com o tiro triplo e desvio 2, dispare e veja onde cada laser chega.
- Troque o desvio para 1 e dispare de novo: os lasers dos lados chegam às pedras?

Antes e depois de cada disparo, observe quantos lasers estão no ar, por onde cada um passa e quantas pedras ele acerta. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.

## Aula 1 · Nave Contra Asteroides (2D): Três lasers de uma vez

### O item do tiro triplo

**A regra:** Criar o relógio que solta o item pelo meio, só na partida, e o encontro que liga o tiro triplo.

1. Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 2D → Tempo → Quadros e intervalos), com um Se e a pergunta o estado do jogo é jogando.
2. No então: No grupo itensTriplo criar um sprite com imagem item-triplo-redondo, x 378, y −44, largura e altura 44, vx 0 e vy 2.
3. Logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo itensTriplo que colidir com o sprite nave, chamando de itemPego.
4. Dentro dele: Tirar o sprite itemPego do grupo itensTriplo, Alterar variável tempoTriplo para 5 e Tocar efeito power-up.

**Teste:**

- Antes do Enter, nenhum item cai; na partida, um item cai pelo meio a cada 4 segundos.
- Com a nave parada no meio, ela pega o item e o Triplo vira 5.

### Três lasers no Espaço

**A regra:** Fazer o Espaço perguntar pelo tiro triplo: com tempoTriplo maior que 0, três lasers; senão, o laser de antes.

1. No Espaço, dentro do então de Se jogando, encaixe um Se no começo (Programação → Lógica & Se). O laser e o som descem para baixo dele.
2. Na pergunta, escolha tempoTriplo no lugar de x. Conserve > e 0.
3. Abra o senão (o segundo +) e leve o laser, com o som, para dentro dele.
4. Duplique o laser (botão direito → Duplicar) três vezes e leve as cópias para o então. Abaixo delas, Tocar efeito laser.

**Teste:**

- Sem o item, o Espaço cria um laser.
- Com o Triplo maior que 0, o Espaço cria três lasers, por enquanto no mesmo caminho.

### Cada laser para um lado

**A regra:** Dar a cada laser do tiro triplo uma direção: vx −2, 0 e 2.

1. No Espaço, deixe visíveis os três lasers do então do Se tempoTriplo.
2. No primeiro, troque o vx por −2; deixe o segundo com 0; no terceiro, troque o vx por 2.

**Teste:**

- Com o Triplo maior que 0, os três lasers abrem em leque: esquerda, reto e direita.
- Sem o item, o Espaço continua com um laser reto.

### O tiro triplo acaba

**A regra:** Criar o relógio de 1 segundo que tira 1 de tempoTriplo enquanto ele é maior que 0, para o tiro simples voltar.

1. Em Enquanto estiver rodando, logo abaixo de A cada 4 segundos: outro A cada segundos, com 1.
2. No fazer, um Se com tempoTriplo > 0.
3. No então: Somar −1 em variável tempoTriplo (Programação → Variáveis).

**Teste:**

- Depois de pegar o item, o Triplo desce de 5 a 0, um por segundo, e para no 0.
- Com o Triplo em 0, o Espaço volta a criar um laser.

## Aula 2 · Patrulha Espacial (3D): O leque na patrulha

### O item vem pela esquerda

**A regra:** Criar o relógio que cria uma cópia do item à esquerda, só na partida, e o encontro que liga o tiro triplo.

1. Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 3D → Tempo e sorteio → Tempo).
2. Dentro de o relógio A cada 4 segundos, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
3. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
4. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
5. No então: Criar uma cópia de moldeTriplo no grupo itensTriplo, em x −4, y 1, z −20.
6. Em Quando acontecer, logo abaixo do encontro com os asteroides: Quando nave encostar em algum do grupo itensTriplo, chamando de itemPego, com a guarda da partida.
7. No então: Tirar o objeto itemPego do grupo itensTriplo, Alterar variável tempoTriplo para 5 e Escrever na tela, em cima, à esquerda, "Triplo: " + tempoTriplo.

**Teste:**

- Antes do Enter, nenhum item nasce; na partida, um item vem pela esquerda a cada 4 segundos.
- Na borda da esquerda, a nave pega o item e o Triplo vira 5.

### Três lasers no Espaço

**A regra:** Fazer o Espaço perguntar pelo tiro triplo: com tempoTriplo maior que 0, três cópias do laser; senão, o laser de antes.

1. No Espaço, no começo do então da guarda, encaixe um Se e escolha tempoTriplo no lugar de x. Conserve > e 0.
2. Abra o senão e leve a cópia de moldeTiro, com a nota, para dentro dele.
3. Duplique a cópia três vezes e leve as cópias para o então.

**Teste:**

- Sem o item, o Espaço cria um laser.
- Com o Triplo maior que 0, três lasers saem juntos, por enquanto no mesmo caminho.

### Um grupo para cada lado

**A regra:** Mandar os lasers dos lados para os grupos tirosEsquerda e tirosDireita.

1. No então do Se tempoTriplo, troque o grupo da primeira cópia por tirosEsquerda.
2. Deixe a segunda em tiros e troque o grupo da terceira por tirosDireita.

**Teste:**

- Com o Triplo maior que 0, os três lasers abrem em leque.

### O tiro triplo acaba

**A regra:** Criar o relógio de 1 segundo que tira 1 de tempoTriplo enquanto ele é maior que 0 e escreve o Triplo.

1. Em Enquanto estiver rodando, logo abaixo de A cada 4 segundos: outro A cada segundos, com 1.
2. No fazer, um Se com tempoTriplo > 0.
3. No então: Somar −1 em variável tempoTriplo e Escrever na tela, em cima, à esquerda, "Triplo: " + tempoTriplo.

**Teste:**

- Depois de pegar o item, o Triplo desce de 5 a 0, um por segundo, e para no 0.
- Com o Triplo em 0, o Espaço volta a criar um laser.

## Entrega

Em cada aula, o envio fecha a última montagem, a do prazo do tiro triplo. Antes de enviar, jogue uma partida: dispare antes do item, pegue o item e dispare com o Triplo ligado, espere o Triplo chegar a 0 e dispare de novo. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
