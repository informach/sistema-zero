---
status: resolved
file: packages/studio/src/python/blocks/commitWorkspace.ts
line: 52
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Vincular o gesto ao rascunho criado antes da publicação

## Review Comment

O helper capturava persistedDraft da store depois de applyPythonSourceFiles concluir. A publicação da store notifica subscribers sincronamente; um subscriber pode gravar um gesto mais novo antes de a chamada original retornar. Nesse caso o gesto antigo passa a usar o rascunho novo como seu token de CAS e posteriormente o apaga ao publicar sua própria fonte.

Reprodução independente com store, controller e helper reais, simulando somente o parser: um subscriber substitui o primeiro rascunho por uma geração nova com workspace.marker=newer-gesture. O helper antigo terminou accepted com source=print('old') e blocksState=null, perdendo o gesto novo. Vincular a operação à generation do rascunho criado antes da publicação; reler a store somente para verificar que o mesmo gesto continua vigente, nunca para assumir arbitrariamente o rascunho atual.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com comparação persistedDraft.generation === draft.generation antes de iniciar a análise. Revalidação independente recusou o gesto antigo, preservou exatamente o rascunho novo e não iniciou o parser. Nenhuma implementação alterada pelo revisor.

## Verification

- Mesma reprodução após fix: result=AbortError, source vazia, workspace.marker=newer-gesture, generation nova preservada, prepares=0.
- Regressão permanente acrescentada em commitWorkspace.test.ts para substituição síncrona de rascunho por subscriber.
- Suite fresca após os fixes: 13 pass, 0 fail, 53 verificações; Biome de quatro arquivos passou.
- A prova browser anterior ao guard extra registrou 6/6 casos Blockly/CPython Chrome/Edge; foi apenas inspecionada e não é usada como prova da corrida corrigida.
