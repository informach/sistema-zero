# Roteiro de produção · Comece a partida com Enter

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. A partida já começou?

### Clipe `video-estado-do-jogo` · A partida já começou?

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-estado-do-jogo`

**Na tela:** No "Sabe a porta de casa", mostrar por 2 a 3 segundos o meme ilustrado, desenho nosso com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: o Zappy na frente da porta, com um balão de pergunta e uma chave na mão [na edição: meme da porta com a chave]. No "Agora você vai investigar", ampliar a experiência e mostrar a cena parada, sem tocar nos controles [ampliar experiência]. No "O Zappy ajuda", mostrar o Zappy [apontar zappy]. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não apontar os controles da experiência, não fazer os testes pela criança nem mostrar o resultado de nenhuma comparação: a criança descobre na experiência. Não falar de blocos, áreas do Estúdio, regra nem código (decisões de 01/11 e 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Sabe a porta de casa, que só abre com a chave? Antes de abrir, é como se ela fizesse uma pergunta: a chave está aqui? E a resposta decide o que acontece.

[curious] O seu jogo vai ganhar uma tela de início, antes de a partida começar. E, cada vez que chega a hora de nascer uma pedra nova, o jogo pode fazer uma pergunta antes de criar a pedra: a partida já começou?

[curious] E na tela de início, as pedras nascem?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quantos asteroides o jogo cria, com e sem a pergunta, na tela de início e com a partida já começada. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-estado-do-jogo-K1 | Dedé | 1 | que chega a hora de nascer uma pedra nova, o jogo pode fazer uma pergunta antes de criar a pedra: a partida já começou? | E na tela de início, as pedras nascem? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantos asteroides o jogo cria, com e | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-estado-do-jogo-K1`: entrada — Manter o meme da porta com a chave até o fim da frase da professora. Saída — Depois da saída, ampliar a experiência com o tempo parado.


**Falas dentro da experiência:** `packages/core/src/learning/scene/guia-livre/game-state.ts`, na tela `packages/member-shell/src/components/scene-livre/game-state.tsx`. A orientação do Zappy sugere comparações pelo estado observado; os controles ficam livres e as descobertas contam em qualquer ordem.

**Recado na página (não gravar):** Sua vez! Investigue o que muda quando o jogo pergunta se a partida já começou. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Seção 2. Faça a partida esperar

