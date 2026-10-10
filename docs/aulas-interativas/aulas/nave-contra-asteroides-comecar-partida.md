# Nave Contra Asteroides · Aula 8 · Comece a partida com Enter

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.
- Resultado da aula: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício.
- Seções: 4. Vídeos: 4.

**Vozes e edição:** Professora conduz; Dedé é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

## Diagnóstico e decisão

Constrói primeiro um ciclo parcial que já pode ser testado: abertura e partida. Os finais ficam para a aula seguinte.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Estado e condição | game-state antes de envolver o jogo | O intervalo pode continuar contando sem criar asteroides fora da partida. |
| Se e senão se | Duas telas na mesma montagem | Condição escolhe entre mostrar a partida e mostrar a abertura. |
| Evento com condição | Enter inicia somente em inicio | A mesma tecla será ampliada com outras respostas na aula seguinte. |

## Proposta final

### Seção 1. Escolha quando o jogo pode agir

**Tarefa:** Sua vez! Compare Criar asteroide fora e dentro de Se jogando, antes e depois de começar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-estado-do-jogo → fala-estado-do-jogo → experiencia-estado.

**Zappy na página (não gravar):** Sua vez! Compare Criar asteroide fora e dentro de Se jogando, antes e depois de começar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** ID video-estado-do-jogo-avatar-01. Professora até “todo mundo espera o sinal de largada, e ninguém sai correndo antes.”. Antes da entrada: Deixar passar quatro segundos na abertura, com a peça dentro do Se e o contador esperando. Dedé entra, com os gestos parados, e fala: “Agora as pedras estão esperando a partida!”. Dedé sai antes da resposta. Retomada da professora: “Isso. Vamos começar para ver o que muda. Por último, eu clico em Toque para começar, na tela da experiência. Olha só: o estado vira jogando, e as pedras voltam a nascer. Aqui, o começo por toque já veio pronto, mas, no seu jogo, você vai programar o Enter para começar a partida.”. Na retomada: Começar por toque na experiência e distinguir esse começo pronto do Enter que será programado no projeto. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

**Experiência existente:** `game-state`. Use Tempo para soltar o tempo se estiver parado. Na abertura, deixe Criar asteroide fora de Se o estado do jogo é jogando e observe o tempo e as pedras. Mova para dentro do Se e observe de novo sem começar. Depois toque na tela para começar e compare. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Separe a abertura da partida

**Tarefa:** Agora separe a abertura da partida! Leve os blocos da partida para dentro de Se jogando, crie o ramo da abertura e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-embrulhar → fala-embrulhar.

**Zappy na página (não gravar):** Agora separe a abertura da partida! Leve os blocos da partida para dentro de Se jogando, crie o ramo da abertura e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Vá para inicio em Ao iniciar.
- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Os corações também ficam dentro de Se jogando.
- No senão se inicio, encaixe Mostrar tela com a dica de Enter.

### Seção 3. Espere a partida para criar pedras e tiros

**Tarefa:** Agora faça as pedras e os tiros esperarem a partida! Coloque a pergunta jogando no relógio e na barra de espaço e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-relogio-e-tiro → fala-relogio-e-tiro.

**Zappy na página (não gravar):** Agora faça as pedras e os tiros esperarem a partida! Coloque a pergunta jogando no relógio e na barra de espaço e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** ID video-relogio-e-tiro-avatar-01. Professora até “porque o Se responde não enquanto o jogo está em inicio.”. Antes da entrada: Concluir a montagem e o teste sem som na abertura, sem concluir nada pela ausência de pedras na imagem. Dedé entra, com os gestos parados, e fala: “E como eu confiro se as pedras também esperam?”. Dedé sai antes da resposta. Retomada da professora: “Para isso, a gente precisa olhar os blocos. Já as pedras ficam escondidas atrás da tela de abertura, e olhar a imagem não prova nada sobre elas. Por isso, volte aos blocos e confira se ficou assim: dentro de A cada 40 quadros está o Se jogando, com o criador de asteroides no então. E, dentro do evento da barra de espaço, está outro Se jogando, com Criar tiro e Tocar efeito no então.”. Na retomada: Voltar aos blocos e conferir o Se jogando no relógio e no evento da barra de espaço. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Dentro do relógio de 40 quadros, crie asteroide só se o estado do jogo é jogando.
- Não deixe outro criador de asteroides fora da condição.
- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.

### Seção 4. Use Enter para começar

**Tarefa:** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Blocos na página:** video-enter → fala-enter → projeto.

**Zappy na página (não gravar):** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Vá para inicio em Ao iniciar.
- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Os corações também ficam dentro de Se jogando.
- Dentro do relógio de 40 quadros, crie asteroide só se o estado do jogo é jogando.
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
