# Roteiro de gravação · Corre, Dino! · Aula 3

**Faça o Dino cair e pular**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Dino parado diante da floresta. Saída: Gravidade e controles de pulo, com impulso de referência 14.

**Vozes e edição:** Professora conduz; Debinha é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Gravar as falas marcadas como Professora e avatar; a ponte do Zappy é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "agora que", "ou seja"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" é o encaixe do bloco Se e não serve de palavra de ligação. A montagem que aplica uma experiência começa pela retomada no próprio jogo, e a ponte do Zappy convida e termina na ação de saída (Diretrizes, seção 6, revisão de 06/10/2026).

## Seção 1. Compare o salto com e sem gravidade

### Clipe `video-gravidade-modelo` · Compare o salto com e sem gravidade

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a gravidade desligada e o Dino no chão. Tocar no Dino e deixar a altura crescer até o tempo parar, com o Dino no alto. Ligar o fio da Gravidade ao Dino com ele no ar e acompanhar a subida mais lenta, a parada e a queda até o chão, com a altura à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy jogando uma bola para cima e a bola voltando para a mão dele. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte. Executar cada gesto junto da fala correspondente; as notas abaixo delimitam as entradas do avatar.

**Na tela:** Tocar no Dino sem gravidade e esperar a experiência parar com ele no alto.

**Professora:**

> “Esta é uma experiência para a gente entender a gravidade, a força que traz o Dino de volta ao chão.
>
> Olha aqui: com a gravidade desligada, eu toco no Dino. Ele pula e sobe sem parar: o número da altura só cresce. Nada puxa o Dino para baixo. A experiência para o tempo com ele lá no alto.”

**ID de edição:** `video-gravidade-modelo-avatar-01`.

**Na tela:** Debinha entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Debinha (avatar):**

> “E agora? Como ele volta para o chão?”

**Na tela:** Debinha sai antes da resposta. Ligar o fio da Gravidade com o Dino no ar e acompanhar a subida, a parada e a queda.

**Professora:**

> “Com o Dino no ar, eu ligo a Gravidade ao Dino. Ele ainda sobe um pouquinho, cada vez mais devagar, para e cai até o chão. A gravidade puxa o Dino para baixo um pouco em cada quadro.
>
> É como jogar uma bola para cima: ela sobe, perde força e volta para a sua mão. No seu jogo, você vai encaixar Aplicar a gravidade do mundo ao sprite dentro de A cada quadro do jogo, para puxar o Dino em todos os quadros.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.”


**Zappy na página (não gravar):** Sua vez! Faça o Dino pular sem gravidade e ligue a Gravidade ao Dino enquanto ele está no ar. Quando terminar, clique em Próxima parte.

## Seção 2. Deixe a gravidade pronta

### Clipe `video-aplicar-gravidade` · Deixe a gravidade pronta

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Na abertura não há teste no jogo, porque o efeito desta parte ainda não aparece: a fala só lembra a experiência e anuncia a montagem. No fim, mostrar o Dino ainda parado, como a fala explica. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Professora:**

> “Lembra da experiência da parte anterior? Sem gravidade, o Dino subia sem parar. Agora a gente vai colocar a gravidade no seu jogo!
>
> A gravidade tem que puxar o Dino em todo quadro, antes de ele ser desenhado. Por isso, deixe à vista o espaço entre Desenhar fundo de floresta e Desenhar o sprite dino, dentro de A cada quadro do jogo. Depois, abra Jogo 2D, depois Movimento e depois Velocidade e gravidade, pegue o bloco Aplicar a gravidade do mundo ao sprite e solte nesse espaço. No nome, escolha dino.
>
> Confira se ficou assim: dentro de A cada quadro do jogo, a gravidade está depois da floresta e antes do desenho do Dino, com o nome dino. O Dino continua parado, e está certo: a gravidade já puxa, mas quem move o Dino com essa força e faz ele pousar na grama é o controle do pulo, que você monta daqui a pouco.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte.”


**Zappy na página (não gravar):** Agora deixe a gravidade pronta no seu Dino! Coloque Aplicar a gravidade do mundo ao sprite depois da floresta e antes do desenho do Dino. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 3. Compare duas alturas de pulo

### Clipe `video-impulso-modelo` · Compare duas alturas de pulo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com Impulso do salto em 9. Tocar no Dino e esperar o pouso, com a marca 68 à vista. Escolher Impulso 14, tocar no Dino de novo e esperar o pouso, com as duas marcas à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino numa cama elástica, com uma marca baixa escrita 9 e uma marca alta escrita 14. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Professora:**

> “Esta é uma experiência para a gente entender o impulso, a força que começa o pulo.
>
> Olha aqui: com o impulso em 9, eu toco no Dino. Ele sobe, volta ao chão e deixa uma marca na altura 68.
>
> Agora eu mudo o impulso para 14 e toco no Dino de novo. A marca nova fica na altura 163, bem acima da primeira. A gravidade foi a mesma nos dois saltos. O que mudou foi a força do começo do pulo.
>
> É como pular numa cama elástica: com mais força, você vai mais alto, e mesmo assim volta para baixo. No seu jogo, você vai colocar força do pulo 14 no bloco Controlar o dinossauro.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.”


