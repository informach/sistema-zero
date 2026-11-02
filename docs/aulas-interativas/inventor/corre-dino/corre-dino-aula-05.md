# Corre, Dino! · Aula 5 · Faça os cactos entrar na pista

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Dino pulando com som diante da floresta.
- Resultado da aula: Grupo cactos, nascimento a cada 1,4 segundo em x 560, tamanho 44 e vx -5; movimento e desenho em cada quadro.
- Seções: 6. Vídeos: 6.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

O intervalo e a direção da velocidade são observados antes dos blocos. Grupo e relógio são preparados numa seção; criação e depois atualização e desenho têm montagens próprias. A avalanche fica na experiência, sem exigir montar e desmontar uma regra errada no projeto.

**Revisão de 02/11/2026.** O intervalo entre cactos (a torneira) e a direção da velocidade (os passos na sala) passaram à exploração livre; é aqui que o sinal de menos entra como direção, antes da régua dos negativos (Aula 12). As montagens definem grupo antes de usá-lo, ligam o relógio ao bloco A cada 2 segundos ("É este bloco… que faz o papel do relógio"), dizem o nome de fábrica (asteroides, obstaculos) e onde clicar, dão o porquê do x 560 antes da troca e um campo por fala, e corrigem o decimal ("1.4, com ponto: é quase um segundo e meio"). A retomada da criação dos cactos só lembra a experiência (o relógio vazio não mostra nada no jogo), e o teste do pulo veio antes da conferência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Grupo e intervalo | spawn antes da criação | Ver vários objetos nascerem com uma regra comum e comparar os ritmos. |
| Velocidade e sinal | velocity antes de vx -5 | Relacionar o número à mudança do x. |
| Nascer fora da tela | retoma coordenadas e tamanho | 560 fica além da largura 480; o nascimento entra depois pelo movimento. |

## Proposta final

### Seção 1. Todo quadro ou de tempos em tempos?

**Tarefa:** Sua vez! Descubra o que muda na fila de cactos com e sem uma espera entre eles. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-espaco-e-tempo → fala-espaco-e-tempo → experiencia-ritmo.

**Recado na página (não gravar):** Sua vez! Descubra o que muda na fila de cactos com e sem uma espera entre eles. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-espaco-e-tempo-K1: Debinha substitui “E se nascer um cacto em todo quadro, o Dino consegue pular?”. Antes: “um cacto novo em todo quadro, ou esperar um tempo entre um cacto e outro, como um relógio que toca de tempos em tempos.”. Depois: “O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, estes botões escolhem quando nasce”.

**Experiência em exploração livre:** `spawn` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/dino/spawn.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/spawn.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os cactos quando nasce um cacto novo em todo quadro e quando cada cacto espera um tempo no relógio para nascer. Você escolhe a ordem dos testes e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Em todo quadro, clique em Passar 1 segundo e observe os cactos e quantos nasceram. Escolha A cada 1,4 segundo e clique em Passar 1 segundo até nascerem dois cactos. Observe onde cada um aparece.

**Pistas, do aberto ao direto:** 1) Observe quantos cactos nascem e o espaço entre eles. 2) Compare os cactos que nascem em todo quadro com os que esperam no relógio. 3) Escolha Em todo quadro e clique em Passar 1 segundo. Depois escolha A cada 1,4 segundo e clique em Passar 1 segundo até nascerem dois cactos. Sem palpite e sem pergunta final.

### Seção 2. Prepare o grupo e o relógio

**Tarefa:** Agora prepare o grupo e o relógio dos cactos! Crie o grupo cactos em Ao iniciar e um relógio de 1.4 segundo, fora de A cada quadro do jogo. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-grupo-e-relogio → fala-grupo-e-relogio.

**Recado na página (não gravar):** Agora prepare o grupo e o relógio dos cactos! Crie o grupo cactos em Ao iniciar e um relógio de 1.4 segundo, fora de A cada quadro do jogo. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-grupo-e-relogio-K1: Debinha substitui “E como eu faço aparecer um cacto de cada vez?”. Antes: “Clique em asteroides, troque por cactos e clique fora do campo. É este bloco que cria a lista dos cactos, ainda vazia.”. Depois: “Com um relógio, que cria um cacto de tempos em tempos. O relógio fica em Enquanto estiver rodando, mas fora de A cada”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Crie o grupo cactos em Ao iniciar.
- Prepare um relógio com intervalo positivo em Enquanto estiver rodando.

