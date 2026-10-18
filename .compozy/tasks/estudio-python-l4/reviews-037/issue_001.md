---
status: resolved
file: packages/studio/src/python/language/modulePaths.ts
line: 53
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Não atribuir todo import a um candidato local

## Review Comment

O resolvedor considera somente arquivos e diretórios do projeto. Isso não prova o módulo escolhido pelo Python: módulos embutidos/congelados ou previamente carregados podem prevalecer, e um diretório namespace local perde para um pacote regular encontrado mais adiante no caminho de busca. O planner tratava o candidato local como origem comprovada e reescrevia o import ao renomeá-lo, mudando o programa silenciosamente.

Provas com CPython 3.14.2: `main.py` importa `sys` e imprime `sys.maxsize > 0`; há também um `sys.py` local com `maxsize=0`. Renomear esse arquivo para `tools.py` produzia `import tools as sys`, alterando `True` para `False`. Em outro projeto, `import email` com a pasta namespace `email/helper.py` usa o pacote regular da biblioteca padrão; mover a pasta para `tools` reescrevia o import para o namespace local.

Distinguir candidatos locais de resolução comprovada. Para o perfil inicial, recusar explicitamente colisões com nomes reservados do ambiente e outros casos cuja precedência não possa ser demonstrada sem executar fontes. Não apresentar uma aproximação pelo filesystem como prova de equivalência.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente: nomes da biblioteca padrão CPython 3.14.2 e do runtime browser são recusados quando sua resolução mudaria. Os casos sys/email agora recusam o plano, preservam a árvore original e reportam referências na exclusão.

## Verification

- `bun run .cache/studio-python-l0/review037-imports.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0 na versão anterior à correção. AST/tokenização reais, execução antes/depois e identidade da árvore original conferidas. Saídas `True→False` para builtin e `False→True` para `email.__file__ is None`.

## Independent revalidation

- `bun .cache/studio-python-l0/review037-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; onze variantes de recusa/dependências com AST CPython real, sem mutação da árvore.
- Script permanente `packages/studio/scripts/verify-python-imports.ts`: quinze fixtures CPython + exclusão de inicializador ancestral passaram. Unidades modulePaths: 2 testes/15 assertions.
