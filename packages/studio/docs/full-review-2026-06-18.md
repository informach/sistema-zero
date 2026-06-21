# Studio — 6º full review (2026-06-18)

## Contexto

Pedido: "faça um full review no studio". Sexta rodada. As cinco anteriores cobriram
round-trip Blocos⇄Código, concorrência/multi-instância, segurança do preview
(CSP/loopGuard/permissionGuard), persistência sob quota e a11y. Esta rodada focou no
trabalho **mais novo e menos revisado**: a divisão `StudioCore` + `<StudioEditor>`/
`<StudioLesson>` e, sobretudo, a **auto-correção de atividades** (correção HÍBRIDA
cliente/servidor) introduzida ontem no `staging` (commit `89275f6`) — ainda
PRÉ-PRODUÇÃO.

## Metodologia

Leitura dirigida da fatia nova (runner `src/activity/*`, `studio/activity.ts`,
`checksStore`, `ActivityPanel`, `StudioCore`, canal `checkResult` em
`preview/types.ts`) cruzada com o espelho server-side (`members/.../studio-activity.ts`),
o gerador de JS (`generators/js.ts`), o IR (`ir/schema.ts`) e o admin
(`activity-builder.tsx`). Os dois achados de segurança/CSP foram **verificados
empiricamente num Chromium real** (Playwright) sob a CSP EXATA do preview — não só por
leitura.

Baseline no início: typecheck limpo, biome limpo, **1014 testes**. Gate final: **tsc 0 ·
biome 0 · 1028 testes pass / 0 fail** (+14 de regressão).

## Achados confirmados e RESOLVIDOS

### ALTO

**#A — A atividade não existia no layout NARROW.** `Shell.tsx` montava o
`<ActivityPanel/>` só no ramo wide; `NarrowLayout.tsx` renderizava só o `<ModeArea/>`.
Com a largura do PRÓPRIO Studio < 768px (kids no celular/tablet, embed estreito) sumiam
o enunciado e o botão **"Verificar"**. Sem "Verificar", `checksStore.lastResult` ficava
`null` → `StudioHandle.getActivityResult()` devolvia `null` → o member-shell enviava
`results: undefined` → o `gradeStudioActivity` do members marcava **toda** checagem
`behavior`/`testcase`/`code` como `passed:false` ("sem resultado reportado"). Com
`passingScore` + qualquer checagem não-estrutural, o gate (`STUDIO_GATE_NOT_PASSED`)
**bloqueava a conclusão da aula sem o aluno ter como consertar naquele aparelho**.
**Fix:** `ActivityPanel` virou responsivo (faixa de topo `w-full max-h-[45%] border-b`
no narrow; coluna lateral `w-80 border-r` no wide) e é montado também no `NarrowLayout`
(continua self-gating). De quebra, o `ModeArea` foi para um wrapper `min-w-0 flex-1`
(TODO adiado no Shell — a raiz do modo é `w-full` e estouraria o split ao lado do
painel). Regressão em `components/layout/ActivityPanel.test.tsx`.

**#C — A checagem `code` estava MORTA sob a CSP do preview.** `harness.ts` rodava
`new Function('ctx', c.source)`, mas a CSP (`preview/csp.ts`) tem
`script-src 'unsafe-inline' data: blob:` — **sem `'unsafe-eval'`**. Verificado no
Chromium real: `new Function` → `EvalError` (bloqueado). Toda checagem `code` lançava e
reportava `passed:false` — e o admin oferece "Código (JS)" como tipo de 1ª classe (com o
placeholder `return ctx.getGlobal("total") === 10;`). O teste do harness só compilava a
STRING (sem CSP), então não pegava. **Fix:** o `code` agora roda num `<script>` INLINE
injetado (`createElement('script')` + `textContent`; a CSP libera `'unsafe-inline'`) —
sem `eval`/`new Function`. `textContent` não é re-tokenizado como HTML, então `</script>`
no corpo do professor é inócuo (sem escape). **Verificado E2E** sob a CSP real: positivo
`passed:true`, negativo `passed:false`.

### MÉDIO

