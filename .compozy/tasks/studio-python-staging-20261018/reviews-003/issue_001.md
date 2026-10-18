---
status: resolved
file: packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/studio-solution-field.tsx
line: 66
severity: medium
author: codex
provider_ref:
---

# Issue 001: Gabarito Python sem contexto de autorização

## Review Comment

O campo de gabarito recebia o projeto e seu handle, mas não o `runtimeScope` que o inicial recebia. O hook `useStudioAuthoringRuntime` não prepara ambiente sem esse contexto; o documento com referência de runtime não concede autorização. Assim, o gabarito Python preservava o fonte, mas não habilitava seus blocos, análise e execução. Repetir a tentativa sem contexto não corrigia o fluxo.

## Triage

- Decision: `VALID`
- Correction: O pai deriva um contexto de autoria vigente e o fornece aos dois campos. O gabarito repassa scope e opções ao `StudioEmbed`, com `professionalAuthoring`; seu id próprio dá origem a outra autorização, sem compartilhar o interpretador do inicial.
- Revalidation: A regressão em `studio-authoring-ui.test.tsx` usa o hook e a borda HTTP reais, substituindo apenas o motor de edição. Prova ausência de ambiente sem scope, admissão pelo id do gabarito, nível Python 3, preservação do inicial e aborto ao trocar a revisão. Admin full3: 650 testes/2354 asserções; TSC3 EXIT0. Revisão independente em `.cache/studio-python-l0/staging-admin-remediation-review.md`. Browser e gates globais finais ainda pendentes.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
