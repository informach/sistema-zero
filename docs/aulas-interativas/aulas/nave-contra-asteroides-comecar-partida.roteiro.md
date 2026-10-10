# Roteiro de gravação · Nave Contra Asteroides · Aula 8

**Comece a partida com Enter**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento. Saída: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício.

**Vozes e edição:** Professora conduz; Dedé é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Gravar as falas marcadas como Professora e avatar; a ponte do Zappy é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" é o encaixe do bloco Se e não aparece como palavra de ligação. A ponte do Zappy começa convidando ("Sua vez!", "Agora…!", "Hora de…!") e termina na ação de saída. Cada montagem que aplica uma experiência começa por uma retomada curta, nesta ordem: o teste no próprio jogo ("Tá vendo?", com o porquê), a lembrança da experiência numa frase e o anúncio, uma vez só, colado ao primeiro passo. Depois de montar, a criança testa direto; a lista dos blocos entra uma vez só, depois do teste ("Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …").

## Seção 1. Escolha quando o jogo pode agir

### Clipe `video-estado-do-jogo` · Escolha quando o jogo pode agir

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Confirmar rótulo Criar asteroide via cast. A cena game-state usa Toque para começar, no palco, diferente do Enter que será construído no projeto. Com Criar asteroide no relógio, fora do Se, clicar em Tempo na abertura e mostrar o contador de asteroides criados subindo. Levar a peça para dentro de Se o estado do jogo é jogando, deixar passar uns quatro segundos e mostrar o contador em esperando, com os toques do relógio subindo na faixa. Clicar em Toque para começar e mostrar as pedras nascendo de novo. A caixa do relógio mostra No relógio, a cada 40 quadros, o mesmo intervalo do projeto. Meme na comparação: na frase da corrida, mostrar por 2 a 3 segundos o meme ilustrado nosso, os asteroides parados atrás da linha de largada e o Zappy segurando a bandeira, com a legenda "só depois da largada"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final. Executar cada gesto junto da fala correspondente; as notas abaixo delimitam as entradas do avatar.

**Na tela:** Deixar passar quatro segundos na abertura, com a peça dentro do Se e o contador esperando.

**Professora:**

> “Esta é uma experiência para a gente entender o estado do jogo: ele guarda em que momento o jogo está. Aqui a gente vai usar inicio, para a abertura, e jogando, para a partida.
>
> Olha aqui: a peça Criar asteroide está em No relógio, a cada 40 quadros, fora de Se o estado do jogo é jogando. Eu clico em Tempo, ainda na abertura. Tá vendo? O relógio toca e as pedras nascem, e o contador de asteroides criados sobe, mesmo sem ninguém jogando.
>
> Agora eu levo a peça para dentro de Se o estado do jogo é jogando, e tudo recomeça do zero. Deixo o tempo passar uns quatro segundos na abertura. Repare: o relógio continua tocando, mas o contador mostra esperando, e nenhuma pedra nasce. É que o Se pergunta se o estado é jogando, e, na abertura, a resposta é não, por isso Criar asteroide espera. É como uma corrida: todo mundo espera o sinal de largada, e ninguém sai correndo antes.”

**ID de edição:** `video-estado-do-jogo-avatar-01`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “Agora as pedras estão esperando a partida!”

**Na tela:** Dedé sai antes da resposta. Começar por toque na experiência e distinguir esse começo pronto do Enter que será programado no projeto.

**Professora:**

> “Isso. Vamos começar para ver o que muda. Por último, eu clico em Toque para começar, na tela da experiência. Olha só: o estado vira jogando, e as pedras voltam a nascer. Aqui, a partida começa com um toque, mas, no seu jogo, você vai programar o Enter para começar a partida.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.”


**Zappy na página (não gravar):** Sua vez! Compare Criar asteroide fora e dentro de Se jogando, antes e depois de começar. Quando terminar, clique em Próxima parte.

## Seção 2. Separe a abertura da partida

### Clipe `video-embrulhar` · Separe a abertura da partida

