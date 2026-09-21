# Palpite seletivo e experiência sem controles bloqueados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o palpite existir somente quando declarado pela autoria, mostrar apenas contexto, cena parada, pergunta e alternativas, e comparar hipótese e observação sem acerto ou erro.

**Architecture:** O Core deixa de injetar automaticamente a previsão do catálogo e mantém `SCENE_QUESTIONS` apenas como modelo de autoria. O Admin copia esse modelo quando a autora marca a opção. O Player remove a prancha e o controle estático do estado de palpite e usa uma única frase neutra de observação na retomada.

**Tech Stack:** TypeScript, React 19, Bun test, Testing Library, happy-dom.

**Spec:** `docs/plans/2026-09-21-redesenho-didatico-aulas-interativas-design.md`.

## Global Constraints

- Palpite não vale nota, não bloqueia conclusão e continua persistido por perfil/bloco/revisão.
- `SCENE_QUESTIONS` continua fornecendo modelos para o Admin e testes do motor; deixa apenas de ser aplicado implicitamente ao aluno.
- Pergunta final continua opcional pelo contrato existente e não é confundida com palpite.
- Não renderizar controle acionável, `disabled`, `inert`, desfocado ou estático antes da escolha.

---

## Task 1: Tornar o palpite realmente opcional no Core e no Admin

**Files:**

- Modify: `packages/core/src/learning/index.ts`
- Modify: `packages/core/tests/learning-two-kinds.test.ts`
- Modify: `packages/core/src/learning/scene/questions.test.ts`
- Modify: `packages/admin/src/components/editor/learning-builder.tsx`
- Modify: `packages/admin/tests/learning-builder.test.tsx`

- [x] Alterar os testes para esperar `blockPrediction(experiment) === undefined` sem campo próprio.
- [x] Fazer `blockPrediction` devolver somente `block.prediction`.
- [x] No Admin, tratar `SCENE_QUESTIONS[scene].prediction` como modelo disponível, não como conteúdo herdado.
- [x] Checkbox desmarcado significa nenhum palpite; ao marcar, copiar o modelo da cena ou `initialPrediction()`.
- [x] Trocar as orientações do editor por critérios seletivos: erro plausível, resultado rápido e pergunta conceitual.
- [x] Rodar testes focados do Core e do Admin.

---

## Task 2: Remover todos os controles da tela de palpite

**Files:**

- Modify: `packages/core/src/learning/scene/catalog.ts`
- Modify: `packages/member-shell/src/components/scene-prediction-preview.tsx`
- Modify: `packages/member-shell/src/components/scene-activity.tsx`
- Modify: `packages/member-shell/src/components/scene-console.tsx`
- Modify: `packages/member-shell/src/styles/scene.css`
- Modify: `packages/member-shell/tests/scene-prediction-layout.test.tsx`
- Modify: `packages/community-kids/tests/lesson-scene-design.test.tsx`
- Modify: `packages/community-kids/tests/lesson-experimentation.test.tsx`

- [x] Inverter os testes: durante o palpite, nenhum slider, botão de ferramenta, prancha ou `data-preview-control` existe.
- [x] Retirar `control` de `ScenePredictionPreview` e da cena `screen-reader`.
- [x] Simplificar `ScenePredictionPreview` para o palco inicial com comandos internos ocultos.
- [x] Remover `hudDaCena` e `pranchaDaCena(true)` do ramo pendente.
- [x] Remover `fechada`, `inert` e o CSS da cortina; a prancha só é montada depois da escolha.
- [x] Rodar testes focados do Member Shell e Community Kids.

---

## Task 3: Trocar veredito por comparação neutra

**Files:**

- Modify: `packages/member-shell/src/components/scene-prediction.tsx`
- Modify: `packages/member-shell/src/components/scene-activity.tsx`
- Modify: `packages/community-kids/tests/lesson-experimentation.test.tsx`
- Modify: `packages/community-kids/tests/lesson-scene-moldura.test.tsx`

- [x] Escrever testes que rejeitam “Acertou”, “Não era isso”, “errou” e “foi isso mesmo”.
- [x] Substituir `vereditoDoPalpite` por uma função de observação: `shows` da escolha ou rótulo da alternativa correta.
- [x] Formatar `Seu palpite: X. Ao testar: Y.` sem classificar a criança.
- [x] Usar aparência e ícone neutros em `AvisosDaCena`.
- [x] Preservar anúncio acessível, retomada, troca antes do primeiro gesto e armazenamento local.
- [x] Rodar as suítes focadas e typechecks do Core, Member Shell e Community Kids.
