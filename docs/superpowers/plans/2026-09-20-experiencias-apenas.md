# Experiências Apenas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir o bloco interativo a experimentação e HTML sem perder o palpite, as pistas ou a estabilidade visual da cena.

**Architecture:** O catálogo mantém as regras da cena e deixa de carregar roteiro. Amostras de apresentação no member-shell substituem o uso incidental do roteiro para medir a moldura. Core, members, admin e player passam a ter a mesma união de duas atividades.

**Tech Stack:** Bun, TypeScript, React, TypeBox, Biome.

**Spec:** `docs/plans/2026-09-20-experiencias-apenas-design.md`

## Global Constraints

- Não migrar conteúdo antigo do staging: ele será descartado antes do recadastro.
- Preservar `prediction`, `checkpoint` anexado e `semPerguntaFinal` das experimentações.
- Não alterar o funcionamento do vídeo, quiz, HTML personalizado, ações, metas e pistas.
- Incluir no commit a alteração local anterior que remove o card de materiais do curso.
- Não fazer push nem deploy.

---

### Task 1: Desacoplar a moldura visual do roteiro

**Files:**
- Create: `packages/member-shell/src/components/scene-display-samples.ts`
- Modify: `packages/member-shell/src/components/scene-frame.tsx`
- Modify: `packages/member-shell/src/components/scene-activity.tsx`
- Test: `packages/member-shell/tests/scene-display-samples.test.ts`

**Interfaces:**
- Produces: `sceneDisplaySamples(scene: SceneId, cast?: SceneCast)` com `readouts` e `situations` de apresentação, sem importar `SceneStep` nem `sceneScript`.
- Consumes: `sceneReadout`, `sceneSituation` e o estado inicial real de `sceneStart(activity)`.

- [ ] Escrever teste de cobertura dos 56 ids e de reserva para valores que mudam depois do gesto.
- [ ] Executar o teste e observar falha por ausência de `sceneDisplaySamples`.
- [ ] Extrair amostras textuais de apresentação dos estados hoje usados como molde; guardar somente o necessário para a medida visual, sem ações ou legendas de demonstração.
- [ ] Trocar as duas chamadas a `estadosDaCena` por essas amostras e pelo estado inicial da atividade.
- [ ] Rodar teste do member-shell, typecheck e revisão do diff.

### Task 2: Remover tipos e motor exclusivos de demonstração/pergunta curta

**Files:**
- Modify: `packages/core/src/learning/scene/catalog.ts`, `index.ts`, `session.ts`, `evaluate.ts`
- Modify: `packages/core/src/learning/index.ts`, `section-templates.ts`
- Modify: `packages/members/src/interfaces/http/learning.dtos.ts`, `lesson-draft.dtos.ts`
- Modify: `packages/members/src/application/learning/learning.service.ts`
- Test: testes de `packages/core/src/learning/scene/`, `packages/core/tests/learning.test.ts`, `packages/members/tests/`

**Interfaces:**
- Produces: `LearningActivity = ExperimentationActivity | HtmlActivity`; sessão de cena somente `ExperimentSession`.
- Consumes: `sceneTargets`, `blockPrediction`, `blockCheckpoint` e `evaluateExperimentation` atuais.

- [ ] Escrever testes que rejeitam `demonstration` e `question`, preservam previsão/pergunta anexada e validam a sessão de experimentação.
- [ ] Rodar testes focados para confirmar a falha esperada.
- [ ] Retirar `SceneStep`, os 45 `script`, validadores e sessões de demonstração; retirar a pergunta curta e a migração que a fabricava.
- [ ] Ajustar DTO e serviço para o contrato único de cena; remover o template de seção que criava demonstração.
- [ ] Rodar testes focados e typechecks de core/members; revisar o diff.

### Task 3: Remover autoria e player dos formatos extintos

**Files:**
- Modify: `packages/admin/src/components/editor/learning-builder.tsx`, `scene-picker.tsx`, `lesson-editorial-warnings.ts`, `voz-zappy-button.tsx`
- Modify: `packages/admin/src/lib/scene-authoring-rules.ts`, `lesson-authoring.ts`
- Modify: `packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx`
- Remove: `packages/admin/src/components/editor/scene-authoring.tsx`
- Modify: `packages/member-shell/src/components/scene-activity.tsx`, `learning-activity.tsx`, `scene-frame.tsx`, `lib/scene-controller.ts`
- Remove: `packages/member-shell/src/components/scene-sandbox.tsx`, `scene-demo-controls.tsx`
- Test: testes de autoria, player e cenas dos dois pacotes.

**Interfaces:**
- Consumes: a união de duas atividades da Task 2 e `sceneDisplaySamples` da Task 1.
- Produces: um único fluxo de cena manipulável para Kids e Adulto, com HTML personalizado como outro tipo de bloco.

- [ ] Ajustar testes de autoria e player para o seletor de dois tipos e fluxo de experimentação.
- [ ] Rodar testes focados para registrar a falha esperada.
- [ ] Remover ramificações, controles e componentes exclusivos da demonstração e da pergunta curta.
- [ ] Rodar typechecks, testes focados e revisão do diff.

### Task 4: Varredura, documentação e commit local

**Files:**
- Modify: documentação de cenas em `packages/{core,admin,member-shell,members}/CLAUDE.md` e instruções diretamente afetadas em `docs/aulas-interativas/`.
- Include: `packages/community-kids/src/app/(app)/cursos/[slug]/page.tsx` já alterado antes desta tarefa.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: árvore `staging` local commitada, sem push.

- [ ] Varredura de referências a `demonstration`, `question`, `SceneStep` e `script` no fluxo de aulas; atualizar testes/fixtures que ainda afirmem o modelo antigo.
- [ ] Validar os 27 manifestos/55 experimentações e executar typechecks, testes relevantes e check dos arquivos alterados.
- [ ] Revisar `git diff` e incluir somente esta tarefa e o card de materiais aprovado, preservando mudanças simultâneas alheias.
- [ ] Commitar o lote na branch `staging`; confirmar o hash e verificar que não restaram mudanças deste lote.
