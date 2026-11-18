---
status: resolved
file: packages/core/src/studio/pinta-scene-player.ts
line: 32
severity: high
author: claude-code
provider_ref:
---

# Issue 014: Consulta de área de polilinha usa retângulo em vez do caminho

## Review Comment

inside trata polyline como caixa enquanto a geometria autoral usa distância aos segmentos. Um ponto longe do caminho mas dentro da caixa ativa a área. Unificar comportamento de pontos/bordas/caminhos e testar paridade do runtime portátil.

## Triage

- Decision: `UNREVIEWED`
- Notes: reproduções leves na rodada independente; verificar regressão antes da correção.

## Fechamento da rodada

Segmentos de polilinha, ponto e bordas de polígonos incluídos na suíte completa do Estúdio.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
