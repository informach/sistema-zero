# Roteiro de gravação · Corre, Dino! · Aula 8

**Comece por tecla ou toque**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Jogo esperando no estado inicio, com a floresta visível. Saída: Tela de início e um evento de qualquer tecla ou toque que muda inicio para jogando.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Desenhe a tela de início

### Clipe `video-menu` · Desenhe a tela de início

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu jogo já espera em inicio, mas só mostra a floresta. A condição da aula anterior separou os momentos. Agora acrescente uma resposta para desenhar a abertura.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o Se jogando dentro de A cada quadro do jogo. Clique uma vez no + ao lado de senão, na parte de baixo do bloco. Ele acrescenta um ramo senão se.
>
> Deixe à vista a pergunta x > 0 desse novo ramo e retire-a. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe na pergunta e escolha inicio.
>
> Deixe à vista o interior do ramo inicio. Na mesma categoria Telas e partida, pegue Mostrar tela com título subtítulo dica fundo e encaixe nesse ramo.
>
> No título, escreva Corre, Dino! No subtítulo, escreva Pule os cactos! Na dica, escreva Aperte qualquer tecla ou toque na tela para começar. Escolha um fundo escuro para o texto aparecer.
>
> Confira: a abertura aparece porque o estado está em inicio. Ela ainda não responde à entrada, pois só montamos o desenho. Se a tela não aparecer, confira o estado inicio no ramo e o bloco de tela dentro dele.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Mostre a abertura no senão se inicio, com título e convite para começar.

## Seção 2. Compare tecla e toque para começar

### Clipe `video-convite` · Compare tecla e toque para começar

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "A abertura do seu jogo convida a usar tecla ou toque. Compare como escolher um evento que atende aos dois.
>
> Na experiência, com Começar na opção que escuta Enter, toque na tela de início e observe. Depois use Enter para começar e volte ao início.
>
> Leve Começar para Quando apertar qualquer tecla ou tocar na tela. Teste o toque, volte ao início e teste Enter outra vez. Compare os dois jeitos.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Teste toque e Enter antes e depois de mudar o lugar da peça Começar.

## Seção 3. Ligue a entrada ao início da partida

### Clipe `video-entrada-ampla` · Ligue a entrada ao início da partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou os eventos que respondem à entrada. Toque na abertura do seu jogo: ela ainda não começa. Agora faça o evento mudar inicio para jogando.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista um espaço dentro de Quando acontecer, separado do evento de pulo. Abra Jogo 2D, depois Controles e Teclado, ações e toque. Pegue Quando apertar qualquer tecla ou tocar na tela e encaixe nessa área.
>
> Deixe à vista o interior do novo evento. Abra Programação e depois Lógica e Se. Pegue Se e encaixe ali. Retire a pergunta x > 0 que veio nele.
>
> Deixe à vista o lugar da pergunta. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe no Se e escolha inicio.
>
> Deixe à vista o então dessa condição. Na mesma categoria Telas e partida, pegue Mudar o estado do jogo para e encaixe dentro de então. Escolha jogando.
>
> Clique no jogo e use uma tecla para começar. A abertura deve sumir e o Dino deve aparecer. Toque espaço, seta para cima e a tela para conferir os pulos. Durante a partida, o evento de início não deve mudar o estado de novo.
>
> Para testar outra entrada desde a abertura, clique no botão de seta circular Atualizar, no alto da prévia do jogo. Toque na abertura para começar. Confira um único evento de qualquer tecla ou toque, com Se inicio e Mudar para jogando dentro dele.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Comece a partida somente quando uma tecla ou toque encontrar o estado inicio.

## Seção 4. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Sua abertura agora começa uma partida. Confira o convite escrito e teste a entrada por tecla e por toque desde a abertura. Para repetir o teste, clique na seta circular Atualizar, no alto da prévia do jogo.
>
> Depois de começar, teste o pulo e espere cactos entrarem. Confira que o criador continua protegido por Se jogando. A derrota ainda não foi programada.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
