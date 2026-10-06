# Corre, Dino! · Aula 11 · Conte e mostre os pontos

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Corrida completa com colisão ajustada, ainda sem placar.
- Resultado da aula: Variável pontos em 0, mostrador, um ponto por segundo somente jogando e resultado na tela de fim.
- Seções: 8. Vídeos: 7.

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

**Tarefa:** Mude a memória com o placar desligado e depois acompanhe os dois juntos.

**Blocos na página:** video-guardar-mudar-mostrar → fala-guardar-mudar-mostrar → experiencia-variavel.

**Zappy na página (não gravar):** Mude a memória com o placar desligado e depois acompanhe os dois juntos.

**Experiência existente:** `variable`. Na experiência, coloque o número guardado em 1 e depois em 0. Deixe Mostrar placar desligado. Clique em Somar 1 em pontos duas vezes e observe o número guardado. Ligue Mostrar placar. Compare o que aparece na tela com o número guardado. Clique em Somar 1 em pontos mais uma vez e acompanhe os dois. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Prepare os pontos em zero

**Tarefa:** Crie pontos com valor 0 em Ao iniciar.

**Blocos na página:** video-caixinha-dos-pontos → fala-caixinha-dos-pontos.

**Zappy na página (não gravar):** Crie pontos com valor 0 em Ao iniciar.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No Ao iniciar, crie a variável pontos com valor 0.

### Seção 3. Mostre o número guardado

**Tarefa:** Mostre Pontos: lendo a variável pontos somente dentro de jogando.

**Blocos na página:** video-numero-na-tela → fala-numero-na-tela.

**Zappy na página (não gravar):** Mostre Pontos: lendo a variável pontos somente dentro de jogando.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Dentro do Se o estado do jogo é jogando, mostre o placar lendo a variável pontos. A cor é sua.

### Seção 4. Compare quando somar os pontos

**Tarefa:** Compare o ritmo da soma e depois os estados início, jogando e fim.

**Blocos na página:** video-quando-o-placar-cresce → fala-quando-o-placar-cresce → experiencia-score.

**Zappy na página (não gravar):** Compare o ritmo da soma e depois os estados início, jogando e fim.

**Experiência existente:** `score`. Na experiência, coloque Somar ponto em A cada quadro do jogo e deixe Tempo passar um segundo. Observe o placar. Deixe Somar ponto solto, fora do relógio e da condição. Na tela de início, deixe passar mais um segundo e observe. Leve Somar ponto para dentro de o estado do jogo é jogando ?, no relógio de um segundo. Ainda no início, deixe Tempo passar. Clique em Próxima tela até Jogando e observe os pontos crescerem. Depois clique em Próxima tela até Fim e deixe passar mais tempo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 5. Some um ponto por segundo de partida

**Tarefa:** Some 1 em pontos dentro de um relógio próprio protegido por Se jogando.

**Blocos na página:** video-relogio-dos-pontos → fala-relogio-dos-pontos.

**Zappy na página (não gravar):** Some 1 em pontos dentro de um relógio próprio protegido por Se jogando.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Num relógio próprio, some 1 em pontos somente quando o estado do jogo é jogando. O intervalo é seu: o vídeo usa 1 segundo, e vale de 0,5 a 3.
- Use um único Somar em variável pontos no projeto inteiro.

### Seção 6. Mostre os pontos na tela de fim

**Tarefa:** Monte a frase com texto, valor de pontos e texto no subtítulo final.

**Blocos na página:** video-frase-da-tela-de-fim → fala-frase-da-tela-de-fim.

**Zappy na página (não gravar):** Monte a frase com texto, valor de pontos e texto no subtítulo final.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No subtítulo do andar de fim, junte texto, o valor de pontos e texto, nessa ordem.

### Seção 7. Confira o que você construiu

**Tarefa:** Retome a memória e o placar nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Blocos na página:** fala-revisao → quiz.

**Zappy na página (não gravar):** Retome a memória e o placar nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 8. Teste e envie seu jogo

**Tarefa:** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com envio confirmado ao professor.

- No Ao iniciar, crie a variável pontos com valor 0.
- Dentro do Se o estado do jogo é jogando, mostre o placar lendo a variável pontos. A cor é sua.
- Num relógio próprio, some 1 em pontos somente quando o estado do jogo é jogando. O intervalo é seu: o vídeo usa 1 segundo, e vale de 0,5 a 3.
- No subtítulo do andar de fim, junte texto, o valor de pontos e texto, nessa ordem.
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
