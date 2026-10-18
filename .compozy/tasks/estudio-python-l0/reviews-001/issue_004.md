---
status: resolved
file: experiments/studio-python-l0/probe.ts
line: 181
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Sondas registravam saída sem comprovar comportamento

## Review Comment

Registrar stdout e duração sem asserções permitia classificar execução incorreta como aprovada.

## Triage

- Decision: `VALID`
- Notes: Verificar saída exata, stderr vazio, atraso mínimo, versão e resultado; testes de evidência inválida.

## Resolution

Corrigido pelo implementador e reavaliado pelo agente /root/python_runtime_surface. Revisor confirmou as cinco correções sem novo bloqueio neste recorte. Testes independentes: node --test checks.test.ts, 3 pass / 0 fail. Matriz após correções: browser-probes-2026-10-16T17-34-09.394Z-cdc5b7e7-e8c1-43ea-8dce-f8ef0d9a1f03.json no cache local. Isto não aprova Turtle completo, segurança, desempenho ou L0 inteiro.
