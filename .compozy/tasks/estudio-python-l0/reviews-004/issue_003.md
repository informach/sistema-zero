---
status: resolved
file: experiments/studio-python-l0/pinta-browser.ts
line: 84
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Primeira amostra RAF pode ser negativa

## Review Comment

O primeiro timestamp RAF pode anteceder performance.now() capturado ao registrar callback. O ensaio real produziu -2,6 ms. Inicializar a referência com o primeiro callback e medir somente intervalos entre callbacks consecutivos, com assertions finitas/não negativas no harness. Não ajustar para zero nem descartar erros silenciosamente.

## Triage

- Decision: `VALID`
- Notes: O primeiro callback estabelece a referência; somente intervalos entre callbacks entram na amostra. Harness exige números finitos não negativos. Kit posterior da issue002: mínimos16,3ms Chrome e16,4ms Edge, p95 de16,8ms nos dois. Evidência Pinta diferencial pinta-0d638f5e-b98b-495a-b415-a5bba9bd37bb também passou, com204 amostras e máximo16,9ms.
