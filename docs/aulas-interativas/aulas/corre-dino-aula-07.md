# Corre, Dino! · Aula 7 · Separe a abertura da partida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: A corrida começa assim que o projeto carrega.
- Resultado da aula: Estado inicial inicio; movimento, desenho do Dino e cactos, limpeza e nascimento protegidos por jogando.
- Seções: 5. Vídeos: 5.

**Vozes e edição:** Professora conduz; Debinha é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

## Diagnóstico e decisão

A experiência antecede a criação do estado. A montagem separa as regras de cada quadro do relógio de nascimento e testa jogando antes de devolver inicio. Esta aula entrega a espera; a interface de começo é construída na aula seguinte.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Estado e condição | game-state antes dos ramos | Comparar ações fora e dentro de Se jogando, na abertura e durante a partida. |
| Relógios independentes | segunda montagem retoma a mesma experiência | Guardar ações do quadro não move o relógio de nascimento. |

## Proposta final

### Seção 1. Escolha quando o jogo pode agir

**Tarefa:** Sua vez! Compare a tela de início e a partida, com Criar cacto fora e dentro de Se o estado do jogo é jogando. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-condicao → fala-condicao → experiencia-condicao.

**Zappy na página (não gravar):** Sua vez! Compare a tela de início e a partida, com Criar cacto fora e dentro de Se o estado do jogo é jogando. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-condicao-avatar-01. Professora até “O relógio cria cactos sem perguntar nada.”. Antes: Deixar nascer um cacto na abertura, com Criar cacto fora do Se. Debinha: “Mas eu nem comecei a jogar!”. Retomada da professora: “Vamos fazer os cactos esperarem a partida. Agora eu levo Criar cacto para dentro de Se o estado do jogo é jogando, e tudo recomeça do zero.”. Depois: Mover a peça para dentro do Se jogando, soltar e repetir os testes antes e depois de começar.

**Experiência existente:** `game-state`. Na experiência, deixe Criar cacto fora de Se o estado do jogo é jogando. Sem começar a partida, clique em Tempo e espere nascer pelo menos um cacto. Leve Criar cacto para dentro de Se o estado do jogo é jogando. Na tela de início, deixe o tempo passar três segundos e observe o contador. Depois clique em Toque para começar e deixe o tempo passar novamente. Compare os nascimentos nos dois momentos. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Guarde em que momento o jogo está

**Tarefa:** Agora guarde em que momento o seu jogo está! Coloque Mudar o estado do jogo para inicio no fim de Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-estado-inicio → fala-estado-inicio.

**Zappy na página (não gravar):** Agora guarde em que momento o seu jogo está! Coloque Mudar o estado do jogo para inicio no fim de Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-estado-inicio-avatar-01. Professora até “O estado começa junto com o jogo. Por isso, deixe à vista o fim de Ao iniciar, logo depois de Criar grupo de sprites. Depois, abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para e solte no fim de Ao iniciar. Ele já chega com inicio: mantenha.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “O jogo já vai esperar para começar?”. Retomada da professora: “Ainda falta ligar as ações a esse estado. Confira se ficou assim: no fim de Ao iniciar, está Mudar o estado do jogo para inicio, e as regras de movimento e de criação dos cactos continuam nos mesmos lugares.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- No Ao iniciar, coloque Mudar o estado do jogo para inicio.

### Seção 3. Separe as ações da partida

**Tarefa:** Agora separe as ações da partida! Coloque essas ações num Se o estado do jogo é jogando, com a limpeza e a floresta antes dele, e deixe o estado em inicio. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-embrulhar → fala-embrulhar.

