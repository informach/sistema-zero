---
status: resolved
file: packages/pinta/src/export/tiled/export.ts
line: 85
severity: high
author: claude-code
provider_ref:
---

# Issue 011: Referências object de camadas e peças não usam IDs Tiled

## Review Comment

Exportação só converte propriedades dos objetos; camada/peça sai com ID textual door em vez do numérico1. Importação também só remapeia propriedades de objetos. Resolver todos os contêineres com uma tabela comum, incluindo filhos expandidos dos conjuntos.

## Triage

- Decision: `VALID`
- Notes: VALID: repro Bun demonstra IDs textuais em propriedades de camada/peça e referências internas de conjunto resolvidas como zero. Resolver tabela completa e aplicar em todos os contêineres na exportação e importação.

## Remediation and Verification

Implementado: IDs numéricos previamente reservados para objetos diretos e filhos expandidos; referências em propriedades de peças, camadas, objetos e camadas de conjunto usam a mesma tabela. Importação JSON/TMX resolve todos os contêineres e registra identidades de filhos expandidos antes de descartar as camadas derivadas. Provas: review-regressions.test.ts (JSON e TMX), roundtrip completo. `cd packages/pinta && bun test src/export/tiled`: 61 pass, 0 fail, 792 asserts. Red inicial: expected ID1, received outside. Gate global delegado ao coordenador; status valid até esse gate.

## Fechamento da rodada

Referências numéricas de objetos em todos os contêineres Tiled incluídas na suíte Pinta; round-trip também executado no Tiled 1.12.2.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
