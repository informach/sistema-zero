---
status: resolved
file: packages/api-gateway/src/infrastructure/resilience/store-circuit-breaker.ts
line: 126
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Settlement antigo pode apagar o próximo trial do breaker

## Review Comment

onCancelled confere trialToken via readState (inclusive cache local), depois escreve open e reseta gate em operações separadas. onResult também separa checagem do token dos resets/open. Outra réplica pode resolver o token antigo e admitir um trial novo entre essas operações; a transição antiga ainda sobrescreve/apaga o estado e reseta o gate do novo dono. O próximo beforeCall pode admitir outro trial enquanto o novo segue ativo. Cache250ms permite o mesmo efeito até sem interleaving de I/O: uma réplica aposentada continua vendo o token antigo.

Prova independente `bun test ./.cache/review094-breaker-race.test.ts`, cwd api-gateway, backend InMemoryStore real compartilhado, relógio controlado, apenas portas I/O gateadas:0pass3fail/9asserts exit1. Caso1: B cacheia tokenA, A cancelaA, C admiteB, B cancelaA com cache antigo e estado vira open sem tokenB. Caso2/cache0: pause SET de cancelA apósread; outrocancelA+admissãoB concluem; SETantigo clobberaB. Caso3/cache0: pause RESET de successA apósread; cancelA+admissãoB concluem; RESETantigo apaga estadoB. Sem Redisreal/SQL/browser/heavy; gates liberados emfinally.

Implementar settlement atômico na porta GatewayStore e nos dois adapters, verificando token atual diretamente no armazenamento e aplicando estado+gate+counts como uma transição indivisível. Cancel deve preservar openedAt/contadores sem fabricar resultado; sucesso limpa e falha inicia novo cooldown. Cache pode orientar admissão eventualmente consistente, mas não conceder autoridade para aposentar token. Mutex só local não resolve réplicas Redis.

## Triage

- Decision: `VALID`
- Notes: Resolvido após revalidação independente. GatewayStore.settleCircuitTrial verifica token atual e aplica state/gate/counts atomicamente: turno sem await no InMemory e EVAL de três chaves no Redis, sem cache no settlement; cache local invalidado em finally. Probe original adaptado para pausar antes da transição real manteve concorrência tokenA→cancel/admissãoB→settlementA e passou 5/25, incluindo cancel/success/failure antigos. Redis real dedicado em 127.0.0.1:6381, `GATEWAY_TEST_REDIS_URL=redis://127.0.0.1:6381 bun test ./tests/integration/circuit-breaker-redis.test.ts`, executado independentemente: 2 pass, 0 fail, 16 asserts, exit0. Três adapters/réplicas preservam token novo mesmo com cache antigo; cancel preserva openedAt/counts; settlement concorrente tem um único vencedor. Uma raiz cobre onCancelled novo e onResult legado; não duplica093/092. Qualificação local Redis e HTTP Bun, sem afirmar Cloudflare/Next ou cancelamento SQL.
