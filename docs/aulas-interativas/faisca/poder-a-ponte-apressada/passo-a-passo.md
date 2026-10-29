# Passo a passo do projeto — A ponte apressada

Poder do Faísca. Aqui está cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.

## Aula 1 · Jogo 2D: Aberta por um tempo

### A alavanca baixa a ponte

**Relembre:** A variável ponteAberta guarda se a ponte está baixada. Toda partida começa com falso; o encontro com a alavanca baixa a ponte e muda para verdadeiro.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva ponteAberta.
3. O valor chega com 0. Abra Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. No menu, escolha falso.
4. Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha alavanca.
5. Dentro do fazer, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha alavanca; no segundo, escolha alavanca-baixo.
6. Logo abaixo, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha ponte; no segundo, escolha ponte-baixada.
7. Embaixo, encaixe Alterar variável, de Programação → Variáveis. Escolha ponteAberta e solte verdadeiro, de Programação → Lógica e Se, em cima do 1. Deixe em verdadeiro.
8. Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva A ponte baixou! Atravesse antes que ela suba.

**Teste:** Leve o personagem até a alavanca. A alavanca desce, a ponte baixa e o aviso muda. Pressione R: a ponte volta levantada.

**Se não funcionar:** Se nada acontecer, confira se o encontro usa personagem e alavanca. Não crie ponteAberta dentro do encontro: ela nasce em Ao iniciar, com falso, e o encontro só muda para verdadeiro.

### A ponte sobe sozinha

**Relembre:** O bloco depois de 4 segundos espera e só então roda o que está dentro dele. Dentro do encontro com a alavanca, o relógio começa a cada puxada, e o que vai dentro dele desfaz o que a alavanca fez.

1. No encontro com a alavanca, deixe à vista o espaço embaixo do último bloco do fazer, o Alterar aviso.
2. Abra Programação → Repetições. Pegue depois de 1 segundos, fazer e encaixe embaixo do Alterar aviso, ainda dentro do encontro. Clique no 1, apague e escreva 4.
3. Dentro do fazer do depois de 4 segundos, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha alavanca; no segundo, escolha alavanca-cima.
4. Logo abaixo, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha ponte; no segundo, escolha ponte-levantada.
5. Embaixo, ainda dentro do depois de 4 segundos, encaixe Alterar variável. Escolha ponteAberta, solte verdadeiro em cima do 1 e, no menu, escolha falso.
6. Por último, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A ponte subiu. Puxe a alavanca de novo.

**Teste:** Puxe a alavanca e conte até 4: a ponte sobe sozinha e o aviso muda. Puxe de novo: a ponte baixa outra vez e sobe de novo depois de 4 segundos.

**Se não funcionar:** Se a ponte nunca subir, confira se o depois de 4 segundos tem os blocos dentro do fazer dele. Se ela subir só uma vez, logo no começo, o depois de está fora do encontro com a alavanca: arraste-o para dentro, embaixo do aviso.

### Atravesse a ponte

**Relembre:** O encontro com a ponte pergunta ponteAberta. Verdadeiro escolhe o então, que leva o personagem à pedra e toca o sino; falso escolhe o senão, que avisa.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com a alavanca, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha ponte.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Segure a pergunta x > 0 pelo sinal de maior e arraste até a lixeira.
3. Abra Programação → Valores e solte valor da variável no lugar vazio ao lado de Se. Clique no x e escolha ponteAberta.
4. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
5. Dentro do então, encaixe Mudar a posição do sprite, de Jogo 2D → Movimento → Posição e tamanho. Clique em jogador e escolha personagem. Coloque x 96 e y 240.
6. Logo abaixo, ainda no então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha sino; no segundo, escolha pedra-do-sino-tocando.
7. Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva Você atravessou e tocou o sino!
8. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A ponte está levantada. Puxe a alavanca primeiro.

**Teste:** Pressione R e vá direto à ponte: o aviso pede para puxar a alavanca. Puxe e vá logo: o personagem atravessa e o sino toca. Pressione R, puxe e espere a ponte subir antes de encostar: ele não atravessa.

**Se não funcionar:** Se o personagem atravessar sem puxar, confira se a pergunta do Se é ponteAberta e se ponteAberta começa falso. Se ele nunca atravessar, confira se a mudança de lugar está dentro do então e não no senão.

## Aula 2 · Ilha 3D: A ponte da ilha

### A alavanca baixa a ponte

