---
status: resolved
file: experiments/studio-python-l0/web/renderer.mjs
line: 27
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Teclas após Parar contaminavam a geração seguinte

## Review Comment

Revisor reproduziu no Chromium: Stop, ArrowRight no canvas parado, nova execução, callback recebeu stale-key-after-stop.

## Triage

- Decision: `VALID`
- Notes: Desativar entrada ao parar, limpar estado ao iniciar e testar a sequência real via locator.press.

## Resolution

Correção aplicada após revisão readonly por /root/python_runtime_surface. Prova Chromium com geometria, eventos, stdin, EOF, Stop e regressão de tecla antiga passou em browser-probes-2026-10-16T17-52-00.878Z-b1117638-6ae5-4b2b-8070-b76dfa7dfd01.json (cache local). Referência desktop repetida com Tcl e Tk reais 8.6.15, cinco fixtures aprovadas. Não é aprovação integral de L0; falta reavaliação do revisor e demais gates.
