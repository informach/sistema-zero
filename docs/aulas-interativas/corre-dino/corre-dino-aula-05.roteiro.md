# Roteiro de produção · Faça os cactos entrar na pista

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Compare o intervalo entre cactos

### Clipe `video-espaco-e-tempo` · Compare o intervalo entre cactos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-espaco-e-tempo`

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com Criar cacto em A cada quadro. Clicar em Tempo, deixar passar cerca de um segundo e parar, com a parede de cactos e o número na faixa. Levar a peça para o relógio, escolher 1,4 s, clicar em Tempo e esperar dois nascimentos, com a comparação das duas tentativas à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino e os cactos numa fila para passar por uma porta, um de cada vez. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender como um relógio abre espaço entre os cactos.

[interested, animated voice] Olha aqui: com Criar cacto em A cada quadro, eu clico em Tempo e deixo passar um segundo. Nascem uns 30 cactos, um em cada quadro, colados uns nos outros. Eles formam uma parede, e o Dino não teria como pular.

[curious] Como eu deixo um espaço entre eles?

[engaging, energetic, conversational voice] Agora eu levo Criar cacto para o relógio e escolho 1,4 s. Tudo recomeça do zero. Eu deixo passar uns três segundos, e nascem só dois cactos, com espaço entre eles. O relógio cria um cacto a cada 1,4 segundo, e não em todo quadro.

[engaging, energetic, conversational voice] É como a fila de pessoas passando por uma porta. Se todo mundo passa junto, falta espaço. Se cada um espera a sua vez, sobra espaço entre as pessoas. No seu jogo, você vai preparar um relógio de 1,4 segundo para criar os cactos.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-espaco-e-tempo-K1 | Debinha | 1 | Nascem uns 30 cactos, um em cada quadro, colados uns nos outros. Eles formam uma parede, e o Dino não teria como pular. | Como eu deixo um espaço entre eles? | Agora eu levo Criar cacto para o relógio e escolho 1,4 s. Tudo recomeça do zero. Eu deixo passar uns três segundos, e | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-espaco-e-tempo-K1`: entrada — Deixar o tempo parado com a parede de cactos visível. Saída — Mover Criar cacto para o relógio de 1,4 s; deixar os dois nascimentos acontecerem no tempo real.


**Recado na página (não gravar):** Sua vez! Compare os cactos nascendo a cada quadro com os cactos nascendo no relógio de 1,4 segundo. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare o grupo e o relógio

### Clipe `video-grupo-e-relogio` · Prepare o grupo e o relógio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-grupo-e-relogio`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com o relógio de 1,4 segundo, sobrava espaço entre os cactos. Agora a gente vai preparar o grupo e o relógio dos cactos!

[engaging, energetic, conversational voice] O grupo é criado uma vez, no começo do jogo. Por isso, deixe à vista o fim de Ao iniciar, logo depois de Criar dinossauro. Depois, abra Jogo 2D, depois Grupos e depois Criar e percorrer, pegue o bloco Criar grupo de sprites e solte no fim de Ao iniciar. No nome, escreva cactos. É esse grupo que vai guardar todos os cactos que o relógio criar.

[curious] E como eu faço aparecer um cacto de cada vez?

[engaging, energetic, conversational voice] Agora vem o relógio. Ele fica em Enquanto estiver rodando, mas fora de A cada quadro do jogo, porque não pode criar um cacto em todo quadro. Deixe à vista um espaço dentro de Enquanto estiver rodando, abaixo de A cada quadro do jogo e fora dele. Depois, abra Jogo 2D, depois Tempo e depois Quadros e intervalos, pegue o bloco A cada 2 segundos e solte nesse espaço. Troque o 2 por 1.4, ou seja, um segundo e quase meio.

[confident, clear, unhurried voice] Confira se ficou assim: o grupo cactos está no fim de Ao iniciar, e o relógio de 1.4 segundo está em Enquanto estiver rodando, fora de A cada quadro do jogo. O relógio ainda está vazio, e por isso nenhum cacto aparece por enquanto.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-grupo-e-relogio-K1 | Debinha | 1 | solte no fim de Ao iniciar. No nome, escreva cactos. É esse grupo que vai guardar todos os cactos que o relógio criar. | E como eu faço aparecer um cacto de cada vez? | Agora vem o relógio. Ele fica em Enquanto estiver rodando, mas fora de A cada quadro do jogo, porque não pode criar um | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-grupo-e-relogio-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora prepare o grupo e o relógio dos cactos! Crie o grupo cactos em Ao iniciar e um relógio de 1.4 segundo, fora do quadro. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Compare a direção da velocidade

### Clipe `video-numero-negativo` · Compare a direção da velocidade

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-numero-negativo`

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com o cacto parado em x 60 e as duas velocidades em 0. Escolher 5 na velocidade para o lado e clicar em Avançar 1 quadro algumas vezes, com o x à vista na faixa. Trocar para -5 e avançar. Deixar as duas em 0 e avançar de novo. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender a velocidade e como o sinal do número escolhe a direção.

[interested, animated voice] Olha aqui: com a velocidade para baixo em 0 e a velocidade para o lado em 5, eu clico em Avançar 1 quadro. O x do cacto vai de 60 para 65: ele andou 5 para a direita. Em cada quadro, o jogo soma a velocidade ao x.

[curious] E se eu quiser que o cacto vá para o outro lado?

[engaging, energetic, conversational voice] Quando eu troco a velocidade para o lado por -5 e avanço, o x diminui 5 em cada quadro, e o cacto vai para a esquerda. O sinal de menos inverte a direção.

[engaging, energetic, conversational voice] Com as duas velocidades em 0, eu avanço de novo, e o cacto fica parado: somar zero não muda nada. Os cactos do seu jogo vão nascer na direita, por isso vão usar velocidade -5 para atravessar a tela.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-numero-negativo-K1 | Debinha | 1 | 1 quadro. O x do cacto vai de 60 para 65: ele andou 5 para a direita. Em cada quadro, o jogo soma a velocidade ao x. | E se eu quiser que o cacto vá para o outro lado? | Quando eu troco a velocidade para o lado por -5 e avanço, o x diminui 5 em cada quadro, e o cacto vai para a esquerda. | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-numero-negativo-K1`: entrada — Mostrar o cacto avançando para a direita com velocidade 5 e o x na faixa. Saída — Trocar para -5 e avançar os quadros; depois testar as duas velocidades em zero.


