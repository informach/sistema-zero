---
status: resolved
file: packages/studio-runtime/runtime/check-objectives.mjs
line: 468
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Observações truncadas aprovam e reprovam objetivos incorretamente

## Review Comment

No snapshot remoto `4be50bbcafa73296164b4934540312825ed06bb1`, as três serializações do executor cortam arrays e objetos silenciosamente em 200 elementos/chaves. O juiz recebe o prefixo como se fosse o valor inteiro. Uma função que retorna 201 zeros passa contra um esperado de 200 zeros e falha contra o esperado correto de 201 zeros. Ambos os esperados são aceitos por `isSectionExecutionRule` e cabem no limite de 2.000 caracteres. Isso produz falso positivo, falso negativo e pode persistir `objective_results`/`projectPassed`/XP incorretos.

Reprodução independente, sem browser, build ou banco: executar `bun .cache/studio-python-l0/staging-review-20261018-objectives-probe.ts` no worktree Python. O harness extrai a função real `callFunctionCases` do snapshot, executa-a em `node:vm` e usa o juiz e o validador reais do Core remoto. Resultado observado: `actualLength:201`, `transportLength:200`, `wrongExpected200Passes:true`, `correctExpected201Fails:true`; exit 0 com todas as asserções.

Mesma raiz, deduplicada neste achado:

- `readTargetInPage`: arrays linha 370, chaves 373; profundidade 369, getters 377 e tamanho serializado 386 substituem valores por marcadores.
- `snapshotForScript`: arrays 422, chaves 425, nomes de variáveis 443 (300 nomes); profundidade 421, getters 429 e tamanho 438 também deixam a regra julgar uma observação incompleta.
- `callFunctionCases`: arrays 468, chaves 471, profundidade 467 e limite de tamanho perto de 493. O tamanho é erro de caso, que também acaba como reprovação do aluno.
- Console: coleta linha 146 limita 200 linhas e cada linha a 300 caracteres; snapshots/leituras linhas 298/351 reutilizam a coleção incompleta. Um objetivo de presença pode falhar para texto real além do limite; regras de ausência podem aprovar sem terem observado a saída inteira.
- `runScriptRule` linhas 294–298 converte texto maior que 50.000 caracteres em `null` e entrega snapshot/console à regra sem estado de completude; ela pode retornar `true` apesar de observação incompleta.
- `packages/core/src/learning/project-execution.ts`: `isInconclusiveObservedValue` reconhece `large/deep/error` somente no topo; `judgeExecutionObservation` linha 548 compara retornos de função sem proteção recursiva. Hoje um limite de observação é convertido em `passed:false`, e não em indisponibilidade do executor.

Não comparar prefixos nem usar marcadores dentro do JSON do aluno como se fossem valores. Serializar integralmente dentro de limites explícitos; ao exceder orçamento, retornar erro de observação separado do valor, propagado por arrays/objetos, funções, snapshots e console. Diferenciar exceção real do programa de limite/falha do observador. Nunca gravar uma reprovação causada pelo observador. Já existe o caminho adequado: observação com `error` no topo é interceptada em `packages/studio-runtime/src/index.ts:651`, gera `CHECK_FAILED`/500 e o adaptador Members converte em `ProjectCheckUnavailableError`, sem cache do resultado nem persistência da avaliação. Ajustar também o juiz para rejeitar defensivamente observações incompletas recebidas de outro produtor.

Cobrir ao menos 200/201 itens e chaves, limite aninhado, nomes de variáveis além de 300, texto/console excedidos, marcador literal legítimo `$sz` e garantia de ausência de gravação/XP quando o executor não consegue observar integralmente.

## Triage

- Decision: `VALID`
- Notes: Severidade high confirmada por reprodução independente. Root solicitou formalização como issue_001 e assumiu correção/consolidação; nenhum arquivo de produção foi alterado pelo revisor. Limites são legítimos; tratar valor parcial como completo é o defeito.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
