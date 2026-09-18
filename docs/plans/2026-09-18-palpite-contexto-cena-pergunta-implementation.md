# Contexto, cena e pergunta no palpite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar a pergunta e as escolhas do palpite juntas depois da prévia e tornar visível, de forma estática, o controle citado pela previsão.

**Architecture:** O catálogo de cenas declara opcionalmente a ficha visual de um controle relevante. O
player divide a fala antes única do palpite em contexto e pergunta, usando duas chaves de áudio que
o Admin pré-gera. A prévia continua uma imagem sem interação; a ficha é uma representação visual
e não um `<button>`.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4, Bun Test e Testing Library.

**Spec:** `docs/plans/2026-09-18-palpite-contexto-cena-pergunta-design.md`

## Global Constraints

- A prévia não pode habilitar clique, foco, campo, seletor ou teclado antes do palpite.
- Não repetir a pergunta; ela aparece uma vez, imediatamente antes das escolhas.
- A configuração do controle é editorial no catálogo, nunca inferida por texto.
- Não manter chave de áudio antiga para a fala única; as novas duas chaves usam fallback do
  navegador até a regeneração no Admin.
- Não incluir alterações de outras sessões no índice ou no commit.

---

### Task 1: Declarar a ficha visual e dividir as falas geráveis

**Files:**
- Modify: `packages/core/src/learning/scene/catalog.ts`
- Modify: `packages/core/src/learning/scene/prediction-preview.test.ts`
- Modify: `packages/core/src/learning/scene/voz.ts`
- Modify: `packages/core/src/learning/scene/voz.test.ts`

**Interfaces:**
- Produces `preview.control?: { label: string; note: string }` para uma cena.
- Replaces `falaDoPalpite` by `falaDoContextoDoPalpite(rotulo, contexto)` and
  `falaDaEscolhaDoPalpite(pergunta)`.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao teste de prévia a expectativa literal:

```ts
expect(preview.control).toEqual({
  label: 'Ouvir a tela',
  note: 'Você vai usar este botão depois do seu palpite.',
})
```

Trocar os testes de voz para exigir quatro textos geráveis: instrução, contexto, pergunta do
palpite com alternativas e checkpoint.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run:

```powershell
cd packages/core
bun test src/learning/scene/prediction-preview.test.ts src/learning/scene/voz.test.ts
```

Expected: falha porque não existe `preview.control` e ainda há uma única fala `falaDoPalpite`.

- [ ] **Step 3: Implementar os contratos mínimos**

Em `catalog.ts`, declarar:

```ts
export interface ScenePredictionPreview {
  initial: true
  conceal: readonly ScenePredictionPreviewConceal[]
  control?: { label: string; note: string }
}
```

Configurar somente `screen-reader` com a ficha descrita no teste. Em `voz.ts`, gerar uma fala do
contexto (`rotulo + explicação`) e uma fala da pergunta (pergunta + `Pode ser`/`Ou`).
`textosFalaveisDaCena` deve devolver as duas chaves na ordem em que o player as mostra.

- [ ] **Step 4: Rodar os testes para confirmar o resultado**

Run o mesmo comando do passo 2.

- [ ] **Step 5: Commit do contrato**

```powershell
git add -- packages/core/src/learning/scene/catalog.ts packages/core/src/learning/scene/prediction-preview.test.ts packages/core/src/learning/scene/voz.ts packages/core/src/learning/scene/voz.test.ts
git commit -m "feat(lessons): separar falas do palpite"
```

### Task 2: Reordenar a interface sem liberar a cena

**Files:**
- Modify: `packages/member-shell/src/components/scene-prediction.tsx`
- Modify: `packages/member-shell/src/components/scene-prediction-preview.tsx`
- Modify: `packages/member-shell/tests/scene-prediction-layout.test.tsx`

**Interfaces:**
- Consumes `preview.control`, `falaDoContextoDoPalpite` e `falaDaEscolhaDoPalpite`.
- Produces contexto → prévia → pergunta e escolhas, com uma ficha visual estática opcional.

