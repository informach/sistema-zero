---
status: resolved
file: packages/core/src/studio/pro-revision.ts
line: 390
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Edição Python recusava caminhos aceitos na captura

## Review Comment

A captura v2 aceitava a política portátil Python, mas a aplicação de alterações ainda usava a política JavaScript. Assim, dist/main.py e caminhos com mais de 12 segmentos podiam ser salvos, mas não editados nem desfeitos. Usar a mesma política por linguagem em captura e aplicação.

## Triage

- Decision: `VALID`
- Notes: Corrigido com revisionPathValidator compartilhado, mantendo a política JS. Testes cobrem edição e inversão; revisão independente também executou o limite de 16 segmentos. 24 testes e 137 verificações passaram no conjunto focado.