**Estimativa de gravação:** aproximadamente 6 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Começar pela retomada: abrir o jogo e, no "Tá vendo?", mostrar as pedras caindo desde o começo. A pergunta x > 0 do Se é um bloco de verdade: arrastá-la para a lixeira do espaço dos blocos antes de encaixar a pergunta nova; conferir antes da gravação onde fica a lixeira. O bloco de estado inicial entra depois de criar os ramos, para reduzir tempo em tela vazia. Mostrar toda a pilha transferida. No "Olha aqui", apontar os dois + da linha de baixo do Se e clicar no que fica antes de senão se. Não colocar o relógio de 40 quadros dentro do quadro principal. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente; as notas abaixo delimitam as entradas do avatar.

**Na tela:** Parar com a sequência inteira solta fora de A cada quadro do jogo.

**Professora:**

> “Olhe o seu jogo logo que ele abre. Tá vendo? As pedras já caem, porque o jogo ainda não tem abertura.
>
> Lembra da experiência da parte anterior? Dentro do Se jogando, as pedras esperavam a partida começar. Agora a gente vai criar a abertura no seu jogo!
>
> Para começar, você vai tirar a sequência de dentro de A cada quadro do jogo, sem apagar nada. Deixe à vista um lugar livre do espaço dos blocos, perto de A cada quadro do jogo. Depois, pegue a sequência pelo primeiro bloco, Limpar a tela, e solte nesse lugar. Os blocos encaixados abaixo dele vão juntos. Não apague nem crie cópias, porque daqui a pouco essa sequência volta inteira para dentro do Se.”

**ID de edição:** `video-embrulhar-avatar-01`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “A sequência saiu inteira, sem apagar nada!”

**Na tela:** Dedé sai antes da resposta. Depois da saída, mostrar A cada quadro do jogo vazio. Parar com jogando escolhido ao lado de Se.

**Professora:**

> “Agora deixe à vista o espaço de dentro de A cada quadro do jogo, que ficou vazio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro de A cada quadro do jogo.
>
> Repare que o Se vem com uma pergunta pronta: x maior que 0. Mas não é isso que o seu jogo precisa perguntar, por isso arraste essa pergunta para a lixeira do espaço dos blocos. O lugar ao lado de Se fica vazio, e é ali que vai a pergunta certa. Deixe esse lugar à vista.
>
> Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é e solte no lugar vazio ao lado de Se. No menu desse bloco, escolha jogando. Assim, o Se pergunta se a partida já começou.”

**ID de edição:** `video-embrulhar-avatar-02`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “Posso ficar na abertura sem perder uma vida!”

**Na tela:** Dedé sai antes da resposta. Depois da saída, devolver a sequência ao então junto da fala. Parar com inicio ao lado de senão se.

**Professora:**

> “Agora devolva a sequência para dentro do Se: deixe à vista o espaço do então, pegue a sequência pelo primeiro bloco, Limpar a tela, e solte dentro do então. Confira se ela termina no desenho das vidas e se todos os blocos do meio continuam lá.
>
> Agora a abertura, que precisa de um ramo próprio no Se. Olha aqui: na linha de baixo do bloco Se, tem dois sinais de mais, um antes de senão se e outro antes de senão. Clique uma vez no primeiro +, o que fica antes de senão se.
>
> O ramo novo também chega com a pergunta x maior que 0. Arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de senão se. Abra de novo Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue outro o estado do jogo é, solte nesse lugar e deixe inicio no menu.”

**ID de edição:** `video-embrulhar-avatar-03`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “Quem chegar ao meu jogo vai ver essa tela primeiro!”

**Na tela:** Dedé sai antes da resposta. Depois da saída, mostrar o espaço do então desse senão se. Parar com Mostrar tela preenchido à vista.

**Professora:**

> “Deixe à vista o espaço do então desse senão se. Na mesma categoria Telas e partida, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte nesse espaço.
>
> O bloco já vem com o título Nave contra Asteroides e o subtítulo Destrua os asteroides! Mantenha os dois. A dica já vem Aperte Enter para começar: mantenha também, porque é ela que avisa quem joga como começar a partida. O fundo já vem escuro, e o texto aparece bem nele: é só manter.”

**ID de edição:** `video-embrulhar-avatar-04`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “E como o jogo começa nessa tela?”