**Zappy na página (não gravar):** Agora separe as ações da partida! Coloque essas ações num Se o estado do jogo é jogando, com a limpeza e a floresta antes dele, e deixe o estado em inicio. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-embrulhar-avatar-01. Professora até “Olha aqui: dentro de A cada quadro do jogo, as ações da partida começam em Aplicar a gravidade do mundo ao sprite e vão até o fim. São o controle, o desenho do Dino, o movimento e o desenho dos cactos e a regra que tira do grupo. Arraste o bloco da gravidade para um espaço livre, e a pilha inteira vem junto, porque os outros blocos estão encaixados embaixo dele. Não copie nada: só separe.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “A pilha veio inteira!”. Retomada da professora: “Agora deixe à vista o espaço logo depois de Desenhar fundo de floresta, dentro do quadro.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-embrulhar-avatar-02. Professora até “Repare: o Se chega com a pergunta x > 0. Arraste essa pergunta para a lixeira, para o lugar dela ficar vazio. Depois, abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é ? e solte no lugar vazio da pergunta. No menu dele, escolha jogando.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Assim a corrida espera eu começar!”. Retomada da professora: “Agora deixe à vista o espaço vazio do então, dentro do Se.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-embrulhar-avatar-03. Professora até “Agora olhe o jogo: com o estado em inicio, o Dino e os cactos deixam de aparecer, e só a floresta continua passando, porque as ações da partida esperam o estado jogando.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Agora só a floresta está passando!”. Retomada da professora: “Para conferir se essas ações ainda funcionam, troque, por um momento, o estado em Ao iniciar para jogando.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Aplicar a gravidade fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Controlar o dinossauro fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o sprite do dino fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Mover os sprites do grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- A regra que tira do grupo quem saiu da tela fica por último dentro do então.
- Limpar a tela continua fora do Se, direto no A cada quadro do jogo.
- Desenhar fundo de floresta continua fora do Se, logo acima dele.
- No Ao iniciar, coloque Mudar o estado do jogo para inicio.

### Seção 4. Faça o relógio esperar a partida

**Tarefa:** Agora faça o relógio esperar a partida! Coloque a criação dos cactos num Se jogando, dentro do relógio, e termine com inicio em Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-relogio → fala-relogio.

**Zappy na página (não gravar):** Agora faça o relógio esperar a partida! Coloque a criação dos cactos num Se jogando, dentro do relógio, e termine com inicio em Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-relogio-avatar-01. Professora até “Agora deixe à vista o espaço vazio dentro do relógio. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte ali. Depois, arraste para a lixeira a pergunta x > 0 que veio nele.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Falta dizer qual é a pergunta!”. Retomada da professora: “Deixe à vista o lugar vazio da pergunta desse Se.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-relogio-avatar-02. Professora até “mesmo ainda sem uma tela de abertura desenhada.”. Antes: Concluir o teste em jogando e voltar para inicio antes da entrada; mostrar apenas a floresta passando. Debinha: “A floresta continua passando, mas os cactos esperam!”. Retomada da professora: “Isso mesmo. Funcionou?”. Depois: Manter inicio e seguir para a verificação, o salvamento e a próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- No A cada 1,4 segundos, o No grupo criar obstáculo fica dentro de um Se o estado do jogo é jogando. Este passo não aparece na tela, e é este critério que confere por você.
- No Ao iniciar, coloque Mudar o estado do jogo para inicio.

### Seção 5. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Confira as duas perguntas de jogando, deixe o estado em inicio, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Confira as duas perguntas de jogando, deixe o estado em inicio, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar meu projeto confirmado em Enviar.

- No Ao iniciar, coloque Mudar o estado do jogo para inicio.
- Aplicar a gravidade fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Controlar o dinossauro fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o sprite do dino fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Mover os sprites do grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- Desenhar o grupo fica no então de Se o estado do jogo é jogando, na ordem da montagem.
- A regra que tira do grupo quem saiu da tela fica por último dentro do então.
- Mantenha uma única ação Aplicar a gravidade.
- Mantenha uma única ação Controlar o dinossauro.
- Mantenha um único Desenhar o sprite do dino.
- Mantenha um único Mover os sprites do grupo.
- Mantenha um único Desenhar o grupo.
- Mantenha uma única regra que tira do grupo quem saiu da tela.
- Limpar a tela continua fora do Se, direto no A cada quadro do jogo.
- Desenhar fundo de floresta continua fora do Se, logo acima dele.
- No A cada 1,4 segundos, o No grupo criar obstáculo fica dentro de um Se o estado do jogo é jogando. Este passo não aparece na tela, e é este critério que confere por você.
- Mantenha um único No grupo criar obstáculo.

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
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 7 na cadeia `corre-dino`. Entrada: etapa 6; saída: etapa 7 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
