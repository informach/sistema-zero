# Roteiro de produção · Faça o Dino cair e pular

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. O que traz o Dino de volta?

### Clipe `video-gravidade-modelo` · O que traz o Dino de volta?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-gravidade-modelo`

**Na tela:** No "Sabe quando você joga uma bola para cima", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy jogando uma bola para cima, com a bola ainda subindo [na edição: meme da bola jogada para cima]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, com o Dino no chão. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A gravidade é uma força que puxa tudo para baixo, e cada jogo decide se usa essa força.

[engaging, energetic, conversational voice] Sabe quando você joga uma bola para cima? Ela não fica lá no alto para sempre.

[engaging, energetic, conversational voice] No seu jogo, o Dino vai pular. E o jogo pode ter gravidade ou não.

[curious] E sem gravidade, o Dino volta para o chão depois do pulo?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o pulo do Dino sem gravidade e com gravidade, de olho na altura dele. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-gravidade-modelo-K1 | Debinha | 1 | bola para cima? Ela não fica lá no alto para sempre. No seu jogo, o Dino vai pular. E o jogo pode ter gravidade ou não. | E sem gravidade, o Dino volta para o chão depois do pulo? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o pulo do Dino sem gravidade e com | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-gravidade-modelo-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/gravity.ts`, na tela `packages/member-shell/src/components/scene-livre/gravity.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que acontece com o pulo do Dino com e sem gravidade. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 2. Deixe a gravidade pronta

### Clipe `video-aplicar-gravidade` · Deixe a gravidade pronta

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-aplicar-gravidade`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. No fim, mostrar o Dino ainda parado, como a fala explica. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Sem gravidade, o Dino subia sem parar. Agora a gente vai colocar a gravidade no seu jogo!

[engaging, energetic, conversational voice] A gravidade tem que puxar o Dino em todo quadro, antes de ele ser desenhado. Por isso, ela vai dentro de A cada quadro do jogo, entre Desenhar fundo de floresta e Desenhar o sprite dino.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Desenhar fundo de floresta e Desenhar o sprite dino.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Movimento e depois Velocidade e gravidade, pegue o bloco Aplicar a gravidade do mundo ao sprite e solte nesse espaço.

[engaging, energetic, conversational voice] É este bloco que aplica a gravidade ao Dino, em cada quadro.

[confident, clear, unhurried voice] Repare: o bloco chega com o nome jogador. Clique em jogador e escolha dino.

[confident, clear, unhurried voice] Confira se ficou assim: dentro de A cada quadro do jogo, a gravidade está depois da floresta e antes do desenho do Dino, com o nome dino.

[engaging, energetic, conversational voice] O Dino continua parado, e está certo: a gravidade já está pronta, mas quem faz o Dino se mexer com ela e pousar na grama é o bloco do pulo, que você monta daqui a pouco.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora deixe a gravidade pronta no seu Dino! Coloque Aplicar a gravidade do mundo ao sprite depois da floresta e antes do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Quanto o Dino sobe?

### Clipe `video-impulso-modelo` · Quanto o Dino sobe?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-impulso-modelo`

**Na tela:** No "Sabe quando você pula numa cama elástica", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Dino em cima de uma cama elástica, se preparando para pular [na edição: meme da cama elástica]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, com o Dino no chão. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Impulso é a força do começo de um pulo. É ele que diz com quanta força um personagem sai do chão.

[engaging, energetic, conversational voice] Sabe quando você pula numa cama elástica? Dá para pular com pouca força ou com muita força.

[engaging, energetic, conversational voice] No seu jogo, você escolhe o impulso do Dino. A gravidade continua a mesma em todos os pulos.

[curious] E com mais impulso, até onde o Dino chega?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que o impulso muda na altura dos pulos. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-impulso-modelo-K1 | Debinha | 1 | força ou com muita força. No seu jogo, você escolhe o impulso do Dino. A gravidade continua a mesma em todos os pulos. | E com mais impulso, até onde o Dino chega? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que o impulso muda na altura dos | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-impulso-modelo-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/impulse.ts`, na tela `packages/member-shell/src/components/scene-livre/impulse.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que o impulso muda no pulo do Dino. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 4. Dê os controles de pulo ao Dino

