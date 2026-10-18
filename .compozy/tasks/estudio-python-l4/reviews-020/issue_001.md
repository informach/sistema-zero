---
status: resolved
file: packages/studio/src/python/language/controller.ts
line: 221
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Revalidar a revogação antes de entregar a análise

## Review Comment

O wrapper final de request.execute verificava dono, edição pendente e current(), mas não consultava novamente o estado operacional do release. Se a revogação acontecesse depois do último parse/render e antes da conclusão do callback assíncrono, controller.run resolvia com um resultado cuja autoridade já tinha sido retirada. As verificações feitas nas chamadas do parser não cobrem essa última suspensão.

Reprodução independente Bun: execute aguarda parse, suspende num gate, o host passa access().releaseStatus para revoked e libera o gate. Antes da correção, o resultado foi accepted. Reutilizar check(job) imediatamente antes de resolve, sem nova suspensão entre checagem e entrega. O caso envolve o analisador, que não executa o programa da criança; não implica execução autoral ou ativação da UI ainda pendente.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com check(job) antes da entrega final. Revalidação independente recusou a mesma sequência com a mensagem de analisador desativado. Nenhuma implementação alterada pelo revisor.

## Verification

- Reprodução original repetida após o fix: resultado="O analisador deste ambiente foi desativado. O código continua disponível.". Outra prova com revogação na microtask entre o retorno do parse e a entrega final também recusou o resultado.
- `bun test src/python/language/controller.test.ts`: 7 pass, 0 fail, 31 verificações; inclui regressão permanente da revogação final.
- `bunx biome check src/python/language/controller.ts src/python/language/controller.test.ts src/python/language/session.ts`: três arquivos, sem alterações ou erros. Nenhum navegador/TSC iniciado pelo revisor.
