# Roteiro de gravação · Nave Contra Asteroides · Aula 3

**Faça a nave atirar**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original. Saída: Tiros saem da nave, sobem, têm som e são retirados do grupo ao sair da tela.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare esperar a tecla e repetir tiros

### Clipe `video-tecla-e-repeticao` · Compare esperar a tecla e repetir tiros

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Apontar os controles citados e o que observar. Deixar os testes para quem faz a experiência, sem antecipar os resultados.

**Narração:**
> "Sua nave já anda. Para atirar, uma ação precisa esperar a tecla. Compare essa espera com uma ação que se repete sozinha.
>
> Coloque Criar um tiro em Quando acontecer. Clique em Começar o jogo e espere o teste parar, sem clicar em Apertar a tecla. Observe o contador de tiros. Depois clique em Apertar a tecla e observe de novo.
>
> Leve Criar um tiro para Enquanto estiver rodando. Clique em Começar o jogo e espere o teste parar. Compare com o primeiro teste. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Compare Criar um tiro em Quando acontecer e Enquanto estiver rodando. No primeiro teste, espere e depois clique em Apertar a tecla.

## Seção 2. Faça o tiro acompanhar a nave

### Clipe `video-escrito-e-lido` · Faça o tiro acompanhar a nave

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Apontar os controles reais. A nave se move pelo controle x da nave, não por arrastar o desenho. Não executar os disparos no vídeo.

**Narração:**
> "O tiro precisa nascer na nave, mesmo quando ela muda de lugar. Vamos comparar um número fixo com a posição lida na hora do disparo.
>
> Nesta experiência, deixe De onde vem o x do tiro em O número 400. Clique em Atirar. Mude x da nave para longe da primeira posição e clique em Atirar de novo. Compare as marcas onde os dois tiros nasceram.
>
> Troque para O centro x da nave. Atire, mude x da nave e atire outra vez. Compare as novas marcas. Depois ligue Marcas da caixa e clique em Atirar mais uma vez, mantendo O centro x da nave. Compare a linha do centro com o lugar de onde saiu esse tiro.
>
> Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Atire de dois lugares com cada opção de x. Depois ligue Marcas da caixa e atire de novo com O centro x da nave.

## Seção 3. Compare a direção do tiro

### Clipe `video-direcao-do-tiro` · Compare a direção do tiro

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Apontar os controles citados e o que observar. Deixar os testes para quem faz a experiência, sem antecipar os resultados.

**Narração:**
> "Na seção Faça o tiro acompanhar a nave, você comparou onde o tiro nasce. Agora teste para onde ele se move depois de nascer.
>
> Na experiência, mantenha velocidade para o lado em 0. Coloque velocidade para baixo em -9 e clique em Avançar 1 quadro algumas vezes. Observe o tiro e o y.
>
> Troque velocidade para baixo para 9 e avance outros quadros. Compare a direção e o y nos dois testes. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Compare -9 e 9 na velocidade para baixo. Avance os quadros e observe o y em cada teste.

## Seção 4. Monte o disparo da barra de espaço

### Clipe `video-criar-tiro` · Monte o disparo da barra de espaço

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Abrir cada caminho. Trocar os números de x e y por blocos de leitura, com nave selecionada. Não testar visibilidade antes do desenho. Confirmar o grupo e as duas velocidades. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Nas experiências desta aula, você comparou esperar a tecla, ler a posição da nave e mudar a direção com a velocidade. No seu jogo, toque na barra de espaço: ainda não há disparo. Agora monte essa resposta.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Agora monte o disparo no seu projeto. Um grupo reúne objetos que o jogo vai mover e desenhar juntos. Deixe à vista o fim de Ao iniciar. Abra Jogo 2D, depois Grupos e Criar e percorrer. Pegue Criar grupo de sprites e encaixe no fim de Ao iniciar. Escreva tiros no nome e clique fora.
>
> Deixe um espaço vazio da montagem à vista. Abra Áreas do projeto, pegue Quando acontecer e solte na área de montagem. Apertar uma tecla é um evento. Os blocos dentro desse evento só são executados quando a tecla é apertada.
>
> Deixe à vista o interior de Quando acontecer. Abra Jogo 2D, depois Controles e Teclado, ações e toque. Pegue Quando apertar a tecla e encaixe dentro de Quando acontecer. Escolha barra de espaço no menu.
>
> Deixe à vista o interior do evento da barra de espaço. Abra Jogo 2D, depois Grupos e Criar e percorrer. Pegue Criar tiro no grupo e encaixe dentro de Quando apertar a tecla. Escolha o grupo tiros. Mantenha raio 5; ele define o tamanho do tiro. Escolha uma cor que apareça no fundo escuro.
>
> No campo x do tiro, vamos colocar a posição da nave. Abra Jogo 2D, depois Movimento e Posição e tamanho. Pegue o centro x do sprite e solte sobre o número que está em x. Escolha nave. Agora deixe à vista o número do campo y do tiro. Nessa mesma categoria, pegue a posição y do sprite e solte sobre o número que está em y. Escolha nave também. A cada disparo, esses blocos leem onde a nave está.
>
> No bloco do tiro, coloque vx em 0 e vy em -9. Vx é a velocidade para os lados. Zero deixa o tiro sem movimento para os lados. Vy muda a posição vertical. Como y cresce para baixo, o número negativo faz o tiro subir.
>
> Deixe à vista o encaixe logo abaixo de Criar tiro, dentro da tecla. Abra Jogo 2D, depois Som e Efeitos prontos. Pegue Tocar efeito e encaixe logo depois de Criar tiro, dentro da tecla. Escolha tiro no menu. Confira: o evento cria o tiro e depois toca o som. O tiro ainda não aparece porque falta mover e desenhar o grupo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Crie o grupo tiros e programe o disparo dentro da tecla Espaço.

