---
status: resolved
file: packages/studio/src/runtime/python/bootResourceStore.ts
line: 119
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Leitura corrompida antiga apaga cache reparado concorrente

## Review Comment

O catch de read remove cache.delete(url) depois de ler/verificar a Response capturada por cache.match, sem coordenar essa remoção com outras leituras/publicações do recurso. Uma leitura antiga pode terminar depois que outra tentativa já removeu a corrupção e publicou bytes válidos no mesmo URL. Seu catch apaga essa entrada nova, perdendo o reparo e obrigando outro download grande. O hash gate impede aceitar bytes incorretos; o defeito é consistência/performance do cache compartilhado entre owners, não aprovação de executável adulterado.

Reprodução independente leve `packages/studio/.cache/review115-boot-cache-aba.test.ts`, store real/SHA nativo/Responses reais e porta CacheStorage controlada: A captura a Response corrompida e aguarda o fluxo; B lê a entrada corrompida, recebe erro e a remove; B2 é uma tentativa explícita que baixa/verifica/publica bytes corretos. Ao liberar o fluxo de A, seu SHA falha e o catch remove a publicação de B2. Comando `bun test ./.cache/review115-boot-cache-aba.test.ts` em packages/studio: exit1,0pass/1fail/6asserts, afterOldRead records0 expected1, fetchesBeforeNext1. Não há hang de cancelamento nem reuso implícito de tentativa; a Response de A é um snapshot antigo independente da entrada atual.

Serializar operações do mesmo recurso, incluindo match/read/hash/evict/put, sob coordenação compartilhada por origem, preservando o lock global de prune/open e ordem de aquisição sem deadlock. Uma comparação seguida de delete sem proteção continua vulnerável à corrida. Retirada de owner esperando lock deve cancelar somente sua espera, sem abortar holder de outro owner. Preservar erro explícito para corrupção e ausência de fallback na mesma tentativa; a tentativa posterior pode reparar o cache sem exclusão tardia da leitura antiga.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou medium. Pretende WebLock por recurso cobrindo leitura/verificação/retirada/publicação, além de prune/open global, com ordem recurso→gerações. Interface controlada de lock deve representar nome/sinal/operation e nova prova browser fica necessária na qualificação; revisor não modifica produção. Aguarda patch/revalidação; não se declara protocolo/consumidores completos.

### Independent final revalidation

Resolved após read serializado por lock exato de cacheidentity+resource, cobrindo match/read/SHA/evict/put. Lock global prune/open só é adquirido dentro do lock de recurso (recurso→gerações); prune nunca aguarda recurso. Probe original preservada em .cache/review115-boot-cache-aba.before.ts; versão atual usa coordenador namespaced FIFO com sinal por waiter. B fica comprovadamentequeued enquanto A segura fluxo; após liberar A, A rejeita integridade, B repara uma vez e cacheválido permanece. `bun test ./.cache/review115-boot-cache-aba.test.ts ./src/runtime/python/bootResources.test.ts ./src/runtime/python/webPayload.test.ts` em Studio EXIT0,14pass/0fail/77asserts; queuedRepairtrue/afterOldRead1/fetches1/deletes1.

Artefatos browser3 conferidos independentemente por `.cache/review115-browser-artifacts.py`: EXIT0,8/8ChromeEdge com CacheStorage/WebLocks/fetch nativos e origens distintas, cachecold/warm+gzipCORS, concurrent1fetch, cancelwaiterpreservaholder, repairpreservaentrada, locksheld/pendingvazios. Reporttem0skip/0retry; revisor não reexecutou browser. FonteQA valida configuração e origemdistinta, exige Lengthwire>logical e Encodingoculto no caso gzip. TSC2fresh logl8-boot-resources-typecheck-2 confirma Exit code0, lido. Scope store/bytehelpers+QA somente; nenhum consumidor do novo protocolo ativado e nenhum aceite de performance/CPython/F1/SDK global.
