---
status: resolved
file: experiments/studio-python-l0/reference.ts
line: 87
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Resolução registrada é emulada pelo Playwright

## Review Comment

Contexto com viewport 1100×760 faz screen.width/height também parecerem 1100×760. O relatório não informa a resolução física requerida. Usar contexto sem emulação e separar resolução observada, viewport e devicePixelRatio. Não nomear valores emulados como observação do equipamento.

## Triage

- Decision: `VALID`
- Notes: Contexto headed usa viewport:null e registra dimensões CSS, viewport e DPR separadamente. Kit windows-kit-773f14f9-65ca-4bc5-8341-10edd731f41a: reports Chrome baseline-75514238-fd0c-4d0c-a4ed-97e12e816a39 e Edge baseline-ae5ca05d-9f3a-4eba-bb9b-341fa07462ab registram tela CSS 2560×1080/DPR1, com30 ciclos por navegador. Não confundir CSS com resolução física em equipamentos com escalonamento.
