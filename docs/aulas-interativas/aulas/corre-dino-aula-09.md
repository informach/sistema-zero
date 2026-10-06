# Corre, Dino! · Aula 9 · Termine e recomece a corrida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Abertura e partida funcionando, sem derrota.
- Resultado da aula: Colisão com efeitos, tela de fim e reinício limpo pelo mesmo evento de entrada.
- Seções: 8. Vídeos: 7.

## Diagnóstico e decisão

O contato é observado antes de montar a colisão. Encerrar, mostrar o fim, dar retorno à batida e reiniciar têm montagens próprias. A experiência de reinício antecede o ramo de fim do evento. O quiz retoma o ciclo completo.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Colisão | hitbox com meta contact antes da regra | Aproximar o cacto e ver a indicação de contato. A mudança de porcentagem fica para a aula 10. |
| Estado fim | reaplica condição e tela | Distinguir encerrar a partida de mostrar sua tela. |
| Reiniciar | restart antes do ramo de fim | Comparar troca de estado com reconstrução da preparação. |

## Proposta final

### Seção 1. Observe quando o jogo reconhece a batida

**Tarefa:** Aproxime o cacto aos poucos e observe quando aparece BATEU.

**Blocos na página:** video-contato → fala-contato → experiencia-contato.

**Zappy na página (não gravar):** Aproxime o cacto aos poucos e observe quando aparece BATEU.

**Experiência existente:** `hitbox`. Na experiência, mantenha Tamanho da área do Dino em 100%. Aproxime o cacto com Distância do cacto, um toque de cada vez, até aparecer BATEU. Observe os desenhos e as áreas mostradas quando a indicação muda. Nesta comparação, mantenha o tamanho da área em 100%. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Encerre a partida na batida

**Tarefa:** Mude para fim dentro da colisão entre Dino e cactos.

**Blocos na página:** video-batida-acaba-partida → fala-batida-acaba-partida.

**Zappy na página (não gravar):** Mude para fim dentro da colisão entre Dino e cactos.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Dentro do Se o estado do jogo é jogando, entre o Desenhar o grupo e a faxina, confira a colisão com os cactos e use Mudar o estado do jogo para fim.

### Seção 3. Mostre a tela de fim

**Tarefa:** Mostre a tela de fim no ramo que consulta fim.

**Blocos na página:** video-mapa-do-jogo → fala-mapa-do-jogo.

**Zappy na página (não gravar):** Mostre a tela de fim no ramo que consulta fim.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No segundo senão se, quando o estado do jogo é fim, desenhe a tela de fim. O título, o subtítulo e a cor do fundo são seus.

### Seção 4. Dê som e imagem à batida

**Tarefa:** Na colisão, exploda cacto, trema em 8, toque derrota e mude para fim.

**Blocos na página:** video-batida-sentida → fala-batida-sentida.

**Zappy na página (não gravar):** Na colisão, exploda cacto, trema em 8, toque derrota e mude para fim.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Exploda o cacto que bateu antes da tremida. A cor da explosão é sua.
- Use tremida 8 antes do som de derrota.
- Toque o efeito derrota antes do Mudar o estado do jogo para fim.

### Seção 5. Compare voltar e reiniciar

**Tarefa:** Compare os dois modos de voltar e observe o começo da partida seguinte.

**Blocos na página:** video-trocar-nao-limpa → fala-trocar-nao-limpa → experiencia-restart.

**Zappy na página (não gravar):** Compare os dois modos de voltar e observe o começo da partida seguinte.

**Experiência existente:** `restart`. Na experiência, em No fim, o toque faz, escolha Mudar o estado do jogo para inicio. Clique em Tocar na tela para começar e espere a partida terminar. Clique em Tocar na tela para voltar à abertura e outra vez para jogar. Observe os cactos e os números da nova partida. Quando terminar novamente, troque a ação para Reiniciar o jogo. Clique em Tocar na tela para voltar e outra vez para começar. Compare os cactos e os números com a tentativa anterior. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 6. Prepare uma nova partida

**Tarefa:** Reinicie no senão se fim do evento de qualquer tecla ou toque.

**Blocos na página:** video-caminho-de-volta → fala-caminho-de-volta.

**Zappy na página (não gravar):** Reinicie no senão se fim do evento de qualquer tecla ou toque.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No mesmo evento de entrada, reinicie somente no senão se o estado do jogo é fim.
- Mantenha um único evento de qualquer tecla ou toque.

### Seção 7. Confira o que você construiu

**Tarefa:** Retome o começo, a batida e o reinício nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Blocos na página:** fala-revisao → quiz.

**Zappy na página (não gravar):** Retome o começo, a batida e o reinício nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 8. Teste e envie seu jogo

**Tarefa:** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com envio confirmado ao professor.

- Dentro do Se o estado do jogo é jogando, entre o Desenhar o grupo e a faxina, confira a colisão com os cactos e use Mudar o estado do jogo para fim.
- Mantenha uma única conferência de colisão com os cactos.
- No segundo senão se, quando o estado do jogo é fim, desenhe a tela de fim. O título, o subtítulo e a cor do fundo são seus.
- Exploda o cacto que bateu antes da tremida. A cor da explosão é sua.
- Use tremida 8 antes do som de derrota.
- Toque o efeito derrota antes do Mudar o estado do jogo para fim.
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
