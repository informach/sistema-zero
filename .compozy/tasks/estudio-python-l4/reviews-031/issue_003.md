---
status: resolved
file: packages/studio/src/python/language/statementTransfers.ts
line: 58
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Ajustar o token elif ao transferir seu If visual

## Review Comment

O CPython representa `elif` como um nó `If` dentro do `orelse`, e esse nó é editável pelo catálogo visual. O intervalo obtido por `pythonStatementLines` começa no token `elif`. Ao mover esse If para a raiz ou para outra suite, a transferência reaproveita o cabeçalho literalmente, produzindo `elif` sem um `if` anterior naquele contexto. A AST desejada é válida, mas o candidato textual é inválido e a operação é recusada.

Reprodução independente: fonte `if True:\n    pass\nelif False: # cond\n    x=1 # nota\nprint(3)\n`; retirar o nó If do `orelse` e colocá-lo depois de `print(3)`. `preparePythonVisualTransaction` lança `A alteração visual não produziu um programa Python válido.`. O resultado pretendido contém `if False: # cond` como comando independente e conserva `# nota`. A fatia anterior já representa/remonta ramos elif; a transferência precisa considerar a dependência contextual desse token.

Quando o If originado em elif deixa esse contexto, substituir somente o token do cabeçalho por `if`, compondo a edição ao fragmento transferido. Preservar as cópias dos comentários e do restante do corpo, com validação final integral. Cobrir retirada para a raiz e transferência para uma suite aninhada.

## Triage

- Decision: `VALID`
- Notes: O candidato inválido não é publicado; o defeito bloqueia uma transferência de nó visual representável. Nenhuma implementação alterada pelo revisor.

## Verification

- `bun .cache/studio-python-l0/review031-transfer-edges.ts`: caso `elif transferred to root` retorna `ok:false` com a mensagem acima.
- Cinco composições adicionais passam no mesmo harness: troca entre funções, pai/filho transferidos separadamente, grupo adjacente e substituição de corpo vazio. A recusa foi isolada ao cabeçalho dependente do contexto.

## Revalidation

- Implementador localiza o token NAME no offset original, inclusive após DEDENT, e compõe somente a substituição elif→if com as edições do fragmento. O corpo e as anotações continuam vinculados às cópias comprovadas.
- A reprodução original passou: o If retirado do orelse chega à raiz com `if False: # cond`, preservando `x=1 # nota`.
- Matriz nativa independente passou 54/54. Casos específicos incluem elif→else de um wrapper novo, elif→else vazio de If existente e cadeia elif movida para dois wrappers aninhados. Todas as variações LF/CRLF/CR e EOF passaram pelo reparse/AST/copias reais.
- Fixture completa atual e oito reproduções originais passaram; unidades 16/123 e Biome oito arquivos também passaram. Não se extrapola esta evidência para os gates restantes do produto.
