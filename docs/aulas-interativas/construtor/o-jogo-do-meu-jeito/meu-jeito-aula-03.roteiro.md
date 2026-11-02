# Roteiro de produção · Faça o motor da nave pulsar

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare dois desenhos e uma animação

### Clipe `video-quadros` · Compare dois desenhos e uma animação

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-quadros`

**Na tela:** No "Já viu aqueles livrinhos", mostrar o meme ilustrado (2 a 3 s) do Zappy folheando o livrinho da nave [na edição: meme do livrinho]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar os quadros [apontar "Quadro 2"]. No "Este outro toca e para a Prévia", apontar o botão [apontar "Tocar a Prévia"]. No "Aqui você escolhe a Velocidade", apontar os números [apontar "Velocidade, em quadros por segundo"]. No "E este último deixa o quadro 2 igual", apontar o botão [apontar "Quadro 2 igual ao quadro 1: desligado"]. Não tocar a Prévia: o que o fogo faz em cada velocidade é a descoberta da criança. Na fala desta aula, quadro é sempre um desenho da animação. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Um desenho animado é feito de muitos desenhos, mostrados um depois do outro. De um desenho para o outro, quase tudo fica igual, e só um pedacinho muda.

[engaging, energetic, conversational voice] No Pinta, cada desenho da animação se chama quadro. A sua nave vai ter dois quadros: no quadro 1, o fogo do motor é pequeno, e no quadro 2, ele é maior.

[engaging, energetic, conversational voice] Já viu aqueles livrinhos com um desenho em cada página? Quando você passa as páginas, o desenho muda de uma página para a outra. Cada página é um quadro.

[curious] E se as páginas passarem bem rápido?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, estes botões mostram o Quadro 1 e o Quadro 2. Este outro toca e para a Prévia, que mostra a animação. Aqui você escolhe a Velocidade, que é quantos quadros passam por segundo. E este último deixa o quadro 2 igual ao quadro 1.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare o fogo da nave com a Prévia parada e tocando, rápido e devagar, e também quando os dois quadros ficam iguais. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-quadros-K1 | Debinha | 1 | em cada página? Quando você passa as páginas, o desenho muda de uma página para a outra. Cada página é um quadro. | E se as páginas passarem bem rápido? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, estes botões mostram o Quadro 1 e o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-quadros-K1`: entrada — Manter o meme do livrinho e a experiência com a Prévia parada. Saída — Seguir sem tocar a Prévia: a professora só convida a testar e aponta os controles.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/frames.ts`, com a tela em `packages/member-shell/src/components/scene-livre/frames.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue quando o fogo da nave parece se mexer e quando ele fica parado. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Desenhe o primeiro fogo

### Clipe `video-primeiro-fogo` · Desenhe o primeiro fogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-primeiro-fogo`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista: primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência. No "Abra a sua nave no Pinta", mostrar a nave com as linhas de baixo vazias. No "Tá vendo?", apontar o motor sem fogo. No "No quadro 1, use o Lápis", desenhar a chama pequena com uma cor quente. No "Depois confira o seu fogo", apontar a chama encostada no motor e dentro da grade. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[confident, clear, unhurried voice] Abra a sua nave no Pinta. Tá vendo? O motor ainda está sem fogo, porque as linhas de baixo estão vazias. Lembra da experiência da parte anterior? O fogo pulsou com um quadro de fogo pequeno e outro de fogo maior. Agora a gente vai desenhar o fogo pequeno.

[engaging, energetic, conversational voice] No quadro 1, use o Lápis e uma cor quente para desenhar o fogo nas linhas livres embaixo da nave.

[engaging, energetic, conversational voice] Faça uma chama pequena, porque no quadro 2 ela ainda vai crescer um pouco. Se quiser, coloque um centro mais claro.

[engaging, energetic, conversational voice] Depois confira o seu fogo. A chama precisa encostar no motor, porque um fogo solto parece que não sai da nave. Ela também precisa caber na grade, e o corpo e a cabine precisam continuar como estavam.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora desenhe o primeiro fogo da sua nave! No quadro 1, faça uma chama pequena logo abaixo do motor. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 3. Desenhe olhando o quadro anterior

