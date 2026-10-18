---
status: resolved
file: packages/studio/src/python/blocks/scope.ts
line: 113
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Mutação reflexiva mantém rótulo de método Turtle oficial

## Review Comment

A inferência nova de instâncias diretas identifica corretamente `t = turtle.Turtle()`, mas continua especializando métodos depois de uma alteração explícita por `setattr`. O guard de chamadas dinâmicas considera exec/eval/globals/locals/vars e ignora as operações de escrita reflexiva.

Reprodução independente: `import turtle; t = turtle.Turtle(); setattr(t, "forward", custom); t.forward(10)` ainda produz `sz_py_turtle_turtle_forward`. A forma `setattr(turtle, "forward", custom); turtle.forward(10)` produz `sz_py_turtle_module_forward`. No segundo caso, um programa fixo executado com o CPython 3.14.2 real retornou `custom:10`, sem chamar o movimento Turtle, embora o bloco continuasse descrito como avançar. O roundtrip AST/Blockly permanece exato; o defeito é atribuir API oficial a comportamento autoral conhecido.

Revogar a especialização conservadoramente quando houver operações explícitas de mutação reflexiva, incluindo setattr/delattr, ou demonstrar que o alvo não pode alcançar os bindings oficiais. Conservar a chamada genérica e a fonte integral. Cobrir módulo e instância, além de manter aliases/imports inequívocos especializados quando não existe mutação.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador incluindo setattr/delattr no guard conservador. Revalidação independente com o parser CPython confirmou quatro combinações (setattr/delattr × módulo/instância) genéricas, sem alterar o AST; alias inequívoco importado por from continuou especializado. Regressão fresca de quatro arquivos: 21 pass, 0 fail, 1399 verificações; Biome dos cinco arquivos alterados, exit 0. Nenhum browser executado pelo revisor.
