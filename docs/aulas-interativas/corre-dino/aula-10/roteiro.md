# Uma colisão mais justa

Piloto Corre Dino, organizada em 5 seções. Narração revisada para vídeo curto, Zappy e manipulação. Os vídeos estão planejados; precisam ser gravados e vinculados antes da publicação.

Continuidade: reutilizar o bloco Estúdio existente e sua configuração de projeto anterior. Não criar outro projeto por etapa. No celular, orientação e criação aparecem uma abaixo da outra.

A descoberta registra exploração, não domínio demonstrado do conceito. As verificações do Estúdio conferem a estrutura declarada; os testes de funcionamento são realizados pela criança e revistos pelo professor. O quiz acontece depois da entrega.

## 1. A área da batida

**Objetivo do professor:** Distinguir o desenho da área de colisão e ajustar a tolerância usando evidência visual.

**Vídeo planejado:** `video-missao`

Clipe de 30 a 45 segundos. Oi! Oi! Às vezes parece que o Dino perde sem encostar no cacto. Vamos ligar um raio-X para investigar essa batida. Mostre a cena desta descoberta e o que a criança pode mover. Convide: “Mude a área do Dino e aproxime o cacto. Compare quando eles encostam.”. Mostre como rodar, pausar, avançar um passo e comparar, sem responder por ela. Explique com calma a ideia, usando a imagem: O computador pode usar uma forma simples para detectar contatos, sem seguir cada detalhe do desenho. Essa área inclui espaços transparentes e pode tocar o obstáculo antes da imagem parecer encostar.

Mostrar a caixa de colisão torna essa regra visível. Diminuir a área pode deixar o jogo mais justo, mas diminuir demais permite contatos que parecem impossíveis.

O experimento usa círculos para comparar áreas; no seu jogo, confira os retângulos com o raio-X. Termine apontando para a atividade abaixo.

**Cena nativa:** `hitbox`. Mude a área do Dino e aproxime o cacto. Compare quando eles encostam.

**Pista:** Mude uma coisa por vez. Rode até o fim ou avance por passos e compare com a tentativa anterior.

**O que observar:** Você comparou o desenho com a área que decide a batida!

**Para avançar:** executar as comparações indicadas na cena; mudar um seletor sem rodar não basta. Sem perguntas nesta descoberta.

## 2. Veja a parte invisível da batida

**Objetivo do professor:** Comparar a imagem com a área usada na colisão.

**Vídeo planejado:** `video-construir-1-1`

Clipe de 30 a 75 segundos: Ligar o raio-X. Narração revisada: “Agora é a sua vez. Vamos ligar o raio-x.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Em Jogo 2D, Aparência, coloque Mostrar a caixa de colisão do sprite no fim de Se jogando. Escolha dino e rode.

O contorno rosa vai mostrar a área que estava invisível. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Em Jogo 2D, Aparência, coloque Mostrar a caixa de colisão do sprite no fim de Se jogando. Escolha dino e rode.

**Vídeo planejado:** `video-construir-2-1`

Clipe de 30 a 75 segundos: Por que a batida pareceu roubada. Narração revisada: “Agora é a sua vez. Vamos por que a batida pareceu roubada.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Aproxime o dino de um cacto e observe os espaços entre o desenho e o contorno. Compare a batida olhando a imagem e depois a caixa.

Essa diferença explica a sensação de perder cedo. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Aproxime o dino de um cacto e observe os espaços entre o desenho e o contorno. Compare a batida olhando a imagem e depois a caixa.

**Zappy:** Aproxime o Dino do cacto e observe o contorno. Procure os espaços entre o desenho e a caixa.

**Para avançar:** verificar no projeto:

- Mostre a caixa de colisão do sprite dino em A cada quadro do jogo.

Teste também o funcionamento com Play.

## 3. Ajuste a área do contato

**Objetivo do professor:** Configurar a escala da área de colisão do personagem.

**Vídeo planejado:** `video-construir-3-1`

Clipe de 30 a 75 segundos: Ajustar a área de colisão. Narração revisada: “Agora é a sua vez. Vamos ajustar a área de colisão.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Em Colisões, coloque Usar área de colisão de porcentagem do tamanho em Ao iniciar, como último bloco. Escolha dino e 80.

Recomece e confira a caixa menor com o raio-X ainda ligado. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Em Colisões, coloque Usar área de colisão de porcentagem do tamanho em Ao iniciar, como último bloco. Escolha dino e 80.

**Vídeo planejado:** `video-construir-4-1`

Clipe de 30 a 75 segundos: Você escolhe o quanto perdoar. Narração revisada: “Agora é a sua vez. Vamos você escolhe o quanto perdoar.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Compare 40 e 100. Depois escolha um valor de 70 a 85 observando os saltos.

Ao terminar, remova o bloco que mostra a caixa, mas preserve a configuração da área de colisão. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Compare 40 e 100. Depois escolha um valor de 70 a 85 observando os saltos.

**Zappy:** Comece com 80% e veja a caixa menor. Na próxima etapa você pode comparar outros valores.

**Para avançar:** verificar no projeto:

- Configure a área de colisão do sprite dino em Ao iniciar.

Teste também o funcionamento com Play.

## 4. Mostre sua criação

**Objetivo do professor:** Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Vídeo planejado:** `video-entrega`

Clipe de 20 a 40 segundos. Narração revisada: “Olha o que você construiu! Vamos conferir antes de enviar.” Demonstre os testes desta aula: Jogue com o raio-X para justificar sua escolha. Depois desligue o diagnóstico e confira se o jogo parece justo. Envie. Mostre o botão Enviar ao professor e a confirmação do envio.  Termine: “Depois de enviar, tem um quiz curtinho sobre o que você descobriu.”

**Zappy:** Teste o que você criou e envie ao professor. Depois vamos fechar com duas perguntas!

**Ferramenta:** o mesmo Estúdio, com o projeto desta aula. Enviar uma cópia ao professor; não confundir salvar o rascunho com entregar.

**Para avançar:** envio confirmado ao professor e aprovação automática se configurada no bloco. O envio libera apenas o quiz seguinte; não conclui toda a aula.

## 5. O que você descobriu?

**Objetivo do professor:** Retomar o conceito depois de explorar, criar e entregar.

**Zappy:** Você já experimentou essa ideia! Responda com calma. Se errar, veja a explicação e tente de novo.

**Pergunta:** O desenho não encostou, mas a caixa de colisão encostou. O jogo…

- Pode detectar a batida pela caixa. (correta)
- Só olha os pixels do desenho.

**Feedback:** A área de colisão pode ter um tamanho diferente da imagem.

**Pergunta:** Você diminui a área de 100% para 80%. O que muda?

- A cor do personagem.
- A área usada para detectar contato. (correta)

**Feedback:** A escala muda a área de colisão; use o raio-X para comparar.

**Para concluir:** acertar as duas perguntas, com feedback e nova tentativa. Não há perguntas sobre conteúdo ainda não explorado.

## Produção e revisão

Gravar em frases curtas, dar tempo para perceber as mudanças e oferecer legenda. Evitar música sobre a explicação. Não exigir áudio para observar o som do pulo: a cena também sinaliza visualmente. Testar teclado, toque, movimento reduzido, retomada e erro de conexão.

Ao importar, conferir a lista de instruções antigas aposentadas e o apoio preservado. A aula publicada continua disponível até a revisão e publicação do novo rascunho.
