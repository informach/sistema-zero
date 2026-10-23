---
status: resolved
file: packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/studio-solution-field.tsx
line: 16
severity: medium
author: codex
provider_ref:
---

# Issue 003: Nome válido do inicial produz gabarito inválido

## Review Comment

`solutionFrom` acrescentava onze unidades UTF-16 de " (gabarito)" sem respeitar o máximo canônico de 200. Um inicial válido com nome entre 190 e 200 produzia um gabarito rejeitado pelo Core e por `refinePythonProjectDocument`. O revisor reproduziu a falha com os leitores reais; não é problema de transporte ou de navegador.

## Triage

- Decision: `VALID`
- Correction: Limite compartilhado `STUDIO_PROJECT_NAME_MAX_LENGTH` no Core; a fábrica também usa `StudioProjectNameSchema`. A cópia reserva espaço para o sufixo e limita apenas o nome gerado, percorrendo codepoints sem partir pares surrogate. O inicial e seu fonte permanecem intactos.
- Revalidation: Regressão RED falhou na validação canônica do gabarito. GREEN: 1 teste/72 asserções nas quatro variantes JS/Python clássico/Pro, com nomes 190/200 e emoji na borda. O revisor repetiu o teste e confirmou também o leitor Python real. Evidências `staging-admin-solution-name-red-1.log`, `staging-admin-solution-name-green-1.log` e relatório independente do Admin. Tipos, suíte ampla e fingerprint da imagem devem ser repetidos após esta última alteração.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
