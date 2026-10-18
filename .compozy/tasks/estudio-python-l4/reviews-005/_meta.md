---
provider: manual
pr:
round: 5
created_at: 2026-10-17T00:20:42Z
---

## Summary

- Total: 2
- Resolved: 2
- Unresolved: 0

## Scope

Fundação L4.3/L4.4: contract, nodes, float, structuralCodec, catálogos core/structure/advanced/call, catalog, scope, projection e helper importado; experimentos block-conformance.ts e block-language-proof.py. Implementação somente leitura. Blockly, UI, curadoria, edição localizada e ativação do produto são etapas seguintes, não falhas desta fatia.

## Evidence

- Leitura completa dos fontes prioritários e imports, com PRD, techspec, tarefas e plano L4. Rodadas 001–004 conhecidas; nenhum achado duplicado.
- Unitários existentes executados: `bun test src/python/blocks/coreCatalog.test.ts`, 4 pass / 234 verificações, exit 0. Biome check dos 11 fontes prioritários, exit 0. Essas verificações anteriores à correção não cobriam os casos adversariais registrados.
- Provas independentes em stdin, sem alterar implementação: parser CPython 3.14.2 real → projeção TS → reconstrução AST. Falhas Starred e rótulos incorretos confirmados. Programa de classes aninhadas executado isoladamente pelo CPython fixado: stdout `999 999`, exit 0; os dois nós eram especializados como math.sqrt.
- Nenhum navegador executado pelo revisor. A prova nativa original de 13 programas foi lida, sem confundi-la com qualificação de todas as famílias do catálogo.
- Nenhum defeito adicional confirmado de precisão dos inteiros, conversão binary64 ou preservação de sintaxe opaca fora das ocorrências listadas. A geração continua passando pela validação AST do analisador; futura desserialização de visual/IR deve validar entrada antes de entregar estes contratos tipados aos codecs.
- Primeira revalidação dos fixes: 21 programas, 21 compilações e 19 pares executados com AST e resultado equivalentes; nenhum AST original mutado. Métodos em literais continuam especializados; chamadas autorais dos casos iniciais ficam genéricas. Issue001 resolvido. A ocorrência remanescente de issue002 em Global/Nonlocal foi confirmada nessa etapa e corrigida em seguida.
- Revalidação final do resolvedor: 24 programas, 24 compilações, 22 pares executados. Global/Nonlocal e exec/globals entre escopos deixam chamadas genéricas, com AST e resultado preservados e nenhum AST original mutado; imports inequívocos de math/random continuam especializados. Issue002 resolvido. Unitários focados frescos: 4 pass / 234 verificações, exit 0; Biome de scope.ts, exit 0. Nenhum browser executado e nenhuma implementação alterada pelo revisor.
