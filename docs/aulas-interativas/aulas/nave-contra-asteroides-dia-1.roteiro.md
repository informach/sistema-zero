# Roteiro de gravação · Nave Contra Asteroides · Aula 2

**Mova a nave pelo espaço**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada. Saída: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Observe o movimento quadro a quadro

### Clipe `video-seta-e-velocidade` · Observe o movimento quadro a quadro

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a nave na experiência, com o x, as marcas de cada quadro e a borda. Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Com Segurar a seta para a direita desligado, clicar em Avançar 1 quadro e mostrar o x parado em 208. Ligar a seta, deixar Velocidade 3 e avançar quadro a quadro até 217, apontando o +3. Clicar em Recomeçar, escolher Velocidade 1 e avançar até 210, apontando o +1. Meme na comparação: na frase do tamanho do passo, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy dando um passo de gigante e depois um passinho de formiga, com a legenda "Velocidade 3 · Velocidade 1"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender a velocidade: quanto a nave anda em cada quadro. A regra aqui é a mesma que você vai montar: a cada quadro do jogo, mover a nave com as setas.
>
> Olha aqui: com Segurar a seta para a direita desligado, eu clico em Avançar 1 quadro. O x continua 208, e a nave fica parada. Em cada quadro, o jogo confere a seta, e a seta está solta.
>
> Agora eu ligo a seta, deixo Velocidade 3 e avanço um quadro de cada vez. O x vai para 211, depois 214, depois 217. Cada quadro soma 3. É como o tamanho do passo quando você anda: passo grande leva mais longe. A velocidade é o tamanho do passo da nave em cada quadro.
>
> Eu clico em Recomeçar, escolho Velocidade 1 e avanço de novo. Agora o x vai de 208 para 209, depois 210. O passo ficou menor, e a nave anda mais devagar. No seu jogo, você vai usar velocidade 7, um passo maior.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Compare a seta solta e segurada. Depois compare Velocidade 3 e Velocidade 1, avançando um quadro por vez.

## Seção 2. Faça a nave responder às setas

### Clipe `video-setas-e-rastro` · Faça a nave responder às setas

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o destino antes de abrir a paleta. Montar apenas o movimento, testar as setas no fundo liso e mostrar o rastro, ainda sem limpeza. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou a seta solta, a seta segurada e duas velocidades. No seu jogo, segure uma seta: a nave ainda fica parada. Agora aplique essa regra à nave, usando velocidade 7.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Sua nave já aparece. Agora faça ela responder às setas. Deixe à vista Desenhar o sprite dentro de A cada quadro do jogo. Abra Jogo 2D, depois Movimento e Movimentos prontos. Pegue Mover o sprite com as setas para a esquerda e para a direita. Encaixe dentro de A cada quadro do jogo, antes de Desenhar o sprite.
>
> Escolha nave e coloque velocidade 7. Esse valor controla quanto a nave anda em cada quadro enquanto você segura uma seta. Um valor maior faz a nave andar mais depressa. Clique na área do jogo e segure uma seta por um instante, sem chegar à borda.
>
> Confira: o movimento usa nave e velocidade 7 e fica antes de Desenhar o sprite. Se a nave ficar parada, confira esses campos e clique na área do jogo antes de segurar a seta. Ainda pode aparecer um rastro; a nave se move, mas a tela não está sendo limpa.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Coloque o movimento antes do desenho da nave e teste as duas setas.

## Seção 3. Tire o rastro da nave

### Clipe `video-limpeza` · Tire o rastro da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Retomar o rastro no projeto, montar somente Limpar a tela antes do movimento e repetir o mesmo teste. Ainda não há estrelas. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Lembra da experiência da fase Faça a nave aparecer, na parte Compare o desenho no começo e em cada quadro? Você testou a limpeza antes do desenho. No seu jogo, segure uma seta por um instante: as imagens anteriores ficam na tela. Agora deixe à vista o primeiro encaixe de A cada quadro do jogo, antes do movimento. Abra Jogo 2D, depois Desenho e efeitos e Efeitos. Pegue Limpar a tela e encaixe nesse primeiro lugar.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Teste a mesma seta de novo. Agora o jogo apaga a imagem anterior antes de desenhar a nave na posição atual. Limpar apaga o desenho, não a nave que foi criada. Se o rastro continuar, confira a ordem: limpar, mover, desenhar.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Encaixe Limpar a tela antes de mover e desenhar. Repita o teste da seta.

## Seção 4. Observe o que acontece na borda

### Clipe `video-limite-da-tela` · Observe o que acontece na borda

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a nave na experiência, com o x, as marcas de cada quadro e a borda. Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Com Manter dentro da tela desligado, ligar Segurar a seta para a direita, clicar em Rodar e acompanhar a nave até sair inteira da tela. Clicar em Recomeçar, ligar Manter dentro da tela, clicar em Rodar e mostrar a nave parada inteira na borda, com x 416. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é a mesma experiência da primeira parte desta fase, agora para a gente entender o limite da tela.
>
> Olha aqui: com Manter dentro da tela desligado, eu ligo Segurar a seta para a direita e clico em Rodar. A nave anda, chega à borda e continua até sair inteira da tela. Sem limite, o jogo soma o passo em cada quadro, mesmo depois da borda.
>
> Agora eu clico em Recomeçar, ligo Manter dentro da tela e clico em Rodar de novo. A nave anda até a borda e para ali, inteira na tela. O x para em 416. Em cada quadro, depois de mover, o jogo confere a borda e segura a nave do lado de dentro. No seu jogo, Manter o sprite dentro da tela vai ficar logo depois do movimento.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Rode sem o limite. Depois recomece, ligue Manter dentro da tela e rode de novo.

