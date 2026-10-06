# Roteiro de gravação · Corre, Dino! · Aula 2

**Mostre o Dino e a floresta**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Tela e Dino criados na aula 1. Saída: Dino desenhado a cada quadro, floresta em velocidade 5, limpeza e descrição acessível; borda provisória retirada.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "agora que", "ou seja"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" é o encaixe do bloco Se e não serve de palavra de ligação. A montagem que aplica uma experiência começa pela retomada no próprio jogo, e a ponte do Zappy convida e termina na ação de saída (Diretrizes, seção 6, revisão de 06/10/2026).

## Seção 1. Compare o desenho no começo e a cada quadro

### Clipe `video-quadros` · Compare o desenho no começo e a cada quadro

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com Desenhar o Dino em Só no começo e Limpar a tela antes desligado. Clicar em Avançar 1 quadro e mostrar o x mudando na faixa, com o desenho do Dino no mesmo lugar (o contorno tracejado dos bastidores mostra o x novo). Trocar para A cada quadro, avançar e mostrar os dois Dinos. Ligar Limpar a tela antes, avançar e mostrar um Dino só, no lugar novo. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy folheando um bloquinho em que cada folha tem o Dino um pouco mais à frente. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender o que é um quadro e por que o jogo desenha o Dino de novo em cada um. Um quadro é uma imagem do jogo, e muitas imagens seguidas fazem o movimento.
>
> Olha aqui: com Desenhar o Dino em Só no começo, eu clico em Avançar 1 quadro. O x do Dino muda, mas o desenho dele continua no mesmo lugar. O Dino andou por dentro do jogo, e ninguém desenhou o Dino de novo.
>
> Quando eu troco para A cada quadro e avanço, aparece um Dino novo no lugar novo, e o desenho velho continua lá. Agora são dois Dinos na tela.
>
> Por último, eu ligo Limpar a tela antes e avanço de novo. Fica um Dino só, no lugar novo: o jogo apaga a imagem velha e desenha a nova. É como um desenho animado, feito com um desenho novo em cada folha. No seu jogo, você vai colocar Desenhar o sprite dentro de A cada quadro do jogo e, depois, Limpar a tela antes dele.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Sua vez! Compare o desenho só no começo, o desenho a cada quadro e o desenho com a tela limpa antes. Quando terminar, clique em Próxima parte.

## Seção 2. Mostre o Dino a cada quadro

### Clipe `video-motor-e-dino` · Mostre o Dino a cada quadro

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Olhe a área do seu jogo. Tá vendo? O Dino não aparece, porque nada manda desenhar ele.
>
> Lembra da experiência da parte anterior? O Dino só acompanhou o movimento quando foi desenhado de novo em cada quadro. Agora a gente vai fazer o seu Dino aparecer!
>
> A repetição fica numa área própria, chamada Enquanto estiver rodando. Deixe à vista um espaço vazio ao lado de Ao iniciar. Depois, abra Áreas do projeto, pegue Enquanto estiver rodando e solte nesse espaço, separada de Ao iniciar.
>
> Agora deixe à vista o espaço vazio dentro de Enquanto estiver rodando. Abra Jogo 2D, depois Tempo e depois Quadros e intervalos, pegue o bloco A cada quadro do jogo e solte dentro dessa área. Tudo o que ficar dentro dele vai acontecer de novo em cada quadro.
>
> Agora deixe à vista o espaço vazio dentro de A cada quadro do jogo. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, pegue o bloco Desenhar o sprite e solte dentro do quadro. No nome, escolha dino.
>
> Olhe a área do jogo. Olha só: o Dino aparece, parado no lugar em que foi criado! Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Criar dinossauro continua em Ao iniciar, e Desenhar o sprite dino está dentro de A cada quadro do jogo, em Enquanto estiver rodando, com o nome dino nos dois blocos. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora faça o seu Dino aparecer! Coloque A cada quadro do jogo em Enquanto estiver rodando e, dentro dele, Desenhar o sprite dino. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 3. Prepare uma imagem nova em cada quadro

