# Roteiro de produção · Varie o lugar e a velocidade dos cactos

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Onde nasce o próximo cacto?

### Clipe `video-sorteio-tira-na-hora` · Onde nasce o próximo cacto?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-sorteio-tira-na-hora`

**Na tela:** No "Sabe quando você joga um dado", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy jogando um dado enorme, que rola na frente do Dino [na edição: meme do dado]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, sem sortear. Não apontar nem clicar nos controles da experiência. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sortear é deixar o jogo escolher um valor por acaso. Isso deixa cada partida um pouco diferente.

[engaging, energetic, conversational voice] Sabe quando você joga um dado? Ninguém sabe antes qual número vai sair, e cada jogada pode dar um número diferente.

[engaging, energetic, conversational voice] No seu jogo, se todos os cactos nascessem no mesmo lugar, a corrida ficaria sempre igual. Por isso, o jogo pode sortear o lugar de cada cacto novo, e também uma pequena diferença na velocidade.

[curious] E pode sair o mesmo lugar duas vezes?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar onde os cactos nascem e com que velocidade quando o jogo sorteia. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-sorteio-tira-na-hora-K1 | Dedé | 1 | sempre igual. Por isso, o jogo pode sortear o lugar de cada cacto novo, e também uma pequena diferença na velocidade. | E pode sair o mesmo lugar duas vezes? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar onde os cactos nascem e com que | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-sorteio-tira-na-hora-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/random.ts`, na tela `packages/member-shell/src/components/scene-livre/dino/random.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue onde os cactos nascem e com que velocidade quando o jogo sorteia. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Sorteie onde cada cacto nasce

### Clipe `video-lugar-diferente` · Sorteie onde cada cacto nasce

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-lugar-diferente`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu jogo, comece uma partida e olhe os cactos. Tá vendo? Eles chegam sempre com a mesma distância, porque todos nascem em x 560.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Cada sorteio tirava um lugar de 500 a 560. Agora a gente vai sortear o lugar dos seus cactos!

[engaging, energetic, conversational voice] O lugar é sorteado na hora em que cada cacto nasce. Por isso, o sorteio vai no x do bloco que cria os cactos, no então de Se jogando, dentro do relógio de 1.4 segundo.

[confident, clear, unhurried voice] Deixe à vista o 560 do campo x do bloco No grupo criar obstáculo.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Sorteios e depois Números e posições, pegue o bloco um número de 1 a 6 e solte em cima do 560, para ele tomar o lugar do número.

[engaging, energetic, conversational voice] É este bloco que sorteia um número, cada vez que um cacto nasce.

[curious] Quais números eu coloco no sorteio?

[engaging, energetic, conversational voice] Os números do começo e do fim da faixa. Clique no 1 e troque por 500.

[confident, clear, unhurried voice] Agora clique no 6 e troque por 560. A tela termina em x 480, por isso todos esses lugares ficam além da borda direita, e o cacto continua entrando escondido.

[engaging, energetic, conversational voice] Mantenha o tamanho 44 e o vx -5 no bloco.

[engaging, energetic, conversational voice] Agora comece e observe vários cactos entrarem. [confident, clear, unhurried voice] Repare: a distância entre eles muda um pouco, porque cada um sorteia o lugar quando nasce, e dois cactos podem até nascer no mesmo lugar. [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: o x do único No grupo criar obstáculo tem um número de 500 a 560, e o relógio continua em 1.4 segundo. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-lugar-diferente-K1 | Dedé | 1 | em cima do 560, para ele tomar o lugar do número. É este bloco que sorteia um número, cada vez que um cacto nasce. | Quais números eu coloco no sorteio? | Os números do começo e do fim da faixa. Clique no 1 e troque por 500. Agora clique no 6 e troque por 560. A tela | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-lugar-diferente-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora sorteie onde cada cacto nasce! Troque o x 560 do bloco que cria os cactos por um número de 500 a 560. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Qual número é maior?

### Clipe `video-regua-negativos` · Qual número é maior?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-regua-negativos`

**Na tela:** No "Sabe o termômetro num dia muito frio", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Dino de cachecol olhando um termômetro deitado, igual a uma régua de números [na edição: meme do termômetro deitado]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, com o marcador no começo. Não apontar nem clicar nos controles da experiência. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Os números com o sinal de menos se chamam negativos. Eles ficam abaixo de zero e cabem numa reta de números, como uma régua.

