# Passo a passo do projeto — Moedas no caminho

Poder do Faísca. Aqui está cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.

## Aula 1 · Jogo 2D: Cada moeda conta

### Crie o contador

**Relembre:** A variável moedas guarda quantas moedas o personagem já pegou. Toda partida começa com zero.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar.
3. O bloco chega com contador. Clique em contador, apague e escreva moedas. O valor já vem em 0; deixe assim.

**Teste:** O número ainda não aparece na tela. Confira se o bloco está dentro de Ao iniciar, com o nome moedas e o valor 0.

**Se não funcionar:** Não crie a variável dentro de A cada quadro: isso voltaria o número para zero o tempo todo. Use sempre o mesmo nome, moedas, nos outros blocos.

### Cada moeda soma um

**Relembre:** O encontro com alguma moeda do grupo é o evento. A reação tira essa moeda do jogo e soma 1 em moedas. Como a moeda sai, ela não conta de novo.

1. Encontre a área Quando acontecer. Deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos.
2. Abra Jogo 2D → Colisões → Encostar e bloquear. Pegue Quando o sprite começar a encostar em algum do grupo, chamando de, e encaixe nesse espaço. Clique em jogador e escolha personagem. Clique em moedas e escolha moedasDoCaminho. O último nome já vem moeda; deixe assim.
3. Deixe à vista o espaço ao lado de fazer, dentro desse encontro. Abra Jogo 2D → Grupos → Participação e limpeza. Pegue Tirar o sprite do grupo e encaixe ali. Clique em asteroide e escolha moeda. Clique em asteroides e escolha moedasDoCaminho.
4. Embaixo de Tirar o sprite do grupo, ainda dentro do fazer, encaixe Somar em variável, de Programação → Variáveis. Clique em contador e escolha moedas. O número já vem em 1; deixe assim.

**Teste:** Leve o personagem pelas moedas do caminho. Cada uma deve sumir no encontro. Volte ao lugar de uma moeda que já sumiu: nada acontece.

**Se não funcionar:** Se a moeda não sumir, confira se o grupo é moedasDoCaminho nos dois blocos e se Tirar o sprite do grupo usa moeda. Se o número contar várias vezes a mesma moeda, falta tirar a moeda do grupo.

### Mostre as moedas na tela

**Relembre:** O número fica guardado em moedas. Para vê-lo, um bloco que roda a cada quadro escreve esse valor na tela.

1. Encontre a área Enquanto estiver rodando. Dentro de A cada quadro do jogo, deixe à vista o fim dele, depois do último bloco, Escrever.
2. Abra Jogo 2D → Vida e placar → Indicadores e texto na tela. Pegue Mostrar placar e encaixe no fim de A cada quadro do jogo.
3. Clique em Pontos:, apague e escreva Moedas:.
4. O valor chega com 0. Abra Programação → Valores, pegue valor da variável e solte em cima do 0. Clique no x e escolha moedas.
5. No x do placar, troque 12 por 38. No y, troque 30 por 60. A cor já vem branca; deixe assim. No tamanho, troque 24 por 20.

**Teste:** O número começa em 0 e sobe de um em um a cada moeda. Volte ao lugar de uma moeda pega: o número continua igual. Pressione R: o número volta para 0 e as moedas voltam.

**Se não funcionar:** Se aparecer sempre 0, o valor ficou com o número 0 em vez de valor da variável moedas. Se o número não aparecer, confira se o bloco está dentro do A cada quadro.

### O baú pede pelo menos 5

**Relembre:** O encontro com o baú pergunta se moedas é maior ou igual a 5. Sim escolhe o então, que abre o baú. Não escolhe o senão, que avisa o que falta.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com as moedas, fora do fazer dele. Abra Jogo 2D → Colisões → Encostar e bloquear, pegue Quando o sprite começar a encostar no sprite e encaixe nesse espaço. Clique em jogador e escolha personagem. Clique em inimigo e escolha bau.
2. Dentro do fazer desse encontro, encaixe Se, de Programação → Lógica e Se. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
3. O Se chega com a pergunta x > 0. Clique no x e escolha moedas. Clique no sinal > e escolha ≥, o maior ou igual. Clique no 0 e coloque 5.
4. Dentro do então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha bau; no segundo, escolha bau-aberto.
5. Embaixo dele, ainda no então, encaixe Alterar variável, de Programação → Variáveis. Escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva O baú abriu! Você juntou moedas suficientes.
6. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva O baú pede pelo menos 5 moedas.

**Teste:** Pressione R e vá direto ao baú, sem moedas: ele fica fechado e o aviso pede pelo menos 5. Pegue as cinco moedas do caminho e volte: ele abre. Pressione R: o baú volta fechado e o número volta para 0.

**Se não funcionar:** Se o baú abrir sem moedas, confira se a abertura está dentro do então e se a pergunta é moedas ≥ 5. Se com cinco ele não abrir, confira o sinal: com > (só maior) ele pediria seis; com = ele não abriria com seis.

