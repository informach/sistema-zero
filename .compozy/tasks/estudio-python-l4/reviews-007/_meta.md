---
provider: manual
pr:
round: 7
created_at: 2026-10-17T00:37:37Z
---

## Summary

- Total: 1
- Resolved: 1
- Unresolved: 0

## Scope

Mutadores/layout em blockly, shapeControls, placeholders, structuralCodec, advancedCatalog, contract e blockly.test; helper compartilhado withMutation lido integralmente. Sem revisão da futura UI, curadoria, catálogo Turtle ou ativação completa. Rodadas anteriores conhecidas, sem repetição de achados.

## Evidence

- Um defeito de preservação confirmado e corrigido durante a rodada: opção textual ativa reaplicada apagava o valor autoral. Prova independente e regressão do implementador validaram a correção.
- Prova adicional com Blockly headless real: comparador editado para GtE manteve o campo e as conexões de ambos os operandos ao aumentar contagem, desfazer, refazer e salvar/carregar. Recusar remoção de entrada ocupada conservou integralmente o estado serializado e a conexão original.
- Verificações finais frescas: `bun test src/python/blocks/blockly.test.ts src/python/blocks/coreCatalog.test.ts`, 11 pass / 490 verificações, exit 0; Biome dos sete arquivos revisados, exit 0.
- Lido o log l4-blockly-svg.log: 2/2 testes Chrome/Edge passaram antes da adição dos campos scope/weight aos itens do menu. A revisão desses campos foi estática; nenhum novo resultado SVG posterior foi inferido. O revisor não executou browser nem modificou implementação.
- Registros desta rodada descrevem somente o recorte revisado, sem declarar L4 ou produto completos.
