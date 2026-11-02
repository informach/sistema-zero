# Roteiro de produção · Anime as chamas e as crateras

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Troque o que fica na frente

### Clipe `video-camadas` · Troque o que fica na frente

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-camadas`

**Na tela:** No "Sabe quando você empilha figurinhas", mostrar o meme ilustrado (2 a 3 s) do Zappy empilhando as figurinhas da pedra e da chama [na edição: meme das figurinhas]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar a lista [apontar "Camadas"]. No "Em cada linha, um botão leva aquela forma", apontar o botão da pedra [apontar "Uma camada para a frente: pedra"]. Não mover as camadas: qual forma fica na frente é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu asteroide, o fogo vai ficar atrás da pedra, saindo por cima dela. Quando duas formas ficam uma em cima da outra, uma delas aparece na frente e cobre um pedaço da outra.

[engaging, energetic, conversational voice] No Pinta, a lista Camadas mostra a ordem das formas. Cada forma ocupa uma linha da lista.

[engaging, energetic, conversational voice] Sabe quando você empilha figurinhas na mesa? Uma fica por cima da outra, e só dá para ver um pedaço da de baixo.

[curious] Como faz para a pedra aparecer na frente da chama?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, a lista Camadas mostra a pedra e a chama. Em cada linha, um botão leva aquela forma Uma camada para a frente ou Uma camada para trás.

[upbeat, encouraging voice] Agora é a sua vez de investigar: suba e desça a pedra na lista Camadas e compare qual forma aparece na frente no desenho. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-camadas-K1 | Debinha | 1 | lista. Sabe quando você empilha figurinhas na mesa? Uma fica por cima da outra, e só dá para ver um pedaço da de baixo. | Como faz para a pedra aparecer na frente da chama? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, a lista Camadas mostra a pedra e a | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-camadas-K1`: entrada — Mostrar a chama na frente da pedra e a lista Camadas, sem mover nenhuma camada. Saída — Seguir sem mover camadas: a professora só convida a testar e aponta os controles.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/layers.ts`, com a tela em `packages/member-shell/src/components/scene-livre/layers.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda no desenho quando a pedra sobe e desce na lista Camadas. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Desenhe fogo atrás da pedra

### Clipe `video-chama` · Desenhe fogo atrás da pedra

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-chama`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista. No "Abra o asteroide no Pinta", selecionar o quadro 1 e clicar fora das formas. No "Escolha uma cor quente", escolher a cor e deixar o Contorno em Sem cor. No "Com a Caneta", desenhar a chama acima da pedra e fechar no primeiro ponto. No "Tá vendo?", apontar a base da chama sobre a pedra e a chama em cima na lista Camadas. No "clique em Uma camada para trás", clicar até a chama ficar abaixo da pedra. No "Olha só", apontar a pedra na frente do fogo. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? A chama cobria a pedra quando estava em cima na lista Camadas. Por isso, agora a gente vai desenhar o fogo do seu asteroide e deixar a chama abaixo da pedra na lista.

[confident, clear, unhurried voice] Abra o asteroide no Pinta e selecione o quadro 1. Clique fora das formas para não deixar nada selecionado.

[engaging, energetic, conversational voice] Escolha uma cor quente em Preenchimento e deixe o Contorno em Sem cor.

[engaging, energetic, conversational voice] Com a Caneta, marque pontos formando uma chama no espaço acima da pedra e clique no primeiro ponto para fechar. Deixe a base da chama entrar um pouco na pedra.

[curious] Ué, a chama ficou na frente da pedra?

[interested, animated voice] Tá vendo? A base da chama cobre um pedaço da pedra, porque a chama foi a última forma desenhada e ficou em cima na lista Camadas.

[engaging, energetic, conversational voice] Para mudar isso, use Selecionar e clique na chama. Depois clique em Uma camada para trás até a pedra e as crateras ficarem na frente dela.

[interested, animated voice] Olha só: a pedra e as crateras aparecem na frente do fogo. [reassuring, encouraging voice] Se no seu desenho não ficou assim, confira na lista Camadas: a pedra e as crateras ficam acima da chama.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-chama-K1 | Debinha | 1 | chama no espaço acima da pedra e clique no primeiro ponto para fechar. Deixe a base da chama entrar um pouco na pedra. | Ué, a chama ficou na frente da pedra? | Tá vendo? A base da chama cobre um pedaço da pedra, porque a chama foi a última forma desenhada e ficou em cima na | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-chama-K1`: entrada — Fechar a chama e deixar à vista a base dela cobrindo a pedra. Saída — Apontar a base da chama sobre a pedra e a chama em cima na lista Camadas.


