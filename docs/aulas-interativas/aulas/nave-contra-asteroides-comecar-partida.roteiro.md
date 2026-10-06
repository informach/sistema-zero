# Roteiro de gravação · Nave Contra Asteroides · Aula 8

**Comece a partida com Enter**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento. Saída: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Escolha quando o jogo pode agir

### Clipe `video-estado-do-jogo` · Escolha quando o jogo pode agir

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Confirmar rótulo Criar asteroide via cast. A cena game-state usa Toque para começar, no palco, diferente do Enter que será construído no projeto. Com Criar asteroide no relógio, fora do Se, clicar em Tempo na abertura e mostrar o contador de asteroides criados subindo. Levar a peça para dentro de Se o estado do jogo é jogando, deixar passar uns quatro segundos e mostrar o contador em esperando, com os toques do relógio subindo na faixa. Clicar em Toque para começar e mostrar as pedras nascendo de novo. A caixa do relógio mostra No relógio, a cada 40 quadros, o mesmo intervalo do projeto. Meme na comparação: na frase da corrida, mostrar por 2 a 3 segundos o meme ilustrado nosso, os asteroides parados atrás da linha de largada e o Zappy segurando a bandeira, com a legenda "só depois da largada"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender o estado do jogo: ele guarda em que momento o jogo está. Vamos usar inicio, para a abertura, e jogando, para a partida.
>
> Olha aqui: a peça Criar asteroide está em No relógio, a cada 40 quadros, fora de Se o estado do jogo é jogando. Eu clico em Tempo, ainda na abertura. O relógio toca e as pedras nascem. O contador de asteroides criados sobe, mesmo sem ninguém jogando.
>
> Agora eu levo a peça para dentro de Se o estado do jogo é jogando, e tudo recomeça do zero. Deixo o tempo passar uns quatro segundos na abertura. O relógio continua tocando, mas o contador mostra esperando, e nenhuma pedra nasce. O Se pergunta se o estado é jogando. Na abertura, a resposta é não, então Criar asteroide espera. É como uma corrida: todo mundo espera o sinal de largada, e ninguém sai correndo antes.
>
> Por último, eu clico em Toque para começar, na tela da experiência. O estado vira jogando, e as pedras voltam a nascer. Aqui, o começo por toque já veio pronto. No seu jogo, você vai programar o Enter para começar a partida.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Compare criar asteroides fora e dentro de Se jogando, antes e depois de começar.

## Seção 2. Separe a abertura da partida

### Clipe `video-embrulhar` · Separe a abertura da partida

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** O bloco de estado inicial entra depois de criar os ramos para reduzir tempo em tela vazia. Mostrar toda a pilha transferida. Não colocar o relógio de 40 quadros dentro do quadro principal. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou a criação de pedras com e sem a pergunta sobre o estado. No seu jogo, as pedras começam a cair assim que ele abre. Agora separe a abertura da partida com essa pergunta.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Vamos separar a partida da abertura. Dentro de A cada quadro do jogo, pegue a sequência pelo primeiro bloco, Limpar a tela, e solte temporariamente num espaço livre. Os blocos encaixados abaixo vão juntos. Não apague nem crie cópias.
>
> Deixe à vista o interior agora vazio de A cada quadro do jogo. Abra Programação e depois Lógica e Se. Pegue Se e encaixe dentro de A cada quadro do jogo. Retire a comparação que veio no campo da condição. Ela não será usada aqui.
>
> Deixe à vista a condição do Se. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ? e encaixe na condição vazia. Escolha jogando. Pegue a sequência que começa em Limpar a tela e encaixe dentro do então. Confira que ela termina no desenho das vidas e conserva todos os blocos no meio.
>
> No bloco de condição, clique no + ao lado de senão se, na parte de baixo do bloco, uma vez. Retire a comparação do ramo novo. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue outro o estado do jogo é ? e encaixe na nova condição. Escolha inicio.
>
> Deixe à vista o então do ramo inicio. Na mesma categoria Telas e partida, pegue Mostrar tela com título subtítulo dica fundo e encaixe no então desse senão se. Confira o título Nave contra Asteroides. No subtítulo, escreva Destrua os asteroides. Na dica, escreva Aperte Enter para começar. Escolha um fundo escuro que deixe o texto legível.
>
> Deixe à vista o fim de Ao iniciar. Ainda em Jogo 2D, Jogo e telas, Telas e partida, pegue Mudar o estado do jogo para. Encaixe no fim de Ao iniciar e escolha inicio. Agora a abertura deve aparecer. Se a tela ficar vazia, confira se o senão se pergunta por inicio e se Mostrar tela está dentro desse ramo. Enter ainda não começa porque vamos montar essa resposta em outra parte.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Leve os blocos da partida para Se jogando e crie o ramo da abertura.

