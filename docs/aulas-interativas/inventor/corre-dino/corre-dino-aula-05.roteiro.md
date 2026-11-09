# Roteiro de produção · Faça os cactos entrar na pista

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Todo quadro ou de tempos em tempos?

### Clipe `video-espaco-e-tempo` · Todo quadro ou de tempos em tempos?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-espaco-e-tempo`

**Na tela:** No "Sabe uma torneira pingando", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy olhando uma torneira pingando, com o Dino ao lado [na edição: meme da torneira]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, com o tempo parado. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Um jogo pode criar coisas novas enquanto a partida acontece. E ele decide de quanto em quanto tempo cada coisa nova nasce.

[engaging, energetic, conversational voice] Sabe uma torneira pingando? Ela pode pingar sem parar ou esperar um pouco entre uma gota e outra.

[engaging, energetic, conversational voice] No seu jogo, os cactos vão nascer na direita e vir na direção do Dino. E o jogo pode criar um cacto novo em todo quadro, ou esperar um tempo entre um cacto e outro, como um relógio que toca de tempos em tempos.

[curious] E se nascer um cacto em todo quadro, o Dino consegue pular?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que muda na fila de cactos quando um cacto novo nasce em todo quadro e quando cada um espera o relógio. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-espaco-e-tempo-K1 | Debinha | 1 | um cacto novo em todo quadro, ou esperar um tempo entre um cacto e outro, como um relógio que toca de tempos em tempos. | E se nascer um cacto em todo quadro, o Dino consegue pular? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na fila de cactos quando um | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-espaco-e-tempo-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/spawn.ts`, na tela `packages/member-shell/src/components/scene-livre/dino/spawn.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na fila de cactos com e sem uma espera entre eles. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 2. Prepare o grupo e o relógio

### Clipe `video-grupo-e-relogio` · Prepare o grupo e o relógio

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-grupo-e-relogio`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com o relógio, sobrava espaço entre os cactos. Agora a gente vai preparar o grupo e o relógio dos cactos!

[engaging, energetic, conversational voice] Como vão ser muitos cactos, eles ficam juntos num grupo, que é a lista de cactos que o jogo guarda e move de uma vez. O grupo é criado uma vez, no começo do jogo. Por isso, ele vai no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar, logo depois de Criar dinossauro.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Grupos e depois Criar e percorrer, pegue o bloco Criar grupo de sprites e solte no fim de Ao iniciar.

[confident, clear, unhurried voice] Repare: o nome chega como asteroides. Clique em asteroides, troque por cactos e clique fora do campo.

[engaging, energetic, conversational voice] É este bloco que cria a lista dos cactos, ainda vazia.

[curious] E como eu faço aparecer um cacto de cada vez?

[engaging, energetic, conversational voice] Com um relógio, que cria um cacto de tempos em tempos. O relógio fica em Enquanto estiver rodando, mas fora de A cada quadro do jogo, porque ele não pode criar um cacto em todo quadro.

[confident, clear, unhurried voice] Deixe à vista um espaço dentro de Enquanto estiver rodando, abaixo de A cada quadro do jogo e fora dele.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Tempo e depois Quadros e intervalos, pegue o bloco A cada 2 segundos e solte nesse espaço.

[engaging, energetic, conversational voice] É este bloco, A cada 2 segundos, que faz o papel do relógio.

[confident, clear, unhurried voice] Clique no 2 e troque por 1.4, com ponto: é quase um segundo e meio.

[confident, clear, unhurried voice] Confira se ficou assim: o grupo cactos está no fim de Ao iniciar, e o relógio de 1.4 segundo está em Enquanto estiver rodando, fora de A cada quadro do jogo. O relógio ainda está vazio, e por isso nenhum cacto aparece por enquanto.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-grupo-e-relogio-K1 | Debinha | 1 | Clique em asteroides, troque por cactos e clique fora do campo. É este bloco que cria a lista dos cactos, ainda vazia. | E como eu faço aparecer um cacto de cada vez? | Com um relógio, que cria um cacto de tempos em tempos. O relógio fica em Enquanto estiver rodando, mas fora de A cada | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-grupo-e-relogio-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora prepare o grupo e o relógio dos cactos! Crie o grupo cactos em Ao iniciar e um relógio de 1.4 segundo, fora de A cada quadro do jogo. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

## Seção 3. Para que lado anda o cacto?

### Clipe `video-numero-negativo` · Para que lado anda o cacto?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-numero-negativo`

**Na tela:** No "Sabe quando você atravessa a sala", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy atravessando a sala em passos marcados no chão [na edição: meme dos passos]. No "No seu jogo", ampliar a experiência [ampliar experiência] e mostrar a cena parada, com o cacto parado. Não apontar nem clicar nos controles da experiência. No "O Zappy vai te mostrando", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Velocidade é quanto uma coisa anda de cada vez, e para que lado.

[engaging, energetic, conversational voice] Sabe quando você atravessa a sala contando passos? Cada passo tem um tamanho e vai para um lado.

