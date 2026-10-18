# VERIFICATION REPORT

- Claim: erro de validação conhecido fica bloqueado por cancelACK não cooperativo, portanto batch Turtle não aborta siblings na falha.
- Command: `bun test ./.cache/review122-turtle-failed-retirement.test.ts`, cwd raiz.
- Executed: sim; helper batch/HTTP reader reais, portas fetch/bodycancel controladas.
- Exit code:1. Output0pass/2fail/2asserts:404 e overflow1MiB+1 entram retirementgate, batchpending e sinaisfalse depois64microtasks, esperados siblingsabortados antesACK. Finallyownerabortsettles e fetchrestored. Nenhum recurso nativo externo aberto.
- Scope: cinco arquivos LoteA +awaitWithSignal Core +plano completos lidos. URLnomesfechados/basecapturada, quotas1MiB×4, ownerabort/reason e imports compostos avaliados; nenhum outro achado novo confirmado até este checkpoint. Protocol import rejection tem catch que retira resourceScope; não alegada prova WASM dessa fronteira.
- Verdict:122001VALIDmedium,meta1/0/1; patch e revalidação frescos pendentes. Não reabre117/121 e não aprova desempenho/browser/SDK oufeatureglobal.

## Regressão independente do slice antes do fix122

- `bun test ./packages/studio/src/runtime/python/turtle/moduleSources.test.ts ./packages/studio/src/runtime/python/webFiles.test.ts ./packages/studio/src/runtime/python/webPayload.test.ts`, cwd raiz, exit0,11pass/0fail/115asserts. Paralelismo de quatro URLs fechadas/reverse completion, erro cooperativo, ownerabort/reason, overflow cooperativo e payloadlegado passam; contraste com os dois repros red identifica lacuna específica do retirementACK não cooperativo em falha conhecida, não uma falha geral do loader.

## Revalidação independente após patch122 (gates ainda pendentes)

- Fonte atual relida completa: ambos guards solicitam body.cancel sem await e consomem rejeição; finally solicita reader.cancel sem bloquear erro/retorno e libera lock, sem read pendente. OuterawaitWithSignal continua cercando ownerabort/producer não cooperativo. Não há retorno de mapa/FS parcial ou relaxamento de limite de bytes.
- `bun test ./.cache/review122-turtle-failed-retirement.test.ts ./packages/studio/src/runtime/python/turtle/moduleSources.test.ts ./packages/studio/src/runtime/python/webFiles.test.ts ./packages/studio/src/runtime/python/webPayload.test.ts`, cwd raiz, exit0,15pass/0fail/155asserts. Mesmos gates independentes404/overflow nunca liberados: batchSettledtrue e quatro siblingSignalsAbortedtrue antes do ACK. Permanentes404/overflow também preservam erro 'obter'/'limite'; demais casos de fonte/payload mantidos.
- Red permanente raiz relido (`l8-parallel-turtle-review122-red-1.log`):5pass/2fail/113asserts; green1 relido39/292 em seis arquivos, inclui nosso cache. Esses números são evidência da raiz, não execução adicional do revisor.
- Status122VALID/unresolved/meta1/0/1 mantidos: TSC56678 iniciou antes do patch e não comprova fonte atual. Aguardar TSC2 fresh e browserruntimeproof da raiz antes de resolved. Nenhum heavy, navegador, servidor, TSC ou build pelo revisor; sem aprovação de desempenho/global.

## Fechamento122001

- Recibos reais lidos: `l8-parallel-turtle-typecheck-2.receipt.txt` exit0 time2026-10-18T16:17:20.2757530Z; `l8-parallel-turtle-runtime-smoke-1.receipt.txt` exit0 time16:18:03.0550946Z. TSC1pré-fix não usado como evidência atual. Fonte nonblocking retirement relida.
- Report browser1 parsed independentemente:8 testes/8passed,0skipped/0unexpected/0flaky, dois canais Chrome/Edge, retries0. Spec/asserts relidos: source/import/binary/Unicode/REPL, descendantworker e policy negados, Turtlepixels/Tkcolors e captura, Pythonplain sem requestsTurtle. Execução da raiz, sem novo browser do revisor. Warnings CommonJSvendor e NO_COLOR/FORCE_COLOR preservados no log.
- Oito attachments runtime-distribution conferem a mesma identidade: distribution.hash0645e50edc7ead6692434443d07ee8f1e6b8dbafedbbc3edcec7a59b7a368c96; release.manifestSha256 e74c2ff47a8fe516e4902426dc8368e00c36c632746a5670a64b36117241ddfb (não confundir distributionhash e releasepin). Metadata canonicalSHA e igualdade dos mapas path/SHA da release/distribution recalculados independentemente; duas capturasPNG tiveram estrutura/CRC conferidos. Isso não é rehash de todos binários físicos ou nova execução runtime.
- Statusresolved/VALID preservada; meta1/1/0, YAML/counts readback. Provas independentes15/155 e gatesfresh suportam defeito122/LoteA apenas. Sem aprovação F1/série30/desempenho/global, SDK/exportcomnovoimage e demais lotes separados. Nenhum comando pesado/CPUprobe durante F1root.