### Clipe `video-embrulhar` · Faça a partida esperar

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-embrulhar`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da aula anterior [expandir estúdio]. No "Olhe o seu jogo logo que ele abre", apontar as pedras caindo na prévia [apontar prévia 400 120]. No "Deixe à vista o fim de Ao iniciar", apontar o lugar [apontar abaixo de "Dar ao sprite"]. No "Agora abra Jogo 2D, depois Jogo e telas", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida] e encaixar o bloco [encaixar "Mudar o estado do jogo para" abaixo de "Dar ao sprite"]. No "É este bloco que diz em que estado", apontar o bloco [apontar bloco "Mudar o estado do jogo para"]. No "Pegue a sequência pelo primeiro bloco, Limpar a tela", levar a sequência inteira com a mão, pelo **Limpar a tela**, até o lugar livre e soltar. No "Abra Programação e depois Lógica e Se", abrir as categorias [categoria Programação > Lógica & Se] e encaixar o bloco [encaixar "Se" em "A cada quadro do jogo"]. No "É este bloco que faz uma pergunta", apontar o Se [apontar bloco "Se"]. No "arraste essa pergunta para a lixeira", levar a pergunta x > 0 com a mão até a lixeira. No "pegue o bloco o estado do jogo é e solte nesse lugar", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida], soltar o bloco ao lado de Se e escolher jogando. No "Agora devolva a sequência para dentro do Se", levar a sequência pelo **Limpar a tela** e soltar dentro do então. No "Agora olhe a prévia", apontar a prévia sem nave e sem pedras [apontar prévia 400 240]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe o seu jogo logo que ele abre. Tá vendo? As pedras já caem, porque o jogo ainda não pergunta se a partida começou.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Com a pergunta, a tela de início esperava, e nada nascia. Agora a gente vai pôr essa pergunta no seu jogo!

[engaging, energetic, conversational voice] O jogo vai ter dois momentos, cada um com um nome: inicio, a tela de abertura, e jogando, a partida. Esse momento se chama estado do jogo.

[curious] E como o jogo sabe que deve começar na tela de início?

[engaging, energetic, conversational voice] O jogo começa no estado inicio, e isso acontece uma vez, quando ele abre. Por isso, o bloco do estado vai no fim de Ao iniciar.

[confident, clear, unhurried voice] Deixe à vista o fim de Ao iniciar, logo depois de Dar ao sprite nave 3 de vida.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para e solte logo abaixo de Dar ao sprite nave 3 de vida. Deixe inicio no menu.

[engaging, energetic, conversational voice] É este bloco que diz em que estado o jogo começa: na tela de início.

[engaging, energetic, conversational voice] Agora a pergunta. Tudo o que acontece em cada quadro da partida só pode acontecer quando o estado for jogando. Por isso, a sequência inteira de A cada quadro do jogo vai para dentro de uma pergunta.

[engaging, energetic, conversational voice] Primeiro, tire a sequência de dentro de A cada quadro do jogo, sem apagar nada. Deixe à vista um lugar livre do espaço dos blocos, perto de A cada quadro do jogo.

[engaging, energetic, conversational voice] Pegue a sequência pelo primeiro bloco, Limpar a tela, e solte nesse lugar. Os blocos encaixados abaixo dele vão juntos. Não apague nem crie cópias, porque essa sequência volta inteira para dentro da pergunta.

[confident, clear, unhurried voice] Agora deixe à vista o espaço de dentro de A cada quadro do jogo, que ficou vazio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro de A cada quadro do jogo.

[engaging, energetic, conversational voice] É este bloco que faz uma pergunta. Quando a resposta é sim, ele faz o que está dentro do então.

[confident, clear, unhurried voice] Repare: o Se vem com uma pergunta pronta, x maior que 0. Não é isso que o seu jogo precisa perguntar. Por isso, arraste essa pergunta para a lixeira do espaço dos blocos.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio ao lado de Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é e solte nesse lugar. No menu desse bloco, escolha jogando.

[engaging, energetic, conversational voice] É este bloco que faz a pergunta: a partida já começou? A resposta é sim quando o estado do jogo é jogando.

[engaging, energetic, conversational voice] Agora devolva a sequência para dentro do Se. Deixe à vista o espaço do então, pegue a sequência pelo primeiro bloco, Limpar a tela, e solte dentro do então.

[confident, clear, unhurried voice] Confira se ela termina no desenho das vidas e se todos os blocos do meio continuam lá.

[engaging, energetic, conversational voice] Agora olhe a prévia. [confident, clear, unhurried voice] Repare: a nave e as pedras não aparecem mais, porque o jogo está no estado inicio, e a resposta da pergunta é não.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Mudar o estado do jogo para inicio. Dentro de A cada quadro do jogo está o Se com o estado do jogo é jogando, e dentro do então dele está a sequência inteira, de Limpar a tela até o desenho das vidas. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] A tela de início ainda está vazia. O que ela mostra vem na próxima parte.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-embrulhar-K1 | Dedé | 1 | momentos, cada um com um nome: inicio, a tela de abertura, e jogando, a partida. Esse momento se chama estado do jogo. | E como o jogo sabe que deve começar na tela de início? | O jogo começa no estado inicio, e isso acontece uma vez, quando ele abre. Por isso, o bloco do estado vai no fim de Ao | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-embrulhar-K1`: entrada — Manter à vista o fim de Ao iniciar, sem pegar nenhum bloco. Saída — Depois da saída, apontar o fim de Ao iniciar junto da resposta.


**Recado na página (não gravar):** Agora faça a partida esperar! Comece o jogo em inicio, leve os blocos da partida para dentro de Se jogando e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Mostre a tela de abertura

