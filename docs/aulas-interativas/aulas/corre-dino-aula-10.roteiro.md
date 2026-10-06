# Roteiro de gravação · Corre, Dino! · Aula 10

**Ajuste a área da batida**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Corrida completa, com área de colisão padrão. Saída: Área do Dino em 80% como referência, desenho tamanho 64; contorno de teste retirado.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare a área com o desenho

### Clipe `video-caixa-decide` · Compare a área com o desenho

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "Seu jogo já reconhece a batida. Agora compare o tamanho do desenho com a área usada para decidir esse contato.
>
> Na experiência, deixe a área do Dino em 100%. Aproxime o cacto um toque de cada vez até aparecer BATEU. Observe os desenhos nesse momento.
>
> Sem mudar a distância, diminua Tamanho da área do Dino para 80%. Observe a indicação. Depois aproxime o cacto até encostar no desenho do Dino e diminua a área para 40%. Compare de novo.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Mude apenas a área com o cacto parado; depois compare o contato com 40%.

## Seção 2. Mostre a área no seu jogo

### Clipe `video-ligar-raio-x` · Mostre a área no seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou o desenho com a área de contato. No seu jogo essa área está invisível. Mostre um contorno para conferir o ajuste.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o encaixe depois de Desenhar o sprite dino, dentro do então de Se jogando no quadro. Abra Jogo 2D, depois Colisões e Área de contato. Pegue Mostrar a caixa de colisão do sprite e encaixe depois do desenho do Dino. Escolha dino.
>
> Comece a partida e compare o contorno com o desenho. O contorno só mostra a área; não muda a batida. Se não aparecer, confira se foi desenhado depois do Dino e dentro de jogando.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Mostre o contorno da área de dino depois do desenho.

## Seção 3. Ajuste a área sem mudar o desenho

### Clipe `video-ajustar-area` · Ajuste a área sem mudar o desenho

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

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
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Ajuste somente a área de colisão, mantendo o desenho em tamanho 64.

## Seção 4. Retire o contorno de teste

### Clipe `video-retirar-contorno` · Retire o contorno de teste

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Você já conferiu a área da batida. Retire o contorno de teste e mantenha a regra que define a porcentagem.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o bloco Mostrar a caixa de colisão do sprite, dentro de jogando. Separe a sequência que estiver abaixo dele para preservá-la. Retire só esse bloco e reconecte a sequência abaixo do desenho do Dino.
>
> Confira em Ao iniciar o bloco Usar área de colisão, com dino e a porcentagem escolhida. Comece outra partida. O contorno desaparece, e a batida continua usando a área menor. Se a regra sumir junto, devolva o bloco de ajuste a Ao iniciar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Retire apenas o desenho do contorno e conserve o ajuste da área.

## Seção 5. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu jogo usa uma área ajustada para a batida. Comece, pule e deixe ocorrer uma colisão para conferir o ciclo de fim e reinício.
>
> Confira tamanho 64 no Dino e a porcentagem escolhida entre 70 e 85 no bloco de área. O desenho do contorno deve estar retirado.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
