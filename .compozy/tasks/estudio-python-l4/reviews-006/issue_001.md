---
status: resolved
file: packages/studio/src/python/language/visualTransaction.ts
line: 75
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Fragmentos gerados ignoram contexto de f-string e destino

## Review Comment

A seleção do menor nó alterado e a conversão para uma expressão independente não preservavam o contexto sintático em dois casos válidos dos blocos existentes. A validação final impedia a gravação incorreta, mas também impedia aplicar a edição legítima.

Provas independentes com parse/render reais do CPython 3.14.2:

- Em `message = f"Hello {name}!"`, alterar o bloco de texto `Hello ` para `Hi ` gerava o Constant interno como string comum e inseria a expressão parentetizada no intervalo interno da f-string. O reparse recusava por AST diferente. Esse fragmento precisa ser gerado dentro do JoinedStr, preservando escapes e interpolação.
- Em `first, *rest = [1, 2, 3]`, reordenar os destinos para `*rest, first` tentava renderizar a tupla como expressão, convertendo ctx de Starred para Load, mas mantendo Store no seu value. O analisador recusava a divergência estrutural. A conversão de contexto precisa ser recursiva também nesse filho, ou deve ser escolhido o comando pai como fragmento.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente. O diff escolhe o JoinedStr completo quando alterado; expressionForRendering converte o value de Starred recursivamente. O fixture provePythonVisualEdits foi executado contra o analisador/renderizador nativo real, com saída `message = (f'Hi {name}!')` e `((*rest, first)) = [1, 2, 3]`, sem divergência do AST. Também passaram as provas do mesmo fixture para edição local CRLF/Unicode, fonte inalterada byte a byte, preservação de comentários, staleness durante render e no commit, fonte inválida e precedência. Nenhuma implementação alterada ou navegador executado pelo revisor.
