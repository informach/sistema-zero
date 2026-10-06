# Roteiro de gravação · Nave Contra Asteroides · Aula 2

**Mova a nave pelo espaço**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada. Saída: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" é o encaixe do bloco Se e não aparece como palavra de ligação. A ponte do Zappy começa convidando ("Sua vez!", "Agora…!", "Hora de…!") e termina na ação de saída. Cada montagem que aplica uma experiência começa por uma retomada curta, nesta ordem: o teste no próprio jogo ("Tá vendo?", com o porquê), a lembrança da experiência numa frase e o anúncio, uma vez só, colado ao primeiro passo. Depois de montar, a criança testa direto; a lista dos blocos entra uma vez só, depois do teste ("Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …").

## Seção 1. Observe o movimento quadro a quadro

### Clipe `video-seta-e-velocidade` · Observe o movimento quadro a quadro

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a nave na experiência, com o x, as marcas de cada quadro e a borda. Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Com Segurar a seta para a direita desligado, clicar em Avançar 1 quadro e mostrar o x parado em 208. Ligar a seta, deixar Velocidade 3 e avançar quadro a quadro até 217, apontando o +3. Clicar em Recomeçar, escolher Velocidade 1 e avançar até 210, apontando o +1. Meme na comparação: na frase do tamanho do passo, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy dando um passo de gigante e depois um passinho de formiga, com a legenda "Velocidade 3 · Velocidade 1"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender a velocidade: quanto a nave anda em cada quadro. A regra aqui é a mesma que você vai montar: a cada quadro do jogo, mover a nave com as setas.
>
> Olha aqui: com Segurar a seta para a direita desligado, eu clico em Avançar 1 quadro. Tá vendo? O x continua 208, e a nave fica parada, porque, em cada quadro, o jogo confere a seta, e a seta está solta.
>
> Agora eu ligo a seta, deixo Velocidade 3 e avanço um quadro de cada vez. Repare no x: ele vai para 211, depois 214, depois 217, ou seja, cada quadro soma 3. É como o tamanho do passo quando você anda: passo grande leva mais longe. A velocidade é o tamanho do passo da nave em cada quadro.
>
> Depois, eu clico em Recomeçar, escolho Velocidade 1 e avanço de novo. Agora o x vai de 208 para 209, depois 210. O passo ficou menor, por isso a nave anda mais devagar. No seu jogo, você vai usar velocidade 7, um passo maior.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Sua vez! Compare a seta solta e a seta segurada e depois as velocidades 3 e 1, avançando um quadro por vez. Quando terminar, clique em Próxima parte.

## Seção 2. Faça a nave responder às setas

### Clipe `video-setas-e-rastro` · Faça a nave responder às setas

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Começar pela retomada, antes de qualquer bloco: clicar na área do jogo, segurar uma seta e, no "Tá vendo?", manter a nave parada à vista. Mostrar o destino antes de abrir a paleta. Montar apenas o movimento, testar as setas no fundo liso e mostrar o rastro, ainda sem limpeza. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Clique no seu jogo e segure uma seta. Tá vendo? A nave fica parada, porque ainda não tem a regra das setas.
>
> Lembra da experiência da parte anterior? A nave só andava com a seta segurada, e a velocidade decidia o passo. Agora a gente vai pôr essa regra no seu jogo!
>
> A nave precisa andar em todo quadro, e antes de ser desenhada, para o desenho já mostrar o lugar novo. Por isso, o movimento vai no começo de A cada quadro do jogo, logo acima de Desenhar o sprite: deixe esse lugar à vista.
>
> Agora abra Jogo 2D, depois Movimento e depois Movimentos prontos, e pegue o bloco Mover o sprite com as setas, que tem as setas para a esquerda e para a direita. Arraste e solte no começo de A cada quadro do jogo, logo acima de Desenhar o sprite, quando aparecer o encaixe.
>
> Repare: o nome do sprite já vem nave, por isso mantenha. Depois, troque a velocidade para 7, um passo maior do que os da experiência.
>
> Agora teste: clique na área do jogo e segure uma seta por um instante, sem chegar à borda. Olha só: a nave anda! Mas vai aparecer um rastro, com várias naves, porque o jogo desenha a nave no lugar novo e ainda não apaga a imagem de antes. Isso a gente resolve na próxima parte.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, primeiro vem Mover o sprite nave com as setas, com velocidade 7, e logo abaixo vem Desenhar o sprite nave. E clique na área do jogo antes de segurar a seta, porque é assim que o jogo recebe as teclas. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora faça a sua nave andar! Coloque o movimento com velocidade 7 antes do desenho da nave, teste as duas setas e clique em Verificar esta parte. Depois, clique em Próxima parte.

