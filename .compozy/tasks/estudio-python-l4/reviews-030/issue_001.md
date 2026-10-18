---
status: resolved
file: packages/studio/src/python/language/typeIgnorePositions.ts
line: 69
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Considerar o LF contextual de TypeIgnore ao preservar anotações

## Review Comment

Ao remover um ramo opcional, `planPythonBranchRemoval` conserva os comentários do comando removido como linhas independentes. Se o comando tinha `# type: ignore[assignment]` inline, o CPython 3.14.2 muda o campo AST `TypeIgnore.tag` de `[assignment]` para `[assignment]\n` quando o mesmo comentário passa a ocupar sozinho uma linha. O conteúdo do token COMMENT permanece idêntico. `relocatePythonTypeIgnores` remapeia apenas `lineno`, deixando a tag antiga; por isso a comparação semântica final recusa a operação prometida pela nova fixture.

Reprodução independente com CPython 3.14.2: remover o else de `while False` dentro de uma função CRLF, contendo `x = 1 # type: ignore[assignment]`. O candidato conserva `# fim` e `# type: ignore[assignment]` exatamente, mas a transação lança `A alteração mudaria outro significado do programa`. As duas tags capturadas no resultado real são `[assignment]` e `[assignment]\n`, ambas na linha 5. A fixture completa também falha em `pythonVisualEdits.ts:761`, na comparação da remoção desse ramo.

Tratar explicitamente a regra contextual do parser, sem ignorar `type_ignores`, aceitar tags arbitrárias do candidato ou relaxar a comparação da AST restante. Derivar a mudança estrita do LF final da posição comprovada do mesmo comentário e da condição de linha independente; preservar a tag completa e exigir os mapas/cópias/tokens de comentário já existentes. Cobrir inline→isolado, o inverso quando aplicável, CRLF/EOF e alterações não autorizadas de tag.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou a diferença no CPython e aplicou normalização estrita do único LF contextual. Correção revalidada independentemente: a tag vem da árvore original, só o LF sintético final acompanha o contexto comprovado do comentário; alterações arbitrárias de tag continuam recusadas. Nenhuma implementação alterada pelo revisor.

## Verification

- Prova nativa readonly: `before.tag=[assignment]`, `after.tag=[assignment]\n`; candidato CRLF mantém os dois comentários e falha na comparação semântica final.
- Fixture completa nativa falhou no mesmo caminho. Não se afirma aprovação dessa fixture enquanto o achado estiver pendente.
- Seis combinações independentes de Try/else/finally passaram: remoção de ambos; remoção de um com inserção do outro; inserção de ambos; append no else junto de finally; remoção de else junto de edição no handler.
- Biome dos três arquivos novos/alterados de planner: sem diagnósticos. Browser, build e TSC não foram executados pelo revisor.

## Resolution Verification

- A reprodução original passou no CPython 3.14.2 com o candidato CRLF exato, incluindo os dois comentários preservados e `tag=[assignment]\n`.
- A fixture completa atual `provePythonVisualEdits` passou via CPython nativo, junto de sete casos adicionais de identificadores e quatro nomes inválidos recusados: `wholeFixture:true`, `additionalIdentifierCases:7`, `invalidIdentifiersRejected:4`.
- Matriz independente de ramos: 48 casos passaram sem falhas, cobrindo oito combinações de Try/else/finally/elif, LF/CRLF/CR e presença/ausência de newline no EOF.
- Matriz contextual da correção: 36 casos inline↔isolado passaram com LF/CRLF/CR, EOF, espaços/tabs/formfeed e tag com Unicode/texto adicional. Em cada caso, a AST real do CPython concordou com a tag remapeada. Foram recusadas 72 adulterações de tag ou cópia literal: `contextCases:36`, `tamperingRejected:72`.
- `bun test src/python/language/composeCopiedEdit.test.ts src/python/language/sourceEdits.test.ts src/python/language/sourceCopies.test.ts src/python/language/sourceLines.test.ts`: 14 pass, 0 fail, 114 verificações.
- `bunx biome check packages/studio/src/python/language/branchEdits.ts packages/studio/src/python/language/statementInsertions.ts packages/studio/src/python/language/visualTransaction.ts packages/studio/src/python/language/typeIgnorePositions.ts`: 4 arquivos, nenhum diagnóstico.
- A falha de Redo observada pelo implementador na prova UI permanece em investigação separada; esta resolução qualifica o relocator e a transação nativa, não aprova essa prova UI nem o produto completo.
