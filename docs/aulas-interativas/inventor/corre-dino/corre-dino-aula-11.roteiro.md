# Roteiro de produção · Conte e mostre os pontos

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Guardar ou mostrar?

### Clipe `video-guardar-mudar-mostrar` · Guardar ou mostrar?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-guardar-mudar-mostrar`

**Na tela:** No "Sabe quando alguém vai contando os gols", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy contando os gols nos dedos e, ao fundo, o placar do campo [na edição: meme dos gols contados de cabeça]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, sem clicar em nada. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Para lembrar um número, o jogo usa uma caixa com nome. Uma caixa que guarda um número se chama variável.

[engaging, energetic, conversational voice] Sabe quando alguém vai contando os gols de cabeça durante a partida? E tem também o placar, onde o número aparece para todo mundo.

[engaging, energetic, conversational voice] No seu jogo, essa variável vai se chamar pontos, e o número dos pontos também pode aparecer na tela.

[curious] E se o número não estiver na tela, ele continua mudando?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que muda na caixa pontos e na tela do jogo quando o número muda e quando ele aparece na tela. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-guardar-mudar-mostrar-K1 | Debinha | 1 | para todo mundo. No seu jogo, essa variável vai se chamar pontos, e o número dos pontos também pode aparecer na tela. | E se o número não estiver na tela, ele continua mudando? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na caixa pontos e na tela do | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-guardar-mudar-mostrar-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`, na tela `packages/member-shell/src/components/scene-livre/dino/variable.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue a diferença entre guardar um número e mostrar esse número na tela. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare os pontos em zero

### Clipe `video-caixinha-dos-pontos` · Prepare os pontos em zero

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-caixinha-dos-pontos`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O número ficava guardado na caixa pontos, mesmo sem aparecer na tela. Agora a gente vai criar essa caixa no seu jogo!

[engaging, energetic, conversational voice] Uma caixa que guarda um número se chama variável. A variável nasce quando o jogo começa. Por isso, ela vai no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar.

[confident, clear, unhurried voice] Agora abra Programação e depois Variáveis, pegue o bloco Criar variável com valor e solte nesse fim.

[engaging, energetic, conversational voice] É este bloco que cria a caixa e guarda um número dentro dela.

[confident, clear, unhurried voice] Repare: o nome chega como contador. Clique em contador, troque por pontos e clique fora do campo.

[engaging, energetic, conversational voice] O valor já vem em 0: mantenha, porque cada partida começa sem pontos.

[confident, clear, unhurried voice] Confira se ficou assim: no fim de Ao iniciar, está Criar variável pontos com valor 0. Na área do jogo, ainda não aparece nenhum número, porque guardar um número não desenha o placar.

[engaging, energetic, conversational voice] E, como Reiniciar o jogo repete a preparação de Ao iniciar, os pontos voltam para zero a cada partida nova.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora prepare os pontos do seu jogo! Crie a variável pontos com valor 0 no fim de Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Mostre o número guardado

### Clipe `video-numero-na-tela` · Mostre o número guardado

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-numero-na-tela`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, comece uma partida. Tá vendo? Nenhum número aparece, porque nada desenha o placar.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? O número só apareceu na tela quando você mandou mostrar. Agora a gente vai mostrar os pontos no seu jogo!

[engaging, energetic, conversational voice] O placar só aparece durante a partida. Por isso, ele vai no fim do então de Se jogando, logo depois de Tirar do grupo quem sair da tela.

[confident, clear, unhurried voice] Deixe à vista o fim do então de Se jogando, logo depois de Tirar do grupo quem sair da tela.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela, pegue o bloco Mostrar placar e solte nesse fim.

[engaging, energetic, conversational voice] É este bloco que mostra um número na tela, para quem joga.

[confident, clear, unhurried voice] Repare: o placar já chega com Pontos: escrito. Mantenha.

[confident, clear, unhurried voice] Agora deixe à vista o número do campo valor. Abra Programação e depois Valores, pegue o bloco valor da variável e solte em cima desse número, para ele tomar o lugar do número.

[confident, clear, unhurried voice] Repare: ele chega com x. Clique em x e escolha pontos.

[engaging, energetic, conversational voice] É este bloco que lê o número guardado em pontos. Agora o placar mostra esse número.

[engaging, energetic, conversational voice] O placar já vem em x 12, y 30 e tamanho 24: mantenha. Só troque a cor, que chega branca, por uma cor escura, que apareça sobre a floresta.

