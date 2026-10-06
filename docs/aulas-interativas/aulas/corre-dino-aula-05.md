# Corre, Dino! · Aula 5 · Faça os cactos entrar na pista

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Dino pulando com som diante da floresta.
- Resultado da aula: Grupo cactos, nascimento a cada 1,4 segundo em x 560, tamanho 44 e vx -5; movimento e desenho em cada quadro.
- Seções: 6. Vídeos: 6.

## Diagnóstico e decisão

O intervalo e a direção da velocidade são observados antes dos blocos. Grupo e relógio são preparados numa seção; criação e depois atualização e desenho têm montagens próprias. A avalanche fica na experiência, sem exigir montar e desmontar uma regra errada no projeto.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Grupo e intervalo | spawn antes da criação | Ver vários objetos nascerem com uma regra comum e comparar os ritmos. |
| Velocidade e sinal | velocity antes de vx -5 | Relacionar o número à mudança do x. |
| Nascer fora da tela | retoma coordenadas e tamanho | 560 fica além da largura 480; o nascimento entra depois pelo movimento. |

## Proposta final

### Seção 1. Compare o intervalo entre cactos

**Tarefa:** Sua vez! Compare os cactos nascendo a cada quadro com os cactos nascendo no relógio de 1,4 segundo. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-espaco-e-tempo → fala-espaco-e-tempo → experiencia-ritmo.

**Zappy na página (não gravar):** Sua vez! Compare os cactos nascendo a cada quadro com os cactos nascendo no relógio de 1,4 segundo. Quando terminar, clique em Próxima parte.

**Experiência existente:** `spawn`. Na experiência, deixe Criar cacto em A cada quadro. Clique em Tempo para deixar passar cerca de um segundo. Observe os cactos que nascem. Leve Criar cacto para o relógio e escolha 1,4 s. Clique em Tempo e deixe passar pelo menos três segundos, até nascerem dois cactos. Compare com a primeira tentativa. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Prepare o grupo e o relógio

**Tarefa:** Agora prepare o grupo e o relógio dos cactos! Crie o grupo cactos em Ao iniciar e um relógio de 1.4 segundo, fora do quadro. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-grupo-e-relogio → fala-grupo-e-relogio.

**Zappy na página (não gravar):** Agora prepare o grupo e o relógio dos cactos! Crie o grupo cactos em Ao iniciar e um relógio de 1.4 segundo, fora do quadro. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Crie o grupo cactos em Ao iniciar.
- Prepare o relógio de 1.4 segundo em Enquanto estiver rodando.

### Seção 3. Compare a direção da velocidade

**Tarefa:** Sua vez! Compare a velocidade para o lado em 5, em -5 e em 0, de olho no x do cacto. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-numero-negativo → fala-numero-negativo → experiencia-velocidade.

**Zappy na página (não gravar):** Sua vez! Compare a velocidade para o lado em 5, em -5 e em 0, de olho no x do cacto. Quando terminar, clique em Próxima parte.

**Experiência existente:** `velocity`. Na experiência, deixe a velocidade para baixo em 0. Escolha velocidade para o lado 5 e clique em Avançar 1 quadro algumas vezes. Observe o x. Troque a velocidade para o lado por -5 e avance mais alguns quadros. Compare a direção. Por último, deixe as duas velocidades em 0 e avance de novo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 4. Crie os cactos no relógio

**Tarefa:** Agora crie os cactos no relógio! Coloque No grupo criar obstáculo dentro do relógio, com x 560, vx -5 e tamanho 44. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-criar-cactos → fala-criar-cactos.

**Zappy na página (não gravar):** Agora crie os cactos no relógio! Coloque No grupo criar obstáculo dentro do relógio, com x 560, vx -5 e tamanho 44. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Crie um cacto em x 560, tamanho 44 e vx -5 a cada 1,4 s.
- Deixe a criação fora de A cada quadro.
- Mantenha apenas um bloco de criação de cacto.

### Seção 5. Mova e mostre o grupo de cactos

**Tarefa:** Agora faça os cactos aparecerem e andarem! Coloque Mover os sprites do grupo e Desenhar o grupo depois do desenho do Dino, a cada quadro. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-mover-e-desenhar → fala-mover-e-desenhar.

**Zappy na página (não gravar):** Agora faça os cactos aparecerem e andarem! Coloque Mover os sprites do grupo e Desenhar o grupo depois do desenho do Dino, a cada quadro. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Atualize o grupo cactos a cada quadro, antes de desenhá-lo.
- Desenhe o grupo cactos a cada quadro.
- Desenhe o Dino antes de atualizar e desenhar os cactos.

### Seção 6. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Espere os cactos entrarem, pule um deles, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Espere os cactos entrarem, pule um deles, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar meu projeto confirmado em Enviar.

- Crie o grupo cactos em Ao iniciar.
- Crie um cacto em x 560, tamanho 44 e vx -5 a cada 1,4 s.
- Atualize o grupo cactos a cada quadro, antes de desenhá-lo.
- Desenhe o grupo cactos a cada quadro.
- Mantenha apenas um bloco de criação de cacto.
- Desenhe a floresta com velocidade 5 antes do Dino.
- Desenhe o Dino antes de atualizar e desenhar os cactos.
- Deixe a criação fora de A cada quadro.

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
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 5 na cadeia `corre-dino`. Entrada: etapa 4; saída: etapa 5 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
