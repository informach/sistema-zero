---
status: resolved
file: packages/core/src/studio/pinta-scene-player.ts
line: 22
severity: high
author: codex
provider_ref:
---

# Issue 019: Colisão de conjunto escalado deixa células sólidas vazias

## Review Comment

`setRows` projetava somente o centro de cada tile do conjunto para uma célula do mapa principal. Um tile sólido ampliado duas vezes ocupava quatro células visuais, mas apenas uma recebia colisão. Escalas diferentes por eixo e giros alinhados também produziam lacunas.

## Triage

- Decision: `VALID`
- Root cause: forward scatter do centro original não preenche a cobertura da transformação.
- Fix: amostrar inversamente os centros das células do mapa principal, restrito à área do retângulo transformado e recortado aos limites do mapa. A transformação inversa aplica giro, espelhos e escala antes de consultar a célula original. Prioridade de sólido sobre plataforma preservada.
- Limit: a colisão JavaScript continua sendo uma grade. Em giros livres ou deslocamentos fora da grade, a amostragem não representa um polígono exato por pixel; R08/R18 permanecem parciais nesse ponto.

## Remediation and Verification

- Red: o teste `a collision set scaled 2 by 2 fills every covered root cell` esperava quatro células sólidas e recebeu uma. O teste comparativo também falhava em escala não uniforme.
- Green: `cd packages/studio && bun test src/official-extensions/map-2d/runtime.test.ts`: **7 pass, 0 fail, 6.180 assertivas**. Inclui 96 combinações de escala 1/2/3 por eixo, giros 0/90/180/270, dois espelhos, recorte dos limites e precedência sobre plataformas, comparadas com `sceneSolidAt` nos centros de todas as células.
- Medição intermediária: Jogo 2D **434.329**, Avançado **422.627** caracteres; deltas **13.895/13.894**, com teto auxiliar temporário **14.500**. Depois da compactação de espaços da fonte gerada (issue 016), os valores finais são **433.815/422.113**, deltas **13.381/13.380** e teto auxiliar **14.000**. Tetos absolutos dos motores e do documento de cena permanecem iguais.
- Biome dos dois arquivos e `git diff --check` passaram. Sem commits. Gate global final delegado ao coordenador; status `valid` até esse gate.

## Fechamento da rodada

Colisão amostrada nas 96 combinações de transformações alinhadas incluída na suíte completa do Estúdio. Giros livres continuam aproximados e R08 permanece parcial.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
