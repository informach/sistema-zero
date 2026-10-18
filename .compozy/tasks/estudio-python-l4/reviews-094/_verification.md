# Proxy cancellation — revisão scoped encerrada

094001 VALID/pending. Todos arquivospriorizados ProxyEngine/Stage/stats/error/StoreCircuitBreaker/port lidos, adaptersInMemory/Redis e testes consultados. Prova `.cache/review094-breaker-race.test.ts`0pass3fail/9asserts exit1: cachetokenstale, cancelread→writepause, successread→resetpause clobberam próximo trial em storage realInMemory. Gates controladossemRedis/network/browser/SQL/heavy. Atomicidade da transição exige ambosadapters, sem mutexlocal.

Proxyinput.signal encaminhado da Stage request para forwarder combinado compertry; outer awaitWithSignal encerra owner não-cooperativo, retiralateResponse e capacityneutralstats. Sem repetição de known pending anterior à implementação: agora código existe e está sendo revisado. ProvasHTTPparent ainda separadas; revisão de corpo/backoff em andamento. Nenhuma fonteproduto/permanente editada.

## Revalidação atômica e restante do Proxy

Novo GatewayStore.settleCircuitTrial(keys,token,outcome,now,ttlMs) lido nos2adapters. InMemory verifica cache.storagetoken/state e muda state/gate/counts emturnosemawait. Redis EVAL3keys verifica currenttoken no armazenamento e combina DEL/SET/DEL na mesma execuçãoLua, sem cachelocal como autoridade. StoreCircuitBreaker ambosonResulttoken/onCancelled usamportaúnica e invalidamcache emfinally. CancelpreservaopenedAt/counts, successlimpa, failureabre cooldownnovo. Não há mutexlocal como substituto de atomicidadeRedis.

Próprio `bun test ./.cache/review094-breaker-race.test.ts` adaptado ao contrato fortalecido:5pass0fail/25asserts exit0. Gates agora param ANTES de executar settleCircuitTrial REAL, pois SET/RESET separados deixaram de existir; mantémmesmaseq tokenApendente→cancelA+admiteB→settleAretoma. Cache250stale e delayedcancel/success/failure não aposentamB, próximo beforeCallbarra; casosdiretos cobrem foreignfalse/currentcancelneutralcounts/gate/successclear/failurecooldown. Não modela CAS fictício nem substitui backendInMemory real.

Permanentes `bun test tests/unit/proxy-cancellation.test.ts tests/unit/circuit-breaker.test.ts`:7pass0fail/36asserts exit0. `bun test tests/unit/circuit-breaker-ownership.test.ts tests/integration/proxy-cancellation.test.ts tests/integration/proxy-stream.test.ts`:7pass0fail/28asserts exit0;4CAS+2HTTPcancel+1streamingPOST. FontepermanenteCAS equivalente conferida, não exclui cenários. HTTPreal Bun/pipelinecomposição/fetch+socketnativeprovam input.signal→upstreamabort e499owner/1upstreamcall, streamingPOST200+headerspreservados. Servidores próprios parados emfinally; não assertSocketWorkerd/Cloudflare/Nextbrowser/globalcancelamento.

Probeextra `.cache/review094-backoff.ts` via `bun ./.cache/review094-backoff.ts` exit0: HTTPBun503bodyaberto/FetchForwarder real, ownerabort durante backoffjittercontrolado;499/unhandled[]. Suspeita de cancelbodyrejection não reproduzida nesse runtime, portanto não virouissue. Somente testeisolado alteraMath.random e restaura emfinally, não produto.

Biomefresh9files ports/adapters/breaker/proxy/stats/stage:exit0, Checked9/no fixes/nowarnings. Nenhumsegundoachado confirmado. Redisreal planejado pelo implementador ainda não conferido; leituraLua não é qualificação operacionalRedis. Nenhum Docker/Redis/TSC/browser pesado pelo revisor; rootAdminTSC7877 independente. Readback metadata ainda1/0/1 até fechamentoautorizado/verificado.

## Redis real e fechamento

Executado independentemente após disponibilização do Redis dedicado: `$env:GATEWAY_TEST_REDIS_URL='redis://127.0.0.1:6381'; bun test ./tests/integration/circuit-breaker-redis.test.ts`, cwd packages/api-gateway, exit0: 2 pass, 0 fail, 16 expect calls. Fonte dos dois testes lida integralmente: três conexões reais, chaves UUID exclusivas, cache antigo da réplica, settlement stale cancel/success/failure após nova admissão, cancel neutro preservando openedAt/counts e competição com um único vencedor. Testes limpam somente próprias chaves e encerram conexões em finally. Nenhum processo do revisor permanece usando Redis; implementador avisado para encerrar container dedicado. Não foi executado Docker/TSC/browser pelo revisor nesta etapa.

094001 VALID/resolved, metadata 1/1/0 após readback YAML. Sem novo achado no restante do Proxy. Evidências anteriores acima registram a sequência histórica; a pendência Redis ali descrita foi satisfeita nesta etapa. Escopo não qualifica request.signal em Cloudflare/Next nem cancelamento de mutações SQL já admitidas.
