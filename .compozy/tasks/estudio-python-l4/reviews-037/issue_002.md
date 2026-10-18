---
status: resolved
file: packages/studio/src/python/language/fileImports.ts
line: 174
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Comprovar atributos e exportações antes de mover submódulos

## Review Comment

`from pkg import helper` pode obter um atributo do pacote, em vez de carregar `pkg/helper.py`. O guard original só procurava um token `NAME` igual a `helper` quando o último segmento mudava. Ele deixava passar a mudança de pacote com o mesmo último segmento e atributos dinâmicos definidos sem esse token literal. As edições aceitas alteravam o objeto importado.

CPython 3.14.2 confirmou duas variantes: com `helper=7` em `pkg/__init__.py`, mover `pkg/helper.py` para `other/helper.py` mudava o import e seu resultado de `int` para `module`; com `__getattr__` usando um dicionário de chaves string `helper/tools`, renomear o filho mudava a saída de `7` para `8`.

A primeira correção, que exige inicializadores inertes em `nextName`, ainda não alcança wildcard. Com `from pkg import *` e `__all__=["helper"]`, mover o filho para `tools.py` continua retornando `edits=[]` e `references=[]`, mas a execução muda de `1` para `AttributeError`. Wildcard também pode expor atributos acrescentados por imports anteriores, mesmo com inicializador vazio.

Comprovar a origem do atributo e as exportações tanto no pacote de origem quanto no destino; recusar explicitamente quando isso não for possível. Imports wildcard de um pacote afetado devem participar da análise/recusa, inclusive na coleta anterior à remoção. Não executar o inicializador para tentar provar a mudança.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente: ancestrais dos pacotes de origem/destino precisam ser inertes quando o nome muda; wildcard afetado recusa rename e participa de referências. Confirmados atributos simples, __getattr__, __all__ e wildcard após import explícito com init vazio.

## Verification

- Harness `review037-imports.ts`: CPython real comprovou `int→module` e `7→8` antes do guard de inicializadores inertes.
- `bun run .cache/studio-python-l0/review037-star.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0 após a primeira correção; confirma plano vazio, referência ausente e falha do programa depois da mudança.

## Independent revalidation

- `bun .cache/studio-python-l0/review037-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; onze variantes de recusa/dependências com AST CPython real, sem mutação da árvore.
- Script permanente `packages/studio/scripts/verify-python-imports.ts`: quinze fixtures CPython + exclusão de inicializador ancestral passaram. Unidades modulePaths: 2 testes/15 assertions.
