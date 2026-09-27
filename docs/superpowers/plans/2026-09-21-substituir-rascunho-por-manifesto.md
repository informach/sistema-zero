# Substituir o rascunho por manifesto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que a autora troque atomicamente todo o rascunho de uma aula por um novo manifesto, com prévia explícita das remoções e sem tocar na versão publicada.

**Architecture:** A escolha `preserve | replace` atravessa Admin, DTO HTTP e `LearningImportService`. O serviço continua construindo um documento completo antes de chamar `repository.replace`; no modo `replace`, blocos ausentes não entram nesse documento e aparecem na prévia como `remove`. Blocos mantidos pela mesma chave continuam usando `importedContent` e a reconciliação de vídeos planejados já existentes.

**Tech Stack:** React 19, Next.js 16, Elysia 1.4/TypeBox, TypeScript, Bun test, happy-dom.

**Spec:** `docs/plans/2026-09-21-redesenho-didatico-aulas-interativas-design.md`, seção “Troca rápida do rascunho no Admin”.

## Global Constraints

- `preserve` continua sendo o padrão para compatibilidade com chamadas e fluxos existentes.
- `replace` afeta somente `lesson_drafts`; não publica nem arquiva blocos da versão publicada.
- O modo usado na prévia deve ser reenviado na aplicação para reconstruir exatamente o documento conferido.
- Conteúdos omitidos são removidos independentemente do tipo; conteúdos com a mesma chave mantêm ID e dados operacionais já reconciliados por `importedContent`.
- Não criar botão separado de limpeza nem estado intermediário com rascunho vazio.
- Não alterar os testes modificados pelo usuário em `packages/pinta/src/**`.

---

## Task 1: Levar o modo de importação pela fronteira HTTP

**Files:**

- Modify: `packages/members/src/interfaces/http/learning.dtos.ts:671`
- Modify: `packages/members/src/interfaces/http/routes/learning.routes.ts:211`
- Modify: `packages/members/tests/integration/learning-import.test.ts`

- [ ] **Step 1: Write the failing HTTP test**

Estender o helper do teste para aceitar `mode` e criar um caso que envie `replace` tanto para
`import-preview` quanto para `import-learning`. O caso deve começar com um bloco avulso no rascunho,
confirmar que a prévia o classifica como removido e que a aplicação o elimina, mantendo a leitura
publicada idêntica.

```ts
const preview = (mode: 'preserve' | 'replace' = 'preserve') =>
  request('import-preview', { document, mode })
const apply = (expectedFingerprint: string, mode: 'preserve' | 'replace' = 'preserve') =>
  request('import-learning', { document, mode, expectedFingerprint, operationId: randomUUID() })
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `bun test packages/members/tests/integration/learning-import.test.ts`

Expected: FAIL porque o DTO remove ou rejeita `mode` e a prévia ainda preserva o bloco omitido.

- [ ] **Step 3: Add the request contract and route forwarding**

Definir uma única constante de schema reutilizada pelos dois corpos:

```ts
const LearningImportMode = t.Optional(t.Union([t.Literal('preserve'), t.Literal('replace')]))
```

Adicionar `mode` a `LearningImportPreviewBody` e `LearningImportApplyBody`. Nas duas rotas, encaminhar
`body.mode` ao serviço. A omissão continua significando `preserve`.

- [ ] **Step 4: Run the focused test to expose only the missing service behavior**

Run: `bun test packages/members/tests/integration/learning-import.test.ts`

Expected: o contrato aceita `mode`; o novo caso ainda falha porque o serviço não remove o bloco.

---

## Task 2: Construir uma prévia completa e substituir atomicamente o rascunho

**Files:**

- Modify: `packages/members/src/application/learning/learning-import.service.ts`
- Modify: `packages/members/tests/integration/learning-import.test.ts`
- Modify: `packages/members/tests/db/lesson-draft-cases.ts`
- Modify: `packages/members/CLAUDE.md`

- [ ] **Step 1: Strengthen the failing integration test**

O caso deve comprovar que a prévia inclui a ação `remove` e `removedSections`. Depois da aplicação,
conferir que bloco e seção omitidos sumiram, que um Studio mantido conserva ID e `initialProject`,
que a versão publicada ficou idêntica e que a repetição pelo mesmo `operationId` é idempotente.

- [ ] **Step 2: Implement the import mode in the service**

```ts
export type LearningImportMode = 'preserve' | 'replace'

