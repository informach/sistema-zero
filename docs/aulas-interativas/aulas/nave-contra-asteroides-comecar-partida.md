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

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-estado-do-jogo-avatar-01. Professora até “todo mundo espera o sinal de largada, e ninguém sai correndo antes.”. Antes: Deixar passar quatro segundos na abertura, com a peça dentro do Se e o contador esperando. Dedé: “Agora as pedras estão esperando a partida!”. Retomada da professora: “Isso. Vamos começar para ver o que muda. Por último, eu clico em Toque para começar, na tela da experiência.”. Depois: Começar por toque na experiência e distinguir esse começo pronto do Enter que será programado no projeto.

**Experiência existente:** `game-state`. Use Tempo para soltar o tempo se estiver parado. Na abertura, deixe Criar asteroide fora de Se o estado do jogo é jogando e observe o tempo e as pedras. Mova para dentro do Se e observe de novo sem começar. Depois toque na tela para começar e compare. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Separe a abertura da partida

**Tarefa:** Agora separe a abertura da partida! Leve os blocos da partida para dentro de Se jogando, crie o ramo da abertura e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-embrulhar → fala-embrulhar.

**Zappy na página (não gravar):** Agora separe a abertura da partida! Leve os blocos da partida para dentro de Se jogando, crie o ramo da abertura e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-embrulhar-avatar-01. Professora até “Não apague nem crie cópias, porque daqui a pouco essa sequência volta inteira para dentro do Se.”. Antes: Parar com a sequência inteira solta fora de A cada quadro do jogo. Dedé: “A sequência saiu inteira, sem apagar nada!”. Retomada da professora: “Agora deixe à vista o espaço de dentro de A cada quadro do jogo, que ficou vazio.”. Depois: Depois da saída, mostrar A cada quadro do jogo vazio.

ID video-embrulhar-avatar-02. Professora até “Assim, o Se pergunta se a partida já começou.”. Antes: Parar com jogando escolhido ao lado de Se. Dedé: “Posso ficar na abertura sem perder uma vida!”. Retomada da professora: “Agora devolva a sequência para dentro do Se: deixe à vista o espaço do então, pegue a sequência pelo primeiro bloco, Limpar a tela, e solte dentro do então.”. Depois: Depois da saída, devolver a sequência ao então junto da fala.

ID video-embrulhar-avatar-03. Professora até “pegue outro o estado do jogo é, solte nesse lugar e deixe inicio no menu.”. Antes: Parar com inicio ao lado de senão se. Dedé: “Quem chegar ao meu jogo vai ver essa tela primeiro!”. Retomada da professora: “Deixe à vista o espaço do então desse senão se.”. Depois: Depois da saída, mostrar o espaço do então desse senão se.

ID video-embrulhar-avatar-04. Professora até “O fundo já vem escuro, e o texto aparece bem nele: é só manter.”. Antes: Parar com Mostrar tela preenchido à vista. Dedé: “E como o jogo começa nessa tela?”. Retomada da professora: “Falta dizer em que estado o jogo começa, e isso acontece uma vez, no fim de Ao iniciar: deixe esse lugar à vista.”. Depois: Depois da saída, mostrar o fim de Ao iniciar.

ID video-embrulhar-avatar-05. Professora até “Olha só: a abertura aparece!”. Antes: Manter a abertura real à vista. A tecla Enter ainda não inicia a partida nesta parte. Dedé: “A abertura apareceu!”. Retomada da professora: “Isso acontece porque o jogo começa em inicio, e o ramo de inicio mostra a tela.”. Depois: Depois da saída, seguir para a conferência dos blocos.

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

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-relogio-e-tiro-avatar-01. Professora até “Deixe à vista o espaço de dentro de A cada 40 quadros, que ficou vazio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte dentro do relógio. Ele chega de novo com a pergunta x maior que 0: arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de Se.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Qual pergunta vai dentro desse relógio?”. Retomada da professora: “Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha jogando.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-relogio-e-tiro-avatar-02. Professora até “Agora os tiros. Encontre o evento da barra de espaço, em Quando acontecer, e deixe à vista um espaço livre perto dele. Pegue a sequência pelo primeiro bloco, Criar tiro, e solte nesse espaço por enquanto. Tocar efeito vai junto, porque está encaixado logo abaixo.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Assim não vai ter barulho de tiro antes de começar!”. Retomada da professora: “Deixe à vista o espaço de dentro do evento da barra de espaço, que ficou vazio.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-relogio-e-tiro-avatar-03. Professora até “porque o Se responde não enquanto o jogo está em inicio.”. Antes: Concluir a montagem e o teste sem som na abertura, sem concluir nada pela ausência de pedras na imagem. Dedé: “E como eu confiro se as pedras também esperam?”. Retomada da professora: “Para isso, a gente precisa olhar os blocos. Já as pedras ficam escondidas atrás da tela de abertura, e olhar a imagem não prova nada sobre elas.”. Depois: Voltar aos blocos e conferir o Se jogando no relógio e no evento da barra de espaço.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Dentro do relógio de 40 quadros, crie asteroide só se o estado do jogo é jogando.
- Não deixe outro criador de asteroides fora da condição.
- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.

### Seção 4. Use Enter para começar

**Tarefa:** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Blocos na página:** video-enter → fala-enter → projeto.

**Zappy na página (não gravar):** Agora faça o Enter começar a partida! Programe o evento Enter, teste a abertura e a partida, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-enter-avatar-01. Professora até “Agora abra Jogo 2D, depois Controles e depois Teclado, ações e toque, e pegue o bloco Quando apertar a tecla. Arraste para dentro de Quando acontecer e solte abaixo do evento inteiro da barra de espaço, sem encaixar dentro dele. No menu da tecla, escolha Enter.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Mas só pode começar se estiver na abertura, né?”. Retomada da professora: “O Enter só pode começar a partida quando o jogo está na abertura, por isso dentro desse evento vai um Se.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-enter-avatar-02. Professora até “Deixe à vista o espaço do então desse Se. Na mesma categoria Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha jogando. Assim, o Enter começa a partida só quando o jogo está na abertura.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Vou testar o Enter!”. Retomada da professora: “Agora teste: clique na área do jogo e toque em Enter.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-enter-avatar-03. Professora até “Agora teste: clique na área do jogo e toque em Enter. Olha só: a abertura some e a partida começa! Mova a nave, atire e confira se as pedras caem, se os pontos contam e se as batidas tiram vidas.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “E se eu tocar em Enter no meio da partida?”. Retomada da professora: “Agora toque em Enter durante a partida.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

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
