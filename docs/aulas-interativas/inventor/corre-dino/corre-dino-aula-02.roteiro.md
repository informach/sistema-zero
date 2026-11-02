# Roteiro de produção · Mostre o Dino e a floresta

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Desenhar uma vez ou em todo quadro?

### Clipe `video-quadros` · Desenhar uma vez ou em todo quadro?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-quadros`

**Na tela:** No "Lembra do desenho animado", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy folheando um monte de folhas de desenho, um quadro em cada folha [na edição: meme das folhas de desenho]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar as escolhas [apontar "Desenhar só no começo"] [apontar "Apagar a tela antes de desenhar"]. No "Este botão passa um quadro", apontar o botão, sem clicar [apontar "Avançar 1 quadro"]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra do desenho animado, um quadro atrás do outro? No seu jogo, o Dino pode mudar de lugar por dentro do jogo, mas a tela só mostra o que foi desenhado nela.

[curious] E se o Dino for desenhado em todo quadro, sem apagar a tela?

[engaging, energetic, conversational voice] O que você acha que aparece? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, você escolhe quando o Dino é desenhado e se a tela é apagada antes de cada desenho. Este botão passa um quadro.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare a tela quando o Dino é desenhado só no começo, em todo quadro sem apagar a tela e em todo quadro apagando a tela antes. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-quadros-K1 | Dedé | 1 | do outro? No seu jogo, o Dino pode mudar de lugar por dentro do jogo, mas a tela só mostra o que foi desenhado nela. | E se o Dino for desenhado em todo quadro, sem apagar a tela? | O que você acha que aparece? Isso você vai testar na experiência. Olha aqui: nesta experiência, você escolhe quando o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-quadros-K1`: entrada — Manter o meme das folhas de desenho até o fim da frase. Saída — Depois da saída, voltar à experiência parada, sem passar quadros.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`, na tela `packages/member-shell/src/components/scene-livre/draw-loop.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Descubra o que a tela mostra em cada jeito de desenhar o Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Mostre o Dino a cada quadro

### Clipe `video-motor-e-dino` · Mostre o Dino a cada quadro

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-motor-e-dino`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe a área do seu jogo. Tá vendo? O Dino não aparece, porque nada manda desenhar ele.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O Dino só acompanhou o movimento quando foi desenhado de novo em cada quadro. Agora a gente vai fazer o seu Dino aparecer!

[engaging, energetic, conversational voice] O que acontece sempre, enquanto o jogo roda, fica numa área própria, chamada Enquanto estiver rodando.

[confident, clear, unhurried voice] Deixe à vista um espaço vazio ao lado de Ao iniciar. Depois, abra Áreas do projeto, pegue Enquanto estiver rodando e solte nesse espaço, separada de Ao iniciar.

[engaging, energetic, conversational voice] É esta área que cuida do que continua acontecendo, sempre, enquanto o jogo roda.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio dentro de Enquanto estiver rodando.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Tempo e depois Quadros e intervalos, pegue o bloco A cada quadro do jogo e solte dentro dessa área.

[engaging, energetic, conversational voice] É este bloco que faz o que está dentro dele acontecer de novo em cada quadro.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, pegue o bloco Desenhar o sprite e solte dentro de A cada quadro do jogo.

[engaging, energetic, conversational voice] No jogo, o Dino é um sprite, que é um personagem do jogo que você pode programar. É este bloco que desenha um sprite na tela.

[confident, clear, unhurried voice] Repare: o bloco chega com o nome jogador. Clique em jogador e escolha dino.

[engaging, energetic, conversational voice] Agora olhe a área do jogo: o Dino aparece, parado no lugar em que foi criado! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Criar dinossauro continua em Ao iniciar, e Desenhar o sprite dino está dentro de A cada quadro do jogo, em Enquanto estiver rodando, com o nome dino nos dois blocos. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora faça o seu Dino aparecer! Coloque A cada quadro do jogo em Enquanto estiver rodando e, dentro dele, Desenhar o sprite dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Prepare uma imagem nova em cada quadro