**Relembre:** A variável ponteAberta guarda se a ponte está baixada. Toda partida começa com falso; o encontro com a alavanca baixa a ponte e muda para verdadeiro.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva ponteAberta.
3. O valor chega com 0. Abra Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. No menu, escolha falso.
4. Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha alavanca.
5. Dentro do fazer, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha puxar. Clique em heroi e escolha alavanca. No modo, escolha uma vez.
6. Logo abaixo, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha baixar. Clique em heroi e escolha ponte. No modo, escolha uma vez.
7. Embaixo, encaixe Alterar variável, de Programação → Variáveis. Escolha ponteAberta e solte verdadeiro, de Programação → Lógica e Se, em cima do 1. Deixe em verdadeiro.
8. Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva A ponte baixou! Atravesse antes que ela suba.

**Teste:** Leve o personagem até a alavanca. A alavanca desce, a ponte baixa e o aviso muda. Pressione R: a ponte volta levantada.

**Se não funcionar:** Se nada acontecer, confira se o encontro usa personagem e alavanca. Não crie ponteAberta dentro do encontro: ela nasce em Ao iniciar, com falso, e o encontro só muda para verdadeiro.

### A ponte sobe sozinha

**Relembre:** O bloco depois de 4 segundos espera e só então roda o que está dentro dele. Dentro do encontro com a alavanca, o relógio começa a cada puxada, e o que vai dentro dele desfaz o que a alavanca fez.

1. No encontro com a alavanca, deixe à vista o espaço embaixo do último bloco do fazer, o Alterar aviso.
2. Abra Programação → Repetições. Pegue depois de 1 segundos, fazer e encaixe embaixo do Alterar aviso, ainda dentro do encontro. Clique no 1, apague e escreva 4.
3. Dentro do fazer do depois de 4 segundos, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha soltar. Clique em heroi e escolha alavanca. No modo, escolha uma vez.
4. Logo abaixo, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha subir. Clique em heroi e escolha ponte. No modo, escolha uma vez.
5. Embaixo, ainda dentro do depois de 4 segundos, encaixe Alterar variável. Escolha ponteAberta, solte verdadeiro em cima do 1 e, no menu, escolha falso.
6. Por último, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A ponte subiu. Puxe a alavanca de novo.

**Teste:** Puxe a alavanca e conte até 4: a ponte sobe sozinha e o aviso muda. Puxe de novo: a ponte baixa outra vez e sobe de novo depois de 4 segundos.

**Se não funcionar:** Se a ponte nunca subir, confira se o depois de 4 segundos tem os blocos dentro do fazer dele. Se ela subir só uma vez, logo no começo, o depois de está fora do encontro com a alavanca: arraste-o para dentro, embaixo do aviso.

### Atravesse a ponte

**Relembre:** O encontro com a ponte pergunta ponteAberta. Verdadeiro escolhe o então, que leva o personagem à pedra e toca o sino; falso escolhe o senão, que avisa.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com a alavanca, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha ponte.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Segure a pergunta x > 0 pelo sinal de maior e arraste até a lixeira.
3. Abra Programação → Valores e solte valor da variável no lugar vazio ao lado de Se. Clique no x e escolha ponteAberta.
4. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
5. Dentro do então, encaixe Colocar o objeto, de Jogo 3D → Objetos → Posição, giro e tamanho. Clique em caixa e escolha personagem. Coloque x -3.9, y 1.42 e z 3.8 (o número negativo começa com o sinal de menos; use ponto no lugar da vírgula).
6. Logo abaixo, ainda no então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha tocar. Clique em heroi e escolha sino. No modo, escolha uma vez.
7. Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva Você atravessou e tocou o sino!
8. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A ponte está levantada. Puxe a alavanca primeiro.

**Teste:** Pressione R e vá direto à ponte: o aviso pede para puxar a alavanca. Puxe e vá logo: o personagem atravessa e o sino toca. Pressione R, puxe e espere a ponte subir antes de encostar: ele não atravessa.

**Se não funcionar:** Se o personagem atravessar sem puxar, confira se a pergunta do Se é ponteAberta e se ponteAberta começa falso. Se ele nunca atravessar, confira se a mudança de lugar está dentro do então e não no senão.

## Entrega

Em cada aula, jogue uma partida inteira: atravesse a tempo, chegue atrasado e puxe a alavanca de novo. Pressione R e confira que a ponte volta levantada. Clique em Verificar projeto, corrija o que faltar, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
