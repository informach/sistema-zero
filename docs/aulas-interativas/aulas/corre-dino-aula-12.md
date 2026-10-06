# Corre, Dino! · Aula 12 · Varie o lugar e a velocidade dos cactos

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Cactos nascendo sempre em x 560 e velocidade -5; partida completa com pontos.
- Resultado da aula: Nascimento com x de 500 a 560 e vx igual a -5 menos um número de 0 a 1.
- Seções: 4. Vídeos: 4.

## Diagnóstico e decisão

O sorteio vem antes das duas aplicações. A experiência mostra posições, repetições e as contas de velocidade. Lugar e velocidade têm montagens separadas. A fala não promete partidas sempre diferentes: números podem repetir.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Sorteio e faixa | random antes dos valores sorteados | Ver resultados dentro da faixa, inclusive repetições. |
| Variação da velocidade | mesma experiência compara -5 - 0 e -5 - 1 | Relacionar a conta com a direção já observada na aula 5. |

## Proposta final

### Seção 1. Compare os resultados de um sorteio

**Tarefa:** Sorteie posições até comparar diferenças e repetições; depois compare as duas velocidades.

**Blocos na página:** video-sorteio-tira-na-hora → fala-sorteio-tira-na-hora → experiencia-random.

**Zappy na página (não gravar):** Sorteie posições até comparar diferenças e repetições; depois compare as duas velocidades.

**Experiência existente:** `random`. Na experiência, clique em Sortear lugar até aparecerem duas posições diferentes. Depois clique mais oito vezes. Observe os limites da régua e as posições que se repetem. Clique em Sortear velocidade até aparecer um cacto -5 e um -6. Compare as distâncias nas duas raias e leia as contas -5 - 0 e -5 - 1. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Sorteie onde cada cacto nasce

**Tarefa:** Sorteie o x de 500 a 560 dentro do único criador de cactos.

**Blocos na página:** video-lugar-diferente → fala-lugar-diferente.

**Zappy na página (não gravar):** Sorteie o x de 500 a 560 dentro do único criador de cactos.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No x do cacto, encaixe um número de 500 a 560.
- Preserve o relógio de 1,4 s, com o nascimento protegido pelo estado do jogo é jogando.
- Use um único bloco de criar cacto no projeto inteiro.

### Seção 3. Sorteie uma variação na velocidade

**Tarefa:** Use -5 menos um sorteio de 0 a 1 no vx do mesmo criador.

**Blocos na página:** video-velocidade-propria → fala-velocidade-propria.

**Zappy na página (não gravar):** Use -5 menos um sorteio de 0 a 1 no vx do mesmo criador.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No x do cacto, encaixe um número de 500 a 560.
- Na velocidade do cacto, use -5 menos um número de 0 a 1.
- Use um único bloco de criar cacto no projeto inteiro.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com envio confirmado ao professor.

- No x do cacto, encaixe um número de 500 a 560.
- Na velocidade do cacto, use -5 menos um número de 0 a 1.
- Preserve o relógio de 1,4 s, com o nascimento protegido pelo estado do jogo é jogando.
- Use um único bloco de criar cacto no projeto inteiro.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D → Movimento → Velocidade e gravidade |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Controlar o dinossauro , força do pulo | Jogo 2D → Kits prontos → Dino |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Criar grupo de sprites | Jogo 2D → Grupos → Criar e percorrer |
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D → Colisões → Encostar e bloquear |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um número de a | Jogo 2D → Sorteios → Números e posições |
| Reiniciar o jogo | Jogo 2D → Jogo e telas → Telas e partida |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Usar área de colisão de % do tamanho para o sprite | Jogo 2D → Colisões → Área de contato |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Conta matemática | Programação → 🔢 Matemática |
| juntar texto | Programação → 🔣 Valores |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 12 na cadeia `corre-dino`. Entrada: etapa 11; saída: etapa 12 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
