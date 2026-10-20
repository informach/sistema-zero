# Roteiro de gravação · Corre, Dino! · Aula 9

**Termine e recomece a corrida**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Abertura e partida funcionando, sem derrota. Saída: Colisão com efeitos, tela de fim e reinício limpo pelo mesmo evento de entrada.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Gravar só as falas marcadas como Professora; o recado é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "agora que", "ou seja"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Percebe?"). Neste curso, "então" é o encaixe do bloco Se e não serve de palavra de ligação. A montagem que aplica uma experiência começa pela retomada no próprio jogo, e o recado da página convida e termina na ação de saída (Diretrizes, seção 6, revisão de 06/10/2026; tom adulto em DIRETRIZES-ADULTO.md).

## Seção 1. Observe quando o jogo reconhece a batida

### Clipe `video-contato` · Observe quando o jogo reconhece a batida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a área em 100% e o cacto longe. Diminuir a Distância do cacto um passo por vez, com as áreas pontilhadas à vista. Parar no primeiro BATEU! e apontar o vão entre os desenhos. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino dando ré num carro, com uma área pontilhada em volta do para-choque chegando no cacto e o sensor apitando antes de a lataria encostar. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima seção. Executar cada gesto junto da fala correspondente.

**Na tela:** Aproximar até BATEU! e apontar o vão entre os desenhos e as áreas que se tocam.

**Professora:**

> “Esta é uma experiência para a gente entender a colisão, o jeito que o jogo decide que o cacto bateu no Dino.
>
> Olha aqui: com Tamanho da área do Dino em 100%, eu aproximo o cacto com Distância do cacto, um pouco de cada vez. Em volta do Dino e do cacto há áreas pontilhadas. Enquanto elas não se encostam, nada acontece.
>
> Quando as áreas pontilhadas se encostam, aparece BATEU! Mas os desenhos ainda têm um pequeno espaço entre eles.”

**Na tela:** Manter as áreas pontilhadas à vista enquanto explica como a batida é decidida.

**Professora:**

> “Repare: os desenhos nem se encostaram. O jogo não olha o desenho: ele confere se as áreas se encostaram.
>
> É como o sensor de ré do carro: ele apita quando a área em volta do para-choque chega no obstáculo, mesmo antes de a lataria encostar. No seu jogo, você vai usar essa batida para encerrar a partida.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção.”

**Recado na página (não gravar):** Sua vez: aproxime o cacto aos poucos até aparecer BATEU! Quando terminar, clique em Próxima seção.

## Seção 2. Encerre a partida na batida

### Clipe `video-batida-acaba-partida` · Encerre a partida na batida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Percebe?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado (Próxima seção). Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Comece a partida e deixe um cacto chegar no Dino. Percebe? A corrida continua, porque o jogo ainda não confere a batida.
>
> Lembra da experiência da seção anterior? O jogo marcou a batida quando as áreas se encostaram. Agora a gente vai fazer a batida terminar a partida.
>
> A batida é conferida em todo quadro, durante a partida, depois que os cactos andaram. Por isso, deixe à vista o espaço entre Desenhar o grupo cactos e a regra que tira do grupo, no então de Se jogando, dentro do quadro. Depois, abra Jogo 2D, depois Colisões e depois Encostar e bloquear, pegue o bloco Para cada sprite do grupo que colidir com o sprite e solte nesse espaço.
>
> Escolha o grupo cactos e o sprite dino. Repare na linha chamar o sprite de: ela chega com inimigo. Clique em inimigo e escreva cacto. É o nome que o seu jogo vai usar para o cacto que bateu.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Mostrar o desaparecimento do Dino e dos cactos depois da batida, sem desenhar uma tela de fim que ainda não existe.

**Professora:**

> “Falta dizer o que acontece quando ele bater. Deixe à vista o espaço vazio dentro da colisão. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para e solte dentro da colisão. Escolha fim.
>
> Agora comece a partida e deixe um cacto bater no Dino. Olha só: o Dino e os cactos somem, e ainda não aparece nenhuma tela de fim, porque as ações deles só acontecem no estado jogando, e agora o estado é fim.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “A corrida parou. Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: a colisão com o grupo cactos, o sprite dino e o nome cacto está no então de Se jogando, entre Desenhar o grupo cactos e a regra que tira do grupo. Dentro dela, está Mudar o estado do jogo para fim. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora faça a batida terminar a partida. Coloque a colisão entre o Dino e os cactos dentro do Se jogando, mudando o estado para fim. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

## Seção 3. Mostre a tela de fim

