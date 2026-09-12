# Bateu, terminou, recomeçou

Piloto Corre Dino, organizada em 5 seções. Narração revisada para vídeo curto, Zappy e manipulação. Os vídeos estão planejados; precisam ser gravados e vinculados antes da publicação.

Continuidade: reutilizar o bloco Estúdio existente e sua configuração de projeto anterior. Não criar outro projeto por etapa. No celular, orientação e criação aparecem uma abaixo da outra.

A descoberta registra exploração, não domínio demonstrado do conceito. As verificações do Estúdio conferem a estrutura declarada; os testes de funcionamento são realizados pela criança e revistos pelo professor. O quiz acontece depois da entrega.

## 1. Jogar e recomeçar

**Objetivo do professor:** Definir a consequência da colisão e testar o ciclo completo da partida.

**Vídeo planejado:** `video-missao`

Clipe de 30 a 45 segundos. Oi! Oi! Hoje uma batida vai encerrar a partida. E o jogador vai poder tentar outra vez, sem mexer nos blocos. Mostre a cena desta descoberta e o que a criança pode mover. Convide: “Provoque a batida. Conecte o reinício para jogar outra partida.”. Mostre como rodar, pausar, avançar um passo e comparar, sem responder por ela. Explique com calma a ideia, usando a imagem: Detectar um encontro só faz diferença quando escolhemos sua consequência. A colisão pode produzir som, explosão, tremida e uma mudança de tela.

Ao ir para fim, as ações protegidas por Se jogando deixam de executar. Reiniciar prepara uma partida nova, passando novamente pelas ações iniciais.

Testar só a batida não basta: início, fim e reinício precisam formar um ciclo que o jogador entende. Termine apontando para a atividade abaixo.

**Cena nativa:** `restart`. Provoque a batida. Conecte o reinício para jogar outra partida.

**Pista:** Mude uma coisa por vez. Rode até o fim ou avance por passos e compare com a tentativa anterior.

**O que observar:** Você completou o ciclo: jogar, perder e começar outra vez!

**Para avançar:** executar as comparações indicadas na cena; mudar um seletor sem rodar não basta. Sem perguntas nesta descoberta.

## 2. Conte o que aconteceu na batida

**Objetivo do professor:** Comunicar a colisão com mudança de tela e sinais visuais e sonoros.

**Vídeo planejado:** `video-construir-1-1`

Clipe de 30 a 75 segundos: A colisão que acaba o jogo. Narração revisada: “Agora é a sua vez. Vamos a colisão que acaba o jogo.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Em Jogo 2D, Colisões, coloque o evento de cada sprite do grupo que colidir com dino dentro de Se jogando, antes da limpeza. Use cactos e o apelido cacto.

Dentro, coloque Ir para a tela fim. Rode e bata. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Em Jogo 2D, Colisões, coloque o evento de cada sprite do grupo que colidir com dino dentro de Se jogando, antes da limpeza. Use cactos e o apelido cacto.

**Vídeo planejado:** `video-construir-2-1`

Clipe de 30 a 75 segundos: A tela de fim. Narração revisada: “Agora é a sua vez. Vamos a tela de fim.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: No Se grande, adicione outro senão se com a tela fim. Dentro, coloque Mostrar tela.

Use Bateu no cacto! como título e uma dica dizendo que qualquer tecla ou toque permite jogar de novo. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** No Se grande, adicione outro senão se com a tela fim. Dentro, coloque Mostrar tela.

**Vídeo planejado:** `video-construir-3-1`

Clipe de 30 a 75 segundos: Fazer você sentir a batida. Narração revisada: “Agora é a sua vez. Vamos fazer você sentir a batida.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Dentro da colisão, antes de ir para fim, acrescente explosão no cacto, tremida de intensidade 8 e o efeito de derrota. Escute e observe a batida: esses sinais contam ao jogador o que aconteceu. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Dentro da colisão, antes de ir para fim, acrescente explosão no cacto, tremida de intensidade 8 e o efeito de derrota. Escute e observe a batida: esses sinais contam ao jogador o que aconteceu.

