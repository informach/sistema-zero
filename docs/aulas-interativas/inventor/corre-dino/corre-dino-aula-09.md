# Corre, Dino! · Aula 9 · Termine e recomece a corrida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Abertura e partida funcionando, sem derrota.
- Resultado da aula: Colisão com efeitos, tela de fim e reinício limpo pelo mesmo evento de entrada.
- Seções: 8. Vídeos: 7.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

O contato é observado antes de montar a colisão. Encerrar, mostrar o fim, dar retorno à batida e reiniciar têm montagens próprias. A experiência de reinício antecede o ramo de fim do evento. O quiz retoma o ciclo completo.

**Revisão de 02/11/2026.** A batida (o combinado do pega-pega, no lugar dos carrinhos de bate-bate, cujo para-choque respondia a pergunta) e o recomeço (o tabuleiro, com o toque no lugar do Enter da Nave) passaram à exploração livre. As montagens dizem os nomes de fábrica da colisão e da explosão e onde clicar, ligam cada bloco à ideia, separam os campos da tela de fim e localizam o + do senão se como na Nave. As respostas à Debinha começam pelo que ela perguntou ("A partida acaba: o estado muda para fim"; "Com um bloco que começa tudo de novo"). D2: a retomada do recomeço lembra a experiência logo antes, e o mesmo toque passa a fazer outra coisa no fim da partida, num ramo novo do Se. No quiz, "faz o quadro esperar".

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Colisão | hitbox com meta contact antes da regra | Aproximar o cacto e ver a indicação de contato. A mudança de porcentagem fica para a aula 10. |
| Estado fim | reaplica condição e tela | Distinguir encerrar a partida de mostrar sua tela. |
| Reiniciar | restart antes do ramo de fim | Comparar troca de estado com reconstrução da preparação. |

## Proposta final

### Seção 1. Quando o jogo marca a batida?

**Tarefa:** Sua vez! Investigue quando o jogo reconhece a batida entre o cacto e o Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-contato → fala-contato → experiencia-contato.

**Recado na página (não gravar):** Sua vez! Investigue quando o jogo reconhece a batida entre o cacto e o Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-contato-K1: Debinha substitui “E o jogo marca a batida quando os desenhos se encostam ou quando as áreas se encostam?”. Antes: “o que vale como pegar. No seu jogo, em volta de cada desenho tem uma área, que fica invisível durante a partida.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que se encosta, os desenhos ou as”.

**Experiência em exploração livre:** `hitbox` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/hitbox.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/hitbox.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os desenhos e as áreas pontilhadas no momento em que aparece BATEU. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Aproximar o cacto, um toque de cada vez, até aparecer BATEU. Compare os desenhos com as áreas.

**Pistas, do aberto ao direto:** 1) Olhe o retângulo pontilhado em volta do Dino e o do cacto. 2) Aproxime o cacto um toque de cada vez e pare no primeiro BATEU. 3) Clique em Aproximar o cacto até aparecer BATEU e compare os desenhos com as áreas pontilhadas. Sem palpite e sem pergunta final.

### Seção 2. Encerre a partida na batida

**Tarefa:** Agora faça a batida terminar a partida! Coloque a colisão entre o Dino e os cactos dentro do Se jogando, mudando o estado para fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-batida-acaba-partida → fala-batida-acaba-partida.

**Recado na página (não gravar):** Agora faça a batida terminar a partida! Coloque a colisão entre o Dino e os cactos dentro do Se jogando, mudando o estado para fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-batida-acaba-partida-K1: Debinha substitui “E o que vai acontecer quando ele bater?”. Antes: “de chega com inimigo. Clique em inimigo e escreva cacto. É o nome que o seu jogo vai usar para o cacto que bateu.”. Depois: “A partida acaba: o estado muda para fim, o estado de quando a partida termina. Deixe à vista o espaço vazio dentro da”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Dentro do Se o estado do jogo é jogando, entre o Desenhar o grupo e a regra que tira do grupo, confira a colisão com os cactos e use Mudar o estado do jogo para fim.

### Seção 3. Mostre a tela de fim

**Tarefa:** Agora mostre a tela de fim! Acrescente mais um senão se ao Se de A cada quadro do jogo, para o estado fim, com a tela de fim dentro dele. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-mapa-do-jogo → fala-mapa-do-jogo.

**Recado na página (não gravar):** Agora mostre a tela de fim! Acrescente mais um senão se ao Se de A cada quadro do jogo, para o estado fim, com a tela de fim dentro dele. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No segundo senão se, quando o estado do jogo é fim, desenhe a tela de fim. O título, o subtítulo e a cor do fundo são seus.

### Seção 4. Dê som e imagem à batida

