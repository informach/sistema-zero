---
status: resolved
file: packages/pinta/src/tiles/terrain.ts
line: 65
severity: high
author: claude-code
provider_ref:
---

# Issue 006: Pintura Wang ignora os flags existentes dos vizinhos

## Review Comment

Peça1 top-right espelhadaH corresponde visualmente a top-left; ao pintar à direita resolve padrão3 em vez de11 e perde o canto existente. Aplicar H/V/D à assinatura antes de impor novas restrições.

## Triage

- Decision: `valid`
- Notes: Valid: paintTerrain lê apenas cellTile; os encaixes não seguem H/V/D. Aplicar a transformação Tiled aos oito encaixes antes da comparação e testar as oito combinações, inclusive balde.

## Implementation

visualPattern aplica diagonal antes dos espelhos H/V, igual ao desenho da célula. A resolução e o balde usam o padrão transformado; testes exercitam as oito combinações em cantos e bordas e preservam vizinho já correto.

## Verification

- RED: regressões novas falharam antes da correção (balde, H/V/D, recorte, cache, nível e posição no palco).
- GREEN local: `bun test packages/pinta/src/tiles/terrain.test.ts packages/pinta/src/tiles/sets.test.ts packages/pinta/src/components/editor/MapObjectArtwork.test.ts packages/pinta/src/components/editor/mapTools/mapTools.test.ts`: **73 pass, 0 fail**, 307 assertions.
- UI happy-dom, cwd `packages/pinta`: `bun test src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'inserção e colagem no espaço|biblioteca usa o tamanho'`: **6 pass, 0 fail**; regressões `--test-name-pattern 'biblioteca:|colar põe|níveis do editor'`: **6 pass, 0 fail**.
- Biome nos 13 arquivos de implementação/testes deste lote: **Checked 13 files; No fixes applied**. Nenhum navegador/motor externo/dispositivo físico foi usado neste lote.
- Status permanece `valid` até os gates globais coordenados pelo agente principal. Sem commit automático.

## Fechamento da rodada

Vizinhos Wang nas oito combinações H/V/D incluídos na suíte completa do Pinta.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
