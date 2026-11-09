# Passo a passo do projeto — O baú dos símbolos

Poder do Faísca. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.

## A experiência: a ordem dos símbolos

**A ideia:** O jogo anota num caderninho até onde a sequência chegou (na montagem, esse caderninho vira a variável passo), e cada símbolo, quando é tocado, pergunta: é a minha vez? Na experiência, você descobre o que acontece na ordem da placa, fora da vez e num baú que só conta.

**O que investigar:**

- Ande até o sol e depois até a lua e olhe o caderninho do jogo.
- Toque os três símbolos na ordem da placa e observe o baú.
- Com o sol aceso, pule a lua e olhe o caderninho.
- Comece pela lua, sem nada aceso, e olhe o caderninho.
- Depois de errar, siga a placa de novo sem jogar de novo.
- Troque a peça para "só quantos foram tocados", toque fora da ordem e compare.

Antes e depois de cada toque, observe o caderninho do jogo, os símbolos acesos e o baú. Para comparar com o baú que só conta, veja antes o baú que confere a ordem responder. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.

## Aula 1 · Jogo 2D: Na ordem certa

### O sol começa

**Relembre:** A variável passo guarda até onde a sequência chegou. Toda partida começa com 0; o encontro com o sol muda para 1 e acende o sol.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva passo. Deixe o valor 0.
3. Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha sol.
4. Dentro do fazer, encaixe Alterar variável, de Programação → Variáveis. Escolha passo e deixe o valor 1.
5. Logo abaixo, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha sol; no segundo, escolha pedra-sol-acesa.
6. Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva O sol acendeu! Agora a lua.

**Teste:** Leve o personagem até o sol. O sol acende e o aviso muda. Toque na tecla R: o sol volta apagado.

**Se não funcionar:** Se nada acontecer, confira se o encontro usa personagem e sol. Não crie passo dentro do encontro: ela nasce em Ao iniciar, com 0, e o encontro só muda para 1.

### A lua pergunta a vez

**Relembre:** A lua só acende se o sol veio antes, ou seja, se passo é 1. Então ela pergunta com um Se: passo = 1? Se for, passo vira 2; senão, a tentativa recomeça.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com o sol, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha lua.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Na comparação x > 0, clique no x e escolha passo, troque o sinal de maior pelo sinal de igual e troque o 0 por 1. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
3. Dentro do então, encaixe Alterar variável, escolha passo e troque o 1 por 2.
4. Logo abaixo, ainda no então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha lua; no segundo, escolha pedra-lua-acesa.
5. Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A lua acendeu! Agora a estrela.
6. Dentro do senão, encaixe Alterar variável, escolha passo e troque o 1 por 0.
7. Logo abaixo, ainda no senão, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha sol; no segundo, escolha pedra-sol.
8. Embaixo, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha lua; no segundo, escolha pedra-lua.
9. Por último, ainda no senão, encaixe Alterar variável, escolha aviso, solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva Fora da ordem. Comece de novo pelo sol.

**Teste:** Toque o sol e depois a lua: as duas acendem. Toque na tecla R e toque a lua primeiro: nada acende e o aviso pede para começar pelo sol.

**Se não funcionar:** Se a lua acender sem o sol, confira a comparação: passo, o sinal de igual e o 1.

### A estrela abre o baú

**Relembre:** A estrela pergunta passo = 2. Se for a vez dela, ela acende e o baú abre; senão, a tentativa recomeça, como na lua.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com a lua, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha estrela.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Na comparação x > 0, clique no x e escolha passo, troque o sinal de maior pelo sinal de igual e troque o 0 por 2. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
3. Dentro do então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha estrela; no segundo, escolha pedra-estrela-acesa.
4. Logo abaixo, ainda no então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha bau; no segundo, escolha bau-aberto.
5. Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva Na ordem certa! O baú abriu.
6. Dentro do senão, monte o mesmo recomeço da lua: Alterar passo para 0, as trocas de volta do sol (pedra-sol) e da lua (pedra-lua) e o aviso Fora da ordem. Comece de novo pelo sol.

