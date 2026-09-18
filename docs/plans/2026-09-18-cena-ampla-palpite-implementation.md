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
- Create: `packages/member-shell/tests/scene-prediction-layout.test.tsx`
- Modify: `packages/community-kids/tests/lesson-experimentation.test.tsx` (somente as duas
  expectativas que ainda descrevem o card removido)
- Modify: `packages/member-shell/src/components/scene-prediction.tsx`
- Modify: `packages/member-shell/src/components/scene-prediction-preview.tsx`

**Interfaces:**
- Consumes: `ScenePrediction` e `ScenePredictionPreview`, ambos renderizados pelo player compartilhado.
- Produces: palpite com apenas contexto, prévia e escolhas; prévia sem teto de largura.

> O teste compartilhado da Comunidade Kids está em edição por outra sessão. Para preservar esse
> trabalho, a cobertura nasce ao lado dos componentes no `member-shell`; o comportamento continua
> sendo validado na fonte que ambos os apps consomem.

- [ ] **Step 1: Escrever o teste que falha**

Criar `scene-prediction-layout.test.tsx` com `renderToStaticMarkup`. Ele deve montar um
`ScenePrediction` com contexto, pergunta e escolhas e provar que a explicação permanece no
balão, mas `Hoje vamos usar:` não aparece. Deve também montar a prévia e extrair a tag com
`data-testid="scene-prediction-preview"`, exigindo `w-full` e rejeitando `max-w-scene` e
`mx-auto` apenas nessa moldura.

Nas duas jornadas de palpite do teste de integração do Kids que ainda pedem `Hoje vamos usar:`,
substituir a expectativa pelo contexto no balão e pelo `aria-label` da prévia. Também deve ficar
explícito que o texto do card não aparece.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
cd packages/member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
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
git add -- packages/member-shell/src/components/scene-prediction.tsx packages/member-shell/src/components/scene-prediction-preview.tsx packages/member-shell/tests/scene-prediction-layout.test.tsx
git commit -m "feat(kids): ampliar cena e simplificar palpite"
```

### Task 2: Ampliar o palco depois da escolha e revisar o lote

**Files:**
- Modify: `packages/member-shell/src/components/scene-activity.tsx:1251`
- Test: `packages/member-shell/tests/scene-prediction-layout.test.tsx`

**Interfaces:**
- Consumes: a moldura que já contém `SceneReadoutBand` e `ExplorationStage`.
- Produces: palco aberto com a mesma largura útil da prévia, sem alterar estado, controles ou o readout.

- [ ] **Step 1: Estender o teste para o palco aberto**

No mesmo teste novo, ler a fonte de `scene-activity.tsx` e conferir a lista de classes da única
moldura que contém `SceneReadoutBand` e `ExplorationStage`: ela preserva `w-full` e não pode mais
começar por `mx-auto w-full max-w-scene`. Esse contrato de fonte evita montar o player completo,
que depende do BFF e de estado de progresso, sem abrir mão da regra visual concreta.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
cd packages/member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
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
cd packages/member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
bun run typecheck
cd ..\community-kids
bun test tests/lesson-experimentation.test.tsx tests/lesson-scene-experiencia.test.tsx --dots
cd ..\..
git diff --check
```

Expected: todos os testes e typecheck passam; o diff contém somente a remoção do card, as duas molduras fluidas e seus testes.

- [ ] **Step 5: Full review e commit**

Revisar no diff que contexto, opções, acessibilidade da prévia, regras de bloqueio e controles continuam inalterados. Confirmar que nenhum arquivo da outra sessão foi incluído no índice e criar o commit descrito na Task 1, se ainda não houver sido criado.
