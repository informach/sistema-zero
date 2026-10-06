# Roteiro de gravação · Corre, Dino! · Aula 9

**Termine e recomece a corrida**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Abertura e partida funcionando, sem derrota. Saída: Colisão com efeitos, tela de fim e reinício limpo pelo mesmo evento de entrada.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Observe quando o jogo reconhece a batida

### Clipe `video-contato` · Observe quando o jogo reconhece a batida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a área em 100% e o cacto longe. Diminuir a Distância do cacto um passo por vez, com as áreas pontilhadas à vista. Parar no primeiro BATEU e apontar o vão entre os desenhos. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino e o cacto, cada um dentro de um bambolê, com os bambolês se encostando. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender a colisão, o jeito que o jogo decide que o cacto bateu no Dino.
>
> Olha aqui: com Tamanho da área do Dino em 100%, eu aproximo o cacto com Distância do cacto, um pouco de cada vez. Em volta do Dino e do cacto há áreas pontilhadas. Enquanto elas não se encostam, nada acontece.
>
> Quando as áreas pontilhadas se encostam, aparece BATEU. Mas os desenhos ainda têm um espacinho entre eles. O jogo não olha o desenho: ele confere se as áreas se encostaram.
>
> É como brincar de pega-pega com bambolê: se um bambolê encosta no outro, já valeu, mesmo sem a mão encostar. No seu jogo, você vai usar essa batida para encerrar a partida.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Aproxime o cacto aos poucos e observe quando aparece BATEU.

## Seção 2. Encerre a partida na batida

### Clipe `video-batida-acaba-partida` · Encerre a partida na batida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Lembra da experiência da parte anterior? Você observou a indicação de contato. No seu jogo, comece a partida e deixe um cacto alcançar o Dino: a corrida continua. Agora faça a batida mudar o estado para fim.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o espaço entre Desenhar o grupo cactos e a limpeza, dentro do então de Se jogando no quadro. Abra Jogo 2D, depois Colisões e Encostar e bloquear. Pegue Para cada sprite do grupo que colidir com o sprite e encaixe nesse espaço.
>
> Escolha grupo cactos, sprite dino e apelido cacto. O apelido identifica o objeto que participou desta batida.
>
> Deixe à vista o interior da colisão. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue Mudar o estado do jogo para e encaixe dentro da colisão. Escolha fim.
>
> Comece a partida e deixe ocorrer uma batida. O Dino e os cactos deixam de ser desenhados, porque suas ações pertencem a jogando. Ainda não há tela de fim. Se a corrida continuar, confira os nomes e o estado fim dentro da colisão.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Mude para fim dentro da colisão entre Dino e cactos.

## Seção 3. Mostre a tela de fim

### Clipe `video-mapa-do-jogo` · Mostre a tela de fim

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "A batida já muda o jogo para fim. Como você fez para a abertura, acrescente um ramo que desenha uma tela nesse estado.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o Se do quadro, que já tem jogando e inicio. Clique uma vez no + ao lado de senão, na parte de baixo, para criar mais um senão se. Retire a comparação que veio no ramo novo.
>
> Deixe à vista a pergunta vazia do último ramo. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe e escolha fim.
>
> Deixe à vista o interior desse ramo fim. Na mesma categoria, pegue Mostrar tela com título subtítulo dica fundo e encaixe ali. No título, escreva Fim de jogo. No subtítulo, escreva Boa tentativa! Na dica, escreva Aperte qualquer tecla ou toque para jogar de novo. Escolha um fundo escuro.
>
> Comece e deixe o Dino bater. A tela de fim deve aparecer. Ela ainda não recomeça a corrida; por enquanto você montou o desenho. Se não aparecer, confira o estado fim tanto na colisão quanto no ramo da tela.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Mostre a tela de fim no ramo que consulta fim.

## Seção 4. Dê som e imagem à batida

