---
status: resolved
file: experiments/studio-python-l0/probe.ts
line: 183
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Parar não comprovava início do programa

## Review Comment

A prova encerrava o worker sem esperar evidência de que Python havia entrado no loop; podia passar durante o bootstrap.

## Triage

- Decision: `VALID`
- Notes: Esperar stdout loop-entered após 1.000 iterações, depois medir Parar e verificar a promessa interrompida.

## Resolution

Corrigido pelo implementador e reavaliado pelo agente /root/python_runtime_surface. Revisor confirmou as cinco correções sem novo bloqueio neste recorte. Testes independentes: node --test checks.test.ts, 3 pass / 0 fail. Matriz após correções: browser-probes-2026-10-16T17-34-09.394Z-cdc5b7e7-e8c1-43ea-8dce-f8ef0d9a1f03.json no cache local. Isto não aprova Turtle completo, segurança, desempenho ou L0 inteiro.