## Seção 3. Tire o rastro da nave

### Clipe `video-limpeza` · Tire o rastro da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Começar pela retomada, antes de qualquer bloco: segurar uma seta e, no "Tá vendo?", manter o rastro à vista. Montar somente Limpar a tela antes do movimento, com o primeiro encaixe à vista antes de abrir a paleta, e repetir o mesmo teste. Ainda não há estrelas. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Clique no seu jogo e segure uma seta. Tá vendo? Fica um rastro de naves, porque nada apaga o desenho de antes.
>
> Lembra da experiência do desenho a cada quadro, na primeira fase? Com a limpeza ligada, sobrava uma nave só. Agora a gente vai limpar a tela do seu jogo!
>
> A limpeza tem que acontecer no começo de cada quadro, antes de tudo. Por isso, deixe à vista o primeiro encaixe de A cada quadro do jogo, logo acima do bloco de movimento.
>
> Agora abra Jogo 2D, depois Desenho e efeitos e depois Efeitos, e pegue o bloco Limpar a tela. Arraste e solte no começo de A cada quadro do jogo, logo acima do movimento, quando aparecer o encaixe.
>
> Teste a mesma seta de novo. Olha só: agora aparece uma nave só, porque a tela é limpa antes de cada desenho! E Limpar apaga só o desenho, e não a nave que foi criada.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo estão Limpar a tela, Mover o sprite nave com as setas e Desenhar o sprite nave, nessa ordem. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar esta parte. Depois, clique em Próxima parte.

## Seção 4. Observe o que acontece na borda

### Clipe `video-limite-da-tela` · Observe o que acontece na borda

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a nave na experiência, com o x, as marcas de cada quadro e a borda. Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Com Manter dentro da tela desligado, ligar Segurar a seta para a direita, clicar em Rodar e acompanhar a nave até sair inteira da tela. Clicar em Recomeçar, ligar Manter dentro da tela, clicar em Rodar e mostrar a nave parada inteira na borda, com x 416. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é a mesma experiência da primeira parte desta fase, agora para a gente entender o limite da tela.
>
> Olha aqui: com Manter dentro da tela desligado, eu ligo Segurar a seta para a direita e clico em Rodar. Tá vendo? A nave anda, chega à borda e continua até sair inteira da tela, porque, sem limite, o jogo soma o passo em cada quadro, mesmo depois da borda.
>
> Agora eu clico em Recomeçar, ligo Manter dentro da tela e clico em Rodar de novo. Olha só: a nave anda até a borda e para ali, inteira na tela, com o x em 416. É que, em cada quadro, depois de mover, o jogo confere a borda e segura a nave do lado de dentro. No seu jogo, Manter o sprite dentro da tela vai ficar logo depois do movimento.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Sua vez! Rode sem o limite, depois recomece, ligue Manter dentro da tela e rode de novo. Quando terminar, clique em Próxima parte.

## Seção 5. Mantenha a nave na tela

### Clipe `video-limite-da-nave` · Mantenha a nave na tela

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Começar pela retomada, antes de qualquer bloco: segurar uma seta até a nave passar da borda e, no "Tá vendo?", manter a saída à vista. Depois deixar à vista o espaço entre o movimento e o desenho, montar o limite e repetir os dois testes. Conferir o sprite escolhido no bloco de limite. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Clique no seu jogo e segure uma seta até a borda. Tá vendo? A nave sai da tela, porque ainda não tem limite.
>
> Lembra da experiência da parte anterior? Com Manter dentro da tela ligado, a nave parava inteira na borda. Agora a gente vai pôr esse limite no seu jogo!
>
> O limite é conferido em todo quadro, logo depois que a nave anda e antes de ela ser desenhada. Por isso, ele vai entre o movimento e o desenho: deixe à vista o espaço entre Mover o sprite com as setas e Desenhar o sprite, dentro de A cada quadro do jogo.
>
> Agora abra Jogo 2D, depois Movimento e depois Bordas e rebatidas, e pegue o bloco Manter o sprite dentro da tela. Arraste e solte entre Mover o sprite com as setas e Desenhar o sprite, quando aparecer o encaixe.
>
> Repare: o bloco chega com o nome heroi, que não é o da sua nave. Por isso, clique em heroi e escolha nave.
>
> Agora teste: clique na área do jogo, segure a seta para a esquerda até chegar à borda e depois segure a seta para a direita até a outra borda. Olha só: a nave para nos dois lados e continua inteira na tela!
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo estão Limpar a tela, Mover o sprite nave com as setas, Manter o sprite nave dentro da tela e Desenhar o sprite nave, nessa ordem. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas bordas e clique em Verificar esta parte. Depois, clique em Próxima parte.