### Clipe `video-limpeza` · Prepare uma imagem nova em cada quadro

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-limpeza`

**Na tela:** Mostrar o projeto no estado de entrada. No “olhe a sombra do Dino”, aproximar a sombra embaixo do Dino e deixar ver que ela escurece a cada quadro (conferir na gravação); depois da limpeza, mostrar a sombra clara de novo. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, olhe a sombra do Dino. Tá vendo? Ela vai ficando escura, porque cada desenho novo cai em cima do velho.

[curious] E como tira essa sombra escura?

[engaging, energetic, conversational voice] É isso que a gente vai resolver. Lembra da experiência da primeira parte desta aula? Apagando a tela antes de cada desenho, ficava um Dino só. Agora a gente vai colocar essa limpeza!

[engaging, energetic, conversational voice] A limpeza tem que vir antes do desenho, em todo quadro: primeiro o jogo apaga a imagem velha e, depois, desenha a nova. Por isso, ela vai no começo de A cada quadro do jogo, logo antes de Desenhar o sprite.

[confident, clear, unhurried voice] Deixe à vista o lugar logo antes de Desenhar o sprite, no começo de A cada quadro do jogo.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, pegue o bloco Limpar a tela e solte nesse primeiro lugar.

[engaging, energetic, conversational voice] É este bloco que apaga a imagem velha, no começo de cada quadro.

[engaging, energetic, conversational voice] Agora olhe o Dino: ele continua aparecendo, e a sombra embaixo dele volta a ficar clarinha, porque agora cada quadro começa com a tela limpa! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, primeiro vem Limpar a tela e, logo abaixo, Desenhar o sprite dino. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Limpar a tela só apaga a imagem: o Dino que você criou continua no jogo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-limpeza-K1 | Dedé | 1 | no seu jogo, olhe a sombra do Dino. Tá vendo? Ela vai ficando escura, porque cada desenho novo cai em cima do velho. | E como tira essa sombra escura? | É isso que a gente vai resolver. Lembra da experiência da primeira parte desta aula? Apagando a tela antes de cada | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-limpeza-K1`: entrada — Aproximar a sombra que escurece, antes de pegar qualquer bloco. Saída — Retomar a experiência e montar a limpeza antes do desenho, com todos os encaixes e testes.


**Recado na página (não gravar):** Agora prepare uma imagem nova em cada quadro! Coloque Limpar a tela antes de Desenhar o sprite dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 4. Quem fica na frente?

### Clipe `video-camadas` · Quem fica na frente?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-camadas`

**Na tela:** No "Sabe quando você cola figurinhas", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy com as figurinhas do Dino e da floresta na mão, escolhendo qual colar primeiro no álbum [na edição: meme das figurinhas]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar os botões, sem clicar [apontar "Desenhar o Dino por último"] [apontar "Desenhar a floresta por último"]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você cola figurinhas num álbum, umas por cima das outras? A ordem em que você cola faz diferença.

[engaging, energetic, conversational voice] A tela do jogo também é montada assim: em cada quadro, o jogo desenha uma coisa depois da outra, na mesma tela. No seu jogo, vão ser desenhados o Dino e a floresta.

[curious] E se a floresta for desenhada depois do Dino, quem fica na frente?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, estes dois botões escolhem quem é desenhado por último, o Dino ou a floresta.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare a tela quando o Dino é desenhado por último e quando a floresta é desenhada por último. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-camadas-K1 | Dedé | 1 | quadro, o jogo desenha uma coisa depois da outra, na mesma tela. No seu jogo, vão ser desenhados o Dino e a floresta. | E se a floresta for desenhada depois do Dino, quem fica na frente? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, estes dois botões escolhem quem é | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-camadas-K1`: entrada — Manter o meme das figurinhas até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem trocar a ordem.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`, na tela `packages/member-shell/src/components/scene-livre/layers.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Descubra o que muda na tela quando a ordem dos desenhos muda. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 5. Coloque a floresta atrás do Dino

### Clipe `video-ordem-certa` · Coloque a floresta atrás do Dino

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-ordem-certa`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe a área do seu jogo. Tá vendo? O Dino está sozinho no fundo azul, porque o jogo ainda não desenha a floresta.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O Dino só apareceu inteiro quando foi desenhado depois da floresta. Agora a gente vai colocar a floresta atrás dele!

