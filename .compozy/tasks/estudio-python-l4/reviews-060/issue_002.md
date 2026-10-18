---
status: resolved
file: packages/member-shell/src/routes/studio-zappy.ts
line: 470
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Ajuda usa decisão Python expirada após consultar o rank

## Review Comment

A rota validava a decisão contextual fresca e em seguida aguardava carregar o catálogo e consultar `getGamification`. O início de `answer` verificava apenas cancelamento; se o prazo da decisão terminasse nessas esperas, a rota ainda reservava uma pergunta e disparava o modelo com a autorização vencida. A validação temporal já existente no helper deixava de valer antes do primeiro efeito pago. Não se trata de exigir reautorização contínua de uma geração já iniciada nem de transformar análise em grant de execução.

Reprodução independente `packages/member-shell/.cache/review060-python-freshness.test.ts`: decisão integral emitida pelos serviços reais `AuthorizeLessonRuntimeService` e `AuthorizePythonAnalysisService`, sem modificar seu conteúdo. No await de gamificação, a prova avança somente o relógio para `expiresAt + 1`. Originalmente a rota reservava uma pergunta, chamava o modelo local capturado uma vez e devolvia envelope200. Prova original:1 pass,0 fail,7 verificações,exit0. A fonte e o contexto permanecem os mesmos; o único evento é a expiração durante a suspensão.

Conservar o prazo da autorização e recusá-la após essas esperas, imediatamente antes de iniciar o trabalho reservado. Responder com erro contextual recuperável e nenhum uso de pergunta/modelo. Preservar a liberação da fila após os headers e a autorização de análise sem capacidades de execução.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e adicionou pythonAuthorizationExpiresAt mais guarda no início de answer, antes de zappyReserveQuestion. Reproduzidor independente adaptado confirmou envelope409/ZAPPY_CONTEXT_EXPIRED, uma consulta de policy, zero reservas e zero chamadas ao modelo. Combinado com a prova original060001 corrigida:2 pass,0 fail,78 verificações,exit0. Sem alteração de produção pelo revisor ou modelo remoto.
