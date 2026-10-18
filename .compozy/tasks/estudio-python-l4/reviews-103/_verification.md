# Builder Python — B2.3 autorização de lease

Core pro-builder.ts, Members studio-builder.service.ts, drizzle/studio-builder.repository.ts, HTTP studio-builder.routes.ts e teste SQL python-builder-authorization.test.ts lidos completos; lockStudioAiAccount/claim/checkpoint/policy e binding candidate consultados. Callback não instalado na composição e BFF Python bloqueado; esta revisão não qualifica disponibilidade/executor/SDK/preview/UI.

103001 medium VALID/resolved: clock capturado antes de SQL podia emitir autorização expirada após a última leitura. O primeiro probe independente falhou 0/1, 3 asserts. Após o fix de clock, a extensão de retirada na microtask entre settlement do helper e continuação do serviço falhou 4/1, 16 asserts. O fix final confere clock e signal após as leituras, além de signal imediatamente antes da emissão. A mesma matriz agora passa 5/16 e preserva review após deadline antigo com lease fresca.

Com autorização explícita do implementador, cinco casos foram portados para o novo teste permanente tests/unit/studio-builder-validation-lifetime.test.ts, sem editar produção nem outros testes. Core apply/materialização reais, repo controlado, sem mocks globais e sem efeitos no clock. Combinado com B1/B2.1/coordinator: 30 testes/93 asserts, exit0. Prova SQL2 do implementador l6-python-builder-authorization-sql-2.log conferida por leitura: 6/29, exit0; o novo caso observa pg_stat_activity wait_event=advisory antes de avançar o clock e liberar a leitura final. Nenhum SQL/heavy foi executado pelo revisor.

Biome fresco dos cinco arquivos de contrato/serviço/repositório/HTTP/teste: Checked 5 files, No fixes applied, exit0, sem warnings. A primeira tentativa usou por engano infrastructure/database para o repositório e registrou erro de caminho; a repetição usa o caminho real infrastructure/persistence/drizzle. YAML e contagens lidos de volta por .cache/review103-final-check.ts: VERIFIED reviews-103 medium1 VALID; metadata1/1/0, exit0.

## VERIFICATION REPORT

- Claim: 103001 resolvida no recorte B2.3; metadata 1/1/0.
- Command: bun test ./tests/unit/studio-builder-validation-lifetime.test.ts ./tests/unit/studio-builder-revision.test.ts ./tests/unit/python-builder-execution.test.ts ./tests/unit/studio-builder-coordinator.test.ts (cwd packages/members).
- Executed: após portar e formatar o teste permanente e após o último fix de signal.
- Exit code: 0.
- Output summary: 30 pass, 0 fail, 93 expect() calls; 4 files.
- Warnings: nenhuma no comando.
- Errors: nenhum no comando.
- Verdict: PASS, limitado aos testes indicados; sem qualificação do executor, composição ou serviço remoto.
