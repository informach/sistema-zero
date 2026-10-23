---
status: resolved
file: packages/studio/src/python/language/statementTransfers.ts
line: 111
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Distinguir continuação de expressão da indentação de suite

## Review Comment

`reindentPythonTransferredFragment` exige que toda linha de sintaxe não vazia comece pelo prefixo literal da suite original. Python permite que linhas de continuação dentro de parênteses, colchetes ou chaves tenham indentação menor ou diferente desse prefixo. Uma atribuição visual comum com essa formatação é recusada ao mudar de suite, apesar de a linha não representar um novo nível de bloco.

Reprodução independente: mover a atribuição abaixo da função para a raiz, deixando `pass` na função:

```python
def f():
    x = (
1 + 2
    ) # nota
print(3)
```

A fonte original é válida no CPython 3.14.2. A transação lança `A indentação deste comando precisa ser ajustada no modo fonte.` ao encontrar `1 + 2`, porque a linha não começa com quatro espaços. O caso usa linhas próprias e continuação parentetizada; não é uma suite inline ou múltiplos comandos separados por ponto e vírgula, que são as restrições declaradas.

Usar o contexto léxico dos tokens para distinguir linhas de suite de continuações de expressão. Ajustar apenas a indentação estrutural necessária, preservando texto e strings; continuar exigindo reparse e AST completa iguais à intenção visual. Cobrir parênteses/colchetes/chaves e comentários dentro dessas continuações.

## Triage

- Decision: `VALID`
- Notes: A operação é recusada com segurança, mas o contrato de transferência de sintaxe multilinha fica incompleto. Nenhuma implementação alterada pelo revisor.

## Verification

- `bun .cache/studio-python-l0/review031-transfer-edges.ts`: caso `continuation outside indentation` retorna `ok:false` com a mensagem acima.
- A atribuição é representável pelos codecs atuais; a reprodução passa pela AST/projeção/transação reais, não chama apenas o helper de indentação.

## Revalidation

- Implementador distingue continuação por tokens NEWLINE, conservando prefixos menores quando não representam indentação estrutural. A proteção dos intervalos STRING/FSTRING_MIDDLE/TSTRING_MIDDLE permanece.
- A reprodução original passou: a atribuição sai da função preservando `1 + 2` sem indentação; a função recebe Pass e o comentário literal continua junto da atribuição.
- Matriz nativa independente de 54 casos passou integralmente. Inclui continuações em colchetes/chaves/backslash, strings multilinha e transferências para wrappers novos com LF/CRLF/CR e EOF sem newline. Cada caso percorre os gates de comentário e AST final da transação real.
- Fixture completa atual passou no CPython 3.14.2; unidades dos helpers passaram 16 testes / 123 verificações. Biome dos oito arquivos passou sem diagnósticos. Nenhuma implementação alterada pelo revisor.