**Recado na página (não gravar):** Agora desenhe o fogo atrás da sua pedra! Faça uma chama acima do asteroide e coloque a chama atrás do corpo. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 3. Acrescente um centro mais claro

### Clipe `video-miolo-fogo` · Acrescente um centro mais claro

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-miolo-fogo`

**Na tela:** No "Selecione a chama e use Ctrl+C e Ctrl+V", copiar e colar a chama. No "escolha uma cor mais clara", trocar a cor da cópia e diminuir pelo canto da caixa. No "Leve esse miolo para dentro da chama maior", mover o miolo. No "Agora confira a ordem", apontar a lista Camadas. No "Com o miolo selecionado", clicar em Uma camada para trás ou Uma camada para a frente até o miolo ficar entre a chama maior e a pedra. No "Olha só", apontar o miolo dentro da chama. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora faça um centro mais claro no fogo, que vai ser o miolo da chama. Selecione a chama e use Ctrl+C e Ctrl+V para fazer uma cópia dela.

[engaging, energetic, conversational voice] Na cópia, escolha uma cor mais clara em Preenchimento. Depois arraste um canto da caixa em volta dela para deixar a cópia menor.

[engaging, energetic, conversational voice] Leve esse miolo para dentro da chama maior. Se precisar, use Editar os pontos para ajustar a ponta.

[engaging, energetic, conversational voice] Agora confira a ordem. O miolo precisa aparecer na frente da chama maior e atrás da pedra. Na lista Camadas, ele fica logo acima da chama maior e abaixo da pedra, porque a forma mais acima na lista aparece na frente.

[curious] Como eu levo o miolo para esse lugar da lista?

[engaging, energetic, conversational voice] Com o miolo selecionado, olhe onde ele está na lista Camadas. Se ele estiver acima da pedra, clique em Uma camada para trás. Se estiver abaixo da chama maior, clique em Uma camada para a frente. Clique uma vez de cada vez, olhando a lista, até ele ficar entre a chama maior e a pedra.

[interested, animated voice] Olha só: o miolo claro aparece dentro da chama, e a pedra continua na frente do fogo. Por último, confira se as duas chamas cabem inteiras no quadro.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-miolo-fogo-K1 | Debinha | 1 | Camadas, ele fica logo acima da chama maior e abaixo da pedra, porque a forma mais acima na lista aparece na frente. | Como eu levo o miolo para esse lugar da lista? | Com o miolo selecionado, olhe onde ele está na lista Camadas. Se ele estiver acima da pedra, clique em Uma camada para | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-miolo-fogo-K1`: entrada — Concluir a cópia e o ajuste do miolo e apontar a lista Camadas. Saída — Com o miolo selecionado, clicar em Uma camada para trás ou Uma camada para a frente, uma vez de cada vez, olhando a lista.


**Recado na página (não gravar):** Agora acrescente um centro mais claro ao fogo! Faça uma chama menor dentro da primeira, atrás da pedra. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 4. Compare mudanças entre quadros

