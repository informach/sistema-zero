# Nave Contra Asteroides · Aula 2 · Mova a nave pelo espaço

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada.
- Resultado da aula: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.
- Seções: 10. Vídeos: 9.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Movimento, limpeza, limite e ordem do fundo têm etapas próprias. As experiências usam o cenário da nave e preparam a regra antes dos blocos. A limpeza retoma a comparação já feita na primeira aula.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. A experiência do movimento usa as metas da câmera lenta do Farol (moves-each-frame, stopped-after-release, walked-real-speed) e a da beirada usa left-the-screen, came-back-inside e stayed-inside. A comparação das velocidades virou uma experiência curta própria, "O tamanho do passinho" (02/11/2026, a pedido da responsável: trocar um valor para ver o efeito é papel da experiência): a nave compara o passinho pequeno com o grande, em câmera lenta, e a montagem das setas só liga o número da velocidade a essa ideia e escolhe a velocidade da nave, sem refazer a comparação. O vídeo de cada experiência segue o molde do Cadê (02/11/2026, decisão da responsável): o conceito, uma analogia curta, o nome no jogo dela, a pergunta do avatar devolvida à criança e um convite de uma frase; sem tour pelos controles nem roteiro de testes, que ficam com o Zappy dentro da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Movimento e velocidade | lighthouse-walk (câmera lenta e tamanho do passinho) antes das setas | Comparar quadro a quadro e o tamanho do passinho na experiência; na montagem, ligar o número da velocidade à ideia e escolher a da nave (7 na gravação). |
| Limpeza | Retomar draw-loop antes de corrigir o rastro | Uma montagem própria para apagar a imagem anterior. |
| Limite | lighthouse-walk antes da montagem da borda | Comparar o limite e aplicar a mesma regra à nave; testar os dois lados. |
| Ordem dos desenhos | layers antes das estrelas | Comparar quem cobre quem antes de encaixar o fundo. |

## Proposta final

### Seção 1. A nave em câmera lenta

**Tarefa:** Sua vez! Investigue o que a nave faz em cada quadro, e o que a seta tem a ver com isso. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-seta-e-velocidade → fala-seta-e-velocidade → experiencia-seta-e-velocidade.

**Recado na página (não gravar):** Sua vez! Investigue o que a nave faz em cada quadro, e o que a seta tem a ver com isso. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-seta-e-velocidade-K1: Dedé substitui “E o que a nave faz num quadro em que a seta está solta?”. Antes: “dá só um passinho. Para saber quando a nave tem que andar, o jogo olha a seta em cada quadro, antes de mexer a nave.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que a nave faz em cada quadro com a”.

**Experiência em exploração livre:** `lighthouse-walk` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-walk-camera-lenta.tsx` e falas do Zappy em `packages/core/src/learning/scene/discovery-guidance.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os quadros com a seta apertada e com a seta solta, no Devagar e no Rápido. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Devagar, segure a seta e olhe os quadros do jogo. Em Devagar, solte a seta e olhe os próximos quadros. Escolha Rápido, segure a seta por alguns segundos e compare.

**Pistas, do aberto ao direto:** 1) Repare nas marcas e nos quadros do jogo enquanto você segura a seta. 2) Compare os quadros com a seta solta e, em seguida, Devagar com Rápido. 3) Escolha Devagar e segure a seta. Solte a seta e deixe passar alguns quadros. Escolha Rápido e segure a seta por alguns segundos. Sem palpite e sem pergunta final.

### Seção 2. O tamanho do passinho

**Tarefa:** Sua vez! Investigue o que muda quando a nave dá um passinho pequeno ou um passinho grande em cada quadro. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-tamanho-do-passinho → fala-tamanho-do-passinho → experiencia-tamanho-do-passinho.

**Recado na página (não gravar):** Sua vez! Investigue o que muda quando a nave dá um passinho pequeno ou um passinho grande em cada quadro. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Experiência em exploração livre:** `lighthouse-walk` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-walk-passinho.tsx` e falas do Zappy em `packages/core/src/learning/scene/discovery-guidance.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare as marcas e a tira de quadros com o passinho pequeno e com o passinho grande, em câmera lenta. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Passinho pequeno, clique em Câmera lenta e segure a seta por alguns quadros. Clique em Passinho grande, clique em Câmera lenta e segure a seta por alguns quadros.

**Pistas, do aberto ao direto:** 1) Repare na distância entre as marcas e no quanto a nave sai da linha em cada quadro da tira. 2) Teste um tamanho de passinho em câmera lenta, troque o tamanho e compare as marcas e Os dois passinhos. 3) Clique em Passinho pequeno, clique em Câmera lenta e segure a seta por alguns quadros. Depois clique em Passinho grande e segure a seta de novo, em câmera lenta. Sem palpite e sem pergunta final.

### Seção 3. Faça a nave responder às setas

**Tarefa:** Agora faça a sua nave andar! Coloque o movimento antes do desenho da nave, escolha o tamanho do passinho dela e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-setas-e-rastro → fala-setas.

**Recado na página (não gravar):** Agora faça a sua nave andar! Coloque o movimento antes do desenho da nave, escolha o tamanho do passinho dela e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-setas-e-rastro-K1: Dedé substitui “E qual velocidade eu uso?”. Antes: “seta você está segurando e leva a nave para aquele lado. Repare: o nome do sprite já vem nave, por isso deixe assim.”. Depois: “Você escolhe! Lembra da experiência da parte anterior, do tamanho do passinho? Aqui, o tamanho do passinho se chama”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Mova nave com as setas, com velocidade positiva, antes de desenhá-la.