[engaging, energetic, conversational voice] No seu jogo, a velocidade do cacto diz quanto ele anda em cada quadro, e o lugar dele é o x. A velocidade pode ser um número positivo, um número negativo, com o sinal de menos, ou zero.

[curious] E com um número negativo, o cacto vai para onde?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar para que lado o cacto anda e o que acontece com o x com um número positivo, com um negativo e com zero. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-numero-negativo-K1 | Debinha | 1 | e o lugar dele é o x. A velocidade pode ser um número positivo, um número negativo, com o sinal de menos, ou zero. | E com um número negativo, o cacto vai para onde? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar para que lado o cacto anda e o que | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-numero-negativo-K1`: entrada — Manter a experiência ampliada e parada até a professora terminar a frase. Saída — Depois da saída, seguir com a experiência parada, sem clicar em nada.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/dino/velocity.ts`, na tela `packages/member-shell/src/components/scene-livre/dino/velocity.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que o número da velocidade faz com o cacto e com o x. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

## Seção 4. Crie os cactos no relógio

### Clipe `video-criar-cactos` · Crie os cactos no relógio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-criar-cactos`

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado (Próxima parte).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com um número negativo, o cacto andava para a esquerda. Agora a gente vai criar cactos que entram pela direita!

[engaging, energetic, conversational voice] Cada cacto nasce quando o relógio toca. Por isso, o bloco que cria o cacto vai dentro do relógio, A cada 1.4 segundos.

[confident, clear, unhurried voice] Deixe à vista o espaço vazio dentro de A cada 1.4 segundos.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Kits prontos e depois Dino, pegue o bloco No grupo criar obstáculo e solte dentro do relógio.

[engaging, energetic, conversational voice] É este bloco que cria um cacto novo no grupo, cada vez que o relógio toca.

[confident, clear, unhurried voice] Repare: o grupo chega como obstaculos. Clique em obstaculos e escolha cactos. A forma já chega como cacto: mantenha.

[engaging, energetic, conversational voice] O cacto tem que nascer escondido, depois da borda direita. A tela tem largura 480. Por isso, clique no 400 do x e troque por 560.

[engaging, energetic, conversational voice] Agora o vx, que é a velocidade para o lado, como na experiência. Clique no -3 e troque por -5.

[engaging, energetic, conversational voice] O tamanho já chega 44: mantenha.

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

[engaging, energetic, conversational voice] Lembra da experiência da terceira parte desta aula? Em cada quadro, o cacto andava o número da velocidade. Agora a gente vai fazer os seus cactos andarem e aparecerem!

[engaging, energetic, conversational voice] O movimento e o desenho dos cactos acontecem em todo quadro, depois do Dino. Por isso, eles vão no fim de A cada quadro do jogo, logo depois de Desenhar o sprite dino.

[confident, clear, unhurried voice] Deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o sprite dino.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Grupos e depois Movimento, pegue o bloco Mover os sprites do grupo e solte logo depois do Dino.

[confident, clear, unhurried voice] Repare: o grupo chega como asteroides. Clique em asteroides e escolha cactos.

[engaging, energetic, conversational voice] É este bloco que move cada cacto do grupo, com a velocidade que ele recebeu ao nascer.

[confident, clear, unhurried voice] Agora deixe à vista o lugar logo abaixo de Mover os sprites do grupo. Abra Jogo 2D, depois Grupos e depois Desenho e ordem, pegue o bloco Desenhar o grupo e solte logo abaixo.

[engaging, energetic, conversational voice] Ele também chega com asteroides: clique em asteroides e escolha cactos.

[engaging, energetic, conversational voice] É este bloco que desenha todos os cactos do grupo na tela.

[engaging, energetic, conversational voice] Agora espere alguns cactos nascerem. [interested, animated voice] Olha só: eles entram pela direita e passam para a esquerda! Pule um deles para testar o controle.

[curious] O cacto passou pelo Dino. Por que a partida não terminou?

[engaging, energetic, conversational voice] Porque a batida ainda não foi programada. Isso vem daqui a algumas aulas. [reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no fim de A cada quadro do jogo, a ordem é desenhar o Dino, mover os cactos e desenhar os cactos, com o grupo cactos. No grupo criar obstáculo continua no relógio, fora de A cada quadro do jogo, com x 560 e vx -5. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-mover-e-desenhar-K1 | Debinha | 1 | cactos nascerem. Olha só: eles entram pela direita e passam para a esquerda! Pule um deles para testar o controle. | O cacto passou pelo Dino. Por que a partida não terminou? | Porque a batida ainda não foi programada. Isso vem daqui a algumas aulas. Se no seu jogo não aconteceu isso, volte aos | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-mover-e-desenhar-K1`: entrada — Concluir a montagem e os testes do movimento dos cactos; deixar um cacto atravessar o Dino sem mudar os blocos. Saída — Retomar com a explicação de que a batida ainda não foi programada e seguir para a conferência.


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
