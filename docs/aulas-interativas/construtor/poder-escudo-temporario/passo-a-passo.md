# Passo a passo do projeto: Escudo temporário

Poder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.

## A experiência: o escudo que acaba

**A ideia:** O escudo é um número que conta para trás. Pegar o item põe 5 nesse número, e a cada segundo ele perde 1. Na batida, o jogo pergunta: o escudo ainda tem tempo? Se tem, a pedra só sai; se não tem, a nave perde uma vida.

**O que investigar:**

- Sem pegar o item, avance até uma pedra bater e olhe as vidas.
- Pegue o item do escudo e avance até uma pedra bater com o Escudo maior que 0.
- Pegue o item, deixe o Escudo chegar a 0 e avance até a próxima pedra.
- Com o Escudo entre 1 e 4, pegue o item de novo e olhe o número.

Antes e depois de cada teste, observe o número do Escudo, as vidas e o segundo em que cada pedra bate. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.

## Aula 1 · Nave Contra Asteroides (2D): O escudo que acaba

### O item que cai pelo meio

**A regra:** Criar o relógio que solta um item de escudo pelo meio da tela, só na partida.

1. Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 1.5 segundos, fora do fazer dele.
2. Em Jogo 2D → Tempo → Quadros e intervalos, pegue A cada segundos, encaixe nesse espaço e troque o 2 por 4.
3. Em Programação → Lógica & Se, encaixe um Se no fazer do relógio. Jogue a pergunta x > 0 na lixeira e, em Jogo 2D → Jogo e telas → Telas e partida, encaixe o estado do jogo é, com jogando.
4. No então do Se, encaixe No grupo criar um sprite com imagem (Jogo 2D → Grupos → Criar e percorrer). Escolha itensEscudo, x 378, y −44, largura e altura 44, a imagem item-escudo-redondo, vx 0 e vy 2.

**Teste:**

- Enter começa a partida: a cada 4 segundos, um item cai pelo meio da tela.
- Antes do Enter, nenhum item cai.

### Pegar o item liga o escudo

**A regra:** Usar o encontro da nave com o grupo itensEscudo para tirar o item e pôr 5 em tempoDoEscudo.

1. Em Enquanto estiver rodando, dentro do então de Se jogando, deixe visível o espaço logo abaixo do encontro das pedras com a nave.
2. Em Jogo 2D → Colisões → Encostar e bloquear, pegue Para cada sprite do grupo que colidir com o sprite e encaixe nesse espaço. Escolha itensEscudo e nave, e chame o sprite de itemPego.
3. Dentro desse encontro: Tirar o sprite itemPego do grupo itensEscudo (Jogo 2D → Grupos → Participação e limpeza).
4. Logo abaixo: Alterar variável tempoDoEscudo para 5 (Programação → Variáveis) e Tocar efeito power-up (Jogo 2D → Som → Efeitos prontos).

**Teste:**

- Com a nave parada no meio, ela pega o item: o item some e o Escudo vira 5.
- O número ainda não desce: o prazo vem na última parte.

### Com escudo, a pedra só sai

**A regra:** Fazer a batida perguntar pelo escudo: com tempoDoEscudo maior que 0, a pedra só sai; sem escudo, a nave perde uma vida.

1. No encontro das pedras com a nave, deixe visível o espaço logo abaixo de Soltar explosão no sprite atingiuNave.
2. Em Programação → Lógica & Se, encaixe um Se nesse espaço. Machucar o sprite e Tocar efeito descem para baixo dele.
3. Na pergunta x > 0, escolha tempoDoEscudo no lugar de x. Conserve > e 0.
4. Clique no segundo + do Se para abrir o senão e leve Machucar o sprite nave (com o Tocar efeito batida) para dentro dele.
5. No então, encaixe Tocar efeito quicar (Jogo 2D → Som → Efeitos prontos).

**Teste:**

- Com o Escudo maior que 0, a pedra que bate só some: as vidas continuam iguais.
- Sem pegar o item, a pedra tira uma vida, como antes.

### O escudo acaba

**A regra:** Criar o relógio de 1 segundo que tira 1 de tempoDoEscudo enquanto ele é maior que 0 e faz a nave piscar.

1. Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 4 segundos, fora do fazer dele.
2. Em Jogo 2D → Tempo → Quadros e intervalos, pegue outro A cada segundos, encaixe nesse espaço e troque o 2 por 1.
3. No fazer do relógio, encaixe um Se (Programação → Lógica & Se) e escolha tempoDoEscudo no lugar de x. Conserve > e 0.
4. No então: Somar −1 em variável tempoDoEscudo (Programação → Variáveis) e, logo abaixo, Fazer o sprite nave piscar por 30 quadros (Jogo 2D → Desenho e efeitos → Efeitos).