**Na tela:** Dedé sai antes da resposta. Depois da saída, mostrar o fim de Ao iniciar. Manter a abertura real à vista. A tecla Enter ainda não inicia a partida nesta parte.

**Professora:**

> “Falta dizer em que estado o jogo começa, e isso acontece uma vez, no fim de Ao iniciar: deixe esse lugar à vista. Ainda em Jogo 2D, Jogo e telas e Telas e partida, pegue o bloco Mudar o estado do jogo para, solte no fim de Ao iniciar e deixe inicio no menu.
>
> Olha só: a abertura aparece!”

**ID de edição:** `video-embrulhar-avatar-05`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “A abertura apareceu!”

**Na tela:** Dedé sai antes da resposta. Depois da saída, seguir para a conferência dos blocos.

**Professora:**

> “Isso acontece porque o jogo começa em inicio, e o ramo de inicio mostra a tela. O Enter ainda não começa a partida, porque essa resposta vem em outra parte.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo está o Se com o estado do jogo é jogando, e dentro do então dele está a sequência inteira, de Limpar a tela até o desenho das vidas. No senão se, com o estado do jogo é inicio, está Mostrar tela. E, no fim de Ao iniciar, está Mudar o estado do jogo para inicio. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte.”


**Zappy na página (não gravar):** Agora separe a abertura da partida! Leve os blocos da partida para dentro de Se jogando, crie o ramo da abertura e clique em Verificar esta parte. Depois, clique em Próxima parte.

## Seção 3. Espere a partida para criar pedras e tiros

### Clipe `video-relogio-e-tiro` · Espere a partida para criar pedras e tiros

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Começar tocando na barra de espaço com a abertura na tela e, no "Percebeu?", deixar ouvir o som do tiro, sem música por cima. A pergunta x > 0 de cada Se vai para a lixeira antes de encaixar a pergunta nova. Conferir condições e contagem única dos criadores. A abertura opaca esconde objetos: não usar sua aparência isolada como prova de que nada nasce. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente; as notas abaixo delimitam as entradas do avatar.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação.

**Professora:**

> “Com a abertura na tela, clique na área do jogo e toque na barra de espaço. Percebeu? O som do tiro toca antes de a partida começar. É que o relógio das pedras e o evento da barra de espaço ficam fora do Se que você montou. Agora vamos fazer essas duas ações esperarem a partida também.
>
> Comece pelas pedras. Deixe à vista o bloco A cada 40 quadros e um espaço livre perto dele. Pegue o bloco que cria asteroides, de dentro do relógio, e solte nesse espaço livre por enquanto.
>
> Deixe à vista o espaço de dentro de A cada 40 quadros, que ficou vazio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro do relógio. Ele chega de novo com a pergunta x maior que 0: arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de Se.”

**ID de edição:** `video-relogio-e-tiro-avatar-01`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “Qual pergunta vai dentro desse relógio?”

**Na tela:** Dedé sai antes da resposta. Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação.

**Professora:**

> “Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando. Depois, leve o criador de asteroides para dentro do então desse Se. O intervalo continua 40, mas agora a pedra só é criada quando o estado é jogando.
>
> Agora os tiros. Encontre o evento da barra de espaço, em Quando acontecer, e deixe à vista um espaço livre perto dele. Pegue a sequência pelo primeiro bloco, Criar tiro, e solte nesse espaço por enquanto. Tocar efeito vai junto, porque está encaixado logo abaixo.”

**ID de edição:** `video-relogio-e-tiro-avatar-02`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “Assim não vai ter barulho de tiro antes de começar!”

**Na tela:** Dedé sai antes da resposta. Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste. Concluir a montagem e o teste sem som na abertura, sem concluir nada pela ausência de pedras na imagem.

**Professora:**

> “Deixe à vista o espaço de dentro do evento da barra de espaço, que ficou vazio. Abra Programação e depois Lógica e Se, pegue outro Se e solte dentro do evento. Arraste a pergunta x maior que 0 para a lixeira e deixe à vista o lugar vazio ao lado de Se.
>
> Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando. Depois, leve Criar tiro e Tocar efeito, juntos, para dentro do então, nessa ordem.
>
> Agora teste: clique na área do jogo e toque na barra de espaço com a abertura na tela. Dessa vez não sai mais som de tiro, porque o Se responde não enquanto o jogo está em inicio.”

