# Nave Contra Asteroides · Aula 7 · Dê três vidas à nave

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.
- Resultado da aula: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.
- Seções: 7. Vídeos: 6.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Os pontos já vêm da aula anterior. A preparação das vidas fica em uma montagem própria; a comparação da proteção prepara a colisão da nave. Um quiz e o teste final retomam acertos, erros e batidas.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. A montagem da batida (535 palavras) virou duas: batida (a colisão, a pedra que sai e a explosão) e dano (id novo: a vida e a proteção, com o tremor). A experiência da proteção passou para logo antes da montagem do dano. O vídeo de cada experiência segue o molde do Cadê (02/11/2026, decisão da responsável): o conceito, uma analogia curta, o nome no jogo dela, a pergunta do avatar devolvida à criança e um convite de uma frase; sem tour pelos controles nem roteiro de testes, que ficam com o Zappy dentro da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Preparar vidas | once-vs-always antes dos corações | Evitar devolver vidas a cada quadro. |
| Dano e proteção | invincibility antes da batida | Comparar 0, 45 e 15 quadros antes de aplicar o dano. |
| Colisão com a nave | Retomada de collision-pair | Usar inimigo para a pedra envolvida e nave para quem perde vida. |

## Proposta final

### Seção 1. Quando a nave ganha as vidas?

**Tarefa:** Sua vez! Investigue quando a nave precisa ganhar as três vidas. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-vidas-no-comeco → fala-vidas-no-comeco → experiencia-uma-vez.

**Recado na página (não gravar):** Sua vez! Investigue quando a nave precisa ganhar as três vidas. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-vidas-no-comeco-K1: Debinha substitui “E se a nave ganhar as três vidas sempre, em todo quadro?”. Antes: “vai tirar uma. E você já conhece dois jeitos de o jogo fazer as coisas: uma vez, no começo, ou sempre, em todo quadro.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantas vidas a nave tem depois das”.

**Experiência em exploração livre:** `once-vs-always` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/once-vs-always.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare as vidas depois das batidas quando a nave ganha as três vidas uma vez, no começo, e quando ganha sempre, em todo quadro. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Uma vez, no começo, clique em Começar o jogo e observe as vidas e as batidas. Escolha Sempre, em todo quadro, clique em Começar o jogo e observe as vidas e as batidas.

**Pistas, do aberto ao direto:** 1) Observe as vidas logo depois de cada batida do asteroide. 2) Compare as vidas no fim do jogo nos dois jeitos. 3) Escolha Uma vez, no começo, e clique em Começar o jogo. Depois escolha Sempre, em todo quadro, e clique em Começar o jogo de novo. Sem palpite e sem pergunta final.

### Seção 2. Dê e mostre as três vidas

**Tarefa:** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-vidas → fala-vidas.

**Recado na página (não gravar):** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-vidas-K1: Debinha substitui “E como eu vejo quantas vidas eu tenho?”. Antes: “em 3: deixe assim, porque a nave começa com três vidas. É este bloco que dá as três vidas à nave, uma vez, no começo.”. Depois: “Com os corações na tela. Agora os corações. Eles mostram as vidas e precisam ser desenhados em todo quadro, no fim de A”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Dê 3 vidas à nave em Ao iniciar.
- Mostre as vidas atuais da nave a cada quadro.

### Seção 3. Programe a batida da pedra

**Tarefa:** Agora programe a batida da pedra! Monte a colisão da nave com as pedras, tire a pedra que bateu, solte a explosão e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-batida-e-coracoes → fala-batida.

**Recado na página (não gravar):** Agora programe a batida da pedra! Monte a colisão da nave com as pedras, tire a pedra que bateu, solte a explosão e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-batida-e-coracoes-K1: Debinha substitui “Qual pedra o jogo vai tirar?”. Antes: “e solte logo abaixo de Mostrar placar. É este bloco que confere, em todo quadro, se alguma pedra encostou na nave.”. Depois: “Só a que bateu. Repare no apelido dela. Repare: o bloco já chega com o grupo asteroides, o sprite nave e, na linha de”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Na colisão nave × asteroides, remova inimigo antes da explosão.

### Seção 4. O tempinho de proteção

**Tarefa:** Sua vez! Investigue quantas vidas sobram com e sem um tempinho de proteção depois de bater. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-protecao → fala-respiro → experiencia-protecao.

**Recado na página (não gravar):** Sua vez! Investigue quantas vidas sobram com e sem um tempinho de proteção depois de bater. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-protecao-K1: Debinha substitui “E se esse tempinho for curto, ou longo? Quantas vidas sobram depois de três pedras?”. Antes: “jogo, a nave também pode ganhar um tempinho depois de bater. E esse tempinho conta para trás, um quadro de cada vez.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar quantas vidas sobram depois de três”.

**Experiência em exploração livre:** `invincibility` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/invincibility.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/invincibility.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare quantas vidas sobram depois das três pedras sem proteção, com uma proteção longa e com uma proteção curta. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Nenhuma e clique em Avançar até a próxima pedra até a terceira pedra bater. Observe as vidas. Escolha 45 quadros e clique em Avançar até a próxima pedra até a terceira pedra bater. Compare as vidas. Escolha 15 quadros e avance pedra por pedra. Observe quando a proteção acaba e quantas vidas sobram.

**Pistas, do aberto ao direto:** 1) Observe as vidas e os quadros de proteção que ainda restam em cada batida. 2) Compare as três proteções: Nenhuma, 15 quadros e 45 quadros. 3) Escolha Nenhuma e clique em Avançar até a próxima pedra três vezes. Depois faça o mesmo com 45 quadros e, por último, com 15 quadros. Sem palpite e sem pergunta final.

### Seção 5. Tire uma vida a cada batida

**Tarefa:** Agora faça a batida tirar uma vida! Coloque o dano com proteção e o tremor dentro da colisão da nave e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-dano → fala-dano.

**Recado na página (não gravar):** Agora faça a batida tirar uma vida! Coloque o dano com proteção e o tremor dentro da colisão da nave e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-dano-K1: Debinha substitui “E a tela pode tremer na batida?”. Antes: “batida tira uma vida e depois dá esse respiro. É este bloco que tira uma vida da nave e liga o tempinho de proteção.”. Depois: “Pode, e é o próximo bloco. Deixe à vista o encaixe logo abaixo do dano. Abra Jogo 2D, depois Desenho e efeitos e depois”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- A explosão da batida usa inimigo, antes de machucar a nave.
- Nessa colisão, tire 1 vida da nave e dê um tempo positivo de proteção.

### Seção 6. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 7. Teste os pontos e as vidas

**Tarefa:** Hora de testar os pontos e as vidas! Confira um erro, um acerto e uma batida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Blocos na página:** video-fecho → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar os pontos e as vidas! Confira um erro, um acerto e uma batida, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie a variável pontos com 0 em Ao iniciar.
- Some 1 em pontos dentro da colisão tiros × asteroides.
- Mantenha um único Somar 1 em pontos.
- Mostre o valor de pontos em um placar com texto e tamanho positivo.
- Dê 3 vidas à nave em Ao iniciar.
- Na colisão nave × asteroides, remova inimigo antes da explosão.
- Nessa colisão, tire 1 vida da nave e dê um tempo positivo de proteção.
- A explosão da batida usa inimigo, antes de machucar a nave.
- Mostre as vidas atuais da nave a cada quadro.
- Toque um efeito dentro da colisão entre tiros e asteroides.
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
