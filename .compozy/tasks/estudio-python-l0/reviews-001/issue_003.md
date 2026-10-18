---
status: resolved
file: experiments/studio-python-l0/probe.ts
line: 42
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Falhas podiam perder ou sobrescrever evidência

## Review Comment

Arquivo único era sobrescrito e falhas de lançamento/limpeza não eram persistidas.

## Triage

- Decision: `VALID`
- Notes: Arquivos timestamp+UUID, gravação incremental atômica e registros de falha por fase.

## Resolution

Corrigido pelo implementador e reavaliado pelo agente /root/python_runtime_surface. Revisor confirmou as cinco correções sem novo bloqueio neste recorte. Testes independentes: node --test checks.test.ts, 3 pass / 0 fail. Matriz após correções: browser-probes-2026-10-16T17-34-09.394Z-cdc5b7e7-e8c1-43ea-8dce-f8ef0d9a1f03.json no cache local. Isto não aprova Turtle completo, segurança, desempenho ou L0 inteiro.
