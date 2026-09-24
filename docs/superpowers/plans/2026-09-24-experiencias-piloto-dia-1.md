# Experiências do Dia 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Equilibrar a cena no layout dividido e tornar as quatro outras experiências do Dia 1 claras, observáveis e concluíveis sem antecipar seus resultados.

**Architecture:** O layout é compartilhado em `packages/member-shell/src/styles/scene.css`; o conteúdo autoral fica no manifesto do piloto. A regra de revisão fica em `docs/aulas-interativas/BRIEFING.md`. Não mudar o motor das cenas se os percursos já passarem.

**Tech Stack:** React, CSS, Bun test, Playwright, manifesto JSON.

**Spec:** `docs/plans/2026-09-24-experiencias-piloto-dia-1-design.md`

## Global Constraints

- Vídeos conceituais explicam a ideia por inteiro e permanecem inalterados.
- Instruções orientam gesto e observação, sem dizer o resultado antes do teste.
- Preservar alterações preexistentes em `packages/community-kids/src/app/globals.css`.
- Não publicar a aula existente automaticamente: reimportação e publicação dependem do admin.

---

### Task 1: Margens equilibradas no layout dividido

**Files:**
- Modify: `packages/community-kids/e2e-scenes/scene-workspace.spec.ts`
- Modify: `packages/member-shell/src/styles/scene.css`

**Interfaces:** Usa `.sz-scene-console-visual` e `.sz-scene-frame` existentes; não exporta API nova.

- [ ] Acrescentar ao teste E2E uma verificação em `/?width=900`: a diferença entre `frame.left - visual.left` e `visual.right - frame.right` deve ser menor que 1px; o estilo computado de `scrollbar-gutter` deve ser `stable both-edges`.
- [ ] Executar `bunx playwright test --config playwright.scenes.config.ts -g 'margens laterais'` em `packages/community-kids`; confirmar falha antes do CSS.
- [ ] Mudar a reserva de espaço da barra de rolagem do painel visual para `scrollbar-gutter: stable both-edges`, sem adicionar padding artificial ao palco. Se um segundo overflow dentro de `.sz-scene-console-mundo` ainda desequilibrar uma cena, aplicar a mesma regra somente nesse contêiner, com reprodução específica.
- [ ] Reexecutar o E2E em 900px, o E2E existente de layout adaptativo e `git diff --check`.

### Task 2: Percursos didáticos do manifesto

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json`
- Modify: `packages/core/tests/learning.test.ts`
- Modify: `packages/member-shell/tests/scene-sem-pergunta.test.tsx`, se sua expectativa de coordenadas depender da pergunta removida.
- Modify: `docs/aulas-interativas/BRIEFING.md`

**Interfaces:** Mantém `LearningManifest`, os IDs das cinco experiências, metas, vídeos e cenas. Só o conteúdo de `instructions`, `checkpoint` de coordenadas e a flag `semPerguntaFinal` mudam.

- [ ] Escrever teste autoral que lê o bloco `experiencia-coordenadas` e exige `semPerguntaFinal === true`, `checkpoint === undefined` e instrução com aumento isolado de `x` e `y`.
- [ ] No mesmo teste, exigir que `experiencia-criar-mostrar` peça observação após criar, `experiencia-quadro` peça novo avanço após cada mudança e `experiencia-camadas` descreva três trocas. Verificar que os roteiros dos vídeos e os IDs das metas não mudaram.
- [ ] Rodar o teste isolado e confirmar falha inicial.
- [ ] Ajustar apenas os quatro blocos interativos do manifesto; preservar a alteração local já feita na instrução de “Uma vez e sempre”. Atualizar o briefing com a regra “vídeo explica, instrução não entrega o efeito”.
- [ ] Rodar `bun test packages/core/tests/learning.test.ts`, `bun test packages/member-shell/tests/scene-sem-pergunta.test.tsx` e a validação `isLearningManifest` do core; corrigir eventuais expectativas de pergunta final.

### Task 3: Verificação integrada e revisão

**Files:** Somente arquivos de teste se a verificação revelar uma falha reproduzida.

**Interfaces:** Nenhuma API nova.

- [ ] Exercitar os cinco percursos com os testes do core, cobrindo estado inicial, gestos, metas e conclusão.
- [ ] Executar os testes E2E de `scene-workspace.spec.ts` para painel estreito, dividido e ampliado, incluindo as quatro outras experiências.
- [ ] Executar formatter/linter nos arquivos alterados e `git diff --check`; revisar o diff para confirmar que vídeos, motor e mudanças de outra sessão não foram tocados.
- [ ] Relatar o que mudou, evidência de teste e necessidade de reimportação. Não fazer push/deploy sem pedido explícito neste turno.

## Self-review

- Cobertura: margem, coordenadas, criar/mostrar, quadros, camadas, briefing, regressão e publicação constam das três tarefas.
- Nenhum componente novo ou refatoração global é necessário.
