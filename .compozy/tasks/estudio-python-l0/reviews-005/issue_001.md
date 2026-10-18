---
status: resolved
file: experiments/studio-python-l0/web/frame.mjs
line: 28
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Coerção do erro pode interromper o cleanup

## Review Comment

`boot-error` com error={toString:null,valueOf:null} lança em String(error) antes de terminate e antes de resolver pending. Revisor reproduziu status failed, um worker ainda ativo, promise pendente e pageerror. Mesmo problema no ramo result depois de remover a conclusão do mapa. Validar valores sem coerção arbitrária; garantir encerramento e resultado resolvido. Cobrir os dois ramos com FFI real e recuperação.

## Triage

- Decision: `VALID`
- Notes: Coerção arbitrária removida; erro é validado antes de retirar a promise do mapa. Fixtures FFI reais boot-error/result e reinício passaram em security-chrome-7d3a0c7c-c02e-4b59-932a-ac43092d94ba e security-edge-8562eee9-f9af-4114-88dc-c3fd1288c4e4. O programa finito isola este defeito; loops contínuos têm prova nativa separada em termination.ts e ADR001, sem esconder o resultado original de1s reprovado.
