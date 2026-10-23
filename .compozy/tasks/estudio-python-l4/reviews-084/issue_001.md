---
status: resolved
file: packages/studio-runtime/src/python-requests.ts
line: 409
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Execução inicia após retirada durante a compilação

## Review Comment

A nova operação validate autoriza/configura o runtime antes do preparo e só repete approve/assertCurrent depois que ambas as fases terminam. O check passado ao PreparedPythonProject verifica apenas AbortSignal. Assim, retirada de configuração ou revogação da release durante a compilação não é observada na transição: runIsolatedPythonValidation recebe o relatório de inspeção, chama project.check e inicia playtestPreparedPythonProject com os bytes autorais, embora a autorização de execução já tenha sido retirada. A fence final rejeita o relatório, mas não desfaz a execução iniciada.

Reprodução independente leve: `bun test ./.cache/review084-phase-authority.test.ts`, cwd packages/studio-runtime. Handler, input store, registry, hashing/streams, owner e sequenciamento das fases são reais; somente a porta SDK é controlada e retorna relatórios válidos. O primeiro exec retira assertCurrent (configuração) ou muda o status da release para revoked. Em ambos os casos response409 e destroy1 passam, porém o segundo exec autoral também acontece: esperado execs1, recebido2. Resultado exit1/0pass2fail/6assertions. Não há execução de browser/container/SDK nesta prova.

Revalidar as condições atuais do host e a aprovação exata do runtime antes de admitir a fase de execução, incluindo a leitura assíncrona do marker quando necessária, seguida da fence atual de input/configuração. Preservar o mesmo sandbox, prazo e cleanup; não substituir a falta de autorização por uma aceitação apenas negativa ao final. Esta é a nova transição compilação→execução, distinta da issue073 sobre aceitação do relatório após await e da083 sobre cancelamento de callback.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e corrigiu. common owner captura assertCurrent antes dos awaits e check verifica signal+host/runtime entre etapas. Handler fornece assertCurrent e beforeExecution assíncrono com aprovação/marker e resolve da geração; operação aguarda fence via step/check antes do playtest. Probe original agora exit0/2pass/6assertions. Extensão independente para fechamento do input, marker retirado e configuração retirada durante a última resolve do fence: exit0/5pass/15assertions; todos impedem segundo exec e destroem uma única vez, com response409/410. Classe DO+SQLite controlada comprova que rejeição após criação deixa state failed/cleanupConfirmedtrue, destroy1 e readmissão410 (suite própria3/19). Permanente `bun test tests/python-requests.test.ts tests/python-inspection.test.ts`: exit0/30pass/176assertions, incluindo retiradas config/release/input, fases, cancelamento e cleanup limitado. Biome4 exit0. Nenhuma fonte de produção/teste permanente alterada pelo revisor, nenhuma qualificação SDK/browser por essas portas.
