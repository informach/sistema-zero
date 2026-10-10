# Corre, Dino! · Aula 9 · Termine e recomece a corrida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Abertura e partida funcionando, sem derrota.
- Resultado da aula: Colisão com efeitos, tela de fim e reinício limpo pelo mesmo evento de entrada.
- Seções: 8. Vídeos: 7.

**Vozes e edição:** Professora conduz; Debinha é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

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

**Tarefa:** Sua vez! Aproxime o cacto aos poucos até aparecer BATEU! Quando terminar, clique em Próxima parte.

**Blocos na página:** video-contato → fala-contato → experiencia-contato.

**Zappy na página (não gravar):** Sua vez! Aproxime o cacto aos poucos até aparecer BATEU! Quando terminar, clique em Próxima parte.

**Participação no vídeo:** ID video-contato-avatar-01. Professora até “Mas os desenhos ainda têm um espacinho entre eles.”. Antes da entrada: Aproximar até BATEU! e apontar o vão entre os desenhos e as áreas que se tocam. Debinha entra, com os gestos parados, e fala: “Ué, nem encostou no desenho!”. Debinha sai antes da resposta. Retomada da professora: “O jogo não olha o desenho: ele confere se as áreas se encostaram.”. Na retomada: Manter as áreas pontilhadas à vista enquanto explica como a batida é decidida. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

**Experiência existente:** `hitbox`. Na experiência, mantenha Tamanho da área do Dino em 100%. Aproxime o cacto com Distância do cacto, um toque de cada vez, até aparecer BATEU! Observe os desenhos e as áreas mostradas quando a indicação muda. Nesta comparação, mantenha o tamanho da área em 100%. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Encerre a partida na batida

**Tarefa:** Agora faça a batida terminar a partida! Coloque a colisão entre o Dino e os cactos dentro do Se jogando, mudando o estado para fim. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-batida-acaba-partida → fala-batida-acaba-partida.

**Zappy na página (não gravar):** Agora faça a batida terminar a partida! Coloque a colisão entre o Dino e os cactos dentro do Se jogando, mudando o estado para fim. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Dentro do Se o estado do jogo é jogando, entre o Desenhar o grupo e a regra que tira do grupo, confira a colisão com os cactos e use Mudar o estado do jogo para fim.

### Seção 3. Mostre a tela de fim

**Tarefa:** Agora mostre a tela de fim! Acrescente mais um senão se ao Se do quadro, para o estado fim, com a tela de fim dentro dele. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-mapa-do-jogo → fala-mapa-do-jogo.

**Zappy na página (não gravar):** Agora mostre a tela de fim! Acrescente mais um senão se ao Se do quadro, para o estado fim, com a tela de fim dentro dele. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- No segundo senão se, quando o estado do jogo é fim, desenhe a tela de fim. O título, o subtítulo e a cor do fundo são seus.

### Seção 4. Dê som e imagem à batida

**Tarefa:** Agora dê som e imagem à batida! Dentro da colisão, antes de mudar para fim, exploda o cacto, trema a tela em 8 e toque o som de derrota. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-batida-sentida → fala-batida-sentida.

**Zappy na página (não gravar):** Agora dê som e imagem à batida! Dentro da colisão, antes de mudar para fim, exploda o cacto, trema a tela em 8 e toque o som de derrota. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Participação no vídeo:** ID video-batida-sentida-avatar-01. Professora até “Agora a gente vai fazer a mesma coisa com a batida, colocando os efeitos dentro dela.”. Antes da entrada: Retomar a regra da batida com os blocos à vista, sem inserir efeitos ainda. Debinha entra, com os gestos parados, e fala: “O som vem antes de mostrar a tela de fim?”. Debinha sai antes da resposta. Retomada da professora: “Os efeitos vêm antes da mudança de estado: primeiro o jogo mostra a batida e, por último, passa para a tela de fim. Por isso, deixe à vista o lugar logo antes de Mudar o estado do jogo para fim, dentro da colisão. Depois, abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite e solte antes da mudança de estado. No sprite, escolha cacto, o nome que você deu ao cacto que bateu, e escolha uma cor para a explosão.”. Na retomada: Apontar o lugar antes de Mudar o estado do jogo para fim e montar os três efeitos na ordem narrada. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Exploda o cacto que bateu antes da tremida. A cor da explosão é sua.
- Use tremida 8 antes do som de derrota.
- Toque o efeito derrota antes do Mudar o estado do jogo para fim.

### Seção 5. Compare voltar e reiniciar

**Tarefa:** Sua vez! Compare os dois jeitos de voltar e repare em como começa a partida seguinte. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-trocar-nao-limpa → fala-trocar-nao-limpa → experiencia-restart.

**Zappy na página (não gravar):** Sua vez! Compare os dois jeitos de voltar e repare em como começa a partida seguinte. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** ID video-trocar-nao-limpa-avatar-01. Professora até “Ele não arruma a pista.”. Antes da entrada: Concluir a segunda partida com os cactos antigos e deixar a batida visível. Debinha entra, com os gestos parados, e fala: “Eu comecei de novo e já perdi!”. Debinha sai antes da resposta. Retomada da professora: “É porque os cactos da outra partida ficaram ali. Agora, no fim, eu troco a ação para Reiniciar o jogo. Clico em Tocar na tela: a abertura volta com a pista vazia. Clico de novo, e a partida começa limpa. Reiniciar o jogo repete a preparação do começo.”. Na retomada: Trocar a ação para Reiniciar o jogo e mostrar abertura e nova partida com a pista limpa. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

**Experiência existente:** `restart`. Na experiência, em No fim, o toque faz, escolha Mudar o estado do jogo para inicio. Clique em Tocar na tela para começar e espere a partida terminar. Clique em Tocar na tela para voltar à abertura e outra vez para jogar. Observe os cactos e os números da nova partida. Quando terminar novamente, troque a ação para Reiniciar o jogo. Clique em Tocar na tela para voltar e outra vez para começar. Compare os cactos e os números com a tentativa anterior. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 6. Prepare uma nova partida

**Tarefa:** Agora prepare uma nova partida! No evento de qualquer tecla ou toque, acrescente um senão se fim com Reiniciar o jogo. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-caminho-de-volta → fala-caminho-de-volta.

**Zappy na página (não gravar):** Agora prepare uma nova partida! No evento de qualquer tecla ou toque, acrescente um senão se fim com Reiniciar o jogo. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- No mesmo evento de entrada, reinicie somente no senão se o estado do jogo é fim.
- Mantenha um único evento de qualquer tecla ou toque.

### Seção 7. Confira o que você construiu

**Tarefa:** Hora de lembrar o que você construiu! As perguntas falam do começo da partida, da batida e do recomeço. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Zappy na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam do começo da partida, da batida e do recomeço. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 8. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Jogue uma partida inteira, do começo ao recomeço, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue uma partida inteira, do começo ao recomeço, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar meu projeto confirmado em Enviar.

- Dentro do Se o estado do jogo é jogando, entre o Desenhar o grupo e a regra que tira do grupo, confira a colisão com os cactos e use Mudar o estado do jogo para fim.
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
