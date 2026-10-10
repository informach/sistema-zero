# Roteiro de gravação · Corre, Dino! · Aula 7

**Separe a abertura da partida**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: A corrida começa assim que o projeto carrega. Saída: Estado inicial inicio; movimento, desenho do Dino e cactos, limpeza e nascimento protegidos por jogando.

**Vozes e edição:** Professora conduz; Debinha é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Gravar as falas marcadas como Professora e avatar; a ponte do Zappy é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "agora que", "ou seja"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" é o encaixe do bloco Se e não serve de palavra de ligação. A montagem que aplica uma experiência começa pela retomada no próprio jogo, e a ponte do Zappy convida e termina na ação de saída (Diretrizes, seção 6, revisão de 06/10/2026).

## Seção 1. Escolha quando o jogo pode agir

### Clipe `video-condicao` · Escolha quando o jogo pode agir

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar na tela de início, com Criar cacto no relógio, fora do Se. Clicar em Tempo até nascer um cacto. Levar a peça para Se o estado do jogo é jogando e deixar passar três segundos, com os toques do relógio subindo e os nascimentos em 0 na faixa. Clicar em Toque para começar, deixar o tempo passar e mostrar os nascimentos voltando. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino diante de uma porta trancada, girando uma chave escrita jogando. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte. Executar cada gesto junto da fala correspondente; as notas abaixo delimitam o corte do avatar.

**ID de edição:** `video-condicao-avatar-01`.

**Na tela:** Deixar nascer um cacto na abertura, com Criar cacto fora do Se.

**Professora:**

> “Esta é uma experiência para a gente entender a condição: uma pergunta que faz o jogo esperar a hora certa de agir.
>
> Olha aqui: com Criar cacto fora de Se o estado do jogo é jogando, eu deixo o tempo passar na tela de início. Nascem cactos antes de alguém jogar. O relógio cria cactos sem perguntar nada.”

**Na tela:** Debinha entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Debinha (avatar):**

> “Mas eu nem comecei a jogar!”

**Na tela:** Debinha sai antes da resposta. Mover a peça para dentro do Se jogando, soltar e repetir os testes antes e depois de começar.

**Professora:**

> “Vamos fazer os cactos esperarem a partida. Agora eu levo Criar cacto para dentro de Se o estado do jogo é jogando, e tudo recomeça do zero. Na tela de início, eu deixo passar três segundos. O relógio continua tocando, mas os nascimentos ficam em 0. A pergunta responde não, porque o estado ainda é inicio.
>
> Quando eu clico em Toque para começar, a partida começa, e os cactos voltam a nascer: agora a resposta é sim. É como a porta de casa, que só abre com a chave certa. Aqui, a chave é o estado jogando. No seu jogo, você vai guardar o estado inicio e colocar as ações da corrida dentro de um Se jogando.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.”


**Zappy na página (não gravar):** Sua vez! Compare a tela de início e a partida, com Criar cacto fora e dentro de Se o estado do jogo é jogando. Quando terminar, clique em Próxima parte.

## Seção 2. Guarde em que momento o jogo está

### Clipe `video-estado-inicio` · Guarde em que momento o jogo está

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Professora:**

> “Olhe a área do seu jogo. Tá vendo? A corrida começa sozinha, porque o jogo ainda não sabe em que momento está.
>
> Lembra da experiência da parte anterior? Na tela de início, os cactos esperavam a partida. Agora a gente vai guardar o estado do seu jogo!
>
> O estado começa junto com o jogo. Por isso, deixe à vista o fim de Ao iniciar, logo depois de Criar grupo de sprites. Depois, abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para e solte no fim de Ao iniciar. Ele já chega com inicio: mantenha.
>
> Confira se ficou assim: no fim de Ao iniciar, está Mudar o estado do jogo para inicio, e as regras de movimento e de criação dos cactos continuam nos mesmos lugares.
>
> Agora olhe o jogo de novo. Repare: o Dino e os cactos continuam correndo, e está certo, porque o bloco só guarda o nome do momento, e nenhuma regra pergunta por ele ainda. Quem vai fazer essa pergunta é o bloco Se.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte.”


**Zappy na página (não gravar):** Agora guarde em que momento o seu jogo está! Coloque Mudar o estado do jogo para inicio no fim de Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 3. Separe as ações da partida

### Clipe `video-embrulhar` · Separe as ações da partida

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Na troca do estado para jogando, mostrar o teste e, antes de Verificar esta parte, mostrar o estado de volta em inicio. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Professora:**

