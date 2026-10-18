# B2.4 — contratos e pipeline Python do Builder

Arquivos Core python-builder-analysis/types-report/preview/validation e delta types lidos completos, além dos testes preview/validation, fake de report e dependências execution/pro-materialization/preview/playtest/validation/runtime-client. Perfil completo50fontes/8MiB/20mil linhas, span/cobertura de diagnostics, distinção CAS/execução e sources/assets capturados conferidos. Sem integração de executor/composição/persistência/UI neste recorte.

104001 medium VALID/resolved: retirada após o cliente retornar a prévia rejeitava no pipeline externo sem previews/remove. Probe TCP leve com clientes Core reais e relatórios controlados: controle antecipado passou; fronteira externa falhou,1pass/1fail/116asserts exit1. Após discardPreview idempotente privado e catch nos dois owners, mesmos quatro pontos1/4/5/6 passam4/232. A pedido explícito do implementador, quatro regressões foram portadas ao teste permanente python-builder-validation.test.ts (único teste editado nesta rodada), exigindo rejeição e exatamente1 discard. Preview/pipeline22/512; combo tipos/preview/pipeline47/574 passou, incluindo dois Pyright reais locais/TCP já existentes. Sem prova SDK/DO/R2/browser/performance nem qualificação de executor/composição/persistência/UI. Nenhuma fonte de produção alterada pelo revisor.

Biome fresco dos9arquivos Core/testes/fake: Checked9files, No fixes applied, exit0; diffcheck exit0. Readback de issue/meta/verification e parser YAML .cache/review104-final-check.ts: VERIFIED reviews-104 medium1 VALID; metadata1/1/0, exit0.

## VERIFICATION REPORT

- Claim: 104001 resolvida no recorte B2.4.
- Command: bun test ./tests/unit/python-builder-types.test.ts ./tests/unit/python-builder-preview.test.ts ./tests/unit/python-builder-validation.test.ts (cwd packages/members).
- Executed: após último fix e inclusão/formatter dos permanentes.
- Exit code: 0.
- Output summary:47 pass,0 fail,574 expect() calls;3 files.
- Warnings: nenhuma no comando.
- Errors: nenhum no comando.
- Verdict: PASS, limitado aos testes indicados e fronteira de ownership; não qualifica a feature global.
