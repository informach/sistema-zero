---
status: resolved
file: packages/studio/src/core/pythonAssets.ts
line: 62
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Material FLAC sem caminho explícito era recusado

## Review Comment

A política de materiais Python aceita `.flac`, mas a tabela de extensões compartilhada do materializador JavaScript não mapeia `audio/flac`. Sem `proPath`, os bytes recebiam `.bin` e eram recusados; com `clip.flac`, o mesmo material passava. Alinhar a extensão automática Python sem alterar caminhos históricos do JavaScript.

## Triage

- Decision: `VALID`
- Notes: O adapter Python resolve `audio/flac` e `audio/x-flac` para `.flac`; a tabela/fallback JS permanecem iguais. Teste cobre os dois MIME, caminhos gerado/explícito e igualdade dos bytes/hash.
- Verification: Revalidação independente: 25 testes, 109 verificações em materializadores/revisões JS e Python. Prova adicional confirmou fallback `.bin` JS. Biome e diff --check limpos; typecheck Studio passou.
