# Nave Contra Asteroides · Aula 2 · Mova a nave pelo espaço

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada.
- Resultado da aula: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.
- Seções: 9. Vídeos: 8.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

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

**Tarefa:** Sua vez: compare a seta solta e a seta segurada e depois as velocidades 3 e 1, avançando um quadro por vez. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-seta-e-velocidade → fala-seta-e-velocidade → experiencia-seta-e-velocidade.

**Recado na página (não gravar):** Sua vez: compare a seta solta e a seta segurada e depois as velocidades 3 e 1, avançando um quadro por vez. Quando terminar, clique em Próxima seção.

**Experiência existente:** `lighthouse-walk`. Deixe Segurar a seta para a direita desligado e clique em Avançar 1 quadro. Olhe o x. Depois ligue a seta, escolha Velocidade 3 e avance alguns quadros, um de cada vez. Clique em Recomeçar, escolha Velocidade 1 e avance outros quadros com a seta ligada. Compare quanto o x muda em cada passo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Faça a nave responder às setas

**Tarefa:** Agora faça a sua nave andar. Coloque o movimento com velocidade 7 antes do desenho da nave, teste as duas setas e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-setas-e-rastro → fala-setas.

**Recado na página (não gravar):** Agora faça a sua nave andar. Coloque o movimento com velocidade 7 antes do desenho da nave, teste as duas setas e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Mova nave com as setas, velocidade 7, antes de desenhá-la.

### Seção 3. Tire o rastro da nave

**Tarefa:** Agora tire o rastro da nave. Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-limpeza → fala-limpeza.

**Recado na página (não gravar):** Agora tire o rastro da nave. Coloque Limpar a tela no começo de A cada quadro do jogo, teste a seta de novo e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Limpe a tela antes de mover e desenhar a nave.

### Seção 4. Observe o que acontece na borda

**Tarefa:** Sua vez: rode sem o limite, depois recomece, ligue Manter dentro da tela e rode de novo. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-limite-da-tela → fala-limite-da-tela → experiencia-limite-da-tela.

**Recado na página (não gravar):** Sua vez: rode sem o limite, depois recomece, ligue Manter dentro da tela e rode de novo. Quando terminar, clique em Próxima seção.

**Experiência existente:** `lighthouse-walk`. Deixe Manter dentro da tela desligado, ligue Segurar a seta para a direita e clique em Rodar. Observe a nave chegar à borda e continuar até sair da tela. Clique em Recomeçar, ligue Manter dentro da tela e mantenha a seta ligada. Clique em Rodar e compare o que acontece na borda. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 5. Mantenha a nave na tela

**Tarefa:** Agora mantenha a sua nave na tela. Coloque o limite entre o movimento e o desenho, teste as duas bordas e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-limite-da-nave → fala-borda.

**Recado na página (não gravar):** Agora mantenha a sua nave na tela. Coloque o limite entre o movimento e o desenho, teste as duas bordas e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Mova nave antes de prendê-la à tela.
- Mantenha nave dentro da tela antes de desenhá-la.

### Seção 6. Compare a ordem dos desenhos

**Tarefa:** Sua vez: troque a ordem do fundo e da nave, compare a tela e termine com o fundo antes da nave. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-ordem-dos-desenhos → fala-ordem-dos-desenhos → experiencia-camadas.

**Recado na página (não gravar):** Sua vez: troque a ordem do fundo e da nave, compare a tela e termine com o fundo antes da nave. Quando terminar, clique em Próxima seção.

**Experiência existente:** `layers`. Na experiência, use as setas na lista de desenhos para colocar o fundo de estrelas antes da nave. Observe a tela. Troque a ordem para desenhar a nave antes do fundo. Observe novamente e volte à primeira ordem. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 7. Coloque as estrelas atrás da nave

**Tarefa:** Agora coloque as estrelas no seu jogo. Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-fundo-estrelado → fala-fundo-estrelado.

**Recado na página (não gravar):** Agora coloque as estrelas no seu jogo. Deixe o fundo de estrelas logo abaixo de Limpar a tela, confira a ordem dos cinco blocos e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Limpe antes de desenhar o céu estrelado.
- Desenhe as estrelas com velocidade 1 antes da nave.

### Seção 8. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu. Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de clicar em Enviar quiz, leia as explicações: se alguma resposta não estiver certa, é só trocar a resposta e clicar em Enviar quiz de novo. Quando acertar todas, clique em Próxima seção.

**Blocos na página:** fala-quiz-final → quiz.

**Recado na página (não gravar):** Hora de conferir o que você construiu. Responda sobre as estrelas e o limite da tela, pensando nos testes do seu jogo. Depois de clicar em Enviar quiz, leia as explicações: se alguma resposta não estiver certa, é só trocar a resposta e clicar em Enviar quiz de novo. Quando acertar todas, clique em Próxima seção.

**Revisão formativa:** recado → quiz. Todas as perguntas numa página só, com o botão Enviar quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 9. Teste e envie sua nave

**Tarefa:** Hora de testar a sua nave. Leve a nave até as duas bordas, confira a ordem dos blocos, clique em Verificar esta etapa e envie o seu projeto para o professor. Depois, clique em Concluir aula.

**Blocos na página:** video-teste-e-envio → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar a sua nave. Leve a nave até as duas bordas, confira a ordem dos blocos, clique em Verificar esta etapa e envie o seu projeto para o professor. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com o envio confirmado em Enviar para o professor → Enviar.

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

A ordem vídeo → recado → atividade é editorial. Configurar videoBeforeActivity no curso adulto e conferir com um perfil adulto; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos adultos, anexar o PDF do Caderno do Aluno quando existir e ensaiar com adultos antes de declarar o percurso validado.
