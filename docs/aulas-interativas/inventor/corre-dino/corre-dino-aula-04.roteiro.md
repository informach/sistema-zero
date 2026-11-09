# Roteiro de produção · Toque um som em cada pulo

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Uma vez, sempre ou na hora certa?

### Clipe `video-area-que-espera` · Uma vez, sempre ou na hora certa?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-area-que-espera`

**Na tela:** No "Sabe a campainha de casa", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy tocando a campainha de uma casa, e o Dino vindo abrir a porta [na edição: meme da campainha]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, sem escolher nenhum jeito. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Você já viu dois jeitos de o jogo fazer as coisas: uma vez, no começo, e sempre, em todo quadro. Existe um terceiro jeito: na hora em que algo acontece.

[engaging, energetic, conversational voice] Sabe a campainha de casa? Ela não toca sem parar, nem toca uma vez só por dia. Ela toca na hora em que alguém chega e encosta o dedo nela.

[engaging, energetic, conversational voice] No seu jogo, você escolhe em qual desses jeitos o som do pulo aparece. No terceiro jeito, o que acontece é alguém tocar numa tecla.

[curious] E se o som ficar esperando a tecla, ele aparece quando o jogo começa?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quando o som do pulo aparece em cada jeito, com a tecla e sem a tecla. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-area-que-espera-K1 | Dedé | 1 | você escolhe em qual desses jeitos o som do pulo aparece. No terceiro jeito, o que acontece é alguém tocar numa tecla. | E se o som ficar esperando a tecla, ele aparece quando o jogo começa? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar quando o som do pulo aparece em cada | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-area-que-espera-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/once-vs-always.ts`, na tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue em que momento o som do pulo aparece em cada jeito. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 2. Som na tecla ou no pulo?

### Clipe `video-dedo-e-pulo` · Som na tecla ou no pulo?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-dedo-e-pulo`

**Na tela:** No "Sabe o sininho da porta", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy entrando numa loja, com o sininho preso no alto da porta [na edição: meme do sininho da porta]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, com a linha do tempo vazia. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Num jogo, um som pode ficar ligado a um momento: ele aparece toda vez que aquele momento acontece.

[engaging, energetic, conversational voice] Sabe o sininho da porta de uma loja? Ele fica preso na porta e toca quando ela abre.

[engaging, energetic, conversational voice] No seu jogo, o Dino pode pular com a tecla e com o toque. E o som do pulo pode ficar ligado à tecla ou ao próprio pulo.

[curious] E se o som estiver ligado à tecla, o pulo do toque também tem som?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quantos sons e quantos pulos acontecem com o som ligado à tecla e com o som ligado ao pulo. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-dedo-e-pulo-K1 | Dedé | 1 | No seu jogo, o Dino pode pular com a tecla e com o toque. E o som do pulo pode ficar ligado à tecla ou ao próprio pulo. | E se o som estiver ligado à tecla, o pulo do toque também tem som? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantos sons e quantos pulos acontecem | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-dedo-e-pulo-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/jump-sound.ts`, na tela `packages/member-shell/src/components/scene-livre/jump-sound.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue se o som do pulo deve ficar ligado à tecla ou ao pulo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 3. Ligue o som ao pulo do Dino

### Clipe `video-som-no-pulo` · Ligue o som ao pulo do Dino

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-som-no-pulo`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Percebeu?”, deixar ouvir que o pulo está sem som. No teste final, em “Escute”, deixar o som do pulo ser ouvido, sem fala nem música por cima. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Nos testes por tecla, clicar em Atualizar e não clicar no jogo. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[confident, clear, unhurried voice] Clique em Atualizar e pule com a barra de espaço. Percebeu? O pulo não tem som, porque nada liga som a ele.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com o som ligado ao pulo, cada pulo teve o seu som. Agora a gente vai fazer isso no seu jogo!

[engaging, energetic, conversational voice] Um pulo é um evento, que é algo que acontece no jogo. O que fica dentro de um evento só acontece na hora em que ele acontece.

[engaging, energetic, conversational voice] Os eventos ficam numa área própria, chamada Quando acontecer. O seu projeto ainda não tem essa área, por isso você vai criar uma.

[confident, clear, unhurried voice] Deixe à vista um espaço vazio do projeto, separado de Ao iniciar e de Enquanto estiver rodando. Depois, abra Áreas do projeto, pegue Quando acontecer e solte nesse espaço.

[engaging, energetic, conversational voice] É esta área que guarda os eventos do jogo.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio dentro de Quando acontecer.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Controles e depois Teclado, ações e toque, pegue o bloco Quando o sprite pular e solte nessa área.

[engaging, energetic, conversational voice] É este bloco que percebe o pulo do Dino, venha ele da tecla ou do toque.

[confident, clear, unhurried voice] Repare: o bloco chega com o nome jogador. Clique em jogador e escolha dino.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio dentro de Quando o sprite pular.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Som e depois Efeitos prontos, pegue o bloco Tocar efeito e solte dentro do evento do pulo. No efeito, escolha pulo.

[engaging, energetic, conversational voice] É este bloco que toca o som do pulo.

[upbeat, encouraging voice] Agora teste! Clique em Atualizar e pule com a barra de espaço. Escute: agora o pulo vem com som! Depois que o Dino pousar, teste a seta para cima e um toque na parte de cima da tela, e cada salto tem que tocar um som.

[engaging, energetic, conversational voice] Por último, toque duas vezes na barra de espaço com o Dino no ar. [confident, clear, unhurried voice] Repare: o segundo toque não faz outro salto nem outro som, porque o som está ligado ao pulo, e não à tecla.

[thoughtful] Aí você pode me dizer: “No meu jogo, o segundo toque também fez som.”

[engaging, energetic, conversational voice] Se aconteceu aí, volte aos blocos. [confident, clear, unhurried voice] Confira se ficou assim: o projeto tem um único Tocar efeito, com pulo, e ele está dentro de Quando o sprite dino pular, em Quando acontecer. Se os blocos estiverem certos e o jogo continuar mudo, clique uma vez na área do jogo, porque o navegador só libera o som depois de um clique ou de uma tecla. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-som-no-pulo-K1 | Dedé | 1 | toque não faz outro salto nem outro som, porque o som está ligado ao pulo, e não à tecla. Aí você pode me dizer: | No meu jogo, o segundo toque também fez som. | Se aconteceu aí, volte aos blocos. Confira se ficou assim: o projeto tem um único Tocar efeito, com pulo, e ele está | [thoughtful] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-som-no-pulo-K1`: entrada — Concluir os testes sem sobrepor vozes ao som; esperar o Dino pousar. Saída — Apontar o evento e o efeito na conferência; mostrar também o clique que libera o áudio, se necessário.


**Recado na página (não gravar):** Agora ligue o som ao pulo do seu Dino! Crie a área Quando acontecer e coloque um único Tocar efeito pulo dentro de Quando o sprite pular. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 4. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o seu Dino pula com som! Antes de enviar o seu projeto, teste um salto com a barra de espaço, outro com a seta para cima e outro com um toque na parte de cima da tela, esperando o Dino pousar entre eles. Cada salto tem que tocar um som.

[confident, clear, unhurried voice] Confira também que dois toques na barra de espaço durante o mesmo salto não fazem dois sons. A gravidade e o desenho continuam como antes.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Teste um salto com cada controle, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
