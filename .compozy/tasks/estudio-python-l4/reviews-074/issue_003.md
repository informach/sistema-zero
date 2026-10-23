---
status: resolved
file: packages/member-shell/tests/studio-python-runtime.test.ts
line: 97
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Teste HTTP falha junto às suites DOM existentes

## Review Comment

A fixture inicia Bun.serve diretamente no processo da suite e usa Response/fetch globais. Os testes DOM existentes registram HappyDOM globalmente nesse mesmo processo. Depois disso, Bun.serve recebe a classe Response de HappyDOM em vez da resposta nativa; o transporte falha antes de testar o cliente/Worker, e alguns gates aguardam até o timeout. A suite nova isolada verde não é combinável com os testes já descobertos no pacote.

Reprodução independente `bun test tests/studio-free-options-hook.test.tsx tests/studio-python-runtime.test.ts`, no member-shell: exit1,3 pass,12 fail,33 verificações,15 casos,11.38s. Os dois hooks e a validação de projeto que não faz HTTP passam; os caminhos HTTP falham com Expected a Response object, HPE_UNEXPECTED_CONTENT_LENGTH e timeouts. O processo terminou sozinho e não foi necessário matar processos. Nenhum heavy/browser/Cloudflare real foi iniciado.

Isolar as provas HTTP nativas em subprocesso Bun próprio, preservando todos os casos e assertions existentes. O wrapper deve possuir o processo, drenar saída com limite, impor deadline e conferir exit code/execução efetiva. Não alterar globais do setup DOM nem excluir os testes do gate para obter verde. O isolamento foi usado na prova HTTP anterior de linguagem, mas esta fixture nova voltou a executar Bun.serve diretamente; a issue058 era sobre entrypoint e o reparo do HTTP só constava como evidência auxiliar, não é uma reabertura do bug de produto daquele round.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e moveu os treze casos para tests/fixtures/studio-python-runtime.cases.ts, mantendo fixture HTTP nativa em subprocesso Bun owned. Wrapper drena stdout/stderr com reader/TextDecoder, retém tail20k por pipe, deadline20s, verifica exit e13 pass/0 fail/42 assertions, e finally solicita kill somente do seu child ainda ativo. Combo original independente `bun test tests/studio-free-options-hook.test.tsx tests/studio-python-runtime.test.ts`:3 pass,0 fail,28 verificações,exit0; child13/42 confirmado pelo wrapper. Prova cache extrai o corpo EXATO do wrapper e ajusta somente dirname para o diretório original; executa filhos Bun próprios para exit1 com stdout200k/tailbounded, exit0 sem testes, deadline controlado e erro controlado no stream de stdout. Negativos4 pass,0 fail,12 verificações,exit0; todos os children terminaram. Combinado com probes BFF9/23exit0; Biome9 fresh exit0. Setup global e produção não alterados pelo revisor; nenhum caso excluído e nenhum heavy/Cloudflare real executado.
