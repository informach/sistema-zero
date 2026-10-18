---
status: resolved
file: packages/studio/src/components/tutor/ProBuilderPanel.tsx
line: 405
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Painel recusa todo Python pelo envelope JavaScript

## Review Comment

Depois de capturar corretamente a revisão Python v2, create() aplica incondicionalmente `studioProBuildEnvelopeIssue`. Esse contrato pertence ao compilador JavaScript: suas extensões admitidas excluem .py/.pyi e os binários precisam estar em public/. Portanto qualquer Python Pro normal é recusado pelo main.py antes de chamar adapter.create, embora Members/BFF já admitam sua revisão canônica. Os caminhos portáteis dos assets também seriam rejeitados pelo mesmo guard.

Probe independente com React/Panel/store/captura Core reais `packages/studio/.cache/review107-python-builder-materials.test.tsx`: Python Pro mínimo e Python Pro com PNG real em dist/sprite.png produzem `O arquivo main.py não é compatível com o compilador remoto...`, com zero dispatch ao adapter. O controle JavaScript no mesmo teste chega ao adapter. Resultado 1 pass/2 fail/18 asserts, exit1. Fonte/projeto não foram alterados pelo clique. Nenhum modelo/interpreter foi executado.

Selecionar a admissão pelo discriminante da revisão: manter o envelope atual para JavaScript e reutilizar a materialização/política Python já existentes para Python. Cobrir pelo painel mínimo, PNG portátil e controle JS. Novo consumidor UI B2.10; distinto da issue100, cujo guard de diretórios npm no backend foi corrigido e não é reaberto.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved. Panel agora materializa Python pelo prepareStudioPythonProExecution existente; envelope JS permanece somente no JS. Probe causal original após fix3/3 pass; permanente autorizado ProBuilderPanel.python.test.tsx contém mínimo/PythonPNG em assets e dist/controleJS/proveniência das duas linguagens. Permanente+causalcache9pass/0fail/74asserts; suite UI/legado27/169 e Biome11 arquivos passaram. Revisor editou apenas o novo teste permanente autorizado e caches/docs, sem produção. Nenhum modelo/interpreter é executado pelo teste do painel; não anuncia disponibilidade global de Construir.
