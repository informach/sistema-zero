# Corre, Dino! · Aula 8 · Comece por tecla ou toque

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Jogo esperando no estado inicio, com a floresta visível.
- Resultado da aula: Tela de início e um evento de qualquer tecla ou toque que muda inicio para jogando.
- Seções: 4. Vídeos: 4.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A condição da aula anterior é reaplicada ao ramo inicio. A experiência de controles vem antes do evento, e o evento final é montado diretamente. O convite escrito e os controles aceitos terminam coerentes.

**Revisão de 02/11/2026.** D2 (variante leve, decisão da coordenação de 02/11/2026): sem seção nem cena nova. A tela de início abre retomando a experiência da Aula 7 (na tela de início, a pergunta respondia não, e nada acontecia), explica o senão se como a segunda pergunta e o que é um ramo, e a ordem das perguntas com o controle remoto: de cima para baixo, até a primeira que responde sim. O + do senão se é localizado como na Nave, e cada campo da tela vem numa fala. A experiência de começar a partida passou à exploração livre com a visita que toca a campainha ou bate na porta. A resposta ao Dedé começa pelo que ele perguntou, e o bloco que muda o estado ganhou "É este bloco que começa a partida".

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Ramos da condição | retoma o Se da aula 7 | Mostrar uma tela no estado inicio, sem executar a partida. |
| Entrada ampla | controls antes do evento | Testar tecla e toque e comparar qual evento responde. |

## Proposta final

### Seção 1. Desenhe a tela de início

**Tarefa:** Agora desenhe a tela de início do seu jogo! Acrescente um senão se inicio ao Se de A cada quadro do jogo, com o título e o convite para começar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-menu → fala-menu.

**Recado na página (não gravar):** Agora desenhe a tela de início do seu jogo! Acrescente um senão se inicio ao Se de A cada quadro do jogo, com o título e o convite para começar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No senão se o estado do jogo é inicio, mostre a tela de início com a dica dos dois jeitos.

### Seção 2. O que começa a partida?

**Tarefa:** Sua vez! Descubra o que pode começar a partida em cada jeito de escutar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-convite → fala-convite → experiencia-convite.

**Recado na página (não gravar):** Sua vez! Descubra o que pode começar a partida em cada jeito de escutar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-convite-K1: Dedé substitui “E se o jogo só escutar o teclado, quem joga no celular consegue começar?”. Antes: “o teclado, ou só o dedo, no celular. E a tela de início pode escutar só uma tecla, ou qualquer tecla e também um toque.”. Depois: “O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, você escolhe o que o jogo escuta”.

**Experiência em exploração livre:** `controls` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/controls.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/controls.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Para começar a partida, o jogo pode escutar só o Enter, ou qualquer tecla ou toque. Teste o toque e o Enter nos dois jeitos e compare o que começa a partida. Você escolhe a ordem dos testes e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com Só o Enter escolhido, clique em Tocar na tela. Na tela de início, clique em Apertar Enter. Clique em Qualquer tecla ou toque e, na tela de início, em Tocar na tela.

**Pistas, do aberto ao direto:** 1) Toque na tela de início e observe se a partida começa. 2) Compare os dois jeitos de escutar: só o Enter, ou qualquer tecla ou toque. 3) Clique em Só o Enter e em Tocar na tela; depois clique em Voltar à tela de início, em Qualquer tecla ou toque e em Tocar na tela de novo. Sem palpite e sem pergunta final.

### Seção 3. Ligue a entrada ao início da partida

**Tarefa:** Agora faça a partida começar! Crie o evento de qualquer tecla ou toque, com um Se inicio que muda o estado para jogando. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-entrada-ampla → fala-entrada-ampla.

**Recado na página (não gravar):** Agora faça a partida começar! Crie o evento de qualquer tecla ou toque, com um Se inicio que muda o estado para jogando. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-entrada-ampla-K1: Dedé substitui “E a tecla do pulo, vai começar a partida de novo?”. Antes: “qualquer tecla ou tocar na tela e solte nesse espaço. É este bloco que escuta qualquer tecla e também o toque na tela.”. Depois: “Não, se o evento perguntar antes. É que esse evento também acontece no meio da partida, a cada pulo. Por isso, ele”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Qualquer tecla ou toque começa a partida somente quando o estado do jogo é inicio.
- Use a entrada de qualquer tecla ou toque, sem um evento separado só para Enter.
- A dica da tela de início passa a descrever os dois jeitos de começar.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Comece a partida por tecla e por toque, desde a abertura, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Comece a partida por tecla e por toque, desde a abertura, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- No Ao iniciar, o jogo continua abrindo com Mudar o estado do jogo para inicio.
- No senão se o estado do jogo é inicio, mostre a tela de início com a dica dos dois jeitos.
- Qualquer tecla ou toque começa a partida somente quando o estado do jogo é inicio.
- Use a entrada de qualquer tecla ou toque, sem um evento separado só para Enter.
- No relógio dos cactos, crie os obstáculos somente dentro de Se jogando.

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
| Criar grupo de sprites | Jogo 2D → Grupos → Criar e percorrer |
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |

## Continuidade e produção

Aula 8 na cadeia `corre-dino`. Entrada: etapa 7; saída: etapa 8 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
