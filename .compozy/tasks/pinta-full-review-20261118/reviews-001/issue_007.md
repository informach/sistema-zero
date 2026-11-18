---
status: resolved
file: packages/pinta/src/tiles/sets.ts
line: 80
severity: high
author: claude-code
provider_ref:
---

# Issue 007: Recorte de conjunto perde conteúdo quando a camada tem offset

## Review Comment

Mapa [0,1,2] offsetX16, recorte visualcol1 largura1 salva peça1 deslocada para fora. Converter o retângulo visual para cada camada e normalizar os offsets, inclusive herdados/fracionários.

## Triage

- Decision: `valid`
- Notes: Valid: o recorte usa coordenadas de célula sem remover o offset efetivo. Converter para o espaço visual por camada, compensando offsets dos grupos preservados. Recusar offsets de peças fora da grade com mensagem explícita antes de escrever; objetos mantêm offsets fracionários.

## Implementation

createMapSet converte o retângulo mundial para cada grade e compensa os offsets herdados mantendo grupos. Recusa com COPY.scene.setCropAlignment somente peças desalinhadas que intersectam o recorte, inclusive uma peça entrando pela borda; conteúdo desalinhado fora dele não bloqueia a ação. Objetos com offsets fracionários preservam a posição visual e sobrevivem ao round-trip, em conjunto com a correção de sanitizeLayerCommon feita pela tarefa de dados. A fixture Vila e Floresta continua construindo 18 camadas, um conjunto e Sombras offsetX=2 sem alterar fixture.ts.

## Verification

- RED: regressões novas falharam antes da correção (balde, H/V/D, recorte, cache, nível e posição no palco).
- GREEN local: `bun test packages/pinta/src/tiles/terrain.test.ts packages/pinta/src/tiles/sets.test.ts packages/pinta/src/components/editor/MapObjectArtwork.test.ts packages/pinta/src/components/editor/mapTools/mapTools.test.ts`: **73 pass, 0 fail**, 307 assertions.
- UI happy-dom, cwd `packages/pinta`: `bun test src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'inserção e colagem no espaço|biblioteca usa o tamanho'`: **6 pass, 0 fail**; regressões `--test-name-pattern 'biblioteca:|colar põe|níveis do editor'`: **6 pass, 0 fail**.
- Biome nos 13 arquivos de implementação/testes deste lote: **Checked 13 files; No fixes applied**. Nenhum navegador/motor externo/dispositivo físico foi usado neste lote.
- Status permanece `valid` até os gates globais coordenados pelo agente principal. Sem commit automático.

## Fechamento da rodada

Recortes de camadas deslocadas e recusa explícita de corte parcial incluídos na suíte completa do Pinta.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
