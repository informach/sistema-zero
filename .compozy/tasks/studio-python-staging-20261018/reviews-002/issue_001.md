---
status: resolved
file: packages/core/src/learning/project-execution.ts
line: 344
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Tolerância numérica equipara infinitos a números finitos

## Review Comment

`executionValuesEqual` aplica tolerância relativa antes de distinguir números finitos. Para `a=Infinity` (ou `-Infinity`) e `b=42`, a igualdade estrita é falsa, mas a expressão `Math.abs(a-b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))` se torna `Infinity <= Infinity`, que é verdadeira. Assim, um objetivo `functionReturns` esperando42 aprova uma função que retorna infinito; `behavior` com comparação `equals` também aprova. O novo codec preserva e decodifica corretamente esses valores, expondo o erro da comparação — não é motivo para voltar aos marcadores ou truncar valores.

Prova independente: `bun .cache/studio-python-l0/staging-objective-remediation-probe.ts`, cwd feature. O probe importa o codec e juiz reais atuais do Core, codifica `Infinity` e `-Infinity` e avalia `functionReturns` com esperado42, além de `compareExecutionValue(...,'equals',42)`. Ambos os valores produzem `functionPassed:true, behaviorEquals:true`. Executado com exit0 nas asserções de reprodução, sem browser/build/banco. A parte inicial do mesmo probe confirma que a corrida de console da rodada001 já lança erro após a correção; são raízes distintas.

Aplicar a tolerância somente quando ambos os operandos forem finitos. Definir explicitamente igualdade de valores especiais: nenhum infinito é igual a número finito; infinitos do mesmo sinal podem usar igualdade estrita; NaN segue o contrato escolhido. Preservar os resultados dos números finitos próximos e distintos, sem desabilitar transporte de valores especiais. Cobrir ±Infinity contra finitos nos caminhos functionReturns e behavior, assim como igualdade finita/tolerância, infinito de mesmo sinal/sinais opostos e NaN.

## Triage

- Decision: `VALID`
- Notes: Medium confirmado por reprodução independente com código real. Raiz autorizou formalização na rodada002 e assumiu red/green. Este revisor não alterou produção nem marcou resolved. Distinto da rodada001/issue001 de observações incompletas.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
