# Roteiro de produção · Desenhe sua nave em pixel art

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Aproxime duas formas de desenhar

### Clipe `video-bordas` · Aproxime duas formas de desenhar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-bordas`

**Na tela:** No "No Pinta, existem dois jeitos de desenhar", mostrar a experiência na aula, parada, com as duas pedras de longe. No "Imagina um desenho montado com pecinhas", mostrar o meme ilustrado (2 a 3 s) do Zappy montando uma pedra com pecinhas [na edição: meme das pecinhas]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar as duas pedras paradas, de longe, sem aproximar: o que acontece com cada borda é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No Pinta, existem dois jeitos de desenhar: em pixel e em vetor. A sua nave vai ser em pixel, e a sua pedra, na aula 4, vai ser em vetor.

[engaging, energetic, conversational voice] O desenho em pixel é feito de quadradinhos pintados, um do lado do outro. O desenho em vetor é feito de pontos ligados por linhas.

[engaging, energetic, conversational voice] Imagina um desenho montado com pecinhas quadradas de brinquedo. Ele é como o desenho em pixel: cada pecinha é um quadradinho.

[engaging, energetic, conversational voice] Pense numa pedra em pixel e numa pedra em vetor, com a mesma forma, vistas bem de perto, como numa lupa. Será que as bordas continuam parecidas? O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar a borda de cada pedra, de perto e de longe. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/pixel-vector.ts`, com a tela em `packages/member-shell/src/components/scene-livre/pixel-vector.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue a borda de cada pedra, de perto e de longe. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare a folha da nave

### Clipe `video-nova-nave` · Prepare a folha da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-nova-nave`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista. No "Nesta parte, clique em Abrir meu Pinta", clicar no botão e mostrar o Pinta na outra aba. No "clique em Criar novo", abrir a escolha. No "escolha Pixel art", escolher Pixel art, Personagem e Médio, 32 por 32. No "escreva nave", escrever o nome. No "Depois clique em Começar a desenhar", clicar e mostrar a grade vazia. No "Repare: o desenho abre com uma grade quadrada", apontar a grade e as quatro linhas de baixo. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? De perto, a pedra de pixel mostrava os quadradinhos, um por um, porque ela é feita deles. A sua nave vai ser feita assim, quadradinho por quadradinho, em Pixel art. Agora a gente vai criar o desenho dela no Pinta.

[engaging, energetic, conversational voice] Nesta parte, clique em Abrir meu Pinta. Em Meus desenhos, clique em Criar novo.

[engaging, energetic, conversational voice] Em Como você quer desenhar?, escolha Pixel art. Em O que você quer criar?, escolha Personagem. Em Qual o tamanho?, escolha Médio, 32 por 32.

[engaging, energetic, conversational voice] Em Qual o nome?, escreva nave. Depois clique em Começar a desenhar.

[curious] E por que o nome tem que ser nave?

[engaging, energetic, conversational voice] O nome precisa ser nave, porque é por esse nome que você vai encontrar o desenho quando ele for para o jogo. Se você já tem a nave deste curso, abra esse desenho e continue nele, em vez de criar outra igual.

[confident, clear, unhurried voice] Repare: o desenho abre com uma grade quadrada. Deixe as quatro linhas de baixo da grade livres, porque elas vão ser o lugar do fogo do motor.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-nova-nave-K1 | Dedé | 1 | Em Qual o tamanho?, escolha Médio, 32 por 32. Em Qual o nome?, escreva nave. Depois clique em Começar a desenhar. | E por que o nome tem que ser nave? | O nome precisa ser nave, porque é por esse nome que você vai encontrar o desenho quando ele for para o jogo. Se você já | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-nova-nave-K1`: entrada — Mostrar o desenho nave recém-criado, com a grade vazia. Saída — Apontar o nome nave no alto do Pinta enquanto a professora explica.


**Recado na página (não gravar):** Agora prepare o desenho da sua nave! Crie uma arte de personagem em Pixel art, tamanho Médio, chamada nave. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 3. Descubra o que o espelho repete

### Clipe `video-espelho` · Descubra o que o espelho repete

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-espelho`

**Na tela:** No "o Pinta tem o espelho", mostrar a experiência na aula, parada, com o papel em branco. No "Sabe quando você pinga tinta numa folha", mostrar o meme ilustrado (2 a 3 s) do Zappy abrindo a folha dobrada [na edição: meme da folha dobrada]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar a nave parada, com o papel em branco, sem pintar nem ligar espelho: onde a tinta aparece é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A sua nave vai ter dois lados iguais, como a maioria das naves. Para você não desenhar cada lado duas vezes, o Pinta tem o espelho.

