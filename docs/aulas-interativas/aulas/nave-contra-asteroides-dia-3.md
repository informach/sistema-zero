# Nave Contra Asteroides · Aula 5 · Faça o tiro acertar o asteroide

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Asteroides nascem a cada 40 quadros, caem e saem do grupo; tiros ainda atravessam as pedras.
- Resultado da aula: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som.
- Seções: 4. Vídeos: 3.

## Diagnóstico e decisão

Uma aula dedicada a identificar os dois objetos do acerto, sem misturar nascimento, sorteio e pontuação.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Grupo e objeto da colisão | collision-pair antes de remover os sprites | Comparar apagar grupos inteiros e retirar apenas o par envolvido. |
| Colisão | Checagem dentro de A cada quadro do jogo | Este bloco confere encontros a cada quadro; não pertence à área de eventos. |

## Proposta final

### Seção 1. Escolha quem sai no acerto

**Tarefa:** Compare os grupos inteiros com tiro e asteroide. No teste com os apelidos, deixe o tempo passar até as outras duas pedras saírem da tela.

**Blocos na página:** video-apelidos → fala-trombada → experiencia-trombada.

**Zappy na página (não gravar):** Compare os grupos inteiros com tiro e asteroide. No teste com os apelidos, deixe o tempo passar até as outras duas pedras saírem da tela.

**Experiência existente:** `collision-pair`. Teste a colisão com tiros e asteroides, os grupos inteiros. Volte ao começo e repita com tiro e asteroide, os apelidos. Clique em Deixar o tempo passar até as outras duas pedras saírem pela parte de baixo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Programe o acerto

**Tarefa:** Escolha os grupos e os apelidos. Retire o par atingido e adicione explosão e som.

**Blocos na página:** video-colisao → fala-colisao.

**Zappy na página (não gravar):** Escolha os grupos e os apelidos. Retire o par atingido e adicione explosão e som.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Na colisão entre tiros e asteroides, escolha explosão em Tocar efeito.
- Na colisão tiros × asteroides, remova o tiro do grupo tiros.
- Na mesma colisão, remova o asteroide e então solte a explosão.
- Exploda o asteroide atingido e toque o som de explosão dentro da colisão.

### Seção 3. Confira o que você construiu

**Tarefa:** Responda pensando nos testes do seu jogo. Depois de enviar, leia as explicações. Se precisar, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Zappy na página (não gravar):** Responda pensando nos testes do seu jogo. Depois de enviar, leia as explicações. Se precisar, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 4. Confira os acertos e envie

**Tarefa:** Acerte pedras de posições diferentes e confira se as outras continuam caindo.

**Blocos na página:** video-fecho → fala-entrega → projeto.

**Zappy na página (não gravar):** Acerte pedras de posições diferentes e confira se as outras continuam caindo.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar para o guia → Enviar.

- No evento Espaço, use Tocar efeito e escolha tiro.
- No evento Espaço: tiro com vx 0, vy −9 e depois som de tiro.
- Mantenha apenas um comando de criar tiro.
- Crie o grupo asteroides em Ao iniciar.
- Use A cada 40 quadros como vizinho de A cada quadro do jogo.
- Os dois relógios são vizinhos em Enquanto estiver rodando.
- No relógio, crie asteroide com x sorteado, y −30, tamanho 40, vx 0 e vy 3.
- Mantenha um único comando de criar asteroide.
- Mova asteroides antes de limpar o grupo.
- Retire os asteroides que saem e depois desenhe esse grupo.
- Desenhe o grupo asteroides a cada quadro.
- Na colisão entre tiros e asteroides, escolha explosão em Tocar efeito.
- Na colisão tiros × asteroides, remova o tiro do grupo tiros.
- Na mesma colisão, remova o asteroide e então solte a explosão.
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
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada quadros | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Para cada colisão entre os grupos e | Jogo 2D → Colisões → Encostar e bloquear |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um x aleatório na tela | Jogo 2D → Sorteios → Números e posições |
| Tirar o sprite do grupo | Jogo 2D → Grupos → Participação e limpeza |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D → Kits prontos → Espaço |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 5 na cadeia `nave-contra-asteroides`. Entrada: etapa 4; saída: etapa 5 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
