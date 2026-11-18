---
status: resolved
file: packages/member-shell/src/lib/pinta-cloud-persistence.ts
line: 876
severity: high
author: claude-code
provider_ref:
---

# Issue 004: Reconciliação não confere a versão atual retornada pelo download

## Review Comment

Listagem formato3/rev1 seguida de download formato4/rev2 persiste o item e não avisa. Conferir downloaded.summary antes de parse/persist; manter nuvem e local intocados quando incompatível.

## Triage

- Decision: `UNREVIEWED`
- Notes: reproduções leves na rodada independente; verificar regressão antes da correção.

## Fechamento da rodada

A corrida listagem/download é coberta pela suíte completa de nuvem do community-kids, conferindo a versão realmente baixada.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