[engaging, energetic, conversational voice] O espelho repete o seu traço do outro lado de uma linha do meio. O Pinta tem dois espelhos, cada um com a sua própria linha do meio, e tem o Balde de tinta, que pinta uma parte inteira de uma vez.

[engaging, energetic, conversational voice] Sabe quando você pinga tinta numa folha, dobra a folha no meio e abre? A mancha aparece dos dois lados da dobra. No espelho, a dobra é a linha do meio.

[curious] E o Balde de tinta, o espelho copia também?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar onde a tinta aparece com os espelhos desligados, com cada espelho ligado e com o Balde de tinta. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-espelho-K1 | Dedé | 1 | folha, dobra a folha no meio e abre? A mancha aparece dos dois lados da dobra. No espelho, a dobra é a linha do meio. | E o Balde de tinta, o espelho copia também? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar onde a tinta aparece com os espelhos | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-espelho-K1`: entrada — Manter o meme da folha dobrada e a experiência com o papel em branco. Saída — Seguir sem fazer o teste: a professora só convida a testar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/symmetry.ts`, com a tela em `packages/member-shell/src/components/scene-livre/symmetry.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue onde a tinta aparece com cada espelho e com o Balde. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 4. Feche o contorno da nave

### Clipe `video-contorno` · Feche o contorno da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-contorno`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista. No "Abra a sua nave no Pinta", mostrar a grade da nave. No "clique em Espelho lado a lado", ligar o espelho e mostrar a linha do meio. No "Escolha a Linha", desenhar metade da ponta, a lateral e uma asa em trechos pequenos. No "Olha só", apontar o outro lado aparecendo. No "Feche a base", fechar acima das quatro linhas livres. No "Depois aproxime a imagem", aproximar e procurar aberturas. No "No fim, clique de novo em Espelho lado a lado", desligar e mostrar a nave inteira. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com o Espelho lado a lado ligado, cada traço apareceu também do outro lado da linha do meio. Por isso, agora a gente vai desenhar só metade do contorno da sua nave.

[confident, clear, unhurried voice] Abra a sua nave no Pinta. Escolha uma cor escura para o contorno e clique em Espelho lado a lado para ligar.

[engaging, energetic, conversational voice] Escolha a Linha e arraste trechos pequenos para desenhar metade da ponta, a lateral e uma asa. [interested, animated voice] Olha só: o espelho desenha o outro lado sozinho. A largura e o formato são escolha sua.

[engaging, energetic, conversational voice] Feche a base da nave acima das quatro linhas livres do fogo.

[engaging, energetic, conversational voice] Depois aproxime a imagem e confira se não ficou nenhuma abertura entre os trechos, porque, por uma abertura, a tinta do Balde escapa para fora da nave. Se faltar um quadradinho, feche com o Lápis.

[engaging, energetic, conversational voice] No fim, clique de novo em Espelho lado a lado para desligar e confira se a nave cabe na grade, com o espaço do motor livre.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora desenhe o contorno da sua nave! Com o Espelho lado a lado ligado, faça um corpo com duas asas e deixe quatro linhas livres embaixo. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 5. Pinte o corpo e a cabine

### Clipe `video-cores` · Pinte o corpo e a cabine

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-cores`

**Na tela:** No "Agora pinte o corpo da sua nave", mostrar o contorno sem cor. No "pegue o Balde de tinta e clique dentro do contorno", escolher roxo e clicar dentro do corpo. No "Olha só", apontar a cor parando no contorno. No "clique dentro de cada uma também", pintar as asas separadas. No "desenhar uma cabine", desenhar a cabine com outra cor. No "afaste a imagem", afastar e mostrar a nave pequena. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora pinte o corpo da sua nave.

[curious] Posso escolher outra cor, como roxo?

[engaging, energetic, conversational voice] Pode ser roxa, sim. Escolha uma cor, pegue o Balde de tinta e clique dentro do contorno.

[interested, animated voice] Olha só: a cor enche o corpo até a linha do contorno. Se ela escapar para fora, é porque ficou uma abertura. Clique em Desfazer, feche a abertura com o Lápis e tente de novo.

[engaging, energetic, conversational voice] Se as asas ficaram separadas do corpo, clique dentro de cada uma também, porque o Balde enche só a parte fechada em que você clicou.

[engaging, energetic, conversational voice] Depois escolha outra cor e use o Lápis ou a Linha para desenhar uma cabine dentro do corpo, deixando o espaço do motor vazio.

[engaging, energetic, conversational voice] Para conferir, afaste a imagem e veja se você reconhece a nave pequena, porque no jogo ela aparece pequena.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-cores-K1 | Dedé | 1 | Agora pinte o corpo da sua nave. | Posso escolher outra cor, como roxo? | Pode ser roxa, sim. Escolha uma cor, pegue o Balde de tinta e clique dentro do contorno. Olha só: a cor enche o corpo | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-cores-K1`: entrada — Mostrar o contorno ainda sem cor e o espaço do motor livre. Saída — Usar roxo como escolha do exemplo e seguir com o Balde de tinta.


