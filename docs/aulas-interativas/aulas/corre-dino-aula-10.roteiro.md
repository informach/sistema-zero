# Roteiro de gravação · Corre, Dino! · Aula 10

**Ajuste a área da batida**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Corrida completa, com área de colisão padrão. Saída: Área do Dino em 80% como referência, desenho tamanho 64; contorno de teste retirado.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare a área com o desenho

### Clipe `video-caixa-decide` · Compare a área com o desenho

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a área em 100% e o cacto longe. Aproximar até o primeiro BATEU e apontar o vão entre os desenhos. Diminuir a área para 80% sem mexer na distância. Aproximar até os desenhos se encostarem e, por último, diminuir a área para 40%, com a indicação da batida à vista a cada mudança. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é a mesma experiência da fase anterior, agora para a gente entender o tamanho da área que decide a batida.
>
> Olha aqui: com a área do Dino em 100%, eu aproximo o cacto até aparecer BATEU. Os desenhos ainda nem se encostaram: a área pega um pedaço vazio em volta do desenho.
>
> Sem mudar a distância, eu diminuo Tamanho da área do Dino para 80%. O BATEU some. O Dino continua do mesmo tamanho; só a área ficou menor.
>
> Agora eu aproximo o cacto até encostar no desenho do Dino. Com 80%, aparece BATEU, e os desenhos também se encostam. Essa batida parece justa. Por último, eu diminuo a área para 40%. Os desenhos se tocam, mas o jogo não marca a batida: a área ficou pequena demais. No seu jogo, você vai mostrar o contorno da área e deixar a área do Dino em 80%.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Mude apenas a área com o cacto parado; depois compare o contato com 40%.

## Seção 2. Mostre a área no seu jogo

### Clipe `video-ligar-raio-x` · Mostre a área no seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou o desenho com a área de contato. No seu jogo essa área está invisível. Mostre um contorno para conferir o ajuste.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o encaixe depois de Desenhar o sprite dino, dentro do então de Se jogando no quadro. Abra Jogo 2D, depois Colisões e Área de contato. Pegue Mostrar a caixa de colisão do sprite e encaixe depois do desenho do Dino. Escolha dino.
>
> Comece a partida e compare o contorno com o desenho. O contorno só mostra a área; não muda a batida. Se não aparecer, confira se foi desenhado depois do Dino e dentro de jogando.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Mostre o contorno da área de dino depois do desenho.

## Seção 3. Ajuste a área sem mudar o desenho

### Clipe `video-ajustar-area` · Ajuste a área sem mudar o desenho

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Na experiência Compare a área com o desenho, diminuir a porcentagem mudou a batida sem encolher o Dino. Agora faça esse ajuste no seu jogo, com o contorno visível.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim de Ao iniciar. Abra Jogo 2D, depois Colisões e Área de contato. Pegue Usar área de colisão de % do tamanho para o sprite e encaixe no fim de Ao iniciar. Escolha dino e deixe a porcentagem em 80.
>
> Comece e observe o contorno. O Dino continua com tamanho 64; a área é que ficou menor. Deixe um cacto chegar e compare a batida com o teste anterior.
>
> Você pode testar 70 e 85 nesse campo e comparar. Escolha um valor entre 70 e 85; no exemplo, fica 80. Não mude o tamanho do desenho para tentar ajustar a área. Confira o nome dino nos dois blocos de colisão.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Ajuste somente a área de colisão, mantendo o desenho em tamanho 64.

## Seção 4. Retire o contorno de teste

### Clipe `video-retirar-contorno` · Retire o contorno de teste

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Você já conferiu a área da batida. Retire o contorno de teste e mantenha a regra que define a porcentagem.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o bloco Mostrar a caixa de colisão do sprite, dentro de jogando. Separe a sequência que estiver abaixo dele para preservá-la. Retire só esse bloco e reconecte a sequência abaixo do desenho do Dino.
>
> Confira em Ao iniciar o bloco Usar área de colisão, com dino e a porcentagem escolhida. Comece outra partida. O contorno desaparece, e a batida continua usando a área menor. Se a regra sumir junto, devolva o bloco de ajuste a Ao iniciar.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Retire apenas o desenho do contorno e conserve o ajuste da área.

## Seção 5. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Enviar para o guia, Enviar e Concluir fase).

**Narração:**
> "Seu jogo usa uma área ajustada para a batida. Comece, pule e deixe ocorrer uma colisão para conferir o ciclo de fim e reinício.
>
> Confira tamanho 64 no Dino e a porcentagem escolhida entre 70 e 85 no bloco de área. O desenho do contorno deve estar retirado.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.
