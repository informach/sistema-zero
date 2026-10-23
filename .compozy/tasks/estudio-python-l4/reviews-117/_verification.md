# VERIFICATION REPORT

- Claim: cancelamento da nova preparação de host depende da cooperação do request e do ACK de body.cancel.
- Command: `bun test ./.cache/review117-boot-host-cancel.test.ts`, cwd packages/studio.
- Executed: sim; helper real, Response/ReadableStream reais, portas controladas somente para manter produtor/retirement pendentes.
- Exit code: 1.
- Output summary: 0 pass / 2 fail / 4 asserts. settled=false após owner.abort até liberar request ou retirement ACK; cancel solicitado uma vez em ambos. Gates liberados ao final; nenhum processo externo.
- Regression command: `bun test ./src/runtime/python/bootResources.test.ts ./src/runtime/python/bootResourceChannel.test.ts ./src/runtime/python/webPayload.test.ts ./src/export/__tests__/pythonWeb.test.ts`, cwd Studio.
- Regression result: execução independente exit0, 36 pass / 0 fail / 223 asserts.
- Readback: recibo `l8-boot-host-typecheck-1.receipt.txt` lido, root-owned sessão 57874 colhida exit0, stdout/stderr vazios. Não executado TSC pelo revisor.
- Scope reviewed: helper completo, quatro casos permanentes de host, imports Core deployment verifier/rotas, Store/Manifest/webFiles e plano. URLs fechadas online/export/subdiretório codificado; metadata real limitada 2MiB; verifyDeployment/pin antes de criar Store; options capturadas antes do await. Integridade não concede aprovação/autorização.
- Warnings: busca inicial usou wildcard de diretório incompatível com rg no Windows; rerun no diretório literal com glob de arquivos. Nenhuma falha de produto inferida disso. Biome informado limpo pela raiz; sem lint pesado/heavy executado.
- Verdict: 1 finding medium VALID após triagem explícita da raiz / 0 resolved / 1 unresolved. Sem consumidores ativos, qualificação CPython/SDK/browser/performance ou aprovação global. Apenas cache/review docs editados pelo revisor.

## Independent final revalidation

- Claim: helper encerra preparação no ownerabort sem depender de producer/cancel ACK.
- Command: `bun test ./.cache/review117-boot-host-cancel.test.ts ./src/runtime/python/bootResources.test.ts ./src/runtime/python/bootResourceChannel.test.ts ./src/runtime/python/webPayload.test.ts ./src/export/__tests__/pythonWeb.test.ts`, cwd Studio.
- Executed: sim, patch estável; apenas cache própria adaptada para observar ingresso real do request antes de abortar, preservando os dois cenários causais.
- Exit code: 0.
- Output summary: 39 pass / 0 fail / 239 asserts. Dois casos próprios comprovam settlement antes de release; permanente adicional comprova producer/late-cancel/body-cancel com reason idêntico, cancel1 e cache0.
- Patch read: wrapper externo awaitWithSignal cerca leitura/hash; wrapper interno possui retirement tardio; cancel rejeitado tardiamente é consumido sem substituir razão de retirada. Options permanecem capturadas antes dos awaits e integridade não concede autoridade.
- Harness warning: primeira repetição da cache falhou com release undefined porque abortava antes de dispatch, agora legitimamente adiado pelo awaitWithSignal. Adaptada para aguardar gate de ingresso; não é falha de produto nem mudança do cenário producer já admitido. Todos os gates drenados.
- Root gates read: log `l8-boot-host-review117-after-1.log` 37 pass / 0 fail / 235 asserts; recibo fresh após review117/import ordering registra exec chunk503e63 colhido exit0, stdout/stderr vazios. Não executado TSC pelo revisor; sem inventar arquivo de saída vazio.
- Verdict: resolved, metadata 1/1/0; YAML/count readback após gravação. Nenhum heavy, produção ou permanente editado pelo revisor. Consumidores/runtime/browser/SDK/performance permanecem fora deste fechamento.