[engaging, energetic, conversational voice] Sabe o termômetro num dia muito frio? A temperatura pode ficar abaixo de zero, com o sinal de menos: menos cinco graus, menos nove graus.

[curious] No seu jogo, as velocidades dos cactos são números negativos. E o jogo pode fazer uma pergunta sobre eles, como: o número é maior que -9?

[curious] Qual é maior: menos cinco ou menos nove?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar como os números negativos ficam na reta e quando a pergunta responde sim ou não. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-regua-negativos-K1 | Dedé | 1 | dos cactos são números negativos. E o jogo pode fazer uma pergunta sobre eles, como: o número é maior que -9? | Qual é maior: menos cinco ou menos nove? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar como os números negativos ficam na reta | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-regua-negativos-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/number-line.ts`, na tela `packages/member-shell/src/components/scene-livre/number-line.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue como os números negativos ficam na régua e qual deles é o maior. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 4. Sorteie uma variação na velocidade

### Clipe `video-velocidade-propria` · Sorteie uma variação na velocidade

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-velocidade-propria`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe os cactos. Tá vendo? Todos andam no mesmo ritmo, porque todos têm vx -5.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Na régua, somar -1 levava de -5 para -6, e, na primeira parte, o cacto com -6 chegava mais longe. Agora a gente vai sortear essa diferença!

[engaging, energetic, conversational voice] Tirar 1 é o mesmo que somar -1. Por isso, a velocidade vai ser uma conta: -5 menos um número sorteado, de 0 a 1. Se sair 0, fica -5; se sair 1, fica -6.

[confident, clear, unhurried voice] Deixe à vista o campo vx, com -5, no bloco que cria os cactos.

[confident, clear, unhurried voice] Agora abra Programação e depois Matemática, pegue o bloco da conta, que aparece como 0 + 0, e solte em cima desse número, para ele tomar o lugar do -5.

[engaging, energetic, conversational voice] É este bloco que faz uma conta com dois números.

[confident, clear, unhurried voice] Clique no primeiro 0 e troque por -5.

[engaging, energetic, conversational voice] No sinal, troque + por −, o sinal de menos.

[curious] Por que a conta usa menos?

[engaging, energetic, conversational voice] Porque, com o sinal de mais, a conta daria -5 ou -4, e alguns cactos ficariam mais lentos. Com o menos, sai -5 ou -6, que anda mais para a esquerda em cada quadro.

[confident, clear, unhurried voice] Agora deixe à vista o 0 do lado direito. Abra Jogo 2D, depois Sorteios e depois Números e posições, pegue outro bloco um número de 1 a 6 e solte em cima desse 0.

[confident, clear, unhurried voice] Clique no 1 e troque por 0. Depois, clique no 6 e troque por 1.

[engaging, energetic, conversational voice] Agora comece e compare vários cactos. [confident, clear, unhurried voice] Repare: alguns andam um pouco mais rápido, e cada um guarda a velocidade que recebeu ao nascer. [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no vx, está a conta -5 menos um número de 0 a 1, e o x continua com o sorteio de 500 a 560, no mesmo bloco, com tamanho 44 e o relógio em 1.4. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-velocidade-propria-K1 | Dedé | 1 | que faz uma conta com dois números. Clique no primeiro 0 e troque por -5. No sinal, troque + por −, o sinal de menos. | Por que a conta usa menos? | Porque, com o sinal de mais, a conta daria -5 ou -4, e alguns cactos ficariam mais lentos. Com o menos, sai -5 ou -6, | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-velocidade-propria-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora sorteie uma variação na velocidade! No vx do mesmo bloco, use a conta -5 menos um número de 0 a 1. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 5. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora a sua corrida varia o lugar e a velocidade dos cactos! Antes de enviar o seu projeto, jogue duas partidas, observe os cactos e confira o placar, a batida e o recomeço. Se dois cactos nascerem no mesmo lugar, tudo bem, porque um sorteio pode repetir o resultado.

[confident, clear, unhurried voice] Confira o sorteio do x, de 500 a 560, e a conta -5 menos um número de 0 a 1. O tamanho e o relógio não mudaram.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue duas partidas e observe os cactos, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
