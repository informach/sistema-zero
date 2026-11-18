---
status: resolved
file: packages/pinta/src/components/editor/MapLibraryPanel.tsx
line: 74
severity: high
author: claude-code
provider_ref:
---

# Issue 009: Inserção e colagem usam posição mundial como local

## Review Comment

Camada offsetX32, alvo mundial80 gera objeto local80 exibido em112. Biblioteca/clipboard devem converter para camada e respeitar encaixe escolhido. Não ocultar por correção do desenho apenas.

## Triage

- Decision: `valid`
- Notes: Valid: o ponteiro está no espaço mundial e biblioteca/clipboard gravam coordenadas locais. Descontar o offset efetivo, propagar snapObjects e usar dimensões reais dos conjuntos. Testar pelo fluxo de UI sem alterar layout.

## Implementation

Biblioteca e clipboard descontam effectiveLayer.offset e recebem snapObjects do mesmo controlador; pontos encaixam no centro da casa e desenhos/grupos pela borda. Biblioteca usa largura/altura reais de map-set ao limitar a posição. UI cobre offsets herdados com encaixe ligado/desligado, conjuntos maiores e bloqueio de camada. Biblioteca por arrasto e prévia/ghost continuam lacuna R14; não foram substituídas por placeholder.

## Verification

- RED: regressões novas falharam antes da correção (balde, H/V/D, recorte, cache, nível e posição no palco).
- GREEN local: `bun test packages/pinta/src/tiles/terrain.test.ts packages/pinta/src/tiles/sets.test.ts packages/pinta/src/components/editor/MapObjectArtwork.test.ts packages/pinta/src/components/editor/mapTools/mapTools.test.ts`: **73 pass, 0 fail**, 307 assertions.
- UI happy-dom, cwd `packages/pinta`: `bun test src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'inserção e colagem no espaço|biblioteca usa o tamanho'`: **6 pass, 0 fail**; regressões `--test-name-pattern 'biblioteca:|colar põe|níveis do editor'`: **6 pass, 0 fail**.
- Biome nos 13 arquivos de implementação/testes deste lote: **Checked 13 files; No fixes applied**. Nenhum navegador/motor externo/dispositivo físico foi usado neste lote.
- Status permanece `valid` até os gates globais coordenados pelo agente principal. Sem commit automático.

## Fechamento da rodada

Biblioteca e clipboard com offsets herdados, encaixe e camadas bloqueadas incluídos na suíte completa do Pinta.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
