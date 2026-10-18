---
status: resolved
file: experiments/studio-python-l0/desktop.ts
line: 19
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Versão Tcl era registrada como Tk

## Review Comment

info patchlevel consulta Tcl, sem comprovar carregamento Tk.

## Triage

- Decision: `VALID`
- Notes: Carregar Tk real, retirar janela, consultar package provide Tk e registrar Tcl separadamente.

## Resolution

Correção aplicada após revisão readonly por /root/python_runtime_surface. Prova Chromium com geometria, eventos, stdin, EOF, Stop e regressão de tecla antiga passou em browser-probes-2026-10-16T17-52-00.878Z-b1117638-6ae5-4b2b-8070-b76dfa7dfd01.json (cache local). Referência desktop repetida com Tcl e Tk reais 8.6.15, cinco fixtures aprovadas. Não é aprovação integral de L0; falta reavaliação do revisor e demais gates.
