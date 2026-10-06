# Corre, Dino! · Aula 4 · Toque um som em cada pulo

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Dino com gravidade e três controles de pulo.
- Resultado da aula: Um efeito de pulo ligado ao evento do Dino, sem evento provisório de tecla.
- Seções: 4. Vídeos: 4.

## Diagnóstico e decisão

As duas experiências mostram espera por um evento e diferença entre tecla e pulo. A construção aplica diretamente o evento do Dino, evitando programar um som na tecla só para desfazê-lo. O resultado e o som do projeto original são preservados.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Evento | once-vs-always antes de Quando acontecer | Esperar um acontecimento é diferente de repetir sem entrada. |
| Entrada e ação do jogo | jump-sound antes do som | Comparar os contadores de teclas, pulos e sons. |

## Proposta final

### Seção 1. Compare esperar e repetir

**Tarefa:** Comece o teste sem tocar na tecla e depois acione a tecla uma vez.

**Blocos na página:** video-area-que-espera → fala-area-que-espera → experiencia-tres-areas.

**Zappy na página (não gravar):** Comece o teste sem tocar na tecla e depois acione a tecla uma vez.

**Experiência existente:** `once-vs-always`. Na experiência, coloque Tocar efeito · pulo em Quando acontecer. Clique em Começar o jogo e espere o teste parar sem clicar em Apertar a tecla. Observe o contador. Depois clique em Apertar a tecla. Compare o contador antes e depois desse clique. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Compare a tecla com o pulo

**Tarefa:** Teste tecla repetida e toque nos dois lugares do som.

**Blocos na página:** video-dedo-e-pulo → fala-dedo-e-pulo → experiencia-dedo-e-pulo.

**Zappy na página (não gravar):** Teste tecla repetida e toque nos dois lugares do som.

**Experiência existente:** `jump-sound`. Deixe Tocar efeito em Quando apertar Espaço. Clique em Apertar Espaço duas vezes durante o mesmo pulo e compare os contadores de sons e pulos. Depois de pousar, clique em Tocar para pular. Leve Tocar efeito para Quando o Dino pular. Espere pousar e repita os dois testes: Apertar Espaço duas vezes no mesmo salto e Tocar para pular uma vez. Compare os contadores. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 3. Ligue o som ao pulo do Dino

**Tarefa:** Coloque um único Tocar efeito pulo dentro de Quando o sprite pular.

**Blocos na página:** video-som-no-pulo → fala-som-no-pulo.

**Zappy na página (não gravar):** Coloque um único Tocar efeito pulo dentro de Quando o sprite pular.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Coloque o Tocar efeito, com o efeito que você escolheu, dentro de Quando o dino pular.
- Mantenha apenas um Tocar efeito no projeto inteiro.
- Use o acontecimento do pulo, sem um evento separado só para a tecla.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com envio confirmado ao professor.

- Coloque o Tocar efeito, com o efeito que você escolheu, dentro de Quando o dino pular.
- Mantenha apenas um Tocar efeito no projeto inteiro.
- Use o acontecimento do pulo, sem um evento separado só para a tecla.
- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com a sua força de pulo, antes de desenhá-lo.

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
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 4 na cadeia `corre-dino`. Entrada: etapa 3; saída: etapa 4 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
