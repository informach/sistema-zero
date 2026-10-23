---
status: resolved
file: packages/members/src/application/studio-pro/studio-builder.service.ts
line: 393
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Fence tardio permite autorização após expiração ou retirada

## Review Comment

O serviço passa this.clock() ao repository.execute antes de aguardar SQL. O repositório compara leaseUntil/expiresAt/deadlineAt com esse argumento capturado; se a leitura fica bloqueada no lock da conta ou outra etapa assíncrona, pode devolver uma lease que já venceu quando a Promise termina. Após a última leitura, o serviço só verifica validationLease/revisionHash e emite authorization sem conferir o relógio atual. Uma política fresca não torna válida uma lease expirada durante a leitura posterior.

Reprodução independente `packages/members/.cache/review103-final-lease-expiry.test.ts`: Coreapply/materialização reais, repoport controlado que reproduz a comparação do adapter com capturedNow. Primeira leitura/política válidas; segunda leitura começa antes do vencimento e é suspensa, relógio avança para leaseUntil+1, então é liberada. O serviço devolve autorização em vez de recusar.0pass1fail/3asserts exit1. Não afirma corrida PostgreSQL já executada pelo revisor. A prova SQL existente de expiry durante a política cobre outra janela: nela a segunda leitura já começa depois do vencimento.

Após cada retorno do repositório, conferir com relógio fresco o sinal, a identidade/versão/fase esperadas, leaseUntil, expiresAt e deadlineAt para fase validating, antes de chamar política ou emitir autorização. Preservar semântica de preview em review e nunca renovar lease por uma leitura de autorização. Acrescentar prova PostgreSQL com account advisory lock bloqueando a última leitura até depois do vencimento.

Novo consumidor authorize-validation do Builder; não reabre102 (cliente de tipos/ownership/cobertura) nem os antigos fluxos de publicação. Callback de política ainda ausente na composição e BFF/executorPython bloqueados; o achado não demonstra execução indevida já disponível em produção.

Extensão reproduzida na revalidação: após corrigir o relógio, awaitWithSignal podia resolver e remover seu listener antes de a continuação do serviço executar. Um abort nessa fronteira ainda emitia autorização. O repo controlado agenda três queueMicrotask após a última leitura; observação sem efeito no clock confirmou signal.aborted antes da checagem fresca. A matriz mostrou 4 pass/1 fail, 16 asserts, exit1. É a mesma falta de validação da lifetime após retorno assíncrono, não renovação de lease nem defeito de SQL.

## Triage

- Decision: `VALID`
- Notes: VALID confirmado pelo implementador. Resolvido com validationLeaseIsFresh usando clock fresco após ambas as leituras, signal.throwIfAborted após cada await e imediatamente antes da emissão. Confere identidade/versão/candidate/fase, datas finitas, lease/expiry futuros e deadline de validating; review preserva sua lease de refresh sem exigir o deadline antigo. Revalidação independente da mesma matriz: 5 pass/0 fail/16 asserts, exit0. A pedido explícito do implementador, os cinco casos foram portados para tests/unit/studio-builder-validation-lifetime.test.ts, único teste permanente editado pelo revisor; combinado B1/B2.1/coordinator: 30 pass/0 fail/93 asserts, exit0. Prova PostgreSQL permanente l6-python-builder-authorization-sql-2.log conferida por leitura: 6 pass/0 fail/29 asserts, incluindo wait_event=advisory antes de avançar o clock e liberar a última leitura. Nenhuma SQL/TSC/Docker/browser/heavy ou fonte de produção alterada pelo revisor. Isso encerra somente o achado B2.3, sem qualificar composição/execução Python em produção.
