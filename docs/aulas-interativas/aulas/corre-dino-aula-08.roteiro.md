# Roteiro de gravação · Corre, Dino! · Aula 8

**Comece por tecla ou toque**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Jogo esperando no estado inicio, com a floresta visível. Saída: Tela de início e um evento de qualquer tecla ou toque que muda inicio para jogando.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Desenhe a tela de início

### Clipe `video-menu` · Desenhe a tela de início

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Seu jogo já espera em inicio, mas só mostra a floresta. A condição da fase anterior separou os momentos. Agora acrescente uma resposta para desenhar a abertura.
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
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Mostre a abertura no senão se inicio, com título e convite para começar.

## Seção 2. Compare tecla e toque para começar

### Clipe `video-convite` · Compare tecla e toque para começar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar na tela de início, com Começar em Quando apertar a tecla. Tocar na tela e mostrar que nada muda. Clicar em Apertar Enter e mostrar a partida. Clicar em Voltar ao início, levar Começar para Quando apertar qualquer tecla ou tocar na tela e repetir o toque e o Enter, voltando ao início entre eles. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.

**Narração:**
> "Esta é uma experiência para a gente entender os eventos que começam a partida, com tecla e também com toque.
>
> Olha aqui: com Começar em Quando apertar a tecla, eu toco na tela de início. Nada acontece, porque esse evento só escuta a tecla. Quando eu clico em Apertar Enter, a partida começa.
>
> Eu clico em Voltar ao início e levo Começar para Quando apertar qualquer tecla ou tocar na tela. Agora, quando eu toco na tela de início, a partida começa. Volto ao início, clico em Apertar Enter, e ela começa também. Esse evento escuta os dois jeitos.
>
> Quem joga no celular não tem teclado, então precisa do toque. No seu jogo, você vai usar Quando apertar qualquer tecla ou tocar na tela para começar a partida.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Teste toque e Enter antes e depois de mudar o lugar da peça Começar.

## Seção 3. Ligue a entrada ao início da partida

### Clipe `video-entrada-ampla` · Ligue a entrada ao início da partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Próxima parte).

**Narração:**
> "Lembra da experiência da parte anterior? Você comparou os eventos que respondem à entrada. Toque na abertura do seu jogo: ela ainda não começa. Agora faça o evento mudar inicio para jogando.
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
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Próxima parte."

**Zappy na página (não gravar):** Comece a partida somente quando uma tecla ou toque encontrar o estado inicio.

## Seção 4. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado (Enviar para o guia, Enviar e Concluir fase).

**Narração:**
> "Sua abertura agora começa uma partida. Confira o convite escrito e teste a entrada por tecla e por toque desde a abertura. Para repetir o teste, clique na seta circular Atualizar, no alto da prévia do jogo.
>
> Depois de começar, teste o pulo e espere cactos entrarem. Confira que o criador continua protegido por Se jogando. A derrota ainda não foi programada.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.
