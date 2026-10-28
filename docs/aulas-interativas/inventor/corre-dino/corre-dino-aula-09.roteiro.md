# Roteiro de produção · Termine e recomece a corrida

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Observe quando o jogo reconhece a batida

### Clipe `video-contato` · Observe quando o jogo reconhece a batida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-contato`

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a área em 100% e o cacto longe. Diminuir a Distância do cacto um passo por vez, com as áreas pontilhadas à vista. Parar no primeiro BATEU! e apontar o vão entre os desenhos. Meme ilustrado na frase da comparação, por 2 a 3 segundos: dois carrinhos de bate-bate, com os para-choques se encostando e o restante dos carros ainda separado. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender a colisão, o jeito que o jogo decide que o cacto bateu no Dino.

[interested, animated voice] Olha aqui: com Tamanho da área do Dino em 100%, eu aproximo o cacto com Distância do cacto, um pouco de cada vez. Em volta do Dino e do cacto há áreas pontilhadas. Enquanto elas não se encostam, nada acontece.

[engaging, energetic, conversational voice] Quando as áreas pontilhadas se encostam, aparece BATEU! Mas os desenhos ainda têm um espacinho entre eles.

[curious] Ué, a batida aconteceu antes de os desenhos encostarem?

[engaging, energetic, conversational voice] O jogo não olha o desenho: ele confere se as áreas se encostaram.

[engaging, energetic, conversational voice] É como os carrinhos de bate-bate: o para-choque encosta primeiro, antes de o resto do carro chegar perto. No seu jogo, você vai usar essa batida para encerrar a partida.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-contato-K1 | Debinha | 1 | acontece. Quando as áreas pontilhadas se encostam, aparece BATEU! Mas os desenhos ainda têm um espacinho entre eles. | Ué, a batida aconteceu antes de os desenhos encostarem? | O jogo não olha o desenho: ele confere se as áreas se encostaram. É como os carrinhos de bate-bate: o para-choque | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-contato-K1`: entrada — Aproximar até BATEU! e apontar o vão entre os desenhos e as áreas que se tocam. Saída — Manter as áreas pontilhadas à vista enquanto explica como a batida é decidida.


**Recado na página (não gravar):** Sua vez! Aproxime o cacto aos poucos até aparecer BATEU! Quando terminar, clique em Próxima parte.

## Seção 2. Encerre a partida na batida

### Clipe `video-batida-acaba-partida` · Encerre a partida na batida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-batida-acaba-partida`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece a partida e deixe um cacto chegar no Dino. Tá vendo? A corrida continua, porque o jogo ainda não confere a batida.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O jogo marcou a batida quando as áreas se encostaram. Agora a gente vai fazer a batida terminar a partida!

[engaging, energetic, conversational voice] A batida é conferida em todo quadro, durante a partida, depois que os cactos andaram. Por isso, deixe à vista o espaço entre Desenhar o grupo cactos e a regra que tira do grupo, no então de Se jogando, dentro do quadro. Depois, abra Jogo 2D, depois Colisões e depois Encostar e bloquear, pegue o bloco Para cada sprite do grupo que colidir com o sprite e solte nesse espaço.

[engaging, energetic, conversational voice] Escolha o grupo cactos e o sprite dino. [confident, clear, unhurried voice] Repare na linha chamar o sprite de: ela chega com inimigo. Clique em inimigo e escreva cacto. É o nome que o seu jogo vai usar para o cacto que bateu.

[curious] E o que vai acontecer quando ele bater?

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio dentro da colisão. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para e solte dentro da colisão. Escolha fim.