### Clipe `video-mudanca-pequena` · Compare mudanças entre quadros

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-mudanca-pequena`

**Na tela:** No "Imagina uma bola de futebol girando", mostrar o meme ilustrado (2 a 3 s) do Zappy girando a bola na ponta do dedo [na edição: meme da bola girando]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e mostrar a pedra. No "Estes números dizem O tanto que a cratera anda", apontar os números [apontar "O tanto que a cratera anda"]. No "E este botão toca e para a Prévia", apontar o botão [apontar "Tocar a Prévia"]. Não mudar os números nem tocar a Prévia: o que a pedra faz em cada caso é a descoberta da criança. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. O meme é desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet; fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele. Não fazer os testes pela criança nem dizer o resultado antes do teste: a criança descobre na experiência, com o Zappy (convite à investigação, 02/11/2026). Não falar de blocos, áreas do Estúdio, regra nem código: a experiência trabalha só a ideia (01/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] A sua pedra também vai ganhar dois quadros, como a nave. Por isso, vale pensar em quanto o desenho deve mudar do quadro 1 para o quadro 2.

[curious] Imagina uma bola de futebol girando na ponta do dedo. Num desenho, o que precisaria mudar de um quadro para o outro para ela parecer girar?

[curious] E se a pedra inteira andar bastante?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, a Prévia troca dois desenhos da pedra, o do quadro 1 e o do quadro 2. Estes números dizem O tanto que a cratera anda e O tanto que a pedra inteira anda no segundo desenho. E este botão toca e para a Prévia.

[upbeat, encouraging voice] Agora é a sua vez de investigar: deixe os dois números em 0, depois mexa só na cratera e depois na pedra inteira. Compare a pedra na Prévia em cada caso. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-mudanca-pequena-K1 | Debinha | 1 | futebol girando na ponta do dedo. Num desenho, o que precisaria mudar de um quadro para o outro para ela parecer girar? | E se a pedra inteira andar bastante? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, a Prévia troca dois desenhos da | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-mudanca-pequena-K1`: entrada — Manter o meme da bola girando e a experiência com a Prévia parada. Saída — Seguir sem mudar os números: a professora só convida a testar e aponta os controles.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/motion-amount.ts`, com a tela em `packages/member-shell/src/components/scene-livre/motion-amount.tsx`. O Zappy acompanha o estado real e sugere o próximo teste; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue quanto a pedra pode mudar do quadro 1 para o quadro 2. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 5. Mude detalhes no segundo quadro

### Clipe `video-quadro-pedra` · Mude detalhes no segundo quadro

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-quadro-pedra`

**Na tela:** Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista: primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência. No "Ligue a Prévia do asteroide", tocar a Prévia com um quadro só. No "Tá vendo?", apontar a pedra parada. No "clique em Duplicar quadro", duplicar o quadro 1 na faixa Spritesheet. No "mova uma cratera um pouco para o lado", mover a cratera no quadro 2. No "escolha Editar os pontos numa chama", mexer a ponta da chama e do miolo. No "troque entre os dois quadros", alternar os quadros e mostrar o corpo parado. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Ligue a Prévia do asteroide. Tá vendo? A pedra fica parada, porque a animação tem um quadro só. Lembra da experiência da parte anterior? Quando só a cratera andava um pouco, a pedra parecia girar. Agora a gente vai fazer isso no seu asteroide!

[engaging, energetic, conversational voice] Na faixa Spritesheet, selecione o quadro 1 e clique em Duplicar quadro.

[engaging, energetic, conversational voice] No quadro 2, use Selecionar e mova uma cratera um pouco para o lado, mantendo a cratera dentro da pedra. Se quiser, faça uma mudança pequena em outra cratera.

[engaging, energetic, conversational voice] Depois escolha Editar os pontos numa chama e mexa a ponta dela um pouco. Faça o mesmo no miolo, sem levar o fogo para fora do quadro.

[engaging, energetic, conversational voice] Não mova o corpo da pedra, porque, se ele mudar de lugar, a pedra pula na animação.

[engaging, energetic, conversational voice] Por último, troque entre os dois quadros: o corpo fica no lugar, e só os detalhes mudam. [reassuring, encouraging voice] Se no seu desenho não ficou assim, confira: o corpo da pedra está na mesma posição nos dois quadros, e a pedra e as crateras continuam na frente do fogo nos dois.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora mude só os detalhes no segundo quadro! Duplique o quadro e altere um pouco as crateras e as pontas das chamas. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 6. Confira o ritmo da pedra