## Seção 5. Mantenha a nave na tela

### Clipe `video-limite-da-nave` · Mantenha a nave na tela

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a saída da nave antes da correção e repetir os dois testes depois. Conferir o sprite escolhido no bloco de limite. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou o movimento com e sem limite. Agora observe essa diferença no seu jogo e aplique o limite à nave.
>
> A nave anda, mas ainda pode sair da tela. Clique no jogo e segure uma seta até ela passar da borda. Agora vamos colocar um limite.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Deixe à vista o espaço entre o movimento e o desenho da nave. Abra Jogo 2D, depois Movimento e Bordas e rebatidas. Pegue Manter o sprite dentro da tela. Encaixe dentro de A cada quadro do jogo, entre Mover o sprite com as setas e Desenhar o sprite. Escolha nave no menu do bloco.
>
> Clique no jogo. Segure a seta para a esquerda até chegar à borda. Depois segure a seta para a direita até a outra borda. A nave deve parar nos dois lados e continuar visível. Se ainda sair, confira o nome nave e o encaixe: primeiro mover, depois manter dentro da tela, depois desenhar.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Teste as duas bordas e coloque o limite entre mover e desenhar.

## Seção 6. Compare a ordem dos desenhos

### Clipe `video-ordem-dos-desenhos` · Compare a ordem dos desenhos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Apontar a lista A ordem de desenhar, com a nave em 1º a desenhar, e o pedacinho da nave que aparece. Clicar em Subir no fundo de estrelas e mostrar a nave inteira na frente. Trocar a ordem de novo, mostrar a nave escondida e voltar o fundo para antes da nave. Meme na comparação: na frase de pintar no papel, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy pintando um céu estrelado por cima do desenho de uma nave, com a legenda "quem vem por último fica por cima"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender por que a ordem dos desenhos muda o que aparece na tela.
>
> Olha aqui: na lista A ordem de desenhar, a nave está em 1º a desenhar, e o fundo de estrelas, em 2º. Por isso, só aparece um pedacinho da nave: o fundo foi desenhado por cima dela. É como pintar no papel. Se você desenha a nave e depois pinta o céu por cima, o céu cobre a nave.
>
> Agora eu clico em Subir, no fundo de estrelas. O fundo passa a ser desenhado primeiro, e a nave aparece inteira, na frente das estrelas. Quem é desenhado por último fica por cima.
>
> Eu troco a ordem de novo, e a nave volta para trás das estrelas. Nada foi apagado; só a ordem mudou. Por último, deixo o fundo antes da nave outra vez, e a nave aparece. No seu jogo, o desenho das estrelas vai ficar antes do desenho da nave.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Troque a ordem do fundo e da nave, observe a tela e volte à primeira ordem.

## Seção 7. Coloque as estrelas atrás da nave

### Clipe `video-fundo-estrelado` · Coloque as estrelas atrás da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a cobertura real do canvas pelo starfield e mover o mesmo bloco, sem duplicar. Não dizer que ausência de rastro com estrelas comprova a presença de Limpar. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou o fundo antes e depois da nave. No seu jogo o fundo ainda é liso. Agora coloque as estrelas atrás da nave.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Agora coloque estrelas no fundo do jogo. Deixe à vista o fim de A cada quadro do jogo, depois do desenho da nave. Abra Jogo 2D, depois Cenários e Fundos. Pegue Desenhar fundo de estrelas e encaixe no fim de A cada quadro do jogo, depois de Desenhar o sprite. Mantenha velocidade 1.
>
> Observe a tela. As estrelas cobriram a nave porque foram desenhadas depois dela. O bloco da nave continua no projeto. Solte qualquer peça que estiver segurando. Deixe Limpar a tela à vista. Arraste o bloco das estrelas para logo abaixo de Limpar a tela, antes do movimento. A nave aparece de novo.
>
> Confira a ordem inteira: limpar a tela, desenhar estrelas, mover a nave, manter a nave dentro da tela e desenhar a nave. As estrelas ficam no fundo porque são desenhadas antes. Mantenha a limpeza mesmo com as estrelas: ela prepara a tela para o novo quadro.
>
> Teste as setas mais uma vez. A nave precisa andar na frente das estrelas e parar nas duas bordas.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Adicione as estrelas e confira a ordem dos cinco blocos.

## Seção 8. Confira o que você construiu

**Zappy na página (não gravar):** Responda pensando nos testes do seu jogo. Depois de enviar, leia as explicações. Se precisar, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 9. Teste e envie sua nave

### Clipe `video-teste-e-envio` · Teste e envie sua nave

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Conferir a sequência e os testes, depois demonstrar a verificação e a confirmação de envio. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Antes de enviar, clique na área do jogo e leve a nave até cada borda. Ela deve continuar visível, na frente das estrelas.
>
> Confira também os blocos. A sequência dentro de A cada quadro do jogo começa em Limpar a tela e termina em Desenhar o sprite nave. Se um teste falhar, reveja essa sequência e confira se os três blocos da nave usam o nome nave.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Confira o movimento nas duas bordas, verifique esta parte e envie o projeto.