### Seção 4. Tire o rastro da nave

**Tarefa:** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-limpeza → fala-limpeza.

**Recado na página (não gravar):** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limpeza-K1: Dedé substitui “Isso vai apagar a minha nave?”. Antes: “na primeira aula? Apagando a tela antes de desenhar, sobrava uma nave só. Agora a gente vai apagar a tela do seu jogo!”. Depois: “Só o desenho de antes. A nave continua no jogo e é desenhada de novo, no lugar novo. A tela precisa ser apagada no”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Limpe a tela antes de mover e desenhar a nave.

### Seção 5. A beirada da tela

**Tarefa:** Sua vez! Investigue o que o jogo faz com a nave na beirada da tela, com o limite desligado e ligado. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-limite-da-tela → fala-limite-da-tela → experiencia-limite-da-tela.

**Recado na página (não gravar):** Sua vez! Investigue o que o jogo faz com a nave na beirada da tela, com o limite desligado e ligado. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limite-da-tela-K1: Dedé substitui “E se o limite for ligado com a nave já fora da tela?”. Antes: “conferir se a nave passou da beirada. Essa conferência se chama limite da tela, e ela pode ficar ligada ou desligada.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com a nave na beirada,”.

**Experiência em exploração livre:** `lighthouse-walk` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-walk-beirada.tsx` e falas do Zappy em `packages/core/src/learning/scene/discovery-guidance.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare a nave na beirada com a cerca desligada e com a cerca ligada, inclusive com ela já fora da tela. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com a cerca desligada, escolha Rápido, segure a seta até a beirada e olhe a faixa fora da tela. Com a nave fora da tela, ligue a cerca e olhe o próximo quadro. Com a cerca ligada, leve a nave até a beirada, escolha Devagar e olhe os quadros.

**Pistas, do aberto ao direto:** 1) Olhe a faixa fora da tela quando a nave chega na beirada. 2) E se a cerca for ligada com a nave já fora da tela? Olhe o próximo quadro. 3) Com a cerca desligada, escolha Rápido e segure a seta até a nave sair da tela. Ligue a cerca. Escolha Devagar e segure a seta na beirada. Sem palpite e sem pergunta final.

### Seção 6. Mantenha a nave na tela

**Tarefa:** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas beiradas e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-limite-da-nave → fala-borda.

**Recado na página (não gravar):** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas beiradas e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limite-da-nave-K1: Dedé substitui “Esse nome heroi é o da minha nave?”. Antes: “e solte logo abaixo de Mover o sprite com as setas, quando aparecer o encaixe. Repare: o bloco chega com o nome heroi.”. Depois: “Não é: a sua nave se chama nave. Por isso, a gente troca. Clique em heroi e escolha nave na lista. É este bloco que”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Mova nave antes de prendê-la à tela.
- Mantenha nave dentro da tela antes de desenhá-la.

### Seção 7. Quem fica na frente?

**Tarefa:** Sua vez! Investigue o que muda na tela quando a ordem dos desenhos muda. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-ordem-dos-desenhos → fala-ordem-dos-desenhos → experiencia-camadas.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na tela quando a ordem dos desenhos muda. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-ordem-dos-desenhos-K1: Dedé substitui “E se o fundo de estrelas for desenhado depois da nave?”. Antes: “o jogo desenha uma coisa depois da outra, na mesma tela. No seu jogo, vão ser desenhados a nave e um fundo de estrelas.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que muda na tela quando a ordem dos”.

**Experiência em exploração livre:** `layers` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/layers.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/layers.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare a tela quando a nave é desenhada por último e quando o fundo de estrelas é desenhado por último. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Desenhar a nave por último e observe a tela. Depois, clique em Desenhar o fundo de estrelas por último e observe a nave. Clique em Desenhar a nave por último outra vez, como no jogo, e compare.

**Pistas, do aberto ao direto:** 1) Observe quem fica na frente depois de cada troca. 2) Compare a nave quando ela é desenhada por último e quando o fundo é desenhado por último. 3) Clique em Desenhar a nave por último. Depois clique em Desenhar o fundo de estrelas por último. Por último, clique em Desenhar a nave por último de novo. Sem palpite e sem pergunta final.

### Seção 8. Coloque as estrelas atrás da nave

**Tarefa:** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-fundo-estrelado → fala-fundo-estrelado.

**Recado na página (não gravar):** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-fundo-estrelado-K1: Dedé substitui “Ué, cadê a nave?”. Antes: “Arraste e solte logo depois de Desenhar o sprite, quando aparecer o encaixe. A velocidade já vem em 1: deixe assim.”. Depois: “Olha só: as estrelas cobriram a nave! É que agora elas são desenhadas por último, depois da nave, e ficam na frente.”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Limpe antes de desenhar o céu estrelado.
- Desenhe o fundo de estrelas em movimento a cada quadro.

### Seção 9. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 10. Teste e envie sua nave

**Tarefa:** Hora de testar a sua nave! Leve a nave até as duas beiradas, confira a ordem dos blocos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Blocos na página:** video-teste-e-envio → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar a sua nave! Leve a nave até as duas beiradas, confira a ordem dos blocos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Prepare a tela em Ao iniciar, com o mundo de 800 por 480 usado neste curso.
- Crie uma única nave em Ao iniciar, com posição dentro da tela e tamanho positivo.
- Limpe antes de desenhar o fundo de estrelas.
- Desenhe o fundo de estrelas em movimento a cada quadro.
- Mova nave com as setas, com velocidade positiva, antes de desenhá-la.
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
