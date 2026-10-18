---
status: resolved
file: experiments/studio-python-l0/probe.ts
line: 35
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: Filtros inválidos produziam matriz vazia bem-sucedida

## Review Comment

Nome de engine/modo incorreto podia selecionar zero provas e sair sem erro.

## Triage

- Decision: `VALID`
- Notes: Rejeitar filtros desconhecidos/vazios e exigir ao menos uma engine-slice-passed.

## Resolution

Corrigido pelo implementador e reavaliado pelo agente /root/python_runtime_surface. Revisor confirmou as cinco correções sem novo bloqueio neste recorte. Testes independentes: node --test checks.test.ts, 3 pass / 0 fail. Matriz após correções: browser-probes-2026-10-16T17-34-09.394Z-cdc5b7e7-e8c1-43ea-8dce-f8ef0d9a1f03.json no cache local. Isto não aprova Turtle completo, segurança, desempenho ou L0 inteiro.
