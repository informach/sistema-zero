# Roteiro de produção · Ajuste a área da batida

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. E se a área mudar de tamanho?

### Clipe `video-caixa-decide` · E se a área mudar de tamanho?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-caixa-decide`

**Na tela:** No "Lembra dos carrinhos de bate-bate", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: dois carrinhos de bate-bate parados, um com o para-choque grande e outro com o para-choque pequeno [na edição: meme dos para-choques]. No "Olha aqui: nesta experiência", ampliar a experiência [ampliar experiência] e apontar os tamanhos, sem clicar [apontar "100%"] [apontar "80%"] [apontar "40%"]. No "e estes botões aproximam e afastam o cacto", apontar os botões, sem clicar [apontar "Aproximar o cacto"] [apontar "Afastar o cacto"]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[curious] Lembra dos carrinhos de bate-bate e do para-choque em volta deles? E se o para-choque fosse maior ou menor?

[engaging, energetic, conversational voice] No seu jogo, dá para mudar só o tamanho da área do Dino, sem mudar o desenho dele.

[curious] E se a área ficar menor que o desenho, o que acontece com a batida?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[interested, animated voice] Olha aqui: nesta experiência, a mesma da aula anterior, agora você também escolhe o tamanho da área do Dino, e estes botões aproximam e afastam o cacto.

[upbeat, encouraging voice] Agora é a sua vez de investigar: compare quando aparece BATEU com a área inteira, um pouco menor e bem pequena. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-caixa-decide-K1 | Dedé | 1 | o para-choque fosse maior ou menor? No seu jogo, dá para mudar só o tamanho da área do Dino, sem mudar o desenho dele. | E se a área ficar menor que o desenho, o que acontece com a batida? | O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, a mesma da aula anterior, agora | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-caixa-decide-K1`: entrada — Manter o meme dos para-choques até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência com o cacto longe e a área em 100%.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/hitbox.ts`, na tela `packages/member-shell/src/components/scene-livre/hitbox.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Descubra o que muda na batida quando a área do Dino muda de tamanho. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Mostre a área no seu jogo

### Clipe `video-ligar-raio-x` · Mostre a área no seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-ligar-raio-x`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Deixe um cacto chegar perto. Tá vendo? A área do Dino não aparece, porque no seu jogo ela é invisível.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com a área inteira, a batida vinha antes de os desenhos se encostarem. Agora a gente vai mostrar essa área no seu jogo!

[engaging, energetic, conversational voice] O contorno precisa ser desenhado depois do Dino, para aparecer por cima dele. Por isso, ele vai logo depois de Desenhar o sprite dino, no então de Se jogando, dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Deixe à vista o lugar logo depois de Desenhar o sprite dino.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Área de contato, pegue o bloco Mostrar a caixa de colisão do sprite e solte logo depois do desenho do Dino.

[engaging, energetic, conversational voice] No Estúdio, a área da batida se chama caixa de colisão. É este bloco que mostra o contorno dela, só para você enxergar.

[confident, clear, unhurried voice] Repare: o bloco chega com o nome jogador. Clique em jogador e escolha dino.

[engaging, energetic, conversational voice] Agora comece a partida. [interested, animated voice] Olha só: aparece um contorno em volta do Dino, que só mostra a área e não muda a batida! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no então de Se jogando, logo depois de Desenhar o sprite dino, está Mostrar a caixa de colisão do sprite, com dino. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora mostre a área da batida no seu jogo! Coloque Mostrar a caixa de colisão do sprite logo depois do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Ajuste a área sem mudar o desenho

