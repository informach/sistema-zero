---
status: resolved
file: packages/studio-language-service/runtime/pyright.ts
line: 202
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Liberar espera cancelada durante a inicialização

## Review Comment

O sinal combinado já inclui cancelamento do caller, cancelamento explícito e deadline, mas `handle` aguarda `this.ready` sem observar esse sinal. Um pedido cancelado durante a inicialização só retorna e libera sua posição em `pending` depois que o initialize responde ou atinge seu próprio prazo de 15 segundos. O mesmo padrão de espera não abortável existe em `await this.tail`; a checagem posterior impede trabalho obsoleto, mas não libera a espera no momento da revogação.

Reprodução com um processo LSP controlado que responde initialize após 900 ms: o caller aborta após 30 ms, mas `handle` só devolve `cancelled` após 962 ms. Não se trata de latência do Pyright nem de uma exigência de encerrar a sessão: a Promise do consumidor continua presa ao boot compartilhado. Isso mantém slots ocupados e impede cancelamento oportuno do fluxo HTTP/cliente durante conexão lenta.

Tornar as esperas de boot/fila abortáveis por caller, mantendo a inicialização e sincronizações de outros donos intactas. Não encerrar a conexão inteira só porque um consumidor desistiu de esperar. Cobrir aborto antes/durante initialize, cancelamento de espera em fila e conclusão tardia sem publicação ou retenção do slot.

## Triage

- Decision: `VALID`
- Notes: Defeito confirmado pelo implementador; correção das esperas revalidada independentemente. Fonte não alterada pelo revisor.

## Verification

- `bun .cache/studio-python-l0/review033-concurrency.ts`: resultado `cancelDuringBoot.kind=error`, `code=cancelled`, `ms=962`, apesar do aborto em 30 ms e initialize artificial de 900 ms; exit 0.
- O processo controlado usa protocolo JSON-RPC Content-Length e Node reais. Não executa fonte autoral.

## Revalidation

- Boot, espera da fila e espera do sync agora passam pelo helper abortável; o cancelamento de um caller não cancela a inicialização compartilhada.
- Harness independente original, ainda com initialize de 900 ms e aborto após 30 ms: devolveu `cancelled` em 41 ms, contra os 962 ms anteriores.
- `bun test tests`: 8 passaram, 0 falharam, 65 verificações, incluindo boot cancelado seguido de sincronização e consulta na mesma sessão. A proteção de quantidade de operações retidas após liberar o caller é uma questão separada, registrada na issue 004.
