---
status: resolved
file: experiments/studio-python-l0/web/frame.mjs
line: 76
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Bootstrap alternativo deixa a policy de workers disponível

## Review Comment

A reserva vazia da policy sz-python-bootstrap existia só no bootstrap clássico. Revisor executou Firefox150/blob e Python criou a policy e construiu Worker com sua própria TrustedScriptURL. Não atribuir proteção a um perfil sem a reserva. Restringir explicitamente o modo protegido ao bootstrap qualificado e provar recusa dos demais antes de iniciar worker; não usar fallback sem proteção.

## Triage

- Decision: `VALID`
- Notes: Guard aplicado dentro de start antes da criação. Revisor observou a nova rejeição no WebKit. Prova automatizada Chrome `security-chrome-abcc6f61-1e31-4b9d-97e7-78eb24e3b5f8.json` e Edge `security-edge-3935ef71-6804-4d8c-95d5-7d83fcde296d.json` passou: direct/blob/blob-inline recusados antes de criar worker, sem target adicional. Caminho clássico continua protegido e reiniciável.