## Aula 2 · Ilha 3D: Moedas na ilha

### Crie o contador

**Relembre:** A variável moedas guarda quantas moedas o personagem já pegou. Toda partida começa com zero.

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.
2. Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar.
3. O bloco chega com contador. Clique em contador, apague e escreva moedas. O valor já vem em 0; deixe assim.

**Teste:** O número ainda não aparece na tela. Confira se o bloco está dentro de Ao iniciar, com o nome moedas e o valor 0.

**Se não funcionar:** Não crie a variável dentro de A cada quadro: isso voltaria o número para zero o tempo todo. Use sempre o mesmo nome, moedas, nos outros blocos.

### Cada moeda soma um

**Relembre:** O encontro com alguma moeda do grupo é o evento. A reação tira essa moeda do jogo e soma 1 em moedas. Como a moeda sai, ela não conta de novo.

1. Encontre a área Quando acontecer. Deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos.
2. Abra Jogo 3D → Encostar. Pegue Quando encostar em algum do grupo, chamando de, e encaixe nesse espaço. Clique em heroi e escolha personagem. No grupo, clique em estrelas e escolha moedasDoCaminho. No último nome, clique em item e escreva moeda.
3. Deixe à vista o espaço ao lado de fazer, dentro desse encontro. Abra Jogo 3D → Objetos → Sumir. Pegue Remover da cena e encaixe ali. Clique em objeto e escolha moeda. A cena já vem cena; deixe assim.
4. Embaixo de Remover da cena, ainda dentro do fazer, encaixe Somar em variável, de Programação → Variáveis. Clique em contador e escolha moedas. O número já vem em 1; deixe assim.

**Teste:** Caminhe pela trilha até o farol. As cinco moedas do caminho devem sumir uma a uma. Volte pelo caminho: nada acontece nos lugares vazios.

**Se não funcionar:** Se a moeda não sumir, confira se o grupo é moedasDoCaminho e se Remover da cena usa moeda. Se o número contar várias vezes a mesma moeda, falta Remover da cena dentro do encontro.

### Mostre as moedas na tela

**Relembre:** O número fica guardado em moedas. Para vê-lo, um bloco que roda a cada quadro escreve esse valor na tela.

1. Encontre a área Enquanto estiver rodando. Dentro de A cada quadro da cena, deixe à vista o espaço depois do último bloco.
2. Abra Jogo 3D → Placar, vida e telas → Na tela. Pegue Escrever na tela e encaixe ali. O canto já vem em cima, à esquerda; deixe assim.
3. O texto chega com Pegue as estrelas!. Abra Programação → Valores, pegue valor da variável e solte em cima desse texto. Clique no x e escolha moedas.

**Teste:** O número começa em 0 e sobe de um em um a cada moeda. Volte ao lugar de uma moeda pega: o número continua igual. Pressione R: o número volta para 0 e as moedas voltam.

**Se não funcionar:** Se aparecer sempre 0, o valor ficou com o número 0 em vez de valor da variável moedas. Se o número não aparecer, confira se o bloco está dentro do A cada quadro.

### O baú pede pelo menos 5

**Relembre:** O encontro com o baú pergunta se moedas é maior ou igual a 5. Sim escolhe o então, que abre o baú. Não escolhe o senão, que avisa o que falta.

1. Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com as moedas, fora do fazer dele. Abra Jogo 3D → Encostar, pegue Quando encostar em e encaixe nesse espaço. O primeiro nome já vem personagem; deixe assim. Clique em chave e escolha bau.
2. Dentro do fazer desse encontro, encaixe Se, de Programação → Lógica e Se. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
3. O Se chega com a pergunta x > 0. Clique no x e escolha moedas. Clique no sinal > e escolha ≥, o maior ou igual. Clique no 0 e coloque 5.
4. Dentro do então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha abrir. Clique em heroi e escolha bau. No modo, escolha uma vez.
5. Embaixo dele, ainda no então, encaixe Alterar variável, de Programação → Variáveis. Escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva O baú abriu! Você juntou moedas suficientes.
6. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva O baú pede pelo menos 5 moedas.

**Teste:** Pressione R e vá direto ao baú, sem moedas: ele fica fechado e o aviso pede pelo menos 5. Pegue as cinco moedas do caminho e volte: ele abre. Pressione R: o baú volta fechado e o número volta para 0.

**Se não funcionar:** Se o baú abrir sem moedas, confira se a abertura está dentro do então e se a pergunta é moedas ≥ 5. Se com cinco ele não abrir, confira o sinal: com > (só maior) ele pediria seis; com = ele não abriria com seis.

## Entrega

Em cada aula, jogue uma partida inteira, pressione R e confira que o número volta para 0 e o baú volta fechado. Clique em Verificar projeto, corrija o que faltar, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.
