# Nave Contra Asteroides · Aula 4 · Faça os asteroides cair

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Tiros saem da nave, sobem, têm som e são retirados do grupo ao sair da tela.
- Resultado da aula: Asteroides nascem a cada 40 quadros, caem e saem do grupo; tiros ainda atravessam as pedras.
- Seções: 5. Vídeos: 5.

## Diagnóstico e decisão

Separa criar obstáculos de programar a colisão. Intervalo e sorteio são observados diretamente no jogo que a pessoa acabou de montar.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Intervalo | spawn antes do relógio | Separar frequência de criação e velocidade da queda. |
| Sorteio e entrada | random antes do criador | Observar posições que variam e podem se repetir; nascer acima da tela. |
| Mover, limpar e desenhar | Retomada da aula dos tiros | Aplicar ao segundo grupo a sequência já experimentada. |

## Proposta final

### Seção 1. Compare o intervalo entre as pedras

**Tarefa:** Sua vez! Compare criar pedras em cada quadro, a cada 40 e a cada 20 quadros, olhando o nascimento e a queda. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-intervalo-das-pedras → fala-intervalo-das-pedras → experiencia-relogio.

**Zappy na página (não gravar):** Sua vez! Compare criar pedras em cada quadro, a cada 40 e a cada 20 quadros, olhando o nascimento e a queda. Quando terminar, clique em Próxima parte.

**Experiência existente:** `spawn`. Na experiência, deixe Criar asteroide em A cada quadro. Clique em Tempo para deixar passar cerca de um segundo e observe quantas pedras nasceram. Leve Criar asteroide para a caixa A cada 40 quadros. Deixe passar cerca de quatro segundos. Observe o nascimento e a queda das pedras. Escolha 20 quadros no intervalo e deixe passar mais três segundos. Compare quantas pedras nasceram e quanto cada uma desceu em 60 quadros. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Prepare a criação dos asteroides

**Tarefa:** Agora prepare a chuva de pedras! Crie o grupo asteroides, coloque o relógio de 40 quadros ao lado de A cada quadro do jogo e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-grupo-e-relogio → fala-relogio.

**Zappy na página (não gravar):** Agora prepare a chuva de pedras! Crie o grupo asteroides, coloque o relógio de 40 quadros ao lado de A cada quadro do jogo e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Crie o grupo asteroides em Ao iniciar.
- Use A cada 40 quadros como vizinho de A cada quadro do jogo.
- Os dois relógios são vizinhos em Enquanto estiver rodando.

### Seção 3. Sorteie onde a pedra nasce

**Tarefa:** Sua vez! Sorteie até ver lugares diferentes e depois acompanhe uma pedra entrando na tela. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-posicao-sorteada → fala-posicao-sorteada → experiencia-sorteio.

**Zappy na página (não gravar):** Sua vez! Sorteie até ver lugares diferentes e depois acompanhe uma pedra entrando na tela. Quando terminar, clique em Próxima parte.

**Experiência existente:** `random`. Na experiência, clique em Sortear lugar na régua de cima até observar pelo menos duas posições diferentes. As marcas mostram os lugares sorteados. Depois, deixe o tempo passar até uma pedra entrar pela parte de cima da tela. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Crie e mostre as pedras caindo

**Tarefa:** Agora faça as pedras caírem! Crie o asteroide dentro do relógio, com x sorteado, monte o movimento, a limpeza e o desenho do grupo e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-asteroide → fala-asteroide.

**Zappy na página (não gravar):** Agora faça as pedras caírem! Crie o asteroide dentro do relógio, com x sorteado, monte o movimento, a limpeza e o desenho do grupo e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- No relógio, crie asteroide com x sorteado, y −30, tamanho 40, vx 0 e vy 3.
- Mantenha um único comando de criar asteroide.
- Mova asteroides antes de limpar o grupo.
- Retire os asteroides que saem e depois desenhe esse grupo.
- Desenhe o grupo asteroides a cada quadro.

### Seção 5. Teste e envie a sua chuva de pedras

**Tarefa:** Hora de testar a sua chuva de pedras! Confira as pedras caindo, as setas e os tiros, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar a sua chuva de pedras! Confira as pedras caindo, as setas e os tiros, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie o grupo asteroides em Ao iniciar.
- Use A cada 40 quadros como vizinho de A cada quadro do jogo.
- Os dois relógios são vizinhos em Enquanto estiver rodando.
- No relógio, crie asteroide com x sorteado, y −30, tamanho 40, vx 0 e vy 3.
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
