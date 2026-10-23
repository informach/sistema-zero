---
status: resolved
file: packages/core/src/studio/python-builder-types.ts
line: 172
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Rejeição por header não retira o body da Response possuída

## Review Comment

request() recebia a Response e chamava readJsonBodyWithLimit sem um finally próprio para retirar o body. O leitor compartilhado pode recusar Content-Length maior que a cota antes de obter reader. O cliente devolve unavailable e fecha a sessão privada, mas o stream da resposta rejeitada permanece sem cancelamento solicitado. A recusa do protocolo não encerra todos os recursos de transporte que o cliente já recebeu.

Reprodução independente `packages/members/.cache/review102-types-response-ownership.test.ts`: fetchport controlado devolve Response nativa com bodyReadableStream e Content-Length=maxResponseBytes+1 no start. Cliente retorna unavailable e faz DELETE da sessão, mas underlying.cancel é chamado0vezes, esperado1. Antes:próprio+permanentes20pass1fail/50asserts exit1; falha exclusiva em cancelbody. Não afirma vazamento permanente de heap/TCP ou falha do fetch nativo: conexão pode ser retirada depois por timeout/GC. Prova porta ownership de Response no novo cliente, distinta do antigo consumidor S2S074.

Proteger leitura com try/finally e solicitar cancelamento do body possuído inclusive em falhas anteriores a getReader. Não aguardar confirmação de cancelamento de stream não cooperativo; preservar retirement de respostas tardias e encerramento independente da sessão.

## Triage

- Decision: `VALID`
- Notes: Resolvido após confirmação e patch do implementador. Requestfinally solicita body.cancel().catch sem aguardar. Prova própria original ampliada com cancelamento cooperativo e ACK que nunca resolve:2pass0fail/6asserts exit0; ambos solicitam cancelbody1 e operação retornaunavailable com DELETEsession, sem prender owner. Produção/permanentes intocados pelo revisor. Sem qualificação DO/SDK/Cloudflare ou leakpermanente.
