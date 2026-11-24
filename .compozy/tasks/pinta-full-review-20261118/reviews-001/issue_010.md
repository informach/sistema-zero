---
status: resolved
file: packages/pinta/src/components/editor/mapTools/mapLevels.ts
line: 88
severity: medium
author: claude-code
provider_ref:
---

# Issue 010: Nível Começar omite recursos essenciais da missão

## Review Comment

Terreno e biblioteca ficam em Criar mais e conjunto só no Avançado. A missão pede terrenos/objetos em Começar e conjuntos em Criar mais. Corrigir exposição sem burlar allowTools ou criar oficinas diferentes.

## Triage

- Decision: `valid`
- Notes: Valid: FEATURE_LEVEL conflita com os níveis da missão. Expor terreno e biblioteca em Começar e conjuntos em Criar mais; manter curadoria e exposição dos recursos já usados.

## Implementation

Terreno e biblioteca agora aparecem em Começar; conjuntos, animações e colisão de camada em Criar mais. O checkbox de colisão foi extraído do bloco técnico, sem duplicação nem mudança de estilo. A flag própria `layerCollision` é reexposta quando o mapa já usa colisão, sem ligar `layerAdvanced`; opacidade, grupo, deslocamento/parallax e propriedades técnicas continuam em Avançado. Curadoria isMapToolAvailable e exibição dos recursos já usados seguem no mesmo caminho, sem nova oficina ou mudança de estilo.

## Verification

- RED: regressões novas falharam antes da correção (balde, H/V/D, recorte, cache, nível e posição no palco).
- GREEN local: `bun test packages/pinta/src/tiles/terrain.test.ts packages/pinta/src/tiles/sets.test.ts packages/pinta/src/components/editor/MapObjectArtwork.test.ts packages/pinta/src/components/editor/mapTools/mapTools.test.ts`: **73 pass, 0 fail**, 307 assertions.
- UI happy-dom, cwd `packages/pinta`: `bun test src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'inserção e colagem no espaço|biblioteca usa o tamanho'`: **6 pass, 0 fail**; regressões `--test-name-pattern 'biblioteca:|colar põe|níveis do editor'`: **6 pass, 0 fail**.
- Biome nos 13 arquivos de implementação/testes deste lote: **Checked 13 files; No fixes applied**. Nenhum navegador/motor externo/dispositivo físico foi usado neste lote.
- Status permanece `valid` até os gates globais coordenados pelo agente principal. Sem commit automático.

## Verificação do lote final de exposição

- RED: os dois novos testes falharam antes da correção: `layerCollision` ausente e checkbox não encontrado em Criar mais.
- GREEN: `bun test src/components/editor/mapTools/mapTools.test.ts src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'colisão de camada'`: **2 pass, 0 fail**, 17 asserções.
- Regressão estreita: `bun test src/components/editor/mapTools/mapTools.test.ts src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'níveis|camada trancada: marcar colisão'`: **13 pass, 0 fail**, 103 asserções, 2,05s.
- O teste UI confere checkbox ausente num mapa novo em Começar, presente em Criar mais, controles técnicos ainda ocultos antes e depois de marcar, colisão conservada ao voltar para Começar e controles técnicos presentes em Avançado. Curadoria/atalhos e bloqueio de camada também passam no mesmo recorte.
- Sem alteração de CSS/copy ou de tetos de criação. Gates globais seguem coordenados pela sessão principal; nenhum commit automático.

## Fechamento da rodada

Curadoria dos três níveis e colisão em Criar mais incluídas na suíte completa do Pinta, sem expor os controles técnicos de Avançado.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
