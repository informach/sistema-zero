---
status: resolved
file: packages/studio-runtime/src/index.ts
line: 171
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Retirada de configuração bloqueia o cancelamento explícito

## Review Comment

O ingresso exige STUDIO_PYTHON_DISTRIBUTIONS_JSON presente e aguarda pythonRegistry(configuration) antes de encaminhar qualquer rota Python, inclusive inputs/remove. Quando a configuração é retirada ou se torna inválida depois da admissão, a requisição de limpeza autenticada retorna503 sem chamar jobs.cancel. O DO proprietário possui cancelamento independente de distribuição/approval, mas o ingresso não permite alcançá-lo nesse estado. Um contêiner em andamento pode continuar até seu prazo/alarme, exatamente quando o host tentou retirar a operação e liberar recursos.

Reprodução independente com handler e inputstore reais: `bun test ./.cache/review081-cleanup-config.test.ts`, cwd packages/studio-runtime, exit1/1pass2fail/3assertions. O mesmo input admitido, token atual válido e bindings intactos produz remove200/cancel1 com configuração válida, mas503/cancel0 tanto sem configuração quanto com JSON malformado. As portas do DO são observadas sem executar SDK/container; o bloqueio acontece antes da chamada RPC.

Separar cancelamento/fechamento autenticado da admissão e aprovação de novas inspeções. Com token atual e identidade do input válidos, alcançar o DO e exigir cleanup ACK antes de fechar armazenamento; configuração ausente/inválida deve continuar impedindo abrir/executar, sem impedir redução de recursos já possuídos. Se o bucket estiver ausente, solicitar cancelamento sem confirmar falsamente a exclusão dos bytes, retornando pending/503 até poder concluir.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada independentemente. Index encaminha inputs/remove autenticado antes da disponibilidade/parse da distribuição para handlePythonInputRemoval, que conserva quota por owner, fences de token/binding, ACK antes de fechar e limite próprio5s. Configuração não concede abertura/execução nesse ramo. `.cache/review081-cleanup-config.test.ts`: exit0/9pass/22assertions após fix, incluindo configmissing/malformed/valid→cancel1/remove200; bucketausente→cancel1/503/inputpreservado; ACKfalse→503/inputaberto; troca de token ou namespace durantecancel→409 semclose; auth401/quota429 semcancel; abort408/ACKtardiosemexclusão. Reprodução original antes:1pass2fail.

### Verificação complementar e limites

`bun test tests/runtime-handler.test.ts tests/python-requests.test.ts`: exit0/28pass/166assertions, incluindo regressões JavaScript, configuração aprovada, autenticação/quota, report delegado verificado e fences finais. Logs negativos esperados: relatório de tipos stale e relatório Python adulterado. `bun test ./tests/fixtures/python-job-controller.cases.cjs` em processo separado: exit0/3pass/15assertions; preserva a regressão permanente080002 sem poluir mocks globais da suite. Biome11arquivos:exit0.

Leitura das fixtures SDK, entrypoint worker e migrations/config não encontrou outro defeito confirmado. O cenário novo de SDK/RPC/R2/contêiner com cancelamento explícito ainda depende da execução e evidência própria; testes controlados não o qualificam. Nenhuma fonte de produção/teste foi alterada pelo revisor.
