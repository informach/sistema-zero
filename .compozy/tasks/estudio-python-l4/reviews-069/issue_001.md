---
status: resolved
file: packages/studio-runtime/src/python-inspection.ts
line: 184
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Cleanup fora do lifetime permite relatório após cancelamento

## Review Comment

O coordenador valida o sinal antes de retornar o relatório, mas o finally remove o listener de abort e aguarda destroy fora da proteção do deadline. Cancelamento ou timeout durante esse await não invalida o retorno já calculado: quando o SDK finalmente responde, runIsolatedPythonInspection resolve a evidência de um job cujo contexto/prazo já terminou. Se destroy não responder, o await fica pendente indefinidamente, apesar do deadline declarado de120s e do race usado para as outras operações SDK.

Prova independente `.cache/review069-inspection-cleanup.test.ts` no pacote studio-runtime: coordenador real, relatório válido e porta SDK controlada. O job chega ao destroy; o probe dispara seu AbortSignal.timeout controlado e confirma que o job não settle. Ao liberar destroy, a expectativa de recusa falha porque a promessa resolve o relatório. `bun test ./.cache/review069-inspection-cleanup.test.ts`:exit1,0 pass,1 fail,4 verificações, Expected promise that rejects / Received promise that resolved. Nenhum container/browser/heavy foi iniciado.

Manter o listener/validade até o teardown terminar, limitar explicitamente a espera de cleanup e conferir o sinal depois desse await antes de devolver evidência. Solicitar destruição uma única vez do container exclusivo; uma falha/indisponibilidade do SDK não permite prometer que o recurso já foi liberado nem devolver aprovação tardia.

## Triage

- Decision: `VALID`
- Final verification: Biome fresh dos oito arquivos de produção/QA exit0, sem alterações. `.cache/review069-final-check.ts` exit0: YAML das duas issues parseado, metadados 2/2/0 e fingerprint recalculado em leitura `70f43469c1ff770b11d6026bd00ee7b8517a7659f9deeff4203aee5202f6dfa2`, incluindo o leaf gerado. A formatação final do Core não alterou regras; nenhum Docker/build/TSC/browser foi executado pelo revisor.
- Notes: Implementador confirmou e aplicou grace de5s, listener até o fim do teardown e check após destroy. Prova independente adaptada `.cache/review069-inspection-cleanup.test.ts`: deadline próprio e cancelamento do actor durante teardown rejeitam a evidência; destroy que nunca responde falha após grace5s; destruição solicitada uma única vez.3 pass,0 fail,9 verificações,exit0. Combinado com permanentes isolated/config/JS/distributions e preflight Node:36 pass,0 fail,190 verificações,exit0. Nenhuma produção alterada pelo revisor. SDK indisponível gera erro de confirmação de encerramento, sem prometer que o recurso foi liberado. Não foi executado Docker/Cloudflare SDK/browser nesta revalidação; API/contexto/playtest continuam fora do recorte.