### Clipe `video-fantasma` · Desenhe olhando o quadro anterior

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-fantasma`

**Na tela:** No "Sabe quando você põe uma folha fina", mostrar o meme ilustrado (2 a 3 s) do Zappy desenhando sobre a folha fina [na edição: meme da folha fina]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar os quadros [apontar "Quadro 2"]. No "Este liga e desliga o Fantasma", apontar o botão [apontar "Fantasma: desligado"]. No "você muda o tamanho do fogo do quadro 2", apontar o botão [apontar "Fogo 2 maior"]. Não mudar o fogo nem ligar o Fantasma: o que dá para comparar em cada caso é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No quadro 2, o fogo da sua nave vai ser só um pouco maior que o do quadro 1. Mas, enquanto você desenha o quadro 2, o quadro 1 não fica na tela.

[engaging, energetic, conversational voice] O Pinta tem o Fantasma. Ligado, ele mostra o desenho do quadro anterior, clarinho, junto do quadro que você está desenhando. O Fantasma não vira parte da animação.

[engaging, energetic, conversational voice] Sabe quando você põe uma folha fina por cima de um desenho? Dá para ver as linhas de baixo através dela. O Fantasma funciona como essa folha fina.

[curious] Dá para acertar o tamanho do fogo sem o Fantasma?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, estes botões mostram o Quadro 1 e o Quadro 2. Este liga e desliga o Fantasma. E, com Fogo 2 menor e Fogo 2 maior, você muda o tamanho do fogo do quadro 2.

[upbeat, encouraging voice] Agora é a sua vez de investigar: no quadro 2, mude o fogo com o Fantasma desligado e depois com ele ligado. Tente deixar o fogo 2 um pouco maior que o fogo 1, sem passar da borda. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-fantasma-K1 | Debinha | 1 | fina por cima de um desenho? Dá para ver as linhas de baixo através dela. O Fantasma funciona como essa folha fina. | Dá para acertar o tamanho do fogo sem o Fantasma? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, estes botões mostram o Quadro 1 e o | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-fantasma-K1`: entrada — Manter o meme da folha fina e a experiência no quadro 1. Saída — Seguir sem mudar o fogo: a professora só convida a testar e aponta os controles.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/onion-skin.ts`, com a tela em `packages/member-shell/src/components/scene-livre/onion-skin.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que o Fantasma mostra e use ele para acertar o tamanho do fogo 2. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 4. Mude só o fogo no segundo quadro

### Clipe `video-segundo-fogo` · Mude só o fogo no segundo quadro

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-segundo-fogo`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista: primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência. No "Ligue a Prévia", tocar a Prévia da nave com um quadro só. No "Tá vendo?", apontar o fogo parado. No "chamada Spritesheet", apontar a faixa embaixo do desenho. No "clique em Duplicar quadro", duplicar o quadro 1. No "ligue o Fantasma do quadro anterior", selecionar o quadro 2 e ligar o Fantasma. No "Com Selecionar e mover", cercar a ponta do fogo e descer um quadradinho. No "Olha só", apontar a ponta clarinha do quadro 1. No "Para conferir, troque entre o quadro 1 e o quadro 2", alternar os quadros e mostrar o corpo parado. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Ligue a Prévia. Tá vendo? O fogo não pulsa, porque a animação tem um quadro só. Lembra da experiência da parte anterior? Com o Fantasma ligado, deu para deixar o fogo 2 só um pouco maior que o fogo 1. Agora a gente vai desenhar esse segundo fogo!

[engaging, energetic, conversational voice] Os quadros da animação ficam numa faixa embaixo do desenho, chamada Spritesheet. Nessa faixa, selecione o quadro 1 e clique em Duplicar quadro. Agora a animação tem um quadro 2, igualzinho ao quadro 1.

[engaging, energetic, conversational voice] Selecione o quadro 2 e ligue o Fantasma do quadro anterior. [confident, clear, unhurried voice] Repare: por enquanto, você não vê diferença, porque o quadro 2 é uma cópia igual e cobre o fantasma.

[curious] Ainda está igual. Qual pedaço eu mudo?

[engaging, energetic, conversational voice] Só a ponta do fogo muda. Com Selecionar e mover, cerque somente a ponta do fogo e mova essa ponta um quadradinho para baixo.

[interested, animated voice] Olha só: no espaço que abriu, aparece clarinha a ponta do quadro 1, mostrando onde ela estava. Solte a seleção e preencha esse espaço com o Lápis.

[engaging, energetic, conversational voice] Não selecione o corpo da nave, porque, se o corpo mudar de lugar, a nave pula na animação. E, se a chama encostar na borda, diminua a mudança até ela caber inteira.

[engaging, energetic, conversational voice] Para conferir, troque entre o quadro 1 e o quadro 2: o corpo e a cabine ficam no mesmo lugar, e só o fogo cresce. Depois desligue o Fantasma para ver o desenho sem ele.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-segundo-fogo-K1 | Debinha | 1 | quadro anterior. Repare: por enquanto, você não vê diferença, porque o quadro 2 é uma cópia igual e cobre o fantasma. | Ainda está igual. Qual pedaço eu mudo? | Só a ponta do fogo muda. Com Selecionar e mover, cerque somente a ponta do fogo e mova essa ponta um quadradinho para | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-segundo-fogo-K1`: entrada — Mostrar o quadro 2 recém-duplicado, com o Fantasma ligado e nenhuma diferença à vista. Saída — Cercar só a ponta do fogo com Selecionar e mover.


