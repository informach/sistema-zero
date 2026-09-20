# Uma colisão mais justa

Piloto Corre Dino v5, organizada em 5 seções. A sequência desta aula foi escolhida pelo conteúdo; não é um molde obrigatório para as demais.

Os vídeos estão roteirizados e precisam ser gravados e vinculados. Preservar o bloco Estúdio existente, o projeto contínuo e os marcos concluídos. No notebook, usar a largura útil dos painéis; em telas estreitas, Ver exemplo / Criar conserva o mesmo editor.

O modelo registra descobertas, sem afirmar domínio do conceito. Conferir estrutura no Estúdio não comprova a execução do jogo. A criança testa o comportamento e o professor revisa a entrega.

## 1. Onde a batida acontece?

**Objetivo do professor:** Áreas em contato; Áreas separadas; Mesma posição, áreas diferentes

**Vídeo planejado:** `video-missao`

Clipe de 20 a 45 segundos. Mostre o desenho do Dino e o contorno de sua área. “Quando o jogo percebe uma batida? Aproxime o cacto até as áreas encostarem.” Depois deixe o cacto no meio e convide a mexer somente na alça da área. Mostre os botões equivalentes Menor/Maior. O desenho mantém seu tamanho e a comparação guarda a mesma posição.

**Missão v2:** `hitbox`. Aproxime o cacto. Depois mude a área do Dino, sem mudar seu desenho.

**A criança mexe em:** Posição do cacto e alça da área de contato.

**Pista 1:** Olhe as bordas das duas áreas.

**Pista 2:** Deixe o cacto no mesmo lugar e mude só a área do Dino.

**Pista 3:** Aproxime até a marca do meio. Compare as alças Menor e Maior.

**Para avançar:** Áreas em contato; Áreas separadas; Mesma posição, áreas diferentes.

**Reconhecimento:** O desenho ficou igual. A área mudou o momento da batida!

**Convite opcional:** E se a área ficar menor? Aproxime o cacto de novo.


## 2. Veja a parte invisível da batida

**Objetivo do professor:** Comparar a imagem com a área usada na colisão.

**Vídeo planejado:** `video-construir-1-1`

Clipe de 30 a 75 segundos: Ligar o raio-X. Narração: “Agora vamos cuidar desta parte do seu projeto. Veja onde mexer.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Em Jogo 2D, Aparência, coloque Mostrar a caixa de colisão do sprite no fim de Se jogando. Escolha dino e rode.

O contorno rosa vai mostrar a área que estava invisível. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Em Jogo 2D, Aparência, coloque Mostrar a caixa de colisão do sprite no fim de Se jogando. Escolha dino e rode.

**Vídeo planejado:** `video-construir-2-1`

Clipe de 30 a 75 segundos: Por que a batida pareceu roubada. Narração: “Agora vamos cuidar desta parte do seu projeto. Veja onde mexer.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Aproxime o dino de um cacto e observe os espaços entre o desenho e o contorno. Compare a batida olhando a imagem e depois a caixa.

Essa diferença explica a sensação de perder cedo. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Aproxime o dino de um cacto e observe os espaços entre o desenho e o contorno. Compare a batida olhando a imagem e depois a caixa.

**Zappy:** Aproxime o Dino do cacto e observe o contorno. Procure os espaços entre o desenho e a caixa.

**Mesmo espaço de trabalho:** `projeto`. A referência reutiliza o projeto; não cria outro arquivo por seção.

**Para avançar, conferir a estrutura:**

- Mostre a caixa de colisão do sprite dino em A cada quadro do jogo.

Depois, usar Play para observar o comportamento. A checagem estrutural não será apresentada como execução verificada.


## 3. Ajuste a área do contato

**Objetivo do professor:** Configurar a escala da área de colisão do personagem.

**Vídeo planejado:** `video-construir-3-1`

Clipe de 30 a 75 segundos: Ajustar a área de colisão. Narração: “Agora vamos cuidar desta parte do seu projeto. Veja onde mexer.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Em Colisões, coloque Usar área de colisão de porcentagem do tamanho em Ao iniciar, como último bloco. Escolha dino e 80.

Recomece e confira a caixa menor com o raio-X ainda ligado. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Em Colisões, coloque Usar área de colisão de porcentagem do tamanho em Ao iniciar, como último bloco. Escolha dino e 80.

**Vídeo planejado:** `video-construir-4-1`

Clipe de 30 a 75 segundos: Você escolhe o quanto perdoar. Narração: “Agora vamos cuidar desta parte do seu projeto. Veja onde mexer.” Demonstre devagar na categoria e no bloco reais, preservando o projeto anterior: Compare 40 e 100. Depois escolha um valor de 70 a 85 observando os saltos.

Ao terminar, remova o bloco que mostra a caixa, mas preserve a configuração da área de colisão. Mostre o resultado esperado. Termine: “Pause o vídeo e experimente no seu Estúdio. Se sair diferente, você pode voltar e tentar de novo.”

**Zappy:** Compare 40 e 100. Depois escolha um valor de 70 a 85 observando os saltos.

**Zappy:** Comece com 80% e veja a caixa menor. Na próxima etapa você pode comparar outros valores.

**Mesmo espaço de trabalho:** `projeto`. A referência reutiliza o projeto; não cria outro arquivo por seção.

**Para avançar, conferir a estrutura:**

- Configure a área de colisão do sprite dino em Ao iniciar.

Depois, usar Play para observar o comportamento. A checagem estrutural não será apresentada como execução verificada.


## 4. Mostre sua criação

**Objetivo do professor:** Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Vídeo planejado:** `video-entrega`

Clipe de 20 a 40 segundos. Narração revisada: “Olha o que você construiu! Vamos conferir antes de enviar.” Demonstre os testes desta aula: Jogue com o raio-X para justificar sua escolha. Depois desligue o diagnóstico e confira se o jogo parece justo. Envie. Mostre o botão Enviar ao professor e a confirmação do envio.  Termine: “Depois de enviar, tem um quiz curtinho sobre o que você descobriu.”

**Zappy:** Teste o que você criou e envie ao professor. Depois vamos fechar com duas perguntas!

**Mesmo espaço de trabalho:** `projeto`. A referência reutiliza o projeto; não cria outro arquivo por seção.

**Entrega:** testar e confirmar o envio ao professor; a confirmação preserva a versão enviada e libera o quiz seguinte.


## 5. O que você descobriu?

**Objetivo do professor:** Retomar o conceito depois de explorar, criar e entregar.

**Zappy:** Você já experimentou essa ideia! Responda com calma. Se errar, veja a explicação e tente de novo.

**Quiz:** O desenho não encostou, mas a caixa de colisão encostou. O jogo…
- Pode detectar a batida pela caixa.
- Só olha os pixels do desenho.
**Explicação:** A área de colisão pode ter um tamanho diferente da imagem.

**Quiz:** Você diminui a área de 100% para 80%. O que muda?
- A cor do personagem.
- A área usada para detectar contato.
**Explicação:** A escala muda a área de colisão; use o raio-X para comparar.

**Ilustração do quiz (v5):** Contato: mesmos desenhos e posições; muda somente a área de colisão. Arte revisada incluída no manifesto e servida pela plataforma, com texto alternativo.
