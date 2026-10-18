---
status: resolved
file: packages/member-shell/tests/studio-python-builder.test.ts
line: 1
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Novo teste TCP herda Response HappyDOM e quebra a suíte Shell

## Review Comment

O novo teste Shell chama pythonBuilderNetworkFixture, cujo Bun.serve nativo responde com Response global. Arquivos de UI registram HappyDOM nesse mesmo processo; depois disso Response/fetch pertencem ao realm DOM e o servidor rejeita a resposta. O teste verde isolado não é executável na combinação normal com os hooks UI.

Reprodução: bun test ./tests/studio-free-options-hook.test.tsx ./tests/studio-python-builder.test.ts --test-name-pattern 'free discovery|failed discovery|owned preview transfers', cwd member-shell. Duas provas UI passam e a nova prova TCP falha: Expected a Response object, HPE_UNEXPECTED_CONTENT_LENGTH e tipos unavailable.2pass/1fail/28asserts exit1. Evidência .cache/studio-python-l0/review106-builder-realm-before.log. É novo arquivo/harness B2.7 criado após074003; não falha de produto e não reabre o wrapper antigo já isolado.

Isolar os casos HTTP em subprocesso Bun nativo com cwd/env próprios, saída drenada sem usar Response do pai, prazo e kill apenas do child próprio. Preservar todos os casos e exigir resumo positivo/zero fail/exit0, sem contagem fixa. Não alterar setup global nem retirar testes da descoberta QA.

## Triage

- Decision: `VALID`
- Notes: Confirmado pelo implementador, que autorizou exclusivamente testes/helper QA. Resolvido movendo os6originais e regressões para fixtures/studio-python-builder.cases.ts; wrapper mantém descoberta em studio-python-builder.test.ts, Bunspawn/process.execPath,cwdpackage,windowsHide,envcopiada,drains20k com reader/TextDecoder,prazo20s/finallykillowned,exit0+positivepass/expect+0fail sem hardcode. Tipo503 do fake ajustado para body:{state:null}; globais de produto/setup intactos. Novo combo HappyDOM+wrapper3pass/0fail/28asserts exit0, child12casos/696asserts; child+JSlegado19/742 exit0. As regressões106001 aguardam qualificação SQL separada; wrapper não esconde falhas e todos os casos são executados em realm nativo. Nenhum produto alterado.
