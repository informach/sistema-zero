# Roteiro de gravação · Corre, Dino! · Aula 5

**Faça os cactos entrar na pista**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Dino pulando com som diante da floresta. Saída: Grupo cactos, nascimento a cada 1,4 segundo em x 560, tamanho 44 e vx -5; movimento e desenho em cada quadro.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare o intervalo entre cactos

### Clipe `video-espaco-e-tempo` · Compare o intervalo entre cactos

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "Seu jogo já tem um Dino. Antes de criar os obstáculos, compare vários cactos nascendo a cada quadro com cactos nascendo num intervalo.
>
> Na experiência, deixe Criar cacto em A cada quadro. Clique em Tempo para deixar passar cerca de um segundo. Observe o grupo de cactos.
>
> Leve Criar cacto para dentro do relógio A cada __ segundos fazer e escolha 1,4 segundo. Clique em Tempo e deixe passar pelo menos três segundos, até nascerem dois cactos. Compare com a primeira tentativa.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Compare os nascimentos por quadro com o relógio de 1,4 segundo.

## Seção 2. Prepare o grupo e o relógio

### Clipe `video-grupo-e-relogio` · Prepare o grupo e o relógio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou os intervalos entre os cactos. No seu jogo só aparece o Dino. Prepare um grupo para reunir os obstáculos e um relógio para criá-los.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim de Ao iniciar, depois de Criar dinossauro. Abra Jogo 2D, depois Grupos e Criar e percorrer. Pegue Criar grupo de sprites e encaixe no fim de Ao iniciar. Escreva cactos no nome. O grupo guarda os objetos que serão criados por essa regra.
>
> Deixe à vista um espaço dentro de Enquanto estiver rodando, abaixo e fora de A cada quadro do jogo. Abra Jogo 2D, depois Tempo e Quadros e intervalos. Pegue A cada 2 segundos e encaixe nesse espaço. Troque o intervalo por 1.4, um segundo e quatro décimos.
>
> Confira: o grupo fica em Ao iniciar. O relógio de 1.4 segundo fica em Enquanto estiver rodando, fora do quadro. Ele ainda está vazio e não cria cactos.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Crie cactos em Ao iniciar e prepare um relógio separado de 1.4 segundo.

## Seção 3. Compare a direção da velocidade

### Clipe `video-numero-negativo` · Compare a direção da velocidade

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "O relógio já está preparado. Antes de criar um cacto que entra pela direita, compare a direção que cada número de velocidade produz.
>
> Na experiência, deixe a velocidade para baixo em 0. Escolha velocidade para o lado 5 e clique em Avançar 1 quadro algumas vezes. Observe o x.
>
> Troque a velocidade para o lado por -5 e avance mais alguns quadros. Compare a direção. Por último, deixe as duas velocidades em 0 e avance de novo.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Compare velocidade lateral 5, -5 e 0, observando o x.

## Seção 4. Crie os cactos no relógio

### Clipe `video-criar-cactos` · Crie os cactos no relógio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou o movimento com número positivo, negativo e zero. O relógio do seu projeto está vazio. Agora crie cactos que vão entrar pela direita.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o interior de A cada 1.4 segundos. Abra Jogo 2D, depois Kits prontos e Dino. Pegue No grupo criar obstáculo e encaixe dentro desse relógio. Escolha o grupo cactos e a forma cacto.
>
> Coloque x em 560, velocidade em -5 e tamanho em 44. Nossa tela tem largura 480: x 560 começa além da borda direita. A velocidade negativa leva o cacto para a esquerda.
>
> Confira os campos e o encaixe dentro do relógio. Os cactos já são criados, mas ainda faltam as ordens para atualizar suas posições e desenhá-los. A tela continua mostrando apenas Dino e floresta nesta etapa.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Crie cactos em x 560, tamanho 44 e velocidade -5 a cada 1.4 segundo.

## Seção 5. Mova e mostre o grupo de cactos

### Clipe `video-mover-e-desenhar` · Mova e mostre o grupo de cactos

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

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
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Mova e desenhe cactos a cada quadro, depois do Dino.

## Seção 6. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu Dino agora encontra cactos vindo da direita. Espere pelo menos dois nascimentos e teste o pulo.
>
> Confira o intervalo 1.4, o x 560, a velocidade -5 e o tamanho 44. A batida ainda não termina o jogo; o resultado desta aula é a entrada e o movimento dos obstáculos.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
