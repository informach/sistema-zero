# Roteiro de gravação · Corre, Dino! · Aula 7

**Separe a abertura da partida**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: A corrida começa assim que o projeto carrega. Saída: Estado inicial inicio; movimento, desenho do Dino e cactos, limpeza e nascimento protegidos por jogando.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Escolha quando o jogo pode agir

### Clipe `video-condicao` · Escolha quando o jogo pode agir

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "Sua corrida começa assim que o projeto abre. Vamos separar a abertura da partida para poder esperar uma entrada antes de jogar.
>
> Na experiência, deixe Criar cacto fora de Se o estado do jogo é jogando. Sem começar a partida, clique em Tempo e espere nascer pelo menos um cacto.
>
> Leve Criar cacto para dentro de Se o estado do jogo é jogando. Na tela de início, deixe o tempo passar três segundos e observe o contador.
>
> Depois toque na tela para começar a partida e deixe o tempo passar novamente. Compare os nascimentos nos dois momentos.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Compare o início e a partida com a criação fora e dentro da condição.

## Seção 2. Guarde em que momento o jogo está

### Clipe `video-estado-inicio` · Guarde em que momento o jogo está

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou início e partida. Seu jogo ainda não declara esse momento na preparação. Primeiro, guarde o estado inicio.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim de Ao iniciar, depois de Criar grupo de sprites. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue Mudar o estado do jogo para e encaixe no fim de Ao iniciar. Escolha inicio.
>
> Observe o jogo. O Dino e os cactos continuam agindo porque ainda não há uma condição consultando esse estado. O bloco guarda o nome do momento; ele não move os outros blocos sozinho.
>
> Confira inicio no bloco de estado dentro de Ao iniciar. As regras de movimento e criação ainda ficam nos mesmos lugares.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Guarde inicio em Ao iniciar e observe que isso sozinho não protege as ações.

## Seção 3. Separe as ações da partida

### Clipe `video-embrulhar` · Separe as ações da partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência Escolha quando o jogo pode agir, você colocou uma ação dentro de Se jogando. Seu jogo continua correndo mesmo com estado inicio. Agora proteja as ações que só pertencem à partida.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista a sequência dentro de A cada quadro do jogo. Separe a pilha que começa em Aplicar a gravidade do mundo ao sprite; leve junto controle, desenho do Dino, movimento dos cactos, desenho dos cactos e limpeza. Deixe essa pilha num espaço livre, sem copiar.
>
> Deixe à vista o espaço depois de Desenhar fundo de floresta, dentro do quadro. Abra Programação e depois Lógica e Se. Pegue Se e encaixe nesse espaço.
>
> Deixe à vista a pergunta x > 0 que veio no Se. Retire essa comparação. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe no lugar da pergunta e escolha jogando.
>
> Deixe à vista o interior de então. Leve a pilha separada para dentro dele, começando pela gravidade. A floresta e a limpeza da imagem ficam fora do Se, antes dele.
>
> Observe: no estado inicio, o Dino e os cactos deixam de ser desenhados, enquanto o fundo continua passando. Para conferir a pilha, troque temporariamente o estado em Ao iniciar para jogando. Teste um pulo e espere um cacto entrar. Depois devolva o estado a inicio.
>
> Confira a ordem dentro do então: gravidade, controle, Dino, mover cactos, desenhar cactos e limpar o grupo. Se nada funcionar no teste com jogando, confira se a pergunta e a pilha ficaram no mesmo Se.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Proteja as ações da partida e mantenha limpar e floresta antes do Se.

## Seção 4. Faça o relógio esperar a partida

### Clipe `video-relogio` · Faça o relógio esperar a partida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na mesma experiência desta aula, a criação também só acontecia durante a partida. No seu projeto, proteger o quadro não protegeu o relógio de 1.4 segundo: ele está em outro lugar. Agora aplique a mesma pergunta ali.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o interior do relógio de 1.4 segundo. Retire temporariamente No grupo criar obstáculo e deixe a peça num espaço livre.
>
> Deixe à vista o interior vazio do relógio. Abra Programação e depois Lógica e Se. Pegue Se e encaixe ali. Retire a pergunta x > 0 que veio nele.
>
> Deixe à vista o lugar da pergunta desse Se. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ? e encaixe ali. Escolha jogando. Deixe o então visível e devolva a criação do cacto para dentro dele.
>
> Confira o criador no então de Se jogando, dentro do relógio de 1.4 segundo. Teste temporariamente jogando no bloco de estado em Ao iniciar: os cactos devem nascer como antes. Depois devolva a inicio. Agora o jogo espera, ainda sem uma tela de abertura desenhada.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Proteja também a criação no relógio e termine com inicio em Ao iniciar.

## Seção 5. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu jogo agora espera no estado inicio. Confira os dois lugares: a condição no quadro e a condição no relógio dos cactos.
>
> Teste uma vez com jogando no bloco de estado de Ao iniciar. Confira pulo, som e entrada dos cactos. Antes de enviar, devolva esse campo a inicio. A floresta fica visível; a tela de começo ainda não foi desenhada.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
