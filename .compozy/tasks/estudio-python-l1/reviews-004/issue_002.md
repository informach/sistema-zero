---
status: resolved
file: packages/core/src/studio/project-environment.ts
line: 100
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Pastas explícitas escapavam da colisão com assets

## Review Comment

A verificação Python comparava arquivos e pais implícitos, mas omitia as pastas explícitas da revisão. Assets/ podia coexistir com assets/hero.png, criando uma colisão no Windows ao continuar o projeto no computador. Incluir os diretórios na mesma verificação de nomes e tipos.

## Triage

- Decision: `VALID`
- Notes: studioPortableFileConflict recebe diretórios e valida nomes, pais e conflitos arquivo/pasta. Captura Pro inclui todos os diretórios. Regressões e revisão independente confirmam recusa das colisões e aceitação da mesma pasta com grafia idêntica; Biome dos três arquivos passou.
