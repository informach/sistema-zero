---
status: resolved
file: packages/studio/src/monaco/MonacoTabs.tsx
line: 558
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Reconhecer explicitamente o retorno de recusa do editor

## Review Comment

A nova compensação trata qualquer retorno truthy de onChange como `{ rejectedValue: string }`. O contrato legado é um callback void: TypeScript permite atribuir funções que retornam valores a esse tipo, porque o chamador ignorava o retorno. Um callback comum como `(path, value) => changes.push({ path, value })` retorna um número; callbacks async retornam uma Promise. Agora ambos entram na compensação com rejectedValue undefined.

Reprodução independente com MonacoTabs e TextModel reais, simulando apenas o widget: onChange acumula a alteração em uma lista e retorna 1. Ao editar script.js para `const accepted = 1;`, o callback recebeu o texto correto, mas a compensação chamou executeEdits com text undefined e apagou o model inteiro. Esse retorno era válido e ignorado antes da mudança. Não foi identificado callsite atual do produto retornando número; o defeito é uma regressão da API compartilhada que continua declarando aceitar callbacks void.

Reconhecer somente o envelope explícito de recusa, com verificação de objeto e rejectedValue string, antes de alterar o model. Continuar ignorando os demais retornos permitidos pelo contrato legado. Cobrir callback void, retorno numérico e Promise, além da recusa válida.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com guard estrutural explícito do envelope e rejectedValue string. Revalidação independente com TextModel real confirmou a preservação dos retornos legados e a compensação apenas da recusa válida. Nenhuma implementação foi modificada pelo revisor.

## Verification

- Bun+HappyDOM, MonacoTabs e TextModel reais: retornos número, Promise, void, objeto vazio e rejectedValue numérico conservaram model="accepted"; rejectedValue="old" compensou para model="old". Exit 0.
- PythonSourceEditor/MonacoTabs/TextModel reais: perder autoria ou trocar o projeto antes do commit React recusou a edição tardia, sem alterar a fonte aceita do projeto atual. Somente widget visual e workers simulados.
- `bun test src/state/pythonHostLimits.test.ts src/state/pythonProjectStore.test.ts src/monaco/__tests__/MonacoTabs.test.tsx src/python/blocks/workspaceDraft.test.ts`: 36 pass, 0 fail, 187 verificações.
- Biome dos cinco arquivos da correção passou. Log l4-python-source-editor-browser-4.log inspecionado: oito casos Classic/Pro Chrome/Edge passaram, incluindo Undo/Redo sob quota total. Nenhum navegador ou TSC executado pelo revisor.
