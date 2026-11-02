# Roteiro de produção · Termine e recomece a corrida

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Quando o jogo marca a batida?

### Clipe `video-contato` · Quando o jogo marca a batida?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-contato`

**Na tela:** No "Sabe os carrinhos de bate-bate", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy e o Dino em dois carrinhos de bate-bate, ainda longe um do outro [na edição: meme do bate-bate]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar as áreas pontilhadas, sem mover o cacto. No "e estes botões aproximam e afastam o cacto", apontar os botões, sem clicar [apontar "Aproximar o cacto"] [apontar "Afastar o cacto"]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe os carrinhos de bate-bate? Em volta de cada carrinho tem um para-choque de borracha.

[engaging, energetic, conversational voice] No seu jogo, em volta de cada desenho também tem uma área, como esse para-choque. Quando o Dino e o cacto se aproximam, o jogo marca uma batida.

[curious] E o jogo marca a batida quando os desenhos se encostam ou quando as áreas se encostam?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, o retângulo pontilhado em volta do Dino e do cacto é a área de cada um, e estes botões aproximam e afastam o cacto.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare os desenhos e as áreas pontilhadas no momento em que aparece BATEU. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-contato-K1 | Debinha | 1 | cada desenho também tem uma área, como esse para-choque. Quando o Dino e o cacto se aproximam, o jogo marca uma batida. | E o jogo marca a batida quando os desenhos se encostam ou quando as áreas se encostam? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, o retângulo pontilhado em volta do | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-contato-K1`: entrada — Manter o meme do bate-bate até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência com o cacto longe, sem mexer nele.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/hitbox.ts`, na tela `packages/member-shell/src/components/scene-livre/hitbox.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Descubra quando o jogo reconhece a batida entre o cacto e o Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Encerre a partida na batida

### Clipe `video-batida-acaba-partida` · Encerre a partida na batida

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-batida-acaba-partida`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece a partida e deixe um cacto chegar no Dino. Tá vendo? A corrida continua, porque o jogo ainda não confere a batida.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O jogo marcou a batida quando as áreas se encostaram. Agora a gente vai fazer a batida terminar a partida!

[engaging, energetic, conversational voice] A batida é conferida em todo quadro, durante a partida, depois que os cactos andaram. Por isso, ela vai no então de Se jogando, dentro de A cada quadro do jogo, entre Desenhar o grupo cactos e o bloco que tira do grupo.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Desenhar o grupo cactos e Tirar do grupo quem sair da tela.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, pegue o bloco Para cada sprite do grupo que colidir com o sprite e solte nesse espaço.

[engaging, energetic, conversational voice] É este bloco que confere, em todo quadro, se algum cacto encostou no Dino.

[confident, clear, unhurried voice] Repare: o bloco chega com o grupo asteroides e o sprite nave. Clique em asteroides e escolha cactos. Depois, clique em nave e escolha dino.

[engaging, energetic, conversational voice] Na linha de baixo, chamar o sprite de chega com inimigo. Clique em inimigo e escreva cacto. É o nome que o seu jogo vai usar para o cacto que bateu.

[curious] E o que vai acontecer quando ele bater?

[engaging, energetic, conversational voice] A partida acaba: o estado muda para fim, o estado de quando a partida termina.

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro da colisão. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para e solte dentro da colisão.

[engaging, energetic, conversational voice] Ele chega com inicio: clique em inicio e escolha fim.

[engaging, energetic, conversational voice] Agora comece a partida e deixe um cacto bater no Dino. [interested, animated voice] Olha só: o Dino e os cactos somem, e ainda não aparece nenhuma tela de fim, porque as ações deles só acontecem no estado jogando, e agora o estado é fim! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: a colisão com o grupo cactos, o sprite dino e o nome cacto está no então de Se jogando, entre Desenhar o grupo cactos e o bloco que tira do grupo. Dentro dela, está Mudar o estado do jogo para fim. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-batida-acaba-partida-K1 | Debinha | 1 | de chega com inimigo. Clique em inimigo e escreva cacto. É o nome que o seu jogo vai usar para o cacto que bateu. | E o que vai acontecer quando ele bater? | A partida acaba: o estado muda para fim, o estado de quando a partida termina. Deixe à vista o espaço vazio dentro da | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-batida-acaba-partida-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora faça a batida terminar a partida! Coloque a colisão entre o Dino e os cactos dentro do Se jogando, mudando o estado para fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Mostre a tela de fim