[engaging, energetic, conversational voice] Agora comece a partida e deixe um cacto bater no Dino. [interested, animated voice] Olha só: o Dino e os cactos somem, e ainda não aparece nenhuma tela de fim, porque as ações deles só acontecem no estado jogando, e agora o estado é fim! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: a colisão com o grupo cactos, o sprite dino e o nome cacto está no então de Se jogando, entre Desenhar o grupo cactos e a regra que tira do grupo. Dentro dela, está Mudar o estado do jogo para fim. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-batida-acaba-partida-K1 | Debinha | 1 | de: ela chega com inimigo. Clique em inimigo e escreva cacto. É o nome que o seu jogo vai usar para o cacto que bateu. | E o que vai acontecer quando ele bater? | Agora deixe à vista o espaço vazio dentro da colisão. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue | [curious] |

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
[engaging, energetic, conversational voice] A batida já muda o seu jogo para fim. Primeiro, comece a partida e deixe um cacto bater no Dino. Tá vendo? O Dino e os cactos somem, e só a floresta continua passando, porque o Se do quadro ainda não tem uma resposta para fim. Lembra da abertura, na aula anterior? Você fez um ramo senão se para desenhar a tela de início. Agora a gente vai fazer do mesmo jeito para a tela de fim.

[confident, clear, unhurried voice] Deixe à vista o Se do quadro, que já tem os ramos jogando e inicio. Na linha de baixo do bloco, clique uma vez no + ao lado de senão se, para criar mais um senão se. O ramo novo chega com a pergunta x > 0: arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Agora deixe à vista o lugar vazio da pergunta do último ramo. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ?, solte nesse lugar e escolha fim.

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro do ramo fim. Na mesma categoria, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte ali. No título, escreva Fim de jogo. No subtítulo, escreva Boa tentativa! E, na dica, escreva Aperte qualquer tecla ou toque para jogar de novo. O fundo já chega escuro: mantenha ou escolha outra cor escura.

[engaging, energetic, conversational voice] Agora comece e deixe o Dino bater. [interested, animated voice] Olha só: a tela de fim aparece! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: o último ramo do Se do quadro pergunta se o estado do jogo é fim, com a tela de fim dentro dele, e a colisão muda o estado para fim. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] A tela de fim ainda não recomeça a corrida, porque, por enquanto, você só montou o desenho.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora mostre a tela de fim! Acrescente mais um senão se ao Se do quadro, para o estado fim, com a tela de fim dentro dele. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 4. Dê som e imagem à batida

### Clipe `video-batida-sentida` · Dê som e imagem à batida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-batida-sentida`

**Na tela:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Você já fez a batida encerrar a partida. Falta dar som e imagem a esse momento, para quem joga perceber o que aconteceu. Lembra da aula 4? Você ligou um som a um acontecimento, o pulo. Agora a gente vai fazer a mesma coisa com a batida, colocando os efeitos dentro dela.

[curious] O som vem antes de mostrar a tela de fim?

[engaging, energetic, conversational voice] Os efeitos vêm antes da mudança de estado: primeiro o jogo mostra a batida e, por último, passa para a tela de fim. Por isso, deixe à vista o lugar logo antes de Mudar o estado do jogo para fim, dentro da colisão. Depois, abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite e solte antes da mudança de estado. No sprite, escolha cacto, o nome que você deu ao cacto que bateu, e escolha uma cor para a explosão.

[confident, clear, unhurried voice] Agora deixe à vista o espaço entre a explosão e a mudança de estado. Abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, pegue o bloco Tremer a tela e solte nesse espaço. Ele já chega com intensidade 8: mantenha.

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

## Seção 5. Compare voltar e reiniciar

### Clipe `video-trocar-nao-limpa` · Compare voltar e reiniciar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-trocar-nao-limpa`

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar na tela de início, com Mudar o estado do jogo para inicio escolhido em No fim, o toque faz. Clicar em Tocar na tela, deixar o tempo passar até a batida e mostrar os cactos que ficam na pista ao voltar e ao jogar de novo. Trocar para Reiniciar o jogo e mostrar a pista vazia na abertura e a partida começando só com um cacto novo, com os números da faixa à vista. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino arrumando as peças de um tabuleiro antes de começar outra partida. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender a diferença entre voltar para a abertura e reiniciar o jogo.

