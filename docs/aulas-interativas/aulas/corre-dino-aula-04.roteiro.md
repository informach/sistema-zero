# Roteiro de gravação · Corre, Dino! · Aula 4

**Toque um som em cada pulo**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Dino com gravidade e três controles de pulo. Saída: Um efeito de pulo ligado ao evento do Dino, sem evento provisório de tecla.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare esperar e repetir

### Clipe `video-area-que-espera` · Compare esperar e repetir

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com as peças em Ações disponíveis. Colocar Tocar efeito · pulo em Quando acontecer, clicar em Começar o jogo e esperar Teste encerrado, com o contador da peça em 0 vezes. Clicar em Apertar a tecla e mostrar a nota ♪ no palco e o contador em 1 vez. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy apertando a campainha de uma casa, com uma nota musical saindo dela. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima seção.

**Narração:**
> "Esta é a mesma experiência da primeira aula, agora para a gente entender uma área que espera um acontecimento para agir. Ela ganhou uma área nova, Quando acontecer.
>
> Olha aqui: eu coloco Tocar efeito · pulo em Quando acontecer e clico em Começar o jogo. O jogo roda até o teste terminar, e o contador continua em 0 vezes. A peça ficou esperando, porque eu não cliquei em Apertar a tecla.
>
> Agora eu clico em Apertar a tecla. Na mesma hora, aparece a notinha ♪ no jogo, e o contador vai para 1 vez. Quando acontecer não age no começo nem repete sozinho: age quando o acontecimento chega.
>
> É como a campainha de casa: ela fica quieta o dia inteiro e só toca quando alguém aperta o botão. No seu jogo, o som vai em Quando acontecer, esperando o pulo do Dino.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Comece o teste sem tocar na tecla e depois acione a tecla uma vez.

## Seção 2. Compare a tecla com o pulo

### Clipe `video-dedo-e-pulo` · Compare a tecla com o pulo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com Tocar efeito em Quando apertar Espaço e os contadores de pulos e sons em 0. Fazer os gestos no ritmo da fala, esperando o pouso entre os testes, e manter os contadores à vista depois de cada clique. Levar Tocar efeito para Quando o Dino pular e repetir os testes. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima seção.

**Narração:**
> "Esta é uma experiência para a gente entender em que momento o som deve tocar: na tecla ou no pulo.
>
> Olha aqui: com Tocar efeito em Quando apertar Espaço, eu clico em Apertar Espaço. O Dino pula, e o som toca. Com ele ainda no ar, eu clico de novo: o som toca outra vez, mas o Dino não pula de novo. Agora são 2 sons para 1 pulo.
>
> Depois que ele pousa, eu clico em Tocar para pular. O Dino pula, e nenhum som toca, porque esse pulo não veio da tecla Espaço.
>
> Agora eu levo Tocar efeito para Quando o Dino pular e faço os mesmos testes. Duas vezes Apertar Espaço no mesmo salto: um pulo e um som só. Tocar para pular: o pulo vem com som. Cada pulo tem o seu som, venha da tecla ou do toque, porque agora o som está ligado ao pulo. No seu jogo, você vai pôr Tocar efeito dentro de Quando o sprite pular.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Teste tecla repetida e toque nos dois lugares do som.

## Seção 3. Ligue o som ao pulo do Dino

### Clipe `video-som-no-pulo` · Ligue o som ao pulo do Dino

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou ouvir a tecla com ouvir o pulo. Teste um salto no seu jogo: o Dino já pula, mas ainda sem som. Agora ligue um efeito ao salto.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe um espaço vazio da montagem à vista, separado de Ao iniciar e Enquanto estiver rodando. Abra Áreas do projeto. Pegue Quando acontecer e solte nesse espaço.
>
> Deixe à vista o interior de Quando acontecer. Abra Jogo 2D, depois Controles e Teclado, ações e toque. Pegue Quando o sprite pular e encaixe nessa área. Escolha dino.
>
> Deixe à vista o interior do evento de pulo. Abra Jogo 2D, depois Som e Efeitos prontos. Pegue Tocar efeito e encaixe dentro do evento. No efeito, escolha pulo.
>
> Clique no jogo e pule com espaço. Depois de pousar, teste seta para cima e toque. Deve haver um som por salto. Toque espaço duas vezes no ar e compare: a segunda tecla não cria outro salto nem outro som.
>
> Confira: só existe um Tocar efeito e ele está dentro do evento do Dino. Se o som se repetir parado, confira se ficou em Quando acontecer, não dentro do quadro. Se estiver mudo, clique primeiro no jogo e confira o efeito escolhido.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Coloque um único Tocar efeito pulo dentro de Quando o sprite pular.

## Seção 4. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu Dino pula com som. Teste um salto por espaço, outro por seta para cima e outro por toque, esperando pousar entre eles.
>
> Confira se duas teclas no mesmo salto não produzem dois sons. A gravidade e o desenho continuam como antes.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
