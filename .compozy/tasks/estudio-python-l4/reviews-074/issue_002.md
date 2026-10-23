---
status: resolved
file: packages/member-shell/src/server/studio-python-runtime.ts
line: 222
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Admissão de outro nonce vira capacidade de cleanup

## Review Comment

A validação da admissão compara owner, executionId, projectId, revision e expiry, mas não vincula a referência ao requestId desta solicitação. Um admission válido de outro nonce pode ter todos esses campos iguais. Sua referência é então atribuída ao campo de cleanup, usada para upload/inspeção e encerrada no finally, embora pertença a outra solicitação/geração ativa do mesmo job.

Prova independente `.cache/review074-runtime-lifetime.test.ts` cria pelo store real um admission com outro requestId, mantendo owner/execução/projeto/revisão. A fixture HTTP Bun substitui somente a resposta de open por essa referência válida. O cliente aceita o relatório e encerra o admission estrangeiro; esperado [accepted=false, foreignStillOpen=true], recebido [true,false]. O recorte completo tem4 pass,1 fail,10 verificações,exit1. O caso existente de owner estrangeiro continua correto; este é o scope faltante do nonce, não uma repetição daquela validação.

Vincular a referência emitida ao requestId exato: incluir o nonce no contrato Reference e compará-lo no load do serviço e no candidate do BFF antes de atribuir ownership para cleanup, ou usar uma derivação compartilhada que confira o inputId esperado. Preservar generation UUID, idempotência do nonce e a recusa de qualquer cleanup da referência rejeitada.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e adicionou requestId UUID ao Reference, à construção e comparação do load no store, e à comparação do candidate no BFF antes de atribuir a referência de cleanup. Prova independente de admission real de outro nonce agora recusa a resposta e mantém foreign admission aberto, sem upload/inspeção/cleanup. Recorte BFF5/11exit0; combinado com wrapper negatives9/23exit0. Core helper/JSON/input11/37exit0; serviço store/requests18/95exit0. Permanente isolado e child do wrapper mantêm13 pass/42 assertions; combo DOM+wrapper3/28exit0. Biome9 fresh exit0. Nenhuma produção alterada pelo revisor; nenhum Docker/browser/build/TSC/Cloudflare real executado, e a imagem anterior à alteração Core não foi qualificada por este recorte.
