---
status: resolved
file: packages/pinta/src/tiles/terrain.ts
line: 106
severity: high
author: claude-code
provider_ref:
---

# Issue 005: Balde de terreno confunde decoração e vazio e apaga peças

## Review Comment

Com terreno0..15, mapa [16,-1,17], região do vazio abrange todas as células e vira [15,15,15]. A assinatura da busca deve distinguir vazio, peças alheias e padrões do terreno.

## Triage

- Decision: `valid`
- Notes: Valid: a assinatura [] identifica simultaneamente vazio e peças alheias. Repro puro já produziu [15,15,15] a partir de [16,-1,17]. Separar vazio/peça alheia/padrão visual Wang e testar o gesto completo.

## Implementation

terrainRegion agora distingue vazio, peças alheias (inclusive flags) e encaixes visuais. O gesto de balde preserva [16,-1,17] como [16,15,17].

## Verification

- RED: regressões novas falharam antes da correção (balde, H/V/D, recorte, cache, nível e posição no palco).
- GREEN local: `bun test packages/pinta/src/tiles/terrain.test.ts packages/pinta/src/tiles/sets.test.ts packages/pinta/src/components/editor/MapObjectArtwork.test.ts packages/pinta/src/components/editor/mapTools/mapTools.test.ts`: **73 pass, 0 fail**, 307 assertions.
- UI happy-dom, cwd `packages/pinta`: `bun test src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'inserção e colagem no espaço|biblioteca usa o tamanho'`: **6 pass, 0 fail**; regressões `--test-name-pattern 'biblioteca:|colar põe|níveis do editor'`: **6 pass, 0 fail**.
- Biome nos 13 arquivos de implementação/testes deste lote: **Checked 13 files; No fixes applied**. Nenhum navegador/motor externo/dispositivo físico foi usado neste lote.
- Status permanece `valid` até os gates globais coordenados pelo agente principal. Sem commit automático.

## Fechamento da rodada

Balde sobre decoração/vazio e histórico por gesto incluídos na suíte completa do Pinta.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
