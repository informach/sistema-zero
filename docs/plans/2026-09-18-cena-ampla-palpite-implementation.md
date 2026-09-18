# Cena ampla no palpite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o card redundante do recurso e dar à prévia e à cena aberta toda a largura útil do card da atividade.

**Architecture:** A informação do recurso permanece no contexto falado/escrito do palpite; somente a caixa visual redundante sai. As duas molduras que contém palco, antes e depois da escolha, deixam de limitar a largura com `max-w-scene`, mantendo borda, cantos, proporção interna e o fluxo normal de instruções e controles.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Bun Test e Testing Library.

**Spec:** `docs/plans/2026-09-18-cena-ampla-palpite-design.md`

## Global Constraints

- Não usar `100vh`, altura fixa ou escalonamento CSS para ampliar a cena.
- A prévia continua estática, segura, sem controles e com `role="img"`.
- O palco aberto e a prévia mantêm `w-full`; somente `max-w-scene` e a centralização que o acompanhava saem dessas molduras.
- Não modificar os arquivos atualmente alterados pela outra sessão fora dos trechos exatos deste lote.
- Não alterar motor, avaliação, regras do palpite, conteúdo dos manifestos ou áudio do Zappy.

---

### Task 1: Travar a hierarquia visual do palpite

**Files:**
- Modify: `packages/community-kids/tests/lesson-scene-design.test.tsx`
- Modify: `packages/member-shell/src/components/scene-prediction.tsx`
- Modify: `packages/member-shell/src/components/scene-prediction-preview.tsx`

**Interfaces:**
- Consumes: `ScenePrediction` e `ScenePredictionPreview`, ambos renderizados pelo player compartilhado.
- Produces: palpite com apenas contexto, prévia e escolhas; prévia sem teto de largura.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao `describe('a prévia antes do palpite')` uma asserção que mantenha o rótulo acessível e a ocultação de controles, mas rejeite o teto visual:

```tsx
expect(previa.className).toContain('w-full')
expect(previa.className).not.toContain('max-w-scene')
expect(previa.className).not.toContain('mx-auto')
```

Acrescentar ao teste do palpite uma asserção de que `Hoje vamos usar:` não aparece como texto próprio, enquanto `prediction.context.explanation` continua presente no balão.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
cd packages/community-kids
bun test tests/lesson-scene-design.test.tsx --dots
```

Expected: falha porque a prévia ainda contém `mx-auto max-w-scene` e o card “Hoje vamos usar” ainda é renderizado.

- [ ] **Step 3: Remover apenas a redundância visual**

Em `scene-prediction.tsx`, remover este bloco, sem alterar `prediction.context`, a fala ou as alternativas:

```tsx
<p className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
  Hoje vamos usar: <span className="font-bold">{prediction.context.label}</span>
</p>
```

Em `scene-prediction-preview.tsx`, trocar a moldura por:

```tsx
className="w-full overflow-hidden rounded-2xl border border-border [&_.sz-scene-frame]:rounded-none [&_.sz-scene-frame]:border-0 [&_button]:hidden [&_input]:hidden [&_select]:hidden [&_textarea]:hidden [&_[role=button]]:hidden [&_[role=slider]]:hidden"
```

- [ ] **Step 4: Rodar o teste para confirmar o resultado**

Run:

```powershell
cd packages/community-kids
bun test tests/lesson-scene-design.test.tsx --dots
```

Expected: passa, com prévia segura e ampla e sem opção visual extra.

- [ ] **Step 5: Commit**

```powershell
git add -- packages/member-shell/src/components/scene-prediction.tsx packages/member-shell/src/components/scene-prediction-preview.tsx packages/community-kids/tests/lesson-scene-design.test.tsx
git commit -m "feat(kids): ampliar cena e simplificar palpite"
```

### Task 2: Ampliar o palco depois da escolha e revisar o lote

**Files:**
- Modify: `packages/member-shell/src/components/scene-activity.tsx:1251`
- Test: `packages/community-kids/tests/lesson-scene-design.test.tsx`

**Interfaces:**
- Consumes: a moldura que já contém `SceneReadoutBand` e `ExplorationStage`.
- Produces: palco aberto com a mesma largura útil da prévia, sem alterar estado, controles ou o readout.

- [ ] **Step 1: Estender o teste para o palco aberto**

Depois de escolher uma alternativa numa cena de experimentação, localizar a moldura que contém `.sz-scene-frame` e verificar que o pai direto continua `w-full`, mas não contém `max-w-scene` nem `mx-auto`.

```tsx
const frame = document.querySelector('.sz-scene-frame')
const moldura = frame?.parentElement
expect(moldura?.className).toContain('w-full')
expect(moldura?.className).not.toContain('max-w-scene')
expect(moldura?.className).not.toContain('mx-auto')
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
cd packages/community-kids
bun test tests/lesson-scene-design.test.tsx --dots
```

Expected: falha porque a moldura aberta ainda usa `mx-auto w-full max-w-scene`.

- [ ] **Step 3: Remover o teto da moldura aberta**

Em `scene-activity.tsx`, no `div` que contém `SceneReadoutBand` e `ExplorationStage`, trocar o início da lista de classes de:

```tsx
mx-auto w-full max-w-scene overflow-hidden
```

para:

```tsx
w-full overflow-hidden
```

Não mudar o `fieldset`, a faixa, o anel de foco, o `RelogioDaArteProvider` ou qualquer regra de interação.

- [ ] **Step 4: Verificar o lote completo**

Run:

```powershell
cd packages/community-kids
bun test tests/lesson-scene-design.test.tsx tests/lesson-experimentation.test.tsx tests/lesson-scene-experiencia.test.tsx --dots
cd ..\member-shell
bun run typecheck
cd ..\..
git diff --check
```

Expected: todos os testes e typecheck passam; o diff contém somente a remoção do card, as duas molduras fluidas e seus testes.

- [ ] **Step 5: Full review e commit**

Revisar no diff que contexto, opções, acessibilidade da prévia, regras de bloqueio e controles continuam inalterados. Confirmar que nenhum arquivo da outra sessão foi incluído no índice e criar o commit descrito na Task 1, se ainda não houver sido criado.