**Zappy na página (não gravar):** Sua vez! Faça um salto com impulso 9 e outro com 14, esperando o Dino cair entre eles. Quando terminar, clique em Próxima parte.

## Seção 4. Dê os controles de pulo ao Dino

### Clipe `video-comando-de-pulo` · Dê os controles de pulo ao Dino

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Nos testes por tecla, clicar em Atualizar e não clicar no jogo. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte). Executar cada gesto junto da fala correspondente; as notas abaixo delimitam as entradas do avatar.

**Na tela:** Esperar o Dino completar o salto e pousar antes da entrada.

**Professora:**

> “Clique na área do seu jogo e toque na barra de espaço. Tá vendo? O Dino não pula, porque ainda não tem controle.
>
> Lembra da experiência da parte anterior? Com impulso 14, o pulo foi bem mais alto. Agora a gente vai dar os controles de pulo ao seu Dino!
>
> O controle vai depois da gravidade e antes do desenho, dentro de A cada quadro do jogo: a gravidade puxa o Dino para baixo, o controle move o Dino, faz ele pousar na grama e confere o pulo, e só então o Dino é desenhado no lugar novo. Deixe à vista o espaço entre Aplicar a gravidade do mundo ao sprite e Desenhar o sprite. Depois, abra Jogo 2D, depois Kits prontos e depois Dino, pegue o bloco Controlar o dinossauro e solte nesse espaço. O bloco já chega com o nome dino: mantenha. Na força do pulo, troque 15 por 14.
>
> Agora teste! Clique em Atualizar, a seta circular no alto da prévia do jogo, e, sem clicar no jogo, toque e solte a barra de espaço e espere o Dino pousar. Olha só: ele pula e volta para o chão!”

**ID de edição:** `video-comando-de-pulo-avatar-01`.

**Na tela:** Debinha entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Debinha (avatar):**

> “Foi! Ele pulou!”

**Na tela:** Debinha sai antes da resposta. Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste. Concluir os saltos com espaço, seta para cima e toque na parte de cima; esperar o pouso.

**Professora:**

> “Depois, faça outro salto com a seta para cima e mais um tocando na parte de cima da tela, porque o mesmo bloco já cuida dos três controles.”

**ID de edição:** `video-comando-de-pulo-avatar-02`.

**Na tela:** Debinha entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Debinha (avatar):**

> “Já consegui pular dos três jeitos!”

**Na tela:** Debinha sai antes da resposta. Retomar com o toque embaixo: tocar perto do chão junto da fala e mostrar o Dino se abaixando em vez de pular. Terminar o toque embaixo com o Dino no chão. Não começar o salto com dois toques antes da pergunta.

**Professora:**

> “Agora vamos conferir mais duas coisas. Se você tocar embaixo, perto do chão, o Dino se abaixa em vez de pular.”

**ID de edição:** `video-comando-de-pulo-avatar-03`.

**Na tela:** Debinha entra com o resultado anterior à vista. Manter os gestos parados durante a fala; não adiantar a demonstração seguinte.

**Debinha (avatar):**

> “Dá para pular de novo lá no alto?”

**Na tela:** Debinha sai antes da resposta. Só então tocar duas vezes na barra de espaço durante o mesmo salto e manter à vista que o segundo toque não faz o Dino pular de novo no ar.

**Professora:**

> “Vamos ver. Agora toque duas vezes na barra de espaço durante o mesmo salto. Repare: o segundo toque não faz o Dino pular de novo no ar, porque ele só começa um salto quando está no chão.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, a ordem é floresta, gravidade, controle e desenho do Dino, com o nome dino. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte.”


**Zappy na página (não gravar):** Agora dê os controles de pulo ao seu Dino! Coloque Controlar o dinossauro entre a gravidade e o desenho, com força do pulo 14, e teste espaço, seta para cima e um toque na parte de cima da tela. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 5. Confira o que você construiu

**Zappy na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam da tela e dos movimentos do seu Dino. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 6. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Enviar meu projeto, Enviar e Concluir fase).

**Professora:**

> “Agora o seu Dino já pula e volta para o chão! Antes de enviar o seu projeto, teste os três controles: a barra de espaço, a seta para cima e um toque na parte de cima da tela. Espere o Dino pousar entre um salto e outro, porque ele só pula de novo quando está no chão.
>
> Agora confira a ordem dentro de A cada quadro do jogo: a gravidade vem antes do controle, e os dois vêm antes do desenho do Dino. Deixe a força do pulo em 14, e as cores que você escolheu podem continuar do seu jeito.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar. Quando o envio terminar, clique em Concluir fase.”


**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Teste os três controles de pulo, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.
