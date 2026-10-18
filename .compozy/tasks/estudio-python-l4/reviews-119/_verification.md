# VERIFICATION REPORT

- Claim: Response Workers automatic recodifica gzip armazenado; a rota negociada omite manual.
- Executed: leitura completa do probe nativo arquivado, JSON/log, fonte atual e docs oficiais Cloudflare; não reexecutado workerd. Conferência pura independente via Bun/node:zlib+crypto exit0: stored66B/SHA340d352b..., logicalSHA8643aac..., automaticSingleDecodeStillGzip=true, manualSingleDecodeMatchesLogical=true.
- Native evidence (raiz): cloudflare-precompressed-response-2.json/log, automatic70B vs manual66B; Miniflare dispose registrado. Compatibility date igual2026-07-01. Probe1 falhou por API antiga antes de abrir workerd e não é usado como evidência do app.
- Scope: API Response nativa com Uint8Array; não prova ainda a rota registry+bodyR2, Content-Length R2, deploy remoto ou browser/SDK. Prova permanente da rota real em preparação pela raiz; nenhum comando pesado do revisor.
- Verdict: novo119001 high, pending triage; meta1/0/1. Não reabre118resolved e não confunde com timeout Pro/network aberto ou desempenho.

## Rota real e patch119001

- Triagem da raiz VALID registrada na issue. Lidos três permanentes completos (wrapper Bun, runner Node, fixture worker), fonte corrigida e logs `l8-http-compression-cloudflare-before-6.log`/`after-1.log`.
- Prova permanente usa store/registry de produção, R2 local nativo, HTTP Node cru direto à entrada workerd (sem proxy Miniflare transformador), compatibilidade2026-07-01. Before6: apenas gzip falha com70B em vez66B, SHA divergente e único decode incorreto. After1:1 pass/4 asserts exit0, gzip66B/SHA correto/Content-Length66; identity2500B, HEAD sem body/Length66,304/406 e retired200/revoked404 preservados, cleanupConfirmedtrue.
- Independente leve: `bun run ./.cache/review119-platform-evidence.ts`, cwd raiz, exit0. Parse dos JSON completos arquivados + zlib/crypto reais recalculam fixture e verificam before failures3/after0 e todos controles/ACK de cleanup. Nenhum workerd reexecutado pelo revisor.
- Fonte atual confere encodeBody manual somente para gzip em GET e HEAD/304, mantendo identity. Ainda aguarda gates TSC frescos informados pela raiz para resolved. Normalização cf.clientAcceptEncoding/proxy é superfície separada sem conclusão causal aqui.
- Esse probe também encontrou candidata QA distinta: executa blocos reais deadline/finally com dispose controlado pendente e mostra0exit após timer, timer removido no finally e wrapper sem killowned. Enviada para triagem antes de formalizar; não afirma leftover na execução real after1, que confirmou cleanup.

## Fechamento119001 e abertura119002

- Recibos reais `.cache/studio-python-l0/l8-http-compression-runtime-typecheck-3.receipt.txt` e `l8-http-compression-runtime-test-typecheck-3.receipt.txt` lidos: ambos exit0, timestamps12:31:02/05-03:00, incluem manualfix+três arquivos permanentes wire. Fonte atual confirma manual para GET/HEAD/304 gzip; identity inalterado. Execuções TSC da raiz, não do revisor.
- 119001 resolved, decisão VALID preservada. Prova antes/depois da origem workerd/R2 local e conferência pura independente suportam somente a correção de dupla compressão, sem fechar proxy/clientAcceptEncoding, browser/SDK comprimido, Pro/network ou desempenho.
- 119002 formalizada VALID medium após triagem da raiz: deadline/teardown não cooperativo do novo harness. Prova controlada dos blocos reais já executada exit0; nenhum native leftover observado é alegado. Patch e permanente nativa de falha pendentes. Metadata2/1/1.

## Revalidação119002 após helper owned

- Lidos completos helper `tests/fixtures/owned-node-process.ts`, fixture não cooperativa, permanente nativa e wrapper/runner wire corrigidos. O orçamento45s do parent cobre exited e drains; grace independente5s retira PID/tree owned via taskkill/T/F Windows ou grupo POSIX. Retorno confirma retirement antes de unlink; falha sem ACK preserva entradas e erro. Runner já não depende de timer/dispose para encerrar a lifetime do parent.
- Independente nativo leve: `STUDIO_PYTHON_BUILD_NODE=<cache Node24.22>; bun test ./tests/owned-node-process.test.ts`, cwd packages/studio-runtime: exit0,3 pass/0 fail/11 asserts. Child+grandchild não cooperativos expiraram e ambos PIDs estavam ausentes antes de remover entrada; overflow64KiB e sucesso normal cobertos. Sem workerd/Miniflare/build/browser/TSC.
- Cache independente novo, adaptado ao helper (não ao timer removido): `bun test ./.cache/review119-owned-retirement.test.ts`, cwd raiz: exit0,2 pass/0 fail/6 asserts. Signal já-abortado mantém reason e não despacha comando inválido; signal abortado somente após marker real de prontidão retira filho+neto, mantém reason exata e entrada íntegra até ACK. Todos recursos próprios dessa prova retirados e inputs removidos após confirmação.
- Total independente5/17. Nenhum novo achado confirmado. Mantém119002 VALID/unresolved, metadata2/1/1 até wire nativo e gates TSC frescos da raiz. Prova nativa Windows; não qualifica caminho POSIX/remoteCloudflare/performance.

## Fechamento119002

- Lidos recibos reais `l8-http-compression-runtime-typecheck-4.receipt.txt`/`l8-http-compression-runtime-test-typecheck-4.receipt.txt`: ambos exit0, posteriores ao helper/wrapper/runner corrigidos. Execuções da raiz, não do revisor.
- Parse independente de `l8-http-compression-cloudflare-after-2.log` (Bun/assert, exit0): wrapper exit0, cinco casos sem erros, failures[], cleanuptrue, retired200/revoked404; gzip66B/Content-Length66/SHA340d352b..., identity2500B e HEAD/304 sem corpo. Mantém wire nativo real qualificado dentro do escopo origem local.
- Provas independentes nativas5/17 e gates frescos suportam resolved119002. Decisões VALID preservadas; meta2/2/0, YAML/counts readback. Nenhum novo achado; normalização originalAcceptEncoding/proxy permanece investigada separadamente sem issue especulativa. Sem qualificação POSIX, remoteCloudflare, desempenho ou feature global.