[engaging, energetic, conversational voice] Agora comece uma partida. [interested, animated voice] Olha só: o placar aparece, mostrando zero, e ainda não cresce, porque nenhuma regra soma pontos! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no fim do então de Se jogando, está Mostrar placar, com o valor da variável pontos no campo valor, x 12, y 30 e uma cor escura. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora mostre os pontos na tela! Coloque Mostrar placar no fim do Se jogando, lendo a variável pontos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 4. Quando o placar cresce?

### Clipe `video-quando-o-placar-cresce` · Quando o placar cresce?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-quando-o-placar-cresce`

**Na tela:** No "Sabe o cronômetro de uma corrida", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Dino na linha de largada, com o Zappy segurando um cronômetro [na edição: meme do cronômetro da corrida]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, na tela de início, sem passar o tempo. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Os pontos de um jogo ficam no placar, e é o jogo que decide quando somar cada ponto.

[engaging, energetic, conversational voice] Sabe o cronômetro de uma corrida? Alguém precisa decidir quando ele conta.

[curious] No seu jogo, o ponto pode ser somado em todo quadro ou a cada segundo, e o jogo pode perguntar antes de somar: estamos jogando agora?

[curious] E se o ponto for somado em todo quadro, quantos pontos aparecem num segundo?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quando o placar cresce em cada jeito de somar, com e sem a pergunta. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-quando-o-placar-cresce-K1 | Debinha | 1 | ponto pode ser somado em todo quadro ou a cada segundo, e o jogo pode perguntar antes de somar: estamos jogando agora? | E se o ponto for somado em todo quadro, quantos pontos aparecem num segundo? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar quando o placar cresce em cada jeito de | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-quando-o-placar-cresce-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/score.ts`, na tela `packages/member-shell/src/components/scene-livre/score.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue quando o placar deve crescer. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 5. Some um ponto por segundo de partida

### Clipe `video-relogio-dos-pontos` · Some um ponto por segundo de partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-relogio-dos-pontos`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece uma partida e olhe o placar. Tá vendo? Ele fica em zero, porque nada soma os pontos ainda.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Somando a cada segundo, só durante a partida, o placar contou um ponto por segundo. Agora a gente vai somar os seus pontos!

[engaging, energetic, conversational voice] A soma vai num relógio só dela, separado do relógio dos cactos, porque os cactos nascem a cada 1.4 segundo, e os pontos contam de 1 em 1 segundo.

[confident, clear, unhurried voice] Deixe à vista um espaço em Enquanto estiver rodando, fora de A cada quadro do jogo e do relógio dos cactos.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Tempo e depois Quadros e intervalos, pegue o bloco A cada 2 segundos e solte nesse espaço.

[confident, clear, unhurried voice] Clique no 2 e troque por 1. É este relógio que toca uma vez por segundo.

[curious] Mas só vale somar durante a partida, né?

[engaging, energetic, conversational voice] Isso. Vamos colocar essa pergunta no relógio. Agora deixe à vista o espaço vazio dentro do novo relógio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte ali.

[confident, clear, unhurried voice] Repare: ele chega com a pergunta x maior que 0. Arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio da pergunta. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando.

[confident, clear, unhurried voice] Agora deixe à vista o espaço vazio do então desse Se. Abra Programação e depois Variáveis, pegue o bloco Somar em variável e solte no então.

[engaging, energetic, conversational voice] É este bloco que soma um número ao que está guardado na caixa.

[confident, clear, unhurried voice] Repare: ele chega com contador. Clique em contador e escolha pontos. O número já vem 1: mantenha.

[engaging, energetic, conversational voice] Agora comece uma partida. [interested, animated voice] Olha só: os pontos sobem, um por segundo! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no relógio de 1 segundo, o Se jogando tem, no então, Somar em variável pontos, com 1, e esse é o único Somar em pontos. O relógio dos cactos continua em 1.4. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-relogio-dos-pontos-K1 | Debinha | 1 | bloco A cada 2 segundos e solte nesse espaço. Clique no 2 e troque por 1. É este relógio que toca uma vez por segundo. | Mas só vale somar durante a partida, né? | Isso. Vamos colocar essa pergunta no relógio. Agora deixe à vista o espaço vazio dentro do novo relógio. Abra | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-relogio-dos-pontos-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora some um ponto por segundo de partida! Crie um relógio só para os pontos, com um Se jogando e, dentro dele, Somar em variável pontos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 6. Mostre os pontos na tela de fim

