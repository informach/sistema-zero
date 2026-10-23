---
status: resolved
file: packages/member-shell/tests/studio-python-runtime.test.ts
line: 43
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Contador stale reprova wrapper HTTP com todos os casos verdes

## Review Comment

O sublote estrutural acrescentou dois casos ao arquivo isolado `tests/fixtures/studio-python-runtime.cases.ts`, mas o wrapper principal ainda exige o resumo exato `13 pass`. O filho agora executa15casos/51assertions corretamente, exit0/0fail; o wrapper reprova essa execução verde. Isso quebra o gate comum do pacote e mostra que executar diretamente apenas o filho não valida a entrada permanente da suite.

Reprodução independente: `bun test tests/studio-python-runtime.test.ts`, cwd member-shell, **exit1, 0 pass, 1 fail**. Na linha43, Expected `/\b13 pass\b/`, Received resumo `15 pass / 0 fail / 51 expect() calls`; todos os15casos do filho passaram. Não é recorrência da issue074003: o realm nativo isolado funciona, a causa nova é a quantidade manual desatualizada.

Manter o subprocesso explícito e os casos existentes, validar exit0, quantidade positiva de testes executados e zero falhas sem prender o wrapper à contagem manual anterior. Cobrir resumo vazio/zero, saída não-zero e falhas para evitar trocar esse falso negativo por falso positivo; não excluir os casos novos nem retirar a execução nativa isolada.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada. O wrapper exige exit0, resumo positivo de testes/assertions e0fail sem quantidade manual; preserva o subprocesso nativo e o arquivo filho explícito. `bun test tests/studio-free-options-hook.test.tsx tests/studio-python-runtime.test.ts`, cwd member-shell: exit0/3pass/28assertions, incluindo o wrapper real com filho15/51 no mesmo comando dos testes HappyDOM. Nenhuma fonte/teste de produção alterado pelo revisor.

### Provas independentes após o patch

`bun .cache/review074-wrapper-extract.ts` extrai o corpo ATUAL do wrapper, substituindo somente import.meta.dirname pelo diretório original. `bun test ./.cache/review074-wrapper-negative.test.ts ./.cache/review078-wrapper-summary.test.ts`: **exit0, 6pass/47assertions**. Usa subprocessos Bun owned de prova: aceita1/15/117casos com assertions positivas, recusa0casos/0assertions/summary ausente/1fail, recusa exit não-zero, mantém tails bounded, encerra child próprio no deadline e em falha de reader. Todos os processos owned foram observados encerrados.

Biome focado no escopo estrutural:16files exit0, sem fixes. Fechamento apenas deste contador/gate; a revisão do sublote estrutural continua aberta para a prova WASM real exigida.

Posteriormente, SDKstructure2 e Chrome/Edge6/6 reais foram conferidos independentemente (evidência detalhada na issue001 e `_verification.md`), encerrando a revisão do sublote sem outros achados. As duas causas desta rodada estão resolvidas; nenhum consumidor ou feature global é declarado concluído.
