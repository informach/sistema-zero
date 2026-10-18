---
status: resolved
file: packages/studio/src/python/blocks/scope.ts
line: 37
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Especialização atribui APIs oficiais a chamadas autorais

## Review Comment

A especialização da projeção afirma identidades de APIs sem evidência suficiente. O resolvedor ignora capturas de padrões e ligações externas de NamedExpr em comprehensions; mantém classes externas na cadeia de escopos de classes aninhadas; e não invalida módulos cujos membros foram reatribuídos. Além disso, callCatalog.ts identifica métodos somente pelo nome do atributo, sem comprovar o tipo do receptor. O AST sobrevive, mas o bloco passa a ensinar/descrever uma operação diferente da chamada autoral.

Casos independentes confirmados com o analisador real e pythonASTToVisual:

- `match lambda x: x + 1: case print: pass`, seguido de `result = print(2)`, recebe `sz_py_print`, embora print seja a função capturada. O mesmo ocorre após `[(print := lambda x: x + 1) for _ in [0]]`.
- Instância de classe autoral com `append` retornando 999 e `upper` retornando 123 recebe `sz_py_list_append` e `sz_py_text_upper`. Os rótulos e help descrevem list.append/str.upper, embora essas APIs não sejam chamadas.
- `import math; math.sqrt = lambda value: 999; x = math.sqrt(4)` mantém `sz_py_math_sqrt`.
- Com `math` global autoral, `class Outer` contendo `import math` e `class Inner`, tanto `Inner.x = math.sqrt(4)` quanto o método de Inner que chama math.sqrt recebem rótulo oficial. CPython resolve o math global, pulando escopos de classes externas; a reprodução executou e imprimiu `999 999`.

Restringir especializações a identidades demonstráveis e usar a chamada genérica em caso de ambiguidade. Métodos podem exigir receptor literal de tipo reconhecido ou prova equivalente; considerar capturas de match, ligações de walrus no escopo externo, escrita em membros e a cadeia real de escopos Python. A disponibilidade de uma operação na paleta não exige inferir essa operação de qualquer método homônimo da fonte.

## Triage

- Decision: `VALID`
- Notes: Resolvido após duas revalidações independentes. As ocorrências iniciais passaram com 21 programas, 21 compilações e 19 pares executados: Starred, capturas match/walrus, métodos autorais, mutação explícita de atributos e classes aninhadas preservam o AST; receptores literais legítimos continuam especializados. A primeira correção ainda deixava Global/Nonlocal invalidar somente o escopo da função mutadora, permitindo rótulos oficiais fora dela; as reproduções retornaram 999. A correção final marca o arquivo como incerto diante de Global/Nonlocal ou chamadas dinâmicas exec/eval/globals/locals/vars. Prova fresca: 24 programas (21 fixtures e três casos independentes), 24 compilações, 22 pares executados, AST equivalente e original não mutado. Os dois casos Global/Nonlocal e um exec com globals dentro de função agora ficam genéricos; imports inequívocos de math/random continuam especializados. Unitários focados frescos: 4 pass / 234 verificações, exit 0; Biome do resolvedor, exit 0. Nenhum browser executado pelo revisor. O AST não foi perdido nas reproduções.