### Clipe `video-mapa-do-jogo` · Mostre a tela de fim

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Percebe?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado (Próxima seção). Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “A batida já muda o seu jogo para fim. Primeiro, comece a partida e deixe um cacto bater no Dino. Percebe? O Dino e os cactos somem, e só a floresta continua passando, porque o Se do quadro ainda não tem uma resposta para fim. Lembra da abertura, na aula anterior? Você fez um ramo senão se para desenhar a tela de início. Agora a gente vai fazer do mesmo jeito para a tela de fim.
>
> Deixe à vista o Se do quadro, que já tem os ramos jogando e inicio. Na linha de baixo do bloco, clique uma vez no + ao lado de senão se, para criar mais um senão se. O ramo novo chega com a pergunta x > 0: arraste essa pergunta para a lixeira.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Manter a tela de fim real à vista depois do teste.

**Professora:**

> “Quem perder precisa saber como tentar de novo, e é isso que a tela de fim vai mostrar. Agora deixe à vista o lugar vazio da pergunta do último ramo. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ?, solte nesse lugar e escolha fim.
>
> Deixe à vista o espaço vazio dentro do ramo fim. Na mesma categoria, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte ali. No título, escreva Fim de jogo. No subtítulo, escreva Boa tentativa! E, na dica, escreva Aperte qualquer tecla ou toque para jogar de novo. O fundo já chega escuro: mantenha ou escolha outra cor escura.
>
> Agora comece e deixe o Dino bater. Olha só: a tela de fim aparece.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “Agora dá para ver que a partida acabou. Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: o último ramo do Se do quadro pergunta se o estado do jogo é fim, com a tela de fim dentro dele, e a colisão muda o estado para fim. Depois de corrigir, teste de novo.
>
> A tela de fim ainda não recomeça a corrida, porque, por enquanto, você só montou o desenho.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora mostre a tela de fim. Acrescente mais um senão se ao Se do quadro, para o estado fim, com a tela de fim dentro dele. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

## Seção 4. Dê som e imagem à batida

### Clipe `video-batida-sentida` · Dê som e imagem à batida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado (Próxima seção). Executar cada gesto junto da fala correspondente.

**Na tela:** Retomar a regra da batida com os blocos à vista, sem inserir efeitos ainda.

**Professora:**

> “Você já fez a batida encerrar a partida. Falta dar som e imagem a esse momento, para quem joga perceber o que aconteceu. Lembra da aula 4? Você ligou um som a um acontecimento, o pulo. Agora a gente vai fazer a mesma coisa com a batida, colocando os efeitos dentro dela.”

**Na tela:** Apontar o lugar antes de Mudar o estado do jogo para fim e montar a explosão e, depois, Tremer a tela, na ordem narrada. Manter à vista a explosão e Tremer a tela, antes da mudança de estado, e só depois pegar o som.

**Professora:**

> “E o som vem antes ou depois da tela de fim? Os efeitos vêm antes da mudança de estado: primeiro o jogo mostra a batida e, por último, passa para a tela de fim. Por isso, deixe à vista o lugar logo antes de Mudar o estado do jogo para fim, dentro da colisão. Depois, abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite e solte antes da mudança de estado. No sprite, escolha cacto, o nome que você deu ao cacto que bateu, e escolha uma cor para a explosão.
>
> Agora deixe à vista o espaço entre a explosão e a mudança de estado. Abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, pegue o bloco Tremer a tela e solte nesse espaço. Ele já chega com intensidade 8: mantenha.”

**Na tela:** Depois, encaixar Tocar efeito com derrota e testar a batida, deixando ouvir o som. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “Com a explosão e a tremida no lugar, agora só falta o som. Deixe à vista o espaço entre Tremer a tela e a mudança de estado. Abra Jogo 2D, depois Som e depois Efeitos prontos, pegue o bloco Tocar efeito, solte ali e escolha derrota.
>
> Agora comece e deixe uma batida acontecer. Olha só: o cacto explode, a tela treme, o som toca e aparece a tela de fim. Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro da colisão, a ordem é explodir o cacto, tremer a tela em 8, tocar o efeito derrota e, por último, mudar o estado para fim. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora dê som e imagem à batida. Dentro da colisão, antes de mudar para fim, exploda o cacto, trema a tela em 8 e toque o som de derrota. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

## Seção 5. Compare voltar e reiniciar

### Clipe `video-trocar-nao-limpa` · Compare voltar e reiniciar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar na tela de início, com Mudar o estado do jogo para inicio escolhido em No fim, o toque faz. Clicar em Tocar na tela, deixar o tempo passar até a batida e mostrar os cactos que ficam na pista ao voltar e ao jogar de novo. Trocar para Reiniciar o jogo e mostrar a pista vazia na abertura e a partida começando só com um cacto novo, com os números da faixa à vista. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino arrumando as peças de um tabuleiro de xadrez antes de começar outra partida. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima seção. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir a segunda partida com os cactos antigos e deixar a batida visível.

