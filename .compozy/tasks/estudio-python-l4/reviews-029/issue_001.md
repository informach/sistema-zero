---
status: resolved
file: packages/studio/src/python/blocks/workspaceDraft.ts
line: 187
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Validar o orçamento da coleção após renomear arquivos

## Review Comment

`preservePythonWorkspaceDraft` valida a coleção antiga em `readDrafts`, altera os caminhos e retorna `pack` sem validar o envelope resultante. A renomeação pode aumentar o orçamento de texto além de 8.388.608 caracteres, embora a coleção original seja válida. `withTree` publica esse estado e a store informa sucesso; a próxima leitura de qualquer cache lança `StudioProjectJsonError` com código `json-budget`. Os gates de execução também usam esse leitor, portanto a renomeação deixa o projeto salvo num estado que a própria infraestrutura visual não consegue ler.

Reprodução independente, sem alterar fontes: fixture Python Classic real com `a.py` e `b.py`, dois caches confirmados e notas dimensionadas para somarem 8.388.606 caracteres pelo mesmo cálculo de chaves+strings do copiador. Antes da renomeação, ambos são legíveis. `renameExtraFile('a.py', 'longer_a.py')` retorna `null` e publica o arquivo novo; a coleção passa a 8.388.613 caracteres. `readPythonWorkspaceDraft(project, 'b.py')` passa a lançar `O projeto excede o limite de complexidade.`.

Validar/capturar o envelope final no empacotador compartilhado, incluindo a transformação de caminhos. A fronteira de edição de arquivos deve converter essa falha para seu contrato de erro e manter o projeto original, sem publicar uma coleção acima do limite. Cobrir o limite agregado de dois arquivos, não apenas o tamanho isolado de um cache.

## Triage

- Decision: `VALID`
- Notes: Implementador passou a validar/copiar o estado final em pack e a converter a falha em erro de edição em withTree. Revalidação independente confirmou rejeição antes da publicação, preservando a identidade original da store e ambos os caches legíveis. Nenhuma implementação alterada pelo revisor.

## Verification

- Prova readonly com `pythonEnvironmentFixture`, `createProjectStore`, `preservePythonWorkspaceDraft` e `readPythonWorkspaceDraft` reais: `beforeChars=8388606`, `afterChars=8388613`, `storeRename=null`, `renamedFilePresent=true`, releitura falha com `json-budget`.
- A suíte corrente de caches passa 16 testes / 95 verificações, mas não cobre aumento de orçamento por renomeação.

## Revalidation

- Repetida a mesma reprodução independente com orçamento original de 8.388.606 caracteres. `preservePythonWorkspaceDraft` agora lança `json-budget` antes de devolver o estado inválido; `renameExtraFile` retorna a mensagem de complexidade, mantém exatamente o objeto original da store e conserva os dois caches legíveis/iguais. O caminho novo não foi publicado.
- `bun test src/python/blocks/workspaceDraft.test.ts src/python/blocks/commitWorkspace.test.ts src/python/blocks/workspaceDraftPersistence.test.ts src/python/blocks/workspaceHydration.test.ts`: 18 pass, 0 fail, 112 expect() calls. Inclui regressão permanente de orçamento após renomeação. Aviso esperado de hidratação demorada, sem erro.
- Biome dos três arquivos alterados nesta correção: 3 arquivos verificados, sem alterações ou diagnósticos. Não executados browser, build ou TSC.
