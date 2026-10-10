# Nave Contra Asteroides · Aula 2 · Mova a nave pelo espaço

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada.
- Resultado da aula: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.
- Seções: 9. Vídeos: 8.

**Vozes e edição:** Professora conduz; Dedé é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

## Diagnóstico e decisão

Movimento, limpeza, limite e ordem do fundo têm etapas próprias. As experiências usam o cenário da nave e preparam a regra antes dos blocos. A limpeza retoma a comparação já feita na primeira aula.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Movimento e velocidade | lighthouse-walk antes das setas | Comparar quadro a quadro e aplicar a mesma regra ao próprio projeto, com velocidade 7. |
| Limpeza | Retomar draw-loop antes de corrigir o rastro | Uma montagem própria para apagar a imagem anterior. |
| Limite | lighthouse-walk antes da montagem da borda | Comparar o limite e aplicar a mesma regra à nave; testar os dois lados. |
| Ordem dos desenhos | layers antes das estrelas | Comparar quem cobre quem antes de encaixar o fundo. |

## Proposta final

### Seção 1. Observe o movimento quadro a quadro

**Tarefa:** Sua vez! Compare a seta solta e a seta segurada e depois as velocidades 3 e 1, avançando um quadro por vez. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-seta-e-velocidade → fala-seta-e-velocidade → experiencia-seta-e-velocidade.

**Zappy na página (não gravar):** Sua vez! Compare a seta solta e a seta segurada e depois as velocidades 3 e 1, avançando um quadro por vez. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-seta-e-velocidade-avatar-01. Professora até “A velocidade é o tamanho do passo da nave em cada quadro.”. Antes: Mostrar os três avanços com velocidade 3 e deixar x em 217. Dedé: “Quero testar um passo menor.”. Retomada da professora: “Depois, eu clico em Recomeçar, escolho Velocidade 1 e avanço de novo.”. Depois: Recomeçar e testar velocidade 1, com os números e a nave à vista.

**Experiência existente:** `lighthouse-walk`. Deixe Segurar a seta para a direita desligado e clique em Avançar 1 quadro. Olhe o x. Depois ligue a seta, escolha Velocidade 3 e avance alguns quadros, um de cada vez. Clique em Recomeçar, escolha Velocidade 1 e avance outros quadros com a seta ligada. Compare quanto o x muda em cada passo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Faça a nave responder às setas

**Tarefa:** Agora faça a sua nave andar! Coloque o movimento com velocidade 7 antes do desenho da nave, teste as duas setas e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-setas-e-rastro → fala-setas.

**Zappy na página (não gravar):** Agora faça a sua nave andar! Coloque o movimento com velocidade 7 antes do desenho da nave, teste as duas setas e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-setas-e-rastro-avatar-01. Professora até “Agora abra Jogo 2D, depois Movimento e depois Movimentos prontos, e pegue o bloco Mover o sprite com as setas, que tem as setas para a esquerda e para a direita. Arraste e solte no começo de A cada quadro do jogo, logo acima de Desenhar o sprite, quando aparecer o encaixe.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “E qual velocidade eu uso?”. Retomada da professora: “Repare: o nome do sprite já vem nave, por isso mantenha.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-setas-e-rastro-avatar-02. Professora até “Olha só: a nave anda!”. Antes: Soltar a seta e deixar visíveis a nave e seu rastro, sem corrigir o rastro antes da explicação. Dedé: “Foi! A nave andou!”. Retomada da professora: “Mas vai aparecer um rastro, com várias naves, porque o jogo desenha a nave no lugar novo e ainda não apaga a imagem de antes.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Mova nave com as setas, velocidade 7, antes de desenhá-la.

### Seção 3. Tire o rastro da nave

**Tarefa:** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-limpeza → fala-limpeza.

**Zappy na página (não gravar):** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-limpeza-avatar-01. Professora até “Agora a gente vai limpar a tela do seu jogo!”. Antes: Mostrar o rastro e retomar a experiência, antes de pegar o bloco de limpeza. Dedé: “Isso vai apagar a minha nave?”. Retomada da professora: “Só o desenho anterior. A nave continua no jogo e vai ser desenhada de novo. A limpeza tem que acontecer no começo de cada quadro, antes de tudo.”. Depois: Localizar o começo do quadro e montar Limpar a tela; confirmar no teste que só o desenho anterior é apagado.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Limpe a tela antes de mover e desenhar a nave.

### Seção 4. Observe o que acontece na borda

**Tarefa:** Sua vez! Rode sem o limite, depois recomece, ligue Manter dentro da tela e rode de novo. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-limite-da-tela → fala-limite-da-tela → experiencia-limite-da-tela.

**Zappy na página (não gravar):** Sua vez! Rode sem o limite, depois recomece, ligue Manter dentro da tela e rode de novo. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-limite-da-tela-avatar-01. Professora até “mesmo depois da borda.”. Antes: Deixar a nave sair inteira da tela com a regra do limite desligada. Dedé: “Minha nave foi embora!”. Retomada da professora: “Vamos colocar um limite para ela ficar na tela. Agora eu clico em Recomeçar, ligo Manter dentro da tela e clico em Rodar de novo.”. Depois: Recomeçar, ligar Manter dentro da tela e repetir o movimento até a borda.

