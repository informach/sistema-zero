---
status: resolved
file: experiments/studio-python-l0/lsp.ts
line: 20
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Canário de hook aparece depois de imports que podem falhar

## Review Comment

O marcador em sitecustomize.py/usercustomize.py é escrito depois de importar Turtle. Um interpretador sem Tk pode executar o hook e falhar antes do marcador, gerando falso negativo. Tornar a escrita do canário a primeira instrução, sem dependências importadas; testar que uma falha posterior conserva a evidência. Não há demonstração de execução indevida na prova atual.

## Triage

- Decision: `VALID`
- Notes: Confirmado na revisão readonly por /root/python_runtime_surface. `hookCanary` escreve antes de qualquer import. `lsp-hook.test.ts` executa CPython real e verifica o marcador mesmo após um import inexistente falhar. Prova Linux repetida com sucesso.
