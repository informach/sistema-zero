# Cadê Todo Mundo? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o curso gratuito de busca com duas aulas de criação, certificado, uma cena de experimentação e uma passagem neutra para o responsável.

**Architecture:** Um projeto Jogo 2D autossuficiente, com imagens embutidas, entra pelo `initialProject` da primeira aula e continua pela mesma `chain` na segunda. Uma cena nativa `touch-response` ensina a relação toque e ação antes da montagem. Manifestos v5, propostas e roteiros formam um trio por aula; o catálogo e o funil não mudam. O título público é `Cadê Todo Mundo?` e o slug é `cade-todo-mundo`.

**Tech Stack:** Bun, TypeScript, React, Jogo 2D, manifestos JSON v5, Markdown.

**Spec:** `docs/plans/2026-09-24-curso-gratuito-cade-os-personagens-design.md`

## Global Constraints

- Criança de 8 a 15 anos; primeira vitória em 15 a 20 minutos, com pouca ajuda.
- Jogo apenas com a extensão `game-2d`, blocos nativos indispensáveis e imagens preparadas; sem Pinta ou Estúdio completo.
- Uma seção de conceito tem vídeo e experiência disponíveis juntos, e requer os dois para concluir.
- Uma seção prática tem vídeo e Estúdio disponíveis juntos, e requer vídeo e `projectChecks` reais.
- No máximo um vídeo e um diálogo-ponte do Zappy por seção; a instrução interna da cena não é duplicada.
- Toda seção do gratuito tem vídeo. Não incluir quiz ou palpite nesta versão.
- A aula de certificado não contém pitch, oferta ou link de compra.
- `Quero acesso` muda somente nos cartões sem matrícula que apontam à página externa de vendas; não mexer em catálogo, funil ou autorização.
- Preservar o worktree existente, em especial a renomeação pendente do curso Nave Contra Asteroides.

---

### Task 1: Cena `touch-response`

**Files:**
- Modify: `packages/core/src/learning/scene/actions.ts`, `state.ts`, `engine.ts`, `catalog.ts`, `evaluate.ts`, `readout.ts`, `pistas.ts`, `cast.ts`, `cenario.ts` e `questions.ts` conforme as tabelas exaustivas.
- Modify: `packages/member-shell/src/components/scene-stages.tsx`, `scene-bench.tsx` e os controles de cena apropriados.
- Modify: `packages/admin/src/components/editor/scene-action-editor.tsx` se a nova ação precisar aparecer no editor.
- Test: `packages/core/src/learning/scene/*.test.ts`, `packages/member-shell/tests/scene-figures.test.tsx` e `packages/core/src/learning/scene/pedidos-no-motor.test.ts`.

**Interfaces:** Consome `SceneId`, `SceneAction`, `SceneState`, `SCENE_MODELS` e `stepScene`. Produz cena importável como `activity.scene: 'touch-response'` com duas metas: testar uma reação e comparar outra.

- [x] **Step 1: Criar teste vermelho** que abre `touch-response`, toca sem reação e comprova a primeira meta; liga a reação sem tocar e comprova que a segunda não cai; toca e comprova a segunda.
- [x] **Step 2: Rodar** o teste isolado e confirmar a falha esperada por cena ainda inexistente.
- [x] **Step 3: Implementar** `SceneId`, porta do toque restrita à nova cena, motor, catálogo, pistas e leituras. `stepScene` guarda evidência apenas após cada toque. A conclusão não depende de responder pergunta.
- [x] **Step 4: Desenhar** palco e controles com um esconderijo e um personagem; instrução abaixo da cena, ligação e toque acessíveis por mouse/teclado/toque, usando a mesma ordem adaptativa das outras cenas.
- [ ] **Step 5: Rodar** testes de core, player e validação de tipos dos pacotes tocados. Atualizar `docs/aulas-interativas/CATALOGO-CENAS.json` com a entrada fiel ao catálogo real.

### Task 2: Projeto inicial e evidências do Jogo 2D

**Files:**
- Create: `docs/aulas-interativas/qa/cade-todo-mundo-projeto.ts` para montar o snapshot inicial de forma reproduzível e validar a sequência de blocos.
- Create: recursos visuais locais do projeto sob `docs/aulas-interativas/recursos/cade-todo-mundo/`.
- Test: `docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts`.

**Interfaces:** Produz `initialProject` formato 2, com `installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }]`, imagens `ProjectAsset` válidas e `blocksState` derivado da IR. As aulas usam `chain: 'cade-todo-mundo'`.

- [ ] **Step 1: Escrever teste vermelho** para `sanitizeProjectAssets` não descartar imagens, `blocksState` ter as áreas e blocos preparados, o projeto instalar somente `game-2d`, e cada toque no mesmo esconderijo contar no máximo uma vez.
- [ ] **Step 2: Rodar** `bun test docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts` e confirmar a falha.
- [ ] **Step 3: Construir** três personagens e três esconderijos SVG pequenos, sem referência externa; guardar como data URLs válidas em `assets` do snapshot. Gerar `blocksState` de IR com a função usada por `packages/studio/src/projects/tilemapGame.ts`.
- [ ] **Step 4: Preparar** criação, desenho, grupo, placar e vitória no projeto. A criança acrescentará a reação ao toque na primeira aula e a contagem na segunda. Verificar a ordem de desenho e reinício por teste do runtime/preview.
- [ ] **Step 5: Rodar** o teste do projeto e o teste da biblioteca de blocos do Estúdio.