**ID de edição:** `video-relogio-e-tiro-avatar-03`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “E como eu confiro se as pedras também esperam?”

**Na tela:** Dedé sai antes da resposta. Voltar aos blocos e conferir o Se jogando no relógio e no evento da barra de espaço.

**Professora:**

> “Para isso, a gente precisa olhar os blocos. Já as pedras ficam escondidas atrás da tela de abertura, e olhar a imagem não prova nada sobre elas. Por isso, volte aos blocos e confira se ficou assim: dentro de A cada 40 quadros está o Se jogando, com o criador de asteroides no então. E, dentro do evento da barra de espaço, está outro Se jogando, com Criar tiro e Tocar efeito no então.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte.”


**Zappy na página (não gravar):** Agora faça as pedras e os tiros esperarem a partida! Coloque a pergunta jogando no relógio e na barra de espaço e clique em Verificar esta parte. Depois, clique em Próxima parte.

## Seção 4. Use Enter para começar

### Clipe `video-enter` · Use Enter para começar

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Começar tocando em Enter com a abertura na tela e, no "Tá vendo?", mostrar que nada muda. Testar a transição real inicio → jogando e Enter durante jogando. Não exigir reinício, vitória ou derrota ainda. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente; as notas abaixo delimitam as entradas do avatar.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação.

**Professora:**

> “Primeiro, clique na área do jogo e toque em Enter. Tá vendo? A abertura continua na tela, porque o seu jogo ainda não sabe o que fazer quando alguém toca nessa tecla. Agora programe o Enter para começar a partida.
>
> O Enter é uma tecla, ou seja, um evento, igual à barra de espaço. Por isso, ele vai em Quando acontecer, abaixo do evento inteiro da barra de espaço: deixe esse lugar à vista.
>
> Agora abra Jogo 2D, depois Controles e depois Teclado, ações e toque, e pegue o bloco Quando apertar a tecla. Arraste para dentro de Quando acontecer e solte abaixo do evento inteiro da barra de espaço, sem encaixar dentro dele. No menu da tecla, escolha Enter.”

**ID de edição:** `video-enter-avatar-01`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “Mas só pode começar se estiver na abertura, né?”

**Na tela:** Dedé sai antes da resposta. Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação.

**Professora:**

> “O Enter só pode começar a partida quando o jogo está na abertura, por isso dentro desse evento vai um Se. Deixe à vista o espaço de dentro do evento Enter. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. Arraste a pergunta x maior que 0 para a lixeira e deixe à vista o lugar vazio ao lado de Se.
>
> Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e deixe inicio no menu.
>
> Deixe à vista o espaço do então desse Se. Na mesma categoria Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha jogando. Assim, o Enter começa a partida só quando o jogo está na abertura.”

**ID de edição:** `video-enter-avatar-02`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “Vou testar o Enter!”

**Na tela:** Dedé sai antes da resposta. Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação.

**Professora:**

> “Agora teste: clique na área do jogo e toque em Enter. Olha só: a abertura some e a partida começa! Mova a nave, atire e confira se as pedras caem, se os pontos contam e se as batidas tiram vidas.”

**ID de edição:** `video-enter-avatar-03`.

**Na tela:** Dedé entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Dedé (avatar):**

> “E se eu tocar em Enter no meio da partida?”

**Na tela:** Dedé sai antes da resposta. Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “Agora toque em Enter durante a partida. Repare: ela continua, sem recomeçar, porque o Se só muda o estado quando ele é inicio. Por enquanto, ficar sem vidas ainda não muda de tela, porque você ainda não montou o encerramento.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: em Quando acontecer, abaixo do evento da barra de espaço, está Quando apertar a tecla Enter. Dentro dele, o Se pergunta se o estado do jogo é inicio e, no então, está Mudar o estado do jogo para jogando. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar. Quando o envio terminar, clique em Concluir fase.”


**Zappy na página (não gravar):** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.
