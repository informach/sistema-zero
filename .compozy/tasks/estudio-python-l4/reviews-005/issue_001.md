---
status: resolved
file: packages/studio/src/python/blocks/nodes.ts
line: 32
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Destinos com Starred não completam o roundtrip visual

## Review Comment

`withTargetContext` reconhece Name, Attribute, Subscript e sequências List/Tuple, mas recusava Starred. A projeção aceita a atribuição e a sequência, preserva o filho Starred como nó opaco e depois chama esse helper para reconstruir o destino. Portanto a sintaxe válida aceita na ida não pode voltar para AST, mesmo sem editar nenhum bloco.

Reprodução independente com AST produzido pelo analisador CPython 3.14.2: `first, *rest = [1, 2, 3]` projeta `sz_py_assign → sz_py_tuple → variável + opaque:Starred`, mas `pythonVisualToAST` lança `Escolha uma variável, atributo ou item para receber o valor.` O mesmo acontece com `for first, *rest in [[1, 2, 3]]: pass`. Os consumidores afetados são coreCatalog.ts (atribuição) e structureCatalog.ts (for).

Preservar Starred recursivamente ao estabelecer Store, incluindo o contexto do seu valor e sem mutar o nó original. Alternativamente, a ida precisa recusar a especialização inteira e conservar o comando opaco; não deve aceitar uma representação cujo retorno falha. Cobrir atribuição e for, aninhamento e ausência de mutação; não permitir `del *target`, que não é destino Python válido.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente. withTargetContext preserva Starred em Store, convertendo o valor recursivamente sem alterar o nó recebido; Starred em Del continua recusado. Prova fresca pelo analisador CPython real → projeção → AST → geração/compilação: 21 programas (19 fixtures e dois casos independentes), 21 compilações, 19 pares executados com mesmo resultado. Inclui atribuição e for com Starred, desempacotamento aninhado (`(a, (b, *rest)), *tail = ...`), igualdade integral do AST sem metadados de posição e ausência de mutação do AST original. Verificações adicionais de Store recursivo e recusa de Del passaram. Unitários focados frescos: 4 pass / 234 verificações, exit 0; nenhum browser executado.
