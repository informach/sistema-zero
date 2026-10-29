# Passo a passo do projeto — O segredo da cabana

Poder do Faísca. Aqui está cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.

## Aula 1 · Jogo 2D: Duas peças para abrir

### Guarde o emblema

**Relembre:** A variável temEmblema guarda se o personagem já pegou o emblema. Toda partida começa com falso; o encontro com o emblema faz ele sumir e muda para verdadeiro, como a chave.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva temEmblema.
3. O valor chega com 0. Abra Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. No menu, escolha falso.
4. Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha emblema.
5. Dentro do fazer, encaixe Destruir o sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique em resposta e escolha emblema.
6. Logo abaixo, encaixe Alterar variável, de Programação → Variáveis. Escolha temEmblema e solte verdadeiro, de Programação → Lógica e Se, em cima do 1. Deixe em verdadeiro.
7. Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva Você pegou o emblema!

**Teste:** Leve o personagem até o emblema. Ele some só no encontro, e o aviso conta que você pegou o emblema. Pressione R: o emblema volta.

**Se não funcionar:** Se o emblema não sumir, confira se o encontro usa personagem e emblema. Não crie temEmblema dentro do encontro: ela nasce em Ao iniciar, com falso, e o encontro só muda para verdadeiro.

### A cabana pede as duas

**Relembre:** O encontro com a cabana pergunta temChave e temEmblema. O bloco e só responde sim quando as duas são verdadeiras: sim escolhe o então, que abre a cabana; não escolhe o senão, que avisa.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com o emblema, fora do fazer dele. Abra Jogo 2D → Colisões → Encostar e bloquear, pegue Quando o sprite começar a encostar no sprite e encaixe ali. Clique em jogador e escolha personagem; clique em inimigo e escolha cabana.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Segure a pergunta x > 0 pelo sinal de maior e arraste até a lixeira.
3. Abra Programação → Lógica e Se e pegue o bloco que tem a palavra e no meio (ele chega como 0 e 0). Solte no lugar vazio ao lado de Se.
4. Abra Programação → Valores e solte valor da variável em cima do primeiro 0; escolha temChave. Solte outro valor da variável em cima do segundo 0; escolha temEmblema.
5. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
6. Dentro do então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha cabana; no segundo, escolha cabana-aberta.
7. Embaixo dele, ainda no então, encaixe Alterar variável, de Programação → Variáveis. Escolha aviso. Solte um texto, de Programação → Valores, em cima do 1 e escreva A cabana abriu! Você tinha as duas peças.
8. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A cabana pede a chave e o emblema.

**Teste:** Pressione R e vá direto à cabana: ela fica fechada e avisa. Tente só com a chave e, depois de R, só com o emblema: continua fechada. Pegue as duas, em qualquer ordem, e encoste: ela abre. Pressione R: a cabana volta fechada e as peças voltam.

**Se não funcionar:** Se a cabana abrir com uma peça só, a pergunta usa ou no lugar de e, ou falta uma das variáveis. Se ela não abrir com as duas, confira se temEmblema muda para verdadeiro no encontro com o emblema e se a abertura está dentro do então.

## Aula 2 · Ilha 3D: Duas peças na ilha

### Guarde o emblema

**Relembre:** A variável temEmblema guarda se o personagem já pegou o emblema. Toda partida começa com falso; o encontro com o emblema faz ele sumir e muda para verdadeiro, como a chave.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva temEmblema.
3. O valor chega com 0. Abra Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. No menu, escolha falso.
4. Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha emblema.
5. Dentro do fazer, encaixe Esconder o objeto, de Jogo 3D → Objetos → Aparência, e escolha emblema.
6. Logo abaixo, encaixe Alterar variável, de Programação → Variáveis. Escolha temEmblema e solte verdadeiro, de Programação → Lógica e Se, em cima do 1. Deixe em verdadeiro.
7. Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva Você pegou o emblema!

**Teste:** Leve o personagem até o emblema. Ele some só no encontro, e o aviso conta que você pegou o emblema. Pressione R: o emblema volta.

**Se não funcionar:** Se o emblema não sumir, confira se o encontro usa personagem e emblema. Não crie temEmblema dentro do encontro: ela nasce em Ao iniciar, com falso, e o encontro só muda para verdadeiro.

### A cabana pede as duas

**Relembre:** O encontro com a cabana pergunta temChave e temEmblema. O bloco e só responde sim quando as duas são verdadeiras: sim escolhe o então, que abre a cabana; não escolhe o senão, que avisa.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com o emblema, fora do fazer dele. Abra Jogo 3D → Encostar → Encostar, pegue Quando personagem encostar em e encaixe ali. O primeiro nome já vem personagem; no segundo, escolha cabana.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Segure a pergunta x > 0 pelo sinal de maior e arraste até a lixeira.
3. Abra Programação → Lógica e Se e pegue o bloco que tem a palavra e no meio (ele chega como 0 e 0). Solte no lugar vazio ao lado de Se.
4. Abra Programação → Valores e solte valor da variável em cima do primeiro 0; escolha temChave. Solte outro valor da variável em cima do segundo 0; escolha temEmblema.
5. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
6. Dentro do então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha abrir. Clique em heroi e escolha cabana. No modo, escolha uma vez.
7. Embaixo dele, ainda no então, encaixe Alterar variável, de Programação → Variáveis. Escolha aviso. Solte um texto, de Programação → Valores, em cima do 1 e escreva A cabana abriu! Você tinha as duas peças.
8. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A cabana pede a chave e o emblema.

**Teste:** Pressione R e vá direto à cabana: ela fica fechada e avisa. Tente só com a chave e, depois de R, só com o emblema: continua fechada. Pegue as duas, em qualquer ordem, e encoste: ela abre. Pressione R: a cabana volta fechada e as peças voltam.

**Se não funcionar:** Se a cabana abrir com uma peça só, a pergunta usa ou no lugar de e, ou falta uma das variáveis. Se ela não abrir com as duas, confira se temEmblema muda para verdadeiro no encontro com o emblema e se a abertura está dentro do então.

## Entrega

Em cada aula, jogue uma partida inteira, tente a cabana com uma peça só e com as duas, pressione R e confira que as peças voltam e a cabana volta fechada. Clique em Verificar projeto, corrija o que faltar, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