**Professora:**

> “Esta é uma experiência para a gente entender a diferença entre voltar para a abertura e reiniciar o jogo.
>
> Olha aqui: em No fim, o toque faz, eu escolho Mudar o estado do jogo para inicio. Clico em Tocar na tela, a partida começa, e eu espero um cacto bater no Dino. Fim de partida.
>
> Eu clico em Tocar na tela, e a abertura volta, mas os cactos continuam na pista. Clico de novo para jogar: a partida nova começa com os cactos da anterior e acaba na hora, com uma batida. Mudar o estado só troca a tela. Ele não arruma a pista.”

**Na tela:** Trocar a ação para Reiniciar o jogo e mostrar abertura e nova partida com a pista limpa.

**Professora:**

> “Percebe? Comecei de novo e já perdi. É porque os cactos da outra partida ficaram ali. Agora, no fim, eu troco a ação para Reiniciar o jogo. Clico em Tocar na tela: a abertura volta com a pista vazia. Clico de novo, e a partida começa limpa. Reiniciar o jogo repete a preparação do começo.
>
> É como começar outra partida de xadrez: não basta dizer que começou, é preciso arrumar as peças no tabuleiro outra vez. No seu jogo, você vai usar Reiniciar o jogo quando alguém tocar na tela de fim.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção.”

**Recado na página (não gravar):** Sua vez: compare os dois jeitos de voltar e repare em como começa a partida seguinte. Quando terminar, clique em Próxima seção.

## Seção 6. Prepare uma nova partida

### Clipe `video-caminho-de-volta` · Prepare uma nova partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Percebe?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado (Próxima seção). Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “No seu jogo, deixe um cacto bater e toque na tela de fim. Percebe? Nada acontece, porque o toque ainda não tem resposta no estado fim.
>
> Lembra da experiência da seção anterior? Com Reiniciar o jogo, a partida nova começava limpa. Agora a gente vai programar o recomeço.
>
> O recomeço vai no mesmo evento que começa a partida. Deixe à vista o Se inicio, dentro de Quando apertar qualquer tecla ou tocar na tela. Na linha de baixo desse Se, clique uma vez no + ao lado de senão se. O ramo novo chega com a pergunta x > 0: arraste essa pergunta para a lixeira.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Mostrar a abertura restaurada antes do novo toque.

**Professora:**

> “Para o jogo voltar ao começo, a gente vai dizer o que fazer no estado fim. Deixe à vista o lugar vazio da pergunta desse ramo. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ?, solte nesse lugar e escolha fim.
>
> Agora deixe à vista o espaço vazio dentro do ramo fim. Na mesma categoria, pegue o bloco Reiniciar o jogo e solte ali. Esse bloco repete a preparação de Ao iniciar: cria de novo o grupo de cactos, vazio, e devolve o estado para inicio.
>
> Agora comece, deixe uma batida acontecer e toque na tela de fim. Olha só: a abertura volta.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “Voltou para o começo. Toque outra vez para jogar e repare que os cactos da partida anterior não estão mais na pista. Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no evento de qualquer tecla ou toque, o Se tem o ramo inicio, que muda para jogando, e o ramo senão se fim, com Reiniciar o jogo. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora prepare uma nova partida. No evento de qualquer tecla ou toque, acrescente um senão se fim com Reiniciar o jogo. Depois, clique em Verificar esta etapa e, em seguida, em Próxima seção.

## Seção 7. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu. As perguntas falam do começo da partida, da batida e do recomeço. Depois de clicar em Enviar quiz, leia as explicações: se alguma resposta não estiver certa, é só trocar a resposta e clicar em Enviar quiz de novo. Quando acertar todas, clique em Próxima seção.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do recado. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 8. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado (Enviar para o professor, Enviar, Projeto enviado ao professor e Concluir aula).

**Professora:**

> “Agora o seu jogo tem um ciclo completo: começo, partida, batida e recomeço. Antes de enviar o seu projeto, comece uma partida, pule um cacto, deixe uma batida acontecer e confira os efeitos e a tela de fim.
>
> Depois, toque para voltar à abertura e comece outra partida. Confira que o Dino volta ao lugar do começo e que os cactos antigos não continuam na pista. Teste também a entrada por tecla: clique em Atualizar e, sem clicar no jogo, use uma tecla para começar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Enviar para o professor e confirme em Enviar. Quando aparecer Projeto enviado ao professor, clique em Concluir aula.”

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo. Jogue uma partida inteira, do começo ao recomeço, clique em Verificar esta etapa e depois em Enviar para o professor. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.