### Clipe `video-mapa-do-jogo` · Mostre a tela de fim

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-mapa-do-jogo`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece a partida e deixe um cacto bater no Dino. Tá vendo? O Dino e os cactos somem, e só a floresta continua passando, porque o Se de A cada quadro do jogo ainda não tem um ramo para fim.

[engaging, energetic, conversational voice] Lembra da tela de início, na aula anterior? Você fez um ramo senão se para desenhar a abertura. Agora a gente vai fazer do mesmo jeito para a tela de fim.

[confident, clear, unhurried voice] Deixe à vista o Se de A cada quadro do jogo, que já tem os ramos jogando e inicio.

[interested, animated voice] Olha aqui: na linha de baixo do bloco Se, tem dois sinais de mais, um antes de senão se e outro antes de senão. Clique uma vez no primeiro, o que fica antes de senão se, para criar mais um ramo.

[engaging, energetic, conversational voice] O ramo novo chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Agora deixe à vista o lugar vazio da pergunta do último ramo. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha fim.

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro do ramo fim. Na mesma categoria, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte ali.

[engaging, energetic, conversational voice] É este bloco que desenha a tela de fim.

[engaging, energetic, conversational voice] No título, escreva Fim de jogo. No subtítulo, escreva Boa tentativa!

[engaging, energetic, conversational voice] Na dica, escreva Aperte qualquer tecla ou toque para jogar de novo.

[engaging, energetic, conversational voice] O fundo já chega escuro: mantenha ou escolha outra cor escura.

[engaging, energetic, conversational voice] Agora comece e deixe o Dino bater. [interested, animated voice] Olha só: a tela de fim aparece! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: o último ramo do Se de A cada quadro do jogo pergunta se o estado do jogo é fim, com a tela de fim dentro dele, e a colisão muda o estado para fim. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] A tela de fim ainda não recomeça a corrida, porque, por enquanto, você só montou o desenho.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora mostre a tela de fim! Acrescente mais um senão se ao Se de A cada quadro do jogo, para o estado fim, com a tela de fim dentro dele. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 4. Dê som e imagem à batida

### Clipe `video-batida-sentida` · Dê som e imagem à batida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-batida-sentida`

**Na tela:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Você já fez a batida encerrar a partida. Falta dar som e imagem a esse momento, para quem joga perceber o que aconteceu. Lembra da aula 4? Você ligou um som a um acontecimento, o pulo. Agora a gente vai fazer a mesma coisa com a batida, colocando os efeitos dentro dela.

[curious] O som vem antes de mostrar a tela de fim?

[engaging, energetic, conversational voice] Os efeitos vêm antes da mudança de estado: primeiro o jogo mostra a batida e, por último, passa para a tela de fim. Por isso, eles vão logo antes de Mudar o estado do jogo para fim, dentro da colisão.

[confident, clear, unhurried voice] Deixe à vista o lugar logo antes de Mudar o estado do jogo para fim.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite e solte antes da mudança de estado.

[engaging, energetic, conversational voice] É este bloco que faz o cacto que bateu explodir.

[confident, clear, unhurried voice] Repare: o sprite chega como asteroide. Clique em asteroide e escolha cacto, o nome que você deu ao cacto que bateu. Depois, escolha uma cor para a explosão.

[confident, clear, unhurried voice] Agora deixe à vista o espaço entre a explosão e a mudança de estado. Abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, pegue o bloco Tremer a tela e solte nesse espaço.

[engaging, energetic, conversational voice] É este bloco que faz a tela tremer na batida. Ele já chega com intensidade 8: mantenha.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Tremer a tela e a mudança de estado. Abra Jogo 2D, depois Som e depois Efeitos prontos, pegue o bloco Tocar efeito, solte ali e escolha derrota.

[engaging, energetic, conversational voice] Agora comece e deixe uma batida acontecer. [interested, animated voice] Olha só: o cacto explode, a tela treme, o som toca e aparece a tela de fim! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro da colisão, a ordem é explodir o cacto, tremer a tela em 8, tocar o efeito derrota e, por último, mudar o estado para fim. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-batida-sentida-K1 | Debinha | 1 | som a um acontecimento, o pulo. Agora a gente vai fazer a mesma coisa com a batida, colocando os efeitos dentro dela. | O som vem antes de mostrar a tela de fim? | Os efeitos vêm antes da mudança de estado: primeiro o jogo mostra a batida e, por último, passa para a tela de fim. Por | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-batida-sentida-K1`: entrada — Retomar a regra da batida com os blocos à vista, sem inserir efeitos ainda. Saída — Apontar o lugar antes de Mudar o estado do jogo para fim e montar a explosão e, depois, Tremer a tela, na ordem narrada.


**Recado na página (não gravar):** Agora dê som e imagem à batida! Dentro da colisão, antes de mudar para fim, exploda o cacto, trema a tela em 8 e toque o som de derrota. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 5. Voltar ou começar tudo de novo?

### Clipe `video-trocar-nao-limpa` · Voltar ou começar tudo de novo?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-trocar-nao-limpa`

