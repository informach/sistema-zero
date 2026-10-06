# Corre, Dino! · Aula 3 · Faça o Dino cair e pular

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Dino parado diante da floresta.
- Resultado da aula: Gravidade e controles de pulo, com impulso de referência 14.
- Seções: 6. Vídeos: 5.

## Diagnóstico e decisão

Gravidade e impulso são observados antes de cada montagem. Não é preciso programar primeiro um pulo sem gravidade para fabricar um defeito. O quiz retoma preparação, desenho, gravidade e impulso depois dos testes.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Gravidade | gravity antes de aplicar | Ver o que acontece no ar com e sem gravidade. |
| Impulso e pulo | impulse antes de controlar | Comparar dois saltos mantendo a gravidade. |

## Proposta final

### Seção 1. Compare o salto com e sem gravidade

**Tarefa:** Pule sem gravidade e ligue a gravidade enquanto o Dino está no ar.

**Blocos na página:** video-gravidade-modelo → fala-gravidade-modelo → experiencia-gravidade.

**Zappy na página (não gravar):** Pule sem gravidade e ligue a gravidade enquanto o Dino está no ar.

**Experiência existente:** `gravity`. Nesta experiência, deixe a gravidade desligada. Toque no Dino para pular e espere a altura parar de crescer. Com o Dino no ar, ligue Gravidade ao Dino e acompanhe até ele chegar ao chão. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Faça o Dino cair até o chão

**Tarefa:** Aplique a gravidade depois da floresta e antes do desenho.

**Blocos na página:** video-aplicar-gravidade → fala-aplicar-gravidade.

**Zappy na página (não gravar):** Aplique a gravidade depois da floresta e antes do desenho.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Deixe a gravidade depois da floresta.
- Aplique gravidade ao dino dentro do quadro, antes de desenhar.

### Seção 3. Compare duas alturas de pulo

**Tarefa:** Faça um salto com 9 e outro com 14, esperando a queda entre eles.

**Blocos na página:** video-impulso-modelo → fala-impulso-modelo → experiencia-impulso.

**Zappy na página (não gravar):** Faça um salto com 9 e outro com 14, esperando a queda entre eles.

**Experiência existente:** `impulse`. Na experiência, escolha impulso 9, toque no Dino e espere o salto terminar. Observe a marca da altura. Mude o impulso para 14, toque no Dino de novo e espere cair. Compare as duas marcas. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Dê os controles de pulo ao Dino

**Tarefa:** Teste espaço, seta para cima e toque, com gravidade antes do controle.

**Blocos na página:** video-comando-de-pulo → fala-comando-de-pulo.

**Zappy na página (não gravar):** Teste espaço, seta para cima e toque, com gravidade antes do controle.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Aplique gravidade ao dino antes do controle do pulo.
- Deixe a gravidade depois da floresta.
- Encaixe Controlar o dinossauro dino antes de desenhá-lo.

### Seção 5. Confira o que você construiu

**Tarefa:** Retome a tela e os movimentos do Dino nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Blocos na página:** fala-revisao → quiz.

**Zappy na página (não gravar):** Retome a tela e os movimentos do Dino nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 6. Teste e envie seu jogo

**Tarefa:** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com envio confirmado ao professor.

- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com a sua força de pulo, antes de desenhá-lo.
- Desenhe o sprite dino dentro de A cada quadro.
- Desenhe a floresta com velocidade 5 antes do Dino.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D → Movimento → Velocidade e gravidade |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Controlar o dinossauro , força do pulo | Jogo 2D → Kits prontos → Dino |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 3 na cadeia `corre-dino`. Entrada: etapa 2; saída: etapa 3 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