### Clipe `video-limpeza` · Prepare uma imagem nova em cada quadro

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. No “Repare” da abertura, aproximar a sombra embaixo do Dino e deixar ver que ela escurece a cada quadro (conferir na gravação); depois da limpeza, mostrar a sombra clara de novo. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Aqui no seu jogo, olhe a sombra do Dino. Tá vendo? Ela vai ficando escura, porque cada desenho novo cai em cima do velho.
>
> Lembra da experiência da primeira parte desta fase? Com Limpar a tela antes, ficava um Dino só. Agora a gente vai colocar essa limpeza!
>
> A limpeza tem que vir antes do desenho, em todo quadro: primeiro o jogo apaga a imagem velha e, depois, desenha a nova. Por isso, deixe à vista o lugar logo antes de Desenhar o sprite, no começo de A cada quadro do jogo. Depois, abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, pegue o bloco Limpar a tela e solte nesse primeiro lugar.
>
> Olhe o Dino. Olha só: ele continua aparecendo, e a sombra embaixo dele volta a ficar clarinha, porque agora cada quadro começa com a tela limpa! Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, primeiro vem Limpar a tela e, logo abaixo, Desenhar o sprite dino. Depois de corrigir, teste de novo.
>
> Limpar a tela só apaga a imagem: o Dino que você criou continua no jogo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora prepare uma imagem nova em cada quadro! Coloque Limpar a tela antes de Desenhar o sprite dino. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 4. Compare a ordem dos desenhos

### Clipe `video-camadas` · Compare a ordem dos desenhos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a lista A ordem de desenhar com o Dino em 1º e a Floresta em 2º, e o Dino quase escondido. Trocar a ordem três vezes, no ritmo da fala, e manter o palco à vista a cada troca. Terminar com o Dino depois da Floresta. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy colando a figurinha do Dino por cima da figurinha da floresta. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender como a ordem dos desenhos decide quem fica na frente.
>
> Olha aqui: no começo, a lista desenha o Dino primeiro e a floresta depois. Só um pedacinho do Dino aparece, porque a floresta foi desenhada por cima dele.
>
> Quando eu coloco o Dino depois da Floresta, ele aparece inteiro, sem nada na frente. Ninguém foi apagado: só a ordem mudou.
>
> Se eu volto o Dino para antes da Floresta, ele se esconde de novo. Quando eu coloco o Dino depois da Floresta outra vez, ele volta para a frente. Quem é desenhado por último fica por cima. É como colar figurinhas no álbum: a última cobre a que já estava ali. No seu jogo, você vai encaixar Desenhar fundo de floresta antes de Desenhar o sprite.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Sua vez! Troque a ordem dos dois desenhos, repare em quem fica na frente e termine com o Dino depois da Floresta. Quando terminar, clique em Próxima parte.

## Seção 5. Coloque a floresta atrás do Dino

### Clipe `video-ordem-certa` · Coloque a floresta atrás do Dino

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: fazer no jogo o teste que ela pede e, no “Tá vendo?”, manter o resultado à vista. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Olhe a área do seu jogo. Tá vendo? O Dino está sozinho no fundo azul, porque o jogo ainda não desenha a floresta.
>
> Lembra da experiência da parte anterior? O Dino só apareceu inteiro quando foi desenhado depois da floresta. Agora a gente vai colocar a floresta atrás dele!
>
> O lugar da floresta é entre Limpar a tela e Desenhar o sprite, dentro de A cada quadro do jogo. Deixe esse espaço à vista. Depois, abra Jogo 2D, depois Cenários e depois Fundos, pegue o bloco Desenhar fundo de floresta e solte entre a limpeza e o desenho do Dino.
>
> Repare: o bloco chega com velocidade 4. Troque por 5, porque esse número diz quanto o fundo anda em cada quadro, e é ele que faz o Dino parecer correr pela floresta.
>
> Olhe a área do jogo. Olha só: a floresta passa atrás do Dino! Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, primeiro vem Limpar a tela, depois Desenhar fundo de floresta, com velocidade 5, e, por último, Desenhar o sprite dino, com uma floresta só. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora deixe a floresta atrás do seu Dino! Coloque Desenhar fundo de floresta, com velocidade 5, entre a limpeza e o desenho do Dino. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 6. Retire a borda provisória

