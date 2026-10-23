---
status: resolved
file: packages/studio-language-service/runtime/pyright.ts
line: 111
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Não armar watchdog após a resposta do RPC

## Review Comment

`request` limpa o watchdog no `finally` da Promise RPC, mas o listener de abort permanece instalado até o `finally` externo do `Promise.race`. Há uma janela de microtarefas em que o RPC já resolveu e limpou o timer; o sinal então aborta e `abort()` cria um novo `killTimer`. Como o `finally` do RPC já ocorreu, ninguém limpa esse timer. Um segundo depois ele chama `dispose()` e encerra a sessão saudável, embora o servidor não tenha ignorado cancelamento.

Reprodução determinística do método real, com um RPC que devolve uma Promise já resolvida e aborto agendado por microtarefas: após 1,1 segundo, `rpcSettled=true` e `disposedAfterSettledResponse=1`. O defeito não depende de uma resposta malformada, JSON-RPC hostil ou timeout do engine; é a ordem legal entre settlement e revogação no mesmo turno.

Registrar que o RPC terminou antes de o handler poder agendar o watchdog e só manter a política de encerramento quando ainda houver uma requisição upstream sem resposta. Limpar timer/token de forma idempotente em todos os caminhos. Cobrir resposta antes/depois do cancelamento e servidor que realmente ignora cancelamento, preservando o limite de um segundo neste último caso.

## Triage

- Decision: `VALID`
- Notes: Reprodução isolada da máquina de cancelamento; correção revalidada, sem alegar frequência da corrida no Pyright. Fonte não alterada pelo revisor.

## Verification

- `bun .cache/studio-python-l0/review033-cancel-race.ts`: `{"rpcSettled":true,"disposedAfterSettledResponse":1}`; exit 0.
- O harness invoca `PythonLanguageSession.prototype.request` atual com Promise nativa e sinal real; substitui somente a dependência RPC e o observador de dispose.

## Revalidation

- O `finally` do RPC marca `settled` antes de limpar timer/token. O handler de abort só arma o watchdog quando esse estado ainda é falso.
- `bun .cache/studio-python-l0/review033-cancel-race.ts`: `{"rpcSettled":true,"disposedAfterSettledResponse":0}`, após os mesmos 1,1 segundo da reprodução original; exit 0.
- A regressão permanente da mesma janela de microtarefas passou em `bun test tests` (8 testes, 65 verificações).
