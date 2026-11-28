# Passo a passo do projeto: Inimigo que atira

Poder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.

## A experiência: a inimiga que atira

**A ideia:** A inimiga cria um tiro a cada um segundo e meio. O lugar onde o tiro nasce decide de onde ele sai: num lugar fixo, todo tiro sai do mesmo ponto; na posição da inimiga, ele acompanha a inimiga. O tiro que encosta na nave sai e tira uma vida, e uma partida nova começa sem tiros.

**O que investigar:**

- Com a origem No meio, avance até a inimiga atirar duas vezes e veja de onde os tiros saem.
- Troque a origem para Na inimiga e avance até ela atirar duas vezes.
- Deixe um tiro chegar até a nave e olhe as vidas.
- Com tiros no ar, clique em Recomeçar a partida e olhe os tiros e as vidas.

Antes e depois de cada teste, observe onde a inimiga está, de onde cada tiro sai, os tiros no ar e as vidas. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.

## Aula 1 · Nave Contra Asteroides (2D): Uma inimiga que atira

### O relógio dos tiros

**A regra:** Criar o relógio que cria um tiro inimigo a cada 1,5 s, só na partida.

1. Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos (o das pedras): outro A cada segundos, com 1.5.
2. No fazer, um Se com o estado do jogo é jogando.
3. No então: No grupo tirosInimigos criar um sprite com imagem laser-inimigo-vermelho, x 395, y 76, largura 10, altura 26, vx 0 e vy 5.

**Teste:**

- Antes do Enter, a inimiga não atira; na partida, um tiro desce a cada 1,5 segundo.
- Por enquanto, os tiros saem sempre do meio.

### O tiro sai da inimiga

**A regra:** Fazer o tiro nascer embaixo da inimiga: o x lê o centro x dela e o y lê a posição y dela.

1. No x do tiro da inimiga: o centro x do sprite inimiga − 5 (Programação → Matemática e Jogo 2D → Movimento → Posição e tamanho).
2. No y: a posição y do sprite inimiga + 52.

**Teste:**

- Na partida, cada tiro sai de baixo da inimiga, onde ela estiver.

### O tiro machuca a nave

**A regra:** Usar o encontro da nave com o grupo tirosInimigos: o tiro sai e a nave perde uma vida.

1. No quadro do jogo, logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo tirosInimigos que colidir com o sprite nave, chamando de tiroQueAcertou.
2. Dentro: Tirar o sprite tiroQueAcertou do grupo tirosInimigos, Machucar o sprite nave tirando 1 e Tocar efeito batida.

**Teste:**

- O tiro inimigo que encosta na nave some, e a nave perde uma vida.

### Os tiros saem da tela

**A regra:** Tirar do grupo tirosInimigos os tiros que saem da tela.

1. No quadro do jogo, logo abaixo de Mover os sprites do grupo tirosInimigos: Tirar do grupo tirosInimigos quem sair da tela.

**Teste:**

- Os tiros que passam pela nave saem do grupo.
- Uma partida nova começa sem tiros.

## Aula 2 · Patrulha Espacial (3D): A inimiga na patrulha

### O relógio dos tiros

**A regra:** Criar o relógio que cria uma cópia do tiro inimigo a cada 1,5 s, só na partida.

1. Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos (o das pedras): outro A cada segundos, com 1.5.
2. Dentro de o relógio da inimiga, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
3. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
4. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
5. No então: Criar uma cópia de moldeTiroInimigo no grupo tirosInimigos, em x 0, y 1, z −22.

**Teste:**

- Antes do Enter, a inimiga não atira; na partida, um tiro vem a cada 1,5 segundo.

### O tiro sai da inimiga

**A regra:** Fazer o tiro nascer na frente da inimiga: o x da cópia lê a posição x dela.

1. No x da cópia do tiro: posição x do objeto inimiga (Jogo 3D → Objetos → Posição, giro e tamanho).

**Teste:**

- Na partida, cada tiro sai da frente da inimiga, onde ela estiver.

### O tiro machuca a nave

**A regra:** Usar o encontro da nave com o grupo tirosInimigos: o tiro sai e a nave perde uma vida.

1. Em Quando acontecer, logo abaixo do encontro com os asteroides: Quando nave encostar em algum do grupo tirosInimigos, chamando de tiroQueAcertou.
2. Dentro de o encontro da nave com os tiros inimigos, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.
3. Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.
4. Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.
5. No então: Tirar o objeto tiroQueAcertou do grupo tirosInimigos e Machucar nave tirando 1 de vida.

**Teste:**

- O tiro inimigo que encosta na nave some, e a nave perde uma vida.

### Os tiros saem da tela

**A regra:** Tirar do grupo tirosInimigos os tiros que passam da nave.

1. No quadro, logo abaixo de No grupo asteroides, tirar quem saiu: No grupo tirosInimigos, tirar quem saiu, no z, de −36 até 6.

**Teste:**

- Os tiros que passam pela nave saem do grupo.
- Voltar ao início começa uma partida sem tiros.

## Entrega

Em cada aula, o envio fecha a última montagem, a da limpeza dos tiros. Antes de enviar, jogue uma partida: veja os tiros saírem da inimiga, deixe um tiro acertar a nave e recomece a partida. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
