# Palpite do leitor de tela Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a pergunta do palpite do leitor de tela e apresentar o botão citado como uma prévia visualmente fiel, mas indisponível antes da resposta.

**Architecture:** A definição da pergunta permanece no catálogo compartilhado do Core. O componente de prévia do Member Shell separa o palco puramente ilustrativo do controle explicativo: o primeiro mantém `role="img"` e oculta controles internos; o segundo renderiza `SceneButton` desativado, sem despachar ações. A Comunidade Kids continua usando esses dois componentes sem adaptar o fluxo localmente.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Bun Test e Testing Library.

**Spec:** `docs/plans/2026-09-18-palpite-leitor-de-tela-design.md`

## Global Constraints

- Não alterar motor, avaliação, persistência, manifestos ou áudio do Zappy.
- Não modificar os arquivos alterados por outras sessões.
- A prévia continua sem controles ativos e com `role="img"` no palco.
- O botão de prévia deve usar o mesmo componente e tom do botão que a criança usará depois.
- Não alterar outras previsões sem uma inconsistência equivalente, comprovada pela auditoria.

---

### Task 1: Proteger a semântica da pergunta

**Files:**
- Modify: `packages/core/src/learning/scene/questions.ts:357-390`
- Test: `packages/core/src/learning/scene/questions.test.ts:92-97`

**Interfaces:**
- Consumes: `SCENE_QUESTIONS['screen-reader'].prediction`.
- Produces: `prompt` que descreve o gesto “Ouvir a tela” seguido da leitura, sem sugerir que ela ocorre antes.

- [x] **Step 1: Escrever a expectativa de linguagem precisa**

No teste existente do leitor de tela, acrescentar:

```ts
expect(prompt).toContain('Quando você apertar')
expect(prompt).toContain('sem escrever uma descrição do jogo')
expect(prompt).not.toContain('Antes de apertar')
```

- [x] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
cd packages/core
bun test src/learning/scene/questions.test.ts --dots
```

Expected: falha porque a pergunta ainda começa por “Antes de apertar”.

- [x] **Step 3: Corrigir a pergunta no catálogo**

Trocar somente o `prompt` do leitor de tela por:

```ts
'Quando você apertar “Ouvir a tela” sem escrever uma descrição do jogo, o que o leitor de tela vai dizer?'
```

- [x] **Step 4: Confirmar o catálogo e a auditoria**

Run:

```powershell
cd packages/core
bun test src/learning/scene/questions.test.ts src/learning/scene/prediction-preview.test.ts --dots
```

Expected: passa. A revisão de todas as previsões registra que nenhuma outra pergunta afirma que um efeito ocorre antes de sua ação.

### Task 2: Tornar o controle da prévia fiel e seguro

**Files:**
- Modify: `packages/member-shell/src/components/scene-prediction-preview.tsx`
- Test: `packages/member-shell/tests/scene-prediction-layout.test.tsx`

**Interfaces:**
- Consumes: `ScenePredictionPreview.control`, com `label` e `note`, e `SceneButton` de `exploration-stage.tsx`.
- Produces: controle em `data-preview-control` com `SceneButton` de `tom="gesto"`, `disabled` e `aria-describedby` para a nota.

- [x] **Step 1: Escrever a expectativa estrutural**

Substituir a expectativa de ausência de botão por verificações de marcação estática:

```ts
expect(html).toContain('data-preview-control')
expect(html).toContain('disabled=""')
expect(html).toContain('Ouvir a tela')
expect(html).toContain('Você vai usar este botão depois do seu palpite.')
expect(html).toContain('aria-describedby')
```

O teste também deve manter a exigência de `w-full`, ausência de `max-w-scene` e ocultação dos controles internos do palco.

- [x] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
cd packages/member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
```

Expected: falha porque o cartão atual não possui um botão `disabled`.

- [x] **Step 3: Separar palco e botão explicativo**

Em `ScenePredictionPreview`, manter `ExplorationStage` dentro de uma região `role="img"` com a atual regra `[&_button]:hidden`. Fora dessa região, renderizar:

