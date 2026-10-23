---
status: resolved
file: packages/studio/src/python/language/visualTransaction.ts
line: 207
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Reindentação de comandos modifica strings multilinha

## Review Comment

A reinserção de um comando aninhado aplica `rendered.replace(/\n/g, newline + indent)` a todas as linhas do fragmento. Isso também acrescenta espaços dentro de literais multilinha, mudando seu valor. O reparse e a comparação de AST detectam a divergência e protegem a fonte original, mas uma edição válida de bloco fica bloqueada.

Reprodução independente no parser/renderizador real: renomear inner para renamed neste programa:

```python
def outer():
    def inner():
        """first
        second"""
        return 1
    return inner()
```

O renderizador retorna `def renamed():\n    """first\n        second"""\n    return 1`. A reinserção adiciona quatro espaços em toda quebra, incluindo a linha `second` dentro da docstring; a transação lança `A alteração mudaria outro significado do programa`. O problema não depende de comentários nem de sintaxe opaca: FunctionDef e Constant já estão no catálogo visual.

Reindentar respeitando os intervalos lexicais dos literais, ou gerar o comando no contexto de indentação correto. Incluir regressão com função aninhada e docstring multilinha, verificando o valor exato do literal e o AST, também com CRLF. Não remover a comparação final para aceitar a alteração indevida.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente. A transação analisa o fragmento multilinha e usa intervalos dos tokens STRING/FSTRING_MIDDLE/TSTRING_MIDDLE para preservar as quebras pertencentes a literais, reindentando apenas a sintaxe externa. Há nova checagem de identidade/cancelamento depois desse await. O fixture completo provePythonVisualEdits passou contra parse/render reais do CPython 3.14.2, incluindo a reprodução da docstring. Casos adicionais independentes com LF e CRLF, Unicode e docstring aninhada produziram AST exatamente igual ao pretendido e mantiveram prefixo/sufixo externos ao comando. Mudança de fonte e cancelamento ocorridos durante o parse do fragmento foram recusados, respectivamente com erro de código alterado e AbortError. Unitários frescos de linguagem: 5 pass / 27 verificações, exit 0; Biome de visualTransaction.ts, exit 0. Inspecionado também o log do implementador com 2/2 testes Chrome/Edge aprovados; nenhum browser foi executado pelo revisor.