[engaging, energetic, conversational voice] A floresta tem que ficar atrás do Dino, e quem é desenhado por último fica na frente. Por isso, ela vai entre Limpar a tela e Desenhar o sprite, dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Limpar a tela e Desenhar o sprite.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Cenários e depois Fundos, pegue o bloco Desenhar fundo de floresta e solte entre a limpeza e o desenho do Dino.

[engaging, energetic, conversational voice] É este bloco que desenha a floresta, atrás do que vem depois dele.

[curious] A floresta já está andando! Dá para ela andar mais rápido?

[engaging, energetic, conversational voice] Dá, sim. [confident, clear, unhurried voice] Repare: o bloco chega com velocidade 4. Clique no 4 e troque por 5, porque um número maior deixa o fundo mais rápido, e é o fundo andando que faz o Dino parecer correr pela floresta.

[engaging, energetic, conversational voice] Agora olhe a área do jogo: a floresta passa atrás do Dino! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, primeiro vem Limpar a tela, depois Desenhar fundo de floresta, com velocidade 5, e, por último, Desenhar o sprite dino, com uma floresta só. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-ordem-certa-K1 | Dedé | 1 | e solte entre a limpeza e o desenho do Dino. É este bloco que desenha a floresta, atrás do que vem depois dele. | A floresta já está andando! Dá para ela andar mais rápido? | Dá, sim. Repare: o bloco chega com velocidade 4. Clique no 4 e troque por 5, porque um número maior deixa o fundo mais | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-ordem-certa-K1`: entrada — Soltar a floresta entre a limpeza e o desenho do Dino e deixar a prévia à vista, com a floresta já passando na velocidade 4 que vem no bloco. Não mudar o número antes da pergunta. Saída — Só então trocar a velocidade de 4 para 5, no ritmo da próxima fala. Manter livres o campo, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora deixe a floresta atrás do seu Dino! Coloque Desenhar fundo de floresta, com velocidade 5, entre a limpeza e o desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 6. Retire a borda de teste

### Clipe `video-retirar-borda` · Retire a borda de teste

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-retirar-borda`

**Na tela:** Mostrar o projeto no estado de entrada. No “Repare” da abertura, apontar no jogo ou no projeto o que ainda falta. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[confident, clear, unhurried voice] Repare: agora que a floresta mostra onde fica a área do jogo, a borda não faz mais falta. Ela serviu para você enxergar o tamanho da tela. Por isso, retire só a borda e deixe o resto como está.

[interested, animated voice] Olha aqui: dentro de Ao iniciar, a borda está entre a preparação da tela e Criar dinossauro. Se você puxar a borda, Criar dinossauro sai junto, porque está encaixado embaixo dela.

[engaging, energetic, conversational voice] Por isso, primeiro arraste Criar dinossauro para um espaço vazio.

[engaging, energetic, conversational voice] Agora arraste Mostrar a borda da tela para a lixeira.

[engaging, energetic, conversational voice] Por último, encaixe Criar dinossauro logo abaixo de Preparar o jogo em tela cheia.

[engaging, energetic, conversational voice] Agora olhe a área do jogo: a floresta continua passando, e o Dino continua aparecendo, agora sem a borda! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Ao iniciar tem Preparar o jogo em tela cheia e, logo abaixo, Criar dinossauro, sem a borda. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora retire a borda de teste! Tire só Mostrar a borda da tela e deixe Criar dinossauro em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 7. O que o leitor de tela conta?

### Clipe `video-descricao` · O que o leitor de tela conta?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-descricao`

