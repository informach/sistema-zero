---
status: resolved
file: packages/core/src/studio/project-environment.ts
line: 24
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Leitor Python e revisão divergiam em caminhos reservados

## Review Comment

`constructor/helper.py` e `constructor/hero.gif` passavam no envelope/leitor Python, mas a revisão Pro v2 os recusava por uma lista adicional de componentes reservados. Isso permitia abrir um projeto sem conseguir aplicar suas revisões. Unificar a política portátil Python entre documentos, materiais e CAS, preservando a política JavaScript existente.

## Triage

- Decision: `VALID`
- Notes: Componentes `__proto__`, `constructor` e `prototype` agora são reservados pelo predicado portátil compartilhado, inclusive variantes de caixa. A revisão reusa esse mesmo predicado; `constructor.py` continua permitido.
- Verification: Testes de paths e leitor/CAS após correção: 57 testes, 348 verificações, seis arquivos; revalidação independente sem novos achados. Biome e diff --check limpos.
