# Corre, Dino! · Aula 11 · Conte e mostre os pontos

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Corrida completa com colisão ajustada, ainda sem placar.
- Resultado da aula: Variável pontos em 0, mostrador, um ponto por segundo somente jogando e resultado na tela de fim.
- Seções: 8. Vídeos: 7.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Guardar, mostrar e mudar o número têm montagens próprias, sempre depois das experiências pertinentes. A frase final reaplica a leitura da variável já observada no mostrador; juntar textos organiza os três trechos da mensagem. O quiz retoma as causas da contagem.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Variável e leitura | variable antes de guardar e mostrar | Comparar número guardado com número visível. |
| Ritmo e condição dos pontos | score antes do relógio | Comparar quadro, relógio e estados. |
| Frase com valor lido | reaplica leitura da variável na tela de fim | Juntar texto organiza a mensagem sem criar outra memória. |

## Proposta final

### Seção 1. Compare guardar, mudar e mostrar

**Tarefa:** Sua vez! Mude o número guardado com o placar desligado e, depois, ligue o placar e acompanhe os dois juntos. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-guardar-mudar-mostrar → fala-guardar-mudar-mostrar → experiencia-variavel.

**Recado na página (não gravar):** Sua vez! Mude o número guardado com o placar desligado e, depois, ligue o placar e acompanhe os dois juntos. Quando terminar, clique em Próxima parte.

**Experiência existente:** `variable`. Na experiência, coloque o número guardado em 1 e depois em 0. Deixe Mostrar placar desligado. Clique em Somar 1 em pontos duas vezes e observe o número guardado. Ligue Mostrar placar. Compare o que aparece na tela com o número guardado. Clique em Somar 1 em pontos mais uma vez e acompanhe os dois. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Prepare os pontos em zero

**Tarefa:** Agora prepare os pontos do seu jogo! Crie a variável pontos com valor 0 no fim de Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-caixinha-dos-pontos → fala-caixinha-dos-pontos.

**Recado na página (não gravar):** Agora prepare os pontos do seu jogo! Crie a variável pontos com valor 0 no fim de Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No Ao iniciar, crie a variável pontos com valor 0.

### Seção 3. Mostre o número guardado

**Tarefa:** Agora mostre os pontos na tela! Coloque Mostrar placar no fim do Se jogando, lendo a variável pontos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-numero-na-tela → fala-numero-na-tela.

**Recado na página (não gravar):** Agora mostre os pontos na tela! Coloque Mostrar placar no fim do Se jogando, lendo a variável pontos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Dentro do Se o estado do jogo é jogando, mostre o placar lendo a variável pontos. A cor é sua.

### Seção 4. Compare quando somar os pontos

**Tarefa:** Sua vez! Compare a soma a cada quadro, solta e no relógio dentro de jogando, passando pelas três telas. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-quando-o-placar-cresce → fala-quando-o-placar-cresce → experiencia-score.

**Recado na página (não gravar):** Sua vez! Compare a soma a cada quadro, solta e no relógio dentro de jogando, passando pelas três telas. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-quando-o-placar-cresce-K1: Debinha substitui “Como faz para contar só durante a corrida?”. Antes: “Com Somar ponto em Solto, na tela de início, eu deixo passar um segundo, e o placar já sobe, antes de alguém jogar.”. Depois: “Agora eu levo Somar ponto para o relógio de um segundo, dentro do Se que pergunta se o estado do jogo é jogando. Na”.

**Experiência existente:** `score`. Na experiência, coloque Somar ponto em A cada quadro do jogo e deixe Tempo passar um segundo. Observe o placar. Deixe Somar ponto solto, fora do relógio e da condição. Na tela de início, deixe passar mais um segundo e observe. Leve Somar ponto para dentro de o estado do jogo é jogando ?, no relógio de um segundo. Ainda no início, deixe Tempo passar. Clique em Próxima tela até Jogando e observe os pontos crescerem. Depois clique em Próxima tela até Fim e deixe passar mais tempo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 5. Some um ponto por segundo de partida

**Tarefa:** Agora some um ponto por segundo de partida! Crie um relógio só para os pontos, com um Se jogando e, dentro dele, Somar em variável pontos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-relogio-dos-pontos → fala-relogio-dos-pontos.

**Recado na página (não gravar):** Agora some um ponto por segundo de partida! Crie um relógio só para os pontos, com um Se jogando e, dentro dele, Somar em variável pontos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-relogio-dos-pontos-K1: Debinha substitui “Mas só vale somar durante a partida, né?”. Antes: “Tempo e depois Quadros e intervalos, pegue o bloco A cada 2 segundos, solte nesse espaço e troque o intervalo para 1.”. Depois: “Isso. Vamos colocar essa pergunta no relógio. Agora deixe à vista o espaço vazio dentro do novo relógio. Abra”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Num relógio próprio, some 1 em pontos somente quando o estado do jogo é jogando. O intervalo é seu: o vídeo usa 1 segundo, e vale de 0,5 a 3.
- Use um único Somar em variável pontos no projeto inteiro.

### Seção 6. Mostre os pontos na tela de fim

**Tarefa:** Agora mostre os pontos na tela de fim! Troque o subtítulo da tela de fim por um juntar texto com texto, valor de pontos e texto. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-frase-da-tela-de-fim → fala-frase-da-tela-de-fim.

**Recado na página (não gravar):** Agora mostre os pontos na tela de fim! Troque o subtítulo da tela de fim por um juntar texto com texto, valor de pontos e texto. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-frase-da-tela-de-fim-K1: Debinha substitui “Esse número vai mudar a cada partida?”. Antes: “isso, vamos usar a mesma leitura do placar na frase da tela de fim, para mostrar quantos pontos você fez na partida.”. Depois: “Vai mostrar os pontos daquela partida. Deixe à vista o subtítulo da tela de fim, no ramo fim, dentro do Se do quadro.”.

video-frase-da-tela-de-fim-K2: Debinha substitui “E o número dos pontos vai no meio?”. Antes: “de texto que mostra Olá e solte em cima do primeiro número. Apague Olá e escreva Você fez, com um espaço depois de fez.”. Depois: “Vai, sim. Agora deixe à vista a entrada do meio. Em Programação e Valores, pegue o bloco valor da variável, solte em”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No subtítulo da tela de fim, junte texto, o valor de pontos e texto, nessa ordem.

### Seção 7. Confira o que você construiu

**Tarefa:** Hora de lembrar o que você construiu! As perguntas falam da variável pontos e do placar. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam da variável pontos e do placar. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 8. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Confira o placar na partida e na tela de fim, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Confira o placar na partida e na tela de fim, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- No Ao iniciar, crie a variável pontos com valor 0.
- Dentro do Se o estado do jogo é jogando, mostre o placar lendo a variável pontos. A cor é sua.
- Num relógio próprio, some 1 em pontos somente quando o estado do jogo é jogando. O intervalo é seu: o vídeo usa 1 segundo, e vale de 0,5 a 3.
- No subtítulo da tela de fim, junte texto, o valor de pontos e texto, nessa ordem.
- Use um único Somar em variável pontos no projeto inteiro.

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
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
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
| Usar área de colisão de % do tamanho para o sprite | Jogo 2D → Colisões → Área de contato |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| juntar texto | Programação → 🔣 Valores |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 11 na cadeia `corre-dino`. Entrada: etapa 10; saída: etapa 11 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
