# Nave Contra Asteroides · Aula 2 · Mova a nave pelo espaço

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada.
- Resultado da aula: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.
- Seções: 9. Vídeos: 8.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

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

**Recado na página (não gravar):** Sua vez! Compare a seta solta e a seta segurada e depois as velocidades 3 e 1, avançando um quadro por vez. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-seta-e-velocidade-K1: Dedé substitui “E se a gente testar um passo menor?”. Antes: “do passo quando você anda: passo grande leva mais longe. A velocidade é o tamanho do passo da nave em cada quadro.”. Depois: “Depois, eu clico em Recomeçar, escolho Velocidade 1 e avanço de novo. Agora o x vai de 208 para 209, depois 210. O”.

**Experiência existente:** `lighthouse-walk`. Deixe Segurar a seta para a direita desligado e clique em Avançar 1 quadro. Olhe o x. Depois ligue a seta, escolha Velocidade 3 e avance alguns quadros, um de cada vez. Clique em Recomeçar, escolha Velocidade 1 e avance outros quadros com a seta ligada. Compare quanto o x muda em cada passo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Faça a nave responder às setas

**Tarefa:** Agora faça a sua nave andar! Coloque o movimento com velocidade 7 antes do desenho da nave, teste as duas setas e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-setas-e-rastro → fala-setas.

**Recado na página (não gravar):** Agora faça a sua nave andar! Coloque o movimento com velocidade 7 antes do desenho da nave, teste as duas setas e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-setas-e-rastro-K1: Dedé substitui “E qual velocidade eu uso?”. Antes: “Arraste e solte no começo de A cada quadro do jogo, logo acima de Desenhar o sprite, quando aparecer o encaixe.”. Depois: “Repare: o nome do sprite já vem nave, por isso mantenha. Depois, troque a velocidade para 7, um passo maior do que os”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Mova nave com as setas, com velocidade positiva, antes de desenhá-la.

### Seção 3. Tire o rastro da nave

**Tarefa:** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-limpeza → fala-limpeza.

**Recado na página (não gravar):** Agora tire o rastro da nave! Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limpeza-K1: Dedé substitui “Isso vai apagar a minha nave?”. Antes: “cada quadro, na primeira aula? Com a limpeza ligada, sobrava uma nave só. Agora a gente vai limpar a tela do seu jogo!”. Depois: “Só o desenho anterior. A nave continua no jogo e vai ser desenhada de novo. A limpeza tem que acontecer no começo de”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Limpe a tela antes de mover e desenhar a nave.

### Seção 4. Observe o que acontece na borda

**Tarefa:** Sua vez! Rode sem o limite, depois recomece, ligue Manter dentro da tela e rode de novo. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-limite-da-tela → fala-limite-da-tela → experiencia-limite-da-tela.

**Recado na página (não gravar):** Sua vez! Rode sem o limite, depois recomece, ligue Manter dentro da tela e rode de novo. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limite-da-tela-K1: Dedé substitui “E se a nave sair da tela?”. Antes: “e continua até sair inteira da tela, porque, sem limite, o jogo soma o passo em cada quadro, mesmo depois da borda.”. Depois: “Vamos colocar um limite para ela ficar na tela. Agora eu clico em Recomeçar, ligo Manter dentro da tela e clico em”.

**Experiência existente:** `lighthouse-walk`. Deixe Manter dentro da tela desligado, ligue Segurar a seta para a direita e clique em Rodar. Observe a nave chegar à borda e continuar até sair da tela. Clique em Recomeçar, ligue Manter dentro da tela e mantenha a seta ligada. Clique em Rodar e compare o que acontece na borda. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 5. Mantenha a nave na tela

**Tarefa:** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas bordas e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-limite-da-nave → fala-borda.

**Recado na página (não gravar):** Agora mantenha a sua nave na tela! Coloque o limite entre o movimento e o desenho, teste as duas bordas e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-limite-da-nave-K1: Dedé substitui “Esse nome heroi é o da minha nave?”. Antes: “dentro da tela. Arraste e solte entre Mover o sprite com as setas e Desenhar o sprite, quando aparecer o encaixe.”. Depois: “Repare: o bloco chega com o nome heroi, que não é o da sua nave. Por isso, clique em heroi e escolha nave. Agora teste:”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Mova nave antes de prendê-la à tela.
- Mantenha nave dentro da tela antes de desenhá-la.

### Seção 6. Compare a ordem dos desenhos

**Tarefa:** Sua vez! Troque a ordem do fundo e da nave, compare a tela e termine com o fundo antes da nave. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-ordem-dos-desenhos → fala-ordem-dos-desenhos → experiencia-camadas.

**Recado na página (não gravar):** Sua vez! Troque a ordem do fundo e da nave, compare a tela e termine com o fundo antes da nave. Quando terminar, clique em Próxima parte.

**Experiência existente:** `layers`. Na experiência, use as setas na lista de desenhos para colocar o fundo de estrelas antes da nave. Observe a tela. Troque a ordem para desenhar a nave antes do fundo. Observe novamente e volte à primeira ordem. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 7. Coloque as estrelas atrás da nave

**Tarefa:** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-fundo-estrelado → fala-fundo-estrelado.

**Recado na página (não gravar):** Agora coloque as estrelas no seu jogo! Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-fundo-estrelado-K1: Dedé substitui “Ué, cadê a nave?”. Antes: “A cada quadro do jogo, logo depois de Desenhar o sprite, quando aparecer o encaixe. A velocidade já vem em 1: mantenha.”. Depois: “Olha só: as estrelas cobriram a nave! Isso acontece porque elas foram desenhadas depois da nave, igualzinho ao que você”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Limpe antes de desenhar o céu estrelado.
- Desenhe o fundo de estrelas em movimento a cada quadro.

### Seção 8. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 9. Teste e envie sua nave

**Tarefa:** Hora de testar a sua nave! Leve a nave até as duas bordas, confira a ordem dos blocos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Blocos na página:** video-teste-e-envio → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar a sua nave! Leve a nave até as duas bordas, confira a ordem dos blocos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

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
