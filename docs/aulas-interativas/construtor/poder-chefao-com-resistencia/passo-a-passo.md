# Passo a passo do projeto: Chefão com resistência

Poder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.

## A experiência: a resistência do chefão

**A ideia:** O chefão tem uma vida própria, guardada numa variável. Cada laser que acerta tira 1. Um laser só não derrota; quando a vida chega a zero, o chefão cai, e o prêmio precisa valer uma vez só.

**O que investigar:**

- Acerte o chefão uma vez e olhe a vida dele.
- Continue acertando e veja a vida descer.
- Acerte até a vida chegar a 0.
- Com o chefão derrotado, compare o prêmio com a guarda ligada e desligada.

Antes e depois de cada laser, observe a vida do chefão, a barra e o placar. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.

## Aula 1 · Nave Contra Asteroides (2D): Um chefão que aguenta

### A vida do chefão

**A regra:** Criar a variável vidaDoChefao com 5 e a barra que mostra a vida embaixo do chefão.

1. Em Ao iniciar, logo abaixo de Criar sprite chefao: Criar variável vidaDoChefao com valor 5 (Programação → Variáveis).
2. No fim de A cada quadro do jogo: Barra de valor da variável vidaDoChefao, máximo 5, x 300, y 158, largura 200, altura 10, vermelha (Jogo 2D → Vida e placar → Indicadores e texto na tela).

**Teste:**

- A barra aparece cheia embaixo do chefão.

### Cada laser tira 1

**A regra:** Usar o encontro do chefão com o grupo tiros: o laser sai e a vida perde 1.

1. No quadro do jogo, logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo tiros que colidir com o sprite chefao, chamando de tiroNoChefao.
2. Dentro: Tirar o sprite tiroNoChefao do grupo tiros e Somar −1 em variável vidaDoChefao.

**Teste:**

- Cada laser que acerta tira um pedaço da barra; um laser só não acaba com ela.

### No zero, o chefão cai

**A regra:** Quando a vida chega a 0, levar o chefão para longe e somar 10 pontos de prêmio.

1. No quadro do jogo, logo abaixo do encontro dos tiros com o chefão: Se vidaDoChefao ≤ 0.
2. No então: Soltar explosão no sprite chefao, Levar o sprite chefao para x 300 e y −400 (Jogo 2D → Movimento → Posição e tamanho) e Somar 10 em variável pontos.

**Teste:**

- Com cinco acertos, o chefão explode e sai da tela.
- O placar dispara: o prêmio ainda soma a cada quadro.

### O prêmio vale uma vez

**A regra:** Guardar o prêmio com chefaoDerrotado: na primeira vez ele vira verdadeiro, e o prêmio não soma de novo.

1. Em Ao iniciar, logo abaixo de vidaDoChefao: Criar variável chefaoDerrotado com valor falso.
2. Dentro do Se vidaDoChefao ≤ 0: Se chefaoDerrotado = falso, com os blocos do prêmio dentro.
3. No começo desse então: Alterar variável chefaoDerrotado para verdadeiro.

**Teste:**

- Ao derrotar o chefão, o placar ganha 10 uma vez e para.

## Aula 2 · Patrulha Espacial (3D): O chefão na patrulha

### A vida do chefão

**A regra:** Criar a variável vidaDoChefao com 5 e o texto que mostra a vida.

1. Em Ao iniciar, logo abaixo de Dar 3 de vida a nave: Criar variável vidaDoChefao com valor 5.
2. Logo abaixo do placar dos acertos: Escrever na tela, em cima, à esquerda, "Chefão: " + vidaDoChefao.

**Teste:**

- O texto Chefão: 5 aparece no alto à esquerda.

### Cada laser tira 1

**A regra:** Usar o encontro do chefão com o grupo tiros: o laser sai, a vida perde 1 e o texto é escrito de novo.

1. Logo abaixo do encontro da nave com os asteroides: Quando chefao encostar em algum do grupo tiros, chamando o laser de tiroNoChefao (Jogo 3D → Encostar → Encostar).
2. Dentro: Tirar o objeto tiroNoChefao do grupo tiros e Somar −1 em variável vidaDoChefao.
3. Logo abaixo: Escrever na tela, em cima, à esquerda, "Chefão: " + vidaDoChefao.

**Teste:**

- Cada laser que acerta tira 1 do texto Chefão.

### No zero, o chefão cai

**A regra:** Quando a vida chega a 0, levar o chefão para longe e somar 10 pontos.

1. No quadro, logo abaixo do movimento dos asteroides: Se vidaDoChefao ≤ 0.
2. No então: Colocar o objeto chefao em x 0, y 1, z −200, Somar 10 em pontos e escrever o placar dos acertos.

**Teste:**

- Com cinco acertos, o chefão sai.
- O placar dispara: o prêmio ainda soma a cada quadro.

### O prêmio vale uma vez

**A regra:** Guardar o prêmio com chefaoDerrotado, como no jogo 2D.

1. Em Ao iniciar: Criar variável chefaoDerrotado com valor falso.
2. Dentro do Se vidaDoChefao ≤ 0: Se chefaoDerrotado = falso, com o prêmio dentro, começando com Alterar variável chefaoDerrotado para verdadeiro.

**Teste:**

- Ao derrotar o chefão, o placar ganha 10 uma vez e para.

## Entrega

Em cada aula, o envio fecha a última montagem, a do prêmio que vale uma vez. Antes de enviar, jogue uma partida: acerte o chefão uma vez e veja a vida descer, derrote o chefão e confira que o placar ganha 10 e para. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