**Recado na página (não gravar):** Agora mude só o fogo no segundo quadro! Duplique o quadro e aumente um pouco a chama, mantendo o corpo no lugar. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 5. Dê nome e ritmo à animação

### Clipe `video-voando` · Dê nome e ritmo à animação

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-voando`

**Na tela:** No "clique em Renomear animação", apontar o nome parado e clicar no botão. No "Escreva voando e confirme", trocar o nome. No "deixe 8 quadros por segundo", ajustar a Velocidade e tocar a Prévia. No "Olha só", apontar o fogo pulsando. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora dê um nome à sua animação. Na faixa Spritesheet, clique em Renomear animação, ao lado do nome atual da animação, que é parado.

[engaging, energetic, conversational voice] Escreva voando e confirme. Esse nome é importante, porque é por ele que você vai escolher essa animação no Estúdio.

[engaging, energetic, conversational voice] Depois, em Velocidade, deixe 8 quadros por segundo e ligue a Prévia. [interested, animated voice] Olha só: o fogo pulsa, como na experiência dos quadros.

[reassuring, encouraging voice] Se no seu desenho não ficou assim, confira: a nave fica no lugar, a chama não é cortada na borda e a animação voando tem dois quadros. Para achar o que mudou, pare a Prévia e compare os dois quadros.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora dê nome e ritmo à animação! Nomeie a animação voando e deixe dois quadros a 8 por segundo. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 6. Confira sua nave animada

**Recado na página (não gravar):** Agora vamos relembrar o que você fez na sua nave, com três perguntas! Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo nem ferramenta. O quiz vem imediatamente depois do Zappy. Correção com explicação, tentativas ilimitadas e sem espera.

## Seção 7. Envie a nave animada

### Clipe `video-entrega` · Envie a nave animada

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** No "confira na sua nave", mostrar a animação voando com dois quadros. No "espere aparecer Guardado na sua conta", mostrar o aviso no Pinta. No "clique em Escolher no Pinta", voltar à aba da aula e abrir a galeria. No "selecione a sua nave", marcar a nave. No "Depois clique em Enviar (1)", clicar e mostrar Recebido!. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "Por último, clique em Concluir aula", clicar em **Concluir aula**.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar a sua nave animada! Antes, confira na sua nave: a nave tem quadros de 32 por 32, a animação voando tem dois quadros a 8 por segundo, e só o fogo muda, sempre inteiro dentro da grade. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Pinta, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Pinta. Na janela Minhas criações do Pinta, selecione a sua nave. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (1) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Pinta. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar a sua nave animada! Confira se a animação voando tem dois quadros a 8 por segundo. Depois clique em Escolher no Pinta, selecione a nave e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.
