# Corre, Dino! · Aula 8 · Comece por tecla ou toque

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Jogo esperando no estado inicio, com a floresta visível.
- Resultado da aula: Tela de início e um evento de qualquer tecla ou toque que muda inicio para jogando.
- Seções: 4. Vídeos: 4.

**Vozes e edição:** Professora conduz; Dedé é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

## Diagnóstico e decisão

A condição da aula anterior é reaplicada ao ramo inicio. A experiência de controles vem antes do evento, e o evento final é montado diretamente. O convite escrito e os controles aceitos terminam coerentes.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Ramos da condição | retoma o Se da aula 7 | Mostrar uma tela no estado inicio, sem executar a partida. |
| Entrada ampla | controls antes do evento | Testar tecla e toque e comparar qual evento responde. |

## Proposta final

### Seção 1. Desenhe a tela de início

**Tarefa:** Agora desenhe a tela de início do seu jogo! Acrescente um senão se inicio ao Se do quadro, com o título e o convite para começar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-menu → fala-menu.

**Zappy na página (não gravar):** Agora desenhe a tela de início do seu jogo! Acrescente um senão se inicio ao Se do quadro, com o título e o convite para começar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-menu-avatar-01. Professora até “Deixe à vista o Se jogando, dentro de A cada quadro do jogo. Olha aqui, na linha de baixo do bloco: aparecem duas opções com um sinal de mais, senão se e senão. Clique uma vez no + ao lado de senão se, e o Se ganha um ramo novo, chamado senão se.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Quem abrir meu jogo vai encontrar essa tela primeiro!”. Retomada da professora: “O ramo novo chega com a pergunta x > 0: arraste essa pergunta para a lixeira.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-menu-avatar-02. Professora até “No título, escreva Corre, Dino! No subtítulo, escreva Pule os cactos! E, na dica, escreva Aperte qualquer tecla ou toque na tela para começar. O fundo já chega escuro, para o texto aparecer bem: mantenha ou escolha outra cor escura.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Agora quem abre o jogo vai saber como começar!”. Retomada da professora: “Agora olhe a área do jogo: a abertura aparece, porque o estado está em inicio!”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- No senão se o estado do jogo é inicio, mostre a tela de início com a dica dos dois jeitos.

### Seção 2. Compare tecla e toque para começar

**Tarefa:** Sua vez! Teste o toque e o Enter antes e depois de mudar o lugar da peça Começar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-convite → fala-convite → experiencia-convite.

**Zappy na página (não gravar):** Sua vez! Teste o toque e o Enter antes e depois de mudar o lugar da peça Começar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-convite-avatar-01. Professora até “Quando eu clico em Apertar Enter, a partida começa.”. Antes: Terminar o teste com Enter; não trocar o evento antes da pergunta. Dedé: “E quem quiser começar pelo toque?”. Retomada da professora: “Eu clico em Voltar ao início e levo Começar para Quando apertar qualquer tecla ou tocar na tela.”. Depois: Voltar ao início, trocar o evento e testar toque e Enter, voltando ao início entre os testes.

**Experiência existente:** `controls`. Na experiência, com Começar em Quando apertar a tecla, toque na tela de início e observe. Depois clique em Apertar Enter e, em seguida, em Voltar ao início. Leve Começar para Quando apertar qualquer tecla ou tocar na tela. Teste o toque, volte ao início e teste Enter outra vez. Compare os dois jeitos. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 3. Ligue a entrada ao início da partida

**Tarefa:** Agora faça a partida começar! Crie o evento de qualquer tecla ou toque, com um Se inicio que muda o estado para jogando. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-entrada-ampla → fala-entrada-ampla.

**Zappy na página (não gravar):** Agora faça a partida começar! Crie o evento de qualquer tecla ou toque, com um Se inicio que muda o estado para jogando. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-entrada-ampla-avatar-01. Professora até “pegue o bloco Quando apertar qualquer tecla ou tocar na tela e solte nesse espaço.”. Antes: Concluir o encaixe do evento e soltar o mouse antes da entrada; mostrar o evento vazio. Dedé: “Mas eu também uso uma tecla para pular!”. Retomada da professora: “Só que esse evento também acontece no meio da partida, a cada pulo.”. Depois: Explicar por que o evento precisa perguntar o estado e montar o Se inicio, sem pular etapas.

ID video-entrada-ampla-avatar-02. Professora até “Agora deixe à vista o lugar vazio da pergunta. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ?, solte nesse lugar e mantenha inicio, que já vem escolhido.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “A tecla do pulo não vai começar a partida de novo!”. Retomada da professora: “Agora deixe à vista o espaço vazio do então desse Se.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-entrada-ampla-avatar-03. Professora até “Olha só: a abertura some, e o Dino aparece!”. Antes: Esperar o Dino aparecer depois da tecla, sem fazer o próximo salto durante a fala. Dedé: “Começou!”. Retomada da professora: “Depois, use a barra de espaço, a seta para cima e um toque na parte de cima da tela para conferir os pulos.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Qualquer tecla ou toque começa a partida somente quando o estado do jogo é inicio.
- Use a entrada de qualquer tecla ou toque, sem um evento separado só para Enter.
- A dica da tela de início passa a descrever os dois jeitos de começar.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Comece a partida por tecla e por toque, desde a abertura, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Comece a partida por tecla e por toque, desde a abertura, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar meu projeto confirmado em Enviar.

- No Ao iniciar, o jogo continua abrindo com Mudar o estado do jogo para inicio.
- No senão se o estado do jogo é inicio, mostre a tela de início com a dica dos dois jeitos.
- Qualquer tecla ou toque começa a partida somente quando o estado do jogo é inicio.
- Use a entrada de qualquer tecla ou toque, sem um evento separado só para Enter.
- No A cada 1,4 segundos, o No grupo criar obstáculo continua dentro de um Se o estado do jogo é jogando.

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
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |

## Continuidade e produção

Aula 8 na cadeia `corre-dino`. Entrada: etapa 7; saída: etapa 8 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