### Clipe `video-tela-de-abertura` · Mostre a tela de abertura

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-tela-de-abertura`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Olhe o seu jogo logo que ele abre", apontar a prévia vazia [apontar prévia 400 240]. No "Olha aqui: na linha de baixo do bloco Se", apontar a linha dos sinais de mais [apontar bloco "Se"]. No "Clique uma vez no primeiro", clicar no sinal de mais que fica antes de senão se. No "Arraste essa pergunta para a lixeira", levar a pergunta x > 0 do ramo novo com a mão até a lixeira. No "Abra de novo Jogo 2D", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida], soltar **o estado do jogo é** ao lado de senão se e deixar inicio. No "pegue o bloco Mostrar tela com título", soltar o bloco no então desse senão se. No "É este bloco que desenha a tela de abertura", apontar o bloco [apontar bloco "Mostrar tela"]. No "Agora olhe a prévia", apontar a abertura [apontar prévia 400 240]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe o seu jogo logo que ele abre. Tá vendo? A tela fica sem nada, porque o jogo está no estado inicio e ainda não mostra nenhuma abertura. Agora a gente vai criar a tela de abertura!

[engaging, energetic, conversational voice] O Se pode fazer outra pergunta quando a resposta da primeira é não: o estado é inicio? Essa segunda pergunta fica num pedaço novo do bloco, o senão se.

[interested, animated voice] Olha aqui: na linha de baixo do bloco Se, tem dois sinais de mais, um antes de senão se e outro antes de senão. Clique uma vez no primeiro, o que fica antes de senão se.

[engaging, energetic, conversational voice] O ramo novo também chega com a pergunta x maior que 0. Arraste essa pergunta para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio ao lado de senão se. Abra de novo Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue outro o estado do jogo é, solte nesse lugar e deixe inicio no menu.

[engaging, energetic, conversational voice] É este ramo que responde quando o jogo está na tela de início.

[confident, clear, unhurried voice] Deixe à vista o espaço do então desse senão se. Na mesma categoria Telas e partida, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte nesse espaço.

[engaging, energetic, conversational voice] O bloco já vem com o título Nave contra Asteroides e com o subtítulo Destrua os asteroides! Deixe os dois assim.

[engaging, energetic, conversational voice] A dica já vem Aperte Enter para começar. Deixe assim também, porque é ela que avisa quem joga como começar a partida. E o fundo já vem escuro, com o texto bem visível.

[engaging, energetic, conversational voice] É este bloco que desenha a tela de abertura.

[engaging, energetic, conversational voice] Agora olhe a prévia. [interested, animated voice] Olha só: a abertura aparece! É que o jogo começa em inicio, e o ramo de inicio mostra a tela. O Enter ainda não começa a partida: isso vem mais adiante, nesta aula.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no senão se do Se grande, com o estado do jogo é inicio, está Mostrar tela, com a dica Aperte Enter para começar. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```


**Recado na página (não gravar):** Agora mostre a tela de abertura! Crie o ramo de inicio no Se, coloque a tela com a dica do Enter e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 4. Espere a partida para criar pedras e tiros

