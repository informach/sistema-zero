---
status: resolved
file: packages/studio/src/python/language/statementInsertions.ts
line: 47
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Decorator parentetizado recebe inserção dentro da expressão

## Review Comment

O início do range AST do decorator não identifica necessariamente a linha de seu @. Em um decorator parentetizado, o range pode começar na expressão de uma linha interna. O planner aceita o prefixo só de espaços dessa linha e devolve uma inserção dentro dos parênteses, embora a operação solicitada seja inserir antes da definição inteira.

Reprodução independente com o parser CPython 3.14.2 e a transação real: fonte `# lead\n@(\n    decorator\n)\ndef f():\n    pass\n`, adicionando `print('novo')` antes da definição na projeção. O planner escolhe offset 10, a linha interna depois de `@(`, e a transação termina com 'A alteração visual não produziu um programa Python válido'. O caso simples @decorator passa. A versão parentetizada de uma linha cai no fallback e é recusada pelo comentário do arquivo.

Localizar a abertura do decorator usando os tokens/contexto léxico que já pertencem ao documento, incluindo parênteses e quebras, antes de escolher a linha de inserção. Se não for possível identificar a abertura com segurança, não retornar um plano supostamente válido dentro da expressão. Cobrir decorators parentetizados de uma e várias linhas, mantendo os bytes anteriores e posteriores intactos.

## Triage

- Decision: `VALID`
- Notes: Resolvido e revalidado independentemente em 2026-10-17T01:07:31Z. O planner percorre os tokens NL/COMMENT/parênteses até o @ real, em vez de usar a linha interna da expressão AST. O caso original, a forma parentetizada de uma linha, parênteses aninhados com comentários/CRLF e decorators consecutivos passaram com fonte exata. Também passaram decorator com argumentos e lambda parentetizada, inserção antes/depois e a fixture completa provePythonVisualEdits, usando parser/render CPython 3.14.2 reais em memória. Nenhuma fonte de implementação ou browser foi alterado/executado pelo revisor; o documento original permaneceu intacto.
