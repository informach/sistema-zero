# Roteiro de produção · Comece a partida com Enter

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Seção 1. Escolha quando o jogo pode agir

### Clipe `video-estado-do-jogo` · Escolha quando o jogo pode agir

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-estado-do-jogo`

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Confirmar rótulo Criar asteroide via cast. A cena game-state usa Toque para começar, no palco, diferente do Enter que será construído no projeto. Com Criar asteroide no relógio, fora do Se, clicar em Tempo na abertura e mostrar o contador de asteroides criados subindo. Levar a peça para dentro de Se o estado do jogo é jogando, deixar passar uns quatro segundos e mostrar o contador em esperando, com os toques do relógio subindo na faixa. Clicar em Toque para começar e mostrar as pedras nascendo de novo. A caixa do relógio mostra No relógio, a cada 40 quadros, o mesmo intervalo do projeto. Meme na comparação: na frase da corrida, mostrar por 2 a 3 segundos o meme ilustrado nosso, os asteroides parados atrás da linha de largada e o Zappy segurando a bandeira, com a legenda "só depois da largada"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Esta é uma experiência para a gente entender o estado do jogo: ele guarda em que momento o jogo está. Aqui a gente vai usar inicio, para a abertura, e jogando, para a partida.

[interested, animated voice] Olha aqui: a peça Criar asteroide está em No relógio, a cada 40 quadros, fora de Se o estado do jogo é jogando. Eu clico em Tempo, ainda na abertura. Tá vendo? O relógio toca e as pedras nascem, e o contador de asteroides criados sobe, mesmo sem ninguém jogando.

[engaging, energetic, conversational voice] Agora eu levo a peça para dentro de Se o estado do jogo é jogando, e tudo recomeça do zero. Deixo o tempo passar uns quatro segundos na abertura. [confident, clear, unhurried voice] Repare: o relógio continua tocando, mas o contador mostra esperando, e nenhuma pedra nasce. É que o Se pergunta se o estado é jogando, e, na abertura, a resposta é não, por isso Criar asteroide espera. É como uma corrida: todo mundo espera o sinal de largada, e ninguém sai correndo antes.

[engaging, energetic, conversational voice] Por último, eu clico em Toque para começar, na tela da experiência. [interested, animated voice] Olha só: o estado vira jogando, e as pedras voltam a nascer. Aqui, a partida começa com um toque, mas, no seu jogo, você vai programar o Enter para começar a partida.

[upbeat, encouraging voice] Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.
```


**Recado na página (não gravar):** Sua vez! Compare Criar asteroide fora e dentro de Se jogando, antes e depois de começar. Quando terminar, clique em Próxima parte.

## Seção 2. Separe a abertura da partida

### Clipe `video-embrulhar` · Separe a abertura da partida

