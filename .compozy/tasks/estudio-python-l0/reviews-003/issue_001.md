---
status: resolved
file: experiments/studio-python-l0/lsp-snapshot.ts
line: 46
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: A quota ignora CR e a última linha sem terminador

## Review Comment

A quota de linhas conta apenas LF. O revisor reproduziu uma fonte de 20.001 linhas separadas por CR que foi aceita como zero linhas. Python aceita CR, CRLF e LF. Contar linhas lógicas sem modificar os bytes autorais e cobrir fronteiras com e sem newline final.

## Triage

- Decision: `VALID`
- Notes: Confirmado na revisão readonly por /root/python_runtime_surface. `sourceLineCount` agora conta CR, CRLF, LF e a última linha sem terminador sem alterar os bytes. Regressão reproduzida antes da correção e aprovada depois em `lsp-snapshot.test.ts`; prova Linux repetida com sucesso.