### Clipe `video-frase-da-tela-de-fim` · Mostre os pontos na tela de fim

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-frase-da-tela-de-fim`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Deixe uma batida acontecer e olhe a tela de fim. Tá vendo? Ela mostra a sua frase, mas não diz quantos pontos você fez, porque não lê os pontos.

[engaging, energetic, conversational voice] O seu placar já lê a variável pontos durante a partida. Por isso, vamos usar a mesma leitura na frase da tela de fim, para mostrar quantos pontos você fez na partida.

[curious] Esse número vai mudar a cada partida?

[engaging, energetic, conversational voice] Vai mostrar os pontos daquela partida. É como montar uma frase com três partes: um pedaço escrito, o número dos pontos e outro pedaço escrito. É este bloco, juntar texto, que junta essas partes numa frase só.

[confident, clear, unhurried voice] Deixe à vista o subtítulo da tela de fim, no ramo fim do Se de A cada quadro do jogo.

[confident, clear, unhurried voice] Agora abra Programação e depois Valores, pegue o bloco juntar texto e solte em cima desse subtítulo, para ele tomar o lugar do texto antigo.

[confident, clear, unhurried voice] Clique três vezes no + do bloco juntar texto. [confident, clear, unhurried voice] Repare: ele ganha três entradas, que começam com números. Você vai preencher essas entradas com texto, valor e texto, nessa ordem.

[confident, clear, unhurried voice] Deixe à vista a primeira entrada. Ainda em Programação e Valores, pegue o bloco de texto que mostra Olá e solte em cima do primeiro número. Apague Olá e escreva Você fez, com um espaço depois de fez.

[curious] E o número dos pontos vai no meio?

[engaging, energetic, conversational voice] Vai, sim. Agora deixe à vista a entrada do meio. Em Programação e Valores, pegue o bloco valor da variável, solte em cima do número do meio e escolha pontos.

[confident, clear, unhurried voice] Por último, deixe à vista a última entrada. Em Programação e Valores, pegue outro texto Olá e solte em cima do último número.

[engaging, energetic, conversational voice] Apague Olá. Toque na barra de espaço e escreva pontos, com ponto final. Toque na barra de espaço de novo e escreva: Tente bater essa marca! A frase inteira está no Passo a passo do projeto.

[engaging, energetic, conversational voice] Agora comece, espere o placar crescer e deixe uma batida acontecer. [interested, animated voice] Olha só: a frase mostra os pontos da partida! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no subtítulo da tela de fim, o juntar texto tem Você fez, com um espaço no fim, o valor de pontos no meio e o resto da frase, começando com um espaço. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-frase-da-tela-de-fim-K1 | Debinha | 1 | partida. Por isso, vamos usar a mesma leitura na frase da tela de fim, para mostrar quantos pontos você fez na partida. | Esse número vai mudar a cada partida? | Vai mostrar os pontos daquela partida. É como montar uma frase com três partes: um pedaço escrito, o número dos pontos | [curious] |
| video-frase-da-tela-de-fim-K2 | Debinha | 1 | de texto que mostra Olá e solte em cima do primeiro número. Apague Olá e escreva Você fez, com um espaço depois de fez. | E o número dos pontos vai no meio? | Vai, sim. Agora deixe à vista a entrada do meio. Em Programação e Valores, pegue o bloco valor da variável, solte em | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-frase-da-tela-de-fim-K1`: entrada — Deixar a tela de fim sem o resultado visível e retomar o placar que já existe. Saída — Localizar o subtítulo, trocar pelo juntar texto, criar as três entradas e preencher só a primeira, com Você fez.
- `video-frase-da-tela-de-fim-K2`: entrada — Manter à vista o juntar texto com Você fez na primeira entrada e os outros dois números ainda no lugar. Não pegar o valor da variável antes da pergunta. Saída — Só então soltar o valor da variável pontos no número do meio, completar a última entrada e testar a tela de fim. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora mostre os pontos na tela de fim! Troque o subtítulo da tela de fim por um juntar texto com texto, valor de pontos e texto. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 7. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam da variável pontos e do placar. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta parte. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 8. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora a sua corrida conta os pontos e mostra o resultado! Antes de enviar o seu projeto, espere um pouco na abertura, porque o placar não pode aparecer ali. Depois, comece a partida e veja os pontos crescerem.

[engaging, energetic, conversational voice] Deixe uma batida acontecer e confira o número na frase da tela de fim. Depois, volte à abertura, espere um pouco e comece outra partida: o placar tem que começar do zero. Se a contagem continuar fora da partida, confira o Se jogando no relógio da soma.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Confira o placar na partida e na tela de fim, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
