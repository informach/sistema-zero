# Nave Contra Asteroides · Aula 8 · Comece a partida com Enter

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.
- Resultado da aula: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício.
- Seções: 4. Vídeos: 4.

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

**Tarefa:** Compare criar asteroides fora e dentro de Se jogando, antes e depois de começar.

**Blocos na página:** video-estado-do-jogo → fala-estado-do-jogo → experiencia-estado.

**Zappy na página (não gravar):** Compare criar asteroides fora e dentro de Se jogando, antes e depois de começar.

**Experiência existente:** `game-state`. Use Tempo para soltar o tempo se estiver parado. Na abertura, deixe Criar asteroide fora de Se o estado do jogo é jogando e observe o tempo e as pedras. Mova para dentro do Se e observe de novo sem começar. Depois toque na tela para começar e compare. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Separe a abertura da partida

**Tarefa:** Leve os blocos da partida para Se jogando e crie o ramo da abertura.

**Blocos na página:** video-embrulhar → fala-embrulhar.

**Zappy na página (não gravar):** Leve os blocos da partida para Se jogando e crie o ramo da abertura.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Vá para inicio em Ao iniciar.
- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Os corações também ficam dentro de Se jogando.
- No senão se inicio, encaixe Mostrar tela com a dica de Enter.

### Seção 3. Espere a partida para criar pedras e tiros

**Tarefa:** Coloque uma condição jogando no intervalo e outra dentro da barra de espaço.

**Blocos na página:** video-relogio-e-tiro → fala-relogio-e-tiro.

**Zappy na página (não gravar):** Coloque uma condição jogando no intervalo e outra dentro da barra de espaço.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Dentro do relógio de 40 quadros, crie asteroide só se o estado do jogo é jogando.
- Não deixe outro criador de asteroides fora da condição.
- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.

### Seção 4. Use Enter para começar

**Tarefa:** Programe Enter, teste a abertura e a partida e envie.

**Blocos na página:** video-enter → fala-enter → projeto.

**Zappy na página (não gravar):** Programe Enter, teste a abertura e a partida e envie.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com envio confirmado ao professor.

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
