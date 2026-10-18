---
status: resolved
file: packages/core/src/studio/project-document.ts
line: 337
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Migração pode atribuir uma release incompatível

## Review Comment

A migração 2→3 conferia apenas a linguagem. Uma release JavaScript legítima e verificada, restrita a Pro/Código, era atribuída a um clássico/Ponte; a migração passava, mas o resolver rejeitava o resultado. Versões de extensões também precisavam ser conferidas. Validar compatibilidade estática antes de devolver o documento, sem depender de disponibilidade do host ou grants.

## Triage

- Decision: `VALID`
- Notes: Após validar o envelope, a migração confere tipos, modos e cada ID/versão de extensão. Recusa preserva o original; leitura idempotente de v3 não reatribui release. Teste positivo/negativo adicionado; 15 testes/92 verificações passaram. Revisor confirmou a correção.