### Clipe `video-relogio-e-tiro` · Espere a partida para criar pedras e tiros

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-relogio-e-tiro`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Com a abertura no seu jogo, toque na barra de espaço", clicar no jogo [tocar prévia 400 240] e tocar na barra de espaço [tecla Space]. No "Deixe à vista o bloco A cada 40 quadros", arrastar até o bloco aparecer [arrastar até "A cada 40 quadros"]. No "Pegue o bloco que cria asteroides", levar o bloco com a mão até o espaço livre e soltar. No "Abra Programação e depois Lógica e Se", abrir as categorias [categoria Programação > Lógica & Se] e encaixar o bloco [encaixar "Se" em "A cada 40 quadros"]. No "arraste essa pergunta para a lixeira", levar a pergunta x > 0 com a mão até a lixeira. No "pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida], soltar o bloco ao lado de Se e escolher jogando. No "Agora leve o bloco que cria asteroides", levar o bloco para dentro do então. No "Encontre o evento da barra de espaço", arrastar até o evento aparecer [arrastar até "Quando apertar a tecla"]. No "Pegue a sequência pelo primeiro bloco, Criar tiro", levar a sequência com a mão até o espaço livre. No "pegue outro Se e solte dentro do evento", abrir as categorias [categoria Programação > Lógica & Se], encaixar o bloco [encaixar "Se" em "Quando apertar a tecla"] e levar a pergunta pronta até a lixeira. No "solte nesse lugar e escolha jogando", soltar **o estado do jogo é** ao lado de Se e escolher jogando. No "Agora leve Criar tiro e Tocar efeito", levar a sequência para dentro do então. No "Agora teste: clique na área do jogo", clicar no jogo [tocar prévia 400 240] e tocar na barra de espaço [tecla Space], deixando ouvir o silêncio sem fala por cima. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Com a abertura no seu jogo, toque na barra de espaço. Tá vendo? Nenhum tiro aparece, mas o som toca, porque a tecla não espera a partida.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com a pergunta, nada nascia antes da partida. Agora a gente vai pôr a pergunta no seu jogo também!

[engaging, energetic, conversational voice] No seu jogo, ela vai em dois lugares: no bloco A cada 40 quadros, que cria as pedras, e na barra de espaço, que cria os tiros.

[engaging, energetic, conversational voice] Comece pelas pedras. Deixe à vista o bloco A cada 40 quadros e um espaço livre perto dele.

[engaging, energetic, conversational voice] Pegue o bloco que cria asteroides, de dentro de A cada 40 quadros, e solte nesse espaço livre por enquanto.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro de A cada 40 quadros, que ficou vazio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro dele.

[engaging, energetic, conversational voice] Ele chega de novo com a pergunta x maior que 0: arraste essa pergunta para a lixeira.

[curious] Qual pergunta vai aqui?

[engaging, energetic, conversational voice] A mesma da partida. Deixe à vista o lugar vazio ao lado de Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando.

[engaging, energetic, conversational voice] Agora leve o bloco que cria asteroides para dentro do então desse Se.

[engaging, energetic, conversational voice] É esta pergunta que deixa a pedra nascer só durante a partida. Os 40 quadros continuam contando, mas a pedra só é criada quando o estado é jogando.

[engaging, energetic, conversational voice] Agora os tiros. Encontre o evento da barra de espaço, em Quando acontecer, e deixe à vista um espaço livre perto dele.

[engaging, energetic, conversational voice] Pegue a sequência pelo primeiro bloco, Criar tiro, e solte nesse espaço por enquanto. Tocar efeito vai junto, porque está encaixado logo abaixo.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro do evento da barra de espaço, que ficou vazio. Abra Programação e depois Lógica e Se, pegue outro Se e solte dentro do evento. Arraste a pergunta x maior que 0 para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio ao lado de Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando.

[engaging, energetic, conversational voice] Agora leve Criar tiro e Tocar efeito, juntos, para dentro do então, nessa ordem.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e toque na barra de espaço com a abertura na tela. Escute: não sai mais som de tiro, porque a resposta da pergunta é não enquanto o jogo está em inicio.

[curious] E como eu confiro se as pedras também esperam?

[engaging, energetic, conversational voice] Para isso, a gente precisa olhar os blocos. As pedras ficam escondidas atrás da tela de abertura, e olhar a imagem não prova nada sobre elas. Por isso, volte aos blocos e confira se ficou assim: dentro de A cada 40 quadros está o Se jogando, com o bloco que cria asteroides no então. E, dentro do evento da barra de espaço, está outro Se jogando, com Criar tiro e Tocar efeito no então.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-relogio-e-tiro-K1 | Dedé | 1 | o bloco Se e solte dentro dele. Ele chega de novo com a pergunta x maior que 0: arraste essa pergunta para a lixeira. | Qual pergunta vai aqui? | A mesma da partida. Deixe à vista o lugar vazio ao lado de Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e | [curious] |
| video-relogio-e-tiro-K2 | Dedé | 1 | abertura na tela. Escute: não sai mais som de tiro, porque a resposta da pergunta é não enquanto o jogo está em inicio. | E como eu confiro se as pedras também esperam? | Para isso, a gente precisa olhar os blocos. As pedras ficam escondidas atrás da tela de abertura, e olhar a imagem não | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-relogio-e-tiro-K1`: entrada — Manter à vista o Se dentro de A cada 40 quadros, já sem a pergunta pronta. Saída — Depois da saída, abrir as categorias de Telas e partida.
- `video-relogio-e-tiro-K2`: entrada — Manter a abertura na tela, sem concluir nada pela ausência de pedras na imagem. Saída — Depois da saída, voltar aos blocos e apontar o Se jogando no relógio e no evento da barra de espaço.


**Recado na página (não gravar):** Agora faça as pedras e os tiros esperarem a partida! Coloque a pergunta jogando no relógio das pedras e na barra de espaço e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 5. Use Enter para começar

