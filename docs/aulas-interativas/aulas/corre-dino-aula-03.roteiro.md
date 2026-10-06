# Roteiro de gravação · Corre, Dino! · Aula 3

**Faça o Dino cair e pular**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Dino parado diante da floresta. Saída: Gravidade e controles de pulo, com impulso de referência 14.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare o salto com e sem gravidade

### Clipe `video-gravidade-modelo` · Compare o salto com e sem gravidade

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com a gravidade desligada e o Dino no chão. Tocar no Dino e deixar a altura crescer até o tempo parar, com o Dino no alto. Ligar o fio da Gravidade ao Dino com ele no ar e acompanhar a subida mais lenta, a parada e a queda até o chão, com a altura à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy jogando uma bola para cima e a bola voltando para a mão dele. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima seção.

**Narração:**
> "Esta é uma experiência para a gente entender a gravidade, a força que traz o Dino de volta ao chão.
>
> Olha aqui: com a gravidade desligada, eu toco no Dino. Ele pula e sobe sem parar: o número da altura só cresce. Nada puxa o Dino para baixo. A experiência para o tempo com ele lá no alto.
>
> Com o Dino no ar, eu ligo a Gravidade ao Dino. Ele ainda sobe um pouquinho, cada vez mais devagar, para e cai até o chão. A gravidade puxa o Dino para baixo um pouco em cada quadro.
>
> É como jogar uma bola para cima: ela sobe, perde força e volta para a sua mão. No seu jogo, você vai encaixar Aplicar a gravidade do mundo ao sprite dentro de A cada quadro do jogo, para puxar o Dino em todos os quadros.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Pule sem gravidade e ligue a gravidade enquanto o Dino está no ar.

## Seção 2. Faça o Dino cair até o chão

### Clipe `video-aplicar-gravidade` · Faça o Dino cair até o chão

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou o movimento no ar com e sem gravidade. Seu Dino está parado na posição em que foi criado. Agora faça a gravidade agir nele.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o espaço entre a floresta e o desenho do Dino, dentro de A cada quadro do jogo. Abra Jogo 2D, depois Movimento e Velocidade e gravidade. Pegue Aplicar a gravidade do mundo ao sprite e encaixe nesse lugar. Escolha dino.
>
> Observe o Dino descer até o chão. Se continuar suspenso, confira o nome e se a gravidade está dentro do quadro, antes do desenho. O controle de pulo ainda não está montado.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Aplique a gravidade depois da floresta e antes do desenho.

## Seção 3. Compare duas alturas de pulo

### Clipe `video-impulso-modelo` · Compare duas alturas de pulo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com Impulso do salto em 9. Tocar no Dino e esperar o pouso, com a marca 68 à vista. Escolher Impulso 14, tocar no Dino de novo e esperar o pouso, com as duas marcas à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino numa cama elástica, com uma marca baixa escrita 9 e uma marca alta escrita 14. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima seção.

**Narração:**
> "Esta é uma experiência para a gente entender o impulso, a força que começa o pulo.
>
> Olha aqui: com o impulso em 9, eu toco no Dino. Ele sobe, volta ao chão e deixa uma marca na altura 68.
>
> Agora eu mudo o impulso para 14 e toco no Dino de novo. A marca nova fica na altura 163, bem acima da primeira. A gravidade foi a mesma nos dois saltos. O que mudou foi a força do começo do pulo.
>
> É como pular numa cama elástica: com mais força, você vai mais alto, e mesmo assim volta para baixo. No seu jogo, você vai colocar força do pulo 14 no bloco Controlar o dinossauro.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Faça um salto com 9 e outro com 14, esperando a queda entre eles.

## Seção 4. Dê os controles de pulo ao Dino

### Clipe `video-comando-de-pulo` · Dê os controles de pulo ao Dino

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você mudou o impulso e comparou os saltos. Clique no seu jogo e toque na barra de espaço: ainda não há um controle ligado ao Dino. Agora monte essa resposta.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o espaço entre Aplicar a gravidade do mundo ao sprite e Desenhar o sprite. Abra Jogo 2D, depois Kits prontos e Dino. Pegue Controlar o dinossauro e encaixe nesse espaço. Escolha dino e coloque força do pulo 14.
>
> Clique na área do jogo, toque e solte a barra de espaço e espere o Dino pousar. Faça outro salto com a seta para cima. Depois teste tocando na tela. O bloco já oferece os três controles.
>
> Toque duas vezes na barra de espaço durante o mesmo salto. O segundo comando não deve iniciar um salto no ar. Confira a ordem: floresta, gravidade, controle e desenho. Se o Dino não pular, confira o nome e a gravidade antes do controle.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Teste espaço, seta para cima e toque, com gravidade antes do controle.

## Seção 5. Confira o que você construiu

**Zappy na página (não gravar):** Retome a tela e os movimentos do Dino nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 6. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu Dino já pula e volta ao chão. Teste espaço, seta para cima e toque. Espere pousar entre os saltos.
>
> Confira gravidade antes do controle e os dois antes do desenho. Deixe a força de referência em 14; as cores que você escolheu podem continuar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
