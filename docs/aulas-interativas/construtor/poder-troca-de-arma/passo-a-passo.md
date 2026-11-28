# Passo a passo do projeto: Troca de arma

Poder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.

## A experiência: a troca de arma

**A ideia:** A nave guarda numa variável qual é a arma: laser ou plasma. O item libera a troca, a tecla E troca a arma, e o Espaço pergunta qual arma está escolhida antes de criar o tiro. Uma partida nova começa de novo com o laser.

**O que investigar:**

- Antes de pegar o item, aperte E e olhe a arma.
- Pegue o item e aperte E de novo.
- Dispare com o laser e com o plasma e compare os dois tiros.
- Com o plasma escolhido, comece uma partida nova e olhe a arma.

Antes e depois de cada tecla, observe a placa da arma e o tiro que sai. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.

## Aula 1 · Nave Contra Asteroides (2D): Laser ou plasma

### O item de plasma

**A regra:** Criar o relógio que solta o item pelo meio, só na partida, e o encontro que libera o plasma.

1. Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 2D → Tempo → Quadros e intervalos), com um Se e a pergunta o estado do jogo é jogando.
2. No então: No grupo itensPlasma criar um sprite com imagem item-plasma-redondo, x 378, y −44, largura e altura 44, vx 0 e vy 2.
3. Logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo itensPlasma que colidir com o sprite nave, chamando de itemPego.
4. Dentro dele: Tirar o sprite itemPego do grupo itensPlasma, Alterar variável plasmaLiberado para verdadeiro e Tocar efeito power-up.

**Teste:**

- Antes do Enter, nenhum item cai; na partida, um item cai pelo meio a cada 4 segundos.
- Com a nave parada no meio, ela pega o item e o som toca.

### A tecla E troca a arma

**A regra:** Na tecla E, durante a partida: só com o plasma liberado, laser vira plasma e plasma vira laser.

1. Em Quando acontecer, logo abaixo de Quando apertar a tecla Enter: Quando apertar a tecla E (Jogo 2D → Controles → Teclado, ações e toque), com um Se e a pergunta o estado do jogo é jogando.
2. No então: Se plasmaLiberado = verdadeiro.
3. Dentro: Se arma = "laser", com o senão aberto: no então, Alterar variável arma para "plasma"; no senão, Alterar variável arma para "laser". Logo abaixo, Tocar efeito selecionar.

**Teste:**

- Antes do item, a tecla E não troca nada.
- Depois do item, a tecla E troca a arma e toca o som.

### A placa da arma

**A regra:** Mostrar na tela qual é a arma: Arma, dois-pontos, mais o valor de arma.

1. No fim de A cada quadro do jogo, logo abaixo da legenda dos controles: Escrever (Jogo 2D → Vida e placar → Indicadores e texto na tela) com "Arma: " + valor da variável arma, x 700, y 82.

**Teste:**

- A placa mostra Arma: laser e muda para plasma quando a tecla E troca a arma.

### O Espaço pergunta a arma

**A regra:** No Espaço, Se arma = plasma, criar o plasma no grupo tirosPlasma; senão, o laser de sempre.

1. No Espaço, dentro do então de Se jogando, encaixe um Se no começo (Programação → Lógica & Se). O laser e o som descem para baixo dele.
2. Na pergunta: arma = "plasma".
3. Abra o senão e leve o laser, com o som, para dentro dele.
4. Duplique o laser para o então e troque: grupo tirosPlasma, imagem plasma-roxo, x centro x da nave − 12, y da nave − 32, largura 24, altura 32, vy −4. Logo abaixo, Tocar efeito laser.

**Teste:**

- Com o laser, o Espaço cria o laser fino.
- Depois de trocar, o Espaço cria o plasma grande e lento.
- Uma partida nova volta ao laser.

## Aula 2 · Patrulha Espacial (3D): A troca de arma na patrulha

### O item vem pela esquerda

**A regra:** Criar o relógio que cria uma cópia do item à esquerda, só na partida, e o encontro que libera o plasma.

1. Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 3D → Tempo e sorteio → Tempo).
2. Dentro de o relógio A cada 4 segundos, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
3. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
4. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
5. No então: Criar uma cópia de moldePlasmaItem no grupo itensPlasma, em x −4, y 1, z −20.
6. Em Quando acontecer, logo abaixo do encontro com os asteroides: Quando nave encostar em algum do grupo itensPlasma, chamando de itemPego, com a guarda da partida.
7. No então: Tirar o objeto itemPego do grupo itensPlasma e Alterar variável plasmaLiberado para verdadeiro.

**Teste:**

- Antes do Enter, nenhum item nasce; na partida, um item vem pela esquerda a cada 4 segundos.
- Na borda da esquerda, a nave pega o item.

### A tecla E troca a arma

**A regra:** Na tecla E, durante a partida e só com o plasma liberado, trocar a arma.

1. Em Quando acontecer, logo abaixo de Quando apertar a tecla Enter: Quando apertar a tecla E (Jogo 3D → Controles).
2. Dentro de a tecla E, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
3. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
4. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
5. No então: Se plasmaLiberado = verdadeiro; dentro, Se arma = "laser", com o senão aberto: no então, Alterar variável arma para "plasma"; no senão, Alterar variável arma para "laser".

**Teste:**

- Antes do item, a tecla E não troca nada; depois do item, troca.

### O texto da arma

**A regra:** Escrever a arma na tela em Ao iniciar e de novo a cada troca: Arma, dois-pontos, mais o valor de arma.

1. Em Ao iniciar, logo abaixo do placar dos acertos: Escrever na tela, em cima, à esquerda, "Arma: " + arma.
2. Na tecla E, dentro do Se plasmaLiberado, logo depois do Se arma = "laser": o mesmo Escrever na tela.

**Teste:**

- O texto mostra Arma: laser e muda para plasma quando a tecla E troca a arma.

### O Espaço pergunta a arma

**A regra:** No Espaço, Se arma = plasma, a cópia do plasma no grupo tirosPlasma; senão, o laser de sempre.

1. No Espaço, dentro do então de Se jogando: Se arma = "plasma", com o senão aberto.
2. No senão: a cópia do laser e a nota de sempre.
3. No então: Criar uma cópia de moldePlasma no grupo tirosPlasma, na posição x da nave, y 1, z −1.6, e Tocar a nota 330 por 120.

**Teste:**

- Com o laser, o Espaço cria o laser.
- Depois de trocar, o Espaço cria o plasma.
- Voltar ao início começa de novo com o laser.

## Entrega

Em cada aula, o envio fecha a última montagem, a do Espaço que pergunta a arma. Antes de enviar, jogue uma partida: aperte E antes do item, pegue o item e troque, dispare com as duas armas e comece uma partida nova. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
