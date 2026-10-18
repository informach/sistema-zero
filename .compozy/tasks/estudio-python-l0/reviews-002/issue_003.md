---
status: resolved
file: experiments/studio-python-l0/probe.ts
line: 214
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Helpers perdiam provas parciais em caso de falha

## Review Comment

Atribuição de input/graphics ocorria só ao retornar; asserção tardia descartava resultados já obtidos.

## Triage

- Decision: `VALID`
- Notes: Anexar objetos antes da chamada e salvar resultado bruto antes das asserções.

## Resolution

Correção aplicada após revisão readonly por /root/python_runtime_surface. Prova Chromium com geometria, eventos, stdin, EOF, Stop e regressão de tecla antiga passou em browser-probes-2026-10-16T17-52-00.878Z-b1117638-6ae5-4b2b-8070-b76dfa7dfd01.json (cache local). Referência desktop repetida com Tcl e Tk reais 8.6.15, cinco fixtures aprovadas. Não é aprovação integral de L0; falta reavaliação do revisor e demais gates.
