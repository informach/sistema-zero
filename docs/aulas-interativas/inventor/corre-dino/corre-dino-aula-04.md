# Corre, Dino! · Aula 4 · Toque um som em cada pulo

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Dino com gravidade e três controles de pulo.
- Resultado da aula: Um efeito de pulo ligado ao evento do Dino, sem evento provisório de tecla.
- Seções: 4. Vídeos: 4.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

As duas experiências mostram espera por um evento e diferença entre tecla e pulo. A construção aplica diretamente o evento do Dino, evitando programar um som na tecla só para desfazê-lo. O resultado e o som do projeto original são preservados.

**Revisão de 02/11/2026.** As duas experiências passaram à exploração livre: o terceiro jeito, na hora em que algo acontece (a campainha, como na Nave), e o som ligado à tecla ou ao pulo (o sininho da porta da loja, que antes não tinha analogia). A montagem define evento antes de criar a área ("Um pulo é um evento, que é algo que acontece no jogo"), diz o que é a área Quando acontecer e liga cada bloco à ideia; a retomada fala do som ligado ao pulo, sem citar o rótulo antigo da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Evento | once-vs-always antes de Quando acontecer | Esperar um acontecimento é diferente de repetir sem entrada. |
| Entrada e ação do jogo | jump-sound antes do som | Comparar os contadores de teclas, pulos e sons. |

## Proposta final

### Seção 1. Uma vez, sempre ou na hora certa?

**Tarefa:** Sua vez! Investigue em que momento o som do pulo aparece em cada jeito. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-area-que-espera → fala-area-que-espera → experiencia-tres-areas.

**Recado na página (não gravar):** Sua vez! Investigue em que momento o som do pulo aparece em cada jeito. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-area-que-espera-K1: Dedé substitui “E se o som ficar esperando a tecla, ele aparece quando o jogo começa?”. Antes: “você escolhe em qual desses jeitos o som do pulo aparece. No terceiro jeito, o que acontece é alguém tocar numa tecla.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar quando o som do pulo aparece em cada”.

**Experiência em exploração livre:** `once-vs-always` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/once-vs-always.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare quando o som do pulo aparece em cada jeito, principalmente na hora em que algo acontece, com a tecla e sem a tecla. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Na hora em que algo acontece, clique em Começar o jogo e deixe o jogo terminar sem clicar em Apertar a tecla. Observe o contador de sons. Com Na hora em que algo acontece escolhido, clique em Apertar a tecla e observe o contador de sons.

**Pistas, do aberto ao direto:** 1) Observe o contador de sons e em que momento o som aparece. 2) Compare o jeito Na hora em que algo acontece com a tecla e sem a tecla. 3) Escolha Na hora em que algo acontece e clique em Começar o jogo sem clicar em mais nada. Depois clique em Apertar a tecla. Sem palpite e sem pergunta final.

### Seção 2. Som na tecla ou no pulo?

**Tarefa:** Sua vez! Investigue se o som do pulo deve ficar ligado à tecla ou ao pulo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-dedo-e-pulo → fala-dedo-e-pulo → experiencia-dedo-e-pulo.

**Recado na página (não gravar):** Sua vez! Investigue se o som do pulo deve ficar ligado à tecla ou ao pulo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-dedo-e-pulo-K1: Dedé substitui “E se o som estiver ligado à tecla, o pulo do toque também tem som?”. Antes: “No seu jogo, o Dino pode pular com a tecla e com o toque. E o som do pulo pode ficar ligado à tecla ou ao próprio pulo.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantos sons e quantos pulos acontecem”.

**Experiência em exploração livre:** `jump-sound` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/jump-sound.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/jump-sound.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare quantos sons e quantos pulos aparecem na linha do tempo com o som ligado à tecla e com o som ligado ao pulo. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com Quando a tecla Espaço é apertada, clique em Apertar Espaço duas vezes no mesmo pulo. Com Quando a tecla Espaço é apertada, clique em Tocar para pular. Clique em Quando o Dino pula. Depois clique em Apertar Espaço e, com o Dino no chão, em Tocar para pular.

**Pistas, do aberto ao direto:** 1) Em cada jeito, conte os sons e os pulos na linha do tempo. 2) Com o som ligado à tecla, compare um pulo pela tecla e um pulo pelo toque. 3) Clique em Quando a tecla Espaço é apertada, clique em Apertar Espaço duas vezes no mesmo pulo e, com o Dino no chão, em Tocar para pular. Depois clique em Quando o Dino pula e repita os dois pulos. Sem palpite e sem pergunta final.

### Seção 3. Ligue o som ao pulo do Dino

**Tarefa:** Agora ligue o som ao pulo do seu Dino! Crie a área Quando acontecer e coloque um único Tocar efeito pulo dentro de Quando o sprite pular. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-som-no-pulo → fala-som-no-pulo.

**Recado na página (não gravar):** Agora ligue o som ao pulo do seu Dino! Crie a área Quando acontecer e coloque um único Tocar efeito pulo dentro de Quando o sprite pular. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-som-no-pulo-K1: Dedé substitui “No meu jogo, o segundo toque também fez som.”. Antes: “toque não faz outro salto nem outro som, porque o som está ligado ao pulo, e não à tecla. Aí você pode me dizer:”. Depois: “Se aconteceu aí, volte aos blocos. Confira se ficou assim: o projeto tem um único Tocar efeito, com pulo, e ele está”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Coloque o Tocar efeito, com o efeito que você escolheu, dentro de Quando o dino pular.
- Mantenha apenas um Tocar efeito no projeto inteiro.
- Use o acontecimento do pulo, sem um evento separado só para a tecla.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Teste um salto com cada controle, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Teste um salto com cada controle, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Coloque o Tocar efeito, com o efeito que você escolheu, dentro de Quando o dino pular.
- Mantenha apenas um Tocar efeito no projeto inteiro.
- Use o acontecimento do pulo, sem um evento separado só para a tecla.
- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com a sua força de pulo, antes de desenhá-lo.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D → Movimento → Velocidade e gravidade |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Controlar o dinossauro , força do pulo | Jogo 2D → Kits prontos → Dino |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 4 na cadeia `corre-dino`. Entrada: etapa 3; saída: etapa 4 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