### Clipe `video-girando` · Confira o ritmo da pedra

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-girando`

**Na tela:** No "clique em Renomear animação", trocar parado por girando. No "deixe a Velocidade em 8 quadros por segundo", ajustar e tocar a Prévia. No "Olha só", apontar as crateras e o fogo mudando. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "volte a esta aba e clique em Próxima parte", voltar à aba da aula e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora dê um nome à animação da pedra. Na faixa Spritesheet, clique em Renomear animação e troque parado por girando.

[engaging, energetic, conversational voice] Esse nome vai ajudar você a escolher essa animação no Estúdio.

[engaging, energetic, conversational voice] Depois deixe a Velocidade em 8 quadros por segundo e ligue a Prévia. [interested, animated voice] Olha só: as crateras e o fogo mudam um pouco, e o corpo fica no lugar.

[engaging, energetic, conversational voice] A pedra não dá uma volta completa, porque só os detalhes mudam de um quadro para o outro. Mesmo assim, os dois desenhos dão a impressão de que ela está girando.

[reassuring, encouraging voice] Se no seu desenho não ficou assim, confira: o corpo está no mesmo lugar nos dois quadros, nenhuma ponta é cortada na borda e a animação girando tem dois quadros.

[engaging, energetic, conversational voice] Pause aqui e faça esta parte no seu desenho. Se o Pinta ainda não estiver aberto, clique em Abrir meu Pinta. Depois compare o seu desenho com a conferência que a gente acabou de fazer e espere aparecer Guardado na sua conta, porque é assim que o seu desenho fica guardado para a próxima parte. Quando aparecer, volte a esta aba e clique em Próxima parte.
```


**Recado na página (não gravar):** Agora dê nome e ritmo à animação da pedra! Nomeie a animação girando e teste dois quadros a 8 por segundo. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

## Seção 7. Confira as duas artes

**Recado na página (não gravar):** Agora vamos relembrar o que você fez nas suas duas artes, com três perguntas! Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo nem ferramenta. O quiz vem imediatamente depois do Zappy. Correção com explicação, tentativas ilimitadas e sem espera.

## Seção 8. Envie suas duas artes

### Clipe `video-entrega` · Envie suas duas artes

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Clipe:** `video-entrega`

**Na tela:** No "confira nas suas duas artes", mostrar a nave e o asteroide com as animações. No "espere aparecer Guardado na sua conta", mostrar o aviso no Pinta. No "clique em Escolher no Pinta", voltar à aba da aula e abrir a galeria. No "selecione a nave e o asteroide", marcar as duas artes. No "Depois clique em Enviar (2)", clicar e mostrar Recebido!. O trabalho acontece na outra aba: mostrar cada gesto narrado, sem acelerar. No "Por último, clique em Concluir aula", clicar em **Concluir aula**.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Hora de enviar as suas duas artes! Antes, confira nas suas duas artes: a nave tem 32 por 32 e a animação voando, e o asteroide tem 64 por 64 e a animação girando. Cada animação tem dois quadros a 8 por segundo, sem cortes nas bordas. Se alguma coisa estiver diferente, volte à parte em que ela foi feita e ajuste. Depois espere aparecer Guardado na sua conta no Pinta, porque a galeria da aula só mostra o que já está guardado na sua conta.

[engaging, energetic, conversational voice] Agora volte para a aba da aula e clique em Escolher no Pinta. Na janela Minhas criações do Pinta, selecione a nave e o asteroide. Se a sua criação não aparecer, confira se ela ficou guardada na sua conta e clique em Atualizar galeria.

[upbeat, encouraging voice] Se quiser, escreva uma mensagem no campo Recado. Depois clique em Enviar (2) e espere aparecer Recebido!

[engaging, energetic, conversational voice] Esse envio guarda uma cópia deste momento, e você continua criando no Pinta. Por último, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de enviar as suas duas artes! Confira se cada animação tem dois quadros a 8 por segundo, sem cortes nas bordas. Depois clique em Escolher no Pinta, selecione a nave e o asteroide e clique em Enviar (2). Quando aparecer Recebido!, clique em Concluir aula.
