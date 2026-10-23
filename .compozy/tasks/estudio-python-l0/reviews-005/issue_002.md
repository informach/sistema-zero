---
status: resolved
file: experiments/studio-python-l0/web/frame.mjs
line: 64
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Envelope primitivo contorna a quota de mensagens

## Review Comment

Retorno para payload não objeto ocorre antes da contagem. Dez mil postMessage("untyped") terminaram em 32 ms com ok:true. Contar todos os eventos da geração antes de validar envelope e incluir string/null no teste. Não considerar limitar logs equivalente a limitar eventos recebidos.

## Triage

- Decision: `VALID`
- Notes: Quota conta todos os eventos da geração antes de verificar envelope. Dez mil mensagens string/null acionam falha controlada e permitem reinício nos mesmos reports Chrome/Edge da issue001; flood stdout mantém no máximo100 entradas.