### Task 3: Aula 1 do gratuito

**Files:**
- Create: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.md`, `.roteiro.md`, `.manifesto.json`.
- Create: caderno visual de uma página sob `docs/aulas-interativas/recursos/cade-todo-mundo/`.
- Modify: `docs/aulas-interativas/qa/novo-modelo.ts`.

**Interfaces:** Manifesto v5 com `courseSlug: 'cade-todo-mundo'`, `lessonSlug: 'aula-1'`, `workspaceKey: 'projeto'` nas seções práticas e `activity.scene: 'touch-response'` na seção conceitual.

- [ ] **Step 1: Escrever proposta** com triagem dos conceitos e tempos: abertura; caderno; toque e resposta; primeira programação. A vitória no evento precisa aparecer após o toque no jogo da criança.
- [ ] **Step 2: Escrever roteiro falado completo** de um vídeo por seção, com contexto no começo, analogia antes do termo, caminho completo da paleta, todos os encaixes e teste na área do jogo. O vídeo conceitual não narra a sequência da cena.
- [ ] **Step 3: Escrever manifesto** com um `plannedVideo` por seção, um diálogo curto por ponte, caderno opcional, cena obrigatória e checks da montagem. Usar o snapshot da Task 2 e nenhuma extensão além de `game-2d`.
- [ ] **Step 4: Rodar** `bun docs/aulas-interativas/qa/validar-manifestos.ts` e testes de importação do manifesto. Confirmar vídeo e atividade em `completion` onde ambos existem.

### Task 4: Aula 2 e certificado

**Files:**
- Create: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.md`, `.roteiro.md`, `.manifesto.json`.
- Create: `docs/aulas-interativas/aulas/cade-todo-mundo-certificado.md`, `.roteiro.md`, `.manifesto.json`.
- Create: `docs/aulas-interativas/modulos-cade-todo-mundo.md`.

**Interfaces:** Aula 2 continua a mesma cadeia da Aula 1, sem substituir o projeto salvo. Certificado usa `kind: 'certificate'` e não contém oferta.

- [ ] **Step 1: Escrever aula 2** com retomada curta, explicação concreta do contador no próprio jogo, vídeo prático com incremento e teste dos três achados. Cada seção tem um vídeo e checks limitados à etapa ensinada.
- [ ] **Step 2: Escrever certificado** com um vídeo de conquista e instrução de emitir/guardar o PDF, diálogo curto e bloco `certificate`; conclusão exige vídeo e certificado.
- [ ] **Step 3: Escrever descrição de módulo** dirigida à criança e instruções de cadastro/importação no admin sem tocar no Desafio pago ou no curso da nave.
- [ ] **Step 4: Rodar** validador de manifestos e testes de continuidade, conclusão e importação.

### Task 5: CTA para responsáveis

**Files:**
- Modify: `packages/community-kids/src/components/kids/catalog-course-card.tsx`.
- Test: `packages/community-kids/tests/catalog-course-card.test.tsx` ou teste de render equivalente.

**Interfaces:** Para `!available && !journeyLocked && salesUrl`, mostrar `Mostrar ao responsável`. Curso disponível conserva `Acessar curso`; lock de jornada conserva o destino interno; sem `salesUrl` não promete link.

- [ ] **Step 1: Criar teste vermelho** dos quatro estados: disponível, sem matrícula com URL externa, sem URL externa e bloqueado pela jornada.
- [ ] **Step 2: Rodar** o teste isolado e confirmar que o estado externo ainda exibe `Quero acesso`.
- [ ] **Step 3: Trocar** a copy somente para o estado de página externa; fornecer indicação acessível de nova aba sem criar pitch no espaço infantil.
- [ ] **Step 4: Rodar** o teste isolado, lint e tipos do pacote.

### Task 6: Revisão integral

**Files:**
- Modify: `docs/aulas-interativas/README.md`, `BRIEFING.md` apenas se houver regra nova realmente geral; atualizar referências e documentação do curso.
- Test: todos os arquivos de teste afetados acima.

**Interfaces:** Entrega os três manifestos importáveis após a cena existir, sem gravações vinculadas nem publicação automática.

- [ ] **Step 1: Conferir** todas as seções contra a regra de vídeo, atividade, conclusão, Zappy e continuidade; procurar termos de nave, Dino, Pinta e venda no conteúdo infantil.
- [ ] **Step 2: Rodar** validação de manifestos, testes das cenas, Studio e kids, checks de tipos e `git diff --check`.
- [ ] **Step 3: Revisar** o diff sem incluir alterações pré-existentes; registrar arquivos entregues, comandos e limitações de gravação/admin.
