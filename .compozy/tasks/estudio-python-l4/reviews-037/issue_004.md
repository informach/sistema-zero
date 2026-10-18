---
status: resolved
file: packages/studio/src/python/language/modulePaths.ts
line: 58
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Não aceitar mudanças de stubs sem resolver seus imports

## Review Comment

O planner considera `.pyi` relevante e analisa sua sintaxe, mas o resolvedor só reconhece `.py` e `__init__.py`. Assim, renomear um stub isolado pode retornar sucesso com nenhuma edição, e a exclusão pode informar nenhuma referência, mesmo quando a análise do projeto usa esse stub.

Projeto com `main.py` contendo `from helper import value` e `helper.pyi` contendo `value: int`: renomear o stub para `tools.pyi` retorna `edits=[]`; coletar referências para apagá-lo retorna `[]`. O Pyright real encontra a definição em `helper.pyi` antes da alteração e não encontra definição depois. Isso não é uma afirmação de que o CPython executa `.pyi`: é uma dependência de análise que o contrato Pro preserva junto da fonte.

Modelar explicitamente a resolução de stubs e os pares `.py/.pyi`, ou recusar alterações de stubs que ainda não possam ser comprovadas. Não converter a falta de resolução do adapter em um plano vazio apresentado como seguro.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente: resolução fallback de stub, recusa de separar pares source/stub e dependências de exclusão preservadas. Pyright real encontra tools.pyi depois do rename e da edição do import, mantendo a definição.

## Verification

- `bun run .cache/studio-python-l0/review037-stubs.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0. Usa o parser CPython real e `PythonLanguageSession` com Pyright instalado; comprova plano/refêrencias vazios, definição anterior em `helper.pyi` e resultado posterior vazio. O processo de análise é encerrado em `finally`.

## Independent revalidation

- `bun .cache/studio-python-l0/review037-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; onze variantes de recusa/dependências com AST CPython real, sem mutação da árvore.
- `bun .cache/studio-python-l0/review037-stubs-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; parser CPython e Pyright reais; import alterado para tools e definição em tools.pyi.
- Script permanente `packages/studio/scripts/verify-python-imports.ts`: quinze fixtures CPython + exclusão de inicializador ancestral passaram. Unidades modulePaths: 2 testes/15 assertions.