> “Olhe a área do seu jogo. Tá vendo? O Dino e os cactos continuam correndo, porque nenhuma regra pergunta pelo estado.
>
> Lembra da experiência da primeira parte desta fase? Dentro do Se jogando, a ação esperou a partida. Agora a gente vai colocar as ações da partida num Se!
>
> Antes de pegar cada peça, deixe à vista o lugar do encaixe. Se ele estiver fora da tela, é só arrastar um espaço vazio entre os blocos até ele aparecer.
>
> Olha aqui: dentro de A cada quadro do jogo, as ações da partida começam em Aplicar a gravidade do mundo ao sprite e vão até o fim. São o controle, o desenho do Dino, o movimento e o desenho dos cactos e a regra que tira do grupo. Arraste o bloco da gravidade para um espaço livre, e a pilha inteira vem junto, porque os outros blocos estão encaixados embaixo dele. Não copie nada: só separe.
>
> Agora deixe à vista o espaço logo depois de Desenhar fundo de floresta, dentro do quadro. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço.
>
> Repare: o Se chega com a pergunta x > 0. Arraste essa pergunta para a lixeira, para o lugar dela ficar vazio. Depois, abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ? e solte no lugar vazio da pergunta. No menu dele, escolha jogando.
>
> Agora deixe à vista o espaço vazio do então, dentro do Se. Arraste a pilha que você separou, segurando pela gravidade, e solte nesse espaço. A limpeza e a floresta ficam fora do Se, antes dele, porque a floresta também passa na tela de início.
>
> Agora olhe o jogo: com o estado em inicio, o Dino e os cactos deixam de aparecer, e só a floresta continua passando, porque as ações da partida esperam o estado jogando.
>
> Para conferir se essas ações ainda funcionam, troque, por um momento, o estado em Ao iniciar para jogando. Teste um pulo e espere um cacto entrar.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no então do Se jogando, a ordem é gravidade, controle, desenho do Dino, mover os cactos, desenhar os cactos e tirar do grupo quem saiu, e a limpeza e a floresta ficam antes do Se. Depois de corrigir, teste de novo.
>
> Antes de verificar, troque o estado em Ao iniciar de volta para inicio, porque é assim que o seu jogo tem que começar. O Dino e os cactos somem de novo, e só a floresta continua passando.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte.”


**Zappy na página (não gravar):** Agora separe as ações da partida! Coloque essas ações num Se o estado do jogo é jogando, com a limpeza e a floresta antes dele, e deixe o estado em inicio. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 4. Faça o relógio esperar a partida

### Clipe `video-relogio` · Faça o relógio esperar a partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Na troca do estado para jogando, mostrar o teste e, antes de Verificar esta parte, mostrar o estado de volta em inicio. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte). Executar cada gesto junto da fala correspondente; as notas abaixo delimitam o corte do avatar.

**ID de edição:** `video-relogio-avatar-01`.

**Na tela:** Concluir o teste em jogando e voltar para inicio antes da entrada; mostrar apenas a floresta passando.

**Professora:**

> “Lembra da experiência da primeira parte desta fase? Com Criar cacto dentro do Se, os cactos só nasciam durante a partida. Agora o relógio do seu jogo vai aprender a esperar também!
>
> O relógio fica fora do quadro, por isso ainda cria cactos escondidos na tela de início. Deixe à vista o interior do relógio de 1.4 segundo e arraste No grupo criar obstáculo para um espaço livre, fora do relógio. Ele vai voltar para dentro daqui a pouco, mas, antes, o relógio precisa ganhar a pergunta.
>
> Agora deixe à vista o espaço vazio dentro do relógio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte ali. Depois, arraste para a lixeira a pergunta x > 0 que veio nele.
>
> Deixe à vista o lugar vazio da pergunta desse Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ?, solte nesse lugar e escolha jogando. Depois, deixe à vista o espaço vazio do então e arraste No grupo criar obstáculo de volta, para dentro dele.
>
> Para testar, troque, por um momento, o estado em Ao iniciar para jogando. Olha só: os cactos nascem como antes! Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no relógio de 1.4 segundo, está o Se o estado do jogo é jogando, e No grupo criar obstáculo está no então desse Se. Depois de corrigir, teste de novo.
>
> Antes de verificar, troque o estado em Ao iniciar de volta para inicio, porque é assim que o seu jogo tem que começar. Só a floresta continua passando, e agora o seu jogo espera a partida, mesmo ainda sem uma tela de abertura desenhada.”

**Na tela:** Debinha entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Debinha (avatar):**

> “A floresta continua passando, mas os cactos esperam!”

**Na tela:** Debinha sai antes da resposta. Manter inicio e seguir para a verificação, o salvamento e a próxima parte.

**Professora:**

> “Isso mesmo. Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte.”


**Zappy na página (não gravar):** Agora faça o relógio esperar a partida! Coloque a criação dos cactos num Se jogando, dentro do relógio, e termine com inicio em Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 5. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Na troca do estado para jogando, mostrar o teste e, antes de Verificar esta parte, mostrar o estado de volta em inicio. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Enviar meu projeto, Enviar e Concluir fase).

**Professora:**

> “Agora o seu jogo espera no estado inicio! Antes de enviar o seu projeto, confira os dois lugares que perguntam pelo estado jogando: o Se dentro do quadro e o Se dentro do relógio dos cactos.
>
> Para testar a partida, troque, por um momento, o estado em Ao iniciar para jogando e confira o pulo, o som e a entrada dos cactos.
>
> Antes de verificar, troque o estado em Ao iniciar de volta para inicio, porque é com ele que você vai enviar o jogo. Repare na floresta: ela continua passando no estado inicio, porque ficou fora do Se, e a tela de começo ainda não foi desenhada.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar. Quando o envio terminar, clique em Concluir fase.”


**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Confira as duas perguntas de jogando, deixe o estado em inicio, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.
