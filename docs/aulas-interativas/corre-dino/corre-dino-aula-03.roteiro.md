# Roteiro de produção · Faça o Dino cair e pular

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare o salto com e sem gravidade

### Clipe `video-gravidade-modelo` · Compare o salto com e sem gravidade

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-gravidade-modelo`

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a gravidade desligada e o Dino no chão. Tocar no Dino e deixar a altura crescer até o tempo parar, com o Dino no alto. Ligar o fio da Gravidade ao Dino com ele no ar e acompanhar a subida mais lenta, a parada e a queda até o chão, com a altura à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy jogando uma bola para cima e a bola voltando para a mão dele. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender a gravidade, a força que traz o Dino de volta ao chão.

[interested, animated voice] Olha aqui: com a gravidade desligada, eu toco no Dino. Ele pula e sobe sem parar: o número da altura só cresce. Nada puxa o Dino para baixo. A experiência para o tempo com ele lá no alto.

[curious] E agora? Como ele volta para o chão?

[engaging, energetic, conversational voice] Com o Dino no ar, eu ligo a Gravidade ao Dino. Ele ainda sobe um pouquinho, cada vez mais devagar, para e cai até o chão. A gravidade puxa o Dino para baixo um pouco em cada quadro.

[engaging, energetic, conversational voice] É como jogar uma bola para cima: ela sobe, vai ficando mais devagar e volta para a sua mão. No seu jogo, você vai encaixar Aplicar a gravidade do mundo ao sprite dentro de A cada quadro do jogo, para puxar o Dino em todos os quadros.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-gravidade-modelo-K1 | Debinha | 1 | sem parar: o número da altura só cresce. Nada puxa o Dino para baixo. A experiência para o tempo com ele lá no alto. | E agora? Como ele volta para o chão? | Com o Dino no ar, eu ligo a Gravidade ao Dino. Ele ainda sobe um pouquinho, cada vez mais devagar, para e cai até o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-gravidade-modelo-K1`: entrada — Tocar no Dino sem gravidade e esperar a experiência parar com ele no alto. Saída — Ligar o fio da Gravidade com o Dino no ar e acompanhar a subida, a parada e a queda.


**Recado na página (não gravar):** Sua vez! Faça o Dino pular sem gravidade e ligue a Gravidade ao Dino enquanto ele está no ar. Quando terminar, clique em Próxima parte.

## Seção 2. Deixe a gravidade pronta

### Clipe `video-aplicar-gravidade` · Deixe a gravidade pronta

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-aplicar-gravidade`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. No fim, mostrar o Dino ainda parado, como a fala explica. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Sem gravidade, o Dino subia sem parar. Agora a gente vai colocar a gravidade no seu jogo!

[engaging, energetic, conversational voice] A gravidade tem que puxar o Dino em todo quadro, antes de ele ser desenhado. Por isso, deixe à vista o espaço entre Desenhar fundo de floresta e Desenhar o sprite dino, dentro de A cada quadro do jogo. Depois, abra Jogo 2D, depois Movimento e depois Velocidade e gravidade, pegue o bloco Aplicar a gravidade do mundo ao sprite e solte nesse espaço. No nome, escolha dino.

[confident, clear, unhurried voice] Confira se ficou assim: dentro de A cada quadro do jogo, a gravidade está depois da floresta e antes do desenho do Dino, com o nome dino. O Dino continua parado, e está certo: a gravidade já puxa, mas quem move o Dino com essa força e faz ele pousar na grama é o controle do pulo, que você monta daqui a pouco.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora deixe a gravidade pronta no seu Dino! Coloque Aplicar a gravidade do mundo ao sprite depois da floresta e antes do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Compare duas alturas de pulo

### Clipe `video-impulso-modelo` · Compare duas alturas de pulo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-impulso-modelo`

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com Impulso do salto em 9. Tocar no Dino e esperar o pouso, com a marca 68 à vista. Escolher Impulso 14, tocar no Dino de novo e esperar o pouso, com as duas marcas à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino numa cama elástica, com uma marca baixa escrita 9 e uma marca alta escrita 14. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender o impulso, a força que começa o pulo.

[interested, animated voice] Olha aqui: com o impulso em 9, eu toco no Dino. Ele sobe, volta ao chão e deixa uma marca na altura 68.

[engaging, energetic, conversational voice] Agora eu mudo o impulso para 14 e toco no Dino de novo. A marca nova fica na altura 163, bem acima da primeira. A gravidade foi a mesma nos dois saltos. O que mudou foi a força do começo do pulo.

[engaging, energetic, conversational voice] É como pular numa cama elástica: com mais força, você vai mais alto, e mesmo assim volta para baixo. No seu jogo, você vai colocar força do pulo 14 no bloco Controlar o dinossauro.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```


**Recado na página (não gravar):** Sua vez! Faça um salto com impulso 9 e outro com 14, esperando o Dino cair entre eles. Quando terminar, clique em Próxima parte.

## Seção 4. Dê os controles de pulo ao Dino

### Clipe `video-comando-de-pulo` · Dê os controles de pulo ao Dino

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-comando-de-pulo`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Nos testes por tecla, clicar em Atualizar e não clicar no jogo. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[confident, clear, unhurried voice] Clique na área do seu jogo e toque na barra de espaço. Tá vendo? O Dino não pula, porque ainda não tem controle.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com impulso 14, o pulo foi bem mais alto. Agora a gente vai dar os controles de pulo ao seu Dino!

[engaging, energetic, conversational voice] O controle vai depois da gravidade e antes do desenho, dentro de A cada quadro do jogo: a gravidade puxa o Dino para baixo, o controle move o Dino, faz ele pousar na grama e confere o pulo, e só depois o Dino é desenhado no lugar novo. Deixe à vista o espaço entre Aplicar a gravidade do mundo ao sprite e Desenhar o sprite. Depois, abra Jogo 2D, depois Kits prontos e depois Dino, pegue o bloco Controlar o dinossauro e solte nesse espaço. O bloco já chega com o nome dino: mantenha. Na força do pulo, troque 15 por 14.

[upbeat, encouraging voice] Agora teste! Clique em Atualizar, a seta circular no alto da prévia do jogo, e, sem clicar no jogo, toque e solte a barra de espaço e espere o Dino pousar. [interested, animated voice] Olha só: ele pula e volta para o chão! Depois, faça outro salto com a seta para cima e mais um tocando na parte de cima da tela, porque o mesmo bloco já cuida dos três controles. Se você tocar embaixo, perto do chão, o Dino se abaixa em vez de pular.

[curious] Dá para pular de novo lá no alto?

[engaging, energetic, conversational voice] Vamos ver. Agora toque duas vezes na barra de espaço durante o mesmo salto. [confident, clear, unhurried voice] Repare: o segundo toque não faz o Dino pular de novo no ar, porque ele só começa um salto quando está no chão.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, a ordem é floresta, gravidade, controle e desenho do Dino, com o nome dino. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-comando-de-pulo-K1 | Debinha | 1 | o mesmo bloco já cuida dos três controles. Se você tocar embaixo, perto do chão, o Dino se abaixa em vez de pular. | Dá para pular de novo lá no alto? | Vamos ver. Agora toque duas vezes na barra de espaço durante o mesmo salto. Repare: o segundo toque não faz o Dino | [curious] |

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
