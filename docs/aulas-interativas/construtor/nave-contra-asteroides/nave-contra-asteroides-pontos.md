# Nave Contra Asteroides · Aula 6 · Conte os acertos

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som.
- Resultado da aula: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.
- Seções: 2. Vídeos: 2.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Separa contagem de vidas. A experiência distingue guardar, alterar e mostrar um valor.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. O vídeo de cada experiência segue o molde do Cadê (02/11/2026, decisão da responsável): o conceito, uma analogia curta, o nome no jogo dela, a pergunta do avatar devolvida à criança e um convite de uma frase; sem tour pelos controles nem roteiro de testes, que ficam com o Zappy dentro da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Variável | variable antes da montagem | O número pode mudar sem estar visível; mostrar é outra ação. |
| Lugar da soma | Teste de tiro que erra e tiro que acerta | Um ponto por colisão, sem soma solta no quadro. |

## Proposta final

### Seção 1. Guardar e mostrar um número

**Tarefa:** Sua vez! Investigue a diferença entre guardar um número e mostrar esse número na tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-variavel → fala-caixa-de-pontos → experiencia-variavel.

**Recado na página (não gravar):** Sua vez! Investigue a diferença entre guardar um número e mostrar esse número na tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-variavel-K1: Dedé substitui “E se o número não estiver na tela, ele continua mudando?”. Antes: “se chamar pontos. E os pontos também vão ter as duas coisas: o número que o jogo guarda e o número que aparece na tela.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar a diferença entre o número que o jogo”.

**Experiência em exploração livre:** `variable` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/variable.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/variable.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare a caixa pontos com a tela do jogo, com o número mostrado na tela e sem ele, quando a nave acerta um asteroide. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Guardar o número 0 e compare a caixa pontos com a tela do jogo. Com o número fora da tela, clique em Acertar um asteroide e compare a caixa pontos com a tela. Clique em Mostrar o número na tela e compare com a caixa pontos.

**Pistas, do aberto ao direto:** 1) Depois de cada botão, compare a caixa pontos com a tela do jogo. 2) O número muda mesmo sem aparecer? Teste um acerto com o número fora da tela. 3) Clique em Guardar o número 0. Depois clique em Acertar um asteroide duas vezes. Por último, clique em Mostrar o número na tela. Sem palpite e sem pergunta final.

### Seção 2. Some um ponto a cada acerto

**Tarefa:** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar projeto e envie o seu projeto. Por último, clique em Concluir aula.

**Blocos na página:** video-pontos-e-placar → fala-placar → projeto.

**Recado na página (não gravar):** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar projeto e envie o seu projeto. Por último, clique em Concluir aula.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-pontos-e-placar-K1: Dedé substitui “Onde eu coloco o bloco que soma?”. Antes: “já vem em 0: deixe assim, porque cada partida começa sem pontos. É este bloco que cria a caixa pontos, guardando 0.”. Depois: “O ponto só pode ser somado quando um tiro acerta uma pedra. Por isso, a soma vai dentro da colisão entre tiros e”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie a variável pontos com 0 em Ao iniciar.
- Some 1 em pontos dentro da colisão tiros × asteroides.
- Mantenha um único Somar 1 em pontos.
- Mostre o valor de pontos em um placar com texto e tamanho positivo.

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