## Seção 3. Espere a partida para criar pedras e tiros

### Clipe `video-relogio-e-tiro` · Espere a partida para criar pedras e tiros

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Conferir condições e contagem única dos criadores. A abertura opaca esconde objetos: não usar sua aparência isolada como prova de que nada nasce. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "A abertura já aparece, mas criar pedras e disparar estão em outros lugares do projeto. Vamos fazer essas ações esperarem a partida também.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Dentro de A cada 40 quadros, retire temporariamente o bloco que cria asteroides e deixe num espaço livre. Deixe à vista o interior do evento ou relógio do qual acabou de retirar a sequência. Abra Programação e depois Lógica e Se. Pegue Se e encaixe dentro de A cada 40 quadros. Retire a comparação que veio na condição.
>
> Deixe à vista a condição do Se que acabou de encaixar. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe na condição e escolha jogando. Leve o criador de asteroides para dentro do então. O intervalo continua sendo 40; ele só cria a pedra quando o estado é jogando.
>
> Agora vá ao evento da barra de espaço. Retire temporariamente a sequência que começa em Criar tiro; Tocar efeito vai junto. Abra Programação e depois Lógica e Se. Pegue outra Se e encaixe dentro do evento. Retire a comparação da condição.
>
> Deixe à vista a condição do Se que acabou de encaixar. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe na condição e escolha jogando. Coloque Criar tiro e Tocar efeito dentro do então, nessa ordem.
>
> Clique no jogo e toque na barra de espaço na abertura. Não deve haver som de tiro. Confira os dois encaixes: criar asteroide dentro de Se jogando, no intervalo; criar tiro e tocar som dentro de Se jogando, no evento. A tela de abertura cobre o jogo, então olhar só a imagem não prova que nenhuma pedra foi criada.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Coloque uma condição jogando no intervalo e outra dentro da barra de espaço.

## Seção 4. Use Enter para começar

### Clipe `video-enter` · Use Enter para começar

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Testar a transição real inicio → jogando e Enter durante jogando. Não exigir reinício, vitória ou derrota ainda. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Agora programe a tecla que começa a partida. Deixe à vista o encaixe depois do evento inteiro da barra de espaço, em Quando acontecer. Abra Jogo 2D, depois Controles e Teclado, ações e toque. Pegue Quando apertar a tecla e encaixe dentro de Quando acontecer, abaixo do evento inteiro da barra de espaço. Escolha Enter.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Deixe à vista o interior do evento Enter. Abra Programação e depois Lógica e Se. Pegue Se e encaixe dentro desse novo evento. Retire a comparação da condição. Deixe à vista a condição do Se dentro de Enter. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe na condição e escolha inicio.
>
> Deixe à vista o então dessa condição. Na mesma categoria Telas e partida, pegue Mudar o estado do jogo para, encaixe dentro do então e escolha jogando. Essa regra faz Enter começar a partida somente na abertura.
>
> Clique na área do jogo. Confira a abertura, toque em Enter e teste setas e tiros. As pedras devem cair, os pontos devem contar e as batidas devem tirar vidas. Toque em Enter durante a partida: ela deve continuar, sem recomeçar. Você ainda não montou o encerramento; por enquanto, ficar sem vidas não muda de tela.
>
> Se Enter não começar, confira a tecla escolhida, a condição inicio e a mudança para jogando dentro do então.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Programe Enter, teste a abertura e a partida e envie.