- [ ] **Step 1: Escrever os testes que falham**

No teste do shell, renderizar a previsão com uma prévia identificável e comparar os índices de
`explanation`, `data-testid="scene-prediction-preview"`, `prompt` e a primeira opção: eles devem
estar nessa ordem. Exigir uma `fieldset` interna com `legend` contendo o prompt.

Na prévia de leitor de tela, exigir `data-preview-control`, o texto “Ouvir a tela” e a nota. Ainda
deve não haver `<button>`, `<input>` ou `role="button"` dentro dela.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
cd packages/member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
```

Expected: falha porque contexto e pergunta ainda estão no mesmo balão e a prévia não tem ficha.

- [ ] **Step 3: Implementar a sequência**

Em `ScenePrediction`, manter o primeiro `dialogueRef` no balão do contexto; inserir `preview`; e
criar um `fieldset` interno cujo `legend` é o prompt. Renderizar o segundo balão dentro dele e
manter as alternativas logo abaixo.

Em `ScenePredictionPreview`, acrescentar uma ficha `aria-hidden` abaixo do palco quando
`preview.control` existir. Usar `<div data-preview-control>`, nunca `<button>`, e incorporar
`label` e `note` ao `aria-label` da prévia.

- [ ] **Step 4: Rodar o teste para confirmar o resultado**

Run o mesmo comando do passo 2.

- [ ] **Step 5: Commit do player**

```powershell
git add -- packages/member-shell/src/components/scene-prediction.tsx packages/member-shell/src/components/scene-prediction-preview.tsx packages/member-shell/tests/scene-prediction-layout.test.tsx
git commit -m "feat(lessons): aproximar pergunta e escolhas"
```

### Task 3: Atualizar a jornada Kids e revisar o lote

**Files:**
- Modify: `packages/community-kids/tests/lesson-experimentation.test.tsx`
- Modify: `packages/community-kids/tests/lesson-scene-design.test.tsx` (somente os hunk(s) deste
  lote, pois o arquivo já tem trabalho de outra sessão)

- [ ] **Step 1: Escrever as expectativas de integração**

Na jornada do leitor de tela, verificar que a ficha visual está presente antes da pergunta, que
não há botão real “Ouvir a tela” antes da escolha e que ele surge depois dela. No teste de design,
trocar a expectativa de “sem controles” por “sem controles interativos”, preservando a ficha
estática.

- [ ] **Step 2: Rodar e confirmar que falha antes da implementação**

```powershell
cd packages/community-kids
bun test tests/lesson-experimentation.test.tsx tests/lesson-scene-design.test.tsx --dots
```

- [ ] **Step 3: Rodar a revisão completa**

```powershell
cd packages/core
bun test src/learning/scene/prediction-preview.test.ts src/learning/scene/voz.test.ts
cd ..\member-shell
bun test tests/scene-prediction-layout.test.tsx --dots
bun run typecheck
cd ..\community-kids
bun test tests/lesson-experimentation.test.tsx tests/lesson-scene-design.test.tsx --dots
bun run typecheck
cd ..\community
bun run typecheck
cd ..\..
bunx biome check packages/core/src/learning/scene/catalog.ts packages/core/src/learning/scene/prediction-preview.test.ts packages/core/src/learning/scene/voz.ts packages/core/src/learning/scene/voz.test.ts packages/member-shell/src/components/scene-prediction.tsx packages/member-shell/src/components/scene-prediction-preview.tsx packages/member-shell/tests/scene-prediction-layout.test.tsx packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/lesson-scene-design.test.tsx
git diff --check
```

- [ ] **Step 4: Full review e commit**

Confirmar no índice que não há arquivo/hunk da outra sessão, revisar que nenhuma ficha usa um
elemento interativo e criar:

```powershell
git commit -m "test(kids): cobrir prévia do palpite"
```
