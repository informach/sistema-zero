---
status: resolved
file: packages/studio-language-service/runtime/pyright.ts
line: 211
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Preservar comandos da revisão nova ao sincronizar

## Review Comment

Antes de alterar o filesystem, o comando `sync` aborta todos os demais elementos de `pending`, que guarda apenas controllers. Isso inclui outros `sync` já enfileirados em `tail` e consultas que declaram justamente a revisão nova. A intenção documentada nesse ponto é cancelar consultas da revisão anterior, não descartar esses comandos válidos.

Reprodução com Pyright 1.1.414 real: despachar, sem aguardar o boot, `sync a` de revisão 0 para 1, `sync b` de 1 para 2 e uma consulta `c` vinculada à revisão 1. O retorno é `[synced(1), cancelled, cancelled]`; `b` nunca atualiza o arquivo e `c` também é abortada pelo primeiro sync. Para confirmar a consulta independentemente da revisão 2, basta omitir `b`: ela continua sendo cancelada pelo sync que publicaria sua própria revisão.

Guardar tipo/revisão junto ao controller e revogar somente consultas obsoletas em relação à revisão que será publicada. As sincronizações devem conservar a ordem e a validação de `baseRevision` existentes. Incluir provas concorrentes de dois syncs consecutivos e de query para a revisão nova; manter a recusa de consultas efetivamente antigas.

## Triage

- Decision: `VALID`
- Notes: Intenção e defeito confirmados pelo implementador; correção revalidada independentemente. Fonte não alterada pelo revisor.

## Verification

- `bun .cache/studio-python-l0/review033-concurrency.ts`: Pyright real devolveu `synced` para `a` e `cancelled` para `b` e `c`; exit 0.
- A suíte existente do serviço passou 5 testes/55 verificações, mas envia seus syncs e queries sequencialmente.

## Revalidation

- `pending` agora registra tipo e revisão. A sincronização cancela somente queries de revisão inferior à que está sendo publicada, preservando os syncs seguintes e a consulta da revisão nova.
- `bun test tests` no pacote do serviço: 8 passaram, 0 falharam, 65 verificações. A nova prova com Pyright real cobre sync1+query1 e sync2+sync3+query3.
- Harness independente original: `a` e `b` agora retornam `synced(1)` e `synced(2)`. A consulta `c`, vinculada à revisão 1, é corretamente cancelada quando a revisão 2 entra.