**Na tela:** No "Sabe quando você explica um jogo", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy ao telefone, falando com um amigo do outro lado da linha [na edição: meme do telefone]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar o botão, sem clicar [apontar "Ouvir a tela"]. No "Depois da primeira escuta, aparece um campo", manter a experiência sem escuta: o campo Descrição do jogo só abre depois da primeira escuta, que fica para a criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você explica um jogo para alguém pelo telefone? A pessoa do outro lado não vê nada, só ouve o que você conta.

[engaging, energetic, conversational voice] Tem gente que joga sem enxergar bem a tela. Essa pessoa usa um leitor de tela, um programa que lê a tela em voz alta.

[curious] E o leitor de tela consegue contar como se joga o Corre, Dino?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, este botão faz o leitor ler a tela do jogo. Depois da primeira escuta, aparece um campo para você escrever uma frase.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare o que o leitor diz com o campo vazio e com uma frase que conta o que fazer e como jogar. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-descricao-K1 | Dedé | 1 | Tem gente que joga sem enxergar bem a tela. Essa pessoa usa um leitor de tela, um programa que lê a tela em voz alta. | E o leitor de tela consegue contar como se joga o Corre, Dino? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, este botão faz o leitor ler a tela | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-descricao-K1`: entrada — Manter o meme do telefone até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem clicar em Ouvir a tela.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/screen-reader.ts`, na tela `packages/member-shell/src/components/scene-livre/screen-reader.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Descubra o que uma pessoa que usa leitor de tela ouve do seu jogo. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 8. Escreva a descrição do jogo

### Clipe `video-descrever-jogo` · Escreva a descrição do jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-descrever-jogo`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte não aparece na tela: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com a frase, o leitor de tela contava o que fazer e como jogar. Agora você vai escrever a descrição do seu jogo!

[engaging, energetic, conversational voice] A descrição vale para o jogo inteiro, desde o começo. Por isso, ela vai em Ao iniciar, logo abaixo de Preparar o jogo em tela cheia.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Preparar o jogo em tela cheia e Criar dinossauro.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Descrever o jogo para leitor de tela e solte nesse espaço.

[curious] Essa frase vai ficar escrita no jogo?

[engaging, energetic, conversational voice] Não, ela não aparece na tela. É este bloco que guarda a frase que o leitor de tela lê em voz alta.

[engaging, energetic, conversational voice] No texto, apague a frase que veio no bloco e escreva esta, exatamente assim, sem ponto no fim: Corra com o dino e pule os cactos apertando espaço.

[engaging, energetic, conversational voice] O pulo ainda vai ser montado, mas tudo bem: a frase descreve o jogo completo.

[confident, clear, unhurried voice] Confira se ficou assim: em Ao iniciar, logo abaixo da preparação da tela, está Descrever o jogo para leitor de tela, com a frase inteira. O Dino e a floresta continuam aparecendo como antes.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-descrever-jogo-K1 | Dedé | 1 | depois Jogo e telas e depois Telas e partida, pegue o bloco Descrever o jogo para leitor de tela e solte nesse espaço. | Essa frase vai ficar escrita no jogo? | Não, ela não aparece na tela. É este bloco que guarda a frase que o leitor de tela lê em voz alta. No texto, apague a | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-descrever-jogo-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora conte como se joga o seu jogo! Escreva na descrição a frase Corra com o dino e pule os cactos apertando espaço, sem ponto no fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 9. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[interested, animated voice] Olha só: o seu jogo já mostra o Dino na frente da floresta! Antes de enviar o seu projeto, vamos conferir tudo. Olhe a área do jogo: a floresta tem que passar atrás, e o Dino tem que continuar aparecendo.

[engaging, energetic, conversational voice] Agora confira a ordem dentro de A cada quadro do jogo: limpar a tela, a floresta com velocidade 5 e o desenho do Dino. [confident, clear, unhurried voice] Confira também que a borda saiu e que a descrição está em Ao iniciar.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Confira o Dino na frente da floresta, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
