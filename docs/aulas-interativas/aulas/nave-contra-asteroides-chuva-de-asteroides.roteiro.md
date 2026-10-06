# Roteiro de gravação · Nave Contra Asteroides · Aula 4

**Faça os asteroides cair**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Tiros saem da nave, sobem, têm som e são retirados do grupo ao sair da tela. Saída: Asteroides nascem a cada 40 quadros, caem e saem do grupo; tiros ainda atravessam as pedras.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare o intervalo entre as pedras

### Clipe `video-intervalo-das-pedras` · Compare o intervalo entre as pedras

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Com Criar asteroide em A cada quadro, clicar em Tempo, deixar passar cerca de um segundo e mostrar umas 30 pedras amontoadas. Levar a peça para a caixa A cada 40 quadros, deixar passar cerca de quatro segundos e mostrar as pedras nascendo separadas e a marca relógio 40: 180 em 60 quadros. Escolher 20 quadros, deixar passar mais três segundos e mostrar relógio 20: 180 em 60 quadros abaixo da primeira marca. A faixa mostra o intervalo em segundos (1,33 s); a fala usa quadros, como o bloco. Meme na comparação: na frase da fila do escorregador, mostrar por 2 a 3 segundos o meme ilustrado nosso, asteroides amontoados num escorregador e depois descendo um de cada vez, com o Zappy organizando a fila, com a legenda "um de cada vez"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima seção, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender o intervalo: quanto tempo o jogo espera entre uma pedra e outra.
>
> Olha aqui: Criar asteroide está em A cada quadro. Eu clico em Tempo e deixo passar mais ou menos um segundo. Nascem umas 30 pedras, uma em cada quadro, grudadas umas nas outras. Vira um amontoado, e ninguém conseguiria passar por ali.
>
> É como a fila do escorregador. Se todo mundo desce junto, vira um amontoado. Se cada um espera a sua vez, sobra espaço entre um e outro.
>
> Agora eu levo Criar asteroide para a caixa A cada 40 quadros, e tudo recomeça do zero. Deixo passar uns quatro segundos. Nasce uma pedra, depois outra, depois outra, com espaço entre elas. O relógio espera 40 quadros antes de criar a próxima.
>
> Por último, eu escolho 20 quadros e deixo passar mais três segundos. As pedras nascem mais perto umas das outras. Mas cada pedra desce o mesmo tanto: 180 em 60 quadros, igual antes. O intervalo muda quantas pedras nascem, não a velocidade de cada uma. No seu jogo, o relógio vai criar uma pedra a cada 40 quadros.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Compare criar em cada quadro, a cada 40 e a cada 20 quadros. Observe o nascimento e a queda das pedras.

## Seção 2. Prepare a criação dos asteroides

### Clipe `video-grupo-e-relogio` · Prepare a criação dos asteroides

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a diferença entre encaixar depois do bloco inteiro e dentro de BODY. O intervalo começa vazio. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou criar em cada quadro com esperar um intervalo. No seu jogo ainda não nascem pedras. Agora prepare o grupo e o relógio de 40 quadros.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Sua nave já atira. Agora vamos criar as pedras que ela vai enfrentar. Deixe à vista o fim de Ao iniciar. Abra Jogo 2D, depois Grupos e Criar e percorrer. Pegue Criar grupo de sprites, encaixe no fim de Ao iniciar e escreva asteroides no nome.
>
> Vamos criar uma pedra de tempos em tempos. Deixe à vista o encaixe abaixo do bloco inteiro A cada quadro do jogo, dentro de Enquanto estiver rodando. Abra Jogo 2D, depois Tempo e Quadros e intervalos. Pegue A cada quadros. Encaixe dentro de Enquanto estiver rodando, abaixo de A cada quadro do jogo, mas fora dele. Os dois blocos ficam como vizinhos. No número do intervalo, coloque 40.
>
> O bloco A cada quadro do jogo cuida de cada imagem da partida. O bloco A cada 40 quadros espera esse intervalo para executar o que estiver dentro dele. Confira que o bloco de 40 quadros não ficou encaixado dentro do outro.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Crie o grupo asteroides e um intervalo de 40 quadros, ao lado de A cada quadro do jogo.

## Seção 3. Sorteie onde a pedra nasce

