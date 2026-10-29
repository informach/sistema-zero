# Roteiro de produção · Ajuste a área da batida

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare a área com o desenho

### Clipe `video-caixa-decide` · Compare a área com o desenho

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-caixa-decide`

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a área em 100% e o cacto longe. Aproximar até o primeiro BATEU! e apontar o vão entre os desenhos. Diminuir a área para 80% sem mexer na distância. Aproximar com o botão −, que anda de 10 em 10, até os desenhos se encostarem (com o deslizante, BATEU! aparece antes, ainda com vão) e, por último, diminuir a área para 40%, com a indicação da batida à vista a cada mudança. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é a mesma experiência da aula anterior, agora para a gente entender o tamanho da área que decide a batida.

[interested, animated voice] Olha aqui: com a área do Dino em 100%, eu aproximo o cacto até aparecer BATEU! Os desenhos ainda nem se encostaram: a área pega um pedaço vazio em volta do desenho.

[curious] Dá para diminuir só essa área?

[engaging, energetic, conversational voice] Sem mudar a distância, eu diminuo Tamanho da área do Dino para 80%. O BATEU some. O Dino continua do mesmo tamanho; só a área ficou menor.

[engaging, energetic, conversational voice] Agora eu aproximo o cacto até encostar no desenho do Dino. Com 80%, aparece BATEU, e os desenhos também se encostam. Essa batida parece justa. Por último, eu diminuo a área para 40%. Os desenhos se tocam, mas o jogo não marca a batida: a área ficou pequena demais. No seu jogo, você vai mostrar o contorno da área e deixar a área do Dino em 80%.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-caixa-decide-K1 | Dedé | 1 | o cacto até aparecer BATEU! Os desenhos ainda nem se encostaram: a área pega um pedaço vazio em volta do desenho. | Dá para diminuir só essa área? | Sem mudar a distância, eu diminuo Tamanho da área do Dino para 80%. O BATEU some. O Dino continua do mesmo tamanho; só | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-caixa-decide-K1`: entrada — Mostrar BATEU! com a área em 100% e o vão entre os desenhos. Saída — Diminuir a área para 80% sem mudar a distância; comparar com 40% só no momento narrado.


**Recado na página (não gravar):** Sua vez! Mude só a área com o cacto parado e, depois, compare a batida com a área em 40%. Quando terminar, clique em Próxima parte.

## Seção 2. Mostre a área no seu jogo

### Clipe `video-ligar-raio-x` · Mostre a área no seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-ligar-raio-x`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Deixe um cacto chegar perto do Dino. Tá vendo? Não dá para saber onde a área começa, porque ela é invisível.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com a área em 100%, a batida vinha antes de os desenhos se encostarem. Agora a gente vai mostrar essa área!

[engaging, energetic, conversational voice] O contorno precisa ser desenhado depois do Dino, para aparecer por cima dele. Por isso, deixe à vista o lugar logo depois de Desenhar o sprite dino, no então de Se jogando, dentro do quadro. Depois, abra Jogo 2D, depois Colisões e depois Área de contato, pegue o bloco Mostrar a caixa de colisão do sprite e solte logo depois do desenho do Dino. Escolha dino.

[engaging, energetic, conversational voice] Agora comece a partida. [interested, animated voice] Olha só: aparece um contorno em volta do Dino, que só mostra a área e não muda a batida! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no então de Se jogando, logo depois de Desenhar o sprite dino, está Mostrar a caixa de colisão do sprite, com dino. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora mostre a área da batida no seu jogo! Coloque Mostrar a caixa de colisão do sprite logo depois do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Ajuste a área sem mudar o desenho

### Clipe `video-ajustar-area` · Ajuste a área sem mudar o desenho

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-ajustar-area`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu jogo, comece a partida e olhe o contorno. Tá vendo? Ele é maior que o desenho do Dino, porque a área ainda está inteira.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com 80%, a batida ficou justa. Agora a gente vai ajustar a área do seu Dino!

[engaging, energetic, conversational voice] A área é escolhida uma vez, no começo do jogo. Por isso, deixe à vista o fim de Ao iniciar. Depois, abra Jogo 2D, depois Colisões e depois Área de contato, pegue o bloco Usar área de colisão, que chega com 80 % do tamanho, e solte no fim de Ao iniciar. No sprite, escolha dino e deixe a porcentagem em 80.

[engaging, energetic, conversational voice] Agora comece a partida e olhe o contorno: ele ficou menor, mas o Dino continua do mesmo tamanho, 64, porque só a área da batida mudou! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Usar área de colisão está no fim de Ao iniciar, com dino e 80, e o tamanho do Dino continua 64. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Deixe um cacto chegar e compare a batida com a do teste anterior. Se quiser, teste 70 e 85 nesse campo e compare. Você pode escolher um valor entre 70 e 85, e, no exemplo, fica 80. Não mude o tamanho do desenho para tentar ajustar a área, porque isso encolheria o Dino.

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
[confident, clear, unhurried voice] Repare: agora que a área da batida está ajustada, o contorno não faz mais falta. Ele serviu para você enxergar a área enquanto ajustava. Por isso, retire só o contorno e deixe a regra que escolhe a porcentagem.

[curious] Como eu tiro só o contorno?

[confident, clear, unhurried voice] Deixe à vista o bloco Mostrar a caixa de colisão do sprite, no então de Se jogando. Se você puxar esse bloco, os blocos de baixo saem junto, porque estão encaixados nele. Por isso, primeiro arraste o bloco que vem logo abaixo do contorno para um espaço livre, levando o resto da sequência. Depois, arraste o contorno para a lixeira e encaixe a sequência de volta, logo abaixo do desenho do Dino.

[engaging, energetic, conversational voice] Agora comece outra partida. [interested, animated voice] Olha só: o contorno desaparece, e a batida continua usando a área menor! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: em Ao iniciar, continua o bloco Usar área de colisão, com dino e a porcentagem escolhida, e o contorno não está mais no quadro. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-retirar-contorno-K1 | Dedé | 1 | para você enxergar a área enquanto ajustava. Por isso, retire só o contorno e deixe a regra que escolhe a porcentagem. | Como eu tiro só o contorno? | Deixe à vista o bloco Mostrar a caixa de colisão do sprite, no então de Se jogando. Se você puxar esse bloco, os blocos | [curious] |

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

[confident, clear, unhurried voice] Confira o tamanho 64 no Dino e, no bloco de área, a porcentagem que você escolheu, entre 70 e 85. O contorno de teste tem que estar fora do jogo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue até a batida e confira o recomeço, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
