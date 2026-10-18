---
status: resolved
file: packages/studio/src/runtime/python/turtle/_sz_turtle_backend.py
line: 50
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Parser de cores aceitava hexadecimal inválido no Tk

## Review Comment

Validar apenas prefixo/comprimento e usar `int(parte, 16)` aceita sinais e espaços que não pertencem à sintaxe de cores Tk. `screen.bgcolor('# 1 2 3')` era aceito pelo backend, mas lançava `TurtleGraphicsError` no CPython/Tk. `#+1+2+3` apresenta a mesma divergência. Isso permite que um programa considerado válido no estúdio falhe após exportação, contrariando a comparação de erros da família de cores.

A correção exige `re.fullmatch(r'#[a-fA-F0-9]+', value)` além dos comprimentos permitidos. Revalidação real desktop/backend: ambos rejeitam as duas entradas inválidas e aceitam `#abc`, `#123456`, `#123456789` e `#123456789abc`.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente com CPython 3.14.2. As cores específicas do sistema operacional não foram incluídas como requisito de compatibilidade web nesta revisão.
