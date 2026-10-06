# Nave Contra Asteroides · Aula 6 · Conte os acertos

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som.
- Resultado da aula: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.
- Seções: 2. Vídeos: 2.

## Diagnóstico e decisão

Separa contagem de vidas. A experiência distingue guardar, alterar e mostrar um valor.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Variável | variable antes da montagem | O número pode mudar sem estar visível; mostrar é outra ação. |
| Lugar da soma | Teste de tiro que erra e tiro que acerta | Um ponto por colisão, sem soma solta no quadro. |

## Proposta final

### Seção 1. Guarde e mostre um número

**Tarefa:** Sua vez! Mude pontos com o placar desligado, depois ligue Mostrar placar e compare. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-variavel → fala-caixa-de-pontos → experiencia-variavel.

**Zappy na página (não gravar):** Sua vez! Mude pontos com o placar desligado, depois ligue Mostrar placar e compare. Quando terminar, clique em Próxima parte.

**Experiência existente:** `variable`. Mude pontos para 1 e volte para 0 com Mostrar placar desligado. Some 1 duas vezes e observe o número guardado. Ligue Mostrar placar, compare e some 1 novamente. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Some um ponto a cada acerto

**Tarefa:** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar esta parte e envie o seu projeto. Por último, clique em Concluir fase.

**Blocos na página:** video-pontos-e-placar → fala-placar → projeto.

**Zappy na página (não gravar):** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar esta parte e envie o seu projeto. Por último, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie a variável pontos com 0 em Ao iniciar.
- Some 1 em pontos dentro da colisão tiros × asteroides.
- Mantenha um único Somar 1 em pontos.
- Mostre Pontos: lendo a variável pontos, em x 12, y 30, tamanho 24.

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
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
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
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Número | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 6 na cadeia `nave-contra-asteroides`. Entrada: etapa 5; saída: etapa 6 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