## Seção 5. Mova e desenhe os tiros

### Clipe `video-tiros-voam` · Mova e desenhe os tiros

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Testar a tecla com foco no jogo, em duas posições. Enquadrar a sequência da nave seguida pelo movimento e desenho de tiros. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "O evento já cria tiros. Agora faça o jogo mostrar esses tiros se movendo. Deixe à vista o fim de A cada quadro do jogo, depois do desenho da nave. Abra Jogo 2D, depois Grupos e Movimento. Pegue Mover os sprites do grupo usando suas velocidades. Encaixe no fim de A cada quadro do jogo, depois de Desenhar o sprite nave. Escolha tiros.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Deixe à vista o encaixe logo abaixo do movimento dos tiros. Abra Jogo 2D, depois Grupos e Desenho e ordem. Pegue Desenhar o grupo e encaixe logo abaixo do movimento dos tiros. Escolha tiros nesse bloco também.
>
> Clique na área do jogo. Toque e solte a barra de espaço. O tiro deve sair da nave e subir. Mova a nave para outro lugar e atire novamente. Se o tiro não aparecer, confira os três nomes: grupo criado, grupo do disparo e grupo do desenho. Todos precisam ser tiros. Se ele descer, confira se vy está em -9, com o sinal de menos.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Coloque movimento e desenho do grupo em cada quadro. Atire de dois lugares.

## Seção 6. O tiro saiu da tela. E do grupo?

### Clipe `video-tiro-fora-da-tela` · O tiro saiu da tela. E do grupo?

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência cleanup no estado inicial, apontando o tempo e a chave. O controle só abre depois da saída de dois tiros. Não realizar a comparação.

**Narração:**
> "Um tiro pode sair da tela e continuar guardado no grupo. Nesta experiência você consegue olhar o grupo por dentro.
>
> Deixe Tirar do grupo quem sair da tela desligado. Clique em Tempo para soltar o tempo, se estiver parado. Espere dois tiros saírem da tela e olhe os objetos guardados no grupo. A regra de limpeza fica disponível depois desse teste.
>
> Ligue Tirar do grupo quem sair da tela. Se o tempo estiver parado, clique em Tempo para continuar. Acompanhe os tiros por alguns segundos e compare os objetos no grupo. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Deixe dois tiros saírem com a limpeza desligada. Depois ligue a regra e observe o grupo.

## Seção 7. Retire os tiros que saíram

### Clipe `video-faxina` · Retire os tiros que saíram

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Montar o bloco com interior vazio. A ausência visual de tiros não prova limpeza: mostrar a ordem e usar o verificador. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, o tiro saiu da tela e continuou guardado até a limpeza ser ligada. No seu jogo, o tiro também sai pela parte de cima, mas a imagem sozinha não mostra se ele deixou o grupo. Agora acrescente a regra de limpeza.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Vamos retirar do grupo os tiros que saem da tela. Deixe à vista o espaço entre mover e desenhar o grupo tiros, dentro de A cada quadro do jogo. Abra Jogo 2D, depois Grupos e Participação e limpeza. Pegue Tirar do grupo quem sair da tela. Encaixe entre Mover os sprites do grupo e Desenhar o grupo dos tiros, dentro de A cada quadro do jogo.
>
> Escolha tiros no grupo. Mantenha sprite no campo chamado. Esse nome serve para identificar cada objeto retirado, se houver alguma ação dentro do bloco. Nesta montagem, deixe o interior vazio.
>
> Confira a sequência dos tiros: mover, tirar quem saiu da tela e desenhar. Clique no jogo, dispare algumas vezes, mude a nave de lugar e dispare de novo. Os tiros devem nascer na nave e subir. O teste visual mostra o disparo; confira os blocos para garantir que a limpeza também foi montada.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Encaixe a limpeza entre mover e desenhar os tiros. Teste e envie.
