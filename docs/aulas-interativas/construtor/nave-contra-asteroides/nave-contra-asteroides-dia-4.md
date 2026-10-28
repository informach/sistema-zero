# Nave Contra Asteroides · Aula 7 · Dê três vidas à nave

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.
- Resultado da aula: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.
- Seções: 6. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

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

**Recado na página (não gravar):** Sua vez! Compare Dar três vidas à nave em Ao iniciar e em Enquanto estiver rodando, esperando cada teste parar e olhando os corações. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-vidas-no-comeco-K1: Debinha substitui “E se eu der as vidas o tempo todo?”. Antes: “a tela mostra Vidas: 0 e Batidas: 3, porque as vidas foram dadas uma vez, no começo, e cada batida tirou uma vida.”. Depois: “Agora eu levo a mesma peça para Enquanto estiver rodando e clico em Começar o jogo. Repare: a batida apaga um coração,”.

**Experiência existente:** `once-vs-always`. Na experiência, coloque Dar três vidas à nave em Ao iniciar. Clique em Começar o jogo, espere o teste parar e observe os corações depois das batidas. Leve a mesma peça para Enquanto estiver rodando. Clique em Começar o jogo, espere o teste parar e compare os corações. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Dê e mostre as três vidas

**Tarefa:** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-vidas → fala-vidas.

**Recado na página (não gravar):** Agora dê três vidas à sua nave! Coloque as vidas em Ao iniciar, desenhe os corações em cada quadro e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-vidas-K1: Debinha substitui “E como eu vejo quantas vidas tenho?”. Antes: “e solte no fim de Ao iniciar. Escolha nave. O número já vem em 3: mantenha, porque a nave começa com três vidas.”. Depois: “Agora os corações, que precisam ser desenhados em todo quadro. Deixe à vista o fim de A cada quadro do jogo, logo”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Dê 3 vidas à nave em Ao iniciar.
- Mostre as vidas atuais da nave a cada quadro.

### Seção 3. Compare as batidas com proteção

**Tarefa:** Sua vez! Teste as três batidas com 0, 45 e 15 quadros de proteção, voltando ao começo entre os testes. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-protecao → fala-respiro → experiencia-protecao.

**Recado na página (não gravar):** Sua vez! Teste as três batidas com 0, 45 e 15 quadros de proteção, voltando ao começo entre os testes. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-protecao-K1: Debinha substitui “E quando esse tempinho de proteção acabar?”. Antes: “36 quadros de proteção, e a vida não cai. Na do quadro 30, ainda restam 16. Ou seja, só a primeira batida tirou vida.”. Depois: “Por último, eu volto ao começo e escolho 15 quadros. A primeira batida tira uma vida, e, na batida do quadro 10, restam”.

**Experiência existente:** `invincibility`. Teste as três batidas com proteção de 0 quadros. Volte ao começo e repita com 45. Volte ao começo e repita com 15, observando quando a proteção acaba. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Programe as vidas e a batida

**Tarefa:** Agora programe a batida na nave! Monte a colisão da nave com as pedras, com explosão, dano e tremor, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-batida-e-coracoes → fala-batida.

**Recado na página (não gravar):** Agora programe a batida na nave! Monte a colisão da nave com as pedras, com explosão, dano e tremor, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-batida-e-coracoes-K1: Debinha substitui “Qual pedra o jogo vai tirar?”. Antes: “o bloco Para cada sprite do grupo que colidir com o sprite. Arraste e solte entre o placar e o desenho dos corações.”. Depois: “Repare: o bloco já chega com o grupo asteroides, o sprite nave e, na linha de baixo, chamar o sprite de inimigo.”.

video-batida-e-coracoes-K2: Debinha substitui “Falta tirar a vida da nave, né?”. Antes: “o bloco Soltar explosão no sprite, solte nesse encaixe e escolha inimigo. Depois, escolha uma cor para a explosão.”. Depois: “Deixe à vista o encaixe logo abaixo da explosão. Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Na colisão nave × asteroides, remova inimigo antes da explosão.
- A explosão da batida usa inimigo, antes de machucar a nave.
- Nessa colisão, tire 1 vida da nave e dê um tempo positivo de proteção.

### Seção 5. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre os pontos e a proteção da nave, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 6. Teste os pontos e as vidas

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
