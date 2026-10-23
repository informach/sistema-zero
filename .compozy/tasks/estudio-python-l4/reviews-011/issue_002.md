---
status: resolved
file: packages/studio/src/python/language/visualTransaction.ts
line: 295
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: TypeIgnore mantém linha antiga e impede inserir antes dele

## Review Comment

Inserções que acrescentam linhas antes de um comentário type: ignore movem seu TypeIgnore.lineno no AST reparsado. A árvore esperada conserva a linha do documento original, e pythonSemanticTree inclui esse campo. Assim a comparação final interpreta uma atualização correta da posição do comentário como mudança de significado e recusa a inserção, embora todos os bytes originais e o comentário tenham sido preservados.

Reprodução independente: fonte `# head\nx = 1 # type: ignore[assignment]\n`; adicionar `print('novo')` antes de x. O planner produz a inserção correta no offset 7, mas preparePythonVisualTransaction lança 'A alteração mudaria outro significado do programa'. Adicionar o mesmo comando no final do arquivo passa, pois não desloca o TypeIgnore existente.

Remapear as posições derivadas dos TypeIgnore conforme as edições antes da comparação final, verificando que comentário/tag e associação ao comando original permanecem intactos. Não remover a proteção semântica nem ignorar indiscriminadamente comentários de tipo. Cobrir LF/CRLF, inserção antes e depois do ignore e rejeição de alterações efetivas da tag/associação.

## Triage

- Decision: `VALID`
- Notes: Resolvido e revalidado independentemente em 2026-10-17T01:07:31Z. relocatePythonTypeIgnores encontra os comentários preservados e aplica os deltas de linhas antes da comparação semântica, exigindo antes igualdade das diretivas originais. O caso original passou em LF/CRLF; diretivas de arquivo e de comandos, múltiplas inserções e append conservaram todos os bytes originais e as linhas reparsadas esperadas. Quatro negativos independentes (tag, linha, remoção e ordem das diretivas) continuaram recusados. A fixture completa provePythonVisualEdits e 19 transações adicionais passaram no parser/render CPython 3.14.2, sem execução do código autoral. Os snapshots de entrada permaneceram iguais.
