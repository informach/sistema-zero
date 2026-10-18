---
status: resolved
file: packages/studio/src/blockly/codeIdeas.ts
line: 146
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Análise incompleta vira reprovação persistida de objetivo

## Review Comment

`collectCodeIdeas` pula silenciosamente um arquivo maior que o orçamento restante de 500.000 caracteres e retorna as contagens parciais como se a análise estivesse concluída. O mesmo ocorre ao atingir 200.000 nós. No Pro não existe IR para recuperar a ideia omitida, então uma ideia presente no código pode ser julgada ausente e o Members guarda a reprovação. O projeto ainda é válido para o limite do Members, que aceita até 1.500.000 caracteres em `MAX_STUDIO_PROJECT_CHARS`.

Reprodução independente em `bun .cache/studio-python-l0/staging-review-20261018-analysis-budget-probe.ts`: projeto Pro com `main.js` contendo `for (;;) { break; }` e espaços após o código, total JSON de 500.084 caracteres; inicial Pro vazio; regra obrigatória válida `usesLoop`. O harness usa o `checkProject` real de `SectionProgressionService`, os avaliadores reais Studio/Core e o `runExecution` real do snapshot `4be50bbc`; somente portas de autorização/revisão/persistência são controladas, sem banco/browser/build. O validador real `isSectionCompletion` aceita a regra. `checkProject` aceita o projeto, retorna `passed:false` e chama `saveSectionProgress` com `objectiveResults:[{id:'loop',passed:false}]` e `projectPassed:false`. Saída: `acceptedMaxChars:1500000,analysisLoops:0,persistedFalse:true`; exit0.

O teto de CPU/memória é legítimo e deve permanecer. O defeito é equiparar “não consegui analisar tudo” a “o aluno não fez”. Retornar um estado explícito de análise incompleta quando algum arquivo/nó relevante for omitido; impedir a comparação/persistência como reprovação e dar mensagem acionável. Alternativamente, declarar e validar um limite de fonte coerente antes da avaliação, sem salvar resultado falso. Manter distinção entre parsing inválido do código do aluno e orçamento esgotado do analisador. Se houver resultados parciais positivos, não inferir ausência em partes não inspecionadas nem aprovar o conjunto como completamente verificado.

Cobrir limite de arquivo, orçamento acumulado por múltiplos arquivos, teto de nós e garantir que resultado não avaliável não grava objectiveResults/XP. Não remover os limites nem alterar o baseline intencional de ideias acrescentadas ao inicial.

## Triage

- Decision: `VALID`
- Notes: Medium confirmado pelo caminho real Members até a porta de persistência, com fonte/régua válidas e abaixo do limite aceito. Distinto da issue001: este limite é do analisador sintático, sem execução/sandbox. Formalização solicitada pela raiz como issue004; nenhum arquivo de produção alterado pelo revisor.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
