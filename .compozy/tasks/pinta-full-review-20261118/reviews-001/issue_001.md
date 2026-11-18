---
status: resolved
file: packages/member-shell/src/lib/pinta-cloud-persistence.ts
line: 142
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Memória de formato desaparece quando a escrita no storage falha

## Review Comment

getItem continua legível, setItem lança QuotaExceededError; set(schema4) seguido de get perde a entrada porque read substitui o fallback pelo storage antigo. A proteção de formato perdido deixa de atuar. Manter fallback coerente após falha de escrita/remover, preservando releitura entre abas quando saudável.

## Triage

- Decision: `UNREVIEWED`
- Notes: reproduções leves na rodada independente; verificar regressão antes da correção.

## Fechamento da rodada

Memória de formato sob quota: regressões incluídas na suíte completa do member-shell; sem reler storage obsoleto após falha de escrita.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
