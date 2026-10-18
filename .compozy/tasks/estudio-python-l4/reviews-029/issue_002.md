---
status: resolved
file: packages/studio/src/python/blocks/workspaceDraft.ts
line: 96
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Evitar coerção de campos de caches desconhecidos

## Review Comment

O novo leitor usa `String(project.blocksState.kind)` antes da cópia limitada e `String(state.activePath)` mesmo quando a versão da coleção não foi reconhecida. Esses campos vêm de JSON opaco e não precisam ser strings. Um objeto JSON com propriedade própria `toString` não chamável faz a conversão lançar `TypeError`; não é necessário executar um getter ou fornecer uma função.

Duas reproduções independentes foram aceitas e preservadas por `refinePythonProjectDocument`: `blocksState={kind:{toString:'not callable'}}` e `blocksState={kind:'python-workspace-collection',version:2,activePath:{toString:'not callable'},drafts:[]}`. Em ambos, tanto `readPythonWorkspaceDraft` quanto `preparePythonExecutionSnapshot` lançam `TypeError: No default value`. Assim, um cache desconhecido que deveria permanecer inerte impede executar a fonte autoritativa, além de impedir a abertura normal dos blocos.

Comparar os discriminantes por tipo/igualdade sem coerção. Retornar `activePath` apenas quando seu tipo foi validado; versões e formatos desconhecidos devem seguir o caminho de cache ausente. Manter a cópia limitada para envelopes reconhecidos e os guards dos rascunhos pendentes válidos. Cobrir os dois campos e confirmar que o snapshot da fonte continua possível para metadados opacos desconhecidos.

## Triage

- Decision: `VALID`
- Notes: Implementador removeu as coerções e usa igualdade estrita para kind e guard typeof string para activePath. As duas reproduções originais agora são ignoradas como cache desconhecido e deixam o snapshot da fonte executável. Nenhuma implementação alterada pelo revisor.

## Verification

- Prova readonly com reader e snapshot reais, duas entradas JSON: `readerAccepted=true`; `read=TypeError: No default value`; `run=TypeError: No default value` em ambas.
- Não houve execução de código do aluno ou uso de navegador na reprodução.

## Revalidation

- Repetidas sem alterar as entradas as duas reproduções originais com reader e snapshot reais: `readerAccepted=true`, `read=ignored`, `run=2` arquivos em ambas, sem exceção. Nenhuma coerção foi executada.
- A regressão permanente cobre quatro envelopes desconhecidos. Suíte dos quatro arquivos de caches: 18 pass, 0 fail, 112 expect() calls; Biome dos três arquivos da correção passou. Nenhum browser, build ou TSC iniciado pelo revisor.
