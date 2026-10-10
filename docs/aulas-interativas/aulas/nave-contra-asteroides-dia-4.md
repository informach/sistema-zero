# Nave Contra Asteroides · Aula 7 · Dê três vidas à nave

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.
- Resultado da aula: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.
- Seções: 6. Vídeos: 5.

**Vozes e edição:** Professora conduz; Debinha é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

## Diagnóstico e decisão

Os pontos já vêm da aula anterior. A preparação das vidas fica em uma montagem própria; a comparação da proteção prepara a colisão da nave. Um quiz e o teste final retomam acertos, erros e batidas.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Preparar vidas | once-vs-always antes dos corações | Evitar devolver vidas a cada quadro. |
| Dano e proteção | invincibility antes da batida | Comparar 0, 45 e 15 quadros antes de aplicar o dano. |
| Colisão com a nave | Retomada de collision-pair | Usar inimigo para a pedra envolvida e nave para quem perde vida. |

## Proposta final

### Seção 1. Compare quando dar as vidas

**Tarefa:** Sua vez! Compare Dar três vidas à nave em Ao iniciar e em Enquanto estiver rodando, esperando cada teste parar e olhando os corações. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-vidas-no-comeco → fala-vidas-no-comeco → experiencia-uma-vez.

**Zappy na página (não gravar):** Sua vez! Compare Dar três vidas à nave em Ao iniciar e em Enquanto estiver rodando, esperando cada teste parar e olhando os corações. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** ID video-vidas-no-comeco-avatar-01. Professora até “as batidas conseguiram tirar.”. Antes da entrada: Concluir o teste em Ao iniciar com Vidas: 0 e Batidas: 3. Debinha entra, com os gestos parados, e fala: “E se eu der as vidas o tempo todo?”. Debinha sai antes da resposta. Retomada da professora: “Agora eu levo a mesma peça para Enquanto estiver rodando e clico em Começar o jogo. Repare: a batida apaga um coração, mas, no quadro seguinte, as vidas voltam para 3. No fim do teste, aparece Vidas: 2, porque a última batida foi bem no último quadro. Ou seja, a peça devolve as vidas o tempo todo, e a nave nunca perderia. Por isso, no seu jogo, as vidas vão ser dadas em Ao iniciar.”. Na retomada: Levar a peça para Enquanto estiver rodando e mostrar o resultado real, inclusive Vidas: 2 no último quadro. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

**Experiência existente:** `once-vs-always`. Na experiência, coloque Dar três vidas à nave em Ao iniciar. Clique em Começar o jogo, espere o teste parar e observe os corações depois das batidas. Leve a mesma peça para Enquanto estiver rodando. Clique em Começar o jogo, espere o teste parar e compare os corações. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Dê e mostre as três vidas

**Tarefa:** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-vidas → fala-vidas.

**Zappy na página (não gravar):** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Dê 3 vidas à nave em Ao iniciar.
- Desenhe corações da nave em x 12, y 48, tamanho 22.

### Seção 3. Compare as batidas com proteção

**Tarefa:** Sua vez! Teste as três batidas com 0, 45 e 15 quadros de proteção, voltando ao começo entre os testes. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-protecao → fala-respiro → experiencia-protecao.

**Zappy na página (não gravar):** Sua vez! Teste as três batidas com 0, 45 e 15 quadros de proteção, voltando ao começo entre os testes. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** ID video-protecao-avatar-01. Professora até “só a primeira batida tirou vida.”. Antes da entrada: Concluir as três batidas com proteção de 45 quadros; manter os corações e o tempo restante à vista. Debinha entra, com os gestos parados, e fala: “E quando esse tempinho de proteção acabar?”. Debinha sai antes da resposta. Retomada da professora: “Por último, eu volto ao começo e escolho 15 quadros. A primeira batida tira uma vida, e, na batida do quadro 10, restam 6 quadros, por isso a vida não cai. Mas, no quadro 30, a proteção já acabou, e olha só: essa batida tira outra vida. A proteção é um respiro com prazo. No seu jogo, a batida vai dar 45 quadros de proteção.”. Na retomada: Voltar ao começo, escolher 15 quadros e mostrar a terceira batida tirando vida. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

**Experiência existente:** `invincibility`. Teste as três batidas com proteção de 0 quadros. Volte ao começo e repita com 45. Volte ao começo e repita com 15, observando quando a proteção acaba. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Programe as vidas e a batida

**Tarefa:** Agora programe a batida na nave! Monte a colisão da nave com as pedras, com explosão, dano e tremor, e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-batida-e-coracoes → fala-batida.

**Zappy na página (não gravar):** Agora programe a batida na nave! Monte a colisão da nave com as pedras, com explosão, dano e tremor, e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Na colisão nave × asteroides, remova inimigo antes da explosão.
- A explosão da batida usa inimigo, antes de machucar a nave.
- Nessa colisão, tire 1 vida da nave, proteja por 45 quadros e trema a tela.

### Seção 5. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Zappy na página (não gravar):** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 6. Teste os pontos e as vidas

**Tarefa:** Hora de testar os pontos e as vidas! Confira um erro, um acerto e uma batida, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Blocos na página:** video-fecho → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar os pontos e as vidas! Confira um erro, um acerto e uma batida, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie a variável pontos com 0 em Ao iniciar.
- Some 1 em pontos dentro da colisão tiros × asteroides.
- Mantenha um único Somar 1 em pontos.
- Mostre Pontos: lendo a variável pontos, em x 12, y 30, tamanho 24.
- Dê 3 vidas à nave em Ao iniciar.
- Na colisão nave × asteroides, remova inimigo antes da explosão.
- Nessa colisão, tire 1 vida da nave, proteja por 45 quadros e trema a tela.
- A explosão da batida usa inimigo, antes de machucar a nave.
- Desenhe corações da nave em x 12, y 48, tamanho 22.
- Na colisão entre tiros e asteroides, escolha explosão em Tocar efeito.
- Na colisão tiros × asteroides, remova o tiro do grupo tiros.
- Na mesma colisão, remova o asteroide e depois solte a explosão.
- Exploda o asteroide atingido e toque o som de explosão dentro da colisão.

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
| Dar ao sprite de vida | Jogo 2D → Vida e placar → Vida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D → Kits prontos → Espaço |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Número | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 7 na cadeia `nave-contra-asteroides`. Entrada: etapa 6; saída: etapa 7 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