### Clipe `video-posicao-sorteada` · Sorteie onde a pedra nasce

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Clicar em Sortear lugar na régua de cima até sair pelo menos um segundo lugar diferente, apontando as marcas na régua entre x 90 e x 390. Mostrar a pedra acima da borda de cima, clicar em Tempo e acompanhar a pedra entrando na tela. Meme na comparação: na frase do dado, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy jogando um dado gigante com asteroides nas faces, com a legenda "Sortear lugar"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima seção, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender o sorteio: como o jogo escolhe onde cada pedra nasce.
>
> Olha aqui: eu clico em Sortear lugar na régua de cima. Sai um lugar, e uma marca aparece na régua. Eu clico de novo, e sai outro lugar. Cada clique é um sorteio novo, sempre entre x 90 e x 390. É como jogar um dado: você não sabe qual número vai sair, e o mesmo número pode sair de novo.
>
> A pedra fica acima da borda de cima, do lado de fora da tela. Eu clico em Tempo, e ela desce e entra caindo pela borda de cima. Assim, ninguém vê a pedra aparecer do nada. No seu jogo, o x do asteroide vai ser sorteado, e o y vai começar em -30, acima da tela.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Sorteie até observar lugares diferentes. Depois acompanhe uma pedra entrando na tela.

## Seção 4. Crie e mostre as pedras caindo

### Clipe `video-asteroide` · Crie e mostre as pedras caindo

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar criação no intervalo e movimento/limpeza/desenho no bloco de cada quadro. Não montar colisão. Registrar que a travessia é o estado esperado desta etapa. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você sorteou posições e acompanhou a entrada de uma pedra. No seu jogo, o grupo e o relógio estão prontos, mas ainda falta criar o asteroide. Agora monte essa criação.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Deixe à vista o interior de A cada 40 quadros. Abra Jogo 2D, depois Kits prontos e Espaço. Pegue No grupo criar um asteroide e encaixe dentro de A cada 40 quadros. Escolha asteroides no grupo.
>
> No lugar de escrever um número fixo em x, vamos sortear a posição. Deixe à vista o número do campo x do criador de asteroide. Abra Jogo 2D, depois Sorteios e Números e posições. Pegue um x aleatório na tela e solte sobre o número do campo x do asteroide. O jogo faz um sorteio a cada criação. Ele pode repetir um lugar; não precisa alternar entre lugares diferentes.
>
> Coloque y em -30. Esse número põe o começo do asteroide acima da tela. Mantenha tamanho 40, coloque vx em 0 e vy em 3. O asteroide não anda para os lados. Como vy é positivo, ele desce. Escolha uma cor que apareça no fundo.
>
> Agora vamos mover e desenhar esse grupo. Deixe à vista o fim de A cada quadro do jogo, depois de Desenhar o grupo tiros. Abra Jogo 2D, depois Grupos e Movimento. Pegue Mover os sprites do grupo usando suas velocidades e encaixe no fim de A cada quadro do jogo, depois de Desenhar o grupo tiros. Escolha asteroides.
>
> Deixe à vista o encaixe abaixo do movimento dos asteroides. Abra Jogo 2D, depois Grupos e Participação e limpeza. Pegue Tirar do grupo quem sair da tela, encaixe abaixo do movimento dos asteroides e escolha asteroides. Mantenha sprite no campo chamado e deixe o interior vazio.
>
> Deixe à vista o encaixe abaixo da limpeza dos asteroides. Abra Jogo 2D, depois Grupos e Desenho e ordem. Pegue Desenhar o grupo, encaixe abaixo da limpeza dos asteroides e escolha asteroides.
>
> Observe o jogo. As pedras devem entrar pela parte de cima e cair. Atire em uma delas. Por enquanto, o tiro atravessa a pedra: ainda não programamos o acerto. Se nenhuma pedra aparecer, confira o grupo nos quatro blocos e se o criador está dentro de A cada 40 quadros.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Monte o asteroide no intervalo e o ciclo do grupo em cada quadro.

## Seção 5. Compare o intervalo e guarde sua chuva

### Clipe `video-entrega` · Compare o intervalo e guarde sua chuva

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Dar tempo para observar alguns nascimentos em cada intervalo. Restaurar 40 antes da verificação. Não confundir quadros com segundos. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Vamos comparar o espaço de tempo entre as pedras. No bloco A cada 40 quadros, troque 40 por 80. Observe a chegada de algumas pedras. Depois volte para 40 e observe de novo.
>
> Você mudou o intervalo de criação. A velocidade de cada pedra continua em vy 3. Se quiser conferir, olhe esse campo no criador do asteroide. Para terminar, mantenha o intervalo em 40.
>
> Teste também as setas e os tiros. A nave deve continuar funcionando como antes, agora com as pedras caindo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste 80 e 40 no intervalo, mantenha 40 e envie o projeto.
