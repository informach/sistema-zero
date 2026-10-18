---
status: resolved
file: packages/studio/src/python/language/fileImports.ts
line: 72
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Contar os inicializadores ancestrais nas referências

## Review Comment

O coletor compara `from` apenas com a localização final resolvida. Um import de submódulo depende também dos `__init__.py` dos pacotes ancestrais, que são executados antes dele. Essas dependências ficam ausentes quando o usuário pretende remover um inicializador isolado.

Em CPython 3.14.2, `main.py` com `import pkg.child; print(pkg.marker)`, `pkg/__init__.py` com `marker=42` e `pkg/child.py` vazio imprime `42`. O planner retorna `references=[]` para apagar `pkg/__init__.py`; depois da remoção o mesmo programa falha com `AttributeError`. O guard que impede mover um `__init__.py` não protege a coleta de referências para exclusão.

Incluir inicializadores ancestrais necessários ao resolver imports de módulos e pacotes. Caso a exclusão altere a natureza do pacote e a análise não possa comprovar segurança, recusar explicitamente ou reportar os arquivos dependentes, preservando a fonte.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente: a coleta inclui imports descendentes ao remover __init__.py ou __init__.pyi, inclusive pacote ancestral intermediário.

## Verification

- `review037-imports.ts`, caso `deleting-implicit-package-initializer`: AST e execução CPython reais; `references=[]`, saída anterior `42`, execução posterior exit 1 com `module 'pkg' has no attribute 'marker'`.

## Independent revalidation

- `bun .cache/studio-python-l0/review037-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; onze variantes de recusa/dependências com AST CPython real, sem mutação da árvore.
- Script permanente `packages/studio/scripts/verify-python-imports.ts`: quinze fixtures CPython + exclusão de inicializador ancestral passaram. Unidades modulePaths: 2 testes/15 assertions.