**Tarefa:** Agora dê som e imagem à batida! Dentro da colisão, antes de mudar para fim, exploda o cacto, trema a tela em 8 e toque o som de derrota. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-batida-sentida → fala-batida-sentida.

**Recado na página (não gravar):** Agora dê som e imagem à batida! Dentro da colisão, antes de mudar para fim, exploda o cacto, trema a tela em 8 e toque o som de derrota. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-batida-sentida-K1: Debinha substitui “O som vem antes de mostrar a tela de fim?”. Antes: “som a um acontecimento, o pulo. Agora a gente vai fazer a mesma coisa com a batida, colocando os efeitos dentro dela.”. Depois: “Os efeitos vêm antes da mudança de estado: primeiro o jogo mostra a batida e, por último, passa para a tela de fim. Por”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Exploda o cacto que bateu antes da tremida. A cor da explosão é sua.
- Faça a tela tremer com intensidade positiva no efeito da batida.
- Toque um efeito no encerramento da partida.

### Seção 5. Voltar ou começar tudo de novo?

**Tarefa:** Sua vez! Investigue o que muda na partida nova em cada jeito de o toque recomeçar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-trocar-nao-limpa → fala-trocar-nao-limpa → experiencia-restart.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na partida nova em cada jeito de o toque recomeçar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-trocar-nao-limpa-K1: Debinha substitui “E a partida nova começa igual nos dois jeitos?”. Antes: “jogo, quando a partida acaba, o toque pode fazer duas coisas: só voltar para a tela de início, ou começar tudo de novo.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar como começa a partida nova em cada”.

**Experiência em exploração livre:** `restart` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/dino/restart.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/restart.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os cactos que ficam na pista quando o toque do fim só volta para a tela de início e quando começa tudo de novo. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Só voltar para a tela de início. Clique em Tocar na tela, deixe o tempo passar até um cacto bater e clique em Tocar na tela até começar outra partida. Observe os cactos. Escolha Começar tudo de novo. Clique em Tocar na tela, deixe o tempo passar até um cacto bater e clique em Tocar na tela até começar outra partida. Observe a pista.

**Pistas, do aberto ao direto:** 1) Observe os cactos que ficam na pista quando uma partida nova começa. 2) Compare os dois jeitos do toque no fim da partida. 3) Escolha Só voltar para a tela de início, jogue até bater e toque até começar outra partida. Depois faça o mesmo com Começar tudo de novo. Sem palpite e sem pergunta final.

### Seção 6. Prepare uma nova partida

**Tarefa:** Agora prepare uma nova partida! No evento de qualquer tecla ou toque, acrescente um senão se fim com Reiniciar o jogo. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-caminho-de-volta → fala-caminho-de-volta.

**Recado na página (não gravar):** Agora prepare uma nova partida! No evento de qualquer tecla ou toque, acrescente um senão se fim com Reiniciar o jogo. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-caminho-de-volta-K1: Debinha substitui “E como ele volta para o começo?”. Antes: “o que fica antes de senão se. O ramo novo chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira.”. Depois: “Com um bloco que começa tudo de novo, no estado fim. Deixe à vista o lugar vazio da pergunta desse ramo. Abra Jogo 2D,”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No mesmo evento de entrada, reinicie somente no senão se o estado do jogo é fim.
- Mantenha um único evento de qualquer tecla ou toque.

### Seção 7. Confira o que você construiu

**Tarefa:** Hora de lembrar o que você construiu! As perguntas falam do começo da partida, da batida e do recomeço. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam do começo da partida, da batida e do recomeço. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 8. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Jogue uma partida inteira, do começo ao recomeço, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue uma partida inteira, do começo ao recomeço, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Dentro do Se o estado do jogo é jogando, entre o Desenhar o grupo e a regra que tira do grupo, confira a colisão com os cactos e use Mudar o estado do jogo para fim.
- Mantenha uma única conferência de colisão com os cactos.
- No segundo senão se, quando o estado do jogo é fim, desenhe a tela de fim. O título, o subtítulo e a cor do fundo são seus.
- Exploda o cacto que bateu antes da tremida. A cor da explosão é sua.
- Faça a tela tremer com intensidade positiva no efeito da batida.
- Toque um efeito no encerramento da partida.
- No mesmo evento de entrada, reinicie somente no senão se o estado do jogo é fim.
- Abra o jogo no estado inicio.
- Mantenha um único evento de qualquer tecla ou toque.

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
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D → Colisões → Encostar e bloquear |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| Reiniciar o jogo | Jogo 2D → Jogo e telas → Telas e partida |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |

## Continuidade e produção

Aula 9 na cadeia `corre-dino`. Entrada: etapa 8; saída: etapa 9 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