**Estimativa de gravação:** aproximadamente 6 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-embrulhar`

**Na tela:** Começar pela retomada: abrir o jogo e, no "Tá vendo?", mostrar as pedras caindo desde o começo. A pergunta x > 0 do Se é um bloco de verdade: arrastá-la para a lixeira do espaço dos blocos antes de encaixar a pergunta nova; conferir antes da gravação onde fica a lixeira. O bloco de estado inicial entra depois de criar os ramos, para reduzir tempo em tela vazia. Mostrar toda a pilha transferida. No "Olha aqui", apontar os dois + da linha de baixo do Se e clicar no que fica antes de senão se. Não colocar o relógio de 40 quadros dentro do quadro principal. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olhe o seu jogo logo que ele abre. Tá vendo? As pedras já caem, porque o jogo ainda não tem abertura.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Dentro do Se jogando, as pedras esperavam a partida começar. Agora a gente vai criar a abertura no seu jogo!

[engaging, energetic, conversational voice] Para começar, você vai tirar a sequência de dentro de A cada quadro do jogo, sem apagar nada. Deixe à vista um lugar livre do espaço dos blocos, perto de A cada quadro do jogo. Depois, pegue a sequência pelo primeiro bloco, Limpar a tela, e solte nesse lugar. Os blocos encaixados abaixo dele vão juntos. Não apague nem crie cópias, porque daqui a pouco essa sequência volta inteira para dentro do Se.

[confident, clear, unhurried voice] Agora deixe à vista o espaço de dentro de A cada quadro do jogo, que ficou vazio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro de A cada quadro do jogo.

[confident, clear, unhurried voice] Repare que o Se vem com uma pergunta pronta: x maior que 0. Mas não é isso que o seu jogo precisa perguntar, por isso arraste essa pergunta para a lixeira do espaço dos blocos. O lugar ao lado de Se fica vazio, e é ali que vai a pergunta certa. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é e solte no lugar vazio ao lado de Se. No menu desse bloco, escolha jogando. Assim, o Se pergunta se a partida já começou.

[engaging, energetic, conversational voice] Agora devolva a sequência para dentro do Se: deixe à vista o espaço do então, pegue a sequência pelo primeiro bloco, Limpar a tela, e solte dentro do então. [confident, clear, unhurried voice] Confira se ela termina no desenho das vidas e se todos os blocos do meio continuam lá.

[engaging, energetic, conversational voice] Agora a abertura, que precisa de um ramo próprio no Se. [interested, animated voice] Olha aqui: na linha de baixo do bloco Se, tem dois sinais de mais, um antes de senão se e outro antes de senão. Clique uma vez no primeiro +, o que fica antes de senão se.

[engaging, energetic, conversational voice] O ramo novo também chega com a pergunta x maior que 0. Arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de senão se. Abra de novo Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue outro o estado do jogo é, solte nesse lugar e deixe inicio no menu.

[confident, clear, unhurried voice] Deixe à vista o espaço do então desse senão se. Na mesma categoria Telas e partida, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte nesse espaço.

[engaging, energetic, conversational voice] O bloco já vem com o título Nave contra Asteroides e o subtítulo Destrua os asteroides! Mantenha os dois. A dica já vem Aperte Enter para começar: mantenha também, porque é ela que avisa quem joga como começar a partida. O fundo já vem escuro, e o texto aparece bem nele: é só manter.

[curious] E como o jogo sabe que deve começar na abertura?

[engaging, energetic, conversational voice] Falta dizer em que estado o jogo começa, e isso acontece uma vez, no fim de Ao iniciar: deixe esse lugar à vista. Ainda em Jogo 2D, Jogo e telas e Telas e partida, pegue o bloco Mudar o estado do jogo para, solte no fim de Ao iniciar e deixe inicio no menu.

[interested, animated voice] Olha só: a abertura aparece! Isso acontece porque o jogo começa em inicio, e o ramo de inicio mostra a tela. O Enter ainda não começa a partida, porque essa resposta vem em outra parte.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo está o Se com o estado do jogo é jogando, e dentro do então dele está a sequência inteira, de Limpar a tela até o desenho das vidas. No senão se, com o estado do jogo é inicio, está Mostrar tela. E, no fim de Ao iniciar, está Mudar o estado do jogo para inicio. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-embrulhar-K1 | Dedé | 1 | é ela que avisa quem joga como começar a partida. O fundo já vem escuro, e o texto aparece bem nele: é só manter. | E como o jogo sabe que deve começar na abertura? | Falta dizer em que estado o jogo começa, e isso acontece uma vez, no fim de Ao iniciar: deixe esse lugar à vista. Ainda | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-embrulhar-K1`: entrada — Parar com Mostrar tela preenchido à vista. Saída — Depois da saída, mostrar o fim de Ao iniciar.


**Recado na página (não gravar):** Agora separe a abertura da partida! Leve os blocos da partida para dentro de Se jogando, crie o ramo da abertura e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 3. Espere a partida para criar pedras e tiros

