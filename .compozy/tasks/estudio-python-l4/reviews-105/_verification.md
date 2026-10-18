# B2.6 — aceite e refresh de preview Python no backend

Core pro-builder.ts, Members service/repository e testes SQL completos lidos, delta composition-root consultado. Union JS legado/Python, evidências3(console)/4(capture ou JS), CAS/bytes/metadata/report/origins e reautorização interna conferidos. SQL4 do implementador l6-python-builder-authorization-sql-4.log lido:13pass/0fail/58asserts, sem atribuir execução SQL ao revisor. Sem disponibilidade de BFF/executor/UI neste recorte.

Dois achados medium VALID/resolved: referência vencia durante a espera de aceite e UPDATE era iniciado após callerSignal retirar o owner. Probe cache realService+realRepository+realCore, transaction port controlado antes do fix:2pass/2fail/18asserts exit1. Controles válido e lease-expired passaram; falhas preview-expired e owner-abort mostraram writes1 em vez de0. Fix captura signal no repositório/lock/update, owner-race final no service e refexpiry fresca pré-UPDATE. Mesma prova ampliada aos dois comandos checkpoint review e preview-checkpoint passa8/40; aguarda transactionDone para conferir zero writes depois do fim real da operação, não apenas da rejeição externa.

Regressão lifetimes/B1/freepolicy/coordinator+cache:36pass/0fail/176asserts exit0. SQL5 permanente do implementador lida por completo:15pass/0fail/69asserts; dois gates reais observam pg_stat_activity wait_event=advisory no terceiro account lock antes de avançar refexpiry ou retirar o owner; estado/candidate/version permanecem. Biome7arquivos/diffcheck exit0, sem warnings. Nenhuma fonte/teste permanente alterado pelo revisor; nenhuma SQL/TSC/Docker/browser/SDK executada. Não qualifica cancelamento físico de SQL já admitido, executor/composição ponta a ponta, persistência de preview com worker ou frontend.

## VERIFICATION REPORT

- Claim:105001/002 resolvidas no backend B2.6.
- Command:bun test ./.cache/review105-acceptance-fences.test.ts ./tests/unit/studio-builder-validation-lifetime.test.ts ./tests/unit/studio-builder-revision.test.ts ./tests/unit/studio-free-runtime.test.ts ./tests/unit/studio-builder-coordinator.test.ts (cwd packages/members).
- Executed:após os últimos guards e reforço da prova para aguardar settlement da transação.
- Exit code:0.
- Output summary:36pass,0fail,176expect()calls;5files. Biome:Checked7files,No fixes applied,exit0; diffcheck exit0.
- Warnings:nenhuma nos comandos finais.
- Errors:nenhum nos comandos finais; uma edição intermediária de cache teve erro de escape PowerShell, corrigido e teste completo repetido sem erro.
- Verdict:PASS somente no recorte; metadata2/2/0 lida de volta, sem claim de feature disponível.
