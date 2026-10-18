---
status: resolved
file: packages/studio/src/python/language/visualTransaction.ts
line: 341
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Reaproveitar descendentes transferidos para blocos novos

## Review Comment

`renderInsertion` consulta `transfers` somente para o comando de primeiro nível da inserção. Se esse comando é um wrapper novo, seus descendentes existentes seguem juntos para `renderNewCommands` e são regenerados por CPython. As anotações desses descendentes já foram excluídas da origem por `transferredComments`, mas não há cópias no destino. A validação final corretamente recusa a operação, portanto um gesto comum de colocar um comando comentado dentro de uma condição nova não chega à fonte.

Reprodução independente com CPython 3.14.2: fonte `x=1 # nota\n`; manter o nó visual de `x` e conectá-lo ao body de um novo If com teste True. A AST resultante é válida, mas `preparePythonVisualTransaction` lança `Esta alteração precisa preservar os comentários do trecho.`. A mesma transferência para um If já existente passa. O plano exige renderizar somente comandos/fragmentos novos e reaproveitar trechos existentes; não exclui a criação de um pai novo na mesma operação.

Materializar recursivamente os descendentes transferidos ao construir o wrapper novo, conservando a identidade e as provas literais de cada trecho. Gerar apenas a estrutura realmente nova e compor suas suites com fragmentos existentes. Manter as verificações finais de unicidade, comentários e AST; não resolver regenerando ou apagando comentários.

## Triage

- Decision: `VALID`
- Notes: Falha de disponibilidade da edição, sem perda silenciosa: o gate recusa a transação. Nenhuma implementação alterada pelo revisor.

## Verification

- `bun .cache/studio-python-l0/review031-transfer-edges.ts`: caso `new wrapper around existing commented command` retorna `ok:false` com a mensagem acima.
- O harness usa parser/renderizador atuais no CPython 3.14.2 isolado, preserva IDs da AST original e passa pela projeção visual e transação reais.
- A fixture completa existente passou, mas não inclui wrapper novo com descendente transferido.

## Revalidation

- Implementador adotou template AST com Pass ordinário nos slots transferidos. O template gerado é reparsado e comparado; os intervalos desses Pass recebem os fragmentos literais dos descendentes. A comparação integral de comentários/cópias/AST continua obrigatória.
- Repetida a reprodução original: `x=1 # nota` torna-se `if True:\n    x=1 # nota\n`, com a grafia e o comentário originais preservados.
- `bun .cache/studio-python-l0/review031-transfer-fixed-matrix.ts`: 54/54 casos, nenhum erro. Inclui wrappers novos aninhados, múltiplos slots com type-ignore, ancestrais/descendentes movidos separadamente e string multilinha, com LF/CRLF/CR e EOF sem newline.
- Fixture completa atual via `bun .cache/studio-python-l0/review-native-visual-edits.ts` passou, incluindo os três novos casos permanentes da correção; sete casos adicionais de identificadores e quatro rejeições também passaram.
- Unidades dos helpers: 16 pass, 0 fail, 123 verificações; Biome: oito arquivos sem diagnósticos. Browser/build/TSC não executados pelo revisor. Registros resolvidos apenas para esta fatia.
