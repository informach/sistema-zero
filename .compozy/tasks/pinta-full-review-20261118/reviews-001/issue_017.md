---
status: resolved
file: packages/studio/src/runtime/python/pygame/py/pinta.py
line: 589
severity: high
author: codex
provider_ref:
---

# Issue 017: API Python pública não consulta objetos expandidos da cena

## Triage

- Decision: VALID. O compositor v2 expandia conjuntos, mas `Mapa.objetos()` consultava
  somente as camadas antigas. Renderização e consulta discordavam sobre IDs e posições.

## Implementation

Wrapper usa os objetos canônicos da cena v2 com identidade estável entre consultas.
Preserva o fallback v1 e v2 sem cena. O trecho gerado continua derivado do mesmo compositor.

## Verification

Regressão do carregamento público de PNG, conjuntos refletidos, escalas, offsets e referências
internas/externas: RED com IDs antigos, GREEN com 46 conferências em `test-pinta-module.py
--sem-pygame`. Modos nativos e regeneração são registrados no QA final.

## Fechamento da rodada

API pública Python verificada com pygame-ce real e 46 conferências sem pygame; PyDew real executado com o módulo regenerado.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