**Recado na página (não gravar):** Agora pinte o corpo e a cabine da sua nave! Preencha a nave com o Balde e desenhe uma cabine dentro do corpo. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 6. Mude o lado da luz

### Clipe `video-luz` · Mude o lado da luz

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-luz`

**Na tela:** No "Agora falta ela parecer redonda", mostrar a experiência na aula, parada, com a bola de um tom só. No "Imagina uma bola deixada no quintal", mostrar o meme ilustrado (2 a 3 s) do Zappy de óculos escuros ao lado da bola [na edição: meme da bola no sol]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e mostrar a bola parada, com um tom só, sem ligar a sombra e a luz nem mudar o sol: o que acontece com a bola é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A sua nave já tem cor. Agora falta ela parecer redonda, como uma coisa de verdade, e não chapada como um adesivo.

[engaging, energetic, conversational voice] Para isso, quem desenha usa luz e sombra: um tom mais claro e um tom mais escuro da mesma cor.

[engaging, energetic, conversational voice] Imagina uma bola deixada no quintal num dia de sol. Um lado dela fica virado para o sol, e o outro fica do lado contrário.

[curious] E se o sol mudar de lado?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que a sombra, a luz e o lado do sol fazem com a forma da bola. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-luz-K1 | Dedé | 1 | uma bola deixada no quintal num dia de sol. Um lado dela fica virado para o sol, e o outro fica do lado contrário. | E se o sol mudar de lado? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que a sombra, a luz e o lado do sol | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-luz-K1`: entrada — Manter o meme da bola no quintal e a bola da experiência com um tom só. Saída — Seguir sem fazer o teste: a professora pergunta e convida a testar.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/shading.ts`, com a tela em `packages/member-shell/src/components/scene-livre/shading.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que a sombra, a luz e o lado do sol fazem com a bola. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 7. Escolha um lado para a luz

### Clipe `video-volume` · Escolha um lado para a luz

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-volume`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista: primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência. No "Olhe a sua nave no Pinta", mostrar a nave pintada com um tom em cada parte. No "Primeiro, decida de qual lado vem a luz", apontar o lado escolhido. No "Escolha um tom mais claro", pintar a faixa clara com o Lápis. No "Depois escolha um tom mais escuro", pintar a faixa escura do outro lado. No "Olha só", afastar e mostrar a nave arredondada. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe a sua nave no Pinta. Tá vendo? Ela parece chapada, porque cada parte tem um tom só. Lembra da experiência da parte anterior? Com um lado claro e outro escuro, a bola pareceu redonda. Agora a gente vai fazer isso na sua nave!

[engaging, energetic, conversational voice] Primeiro, decida de qual lado vem a luz.

[engaging, energetic, conversational voice] Escolha um tom mais claro da cor do corpo e pinte com o Lápis uma faixa pequena desse lado.

[engaging, energetic, conversational voice] Depois escolha um tom mais escuro e pinte uma faixa do lado oposto. Se quiser, faça o mesmo na cabine. As cores são suas: use a sua paleta, mesmo que ela seja bem diferente do exemplo.

[interested, animated voice] Olha só: com o claro de um lado e o escuro do outro, a sua nave começa a parecer redonda. [reassuring, encouraging voice] Se no seu desenho não ficou assim, confira: os tons aparecem de perto e de longe, o contorno continua fechado e a luz vem do mesmo lado no corpo e na cabine.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora dê luz e sombra à sua nave! Escolha um lado para a luz e pinte um tom claro desse lado e um escuro do outro. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 8. Envie o desenho da nave

### Clipe `video-entrega` · Envie o desenho da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** No "confira na sua nave", mostrar a arte nave com 32 por 32. No "espere aparecer Guardado na sua conta", mostrar o aviso no Pinta. No "clique em Escolher no Pinta", voltar à aba da aula e abrir a galeria. No "selecione a sua nave", marcar a nave. No "Depois clique em Enviar (1)", clicar e mostrar Recebido!. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "Por último, clique em Concluir aula", clicar em **Concluir aula**.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar a sua nave! Antes, confira na sua nave: a arte se chama nave, tem 32 por 32, corpo e cabine legíveis, espaço livre embaixo e a luz vindo de um lado só. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Pinta, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Pinta. Na janela Minhas criações do Pinta, selecione a sua nave. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (1) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Pinta. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar a sua nave! Confira se a arte se chama nave e tem 32 por 32. Depois clique em Escolher no Pinta, selecione a nave e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.