**Teste:** Toque o sol, a lua e a estrela: o baú abre. Toque na tecla R, toque o sol e a estrela: tudo apaga e o baú fica fechado. Sem começar outra partida, toque o sol, a lua e a estrela: o baú abre.

**Se não funcionar:** Se o baú abrir só com a estrela, confira se a pergunta do Se é passo igual a 2. Se ele nunca abrir, confira se a abertura do baú está dentro do então e não no senão.

## Aula 2 · Ilha 3D: Os símbolos da ilha

### O sol começa

**Relembre:** A variável passo guarda até onde a sequência chegou. Toda partida começa com 0; o encontro com o sol muda para 1 e acende o sol.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva passo. Deixe o valor 0.
3. Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha sol.
4. Dentro do fazer, encaixe Alterar variável, de Programação → Variáveis. Escolha passo e deixe o valor 1.
5. Logo abaixo, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha acender. Clique em heroi e escolha sol. No modo, escolha uma vez.
6. Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva O sol acendeu! Agora a lua.

**Teste:** Leve o personagem até o sol. O sol acende e o aviso muda. Toque na tecla R: o sol volta apagado.

**Se não funcionar:** Se nada acontecer, confira se o encontro usa personagem e sol. Não crie passo dentro do encontro: ela nasce em Ao iniciar, com 0, e o encontro só muda para 1.

### A lua pergunta a vez

**Relembre:** A lua só acende se o sol veio antes, ou seja, se passo é 1. Então ela pergunta com um Se: passo = 1? Se for, passo vira 2; senão, a tentativa recomeça.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com o sol, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha lua.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Na comparação x > 0, clique no x e escolha passo, troque o sinal de maior pelo sinal de igual e troque o 0 por 1. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
3. Dentro do então, encaixe Alterar variável, escolha passo e troque o 1 por 2.
4. Logo abaixo, ainda no então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha acender. Clique em heroi e escolha lua. No modo, escolha uma vez.
5. Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A lua acendeu! Agora a estrela.
6. Dentro do senão, encaixe Alterar variável, escolha passo e troque o 1 por 0.
7. Logo abaixo, ainda no senão, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha apagar. Clique em heroi e escolha sol. No modo, escolha uma vez.
8. Embaixo, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha apagar. Clique em heroi e escolha lua. No modo, escolha uma vez.
9. Por último, ainda no senão, encaixe Alterar variável, escolha aviso, solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva Fora da ordem. Comece de novo pelo sol.

**Teste:** Toque o sol e depois a lua: as duas acendem. Toque na tecla R e toque a lua primeiro: nada acende e o aviso pede para começar pelo sol.

**Se não funcionar:** Se a lua acender sem o sol, confira a comparação: passo, o sinal de igual e o 1.

### A estrela abre o baú

**Relembre:** A estrela pergunta passo = 2. Se for a vez dela, ela acende e o baú abre; senão, a tentativa recomeça, como na lua.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com a lua, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha estrela.
2. Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Na comparação x > 0, clique no x e escolha passo, troque o sinal de maior pelo sinal de igual e troque o 0 por 2. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
3. Dentro do então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha acender. Clique em heroi e escolha estrela. No modo, escolha uma vez.
4. Logo abaixo, ainda no então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha abrir. Clique em heroi e escolha bau. No modo, escolha uma vez.
5. Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva Na ordem certa! O baú abriu.
6. Dentro do senão, monte o mesmo recomeço da lua: Alterar passo para 0, Tocar a animação apagar no sol e na lua e o aviso Fora da ordem. Comece de novo pelo sol.

**Teste:** Toque o sol, a lua e a estrela: o baú abre. Toque na tecla R, toque o sol e a estrela: tudo apaga e o baú fica fechado. Sem começar outra partida, toque o sol, a lua e a estrela: o baú abre.

**Se não funcionar:** Se o baú abrir só com a estrela, confira se a pergunta do Se é passo igual a 2. Se ele nunca abrir, confira se a abertura do baú está dentro do então e não no senão.

## Entrega

Em cada aula, jogue uma partida inteira: abra o baú na ordem certa, erre a ordem e recomece pelo sol. Toque na tecla R e confira que o baú volta fechado.

Depois clique em Verificar projeto e corrija o que faltar.

Por fim, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
