---
status: resolved
file: packages/core/src/studio/project-environment.ts
line: 55
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Artefatos permitem conflito entre arquivo e pasta

## Review Comment

A validação aceitava um artefato `runtime` e outro `runtime/worker.mjs`, embora o primeiro impeça criar a pasta do segundo. Também precisava considerar colisões de caixa nos pais implícitos, dentro e entre distribuições. Rejeitar esses conjuntos antes de aprovar o manifesto ou o lock.

## Triage

- Decision: `VALID`
- Notes: Corrigido por studioPortableFileConflict, compartilhado entre artefatos, distribuições e manifestos. Cobertura de ordem inversa, arquivo/pasta e diferenças de caixa; 13 testes, 114 verificações. Revisor readonly reexecutou e confirmou a resolução.