### Clipe `video-relogio-e-tiro` · Espere a partida para criar pedras e tiros

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-relogio-e-tiro`

**Na tela:** Começar tocando na barra de espaço com a abertura na tela e, no "Percebeu?", deixar ouvir o som do tiro, sem música por cima. A pergunta x > 0 de cada Se vai para a lixeira antes de encaixar a pergunta nova. Conferir condições e contagem única dos criadores. A abertura opaca esconde objetos: não usar sua aparência isolada como prova de que nada nasce. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Com a abertura na tela, clique na área do jogo e toque na barra de espaço. Percebeu? O som do tiro toca antes de a partida começar. É que o relógio das pedras e o evento da barra de espaço ficam fora do Se que você montou. Agora vamos fazer essas duas ações esperarem a partida também.

[engaging, energetic, conversational voice] Comece pelas pedras. Deixe à vista o bloco A cada 40 quadros e um espaço livre perto dele. Pegue o bloco que cria asteroides, de dentro do relógio, e solte nesse espaço livre por enquanto.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro de A cada 40 quadros, que ficou vazio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro do relógio. Ele chega de novo com a pergunta x maior que 0: arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de Se.

[curious] Qual pergunta vai dentro desse relógio?

[confident, clear, unhurried voice] Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando. Depois, leve o criador de asteroides para dentro do então desse Se. O intervalo continua 40, mas agora a pedra só é criada quando o estado é jogando.

[engaging, energetic, conversational voice] Agora os tiros. Encontre o evento da barra de espaço, em Quando acontecer, e deixe à vista um espaço livre perto dele. Pegue a sequência pelo primeiro bloco, Criar tiro, e solte nesse espaço por enquanto. Tocar efeito vai junto, porque está encaixado logo abaixo.

[confident, clear, unhurried voice] Deixe à vista o espaço de dentro do evento da barra de espaço, que ficou vazio. Abra Programação e depois Lógica e Se, pegue outro Se e solte dentro do evento. Arraste a pergunta x maior que 0 para a lixeira e deixe à vista o lugar vazio ao lado de Se.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando. Depois, leve Criar tiro e Tocar efeito, juntos, para dentro do então, nessa ordem.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e toque na barra de espaço com a abertura na tela. Dessa vez não sai mais som de tiro, porque o Se responde não enquanto o jogo está em inicio.

[curious] E como eu confiro se as pedras também esperam?

[engaging, energetic, conversational voice] Para isso, a gente precisa olhar os blocos. Já as pedras ficam escondidas atrás da tela de abertura, e olhar a imagem não prova nada sobre elas. Por isso, volte aos blocos e confira se ficou assim: dentro de A cada 40 quadros está o Se jogando, com o criador de asteroides no então. E, dentro do evento da barra de espaço, está outro Se jogando, com Criar tiro e Tocar efeito no então.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-relogio-e-tiro-K1 | Dedé | 1 | de novo com a pergunta x maior que 0: arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de Se. | Qual pergunta vai dentro desse relógio? | Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e | [curious] |
| video-relogio-e-tiro-K2 | Dedé | 1 | com a abertura na tela. Dessa vez não sai mais som de tiro, porque o Se responde não enquanto o jogo está em inicio. | E como eu confiro se as pedras também esperam? | Para isso, a gente precisa olhar os blocos. Já as pedras ficam escondidas atrás da tela de abertura, e olhar a imagem | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-relogio-e-tiro-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.
- `video-relogio-e-tiro-K2`: entrada — Concluir a montagem e o teste sem som na abertura, sem concluir nada pela ausência de pedras na imagem. Saída — Voltar aos blocos e conferir o Se jogando no relógio e no evento da barra de espaço.


**Recado na página (não gravar):** Agora faça as pedras e os tiros esperarem a partida! Coloque a pergunta jogando no relógio e na barra de espaço e clique em Verificar projeto. Depois, clique em Próxima parte.

## Seção 4. Use Enter para começar

### Clipe `video-enter` · Use Enter para começar

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Clipe:** `video-enter`

**Na tela:** Começar tocando em Enter com a abertura na tela e, no "Tá vendo?", mostrar que nada muda. Testar a transição real inicio → jogando e Enter durante jogando. Não exigir reinício, vitória ou derrota ainda. Ao terminar, clicar em Verificar projeto, mostrar Objetivo cumprido! e seguir o encaminhamento narrado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Primeiro, clique na área do jogo e toque em Enter. Tá vendo? A abertura continua na tela, porque o seu jogo ainda não sabe o que fazer quando alguém toca nessa tecla. Agora programe o Enter para começar a partida.

[engaging, energetic, conversational voice] Tocar na tecla Enter é um evento, assim como tocar na barra de espaço. Por isso, ele vai em Quando acontecer, abaixo do evento inteiro da barra de espaço: deixe esse lugar à vista.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Controles e depois Teclado, ações e toque, e pegue o bloco Quando apertar a tecla. Arraste para dentro de Quando acontecer e solte abaixo do evento inteiro da barra de espaço, sem encaixar dentro dele. No menu da tecla, escolha Enter.

[curious] Mas só pode começar se estiver na abertura, né?

[engaging, energetic, conversational voice] O Enter só pode começar a partida quando o jogo está na abertura, por isso dentro desse evento vai um Se. Deixe à vista o espaço de dentro do evento Enter. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. Arraste a pergunta x maior que 0 para a lixeira e deixe à vista o lugar vazio ao lado de Se.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e deixe inicio no menu.

[confident, clear, unhurried voice] Deixe à vista o espaço do então desse Se. Na mesma categoria Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha jogando. Assim, o Enter começa a partida só quando o jogo está na abertura.

[upbeat, encouraging voice] Agora teste: clique na área do jogo e toque em Enter. [interested, animated voice] Olha só: a abertura some e a partida começa! Mova a nave, atire e confira se as pedras caem, se os pontos contam e se as batidas tiram vidas.

[curious] E se eu tocar em Enter no meio da partida?

[engaging, energetic, conversational voice] Agora toque em Enter durante a partida. [confident, clear, unhurried voice] Repare: ela continua, sem recomeçar, porque o Se só muda o estado quando ele é inicio. Por enquanto, ficar sem vidas ainda não muda de tela, porque você ainda não montou o encerramento.

[reassuring, encouraging voice] Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: em Quando acontecer, abaixo do evento da barra de espaço, está Quando apertar a tecla Enter. Dentro dele, o Se pergunta se o estado do jogo é inicio e, no então, está Mudar o estado do jogo para jogando. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-enter-K1 | Dedé | 1 | e solte abaixo do evento inteiro da barra de espaço, sem encaixar dentro dele. No menu da tecla, escolha Enter. | Mas só pode começar se estiver na abertura, né? | O Enter só pode começar a partida quando o jogo está na abertura, por isso dentro desse evento vai um Se. Deixe à vista | [curious] |
| video-enter-K2 | Dedé | 1 | e a partida começa! Mova a nave, atire e confira se as pedras caem, se os pontos contam e se as batidas tiram vidas. | E se eu tocar em Enter no meio da partida? | Agora toque em Enter durante a partida. Repare: ela continua, sem recomeçar, porque o Se só muda o estado quando ele é | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Imagem nas substituições kids (não gravar):**

- `video-enter-K1`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.
- `video-enter-K2`: entrada — Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Saída — Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.


**Recado na página (não gravar):** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.
