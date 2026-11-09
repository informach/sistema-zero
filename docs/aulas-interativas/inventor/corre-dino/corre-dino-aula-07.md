# Corre, Dino! · Aula 7 · Separe a abertura da partida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: A corrida começa assim que o projeto carrega.
- Resultado da aula: Estado inicial inicio; movimento, desenho do Dino e cactos, limpeza e nascimento protegidos por jogando.
- Seções: 5. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A experiência antecede a criação do estado. A montagem separa as regras de cada quadro do relógio de nascimento e testa jogando antes de devolver inicio. Esta aula entrega a espera; a interface de começo é construída na aula seguinte.

**Revisão de 02/11/2026.** D1 (decisão da coordenação, 02/11/2026): saiu a troca temporária do estado para jogando nas partes 3, 4 e 5, o "troque e volte" que a §2 já tinha retirado; a montagem tem um caminho só, e o jogo termina a aula esperando em inicio (a partida começa na Aula 8). A experiência passou à exploração livre com a porta que só abre com a chave, como na Nave. A montagem define estado do jogo, dá o porquê antes do gesto (a limpeza e a floresta também passam na tela de início), explica o Se e o então e liga cada bloco à ideia; o relógio diz por que a pergunta do quadro não vale para ele, sem o duplo sentido de "quadro", e confere sem teste, porque o efeito ainda não aparece no jogo.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Estado e condição | game-state antes dos ramos | Comparar ações fora e dentro de Se jogando, na abertura e durante a partida. |
| Relógios independentes | segunda montagem retoma a mesma experiência | Guardar ações do quadro não move o relógio de nascimento. |

## Proposta final

### Seção 1. A partida já começou?

**Tarefa:** Sua vez! Investigue o que muda quando o jogo pergunta se a partida já começou. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-condicao → fala-condicao → experiencia-condicao.

**Recado na página (não gravar):** Sua vez! Investigue o que muda quando o jogo pergunta se a partida já começou. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-condicao-K1: Debinha substitui “E na tela de início, os cactos nascem?”. Antes: “cada vez que o relógio dos cactos toca, o jogo pode fazer uma pergunta antes de criar um cacto: a partida já começou?”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantos cactos nascem sem a pergunta e”.

**Experiência em exploração livre:** `game-state` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/dino/game-state.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o contador de cactos com a pergunta desligada e ligada, na tela de início e depois de a partida começar. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com a pergunta desligada, clique em Deixar o tempo passar na tela de início e observe o contador. Clique em Ligar a pergunta e deixe o tempo passar uns 3 segundos na tela de início. Observe o contador. Com a pergunta ligada, clique em Começar a partida, deixe o tempo passar e observe o contador.

**Pistas, do aberto ao direto:** 1) Observe o contador de cactos criados enquanto o tempo passa. 2) Compare a tela de início com a pergunta desligada e ligada. E depois de a partida começar? 3) Deixe o tempo passar na tela de início. Depois clique em Ligar a pergunta e deixe o tempo passar uns 3 segundos. Por último, clique em Começar a partida e deixe o tempo passar. Sem palpite e sem pergunta final.

### Seção 2. Guarde em que momento o jogo está

**Tarefa:** Agora guarde em que momento o seu jogo está! Coloque Mudar o estado do jogo para inicio no fim de Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-estado-inicio → fala-estado-inicio.

**Recado na página (não gravar):** Agora guarde em que momento o seu jogo está! Coloque Mudar o estado do jogo para inicio no fim de Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-estado-inicio-K1: Debinha substitui “O jogo já vai esperar para começar?”. Antes: “de Ao iniciar. Ele já chega com inicio: mantenha. É este bloco que diz em que estado o jogo começa: na tela de início.”. Depois: “Ainda não: falta fazer o jogo perguntar por esse estado. Confira se ficou assim: no fim de Ao iniciar, está Mudar o”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No Ao iniciar, coloque Mudar o estado do jogo para inicio.

### Seção 3. Faça a partida esperar

**Tarefa:** Agora faça a partida esperar! Coloque as ações da partida num Se o estado do jogo é jogando, logo depois da floresta, e deixe o estado em inicio. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-embrulhar → fala-embrulhar.

**Recado na página (não gravar):** Agora faça a partida esperar! Coloque as ações da partida num Se o estado do jogo é jogando, logo depois da floresta, e deixe o estado em inicio. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Aplicar a gravidade fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Controlar o dinossauro fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o sprite do dino fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Mover os sprites do grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- A regra que tira do grupo quem saiu da tela fica por último dentro do então.
- Limpar a tela continua fora do Se, direto no A cada quadro do jogo.
- Desenhar fundo de floresta continua fora do Se, logo acima dele.
- No Ao iniciar, coloque Mudar o estado do jogo para inicio.

### Seção 4. Faça o relógio esperar a partida

**Tarefa:** Agora faça o relógio esperar a partida! Coloque a criação dos cactos num Se jogando, dentro do relógio, e termine com inicio em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-relogio → fala-relogio.

**Recado na página (não gravar):** Agora faça o relógio esperar a partida! Coloque a criação dos cactos num Se jogando, dentro do relógio, e termine com inicio em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No relógio dos cactos, crie os obstáculos somente dentro de Se jogando.
- No Ao iniciar, coloque Mudar o estado do jogo para inicio.

### Seção 5. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Confira as duas perguntas de jogando e o estado em inicio, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Confira as duas perguntas de jogando e o estado em inicio, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- No Ao iniciar, coloque Mudar o estado do jogo para inicio.
- Aplicar a gravidade fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Controlar o dinossauro fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o sprite do dino fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Mover os sprites do grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- A regra que tira do grupo quem saiu da tela fica por último dentro do então.
- Mantenha uma única ação Aplicar a gravidade.
- Mantenha uma única ação Controlar o dinossauro.
- Mantenha um único Desenhar o sprite do dino.
- Mantenha um único Mover os sprites do grupo.
- Mantenha um único Desenhar o grupo.
- Mantenha uma única regra que tira do grupo quem saiu da tela.
- Limpar a tela continua fora do Se, direto no A cada quadro do jogo.
- Desenhar fundo de floresta continua fora do Se, logo acima dele.
- No relógio dos cactos, crie os obstáculos somente dentro de Se jogando.
- Mantenha um único No grupo criar obstáculo.

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
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 7 na cadeia `corre-dino`. Entrada: etapa 6; saída: etapa 7 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
