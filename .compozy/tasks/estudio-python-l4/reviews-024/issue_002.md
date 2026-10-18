---
status: resolved
file: packages/studio/src/python/blocks/blockly.ts
line: 189
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Preservar o rótulo reclassificado ao reconstruir o layout

## Review Comment

applyLayout recriava HEADER usando codec.title, descartando a classificação atual de apresentação. Depois de detectar print sombreado e apresentar 'chamada Python (ver código)', um mutador que adiciona argumento reconstruía o título como 'mostrar no console'. Se o argumento novo ficava incompleto, a geração falhava e a revalidação pós-commit nunca ocorria; a afirmação oficial falsa permanecia na tela.

Prova independente com Blockly real: updatePythonWorkspacePresentation sobre AST com print atribuído produzia título genérico. setPythonOption('args:count',2) voltava ao título oficial e deixava a segunda entrada vazia. A reconstrução deve preservar a classificação vigente ou revalidá-la independentemente do sucesso da geração, sem introduzir eventos no histórico.

## Triage

- Decision: `VALID`
- Notes: O implementador preservou o FieldLabel atual antes de remover HEADER. A mesma prova agora conserva o título genérico com a entrada ainda vazia. Reader já impede importar esse título como conteúdo autoral. Nenhuma implementação alterada pelo revisor.

## Verification

- Antes e depois do mutador: 'chamada Python (ver código)'; missingValue=true; zero workspaces remanescentes.
- Regressão browser do implementador ampliada para shadowing, Undo, Redo e argumento incompleto; evidência inspecionada no fechamento da rodada.