### Clipe `video-retirar-borda` · Retire a borda provisória

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. No “Repare” da abertura, apontar no jogo ou no projeto o que ainda falta. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Repare: agora que a floresta mostra onde fica a área do jogo, a borda não faz mais falta. Ela serviu para você enxergar o tamanho da tela. Por isso, retire só a borda e deixe o resto como está.
>
> Olha aqui: dentro de Ao iniciar, a borda está entre a preparação da tela e Criar dinossauro. Se você puxar a borda, Criar dinossauro sai junto, porque está encaixado embaixo dela. Por isso, primeiro arraste Criar dinossauro para um espaço vazio. Depois, arraste Mostrar a borda da tela para a lixeira e, por último, encaixe Criar dinossauro de novo, logo abaixo de Preparar o jogo em tela cheia.
>
> Olhe a área do jogo. Olha só: a floresta continua passando, e o Dino continua aparecendo, agora sem a borda! Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: Ao iniciar tem Preparar o jogo em tela cheia e, logo abaixo, Criar dinossauro, sem a borda. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora retire a borda provisória! Tire só Mostrar a borda da tela e deixe Criar dinossauro em Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 7. Ouça a descrição do jogo

### Clipe `video-descricao` · Ouça a descrição do jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a descrição vazia. Clicar em Ouvir a tela e deixar ouvir Tela do jogo. Imagem. Escrever a frase no campo Descrição do jogo, clicar em Ouvir a tela e mostrar as marcas o que fazer: sim e como jogar: sim. Se o navegador não tiver voz, mostrar a leitura escrita. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy ao telefone, explicando o jogo do Dino para um amigo do outro lado da linha. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender o que ouve uma pessoa que usa leitor de tela. O leitor de tela é um programa que lê a tela em voz alta para quem não consegue ver bem.
>
> Olha aqui: quando eu clico em Ouvir a tela com o campo vazio, ele diz só: Tela do jogo. Imagem. O programa não vê o desenho, por isso não tem como contar o que acontece.
>
> Agora eu escrevo Corra com o dino e pule os cactos apertando espaço e clico em Ouvir a tela de novo. Ele lê a frase inteira, e as marcas mostram que ela diz o que fazer e como jogar.
>
> É como explicar uma brincadeira por telefone: quem está do outro lado não vê nada, por isso você conta o que fazer e como. No seu jogo, essa frase vai no bloco Descrever o jogo para leitor de tela.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Sua vez! Ouça a tela sem descrição e depois com a frase que diz o que fazer e como jogar. Quando terminar, clique em Próxima parte.

## Seção 8. Escreva a descrição do jogo

### Clipe `video-descrever-jogo` · Escreva a descrição do jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Começar pela fala de abertura, antes de qualquer bloco: mostrar Ao iniciar e, no “Tá vendo?”, apontar que ainda não há bloco de descrição. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "No seu jogo, olhe Ao iniciar. Tá vendo? Não tem nenhum bloco de descrição, por isso o leitor de tela não teria nada para contar.
>
> Lembra da experiência da parte anterior? Com a frase, o leitor de tela contava como jogar. Agora você vai escrever a sua descrição!
>
> A descrição vale para o jogo inteiro, desde o começo. Por isso, ela vai em Ao iniciar, logo abaixo de Preparar o jogo em tela cheia. Deixe à vista o espaço entre Preparar o jogo em tela cheia e Criar dinossauro. Depois, abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Descrever o jogo para leitor de tela e solte nesse espaço.
>
> No texto, apague a frase que veio no bloco e escreva esta, exatamente assim, sem ponto no fim: Corra com o dino e pule os cactos apertando espaço. Essa frase não aparece desenhada sobre a floresta, porque ela fica guardada para o leitor de tela. O pulo ainda vai ser montado, mas tudo bem: a frase descreve o jogo completo.
>
> Confira se ficou assim: em Ao iniciar, logo abaixo da preparação da tela, está Descrever o jogo para leitor de tela, com a frase inteira. O Dino e a floresta continuam aparecendo como antes.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora conte como se joga o seu jogo! Escreva na descrição a frase Corra com o dino e pule os cactos apertando espaço, sem ponto no fim. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

## Seção 9. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Em cada “Olha aqui”, “Olha só” ou “Repare”, apontar na tela o lugar, o bloco ou o resultado citado. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Enviar meu projeto, Enviar e Concluir fase).

**Narração:**
> "Olha só: o seu jogo já mostra o Dino na frente da floresta! Antes de enviar o seu projeto, vamos conferir tudo. Olhe a área do jogo: a floresta tem que passar atrás, e o Dino tem que continuar aparecendo.
>
> Agora confira a ordem dentro de A cada quadro do jogo: limpar a tela, a floresta com velocidade 5 e o desenho do Dino. Confira também que a borda saiu e que a descrição está em Ao iniciar.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Confira o Dino na frente da floresta, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.