**Zappy:** Bata em um cacto. Veja a tela de fim e os efeitos. A mensagem deve explicar o que aconteceu mesmo com o som desligado.

**Para avançar:** verificar no projeto:

- Mude para fim ao encontrar um cacto.

Teste também o funcionamento com Play.

## 3. Prepare outra tentativa

**Objetivo do professor:** Reiniciar o jogo no comando da tela fim.

**Vídeo planejado:** `video-construir-4-1`

Clipe de 30 a 75 segundos: Jogar de novo. Narração revisada: “Agora é a sua vez. Vamos jogar de novo.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: No evento de qualquer tecla ou toque, acrescente senão se a tela é fim. Dentro, coloque Reiniciar o jogo, de Telas e cenas.

Preserve o caminho de inicio para jogando que já existe. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** No evento de qualquer tecla ou toque, acrescente senão se a tela é fim. Dentro, coloque Reiniciar o jogo, de Telas e cenas.

**Vídeo planejado:** `video-construir-5-1`

Clipe de 30 a 75 segundos: Testar do começo ao fim. Narração revisada: “Agora é a sua vez. Vamos testar do começo ao fim.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Jogue desde a tela de início, bata, veja o fim e recomece. Faça isso com clique e depois com Enter.

Confira se o novo jogo volta ao estado inicial. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Jogue desde a tela de início, bata, veja o fim e recomece. Faça isso com clique e depois com Enter.

**Zappy:** Preserve o caminho que começa a partida e acrescente o caminho para jogar de novo.

**Para avançar:** verificar no projeto:

- Reinicie dentro do evento de qualquer tecla ou toque.

Teste também o funcionamento com Play.

## 4. Mostre sua criação

**Objetivo do professor:** Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Vídeo planejado:** `video-entrega`

Clipe de 20 a 40 segundos. Narração revisada: “Olha o que você construiu! Vamos conferir antes de enviar.” Demonstre os testes desta aula: Complete o ciclo duas vezes, usando controles diferentes. O jogo deve parar ao perder e permitir uma nova tentativa. Envie seu projeto. Mostre o botão Enviar ao professor e a confirmação do envio.  Termine: “Depois de enviar, tem um quiz curtinho sobre o que você descobriu.”

**Zappy:** Teste o que você criou e envie ao professor. Depois vamos fechar com duas perguntas!

**Ferramenta:** o mesmo Estúdio, com o projeto desta aula. Enviar uma cópia ao professor; não confundir salvar o rascunho com entregar.

**Para avançar:** envio confirmado ao professor e aprovação automática se configurada no bloco. O envio libera apenas o quiz seguinte; não conclui toda a aula.

## 5. O que você descobriu?

**Objetivo do professor:** Retomar o conceito depois de explorar, criar e entregar.

**Zappy:** Você já experimentou essa ideia! Responda com calma. Se errar, veja a explicação e tente de novo.

**Pergunta:** Você perdeu. Como preparar uma partida nova sem objetos antigos?

- Reiniciar o jogo. (correta)
- Apenas mudar a tela para jogando.

**Feedback:** Reiniciar executa novamente a preparação da partida.

**Pergunta:** Sem áudio, como mostrar que a partida terminou?

- Deixar tudo parado sem explicação.
- Exibir a tela de fim e um sinal visual. (correta)

**Feedback:** Uma mensagem e sinais visuais comunicam a batida mesmo sem som.

**Para concluir:** acertar as duas perguntas, com feedback e nova tentativa. Não há perguntas sobre conteúdo ainda não explorado.

## Produção e revisão

Gravar em frases curtas, dar tempo para perceber as mudanças e oferecer legenda. Evitar música sobre a explicação. Não exigir áudio para observar o som do pulo: a cena também sinaliza visualmente. Testar teclado, toque, movimento reduzido, retomada e erro de conexão.

Ao importar, conferir a lista de instruções antigas aposentadas e o apoio preservado. A aula publicada continua disponível até a revisão e publicação do novo rascunho.