**Na tela:** No "Sabe quando você termina um jogo de tabuleiro", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Dino diante de um tabuleiro no fim da partida, pensando em como recomeçar [na edição: meme do tabuleiro]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar as escolhas, sem clicar [apontar "Só voltar para a tela de início"] [apontar "Começar tudo de novo"]. No "e este botão faz o papel do toque", apontar o botão, sem clicar [apontar "Tocar na tela"]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe quando você termina um jogo de tabuleiro e quer jogar de novo? Dá para só dizer “de novo!” e voltar a jogar, ou recolher tudo e arrumar o tabuleiro do zero.

[engaging, energetic, conversational voice] No seu jogo, quando a partida acaba, o toque pode fazer duas coisas: só voltar para a tela de início, ou começar tudo de novo.

[curious] E qual é a diferença entre os dois?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, você escolhe o que o toque faz no fim da partida, e este botão faz o papel do toque.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare os cactos que ficam na pista quando uma partida nova começa, quando o toque do fim só volta para a tela de início e quando ele começa tudo de novo. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-trocar-nao-limpa-K1 | Debinha | 1 | jogo, quando a partida acaba, o toque pode fazer duas coisas: só voltar para a tela de início, ou começar tudo de novo. | E qual é a diferença entre os dois? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, você escolhe o que o toque faz no | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-trocar-nao-limpa-K1`: entrada — Manter o meme do tabuleiro até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência sem jogar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/restart.ts`, na tela `packages/member-shell/src/components/scene-livre/dino/restart.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Descubra o que muda na partida nova em cada jeito de o toque recomeçar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 6. Prepare uma nova partida

### Clipe `video-caminho-de-volta` · Prepare uma nova partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-caminho-de-volta`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Deixe um cacto bater e toque na tela de fim. Tá vendo? Nada acontece, porque o toque ainda não tem resposta no estado fim.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Começando tudo de novo, a partida nova vinha sem os cactos antigos. Agora a gente vai programar o recomeço!

[engaging, energetic, conversational voice] No fim da partida, o mesmo toque vai fazer outra coisa. Por isso, o recomeço vai no mesmo evento que começa a partida, num ramo novo do Se: senão se o estado do jogo é fim.

[confident, clear, unhurried voice] Deixe à vista o Se inicio, dentro de Quando apertar qualquer tecla ou tocar na tela.

[engaging, energetic, conversational voice] Na linha de baixo desse Se, tem dois sinais de mais, um antes de senão se e outro antes de senão. Clique uma vez no primeiro, o que fica antes de senão se.

[engaging, energetic, conversational voice] O ramo novo chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira.

[curious] E como ele volta para o começo?

[engaging, energetic, conversational voice] Com um bloco que começa tudo de novo, no estado fim.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio da pergunta desse ramo. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha fim.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio dentro do ramo fim. Na mesma categoria, pegue o bloco Reiniciar o jogo e solte ali.

[engaging, energetic, conversational voice] É este bloco que começa tudo de novo: ele repete a preparação de Ao iniciar, cria de novo o grupo de cactos, vazio, e devolve o estado para inicio.

[engaging, energetic, conversational voice] Agora comece, deixe uma batida acontecer e toque na tela de fim. [interested, animated voice] Olha só: a abertura volta! Toque outra vez para jogar e repare que os cactos da partida anterior não estão mais na pista. [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no evento de qualquer tecla ou toque, o Se tem o ramo inicio, que muda para jogando, e o ramo senão se fim, com Reiniciar o jogo. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-caminho-de-volta-K1 | Debinha | 1 | o que fica antes de senão se. O ramo novo chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira. | E como ele volta para o começo? | Com um bloco que começa tudo de novo, no estado fim. Deixe à vista o lugar vazio da pergunta desse ramo. Abra Jogo 2D, | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-caminho-de-volta-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora prepare uma nova partida! No evento de qualquer tecla ou toque, acrescente um senão se fim com Reiniciar o jogo. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 7. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam do começo da partida, da batida e do recomeço. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 8. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o seu jogo tem um ciclo completo: começo, partida, batida e recomeço! Antes de enviar o seu projeto, comece uma partida, pule um cacto, deixe uma batida acontecer e confira os efeitos e a tela de fim.

[engaging, energetic, conversational voice] Depois, toque para voltar à abertura e comece outra partida. [confident, clear, unhurried voice] Confira que o Dino volta ao lugar do começo e que os cactos antigos não continuam na pista. Teste também a entrada por tecla: clique em Atualizar e, sem clicar no jogo, use uma tecla para começar.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue uma partida inteira, do começo ao recomeço, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
