# Nave Contra Asteroides · Aula 8 · Comece a partida com Enter

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.
- Resultado da aula: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício.
- Seções: 5. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Constrói primeiro um ciclo parcial que já pode ser testado: abertura e partida. Os finais ficam para a aula seguinte.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. A montagem do embrulho (699 palavras) virou duas: embrulhar (o estado inicio e a partida dentro de Se jogando) e abertura (id novo: o senão se inicio com a tela de abertura). O vídeo de cada experiência segue o molde do Cadê (02/11/2026, decisão da responsável): o conceito, uma analogia curta, o nome no jogo dela, a pergunta do avatar devolvida à criança e um convite de uma frase; sem tour pelos controles nem roteiro de testes, que ficam com o Zappy dentro da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Estado e condição | game-state antes de envolver o jogo | O intervalo pode continuar contando sem criar asteroides fora da partida. |
| Se e senão se | Duas telas na mesma montagem | Condição escolhe entre mostrar a partida e mostrar a abertura. |
| Evento com condição | Enter inicia somente em inicio | A mesma tecla será ampliada com outras respostas na aula seguinte. |

## Proposta final

### Seção 1. A partida já começou?

**Tarefa:** Sua vez! Investigue o que muda quando o jogo pergunta se a partida já começou. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-estado-do-jogo → fala-estado-do-jogo → experiencia-estado.

**Recado na página (não gravar):** Sua vez! Investigue o que muda quando o jogo pergunta se a partida já começou. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-estado-do-jogo-K1: Dedé substitui “E na tela de início, as pedras nascem?”. Antes: “que chega a hora de nascer uma pedra nova, o jogo pode fazer uma pergunta antes de criar a pedra: a partida já começou?”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantos asteroides o jogo cria, com e”.

**Experiência em exploração livre:** `game-state` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/game-state.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/game-state.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o contador de asteroides com a pergunta desligada e ligada, na tela de início e depois de a partida começar. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com a pergunta desligada, clique em Deixar o tempo passar na tela de início e observe o contador. Clique em Ligar a pergunta e deixe o tempo passar uns 4 segundos na tela de início. Observe o contador. Com a pergunta ligada, clique em Começar a partida, deixe o tempo passar e observe o contador.

**Pistas, do aberto ao direto:** 1) Observe o contador de asteroides criados enquanto o tempo passa. 2) Compare a tela de início com a pergunta desligada e ligada. E depois de a partida começar? 3) Deixe o tempo passar na tela de início. Depois clique em Ligar a pergunta e deixe o tempo passar uns 4 segundos. Por último, clique em Começar a partida e deixe o tempo passar. Sem palpite e sem pergunta final.

### Seção 2. Faça a partida esperar

**Tarefa:** Agora faça a partida esperar! Comece o jogo em inicio, leve os blocos da partida para dentro de Se jogando e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-embrulhar → fala-embrulhar.

**Recado na página (não gravar):** Agora faça a partida esperar! Comece o jogo em inicio, leve os blocos da partida para dentro de Se jogando e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-embrulhar-K1: Dedé substitui “E como o jogo sabe que deve começar na tela de início?”. Antes: “momentos, cada um com um nome: inicio, a tela de abertura, e jogando, a partida. Esse momento se chama estado do jogo.”. Depois: “O jogo começa no estado inicio, e isso acontece uma vez, quando ele abre. Por isso, o bloco do estado vai no fim de Ao”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Vá para inicio em Ao iniciar.
- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Mostre as vidas da nave dentro de Se jogando.

### Seção 3. Mostre a tela de abertura

**Tarefa:** Agora mostre a tela de abertura! Crie o ramo de inicio no Se, coloque a tela com a dica do Enter e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-tela-de-abertura → fala-abertura.

**Recado na página (não gravar):** Agora mostre a tela de abertura! Crie o ramo de inicio no Se, coloque a tela com a dica do Enter e clique em Verificar projeto. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No senão se inicio, encaixe Mostrar tela com a dica de Enter.

### Seção 4. Espere a partida para criar pedras e tiros

**Tarefa:** Agora faça as pedras e os tiros esperarem a partida! Coloque a pergunta jogando no relógio das pedras e na barra de espaço e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-relogio-e-tiro → fala-relogio-e-tiro.

**Recado na página (não gravar):** Agora faça as pedras e os tiros esperarem a partida! Coloque a pergunta jogando no relógio das pedras e na barra de espaço e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-relogio-e-tiro-K1: Dedé substitui “Qual pergunta vai aqui?”. Antes: “o bloco Se e solte dentro dele. Ele chega de novo com a pergunta x maior que 0: arraste essa pergunta para a lixeira.”. Depois: “A mesma da partida. Deixe à vista o lugar vazio ao lado de Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e”.

video-relogio-e-tiro-K2: Dedé substitui “E como eu confiro se as pedras também esperam?”. Antes: “abertura na tela. Escute: não sai mais som de tiro, porque a resposta da pergunta é não enquanto o jogo está em inicio.”. Depois: “Para isso, a gente precisa olhar os blocos. As pedras ficam escondidas atrás da tela de abertura, e olhar a imagem não”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No relógio de intervalo positivo, crie asteroides somente se o estado é jogando.
- Não deixe outro criador de asteroides fora da condição.
- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.

### Seção 5. Use Enter para começar

**Tarefa:** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Blocos na página:** video-enter → fala-enter → projeto.

**Recado na página (não gravar):** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-enter-K1: Dedé substitui “Mas só pode começar se estiver na abertura, né?”. Antes: “e solte abaixo do evento inteiro da barra de espaço, sem encaixar dentro dele. No menu da tecla, escolha Enter.”. Depois: “Isso! O Enter só pode começar a partida na tela de início. Por isso, dentro desse evento vai um Se. Deixe à vista o”.

video-enter-K2: Dedé substitui “E se eu tocar em Enter no meio da partida?”. Antes: “e a partida começa! Mova a nave, atire e confira se as pedras caem, se os pontos contam e se as batidas tiram vidas.”. Depois: “Agora toque em Enter durante a partida. Repare: ela continua, sem recomeçar, porque o Se do Enter só muda o estado”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Vá para inicio em Ao iniciar.
- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Mostre as vidas da nave dentro de Se jogando.
- No relógio de intervalo positivo, crie asteroides somente se o estado é jogando.
- Não deixe outro criador de asteroides fora da condição.
- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.
- No senão se inicio, encaixe Mostrar tela com a dica de Enter.
- No evento Enter, se o estado é inicio, mude para jogando.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Mover o sprite com as setas <- -> (velocidade ) | Jogo 2D → Movimento → Movimentos prontos |
| o centro x do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Manter o sprite dentro da tela | Jogo 2D → Movimento → Bordas e rebatidas |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Criar grupo de sprites | Jogo 2D → Grupos → Criar e percorrer |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D → Kits prontos → Espaço |
| Machucar o sprite em e deixá-lo invencível por quadros | Jogo 2D → Vida e placar → Vida |
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Desenhar as vidas do sprite como em x y tamanho cor | Jogo 2D → Vida e placar → Vida |
| A cada quadros | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Para cada colisão entre os grupos e | Jogo 2D → Colisões → Encostar e bloquear |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D → Colisões → Encostar e bloquear |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um x aleatório na tela | Jogo 2D → Sorteios → Números e posições |
| Tirar o sprite do grupo | Jogo 2D → Grupos → Participação e limpeza |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Dar ao sprite de vida | Jogo 2D → Vida e placar → Vida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D → Kits prontos → Espaço |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 8 na cadeia `nave-contra-asteroides`. Entrada: etapa 7; saída: etapa 8 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