### Clipe `video-batida-sentida` · Dê som e imagem à batida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Sua colisão já encerra a partida e mostra o fim. Você já ligou som a um acontecimento na fase 4. Agora coloque os efeitos dentro da batida, antes da mudança de estado.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o encaixe antes de Mudar o estado do jogo para fim, dentro da colisão. Abra Jogo 2D, depois Desenho e efeitos e Partículas. Pegue Soltar explosão no sprite e encaixe antes da mudança de estado. Escolha cacto no nome e uma cor para a explosão.
>
> Deixe à vista o espaço entre a explosão e a mudança de estado. Abra Jogo 2D, depois Desenho e efeitos e Efeitos. Pegue Tremer a tela e encaixe nesse espaço. Coloque intensidade 8.
>
> Deixe à vista o espaço entre a tremida e a mudança de estado. Abra Jogo 2D, depois Som e Efeitos prontos. Pegue Tocar efeito, encaixe ali e escolha derrota.
>
> Comece e deixe acontecer uma batida. Confira a explosão no cacto, a tremida, o som e a tela final. A ordem dentro da colisão é explodir, tremer, tocar e mudar para fim. Se o efeito sair no Dino, confira cacto no bloco da explosão.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Na colisão, exploda cacto, trema em 8, toque derrota e mude para fim.

## Seção 5. Compare voltar e reiniciar

### Clipe `video-trocar-nao-limpa` · Compare voltar e reiniciar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar na tela de início, com Mudar o estado do jogo para inicio escolhido em No fim, o toque faz. Clicar em Tocar na tela, deixar o tempo passar até a batida e mostrar os cactos que ficam na pista ao voltar e ao jogar de novo. Trocar para Reiniciar o jogo e mostrar a pista vazia na abertura e a partida começando só com um cacto novo, com os números da faixa à vista. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino arrumando as peças de um tabuleiro antes de começar outra partida. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender a diferença entre voltar para a abertura e reiniciar o jogo.
>
> Olha aqui: em No fim, o toque faz, eu escolho Mudar o estado do jogo para inicio. Clico em Tocar na tela, a partida começa, e eu espero um cacto bater no Dino. Fim de partida.
>
> Eu clico em Tocar na tela, e a abertura volta, mas os cactos continuam na pista. Clico de novo para jogar: a partida nova começa com os cactos da anterior e acaba na hora, com uma batida. Mudar o estado só troca a tela. Ele não arruma a pista.
>
> Agora, no fim, eu troco a ação para Reiniciar o jogo. Clico em Tocar na tela: a abertura volta com a pista vazia. Clico de novo, e a partida começa limpa. Reiniciar o jogo repete a preparação do começo.
>
> É como jogar de novo um jogo de tabuleiro: não basta voltar para a casa de início, é preciso arrumar as peças outra vez. No seu jogo, você vai usar Reiniciar o jogo quando alguém tocar na tela de fim.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Compare os dois modos de voltar e observe o começo da partida seguinte.

## Seção 6. Prepare uma nova partida

### Clipe `video-caminho-de-volta` · Prepare uma nova partida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou voltar à abertura com reiniciar a preparação. No seu jogo, toque na tela de fim: ainda não há resposta. Agora programe o reinício.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o Se inicio dentro de Quando apertar qualquer tecla ou tocar na tela. Clique uma vez no + ao lado de senão, na parte de baixo. Retire a comparação do novo senão se.
>
> Deixe à vista a pergunta desse ramo. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe e escolha fim.
>
> Deixe à vista o interior do ramo fim. Na mesma categoria, pegue Reiniciar o jogo e encaixe ali. Esse comando repete a preparação de Ao iniciar, recria o grupo e devolve o estado a inicio.
>
> Comece, deixe ocorrer uma batida e toque na tela de fim. A abertura deve voltar. Toque outra vez para jogar. Os cactos da partida anterior não devem continuar guardados. Se o toque não responder, confira o ramo fim dentro do mesmo evento de entrada.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Reinicie no senão se fim do evento de qualquer tecla ou toque.

## Seção 7. Confira o que você construiu

**Zappy na página (não gravar):** Retome o começo, a batida e o reinício nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 8. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Enviar para o guia, Enviar e Concluir fase).

**Narração:**
> "Seu jogo tem um ciclo completo. Comece, pule um cacto, deixe ocorrer uma batida e confira efeitos e tela de fim.
>
> Toque para voltar à abertura e comece outra partida. Confira que o Dino volta à posição preparada e que os cactos antigos não continuam na pista. Teste também a entrada por tecla.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.
