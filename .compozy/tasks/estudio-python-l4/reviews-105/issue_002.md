---
status: resolved
file: packages/members/src/application/studio-pro/studio-builder.service.ts
line: 446
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Retirada durante aquisição do aceite não impede novo UPDATE

## Review Comment

Após a autorização interna do preview Python, o serviço confere callerSignal antes de chamar repository.execute, mas essa chamada final não recebe sinal e não é owner-raced. Se o dono se retira enquanto a transação espera o account lock, o repositório segue e inicia o UPDATE de review depois da retirada. Não é SQL de mutação já admitido que termina tarde: no cenário reproduzido nenhuma mutação foi despachada quando o sinal abortou.

Probe independente packages/members/.cache/review105-acceptance-fences.test.ts: serviços/repositório/Core reais, transaction port SQL controlado, gate na aquisição do terceiro account lock após autorização completa. O teste confirma writes0 antes de abortar callerSignal; liberada a espera, ocorre writes1 e retorno bem sucedido, em vez de rejeição/zeroUPDATE. Controles válido/lease-expired passam; matriz com105001:2pass/2fail/18asserts exit1. Não demonstra cancelamento físico de PostgreSQL nem execução SDK.

Thread signal pelo port execute e repositório; retirar após account lock e antes de despachar UPDATE. O serviço deve retirar seu owner durante a chamada final, preservando cleanup e sem prometer cancelar uma mutação SQL já admitida. Cobrir o intervalo com account advisory lock real. É novo caminho de persistência B2.6 depois de authorize-validation; não reabre103 (fence da resposta de autorização) nem104 (retirement no pipeline externo).

## Triage

- Decision: `VALID`
- Notes: VALID confirmado pelo implementador. Resolvido com signal opcional no port Core e repositório; service passa sinal nas duas leituras de autorização e owner-race na execução final, com check pós-retorno. Repositório/lockStudioAiAccount conferem signal após advisory wait e update() confere antes de SQL. MembersClient encaminha sinal ao gateway. Mesma matriz independente ampliada a checkpoint review e preview-checkpoint:8/40 exit0, com transactionDone aguardado para não confundir owner rejeitado com UPDATE tardio. Combo lifetimes/B1/freepolicy/coordinator36/176 exit0. SQL5 do implementador lida:15/69 exit0, incluindo caller retirado no terceiro advisory lock observado e phase/version/candidate preservados. Biome7/diffcheck exit0. Não promete cancelamento físico de SQL já admitido. Nenhuma SQL/heavy, produção ou teste permanente alterado pelo revisor; BFF/executor/UI Python ainda pendentes.