[interested, animated voice] Olha aqui: em No fim, o toque faz, eu escolho Mudar o estado do jogo para inicio. Clico em Tocar na tela, a partida começa, e eu espero um cacto bater no Dino. Fim de partida.

[engaging, energetic, conversational voice] Eu clico em Tocar na tela, e a abertura volta, mas os cactos continuam na pista. Clico de novo para jogar: a partida nova começa com os cactos da anterior e acaba na hora, com uma batida. Mudar o estado só troca a tela. Ele não arruma a pista.

[curious] Mas por que a partida recomeça e já termina?

[engaging, energetic, conversational voice] É porque os cactos da outra partida ficaram ali. Agora, no fim, eu troco a ação para Reiniciar o jogo. Clico em Tocar na tela: a abertura volta com a pista vazia. Clico de novo, e a partida começa limpa. Reiniciar o jogo repete a preparação do começo.

[engaging, energetic, conversational voice] É como jogar de novo um jogo de tabuleiro: não basta voltar para a casa de início, é preciso arrumar as peças outra vez. No seu jogo, você vai usar Reiniciar o jogo quando alguém tocar na tela de fim.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-trocar-nao-limpa-K1 | Debinha | 1 | com os cactos da anterior e acaba na hora, com uma batida. Mudar o estado só troca a tela. Ele não arruma a pista. | Mas por que a partida recomeça e já termina? | É porque os cactos da outra partida ficaram ali. Agora, no fim, eu troco a ação para Reiniciar o jogo. Clico em Tocar | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-trocar-nao-limpa-K1`: entrada — Concluir a segunda partida com os cactos antigos e deixar a batida visível. Saída — Trocar a ação para Reiniciar o jogo e mostrar abertura e nova partida com a pista limpa.


**Recado na página (não gravar):** Sua vez! Compare os dois jeitos de voltar e repare em como começa a partida seguinte. Quando terminar, clique em Próxima parte.

## Seção 6. Prepare uma nova partida

### Clipe `video-caminho-de-volta` · Prepare uma nova partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-caminho-de-volta`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu jogo, deixe um cacto bater e toque na tela de fim. Tá vendo? Nada acontece, porque o toque ainda não tem resposta no estado fim.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com Reiniciar o jogo, a partida nova começava limpa. Agora a gente vai programar o recomeço!

[engaging, energetic, conversational voice] O recomeço vai no mesmo evento que começa a partida. Deixe à vista o Se inicio, dentro de Quando apertar qualquer tecla ou tocar na tela. Na linha de baixo desse Se, clique uma vez no + ao lado de senão se. O ramo novo chega com a pergunta x > 0: arraste essa pergunta para a lixeira.

[curious] E como ele volta para o começo?

[engaging, energetic, conversational voice] A gente vai dizer o que fazer no estado fim. Deixe à vista o lugar vazio da pergunta desse ramo. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ?, solte nesse lugar e escolha fim.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio dentro do ramo fim. Na mesma categoria, pegue o bloco Reiniciar o jogo e solte ali. Esse bloco repete a preparação de Ao iniciar: cria de novo o grupo de cactos, vazio, e devolve o estado para inicio.

[engaging, energetic, conversational voice] Agora comece, deixe uma batida acontecer e toque na tela de fim. [interested, animated voice] Olha só: a abertura volta! Toque outra vez para jogar e repare que os cactos da partida anterior não estão mais na pista. [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no evento de qualquer tecla ou toque, o Se tem o ramo inicio, que muda para jogando, e o ramo senão se fim, com Reiniciar o jogo. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-caminho-de-volta-K1 | Debinha | 1 | clique uma vez no + ao lado de senão se. O ramo novo chega com a pergunta x > 0: arraste essa pergunta para a lixeira. | E como ele volta para o começo? | A gente vai dizer o que fazer no estado fim. Deixe à vista o lugar vazio da pergunta desse ramo. Abra Jogo 2D, depois | [curious] |

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