### Clipe `video-ajustar-area` · Ajuste a área sem mudar o desenho

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-ajustar-area`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Comece a partida. Tá vendo? O contorno é maior que o desenho do Dino, porque a área está inteira.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com a área um pouco menor que o desenho, a batida ficou justa. Agora a gente vai ajustar a área do seu Dino!

[engaging, energetic, conversational voice] A área é escolhida uma vez, no começo do jogo. Por isso, o bloco vai no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Área de contato, pegue o bloco Usar área de colisão e solte no fim de Ao iniciar.

[engaging, energetic, conversational voice] É este bloco que escolhe o tamanho da área da batida, sem mudar o desenho.

[confident, clear, unhurried voice] Repare: o bloco chega com o nome jogador. Clique em jogador e escolha dino.

[engaging, energetic, conversational voice] O número do bloco é uma porcentagem do tamanho do Dino: 100 por cento é a área inteira, e 80 por cento, um pouco menor que o desenho. Ele já chega com 80: mantenha.

[engaging, energetic, conversational voice] Agora comece a partida e olhe o contorno: ele ficou menor, mas o Dino continua do mesmo tamanho, 64, porque só a área da batida mudou! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Usar área de colisão está no fim de Ao iniciar, com dino e 80, e o tamanho do Dino continua 64. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Deixe um cacto chegar e compare a batida com a do teste anterior. Não mude o tamanho do desenho para tentar ajustar a área, porque isso encolheria o Dino.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora ajuste a área da batida! Coloque Usar área de colisão no fim de Ao iniciar, com dino e 80%, sem mudar o tamanho 64 do desenho. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 4. Retire o contorno de teste

### Clipe `video-retirar-contorno` · Retire o contorno de teste

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-retirar-contorno`

**Na tela:** Mostrar o projeto no estado de entrada. No “Repare” da abertura, apontar no jogo ou no projeto o que ainda falta. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[confident, clear, unhurried voice] Repare: agora que a área da batida está ajustada, o contorno não faz mais falta. Ele serviu para você enxergar a área enquanto ajustava. Por isso, retire só o contorno e deixe o bloco que escolhe a porcentagem.

[curious] Como eu tiro só o contorno?

[confident, clear, unhurried voice] Deixe à vista o bloco Mostrar a caixa de colisão do sprite, no então de Se jogando. Se você puxar esse bloco, os blocos de baixo saem junto, porque estão encaixados nele.

[engaging, energetic, conversational voice] Por isso, primeiro arraste Mover os sprites do grupo cactos, que vem logo abaixo do contorno, para um espaço livre. Os blocos de baixo vão junto.

[engaging, energetic, conversational voice] Agora arraste Mostrar a caixa de colisão do sprite para a lixeira.

[engaging, energetic, conversational voice] Por último, encaixe Mover os sprites do grupo cactos de volta, logo abaixo de Desenhar o sprite dino, com todos os blocos que vieram junto.

[engaging, energetic, conversational voice] Agora comece outra partida. [interested, animated voice] Olha só: o contorno desaparece, e a batida continua usando a área menor! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: em Ao iniciar, continua o bloco Usar área de colisão, com dino e 80, e o contorno não está mais no quadro. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-retirar-contorno-K1 | Dedé | 1 | para você enxergar a área enquanto ajustava. Por isso, retire só o contorno e deixe o bloco que escolhe a porcentagem. | Como eu tiro só o contorno? | Deixe à vista o bloco Mostrar a caixa de colisão do sprite, no então de Se jogando. Se você puxar esse bloco, os blocos | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-retirar-contorno-K1`: entrada — Mostrar a área já ajustada e os blocos encaixados, antes de arrastar qualquer um. Saída — Separar primeiro a sequência de baixo, retirar o contorno e encaixar a sequência novamente.


**Recado na página (não gravar):** Agora retire o contorno de teste! Tire só Mostrar a caixa de colisão do sprite e deixe o ajuste da área em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 5. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o seu jogo usa uma área ajustada para a batida! Antes de enviar o seu projeto, comece uma partida, pule e deixe uma batida acontecer, para conferir a tela de fim e o recomeço.

[confident, clear, unhurried voice] Confira o tamanho 64 no Dino e o 80 no bloco de área. O contorno de teste tem que estar fora do jogo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue até a batida e confira o recomeço, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