**Recado na página (não gravar):** Sua vez! Compare a velocidade para o lado em 5, em -5 e em 0, de olho no x do cacto. Quando terminar, clique em Próxima parte.

## Seção 4. Crie os cactos no relógio

### Clipe `video-criar-cactos` · Crie os cactos no relógio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-criar-cactos`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: no “Tá vendo?”, apontar o relógio de 1.4 segundo vazio no projeto. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu projeto, olhe o relógio de 1.4 segundo. Tá vendo? Ele está vazio, por isso nenhum cacto nasce.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com velocidade -5, o cacto andava para a esquerda. Agora a gente vai criar cactos que entram pela direita!

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro de A cada 1.4 segundos. Depois, abra Jogo 2D, depois Kits prontos e depois Dino, pegue o bloco No grupo criar obstáculo e solte dentro do relógio. Escolha o grupo cactos. A forma já chega como cacto: mantenha.

[confident, clear, unhurried voice] Agora troque o x 400 por 560. Em vx, troque -3 por -5: o vx é a velocidade para o lado, a mesma da experiência. O tamanho já chega 44: mantenha. [confident, clear, unhurried voice] Repare no x: a tela do seu jogo tem largura 480, por isso o cacto que nasce em x 560 começa escondido, além da borda direita.

[confident, clear, unhurried voice] Confira se ficou assim: No grupo criar obstáculo está dentro do relógio de 1.4 segundo, com o grupo cactos, x 560, vx -5 e tamanho 44. Olhe a área do jogo: por enquanto, ela continua só com o Dino e a floresta. É que os cactos já nascem, mas o jogo ainda não manda mover nem desenhar esses cactos.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora crie os cactos no relógio! Coloque No grupo criar obstáculo dentro do relógio, com x 560, vx -5 e tamanho 44. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 5. Mova e mostre o grupo de cactos

### Clipe `video-mover-e-desenhar` · Mova e mostre o grupo de cactos

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-mover-e-desenhar`

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe a área do seu jogo. Tá vendo? Nenhum cacto aparece, porque o jogo ainda não move nem desenha o grupo.

[engaging, energetic, conversational voice] Lembra da experiência do relógio, na primeira parte desta aula? Os cactos nasciam um de cada vez. Agora a gente vai mover e desenhar os seus cactos!

[engaging, energetic, conversational voice] O movimento e o desenho dos cactos acontecem em todo quadro, depois do Dino. Por isso, deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o sprite dino. Depois, abra Jogo 2D, depois Grupos e depois Movimento, pegue o bloco Mover os sprites do grupo e solte logo depois do Dino. Escolha cactos. Esse bloco usa a velocidade que cada cacto recebeu ao nascer.

[confident, clear, unhurried voice] Agora deixe à vista o lugar logo abaixo de Mover os sprites do grupo. Abra Jogo 2D, depois Grupos e depois Desenho e ordem, pegue o bloco Desenhar o grupo e solte logo abaixo. Escolha cactos.

[engaging, energetic, conversational voice] Agora espere alguns cactos nascerem. [interested, animated voice] Olha só: eles entram pela direita e passam para a esquerda! [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no fim de A cada quadro do jogo, a ordem é desenhar o Dino, mover os cactos e desenhar os cactos, com o grupo cactos. No grupo criar obstáculo continua no relógio, fora do quadro, com x 560 e vx -5. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[curious] O cacto passou pelo Dino. Por que a partida não terminou?

[engaging, energetic, conversational voice] A batida ainda não foi programada. Agora pule um deles para testar o controle.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-mover-e-desenhar-K1 | Debinha | 1 | No grupo criar obstáculo continua no relógio, fora do quadro, com x 560 e vx -5. Depois de corrigir, teste de novo. | O cacto passou pelo Dino. Por que a partida não terminou? | A batida ainda não foi programada. Agora pule um deles para testar o controle. Funcionou? Clique em Verificar projeto. | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-mover-e-desenhar-K1`: entrada — Concluir a montagem e os testes do movimento dos cactos; deixar um cacto atravessar o Dino sem mudar regras. Saída — Retomar o teste de pulo e a explicação de que a batida ainda não foi programada.


**Recado na página (não gravar):** Agora faça os cactos aparecerem e andarem! Coloque Mover os sprites do grupo e Desenhar o grupo depois do desenho do Dino, a cada quadro. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 6. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-entrega`

**Na tela:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Enviar meu projeto, Enviar, Projeto enviado! e Concluir aula).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora o seu Dino encontra cactos vindo da direita! Antes de enviar o seu projeto, espere pelo menos dois cactos nascerem e teste o pulo.

[confident, clear, unhurried voice] Confira o relógio em 1.4 e, no bloco que cria os cactos, o x 560, o vx -5 e o tamanho 44. [confident, clear, unhurried voice] Repare que uma batida ainda não termina o jogo, porque essa regra ainda não existe. Nesta aula, o que importa é os cactos entrarem e andarem pela pista.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```


**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Espere os cactos entrarem, pule um deles, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