### Clipe `video-enter` · Use Enter para começar

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-enter`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique na área do jogo e toque em Enter", clicar no jogo [tocar prévia 400 240] e tocar em Enter [tecla Enter]. No "Deixe esse lugar à vista", arrastar até o evento da barra de espaço aparecer [arrastar até "Quando apertar a tecla"]. No "Abra Jogo 2D, depois Controles", abrir as categorias [categoria Jogo 2D > Controles > Teclado, ações e toque] e soltar o bloco abaixo do evento inteiro da barra de espaço. No "No menu da tecla, escolha Enter", escolher Enter no menu do bloco novo. No "Abra Programação e depois Lógica e Se", abrir as categorias [categoria Programação > Lógica & Se], soltar o Se dentro do evento Enter e levar a pergunta pronta até a lixeira. No "pegue o bloco o estado do jogo é, solte nesse lugar e deixe inicio", abrir as categorias [categoria Jogo 2D > Jogo e telas > Telas e partida] e soltar o bloco ao lado de Se. No "pegue o bloco Mudar o estado do jogo para, solte dentro do então", soltar o bloco e escolher jogando. No "É este bloco que começa a partida", apontar o bloco. No "Agora teste: clique na área do jogo e toque em Enter", clicar no jogo [tocar prévia 400 240] e tocar em Enter [tecla Enter], depois mover a nave e atirar [tecla Space]. No "Agora toque em Enter durante a partida", tocar em Enter [tecla Enter] e mostrar a partida continuando. No "Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique na área do jogo e toque em Enter. Tá vendo? A abertura continua, porque o jogo ainda não espera essa tecla.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com a partida começada, a resposta virava sim. Agora a gente vai fazer o Enter do seu jogo começar a partida!

[engaging, energetic, conversational voice] Tocar na tecla Enter é um evento, como tocar na barra de espaço. Por isso, ele vai em Quando acontecer, abaixo do evento inteiro da barra de espaço.

[engaging, energetic, conversational voice] Deixe esse lugar à vista. Abra Jogo 2D, depois Controles e depois Teclado, ações e toque, e pegue o bloco Quando apertar a tecla. Arraste para dentro de Quando acontecer e solte abaixo do evento inteiro da barra de espaço, sem encaixar dentro dele.

[confident, clear, unhurried voice] No menu da tecla, escolha Enter.

[curious] Mas só pode começar se estiver na abertura, né?

[engaging, energetic, conversational voice] Isso! O Enter só pode começar a partida na tela de início. Por isso, dentro desse evento vai um Se.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro do evento Enter. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. Arraste a pergunta x maior que 0 para a lixeira.

[confident, clear, unhurried voice] Deixe à vista o lugar vazio ao lado de Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e deixe inicio no menu.

[confident, clear, unhurried voice] Deixe à vista o espaço do então desse Se. Na mesma categoria Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha jogando.

[engaging, energetic, conversational voice] É este bloco que começa a partida: ele muda o estado do jogo para jogando, e a pergunta de cada quadro passa a responder sim.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e toque em Enter. [interested, animated voice] Olha só: a abertura some e a partida começa! Mova a nave, atire e confira se as pedras caem, se os pontos contam e se as batidas tiram vidas.

[curious] E se eu tocar em Enter no meio da partida?

[engaging, energetic, conversational voice] Agora toque em Enter durante a partida. [confident, clear, unhurried voice] Repare: ela continua, sem recomeçar, porque o Se do Enter só muda o estado quando ele é inicio.

[engaging, energetic, conversational voice] Por enquanto, ficar sem vidas ainda não muda de tela, porque o fim da partida vem na próxima aula.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: em Quando acontecer, abaixo do evento da barra de espaço, está Quando apertar a tecla Enter. Dentro dele, o Se pergunta se o estado do jogo é inicio e, no então, está Mudar o estado do jogo para jogando. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-enter-K1 | Dedé | 1 | e solte abaixo do evento inteiro da barra de espaço, sem encaixar dentro dele. No menu da tecla, escolha Enter. | Mas só pode começar se estiver na abertura, né? | Isso! O Enter só pode começar a partida na tela de início. Por isso, dentro desse evento vai um Se. Deixe à vista o | [curious] |
| video-enter-K2 | Dedé | 1 | e a partida começa! Mova a nave, atire e confira se as pedras caem, se os pontos contam e se as batidas tiram vidas. | E se eu tocar em Enter no meio da partida? | Agora toque em Enter durante a partida. Repare: ela continua, sem recomeçar, porque o Se do Enter só muda o estado | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-enter-K1`: entrada — Manter à vista o evento Enter recém-encaixado. Saída — Depois da saída, mostrar o espaço de dentro do evento Enter.
- `video-enter-K2`: entrada — Manter a partida rodando na prévia. Saída — Depois da saída, tocar em Enter com a partida rodando.


**Recado na página (não gravar):** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
