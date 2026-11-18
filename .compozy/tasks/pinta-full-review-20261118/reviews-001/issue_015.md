---
status: resolved
file: packages/members/src/application/content-admin/content-admin.service.ts
line: 862
severity: high
author: claude-code
provider_ref:
---

# Issue 015: Autoria de aula aceita desenho que o aluno não pode enviar

## Review Comment

Autoria aplica apenas wire e1.8M chars, enquanto submit aplica pintaLessonLimitIssue com128x128/8camadas/64peças. Um inicial129col ou9camadas é salvo mas nunca enviável sem o aluno alterar nada. Aplicar o mesmo gate na autoria, com mensagem própria e regressão HTTP/serviço.

## Triage

- Decision: `UNREVIEWED`
- Notes: reproduções leves na rodada independente; verificar regressão antes da correção.

## Fechamento da rodada

Limites de autoria/entrega e proteção contra cliente antigo incluídos nos testes HTTP em processo do Members. Isso não é ensaio do banco/host implantado.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