**Experiência existente:** `lighthouse-walk`. Deixe Manter dentro da tela desligado, ligue Segurar a seta para a direita e clique em Rodar. Observe a nave chegar à borda e continuar até sair da tela. Clique em Recomeçar, ligue Manter dentro da tela e mantenha a seta ligada. Clique em Rodar e compare o que acontece na borda. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 5. Mantenha a nave na tela

**Tarefa:** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas bordas e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-limite-da-nave → fala-borda.

**Zappy na página (não gravar):** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas bordas e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-limite-da-nave-avatar-01. Professora até “Agora abra Jogo 2D, depois Movimento e depois Bordas e rebatidas, e pegue o bloco Manter o sprite dentro da tela. Arraste e solte entre Mover o sprite com as setas e Desenhar o sprite, quando aparecer o encaixe.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Esse nome heroi é o da minha nave?”. Retomada da professora: “Repare: o bloco chega com o nome heroi, que não é o da sua nave.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-limite-da-nave-avatar-02. Professora até “Agora teste: clique na área do jogo, segure a seta para a esquerda até chegar à borda e depois segure a seta para a direita até a outra borda. Olha só: a nave para nos dois lados e continua inteira na tela!”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Parou bem na borda!”. Retomada da professora: “Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo estão Limpar a tela, Mover o sprite nave com as setas, Manter o sprite nave dentro da tela e Desenhar o sprite nave, nessa ordem.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Mova nave antes de prendê-la à tela.
- Mantenha nave dentro da tela antes de desenhá-la.

### Seção 6. Compare a ordem dos desenhos

**Tarefa:** Sua vez! Troque a ordem do fundo e da nave, compare a tela e termine com o fundo antes da nave. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-ordem-dos-desenhos → fala-ordem-dos-desenhos → experiencia-camadas.

**Zappy na página (não gravar):** Sua vez! Troque a ordem do fundo e da nave, compare a tela e termine com o fundo antes da nave. Quando terminar, clique em Próxima parte.

**Experiência existente:** `layers`. Na experiência, use as setas na lista de desenhos para colocar o fundo de estrelas antes da nave. Observe a tela. Troque a ordem para desenhar a nave antes do fundo. Observe novamente e volte à primeira ordem. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 7. Coloque as estrelas atrás da nave

**Tarefa:** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-fundo-estrelado → fala-fundo-estrelado.

**Zappy na página (não gravar):** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-fundo-estrelado-avatar-01. Professora até “Agora abra Jogo 2D, depois Cenários e depois Fundos, e pegue o bloco Desenhar fundo de estrelas. Arraste e solte no fim de A cada quadro do jogo, logo depois de Desenhar o sprite, quando aparecer o encaixe. A velocidade já vem em 1: mantenha.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Ué, cadê a nave?”. Retomada da professora: “Olha só: as estrelas cobriram a nave!”. Depois: Depois da saída, apontar as estrelas por cima da nave junto do Olha só, antes de mover o bloco.

ID video-fundo-estrelado-avatar-02. Professora até “Solte qualquer peça que estiver segurando e deixe Limpar a tela à vista. Depois, arraste o bloco das estrelas e solte logo abaixo de Limpar a tela, antes do movimento. Agora a nave aparece de novo, na frente das estrelas, porque as estrelas passaram a ser desenhadas antes dela.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Voltou! Ela ficou na frente das estrelas!”. Retomada da professora: “Repare que a limpeza continua no começo, mesmo com as estrelas: ela apaga o quadro anterior para o jogo desenhar o quadro novo.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Limpe antes de desenhar o céu estrelado.
- Desenhe as estrelas com velocidade 1 antes da nave.

### Seção 8. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Zappy na página (não gravar):** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 9. Teste e envie sua nave

**Tarefa:** Hora de testar a sua nave! Leve a nave até as duas bordas, confira a ordem dos blocos, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Blocos na página:** video-teste-e-envio → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar a sua nave! Leve a nave até as duas bordas, confira a ordem dos blocos, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Deixe a tela de 800 × 480 em Ao iniciar.
- Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.
- Limpe antes de desenhar o fundo de estrelas.
- Desenhe as estrelas com velocidade 1 a cada quadro.
- Mova nave com as setas, velocidade 7, antes de prender à tela.
- Mantenha nave dentro da tela, no motor.
- Desenhe nave depois de manter dentro da tela.
- Desenhe o sprite nave a cada quadro.
- As estrelas vêm antes do movimento da nave.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Mover o sprite com as setas <- -> (velocidade ) | Jogo 2D → Movimento → Movimentos prontos |
| Manter o sprite dentro da tela | Jogo 2D → Movimento → Bordas e rebatidas |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D → Kits prontos → Espaço |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 2 na cadeia `nave-contra-asteroides`. Entrada: etapa 1; saída: etapa 2 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
