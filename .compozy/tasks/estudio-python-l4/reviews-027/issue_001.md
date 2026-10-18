---
status: resolved
file: packages/studio/src/python/language/visualTransaction.ts
line: 142
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Preservar a identidade ao mover comandos de AST igual

## Review Comment

Os atalhos de igualdade semântica em compare(), nos campos e nos elementos de arrays descartam um gesto quando os comandos têm ASTs iguais, mesmo que suas identidades e comentários sejam diferentes. A transação anuncia sucesso e reaplica origens sobre a ordem antiga, sem realizar a reordenação solicitada.

Reprodução independente com analyzer CPython 3.14.2 real e preparePythonVisualTransaction: analisar `pass # primeiro\npass # segundo\n`, inverter projection.body e preparar a próxima geração. O retorno contém edits=[] e exatamente a fonte original, embora as origens pedidas sejam IDs 3,2 em vez de 2,3. A mesma reprodução confirmou o problema dentro de uma função e do body de um if. Não há alteração de valor simultânea; são apenas movimentos suportados de comandos existentes.

A comparação usada para detectar alterações deve considerar a origem dos nós retidos, separadamente da prova semântica final após reparse. Aplicar a mesma distinção à elegibilidade de cópia de um comando composto: a igualdade semântica de seu corpo não deve esconder uma reordenação interna. Conservar a equivalência de nós auxiliares criados pelos codecs que não possuem origem. Acrescentar casos de comandos iguais com comentários distintos no módulo e em suites.

## Triage

- Decision: `VALID`
- Notes: Implementador adotou samePythonSourceTree nos três atalhos do visitor e na elegibilidade de cópia de statementMoves. Revalidação independente confirmou a correção. Nenhuma implementação alterada pelo revisor.

## Verification

- Repetidas as três reproduções pela transação completa com analyzer CPython 3.14.2 real: módulo, corpo de função e corpo de if agora produzem exatamente a inversão dos comentários/comandos, com uma edição em cada caso.
- Movimento de um comando composto junto com reordenação interna é recusado com segurança no recorte ainda não suportado, em vez de copiar silenciosamente o corpo antigo.
- Fixture provePythonVisualEdits atual executada com o analyzer nativo: seis casos de movimento no módulo, seis em suites e quatro de inserção aninhada passaram; fonte sem alterações e comentários preservados. A fixture também cobre append interno/externo na mesma posição e a guarda de encoding.
- `bun test src/python/language/sourceLines.test.ts src/python/language/sourceCopies.test.ts src/python/language/sourceEdits.test.ts`: 10 pass, 0 fail, 98 expect() calls.
- `bun x biome check` nos quatro arquivos de implementação do recorte, incluindo sourceTree.ts: Checked 4 files; No fixes applied. Sem execução de navegador ou TSC pelo revisor.
