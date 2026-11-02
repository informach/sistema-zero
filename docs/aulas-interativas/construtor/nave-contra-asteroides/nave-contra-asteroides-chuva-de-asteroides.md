# Nave Contra Asteroides · Aula 4 · Faça os asteroides cair

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Tiros saem da nave, sobem, têm som e são retirados do grupo ao sair da tela.
- Resultado da aula: Asteroides nascem a cada 40 quadros, caem e saem do grupo; tiros ainda atravessam as pedras.
- Seções: 5. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Separa criar obstáculos de programar a colisão. Intervalo e sorteio são observados diretamente no jogo que a pessoa acabou de montar.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. O vídeo de cada experiência segue o molde do Cadê (02/11/2026, decisão da responsável): o conceito, uma analogia curta, o nome no jogo dela, a pergunta do avatar devolvida à criança e um convite de uma frase; sem tour pelos controles nem roteiro de testes, que ficam com o Zappy dentro da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Intervalo | spawn antes do relógio | Separar frequência de criação e velocidade da queda. |
| Sorteio e entrada | random antes do criador | Observar posições que variam e podem se repetir; nascer acima da tela. |
| Mover, limpar e desenhar | Retomada da aula dos tiros | Aplicar ao segundo grupo a sequência já experimentada. |

## Proposta final

### Seção 1. Quando nasce uma pedra nova?

**Tarefa:** Sua vez! Investigue o que muda na chuva de pedras com e sem uma espera entre elas. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-intervalo-das-pedras → fala-intervalo-das-pedras → experiencia-relogio.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na chuva de pedras com e sem uma espera entre elas. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-intervalo-das-pedras-K1: Dedé substitui “E se nascer uma pedra em todo quadro?”. Antes: “em cima e cair. E o jogo pode criar uma pedra nova em todo quadro, ou esperar alguns quadros entre uma pedra e outra.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na chuva de pedras quando”.

**Experiência em exploração livre:** `spawn` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/spawn.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/spawn.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare as pedras quando nasce uma pedra nova em todo quadro e quando cada pedra espera alguns quadros para nascer. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Em todo quadro, clique em Passar 1 segundo e observe as pedras e quantas nasceram. Escolha De 40 em 40 quadros e deixe o tempo passar até nascerem duas pedras. Observe onde cada uma aparece.

**Pistas, do aberto ao direto:** 1) Observe quantas pedras nascem e o espaço entre elas. 2) Compare as pedras que nascem em todo quadro com as que esperam alguns quadros. 3) Escolha Em todo quadro e clique em Passar 1 segundo. Depois escolha De 40 em 40 quadros e clique em Passar 1 segundo até nascerem duas pedras. Sem palpite e sem pergunta final.

### Seção 2. Prepare a criação dos asteroides

**Tarefa:** Agora prepare a chuva de pedras! Crie o grupo asteroides, coloque a espera de 40 quadros logo abaixo de A cada quadro do jogo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-grupo-e-relogio → fala-relogio.

**Recado na página (não gravar):** Agora prepare a chuva de pedras! Crie o grupo asteroides, coloque a espera de 40 quadros logo abaixo de A cada quadro do jogo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-grupo-e-relogio-K1: Dedé substitui “E quando vai nascer cada pedra?”. Antes: “vem asteroides, que é o nome certo para este grupo. Deixe assim. É este bloco que cria a lista das pedras, ainda vazia.”. Depois: “De 40 em 40 quadros, como na experiência. A pedra não nasce em todo quadro, e sim de tempos em tempos. Por isso, ela”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Crie o grupo asteroides em Ao iniciar.
- Crie os asteroides em um relógio com intervalo positivo, fora de A cada quadro.
- Os dois relógios são vizinhos em Enquanto estiver rodando.

### Seção 3. Onde nasce cada pedra?

**Tarefa:** Sua vez! Investigue onde as pedras nascem quando o jogo sorteia o lugar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-posicao-sorteada → fala-posicao-sorteada → experiencia-sorteio.

**Recado na página (não gravar):** Sua vez! Investigue onde as pedras nascem quando o jogo sorteia o lugar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-posicao-sorteada-K1: Dedé substitui “E a pedra aparece de repente, no meio da tela?”. Antes: “lugar, ficaria fácil demais acertar. Por isso, o jogo pode sortear o x de cada pedra nova, de um lado ao outro da tela.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar onde cada pedra nova nasce quando o”.

**Experiência em exploração livre:** `random` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/random.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/random.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os lugares que o sorteio escolhe para a pedra e observe de onde ela entra na tela. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Sortear um lugar algumas vezes e compare as marquinhas na régua. Clique em Passar 1 segundo e observe de onde a pedra entra na tela.

**Pistas, do aberto ao direto:** 1) Compare as marquinhas na régua depois de cada sorteio. 2) Depois de sortear, deixe o tempo passar e observe a borda de cima da tela. 3) Clique em Sortear um lugar três vezes. Depois clique em Passar 1 segundo e observe a pedra. Sem palpite e sem pergunta final.

### Seção 4. Crie e mostre as pedras caindo

**Tarefa:** Agora faça as pedras caírem! Crie o asteroide dentro da espera, com o x sorteado, monte o movimento, a limpeza e o desenho do grupo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-asteroide → fala-asteroide.

**Recado na página (não gravar):** Agora faça as pedras caírem! Crie o asteroide dentro da espera, com o x sorteado, monte o movimento, a limpeza e o desenho do grupo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-asteroide-K1: Dedé substitui “E como tira as pedras que saem da tela?”. Antes: “velocidades e solte nesse lugar. Repare: o grupo já vem asteroides, e nos dois próximos blocos também. Deixe assim.”. Depois: “Do mesmo jeito que os tiros. Deixe à vista o encaixe logo abaixo do movimento dos asteroides. Abra Jogo 2D, depois”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No relógio, crie asteroides com x sorteado, acima da tela e descendo.
- Mantenha um único comando de criar asteroide.
- Mova asteroides antes de limpar o grupo.
- Retire os asteroides que saem e depois desenhe esse grupo.
- Desenhe o grupo asteroides a cada quadro.

### Seção 5. Teste e envie a sua chuva de pedras

**Tarefa:** Hora de testar a sua chuva de pedras! Confira as pedras caindo, as setas e os tiros, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar a sua chuva de pedras! Confira as pedras caindo, as setas e os tiros, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie o grupo asteroides em Ao iniciar.
- Crie os asteroides em um relógio com intervalo positivo, fora de A cada quadro.
- Os dois relógios são vizinhos em Enquanto estiver rodando.
- No relógio, crie asteroides com x sorteado, acima da tela e descendo.
- Mantenha um único comando de criar asteroide.
- Mova asteroides antes de limpar o grupo.
- Retire os asteroides que saem e depois desenhe esse grupo.
- Desenhe o grupo asteroides a cada quadro.

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
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada quadros | Jogo 2D → Tempo → Quadros e intervalos |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um x aleatório na tela | Jogo 2D → Sorteios → Números e posições |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D → Kits prontos → Espaço |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 4 na cadeia `nave-contra-asteroides`. Entrada: etapa 3; saída: etapa 4 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
