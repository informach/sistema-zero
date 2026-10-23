---
provider: manual
pr:
round: 6
created_at: 2026-10-17T00:32:06Z
---

## Summary

- Total: 2
- Resolved: 2
- Unresolved: 0

## Scope

Blockly e serialização atuais (blockly.ts/test), readNode/readResult, visualTransaction, preservação de origin em projection e provas pythonBlocks/pythonVisualEdits/python-analysis/analysisHost. Leitura completa dos fontes prioritários e imports; PRD e planos L4 conhecidos. Novos controles dinâmicos/mutadores e UI posteriores estão fora desta rodada. Implementação somente leitura.

## Evidence

- Unitários frescos: `bun test src/python/language/readResult.test.ts src/python/language/sourceEdits.test.ts src/python/blocks/blockly.test.ts src/python/blocks/coreCatalog.test.ts`, 13 pass / 344 verificações, exit 0.
- Biome check de visualTransaction.ts, readNode.ts e readResult.ts, exit 0. Nenhum achado de estilo foi registrado.
- Três reproduções adversariais com CPython 3.14.2 real, chamados em memória por stdin: texto de f-string, reordenação de Starred e docstring multilinha aninhada. A comparação final de AST protegeu a fonte original nos três casos; os defeitos bloqueiam a edição válida.
- Primeiros dois casos corrigidos durante a revisão e revalidados pelo fixture provePythonVisualEdits com parse/render nativo, incluindo regressões de CRLF/Unicode, comentários, fonte inalterada, concorrência e precedência. A primeira invocação do harness independente omitiu `-X utf8` no Windows e falhou na decodificação do stdin; corrigido o harness em memória, a execução completa passou. Não atribuído ao produto.
- Serialização/layout, limites de AST opaca, preservação de origem e revisão síncrona no commit sem outro achado material confirmado neste recorte. Nenhuma qualificação da UI completa ou do cancelamento de worker é inferida da prova nativa.
- Somente registros de review escritos; nenhum browser executado nem fonte de implementação alterada pelo revisor.
- Revalidação final de issue002: fixture completo de edições passou no CPython real; provas extras LF/CRLF com docstring e Unicode preservaram AST e texto externo ao comando. Digitação concorrente e cancelamento durante a nova análise do fragmento foram recusados após o await. Unitários de linguagem frescos 5 pass / 27 verificações e Biome de visualTransaction.ts, exit 0. Log l4-visual-fragments-browser.log inspecionado: 2/2 Chrome/Edge passaram sob execução do implementador. Novos controles dinâmicos Blockly permanecem fora desta revalidação.