```tsx
<div data-preview-control className="m-3 flex flex-col items-start gap-2">
  <SceneButton tom="gesto" disabled aria-describedby={noteId}>
    <Ear size={16} />
    {control.label}
  </SceneButton>
  <p id={noteId} className="text-xs text-muted-foreground">
    {control.note}
  </p>
</div>
```

Usar `useId()` para `noteId`. Preservar `aria-label` da prévia e todos os atributos `data-*` existentes na moldura externa.

- [x] **Step 4: Rodar o teste e o typecheck**

Run:

```powershell
cd packages/member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
bun run typecheck
```

Expected: passa; o botão é semanticamente desativado, visualmente tem o tom de gesto e o palco continua não interativo.

### Task 3: Cobrir a jornada pública do Kids e revisar o lote

**Files:**
- Modify: `packages/community-kids/tests/lesson-experimentation.test.tsx:1421-1454`
- Test: `packages/community-kids/tests/lesson-experimentation.test.tsx`

**Interfaces:**
- Consumes: `ScenePredictionPreview` antes do palpite e `SceneLessonControls` após `palpitar('screen-reader')`.
- Produces: proteção de que o botão de prévia é desativado, tem o aviso associado e dá lugar ao botão funcional depois da escolha.

- [x] **Step 1: Atualizar a jornada de integração**

No teste do leitor de tela, trocar as expectativas de ausência do botão por:

```ts
const botaoDaPrevia = previa.querySelector('button') as HTMLButtonElement
expect(botaoDaPrevia.textContent).toContain('Ouvir a tela')
expect(botaoDaPrevia.disabled).toBe(true)
expect(botaoDaPrevia.getAttribute('aria-describedby')).toBeTruthy()
expect(previa.querySelector('[data-preview-control]')?.textContent).toContain(
  'Você vai usar este botão depois do seu palpite.',
)
```

Depois de `palpitar('screen-reader')`, conservar a verificação do campo e exigir que o botão funcional não esteja desativado.

- [x] **Step 2: Rodar a jornada para confirmar a falha inicial**

Run:

```powershell
cd packages/community-kids
bun test tests/lesson-experimentation.test.tsx --dots
```

Expected: falha antes da implementação, pois não existe botão na prévia.

- [ ] **Step 3: Verificar o lote completo**

Run:

```powershell
cd packages/core
bun test src/learning/scene/questions.test.ts src/learning/scene/prediction-preview.test.ts --dots
cd ..\member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
bun run typecheck
cd ..\community-kids
bun test tests/lesson-experimentation.test.tsx tests/lesson-voz-zappy.test.tsx --dots
bun run typecheck
cd ..\..
git diff --check
```

Expected: todos passam e o diff contém apenas a pergunta, a prévia e seus testes.

- [ ] **Step 4: Review e commit isolado**

Revisar o diff contra o design: o gesto vem antes da leitura na pergunta; o botão da prévia não pode disparar ação; o aviso está abaixo dele; o botão funcional só aparece na cena aberta. Verificar `git diff --cached --name-only` antes de criar:

```powershell
git add -- packages/core/src/learning/scene/questions.ts packages/core/src/learning/scene/questions.test.ts packages/member-shell/src/components/scene-prediction-preview.tsx packages/member-shell/tests/scene-prediction-layout.test.tsx packages/community-kids/tests/lesson-experimentation.test.tsx docs/plans/2026-09-18-palpite-leitor-de-tela-design.md docs/plans/2026-09-18-palpite-leitor-de-tela-implementation.md
git commit -m "fix(kids): alinhar palpite ao leitor de tela"
```

## Self-review

- **Cobertura:** Task 1 trata a causa semântica; Task 2 torna o controle reconhecível, desativado e acessível; Task 3 confirma a transição real na Comunidade Kids.
- **Placeholders:** não há etapas pendentes nem referências indefinidas.
- **Tipos:** `ScenePredictionPreview.control` já define `label` e `note`; `SceneButton` aceita atributos nativos de `button`, portanto aceita `disabled` e `aria-describedby` sem nova interface.
