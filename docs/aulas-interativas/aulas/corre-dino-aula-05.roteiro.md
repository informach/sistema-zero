# Roteiro de gravação · Corre, Dino! · Aula 5

**Faça os cactos entrar na pista**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Dino pulando com som diante da floresta. Saída: Grupo cactos, nascimento a cada 1,4 segundo em x 560, tamanho 44 e vx -5; movimento e desenho em cada quadro.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare o intervalo entre cactos

### Clipe `video-espaco-e-tempo` · Compare o intervalo entre cactos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com Criar cacto em A cada quadro. Clicar em Tempo, deixar passar cerca de um segundo e parar, com a parede de cactos e o número na faixa. Levar a peça para o relógio, escolher 1,4 s, clicar em Tempo e esperar dois nascimentos, com a comparação das duas tentativas à vista na faixa. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Dino e os cactos numa fila de escorregador, descendo um de cada vez. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender como um relógio abre espaço entre os cactos.
>
> Olha aqui: com Criar cacto em A cada quadro, eu clico em Tempo e deixo passar um segundo. Nascem uns 30 cactos, um em cada quadro, colados uns nos outros. Eles formam uma parede, e o Dino não teria como pular.
>
> Agora eu levo Criar cacto para o relógio e escolho 1,4 s. Tudo recomeça do zero. Eu deixo passar uns três segundos, e nascem só dois cactos, com espaço entre eles. O relógio cria um cacto a cada 1,4 segundo, e não em todo quadro.
>
> É como a fila do escorregador. Se todo mundo desce junto, ninguém brinca. Se cada um desce na sua vez, sobra espaço. No seu jogo, você vai preparar um relógio de 1,4 segundo para criar os cactos.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Compare os nascimentos por quadro com o relógio de 1,4 segundo.

## Seção 2. Prepare o grupo e o relógio

### Clipe `video-grupo-e-relogio` · Prepare o grupo e o relógio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou os intervalos entre os cactos. No seu jogo só aparece o Dino. Prepare um grupo para reunir os obstáculos e um relógio para criá-los.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim de Ao iniciar, depois de Criar dinossauro. Abra Jogo 2D, depois Grupos e Criar e percorrer. Pegue Criar grupo de sprites e encaixe no fim de Ao iniciar. Escreva cactos no nome. O grupo guarda os objetos que serão criados por essa regra.
>
> Deixe à vista um espaço dentro de Enquanto estiver rodando, abaixo e fora de A cada quadro do jogo. Abra Jogo 2D, depois Tempo e Quadros e intervalos. Pegue A cada 2 segundos e encaixe nesse espaço. Troque o intervalo por 1.4, um segundo e quatro décimos.
>
> Confira: o grupo fica em Ao iniciar. O relógio de 1.4 segundo fica em Enquanto estiver rodando, fora do quadro. Ele ainda está vazio e não cria cactos.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Crie cactos em Ao iniciar e prepare um relógio separado de 1.4 segundo.

## Seção 3. Compare a direção da velocidade

### Clipe `video-numero-negativo` · Compare a direção da velocidade

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar com o cacto parado em x 60 e as duas velocidades em 0. Escolher 5 na velocidade para o lado e clicar em Avançar 1 quadro algumas vezes, com o x à vista na faixa. Trocar para -5 e avançar. Deixar as duas em 0 e avançar de novo. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender a velocidade e como o sinal do número escolhe a direção.
>
> Olha aqui: com a velocidade para baixo em 0 e a velocidade para o lado em 5, eu clico em Avançar 1 quadro. O x do cacto vai de 60 para 65: ele andou 5 para a direita. Em cada quadro, o jogo soma a velocidade ao x.
>
> Quando eu troco a velocidade para o lado por -5 e avanço, o x diminui 5 em cada quadro, e o cacto vai para a esquerda. O sinal de menos inverte a direção.
>
> Com as duas velocidades em 0, eu avanço de novo, e o cacto fica parado: somar zero não muda nada. Os cactos do seu jogo vão nascer na direita, então vão usar velocidade -5 para atravessar a tela.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Compare velocidade lateral 5, -5 e 0, observando o x.

## Seção 4. Crie os cactos no relógio

### Clipe `video-criar-cactos` · Crie os cactos no relógio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou o movimento com número positivo, negativo e zero. O relógio do seu projeto está vazio. Agora crie cactos que vão entrar pela direita.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o interior de A cada 1.4 segundos. Abra Jogo 2D, depois Kits prontos e Dino. Pegue No grupo criar obstáculo e encaixe dentro desse relógio. Escolha o grupo cactos e a forma cacto.
>
> Coloque x em 560, velocidade em -5 e tamanho em 44. A tela do seu jogo tem largura 480, por isso x 560 começa além da borda direita. A velocidade negativa leva o cacto para a esquerda.
>
> Confira os campos e o encaixe dentro do relógio. Os cactos já são criados, mas ainda faltam as ordens para atualizar suas posições e desenhá-los. Por enquanto, a tela continua mostrando apenas Dino e floresta.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Crie cactos em x 560, tamanho 44 e velocidade -5 a cada 1.4 segundo.

## Seção 5. Mova e mostre o grupo de cactos

### Clipe `video-mover-e-desenhar` · Mova e mostre o grupo de cactos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Na experiência Compare o intervalo entre cactos, você viu o grupo crescer. No seu projeto, os objetos já nascem no relógio, mas ainda não aparecem. Atualize as posições e mostre esse grupo em cada quadro.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim de A cada quadro do jogo, depois de Desenhar o sprite dino. Abra Jogo 2D, depois Grupos e Movimento. Pegue Mover os sprites do grupo e encaixe depois do Dino. Escolha cactos. Esse bloco usa a velocidade guardada em cada objeto.
>
> Deixe à vista o encaixe abaixo do movimento do grupo. Abra Jogo 2D, depois Grupos e Desenho e ordem. Pegue Desenhar o grupo e encaixe logo abaixo. Escolha cactos.
>
> Observe alguns nascimentos. Os cactos devem entrar pela direita e passar para a esquerda. Pule um deles. A batida ainda não está programada, então atravessar um cacto não encerra nada.
>
> Confira a ordem: desenhar Dino, mover cactos e desenhar cactos. Se nada aparecer, confira o nome do grupo, o x 560 e a velocidade -5 no criador. O criador permanece no relógio, fora do quadro.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Mova e desenhe cactos a cada quadro, depois do Dino.

## Seção 6. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Enviar para o guia, Enviar e Concluir fase).

**Narração:**
> "Seu Dino agora encontra cactos vindo da direita. Espere pelo menos dois nascimentos e teste o pulo.
>
> Confira o intervalo 1.4, o x 560, a velocidade -5 e o tamanho 44. A batida ainda não termina o jogo; o resultado desta fase é a entrada e o movimento dos obstáculos.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.
