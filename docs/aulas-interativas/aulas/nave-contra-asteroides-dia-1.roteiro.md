# Roteiro de gravação · Nave Contra Asteroides · Aula 2

**Mova a nave pelo espaço**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada. Saída: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Observe o movimento quadro a quadro

### Clipe `video-seta-e-velocidade` · Observe o movimento quadro a quadro

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a nave na experiência, com o x, as marcas de cada quadro e a borda. Apontar os controles sem realizar os testes pela pessoa.

**Narração:**
> "Sua nave ainda está parada. Antes de programar as setas, observe como a posição x desta nave muda a cada quadro.
>
> Deixe Segurar a seta para a direita desligado e clique em Avançar 1 quadro. Olhe o x. Depois ligue a seta, escolha Velocidade 3 e avance alguns quadros, um de cada vez.
>
> Clique em Recomeçar, escolha Velocidade 1 e avance outros quadros com a seta ligada. Compare quanto o x muda em cada passo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Compare a seta solta e segurada. Depois compare Velocidade 3 e Velocidade 1, avançando um quadro por vez.

## Seção 2. Faça a nave responder às setas

### Clipe `video-setas-e-rastro` · Faça a nave responder às setas

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o destino antes de abrir a paleta. Montar apenas o movimento, testar as setas no fundo liso e mostrar o rastro, ainda sem limpeza. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou a seta solta, a seta segurada e duas velocidades. No seu jogo, segure uma seta: a nave ainda fica parada. Agora aplique essa regra à nave, usando velocidade 7.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Sua nave já aparece. Agora faça ela responder às setas. Deixe à vista Desenhar o sprite dentro de A cada quadro do jogo. Abra Jogo 2D, depois Movimento e Movimentos prontos. Pegue Mover o sprite com as setas para a esquerda e para a direita. Encaixe dentro de A cada quadro do jogo, antes de Desenhar o sprite.
>
> Escolha nave e coloque velocidade 7. Esse valor controla quanto a nave anda em cada quadro enquanto você segura uma seta. Um valor maior faz a nave andar mais depressa. Clique na área do jogo e segure uma seta por um instante, sem chegar à borda.
>
> Confira: o movimento usa nave e velocidade 7 e fica antes de Desenhar o sprite. Se a nave ficar parada, confira esses campos e clique na área do jogo antes de segurar a seta. Ainda pode aparecer um rastro; a nave se move, mas a tela não está sendo limpa.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Coloque o movimento antes do desenho da nave e teste as duas setas.

## Seção 3. Tire o rastro da nave

### Clipe `video-limpeza` · Tire o rastro da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Retomar o rastro no projeto, montar somente Limpar a tela antes do movimento e repetir o mesmo teste. Ainda não há estrelas. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da aula Faça a nave aparecer, na seção Compare o desenho no começo e em cada quadro, você testou a limpeza antes do desenho. No seu jogo, segure uma seta por um instante: as imagens anteriores ficam na tela. Agora deixe à vista o primeiro encaixe de A cada quadro do jogo, antes do movimento. Abra Jogo 2D, depois Desenho e efeitos e Efeitos. Pegue Limpar a tela e encaixe nesse primeiro lugar.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Teste a mesma seta de novo. Agora o jogo apaga a imagem anterior antes de desenhar a nave na posição atual. Limpar apaga o desenho, não a nave que foi criada. Se o rastro continuar, confira a ordem: limpar, mover, desenhar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Encaixe Limpar a tela antes de mover e desenhar. Repita o teste da seta.

## Seção 4. Observe o que acontece na borda

### Clipe `video-limite-da-tela` · Observe o que acontece na borda

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a nave na experiência, com o x, as marcas de cada quadro e a borda. Apontar os controles sem realizar os testes pela pessoa.

**Narração:**
> "A nave pode sair da tela quando continua andando. Compare o movimento com e sem limite nesta experiência antes de montar essa regra.
>
> Deixe Manter dentro da tela desligado, ligue Segurar a seta para a direita e clique em Rodar. Observe a nave chegar à borda e continuar até sair da tela.
>
> Clique em Recomeçar, ligue Manter dentro da tela e mantenha a seta ligada. Clique em Rodar e compare o que acontece na borda. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Rode sem o limite. Depois recomece, ligue Manter dentro da tela e rode de novo.

## Seção 5. Mantenha a nave na tela

### Clipe `video-limite-da-nave` · Mantenha a nave na tela

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a saída da nave antes da correção e repetir os dois testes depois. Conferir o sprite escolhido no bloco de limite. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou o movimento com e sem limite. Agora observe essa diferença no seu jogo e aplique o limite à nave.
>
> A nave anda, mas ainda pode sair da tela. Clique no jogo e segure uma seta até ela passar da borda. Agora vamos colocar um limite.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Deixe à vista o espaço entre o movimento e o desenho da nave. Abra Jogo 2D, depois Movimento e Bordas e rebatidas. Pegue Manter o sprite dentro da tela. Encaixe dentro de A cada quadro do jogo, entre Mover o sprite com as setas e Desenhar o sprite. Escolha nave no menu do bloco.
>
> Clique no jogo. Segure a seta para a esquerda até chegar à borda. Depois segure a seta para a direita até a outra borda. A nave deve parar nos dois lados e continuar visível. Se ainda sair, confira o nome nave e o encaixe: primeiro mover, depois manter dentro da tela, depois desenhar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Teste as duas bordas e coloque o limite entre mover e desenhar.

## Seção 6. Compare a ordem dos desenhos

### Clipe `video-ordem-dos-desenhos` · Compare a ordem dos desenhos

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Apontar os controles citados e o que observar. Deixar os testes para quem faz a experiência, sem antecipar os resultados.

**Narração:**
> "Seu jogo já limpa e desenha a nave. Antes de colocar as estrelas, compare o que acontece quando dois desenhos ocupam a mesma parte da tela.
>
> Na experiência, use as setas na lista de desenhos para colocar o fundo de estrelas antes da nave. Observe a tela. Troque a ordem para desenhar a nave antes do fundo. Observe novamente e volte à primeira ordem. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Troque a ordem do fundo e da nave, observe a tela e volte à primeira ordem.

## Seção 7. Coloque as estrelas atrás da nave

### Clipe `video-fundo-estrelado` · Coloque as estrelas atrás da nave

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a cobertura real do canvas pelo starfield e mover o mesmo bloco, sem duplicar. Não dizer que ausência de rastro com estrelas comprova a presença de Limpar. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou o fundo antes e depois da nave. No seu jogo o fundo ainda é liso. Agora coloque as estrelas atrás da nave.
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
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Adicione as estrelas e confira a ordem dos cinco blocos.

## Seção 8. Confira o que você construiu

**Zappy na página (não gravar):** Responda pensando nos testes do seu jogo. Depois de enviar, leia as explicações. Se precisar, corrija e tente de novo. Quando acertar todas, clique em Próxima seção.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 9. Teste e envie sua nave

### Clipe `video-teste-e-envio` · Teste e envie sua nave

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Conferir a sequência e os testes, depois demonstrar a verificação e a confirmação de envio. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Antes de enviar, clique na área do jogo e leve a nave até cada borda. Ela deve continuar visível, na frente das estrelas.
>
> Confira também os blocos. A sequência dentro de A cada quadro do jogo começa em Limpar a tela e termina em Desenhar o sprite nave. Se um teste falhar, reveja essa sequência e confira se os três blocos da nave usam o nome nave.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Confira o movimento nas duas bordas, verifique a etapa e envie o projeto.