## Seção 6. Compare a ordem dos desenhos

### Clipe `video-ordem-dos-desenhos` · Compare a ordem dos desenhos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Apontar a lista A ordem de desenhar, com a nave em 1º a desenhar, e o pedacinho da nave que aparece. Clicar em Subir no fundo de estrelas e mostrar a nave inteira na frente. Trocar a ordem de novo, mostrar a nave escondida e voltar o fundo para antes da nave. Meme na comparação: na frase de pintar no papel, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy pintando um céu estrelado por cima do desenho de uma nave, com a legenda "quem vem por último fica por cima"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender por que a ordem dos desenhos muda o que aparece na tela.
>
> Olha aqui: na lista A ordem de desenhar, a nave está em 1º a desenhar, e o fundo de estrelas, em 2º. Tá vendo? Só aparece um pedacinho da nave, porque o fundo foi desenhado por cima dela. É como pintar no papel: se você desenha a nave e depois pinta o céu por cima, o céu cobre a nave.
>
> Agora eu clico em Subir, no fundo de estrelas. Olha só: o fundo passa a ser desenhado primeiro, e a nave aparece inteira, na frente das estrelas. É que quem é desenhado por último fica por cima.
>
> Eu troco a ordem de novo, e a nave volta para trás das estrelas, sem nada apagado: só a ordem mudou. Por último, deixo o fundo antes da nave outra vez, e a nave aparece. No seu jogo, o desenho das estrelas vai ficar antes do desenho da nave.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Sua vez! Troque a ordem do fundo e da nave, compare a tela e termine com o fundo antes da nave. Quando terminar, clique em Próxima parte.

## Seção 7. Coloque as estrelas atrás da nave

### Clipe `video-fundo-estrelado` · Coloque as estrelas atrás da nave

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Começar pela retomada, antes de qualquer bloco: no "Tá vendo?", mostrar o fundo liso. Mostrar a cobertura real do canvas pelo starfield e mover o mesmo bloco, sem duplicar. Não dizer que ausência de rastro com estrelas comprova a presença de Limpar. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Olhe o fundo do seu jogo. Tá vendo? Ele é liso, porque o jogo ainda não desenha nenhuma estrela.
>
> Lembra da experiência da parte anterior? O fundo desenhado antes da nave ficava atrás dela, e a nave aparecia inteira. Agora a gente vai pôr um céu de estrelas no seu jogo!
>
> Para começar, deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o sprite nave.
>
> Agora abra Jogo 2D, depois Cenários e depois Fundos, e pegue o bloco Desenhar fundo de estrelas. Arraste e solte no fim de A cada quadro do jogo, logo depois de Desenhar o sprite, quando aparecer o encaixe. A velocidade já vem em 1: mantenha.
>
> Olha só: as estrelas cobriram a nave! Isso acontece porque elas foram desenhadas depois da nave, igualzinho ao que você viu na experiência. Mas o bloco da nave continua no projeto, e é só mudar a ordem.
>
> Solte qualquer peça que estiver segurando e deixe Limpar a tela à vista. Depois, arraste o bloco das estrelas e solte logo abaixo de Limpar a tela, antes do movimento. Agora a nave aparece de novo, na frente das estrelas, porque as estrelas passaram a ser desenhadas antes dela.
>
> Repare que a limpeza continua no começo, mesmo com as estrelas: ela apaga o quadro anterior para o jogo desenhar o quadro novo.
>
> Teste as setas mais uma vez. A nave precisa andar na frente das estrelas e parar nas duas bordas.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo estão Limpar a tela, Desenhar fundo de estrelas, Mover o sprite nave com as setas, Manter o sprite nave dentro da tela e Desenhar o sprite nave, nessa ordem. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar esta parte. Depois, clique em Próxima parte.

## Seção 8. Confira o que você construiu

**Zappy na página (não gravar):** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 9. Teste e envie sua nave

### Clipe `video-teste-e-envio` · Teste e envie sua nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Conferir a sequência e os testes, depois demonstrar a verificação e a confirmação de envio. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Agora teste a sua nave antes de enviar. Clique na área do jogo e leve a nave até cada borda: ela tem que parar inteira na tela e continuar na frente das estrelas, porque o limite e a ordem dos desenhos estão funcionando juntos.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, a sequência começa em Limpar a tela e termina em Desenhar o sprite nave, e os três blocos da nave usam o nome nave. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Hora de testar a sua nave! Leve a nave até as duas bordas, confira a ordem dos blocos, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.
