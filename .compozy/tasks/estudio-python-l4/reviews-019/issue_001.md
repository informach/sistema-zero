---
status: resolved
file: packages/studio/src/components/code/PythonSourceEditor.tsx
line: 59
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Reconciliar o buffer de código quando a edição for recusada

## Review Comment

O onChange apenas mostra a mensagem devolvida por setPythonFile quando a store recusa a alteração. O model Monaco continua contendo o texto rejeitado, enquanto o Project permanece com a fonte anterior. Como o array files é memoizado pela referência do projeto, uma recusa não muda o objeto file e o efeito de reconciliação do MonacoTabs não restaura o model. A fonte exibida deixa de corresponder ao que será salvo ou executado, e esse texto não entra nos buffers de persistência existentes.

Reprodução independente com PythonSourceEditor e MonacoTabs reais, simulando somente o widget Monaco/worker e usando a store/snapshot reais: abrir main.py vazio e inserir 256.001 caracteres, acima da cota de arquivo. Resultado: modelLength=256001, persistedLength=0, alerta de limite visível e preparePythonExecutionSnapshot ainda permitido com a fonte vazia anterior. Salvar/sair não preserva o conteúdo que o editor continua mostrando.

Definir um resultado explícito para o gesto recusado: restaurar o model para a revisão aceita, preservando corretamente o histórico e informando a recusa, ou manter um buffer pendente recuperável que impeça Run/Save/export/promoção enquanto não resolvido. O erro local sozinho não fecha essa divergência. Não ampliar as cotas nem truncar o texto para fazer a gravação passar. Cobrir também a recusa por perda de autoria durante a edição.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com resultado explícito rejectedValue e compensação no mesmo grupo de edição do Monaco, preservando o histórico anterior e exibindo feedback da recusa. Revalidação independente confirmou a convergência model/store na recusa de colagem e em Undo recusado por quota total. A compatibilidade do novo retorno com callbacks legados gerou um achado distinto, registrado em issue_002.md. Nenhuma implementação alterada pelo revisor.

## Verification

- PythonSourceEditor/MonacoTabs reais, com TextModel e pilha Undo/Redo reais do Monaco em Bun+HappyDOM; somente widget visual e workers simulados. Colagem de 256.001 caracteres foi revertida para a fonte aceita, e Undo/Redo mantiveram as edições anteriores sem expor o texto recusado.
- Mesma prova: main.py começou com 200.000 caracteres, foi reduzido para cinco e outros arquivos passaram a ocupar 1.400.000 caracteres. Undo que ultrapassaria a quota total foi recusado, mantendo modelLength=storeLength=5 e sem exceção de undo.
- Log l4-python-source-editor-browser-2.log inspecionado: quatro casos reais Classic/Pro Chrome/Edge passaram. Nenhum navegador foi iniciado pelo revisor.
- `bun test src/monaco/__tests__/MonacoTabs.test.tsx src/python/blocks/workspaceDraft.test.ts`: 22 pass, 0 fail, 85 verificações. Biome dos três arquivos modificados passou.