**#B — `globalEquals` e `ctx.getGlobal` não enxergavam variáveis de bloco.** O harness
lia `window[name]`, mas o gerador emite as variáveis de topo como `let`/`const`
(`generators/js.ts:309-313`), que em script clássico são globais LÉXICAS — **não viram
propriedade de `window`** (verificado: `window['pontos']` → `undefined`; `let` de topo
inacessível por `window[...]`; `function` de topo SIM, então `testcase` sempre funcionou).
Resultado: `globalEquals` (comportamento) e `ctx.getGlobal` (escape `code`) retornavam
`undefined` em silêncio para qualquer variável de bloco. **Fix:** novo `readGlobal(name)`
no harness — tenta `window[name]` primeiro (var/function/`window.x=`) e, se não achar,
lê a global léxica por referência crua dentro de um `<script>` inline (mesmo truque do
`code`; `eval` indireto também é barrado pela CSP, confirmado). **Verificado E2E:**
`globalEquals total=3` sobre um `let total` → `passed:true`.

### BAIXOS

**#D — `getActivityResult()` podia vazar a nota de um projeto anterior.**
`checksStore.lastResult` não era invalidado ao (re)hidratar o projeto — então um
`handle.replaceProject()` / carregar a próxima aula da cadeia (carryover) deixava o
último resultado preso, e o host o anexaria no envio do projeto NOVO. **Fix:**
`StudioCore` reseta `lastResult` no efeito de hidratação e no unload. (A defasagem
"editou depois do Verificar" segue como trade-off documentado da correção híbrida — só
`structure` é recalculado no servidor e é imune; behavior/testcase/code são formativos.)

**#F — O enunciado aparecia como markdown CRU.** O `ActivityPanel` mostrava
`activity.instructions` como texto puro (`whitespace-pre-wrap`), mas o admin autora rich
text → **markdown** (TipTap), então o aluno via `**negrito**`/`#`/`- ` literais. **Fix:**
`renderLessonMarkdown` (puro, sem dependência, escape-FIRST + subconjunto seguro:
títulos, listas, negrito/itálico, código, links com href saneado a http(s)/mailto) +
`dangerouslySetInnerHTML`. Cobertura de XSS em `lessonMarkdown.test.ts`
(`<script>`/`<img onerror>` escapados; `javascript:`/`data:` não viram âncora).

## Áreas auditadas que saíram LIMPAS

- **Anti-cola server-side correto:** os tipos de regra de `structure.ts`
  (`repeat`/`while`/`doWhile`/`forOf`/`forRange`/`forEach`, `var`/`declareVar`,
  `funcDecl`, `callFunction`/`call`) casam com o IR (`ir/schema.ts`) e com o espelho do
  members; `someJsNode` varre expressões (pega `call`).
- **Harness à prova de injeção:** checagens via `JSON.parse`, `</script` neutralizado no
  payload, `ev.source`+origin autenticados no `sandbox.ts`, tamanhos clampados
  (`isCheckResultMessage`). O iframe do runner é null-origin (`allow-scripts
  allow-modals`, sem `allow-same-origin`), com timeout e cleanup.
- **Divisão `StudioCore`:** preservou as chaves de memoização primitiva
  (`allowedModesKey`/`resolvedModesKey`); a atividade é latcheada e o contexto é
  self-gating (o `<StudioEditor>` não paga pela feature de aula).
- A CSP segue **intocada** — o conserto de B/C usa só `'unsafe-inline'` (já liberado),
  sem enfraquecer a política (sem `'unsafe-eval'`, sem mexer em `connect-src`/`script-src
  https:`).

## Gate final

- `tsc --noEmit` — limpo
- `biome check .` — limpo
- `bun test src` — **1028 pass / 0 fail** (117 arquivos; baseline 1014 + 14 de regressão)
- Verificação E2E (Playwright, CSP real): 5 checagens corretas `passed:true` (incl.
  `globalEquals`/`code`) + 3 negativas `passed:false`.

## Observação

A feature de auto-correção está no `staging` (pré-produção) — os 3 achados principais
foram pegos ANTES de ir ao ar. Como `code`/`globalEquals` rodam JS dinâmico sob a CSP,
qualquer mudança futura no harness DEVE ser re-verificada num browser real (o `bun test`
não enforça CSP).