### Seção 3. Para que lado anda o cacto?

**Tarefa:** Sua vez! Descubra o que o número da velocidade faz com o cacto e com o x. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-numero-negativo → fala-numero-negativo → experiencia-velocidade.

**Recado na página (não gravar):** Sua vez! Descubra o que o número da velocidade faz com o cacto e com o x. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-numero-negativo-K1: Debinha substitui “E com um número negativo, o cacto vai para onde?”. Antes: “quadro, e para que lado. E a velocidade pode ser um número positivo, um número negativo, com o sinal de menos, ou zero.”. Depois: “O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, estes números escolhem a velocidade”.

**Experiência em exploração livre:** `velocity` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/dino/velocity.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/velocity.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare para que lado o cacto anda e o que acontece com o x com a velocidade para o lado em 5, em −5 e em 0. Você escolhe a ordem dos testes e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha 5 e clique em Avançar 1 quadro três vezes. Observe o cacto e o x. Escolha −5 e clique em Avançar 1 quadro três vezes. Observe o cacto e o x. Depois de ver o cacto andar, escolha 0 e clique em Avançar 1 quadro. Observe o x.

**Pistas, do aberto ao direto:** 1) Observe o número do x em cada quadro. 2) Compare o cacto e o x com um número positivo, com um negativo e com zero. 3) Escolha 5 e clique em Avançar 1 quadro três vezes. Depois escolha −5 e avance três quadros. Por último, escolha 0 e avance. Sem palpite e sem pergunta final.

### Seção 4. Crie os cactos no relógio

**Tarefa:** Agora crie os cactos no relógio! Coloque No grupo criar obstáculo dentro do relógio, com x 560, vx -5 e tamanho 44. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-criar-cactos → fala-criar-cactos.

**Recado na página (não gravar):** Agora crie os cactos no relógio! Coloque No grupo criar obstáculo dentro do relógio, com x 560, vx -5 e tamanho 44. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Crie obstáculos no grupo cactos, pela direita e indo para a esquerda, em um relógio.
- Deixe a criação fora de A cada quadro.
- Mantenha apenas um bloco de criação de cacto.

### Seção 5. Mova e mostre o grupo de cactos

**Tarefa:** Agora faça os cactos aparecerem e andarem! Coloque Mover os sprites do grupo e Desenhar o grupo depois do desenho do Dino, a cada quadro. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-mover-e-desenhar → fala-mover-e-desenhar.

**Recado na página (não gravar):** Agora faça os cactos aparecerem e andarem! Coloque Mover os sprites do grupo e Desenhar o grupo depois do desenho do Dino, a cada quadro. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-mover-e-desenhar-K1: Debinha substitui “O cacto passou pelo Dino. Por que a partida não terminou?”. Antes: “cactos nascerem. Olha só: eles entram pela direita e passam para a esquerda! Pule um deles para testar o controle.”. Depois: “Porque a batida ainda não foi programada. Isso vem daqui a algumas aulas. Se no seu jogo não aconteceu isso, volte aos”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Atualize o grupo cactos a cada quadro, antes de desenhá-lo.
- Desenhe o grupo cactos a cada quadro.
- Desenhe o Dino antes de atualizar e desenhar os cactos.

### Seção 6. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Espere os cactos entrarem, pule um deles, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Espere os cactos entrarem, pule um deles, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Crie o grupo cactos em Ao iniciar.
- Crie obstáculos no grupo cactos, pela direita e indo para a esquerda, em um relógio.
- Atualize o grupo cactos a cada quadro, antes de desenhá-lo.
- Desenhe o grupo cactos a cada quadro.
- Mantenha apenas um bloco de criação de cacto.
- Desenhe a floresta em movimento antes do Dino.
- Desenhe o Dino antes de atualizar e desenhar os cactos.
- Deixe a criação fora de A cada quadro.

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
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 5 na cadeia `corre-dino`. Entrada: etapa 4; saída: etapa 5 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