### Clipe `video-comando-de-pulo` · Dê os controles de pulo ao Dino

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-comando-de-pulo`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Nos testes por tecla, clicar em Atualizar e não clicar no jogo. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[confident, clear, unhurried voice] Clique em Atualizar, a seta circular no alto da prévia, e toque na barra de espaço. Tá vendo? O Dino não pula, porque ainda não tem controle.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Mais impulso deixava o pulo mais alto. Agora a gente vai dar os controles ao seu Dino!

[engaging, energetic, conversational voice] Em todo quadro, a gravidade puxa o Dino para baixo, o controle move o Dino e confere o pulo, e só depois o Dino é desenhado no lugar novo. Por isso, o controle fica entre a gravidade e o desenho.

[confident, clear, unhurried voice] Deixe à vista o espaço entre Aplicar a gravidade do mundo ao sprite e Desenhar o sprite.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Kits prontos e depois Dino, pegue o bloco Controlar o dinossauro e solte nesse espaço.

[engaging, energetic, conversational voice] É este bloco que faz o Dino pular quando alguém toca na tecla ou na tela, e pousar na grama.

[confident, clear, unhurried voice] Repare: o bloco já chega com o nome dino. Mantenha esse nome.

[confident, clear, unhurried voice] Clique no 15 da força do pulo e troque por 14. A força do pulo é o impulso da experiência.

[upbeat, encouraging voice] Agora teste! Clique em Atualizar e, sem clicar no jogo, toque e solte a barra de espaço. [interested, animated voice] Olha só: o Dino pula e volta para o chão!

[engaging, energetic, conversational voice] Depois que ele pousar, faça outro salto com a seta para cima e mais um tocando na parte de cima da tela, porque o mesmo bloco cuida dos três controles. Se você tocar embaixo, perto do chão, o Dino se abaixa em vez de pular.

[curious] Dá para pular de novo lá no alto?

[engaging, energetic, conversational voice] Vamos ver. Agora toque duas vezes na barra de espaço durante o mesmo salto. [confident, clear, unhurried voice] Repare: o segundo toque não faz o Dino pular de novo no ar, porque ele só começa um salto quando está no chão.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, a ordem é floresta, gravidade, controle e desenho do Dino, com o nome dino e força do pulo 14. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-comando-de-pulo-K1 | Debinha | 1 | porque o mesmo bloco cuida dos três controles. Se você tocar embaixo, perto do chão, o Dino se abaixa em vez de pular. | Dá para pular de novo lá no alto? | Vamos ver. Agora toque duas vezes na barra de espaço durante o mesmo salto. Repare: o segundo toque não faz o Dino | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-comando-de-pulo-K1`: entrada — Terminar o toque embaixo com o Dino no chão. Não começar o salto com dois toques antes da pergunta. Saída — Só então tocar duas vezes na barra de espaço durante o mesmo salto e manter à vista que o segundo toque não faz o Dino pular de novo no ar.


**Recado na página (não gravar):** Agora dê os controles de pulo ao seu Dino! Coloque Controlar o dinossauro entre a gravidade e o desenho, com força do pulo 14, e teste espaço, seta para cima e um toque na parte de cima da tela. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 5. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam da tela e dos movimentos do seu Dino. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 6. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o seu Dino já pula e volta para o chão! Antes de enviar o seu projeto, teste os três controles: a barra de espaço, a seta para cima e um toque na parte de cima da tela. Espere o Dino pousar entre um salto e outro, porque ele só pula de novo quando está no chão.

[engaging, energetic, conversational voice] Agora confira a ordem dentro de A cada quadro do jogo: a gravidade vem antes do controle, e os dois vêm antes do desenho do Dino. Deixe a força do pulo em 14, e as cores que você escolheu podem continuar do seu jeito.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Teste os três controles de pulo, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