async preview(lessonId: string, manifest: unknown, mode: LearningImportMode = 'preserve')
```

Acrescentar `remove` ao tipo de ação. Depois de construir as seções do manifesto, calcular os blocos
omitidos. Em `replace`, registrá-los como removidos sem recolocá-los no documento; em `preserve`,
manter aposentadoria explícita, retenção e realocação atuais. Calcular `removedSections` comparando
IDs antigos e novos. Não copiar `plannedVideos` cujo bloco deixou de existir.

- [ ] **Step 3: Make apply rebuild the exact selected mode**

```ts
async apply(
  lessonId: string,
  manifest: unknown,
  expectedFingerprint: string,
  authorId: string,
  operationId: string,
  mode: LearningImportMode = 'preserve',
) {
  const plan = await this.preview(lessonId, manifest, mode)
  // repository.replace permanece a única escrita
}
```

- [ ] **Step 4: Add the real-database invariant where available**

Em `lesson-draft-cases.ts`, executar uma reimportação em `replace` depois de criar conteúdo omitido.
Confirmar que o rascunho perde esse conteúdo e `findLessonWithContent` continua igual ao publicado.

- [ ] **Step 5: Document the route contract**

Atualizar “Aulas por seções” em `packages/members/CLAUDE.md`: `preserve` é padrão; `replace` torna o
manifesto a fonte completa do rascunho, preserva dados operacionais das chaves mantidas e não altera
o publicado.

- [ ] **Step 6: Verify the members slice**

```powershell
bun test packages/members/tests/integration/learning-import.test.ts
bun run --filter @sistemazero/members typecheck
bun run --filter @sistemazero/members check
```

Expected: PASS.

- [ ] **Step 7: Commit Tasks 1 and 2**

```powershell
git add packages/members/src/application/learning/learning-import.service.ts packages/members/src/interfaces/http/learning.dtos.ts packages/members/src/interfaces/http/routes/learning.routes.ts packages/members/tests/integration/learning-import.test.ts packages/members/tests/db/lesson-draft-cases.ts packages/members/CLAUDE.md
git commit -m "feat(learning): substituir rascunho por manifesto"
```

---

## Task 3: Oferecer o modo destrutivo com confirmação no Admin

**Files:**

- Modify: `packages/admin/src/components/editor/lesson-manifest-import.tsx`
- Create: `packages/admin/tests/lesson-manifest-import.test.tsx`
- Modify: `packages/admin/CLAUDE.md`

- [ ] **Step 1: Write the failing component test**

Renderizar o componente real em happy-dom e substituir somente `apiSend`, a fronteira de rede. O
mock deve devolver a estrutura completa da prévia. Simular seleção de substituição, prévia com bloco
e seção removidos, confirmação e aplicação.

Asserções: preview recebe `mode: 'replace'`; remoções aparecem; botão final fica desabilitado antes
da confirmação; apply recebe o mesmo modo, fingerprint e operationId; mudar modo ou fonte invalida a
prévia.

- [ ] **Step 2: Run the focused Admin test and confirm it fails**

Run: `bun test packages/admin/tests/lesson-manifest-import.test.tsx`

Expected: FAIL porque não existe seletor, lista de remoções ou confirmação.

- [ ] **Step 3: Implement controlled mode selection**

```ts
type ImportMode = 'preserve' | 'replace'
const [mode, setMode] = useState<ImportMode>('preserve')
const [replacementConfirmed, setReplacementConfirmed] = useState(false)
```

Renderizar rádios nativos controlados. Mudar o modo gera novo `operationId` e limpa prévia, erro,
aviso e confirmação. Enviar `mode` nas duas chamadas.

- [ ] **Step 4: Render the destructive preview and gate apply**

Estender `Preview` com `removedSections` e ação `remove`. Em `replace`, mostrar listas de seções e
blocos que sairão, checkbox de ciência e botão “Substituir rascunho”, desabilitado até confirmação.
Em `preserve`, manter “Aplicar ao rascunho desta aula” sem confirmação extra.

- [ ] **Step 5: Document the Admin behavior**

Atualizar `packages/admin/CLAUDE.md` junto da importação/exportação: modo preservador padrão, modo de
substituição, prévia obrigatória, confirmação e garantia de que o publicado não muda.

- [ ] **Step 6: Verify the Admin slice**

```powershell
bun test packages/admin/tests/lesson-manifest-import.test.tsx packages/admin/tests/learning-import-sync.test.ts
bun run --filter @sistemazero/admin typecheck
bun run --filter @sistemazero/admin check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add packages/admin/src/components/editor/lesson-manifest-import.tsx packages/admin/tests/lesson-manifest-import.test.tsx packages/admin/CLAUDE.md
git commit -m "feat(admin): oferecer substituicao integral do rascunho"
```

---

## Task 4: Verificação integrada e documentação da decisão

**Files:**

- Modify: `docs/plans/2026-09-21-redesenho-didatico-aulas-interativas-design.md`

- [ ] **Step 1: Confirm the approved design is recorded**

Conferir os dois modos, confirmação, atomicidade, preservação por chave e isolamento do publicado.

- [ ] **Step 2: Run all focused verification again from a clean process**

```powershell
bun test packages/members/tests/integration/learning-import.test.ts
bun test packages/admin/tests/lesson-manifest-import.test.tsx packages/admin/tests/learning-import-sync.test.ts
bun run --filter @sistemazero/members typecheck
bun run --filter @sistemazero/admin typecheck
```

Expected: PASS sem depender das alterações em `packages/pinta/src/**`.

- [ ] **Step 3: Inspect the final diff**

```powershell
git diff --check
git status --short
```

Confirmar que não houve alteração do publicado, migration, botão “apagar tudo” nem edição dos
arquivos Pinta já modificados pela usuária.

- [ ] **Step 4: Commit the design and plan**

```powershell
git add docs/plans/2026-09-21-redesenho-didatico-aulas-interativas-design.md docs/superpowers/plans/2026-09-21-substituir-rascunho-por-manifesto.md
git commit -m "docs(learning): planejar troca integral do rascunho"
```