**Teste:**

- Depois de pegar o item, o Escudo desce de 5 a 0, um por segundo, e a nave pisca.
- Com o Escudo em 0, a nave para de piscar e a pedra volta a tirar vida. O número nunca fica negativo.
- Pegar o item de novo volta o Escudo a 5.

## Aula 2 · Patrulha Espacial (3D): O escudo na patrulha

### O item vem pelo meio

**A regra:** Criar o relógio que cria uma cópia do item de escudo no meio, longe da nave, só na partida.

1. Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 1.5 segundos.
2. Em Jogo 3D → Tempo e sorteio → Tempo, pegue A cada segundos, encaixe nesse espaço e troque o 2 por 4.
3. Dentro de o relógio A cada 4 segundos, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
4. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
5. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
6. No então do Se, encaixe Criar uma cópia (Jogo 3D → Grupos), com o molde moldeEscudo, o grupo itensEscudo e a posição x 0, y 1, z −28.

**Teste:**

- Enter começa a partida: a cada 4 segundos, um item vem pelo meio.
- Antes do Enter, nenhum item nasce.

### Pegar o item liga o escudo

**A regra:** Usar o encontro da nave com o grupo itensEscudo para tirar o item, pôr 5 em tempoDoEscudo e escrever o Escudo.

1. Em Quando acontecer, deixe visível o espaço logo abaixo do encontro da nave com os asteroides.
2. Em Jogo 3D → Encostar → Encostar, encaixe Quando heroi encostar em algum do grupo. Escolha nave, itensEscudo e chame o item de itemPego.
3. Dentro de o encontro da nave com os itens, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
4. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
5. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
6. No então: Tirar o objeto itemPego do grupo itensEscudo (Jogo 3D → Grupos) e Alterar variável tempoDoEscudo para 5 (Programação → Variáveis).
7. Logo abaixo: Escrever na tela, em cima, à esquerda, com "Escudo: " + valor da variável tempoDoEscudo.

**Teste:**

- Com a nave parada no meio, ela pega o item: o item some e o Escudo vira 5.
- O número ainda não desce: o prazo vem na última parte.

### Com escudo, a pedra só sai

**A regra:** Fazer a batida perguntar pelo escudo: com tempoDoEscudo maior que 0, a pedra só sai; sem escudo, a nave perde uma vida.

1. No encontro da nave com os asteroides, deixe visível o espaço logo abaixo de Tirar o objeto asteroideQueBateu.
2. Em Programação → Lógica & Se, encaixe um Se nesse espaço e escolha tempoDoEscudo no lugar de x. Conserve > e 0.
3. Clique no segundo + para abrir o senão e leve Machucar nave tirando 1 de vida (com o som) para dentro dele.
4. No então, encaixe Tocar o som pronto (Jogo 3D → Som).

**Teste:**

- Com o Escudo maior que 0, a pedra que bate só some: as vidas continuam iguais.
- Sem pegar o item, a pedra tira uma vida, como antes.

### O escudo acaba

**A regra:** Criar o relógio de 1 segundo que tira 1 de tempoDoEscudo enquanto ele é maior que 0, escreve o Escudo e faz a nave piscar.

1. Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 4 segundos.
2. Em Jogo 3D → Tempo e sorteio → Tempo, encaixe outro A cada segundos nesse espaço e troque o 2 por 1.
3. No fazer, encaixe um Se (Programação → Lógica & Se) e escolha tempoDoEscudo no lugar de x. Conserve > e 0.
4. No então: Somar −1 em variável tempoDoEscudo, Escrever na tela em cima, à esquerda, com "Escudo: " + tempoDoEscudo, e Fazer nave piscar por 0,5 s (Jogo 3D → Objetos → Aparência).

**Teste:**

- Depois de pegar o item, o Escudo desce de 5 a 0, um por segundo, e a nave pisca.
- Com o Escudo em 0, a nave para de piscar e a pedra volta a tirar vida. O número nunca fica negativo.

## Entrega

Em cada aula, o envio fecha a última montagem, a do prazo do escudo. Antes de enviar, jogue uma partida: pegue o item, deixe uma pedra bater com o escudo ligado, espere o Escudo chegar a 0 e deixe outra pedra bater. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
